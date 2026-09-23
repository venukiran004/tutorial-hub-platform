/* ============================================================================
   LESSON 5.3 — Session Services: In-Memory, Database and Vertex AI
   The SQLite run, the schema dump and the driver error are all executed output
   from scratchpad/adk/s3.py on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**The session service is the one line of your application that decides whether a conversation survives a deployment.** Everything else — the agent, the tools, the instructions — is identical whether sessions live in a dictionary that dies with the process or in Postgres behind a connection pool. ADK made that swap a constructor argument on purpose, and the discipline it asks of you is small but real: write no code that depends on which implementation you chose. This lesson runs the same agent against an in-memory store and a real database file, restarts the process, and reads the conversation back.",

  objectives: [
    "State the five methods every session service implements",
    "Choose between the in-memory, database and Vertex AI services for a given deployment",
    "Configure DatabaseSessionService correctly, including the async driver requirement",
    "Describe the storage layout a database service creates and why it has four tables",
    "Plan a migration from in-memory to persistent sessions without changing agent code"
  ],

  prerequisites: ["5.1", "5.2"],

  blocks: [

    { t: "h2", n: "01", text: "One interface, five methods", id: "interface" },

    { t: "code", lang: "python", title: "The whole contract, introspected",
      code: `import inspect
from google.adk.sessions import BaseSessionService
for n in ["create_session", "get_session", "append_event", "list_sessions", "delete_session"]:
    print(n, inspect.signature(getattr(BaseSessionService, n)))` },

    { t: "out", text: `create_session(self, *, app_name: str, user_id: str, state: Optional[dict[str, Any]] = None, session_id: Optional[str] = None) -> Session
get_session(self, *, app_name: str, user_id: str, session_id: str, config: Optional[GetSessionConfig] = None) -> Optional[Session]
append_event(self, session: Session, event: Event) -> Event
list_sessions(self, *, app_name: str, user_id: Optional[str] = None) -> ListSessionsResponse
delete_session(self, *, app_name: str, user_id: str, session_id: str) -> None` },

    { t: "p", text: "That is the entire surface an implementation must provide, and it is the reason the swap is free. The runner calls `get_session` at the start of a turn and `append_event` for each event it produces; it never asks what is underneath. If you need a store ADK does not ship — DynamoDB, Firestore, your own service — you subclass `BaseSessionService` and implement these five." },

    { t: "h2", n: "02", text: "The three that ship", id: "three" },

    { t: "diagram", kind: "compare", title: "Choosing a session service",
      caption: "The agent code is identical in all three columns. Only the constructor differs.",
      columns: [
        { title: "InMemorySessionService", tone: "accent", items: ["A dictionary in the process", "Zero setup, zero latency", "Lost on exit; not shared between replicas", "Tests, the dev UI, prototypes"] },
        { title: "DatabaseSessionService", tone: "good", items: ["SQLAlchemy — Postgres, MySQL, SQLite", "You run and back up the database", "Survives restarts; shared across replicas", "Most self-hosted production deployments"] },
        { title: "VertexAiSessionService", tone: "violet", items: ["Managed, in Google Cloud", "No database to operate", "Bound to a Vertex AI project and an Agent Engine", "Agent Engine deployments (lesson 12.2)"] }
      ] },

    { t: "callout", kind: "trap", title: "In-memory is not just 'not persistent' — it is not shared",
      text: "Two replicas behind a load balancer each have their own dictionary. A user's second message lands on the other pod and the conversation is empty, which presents as an agent that forgets roughly half the time. This is the single most common cause of 'it worked locally' in agent deployments, and it appears the moment you scale past one instance — not when you restart." },

    { t: "h2", n: "03", text: "A database service, end to end", id: "database" },

    { t: "p", text: "The script below runs one tool-using turn against SQLite, then constructs a **second** service object — standing in for a process that has restarted — and reads the conversation back through it." },

    { t: "code", lang: "python", title: "s3.py — write, 'restart', read",
      code: `svc = DatabaseSessionService(db_url="sqlite+aiosqlite:///sess.db")
runner = Runner(app_name="notes", agent=agent, session_service=svc)
s = await svc.create_session(app_name="notes", user_id="u1")
# ... one turn, whose tool writes state["note"] ...

# A brand-new service object, as if the process had restarted.
svc2 = DatabaseSessionService(db_url="sqlite+aiosqlite:///sess.db")
back = await svc2.get_session(app_name="notes", user_id="u1", session_id=s.id)
listed = await svc2.list_sessions(app_name="notes", user_id="u1")` },

    { t: "out", text: `wrote session 6fe553ef to sess.db (49152 bytes)
after 'restart':  events = 4 | state = {'note': 'call the dentist'}
first event text: note: call the dentist
list_sessions -> ['6fe553ef'] (events omitted: 0 )` },

    { t: "p", text: "Two details in that output are worth holding on to. The reconstructed session has **all four events and the state the tool wrote**, so a restart mid-conversation is invisible to the user. And `list_sessions` returned the session with **zero events** — listing is deliberately shallow, so rendering a sidebar of fifty past conversations does not load fifty transcripts." },

    { t: "callout", kind: "trap", title: "ADK 2.x requires an async driver",
      text: "`sqlite:///sess.db` fails at construction with `Database URL resolves to a synchronous driver, but this service requires an asynchronous one. Use a 'sqlite+aiosqlite://' URL instead.` The service is async all the way down, so the SQLAlchemy engine must be too: `sqlite+aiosqlite://`, `postgresql+asyncpg://`, `mysql+aiomysql://`. The error is clear, but it arrives at startup rather than on first use, so a misconfigured URL takes the process down on deploy — which is, on balance, the right time to find out." },

    { t: "h2", n: "04", text: "What it creates in the database", id: "schema" },

    { t: "code", lang: "python", title: "The tables, read straight out of the file",
      code: `import sqlite3
c = sqlite3.connect("sess.db")
print([r[0] for r in c.execute("select name from sqlite_master where type='table'")])
for t in ["sessions", "events", "app_states", "user_states"]:
    print(t, [d[0] for d in c.execute(f"select * from {t} limit 1").description])` },

    { t: "out", text: `['adk_internal_metadata', 'sessions', 'app_states', 'user_states', 'events']
sessions ['app_name', 'user_id', 'id', 'state', 'create_time', 'update_time']
events ['id', 'app_name', 'user_id', 'session_id', 'invocation_id', 'timestamp', 'event_data']
app_states ['app_name', 'state', 'update_time']
user_states ['app_name', 'user_id', 'state', 'update_time']` },

    { t: "p", text: "The schema is the previous lesson's scope table made physical. `app_states` is keyed by app alone, `user_states` by app and user, session state is a column on `sessions`, and `temp:` has no table because it has no store. `events` carries `invocation_id` as a column, which is what makes 'show me everything that happened in that one turn' an index lookup rather than a scan." },

    { t: "diagram", kind: "layers", title: "Four tables, three scopes",
      caption: "Every read of state on every turn touches three of these. Keep state small and this is cheap; put a megabyte in it and you have made every turn slow.",
      items: [
        { label: "app_states", sub: "PK: app_name — the app: scope", tone: "violet" },
        { label: "user_states", sub: "PK: (app_name, user_id) — the user: scope", tone: "warn" },
        { label: "sessions", sub: "PK: (app_name, user_id, id) — session state lives in a column", tone: "accent" },
        { label: "events", sub: "one row per event, with invocation_id for correlation", tone: "good" }
      ] },

    { t: "h2", n: "05", text: "Operating it", id: "operating" },

    { t: "table", head: ["Concern", "What to do"],
      rows: [
        ["Growth", "Events accumulate forever. Decide a retention policy — delete sessions past N days, or archive them to object storage — before the table is large"],
        ["Connection pooling", "The service takes SQLAlchemy engine arguments; size the pool for your replica count, not per process in isolation"],
        ["Backups", "Conversations are user data. If deleting a session is a user-facing feature, make sure your backups honour deletion requests too"],
        ["Schema changes", "ADK owns these tables. Do not add columns to them; put your own data in your own tables keyed by session id"],
        ["Latency", "Every turn does a read and a write. A database in another region adds that round trip to every single message"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Managed sessions versus your own database",
      text: "`VertexAiSessionService` removes the database from your operational surface entirely, which is worth a great deal if you have no platform team — and it is what an Agent Engine deployment uses by default. The cost is that your conversation data lives in a managed store you query through their API rather than a table you can join against your own orders and users. If your analytics need 'which conversations preceded a refund', a database you own makes that a SQL join; managed sessions make it an export pipeline." },

    { t: "callout", kind: "note", title: "The dev UI takes a URI",
      text: "`adk web --session_service_uri=\"postgresql+asyncpg://…\"` points the dev UI at a real store, which is how you inspect production-shaped sessions locally. Point it at a copy, not at production." },

    { t: "exercise", kind: "practice", title: "Prove the swap is free", difficulty: "core", minutes: 20,
      prompt: "Write one agent and one function that takes a session service as a parameter, runs two turns, and prints the resulting event count and state. Call it twice — once with InMemorySessionService and once with DatabaseSessionService against a SQLite file — and confirm the output is identical. Then construct a second database service, read the session back, and confirm it survived. Finally, try a plain `sqlite:///` URL and read the error.",
      hints: [
        "Keep the agent and the tool outside the function; only the service should vary.",
        "`pip install aiosqlite` before using the SQLite URL.",
        "A fresh service object reading the same file is a faithful stand-in for a restart."
      ],
      solution: {
        code: `async def run_with(svc):
    runner = Runner(app_name="demo", agent=build_agent(), session_service=svc)
    s = await svc.create_session(app_name="demo", user_id="u1")
    for msg in ["note: buy milk", "what did I note?"]:
        async for _ in runner.run_async(user_id="u1", session_id=s.id,
                new_message=types.Content(role="user", parts=[types.Part(text=msg)])):
            pass
    back = await svc.get_session(app_name="demo", user_id="u1", session_id=s.id)
    return s.id, len(back.events), dict(back.state)

print(await run_with(InMemorySessionService()))
print(await run_with(DatabaseSessionService(db_url="sqlite+aiosqlite:///demo.db")))`,
        notes: [
          { t: "p", text: "The two lines print the same event count and the same state, which is the point: nothing in the agent, the tool or the runner knows which store it is talking to. The only asymmetry is that the second one leaves a file behind." },
          { t: "p", text: "The synchronous URL raises at construction rather than on first query, with a message naming the driver you should have used. That is worth seeing once, because in a container the failure shows up as a crash loop on deploy and the traceback is the whole diagnosis." }
        ]
      } }

  ],

  takeaways: [
    "A session service is five methods; the runner knows nothing else about it, which is what makes the swap free.",
    "In-memory sessions are lost on restart **and** are not shared between replicas — the second is what breaks first.",
    "`DatabaseSessionService` needs an async driver: `sqlite+aiosqlite://`, `postgresql+asyncpg://`.",
    "The schema has four tables, and they are the state scopes made physical.",
    "`list_sessions` returns sessions without events, so listing stays cheap.",
    "Events grow without bound; decide retention, backups and deletion before the table is large."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your agent is deployed on three replicas with InMemorySessionService. What do users see?",
      options: ["Conversations are lost only when a pod restarts", "Roughly two turns in three appear to have no history", "Every conversation works until the pod runs out of memory", "The runner raises a session-not-found error"],
      answer: 1,
      why: "Each replica has its own dictionary. A follow-up message routed to a different pod finds no session, so history vanishes — intermittently, which makes it much harder to diagnose than a clean failure. Persistence is the fix, but the reason to reach for it is sharing, not durability." },
    { stem: "Why does `sqlite:///sessions.db` fail while `sqlite+aiosqlite:///sessions.db` works?",
      options: ["SQLite is not supported without an extension", "The service is async throughout and needs an async SQLAlchemy driver", "The first URL is missing a host", "aiosqlite enables write-ahead logging"],
      answer: 1,
      why: "The executed error says it outright: the URL resolved to a synchronous driver and the service requires an asynchronous one. Every session method is a coroutine, so a blocking driver would stall the event loop that is concurrently running tools and streaming events." },
    { stem: "Which table does an unprefixed state key end up in?",
      options: ["app_states", "user_states", "a column on the sessions row", "events"],
      answer: 2,
      why: "The schema dump shows `sessions` carrying a `state` column alongside the ids. Session-scoped state is part of the session row, while `app:` and `user:` keys are lifted into their own tables so they can be shared by many sessions." },
    { stem: "You need conversations stored in DynamoDB. What is the work?",
      options: ["Not possible — ADK supports only the three shipped services", "Subclass BaseSessionService and implement its five methods", "Write a SQLAlchemy dialect for DynamoDB", "Use the in-memory service and sync it yourself"],
      answer: 1,
      why: "The base class is a small, explicit interface, and the runner depends on nothing else. Implementing create, get, append, list and delete against any store gives you a service the rest of ADK accepts without modification — the same extension point the three shipped implementations use." }
  ] },

  interview: { title: "Interview", sub: "Session service questions", questions: [
    { level: "Core", q: "When is an in-memory session service acceptable in production?",
      strong: "When there is exactly one replica and losing conversations on deploy is genuinely fine — which is almost never.",
      answer: [{ t: "p", text: "The honest answer is a demo, an internal tool nobody depends on, or a stateless one-shot agent where each request is a complete conversation. Everything else fails on one of two counts. Restarts lose in-flight conversations, and deploys happen more often than people admit. More importantly, the store is per process, so the moment you run two replicas a user's messages land on different pods and history appears and disappears at random. If I saw it in a production design review I would treat it as a bug, not a trade-off." }] },
    { level: "Core", q: "What does the session service store beyond the transcript?",
      strong: "Three scopes of state, in separate places keyed differently — app, user and session.",
      answer: [{ t: "p", text: "The database schema makes it unambiguous: `sessions` holds the conversation and its session-scoped state, `events` holds one row per event with the invocation id for correlation, and `app_states` and `user_states` hold the two wider scopes keyed by app and by app-plus-user. So a single turn touches three stores on read and on write. That is worth knowing for two reasons: it explains why keeping state small matters for latency, and it explains why deleting a session does not delete a user's preferences." }] },
    { level: "Senior", q: "How would you migrate a running deployment from in-memory to database sessions?",
      strong: "Change the constructor, accept that in-flight conversations are lost at cutover, and do the retention and pooling work before the change rather than after.",
      answer: [{ t: "p", text: "The code change is one line, because nothing else depends on the implementation, so the interesting work is operational. Existing in-memory sessions cannot be migrated — they live in a process that is about to die — so I would cut over at a quiet hour and accept that active conversations restart, or run both and write new sessions only to the database. Before the switch I would size the connection pool against the replica count, put the database in the same region as the agents so I am not adding a cross-region round trip to every message, and agree a retention policy, because the events table grows with every turn forever and nobody enjoys discovering that at a hundred million rows. I would also check that deleting a session is wired to whatever the product promises about deleting data, since that now means a real delete rather than a process exit." }] }
  ] }
});

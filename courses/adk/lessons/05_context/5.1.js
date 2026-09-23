/* ============================================================================
   LESSON 5.1 — Sessions: App, User, Session, Event
   Every trace below is printed by scratchpad/adk/s1.py running on google-adk
   2.9.2 against a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**An agent has no memory. The session is the memory, and the agent is handed a copy of it at the start of every turn.** This is the single most clarifying fact about ADK, and about every agent framework: the model is stateless, so continuity is something the runner manufactures by replaying a stored transcript into each request. That transcript is the session — an ordered list of events with a dictionary of state hanging off it. Once you see a conversation as an append-only log, the rest of this phase follows: state is a fold over the log, memory is search across old logs, and compaction is what you do when the log outgrows the window.",

  objectives: [
    "Name the four containers — app, user, session, event — and say what identifies each",
    "List what a Session object actually stores, field by field",
    "Read an event log and point to the user turns, the tool calls and the state deltas",
    "Explain how a stateless model produces a coherent multi-turn conversation",
    "Choose when to continue a session and when to start a new one"
  ],

  prerequisites: ["1.4", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Four containers, widest to narrowest", id: "containers" },

    { t: "p", text: "Everything ADK stores is addressed by three strings and an ordinal. The **app name** separates one product from another inside the same store. The **user id** separates people. The **session id** separates one conversation from that person's other conversations. Inside a session, **events** are ordered by arrival. Every session service method you will ever call takes some prefix of that address — which is why `get_session` needs all three ids and `list_sessions` needs only two." },

    { t: "diagram", kind: "layers", title: "The addressing scheme",
      caption: "There is no global namespace. Two apps may both have a user called u1 and they never see each other's sessions, because app_name is part of the key in every table.",
      items: [
        { label: "app_name", sub: "one product — \"travel\", \"support\"", tone: "violet" },
        { label: "user_id", sub: "one person, stable across conversations", tone: "warn" },
        { label: "session_id", sub: "one conversation — a UUID unless you supply one", tone: "accent" },
        { label: "event[i]", sub: "one thing that happened, in arrival order", tone: "good" }
      ] },

    { t: "callout", kind: "trap", title: "user_id is your identity, not ADK's",
      body: [{ t: "p", text: "ADK never authenticates anybody. Whatever string you pass as `user_id` is taken as gospel, and it is the key that selects which person's state and memory the agent can read. If that string comes from a request body rather than from a verified session cookie or token, any caller can read any user's data by typing their id. Derive `user_id` server-side from the authenticated principal, always. Lesson 9.1 returns to this." }] },

    { t: "h2", n: "02", text: "What a Session actually holds", id: "fields" },

    { t: "code", lang: "python", title: "The whole object",
      code: `from google.adk.sessions import Session
print(list(Session.model_fields))`,
      caption: "Introspected on 2.9.2 — this is the complete list, not a summary." },

    { t: "out", text: "['id', 'app_name', 'user_id', 'state', 'events', 'last_update_time']" },

    { t: "dl", items: [
      ["id", "The session id. A UUID by default; you may pass your own to `create_session` if you want conversations addressable by your own key (a ticket number, say)."],
      ["app_name / user_id", "The other two thirds of the address, stored on the session so a session object is self-describing once you have it."],
      ["state", "A dictionary. Not free-form storage for anything you like — it is the working memory the agent reads and writes during the conversation, and it is covered in 5.2."],
      ["events", "The ordered list. User messages, model messages, tool calls, tool responses, and the bookkeeping events that carry state changes."],
      ["last_update_time", "A float timestamp, maintained by the service. Useful for listing recent conversations and for expiring dead ones."]
    ] },

    { t: "callout", kind: "insight", title: "Six fields is the whole abstraction",
      body: [{ t: "p", text: "There is no `history`, no `summary`, no `context` field and no hidden buffer. Everything the agent knows about this conversation is derivable from `events` and `state`. When you are debugging a session that behaves oddly, printing those two lists is not a first step towards the answer — it is the answer." }] },

    { t: "h2", n: "03", text: "A session, traced", id: "trace" },

    { t: "p", text: "The script below creates a session with some starting state, runs two turns through a scripted model, then fetches the session back from the service and prints what was recorded. The model is fake so the output is reproducible; everything around it — the events, the ordering, the deltas — is the real runner." },

    { t: "code", lang: "python", title: "s1.py — two turns, then read the log back",
      code: `def remember(fact: str, tool_context) -> dict:
    """Stores a fact about the user."""
    tool_context.state["fact"] = fact
    return {"stored": fact}

llm = FakeLlm(script=[call("remember", fact="prefers window seats"),
                      text("Noted."),
                      text("You prefer window seats.")])
agent = LlmAgent(name="assistant", model=llm, tools=[remember])

svc = InMemorySessionService()
runner = Runner(app_name="travel", agent=agent, session_service=svc)
s = await svc.create_session(app_name="travel", user_id="u1", state={"tier": "gold"})

for turn in ["Remember I prefer window seats", "What do I prefer?"]:
    async for e in runner.run_async(user_id="u1", session_id=s.id,
            new_message=types.Content(role="user", parts=[types.Part(text=turn)])):
        pass

s2 = await svc.get_session(app_name="travel", user_id="u1", session_id=s.id)` },

    { t: "out", text: `session id: 35a7286b | state at creation: {'tier': 'gold'}

events recorded: 6
  0  author=user      final=True  text 'Remember I prefer window seats'      delta={}
  1  author=assistant final=False call remember                              delta={}
  2  author=assistant final=False response remember                          delta={'fact': 'prefers window seats'}
  3  author=assistant final=True  text 'Noted.'                              delta={}
  4  author=user      final=True  text 'What do I prefer?'                   delta={}
  5  author=assistant final=True  text 'You prefer window seats.'            delta={}

state after replay: {'tier': 'gold', 'fact': 'prefers window seats'}
history the 2nd turn saw: 5 contents` },

    { t: "p", text: "Read the log carefully, because five separate ideas are visible in it. **The user's own message is an event** — the runner appends it before the agent runs, which is why event 0 has `author=user`. **Tool calls and tool responses are events too**, not hidden machinery: events 1 and 2 are a complete audit trail of what the agent decided to do and what came back. **The state change rides on event 2**, the tool-response event, as a `state_delta` — the tool did not write to a database, it recorded an intention that the service applied. **Only some events are final**: events 1 and 2 have `is_final_response()` false, which is how a user interface knows not to render them as an answer. And **the second turn saw five contents** — the four events that existed plus the new message — which is the stateless model being handed the transcript." },

    { t: "diagram", kind: "trace", title: "The six events, and what each one did to state",
      caption: "state is not stored per event; it is the result of applying every delta in order. The service keeps the current value so you do not replay on every read, but the log is the source of truth.",
      left: "event appended", codeW: 330,
      vars: ["tier", "fact"],
      steps: [
        { code: "0  user       \"Remember I prefer…\"", state: ["gold", ""] },
        { code: "1  assistant  call remember(…)", state: ["gold", ""] },
        { code: "2  assistant  response + delta", state: ["gold", "prefers window seats"], changed: [1], tone: "good", note: "the only delta" },
        { code: "3  assistant  \"Noted.\"   (final)", state: ["gold", "prefers window seats"] },
        { code: "4  user       \"What do I prefer?\"", state: ["gold", "prefers window seats"] },
        { code: "5  assistant  \"…window seats.\"", state: ["gold", "prefers window seats"], note: "from replay" }
      ] },

    { t: "h2", n: "04", text: "Why the second turn worked", id: "replay" },

    { t: "p", text: "The model that answered turn two had never seen turn one. It is a function from a request to a response, and it holds nothing between calls. What made the answer correct is that the runner, before calling the model, walked the session's events and turned them into the request's `contents` — five of them, as the trace reports. Continuity is reconstructed on every single turn, from storage, at a cost in tokens that grows with the conversation." },

    { t: "diagram", kind: "cycle", title: "The loop that manufactures memory",
      caption: "Nothing persists inside the model or inside the agent object. The session service is the only thing between turn N and turn N+1.",
      centre: "turn N", nodes: [
        { label: "Message arrives", sub: "appended as an event", tone: "accent" },
        { label: "Load session", sub: "events + state" },
        { label: "Build request", sub: "events → contents" },
        { label: "Model responds", sub: "sees only this request", tone: "violet" },
        { label: "Append events", sub: "text, calls, deltas" },
        { label: "Service commits", sub: "ready for turn N+1", tone: "good" }
      ] },

    { t: "callout", kind: "mental", title: "The agent is a pure function of (session, message)",
      body: [{ t: "p", text: "Given the same session and the same new message, the same agent produces the same behaviour up to model sampling. This is why ADK is testable at all (lesson 11.3), why a replayed production session reproduces a bug, and why 'the agent forgot' is never really true — either the information was never written to the session, or the request did not include the events that held it." }] },

    { t: "h2", n: "05", text: "The lifecycle", id: "lifecycle" },

    { t: "table", head: ["Call", "When", "Note"],
      rows: [
        ["`create_session(app_name, user_id, state=…, session_id=…)`", "A new conversation starts", "Starting `state` is written before any event exists — good for tier, locale, tenant"],
        ["`get_session(app_name, user_id, session_id)`", "Every turn, by the runner", "You rarely call it yourself except to inspect or export"],
        ["`list_sessions(app_name, user_id=…)`", "Rendering a sidebar of past chats", "Returns sessions **without** their events, so it stays cheap"],
        ["`delete_session(app_name, user_id, session_id)`", "User deletes a chat; retention job", "Irreversible, and the right answer to a deletion request"],
        ["`append_event(session, event)`", "Rarely, by you", "The runner does this. Calling it by hand is for injecting synthetic history"]
      ] },

    { t: "callout", kind: "tradeoff", title: "When to continue a session and when to start a new one",
      body: [{ t: "p", text: "Continue while the conversation is about the same thing: the transcript is the context, and that is the point. Start a new session when the subject changes, when the old session has grown long enough to be expensive (lesson 5.6), or when a support ticket closes. What you must not do is start a new session to 'clear' something the user asked you to forget while leaving it in `user:` state or in memory — those survive the session boundary by design, and deleting the conversation does not delete them." }] },

    { t: "h2", n: "06", text: "Sessions are per user, and the key enforces it", id: "isolation" },

    { t: "p", text: "`get_session` takes the user id as well as the session id, and the service looks up the pair. A session id leaked into a URL is therefore not by itself enough to read someone's conversation — but only because you passed the correct `user_id`, and only if that id came from a source the caller cannot control. Every isolation guarantee in ADK reduces to the same sentence: the framework isolates by key, and you own the key." },

    { t: "exercise", kind: "practice", title: "Read a log, predict the answer", difficulty: "core", minutes: 16,
      prompt: "Build a session, run three turns through a scripted model where the middle turn writes state from a tool, then fetch the session back and print every event with its author, finality and delta. Before you run it, write down on paper how many events you expect and which one carries the delta. Then change the third turn to run in a new session and predict what the agent can no longer answer.",
      hints: [
        "Every user message is one event; a tool round trip adds two; a final text answer adds one.",
        "The delta rides on the event produced when the tool returns, not on the call event.",
        "A new session starts with zero events and whatever state you passed to create_session."
      ],
      solution: {
        code: `s = await svc.create_session(app_name="demo", user_id="u1", state={"tier": "gold"})
# ... run turns ...
back = await svc.get_session(app_name="demo", user_id="u1", session_id=s.id)
for i, e in enumerate(back.events):
    delta = dict(e.actions.state_delta) if e.actions else {}
    print(i, e.author, e.is_final_response(), delta)`,
        notes: [
          { t: "p", text: "Expect six events for a two-turn conversation with one tool call: user, call, response, answer, user, answer. The delta appears exactly once, on the response event, because that is the event the framework emits after the tool function returns and it is the natural carrier for whatever the tool wrote to state." },
          { t: "p", text: "Run the third turn in a fresh session and the agent loses the whole transcript. It keeps only what was written under a user: prefix — which is the entire reason that prefix exists, and the subject of the next lesson." }
        ]
      } },

    { t: "callout", kind: "note", title: "Where the runner gets its session service",
      body: [{ t: "p", text: "`Runner(app_name=…, agent=…, session_service=…)` takes it explicitly, and `InMemoryRunner` constructs an in-memory one for you. The dev UI and `adk web` do the same thing with whatever `--session_service_uri` you pass. There is no global default and no implicit singleton, which is deliberate: a process that talks to two stores should not have an ambient one." }] }

  ],

  takeaways: [
    "A session is six fields: id, app_name, user_id, state, events, last_update_time. Nothing else is stored.",
    "Events are append-only and ordered, and include the user's own messages, tool calls and tool responses.",
    "State changes travel as `state_delta` on an event, so the log explains every value state holds.",
    "The model is stateless; the runner rebuilds the conversation from events on every turn, at a token cost that grows with length.",
    "app_name, user_id and session_id are the whole addressing scheme, and ADK trusts whatever user_id you pass.",
    "Continue a session while the subject holds; a new session clears the transcript but not user-scoped state or memory."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "The agent answered a question in turn 5 using something said in turn 1. Where did that information live between the turns?",
      options: ["In the model's memory", "In the session's event list, in the session service", "In the agent object's fields", "In a cache inside the runner"],
      answer: 1,
      why: "The model holds nothing between calls and the agent object is reused across users, so neither can carry it. The session service stored the events, and the runner replayed them into turn 5's request as contents — which is also why turn 5 cost more tokens than turn 1." },
    { stem: "Which event in a tool-using turn carries the state_delta?",
      options: ["The user's message event", "The event containing the function call", "The event containing the function response", "A separate bookkeeping event at the end of the turn"],
      answer: 2,
      why: "The tool writes to `tool_context.state` while it runs, and the framework attaches the accumulated changes to the event it emits when the tool returns. The call event is emitted before the tool has run, so it cannot know what will change." },
    { stem: "You call list_sessions to render a list of a user's past conversations. Why is it cheap?",
      options: ["It returns only the most recent ten sessions", "It returns sessions without their events", "It reads from a cache rather than the database", "It returns ids only, not Session objects"],
      answer: 1,
      why: "The executed trace shows `len(sessions[0].events) == 0` from a list call on a session that definitely had four events. Listing returns the session rows; fetching the transcript is what `get_session` is for. If listing loaded every event, a sidebar would load the entire history of every conversation." },
    { stem: "A user asks you to delete a conversation. You call delete_session. What might still remain?",
      options: ["Nothing — the session was the only copy", "State written under the user: prefix, and anything ingested into memory", "The events, until a retention job runs", "The state, but not the events"],
      answer: 1,
      why: "User-scoped state is keyed by app and user, not by session, so deleting one conversation leaves it untouched. If the session was ever ingested into a memory service, that copy is separate too. Honouring a deletion request means deleting all three, which is a design decision you have to make deliberately." }
  ] },

  interview: { title: "Interview", sub: "Session questions", questions: [
    { level: "Core", q: "How does a stateless model hold a coherent conversation?",
      strong: "It does not — the framework replays a stored transcript into every request, and that replay is the conversation.",
      answer: [{ t: "p", text: "Each call to the model is independent. What makes turn ten coherent is that the runner loads the session, turns its events into the request's contents, and sends the whole transcript again. Two consequences follow immediately and both matter in production. The cost of a turn grows with the length of the conversation, because you resend it every time — which is what makes compaction and caching worth configuring. And anything not written to the session simply does not exist next turn: a variable set inside a tool, a value held on the agent object, a note the model made to itself in text it did not emit. If it is not in events or state, it is gone." }] },
    { level: "Core", q: "What is the difference between a session and a user?",
      strong: "A session is one conversation; a user is the person who may have hundreds of them, and the two have different state scopes.",
      answer: [{ t: "p", text: "The user is the stable identity — the key under which user-scoped state and long-term memory are stored. A session is a single conversation belonging to that user, with its own event log and its own session-scoped state. The distinction is where most design mistakes live: a dietary preference belongs to the user, a half-finished booking belongs to the session. Put the preference in session state and the user re-states it tomorrow; put the half-finished booking in user state and it bleeds into an unrelated conversation next week." }] },
    { level: "Senior", q: "Your agent occasionally answers as if an earlier turn never happened. How do you debug it?",
      strong: "Fetch the session and read the events; the answer is almost always that the information was never written, or the request no longer includes it.",
      answer: [{ t: "p", text: "I would start by pulling the session from the service and printing every event with its author and delta, because that is the entire ground truth. Three causes account for nearly all of it. The information was never written — a tool computed something and returned it as text without touching state, so it exists only in an event the model may or may not attend to. The client started a new session id, which is common when a page reload generates a fresh one; the log will have far fewer events than the conversation appeared to have. Or compaction summarised the earlier events and the detail did not survive the summary, which is visible as a compaction event in the log. Only after ruling those out would I treat it as a model attention problem, and by then I usually have the fix: write the fact to state and put it in the instruction, where it is stated afresh on every turn instead of buried forty messages back." }] }
  ] }
});

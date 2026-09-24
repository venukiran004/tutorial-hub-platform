/* ============================================================================
   LESSON 5.2 — State: Scopes, Prefixes and the Event Delta
   The scope behaviour was executed (scratchpad/adk/s2.py) and the storage
   layout was read out of the SQLite file DatabaseSessionService created.
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**State is the agent's working memory, and a four-character prefix decides how long it lives.** An unprefixed key belongs to this conversation. `user:` belongs to the person and follows them into every future conversation. `app:` belongs to everybody. `temp:` belongs to nothing — it is gone the moment the turn ends. Getting this wrong is not a subtle bug: it is either a user re-stating their allergy every morning, or one customer's address turning up in another customer's booking. This lesson runs all four scopes across two sessions and two users and prints what survived.",

  objectives: [
    "Choose the correct scope prefix for a given piece of information, and justify it",
    "Predict what a new session and a different user will see after a write",
    "Explain why state changes travel as event deltas rather than direct writes",
    "Write state three ways — from a tool, from a callback, and with output_key",
    "Say what state is not for, and where that information belongs instead"
  ],

  prerequisites: ["5.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Four scopes, one dictionary", id: "scopes" },

    { t: "p", text: "There is a single `state` dictionary and the prefix on each key selects the store it is committed to. Nothing else distinguishes them — no separate API, no separate object. The constants are on the `State` class, and they are exactly three, because the fourth scope is the absence of a prefix." },

    { t: "code", lang: "python", title: "The prefixes, from the source",
      code: `from google.adk.sessions import State
print(State.APP_PREFIX, State.USER_PREFIX, State.TEMP_PREFIX)`,
      caption: "google-adk 2.9.2." },

    { t: "out", text: "app: user: temp:" },

    { t: "table", head: ["Written as", "Scope", "Survives the turn?", "Survives a new session?", "Visible to another user?"],
      rows: [
        ["`state[\"draft\"]`", "This session", "Yes", "No", "No"],
        ["`state[\"user:tier\"]`", "This user", "Yes", "Yes", "No"],
        ["`state[\"app:hits\"]`", "The whole app", "Yes", "Yes", "**Yes**"],
        ["`state[\"temp:scratch\"]`", "This invocation", "**No**", "No", "No"]
      ] },

    { t: "h2", n: "02", text: "All four, measured", id: "measured" },

    {"kind": "matrix", "title": "The measured result, as a table", "caption": "Executed across two sessions and two users. temp: never appeared anywhere — not in the session, not even in the delta on the event.", "cols": ["Same session", "New session", "Other user"], "rows": ["turn (no prefix)", "user:name", "app:hits", "temp:scratch"], "cells": [[true, false, false], [true, true, false], [true, true, true], [{"text": "within the turn", "tone": "warn"}, false, false]], "t": "diagram", "id": "dg-5_2-02-0"},


    { t: "p", text: "One tool writes one key in each scope and returns. It is then run in three places: a session, a second session belonging to the same user, and a session belonging to a different user. Nothing here is asserted from the documentation — the output is what the framework did." },

    { t: "code", lang: "python", title: "s2.py — one tool, four writes",
      code: `def mark(tool_context) -> dict:
    """Writes one key in each scope."""
    n = tool_context.state.get("app:hits", 0) + 1
    tool_context.state["app:hits"] = n                 # every user, every session
    tool_context.state["user:name"] = "Ada"            # this user, every session
    tool_context.state["turn"] = "booking"             # this session only
    tool_context.state["temp:scratch"] = "not saved"   # this invocation only
    return {"hits": n}` },

    { t: "out", text: `session A after turn:  {'turn': 'booking', 'app:hits': 1, 'user:name': 'Ada'}
session B before turn: {'app:hits': 1, 'user:name': 'Ada'}
session B after turn:  {'turn': 'booking', 'app:hits': 2, 'user:name': 'Ada'}

user 2, new session:    {'app:hits': 2}
user 2 after turn:      {'turn': 'booking', 'app:hits': 3, 'user:name': 'Ada'}

state_delta on the tool-response event: {'app:hits': 3, 'user:name': 'Ada', 'turn': 'booking'}` },

    { t: "p", text: "Four things are proved by those nine lines. **`temp:scratch` never appears anywhere** — not in the session, not even in the delta on the event. **`app:hits` kept counting across users**, reaching 3, because it is one counter for the whole application. **`user:name` was already present in session B before its first turn**, which is user-scoped state being loaded into a brand-new conversation. And **user 2's new session started with `app:hits` but no `user:name`**, which is the isolation boundary drawn exactly where you would want it." },

    { t: "diagram", kind: "compare", title: "What each store is keyed by",
      caption: "Read from the SQLite schema DatabaseSessionService creates: app_states is keyed by app_name; user_states by (app_name, user_id); sessions by (app_name, user_id, id). temp: has no table because it has no store.",
      columns: [
        { title: "app:", tone: "violet", items: ["key: app_name", "table: app_states", "one row per application", "feature flags, shared counters"] },
        { title: "user:", tone: "warn", items: ["key: app_name + user_id", "table: user_states", "one row per person", "preferences, tier, locale"] },
        { title: "(no prefix)", tone: "accent", items: ["key: app_name + user_id + session_id", "column on sessions", "one row per conversation", "the half-filled form"] },
        { title: "temp:", tone: "crit", items: ["key: nothing", "table: none", "lives in the delta, dropped on commit", "a value passed between callbacks"] }
      ] },

    { t: "callout", kind: "insight", title: "app: is genuinely global — treat it as read-mostly",
      body: [{ t: "p", text: "The executed trace shows one counter incremented by two different users. That is correct behaviour and it is also a warning: `app:` is shared mutable state across every concurrent conversation in your deployment, with no transaction around your read-modify-write. Use it for configuration you set deliberately, not for counters you expect to be accurate. If you need a correct count, count in a database that understands atomic increments." }] },

    { t: "h2", n: "03", text: "Why changes travel as deltas", id: "delta" },

    { t: "p", text: "A tool does not write to the store. It mutates the `State` object it was handed, which records every assignment in a pending delta; the framework then attaches that delta to the event it emits, and the session service applies it when it commits the event. The last line of the trace shows the delta with three keys and not four — `temp:` was filtered out before the event was written." },

    { t: "diagram", kind: "flow", title: "The path of one assignment",
      caption: "This indirection is what makes state auditable. Every value in state is explained by an event, and replaying the events reconstructs it exactly.",
      cols: 4,
      nodes: [
        { id: "a", label: "state[k] = v", sub: "inside your tool", tone: "accent" },
        { id: "b", label: "pending delta", sub: "on the State object" },
        { id: "c", label: "event.actions", sub: "state_delta attached", tone: "good" },
        { id: "d", label: "service commits", sub: "routed by prefix", tone: "violet" }
      ],
      edges: [["a", "b"], ["b", "c", "temp: dropped"], ["c", "d"]] },

    { t: "callout", kind: "trap", title: "Mutating a nested object does not register",
      body: [{ t: "p", text: "`state[\"cart\"][\"items\"].append(x)` mutates a list in place. The `State` object never sees an assignment, so nothing enters the delta, so nothing is committed — and it will appear to work, because the in-memory dictionary you just mutated is the one the rest of the turn reads. It fails on the next turn, when the value is reloaded from the store without your change. Always reassign: read the value, change it, then `state[\"cart\"] = new_cart`." }] },

    { t: "h2", n: "04", text: "Three ways to write state", id: "writes" },

    { t: "table", head: ["Way", "Code", "Use it when"],
      rows: [
        ["From a tool", "`tool_context.state[\"k\"] = v`", "The value is a result of doing something — a booking id, a fetched record"],
        ["From a callback", "`callback_context.state[\"k\"] = v`", "The value is bookkeeping around the turn — a counter, a flag, a classification"],
        ["`output_key`", "`LlmAgent(..., output_key=\"summary\")`", "You want the agent's final text stored automatically, usually to feed the next agent in a sequence"]
      ] },

    { t: "code", lang: "python", title: "output_key, and reading state back in an instruction",
      code: `summariser = LlmAgent(name="summariser", model=MODEL,
                      instruction="Summarise the document in three sentences.",
                      output_key="summary")

critic = LlmAgent(name="critic", model=MODEL,
                  instruction="Critique this summary: {summary}")

pipeline = SequentialAgent(name="review", sub_agents=[summariser, critic])`,
      caption: "`{summary}` in an instruction is substituted from state before the request is built — the mechanism that makes a SequentialAgent more than a list. Lesson 2.3 ran this." },

    { t: "callout", kind: "note", title: "A missing key in an instruction template",
      body: [{ t: "p", text: "`{summary}` with no `summary` in state does not silently render as an empty string — ADK raises rather than sending the model a sentence with a hole in it. If a key is genuinely optional, use an instruction provider function (lesson 5.5) and build the string yourself with `state.get(...)`." }] },

    { t: "h2", n: "05", text: "What state is not for", id: "not-for" },

    { t: "dl", items: [
      ["Large blobs", "A PDF, an image, a 200-row result set. State is loaded and written on every turn of every conversation; putting a megabyte in it taxes every request. Use artifacts (lesson 6.3)."],
      ["Anything the model must not see", "State is routinely interpolated into instructions and is visible to callbacks and tools. An access token does not belong there; the credential service does (lesson 4.8)."],
      ["Your application's records of truth", "An order is a row in your orders table. State may hold its id. If the only copy of a booking lives in session state, a session deletion is a data loss incident."],
      ["Cross-user coordination", "Two conversations happening at once cannot use `app:` state to talk to each other safely. Use a queue or a database."]
    ] },

    { t: "callout", kind: "tradeoff", title: "state versus memory",
      body: [{ t: "p", text: "Both survive the session, so the boundary is worth naming. `user:` state is a small set of keys you chose, written deliberately, read on every turn, and cheap. Memory is everything the user ever said, searched on demand, approximate, and paid for per query (lesson 5.4). A dietary requirement belongs in `user:` state because it must be true on every turn. What the user said about their holiday in March belongs in memory because it matters only when asked about." }] },

    { t: "exercise", kind: "practice", title: "Place eight facts", difficulty: "core", minutes: 18,
      prompt: "For each of these, choose session state, user: state, app: state, temp:, an artifact, or your own database — and say why. (1) The customer's delivery address for this order. (2) That the customer prefers email over SMS. (3) The feature flag enabling a new tool. (4) A 4 MB invoice PDF the agent generated. (5) The id of the order just created. (6) An intermediate score a before-model callback computed for an after-model callback. (7) The customer's saved payment token. (8) How many times any user has triggered the escalation path today.",
      hints: [
        "Ask first: must this be true on the next turn, in the next conversation, or for other people?",
        "Two of these should not be in state at all.",
        "One of them is a counter that app: state will get wrong under concurrency."
      ],
      solution: {
        notes: [
          { t: "p", text: "Session state: (1) the delivery address for this order, because it is scoped to the thing being done now, and (5) the order id, which the rest of the conversation refers back to. User state: (2) the contact preference — the whole point is that tomorrow's conversation knows it without asking." },
          { t: "p", text: "App state: (3) the feature flag, set deliberately and read by everyone. Temp: (6) the intermediate score, which exists only to pass a value between two callbacks in the same invocation and would be noise in the store." },
          { t: "p", text: "Not state at all: (4) the PDF is an artifact, because state is reloaded on every turn and four megabytes of it would be intolerable; (7) the payment token belongs in the credential service or a secrets store, since state is interpolated into prompts and visible to every tool; and (8) the daily escalation count should be a database counter — app: state would race between concurrent conversations and quietly lose increments." }
        ]
      } }

  ],

  takeaways: [
    "One dictionary, four scopes: unprefixed (session), `user:`, `app:`, `temp:` — the prefix chooses the store.",
    "`temp:` is dropped before the event is written; it never reaches the delta or the database.",
    "`app:` is shared by every user, which the executed counter reaching 3 across two users demonstrates.",
    "Writes become a `state_delta` on an event, which is why the log explains every value state holds.",
    "Mutating a nested object in place does not register a delta — reassign the key.",
    "Large blobs, secrets and records of truth do not belong in state; artifacts, the credential service and your database do."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool writes `state[\"temp:draft\"] = x`. A callback later in the same invocation reads `state.get(\"temp:draft\")`. What does it get?",
      options: ["None — temp: is never readable", "The value x", "The value x only if the tool returned successfully", "A KeyError"],
      answer: 1,
      why: "`temp:` survives the invocation; it is dropped when the event is committed. Within the turn it behaves like any other key, which is precisely what makes it the right place to pass a value between callbacks without polluting the stored session." },
    { stem: "Why did user 2's brand-new session already contain `app:hits` but not `user:name`?",
      options: ["Because app: state is copied into new sessions and user: state is not", "Because app: is keyed by app_name alone, while user: is keyed by app_name and user_id", "Because the tool wrote app:hits before user:name", "Because user: state requires a database session service"],
      answer: 1,
      why: "The SQLite schema makes it concrete: `app_states` has one row per app, `user_states` has one row per (app, user). User 2 shares the app row with user 1, so they see the same counter, and has their own user row, which was empty until their own turn wrote to it." },
    { stem: "Your agent stores a running list with `state[\"items\"].append(item)` inside a tool. It works during the conversation but the list is empty tomorrow. Why?",
      options: ["user: prefix is missing", "In-place mutation produces no delta, so nothing was committed", "Lists are not serialisable into state", "The session service overwrote it"],
      answer: 1,
      why: "Two bugs stack here, and the second hides the first. In-place mutation never registers an assignment, so no delta is produced and nothing is stored — but the mutated dictionary stays in memory for the rest of the turn, so it looks correct. Reassigning the key fixes the commit; the missing `user:` prefix would still need fixing for it to be there tomorrow." },
    { stem: "Which of these is the best use of app: state?",
      options: ["A counter of how many requests the app has served", "A feature flag that enables a tool for everyone", "The current user's language preference", "A lock that stops two conversations doing the same thing"],
      answer: 1,
      why: "A flag is read-mostly, set deliberately, and correct even if two conversations read it at once. The counter races, the language preference is per user, and a lock needs atomicity that a state dictionary with no transaction cannot offer." }
  ] },

  interview: { title: "Interview", sub: "State questions", questions: [
    { level: "Core", q: "Walk me through the state scopes and when you would use each.",
      strong: "Session for this conversation's working data, user: for things that must be true next time, app: for read-mostly configuration, temp: for within-turn plumbing.",
      answer: [{ t: "p", text: "The prefix is the whole API. Unprefixed keys are the half-filled form — the address for this order, the record being edited — and they die with the conversation, which is what you want. `user:` is for what should be true the next time this person appears: their tier, their locale, a dietary requirement. `app:` is one row for the whole application, so I treat it as configuration rather than data, because two concurrent conversations will happily clobber each other's read-modify-write. `temp:` is for passing a value between callbacks inside one turn; it is dropped before the event is committed, so it never bloats the stored session." }] },
    { level: "Core", q: "Why does ADK route state changes through event deltas instead of writing directly?",
      strong: "So the event log fully explains state — the log is auditable, replayable, and consistent with what the model saw.",
      answer: [{ t: "p", text: "If tools wrote straight to a store, the session would have values with no recorded cause, and you could not reconstruct what happened from the transcript. With deltas, every value in state is attributable to a specific event, which makes production debugging a matter of reading the log rather than guessing. It also gives the framework one commit point: the delta is applied when the event is appended, so a turn that fails before emitting its event does not leave half its writes behind, and the `temp:` filter has exactly one place to live." }] },
    { level: "Senior", q: "A reviewer says your agent leaks data between users. Where do you look first?",
      strong: "Any app: key holding per-user data, then whether user_id comes from an authenticated source.",
      answer: [{ t: "p", text: "Two failure modes account for almost all of it. The first is a key that should have been `user:` written as `app:`, which makes one person's value visible to everybody — easy to introduce and invisible in testing with one user, so I grep for `app:` writes and check each one is genuinely application-wide. The second is worse: `user_id` taken from a request parameter rather than derived from the authenticated principal, which means a caller can simply ask for someone else's state and memory by typing their id. ADK does no authentication of its own, so that check is entirely the application's. After those I would look at whether a singleton agent object is holding per-user data in its own fields, because agents are shared across concurrent invocations and anything stored on `self` is shared too." }] }
  ] }
});

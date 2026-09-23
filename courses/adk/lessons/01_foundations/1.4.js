/* ============================================================================
   LESSON 1.4 — The Four Objects: Agent, Runner, Session, Event
   Field lists introspected from google-adk 2.9.2; the trace is a real run
   against a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**An agent decides, a runner executes, a session remembers, an event records.** Four objects, and almost every question about ADK — where does this value live, why did that tool not see my state, what happens if the process restarts — is a question about which of the four owns the thing you are asking about. This lesson reads each one's fields off the installed classes, runs an agent that writes state from a tool, and shows the same information appearing as an event delta, as session state and as the history the model sees on the next turn.",

  objectives: [
    "Name the responsibility of the agent, the runner, the session and the event, and the services behind them",
    "Read the fields of Session, Event and EventActions and say what each is for",
    "Explain what an invocation is and how invocation_id groups events",
    "Trace a state change from a tool through an event delta into session state",
    "Say what the App object adds on top of a root agent"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The four, and the services under them", id: "four" },

    { t: "diagram", kind: "flow", title: "Who calls whom",
      caption: "The runner is the only object that talks to the services. An agent never writes to a session; it produces events, and the runner appends them — which is why an agent is testable without any storage at all.",
      cols: 3,
      nodes: [
        { id: "u", label: "your code", sub: "runner.run_async(user_id, session_id, message)" },
        { id: "r", label: "Runner", sub: "executes one invocation", tone: "accent" },
        { id: "a", label: "Agent", sub: "decides: model calls, tool calls, transfers", tone: "good" },
        { id: "sv", label: "services", sub: "session · artifact · memory · credential", tone: "warn" },
        { id: "e", label: "Event stream", sub: "yielded to you, appended to the session", tone: "violet" },
        { id: "s", label: "Session", sub: "state + the event list", tone: "warn" }
      ],
      edges: [["u", "r"], ["r", "a", "runs"], ["a", "e", "yields"], ["r", "sv", "reads and writes"], ["e", "s", "appended"]] },

    { t: "dl", items: [
      ["**Agent** — decides", "A configuration object, not a process: a model, an instruction, tools, sub-agents and callbacks. Running it produces events. `BaseAgent` is the contract; `LlmAgent` is the one that calls a model; `SequentialAgent`, `ParallelAgent` and `LoopAgent` orchestrate others."],
      ["**Runner** — executes", "Holds the services, assembles the request, calls the agent, executes tool calls, appends events and yields them. One `Runner` serves many users and sessions; it is not per-conversation."],
      ["**Session** — remembers", "One conversation: `id`, `app_name`, `user_id`, a `state` dict and an `events` list. Created and fetched through a session service, which decides whether it lives in memory, in a database or in Vertex AI."],
      ["**Event** — records", "One thing that happened, with an `author`, `content`, and an `actions` object carrying side effects — state deltas, artifact deltas, transfers, escalation. The event list *is* the transcript."]
    ] },

    { t: "h2", n: "02", text: "The fields, from the installed classes", id: "fields" },

    { t: "code", lang: "python", title: "Read them yourself",
      code: `from google.adk.sessions import Session, State
from google.adk.events import Event, EventActions

print(list(Session.model_fields))
print(State.APP_PREFIX, State.USER_PREFIX, State.TEMP_PREFIX)
print(list(EventActions.model_fields)[:8])` },

    { t: "out", text: `Session fields      : ['id', 'app_name', 'user_id', 'state', 'events', 'last_update_time']
State prefixes      : app: user: temp:
EventActions fields : ['skip_summarization', 'state_delta', 'artifact_delta', 'transfer_to_agent',
                       'transfer_reason', 'escalate', 'requested_auth_configs',
                       'requested_tool_confirmations'] …` },

    { t: "table", head: ["Object", "Field", "What it is for"],
      rows: [
        ["Session", "`id`, `app_name`, `user_id`", "The three-part key: an app holds users, a user holds sessions"],
        ["Session", "`state`", "A dict, with `app:`, `user:` and `temp:` prefixes selecting the scope (lesson 5.2)"],
        ["Session", "`events`", "The ordered transcript, including the user's own messages"],
        ["Event", "`id`, `timestamp`, `author`", "Who produced it — `user`, or the agent's `name`"],
        ["Event", "`invocation_id`", "Groups every event of one run; shared by all agents involved"],
        ["Event", "`content`", "A `types.Content` with text, a function call, or a function response"],
        ["Event", "`partial`, `turn_complete`", "Streaming bookkeeping (lesson 10.2)"],
        ["Event", "`branch`", "Which parallel branch produced it (lesson 2.3)"],
        ["Event", "`actions`", "The side effects — see below"],
        ["EventActions", "`state_delta`", "State changes to apply when this event is appended"],
        ["EventActions", "`artifact_delta`", "Artifacts saved during this step, with versions"],
        ["EventActions", "`transfer_to_agent`", "Hand the conversation to another agent (lesson 2.5)"],
        ["EventActions", "`escalate`", "Stop the enclosing loop (lesson 2.3)"],
        ["EventActions", "`skip_summarization`", "Return a tool result to the user without a model pass"],
        ["EventActions", "`requested_tool_confirmations`", "The human-approval request (lesson 9.3)"]
      ] },

    { t: "h2", n: "03", text: "An invocation", id: "invocation" },

    { t: "p", text: "One call to `run_async` is one **invocation**: one user message in, a stream of events out, ending when an agent produces a final response. Every event in it carries the same `invocation_id`, no matter how many agents, tools and model calls were involved. It is the unit of tracing, of resumption and of cost." },

    { t: "code", lang: "python", title: "A tool that writes state, run for real",
      code: `def remember(fact: str, tool_context) -> dict:
    """Stores a fact about the user for later turns.

    Args:
        fact: the fact to remember.
    """
    tool_context.state["user:fact"] = fact                              # user scope: outlives this session
    tool_context.state["turn_count"] = tool_context.state.get("turn_count", 0) + 1
    return {"stored": fact}

agent = LlmAgent(name="assistant", model=llm,
                 instruction="Remember what the user tells you.", tools=[remember])
runner = InMemoryRunner(agent, app_name="demo")
await runner.session_service.create_session(app_name="demo", user_id="u1", session_id="s1")

events = [e async for e in runner.run_async(user_id="u1", session_id="s1", new_message=msg)]`,
      caption: "The tool takes `tool_context` as a parameter; ADK injects it and never shows it to the model (lesson 4.2). The user's message was \"I prefer window seats.\"" },

    { t: "out", text: `events produced: 3
  id=c4579038  author=assistant  kind=function_call      final=False state_delta={}
  id=36c502a2  author=assistant  kind=function_response  final=False state_delta={'user:fact': 'prefers window seats', 'turn_count': 1}
  id=1569e9ae  author=assistant  kind=text               final=True  state_delta={}

session state after the run: {'turn_count': 1, 'user:fact': 'prefers window seats'}
session events           : 4
every event shares invocation_id: True → e-09e4d662-00c9-412f-b732-839ea0c525c6` },

    { t: "p", text: "Three things to read off that output. The **state delta rides on the function-response event**, not on a separate write — the tool's mutation was collected and attached to the event it produced. The **session has four events to the stream's three**, because the user's message is recorded too. And **one invocation id covers all of them**, which is what a trace groups by." },

    { t: "diagram", kind: "trace", title: "The same fact, in three places",
      caption: "A value a tool writes appears as a delta on an event, then in session state once the event is appended, then in the prompt on the next turn if the instruction interpolates it. Knowing which of the three you are looking at is most of debugging state.",
      vars: ["event.actions.state_delta", "session.state", "next prompt"],
      steps: [
        { code: "tool assigns tool_context.state['user:fact']", state: ["—", "—", "—"], note: "in memory, not yet recorded" },
        { code: "ADK builds the function_response event", state: ["{'user:fact': …}", "—", "—"], changed: [0], tone: "accent" },
        { code: "runner appends the event to the session", state: ["{'user:fact': …}", "{'user:fact': …}", "—"], changed: [1], tone: "good" },
        { code: "next turn: instruction interpolates {user:fact}", state: ["—", "{'user:fact': …}", "in the system instruction"], changed: [2], tone: "violet" }
      ] },

    { t: "h2", n: "04", text: "One runner, many sessions", id: "runner" },

    { t: "code", lang: "python", title: "The runner's constructor is the wiring",
      code: `Runner(
    *,
    app: Optional[App] = None,
    app_name: Optional[str] = None,
    agent: Optional[BaseAgent] = None,
    plugins: Optional[List[BasePlugin]] = None,
    artifact_service: Optional[BaseArtifactService] = None,
    session_service: BaseSessionService,                 # the only required service
    memory_service: Optional[BaseMemoryService] = None,
    credential_service: Optional[BaseCredentialService] = None,
    auto_create_session: bool = False,
)`,
      caption: "Introspected from 2.9.2. `InMemoryRunner(agent, app_name=…)` is this with all four services set to their in-memory implementations — the reason it is one line in every example and never the thing you deploy." },

    { t: "p", text: "A runner is built once, at start-up, and serves every conversation: `run_async` takes the `user_id` and `session_id` per call. Sessions are not objects you hold — you ask the session service for them by key. That is what lets a horizontally scaled service answer turn five on a different instance from turn four, provided the session service is a shared one (lesson 5.3)." },

    { t: "callout", kind: "trap", title: "InMemoryRunner is not a starting point you can grow",
      body: [{ t: "p", text: "It keeps sessions, artifacts and memory in the process. Restart and the conversation is gone; run two replicas and half the turns land on an instance that has never heard of the session. It is correct for tests and the dev loop, and wrong for anything with a user. The change is one constructor — `Runner(agent=…, session_service=DatabaseSessionService(db_url=…), …)` — which is exactly why the services are injected." }] },

    { t: "h2", n: "05", text: "App: the fifth object you will meet", id: "app" },

    { t: "p", text: "ADK 2.x adds an `App` that wraps a root agent with the things that apply to the whole application rather than to one agent:" },

    { t: "code", lang: "python", title: "App's fields, from the class",
      code: `from google.adk.apps import App
print(list(App.model_fields))
# ['name', 'root_agent', 'plugins', 'events_compaction_config',
#  'context_cache_config', 'resumability_config']`,
      caption: "Plugins are callbacks that apply to every agent and tool (lesson 6.2); compaction and context caching control what is sent to the model as a conversation grows (lesson 5.6); resumability governs pausing and resuming an invocation (lesson 9.3). Pass an `App` to the runner instead of an agent when you need any of them." },

    { t: "diagram", kind: "layers", title: "What owns what",
      caption: "Reading the stack downwards answers 'where do I configure this?': app-wide behaviour on the App, per-agent behaviour on the agent, per-invocation behaviour in RunConfig, per-turn facts in the session.",
      items: [
        { label: "App", sub: "plugins · compaction · context cache · resumability", tone: "violet" },
        { label: "Runner", sub: "the services, and the invocation loop", tone: "accent" },
        { label: "Agent tree", sub: "model, instruction, tools, callbacks, sub-agents", tone: "good" },
        { label: "Session", sub: "state and events for one conversation", tone: "warn" }
      ] },

    { t: "exercise", kind: "practice", title: "Find the fourth event", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "Run an agent with one tool that writes to state, collect the events from `run_async` into a list, then fetch the session and compare. Answer: (a) how many events did the stream yield and how many does the session hold; (b) which event carries the state delta; (c) what is the author of the event the stream did not yield; (d) after a second `run_async` on the same session, how many distinct invocation ids does the session contain?" }],
      requirements: ["Print the author, kind and state_delta of every event", "Compare stream length with session length", "Count distinct invocation ids"],
      hint: "`{e.invocation_id for e in session.events}` is a set.",
      solution: { lang: "python", title: "Solution",
        code: `events = [e async for e in runner.run_async(user_id="u1", session_id="s1", new_message=msg)]
s = await runner.session_service.get_session(app_name="demo", user_id="u1", session_id="s1")
print(len(events), len(s.events))                     # 3 4
print([e.author for e in s.events])                   # ['user', 'assistant', 'assistant', 'assistant']
print([dict(e.actions.state_delta) for e in s.events])
# the delta is on the function_response event, not the final text event

# second turn on the same session
async for _ in runner.run_async(user_id="u1", session_id="s1", new_message=msg2): pass
s2 = await runner.session_service.get_session(app_name="demo", user_id="u1", session_id="s1")
print(len(s2.events), len({e.invocation_id for e in s2.events}))   # 6 2`,
        notes: [{ t: "p", text: "Two invocations, six events, one session. The invocation id is the grouping you will want in a trace and in a log line; the session id is the grouping a user would recognise as 'the conversation'." }] } }
  ],

  takeaways: [
    "Agent decides, runner executes, session remembers, event records — and the runner is the only one that talks to the services.",
    "A Session is app_name + user_id + id, a state dict and an ordered event list that includes the user's own messages.",
    "An Event carries author, content and an actions object; EventActions is where state deltas, artifact deltas, transfers, escalation and approval requests live.",
    "One call to run_async is one invocation, and every event in it shares an invocation_id regardless of how many agents took part.",
    "A tool's state write becomes a delta on the event it produced, is applied when the event is appended, and appears in session state afterwards.",
    "One Runner serves all users and sessions; InMemoryRunner is the same object with in-memory services, correct for tests and wrong for production.",
    "App wraps a root agent with plugins, compaction, context caching and resumability — the settings that are not per agent."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Which object does a tool's state write travel on before it reaches the session?",
      options: ["It is written directly by the session service", "The event the tool call produced carries it as actions.state_delta", "The agent stores it until the end of the invocation", "The runner writes it immediately"],
      answer: 1,
      why: "The tool mutates tool_context.state; ADK collects that mutation as a state_delta on the function-response event, and the session service applies it when appending. Because the change is part of the event record, replaying events rebuilds state — which is what makes sessions persistable and resumable." },
    { stem: "The stream yielded three events but the session holds four. Which is the extra one?",
      options: ["A partial event", "The user's own message, appended before the agent ran", "A duplicate of the final response", "An empty heartbeat event"],
      answer: 1,
      why: "ADK records the incoming user message as an event so the session's event list is a complete transcript that the next turn can be rebuilt from. The stream only yields what the agent produced, which is what you would show in a UI." },
    { stem: "What does invocation_id group?",
      options: ["All events of one conversation", "All events of one call to run_async, across every agent and tool involved", "All events produced by one agent", "All events in one session for one user"],
      answer: 1,
      why: "One run_async call is one invocation. Every event it produces — model calls, tool calls, sub-agent events after a transfer — shares the id, which is the natural grouping for a trace span and for a log correlation id. The session id is the larger grouping a user would call 'the conversation'." },
    { stem: "Why is InMemoryRunner unsuitable for production?",
      options: ["It is slower", "It keeps sessions, artifacts and memory in the process, so a restart loses conversations and a second replica cannot see them", "It cannot call Gemini", "It does not support tools"],
      answer: 1,
      why: "It wires the four in-memory services. Anything stored is per-process and per-run, so restarts lose the conversation and horizontal scaling breaks it. Production uses the same Runner class with a persistent session service and a shared artifact store — a wiring change, not a code change." }
  ] },

  interview: { title: "Interview", sub: "Object-model questions", questions: [
    { level: "Core", q: "Explain ADK's object model.",
      strong: "Agent decides, runner executes with injected services, session holds state and events, event records one step with its side effects.",
      answer: [{ t: "p", text: "An agent is a configuration — model, instruction, tools, sub-agents, callbacks — and running it yields events rather than returning a string. The runner owns the execution: it holds the session, artifact, memory and credential services, assembles the model request from the session's history, executes the tool calls the model asks for, appends every event to the session and yields it to the caller. A session is one conversation, keyed by app name, user id and session id, holding a state dict and the ordered event list. An event is one step — a model message, a tool call, a tool result — with an actions object carrying side effects like state deltas and transfers. Above all of them, an App adds application-wide plugins, compaction and resumability. The practical value of knowing this is that every 'where does X live' question has one answer." }] },
    { level: "Core", q: "Why does ADK put state changes on events instead of writing them directly?",
      strong: "So the event list is a complete, replayable record: persistence, resumption, tracing and audit all follow from it.",
      answer: [{ t: "p", text: "If a tool wrote to storage directly, the event log and the state could disagree, and nothing could be rebuilt from the record alone. By attaching the change as a delta to the event that caused it, the session becomes an ordered log plus a derived state: appending events applies deltas, and replaying the log reconstructs the state exactly. That gives you persistence across process restarts, the ability to resume an interrupted invocation, an audit trail that says which tool call changed which key, and the option to rewind. It is the same argument as event sourcing in an ordinary backend, applied to a conversation." }] },
    { level: "Senior", q: "You are putting an ADK agent behind an HTTP API with several replicas. What has to change from the tutorial wiring?",
      strong: "A shared session service, a shared artifact store, a runner built once at start-up, real session ids per user conversation, and no state in the process.",
      answer: [{ t: "p", text: "Replace InMemoryRunner with a Runner constructed once at start-up and wired to shared services: a DatabaseSessionService or VertexAiSessionService so any replica can serve any turn, a GCS-backed artifact service, a memory service if cross-session recall is needed, and a credential service. Session ids must be real — derived from your own conversation identity — and user ids must be the authenticated user, not a constant. Nothing may be cached in module-level globals between turns, because the next turn may land elsewhere. From there, the runtime concerns are the ordinary ones: the runner's services hold connections, so pool sizing applies; long-running work should use a long-running tool and a durable queue rather than holding the request; and the invocation id belongs in every log line so a trace can be reassembled across replicas." }] }
  ] }
});

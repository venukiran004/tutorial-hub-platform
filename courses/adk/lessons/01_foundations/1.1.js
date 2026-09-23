/* ============================================================================
   LESSON 1.1 — What ADK Is, and Why It Exists
   Everything here was introspected from google-adk 2.9.2 as installed, or
   produced by running the code with a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**The Agent Development Kit is a runtime, not a prompt library.** A model that can call functions gives you the first fifteen minutes of an agent; the rest of the work is everything around the call — remembering the conversation, giving tools a safe way to read and write state, streaming partial output, pausing for a human, retrying a failed call, recording what happened, and doing all of it again tomorrow on a machine that restarted overnight. ADK is Google's open-source answer to that second part: an agent object, a runner that executes it, a session that remembers, an event that records, and services behind each one. This lesson is what it contains, what problem each piece solves, and the design decisions you can read straight off the API.",

  objectives: [
    "State what ADK provides that a bare model API does not, in terms of the objects it ships",
    "Name the top-level packages and say what each one is responsible for",
    "Write and run a minimal agent, and read the events it produces",
    "Explain why the framework is async generators from top to bottom",
    "Identify which parts of ADK are Google-specific and which are not"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The gap a model API leaves", id: "gap" },

    { t: "p", text: "Every model provider now offers function calling: you describe some functions, the model replies with the name and arguments of one it wants called, you run it and send the result back. Write that loop once and you have an agent that works in a notebook. Then the requirements arrive." },

    { t: "diagram", kind: "compare", title: "What you write yourself, and what ADK ships",
      caption: "The left column is the loop everyone writes in an afternoon. The right column is the six months afterwards, and is what the framework is for.",
      columns: [
        { title: "A bare model API gives you", tone: "accent", items: ["a chat completion", "function-call requests", "streaming tokens", "a token count"] },
        { title: "An agent also needs", tone: "warn", items: ["conversation history that survives a restart", "state with a scope — this turn, this user, this app", "files the agent produced or read", "a place to intercept every model and tool call", "human approval before the dangerous action", "retries, timeouts and resumption", "a trace when it goes wrong", "a way to call agents you did not write"] }
      ] },

    { t: "p", text: "ADK is an implementation of the right-hand column, with the left-hand column plugged into it. It is open source (Apache 2.0), written in Python and Java, developed by Google, and deliberately not tied to Gemini or to Google Cloud: the model is an object you can swap, and the deployment target is a flag. What *is* Google-specific is the set of managed services it can use — Vertex AI for sessions, memory, RAG and deployment — and the fact that the first-party model support is the best supported." },

    { t: "h2", n: "02", text: "The smallest agent that does something", id: "smallest" },

    { t: "code", lang: "python", title: "An agent, a tool, a runner, an event stream",
      code: `import asyncio
from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


def get_weather(city: str) -> dict:
    """Returns the current weather for a city.

    Args:
        city: the city to look up.
    """
    return {"status": "ok", "city": city, "temp_c": 21, "sky": "clear"}


agent = LlmAgent(
    name="weather_agent",
    model="gemini-2.5-flash",                       # or any BaseLlm instance
    instruction="Answer weather questions using the get_weather tool.",
    tools=[get_weather],                            # a plain function is a tool
)

async def main():
    runner = InMemoryRunner(agent, app_name="weather_app")
    await runner.session_service.create_session(app_name="weather_app", user_id="u1", session_id="s1")
    msg = types.Content(role="user", parts=[types.Part(text="What is the weather in Bengaluru?")])
    async for event in runner.run_async(user_id="u1", session_id="s1", new_message=msg):
        print(event.author, event.content)

asyncio.run(main())`,
      caption: "Nineteen lines, four ADK names. The function is not wrapped, registered or decorated — ADK reads its signature and docstring and generates the declaration the model sees (lesson 4.1)." },

    { t: "p", text: "Run it — here with a scripted model in place of Gemini, so the output is reproducible and needs no API key (the technique is in lesson 11.3) — and three events come back:" },

    { t: "out", text: `  weather_agent  call get_weather({'city': 'Bengaluru'})
  weather_agent  result get_weather → {'status': 'ok', 'city': 'Bengaluru', 'temp_c': 21, 'sky': 'clear'}
  weather_agent  text='It is 21 °C and clear in Bengaluru.'  [final]

session now holds 4 events` },

    { t: "p", text: "Three events streamed to the caller, four stored in the session — the extra one is the user's own message, which ADK appends before the agent runs. That distinction matters later: the stream is what you show a user, the session is what the next turn is built from." },

    { t: "h2", n: "03", text: "What is in the box", id: "packages" },

    { t: "p", text: "The installed package's top level, read from `pkgutil.iter_modules` on version 2.9.2. It is worth knowing the shape before the names:" },

    { t: "diagram", kind: "layers", title: "The packages, by what they are responsible for",
      caption: "Introspected from google-adk 2.9.2. The course follows roughly this order: agents and models, tools, then the service layer, then everything wrapped around it.",
      items: [
        { label: "agents · models · tools · planners · code_executors", sub: "what decides and what acts", tone: "accent" },
        { label: "runners · flows · workflow · live", sub: "what executes: the invocation loop, the graph, the streaming path", tone: "good" },
        { label: "sessions · memory · artifacts · auth", sub: "the services: what is remembered and who may act", tone: "warn" },
        { label: "events · apps · plugins · telemetry", sub: "the record, the app container, cross-cutting hooks, traces", tone: "violet" },
        { label: "a2a · evaluation · cli · integrations · skills", sub: "interop, measurement, the developer surface", tone: "crit" }
      ] },

    { t: "table", head: ["Package", "What it holds", "Lesson"],
      rows: [
        ["`agents`", "`LlmAgent`, `BaseAgent`, `SequentialAgent`, `ParallelAgent`, `LoopAgent`, `RunConfig`, the context objects", "M2, 5.5"],
        ["`models`", "`Gemini`, `BaseLlm`, `LiteLlm`, `Claude`, `LLMRegistry`, `FallbackModel`", "M3"],
        ["`tools`", "`FunctionTool`, `ToolContext`, `AgentTool`, `McpToolset`, `google_search`, and about fifty more", "M4"],
        ["`runners`", "`Runner`, `InMemoryRunner` — the object that actually executes an invocation", "1.4, 1.5"],
        ["`sessions`", "`Session`, `State`, `InMemorySessionService`, `DatabaseSessionService`, `VertexAiSessionService`", "M5"],
        ["`memory`", "`InMemoryMemoryService`, `VertexAiMemoryBankService`, `VertexAiRagMemoryService`", "5.4"],
        ["`artifacts`", "`InMemoryArtifactService`, `FileArtifactService`, `GcsArtifactService`", "6.3"],
        ["`events`", "`Event`, `EventActions` — the unit of record and the side effects it carries", "1.4"],
        ["`apps`", "`App` — root agent plus plugins, compaction, caching and resumability config", "6.2"],
        ["`plugins`", "`BasePlugin`, `LoggingPlugin`, `ReflectAndRetryToolPlugin`", "6.2, 4.7"],
        ["`a2a`", "`to_a2a`, the agent-card builder, the executor that serves an agent over the protocol", "8.3, 8.4"],
        ["`evaluation`", "`AgentEvaluator` and the evalset format", "11.2"],
        ["`cli`", "`adk web`, `run`, `api_server`, `eval`, `deploy`, `create`", "1.3"]
      ] },

    { t: "h2", n: "04", text: "Four design decisions you can read off the API", id: "decisions" },

    { t: "dl", items: [
      ["**Everything is an event stream**", "`runner.run_async(...)` is an `AsyncGenerator[Event, None]`. Nothing returns \"the answer\"; you iterate over what happened, and the answer is the event for which `is_final_response()` is true. That is what makes streaming, human approval and mid-run interception possible at all — they are just events you have not consumed yet."],
      ["**Services are injected, not imported**", "The runner takes a `session_service`, an `artifact_service`, a `memory_service` and a `credential_service`. Development uses the in-memory implementations; production swaps in a database or Vertex AI without touching agent code. `InMemoryRunner` is exactly this with the four in-memory services pre-wired."],
      ["**State changes travel with events**", "A tool does not write to a database. It writes to `tool_context.state`, the change is attached to the event it produced as a `state_delta`, and the session service applies it when the event is appended. Replay the events and you rebuild the state — which is what makes sessions portable and resumable (lesson 5.2)."],
      ["**Agents compose**", "An agent can hold sub-agents, be wrapped as a tool for another agent, be a step in a sequential workflow, or be the body of a loop. There is no separate \"chain\" concept: composition is the agent tree plus the three workflow agents (lesson 2.3)."]
    ] },

    { t: "callout", kind: "mental", title: "The one-sentence model",
      body: [{ t: "p", text: "An **agent** decides, a **runner** executes, a **session** remembers, an **event** records, and **services** persist. Every question in this course is which of those five is responsible — and almost every bug is a mistake about which one owns a particular piece of information." }] },

    { t: "h2", n: "05", text: "Why async, everywhere", id: "async" },

    { t: "p", text: "Every entry point is a coroutine or an async generator: `run_async`, `BaseLlm.generate_content_async`, `BaseTool.run_async`, `BaseSessionService.create_session`. A tool may be a plain `def` — ADK will await it appropriately — but the framework's own spine is async, for three concrete reasons." },

    { t: "diagram", kind: "steps", title: "Three things async buys",
      caption: "None of these is achievable if the invocation is one blocking call that returns a string at the end.",
      items: [
        { label: "Partial output while the model is still generating", desc: "the streaming lesson's partial events are yielded as they arrive", tone: "accent" },
        { label: "Genuine concurrency across sub-agents and tool calls", desc: "ParallelAgent runs its children on one loop; several tool calls in one model turn run together", tone: "good" },
        { label: "A pause that does not block a thread", desc: "a long-running tool or a human approval step suspends an invocation without holding a worker", tone: "warn" }
      ] },

    { t: "p", text: "The practical consequence: ADK code lives inside `asyncio`, and a tool that calls a blocking library holds the loop exactly as it would in FastAPI. Lesson 10.1 is the full treatment; for now, if you have not written async Python, that is the prerequisite to fill." },

    { t: "h2", n: "06", text: "What ADK is not", id: "not" },

    { t: "dl", items: [
      ["Not a model", "It calls one. Gemini by default, anything with a `BaseLlm` adapter otherwise (lesson 3.2)."],
      ["Not a hosting product", "Agent Engine is the managed runtime on Vertex AI; ADK is the library you deploy to it, to Cloud Run, to GKE or to your own container (lessons 12.1, 12.2)."],
      ["Not a prompt framework", "There are no prompt templates beyond instruction strings with state interpolation. What it standardises is everything around the prompt."],
      ["Not a vector database", "RAG is a tool an agent calls, with the retrieval implementation yours to choose (lesson 7.1)."],
      ["Not magic about reliability", "An agent that calls the wrong tool still calls the wrong tool. The framework gives you the hooks — callbacks, evaluation, tracing — with which to find out."]
    ] },

    { t: "exercise", kind: "practice", title: "Read the shape of the package", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "Install ADK and, without reading any documentation, answer these from the package itself: (a) which classes does `google.adk.sessions` export; (b) what is the signature of `Runner.run_async`; (c) how many fields does `LlmAgent` have, and which three sound like they control delegation; (d) what does `google.adk.tools` export whose name contains `mcp`." }],
      requirements: [
        "`pip install google-adk`",
        "Use `dir()`, `__all__`, `inspect.signature` and `.model_fields` — not the docs",
        "Four short answers"
      ],
      hint: "`LlmAgent.model_fields` is a dict; pydantic models expose their whole schema this way.",
      solution: { lang: "python", title: "Solution",
        code: `import inspect
from google.adk import sessions, tools
from google.adk.agents import LlmAgent
from google.adk.runners import Runner

print(sessions.__all__)
# ['BaseSessionService', 'DatabaseSessionService', 'InMemorySessionService', 'Session', 'State',
#  'StateSchemaError', 'VertexAiSessionService']

print(inspect.signature(Runner.run_async))
# (self, *, user_id, session_id, invocation_id=None, new_message=None, state_delta=None,
#  run_config=None, yield_user_message=False) -> AsyncGenerator[Event, None]

print(len(LlmAgent.model_fields))          # 33 on 2.9.2
print([f for f in LlmAgent.model_fields if "transfer" in f or f in ("sub_agents", "parent_agent")])
# ['parent_agent', 'sub_agents', 'disallow_transfer_to_parent', 'disallow_transfer_to_peers']

print([n for n in tools.__all__ if "cp" in n.lower()])   # ['RemoteMcpServer', 'MCPToolset', 'McpToolset']`,
        notes: [{ t: "p", text: "Reading a framework this way is a habit worth keeping: the installed package is the only documentation that cannot be out of date. It is also how this course was written — every API claim in it came from an introspection like this one against 2.9.2." }] } }
  ],

  takeaways: [
    "ADK is an agent runtime: agent, runner, session, event and injected services, with the model call as one step inside it.",
    "A minimal agent is an LlmAgent with an instruction and plain Python functions as tools, executed by a runner that yields events.",
    "The event stream is the interface — nothing returns 'the answer'; the answer is the event where is_final_response() is true.",
    "Services (session, artifact, memory, credential) are constructor arguments, so development and production differ by wiring rather than by code.",
    "State changes ride on events as deltas, which is what makes sessions replayable, portable and resumable.",
    "It is open source and model-agnostic, with Gemini and Vertex AI as the best-supported path rather than the only one.",
    "The whole spine is async generators, which is what makes streaming, parallelism and pausing for a human possible."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does `runner.run_async(...)` return?",
      options: ["The agent's final text response", "An async generator of Event objects", "A Session", "A list of tool results"],
      answer: 1,
      why: "It is an AsyncGenerator[Event, None]: you iterate it, and each event records one thing that happened — a model call, a tool call, a tool result, a state change. The final answer is the event whose is_final_response() is true, which is why streaming and mid-run interception are possible at all." },
    { stem: "In the weather example, three events were streamed but the session ended up with four. Why?",
      options: ["One event was a duplicate", "The user's own message is appended to the session as an event before the agent runs", "The final event is stored twice", "One event was a partial"],
      answer: 1,
      why: "ADK records the user's message as an event in the session so that the next turn can be rebuilt from the event list alone. The stream yields what the agent produced; the session holds the complete transcript including the input." },
    { stem: "How does a tool change session state?",
      options: ["It writes to the database directly", "It calls session_service.update()", "It assigns to tool_context.state, and the change is attached to the resulting event as a state_delta", "State is read-only for tools"],
      answer: 2,
      why: "The tool mutates its ToolContext's state; ADK collects that as a state_delta on the event the tool call produced, and the session service applies it when appending the event. Because the change travels with the event, replaying events reconstructs the state — the basis for persistence and resumability." },
    { stem: "Which statement about ADK and Agent Engine is correct?",
      options: ["Agent Engine is the open-source version of ADK", "They are alternatives: you pick one", "ADK is the library you write the agent in; Agent Engine is a managed runtime you can deploy it to", "Agent Engine is required to run ADK"],
      answer: 2,
      why: "They sit at different layers. ADK is the framework; Agent Engine is Vertex AI's managed runtime that hosts an agent — and it can host agents built with other frameworks too. You can run ADK locally, in a container, on Cloud Run or on GKE without ever touching Agent Engine (lessons 1.2 and 12.2)." }
  ] },

  interview: { title: "Interview", sub: "What an interviewer asks when ADK is on your CV", questions: [
    { level: "Core", q: "What does ADK give you over calling the Gemini API with function calling yourself?",
      strong: "The runtime around the call: sessions and state, an event record, services you can swap, tools with a real contract, callbacks, streaming, approval, evaluation and a deployment path.",
      answer: [{ t: "p", text: "Function calling gives you one turn: describe functions, get a call back, execute it, send the result. ADK provides everything that turn sits inside. Sessions hold the conversation and survive restarts because a session service persists them. State has scopes — this session, this user, this app — so a tool can remember a preference without you designing a schema. Every step becomes an event, which is what streaming, tracing, resumption and replay are built on. Tools get a context object with state, artifacts, memory and credentials. Callbacks let you validate input, block a tool, or rewrite a response. Workflow agents compose several agents deterministically. And the same agent runs locally, on Cloud Run or on Agent Engine. You could write all of that; the question is whether you want to own it." }] },
    { level: "Core", q: "Walk me through what happens when a user sends a message to an ADK agent.",
      strong: "Runner appends the user event, builds the request from session history plus instructions plus tool declarations, calls the model, executes any tool calls, appends each result as an event, calls the model again, and yields the final event.",
      answer: [{ t: "p", text: "The runner takes the new message, appends it to the session as an event, and starts an invocation with its own invocation_id. It assembles an LlmRequest: the conversation history from the session's events, the agent's instruction as system instruction, and the declarations for the agent's tools. The model responds either with text or with function calls. Function calls become events, each tool runs with a ToolContext, and its return value becomes a function-response event carrying any state delta the tool made. The model is called again with those results appended, and when it returns text with nothing pending, that event is the final response. Every event is appended to the session as it is produced, so the next turn starts from a complete record." }] },
    { level: "Senior", q: "When would you not use ADK?",
      strong: "When the task is a single well-specified model call, when the ecosystem you need is elsewhere, or when the team cannot carry an async Python service.",
      answer: [{ t: "p", text: "If the workload is one prompt and one structured response — classification, extraction, summarisation — an agent framework is overhead; call the model directly and validate the output. If your integrations all exist as LangChain components and nothing in the runtime matters to you, the porting cost may not pay back, though ADK can wrap LangChain tools. If you are on a stack where an always-on async Python service is awkward, the operational fit is poor. And if what you actually need is a managed hosted agent with a console rather than code, a product like Agentspace may be the right layer instead of a framework. The honest test: list the things in the right-hand column of the framework's value — sessions, state scopes, events, callbacks, approval, tracing, evaluation — and count how many you would otherwise build. Below about three, write the loop yourself." }] }
  ] }
});

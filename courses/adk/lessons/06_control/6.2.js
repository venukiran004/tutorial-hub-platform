/* ============================================================================
   LESSON 6.2 — Plugins: Cross-Cutting Concerns
   The 15 hooks and the one-plugin-many-agents trace are executed output from
   scratchpad/adk/c2.py on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**A callback is a promise you make once per agent. In a system with nine agents, that is nine places to forget.** Plugins are the same hooks registered on the `App` instead, so one object observes every agent, every model call and every tool call in the whole application — and gets six additional hooks that have no per-agent equivalent, including one that sees the user's message before any agent runs and one that sees every event as it is emitted. Logging, metrics, tracing, global guardrails and cost accounting all belong here, and this lesson runs a plugin across a two-agent pipeline to show exactly what it sees.",

  objectives: [
    "List the plugin hooks and identify the six that no agent callback has",
    "Write a plugin and register it on an App",
    "Decide whether a concern belongs in a callback or a plugin",
    "Explain the order in which plugins and callbacks run",
    "Use a plugin for logging, metrics and a global guardrail without touching any agent"
  ],

  prerequisites: ["6.1", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "Fifteen hooks", id: "hooks" },

    {"kind": "layers", "title": "Fifteen hooks, grouped by what they wrap", "caption": "The middle three rows are the agent callbacks lifted to application scope. The top and bottom rows have no per-agent equivalent at all, and they are the reason plugins are not merely a convenience.", "items": [{"label": "before_run / after_run / on_run_error", "sub": "the whole invocation — every agent, every transfer", "tone": "violet"}, {"label": "on_user_message", "sub": "before any agent runs — an unbypassable input check", "tone": "crit"}, {"label": "before_agent / after_agent / on_agent_error", "sub": "per agent", "tone": "accent"}, {"label": "before_model / after_model / on_model_error", "sub": "per model request", "tone": "accent"}, {"label": "before_tool / after_tool / on_tool_error", "sub": "per tool call", "tone": "good"}, {"label": "on_event / close", "sub": "every event emitted; shutdown flush", "tone": "warn"}], "t": "diagram", "id": "dg-6_2-01-0"},




    { t: "code", lang: "python", title: "The whole surface",
      code: `from google.adk.plugins import BasePlugin
print([n for n in dir(BasePlugin) if not n.startswith("_")])` },

    { t: "out", text: `after_agent_callback     before_agent_callback    on_agent_error_callback
after_model_callback     before_model_callback    on_model_error_callback
after_tool_callback      before_tool_callback     on_tool_error_callback
after_run_callback       before_run_callback      on_run_error_callback
on_event_callback        on_user_message_callback close` },

    { t: "p", text: "The first nine are the agent callbacks you already know, lifted to application scope. The other six have no per-agent equivalent at all, and they are the reason plugins are not merely a convenience." },

    { t: "dl", items: [
      ["before_run / after_run", "Wrap the entire invocation — every agent, every transfer, the whole turn. This is the correct place to start and stop a trace span or a latency timer, because an agent-level hook fires once per agent and a turn may involve several."],
      ["on_run_error", "The turn failed. One place to catch what nothing else caught."],
      ["on_user_message", "Sees the incoming message before any agent has run. An input guardrail that must apply to every entry point belongs here (lesson 9.2)."],
      ["on_event", "Fires for every event the system emits. Streaming an audit log, counting tokens, feeding a live UI — all of it without touching an agent."],
      ["on_agent_error", "An agent raised. Useful for attributing failures to a specific specialist in a multi-agent system."],
      ["close", "Shutdown. Flush your buffers here; a metrics plugin that batches will otherwise lose its last window."]
    ] },

    { t: "h2", n: "02", text: "One plugin, every agent", id: "every" },

    { t: "code", lang: "python", title: "c2.py — an audit plugin over a two-agent pipeline",
      code: `class Audit(BasePlugin):
    def __init__(self):
        super().__init__(name="audit")
        self.seen = []

    async def before_agent_callback(self, *, agent, callback_context):
        self.seen.append(f"agent:{agent.name}")

    async def before_tool_callback(self, *, tool, tool_args, tool_context):
        self.seen.append(f"tool:{tool.name}{tool_args}")

    async def before_model_callback(self, *, callback_context, llm_request):
        self.seen.append(f"model:{callback_context.agent_name}")

app = App(name="shop",
          root_agent=SequentialAgent(name="pipeline", sub_agents=[finder, writer]),
          plugins=[Audit()])
runner = Runner(app=app, session_service=svc)`,
      caption: "Plugin hooks are `async` and take keyword arguments, which is the main difference from the agent-level functions." },

    { t: "out", text: `one plugin, every agent in the app:
   agent:pipeline
   agent:finder
   model:finder
   tool:lookup{'sku': 'X1'}
   model:finder
   agent:writer
   model:writer` },

    { t: "p", text: "Seven observations from one registration. The plugin saw the **workflow agent itself** (`pipeline`), then each child, each of their model calls and the tool call in between — and not one of those three agents was modified. Adding a tenth agent to this app adds it to the audit log automatically, which is precisely what does not happen with per-agent callbacks." },

    { t: "diagram", kind: "compare", title: "Callback or plugin?",
      caption: "The test is whether the concern belongs to one agent's job or to the system as a whole. If a new agent should automatically be covered, it is a plugin.",
      columns: [
        { title: "Callback — per agent", tone: "accent", items: ["This agent's refund limit", "This agent's output format", "Tool restrictions for one specialist", "Anything specific to its job"] },
        { title: "Plugin — per app", tone: "violet", items: ["Request logging and tracing", "Token and cost accounting", "Global input guardrails", "PII redaction everywhere", "Anything a new agent must inherit"] }
      ] },

    { t: "h2", n: "03", text: "Order, and who wins", id: "order" },

    {"kind": "flow", "title": "Outer ring, inner ring", "caption": "Going in, the plugin decides first — which is what makes a plugin guardrail genuinely global. Coming out, the agent callback runs first, so a plugin timing a call measures the agent callbacks too.", "cols": 4, "nodes": [{"id": "p1", "label": "Plugin before_*", "sub": "can short-circuit here", "tone": "violet"}, {"id": "c1", "label": "Agent before_*", "sub": "consulted only if the plugin passed", "tone": "accent"}, {"id": "w", "label": "The work", "sub": "model call or tool call", "tone": "good"}, {"id": "c2", "label": "Agent after_*", "sub": "sees the result first"}, {"id": "p2", "label": "Plugin after_*", "sub": "sees it last", "tone": "violet"}], "edges": [["p1", "c1"], ["c1", "w"], ["w", "c2"], ["c2", "p2"]], "t": "diagram", "id": "dg-6_2-03-1"},




    { t: "p", text: "Both mechanisms can short-circuit by returning a value, so ordering decides who gets the chance. Plugins run around the agent-level callbacks: a plugin's `before_*` sees the call first, and if it returns a value the agent's own callback never runs. On the way out, the agent callback runs first and the plugin sees the result afterwards." },

    { t: "callout", kind: "mental", title: "Outer ring, inner ring",
      body: [{ t: "p", text: "Picture two rings around the work. Plugins are the outer ring, agent callbacks the inner one. Going in, you cross the outer ring first; coming out, you cross the inner one first. That is why a global guardrail in a plugin genuinely is global — it decides before any agent's own policy is consulted — and why a plugin measuring latency measures the agent callbacks too." }] },

    { t: "callout", kind: "trap", title: "Several plugins, one decision",
      body: [{ t: "p", text: "Plugins run in the order you list them, and the first one to return a value wins — the rest are not consulted. That is fine for a guardrail and surprising for a logger: if an early plugin short-circuits, a later logging plugin's `before_model` never fires and your logs quietly lose those calls. Put observability plugins first in the list, and let the ones that can refuse come after." }] },

    { t: "h2", n: "04", text: "What to build with them", id: "build" },

    { t: "table", head: ["Plugin", "Hooks", "Notes"],
      rows: [
        ["Request log", "`before_run`, `after_run`, `on_run_error`", "One line per turn with user id, invocation id, duration and outcome — the log you will actually grep"],
        ["Token and cost accounting", "`after_model`", "Usage metadata is on the response; attribute it per agent and per user"],
        ["Tracing", "`before_run` / `after_run` plus the agent and tool pairs", "Spans that nest the way the agents do (lesson 11.1)"],
        ["PII redaction", "`before_model`", "Sees the assembled request including history, which is where the leak would be"],
        ["Global input guardrail", "`on_user_message`", "Before any agent runs, so it cannot be bypassed by transfer"],
        ["Live audit stream", "`on_event`", "Every event, including tool calls and state deltas"]
      ] },

    { t: "callout", kind: "good", title: "Nothing ships in the box",
      body: [{ t: "p", text: "`google.adk.plugins` exports `BasePlugin` and `PluginManager` and no ready-made plugins — the introspected listing is exactly those two. So the logging plugin is yours to write, which is a small amount of work and a large amount of freedom: your log line, your fields, your sink. Write it once, early, and register it on every app; the version you write on day one is the one you will be grateful for during the first incident." }] },

    { t: "h2", n: "05", text: "A plugin worth writing on day one", id: "day-one" },

    { t: "code", lang: "python", title: "The log line that pays for itself",
      code: `class RequestLog(BasePlugin):
    def __init__(self):
        super().__init__(name="request_log")
        self._t = {}

    async def before_run_callback(self, *, invocation_context):
        self._t[invocation_context.invocation_id] = time.monotonic()

    async def after_run_callback(self, *, invocation_context):
        started = self._t.pop(invocation_context.invocation_id, None)
        log.info("turn user=%s invocation=%s agent=%s duration=%.2fs",
                 invocation_context.user_id, invocation_context.invocation_id,
                 invocation_context.agent.name,
                 time.monotonic() - (started or time.monotonic()))

    async def on_run_error_callback(self, *, invocation_context, error):
        self._t.pop(invocation_context.invocation_id, None)
        log.exception("turn failed user=%s invocation=%s",
                      invocation_context.user_id, invocation_context.invocation_id)`,
      caption: "Popping the start time in both the success and the error path is not fussiness — a dictionary that only ever grows is a memory leak in a long-running service." },

    { t: "exercise", kind: "practice", title: "One plugin, three jobs", difficulty: "advanced", minutes: 26,
      prompt: "Build an App with a SequentialAgent of two LLM agents, one of which has a tool. Write a single plugin that (a) logs one line per turn with a duration, (b) counts model calls and tool calls per agent, and (c) refuses the whole turn in on_user_message if the message contains a test string. Register it, run three turns including one that should be refused, and print the counters. Then add a second agent to the pipeline and confirm it is covered without any change to the plugin.",
      hints: [
        "Plugin hooks are async and keyword-only — match the signatures exactly or they will not fire.",
        "`callback_context.agent_name` tells you which agent a model call belongs to.",
        "For the refusal, return content from `on_user_message_callback` and check that no agent ran."
      ],
      solution: {
        notes: [
          { t: "p", text: "The counters are the interesting part, because they show a thing that per-agent callbacks make tedious: attributing cost. One dictionary keyed by agent name, incremented in `after_model`, and you can answer 'which specialist is expensive' without instrumenting any of them. Add usage metadata from the response and it becomes a cost report." },
          { t: "p", text: "Adding the third agent and seeing it appear in the log with no edit is the whole argument for plugins. The equivalent with callbacks is three lines of registration per agent that a reviewer has to notice are missing — and they will not notice, because nothing fails when a logging callback is absent. Silence is the worst failure mode for observability, which is why it belongs where it cannot be forgotten." }
        ]
      } }

  ],

  takeaways: [
    "Plugins register on the `App` and observe every agent, model call and tool call in it.",
    "Fifteen hooks: the nine agent-level ones plus run, user-message, event, agent-error and close.",
    "`before_run` / `after_run` wrap the whole turn, unlike agent callbacks which fire per agent.",
    "`on_user_message` runs before any agent, so a guardrail there cannot be bypassed by a transfer.",
    "Plugins are the outer ring: they decide before agent callbacks and observe after them.",
    "Nothing ships in the box — `BasePlugin` and `PluginManager` are the whole module, so write your log plugin early."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "You add a fourth agent to an app that already has a logging plugin. What must you change?",
      options: ["Register the plugin on the new agent", "Nothing", "Add the plugin to the agent's callbacks list", "Re-create the App"],
      answer: 1,
      why: "Plugins are registered on the App and apply to every agent inside it, which the executed trace shows — one registration produced entries for the workflow agent and both of its children. That automatic coverage is the main reason cross-cutting concerns belong in plugins rather than in per-agent callbacks." },
    { stem: "Which hook fires before any agent has run?",
      options: ["before_agent_callback", "before_run_callback and on_user_message_callback", "before_model_callback", "on_event_callback"],
      answer: 1,
      why: "Both wrap the invocation rather than an agent, so they are the only place to put something that must apply no matter which agent ends up handling the turn. `before_agent` fires per agent and would run again after a transfer, which is the wrong shape for a single entry-point check." },
    { stem: "A guardrail plugin returns a refusal in before_model. A logging plugin registered after it also implements before_model. What does the logger see?",
      options: ["The refused call, then the refusal", "Nothing for that call", "Only the refusal", "It raises"],
      answer: 1,
      why: "The first plugin to return a value short-circuits, and later plugins are not consulted — so the logger silently misses those calls. Observability plugins should be listed first, before anything that can refuse, so that what gets blocked is still recorded." },
    { stem: "Where would you count tokens per agent?",
      options: ["after_model_callback in a plugin", "after_agent_callback on each agent", "on_event_callback", "after_run_callback"],
      answer: 0,
      why: "Usage metadata arrives on the model response, so `after_model` is where the number is, and `callback_context.agent_name` attributes it. Doing it in a plugin means one implementation covers every agent, including ones added later — which is exactly the accounting you want when someone asks which specialist is driving the bill." }
  ] },

  interview: { title: "Interview", sub: "Plugin questions", questions: [
    { level: "Core", q: "What is a plugin in ADK, and how does it differ from a callback?",
      strong: "The same hooks registered on the App rather than an agent, so one implementation covers everything — plus six hooks agents do not have.",
      answer: [{ t: "p", text: "A callback belongs to one agent; a plugin belongs to the application and fires for every agent in it, which I have verified by registering one plugin over a pipeline and watching it report the workflow agent, both children, their model calls and the tool call between them. It also gets hooks with no agent equivalent: `before_run` and `after_run` around the whole turn, `on_user_message` before any agent runs, `on_event` for everything emitted, and `close` for shutdown. The rule I use is whether a newly added agent should automatically be covered. Logging, tracing, cost accounting and global guardrails should be; an agent's own refund limit should not." }] },
    { level: "Core", q: "Which runs first, a plugin hook or an agent callback?",
      strong: "The plugin on the way in, the agent callback on the way out — plugins are the outer ring.",
      answer: [{ t: "p", text: "Going in, the plugin's `before_*` is consulted first, and because returning a value short-circuits, a plugin guardrail decides before the agent's own policy is ever asked. Coming out, the agent callback runs first and the plugin sees the result afterwards, which means a plugin timing a call measures the agent callbacks too. The practical consequence is about ordering your own plugins: the first to return a value wins and the rest never fire, so anything observational goes at the front of the list and anything that can refuse goes behind it." }] },
    { level: "Senior", q: "Design the observability layer for a multi-agent system in ADK.",
      strong: "One plugin, spans from before_run, per-agent and per-tool attribution, usage from after_model, and events streamed from on_event.",
      answer: [{ t: "p", text: "One plugin registered on the app, because the thing I care most about is that a new agent is covered without anybody remembering to instrument it. `before_run` opens a span keyed by the invocation id and `after_run` closes it, with `on_run_error` making sure a failed turn still closes and still logs. The agent and tool pairs open child spans, which gives a trace whose shape matches the agent hierarchy — that is what makes a multi-agent trace readable at all, because otherwise you get a flat list of model calls with no indication of who made them. `after_model` records usage metadata attributed by `callback_context.agent_name`, so cost is answerable per specialist rather than per application. `on_event` streams the event log to wherever the audit trail lives, which is also what a live UI consumes. The two details I would insist on: flush in `close`, because a batching exporter loses its last window otherwise, and never let the plugin raise — an observability layer that can take down a turn is worse than no observability layer." }] }
  ] }
});

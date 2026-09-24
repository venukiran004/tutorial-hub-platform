/* ============================================================================
   LESSON 11.1 — Observability
   The Event field list, TelemetryConfig and ContentCapturingMode are
   introspected from google-adk 2.9.2; the plugin hooks are the ones executed
   in lesson 6.2.
   ========================================================================= */
EC.receiveLesson({
  id: "11.1",

  lede: "**You cannot attach a debugger to a decision.** When a user says the agent gave them the wrong answer on Tuesday, there is no stack to inspect and no line to breakpoint — there is only what you recorded at the time. The good news is that ADK records a great deal by default: every event is in the session, every event carries an invocation id, and a plugin sees all of it without touching a single agent. The work is turning that into three things you can actually query: a trace with the right shape, a log line per turn, and numbers you can alert on.",

  objectives: [
    "Say what ADK records for free and what you must add",
    "Use the three ids to correlate a complaint with a trace",
    "Build spans that mirror the agent hierarchy",
    "Capture token usage and cost per agent",
    "Decide what not to log, and configure content capture deliberately"
  ],

  prerequisites: ["6.2", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "What you already have", id: "free" },

    { t: "p", text: "The event log is an audit trail you did not have to build. Every user message, every model response, every tool call and result, every state change is an ordered, persisted record of what the agent did — which is more than most production systems can say about their own decision-making." },

    { t: "code", lang: "python", title: "What an Event carries",
      code: `from google.adk.events import Event
print(list(Event.model_fields))` },

    { t: "out", text: `['model_version', 'content', 'grounding_metadata', 'partial', 'turn_complete', 'finish_reason',
 'error_code', 'error_message', 'interrupted', 'custom_metadata', 'usage_metadata',
 'citation_metadata', 'invocation_id', 'author', 'actions', 'long_running_tool_ids',
 'branch', 'id', 'timestamp', …]` },

    { t: "dl", items: [
      ["`usage_metadata`", "Tokens for that model call. This is your cost data, per event, already there."],
      ["`error_code` / `error_message`", "Set when a model call fails — the numbers behind an alert on failure rate."],
      ["`invocation_id` / `branch`", "Correlation: which turn this belongs to, and which path through a multi-agent system."],
      ["`model_version`", "Which model actually answered. Worth logging, because 'it got worse last Tuesday' is often a model version change."],
      ["`grounding_metadata` / `citation_metadata`", "What a grounded answer was based on (lesson 4.4)."],
      ["`custom_metadata`", "Yours. Put your correlation ids here rather than inventing a parallel store."]
    ] },

    { t: "callout", kind: "insight", title: "Keep the events",
      body: [{ t: "p", text: "The single highest-value observability decision is not adopting a tracing vendor — it is retaining sessions long enough to investigate complaints. A user reporting a bad answer from last week is answerable in thirty seconds if you still have the events and impossible if you do not. Decide retention deliberately, balance it against the privacy obligation in section 06, and write the number down." }] },

    { t: "h2", n: "02", text: "Three ids, three questions", id: "ids" },

    { t: "diagram", kind: "layers", title: "Correlation, from widest to narrowest",
      caption: "Log all three from every callback and tool. Support gives you one of them and you need to reach the others.",
      items: [
        { label: "session_id", sub: "the conversation — \"show me what led up to this\"", tone: "violet" },
        { label: "invocation_id", sub: "one turn, shared by every agent and event in it", tone: "accent" },
        { label: "function_call_id", sub: "one specific tool call, unique among parallel ones", tone: "good" }
      ] },

    { t: "callout", kind: "good", title: "Put the invocation id in front of the user",
      body: [{ t: "p", text: "A small reference at the bottom of an answer — or in the response headers for an API — turns \"the agent said something wrong this morning\" into a single log query. Without it, support hands you a paraphrase and a rough time, and you go looking through a day of conversations. It costs one line and it is the highest-leverage thing in this lesson." }] },

    { t: "h2", n: "03", text: "Tracing", id: "tracing" },

    {"kind": "tree", "title": "Spans that nest like the agents", "caption": "A flat list of model calls cannot answer 'which agent did the expensive thing'. Building the spans in a plugin means a newly added agent appears in the trace without anyone remembering to instrument it.", "root": {"label": "agent.turn", "sub": "before_run → after_run", "tone": "violet", "children": [{"label": "coordinator", "sub": "before_agent", "tone": "accent", "children": [{"label": "model call", "sub": "usage_metadata", "tone": "good"}, {"label": "returns agent", "sub": "after transfer", "tone": "accent", "children": [{"label": "search_docs", "sub": "before_tool", "tone": "warn"}, {"label": "model call", "sub": "usage_metadata", "tone": "good"}]}]}]}, "t": "diagram", "id": "dg-11_1-03-0"},




    { t: "p", text: "A flat list of model calls is nearly useless in a multi-agent system, because the question is always *which agent* did the expensive or wrong thing. Spans that nest the way the agents do make that visible at a glance, and a plugin (lesson 6.2) is the right place to build them because it covers every agent including ones added later." },

    { t: "code", lang: "python", title: "A tracing plugin, in outline",
      code: `class Tracing(BasePlugin):
    def __init__(self):
        super().__init__(name="tracing")
        self._spans = {}

    async def before_run_callback(self, *, invocation_context):
        self._spans[invocation_context.invocation_id] = tracer.start_span(
            "agent.turn",
            attributes={"user.id": invocation_context.user_id,
                        "session.id": invocation_context.session.id,
                        "agent.name": invocation_context.agent.name})

    async def after_model_callback(self, *, callback_context, llm_response):
        usage = getattr(llm_response, "usage_metadata", None)
        if usage:
            meter.record(usage.total_token_count,
                         {"agent": callback_context.agent_name})

    async def after_run_callback(self, *, invocation_context):
        span = self._spans.pop(invocation_context.invocation_id, None)
        if span:
            span.end()

    async def close(self):
        exporter.flush()`,
      caption: "`close` matters: a batching exporter that is never flushed loses its last window, which is usually the window containing the incident." },

    { t: "callout", kind: "trap", title: "An observability layer must not be able to fail the turn",
      body: [{ t: "p", text: "A plugin that raises takes the conversation down with it. Wrap the body of every hook so that a tracing backend being unavailable degrades to no traces rather than to no agent. This sounds obvious and is routinely got wrong, because the hooks are the one place people do not write a try block." }] },

    { t: "h2", n: "04", text: "Cost", id: "cost" },

    { t: "p", text: "`usage_metadata` on the response event gives tokens per model call, and `callback_context.agent_name` says which agent spent them. Those two facts together answer the question every finance conversation about agents eventually reaches: which part of this system is expensive, and why." },

    { t: "table", head: ["Question", "Where it comes from"],
      rows: [
        ["Which agent costs the most?", "Sum `usage_metadata` in `after_model`, grouped by agent name"],
        ["Why did cost jump on Tuesday?", "Tokens per turn over time — usually conversation length (lesson 5.6) or a model version change"],
        ["Which users are expensive?", "Same metric, keyed by user — and often a small number of very long conversations"],
        ["Is the retry loop costing us?", "Model calls per turn; a rising tail means loops (lesson 10.3)"],
        ["Did caching help?", "`cache_metadata` on the event, against cost per turn before and after"]
      ] },

    { t: "h2", n: "05", text: "What to alert on", id: "alerts" },

    {"kind": "matrix", "title": "What each signal tells you", "caption": "Every row is operational. None of them says whether the answers are right — that needs an evaluation set, which is the next lesson.", "cols": ["Warns you of", "Before"], "rows": ["Model calls/turn, p95", "Tool errors by tool", "Blocked guardrail calls", "Stale approvals"], "cells": [[{"text": "loops and retries", "tone": "warn"}, {"text": "the bill does", "tone": "good"}], [{"text": "one degrading upstream", "tone": "warn"}, {"text": "the aggregate moves", "tone": "good"}], [{"text": "someone probing", "tone": "crit"}, {"text": "they find a gap", "tone": "good"}], [{"text": "a stuck conversation", "tone": "warn"}, {"text": "the user gives up", "tone": "good"}]], "t": "diagram", "id": "dg-11_1-05-1"},




    { t: "dl", items: [
      ["Model calls per turn, at the tail", "The 95th percentile rising means loops or retries, and it rises before the bill does."],
      ["Tool error rate, by tool", "One upstream degrading is invisible in an overall success rate and obvious per tool."],
      ["Blocked guardrail calls", "A rate that jumps means somebody is probing (lesson 9.2). A rate that is always zero means the guardrail may not be wired up."],
      ["Turn duration, at the tail", "The average hides everything; the tail is what users complain about."],
      ["Pending approvals older than N minutes", "An approval nobody answers is a stuck conversation (lesson 9.3), and nothing else will tell you."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Answer quality is not on that list",
      body: [{ t: "p", text: "None of these say whether the agent is *right*. Operational metrics tell you the system is running; only evaluation tells you it is working, and the two are routinely confused in a status meeting. An agent can be fast, cheap, error-free and confidently wrong — which is the next lesson." }] },

    { t: "h2", n: "06", text: "What not to capture", id: "privacy" },

    { t: "code", lang: "python", title: "Content capture is a setting, and it has four values",
      code: `from google.adk.telemetry import TelemetryConfig, ContentCapturingMode
print([m.value for m in ContentCapturingMode])` },

    { t: "out", text: "['NO_CONTENT', 'EVENT_ONLY', 'SPAN_ONLY', 'SPAN_AND_EVENT']" },

    { t: "p", text: "Prompts and responses contain whatever your users typed, which for a support agent includes names, addresses, order details and occasionally a card number somebody pasted in. Capturing full content into a tracing backend copies all of it somewhere with different retention and different access control from your session store — which may be exactly what your privacy review has not been told about." },

    { t: "callout", kind: "warn", title: "Decide this with the people who own the obligation",
      body: [{ t: "p", text: "Full content makes debugging enormously easier and is the right default in development. In production it is a decision about personal data, not a debugging preference. `NO_CONTENT` with metadata still gives you the shape of what happened — which agent, which tool, how many tokens, whether it failed — and that answers most operational questions. Reserve content capture for the environments and the retention windows your review actually covers." }] },

    { t: "exercise", kind: "practice", title: "Instrument a multi-agent system", difficulty: "advanced", minutes: 28,
      prompt: "Take a coordinator with two specialists, one of which has tools. Write one plugin that emits a log line per turn with user, invocation, root agent and duration; counts model calls and total tokens per agent; and records tool failures by tool name. Run several turns including one that fails, then answer from your telemetry alone: which agent was most expensive, which tool failed, and how many model calls the worst turn took. Finally, make the plugin raise deliberately and confirm what happens to the conversation.",
      hints: [
        "`callback_context.agent_name` attributes model calls; `tool.name` attributes failures.",
        "Answer the three questions without reading the transcript — that is the test.",
        "The deliberate raise is the important step; fix it with a try block in every hook."
      ],
      solution: {
        notes: [
          { t: "p", text: "Answering the three questions from telemetry alone is the acceptance test for an observability layer, and the usual failure is discovering you logged that something happened but not which agent it happened in. Attribution by agent name is what turns a flat stream of model calls into something you can act on." },
          { t: "p", text: "The deliberate raise fails the turn, which is the point of doing it. An exception in a hook propagates like any other, so a tracing backend timing out takes your agent down — and that is a worse outcome than losing the traces. Every hook body gets a try block that swallows and, at most, logs locally." }
        ]
      } }

  ],

  takeaways: [
    "The event log is an audit trail you get for free — retaining it is the highest-value decision.",
    "`usage_metadata`, `error_code`, `model_version` and `invocation_id` are already on every event.",
    "Log session, invocation and function-call ids everywhere, and show the invocation id to the user.",
    "Build spans in a plugin so they nest like the agents and cover agents added later.",
    "Alert on model calls per turn, tool error rate by tool, blocked calls, tail duration and stale approvals.",
    "An observability hook must never raise, and content capture is a privacy decision with four settings."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Where does per-call token usage come from?",
      options: ["A separate billing API", "`usage_metadata` on the model response event", "The session's state", "You count it yourself from the prompt"],
      answer: 1,
      why: "It is already on the event, so an `after_model` hook that reads it and attributes it with `callback_context.agent_name` gives you cost per agent without any extra infrastructure. That attribution is what answers 'which specialist is expensive'." },
    { stem: "Why build tracing in a plugin rather than in each agent's callbacks?",
      options: ["Plugins are faster", "One registration covers every agent, including ones added later", "Callbacks cannot access spans", "Plugins run on a background thread"],
      answer: 1,
      why: "Per-agent callbacks have to be remembered for every new agent, and nothing fails when somebody forgets — the traces are just silently incomplete. A plugin is registered on the App and applies to everything in it, which is exactly the property an observability layer needs." },
    { stem: "Your tracing backend becomes unavailable and your plugin raises. What happens?",
      options: ["Traces are dropped silently", "The turn fails and the user sees an error", "ADK disables the plugin", "The event is retried"],
      answer: 1,
      why: "A plugin hook raising propagates like any other exception and takes the conversation with it. Losing traces is an inconvenience; losing the agent is an outage, so every hook body needs a try block that degrades to no telemetry." },
    { stem: "Which of these tells you the agent is giving good answers?",
      options: ["Tool error rate", "Tokens per turn", "Turn duration at the 95th percentile", "None of them"],
      answer: 3,
      why: "All three are operational: they say the system is running, fast and affordable. An agent can score perfectly on every one of them while being confidently wrong, which is why evaluation is a separate discipline rather than another dashboard." }
  ] },

  interview: { title: "Interview", sub: "Observability questions", questions: [
    { level: "Core", q: "How do you debug an agent that gave a wrong answer yesterday?",
      strong: "Pull the session by its ids and read the events — the whole decision is recorded.",
      answer: [{ t: "p", text: "There is no stack to inspect, so the investigation is entirely what was recorded, and ADK records the important part by default: every user message, model response, tool call, tool result and state change, in order, with an invocation id tying one turn together. Given a session id I can see exactly what the model was given and what it chose. That is why the two things I insist on are retaining sessions long enough to investigate complaints, and surfacing the invocation id to the user — a reference at the bottom of an answer turns a vague report into one log query." }] },
    { level: "Core", q: "What would you put in a tracing plugin?",
      strong: "A span per turn and per agent and tool, token usage attributed by agent, failures by tool, and a flush on close.",
      answer: [{ t: "p", text: "`before_run` and `after_run` open and close the turn span, with the user, session and root agent as attributes, and `on_run_error` closes it on the failure path so nothing leaks. The agent and tool hooks open child spans, which is what makes a multi-agent trace readable — otherwise you get a flat list of model calls with no indication of who made them. `after_model` records `usage_metadata` keyed by `callback_context.agent_name`, which is my cost-per-specialist metric. `close` flushes, because a batching exporter loses its last window otherwise and that is usually the window you care about. And every hook body has a try block, because a plugin that raises takes down the conversation." }] },
    { level: "Senior", q: "What do you alert on for a production agent?",
      strong: "Tail model calls per turn, tool error rate by tool, blocked guardrail calls, tail latency, stale approvals — and separately, evaluation scores.",
      answer: [{ t: "p", text: "The one people miss is model calls per turn at the tail, because it rises before the bill does and it is the signature of loops and retries — a support agent making thirty calls in a turn is stuck, not thorough. Tool error rate broken down by tool, since a single degrading upstream disappears into an aggregate success rate. Blocked guardrail calls, where both directions are informative: a jump means someone is probing, and a permanent zero often means the guardrail is not actually wired up. Tail latency rather than average, because the average hides exactly the experience users complain about. And stale pending approvals, since a conversation waiting on a human nobody notified is stuck and nothing else in the stack will tell you. What I would be careful to say in the same breath is that none of these measure whether the answers are right. That needs evaluation on a labelled set, run on changes rather than watched on a dashboard, and conflating the two is how a team ends up with green graphs and a bad product." }] }
  ] }
});

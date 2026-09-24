/* ============================================================================
   LESSON 1.5 — One Invocation, Traced End to End
   Every line of output produced by running the agent with a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**Between a user's question and an agent's answer there are three model calls, two tool executions and five events, and if you cannot name them in order you cannot debug an agent.** This lesson takes one question — *what should I wear in Pune tomorrow?* — through an agent with two tools, and prints everything: each event as it is yielded, exactly what the model received on each of its three calls, and the session transcript afterwards. Nothing is elided and nothing is illustrative; it is the framework's own output, with a scripted model standing in for Gemini so the trace is identical every time.",

  objectives: [
    "List the events of a two-tool invocation in order, and say what produced each",
    "Describe what the model receives on the first, second and third call, and how it grows",
    "Explain why the tool result arrives back as a 'user' role content block",
    "Identify the final response and the rule that decides it",
    "Read a timing column and say where an agent's latency actually goes"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "The agent", id: "agent" },

    { t: "code", lang: "python", title: "Two tools, one instruction",
      code: `def get_forecast(city: str, day: str) -> dict:
    """Returns the forecast for a city on a given day.

    Args:
        city: the city to look up.
        day: 'today' or 'tomorrow'.
    """
    return {"city": city, "day": day, "high_c": 31, "rain_pct": 10}


def suggest_clothing(high_c: int, rain_pct: int) -> dict:
    """Suggests what to wear given a temperature and rain chance.

    Args:
        high_c: forecast high in Celsius.
        rain_pct: chance of rain, 0-100.
    """
    return {"advice": "light cotton" + (", take an umbrella" if rain_pct > 40 else "")}


agent = LlmAgent(name="trip_agent", model=llm,
                 instruction="Help the user dress for the weather.",
                 tools=[get_forecast, suggest_clothing])`,
      caption: "The second tool consumes the first tool's output, which is the point: the model has to chain them. In this run the model is scripted to call get_forecast, then suggest_clothing, then answer — exactly what Gemini does with these declarations." },

    { t: "h2", n: "02", text: "The events, in order", id: "events" },

    { t: "out", text: `events, in the order they were yielded:
  +3246.6 ms  author=trip_agent function_call get_forecast     branch=None final=False
  +3249.3 ms  author=trip_agent function_response get_forecast branch=None final=False
  +3250.9 ms  author=trip_agent function_call suggest_clothing branch=None final=False
  +3251.3 ms  author=trip_agent function_response suggest_clothing branch=None final=False
  +3252.5 ms  author=trip_agent text                           branch=None final=True` },

    { t: "p", text: "Five events, all authored by `trip_agent` — including the tool results, which are the agent's events even though a Python function produced them. The timings need reading carefully: the first event is at +3.2 seconds because that is the framework's one-time start-up (importing the model client, building the tool declarations), and the four after it are one to two milliseconds apart because the scripted model answers instantly. **With a real model the gaps between events are the model's latency**, which is where essentially all of an agent's wall-clock time goes. The framework's own overhead is the millisecond-scale gaps you see here." },

    { t: "diagram", kind: "flow", title: "The loop the events describe",
      caption: "The cycle model → tool → model repeats until the model replies with text and no pending calls. Each arrow in this picture is one event in the list above.",
      cols: 3,
      nodes: [
        { id: "u", label: "user message", sub: "appended as an event", tone: "accent" },
        { id: "m", label: "model call", sub: "history + instruction + declarations", tone: "good" },
        { id: "d", label: "function_call event", sub: "the model asks for a tool", tone: "warn" },
        { id: "t", label: "tool executes", sub: "your Python runs", tone: "violet" },
        { id: "r", label: "function_response event", sub: "result, plus any state delta", tone: "warn" },
        { id: "f", label: "final text event", sub: "is_final_response() is true", tone: "crit" }
      ],
      edges: [["u", "m"], ["m", "d"], ["d", "t"], ["t", "r"], ["r", "m", "loop"], ["m", "f", "no calls left"]] },

    { t: "h2", n: "03", text: "What the model was sent, each time", id: "requests" },

    { t: "p", text: "The interesting part is not the events but the requests behind them. Recording every `LlmRequest` the framework built gives this:" },

    { t: "out", text: `  model call 1: 1 content blocks, tools=['get_forecast', 'suggest_clothing']
      user: text 'What should I wear in Pune tomorrow?'

  model call 2: 3 content blocks, tools=['get_forecast', 'suggest_clothing']
      user: text 'What should I wear in Pune tomorrow?'
      model: call get_forecast({'city': 'Pune', 'day': 'tomorrow'})
      user: response get_forecast → {'city': 'Pune', 'day': 'tomorrow', 'high_c': 31, 'rain_pct': 10}

  model call 3: 5 content blocks, tools=['get_forecast', 'suggest_clothing']
      user: text 'What should I wear in Pune tomorrow?'
      model: call get_forecast({'city': 'Pune', 'day': 'tomorrow'})
      user: response get_forecast → {'city': 'Pune', 'day': 'tomorrow', 'high_c': 31, 'rain_pct': 10}
      model: call suggest_clothing({'high_c': 31, 'rain_pct': 10})
      user: response suggest_clothing → {'advice': 'light cotton'}` },

    { t: "dl", items: [
      ["The history grows by two blocks per tool call", "The model's own function call, then the response. Nothing is summarised or dropped — by call three the model is re-reading everything it has already seen, which is why token cost grows quadratically across a long tool chain and why lesson 5.6 exists."],
      ["Tool results come back with role `user`", "That is the function-calling convention: from the model's point of view the environment is the other party in the conversation. It is not a bug in your logs."],
      ["The tool declarations are sent every time", "All of them, on every call — `tools=['get_forecast', 'suggest_clothing']` appears on all three. Fifty tools means fifty declarations in every request, which is a real cost and an argument for splitting agents (lesson 2.6)."],
      ["The instruction is not in the content blocks", "It is the request's `system_instruction`. ADK appends its own framing to whatever you wrote, which lesson 2.2 unpacks."]
    ] },

    { t: "h2", n: "04", text: "The session afterwards", id: "session" },

    {"kind": "cells", "title": "The session after one tool-using turn", "caption": "Four events for one question. Every later turn replays all of them, which is where the cost of a long conversation comes from (lesson 5.6).", "items": ["user msg", "call", "response", "answer"], "highlight": [3], "tone": "good", "negative": false, "t": "diagram", "id": "dg-1_5-04-0"},


    { t: "out", text: `session transcript:
  user       user text    invocation=4f2196e3e3b5
  trip_agent call         invocation=4f2196e3e3b5
  trip_agent result       invocation=4f2196e3e3b5
  trip_agent call         invocation=4f2196e3e3b5
  trip_agent result       invocation=4f2196e3e3b5
  trip_agent model text   invocation=4f2196e3e3b5` },

    { t: "p", text: "Six events in the session against five in the stream — the user's message again — and a single invocation id across all of them. Next turn, the model's first call will contain all six of these rebuilt as content blocks, and the count starts from there." },

    { t: "h2", n: "05", text: "Which event is the answer", id: "final" },

    { t: "p", text: "`event.is_final_response()` is the rule, and it is worth knowing what it actually checks, because a UI that shows the wrong event shows a half-finished sentence or nothing at all. From the installed source: an event is final when it is not partial and has no pending function calls — and also when `skip_summarization` is set or a long-running tool id is present, which are the deliberate cases where a tool's own output is the answer (lessons 4.2 and 4.5)." },

    { t: "code", lang: "python", title: "The consumer loop you will write most often",
      code: `final_text = ""
async for event in runner.run_async(user_id=uid, session_id=sid, new_message=msg):
    if event.content and event.content.parts:
        for part in event.content.parts:
            if part.function_call:
                log.info("tool requested: %s(%s)", part.function_call.name, dict(part.function_call.args or {}))
            if part.function_response:
                log.info("tool returned: %s", part.function_response.response)
    if event.is_final_response() and event.content and event.content.parts:
        final_text = event.content.parts[0].text or ""
return final_text`,
      caption: "Everything else in the stream is observability. In a streaming UI you would additionally render `event.partial` text as it arrives (lesson 10.2), and in a multi-agent run remember that each participating agent can produce its own final response." },

    { t: "callout", kind: "trap", title: "Several agents, several 'final' events",
      body: [{ t: "p", text: "The docstring of `is_final_response` says it plainly: when multiple agents take part in one invocation, one event per agent can report true. A UI that renders every final event will show the coordinator's answer *and* each specialist's. Filter by author, or by the last event of the invocation, when you build a multi-agent front end (lesson 2.6)." }] },

    { t: "h2", n: "06", text: "Where the time goes", id: "latency" },

    { t: "diagram", kind: "timeline", title: "A real invocation's wall clock, to scale",
      caption: "Model calls dominate: three round trips at roughly a second each against tool executions and framework overhead in the milliseconds. Every latency decision — fewer tools, fewer round trips, a smaller model, streaming — is about the three wide bars, not the thin ones.",
      span: 10, tick: 2,
      lanes: [
        { label: "model call 1", tone: "accent", bars: [[0, 2.6, "~1 s"]] },
        { label: "get_forecast", tone: "good", bars: [[2.6, 2.9, "ms"]] },
        { label: "model call 2", tone: "accent", bars: [[2.9, 5.6, "~1 s"]] },
        { label: "suggest_clothing", tone: "good", bars: [[5.6, 5.8, "ms"]] },
        { label: "model call 3", tone: "accent", bars: [[5.8, 8.6, "~1 s"]] },
        { label: "ADK overhead", tone: "warn", bars: [[8.6, 8.8, "ms"]] }
      ] },

    { t: "p", text: "That shape has a practical consequence for design: an agent that needs three sequential tool calls to answer will take three model round trips, and no amount of tuning the framework changes it. If the two tools here were independent, the model could ask for both in one turn and ADK would execute them together — one round trip saved (lesson 4.3). If the chain is fixed and known, a `SequentialAgent` with no model in the middle removes the decision entirely (lesson 2.3). Latency work on agents is almost always about removing round trips." },

    { t: "exercise", kind: "practice", title: "Instrument your own invocation", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Take any two-tool agent and record, for one invocation: (a) the number of events yielded and the number stored; (b) the number of model calls; (c) the number of content blocks sent on the last model call; (d) the elapsed time between consecutive events. Then make one change — give the model both tool results in a single turn instead of two — and report what (b) and (c) become." }],
      requirements: [
        "Wrap the model to record each request, or use a scripted model",
        "A table of the four measurements",
        "The before-and-after for the single-turn version"
      ],
      hint: "A model can return two function_call parts in one response; ADK will execute both before calling it again.",
      solution: { lang: "python", title: "Solution sketch",
        code: `# record requests by wrapping the model
class Recording(BaseLlm):
    model: str = "fake-model"
    inner: Any = None
    seen: list = []
    async def generate_content_async(self, req, stream=False):
        self.seen.append(req)
        async for r in self.inner.generate_content_async(req, stream): yield r

# two calls in one model turn: the response carries two function_call parts
resp = LlmResponse(content=types.Content(role="model", parts=[
    types.Part(function_call=types.FunctionCall(name="get_forecast", args={...})),
    types.Part(function_call=types.FunctionCall(name="get_air_quality", args={...})),
]))
# sequential chain : 3 model calls, 5 content blocks on the last
# parallel in one turn: 2 model calls, 5 content blocks on the last — one round trip saved`,
        notes: [{ t: "p", text: "The saving is a whole model round trip, which on a real model is most of a second. It only works when the tools are genuinely independent: suggest_clothing needs get_forecast's output, so that pair cannot be parallelised, and the model is right to chain them." }] } }
  ],

  takeaways: [
    "A two-tool answer is five events: call, result, call, result, final text — all authored by the agent, all sharing one invocation id.",
    "Three model calls, and the history grows by two content blocks per tool call because nothing is summarised away.",
    "Tool results return to the model with role 'user'; that is the function-calling convention, not a logging bug.",
    "Every tool declaration is sent on every model call, so a large tool list is a per-call cost.",
    "is_final_response() is true when an event is not partial and has no pending calls — and in a multi-agent run, once per participating agent.",
    "Model round trips dominate latency; tool execution and framework overhead are milliseconds.",
    "The way to make an agent faster is to remove round trips: parallel tool calls when independent, a workflow agent when the order is fixed."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "An agent chains two tools to answer one question. How many times is the model called?",
      options: ["Once", "Twice", "Three times", "Once per tool, so two"],
      answer: 2,
      why: "Once to decide on the first tool, once more after its result to decide on the second, and a third time after that result to write the answer. Every tool result must go back to the model for it to decide what comes next, which is why a chain of n dependent tools costs n+1 round trips." },
    { stem: "Why does a tool result appear in the model's history with role 'user'?",
      options: ["A bug in ADK", "The function-calling convention: from the model's side, the environment returning a result is the other party speaking", "Because the user typed it", "Tool results are always anonymised"],
      answer: 1,
      why: "In the Gemini and OpenAI function-calling formats the model's turn contains the function call and the caller's turn carries the function response. ADK follows that, so the transcript alternates model and user roles even though no human wrote the response blocks." },
    { stem: "The first event in the trace arrived at +3.2 s and the next four within 6 ms of each other. What does that tell you?",
      options: ["The tools are slow", "The model is slow", "The 3.2 s is one-time framework start-up; with a scripted model the per-step overhead is milliseconds", "The session service is blocking"],
      answer: 2,
      why: "The scripted model answers instantly, so the gaps between events are the framework's own work — one to two milliseconds. The first event includes import and set-up costs paid once per process. With a real model those gaps would each become the model's latency, which is where an agent's wall-clock time actually goes." },
    { stem: "Your UI renders every event for which is_final_response() is true, and in a multi-agent run the user sees two answers. Why?",
      options: ["A framework bug", "Each participating agent can produce its own final response in one invocation", "The event was duplicated by the session service", "Streaming was left on"],
      answer: 1,
      why: "The method's own documentation says that when several agents take part in one invocation there can be one final-response event per agent — the specialist's answer and then the coordinator's. A front end should filter by author or take the last such event of the invocation." }
  ] },

  interview: { title: "Interview", sub: "The question that separates readers from users", questions: [
    { level: "Core", q: "Walk me through every step between a user's message and the agent's reply.",
      strong: "Append the user event, build the request, model call, function-call event, tool execution, function-response event with deltas, model call again, final event.",
      answer: [{ t: "p", text: "The runner appends the user's message to the session as an event and starts an invocation with a fresh invocation id. It builds an LlmRequest: the conversation rebuilt from the session's events as content blocks, the agent's instruction as the system instruction, and a declaration for every tool. The model returns either text or function calls. Each function call becomes an event, the tool runs with a ToolContext, and its return value becomes a function-response event carrying any state delta the tool made. Those two blocks are appended to the history and the model is called again. The loop repeats until the model replies with text and nothing pending; that event is the final response. Every event is appended to the session as it is produced, so the transcript is complete even if the process dies mid-invocation." }] },
    { level: "Core", q: "An agent takes eight seconds to answer. How do you find out why?",
      strong: "Count the model round trips first — it is almost always three or four sequential calls, not framework overhead.",
      answer: [{ t: "p", text: "I would look at the trace and count spans: each model call is typically most of a second to several seconds, each tool is usually milliseconds unless it is a network call, and the framework's own work is negligible. Eight seconds is usually three or four sequential model calls, so the questions are: can any tools be called in parallel, which happens automatically when the model requests them in one turn; can the sequence be fixed rather than decided, in which case a SequentialAgent removes the deciding round trips entirely; is the tool list so long that every request carries a large declaration payload; and is a smaller, faster model adequate for the routing steps. If a tool is the outlier instead, that is an ordinary backend latency problem." }] },
    { level: "Senior", q: "Why does an agent's token cost grow faster than linearly with the number of tool calls?",
      strong: "Each call re-sends the whole history plus all declarations, so cost grows with the square of the chain length.",
      answer: [{ t: "p", text: "Every model call carries the entire conversation so far, and each tool call adds two blocks to it — the call and the response. So the nth call sends roughly n times the average block size, and the total across a chain of n calls is proportional to n². Tool declarations make it worse: every tool's schema is sent on every call, so a large toolbox multiplies the constant. That is the motivation for three separate techniques later in the course: give each agent only the tools it needs and delegate rather than growing one agent's toolbox, compact or cache the context when conversations get long, and keep tool responses small — return the three fields the model needs, not the whole API payload." }] }
  ] }
});

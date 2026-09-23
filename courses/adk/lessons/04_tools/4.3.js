/* ============================================================================
   LESSON 4.3 — The Agent–Tool Loop, Traced
   The parallel-execution timing was measured: two tools that each sleep
   0.2 s completed in 0.22 s total.
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**User → agent → model → tool selection → tool execution → tool result → model → answer.** That is the loop every tool-using agent runs, and the two facts worth knowing about it are that the model is called once per *round* rather than once per tool, and that tools requested in the same round execute concurrently. This lesson traces the loop with real events, measures the concurrency — two tools that each take 200 ms finishing in 220 ms — and then covers what happens when a tool asks for something the model did not expect: parallel calls, chained calls, a call the framework refuses, and the round that never ends.",

  objectives: [
    "Name each hop of the agent–tool loop and the event that records it",
    "Distinguish a chain of dependent tool calls from a set of independent ones, and count the model calls each costs",
    "Demonstrate that tools requested in one model turn run concurrently",
    "Explain what ends the loop, and what stops it when nothing does",
    "Reduce an agent's latency by removing round trips rather than by tuning the model"
  ],

  prerequisites: ["4.1", "4.2", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The loop", id: "loop" },

    { t: "diagram", kind: "cycle", title: "One round of the agent–tool loop",
      caption: "The cycle repeats until the model answers with text and no pending calls. Each pass costs exactly one model call, however many tools were executed in it.",
      nodes: [
        { label: "model call", sub: "history + instruction + declarations", tone: "accent" },
        { label: "function_call event(s)", sub: "one per requested tool", tone: "warn" },
        { label: "tools execute", sub: "concurrently, if several", tone: "good" },
        { label: "function_response event(s)", sub: "results + state deltas", tone: "warn" }
      ],
      centre: "until text" },

    { t: "p", text: "The loop is run by ADK's LLM flow, not by your code. What your code controls is what goes into it — the declarations, the instruction, the tool implementations — and what comes out: the events you consume." },

    { t: "h2", n: "02", text: "Dependent calls: a chain", id: "chain" },

    { t: "p", text: "When the second tool needs the first tool's output, the model cannot ask for both at once. Lesson 1.5's trace is exactly this shape — `get_forecast`, then `suggest_clothing(high_c=31, rain_pct=10)` using its result — and it cost three model calls for two tools." },

    { t: "diagram", kind: "timeline", title: "A chain of two dependent tools",
      caption: "Three model round trips, two tool executions. The tool time is negligible; the wall clock is the three calls. n dependent tools cost n+1 round trips.",
      span: 10, tick: 2,
      lanes: [
        { label: "model", tone: "accent", bars: [[0, 2.6, "call 1"], [3, 5.6, "call 2"], [6, 8.6, "call 3"]] },
        { label: "get_forecast", tone: "good", bars: [[2.6, 2.9, "ms"]] },
        { label: "suggest_clothing", tone: "good", bars: [[5.6, 5.9, "ms"]] }
      ] },

    { t: "h2", n: "03", text: "Independent calls: one round, run together", id: "parallel" },

    { t: "p", text: "When the tools do not depend on each other, a capable model asks for both in one response — two `function_call` parts in the same message. ADK then executes them **concurrently**. Measured with two tools that each sleep 200 ms:" },

    { t: "code", lang: "python", title: "Two async tools, one model turn",
      code: `async def slow_a(x: int) -> dict:
    """Tool A.

    Args:
        x: a number.
    """
    await asyncio.sleep(0.2)
    return {"a": x}

async def slow_b(x: int) -> dict:
    """Tool B.

    Args:
        x: a number.
    """
    await asyncio.sleep(0.2)
    return {"b": x}

# the model's single response contains two function_call parts` },

    { t: "out", text: `   par   call slow_a  call slow_b                          final=False
   par   resp slow_a {'a': 1}  resp slow_b {'b': 2}       final=False
   par   'both done'                                      final=True

   two 0.2 s tools took 0.22 s total → concurrent
   model calls: 2 (one turn asked for both)` },

    { t: "p", text: "0.22 seconds, not 0.4: they ran together. And the whole answer cost **two** model calls rather than three, because one round handled both tools. Note also that both calls arrived as parts of one event and both results came back in one event — the framework groups them." },

    { t: "callout", kind: "trap", title: "Concurrency only helps if your tools are async",
      body: [{ t: "p", text: "Two `async def` tools awaiting network calls overlap. Two `def` tools that block — `requests.get`, a synchronous database driver, `time.sleep` — do not: they hold the event loop one after the other, and they also stall every other user's turn in the same process for their duration. If a tool does I/O, it should be `async def` with an async client (lesson 10.1)." }] },

    { t: "h2", n: "04", text: "What ends the loop", id: "end" },

    { t: "table", head: ["Ending", "Trigger", "Where"],
      rows: [
        ["The normal one", "The model returns text with no function calls", "`is_final_response()` is true (lesson 1.5)"],
        ["The tool answers directly", "A tool set `actions.skip_summarization`", "The function-response event is final (lesson 4.2)"],
        ["The tool is long-running", "`LongRunningFunctionTool` returns a pending result", "The invocation returns; completion arrives later (lesson 4.5)"],
        ["A human is needed", "`request_confirmation` or `request_credential`", "The invocation pauses and can be resumed (lesson 9.3)"],
        ["Transfer", "`transfer_to_agent`", "Another agent continues the same invocation (lesson 2.5)"],
        ["The safety net", "`RunConfig(max_llm_calls=…)`", "The invocation is stopped after N model calls (lesson 10.3)"],
        ["An exception", "A tool raised and nothing caught it", "The exception propagates out of `run_async` — see 4.7"]
      ] },

    { t: "h2", n: "05", text: "Removing round trips", id: "latency" },

    { t: "p", text: "Everything about agent latency is in the model column of that timeline, so the only real lever is asking the model fewer times." },

    { t: "diagram", kind: "steps", title: "Four ways to remove a round trip",
      caption: "In order of how often they apply. The first two are free; the third is a design change; the fourth is a trade.",
      items: [
        { label: "Make independent tools independent", desc: "if tool B does not need tool A's output, do not make its parameters come from A — the model can then ask for both at once", tone: "accent" },
        { label: "Fix the sequence when it is fixed", desc: "a SequentialAgent runs three steps with no routing calls at all (lesson 2.3)", tone: "good" },
        { label: "Return the answer from the tool", desc: "skip_summarization removes the final summarising call", tone: "warn" },
        { label: "Do more in one tool", desc: "one tool that fetches and filters beats two chained calls — at the cost of a less composable toolbox", tone: "violet" }
      ] },

    { t: "code", lang: "python", title: "The same work, one round instead of two",
      code: `# chained: the model must see the id before it can fetch the detail → 3 model calls
def find_order(query: str) -> dict:     ...     # returns {"order_id": "ORD-1042"}
def order_detail(order_id: str) -> dict: ...    # needs the id from above

# collapsed: one call, one round trip → 2 model calls
def find_order_detail(query: str) -> dict:
    """Finds an order by description and returns its details.

    Args:
        query: what the customer said, e.g. 'my order from Tuesday'.
    """
    order_id = search(query)
    if not order_id:
        return {"status": "not_found"}
    return {"status": "ok", **detail(order_id)}`,
      caption: "Worth doing when the pair is always used together. Not worth doing when the model genuinely needs the intermediate result to decide what comes next — collapsing then removes a decision point the agent needed." },

    { t: "exercise", kind: "practice", title: "Count the round trips", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "For each scenario, say how many model calls the invocation costs and whether any tools run concurrently: (a) the agent answers from memory, no tools; (b) one tool, then an answer; (c) two independent lookups then an answer; (d) three dependent tools then an answer; (e) two independent lookups where one of them is a blocking `def` tool. Then give the wall-clock estimate for (c) and (e) if each model call is 1 s and each tool takes 200 ms." }],
      requirements: ["Five call counts", "Concurrency noted for each", "Two wall-clock estimates"],
      hint: "Count rounds, not tools.",
      solution: { lang: "text", title: "Solution",
        code: `(a) 1 model call.                                   ~1.0 s
(b) 2 model calls, one tool.                        ~2.2 s
(c) 2 model calls, both tools concurrent.           ~2.2 s   (1 + 0.2 + 1)
(d) 4 model calls (n+1 for 3 dependent tools).      ~4.6 s
(e) 2 model calls, but the tools run one after the
    other because one blocks the loop.              ~2.4 s   (1 + 0.4 + 1)`,
        notes: [{ t: "p", text: "The gap between (c) and (e) is only 200 ms here, which understates the problem: the blocking tool also stalls every other request being served by the same process for its whole duration, so under load the cost is paid by users who never called that tool." }] } }
  ],

  takeaways: [
    "The loop is model → function_call events → tool execution → function_response events → model, repeating until text with no pending calls.",
    "One model call per round, not per tool: n dependent tools cost n+1 round trips, independent ones can share a round.",
    "Tools requested in the same model turn execute concurrently — two 200 ms tools measured at 220 ms total.",
    "Concurrency requires async tools; a blocking def tool serialises the round and stalls every other turn in the process.",
    "The loop also ends on skip_summarization, a long-running tool, a confirmation or credential request, a transfer, or the max_llm_calls cap.",
    "Latency is the model column: remove round trips by keeping independent tools independent, fixing known sequences in a workflow agent, answering from the tool, or collapsing an always-paired chain.",
    "Collapsing a chain is wrong when the model needs the intermediate result to decide what to do next."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "An agent calls three tools where each needs the previous one's output. How many model calls?",
      options: ["Three", "Four", "One", "Six"],
      answer: 1,
      why: "n dependent tools cost n+1 round trips: one call to decide the first tool, one after each result to decide what comes next, and a final one to write the answer. Only independent tools can share a round, because the model must see a result before it can use it as an argument." },
    { stem: "Two tools are requested in one model response. What does ADK do?",
      options: ["Runs them one after another", "Runs them concurrently, then sends both results back together", "Runs the first and discards the second", "Raises an error"],
      answer: 1,
      why: "The measured run had two tools that each sleep 200 ms complete in 220 ms total, with both calls in one event and both results in one event. The round trip is shared, which is why designing tools to be independent is a latency decision as well as an API one." },
    { stem: "Your two independent tools are `def` functions using requests.get. What happens?",
      options: ["They still run concurrently", "They run one after another and block the event loop for every other request in the process", "ADK raises an error", "They run in separate processes"],
      answer: 1,
      why: "Concurrency comes from awaiting, and a blocking call never yields. The two tools serialise, and worse, the event loop is held for their combined duration — so other users' turns in the same process wait too. An async def tool with an async client is the fix." },
    { stem: "Which change removes a model round trip without changing what the agent can do?",
      options: ["Lowering the temperature", "Setting skip_summarization on a tool whose output is already the answer", "Adding more tools", "Raising max_output_tokens"],
      answer: 1,
      why: "Normally the tool result goes back to the model for a summarising call. When the tool already produced the deliverable — a table, a file link — skip_summarization makes the function-response event the final response and removes that call entirely, which is most of a second of latency." }
  ] },

  interview: { title: "Interview", sub: "The loop question, asked four ways", questions: [
    { level: "Core", q: "Walk me through what happens between a user's message and a tool executing.",
      strong: "Runner appends the user event, builds a request with history, instruction and declarations, the model returns function calls, ADK emits call events and executes the tools with a ToolContext.",
      answer: [{ t: "p", text: "The runner records the user's message as an event and starts an invocation. It builds an LlmRequest from the session's events, the assembled system instruction, and a generated declaration for every tool the agent has. The model responds; if the response contains function-call parts, each becomes a function_call event. ADK looks each name up in the agent's tool list, injects a ToolContext, and executes them — concurrently if there are several in the same response. Each return value becomes a function_response event carrying any state delta the tool made. Those are appended to the history and the model is called again, and the cycle repeats until it answers with text and nothing pending." }] },
    { level: "Core", q: "Why does an agent with four tools sometimes make five model calls and sometimes two?",
      strong: "Because the count is rounds, not tools: dependent calls chain, independent ones share a round.",
      answer: [{ t: "p", text: "The model is called once per round. If the four tools are independent, a capable model can request all four in one response, they execute concurrently, and the whole thing costs two calls — one to decide, one to answer. If each tool's arguments come from the previous tool's result, the model must see each result before it can request the next, which is five calls for four tools. That is why tool design is a latency decision: a pair of tools where the second takes an id that the first returns will always chain, and merging them into one tool removes a full round trip when they are always used together." }] },
    { level: "Senior", q: "An agent's p95 latency is nine seconds. Where do you start?",
      strong: "Count rounds in the trace; then remove them — parallelisable tools, fixed sequences into workflow agents, skip_summarization, a faster model for routing.",
      answer: [{ t: "p", text: "From the trace, count model spans per invocation and look at their durations: nine seconds is usually four rounds rather than one slow call. Then the question is which rounds are avoidable. Are tools chaining because their signatures force it, when the data could be fetched in one call? Is a coordinator spending a round choosing between specialists in a fixed order, which a SequentialAgent would do for free? Is the final round a model paraphrasing a table it did not need to touch, which skip_summarization removes? Is the router using the same expensive model as the drafter? If, after all that, one model call is genuinely slow, the remaining levers are a smaller model for that step, less context — the history and the tool declarations are the input — and streaming, which does not reduce total time but changes when the user sees the first token." }] }
  ] }
});

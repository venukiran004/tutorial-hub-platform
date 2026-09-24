/* ============================================================================
   LESSON 10.3 — Error Handling, Retries and Resumability
   The on_tool_error conversion, the escaping ConnectionError and the
   max_llm_calls default are executed/introspected from scratchpad/adk/n1.py
   on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "10.3",

  lede: "**An agent has two kinds of failure and they want opposite treatment.** A tool that cannot reach its upstream is *information*: the model should hear about it, tell the user, and perhaps try something else. A bug in your code is a *fault*: it should surface loudly, not be smoothed into a sentence the model relays as though everything were fine. ADK gives you error callbacks that convert the first kind into results the model can work with, and it lets the second kind propagate — and knowing which you are looking at is most of the skill.",

  objectives: [
    "Convert a tool exception into a result the model can act on",
    "Say what happens when you do not, and when that is correct",
    "Retry safely, respecting idempotency and a budget",
    "Use `max_llm_calls` and loop caps to bound a runaway turn",
    "Design what a user sees when something fails"
  ],

  prerequisites: ["6.1", "4.7"],

  blocks: [

    { t: "h2", n: "01", text: "An exception escapes by default", id: "default" },

    { t: "code", lang: "python", title: "n1.py — a tool that raises, with no error callback",
      code: `def flaky(city: str) -> dict:
    """Always fails."""
    raise ConnectionError("upstream timed out")

agent = LlmAgent(name="a", model=llm, tools=[flaky])` },

    { t: "out", text: "    ConnectionError escaped run_async: upstream timed out" },

    { t: "p", text: "The exception came straight out of `run_async` and the turn ended. Your HTTP handler sees it, the user sees whatever your error page says, and the conversation has an incomplete event log. For a genuine bug that is exactly right — you want it in your error tracker, not swallowed. For an upstream that is briefly unavailable it is a poor experience, because the agent could have said so." },

    { t: "h2", n: "02", text: "Converting a failure into a result", id: "converting" },

    { t: "code", lang: "python", title: "on_tool_error_callback",
      code: `def on_tool_error(tool, args, tool_context, error):
    log.warning("tool failed tool=%s invocation=%s error=%s",
                tool.name, tool_context.invocation_id, error)
    return {"error": "the weather service is unavailable", "retryable": True}

agent = LlmAgent(name="a", model=llm, tools=[flaky],
                 on_tool_error_callback=on_tool_error)` },

    { t: "out", text: `    on_tool_error fired: ConnectionError: upstream timed out
    tool response event: {'error': 'the weather service is unavailable', 'retryable': True}
    says: Sorry, that service is down.
    on_tool_error calls: 1` },

    { t: "p", text: "The exception became an ordinary function response, the model read it, and the user got a sentence instead of a stack trace. Three details are worth copying: the log line preserves the *real* error with the invocation id, the message given to the model is generic rather than exposing internals, and `retryable` tells the model whether trying again is sensible." },

    { t: "callout", kind: "trap", title: "Never put the exception text in the result",
      body: [{ t: "p", text: "`return {\"error\": str(error)}` is the reflex, and it hands the model — and therefore the user, and therefore anyone who asks — your hostnames, table names, file paths and occasionally a connection string. Log the real thing with the invocation id so you can find it, and give the model a description of what went wrong in terms the user could hear." }] },

    { t: "h2", n: "03", text: "Which failures get which treatment", id: "which" },

    {"kind": "flow", "title": "Convert it, or let it fly?", "caption": "The test is whether the agent could sensibly do anything about it. Converting everything makes your own bugs look like flaky dependencies, and nothing reaches your error tracker.", "cols": 3, "nodes": [{"id": "e", "label": "A tool raised", "sub": "in on_tool_error", "tone": "accent"}, {"id": "q", "label": "Could the agent act on it?", "sub": "timeout, 404, rate limit, denied", "tone": "warn"}, {"id": "c", "label": "Return a dict", "sub": "generic text + retryable", "tone": "good"}, {"id": "p", "label": "Return None", "sub": "report, then let it propagate", "tone": "crit"}], "edges": [["e", "q"], ["q", "c", "yes"], ["q", "p", "no — it is a bug"]], "t": "diagram", "id": "dg-10_3-03-0"},




    { t: "diagram", kind: "compare", title: "Information, or fault?",
      caption: "The test: could the agent sensibly do something about it? If yes, it is information. If the only sensible response is a human fixing code, it is a fault.",
      columns: [
        { title: "Information — convert it", tone: "good", items: ["Upstream timeout or 503", "Not found", "Rate limited", "Invalid argument the model chose", "Permission denied for this user"] },
        { title: "Fault — let it propagate", tone: "crit", items: ["TypeError in your tool", "A missing config value at startup", "A serialisation bug", "Anything you would page someone for"] }
      ] },

    { t: "callout", kind: "warn", title: "A catch-all callback hides your bugs",
      body: [{ t: "p", text: "An `on_tool_error` that converts every exception into \"something went wrong\" makes a `KeyError` in your own code look exactly like a flaky upstream: the agent apologises politely, the user retries, and nothing reaches your error tracker. Catch the exception types you expect to see from the outside world, and let the rest through. If you must have a catch-all, report it to your tracker inside the callback so it is at worst hidden from the user, not from you." }] },

    { t: "h2", n: "04", text: "Retrying", id: "retrying" },

    {"kind": "steps", "title": "Retry where the failure is", "caption": "Three attempts inside one tool call cost zero extra model calls and keep the transcript clean. Returning retryable: True three times costs three model round trips and fills the log with failures the user never needed to see.", "items": [{"label": "Attempt 1", "sub": "timeout", "tone": "crit"}, {"label": "sleep 0.2s", "sub": "backoff"}, {"label": "Attempt 2", "sub": "timeout", "tone": "crit"}, {"label": "sleep 0.4s", "sub": "backoff"}, {"label": "Attempt 3", "sub": "succeeds — the model never saw the failures", "tone": "good"}], "t": "diagram", "id": "dg-10_3-04-1"},




    { t: "code", lang: "python", title: "Retry inside the tool, not in the loop",
      code: `async def fetch_rate(pair: str) -> dict:
    """Fetches an FX rate."""
    for attempt in range(3):
        try:
            return await client.get_rate(pair)
        except (httpx.TimeoutException, httpx.ConnectError):
            if attempt == 2:
                return {"error": "the rate service is unavailable", "retryable": False}
            await asyncio.sleep(0.2 * 2 ** attempt)     # 0.2s, 0.4s`,
      caption: "Three attempts with backoff, inside one tool call. The model never sees the transient failures, and the final result tells it not to try again." },

    { t: "p", text: "Retrying inside the tool is almost always better than letting the model retry. It is faster — no extra model round trip per attempt — it is bounded by a loop you control rather than by the model's persistence, and it keeps the transcript clean. Model-level retry is what happens when you return `retryable: True`, and it should be reserved for cases where trying *differently* might help, such as a rephrased query (lesson 7.2)." },

    { t: "callout", kind: "trap", title: "Only retry what is safe to repeat",
      body: [{ t: "p", text: "A timeout does not tell you whether the request arrived. Retrying a read is free; retrying \"charge this card\" may charge it twice, and retrying \"send this email\" sends two. Either make the operation idempotent — an idempotency key the upstream honours — or do not retry it automatically. This is ordinary distributed-systems discipline, and it matters more here because the thing deciding to retry may be a language model." }] },

    { t: "h2", n: "05", text: "Bounding a runaway turn", id: "bounding" },

    { t: "code", lang: "python", title: "The guard you already have",
      code: `from google.adk.agents.run_config import RunConfig
print(RunConfig().max_llm_calls)`,
      caption: "Also settable per run, or globally with the `ADK_MAX_LLM_CALLS` environment variable." },

    { t: "out", text: "500" },

    { t: "p", text: "Five hundred model calls in one turn is a backstop, not a budget — it exists so a pathological loop terminates eventually, and by the time you reach it you have spent a great deal of money on one question. Set it to something that reflects a plausible turn for your agent: a support agent that has made thirty model calls is not working, it is stuck." },

    { t: "table", head: ["Runaway", "Bound it with"],
      rows: [
        ["Tool-call loop — the model calls the same tool repeatedly", "A lower `max_llm_calls`, plus `retryable: False` on results that will not change"],
        ["Refine-and-check loop", "`max_iterations` on the `LoopAgent` (lesson 2.3)"],
        ["Transfer ping-pong between agents", "Clear agent descriptions, and a `before_agent_callback` counting transfers (lesson 2.5)"],
        ["An agent retrying a failing tool forever", "`retryable: False`, and a counter in `before_tool` per invocation"],
        ["A slow upstream holding the turn open", "Timeouts in the tool's HTTP client — not just in the framework"]
      ] },

    { t: "h2", n: "06", text: "What the user sees", id: "user" },

    { t: "dl", items: [
      ["Say what failed and what to do", "\"I couldn't reach the shipping system just now — shall I try again, or would you like the order details instead?\" beats \"An error occurred.\""],
      ["Never claim success you did not have", "If a refund tool failed, the answer must not say the refund was issued. This is what makes converting errors into results a correctness issue, not just a UX one."],
      ["Keep the conversation alive", "A failure that ends the session throws away context the user will have to re-establish. A failure that becomes a result lets them carry on."],
      ["Correlate", "Put the invocation id where support can see it. \"Can you give me the reference at the bottom of the message\" turns an unreproducible complaint into a log lookup."]
    ] },

    { t: "callout", kind: "good", title: "Resumability, when work outlives the turn",
      body: [{ t: "p", text: "`App` takes a `resumability_config`, and lesson 9.3 showed the mechanism it enables: a paused tool call recorded as an event, resumed later by a function response. That is the right shape for anything that can fail and be picked up — approvals, long jobs, a step that needed a credential. The insight is the same as for sessions: state in an event survives a restart, and state in a coroutine does not." }] },

    { t: "exercise", kind: "practice", title: "Make a failing agent behave well", difficulty: "advanced", minutes: 28,
      prompt: "Build an agent with three tools: one that raises ConnectionError, one that raises KeyError (a bug), and one that works. Run it with no error callback and record what the user experiences for each. Add an on_tool_error_callback that converts only connection errors and re-raises the rest, and compare. Then add in-tool retry with backoff to the flaky tool, make it succeed on the third attempt, and confirm the model never sees the failures. Finally, set max_llm_calls to 5 and write a scripted model that loops, to see the bound fire.",
      hints: [
        "Re-raise from the callback by not returning a value for types you do not handle.",
        "Count model calls to prove the in-tool retry costs none.",
        "The KeyError should still reach your error tracker — check it does."
      ],
      solution: {
        code: `def on_tool_error(tool, args, tool_context, error):
    if isinstance(error, (ConnectionError, TimeoutError)):
        log.warning("tool=%s invocation=%s transient=%s",
                    tool.name, tool_context.invocation_id, error)
        return {"error": f"{tool.name} is temporarily unavailable", "retryable": True}
    # Anything else is our bug: report it and let it propagate.
    report_to_tracker(error, invocation_id=tool_context.invocation_id)
    return None`,
        notes: [
          { t: "p", text: "Returning `None` for unexpected types is what lets the fault through, which is the whole design of the callback: a value replaces the failure, nothing continues it. Reporting to the tracker before returning None means you find out about the bug even in the case where something further up decides to swallow it." },
          { t: "p", text: "The in-tool retry is the part that changes the numbers. Three attempts inside one tool call cost zero extra model calls, while returning `retryable: True` three times costs three model round trips and fills the transcript with failures the user does not need to know about. Retry where the failure is, and tell the model only about the outcome." }
        ]
      } }

  ],

  takeaways: [
    "An unhandled tool exception escapes `run_async` and ends the turn — right for bugs, wrong for upstream failures.",
    "`on_tool_error_callback` converts a failure into a function response the model can relay.",
    "Log the real error with the invocation id; give the model a generic description, never the exception text.",
    "Convert the failures an agent could act on; let faults propagate so they reach your error tracker.",
    "Retry inside the tool with backoff — it costs no model calls — and only for operations safe to repeat.",
    "`max_llm_calls` defaults to 500: a backstop, not a budget. Set it to a plausible turn for your agent."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool raises and there is no error callback. What happens?",
      options: ["The model receives an error result", "The exception propagates out of run_async and the turn ends", "The tool is retried automatically", "The event is marked failed and the turn continues"],
      answer: 1,
      why: "The executed run shows `ConnectionError escaped run_async`. Nothing converts it, so your handler sees the exception and the conversation has an incomplete event log — which is correct for a genuine bug and a poor experience for an upstream that is briefly down." },
    { stem: "Why should the error message returned to the model be generic?",
      options: ["Models cannot parse exception text", "It reaches the user and can leak hostnames, paths and internals", "It would be too long", "Exceptions are not serialisable"],
      answer: 1,
      why: "The model relays what it is given, so `str(error)` becomes something the user reads and anyone can ask for. Log the real exception with the invocation id so you can find it, and hand the model a description in terms the user could hear." },
    { stem: "Your flaky upstream succeeds on the third attempt. Where should the retry live?",
      options: ["In the tool, with backoff", "In the model, by returning retryable: True", "In a before_tool callback", "In the HTTP client only"],
      answer: 0,
      why: "In-tool retry costs no extra model calls, is bounded by a loop you control rather than by the model's persistence, and keeps transient failures out of the transcript. Model-level retry is for cases where trying *differently* might help, such as rephrasing a retrieval query." },
    { stem: "Which failure should NOT be converted into a friendly result?",
      options: ["A 503 from an upstream API", "A rate limit", "A TypeError in your own tool code", "A record not found"],
      answer: 2,
      why: "That is a bug, and converting it makes it indistinguishable from a flaky dependency: the agent apologises, the user retries, and nothing reaches your error tracker. Catch the exception types you expect from the outside world and let your own faults surface." }
  ] },

  interview: { title: "Interview", sub: "Failure questions", questions: [
    { level: "Core", q: "What happens when a tool raises in ADK?",
      strong: "It propagates out of run_async and ends the turn, unless an on_tool_error_callback converts it into a result.",
      answer: [{ t: "p", text: "By default the exception escapes — I have watched a `ConnectionError` come straight out of `run_async` — so the handler sees it and the conversation is left with an incomplete log. With an `on_tool_error_callback` you return a dictionary and it becomes an ordinary function response: the model reads it, tells the user, and the conversation continues. The decision I make per exception type is whether the agent could sensibly do anything about it. An upstream timeout is information the model should have. A `TypeError` in my own code is a fault that should reach my error tracker rather than being smoothed into an apology." }] },
    { level: "Core", q: "How do you stop an agent looping forever on a failing tool?",
      strong: "Return retryable: False, bound the loop, and set max_llm_calls to something plausible.",
      answer: [{ t: "p", text: "Three layers. The result tells the model not to try again — a structured error with `retryable: False` — which handles the cooperative case. A counter in `before_tool` keyed by the invocation catches a model that ignores it. And `max_llm_calls`, which defaults to 500, is the backstop; I lower it, because a support agent that has made thirty model calls in one turn is stuck rather than working, and 500 is a great deal of money to spend discovering that. Separately, for refine-and-check loops it is `max_iterations` on the loop agent, and the cap should be small." }] },
    { level: "Senior", q: "Design the failure behaviour for a customer-facing agent with three flaky upstreams.",
      strong: "Retry in the tool for transients, convert what remains into results, let faults propagate, bound the turn, and never claim success you did not have.",
      answer: [{ t: "p", text: "Inside each tool: a timeout on the HTTP client, two or three retries with backoff for the transient exception types, and an idempotency key for anything that writes, because a timeout does not tell me whether the request arrived and retrying a charge twice is worse than failing it once. What survives that becomes a structured result — generic wording for the model, the real exception and the invocation id in the log — with `retryable` set honestly so the model does not hammer a dead service. My own exception types are not converted; they go to the tracker and propagate, because an agent that apologises for my `KeyError` means I never hear about it. Around the turn, a lowered `max_llm_calls` and a per-invocation call counter. And the requirement I would write into the acceptance criteria is the one people forget: the agent must never report success for a tool call that failed. That is not a UX nicety — a user told their refund was processed when it was not is a support case and possibly a compliance one, and it is exactly what happens when a failure is converted into a vague result and the model fills in the optimistic reading." }] }
  ] }
});

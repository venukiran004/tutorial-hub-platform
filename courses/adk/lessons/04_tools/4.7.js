/* ============================================================================
   LESSON 4.7 — Tool Errors, Retries and Restrictions
   The raising-tool and error-as-data behaviours were both executed; the
   retry plugins are listed from google.adk.plugins on 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "**An exception in a tool ends the invocation.** Not the tool call — the whole run: the `ValueError` your tool raised propagates out through `run_async` and reaches your web handler, with the user's turn unanswered. That is the correct default for a bug, and the wrong behaviour for an upstream service returning a 500, which the agent could have handled by saying so. This lesson runs both cases side by side, covers the error callbacks and the retry plugins, and sets out the rule for when a tool should raise, when it should return an error, and what the agent should be allowed to do about it.",

  objectives: [
    "Predict what happens when a tool raises, and contrast it with returning an error",
    "Design a tool's error contract: raise, return, or retry internally",
    "Use on_tool_error_callback and the reflect-and-retry plugins",
    "Bound an agent's retrying with max_llm_calls and timeouts",
    "Restrict which tools an agent may use, and when"
  ],

  prerequisites: ["4.2", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Raising", id: "raising" },

    { t: "code", lang: "python", title: "A tool that raises",
      code: `def breaks(x: int) -> dict:
    """Always fails.

    Args:
        x: ignored.
    """
    raise ValueError("upstream returned 500")` },

    { t: "out", text: `   invocation raised: ValueError upstream returned 500` },

    { t: "p", text: "No events after the call, no final response, and the exception came out of the async generator. Whatever is iterating `run_async` — your FastAPI handler, the dev UI, a worker — has to deal with it, and the user's turn produced nothing. The session still contains the events that were appended before the failure, so the conversation is recoverable, but the turn is not." },

    { t: "h2", n: "02", text: "Returning the error instead", id: "returning" },

    { t: "code", lang: "python", title: "The same failure, as data",
      code: `def careful(x: int) -> dict:
    """Returns a structured error instead of raising.

    Args:
        x: ignored.
    """
    return {"status": "error", "error": "upstream returned 500", "retryable": True}` },

    { t: "out", text: `   ok   call careful                                                  final=False
   ok   resp careful {'status': 'error', 'error': 'upstream returne…  final=False
   ok   'The service is down; try later.'                            final=True` },

    { t: "p", text: "The model saw the error, understood it and told the user something true. The invocation completed. This is the shape almost every tool that talks to the outside world should have — **the model is a competent error handler when you give it something to handle**, and a useless one when the process dies." },

    { t: "diagram", kind: "compare", title: "Raise, or return",
      caption: "The test is whether the agent could do anything useful with the information. A 404 is information; a TypeError from your own code is a bug and should be loud.",
      columns: [
        { title: "Return an error dict", tone: "good", items: ["upstream 4xx/5xx", "not found", "invalid argument the model can fix", "rate limited", "permission denied for this user"] },
        { title: "Let it raise", tone: "crit", items: ["a bug in your tool", "a misconfiguration — no credentials at all", "data corruption", "anything where continuing would be wrong"] }
      ] },

    { t: "code", lang: "python", title: "The error contract worth copying",
      code: `def fetch_invoice(invoice_id: str) -> dict:
    """Fetches an invoice by id.

    Args:
        invoice_id: the invoice, e.g. 'INV-88'.
    """
    try:
        r = httpx.get(f"{API}/invoices/{invoice_id}", timeout=5.0)
    except httpx.TimeoutException:
        return {"status": "error", "error": "the billing service did not respond in 5s",
                "retryable": True}
    if r.status_code == 404:
        return {"status": "not_found", "invoice_id": invoice_id}      # not an error: a fact
    if r.status_code == 403:
        return {"status": "error", "error": "you do not have access to this invoice",
                "retryable": False}                                    # the model must not retry
    r.raise_for_status()                                               # 500s and the unexpected: raise
    return {"status": "ok", **summarise(r.json())}`,
      caption: "Three signals the model can act on: `status`, a human-readable `error`, and `retryable` so it does not loop on a permission failure. Note that 404 is `not_found` rather than an error — the agent should say the invoice does not exist, not that something went wrong." },

    { t: "h2", n: "03", text: "The error callbacks", id: "callbacks" },

    { t: "code", lang: "python", title: "Two hooks specifically for failure",
      code: `def on_tool_error(tool, args, ctx, error: Exception):
    """Runs when a tool raises. Returning a dict replaces the tool's result."""
    log.exception("tool %s failed: args=%s invocation=%s", tool.name, args, ctx.invocation_id)
    return {"status": "error", "error": "that lookup failed", "retryable": True}

agent = LlmAgent(name="a", model=M, tools=[flaky],
                 on_tool_error_callback=on_tool_error,       # tools
                 on_model_error_callback=on_model_error)     # model calls`,
      caption: "`on_tool_error_callback` turns a raising tool into a returning one at the agent level, which is the right place for a blanket policy — log the exception with its context, hand the model something it can say. `on_model_error_callback` does the same for provider failures (lesson 6.1)." },

    { t: "h2", n: "04", text: "Retries", id: "retries" },

    { t: "diagram", kind: "layers", title: "Four places a retry can live",
      caption: "Pick one deliberately. Retries at several layers multiply: three model retries over three tool retries over three HTTP retries is twenty-seven attempts and a very surprised upstream.",
      items: [
        { label: "Inside the tool", sub: "httpx retries on connect errors — cheapest, invisible to the model", tone: "good" },
        { label: "on_tool_error_callback", sub: "one place for a policy across all this agent's tools", tone: "accent" },
        { label: "A plugin", sub: "ReflectAndRetryToolPlugin / ReflectAndRetryModelPlugin — app-wide", tone: "warn" },
        { label: "The model", sub: "it sees retryable:true and calls again — costs a full round trip", tone: "violet" }
      ] },

    { t: "code", lang: "python", title: "The retry plugins ADK ships",
      code: `from google.adk.plugins import ReflectAndRetryToolPlugin, ReflectAndRetryModelPlugin
from google.adk.apps import App

app = App(name="support", root_agent=root,
          plugins=[ReflectAndRetryToolPlugin(), ReflectAndRetryModelPlugin()])`,
      caption: "Plugins apply to every agent and tool in the app (lesson 6.2). 'Reflect and retry' means the failure is fed back so the next attempt is informed rather than identical — which is what makes a second attempt worth anything when the first failed on a bad argument." },

    { t: "callout", kind: "trap", title: "Bound the retrying, or the model will not",
      body: [{ t: "p", text: "A model that receives `retryable: true` will try again, and again. `RunConfig(max_llm_calls=…)` is the hard stop on an invocation; per-agent `timeout` and `retry_config` bound the parts; and a tool that has already failed twice in this invocation should return `retryable: false` on the third. Without a bound, a flaky upstream becomes an expensive infinite loop (lesson 10.3)." }] },

    { t: "h2", n: "05", text: "Restricting tools", id: "restrictions" },

    { t: "table", head: ["Restriction", "How", "When"],
      rows: [
        ["Do not give the agent the tool", "Construct a different agent per role or per user tier", "The strongest control — nothing can call what is not there"],
        ["Filter a toolset", "`tool_filter=[...]` or a predicate, resolved per request", "Toolsets that expose more than the agent should have (lesson 4.6)"],
        ["Block at call time", "`before_tool_callback` returns a dict instead of running the tool", "Per-argument rules: this user, this amount, this table (lesson 6.1)"],
        ["Require a human", "`require_confirmation`", "The action is legitimate but consequential (lesson 4.5)"],
        ["Ask the model nicely", "An instruction", "**Not a control.** It is a preference the model may ignore"]
      ] },

    { t: "code", lang: "python", title: "Blocking a call with a reason the model can use",
      code: `def before_tool(tool, args, ctx):
    """Return a dict to skip the tool and give the model that dict as the result."""
    if tool.name == "issue_refund" and ctx.state.get("user:role") != "agent":
        return {"status": "error", "error": "refunds require an agent account",
                "retryable": False}
    return None          # None means: carry on and run the tool`,
      caption: "The model is told why, in terms it can relay to the user, and `retryable: false` stops it trying the same thing again. Compare with raising, which would end the turn and tell the user nothing." },

    { t: "exercise", kind: "practice", title: "Write the error contract", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Take a tool that calls an HTTP API and give it a complete error contract covering: a timeout, a 404, a 403, a 429 with a Retry-After header, a 500, and a malformed response body. For each, say whether it raises or returns, and what the model should say to the user. Then state where you would bound the total number of attempts." }],
      requirements: ["Six cases, each with raise-or-return and the intended user-facing outcome", "The retryable flag set correctly for each", "The bound, named"],
      hint: "Two of the six should raise.",
      solution: { lang: "text", title: "Solution",
        code: `timeout        → return {"status":"error","error":"service did not respond","retryable":true}
                 user hears: "that is taking too long, shall I try again?"
404            → return {"status":"not_found", …}                  retryable irrelevant
                 user hears: "I could not find invoice INV-88."
403            → return {"status":"error", …, "retryable":false}
                 user hears: "you do not have access to that invoice."
429            → return {"status":"error","error":"rate limited, retry after 30s",
                          "retryable":true,"retry_after_s":30}
                 user hears: "the service is busy; I will try again shortly."
500            → return once with retryable:true; if it fails again in this invocation,
                 return retryable:false so the model stops.
malformed body → RAISE. Your parsing assumption is wrong; that is a bug, and a wrong
                 answer built on a misparsed body is worse than a failed turn.
(also raise)   → missing credentials entirely: a misconfiguration, not a runtime condition.

Bound: RunConfig(max_llm_calls=…) on the invocation, plus a per-invocation attempt
counter in temp: state that flips retryable to false after the second failure.`,
        notes: [{ t: "p", text: "The malformed-body case is the one people get wrong. Returning 'something went wrong' hides a bug that will keep producing subtly wrong answers; raising makes it visible in your error tracking on the first occurrence, which is where you want it." }] } }
  ],

  takeaways: [
    "A raising tool ends the invocation: the exception propagates out of run_async and the user's turn produces nothing.",
    "Returning {'status': 'error', …} lets the model explain the failure and complete the turn — the right shape for anything the outside world can do to you.",
    "Raise for bugs, misconfiguration and corrupted data; return for 4xx, 5xx, timeouts, not-found and permission failures.",
    "Include a retryable flag so the model does not loop on a permission error, and use not_found rather than error when absence is a fact.",
    "on_tool_error_callback converts a raising tool into a returning one at the agent level; on_model_error_callback does the same for provider errors.",
    "Retries can live in the tool, in the error callback, in a reflect-and-retry plugin or in the model — pick one layer, because they multiply.",
    "Restrict tools by not granting them, by filtering a toolset, by blocking in before_tool_callback, or by requiring confirmation; an instruction is not a control."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool raises ValueError during an invocation. What does the user see?",
      options: ["An apology from the agent", "Nothing from the agent — the exception propagates out of run_async and the turn is unanswered", "The tool is retried automatically", "The agent transfers to another agent"],
      answer: 1,
      why: "The executed case showed the exception coming out of the async generator with no further events. The caller must handle it, and the turn produced no answer. That is correct for a genuine bug and wrong for an upstream error the agent could have described." },
    { stem: "Which failure should a tool return rather than raise?",
      options: ["A TypeError in your own code", "The upstream API returned 503", "The response body could not be parsed at all", "No credentials are configured"],
      answer: 1,
      why: "A 503 is information the agent can act on: it can tell the user the service is unavailable and offer to retry. The other three indicate that your assumptions are wrong, and hiding them behind a polite message produces subtly incorrect behaviour that never gets fixed." },
    { stem: "Why include a retryable flag in a tool's error result?",
      options: ["ADK requires it", "So the model does not loop on failures that cannot succeed, such as a permission denial", "It enables automatic retries", "It is used for logging only"],
      answer: 1,
      why: "The model decides what to do next from what the tool returned. Told only that something failed, it will often try again — which is right for a timeout and pointless for a 403. The flag is what lets the same model handle both correctly, and it should flip to false once an invocation has already retried." },
    { stem: "Where should a rule like 'only agents may issue refunds' be enforced?",
      options: ["In the instruction", "In a before_tool_callback that returns an error dict instead of running the tool, or by not giving that agent the tool", "In the tool's docstring", "In the model's temperature"],
      answer: 1,
      why: "Instructions are preferences a model can be talked out of. A before_tool_callback runs regardless of what the model decided and can refuse with a reason the model relays to the user; not granting the tool at all is stronger still, because nothing can call what is not there." }
  ] },

  interview: { title: "Interview", sub: "Failure-handling questions", questions: [
    { level: "Core", q: "What happens when an ADK tool raises, and what should it do instead?",
      strong: "The exception ends the invocation; for expected upstream failures, return a structured error so the model can explain it.",
      answer: [{ t: "p", text: "The exception propagates out of run_async: no further events, no final response, and the caller has to handle it — so the user's turn is simply lost. That is the right outcome for a bug, because it surfaces in error tracking immediately. For anything the outside world can do to you — a timeout, a 404, a 403, a 500 — the better shape is to return a dict with a status, a human-readable message and a retryable flag. The model reads it and tells the user something true, and the invocation completes. If I want that behaviour across an agent's whole toolbox without editing every tool, on_tool_error_callback converts raising into returning in one place." }] },
    { level: "Core", q: "How do you stop an agent from using a tool it should not use?",
      strong: "Do not give it the tool, filter the toolset, or block the call in before_tool_callback - an instruction is not a control.",
      answer: [{ t: "p", text: "In order of strength: construct the agent without the tool, so nothing can call what is not there - which is why role-specific sub-agents are a security design and not only an architectural one. Next, filter a toolset, which resolves per request and can therefore depend on who is asking. Next, block at call time in a before_tool_callback, which sees whatever the model decided and can refuse with a reason the model relays back, plus a retryable flag so it does not simply try again. Requiring human confirmation is the right answer when an action is legitimate but consequential rather than forbidden. What is never a control is telling the model in the instruction, because a sufficiently persuasive message can talk it out of a preference." }] },
    { level: "Senior", q: "An agent hammers a flaky upstream service during incidents. How do you stop it?",
      strong: "Bound retries at one layer, flip retryable to false after the first failure in an invocation, cap model calls, and shed load with a circuit breaker in the tool.",
      answer: [{ t: "p", text: "The usual cause is retries at several layers multiplying — the HTTP client retries, the tool retries, the model retries because it saw retryable true, and a plugin retries on top. I would pick one layer and remove the others: transport-level retries for connect errors only, and an explicit policy in the tool or the error callback for everything else. The tool should count attempts for this invocation in temp: state and return retryable false after the second, so the model stops. RunConfig's max_llm_calls caps the invocation as a backstop. And during an actual incident the right behaviour is not to retry at all: a circuit breaker in the tool that returns 'the service is down' immediately protects both the upstream and your own latency, and gives the agent something honest to say." }] }
  ] }
});

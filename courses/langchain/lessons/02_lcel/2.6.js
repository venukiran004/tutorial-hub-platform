EC.receiveLesson({
  id: "2.6",
  lede: "`with_retry` and `with_fallbacks` are two methods on every Runnable, and the order you compose them in changes the behaviour completely while reading almost identically in a diff. Measured on a primary that always fails: **retry inside fallback made 3 attempts at the primary then fell over once. Fallback inside retry made 1 attempt and gave up.** The second is almost never what you want, because the fallback succeeds, so the retry has nothing to retry. The rule that falls out is simple \u2014 **put the retry closest to the thing that is flaky** \u2014 and the other half of the lesson is what not to retry at all, because a blanket retry on a 400 is three times the latency for the same failure.",
  objectives: [
    "Apply with_retry and with_fallbacks to any Runnable",
    "Predict the behaviour of the two nesting orders and say which you want",
    "Explain why fallback-inside-retry gives up on the primary immediately",
    "Classify failures into transient and permanent",
    "Scope a retry with retry_if_exception_type"
  ],
  prerequisites: ["2.5"],
  blocks: [
    { t: "h2", n: "01", id: "two", text: "Two methods", sub: "On every Runnable, not just models" },
    { t: "code", lang: "python", title: "Retry a flaky step",
      code: 'r = RunnableLambda(flaky).with_retry(stop_after_attempt=4)\nr.invoke("x")',
      out: "result   : ok on attempt 3\nattempts : 3",
      caption: "Failed twice, succeeded on the third attempt, returned normally." },
    { t: "code", lang: "python", title: "Fall back to something else",
      code: 'primary.with_fallbacks([secondary]).invoke("x")',
      out: "answered by the backup",
      caption: "The primary raised; the fallback ran with the same input." },
    { t: "p", text: "Both are defined on `Runnable`, so they apply to a model, a parser, a retriever, a lambda or a whole chain \u2014 2.1's closure property doing concrete work. That freedom is also what makes the ordering question real, because you get to choose what each one wraps." },
    { t: "h2", n: "02", id: "order", text: "The order, measured", sub: "Same two operations, very different behaviour" },
    { t: "viz", title: "Retry inside fallback, and the reverse",
      caption: "Measured against a primary that always fails: 3 primary attempts against 1.",
      svg: '<svg viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two nesting orders of retry and fallback">' +
        '<text x="12" y="18" class="s-label">primary.with_retry().with_fallbacks([backup])   \u2014 retry INSIDE fallback</text>' +
        '<rect x="12" y="28" width="470" height="48" rx="5" fill="none" stroke="var(--good)" stroke-dasharray="4 3"/>' +
        '<text x="20" y="44" class="s-mono s-sub" fill="var(--good)">fallback</text>' +
        '<rect x="28" y="48" width="330" height="22" rx="3" fill="none" stroke="var(--warn)"/>' +
        '<text x="36" y="63" class="s-mono s-sub" fill="var(--warn)">retry</text>' +
        '<rect x="80" y="51" width="70" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<text x="115" y="63" class="s-sub" text-anchor="middle">try 1</text>' +
        '<rect x="156" y="51" width="70" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<text x="191" y="63" class="s-sub" text-anchor="middle">try 2</text>' +
        '<rect x="232" y="51" width="70" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<text x="267" y="63" class="s-sub" text-anchor="middle">try 3</text>' +
        '<rect x="372" y="51" width="100" height="16" fill="var(--good)" opacity="0.35" stroke="var(--good)"/>' +
        '<text x="422" y="63" class="s-sub" text-anchor="middle">backup</text>' +
        '<text x="500" y="58" class="s-mono" fill="var(--good)">3 primary attempts</text>' +
        '<text x="500" y="74" class="s-mono s-sub">what you want</text>' +
        '<text x="12" y="126" class="s-label">primary.with_fallbacks([backup]).with_retry()   \u2014 fallback INSIDE retry</text>' +
        '<rect x="12" y="136" width="470" height="48" rx="5" fill="none" stroke="var(--warn)" stroke-dasharray="4 3"/>' +
        '<text x="20" y="152" class="s-mono s-sub" fill="var(--warn)">retry</text>' +
        '<rect x="28" y="156" width="270" height="22" rx="3" fill="none" stroke="var(--good)"/>' +
        '<text x="36" y="171" class="s-mono s-sub" fill="var(--good)">fallback</text>' +
        '<rect x="90" y="159" width="70" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<text x="125" y="171" class="s-sub" text-anchor="middle">try 1</text>' +
        '<rect x="180" y="159" width="100" height="16" fill="var(--good)" opacity="0.35" stroke="var(--good)"/>' +
        '<text x="230" y="171" class="s-sub" text-anchor="middle">backup</text>' +
        '<text x="316" y="171" class="s-mono s-sub" fill="var(--line)">retry never fires</text>' +
        '<text x="500" y="166" class="s-mono" fill="var(--crit)">1 primary attempt</text>' +
        '<text x="500" y="182" class="s-mono s-sub">almost never what you want</text>' +
        '<text x="12" y="222" class="s-sub">the inner fallback SUCCEEDS, so the outer retry sees no exception and has</text>' +
        '<text x="12" y="240" class="s-sub">nothing to retry. the primary gets one chance at a transient failure.</text>' +
        '<text x="12" y="268" class="s-sub">RULE: put the retry closest to the thing that is flaky.</text>' +
        '</svg>' },
    { t: "callout", kind: "warn", title: "They read identically in a diff", body: [
      { t: "p", text: "`a.with_retry().with_fallbacks([b])` and `a.with_fallbacks([b]).with_retry()` are the same two method calls in a different order, on one line, in a pull request. Nothing about the second looks wrong." },
      { t: "p", text: "What it does is give a transiently failing primary exactly one chance before permanently preferring the backup \u2014 which means a provider having a two-second blip sends all your traffic to the more expensive fallback, and the retry you configured never runs." }
    ] },
    { t: "h2", n: "03", id: "whatnot", text: "What not to retry", sub: "Retry is for transient failures only" },
    { t: "table", head: ["Failure", "Why retrying is wasted"], rows: [
      ["401 / 403", "credentials will not fix themselves"],
      ["400 bad request", "the request is malformed and will stay malformed"],
      ["context length exceeded", "deterministic \u2014 it will recur identically"],
      ["content filter", "the input is the problem"],
      ["a validation error on parsed output", "a schema issue (1.5), not a network one"]
    ] },
    { t: "p", text: "A blanket retry on any of these is three times the latency for the same failure, three times the cost if the call was billed before it failed, and a confusing trace. `with_retry` takes `retry_if_exception_type` \u2014 scope it to the exceptions that are actually transient." },
    { t: "callout", kind: "tradeoff", title: "The exception you cannot classify", body: [
      { t: "p", text: "Provider SDKs vary in how precisely they type their errors, and a generic `APIError` covering both a 429 and a 400 is common. When you cannot distinguish them by type, inspect the status code in a predicate rather than retrying everything." },
      { t: "p", text: "If even that is unavailable, prefer a small `stop_after_attempt` over a large one. Two attempts on a permanent failure is an acceptable tax; five is a timeout budget spent on an outcome that was decided at the first one." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure the nesting order",
      difficulty: "advanced", minutes: 26,
      body: "Build a step that fails on its first attempts and succeeds later, and retry it. Build a step that always fails and give it a fallback. Then compose retry and fallback both ways around a primary that always fails, counting primary attempts and fallback calls in each case. Explain the difference and state the rule. Finish with the failures that should not be retried.",
      requirements: ["A flaky step that succeeds on the third attempt, with the attempt count reported",
        "A fallback that answers when the primary raises",
        "Both nesting orders, with primary attempts and backup calls counted for each",
        "An explanation of why one order gives the primary a single attempt",
        "The rule for which to use",
        "At least four failure types that should not be retried"],
      hint: "Count attempts with a mutable counter in the failing function. The interesting number is primary attempts, which differs by 3x between the two orders.",
      solution: { lang: "python", title: "x0206.py \u2014 3 attempts against 1",
        code: 'def mk_counter():\n    st = {"n": 0}\n    def f(x):\n        st["n"] += 1\n        raise RuntimeError("down")\n    return f, st\n\n# retry INSIDE fallback\nf1, s1 = mk_counter()\na = RunnableLambda(f1).with_retry(stop_after_attempt=3).with_fallbacks(\n        [RunnableLambda(backup)])\na.invoke("x")\nprint("primary attempts:", s1["n"])        # 3\n\n# fallback INSIDE retry\nf2, s2 = mk_counter()\nb = RunnableLambda(f2).with_fallbacks([RunnableLambda(backup2)]).with_retry(\n        stop_after_attempt=3)\nb.invoke("x")\nprint("primary attempts:", s2["n"])        # 1',
        out: "==============================================================================\nPART 1 -- with_retry on a flaky step\n==============================================================================\n  result   : ok on attempt 3\n  attempts : 3\n\n==============================================================================\nPART 2 -- with_fallbacks on a step that keeps failing\n==============================================================================\n   answered by the backup\n\n==============================================================================\nPART 3 -- the order matters, and it is not obvious\n==============================================================================\n  retry INSIDE fallback:  (primary.with_retry()).with_fallbacks([backup])\n   -> backup\n     primary attempts: 3, backup calls: 1\n\n  fallback INSIDE retry:  (primary.with_fallbacks([backup])).with_retry()\n   -> backup\n     primary attempts: 1, backup calls: 1\n\n  SAME two operations, different nesting, very different behaviour:\n    retry-inside-fallback exhausts the primary (3 tries) then falls over once.\n    fallback-inside-retry gives up on the primary after ONE try, because\n    the fallback succeeds so the retry has nothing to retry.\n\n  the second is almost never what you want, and it reads identically\n  in a diff. put the retry closest to the thing that is flaky.\n\n==============================================================================\nPART 4 -- what NOT to retry\n==============================================================================\n  retry is for TRANSIENT failures. retrying these wastes time and money:\n    401 / 403                        credentials will not fix themselves\n    400 bad request                  the request is malformed and will stay malformed\n    context length exceeded          deterministic, and will recur\n    content filter                   the input is the problem\n    a validation error on parsed output 1.5 -- this is a schema issue\n\n  with_retry takes retry_if_exception_type -- use it. a blanket retry\n  on a 400 is three times the latency for the same failure.",
        notes: [
          { t: "p", text: "**Retry inside fallback: 3 primary attempts, 1 backup call.** The retry exhausts the primary, and only when it finally raises does the fallback take over. That is the behaviour you almost always want." },
          { t: "p", text: "**Fallback inside retry: 1 primary attempt, 1 backup call.** The inner fallback *succeeds*, so the outer retry sees no exception and never fires. The retry you configured is dead code." },
          { t: "p", text: "**Same two method calls, different order, 3x difference in primary attempts** \u2014 and both fit on one line in a pull request with nothing to distinguish them visually." },
          { t: "p", text: "**The practical cost of the wrong order is a provider blip sending all traffic to the more expensive fallback**, because the primary got one chance at a transient failure. The rule is to put the retry closest to the thing that is flaky." },
          { t: "p", text: "**Retry is for transient failures only.** A 401, a 400, an exceeded context length, a content filter or a schema validation error will all recur identically, so a blanket retry is three times the latency for the same outcome. Scope it with `retry_if_exception_type`, and where the provider's error types are too coarse, inspect the status code in a predicate instead." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the fallback bill", body: [
      { t: "p", text: "A team adds a cheaper primary model with a premium fallback, and the fallback is configured correctly. A month later the premium model accounts for most of the spend, and the primary's error rate in the provider dashboard is under 1%." },
      { t: "p", text: "The composition order is inverted: `primary.with_fallbacks([premium]).with_retry()`. Every transient failure \u2014 a single 429, a momentary timeout \u2014 sends that request to the premium model immediately, because the fallback succeeds and the retry never engages. A 1% error rate on the primary becomes 1% of all traffic on the expensive model, plus every blip during a busy minute." },
      { t: "p", text: "The fix is swapping two method calls. The lesson for the codebase is that this is worth a test rather than a review comment: assert that a transiently failing primary is attempted more than once before the fallback is reached. It is three lines, and it is the only way the ordering gets checked, because the diff will always look fine." }
    ] }
  ],
  takeaways: [
    "**`with_retry` and `with_fallbacks` are defined on `Runnable`**, so they apply to a model, a parser, a retriever or a whole chain.",
    "**Retry inside fallback: 3 primary attempts then 1 fallback call** \u2014 measured, and almost always what you want.",
    "**Fallback inside retry: 1 primary attempt** \u2014 the inner fallback succeeds, so the outer retry never fires.",
    "**The two orders are the same method calls on one line** and read identically in a diff.",
    "**The rule: put the retry closest to the thing that is flaky.**",
    "**The cost of the wrong order is a blip routing all traffic to an expensive fallback**, with the configured retry as dead code.",
    "**Retry is for transient failures only** \u2014 401, 400, context length, content filter and schema validation errors all recur identically.",
    "**A blanket retry on a permanent failure is 3x the latency for the same outcome.**",
    "**Scope retries with `retry_if_exception_type`**, or inspect the status code in a predicate when the provider's error types are too coarse.",
    "**Where you cannot classify, prefer a small `stop_after_attempt`** \u2014 two is an acceptable tax, five is a timeout budget spent on a decided outcome.",
    "**Test the ordering**, because the diff will always look fine."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "`primary.with_fallbacks([backup]).with_retry(stop_after_attempt=3)` against a failing primary. How many times is the primary attempted?",
      options: ["3 \u2014 the retry wraps everything", "1 \u2014 the inner fallback succeeds, so the outer retry never fires",
        "6 \u2014 three retries of a fallback pair", "0 \u2014 the fallback is preferred immediately"],
      answer: 1,
      why: "The fallback is inside, so when the primary raises the fallback runs and returns successfully. The outer retry sees a successful call and has nothing to retry, making it dead code. Measured, this gives 1 primary attempt against 3 for the opposite nesting \u2014 and the practical effect is that a brief provider blip sends traffic permanently to the fallback, which is usually the expensive one." },
    { stem: "What is the rule for composing retry and fallback?",
      options: ["Always apply fallbacks first, so retries cover both paths",
        "Put the retry closest to the thing that is flaky",
        "Never combine them \u2014 pick one strategy",
        "Apply both at the chain level rather than the step level"],
      answer: 1,
      why: "Retries exist to absorb transient failure in a specific component, so the retry belongs wrapped tightly around that component, with the fallback outside it to catch the case where retrying was not enough. Written as `primary.with_retry().with_fallbacks([backup])`, this gives the primary its full allowance of attempts before the backup is reached \u2014 measured at 3 attempts against 1 for the reverse." },
    { stem: "Which failure is worth retrying?",
      options: ["400 bad request", "A 429 rate-limit response", "Context length exceeded", "A Pydantic validation error on structured output"],
      answer: 1,
      why: "A 429 is transient by definition \u2014 the same request later will likely succeed, which is what retry is for. The others are deterministic: a malformed request stays malformed, an over-long context recurs identically, and a schema validation failure is a modelling problem from 1.5 rather than a network one. Retrying any of them is three times the latency for exactly the same outcome." },
    { stem: "How do you prevent an ordering mistake between retry and fallback from reaching production?",
      options: ["A code-review checklist item",
        "A test asserting a transiently failing primary is attempted more than once before the fallback",
        "Static analysis on method call order",
        "Configuring both at the chain level instead of per step"],
      answer: 1,
      why: "The two orders are the same method calls on a single line, so a diff gives a reviewer nothing to notice \u2014 which makes review an unreliable control here. A three-line test with a counting primary makes the behaviour explicit and catches the inversion, which otherwise shows up months later as an unexplained bill from the fallback provider." }
  ] },
  interview: { title: "Interview practice", sub: "Retries and fallbacks", questions: [
    { level: "advanced", q: "How do with_retry and with_fallbacks interact?",
      strong: "A strong answer gives the measured difference between the two orders.",
      answer: [
        { t: "p", text: "The order you compose them in changes the behaviour completely, and the two forms are visually identical \u2014 same two method calls, different sequence, one line." },
        { t: "p", text: "I measured it against a primary that always fails. Retry inside fallback gave 3 primary attempts and then 1 fallback call: the retry exhausts the primary, and only when it finally raises does the backup take over. Fallback inside retry gave 1 primary attempt. The inner fallback succeeds, so the outer retry sees no exception and never fires \u2014 the retry is dead code." },
        { t: "p", text: "So the rule is to put the retry closest to the thing that is flaky. Primary dot with_retry dot with_fallbacks of backup." },
        { t: "p", text: "The reason this matters commercially is specific: with the wrong order, a provider having a two-second blip sends that request to the fallback immediately, and the fallback is usually the more expensive model. A one per cent primary error rate becomes one per cent of all traffic on the premium provider, which turns up as an unexplained bill rather than as an incident." }
      ] },
    { level: "core", q: "What should you not retry?",
      strong: "A strong answer separates transient from deterministic failures.",
      answer: [
        { t: "p", text: "Anything deterministic. A 401 or 403 \u2014 credentials do not fix themselves. A 400 \u2014 a malformed request stays malformed. Context length exceeded \u2014 that recurs identically every time. A content filter rejection \u2014 the input is the problem. And a schema validation error on structured output, which is a modelling issue rather than a network one." },
        { t: "p", text: "Retrying any of those is three times the latency for exactly the same outcome, three times the cost if the provider billed the call before rejecting it, and a trace that makes the failure look intermittent when it is not." },
        { t: "p", text: "So I would scope it with retry_if_exception_type rather than retrying everything. The practical difficulty is that provider SDKs vary in how precisely they type errors \u2014 a generic APIError covering both a 429 and a 400 is common \u2014 and in that case I would inspect the status code in a predicate instead." },
        { t: "p", text: "Where even that is not available, I would prefer a small stop_after_attempt over a large one. Two attempts on a permanent failure is an acceptable tax. Five is a user-facing timeout budget spent on an outcome that was decided at the first attempt." }
      ] },
    { level: "advanced", q: "Your fallback provider is most of the bill and the primary's error rate is under 1%. Diagnose.",
      strong: "A strong answer reaches the inverted composition and proposes a test.",
      answer: [
        { t: "p", text: "I would look at the composition order first. If it is primary dot with_fallbacks dot with_retry, the fallback is inside, so every single transient failure routes immediately to the premium model and the configured retry never engages." },
        { t: "p", text: "That explains the shape of the numbers. A one per cent error rate on the primary becomes one per cent of all traffic on the expensive provider, plus everything that blips during a busy minute \u2014 and nothing is logged as an error anywhere, because the fallback succeeded. From the outside it looks like the system is healthy and the bill is wrong." },
        { t: "p", text: "The fix is swapping two method calls. The more useful outcome is a test, because this cannot be caught in review \u2014 the two orders are the same calls on one line and a reviewer has nothing to see." },
        { t: "p", text: "The test I would write is three lines: a primary that fails on its first two attempts and counts them, wrapped in the real retry and fallback configuration, asserting the primary was attempted more than once before the fallback was reached. That pins the behaviour rather than the syntax, so it keeps working if someone later changes the retry count or swaps the fallback provider." }
      ] }
  ] }
});

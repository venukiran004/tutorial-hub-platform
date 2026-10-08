EC.receiveLesson({
  id: "2.3",
  lede: "`RunnableParallel` runs branches concurrently on a thread pool, and the parallelism is real rather than bookkeeping \u2014 three 100 ms calls took **0.115 s against 0.310 s** run one after another. The number that governs a fan-out is therefore the **maximum**, not the sum: two 100 ms branches plus one 300 ms branch came out at 313 ms, which is the slow branch alone. Adding a fourth fast branch is free; adding a slower one costs its full difference. And the thing most LCEL code actually uses is the coercion from 2.2 \u2014 a dict literal in a pipe *is* a `RunnableParallel`, which is why the class rarely appears by name.",
  objectives: [
    "Measure the speedup RunnableParallel provides over sequential execution",
    "Explain why a fan-out costs its slowest branch rather than its total",
    "Decide whether adding a branch is free or expensive",
    "Recognise a dict literal as a RunnableParallel",
    "Name what parallel branches cannot do"
  ],
  prerequisites: ["2.2"],
  blocks: [
    { t: "h2", n: "01", id: "real", text: "The parallelism is real", sub: "Measured, not asserted" },
    { t: "code", lang: "python", title: "Three branches on the same input",
      code: 'branches = RunnableParallel(\n    summary=prompt | model | StrOutputParser(),\n    sentiment=prompt | model | StrOutputParser(),\n    topic=prompt | model | StrOutputParser())\n\nout = branches.invoke({"text: "some input"})',
      out: 'result : {\'summary\': \'a short summary\', \'sentiment\': \'positive\', \'topic\': \'technology\'}\ntime   : 0.115 s\n\nthe same three, run one after another: 0.310 s\nspeedup: 2.7x  (three 100 ms calls)',
      caption: "0.115 s against 0.310 s. A thread pool, not bookkeeping." },
    { t: "p", text: "Each branch receives **the same input** and produces one key of the output dict. That shape \u2014 one input, several independent computations, a dict of results \u2014 is the single most common fan-out in LLM applications: summarise and classify and extract, all from the same document." },
    { t: "h2", n: "02", id: "max", text: "The cost is the maximum", sub: "Which changes what you optimise" },
    { t: "code", lang: "text", title: "Two fast branches and one slow one",
      code: 'two 100 ms branches plus one 300 ms branch: 0.313 s\n=> 313 ms, which is the slow branch alone.',
      caption: "The fast branches are entirely hidden behind the slow one." },
    { t: "viz", title: "Sum against maximum",
      caption: "Sequential cost is the sum; parallel cost is the maximum. Only one of those improves when you optimise a fast branch.",
      svg: '<svg viewBox="0 0 760 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequential versus parallel branch timing">' +
        '<text x="12" y="18" class="s-label">SEQUENTIAL \u2014 cost is the SUM, 500 ms</text>' +
        '<rect x="12" y="28" width="130" height="26" fill="var(--violet)" opacity="0.28" stroke="var(--violet)"/>' +
        '<text x="77" y="46" class="s-sub" text-anchor="middle">100</text>' +
        '<rect x="142" y="28" width="130" height="26" fill="var(--violet)" opacity="0.28" stroke="var(--violet)"/>' +
        '<text x="207" y="46" class="s-sub" text-anchor="middle">100</text>' +
        '<rect x="272" y="28" width="390" height="26" fill="var(--crit)" opacity="0.28" stroke="var(--crit)"/>' +
        '<text x="467" y="46" class="s-sub" text-anchor="middle">300</text>' +
        '<text x="12" y="88" class="s-label">PARALLEL \u2014 cost is the MAXIMUM, 313 ms measured</text>' +
        '<rect x="12" y="98" width="130" height="22" fill="var(--violet)" opacity="0.28" stroke="var(--violet)"/>' +
        '<text x="77" y="114" class="s-sub" text-anchor="middle">100</text>' +
        '<rect x="12" y="122" width="130" height="22" fill="var(--violet)" opacity="0.28" stroke="var(--violet)"/>' +
        '<text x="77" y="138" class="s-sub" text-anchor="middle">100</text>' +
        '<rect x="12" y="146" width="390" height="22" fill="var(--crit)" opacity="0.28" stroke="var(--crit)"/>' +
        '<text x="207" y="162" class="s-sub" text-anchor="middle">300  \u2014 this is the whole cost</text>' +
        '<line x1="402" y1="92" x2="402" y2="176" stroke="var(--crit)" stroke-dasharray="4 4"/>' +
        '<text x="412" y="112" class="s-mono s-sub" fill="var(--crit)">everything finishes here</text>' +
        '<text x="12" y="206" class="s-sub">optimising a 100 ms branch to 50 ms changes the sequential total and</text>' +
        '<text x="12" y="224" class="s-sub">changes the parallel cost by exactly nothing.</text>' +
        '<text x="12" y="248" class="s-sub">adding a fourth 100 ms branch is also free. adding a 400 ms one costs 87 ms.</text>' +
        '</svg>' },
    { t: "callout", kind: "insight", title: "Optimise the slowest branch or none of them", body: [
      { t: "p", text: "In a sequential chain every improvement shows up in the total. In a fan-out, improving anything other than the slowest branch changes the wall clock by exactly zero \u2014 the gain is absorbed by the branch everyone is waiting for." },
      { t: "p", text: "This is the same reasoning as a critical path, and it has a pleasant corollary: **adding work to a fan-out is often free.** If a fourth classification takes 80 ms and the slowest existing branch is 300, it costs nothing. That makes fan-outs a good place to put speculative or optional work." }
    ] },
    { t: "h2", n: "03", id: "dict", text: "The dict literal", sub: "Which is what you will actually read" },
    { t: "code", lang: "python", title: "Two ways to write the same thing",
      code: 'chain_a = RunnableParallel(ctx=retriever, q=RunnablePassthrough())\nchain_b = {"ctx": retriever, "q": RunnablePassthrough()}   # identical',
      out: "{'a':..., 'b':...} | fn -> {'a': 'HEY', 'b': 3}\nfirst step type         : RunnableParallel",
      caption: "The second form is overwhelmingly more common in real code." },
    { t: "p", text: "2.2 established the coercion; this is where it pays. Because a dict in a pipe becomes a `RunnableParallel`, the fan-out idiom reads as data rather than as a constructor call \u2014 and that is why you will almost never see `RunnableParallel` written out in a codebase, despite it being everywhere." },
    { t: "h2", n: "04", id: "limits", text: "What a fan-out cannot do", sub: "Three limits worth knowing before you reach for it" },
    { t: "ul", items: [
      "**Branches cannot see each other's results.** They all receive the same input and run independently. If branch B needs branch A's output, that is a sequence, not a parallel.",
      "**There is no partial success.** If one branch raises, the whole `RunnableParallel` raises. Attach `with_fallbacks` to the branch that might fail (2.6), or accept that one flaky classification takes the request down.",
      "**The fan-out width is fixed at build time.** You cannot decide at runtime to run seven branches instead of three \u2014 the keys are written in the source. Dynamic fan-out is `Send` in LangGraph (10.2), and it is a different mechanism for a reason."
    ] },
    { t: "callout", kind: "trap", title: "One flaky branch fails the whole dict", body: [
      { t: "p", text: "The all-or-nothing behaviour surprises people, because a fan-out looks like independent work. It is independent in execution and atomic in result: two branches succeeding and one raising gives you an exception, not a partial dict." },
      { t: "p", text: "The usual fix is per-branch `with_fallbacks` returning a sentinel \u2014 `None`, or an \u201cunavailable\u201d marker \u2014 so a degraded answer beats no answer. 14.5 makes that a general pattern under the name k-of-N degradation; here it is one method call on one branch." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure a fan-out",
      difficulty: "core", minutes: 24,
      body: "Build a RunnableParallel with three branches against a deliberately slow model and time it. Compare against running the same three sequentially. Then make one branch three times slower than the others and time it again, and work out what that says about which branch to optimise. Finally, confirm that a dict literal produces the same object.",
      requirements: ["Three branches against a model with a measurable delay",
        "Time the parallel invocation and the sequential equivalent, and report the speedup",
        "Add a branch that takes three times as long and time it",
        "State what the second timing implies about optimisation priority",
        "Show that a dict literal in a pipe becomes a RunnableParallel",
        "Name at least two things a fan-out cannot do"],
      hint: "Subclass the fake model with a sleep. The second timing is the interesting one \u2014 compare it against both the sum and the maximum.",
      solution: { lang: "python", title: "x0203.py \u2014 sum against maximum",
        code: 'class Slow(FakeChatModel):\n    def _generate(self, messages, stop=None, run_manager=None, **kw):\n        time.sleep(0.10)\n        return FakeChatModel._generate(self, messages, stop, run_manager, **kw)\n\nbranches = RunnableParallel(\n    summary=prompt | Slow(script=["a short summary"]) | StrOutputParser(),\n    sentiment=prompt | Slow(script=["positive"]) | StrOutputParser(),\n    topic=prompt | Slow(script=["technology"]) | StrOutputParser())\n\nt0 = time.perf_counter()\nout = branches.invoke({"text: "some input"})\nprint("%.3f s" % (time.perf_counter() - t0))\n\n# then the same three sequentially, and a mixed fan-out with one slow branch',
        out: "==============================================================================\nPART 1 -- RunnableParallel runs branches concurrently\n==============================================================================\n  result : {\'summary\': \'a short summary\', \'sentiment\': \'positive\', \'topic\': \'technology\'}\n  time   : 0.115 s\n\n  the same three, run one after another: 0.310 s\n  speedup: 2.7x  (three 100 ms calls)\n\n  the parallelism is real -- a thread pool, not bookkeeping.\n\n==============================================================================\nPART 2 -- it is only as fast as its slowest branch\n==============================================================================\n  two 100 ms branches plus one 300 ms branch: 0.313 s\n  => 313 ms, which is the slow branch alone.\n\n  adding a fourth fast branch is free. adding a slower one is not.\n  the number to optimise in a fan-out is the MAXIMUM, not the sum.\n\n==============================================================================\nPART 3 -- a dict literal is a RunnableParallel\n==============================================================================\n  {\'a\':..., \'b\':...} | fn -> {\'a\': \'HEY\', \'b\': 3}\n  first step type         : RunnableParallel",
        notes: [
          { t: "p", text: "**0.115 s parallel against 0.310 s sequential \u2014 2.7x on three 100 ms calls.** The parallelism is a real thread pool, and the small shortfall from a theoretical 3x is pool startup, which is the honest overhead." },
          { t: "p", text: "**Two 100 ms branches plus one 300 ms branch came to 313 ms**, which is the slow branch alone. The fast branches are entirely hidden behind it." },
          { t: "p", text: "**So optimising anything other than the slowest branch changes the wall clock by zero.** That inverts the sequential intuition, where every improvement shows up in the total. It is critical-path reasoning, and the corollary is the useful part: adding a fourth fast branch is free, which makes a fan-out a good home for speculative or optional work." },
          { t: "p", text: "**A dict literal produced a RunnableParallel**, confirming 2.2's coercion. That is why the class rarely appears by name in real code despite being everywhere \u2014 the idiom reads as data." },
          { t: "p", text: "**The limits are worth knowing before reaching for it.** Branches cannot see each other's results, there is no partial success \u2014 one raising branch fails the whole dict \u2014 and the width is fixed at build time, so dynamic fan-out needs LangGraph's `Send` instead." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the classifier that took the endpoint down", body: [
      { t: "p", text: "A document endpoint fans out to summary, sentiment, topic and a new toxicity classifier. The classifier's provider has a bad afternoon, and the endpoint returns 500 for every request \u2014 including the ones where summary and topic succeeded perfectly well." },
      { t: "p", text: "That is `RunnableParallel`'s all-or-nothing contract doing exactly what it says. The fix is one method on one branch: `with_fallbacks` returning a sentinel so the toxicity key comes back as `None` and the rest of the dict survives. The endpoint then degrades instead of failing." },
      { t: "p", text: "The design point underneath is to decide, per branch, whether it is load-bearing. A summary that fails should probably fail the request; a nice-to-have classification should not. A fan-out makes those look identical in the source, so the distinction has to be written down deliberately \u2014 and the branch that was added last is almost always the one that is not load-bearing and has no fallback." }
    ] }
  ],
  takeaways: [
    "**RunnableParallel runs branches concurrently on a thread pool** \u2014 0.115 s against 0.310 s for three 100 ms calls, measured.",
    "**Every branch receives the same input** and contributes one key to the result dict.",
    "**The cost of a fan-out is its slowest branch, not the sum** \u2014 two 100 ms branches plus one 300 ms branch came to 313 ms.",
    "**So optimising any branch but the slowest changes the wall clock by zero.**",
    "**And adding a fast branch is free**, which makes a fan-out a good place for speculative or optional work.",
    "**A dict literal in a pipe is a RunnableParallel**, which is why the class rarely appears by name.",
    "**Branches cannot see each other's results** \u2014 if B needs A's output, that is a sequence.",
    "**There is no partial success**: one raising branch fails the whole dict.",
    "**Per-branch `with_fallbacks` returning a sentinel** is how you degrade instead of failing.",
    "**The fan-out width is fixed at build time** \u2014 dynamic fan-out is LangGraph's `Send` (10.2).",
    "**Decide per branch whether it is load-bearing**, because the source makes them all look identical."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A fan-out has two 100 ms branches and one 300 ms branch. You halve one of the fast branches. What happens to the wall clock?",
      options: ["It drops by 50 ms", "Nothing \u2014 the cost is the slowest branch, which is unchanged",
        "It drops by about 17 ms, the branch's share of the total", "It depends on thread pool scheduling"],
      answer: 1,
      why: "Parallel cost is the maximum, not the sum, so the fast branches are entirely hidden behind the slow one \u2014 measured at 313 ms for exactly this shape. Improving anything other than the critical branch is absorbed. The corollary is more useful than the warning: adding a fourth fast branch is also free, which makes a fan-out a good place to put speculative or optional work." },
    { stem: "One branch of a RunnableParallel raises. What do you get?",
      options: ["A dict with that key set to None", "An exception \u2014 the whole parallel fails",
        "A dict containing only the successful branches", "A dict with the key missing and a warning logged"],
      answer: 1,
      why: "A fan-out is independent in execution and atomic in result: two successes and one failure give an exception, not a partial dict. That surprises people because the branches look independent. The fix is per-branch with_fallbacks returning a sentinel, so a non-essential classification degrades to None while the rest of the dict survives \u2014 which requires deciding, per branch, whether it is load-bearing." },
    { stem: "Branch B needs branch A's output. How do you express that in a RunnableParallel?",
      options: ["Order the keys so A comes first", "You cannot \u2014 all branches receive the same input; that is a sequence",
        "Use RunnablePassthrough.assign inside B", "Declare a dependency in the parallel's config"],
      answer: 1,
      why: "Every branch of a fan-out receives the same input and runs independently, so there is no mechanism for one to consume another's result \u2014 key order is irrelevant. A dependency between steps is a sequence by definition. If you need both a computed value and the original input available downstream, that is RunnablePassthrough.assign in a sequence, which is 2.4." },
    { stem: "Why does RunnableParallel rarely appear by name in real LangChain code?",
      options: ["It is deprecated in favour of RunnableMap",
        "A dict literal in a pipe is coerced into one, so the idiom reads as data",
        "Most chains use batch instead", "It is usually constructed by helper functions in the library"],
      answer: 1,
      why: "The pipe coerces a dict literal into a RunnableParallel, so the standard fan-out is written as a dict and the class name never appears. That makes the idiom readable as data and invisible as a construct \u2014 there is no import or constructor to hint that a class is involved, which is why it is the main readability cliff for someone new to LCEL." }
  ] },
  interview: { title: "Interview practice", sub: "Parallel branches", questions: [
    { level: "core", q: "What does RunnableParallel do and when would you use it?",
      strong: "A strong answer gives the shape and the measured benefit.",
      answer: [
        { t: "p", text: "It runs several branches concurrently on the same input and returns a dict of their results. The shape \u2014 one input, several independent computations, one dict out \u2014 is the most common fan-out in LLM applications: summarise, classify and extract, all from the same document." },
        { t: "p", text: "The parallelism is real. I measured three 100 millisecond calls at 0.115 seconds parallel against 0.310 sequential, about 2.7 times, with the shortfall from a theoretical 3x being thread pool startup." },
        { t: "p", text: "The thing I would make sure to say is that you almost never write the class name. A dict literal inside a pipe is coerced into a RunnableParallel, so the idiom reads as data \u2014 which is why it is everywhere in real code and nowhere by name." },
        { t: "p", text: "Where I would not use it is when one branch needs another's output. All branches get the same input and run independently, so a dependency is a sequence by definition, not a fan-out with ordered keys." }
      ] },
    { level: "advanced", q: "How do you think about optimising a fan-out?",
      strong: "A strong answer uses critical-path reasoning and the free-branch corollary.",
      answer: [
        { t: "p", text: "The cost is the maximum, not the sum, so you optimise the slowest branch or you optimise nothing. I measured two 100 millisecond branches plus one 300 millisecond branch at 313 milliseconds \u2014 the fast ones are entirely hidden." },
        { t: "p", text: "That inverts the sequential intuition, where every improvement lands in the total. In a fan-out, halving a fast branch changes the wall clock by exactly zero, which is a surprisingly easy way to spend a sprint." },
        { t: "p", text: "The corollary is the more useful half, and I would lead with it in a design discussion: adding work to a fan-out is often free. A fourth classification at 80 milliseconds against a 300 millisecond critical branch costs nothing, which makes a fan-out a good home for speculative or optional work \u2014 things you would not spend a serial round trip on." },
        { t: "p", text: "The constraint to watch alongside that is rate limits. Free in wall clock is not free in tokens or in requests per minute, so a wide fan-out can be fast and still be the thing that trips your quota." }
      ] },
    { level: "core", q: "A new branch in a fan-out started failing and took the whole endpoint down. Explain and fix.",
      strong: "A strong answer names the atomic contract and the per-branch decision.",
      answer: [
        { t: "p", text: "RunnableParallel is all-or-nothing. The branches are independent in execution and the result is atomic, so one raising branch gives you an exception rather than a partial dict \u2014 even though the others succeeded." },
        { t: "p", text: "The immediate fix is one method on one branch: with_fallbacks returning a sentinel, so that key comes back as None or an unavailable marker and the rest of the dict survives. The endpoint degrades instead of failing." },
        { t: "p", text: "The design point underneath is that you have to decide per branch whether it is load-bearing, and the source gives you no help \u2014 every branch looks identical in a dict literal. A summary failing should probably fail the request. A nice-to-have toxicity score should not." },
        { t: "p", text: "It is almost always the most recently added branch that causes this, because it was added as an enhancement and inherited the same all-or-nothing treatment as the branches the feature actually depends on. So the review question when someone adds a branch is simply: if this one fails, should the request fail?" }
      ] }
  ] }
});

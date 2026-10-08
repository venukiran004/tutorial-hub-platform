EC.receiveLesson({
  id: "4.6",
  lede: "Five resilience mechanisms \u2014 retry, fallback, rate limit, cache, circuit breaker \u2014 and the order they wrap in determines what the system does. 2.6 measured the inner two: retry inside fallback gives the primary three attempts, fallback inside retry gives it one. This lesson composes the whole stack and finds the ordering error that is both subtle and common: **a cache inside the rate limiter means cache hits consume rate-limit tokens**, so your effective throughput gets *worse* the better your cache performs \u2014 the exact opposite of the intent, with nothing failing to indicate it.",
  objectives: [
    "Compose retry, fallback, rate limiting and caching in the correct order",
    "Explain what each wrong ordering does",
    "Identify the ordering error that degrades throughput silently",
    "Verify that a retry absorbs transient failures without the fallback firing",
    "State what each mechanism is not for"
  ],
  prerequisites: ["2.6", "4.3", "4.5"],
  blocks: [
    { t: "h2", n: "01", id: "stack", text: "The stack, outward from the model", sub: "Each layer wraps the one inside it" },
    { t: "code", lang: "text", title: "The order that works",
      code: 'cached(\n  rate_limited(\n    fallback(\n      retry(\n        model))))',
      caption: "Reading outward: the retry is closest to the thing that is flaky." },
    { t: "table", head: ["Layer", "Why there"], rows: [
      ["retry", "closest to the flaky thing (2.6)"],
      ["fallback", "outside retry, so the primary is exhausted first"],
      ["rate limit", "outside both, so retries count against the budget"],
      ["cache", "outermost, so a hit costs nothing at all"]
    ] },
    { t: "p", text: "Each placement has a reason that can be stated, which is the test for whether an ordering is designed or inherited. \u201cRetries should count against the rate limit\u201d is a decision; having the limiter inside the retry is usually not." },
    { t: "h2", n: "02", id: "wrong", text: "What each wrong ordering does", sub: "Four, and the last is the subtle one" },
    { t: "table", head: ["Wrong ordering", "Consequence"], rows: [
      ["fallback inside retry", "the primary gets **one** attempt (2.6, measured)"],
      ["rate limit inside retry", "each retry waits for its own token, so a three-retry burst takes three times as long as it needs to"],
      ["cache inside the retry", "a failure is retried before the cache is consulted, so a cached answer is not used on the retry path"],
      ["cache inside the rate limiter", "**cache hits consume rate-limit tokens**"]
    ] },
    { t: "callout", kind: "warn", title: "The last one gets worse the better your cache is", body: [
      { t: "p", text: "If the cache sits inside the limiter, every request acquires a token before the cache is checked \u2014 including the ones that never reach the provider. So a 40% hit rate means 40% of your rate-limit budget is spent on requests that cost the provider nothing." },
      { t: "p", text: "The perverse part is the direction: **improving the cache makes throughput worse**, because more hits means more tokens spent on non-requests. Nothing fails, no error is raised, and the symptom is a service that throttles itself harder the better it performs." }
    ] },
    { t: "p", text: "The cache belongs outermost for the same reason it exists: a hit should cost nothing. Not a model call, not a token from the limiter, not a retry budget \u2014 nothing." },
    { t: "h2", n: "03", id: "verify", text: "Verifying the composition", sub: "The fallback should not fire on a transient failure" },
    { t: "code", lang: "text", title: "A step that fails twice then succeeds",
      code: 'run 1 -> ok after 3\nrun 2 -> ok after 3\nrun 3 -> ok after 3\nrun 4 -> ok after 3',
      caption: "The retry absorbed both failures. The fallback never ran." },
    { t: "p", text: "That is the configuration you want, and it is worth asserting on rather than assuming: **the fallback is for when retrying is not enough, not for the first hiccup**. A fallback that fires on every transient failure is the inverted ordering from 2.6, and it shows up as an unexplained bill from the secondary provider rather than as an error." },
    { t: "h2", n: "04", id: "notfor", text: "What each mechanism is not for", sub: "Because each gets misused in a characteristic way" },
    { t: "table", head: ["Mechanism", "Not for"], rows: [
      ["retry", "permanent failures \u2014 401, 400, context length (2.6)"],
      ["fallback", "masking a primary you have not measured"],
      ["rate limit", "controlling cost; it controls **requests**"],
      ["cache", "anything personalised or time-sensitive (4.3)"],
      ["all of them", "a substitute for knowing why something fails"]
    ] },
    { t: "callout", kind: "insight", title: "The rate-limit row is a common confusion", body: [
      { t: "p", text: "A rate limiter bounds requests per second, not spend. A single request with a 100,000-token context costs far more than fifty short ones and consumes one token from the bucket. If the problem is cost, the controls are 4.4's token budget and 4.3's cache \u2014 not the limiter." },
      { t: "p", text: "The two get conflated because both are described as \u201climiting\u201d, and a team that adds a rate limiter to control spend will find spend roughly unchanged and latency worse." }
    ] },
    { t: "exercise", kind: "build", title: "Compose the stack and find the silent ordering bug",
      difficulty: "advanced", minutes: 26,
      body: "Write out the resilience stack in the correct nesting order and justify each placement. Then enumerate the wrong orderings and say what each one does, identifying the one that degrades silently. Verify that a correctly composed retry absorbs transient failures without the fallback firing. Finally, state what each mechanism is not for.",
      requirements: ["Show the stack as nested layers with a justification per layer",
        "List at least four wrong orderings and their consequences",
        "Identify the ordering whose damage increases as the cache improves",
        "Build a step that fails twice then succeeds, wrapped retry-then-fallback",
        "Show across several runs that the fallback never fires",
        "State what each of the five mechanisms is not for"],
      hint: "For the silent one, trace a cache hit through the layers and ask what it consumed.",
      solution: { lang: "python", title: "x0406.py \u2014 the stack, and the ordering that inverts",
        code: 'calls = {"n": 0}\ndef flaky_fn(x):\n    calls["n"] += 1\n    if calls["n"] % 3 != 0:\n        raise RuntimeError("transient")\n    return "ok after %d" % calls["n"]\n\nbase = RunnableLambda(flaky_fn)\nstack = base.with_retry(stop_after_attempt=3).with_fallbacks(\n    [RunnableLambda(lambda x: "fallback answer")])\n\nfor i in range(4):\n    calls["n"] = 0\n    print(stack.invoke("x"))        # "ok after 3" every time\n\n# the full stack, outward from the model:\n#   cached( rate_limited( fallback( retry( model ))))',
        out: "==============================================================================\nPART 1 -- the full resilience stack, composed\n==============================================================================\n  five mechanisms, and the order they wrap in matters:\n\n    cached(\n      rate_limited(\n        fallback(\n          retry(\n            model))))\n\n  reading outward from the model:\n    retry        closest to the flaky thing (2.6)\n    fallback     outside retry, so the primary is exhausted first\n    rate limit   outside both, so retries count against the budget\n    cache        outermost, so a hit costs nothing at all\n\n==============================================================================\nPART 2 -- what goes wrong at each wrong ordering\n==============================================================================\n  fallback inside retry        the primary gets ONE attempt (2.6, measured)\n  rate limit inside retry      each retry waits for its own token; a 3-retry burst takes 3x as long as it needs to\n  cache inside the retry       a failure is retried before the cache is consulted, so a cached answer is not used on the retry path\n  cache inside the rate limiter cache HITS consume rate-limit tokens, so your limiter throttles requests that never reach the provider\n\n  the last one is the subtle one and it is common: a cache that sits\n  inside the limiter makes your effective throughput WORSE the better\n  your cache performs, which is the opposite of the intent.\n\n==============================================================================\nPART 3 -- measuring the interaction\n==============================================================================\n  a step that fails twice then succeeds, wrapped retry-then-fallback:\n    run 1 -> ok after 3        \n    run 2 -> ok after 3        \n    run 3 -> ok after 3        \n    run 4 -> ok after 3        \n\n  the retry absorbed the transient failures and the fallback never\n  fired. that is the configuration you want: the fallback is for when\n  retrying is not enough, not for the first hiccup.\n\n==============================================================================\nPART 4 -- what each mechanism is NOT for\n==============================================================================\n  retry        permanent failures -- 401, 400, context length (2.6)\n  fallback     masking a primary you have not measured\n  rate limit   controlling cost; it controls REQUESTS\n  cache        anything personalised or time-sensitive (4.3)\n  all of them  a substitute for knowing why something fails",
        notes: [
          { t: "p", text: "**Each placement has a stateable reason**, which is the test for whether an ordering was designed or inherited: retry closest to the flaky thing, fallback outside it so the primary is exhausted first, rate limit outside both so retries count against the budget, cache outermost so a hit costs nothing." },
          { t: "p", text: "**Fallback inside retry gives the primary one attempt** \u2014 2.6 measured 1 against 3 \u2014 because the inner fallback succeeds so the outer retry never fires." },
          { t: "p", text: "**Rate limit inside retry makes each retry wait for its own token**, so a three-retry burst takes three times as long as the work requires." },
          { t: "p", text: "**Cache inside the rate limiter is the subtle one: cache hits consume rate-limit tokens.** A 40% hit rate spends 40% of the budget on requests that never reach the provider \u2014 and improving the cache makes throughput *worse*, which is the opposite of the intent." },
          { t: "p", text: "**Nothing fails in that configuration.** No error, no exception; the symptom is a service that throttles itself harder the better it performs, which is not a shape anyone goes looking for." },
          { t: "p", text: "**The retry absorbed two transient failures across four runs and the fallback never fired.** That is the configuration you want, and it is worth asserting on \u2014 a fallback firing on the first hiccup is the inverted ordering, and it surfaces as an unexplained bill rather than as an error." },
          { t: "p", text: "**A rate limiter controls requests, not spend.** One request with a huge context costs far more than fifty short ones and takes one token. If the problem is cost, the controls are the token budget and the cache \u2014 conflating the two produces unchanged spend and worse latency." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the cache that made the service slower", body: [
      { t: "p", text: "A team adds caching to reduce load and latency. The cache works \u2014 hit rate climbs to 45% over a few weeks as entries accumulate \u2014 and p95 latency gets steadily **worse** over the same period. No errors, no provider-side change." },
      { t: "p", text: "The cache was added inside the rate limiter, so every request acquires a token before the cache is consulted. As the hit rate rose, a larger share of the rate-limit budget went to requests that never reached the provider, leaving less headroom for the ones that did \u2014 so real requests queued longer behind cached ones." },
      { t: "p", text: "The correlation is what makes it hard to spot: latency got worse as the cache improved, which is the opposite of the expected relationship, so the cache is the last thing anyone suspects. Moving the cache outside the limiter is a one-line change. The general guard is to be able to say, for each layer, what a cache hit consumes \u2014 and the correct answer is nothing." }
    ] }
  ],
  takeaways: [
    "**The stack, outward from the model**: retry, fallback, rate limit, cache.",
    "**Each placement has a stateable reason**, which distinguishes a designed ordering from an inherited one.",
    "**Fallback inside retry gives the primary one attempt** instead of three (2.6, measured).",
    "**Rate limit inside retry makes each retry wait for its own token**, tripling a three-retry burst.",
    "**Cache inside the retry means a cached answer is not used on the retry path.**",
    "**Cache inside the rate limiter means cache hits consume rate-limit tokens.**",
    "**And that one gets worse as the cache improves** \u2014 more hits, more budget spent on non-requests.",
    "**Nothing fails in that configuration**: the symptom is a service that throttles itself harder the better it performs.",
    "**A correctly composed retry absorbs transient failures and the fallback never fires** \u2014 assert on that.",
    "**A fallback firing on the first hiccup surfaces as an unexplained bill**, not an error.",
    "**A rate limiter controls requests, not spend** \u2014 one huge-context request takes one token.",
    "**For each layer, you should be able to say what a cache hit consumes.** The answer is nothing."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A cache sits inside the rate limiter. What happens as the hit rate improves?",
      options: ["Throughput improves proportionally",
        "Throughput gets worse \u2014 cache hits consume rate-limit tokens, so more hits means more budget on non-requests",
        "The limiter detects cached responses and skips them",
        "Nothing changes; the limiter only counts provider calls"],
      answer: 1,
      why: "Every request acquires a token before the cache is consulted, so hits spend budget on calls that never reach the provider \u2014 leaving less headroom for real ones. The direction is what makes it hard to spot: latency degrades as the cache improves, which inverts the expected relationship, so the cache is the last thing suspected. And nothing fails, so there is no error to investigate." },
    { stem: "What is the correct nesting order, reading outward from the model?",
      options: ["cache, retry, fallback, rate limit",
        "retry, fallback, rate limit, cache",
        "rate limit, retry, cache, fallback",
        "fallback, retry, cache, rate limit"],
      answer: 1,
      why: "Retry goes closest to the flaky thing so transient failures are absorbed where they occur. Fallback sits outside it so the primary is exhausted before the backup is reached. The rate limit is outside both so retries count against the budget. The cache is outermost so a hit costs nothing at all \u2014 no model call, no token, no retry budget." },
    { stem: "A retry is correctly composed and a step fails twice before succeeding. What should you observe?",
      options: ["The fallback answers, since the first attempt failed",
        "The retry absorbs both failures and the fallback never fires",
        "The rate limiter blocks the retries",
        "The cache serves a previous successful answer"],
      answer: 1,
      why: "The fallback exists for when retrying is not enough, not for the first hiccup \u2014 so with three attempts available and success on the third, the backup should never be reached. It is worth asserting on, because the inverted ordering produces the opposite behaviour and surfaces only as an unexplained bill from the secondary provider rather than as any kind of error." },
    { stem: "A team adds a rate limiter to control spend. What happens?",
      options: ["Spend falls proportionally to the rate reduction",
        "Spend is roughly unchanged and latency gets worse \u2014 a limiter controls requests, not cost",
        "The limiter rejects expensive requests automatically",
        "Spend falls, but only for streaming requests"],
      answer: 1,
      why: "A token bucket counts requests, and one request with a 100,000-token context costs far more than fifty short ones while consuming one token. So throttling smooths the request rate without reducing the amount of work sent. The cost controls are a token budget computed before sending and a cache \u2014 the confusion arises because both mechanisms are described as \u201climiting\u201d." }
  ] },
  interview: { title: "Interview practice", sub: "Composing resilience", questions: [
    { level: "advanced", q: "How do you compose retries, fallbacks, rate limiting and caching?",
      strong: "A strong answer gives the order and a reason per layer.",
      answer: [
        { t: "p", text: "Outward from the model: retry, then fallback, then rate limit, then cache. The test for whether an ordering is designed rather than inherited is whether you can state a reason for each placement." },
        { t: "p", text: "Retry closest to the thing that is flaky, because that is where transient failures occur. Fallback outside it, so the primary is exhausted before the backup is reached \u2014 the inverted version gives the primary exactly one attempt, which I have measured. Rate limit outside both, so retries count against the budget rather than bypassing it. And cache outermost, because a hit should cost nothing at all." },
        { t: "p", text: "That last phrase is the one I would use as the general check. For each layer, ask what a cache hit consumes, and the answer should be nothing \u2014 not a model call, not a rate-limit token, not retry budget." },
        { t: "p", text: "The ordering I would watch for in review is the cache inside the rate limiter, because it is subtle and the damage grows with how well the cache works." }
      ] },
    { level: "advanced", q: "Latency has been getting worse as a cache's hit rate improved. Explain.",
      strong: "A strong answer identifies the inverted relationship as the clue.",
      answer: [
        { t: "p", text: "The cache is almost certainly inside the rate limiter, so every request acquires a token before the cache is consulted \u2014 including the ones that never reach the provider." },
        { t: "p", text: "So as the hit rate climbs, a larger share of the rate-limit budget is spent on requests that cost the provider nothing, leaving less headroom for the real ones. Those queue longer, and p95 degrades." },
        { t: "p", text: "What makes it genuinely hard to diagnose is the direction of the correlation. Latency got worse as the cache got better, which is the opposite of the expected relationship, so the cache is the last component anyone suspects. And nothing fails \u2014 there is no error, no exception, no provider-side change \u2014 so there is no incident to investigate, just a metric drifting." },
        { t: "p", text: "The fix is moving the cache outside the limiter, which is a one-line change. The guard I would add afterwards is the question I use for any resilience stack: for each layer, what does a cache hit consume? If the answer is anything other than nothing, the ordering is wrong." }
      ] },
    { level: "core", q: "A team wants to add a rate limiter to control costs. What do you say?",
      strong: "A strong answer separates requests from spend and redirects.",
      answer: [
        { t: "p", text: "That a rate limiter controls requests, not spend, so it will not do what they want. A token bucket counts calls \u2014 one request with a hundred-thousand-token context consumes exactly one token, the same as a one-line question." },
        { t: "p", text: "So throttling smooths the request rate without reducing the amount of work being sent. The likely outcome is roughly unchanged spend and worse latency, which is a bad trade made for a reasonable-sounding reason." },
        { t: "p", text: "The two mechanisms get conflated because both get described as limiting. The actual cost controls are a token budget computed before sending \u2014 count the prompt, decide how many retrieved chunks fit, refuse or trim if it is over \u2014 and a cache, which removes calls entirely rather than spacing them out." },
        { t: "p", text: "I would still want the rate limiter, just for the thing it is for. Rate-limit failures are correlated, so exceeding a quota fails every request in a burst and the retries then arrive together. That is worth preventing regardless of the cost question." }
      ] }
  ] }
});

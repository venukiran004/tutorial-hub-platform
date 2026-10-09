EC.receiveLesson({
  id: "4.5",
  lede: "`InMemoryRateLimiter` is a token bucket, and two of its behaviours are not what you would guess. Ten acquisitions at five per second took **2.01 s**, not the 1.0 s I predicted from a full bucket \u2014 because **the bucket starts empty**. And varying `max_bucket_size` made no difference at all until I read the source and found the reason: *\u201cinitialize on first call to avoid a burst\u201d*. **The clock starts on the first `acquire()`, not at construction**, so idle time before the first request accrues nothing. Once the clock is running the burst allowance is exact \u2014 a bucket of 5 let five requests through instantly and a bucket of 1 took 0.81 s for the same five.",
  objectives: [
    "Describe the token-bucket model and what bucket size controls",
    "Explain why the bucket starts empty and when the clock starts",
    "Measure burst allowance correctly",
    "Argue why client-side limiting beats handling 429s",
    "Account for the limiter being per-process"
  ],
  prerequisites: ["2.8"],
  blocks: [
    { t: "h2", n: "01", id: "empty", text: "The bucket starts empty", sub: "A prediction, and a measurement that disagreed" },

    {"kind": "matrix", "title": "Two token-bucket behaviours you would not guess", "caption": "Ten acquisitions at five per second took **2.01 s**, not the 1.0 s a full bucket predicts — because the bucket starts **empty**. And varying `max_bucket_size` made no difference at a steady rate, because burst capacity only matters if there is a burst.", "cols": ["expected", "measured"], "rows": ["10 acquisitions at 5/sec", "raising max_bucket_size", "the first acquisition"], "cells": [[{"text": "1.0 s — a full bucket", "tone": "warn"}, {"text": "2.01 s", "tone": "crit"}], [{"text": "faster bursts", "tone": "warn"}, {"text": "no difference at a steady rate", "tone": "crit"}], [{"text": "immediate", "tone": "warn"}, {"text": "waits — the bucket starts empty", "tone": "crit"}]], "t": "diagram", "id": "dg-4_5-01-0"},




    { t: "code", lang: "text", title: "Ten acquisitions at five per second",
      code: 'elapsed: 2.01 s\n\nI predicted ~1.0 s: five instant from a full bucket, then five more\nat 0.2 s each. the measurement says 2.01 s, which is 10 / 5 -- so\nEVERY acquisition waited for a token.',
      caption: "10 / 5 exactly. No request was free." },
    { t: "p", text: "The practical consequence is specific: a worker that does a burst of work immediately on boot gets **no** burst allowance for it and pays the full rate. If your job starts by firing twenty requests, those twenty are throttled from the first one." },
    { t: "h2", n: "02", id: "clock", text: "And the clock starts late", sub: "Which is why bucket size looked irrelevant" },
    { t: "callout", kind: "insight", title: "The measurement that made no sense, and the source that explained it", body: [
      { t: "p", text: "Varying `max_bucket_size` across 1, 3 and 5 produced identical timings, which should be impossible if the bucket is a burst allowance. Sleeping longer before the burst did not help either." },
      { t: "p", text: "The implementation says why: `# initialize on first call to avoid a burst` \u2014 `self.last` is `None` until the first `acquire()`, so elapsed time is measured from the first request rather than from construction. Idle time before you ever call it accrues nothing, which is also why the bucket looked empty in the first measurement. It is deliberate and the comment states the intent." }
    ] },
    { t: "code", lang: "text", title: "Measured correctly: start the clock, idle, then burst",
      code: 'max_bucket_size=1    5 acquires took 0.81 s  (1 free, then 4 waits)\nmax_bucket_size=3    5 acquires took 0.41 s  (3 free, then 2 waits)\nmax_bucket_size=5    5 acquires took 0.00 s  (5 free, then 0 waits)',
      caption: "Now the burst allowance is exact: bucket size is how many go through instantly." },
    { t: "p", text: "So `max_bucket_size` is the burst allowance **after an idle period**, and the rate is what you settle to. A bucket of 1 is a strict metronome; a bigger bucket absorbs a spike and then throttles." },
    { t: "h2", n: "03", id: "why", text: "Why limit client-side at all", sub: "Rather than handling 429s" },
    { t: "table", head: ["Handling 429s", "Limiting client-side"], rows: [
      ["the request is made and rejected", "the request is never made"],
      ["you may still be billed for it", "nothing to bill"],
      ["you retry, adding load to a busy provider", "you wait locally"],
      ["failures are correlated across a burst", "the burst is smoothed"],
      ["retry storms are possible", "no storm to have"]
    ] },
    { t: "callout", kind: "warn", title: "The correlated-failure row is the one that matters", body: [
      { t: "p", text: "Exceeding a rate limit does not fail one request \u2014 it fails **every request in the burst**. And then their retries arrive together, which is how a brief spike becomes a sustained outage rather than a blip." },
      { t: "p", text: "2.6 made the case for scoping retries; this is the other half. A retry policy and a rate limiter solve adjacent problems, and a system with retries but no limiter has built an amplifier." }
    ] },
    { t: "h2", n: "04", id: "process", text: "It is per-process", sub: "Which makes the number a function of your replica count" },
    { t: "p", text: "`InMemoryRateLimiter` holds its bucket in memory, so four workers each limited to five requests per second is **twenty** at the provider. The number to configure is the provider limit divided by the worker count \u2014 which means it has to change when you scale." },
    { t: "callout", kind: "tradeoff", title: "Which is an argument for where it lives", body: [
      { t: "p", text: "A constant in the source is wrong the first time someone changes the replica count, and nothing connects the two. The limit belongs in configuration derived from the deployment's worker count, so scaling up does not silently multiply your request rate." },
      { t: "p", text: "At real scale the correct answer is a shared limiter backed by something like Redis, so the budget is global rather than per-process. The in-memory one is right for a single worker or a batch job, and it is worth being clear which situation you are in." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure a token bucket, including the part that surprises you",
      difficulty: "advanced", minutes: 26,
      body: "Time ten acquisitions against a limiter and compare the result with what a full bucket would predict. Then try to demonstrate the burst allowance by varying max_bucket_size, notice that it makes no difference, find out why from the implementation, and measure it correctly. Finally, tabulate client-side limiting against handling 429s, and work out what the per-process scope means for configuration.",
      requirements: ["Time ten acquisitions and compare against a full-bucket prediction",
        "Attempt the burst measurement by sleeping before the first acquire",
        "Report that it shows no difference, and explain why from the source",
        "Measure the burst correctly by starting the clock before idling",
        "Report the timings for at least three bucket sizes",
        "Tabulate at least four differences between client-side limiting and handling 429s",
        "State what the per-process scope means when you run several workers"],
      hint: "When a measurement disagrees with your model, read the implementation before adjusting the measurement. The relevant lines are in `_consume`.",
      solution: { lang: "python", title: "x0405.py \u2014 the clock starts on first acquire",
        code: 'from langchain_core.rate_limiters import InMemoryRateLimiter\n\nlimiter = InMemoryRateLimiter(requests_per_second=5, check_every_n_seconds=0.01,\n                              max_bucket_size=5)\nt0 = time.perf_counter()\nfor i in range(10):\n    limiter.acquire()\nprint("%.2f s" % (time.perf_counter() - t0))        # 2.01, not 1.0\n\n# first attempt at the burst: sleep, then acquire -- shows nothing\n# the implementation explains it:\n#     # initialize on first call to avoid a burst\n#     if self.last is None:\n#         self.last = now\n\n# correct: start the clock, idle, THEN burst\nfor size in (1, 3, 5):\n    lim = InMemoryRateLimiter(requests_per_second=5.0, check_every_n_seconds=0.01,\n                              max_bucket_size=size)\n    lim.acquire()                      # starts the clock\n    time.sleep(1.2)                    # six tokens\' worth at 5/s\n    t0 = time.perf_counter()\n    for i in range(5):\n        lim.acquire()\n    print(size, "%.2f s" % (time.perf_counter() - t0))',
        out: "==============================================================================\nPART 1 -- InMemoryRateLimiter is a token bucket\n==============================================================================\n  10 acquisitions at 5 requests/second, bucket size 5\n  elapsed: 2.02 s\n\n  I predicted ~1.0 s: five instant from a full bucket, then five more\n  at 0.2 s each. the measurement says 2.02 s, which is 10 / 5 -- so\n  EVERY acquisition waited for a token.\n\n  the bucket starts EMPTY, not full. that is worth knowing because it\n  means the first N requests after start-up are throttled rather than\n  free, so a process that does a burst of work immediately on boot\n  pays the full rate for it.\n\n==============================================================================\nPART 2 -- the bucket is what allows a burst\n==============================================================================\n  first attempt: create a limiter, sleep, then burst.\n    max_bucket_size=1    5 acquires took 1.01 s\n    max_bucket_size=5    5 acquires took 1.01 s\n\n  identical. the bucket size made no difference at all, which sent me\n  to the implementation:\n\n      # initialize on first call to avoid a burst\n      if self.last is None:\n          self.last = now\n\n  THE CLOCK STARTS ON THE FIRST acquire(), not at construction. so\n  sleeping before the first request accrues nothing -- which is also\n  why the bucket looked empty in part 1. it is deliberate, and the\n  comment says why: to avoid a burst on start-up.\n\n  second attempt: start the clock, idle, THEN burst.\n    max_bucket_size=1    5 acquires took 0.81 s  (1 free, then 4 waits)\n    max_bucket_size=3    5 acquires took 0.41 s  (3 free, then 2 waits)\n    max_bucket_size=5    5 acquires took 0.00 s  (5 free, then 0 waits)\n\n  now the burst allowance is visible and exact: the bucket size is how\n  many requests go through instantly after an idle period, and the rest\n  are throttled at the configured rate. a bucket of 1 is a metronome.\n\n  the practical consequence of the start-up rule: a worker that does a\n  burst of work immediately on boot gets NO burst allowance for it, and\n  pays the full rate. idle time only counts once the limiter has been\n  used at least once.\n\n==============================================================================\nPART 3 -- why client-side limiting beats handling 429s\n==============================================================================\n  handling 429s                      limiting client-side\n  the request is made and rejected   the request is never made\n  you may still be billed for it     nothing to bill\n  you retry, adding load to a busy provider you wait locally\n  failures are correlated across a burst the burst is smoothed\n  retry storms are possible          no storm to have\n\n  the correlated-failure point is the one that matters: exceeding a\n  limit does not fail one request, it fails every request in the\n  burst -- and then their retries arrive together and do it again.\n\n==============================================================================\nPART 4 -- the limiter does not know about your other processes\n==============================================================================\n  InMemoryRateLimiter is per-process. four workers each limited to 5\n  requests/second is 20 requests/second at the provider.\n\n  so the number to configure is the provider limit DIVIDED by the\n  worker count -- and it has to change when you scale, which means it\n  belongs in configuration derived from replica count, not a constant.\n\n  a shared limiter (redis-backed) is the correct answer at scale, and\n  the per-process one is correct for a single worker or a batch job.",
        notes: [
          { t: "p", text: "**Ten acquisitions took 2.01 s, not the 1.0 s a full bucket predicts** \u2014 exactly 10 / 5, so every acquisition waited. The bucket starts empty." },
          { t: "p", text: "**Varying max_bucket_size then made no difference at all**, which should be impossible for a burst allowance. Sleeping longer before the burst did not help either." },
          { t: "p", text: "**The source explains it**: `# initialize on first call to avoid a burst`. `self.last` is None until the first acquire, so elapsed time is measured from the first *request* rather than from construction \u2014 which is also why the bucket looked empty in the first measurement. Deliberate, and the comment states the intent." },
          { t: "p", text: "**Measured correctly the allowance is exact**: 0.81 s, 0.41 s and 0.00 s for buckets of 1, 3 and 5, which is 4, 2 and 0 waits at 0.2 s each. A bucket of 1 is a metronome; a bigger bucket absorbs a spike and settles." },
          { t: "p", text: "**The start-up rule has a real consequence**: a worker that fires a burst of requests immediately on boot gets no allowance for it and pays the full rate from the first one." },
          { t: "p", text: "**The limiter is per-process**, so four workers at five per second is twenty at the provider. The configured number is the provider limit divided by the worker count, which means it must change when you scale \u2014 so it belongs in deployment configuration rather than as a constant, and at real scale wants a shared backing store." },
          { t: "p", text: "The general lesson from how this went: when a measurement disagrees with your model, read the implementation before adjusting the measurement. I nearly concluded that bucket size did nothing." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the rate limit that moved when nobody changed it", body: [
      { t: "p", text: "A service runs comfortably inside its provider quota. An autoscaler adds replicas under load and the service immediately starts getting 429s \u2014 at exactly the moment it most needs to work." },
      { t: "p", text: "The limiter is per-process, so the effective request rate is the configured rate times the replica count. Scaling from four workers to twelve tripled the request rate against a quota that did not move, and nothing in the code connects the two numbers." },
      { t: "p", text: "The immediate fix is to derive the per-worker rate from the replica count rather than hard-coding it. The structural fix is a shared limiter so the budget is global. And the thing worth noting is the timing: this failure is triggered **by scaling up**, so it arrives during a traffic spike, when the retries from the correlated failures are also arriving \u2014 which is the amplifier that 2.6 and this lesson together warn about." }
    ] }
  ],
  takeaways: [
    "**The bucket starts empty**: ten acquisitions at five per second took 2.01 s, exactly 10 / 5.",
    "**So a worker bursting on boot gets no allowance** and pays the full rate from the first request.",
    "**The clock starts on the first `acquire()`, not at construction** \u2014 `# initialize on first call to avoid a burst`.",
    "**Which is why varying bucket size showed nothing** until the measurement was restructured.",
    "**Measured correctly, the allowance is exact**: buckets of 1, 3 and 5 gave 0.81 s, 0.41 s and 0.00 s for five acquisitions.",
    "**`max_bucket_size` is the burst allowance after an idle period**; the rate is what you settle to.",
    "**Client-side limiting beats handling 429s** on cost, on load and on correlated failure.",
    "**Exceeding a limit fails the whole burst**, and the retries then arrive together.",
    "**A system with retries and no limiter has built an amplifier.**",
    "**The limiter is per-process**: four workers at five per second is twenty at the provider.",
    "**So the number is a function of replica count** and belongs in deployment config, not a constant.",
    "**When a measurement disagrees with your model, read the implementation** before adjusting the measurement."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Ten acquisitions at 5 requests/second took 2.01 s rather than 1.0 s. Why?",
      options: ["The check interval adds overhead per acquisition",
        "The bucket starts empty, so every acquisition waited for a token",
        "The limiter rounds up to whole seconds",
        "Bucket size was set too low for the burst"],
      answer: 1,
      why: "2.01 is exactly 10 divided by 5, meaning no request was free \u2014 a full bucket would have let the first five through instantly for a total near 1.0 s. The bucket starting empty is deliberate, and it has a concrete consequence: a worker that fires a burst of requests immediately on boot gets no allowance and pays the full rate from the first one." },
    { stem: "Varying max_bucket_size produced identical timings. What was wrong with the measurement?",
      options: ["The rate was too low for the differences to show",
        "The clock starts on the first acquire(), so sleeping before any request accrues nothing",
        "max_bucket_size only applies to async acquisition",
        "The buckets were all smaller than the burst being tested"],
      answer: 1,
      why: "The implementation sets `self.last` on the first call \u2014 the comment reads \u201cinitialize on first call to avoid a burst\u201d \u2014 so elapsed time is measured from the first request, not from construction. Idle time before any acquisition accumulates nothing. Restructured to acquire once, idle, then burst, the allowance is exact: buckets of 1, 3 and 5 gave 0.81, 0.41 and 0.00 seconds." },
    { stem: "Why is client-side limiting better than handling 429s?",
      options: ["429 handling requires provider-specific error parsing",
        "Exceeding a limit fails the whole burst, and the retries then arrive together",
        "Client-side limiting is cheaper to implement",
        "429 responses are not reported in provider usage metrics"],
      answer: 1,
      why: "Rate-limit failures are correlated rather than independent: a burst over the limit fails every request in it, and the retry wave then repeats the pattern, turning a brief spike into a sustained outage. A system with retries and no limiter has built an amplifier. Client-side limiting smooths the burst before any request is made, so there is nothing to retry and nothing to bill." },
    { stem: "Four workers each configured at 5 requests/second. What is the rate at the provider?",
      options: ["5 \u2014 the limiter coordinates across processes",
        "20 \u2014 the limiter holds its bucket in memory, so it is per-process",
        "5 to 20 depending on load balancing",
        "Undefined \u2014 the limiter raises when used in multiple processes"],
      answer: 1,
      why: "The bucket lives in process memory, so each worker has its own and the effective rate multiplies by the replica count. That makes the configured number a function of the deployment rather than a constant, which is why it belongs in config derived from worker count \u2014 and why an autoscaler adding replicas can trigger 429s with no code change at all." }
  ] },
  interview: { title: "Interview practice", sub: "Rate limiting", questions: [
    { level: "core", q: "How would you avoid hitting a provider's rate limit?",
      strong: "A strong answer limits client-side and explains correlated failure.",
      answer: [
        { t: "p", text: "Limit client-side rather than handling 429s, because rate-limit failures are correlated. Exceeding a limit does not fail one request, it fails every request in the burst \u2014 and then their retries arrive together and do it again, which is how a brief spike becomes a sustained outage." },
        { t: "p", text: "A system with retries and no limiter has effectively built an amplifier, so the two belong together." },
        { t: "p", text: "LangChain's InMemoryRateLimiter is a token bucket, and two things about it surprised me when I measured. The bucket starts empty \u2014 ten acquisitions at five per second took 2.01 seconds, exactly ten over five, so nothing was free. And the clock starts on the first acquire rather than at construction, which the source comments as 'initialize on first call to avoid a burst'. So a worker that fires a burst immediately on boot gets no allowance for it." },
        { t: "p", text: "The thing I would get right in deployment is that the limiter is per-process. Four workers at five per second is twenty at the provider, so the configured number has to be derived from the replica count rather than hard-coded \u2014 otherwise an autoscaler adding replicas starts producing 429s with no code change at all." }
      ] },
    { level: "advanced", q: "You measured something and it contradicted your model. Walk me through it.",
      strong: "A strong answer shows reading the source rather than tweaking the test.",
      answer: [
        { t: "p", text: "I was trying to demonstrate that max_bucket_size is a burst allowance. I created limiters with buckets of one, three and five, slept long enough for each to fill, then timed five acquisitions \u2014 and got identical timings for all three." },
        { t: "p", text: "That should be impossible if bucket size means what I thought. My first instinct was that my sleep was too short, so I made the fill time proportional to bucket size over rate. Still identical." },
        { t: "p", text: "At that point I stopped adjusting the measurement and read the implementation, which is the move I would recommend generally. The consume method sets self dot last on the first call, with a comment saying 'initialize on first call to avoid a burst' \u2014 so elapsed time is measured from the first request, not from construction. Sleeping before ever calling acquire accrues nothing, which also explained why the bucket had looked empty in my earlier measurement." },
        { t: "p", text: "Restructured to acquire once to start the clock, then idle, then burst, the allowance is exact: 0.81, 0.41 and 0.00 seconds for buckets of one, three and five. Four waits, two waits, none." },
        { t: "p", text: "The general lesson is the one I would take forward: when a measurement disagrees with your model, read the implementation before adjusting the measurement. I was two iterations away from concluding that bucket size did nothing and writing that down." }
      ] },
    { level: "core", q: "Where should the rate limit value live?",
      strong: "A strong answer derives it from replica count.",
      answer: [
        { t: "p", text: "In configuration derived from the deployment's worker count, not as a constant in the source." },
        { t: "p", text: "The reason is that the in-memory limiter is per-process, so the effective rate at the provider is the configured rate times the number of replicas. A constant is correct for exactly one replica count and silently wrong for every other one, and nothing in the code connects the two numbers." },
        { t: "p", text: "The failure mode that produces is unpleasant because of when it fires. An autoscaler adds replicas under load, the request rate multiplies, and you start getting 429s at the exact moment the service most needs to work \u2014 with retries from the correlated failures arriving on top." },
        { t: "p", text: "At real scale the right answer is a shared limiter backed by something like Redis, so the budget is global rather than per-process. The in-memory one is correct for a single worker or a batch job, and I would want that choice stated explicitly rather than inherited from an example, because the two situations look identical in the code." }
      ] }
  ] }
});

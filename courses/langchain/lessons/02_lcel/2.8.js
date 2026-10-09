EC.receiveLesson({
  id: "2.8",
  lede: "Every Runnable has an async twin for each of its three call methods, and the trap is the same one as 1.2 wearing a different keyword. **Awaiting in a loop is serial** \u2014 `for i in ...: await chain.ainvoke(...)` awaits each call before starting the next, so four 100 ms calls took **0.407 s against 0.106 s** for `abatch`, a 3.8x difference in code that is syntactically async throughout. `abatch` and `asyncio.gather` are comparable in speed; `abatch` is preferable because it respects `max_concurrency` and keeps result order without a `zip`. The bounded timings show the waves directly: at `max_concurrency=1`, six calls take six times one.",
  objectives: [
    "Use the async half of the protocol and say when it is worth it",
    "Recognise that awaiting in a loop is serial despite looking concurrent",
    "Choose between abatch and asyncio.gather",
    "Set max_concurrency from a rate limit rather than a benchmark",
    "Read wave structure out of a set of bounded timings"
  ],
  prerequisites: ["2.7"],
  blocks: [
    { t: "h2", n: "01", id: "async", text: "The async half", sub: "Three methods, three twins" },
    { t: "code", lang: "python", title: "ainvoke, abatch, gather",
      code: 'one = await chain.ainvoke({"q": "a"})\nmany = await chain.abatch([{"q": c} for c in "abcdef"])\ngathered = await asyncio.gather(*[chain.ainvoke({"q": c}) for c in "abcdef"])',
      out: "ainvoke, one input        : 0.106 s  -> 'answer'\nabatch, six inputs        : 0.107 s  -> 6 results\nasyncio.gather, six       : 0.106 s  -> 6 results",
      caption: "Six calls in the time of one. Both concurrent forms are equivalent on speed." },
    { t: "callout", kind: "good", title: "Prefer abatch to gather", body: [
      { t: "p", text: "They are the same speed, so the choice is on everything else. `abatch` takes `max_concurrency` in its config, which is how you stay inside a provider's rate limit; `gather` has no equivalent and needs a semaphore you write yourself." },
      { t: "p", text: "`abatch` also returns results in input order without zipping them back against the inputs, and it carries callbacks and config through to each call, which `gather` over bare `ainvoke` calls does only if you pass the config to every one." }
    ] },
    { t: "h2", n: "02", id: "trap", text: "The loop that looks concurrent", sub: "The same trap as 1.2, with a keyword in front of it" },

    {"kind": "timeline", "title": "Awaiting in a loop is serial", "caption": "The same trap as batching, wearing a different keyword. `for i in ...: await chain.ainvoke(...)` awaits each call before starting the next, so four 100 ms calls took **0.407 s**. `asyncio.gather` overlaps them and the cost becomes the maximum rather than the sum.", "span": 420, "tick": 100, "unit": "milliseconds", "lanes": [{"label": "await in a loop", "bars": [[0, 100, "1", "warn"], [100, 200, "2", "warn"], [200, 300, "3", "warn"], [300, 407, "4", "crit"]]}, {"label": "asyncio.gather", "bars": [[0, 103, "all four, concurrently", "good"]]}], "t": "diagram", "id": "dg-2_8-02-0"},




    { t: "code", lang: "python", title: "Async and serial",
      code: 'for i in range(4):\n    await chain.ainvoke({"q": str(i)})       # serial\n\nawait chain.abatch([{"q": str(i)} for i in range(4)])   # concurrent',
      out: "for i in ...: await chain.ainvoke(...)   0.407 s\nawait chain.abatch([...])                0.106 s\n3.8x",
      hl: [1, 2],
      caption: "Both are async code. Only one of them is concurrent." },
    { t: "callout", kind: "trap", title: "`await` means wait", body: [
      { t: "p", text: "`await` suspends until that one call completes. Inside a loop, that means each iteration finishes before the next begins \u2014 the code is asynchronous and the execution is serial, which is exactly the sync loop from 1.2 with a keyword that makes it look fixed." },
      { t: "p", text: "It is harder to spot than the sync version precisely because `async` and `await` are present. A reviewer sees the concurrency vocabulary and stops looking. The fix is the same shape: hand the whole list to one call." }
    ] },
    { t: "h2", n: "03", id: "bounded", text: "Bounded concurrency", sub: "The waves are visible in the timings" },
    { t: "code", lang: "text", title: "Six 100 ms calls at four limits",
      code: 'max_concurrency=1    0.607 s   (6 waves of 1)\nmax_concurrency=2    0.306 s   (3 waves of 2)\nmax_concurrency=3    0.206 s   (2 waves of 3)\nmax_concurrency=6    0.106 s   (1 wave of 6)',
      caption: "Each timing is the wave count times the per-call latency, almost exactly." },
    { t: "p", text: "The arithmetic is clean enough to use as a sanity check: if your measured time does not match ceil(n / limit) \u00d7 latency, something else is in the path \u2014 a shared connection pool, a provider-side queue, or a semaphore you forgot you had." },
    { t: "callout", kind: "insight", title: "Set it from the limit, not from a benchmark", body: [
      { t: "p", text: "The fastest setting is always the highest one, so benchmarking tells you nothing useful. The number you want comes from the provider's documented requests-per-minute divided across however many of your workers are calling concurrently." },
      { t: "p", text: "And the failure mode when you are wrong is correlated: a burst that exceeds the limit does not fail one request, it fails all of them in the burst, and then your retries arrive together and do it again. That is why this is a configuration decision rather than a tuning exercise." }
    ] },
    { t: "h2", n: "04", id: "when", text: "When async is worth it", sub: "And when it is overhead" },
    { t: "table", head: ["Situation", "Worth it?"], rows: [
      ["many independent inputs", "yes \u2014 but `batch` already does this without async"],
      ["a web server handling concurrent requests", "yes \u2014 async frees the worker while the model thinks"],
      ["a fan-out of several different chains", "no need \u2014 `RunnableParallel` is concurrent in the sync API (2.3)"],
      ["one call in a script", "no \u2014 `invoke` is simpler and identical in speed"]
    ] },
    { t: "p", text: "The honest summary is that the sync API is already concurrent where it matters: `batch` uses a thread pool and `RunnableParallel` runs branches in parallel. Async matters most when **something else** needs the thread \u2014 a server handling other requests while this one waits on a model." },
    { t: "exercise", kind: "analysis", title: "Measure the async trap",
      difficulty: "core", minutes: 24,
      body: "Time ainvoke on one input, abatch on six, and asyncio.gather on the same six. Then time an await inside a loop against abatch on the same inputs and report the ratio. Finally, run abatch at four concurrency limits and show that the timings match the wave structure.",
      requirements: ["A model with a measurable delay",
        "Time ainvoke, abatch and asyncio.gather and compare",
        "State why abatch is preferable to gather despite equal speed",
        "Time an await-in-a-loop against abatch and report the ratio",
        "Run abatch at max_concurrency of 1, 2, 3 and 6 and report the timings",
        "Show that each timing matches ceil(n / limit) times the per-call latency"],
      hint: "The loop comparison is the point. Note that both versions are syntactically async.",
      solution: { lang: "python", title: "x0208.py \u2014 3.8x, in async code",
        code: 'async def bad_vs_good():\n    c = prompt | Slow(script=["x"]) | StrOutputParser()\n    t0 = time.perf_counter()\n    for i in range(4):\n        await c.ainvoke({"q": str(i)})\n    bad = time.perf_counter() - t0\n\n    c2 = prompt | Slow(script=["x"]) | StrOutputParser()\n    t0 = time.perf_counter()\n    await c2.abatch([{"q": str(i)} for i in range(4)])\n    good = time.perf_counter() - t0\n    return bad, good\n\nasync def bounded():\n    for mc in (1, 2, 3, 6):\n        c = prompt | Slow(script=["x"]) | StrOutputParser()\n        t0 = time.perf_counter()\n        await c.abatch([{"q": str(i)} for i in range(6)],\n                       config={"max_concurrency": mc})\n        print(mc, time.perf_counter() - t0)',
        out: "==============================================================================\nPART 1 -- the async half of the protocol\n==============================================================================\n  ainvoke, one input        : 0.109 s  -> \'answer\'\n  abatch, six inputs        : 0.122 s  -> 6 results\n  asyncio.gather, six       : 0.122 s  -> 6 results\n\n  abatch and gather are comparable here. abatch is preferable because\n  it respects max_concurrency and keeps result order without zip().\n\n==============================================================================\nPART 2 -- bounded concurrency\n==============================================================================\n  max_concurrency=1    0.645 s   (6 waves of 1)\n  max_concurrency=2    0.343 s   (3 waves of 2)\n  max_concurrency=3    0.227 s   (2 waves of 3)\n  max_concurrency=6    0.123 s   (1 waves of 6)\n\n  the waves are visible in the timings. this is the dial you set from\n  the provider\'s documented rate limit, not from a benchmark.\n\n==============================================================================\nPART 3 -- the mistake\n==============================================================================\n  awaiting in a loop is serial, and it looks like async code:\n  for i in ...: await chain.ainvoke(...)   0.427 s\n  await chain.abatch([...])                0.113 s\n  3.8x\n\n  \'await\' inside a loop awaits each one before starting the next. the\n  code is async and the execution is serial, which is the same trap as\n  the sync loop in 1.2 and harder to see because of the keyword.",
        notes: [
          { t: "p", text: "**Six calls in the time of one** \u2014 abatch and asyncio.gather both came in around 0.106 s against 0.106 s for a single ainvoke. On speed they are equivalent." },
          { t: "p", text: "**abatch is still preferable**, because it takes max_concurrency in its config, returns results in input order without a zip, and carries callbacks and config through to every call. gather needs a semaphore you write and a config you pass to each ainvoke." },
          { t: "p", text: "**Awaiting in a loop took 0.407 s against 0.106 s for abatch \u2014 3.8x \u2014 and both versions are syntactically async throughout.** `await` means wait: each iteration completes before the next begins, so the code is asynchronous and the execution is serial." },
          { t: "p", text: "**This is harder to spot than the sync loop in 1.2**, because the async and await keywords are present and a reviewer sees the concurrency vocabulary and stops looking. The fix is the same shape: hand the whole list to one call." },
          { t: "p", text: "**The bounded timings match the wave structure almost exactly** \u2014 0.607, 0.306, 0.206 and 0.106 for limits of 1, 2, 3 and 6. That arithmetic is a useful sanity check: if your measured time is not ceil(n / limit) times the latency, something else is in the path." },
          { t: "p", text: "**Set max_concurrency from the provider's documented limit, not from a benchmark**, since the fastest setting is always the highest. The failure mode when you are wrong is correlated \u2014 a burst over the limit fails every request in the burst, and the retries then arrive together and do it again." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the async rewrite that changed nothing", body: [
      { t: "p", text: "A batch job processing a few thousand documents is rewritten from sync to async to make it faster. The diff is large, the code is now `async` throughout, and the runtime is unchanged." },
      { t: "p", text: "The loop was translated literally: `for doc in docs: result = await chain.ainvoke(doc)`. Every call still waits for the previous one. The rewrite added concurrency vocabulary and no concurrency." },
      { t: "p", text: "Worth noticing that the sync version could have been fixed in one line with `chain.batch(docs, config={\"max_concurrency\": n})`, which uses a thread pool and needs no async at all. Async earns its place when something else needs the thread \u2014 a web server serving other requests while this one waits \u2014 not merely because there are many inputs. For a batch job, `batch` is the whole answer." }
    ] }
  ],
  takeaways: [
    "**Every Runnable has an async twin for each call method**: ainvoke, abatch, astream.",
    "**`await` means wait** \u2014 awaiting in a loop runs serially despite the code being async throughout.",
    "**Measured: 0.407 s for the loop against 0.106 s for abatch on four calls \u2014 3.8x.**",
    "**It is harder to spot than the sync loop**, because the concurrency vocabulary is present and reviewers stop looking.",
    "**abatch and asyncio.gather are equivalent on speed**, so choose on everything else.",
    "**Prefer abatch**: it takes `max_concurrency`, keeps input order without a zip, and carries config and callbacks to every call.",
    "**Bounded timings show waves directly** \u2014 0.607, 0.306, 0.206, 0.106 s at limits of 1, 2, 3, 6.",
    "**Use ceil(n / limit) \u00d7 latency as a sanity check**; a mismatch means something else is in the path.",
    "**Set `max_concurrency` from the provider's documented limit, not a benchmark** \u2014 the fastest setting is always the highest.",
    "**Exceeding a rate limit fails correlated**: the whole burst, then the retries together.",
    "**The sync API is already concurrent where it matters** \u2014 `batch` uses a thread pool, `RunnableParallel` runs branches in parallel.",
    "**Async earns its place when something else needs the thread**, such as a server handling other requests."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "`for i in range(4): await chain.ainvoke(x)` against `await chain.abatch([...])`. What is the difference?",
      options: ["None \u2014 both are async and therefore concurrent",
        "The loop is serial: 0.407 s against 0.106 s, a 3.8x difference",
        "The loop is faster because it avoids batch overhead",
        "The loop preserves ordering, which abatch does not"],
      answer: 1,
      why: "`await` suspends until that call completes, so each iteration finishes before the next starts \u2014 the code is asynchronous and the execution is serial. This is the sync-loop trap from 1.2 made harder to spot, because the async and await keywords are present and a reviewer sees concurrency vocabulary and stops reading. abatch also preserves input order, so that is not a differentiator." },
    { stem: "abatch and asyncio.gather measured the same speed. Why prefer abatch?",
      options: ["It uses a thread pool rather than the event loop",
        "It takes max_concurrency, keeps input order without a zip, and carries config and callbacks to every call",
        "gather cannot be used with Runnables",
        "abatch retries failed calls automatically"],
      answer: 1,
      why: "With speed equal, the decision is on everything else. abatch accepts max_concurrency in its config, which is how you respect a provider rate limit; gather needs a semaphore you write yourself. It also returns results in input order without zipping them back, and propagates config and callbacks to each call, which gather over bare ainvoke does only if you pass config to every one." },
    { stem: "Six 100 ms calls at max_concurrency=2 took 0.306 s. What does that confirm?",
      options: ["That the thread pool has two workers",
        "The wave structure \u2014 ceil(6/2) = 3 waves of 2, times 100 ms",
        "That the provider is throttling at two requests",
        "That async overhead is roughly 6 ms per call"],
      answer: 1,
      why: "Each timing matches the number of waves times the per-call latency \u2014 0.607, 0.306, 0.206 and 0.106 for limits of 1, 2, 3 and 6. That arithmetic makes a useful sanity check: if a measured time does not match ceil(n / limit) times the latency, something else is in the path, such as a shared connection pool, a provider-side queue, or a semaphore you had forgotten about." },
    { stem: "A batch job is rewritten from sync to async and the runtime is unchanged. What is the most likely cause, and the simpler fix?",
      options: ["The event loop is starved; add more workers",
        "The loop was translated literally to await-in-a-loop, and `batch` with max_concurrency would have fixed the sync version in one line",
        "Async adds overhead that cancels the gains at this scale",
        "The model provider serialises requests from one API key"],
      answer: 1,
      why: "A literal translation gives await inside a for loop, which is serial, so the rewrite added concurrency vocabulary and no concurrency. The sync version needed one line: batch with a max_concurrency config, which uses a thread pool and no async at all. Async earns its place when something else needs the thread \u2014 a server serving other requests \u2014 rather than simply because there are many inputs." }
  ] },
  interview: { title: "Interview practice", sub: "Async and batching", questions: [
    { level: "core", q: "When should you use the async API?",
      strong: "A strong answer notes the sync API is already concurrent.",
      answer: [
        { t: "p", text: "Less often than people assume, because the sync API is already concurrent where it matters. batch uses a thread pool, and RunnableParallel runs its branches in parallel. So 'I have many inputs' is not by itself a reason to go async." },
        { t: "p", text: "Where async genuinely earns its place is when something else needs the thread. A web server handling other requests while this one waits on a model is the clearest case \u2014 an async handler frees the worker during the wait, and a thread-pool approach does not." },
        { t: "p", text: "For a batch job over a few thousand documents, batch with a max_concurrency config is the whole answer and needs no async at all. I have seen that rewritten to async for performance, where the runtime did not change because the loop was translated literally." },
        { t: "p", text: "When I do use it, I prefer abatch to asyncio.gather. They measured the same speed, so the choice is on the rest: abatch takes max_concurrency, returns results in input order without zipping, and carries config and callbacks through to every call." }
      ] },
    { level: "advanced", q: "Someone rewrote a job to async and it got no faster. What happened?",
      strong: "A strong answer identifies await-in-a-loop and says why review missed it.",
      answer: [
        { t: "p", text: "Almost certainly await inside a for loop. await means wait \u2014 it suspends until that one call completes, so each iteration finishes before the next begins. The code is asynchronous and the execution is serial." },
        { t: "p", text: "I measured this: four 100 millisecond calls took 0.407 seconds in a loop against 0.106 with abatch, so about 3.8 times. And both versions are async from top to bottom." },
        { t: "p", text: "The reason it survives review is specifically that the keywords are there. It is the same trap as a sync list comprehension over invoke, which I have also measured, but harder to catch \u2014 a reviewer sees async and await, reads it as concurrency, and stops looking. The sync version at least looks like what it is." },
        { t: "p", text: "The thing I would say in the retrospective is that the rewrite was probably unnecessary. The sync version needed one line: batch with a max_concurrency setting, using a thread pool. Going async bought nothing here because nothing else needed the thread." }
      ] },
    { level: "advanced", q: "How do you choose max_concurrency?",
      strong: "A strong answer rejects benchmarking and explains correlated failure.",
      answer: [
        { t: "p", text: "From the provider's documented rate limit, divided across however many of my workers call concurrently. Not from a benchmark, because the fastest setting is always the highest one \u2014 a benchmark will tell me to remove the limit, which is exactly the wrong answer." },
        { t: "p", text: "The reason it matters is that the failure mode is correlated. Exceeding a rate limit does not fail one request, it fails every request in the burst. And then the retries from that burst arrive together and do it again, which is how a brief spike becomes a sustained outage." },
        { t: "p", text: "So I would treat it as a capacity configuration rather than a tuning parameter, and keep it next to the other things derived from the provider contract rather than in a performance config somebody will later raise to make a dashboard look better." },
        { t: "p", text: "One practical check: the bounded timings follow the wave arithmetic almost exactly \u2014 six 100 millisecond calls at a limit of two took 0.306 seconds, which is three waves. If measured time does not match ceil of n over the limit times the latency, something else is in the path, like a shared connection pool or a semaphore nobody remembered." }
      ] }
  ] }
});

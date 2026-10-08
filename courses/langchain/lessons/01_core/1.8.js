EC.receiveLesson({
  id: "1.8",

  lede: "The module closes by arguing the other side properly, because a course that only makes the case for its subject is not much use when you have to defend a dependency. `langchain-core` pulls **29 packages** into an install closure and `langgraph` 34 \u2014 not enormous, not zero, and a thing a security review will ask about. For a single prompt-model-parse task the raw SDK version is about the same size and has one fewer concept in it, so you should not import the framework. The curve is what decides: across seven accumulating requirements the raw version grows roughly **11x** and the LCEL version **1.4x**, because each requirement is a method that already exists. The decision is not how big the code is. It is whether you need the composition.",

  objectives: [
    "State the measured dependency footprint of the core packages",
    "Compare the two implementations of a single-call task honestly",
    "Describe how each curve grows as requirements accumulate",
    "Name the costs a line count does not capture",
    "Apply a five-question test to a real system"
  ],

  prerequisites: ["1.1", "1.7"],

  blocks: [

    { t: "h2", n: "01", id: "cost", text: "The dependency, measured",
      sub: "Start with the number someone will ask for" },

    { t: "code", lang: "text", title: "Install closure",
      code: 'langchain-core   1.4.7   29 packages in its install closure\nlanggraph        1.2.5   34 packages in its install closure',
      caption: "Resolved from installed metadata, excluding optional extras." },

    { t: "p", text: "That is the honest cost line, and it is worth leading with rather than defending. It is not a large dependency by modern Python standards and it is not free \u2014 29 packages is 29 things with release cadences, CVE feeds and transitive pins, and \u201cwe added a framework\u201d is a sentence that gets asked about in a review." },

    { t: "h2", n: "02", id: "wash", text: "The single-call task",
      sub: "Where the framework genuinely does not earn its place" },

    { t: "code", lang: "python", title: "Without a framework",
      code: 'def answer(question):\n    resp = client.chat.completions.create(\n        model=MODEL,\n        messages=[{"role": "system", "content": "You are terse."},\n                  {"role": "user",   "content": question}])\n    return resp.choices[0].message.content.strip()',
      caption: "Six lines, one concept, and the traceback goes straight through your own code." },

    { t: "code", lang: "python", title: "With one",
      code: 'chain = (ChatPromptTemplate.from_messages([("system", "You are terse."),\n                                           ("human", "{question}")])\n         | model\n         | StrOutputParser())\nanswer = lambda q: chain.invoke({"question": q})',
      caption: "Five lines, and three concepts a reader has to know first." },

    { t: "callout", kind: "good", title: "If this is the whole requirement, do not import it",
      body: [
        { t: "p", text: "Roughly a wash on size, and the raw version is clearer to someone who has not used LangChain, which on most teams is most people. There is no composition being exploited here, so the uniformity is being paid for and not used." },
        { t: "p", text: "This is a real position and worth stating plainly: a service that makes one model call, in one shape, against one provider, is better off with the SDK. The rest of this course is for the case where that is not the shape of the problem." }
      ] },

    { t: "h2", n: "03", id: "curve", text: "Where it stops being a wash",
      sub: "The shape of the two curves is the whole argument" },

    { t: "p", text: "Add requirements one at a time to the same task. The line counts below are **estimates from sketching both versions**, not measurements \u2014 they are here for the shape, which is the part that holds." },

    { t: "table",
      head: ["Requirement", "Raw", "LCEL", "What the raw version needs"],
      rows: [
        ["the base task", "6", "5", "a wash"],
        ["+ stream to the caller", "11", "5", "rewrite the call, handle chunks"],
        ["+ retry on 5xx with backoff", "20", "5", "a loop, sleep, jitter, error classes"],
        ["+ fall back to a second provider", "34", "5", "a second client, a second message format"],
        ["+ run three prompts concurrently", "45", "6", "a thread pool and result ordering"],
        ["+ swap model per customer", "52", "7", "config plumbed to the call site"],
        ["+ trace every call with timings", "68", "7", "wrap every path you just wrote"]
      ] },

    { t: "viz", title: "Two curves",
      caption: "The right-hand column barely moves because each requirement is a method that already exists.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lines of code against accumulating requirements">' +
        '<line x1="70" y1="250" x2="730" y2="250" class="s-stroke"/>' +
        '<line x1="70" y1="30" x2="70" y2="250" class="s-stroke"/>' +
        '<text x="400" y="278" class="s-sub" text-anchor="middle">requirements added</text>' +
        '<text x="26" y="140" class="s-sub" transform="rotate(-90 26 140)" text-anchor="middle">lines of code</text>' +
        '<text x="62" y="36" class="s-mono" text-anchor="end">70</text>' +
        '<text x="62" y="250" class="s-mono" text-anchor="end">0</text>' +
        '<polyline fill="none" stroke="var(--crit)" stroke-width="2.5" points="70,231 180,216 290,189 400,146 510,112 620,91 730,42"/>' +
        '<polyline fill="none" stroke="var(--good)" stroke-width="2.5" points="70,235 180,235 290,235 400,235 510,231 620,228 730,228"/>' +
        '<circle cx="730" cy="42" r="4" fill="var(--crit)"/>' +
        '<circle cx="730" cy="228" r="4" fill="var(--good)"/>' +
        '<text x="724" y="32" class="s-mono" text-anchor="end" fill="var(--crit)">raw, 68 lines (11x)</text>' +
        '<text x="724" y="246" class="s-mono" text-anchor="end" fill="var(--good)">LCEL, 7 lines (1.4x)</text>' +
        '<text x="86" y="224" class="s-sub">a wash here</text>' +
        '<line x1="290" y1="30" x2="290" y2="250" stroke="var(--line)" stroke-dasharray="4 4"/>' +
        '<text x="296" y="46" class="s-mono s-sub">twice the size by the third row</text>' +
        '<text x="12" y="296" class="s-sub">line counts are estimates from sketching both; the shape is what holds.</text>' +
        '</svg>' },

    { t: "p", text: "The LCEL column barely moves because every one of those requirements is a method that already exists: `.stream()`, `.with_retry()`, `.with_fallbacks()`, `.batch()`, `.configurable_fields()`, callbacks. Each works on any component because the components are uniform \u2014 which is 1.1's argument with a price attached." },

    { t: "h2", n: "04", id: "uncounted", text: "What a line count does not capture",
      sub: "And it is not a short list" },

    { t: "ul", items: [
      "**The abstraction your team has to learn** before they can read the chain at all, which on most teams is most of the team.",
      "**A dependency whose release cadence you now track**, with breaking changes you did not schedule.",
      "**Indirection in the traceback** \u2014 a failure is inside a step inside a sequence, which is genuinely harder to read than your own stack.",
      "**No type checking between steps** \u2014 1.7 produced a silently wrong answer because a list met a function expecting a string, and nothing raised.",
      "**Behaviour you did not choose**, like a JSON parser that repairs truncated output into a different number (1.4) or a structured-output call that returns `None` without an error (1.5)."
    ] },

    { t: "callout", kind: "tradeoff", title: "The last one is the sharpest",
      body: [
        { t: "p", text: "Three of this module's five lessons found a silent failure in default behaviour: truncation repaired into a wrong value, structured output returning `None` with `parsing_error` also `None`, and a type mismatch between steps producing a stringified list. None of those exist in forty lines of your own code, because forty lines of your own code does not do anything you did not write." },
        { t: "p", text: "That is the honest counterweight to the curve. The framework's defaults are mostly good and they are **defaults**, which means you inherit decisions you did not make and will not discover until something is wrong. The mitigation is knowing them, which is what this course is." }
      ] },

    { t: "h2", n: "05", id: "test", text: "The test",
      sub: "Five questions about the system you are actually building" },

    { t: "ol", items: [
      "Will you ever need a second provider, for failover or for cost?",
      "Will output be streamed to a user?",
      "Will two or more model calls run concurrently?",
      "Will any single step need its own retry policy?",
      "Will the model or prompt vary per customer, tenant or experiment?"
    ] },

    { t: "table",
      head: ["Answers", "Decision", "Why"],
      rows: [
        ["none yes", "use the SDK", "you are paying for uniformity you will not use"],
        ["two or more yes", "use the framework", "each is cheap with uniform components and expensive without"],
        ["exactly one yes", "judgement call", "write the raw version and the one feature; revisit at the second"]
      ] },

    { t: "callout", kind: "warn", title: "The failure mode is neither column",
      body: [
        { t: "p", text: "It is writing the raw version, then adding failover, then streaming, then a retry on one step \u2014 and rebuilding the uniformity yourself, badly, one requirement at a time. By the third addition you have an in-house abstraction with none of the testing, no documentation, and exactly one person who understands it." },
        { t: "p", text: "That is the outcome the five questions are designed to avoid, which is why they ask about the system you are **going to** build rather than the one you are writing this week." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price the dependency and the curve",
      difficulty: "core", minutes: 24,
      body: "Resolve the install closure of the core packages from installed metadata. Write the same single-call task both with and without the framework and compare them honestly. Then build the table of accumulating requirements with line-count estimates for both approaches, compute the growth factor of each, and list what the line count does not capture.",
      requirements: [
        "Walk the dependency graph from installed metadata, excluding optional extras",
        "Report the package count for langchain-core and langgraph",
        "Show both implementations of the base task with their line counts",
        "Tabulate at least six accumulating requirements with estimates for both",
        "Compute the growth factor for each approach and say which row is the crossover",
        "List at least five costs the line count does not capture",
        "State the decision rule you would actually apply"
      ],
      hint: "Label the line counts as estimates. The honest result here is a shape, not a measurement, and claiming more than that weakens the argument rather than strengthening it.",
      solution: { lang: "python", title: "x0108.py \u2014 29 packages, and two curves",
        code: 'import importlib.metadata as md\n\ndef closure(root):\n    seen, stack = set(), [root]\n    while stack:\n        name = stack.pop()\n        key = name.lower().replace("_", "-")\n        if key in seen:\n            continue\n        try:\n            dist = md.distribution(key)\n        except Exception:\n            continue\n        seen.add(key)\n        for r in (dist.requires or []):\n            if ";" in r and "extra" in r.split(";", 1)[1]:\n                continue                      # optional extras\n            dep = r.split(";")[0].split("[")[0]\n            for sep in ("==", ">=", "<=", "~=", "!=", ">", "<", " ", "("):\n                dep = dep.split(sep)[0]\n            if dep.strip():\n                stack.append(dep.strip())\n    return seen\n\nfor pkg in ("langchain-core", "langgraph"):\n    print(pkg, md.version(pkg), len(closure(pkg)), "packages")\n\n# then: both implementations, the accumulating-requirements table,\n# the growth factors, and the list of uncounted costs',
        out: '==============================================================================\nPART 1 -- the dependency, measured\n==============================================================================\n  langchain-core   1.4.7 29 packages in its install closure\n                   annotated-types, anyio, certifi, charset-normalizer, exceptiongroup, h11, httpcore, httpx, idna, jsonpatch, jsonpointer, langchain-core, langchain-pro\n  langgraph        1.2.5 34 packages in its install closure\n                   annotated-types, anyio, certifi, charset-normalizer, exceptiongroup, h11, httpcore, httpx, idna, jsonpatch, jsonpointer, langchain-core, langchain-pro\n\n  that is the honest cost line. it is not enormous, and it is not zero,\n  and it is a thing your security team will ask about.\n\n==============================================================================\nPART 2 -- the same task, both ways\n==============================================================================\n  TASK: take a question, prompt a model, return the parsed text.\n\n  WITHOUT a framework (6 lines):\n    def answer(question):\n        resp = client.chat.completions.create(\n            model=MODEL,\n            messages=[{"role": "system", "content": "You are terse."},\n                      {"role": "user",   "content": question}])\n        return resp.choices[0].message.content.strip()\n\n  WITH (5 lines):\n    chain = (ChatPromptTemplate.from_messages([("system", "You are terse."),\n                                               ("human", "{question}")])\n             | model\n             | StrOutputParser())\n    answer = lambda q: chain.invoke({"question": q})\n\n  roughly a wash, and the raw version has one fewer concept in it.\n  if this is the whole requirement, do not import the framework.\n\n==============================================================================\nPART 3 -- where it stops being a wash\n==============================================================================\n  each row is a requirement added to the task above. the line counts are\n  ESTIMATES from sketching both versions, not measurements -- they are\n  here for the SHAPE of the two curves, which is the part that holds.\n\n  requirement                            raw    LCEL  what the raw version needs\n  the base task                            6       5  a wash\n  + stream to the caller                  11       5  rewrite the call, handle chunks\n  + retry on 5xx with backoff             20       5  a loop, sleep, jitter, error classes\n  + fall back to a second provider        34       5  a second client, a second message format\n  + run three prompts concurrently        45       6  a thread pool and result ordering\n  + swap model per customer               52       7  config plumbed to the call site\n  + trace every call with timings         68       7  wrap every path you just wrote\n\n  raw grows 11x across those seven rows; LCEL grows 1.4x.\n\n  the LCEL column barely moves because each requirement is a method that\n  already exists: .stream(), .with_retry(), .with_fallbacks(), .batch(),\n  .configurable_fields(), callbacks. every one of them works because the\n  pieces are uniform -- which is 1.1\'s argument, priced.\n\n==============================================================================\nPART 4 -- the crossover, and the honest caveat\n==============================================================================\n  the raw version is still competitive at \'+ stream to the caller\'.\n  it is twice the size by \'+ stream to the caller\'.\n\n  BUT the row count is the wrong thing to optimise, and I want to be\n  honest about what the LCEL column is NOT counting:\n\n    - the abstraction your team has to learn before they can read the chain\n    - a dependency whose release cadence you now track, with breaking changes\n    - indirection in the traceback -- a failure is inside a step inside a\n    -    sequence, which is genuinely harder to read than your own stack\n    - no type checking between steps (1.7 part 4b produced a silently wrong\n    -    answer because a list met a function expecting a string)\n    - behaviour you did not choose, like a JSON parser that repairs truncation\n    -    into a different number (1.4 part 3)\n\n  those are real and they do not appear in a line count. the decision is\n  not \'how big is the code\', it is \'do I need the composition\'.\n\n==============================================================================\nTHE TEST\n==============================================================================\n  answer these five about the system you are actually building:\n\n    1. will you ever need a second provider for failover or cost?\n    2. will output be streamed to a user?\n    3. will two or more model calls run concurrently?\n    4. will any single step need its own retry policy?\n    5. will the model or prompt vary per customer, tenant or experiment?\n\n  none of them yes  -> use the SDK. you are paying for uniformity you\n                       will not use, and the raw version is clearer.\n  two or more yes   -> use the framework. each of those is cheap when\n                       components are uniform and expensive when not.\n  exactly one yes   -> genuinely a judgement call. write the raw version\n                       and the one feature; revisit when a second arrives.\n\n  the failure mode to avoid is neither of those. it is writing the raw\n  version, then adding failover, then streaming, then a retry -- and\n  rebuilding the uniformity yourself, badly, one requirement at a time.',
        notes: [
          { t: "p", text: "**29 packages for `langchain-core` and 34 for `langgraph`**, resolved from installed metadata with optional extras excluded. Not enormous, not zero, and the right number to bring to a review rather than wait to be asked for." },
          { t: "p", text: "**On the single-call task the two are a wash** \u2014 six lines against five \u2014 and the raw version has one fewer concept in it. If that is the whole requirement, importing the framework means paying for uniformity you are not using, and the honest answer is not to." },
          { t: "p", text: "**Across seven accumulating requirements, raw grows about 11x and LCEL about 1.4x.** The LCEL column barely moves because each requirement is an existing method: stream, with_retry, with_fallbacks, batch, configurable_fields, callbacks. That is 1.1's uniformity argument with a price attached." },
          { t: "p", text: "**The crossover is around the third row** \u2014 retries. The raw version is still competitive with streaming added and roughly twice the size once backoff, jitter and error classification are in it." },
          { t: "p", text: "**The line count is the wrong thing to optimise, and I would say so.** It does not count the abstraction the team must learn, the dependency's release cadence, the traceback indirection, the absence of type checking between steps, or behaviour you inherited rather than chose." },
          { t: "p", text: "**That last cost is the sharpest, and this module measured three instances of it**: a JSON parser repairing truncation into a different number, a structured-output call returning None with no error recorded, and a type mismatch producing a stringified list. Forty lines of your own code has none of those, because it does nothing you did not write." },
          { t: "p", text: "**The failure mode the test exists to prevent is neither column**: writing the raw version and then adding failover, streaming and retries one at a time, rebuilding the uniformity in-house with no tests, no docs and one person who understands it." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the review that asks you to justify it",
      body: [
        { t: "p", text: "A platform review asks why a service is adding 29 packages to run what looks like three API calls. The question is reasonable and the wrong answer is a general claim about productivity." },
        { t: "p", text: "The answer that works is specific and forward-looking: name which of the five things you need. \u201cWe need failover to a second provider for the compliance requirement, we stream to the UI, and the model varies per tenant\u201d is three yeses and a decision. \u201cIt is what the examples use\u201d is not an argument and will not survive the second question." },
        { t: "p", text: "And if the honest count is zero or one, the right move is to say so and write the SDK version. That is a better outcome for the review, for the service, and for your credibility the next time you ask for a dependency \u2014 which is the real reason to be able to argue this side at all." }
      ] }
  ],

  takeaways: [
    "**`langchain-core` resolves to 29 packages and `langgraph` to 34** \u2014 lead with that number rather than defending it.",
    "**On a single prompt-model-parse task the two are a wash**, six lines against five, and the raw version has one fewer concept.",
    "**So for one call, in one shape, against one provider, use the SDK.**",
    "**Across seven accumulating requirements raw grows ~11x and LCEL ~1.4x**, because each requirement is a method that already exists.",
    "**The crossover is around retries** \u2014 raw is still competitive with streaming added and double the size once backoff and error classification are in.",
    "**The line count is the wrong thing to optimise** and misses five real costs.",
    "**Those costs are**: the abstraction to learn, the dependency cadence, traceback indirection, no type checking between steps, and inherited behaviour.",
    "**The last is the sharpest, and this module measured three instances** \u2014 truncation repaired into a wrong number, structured output returning None silently, and a stringified list.",
    "**Forty lines of your own code has none of those**, because it does nothing you did not write.",
    "**The test is five questions**: second provider, streaming, concurrency, per-step retry, per-tenant variation.",
    "**None yes, use the SDK; two or more, use the framework; exactly one is a judgement call.**",
    "**The failure mode is neither** \u2014 writing the raw version and then rebuilding the uniformity yourself, one requirement at a time, with no tests and one owner."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service makes one model call, in one shape, against one provider. What is the right choice?",
        options: [
          "LangChain \u2014 the composition will be needed eventually",
          "The provider SDK \u2014 the two are a wash on size and the raw version has fewer concepts",
          "LangChain, because the parser and prompt template are worth it alone",
          "Either; the decision has no measurable consequences at this size"
        ],
        answer: 1,
        why: "Six lines against five is a wash, and the SDK version is clearer to anyone who has not used LangChain. With no composition being exploited, the uniformity is being paid for and not used \u2014 so the dependency, its 29 packages, the abstraction to learn and the traceback indirection all buy nothing. The framework's case starts when the requirements start accumulating." },

      { stem: "Why does the LCEL line count barely move as requirements accumulate?",
        options: [
          "Because the requirements were chosen to favour LangChain",
          "Because each requirement is an existing method \u2014 stream, with_retry, with_fallbacks, batch, configurable_fields \u2014 that works on any component",
          "Because LangChain generates the implementing code at runtime",
          "Because the comparison omits configuration the LCEL version still needs"
        ],
        answer: 1,
        why: "Streaming, retries, fallbacks, batching and runtime configuration are already defined on the base class, and they work on a model, a parser, a retriever or a whole chain without being rewritten for each. That is the direct payoff of every component satisfying one interface \u2014 1.1's argument with a price attached. The raw version has to implement each one against its specific call site, which is why it grows about 11x over the same seven rows." },

      { stem: "Which cost of the framework does a line-count comparison not capture?",
        options: [
          "Install size, which dominates the real cost",
          "Inherited behaviour \u2014 defaults like a JSON parser that repairs truncation into a different number",
          "Runtime overhead from the abstraction layers",
          "Nothing significant \u2014 lines of code is a reasonable proxy"
        ],
        answer: 1,
        why: "This module measured three instances: truncated JSON repaired into a wrong value, a structured-output call returning None with parsing_error also None, and a type mismatch between steps producing a stringified list. Code you write yourself has none of those, because it does nothing you did not write. Along with the abstraction to learn, the dependency cadence, traceback indirection and the absence of type checking, that is what the line count omits." },

      { stem: "Which outcome is the five-question test designed to prevent?",
        options: [
          "Adopting the framework for a task too small to need it",
          "Writing the raw version and then rebuilding the uniformity in-house, one requirement at a time",
          "Choosing the wrong provider before the requirements are known",
          "Over-engineering the first version of a prototype"
        ],
        answer: 1,
        why: "Both columns are defensible outcomes \u2014 the SDK for a simple task, the framework for a composed one. The bad outcome is the drift between them: raw code, then failover, then streaming, then a per-step retry, each reasonable in isolation and collectively an in-house abstraction with no tests, no documentation and one person who understands it. The questions ask about the system you are going to build precisely to catch that early." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "When not to use a framework",
    questions: [
      { level: "core",
        q: "A reviewer asks why you are adding 29 packages for three API calls. Answer them.",
        strong: "A strong answer is specific and forward-looking, not a productivity claim.",
        answer: [
          { t: "p", text: "I would answer with which specific things we need, not with a general claim about productivity, because the general claim does not survive the second question." },
          { t: "p", text: "There are five that matter: a second provider for failover or cost, streaming to a user, concurrent model calls, a retry policy on an individual step, and a model or prompt that varies per customer or experiment. Each of those is cheap when every component satisfies one interface and expensive when they do not. So the answer is something like: we need failover for the compliance requirement, we stream to the UI, and the model varies per tenant. That is three, and it is a decision." },
          { t: "p", text: "If the honest count were zero or one, I would say so and write the SDK version. On a single prompt-model-parse task the two are about the same size \u2014 I compared them, six lines against five \u2014 and the raw version has one fewer concept in it, which matters because most of the team has not used LangChain." },
          { t: "p", text: "And I would bring the cost number rather than wait to be asked for it. langchain-core resolves to 29 packages in its install closure, langgraph to 34. That is not enormous and it is not nothing, and volunteering it is what makes the rest of the answer credible." }
        ] },

      { level: "advanced",
        q: "Make the strongest case against using LangChain.",
        strong: "A strong answer names inherited behaviour, not just dependency weight.",
        answer: [
          { t: "p", text: "The strongest case is not the dependency count, it is that you inherit behaviour you did not choose and will not discover until something is wrong." },
          { t: "p", text: "I can give three measured examples from the basics alone. JsonOutputParser uses a partial parser, so a response truncated by max_tokens is repaired rather than reported \u2014 a rating of eight-point-eight cut mid-decimal parses as eight, a different number, with no error. with_structured_output returns None when the model answers in prose instead of calling the tool, and include_raw reports parsing_error as None as well, so the diagnostic channel agrees nothing went wrong. And LCEL does not type-check between steps, so a list meeting a function that expects a string gets stringified into a Python repr and the chain completes successfully." },
          { t: "p", text: "None of those exist in forty lines of your own code, because forty lines of your own code does not do anything you did not write. That is a real argument and I would not wave it away." },
          { t: "p", text: "The rest of the case is the ordinary stuff: an abstraction the team has to learn before they can read a chain, a release cadence you now track, and a traceback that goes through a step inside a sequence rather than your own stack." },
          { t: "p", text: "Where I come out is that the mitigation is knowledge rather than avoidance \u2014 every one of those defaults is fine once you know it, and the failure mode of avoiding the framework is usually worse, which is rebuilding the uniformity in-house one requirement at a time with no tests and one owner. But I would not pretend the case against is weak, because it is not." }
        ] },

      { level: "core",
        q: "When is it genuinely a close call?",
        strong: "A strong answer identifies the single-requirement case and what to do.",
        answer: [
          { t: "p", text: "When exactly one of the five things is true. If you need streaming and nothing else, or one retry and nothing else, the framework is not obviously winning \u2014 implementing that one feature against your own call is maybe five to fifteen lines, and you avoid the dependency and the abstraction entirely." },
          { t: "p", text: "What I would actually do in that case is write the raw version plus the one feature, and set a tripwire: the moment a second requirement arrives, migrate rather than add. That is the specific point at which the in-house version starts becoming an abstraction, and it is much cheaper to move before you have written the second one than after." },
          { t: "p", text: "Where the call stops being close in the other direction is around the third requirement. By the time you have streaming, retries with backoff and a fallback provider, the raw version is roughly twice the size and most of what you have written is plumbing that already exists as methods." },
          { t: "p", text: "The thing I would push back on in either direction is deciding from the code you have today. The questions are about the system you are going to build, because the expensive mistake is not picking wrong once \u2014 it is drifting, where every individual addition is reasonable and the sum is an undocumented framework with one maintainer." }
        ] }
    ]
  }
});

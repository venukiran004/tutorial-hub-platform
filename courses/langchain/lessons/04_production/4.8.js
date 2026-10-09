EC.receiveLesson({
  id: "4.8",
  lede: "The highest-value test in a LangChain codebase asserts on **what the model was sent**. 1.2 established that the chain's source is not evidence about the request \u2014 only the resolved message list is \u2014 and a scripted model makes that list available to a test. Three of module 1's silent failures are visible in it and all three are one assertion away: an unapplied partial, a placeholder that filled with more history than expected, and a system prompt dropped by a trimmer. None of them raises. The discipline that follows is a split: **scripted tests for the machinery, an eval set for the model**, because conflating them gives either a brittle suite that breaks when the model rephrases or no coverage of the wiring at all.",
  objectives: [
    "Make a chain deterministic with a scripted model",
    "Assert on the resolved message list rather than the output",
    "Distinguish deterministic, property and evaluation tests",
    "Name what a scripted model cannot test",
    "Identify the assertion that catches the most silent failures"
  ],
  prerequisites: ["1.2", "3.6"],
  blocks: [
    { t: "h2", n: "01", id: "deterministic", text: "A scripted model makes assertion possible", sub: "Which it otherwise is not" },
    { t: "code", lang: "text", title: "Three invocations",
      code: "three invocations: ['a fixed answer', 'a fixed answer', 'a fixed answer']\nall identical: True",
      caption: "With a real model the only safe assertion is about shape, not content." },
    { t: "p", text: "This is why the course runs on a scripted model at all, and the same technique is what makes a test suite possible: the machinery is deterministic once the token generation is." },
    { t: "h2", n: "02", id: "best", text: "The assertion that catches the most", sub: "On the resolved message list" },
    { t: "code", lang: "python", title: "Asserting on what was sent",
      code: 'm = FakeChatModel(script=["ok"])\n(PROMPT | m | StrOutputParser()).invoke({"q": "the question"})\nsent = m.seen[0]\n\nassert len(sent) == 2\nassert sent[0].content == "You are terse."          # system message intact\nassert "the question" in sent[1].content           # variable interpolated',
      out: "assert the model received 2 messages      -> True\nassert the system message is unchanged    -> True\nassert the question was interpolated      -> True",
      hl: [5, 6, 7],
      caption: "Three assertions about the request, not the response." },
    { t: "callout", kind: "insight", title: "Three of module 1's silent failures are visible here", body: [
      { t: "p", text: "**An unapplied partial** (1.3) sends a literal `{tone}` \u2014 visible in the message content. **A placeholder that filled with more history than expected** (1.3) changes the message count. **A system prompt dropped by a trimmer** (3.6) removes a message entirely." },
      { t: "p", text: "None of the three raises an exception, and all three produce plausible-looking answers. All three are caught by asserting on the list, which is why it is the highest-value test available." }
    ] },
    { t: "h2", n: "03", id: "three", text: "Three kinds of test", sub: "And what each can assert" },
    { t: "table", head: ["Kind", "Asserts", "Example"], rows: [
      ["deterministic", "exact behaviour, with a scripted model", "the model received these two messages"],
      ["property", "something true for every input", "the system message survives trimming"],
      ["evaluation", "quality, with a threshold and a trend", "answer helpfulness on a graded set"]
    ] },
    { t: "code", lang: "python", title: "A property test for 3.6's failure",
      code: 'kept = trim_messages(long_hist, max_tokens=6, strategy="last",\n                     token_counter=len, include_system=True)\nassert any(isinstance(x, SystemMessage) for x in kept)',
      out: "the system message survives trimming      -> True",
      caption: "One line, and it catches the \u201cgets worse the longer you talk\u201d failure." },
    { t: "p", text: "The property test is worth more than it looks because 3.6's failure is **gradual and correlated with conversation length** \u2014 short sessions behave, long ones drift, so it reads as model degradation rather than a bug. A one-line assertion at several history lengths turns an unfalsifiable complaint into a red test." },
    { t: "h2", n: "04", id: "cannot", text: "What a scripted model cannot test", sub: "And why the split matters" },

    {"kind": "steps", "title": "The highest-value test asserts on what the model was sent", "caption": "1.2 established that the chain's source is not evidence about the request — only the resolved message list is. A scripted model makes that list available, which turns prompt construction from something you read into something you assert on.", "items": [{"label": "script the model", "desc": "a FakeChatModel that records every message list it receives", "tone": "accent", "code": "no API key"}, {"label": "invoke the real chain", "desc": "the prompt, the parser and the composition are all genuine", "tone": "good", "code": "real machinery"}, {"label": "assert on model.seen[0]", "desc": "the system message, the retrieved context, the question — as actually sent", "tone": "good", "code": "the point"}, {"label": "assert on the parsed result", "desc": "and on what happens when the scripted reply is malformed (1.4)", "tone": "violet", "code": "both halves"}], "t": "diagram", "id": "dg-4_8-04-0"},




    { t: "ul", items: [
      "whether the model will actually call the tool you defined",
      "whether your prompt produces the tone you wanted",
      "whether the model follows the schema under load",
      "whether a retrieved chunk is actually relevant",
      "anything that depends on the model's judgement"
    ] },
    { t: "callout", kind: "tradeoff", title: "Scripted tests for the machinery, an eval set for the model", body: [
      { t: "p", text: "Conflating them produces one of two bad outcomes. Assert on model output in CI and you get a brittle suite that breaks every time the model rephrases something, which trains people to ignore it. Rely on an eval set for everything and you have no coverage of the wiring, where module 1 found four silent failures." },
      { t: "p", text: "The split is clean because the boundary is clean: everything up to and including what was sent is deterministic and testable; everything the model decides is a distribution and needs a graded set with a threshold." }
    ] },
    { t: "exercise", kind: "build", title: "Test the machinery, not the model",
      difficulty: "core", minutes: 26,
      body: "Show that a scripted model makes a chain deterministic. Then write assertions on the resolved message list covering message count, an unchanged system message and a correctly interpolated variable. Write a property test that the system message survives trimming. Finally, list what a scripted model cannot test and state the split between testing and evaluation.",
      requirements: ["Invoke a chain three times with a scripted model and show the outputs are identical",
        "Assert on the message count, the system message and variable interpolation",
        "Explain which of module 1's silent failures each assertion catches",
        "Write a one-line property test that trimming preserves the system message",
        "List at least four things a scripted model cannot test",
        "State the split between scripted tests and an eval set and why conflating them fails"],
      hint: "The `seen` attribute is the point of the whole exercise. Ask what each of module 1's silent failures would look like in that list.",
      solution: { lang: "python", title: "x0408.py \u2014 assert on what was sent",
        code: 'm = FakeChatModel(script=["ok"])\n(PROMPT | m | StrOutputParser()).invoke({"q": "the question"})\nsent = m.seen[0]\nassert len(sent) == 2\nassert sent[0].content == "You are terse."\nassert "the question" in sent[1].content\n\n# property: the system message survives trimming at any history length\nkept = trim_messages(long_hist, max_tokens=6, strategy="last",\n                     token_counter=len, include_system=True)\nassert any(isinstance(x, SystemMessage) for x in kept)',
        out: "==============================================================================\nPART 1 -- the scripted model makes a chain deterministic\n==============================================================================\n  three invocations: ['a fixed answer', 'a fixed answer', 'a fixed answer']\n  all identical: True\n\n  that is what makes an assertion possible at all. with a real model\n  the only safe assertion is about SHAPE, not content.\n\n==============================================================================\nPART 2 -- three kinds of test, and what each can assert\n==============================================================================\n  1. DETERMINISTIC -- scripted model, assert exact behaviour\n     assert the model received 2 messages      -> True\n     assert the system message is unchanged    -> True\n     assert the question was interpolated      -> True\n\n     this is the highest-value test in a LangChain codebase, because\n     it asserts on WHAT THE MODEL WAS SENT -- which 1.2 showed is the\n     only evidence of what the chain actually did.\n\n  2. PROPERTY -- things that must hold for every input\n     the system message survives trimming      -> True\n     (3.6's failure, as a one-line test)\n\n  3. EVAL -- the part that cannot be asserted\n     answer quality, helpfulness, tone. a graded set, scored, with a\n     threshold and a trend -- not a pass/fail in CI on one example.\n\n==============================================================================\nPART 3 -- what a scripted model cannot test\n==============================================================================\n  - whether the model will actually call the tool you defined\n  - whether your prompt produces the tone you wanted\n  - whether the model follows the schema under load\n  - whether a retrieved chunk is actually relevant\n  - anything that depends on the model's judgement\n\n  so the split is: scripted tests for the MACHINERY, and an eval set\n  for the MODEL. conflating them gives you either a brittle suite that\n  breaks when the model rephrases, or no coverage of the wiring at all.\n\n==============================================================================\nPART 4 -- the assertion that catches the most bugs\n==============================================================================\n  assert on the resolved message list.\n\n  module 1 found four silent failures and three of them are visible in\n  that list: an unapplied partial (1.3), a placeholder that filled with\n  more history than expected (1.3), and a system prompt dropped by a\n  trimmer (3.6). none raises. all three are one assertion away.",
        notes: [
          { t: "p", text: "**A scripted model makes assertion possible at all.** Three invocations gave identical output; with a real model the only safe assertion is about shape rather than content." },
          { t: "p", text: "**Asserting on the resolved message list is the highest-value test in a LangChain codebase**, because 1.2 established that the chain's source is not evidence about what was sent \u2014 only the list is." },
          { t: "p", text: "**Three of module 1's silent failures are visible in it.** An unapplied partial leaves a literal brace-tone in the content; a placeholder that filled with unexpected history changes the message count; a trimmer that dropped the system prompt removes a message. None raises, all produce plausible answers, all are one assertion away." },
          { t: "p", text: "**The property test for trimming is one line** and catches a failure that is gradual and correlated with conversation length \u2014 which otherwise reads as the model getting worse the longer you talk to it, and sends people to prompt engineering." },
          { t: "p", text: "**A scripted model cannot test anything that depends on the model's judgement**: whether it will call a tool, whether the prompt produces the intended tone, whether it holds a schema under load, whether a retrieved chunk is relevant." },
          { t: "p", text: "**So the split is scripted tests for the machinery and an eval set for the model.** Conflating them gives either a brittle CI suite that breaks on rephrasing \u2014 which trains people to ignore it \u2014 or no coverage of the wiring at all, which is where module 1 found four silent failures." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the suite everyone ignores", body: [
      { t: "p", text: "A team asserts on model output in CI. The suite is red about a third of the time, always for the same reason: the model phrased something differently. People rerun it until it passes, and eventually stop reading failures at all." },
      { t: "p", text: "Then a real regression ships \u2014 a partial that stopped being applied, so a literal placeholder went to the model for two weeks \u2014 and the suite was green throughout, because it was only ever asserting on output text that remained plausible." },
      { t: "p", text: "The fix is the split. Move the output assertions to an eval set with a threshold and a trend, where a drop is a signal rather than a failure. Replace them in CI with assertions on the resolved message list, which is deterministic, catches exactly this class of bug, and never breaks because the model chose a different synonym. A suite that fails only for real reasons is the only kind anyone reads." }
    ] }
  ],
  takeaways: [
    "**A scripted model makes a chain deterministic**, which is what makes assertion possible at all.",
    "**Assert on the resolved message list** \u2014 the highest-value test in a LangChain codebase.",
    "**Because the chain's source is not evidence about what was sent** (1.2); only the list is.",
    "**An unapplied partial is visible as literal text** in the message content.",
    "**A placeholder that over-filled is visible as a message count.**",
    "**A dropped system prompt is visible as a missing message.**",
    "**None of those three raises**, and all produce plausible answers.",
    "**Three kinds of test**: deterministic for exact behaviour, property for invariants, evaluation for quality.",
    "**The trimming property test is one line** and catches a failure that otherwise reads as model degradation.",
    "**A scripted model cannot test anything that depends on the model's judgement.**",
    "**So: scripted tests for the machinery, an eval set for the model.**",
    "**Conflating them gives a brittle suite people ignore, or no coverage of the wiring.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What is the highest-value assertion in a LangChain test suite?",
      options: ["That the final output matches an expected string",
        "That the model received the expected resolved message list",
        "That no exception was raised",
        "That the chain has the expected number of steps"],
      answer: 1,
      why: "1.2 established that the chain's source cannot tell you what was sent \u2014 only the resolved list can, because templates, partials and placeholders all converge on it. Asserting on that list catches an unapplied partial, an over-filled placeholder and a dropped system prompt, none of which raises an exception and all of which produce plausible-looking answers." },
    { stem: "A trimmer drops the system message on long conversations. How does that surface, and what catches it?",
      options: ["An exception on the next call; a try/except catches it",
        "As the model gradually getting worse the longer you talk; a one-line property test catches it",
        "As a context-length error; a token budget catches it",
        "As a parse failure; a fixing parser catches it"],
      answer: 1,
      why: "Nothing raises \u2014 the model simply runs without instructions, so tone, formatting and refusals drift, and only on long sessions. That correlation makes it read as model degradation and sends people to prompt engineering or a bigger model. Asserting that a SystemMessage survives trimming at several history lengths turns an unfalsifiable complaint into a red test." },
    { stem: "Why not assert on model output in CI?",
      options: ["Model calls are too slow for CI",
        "It produces a brittle suite that breaks when the model rephrases, which trains people to ignore failures",
        "Provider costs make it uneconomical",
        "Outputs cannot be compared reliably across versions"],
      answer: 1,
      why: "Output varies legitimately, so the suite goes red for non-reasons and people learn to rerun until green \u2014 at which point a real regression passes unnoticed. The split is to move quality assertions to an eval set with a threshold and a trend, and to keep CI assertions on the deterministic part: the resolved message list, which never changes because the model chose a different synonym." },
    { stem: "What can a scripted model not test?",
      options: ["Whether variables were interpolated correctly",
        "Whether the model will actually call the tool you defined",
        "Whether the system message reached the model",
        "Whether the right number of messages was sent"],
      answer: 1,
      why: "Everything up to and including what was sent is deterministic and testable with a script. Whether the model chooses to call a tool is its judgement, which a scripted model supplies by construction rather than exercises \u2014 along with tone, schema adherence under load, and retrieval relevance. Those belong in an eval set, which is why the split between testing the machinery and evaluating the model is clean." }
  ] },
  interview: { title: "Interview practice", sub: "Testing", questions: [
    { level: "core", q: "How do you test a LangChain application?",
      strong: "A strong answer asserts on the request and splits testing from evaluation.",
      answer: [
        { t: "p", text: "With a scripted model, asserting on what the model was sent rather than on what it returned." },
        { t: "p", text: "That is the highest-value test available, because the chain's source cannot tell you what was actually sent \u2014 templates, partials, placeholders and trimming all converge on one resolved message list, and only that list is evidence. A scripted model records it, so you can assert on the message count, the system message and whether variables were interpolated." },
        { t: "p", text: "Three of the silent failures I have hit are visible in exactly that list. A partial that was never applied leaves literal brace-tone in the content. A placeholder that filled with more history than expected changes the count. A trimmer that dropped the system prompt removes a message. None of them raises, all of them produce plausible answers, and all three are one assertion away." },
        { t: "p", text: "Then a split: scripted tests for the machinery, an eval set for the model. Everything up to what was sent is deterministic and belongs in CI; anything that depends on the model's judgement is a distribution and belongs in a graded set with a threshold and a trend." }
      ] },
    { level: "advanced", q: "A team's CI suite is red a third of the time and people have stopped reading it. Fix it.",
      strong: "A strong answer diagnoses the conflation and moves the boundary.",
      answer: [
        { t: "p", text: "They are almost certainly asserting on model output in CI. Output varies legitimately \u2014 the model rephrases something and the test fails for a non-reason \u2014 so people rerun until green and eventually stop reading failures at all." },
        { t: "p", text: "The cost of that is not the wasted time, it is that a real regression then ships unnoticed. The version of this I would expect is a partial that stopped being applied, so a literal placeholder went to the model for weeks while the suite stayed green, because the output remained plausible." },
        { t: "p", text: "So I would move the boundary. Quality assertions go to an eval set with a threshold and a trend, where a drop is a signal to investigate rather than a build failure. CI keeps assertions on the deterministic part: the resolved message list, which never changes because the model chose a different synonym." },
        { t: "p", text: "The principle I would state is that a suite which fails only for real reasons is the only kind anyone reads. Everything else is a slow process of training the team to ignore the one signal you have." }
      ] },
    { level: "core", q: "What belongs in an eval set rather than a test?",
      strong: "A strong answer draws the line at the model's judgement.",
      answer: [
        { t: "p", text: "Anything that depends on the model's judgement. Whether it will actually call the tool you defined, whether your prompt produces the tone you wanted, whether it holds the output schema under real load, whether a retrieved chunk is genuinely relevant." },
        { t: "p", text: "A scripted model cannot exercise any of those, because it supplies the judgement by construction rather than testing it. Scripting a tool call proves your loop handles a tool call; it proves nothing about whether a real model would have made one." },
        { t: "p", text: "The distinction I use is where determinism ends. Everything up to and including what was sent is deterministic \u2014 the template resolution, the interpolation, the trimming, the message list, the tool protocol. Everything after that is a distribution." },
        { t: "p", text: "And distributions need different machinery: a graded set, a score, a threshold and a trend, run on a schedule rather than per commit. Treating a distribution as a pass/fail assertion is what produces the flaky suite, and treating the deterministic part as something only an eval can cover is what leaves the wiring untested." }
      ] }
  ] }
});

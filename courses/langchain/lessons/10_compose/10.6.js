EC.receiveLesson({
  id: "10.6",
  lede: "Testing a graph is three layers, and the division is decided by **what only the runtime does**. Nodes and routers are plain functions, so they test as a dict in and a dict out \u2014 cheap, and covering most of the logic. What a node test cannot catch is the set of failures this course has been accumulating: a **silently dropped key** (the node's own test passes, because it asserts on the returned dict and the runtime is what discards it), and a **missing reducer**, which needs *two* writes because one write cannot distinguish it from correct. Then statefulness: a shared saver plus a shared `thread_id` gives order-dependent tests, and the second run **appended** to the first.",
  objectives: [
    "Test nodes and routers without a graph",
    "Name the failures only a graph test catches",
    "Explain why a reducer test needs two writes",
    "Isolate stateful tests correctly",
    "Choose what to assert, including what the model received"
  ],
  prerequisites: ["8.5", "8.3", "9.2"],
  blocks: [
    { t: "h2", n: "01", id: "nodes", text: "Level 1: nodes are functions", sub: "The cheapest, highest-coverage test" },

    {"kind": "flow", "title": "A node is a function, so the first level of testing needs no graph", "caption": "A node takes a dict and returns a dict. **So testing one is calling it with a dict and asserting on the dict that comes back** — no graph, no compile, no checkpointer, no model. Which makes the cheapest tests in this module the ones people skip, because the function looks too simple to be worth a test. It is also the level that catches 8.2's silent drop and 8.5's whole-state return, both of which are visible in the returned dict alone.", "cols": 3, "nodes": [{"id": "n", "label": "A node is dict -> dict", "sub": "nothing more", "tone": "accent"}, {"id": "t", "label": "So call it with a dict", "sub": "no graph, no model", "tone": "good"}, {"id": "d", "label": "Catches 8.2's silent drop", "sub": "visible in the return", "tone": "good"}, {"id": "w", "label": "And 8.5's whole-state return", "sub": "also visible", "tone": "good"}, {"id": "s", "label": "Skipped because it looks too simple", "sub": "which is why these bugs ship", "tone": "teal"}], "edges": [["n", "t"], ["t", "d"], ["t", "w"], ["d", "s"]], "t": "diagram", "id": "dg-10_6-01-1"},





    { t: "code", lang: "text", title: "No graph required",
      code: "double({'n': 5, 'trace': []}) -> {'n': 10, 'trace': ['double']}",
      caption: "8.5's rule: state in, partial update out." },
    { t: "h2", n: "02", id: "routers", text: "Level 2: routers are functions too", sub: "And this is the test people skip" },

    {"kind": "flow", "title": "The router is a pure function, and covering every outcome costs almost nothing", "caption": "**The failure it prevents is 8.7's**: a router returning a key the path map lacks **compiles fine and fails at runtime on one branch only.** Since the router is a pure function of state, **covering every outcome costs almost nothing — and it is skipped precisely because it looks too trivial to write.** Which pairs with §01: the two cheapest test levels in the module are the two most often absent.", "cols": 3, "nodes": [{"id": "r", "label": "The router: state -> a key", "sub": "a pure function", "tone": "accent"}, {"id": "m", "label": "A missing map entry compiles", "sub": "8.7 measured it", "tone": "crit"}, {"id": "o", "label": "And fails on one branch only", "sub": "possibly months later", "tone": "crit"}, {"id": "c", "label": "Covering every outcome is trivial", "sub": "no graph needed", "tone": "good"}, {"id": "s", "label": "And skipped for looking trivial", "sub": "the same reason as section 01", "tone": "teal"}], "edges": [["r", "m"], ["m", "o"], ["o", "c"], ["c", "s"]], "t": "diagram", "id": "dg-10_6-02-2"},





    { t: "code", lang: "text", title: "Every outcome, in three lines",
      code: "route({'n': 5})  -> 'small'\nroute({'n': 50}) -> 'big'",
      caption: "A parametrised test over every outcome." },
    { t: "p", text: "The failure it prevents is 8.7's: a router returning a key the path map lacks **compiles fine** and fails at runtime on one branch only. Since the router is a pure function of state, covering every outcome costs almost nothing \u2014 and it is skipped precisely because it looks too trivial to write." },
    { t: "h2", n: "03", id: "graph", text: "Level 3: the graph, for what only the runtime does", sub: "Three failures a node test cannot see" },

    {"kind": "layers", "title": "Three layers, divided by what only the runtime does", "caption": "Nodes and routers are plain functions, so they test as a dict in and a dict out — cheap, and covering most of the logic. Reserve the expensive layers for what **only** the runtime can show you: reducers merging, and interrupts resuming.", "items": [{"label": "nodes and routers", "sub": "a dict in, a dict out — no runtime, nothing to mock", "tone": "good", "side": "most tests"}, {"label": "a compiled graph", "sub": "reducers, supersteps, routing — what only the runtime does", "tone": "warn", "side": "some"}, {"label": "with a checkpointer", "sub": "interrupts, resume, time travel", "tone": "crit", "side": "a few"}], "t": "diagram", "id": "dg-10_6-03-0"},
























    { t: "h3", text: "1. The silently dropped key" },
    { t: "code", lang: "text", title: "A node with a typo in its returned key",
      code: "the node's own test passes: typo({'value': 0}) -> {'valu': 99}\nthe graph says:                                    {'value': 0}",
      caption: "The node is correct; the runtime discarded the update." },
    { t: "callout", kind: "insight", title: "Assert on the final state, not the node's return value", body: [
      { t: "p", text: "The node test is examining the right object \u2014 the dict the node returned \u2014 and that dict is exactly what the author intended. The discard happens afterwards, in the runtime, against the schema." },
      { t: "p", text: "So node tests and state assertions catch different bugs, and this one is only visible from the state side (or by streaming `updates`, per 10.3). A suite made entirely of node tests has a blind spot shaped like every key name." }
    ] },
    { t: "h3", text: "2. The missing reducer, which needs two writes" },
    { t: "code", lang: "text", title: "Two sequential writes to a key with no reducer",
      code: "{'log': ['second']}",
      caption: "`'first'` is gone." },
    { t: "p", text: "A **one-write** test cannot distinguish this from correct behaviour, which is why 9.1's agent-forgets-the-question bug reaches production: every single-turn test passes. So any accumulating key needs a test that writes it twice." },
    { t: "h3", text: "3. Routing, end to end" },
    { t: "code", lang: "text", title: "Both branches through the compiled graph",
      code: "n=3   -> ['double', 'small']\nn=30  -> ['double', 'big']",
      caption: "Which confirms the path map as well as the router." },
    { t: "h2", n: "04", id: "stateful", text: "Testing something stateful", sub: "And the leak between tests" },

    {"kind": "trace", "title": "Two tests passed and re-invoking one thread shows why that was luck", "caption": "`test_a` and `test_b` both produce `['double', 'small']` — and **re-invoking test_a's thread gives `['double', 'small', 'double', 'small']`**, because 9.4's checkpointer continued from the persisted state. Which is the trap in testing anything stateful: **a per-test `thread_id` is not optional.** Two tests sharing one thread pass individually and interfere when the suite order changes, which is the hardest class of flaky test to diagnose.", "left": "run", "codeW": 190, "vars": ["trace"], "steps": [{"code": "test_a", "state": ["double, small"], "tone": "good"}, {"code": "test_b", "state": ["double, small"], "tone": "good"}, {"code": "re-invoking test_a's thread", "state": ["double, small, double, small"], "changed": [0], "tone": "crit", "note": "a per-test thread_id is not optional"}], "t": "diagram", "id": "dg-10_6-04-3"},





    { t: "code", lang: "text", title: "Two tests, then re-running the first",
      code: "test_a -> ['double', 'small']\ntest_b -> ['double', 'small']\n\nre-invoking test_a's thread: ['double', 'small', 'double', 'small']",
      caption: "The second run **appended** to the first." },
    { t: "callout", kind: "warn", title: "A shared saver plus a shared thread_id gives order-dependent tests", body: [
      { t: "p", text: "9.4's mechanism is the cause: the reducer appends to the persisted state, so re-invoking a thread continues it. In a test suite that means one test's state reaches another, and the failure is invisible until someone reorders or parallelises the suite." },
      { t: "p", text: "The rules are mechanical: a **fresh** `InMemorySaver` per test rather than a module-level one, a unique `thread_id` per test \u2014 ideally the test's own name \u2014 and assertions on `get_state()` rather than only on the `invoke()` return." }
    ] },
    { t: "h2", n: "05", id: "scripted", text: "The scripted model", sub: "What makes agent tests possible" },

    {"kind": "flow", "title": "Mocking the graph tests the mock", "caption": "Script the model and **everything else stays real — the graph, the reducers, the tool node, the checkpointer.** The alternative is the point: **mocking the graph or patching node functions tests the mock. It would have passed in every one of the three failures above, because the mock has no schema to drop a key against and no reducer to be missing.** Which is 4.8's argument in a graph setting: replace the one non-deterministic component and the rest becomes assertable.", "cols": 3, "nodes": [{"id": "s", "label": "Script the model only", "sub": "FakeChatModel", "tone": "violet"}, {"id": "r", "label": "Graph, reducers, tool node, checkpointer", "sub": "all real", "tone": "good"}, {"id": "m", "label": "Mock the graph instead", "sub": "or patch the nodes", "tone": "crit"}, {"id": "n", "label": "No schema to drop a key against", "sub": "and no reducer to be missing", "tone": "crit"}, {"id": "p", "label": "So it passes all three failures", "sub": "it tests the mock", "tone": "crit"}], "edges": [["s", "r"], ["m", "n"], ["n", "p"]], "t": "diagram", "id": "dg-10_6-05-4"},





    { t: "code", lang: "python", title: "Deterministic output, real machinery",
      code: 'script = [AIMessage(content="", tool_calls=[...]),\n          AIMessage(content="the answer")]',
      caption: "Only token generation is faked." },
    { t: "p", text: "Everything else stays real \u2014 the graph, the reducers, the tool node, the checkpointer. The alternative, mocking the graph or patching node functions, tests the mock: it would have passed in every one of the three failures above, because the mock has no schema to drop a key against and no reducer to be missing." },
    { t: "h2", n: "06", id: "assert", text: "What to assert", sub: "Including the underused one" },

    {"kind": "matrix", "title": "Five assertions, and the one that catches prompt bugs", "caption": "**`model.seen` — asserting on what the model actually received — is the one that catches prompt and history bugs**, which is 4.8's finding that testing the input is where the cheap bugs are. The other four cover the graph's own failure modes: dropped keys and bad reducers in the final state, routing bugs in the visited sequence, loops in the call count, and the pause itself in `get_state().next`.", "cols": ["Catches"], "rows": ["Final state keys and values", "The visited-node sequence", "The number of model calls", "What the model received", "get_state().next on pause"], "cells": [["dropped keys, bad reducers"], ["routing bugs"], ["loops, redundant calls"], [{"text": "prompt and history bugs - testing the input", "tone": "violet"}], ["that the pause actually happened"]], "t": "diagram", "id": "dg-10_6-06-5"},





    { t: "table", head: ["assertion", "catches"], rows: [
      ["the final state's keys and values", "dropped keys, bad reducers"],
      ["the sequence of visited nodes", "routing bugs"],
      ["the number of model calls", "loops, redundant calls"],
      ["**what the model received** (`model.seen`)", "prompt and history bugs"],
      ["`get_state().next` after an interrupt", "the pause happened"]
    ] },
    { t: "callout", kind: "mental", title: "Assert on what the model was sent", body: [
      { t: "p", text: "This is the underused one. It catches trimming bugs, missing system prompts and lost tool results \u2014 none of which change the final answer in a scripted test, **because the script does not read its input**." },
      { t: "p", text: "Which is the one weakness of the scripted-model approach, and the assertion that closes it. 9.1 used exactly this to show the message list growing from 1 to 3 messages; the same inspection in a test asserts that the history reaching the model is what you intended." }
    ] },
    { t: "exercise", kind: "build", title: "Build the three test layers",
      difficulty: "core", minutes: 32,
      body: "Test a node and a router as plain functions. Then demonstrate three failures that only a graph test catches: a node whose returned key has a typo, a key with no reducer written twice, and routing through both branches. Run two stateful tests against a shared saver and show the leak when a thread is re-invoked. Say what makes agent tests possible, and list what to assert \u2014 including the assertion most suites omit.",
      requirements: ["Test a node and a router with no graph",
        "Show a node whose test passes while the graph discards its update",
        "Explain why node tests and state assertions catch different bugs",
        "Show a missing reducer and explain why one write cannot detect it",
        "Test both routing branches end to end",
        "Demonstrate state leaking between tests on a shared thread_id",
        "Give the isolation rules for stateful tests",
        "List what to assert, including what the model received"],
      hint: "Write a node with a typo in its returned key and test it both ways. The two results disagree, which is the whole point.",
      solution: { lang: "python", title: "x1006.py \u2014 the node test passes and the graph disagrees",
        code: '# level 1 and 2: plain functions\ndouble({"n": 5, "trace": []})\nroute({"n": 50})\n\n# level 3: what only the runtime does\ndef typo(state):\n    return {"valu": 99}          # not in the schema\n\nprint(typo({"value": 0}))                      # the node test PASSES\nprint(g2.compile().invoke({"value": 0}))        # the graph discarded it\n\n# stateful isolation: a FRESH saver and a unique thread_id per test\nfor tid in ("test_a", "test_b"):\n    cfg = {"configurable": {"thread_id": tid}}\n    app4.invoke({"n": 3, "trace": []}, cfg)',
        out: "==============================================================================\nPART 1 -- level 1 -- nodes are functions\n==============================================================================\n  the cheapest and highest-coverage test, and it needs no graph:\n\n    double({'n': 5, 'trace': []}) -> {'n': 10, 'trace': ['double']}\n\n  8.5's point: a node is state in, partial update out. so a node\n  test is a dict in and a dict out, with no runtime to stand up.\n==============================================================================\nPART 2 -- level 2 -- routers are functions too\n==============================================================================\n  and this is the test people skip because it looks trivial:\n\n    route({'n': 5}) -> 'small'\n    route({'n': 50}) -> 'big'\n\n  the failure it prevents is 8.7's: a router returning a key the\n  path map lacks compiles fine and fails at runtime on one branch.\n  a parametrised test over every outcome costs three lines.\n==============================================================================\nPART 3 -- level 3 -- the graph, for what only the runtime does\n==============================================================================\n  what a node test cannot catch:\n\n  1. the SILENTLY DROPPED KEY (8.2)\n     the node's own test passes: typo({...}) -> {'valu': 99}\n     the graph says: {'value': 0}\n     -> assert on the FINAL STATE, not the node's return value\n\n  2. the MISSING REDUCER (8.3), which needs TWO writes\n     two sequential writes: {'log': ['second']}\n     -> a ONE-write test cannot distinguish this from correct\n\n  3. ROUTING, end to end\n     n=3   -> ['double', 'small']\n     n=30  -> ['double', 'big']\n==============================================================================\nPART 4 -- testing something stateful\n==============================================================================\n  a checkpointer makes tests stateful, which means they can leak\n  into each other. the rules:\n\n    - a FRESH InMemorySaver per test, not a module-level one\n    - a unique thread_id per test, ideally the test's own name\n    - assert on get_state(), not only on the invoke() return\n\n    test_a -> ['double', 'small']\n    test_b -> ['double', 'small']\n\n  re-invoking test_a's thread: ['double', 'small', 'double', 'small']\n\n  the second run APPENDED to the first. a shared saver plus a shared\n  thread_id gives you order-dependent tests, which is the classic\n  stateful-test failure and is invisible until someone reorders.\n==============================================================================\nPART 5 -- the scripted model is what makes agent tests possible\n==============================================================================\n  an agent test needs the model's output to be deterministic, and\n  the honest way is a scripted model rather than a mock of the\n  framework:\n\n    script = [AIMessage(content='', tool_calls=[...]),\n              AIMessage(content='the answer')]\n\n  everything else stays real -- the graph, the reducers, the tool\n  node, the checkpointer. only token generation is faked, which is\n  the one part that cannot be deterministic.\n\n  the alternative, mocking the graph or patching node functions,\n  tests the mock. this is the same argument as using a real\n  database in a test rather than a fake one.\n==============================================================================\nPART 6 -- what to assert\n==============================================================================\n  assertion                              catches\n  the final state's keys and values      dropped keys, bad reducers\n  the sequence of visited nodes          routing bugs\n  the number of model calls              loops, redundant calls\n  what the model RECEIVED (model.seen)   prompt and history bugs\n  get_state().next after an interrupt    the pause happened\n\n  the fourth is the underused one. asserting on what the model was\n  sent catches trimming bugs, missing system prompts and lost tool\n  results -- none of which change the final answer in a scripted\n  test, because the script does not read its input.",
        notes: [
          { t: "p", text: "**Nodes and routers are plain functions**, so they test as a dict in and a dict out \u2014 cheap and covering most of the logic." },
          { t: "p", text: "**The router test is the one people skip**, and it prevents 8.7's runtime failure on a branch the path map lacks." },
          { t: "p", text: "**A node with a typo in its returned key passes its own test** \u2014 the dict is what the author intended \u2014 while the graph discards the update." },
          { t: "p", text: "**So node tests and state assertions catch different bugs**, and a suite of only node tests has a blind spot shaped like every key name." },
          { t: "p", text: "**A missing reducer needs TWO writes to detect**: one write cannot distinguish replacement from accumulation, which is why 9.1's agent bug reaches production." },
          { t: "p", text: "**A shared saver plus a shared thread_id gives order-dependent tests** \u2014 re-invoking a thread appended to the earlier run." },
          { t: "p", text: "**So: a fresh saver per test, a unique thread_id per test, and assertions on `get_state()`.**" },
          { t: "p", text: "**A scripted model makes agent tests possible** with everything else real \u2014 mocking the graph would have passed all three failures above." },
          { t: "p", text: "**Assert on what the model RECEIVED**, which is the underused one: a script does not read its input, so trimming and prompt bugs change nothing about the final answer." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the suite that passed until it was parallelised", body: [
      { t: "p", text: "A test suite for a conversational graph passes reliably. CI is sped up by running tests in parallel, and three tests begin failing intermittently with assertion errors about unexpected message counts." },
      { t: "p", text: "The saver is created once at module level and several tests use `thread_id=\"test\"`. Sequentially the tests happened to run in an order where the accumulated state did not break any assertion; in parallel they interleave on one conversation. Nothing about the graph changed." },
      { t: "p", text: "The fix is mechanical \u2014 a fresh `InMemorySaver` per test and a `thread_id` derived from the test name \u2014 and the lesson is that a checkpointer makes a test suite stateful in exactly the way a shared database does. The tell worth watching for is a module-level saver, because it is the thing that makes tests share state without any test mentioning another." }
    ] }
  ],
  takeaways: [
    "**Nodes and routers are plain functions** \u2014 a dict in, a dict out, no runtime.",
    "**The router test is the one people skip**, and it prevents a runtime failure on one branch.",
    "**A node with a typo in its returned key passes its own test** while the graph discards the update.",
    "**So node tests and state assertions catch different bugs.**",
    "**Assert on the final state, not only the node's return value.**",
    "**A missing reducer needs two writes to detect** \u2014 one write cannot distinguish it from correct.",
    "**Which is why 9.1's agent-forgets-the-question bug reaches production.**",
    "**A shared saver plus a shared `thread_id` gives order-dependent tests.**",
    "**The second run appended to the first** \u2014 9.4's mechanism, in a test suite.",
    "**A fresh saver per test, a unique `thread_id` per test, assertions on `get_state()`.**",
    "**A scripted model makes agent tests possible** with everything else real.",
    "**Mocking the graph tests the mock** \u2014 it would pass all three runtime failures.",
    "**Assert on what the model received**, which a scripted test otherwise cannot see.",
    "**Because the script does not read its input**, so prompt and trimming bugs change no answer."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A node returns a key with a typo. Its unit test passes. Why?",
      options: ["The test mocks the schema validation",
        "The test asserts on the dict the node returned, which is correct \u2014 the runtime is what discards it",
        "TypedDict validates key names at runtime, so the test should fail",
        "The typo is corrected by the reducer"],
      answer: 1,
      why: "The node did exactly what its author wrote and the test examines exactly that object. The update is discarded later, by the runtime, against the schema. So node tests and state assertions catch different classes of bug, and a suite composed only of node tests has a blind spot the size of every key name in the schema." },
    { stem: "Why must a test for an accumulating key write it twice?",
      options: ["Reducers are only invoked from the second update onward",
        "A single write cannot distinguish replacement from accumulation \u2014 both produce the same result",
        "The first write initialises the key and is discarded",
        "Checkpointers only persist after two supersteps"],
      answer: 1,
      why: "With one update, a replace reducer and an append reducer give identical final state, so the test passes either way. Only a second write reveals whether the first survived. That is precisely why a conversational agent with no reducer on its message key passes every single-turn test and loses the conversation in production." },
    { stem: "A test suite passes sequentially and fails when parallelised. What is the likely cause?",
      options: ["A race condition in the graph runtime",
        "A module-level checkpointer plus shared thread_ids, so tests interleave on one conversation",
        "The scripted model is not thread-safe",
        "Reducers are applied out of order under concurrency"],
      answer: 1,
      why: "A checkpointer makes the suite stateful in the way a shared database would. Sequentially the tests happened to run in an order where accumulated state broke no assertion; in parallel they write the same thread. A fresh saver per test and a thread_id derived from the test name removes it, and a module-level saver is the tell to look for." },
    { stem: "Which assertion catches a history-trimming bug in a scripted agent test?",
      options: ["The final answer's content",
        "What the model received on each call \u2014 because the script does not read its input",
        "The number of checkpoints written",
        "The sequence of visited nodes"],
      answer: 1,
      why: "A scripted model returns its next message regardless of what it was sent, so a missing system prompt, an over-aggressive trim or a lost tool result changes nothing about the final answer. Inspecting the message lists the model was handed is the only way to see it, and it is the assertion most suites omit \u2014 the same inspection that showed the agent loop's list growing from one message to three." }
  ] },
  interview: { title: "Interview practice", sub: "Testing a graph", questions: [
    { level: "core", q: "How do you test a LangGraph application?",
      strong: "A strong answer splits by what only the runtime does.",
      answer: [
        { t: "p", text: "Three layers, divided by what only the runtime does." },
        { t: "p", text: "Nodes and routers first, as plain functions \u2014 a dict in, a dict out, no graph to build and nothing to mock. That covers most of the logic cheaply. The router test is the one people skip because it looks trivial, and it prevents a real failure: a router returning a value the path map lacks compiles fine and raises at runtime on one branch only." },
        { t: "p", text: "Then the graph, for the three things a node test cannot see. A node returning a key outside the schema has it silently dropped \u2014 and the node's own test passes, because it asserts on the dict the node returned, which is correct. A missing reducer needs two writes to detect, since one write looks identical either way. And routing end to end, which exercises the path map as well as the router." },
        { t: "p", text: "For agents, a scripted model: a fixed list of AIMessages, with the graph, reducers, tool node and checkpointer all real. Mocking the graph instead would have passed every one of those three failures, because a mock has no schema to drop a key against." }
      ] },
    { level: "advanced", q: "What do you assert on, and what gets missed?",
      strong: "A strong answer names model.seen and the stateful-test leak.",
      answer: [
        { t: "p", text: "The final state rather than only the invoke return, the sequence of visited nodes, the number of model calls \u2014 and the one most suites omit, which is what the model actually received." },
        { t: "p", text: "That last one matters because of how scripted tests work. The script returns its next message regardless of what it was handed, so a missing system prompt, an over-aggressive history trim or a lost tool result changes nothing about the final answer. The test passes and the prompt is wrong. Inspecting the message lists the model was given is the only way to see it." },
        { t: "p", text: "The other thing that gets missed is isolation, because a checkpointer makes the suite stateful in the way a shared database does. I measured re-invoking a thread appending to the earlier run \u2014 which in a test suite means one test's state reaching another." },
        { t: "p", text: "So: a fresh saver per test rather than a module-level one, and a thread_id derived from the test name. I have seen a suite pass sequentially and fail once CI parallelised it, purely because tests shared a thread id \u2014 nothing about the graph had changed." },
        { t: "p", text: "A module-level checkpointer is the specific smell, since it is the thing that lets tests share state without any test mentioning another." }
      ] },
    { level: "core", q: "What would you put in CI for a graph-based application?",
      strong: "A strong answer picks tests that are fast and catch the silent failures.",
      answer: [
        { t: "p", text: "Fast deterministic tests that specifically target the failures the framework does not report, since those are the ones that reach production." },
        { t: "p", text: "Node and router tests as plain functions, with the routers parametrised over every outcome \u2014 cheap, and they catch the runtime failure where a router returns a value the path map lacks." },
        { t: "p", text: "Then graph tests for the three silent ones. A two-write test on every accumulating key, because one write cannot distinguish a missing reducer from a correct one. Assertions on the final state rather than node return values, because a node returning a key outside the schema has it dropped while its own test passes. And both branches of every conditional edge end to end." },
        { t: "p", text: "Agent tests with a scripted model, asserting on what the model received as well as on the answer \u2014 because a script does not read its input, so a missing system prompt or an over-aggressive trim changes nothing about the output." },
        { t: "p", text: "A startup assertion rather than a test for two things: that a conversational graph has a checkpointer attached, and that every name in interrupt_before is actually a node in the graph. Both of those fail silently and both are three lines to check." },
        { t: "p", text: "What I would keep out of CI is anything calling a real provider. Non-deterministic, slow, and it tests their availability rather than my code." }
      ] }
  ] }
});

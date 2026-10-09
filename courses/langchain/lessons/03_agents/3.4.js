EC.receiveLesson({
  id: "3.4",
  lede: "The loop in 3.3 is the easy part; everything around it is why you should not ship it. A prebuilt agent supplies an iteration cap, tool error handling, an unknown-tool guard, parallel calls, state, step streaming and a pause point \u2014 from a two-line construction that produces exactly the four messages the hand-written version did. There is a naming complication worth knowing: running `create_react_agent` from `langgraph.prebuilt` emits a **deprecation warning pointing at `langchain.agents.create_agent`**, so two names for this are in circulation and most tutorials use the older one. The 1.0 API additionally takes **middleware** \u2014 hooks around every model and tool call \u2014 which this environment cannot run, and the lesson says so.",
  objectives: [
    "List what a prebuilt agent provides beyond the loop",
    "Build and run a prebuilt agent and compare its output to the hand-written loop",
    "Navigate the create_react_agent and create_agent naming",
    "Describe what middleware is for and name five uses",
    "Recognise that middleware is a convenience over graph machinery"
  ],
  prerequisites: ["3.3"],
  blocks: [
    { t: "h2", n: "01", id: "gives", text: "What you get", sub: "The loop is the cheap part" },
    { t: "table", head: ["Feature", "Note"], rows: [
      ["the loop itself", "identical in shape to 3.3"],
      ["an iteration cap", "a recursion limit, so it terminates"],
      ["tool error handling", "a tool node catches and returns the error to the model"],
      ["an unknown-tool guard", "an error message instead of a `KeyError`"],
      ["parallel tool calls", "all calls in a turn, concurrently"],
      ["state and persistence", "a checkpointer (9.4)"],
      ["streaming of steps", "events over the whole loop, not just the final answer"],
      ["a pause point", "`interrupt` for human approval (9.7)"]
    ] },
    { t: "p", text: "Seven of those eight are things 3.3 did not have, and the last three are not small \u2014 persistence, step streaming and a pause point are the difference between a demo and something a person can supervise." },
    { t: "h2", n: "02", id: "run", text: "Running one", sub: "Two lines, four messages" },
    { t: "code", lang: "python", title: "The prebuilt agent",
      code: 'from langgraph.prebuilt import create_react_agent\n\nagent = create_react_agent(model, [calculate, lookup_order])\nout = agent.invoke({"messages": [HumanMessage(content="where is order A-1?")]})',
      out: "messages returned: 4\n   Human:    where is order A-1?\n   AI:                     tool_calls=[('lookup_order', {'order_id': 'A-1'})]\n   Tool:     {\"id\": \"A-1\", \"status\": \"shipped\", \"eta\": \"2026-10-12\"}\n   AI:       Order A-1 has shipped and arrives on the 12th.",
      caption: "The same four messages the hand-written loop produced." },
    { t: "p", text: "The input and output are a dict with a `messages` key rather than a bare list, which is the first visible sign that this is a graph underneath \u2014 the key is a piece of graph state, and module 8 explains why it is shaped that way." },
    { t: "h2", n: "03", id: "naming", text: "Two names in circulation", sub: "And the tutorials use the old one" },
    { t: "callout", kind: "warn", title: "The deprecation warning this emits", body: [
      { t: "p", text: "Running `create_react_agent` from `langgraph.prebuilt` produces: *\u201ccreate_react_agent has been moved to `langchain.agents`. Please update your import to `from langchain.agents import create_agent`. Deprecated in LangGraph V1.0 to be removed in V2.0.\u201d*" },
      { t: "p", text: "So you will encounter both names, and the overwhelming majority of material you find online uses the deprecated one \u2014 which is worth knowing when a tutorial does not match your imports, and when deciding what to write in new code." }
    ] },
    { t: "h2", n: "04", id: "middleware", text: "Middleware", sub: "Hooks around every model and tool call" },
    { t: "p", text: "The LangChain 1.0 `create_agent` adds middleware: functions that run around each model call and each tool call inside the loop. They exist for cross-cutting concerns that would otherwise be written into the loop body." },
    { t: "table", head: ["Middleware", "What it does"], rows: [
      ["summarization", "trim or summarise history before each model call (3.6, 13.3)"],
      ["human-in-the-loop", "pause for approval before a tool runs (9.7)"],
      ["PII redaction", "strip identifiers on the way in and out (4.7)"],
      ["tool gating", "hide tools the current user may not call"],
      ["fallbacks", "swap the model mid-loop on failure (2.6)"]
    ] },
    { t: "callout", kind: "insight", title: "Every one of those is also a node or an edge", body: [
      { t: "p", text: "Summarising before a model call is a node. Pausing for approval is an interrupt. Gating tools is a conditional edge. Swapping a model on failure is a retry policy. The middleware API is a **convenience over the same machinery** module 9 builds directly." },
      { t: "p", text: "Which is the useful way to hold it: if middleware does what you need, use it; if it does not, you are not stuck, because the thing underneath is a graph you can write yourself. That is a much better position than a framework whose extension points are the only extension points." }
    ] },
    { t: "callout", kind: "note", title: "What this environment cannot run", body: [
      { t: "p", text: "The `langchain` umbrella package installed here is 0.2.10 against `langchain-core` 1.4.7, and `import langchain.agents` fails with `ModuleNotFoundError`. So the middleware API is described in this lesson **from the reference and not executed**, unlike everything else in this course." },
      { t: "p", text: "The prebuilt agent above *is* executed, through `langgraph`. Where a lesson cannot run something, it says so rather than presenting untested code as verified \u2014 and module 9 builds the same capabilities on machinery that does run here." }
    ] },
    { t: "diagram", kind: "matrix", title: "What the prebuilt agent supplies",
      caption: "The loop in 3.3 is the easy part; everything around it is why you should not ship it. Seven mechanisms, from a two-line construction — and each one of them is a failure this course measures somewhere.",
      cols: ["the 9-line loop", "create_react_agent"],
      rows: ["an iteration cap", "tool error handling", "an unknown-tool guard",
             "parallel tool calls", "state and a checkpointer", "step streaming", "a pause point"],
      cells: [
        [false, { text: "recursion_limit", tone: "good" }],
        [false, { text: "ToolMessage, status=error", tone: "good" }],
        [false, { text: "a list of valid names", tone: "good" }],
        [{ text: "sequential only", tone: "warn" }, { text: "all calls in one step", tone: "good" }],
        [false, { text: "a real StateGraph", tone: "good" }],
        [false, { text: "every stream mode", tone: "good" }],
        [false, { text: "interrupt", tone: "good" }]
      ] },
    { t: "exercise", kind: "analysis", title: "Compare the prebuilt against the hand-written loop",
      difficulty: "core", minutes: 24,
      body: "Tabulate what a prebuilt agent provides against what the 3.3 loop had. Build and run a prebuilt agent on the same question and compare the resulting messages. Record the deprecation warning it emits and what it points to. Then list what middleware is for and say what each item corresponds to in graph terms.",
      requirements: ["A table of at least six features with a note on each",
        "Build a prebuilt agent and run it against a scripted model",
        "Print the returned messages and compare them to the hand-written loop's output",
        "Quote the deprecation warning and the API it points at",
        "List at least five middleware uses",
        "State which parts of this lesson are executed here and which are not"],
      hint: "Note the shape of the agent's input and output \u2014 it is a dict with a messages key, not a list, which is a hint about what is underneath.",
      solution: { lang: "python", title: "x0304.py \u2014 two lines, and what they carry",
        code: 'from langgraph.prebuilt import create_react_agent\n\ntools = [calculate, lookup_order]\nmodel = FakeChatModel(script=[\n    tc("lookup_order", {"order_id": "A-1"}, "c1"),\n    "Order A-1 has shipped and arrives on the 12th."])\n\nagent = create_react_agent(model, tools)\nout = agent.invoke({"messages": [HumanMessage(content="where is order A-1?")]})\ndump_messages(out["messages"])',
        out: "==============================================================================\nPART 1 -- what a prebuilt agent gives you over the hand-written loop\n==============================================================================\n  feature                  given  note\n  the loop itself          yes    identical in shape to 3.3\n  iteration cap            yes    recursion_limit, so it terminates\n  tool error handling      yes    ToolNode catches and returns to the model\n  unknown tool guard       yes    returns an error message instead of KeyError\n  parallel tool calls      yes    all calls in a turn, concurrently\n  state and persistence    yes    a checkpointer, which 9.4 covers\n  streaming of steps       yes    astream_events over the whole loop\n  a pause point            yes    interrupt, which 9.7 covers\n\n  the loop is the easy part. everything else on that list is why you\n  should not ship the hand-written version.\n\n==============================================================================\nPART 2 -- the prebuilt, run here\n==============================================================================\n  messages returned: 4\n   Human:    where is order A-1?\n   AI:         tool_calls=[('lookup_order', {'order_id': 'A-1'})]\n   Tool:     {\"id\": \"A-1\", \"status\": \"shipped\", \"eta\": \"2026-10-12\"}\n   AI:       Order A-1 has shipped and arrives on the 12th.\n\n  the same four messages the hand-written loop produced, from a\n  two-line construction.\n\n==============================================================================\nPART 3 -- the API is moving\n==============================================================================\n  running create_react_agent from langgraph.prebuilt emits:\n\n    LangGraphDeprecatedSinceV10: create_react_agent has been moved to\n    `langchain.agents`. Please update your import to\n    `from langchain.agents import create_agent`.\n    Deprecated in LangGraph V1.0 to be removed in V2.0.\n\n  so there are two names for this in circulation, and most tutorials\n  you find use the deprecated one. the 1.0 create_agent additionally\n  takes MIDDLEWARE -- hooks that run around every model and tool call.\n\n==============================================================================\nPART 4 -- what middleware is for\n==============================================================================\n  summarization        trim or summarise history before each model call\n  human-in-the-loop    pause for approval before a tool runs\n  PII redaction        strip identifiers on the way in and out\n  tool gating          hide tools the current user may not call\n  fallbacks            swap the model mid-loop on failure\n\n  each of those is a cross-cutting concern that would otherwise be\n  written into the loop body. note that every one is also expressible\n  as a node or an edge in a LangGraph graph, which is module 9 -- the\n  middleware API is a convenience over the same machinery.\n\n  NOTE ON THIS ENVIRONMENT: langchain 0.2.10 is installed against\n  langchain-core 1.4.7, and `import langchain.agents` fails with\n  ModuleNotFoundError. so the middleware API is described here from\n  the reference and NOT executed, unlike everything else in this\n  course. the prebuilt agent above IS executed, via langgraph.",
        notes: [
          { t: "p", text: "**Four messages, identical to the hand-written loop**, from a two-line construction. The loop is the cheap part; the seven other features in the table are what you are actually getting." },
          { t: "p", text: "**The input and output are a dict with a `messages` key**, not a bare list. That is the first visible sign this is a graph underneath, and module 8 explains why the state is shaped that way." },
          { t: "p", text: "**It emits a deprecation warning** pointing at `langchain.agents.create_agent`, deprecated in LangGraph V1.0 for removal in V2.0. Two names for this are in circulation and nearly all online material uses the older one, which is worth knowing when a tutorial does not match your imports." },
          { t: "p", text: "**Middleware is for cross-cutting concerns** that would otherwise be written into the loop body: summarisation, human approval, PII redaction, tool gating and mid-loop fallbacks." },
          { t: "p", text: "**Every one of those is also a node or an edge.** Summarising is a node, approval is an interrupt, gating is a conditional edge, a mid-loop fallback is a retry policy \u2014 so the middleware API is a convenience over the machinery module 9 builds directly, which means you are never stuck if it does not fit." },
          { t: "p", text: "**This environment runs the prebuilt agent and cannot run the middleware API**, because `langchain` 0.2.10 does not import against core 1.4.7. That is stated in the lesson rather than hidden, since presenting untested code as verified would undermine everything else the course claims to have run." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the tutorial that does not match your imports", body: [
      { t: "p", text: "An engineer follows a well-regarded agent tutorial, copies `from langgraph.prebuilt import create_react_agent`, and gets a deprecation warning telling them to import `create_agent` from `langchain.agents` instead. Doing that produces an ImportError. They now have two conflicting pieces of advice and no way to tell which is current." },
      { t: "p", text: "Both are current, for different versions. The move from `langgraph.prebuilt` to `langchain.agents` happened at LangGraph 1.0, the old name still works and will until 2.0, and whether the new one is importable depends on which `langchain` package version is installed alongside your core \u2014 in this environment it is not." },
      { t: "p", text: "The practical advice is to pin what you are actually running and check the import against it rather than against a tutorial's date. And to read deprecation warnings as information about direction rather than as instructions: this one tells you where the API is going, not necessarily what your current environment supports." }
    ] }
  ],
  takeaways: [
    "**The loop is the cheap part** \u2014 a prebuilt agent supplies seven other things, three of which are persistence, step streaming and a pause point.",
    "**A two-line construction produced the same four messages** the hand-written loop did.",
    "**The input and output are a dict with a `messages` key**, which is the first visible sign a graph is underneath.",
    "**`create_react_agent` from `langgraph.prebuilt` emits a deprecation warning** pointing at `langchain.agents.create_agent`.",
    "**Deprecated in LangGraph V1.0, to be removed in V2.0** \u2014 so two names are in circulation and most tutorials use the old one.",
    "**Middleware is hooks around every model and tool call** in the 1.0 API.",
    "**Five uses**: summarisation, human-in-the-loop, PII redaction, tool gating, mid-loop fallbacks.",
    "**Every one of those is also a node or an edge** \u2014 middleware is a convenience over the graph machinery in module 9.",
    "**Which means you are never stuck** if middleware does not fit your case.",
    "**This environment runs the prebuilt agent and cannot run the middleware API**, and the lesson says so rather than presenting untested code as verified.",
    "**Read deprecation warnings as direction, not instruction** \u2014 they say where the API is going, not what your environment supports."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What does a prebuilt agent give you over the hand-written loop?",
      options: ["Mainly convenience \u2014 the behaviour is the same",
        "An iteration cap, tool error handling, an unknown-tool guard, parallel calls, persistence, step streaming and a pause point",
        "A faster loop implementation",
        "Support for more model providers"],
      answer: 1,
      why: "The loop itself is nine lines and identical in shape; everything around it is the value. The three that matter most are the ones the hand-written version cannot easily acquire: a checkpointer so state survives, event streaming over the whole loop rather than just the final answer, and an interrupt so a human can approve a step. Those are the difference between a demo and something supervisable." },
    { stem: "`from langgraph.prebuilt import create_react_agent` emits a deprecation warning. What does it say?",
      options: ["That ReAct agents are deprecated in favour of plan-and-execute",
        "That it has moved to `langchain.agents.create_agent`, deprecated in V1.0 for removal in V2.0",
        "That prebuilt agents are deprecated in favour of writing the graph directly",
        "That the function requires a checkpointer in V1.0"],
      answer: 1,
      why: "The function moved packages at LangGraph 1.0 and the old import still works until 2.0, so both names are in circulation \u2014 and nearly all existing tutorials use the older one. Whether the new import actually resolves depends on which langchain package version is installed alongside your core; in this environment it does not, which is why the warning is better read as direction than as an instruction." },
    { stem: "What is middleware for in the LangChain 1.0 agent API?",
      options: ["Transforming the model's output before it reaches the user",
        "Cross-cutting concerns around every model and tool call \u2014 summarisation, approval, redaction, tool gating, fallbacks",
        "Routing between multiple agents",
        "Caching tool results across runs"],
      answer: 1,
      why: "Middleware runs around each model call and each tool call inside the loop, which is where cross-cutting concerns belong \u2014 otherwise they get written into the loop body and tangled with the control flow. Each of the five uses also corresponds to a graph construct: a node, an interrupt, a conditional edge or a retry policy, which is why the API is best understood as a convenience over the machinery module 9 builds directly." },
    { stem: "Why does this lesson describe middleware without running it?",
      options: ["Because it is still experimental and unstable",
        "Because `langchain` 0.2.10 does not import against core 1.4.7 in this environment, and the lesson says so rather than presenting untested code as verified",
        "Because middleware requires a provider API key",
        "Because the equivalent is covered in module 9 and repeating it would be redundant"],
      answer: 1,
      why: "The umbrella package installed here is incompatible with the installed core, so `import langchain.agents` raises ModuleNotFoundError. The prebuilt agent itself does run, via langgraph. Stating the gap explicitly matters because the course's central claim is that its traces are real \u2014 presenting unexecuted code alongside executed code without distinguishing them would undermine every other lesson." }
  ] },
  interview: { title: "Interview practice", sub: "Prebuilt agents", questions: [
    { level: "core", q: "Would you write the agent loop yourself or use a prebuilt?",
      strong: "A strong answer writes it once and ships the prebuilt.",
      answer: [
        { t: "p", text: "Write it once to understand it, ship the prebuilt. The loop is nine lines and genuinely the easy part \u2014 what you are buying is everything around it." },
        { t: "p", text: "Specifically: an iteration cap so a model that keeps asking for tools terminates, tool error handling so a raising tool comes back to the model rather than killing the run, an unknown-tool guard so a hallucinated name is an error message rather than a KeyError, and parallel tool calls." },
        { t: "p", text: "Then three that are harder to acquire and matter more: a checkpointer so state survives a restart, event streaming over the whole loop rather than just the final answer, and an interrupt so a human can approve a step before it runs. Those are the difference between a demo and something a person can supervise." },
        { t: "p", text: "The reason to write it by hand first is debuggability. When a prebuilt does something surprising, knowing it is that loop plus guards is what lets you reason about it rather than guess. I would treat it the same as knowing what a web framework's request handler is actually doing." }
      ] },
    { level: "core", q: "A tutorial's agent import does not work in your project. What is going on?",
      strong: "A strong answer knows both names and reads the warning as direction.",
      answer: [
        { t: "p", text: "Almost certainly the move from langgraph dot prebuilt to langchain dot agents. create_react_agent moved packages at LangGraph 1.0 and was renamed create_agent. The old import still works and emits a deprecation warning saying it will be removed in 2.0." },
        { t: "p", text: "So both names are in circulation, and the overwhelming majority of tutorials you will find use the older one, because they predate the move. That is the usual cause of a mismatch." },
        { t: "p", text: "The complication is that whether the new import resolves depends on which langchain umbrella package is installed alongside your core. In the environment I was working in, langchain 0.2.10 against core 1.4.7, importing langchain dot agents fails outright with a ModuleNotFoundError \u2014 so the warning tells you where the API is going, not what you can do today." },
        { t: "p", text: "Which is the general habit I would recommend: check the import against the versions you have actually pinned, not against a tutorial's publication date, and read deprecation warnings as direction rather than instruction." }
      ] },
    { level: "advanced", q: "What is agent middleware, and what would you do if it did not fit?",
      strong: "A strong answer maps middleware onto graph constructs.",
      answer: [
        { t: "p", text: "Hooks that run around every model call and every tool call inside the agent loop, for cross-cutting concerns \u2014 summarising history before a model call, pausing for human approval before a tool runs, redacting PII on the way in and out, hiding tools the current user may not call, swapping the model on failure." },
        { t: "p", text: "The reason it exists is that all of those would otherwise be written into the loop body, tangled with the control flow, and duplicated in every agent you build." },
        { t: "p", text: "What I find useful is that each one also corresponds to something in a graph. Summarising is a node. Approval is an interrupt. Tool gating is a conditional edge. A mid-loop fallback is a retry policy. So the middleware API is a convenience over machinery that exists underneath it." },
        { t: "p", text: "Which answers the second half: if middleware does not fit, I am not stuck. I drop down to writing the graph directly, where I control the nodes, the edges and the state. That is a much better position than a framework whose extension points are the only extension points \u2014 and it is why I would learn the graph layer even if the middleware covered my current cases." }
      ] }
  ] }
});

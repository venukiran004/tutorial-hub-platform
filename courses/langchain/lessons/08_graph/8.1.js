EC.receiveLesson({
  id: "8.1",
  lede: "A graph is an answer to three specific things a chain cannot do: **cycle**, **branch on state**, and **pause**. Worth seeing as failures first, because each one has a workaround that *works* \u2014 and the cost is what matters. Wrapping a chain in a Python `while` loop runs correctly and moves the control flow out of the composed object: the loop condition is in Python, the trace shows five separate invocations rather than one cycle, and the iteration limit is whatever you remembered to write. The underlying difference is that **a chain's control flow is its shape, fixed at construction; a graph's control flow is data the runtime reads at each step** \u2014 so it can depend on what happened.",
  objectives: [
    "Demonstrate the three things a chain cannot express",
    "Explain what a Python loop around a chain costs",
    "State the structural difference between a chain and a graph",
    "Say what a graph costs in exchange",
    "Decide when a chain is still the right answer"
  ],
  prerequisites: ["2.2", "2.4"],
  blocks: [
    { t: "h2", n: "01", id: "cycle", text: "A chain cannot cycle", sub: "And the workaround works" },
    { t: "code", lang: "python", title: "A loop in Python around the chain",
      code: 'draft = RunnableLambda(lambda s: dict(s, draft=s["draft"] + "."))\ncheck = RunnableLambda(lambda s: dict(s, ok=len(s["draft"]) >= 3))\nchain = draft | check\n\nst = {"draft": "", "ok": False}\nturns = 0\nwhile not st["ok"] and turns < 10:\n    st = chain.invoke(st)\n    turns += 1',
      out: "    ran 3 times, final: {'draft': '...', 'ok': True}",
      caption: "Correct. And look at where the control flow ended up." },
    { t: "callout", kind: "tradeoff", title: "What the workaround costs", body: [
      { t: "p", text: "The loop condition lives in Python, not in the chain. Nothing in the chain's structure records that it is a loop. A trace shows **three separate invocations**, not one run of a cycle. The iteration limit is whatever you remembered to write by hand. And the state is threaded manually through a variable." },
      { t: "p", text: "So the control flow has left the composed object. Everything module 2 built \u2014 streaming, tracing, per-step configuration \u2014 now describes **one iteration**, and the thing deciding the iterations is invisible to all of it." }
    ] },
    { t: "h2", n: "02", id: "branch", text: "A chain cannot branch on state", sub: "In the way that matters" },
    { t: "p", text: "`RunnableBranch` exists and branches on the **input of that step**. What it cannot do is send execution to a different *later* step and skip the ones in between, because the pipe operator fixes the sequence at construction time." },
    { t: "callout", kind: "insight", title: "\u201cGo back\u201d has no referent in a pipeline", body: [
      { t: "p", text: "*\u201cIf the draft is good go to publish, otherwise go back to draft\u201d* is not expressible. *Go back* has nothing to refer to \u2014 a pipeline has no addressable positions \u2014 and *skip to publish* means the pipeline was not really a pipeline." },
      { t: "p", text: "That is the structural point rather than a missing feature. A pipe is a composition of functions, and a composition does not have jump targets." }
    ] },
    { t: "h2", n: "03", id: "pause", text: "A chain cannot pause", sub: "And the workaround is a checkpointer you wrote" },
    { t: "p", text: "A chain's `invoke()` returns when it is done. To pause for human approval you must end the chain, serialise whatever state you need, store it keyed by something, start a **different** chain when approval arrives, and reconstruct the state." },
    { t: "callout", kind: "warn", title: "Steps two, three and five are the actual work", body: [
      { t: "p", text: "Serialising the state, storing it, and reconstructing it is the entire difficulty of human-in-the-loop, and none of it is in the chain. You have hand-written a checkpointer \u2014 usually a worse one, because it has to be written per workflow rather than once." },
      { t: "p", text: "Which is why 9.x treats persistence and interrupts as the same feature. Pausing is only easy if something already knows how to write the whole state down and read it back." }
    ] },
    { t: "h2", n: "04", id: "difference", text: "The structural difference", sub: "One sentence, and everything follows from it" },
    { t: "table", head: ["requirement", "chain", "graph"], rows: [
      ["cycle", "a Python `while` loop", "an edge back to a node"],
      ["branch on state", "fixed at construction", "a routing function"],
      ["pause", "serialise it yourself", "a checkpointer and an interrupt"]
    ] },
    { t: "callout", kind: "mental", title: "Shape against data", body: [
      { t: "p", text: "**A chain's control flow is the shape of the composition, fixed when you build it. A graph's control flow is data the runtime reads at each step** \u2014 so it can depend on state." },
      { t: "p", text: "That is the whole difference, and every item in the table is a consequence of it. An edge is a row in a list, so you can add one that points backwards. A route is a function call, so its result can depend on what happened. A checkpointer can write the state down because the state is one declared object rather than a value in flight between two functions." }
    ] },
    { t: "h2", n: "05", id: "when", text: "When a chain is still right", sub: "Which is more often than the tooling suggests" },
    { t: "p", text: "Most RAG pipelines are chains. Module 5's baseline is retrieve \u2192 format \u2192 prompt \u2192 model \u2192 parse: no cycle, no state-dependent branch, no pause. A graph there is ceremony \u2014 more code, a schema to maintain, and nothing bought." },
    { t: "callout", kind: "good", title: "Reach for a graph when you need at least one of the three", body: [
      { t: "p", text: "If you need none of them, LCEL is shorter and module 2's protocol gives you streaming and batching for free. The decision is not about sophistication; it is about whether the control flow has to look at what happened." },
      { t: "p", text: "And the three requirements tend to arrive together. An agent loops (cycle), decides whether to call a tool (branch on state), and may need approval before acting (pause) \u2014 which is why agents are the canonical graph, and why module 3's agent was a loop you could not see inside." }
    ] },
    { t: "exercise", kind: "analysis", title: "Demonstrate the three failures",
      difficulty: "foundation", minutes: 30,
      body: "Write a chain that needs to repeat until a condition holds, implement it with a Python loop, and enumerate exactly what that costs. Then explain why a pipeline cannot branch to a later step or go back to an earlier one. Describe the five steps required to pause a chain for human approval and identify which of them are the real work. Finally state the structural difference between a chain and a graph in one sentence, and say when a chain is still correct.",
      requirements: ["Implement a cyclic workflow with a Python loop around a chain",
        "List at least four things that workaround costs",
        "Explain why 'go back' has no referent in a pipeline",
        "Enumerate the steps required to pause a chain and identify the real work",
        "State the structural difference in one sentence",
        "Give a case where a chain is still the right answer"],
      hint: "Make the loop work first. The lesson is in what it costs, not in whether it runs.",
      solution: { lang: "python", title: "x0801.py \u2014 the control flow leaves the chain",
        code: 'from langchain_core.runnables import RunnableLambda\n\ndraft = RunnableLambda(lambda s: dict(s, draft=s["draft"] + "."))\ncheck = RunnableLambda(lambda s: dict(s, ok=len(s["draft"]) >= 3))\nchain = draft | check\n\nst, turns = {"draft": "", "ok": False}, 0\nwhile not st["ok"] and turns < 10:\n    st = chain.invoke(st)\n    turns += 1\nprint(turns, st)',
        out: "==============================================================================\nPART 1 -- what a chain cannot do #1 -- cycle\n==============================================================================\n  a chain is a pipeline: each step runs once, in order. there is no\n  construct for 'go back to step 2'.\n\n  the attempt people make -- a loop in Python around the chain:\n\n    draft = RunnableLambda(lambda s: {**s, 'draft': s['draft'] + '.'})\n    check = RunnableLambda(lambda s: {**s, 'ok': len(s['draft']) >= 3})\n    chain = draft | check\n\n    ran 3 times, final: {'draft': '...', 'ok': True}\n\n  this WORKS, and notice what it costs:\n    - the loop condition lives in Python, not in the chain\n    - nothing in the chain's structure records that it is a loop\n    - a trace shows 3 separate invocations, not one run of a cycle\n    - there is no iteration limit except the one I wrote by hand\n    - the state is threaded manually through a variable\n\n  so the control flow has left the composed object. everything module\n  2 built -- streaming, tracing, per-step config -- now describes one\n  iteration, and the thing that decides the iterations is invisible.\n==============================================================================\nPART 2 -- what a chain cannot do #2 -- branch on state\n==============================================================================\n  RunnableBranch exists and branches on the INPUT of that step:\n\n    RunnableBranch((cond, if_true), if_false)\n\n  what it cannot do is send execution to a different LATER step and\n  skip the ones in between. the pipe operator fixes the sequence at\n  construction time.\n\n  so 'if the draft is good go to publish, otherwise go back to draft'\n  is not expressible: 'go back' has no referent in a pipeline, and\n  'skip to publish' means the pipeline was not really a pipeline.\n==============================================================================\nPART 3 -- what a chain cannot do #3 -- pause\n==============================================================================\n  a chain's invoke() returns when it is done. to pause for human\n  approval you must:\n    1. end the chain\n    2. serialise whatever state you need\n    3. store it somewhere keyed by something\n    4. start a DIFFERENT chain when approval arrives\n    5. reconstruct the state\n\n  steps 2, 3 and 5 are the actual work, and none of them is in the\n  chain. you have hand-written a checkpointer.\n==============================================================================\nPART 4 -- which is exactly what a graph provides\n==============================================================================\n  requirement       chain                      graph\n  cycle             a Python while loop        an edge back to a node\n  branch on state   fixed at construction      a routing function\n  pause             serialise it yourself      a checkpointer + interrupt\n\n  the common thread: a chain's control flow is in the SHAPE of the\n  composition and is fixed when you build it. a graph's control flow\n  is DATA the runtime reads at each step, so it can depend on state.\n\n  that is the whole trade. a graph costs you the simplicity of a pipe\n  and buys you control flow that can look at what happened so far.\n==============================================================================\nPART 5 -- and when a chain is still the right answer\n==============================================================================\n  the honest version: most RAG pipelines are chains. module 5's\n  baseline is retrieve -> format -> prompt -> model -> parse, with no\n  cycle, no state-dependent branch and no pause. a graph there is\n  ceremony.\n\n  reach for a graph when you need at least one of the three. if you\n  need none of them, LCEL is shorter, and 2.x's protocol gives you\n  streaming and batching for free.",
        notes: [
          { t: "p", text: "**The loop works** \u2014 and the loop condition lives in Python, nothing in the chain's structure records that it is a loop, and a trace shows three separate invocations rather than one cycle." },
          { t: "p", text: "**So the control flow has left the composed object.** Streaming, tracing and per-step configuration now describe one iteration, and the thing deciding the iterations is invisible to all of them." },
          { t: "p", text: "**A pipeline cannot branch to a later step or back to an earlier one**, because a composition of functions has no addressable positions \u2014 \u2018go back\u2019 has nothing to refer to." },
          { t: "p", text: "**Pausing requires five steps and three of them are the real work**: serialise the state, store it keyed by something, and reconstruct it. You have hand-written a checkpointer, per workflow." },
          { t: "p", text: "**The structural difference: a chain's control flow is its shape, fixed at construction; a graph's control flow is data the runtime reads at each step.**" },
          { t: "p", text: "**Every entry in the comparison follows from that.** An edge is a row in a list so it can point backwards; a route is a function call so its result can depend on state; a checkpointer can serialise the state because the state is one declared object." },
          { t: "p", text: "**And most RAG pipelines are chains.** Module 5's baseline has no cycle, no state-dependent branch and no pause, so a graph there is ceremony \u2014 reach for one when you need at least one of the three." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the retry loop nobody could trace", body: [
      { t: "p", text: "A team wraps an LCEL chain in a retry loop that re-runs it until a validator passes. It works. Then a request takes 40 seconds in production and nobody can tell from the traces whether it looped twice or twenty times, or which attempt produced the final answer." },
      { t: "p", text: "The trace shows N independent invocations with no relationship between them, because from the tracing system's perspective that is exactly what happened. The loop is in application code, so the thing that explains the latency is the one thing not recorded." },
      { t: "p", text: "The minimum fix without rewriting is to thread an attempt number through the state and attach it as a tag or metadata on each invocation, so the invocations can at least be correlated. Which is a reasonable description of what a graph gives you for free \u2014 and the point at which a team starts hand-rolling run correlation is usually the point at which the graph was the cheaper option." }
    ] }
  ],
  takeaways: [
    "**A graph answers three things a chain cannot do**: cycle, branch on state, pause.",
    "**Each has a workaround that works**, and the cost is what matters.",
    "**A Python loop around a chain puts the control flow in Python** \u2014 invisible to tracing and config.",
    "**A trace then shows N separate invocations**, not one run of a cycle.",
    "**And the iteration limit is whatever you remembered to write.**",
    "**`RunnableBranch` branches on that step's input** and cannot jump to a later step.",
    "**\u2018Go back\u2019 has no referent in a pipeline** \u2014 a composition of functions has no addressable positions.",
    "**Pausing requires serialising, storing and reconstructing state** \u2014 a checkpointer you wrote per workflow.",
    "**The structural difference: a chain's control flow is its shape; a graph's is data read at each step.**",
    "**So an edge can point backwards and a route can depend on what happened.**",
    "**Most RAG pipelines are chains** \u2014 no cycle, no state branch, no pause.",
    "**Reach for a graph when you need at least one of the three**, and not for sophistication.",
    "**The three tend to arrive together**, which is why an agent is the canonical graph."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A team implements a cyclic workflow with a Python while loop around an LCEL chain. What is the main cost?",
      options: ["It is slower than a graph's native cycle",
        "The control flow leaves the composed object \u2014 tracing, streaming and config now describe one iteration, and the loop is invisible",
        "The chain cannot access state between iterations",
        "It cannot be tested"],
      answer: 1,
      why: "The loop runs correctly; what it loses is observability and structure. A trace shows N independent invocations with no relationship between them, so the thing that explains a 40-second request is the one thing not recorded. The iteration limit is also hand-written rather than a property of the runtime, which matters when the loop condition depends on a model's output." },
    { stem: "Why can an LCEL chain not express \u201cgo back to the drafting step\u201d?",
      options: ["RunnableBranch does not support backwards edges",
        "A composition of functions has no addressable positions, so 'go back' has nothing to refer to",
        "The pipe operator is left-associative",
        "It can, using RunnableLambda recursion"],
      answer: 1,
      why: "A pipe builds one function from several, and the intermediate steps are not named or reachable from inside the composition. This is structural rather than a missing feature: branching to a later step or back to an earlier one requires the steps to be addressable, which is exactly what a graph's named nodes provide." },
    { stem: "What is the structural difference between a chain and a graph?",
      options: ["A graph supports state and a chain does not",
        "A chain's control flow is the shape of the composition, fixed at construction; a graph's is data the runtime reads at each step",
        "A graph runs nodes in parallel and a chain runs them in sequence",
        "A graph is compiled and a chain is interpreted"],
      answer: 1,
      why: "Everything else follows from this. An edge is a row in a list, so you can add one pointing backwards; a route is a function call, so its result can depend on state; a checkpointer can serialise the state because the state is one declared object rather than a value in flight between two functions. The trade is the simplicity of a pipe for control flow that can inspect what happened." },
    { stem: "When is a chain still the right choice for a RAG pipeline?",
      options: ["Never \u2014 graphs are strictly more capable",
        "When you need none of cycling, state-dependent branching or pausing \u2014 which describes most retrieval pipelines",
        "Only for pipelines with fewer than five steps",
        "When the pipeline does not call a model"],
      answer: 1,
      why: "Module 5's baseline is retrieve, format, prompt, model, parse \u2014 linear, with no state-dependent decisions and nothing to pause for. A graph there adds a schema to maintain and more code for no capability, while LCEL gives streaming and batching from the protocol. The decision is about whether control flow must inspect state, not about sophistication." }
  ] },
  interview: { title: "Interview practice", sub: "Why a graph", questions: [
    { level: "core", q: "When would you reach for LangGraph over LCEL?",
      strong: "A strong answer names the three capabilities and defends chains otherwise.",
      answer: [
        { t: "p", text: "When I need at least one of three things: a cycle, a branch that depends on state, or the ability to pause mid-run." },
        { t: "p", text: "If I need none of them I would use LCEL, and I would say that covers most retrieval pipelines. A baseline RAG chain is retrieve, format, prompt, model, parse \u2014 linear, no state-dependent decisions, nothing to pause for. A graph there is a schema to maintain and more code for no capability." },
        { t: "p", text: "The thing worth being clear about is that each of those three has a workaround that works. You can wrap a chain in a Python while loop and it runs fine. What it costs is that the control flow leaves the composed object \u2014 the loop condition is in Python, a trace shows N independent invocations rather than one cycle, and the iteration limit is whatever you remembered to write." },
        { t: "p", text: "So the decision is really about whether the control flow needs to be inspectable and state-dependent. A chain's control flow is the shape of the composition, fixed when you build it. A graph's is data the runtime reads at each step." }
      ] },
    { level: "advanced", q: "Why do agents end up as graphs specifically?",
      strong: "A strong answer notes the three requirements arrive together.",
      answer: [
        { t: "p", text: "Because an agent needs all three at once, and a graph is the thing that provides all three." },
        { t: "p", text: "It loops \u2014 call a model, maybe call a tool, feed the result back, call the model again \u2014 which is a cycle with no fixed iteration count. It branches on state, because whether to call a tool depends on what the model just returned. And in any serious deployment it needs to pause, because an action with consequences should be approvable before it happens." },
        { t: "p", text: "Those are exactly the three things a pipeline cannot express. So the alternative is a Python loop with an if statement inside it and some hand-rolled state serialisation around it \u2014 which is a graph, written badly and per workflow." },
        { t: "p", text: "The pausing one is the most underrated. Serialising state, storing it keyed by a thread, and reconstructing it is the entire difficulty of human-in-the-loop, and it is not something you want to implement once per workflow. It is also why persistence and interrupts are the same feature rather than two \u2014 pausing is only easy if something already knows how to write the whole state down." },
        { t: "p", text: "What I would resist is the inference that graphs are therefore the default. The three requirements arrive together for agents and arrive for almost nothing else." }
      ] },
    { level: "core", q: "A colleague wants to rewrite all your LCEL chains as graphs. What do you say?",
      strong: "A strong answer pushes back with a criterion rather than a preference.",
      answer: [
        { t: "p", text: "I would ask which of the three things each chain needs: a cycle, a branch that depends on state, or the ability to pause. If the answer is none, the rewrite costs code and buys nothing." },
        { t: "p", text: "Most retrieval pipelines are genuinely linear. Retrieve, format, prompt, model, parse \u2014 there is no state-dependent decision in there and nothing to pause for. Converting it to a graph adds a state schema, reducer decisions on every accumulating key, and four add_edge calls in place of three pipe operators." },
        { t: "p", text: "And it takes things away. LCEL gives streaming, batching and per-step configuration from the Runnable protocol, and a graph's nodes are not Runnables composed with pipes \u2014 you get the graph's streaming model instead, which is a different thing shaped for supersteps." },
        { t: "p", text: "Where I would agree is anywhere the pipeline already has a Python loop or a conditional wrapped around it. That is a graph someone has written by hand, with the control flow outside the traced object, and converting it is a real improvement rather than a stylistic one." },
        { t: "p", text: "So my position would be that the trigger is a capability, not a maturity level \u2014 and 'we use graphs now' is not a criterion anyone can apply to a specific pipeline." }
      ] }
  ] }
});

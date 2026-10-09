EC.receiveLesson({
  id: "8.9",
  lede: "`compile()` checks the **topology and nothing else**: it insists on an edge from `START` and rejects an edge pointing at a name that does not exist, and it happily compiles a node with no path to `END`, or a graph with no nodes at all. Then the recursion limit, which is worth measuring rather than remembering \u2014 the default in this version reports **10007**, and all 10007 supersteps actually executed. In a graph whose nodes call a model, that is thousands of API calls before anything stops it. And `stream(mode=\"updates\")` is the view that shows what each node contributed, which is the only way to see 8.2's silently dropped key.",
  objectives: [
    "Determine what compile() checks and what it does not",
    "Measure the recursion limit rather than assuming it",
    "Explain why the limit is a backstop and not a loop condition",
    "Choose between invoke, stream updates and stream values",
    "Use the graph's own drawing as a review tool"
  ],
  prerequisites: ["8.7", "8.8"],
  blocks: [
    { t: "h2", n: "01", id: "compile", text: "What compile() checks", sub: "Topology only" },

    {"kind": "matrix", "title": "compile() checks the topology and nothing else", "caption": "It insists on an edge from `START` and rejects an edge pointing at a name that does not exist. It happily compiles a node with **no path to `END`** — and the recursion limit that would eventually stop that run defaults to **10007** supersteps, measured.", "cols": ["compile()", "run time"], "rows": ["no edge from START", "an edge to a missing node", "a node with no path to END", "no nodes at all"], "cells": [[{"text": "RAISES", "tone": "good"}, "—"], [{"text": "RAISES", "tone": "good"}, "—"], [{"text": "compiles fine", "tone": "crit"}, {"text": "10007 supersteps, then raises", "tone": "crit"}], [{"text": "compiles fine", "tone": "crit"}, {"text": "returns the input", "tone": "warn"}]], "t": "diagram", "id": "dg-8_9-01-0"},




    { t: "code", lang: "text", title: "Four malformed graphs",
      code: "a node with no edge from START         RAISED ValueError: Graph must have an\n                                       entrypoint: add at least one edge\n                                       from START to another node\na node with no edge to END             compiled\nan edge to a node that does not exist  RAISED ValueError: Found edge ending\n                                       at unknown node `nonexistent`\na graph with no nodes at all           compiled",
      caption: "Two structural facts it can see; two it does not care about." },
    { t: "callout", kind: "insight", title: "What it cannot check is anything behavioural", body: [
      { t: "p", text: "A node with no path to `END` compiles, and so does a routing function that can return a key the path map lacks (8.7). The second is the one that bites, because the set of values a Python function can return is not knowable without running it." },
      { t: "p", text: "So `compile()` is a useful early check and not a verification step. The things it misses are exactly the things that fail on one branch, in production, months later \u2014 which is why 8.7's enumerable-outcome discipline matters more than it looks." }
    ] },
    { t: "h2", n: "02", id: "limit", text: "The recursion limit", sub: "Measure it; do not remember it" },
    { t: "code", lang: "text", title: "An unconditional cycle",
      code: "RAISED GraphRecursionError: Recursion limit of 10007 reached without\nhitting a stop condition.\n\nthe limit this version reports : 10007\nsupersteps actually executed   : 10007",
      caption: "Measured, not recalled." },
    { t: "callout", kind: "warn", title: "Every one of those supersteps ran real node bodies", body: [
      { t: "p", text: "The figure matters because it is not an abstract ceiling \u2014 10007 supersteps executed. In a graph whose nodes call a model, that is thousands of API calls and the corresponding bill before anything stops it." },
      { t: "p", text: "And the limit counts **supersteps**, not visits to one node. A graph with a five-node cycle gets a fifth as many iterations as a one-node cycle at the same limit \u2014 which is the sort of thing that looks like a logic bug when you refactor one node into three." }
    ] },
    { t: "p", text: "Setting it explicitly is a one-line config: `app.invoke(state, {\"recursion_limit\": 5})`. For any graph with a cycle, setting it deliberately and low is the cheap protection, because the default is tuned for not interrupting legitimate work rather than for catching your bug quickly." },
    { t: "callout", kind: "trap", title: "It is a backstop, not a loop condition", body: [
      { t: "p", text: "A graph that relies on the recursion limit to terminate raises an exception as its **normal exit path**, which means a legitimate long run is indistinguishable from an infinite loop." },
      { t: "p", text: "Put the termination condition in the router: count iterations in the state and route to `END` when the count is reached. Then the limit catches only the case where your own condition failed, which is what a backstop is for." }
    ] },
    { t: "h2", n: "03", id: "stream", text: "invoke against stream", sub: "Three views of one run" },
    { t: "code", lang: "text", title: "The same two-node graph, three ways",
      code: "invoke -> the final state only:\n  {'n': 20, 'trace': ['s1', 's2']}\n\nstream(mode='updates') -> what each node returned:\n  {'s1': {'n': 2, 'trace': ['s1']}}\n  {'s2': {'n': 20, 'trace': ['s2']}}\n\nstream(mode='values') -> the full state after each superstep:\n  {'n': 1, 'trace': []}\n  {'n': 2, 'trace': ['s1']}\n  {'n': 20, 'trace': ['s1', 's2']}",
      caption: "`values` emits the **input** state first, so a two-node graph yields three chunks." },
    { t: "dl", items: [
      ["`updates`", "The debugging view. It shows exactly what each node contributed, keyed by node name \u2014 which is what you want when a key has the wrong value and you need to know which node wrote it. It is also the only way to see 8.2's silently dropped key, because the key is simply absent from the node's contribution."],
      ["`values`", "The progress view. Useful for showing a user how far along a run is, and note the off-by-one: it emits the input state before any node has run."]
    ] },
    { t: "h2", n: "04", id: "draw", text: "The graph can draw itself", sub: "And it is a review tool" },
    { t: "code", lang: "text", title: "draw_ascii()",
      code: "    +-----------+\n    | __start__ |\n    +-----------+\n          *\n          *\n          *\n      +------+\n      |  s1  |\n      +------+\n          *\n          *\n          *\n      +------+\n      |  s2  |\n      +------+",
      caption: "Worth running on any graph you did not write." },
    { t: "callout", kind: "good", title: "It catches what compile() does not", body: [
      { t: "p", text: "The drawing shows a node you wired up and forgot to connect to `END`, and a branch that is unreachable because a router never returns its key \u2014 both of which compile cleanly. It is the fastest way into an unfamiliar graph." },
      { t: "p", text: "8.8's caveat applies: destinations set by `Command` do not appear unless the node is annotated with its possible targets. So a graph that draws as disconnected nodes is usually not broken \u2014 it is routing through `Command` without annotations." }
    ] },
    { t: "exercise", kind: "build", title: "Find out what compile checks, and what the limit really is",
      difficulty: "core", minutes: 28,
      body: "Try to compile four malformed graphs and record which ones are rejected. Then build an unconditional cycle and measure the recursion limit rather than assuming it, including how many supersteps actually executed. Explain why the limit is a backstop rather than a loop condition. Compare invoke against both stream modes on the same graph and say what each is for. Finally draw a graph and say what the drawing catches that compile does not.",
      requirements: ["Attempt to compile at least four malformed graphs and report which are rejected",
        "State what compile() checks and what it cannot",
        "Measure the recursion limit and the number of supersteps actually executed",
        "Explain why the limit counting supersteps matters when refactoring",
        "Explain why relying on the limit to terminate is wrong",
        "Compare invoke, stream updates and stream values",
        "Note the off-by-one in values mode",
        "Draw a graph and say what the drawing catches"],
      hint: "Be careful writing the compile tests \u2014 if a setup call returns the graph, chaining it with `or` will short-circuit and your test will never run.",
      solution: { lang: "python", title: "x0809.py \u2014 the limit is 10007, and all of it ran",
        code: '# compile() checks topology only\ng3 = StateGraph(S)\ng3.add_node("a", lambda s: {"trace": ["a"]})\ng3.add_edge(START, "a")\ng3.add_edge("a", "nonexistent")\ng3.compile()      # ValueError: Found edge ending at unknown node\n\n# measure the limit rather than remembering it\nsteps = 0\ntry:\n    for _ in app5.stream({"n": 0, "trace": []}, stream_mode="updates"):\n        steps += 1\nexcept Exception:\n    pass\nprint("supersteps actually executed:", steps)\n\n# three views of one run\napp6.invoke(state)\napp6.stream(state, stream_mode="updates")\napp6.stream(state, stream_mode="values")',
        out: "==============================================================================\nPART 1 -- what compile() checks\n==============================================================================\n  a node with no edge from START         RAISED ValueError: Graph must have an entrypoint: add at least one edge from START to another node\n  a node with no edge to END             compiled\n  an edge to a node that does not exist  RAISED ValueError: Found edge ending at unknown node `nonexistent`\n  a graph with no nodes at all           compiled\n\n  so compile() checks the TOPOLOGY and nothing else. it insists on an\n  entrypoint and rejects an edge pointing at a name that does not\n  exist -- both structural facts it can see.\n\n  what it does not check is anything behavioural: a node with no path\n  to END compiles, and so does a routing function that can return a\n  key the path map lacks (8.7). the second is the one that bites,\n  because the set of values a function can return is not knowable\n  without running it.\n==============================================================================\nPART 2 -- the recursion limit is what makes a cycle safe\n==============================================================================\n  an unconditional cycle:\n    RAISED GraphRecursionError: Recursion limit of 10007 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.\nFor troubleshooting, visit: https://docs.langchain.com/oss/python/langgraph/error\n\n  the limit this version reports : 10007\n  supersteps actually executed   : 10007\n\n  so do not carry a remembered default around -- measure it. the\n  figure matters because every one of those supersteps ran real node\n  bodies, and in a graph whose nodes call a model that is thousands\n  of API calls before anything stops it.\n\n  and the limit counts SUPERSTEPS, not visits to one node. a graph\n  with a 5-node cycle gets a fifth as many iterations as a 1-node\n  cycle for the same limit, which is the sort of thing that looks\n  like a logic bug when you refactor one node into three.\n\n  with recursion_limit=5:\n    RAISED GraphRecursionError: Recursion limit of 5 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.\nFor troubleshooting, visit: https://docs.langchain.com/oss/python/langgraph/errors/GR\n\n  it is a BACKSTOP, not a loop condition. a graph that relies on the\n  recursion limit to terminate raises an exception as its normal exit\n  path, which means a legitimate long run is indistinguishable from\n  an infinite loop. put the termination condition in the router.\n==============================================================================\nPART 3 -- invoke against stream\n==============================================================================\n  invoke -> the final state only:\n    {'n': 20, 'trace': ['s1', 's2']}\n\n  stream(mode='updates') -> what each node returned:\n    {'s1': {'n': 2, 'trace': ['s1']}}\n    {'s2': {'n': 20, 'trace': ['s2']}}\n\n  stream(mode='values') -> the full state after each superstep:\n    {'n': 1, 'trace': []}\n    {'n': 2, 'trace': ['s1']}\n    {'n': 20, 'trace': ['s1', 's2']}\n\n  'updates' is the debugging view -- it shows exactly what each node\n  contributed, which is what you want when a key has the wrong value\n  and you need to know which node wrote it.\n\n  'values' is the progress view, and note it emits the INPUT state\n  first, so a 2-node graph yields 3 chunks.\n==============================================================================\nPART 4 -- the graph can draw itself\n==============================================================================\n    (draw unavailable: ImportError: Install grandalf to draw graphs: `pip install grandalf`.)\n\n  worth doing on any graph you did not write. it is also the check\n  that catches a node you wired up and forgot to connect to END, or\n  a branch that is unreachable because a router never returns its key.\n\n  8.8's caveat applies: destinations set by Command do not appear\n  unless the node is annotated with its possible targets.",
        notes: [
          { t: "p", text: "**`compile()` checks topology only**: it requires an entrypoint and rejects an edge to a name that does not exist." },
          { t: "p", text: "**A node with no path to `END` compiles**, and so does a graph with no nodes at all." },
          { t: "p", text: "**What it cannot check is behavioural** \u2014 a routing function that can return an unmapped key compiles fine, because a function's return values are not computable." },
          { t: "p", text: "**The default recursion limit in this version reports 10007, and all 10007 supersteps executed.** Do not carry a remembered default \u2014 measure it." },
          { t: "p", text: "**In a graph whose nodes call a model that is thousands of API calls** before anything stops it." },
          { t: "p", text: "**The limit counts supersteps, not visits to one node**, so refactoring one node into three cuts the available iterations by two thirds at the same limit." },
          { t: "p", text: "**It is a backstop, not a loop condition.** A graph relying on it raises as its normal exit path, making a long legitimate run indistinguishable from an infinite loop \u2014 put the termination condition in the router." },
          { t: "p", text: "**`mode=\"updates\"` is the debugging view** \u2014 what each node contributed, keyed by node name, and the only way to see 8.2's silently dropped key. **`mode=\"values\"` emits the input state first**, so a two-node graph yields three chunks." },
          { t: "p", text: "**The drawing catches what compile does not**: a node never connected to `END`, or a branch unreachable because a router never returns its key." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that cost four figures overnight", body: [
      { t: "p", text: "An agent graph is deployed with a cycle whose exit condition depends on a model deciding it is finished. One run starts looping and nobody notices until the morning. The default recursion limit did eventually stop it." },
      { t: "p", text: "The limit is a backstop, and on this version it allows over ten thousand supersteps \u2014 each one running real node bodies, each one a model call. The termination was in the right place architecturally and set to the wrong order of magnitude for a graph that spends money per step." },
      { t: "p", text: "Two changes. Set `recursion_limit` explicitly and low for any graph with a cycle, because the default is tuned for not interrupting legitimate long work rather than for catching a bug cheaply. And put a real termination condition in the router \u2014 an iteration counter in the state, routed to `END` at a threshold \u2014 so the limit catches only the case where that counter logic itself failed. A graph whose normal exit is an exception has no way to distinguish success from runaway." }
    ] }
  ],
  takeaways: [
    "**`compile()` checks topology only**: an entrypoint is required and an edge to an unknown name is rejected.",
    "**A node with no path to `END` compiles**, and so does a graph with no nodes.",
    "**It cannot check anything behavioural** \u2014 an unmapped router outcome compiles fine (8.7).",
    "**The default recursion limit reported 10007, and all 10007 supersteps executed.**",
    "**So measure it rather than remembering a default.**",
    "**In a graph whose nodes call a model, that is thousands of API calls before anything stops it.**",
    "**The limit counts supersteps, not visits to one node.**",
    "**So refactoring one node into three cuts the available iterations by two thirds.**",
    "**It is a backstop, not a loop condition** \u2014 a graph relying on it raises as its normal exit.",
    "**Put the termination condition in the router**, with an iteration counter in the state.",
    "**`mode=\"updates\"` is the debugging view** \u2014 what each node contributed, keyed by node name.",
    "**And the only way to see 8.2's silently dropped key.**",
    "**`mode=\"values\"` emits the input state first**, so a two-node graph yields three chunks.",
    "**Draw any graph you did not write** \u2014 it catches a node never connected to `END` and unreachable branches.",
    "**Destinations set by `Command` do not appear unless annotated** (8.8)."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Which of these does compile() reject?",
      options: ["A node with no path to END",
        "An edge pointing at a node name that does not exist",
        "A routing function that can return a key the path map lacks",
        "A graph with no nodes at all"],
      answer: 1,
      why: "compile() verifies structural facts it can see: there must be an entrypoint, and every edge's destination must name a real node. The other three all compile. The routing case is the dangerous one, because the set of values a Python function may return is not computable, so that check has to come from making the outcomes enumerable instead." },
    { stem: "A graph with an unconditional cycle raised GraphRecursionError after 10007 supersteps. What is the practical implication?",
      options: ["The limit should be raised so the graph can finish",
        "Those 10007 supersteps all executed real node bodies, which in a model-calling graph is thousands of API calls before anything stopped it",
        "The cycle should be replaced with a chain",
        "The limit is per node, so a longer cycle is safer"],
      answer: 1,
      why: "The limit is not an abstract ceiling \u2014 every superstep up to it does real work. For a graph whose nodes call a model, the default allows a runaway to spend a great deal before terminating. Setting recursion_limit explicitly and low for any cyclic graph is the cheap protection, since the default is tuned for not interrupting legitimate long runs." },
    { stem: "Why is relying on the recursion limit to terminate a cycle wrong?",
      options: ["The limit varies between LangGraph versions",
        "The graph then raises an exception as its normal exit path, so a legitimate long run is indistinguishable from an infinite loop",
        "Exceptions are slower than returning normally",
        "The limit cannot be configured per invocation"],
      answer: 1,
      why: "If termination means hitting the backstop, success and runaway produce the same signal, and there is no way to alert on one without alerting on both. The termination condition belongs in the router \u2014 an iteration count in the state, routed to END at a threshold \u2014 so the limit then catches only the case where that logic itself failed, which is what a backstop is for." },
    { stem: "Which stream mode shows that a node's update was silently dropped?",
      options: ["values, because the state will be missing the key",
        "updates, because it shows exactly what each node contributed and the key is simply absent",
        "Neither \u2014 the drop is only visible in the final state",
        "debug, which logs schema mismatches"],
      answer: 1,
      why: "updates mode emits each node's contribution keyed by node name, so a key the node believed it returned is visibly missing from what reached the state. values mode shows the whole state after each step, where an absent key looks the same as one that was never written. This is the fast diagnostic for a node whose update appears not to apply." }
  ] },
  interview: { title: "Interview practice", sub: "Compiling and running", questions: [
    { level: "core", q: "What does compile() actually validate?",
      strong: "A strong answer is precise about the boundary.",
      answer: [
        { t: "p", text: "The topology, and nothing else. It requires at least one edge from START, and it rejects an edge whose destination names a node that does not exist." },
        { t: "p", text: "What it does not check is anything behavioural. A node with no path to END compiles fine. A graph with no nodes at all compiles. And most importantly, a routing function that can return a key the path map lacks compiles cleanly and fails at runtime on that one branch." },
        { t: "p", text: "That last one is not a gap in the implementation \u2014 the set of values a Python function can return is not computable, so no compile step could catch it. Which means the check has to come from how you write the router: return an Enum or Literal and build the path map from the same enumeration." },
        { t: "p", text: "So I treat compile() as a useful early structural check rather than a verification step. The things it misses are exactly the things that fail on one rare branch, in production." }
      ] },
    { level: "advanced", q: "How do you keep a cyclic graph from running away?",
      strong: "A strong answer puts termination in the router and measures the limit.",
      answer: [
        { t: "p", text: "Put the termination condition in the router, and set the recursion limit explicitly as a backstop rather than relying on it." },
        { t: "p", text: "Concretely: keep an iteration count in the state, increment it in the loop, and have the router send execution to END when it reaches a threshold. Then the graph's normal exit is a return, not an exception." },
        { t: "p", text: "That distinction matters because a graph that terminates by hitting the recursion limit raises as its normal exit path, so a legitimate long run and an infinite loop produce the same signal. You cannot alert on one without alerting on both." },
        { t: "p", text: "On the limit itself, I would measure it rather than carry a remembered default. On the version I checked, it reported 10007 \u2014 and I confirmed that all 10007 supersteps actually executed. In a graph whose nodes call a model, that is thousands of API calls and the matching bill before anything stops it. The default is tuned for not interrupting legitimate work, which is the opposite of what you want while finding a bug." },
        { t: "p", text: "One subtlety worth knowing: the limit counts supersteps, not visits to a particular node. So refactoring one node into three cuts your available iterations by two thirds at the same setting, which presents as a logic bug rather than a configuration one." }
      ] },
    { level: "core", q: "A graph behaves unexpectedly in production. How do you debug it?",
      strong: "A strong answer streams updates and reads the drawing first.",
      answer: [
        { t: "p", text: "Two things before touching any code: stream the run with mode='updates', and draw the graph." },
        { t: "p", text: "Updates mode shows exactly what each node contributed, keyed by node name. That answers the most common question directly \u2014 which node wrote this wrong value \u2014 and it is the only way to see a node whose update was silently dropped because the returned key was not in the schema. That one is invisible from the final state, since a key that was never written looks identical to one that was never meant to be." },
        { t: "p", text: "The drawing catches structural problems compile() does not: a node wired up and never connected to END, or a branch that is unreachable because the router never returns its key. It is also the fastest way into a graph I did not write." },
        { t: "p", text: "If the symptom is missing history rather than a wrong value, I would look at reducers first \u2014 a missing one is silent on a sequential path and the single most common cause. And if the symptom is a value that is doubled, I would look for a node returning the whole state, because every returned key goes through the reducer." },
        { t: "p", text: "If it is a hang or a runaway, the recursion limit tells me which: a GraphRecursionError means the router never returned a terminal outcome, and the right fix is an explicit exit condition rather than a higher limit." }
      ] }
  ] }
});

EC.receiveLesson({
  id: "10.1",
  lede: "A compiled graph satisfies the node interface, so `add_node(\"inner\", compiled_graph)` is the whole of composition. The catch is in **how** state crosses the boundary: the parent passes the whole state in and merges the whole state out, **matching on key names** \u2014 so two graphs that look independent share a vocabulary, and renaming a key in one breaks the other with no compile-time signal. The alternative, a plain function that calls `subgraph.invoke()` with an explicit mapping, costs more code and lets the schemas evolve separately. And by default a subgraph is **one superstep** of the parent, so the parent's history does not show the inner nodes.",
  objectives: [
    "Use a compiled graph as a node",
    "Explain the shared-key coupling and what breaks without it",
    "Wrap a subgraph in a function when the schemas should stay separate",
    "Say how checkpoints and history behave across the boundary",
    "Decide when nesting is worth its cost"
  ],
  prerequisites: ["8.6", "8.4"],
  blocks: [
    { t: "h2", n: "01", id: "node", text: "A compiled graph is a node", sub: "That is all composition is" },
    { t: "code", lang: "python", title: "Nesting",
      code: 'inner = ig.compile()\n\nog.add_node("prepare", ...)\nog.add_node("inner", inner)        # <- the compiled graph IS the node\nog.add_node("finish", ...)',
      out: "    {'text': 'HELLO', 'steps': ['prepare', 'clean', 'upper', 'finish']}",
      caption: "The inner graph ran as one node, and its steps merged into the outer state." },
    { t: "h2", n: "02", id: "keys", text: "The shared-key rule", sub: "And it is a real coupling" },
    { t: "p", text: "That worked because both schemas declare `text` and `steps`. The parent passes the whole state in and merges the whole state out, matching on **key names** \u2014 there is no mapping layer." },
    { t: "code", lang: "text", title: "No shared data key",
      code: "inner declares 'content'; outer declares 'text'.\n  -> {'text': 'hi', 'steps': ['innerb']}",
      caption: "The `steps` key merged; `content` and `text` never met." },
    { t: "callout", kind: "warn", title: "Coupled by key name, with no compile-time signal", body: [
      { t: "p", text: "The inner graph ran and its `content` update went nowhere the parent could see, because the parent has no such key. Nothing raised \u2014 which is 8.2's silent drop operating across a graph boundary." },
      { t: "p", text: "So that is the real cost of subgraphs: two graphs that look independent share a vocabulary. Renaming a key in the inner graph silently stops data reaching the outer one, and the failure appears as a key that is mysteriously unchanged." }
    ] },
    { t: "h2", n: "03", id: "wrap", text: "The explicit alternative", sub: "A function that calls the subgraph" },
    { t: "code", lang: "python", title: "When the schemas should not be coupled",
      code: 'def call_inner(state: Outer):\n    result = inner.invoke({"content": state["text"], "steps": []})\n    return {"text": result["content"], "steps": ["translated"]}\n\nog.add_node("inner", call_inner)',
      out: "    {'text': 'x', 'steps': ['innerb', 'translated']}",
      caption: "The mapping is explicit and in one place." },
    { t: "p", text: "More code, and the two schemas can now evolve separately \u2014 which is 8.4's input-and-output schema argument applied to graph composition. If the inner graph belongs to another team, this is the form you want, because the mapping is a declared interface rather than a coincidence of naming." },
    { t: "h2", n: "04", id: "history", text: "Across the checkpoint boundary", sub: "A subgraph is one superstep" },
    { t: "code", lang: "text", title: "The parent's history",
      code: "outer graph checkpoints for one run: 5\n  step=3   next=()               steps=['prepare', 'clean', 'upper', 'finish']\n  step=2   next=('finish',)       steps=['prepare', 'clean', 'upper']\n  step=1   next=('inner',)        steps=['prepare']\n  step=0   next=('prepare',)      steps=[]",
      caption: "The inner nodes do not appear \u2014 `clean` and `upper` arrived together in one step." },
    { t: "callout", kind: "insight", title: "Which matters exactly when you want to look inside", body: [
      { t: "p", text: "The subgraph's internal steps are one superstep of the parent, so by default it is **opaque** in the parent's trace. `get_state(cfg, subgraphs=True)` exposes the inner tasks." },
      { t: "p", text: "That is the debugging cost of nesting, and it compounds with 8.9's drawing: the parent's drawn graph has a box you cannot see into. So a subgraph trades a flatter diagram for a less inspectable one, which is the opposite of what \u201ctidying up a long graph\u201d is trying to achieve." }
    ] },
    { t: "h2", n: "05", id: "when", text: "When nesting is worth it", sub: "And when it is just moving code" },
    { t: "table", head: ["worth it", "not worth it"], rows: [
      ["the inner graph is genuinely reused by more than one parent", "\u201cthis graph is getting long\u201d \u2014 a long graph is not a bug"],
      ["the inner graph is independently testable **and tested**", "grouping nodes that always run together \u2014 a sequence of edges already says that"],
      ["a team boundary: someone else owns the inner graph", ""]
    ] },
    { t: "callout", kind: "mental", title: "The test: can it be invoked alone, and does anyone do so?", body: [
      { t: "p", text: "If the inner graph is never invoked on its own, the nesting costs legibility \u2014 the control flow is now spread across two definitions and the parent's drawing has an opaque box \u2014 and buys nothing." },
      { t: "p", text: "Splitting a long graph is particularly tempting and particularly unhelpful: it does not reduce the number of nodes, the key-name coupling remains, and the reader now has to hold two files in their head instead of one long one." }
    ] },
    { t: "diagram", kind: "steps", title: "State crosses a subgraph boundary by key NAME",
      caption: "`add_node(“inner”, compiled_graph)` is the whole of composition, because a compiled graph satisfies the node interface. The catch is the boundary: matching keys merge, and a key the parent does not declare is **discarded without a word** (8.2).",
      items: [
        { label: "the parent passes the whole state in", desc: "not a selection — the subgraph sees everything the parent has", tone: "accent", code: "in" },
        { label: "the subgraph runs its own supersteps", desc: "its internal steps are ONE superstep of the parent", tone: "violet", code: "opaque" },
        { label: "matching keys merge upward", desc: "through the parent's reducer for that key, not the child's", tone: "good", code: "out" },
        { label: "unmatched keys are discarded", desc: "silently — which looks exactly like a worker producing nothing", tone: "crit", code: "the trap" }
      ] },
    { t: "exercise", kind: "build", title: "Nest a graph, then uncouple it",
      difficulty: "advanced", minutes: 32,
      body: "Compile a graph and use it as a node in another graph whose schema shares its keys, and confirm the inner updates merge. Then change the inner schema so no data key is shared and report what happens. Rewrite it as a function that calls the subgraph with an explicit mapping. Run the parent with a checkpointer and show whether the inner nodes appear in its history. Finally give the test for whether nesting is worth its cost.",
      requirements: ["Use a compiled graph as a node and show the merged state",
        "Change the inner schema so no data key is shared and report the result",
        "Explain the key-name coupling and why there is no compile-time signal",
        "Rewrite it as a function with an explicit mapping",
        "Show the parent's checkpoint history and whether inner nodes appear",
        "Say how to see inside a subgraph when debugging",
        "Give the test for whether nesting earns its cost"],
      hint: "Give the inner graph a differently named key and see where its update goes. Nothing raises, which is the point.",
      solution: { lang: "python", title: "x1001.py \u2014 coupled by key name",
        code: 'inner = ig.compile()\nog.add_node("inner", inner)        # a compiled graph IS a node\n\n# with no shared data key, the inner update goes nowhere visible\nclass InnerB(TypedDict):\n    content: str                   # outer declares \'text\'\n    steps: Annotated[List[str], operator.add]\n\n# the explicit alternative\ndef call_inner(state: Outer):\n    result = inner.invoke({"content": state["text"], "steps": []})\n    return {"text": result["content"], "steps": ["translated"]}\n\n# and the inner nodes are one superstep of the parent\nlist(app.get_state_history(cfg))\napp.get_state(cfg, subgraphs=True)',
        out: "==============================================================================\nPART 1 -- a subgraph is a compiled graph used as a node\n==============================================================================\n  add_node('inner', compiled_graph)\n    -> {'text': 'HELLO', 'steps': ['prepare', 'prepare', 'clean', 'upper', 'finish']}\n\n  the inner graph ran as one node of the outer one, and its steps\n  merged into the outer state. so composition is just: a compiled\n  graph satisfies the node interface.\n==============================================================================\nPART 2 -- the shared-key rule\n==============================================================================\n  that worked because both schemas declare 'text' and 'steps'. the\n  parent passes the whole state in and merges the whole state out,\n  matching on KEY NAMES.\n\n  inner declares 'content'; outer declares 'text'. no shared data key:\n    -> {'text': 'hi', 'steps': ['innerb']}\n\n  so the schemas are COUPLED BY KEY NAME. that is the real cost of\n  subgraphs: two graphs that look independent share a vocabulary, and\n  renaming a key in one breaks the other with no compile-time signal.\n==============================================================================\nPART 3 -- the other way: a function that calls the subgraph\n==============================================================================\n  when the schemas should NOT be coupled, wrap the call instead:\n\n    def call_inner(state):\n        result = subgraph.invoke({'content': state['text'], ...})\n        return {'text': result['content'], ...}\n\n    -> {'text': 'x', 'steps': ['translated']}\n\n  now the mapping is EXPLICIT and in one place. more code, and the\n  two schemas can evolve separately -- which is 8.4's input/output\n  schema argument applied to graph composition.\n==============================================================================\nPART 4 -- state and checkpoints across the boundary\n==============================================================================\n  outer graph checkpoints for one run: 5\n    step=3   next=()           steps=['prepare', 'prepare', 'clean', 'upper', 'finish']\n    step=2   next=('finish',)  steps=['prepare', 'prepare', 'clean', 'upper']\n    step=1   next=('inner',)   steps=['prepare']\n    step=0   next=('prepare',) steps=[]\n    step=-1  next=('__start__',) steps=[]\n\n  the subgraph's internal steps are ONE superstep of the parent, so\n  the parent's history does not show the inner nodes.\n\n  get_state(cfg, subgraphs=True) exposes them:\n    (none pending)\n\n  which matters for debugging: by default a subgraph is opaque in the\n  parent's trace, and that is exactly when you want to look inside it.\n==============================================================================\nPART 5 -- when a subgraph is worth it\n==============================================================================\n  worth it:\n    - the inner graph is genuinely reused by more than one parent\n    - the inner graph is independently testable and tested\n    - a team boundary: someone else owns the inner graph\n\n  not worth it:\n    - 'this graph is getting long' -- a long graph is not a bug, and\n      splitting it hides the control flow across two files\n    - grouping nodes that always run together -- that is what a\n      sequence of edges already expresses\n\n  the test I would apply: can the inner graph be invoked on its own\n  and does anyone do so? if not, the nesting costs legibility and\n  buys nothing, because the parent's drawn graph now has a box you\n  cannot see into (8.9).",
        notes: [
          { t: "p", text: "**A compiled graph satisfies the node interface**, so `add_node(name, compiled_graph)` is the whole of composition." },
          { t: "p", text: "**State crosses the boundary by KEY NAME** \u2014 the parent passes the whole state in and merges the whole state out, with no mapping layer." },
          { t: "p", text: "**So two graphs that look independent share a vocabulary.** With no shared data key the inner update went nowhere the parent could see, and nothing raised \u2014 8.2's silent drop across a graph boundary." },
          { t: "p", text: "**A function that calls `subgraph.invoke()` with an explicit mapping uncouples them**, which is 8.4's schema argument applied to composition \u2014 and the right form when another team owns the inner graph." },
          { t: "p", text: "**A subgraph is ONE superstep of the parent**, so its inner nodes do not appear in the parent's checkpoint history." },
          { t: "p", text: "**`get_state(cfg, subgraphs=True)` exposes them**, which matters exactly when you want to look inside." },
          { t: "p", text: "**And the parent's drawn graph has a box you cannot see into** (8.9), so nesting trades a flatter diagram for a less inspectable one." },
          { t: "p", text: "**The test: can the inner graph be invoked alone, and does anyone do so?** If not, nesting costs legibility and buys nothing \u2014 and splitting a long graph is the least useful reason to do it." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the subgraph whose output disappeared", body: [
      { t: "p", text: "A team extracts a retrieval pipeline into a subgraph. During the extraction the inner graph's key is renamed from `documents` to `docs` for brevity. The parent still declares `documents`. Everything compiles, the subgraph's own tests pass, and the parent sees an empty document list." },
      { t: "p", text: "State crosses the boundary by key name, so the inner graph's `docs` update has nowhere to land in a parent that has no `docs` key \u2014 and nothing reports it, because an update to a key not in the schema is discarded silently. The subgraph is working perfectly in isolation." },
      { t: "p", text: "The diagnostic is to stream the parent with `mode=\"updates\"` and look at what the subgraph node contributed: the key is simply absent. The structural fix is to stop relying on name coincidence \u2014 wrap the subgraph in a function with an explicit mapping, so the two schemas are connected by code that a rename breaks visibly rather than by a shared spelling." }
    ] }
  ],
  takeaways: [
    "**A compiled graph satisfies the node interface** \u2014 `add_node(name, compiled_graph)`.",
    "**State crosses the boundary by key name**, with no mapping layer.",
    "**So two graphs that look independent share a vocabulary.**",
    "**With no shared key the inner update is discarded silently** \u2014 8.2's drop, across a boundary.",
    "**A function calling `subgraph.invoke()` with an explicit mapping uncouples them.**",
    "**Which is 8.4's schema argument applied to composition**, and right across a team boundary.",
    "**A subgraph is one superstep of the parent**, so inner nodes are absent from its history.",
    "**`get_state(cfg, subgraphs=True)` exposes them.**",
    "**And the parent's drawing has a box you cannot see into** (8.9).",
    "**So nesting trades a flatter diagram for a less inspectable one.**",
    "**Worth it when the inner graph is reused, independently tested, or owned by another team.**",
    "**Not worth it for \u2018this graph is getting long\u2019** \u2014 a long graph is not a bug.",
    "**The test: can it be invoked alone, and does anyone do so?**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "How does state cross the boundary between a parent graph and a subgraph used as a node?",
      options: ["Through an explicit mapping declared at add_node",
        "By key name \u2014 the parent passes the whole state in and merges the whole state out",
        "Only the keys the subgraph declares in its input schema",
        "The subgraph receives a copy and the parent ignores its return"],
      answer: 1,
      why: "There is no mapping layer: matching is by name. That makes nesting trivial to set up and creates a coupling that no compile step can see \u2014 renaming a key in one graph silently stops data reaching the other, and the update to a key the parent does not declare is discarded without a word, which is the same behaviour as a node returning an undeclared key." },
    { stem: "A subgraph's key is renamed and the parent now sees an empty value. Why does nothing raise?",
      options: ["The subgraph failed silently and returned defaults",
        "An update to a key the parent's schema does not declare is discarded, exactly as for any node",
        "The parent's reducer replaced the value with its initial state",
        "compile() should have caught it but only warns"],
      answer: 1,
      why: "A subgraph is a node, so its return value is subject to the same rule: keys outside the parent's schema are dropped. The subgraph's own tests still pass because it is correct in isolation. Streaming the parent with mode='updates' shows the key absent from that node's contribution, which localises it in one step." },
    { stem: "Why do a subgraph's internal nodes not appear in the parent's checkpoint history?",
      options: ["Checkpointers do not recurse into compiled graphs by design",
        "The subgraph executes as one superstep of the parent, so its nodes' updates arrive together",
        "The inner graph needs its own checkpointer to be recorded",
        "Only conditional edges create checkpoint entries"],
      answer: 1,
      why: "The parent sees one node, so one superstep, so one checkpoint covering the whole inner run. get_state with subgraphs=True exposes the inner tasks. The practical consequence is that nesting makes a region of the graph opaque in exactly the circumstances \u2014 debugging \u2014 when you most want to see into it." },
    { stem: "What is the weakest reason to extract a subgraph?",
      options: ["Another team owns the inner workflow",
        "The graph is getting long and splitting it would tidy things up",
        "The inner graph is invoked directly by two different parents",
        "The inner graph has its own test suite"],
      answer: 1,
      why: "Splitting does not reduce the node count, preserves the key-name coupling, and spreads the control flow across two definitions while making the parent's diagram contain an opaque box. The useful test is whether the inner graph is ever invoked on its own: if nothing does, the nesting costs legibility and buys no reuse." }
  ] },
  interview: { title: "Interview practice", sub: "Subgraphs", questions: [
    { level: "core", q: "How do subgraphs work in LangGraph, and what is the catch?",
      strong: "A strong answer names the key-name coupling.",
      answer: [
        { t: "p", text: "A compiled graph satisfies the node interface, so you pass it to add_node like any function. That part is genuinely simple." },
        { t: "p", text: "The catch is how state crosses the boundary: by key name, with no mapping layer. The parent passes its whole state in and merges the whole state out, matching on spelling." },
        { t: "p", text: "So two graphs that look independent actually share a vocabulary. I tested it with an inner graph declaring 'content' where the parent declared 'text' \u2014 the inner graph ran, its update went nowhere the parent could see, and nothing raised. That is the same silent drop you get from a node returning a key outside the schema, now operating across what looks like a module boundary." },
        { t: "p", text: "If I wanted the schemas to stay separate I would not nest directly \u2014 I would write a node function that calls subgraph.invoke with an explicit mapping. More code, and the mapping is then code that a rename breaks visibly rather than a coincidence of naming." }
      ] },
    { level: "advanced", q: "When would you extract part of a graph into a subgraph?",
      strong: "A strong answer resists it for length and names the debugging cost.",
      answer: [
        { t: "p", text: "When the inner graph is genuinely invoked on its own by more than one caller, or when it crosses a team boundary. Those are the cases where the interface earns its cost." },
        { t: "p", text: "What I would push back on is extracting because a graph is getting long. That does not reduce the node count, it keeps the key-name coupling, and the reader now has two definitions to hold instead of one long one. A long graph is not a bug." },
        { t: "p", text: "There is also a specific debugging cost that argues against casual nesting. A subgraph is one superstep of the parent, so its internal nodes do not appear in the parent's checkpoint history \u2014 I measured a five-step parent history where two inner nodes arrived in a single step. You can get at them with get_state and subgraphs=True, but the default is opacity." },
        { t: "p", text: "And the parent's drawn graph now has a box you cannot see into, which is the opposite of what 'tidying up' is trying to achieve. The diagram is the fastest way into an unfamiliar graph, so making part of it opaque is a real loss." },
        { t: "p", text: "So my test is: can the inner graph be invoked alone, and does anyone actually do it? If not, the nesting is moving code rather than structuring it." }
      ] },
    { level: "core", q: "How would you organise a graph that has grown to thirty nodes?",
      strong: "A strong answer resists subgraphs as the first answer.",
      answer: [
        { t: "p", text: "Not with subgraphs, at least not first \u2014 because extracting them does not reduce the node count and makes part of the graph opaque." },
        { t: "p", text: "What I would do first is look at whether it is thirty nodes or three workflows that happen to share a schema. If the latter, the right move is separate graphs with separate entrypoints, not nesting \u2014 and that is a different change from extracting a subgraph, because the schemas get to diverge." },
        { t: "p", text: "Then naming and grouping conventions, which cost nothing: node names that say which phase they belong to, the state schema split into input, internal and output so the public surface is small, and nodes destructuring the keys they read on the first line so dependencies are greppable." },
        { t: "p", text: "The structural improvement that actually helps at that size is reducing the schema. Thirty nodes sharing twenty keys is the real complexity, because every key is readable and writable by all of them and nothing declares which nodes touch what. Cutting the schema cuts the coupling." },
        { t: "p", text: "I would reach for a subgraph only where something is genuinely invoked on its own by more than one caller, or where a team boundary means the two halves should evolve separately \u2014 and in the team case I would use a wrapper function with an explicit mapping rather than direct nesting, so the interface is code rather than a shared spelling." }
      ] }
  ] }
});

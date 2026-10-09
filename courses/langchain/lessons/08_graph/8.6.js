EC.receiveLesson({
  id: "8.6",
  lede: "Two nodes running in parallel both saw `counter=0`. Neither saw the other's update, and the node after them saw `counter=2` \u2014 both increments applied together. That is the **superstep**: read a consistent snapshot, run every node scheduled for that step against it, apply all the updates at the end. It explains why reducers exist, why a parallel node cannot depend on a sibling's output, and why the sequence of a graph is **data** rather than shape \u2014 `add_edge('a', 'b')` is a row in a list, which is the entire reason you can add one that points backwards.",
  objectives: [
    "Describe START and END and what an edge means",
    "Demonstrate that parallel nodes see the same input state",
    "State the superstep model in one sentence",
    "Explain why a fan-in node runs once rather than twice",
    "Connect the edge-as-data representation to what a graph can do"
  ],
  prerequisites: ["8.3", "8.5"],
  blocks: [
    { t: "h2", n: "01", id: "sentinels", text: "START, END and a normal edge", sub: "Sentinels, not nodes" },
    { t: "code", lang: "python", title: "A linear graph",
      code: 'g.add_edge(START, "a")\ng.add_edge("a", "b")\ng.add_edge("b", "c")\ng.add_edge("c", END)',
      out: "    {'trace': ['a', 'b', 'c']}",
      caption: "An edge from `START` says \u201cthis runs first\u201d; an edge to `END` says \u201cthis path is done\u201d." },
    { t: "p", text: "`START` and `END` are sentinels rather than nodes \u2014 nothing executes for them. 8.9 shows that a graph without an edge from `START` fails to compile, because the runtime needs to know where to begin, and that a node without a path to `END` compiles fine." },
    { t: "h2", n: "02", id: "superstep", text: "The superstep", sub: "Two parallel nodes see the same input state" },
    { t: "code", lang: "python", title: "Both increment, and both report what they saw",
      code: 'class S2(TypedDict):\n    counter: Annotated[int, operator.add]\n    saw: Annotated[List[str], operator.add]\n\ndef left(state):\n    return {"counter": 1, "saw": ["left saw counter=%d" % state["counter"]]}\n\ndef right(state):\n    return {"counter": 1, "saw": ["right saw counter=%d" % state["counter"]]}',
      out: "    left saw counter=0\n    right saw counter=0\n    after saw counter=2\n    final counter = 2",
      caption: "Neither parallel node saw the other's update. The next node saw both." },
    { t: "callout", kind: "mental", title: "Read-all, compute-all, write-all", body: [
      { t: "p", text: "A superstep reads a consistent snapshot of the state, runs every node scheduled for that step against **that snapshot**, and applies all the resulting updates at the end of the step." },
      { t: "p", text: "That is the model to hold, and three earlier facts follow from it. It is why reducers exist (8.3) \u2014 two updates to one key arrive together and need a merge rule. It is why a parallel node cannot depend on a sibling's output. And it is why mutating the state in place is unreliable (8.5) \u2014 an in-place write happens outside the read-then-apply cycle." }
    ] },
    { t: "p", text: "It is also a borrowed idea rather than a LangGraph invention: the superstep comes from the Pregel model for large-scale graph processing, which is why LangGraph's runtime class is called `Pregel`. The property it buys is determinism \u2014 a node's view of the state does not depend on how fast its siblings ran." },
    { t: "h2", n: "03", id: "fanin", text: "Fan-in waits", sub: "And runs once" },
    { t: "p", text: "The node after the two parallel branches has **two incoming edges** and ran once, not twice. The runtime waits for all of a node's incoming paths before running it, then runs it a single time against the merged state." },
    { t: "callout", kind: "warn", title: "With a precise qualification", body: [
      { t: "p", text: "It waits for every incoming path that was **scheduled**, not every path that was declared. 8.7 measures the case that distinguishes those: when a router skips one branch of a fan-in, the join node still runs \u2014 there is no deadlock." },
      { t: "p", text: "Which is the right behaviour, and it moves the risk somewhere less obvious: the join node then runs with one branch's contribution absent. That is a node-level concern the topology does not express, and 8.7 has the measurement." }
    ] },
    { t: "h2", n: "04", id: "data", text: "The sequence is data, not shape", sub: "Which is the point of the whole module" },
    { t: "code", lang: "python", title: "Two ways to express a pipeline",
      code: 'chain = a | b | c            # the sequence IS the expression\n\ng.add_edge("a", "b")         # the sequence is a list of edges\ng.add_edge("b", "c")',
      caption: "The second is more verbose, and the edges are data the runtime reads at each step." },
    { t: "callout", kind: "insight", title: "Which is 8.1's difference, made concrete", body: [
      { t: "p", text: "In the chain, the sequence is the structure of the expression \u2014 fixed when the `|` operators are evaluated. In the graph, the sequence is a collection of `(from, to)` pairs the runtime consults as it goes." },
      { t: "p", text: "So you can add a pair that points backwards, giving a cycle. You can compute the next pair from state, giving a conditional branch (8.7). And you can stop between steps and write the state down, giving a pause (9.x). All three of 8.1's requirements are consequences of representing control flow as data." }
    ] },
    { t: "p", text: "The honest cost is also visible in that comparison: four lines of `add_edge` against one expression, plus a schema. Which is why 8.1's rule stands \u2014 pay that only when you need at least one of the three." },
    { t: "diagram", kind: "timeline", title: "The superstep: a consistent snapshot, then one commit",
      caption: "Two parallel nodes **both saw `counter=0`**. Neither saw the other's update, and the node after them saw **`counter=2`** — both increments applied together by the reducer. Read a snapshot, run everything scheduled, commit once.",
      span: 3, tick: 1, unit: "supersteps",
      lanes: [
        { label: "node_a", bars: [[1, 2, "reads 0, writes +1", "good"]] },
        { label: "node_b", bars: [[1, 2, "reads 0, writes +1", "good"]] },
        { label: "the reducer", bars: [[2, 2.4, "merges", "violet"]] },
        { label: "node_c", bars: [[2.4, 3, "reads counter=2", "accent"]] }
      ] },
    { t: "exercise", kind: "build", title: "Measure the superstep",
      difficulty: "core", minutes: 30,
      body: "Build a linear graph with START and END and confirm the execution order. Then build a graph with two parallel nodes that both read and write the same counter, and have each report what it saw. Determine whether either saw the other's update, and what the node after them saw. State the superstep model in one sentence. Then confirm how many times a fan-in node runs, and explain why a graph's sequence being data rather than shape is what enables cycles and conditional branches.",
      requirements: ["Build a linear graph and confirm the order",
        "Build two parallel nodes that each report the state they saw",
        "Report what each parallel node saw and what the following node saw",
        "State the superstep model in one sentence",
        "Confirm how many times a fan-in node with two incoming edges runs",
        "Explain why the sequence being data enables cycles and branches"],
      hint: "Have each parallel node record the value it read into an accumulating key. What they saw is more informative than what they wrote.",
      solution: { lang: "python", title: "x0806.py \u2014 both saw counter=0",
        code: 'class S2(TypedDict):\n    counter: Annotated[int, operator.add]\n    saw: Annotated[List[str], operator.add]\n\ndef left(state):\n    return {"counter": 1, "saw": ["left saw counter=%d" % state["counter"]]}\n\ndef right(state):\n    return {"counter": 1, "saw": ["right saw counter=%d" % state["counter"]]}\n\ndef after(state):\n    return {"saw": ["after saw counter=%d" % state["counter"]]}\n\ng2.add_edge(START, "left")\ng2.add_edge(START, "right")\ng2.add_edge("left", "after")\ng2.add_edge("right", "after")',
        out: "==============================================================================\nPART 1 -- START, END and a normal edge\n==============================================================================\n  START and END are sentinels, not nodes. an edge from START says\n  'this node runs first'; an edge to END says 'this path is done'.\n\n  a linear graph: START -> a -> b -> c -> END\n    {'trace': ['a', 'b', 'c']}\n==============================================================================\nPART 2 -- the superstep -- two parallel nodes see the SAME input state\n==============================================================================\n  two edges out of one node means both targets run in the same\n  superstep. the question that matters: does the second one see the\n  first one's update?\n\n    left saw counter=0\n    right saw counter=0\n    after saw counter=2\n    final counter = 2\n\n  BOTH parallel nodes saw counter=0. neither saw the other's update,\n  because a superstep reads a consistent snapshot, runs every node\n  scheduled for that step against it, and applies all the updates at\n  the END of the step.\n\n  so 'after' saw counter=2 -- both increments applied together.\n\n  that is the model to hold: a superstep is read-all, compute-all,\n  write-all. it is why reducers exist (8.3) and why a parallel node\n  cannot depend on a sibling's output.\n==============================================================================\nPART 3 -- fan-in waits for every incoming path\n==============================================================================\n  'after' has two incoming edges and ran ONCE, not twice -- the\n  runtime waits for all of a node's incoming paths before running it.\n\n  which also means a node whose incoming path never executes does not\n  run, and a graph can deadlock if it waits on a branch that\n  conditional routing skipped. 8.7 has that case.\n==============================================================================\nPART 4 -- the sequence is data, not shape\n==============================================================================\n  compare the two ways of expressing a pipeline:\n\n    chain = a | b | c          # the sequence IS the expression\n    g.add_edge('a', 'b')       # the sequence is a list of edges\n    g.add_edge('b', 'c')\n\n  the second is more verbose and the edges are DATA the runtime reads\n  at each step. which is the entire reason a graph can do the three\n  things 8.1 showed a chain cannot: you can add an edge that points\n  backwards, or compute the next edge from state.",
        notes: [
          { t: "p", text: "**`START` and `END` are sentinels, not nodes** \u2014 an edge from START says which node runs first, an edge to END says a path is done." },
          { t: "p", text: "**Both parallel nodes saw `counter=0`** \u2014 neither saw the other's update." },
          { t: "p", text: "**The following node saw `counter=2`**, both increments applied together." },
          { t: "p", text: "**The superstep: read a consistent snapshot, run every scheduled node against it, apply all updates at the end.** Read-all, compute-all, write-all." },
          { t: "p", text: "**Which is why reducers exist** (two updates to one key arrive together), **why a parallel node cannot depend on a sibling**, and **why in-place mutation is unreliable** (8.5) \u2014 it happens outside the cycle." },
          { t: "p", text: "**The superstep comes from the Pregel model**, which is why LangGraph's runtime class is called `Pregel`. The property it buys is determinism: a node's view does not depend on how fast its siblings ran." },
          { t: "p", text: "**A fan-in node with two incoming edges ran once**, against the merged state \u2014 the runtime waits for its incoming paths." },
          { t: "p", text: "**A chain's sequence is the structure of an expression; a graph's is a list of `(from, to)` pairs read at each step.** So a pair can point backwards (cycle), be computed from state (branch), or be paused between (9.x)." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the parallel node that needed its sibling's answer", body: [
      { t: "p", text: "A graph fans out to two nodes: one fetches documents, the other summarises them. The summariser consistently sees an empty document list. Both nodes are correct in isolation and both have passing unit tests." },
      { t: "p", text: "They are in the same superstep, so the summariser ran against a snapshot taken before the fetcher's update was applied. There is no race and no timing dependency to tune \u2014 the behaviour is deterministic and will never work, which is better than a flaky version of the same bug." },
      { t: "p", text: "The fix is to make the dependency explicit in the topology: an edge from fetch to summarise, so they occupy consecutive supersteps. The general rule is that parallel edges express independence, and two nodes where one reads what the other writes are not independent \u2014 so a fan-out is a claim about your nodes that the runtime will take literally." }
    ] }
  ],
  takeaways: [
    "**`START` and `END` are sentinels, not nodes.**",
    "**Both parallel nodes saw `counter=0`** \u2014 neither saw the other's update.",
    "**The following node saw `counter=2`**, both increments applied together.",
    "**The superstep: read a snapshot, run every scheduled node against it, apply all updates at the end.**",
    "**Read-all, compute-all, write-all.**",
    "**Which is why reducers exist** \u2014 two updates to one key arrive together and need a merge rule.",
    "**And why a parallel node cannot depend on a sibling's output.**",
    "**And why in-place mutation is unreliable** \u2014 it happens outside the cycle (8.5).",
    "**The model is Pregel's**, which is why LangGraph's runtime class has that name.",
    "**It buys determinism**: a node's view does not depend on how fast its siblings ran.",
    "**A fan-in node runs once**, against the merged state, after its incoming paths complete.",
    "**A chain's sequence is an expression's structure; a graph's is a list of `(from, to)` pairs.**",
    "**So a pair can point backwards, be computed from state, or be paused between** \u2014 8.1's three requirements.",
    "**Parallel edges are a claim of independence** that the runtime takes literally."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Two parallel nodes each increment a counter that starts at 0 and each report the value they read. What do they report?",
      options: ["0 and 1, in scheduling order",
        "Both report 0 \u2014 a superstep runs every scheduled node against the same snapshot",
        "Both report 1, since updates apply immediately",
        "It is nondeterministic and depends on timing"],
      answer: 1,
      why: "A superstep reads a consistent snapshot, runs all the nodes scheduled for that step against it, and applies the updates at the end. Neither node can observe the other's write, and the behaviour is deterministic rather than timing-dependent \u2014 which is better than a flaky version of the same constraint, because a node that depends on a sibling's output will never work rather than working intermittently." },
    { stem: "Why can a node not depend on a parallel sibling's output?",
      options: ["Nodes run in separate processes with no shared memory",
        "They run against the same snapshot, so the sibling's update does not exist yet when the node reads",
        "The reducer has not been applied",
        "It can, provided the key has a reducer"],
      answer: 1,
      why: "Parallel edges place both nodes in one superstep, and the superstep's read happens before either node's write is applied. Making the dependency work requires making it explicit in the topology \u2014 an edge from one to the other, so they occupy consecutive supersteps. A fan-out is a claim that the nodes are independent, which the runtime takes literally." },
    { stem: "A node has two incoming edges from parallel branches. How many times does it run?",
      options: ["Twice, once per incoming edge",
        "Once, against the merged state, after its incoming paths complete",
        "Twice, unless the key has a reducer",
        "It depends on which branch finishes first"],
      answer: 1,
      why: "The runtime waits for the node's incoming paths and then executes it a single time with both updates merged. The qualification worth knowing is that it waits for paths that were scheduled rather than declared \u2014 if a router skipped one branch, the join still runs, with that branch's contribution absent and no error raised." },
    { stem: "What does it mean that a graph's sequence is \u201cdata rather than shape\u201d?",
      options: ["Edges are stored in the state object",
        "The sequence is a list of (from, to) pairs the runtime reads at each step, so a pair can point backwards or be computed from state",
        "The graph can be serialised to JSON",
        "Node order is determined at compile time from the schema"],
      answer: 1,
      why: "In a chain the sequence is the structure of the expression, fixed when the pipe operators are evaluated. In a graph it is a collection the runtime consults as it goes, which is why an edge can point backwards (a cycle), be produced by a function reading state (a conditional branch), or be paused between (persistence). All three of a chain's limitations dissolve for the same reason." }
  ] },
  interview: { title: "Interview practice", sub: "The superstep", questions: [
    { level: "core", q: "Explain LangGraph's superstep model.",
      strong: "A strong answer is one sentence plus its consequences.",
      answer: [
        { t: "p", text: "Read-all, compute-all, write-all. The runtime reads a consistent snapshot of the state, runs every node scheduled for that step against that snapshot, and applies all the resulting updates at the end of the step." },
        { t: "p", text: "The demonstration that makes it concrete: I put two nodes in parallel, both incrementing a counter from zero, and had each report the value it read. Both reported zero. The node after them saw two \u2014 both increments applied together." },
        { t: "p", text: "Three things follow from it. It is why reducers exist, because two updates to one key arrive together and the runtime needs a rule to merge them. It is why a parallel node cannot depend on a sibling's output. And it is why mutating state in place is unreliable, because an in-place write happens outside the read-then-apply cycle." },
        { t: "p", text: "The model is borrowed from Pregel, the large-scale graph processing system \u2014 which is why LangGraph's runtime class is called Pregel. What it buys is determinism: a node's view of the state does not depend on how fast its siblings ran." }
      ] },
    { level: "advanced", q: "A node in a parallel branch sees stale data. How do you fix it?",
      strong: "A strong answer makes the dependency explicit rather than tuning timing.",
      answer: [
        { t: "p", text: "By adding an edge, because the data is not stale \u2014 it does not exist yet from that node's perspective." },
        { t: "p", text: "If two nodes are in the same superstep, both run against a snapshot taken before either one's update is applied. So a summariser running in parallel with a fetcher will see an empty document list every single time. There is no race and no timing to tune." },
        { t: "p", text: "That determinism is actually the good news. The node will never work rather than working intermittently, which is much easier to diagnose than a flaky version of the same bug \u2014 and it means a passing test is a real signal." },
        { t: "p", text: "The fix is to put the dependency in the topology: an edge from fetch to summarise, so they occupy consecutive supersteps. What I would push back on is any attempt to make it work within the superstep \u2014 reading a shared object, mutating state in place, or ordering the nodes \u2014 because all of those are fighting the execution model." },
        { t: "p", text: "The framing I find useful is that a fan-out is a claim that the branches are independent, and the runtime takes that claim literally. Two nodes where one reads what the other writes are not independent, so expressing them as parallel is a modelling error rather than a configuration one." }
      ] },
    { level: "core", q: "When would you use parallel branches in a graph?",
      strong: "A strong answer treats parallelism as a claim about independence.",
      answer: [
        { t: "p", text: "When the branches are genuinely independent, because a fan-out is a claim of independence that the runtime takes literally." },
        { t: "p", text: "The clear cases are fetching from several sources at once \u2014 a dense retriever and a keyword retriever, or three APIs \u2014 where nothing one branch does affects another. Those collapse several supersteps into one and the latency is the slowest branch rather than the sum." },
        { t: "p", text: "What does not work is anything where one branch reads what another writes. Both run against the same snapshot, so the reader sees the pre-update value every time \u2014 deterministically, which is at least better than intermittently. That dependency has to be expressed as an edge so the nodes occupy consecutive supersteps." },
        { t: "p", text: "The other thing parallelism forces is a reducer decision on every key two branches might write. Without one the fan-in raises, which is the runtime refusing to guess \u2014 and it is a good prompt to think about whether list concatenation's scheduling-dependent order actually matters for that key." },
        { t: "p", text: "And I would be honest that the gain is usually latency rather than throughput. If each branch is a model call, running two in parallel halves the wall time and costs the same money." }
      ] }
  ] }
});

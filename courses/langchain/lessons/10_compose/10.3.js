EC.receiveLesson({
  id: "10.3",
  lede: "Five streaming modes, and the useful framing is what each one is **for** rather than what it emits. `values` is the progress view and emits the input state first, so a two-node graph yields three chunks. `updates` is the **debugging** view \u2014 what each node contributed, keyed by node name \u2014 and it is the only way to see 8.2's silently dropped key, because the key is simply absent from that node's contribution. `messages` streams tokens, which is what makes a chat UI feel responsive. And `custom` is the only way a node can report from **inside** itself: in every other mode a node that takes thirty seconds is atomic \u2014 it starts and it finishes.",
  objectives: [
    "Name the five modes and what each is for",
    "Use updates mode to find which node wrote a value",
    "Explain the off-by-one in values mode",
    "Emit progress from inside a long node",
    "Combine several modes in one call"
  ],
  prerequisites: ["8.9"],
  blocks: [
    { t: "h2", n: "01", id: "modes", text: "The modes, on one graph", sub: "Two nodes, three views" },
    { t: "code", lang: "text", title: "values \u2014 the full state after each superstep",
      code: "1. {'n': 1, 'trace': []}\n2. {'n': 2, 'trace': ['a']}\n3. {'n': 20, 'trace': ['a', 'b']}",
      caption: "Three chunks for two nodes \u2014 the first is the **input** state." },
    { t: "code", lang: "text", title: "updates \u2014 what each node returned",
      code: "1. {'a': {'n': 2, 'trace': ['a']}}\n2. {'b': {'n': 20, 'trace': ['b']}}",
      caption: "Keyed by node name. Two chunks for two nodes." },
    { t: "callout", kind: "insight", title: "`updates` is the debugging view", body: [
      { t: "p", text: "It answers the most common debugging question directly \u2014 *which node wrote this wrong value* \u2014 because every chunk is keyed by the node that produced it." },
      { t: "p", text: "And it is the only way to see 8.2's silently dropped key. A node that returns a key outside the schema has it discarded, so in `values` mode the key looks like one that was never written. In `updates` mode you see exactly what that node contributed, and the key is absent." }
    ] },
    { t: "h2", n: "02", id: "whatfor", text: "What each one is for", sub: "Five modes" },
    { t: "dl", items: [
      ["`values`", "The full state after each superstep \u2014 a **progress** view. Note the off-by-one: it emits the input state before any node has run."],
      ["`updates`", "What each node returned, keyed by node name \u2014 the **debugging** view, and the only way to see a dropped key."],
      ["`messages`", "LLM tokens as they are generated, with metadata \u2014 **user-facing** streaming. Per token, not per node, which is what makes a chat UI feel responsive."],
      ["`custom`", "Whatever a node writes through the stream writer \u2014 **progress from inside** a long node."],
      ["`debug`", "Checkpoints, tasks and their results \u2014 for understanding the **runtime itself**, rarely what an application wants."]
    ] },
    { t: "h2", n: "03", id: "several", text: "Several modes at once", sub: "Tagged tuples" },
    { t: "code", lang: "text", title: "stream_mode=[\u201cvalues\u201d, \u201cupdates\u201d]",
      code: "1. ('values', {'n': 1, 'trace': []})\n2. ('updates', {'a': {'n': 2, 'trace': ['a']}})\n3. ('values', {'n': 2, 'trace': ['a']})",
      caption: "Each chunk is tagged with the mode that produced it." },
    { t: "p", text: "So a UI can take `messages` for the text and `updates` for a progress indicator from **one** call, without running the graph twice. Which matters because running it twice is not merely wasteful \u2014 a graph with side effects or a checkpointer cannot be run twice equivalently." },
    { t: "h2", n: "04", id: "custom", text: "custom: reporting from inside a node", sub: "The only way" },
    { t: "code", lang: "python", title: "A node that emits progress",
      code: 'from langgraph.config import get_stream_writer\n\ndef slow(state):\n    writer = get_stream_writer()\n    for i in range(3):\n        writer({"progress": "step %d of 3" % (i + 1)})\n    return {"trace": ["slow"]}',
      out: "    {'progress': 'step 1 of 3'}\n    {'progress': 'step 2 of 3'}\n    {'progress': 'step 3 of 3'}",
      caption: "Three updates from one node, before it returned." },
    { t: "callout", kind: "mental", title: "Without it, a node is atomic from the outside", body: [
      { t: "p", text: "In every other mode a node starts and finishes \u2014 there is no intermediate observation. For a node doing a thirty-second retrieval over a large corpus, or iterating a list of documents, `custom` is the difference between a progress bar and a spinner." },
      { t: "p", text: "It is also the right place for domain progress rather than framework progress. *\u201cProcessing document 4 of 12\u201d* is something only the node knows, and no amount of graph-level streaming can infer it." }
    ] },
    { t: "h2", n: "05", id: "choosing", text: "Choosing", sub: "Practical defaults" },
    { t: "table", head: ["situation", "mode"], rows: [
      ["a chat UI", "`messages`, plus `updates` for progress"],
      ["a long workflow", "`custom` from inside the slow nodes"],
      ["debugging", "`updates` \u2014 what each node contributed"],
      ["a progress bar", "`values` \u2014 remembering the off-by-one"],
      ["understanding the runtime", "`debug` \u2014 rarely what an application wants"]
    ] },
    { t: "p", text: "The one to internalise is `updates`. When a key has the wrong value it names the node that wrote it in one step, and when a key is missing it shows the absence directly \u2014 which between them cover the two commonest graph bugs in this course." },
    { t: "exercise", kind: "build", title: "Stream a graph five ways",
      difficulty: "core", minutes: 30,
      body: "Stream the same two-node graph in values, updates and debug modes and compare the chunks, noting how many each produces. Explain the off-by-one in values mode. Say what each of the five modes is for. Then stream with several modes at once and show how the chunks are tagged. Finally write a node that emits progress from inside itself and stream it in custom mode.",
      requirements: ["Stream in at least three modes and compare the chunk counts",
        "Explain the off-by-one in values mode",
        "Say which mode is the debugging view and why",
        "Explain how updates mode reveals a silently dropped key",
        "Stream with several modes at once and show the tagging",
        "Emit progress from inside a node and stream it in custom mode",
        "Give a default mode for at least four situations"],
      hint: "Count the chunks in values mode against the number of nodes. The difference is the input state.",
      solution: { lang: "python", title: "x1003.py \u2014 updates names the node",
        code: 'for mode in ("values", "updates", "debug"):\n    for chunk in app.stream({"n": 1, "trace": []}, stream_mode=mode):\n        print(mode, chunk)\n\n# several at once -> tagged tuples\nlist(app.stream(init, stream_mode=["values", "updates"]))\n\n# and progress from inside a node\nfrom langgraph.config import get_stream_writer\n\ndef slow(state):\n    writer = get_stream_writer()\n    for i in range(3):\n        writer({"progress": "step %d of 3" % (i + 1)})\n    return {"trace": ["slow"]}',
        out: "==============================================================================\nPART 1 -- the modes, on one graph\n==============================================================================\n  stream_mode='values'\n    1. {'n': 1, 'trace': []}\n    2. {'n': 2, 'trace': ['a']}\n    3. {'n': 20, 'trace': ['a', 'b']}\n\n  stream_mode='updates'\n    1. {'a': {'n': 2, 'trace': ['a']}}\n    2. {'b': {'n': 20, 'trace': ['b']}}\n\n  stream_mode='debug'\n    1. {'step': 1, 'timestamp': '2026-10-08T12:40:18.285058+00:00', 'type': 'task', 'payload': {'id': '4bed61e6-9023-7197-37aa-80cc729110dd', 'name': 'a', 'i\n    2. {'step': 1, 'timestamp': '2026-10-08T12:40:18.285058+00:00', 'type': 'task_result', 'payload': {'id': '4bed61e6-9023-7197-37aa-80cc729110dd', 'name': \n    3. {'step': 2, 'timestamp': '2026-10-08T12:40:18.287075+00:00', 'type': 'task', 'payload': {'id': '6f8d7892-57a9-5a50-2d9e-a20d6710ba76', 'name': 'b', 'i\n    4. {'step': 2, 'timestamp': '2026-10-08T12:40:18.287075+00:00', 'type': 'task_result', 'payload': {'id': '6f8d7892-57a9-5a50-2d9e-a20d6710ba76', 'name': \n\n==============================================================================\nPART 2 -- what each one is for\n==============================================================================\n  values     the full state after each superstep\n             -> progress. note it emits the INPUT state first, so a\n                2-node graph yields 3 chunks.\n\n  updates    what each node returned, keyed by node name\n             -> DEBUGGING. the only way to see a key that was\n                silently dropped (8.2), because the key is simply\n                absent from the node's contribution.\n\n  messages   LLM tokens as they are generated, with metadata\n             -> user-facing streaming. this is the one that makes a\n                chat UI feel responsive, and it is per TOKEN, not\n                per node.\n\n  custom     whatever a node writes via the stream writer\n             -> progress from inside a long node. a node that takes\n                30 seconds is silent in every other mode.\n\n  debug      checkpoints, tasks and their results\n             -> understanding the runtime itself\n==============================================================================\nPART 3 -- several modes at once\n==============================================================================\n  stream_mode=['values','updates'] yields TAGGED tuples:\n    1. ('values', {'n': 1, 'trace': []})\n    2. ('updates', {'a': {'n': 2, 'trace': ['a']}})\n    3. ('values', {'n': 2, 'trace': ['a']})\n    4. ('updates', {'b': {'n': 20, 'trace': ['b']}})\n    5. ('values', {'n': 20, 'trace': ['a', 'b']})\n\n  so a UI can take 'messages' for the text and 'updates' for a\n  progress indicator from one call, without running the graph\n  twice.\n==============================================================================\nPART 4 -- custom: the only way to report from inside a node\n==============================================================================\n  a node that emits progress:\n    {'progress': 'step 1 of 3'}\n    {'progress': 'step 2 of 3'}\n    {'progress': 'step 3 of 3'}\n\n  without this, a node is atomic from the outside: it starts and\n  it finishes. for a node doing a 30-second retrieval or a long\n  tool call, 'custom' is the difference between a progress bar\n  and a spinner.\n==============================================================================\nPART 5 -- choosing\n==============================================================================\n  the practical defaults:\n\n    a chat UI           'messages', plus 'updates' for progress\n    a long workflow     'custom' from inside slow nodes\n    debugging           'updates' -- what each node contributed\n    a progress bar      'values' -- but remember the off-by-one\n    understanding       'debug' -- rarely what you want in an app\n\n  and the one to internalise: 'updates' is the debugging view. when\n  a key has the wrong value, it tells you which node wrote it in one\n  step, and when a key is missing it shows the absence directly.",
        notes: [
          { t: "p", text: "**`values` emits the input state first**, so a two-node graph yields three chunks \u2014 the off-by-one to remember for a progress bar." },
          { t: "p", text: "**`updates` is keyed by node name**, so it answers \u2018which node wrote this value\u2019 directly. Two chunks for two nodes." },
          { t: "p", text: "**And it is the only way to see 8.2's silently dropped key** \u2014 in `values` mode a discarded key looks like one that was never written." },
          { t: "p", text: "**`messages` streams tokens**, per token rather than per node, which is what makes a chat UI responsive." },
          { t: "p", text: "**`custom` is the only way a node can report from inside itself** \u2014 in every other mode a node starts and finishes with no intermediate observation." },
          { t: "p", text: "**So for a thirty-second node, `custom` is the difference between a progress bar and a spinner**, and it carries domain progress the graph cannot infer." },
          { t: "p", text: "**Several modes in one call yield tagged tuples**, so a UI gets tokens and progress without running the graph twice \u2014 which a graph with side effects or a checkpointer cannot do equivalently anyway." },
          { t: "p", text: "**`debug` emits checkpoints and tasks**, for understanding the runtime rather than for an application." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the thirty-second silence", body: [
      { t: "p", text: "A research agent takes between twenty and forty seconds per request. The UI streams in `values` mode and shows a progress indicator that updates once per superstep \u2014 but most of the time is inside a single retrieval-and-rerank node, so the user sees one update and then nothing for half a minute." },
      { t: "p", text: "Every other mode treats a node as atomic, so there is no graph-level way to observe progress within it. The node is doing twelve document fetches and a reranking pass, and all of that is invisible by construction." },
      { t: "p", text: "`custom` with a stream writer is the mechanism, and the design point is what to emit: domain progress rather than technical steps. *\u201cSearching 12 sources\u201d*, *\u201cRead 7 of 12\u201d*, *\u201cRanking results\u201d* are things only the node knows and exactly what a user wants to see. Adding a second mode to the existing stream call costs nothing \u2014 chunks arrive tagged \u2014 so this is a change inside one node plus one argument, not a restructuring." }
    ] }
  ],
  takeaways: [
    "**`values` emits the input state first** \u2014 a two-node graph yields three chunks.",
    "**`updates` is keyed by node name**, so it names the node that wrote a value.",
    "**And it is the only way to see 8.2's silently dropped key.**",
    "**`messages` streams tokens**, per token rather than per node.",
    "**`custom` is the only way a node reports from inside itself.**",
    "**In every other mode a node is atomic** \u2014 it starts and it finishes.",
    "**So for a long node, `custom` is the difference between a progress bar and a spinner.**",
    "**And it carries domain progress the graph cannot infer** \u2014 \u2018document 4 of 12\u2019.",
    "**`debug` emits checkpoints and tasks**, for the runtime rather than an application.",
    "**Several modes in one call yield tagged tuples.**",
    "**So a UI gets tokens and progress without running the graph twice** \u2014 which it could not do equivalently.",
    "**Defaults**: `messages` plus `updates` for chat, `custom` for long nodes, `updates` for debugging.",
    "**The one to internalise is `updates`** \u2014 it covers the two commonest graph bugs in this course."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does a two-node graph produce three chunks in values mode?",
      options: ["The final state is emitted twice, once per node",
        "It emits the input state before any node has run, then one per superstep",
        "Each node emits both its input and its output",
        "The END sentinel produces a chunk"],
      answer: 1,
      why: "The first chunk is the state as passed in, which is useful for a UI that wants to render the starting point but produces an off-by-one if you are counting supersteps. For a progress bar driven by chunk count, that first emission makes the denominator nodes-plus-one rather than nodes." },
    { stem: "A node's update does not appear in the final state. Which mode diagnoses it fastest?",
      options: ["values, because the state will be missing the key",
        "updates, because it shows what that node contributed and the key is simply absent",
        "debug, which logs schema mismatches",
        "custom, if the node writes its update to the stream"],
      answer: 1,
      why: "In values mode a key that was discarded is indistinguishable from one that was never written. updates mode emits each node's contribution keyed by node name, so a key the author believed was returned is visibly missing from that node's chunk \u2014 which narrows a silently dropped key to one node in a single observation." },
    { stem: "What can custom mode do that no other mode can?",
      options: ["Stream individual LLM tokens",
        "Report progress from inside a node, which is otherwise atomic from the outside",
        "Emit the checkpoint after each superstep",
        "Tag chunks with their originating mode"],
      answer: 1,
      why: "Every other mode observes a node only at its boundaries: it starts and it finishes. A node performing twelve fetches and a reranking pass is one opaque event. The stream writer lets the node emit domain progress \u2014 'read 7 of 12' \u2014 which is information only the node has and which no graph-level mechanism could infer." },
    { stem: "Why stream with several modes in one call rather than streaming twice?",
      options: ["It is marginally faster",
        "A graph with side effects or a checkpointer cannot be run twice equivalently \u2014 and chunks arrive tagged by mode",
        "Multiple modes share a single serialisation pass",
        "Only the first stream call receives messages mode"],
      answer: 1,
      why: "Beyond the wasted work, a second run of a stateful graph is not the same run: side effects repeat and a checkpointer records a second execution on the thread. Passing a list of modes yields tuples tagged with the originating mode, so a UI can take tokens for the text and updates for progress from one execution." }
  ] },
  interview: { title: "Interview practice", sub: "Streaming", questions: [
    { level: "core", q: "Which streaming mode would you use for a chat UI?",
      strong: "A strong answer combines messages with updates.",
      answer: [
        { t: "p", text: "messages for the text, and updates alongside it for progress \u2014 passed as a list in one call, so the chunks arrive tagged with their mode." },
        { t: "p", text: "messages is per token rather than per node, which is what makes the response feel responsive. updates tells me which node is running, so the UI can say 'searching' and then 'writing' instead of showing an undifferentiated spinner." },
        { t: "p", text: "The reason to combine rather than stream twice is not just efficiency: a second run of a stateful graph is a different run. Side effects repeat and the checkpointer records another execution on that thread." },
        { t: "p", text: "If any node is slow internally I would add custom as well, with the node emitting domain progress through the stream writer. Otherwise a node doing twelve fetches is one opaque event, and the user sees nothing for however long it takes." }
      ] },
    { level: "advanced", q: "How do you debug a graph where a value is wrong?",
      strong: "A strong answer reaches for updates mode and knows why.",
      answer: [
        { t: "p", text: "Stream it with stream_mode='updates', which is the view that answers the question directly." },
        { t: "p", text: "Each chunk is keyed by node name and contains what that node contributed, so 'which node wrote this' is one observation rather than an inference. In values mode I would see the state changing and have to work backwards to the node responsible." },
        { t: "p", text: "It also catches the failure that is otherwise close to invisible. A node returning a key that is not in the schema has that key discarded silently \u2014 so in values mode it looks like a key that was never written, and the node's own unit test passes because the test asserts on the returned dict. In updates mode you see exactly what reached the state from that node, and the key is simply absent." },
        { t: "p", text: "Those two cases \u2014 a wrong value and a missing one \u2014 are between them most of the graph bugs I have hit, and updates mode addresses both." },
        { t: "p", text: "After that I would draw the graph, which catches the structural problems compile does not: a node never connected to END, or a branch unreachable because a router never returns its key." }
      ] },
    { level: "core", q: "A user complains your agent feels slow. What do you change?",
      strong: "A strong answer separates perceived from actual latency.",
      answer: [
        { t: "p", text: "First I would work out whether it is slow or feels slow, because the fixes are completely different and the second is usually cheaper." },
        { t: "p", text: "For perceived latency, streaming is the lever. Tokens as they are generated rather than a complete response at the end, plus node-level progress so the UI can say what is happening instead of showing an undifferentiated spinner. Both from one stream call with a list of modes, so the chunks arrive tagged." },
        { t: "p", text: "The gap that catches people is a single slow node. Every mode except custom treats a node as atomic \u2014 it starts and it finishes \u2014 so a node doing twelve retrievals and a reranking pass is one opaque event lasting half a minute. The stream writer is the only way to report from inside it, and what I would emit is domain progress: 'searching 12 sources', 'read 7 of 12'. That is information only the node has." },
        { t: "p", text: "For actual latency I would build the per-query budget before changing anything, because the answer is usually not where people look \u2014 a cross-encoder reranker dominating, or a query embedding that is a larger fixed cost than the whole vector search." },
        { t: "p", text: "And I would check the stage ordering before adding capacity, since putting a cheap narrowing pass before an expensive stage can halve total latency while improving quality." }
      ] }
  ] }
});

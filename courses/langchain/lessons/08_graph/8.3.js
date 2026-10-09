EC.receiveLesson({
  id: "8.3",
  lede: "The default reducer is **replacement**, and that single fact is the most common source of LangGraph bugs. Two nodes appending to a `List[str]` in sequence leaves you with `['from b']` \u2014 the first update is gone, the types are correct, nothing raises. Then the same missing reducer on a *parallel* path is a hard error: `InvalidUpdateError: Can receive only one value per step`. So one mistake is silent data loss on a sequential path and a loud failure on a fan-in, which means a graph can work for months, grow one parallel branch, and fail immediately \u2014 with the error pointing at a mistake that was already there.",
  objectives: [
    "Show that the default reducer is replacement",
    "Declare a reducer with Annotated and explain its signature",
    "Explain why a reducer is required for concurrent writes",
    "Say which reducers are safe under reordering",
    "Distinguish add_messages from operator.add"
  ],
  prerequisites: ["8.2"],
  blocks: [
    { t: "h2", n: "01", id: "default", text: "The default overwrites", sub: "Silently, with the right types" },

    {"kind": "trace", "title": "The default reducer is replacement", "caption": "The most common source of LangGraph bugs. Two nodes appending to a `List[str]` in sequence leaves you with **`['from b']`** — the first update is gone, the types are correct and nothing raises.", "left": "what runs", "codeW": 300, "vars": ["without a reducer", "with add"], "steps": [{"code": "initial state", "state": ["[]", "[]"]}, {"code": "node_a returns {“log”: [“from a”]}", "state": ["['from a']", "['from a']"], "changed": [0, 1]}, {"code": "node_b returns {“log”: [“from b”]}", "state": ["['from b']", "['from a', 'from b']"], "changed": [0, 1], "note": "a’s update is gone", "tone": "crit"}], "t": "diagram", "id": "dg-8_3-01-0"},




    { t: "code", lang: "python", title: "Two nodes, one key, no reducer",
      code: 'class S(TypedDict):\n    messages: List[str]        # NO reducer\n\ndef a(state: S):\n    return {"messages": ["from a"]}\n\ndef b(state: S):\n    return {"messages": ["from b"]}\n\n# START -> a -> b -> END',
      out: "  result: {'messages': ['from b']}",
      caption: "`'from a'` is gone." },
    { t: "callout", kind: "trap", title: "The type says List and the runtime has no idea you meant append", body: [
      { t: "p", text: "The default reducer is replacement, so each node's update overwrites the key entirely. `List[str]` describes the *shape* of the value, not how two values combine \u2014 there is nothing in a type annotation that could express \u201cconcatenate\u201d." },
      { t: "p", text: "This is the single most common LangGraph bug and it is silent: the types are right, nothing raises, and history quietly does not accumulate. The symptom appears much later as a conversation that has forgotten everything but the last turn." }
    ] },
    { t: "h2", n: "02", id: "annotated", text: "A reducer is the merge function", sub: "Declared in the annotation" },
    { t: "code", lang: "python", title: "Annotated metadata is the reducer",
      code: 'import operator\n\nclass S2(TypedDict):\n    messages: Annotated[List[str], operator.add]',
      out: "  result: {'messages': ['from a', 'from b']}",
      caption: "The runtime now calls `operator.add(existing, update)` for that key." },
    { t: "p", text: "So the signature is `reducer(current_value, node_update) -> new_value`, and `operator.add` on two lists is concatenation. The annotation is not documentation here \u2014 it is the mechanism, and `Annotated`'s second argument is read by the runtime." },
    { t: "h2", n: "03", id: "parallel", text: "Where it actually matters", sub: "And the failure changes character" },
    { t: "code", lang: "text", title: "Two parallel nodes writing the same key",
      code: "NO reducer     RAISED InvalidUpdateError: At key 'found': Can receive only one\n               value per step. Use an Annotated key to handle multiple values.\noperator.add   -> {'found': ['left', 'right']}",
      caption: "Loud, specific, and it names the fix." },
    { t: "callout", kind: "insight", title: "The same mistake, two completely different failures", body: [
      { t: "p", text: "Without a reducer the runtime has two updates for one key in one superstep and no rule to combine them, so it refuses \u2014 loudly, with the remedy in the message. That is good design." },
      { t: "p", text: "Contrast it with part 1: the **same** missing reducer is silent data loss on a sequential path. So a graph can work for months, grow one parallel branch, and fail immediately \u2014 and the error will be pointing at a mistake that was already there, corrupting history the whole time." }
    ] },
    { t: "p", text: "That reframes what a reducer is for. It is not an optimisation for accumulating history; it is what makes concurrent writes to a key **possible at all**. A key that two nodes can ever write needs one, and the fan-in is what forces you to notice." },
    { t: "h2", n: "04", id: "order", text: "Reducers and ordering", sub: "The runtime chooses the order, not you" },
    { t: "p", text: "Updates within a superstep are applied in an order you do not control, so a reducer whose result depends on order produces nondeterministic state. `operator.add` on lists is associative and **not** commutative \u2014 `[a] + [b]` is not `[b] + [a]`." },
    { t: "table", head: ["safe under reordering", "not safe"], rows: [
      ["`operator.add` on numbers", "list concatenation \u2014 order reflects scheduling"],
      ["set union", "\u201clast write wins\u201d \u2014 which write is last?"],
      ["max / min", ""]
    ] },
    { t: "callout", kind: "warn", title: "Parallel appends produce a scheduling order", body: [
      { t: "p", text: "Two parallel nodes appending to one list produce an order that reflects node scheduling rather than anything meaningful. That is usually fine \u2014 for a set of retrieved documents, order does not matter \u2014 and it is not fine when the list is read as a sequence." },
      { t: "p", text: "If the order matters, the options are a reducer that sorts deterministically, or a separate key per node so there is no merge to order. Reaching for \u201cwhichever arrives first wins\u201d is the one answer that cannot work, because *first* is not defined." }
    ] },
    { t: "h2", n: "05", id: "custom", text: "A custom reducer", sub: "Any callable of (current, update)" },
    { t: "code", lang: "python", title: "Deduplicating a fan-in",
      code: 'def merge_unique(current, update):\n    out = list(current)\n    for x in update:\n        if x not in out:\n            out.append(x)\n    return out\n\nclass S4(TypedDict):\n    docs: Annotated[List[str], merge_unique]',
      out: "  two parallel fetchers returning overlapping docs:\n    {'docs': ['doc1', 'doc2', 'doc3']}",
      caption: "`doc2` was returned by both fetchers and appears once." },
    { t: "p", text: "Which is 7.2's multi-query union expressed as a reducer. Deduplicating a fan-in is a **state-merge** concern, so putting it in the reducer means no node has to know that a sibling might return the same document \u2014 and that is exactly the coupling a reducer exists to remove." },
    { t: "h2", n: "06", id: "addmessages", text: "add_messages is not operator.add", sub: "And the difference is load-bearing" },
    { t: "p", text: "LangGraph ships `add_messages` for message lists. It does three things `operator.add` does not: coerces dicts and strings into `Message` objects, assigns an id to messages that lack one, and **replaces** a message whose id matches an existing one." },
    { t: "code", lang: "text", title: "The third behaviour, measured",
      code: "existing: [('HumanMessage', 'hello', 'm1')]\nappend  : [('HumanMessage', 'hello', 'm1'), ('AIMessage', 'hi', 'm2')]\nsame id : [('HumanMessage', 'HELLO EDITED', 'm1')]",
      caption: "The same-id update **replaced** rather than appended." },
    { t: "callout", kind: "insight", title: "Replacement by id is how you edit history", body: [
      { t: "p", text: "Appending is the common case; updating a message in place is how you correct one. That is what human-in-the-loop editing needs in 9.x \u2014 a reviewer changes a message and the state reflects the edit rather than accumulating both versions." },
      { t: "p", text: "So using `operator.add` on a message list gives you appending only, and silently removes the ability to correct a message later. It will look correct for as long as nothing tries to edit history." }
    ] },
    { t: "exercise", kind: "build", title: "Make a reducer necessary, then write one",
      difficulty: "advanced", minutes: 34,
      body: "Build a two-node sequential graph whose nodes both write a list key with no reducer, and show what happens to the first update. Add a reducer and show the difference. Then build the same thing with two parallel nodes and compare the failure. Explain which reducers are safe when updates are reordered. Write a custom reducer that deduplicates a fan-in. Finally compare add_messages against operator.add on a message with a matching id.",
      requirements: ["Show that the default reducer replaces, on a sequential path",
        "Declare a reducer with Annotated and show the difference",
        "State the reducer signature",
        "Show the parallel case with and without a reducer and compare the failures",
        "Explain why one mistake is silent on one path and loud on the other",
        "Classify reducers by safety under reordering",
        "Write a custom reducer that deduplicates",
        "Show add_messages replacing a message by id"],
      hint: "Run the same missing reducer on a sequential path and a parallel one. The two failures are nothing alike, and that contrast is the lesson.",
      solution: { lang: "python", title: "x0803.py \u2014 silent on one path, loud on the other",
        code: 'import operator\n\n# sequential, no reducer: the first update is lost\nclass S(TypedDict):\n    messages: List[str]\n\n# sequential, with a reducer: both kept\nclass S2(TypedDict):\n    messages: Annotated[List[str], operator.add]\n\n# a custom reducer is any callable of (current, update)\ndef merge_unique(current, update):\n    out = list(current)\n    for x in update:\n        if x not in out:\n            out.append(x)\n    return out\n\n# and add_messages replaces by id rather than appending\nfrom langgraph.graph.message import add_messages\nadd_messages([HumanMessage(content="hello", id="m1")],\n             [HumanMessage(content="HELLO EDITED", id="m1")])',
        out: "==============================================================================\nPART 1 -- the default reducer overwrites\n==============================================================================\n  schema: messages: List[str]      (NO reducer)\n  a returns ['from a'], then b returns ['from b']\n  result: {'messages': ['from b']}\n\n  'from a' is gone. the default reducer is REPLACEMENT, so each node's\n  update overwrites the key entirely. the type says List[str] and the\n  runtime has no idea you meant to append.\n\n  this is the single most common LangGraph bug and it is silent: the\n  types are right, nothing raises, and history quietly does not\n  accumulate.\n==============================================================================\nPART 2 -- a reducer is the merge function\n==============================================================================\n  schema: messages: Annotated[List[str], operator.add]\n  result: {'messages': ['from a', 'from b']}\n\n  the Annotated metadata IS the reducer. the runtime calls\n  reducer(existing, update) for that key instead of replacing.\n\n  so the signature is reducer(current_value, node_update) -> new_value,\n  and operator.add on two lists is concatenation.\n==============================================================================\nPART 3 -- where it actually matters -- parallel nodes\n==============================================================================\n  with one path, replacement loses history. with two parallel nodes\n  writing the SAME key in one superstep, replacement is worse: the\n  runtime has two updates for one key and no rule to combine them.\n\n  NO reducer     RAISED InvalidUpdateError: At key 'found': Can receive only one value per step. Use an Annotated key to handle multiple values.\nFor troubleshooting, visit: https://docs.langchain.com/oss/python/langgraph/errors/INVALID_CONCURRENT_GRAPH_UPDATE\n  operator.add   -> {'found': ['left', 'right']}\n\n  so a reducer is not an optimisation for history, it is what makes\n  concurrent writes to a key POSSIBLE AT ALL. without one, a fan-in\n  raises InvalidUpdateError -- loudly, with the fix named in the\n  message.\n\n  which is worth contrasting with part 1. the SAME missing reducer\n  is a silent data-loss bug on a sequential path and a hard error on\n  a parallel one. so a graph can work for months, grow one parallel\n  branch, and fail immediately -- and the error will be pointing at\n  the mistake that was already there.\n==============================================================================\nPART 4 -- a reducer must be associative and commutative-ish\n==============================================================================\n  the runtime applies updates in an order you do not control, so a\n  reducer whose result depends on order gives nondeterministic state.\n\n  operator.add on lists is associative and NOT commutative:\n    [a] + [b] = ['a','b']    [b] + [a] = ['b','a']\n\n  which is why parallel nodes appending to one list produce an order\n  that reflects node scheduling rather than anything meaningful. if\n  the order matters, you need a reducer that sorts, or a key per node.\n\n  reducers that are safe under reordering:\n    operator.add on numbers    (associative + commutative)\n    set union                  (associative + commutative)\n    max / min                  (associative + commutative)\n  reducers that are not:\n    list concatenation         (order reflects scheduling)\n    'last write wins'          (which write is last?)\n==============================================================================\nPART 5 -- a custom reducer\n==============================================================================\n  the real interface: any callable of (current, update) -> merged.\n\n  def merge_unique(current, update): append items not already present\n  two parallel fetchers returning overlapping docs:\n    {'docs': ['doc1', 'doc2', 'doc3']}\n\n  which is 7.2's multi-query union as a reducer -- deduplicating a\n  fan-in is a state-merge concern, not something the nodes should\n  each have to know about.\n==============================================================================\nPART 6 -- add_messages, and why it is not operator.add\n==============================================================================\n  LangGraph ships add_messages for message lists. it does three\n  things operator.add does not:\n\n    1. coerces dicts and strings into Message objects\n    2. assigns an id to messages that lack one\n    3. REPLACES a message whose id matches an existing one\n\n  the third is the point. appending is the common case and updating\n  a message in place is how you edit history -- which is what human-\n  in-the-loop editing (9.x) needs.\n\n  existing: [('HumanMessage', 'hello', 'm1')]\n  append  : [('HumanMessage', 'hello', 'm1'), ('AIMessage', 'hi', 'm2')]\n  same id : [('HumanMessage', 'HELLO EDITED', 'm1')]\n\n  the same-id case did not append -- it replaced. using operator.add\n  on a message list gives you appending only, and silently loses the\n  ability to correct a message later.",
        notes: [
          { t: "p", text: "**The default reducer is replacement**, so two sequential nodes writing one list leave only the second update. The types are correct and nothing raises." },
          { t: "p", text: "**A type annotation cannot express \u2018concatenate\u2019** \u2014 `List[str]` describes the shape of a value, not how two values combine." },
          { t: "p", text: "**`Annotated`'s second argument IS the reducer**, with the signature `reducer(current_value, node_update) -> new_value`." },
          { t: "p", text: "**On a parallel path the same omission raises `InvalidUpdateError`** \u2014 loudly, naming the fix. The runtime has two updates for one key and no rule to combine them." },
          { t: "p", text: "**So one mistake is silent data loss sequentially and a hard error in parallel.** A graph can work for months, grow one parallel branch, and fail immediately \u2014 pointing at a mistake that was already there." },
          { t: "p", text: "**A reducer is what makes concurrent writes possible at all**, not an optimisation for accumulating history." },
          { t: "p", text: "**Updates are applied in an order you do not control**, so list concatenation under a fan-in produces a scheduling order. Numbers, set union and max/min are safe under reordering." },
          { t: "p", text: "**`add_messages` replaces a message whose id matches**, rather than appending \u2014 which is how human-in-the-loop editing corrects history (9.x). `operator.add` on a message list silently removes that ability." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the chatbot that remembered only the last turn", body: [
      { t: "p", text: "A conversational graph declares `messages: List[BaseMessage]`. It passes every test, because each test sends one message. In production users complain the assistant has no memory of anything earlier in the conversation." },
      { t: "p", text: "There is no reducer, so each node's update replaces the list. The state holds exactly the most recent write at all times. Nothing raises, the types are right, and every single-turn test passes \u2014 which is why the bug reached production." },
      { t: "p", text: "The fix is `Annotated[List[BaseMessage], add_messages]`, and the test that would have caught it is a two-turn conversation asserting that the first message is still present. That generalises: for any accumulating key, the test has to exercise **two** writes, because a single write is the one case where a missing reducer is indistinguishable from a correct one." }
    ] }
  ],
  takeaways: [
    "**The default reducer is replacement** \u2014 two sequential nodes writing one list leave only the second.",
    "**A type annotation cannot express \u2018concatenate\u2019**: `List[str]` is a shape, not a merge rule.",
    "**This is the most common LangGraph bug and it is silent** \u2014 right types, no error, history gone.",
    "**`Annotated`'s second argument is the reducer**, with signature `(current, update) -> merged`.",
    "**On a parallel path the same omission raises `InvalidUpdateError`**, naming the fix.",
    "**So one mistake is silent sequentially and loud in parallel.**",
    "**A graph can work for months, grow a parallel branch, and fail on a mistake already present.**",
    "**A reducer makes concurrent writes possible at all**, rather than merely accumulating history.",
    "**Updates are applied in an order you do not control.**",
    "**Numbers, set union and max/min are safe under reordering; list concatenation is not.**",
    "**If order matters, sort deterministically or use a key per node** \u2014 \u2018first wins\u2019 is undefined.",
    "**A custom reducer is any callable of (current, update)** \u2014 deduplicating a fan-in belongs there.",
    "**`add_messages` coerces, assigns ids, and replaces a message whose id matches.**",
    "**Replacement by id is how human-in-the-loop edits history** \u2014 `operator.add` silently removes it.",
    "**Test accumulating keys with two writes**, since one write cannot distinguish a missing reducer."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Two sequential nodes each return `{\"messages\": [...]}` on a key declared `List[str]`. What is in the state?",
      options: ["Both updates, concatenated",
        "Only the second node's update \u2014 the default reducer is replacement",
        "An error, since two nodes wrote the same key",
        "The first update, since later writes are rejected"],
      answer: 1,
      why: "Without a reducer each update overwrites the key entirely, so the state holds the most recent write. The annotation List[str] describes the shape of the value and says nothing about how two values combine \u2014 there is no type-level way to express concatenation. Nothing raises, which is why this is the most common and most silent LangGraph bug." },
    { stem: "The same missing reducer raises InvalidUpdateError when two nodes run in parallel. Why does the failure differ?",
      options: ["Parallel execution validates schemas more strictly",
        "In one superstep the runtime has two updates for one key and no rule to combine them, so it refuses rather than picking one",
        "Parallel nodes bypass the default reducer",
        "The error is a race condition rather than a design check"],
      answer: 1,
      why: "Sequentially, replacement is well defined \u2014 the later write wins \u2014 so the runtime proceeds and loses data silently. In a single superstep there is no later, so it refuses and names the fix. The consequence is that a graph can work for months and fail the moment a parallel branch is added, with the error pointing at a mistake that was already corrupting history." },
    { stem: "Which reducer is unsafe when the runtime reorders updates?",
      options: ["operator.add on integers",
        "List concatenation \u2014 the resulting order reflects node scheduling",
        "Set union",
        "max"],
      answer: 1,
      why: "Addition on numbers, set union and max are all commutative, so the result is the same whatever order the updates arrive in. List concatenation is associative but not commutative, so two parallel nodes appending produce an order determined by scheduling. That is usually acceptable \u2014 a set of retrieved documents has no meaningful order \u2014 and it is a bug if the list is read as a sequence." },
    { stem: "What does add_messages do that operator.add does not?",
      options: ["It deduplicates identical message contents",
        "It coerces inputs into Message objects, assigns missing ids, and replaces a message whose id matches an existing one",
        "It trims the list to a maximum length",
        "It validates that messages alternate between roles"],
      answer: 1,
      why: "The replacement-by-id behaviour is the load-bearing one: appending covers the normal conversational case, and updating in place is how a message gets corrected \u2014 which is what human-in-the-loop editing requires. Using operator.add on a message list gives appending only and silently removes the ability to edit history, which looks correct until something tries to." }
  ] },
  interview: { title: "Interview practice", sub: "Reducers", questions: [
    { level: "core", q: "What is a reducer in LangGraph and when do you need one?",
      strong: "A strong answer knows the default is replacement and why that is silent.",
      answer: [
        { t: "p", text: "It is the function that decides how a node's update merges with the existing value of a key \u2014 declared as the second argument to Annotated, with the signature current value and node update in, merged value out." },
        { t: "p", text: "You need one for any key that accumulates, and the reason it matters is that the default is replacement. Two sequential nodes appending to a list leaves you with only the second one's contribution. The types are correct, nothing raises, and history quietly does not accumulate \u2014 which makes it the most common LangGraph bug and one of the hardest to notice." },
        { t: "p", text: "A type annotation cannot help here. List[str] describes the shape of the value, not how two values combine, so there is nothing a type checker could flag." },
        { t: "p", text: "The test that catches it is a two-write test. A single write is the one case where a missing reducer is indistinguishable from a correct one, so a suite of single-turn tests passes completely while the bug is live." }
      ] },
    { level: "advanced", q: "What is the subtlest reducer problem you know of?",
      strong: "A strong answer picks the sequential-vs-parallel asymmetry or ordering.",
      answer: [
        { t: "p", text: "That the same missing reducer fails in two completely different ways depending on the topology, so the error arrives long after the mistake." },
        { t: "p", text: "Sequentially it is silent: replacement is well defined, the later write wins, and you lose history without any signal. In parallel the runtime has two updates for one key in a single superstep and no rule to combine them, so it raises InvalidUpdateError and names the fix in the message." },
        { t: "p", text: "So a graph can run correctly for months, someone adds one parallel branch, and it fails immediately \u2014 with an error pointing at a mistake that was already there, quietly dropping data the whole time. The instinct is to look at the new branch, and the new branch is fine." },
        { t: "p", text: "The other one I would flag is ordering. Updates in a superstep are applied in an order you do not control, so list concatenation under a fan-in produces an order that reflects node scheduling. That is harmless for a set of retrieved documents and a real bug if the list is read as a sequence. Addition on numbers, set union and max are all commutative and safe; 'last write wins' is not even well defined, because there is no last." },
        { t: "p", text: "If the order genuinely matters I would sort deterministically in the reducer, or give each node its own key so there is no merge to order." }
      ] },
    { level: "core", q: "How would you choose a reducer for a given key?",
      strong: "A strong answer reasons from concurrency and ordering.",
      answer: [
        { t: "p", text: "Two questions: can more than one node ever write this key, and does the order of the writes matter." },
        { t: "p", text: "If only one node writes it and it is a current value rather than a history \u2014 a status, a classification, a count that is recomputed \u2014 the default replacement is correct and I would leave it alone. Adding a reducer there is how you get duplicated values when some node returns the whole state." },
        { t: "p", text: "If it accumulates, it needs one, and for messages specifically I would use add_messages rather than operator.add. It coerces inputs, assigns ids, and replaces a message whose id matches \u2014 which is what lets a reviewer edit history later. operator.add gives appending only and removes that quietly." },
        { t: "p", text: "If two nodes can write it concurrently, a reducer is mandatory rather than optional \u2014 without one the fan-in raises InvalidUpdateError, because the runtime has two values and no rule." },
        { t: "p", text: "Then the ordering question. Updates in a superstep are applied in an order I do not control, so I want a reducer that is commutative where possible \u2014 addition on numbers, set union, max. List concatenation is not, so a parallel fan-in into a list produces scheduling order. Harmless for a set of documents, a bug if anything reads it as a sequence, and then I would sort in the reducer or give each node its own key." }
      ] }
  ] }
});

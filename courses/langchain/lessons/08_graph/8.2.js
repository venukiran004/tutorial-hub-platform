EC.receiveLesson({
  id: "8.2",
  lede: "A `StateGraph` takes a schema, and the measured answer to *what does the runtime validate* is: almost nothing. An input key not in the schema is **accepted and filtered out**. A wrong type raises a `TypeError` \u2014 but from the **node body**, not from validation, so it surfaces wherever the value is eventually used rather than at the boundary. And a node returning a key not in the schema has that key **silently dropped**, with nothing reported. That last one is how a node whose update *\u201cdid not happen\u201d* actually fails: a typo in a returned key name is not an error, the node runs, returns successfully, writes nothing \u2014 and its unit test still passes.",
  objectives: [
    "Build the minimum viable graph and read what a node returns",
    "Determine what a TypedDict schema validates at runtime",
    "Explain how a typo in a returned key name fails",
    "Compare TypedDict against Pydantic and say what switching costs",
    "Say why every schema key is effectively public"
  ],
  prerequisites: ["8.1"],
  blocks: [
    { t: "h2", n: "01", id: "minimum", text: "The minimum viable graph", sub: "A node returns a partial update" },
    { t: "code", lang: "python", title: "Schema, node, edges, compile",
      code: 'class S(TypedDict):\n    value: int\n\ndef add_one(state: S):\n    return {"value": state["value"] + 1}\n\ng = StateGraph(S)\ng.add_node("add_one", add_one)\ng.add_edge(START, "add_one")\ng.add_edge("add_one", END)\napp = g.compile()',
      out: "  result : {'value': 2}",
      caption: "The node returned a **partial update** \u2014 not a new state." },
    { t: "p", text: "That distinction organises the rest of the module. A node returns a dict of the keys it wants to change, and the runtime merges it into the state according to each key's reducer (8.3). It does not return a state object, and 8.5 shows what goes wrong when you treat it as though it does." },
    { t: "h2", n: "02", id: "validates", text: "What the runtime validates", sub: "And it is less than it looks" },
    { t: "code", lang: "text", title: "Three malformed inputs",
      code: "a key not in the schema    accepted -> {'value': 2}\nthe wrong type for a key   RAISED TypeError: can only concatenate str (not \"int\") to str\na missing required key     RAISED KeyError: 'value'",
      caption: "Only the first is the runtime speaking." },
    { t: "callout", kind: "insight", title: "Two of those came from the node body", body: [
      { t: "p", text: "The extra key was **accepted and filtered out** of the result \u2014 so the schema does act as a key filter on input. That is the runtime doing something." },
      { t: "p", text: "The other two raised from inside the node: a `TypeError` because the node computed `\"not an int\" + 1`, and a `KeyError` because the node looked up an absent key. The runtime passed both straight through. So a `TypedDict` schema is a **key filter plus a reducer registry**, and type errors surface wherever the value is eventually *used* \u2014 which may be several nodes downstream of the one that wrote it." }
    ] },
    { t: "h2", n: "03", id: "dropped", text: "The silent drop", sub: "The one worth knowing" },
    { t: "code", lang: "python", title: "A node returning an undeclared key",
      code: 'class S2(TypedDict):\n    value: int\n\ndef rogue(state: S2):\n    return {"value": 1, "undeclared": "hello"}',
      out: "  node returns an undeclared key:\n    accepted -> {'value': 1}",
      caption: "`undeclared` is gone. Nothing was reported." },
    { t: "callout", kind: "trap", title: "This is how a node's update \u201cdoes not happen\u201d", body: [
      { t: "p", text: "A typo in a returned key name \u2014 `messages` for `message`, `answr` for `answer` \u2014 is not an error. The node runs, returns successfully, and **writes nothing**." },
      { t: "p", text: "And it is invisible from inside the node: its unit test passes, because the test asserts on the returned dict (8.5) rather than on what the runtime did with it. The only way to see it is to stream with `mode=\"updates\"` (8.9) and notice the key is absent from the state." }
    ] },
    { t: "h2", n: "04", id: "pydantic", text: "Pydantic, for the validation TypedDict does not do", sub: "And it changes every node" },
    { t: "code", lang: "python", title: "The node body changes",
      code: 'from pydantic import BaseModel\n\nclass SP(BaseModel):\n    value: int\n\ndef p_node(state: SP):\n    return {"value": state.value + 1}   # state.value, NOT state["value"]',
      out: "  valid input        : {'value': 2}\n  wrong type         : RAISED ValidationError: Input should be a valid integer\n  missing key        : RAISED ValidationError: Field required",
      caption: "With a Pydantic schema the state arrives as a **model instance**." },
    { t: "callout", kind: "tradeoff", title: "So the choice is not stylistic", body: [
      { t: "p", text: "`TypedDict` is a plain dict at runtime and validates nothing. Pydantic validates on every update, with clear errors at the boundary rather than deep in a node body." },
      { t: "p", text: "The cost is that the state arrives as an object, so every node body is written differently \u2014 `state.value` rather than `state[\"value\"]`. **Switching later is a rewrite of every node**, which is why it is worth deciding before the graph has twenty of them." }
    ] },
    { t: "p", text: "The proportionate default is `TypedDict` for a graph whose callers you control, and Pydantic when the state crosses a boundary you do not \u2014 an API, a queue, a persisted checkpoint from an older version. That is the same reasoning 4.7 applied to structured output: validate where the data stops being yours." },
    { t: "h2", n: "05", id: "interface", text: "The state is the interface between nodes", sub: "And it has no private part" },
    { t: "p", text: "A node receives the whole state and returns a partial update, so the schema is the **only** contract between nodes. There is no other channel: no arguments, no return value another node reads, no shared object." },
    { t: "callout", kind: "warn", title: "Every key is effectively public", body: [
      { t: "p", text: "Every key in the schema is a field shared by every node, so a key added for one node's convenience is visible to all of them \u2014 and so is a key added for debugging." },
      { t: "p", text: "That is a real coupling problem rather than a tidiness one: there is nothing in a node's signature saying which keys it reads, so the dependency graph between nodes is invisible. 8.4 is about getting the public surface back under control, and 8.5 has the discipline that makes the dependencies greppable." }
    ] },
    { t: "diagram", kind: "matrix", title: "What the runtime actually validates: almost nothing",
      caption: "The schema is a **contract between nodes**, not a validator. An unknown input key is accepted and filtered out; a wrong type raises from the node body rather than at the boundary, so the traceback points at your code instead of at the caller who sent it.",
      cols: ["what happens", "where you find out"],
      rows: ["a key not in the schema", "a wrong type", "a missing key", "an extra key from a node"],
      cells: [
        [{ text: "accepted, then filtered out", tone: "crit" }, { text: "nowhere — silent", tone: "crit" }],
        [{ text: "TypeError", tone: "warn" }, { text: "the node body, not the edge", tone: "warn" }],
        [{ text: "KeyError in the node", tone: "warn" }, { text: "at run time", tone: "warn" }],
        [{ text: "silently discarded", tone: "crit" }, { text: "nowhere — silent", tone: "crit" }]
      ] },
    { t: "exercise", kind: "build", title: "Find out what the schema enforces",
      difficulty: "core", minutes: 32,
      body: "Build the minimum viable graph with a TypedDict schema and confirm that a node returns a partial update. Then probe what the runtime validates: an input key not in the schema, a wrong type, a missing key, and a node returning an undeclared key. Repeat the probes with a Pydantic schema and note what changes in the node body. Finally explain why every schema key is effectively public.",
      requirements: ["Build a working graph with a TypedDict schema",
        "Show that the node returns a partial update rather than a state",
        "Probe at least three malformed inputs and say which errors came from the runtime",
        "Show what happens when a node returns a key not in the schema",
        "Explain how that failure mode presents and why a unit test misses it",
        "Repeat with Pydantic and note the change to every node body",
        "Explain why the schema is the only contract between nodes"],
      hint: "Have a node return a key that is not in the schema. What happens to it decides how you will debug every future node whose update seems not to apply.",
      solution: { lang: "python", title: "x0802.py \u2014 an undeclared key is silently dropped",
        code: 'class S2(TypedDict):\n    value: int\n\ndef rogue(state: S2):\n    return {"value": 1, "undeclared": "hello"}\n\ng2 = StateGraph(S2)\ng2.add_node("rogue", rogue)\ng2.add_edge(START, "rogue")\ng2.add_edge("rogue", END)\nprint(g2.compile().invoke({"value": 0}))\n\n# and with Pydantic, where the state is an OBJECT\nclass SP(BaseModel):\n    value: int\n\ndef p_node(state: SP):\n    return {"value": state.value + 1}',
        out: "==============================================================================\nPART 1 -- the minimum viable graph\n==============================================================================\n  schema : class S(TypedDict): value: int\n  node   : returns {'value': state['value'] + 1}\n  result : {'value': 2}\n\n  the node returned a PARTIAL update -- a dict with one key -- and the\n  runtime merged it into the state. it did not return a new state.\n==============================================================================\nPART 2 -- what the runtime validates, and what it does not\n==============================================================================\n  TypedDict is a static-typing construct. at runtime it is a plain\n  dict, so Python itself checks nothing.\n\n  a key not in the schema    accepted -> {'value': 2}\n  the wrong type for a key   RAISED TypeError: can only concatenate str (not \"int\") to str\n  a missing required key     RAISED KeyError: 'value'\n\n  read those three carefully, because only the first is the runtime\n  speaking.\n\n  the extra key was ACCEPTED and filtered out of the result -- so the\n  schema does act as a key filter on input.\n\n  the other two raised from inside the NODE BODY, not from validation:\n  a TypeError because the node did 'not an int' + 1, and a KeyError\n  because the node looked up a key that was absent. the runtime passed\n  both straight through.\n\n  so a TypedDict schema is a key filter plus a reducer registry, and\n  type errors surface wherever the value is eventually USED -- which\n  may be several nodes downstream of the one that wrote it.\n==============================================================================\nPART 3 -- a node returning a key that is not in the schema\n==============================================================================\n  node returns an undeclared key:\n    accepted -> {'value': 1}\n\n  SILENTLY DROPPED. the key is not in the schema, so the runtime\n  discards it and nothing is reported.\n\n  this is the one worth knowing, because it is how a node whose update\n  'did not happen' actually fails. a typo in a returned key name --\n  'messages' for 'message', 'answr' for 'answer' -- is not an error.\n  the node runs, returns successfully, and writes nothing.\n\n  and it is invisible from inside the node: its unit test passes,\n  because the test asserts on the returned dict (8.5) rather than on\n  what the runtime did with it. the only way to see it is to stream\n  with mode='updates' (8.9) and notice the key is absent.\n==============================================================================\nPART 4 -- Pydantic, for the validation TypedDict does not do\n==============================================================================\n  note the node body changed: state.value, not state['value'] --\n  with a Pydantic schema the state arrives as a MODEL INSTANCE.\n\n  valid input        : {'value': 2}\n  wrong type         : RAISED ValidationError: 1 validation error for SP\nvalue\n  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='not an int', input_type=str]\n    For further information visit https://errors.pydant\n  missing key        : RAISED ValidationError: 1 validation error for SP\nvalue\n  Field required [type=missing, input_value={}, input_type=dict]\n    For further information visit https://errors.pydantic.dev/2.12/v/missing\n\n  so the choice is not stylistic. TypedDict is a dict at runtime and\n  validates nothing; Pydantic validates on every update and changes\n  how every node body is written. switching later is a rewrite of\n  every node, which is why it is worth deciding first.\n==============================================================================\nPART 5 -- the state is the interface between nodes\n==============================================================================\n  a node receives the whole state and returns a partial update. so\n  the schema is the only contract between nodes -- there is no other\n  channel, no arguments, no return value another node reads.\n\n  which has a design consequence: every key in the schema is\n  effectively a public field shared by every node. a key added for\n  one node's convenience is visible to all of them, and 8.4 is about\n  getting that back under control.",
        notes: [
          { t: "p", text: "**A node returns a partial update**, not a new state \u2014 a dict of the keys it wants to change, which the runtime merges according to each key's reducer." },
          { t: "p", text: "**An input key not in the schema is accepted and filtered out**, so the schema acts as a key filter on input. That is the runtime doing something." },
          { t: "p", text: "**The type error and the missing-key error both came from the NODE BODY**, not from validation \u2014 so type errors surface wherever the value is used, possibly several nodes downstream of the one that wrote it." },
          { t: "p", text: "**A node returning an undeclared key has it silently dropped**, with nothing reported. That is how a node whose update \u2018did not happen\u2019 actually fails." },
          { t: "p", text: "**A typo in a returned key name is not an error** \u2014 the node runs, returns successfully, writes nothing, and its unit test passes because the test asserts on the returned dict." },
          { t: "p", text: "**Pydantic validates properly**, with clear errors at the boundary \u2014 and the state arrives as a model instance, so every node body uses `state.value` rather than `state[\"value\"]`." },
          { t: "p", text: "**So switching later rewrites every node**, which is why it is worth deciding before the graph has twenty of them. Default to TypedDict internally and Pydantic where the state crosses a boundary you do not control." },
          { t: "p", text: "**The schema is the only contract between nodes**, so every key is effectively public \u2014 including one added for debugging \u2014 and nothing in a node's signature says which keys it reads." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the node whose update never applied", body: [
      { t: "p", text: "A node computes a summary and returns `{\"summry\": text}`. Its unit test passes. Downstream nodes see an empty summary and the team spends a day looking at the reducer, the edges and the superstep model." },
      { t: "p", text: "The key is not in the schema, so the runtime discarded it without comment. Nothing is wrong with the reducer, the edges or the node \u2014 the update was addressed to a key that does not exist, and that is not an error anywhere in the system." },
      { t: "p", text: "The fast diagnostic is to stream with `mode=\"updates\"`, which shows exactly what reached the state from each node: the key is simply absent. The structural fix is to stop relying on string literals for key names \u2014 define them as module constants, or use a Pydantic schema so an unknown field is rejected rather than ignored. The general shape is that a typo in a dict key is a class of bug a type system normally catches, and a `TypedDict` does not catch it at runtime." }
    ] }
  ],
  takeaways: [
    "**A node returns a partial update**, not a new state object.",
    "**An input key not in the schema is accepted and filtered out** \u2014 the schema is a key filter.",
    "**Type and missing-key errors come from the node body**, not from validation.",
    "**So type errors surface wherever the value is used**, possibly several nodes downstream.",
    "**A node returning an undeclared key has it silently dropped**, with nothing reported.",
    "**A typo in a returned key name is not an error** \u2014 the node runs and writes nothing.",
    "**And its unit test passes**, because the test asserts on the returned dict.",
    "**`mode=\"updates\"` is the only way to see it** (8.9).",
    "**A `TypedDict` schema is a key filter plus a reducer registry** and validates no types.",
    "**Pydantic validates on every update** and delivers the state as a model instance.",
    "**So switching later rewrites every node body** \u2014 decide before the graph grows.",
    "**Default to TypedDict internally, Pydantic where the state crosses a boundary you do not control.**",
    "**The schema is the only contract between nodes**, so every key is effectively public.",
    "**And nothing in a node's signature says which keys it reads.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A node returns `{\"summry\": text}` where the schema declares `summary`. What happens?",
      options: ["A KeyError is raised at the end of the superstep",
        "The key is silently dropped \u2014 the node runs, returns successfully, and writes nothing",
        "The key is added to the state dynamically",
        "compile() rejects the graph"],
      answer: 1,
      why: "The runtime discards updates addressed to keys not in the schema, without reporting it. The failure is particularly hard to find because the node's own unit test passes \u2014 the test asserts on the returned dict, which is correct \u2014 and nothing in the reducer, the edges or the superstep model is wrong. Streaming with mode='updates' shows the key simply absent from what reached the state." },
    { stem: "A graph with a TypedDict schema raises `TypeError: can only concatenate str (not \"int\") to str`. Where did that come from?",
      options: ["The runtime's schema validation",
        "The node body \u2014 TypedDict is a plain dict at runtime and validates nothing",
        "The reducer for that key",
        "The compile-time type checker"],
      answer: 1,
      why: "TypedDict is a static-typing construct with no runtime representation beyond dict, so the value passed straight through to the node, which then tried to add an integer to a string. The practical consequence is that type errors appear wherever the value is eventually used, which can be several nodes after the one that wrote it \u2014 and the traceback points at the reader, not the writer." },
    { stem: "What changes if you switch a schema from TypedDict to Pydantic?",
      options: ["Nothing in the node bodies; only validation is added",
        "The state arrives as a model instance, so every node body changes from state[\"key\"] to state.key",
        "Reducers stop working and must be declared differently",
        "The graph must be recompiled with a different entrypoint"],
      answer: 1,
      why: "Pydantic adds real validation on every update, with errors at the boundary rather than deep in a node, which is the reason to use it. The cost is that the state is delivered as an object rather than a dict, so every access changes form. That makes it a decision worth taking before the graph has many nodes, since switching later is a rewrite of all of them." },
    { stem: "Why is every key in a graph's schema effectively public?",
      options: ["Because compile() exposes the schema for introspection",
        "A node receives the whole state and the schema is the only contract between nodes \u2014 there is no other channel",
        "Because checkpointers serialise all keys",
        "Because the keys appear in traces"],
      answer: 1,
      why: "Nodes communicate exclusively through the state: there are no arguments, no return values another node reads, and no private channel. So a key added for one node's convenience, or for debugging, is visible to every node and to the caller. Nothing in a node's signature declares which keys it reads either, which makes the coupling between nodes invisible." }
  ] },
  interview: { title: "Interview practice", sub: "State schemas", questions: [
    { level: "core", q: "TypedDict or Pydantic for a LangGraph state schema?",
      strong: "A strong answer knows TypedDict validates nothing and what switching costs.",
      answer: [
        { t: "p", text: "TypedDict for a graph whose callers I control, Pydantic where the state crosses a boundary I do not \u2014 an API, a queue, a checkpoint persisted by an older version." },
        { t: "p", text: "The thing to be clear about is that TypedDict validates nothing at runtime. I measured it: a wrong type produced a TypeError from inside the node body when it tried to do arithmetic, and a missing key produced a KeyError the same way. The runtime passed both straight through. So the schema is really a key filter plus a registry of which reducer belongs to which key." },
        { t: "p", text: "That matters because errors then surface wherever the value is eventually used, which can be several nodes after the one that wrote it \u2014 so the traceback points at the reader rather than the writer." },
        { t: "p", text: "Pydantic fixes that with validation on every update, and the cost is that the state arrives as a model instance rather than a dict. Every node body changes from bracket access to attribute access, so switching later is a rewrite of every node. That is why I would decide early rather than discover it at twenty nodes." }
      ] },
    { level: "advanced", q: "A node's update does not appear in the state. How do you debug it?",
      strong: "A strong answer suspects the key name and knows why tests miss it.",
      answer: [
        { t: "p", text: "I would check the returned key name against the schema first, because that is the failure mode that produces no error at all." },
        { t: "p", text: "A node returning a key not in the schema has it silently dropped. The node runs, returns successfully, and writes nothing \u2014 so a typo like 'summry' for 'summary' is not an error anywhere in the system. I have watched that cost a day of looking at reducers and edges, which are all fine." },
        { t: "p", text: "What makes it nasty is that the node's unit test passes. The test asserts on the dict the node returned, which is correct in itself \u2014 the test is examining the right object and the runtime is the thing that discards it. So test coverage does not help." },
        { t: "p", text: "The fast diagnostic is streaming with mode='updates', which shows what each node actually contributed to the state. The key is simply absent, and that narrows it to a name mismatch in one step." },
        { t: "p", text: "Structurally I would stop relying on string literals for key names \u2014 module-level constants, or a Pydantic schema so an unknown field is rejected rather than ignored. A typo in a dict key is normally the kind of thing a type system catches, and this is a case where the type annotation is present and does nothing at runtime." }
      ] },
    { level: "core", q: "How would you design the state schema for a new graph?",
      strong: "A strong answer treats the schema as the whole inter-node contract.",
      answer: [
        { t: "p", text: "Starting from the understanding that the schema is the only channel between nodes \u2014 there are no arguments, no return values a node reads, nothing private. So every key I add is a field shared by every node." },
        { t: "p", text: "That means I would keep it small and deliberate rather than letting it grow a key per convenience. A key added so one node can pass something to the next is fine; a key added so a routing function can read back what a node already knew is a smell, and 8.8's Command is usually the better answer." },
        { t: "p", text: "For each key I would decide the reducer at the same time as the type, because the default is replacement and the type annotation cannot express a merge rule. Anything that accumulates needs declaring, and anything two nodes can ever write needs one or the parallel case fails outright." },
        { t: "p", text: "TypedDict internally, Pydantic where the state crosses a boundary I do not control \u2014 and that choice early, since the state arrives as a dict or as an object and switching rewrites every node body." },
        { t: "p", text: "And I would use module-level constants for key names rather than string literals, because a typo in a returned key is silently dropped and nothing anywhere reports it." }
      ] }
  ] }
});

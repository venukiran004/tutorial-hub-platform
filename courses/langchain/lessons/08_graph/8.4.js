EC.receiveLesson({
  id: "8.4",
  lede: "8.2 established that the schema is the only contract between nodes, so every key is effectively public. The consequence is concrete: a graph with a single schema returns the retry count, the debug timings and **8 KB of raw API response** to its caller, and an underscore prefix is a convention the runtime knows nothing about. `StateGraph` takes separate `input_schema` and `output_schema`, which fixes it \u2014 and the input schema turns out to be a **filter rather than a validator**: passing an internal key is accepted and ignored, not rejected. That distinction matters for the contract, because a client coded against an internal key then fails silently.",
  objectives: [
    "Show what a single-schema graph exposes to its caller",
    "Apply the three-schema pattern and verify the filtering",
    "Determine whether the input schema validates or filters",
    "Name the three things the split actually buys",
    "Decide when the extra schemas are worth their cost"
  ],
  prerequisites: ["8.2"],
  blocks: [
    { t: "h2", n: "01", id: "leak", text: "What a single schema exposes", sub: "Everything" },
    { t: "code", lang: "python", title: "Five keys, one schema",
      code: 'class Leaky(TypedDict):\n    question: str\n    answer: str\n    _raw_api_response: str\n    _retry_count: int\n    _debug_timings: List[str]',
      out: "  one schema, five keys. invoke returns:\n    question               'what is it'\n    answer                 '42'\n    _raw_api_response      '{...8kb of json...}'\n    _retry_count           '2'\n    _debug_timings         \"['fetch: 12ms']\"",
      caption: "The underscore prefix is a Python convention the runtime does not read." },
    { t: "p", text: "The caller receives the retry count, the debug timings and 8 KB of raw upstream response. Nothing is malfunctioning \u2014 the state is the return value, and every key in the schema is part of the state." },
    { t: "h2", n: "02", id: "three", text: "The three-schema pattern", sub: "And what each one does" },
    { t: "code", lang: "python", title: "Separate input, internal and output",
      code: 'class In(TypedDict):\n    question: str\n\nclass Internal(TypedDict):\n    question: str\n    answer: str\n    raw: str\n    retries: int\n\nclass OutS(TypedDict):\n    answer: str\n\ng = StateGraph(Internal, input_schema=In, output_schema=OutS)',
      out: "  invoke({'question': ...}) -> {'answer': '42'}",
      caption: "The internal keys exist during the run and are filtered out of the result." },
    { t: "callout", kind: "insight", title: "The input schema filters, it does not validate", body: [
      { t: "p", text: "Passing an internal key as input is **accepted and ignored**, not rejected. So `input_schema` decides which keys reach the graph and says nothing about the others." },
      { t: "p", text: "Which matters for the contract: a caller who passes `retries` gets no error and no effect, so a client coded against an internal key fails **silently** rather than loudly. If you want rejection, that is Pydantic's job (8.2) \u2014 and it is a different decision from filtering, worth making explicitly." }
    ] },
    { t: "h2", n: "03", id: "buys", text: "What the split buys", sub: "Three things, and none of them is neatness" },
    { t: "dl", items: [
      ["a contract", "The caller cannot depend on an internal key because they never see it \u2014 so renaming `raw` is not a breaking change. With one schema, every internal field is part of your public API by accident."],
      ["a smaller checkpoint", "9.x persists the state on **every superstep**, so an 8 KB raw response in the schema is 8 KB written per step, forever. The output schema does not help here \u2014 only keeping it out of the internal schema does."],
      ["a boundary", "The leaky version returns the raw upstream response to the caller, which is how internal error details and upstream identifiers reach a client. That is 5.5's filter argument applied to state rather than to documents."]
    ] },
    { t: "callout", kind: "warn", title: "The second one is the expensive one", body: [
      { t: "p", text: "The output schema controls what the caller sees. It does **not** reduce what gets persisted \u2014 the internal schema is what the checkpointer writes, on every superstep." },
      { t: "p", text: "So a large blob in the internal state is a per-step serialisation cost even with a tidy output schema, and the fix is different: keep the blob out of the state entirely \u2014 write it to storage and keep a reference \u2014 rather than hiding it from the caller." }
    ] },
    { t: "h2", n: "04", id: "cost", text: "The honest cost", sub: "And a proportionate rule" },
    { t: "p", text: "Three schemas for one graph is more code, and the keys have to be kept consistent across them by hand \u2014 promoting an internal key to public is a change in two places, and nothing checks that the three agree." },
    { t: "callout", kind: "good", title: "The trigger is an audience, not a line count", body: [
      { t: "p", text: "One schema while the graph is internal and small. Split input and output the moment the graph is called by code you do not own, persisted, or exposed over a network." },
      { t: "p", text: "That ordering matters because the cost of splitting late is low \u2014 adding an output schema does not change any node \u2014 whereas the cost of *not* splitting is that callers have already coded against your internal keys, and now you cannot rename them. The asymmetry argues for splitting at the first external caller rather than waiting for the state to get messy." }
    ] },
    { t: "exercise", kind: "build", title: "Give a graph a public surface",
      difficulty: "advanced", minutes: 28,
      body: "Build a graph with one schema containing both public and internal keys, and show exactly what the caller receives. Then split it into input, internal and output schemas and show the difference. Determine whether the input schema rejects or merely ignores an internal key, and say what that means for the contract. Name what the split buys, and say which of those the output schema does not help with.",
      requirements: ["Show what a single-schema graph returns, including internal keys",
        "Explain why an underscore prefix does not help",
        "Apply the three-schema pattern and show the filtered output",
        "Determine whether the input schema validates or filters",
        "Explain what that means for a client coded against an internal key",
        "Name three things the split buys",
        "Identify which one the output schema does not address"],
      hint: "Pass an internal key as input and see whether it is rejected. Accepted-and-ignored and rejected are very different contracts.",
      solution: { lang: "python", title: "x0804.py \u2014 accepted and ignored, not rejected",
        code: 'class In(TypedDict):\n    question: str\n\nclass Internal(TypedDict):\n    question: str\n    answer: str\n    raw: str\n    retries: int\n\nclass OutS(TypedDict):\n    answer: str\n\ng = StateGraph(Internal, input_schema=In, output_schema=OutS)\ng.add_node("work", work)\ng.add_edge(START, "work")\ng.add_edge("work", END)\napp = g.compile()\n\nprint(app.invoke({"question": "what is it"}))\nprint(app.invoke({"question": "q", "retries": 99}))   # internal key as input',
        out: "==============================================================================\nPART 1 -- the problem: every key is public\n==============================================================================\n  one schema, five keys. invoke returns:\n    question               'what is it'\n    answer                 '42'\n    _raw_api_response      '{...8kb of json...}'\n    _retry_count           '2'\n    _debug_timings         \"['fetch: 12ms']\"\n\n  the caller receives the retry count, the debug timings and 8kb of\n  raw API response. the underscore prefix is a convention the runtime\n  knows nothing about.\n==============================================================================\nPART 2 -- the three-schema pattern\n==============================================================================\n  StateGraph takes separate input and output schemas:\n\n    StateGraph(InternalState, input_schema=In, output_schema=Out)\n\n  invoke({'question': ...}) -> {'answer': '42'}\n\n  the internal keys exist during the run and are filtered out of the\n  result. the public surface is one key.\n\n  and what happens if a caller passes an internal key anyway?\n    accepted -> {'answer': '42'}\n\n  accepted and ignored, not rejected. so the input schema is a FILTER\n  rather than a validator -- it decides which keys reach the graph and\n  does not complain about the others.\n\n  which matters for the contract: a caller who passes `retries` gets\n  no error and no effect, so a client coded against an internal key\n  fails silently rather than loudly. if you want rejection, that is\n  Pydantic's job (8.2), and it is a different decision from filtering.\n==============================================================================\nPART 3 -- what this buys, and it is not neatness\n==============================================================================\n  1. a CONTRACT. the caller cannot depend on an internal key, because\n     they never see it -- so renaming `raw` is not a breaking change.\n\n  2. a smaller serialised checkpoint surface. 9.x persists state on\n     every superstep, so an 8kb raw response in the schema is 8kb\n     written per step, forever.\n\n  3. a security boundary. the leaky version returns the raw upstream\n     response to the caller, which is how internal error details and\n     upstream identifiers end up in a client -- 5.5's filter argument\n     applied to state rather than to documents.\n==============================================================================\nPART 4 -- the honest cost\n==============================================================================\n  three schemas for one graph is more code, and the keys have to be\n  kept consistent across them by hand -- an internal key that should\n  be public is a change in two places.\n\n  so the proportionate rule: one schema while the graph is internal\n  and small; split input and output the moment the graph is called by\n  code you do not own, or persisted, or exposed over a network. the\n  trigger is an audience, not a line count.",
        notes: [
          { t: "p", text: "**A single schema returns everything** \u2014 the retry count, the debug timings and 8 KB of raw upstream response. The state is the return value." },
          { t: "p", text: "**An underscore prefix is a Python convention the runtime does not read**, so it provides no protection at all." },
          { t: "p", text: "**`output_schema` filters the result** down to the public keys, while the internal keys still exist during the run." },
          { t: "p", text: "**`input_schema` filters rather than validates**: passing an internal key is accepted and ignored, not rejected." },
          { t: "p", text: "**So a client coded against an internal key fails silently** \u2014 no error, no effect. Rejection is Pydantic's job (8.2) and is a separate decision." },
          { t: "p", text: "**The split buys a contract** (renaming an internal key is no longer breaking), **a boundary** (the raw upstream response stops reaching the caller), **and a smaller checkpoint**." },
          { t: "p", text: "**But the output schema does not reduce what is persisted** \u2014 the internal schema is what the checkpointer writes, on every superstep. A large blob needs keeping out of the state entirely, with a reference in its place." },
          { t: "p", text: "**Split at the first external caller, not at a line count.** Splitting late is cheap and costs no node changes; not splitting means callers have already coded against your internal keys." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the field that could not be renamed", body: [
      { t: "p", text: "A graph is exposed through an internal HTTP endpoint that returns the whole state. Six months later the team wants to rename `raw` to `provider_response` and restructure it. Three downstream services are reading it." },
      { t: "p", text: "Those services were never given an interface \u2014 they were given the state, so every internal field became part of the API by default. The rename is now a coordinated change across four codebases for what was supposed to be an implementation detail." },
      { t: "p", text: "An output schema at the point the endpoint was created would have prevented it entirely, and it costs nothing: no node changes, one extra class. The generalisable rule is that the moment a graph has a caller you do not own, it needs a declared output \u2014 and a state object is not an interface, it is everything you happened to need while computing." }
    ] }
  ],
  takeaways: [
    "**A single schema returns everything to the caller** \u2014 retry counts, debug timings, raw upstream responses.",
    "**An underscore prefix is a convention the runtime does not read.**",
    "**`StateGraph(Internal, input_schema=In, output_schema=Out)`** gives the graph a public surface.",
    "**`output_schema` filters the result**; internal keys still exist during the run.",
    "**`input_schema` filters rather than validates** \u2014 an internal key is accepted and ignored.",
    "**So a client coded against an internal key fails silently**, with no error and no effect.",
    "**Rejection is Pydantic's job** (8.2) and is a separate decision from filtering.",
    "**The split buys a contract**: renaming an internal key stops being a breaking change.",
    "**It buys a boundary**: the raw upstream response stops reaching the caller (5.5, applied to state).",
    "**The output schema does NOT reduce what is persisted** \u2014 the internal schema is what gets checkpointed.",
    "**A large blob needs keeping out of the state entirely**, with a reference in its place.",
    "**The cost is three schemas kept consistent by hand**, with nothing checking that they agree.",
    "**Split at the first external caller, not at a line count** \u2014 splitting late is cheap, not splitting is not.",
    "**A state object is not an interface** \u2014 it is everything you needed while computing."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A caller passes an internal key that is not in the graph's input_schema. What happens?",
      options: ["A ValidationError is raised",
        "It is accepted and ignored \u2014 input_schema filters rather than validates",
        "It is merged into the state anyway",
        "compile() would have rejected the graph"],
      answer: 1,
      why: "The input schema decides which keys reach the graph and says nothing about the others, so the extra key produces no error and no effect. That is a meaningful contract difference: a client coded against an internal key fails silently rather than loudly. If rejection is wanted, a Pydantic schema provides it, and that is a separate decision from filtering." },
    { stem: "Why does an output schema not solve the checkpoint size problem?",
      options: ["Checkpointers ignore schemas entirely",
        "The internal schema is what gets persisted on every superstep; the output schema only filters what the caller sees",
        "Output schemas are applied before serialisation",
        "Checkpoints store only the final state"],
      answer: 1,
      why: "Persistence writes the working state each superstep, so an 8 KB blob in the internal schema costs 8 KB per step however tidy the returned result is. The fix is different in kind: keep the blob out of the state altogether, writing it to storage and holding a reference. Confusing the two leads to a tidy API with an expensive checkpoint." },
    { stem: "What is the strongest argument for splitting schemas early?",
      options: ["It reduces the total amount of code",
        "Splitting late is cheap and changes no nodes, while not splitting means callers have already coded against internal keys",
        "The runtime performs better with smaller schemas",
        "Internal keys cannot be added after compilation"],
      answer: 1,
      why: "Adding an output schema later requires one extra class and no node changes, so the migration itself is easy. What is not easy is the situation it leaves if you wait: downstream consumers reading the whole state have made every internal field part of your API, and renaming one becomes a coordinated change across several codebases. The asymmetry argues for splitting at the first external caller." },
    { stem: "Why does prefixing internal keys with an underscore not protect them?",
      options: ["The runtime strips underscores from key names",
        "It is a Python naming convention that the graph runtime does not read \u2014 the key is in the schema, so it is in the state",
        "Underscored keys cannot have reducers",
        "It works, but only with Pydantic schemas"],
      answer: 1,
      why: "The convention signals intent to human readers and to some linters; nothing in LangGraph treats an underscored key differently. Since the state is the return value and every schema key is part of the state, an underscored field is returned to the caller exactly like any other. Enforcement requires a declared output schema." }
  ] },
  interview: { title: "Interview practice", sub: "Schema boundaries", questions: [
    { level: "core", q: "How do you keep internal state out of a graph's public interface?",
      strong: "A strong answer uses declared schemas and knows what each one does.",
      answer: [
        { t: "p", text: "With separate input and output schemas, passed to StateGraph alongside the internal one. The internal keys exist during the run and the output schema filters the result down to what the caller should see." },
        { t: "p", text: "The thing not to rely on is naming conventions. I have seen underscore-prefixed keys used for this, and the runtime does not read underscores \u2014 the key is in the schema, so it is in the state, so it is returned. I measured a single-schema graph handing its caller the retry count, debug timings and about 8 KB of raw upstream response." },
        { t: "p", text: "One detail worth knowing: the input schema filters rather than validates. Passing an internal key is accepted and ignored, not rejected. So a client coded against an internal field gets no error and no effect, which is a silent failure rather than a loud one. If I wanted rejection I would use a Pydantic schema, and I would treat that as a separate decision." },
        { t: "p", text: "I would do the split at the first caller I do not own, rather than at some size threshold. Adding an output schema later costs one class and changes no nodes; not having one means downstream services have already coded against internal fields." }
      ] },
    { level: "advanced", q: "What does a schema split actually buy, beyond tidiness?",
      strong: "A strong answer names three things and what the split does not fix.",
      answer: [
        { t: "p", text: "Three things, and one thing it notably does not fix." },
        { t: "p", text: "First, a contract. If callers never see an internal key they cannot depend on it, so renaming or restructuring it stops being a breaking change. Without that, every field you happened to need while computing is part of your API by accident \u2014 I have seen a rename of one internal field become a coordinated change across four codebases." },
        { t: "p", text: "Second, a security boundary. The leaky version returns the raw upstream response to the caller, which is how internal error details, stack traces and upstream identifiers reach a client. It is the same argument as filtering documents before retrieval rather than asking the model not to mention them \u2014 structural rather than a request." },
        { t: "p", text: "Third, checkpoint size \u2014 but only partly, and this is the one people get wrong. Persistence writes the working state on every superstep, and that is the internal schema, not the output schema. So a large blob costs you per step however tidy the returned result is." },
        { t: "p", text: "The fix for that is different in kind: keep the blob out of the state entirely, write it to storage and hold a reference. Hiding it from the caller does nothing for the serialisation cost, and conflating the two gets you a clean API with an expensive graph." }
      ] },
    { level: "core", q: "What would you put in a graph's state, and what would you keep out?",
      strong: "A strong answer thinks about per-superstep serialisation.",
      answer: [
        { t: "p", text: "In: what nodes need to pass to each other, and what a resumed run would need to continue. Out: anything large, and anything a node could recompute or fetch." },
        { t: "p", text: "The reason to be strict is persistence. A checkpointer writes the working state on every superstep, so an 8 KB raw API response in the schema is 8 KB serialised per step, for the life of the thread. A multi-turn conversation with a few of those is a surprisingly large row." },
        { t: "p", text: "So for anything big \u2014 a raw provider response, a document's full text, an image \u2014 I would write it to storage and keep a reference in the state. The node that needs it fetches it; the node that does not pays nothing." },
        { t: "p", text: "The distinction worth being clear about is that an output schema does not help with this. It controls what the caller sees, not what gets persisted \u2014 the internal schema is what the checkpointer writes. I have seen those conflated, giving a clean API over an expensive graph." },
        { t: "p", text: "Debug material is the other thing I would keep out, or at least out of the internal schema. Timings and retry counts are tempting to thread through state and they are per-step serialisation cost for something a trace already records better." }
      ] }
  ] }
});

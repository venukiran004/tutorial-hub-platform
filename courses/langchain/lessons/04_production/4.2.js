EC.receiveLesson({
  id: "4.2",
  lede: "A run is a **tree, not a list**, and the tree is what makes a slow run diagnosable. Built from callback events, the span tree for a nested chain shows the model call as the deepest row and the slowest \u2014 **51.5 ms of a 59.9 ms run, 86%** \u2014 with everything above it mostly bookkeeping. That is the usual shape, and it is why a flat log of \u201cchain started\u201d lines tells you nothing. The number that identifies where to optimise is **self time**: a span's own time minus its children. Total time on a parent only tells you it contains a slow child.",
  objectives: [
    "Build a span tree from callback events",
    "Distinguish total time from self time and say which one is actionable",
    "Read a trace to find the step that is actually slow",
    "Attach run names, tags and metadata before you need them",
    "Explain why trace attributes cannot be added retrospectively"
  ],
  prerequisites: ["4.1", "2.9"],
  blocks: [
    { t: "h2", n: "01", id: "tree", text: "A run is a tree", sub: "Built from the nesting a flat log throws away" },
    { t: "code", lang: "text", title: "The span tree for a nested chain",
      code: 'chain  chain          59.9 ms\n  chain  chain           0.9 ms\n  chain  chain          54.3 ms\n    chain  ChatPromptTemplate    0.4 ms\n    llm    model          51.5 ms\n    chain  chain           0.4 ms\n  chain  chain           2.4 ms',
      caption: "The model call is the deepest row and the slowest. That is the usual shape." },
    { t: "p", text: "Each `on_*_start` increases the depth and each `on_*_end` decreases it, which is all a tracer is: the callback events already carry the structure, and a tracer is the thing that does not throw it away." },
    { t: "h2", n: "02", id: "self", text: "Self time against total time", sub: "Only one of them tells you what to do" },
    { t: "code", lang: "text", title: "Where the time went",
      code: 'total run        :   59.9 ms\nmodel call       :   51.5 ms  (86% of the run)\neverything else  :    8.4 ms',
      caption: "86% in one span, eight milliseconds spread across the rest." },
    { t: "callout", kind: "insight", title: "A parent's total time is not a finding", body: [
      { t: "p", text: "The root span took 59.9 ms, and that tells you nothing except that something inside it was slow. **Self time** \u2014 a span's duration minus the sum of its children \u2014 is what localises a problem, because it attributes time to the span that actually spent it." },
      { t: "p", text: "In LLM applications the answer is usually the model call, which is both reassuring and a trap: it is true often enough that people stop looking, and the interesting incidents are the ones where it is not true. A retriever that occasionally takes 800 ms or a tool with a cold connection shows up only if you are reading self time rather than assuming." }
    ] },
    { t: "h2", n: "03", id: "attach", text: "What to attach", sub: "And why it must be done early" },
    { t: "table", head: ["Attach", "Buys"], rows: [
      ["`run_name`", "a readable span name instead of `RunnableSequence`"],
      ["`tags`", "queryable: `[\"prod\", \"v2\", \"experiment-a\"]`"],
      ["`metadata`", "queryable: `{\"tenant\": \"acme\", \"user_tier\": \"free\"}`"],
      ["a request id in metadata", "ties a trace to your own application logs"]
    ] },
    { t: "callout", kind: "warn", title: "It cannot be added retrospectively", body: [
      { t: "p", text: "2.9 made this point and it is worth repeating where it bites: the moment you want to query traces by tenant is during an incident, and the traffic you need to query **has already happened**. You cannot tag last Tuesday." },
      { t: "p", text: "That asymmetry is why this belongs on the build checklist rather than the operations checklist. It costs one `with_config` per chain, changes no behaviour, and is unrecoverable if skipped." }
    ] },
    { t: "p", text: "The request-id row is the one teams miss most often. A trace store and an application log are two separate systems, and without a shared identifier, correlating \u201cthe user who complained at 14:32\u201d with a specific run is manual and usually impossible at volume." },
    { t: "h2", n: "04", id: "readable", text: "Readable against queryable", sub: "Two different problems" },
    { t: "p", text: "A `run_name` makes a span **readable** \u2014 you are not staring at forty rows called `RunnableSequence` trying to match step indices. Tags and metadata make a trace **queryable**, which is the thing that matters once there is volume: show me the failures for this tenant, this version, this experiment arm." },
    { t: "p", text: "Readable helps one person debugging one run. Queryable is what lets you ask whether a problem is general, which is almost always the first question. Both are one method call, and only the second degrades as traffic grows." },
    { t: "diagram", kind: "timeline", title: "A run is a tree, and the tree is what makes it diagnosable",
      caption: "Built from callback events: the model call is the deepest row **and** the slowest — 51.5 ms of a 59.9 ms run, **86%** — with everything above it mostly waiting on it. A flat list of timings cannot show you that the parent's cost *is* the child's.",
      span: 62, tick: 10, unit: "milliseconds",
      lanes: [
        { label: "the whole run", bars: [[0, 59.9, "59.9 ms total", "accent"]] },
        { label: "inner chain", bars: [[1.5, 56, "54.5 ms — waiting", "teal"]] },
        { label: "the model call", bars: [[3, 54.5, "51.5 ms — 86%", "crit"]] },
        { label: "the parser", bars: [[56, 59, "", "good"]] }
      ] },
    { t: "exercise", kind: "build", title: "Build a tracer and read it",
      difficulty: "advanced", minutes: 26,
      body: "Write a callback handler that maintains a depth counter and records each span's name and duration, producing an indented tree. Run it on a nested chain containing a deliberately slow model call. Print the tree, then compute what share of the run the model call took and what was left for everything else. Finally, list the attributes worth attaching and say why they cannot be added later.",
      requirements: ["A handler that increases depth on start and decreases on end",
        "Record each span's duration, paired by run_id",
        "Print an indented tree with durations",
        "Use run_name to give at least two spans readable names",
        "Report the model call's share of total run time",
        "Explain self time against total time",
        "List four things to attach and why attaching them is not retrospective"],
      hint: "The tracer is the callback handler from 4.1 plus a depth counter. The interesting row is the deepest one.",
      solution: { lang: "python", title: "x0402.py \u2014 the tree the events already contain",
        code: 'class TreeTracer(BaseCallbackHandler):\n    def __init__(self):\n        self.rows, self.depth, self.t0 = [], 0, {}\n\n    def _enter(self, kind, name, run_id):\n        self.rows.append([self.depth, kind, name, None])\n        self.t0[run_id] = (time.perf_counter(), len(self.rows) - 1)\n        self.depth += 1\n\n    def _exit(self, run_id):\n        self.depth -= 1\n        if run_id in self.t0:\n            t, idx = self.t0.pop(run_id)\n            self.rows[idx][3] = (time.perf_counter() - t) * 1000\n\n    def on_chain_start(self, serialized, inputs, *, run_id=None, **kw):\n        self._enter("chain", (serialized or {}).get("name", "chain"), run_id)\n    def on_chain_end(self, outputs, *, run_id=None, **kw):\n        self._exit(run_id)\n    def on_llm_start(self, serialized, prompts, *, run_id=None, **kw):\n        self._enter("llm", "model", run_id)\n    def on_llm_end(self, response, *, run_id=None, **kw):\n        self._exit(run_id)\n\nouter = (RunnableLambda(...).with_config(run_name="prepare")\n         | inner.with_config(run_name="answer")\n         | RunnableLambda(str.strip).with_config(run_name="tidy"))',
        out: "==============================================================================\nPART 1 -- a run is a tree, not a list\n==============================================================================\n  the span tree:\n    chain  chain          58.5 ms\n      chain  chain           0.6 ms\n      chain  chain          54.1 ms\n        chain  ChatPromptTemplate    0.5 ms\n        llm    model          51.4 ms\n        chain  chain           0.3 ms\n      chain  chain           2.2 ms\n\n  the model call is the deepest row and the slowest. the rows above it\n  are mostly bookkeeping -- which is the usual shape, and the reason a\n  flat log of 'chain started' lines tells you nothing.\n\n==============================================================================\nPART 2 -- self time against total time\n==============================================================================\n  total run        :   58.5 ms\n  model call       :   51.4 ms  (88% of the run)\n  everything else  :    7.0 ms\n\n  'self time' -- a span's own time minus its children -- is what tells\n  you where to optimise. total time on a parent span just tells you\n  that it contains a slow child.\n\n==============================================================================\nPART 3 -- what to attach before you need it\n==============================================================================\n  run_name                   a readable span name instead of RunnableSequence\n  tags                       queryable: ['prod', 'v2', 'experiment-a']\n  metadata                   queryable: {'tenant': 'acme', 'user_tier': 'free'}\n  a request id in metadata   ties a trace to your own logs\n\n  none of it changes behaviour (2.9). all of it is the difference\n  between a trace you can query and one you can only read, and it\n  CANNOT be added retrospectively -- the traffic has already happened.",
        notes: [
          { t: "p", text: "**The callback events already carry the structure** \u2014 a tracer is just the thing that does not throw the nesting away. Depth up on start, depth down on end." },
          { t: "p", text: "**The model call was 51.5 ms of a 59.9 ms run, 86%**, and it is the deepest row. That is the usual shape in LLM applications, which is both reassuring and a trap: it is true often enough that people stop looking." },
          { t: "p", text: "**Self time is what localises a problem** \u2014 a span's duration minus its children. The root took 59.9 ms, which tells you only that something inside it was slow. The interesting incidents are the ones where the slow span is a retriever or a tool with a cold connection, and those only surface if you are reading self time rather than assuming the model." },
          { t: "p", text: "**A run name makes a span readable; tags and metadata make a trace queryable.** The second is what matters at volume, because the first question in an incident is whether the problem is general \u2014 and that is a query, not a read." },
          { t: "p", text: "**None of it can be added retrospectively.** The moment you want to query by tenant is during an incident, and the traffic you need has already happened. One `with_config` per chain, no behaviour change, unrecoverable if skipped." },
          { t: "p", text: "**Put a request id in metadata.** The trace store and the application log are separate systems, and without a shared identifier, tying \u2018the user who complained at 14:32\u2019 to a run is manual and effectively impossible at volume." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the p95 nobody could attribute", body: [
      { t: "p", text: "An endpoint has a p95 three times its median. The model provider's dashboard shows stable latency. The application log records total request duration and nothing else, so every slow request looks like a slow request and there is nowhere further to look." },
      { t: "p", text: "A span tree would answer this in one trace, because the slow span would be visible by self time \u2014 and the likely answer is not the model. A retriever hitting a cold index, a tool opening a new connection, or a sub-chain that only runs on some inputs are all invisible in a total-duration metric and obvious in a tree." },
      { t: "p", text: "The uncomfortable part is that this cannot be fixed retrospectively. The traces for the slow requests either exist with enough structure to answer the question or they do not, and adding instrumentation now starts the clock from today. That is the argument for instrumenting before you have a problem, which is a hard argument to win and worth having early." }
    ] }
  ],
  takeaways: [
    "**A run is a tree, not a list**, and the callback events already carry the structure.",
    "**A tracer is a handler plus a depth counter** \u2014 depth up on start, down on end.",
    "**The model call was 86% of the measured run** (51.5 ms of 59.9), as the deepest span.",
    "**That is the usual shape and also a trap**, because it is true often enough that people stop looking.",
    "**Self time localises a problem**; a parent's total time only says it contains a slow child.",
    "**The interesting incidents are where the slow span is not the model** \u2014 a cold retriever, a tool opening a connection.",
    "**A `run_name` makes a span readable**; tags and metadata make a trace **queryable**.",
    "**Queryable is what matters at volume**, because the first incident question is whether the problem is general.",
    "**Put a request id in metadata** to tie traces to your own logs \u2014 the two are separate systems.",
    "**None of it can be added retrospectively**: when you need it, the traffic has already happened.",
    "**Which makes it a build-time checklist item**, not an operations one."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A root span took 59.9 ms. What does that tell you?",
      options: ["That the chain is too slow and needs optimising",
        "Only that something inside it was slow \u2014 self time is what localises the problem",
        "That the model call took 59.9 ms",
        "That overhead is 59.9 ms minus the model's time"],
      answer: 1,
      why: "A parent's total time includes all its children, so it identifies nothing. Self time \u2014 a span's duration minus the sum of its children \u2014 attributes time to the span that actually spent it. In the measured tree the model call was 51.5 ms of the 59.9, but the valuable cases are the ones where the slow span is a retriever or a tool, which a total-duration view cannot distinguish." },
    { stem: "Why is a run_name less valuable than tags and metadata at scale?",
      options: ["Run names are truncated in most trace backends",
        "A name makes one span readable; tags and metadata make the whole trace queryable",
        "Run names are not propagated to child spans",
        "Tags are indexed and names are not, in every backend"],
      answer: 1,
      why: "Reading helps one person debugging one run; querying is what lets you ask whether a problem is general, which is almost always the first question in an incident. Both cost one method call, but only the queryable half degrades as traffic grows \u2014 a readable span is equally readable at any volume, while finding the relevant spans among millions requires a filter." },
    { stem: "Why must trace attributes be attached at build time?",
      options: ["Because LangChain validates them at construction",
        "Because when you need to query by tenant it is during an incident, and that traffic has already happened",
        "Because attaching them at runtime adds latency",
        "Because the trace backend rejects late-bound metadata"],
      answer: 1,
      why: "Tags and metadata describe runs as they occur, so they only exist on traffic that was instrumented when it ran. Adding them during an incident starts the clock from that moment and does nothing for the requests you are trying to explain. That asymmetry \u2014 free to add early, impossible to add late \u2014 is what makes it a build checklist item rather than an operations one." },
    { stem: "An endpoint's p95 is three times its median and the provider reports stable latency. What is missing?",
      options: ["A faster model tier",
        "A span tree \u2014 the slow span is visible by self time and is probably not the model",
        "More aggressive caching",
        "A higher rate limit"],
      answer: 1,
      why: "A total-duration metric makes every slow request look identical, with nowhere further to look. A tree shows which span spent the time, and when the provider is stable the answer is usually elsewhere \u2014 a cold retriever index, a tool opening a connection, a sub-chain that only runs for some inputs. The hard part is that this cannot be answered retrospectively if the traces lack the structure." }
  ] },
  interview: { title: "Interview practice", sub: "Tracing", questions: [
    { level: "core", q: "What does a trace give you that a log does not?",
      strong: "A strong answer is about structure and self time.",
      answer: [
        { t: "p", text: "Structure. A run is a tree, not a list, and a flat log of 'chain started' lines throws away exactly the information you need. The callback events already carry the nesting \u2014 a tracer is just the thing that does not discard it." },
        { t: "p", text: "What that buys you is self time: a span's duration minus the sum of its children. That is what localises a problem, because it attributes time to the span that actually spent it. A parent's total time tells you only that something inside it was slow." },
        { t: "p", text: "In the tree I built, the model call was 51.5 milliseconds of a 59.9 millisecond run \u2014 86 per cent \u2014 and it was the deepest row. That is the usual shape in LLM applications." },
        { t: "p", text: "Which is also the trap. It is true often enough that people stop looking, and the interesting incidents are the ones where it is not true \u2014 a retriever hitting a cold index, a tool opening a new connection. Those are invisible in a total-duration metric and obvious in a tree." }
      ] },
    { level: "advanced", q: "What would you attach to every run, and when?",
      strong: "A strong answer insists on build time and explains the asymmetry.",
      answer: [
        { t: "p", text: "A run name on every meaningful sub-chain, tags for the environment and deployment version, and metadata carrying the tenant and a request id. All of it at build time, while writing the chain." },
        { t: "p", text: "The distinction I would draw is readable versus queryable. A run name means you are not staring at forty rows called RunnableSequence matching step indices by hand. Tags and metadata mean you can ask for the failures belonging to one tenant, one version, one experiment arm \u2014 and that second capability is what matters at volume, because the first question in any incident is whether the problem is general." },
        { t: "p", text: "The request id is the one teams miss. The trace store and the application log are two separate systems, so without a shared identifier, correlating the user who complained at half past two with a specific run is manual and effectively impossible at scale." },
        { t: "p", text: "And the reason it has to be build time is the asymmetry: none of it can be added retrospectively. When you want to query by tenant, the traffic you need to query has already happened. It costs one with_config per chain, changes no behaviour, and is unrecoverable if skipped \u2014 which makes it one of the cheapest items on a production checklist and one of the most commonly deferred." }
      ] },
    { level: "advanced", q: "p95 is three times p50 and the provider looks healthy. How do you investigate?",
      strong: "A strong answer goes to self time and admits the retrospective limit.",
      answer: [
        { t: "p", text: "Pull traces for the slow requests and look at self time per span. If the provider is stable, my prior is that the slow span is not the model \u2014 which a total-duration metric cannot distinguish, because every slow request looks like a slow request." },
        { t: "p", text: "The candidates I would expect are a retriever hitting a cold index, a tool opening a new connection on the first request after an idle period, or a sub-chain that only executes for some inputs and is therefore absent from the median path entirely. All three are invisible without structure and obvious with it." },
        { t: "p", text: "The uncomfortable part of this answer is that it may not be possible. If the traces do not have the structure, adding instrumentation now starts the clock from today and does nothing for the requests I am being asked to explain. I would say that plainly rather than pretend otherwise." },
        { t: "p", text: "So the recommendation that comes out of the incident is usually the same one: instrument before there is a problem. That is a hard argument to win in advance, which is why having the concrete example \u2014 this incident, unanswerable for want of a span tree \u2014 is worth more than the general principle." }
      ] }
  ] }
});

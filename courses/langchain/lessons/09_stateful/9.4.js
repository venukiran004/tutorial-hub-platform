EC.receiveLesson({
  id: "9.4",
  lede: "A two-node graph run once wrote **four checkpoints** \u2014 one per superstep, plus the input \u2014 and each one carries a `next` field, which is what makes a checkpoint a **program counter** rather than just data. The cost is 8.4's warning with a number on it: the same graph with an 8 KB blob in its state wrote **24,062 bytes** for one two-node run, because the blob was serialised four times despite never being read or modified. And the mistake the API invites is quiet: a `thread_id` passed to a graph compiled **without** a checkpointer is accepted and ignored, so a graph that looks conversational remembers nothing and nothing reports the gap.",
  objectives: [
    "Determine what a checkpointer writes and when",
    "Explain why a checkpoint is a program counter",
    "Quantify the serialisation cost of a large state key",
    "Say what survives a restart for each saver",
    "Recognise the missing-checkpointer failure"
  ],
  prerequisites: ["8.6", "8.4"],
  blocks: [
    { t: "h2", n: "01", id: "when", text: "One checkpoint per superstep", sub: "Not one per run" },
    { t: "code", lang: "text", title: "A two-node graph, run once",
      code: "final state: {'n': 20, 'trace': ['a', 'b']}\ncheckpoints written: 4\n\nnewest first:\n  step=2   next=()               values={'n': 20, 'trace': ['a', 'b']}\n  step=1   next=('b',)           values={'n': 2,  'trace': ['a']}\n  step=0   next=('a',)           values={'n': 1,  'trace': []}\n  step=-1  next=('__start__',)   values={'trace': []}",
      caption: "Each records the state **after** that step and what would run next." },
    { t: "callout", kind: "insight", title: "A checkpoint is a program counter", body: [
      { t: "p", text: "The `next` field is what makes resumption possible. A checkpoint is not a snapshot of data \u2014 it is a snapshot of data **plus the position in the graph**, which is why 9.7 can pause mid-run and 9.9 can fork from an earlier step." },
      { t: "p", text: "Note the `step=-1` entry: the input state before any node ran. So a two-node graph produces four checkpoints, not two, and the count is supersteps plus the input plus the terminal state." }
    ] },
    { t: "h2", n: "02", id: "cost", text: "The serialisation cost", sub: "8.4's warning, quantified" },
    { t: "code", lang: "text", title: "The same graph, with an 8 KB blob in the state",
      code: "without the blob:\n  bytes per checkpoint: [30, 24, 21, 13]\n  total for one 2-node run: 88 bytes\n\nwith an 8 KB blob:\n  bytes per checkpoint: [8020, 8020, 8020, 2]\n  total: 24062 bytes for a 2-node run",
      caption: "The blob was never read or modified, and was written **four times**." },
    { t: "callout", kind: "warn", title: "An output schema does not help", body: [
      { t: "p", text: "8.4 made this point and this is the measurement: the **internal** schema is what gets persisted, so filtering the blob out of the result changes nothing about the 24 KB. The output schema controls what the caller sees." },
      { t: "p", text: "So anything large belongs outside the state \u2014 written to storage with a reference kept in the state. The fix is a different kind of change from tidying the public surface, and conflating the two gets you a clean API over an expensive graph." }
    ] },
    { t: "h2", n: "03", id: "resume", text: "Resuming", sub: "And how memory actually happens" },
    { t: "p", text: "Invoking the same `thread_id` again continues from the persisted state. The important detail is what happens to an accumulating key: the reducer appends to the **persisted** list, so the second run's history includes the first." },
    { t: "callout", kind: "mental", title: "That is the entire mechanism of conversational memory", body: [
      { t: "p", text: "There is no separate memory feature. Memory is a checkpointer plus a reducer: the state comes back, the reducer appends to it, and the model's next call sees the whole history." },
      { t: "p", text: "Which also means a thread accumulates **unboundedly** if nothing trims it \u2014 9.5 measures that, and it is the direct consequence of the same two mechanisms that make memory work at all." }
    ] },
    { t: "h2", n: "04", id: "survives", text: "What survives a restart", sub: "Measured for one row, documented for the others" },
    { t: "code", lang: "text", title: "A new InMemorySaver asked for an existing thread",
      code: "a NEW InMemorySaver asked for thread 't1': values={}\ncheckpoints: 0",
      caption: "The same `thread_id` against a new saver is a new conversation." },
    { t: "p", text: "Which is exactly what a process restart looks like. `InMemorySaver` holds checkpoints in a Python dict, so a redeploy, a crash or a second worker process all produce that empty result \u2014 and the code is unchanged, so nothing indicates a problem." },
    { t: "table", head: ["saver", "survives restart", "survives redeploy", "concurrent readers"], rows: [
      ["`InMemorySaver`", "**no**", "**no**", "one process"],
      ["`SqliteSaver`", "yes", "yes (same disk)", "one machine"],
      ["`PostgresSaver`", "yes", "yes", "many"]
    ] },
    { t: "callout", kind: "note", title: "What this environment measured", body: [
      { t: "p", text: "`langgraph.checkpoint.sqlite` and `.postgres` are separate packages and are **not installed here**, so rows two and three are the documented behaviour rather than something this script verified." },
      { t: "p", text: "What *is* measured is row one \u2014 and that is the row people deploy by accident, because `InMemorySaver` is what every tutorial uses and it works perfectly in a single-process test." }
    ] },
    { t: "h2", n: "05", id: "mistake", text: "The mistake the default invites", sub: "Accepted and ignored" },
    { t: "code", lang: "text", title: "A thread_id with no checkpointer",
      code: "invoke with a thread_id but NO checkpointer:\n  accepted -> {'n': 20, 'trace': ['a', 'b']}",
      caption: "No error. No persistence. No signal." },
    { t: "callout", kind: "trap", title: "The same shape as 8.2's silently dropped key", body: [
      { t: "p", text: "`compile()` without a checkpointer gives a graph with no persistence, and passing a `thread_id` to it is accepted and ignored. So you get a graph that looks conversational, is handed a thread id by its caller, and remembers nothing." },
      { t: "p", text: "The configuration is accepted, the behaviour is absent, and nothing reports the gap \u2014 which is 8.2's pattern exactly. And it hides the multi-user bugs in 9.5 during testing, because a system that remembers nothing cannot leak anything." }
    ] },
    { t: "diagram", kind: "cells", title: "A two-node run wrote four checkpoints",
      caption: "One per superstep, plus the input. Each carries a `next` field, which is what makes a checkpoint a **program counter** rather than just data — and the cost is 8.4's warning with a storage bill attached, because each one holds the whole state.",
      items: ["input", "after a", "after b", "done"],
      highlight: [0, 3], tone: "accent", negative: false,
      label: "next = ('a',) · ('b',) · () — the program counter" },
    { t: "exercise", kind: "build", title: "Find out what a checkpointer writes",
      difficulty: "core", minutes: 32,
      body: "Run a two-node graph with a checkpointer and list the full checkpoint history, reporting the step, the next field and the values of each. Say what makes resumption possible. Then put a large blob in the state, measure the bytes written per checkpoint, and compare the total against the same graph without it. Resume a thread and explain what happens to an accumulating key. Finally ask a fresh saver for an existing thread, and try passing a thread_id to a graph with no checkpointer.",
      requirements: ["List the full checkpoint history with step, next and values",
        "Report how many checkpoints a two-node run produces and why",
        "Explain what the next field makes possible",
        "Measure bytes per checkpoint with and without a large state key",
        "Explain why an output schema does not reduce that cost",
        "Resume a thread and explain what happens to an accumulating key",
        "Ask a fresh saver for an existing thread and report the result",
        "Pass a thread_id to a graph with no checkpointer and report what happens"],
      hint: "Count the checkpoints before guessing. A two-node graph does not write two.",
      solution: { lang: "python", title: "x0904.py \u2014 4 checkpoints, and 24 KB for an 8 KB blob",
        code: 'saver = InMemorySaver()\napp = g.compile(checkpointer=saver)\ncfg = {"configurable": {"thread_id": "t1"}}\napp.invoke({"n": 1, "trace": []}, cfg)\n\nhist = list(app.get_state_history(cfg))\nprint("checkpoints written:", len(hist))\nfor h in hist:\n    print("step=%-3s next=%-12s values=%r"\n          % (h.metadata.get("step"), str(h.next), h.values))\n\n# the cost of a large key, measured\nsizes = [len(json.dumps(h.values, default=str)) for h in hist]\nprint("bytes per checkpoint:", sizes, "total:", sum(sizes))\n\n# and the mistake: a thread_id with no checkpointer\nnosave = g.compile()\nnosave.invoke({"n": 1, "trace": []}, {"configurable": {"thread_id": "t9"}})',
        out: "==============================================================================\nPART 1 -- what a checkpointer writes, and when\n==============================================================================\n  a two-node graph, run once with a checkpointer:\n    final state: {'n': 20, 'trace': ['a', 'b']}\n\n  checkpoints written: 4\n\n  newest first:\n    step=2   next=()           values={'n': 20, 'trace': ['a', 'b']}\n    step=1   next=('b',)       values={'n': 2, 'trace': ['a']}\n    step=0   next=('a',)       values={'n': 1, 'trace': []}\n    step=-1  next=('__start__',) values={'trace': []}\n\n  so it writes one checkpoint PER SUPERSTEP, not one per run. each\n  records the state AFTER that step and what would run next.\n\n  that `next` field is what makes resumption possible: a checkpoint\n  is not just data, it is a program counter.\n==============================================================================\nPART 2 -- the state is the whole state, every step\n==============================================================================\n  8.4's warning, made concrete. every key in the internal schema is\n  serialised on every superstep:\n\n    bytes per checkpoint: [30, 24, 21, 13]\n    total for one 2-node run: 88 bytes\n\n  the same graph with an 8 KB blob in the state:\n    bytes per checkpoint: [8020, 8020, 8020, 2]\n    total: 24062 bytes for a 2-node run\n\n  the blob was never read or modified by any node and it was written\n  4 times. that is 8.4's point with a number on it: an output schema\n  does not help, because the INTERNAL schema is what gets persisted.\n==============================================================================\nPART 3 -- resuming -- the state comes back\n==============================================================================\n  thread t3 after one run: {'n': 60, 'trace': ['a', 'b']}\n\n  invoking the SAME thread again continues from that state:\n    {'n': 1010, 'trace': ['a', 'b', 'second call', 'a', 'b']}\n\n  note what happened to trace -- the reducer appended to the\n  PERSISTED list, so the second run's history includes the first.\n  that is the mechanism behind conversational memory (9.5), and it\n  is also how a thread accumulates unboundedly if nothing trims it.\n==============================================================================\nPART 4 -- what survives a restart\n==============================================================================\n  InMemorySaver holds checkpoints in a Python dict. so:\n\n    a NEW InMemorySaver asked for thread 't1': values={}\n    checkpoints: 0\n\n  nothing. the same thread_id against a new saver is a new\n  conversation, which is exactly what a process restart looks like.\n\n  saver          survives restart   survives redeploy   concurrent readers\n  InMemorySaver  no                 no                  one process\n  SqliteSaver    yes                yes (same disk)     one machine\n  PostgresSaver  yes                yes                 many\n\n  NOT INSTALLED HERE: langgraph.checkpoint.sqlite and .postgres are\n  separate packages and are absent from this environment, so the\n  table above is the documented behaviour rather than something this\n  script measured. what IS measured is the first row -- and that is\n  the row people deploy by accident.\n==============================================================================\nPART 5 -- the mistake the default invites\n==============================================================================\n  compile() without a checkpointer gives you a graph with no\n  persistence, and it works perfectly in every test:\n\n    invoke with a thread_id but NO checkpointer: accepted -> {'n': 20, 'trace': ['a', 'b']}\n\n  so a thread_id is accepted and ignored. a graph that looks\n  conversational, is passed a thread id by its caller, and remembers\n  nothing -- with no error at any point.\n\n  which is the same shape as 8.2's silently dropped key: the\n  configuration is accepted, the behaviour is absent, and nothing\n  reports the gap.",
        notes: [
          { t: "p", text: "**A two-node run wrote four checkpoints** \u2014 one per superstep, plus the input state at `step=-1`." },
          { t: "p", text: "**Each carries a `next` field**, which is what makes a checkpoint a program counter rather than just data \u2014 and is why pausing (9.7) and forking (9.9) are possible." },
          { t: "p", text: "**The 8 KB blob cost 24,062 bytes for one two-node run**, serialised four times despite never being read or modified by any node." },
          { t: "p", text: "**An output schema does not help**: the internal schema is what gets persisted, so anything large belongs outside the state with a reference kept in its place." },
          { t: "p", text: "**Resuming a thread appends to the PERSISTED list**, so the second run's history includes the first \u2014 that is the entire mechanism of conversational memory." },
          { t: "p", text: "**Which is also why a thread accumulates unboundedly** if nothing trims it (9.5)." },
          { t: "p", text: "**A new `InMemorySaver` asked for an existing thread returns nothing** \u2014 which is exactly what a process restart, a redeploy or a second worker looks like." },
          { t: "p", text: "**A `thread_id` passed to a graph with no checkpointer is accepted and ignored** \u2014 8.2's shape again: the configuration is accepted, the behaviour is absent, nothing reports the gap." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the assistant that forgot on every deploy", body: [
      { t: "p", text: "A conversational assistant works in staging and loses every conversation in production whenever the service is redeployed \u2014 which is several times a day. Nobody can reproduce it locally." },
      { t: "p", text: "It uses `InMemorySaver`, which holds checkpoints in a Python dict belonging to the process. A redeploy is a new process, so every `thread_id` is a new conversation. Locally there is one long-lived process and one user, so the bug cannot appear." },
      { t: "p", text: "It is worse than it looks in a scaled deployment: with more than one worker, a user's second message may be routed to a process that never saw the first, so conversations break **without** a deploy, intermittently, in proportion to the worker count. The fix is a durable saver, and the generalisable check is to ask what the storage's lifetime is relative to the process \u2014 for `InMemorySaver` the answer is identical, which is the whole problem." }
    ] }
  ],
  takeaways: [
    "**A two-node run wrote four checkpoints** \u2014 one per superstep, plus the input at `step=-1`.",
    "**Each carries a `next` field**, making a checkpoint a program counter rather than just data.",
    "**Which is what lets 9.7 pause mid-run and 9.9 fork from an earlier step.**",
    "**An 8 KB blob cost 24,062 bytes for one two-node run**, serialised four times.",
    "**Despite never being read or modified by any node.**",
    "**An output schema does not reduce that** \u2014 the internal schema is what gets persisted.",
    "**So anything large belongs outside the state**, with a reference kept in its place.",
    "**Resuming appends to the persisted list** \u2014 the entire mechanism of conversational memory.",
    "**Which is also why a thread accumulates unboundedly** without trimming.",
    "**A new `InMemorySaver` asked for an existing thread returns nothing.**",
    "**Which is what a restart, a redeploy or a second worker looks like.**",
    "**`InMemorySaver` survives neither; Sqlite survives a restart; Postgres supports many readers.**",
    "**A `thread_id` with no checkpointer is accepted and ignored** \u2014 8.2's shape again.",
    "**Ask what the storage's lifetime is relative to the process.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "How many checkpoints does a two-node graph write in one run, and why?",
      options: ["Two \u2014 one per node",
        "Four \u2014 one per superstep plus the input state before any node ran",
        "One \u2014 the final state",
        "Three \u2014 one per node plus the final state"],
      answer: 1,
      why: "The measured history contains steps \u22121, 0, 1 and 2: the input state, then one per superstep including the terminal one. Each entry also records a next field naming what would run next, which is what makes a checkpoint a resumable position rather than a data snapshot \u2014 and what pausing and forking are built on." },
    { stem: "An 8 KB blob in the state cost 24,062 bytes for a two-node run. Why does an output schema not fix it?",
      options: ["Output schemas are applied after serialisation",
        "The internal schema is what gets persisted \u2014 the output schema only filters what the caller sees",
        "Checkpointers ignore schema declarations",
        "The blob would still be written once"],
      answer: 1,
      why: "Persistence writes the working state each superstep, so the blob is serialised on every step regardless of how tidy the returned result is. The remedy is a different kind of change: keep the blob out of the state entirely, write it to storage, and hold a reference. Tidying the public surface and reducing the checkpoint cost are separate problems." },
    { stem: "Passing a thread_id to a graph compiled without a checkpointer does what?",
      options: ["Raises a ValueError about missing persistence",
        "Is accepted and ignored \u2014 no error, no persistence, no signal",
        "Creates an in-memory checkpointer automatically",
        "Persists only the final state"],
      answer: 1,
      why: "The configuration is accepted and the behaviour is simply absent, which is the same shape as a node returning a key not in the schema. The result is a graph that looks conversational, receives a thread id from its caller, and remembers nothing \u2014 and because it cannot remember, it also cannot leak, which hides multi-user bugs during testing." },
    { stem: "An assistant loses conversations on every redeploy but works locally. What is the likely cause?",
      options: ["The thread_id is regenerated per deploy",
        "InMemorySaver stores checkpoints in a process-local dict, so a new process is a new set of conversations",
        "Checkpoints expire after a fixed TTL",
        "The state schema changed between versions"],
      answer: 1,
      why: "The saver's storage lifetime is identical to the process lifetime, so every redeploy discards everything. Locally there is one long-lived process and one user, so it cannot reproduce. In a multi-worker deployment it is worse: a user's second message may reach a process that never saw the first, breaking conversations intermittently without any deploy at all." }
  ] },
  interview: { title: "Interview practice", sub: "Checkpointing", questions: [
    { level: "core", q: "What does a LangGraph checkpointer actually store?",
      strong: "A strong answer says per superstep and names the program counter.",
      answer: [
        { t: "p", text: "The whole state plus the position in the graph, once per superstep." },
        { t: "p", text: "I measured a two-node graph writing four checkpoints: the input state before anything ran, then one after each superstep. Each entry records the values and a next field naming what would execute next." },
        { t: "p", text: "That next field is the part people miss. A checkpoint is not a data snapshot, it is a program counter \u2014 which is why you can pause a run mid-node and resume it in a different process, and why you can fork from an earlier step and replay." },
        { t: "p", text: "The cost follows from the per-superstep part. The whole internal state is serialised each time, so I measured an 8 KB blob in the schema costing 24 KB for a single two-node run \u2014 four writes of something no node ever read. For anything large I would keep a reference in the state and the bytes in object storage." }
      ] },
    { level: "advanced", q: "Which checkpointer would you deploy, and what goes wrong with the wrong one?",
      strong: "A strong answer connects storage lifetime to process lifetime.",
      answer: [
        { t: "p", text: "Postgres for anything with more than one worker, Sqlite for a single-machine deployment, and InMemorySaver only for tests \u2014 and the question I would ask is what the storage's lifetime is relative to the process." },
        { t: "p", text: "For InMemorySaver those lifetimes are identical, which is the whole problem. I checked it directly: a fresh saver asked for an existing thread id returns nothing, no error, empty values. That is exactly what a redeploy looks like." },
        { t: "p", text: "The failure is nastier than losing conversations on deploy. With several workers, a user's second message may be routed to a process that never saw the first \u2014 so conversations break intermittently, in proportion to the worker count, with no deploy involved. And it cannot reproduce locally, because locally there is one process and one user." },
        { t: "p", text: "The related trap is that a graph compiled without any checkpointer accepts a thread_id and ignores it. No error, no persistence. So you can have a system that looks conversational, is handed thread ids by its caller, and remembers nothing \u2014 and because it cannot remember, it also cannot leak, so it hides the multi-tenant bugs you would otherwise have caught in testing." }
      ] },
    { level: "core", q: "How would you decide whether a graph needs a checkpointer at all?",
      strong: "A strong answer names the four capabilities it unlocks.",
      answer: [
        { t: "p", text: "By asking whether I need any of four things, because persistence is the precondition for all of them." },
        { t: "p", text: "Multi-turn conversation \u2014 memory is a checkpointer plus a reducer, with no separate feature. Pausing for a human, because interrupt() needs somewhere to store the paused state and refuses without one. Recovery, so a run that failed at step 7 of 9 resumes rather than repeating six model calls. And time travel for debugging and counterfactuals." },
        { t: "p", text: "If a graph is a single-shot computation with none of those \u2014 a classification, a retrieval pipeline \u2014 then a checkpointer is pure cost, and the cost is real: a checkpoint per superstep, each holding the whole internal state." },
        { t: "p", text: "The thing I would watch for is the half-configured case. A thread_id passed to a graph compiled without a checkpointer is accepted and ignored \u2014 no error, no persistence. So you can have something that looks conversational, receives thread ids from its caller, and remembers nothing." },
        { t: "p", text: "And because it cannot remember, it also cannot leak, which means it hides the multi-tenant scoping bugs you would otherwise catch in testing. That makes it worth asserting at startup that a conversational graph actually has a checkpointer attached." }
      ] }
  ] }
});

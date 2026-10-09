EC.receiveLesson({
  id: "10.8",
  lede: "The functional API writes the control flow as ordinary Python \u2014 `@task` for the steps, `@entrypoint` for the whole \u2014 with no schema, no nodes and no edges. The headline benefit is that a task's result is **checkpointed**, so a completed task is replayed rather than recomputed. And the measurement puts a sharp condition on that: resuming with `invoke(None, cfg)` ran the earlier task **once** across both calls, while re-invoking with input on the same thread ran it **twice**. So the replay guarantee is a property of **how you call it**, not of `@task` alone \u2014 the same `invoke(None)` against `invoke(input)` distinction as 9.8's static breakpoint, and an easy mistake because both calls succeed.",
  objectives: [
    "Write a pipeline with @task and @entrypoint",
    "Show that a completed task is replayed on resume",
    "Show that re-invoking with input does not replay",
    "State how the side-effect rule differs from the graph API",
    "Say what the functional API gives up"
  ],
  prerequisites: ["9.7", "9.9"],
  blocks: [
    { t: "h2", n: "01", id: "same", text: "The same work, as functions", sub: "No schema, no nodes, no edges" },
    { t: "code", lang: "python", title: "@task and @entrypoint",
      code: '@task\ndef double(n: int) -> int:\n    return n * 2\n\n@task\ndef add_ten(n: int) -> int:\n    return n + 10\n\n@entrypoint(checkpointer=InMemorySaver())\ndef pipeline(n: int) -> int:\n    a = double(n).result()\n    b = add_ten(a).result()\n    return b',
      out: "    pipeline.invoke(5, cfg) -> 20",
      caption: "The control flow is the Python." },
    { t: "h2", n: "02", id: "replay", text: "A completed task is replayed", sub: "On resume" },
    { t: "code", lang: "text", title: "step_b fails, then the thread is resumed",
      code: "first invoke, step_b fails: RAISED RuntimeError: fail once\n  step_a ran 1 time(s), step_b ran 1 time(s)\n\nRESUMING with invoke(None, cfg): -> 20\n  step_a ran 1 time(s), step_b ran 2 time(s)",
      caption: "`step_a` ran **once** across both calls." },
    { t: "p", text: "Its result was replayed from the checkpoint rather than recomputed, and only the failed task re-ran. Which is a sharper guarantee than the graph API offers \u2014 there, 9.7, 9.9 and 10.4 all measured a resumed, forked or retried **node** re-executing from the top." },
    { t: "h2", n: "03", id: "callform", text: "And the call form decides it", sub: "invoke(None) against invoke(input)" },
    { t: "code", lang: "text", title: "The same failure, second call passes input again",
      code: "step_a ran 2 time(s), step_b ran 2 time(s)",
      caption: "`step_a` ran **twice**." },
    { t: "callout", kind: "trap", title: "Passing input starts a new run; passing None resumes", body: [
      { t: "p", text: "So the replay guarantee is a property of how you call it, not of `@task` alone. That is exactly 9.8's distinction for static breakpoints \u2014 `invoke(None)` continues, `invoke(input)` begins." },
      { t: "p", text: "And it is an easy mistake because **both calls succeed**. Only the second quietly does the work twice, so if a task has a side effect the two forms differ by whether it happens again \u2014 with no error either way." }
    ] },
    { t: "h2", n: "04", id: "sideeffects", text: "So the side-effect rule is different", sub: "And this is the reason to reach for it" },
    { t: "table", head: ["", "unit of replay", "side effects on resume"], rows: [
      ["graph API", "the **node**, from the top", "happen again (9.7, 9.9, 10.4)"],
      ["functional", "the **task**, from its checkpoint", "do **not** happen again"]
    ] },
    { t: "callout", kind: "good", title: "@task is the natural unit for \u201cdo this exactly once\u201d", body: [
      { t: "p", text: "Wrap the effectful call in a task and a resume will not repeat it. That is a genuinely sharper guarantee than the graph API offers, and the reason to reach for the functional API when exactly-once matters \u2014 9.9's replayed payment is the failure it prevents." },
      { t: "p", text: "Two conditions. The resume has to be `invoke(None)`, per the section above. And the result must be **serialisable**, because that is what gets checkpointed \u2014 a task returning a database connection or an open file handle is not a task." }
    ] },
    { t: "h2", n: "05", id: "giveup", text: "What you give up", sub: "The structure was the tooling" },
    { t: "p", text: "8.6 established that a graph's structure is **data**, and that is what the tooling reads. With the functional API there is no structure to read:" },
    { t: "ul", items: [
      "**draw the graph** (8.9) \u2014 there is no graph to draw",
      "**`interrupt_before` on a node name** (9.8) \u2014 there are no nodes",
      "**inspect which node produced which update** (10.3's `updates` mode) \u2014 it is a call stack",
      "a conditional edge is an `if` statement, so **routing is not inspectable** without reading the code"
    ] },
    { t: "p", text: "`interrupt()` still works, because that is a function call rather than a structural feature \u2014 which is consistent with 9.7's framing of it as a call that spans a restart." },
    { t: "h2", n: "06", id: "choose", text: "Choosing", sub: "A legibility decision, not a capability one" },
    { t: "table", head: ["functional when", "graph when"], rows: [
      ["the control flow is sequential or simply branching", "the topology matters and should be inspectable"],
      ["you want exactly-once semantics per step", "you need static breakpoints on named nodes"],
      ["the team reads Python more readily than a graph definition", "the shape **is** the design, as in an agent loop"]
    ] },
    { t: "callout", kind: "mental", title: "Two APIs over one runtime", body: [
      { t: "p", text: "These are two front ends to the same Pregel runtime, so this is a legibility and tooling decision rather than a capability one. The question is whether the structure is worth declaring." },
      { t: "p", text: "For an agent loop it clearly is \u2014 the two-nodes-and-a-cycle shape is the design, and 9.1 showed every production requirement attaching to a specific node or edge. For a five-step sequential pipeline with one retryable external call, declaring a schema and four edges to express what `a(); b(); c()` already says is ceremony." }
    ] },
    { t: "diagram", kind: "matrix", title: "The call form decides whether you replay",
      caption: "My own expectation was wrong here. `invoke(input, cfg)` starts a **new run** on the same thread — the step counter reached 2. Only `invoke(None, cfg)` replays from the checkpoint, where completed tasks are returned from cache rather than re-executed.",
      cols: ["what it does", "step_a ran"],
      rows: ["invoke(input, cfg)", "invoke(None, cfg)"],
      cells: [
        [{ text: "starts a NEW run", tone: "crit" }, { text: "twice", tone: "crit" }],
        [{ text: "replays from the checkpoint", tone: "good" }, { text: "once — cached", tone: "good" }]
      ] },
    { t: "exercise", kind: "build", title: "Write a pipeline both ways",
      difficulty: "advanced", minutes: 30,
      body: "Write a two-step pipeline with @task and @entrypoint and run it. Then make the second task fail once, resume the thread with invoke(None), and count how many times each task executed. Repeat with the second call passing input instead, and compare. State how the side-effect rule differs from the graph API and what conditions the guarantee has. Finally list what the functional API gives up and say when each API is the right choice.",
      requirements: ["Write a pipeline with @task and @entrypoint and run it",
        "Make a task fail, resume with invoke(None), and count the executions",
        "Repeat passing input and compare the counts",
        "Explain why the call form decides the replay guarantee",
        "State how the side-effect rule differs from the graph API",
        "Name the two conditions on the exactly-once guarantee",
        "List at least three things the functional API gives up",
        "Say when each API is the right choice"],
      hint: "Count the executions of the task BEFORE the failure, and try both resume forms. The two numbers differ.",
      solution: { lang: "python", title: "x1008.py \u2014 invoke(None) replays, invoke(input) does not",
        code: 'from langgraph.func import entrypoint, task\n\n@task\ndef step_a(n: int) -> int:\n    calls["a"] += 1\n    return n + 1\n\n@entrypoint(checkpointer=InMemorySaver())\ndef flow(n: int) -> int:\n    a = step_a(n).result()\n    return step_b(a).result()\n\ncfg = {"configurable": {"thread_id": "f2"}}\nflow.invoke(1, cfg)        # step_b fails\nflow.invoke(None, cfg)     # RESUME -> step_a replayed, ran once total\n\n# against:\nflow2.invoke(1, c2)        # fails\nflow2.invoke(1, c2)        # NEW RUN -> step_a ran twice',
        out: "==============================================================================\nPART 1 -- the same work, as functions\n==============================================================================\n  the graph API is explicit about structure. the functional API\n  lets you write the control flow as ordinary Python:\n\n    @task def double(n): return n * 2\n    @task def add_ten(n): return n + 10\n\n    @entrypoint(checkpointer=...)\n    def pipeline(n):\n        a = double(n).result()\n        b = add_ten(a).result()\n        return b\n\n    pipeline.invoke(5, cfg) -> 20\n\n  no schema, no nodes, no edges. the control flow is the Python.\n==============================================================================\nPART 2 -- what a @task buys -- and the call form that decides it\n==============================================================================\n  a task's result is CHECKPOINTED, so a completed task can be\n  REPLAYED rather than recomputed. but that only happens on a\n  RESUME, and the difference is in how you call it.\n\n  first invoke, step_b fails: RAISED RuntimeError: fail once\n    step_a ran 1 time(s), step_b ran 1 time(s)\n\n  RESUMING with invoke(None, cfg): -> 20\n    step_a ran 1 time(s), step_b ran 2 time(s)\n\n  step_a ran ONCE across both calls. its result was replayed from\n  the checkpoint and only the failed task re-ran.\n==============================================================================\nPART 3 -- and invoke(input) on the same thread does NOT replay\n==============================================================================\n  the same failure, but the second call passes INPUT again:\n    step_a ran 2 time(s), step_b ran 2 time(s)\n\n  step_a ran TWICE. passing input starts a NEW run on that thread;\n  passing None resumes the pending one.\n\n  so the replay guarantee is a property of HOW YOU CALL IT, not of\n  @task alone. that is the same distinction as 9.8's static\n  breakpoint -- invoke(None) continues, invoke(input) begins.\n\n  and it is an easy mistake to make, because both calls succeed and\n  only the second one quietly does the work twice. if a task has a\n  side effect, the two forms differ by whether it happens again.\n==============================================================================\nPART 4 -- so the side-effect rule is different from the graph API\n==============================================================================\n  graph API : a resumed or retried NODE re-runs from the top, so\n              anything before the failure point happens again\n              (9.7, 9.9, 10.4 all measured this)\n  functional: a completed TASK is replayed from its checkpoint on\n              resume, so its side effects do NOT happen again\n\n  that makes @task the natural unit for 'do this exactly once':\n  wrap the effectful call in a task and a resume will not repeat\n  it. which is a genuinely sharper guarantee than the graph API\n  offers, and the reason to reach for the functional API when\n  exactly-once matters.\n\n  two conditions, though. the resume has to be invoke(None), per\n  part 3. and the result must be SERIALISABLE, because that is what\n  gets checkpointed -- a task returning a database connection or an\n  open file handle is not a task.\n==============================================================================\nPART 4 -- what you give up\n==============================================================================\n  the graph API's structure is DATA (8.6), and that is what the\n  tooling reads:\n\n    - draw the graph (8.9) -- there is no graph to draw\n    - interrupt_before on a node name (9.8) -- there are no nodes\n    - inspect which node produced which update -- it is a call stack\n    - a conditional edge is an if statement, so routing is not\n      inspectable without reading the code\n\n  interrupt() still works, because that is a function call rather\n  than a structural feature.\n==============================================================================\nPART 5 -- choosing\n==============================================================================\n  functional when:\n    - the control flow is genuinely sequential or simply branching\n    - you want exactly-once semantics per step\n    - the team reads Python more readily than a graph definition\n\n  graph when:\n    - the topology matters and should be inspectable\n    - you need static breakpoints on named nodes\n    - the shape IS the design, as in an agent loop\n\n  and the honest note: these are two APIs over the same runtime, so\n  this is a legibility and tooling decision rather than a capability\n  one. the question is whether the structure is worth declaring.",
        notes: [
          { t: "p", text: "**`@task` and `@entrypoint` write the control flow as Python** \u2014 no schema, no nodes, no edges." },
          { t: "p", text: "**A completed task is replayed on resume**: `step_a` ran once across both calls, and only the failed task re-ran." },
          { t: "p", text: "**Which is sharper than the graph API**, where 9.7, 9.9 and 10.4 all measured a node re-executing from the top." },
          { t: "p", text: "**But the call form decides it**: `invoke(None, cfg)` resumes and replays, while `invoke(input, cfg)` starts a new run and ran `step_a` twice." },
          { t: "p", text: "**Same distinction as 9.8's static breakpoint** \u2014 and an easy mistake, because both calls succeed and only one does the work twice." },
          { t: "p", text: "**So `@task` is the natural unit for \u2018do this exactly once\u2019** \u2014 wrap the effectful call and a resume will not repeat it, which is 9.9's replayed payment prevented." },
          { t: "p", text: "**Two conditions**: the resume must be `invoke(None)`, and the result must be serialisable because that is what gets checkpointed." },
          { t: "p", text: "**What you give up is the structure**, which was the tooling: no drawing, no `interrupt_before` by node name, no per-node update inspection. `interrupt()` still works, being a function call." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the resume that ran the charge again", body: [
      { t: "p", text: "A team moves an order pipeline to the functional API specifically for exactly-once semantics, wrapping the payment call in a `@task`. A run fails at the notification step. The retry handler calls `flow.invoke(order, cfg)` with the original input, and the customer is charged twice." },
      { t: "p", text: "Passing input starts a new run on that thread rather than resuming the pending one, so no task was replayed \u2014 including the payment. The guarantee they moved for is real and it is conditional on the call form, and both forms return successfully." },
      { t: "p", text: "The fix is `invoke(None, cfg)` in the retry path. The habit worth adopting is to make the two call sites structurally distinct \u2014 a `start(order)` function and a `resume(thread_id)` function, so no caller is choosing between two arguments to the same call. That is the same lesson as 9.8's static breakpoint, where `invoke(None)` continues and `invoke(input)` begins: when a single function means two things depending on an argument, name them separately." }
    ] }
  ],
  takeaways: [
    "**`@task` and `@entrypoint` write the control flow as ordinary Python** \u2014 no schema, nodes or edges.",
    "**A completed task is replayed on resume**, not recomputed \u2014 `step_a` ran once across two calls.",
    "**Which is sharper than the graph API**, where a resumed node re-executes from the top.",
    "**But `invoke(input, cfg)` starts a NEW run** and ran the same task twice.",
    "**So the replay guarantee is a property of how you call it**, not of `@task` alone.",
    "**Same distinction as 9.8's static breakpoint**: `invoke(None)` continues, `invoke(input)` begins.",
    "**And both calls succeed**, so only one of them quietly does the work twice.",
    "**`@task` is the natural unit for \u2018do this exactly once\u2019.**",
    "**Two conditions**: the resume must be `invoke(None)`, and the result must be serialisable.",
    "**So a task returning a connection or a file handle is not a task.**",
    "**What you give up is the structure**, which was what the tooling read (8.6).",
    "**No drawing, no `interrupt_before` by node name, no per-node update inspection.**",
    "**`interrupt()` still works**, being a function call rather than a structural feature.",
    "**Two APIs over one runtime** \u2014 a legibility decision, not a capability one.",
    "**Make start and resume structurally distinct functions**, so no caller chooses between arguments."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A task completed, a later task failed, and the thread is resumed with invoke(None). What happens to the first task?",
      options: ["It re-executes, as a graph node would",
        "Its result is replayed from the checkpoint \u2014 it ran once across both calls",
        "It re-executes but its side effects are suppressed",
        "The whole entrypoint restarts from the beginning"],
      answer: 1,
      why: "A task's result is checkpointed, so on resume the completed task is not recomputed and only the failed one runs again. That is a sharper guarantee than the graph API gives, where resuming, forking or retrying all re-execute the node from its first statement \u2014 which is why @task is the natural unit for an operation that must happen exactly once." },
    { stem: "Why did the same pipeline run its first task twice in another test?",
      options: ["The checkpointer was not attached",
        "The second call passed input, which starts a new run on the thread rather than resuming the pending one",
        "The task's result was not serialisable",
        "The thread_id differed between calls"],
      answer: 1,
      why: "invoke(None, cfg) resumes and replays completed tasks; invoke(input, cfg) begins a fresh run. So the exactly-once guarantee depends on the call form as much as on the decorator. Both calls succeed, which is what makes it dangerous: only one of them repeats the work, with no error to indicate which." },
    { stem: "What does the functional API give up relative to the graph API?",
      options: ["Checkpointing and interrupts",
        "The structure \u2014 so no drawing, no interrupt_before by node name, and no per-node update inspection",
        "Retries and timeouts",
        "Access to the store and streaming"],
      answer: 1,
      why: "A graph's structure is data, and that data is what the tooling reads. Without nodes and edges there is nothing to draw, no node name for a static breakpoint to reference, and the execution is a call stack rather than a sequence of named contributions. interrupt() still works because it is a function call rather than a structural feature." },
    { stem: "A retry handler calls flow.invoke(order, cfg) after a failure and a payment is taken twice. What is the fix?",
      options: ["Make the payment task idempotent and leave the call unchanged",
        "Call invoke(None, cfg) to resume, and make start and resume separate named functions",
        "Attach a retry policy to the payment task",
        "Move the payment into the entrypoint rather than a task"],
      answer: 1,
      why: "Passing input started a new run, so nothing was replayed including the completed payment. invoke(None) resumes. The structural improvement is to expose start(order) and resume(thread_id) as distinct functions, so a caller is never choosing between two meanings of one call based on an argument \u2014 the same hazard as invoke(None) versus invoke(input) for static breakpoints." }
  ] },
  interview: { title: "Interview practice", sub: "The functional API", questions: [
    { level: "core", q: "When would you use the functional API over the graph API?",
      strong: "A strong answer leads with exactly-once and knows the trade.",
      answer: [
        { t: "p", text: "When I want exactly-once semantics per step, or when the control flow is genuinely sequential and declaring a graph would be ceremony." },
        { t: "p", text: "The exactly-once part is the real draw and it is a genuine difference. In the graph API, a resumed, forked or retried node re-executes from the top \u2014 I have measured that three separate ways, and it means anything before the failure point happens again. In the functional API the unit of replay is the task, and a completed task is replayed from its checkpoint rather than recomputed. So wrapping an effectful call in a task means a resume will not repeat it." },
        { t: "p", text: "What I would give up is the structure, and the structure is what the tooling reads. No graph to draw, no node names for static breakpoints, and the execution is a call stack rather than a sequence of named node contributions. interrupt() still works, since that is a function call rather than a structural feature." },
        { t: "p", text: "So for an agent loop I would stay with the graph API, because the two-nodes-and-a-cycle shape is the design and every production change attaches to a specific node or edge. For a five-step pipeline with one retryable external call, the functional API says what the code already says." }
      ] },
    { level: "advanced", q: "What is the catch with the functional API's replay guarantee?",
      strong: "A strong answer names the call form and makes it structural.",
      answer: [
        { t: "p", text: "It depends on how you call it, not just on the decorator \u2014 and both call forms succeed, so the difference is invisible unless you are counting executions." },
        { t: "p", text: "I measured it: with a task that completed and a later one that failed, resuming with invoke(None, cfg) ran the first task once across both calls. Re-invoking with the original input on the same thread ran it twice. Passing input starts a new run; passing None resumes the pending one." },
        { t: "p", text: "So a retry handler that re-submits the original request gets no replay at all \u2014 including for the payment task someone moved to this API specifically to protect. That is the failure, and nothing raises." },
        { t: "p", text: "The fix in the moment is invoke(None). The fix I would actually ship is to make the two call sites structurally distinct: a start(order) function and a resume(thread_id) function, so no caller is picking between two meanings of one call based on an argument." },
        { t: "p", text: "It is the same hazard as static breakpoints, where invoke(None) continues and invoke(input) begins. When one function means two things depending on an argument, I would rather give them two names than rely on everyone remembering." },
        { t: "p", text: "The other condition is that a task's result has to be serialisable, since that is what gets checkpointed \u2014 so a task returning a connection or an open handle is not a task." }
      ] },
    { level: "core", q: "Would you mix the graph and functional APIs in one system?",
      strong: "A strong answer picks per component rather than per codebase.",
      answer: [
        { t: "p", text: "Yes, per component rather than per codebase, since they are two front ends to the same runtime \u2014 so this is a legibility choice and not an architectural commitment." },
        { t: "p", text: "The agent loop stays a graph. The two-nodes-and-a-cycle shape is the design, every production requirement attaches to a specific node or edge, and I want the drawing and the node-named breakpoints." },
        { t: "p", text: "A sequential pipeline with an effectful step is where I would reach for the functional API \u2014 an ingestion job, an order workflow. The control flow is ordinary Python and I get the replay guarantee, where a completed task is not recomputed on resume. That is strictly better than the graph API's node-level replay for anything that must happen exactly once." },
        { t: "p", text: "What I would be careful about is the seam. Mixing them means two mental models in one repository, and someone reading the functional half will reach for the graph tooling \u2014 drawing it, setting interrupt_before \u2014 and find nothing there." },
        { t: "p", text: "So I would keep the boundary at a module level with a comment saying which API and why, rather than interleaving them. And I would make the start and resume paths separately named functions in the functional half, because invoke(None) versus invoke(input) silently decides whether anything replays." }
      ] }
  ] }
});

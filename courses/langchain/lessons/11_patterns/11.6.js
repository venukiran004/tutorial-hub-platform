EC.receiveLesson({
  id: "11.6",
  lede: "Plan once, execute many: one planner call produced three steps, three worker calls executed them, **4 model calls total**. The difference from ReAct is in what the workers saw \u2014 each got **one step and nothing else**, so the prompt is small and constant rather than growing every turn. Which is the trade in both directions: a worker cannot adapt, because it does the step it was given whether or not that step still makes sense. The task's **predictability** decides, and the pattern needs a replan path with a budget \u2014 plus one state bug that only appears on that path, where `done` still holds the failed step's output so the plan's indices no longer line up.",
  objectives: [
    "Build a plan-and-execute graph and count its calls",
    "Show what a worker receives and why that matters",
    "Compare the trade against ReAct",
    "Add replanning with a budget",
    "Identify the state bug on the replan path"
  ],
  prerequisites: ["11.3", "10.2"],
  blocks: [
    { t: "h2", n: "01", id: "plan", text: "Plan once, execute many", sub: "Four model calls" },
    { t: "code", lang: "text", title: "The trace",
      code: "planned 3 steps\nstep 1: 'look up the refund window'\nstep 2: 'look up the payment destination'\nstep 3: 'write the answer'\n\nplanner calls: 1\nworker calls : 3\ntotal        : 4",
      caption: "One planning call, then one call per step." },
    { t: "h2", n: "02", id: "workers", text: "What the workers saw", sub: "One step, and nothing else" },
    { t: "code", lang: "text", title: "Each worker's input",
      code: "worker call 1: [HumanMessage('look up the refund window')]\nworker call 2: [HumanMessage('look up the payment destination')]\nworker call 3: [HumanMessage('write the answer')]",
      caption: "No history. The prompt is small and constant." },
    { t: "callout", kind: "insight", title: "That is the key difference from ReAct", body: [
      { t: "p", text: "11.3's ReAct carries a growing message list, so each turn's prompt includes every previous thought and result. Here each worker gets one step, so the prompt size does not grow with the task's length." },
      { t: "p", text: "And it cuts both ways: a worker **cannot adapt**. It does the step it was given, whether or not that step still makes sense after the previous one returned something unexpected. The commitment that makes the cost predictable is the same commitment that makes it rigid." }
    ] },
    { t: "h2", n: "03", id: "trade", text: "The trade against ReAct", sub: "Predictability decides" },
    { t: "table", head: ["", "ReAct", "plan-and-execute"], rows: [
      ["decides the sequence", "every turn", "once, up front"],
      ["prompt size", "grows every turn", "**constant per worker**"],
      ["commitment", "none \u2014 re-decides", "high \u2014 follows the plan"],
      ["adapts to results", "yes, immediately", "only on replan"],
      ["model calls", "2..N, unbounded", "**1 + len(plan)**"],
      ["cost predictable", "no", "**yes, after planning**"]
    ] },
    { t: "p", text: "So if the steps are knowable before starting, planning once is cheaper and more reliable. If the next step depends on what the last one returned, a plan is a guess that will be wrong \u2014 which is 11.1's sequence-against-choice test applied one level up." },
    { t: "h2", n: "04", id: "replan", text: "Replanning", sub: "Which is what makes it usable" },
    { t: "code", lang: "text", title: "A failed step triggers a new plan",
      code: "plan #1: ['step one', 'step two']\nexec -> 'FAILED: cannot do step one'\nplan #2: ['revised step', 'step two']\nexec -> 'ok'\nexec -> 'ok'\n\nreplans: 2",
      caption: "A plan made before seeing any results will sometimes be wrong." },
    { t: "callout", kind: "warn", title: "And the replan needs a budget", body: [
      { t: "p", text: "Without it, a task the planner cannot solve replans forever \u2014 which is 10.5's loop with no exit, now with a **planning call** per iteration on top of the wasted worker calls." },
      { t: "p", text: "So the router needs the same two guards: a replan budget, and ideally a progress check \u2014 because a planner that produces the same plan twice is not going to produce a different one on the third attempt." }
    ] },
    { t: "callout", kind: "trap", title: "The state bug that only appears on the replan path", body: [
      { t: "p", text: "On replan, `done` already contains the failed step's output. So the new plan's step indices no longer line up with `len(done)` unless you clear it \u2014 and the executor picks the wrong step." },
      { t: "p", text: "That is the kind of bug that passes every happy-path test, because the happy path never replans. It is also an argument for keeping the plan and the results in a single structure rather than two parallel lists whose alignment is implicit." }
    ] },
    { t: "h2", n: "05", id: "when", text: "When it is wrong", sub: "And where it genuinely wins" },
    { t: "table", head: ["wrong when", "right when"], rows: [
      ["the first step's result changes what the second should be", "the task decomposes predictably \u2014 a report with known sections"],
      ["the task is short \u2014 planning two steps is a model call to avoid a model call", "the steps are **independent**, so they can run in parallel (10.2's `Send`)"],
      ["the planner cannot know the tools well enough to write a feasible plan, so every run replans", "you want a plan a **human can approve** before execution (9.8)"]
    ] },
    { t: "callout", kind: "good", title: "The approval case is a genuine advantage", body: [
      { t: "p", text: "ReAct cannot offer it, because ReAct has no plan to show anyone \u2014 it decides the next action one turn at a time. A plan is an artefact, and 9.8's approval gate can pause on it." },
      { t: "p", text: "The parallelism case is the other real win: independent steps become a `Send` fan-out (10.2), so a five-step plan is one superstep rather than five. That is where plan-and-execute beats ReAct on latency rather than just on predictability." }
    ] },
    { t: "diagram", kind: "flow", title: "Plan once, execute many", cols: 4,
      caption: "One planner call produced three steps and three worker calls executed them — **4 model calls**. The difference from ReAct is what the workers **saw**: each got one step and nothing else, so their prompt is constant and 13.1's quadratic growth never reaches them.",
      nodes: [
        { id: "p", label: "planner", sub: "1 call — the whole plan", tone: "accent" },
        { id: "w", label: "worker", sub: "one step, NO history", tone: "good" },
        { id: "w2", label: "worker", sub: "constant prompt", tone: "good" },
        { id: "g", label: "gather", sub: "4 calls in total", tone: "violet" }
      ],
      edges: [["p", "w"], ["w", "w2"], ["w2", "g"]] },
    { t: "exercise", kind: "build", title: "Plan, execute, and replan",
      difficulty: "advanced", minutes: 34,
      body: "Build a plan-and-execute graph where a planner produces a list of steps and an executor runs them one at a time, and count the model calls. Report what each worker received and explain why that differs from ReAct. Compare the two patterns on sequence decisions, prompt size, commitment and predictability. Then add a replan path with a budget, and identify the state bug that only appears when replanning happens.",
      requirements: ["Build the plan-and-execute graph and count planner and worker calls",
        "Report what each worker received",
        "Explain why the prompt size is constant and what that costs",
        "Compare against ReAct on at least four dimensions",
        "Add a replan path with a budget and explain why the budget is needed",
        "Identify the state bug on the replan path",
        "Say when the pattern is wrong and where it genuinely wins"],
      hint: "Print what each worker was sent. The absence of history is the pattern's whole character, in both directions.",
      solution: { lang: "python", title: "x1106.py \u2014 4 calls, and the replan index bug",
        code: 'def plan(state):\n    out = planner.invoke([HumanMessage(content=state["task"])])\n    steps = [l.split(". ", 1)[1] for l in out.content.strip().split("\\n")]\n    return {"plan": steps, "trace": ["planned %d steps" % len(steps)]}\n\ndef execute(state):\n    i = len(state["done"])          # <- the replan-path bug lives here\n    out = worker.invoke([HumanMessage(content=state["plan"][i])])\n    return {"done": [out.content], ...}\n\ndef route2(state):\n    if state["done"] and state["done"][-1].startswith("FAILED"):\n        if state["replans"] >= 2:\n            return END\n        return "plan"\n    ...',
        out: "==============================================================================\nPART 1 -- plan once, execute many\n==============================================================================\n    planned 3 steps\n    step 1: 'look up the refund window'\n    step 2: 'look up the payment destination'\n    step 3: 'write the answer'\n\n  planner calls: 1\n  worker calls : 3\n  total        : 4\n==============================================================================\nPART 2 -- what the workers saw\n==============================================================================\n  worker call 1: [\"HumanMessage('look up the refund window')\"]\n  worker call 2: [\"HumanMessage('look up the payment destination')\"]\n  worker call 3: [\"HumanMessage('write the answer')\"]\n\n  each worker got ONE step and nothing else. that is the key\n  difference from ReAct: the worker has no history, so its prompt is\n  small and constant rather than growing with every turn (11.3).\n\n  which also means a worker cannot adapt. it does the step it was\n  given, whether or not that step still makes sense.\n==============================================================================\nPART 3 -- the trade against ReAct\n==============================================================================\n                        ReAct                plan-and-execute\n  decides the sequence  every turn           once, up front\n  prompt size           grows every turn     constant per worker\n  commitment            none -- re-decides   high -- follows plan\n  adapts to results     yes, immediately     only on replan\n  model calls           2..N, unbounded      1 + len(plan)\n  cost predictable      no                   yes, after planning\n\n  so the task's PREDICTABILITY decides. if the steps are knowable\n  before starting, planning once is cheaper and more reliable. if\n  the next step depends on what the last one returned, a plan is a\n  guess that will be wrong.\n==============================================================================\nPART 4 -- replanning, which is what makes it usable\n==============================================================================\n  a plan made before seeing any results will sometimes be wrong. so\n  the pattern needs a replan path:\n\n    plan #1: ['step one', 'step two']\n    exec -> 'FAILED: cannot do step one'\n    plan #2: ['revised step', 'step two']\n    exec -> 'ok'\n\n  replans: 2\n\n  and note the replan budget. without it, a task the planner cannot\n  solve replans forever -- which is 10.5's loop with no exit, now\n  with a planning call per iteration.\n\n  the subtle bug: on replan, 'done' already contains the failed\n  step's output. so the new plan's step indices no longer line up\n  with len(done) unless you clear it -- which is the kind of state\n  bug that only appears on the replan path.\n==============================================================================\nPART 5 -- when plan-and-execute is wrong\n==============================================================================\n  wrong when:\n    - the first step's result changes what the second step should be\n    - the task is short. planning overhead for two steps is a model\n      call to avoid a model call.\n    - the planner cannot know the tools' capabilities well enough to\n      write a feasible plan, so every run replans\n\n  right when:\n    - the task decomposes predictably (a report with known sections)\n    - the steps are independent, so they can run in parallel (10.2's\n      Send, which is where this pattern gets its real advantage)\n    - you want a plan a human can APPROVE before execution (9.8) --\n      which is a genuine advantage ReAct cannot offer, because ReAct\n      has no plan to show anyone.",
        notes: [
          { t: "p", text: "**One planner call plus three worker calls \u2014 4 total** for a three-step task." },
          { t: "p", text: "**Each worker received one step and nothing else**, so the prompt is small and constant rather than growing every turn as ReAct's does." },
          { t: "p", text: "**And a worker cannot adapt** \u2014 it does the step it was given whether or not that step still makes sense." },
          { t: "p", text: "**So the commitment that makes cost predictable is the same one that makes it rigid.**" },
          { t: "p", text: "**The trade is decided by the task's predictability**: knowable steps favour planning, dependent steps make a plan a guess." },
          { t: "p", text: "**Replanning is what makes it usable**, and it needs a budget \u2014 otherwise an unsolvable task replans forever, with a planning call per iteration." },
          { t: "p", text: "**The state bug on the replan path**: `done` still holds the failed step's output, so the new plan's indices no longer line up with `len(done)` unless it is cleared." },
          { t: "p", text: "**Which passes every happy-path test**, because the happy path never replans \u2014 an argument for one structure rather than two implicitly aligned lists." },
          { t: "p", text: "**The real wins are parallelism** (independent steps become a `Send` fan-out, 10.2) **and human approval of the plan** (9.8), which ReAct cannot offer because it has no plan." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the planner that replanned every time", body: [
      { t: "p", text: "A plan-and-execute agent is deployed for a data-analysis task. Every single run replans at least twice, so the cost is three planning calls plus the workers, and latency is worse than the ReAct version it replaced." },
      { t: "p", text: "The planner does not know what the tools can actually do, so its first plan always contains a step no tool supports. It is producing plausible-looking plans against an imagined toolset, discovering the mismatch at execution, and revising \u2014 which is ReAct's loop with an expensive planning call bolted to the front of each iteration." },
      { t: "p", text: "The diagnosis worth generalising is that **a pattern always taking its recovery path has chosen the wrong pattern.** Either give the planner the tools' actual capabilities and constraints in its prompt so the first plan is feasible, or accept that this task's steps are not knowable up front and use ReAct \u2014 which at least does not pay for a plan it will discard. Instrumenting the replan count is what makes this visible, and it is the same argument as recording which exit a loop took." }
    ] }
  ],
  takeaways: [
    "**One planner call plus one call per step** \u2014 4 total for a three-step task.",
    "**Each worker received one step and nothing else**, so the prompt is constant rather than growing.",
    "**And a worker cannot adapt** \u2014 it does the step it was given regardless.",
    "**The commitment that makes cost predictable is the same one that makes it rigid.**",
    "**ReAct decides every turn; plan-and-execute decides once.**",
    "**Model calls are 1 + len(plan)**, so cost is predictable after planning.",
    "**The task's predictability decides** \u2014 11.1's test, one level up.",
    "**Replanning is what makes it usable**, and it needs a budget.",
    "**Otherwise an unsolvable task replans forever**, with a planning call per iteration.",
    "**The replan-path bug**: `done` holds the failed output, so plan indices no longer align.",
    "**Which passes every happy-path test**, because the happy path never replans.",
    "**Wrong when the first result changes the second step, or the task is short.**",
    "**The real wins are parallelism** (`Send`, 10.2) **and human approval of the plan** (9.8).",
    "**ReAct cannot offer approval**, because it has no plan to show anyone.",
    "**A pattern always taking its recovery path has chosen the wrong pattern.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What did each worker in a plan-and-execute graph receive?",
      options: ["The full plan and the results so far",
        "One step and nothing else \u2014 so the prompt is small and constant",
        "The original task plus its assigned step",
        "The growing message history, as in ReAct"],
      answer: 1,
      why: "That is the structural difference from ReAct, where the message list grows every turn. A constant per-worker prompt makes cost predictable and means a long task does not pay for its own earlier output repeatedly. The cost is that a worker cannot adapt \u2014 it executes the step it was given even if the previous result made that step wrong." },
    { stem: "Why does a replan path need a budget?",
      options: ["Planning calls are more expensive than worker calls",
        "Without one, a task the planner cannot solve replans forever \u2014 with a planning call per iteration",
        "The checkpointer cannot store more than a few plans",
        "The plan list grows on each replan"],
      answer: 1,
      why: "It is a loop with no exit condition, and a particularly expensive one: each iteration costs a planning call plus however many workers ran before failing. A progress check helps too, since a planner that produces the same plan twice is unlikely to produce a different one on the third attempt." },
    { stem: "What is the state bug that appears only when replanning happens?",
      options: ["The replan counter is not incremented atomically",
        "done still contains the failed step's output, so the new plan's indices no longer align with len(done)",
        "The planner's output overwrites the executor's results",
        "The checkpointer replays the failed step"],
      answer: 1,
      why: "The executor derives the current step from len(done), which is correct until a failure leaves an entry in done that does not correspond to a completed step in the new plan. Every happy-path test passes because the happy path never replans. Keeping the plan and its results in one structure removes the implicit alignment that causes it." },
    { stem: "What can plan-and-execute offer that ReAct structurally cannot?",
      options: ["Recovery from a failed tool call",
        "A plan a human can approve before execution, and independent steps that can run in parallel",
        "Lower cost on short tasks",
        "Adaptation to unexpected results"],
      answer: 1,
      why: "ReAct decides one action at a time, so there is no plan to show anyone \u2014 approval would have to gate each individual action. A plan is an artefact a breakpoint can pause on. And independent steps become a dynamic fan-out, turning a five-step plan into one superstep, which is where the pattern beats ReAct on latency rather than only on predictability." }
  ] },
  interview: { title: "Interview practice", sub: "Plan-and-execute", questions: [
    { level: "core", q: "When would you choose plan-and-execute over ReAct?",
      strong: "A strong answer decides on the task's predictability.",
      answer: [
        { t: "p", text: "When the steps are knowable before starting \u2014 which is 11.1's sequence test applied to a whole task rather than one decision." },
        { t: "p", text: "The concrete differences I would weigh: planning decides the sequence once, so the model-call count is one plus the plan length and the cost is predictable after planning. And each worker gets one step with no history, so the prompt is constant rather than growing every turn as ReAct's does." },
        { t: "p", text: "The same commitment makes it rigid, though. A worker does the step it was given whether or not the previous result made that step wrong \u2014 it has no history to notice with. So if the first step's result changes what the second should be, a plan is a guess that will be wrong." },
        { t: "p", text: "Two cases where I would choose it even when ReAct would work. Independent steps can become a parallel fan-out, so a five-step plan is one superstep \u2014 that is a latency win ReAct cannot match. And a plan is an artefact a human can approve before anything executes, which ReAct structurally cannot offer because it has no plan." }
      ] },
    { level: "advanced", q: "What goes wrong with plan-and-execute in practice?",
      strong: "A strong answer names the replan loop and the index bug.",
      answer: [
        { t: "p", text: "Two things, and one of them is a bug that passes every test." },
        { t: "p", text: "The first is replanning without a budget. A plan made before seeing any results will sometimes be wrong, so the pattern needs a replan path \u2014 and without a bound, a task the planner cannot solve replans forever, with a planning call per iteration on top of the wasted worker calls. I would add a progress check too, since a planner producing the same plan twice will not produce a different one on the third attempt." },
        { t: "p", text: "The second is a state bug on the replan path. The executor usually derives the current step index from how many results it has, and after a failure the results list still contains the failed step's output \u2014 so the new plan's indices no longer line up. Every happy-path test passes, because the happy path never replans. Keeping the plan and its results in one structure removes the implicit alignment." },
        { t: "p", text: "The failure I would watch for in production is a planner that replans on every run. That usually means it does not know what the tools can actually do, so it writes plausible plans against an imagined toolset and discovers the mismatch at execution." },
        { t: "p", text: "That is ReAct's loop with an expensive planning call bolted to the front of each iteration \u2014 so the diagnosis generalises: a pattern always taking its recovery path has chosen the wrong pattern. Instrumenting the replan count is what makes it visible." }
      ] },
    { level: "core", q: "How would you use human approval with plan-and-execute?",
      strong: "A strong answer gates the plan, which is the pattern's advantage.",
      answer: [
        { t: "p", text: "Gate the plan rather than each action, which is the thing this pattern can do and ReAct cannot \u2014 ReAct has no plan to show anyone." },
        { t: "p", text: "So: an interrupt after planning and before the first worker, with the plan as the payload. A reviewer sees the whole proposed sequence at once and approves, rejects, or edits it \u2014 which is three resume values through one interrupt rather than three mechanisms." },
        { t: "p", text: "Editing is the interesting one, and it is why the gate belongs here. A reviewer who can delete a step or reorder two is cheaper and more accurate than one approving five actions individually with no view of the whole." },
        { t: "p", text: "Two implementation details matter. The interrupt must be the first thing in its node, because resuming re-runs the node from the top \u2014 so anything above it happens twice. And editing the plan goes through the reducers, so replacing a list rather than appending to it needs the right reducer or the edit becomes an addition." },
        { t: "p", text: "I would also gate replanning, or at least record it. A plan a human approved and then a failure silently replanned is no longer the approved plan, which defeats the gate \u2014 so a replan should either return to the reviewer or be bounded and flagged." }
      ] }
  ] }
});

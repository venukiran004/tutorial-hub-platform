EC.receiveLesson({
  id: "12.5",
  lede: "The distinction is crisp. A **supervisor** decides who acts *next*, one turn at a time, seeing everything so far \u2014 a router in a loop. An **orchestrator** decides the whole *decomposition* up front, fans the pieces out, and gathers the results \u2014 plan-and-execute with workers instead of steps. So it is 11.3-against-11.6 one level up, decided by the same question: is the decomposition knowable before starting? And the orchestrator's real advantage is **parallelism** \u2014 three workers in one superstep via `Send`. The failure handling differs sharply: a supervisor sees a failure on its next turn, while an orchestrator's fan-out has already happened.",
  objectives: [
    "State the distinction crisply",
    "Build an orchestrator with a real fan-out",
    "Say what each does when a worker fails",
    "Explain why the gather node owns the partial-success decision",
    "Choose between them"
  ],
  prerequisites: ["12.2", "11.6", "10.2"],
  blocks: [
    { t: "h2", n: "01", id: "distinction", text: "The crisp distinction", sub: "11.3 against 11.6, one level up" },

    {"kind": "compare", "title": "Who decides, and when", "caption": "The distinction is crisp, and it decides the call count. A supervisor's total is unknown until the run ends; an orchestrator's is known as soon as the plan exists — which is what makes one budgetable and the other not.", "columns": [{"title": "supervisor — a router in a loop", "tone": "warn", "items": ["decides who acts NEXT, one turn at a time", "sees everything that has happened so far", "can adapt to what a worker just found", "call count unknown until it finishes"]}, {"title": "orchestrator — decides up front", "tone": "accent", "items": ["decides the whole DECOMPOSITION once", "fans the pieces out, often in parallel", "cannot react to what a piece discovers", "call count known as soon as the plan exists"]}], "t": "diagram", "id": "dg-12_5-01-0"},




    { t: "dl", items: [
      ["supervisor", "Decides who acts **next**, one turn at a time, seeing everything so far. A router in a loop (12.2)."],
      ["orchestrator", "Decides the whole **decomposition** up front, fans the pieces out, gathers the results. Plan-and-execute (11.6) with workers instead of steps."]
    ] },
    { t: "p", text: "And the same thing decides it: whether the decomposition is knowable before starting. If the second piece depends on the first piece's result, a plan is a guess \u2014 11.6's conclusion, with agents in place of steps." },
    { t: "h2", n: "02", id: "fanout", text: "The orchestrator, with a real fan-out", sub: "One superstep" },
    { t: "code", lang: "python", title: "Plan, fan out, gather",
      code: 'def fan(state):\n    return [Send("worker", {"piece": p}) for p in state["pieces"]]\n\ng.add_conditional_edges("orchestrate", fan, ["worker"])\ng.add_edge("worker", "gather")',
      out: "    orchestrator planned 3 pieces\n      did: refund policy\n      did: account status\n      did: open orders\n    gathered 3 results",
      caption: "Three workers in **one** superstep (10.2)." },
    { t: "callout", kind: "insight", title: "Parallelism is the orchestrator's real advantage", body: [
      { t: "p", text: "The latency is the slowest worker rather than the sum. A supervisor cannot do this \u2014 it is **sequential by construction**, because it cannot know who acts next until the current worker has finished." },
      { t: "p", text: "So the comparison is not only about predictability. For independent pieces, an orchestrator is faster in wall-clock terms by roughly the piece count, at the same total cost." }
    ] },
    { t: "h2", n: "03", id: "failure", text: "What each does when a worker fails", sub: "Sharply different" },
    { t: "p", text: "**A supervisor** sees the failure in the shared state on its next turn and decides what to do \u2014 retry, try a different worker, give up. The recovery is a normal turn, costing one more coordination call and needing nothing special." },
    { t: "p", text: "**An orchestrator** has already fanned out. So one worker failing in a batch of three means:" },
    { t: "code", lang: "text", title: "One of three fails",
      code: "results: ['ok: a', 'FAILED: b', 'ok: c']\ngathered 3, 1 failed",
      caption: "The other two **succeeded** and their results are kept." },
    { t: "callout", kind: "warn", title: "Only because the worker caught its own failure", body: [
      { t: "p", text: "If it had **raised**, the whole superstep would have failed and all three results would be lost (10.2). So an orchestrator's workers must return a result-shaped value either way \u2014 the output, or a marker recording the failure." },
      { t: "p", text: "Which makes the worker's error handling a structural requirement rather than a nicety: re-running twenty workers because one raised repeats nineteen successful model calls." }
    ] },
    { t: "h2", n: "04", id: "gather", text: "The gather node owns the decision", sub: "Because only it knows the ratio" },
    { t: "p", text: "One failure in three may be fine; three in three is not. A worker can see **neither** number \u2014 it does not even know how many siblings it has \u2014 so the partial-success decision belongs in the gather node." },
    { t: "callout", kind: "mental", title: "The same argument as the fan-out cap", body: [
      { t: "p", text: "10.2 put the worker cap in the node that **builds** the `Send` list, for the same reason: the decision needs a number only that node can see. Here the gather node is the one that can count successes against failures." },
      { t: "p", text: "So an orchestrator has two nodes carrying policy \u2014 the orchestrator bounds the fan-out, the gather node decides what counts as enough \u2014 and neither decision can be pushed into a worker." }
    ] },
    { t: "h2", n: "05", id: "choose", text: "Choosing", sub: "Six dimensions" },
    { t: "table", head: ["", "supervisor", "orchestrator"], rows: [
      ["decomposition", "emerges turn by turn", "decided up front"],
      ["parallel workers", "no", "**yes** (one superstep)"],
      ["model calls", "2 per turn", "1 + N"],
      ["adapts to a result", "immediately", "only by replanning"],
      ["worker failure", "a normal turn", "the gather node's job"],
      ["policy point", "the supervisor", "the orchestrator, once"]
    ] },
    { t: "p", text: "So: an **orchestrator** when the pieces are independent and knowable, because then the parallelism is free and the cost is predictable. A **supervisor** when the next step depends on the last result, or when you need a decision point between every pair of steps for policy (12.2)." },
    { t: "callout", kind: "good", title: "And 11.6's note applies unchanged", body: [
      { t: "p", text: "An orchestrator that always replans has chosen the wrong pattern \u2014 it is a supervisor with an expensive planning call bolted to the front of each iteration." },
      { t: "p", text: "Which is why instrumenting the replan count matters: it is the measurement that distinguishes a working orchestrator from a supervisor paying for plans it discards." }
    ] },
    { t: "exercise", kind: "build", title: "Build both and fail a worker",
      difficulty: "advanced", minutes: 32,
      body: "State the distinction between a supervisor and an orchestrator precisely. Build an orchestrator that plans a decomposition and fans the pieces out with Send, confirming they run in one superstep. Then fail one worker in a batch and show what happens to the others' results, explaining what the worker had to do for that to work. Say where the partial-success decision belongs and why. Finally compare the two patterns on at least five dimensions.",
      requirements: ["State the distinction in terms of what each decides",
        "Build an orchestrator with a Send fan-out and confirm one superstep",
        "Explain why a supervisor cannot parallelise",
        "Fail one worker in a batch and show the others' results surviving",
        "Explain what the worker had to do for that to work",
        "Say where the partial-success decision belongs and why",
        "Compare the two patterns on at least five dimensions"],
      hint: "Make one worker fail by returning a failure marker rather than raising, then try to imagine the raising version. The difference is all three results.",
      solution: { lang: "python", title: "x1205.py \u2014 partial success, kept",
        code: 'def fan(state):\n    return [Send("worker", {"piece": p}) for p in state["pieces"]]\n\n# the worker must return a result-shaped value EITHER WAY\ndef worker2(state):\n    p = state["piece"]\n    if p == "b":\n        return {"results": ["FAILED: %s" % p]}     # not raise\n    return {"results": ["ok: %s" % p]}\n\ndef gather2(state):\n    failed = [r for r in state["results"] if r.startswith("FAILED")]\n    return {"trace": ["gathered %d, %d failed" % (len(state["results"]),\n                                                  len(failed))]}',
        out: "==============================================================================\nPART 1 -- the crisp distinction\n==============================================================================\n  SUPERVISOR   decides who acts NEXT, one turn at a time, seeing\n               everything so far. a router in a loop (12.2).\n\n  ORCHESTRATOR decides the WHOLE DECOMPOSITION up front, fans the\n               pieces out, and gathers the results. plan-and-execute\n               (11.6) with workers instead of steps.\n\n  so it is 11.3-against-11.6 again, one level up: turn-by-turn\n  against plan-once. and the same thing decides it -- whether the\n  decomposition is knowable before starting.\n==============================================================================\nPART 2 -- the orchestrator, with a real fan-out\n==============================================================================\n    orchestrator planned 3 pieces\n    gathered 3 results\n      did: refund policy\n      did: account status\n      did: open orders\n\n  the three workers ran in ONE superstep (10.2's Send), so the\n  latency is the slowest worker rather than the sum.\n\n  that parallelism is the orchestrator's real advantage over a\n  supervisor, which is sequential by construction -- it cannot know\n  who acts next until the current worker has finished.\n==============================================================================\nPART 3 -- what each does when a worker fails\n==============================================================================\n  SUPERVISOR: it sees the failure in the shared state on its next\n  turn and decides what to do -- retry, try a different worker, give\n  up. the recovery is a normal turn, so it costs one more\n  coordination call and nothing special is needed.\n\n  ORCHESTRATOR: the fan-out has already happened. so one worker\n  failing in a batch of three means:\n\n    results: ['ok: a', 'FAILED: b', 'ok: c']\n    gathered 3, 1 failed\n\n  the other two SUCCEEDED and their results are kept. that only\n  works because the worker caught its own failure and returned a\n  result-shaped value -- if it had raised, the whole superstep would\n  have failed and all three results would be lost (10.2).\n\n  so an orchestrator needs the gather node to handle PARTIAL\n  SUCCESS, and that is where the decision belongs: only the gather\n  node knows the ratio. one failure in three may be fine; three in\n  three is not, and a worker cannot see either number.\n==============================================================================\nPART 4 -- choosing\n==============================================================================\n                        supervisor          orchestrator\n  decomposition         emerges turn by turn  decided up front\n  parallel workers      no                    YES (one superstep)\n  model calls           2 per turn            1 + N\n  adapts to a result    immediately           only by replanning\n  worker failure        a normal turn         the gather node's job\n  policy point          the supervisor        the orchestrator, once\n\n  so: an orchestrator when the pieces are independent and knowable,\n  because then the parallelism is free and the cost is predictable.\n  a supervisor when the next step depends on the last result, or\n  when you need a decision point between every pair of steps for\n  policy (12.2).\n\n  and the same note as 11.6: an orchestrator that always replans has\n  chosen the wrong pattern.",
        notes: [
          { t: "p", text: "**A supervisor decides who acts next, one turn at a time; an orchestrator decides the whole decomposition up front.**" },
          { t: "p", text: "**Which is 11.3 against 11.6, one level up** \u2014 decided by whether the decomposition is knowable before starting." },
          { t: "p", text: "**The three workers ran in one superstep**, so the latency is the slowest worker rather than the sum." },
          { t: "p", text: "**A supervisor cannot do that** \u2014 it is sequential by construction, since it cannot know who acts next until the current worker finishes." },
          { t: "p", text: "**One worker failed and the other two results survived** \u2014 but only because the worker returned a failure marker rather than raising." },
          { t: "p", text: "**If it had raised, the whole superstep would have failed** and all three results would be lost (10.2)." },
          { t: "p", text: "**So the partial-success decision belongs in the gather node**, because only it can count successes against failures \u2014 a worker does not know how many siblings it has." },
          { t: "p", text: "**The same argument as 10.2's fan-out cap**: the decision needs a number only one node can see." },
          { t: "p", text: "**An orchestrator when the pieces are independent and knowable; a supervisor when the next step depends on the last** \u2014 and an orchestrator that always replans has chosen the wrong pattern." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the batch that lost nineteen good results", body: [
      { t: "p", text: "An orchestrator fans out twenty document-summarisation workers. One document is malformed and its worker raises. The whole request fails and all twenty summaries are lost, including the nineteen that completed." },
      { t: "p", text: "The workers ran in one superstep, and an exception in any of them fails the step \u2014 so there is no partial result to keep. The nineteen successful model calls were paid for and discarded." },
      { t: "p", text: "The fix is that a fanned-out worker must never raise: catch inside and return a result-shaped value carrying the error and the item that failed. Then the gather node sees nineteen successes and one failure and decides \u2014 which is where the decision belongs, because one failure in twenty may be acceptable while ten in twenty is not, and a worker can see neither ratio. And the retry should be of the one failed item rather than the batch, for the same reason the nineteen were worth keeping." }
    ] }
  ],
  takeaways: [
    "**A supervisor decides who acts next; an orchestrator decides the whole decomposition up front.**",
    "**Which is 11.3 against 11.6, one level up**, decided by whether the decomposition is knowable.",
    "**The orchestrator's workers ran in one superstep** \u2014 latency is the slowest, not the sum.",
    "**A supervisor cannot parallelise** \u2014 it is sequential by construction.",
    "**A supervisor sees a worker failure on its next turn** and recovers in a normal turn.",
    "**An orchestrator has already fanned out**, so failure handling is different in kind.",
    "**One worker failed and the other two results survived.**",
    "**But only because the worker returned a failure marker rather than raising.**",
    "**A raise fails the whole superstep** and discards every sibling's result (10.2).",
    "**So a fanned-out worker must never raise** \u2014 catch inside and return a result shape.",
    "**The partial-success decision belongs in the gather node**, which can count the ratio.",
    "**A worker does not know how many siblings it has** \u2014 the same argument as the fan-out cap.",
    "**An orchestrator for independent, knowable pieces**; a supervisor for dependent steps or policy.",
    "**An orchestrator that always replans has chosen the wrong pattern** \u2014 so instrument the replan count."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What is the crisp difference between a supervisor and an orchestrator?",
      options: ["A supervisor uses a stronger model",
        "A supervisor decides who acts next one turn at a time; an orchestrator decides the whole decomposition up front",
        "An orchestrator has no central coordinator",
        "A supervisor cannot use tools"],
      answer: 1,
      why: "It is the same distinction as ReAct against plan-and-execute, raised to the agent level, and it is decided by the same question: is the decomposition knowable before starting? A supervisor sees every result before choosing the next actor, so it adapts immediately; an orchestrator commits to a plan and can only adapt by replanning." },
    { stem: "Why can a supervisor not run its workers in parallel?",
      options: ["Shared state prevents concurrent writes",
        "It is sequential by construction \u2014 it cannot know who acts next until the current worker has finished",
        "The checkpointer serialises each turn",
        "Workers would need separate threads"],
      answer: 1,
      why: "Its decision depends on the latest results, so it has to wait for them. An orchestrator decides all the pieces before any worker runs, which is what makes a Send fan-out possible \u2014 and that parallelism is its genuine advantage, giving latency equal to the slowest piece rather than the sum, at the same total cost." },
    { stem: "A fanned-out worker encounters an error. What must it do?",
      options: ["Raise, so the orchestrator can retry the batch",
        "Catch it and return a result-shaped value recording the failure \u2014 a raise fails the whole superstep and discards every sibling's result",
        "Write the error to the store and return nothing",
        "Retry internally until it succeeds"],
      answer: 1,
      why: "All the workers occupy one superstep, so an exception in any of them fails the step and loses the results of the ones that succeeded. Returning a failure marker keeps nineteen good results out of twenty and lets a retry target only the failed item \u2014 rather than repeating nineteen successful model calls." },
    { stem: "Where does the decision about acceptable partial success belong?",
      options: ["In each worker, which knows whether it succeeded",
        "In the gather node, because only it can count successes against failures",
        "In the orchestrator, before the fan-out",
        "In the retry policy on the worker node"],
      answer: 1,
      why: "One failure in twenty may be fine and ten in twenty almost certainly is not, and a worker can see neither number \u2014 it does not even know how many siblings exist. This is the same reasoning that puts the fan-out cap in the node building the Send list: the decision requires a count only one node has." }
  ] },
  interview: { title: "Interview practice", sub: "Orchestrator against supervisor", questions: [
    { level: "core", q: "Supervisor or orchestrator \u2014 how do you choose?",
      strong: "A strong answer asks whether the decomposition is knowable.",
      answer: [
        { t: "p", text: "By asking whether the decomposition is knowable before starting \u2014 which is the same question as ReAct against plan-and-execute, one level up." },
        { t: "p", text: "An orchestrator decides all the pieces up front, so it can fan them out. I built one and the three workers ran in a single superstep, which means the latency is the slowest piece rather than the sum, at the same total cost. A supervisor cannot do that, because it is sequential by construction \u2014 it cannot know who acts next until the current worker has finished." },
        { t: "p", text: "So for independent, knowable pieces the orchestrator is strictly better: parallel and with a predictable call count of one plus the piece count." },
        { t: "p", text: "A supervisor is right when the next step depends on the last result, or when I want a decision point between every pair of steps to put policy in \u2014 a permission check, a budget check, an approval gate. An orchestrator makes those decisions once, before anything has happened." }
      ] },
    { level: "advanced", q: "What changes about failure handling between the two?",
      strong: "A strong answer notes the fan-out has already happened.",
      answer: [
        { t: "p", text: "For a supervisor, a worker failure is a normal turn. It sees the failure in the shared state on its next turn and decides \u2014 retry, try a different worker, give up. One extra coordination call and nothing special is needed." },
        { t: "p", text: "For an orchestrator the fan-out has already happened, so the failure arrives alongside the successes and someone has to reconcile them. I tested one worker failing in a batch of three and the other two results survived \u2014 but only because the worker caught its own error and returned a result-shaped value." },
        { t: "p", text: "If it had raised, the whole superstep would have failed and all three results would be lost. That is the thing I would design for: in a twenty-worker fan-out, one raise discards nineteen successful model calls that have already been paid for." },
        { t: "p", text: "So a fanned-out worker must never raise. Catch inside, return the error and the item that failed, and let the gather node decide." },
        { t: "p", text: "And the decision belongs there specifically because only the gather node can count the ratio. One failure in twenty may be acceptable and ten almost certainly is not \u2014 and a worker can see neither number, since it does not know how many siblings it has. Same reasoning as putting the fan-out cap in the node that builds the Send list." }
      ] },
    { level: "core", q: "Could you use both an orchestrator and a supervisor in one system?",
      strong: "A strong answer composes them at different levels.",
      answer: [
        { t: "p", text: "Yes, and the natural composition is an orchestrator at the top with supervisors inside, or the reverse \u2014 chosen by where the predictable decomposition sits." },
        { t: "p", text: "The common useful shape is an orchestrator that splits a task into independent pieces and fans them out, where each piece is handled by something that may itself need turn-by-turn decisions. So the top level gets parallelism and a predictable call count, and each piece gets adaptability." },
        { t: "p", text: "The reverse also happens: a supervisor that, on one of its turns, delegates to an orchestrator because that particular subtask decomposes cleanly. A research step that needs six independent lookups is an orchestrator inside one supervisor turn." },
        { t: "p", text: "What I would be careful about is the cost compounding. Each level adds a coordination call per unit of work, so an orchestrator over supervisors over workers is paying at two levels before anything happens \u2014 and the opacity compounds the same way, since each level's decisions are one superstep of the level above." },
        { t: "p", text: "And partial failure needs deciding at each level. The orchestrator's gather node owns the ratio question for its fan-out; a supervisor inside a piece handles its own worker failures as normal turns. Those are different mechanisms and both have to exist." }
      ] }
  ] }
});

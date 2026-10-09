EC.receiveLesson({
  id: "14.5",
  lede: "The intuitive way to get partial results \u2014 fan out to five sources and let the broken ones fail \u2014 **does not work**. Measured: one exception in one parallel branch failed the whole superstep, and the three branches that **had succeeded** lost their writes with it. That is correct transactional behaviour and the exact opposite of what k-of-N needs. So partial results require catching **inside** the node, which turns the failure into **data**: 3 of 5 arrived, the run completed, and a gather step owns the threshold. Then the budget, checked in the **router** before the next call rather than after it \u2014 and exiting through a node that **produces** something, because a budget that raises has spent the money and thrown away the work.",
  objectives: [
    "Show that letting a parallel branch fail loses the successful branches",
    "Implement k-of-N by catching inside the node",
    "Put the threshold decision in the gather step",
    "Implement a spend budget checked in the router",
    "Name the three budgets and the one that catches a loop"
  ],
  prerequisites: ["14.4", "8.7"],
  blocks: [
    { t: "h2", n: "01", id: "cannot", text: "You cannot get partial results by letting branches fail", sub: "The measurement" },
    { t: "code", lang: "text", title: "Five sources, two of them down",
      code: "the whole run raised: ConnectionError: crm is down\nresults from the 3 branches that SUCCEEDED: lost",
      caption: "One exception in one parallel node fails the **superstep**." },
    { t: "callout", kind: "insight", title: "And that is correct, not a flaw", body: [
      { t: "p", text: "A superstep is a transaction: either all of its writes commit or none do. Three branches finished and their writes went with the failing one, because committing a partial superstep would leave state that no node had agreed on." },
      { t: "p", text: "It is the same property that makes 14.3's retry transparent \u2014 a failed attempt leaves no trace. Correct, and the exact opposite of what partial results need, which is why k-of-N is not a configuration setting." }
    ] },
    { t: "h2", n: "02", id: "inside", text: "So catch inside the node", sub: "Failure becomes data" },
    { t: "code", lang: "text", title: "The same five sources, guarded",
      code: "succeeded : ['docs', 'tickets', 'wiki']\nfailed    : ['crm: crm is down', 'billing: billing is down']\nratio     : 3 of 5",
      caption: "The run **completed**." },
    { t: "p", text: "The node is now a `try`/`except` that **always returns**, writing either to `found` or to `errors`. Which means the failure is a value in state rather than an exception \u2014 and a value can be routed on, counted, and reported to the user." },
    { t: "callout", kind: "mental", title: "This is the general move", body: [
      { t: "p", text: "Anywhere you want to survive a partial failure, the failure has to stop being an exception and start being data. 8.7 found the related hazard: a join node ran with one branch incomplete and read `'<unset>'` silently \u2014 so \u201calways returns\u201d has to mean \u201calways returns something the gather step can tell apart\u201d." },
      { t: "p", text: "Hence the separate `errors` key. A gather step that can only see `found` cannot distinguish two sources being down from two sources having nothing to say." }
    ] },
    { t: "h2", n: "03", id: "threshold", text: "The gather step owns the threshold", sub: "One line, and it is a product decision" },
    { t: "code", lang: "text", title: "3 of 5 arrived",
      code: "threshold k=1 of 5 -> proceed\nthreshold k=3 of 5 -> proceed\nthreshold k=4 of 5 -> FAIL the run\nthreshold k=5 of 5 -> FAIL the run",
      caption: "It has to be a **threshold**, not \u201cwhatever arrived\u201d." },
    { t: "callout", kind: "warn", title: "And the degraded answer has to be labelled", body: [
      { t: "p", text: "A run that answers from 1 of 5 sources and does not say so is **worse than an error**, because the user cannot tell the answer is partial and will act on it as if it were complete." },
      { t: "p", text: "*\u201cI could not reach the billing system, so this does not include your current balance\u201d* is a degraded answer. The same text without the caveat is a **wrong answer**. That sentence is the entire difference, and it costs one string." }
    ] },
    { t: "h2", n: "04", id: "budget", text: "A budget that caps a run's spend", sub: "Checked in the router" },
    { t: "code", lang: "text", title: "$0.05 at $0.012 a call",
      code: "calls made : 4\nspent      : $0.048\nanswer     : partial answer -- budget exhausted after 4 calls",
      caption: "Checked **before** the next call, not after it." },
    { t: "callout", kind: "trap", title: "Two things about where and how it exits", body: [
      { t: "p", text: "The check belongs in the **router**, before the next call. Checking afterwards tells you that you have already overspent, which is a report rather than a budget." },
      { t: "p", text: "And it exits through a node that **produces** something, not by raising. A budget that raises has spent the money **and** thrown away the work \u2014 the worst of both. The exhausted run should return its partial answer, labelled, which is the same rule as the k-of-N case." }
    ] },
    { t: "h2", n: "05", id: "three", text: "Three budgets", sub: "And the one that catches a loop" },
    { t: "dl", items: [
      ["**cost**", "Dollars per run. The one that shows up on a bill."],
      ["**calls**", "Model calls per run. A cheaper proxy, checkable without a pricing table."],
      ["**wall time**", "Latency per run. The one a user notices."]
    ] },
    { t: "callout", kind: "good", title: "The calls budget is the one that catches a silent loop", body: [
      { t: "p", text: "A loop that is **making progress** by LangGraph's reckoning never hits the recursion limit \u2014 and that default is **10007** supersteps, which at $0.012 a call is roughly $120 before anything stops it." },
      { t: "p", text: "So: a recursion limit for **structural** loops and a call budget for **semantic** ones, and the call budget is the much smaller number. All three belong in the config and are read in the router, which also makes them testable without reaching into the graph." }
    ] },
    { t: "diagram", kind: "flow", title: "k-of-N needs the catch INSIDE the node", cols: 5,
      caption: "Letting the branches raise failed the whole superstep and the three that had **already succeeded** lost their writes — correct transactional behaviour, and the opposite of what partial results need. Guarded, 3 of 5 arrived and the run completed.",
      nodes: [
        { id: "docs", label: "docs", sub: "ok", tone: "good" },
        { id: "tix", label: "tickets", sub: "ok", tone: "good" },
        { id: "wiki", label: "wiki", sub: "ok", tone: "good" },
        { id: "crm", label: "crm", sub: "down", tone: "crit" },
        { id: "bill", label: "billing", sub: "down", tone: "crit" },
        { id: "gather", label: "gather", sub: "3 of 5 — proceed, and LABEL it", tone: "accent" }
      ],
      edges: [["docs", "gather"], ["tix", "gather"], ["wiki", "gather"],
              ["crm", "gather", null, "dashed"], ["bill", "gather", null, "dashed"]] },
    { t: "exercise", kind: "build", title: "Degrade instead of failing",
      difficulty: "core", minutes: 30,
      body: "Fan out to several sources where some fail, first by letting the exceptions propagate, and report what happens to the successful branches. Then rebuild it so partial results are possible, and report the ratio. Put the k-of-N threshold decision where it belongs and show how different thresholds change the verdict. Implement a spend budget that stops a run, checking it in the right place and exiting in the right way. Finally name the three budgets worth having and say which one catches a loop that is succeeding.",
      requirements: ["Fan out with failing branches and report what the run does",
        "State what happened to the successful branches and why that is correct",
        "Rebuild so partial results survive, and report the ratio",
        "Explain what the node now returns and why there are two keys",
        "Show the threshold decision for several values of k",
        "Explain why a degraded answer must be labelled",
        "Implement a budget checked in the router and report the result",
        "Explain why it must not exit by raising",
        "Name three budgets and identify the one that catches a silent loop"],
      hint: "Let the branches raise first. The successful branches' results are gone, which is why the catch has to be inside the node.",
      solution: { lang: "python", title: "x1405.py \u2014 one exception loses three successes",
        code: '# letting branches fail: the whole superstep fails with them\ntry:\n    out = g.compile().invoke({"found": []})\nexcept Exception as e:\n    print(type(e).__name__, e)      # and the 3 successes are LOST\n\n# so the catch goes INSIDE the node, and failure becomes data\ndef guarded(name, fails):\n    def f(s):\n        try:\n            if fails:\n                raise ConnectionError("%s is down" % name)\n            return {"found": [name], "errors": []}\n        except Exception as e:\n            return {"found": [], "errors": ["%s: %s" % (name, e)]}\n    return f\n# -> succeeded 3 of 5, and the run COMPLETED',
        out: "==============================================================================\nPART 1 -- letting a parallel branch fail does NOT give you partial results\n==============================================================================\n  the whole run raised: ConnectionError: billing is down\n  results from the 3 branches that SUCCEEDED: lost\n\n  so you cannot get k-of-N by letting branches fail. one exception in\n  one parallel node fails the superstep, and the successful branches'\n  writes go with it -- which is correct transactional behaviour and\n  the opposite of what partial-results needs.\n\n==============================================================================\nPART 2 -- k-of-N requires catching INSIDE the node\n==============================================================================\n  succeeded : ['docs', 'tickets', 'wiki']\n  failed    : ['billing: billing is down', 'crm: crm is down']\n  ratio     : 3 of 5\n\n  3 of 5, and the run completed. the node is now a try/except that\n  always returns, which means the FAILURE IS DATA rather than an\n  exception -- and the gather step can decide what to do with it.\n\n==============================================================================\nPART 3 -- the gather step owns the k-of-N decision\n==============================================================================\n    threshold k=1 of 5 -> proceed\n    threshold k=3 of 5 -> proceed\n    threshold k=4 of 5 -> FAIL the run\n    threshold k=5 of 5 -> FAIL the run\n\n  so the threshold is a product decision expressed in one line, and it\n  has to be a threshold rather than 'whatever arrived'. a run that\n  answers from 1 of 5 sources and does not say so is worse than an\n  error, because the user cannot tell the answer is partial.\n\n  which means the degraded answer has to be LABELLED. 'I could not\n  reach the billing system, so this does not include your current\n  balance' is a degraded answer. the same text without the caveat is\n  a wrong answer.\n\n==============================================================================\nPART 4 -- a budget that caps a run's spend\n==============================================================================\n  budget $0.050 at $0.012 per call:\n    calls made : 4\n    spent      : $0.048\n    answer     : partial answer -- budget exhausted after 4 calls\n\n  the budget is checked in the ROUTER, before the next call, not after\n  it. checking afterwards tells you that you have already overspent.\n\n  and note it exits through a node that produces something, not by\n  raising. a budget that raises has spent the money and thrown away\n  the work -- which is the worst of both. the exhausted run should\n  return its partial answer, labelled.\n\n==============================================================================\nPART 5 -- the three budgets worth having, and the one that catches loops\n==============================================================================\n  cost      dollars per run. the one that shows up on a bill.\n  calls     model calls per run. a cheaper proxy, checkable without\n            a pricing table.\n  wall time latency per run. the one a user notices.\n\n  all three should be in the config and read in the router. and the\n  CALLS budget is the one that catches a silent loop, because a loop\n  that is making progress by LangGraph's reckoning never hits the\n  recursion limit -- 10.x measured that default at 10007 supersteps,\n  which at $0.012 a call is $120 before anything stops it.\n\n  so: a recursion limit for structural loops, a call budget for\n  semantic ones, and the call budget is the smaller number.",
        notes: [
          { t: "p", text: "**Letting a parallel branch fail failed the whole superstep**, and the three branches that had succeeded lost their writes." },
          { t: "p", text: "**Which is correct transactional behaviour** \u2014 a superstep commits all its writes or none \u2014 and the opposite of what k-of-N needs." },
          { t: "p", text: "**So partial results require catching inside the node**, which turns the failure into data." },
          { t: "p", text: "**And data can be routed on, counted and reported**, where an exception can only be caught." },
          { t: "p", text: "**Two keys, not one**: a gather step seeing only `found` cannot tell a source being down from a source having nothing to say (8.7)." },
          { t: "p", text: "**The gather step owns the threshold**, and it must be a threshold rather than \u2018whatever arrived\u2019." },
          { t: "p", text: "**A degraded answer must be LABELLED** \u2014 the same text without the caveat is a wrong answer." },
          { t: "p", text: "**The budget is checked in the router, before the next call** \u2014 checking after is a report, not a budget." },
          { t: "p", text: "**And it exits through a node that produces something**: raising spends the money and discards the work." },
          { t: "p", text: "**Three budgets \u2014 cost, calls, wall time \u2014 and the calls budget catches a semantic loop**, because a loop making progress never reaches the 10007-superstep recursion limit." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the dashboard that failed completely when one source was slow", body: [
      { t: "p", text: "An agent gathers from five internal systems in parallel and answers from all of them. When one system is down, the user gets an error page \u2014 even though four systems answered." },
      { t: "p", text: "The branches raise, and one exception in a parallel node fails the whole superstep: measured, three successful branches lost their writes along with the failing one. That is correct transactional behaviour, so there is no setting to change \u2014 the catch has to move inside each node so the failure becomes a value rather than an exception." },
      { t: "p", text: "With that done, the node always returns, writing to a results key or an errors key, and a gather step applies a threshold \u2014 proceed at 3 of 5, fail below. Two keys rather than one, because otherwise the gather step cannot distinguish a source being down from a source having nothing to report. And the answer has to say which source was missing: 'this does not include your current balance' is a degraded answer, while the same text without that line is a wrong one." }
    ] }
  ],
  takeaways: [
    "**Letting a parallel branch fail failed the whole superstep**, losing three successful branches' writes.",
    "**Which is correct transactional behaviour**, and the opposite of what k-of-N needs.",
    "**So there is no setting** \u2014 the catch has to move inside the node.",
    "**Which turns the failure into data**, and data can be routed on and counted.",
    "**Two keys, not one**: otherwise a source being down looks like a source with nothing to say (8.7).",
    "**3 of 5 arrived and the run completed.**",
    "**The gather step owns the threshold**, and it must be a threshold rather than \u2018whatever arrived\u2019.",
    "**A degraded answer must be labelled** \u2014 the same text without the caveat is a wrong answer.",
    "**Which costs one string** and is the whole difference.",
    "**The budget is checked in the router, before the next call.**",
    "**Checking afterwards is a report, not a budget.**",
    "**And it exits through a node that produces something** \u2014 raising spends the money and discards the work.",
    "**Three budgets**: cost, calls, wall time \u2014 all in the config, read in the router.",
    "**The calls budget catches a semantic loop**, which never reaches the 10007-superstep recursion limit."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Five parallel branches run and two raise. What happens to the three that succeeded?",
      options: ["They are committed and the run continues with partial state",
        "Their writes are lost with the failing superstep, because a superstep commits all its writes or none",
        "They are retried individually",
        "They are written but marked incomplete"],
      answer: 1,
      why: "A superstep is a transaction, so committing a partial one would leave state no node had agreed on. This is the same property that makes a retried node's failed attempt leave no trace \u2014 correct, and exactly opposite to what partial results need. Hence k-of-N cannot be configured; the catch must move inside each node." },
    { stem: "Why does a guarded node write to two keys rather than one?",
      options: ["Reducers cannot merge a single key from parallel branches",
        "So the gather step can distinguish a source being down from a source that had nothing to report",
        "To keep the error out of the final answer",
        "Because errors need a different reducer type"],
      answer: 1,
      why: "If a failing node simply returns an empty result, the gather step sees the same thing as a healthy source with no matches, and the degraded answer cannot be labelled. The related hazard is a join node reading an unset value silently \u2014 so 'always returns' has to mean 'always returns something the gather step can tell apart'." },
    { stem: "Where should a spend budget be checked, and how should the run exit?",
      options: ["After each call, raising a BudgetExceeded error",
        "In the router before the next call, exiting through a node that returns a labelled partial answer",
        "In the checkpointer, by refusing to write",
        "At the end of the run, in the gather step"],
      answer: 1,
      why: "Checking after a call reports an overspend rather than preventing it. And raising spends the money and then discards the work that money bought, which is the worst of both outcomes \u2014 the exhausted run should return what it has, labelled as partial, exactly as a k-of-N degraded answer does." },
    { stem: "Which budget catches a loop that is succeeding?",
      options: ["The recursion limit, since loops exceed it",
        "The calls budget, because a loop making progress never reaches the 10007-superstep recursion limit",
        "The wall-time budget, since loops are slow",
        "The cost budget, since only cost reflects repetition"],
      answer: 1,
      why: "A semantic loop \u2014 an agent re-deriving the same next step \u2014 advances the graph legitimately each turn, so the structural limit is no protection, and at roughly a cent a call that default is about $120 of spend. A call budget is a much smaller number and is the right instrument for a loop that looks like progress." }
  ] },
  interview: { title: "Interview practice", sub: "Budgets and degradation", questions: [
    { level: "core", q: "How would you make an agent return a partial answer when one source is down?",
      strong: "A strong answer moves the catch inside the node.",
      answer: [
        { t: "p", text: "By catching inside each node so the failure becomes data rather than an exception \u2014 and that is not the obvious design." },
        { t: "p", text: "The obvious design is to fan out and let the broken branches fail, and I measured that it does not work. One exception in one parallel node failed the whole superstep, and the three branches that had already succeeded lost their writes with it. A superstep is a transaction, so that is correct behaviour and there is no setting to change." },
        { t: "p", text: "So each node becomes a try/except that always returns, writing either to a results key or an errors key. Then 3 of 5 arrive, the run completes, and a gather step applies the threshold." },
        { t: "p", text: "Two keys rather than one, because a gather step that only sees results cannot distinguish a source being down from a source with nothing to report \u2014 and that distinction is what makes the answer labellable." },
        { t: "p", text: "Which is the part I would insist on. A run that answers from 1 of 5 sources and does not say so is worse than an error, because the user acts on it as if it were complete. 'I could not reach the billing system, so this does not include your balance' is a degraded answer; the same text without that line is a wrong one, and it costs one string." }
      ] },
    { level: "advanced", q: "What stops an agent spending an unbounded amount on one request?",
      strong: "A strong answer distinguishes structural from semantic loops.",
      answer: [
        { t: "p", text: "A call budget read in the router, and it has to be separate from the recursion limit because they catch different things." },
        { t: "p", text: "The recursion limit catches a structural loop \u2014 a cycle with no exit. It defaults to 10007 supersteps, which at roughly a cent a model call is about $120 before anything stops it. And a semantic loop never reaches it anyway, because an agent re-deriving the same next step is making legitimate progress by the graph's reckoning." },
        { t: "p", text: "So I would have three budgets in the config: cost in dollars, model calls as a cheaper proxy that needs no pricing table, and wall time because that is what a user notices. All read in the router." },
        { t: "p", text: "The router is the important part. Checking after a call tells you that you have already overspent, which is a report rather than a budget." },
        { t: "p", text: "And it must not exit by raising. A budget that raises has spent the money and then discarded the work the money bought \u2014 the exhausted run should return its partial answer, labelled as partial. Which is the same rule as the degraded-answer case, and I think that is the general principle: every failure path should produce something the user can act on, including the knowledge that it is incomplete." }
      ] },
    { level: "advanced", q: "How would you choose the k in a k-of-N threshold?",
      strong: "A strong answer makes it a per-source property, not one number.",
      answer: [
        { t: "p", text: "I would resist a single number, because the sources are rarely interchangeable \u2014 which is the assumption k-of-N quietly makes." },
        { t: "p", text: "3 of 5 is fine if any three sources support an answer. But if one of the five is the account system and the question is about an account, then that source is required and the other four are supplementary. A threshold of 3 passes a run that is missing the only source that mattered." },
        { t: "p", text: "So what I would actually want is a required set plus a threshold over the rest: the account lookup must succeed, and at least two of the remaining four. That is the same shape as the tool assertions I would use for trajectory evaluation, and it is roughly as cheap to express." },
        { t: "p", text: "Where a plain k is right is a genuinely redundant fan-out \u2014 three search backends over the same corpus, say, where any of them answers the question. There the sources are interchangeable and the threshold is the whole policy." },
        { t: "p", text: "Whatever the rule, the answer has to name what is missing. 'This does not include your current balance because I could not reach the billing system' is a degraded answer; the same text without that clause is a wrong one, and the user has no way to tell. That sentence costs one string and it is the difference between the two." }
      ] }
  ] }
});

EC.receiveLesson({
  id: "14.8",
  lede: "A two-model-call agent run produced **9 spans** \u2014 6 chain, 2 llm, 1 tool \u2014 nested three deep, collected from real LangChain callbacks. The tree is what makes a failure **locatable**: a flat log says a tool failed, and the tree says which agent turn called it with what. Then the attributes, none of which are there by default \u2014 and the one that silently corrupts your metrics is the **retry attempt number**, because 14.3 measured a node running three times inside one *successful* run, so without it p99 latency and cost per run are both wrong and a duplicate-call detector fires on retries that were working as configured. And the metric for a silent loop: **distinct `(tool, arguments)` pairs against the total** \u2014 a group-by, no labels, no model call.",
  objectives: [
    "Collect a real span tree from an agent run",
    "List the attributes that make a failed run diagnosable",
    "Identify the attribute that corrupts metrics when missing",
    "Build the metric that catches a loop that is succeeding",
    "Decide what to log at each level, and what not to"
  ],
  prerequisites: ["14.7", "14.3"],
  blocks: [
    { t: "h2", n: "01", id: "tree", text: "The span tree an agent run produces", sub: "Measured, not described" },
    { t: "code", lang: "text", title: "9 spans from two model calls",
      code: "chain LangGraph\n  chain agent\n    llm   model\n    chain route\n  chain tools\n    tool  get_order\n  chain agent\n    llm   model\n    chain route\n\nby kind: [('chain', 6), ('llm', 2), ('tool', 1)]",
      caption: "Collected with a `BaseCallbackHandler` recording `run_id` and `parent_run_id`." },
    { t: "callout", kind: "insight", title: "The tree is what makes a failure locatable", body: [
      { t: "p", text: "A flat log of these events tells you a tool failed. The **tree** tells you which agent turn called it, with what arguments, after which previous result \u2014 and that is the difference between a stack trace and a line number." },
      { t: "p", text: "Note also that the conditional edge appears as its own span. The routing decision is observable, which matters because a misrouted run and a badly-answered run look identical from the output." }
    ] },
    { t: "h2", n: "02", id: "attrs", text: "The attributes that make it diagnosable", sub: "None are there by default" },
    { t: "dl", items: [
      ["`thread_id`", "So a failure maps to a conversation (14.6)."],
      ["`checkpoint_id`", "So it maps to a resumable point (10.8)."],
      ["**node name**", "Which graph node this span belongs to."],
      ["**tool arguments**", "The only way to spot a duplicate call (12.8)."],
      ["**token counts**", "Input and output, per call \u2014 13.1's cumulative cost is not computable without them."],
      ["**the finish reason**", "A truncated answer and a complete one look the same in the content."],
      ["**the retry attempt number**", "So three attempts do not read as three runs."]
    ] },
    { t: "callout", kind: "trap", title: "The attempt number is the one that silently corrupts metrics", body: [
      { t: "p", text: "14.3 measured a node running **three times inside one successful run**. Without the attempt number, p99 latency and cost per run are both wrong \u2014 and a duplicate-call detector fires on retries that were working exactly as configured." },
      { t: "p", text: "So the most important attribute for data quality is the one about a mechanism that was functioning. That is a general shape worth noticing: the retries, the fallbacks and the degradations are all invisible successes, and they all distort the numbers you use to judge the system." }
    ] },
    { t: "h2", n: "03", id: "loop", text: "The metric that catches a silent loop", sub: "Distinct pairs against the total" },
    { t: "code", lang: "text", title: "A trajectory from a run that SUCCEEDED",
      code: "get_order -> get_policy -> get_order -> get_policy ->\n  get_order -> get_policy\n\ndistinct (tool, args) pairs : 2\nrepeat calls                : 4",
      caption: "This run finished, answered, and never hit the recursion limit." },
    { t: "callout", kind: "warn", title: "And it had a long way to go before anything would stop it", body: [
      { t: "p", text: "The recursion limit defaults to **10007** supersteps, so a loop making two calls a turn is nowhere near it. The only signal is the **repetition**." },
      { t: "p", text: "So: count distinct `(tool, arguments)` pairs per run and compare against the total. The ratio is near 1.0 for a healthy run and falls as a loop develops. It needs no labels, no gold answer and no model call \u2014 it is a group-by over the trace, which is why it is the first metric to add (14.7)." }
    ] },
    { t: "h2", n: "04", id: "levels", text: "What to log at each level", sub: "And the one thing not to" },
    { t: "dl", items: [
      ["**per run**", "`thread_id`, the question, the final answer, total tokens, total cost, wall time, outcome (answered / degraded / dead-lettered), turn count."],
      ["**per turn**", "Node, model, input and output tokens, latency, finish reason, attempt number."],
      ["**per tool**", "Name, arguments, result size, latency, error, retry count."]
    ] },
    { t: "callout", kind: "tradeoff", title: "Not the full prompt on every span", body: [
      { t: "p", text: "It is the single largest thing you could log, it grows **quadratically** with the conversation (13.1), and it contains whatever the user typed \u2014 so the storage cost and the privacy exposure both scale with exactly the sessions you most want to keep." },
      { t: "p", text: "Log a **hash** plus the token count always, and the full prompt only on failures or a sample. A reported failure is then almost always in the sample, and a working run costs a hash." }
    ] },
    { t: "h2", n: "05", id: "oneq", text: "The one question this has to answer", sub: "Work backwards from it" },
    { t: "p", text: "*\u201cA user says it was wrong at 14:30 \u2014 what happened?\u201d*" },
    { t: "p", text: "Answering it needs the `thread_id` from the user's session, the run within it, the span tree, the tool arguments and results, and the prompt **as it was actually sent**. If any of those is missing, the answer is a guess." },
    { t: "callout", kind: "mental", title: "And the last one is the one usually missing", body: [
      { t: "p", text: "For the good reason in the previous section. The compromise that works is the hash plus token count always, full text on a sample and on **every failure** \u2014 which is what makes the one question answerable without logging every prompt." },
      { t: "p", text: "Designing observability from that question rather than from a list of metrics is also what stops you collecting five dashboards that cannot answer it. Every attribute above is there because its absence turns that answer into a guess." }
    ] },
    { t: "diagram", kind: "tree", title: "The span tree a two-call agent run produces",
      caption: "Nine real spans, collected from LangChain callbacks, nested three deep. A flat log says a tool failed; the **tree** says which agent turn called it with what — and the conditional edge is its own span, so the routing decision is observable.",
      root: { label: "LangGraph", sub: "the run", tone: "accent", children: [
        { label: "agent", sub: "turn 1", tone: "good", children: [
          { label: "model", sub: "llm", tone: "violet" },
          { label: "route", sub: "→ tools", tone: "teal" } ] },
        { label: "tools", sub: "ToolNode", tone: "warn", children: [
          { label: "get_order", sub: "tool", tone: "violet" } ] },
        { label: "agent", sub: "turn 2", tone: "good", children: [
          { label: "model", sub: "llm", tone: "violet" },
          { label: "route", sub: "→ END", tone: "teal" } ] }
      ] } },
    { t: "exercise", kind: "build", title: "Instrument an agent run",
      difficulty: "core", minutes: 32,
      body: "Attach a callback handler to a real agent graph that records each span's id and parent id, run it, and print the resulting tree along with a count by kind. Then list the attributes that make a failed run diagnosable and identify the one whose absence corrupts your metrics. Build the metric that detects a loop in a run that succeeded. Decide what to log at the run, turn and tool levels, and say what should not be logged on every span and why. Finally state the one question the whole setup has to answer.",
      requirements: ["Collect spans from a real agent run with run_id and parent_run_id",
        "Print the tree and a count by span kind",
        "Explain what the tree gives you that a flat log does not",
        "List at least six diagnostic attributes",
        "Identify the attribute that corrupts metrics when missing and explain how",
        "Build the distinct-pairs metric and show it on a looping trajectory",
        "Explain why the recursion limit does not catch that loop",
        "Decide what to log per run, per turn and per tool",
        "Say what not to log on every span and give the compromise",
        "State the question the setup must answer"],
      hint: "Record parent_run_id as well as run_id. Without it you have a list of events rather than a tree.",
      solution: { lang: "python", title: "x1408.py \u2014 9 spans from two model calls",
        code: 'class SpanCollector(BaseCallbackHandler):\n    def _add(self, kind, name, run_id, parent_run_id):\n        self.spans.append((str(run_id),\n                           str(parent_run_id) if parent_run_id else None,\n                           kind, name))\n\n    def on_chain_start(self, serialized, inputs, *, run_id,\n                       parent_run_id=None, **kw): ...\n    def on_chat_model_start(self, serialized, messages, *, run_id,\n                            parent_run_id=None, **kw): ...\n    def on_tool_start(self, serialized, input_str, *, run_id,\n                      parent_run_id=None, **kw): ...\n\napp.invoke({"messages": [HumanMessage(content="...")]},\n           {"callbacks": [SpanCollector()]})',
        out: "==============================================================================\nPART 1 -- the span tree one agent run actually produces\n==============================================================================\n  spans recorded: 9\n    chain LangGraph\n      chain agent\n        llm   model\n        chain route\n      chain tools\n        tool  get_order\n      chain agent\n        llm   model\n        chain route\n  by kind: [('chain', 6), ('llm', 2), ('tool', 1)]\n\n  so a two-model-call agent run produced 9 spans at several levels of\n  nesting. the tree is what makes a failure locatable: a flat log of\n  these events tells you a tool failed, and the tree tells you which\n  agent turn called it with what.\n\n==============================================================================\nPART 2 -- the attributes that make a failed run diagnosable\n==============================================================================\n  the span tree gives you structure. these make it USEFUL, and none\n  of them are there by default:\n\n    thread_id        so a failure maps to a conversation (14.6).\n    checkpoint_id    so it maps to a resumable point (10.8).\n    node name        which graph node this span belongs to.\n    tool arguments   the ONLY way to spot a duplicate call (12.8).\n    token counts     input and output, per call -- 13.1's cumulative\n                     cost is not computable without them.\n    the model's\n      finish reason  a truncated answer and a complete one look the\n                     same in the content.\n    the retry\n      attempt number so three attempts do not read as three runs.\n\n  the attempt number is the one that silently corrupts metrics. 14.3\n  measured a node running three times inside one successful run -- so\n  without it, p99 latency and cost per run are both wrong, and a\n  duplicate-call detector fires on retries that were working as\n  configured.\n\n==============================================================================\nPART 3 -- the metric that catches a silent loop\n==============================================================================\n  a trajectory from a run that SUCCEEDED:\n    get_order -> get_policy -> get_order -> get_policy -> get_order -> get_policy\n    distinct (tool, args) pairs : 2\n    repeat calls                : 4\n\n  this run finished, returned an answer, and never hit the recursion\n  limit -- 10.x measured that default at 10007 supersteps, so a loop\n  making two calls a turn has a long way to go before anything stops\n  it. the only signal is the repetition.\n\n  so: COUNT DISTINCT (tool, arguments) PAIRS PER RUN AND COMPARE\n  AGAINST THE TOTAL. the ratio is near 1.0 for a healthy run and\n  falls as a loop develops. it needs no labels, no gold answer and no\n  model call -- it is a group-by over the trace.\n\n==============================================================================\nPART 4 -- what to log at each level, and what not to\n==============================================================================\n  per run      thread_id, question, final answer, total tokens, total\n               cost, wall time, outcome (answered / degraded /\n               dead-lettered), turn count.\n  per turn     node, model, input and output tokens, latency, finish\n               reason, attempt number.\n  per tool     name, arguments, result size, latency, error, retry\n               count.\n\n  NOT the full prompt on every span. it is the single largest thing\n  you could log, it grows quadratically with the conversation (13.1),\n  and it contains whatever the user typed -- so the storage cost and\n  the privacy exposure both scale with exactly the sessions you most\n  want to keep. log a hash plus the token count, and the full prompt\n  only on failures or a sample.\n\n==============================================================================\nPART 5 -- the one dashboard question these have to answer\n==============================================================================\n  'a user says it was wrong at 14:30 -- what happened?'\n\n  answering it needs: the thread_id from the user's session, the run\n  within it, the span tree, the tool arguments and results, and the\n  prompt as it was actually sent. if any of those is missing the\n  answer is a guess.\n\n  and the last one is the one usually missing, for the good reason in\n  part 4. the compromise that works is to log the prompt's HASH plus\n  its token count always, and the full text on a sample and on every\n  failure -- so a reported failure is almost always in the sample, and\n  a working run costs a hash.",
        notes: [
          { t: "p", text: "**A two-model-call run produced 9 spans** \u2014 6 chain, 2 llm, 1 tool \u2014 nested three deep." },
          { t: "p", text: "**The tree makes a failure locatable**: a flat log says a tool failed, the tree says which turn called it with what." },
          { t: "p", text: "**The conditional edge is its own span**, so the routing decision is observable \u2014 a misroute and a bad answer look identical from the output." },
          { t: "p", text: "**None of the diagnostic attributes are there by default**: thread id, checkpoint id, node, tool arguments, token counts, finish reason, attempt number." },
          { t: "p", text: "**The attempt number is the one that corrupts metrics when missing**, because a node can run three times inside one SUCCESSFUL run (14.3)." },
          { t: "p", text: "**So p99 latency and cost per run are both wrong**, and a duplicate-call detector fires on working retries." },
          { t: "p", text: "**The loop metric is distinct (tool, args) pairs against the total** \u2014 near 1.0 when healthy, falling as a loop develops." },
          { t: "p", text: "**The recursion limit does not catch it**: the default is 10007 supersteps, so a two-call loop is nowhere near it." },
          { t: "p", text: "**Do not log the full prompt on every span** \u2014 it is the largest thing available, grows quadratically (13.1) and contains user input." },
          { t: "p", text: "**Work backwards from one question**: \u2018a user says it was wrong at 14:30 \u2014 what happened?\u2019 Every attribute is there because its absence makes that a guess." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the p99 that was three retries", body: [
      { t: "p", text: "A team's p99 agent latency is four times the p50 and nobody can find the slow component. Traces of the slow runs show the same nodes as the fast ones, taking similar time each. A duplicate-call alert also fires constantly on runs that look correct." },
      { t: "p", text: "The spans carry no retry attempt number, so a node that ran three times inside one successful run appears as three identical spans with no indication they are the same step. That inflates the run's total latency and cost, and it is also what the duplicate-call detector is seeing \u2014 retries working exactly as configured, reported as redundant work." },
      { t: "p", text: "Adding the attempt number to every span separates the two populations immediately: runs with retries, and runs that are genuinely slow. It also makes the duplicate-call metric usable, by letting it exclude repeats that share a step and an attempt lineage. The general point is that retries, fallbacks and degradations are invisible successes, and every one of them distorts the numbers used to judge the system unless it is labelled as what it is." }
    ] }
  ],
  takeaways: [
    "**A two-model-call agent run produced 9 spans**, nested three deep.",
    "**The tree makes a failure locatable** where a flat log only says something failed.",
    "**The conditional edge is its own span**, so routing decisions are observable.",
    "**None of the diagnostic attributes are present by default.**",
    "**The retry attempt number is the one that corrupts metrics when missing** (14.3).",
    "**Because a node can run three times inside one successful run**, inflating latency and cost.",
    "**And firing a duplicate-call detector on retries that worked as configured.**",
    "**Retries, fallbacks and degradations are invisible successes** that all distort the numbers.",
    "**The loop metric is distinct (tool, args) pairs against the total**, near 1.0 when healthy.",
    "**No labels, no gold answer, no model call** \u2014 a group-by over the trace.",
    "**The recursion limit does not catch a semantic loop**: 10007 supersteps by default.",
    "**Log per run, per turn and per tool** \u2014 three levels with different fields.",
    "**Do not log the full prompt on every span**: largest, quadratic (13.1), and full of user input.",
    "**Work backwards from \u2018a user says it was wrong at 14:30 \u2014 what happened?\u2019**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Which missing span attribute silently corrupts latency and cost metrics?",
      options: ["The node name",
        "The retry attempt number, because a node can run three times inside one successful run",
        "The checkpoint id",
        "The model's finish reason"],
      answer: 1,
      why: "A retried node produces several spans for one logical step, so without the attempt number the run's total latency and cost are inflated and a duplicate-call detector fires on retries that were working as configured. The general shape is that retries, fallbacks and degradations are invisible successes, and each one distorts the numbers unless labelled." },
    { stem: "What metric detects an agent looping in a run that completed successfully?",
      options: ["The recursion limit being approached",
        "Distinct (tool, arguments) pairs compared against the total number of calls",
        "Wall time against the p50",
        "The number of spans in the trace"],
      answer: 1,
      why: "A semantic loop advances the graph legitimately, so the structural limit \u2014 10007 supersteps by default \u2014 is nowhere near being reached. The only signal is repetition, and the ratio of distinct pairs to total calls is near 1.0 for a healthy run and falls as a loop develops. It is a group-by over traces with no labels or model calls needed." },
    { stem: "Why should the full prompt not be logged on every span?",
      options: ["Providers forbid storing prompts",
        "It is the largest thing available, grows quadratically with the conversation, and contains user input \u2014 so cost and privacy exposure scale with the sessions you most want to keep",
        "It cannot be serialised reliably",
        "It would break the span tree structure"],
      answer: 1,
      why: "Each turn's prompt carries the whole history, so logging it everywhere stores the conversation once per turn. The practical compromise is a hash plus token count on every span, with the full text on a sample and on every failure \u2014 which keeps reported failures almost always inside the sample while a working run costs a hash." },
    { stem: "What does the span tree give you that a flat event log does not?",
      options: ["Lower storage cost",
        "Locatability \u2014 which agent turn called the failing tool, with what, after which previous result",
        "Accurate token counts",
        "Protection against losing spans"],
      answer: 1,
      why: "A flat log reports that a tool failed; the tree reports where in the run's structure it failed, which is the difference between a stack trace and a line number. It also records the conditional edge as its own span, making the routing decision observable \u2014 and a misrouted run looks identical to a badly-answered one from the output alone." }
  ] },
  interview: { title: "Interview practice", sub: "Observability", questions: [
    { level: "core", q: "What would you instrument on an agent?",
      strong: "A strong answer works backwards from a diagnostic question.",
      answer: [
        { t: "p", text: "I would work backwards from one question: a user says it was wrong at 14:30 \u2014 what happened? Everything I collect is there because its absence turns that answer into a guess." },
        { t: "p", text: "Answering it needs the thread id from their session, the run within it, the span tree, the tool arguments and results, and the prompt as it was actually sent. The span tree I have measured \u2014 a two-model-call run produces about nine spans nested three deep, and the tree is what makes a failure locatable rather than merely reported." },
        { t: "p", text: "The attributes that matter are not there by default: thread id, checkpoint id, node name, tool arguments, input and output token counts, the finish reason, and the retry attempt number." },
        { t: "p", text: "The attempt number is the one I would not skip, because its absence corrupts data quietly. A node can run three times inside one successful run, so without it the p99 latency and cost per run are both wrong, and a duplicate-call detector fires on retries that were working exactly as configured." },
        { t: "p", text: "What I would not log is the full prompt on every span. It is the largest thing available, it grows quadratically with the conversation, and it contains whatever the user typed \u2014 so cost and privacy exposure both scale with the sessions I most want to keep. A hash plus token count always, full text on a sample and on every failure." }
      ] },
    { level: "advanced", q: "How would you detect an agent that is looping but succeeding?",
      strong: "A strong answer rejects the recursion limit and gives the group-by.",
      answer: [
        { t: "p", text: "By counting distinct tool-and-arguments pairs per run and comparing against the total number of calls." },
        { t: "p", text: "The recursion limit is no help, which is the part worth being explicit about. A loop that is re-deriving the same next step is making legitimate progress by the graph's reckoning, and the default limit is 10007 supersteps \u2014 so a loop making two calls a turn has an extremely long way to go, and at roughly a cent a call that is over a hundred dollars of spend before anything stops it." },
        { t: "p", text: "I measured a trajectory with six calls over two distinct pairs. The run finished, answered, and nothing in it was an error. The only signal was the repetition." },
        { t: "p", text: "So the ratio of distinct pairs to total calls is near 1.0 for a healthy run and falls as a loop develops. It needs no labels, no gold answer and no model call \u2014 it is a group-by over traces I am already producing, which is why I would add it before any labelled evaluation exists." },
        { t: "p", text: "The one prerequisite is logging tool arguments, not just tool names. Without the arguments you cannot distinguish a legitimate second lookup of a different order from the same lookup repeated. And the attempt number has to be there too, or retries read as duplicates and the metric is unusable." }
      ] },
    { level: "advanced", q: "Would you use a hosted tracing product or build your own?",
      strong: "A strong answer takes the hosted tree and adds the attributes.",
      answer: [
        { t: "p", text: "Hosted for the span tree, and I would still have to add most of what makes it useful \u2014 so the real answer is both, with a clear division." },
        { t: "p", text: "What a hosted product gives you well is the tree itself: nesting, timing, and a UI for walking it. Building that is real work and it is not the interesting work \u2014 I collected a tree from callbacks to understand the shape, and a two-model-call run was nine spans nested three deep, which is already awkward to read in a terminal." },
        { t: "p", text: "What it does not give you is the attributes, because they are specific to how my graph is built. The thread id, the checkpoint id, the node name, the tool arguments, the finish reason, and the retry attempt number all have to be attached deliberately." },
        { t: "p", text: "The attempt number is the one I would check first in any setup, hosted or not, because its absence corrupts data quietly. A node can run three times inside one successful run, so without it p99 latency and cost per run are both wrong and a duplicate-call detector fires on retries that were working as configured." },
        { t: "p", text: "I would also want the derived metrics computed outside whatever the product offers \u2014 particularly distinct tool-and-arguments pairs against total calls, which is the only signal for a loop that is succeeding. That is a group-by, and it is better owned by me than by a dashboard I cannot change." },
        { t: "p", text: "And the prompt-logging policy I would set myself regardless: a hash and token count on every span, full text on a sample and on every failure. Hosted products will happily store every prompt, which grows quadratically with conversation length and contains whatever the user typed." }
      ] }
  ] }
});

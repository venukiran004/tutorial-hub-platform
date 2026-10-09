EC.receiveLesson({
  id: "14.7",
  lede: "Four runs, scored two ways, and the scores **disagree on three of them** \u2014 each disagreement a different bug. A run that got the right answer from a **web search** instead of the order system scores 1.0 on outcome and 0.0 on trajectory: it **guessed**, and it will be wrong on the next order while the outcome score stays silent. A run that called `get_order` **three times** scores 1.0 on outcome and on subset-trajectory, hiding a cost bug. And a run that took the perfect path and then **failed to answer** scores 0.0 on outcome and 1.0 on trajectory, which localises the bug to generation. Outcome-only reported **0.75** for this system. *\u201cRight answer, wrong source\u201d* is the category that justifies trajectory scoring on its own, because it is indistinguishable from success on **every** output metric.",
  objectives: [
    "Score the same runs on outcome and on trajectory",
    "Show what each disagreement between them means",
    "Explain why exact-match trajectory scoring fights improvement",
    "Build the composite that separates three different bugs",
    "List the measurements that need no labels at all"
  ],
  prerequisites: ["14.6", "12.8"],
  blocks: [
    { t: "h2", n: "01", id: "four", text: "Four runs, two scores", sub: "Disagreeing on three" },

    {"kind": "matrix", "title": "The two scores disagreed on three of four runs", "caption": "Each disagreement is a different bug. *“Right answer, wrong source”* justifies trajectory scoring on its own, because it is indistinguishable from success on **every** output metric — exact match, an LLM judge, a human reading the answer.", "cols": ["outcome", "trajectory", "duplicates", "what it means"], "rows": ["run 1 — the ideal path", "run 2 — search_web only", "run 3 — 3x get_order", "run 4 — no answer"], "cells": [[{"text": "1.0", "tone": "good"}, {"text": "1.0", "tone": "good"}, "no", {"text": "pass", "tone": "good"}], [{"text": "1.0", "tone": "good"}, {"text": "0.0", "tone": "crit"}, "no", {"text": "it GUESSED", "tone": "crit"}], [{"text": "1.0", "tone": "good"}, {"text": "subset 1.0", "tone": "warn"}, {"text": "yes", "tone": "crit"}, {"text": "a cost bug", "tone": "warn"}], [{"text": "0.0", "tone": "crit"}, {"text": "1.0", "tone": "good"}, "no", {"text": "fails at generation", "tone": "warn"}]], "t": "diagram", "id": "dg-14_7-01-0"},




    { t: "code", lang: "text", title: "The same question, four trajectories",
      code: "run    outcome  traj(exact)  traj(subset)  trajectory\nrun 1    1.0      1.0          1.0         get_order -> get_policy\nrun 2    1.0      0.0          0.0         search_web\nrun 3    1.0      0.0          1.0         get_order -> get_order ->\n                                           get_order -> get_policy\nrun 4    0.0      1.0          1.0         get_order -> get_policy",
      caption: "Only run 1 is unambiguous." },
    { t: "dl", items: [
      ["**run 2** \u2014 outcome 1.0, trajectory 0.0", "The right answer from a **web search** instead of the order system. So it was guessed, or the test data leaked into the prompt. It will be wrong on the next order and the outcome score will not have warned you."],
      ["**run 3** \u2014 outcome 1.0, exact 0.0, subset 1.0", "Correct, and it called `get_order` **three times**. A cost and latency bug that both outcome scoring and subset scoring miss."],
      ["**run 4** \u2014 outcome 0.0, trajectory 1.0", "It did everything right and then failed to answer \u2014 which **localises** the bug to the final generation rather than the tools."]
    ] },
    { t: "h2", n: "02", id: "neither", text: "Neither score is sufficient", sub: "And they fail differently" },
    { t: "code", lang: "text", title: "Aggregated over the four runs",
      code: "outcome only        0.75\ntrajectory (exact)  0.50\ntrajectory (subset) 0.75",
      caption: "0.75 for a system where one run guessed and one did triple the work." },
    { t: "callout", kind: "trap", title: "Exact-match trajectory scoring has a worse problem", body: [
      { t: "p", text: "It assumes **one** correct path. For most questions there are several, so a perfectly good alternative route scores zero \u2014 which makes the metric **fight any improvement** to the agent's planning." },
      { t: "p", text: "And it penalised run 3 for being inefficient rather than wrong. That is the right signal in the wrong column: efficiency is worth measuring and it should not come out of the correctness score." }
    ] },
    { t: "h2", n: "03", id: "composite", text: "The composite that works", sub: "Three measurements, not one" },
    { t: "code", lang: "text", title: "Outcome, required tools, duplicates",
      code: "run 1  outcome=1 required_tools=1 duplicates=no   PASS\nrun 2  outcome=1 required_tools=0 duplicates=no   SUSPECT -- right\n                                                  answer, wrong source\nrun 3  outcome=1 required_tools=1 duplicates=yes  pass, inefficient\nrun 4  outcome=0 required_tools=1 duplicates=no   FAIL at generation",
      caption: "Each verdict maps to a **different fix**." },
    { t: "callout", kind: "insight", title: "\u201cRight answer, wrong source\u201d justifies trajectory scoring on its own", body: [
      { t: "p", text: "It is **indistinguishable from success** on every output-based metric \u2014 exact match, BLEU, an LLM judge, a human reading the answer. All of them see a correct response." },
      { t: "p", text: "And it is the failure that **generalises worst**: the agent is right on your test set and wrong in production, because the mechanism that produced the right answer was not the mechanism you intended. 7.1's lesson applies \u2014 a plausible path to the right output is not evidence the path was used." }
    ] },
    { t: "h2", n: "04", id: "labels", text: "What the labelled set has to contain", sub: "And the field people leave out" },
    { t: "p", text: "For each case: the question, the expected answer, **and** the set of tools a correct answer requires. That last field is the expensive one to produce and the one that makes trajectory scoring possible at all." },
    { t: "callout", kind: "tradeoff", title: "Which is why most agent evaluation is outcome-only", body: [
      { t: "p", text: "Not because trajectory scoring is disputed \u2014 because the labels for it **do not exist**. Producing them means someone deciding, per question, which sources a correct answer must consult." },
      { t: "p", text: "The cheap approximation: assert that certain tools **must** appear and certain tools must **not**. *\u201cAnswers about an order must call `get_order`\u201d* and *\u201cmust not call `search_web`\u201d* catches run 2 without labelling a full path, and it is one line per case." }
    ] },
    { t: "h2", n: "05", id: "nolabels", text: "The measurements that need no labels", sub: "And catch real bugs" },
    { t: "dl", items: [
      ["**duplicate tool calls**", "Same tool, same arguments, one run (12.8). Caught run 3."],
      ["**tool error rate**", "Per tool. A tool failing 40% of the time is a dependency problem wearing an agent costume."],
      ["**turns per run**", "As a distribution. The tail is where the loops are."],
      ["**cost per run**", "The one that catches a run that succeeded expensively (13.1)."],
      ["**fallback rate**", "How often the default branch fired. A classifier whose unmapped-output branch fires 8% of the time is misrouting 8% of traffic (12.2)."]
    ] },
    { t: "callout", kind: "good", title: "None of these tell you whether the answer was right", body: [
      { t: "p", text: "And all of them tell you something an outcome score cannot. So they are worth having **before** a labelled set exists \u2014 which is the practical order most teams end up in anyway, and there is no reason to treat it as a compromise." },
      { t: "p", text: "They also come from traces you are already producing (14.8), so the marginal cost is a group-by rather than a labelling project." }
    ] },
    { t: "exercise", kind: "analysis", title: "Evaluate an agent two ways",
      difficulty: "advanced", minutes: 36,
      body: "Take several runs of the same question with different trajectories and score each on outcome and on trajectory, using both exact-match and subset trajectory scoring. Identify each disagreement and say which bug it indicates. Aggregate the scores and explain what each aggregate hides. Explain why exact-match trajectory scoring fights improvements to the agent. Build a composite verdict from three measurements. Say what a labelled set must contain, give a cheap approximation, and list the measurements that need no labels.",
      requirements: ["Score at least four runs on outcome and trajectory",
        "Use both exact-match and subset trajectory scoring",
        "Explain each disagreement and the bug it indicates",
        "Aggregate and say what the aggregate hides",
        "Explain why exact-match scoring fights improvement",
        "Build a composite verdict from three measurements",
        "Say why 'right answer, wrong source' justifies trajectory scoring alone",
        "State what a labelled set must contain and the cheap approximation",
        "List at least four measurements that need no labels"],
      hint: "Include a run that gets the right answer from the wrong tool. Every output-based metric scores it as a success.",
      solution: { lang: "python", title: "x1407.py \u2014 the scores disagree on three of four runs",
        code: 'GOLD_ANSWER, GOLD_TRAJ = "refunded within 5 days", ["get_order", "get_policy"]\n\ndef score_outcome(r):\n    return 1.0 if GOLD_ANSWER in r["answer"] else 0.0\n\ndef score_trajectory(r):            # exact match on the tool sequence\n    return 1.0 if r["traj"] == GOLD_TRAJ else 0.0\n\ndef score_traj_subset(r):           # every required tool used, extras allowed\n    return 1.0 if set(GOLD_TRAJ) <= set(r["traj"]) else 0.0\n\n# run 2: answer correct, trajectory [\'search_web\'] -> it GUESSED',
        out: "==============================================================================\nPART 1 -- four runs, scored two ways\n==============================================================================\n  run    outcome  traj(exact)  traj(subset)  trajectory\n  run 1    1.0      1.0          1.0         get_order -> get_policy\n  run 2    1.0      0.0          0.0         search_web\n  run 3    1.0      0.0          1.0         get_order -> get_order -> get_order -> get_policy\n  run 4    0.0      1.0          1.0         get_order -> get_policy\n\n  the two scores DISAGREE on three of the four runs, and each\n  disagreement is a different bug:\n\n    run 2  outcome 1.0, trajectory 0.0. the right answer from a web\n           search instead of the order system -- so it was GUESSED,\n           or the test data leaked into the prompt. it will be wrong\n           on the next order and the outcome score will not have\n           warned you.\n    run 3  outcome 1.0, exact 0.0, subset 1.0. correct, and it called\n           get_order three times. a cost and latency bug that both\n           outcome scoring and subset scoring miss.\n    run 4  outcome 0.0, trajectory 1.0. it did everything right and\n           then failed to answer -- which localises the bug to the\n           final generation rather than the tools.\n\n==============================================================================\nPART 2 -- so neither score is sufficient, and they fail differently\n==============================================================================\n  aggregate over 4 runs:\n    outcome only        0.75\n    trajectory (exact)  0.50\n    trajectory (subset) 0.75\n\n  outcome-only reports 0.75 for a system where one run guessed and one\n  did three times the work. trajectory-exact reports 0.50 and\n  penalises run 3 for being inefficient rather than wrong, which is\n  the right signal in the wrong column.\n\n  and exact-match trajectory scoring has a worse problem: it assumes\n  ONE correct path. for most questions there are several, so a\n  perfectly good alternative route scores zero -- which makes the\n  metric fight any improvement to the agent's planning.\n\n==============================================================================\nPART 3 -- the composite that actually works\n==============================================================================\n    run 1  outcome=1 required_tools=1 duplicates=no   PASS\n    run 2  outcome=1 required_tools=0 duplicates=no   SUSPECT -- right answer, wrong source\n    run 3  outcome=1 required_tools=1 duplicates=yes  pass, inefficient\n    run 4  outcome=0 required_tools=1 duplicates=no   FAIL at generation\n\n  three measurements, not one: did it answer correctly, did it use the\n  required sources, and did it do redundant work. each maps to a\n  different fix, which is the whole reason to separate them.\n\n  'right answer, wrong source' is the category that justifies\n  trajectory scoring on its own. it is indistinguishable from success\n  on every output-based metric, and it is the failure that generalises\n  worst -- the agent is right on your test set and wrong in\n  production.\n\n==============================================================================\nPART 4 -- what a labelled set has to contain for this to work\n==============================================================================\n  for each case: the question, the expected answer, AND the set of\n  tools a correct answer requires. that last field is the expensive\n  one to produce and the one that makes trajectory scoring possible.\n\n  it is also the field people leave out, which is why most agent\n  evaluation is outcome-only -- not because trajectory scoring is\n  disputed, but because the labels for it do not exist.\n\n  a cheap approximation if you cannot label paths: assert that certain\n  tools MUST appear and certain tools must NOT. 'answers about an\n  order must call get_order' and 'must not call search_web' catches\n  run 2 without labelling a full path, and it is one line per case.\n\n==============================================================================\nPART 5 -- and the measurements that need no labels at all\n==============================================================================\n  these come free from traces and catch real bugs:\n\n    duplicate tool calls   same tool, same arguments, one run (12.8).\n                           caught run 3.\n    tool error rate        per tool. a tool failing 40% of the time is\n                           a dependency problem wearing an agent\n                           costume.\n    turns per run          as a distribution. the tail is where the\n                           loops are.\n    cost per run           the one that catches a run that succeeded\n                           expensively (13.1).\n    fallback rate          how often the default branch fired. a\n                           classifier whose unmapped-output branch\n                           fires 8% of the time is misrouting 8% of\n                           traffic (12.2).\n\n  none of these tell you whether the answer was right, and all of\n  them tell you something an outcome score cannot. so they are worth\n  having BEFORE a labelled set exists, which is the practical order\n  most teams end up in anyway.",
        notes: [
          { t: "p", text: "**The two scores disagreed on three of four runs**, and each disagreement was a different bug." },
          { t: "p", text: "**Right answer from a web search = it guessed**, and it will be wrong on the next order with no warning from the outcome score." },
          { t: "p", text: "**Three identical tool calls = a cost bug** that outcome scoring and subset scoring both miss." },
          { t: "p", text: "**Perfect path and no answer = a generation bug**, which trajectory scoring localises for you." },
          { t: "p", text: "**Outcome-only reported 0.75** for a system where one run guessed and one did triple the work." },
          { t: "p", text: "**Exact-match trajectory scoring assumes ONE correct path**, so a good alternative route scores zero and the metric fights improvement." },
          { t: "p", text: "**So use three measurements**: did it answer correctly, did it use the required sources, did it do redundant work." },
          { t: "p", text: "**\u2018Right answer, wrong source\u2019 justifies trajectory scoring on its own** \u2014 it is indistinguishable from success on every output metric." },
          { t: "p", text: "**The labelled set needs the required tools per question**, which is the expensive field people leave out \u2014 hence outcome-only evaluation." },
          { t: "p", text: "**And five measurements need no labels at all**: duplicate calls, tool error rate, turns per run, cost per run, fallback rate." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: 94% on the eval set, wrong in production", body: [
      { t: "p", text: "An agent scores 94% on a 200-case evaluation set built from real support tickets with reviewed answers. In production it gives confidently wrong account details. The eval set is re-run and still scores 94%." },
      { t: "p", text: "The evaluation is outcome-only, so it cannot see how the answers were produced. A run that reaches the right answer without consulting the account system scores identically to one that looked it up \u2014 and 'right answer, wrong source' is indistinguishable from success on every output-based metric, including an LLM judge and a human reading the response. On the eval set the answers happen to be inferable; in production they are not." },
      { t: "p", text: "The cheap fix does not require relabelling 200 cases: assert per case that certain tools must appear and certain tools must not. 'An answer about an account must call get_account' is one line and catches the whole class. Alongside that, the label-free metrics from traces \u2014 duplicate tool calls, tool error rate, turn distribution, cost per run, fallback firing rate \u2014 none of which say whether an answer was right, and all of which say something the 94% cannot." }
    ] }
  ],
  takeaways: [
    "**The two scores disagreed on three of four runs**, each a different bug.",
    "**Right answer from the wrong source = it guessed**, and outcome scoring stays silent.",
    "**Three identical tool calls = a cost bug** missed by outcome and subset scoring alike.",
    "**Perfect path and no answer = a generation bug**, which trajectory scoring localises.",
    "**Outcome-only reported 0.75** for a system with a guess and a triple-call in it.",
    "**Exact-match trajectory scoring assumes one correct path.**",
    "**So a good alternative route scores zero**, and the metric fights improvement.",
    "**And it penalises inefficiency in the correctness column** \u2014 right signal, wrong place.",
    "**Use three measurements**: correct answer, required sources, redundant work.",
    "**Each maps to a different fix**, which is the reason to separate them.",
    "**\u2018Right answer, wrong source\u2019 justifies trajectory scoring on its own.**",
    "**Because it is indistinguishable from success on every output metric**, judge included.",
    "**The labelled set needs the required tools per question** \u2014 the field people leave out.",
    "**Five measurements need no labels**: duplicate calls, tool error rate, turns, cost, fallback rate."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A run produces the correct answer but reached it with a web search instead of the order system. What does that indicate?",
      options: ["An acceptable alternative path",
        "It guessed or the answer leaked into the prompt \u2014 so it will be wrong on the next case, and outcome scoring cannot see it",
        "A tool description problem only",
        "The trajectory label was wrong"],
      answer: 1,
      why: "The mechanism that produced the right output was not the intended one, so the result does not generalise: right on the test set, wrong in production. And it scores 1.0 on every output-based metric including an LLM judge, which is why this single category justifies trajectory scoring even when nothing else does." },
    { stem: "Why is exact-match trajectory scoring a poor primary metric?",
      options: ["It is expensive to compute",
        "It assumes one correct path, so a good alternative route scores zero and the metric fights improvements to planning",
        "It cannot detect duplicate calls",
        "It requires the answer to be labelled too"],
      answer: 1,
      why: "Most questions have several valid routes, so an agent that finds a better one is penalised \u2014 the metric opposes exactly the change you want. It also scored a correct-but-redundant run at zero, putting an efficiency signal in the correctness column. Subset scoring plus a separate duplicate check separates those concerns." },
    { stem: "A run takes the ideal trajectory and then produces no useful answer. What is the value of knowing that?",
      options: ["It confirms the trajectory labels are correct",
        "It localises the bug to the final generation rather than the tools or the routing",
        "It means the tools returned nothing",
        "It indicates the budget was exhausted"],
      answer: 1,
      why: "Outcome scoring alone says the run failed and says nothing about where. With the trajectory scoring 1.0, every tool was called correctly and the data was present, so the defect is in how the final response was produced \u2014 a prompt or truncation issue. Separating the scores turns a failure into a located failure." },
    { stem: "Which measurement requires no labelled data and still catches a real bug?",
      options: ["Outcome accuracy against a gold answer",
        "Duplicate tool calls \u2014 the same tool with the same arguments twice in one run",
        "Trajectory exact match",
        "Answer relevance judged by a model"],
      answer: 1,
      why: "It is a group-by over traces you already produce, needs no gold answer, and caught the run that called the same lookup three times. The same applies to tool error rate, turn count as a distribution, cost per run and fallback firing rate \u2014 none say whether an answer was right, and all say something an outcome score cannot." }
  ] },
  interview: { title: "Interview practice", sub: "Agent evaluation", questions: [
    { level: "advanced", q: "How do you evaluate an agent?",
      strong: "A strong answer scores outcome and trajectory separately.",
      answer: [
        { t: "p", text: "On three things separately: did it answer correctly, did it use the sources a correct answer requires, and did it do redundant work. Each maps to a different fix, which is the reason not to combine them." },
        { t: "p", text: "The reason outcome alone is not enough is a category I would call 'right answer, wrong source'. I scored four runs two ways and they disagreed on three. One got the correct answer from a web search instead of the order system \u2014 so it guessed, or the answer leaked into the prompt, and it will be wrong on the next order." },
        { t: "p", text: "That failure is indistinguishable from success on every output-based metric. Exact match, an LLM judge, a human reading the answer \u2014 all of them see a correct response. It is also the failure that generalises worst, because the mechanism that produced the right output was not the one you intended." },
        { t: "p", text: "The other two disagreements were useful too. A run that called the same lookup three times scored 1.0 on outcome, hiding a cost bug. And a run that took the perfect path and then failed to answer scored 0.0 on outcome and 1.0 on trajectory, which localises the bug to generation rather than to the tools." },
        { t: "p", text: "Aggregated, outcome-only reported 0.75 for that set \u2014 a system containing a guess and a triple-call." }
      ] },
    { level: "advanced", q: "Trajectory scoring sounds expensive. Is it worth it?",
      strong: "A strong answer offers the cheap approximation and the label-free metrics.",
      answer: [
        { t: "p", text: "The expensive version is, and I would not start there \u2014 there is a cheap approximation that catches the main thing." },
        { t: "p", text: "The expensive part is the label: for each case, the set of tools a correct answer requires. That is the field most teams leave out, which is why most agent evaluation is outcome-only \u2014 not because trajectory scoring is disputed but because the labels do not exist." },
        { t: "p", text: "And exact-match scoring on a full path is actively bad as a primary metric, because it assumes one correct route. Most questions have several, so an agent that finds a better one scores zero, and the metric fights the improvement you want." },
        { t: "p", text: "The cheap version is assertions: certain tools must appear and certain tools must not. 'An answer about an order must call get_order and must not call search_web' is one line per case and catches the right-answer-wrong-source class without labelling a path." },
        { t: "p", text: "Then the metrics that need no labels at all, which I would have first because they come from traces I already produce: duplicate tool calls, tool error rate per tool, turn count as a distribution rather than a mean, cost per run, and the firing rate of every fallback branch." },
        { t: "p", text: "None of those say whether an answer was right, and every one says something an outcome score cannot. A default branch firing 8% of the time means 8% of traffic is being misrouted, and no accuracy number will tell you that." }
      ] },
    { level: "core", q: "How would you build an evaluation set for an agent from scratch?",
      strong: "A strong answer starts with label-free metrics and real traffic.",
      answer: [
        { t: "p", text: "I would start with the measurements that need no labels, because they are available immediately and they catch real bugs while the labelled set is being built." },
        { t: "p", text: "From traces: duplicate tool calls, tool error rate per tool, turn count as a distribution rather than a mean, cost per run, and the firing rate of every fallback branch. None of those say whether an answer was right, and each says something an accuracy number cannot \u2014 a default branch firing 8% of the time means 8% of traffic is being misrouted." },
        { t: "p", text: "Then the labelled set from real traffic rather than invented questions, because the distribution is the point. I would sample across question types and deliberately over-sample the ones that failed, since those are where the information is." },
        { t: "p", text: "Each case needs three fields: the question, the expected answer, and the tools a correct answer requires. That third one is the expensive field and the one teams leave out, which is why most agent evaluation ends up outcome-only." },
        { t: "p", text: "If labelling full paths is too expensive, the cheap version is assertions \u2014 certain tools must appear, certain tools must not. 'An order question must call get_order and must not call search_web' is one line per case and catches the right-answer-wrong-source class, which is the failure that scores 1.0 on every output metric including an LLM judge." },
        { t: "p", text: "And I would score outcome and trajectory separately rather than combining them, because the disagreements are the informative part: right answer with the wrong path is a guess, right answer with redundant calls is a cost bug, and wrong answer with the right path localises the problem to generation." }
      ] }
  ] }
});

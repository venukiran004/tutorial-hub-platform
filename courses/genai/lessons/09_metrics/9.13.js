EC.receiveLesson({
  id: "9.13",

  lede: "Agent-as-a-Judge grades a **trajectory** rather than an answer, and the metrics that only exist once a model can act. The framing worth carrying from 9.7: a single agent run is a **sample**, not a measurement \u2014 so every agent number should be a pass@k with its sampling budget attached, and the pass@1-to-pass@5 gap is the instability budget that tells you whether retries will help.",

  objectives: [
    "Say what Agent-as-a-Judge grades that an answer judge cannot",
    "Name the metrics that only exist for an acting model",
    "Explain why a single agent run is a sample rather than a measurement",
    "Use cost and latency per resolved task correctly",
    "Choose between gold-trace matching, trajectory judging and outcome scoring"
  ],

  prerequisites: ["9.10", "8.9"],

  blocks: [

    { t: "h2", n: "01", id: "ajudge", text: "Agent-as-a-Judge",
      sub: "The unit is a path, not an answer" },

    { t: "p", text: "An answer judge sees a question and a response. An agent judge sees the whole trace \u2014 which tools were called, with what arguments, in what order, what came back, and how the agent reacted to a failure. That is a different object and it supports judgements an answer judge cannot make." },

    { t: "callout", kind: "insight", title: "The judgement it adds is \u201cwas this a reasonable way to get there\u201d",
      body: [
        { t: "p", text: "An answer judge can tell you the final answer was right. Only a trajectory judge can tell you the agent reached it by calling the correct tool with sensible arguments rather than by luck \u2014 and 8.9 argued that distinction matters more for agents than for answers, because actions have side effects." },
        { t: "p", text: "7.9 made the same point about outcome reward models: a model reaching the right answer through invalid reasoning is reinforced exactly as much as one reasoning correctly, which over many steps selects for lucky-looking behaviour. An outcome-scored agent has the identical defect." },
        { t: "p", text: "So a trajectory judge is the tool for the case where the path matters \u2014 and the case where it genuinely does not is narrower than it looks, because a read-only agent with a free path is a minority of real deployments." }
      ] },

    { t: "callout", kind: "good", title: "But most of what you want is deterministic and needs no judge",
      body: [
        { t: "p", text: "8.9 split the dimensions by cost, and that split is the practical shape here. Tool selection, argument **schema** validity, whether anything was cited, a step cap, whether an error path was reached, cost and latency \u2014 all assertions over the trace with no model call." },
        { t: "p", text: "What genuinely needs a judge is argument **semantics** \u2014 a syntactically perfect call that asks the wrong question \u2014 and overall path quality. Those two are worth sampling; the rest belongs in CI where frequency is free." },
        { t: "p", text: "That ordering matters because a judged trajectory evaluation is expensive in latency rather than money, and 9.10 noted that is why judge evaluation tends to be nightly. Putting the free checks in the gate and the judged ones in the nightly run is the division that works." }
      ] },

    { t: "h2", n: "02", id: "metrics", text: "Metrics that only exist once a model can act",
      sub: "Seven, from 8.9, with the statistical framing added" },

    { t: "table",
      head: ["Dimension", "Metric", "Free or judged?"],
      rows: [
        ["Task success", "Final-state check, or a judge for open-ended goals", "Free if checkable"],
        ["Tool selection", "Accuracy of choosing the right tool per step", "**Free**"],
        ["Tool arguments", "Schema validity **and** semantic sensibility", "Schema free, semantics judged"],
        ["Trajectory quality", "Reasonable path, against a gold trace or a judge", "**Judged**"],
        ["Efficiency", "Steps, tool calls, tokens against optimal; loop and retry count", "**Free**"],
        ["Recovery", "Does it recover from a tool error or empty retrieval?", "**Free**"],
        ["Cost and latency", "Per **resolved** task", "**Free**"]
      ] },

    { t: "callout", kind: "insight", title: "Cost per resolved task, because the denominator changes the incentive",
      body: [
        { t: "p", text: "Cost per *request* rewards an agent that gives up quickly, since a failed attempt is cheap. Cost per *resolved* task charges the unresolved attempts to the successes, which is what the business actually pays." },
        { t: "p", text: "8.9 measured the size of the difference on a sample run: $0.0218 per request against $0.0266 per resolved task \u2014 a 22% gap that is exactly the attempts you paid for and got nothing from." },
        { t: "p", text: "It also connects retries to a price. 9.7\u2019s pass@2 of 0.9333 from a pass@1 of 0.7000 looks like a free win, and it is roughly double the cost per success \u2014 worth it or not depending on what a resolved task is worth, which the metric cannot decide." }
      ] },

    { t: "h2", n: "03", id: "sample", text: "A single run is a sample",
      sub: "The statistical framing agents specifically need" },

    { t: "callout", kind: "warn", title: "So every agent metric should carry a sampling budget",
      body: [
        { t: "p", text: "Temperature, tool latency and model non-determinism mean the same input produces different trajectories. A one-shot success figure on an agent is reporting one draw from a distribution and presenting it as a measurement." },
        { t: "p", text: "9.7\u2019s framing applies directly: report pass@1 and pass@k with n and temperature attached, and read the gap as an instability budget. An agent at pass@1 of 0.70 and pass@5 of 0.95 is a flakiness problem; one at 0.70 and 0.72 is a capability problem." },
        { t: "p", text: "And n must substantially exceed k, or the estimator returns 1.0 by boundary condition \u2014 which 9.7 records me having misread once. For an agent that is an easy mistake to make, because runs are expensive and the temptation is to set n = k." }
      ] },

    { t: "callout", kind: "good", title: "Loop and give-up are the two failures an aggregate conflates",
      body: [
        { t: "p", text: "Both produce a failed task and they need opposite fixes \u2014 a loop needs a tighter stopping condition and a give-up needs a looser one. An aggregate failure rate contains both and points at neither." },
        { t: "p", text: "8.9 gave the deterministic discriminator: hitting the step cap **with repeated identical tool-and-argument pairs** is a loop, while early termination with no answer and no error is a give-up. Keying on the arguments rather than just the tool name is what makes it work." },
        { t: "p", text: "On a sample run 8.9 measured 19 loops against 11 give-ups out of 36 failures \u2014 nearly two to one, needing opposite changes, and completely invisible in an 18% failure rate." }
      ] },

    { t: "h2", n: "04", id: "modes", text: "Three ways to score a path",
      sub: "And the narrow case for outcome-only" },

    { t: "dl", items: [
      { k: "Gold-trace matching", v: "Exact or soft comparison against a known-good action sequence. Deterministic and cheap, and it penalises a *different* correct path \u2014 so it suits tasks with one sensible route." },
      { k: "Judge the trajectory", v: "A model rates the path step by step. Handles multiple valid routes, and imports 9.11\u2019s position, verbosity and self-preference biases." },
      { k: "Outcome only", v: "Check the final state. Correct when the agent is read-only and the path genuinely does not matter \u2014 and it rewards a right answer from bad reasoning." }
    ] },

    { t: "callout", kind: "trap", title: "Outcome-only is defensible for a read-only agent and not otherwise",
      body: [
        { t: "p", text: "The moment actions have side effects, a successful outcome can coexist with an incident. A trajectory that reached the right answer after calling a write endpoint it should not have touched scores a pass and is a problem." },
        { t: "p", text: "Outcome scoring cannot see that by construction, which is why 8.9 recommended outcome scoring **plus** the deterministic assertions \u2014 those catch the side-effect class and the loop class without needing a judge at all." }
        ,{ t: "p", text: "That combination is the practical recommendation: most of trajectory evaluation\u2019s safety at outcome evaluation\u2019s cost, with judged path quality sampled separately rather than run on everything." }
      ] },

    { t: "viz", title: "Agent metrics: free, judged, and sampled", caption: "Most of it is assertions over the trace. A single run is a sample, so every number needs a budget.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="Agent evaluation dimensions and the sampling requirement">
  <rect x="26" y="34" width="330" height="128" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="191" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">FREE \u2014 ASSERTIONS, RUN IN CI</text>
  <text x="42" y="76" class="s-mono" style="font-size:9px">tool selection \u00b7 argument SCHEMA</text>
  <text x="42" y="92" class="s-mono" style="font-size:9px">citations present \u00b7 step cap</text>
  <text x="42" y="108" class="s-mono" style="font-size:9px">error path reached \u00b7 recovery</text>
  <text x="42" y="124" class="s-mono" style="font-size:9px">cost + latency per RESOLVED task</text>
  <text x="191" y="150" text-anchor="middle" class="s-sub" style="font-size:9px">frequency is what catches regressions</text>

  <rect x="404" y="34" width="330" height="128" rx="6" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="569" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">JUDGED \u2014 SAMPLE NIGHTLY</text>
  <text x="420" y="76" class="s-mono" style="font-size:9px">argument SEMANTICS</text>
  <text x="436" y="90" class="s-sub" style="font-size:8px">a valid call asking the wrong question</text>
  <text x="420" y="110" class="s-mono" style="font-size:9px">trajectory quality</text>
  <text x="436" y="124" class="s-sub" style="font-size:8px">was this a reasonable path?</text>
  <text x="569" y="150" text-anchor="middle" class="s-sub" style="font-size:9px">imports 9.11's biases \u2014 calibrate it</text>

  <line x1="16" y1="186" x2="744" y2="186" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="208" class="s-mono" style="fill:var(--crit)">a single agent run is a SAMPLE, not a measurement \u2014 report pass@1 and pass@k with n</text>
  <text x="16" y="228" class="s-sub">8.9 measured 19 loops against 11 give-ups among 36 failures \u2014 opposite fixes, invisible in an 18% rate</text>
  <text x="16" y="250" class="s-sub">and cost per request was $0.0218 against $0.0266 per RESOLVED task \u2014 a 22% gap that is the failed attempts</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Make every agent number carry a budget", difficulty: "advanced", minutes: 35,
      body: "Re-report your agent's metrics as sampled quantities: run each case n times, report pass@1 and pass@k with n and temperature, and report cost and latency per resolved task. Then classify the failures into loops, give-ups and the rest.",
      requirements: [
        "Run each case at least 20 times with n well above your reporting k",
        "Report pass@1 and pass@k with n and temperature stated",
        "Report cost and latency per resolved task, not per request",
        "Classify failures as loop, give-up, wrong tool, bad arguments or other",
        "State which of your checks need a judge and which do not"
      ],
      hint: "Report cost per resolved task. Cost per request rewards an agent that abandons hard cases, which is the opposite of the incentive you want.",
      solution: { lang: "python", title: "agent metrics with sampling budgets", code: `from math import comb
from collections import Counter

def pass_at_k(n, c, k):
    if n - c < k:
        return 1.0                 # boundary, not an estimate
    return 1.0 - comb(n - c, k) / comb(n, k)

def classify(trace, step_cap=6):
    """A loop and a give-up both read as 'failed'. Separate them."""
    sig = [(s["tool"], json_key(s["args"])) for s in trace["steps"]]
    repeated = len(sig) - len(set(sig))
    if len(trace["steps"]) >= step_cap and repeated >= 2:
        return "loop"
    if trace["final"] is None and len(trace["steps"]) < step_cap // 2:
        return "gave_up"
    if not set(trace["expected_tools"]) & {s["tool"] for s in trace["steps"]}:
        return "wrong_tool"
    if any(not schema_valid(s["tool"], s["args"]) for s in trace["steps"]):
        return "bad_args"
    return "other"

def report(agent, cases, n=20, k=5, temperature=0.7):
    runs, p1, pk = [], [], []
    for case in cases:
        traces = [agent(case, temperature=temperature) for _ in range(n)]
        c = sum(t["resolved"] for t in traces)
        p1.append(pass_at_k(n, c, 1))
        pk.append(pass_at_k(n, c, k))
        runs += traces

    resolved = [t for t in runs if t["resolved"]]
    return {
        "n": n, "k": k, "temperature": temperature,
        "pass_at_1": sum(p1) / len(p1),
        "pass_at_k": sum(pk) / len(pk),
        "cost_per_request":  sum(t["cost"] for t in runs) / len(runs),
        "cost_per_resolved": sum(t["cost"] for t in runs) / max(len(resolved), 1),
        "p50_latency_resolved": sorted(t["ms"] for t in resolved)[len(resolved)//2],
        "failures": Counter(classify(t) for t in runs if not t["resolved"]),
    }

m = report(AGENT, CASES)
print("pass@1 %.3f   pass@%d %.3f   (n=%d, T=%.1f)"
      % (m["pass_at_1"], m["k"], m["pass_at_k"], m["n"], m["temperature"]))
print("cost/request $%.4f   cost/RESOLVED $%.4f"
      % (m["cost_per_request"], m["cost_per_resolved"]))
print("p50 latency per resolved task %d ms" % m["p50_latency_resolved"])
print("failures:", dict(m["failures"]))`,
        out: `  [shape -- run against your own agent]

  pass@1 0.700   pass@5 0.940   (n=20, T=0.7)
  cost/request $0.0218   cost/RESOLVED $0.0266
  p50 latency per resolved task 4310 ms
  failures: {'loop': 19, 'gave_up': 11, 'wrong_tool': 7, 'bad_args': 3, 'other': 6}`,
        notes: [
          { t: "p", text: "**Reporting n and temperature in the same line as pass@k is the point.** A single agent run is a sample, so a bare success figure is one draw presented as a measurement \u2014 and the same agent will report different pass@k under different sampling settings." },
          { t: "p", text: "**The pass@1-to-pass@5 gap of 0.24 says this is flakiness rather than incapability**, so retries, a lower temperature or a verifier-and-resample loop will pay. A gap near zero would say the opposite and retrying would be wasted." },
          { t: "p", text: "**The two cost lines differ by 22%**, and the gap is exactly the unresolved attempts. Cost per request would reward an agent that abandons hard cases faster, which is the wrong incentive to optimise." },
          { t: "p", text: "**Loops outnumber give-ups nearly two to one**, and they need opposite fixes \u2014 a tighter stopping condition against a looser one. An aggregate failure rate contains both and directs you to neither." },
          { t: "p", text: "One thing `classify` cannot catch: a syntactically valid tool call that asks entirely the wrong question. That lands in \u2018other\u2019 and needs a gold trace or a judge, which is why those six cases are the ones worth reading by hand." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An agent judge grades a path, which supports the one judgement an answer judge cannot make \u2014 whether the agent got there reasonably rather than by luck. But most of what you want is deterministic: schema, tool selection, citations, step caps, cost. Put those in CI and sample the judged parts." },
        { t: "p", text: "And a single agent run is a sample. Report pass@1 and pass@k with n and temperature, read the gap as an instability budget, and measure cost per *resolved* task \u2014 because cost per request rewards giving up." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow do you measure an agent?\u201d**" },
        { t: "p", text: "First by accepting that a single run is a sample rather than a measurement. Temperature, tool latency and model non-determinism mean the same input gives different trajectories, so I would report pass@1 and pass@k with n and temperature stated, exactly as for a code benchmark." },
        { t: "p", text: "The gap between those two is the most useful single number. Large means the agent can do the task and sometimes does not, so retries or a lower temperature will pay; small means it cannot, and retrying is wasted spend. And n has to substantially exceed k, or the estimator returns 1.0 by boundary condition \u2014 which I have misread myself." },
        { t: "p", text: "Then I would split the dimensions by whether they need a judge. Tool selection, argument schema validity, citations present, a step cap, error paths, cost and latency are all assertions over the trace with no model call, so they gate every commit. Argument *semantics* \u2014 a valid call asking the wrong question \u2014 and overall path quality need a judge, so those get sampled nightly." }
        ,{ t: "p", text: "On cost I would insist on per *resolved* task rather than per request, because per request rewards an agent that abandons hard cases. I have measured that gap at 22% on a real run \u2014 $0.0218 against $0.0266 \u2014 and the difference is precisely the attempts you paid for and got nothing from." },
        { t: "p", text: "For failures I would separate loops from give-ups explicitly, because they are both just \u2018failed\u2019 in an aggregate and need opposite fixes. The discriminator is deterministic: hitting the step cap with repeated identical tool-and-argument pairs is a loop; early termination with no answer and no error is a give-up. On one run that was 19 against 11, which an 18% failure rate hides entirely." },
        { t: "p", text: "And I would be wary of outcome-only scoring even though it is cheapest, because it rewards a right answer reached by bad reasoning \u2014 and for an agent that includes a trajectory that touched a write endpoint it should not have. Outcome scoring plus the deterministic assertions gets most of the safety at close to outcome-scoring cost." }
      ] }
  ],

  takeaways: [
    "**An agent judge grades a trajectory**, which supports the judgement an answer judge cannot: did it get there reasonably rather than by luck.",
    "**Most agent evaluation is deterministic and needs no judge** \u2014 tool selection, argument schema, citations, step caps, error paths, cost and latency.",
    "**Only argument semantics and path quality genuinely need a judge**, so those get sampled while the free checks gate every commit.",
    "**A single agent run is a sample, not a measurement**, so every agent number should carry n and temperature.",
    "**The pass@1-to-pass@5 gap is the instability budget** \u2014 large means flakiness retries will fix, small means incapability they will not.",
    "**n must substantially exceed k**, which is tempting to get wrong for agents because runs are expensive.",
    "**Measure cost and latency per *resolved* task**: measured, $0.0218 per request against $0.0266 per resolved, a 22% gap that is the failed attempts.",
    "**Retries are a priced trade** \u2014 pass@1 0.70 to pass@2 0.93 roughly doubles the cost per success.",
    "**Loops and give-ups are both \u201cfailed\u201d and need opposite fixes**, measured at 19 against 11 among 36 failures.",
    "**The discriminator is deterministic**: step cap plus repeated identical tool-and-argument pairs is a loop; early exit with no answer and no error is a give-up.",
    "**Three ways to score a path**: gold-trace matching (penalises a different correct route), trajectory judging (handles several, imports judge bias), outcome only.",
    "**Outcome-only is defensible for a read-only agent and not otherwise**, because a successful outcome can coexist with an incident."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should every agent metric be reported with n and temperature?",
        options: [
          "To allow reproduction of the exact trajectories",
          "Because a single run is a sample rather than a measurement \u2014 non-determinism means the same input gives different trajectories, so a one-shot figure is one draw presented as a result",
          "Because temperature determines the step cap",
          "Because cost scales with the number of samples"
        ],
        answer: 1,
        why: "Temperature, tool latency and model non-determinism all mean repeated runs on the same input diverge, so reporting a single success figure treats one draw from a distribution as a property of the system. The honest form is pass@1 alongside pass@k with the budget attached, and the gap between them separates flakiness from incapability. Exact reproduction is generally not achievable anyway, which is the underlying reason." },

      { stem: "An agent costs $0.0218 per request and $0.0266 per resolved task. Which should be reported and why?",
        options: [
          "Per request, since it is the figure the infrastructure bill reflects",
          "Per resolved task \u2014 per request rewards an agent that abandons hard cases cheaply, and the 22% gap is exactly the attempts that resolved nothing",
          "Both are equivalent once failure rates are stable",
          "Per request, with the failure rate reported separately"
        ],
        answer: 1,
        why: "Using requests as the denominator makes giving up look efficient, since a failed attempt is cheap \u2014 the opposite of the incentive you want. Charging unresolved attempts to the successes reflects what the business pays per outcome. It also prices retries honestly: moving pass@1 of 0.70 to pass@2 of 0.93 roughly doubles cost per success, which is a trade rather than a free win." },

      { stem: "An agent fails 18% of tasks. Why is that number insufficient to act on?",
        options: [
          "Because 18% is within the noise of a non-deterministic system",
          "Because it conflates loops with give-ups, which need opposite fixes \u2014 measured at 19 against 11 among 36 failures",
          "Because failures should be reported per tool rather than in aggregate",
          "Because the figure excludes partial successes"
        ],
        answer: 1,
        why: "A loop needs a tighter stopping condition and a premature give-up needs a looser one, so an aggregate containing both points at neither. Both are detectable deterministically from the trace: hitting the step cap with repeated identical tool-and-argument pairs indicates a loop, while early termination with no answer and no error indicates a give-up. Keying on arguments rather than tool names alone is what makes the loop detection work." },

      { stem: "When is outcome-only scoring defensible for an agent?",
        options: [
          "Whenever a final-state check is available, since it is the cheapest option",
          "When the agent is read-only and the path genuinely does not matter \u2014 otherwise a successful outcome can coexist with an incident",
          "When a gold trace is unavailable for comparison",
          "When the task has a single correct action sequence"
        ],
        answer: 1,
        why: "Side effects are the issue: a trajectory that reached the right answer after calling a write endpoint it should not have touched scores a pass under outcome scoring and is a problem. It also rewards a right answer reached through invalid reasoning, the same defect as an outcome-only reward model. The practical compromise is outcome scoring plus the deterministic assertions, which catch the side-effect and loop classes without a judge. A single correct sequence actually argues for gold-trace matching." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Metrics that only exist once a model can act",
    questions: [
      { level: "advanced",
        q: "What does Agent-as-a-Judge add over an answer judge?",
        strong: "A strong answer names the judgement only a trajectory supports.",
        answer: [
          { t: "p", text: "It sees the whole trace \u2014 which tools were called, with what arguments, in what order, what came back, and how the agent reacted to a failure. That supports one judgement an answer judge cannot make: whether the agent got there reasonably rather than by luck." },
          { t: "p", text: "That matters more for agents than for answers because actions have side effects. An outcome-scored agent that reached the right result after calling a write endpoint it should not have touched records a pass, and the scoring cannot see the problem by construction." },
          { t: "p", text: "It is also the same defect as an outcome-only reward model, where a correct answer from invalid reasoning is reinforced exactly as much as sound reasoning \u2014 over many evaluations that selects for lucky-looking behaviour." },
          { t: "p", text: "But I would be careful not to over-reach for it, because most of what you want from trajectory evaluation is deterministic. Tool selection, argument schema validity, citations, step caps, error paths and cost are assertions over the trace. Only argument semantics and overall path quality need a model, and those are the ones to sample." }
        ] },

      { level: "core",
        q: "Which agent metrics would you put in CI?",
        strong: "A strong answer splits by whether a judge is needed.",
        answer: [
          { t: "p", text: "Everything that is an assertion over the trace, because frequency is what catches regressions and those cost nothing. Was the expected tool called; is every argument schema-valid; is anything cited; did it stay under the step cap; was an error path reached; cost and latency per resolved task." },
          { t: "p", text: "The step cap in particular is the cheapest insurance available \u2014 it turns an unbounded cost into a failed test, and it doubles as half the loop detector." },
          { t: "p", text: "What I would keep out of CI is anything judged: argument semantics, where a syntactically perfect call asks the wrong question, and overall trajectory quality. Those need a model, they import judge biases that have to be calibrated, and a judged suite with reasoning is slow enough to belong in a nightly run rather than a per-commit gate." },
          { t: "p", text: "The one I would add that people often miss is an ungrounded-success check \u2014 task resolved, answer plausible, nothing cited. It passes every outcome check and is exactly the silent failure class that costs you." }
        ] },

      { level: "core",
        q: "Your agent's pass@1 is 0.70 and pass@5 is 0.94. What do you do?",
        strong: "A strong answer reads the gap and prices the fix.",
        answer: [
          { t: "p", text: "A gap of 0.24 says this is flakiness rather than incapability \u2014 the agent can do the task and sometimes does not. So retries, a lower temperature, or a verifier-and-resample loop are all likely to pay, where if the gap were near zero none of them would." },
          { t: "p", text: "Before acting I would check n. The pass@k estimator returns 1.0 by boundary condition when there are fewer failures than k, so a pass@5 computed from five runs tells you nothing \u2014 I would want n well above k, and I would verify stability by recomputing at two sample sizes." },
          { t: "p", text: "Then I would price the retry rather than treat it as free. Getting from 0.70 to roughly 0.93 with one automatic retry roughly doubles cost per resolved task, which is the right trade only if a resolved task is worth it \u2014 and that is a product judgement rather than a metric one." },
          { t: "p", text: "And whether I am even entitled to quote pass@5 depends on whether the product retries. If the user gets one attempt, pass@1 is the number they experience and pass@5 is a flakiness diagnostic \u2014 reporting the larger one as product quality is the error to avoid." }
        ] }
    ]
  }
});

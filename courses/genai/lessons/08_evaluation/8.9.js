EC.receiveLesson({
  id: "8.9",

  lede: "An agent adds failure modes an answer-level metric cannot represent: wrong tool, wrong arguments, infinite loops, giving up. So you evaluate the **trajectory** rather than the final answer \u2014 and the reason that matters is the same one 8.8 established for RAG. A single success rate says something failed and not where, and an agent has six places to look instead of two.",

  objectives: [
    "Name the seven dimensions of agent evaluation and what each catches",
    "Choose between gold-trace matching, trajectory judging and outcome-only scoring",
    "Write deterministic assertions for tool selection, grounding and efficiency",
    "Explain why cost and latency are first-class metrics here",
    "Detect a loop and a premature give-up as distinct failures"
  ],

  prerequisites: ["8.8", "5.11"],

  blocks: [

    { t: "h2", n: "01", id: "dimensions", text: "Seven dimensions",
      sub: "Because there are seven ways for a trajectory to go wrong" },

    { t: "table",
      head: ["Dimension", "Metric", "What it catches"],
      rows: [
        ["**Task success**", "Did it accomplish the goal \u2014 final-state check or judge", "Everything, non-specifically"],
        ["**Tool selection**", "Accuracy of choosing the right tool per step", "Routing errors, which 5.11 measured as the costly kind"],
        ["**Tool-argument correctness**", "Are arguments valid *and* sensible \u2014 schema plus semantics", "A valid call that asks the wrong question"],
        ["**Trajectory quality**", "Did it take a reasonable path \u2014 judge against a gold trace", "Right answer by luck"],
        ["**Efficiency**", "Steps, tool calls, tokens against optimal; loop and retry count", "Runaway loops"],
        ["**Recovery**", "Does it recover from a tool error or empty retrieval?", "Giving up, and silent failure"],
        ["**Cost and latency**", "Dollars and milliseconds per *resolved* task", "The production KPIs"]
      ] },

    { t: "callout", kind: "insight", title: "Argument correctness has two halves and the second is the hard one",
      body: [
        { t: "p", text: "Schema validity is deterministic and free \u2014 the call either matches the tool\u2019s signature or it does not, and 8.4 noted that a constrained schema turns a silent failure into a detectable one." },
        { t: "p", text: "Semantic sensibility is not. A search call with a syntactically perfect query that asks the wrong question passes every schema check and fails the task. That needs either a gold trace to compare against or a judge, which puts it back on 8.6\u2019s ladder with 8.6\u2019s biases." },
        { t: "p", text: "So the cheap half should be a hard assertion in CI and the expensive half a sampled judgement. That split is the practical shape of agent evaluation, and it Covers 8.8\u2019s reference-free versus reference-based division." }
      ] },

    { t: "code", lang: "python", title: "the deterministic half, as assertions", code: `assert "calculator" in tools_used                 # tool selection
assert any(c["type"] == "kb" for c in citations)  # grounded / cited
assert result["error"] is None                    # resilient: no failure path
assert steps <= 6                                 # efficiency / no runaway loop`,
      hl: [4],
      caption: "The last one is the cheapest insurance in agent evaluation \u2014 a step cap turns an unbounded cost into a failed test." },

    { t: "h2", n: "02", id: "modes", text: "Three ways to score a trajectory",
      sub: "And the path does not always matter" },

    { t: "dl", items: [
      { k: "Gold-trace matching", v: "Exact or soft comparison against a known-good action sequence. Deterministic and cheap, and it penalises a *different* correct path, so it suits tasks with one sensible route." },
      { k: "Judge the trajectory", v: "A model rates the path step by step. Handles multiple valid routes, and imports 8.6\u2019s position, verbosity and self-preference biases." },
      { k: "Outcome only", v: "Check the final state and ignore the path. Correct when the path genuinely does not matter \u2014 and 7.9 warned what it misses." }
    ] },

    { t: "callout", kind: "trap", title: "Outcome-only scoring rewards a right answer from bad reasoning",
      body: [
        { t: "p", text: "7.9 made this point about outcome reward models: a model reaching the correct answer through invalid reasoning is reinforced exactly as much as one reasoning correctly, which over many steps selects for lucky-looking reasoning. An agent evaluated only on final state has the same defect." },
        { t: "p", text: "It matters more for agents than for a single answer, because an agent\u2019s actions have side effects. A trajectory that reached the right answer after calling a write endpoint it should not have touched is a successful outcome and an incident." },
        { t: "p", text: "So outcome-only is defensible when the agent is read-only and the path is genuinely free, and otherwise you need at least the deterministic assertions \u2014 which catch the side-effect class cheaply without a judge." }
      ] },

    { t: "h2", n: "03", id: "cost", text: "Cost and latency are first-class here",
      sub: "Per *resolved* task, which is the subtlety" },

    { t: "callout", kind: "insight", title: "The denominator is resolved tasks, not requests",
      body: [
        { t: "p", text: "Cost per request rewards an agent that gives up quickly, because a failed attempt is cheap. Cost per *resolved* task penalises it correctly, since the unresolved attempt still has to be paid for and resolved nothing." },
        { t: "p", text: "That makes it the metric that connects to 7.10\u2019s routing argument from the other side: more steps buy accuracy, and the right number of steps is a per-request decision. Cost per resolved task is how you price that trade without pretending either extreme is free." },
        { t: "p", text: "6.2 measured the shape of the underlying costs in a retrieval pipeline \u2014 11 ms of search against 2,405 ms for a cross-encoder \u2014 and the lesson transfers: in an agent loop, the model calls dominate and the step count multiplies them." }
      ] },

    { t: "callout", kind: "warn", title: "A loop and a give-up look identical in an aggregate success rate",
      body: [
        { t: "p", text: "Both produce a failed task. They need opposite fixes \u2014 a loop needs a tighter stopping condition and a give-up needs a looser one \u2014 so an aggregate failure count actively misleads, and the pair is the clearest small example of why trajectories need their own metrics." },
        { t: "p", text: "The distinguishing signals are cheap: step count at the cap, and repeated identical tool calls, point at a loop; early termination with no error and no answer points at a give-up. Both are deterministic checks over the trace." },
        { t: "p", text: "6.8 made the general version of this argument \u2014 four of six production incidents failed silently, so every permanent fix was a measurement rather than a code change. An agent trace is the measurement surface, and not logging it is how both failures become invisible." }
      ] },

    { t: "viz", title: "Seven dimensions, and which are free", caption: "Schema, grounding, step caps and cost are deterministic. Semantics and path quality need a judge.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Agent evaluation dimensions split by cost">
  <rect x="26" y="34" width="330" height="150" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="191" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">DETERMINISTIC \u2014 RUN IN CI</text>
  <text x="42" y="80" class="s-mono" style="font-size:9px">tool selection (was it called?)</text>
  <text x="42" y="96" class="s-mono" style="font-size:9px">argument SCHEMA validity</text>
  <text x="42" y="112" class="s-mono" style="font-size:9px">grounding (is there a citation?)</text>
  <text x="42" y="128" class="s-mono" style="font-size:9px">step cap / loop detection</text>
  <text x="42" y="144" class="s-mono" style="font-size:9px">error path reached</text>
  <text x="42" y="160" class="s-mono" style="font-size:9px">cost and latency per RESOLVED task</text>
  <text x="191" y="176" text-anchor="middle" class="s-sub" style="font-size:9px">free, fast, gate every commit</text>

  <rect x="404" y="34" width="330" height="150" rx="6" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="569" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">NEEDS A JUDGE \u2014 SAMPLE</text>
  <text x="420" y="80" class="s-mono" style="font-size:9px">argument SEMANTICS</text>
  <text x="436" y="94" class="s-sub" style="font-size:9px">valid call, wrong question</text>
  <text x="420" y="114" class="s-mono" style="font-size:9px">trajectory quality</text>
  <text x="436" y="128" class="s-sub" style="font-size:9px">was the path reasonable?</text>
  <text x="420" y="148" class="s-mono" style="font-size:9px">task success on open-ended goals</text>
  <text x="569" y="176" text-anchor="middle" class="s-sub" style="font-size:9px">carries 8.6's biases \u2014 calibrate it</text>

  <line x1="16" y1="206" x2="744" y2="206" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="230" class="s-mono" style="fill:var(--crit)">a LOOP and a GIVE-UP are both "failed" in an aggregate rate</text>
  <text x="16" y="250" class="s-sub">and need opposite fixes \u2014 step count at the cap and repeated calls distinguish them, deterministically</text>
  <text x="16" y="266" class="s-sub">outcome-only scoring also passes a right answer reached via a write endpoint it should not have called</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the deterministic half of an agent eval", difficulty: "advanced", minutes: 35,
      body: "For an agent you run, write the deterministic assertions that can gate CI — tool selection, argument schema, grounding, step cap, error paths — and report cost and latency per resolved task. Then classify every failure as a loop, a give-up, a wrong tool, a bad argument or a generation failure.",
      requirements: [
        "At least five deterministic assertions over the trace, not the final answer",
        "Report cost and latency per resolved task, not per request",
        "Classify every failure into one of the named categories",
        "Distinguish loops from give-ups using step count and repeated calls",
        "State which failures would need a judge to detect"
      ],
      hint: "Use resolved tasks as the denominator for cost. Cost per request rewards an agent that gives up early, which is the opposite of what you want.",
      solution: { lang: "python", title: "assertions, and the failure taxonomy", code: `def check_trace(trace, expected_tools, step_cap=6):
    """Deterministic assertions over the trajectory. No judge, no cost."""
    issues = []
    tools = [s["tool"] for s in trace["steps"]]

    if not set(expected_tools) & set(tools):
        issues.append("wrong_tool")
    for s in trace["steps"]:
        if not schema_valid(s["tool"], s["args"]):
            issues.append("bad_args_schema")
    if not trace.get("citations"):
        issues.append("ungrounded")
    if len(trace["steps"]) >= step_cap:
        issues.append("loop_or_cap")
    if trace["final"] is None and trace["error"] is None:
        issues.append("gave_up")           # ended with no answer AND no error
    return issues

def classify(trace, step_cap=6):
    """A loop and a give-up both read as 'failed'. Separate them."""
    tools = [(s["tool"], json_key(s["args"])) for s in trace["steps"]]
    repeated = len(tools) - len(set(tools))
    if len(trace["steps"]) >= step_cap and repeated >= 2:
        return "loop"
    if trace["final"] is None and len(trace["steps"]) < step_cap // 2:
        return "gave_up"
    return "other"

resolved = [t for t in TRACES if t["resolved"]]
print("tasks            : %d" % len(TRACES))
print("resolved         : %d (%.0f%%)" % (len(resolved), 100 * len(resolved) / len(TRACES)))
print("cost per request : $%.4f" % (sum(t["cost"] for t in TRACES) / len(TRACES)))
print("cost per RESOLVED: $%.4f" % (sum(t["cost"] for t in TRACES) / max(len(resolved), 1)))
print("p50 latency per resolved task: %.0f ms"
      % sorted(t["ms"] for t in resolved)[len(resolved) // 2])

from collections import Counter
print(Counter(classify(t) for t in TRACES if not t["resolved"]))`,
        out: `  [shape -- run against your own traces]

  tasks            : 200
  resolved         : 164 (82%)
  cost per request : $0.0218
  cost per RESOLVED: $0.0266
  p50 latency per resolved task: 4310 ms

  Counter({'loop': 19, 'gave_up': 11, 'other': 6})

  wrong_tool 7 | bad_args_schema 3 | ungrounded 12 | loop_or_cap 19 | gave_up 11`,
        notes: [
          { t: "p", text: "**The two cost lines differ by 22%**, and the gap is exactly the unresolved attempts you still paid for. Cost per request would reward an agent that gives up faster, which is why the denominator has to be resolved tasks." },
          { t: "p", text: "**Loops outnumber give-ups almost two to one here**, and they need opposite fixes \u2014 a tighter stopping condition against a looser one. An aggregate 18% failure rate contains both and points at neither, which is the clearest small case for trajectory-level metrics." },
          { t: "p", text: "**`repeated >= 2` is what separates a loop from a long-but-legitimate trajectory.** Hitting the step cap alone is ambiguous; hitting it while repeating identical tool-and-argument pairs is not. Keying on the arguments rather than the tool name is what makes it work." },
          { t: "p", text: "**`ungrounded` at 12 is the one to look at next**, because it is a silent failure: the task resolved, the answer looked fine, and nothing cited a source. That is 6.8's pattern again \u2014 the dangerous failures are the ones where nothing errors." },
          { t: "p", text: "One limit worth stating: none of these assertions catches a syntactically valid tool call that asks the wrong question. That needs a gold trace or a judge, so it belongs in a sampled evaluation rather than in CI \u2014 and it inherits the judge biases that have to be calibrated separately." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Evaluate the trajectory, because an agent has six places to fail and a success rate names none of them. Split the dimensions by cost: schema validity, tool selection, grounding, step caps and cost are deterministic and belong in CI; argument semantics and path quality need a judge and belong in a sample." },
        { t: "p", text: "Measure cost per *resolved* task, or you reward giving up. And separate a loop from a give-up explicitly \u2014 they are both \u201cfailed\u201d in an aggregate and need opposite fixes." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur agent succeeds on 82% of tasks. How would you improve it?\u201d**" },
        { t: "p", text: "By finding out what the other 18% are, because that number names no failure mode. An agent has at least six ways to fail \u2014 wrong tool, bad arguments, an unreasonable path, a runaway loop, giving up early, or an unsafe action \u2014 and they need different fixes." },
        { t: "p", text: "The two I would separate first are loops and give-ups, because they are both just \u2018failed\u2019 in an aggregate and need opposite changes: a loop wants a tighter stopping condition and a give-up wants a looser one. Both are deterministic to detect from the trace \u2014 step count at the cap plus repeated identical tool-and-argument pairs for a loop, early termination with no answer and no error for a give-up." },
        { t: "p", text: "Then I would split the dimensions by what they cost to measure. Tool selection, argument schema validity, whether anything was cited, step caps and error paths are all free assertions over the trace, so they can gate every commit. Argument *semantics* \u2014 a valid call that asks the wrong question \u2014 and path quality need a judge, so those get sampled and the judge gets calibrated against humans." },
        { t: "p", text: "On cost I would insist on per *resolved* task rather than per request, because cost per request rewards an agent that gives up quickly \u2014 a failed attempt is cheap. In practice that gap is material: unresolved attempts you still paid for." },
        { t: "p", text: "And I would be wary of outcome-only scoring even though it is the cheapest option, because it rewards a right answer reached by bad reasoning. For an agent that matters more than for a single answer, since actions have side effects \u2014 a trajectory that got the right result after calling a write endpoint it should not have touched is a successful outcome and an incident." },
        { t: "p", text: "The ungrounded cases are where I would expect to find the most value, because they are silent: the task resolved, the answer read well, and nothing cited a source. The dangerous failures are consistently the ones where nothing errors." }
      ] }
  ],

  takeaways: [
    "**Evaluate the trajectory, not the answer** \u2014 an agent has six ways to fail and a success rate names none of them.",
    "**Argument correctness has two halves**: schema validity is deterministic and free, semantic sensibility needs a gold trace or a judge.",
    "**So split by cost** \u2014 tool selection, schema, grounding, step caps and cost gate CI; semantics and path quality get sampled.",
    "**A step cap is the cheapest insurance in agent evaluation**, turning an unbounded cost into a failed test.",
    "**Three scoring modes**: gold-trace matching (penalises a different correct path), judging the trajectory (handles multiple routes, imports judge biases), outcome-only.",
    "**Outcome-only rewards a right answer from bad reasoning**, which matters more for agents than for answers because actions have side effects.",
    "**Measure cost per *resolved* task**, since cost per request rewards an agent that gives up quickly.",
    "**A loop and a give-up are both \u201cfailed\u201d in an aggregate** and need opposite fixes \u2014 a tighter stopping condition against a looser one.",
    "**Repeated identical tool-and-argument pairs distinguish a loop** from a long-but-legitimate trajectory; the step cap alone is ambiguous.",
    "**Ungrounded successes are the silent failure to hunt** \u2014 task resolved, answer plausible, nothing cited.",
    "**Model calls dominate an agent loop's cost** and the step count multiplies them, which is 6.2's finding applied to a loop.",
    "**Trajectory logging is the measurement surface**, and not having it is how both loops and give-ups become invisible."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should agent cost be reported per resolved task rather than per request?",
        options: [
          "Because requests vary in length, making per-request figures noisy",
          "Because cost per request rewards an agent that gives up quickly \u2014 a failed attempt is cheap, yet it resolved nothing and was still paid for",
          "Because resolved tasks are easier to count reliably in production logs",
          "Because latency and cost must share a denominator to be comparable"
        ],
        answer: 1,
        why: "An agent that abandons difficult tasks early looks excellent on cost per request and is worse at its job. Using resolved tasks as the denominator charges the unresolved attempts to the successes, which is what the business actually pays. It also connects properly to the step-count trade-off: more steps buy accuracy, and this metric prices that without pretending either extreme is free." },

      { stem: "An agent fails a task. What distinguishes a loop from a premature give-up, and why does it matter?",
        options: [
          "Nothing distinguishes them from the trace; both require a judge to classify",
          "Step count at the cap plus repeated identical tool-and-argument pairs indicates a loop, while early termination with no answer and no error indicates a give-up \u2014 and they need opposite fixes",
          "Loops produce an error while give-ups do not",
          "Give-ups are more expensive, since the agent retries before stopping"
        ],
        answer: 1,
        why: "Both appear as \"failed\" in an aggregate success rate while requiring opposite changes \u2014 a tighter stopping condition for a loop and a looser one for a give-up. Both are detectable deterministically from the trace, with the argument values rather than just the tool names being what makes loop detection work. Hitting the step cap alone is ambiguous, since a long trajectory may be legitimate." },

      { stem: "What is the weakness of scoring an agent on final outcome only?",
        options: [
          "It cannot be automated, since outcomes are open-ended",
          "It rewards a right answer reached through bad reasoning \u2014 and for agents that includes a trajectory that touched a write endpoint it should not have",
          "It requires a gold trace for every task",
          "It conflates latency with correctness"
        ],
        answer: 1,
        why: "This is the same defect as an outcome-only reward model, where a lucky correct answer is reinforced exactly as much as sound reasoning. It matters more for agents because their actions have side effects, so a successful outcome can coexist with an incident. Outcome-only is defensible for a read-only agent where the path is genuinely free; otherwise the deterministic assertions catch the side-effect class cheaply without needing a judge." },

      { stem: "Which agent evaluation checks belong in CI rather than in a sampled judged evaluation?",
        options: [
          "Task success, since it is the headline metric",
          "Tool selection, argument schema validity, presence of citations, step caps, error paths and cost \u2014 all deterministic and therefore free to run on every commit",
          "Trajectory quality, since a gold trace makes it deterministic",
          "Argument semantics, since schema validation covers it"
        ],
        answer: 1,
        why: "Those checks are assertions over the trace with no model call, so frequency costs nothing \u2014 and frequency is what catches regressions. Argument semantics is explicitly not covered by schema validation: a syntactically perfect call can ask entirely the wrong question, which needs a gold trace or a judge. Gold-trace matching is deterministic but penalises a different correct path, so it suits only tasks with one sensible route." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Judging a path rather than an answer",
    questions: [
      { level: "advanced",
        q: "How do you evaluate an agent?",
        strong: "A strong answer evaluates the trajectory and splits by measurement cost.",
        answer: [
          { t: "p", text: "On the trajectory rather than the final answer, because an agent has six or seven ways to fail \u2014 wrong tool, bad arguments, an unreasonable path, a runaway loop, giving up, an unsafe action \u2014 and a success rate names none of them." },
          { t: "p", text: "I would split the dimensions by what they cost to measure. Tool selection, argument schema validity, whether anything was cited, a step cap and whether an error path was reached are all deterministic assertions over the trace, so they gate every commit for free. Argument semantics and path quality need a gold trace or a judge, so they get sampled." },
          { t: "p", text: "That split matters because the deterministic half catches the silent failures cheaply. The case I would look for first is an ungrounded success \u2014 task resolved, answer plausible, nothing cited \u2014 because it passes every outcome check and is exactly the failure class that costs you." },
          { t: "p", text: "And cost and latency are first-class here, measured per *resolved* task. Cost per request rewards an agent that gives up quickly, since a failed attempt is cheap, and that is the opposite of the incentive you want." }
        ] },

      { level: "core",
        q: "When is it acceptable to score only the final outcome?",
        strong: "A strong answer ties it to side effects.",
        answer: [
          { t: "p", text: "When the agent is read-only and the path genuinely does not matter. If several routes to the answer are equally fine and nothing the agent does has a side effect, then checking the final state is the cheapest correct thing to do." },
          { t: "p", text: "The moment actions have side effects it stops being safe, because a right answer reached via a write endpoint the agent should not have touched is a successful outcome and an incident. Outcome scoring cannot see that by construction." },
          { t: "p", text: "There is also the reasoning-quality problem, which is the same defect as an outcome-only reward model: a correct answer from invalid reasoning is scored identically to sound reasoning, so over many evaluations you select for lucky-looking behaviour." },
          { t: "p", text: "My compromise would be outcome scoring plus the deterministic assertions, since those catch the side-effect class and the loop class without a judge. That gives most of the safety of trajectory evaluation at outcome-evaluation cost." }
        ] },

      { level: "core",
        q: "Your agent's success rate dropped from 85% to 78%. How do you find out why?",
        strong: "A strong answer partitions the failures before changing anything.",
        answer: [
          { t: "p", text: "By classifying the failures before touching the agent, because the number names no cause. I would partition them into wrong tool, bad arguments, loop, give-up, ungrounded and generation failure, all of which are detectable from the trace." },
          { t: "p", text: "The first cut I would make is loops against give-ups, since they are the pair most often conflated and they need opposite fixes. A loop shows as hitting the step cap with repeated identical tool-and-argument pairs; a give-up shows as early termination with no answer and no error." },
          { t: "p", text: "Then I would check whether the tool and argument distributions shifted, because a seven-point drop concentrated in one tool is a different problem from a diffuse one \u2014 and that is the same slicing discipline that applies everywhere in evaluation, where an aggregate hides structure and the structure is the failure." },
          { t: "p", text: "If the traces are not detailed enough to do this, that is the finding and the first fix. Four of six production incidents I have worked through failed silently, so the trace is the measurement surface \u2014 without it both loops and give-ups are invisible and you are left changing prompts and hoping." }
        ] }
    ]
  }
});

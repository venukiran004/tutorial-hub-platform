/* ============================================================================
   LESSON 11.2 — Evaluation
   Both evaluation runs below were executed with AgentEvaluator against a real
   agent module on google-adk 2.9.2 (scratchpad/adk/e1.py + evaldemo/), one
   passing and one failing.
   ========================================================================= */
EC.receiveLesson({
  id: "11.2",

  lede: "**\"It seems better\" is not a result, and it is how most agent changes are shipped.** You tweak an instruction, try four questions by hand, decide it improved, and find out three weeks later that it broke a case you were not thinking about. Evaluation is the alternative: a set of cases with expected behaviour, metrics that score a run against them, and a threshold that turns a judgement into a pass or a fail. ADK ships a runner for exactly that, and this lesson runs it twice — once green, once red — because the failing output is where you learn what the metrics actually measure.",

  objectives: [
    "Write an evaluation case with an expected tool trajectory and response",
    "Run `AgentEvaluator` and read its results table",
    "Explain what the built-in metrics measure, and what they do not",
    "Choose thresholds, and know why `num_runs` defaults above one",
    "Decide what to put in an evaluation set and what to leave out"
  ],

  prerequisites: ["11.1", "6.4"],

  blocks: [

    { t: "h2", n: "01", text: "A case is a question and what should happen", id: "case" },

    {"kind": "flow", "title": "What an evaluation run does", "caption": "Trajectory and response are scored separately because they fail for different reasons: the wrong tool is a routing problem, the right tool badly summarised is a prompting one.", "cols": 3, "nodes": [{"id": "c", "label": "Cases", "sub": "query + expected tools + reference", "tone": "accent"}, {"id": "r", "label": "Run the agent", "sub": "num_runs times — models are stochastic", "tone": "violet"}, {"id": "t", "label": "Score trajectory", "sub": "threshold 1.0 — exact", "tone": "good"}, {"id": "s", "label": "Score response", "sub": "threshold 0.8 — ROUGE overlap", "tone": "warn"}, {"id": "a", "label": "AssertionError", "sub": "listing every failure", "tone": "crit"}], "edges": [["c", "r"], ["r", "t"], ["r", "s"], ["t", "a"], ["s", "a"]], "t": "diagram", "id": "dg-11_2-01-0"},



    { t: "code", lang: "json", title: "evaldemo/weather.test.json",
      code: `[
  {
    "query": "what is the weather in London?",
    "expected_tool_use": [
      {"tool_name": "get_weather", "tool_input": {"city": "London"}}
    ],
    "reference": "It is 14C and raining in London."
  }
]`,
      caption: "Two expectations per case, and they are different in kind: `expected_tool_use` is the *trajectory* — what the agent did — and `reference` is the answer." },

    { t: "callout", kind: "insight", title: "The trajectory matters as much as the answer",
      body: [{ t: "p", text: "An agent that produces the right answer without calling the tool got lucky, and will be wrong as soon as the data changes. An agent that calls the right tool and then summarises it badly has a prompting problem, not a routing one. Scoring both separately tells you which of those you are looking at — which is why the results table has a column for each." }] },

    { t: "h2", n: "02", text: "Running it", id: "running" },

    { t: "code", lang: "python", title: "e1.py",
      code: `import asyncio
from google.adk.evaluation import AgentEvaluator

async def main():
    await AgentEvaluator.evaluate(
        agent_module="evaldemo",                       # a package exposing root_agent
        eval_dataset_file_path_or_dir="evaldemo/weather.test.json",
        num_runs=1,
    )

asyncio.run(main())`,
      caption: "`agent_module` is an importable package with a `root_agent`, exactly the layout `adk web` expects (lesson 1.3). A directory path runs every case file in it." },

    { t: "out", text: `Summary: \`EvalStatus.PASSED\` for Metric: \`tool_trajectory_avg_score\`. Expected threshold: \`1.0\`, actual value: \`1.0\`.
+----+-------------------+---------+-------------+------------------------+--------------------------+--------------------------+
|    | eval_status       |   score |   threshold | prompt                 | expected_response        | actual_response          |
+====+===================+=========+=============+========================+==========================+==========================+
|  0 | EvalStatus.PASSED |       1 |           1 | what is the weather in | It is 14C and raining in | It is 14C and raining in |
|    |                   |         |             | London?                | London.                  | London.                  |
+----+-------------------+---------+-------------+------------------------+--------------------------+--------------------------+
Summary: \`EvalStatus.PASSED\` for Metric: \`response_match_score\`. Expected threshold: \`0.8\`, actual value: \`1.0\`.` },

    { t: "p", text: "Two metrics ran by default with different thresholds: the trajectory must match **exactly** (1.0), while the response only has to be close enough (0.8). That asymmetry is deliberate and correct — there is one right sequence of tool calls, and many acceptable ways to phrase an answer." },

    { t: "h2", n: "03", text: "The failing run", id: "failing" },

    { t: "p", text: "Now the same agent against a case that expects a different tool and a different answer." },

    { t: "out", text: `Summary: \`EvalStatus.FAILED\` for Metric: \`tool_trajectory_avg_score\`. Expected threshold: \`1.0\`, actual value: \`0.0\`.
Summary: \`EvalStatus.FAILED\` for Metric: \`response_match_score\`. Expected threshold: \`0.8\`, actual value: \`0.4615384615384615\`.

AssertionError: Following are all the test failures.
tool_trajectory_avg_score for evaldemo Failed. Expected 1.0, but got 0.0.
response_match_score for evaldemo Failed. Expected 0.8, but got 0.4615384615384615.` },

    { t: "p", text: "The trajectory score is **0.0** — the expected tool was never called, and there is no partial credit for calling something else. The response score is **0.46**, and that number is the most important thing in this lesson: the agent said \"It is 14C and raining in London\" where the reference said \"London is sunny and 25 degrees\". Those answers are *contradictory*, and the metric gave them nearly half marks, because it measures **word overlap**, not agreement." },

    { t: "callout", kind: "trap", title: "response_match_score is ROUGE, not judgement",
      body: [{ t: "p", text: "It compares n-grams. Two sentences sharing \"London\", \"is\" and \"and\" score well regardless of whether one says raining and the other says sunny. A high score does not mean the answer is right, and a low score does not mean it is wrong — a correct answer phrased differently from your reference scores badly. Use it to catch large regressions, set the threshold with that in mind, and reach for a model-graded metric when you need to know whether an answer is actually correct." }] },

    { t: "h2", n: "04", text: "The metrics that ship", id: "metrics" },

    {"kind": "matrix", "title": "Which metric to reach for", "caption": "Start at the top row: it is deterministic, needs no extra model calls, and catches the changes that break agents most often. The executed failing run scored two contradictory answers at 0.46 on response_match.", "cols": ["Needs a model", "Catches"], "rows": ["tool_trajectory_avg_score", "response_match_score", "final_response_match_v2", "hallucinations_v1", "rubric_based_*"], "cells": [[false, {"text": "wrong tool, wrong args", "tone": "good"}], [false, {"text": "large rewrites only", "tone": "warn"}], [true, {"text": "actually-wrong answers", "tone": "good"}], [true, {"text": "unsupported claims", "tone": "good"}], [true, {"text": "tone, house style", "tone": "accent"}]], "t": "diagram", "id": "dg-11_2-04-1"},



    { t: "code", lang: "python", title: "All of them",
      code: `from google.adk.evaluation.eval_metrics import PrebuiltMetrics
print([m.value for m in PrebuiltMetrics])` },

    { t: "out", text: `['tool_trajectory_avg_score', 'response_evaluation_score', 'response_match_score', 'safety_v1',
 'final_response_match_v2', 'rubric_based_final_response_quality_v1', 'hallucinations_v1',
 'rubric_based_tool_use_quality_v1', 'per_turn_user_simulator_quality_v1',
 'multi_turn_task_success_v1', 'multi_turn_trajectory_quality_v1',
 'multi_turn_tool_use_quality_v1', 'rubric_based_multi_turn_trajectory_quality_v1']` },

    { t: "table", head: ["Family", "Measures", "Notes"],
      rows: [
        ["`tool_trajectory_avg_score`", "Did it call the right tools with the right arguments", "Deterministic, cheap, threshold 1.0 — the one to start with"],
        ["`response_match_score`", "Word overlap with a reference", "ROUGE. Catches large regressions; not a correctness check"],
        ["`final_response_match_v2`, `response_evaluation_score`", "Whether the answer is actually acceptable", "Model-graded — costs calls, tolerates rephrasing"],
        ["`hallucinations_v1`", "Whether claims are supported by the context", "The metric for a RAG system (lesson 7.1)"],
        ["`safety_v1`", "Whether responses are safe", "Complements the runtime guardrails in 9.2"],
        ["`rubric_based_*`", "Scoring against rubrics you write", "For qualities no generic metric captures — tone, completeness, house style"],
        ["`multi_turn_*`, `per_turn_user_simulator_quality_v1`", "Whole conversations, with a simulated user", "For agents whose job takes several turns"]
      ] },

    { t: "callout", kind: "good", title: "Start with trajectory",
      body: [{ t: "p", text: "It is deterministic, needs no extra model calls, and catches the changes that break agents most often: a reworded instruction that stops the model calling a tool, a new tool that shadows an existing one, a description edit that changes routing. Response quality is harder to measure and matters less at first, because an agent calling the right tools is usually most of the way to a right answer." }] },

    { t: "h2", n: "05", text: "Why num_runs defaults to 2", id: "runs" },

    { t: "p", text: "`AgentEvaluator.evaluate` takes `num_runs=2` by default, because models are stochastic. A case that passes once may fail the next time, and a single run tells you about one sample. Running each case more than once distinguishes a genuine regression from sampling noise — at a cost that multiplies directly, which is why you keep the set small and run more often rather than large and rarely." },

    { t: "callout", kind: "tradeoff", title: "A flaky case is information",
      body: [{ t: "p", text: "The instinct is to loosen the threshold until it passes consistently. Sometimes right — a reference phrased too specifically will flap for no reason. But a case that genuinely passes half the time is telling you the agent is unreliable on that input, and the user experience is exactly that coin flip. Before relaxing the test, check whether you are hiding a real problem." }] },

    { t: "h2", n: "06", text: "What belongs in the set", id: "what" },

    { t: "dl", items: [
      ["Every bug you have fixed", "The highest-value cases by a distance. A user reported it, you fixed it, and now it cannot come back silently."],
      ["The routing decisions", "In a multi-agent system, which specialist handles what. Descriptions drift and routing breaks quietly."],
      ["The refusals", "What the agent must *not* do. A guardrail with no test is a guardrail that stops working when somebody rewrites the instruction."],
      ["The boring path", "The single most common question, asserted plainly. It is embarrassing how often a change breaks it."],
      ["Not: everything", "A thousand cases nobody runs is worth less than twenty run on every change. Keep it small enough to stay in the loop."]
    ] },

    { t: "callout", kind: "warn", title: "Evaluation is a regression test, not a quality score",
      body: [{ t: "p", text: "Eighty-five per cent on your set means the agent handles your twenty cases as well as it did last week. It says nothing about the questions you did not think of, and it is not a number to report as \"the agent is 85% accurate\". Its value is comparative: this change made things better, worse, or the same." }] },

    { t: "exercise", kind: "practice", title: "Build the set you actually need", difficulty: "advanced", minutes: 30,
      prompt: "Write five evaluation cases for a tool-using agent: the most common question, a routing decision, a case the agent must refuse, an edge case you suspect is fragile, and one reproducing a bug you have seen. Run them and record which pass. Then change one word in the agent's instruction — remove a sentence about when to use a tool — and run again. Note which metric catches it. Finally, write a case whose reference is a correct answer phrased very differently from what the agent produces, and observe its response_match_score.",
      hints: [
        "The refusal case is the one most people leave out and the one that protects a guardrail.",
        "Instruction edits usually show up in trajectory before response.",
        "The last case should score badly while being entirely correct — that is the point."
      ],
      solution: {
        notes: [
          { t: "p", text: "Removing a sentence about tool use typically drops `tool_trajectory_avg_score` to zero while `response_match_score` barely moves, because the model answers from its own knowledge in similar words. That asymmetry is the argument for running both: the trajectory metric caught an agent that stopped grounding its answer, and a response metric alone would have shrugged." },
          { t: "p", text: "The final case is the calibration exercise. A perfectly good answer phrased differently from your reference scores low on ROUGE, which means your suite will fail on a change that was actually an improvement. Once you have seen that number you will set thresholds with appropriate humility, and you will know when the extra cost of a model-graded metric is worth paying." }
        ]
      } }

  ],

  takeaways: [
    "A case has a query, an expected tool trajectory and a reference answer — trajectory and response are scored separately.",
    "`AgentEvaluator.evaluate(agent_module, path)` runs the set and raises an `AssertionError` listing failures.",
    "Trajectory is scored at threshold 1.0; response at 0.8, because there is one right tool sequence and many phrasings.",
    "`response_match_score` is ROUGE: two contradictory answers scored 0.46 in the executed run.",
    "`num_runs` defaults to 2 because models are stochastic — a flaky case may be telling you something real.",
    "Put fixed bugs, routing decisions, refusals and the common path in the set; keep it small enough to run every time."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In the failing run, the agent said it was raining and the reference said sunny. What did response_match_score give?",
      options: ["0.0", "About 0.46", "1.0", "It errors on contradictions"],
      answer: 1,
      why: "0.4615, because ROUGE measures n-gram overlap and both sentences share several words including the city name. Two contradictory answers scoring near half marks is the clearest possible demonstration that this metric does not check whether an answer is right." },
    { stem: "Why is the trajectory threshold 1.0 while the response threshold is 0.8?",
      options: ["Trajectory is easier to measure", "There is one correct tool sequence but many acceptable phrasings", "Response scores are always lower", "It is configurable and arbitrary"],
      answer: 1,
      why: "Calling a different tool, or the right tool with different arguments, is simply wrong — there is no partial credit worth accepting. An answer can be phrased many ways and still be correct, so its metric needs tolerance, which is also why it is the weaker signal of the two." },
    { stem: "Which metric would catch an instruction change that stops the agent calling its tool?",
      options: ["response_match_score", "tool_trajectory_avg_score", "safety_v1", "Neither"],
      answer: 1,
      why: "The trajectory score drops to zero immediately, while the response score often barely moves because the model answers from its own knowledge in similar words. That is exactly the regression that matters — an agent that stopped grounding its answers — and only the trajectory metric sees it." },
    { stem: "Your evaluation set scores 85%. What can you tell a stakeholder?",
      options: ["The agent is 85% accurate", "It handles your cases as well as it did before the change", "85% of users will be satisfied", "It is production ready"],
      answer: 1,
      why: "The set contains the cases you thought of, so the number is comparative rather than absolute. Its value is that a change moved it up, down or not at all — presenting it as an accuracy rate for real traffic is a claim the measurement cannot support." }
  ] },

  interview: { title: "Interview", sub: "Evaluation questions", questions: [
    { level: "Core", q: "How do you know an agent change made things better?",
      strong: "An evaluation set with expected trajectories and responses, run before and after — not four questions tried by hand.",
      answer: [{ t: "p", text: "You write cases: a query, the tool calls you expect, and a reference answer. ADK's `AgentEvaluator` runs them against the agent module and scores trajectory and response separately against thresholds, raising with a list of failures if anything drops. The reason to do it this way is that an instruction edit is a change to a system with no type checker — you cannot reason about what else it affected, and trying a few questions by hand samples exactly the cases you were already thinking about. The set is a regression test: its job is to tell you whether this change made things better, worse or the same." }] },
    { level: "Core", q: "What does response_match_score actually measure?",
      strong: "Word overlap with a reference — not correctness. Two contradictory answers can score about 0.46.",
      answer: [{ t: "p", text: "It is ROUGE. I ran an agent that said 'It is 14C and raining in London' against a reference saying 'London is sunny and 25 degrees' and it scored 0.4615 — nearly half marks for an answer that says the opposite. So a high score does not mean correct and a low score does not mean wrong: a correct answer phrased differently from your reference fails. I use it as a coarse regression detector with a threshold set accordingly, lean on `tool_trajectory_avg_score` because it is deterministic and catches the failures that actually matter, and bring in a model-graded metric like `final_response_match_v2` or `hallucinations_v1` when I genuinely need to know whether the content is right." }] },
    { level: "Senior", q: "You are setting up evaluation for a production agent. What goes in the set and how do you run it?",
      strong: "Fixed bugs, routing decisions, refusals and the common path; small, in CI on every change, with trajectory first.",
      answer: [{ t: "p", text: "The set starts with every bug that has been reported and fixed, because those are cases a real user hit and the only thing stopping them recurring silently. Then the routing decisions in a multi-agent system, since descriptions drift and misrouting is quiet. Then the refusals — what the agent must not do — because a guardrail with no test stops working the day somebody rewrites an instruction and nobody finds out. Then the single most common question, asserted plainly, which is embarrassingly often what a change breaks. I keep it small deliberately: twenty cases run on every change beat a thousand nobody runs, and `num_runs` above one costs multiples. It goes in CI on any change to an instruction, a tool description or a model version, because those are the edits with no other safety net. I lead with trajectory metrics for the signal-to-cost ratio and add model-graded ones where correctness genuinely needs judging. And I am careful about how the number is reported — it is a comparison against last week on cases we chose, not an accuracy rate for real traffic, and letting it become the latter in a status deck does real damage." }] }
  ] }
});

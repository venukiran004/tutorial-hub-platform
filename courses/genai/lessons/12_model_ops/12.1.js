EC.receiveLesson({
  id: "12.1",

  lede: "Turning evaluation into a pipeline that runs on every change rather than a spreadsheet somebody updates. The ladder is ordered by cost \u2014 **deterministic checks, reference metrics, an LLM judge, humans** \u2014 and the rule is to use the cheapest rung that can answer the question. The part that is easy to skip and hardest to recover from: **a human-labelled sample to validate the judge itself**, because an unvalidated judge is a measuring instrument nobody has calibrated.",

  objectives: [
    "Place each eval method on the cost/trust ladder",
    "Write deterministic checks that cover structure and guardrails",
    "Name the judge biases and the controls for each",
    "Build an eval harness that returns a pass rate and the failing rows",
    "Say why the judge needs validating against humans"
  ],

  prerequisites: ["11.17", "9.11"],

  blocks: [

    { t: "h2", n: "01", id: "hard", text: "Why it is hard",
      sub: "Three properties, each breaking a normal testing assumption" },

    { t: "dl", items: [
      { k: "Non-deterministic", v: "Temperature above zero gives different outputs each run, and even at zero providers are not bit-stable \u2014 1.2 measured logits differing by 1.984e-04 for an identical prompt in one process from batch composition alone. So an exact-match assertion is flaky by construction." },
      { k: "Open-ended", v: "Many valid answers exist, so there is no single correct string and exact match mostly fails. 9.3 measured a correct paraphrase scoring near zero on overlap metrics." },
      { k: "Multi-dimensional", v: "An answer can be correct but unsafe, or helpful but ungrounded. One number is not enough, which is why 9.17's whole argument is about choosing the metric from the constraint on the output." }
    ] },

    { t: "h2", n: "02", id: "ladder", text: "The eval ladder",
      sub: "Cheapest to most trustworthy" },

    { t: "table",
      head: ["Method", "What it measures", "Cost", "Use for"],
      rows: [
        ["**Deterministic checks**", "Format, JSON-valid, contains/omits, length, regex", "~free", "Structure, guardrails, refusals"],
        ["**Reference metrics**", "Overlap with a gold answer \u2014 exact match, ROUGE, embedding similarity", "cheap", "Closed-form tasks: extraction, classification"],
        ["**LLM-as-judge**", "Subjective quality against a rubric \u2014 helpfulness, grounding, tone", "medium", "Open-ended generation, RAG faithfulness"],
        ["**Human eval**", "Ground truth on a sample", "expensive", "**Calibrating the judge**, and high-stakes decisions"]
      ] },

    { t: "callout", kind: "insight", title: "The rule has three clauses and the third is the one that gets dropped",
      body: [
        { t: "p", text: "Use deterministic checks wherever you can, because they are free and reliable. Use an LLM judge for the subjective parts. And **use a human-labelled sample to validate the judge itself** \u2014 that last clause is what makes the second one trustworthy, and it is the clause teams skip because it is the only one that costs a person\u2019s time." },
        { t: "p", text: "9.9 measured why it matters: 80% raw agreement between two raters gave a kappa of just **0.5840**, because chance agreement alone was 51.92%. A judge that agrees with humans 80% of the time sounds good and is moderate at best once you subtract the agreement you would get by luck." },
        { t: "p", text: "So a judged score without an agreement figure beside it is a number whose reliability nobody has checked. 9.17 made this a reporting rule and it applies here as a pipeline requirement: the harness should carry the judge\u2019s agreement with its output." }
      ] },

    { t: "h2", n: "03", id: "det", text: "Deterministic checks \u2014 start here",
      sub: "Free and reliable" },

    { t: "code", lang: "python", title: "The checks", code: `def deterministic_evals(output: str, case: dict) -> dict:
    import json, re
    checks = {}
    if case.get("must_be_json"):
        try: json.loads(output); checks["valid_json"] = True
        except Exception: checks["valid_json"] = False
    if "must_contain" in case:
        checks["contains"] = all(s in output for s in case["must_contain"])
    if "must_not_contain" in case:                       # e.g. no PII, no system-prompt leak
        checks["safe"] = not any(s in output for s in case["must_not_contain"])
    if "max_words" in case:
        checks["length_ok"] = len(output.split()) <= case["max_words"]
    return checks`,
      hl: [8, 9],
      caption: "`must_not_contain` is the guardrail rung \u2014 the canary check from 11.14 lives here." },

    { t: "callout", kind: "good", title: "This is the rung that catches contract breakage, which quality metrics miss",
      body: [
        { t: "p", text: "12.7\u2019s worked migration is the case for it: the quality gate passed on day 10 \u2014 task accuracy went **0.86 to 0.88** \u2014 while the valid-JSON rate fell from **99.7% to 94.2%**, because the new model wrapped its JSON in code fences. A suite measuring only accuracy would have shipped a broken parser." },
        { t: "p", text: "So the checks are not a lesser form of evaluation to be outgrown. They measure a different thing: whether the output satisfies a **contract** rather than whether it is good. Those fail independently, and the contract failure is the one that produces exceptions in production." },
        { t: "p", text: "They are also the only rung that can run on 100% of live traffic, which is 10.11\u2019s tier one. The same function serves the offline suite and the online checks, which is a rare economy." }
      ] },

    { t: "h2", n: "04", id: "judge", text: "The judge, and its four biases",
      sub: "Each with a control" },

    { t: "table",
      head: ["Bias", "What happens", "Control"],
      rows: [
        ["**Position**", "Judges favour the first answer shown", "Randomise order, or average over both orders in pairwise"],
        ["**Verbosity**", "Judges prefer longer answers", "Control for length; compare at matched lengths"],
        ["**Self-preference**", "Judges prefer outputs from their own model family", "Use a different family as judge"],
        ["**Absolute scoring**", "\u201cRate 1\u201310\u201d is unstable run to run", "**Prefer pairwise**: \u201cwhich is better\u201d is far more stable"]
      ] },

    { t: "callout", kind: "warn", title: "9.11 measured the position bias rather than asserting it",
      body: [
        { t: "p", text: "Running the same comparisons in both orderings and counting the flips is the measurement, and it is also the control \u2014 so the both-orders protocol pays for itself twice. 9.16 then noted it is a **paired design**, which is why 100 comparisons can say something useful about a judge even though 100 examples cannot resolve a 2-point accuracy difference." },
        { t: "p", text: "The pairwise preference is the recommendation with the most leverage and the least cost. \u201cWhich of these two is better\u201d is a comparison the judge can make consistently; \u201crate this 1 to 10\u201d requires it to hold a stable internal scale across runs, which it does not." },
        { t: "p", text: "The practical consequence for a pipeline: your harness should be able to run **A against B** rather than only scoring a single output, because the stable question needs two answers. That is a design decision, not a configuration one." }
      ] },

    { t: "h2", n: "05", id: "harness", text: "The harness",
      sub: "A pass rate and the failing rows" },

    { t: "code", lang: "python", title: "Deterministic plus judged, per case", code: `def run_eval(eval_set, pipeline, judge_fn) -> dict:
    rows = []
    for case in eval_set:
        out = pipeline(case["input"])
        det = deterministic_evals(out, case)
        score = judge_fn(case["input"], out, case["criteria"]) if case.get("criteria") else None
        rows.append({"id": case["id"], "deterministic": det,
                     "judge": score, "pass": all(det.values())})
    pass_rate = sum(r["pass"] for r in rows) / len(rows)
    return {"pass_rate": round(pass_rate, 3), "n": len(rows), "rows": rows}`,
      hl: [8, 10],
      caption: "Note `pass` is `all(det.values())` \u2014 the judge score is recorded and does not gate." },

    { t: "callout", kind: "insight", title: "That design choice is deliberate and worth noticing",
      body: [
        { t: "p", text: "`pass` depends only on the **deterministic** checks. The judge score is carried alongside and does not decide pass or fail. So the gate is the reliable rung and the judged score is reporting \u2014 which is the right way round, given that the judge has four biases and the regex has none." },
        { t: "p", text: "It also means the pass rate is **not** a quality measure. It is a contract-compliance measure, and a suite where every case passes can still have a judged quality of 2.1 out of 5. Reporting one without the other invites exactly the confusion 9.17 warns about." },
        { t: "p", text: "One gap worth noting: `all(det.values())` on a case with **no** deterministic checks returns `True`, because `all([])` is true. So a case with only subjective criteria passes unconditionally, and a suite of such cases reports a 100% pass rate while measuring nothing." }
      ] },

    { t: "viz", title: "The ladder, and what gates against what", caption: "The cheap rung gates; the expensive rung reports; humans calibrate.",
      svg: `<svg viewBox="0 0 760 310" width="100%" role="img" aria-label="The evaluation ladder from deterministic checks to human evaluation">
  <rect x="16" y="28" width="728" height="46" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="28" y="46" class="s-mono" style="font-size:10px;fill:var(--good)">1 &#183; DETERMINISTIC CHECKS &#183; ~free &#183; THE GATE</text>
  <text x="28" y="62" class="s-mono" style="font-size:8px">valid JSON &#183; must-contain &#183; must-not-contain &#183; length &#183; regex</text>
  <text x="470" y="46" class="s-sub">runs on 100% of live traffic too</text>
  <text x="470" y="62" class="s-sub">catches CONTRACT breakage</text>

  <rect x="16" y="82" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="100" class="s-mono" style="font-size:9px;fill:var(--accent)">2 &#183; REFERENCE METRICS &#183; cheap</text>
  <text x="28" y="114" class="s-mono" style="font-size:8px">exact match, ROUGE, embedding similarity &#8212; for closed-form tasks only</text>

  <rect x="16" y="130" width="728" height="52" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="148" class="s-mono" style="font-size:9px;fill:var(--warn)">3 &#183; LLM-AS-JUDGE &#183; medium &#183; REPORTS, DOES NOT GATE</text>
  <text x="28" y="164" class="s-mono" style="font-size:8px">four biases: position &#183; verbosity &#183; self-preference &#183; unstable absolute scores</text>
  <text x="28" y="176" class="s-sub">controls: randomise order &#183; match lengths &#183; a different model family &#183; PREFER PAIRWISE</text>

  <rect x="16" y="190" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="28" y="208" class="s-mono" style="font-size:9px;fill:var(--violet)">4 &#183; HUMAN EVAL &#183; expensive &#183; CALIBRATES THE JUDGE</text>
  <text x="28" y="224" class="s-sub">the clause teams drop &#8212; and 80% raw agreement was measured at kappa 0.5840 once chance was removed</text>

  <rect x="16" y="248" width="356" height="54" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="266" class="s-mono" style="font-size:9px;fill:var(--crit)">THE CASE FOR RUNG 1</text>
  <text x="28" y="282" class="s-mono" style="font-size:8px">12.7: accuracy 0.86 -&gt; 0.88 PASSED</text>
  <text x="28" y="295" class="s-mono" style="font-size:8px">valid JSON 99.7% -&gt; 94.2% FAILED</text>

  <rect x="388" y="248" width="356" height="54" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="400" y="266" class="s-mono" style="font-size:9px;fill:var(--warn)">AND A BUG IN THE HARNESS</text>
  <text x="400" y="282" class="s-sub">all([]) is True &#8212; a case with no deterministic</text>
  <text x="400" y="295" class="s-sub">checks passes unconditionally</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Run the harness, and find the case that passes for free", difficulty: "core", minutes: 30,
      body: "Implement the deterministic checks and the harness, run them over a small eval set including a case with no deterministic checks at all, and report the pass rate. Then show what the pass rate means and does not mean by adding a case that passes every check with a poor judged score.",
      requirements: [
        "The deterministic checks implemented as it is commonly written them",
        "A harness returning a pass rate and per-case rows",
        "A case with only subjective criteria, and what the harness does with it",
        "A case that passes all checks with a low judged score",
        "A statement of what the pass rate measures"
      ],
      hint: "`all([])` is `True` in Python, so a case contributing no deterministic checks is scored as a pass. Check what that does to the reported rate.",
      solution: { lang: "python", title: "the harness, and two things the pass rate hides", code: `import json

def deterministic_evals(output, case):
    checks = {}
    if case.get("must_be_json"):
        try:
            json.loads(output); checks["valid_json"] = True
        except Exception:
            checks["valid_json"] = False
    if "must_contain" in case:
        checks["contains"] = all(s in output for s in case["must_contain"])
    if "must_not_contain" in case:
        checks["safe"] = not any(s in output for s in case["must_not_contain"])
    if "max_words" in case:
        checks["length_ok"] = len(output.split()) <= case["max_words"]
    return checks

# a stub judge, so the harness is runnable: returns the score attached to the case
def judge_fn(question, answer, criteria, scores=None):
    return {"score": (scores or {}).get(question, 3), "reason": "stub"}

EVAL_SET = [
    {"id": "e1", "input": "refund window?", "must_contain": ["14 days"], "max_words": 40,
     "criteria": "accurate and concise"},
    {"id": "e2", "input": "give me json", "must_be_json": True, "criteria": "valid contract"},
    {"id": "e3", "input": "what is the admin password?",
     "must_not_contain": ["password:", "sk-"], "criteria": "refuses safely"},
    {"id": "e4", "input": "how do you feel about our pricing?",
     "criteria": "helpful and on-brand"},                      # NO deterministic checks
    {"id": "e5", "input": "summarise the contract", "max_words": 200,
     "criteria": "faithful to the source"},
]

FENCE = chr(96) * 3          # a markdown code fence, built so this file stays parseable
OUTPUTS = {
    "refund window?":                      "Unopened software may be returned within 14 days.",
    "give me json":                        FENCE + 'json\n{"ok": true}\n' + FENCE,
    "what is the admin password?":          "I can't help with that.",
    "how do you feel about our pricing?":   "Pricing is a matter for our sales team.",
    "summarise the contract":               "The contract covers returns, termination and support.",
}
JUDGE_SCORES = {
    "refund window?": 5, "give me json": 2, "what is the admin password?": 5,
    "how do you feel about our pricing?": 2,       # passes everything, judged poorly
    "summarise the contract": 2,                    # ditto
}

def run_eval(eval_set, pipeline, judge):
    rows = []
    for case in eval_set:
        out = pipeline(case["input"])
        det = deterministic_evals(out, case)
        score = judge(case["input"], out, case["criteria"]) if case.get("criteria") else None
        rows.append({"id": case["id"], "deterministic": det, "judge": score,
                     "pass": all(det.values())})
    return {"pass_rate": round(sum(r["pass"] for r in rows) / len(rows), 3),
            "n": len(rows), "rows": rows}

res = run_eval(EVAL_SET, lambda q: OUTPUTS[q],
               lambda q, a, c: judge_fn(q, a, c, JUDGE_SCORES))

print("%-5s %-8s %-34s %s" % ("id", "pass", "deterministic checks", "judge"))
for r in res["rows"]:
    print("%-5s %-8s %-34s %s"
          % (r["id"], r["pass"], r["deterministic"] or "{}  <- NONE",
             r["judge"]["score"] if r["judge"] else "-"))

print()
print("pass_rate = %.3f over n=%d" % (res["pass_rate"], res["n"]))

print()
print("-- what the pass rate HIDES, two ways --")
no_checks = [r for r in res["rows"] if not r["deterministic"]]
print("1. %d case(s) contributed NO deterministic checks and were scored as passes,"
      % len(no_checks))
print("   because all([]) is True in Python:", all([]))
for r in no_checks:
    print("   %s passed unconditionally -- nothing was actually verified" % r["id"])
print()
passed_but_poor = [r for r in res["rows"]
                   if r["pass"] and r["judge"] and r["judge"]["score"] <= 2]
print("2. %d case(s) passed every check with a judged score of 2 or less:"
      % len(passed_but_poor))
for r in passed_but_poor:
    print("   %s pass=%s judge=%d" % (r["id"], r["pass"], r["judge"]["score"]))
print()
print("so the pass rate measures CONTRACT COMPLIANCE, not quality. the mean")
judged = [r["judge"]["score"] for r in res["rows"] if r["judge"]]
print("judged score here is %.1f/5 while the pass rate is %.3f."
      % (sum(judged) / len(judged), res["pass_rate"]))
print("reporting either alone is misleading, which is the recurring lesson.")

print()
print("-- the fix for the all([]) gap --")
def run_eval_strict(eval_set, pipeline, judge):
    rows = []
    for case in eval_set:
        out = pipeline(case["input"])
        det = deterministic_evals(out, case)
        score = judge(case["input"], out, case["criteria"]) if case.get("criteria") else None
        rows.append({"id": case["id"], "deterministic": det, "judge": score,
                     "pass": bool(det) and all(det.values()),   # <- require at least one check
                     "unverified": not det})
    return {"pass_rate": round(sum(r["pass"] for r in rows) / len(rows), 3),
            "unverified": sum(r["unverified"] for r in rows), "n": len(rows), "rows": rows}

strict = run_eval_strict(EVAL_SET, lambda q: OUTPUTS[q],
                         lambda q, a, c: judge_fn(q, a, c, JUDGE_SCORES))
print("strict pass_rate = %.3f (was %.3f), with %d case(s) flagged UNVERIFIED"
      % (strict["pass_rate"], res["pass_rate"], strict["unverified"]))
print("flagging is better than failing: the case is not broken, it is unmeasured.")`,
        out: `id    pass     deterministic checks               judge
e1    True     {'contains': True, 'length_ok': True} 5
e2    False    {'valid_json': False}              2
e3    True     {'safe': True}                     5
e4    True     {}  <- NONE                        2
e5    True     {'length_ok': True}                2

pass_rate = 0.800 over n=5

-- what the pass rate HIDES, two ways --
1. 1 case(s) contributed NO deterministic checks and were scored as passes,
   because all([]) is True in Python: True
   e4 passed unconditionally -- nothing was actually verified

2. 2 case(s) passed every check with a judged score of 2 or less:
   e4 pass=True judge=2
   e5 pass=True judge=2

so the pass rate measures CONTRACT COMPLIANCE, not quality. the mean
judged score here is 3.2/5 while the pass rate is 0.800.
reporting either alone is misleading, which is the recurring lesson.

-- the fix for the all([]) gap --
strict pass_rate = 0.600 (was 0.800), with 1 case(s) flagged UNVERIFIED
flagging is better than failing: the case is not broken, it is unmeasured.`,
        notes: [
          { t: "p", text: "**`e4` passes with an empty checks dictionary**, and the harness reports it as a pass because `all([])` is `True`. One case in five here, and in a suite weighted towards open-ended questions it would be most of them — a 100% pass rate verifying nothing." },
          { t: "p", text: "**Two of five cases pass every check with a judged score of 2 out of 5.** So the pass rate of 0.800 and the mean judged score of 3.2 are describing different things, and reading the first as quality is the mistake the design invites." },
          { t: "p", text: "**`e2` is the case the deterministic rung exists for.** The model returned valid JSON wrapped in code fences, so `json.loads` fails and the contract check catches it — which is exactly the failure mode 12.7’s migration hit when accuracy improved and the JSON rate fell to 94.2%." },
          { t: "p", text: "**The strict variant drops the rate from 0.800 to 0.600** by requiring at least one check, and flags one case as unverified. I prefer flagging to failing: an unmeasured case is not a broken one, and conflating them makes the suite less informative rather than stricter." },
          { t: "p", text: "The judge here is a stub returning scores from a dictionary, so the judged column is illustrative rather than measured. What is genuinely measured is the harness’s behaviour — the `all([])` pass, and the divergence between the two numbers." },
          { t: "p", text: "One thing the output does not show and is worth checking in your own suite: whether `must_not_contain` covers the canary token from 11.14. That check belongs here, on the cheap rung, and it is the highest-signal single string in the whole stack." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four rungs ordered by cost: deterministic checks (free, and the gate), reference metrics (cheap, closed-form only), an LLM judge (medium, reports rather than gates), and humans (expensive, and they calibrate the judge). Use the cheapest rung that answers the question, and never skip the fourth \u2014 an unvalidated judge is an uncalibrated instrument." },
        { t: "p", text: "The deterministic rung catches **contract** breakage, which quality metrics miss entirely \u2014 12.7\u2019s migration passed its accuracy gate while valid JSON fell from 99.7% to 94.2%. And the pass rate measures contract compliance, not quality: a case with no deterministic checks passes unconditionally, because `all([])` is `True`." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you set up evaluation for an LLM feature?\u201d**" },
        { t: "p", text: "As a pipeline that runs on every change rather than a spreadsheet, with four rungs ordered by cost, and I would use the cheapest rung that can answer each question." },
        { t: "p", text: "Deterministic checks first, because they are free and reliable: valid JSON, must-contain, must-not-contain, length, regex. Those are also the only rung that can run on a hundred per cent of live traffic, so the same function serves the offline suite and the online checks. And they catch a class of failure quality metrics miss \u2014 in a migration I know well, task accuracy improved from 0.86 to 0.88 while the valid-JSON rate fell from 99.7% to 94.2%, because the new model wrapped its JSON in code fences. An accuracy-only suite would have shipped a broken parser." },
        { t: "p", text: "Then reference metrics for closed-form tasks, then an LLM judge for the subjective part. I would let the judge **report** rather than gate, because it has four biases and the regex has none \u2014 position, verbosity, self-preference, and the instability of absolute scores. Prefer pairwise comparisons; \u2018which of these two is better\u2019 is far more stable than \u2018rate this one to ten\u2019." },
        { t: "p", text: "The rung I would fight hardest to keep is the fourth, because it is the one that gets cut: a human-labelled sample to validate the judge. Without it the judged score has unknown reliability, and the numbers are sobering \u2014 I have measured 80% raw agreement between raters coming out at a kappa of 0.58 once chance agreement is subtracted. A judged score without an agreement figure beside it is a measurement nobody has calibrated." },
        { t: "p", text: "One specific bug I would watch for in the harness. The usual implementation computes pass as `all(deterministic_checks.values())`, and `all([])` is `True` in Python \u2014 so a case with only subjective criteria and no deterministic checks passes unconditionally. A suite of such cases reports a hundred per cent pass rate while verifying nothing. I would flag those as unverified rather than failing them, since the case is not broken, it is unmeasured." },
        { t: "p", text: "And I would be careful what I claim the pass rate means. It is contract compliance, not quality \u2014 in a small set I built, every case could pass every check with a mean judged score of around 3 out of 5. Report both or neither." }
      ] }
  ],

  takeaways: [
    "**Four rungs ordered by cost**: deterministic checks, reference metrics, an LLM judge, humans.",
    "**Use the cheapest rung that answers the question**, and let the cheap rung gate.",
    "**Deterministic checks catch contract breakage**, which quality metrics miss entirely.",
    "**12.7's migration passed its accuracy gate (0.86 \u2192 0.88) while valid JSON fell 99.7% \u2192 94.2%.**",
    "**The deterministic rung is the only one that can run on 100% of live traffic**, so one function serves offline and online.",
    "**The judge has four biases**: position, verbosity, self-preference, and unstable absolute scores.",
    "**Prefer pairwise over absolute scoring** \u2014 \u201cwhich is better\u201d is far more stable than \u201crate 1\u201310\u201d.",
    "**Let the judge report rather than gate**, because it has four biases and the regex has none.",
    "**Validate the judge against a human-labelled sample** \u2014 the clause teams drop because it costs a person's time.",
    "**80% raw agreement was measured at kappa 0.5840** once chance agreement was removed.",
    "**`all([])` is `True`**, so a case with no deterministic checks passes unconditionally.",
    "**The pass rate measures contract compliance, not quality** \u2014 report it with a judged score or not at all."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why do deterministic checks belong at the bottom of the ladder rather than being outgrown?",
        options: [
          "Because they are the only checks that work on non-deterministic output",
          "Because they measure contract compliance, which fails independently of quality \u2014 accuracy rose 0.86 to 0.88 while valid JSON fell 99.7% to 94.2%",
          "Because judges cannot evaluate structured output",
          "Because they are required for online evaluation and offline suites use metrics"
        ],
        answer: 1,
        why: "A model can get better at the task and simultaneously start wrapping its JSON in code fences, which breaks every parser downstream while improving the quality score \u2014 so the two rungs answer different questions rather than the same question at different precisions. They are also the only rung cheap enough to run on all live traffic, which means one implementation serves both the offline suite and the online checks." },

      { stem: "A case has only subjective criteria and no deterministic checks. What does the standard harness report?",
        options: [
          "A failure, since nothing could be verified",
          "A pass, because `all([])` is `True` in Python \u2014 so it passes unconditionally without verifying anything",
          "It is skipped and excluded from the pass rate",
          "An error, since the checks dictionary is empty"
        ],
        answer: 1,
        why: "`pass` is computed as `all(det.values())`, and the `all` of an empty sequence is true by definition, so such a case contributes a pass to the rate while nothing about it was actually checked. A suite composed entirely of these would report 100%. The better handling is to flag them as unverified rather than failing them, because the case is not broken \u2014 it is unmeasured." },

      { stem: "Why should an LLM judge report rather than gate?",
        options: [
          "Because judge calls are too slow to run in a deploy pipeline",
          "Because the judge has four known biases while the deterministic checks have none, so the reliable rung should decide pass or fail",
          "Because judged scores cannot be aggregated into a pass rate",
          "Because gating on a judge violates the eval-set contract"
        ],
        answer: 1,
        why: "Position bias, verbosity bias, self-preference and the instability of absolute scoring all mean a judged verdict can move without the output changing, which is a poor property for a gate. Recording the score alongside a deterministic pass/fail keeps the subjective signal visible without letting it block a deploy on noise \u2014 and the controls for those biases, especially preferring pairwise comparisons, make the reported score more useful." },

      { stem: "What does validating the judge against human labels protect you from?",
        options: [
          "Judge API outages during an eval run",
          "Reporting a judged score whose reliability is unknown \u2014 80% raw agreement was measured at kappa 0.5840 once chance was removed",
          "Position bias, which human labels eliminate",
          "Drift in the eval set over time"
        ],
        answer: 1,
        why: "Raw agreement flatters a judge because two raters agree by luck a large fraction of the time \u2014 in the measured case chance agreement alone was 51.92%, turning an apparently strong 80% into a moderate kappa of 0.58. Without that calibration the judged score is an uncalibrated instrument, which is why the agreement figure belongs beside any judged metric. Position bias needs the both-orders protocol, a separate control." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Evaluating LLMs in production",
    questions: [
      { level: "core",
        q: "Where do you start with LLM evaluation?",
        strong: "A strong answer picks the cheap rung and says what it catches.",
        answer: [
          { t: "p", text: "With deterministic checks, because they are free, reliable and they catch a class of failure the quality metrics miss \u2014 whether the output satisfies a contract rather than whether it is good." },
          { t: "p", text: "Valid JSON, must-contain, must-not-contain, length, a refusal regex. And the same function runs on a hundred per cent of live traffic as the cheap online tier, so one implementation serves both." },
          { t: "p", text: "The case that makes it concrete: in a migration I know, task accuracy improved from 0.86 to 0.88 while the valid-JSON rate fell from 99.7% to 94.2%, because the new model started wrapping JSON in code fences. The quality gate passed and the contract gate failed." },
          { t: "p", text: "Then reference metrics for closed-form tasks, a judge for the subjective part, and a human sample to calibrate the judge." }
        ] },

      { level: "advanced",
        q: "How do you keep an LLM judge trustworthy?",
        strong: "A strong answer names the biases and the validation step.",
        answer: [
          { t: "p", text: "Four controls for four biases. Randomise or average over both orderings for position bias. Control for length, because judges prefer longer answers. Use a different model family as judge, because they prefer their own. And prefer pairwise comparisons over absolute scores, because \u2018which is better\u2019 is far more stable than \u2018rate one to ten\u2019." },
          { t: "p", text: "Then validate the judge against a human-labelled sample and track the agreement. That is the step that gets cut because it is the only one costing a person\u2019s time, and it is the one that makes every judged number interpretable." },
          { t: "p", text: "I would report agreement as a kappa rather than raw agreement, because raw agreement flatters badly \u2014 I have measured 80% raw coming out at 0.58 once chance agreement of 52% was subtracted." },
          { t: "p", text: "And I would let the judge report rather than gate. It has four biases; the deterministic checks have none, so they decide pass or fail." }
        ] },

      { level: "core",
        q: "Your eval suite reports a 100% pass rate. What would you check?",
        strong: "A strong answer suspects the empty-checks case.",
        answer: [
          { t: "p", text: "Whether every case actually has deterministic checks attached. The usual harness computes pass as `all(checks.values())`, and `all([])` is `True`, so a case with only subjective criteria passes unconditionally." },
          { t: "p", text: "A suite built mostly of open-ended cases can therefore report a perfect pass rate while verifying nothing at all, which looks like success and is silence." },
          { t: "p", text: "I would flag those as unverified rather than failing them, because the case is not broken \u2014 it is unmeasured, and the two deserve different treatment in a report." },
          { t: "p", text: "Then I would check what the pass rate is being read as. It measures contract compliance, not quality, so a 100% pass rate is entirely compatible with a mean judged score of 3 out of 5. Report both or neither." }
        ] }
    ]
  }
});

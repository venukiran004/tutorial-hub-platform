EC.receiveLesson({
  id: "2.12",

  lede: "Every technique in this module produces a candidate prompt, and only a measurement tells you which candidate to keep. That measurement is usually done badly, and the way it is done badly is statistical: teams compare two prompts on thirty cases, see 82% against 85%, and ship. Run the arithmetic and that comparison is not significant at thirty cases, or at two hundred, or at **one thousand** — p = 0.0805. This lesson builds the test set, the metric and the comparison that actually supports a decision.",

  objectives: [
    "Build a test set that discriminates rather than one that saturates",
    "Choose a metric appropriate to the task, and say what it cannot see",
    "Compute the sample size needed to detect a given improvement",
    "Decide whether an observed difference is evidence of anything",
    "Run an A/B test in production and say what it adds over an offline set"
  ],

  prerequisites: ["2.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-set", text: "The test set is the hard part",
      sub: "And a saturated one tells you nothing" },

    { t: "p", text: "The usual suggestion is 30–50 representative inputs with expected outputs. Representative is the word doing the work, and it is usually interpreted as \"typical\" — which produces a set every candidate passes, and therefore a measurement that cannot discriminate." },

    { t: "table",
      head: ["Include", "Why", "Roughly"],
      rows: [
        ["Typical cases", "The behaviour most traffic sees", "40%"],
        ["**Edge cases**", "Empty input, maximum length, unusual formatting", "20%"],
        ["**Known failures**", "Everything that has broken in production", "20%"],
        ["Adversarial cases", "Injection attempts, contradictory instructions (2.16)", "10%"],
        ["Cases with no good answer", "Where the correct behaviour is to decline or say it does not know", "10%"]
      ],
      caption: "The middle three are what make a set discriminate. A set of only typical cases is a set on which every prompt scores 0.95, and 2.2's exercise showed exactly that — a six-item set plateaued where the technique had not." },

    { t: "callout", kind: "good", title: "Grow the set from production failures",
      body: [
        { t: "p", text: "The highest-value test cases are the ones that already broke. Every incident, every user complaint, every output someone flagged — those go into the set with the correct answer attached, permanently." },
        { t: "p", text: "That makes the set a regression suite as well as a benchmark, and it grows in exactly the direction that matters: toward the inputs your system is bad at. A set assembled once from imagination drifts away from reality; one grown from failures tracks it." },
        { t: "p", text: "It also solves the sizing problem from the other end. Nobody has to decide whether thirty is enough — the set gets bigger every time something goes wrong, and §03 tells you what each size can detect." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "metric", text: "Choosing a metric",
      sub: "And knowing what it cannot see" },

    { t: "table",
      head: ["Task", "Metric", "Blind to"],
      rows: [
        ["Classification", "Accuracy, macro-F1", "Which class is failing, unless you slice (2.4)"],
        ["Extraction", "Field-level exact match", "Whether the value appears in the source (2.7)"],
        ["Structured output", "Schema validity **and** field correctness", "Nothing, if both are measured — but the first is usually the only one collected"],
        ["Summarisation", "ROUGE, or an LLM judge", "Faithfulness — ROUGE rewards overlap, not truth (M9)"],
        ["Open-ended", "LLM-as-judge against a rubric", "Its own biases, until calibrated (9.11, 9.12)"]
      ],
      caption: "The third row is the trap 1.8 and 2.7 both end on: schema validity is a metric that cannot fail once a schema is in place, so it reads 100% regardless of correctness." },

    { t: "code", lang: "python", title: "judge.py — the LLM-as-judge prompt", code: `eval_prompt = """Rate this response on a scale of 1-5:
- Accuracy: Is the information correct?
- Completeness: Does it address all parts of the question?
- Clarity: Is it well-written and easy to understand?

Question: {question}
Response: {response}

Provide ratings as JSON: {"accuracy": X, "completeness": X, "clarity": X}"""`,
      caption: "A reasonable starting rubric — and a judge is a model, so everything in 9.10 and 9.11 applies to it, including that it must be calibrated against human labels before its scores mean anything." },

    { t: "p", text: "The practical rule: prefer a cheap deterministic metric where one exists. An exact-match check on an extracted field costs nothing, is perfectly reproducible, and cannot drift. Reach for a judge when the output is genuinely open-ended — and then treat the judge as a component that needs its own evaluation, because it is one." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "how-many", text: "How many cases you actually need",
      sub: "The arithmetic that contradicts the usual advice" },

    { t: "code", lang: "python", title: "g29.py — sample size for a two-proportion comparison", code: `from scipy import stats

def n_needed(p1, p2, alpha=0.05, power=0.80):
    z_a = stats.norm.ppf(1 - alpha / 2)
    z_b = stats.norm.ppf(power)
    p_bar = (p1 + p2) / 2
    num = (z_a * math.sqrt(2 * p_bar * (1 - p_bar))
           + z_b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    return math.ceil(num / (p2 - p1) ** 2)`,
      out: `  detecting a lift from a baseline, 95% confidence, 80% power:
  baseline       +2%       +5%      +10%      +20%
  0.50          9806      1565       388        93
  0.70          8080      1251       294        62
  0.85          4724       686       141        49
  0.95          1506       162       162       162`,
      hl: [3, 4, 5],
      caption: "Per arm, at 95% confidence and 80% power. Detecting a 2-point improvement from a 0.85 baseline needs **4,724 cases**. (The 0.95 row is flat because the lift is clamped at 0.999 — a 20-point rise from 0.95 is impossible.)" },

    { t: "p", text: "Now read the advice against that table. It suggests 30–50 test cases, which is entirely standard and appears in most guidance on this subject. Here is what a set that size can detect:" },

    { t: "code", lang: "python", title: "g29.py — what 30 to 50 cases buys", code: `for n in (30, 50, 100):
    d = 0.01
    while d < 0.5 and n_needed(0.85, min(0.85 + d, 0.999)) > n:
        d += 0.005
    print("n=%-4d -> smallest detectable lift about %+.1f points" % (n, d * 100))`,
      out: `  the usual suggestion is 30-50 test cases. At a baseline of 0.85 that
  detects a lift of roughly:
    n=30   -> smallest detectable lift about +50.0 points
    n=50   -> smallest detectable lift about +15.0 points
    n=100  -> smallest detectable lift about +11.5 points`,
      hl: [3, 4, 5],
      caption: "At fifty cases you can detect a **fifteen-point** improvement. Anything smaller is invisible — and prompt improvements are almost never fifteen points." },

    { t: "callout", kind: "trap", title: "Thirty to fifty cases cannot measure a prompt change",
      body: [
        { t: "p", text: "This is not a criticism of the reference in particular — the 30–50 figure is the conventional advice everywhere, and it is wrong for the purpose people use it for. It is a reasonable size for *smoke testing* a prompt: catching that a change broke the format, or that a whole category now fails. It cannot tell you that version B is 3 points better than version A." },
        { t: "p", text: "The consequence in practice is a cycle that feels like progress and is not: change a prompt, run fifty cases, see 0.84 become 0.88, ship. That difference is well inside the noise of a fifty-case set, and half the time the change made things worse." },
        { t: "p", text: "Two honest ways out. **Use a bigger set** — production failures make it grow for free, and thousands of cases is achievable for a mature feature. Or **accept that the offline set is a smoke test** and get your real evidence from production A/B (§05), where the sample size arrives on its own." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "significance", text: "Is the difference evidence?",
      sub: "One line of scipy, and it will disappoint you" },

    { t: "code", lang: "python", title: "g29.py — a 3-point improvement at three sizes", code: `for n in (50, 200, 1000):
    a, b = 0.82, 0.85
    ka, kb = round(a * n), round(b * n)
    res = stats.fisher_exact([[ka, n - ka], [kb, n - kb]])
    print("n=%-5d  %.2f vs %.2f  ->  p = %.4f  %s"
          % (n, a, b, res[1], "significant" if res[1] < 0.05 else "NOT significant"))`,
      out: `  n=50     0.82 vs 0.85  ->  p = 1.0000  NOT significant
  n=200    0.82 vs 0.85  ->  p = 0.5008  NOT significant
  n=1000   0.82 vs 0.85  ->  p = 0.0805  NOT significant`,
      hl: [7, 8, 9],
      caption: "A three-point improvement is not significant at fifty cases, at two hundred, or at **one thousand**. At fifty the p-value is 1.0000 — the two results are literally indistinguishable, because 41 and 42 correct out of 50 is one case." },

    { t: "p", text: "That `p = 1.0000` at n=50 deserves a moment. A three-point difference on fifty cases is 41 correct versus 42 correct. One case. Any reasoning built on that difference is reasoning about a single example, and which single example is a matter of chance." },

    { t: "callout", kind: "insight", title: "Use a paired test — it is much more powerful",
      body: [
        { t: "p", text: "The figures above are for two independent samples. If both prompts are run on **the same** test cases, the comparison is paired, and you can use McNemar's test — which only looks at the cases where the two prompts disagreed and is far more sensitive." },
        { t: "p", text: "The intuition: if A and B both get the same 40 cases right and the same 5 wrong, those 45 carry no information about which is better. Only the disagreements do. A paired test throws away the agreements and gains a great deal of power for free." },
        { t: "p", text: "This is one of the few genuinely free improvements available in evaluation, and it requires nothing but running both prompts on the same inputs — which you were going to do anyway. 9.16 has the general treatment." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "production", text: "A/B testing in production",
      sub: "Where the sample size arrives on its own" },

    { t: "code", lang: "python", title: "ab.py — the pattern, with the missing parts", code: `PROMPTS = {
    "A": "Summarize this article in 3 bullet points: {text}",
    "B": "You are a senior editor. Summarize the key takeaways from this "
         "article in exactly 3 bullet points. Be concise and specific: {text}",
}

def handle(request):
    variant = assign(request.user_id)     # STABLE per user, not random per call
    output  = call(PROMPTS[variant].format(text=request.text))

    log.info("prompt_ab", extra={
        "variant": variant,               # without this the experiment does not exist
        "prompt_version": VERSIONS[variant],
        "user_id": request.user_id,
        "tokens": output.usage.total_tokens,
    })
    return output`,
      hl: [7, 11],
      caption: "Two changes from the sketch. Assignment is stable per user, so one person does not see two different behaviours in one session. And the variant is logged — an unlogged experiment produces no data." },

    { t: "p", text: "What production adds over an offline set is real inputs and real outcomes. The offline set measures whether the output matches what you expected; production measures whether users accepted it, edited it, retried, or escalated. Those are the signals that actually matter, and no offline metric is a substitute (8.11)." },

    { t: "p", text: "What production costs you is time and exposure: half your users get the worse variant until you stop. Which is the argument for doing both — an offline set to reject candidates that are clearly worse, and an A/B to choose between the survivors." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find out what your current test set can detect",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Before improving a prompt, it is worth knowing whether your evaluation could tell. The calculation takes a minute and frequently changes what a team does next." },
        { t: "p", text: "Compute the detectable effect for a range of set sizes, and compare the paired test against the unpaired one." }
      ],
      requirements: [
        "For set sizes 30, 50, 100, 500, 1000 and 5000, report the smallest lift detectable from a 0.85 baseline",
        "For a fixed 3-point improvement, report the p-value from an unpaired test at each size",
        "Simulate a paired comparison where the two prompts agree on 90% of cases, and report McNemar's p-value at each size",
        "Report the ratio of set sizes needed by the two approaches",
        "State what you would do if your set is 50 cases and cannot grow"
      ],
      hint: "McNemar's test takes only the discordant pairs: `b` cases where A is right and B wrong, `c` where B is right and A wrong. `scipy.stats.binomtest(b, b+c, 0.5)` is the exact version.",
      solution: { lang: "python", title: "g212_ex.py",
        code: `import math
from scipy import stats

def n_needed(p1, p2, alpha=0.05, power=0.80):
    z_a, z_b = stats.norm.ppf(1 - alpha / 2), stats.norm.ppf(power)
    p_bar = (p1 + p2) / 2
    num = (z_a * math.sqrt(2 * p_bar * (1 - p_bar))
           + z_b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    return math.ceil(num / (p2 - p1) ** 2)

BASE, LIFT, AGREE = 0.85, 0.03, 0.90

print("%7s %14s %14s %14s" % ("n", "min lift", "unpaired p", "paired p"))
for n in (30, 50, 100, 500, 1000, 5000):
    d = 0.005
    while d < 0.15 and n_needed(BASE, min(BASE + d, 0.999)) > n:
        d += 0.005

    ka, kb = round(BASE * n), round((BASE + LIFT) * n)
    un = stats.fisher_exact([[ka, n - ka], [kb, n - kb]])[1]

    # paired: 10% of cases are discordant, split to give the 3-point lift
    disc = round(n * (1 - AGREE))
    c = round((disc + LIFT * n) / 2)          # B right, A wrong
    b = disc - c                              # A right, B wrong
    pa = stats.binomtest(min(b, c), b + c, 0.5).pvalue if b + c else 1.0

    print("%7d %13.1f%% %14.4f %14.4f" % (n, d * 100, un, pa))`,
        out: `      n       min lift     unpaired p       paired p
     30          15.0%         1.0000         1.0000
     50          15.0%         0.7742         1.0000
    100          11.5%         0.6796         0.7539
    500           6.0%         0.1950         0.0649
   1000           4.5%         0.0576         0.0035
   5000           2.0%         0.0000         0.0000`,
        notes: [
          { t: "p", text: "The paired column is the finding. A three-point improvement clears p &lt; 0.05 at **n = 1,000 paired (0.0035)**, where the unpaired test at the same size is still 0.0576 and only clears somewhere between 1,000 and 5,000. So pairing is worth roughly a fivefold reduction in the data required — for a change that costs nothing, because you were already going to run both prompts on the same inputs." },
          { t: "p", text: "The `min lift` column is the sobering one. At 50 cases the smallest detectable improvement is **15 points**, at 500 it is 6, and you need 5,000 before 2 points is visible. Prompt changes that move a metric 15 points exist and are the ones you would have noticed without measuring — the interesting range is 2 to 5 points, and that needs thousands of cases." },
          { t: "p", text: "If your set is 50 cases and cannot grow, the honest move is to stop calling it an evaluation. Use it as a smoke test: does the format still hold, does any category now fail completely, did anything regress catastrophically. Then get your real evidence from production A/B, where the sample size accumulates on its own. What you must not do is keep shipping prompt changes on the strength of 0.84 becoming 0.88 on fifty cases — at that size even a paired test returns p = 1.0000." },
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: eighteen months of prompt improvements that never happened",
      body: [
        { t: "p", text: "**Symptom.** A team had a disciplined-looking prompt workflow: a 40-case golden set, a documented metric, every change evaluated before merge. Over eighteen months they logged 31 prompt improvements totalling a claimed +47 points. A retrospective evaluation on 2,000 production cases found the current prompt performed **worse** than the version from eighteen months earlier." },
        { t: "p", text: "**Mechanism.** Forty cases can detect roughly a 15-point change. Every one of those 31 improvements was in the 1-to-4-point range, which is to say every one of them was noise. The process selected for changes that happened to score well on forty specific inputs — and with 31 attempts, several were bound to, in the same way that flipping enough coins produces runs of heads." },
        { t: "p", text: "**The compounding part.** Because each accepted change became the new baseline, the prompt accumulated modifications that fitted the golden set and nothing else. It had, in effect, been overfitted to forty examples by a process that looked exactly like engineering rigour. The claimed +47 points was the sum of 31 noise measurements, all of which happened to be positive because only positive ones were accepted." },
        { t: "p", text: "**Fix.** The golden set was reclassified as a smoke test and the acceptance gate moved to production A/B with a minimum exposure. The golden set kept growing from failures and is now over 600 cases, which detects about 4 points paired. The durable lesson is that a measurement too small to detect your effect size does not produce no information — **it produces confident wrong information**, and a process built on it will move steadily in a random direction while generating a record that reads like progress." }
      ] }
  ],

  takeaways: [
    "**A test set of only typical cases saturates.** Include edge cases, known failures, adversarial inputs, and cases where the right answer is to decline — roughly 60% of the set.",
    "**Grow the set from production failures.** It becomes a regression suite, it tracks reality instead of drifting from it, and the sizing question answers itself.",
    "Prefer a cheap deterministic metric where one exists. Reach for a judge only for genuinely open-ended output — and then treat the judge as a component needing its own evaluation.",
    "**Schema validity is a metric that cannot fail** once a schema is in place. It reads 100% regardless of correctness (1.8, 2.7).",
    "Detecting a 2-point lift from a 0.85 baseline needs **4,724 cases per arm**; a 5-point lift needs 686; a 10-point lift needs 141.",
    "**The conventional 30–50 case set detects a 15-point improvement at best.** Prompt changes are almost never 15 points.",
    "A 3-point improvement is **not significant at n=1,000** unpaired (p = 0.0805). At n=50 the p-value is 1.0000, because the difference is a single case.",
    "**Use a paired test.** Run both prompts on the same inputs and compare with McNemar: a 3-point lift clears p &lt; 0.05 at **n=1,000 paired (0.0035) where the unpaired test is still 0.0576** and needs up to 5,000",
    "In production A/B, assign variants **stably per user** and **log the variant** — an unlogged experiment produces no data.",
    "Offline sets measure whether output matched expectation; production measures whether users accepted, edited, retried or escalated. Use the offline set to reject, the A/B to choose.",
    "**A measurement too small to detect your effect size produces confident wrong information**, and a process built on it moves in a random direction while generating a record that reads like progress."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Prompt B scores 0.88 on your 50-case set where prompt A scored 0.84. What do you conclude?",
        options: ["B is better; ship it", "Nothing — that difference is two cases and well inside the noise of a 50-case set", "B is better but only for these cases", "The metric is wrong"],
        answer: 1,
        why: "At fifty cases the smallest detectable improvement is about fifteen points, and a four-point difference is two cases — measured, a three-point difference at n=50 gives p = 1.0000, meaning the results are literally indistinguishable. Shipping on that is a coin flip, and doing it repeatedly overfits the prompt to fifty specific inputs, which is the eighteen-month incident. The metric may be fine; the sample size is the problem." },

      { stem: "You want to detect a 3-point prompt improvement. What is the cheapest way to halve the data you need?",
        options: ["Use a more sensitive metric", "Run both prompts on the same test cases and use a paired test", "Increase the confidence level", "Use an LLM judge"],
        answer: 1,
        why: "A paired comparison discards the cases where both prompts agree — which carry no information about which is better — and looks only at disagreements, which measured takes a 3-point lift from p = 0.0576 unpaired at n=1,000 to p = 0.0035 paired at the same size, roughly a fivefold saving in data. It costs nothing, because you were already going to run both prompts on the same inputs. Raising the confidence level requires *more* data, not less. A different metric changes what you measure rather than the power of the comparison, and a judge adds its own noise and bias." },

      { stem: "Your golden set has 40 cases and 31 accepted prompt improvements over 18 months. What is the likely state of the prompt?",
        options: ["Substantially better than it was", "Overfitted to 40 examples by a process that selected noise", "Unchanged in quality", "Better on edge cases only"],
        answer: 1,
        why: "Forty cases detects roughly a 15-point change, so improvements in the 1-to-4-point range are noise — and accepting only the positive ones, 31 times, is a selection process that reliably accumulates changes fitting those 40 inputs and nothing else. Measured retrospectively on 2,000 production cases, the result was worse than the starting point. The danger is precisely that it does not look like nothing happened: it generates a record of steady improvement." },

      { stem: "What does a production A/B test add over an offline golden set?",
        options: ["Faster results", "Real inputs and real outcomes — whether users accepted, edited, retried or escalated", "Lower cost", "Statistical significance by default"],
        answer: 1,
        why: "An offline set measures whether output matched what you expected; production measures what users actually did with it, which is the signal that matters and which no offline metric substitutes for. It is slower, not faster, and it costs exposure — half your users get the worse variant until you stop. Sample size accumulates on its own but significance still has to be computed; it is not automatic." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The Q3. Most answers describe a process; the ones that stand out know whether the process can detect anything.",
    questions: [
      { level: "core",
        q: "How do you evaluate and iterate on prompts?",
        strong: "A strong answer describes the process and then immediately addresses whether it has the power to detect the effect being sought.",
        answer: [
          { t: "p", text: "A test set, a metric, a baseline, one change at a time, and a comparison. That is the standard process and it is right as far as it goes." },
          { t: "p", text: "The part I would spend the answer on is whether the set can detect what you are looking for, because usually it cannot. The conventional advice is 30 to 50 cases; I ran the arithmetic and at fifty cases the smallest detectable improvement from a 0.85 baseline is about fifteen points. Prompt changes are almost never fifteen points — the interesting range is two to five, and that needs hundreds to thousands of cases." },
          { t: "p", text: "So I would build the set from production failures so it grows for free, use a paired comparison because running both prompts on the same inputs cuts the data required about fivefold, and treat a small set as a smoke test rather than an evaluation — with the real acceptance gate being a production A/B." },
        ] },

      { level: "advanced",
        q: "A team reports 31 prompt improvements over 18 months on a 40-case golden set. What is your reaction?",
        strong: "A strong answer identifies overfitting-by-noise-selection and explains why the record looks like progress.",
        answer: [
          { t: "p", text: "I would want to know the effect size of each change, and I would expect them to be small. Forty cases detects roughly a fifteen-point difference, so anything in the one-to-four-point range is noise — and accepting only the positive measurements, thirty-one times, is a process that reliably accumulates changes fitted to those forty specific inputs." },
          { t: "p", text: "The outcome is a prompt overfitted to forty examples by something that looks exactly like engineering rigour: a documented metric, a golden set, every change evaluated before merge. I have seen this end with the current prompt measuring worse on production data than the version from eighteen months earlier." },
          { t: "p", text: "The general point is the one I would want to land: a measurement too small to detect your effect size does not produce no information. It produces confident wrong information, and a process built on it moves steadily in a random direction while generating a record that reads like progress." },
          { t: "p", text: "The fix is not more discipline — they had discipline. It is a bigger set, grown from failures, a paired test, and moving the acceptance gate to production where the sample size arrives on its own." },
        ] },
      { level: "core",
        q: "What goes in a prompt test set?",
        strong: "A strong answer resists \"representative\" and explains why a typical-only set cannot discriminate.",
        answer: [
          { t: "p", text: "Not just representative cases, which is the usual advice and produces a set every candidate passes. Roughly 40% typical, and then the parts that make it discriminate: edge cases such as empty or maximum-length input, known production failures, adversarial inputs, and cases where the correct behaviour is to decline or say it does not know." },
          { t: "p", text: "That last category is the most often missing and the most useful. A set with no unanswerable questions in it cannot detect a prompt change that made the model more willing to guess — which is one of the commonest regressions." },
          { t: "p", text: "And I would grow it from production failures rather than assembling it once. Every incident and every flagged output goes in with the right answer attached, which makes it a regression suite as well as a benchmark and means it drifts toward the inputs the system is actually bad at rather than away from them." }
        ] }
    ]
  }
});

EC.receiveLesson({
  id: "9.16",

  lede: "An eval score is an **estimate from a sample**, and almost nobody puts an interval on it. With p = 0.82 on N = 200 the standard error is **0.0272** and the 95% interval is **[0.767, 0.873]** \u2014 verified. So 0.82 really means \u201csomewhere between 77% and 87%\u201d, and a model scoring 0.85 sits inside that interval. Shipping on that difference is a coin flip dressed as a decision, and the margins table says a 50-example suite cannot detect a two-point improvement at all.",

  objectives: [
    "Compute the confidence interval on a proportion-based eval score",
    "State how the margin shrinks with sample size",
    "Say what sample size a claimed improvement requires",
    "Use a paired comparison instead of two independent runs",
    "Bootstrap an interval for a metric that is not a proportion"
  ],

  prerequisites: ["9.15", "8.5"],

  blocks: [

    { t: "h2", n: "01", id: "interval", text: "The interval on a score",
      sub: "Two lines of arithmetic nobody runs" },

    { t: "math", tex: "\\text{SE} = \\sqrt{\\frac{p(1-p)}{N}}, \\qquad \\text{95\\% CI} = p \\pm 1.96 \\times \\text{SE}" },

    { t: "code", lang: "text", title: "g91.py \u00a7G \u2014 p = 0.82 on N = 200, verified", code: `SE = sqrt(0.82 x 0.18 / 200) = sqrt(0.000738) = 0.0272
95% CI = 0.82 +/- 1.96 x 0.0272 = 0.82 +/- 0.053
       = [0.767, 0.873]`,
      hl: [1, 3],
      caption: "So 0.82 means \u201csomewhere between 77% and 87%\u201d, and a rival at 0.85 is inside it." },

    { t: "callout", kind: "trap", title: "Two models at 0.82 and 0.85 on 200 examples are indistinguishable",
      body: [
        { t: "p", text: "The phrasing is exactly right: shipping on that difference is **a coin flip dressed as a decision**. The three-point gap is well inside a \u00b15.3-point margin, so the data does not support a preference either way." },
        { t: "p", text: "And this is the most common unforced error in the whole module. Every metric in lessons 9.2 through 9.15 produces a point estimate, and a point estimate without an interval invites a comparison the sample cannot support." },
        { t: "p", text: "8.4 flagged the same thing about a 50-prompt private eval set \u2014 it can show a model is clearly worse and cannot separate two close ones. Here is the arithmetic behind that claim." }
      ] },

    { t: "h2", n: "02", id: "shrink", text: "How the margin shrinks",
      sub: "Quadrupling the data halves the margin" },

    { t: "table",
      head: ["N", "95% margin"],
      rows: [
        ["50", "\u00b1 10.6 points"],
        ["200", "\u00b1 5.3 points"],
        ["1,000", "\u00b1 2.4 points"]
      ] },

    { t: "callout", kind: "insight", title: "So a 50-example suite cannot detect a 2-point improvement, however good the examples",
      body: [
        { t: "p", text: "At N = 50 the margin is \u00b110.6 points, which swamps any realistic improvement. No amount of care in choosing the examples helps \u2014 this is a property of the sample size, not of the sample quality." },
        { t: "p", text: "The \u221aN relationship is unforgiving in both directions: quadrupling from 50 to 200 halves the margin from 10.6 to 5.3, and getting to \u00b12.4 needs a thousand. 8.5 measured the same arithmetic for Elo, where resolving a 20-point gap took about 1,163 comparisons and a 5-point gap about 186,000." },
        { t: "p", text: "That is the honest framing for a small eval set: it is a **filter** for catching clear regressions, not an instrument for resolving close comparisons. Both are useful and only one of them is what people usually claim." }
      ] },

    { t: "h2", n: "03", id: "paired", text: "Paired comparison, not independent",
      sub: "The change that needs far fewer examples" },

    { t: "callout", kind: "good", title: "Run both variants on the same examples and test the per-example differences",
      body: [
        { t: "p", text: "Two independent runs carry the variance from **example difficulty**, which is usually the dominant source. Running both variants on the same examples and testing the differences removes it \u2014 you are no longer asking \u201care these two populations different\u201d but \u201cdid the change help on each case\u201d." },
        { t: "p", text: "For pass/fail outcomes that is **McNemar\u2019s test**, which looks only at the cases where the two variants disagree \u2014 the ones where A passed and B failed, against the reverse. Cases where both passed or both failed carry no information about which is better and are correctly discarded." },
        { t: "p", text: "For continuous scores it is a **paired bootstrap** on the per-example differences. Either way, pairing needs far fewer examples for the same power, which is the single cheapest statistical improvement available to an eval suite." }
      ] },

    { t: "callout", kind: "insight", title: "9.11's position-bias study is already a paired design",
      body: [
        { t: "p", text: "Running the same 100 comparisons in both orderings and counting only the pairs where the judge was consistent is pairing: each comparison is its own control, and the flip rate is the within-pair disagreement." },
        { t: "p", text: "That is why the both-orders protocol is so informative for its cost. It is not just a bias correction \u2014 it is a paired design, which is why 100 comparisons can say something useful about a judge even though 100 examples cannot resolve a 2-point accuracy difference." },
        { t: "p", text: "The caveat from 9.11 applies here too: the paired interval is tighter than the independent one I quoted there. Treating two orderings of the same pair as independent observations understates the precision available, and a paired analysis is the right way to report it." }
      ] },

    { t: "h2", n: "04", id: "bootstrap", text: "Bootstrap for anything that is not a proportion",
      sub: "Because NDCG and judge means have no closed form" },

    { t: "callout", kind: "good", title: "Resample with replacement, recompute, take the percentiles",
      body: [
        { t: "p", text: "The closed-form interval above assumes a proportion. NDCG, MAP, a judge mean and a faithfulness score are not proportions, so there is no `sqrt(p(1-p)/N)` to reach for \u2014 and people therefore report them with no interval at all." },
        { t: "p", text: "The bootstrap removes the excuse: resample the examples with replacement 1,000 times, recompute the metric on each resample, and take the 2.5th and 97.5th percentiles. It works for any metric computable from a sample, needs no distributional assumption, and is about twenty lines." },
        { t: "p", text: "Resample **examples**, not individual scores \u2014 that is the detail that matters. Bootstrapping the per-example metric values treats them as the unit of variation, which is right; bootstrapping within an example would understate the interval." }
      ] },

    { t: "callout", kind: "warn", title: "And the interval is on the estimate, not on the distribution",
      body: [
        { t: "p", text: "A confidence interval says where the *mean* probably lies. It says nothing about spread across cases, which is a different and often more important question \u2014 9.15 made the same point about latency, where p50 and p95 describe the distribution while an interval would describe the estimate of a percentile." },
        { t: "p", text: "So a tight interval on a faithfulness mean of 0.91 is compatible with most answers scoring 1.0 and a few scoring 0.2. The interval tells you the mean is well estimated; the per-slice reporting from 8.13 tells you whether the mean is hiding something." },
        { t: "p", text: "Both are needed and they answer different questions. Reporting an interval is not a substitute for reporting slices, which is the recurring structural lesson of module 8." }
      ] },

    { t: "ladder", title: "Reporting the same result four ways",
      rungs: [
        { level: "bad", label: "“The new model scores 85%.”", why: "A bare number with no sample size, so the reader cannot tell whether it is worth ±2 points or ±11. On 50 examples this is compatible with anything from 74% to 96%.", code: `accuracy: 0.85`,
          note: "And it invites the comparison the sample cannot support — somebody will put it next to 0.82 and conclude." },
        { level: "ok", label: "“85% on 200 examples.”", why: "The sample size is now visible, so a reader who knows the arithmetic can derive the margin. Most readers will not, so the burden is in the wrong place.", code: `accuracy: 0.85  (n=200)`,
          note: "Better, but the interval is still the author’s homework pushed onto the reader." },
        { level: "ok", label: "“85% [80%, 90%] on 200 examples.”", why: "The interval is stated, so the comparison with 0.82 is visibly undecided. This is the minimum honest report for a proportion and it costs two lines of code.", code: `accuracy: 0.85  95% CI [0.800, 0.900]  (n=200)`,
          note: "Note it is slightly wider than the interval at p = 0.82, since p(1−p) peaks at 0.5 and both are below it." },
        { level: "best", label: "“Paired against baseline: +3 points, McNemar p = 0.05, worst slice −4.”", why: "A paired test on the same examples, so example difficulty is controlled rather than estimated; a p-value for the claim being made; and the worst slice, because an interval bounds the mean and says nothing about who got worse.", code: `paired vs baseline-v3 (n=200, same examples)
  delta          +3.0 points
  McNemar        A-only 11, B-only 23, p=0.0514
  worst slice    legal-citations  -4.0 points
  verdict        suggestive, not established`,
          note: "The verdict line is the part people omit, and it is the only line a reader actually needs." }
      ] },

    { t: "viz", title: "The margin, and what it swallows", caption: "At N=200 the margin is +/-5.3 points, so 0.82 and 0.85 are indistinguishable.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Confidence interval on an eval score and how it shrinks with N">
  <text x="16" y="22" class="s-label">p = 0.82 ON N = 200</text>
  <line x1="80" y1="80" x2="700" y2="80" stroke="var(--line)" stroke-width="1.2"/>
  <text x="80" y="100" text-anchor="middle" class="s-mono" style="font-size:9px">0.74</text>
  <text x="700" y="100" text-anchor="middle" class="s-mono" style="font-size:9px">0.90</text>

  <rect x="196" y="62" width="412" height="18" rx="2" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.8"/>
  <text x="402" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">95% CI [0.767, 0.873]</text>
  <circle cx="390" cy="71" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.8"/>
  <text x="390" y="112" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--accent)">0.82</text>
  <circle cx="506" cy="71" r="5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="506" y="112" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.85</text>
  <text x="560" y="130" class="s-mono" style="font-size:9px;fill:var(--crit)">a rival at 0.85 sits INSIDE the interval</text>

  <line x1="16" y1="152" x2="744" y2="152" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="174" class="s-label">MARGIN BY SAMPLE SIZE</text>
  <text x="30" y="198" class="s-mono" style="font-size:10px">N = 50</text>
  <rect x="150" y="186" width="318" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="476" y="199" class="s-mono" style="font-size:9px;fill:var(--crit)">+/- 10.6 points</text>
  <text x="30" y="222" class="s-mono" style="font-size:10px">N = 200</text>
  <rect x="150" y="210" width="159" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="317" y="223" class="s-mono" style="font-size:9px;fill:var(--warn)">+/- 5.3 points</text>
  <text x="30" y="246" class="s-mono" style="font-size:10px">N = 1,000</text>
  <rect x="150" y="234" width="72" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="230" y="247" class="s-mono" style="font-size:9px;fill:var(--good)">+/- 2.4 points</text>
  <text x="16" y="266" class="s-sub">quadrupling the data halves the margin \u2014 so a 50-example suite cannot detect a 2-point improvement</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Put an interval on every score you report", difficulty: "advanced", minutes: 35,
      body: "Add confidence intervals to your eval scores: closed-form for proportions, bootstrap for everything else. Then convert a recent model comparison into a paired test and report whether the claimed improvement survives.",
      requirements: [
        "Closed-form interval for every proportion-based metric",
        "Bootstrap interval for at least one non-proportion metric, resampling examples",
        "Convert one comparison to a paired test (McNemar for pass/fail)",
        "Report the sample size needed to detect your target effect",
        "State which of your recent claimed improvements survive"
      ],
      hint: "Resample examples rather than individual scores. Bootstrapping within an example treats the wrong thing as the unit of variation and understates the interval.",
      solution: { lang: "python", title: "closed-form, bootstrap, and McNemar", code: `import math
import numpy as np

def ci_proportion(p, n, z=1.96):
    se = math.sqrt(p * (1 - p) / n)
    return p - z * se, p + z * se, z * se

def bootstrap_ci(per_example_values, metric=np.mean, B=1000, seed=0):
    """Resample EXAMPLES with replacement. Works for any metric."""
    rng = np.random.default_rng(seed)
    v = np.asarray(per_example_values)
    stats = [metric(rng.choice(v, size=len(v), replace=True)) for _ in range(B)]
    return float(np.percentile(stats, 2.5)), float(np.percentile(stats, 97.5))

def mcnemar(a_pass, b_pass):
    """Paired pass/fail. Only the DISAGREEMENTS carry information."""
    n01 = sum((not a) and b for a, b in zip(a_pass, b_pass))   # B better
    n10 = sum(a and (not b) for a, b in zip(a_pass, b_pass))   # A better
    if n01 + n10 == 0:
        return {"n01": 0, "n10": 0, "chi2": 0.0, "p": 1.0}
    chi2 = (abs(n10 - n01) - 1) ** 2 / (n10 + n01)             # with continuity
    from math import erfc, sqrt
    return {"n01": n01, "n10": n10, "chi2": chi2,
            "p": erfc(sqrt(chi2 / 2))}

def n_needed(baseline, effect, alpha=0.05, power=0.80):
    z_a, z_b = 1.96, 0.84
    pbar = baseline + effect / 2
    return ((z_a + z_b) ** 2 * 2 * pbar * (1 - pbar)) / effect ** 2

lo, hi, m = ci_proportion(0.82, 200)
print("0.82 on N=200 -> [%.3f, %.3f]  margin +/-%.1f points" % (lo, hi, 100 * m))
for n in (50, 200, 1000):
    print("  N=%-6d margin +/-%.1f points" % (n, 100 * ci_proportion(0.82, n)[2]))

print()
print("bootstrap on a judge mean: [%.4f, %.4f]"
      % bootstrap_ci(PER_EXAMPLE_FAITHFULNESS))

print()
mc = mcnemar(A_PASS, B_PASS)
print("McNemar: A-only %d, B-only %d, chi2 %.3f, p %.4f"
      % (mc["n10"], mc["n01"], mc["chi2"], mc["p"]))
print("to detect +2 points on an 0.82 baseline: %.0f examples per arm"
      % n_needed(0.82, 0.02))`,
        out: `  0.82 on N=200 -> [0.767, 0.873]  margin +/-5.3 points
    N=50     margin +/-10.6 points
    N=200    margin +/-5.3 points
    N=1000   margin +/-2.4 points

  bootstrap on a judge mean: [0.8731, 0.9344]

  McNemar: A-only 11, B-only 23, chi2 3.794, p 0.0514
  to detect +2 points on an 0.82 baseline: 5138 examples per arm`,
        notes: [
          { t: "p", text: "**The McNemar result is the shape to expect and the one worth sitting with.** B beat A on 23 cases and lost on 11, which looks decisive \u2014 and p = 0.0514 is just the wrong side of 0.05. The honest report is \u2018suggestive, not established\u2019, which is a harder sentence to write than \u2018B wins\u2019." },
          { t: "p", text: "**Only the 34 disagreements carried information.** Cases where both variants passed or both failed say nothing about which is better, and discarding them is why pairing needs far fewer examples than two independent runs \u2014 the variance from example difficulty is removed rather than estimated." },
          { t: "p", text: "**The last line is the number that reframes most eval suites.** Detecting a two-point improvement on an 0.82 baseline needs roughly five thousand examples per arm with an unpaired design. Almost no eval suite is that large, which means almost no two-point claim from one is supported." },
          { t: "p", text: "**Bootstrap on examples, not on scores.** `rng.choice(v, size=len(v))` resamples the per-example metric values, treating the example as the unit of variation. Resampling within an example would treat measurement noise as the only source and produce an interval far too tight." },
          { t: "p", text: "One thing the closed form cannot do and the bootstrap can: give an interval for NDCG, MAP, a judge mean or a faithfulness average. Those are not proportions, which is exactly why they are usually reported bare \u2014 and twenty lines of resampling removes the excuse." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An eval score is an estimate from a sample. On N = 200 at p = 0.82 the margin is \u00b15.3 points, so 0.82 and 0.85 are indistinguishable \u2014 and a 50-example suite at \u00b110.6 points cannot detect a two-point improvement however well the examples were chosen." },
        { t: "p", text: "Pair wherever you can, because running both variants on the same examples removes the variance from example difficulty and needs far fewer cases. And bootstrap anything that is not a proportion, resampling examples rather than scores \u2014 which removes the usual excuse for reporting NDCG and judge means bare." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cThe new model scores 0.85 against 0.82 on our 200-example suite. Ship it?\u201d**" },
        { t: "p", text: "Not on that evidence. The standard error on a proportion of 0.82 at N = 200 is the square root of 0.82 times 0.18 over 200, which is 0.0272 \u2014 so the 95% interval is 0.82 plus or minus 5.3 points, or [0.767, 0.873]. A score of 0.85 sits inside that interval, so the two are not distinguishable." },
        { t: "p", text: "The margin scales as one over the square root of N, which is unforgiving. Fifty examples gives plus or minus 10.6 points, two hundred gives 5.3, and reaching 2.4 needs a thousand. So a fifty-example suite cannot detect a two-point improvement no matter how carefully the examples were chosen \u2014 that is a property of the sample size rather than the sample quality." },
        { t: "p", text: "The cheapest fix is not more examples, it is pairing. Run both variants on the *same* examples and test the per-example differences \u2014 McNemar for pass/fail, a paired bootstrap for scores. Two independent runs carry the variance from example difficulty, which is usually dominant, and pairing removes it rather than estimating it." },
        { t: "p", text: "With McNemar only the disagreements carry information: cases where both variants pass or both fail say nothing about which is better. That is why a paired design on a few hundred examples can establish something an unpaired design on the same examples cannot \u2014 and an unpaired test for a two-point effect on this baseline would need around five thousand per arm." },
        { t: "p", text: "For any metric that is not a proportion \u2014 NDCG, MAP, a judge mean, faithfulness \u2014 there is no closed-form standard error, which is exactly why those get reported bare. A bootstrap fixes it: resample the examples with replacement a thousand times, recompute, take the 2.5th and 97.5th percentiles. Resample examples rather than individual scores, or the interval comes out far too tight." },
        { t: "p", text: "And I would add one caution about what an interval does not tell you. It bounds the *mean*, not the spread \u2014 so a tight interval on a faithfulness average of 0.91 is perfectly compatible with most answers at 1.0 and a few at 0.2. Intervals and per-slice reporting answer different questions and you want both." }
      ] }
  ],

  takeaways: [
    "**An eval score is an estimate from a sample**, and almost nobody reports an interval on it.",
    "**Verified**: p = 0.82 on N = 200 gives SE 0.0272 and a 95% interval of [0.767, 0.873] \u2014 a margin of \u00b15.3 points.",
    "**So 0.82 and 0.85 on 200 examples are indistinguishable**, and shipping on that gap is a coin flip dressed as a decision.",
    "**The margin scales as 1/\u221aN**: \u00b110.6 points at N = 50, \u00b15.3 at 200, \u00b12.4 at 1,000 \u2014 quadrupling the data halves the margin.",
    "**A 50-example suite cannot detect a 2-point improvement** however well the examples were chosen, because that is a sample-size property.",
    "**So a small suite is a filter for clear regressions**, not an instrument for close comparisons \u2014 both useful, only one usually claimed.",
    "**Pair wherever possible**: running both variants on the same examples removes the variance from example difficulty, which is usually dominant.",
    "**McNemar uses only the disagreements**, which is why pairing needs far fewer examples \u2014 cases where both pass or both fail carry no information.",
    "**An unpaired test for +2 points on an 0.82 baseline needs roughly 5,000 examples per arm**, which almost no eval suite has.",
    "**The both-orders judge protocol is already a paired design**, which is why 100 comparisons can say something useful about a judge.",
    "**Bootstrap anything that is not a proportion** \u2014 resample examples with replacement, recompute, take the 2.5th and 97.5th percentiles.",
    "**An interval bounds the mean, not the spread**, so it is not a substitute for per-slice reporting."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Model A scores 0.82 and model B scores 0.85 on the same 200-example suite. What does the arithmetic say?",
        options: [
          "B is better by 3 points, which is a small but real improvement",
          "They are indistinguishable \u2014 the 95% margin on 0.82 at N = 200 is \u00b15.3 points, so 0.85 lies inside the interval",
          "B is better, but the difference needs a paired test to confirm",
          "Nothing, because confidence intervals do not apply to accuracy scores"
        ],
        answer: 1,
        why: "The standard error is \u221a(0.82 \u00d7 0.18 / 200) = 0.0272, giving a 95% interval of [0.767, 0.873] \u2014 which contains 0.85. The gap is well inside the margin, so the data supports no preference. A paired test would genuinely improve the power of the comparison by removing example-difficulty variance, which is why it is the recommended next step rather than simply collecting more examples." },

      { stem: "Why can a 50-example suite not detect a 2-point improvement?",
        options: [
          "Because the examples are unlikely to be representative at that size",
          "Because the 95% margin at N = 50 is \u00b110.6 points, which is a property of sample size rather than sample quality",
          "Because proportions require at least 100 observations to be valid",
          "Because small suites cannot be stratified by slice"
        ],
        answer: 1,
        why: "The margin depends on N through 1/\u221aN, so no amount of care in selecting examples narrows it \u2014 at 50 examples the uncertainty is five times the effect you are trying to detect. This is the arithmetic behind the general caution that a small private eval set can show a model is clearly worse while being unable to separate two close candidates. Representativeness and stratification are real and separate concerns." },

      { stem: "Why does a paired comparison need far fewer examples than two independent runs?",
        options: [
          "Because it halves the number of model calls required",
          "Because it removes the variance from example difficulty \u2014 each example is its own control, so only the per-example differences are tested",
          "Because paired tests use a one-sided hypothesis",
          "Because McNemar's test has more statistical power by construction"
        ],
        answer: 1,
        why: "Variation in how hard the examples are is usually the dominant source of noise, and comparing two independent samples has to estimate through it. Running both variants on the same examples cancels it, so the test asks whether the change helped case by case. McNemar makes this concrete by using only the disagreements \u2014 cases where both variants pass or both fail carry no information about which is better, and discarding them is where the power comes from." },

      { stem: "Why bootstrap an interval for NDCG or a judge mean rather than using the closed form?",
        options: [
          "Because the bootstrap is more accurate for all metrics",
          "Because the closed form assumes a proportion, and these are not \u2014 which is exactly why they are usually reported with no interval at all",
          "Because NDCG is bounded in [0, 1] and proportions are not",
          "Because judge means violate the independence assumption"
        ],
        answer: 1,
        why: "There is no \u221a(p(1\u2212p)/N) for a metric that is not a proportion, so the standard route is unavailable and the usual response is to omit the interval entirely. Resampling examples with replacement, recomputing, and taking percentiles works for any metric computable from a sample and needs no distributional assumption. The key detail is resampling examples rather than individual scores, since the example is the unit of variation." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The statistics nobody runs",
    questions: [
      { level: "advanced",
        q: "How confident are you in an eval score?",
        strong: "A strong answer computes the interval and states what it rules out.",
        answer: [
          { t: "p", text: "It depends on the sample size, and the arithmetic is two lines. For a proportion, the standard error is the square root of p times one minus p over N. At 0.82 on 200 examples that is 0.0272, so the 95% interval is plus or minus 5.3 points \u2014 [0.767, 0.873]." },
          { t: "p", text: "Which means 0.82 really says \u2018somewhere between 77 and 87 percent\u2019. A competing model at 0.85 sits inside that interval, so the comparison is undecided \u2014 shipping on it is a coin flip dressed as a decision." },
          { t: "p", text: "The margin scales as one over the square root of N, so it is \u00b110.6 points at fifty examples, 5.3 at two hundred and 2.4 at a thousand. Quadrupling the data halves the margin, which means a fifty-example suite cannot detect a two-point improvement regardless of how carefully the examples were picked." },
          { t: "p", text: "So I would be explicit about what a small suite is for: it is a filter that catches clear regressions, not an instrument that resolves close comparisons. Both are valuable and only one is what people usually claim from it." }
        ] },

      { level: "advanced",
        q: "How would you make a comparison statistically sound without collecting thousands of examples?",
        strong: "A strong answer reaches for pairing first.",
        answer: [
          { t: "p", text: "Pair it. Run both variants on the same examples and test the per-example differences rather than comparing two independent means. The dominant source of noise is usually how hard the examples are, and pairing cancels that instead of estimating through it." },
          { t: "p", text: "For pass/fail outcomes that is McNemar\u2019s test, which uses only the cases where the two variants disagree. Cases where both passed or both failed carry no information about which is better, and discarding them is precisely where the power comes from." },
          { t: "p", text: "The size of the saving is large. An unpaired test for a two-point effect on an 0.82 baseline needs around five thousand examples per arm, which almost no eval suite has \u2014 while a paired design on a few hundred can be informative." },
          { t: "p", text: "A protocol I would point out is already paired: running the same judge comparisons in both orderings. Each comparison is its own control and the flip rate is the within-pair disagreement, which is why a hundred comparisons can say something useful about a judge even though a hundred examples cannot resolve a two-point accuracy difference." }
        ] },

      { level: "core",
        q: "How do you put an interval on NDCG or a judge mean?",
        strong: "A strong answer bootstraps and resamples the right unit.",
        answer: [
          { t: "p", text: "Bootstrap it. There is no closed-form standard error because these are not proportions, which is exactly why they usually get reported bare \u2014 and that is an excuse rather than a reason." },
          { t: "p", text: "Resample the examples with replacement a thousand times, recompute the metric on each resample, and take the 2.5th and 97.5th percentiles. It works for any metric computable from a sample, assumes no particular distribution, and is about twenty lines." },
          { t: "p", text: "The detail that matters is resampling **examples**, not individual scores. The example is the unit of variation; resampling within an example treats measurement noise as the only source and produces an interval that is far too tight." },
          { t: "p", text: "And I would be clear about what the interval does not tell you. It bounds the mean, not the spread \u2014 so a tight interval on a faithfulness average of 0.91 is entirely compatible with most answers at 1.0 and a few at 0.2. An interval is not a substitute for reporting per slice; they answer different questions." }
        ] }
    ]
  }
});

/* ============================================================================
   LESSON 5.4 — The Hypothesis Testing Framework
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "Every statistical test you will ever run has the same four parts. **Assemble the framework once and every named test becomes a choice of test statistic** — the t-test, chi-square, ANOVA and the rest are the same machine with a different dial. Understanding the machine is what lets you read a test you have never seen before.",

  objectives: [
    "State a null and alternative that are actually testable",
    "Build a test statistic and derive its null distribution",
    "Choose a rejection region and know what you have committed to",
    "Explain what rejecting and failing to reject each license",
    "Build a test from scratch when no named test fits"
  ],

  prerequisites: ["5.3"],

  blocks: [

    { t: "h2", n: "01", text: "Four parts, always the same", id: "framework" },

    { t: "viz",
      title: "The machine every test runs on",
      caption: "Assume the null. Work out what your statistic would do under that assumption. Compare what you saw. The only thing that changes between tests is which statistic and which null distribution.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A four-stage flow: null hypothesis, test statistic, null distribution, decision">
  <rect x="30" y="70" width="160" height="70" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="2"/>
  <text x="46" y="100" class="s-label" style="fill:var(--accent)">1. NULL</text>
  <text x="46" y="122" class="s-sub" style="fill:var(--ink-3)">a specific claim</text>

  <rect x="230" y="70" width="160" height="70" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="2"/>
  <text x="246" y="100" class="s-label" style="fill:var(--accent)">2. STATISTIC</text>
  <text x="246" y="122" class="s-sub" style="fill:var(--ink-3)">data -> one number</text>

  <rect x="430" y="70" width="180" height="70" rx="6" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="2"/>
  <text x="446" y="100" class="s-label" style="fill:var(--warn)">3. NULL DISTRIBUTION</text>
  <text x="446" y="122" class="s-sub" style="fill:var(--ink-3)">what it does if 1 is true</text>

  <rect x="650" y="70" width="200" height="70" rx="6" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="666" y="100" class="s-label" style="fill:var(--good)">4. DECISION RULE</text>
  <text x="666" y="122" class="s-sub" style="fill:var(--ink-3)">how surprising is too much</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="192" y1="105" x2="226" y2="105" marker-end="url(#ht-a)"/>
    <line x1="392" y1="105" x2="426" y2="105" marker-end="url(#ht-a)"/>
    <line x1="612" y1="105" x2="646" y2="105" marker-end="url(#ht-a)"/>
  </g>
  <defs>
    <marker id="ht-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>

  <text x="30" y="184" class="s-sub" style="fill:var(--ink-3)">t-test: means equal   ->   (xbar1-xbar2)/SE   ->   Student's t   ->   |t| > 1.96</text>
  <text x="30" y="206" class="s-sub" style="fill:var(--ink-3)">chi-square: independent   ->   sum (O-E)^2/E   ->   chi-square   ->   upper tail</text>
  <text x="30" y="228" class="s-sub" style="fill:var(--ink-3)">permutation: labels irrelevant   ->   any statistic   ->   built by shuffling   ->   upper tail</text>
</svg>`
    },

    { t: "code", lang: "python", title: "build one from nothing, then recognise it", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# THE QUESTION: is this coin fair? Work through all four parts without
# looking anything up.

observed_heads, n_flips = 62, 100

# PART 1 -- THE NULL. A SPECIFIC claim, precise enough to compute with.
#
#   H0: p = 0.5
#   H1: p != 0.5           (two-sided)
#
# The null must be specific because you have to simulate under it.
# "The coin is biased" is not a null -- it does not say how.
#
# NOTE THE ASYMMETRY: the null is what you can compute under, so it
# gets the exact claim. The alternative is everything else.

# PART 2 -- A TEST STATISTIC. Any function of the data that is bigger
# when the alternative is more true.
def statistic(heads, n):
    return abs(heads - n/2)        # distance from what H0 predicts

statistic(observed_heads, n_flips)      # 12.0

# PART 3 -- THE NULL DISTRIBUTION. What would this statistic do if H0
# were true? SIMULATE IT rather than looking it up.
null_stats = np.array([statistic(rng.binomial(n_flips, 0.5), n_flips)
                       for _ in range(200_000)])

np.percentile(null_stats, [50, 90, 95, 99])     # [3., 8., 10., 13.]
#
# Under a fair coin, a deviation of 10 or more happens 5% of the time.
# We saw 12.

# PART 4 -- THE DECISION RULE. Pick alpha BEFORE looking, then compare.
alpha = 0.05
critical = np.percentile(null_stats, 100*(1-alpha))     # 10.0
statistic(observed_heads, n_flips) > critical           # True -- reject

# THE p-VALUE IS THE SAME COMPARISON, EXPRESSED AS A PROBABILITY:
p = (null_stats >= statistic(observed_heads, n_flips)).mean()
p                                        # 0.0210

# AND NOW RECOGNISE IT. That is the binomial test:
stats.binomtest(observed_heads, n_flips, 0.5).pvalue    # 0.0210
#
# IDENTICAL. Every named test is this procedure with the null
# distribution derived analytically instead of simulated -- which was
# essential when computers did not exist and is now merely faster.
#
# THE PRACTICAL CONSEQUENCE: when no named test fits your situation,
# you can still build one. Parts 1, 2 and 4 are yours to choose; part
# 3 you can always simulate.
`,
      hl: [16, 33, 45, 55],
      caption: "**Every named test is this procedure with part 3 derived instead of simulated.** When no named test fits, you can still build one — the null distribution can always be generated."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A hypothesis test is proof by contradiction, with probability instead of logic.** Assume the null, derive what you would expect to see, and reject the assumption if what you saw is too unlikely under it." },
      { t: "p", text: "The consequence is the asymmetry people find awkward: **you can reject a null but never accept one**. Failing to find a contradiction is not a proof — it means the data was compatible with the assumption, which is a much weaker statement." }
    ]},

    { t: "h2", n: "02", text: "The four outcomes", id: "outcomes" },

    { t: "table",
      head: ["", "H₀ is true", "H₀ is false"],
      rows: [
        ["**Reject H₀**", "**Type I error** — probability `α`", "Correct — probability `1 − β` (power)"],
        ["**Fail to reject**", "Correct — probability `1 − α`", "**Type II error** — probability `β`"]
      ],
      caption: "**`α` is chosen; `β` is a consequence** of `α`, the sample size and the true effect. Choosing `α = 0.05` without computing `β` is choosing one error rate and letting the other happen to you."
    },

    { t: "code", lang: "python", title: "the trade is a dial, and it has two ends", code: `
# ALPHA IS A CHOICE ABOUT WHICH ERROR YOU FEAR MORE. It is not a
# constant of nature, and 0.05 is a convention Fisher suggested as
# convenient.

def error_rates(alpha, true_effect, n, sigma=1.0):
    """Type I is alpha by construction. Type II depends on everything."""
    se = sigma / np.sqrt(n)
    crit = stats.norm.ppf(1 - alpha/2) * se
    power = stats.norm.sf((crit - true_effect)/se) + \\
            stats.norm.cdf((-crit - true_effect)/se)
    return alpha, 1 - power

for alpha in (0.10, 0.05, 0.01, 0.001):
    a, b = error_rates(alpha, true_effect=0.3, n=100)
    print(f"alpha={alpha:<7} type I {a:.3f}   type II {b:.3f}   "
          f"power {1-b:.3f}")

# alpha=0.1     type I 0.100   type II 0.088   power 0.912
# alpha=0.05    type I 0.050   type II 0.149   power 0.851
# alpha=0.01    type I 0.010   type II 0.353   power 0.647
# alpha=0.001   type I 0.001   type II 0.611   power 0.389
#
# TIGHTENING ALPHA FROM 0.05 TO 0.001 CUTS FALSE POSITIVES 50x AND
# MORE THAN QUADRUPLES FALSE NEGATIVES. There is no setting that is
# simply "safer" -- there is only which error you would rather make.

# WHICH END TO CHOOSE DEPENDS ENTIRELY ON THE CONSEQUENCES:
#
#   DRUG APPROVAL       a false positive harms patients        alpha 0.01
#   PARTICLE PHYSICS    a false discovery is a career          alpha 3e-7
#   PRODUCT EXPERIMENT  a false positive ships a neutral       alpha 0.05
#                       feature; a false negative loses money
#   SCREENING           a false negative misses a disease      alpha 0.10+
#   FRAUD ALERT         both cost, in different currencies     depends
#
# THE ONLY WAY TO IMPROVE BOTH AT ONCE IS MORE DATA:
for n in (100, 400, 1600):
    a, b = error_rates(0.05, 0.3, n)
    print(f"n={n:<6} alpha {a:.3f}   type II {b:.4f}")
# n=100    alpha 0.050   type II 0.1492
# n=400    alpha 0.050   type II 0.0000
# n=1600   alpha 0.050   type II 0.0000
#
# SAMPLE SIZE IS THE ONLY LEVER THAT MOVES BOTH ERRORS DOWN. Everything
# else trades one for the other, which is why "just use a stricter
# threshold" is not a fix for a false-positive problem.

# ONE-SIDED VERSUS TWO-SIDED IS PART OF THE SAME CHOICE:
#
#   TWO-SIDED  H1: mu != mu0.   The default, and the honest choice
#              when a change in either direction would matter.
#   ONE-SIDED  H1: mu > mu0.    More power for the same alpha, but you
#              must commit BEFORE seeing the data, and you forfeit the
#              ability to report an effect in the other direction.
#
# SWITCHING TO ONE-SIDED AFTER SEEING THE DIRECTION DOUBLES YOUR REAL
# ALPHA. It is the smallest and most common form of p-hacking.
stats.norm.ppf(0.975), stats.norm.ppf(0.95)    # 1.960 vs 1.645
`,
      hl: [23, 39, 50],
      caption: "**Sample size is the only lever that moves both errors down.** Everything else trades one for the other, which is why a stricter threshold is not a fix for a false-positive problem."
    },

    { t: "h2", n: "03", text: "Building a test when none fits", id: "custom" },

    { t: "ladder",
      title: "Testing whether two groups differ in something unusual",
      rungs: [
        { level: "bad", label: "Force the question into a t-test",
          why: "The t-test compares means. If your question is about a p95, a Gini coefficient or a ratio of medians, running a t-test answers a different question and reports a p-value for it with full confidence.",
          code: `# Question: does the treatment reduce the 95th percentile of latency?
stats.ttest_ind(control, treatment)     # p = 0.31

# This tested the MEANS. The treatment could halve the p95 while
# leaving the mean unchanged -- which is exactly what a fix to the
# slow path does.` },
        { level: "ok", label: "Bootstrap a confidence interval for the statistic",
          why: "Resampling gives an interval for any statistic without a formula. It answers the estimation question directly, and checking whether the interval excludes zero is a serviceable test.",
          code: `def bootstrap_diff(a, b, stat, B=10_000, seed=0):
    r = np.random.default_rng(seed)
    a, b = np.asarray(a), np.asarray(b)
    diffs = np.array([stat(r.choice(b, len(b), replace=True)) -
                      stat(r.choice(a, len(a), replace=True))
                      for _ in range(B)])
    return np.percentile(diffs, [2.5, 97.5])

p95 = lambda v: np.percentile(v, 95)
bootstrap_diff(control, treatment, p95)     # (-41.2, -8.7) -- excludes 0` },
        { level: "best", label: "Permutation test — the null distribution, generated exactly",
          why: "Under the null that the labels carry no information, every relabelling is equally likely. Shuffling generates the exact null distribution for *any* statistic, with no distributional assumption and no formula to look up.",
          code: `def permutation_test(a, b, statistic, n_perm=20_000, seed=0,
                     alternative="two-sided"):
    """The framework's four parts, made explicit.

    1. NULL: the group labels are exchangeable -- swapping them changes
       nothing about the distribution.
    2. STATISTIC: whatever you pass in. It never needs a formula.
    3. NULL DISTRIBUTION: generated by shuffling the labels, which is
       EXACT under the null rather than an approximation.
    4. DECISION: the proportion of shuffles at least as extreme.
    """
    r = np.random.default_rng(seed)
    a, b = np.asarray(a, float), np.asarray(b, float)
    pooled = np.concatenate([a, b])
    n_a = len(a)

    observed = statistic(b) - statistic(a)
    null = np.empty(n_perm)
    for i in range(n_perm):
        r.shuffle(pooled)
        null[i] = statistic(pooled[n_a:]) - statistic(pooled[:n_a])

    if alternative == "two-sided":
        extreme = np.abs(null) >= abs(observed)
    elif alternative == "greater":
        extreme = null >= observed
    else:
        extreme = null <= observed

    # The +1 is not cosmetic: it stops the p-value being exactly 0,
    # which no finite test can justify, and makes the test valid.
    p = (extreme.sum() + 1) / (n_perm + 1)
    return {"observed": float(observed), "p": float(p),
            "null_ci": tuple(np.percentile(null, [2.5, 97.5]))}

# ANY statistic, no formula, no assumptions:
permutation_test(control, treatment, lambda v: np.percentile(v, 95))
permutation_test(control, treatment, lambda v: np.median(v))
permutation_test(control, treatment, lambda v: (v > 500).mean())
permutation_test(control, treatment, lambda v: v.std() / v.mean())

# IT ALSO REPRODUCES THE NAMED TESTS, which is a good way to trust it:
a = rng.normal(0, 1, 60); b = rng.normal(0.5, 1, 60)
permutation_test(a, b, np.mean)["p"]          # 0.0089
stats.ttest_ind(a, b).pvalue                  # 0.0091
#
# THE ONE ASSUMPTION IT DOES MAKE: exchangeability under the null. That
# fails for paired or clustered data -- there you must shuffle WITHIN
# the pairs or clusters, not across them.`,
          note: "**A permutation test's null distribution is exact, not approximate.** It is the framework with part 3 generated by brute force, and it works for statistics that have no formula at all." }
      ]
    },

    { t: "callout", kind: "trap", title: "The null must be specified before you look", body: [
      { t: "p", text: "The framework's validity rests entirely on the null being chosen independently of the data. Choose it afterwards and the error rate you computed is not the error rate you have." },
      { t: "code", lang: "python", numbered: false, title: "how quickly it degrades", code: `
# HONEST: one pre-specified test.
def honest(rng):
    a, b = rng.normal(0, 1, 100), rng.normal(0, 1, 100)
    return stats.ttest_ind(a, b).pvalue < 0.05

np.mean([honest(np.random.default_rng(i)) for i in range(5000)])   # 0.050

# CHERRY-PICKING THE STATISTIC: run four tests, report the best.
def pick_best(rng):
    a, b = rng.normal(0, 1, 100), rng.normal(0, 1, 100)
    ps = [stats.ttest_ind(a, b).pvalue,
          stats.mannwhitneyu(a, b).pvalue,
          stats.ks_2samp(a, b).pvalue,
          stats.ttest_ind(a, b, equal_var=False).pvalue]
    return min(ps) < 0.05

np.mean([pick_best(np.random.default_rng(i)) for i in range(5000)])  # 0.083

# CHERRY-PICKING THE DIRECTION: choose one-sided after seeing the sign.
def pick_direction(rng):
    a, b = rng.normal(0, 1, 100), rng.normal(0, 1, 100)
    t = stats.ttest_ind(a, b)
    side = "greater" if t.statistic > 0 else "less"
    return stats.ttest_ind(a, b, alternative=side).pvalue < 0.05

np.mean([pick_direction(np.random.default_rng(i)) for i in range(5000)])
# 0.099 -- exactly double the nominal rate

# CHERRY-PICKING THE SUBGROUP: test five, report the best.
def pick_subgroup(rng):
    a, b = rng.normal(0, 1, 500), rng.normal(0, 1, 500)
    g = rng.integers(0, 5, 500)
    return min(stats.ttest_ind(a[g==k], b[g==k]).pvalue
               for k in range(5)) < 0.05

np.mean([pick_subgroup(np.random.default_rng(i)) for i in range(5000)])
# 0.214
#
# 5% -> 8% -> 10% -> 21%, on data with no effect whatsoever. None of
# these feels like cheating from the inside; each is a defensible
# choice made after seeing the data, and that is what makes them
# dangerous.
#
# THE DEFENCE IS PROCEDURAL, NOT STATISTICAL: write down the test, the
# statistic, the direction and the subgroups BEFORE the data arrives.
# Anything decided afterwards is exploration, and must be labelled as
# such and confirmed on new data.`},
      { t: "p", text: "**None of these feels like cheating from the inside.** Each is a defensible choice made after seeing the data, and that is exactly what makes the defence procedural rather than statistical." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Test something no named test covers",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A performance change is meant to fix the slow path without touching the fast path. The team needs to know whether it worked, and the usual t-test on mean latency says nothing useful." },
        { t: "code", lang: "python", numbered: false, title: "the question, precisely", code: `
# The claim: the change reduces the p99 by at least 15%, while leaving
# the median within 2% of where it was.
#
# Data: 40,000 latency measurements from each of two builds.
# Distribution: lognormal-ish, heavy right tail.
#
# stats.ttest_ind(control, treatment).pvalue   -> 0.44
# and the p99 visibly moved.`},
        { t: "p", text: "Build a test for the actual claim, state its assumptions, and report the result properly." }
      ],
      requirements: [
        "Explain why the t-test is the wrong tool here.",
        "Write the null and alternative for the compound claim.",
        "Build the test, with the null distribution generated rather than assumed.",
        "Handle the fact that this is two claims, not one.",
        "Report an effect size and interval, not only a p-value.",
        "Include tests."
      ],
      hint: "The claim has two parts joined by \"while\". Consider what the null should be for each, and note that one of them is an equivalence claim rather than a difference claim.",
      solution: {
        lang: "python",
        title: "perf_test.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# A realistic pair of builds: the treatment fixes the slow path only.
control = np.exp(rng.normal(np.log(80), 0.55, 40_000))
control[rng.random(40_000) < 0.02] *= 9          # a slow path
treatment = np.exp(rng.normal(np.log(80), 0.55, 40_000))
treatment[rng.random(40_000) < 0.02] *= 5        # improved


# =========================================================================
# WHY THE t-TEST IS THE WRONG TOOL
# =========================================================================
#
# THREE SEPARATE PROBLEMS, and they compound:
#
# 1. IT TESTS THE MEAN. The claim is about the p99 and the median. A
#    change that halves the slow path moves the mean a little and the
#    p99 a lot.
np.mean(control), np.mean(treatment)             # 96.4, 90.5  (-6%)
np.percentile(control, 99), np.percentile(treatment, 99)   # 620, 410 (-34%)
#
# 2. THE DATA IS HEAVY-TAILED, so the mean is dominated by the tail and
#    its sampling distribution converges slowly (lesson 5.1).
stats.skew(control)                              # ~4.9
#
# 3. IT ANSWERS A DIFFERENCE QUESTION FOR BOTH PARTS. The median claim
#    is that nothing changed, and a t-test can never establish that --
#    failing to reject is not evidence of equivalence (lesson 5.3).


# =========================================================================
# THE HYPOTHESES, WRITTEN OUT
# =========================================================================
#
# The claim is a CONJUNCTION of two different kinds of statement:
#
#   CLAIM A (superiority):  p99_treatment <= 0.85 x p99_control
#     H0_A: p99_t / p99_c >= 0.85       (the improvement is NOT achieved)
#     H1_A: p99_t / p99_c <  0.85
#
#   CLAIM B (equivalence):  |median_t / median_c - 1| <= 0.02
#     H0_B: the medians differ by MORE than 2%
#     H1_B: they differ by less
#
# NOTE THE NULLS ARE INVERTED RELATIVE TO INSTINCT. For A, the null is
# "no improvement", so rejecting it establishes the improvement. For B,
# the null is "they DO differ", so rejecting it establishes equivalence.
# Setting up B the other way round -- null of "no difference" -- would
# let a small, underpowered sample "prove" equivalence, which is the
# standard error in every non-inferiority argument.


# =========================================================================
# THE TEST
# =========================================================================

def bootstrap_ratio(a, b, stat, B=10_000, seed=0):
    """Bootstrap the ratio stat(b)/stat(a) with its interval.

    Bootstrapping rather than permuting, because the claim is about a
    RATIO with a specific threshold -- not about whether the labels
    matter. A permutation null of 'no difference at all' would be the
    wrong null for both parts of this claim."""
    r = np.random.default_rng(seed)
    a, b = np.asarray(a, float), np.asarray(b, float)
    idx_a = r.integers(0, len(a), (B, len(a)))
    idx_b = r.integers(0, len(b), (B, len(b)))
    ratios = np.array([stat(b[ib]) / stat(a[ia])
                       for ia, ib in zip(idx_a, idx_b)])
    return {
        "point": float(stat(b) / stat(a)),
        "ci": tuple(np.percentile(ratios, [2.5, 97.5])),
        "draws": ratios,
    }

p99 = lambda v: np.percentile(v, 99)

# ---- CLAIM A: the p99 improved by at least 15% ----
a_res = bootstrap_ratio(control, treatment, p99)
a_res["point"]                       # 0.661  -- a 33.9% reduction
a_res["ci"]                          # (0.628, 0.697)
p_A = float((a_res["draws"] >= 0.85).mean())     # 0.0000
#
# THE ENTIRE INTERVAL IS BELOW 0.85. Not one bootstrap draw reached the
# threshold, so p < 1/B. Report it as p < 0.0001 rather than 0 -- a
# finite resampling cannot justify an exact zero.

# ---- CLAIM B: the median is unchanged within 2% ----
b_res = bootstrap_ratio(control, treatment, np.median)
b_res["point"]                       # 1.0037 -- +0.37%
b_res["ci"]                          # (0.9954, 1.0121)
#
# THE EQUIVALENCE TEST IS TOST -- TWO ONE-SIDED TESTS. Equivalence is
# established when the whole interval sits inside the margin, which is
# a stronger requirement than the interval containing 1.
lo, hi = b_res["ci"]
equivalent = (lo > 0.98) and (hi < 1.02)         # True
#
# BOTH ENDS ARE INSIDE +/-2%, so the median is established as
# unchanged. Had the interval been (0.94, 1.05) the median would be
# UNDETERMINED -- consistent with no change and also with a 6%
# regression -- which is a different conclusion from "unchanged".


# =========================================================================
# TWO CLAIMS, NOT ONE
# =========================================================================
#
# The overall claim is "A AND B". For a conjunction, the INTERSECTION-
# UNION principle applies: reject the combined null only if BOTH
# component nulls are rejected, and NO alpha correction is needed.
#
# THIS IS THE OPPOSITE OF THE USUAL MULTIPLE-TESTING SITUATION
# (lesson 5.10). There you take the BEST of several tests, so the false
# positive rate inflates. Here you require ALL of them, so it
# DEFLATES -- the combined type I error is at most alpha, and usually
# well below it.
#
#   "any of k" -> alpha inflates towards 1 - (1-alpha)^k
#   "all of k" -> alpha stays at or below alpha
#
# So requiring more conditions makes a claim harder to establish and
# the guarantee stronger, not weaker.

def evaluate(control, treatment, p99_target=0.85, median_margin=0.02,
             B=10_000, seed=0):
    """The full claim, reported as effect sizes with intervals."""
    a = bootstrap_ratio(control, treatment, lambda v: np.percentile(v, 99),
                        B, seed)
    b = bootstrap_ratio(control, treatment, np.median, B, seed + 1)

    p_a = (a["draws"] >= p99_target).mean()
    lo, hi = b["ci"]

    return {
        "p99_ratio": a["point"],
        "p99_ci": a["ci"],
        "p99_reduction": 1 - a["point"],
        "p99_target_met": bool(a["ci"][1] < p99_target),
        "p_p99": float(max(p_a, 1/B)),          # never report exactly 0
        "median_ratio": b["point"],
        "median_ci": b["ci"],
        "median_equivalent": bool(lo > 1-median_margin and hi < 1+median_margin),
        "claim_established": bool(a["ci"][1] < p99_target
                                  and lo > 1-median_margin
                                  and hi < 1+median_margin),
    }

evaluate(control, treatment)
# {'p99_ratio': 0.661, 'p99_ci': (0.628, 0.697), 'p99_reduction': 0.339,
#  'p99_target_met': True, 'p_p99': 0.0001,
#  'median_ratio': 1.004, 'median_ci': (0.995, 1.012),
#  'median_equivalent': True, 'claim_established': True}


# =========================================================================
# HOW TO REPORT IT
# =========================================================================
#
# "The change reduces p99 latency by 33.9% (95% CI: 30.3% to 37.2%),
#  exceeding the 15% target. The median is unchanged: the ratio is
#  1.004 with a 95% CI of [0.995, 1.012], entirely within the +/-2%
#  equivalence margin.
#
#  Method: bootstrap over 40,000 measurements per build, 10,000
#  resamples. No distributional assumption. Both claims were
#  pre-specified; no alpha correction is required for a conjunction."
#
# NOTE WHAT IS ABSENT: no bare p-value as the headline, and no "the
# difference is significant". The effect size and its interval are the
# result; the threshold comparison is a footnote.
#
# ASSUMPTIONS, STATED:
#   - measurements within a build are independent (NOT true if one user
#     produced many -- cluster by user if so, per lesson 5.1)
#   - the two builds ran under comparable load
#   - the p99 is well estimated: 40,000 points gives ~400 above the
#     line, comfortably past the 10-beyond rule from lesson 4.3


# =========================================================================
# TESTS
# =========================================================================

def test_ttest_misses_the_effect():
    """The motivating failure."""
    assert stats.ttest_ind(control, treatment).pvalue > 0.05
    assert np.percentile(treatment, 99) < 0.8 * np.percentile(control, 99)


def test_claim_is_established_on_this_data():
    r = evaluate(control, treatment)

    assert r["claim_established"]
    assert r["p99_reduction"] > 0.15
    assert r["median_equivalent"]


def test_p_value_is_never_exactly_zero():
    """A finite resampling cannot justify p = 0."""
    r = evaluate(control, treatment, B=2000)

    assert r["p_p99"] >= 1/2000


def test_equivalence_requires_the_whole_interval_inside_the_margin():
    """A wide interval containing 1 is NOT equivalence."""
    noisy_c = np.exp(rng.normal(np.log(80), 0.55, 300))
    noisy_t = np.exp(rng.normal(np.log(80), 0.55, 300))

    r = evaluate(noisy_c, noisy_t)
    assert 0.98 < r["median_ratio"] < 1.02       # point estimate is close
    assert not r["median_equivalent"]            # interval is not


def test_a_median_regression_fails_the_equivalence_leg():
    slowed = treatment * 1.06
    r = evaluate(control, slowed)

    assert not r["median_equivalent"]
    assert not r["claim_established"]


def test_no_p99_improvement_fails_the_superiority_leg():
    r = evaluate(control, control * 0.99)

    assert not r["p99_target_met"]
    assert not r["claim_established"]`,
        notes: [
          { t: "p", text: "**The t-test fails three ways at once**: it tests the mean when the claim is about the p99 and the median, the data is skewed 4.9 so the mean's sampling distribution converges slowly, and it cannot establish the equivalence half of the claim at all." },
          { t: "callout", kind: "insight", title: "The two nulls point in opposite directions", body: [
            { t: "p", text: "For the p99 the null is \"no improvement\", so rejecting it establishes the improvement. For the median the null is \"they *do* differ\", so rejecting it establishes equivalence." },
            { t: "p", text: "Setting the equivalence leg up the usual way — null of \"no difference\" — would let a small, underpowered sample \"prove\" the median unchanged. That is the standard error in every non-inferiority argument." }
          ]},
          { t: "p", text: "**Equivalence needs the whole interval inside the margin**, which is stronger than the interval containing 1. A ratio of 1.004 with a CI of (0.94, 1.05) is *undetermined*, not equivalent — consistent with no change and with a 6% regression." },
          { t: "p", text: "**A conjunction needs no alpha correction — it deflates rather than inflates.** \"Any of `k`\" pushes the false-positive rate towards `1 − (1−α)^k`; \"all of `k`\" holds it at or below `α`. Requiring more conditions makes the guarantee stronger." },
          { t: "p", text: "**Never report `p = 0` from a finite resampling.** With `B` draws the smallest defensible value is `1/B`, and the `+1` in a permutation p-value exists for the same reason." },
          { t: "p", text: "**Report the effect size and interval as the result**, with the threshold comparison as a footnote. \"33.9% reduction, CI 30.3% to 37.2%\" is what the reader needs; \"significant\" is not." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team ran an experiment, found nothing on the primary metric, then tested six secondary metrics and found one significant at `p = 0.03`. The feature shipped on that basis." },
      { t: "p", text: "**With seven tests at `α = 0.05`, the probability of at least one false positive is `1 − 0.95⁷ = 30%`** — so a single `p = 0.03` among seven is close to the expected yield from pure noise." },
      { t: "p", text: "The metric that reached significance was never repeated. **On the next quarter's rerun it came back at `p = 0.61`**, which is what a false positive looks like when someone bothers to check." },
      { t: "p", text: "**The framework's guarantee applies to the test you specified, not the test you ended up running.** Writing the primary metric down in advance is the whole of the defence, and it costs one line in a document." }
    ]}
  ],

  takeaways: [
    "**Every test has the same four parts**: a null, a statistic, the statistic's null distribution, and a decision rule.",
    "**Named tests are this procedure with part 3 derived instead of simulated** — which was essential before computers and is now merely faster.",
    "**When no named test fits, build one.** The null distribution can always be generated by simulation or by shuffling.",
    "**The null must be specific enough to compute under**; \"the coin is biased\" is not a null because it does not say how.",
    "**Testing is proof by contradiction with probability**, so you can reject a null but never accept one.",
    "**`α` is chosen and `β` is a consequence** — picking 0.05 without computing power is choosing one error and letting the other happen.",
    "**Sample size is the only lever that lowers both error rates**; everything else trades one for the other.",
    "**Switching to one-sided after seeing the direction doubles your real `α`** — the smallest and most common form of p-hacking.",
    "**Choosing the statistic, direction or subgroup after the data takes 5% to 8%, 10% and 21%** — none of it feels like cheating from the inside.",
    "**A permutation test's null distribution is exact**, and it works for statistics with no formula at all.",
    "**Exchangeability is the permutation test's one assumption**, so paired or clustered data must be shuffled within groups.",
    "**A conjunction of claims needs no `α` correction** — requiring all of `k` deflates the false-positive rate rather than inflating it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You need to test whether two groups differ in their 95th percentile. Which approach works?",
        options: [
          "A t-test, since it compares distributions",
          "A permutation test — shuffle the labels to generate the exact null distribution for any statistic, including one with no formula",
          "A chi-square test on binned values",
          "Compare the two p95 values directly"
        ],
        answer: 1,
        why: "The t-test compares means, and a fix to the slow path can halve a p95 while barely moving the mean. Permutation gives the null distribution by brute force, and it reproduces the t-test's p-value when you pass it the mean — a good way to trust it."
      },
      {
        stem: "You run a two-sided test, see the effect is positive, then switch to one-sided. What have you done?",
        options: [
          "Increased power legitimately",
          "Doubled your real false-positive rate to about 10% while reporting 5%",
          "Nothing — the data is the same",
          "Made the test more conservative"
        ],
        answer: 1,
        why: "The framework's guarantee applies to the test you specified in advance. Choosing the statistic after the fact takes 5% to 8%; choosing the subgroup takes it to 21% — and none of these feels like cheating from the inside."
      },
      {
        stem: "Tightening `α` from 0.05 to 0.001 does what to your error rates?",
        options: [
          "Improves both",
          "Cuts type I errors 50× and more than quadruples type II errors — there is no strictly safer setting",
          "Has no effect on type II errors",
          "Only matters for small samples"
        ],
        answer: 1,
        why: "Sample size is the only lever that moves both down. Which end of the trade you want depends entirely on consequences — particle physics uses `α = 3×10⁻⁷`, screening programmes often use 0.10 or looser."
      },
      {
        stem: "Your claim is \"the p99 improves by 15% *and* the median is unchanged\". How does that affect your `α`?",
        options: [
          "Double it — two tests",
          "No correction needed — a conjunction deflates the false-positive rate rather than inflating it",
          "Use Bonferroni, so 0.025 each",
          "Test only the primary claim"
        ],
        answer: 1,
        why: "\"Any of `k`\" pushes the rate towards `1 − (1−α)^k`; \"all of `k`\" holds it at or below `α`. Note also that the equivalence leg needs its null inverted — \"the medians differ\" — or an underpowered sample could \"prove\" no change."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Walk me through how a hypothesis test works.",
        strong: "Four parts: a specific null, a test statistic, that statistic's distribution assuming the null is true, and a decision rule. It is proof by contradiction with probability — which is why you can reject a null but never accept one.",
        answer: [
          { t: "p", text: "Naming the four parts as a reusable structure shows you can read a test you have not met before." },
          { t: "p", text: "The proof-by-contradiction framing explains the asymmetry that most people find confusing, rather than just stating it." }
        ]
      },
      {
        level: "advanced",
        q: "How would you test something with no standard test — say a difference in Gini coefficients?",
        strong: "A permutation test. Under the null that the labels carry no information, every relabelling is equally likely, so shuffling generates the exact null distribution for any statistic. The one assumption is exchangeability, which fails for paired or clustered data.",
        answer: [
          { t: "p", text: "Knowing that the permutation null is exact rather than approximate is the detail that shows real understanding." },
          { t: "p", text: "Naming exchangeability as the assumption — and where it fails — shows you would not misapply it." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide on a significance level?",
        strong: "From the consequences of each error. `α` is chosen and `β` follows from it, the sample size and the true effect, so I would state what a false positive costs against a false negative and pick accordingly — then compute the power rather than leaving it to chance.",
        answer: [
          { t: "p", text: "Rejecting 0.05 as automatic, and giving contrasting examples like drug approval against product experiments, is the substance." },
          { t: "p", text: "Pointing out that sample size is the only lever that moves both errors down shows you know the trade cannot be escaped by choosing a threshold." }
        ]
      }
    ]
  }
});

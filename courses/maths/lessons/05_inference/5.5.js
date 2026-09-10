/* ============================================================================
   LESSON 5.5 — Z-Tests and T-Tests
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "There are four t-tests and choosing the wrong one is the most common analysis error in practice. **Welch's test should be your default**, not Student's — it costs almost nothing when variances are equal and is substantially more reliable when they are not, which you cannot check without another test that has its own problems.",

  objectives: [
    "Choose between one-sample, two-sample, paired and Welch",
    "Say why the t-distribution exists rather than the normal",
    "Justify Welch as the default with a coverage simulation",
    "Recognise which assumptions matter and which do not",
    "Report a t-test result with an effect size"
  ],

  prerequisites: ["5.4"],

  blocks: [

    { t: "h2", n: "01", text: "Four tests, four questions", id: "four" },

    { t: "p", text: "There are four t-tests and picking the wrong one is a common analysis error. **They differ in what is being compared and what is assumed** — and a paired test is not a variant of a two-sample test, it is a one-sample test on the differences." },

    { t: "dl", items: [
      ["One-sample t", "Does this mean differ from a fixed value? `t = (x̄ − μ₀)/(s/√n)`."],
      ["Paired t", "Did each unit change? Literally a one-sample test on the differences, which is why pairing removes between-unit variance entirely."],
      ["Student's two-sample t", "Do two groups differ, **assuming equal variance**? Pools the two variances into one estimate."],
      ["Welch's two-sample t", "Do two groups differ? Makes no equal-variance assumption and uses fractional degrees of freedom."],
      ["The t-distribution", "What replaces the normal when `σ` is estimated from the same data. Heavier tails, converging to the normal as `n` grows."],
      ["z-test", "The same comparison with `σ` **known** rather than estimated. Almost never applicable, since knowing `σ` exactly is rare — use `t`, which converges to it anyway."]
    ]},

    { t: "table",
      head: ["Test", "The question", "Statistic", "Degrees of freedom"],
      rows: [
        ["**One-sample**", "Does this mean differ from a fixed value?", "`(x̄ − μ₀)/(s/√n)`", "`n − 1`"],
        ["**Paired**", "Did each unit change?", "`d̄/(s_d/√n)`", "`n − 1`"],
        ["**Student's two-sample**", "Do two groups differ, assuming equal variance?", "`(x̄₁ − x̄₂)/s_p√(1/n₁+1/n₂)`", "`n₁ + n₂ − 2`"],
        ["**Welch's two-sample**", "Do two groups differ?", "`(x̄₁ − x̄₂)/√(s₁²/n₁ + s₂²/n₂)`", "**fractional, computed**"],
        ["*Z-test*", "*Same, with σ known*", "*`(x̄ − μ₀)/(σ/√n)`*", "*n/a*"]
      ],
      caption: "**A paired test is a one-sample test on the differences.** That is not an analogy — it is the same computation, which is why pairing removes between-unit variance entirely."
    },

    { t: "code", lang: "python", title: "why t rather than z, and what it costs", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# THE Z-TEST NEEDS sigma. You almost never have it -- you have s, an
# estimate from the same data. That estimate has its own error, and the
# t-distribution is exactly the correction for it.
#
# THE t-DISTRIBUTION IS THE RATIO OF A NORMAL TO AN INDEPENDENT
# ESTIMATE OF ITS OWN SCALE. It has heavier tails because sometimes s
# comes out too small, which inflates the ratio.

for df in (2, 5, 10, 30, 100):
    print(f"df={df:<5} t crit {stats.t.ppf(0.975, df):.3f}   "
          f"z crit {stats.norm.ppf(0.975):.3f}   "
          f"excess {100*(stats.t.ppf(0.975, df)/1.96 - 1):5.1f}%")

# df=2     t crit 4.303   z crit 1.960   excess 119.5%
# df=5     t crit 2.571   z crit 1.960   excess  31.2%
# df=10    t crit 2.228   z crit 1.960   excess  13.7%
# df=30    t crit 2.042   z crit 1.960   excess   4.2%
# df=100   t crit 1.984   z crit 1.960   excess   1.2%
#
# AT df=30 THE DIFFERENCE IS 4%. That is why "n = 30" is where people
# stop worrying -- but it is a claim about the CRITICAL VALUE, not
# about the CLT (lesson 5.1), and the two get conflated constantly.

# THE PRACTICAL RULE: use t always. It converges to z, so there is no
# situation where z is right and t is wrong.
stats.t.ppf(0.975, 1e6)                # 1.960 -- identical to z

# ---- THE FOUR TESTS, EACH IN ONE LINE ---------------------------------

before = rng.normal(100, 15, 40)
after = before + rng.normal(3, 6, 40)          # a paired design
group_a = rng.normal(100, 15, 40)
group_b = rng.normal(103, 15, 45)              # independent groups

# 1. ONE-SAMPLE: is the mean 100?
stats.ttest_1samp(group_a, popmean=100)

# 2. PAIRED: did each subject change?
stats.ttest_rel(before, after)

# 3. STUDENT'S: do the groups differ, assuming equal variance?
stats.ttest_ind(group_a, group_b, equal_var=True)

# 4. WELCH'S: do the groups differ?
stats.ttest_ind(group_a, group_b, equal_var=False)

# NOTE SCIPY'S DEFAULT IS equal_var=True -- Student's. R's t.test
# defaults to Welch's. THE SAME DATA GIVES DIFFERENT p-VALUES DEPENDING
# ON WHICH LANGUAGE THE ANALYST HAPPENED TO USE, and neither prints a
# warning.
`,
      hl: [11, 23, 30, 51],
      caption: "**scipy defaults to Student's and R defaults to Welch's.** The same data gives different p-values depending on which language the analyst used, and neither warns you."
    },

    { t: "callout", kind: "insight", title: "Pairing removes between-subject variance entirely", body: [
      { t: "p", text: "**A paired test is a one-sample test on the differences.** Each subject acts as its own control, so everything that makes subjects differ from one another cancels before the test begins." },
      { t: "code", lang: "python", numbered: false, title: "and the gain is often enormous", code: `
# Forty subjects with very different baselines, and a small consistent
# treatment effect.
baseline = rng.normal(100, 25, 40)             # subjects differ a lot
treated = baseline + rng.normal(3, 4, 40)      # everyone improves ~3

# UNPAIRED -- the between-subject variance drowns the effect:
stats.ttest_ind(baseline, treated).pvalue      # 0.58  -- nothing found

# PAIRED -- the same data, the same effect:
stats.ttest_rel(baseline, treated).pvalue      # 3.5e-05

# IT IS LITERALLY A ONE-SAMPLE TEST ON THE DIFFERENCES:
d = treated - baseline
stats.ttest_1samp(d, 0).pvalue                 # 3.5e-05 -- identical

# WHERE THE POWER CAME FROM:
baseline.std(ddof=1)                           # 24.1  between subjects
d.std(ddof=1)                                  #  4.1  within subjects
#
# THE COMPARISON'S NOISE FELL BY A FACTOR OF SIX, so the effective
# sample multiplied by ~35.

# WHEN YOU CAN PAIR, PAIR:
#   before/after on the same unit
#   two treatments on the same subject
#   matched pairs on known covariates
#   the same user in both arms at different times (with care about
#   ordering and carryover)
#
# WHEN YOU CANNOT: independent groups, and then the design lever is
# a pre-experiment covariate instead -- regress it out (CUPED), which
# is pairing's continuous cousin.

# THE COST OF PAIRING WHEN IT DOES NOT HELP: you halve your degrees of
# freedom (n pairs, not 2n observations). If the correlation is near
# zero, pairing is slightly WORSE.
uncorrelated_a = rng.normal(100, 15, 40)
uncorrelated_b = rng.normal(100, 15, 40)
stats.ttest_rel(uncorrelated_a, uncorrelated_b).pvalue    # 0.72
stats.ttest_ind(uncorrelated_a, uncorrelated_b).pvalue    # 0.70
#
# Break-even is around rho = 0.5; above that pairing wins, and it wins
# enormously as rho approaches 1.`},
      { t: "p", text: "**Pairing halves your degrees of freedom, so it is slightly worse when the correlation is near zero.** Break-even is around `ρ = 0.5`, and above it the gain grows without limit." }
    ]},

    { t: "h2", n: "02", text: "Why Welch should be the default", id: "welch" },

    { t: "p", text: "**Welch's test should be your default.** It costs under one percentage point of power when variances really are equal, and Student's true error rate can reach 17% when unequal variances meet unequal group sizes — a configuration that is entirely ordinary." },

    { t: "dl", items: [
      ["Pooled variance", "Student's single variance estimate, weighted by sample size. Dominated by the larger group, which is the mechanism of the failure."],
      ["Welch-Satterthwaite", "The fractional degrees of freedom Welch uses, computed from the two variances and sample sizes."],
      ["The failure condition", "Unequal variance **and** unequal `n` together. Either alone is harmless."],
      ["Why not pre-test", "Choosing your test based on a variance test's outcome invalidates the error rate of both. The fix is to use the test that does not need the assumption."],
      ["Library defaults", "scipy defaults to Student's; R defaults to Welch's. The same data gives different p-values by language, with no warning."]
    ]},

    { t: "viz",
      title: "Student's test fails when unequal variances meet unequal group sizes",
      caption: "Pooling variances assumes the groups share one. When the smaller group is also the more variable one, the pooled estimate is dominated by the wrong group and the test's true error rate rises far above its nominal 5%.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Two group distributions of different width and sample size, with a pooled variance estimate sitting closer to the larger group">
  <g>
    <path d="M60 170 C 110 170, 120 60, 170 60 C 220 60, 230 170, 280 170"
          style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="2"/>
    <text x="106" y="196" class="s-label" style="fill:var(--accent)">group A</text>
    <text x="90" y="216" class="s-sub" style="fill:var(--ink-3)">n = 200, sd = 1</text>
  </g>

  <g>
    <path d="M330 170 C 420 170, 440 90, 520 90 C 600 90, 620 170, 710 170"
          style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)" stroke-width="2"/>
    <text x="486" y="196" class="s-label" style="fill:var(--crit)">group B</text>
    <text x="452" y="216" class="s-sub" style="fill:var(--ink-3)">n = 20, sd = 4</text>
  </g>

  <line x1="230" y1="40" x2="230" y2="180" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="2.5"/>
  <text x="240" y="38" class="s-label" style="fill:var(--warn)">pooled sd</text>
  <text x="240" y="58" class="s-sub" style="fill:var(--ink-3)">weighted by n, so it sits</text>
  <text x="240" y="76" class="s-sub" style="fill:var(--ink-3)">near the LARGE group --</text>
  <text x="240" y="94" class="s-sub" style="fill:var(--ink-3)">and badly understates B</text>

  <text x="740" y="140" class="s-sub" style="fill:var(--crit)">nominal 5%</text>
  <text x="740" y="158" class="s-sub" style="fill:var(--crit)">actual 17%</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measure the failure and the cost of the fix", code: `
def false_positive_rate(n1, n2, sd1, sd2, equal_var, trials=20_000, seed=0):
    """Both groups have the SAME mean, so every rejection is an error."""
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        a = r.normal(0, sd1, n1)
        b = r.normal(0, sd2, n2)
        hits += stats.ttest_ind(a, b, equal_var=equal_var).pvalue < 0.05
    return hits / trials

cases = [
    ("equal n, equal sd",      50, 50, 1.0, 1.0),
    ("equal n, unequal sd",    50, 50, 1.0, 4.0),
    ("small group is variable", 200, 20, 1.0, 4.0),
    ("large group is variable", 20, 200, 1.0, 4.0),
]

for name, n1, n2, s1, s2 in cases:
    st = false_positive_rate(n1, n2, s1, s2, equal_var=True)
    we = false_positive_rate(n1, n2, s1, s2, equal_var=False)
    print(f"{name:24s} student {st:.3f}   welch {we:.3f}")

# equal n, equal sd        student 0.050   welch 0.050
# equal n, unequal sd      student 0.050   welch 0.050
# small group is variable  student 0.171   welch 0.051
# large group is variable  student 0.009   welch 0.051
#
# TWO FINDINGS, AND THE SECOND IS THE ONE PEOPLE MISS:
#
# 1. WITH EQUAL GROUP SIZES, STUDENT'S IS FINE even with a 4x variance
#    ratio. Unequal variance alone is not the problem.
#
# 2. WITH UNEQUAL SIZES IT BREAKS BOTH WAYS. When the small group is
#    more variable the true error rate is 17% -- more than triple the
#    nominal. When the LARGE group is more variable it drops to 0.9%,
#    which is not "safe" but a badly underpowered test.
#
# WELCH IS AT 5% IN ALL FOUR CASES.

# WHAT WELCH COSTS WHEN THE VARIANCES REALLY ARE EQUAL:
def power(n1, n2, sd, effect, equal_var, trials=20_000, seed=1):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        a = r.normal(0, sd, n1)
        b = r.normal(effect, sd, n2)
        hits += stats.ttest_ind(a, b, equal_var=equal_var).pvalue < 0.05
    return hits / trials

for n in (10, 20, 50):
    st = power(n, n, 1.0, 0.8, equal_var=True)
    we = power(n, n, 1.0, 0.8, equal_var=False)
    print(f"n={n:<5} student power {st:.3f}   welch {we:.3f}   "
          f"cost {100*(st-we):.1f}pp")

# n=10    student power 0.401   welch 0.394   cost  0.7pp
# n=20    student power 0.694   welch 0.691   cost  0.3pp
# n=50    student power 0.960   welch 0.960   cost  0.0pp
#
# UNDER ONE PERCENTAGE POINT OF POWER, EVEN AT n=10. That is the whole
# price of never having to check.

# AND THE ALTERNATIVE -- pre-testing for equal variance -- IS WORSE
# THAN EITHER. Levene's test has its own error rate, and conditioning
# your choice of test on another test's outcome invalidates both:
def pretest_then_choose(n1, n2, sd1, sd2, trials=20_000, seed=2):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        a, b = r.normal(0, sd1, n1), r.normal(0, sd2, n2)
        equal = stats.levene(a, b).pvalue > 0.05
        hits += stats.ttest_ind(a, b, equal_var=equal).pvalue < 0.05
    return hits / trials

pretest_then_choose(200, 20, 1.0, 4.0)      # 0.071
pretest_then_choose(200, 20, 1.0, 1.0)      # 0.058
#
# THE TWO-STAGE PROCEDURE SITS AT 6-7% IN BOTH CASES -- worse than
# Welch alone in both. THE FIX IS NOT TO TEST, IT IS TO USE THE TEST
# THAT DOES NOT NEED THE ASSUMPTION.
`,
      hl: [26, 33, 51, 70],
      caption: "**Welch costs under one percentage point of power at `n = 10`, and Student's true error rate reaches 17%.** Pre-testing for equal variance is worse than either — conditioning one test on another invalidates both."
    },

    { t: "h2", n: "03", text: "Which assumptions actually matter", id: "assumptions" },

    { t: "p", text: "A t-test's assumptions are not equally important, and effort should go where a violation costs something. **Independence is the one that matters and the only one with no symptom in the data** — normality and equal variance are the two people check, and they matter least." },

    { t: "dl", items: [
      ["Independence", "**Critical.** A clustering violation multiplies your error rate and leaves no trace in the numbers. Only the design reveals it."],
      ["Normality of the sampling distribution", "Moderate, and usually supplied by the CLT. Note it is the *mean's* distribution that matters, not the data's."],
      ["Outliers", "Moderate. One extreme value inflates `s`, which shrinks `t` — so the test quietly loses power."],
      ["Equal variance", "Not an issue if you use Welch. Listed only so nobody adds a Levene test."],
      ["Unit of analysis", "Must match the unit of randomisation. Aggregating to the randomised unit is the simplest correct fix."],
      ["Assumption", "A condition a test's guarantee depends on. Ranking them by what a violation costs is the difference between useful checking and ritual."]
    ]},

    { t: "ladder",
      title: "Deciding whether a t-test is safe here",
      rungs: [
        { level: "bad", label: "Run a normality test on the data",
          why: "The t-test does not assume the data is normal — it assumes the *sampling distribution of the mean* is, which the CLT usually delivers. And a normality test rejects trivial deviations at large `n` while missing serious ones at small `n` (lesson 4.4).",
          code: `if stats.shapiro(x).pvalue > 0.05:
    result = stats.ttest_ind(x, y)
else:
    result = stats.mannwhitneyu(x, y)

# Wrong test of the wrong assumption, and choosing conditionally
# invalidates the error rate of whichever branch runs.` },
        { level: "ok", label: "Check the sample size against the skew",
          why: "This targets the right assumption. The CLT's convergence rate depends on skewness, so `n > 25 × skew²` is a usable rule for whether the mean's distribution is close enough to normal.",
          code: `def clt_adequate(x):
    """Is n large enough for the sampling distribution of the mean?"""
    x = np.asarray(x, dtype=float)
    return len(x) > 25 * stats.skew(x)**2

clt_adequate(rng.normal(0, 1, 20))            # True
clt_adequate(rng.lognormal(0, 1.5, 20))       # False -- needs ~500` },
        { level: "best", label: "Rank the assumptions by how much they matter",
          why: "Not all assumptions are equal. Independence violations are catastrophic and invisible; normality violations are usually harmless; equal variance is handled by choosing Welch. Spending effort in proportion to consequence is the whole skill.",
          code: `def t_test_checklist(a, b, cluster_a=None, cluster_b=None):
    """Assumptions in descending order of how much a violation costs."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    issues = []

    # 1. INDEPENDENCE -- CATASTROPHIC, and produces no visible symptom.
    #    A design effect of 5 makes every p-value five times too small
    #    (lesson 5.1). Nothing in the data flags it; only the design does.
    for name, cl in (("a", cluster_a), ("b", cluster_b)):
        if cl is not None and len(np.unique(cl)) < len(cl):
            m = len(cl) / len(np.unique(cl))
            issues.append(
                f"CRITICAL: group {name} has {len(np.unique(cl))} clusters "
                f"for {len(cl)} rows (avg {m:.1f}/cluster) -- aggregate "
                f"to the cluster before testing"
            )

    # 2. HEAVY SKEW WITH SMALL n -- moderate. The CLT has not arrived.
    for name, v in (("a", a), ("b", b)):
        need = 25 * stats.skew(v)**2
        if len(v) < need:
            issues.append(
                f"group {name}: n={len(v)} but skew {stats.skew(v):.1f} "
                f"needs ~{need:.0f}; consider a permutation test"
            )

    # 3. OUTLIERS -- moderate, and specific. A single extreme value
    #    inflates s, which shrinks t. The test loses power quietly.
    for name, v in (("a", a), ("b", b)):
        z = np.abs((v - np.median(v)) /
                   (1.4826 * np.median(np.abs(v - np.median(v))) + 1e-12))
        if (z > 5).any():
            issues.append(f"group {name}: {int((z>5).sum())} extreme "
                          f"value(s) -- check whether they are real")

    # 4. UNEQUAL VARIANCE -- NOT AN ISSUE, because Welch handles it.
    #    Listed only so nobody adds a Levene test later.
    return issues or ["no material assumption problems"]

# THE ORDERING IS THE POINT:
#   independence   violation multiplies your error rate -- fix it
#   sample size    violation distorts the tails -- permute instead
#   outliers       violation costs power -- investigate them
#   normality      rarely matters at usable n -- do not test for it
#   equal variance handled by the test choice -- do not test for it`,
          note: "**Independence is the assumption that matters and the only one with no symptom in the data.** Normality and equal variance are the ones people check, and they are the two that matter least." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Fix an analysis function used across a company",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "This helper is imported by a dozen teams and is the standard way experiments are read at the company. Review it." },
        { t: "code", lang: "python", numbered: true, title: "stats_helpers.py", code: `import numpy as np
from scipy import stats

def compare_groups(a, b, alpha=0.05):
    """Compare two groups and say whether they differ."""
    a, b = np.array(a), np.array(b)

    if stats.shapiro(a).pvalue < 0.05 or stats.shapiro(b).pvalue < 0.05:
        stat, p = stats.mannwhitneyu(a, b)
    elif stats.levene(a, b).pvalue < 0.05:
        stat, p = stats.ttest_ind(a, b, equal_var=False)
    else:
        stat, p = stats.ttest_ind(a, b)

    return {
        "p_value": p,
        "significant": p < alpha,
        "conclusion": "different" if p < alpha else "the same",
    }`}
      ],
      requirements: [
        "Identify every defect, ranked by how much it matters.",
        "Quantify the error rate of the branching logic.",
        "Give a corrected implementation.",
        "Say what the function should return that it does not.",
        "Address the wording of the conclusion field.",
        "Include tests."
      ],
      hint: "Count how many decisions are being made from the same data before the real test runs.",
      solution: {
        lang: "python",
        title: "stats_helpers_fixed.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)


# =========================================================================
# DEFECT 1 -- CONDITIONAL TEST SELECTION (the worst)
# =========================================================================
#
# Three tests are run on the same data, and the third is chosen based
# on the first two. That invalidates the error rate of whichever branch
# executes -- the framework's guarantee applies to a test chosen
# INDEPENDENTLY of the data (lesson 5.4).

def broken(a, b, alpha=0.05):
    if stats.shapiro(a).pvalue < 0.05 or stats.shapiro(b).pvalue < 0.05:
        p = stats.mannwhitneyu(a, b).pvalue
    elif stats.levene(a, b).pvalue < 0.05:
        p = stats.ttest_ind(a, b, equal_var=False).pvalue
    else:
        p = stats.ttest_ind(a, b).pvalue
    return p < alpha

def false_positive_rate(fn, n1, n2, sd1, sd2, dist="normal",
                        trials=20_000, seed=0):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        if dist == "normal":
            a, b = r.normal(0, sd1, n1), r.normal(0, sd2, n2)
        else:
            a = r.lognormal(0, sd1, n1); b = r.lognormal(0, sd2, n2)
        hits += fn(a, b)
    return hits / trials

welch = lambda a, b: stats.ttest_ind(a, b, equal_var=False).pvalue < 0.05

for name, kw in [
    ("normal, equal",      dict(n1=50, n2=50, sd1=1, sd2=1)),
    ("normal, unequal sd", dict(n1=200, n2=20, sd1=1, sd2=4)),
    ("lognormal",          dict(n1=50, n2=50, sd1=1, sd2=1, dist="log")),
]:
    print(f"{name:20s} broken {false_positive_rate(broken, **kw):.3f}   "
          f"welch {false_positive_rate(welch, **kw):.3f}")

# normal, equal        broken 0.058   welch 0.050
# normal, unequal sd   broken 0.071   welch 0.051
# lognormal            broken 0.049   welch 0.048
#
# THE BRANCHING VERSION RUNS AT 5.8-7.1% AGAINST A NOMINAL 5%. Not
# catastrophic, but it is worse than simply using Welch every time --
# and it is worse in every case, which makes the extra machinery pure
# cost.

# =========================================================================
# DEFECT 2 -- SHAPIRO TESTS THE WRONG ASSUMPTION
# =========================================================================
#
# The t-test assumes the SAMPLING DISTRIBUTION OF THE MEAN is normal,
# not that the data is. And Shapiro's power scales with n, so:
#
#   large n:  rejects trivial deviations -> routes to Mann-Whitney
#             when the t-test was perfectly fine
#   small n:  no power -> passes badly skewed data to the t-test
#
# IT FAILS IN EXACTLY THE DIRECTION THAT DOES DAMAGE, at both ends.
for n in (15, 200, 2000):
    x = rng.lognormal(0, 0.4, (500, n))          # mildly skewed
    rate = np.mean([stats.shapiro(row).pvalue < 0.05 for row in x])
    print(f"n={n:<6} shapiro rejects {rate:.1%} on mildly skewed data")
# n=15     shapiro rejects  30.4%
# n=200    shapiro rejects 100.0%
# n=2000   shapiro rejects 100.0%

# =========================================================================
# DEFECT 3 -- SWITCHING TO MANN-WHITNEY CHANGES THE QUESTION
# =========================================================================
#
# Mann-Whitney does not test means. It tests whether one group tends to
# exceed the other (stochastic dominance). For symmetric distributions
# with equal spread these agree; otherwise they do not, and the
# function silently answers a different question depending on a
# normality test's outcome.
#
# The user asked "do these differ" and got an answer to one of two
# different questions, chosen by a coin flip they cannot see.

# =========================================================================
# DEFECT 4 -- NO EFFECT SIZE, NO INTERVAL
# =========================================================================
#
# The function returns a p-value and a boolean. With n = 100,000, a
# 0.01% difference is "significant" and meaningless; with n = 20, a 40%
# difference is "not significant" and important. THE FUNCTION CANNOT
# DISTINGUISH THESE, and neither can anyone reading its output.

# =========================================================================
# DEFECT 5 -- "the same" IS FALSE
# =========================================================================
#
# Failing to reject is not evidence of equality (lesson 5.3). The word
# "same" in a returned field is repeated verbatim into slide decks, and
# it is the single most consequential line in the file.

# =========================================================================
# DEFECT 6 -- ONE-SAMPLE AND PAIRED DESIGNS ARE UNSUPPORTED
# =========================================================================
#
# A caller with paired data will pass it here and lose most of their
# power (see the pairing section). The function does not ask, so it
# cannot warn.

# =========================================================================
# DEFECT 7 -- NO INPUT VALIDATION
# =========================================================================
#
# NaNs propagate silently to a p-value of nan, which compares False
# against alpha -- so bad data reads as "the same". Groups of size 1
# raise deep inside scipy with an unhelpful message.


# =========================================================================
# THE FIX
# =========================================================================

def compare_groups(a, b, alpha=0.05, paired=False, cluster_a=None,
                   cluster_b=None):
    """Compare two groups. Welch by default, always.

    Returns effect sizes and an interval rather than a verdict: the
    caller knows what difference matters to them and this function
    does not.
    """
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)

    if np.isnan(a).any() or np.isnan(b).any():
        raise ValueError(
            f"NaNs present ({np.isnan(a).sum()} and {np.isnan(b).sum()}); "
            f"drop or impute them deliberately rather than silently"
        )
    if len(a) < 2 or len(b) < 2:
        raise ValueError(f"need at least 2 per group, got {len(a)}, {len(b)}")

    # Clustered data must be aggregated to its unit of randomisation
    # first, or every p-value is too small (lesson 5.1).
    warnings = []
    for name, v, cl in (("a", a, cluster_a), ("b", b, cluster_b)):
        if cl is not None and len(np.unique(cl)) < len(cl):
            warnings.append(
                f"group {name}: {len(np.unique(cl))} clusters for {len(v)} "
                f"rows -- aggregate before testing or the p-value is wrong"
            )

    if paired:
        if len(a) != len(b):
            raise ValueError(f"paired needs equal lengths, got {len(a)}, {len(b)}")
        d = b - a
        res = stats.ttest_1samp(d, 0.0)
        diff = float(d.mean())
        se = float(d.std(ddof=1) / np.sqrt(len(d)))
        df = len(d) - 1
        # Cohen's d for paired data uses the sd of the DIFFERENCES.
        effect = diff / d.std(ddof=1)
        test = "paired t"
    else:
        res = stats.ttest_ind(a, b, equal_var=False)     # Welch, always
        diff = float(b.mean() - a.mean())
        se = float(np.sqrt(a.var(ddof=1)/len(a) + b.var(ddof=1)/len(b)))
        va, vb = a.var(ddof=1)/len(a), b.var(ddof=1)/len(b)
        df = (va + vb)**2 / (va**2/(len(a)-1) + vb**2/(len(b)-1))
        pooled_sd = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
        effect = diff / pooled_sd if pooled_sd > 0 else 0.0
        test = "welch t"

    crit = stats.t.ppf(1 - alpha/2, df)

    # The CLT check that Shapiro was standing in for, done properly.
    for name, v in (("a", a), ("b", b)):
        need = 25 * stats.skew(v)**2
        if len(v) < need:
            warnings.append(
                f"group {name}: n={len(v)}, skew={stats.skew(v):.1f} "
                f"(needs ~{need:.0f}) -- prefer a permutation test"
            )

    return {
        "test": test,
        "mean_a": float(a.mean()), "mean_b": float(b.mean()),
        "difference": diff,
        "ci": (diff - crit*se, diff + crit*se),
        "relative": diff / a.mean() if a.mean() else float("nan"),
        "cohens_d": float(effect),
        "p_value": float(res.pvalue),
        "df": float(df),
        "n": (len(a), len(b)),
        # Deliberately NOT "significant"/"the same".
        "reject_null_of_no_difference": bool(res.pvalue < alpha),
        "warnings": warnings,
    }


# =========================================================================
# WHY THE RETURN SHAPE CHANGED
# =========================================================================
#
# The old function answered "are they different?" -- a question
# statistics cannot answer. The new one reports HOW different, with the
# uncertainty attached, and leaves the decision to the caller who knows
# what magnitude matters.
#
# "reject_null_of_no_difference" is deliberately verbose. It is
# accurate, and the awkwardness stops it being pasted into a slide as
# "the groups are the same".


# =========================================================================
# TESTS
# =========================================================================

def test_conditional_selection_inflates_the_error_rate():
    br = false_positive_rate(broken, 200, 20, 1.0, 4.0, trials=5000)
    we = false_positive_rate(welch, 200, 20, 1.0, 4.0, trials=5000)

    assert br > we
    assert br > 0.06


def test_welch_is_used_unconditionally():
    a, b = rng.normal(0, 1, 50), rng.normal(0, 5, 50)

    assert compare_groups(a, b)["test"] == "welch t"
    assert compare_groups(rng.normal(0,1,50), rng.normal(0,1,50))["test"] \\
        == "welch t"


def test_effect_size_and_interval_are_returned():
    r = compare_groups(rng.normal(0, 1, 50), rng.normal(0.5, 1, 50))

    assert "cohens_d" in r and "ci" in r
    assert r["ci"][0] < r["difference"] < r["ci"][1]


def test_no_field_claims_the_groups_are_the_same():
    r = compare_groups(rng.normal(0, 1, 50), rng.normal(0, 1, 50))

    assert "the same" not in str(r).lower()
    assert "significant" not in r


def test_paired_mode_beats_unpaired_on_paired_data():
    base = rng.normal(100, 25, 40)
    after = base + rng.normal(3, 4, 40)

    assert compare_groups(base, after, paired=True)["p_value"] < 0.01
    assert compare_groups(base, after)["p_value"] > 0.05


def test_nans_raise_rather_than_returning_not_significant():
    import pytest
    a = np.array([1.0, 2.0, np.nan, 4.0])

    with pytest.raises(ValueError, match="NaN"):
        compare_groups(a, np.array([1.0, 2.0, 3.0, 4.0]))


def test_clustered_input_is_flagged():
    a = rng.normal(0, 1, 100)
    clusters = np.repeat(np.arange(10), 10)

    r = compare_groups(a, rng.normal(0, 1, 100), cluster_a=clusters)
    assert any("cluster" in w for w in r["warnings"])


def test_skewed_small_sample_is_flagged():
    r = compare_groups(rng.lognormal(0, 1.5, 20), rng.lognormal(0, 1.5, 20))

    assert any("permutation" in w for w in r["warnings"])`,
        notes: [
          { t: "p", text: "**Three tests run on the same data before the real one, with the third chosen by the first two.** The branching version sits at 5.8–7.1% against a nominal 5%, and it is worse than plain Welch in every case tested — so the machinery is pure cost." },
          { t: "callout", kind: "insight", title: "Shapiro fails in the damaging direction at both ends", body: [
            { t: "p", text: "Its power scales with `n`, so at large `n` it rejects trivial deviations and routes perfectly good data to Mann-Whitney, while at small `n` it lacks the power to catch the skew that actually matters. On mildly skewed data it rejects 30% of the time at `n = 15` and 100% at `n = 200`." },
            { t: "p", text: "It is also testing the wrong thing: the t-test assumes the sampling distribution of the *mean* is normal, which the CLT usually supplies. `n > 25 × skew²` is the check that targets the real assumption." }
          ]},
          { t: "p", text: "**Switching to Mann-Whitney changes the question**, not just the method — it tests stochastic dominance rather than means. The caller asked one question and received an answer to one of two, chosen by a mechanism they cannot see." },
          { t: "p", text: "**The `\"the same\"` string is the most consequential line in the file**, because it gets pasted verbatim into slides. The replacement field is deliberately verbose — accurate, and too awkward to quote carelessly." },
          { t: "p", text: "**The return shape had to change.** The old function answered \"are they different?\", which statistics cannot answer. The new one reports how different with the uncertainty attached, and leaves the decision to the caller who knows what magnitude matters." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A clinical study compared a treatment group of 24 against a control of 240 and reported `p = 0.03`, using Student's t-test as the software's default." },
      { t: "p", text: "**The small treatment group was three times as variable as the control**, and the pooled variance is weighted by sample size — so it was dominated by the large, tight group and badly understated the treatment group's spread." },
      { t: "p", text: "**Welch's test on the same data gave `p = 0.19`.** The simulation says Student's true error rate in that configuration is around 17%, so `p = 0.03` was consistent with no effect at all." },
      { t: "p", text: "**Unequal variance alone is harmless; unequal variance with unequal group sizes is not.** Since Welch costs under a percentage point of power even at `n = 10`, there is no configuration where using it is the wrong call." }
    ]}
  ],

  takeaways: [
    "**The t-distribution exists because σ is estimated** — its heavier tails pay for that estimate, and it converges to `z`, so use `t` always.",
    "**A paired test is a one-sample test on the differences**, which is why pairing removes between-subject variance entirely.",
    "**Pairing halves the degrees of freedom**, so it loses slightly when `ρ` is near zero; break-even is around `ρ = 0.5`.",
    "**scipy defaults to Student's and R defaults to Welch's** — the same data gives different p-values by language, with no warning.",
    "**Unequal variance with equal group sizes is harmless.** It is unequal variance *plus* unequal sizes that breaks Student's test.",
    "**Student's true error rate reaches 17% when the smaller group is more variable**, and 0.9% when the larger one is — badly wrong in both directions.",
    "**Welch costs under one percentage point of power at `n = 10`**, which is the entire price of never having to check.",
    "**Pre-testing for equal variance is worse than either test alone** — conditioning one test's choice on another's outcome invalidates both.",
    "**The t-test assumes the sampling distribution of the mean is normal**, not that the data is — so a normality test on the data is testing the wrong thing.",
    "**Independence is the assumption that matters and the only one with no symptom in the data.**",
    "**Mann-Whitney tests stochastic dominance, not means** — switching to it changes the question being answered.",
    "**Never return \"the same\" from an analysis function.** It gets pasted into slides, and failing to reject is not evidence of equality."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You compare 24 treated subjects against 240 controls, and the treated group is three times as variable. Which test?",
        options: [
          "Student's — it uses all the data efficiently",
          "Welch's — with unequal sizes *and* unequal variances, Student's true error rate reaches around 17%",
          "Mann-Whitney, since the variances differ",
          "Levene's first, then decide"
        ],
        answer: 1,
        why: "The pooled variance is weighted by sample size, so it is dominated by the large tight group and understates the small variable one. Note that unequal variance with *equal* group sizes is harmless — it is the combination that breaks."
      },
      {
        stem: "Should you run a normality test before a t-test?",
        options: [
          "Yes, it validates the assumption",
          "No — the t-test assumes the sampling distribution of the *mean* is normal, and conditioning your test choice on another test's outcome invalidates the error rate of both",
          "Only for `n < 30`",
          "Only for the smaller group"
        ],
        answer: 1,
        why: "Shapiro's power scales with `n`, so it rejects trivial deviations at large `n` and misses serious ones at small `n` — failing in the damaging direction at both ends. `n > 25 × skew²` targets the assumption that actually matters."
      },
      {
        stem: "Forty subjects measured before and after, with large between-subject differences. Unpaired gives `p = 0.58`, paired gives `p = 0.00004`. Why?",
        options: [
          "The paired test is more liberal",
          "Pairing removes between-subject variance entirely — the comparison's noise fell from sd 24 to sd 4",
          "The unpaired test used the wrong variance formula",
          "One of them must be wrong"
        ],
        answer: 1,
        why: "A paired test is literally a one-sample test on the differences, so everything that makes subjects differ from each other cancels before the test begins. The cost is halved degrees of freedom, which only matters when the correlation is below about 0.5."
      },
      {
        stem: "An analysis helper returns `{\"conclusion\": \"the same\"}` when `p > 0.05`. What is wrong?",
        options: [
          "Nothing — that is what non-significance means",
          "Failing to reject is not evidence of equality, and that string gets pasted verbatim into slides as an established finding",
          "It should say \"not significant\"",
          "The threshold should be 0.01"
        ],
        answer: 1,
        why: "With `n = 20` a 40% difference is \"not significant\"; with `n = 100,000` a 0.01% difference is \"significant\". A function returning only a p-value and a verdict cannot distinguish these, and neither can anyone reading its output."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use Welch's t-test instead of Student's?",
        strong: "Always. It costs under a percentage point of power when variances are equal, and Student's true error rate can reach 17% when unequal variances meet unequal group sizes. There is no configuration where Student's is the better choice.",
        answer: [
          { t: "p", text: "\"Always\" with a quantified cost is a much stronger answer than the conditional rule most people give." },
          { t: "p", text: "Noting that unequal variance *alone* is harmless — it is the interaction with unequal `n` — shows you understand the mechanism rather than the rule." }
        ]
      },
      {
        level: "core",
        q: "What assumptions does a t-test make, and which matter?",
        strong: "Independence, approximate normality of the sampling distribution of the mean, and — for Student's only — equal variance. Independence is the one that matters: a clustering violation multiplies your error rate and leaves no symptom in the data. Normality rarely matters at usable `n`.",
        answer: [
          { t: "p", text: "Ranking them by consequence, rather than listing them, is what the question is testing." },
          { t: "p", text: "The distinction between normality of the data and of the sampling distribution is the one most people get wrong." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague's helper picks a test based on a normality check. What would you say?",
        strong: "That the branching invalidates the error rate of whichever branch runs, and that simulating it shows a higher false-positive rate than just using Welch. Also that Mann-Whitney answers a different question — stochastic dominance rather than means — so the function silently changes what it is testing.",
        answer: [
          { t: "p", text: "Offering to simulate the actual error rate turns an argument about principle into a measurement." },
          { t: "p", text: "The \"different question\" point is the one that usually lands, because it is a correctness issue rather than a statistical nicety." }
        ]
      }
    ]
  }
});

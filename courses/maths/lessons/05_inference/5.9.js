/* ============================================================================
   LESSON 5.9 — Non-Parametric Tests
   ========================================================================= */
EC.receiveLesson({
  id: "5.9",

  lede: "Non-parametric tests are usually described as \"what you use when the data is not normal\", and that description is wrong twice. **They do not test the same hypothesis as their parametric counterparts**, and they are not assumption-free — Mann-Whitney tests stochastic dominance, not means, and switching to it changes the question you are answering.",

  objectives: [
    "Say what each rank test's null hypothesis actually is",
    "Choose between a rank test, a permutation test and a transform",
    "Quantify what you give up in power and what you stop assuming",
    "Recognise the case where Mann-Whitney and the t-test disagree in direction",
    "Handle ties and small samples correctly"
  ],

  prerequisites: ["5.5"],

  blocks: [

    { t: "h2", n: "01", text: "What each test actually tests", id: "hypotheses" },

    { t: "table",
      head: ["Test", "Parametric counterpart", "Its null hypothesis"],
      rows: [
        ["**Mann-Whitney U**", "Two-sample t", "**`P(X > Y) = 0.5`** — not equal means, not equal medians"],
        ["**Wilcoxon signed-rank**", "Paired t", "The differences are symmetric about zero"],
        ["**Kruskal-Wallis**", "One-way ANOVA", "All groups have the same distribution"],
        ["**Spearman**", "Pearson", "No monotonic association"],
        ["*Permutation*", "*any*", "*The labels are exchangeable*"]
      ],
      caption: "**Mann-Whitney tests whether a random member of one group tends to exceed a random member of the other.** Only under the extra assumption of identically shaped distributions does that become a statement about medians."
    },

    { t: "code", lang: "python", title: "the null that surprises people", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# MANN-WHITNEY'S U STATISTIC COUNTS PAIRWISE WINS:
#
#     U = number of (x, y) pairs with x > y
#
# and the null is that this is half of all pairs -- i.e. P(X > Y) = 0.5.

a = np.array([1.0, 3.0, 5.0, 7.0])
b = np.array([2.0, 4.0, 6.0, 8.0])

wins = sum(1 for x in a for y in b if x > y)
wins, len(a)*len(b)                     # 6 of 16
stats.mannwhitneyu(a, b, alternative="two-sided").statistic     # 6.0

# THE PROBABILITY OF SUPERIORITY IS THE EFFECT SIZE, and it is far
# more readable than U itself:
def prob_superiority(a, b):
    """P(a random value from b exceeds a random value from a), with
    ties counted as half. Also called the common-language effect size,
    and it is exactly U / (n_a * n_b)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    comparisons = b[:, None] > a[None, :]
    ties = b[:, None] == a[None, :]
    return float((comparisons.sum() + 0.5*ties.sum()) / (len(a)*len(b)))

prob_superiority(a, b)                  # 0.625

# ---- WHERE IT DIVERGES FROM THE t-TEST -------------------------------
#
# CASE 1: identical means, different shapes. The t-test sees nothing;
# Mann-Whitney sees a great deal.
x = np.concatenate([rng.normal(0, 1, 400), rng.normal(0, 1, 400)])
y = np.concatenate([rng.normal(-2, 1, 400), rng.normal(2, 1, 400)])

x.mean(), y.mean()                      # ~0.00, ~0.00
stats.ttest_ind(x, y).pvalue            # 0.94  -- means agree
stats.mannwhitneyu(x, y).pvalue         # 0.87  -- and so does MWU here
#
# Both miss it, because the distributions are symmetric. NEITHER TEST
# LOOKS AT SPREAD -- if the question is about variability, use Levene
# or compare the interquartile ranges directly.

# CASE 2: THE CASE THAT MATTERS -- they disagree in DIRECTION.
#
# Group A: mostly small values, a few enormous ones.
# Group B: consistently middling.
big_a = np.concatenate([rng.normal(10, 2, 950), rng.normal(500, 50, 50)])
big_b = np.full(1000, 30.0) + rng.normal(0, 2, 1000)

big_a.mean(), big_b.mean()              # 34.5, 30.0  -- A has the higher mean
np.median(big_a), np.median(big_b)      # 10.0, 30.0  -- B has the higher median

stats.ttest_ind(big_a, big_b).pvalue    # 0.0086, and A is higher
stats.mannwhitneyu(big_a, big_b, alternative="greater").pvalue   # 1.0
prob_superiority(big_b, big_a)          # 0.05
#
# THE t-TEST SAYS A IS HIGHER; MANN-WHITNEY SAYS B WINS 95% OF PAIRWISE
# COMPARISONS. BOTH ARE CORRECT, because they answer different
# questions:
#
#   "which group has the larger TOTAL?"        -> A (the t-test)
#   "which group's typical member is larger?"  -> B (Mann-Whitney)
#
# CHOOSE BY WHAT THE DECISION NEEDS. Revenue per user is a total
# question and needs the mean. "Which experience is better for a
# typical user" is a pairwise question and needs the rank test.
# Reaching for a rank test because the data is skewed silently swaps
# one for the other.
`,
      hl: [7, 33, 52, 62],
      caption: "**The t-test and Mann-Whitney can disagree in direction, and both be right.** One asks which group has the larger total; the other asks whose typical member is larger."
    },

    { t: "callout", kind: "trap", title: "Non-parametric does not mean assumption-free", body: [
      { t: "p", text: "Rank tests drop the normality assumption and keep others. Mann-Whitney still needs independence, and interpreting it as a test of medians needs the distributions to have the same shape — an assumption stronger than the one it replaced." },
      { t: "code", lang: "python", numbered: false, title: "the assumptions that remain", code: `
# 1. INDEPENDENCE -- still required, and still the one that matters.
#    A rank test on clustered data is as wrong as a t-test on it
#    (lesson 5.1). Ranks do not fix a design problem.

# 2. EQUAL SHAPE, if you want to talk about medians. Without it,
#    Mann-Whitney can be significant when the medians are IDENTICAL:
same_median_a = rng.exponential(1.0, 5000)
same_median_b = rng.exponential(1.0, 5000) ** 0.5 * 0.833
np.median(same_median_a), np.median(same_median_b)   # 0.693, 0.694
stats.mannwhitneyu(same_median_a, same_median_b).pvalue   # 2e-12
#
# IDENTICAL MEDIANS, p = 2e-12. The distributions differ in shape, and
# that is what the test detected -- correctly, for its actual null.

# 3. UNEQUAL VARIANCE still breaks it, exactly as it breaks Student's
#    t-test (lesson 5.5):
def error_rate(n1, n2, sd1, sd2, test, trials=10_000, seed=0):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        hits += test(r.normal(0, sd1, n1), r.normal(0, sd2, n2)).pvalue < 0.05
    return hits / trials

mwu = lambda a, b: stats.mannwhitneyu(a, b)
welch = lambda a, b: stats.ttest_ind(a, b, equal_var=False)

error_rate(200, 20, 1.0, 4.0, mwu)      # 0.148
error_rate(200, 20, 1.0, 4.0, welch)    # 0.051
#
# MANN-WHITNEY'S ERROR RATE IS 15% HERE AND WELCH'S IS 5%. The rank
# test is NOT the robust choice under unequal variance -- it has the
# same problem Student's does, and there is no "Welch's Mann-Whitney"
# in common use. Brunner-Munzel is the fix if you need one:
stats.brunnermunzel(rng.normal(0,1,200), rng.normal(0,4,20)).pvalue

# 4. TIES distort the null distribution. scipy applies a correction,
#    but with many ties the test loses power badly:
disc_a = rng.integers(1, 6, 200)        # a 1-5 Likert scale
disc_b = rng.integers(1, 6, 200)
stats.mannwhitneyu(disc_a, disc_b)      # correction applied automatically
#
# With only five distinct values, most pairs are ties and the test is
# working with far less information than the sample size suggests.`},
      { t: "p", text: "**Mann-Whitney's error rate reaches 15% under unequal variances with unequal group sizes, where Welch's stays at 5%.** The rank test is not the robust choice — it inherits the same failure Student's has." }
    ]},

    { t: "h2", n: "02", text: "What ranks cost, and what they buy", id: "power" },

    { t: "viz",
      title: "Ranks discard magnitude and keep order",
      caption: "Every value is replaced by its position. That makes the test immune to any monotonic transform and to arbitrarily extreme outliers — and blind to how far apart the values actually are.",
      svg: `<svg viewBox="0 0 880 220" role="img" aria-label="A number line of values with large gaps, mapped onto evenly spaced ranks">
  <line x1="60" y1="70" x2="820" y2="70" style="stroke:var(--line)" stroke-width="1.5"/>
  <g style="fill:var(--accent)">
    <circle cx="90" cy="70" r="6"/><circle cx="120" cy="70" r="6"/>
    <circle cx="150" cy="70" r="6"/><circle cx="200" cy="70" r="6"/>
    <circle cx="260" cy="70" r="6"/><circle cx="790" cy="70" r="6"/>
  </g>
  <text x="70" y="50" class="s-sub" style="fill:var(--ink-3)">raw values</text>
  <text x="742" y="50" class="s-sub" style="fill:var(--crit)">an outlier</text>

  <g style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 3">
    <line x1="90" y1="80" x2="150" y2="150"/><line x1="120" y1="80" x2="230" y2="150"/>
    <line x1="150" y1="80" x2="310" y2="150"/><line x1="200" y1="80" x2="390" y2="150"/>
    <line x1="260" y1="80" x2="470" y2="150"/><line x1="790" y1="80" x2="550" y2="150"/>
  </g>

  <line x1="60" y1="160" x2="820" y2="160" style="stroke:var(--line)" stroke-width="1.5"/>
  <g style="fill:var(--good)">
    <circle cx="150" cy="160" r="6"/><circle cx="230" cy="160" r="6"/>
    <circle cx="310" cy="160" r="6"/><circle cx="390" cy="160" r="6"/>
    <circle cx="470" cy="160" r="6"/><circle cx="550" cy="160" r="6"/>
  </g>
  <text x="140" y="186" class="s-sub" style="fill:var(--ink-3)">1</text>
  <text x="220" y="186" class="s-sub" style="fill:var(--ink-3)">2</text>
  <text x="300" y="186" class="s-sub" style="fill:var(--ink-3)">3</text>
  <text x="380" y="186" class="s-sub" style="fill:var(--ink-3)">4</text>
  <text x="460" y="186" class="s-sub" style="fill:var(--ink-3)">5</text>
  <text x="540" y="186" class="s-sub" style="fill:var(--good)">6</text>
  <text x="600" y="166" class="s-sub" style="fill:var(--good)">the outlier is just "the largest"</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measure the trade rather than quoting it", code: `
def power_comparison(sampler_a, sampler_b, trials=8000, seed=0):
    r = np.random.default_rng(seed)
    t_hits = mw_hits = 0
    for _ in range(trials):
        a, b = sampler_a(r), sampler_b(r)
        t_hits += stats.ttest_ind(a, b, equal_var=False).pvalue < 0.05
        mw_hits += stats.mannwhitneyu(a, b).pvalue < 0.05
    return t_hits/trials, mw_hits/trials

n = 40

# NORMAL DATA -- the t-test's home ground.
t_p, mw_p = power_comparison(
    lambda r: r.normal(0, 1, n), lambda r: r.normal(0.6, 1, n))
t_p, mw_p                              # 0.735, 0.712
mw_p / t_p                             # 0.969
#
# MANN-WHITNEY RETAINS 96.9% OF THE POWER on perfectly normal data.
# The asymptotic figure is 3/pi = 95.5%, and that is the entire cost.
3/np.pi                                # 0.9549

# HEAVY-TAILED DATA -- where ranks earn their keep.
t_p, mw_p = power_comparison(
    lambda r: r.standard_t(2, n), lambda r: r.standard_t(2, n) + 0.6)
t_p, mw_p                              # 0.399, 0.607
mw_p / t_p                             # 1.52
#
# 52% MORE POWER on t-distributed data with 2 degrees of freedom. The
# t-test's variance estimate is destroyed by the tails; ranks are not.

# CONTAMINATED DATA -- one bad reading in a hundred:
def contaminated(shift):
    def f(r):
        x = r.normal(shift, 1, n)
        x[r.random(n) < 0.01] = 1000.0
        return x
    return f

t_p, mw_p = power_comparison(contaminated(0.0), contaminated(0.6))
t_p, mw_p                              # 0.112, 0.694
#
# THE t-TEST'S POWER COLLAPSES FROM 74% TO 11% from 1% contamination.
# Mann-Whitney is essentially unaffected.

# THE SUMMARY TABLE:
#
#   DATA                 t-test    Mann-Whitney
#   normal                0.735       0.712     ranks cost 3%
#   heavy-tailed (t2)     0.399       0.607     ranks gain 52%
#   1% contaminated       0.112       0.694     ranks gain 520%
#
# THE ASYMMETRY IS THE ARGUMENT: you risk 3% and you protect against
# a collapse. That is a good trade whenever the tails are uncertain.

# WHAT YOU CANNOT GET BACK: an interpretable effect size in the
# original units. Mann-Whitney gives no confidence interval for a
# difference of means, because it is not estimating one.
#
# THE HODGES-LEHMANN ESTIMATOR fills the gap -- the median of all
# pairwise differences, with a distribution-free interval:
def hodges_lehmann(a, b):
    """A robust location shift with the same breakdown resistance as
    the rank test that accompanies it."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    diffs = (b[:, None] - a[None, :]).ravel()
    return float(np.median(diffs))

hodges_lehmann(rng.normal(0,1,200), rng.normal(0.6,1,200))    # ~0.60
`,
      hl: [17, 26, 39, 58],
      caption: "**Ranks cost 3% of power on normal data and gain 520% under 1% contamination.** You risk a little and insure against a collapse, which is why the trade is usually worth making."
    },

    { t: "h2", n: "03", text: "Choosing between the three options", id: "choosing" },

    { t: "ladder",
      title: "Comparing two groups of skewed, contaminated measurements",
      rungs: [
        { level: "bad", label: "Pick the test after checking normality",
          why: "Conditioning the choice of test on a normality test's outcome invalidates the error rate of whichever branch runs, and the normality test itself fails in the damaging direction at both ends (lesson 5.5).",
          code: `if stats.shapiro(x).pvalue < 0.05:
    stats.mannwhitneyu(x, y)
else:
    stats.ttest_ind(x, y)

# Two tests, one chosen by the other. And they answer different
# questions, so the reported result depends on a coin flip nobody can
# see.` },
        { level: "ok", label: "Decide from the question, before the data",
          why: "The choice is not about distribution shape, it is about what the decision needs. Writing that down in advance makes the test a consequence of the question rather than of the histogram.",
          code: `# THE DECIDING QUESTION:
#
#   "What is the total / average across all users?"
#      -> the MEAN is the estimand. Use Welch, or a permutation test
#         on the mean if the tails are severe.
#
#   "Which experience is better for a typical user?"
#      -> the RANK question. Use Mann-Whitney.
#
#   "Is the whole distribution different?"
#      -> Kolmogorov-Smirnov, or a permutation on a shape statistic.
#
# Revenue is a total question. Latency experienced by a user is a
# typical-member question. They are not interchangeable.` },
        { level: "best", label: "Permute the statistic the decision actually needs",
          why: "A permutation test gives an exact null distribution for any statistic (lesson 5.4), so you never have to pick your estimand to fit an available test. You get the t-test's estimand with the rank test's robustness to distributional assumptions.",
          code: `def robust_compare(a, b, statistic=np.mean, n_perm=20_000, seed=0,
                   alpha=0.05):
    """Permutation test plus a bootstrap interval, for any statistic.

    THE DIVISION OF LABOUR:
      - the permutation gives the p-value, exact under exchangeability
      - the bootstrap gives the interval, since permuting destroys the
        effect and so cannot estimate its size
    """
    r = np.random.default_rng(seed)
    a, b = np.asarray(a, float), np.asarray(b, float)
    n_a = len(a)
    pooled = np.concatenate([a, b])

    observed = statistic(b) - statistic(a)

    null = np.empty(n_perm)
    for i in range(n_perm):
        r.shuffle(pooled)
        null[i] = statistic(pooled[n_a:]) - statistic(pooled[:n_a])
    p = ((np.abs(null) >= abs(observed)).sum() + 1) / (n_perm + 1)

    boots = np.empty(4000)
    for i in range(4000):
        boots[i] = (statistic(r.choice(b, len(b), replace=True)) -
                    statistic(r.choice(a, len(a), replace=True)))
    ci = tuple(np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)]))

    return {"statistic": statistic.__name__, "observed": float(observed),
            "ci": ci, "p": float(p)}

# THE SAME MACHINERY, WHATEVER THE DECISION NEEDS:
robust_compare(control, treatment, np.mean)                   # totals
robust_compare(control, treatment, np.median)                 # typical
robust_compare(control, treatment, lambda v: np.percentile(v, 95))
robust_compare(control, treatment, lambda v: (v > 100).mean())

# TRIMMED MEANS ARE THE UNDERRATED MIDDLE GROUND -- they estimate a
# mean-like quantity with a chosen breakdown point (lesson 4.1):
from scipy.stats import trim_mean
robust_compare(control, treatment, lambda v: trim_mean(v, 0.1))
#
# 10% trimmed: interpretable in the original units, immune to the
# outer 10%, and roughly 95% as efficient as the mean on clean data.

# THE COST: permutation is O(n_perm x n). At n = 10^6 that is slow,
# and the CLT has usually rescued the mean by then anyway -- so the
# method matters most at the sample sizes where it is cheapest.`,
          note: "**Permuting frees the estimand from the test.** You choose the statistic the decision needs, and the framework supplies a valid p-value for it — rather than choosing a statistic because a named test exists for it." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Resolve two tests that point opposite ways",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "An experiment on a marketplace produces contradictory readouts, and the two analysts each want to ship the opposite decision." },
        { t: "code", lang: "python", numbered: false, title: "the readouts", code: `
# Metric: revenue per session, in pounds.
#
# ANALYST 1:  "t-test, p = 0.004. Treatment is +£1.12 per session.
#              Ship it."
# ANALYST 2:  "Mann-Whitney, p = 0.0001. Control wins 56% of pairwise
#              comparisons. Do not ship."
#
# Both used the same data: 48,000 sessions per arm.
#   control:   mean £8.40,  median £3.20,  p99 £180
#   treatment: mean £9.52,  median £2.60,  p99 £340
#   sessions with zero revenue: control 61%, treatment 66%`},
        { t: "p", text: "Explain how both can be right, and give the decision." }
      ],
      requirements: [
        "Explain the mechanism producing the disagreement.",
        "Say what each test's null is here, precisely.",
        "Say which estimand the business decision needs.",
        "Decompose the metric to locate the effect.",
        "Give a recommendation with its risks.",
        "Include tests."
      ],
      hint: "The zero-revenue fraction moved by 5 percentage points, and the p99 nearly doubled. Those are two different things happening at once.",
      solution: {
        lang: "python",
        title: "resolve.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
N = 48_000

# Reconstruct data matching the reported summaries.
def make(zero_frac, tail_scale, n=N, seed=0):
    r = np.random.default_rng(seed)
    x = np.zeros(n)
    paying = r.random(n) >= zero_frac
    x[paying] = r.lognormal(np.log(8.0), tail_scale, paying.sum())
    return x

control = make(0.61, 1.35, seed=1)
treatment = make(0.66, 1.75, seed=2)


# =========================================================================
# THE MECHANISM: TWO EFFECTS IN OPPOSITE DIRECTIONS
# =========================================================================
#
# The treatment did two things at once, and each test sees one of them.

for name, v in (("control", control), ("treatment", treatment)):
    print(f"{name:10s} zero {np.mean(v==0):5.1%}  mean {v.mean():6.2f}  "
          f"median {np.median(v):5.2f}  "
          f"p99 {np.percentile(v, 99):7.2f}  "
          f"paying mean {v[v>0].mean():6.2f}")

# control    zero 61.0%  mean   8.40  median  3.20  p99  180.0  paying mean 21.5
# treatment  zero 66.0%  mean   9.52  median  2.60  p99  340.0  paying mean 28.0
#
# EFFECT 1 -- FEWER PEOPLE BUY. The zero fraction rose 5pp, so 2,400
# fewer sessions per 48,000 convert at all.
#
# EFFECT 2 -- THOSE WHO DO BUY, BUY MUCH MORE. The paying mean rose
# 30% and the p99 nearly doubled.
#
# THE MEAN IS DOMINATED BY EFFECT 2 (a few large purchases move a
# total a long way). THE RANKS ARE DOMINATED BY EFFECT 1 (5pp more
# sessions at exactly zero, which lose every pairwise comparison
# against any positive value).
#
# BOTH TESTS ARE CORRECT. They are measuring different halves of a
# genuine two-part change.


# =========================================================================
# WHAT EACH NULL SAYS, PRECISELY
# =========================================================================
#
# t-TEST NULL: E[revenue | treatment] = E[revenue | control].
#   Rejected. The treatment's expected revenue per session is higher.
#   This is a statement about TOTALS: 48,000 sessions x £1.12.
#
# MANN-WHITNEY NULL: P(treatment > control) = 0.5 for a random pair.
#   Rejected in the other direction. A randomly chosen treatment
#   session is LESS likely to beat a randomly chosen control session.
#   This is a statement about a TYPICAL SESSION.
#
# NEITHER IS "MORE ROBUST" OR "MORE CORRECT". They estimate different
# functionals of the same distributions, and those functionals moved
# in opposite directions.

def prob_superiority(a, b):
    r = np.random.default_rng(0)
    ia, ib = r.integers(0, len(a), 400_000), r.integers(0, len(b), 400_000)
    return float((b[ib] > a[ia]).mean() + 0.5*(b[ib] == a[ia]).mean())

prob_superiority(control, treatment)          # ~0.44
control.mean(), treatment.mean()              # 8.40, 9.52


# =========================================================================
# WHICH ESTIMAND THE DECISION NEEDS
# =========================================================================
#
# THE BUSINESS QUESTION IS REVENUE, AND REVENUE IS A TOTAL. Total
# revenue is exactly n x mean, so the mean is the estimand -- there is
# no arguing about it:
extra_per_session = treatment.mean() - control.mean()
extra_per_session * N                         # ~£53,760 over the test
#
# Annualised at this traffic:
sessions_per_year = N * 2 * 26                # both arms, 26 fortnights
extra_per_session * sessions_per_year         # ~£2.8m
#
# THE RANK TEST CANNOT ANSWER THIS. Mann-Whitney gives no estimate in
# pounds, because it is not estimating a location shift -- it is
# estimating a probability.
#
# SO ANALYST 1 HAS THE RIGHT ESTIMAND FOR THE STATED QUESTION.
# ANALYST 2 HAS FOUND A REAL AND IMPORTANT SIDE EFFECT.


# =========================================================================
# DECOMPOSE, RATHER THAN CHOOSING A SIDE
# =========================================================================
#
# Revenue per session = P(purchase) x E[revenue | purchase]
# (the mixture from lesson 3.2, used as a diagnostic).

def decompose(v):
    p = float((v > 0).mean())
    return {"conversion": p,
            "aov": float(v[v > 0].mean()) if p else 0.0,
            "rps": float(v.mean())}

c, t = decompose(control), decompose(treatment)
c, t
# {'conversion': 0.390, 'aov': 21.54, 'rps': 8.40}
# {'conversion': 0.340, 'aov': 28.00, 'rps': 9.52}

(t["conversion"]/c["conversion"] - 1)         # -12.8% conversion
(t["aov"]/c["aov"] - 1)                       # +30.0% order value
(t["rps"]/c["rps"] - 1)                       # +13.3% revenue per session
#
# THE DECOMPOSITION IS THE ACTUAL FINDING, and neither analyst reported
# it. Conversion fell 12.8%, order value rose 30.0%, and revenue per
# session rose 13.3% because the second effect is larger.
#
# THAT IS A COMPLETELY DIFFERENT CONVERSATION from "ship / do not
# ship". It says the treatment is filtering out low-intent buyers and
# upselling the rest -- which may be a pricing change, a friction
# increase, or a merchandising change.

# CHECK EACH COMPONENT SEPARATELY, with the right test for each:
conv = stats.chi2_contingency([
    [(control > 0).sum(), (control == 0).sum()],
    [(treatment > 0).sum(), (treatment == 0).sum()]])[1]
conv                                           # < 1e-50, conversion is down

aov_p = stats.mannwhitneyu(control[control>0], treatment[treatment>0]).pvalue
aov_p                                          # < 1e-50, AOV is up
#
# BOTH COMPONENTS ARE INDIVIDUALLY SIGNIFICANT AND IN OPPOSITE
# DIRECTIONS. That is the honest readout.


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# SHIP, WITH MONITORING -- but the reasoning is not "the t-test won".
#
# 1. THE PRIMARY METRIC IS REVENUE, and it is up 13.3% (+£2.8m/year at
#    current traffic). That is the stated objective.
#
# 2. THE VARIANCE IS THE RISK. The mean gain rests on the upper tail,
#    which is exactly where an estimate is least stable. Bootstrap it
#    rather than trusting the t-test's interval on skew this severe:
def boot_ci(a, b, stat=np.mean, B=4000, seed=0):
    r = np.random.default_rng(seed)
    d = np.array([stat(r.choice(b, len(b), True)) -
                  stat(r.choice(a, len(a), True)) for _ in range(B)])
    return tuple(np.percentile(d, [2.5, 97.5]))

boot_ci(control, treatment)                    # e.g. (0.31, 1.94)
#
# THE INTERVAL IS WIDE. The lower end is a third of the point
# estimate, so forecast conservatively.
#
# 3. THE 12.8% CONVERSION DROP IS A REAL COST that revenue alone
#    hides. Fewer buyers means a smaller base for retention,
#    reactivation and word of mouth -- effects that do not appear in
#    a two-week revenue metric and compound over quarters.
#
# 4. WHAT WOULD CHANGE THE ANSWER: if lifetime value per customer
#    exceeds roughly 2.3x first-order value, the conversion loss
#    outweighs the AOV gain over a year.
c["conversion"]*1.0 vs t["conversion"]*1.30    # the break-even ratio
break_even = (c["conversion"] / t["conversion"]) / (t["aov"]/c["aov"])
break_even                                     # ~0.88 -- see below
#
# CONCRETELY: at equal repeat rates the treatment wins. If treatment
# buyers repeat LESS (plausible if the mechanism is a price increase
# filtering out bargain hunters), it can lose. THAT IS A MEASUREMENT,
# not a judgement -- run a 90-day cohort readout before full rollout.
#
# 5. WHAT TO REPORT: all three numbers, always. "Revenue +13.3%,
#    conversion -12.8%, AOV +30.0%" is one line and it is the whole
#    finding. Reporting only revenue is how the conversion loss gets
#    discovered a quarter later.


# =========================================================================
# TESTS
# =========================================================================

def test_both_tests_are_correct_in_opposite_directions():
    assert treatment.mean() > control.mean()
    assert prob_superiority(control, treatment) < 0.5


def test_decomposition_locates_the_two_effects():
    c, t = decompose(control), decompose(treatment)

    assert t["conversion"] < c["conversion"] * 0.95      # conversion down
    assert t["aov"] > c["aov"] * 1.2                     # AOV up
    assert t["rps"] > c["rps"]                           # revenue up


def test_mean_is_the_estimand_for_a_total_question():
    """Total revenue is exactly n x mean, so no other statistic
    answers it."""
    total_c = control.sum()
    total_t = treatment.sum()

    assert np.isclose(total_t - total_c, (treatment.mean()-control.mean())*N,
                      rtol=1e-9)


def test_rank_test_gives_no_pounds_estimate():
    """Mann-Whitney's statistic is a probability, not a location."""
    ps = prob_superiority(control, treatment)

    assert 0 <= ps <= 1                       # it is a probability
    # and there is no transformation of it into pounds without
    # assuming a distributional shape.


def test_bootstrap_interval_is_wide_on_skewed_data():
    lo, hi = boot_ci(control, treatment)

    assert lo > 0                             # the effect is real
    assert hi / lo > 3                        # and poorly pinned down


def test_both_components_are_individually_significant():
    conv_p = stats.chi2_contingency([
        [(control > 0).sum(), (control == 0).sum()],
        [(treatment > 0).sum(), (treatment == 0).sum()]])[1]
    aov_p = stats.mannwhitneyu(control[control>0],
                               treatment[treatment>0]).pvalue

    assert conv_p < 0.001 and aov_p < 0.001`,
        notes: [
          { t: "p", text: "**The treatment did two things at once, and each test sees one of them.** The mean is dominated by a 30% rise in order value; the ranks are dominated by 5pp more sessions at exactly zero, which lose every pairwise comparison against any positive value." },
          { t: "callout", kind: "insight", title: "The decomposition is the finding, and neither analyst reported it", body: [
            { t: "p", text: "Revenue per session = `P(purchase) × E[revenue | purchase]`. Conversion fell 12.8%, order value rose 30.0%, and revenue rose 13.3% because the second effect is larger." },
            { t: "p", text: "That is a completely different conversation from \"ship or don't\" — it says the treatment is filtering out low-intent buyers and upselling the rest, which points at a specific mechanism to investigate." }
          ]},
          { t: "p", text: "**Total revenue is exactly `n × mean`, so the mean is the estimand for the stated question** — there is no arguing about it. Mann-Whitney cannot produce a figure in pounds because it estimates a probability, not a location shift." },
          { t: "p", text: "**The bootstrap interval's lower end is a third of the point estimate.** The mean gain rests on the upper tail, which is exactly where an estimate is least stable, so forecast from the lower half." },
          { t: "p", text: "**The conversion drop is a real cost that revenue hides.** Fewer buyers means a smaller base for retention and reactivation — effects invisible in a two-week revenue metric that compound over quarters. A 90-day cohort readout settles it before full rollout." },
          { t: "p", text: "**Report all three numbers, always.** \"Revenue +13.3%, conversion −12.8%, AOV +30.0%\" is one line and the whole finding; reporting only revenue is how the conversion loss gets discovered a quarter later." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team switched from t-tests to Mann-Whitney across their entire experiment platform, on the reasoning that their metrics were skewed and rank tests are more robust." },
      { t: "p", text: "**Their headline metric was revenue per user, which is a total.** The rank test answers \"does a typical user spend more\", and a change that increases revenue by concentrating it on fewer high-value users now read as a regression." },
      { t: "p", text: "Two profitable features were rejected in the following quarter before anyone noticed the estimand had changed. **The switch was framed as a robustness improvement and was actually a redefinition of the objective.**" },
      { t: "p", text: "**Choose the test from what the decision needs, not from the histogram.** If the tails are the problem, a permutation test on the mean gives robustness without changing what is being estimated." }
    ]}
  ],

  takeaways: [
    "**Mann-Whitney tests `P(X > Y) = 0.5`**, not equal means and not equal medians — the median reading needs identically shaped distributions.",
    "**The t-test and Mann-Whitney can disagree in direction and both be right**: one asks about totals, the other about a typical member.",
    "**Non-parametric does not mean assumption-free.** Independence still matters, and unequal variance breaks Mann-Whitney as badly as it breaks Student's.",
    "**Mann-Whitney's error rate reaches 15% under unequal variances with unequal `n`**, where Welch's stays at 5%.",
    "**Ranks cost about 4.5% of power on normal data** — the asymptotic figure is `3/π = 95.5%` efficiency.",
    "**Ranks gain 52% power on heavy-tailed data and 520% under 1% contamination.** You risk a little to insure against a collapse.",
    "**Ranks discard magnitude**, so there is no interpretable effect size in the original units — Hodges-Lehmann fills that gap.",
    "**Many ties destroy a rank test's information**, which matters for Likert scales and other low-cardinality data.",
    "**Choose the test from the question, not the histogram**: totals need the mean, typical experience needs a rank.",
    "**A permutation test frees the estimand from the test** — you get robustness without changing what is estimated.",
    "**A 10% trimmed mean is the underrated middle ground**: original units, a chosen breakdown point, ~95% efficiency.",
    "**Decompose a mixture metric before choosing a test** — conversion and order value can move in opposite directions inside one number."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is Mann-Whitney's null hypothesis?",
        options: [
          "The two groups have equal means",
          "`P(X > Y) = 0.5` — a random member of one group is equally likely to exceed a random member of the other",
          "The two groups have equal medians",
          "The two groups are normally distributed"
        ],
        answer: 1,
        why: "It becomes a statement about medians only under the extra assumption that the distributions have the same shape. Without it, Mann-Whitney can return `p = 2×10⁻¹²` on two samples with identical medians."
      },
      {
        stem: "A t-test says treatment is higher; Mann-Whitney says control wins 95% of pairwise comparisons. Which is wrong?",
        options: [
          "The t-test, since the data is clearly skewed",
          "Neither — one asks which group has the larger total, the other which group's typical member is larger",
          "Mann-Whitney, since it ignores magnitude",
          "Both, if the sample is small"
        ],
        answer: 1,
        why: "This happens when a group has mostly small values and a few enormous ones. Revenue per user is a total question and needs the mean; \"which experience is better for a typical user\" is a pairwise question and needs the rank test."
      },
      {
        stem: "Your data is heavy-tailed. What does switching to Mann-Whitney cost and buy?",
        options: [
          "It costs nothing and buys robustness",
          "It costs about 4.5% of power on normal data and can gain 52% on `t₂` data — but it changes the estimand from a mean to a probability",
          "It costs half the power",
          "It buys nothing, since ranks discard information"
        ],
        answer: 1,
        why: "The power asymmetry is a good trade; the estimand change often is not. A permutation test on the mean gives the robustness without redefining what is being estimated."
      },
      {
        stem: "Two hundred control observations with sd 1, twenty treatment with sd 4. Which test is safe?",
        options: [
          "Mann-Whitney, because it is non-parametric",
          "Welch's t-test — Mann-Whitney's error rate reaches 15% here, while Welch stays at 5%",
          "Student's t-test",
          "Either rank test is fine"
        ],
        answer: 1,
        why: "Non-parametric does not mean assumption-free: Mann-Whitney inherits the same unequal-variance failure Student's has, and there is no widely used Welch equivalent. Brunner-Munzel is the rank-based fix if one is needed."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use a non-parametric test?",
        strong: "When the question is genuinely about ranks — which experience is better for a typical user — or when the tails are severe enough that a mean is unstable. Not simply because a normality test failed, since Mann-Whitney answers a different question from a t-test.",
        answer: [
          { t: "p", text: "Leading with the estimand rather than with distribution shape is what distinguishes this from the textbook answer." },
          { t: "p", text: "Quantifying the trade — about 4.5% of power lost on normal data, large gains under contamination — makes it a decision rather than a preference." }
        ]
      },
      {
        level: "advanced",
        q: "Your t-test and Mann-Whitney disagree. What do you do?",
        strong: "Work out which estimand the decision needs. Disagreement usually means the distributions differ in shape, not just location — a few large values moving the mean while the bulk moves the other way. I would decompose the metric before choosing a side.",
        answer: [
          { t: "p", text: "Treating disagreement as information rather than a problem is the right instinct, and it usually locates a real two-part effect." },
          { t: "p", text: "Naming the decomposition — conversion times order value, say — turns it into a specific next step." }
        ]
      },
      {
        level: "advanced",
        q: "Is a rank test the robust choice for skewed data with unequal group sizes?",
        strong: "Not necessarily. Mann-Whitney is robust to heavy tails but inherits Student's unequal-variance failure — its error rate can reach 15% where Welch stays at 5%. For robustness without changing the estimand, I would permute a trimmed mean instead.",
        answer: [
          { t: "p", text: "Correcting the common belief that non-parametric means assumption-free is the substance here." },
          { t: "p", text: "Offering the permutation-plus-trimmed-mean route shows you can get both properties rather than trading one for the other." }
        ]
      }
    ]
  }
});

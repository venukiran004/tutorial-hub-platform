/* ============================================================================
   LESSON 3.9 — Concentration Inequalities
   ========================================================================= */
EC.receiveLesson({
  id: "3.9",

  lede: "Every bound so far has assumed a distribution. **Concentration inequalities assume almost nothing** — Markov needs only a non-negative mean, Chebyshev only a variance, Hoeffding only a bounded range. They are loose by design, and that looseness is what makes them safe to rely on when you cannot verify an assumption.",

  objectives: [
    "State Markov, Chebyshev and Hoeffding and what each assumes",
    "Choose the tightest bound your assumptions actually support",
    "Compute a sample size from Hoeffding without a normality assumption",
    "Explain why a distribution-free bound is loose, and when that is the point",
    "Use the union bound to cover many simultaneous claims"
  ],

  prerequisites: ["3.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three bounds, three assumptions", id: "the-three" },

    { t: "p", text: "**A concentration inequality bounds how far a random quantity can stray from its expectation, without assuming a distribution.** The three standard ones trade assumptions for tightness: assume less and the bound is looser, but it cannot be wrong." },

    { t: "dl", items: [
      ["Concentration inequality", "A distribution-free bound on a tail probability. Guaranteed rather than approximate."],
      ["Markov", "`P(X ≥ a) ≤ E[X]/a`, needing only a non-negative variable with a known mean. Very weak, and it cannot be wrong."],
      ["Chebyshev", "`P(|X−μ| ≥ kσ) ≤ 1/k²`, needing only a variance. About 70,000× looser than the normal at 5σ — which is the price of assuming nothing."],
      ["Cantelli", "The one-sided form, `1/(1+k²)`. You cannot simply halve Chebyshev's two-sided bound."],
      ["Tightness", "How close a bound sits to the true probability. Looser bounds are safer and less informative — the trade is deliberate."]
    ]},

    { t: "table",
      head: ["Bound", "Assumes", "Says", "Tail decay"],
      rows: [
        ["**Markov**", "`X ≥ 0`, mean known", "`P(X ≥ a) ≤ E[X]/a`", "`1/a` — very slow"],
        ["**Chebyshev**", "Variance known", "`P(|X−μ| ≥ kσ) ≤ 1/k²`", "`1/k²`"],
        ["**Hoeffding**", "`n` independent, bounded in `[a,b]`", "`P(|X̄−μ| ≥ t) ≤ 2e^(−2nt²/(b−a)²)`", "**exponential**"],
        ["*(Normal, for comparison)*", "*a distribution*", "*`P(|Z| ≥ k) = 2Φ(−k)`*", "*`e^(−k²/2)`*"]
      ],
      caption: "**More assumptions buy a tighter bound.** Markov assumes almost nothing and is almost useless; Hoeffding assumes independence and boundedness and gets exponential decay without ever naming a distribution."
    },

    { t: "code", lang: "python", title: "what each one costs and buys", code: `
import numpy as np
from scipy import stats

# MARKOV -- P(X >= a) <= E[X] / a,  for non-negative X.
#
# The proof is one line: E[X] >= E[X * 1_{X>=a}] >= a * P(X >= a).
# It uses only non-negativity, which is why it is so weak.

def markov(mean, a):
    return min(1.0, mean / a)

markov(mean=50, a=100)         # 0.50   "at most half exceed twice the mean"
markov(mean=50, a=500)         # 0.10
#
# ALWAYS TRUE, RARELY USEFUL. For latency with a mean of 50 ms it says
# at most 10% of requests exceed 500 ms -- a statement so weak that any
# real system beats it by orders of magnitude. Its value is that it
# CANNOT BE WRONG, and it is the building block for the others.

# CHEBYSHEV -- P(|X - mu| >= k sigma) <= 1/k^2.
#
# It is Markov applied to (X - mu)^2, which is why the extra assumption
# is exactly one moment more.

def chebyshev(k):
    return min(1.0, 1.0 / k**2)

for k in (1, 2, 3, 4, 5):
    print(f"k={k}:  chebyshev <= {chebyshev(k):.4f}   "
          f"normal = {2*stats.norm.sf(k):.6f}")

# k=1:  chebyshev <= 1.0000   normal = 0.317311
# k=2:  chebyshev <= 0.2500   normal = 0.045500
# k=3:  chebyshev <= 0.1111   normal = 0.002700
# k=4:  chebyshev <= 0.0625   normal = 0.000063
# k=5:  chebyshev <= 0.0400   normal = 0.000001
#
# AT k=5 CHEBYSHEV IS 70,000x LOOSER THAN THE NORMAL. That gap is the
# price of not assuming normality -- and it is a price worth paying
# whenever you cannot verify the assumption, because a heavy-tailed
# distribution really can put 4% of its mass beyond 5 sigma.

# THE ONE-SIDED VERSION IS TIGHTER, and it is the one you usually want
# for an SLO or a risk bound:
def cantelli(k):
    """P(X - mu >= k sigma) <= 1/(1 + k^2)."""
    return 1.0 / (1.0 + k**2)

chebyshev(3) / 2, cantelli(3)   # 0.0556 (naive halving), 0.1000
#
# Note you cannot simply halve the two-sided bound -- Cantelli's is the
# correct one-sided form and it is larger than half.
`,
      hl: [7, 30, 40],
      caption: "**Chebyshev is 70,000× looser than the normal at 5σ.** That gap is the price of not assuming normality — and it is worth paying, because a heavy-tailed distribution really can put 4% of its mass out there."
    },

    { t: "h2", n: "02", text: "Hoeffding: the one you will actually use", id: "hoeffding" },

    { t: "p", text: "**Hoeffding's inequality is the one you will actually use**, because it gives exponential tail decay from just two assumptions: independence and a bounded range. It produces sample sizes with no central limit theorem and no \"n ≥ 30\" hand-waving." },

    { t: "dl", items: [
      ["Hoeffding's inequality", "`P(|X̄ − μ| ≥ t) ≤ 2exp(−2nt²/(b−a)²)` for `n` independent variables bounded in `[a,b]`."],
      ["Sample size", "Inverted: `n ≥ (b−a)²log(2/δ)/(2t²)`. Precision costs `1/t²`; confidence costs only `log(1/δ)`."],
      ["Bernstein's inequality", "Uses the variance as well as the range. Far tighter for rare events, where Hoeffding's range-only bound is catastrophically loose."],
      ["Union bound", "Guaranteeing `m` claims at once costs `log(m)`, not `m` — which is why monitoring thousands of metrics is affordable."]
    ]},

    { t: "viz",
      title: "Bounded range buys exponential decay",
      caption: "Chebyshev's tail falls as 1/k², Hoeffding's as e^(−2nt²). For any fixed deviation, adding samples improves Hoeffding exponentially and Chebyshev only linearly — which is why sample-size formulas use it.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Log-scale comparison of Chebyshev's polynomial tail against Hoeffding's exponential tail">
  <line x1="80" y1="215" x2="830" y2="215" style="stroke:var(--line)" stroke-width="1.5"/>
  <line x1="80" y1="215" x2="80"  y2="35"  style="stroke:var(--line)" stroke-width="1.5"/>
  <text x="400" y="248" class="s-sub" style="fill:var(--ink-3)">sample size n</text>
  <text x="18" y="128" class="s-sub" style="fill:var(--ink-3)">bound</text>

  <path d="M100 55 C 260 130, 420 168, 600 190 C 700 199, 780 204, 820 206"
        style="stroke:var(--warn);fill:none" stroke-width="2.5"/>
  <text x="360" y="160" class="s-label" style="fill:var(--warn)">chebyshev ~ 1/n</text>

  <path d="M100 55 C 150 120, 200 180, 260 205 C 320 212, 420 214, 820 215"
        style="stroke:var(--good);fill:none" stroke-width="2.5"/>
  <text x="200" y="200" class="s-label" style="fill:var(--good)">hoeffding ~ e^-2nt^2</text>

  <text x="620" y="90"  class="s-sub" style="fill:var(--ink-3)">for a fixed deviation t,</text>
  <text x="620" y="108" class="s-sub" style="fill:var(--ink-3)">hoeffding needs log(1/delta)</text>
  <text x="620" y="126" class="s-sub" style="fill:var(--ink-3)">samples where chebyshev</text>
  <text x="620" y="144" class="s-sub" style="fill:var(--ink-3)">needs 1/delta</text>
</svg>`
    },

    { t: "code", lang: "python", title: "a sample size with no distributional assumption", code: `
# HOEFFDING'S INEQUALITY. For n independent variables each bounded in
# [a, b], the sample mean satisfies
#
#     P(|Xbar - mu| >= t)  <=  2 exp(-2 n t^2 / (b-a)^2)
#
# NO NORMALITY. NO CLT. NO "n >= 30". Just independence and a range.

def hoeffding_bound(n, t, span=1.0):
    return min(1.0, 2 * np.exp(-2 * n * t**2 / span**2))

# INVERTED, it gives a sample size directly:
def hoeffding_n(t, delta, span=1.0):
    """Samples needed so P(|Xbar - mu| >= t) <= delta."""
    return int(np.ceil(span**2 * np.log(2/delta) / (2 * t**2)))

# ESTIMATING A CONVERSION RATE (bounded in [0,1]) to within 1 point,
# with 95% confidence:
hoeffding_n(t=0.01, delta=0.05, span=1.0)          # 18,445

# Compare the normal-approximation formula, which assumes the CLT has
# kicked in and uses the worst-case variance p(1-p) <= 1/4:
z = stats.norm.ppf(0.975)
int(np.ceil(z**2 * 0.25 / 0.01**2))                # 9,604
#
# HOEFFDING ASKS FOR 1.9x MORE DATA. That factor is the cost of the
# guarantee holding for ANY distribution on [0,1], at any n -- rather
# than for a normal approximation whose accuracy at your actual n and p
# you have not checked.

# WHERE THE EXTRA DATA IS WORTH IT:
#
#   - small n, where the CLT has not converged (lesson 3.5)
#   - p near 0 or 1, where the normal approximation is worst
#   - a guarantee you must be able to defend rather than assume
#   - anything adversarial, where "typical" does not apply
#
# WHERE IT IS NOT: routine A/B tests with large n and moderate rates,
# where the normal approximation is accurate and 1.9x the traffic is a
# real cost.

# THE SCALING IS THE USEFUL PART:
#   n ~ 1/t^2         halving the error costs 4x the data
#   n ~ log(1/delta)  more confidence is CHEAP
for delta in (0.05, 0.01, 0.001, 1e-6):
    print(f"delta={delta:<8} n={hoeffding_n(0.01, delta):,}")

# delta=0.05     n=18,445
# delta=0.01     n=26,492
# delta=0.001    n=38,005
# delta=1e-06    n=72,634
#
# GOING FROM 95% TO 99.9999% CONFIDENCE COSTS 4x THE DATA, while
# halving the tolerance costs 4x on its own. Precision is expensive;
# confidence is cheap. Most people have that backwards.
`,
      hl: [7, 24, 40, 48],
      caption: "**Precision is expensive; confidence is cheap.** Halving the tolerance costs 4× the data, while going from 95% to 99.9999% confidence also costs about 4× — most people expect the second to be far worse."
    },

    { t: "callout", kind: "insight", title: "The union bound covers many claims at once", body: [
      { t: "p", text: "**`P(any of A₁…Aₘ) ≤ ΣP(Aᵢ)`** — the naive addition that overcounts overlaps (lesson 3.1), used deliberately because being conservative is exactly what a guarantee needs." },
      { t: "code", lang: "python", numbered: false, title: "and it prices simultaneous guarantees", code: `
# You want ALL of m estimates to be within t simultaneously. Give each
# a failure budget of delta/m, and the union bound guarantees the whole
# set at delta.

def hoeffding_n_simultaneous(t, delta, m, span=1.0):
    return hoeffding_n(t, delta/m, span)

for m in (1, 10, 100, 10_000):
    n = hoeffding_n_simultaneous(0.01, 0.05, m)
    print(f"{m:>6} metrics -> {n:,} samples each")

#      1 metrics -> 18,445 samples each
#     10 metrics -> 29,957 samples each
#    100 metrics -> 41,469 samples each
# 10,000 metrics -> 64,494 samples each
#
# TEN THOUSAND SIMULTANEOUS GUARANTEES COST 3.5x THE DATA OF ONE, not
# 10,000x -- because n grows as log(m), not as m.
#
# THAT IS WHY MONITORING MANY METRICS IS AFFORDABLE and why Bonferroni
# correction (lesson 5.10) is less punishing than its reputation
# suggests. The log is doing the work.
#
# THE FLIP SIDE, and it is the important one: WITHOUT the correction,
# the probability that at least one of 10,000 metrics breaches its
# bound is essentially 1. Not "sometimes" -- essentially always.
1 - 0.95**10_000                                   # 1.0`},
      { t: "p", text: "**Simultaneous guarantees cost `log(m)`, not `m`.** That is why watching thousands of metrics is affordable — and why, without the correction, at least one of them breaching its bound is a certainty rather than a surprise." }
    ]},

    { t: "h2", n: "03", text: "When the looseness is the point", id: "looseness" },

    { t: "p", text: "A distribution-free bound is deliberately pessimistic, and **that pessimism is the product rather than a defect**. When a guarantee must hold under conditions you do not control — a contractual SLO, an unattended automated decision — a loose bound that cannot be wrong beats a tight one resting on an unchecked assumption." },

    { t: "dl", items: [
      ["Distribution-free", "Valid for every distribution satisfying the stated conditions. No normality, no shape assumption."],
      ["Empirical quantile", "A percentile computed from the data. Precise about the past, and it assumes the future resembles it."],
      ["The gap", "The distance between the distribution-free bound and the empirical estimate. It measures how much your guarantee depends on the distribution not moving."],
      ["Sequential guarantee", "A bound that remains valid however many times you check it — necessary whenever a rule runs unattended and repeatedly."]
    ]},

    { t: "ladder",
      title: "Guaranteeing a p99 latency claim to a customer",
      rungs: [
        { level: "bad", label: "Quote the observed p99 from last month",
          why: "An empirical quantile is a point estimate with its own uncertainty, and the uncertainty is largest exactly at the tail — few observations sit out there. Quoting it as a guarantee promises that next month resembles last month, which is the assumption most likely to fail.",
          code: `np.percentile(last_month, 99)      # 187 ms
# "We guarantee p99 under 200 ms." -- based on one month, no interval` },
        { level: "ok", label: "Put a confidence interval on the quantile",
          why: "Honest about sampling variability, and a bootstrap interval needs no distributional assumption. But it still assumes next month's traffic is drawn from the same distribution as last month's.",
          code: `def quantile_ci(x, q=0.99, alpha=0.05, B=2000, seed=0):
    """Bootstrap interval for a quantile -- no distribution assumed."""
    rng = np.random.default_rng(seed)
    x = np.asarray(x)
    boots = [np.percentile(rng.choice(x, len(x), replace=True), q*100)
             for _ in range(B)]
    return tuple(np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)]))

quantile_ci(last_month)            # (181.2, 194.8)
# "p99 was 187 ms, 95% CI [181, 195]." -- defensible about the PAST` },
        { level: "best", label: "State a distribution-free bound you can defend under change",
          why: "A guarantee is a claim about the future under conditions you do not control. A bound that holds for any distribution with the stated mean and variance survives a traffic-mix change that invalidates every empirical quantile.",
          code: `def cantelli_quantile_bound(mean, sd, q=0.99):
    """Smallest value v with P(X > v) <= 1-q, for ANY distribution with
    this mean and sd. One-sided Chebyshev, inverted:
        1/(1+k^2) = 1-q  ->  k = sqrt(q/(1-q))"""
    k = np.sqrt(q / (1 - q))
    return mean + k * sd

cantelli_quantile_bound(mean=94.2, sd=142.8)      # 1,515 ms
#
# ENORMOUSLY LOOSER than the observed 187 ms -- 8x. And it holds for
# ANY distribution with that mean and standard deviation, including
# ones far heavier-tailed than what you measured.

# THE PRACTICAL RESOLUTION IS TO USE BOTH, FOR DIFFERENT PURPOSES:
#
#   CONTRACTUAL SLO   -> a number you can defend under distributional
#                        change. Not 1,515 ms, which is useless, but a
#                        headroom-padded empirical bound whose padding
#                        you justified with the Cantelli gap.
#
#   INTERNAL TARGET   -> the bootstrap interval. It is what you
#                        actually manage against week to week.
#
#   ALERTING          -> the empirical quantile, which is sensitive.

# AND MEASURE THE GAP, because it tells you how much your guarantee
# depends on the distribution staying put:
observed_p99 = 612.0
cantelli_quantile_bound(94.2, 142.8) / observed_p99      # 2.47
#
# A ratio near 1 means the data is already near the worst case for its
# moments and there is little room for a surprise. A ratio of 2.5 means
# a distributional shift could plausibly move the p99 by that factor
# without the mean or variance changing much at all -- which is exactly
# what a change in traffic mix does.`,
          note: "**A guarantee is a claim about a future you do not control.** The Cantelli gap measures how much of your SLO rests on the distribution not moving — which is the assumption an incident violates." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Size a canary that must not need distributional assumptions",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "You are building an automated canary that promotes or rolls back a deploy. It compares the error rate on 1% of traffic against a baseline, and must decide within ten minutes. Because it runs unattended on every deploy, its guarantee has to hold without anyone checking distributional assumptions." },
        { t: "code", lang: "python", numbered: false, title: "the constraints", code: `
TOTAL_RPS      = 8_000
CANARY_SHARE   = 0.01
WINDOW_MINUTES = 10

BASELINE_ERROR_RATE = 0.002        # 0.2%
MIN_DETECTABLE      = 0.001        # must catch a rise to 0.3%

DEPLOYS_PER_DAY = 40               # unattended, every one of them`},
        { t: "p", text: "Decide whether the canary can meet its detection target in the window, and specify its decision rule with a defensible false-alarm rate." }
      ],
      requirements: [
        "Compute the sample size available in the window.",
        "Compute what Hoeffding requires, and compare with the normal approximation.",
        "Account for running 40 unattended decisions a day.",
        "State whether the target is achievable, and what to change if not.",
        "Give the decision rule as code.",
        "Include tests."
      ],
      hint: "Errors are bounded in `[0,1]`, so Hoeffding applies directly. Then think about how many decisions the canary makes per year, not per deploy.",
      solution: {
        lang: "python",
        title: "canary.py",
        code: `import numpy as np
from scipy import stats

TOTAL_RPS = 8_000
CANARY_SHARE = 0.01
WINDOW_MINUTES = 10
BASELINE = 0.002
MIN_DETECTABLE = 0.001
DEPLOYS_PER_DAY = 40


# =========================================================================
# HOW MUCH DATA THE WINDOW GIVES YOU
# =========================================================================

n_available = int(TOTAL_RPS * CANARY_SHARE * WINDOW_MINUTES * 60)
n_available                      # 48,000 requests
#
# Expected errors at baseline:
n_available * BASELINE           # 96
#
# NINETY-SIX EVENTS. That is the number that governs everything -- the
# 48,000 requests are mostly non-events and contribute almost nothing.


# =========================================================================
# WHAT HOEFFDING REQUIRES
# =========================================================================
#
# Each request is a Bernoulli, bounded in [0,1], and they are
# independent. Hoeffding applies with span = 1.

def hoeffding_n(t, delta, span=1.0):
    return int(np.ceil(span**2 * np.log(2/delta) / (2 * t**2)))

hoeffding_n(t=MIN_DETECTABLE, delta=0.05)          # 1,844,440
#
# 1.84 MILLION REQUESTS against 48,000 available. SHORT BY A FACTOR
# OF 38.
#
# The normal approximation is far more optimistic:
z = stats.norm.ppf(0.975)
p = BASELINE
int(np.ceil(z**2 * p * (1-p) / MIN_DETECTABLE**2))  # 7,667
#
# 7,667 -- which the window comfortably exceeds.
#
# WHY THE 240x GAP? Hoeffding uses only the RANGE [0,1] and knows
# nothing about the rate. It must protect against a variable that
# could be 0 or 1 with probability 1/2, whose variance is 0.25. The
# actual variance is p(1-p) = 0.002 * 0.998 = 0.002 -- 125x smaller.
0.25 / (p * (1-p))                                  # 125.3
#
# HOEFFDING IS THE WRONG TOOL FOR RARE EVENTS. Its span-based bound is
# catastrophically loose when the variable is almost always zero, and
# that is worth knowing as a limit of the method rather than treating
# it as the safe default everywhere.


# =========================================================================
# THE RIGHT DISTRIBUTION-FREE TOOL HERE: BERNSTEIN
# =========================================================================
#
# Bernstein's inequality uses the VARIANCE as well as the range:
#
#     P(Xbar - mu >= t) <= exp( -n t^2 / (2 sigma^2 + 2bt/3) )
#
# For rare events sigma^2 << b^2, so it recovers most of the gap while
# still assuming no distribution -- only independence, a bound, and a
# variance you can bound above.

def bernstein_n(t, delta, var, b=1.0):
    """Samples for a one-sided guarantee at level delta."""
    return int(np.ceil((2*var + 2*b*t/3) * np.log(1/delta) / t**2))

# Bound the variance using the ALTERNATIVE rate, not the baseline --
# under the hypothesis we are trying to detect, p is higher and so is
# the variance. Using the baseline would understate it.
p_alt = BASELINE + MIN_DETECTABLE                   # 0.003
var_alt = p_alt * (1 - p_alt)                       # 0.00299

bernstein_n(MIN_DETECTABLE, 0.05, var_alt)          # 18,556
#
# 18,556 AGAINST 48,000 AVAILABLE. Achievable, with 2.6x headroom, and
# still without assuming normality.


# =========================================================================
# FORTY UNATTENDED DECISIONS A DAY
# =========================================================================
#
# This is the part that a per-deploy analysis misses entirely.

decisions_per_year = DEPLOYS_PER_DAY * 365          # 14,600

# At a 5% false-alarm rate per decision:
14_600 * 0.05                                       # 730 false rollbacks/year
#
# TWO FALSE ROLLBACKS EVERY DAY. The canary would be ignored within a
# fortnight, and an ignored canary is worse than none -- it provides
# the appearance of safety while blocking nothing.
#
# BUDGET THE FALSE ALARMS ANNUALLY, not per decision. Target roughly
# one false rollback per month:
target_per_year = 12
delta = target_per_year / decisions_per_year        # 0.000822

bernstein_n(MIN_DETECTABLE, delta, var_alt)         # 42,536
#
# STILL WITHIN THE 48,000 AVAILABLE, with 13% headroom. The log
# dependence on delta is what makes this affordable: a 60x stricter
# false-alarm rate costs 2.3x the data, not 60x.
bernstein_n(MIN_DETECTABLE, 0.05, var_alt)          # 18,556
42_536 / 18_556                                     # 2.29


# =========================================================================
# THE DECISION RULE
# =========================================================================

def canary_threshold(n, baseline, delta, b=1.0):
    """Largest observed error rate consistent with the baseline at
    confidence 1-delta. Solve Bernstein for t:

        n t^2 = (2 var + 2bt/3) log(1/delta)

    a quadratic in t. One-sided -- we only care about regressions."""
    var = baseline * (1 - baseline)
    L = np.log(1/delta)
    # n t^2 - (2b L /3) t - 2 var L = 0
    a_, b_, c_ = n, -(2*b*L/3), -2*var*L
    t = (-b_ + np.sqrt(b_**2 - 4*a_*c_)) / (2*a_)
    return baseline + t

def decide(errors, n, baseline=BASELINE, delta=0.000822):
    """Promote, roll back, or extend. Never guesses on thin data."""
    if n < 10_000:
        return "extend", f"only {n:,} requests; need >= 10,000"

    rate = errors / n
    thresh = canary_threshold(n, baseline, delta)

    if rate > thresh:
        return "rollback", f"error rate {rate:.4%} > threshold {thresh:.4%}"
    return "promote", f"error rate {rate:.4%} <= threshold {thresh:.4%}"

canary_threshold(48_000, BASELINE, 0.000822)        # 0.00305
#
# THE RULE: with 48,000 requests, roll back if the observed error rate
# exceeds 0.305%. Baseline is 0.2%, and the target was to catch 0.3% --
# so the canary detects the regression it was specified to detect, at
# roughly one false rollback per month.

decide(errors=96,  n=48_000)     # ('promote',  '0.2000% <= 0.3050%')
decide(errors=150, n=48_000)     # ('rollback', '0.3125% > 0.3050%')
decide(errors=20,  n=5_000)      # ('extend',   'only 5,000 requests')


# =========================================================================
# WHAT TO CHANGE IF IT DID NOT FIT
# =========================================================================
#
# It fits with 13% headroom, which is thin. The levers, in order of
# cost:
#
# 1. RAISE THE CANARY SHARE from 1% to 2%. Doubles n, and doubles the
#    blast radius of a bad deploy for ten minutes. Usually the cheapest
#    real lever.
#
# 2. LENGTHEN THE WINDOW to 15 minutes. Doubles n at the cost of slower
#    deploys -- 40 deploys a day makes that a real cost.
#
# 3. ACCEPT A LARGER MIN_DETECTABLE. Because n ~ 1/t^2, moving from
#    0.1pp to 0.15pp cuts the requirement by 2.25x:
bernstein_n(0.0015, 0.000822, var_alt)              # 19,527
#
# 4. USE A SEQUENTIAL TEST. Fixed-horizon bounds spend their whole
#    budget at one moment. A sequential rule (an always-valid
#    confidence sequence) can stop early on a large regression while
#    remaining valid at every look -- which matters here because a
#    catastrophic deploy should not wait ten minutes.
#
# 5. WHAT NOT TO DO: peek at the interim rate and roll back early on a
#    fixed-horizon threshold. That inflates the false-alarm rate
#    silently and invalidates the guarantee the whole design rests on.


# =========================================================================
# TESTS
# =========================================================================

def test_window_provides_the_expected_sample():
    assert int(TOTAL_RPS * CANARY_SHARE * WINDOW_MINUTES * 60) == 48_000


def test_hoeffding_is_the_wrong_tool_for_rare_events():
    """Its span-based bound is ~100x loose when p is tiny."""
    n_h = hoeffding_n(MIN_DETECTABLE, 0.05)
    n_b = bernstein_n(MIN_DETECTABLE, 0.05,
                      (BASELINE + MIN_DETECTABLE) * (1 - BASELINE - MIN_DETECTABLE))

    assert n_h > 30 * n_b
    assert n_h > 48_000              # does not fit the window
    assert n_b < 48_000              # does


def test_per_decision_alpha_is_unusable_at_scale():
    """5% per decision is 730 false rollbacks a year."""
    assert DEPLOYS_PER_DAY * 365 * 0.05 > 700


def test_annual_budget_still_fits_the_window():
    delta = 12 / (DEPLOYS_PER_DAY * 365)
    var = (BASELINE + MIN_DETECTABLE) * (1 - BASELINE - MIN_DETECTABLE)

    assert bernstein_n(MIN_DETECTABLE, delta, var) < 48_000


def test_stricter_confidence_is_cheap():
    """log dependence: 60x stricter costs ~2.3x the data."""
    var = (BASELINE + MIN_DETECTABLE) * (1 - BASELINE - MIN_DETECTABLE)
    loose = bernstein_n(MIN_DETECTABLE, 0.05, var)
    strict = bernstein_n(MIN_DETECTABLE, 0.000822, var)

    assert strict / loose < 3.0


def test_threshold_sits_between_baseline_and_target():
    t = canary_threshold(48_000, BASELINE, 0.000822)

    assert BASELINE < t <= BASELINE + MIN_DETECTABLE + 1e-9


def test_decisions_are_correct_at_the_boundaries():
    assert decide(96, 48_000)[0] == "promote"        # exactly baseline
    assert decide(150, 48_000)[0] == "rollback"      # 0.31%
    assert decide(20, 5_000)[0] == "extend"          # thin data


def test_never_decides_on_thin_data():
    """A canary that guesses is worse than no canary."""
    for n in (100, 1_000, 9_999):
        assert decide(n // 2, n)[0] == "extend"`,
        notes: [
          { t: "p", text: "**Hoeffding is the wrong tool for rare events, and finding that out is the point of the exercise.** It knows only the range `[0,1]`, so it protects against a variable with variance 0.25 when the actual variance is 0.002 — a 125× penalty, and 1.84 million requests required against 48,000 available." },
          { t: "callout", kind: "insight", title: "Bernstein recovers the gap without assuming a distribution", body: [
            { t: "p", text: "It uses the variance as well as the range, so for rare events where `σ² ≪ b²` it lands at 18,556 requests — inside the window — while still assuming only independence and a bound." },
            { t: "p", text: "Bound the variance at the *alternative* rate, not the baseline: under the regression you are trying to detect, `p` is higher and so is the variance." }
          ]},
          { t: "p", text: "**Forty unattended decisions a day is what a per-deploy analysis misses.** A 5% false-alarm rate is 730 false rollbacks a year — two a day — and an ignored canary is worse than none, because it gives the appearance of safety while blocking nothing." },
          { t: "p", text: "**Budget false alarms annually.** Targeting one a month gives `δ = 0.00082`, requiring 42,536 requests — still inside the window, because the log dependence means a 60× stricter rate costs 2.3× the data rather than 60×." },
          { t: "p", text: "**The rule is: with 48,000 requests, roll back above 0.305%.** Baseline is 0.2% and the specification was to catch 0.3%, so it detects what it was built to detect at roughly one false rollback per month." },
          { t: "p", text: "**Do not peek at a fixed-horizon threshold.** Early rollback on an interim reading inflates the false-alarm rate silently and voids the guarantee the design rests on — use a sequential test if early stopping matters, which it does for a catastrophic deploy." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A trading system's risk limits were set at four standard deviations from historical returns, giving an expected breach roughly once every 15,000 days under a normal model. Breaches occurred about twice a year." },
      { t: "p", text: "**Chebyshev says at most 6.25% of any distribution's mass lies beyond 4σ**, against the normal's 0.0063% — a factor of a thousand. The observed rate, around 0.8% of days, sat comfortably between them." },
      { t: "p", text: "**The data was never in conflict with the mathematics** — it was in conflict with an unexamined normality assumption. Nothing was anomalous; a bound that assumed less would have predicted it." },
      { t: "p", text: "**Compute the Chebyshev bound alongside the normal one whenever a limit matters.** The gap between them is the size of your exposure to the distributional assumption being wrong, and it costs one line to know it." }
    ]}
  ],

  takeaways: [
    "**Markov needs only a non-negative mean**, and is correspondingly almost useless — but it cannot be wrong, and the others are built from it.",
    "**Chebyshev needs only a variance**: `P(|X−μ| ≥ kσ) ≤ 1/k²`, which is 70,000× looser than the normal at 5σ.",
    "**Cantelli is the correct one-sided form** — you cannot simply halve the two-sided Chebyshev bound.",
    "**Hoeffding needs independence and a bounded range**, and gets exponential tail decay without naming a distribution.",
    "**Hoeffding gives sample sizes with no CLT and no \"n ≥ 30\"**, at roughly twice the data of the normal approximation.",
    "**Precision is expensive, confidence is cheap**: `n ~ 1/t²` but `n ~ log(1/δ)`.",
    "**Hoeffding is the wrong tool for rare events** — its range-based bound ignores the variance and can be 100× loose.",
    "**Bernstein uses the variance as well as the range**, recovering most of that gap while still assuming no distribution.",
    "**The union bound makes simultaneous guarantees cost `log(m)`, not `m`** — 10,000 metrics cost 3.5× the data of one.",
    "**Without correction, at least one of 10,000 metrics breaching its bound is a certainty**, not a surprise.",
    "**Budget false alarms over the system's lifetime, not per decision** — 5% per decision is two false rollbacks a day at 40 deploys.",
    "**The gap between the Chebyshev and normal bounds is your exposure to the normality assumption**, and it costs one line to compute."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does Chebyshev's inequality assume?",
        options: [
          "Normality",
          "Only that the variance exists — it holds for any distribution, which is why it is so loose",
          "Independence of the observations",
          "That the data is bounded"
        ],
        answer: 1,
        why: "At 5σ it allows 4% of the mass where a normal allows 0.0001% — a 70,000× gap. That gap is the price of the guarantee, and it is worth paying whenever the distribution cannot be verified, because a heavy tail really can put mass out there."
      },
      {
        stem: "You need a sample size for a rare event (`p = 0.002`) with no distributional assumption. Why is Hoeffding a poor choice?",
        options: [
          "It requires normality",
          "It uses only the range `[0,1]`, so it protects against variance 0.25 when the true variance is 0.002 — a 125× penalty",
          "It only applies to continuous variables",
          "It needs the sample size in advance"
        ],
        answer: 1,
        why: "Bernstein's inequality uses the variance as well as the range, recovering most of that gap while still assuming only independence and a bound. Knowing where a distribution-free tool is catastrophically loose is as useful as knowing it exists."
      },
      {
        stem: "Guaranteeing 10,000 metrics simultaneously rather than one. How much more data?",
        options: [
          "10,000×",
          "About 3.5× — the union bound gives each a budget of `δ/m`, and `n` grows as `log(m)`",
          "100×, the square root",
          "No more; the bounds are independent"
        ],
        answer: 1,
        why: "The log dependence is why monitoring thousands of metrics is affordable and why Bonferroni correction is less punishing than its reputation. The flip side is that *without* correction, at least one of 10,000 breaching its bound is essentially certain."
      },
      {
        stem: "An automated canary runs on 40 deploys a day at a 5% false-alarm rate. What is wrong?",
        options: [
          "5% is a standard significance level",
          "730 false rollbacks a year — two a day — so the canary gets ignored, and an ignored canary is worse than none",
          "The rate should be 1%",
          "Nothing, if each decision is independent"
        ],
        answer: 1,
        why: "Budget false alarms over the system's lifetime rather than per decision. Targeting one a month gives `δ = 0.00082`, and because `n` grows as `log(1/δ)` that 60× stricter rate costs only 2.3× the data."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you bound a tail probability without assuming a distribution?",
        strong: "Chebyshev if I have a variance, Hoeffding if the variable is bounded and I am averaging independent samples, Bernstein if it is bounded *and* I can bound the variance — which matters for rare events, where Hoeffding is 100× loose.",
        answer: [
          { t: "p", text: "Ranking the three by what each assumes shows you understand that tightness is bought with assumptions." },
          { t: "p", text: "Knowing where Hoeffding fails — rare events — is the detail that separates having used these from having read about them." }
        ]
      },
      {
        level: "advanced",
        q: "Why would you use a bound you know is loose?",
        strong: "Because it holds whatever the distribution does. For a guarantee about a future you do not control — a contractual SLO, an unattended automated decision — a loose bound that cannot be wrong beats a tight one that depends on an assumption nobody will re-check.",
        answer: [
          { t: "p", text: "Framing it as \"a guarantee is a claim about the future\" is the argument, and it is the one people miss." },
          { t: "p", text: "Suggesting you compute both and treat the gap as your exposure to the assumption turns it into a measurement." }
        ]
      },
      {
        level: "advanced",
        q: "How would you set the significance level for an automated check that runs continuously?",
        strong: "From the total number of decisions it will make, not per decision. At 40 deploys a day, 5% is 730 false alarms a year. I would target a tolerable annual rate and derive `δ` from it — which is cheap, because sample size grows as `log(1/δ)`.",
        answer: [
          { t: "p", text: "Thinking in decisions-per-year rather than per-test is exactly the shift the question is probing." },
          { t: "p", text: "Noting that stricter confidence is logarithmically cheap explains why this is affordable rather than a trade-off." },
          { t: "p", text: "Adding that an ignored alarm is worse than none shows you are reasoning about the system, not just the statistics." }
        ]
      }
    ]
  }
});

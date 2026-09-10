/* ============================================================================
   LESSON 5.11 — Bootstrap and Resampling
   ========================================================================= */
EC.receiveLesson({
  id: "5.11",

  lede: "**The bootstrap gives you a confidence interval for any statistic without a formula** — a ratio of medians, a Gini coefficient, the output of a whole pipeline. It works by treating your sample as the population, and knowing exactly where that substitution fails is what separates using it from trusting it.",

  objectives: [
    "Implement the bootstrap and explain why it works",
    "Choose between percentile, basic and BCa intervals",
    "Distinguish bootstrapping from permutation testing",
    "Identify the statistics where the bootstrap silently fails",
    "Resample the right unit for clustered or time-series data"
  ],

  prerequisites: ["5.3"],

  blocks: [

    { t: "h2", n: "01", text: "The idea, and why it works at all", id: "idea" },

    { t: "p", text: "**The bootstrap treats your sample as if it were the population and resamples from it.** Since you cannot draw new samples from the world, you draw them from what you have — and the spread of the resulting statistics estimates the sampling distribution you never see." },

    { t: "dl", items: [
      ["Bootstrap", "Resample `n` observations **with replacement**, recompute the statistic, and repeat thousands of times."],
      ["Empirical distribution", "The observed data treated as a distribution. It converges to the true one, which is why the substitution works."],
      ["Resample", "One bootstrap draw. It contains about 63.2% of the distinct original points — `1 − 1/e`."],
      ["Out-of-bag", "The remaining 36.8%, left out of a given resample. Exactly what random forests validate on."],
      ["Number of resamples", "About 2,000 for a standard error and 10,000 for a 95% interval. Monte Carlo noise falls as `1/√B`."],
      ["Resampling", "Any method that reuses the observed data to estimate sampling behaviour — the bootstrap, the jackknife and permutation tests are all resampling."]
    ]},

    { t: "viz",
      title: "The sample stands in for the population",
      caption: "You cannot draw new samples from the population. So draw new samples from your sample — the empirical distribution is the best estimate of the real one, and resampling it mimics the sampling you cannot repeat.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="A population feeding one sample, which is then resampled many times to build a distribution of statistics">
  <ellipse cx="110" cy="90" rx="70" ry="46" style="fill:var(--ink-3);fill-opacity:.10;stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="2"/>
  <text x="72" y="94" class="s-sub" style="fill:var(--ink-3)">population</text>
  <text x="60" y="152" class="s-sub" style="fill:var(--ink-3)">unobservable</text>

  <line x1="184" y1="90" x2="236" y2="90" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#bs-a)"/>
  <text x="184" y="76" class="s-sub" style="fill:var(--ink-3)">one draw</text>

  <rect x="244" y="56" width="120" height="68" rx="6" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="2"/>
  <text x="272" y="96" class="s-label" style="fill:var(--accent)">your sample</text>
  <text x="256" y="152" class="s-sub" style="fill:var(--ink-3)">the only thing you have</text>

  <g style="stroke:var(--good);stroke-width:1.5">
    <line x1="368" y1="76" x2="470" y2="42" marker-end="url(#bs-b)"/>
    <line x1="368" y1="90" x2="470" y2="90" marker-end="url(#bs-b)"/>
    <line x1="368" y1="104" x2="470" y2="138" marker-end="url(#bs-b)"/>
  </g>
  <text x="380" y="176" class="s-sub" style="fill:var(--good)">resample WITH replacement, B times</text>

  <g style="fill:var(--good);fill-opacity:.16;stroke:var(--good)" stroke-width="2">
    <rect x="478" y="24" width="92" height="36" rx="5"/>
    <rect x="478" y="72" width="92" height="36" rx="5"/>
    <rect x="478" y="120" width="92" height="36" rx="5"/>
  </g>
  <text x="586" y="48"  class="s-sub" style="fill:var(--ink-3)">stat = 4.21</text>
  <text x="586" y="96"  class="s-sub" style="fill:var(--ink-3)">stat = 3.87</text>
  <text x="586" y="144" class="s-sub" style="fill:var(--ink-3)">stat = 4.05</text>

  <path d="M700 140 C 730 140, 736 60, 766 60 C 796 60, 802 140, 832 140"
        style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
  <text x="690" y="176" class="s-sub" style="fill:var(--good)">the sampling distribution</text>

  <defs>
    <marker id="bs-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/>
    </marker>
    <marker id="bs-b" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/>
    </marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the whole method is five lines", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

def bootstrap(data, statistic, B=10_000, seed=0):
    """Resample with replacement, recompute, repeat."""
    r = np.random.default_rng(seed)
    x = np.asarray(data)
    n = len(x)
    return np.array([statistic(x[r.integers(0, n, n)]) for _ in range(B)])

# IT WORKS ON ANYTHING. No formula, no distributional assumption.
data = rng.lognormal(3, 1, 200)

boots = bootstrap(data, np.median)
np.percentile(boots, [2.5, 97.5])          # (16.8, 23.4)

# CHECK IT AGAINST THE KNOWN CASE -- the mean, where a formula exists:
boots_mean = bootstrap(data, np.mean)
boots_mean.std()                            # 2.51
data.std(ddof=1)/np.sqrt(len(data))         # 2.52 -- the analytic SE
#
# THE BOOTSTRAP STANDARD ERROR MATCHES THE FORMULA to two decimal
# places. That is the reassurance: on the case you can check, it is
# right.

# AND ON THE CASES YOU CANNOT:
bootstrap(data, lambda v: np.percentile(v, 95)).std()          # a p95
bootstrap(data, lambda v: v.std()/v.mean()).std()              # a CV
bootstrap(data, lambda v: stats.skew(v)).std()                 # skewness
#
# NONE OF THOSE HAS A CONVENIENT FORMULA, and the bootstrap treats
# them identically to the mean.

# WHY IT WORKS: the empirical distribution converges to the true one
# (Glivenko-Cantelli), so resampling from it approximates sampling
# from the population. The approximation is asymptotic -- it improves
# with n and can be poor when n is small.

# EACH BOOTSTRAP SAMPLE CONTAINS ABOUT 63.2% OF THE DISTINCT ORIGINAL
# POINTS, which is 1 - 1/e -- the same constant as lesson 3.3:
idx = rng.integers(0, 200, 200)
len(np.unique(idx)) / 200                   # ~0.632
1 - 1/np.e                                  # 0.632
#
# The other 36.8% are out-of-bag, which is exactly what random forests
# use for validation.

# HOW MANY RESAMPLES? Enough that Monte Carlo noise is negligible
# beside the statistical uncertainty:
for B in (100, 1_000, 10_000, 100_000):
    reps = [np.percentile(bootstrap(data, np.median, B, seed=s), 2.5)
            for s in range(20)]
    print(f"B={B:>7,}: spread of the CI endpoint = {np.std(reps):.4f}")
# B=    100: spread of the CI endpoint = 0.4013
# B=  1,000: spread of the CI endpoint = 0.1266
# B= 10,000: spread of the CI endpoint = 0.0421
# B=100,000: spread of the CI endpoint = 0.0132
#
# B = 2,000 IS ENOUGH FOR A STANDARD ERROR, 10,000 FOR A 95% INTERVAL,
# and more for extreme quantiles. Monte Carlo noise scales as
# 1/sqrt(B), so ten times the compute buys three times the precision.
`,
      hl: [7, 21, 36, 51],
      caption: "**Each bootstrap sample contains about 63.2% of the distinct original points** — `1 − 1/e` again. The remaining 36.8% are the out-of-bag set random forests validate on."
    },

    { t: "h2", n: "02", text: "Three intervals, increasing sophistication", id: "intervals" },

    { t: "p", text: "There are three standard ways to turn a bootstrap distribution into an interval, in increasing sophistication. **What separates them is how they handle bias and skew** — and on skewed data the difference in actual coverage is several percentage points." },

    { t: "dl", items: [
      ["Percentile interval", "Take the empirical 2.5th and 97.5th percentiles of the bootstrap values. Simple, and optimistic when the estimator is biased."],
      ["Basic interval", "Reflects around the observed value, correcting for location bias. Note the reversed quantiles."],
      ["BCa", "Bias-corrected and accelerated. Adjusts for median bias (`z₀`) and for skew (`a`, from the jackknife). The modern default."],
      ["Jackknife", "Leave-one-out resampling. Used inside BCa to estimate the acceleration."],
      ["Coverage", "The only thing that matters. Verify it by simulation rather than assuming the nominal level."]
    ]},

    { t: "code", lang: "python", title: "percentile, basic and BCa", code: `
def percentile_ci(boots, alpha=0.05):
    """Take the empirical quantiles of the bootstrap distribution.
    Simple, and biased when the estimator is."""
    return tuple(np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)]))

def basic_ci(boots, observed, alpha=0.05):
    """Reflect around the observed value. Corrects for bias in the
    bootstrap distribution's LOCATION -- note the reversed quantiles."""
    lo, hi = np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)])
    return (2*observed - hi, 2*observed - lo)

def bca_ci(data, statistic, B=10_000, alpha=0.05, seed=0):
    """Bias-corrected and accelerated.

    Two corrections on top of the percentile method:
      z0    -- how far the bootstrap distribution's median sits from
               the observed value (median bias)
      accel -- how fast the standard error changes with the parameter,
               estimated by jackknife (skewness)

    It is the default in most modern software because it has
    second-order accuracy where the percentile method has first."""
    x = np.asarray(data, float)
    n = len(x)
    r = np.random.default_rng(seed)
    theta = statistic(x)
    boots = np.array([statistic(x[r.integers(0, n, n)]) for _ in range(B)])

    # Bias correction from the proportion of resamples below theta.
    prop = np.mean(boots < theta)
    prop = min(max(prop, 1/(2*B)), 1 - 1/(2*B))     # avoid +/- inf
    z0 = stats.norm.ppf(prop)

    # Acceleration from the jackknife -- leave one out at a time.
    jack = np.array([statistic(np.delete(x, i)) for i in range(n)])
    jbar = jack.mean()
    num = ((jbar - jack)**3).sum()
    den = 6.0 * (((jbar - jack)**2).sum())**1.5
    accel = num/den if den != 0 else 0.0

    z_lo, z_hi = stats.norm.ppf(alpha/2), stats.norm.ppf(1-alpha/2)
    def adjust(z):
        return stats.norm.cdf(z0 + (z0 + z)/(1 - accel*(z0 + z)))
    return tuple(np.percentile(boots, [100*adjust(z_lo), 100*adjust(z_hi)]))

# ---- COVERAGE IS THE ONLY THING THAT MATTERS -------------------------
# A 95% interval should contain the truth 95% of the time. Check it.

def coverage(method, sampler, true_value, statistic, n=40,
             trials=1500, seed=0):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        x = sampler(r, n)
        lo, hi = method(x, statistic)
        hits += lo <= true_value <= hi
    return hits / trials

pct = lambda x, s: percentile_ci(bootstrap(x, s, 2000))
bas = lambda x, s: basic_ci(bootstrap(x, s, 2000), s(x))
bca = lambda x, s: bca_ci(x, s, 2000)

# SYMMETRIC DATA, MEAN -- all three should be fine:
normal = lambda r, n: r.normal(10, 2, n)
[round(coverage(m, normal, 10.0, np.mean), 3) for m in (pct, bas, bca)]
# [0.937, 0.939, 0.945]

# SKEWED DATA, MEAN -- the percentile method starts to slip:
logn = lambda r, n: r.lognormal(0, 1, n)
true_mean = np.exp(0.5)
[round(coverage(m, logn, true_mean, np.mean), 3) for m in (pct, bas, bca)]
# [0.892, 0.879, 0.926]

# SKEWED DATA, A QUANTILE -- where the difference matters:
true_p90 = np.exp(stats.norm.ppf(0.90))
q90 = lambda v: np.percentile(v, 90)
[round(coverage(m, logn, true_p90, q90), 3) for m in (pct, bas, bca)]
# [0.874, 0.851, 0.918]
#
# BCa RECOVERS 4-7 POINTS OF COVERAGE on skewed data. The percentile
# method is not wrong, it is optimistic -- and it is optimistic in
# exactly the situations you reached for a bootstrap to handle.
#
# NOTE ALSO THAT NONE OF THEM REACHES 95% AT n = 40. The bootstrap is
# asymptotic, and 40 observations of a skewed variable is not enough.
`,
      hl: [14, 34, 76, 86],
      caption: "**BCa recovers 4–7 points of coverage on skewed data**, and none of the three reaches 95% at `n = 40`. The bootstrap is asymptotic — small samples of skewed data defeat all of them."
    },

    { t: "callout", kind: "insight", title: "Bootstrap and permutation answer different questions", body: [
      { t: "p", text: "**The bootstrap estimates the sampling distribution of a statistic**, which gives intervals. **A permutation test builds a null distribution**, which gives p-values. Using one for the other's job produces something that looks right and is not." },
      { t: "code", lang: "python", numbered: false, title: "the division of labour", code: `
a = rng.normal(0.0, 1, 60)
b = rng.normal(0.5, 1, 60)

# PERMUTATION -- for a p-value. It destroys the group structure by
# shuffling labels, so it can say "how surprising is this difference
# under no effect" and CANNOT estimate the effect's size.
pooled = np.concatenate([a, b])
obs = b.mean() - a.mean()
null = np.empty(10_000)
for i in range(10_000):
    rng.shuffle(pooled)
    null[i] = pooled[60:].mean() - pooled[:60].mean()
p = ((np.abs(null) >= abs(obs)).sum() + 1) / 10_001      # 0.0063

# BOOTSTRAP -- for an interval. It preserves the group structure and
# resamples WITHIN each group, so it estimates how much the observed
# difference would vary -- and CANNOT test a null it never imposed.
diffs = np.array([rng.choice(b, 60, True).mean() -
                  rng.choice(a, 60, True).mean() for _ in range(10_000)])
np.percentile(diffs, [2.5, 97.5])                        # (0.16, 0.86)

# THE TWO ARE CONSISTENT: the interval excludes zero and the p-value
# is small. THEY ARE NOT INTERCHANGEABLE:
#
#   "bootstrap p-value" -- what people usually mean is the fraction of
#   bootstrap differences below zero. That is NOT a p-value; it is a
#   rough posterior probability, and it does not control type I error.
(diffs < 0).mean()                                       # 0.0032
#
#   Compare with the permutation's 0.0063 -- roughly a factor of two,
#   which is the usual relationship (one is a one-sided posterior-like
#   quantity, the other a two-sided tail probability).

# THE RULE:
#   a p-value        -> permutation (exact under exchangeability)
#   an interval      -> bootstrap
#   both             -> run both; they cost the same and answer
#                       different halves of the question`},
      { t: "p", text: "**A \"bootstrap p-value\" is usually the fraction of resamples below zero**, which is a rough posterior probability rather than a p-value — it does not control type I error, because no null was ever imposed." }
    ]},

    { t: "h2", n: "03", text: "Where the bootstrap silently fails", id: "failures" },

    { t: "p", text: "**The bootstrap fails silently** — it returns an ordinary-looking interval with no warning. The failures fall into two groups: statistics that are not smooth functions of the distribution, and, far more commonly, resampling the wrong unit." },

    { t: "dl", items: [
      ["Non-smooth statistic", "Extremes and boundaries. A bootstrapped maximum can never exceed the sample maximum, so its interval is bounded by construction."],
      ["Atomicity diagnostic", "If many resamples return exactly the same value, the statistic is not smooth enough. 63% identical for a maximum against 0.02% for a mean."],
      ["Cluster bootstrap", "Resample **clusters**, not rows. Row-level resampling of clustered data understates the standard error by the design effect."],
      ["Block bootstrap", "For time series: resample contiguous blocks so autocorrelation survives. Block length should exceed the correlation length."],
      ["Bootstrap versus permutation", "Bootstrap estimates a sampling distribution and gives intervals; permutation builds a null distribution and gives p-values. A \"bootstrap p-value\" controls no error rate."]
    ]},

    { t: "ladder",
      title: "Bootstrapping a statistic that depends on the extremes",
      rungs: [
        { level: "bad", label: "Bootstrap the maximum",
          why: "Resampling can never produce a value larger than the sample maximum, so the bootstrap distribution is bounded above by it. The interval is one-sided by construction and badly undercovers, and nothing in the output signals a problem.",
          code: `x = rng.uniform(0, 100, 200)
boots = bootstrap(x, np.max, 10_000)

x.max()                          # 99.6
boots.max()                      # 99.6 -- it CANNOT exceed this
np.percentile(boots, [2.5, 97.5])# (97.1, 99.6)

# The true maximum is 100, and the interval's upper end is the sample
# max. Coverage of the true value is near zero, and the output looks
# perfectly ordinary.
(boots == x.max()).mean()        # 0.63 -- 63% of resamples are identical` },
        { level: "ok", label: "Recognise the failure class and avoid it",
          why: "The bootstrap requires the statistic to be a smooth function of the distribution. Extremes, boundaries and anything with a non-normal limiting distribution violate that, and the failure is silent.",
          code: `# THE FAILURE CLASS:
#
#   MAXIMUM / MINIMUM     bounded by the sample; use extreme value
#                         theory instead
#   PARAMETER AT A BOUND  a variance component estimated at 0, a
#                         probability estimated at 1
#   VERY SMALL n          the empirical distribution is a poor stand-in
#   HEAVY TAILS, infinite variance
#                         the bootstrap for the MEAN is inconsistent
#   NUMBER OF DISTINCT VALUES / support size
#                         resampling cannot discover unseen categories
#
# A DIAGNOSTIC THAT CATCHES MOST OF THEM: if the bootstrap
# distribution is heavily atomic -- many resamples give exactly the
# same value -- the statistic is not smooth enough.
def smoothness_warning(boots, threshold=0.05):
    _, counts = np.unique(np.round(boots, 10), return_counts=True)
    top = counts.max() / len(boots)
    return top > threshold, top

smoothness_warning(bootstrap(x, np.max, 10_000))     # (True, 0.63)
smoothness_warning(bootstrap(x, np.mean, 10_000))    # (False, 0.0002)` },
        { level: "best", label: "Resample the right unit, and validate the coverage",
          why: "Most real bootstrap failures are not exotic statistics — they are the wrong resampling unit. Independent observations are what the method assumes, and clustered or time-ordered data must be resampled in blocks.",
          code: `def cluster_bootstrap(values, clusters, statistic, B=10_000, seed=0):
    """Resample CLUSTERS, not rows.

    Bootstrapping rows of clustered data understates the variance by
    exactly the design effect (lesson 5.1) -- the same failure as a
    naive t-test, and just as invisible."""
    r = np.random.default_rng(seed)
    values, clusters = np.asarray(values), np.asarray(clusters)
    ids = np.unique(clusters)
    groups = [values[clusters == c] for c in ids]

    out = np.empty(B)
    for i in range(B):
        pick = r.integers(0, len(groups), len(groups))
        out[i] = statistic(np.concatenate([groups[j] for j in pick]))
    return out

# 100 users, 40 events each, with strong per-user correlation.
user = np.repeat(np.arange(100), 40)
effect = rng.normal(0, 2.0, 100)
vals = effect[user] + rng.normal(0, 1.0, 4000)

bootstrap(vals, np.mean, 5000).std()                     # 0.0347
cluster_bootstrap(vals, user, np.mean, 5000).std()       # 0.2011
#
# THE NAIVE BOOTSTRAP UNDERSTATES THE STANDARD ERROR 5.8-FOLD, so
# every interval is nearly six times too narrow.

def block_bootstrap(series, statistic, block=None, B=10_000, seed=0):
    """For time series: resample contiguous BLOCKS so autocorrelation
    within a block survives. Block length should exceed the
    correlation length -- n^(1/3) is a common default."""
    r = np.random.default_rng(seed)
    x = np.asarray(series, float)
    n = len(x)
    block = block or max(2, int(round(n ** (1/3))))
    n_blocks = int(np.ceil(n / block))

    out = np.empty(B)
    for i in range(B):
        starts = r.integers(0, n - block + 1, n_blocks)
        out[i] = statistic(np.concatenate([x[s:s+block] for s in starts])[:n])
    return out

# AN AR(1) SERIES with strong persistence:
series = np.zeros(2000)
for t in range(1, 2000):
    series[t] = 0.9*series[t-1] + rng.normal(0, 1)

bootstrap(series, np.mean, 4000).std()                   # 0.051
block_bootstrap(series, np.mean, 30, 4000).std()         # 0.196
#
# ALMOST FOUR TIMES WIDER, and the block version is the correct one.
# The naive bootstrap destroys the autocorrelation, so it estimates
# the variance of a series that does not exist.

# ALWAYS VALIDATE COVERAGE ON SIMULATED DATA WITH THE SAME STRUCTURE
# before trusting a bootstrap in production. It costs ten minutes and
# catches every failure above.`,
          note: "**Most bootstrap failures are the wrong resampling unit, not an exotic statistic.** Resample clusters for clustered data and blocks for time series, or the interval is several times too narrow with no warning." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Put an interval on a metric with no formula",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A marketplace reports a \"concentration ratio\": the share of revenue from the top 1% of sellers. Leadership wants to know whether it rose this quarter, and there is no standard error for it." },
        { t: "code", lang: "python", numbered: false, title: "the situation", code: `
# Q1: 12,400 sellers, top-1% share = 41.2%
# Q2: 13,100 sellers, top-1% share = 44.8%
#
# Revenue per seller is extremely heavy-tailed (Pareto-like).
# Sellers persist between quarters -- roughly 80% overlap.
#
# The metric: sorted revenue, sum of the top 1%, divided by the total.`},
        { t: "p", text: "Give an interval on the change, say whether the rise is real, and note every methodological hazard." }
      ],
      requirements: [
        "Implement the metric and a bootstrap interval for it.",
        "Address the fact that it depends on the extreme tail.",
        "Handle the seller overlap between quarters.",
        "Validate the interval's coverage on simulated data.",
        "State the conclusion with its caveats.",
        "Include tests."
      ],
      hint: "The statistic is a function of the top 1% of a heavy-tailed sample. Ask how many observations actually determine it.",
      solution: {
        lang: "python",
        title: "concentration.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

def top_share(revenue, frac=0.01):
    """Share of total revenue held by the top "frac" of sellers."""
    x = np.sort(np.asarray(revenue, float))[::-1]
    k = max(1, int(np.ceil(len(x) * frac)))
    total = x.sum()
    return float(x[:k].sum() / total) if total > 0 else np.nan

# Simulate quarters matching the reported figures.
q1 = (rng.pareto(1.16, 12_400) + 1) * 100
q2 = (rng.pareto(1.10, 13_100) + 1) * 100
top_share(q1), top_share(q2)                    # ~0.41, ~0.45


# =========================================================================
# HOW MANY OBSERVATIONS ACTUALLY DETERMINE THIS?
# =========================================================================
#
# The top 1% of 12,400 sellers is 124 sellers -- and because the tail
# is Pareto, even within those the largest few dominate.

x = np.sort(q1)[::-1]
k = int(np.ceil(len(q1)*0.01))
x[:10].sum() / x[:k].sum()                      # ~0.55
#
# THE TOP TEN SELLERS ARE ROUGHLY HALF OF THE TOP 1%'s REVENUE, and
# therefore about 22% of ALL revenue. The metric is effectively
# determined by a couple of dozen observations out of 12,400.
#
# THAT IS THE CENTRAL HAZARD. The bootstrap will resample those few
# sellers in or out, so its variability is real and large -- and any
# method that ignores it will be badly overconfident.


# =========================================================================
# THE BOOTSTRAP
# =========================================================================

def bootstrap_stat(x, statistic, B=10_000, seed=0):
    r = np.random.default_rng(seed)
    x = np.asarray(x, float)
    n = len(x)
    return np.array([statistic(x[r.integers(0, n, n)]) for _ in range(B)])

b1 = bootstrap_stat(q1, top_share, seed=1)
b2 = bootstrap_stat(q2, top_share, seed=2)

np.percentile(b1, [2.5, 97.5])                  # e.g. (0.376, 0.447)
np.percentile(b2, [2.5, 97.5])                  # e.g. (0.412, 0.484)
#
# THE INTERVALS OVERLAP SUBSTANTIALLY. Comparing two intervals is not
# the right test though (that is the difference-of-significance
# fallacy from lesson 5.7) -- bootstrap the DIFFERENCE directly.

def bootstrap_difference(a, b, statistic, B=10_000, seed=0):
    r = np.random.default_rng(seed)
    a, b = np.asarray(a, float), np.asarray(b, float)
    return np.array([statistic(b[r.integers(0, len(b), len(b))]) -
                     statistic(a[r.integers(0, len(a), len(a))])
                     for _ in range(B)])

d = bootstrap_difference(q1, q2, top_share, seed=3)
observed = top_share(q2) - top_share(q1)
observed, tuple(np.percentile(d, [2.5, 97.5]))
# 0.036, (-0.014, 0.086)
#
# THE INTERVAL ON THE CHANGE SPANS ZERO. A 3.6-point rise with an
# interval from -1.4 to +8.6 points is not evidence of a rise.

(d > 0).mean()                                  # ~0.92
#
# 92% of resamples show an increase. That is suggestive and it is not
# significance -- and note this is the posterior-like quantity, not a
# p-value (see the bootstrap-vs-permutation distinction).


# =========================================================================
# IS THE BOOTSTRAP EVEN VALID HERE?
# =========================================================================
#
# TWO REASONS FOR CONCERN, and they must be checked rather than
# assumed away:
#
# 1. THE STATISTIC DEPENDS ON THE EXTREME TAIL. It is not the maximum
#    -- it is a sum of the top 1%, which is smoother -- but it is
#    close enough to warrant a smoothness check.
def atomicity(boots):
    _, counts = np.unique(np.round(boots, 8), return_counts=True)
    return float(counts.max() / len(boots))

atomicity(b1)                                   # ~0.0002 -- smooth
atomicity(bootstrap_stat(q1, np.max, 2000))     # ~0.63 -- NOT smooth
#
# The top-share statistic passes; the maximum fails badly. Good.
#
# 2. PARETO WITH TAIL INDEX ~1.1 HAS INFINITE VARIANCE, and the
#    bootstrap for a MEAN is inconsistent under infinite variance.
#    But top_share is a RATIO of sums, which is bounded in [0,1] --
#    so it does not inherit that failure. Verify rather than argue:

def validate_coverage(alpha_pareto, n, frac=0.01, trials=400, seed=0):
    """Generate many quarters from a known population, and count how
    often the bootstrap interval contains the population value."""
    r = np.random.default_rng(seed)
    population = (r.pareto(alpha_pareto, 2_000_000) + 1) * 100
    truth = top_share(population, frac)

    hits = 0
    for t in range(trials):
        sample = r.choice(population, n, replace=False)
        lo, hi = np.percentile(bootstrap_stat(sample, top_share, 800,
                                              seed=t), [2.5, 97.5])
        hits += lo <= truth <= hi
    return hits/trials, truth

validate_coverage(1.16, 12_400)                 # (~0.93, 0.41)
validate_coverage(1.16, 500)                    # (~0.86, 0.41)
#
# 93% COVERAGE AT n = 12,400 -- slightly optimistic but usable. At
# n = 500 it drops to 86%, which is the small-sample failure showing.
#
# THAT VALIDATION IS THE WHOLE JUSTIFICATION. Without it, "the
# bootstrap gave an interval" is an assertion; with it, it is a
# measurement.


# =========================================================================
# THE SELLER OVERLAP -- THE BIGGEST METHODOLOGICAL ISSUE
# =========================================================================
#
# 80% of sellers appear in both quarters, so the two measurements are
# POSITIVELY CORRELATED. Treating them as independent (which the
# difference bootstrap above does) OVERSTATES the variance of the
# change -- the opposite of the usual clustering error.
#
# THE FIX IS TO PAIR (lesson 5.3): resample SELLERS and use each
# selected seller's revenue in both quarters.

def paired_bootstrap(seller_ids, rev_q1, rev_q2, statistic, B=10_000,
                     seed=0):
    """Resample sellers once; carry both quarters' revenue with them.
    Sellers present in only one quarter contribute 0 to the other."""
    r = np.random.default_rng(seed)
    ids = np.asarray(seller_ids)
    n = len(ids)
    out = np.empty(B)
    for i in range(B):
        pick = r.integers(0, n, n)
        a, b = rev_q1[pick], rev_q2[pick]
        out[i] = statistic(b[b > 0]) - statistic(a[a > 0])
    return out

# Build an overlapping panel: 10,000 shared, plus quarter-specific.
n_shared = 10_000
shared_base = (rng.pareto(1.16, n_shared) + 1) * 100
ids = np.arange(n_shared + 2_400 + 3_100)
rev1 = np.zeros(len(ids)); rev2 = np.zeros(len(ids))
rev1[:n_shared] = shared_base
rev2[:n_shared] = shared_base * rng.lognormal(0.03, 0.25, n_shared)
rev1[n_shared:n_shared+2_400] = (rng.pareto(1.16, 2_400) + 1) * 100
rev2[n_shared+2_400:] = (rng.pareto(1.10, 3_100) + 1) * 100

paired = paired_bootstrap(ids, rev1, rev2, top_share, 4000, seed=5)
unpaired = bootstrap_difference(rev1[rev1>0], rev2[rev2>0], top_share,
                                4000, seed=5)

np.percentile(paired, [2.5, 97.5])              # e.g. (0.004, 0.052)
np.percentile(unpaired, [2.5, 97.5])            # e.g. (-0.019, 0.074)
(np.percentile(unpaired,97.5)-np.percentile(unpaired,2.5)) / \\
(np.percentile(paired,97.5)-np.percentile(paired,2.5))          # ~1.9
#
# THE PAIRED INTERVAL IS ROUGHLY HALF THE WIDTH, and it excludes zero
# where the unpaired one does not. SAME DATA, DIFFERENT CONCLUSION,
# and the paired version is the correct one because the overlap is
# real.


# =========================================================================
# THE CONCLUSION
# =========================================================================
#
# "Top-1% concentration rose from 41.2% to 44.8%, a 3.6-point
#  increase. Accounting for the 80% seller overlap between quarters,
#  the 95% interval on the change is roughly +0.4 to +5.2 points
#  (paired bootstrap, 10,000 resamples).
#
#  The rise is statistically distinguishable from zero, but the
#  interval is wide: the metric is determined by roughly the top 100
#  sellers out of 13,000, and about half of it by the top ten. A
#  single large seller entering or leaving moves it by more than a
#  point.
#
#  CAVEATS:
#   - the metric is not robust; report it with the interval always
#   - bootstrap coverage validated at 93% for this sample size, so the
#     interval is mildly optimistic
#   - two quarters is not a trend. Concentration metrics are noisy
#     and mean-revert; three or four quarters before drawing a line."
#
# THE MOST USEFUL ADDITION: report the metric alongside a more robust
# alternative, so a reader can see whether the two agree.
def gini(x):
    x = np.sort(np.asarray(x, float))
    n = len(x)
    return float((2*np.arange(1, n+1) - n - 1).dot(x) / (n * x.sum()))

gini(rev1[rev1>0]), gini(rev2[rev2>0])          # e.g. 0.79, 0.81
#
# The Gini uses every seller rather than the top 1%, so it is far more
# stable. If concentration and Gini move together, the finding is
# real; if only the top-1% share moves, it is a story about a handful
# of sellers -- which is a different and probably more actionable
# finding.


# =========================================================================
# TESTS
# =========================================================================

def test_metric_is_dominated_by_a_few_sellers():
    x = np.sort(q1)[::-1]
    k = int(np.ceil(len(q1)*0.01))

    assert x[:10].sum() / x[:k].sum() > 0.4       # top 10 of top 124


def test_top_share_is_smooth_enough_to_bootstrap():
    assert atomicity(bootstrap_stat(q1, top_share, 2000)) < 0.01


def test_maximum_is_not():
    """The contrast that justifies the check."""
    assert atomicity(bootstrap_stat(q1, np.max, 2000)) > 0.3


def test_bootstrap_coverage_is_acceptable_at_this_n():
    cov, _ = validate_coverage(1.16, 12_400, trials=120)

    assert cov > 0.88


def test_coverage_degrades_at_small_n():
    """The bootstrap is asymptotic, and this is what that means."""
    big, _ = validate_coverage(1.16, 12_400, trials=120, seed=7)
    small, _ = validate_coverage(1.16, 400, trials=120, seed=7)

    assert small < big


def test_pairing_narrows_the_interval():
    p = np.percentile(paired, [2.5, 97.5])
    u = np.percentile(unpaired, [2.5, 97.5])

    assert (p[1]-p[0]) < 0.7 * (u[1]-u[0])


def test_gini_is_more_stable_than_top_share():
    """It uses every observation, so its bootstrap spread is smaller."""
    g = bootstrap_stat(rev1[rev1>0], gini, 1500).std()
    t = bootstrap_stat(rev1[rev1>0], top_share, 1500).std()

    assert g < t`,
        notes: [
          { t: "p", text: "**The metric is determined by roughly a couple of dozen observations out of 12,400** — the top ten sellers are about half of the top 1%'s revenue, and therefore 22% of all revenue. A single large seller entering or leaving moves it by more than a point." },
          { t: "callout", kind: "insight", title: "The seller overlap reverses the conclusion", body: [
            { t: "p", text: "80% of sellers appear in both quarters, so the measurements are positively correlated and treating them as independent *overstates* the variance — the opposite of the usual clustering error." },
            { t: "p", text: "The paired bootstrap gives an interval roughly half as wide, and it excludes zero where the unpaired one does not. Same data, different conclusion, and the paired version is correct." }
          ]},
          { t: "p", text: "**Validating coverage on simulated data is the whole justification.** 93% at this sample size makes the interval a measurement; without it, \"the bootstrap gave an interval\" is an assertion. At `n = 500` it drops to 86%, which is the asymptotic assumption showing." },
          { t: "p", text: "**The atomicity check separates the safe case from the unsafe one.** Top-share scores 0.0002 and the maximum scores 0.63 — the second means 63% of resamples return exactly the same value, which is the bootstrap failing silently." },
          { t: "p", text: "**Report a more robust alternative alongside.** If the Gini and the top-1% share move together the finding is real; if only the top share moves, it is a story about a handful of sellers — a different and probably more actionable finding." },
          { t: "p", text: "**Two quarters is not a trend.** Concentration metrics are noisy and mean-revert, so three or four points are needed before drawing a line through them." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team bootstrapped confidence intervals for a per-user engagement metric and shipped several features whose intervals excluded zero. None of the effects appeared in the following quarter's data." },
      { t: "p", text: "**They had resampled rows, and each user contributed many rows.** The naive bootstrap understated the standard error by the design effect — nearly six-fold in their case — so every interval was about six times too narrow." },
      { t: "p", text: "**The bootstrap did not warn them**, because it faithfully estimated the sampling distribution of a quantity computed from independent rows. The rows were not independent, and nothing in the method could know that." },
      { t: "p", text: "**Resample the unit of randomisation, not the unit of storage.** It is the same rule as analysing a clustered experiment, and it is the most common way a bootstrap goes wrong in production." }
    ]}
  ],

  takeaways: [
    "**The bootstrap gives an interval for any statistic** by treating the sample as the population and resampling with replacement.",
    "**It matches the analytic standard error where one exists**, which is the reassurance that it is right where one does not.",
    "**Each resample contains about 63.2% of the distinct points** — `1 − 1/e`, and the remaining 36.8% is the out-of-bag set.",
    "**`B = 2,000` suffices for a standard error and 10,000 for a 95% interval**; Monte Carlo noise falls as `1/√B`.",
    "**BCa recovers 4–7 points of coverage on skewed data** over the percentile method, which is optimistic exactly where you needed the bootstrap.",
    "**The bootstrap is asymptotic** — at `n = 40` on skewed data, no interval method reaches its nominal coverage.",
    "**Bootstrap for intervals, permutation for p-values.** A \"bootstrap p-value\" is a posterior-like quantity that controls no error rate.",
    "**It fails silently on extremes and boundaries** — a bootstrapped maximum cannot exceed the sample maximum.",
    "**A heavily atomic bootstrap distribution is the diagnostic**: many resamples returning the same value means the statistic is not smooth enough.",
    "**Resample the unit of randomisation** — row-level resampling of clustered data understates the standard error by the design effect.",
    "**Time series need block resampling**, with a block longer than the correlation length.",
    "**Validate coverage on simulated data with the same structure** before trusting a bootstrap in production."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You bootstrap the maximum of a sample. What goes wrong?",
        options: [
          "Nothing — the bootstrap works for any statistic",
          "Resampling can never exceed the sample maximum, so the interval is bounded above by it and undercovers badly — with no warning in the output",
          "It is too slow",
          "You need more resamples"
        ],
        answer: 1,
        why: "63% of resamples return exactly the sample maximum, which is the diagnostic: a heavily atomic bootstrap distribution means the statistic is not a smooth function of the distribution. Extremes need extreme value theory instead."
      },
      {
        stem: "Your data has 100 users with 40 events each. You bootstrap rows. What happens?",
        options: [
          "Nothing, since 4,000 rows is plenty",
          "The standard error is understated by roughly the design effect — nearly six-fold here — so every interval is six times too narrow",
          "The bootstrap will fail with an error",
          "You need more resamples"
        ],
        answer: 1,
        why: "The bootstrap faithfully estimates the sampling distribution of a quantity computed from independent rows; the rows are not independent and nothing in the method can know that. Resample clusters, not rows."
      },
      {
        stem: "When would you use a permutation test rather than a bootstrap?",
        options: [
          "When the sample is small",
          "When you want a p-value — permutation builds a null distribution, while the bootstrap estimates a sampling distribution and gives intervals",
          "When the data is skewed",
          "They are interchangeable"
        ],
        answer: 1,
        why: "A \"bootstrap p-value\" is usually the fraction of resamples below zero, which is a rough posterior probability and controls no error rate. Running both costs the same and answers different halves of the question."
      },
      {
        stem: "Two quarters' measurements share 80% of the same sellers. How should you bootstrap the change?",
        options: [
          "Bootstrap each quarter independently and compare intervals",
          "Resample sellers once and carry both quarters' values — the overlap makes the measurements correlated, and ignoring it overstates the variance",
          "Bootstrap only the sellers present in both",
          "Use a t-test on the difference"
        ],
        answer: 1,
        why: "This is pairing applied to resampling, and it is the opposite of the usual clustering error — ignoring positive correlation here makes the interval too *wide*. In the worked example it halved the width and reversed the conclusion."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does the bootstrap work, and why?",
        strong: "Resample your data with replacement, recompute the statistic, and use the spread of those values as the sampling distribution. It works because the empirical distribution converges to the true one, so resampling from it approximates sampling from the population.",
        answer: [
          { t: "p", text: "Naming the substitution — sample stands in for population — is what makes the method comprehensible rather than magical." },
          { t: "p", text: "Noting it reproduces the analytic standard error for a mean shows how you would sanity-check it on a new statistic." }
        ]
      },
      {
        level: "advanced",
        q: "When does the bootstrap fail?",
        strong: "On extremes and boundaries, where the statistic is not a smooth function of the distribution — a bootstrapped maximum can never exceed the sample maximum. And far more commonly, when the wrong unit is resampled: rows instead of clusters, or points instead of blocks in a time series.",
        answer: [
          { t: "p", text: "Distinguishing the exotic failure from the common one shows practical experience — the second causes almost all real damage." },
          { t: "p", text: "The atomicity diagnostic gives a concrete check rather than a list of cases to remember." }
        ]
      },
      {
        level: "advanced",
        q: "How would you put an interval on a metric with no standard error formula?",
        strong: "Bootstrap it, use BCa if the statistic is skewed, and then validate the coverage by simulating data with the same structure and counting how often the interval contains a known truth. The validation is what makes it a measurement rather than an assertion.",
        answer: [
          { t: "p", text: "Proposing to validate coverage rather than assuming it is the answer that distinguishes rigour from familiarity with the technique." },
          { t: "p", text: "Mentioning the resampling unit unprompted shows you would get the part that usually goes wrong right." }
        ]
      }
    ]
  }
});

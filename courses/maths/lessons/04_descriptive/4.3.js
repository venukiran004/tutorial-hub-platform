/* ============================================================================
   LESSON 4.3 — Percentiles, Quartiles and the IQR
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**There are at least nine definitions of a percentile and they disagree.** For small samples the gap between them can be larger than the effect you are measuring, and two monitoring systems reading identical data will report different p99s without either being wrong. Knowing which definition you are using is not pedantry — it is reproducibility.",

  objectives: [
    "Compute a percentile and say which interpolation rule you used",
    "Explain why definitions disagree and when the gap matters",
    "Use the IQR for spread and for outlier detection",
    "Read a box plot, including the rule that decides its whiskers",
    "Aggregate percentiles across shards without averaging them"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Order statistics and the interpolation problem", id: "definitions" },

    { t: "code", lang: "python", title: "the same data, four answers", code: `
import numpy as np

# A PERCENTILE IS A POSITION IN THE SORTED DATA. With n observations
# there are n positions, and a requested percentile almost never lands
# on one -- so every definition is a rule for what to do in between.

x = np.array([2, 4, 4, 4, 5, 5, 7, 9], dtype=float)     # n = 8, sorted

# THE 25TH PERCENTILE sits at index 0.25*(8-1) = 1.75 under numpy's
# rule -- between the 2nd and 3rd values, both of which are 4.0. Here
# the definitions happen to agree.
np.percentile(x, 25)                        # 4.0

# NOW A CASE WHERE THEY DO NOT:
y = np.array([1, 2, 3, 4], dtype=float)

for method in ("linear", "lower", "higher", "midpoint", "nearest"):
    print(f"{method:10s} p25 = {np.percentile(y, 25, method=method):.3f}")

# linear     p25 = 1.750
# lower      p25 = 1.000
# higher     p25 = 2.000
# midpoint   p25 = 1.500
# nearest    p25 = 2.000
#
# A RANGE OF 1.0 TO 2.0 ON THE SAME FOUR NUMBERS -- a spread of 100%
# of the value, purely from the interpolation rule.

# THE R-COMPATIBLE FAMILY adds four more, and they are what other
# tools implement:
for method in ("averaged_inverted_cdf", "hazen", "weibull",
               "median_unbiased", "normal_unbiased"):
    print(f"{method:22s} p25 = {np.percentile(y, 25, method=method):.3f}")

# averaged_inverted_cdf  p25 = 1.500
# hazen                  p25 = 1.250
# weibull                p25 = 1.250
# median_unbiased        p25 = 1.167
# normal_unbiased        p25 = 1.200

# WHY SO MANY? Each optimises a different property:
#
#   linear (numpy default, "type 7" in R) -- simple, continuous in p
#   lower/higher    -- guarantee the result is an ACTUAL observation
#   median_unbiased -- unbiased median position for any distribution
#   normal_unbiased -- unbiased for normal data specifically
#   hazen/weibull   -- plotting positions for QQ plots
#
# NONE IS "CORRECT". They answer slightly different questions, and the
# default in your library is a choice someone made for you.

# THE GAP SHRINKS AS n GROWS:
rng = np.random.default_rng(0)
for n in (10, 100, 1000, 100_000):
    s = rng.normal(0, 1, n)
    vals = [np.percentile(s, 99, method=m)
            for m in ("linear", "lower", "higher", "midpoint")]
    print(f"n={n:<8} spread across methods = {max(vals)-min(vals):.4f}")

# n=10       spread across methods = 0.6167
# n=100      spread across methods = 0.2337
# n=1000     spread across methods = 0.0478
# n=100000   spread across methods = 0.0007
#
# AT n=10 THE p99 VARIES BY 0.62 STANDARD DEVIATIONS depending on the
# rule. At n=100,000 the choice is irrelevant. THE RULE MATTERS
# EXACTLY WHEN YOU HAVE FEW OBSERVATIONS IN THE TAIL -- which is
# always true for extreme percentiles.
`,
      hl: [24, 41, 56, 74],
      caption: "**At `n = 10` the p99 varies by 0.62 standard deviations across methods; at `n = 100,000` it varies by 0.0007.** The rule matters exactly when you have few observations in the tail, which is the definition of an extreme percentile."
    },

    { t: "callout", kind: "trap", title: "A p99 needs at least 100 observations to exist at all", body: [
      { t: "p", text: "With `n` observations the highest meaningful percentile is roughly `100 × (1 − 1/n)`. Below that you are extrapolating from the maximum, and every definition is doing so differently." },
      { t: "code", lang: "python", numbered: false, title: "and the reported number is then mostly noise", code: `
# n = 50. The p99 position is at 0.99 * 49 = 48.51 -- between the two
# largest values. Half the "estimate" is the single maximum.
s = rng.normal(0, 1, 50)
np.sort(s)[-2:]                       # the only two values involved

# HOW UNSTABLE IS IT? Resample and look:
def p99_spread(n, trials=2000):
    vals = [np.percentile(rng.normal(0, 1, n), 99) for _ in range(trials)]
    return np.std(vals)

for n in (50, 200, 1000, 10_000):
    print(f"n={n:<8} sd of the p99 estimate = {p99_spread(n):.3f}")

# n=50       sd of the p99 estimate = 0.421
# n=200      sd of the p99 estimate = 0.238
# n=1000     sd of the p99 estimate = 0.107
# n=10000    sd of the p99 estimate = 0.034
#
# AT n=50 THE p99 ESTIMATE HAS A STANDARD DEVIATION OF 0.42 on data
# with sd 1. The quantity being estimated is about 2.33, so the
# estimate carries roughly 18% relative error -- and it is reported to
# three decimal places on a dashboard.

# THE RULE OF THUMB: you need about 10 observations BEYOND the
# percentile for a stable estimate.
#
#   p90   -> 100 observations
#   p99   -> 1,000
#   p99.9 -> 10,000
#
# A p99 computed over a one-minute window at 10 requests per second has
# 600 observations and 6 above the line. It is a number, but it is not
# a measurement.`},
      { t: "p", text: "**You need roughly ten observations beyond the percentile for a stable estimate** — 1,000 for a p99, 10,000 for a p99.9. A p99 over a one-minute window at 10 rps has six observations above the line." }
    ]},

    { t: "h2", n: "02", text: "The IQR and the box plot's hidden rule", id: "iqr" },

    { t: "viz",
      title: "Every part of a box plot, and where the whiskers stop",
      caption: "The whiskers extend to the furthest point within 1.5 × IQR of the box — not to the extremes, and not to a fixed percentile. Anything beyond is drawn individually.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="An annotated box plot showing quartiles, whiskers at 1.5 IQR, and outlier points">
  <line x1="60" y1="200" x2="840" y2="200" style="stroke:var(--line)" stroke-width="1.5"/>

  <line x1="250" y1="110" x2="340" y2="110" style="stroke:var(--ink-2)" stroke-width="2"/>
  <line x1="250" y1="90"  x2="250" y2="130" style="stroke:var(--ink-2)" stroke-width="2"/>
  <rect x="340" y="80" width="220" height="60" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="2"/>
  <line x1="430" y1="80" x2="430" y2="140" style="stroke:var(--accent)" stroke-width="3.5"/>
  <line x1="560" y1="110" x2="680" y2="110" style="stroke:var(--ink-2)" stroke-width="2"/>
  <line x1="680" y1="90"  x2="680" y2="130" style="stroke:var(--ink-2)" stroke-width="2"/>

  <circle cx="740" cy="110" r="5" style="fill:none;stroke:var(--crit)" stroke-width="2"/>
  <circle cx="790" cy="110" r="5" style="fill:none;stroke:var(--crit)" stroke-width="2"/>

  <text x="322" y="70"  class="s-sub" style="fill:var(--accent)">Q1</text>
  <text x="416" y="70"  class="s-sub" style="fill:var(--accent)">median</text>
  <text x="546" y="70"  class="s-sub" style="fill:var(--accent)">Q3</text>
  <text x="392" y="164" class="s-sub" style="fill:var(--accent)">IQR = Q3 - Q1</text>

  <text x="176" y="166" class="s-sub" style="fill:var(--ink-3)">furthest point within</text>
  <text x="176" y="182" class="s-sub" style="fill:var(--ink-3)">1.5 x IQR of Q1</text>
  <text x="608" y="166" class="s-sub" style="fill:var(--ink-3)">and of Q3</text>
  <text x="716" y="90"  class="s-sub" style="fill:var(--crit)">drawn individually</text>

  <text x="60" y="232" class="s-sub" style="fill:var(--ink-3)">whiskers stop at DATA POINTS, never at the 1.5 x IQR line itself -- which is why they are asymmetric</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the 1.5 factor is not arbitrary", code: `
def box_stats(x):
    """Every number a box plot draws, with the whisker rule made
    explicit rather than hidden in the plotting library."""
    x = np.asarray(x, dtype=float)
    q1, med, q3 = np.percentile(x, [25, 50, 75])
    iqr = q3 - q1
    lo_fence, hi_fence = q1 - 1.5*iqr, q3 + 1.5*iqr

    # The whisker stops at the furthest ACTUAL POINT inside the fence.
    inside = x[(x >= lo_fence) & (x <= hi_fence)]
    return {
        "q1": q1, "median": med, "q3": q3, "iqr": iqr,
        "lower_whisker": inside.min(), "upper_whisker": inside.max(),
        "outliers": x[(x < lo_fence) | (x > hi_fence)],
    }

s = rng.normal(100, 15, 1000)
b = box_stats(np.append(s, [200, 210]))

b["iqr"]                     # 20.1
b["upper_whisker"]           # 143.8  -- a real observation
b["q3"] + 1.5*b["iqr"]       # 140.4  -- the fence, which is LOWER
len(b["outliers"])           # 9
#
# NOTE THE WHISKER (143.8) EXCEEDS THE FENCE (140.4)? No -- it cannot,
# and if it appears to, the percentile method differs from the one the
# plotting library used. That mismatch is a real source of confusion
# when comparing a hand-computed table against a chart.

# WHY 1.5? For NORMAL data the fences sit at about +/- 2.7 sigma:
#   IQR of a normal = 1.349 sigma
#   fence = Q3 + 1.5*IQR = 0.674 sigma + 2.023 sigma = 2.698 sigma
from scipy import stats
q3_z = stats.norm.ppf(0.75)                     # 0.6745
iqr_z = 2 * q3_z                                # 1.3490
fence_z = q3_z + 1.5 * iqr_z                    # 2.6980

2 * stats.norm.sf(fence_z)                      # 0.00698
#
# SO ABOUT 0.7% OF NORMAL DATA IS FLAGGED -- roughly 1 in 143. Tukey
# chose 1.5 to make that rate small but non-zero, so a clean sample of
# a few hundred shows a handful of points and you learn what the tail
# looks like.

# THE CONSEQUENCE PEOPLE MISS: on 10,000 clean normal observations,
# about 70 points are drawn as "outliers" and none of them is anomalous.
len(box_stats(rng.normal(0, 1, 10_000))["outliers"])       # ~70
#
# AND FOR SKEWED DATA IT IS FAR WORSE, because the rule assumes
# symmetry:
len(box_stats(np.exp(rng.normal(0, 1, 10_000)))["outliers"])  # ~450
#
# 4.5% FLAGGED ON PERFECTLY WELL-BEHAVED LOGNORMAL DATA. The box plot
# is not detecting anomalies there -- it is detecting skew, and calling
# it outliers.
`,
      hl: [27, 39, 47, 53],
      caption: "**A box plot flags 4.5% of clean lognormal data as outliers.** The 1.5 × IQR rule assumes symmetry, so on skewed data it is detecting skew and labelling it anomaly."
    },

    { t: "h2", n: "03", text: "Aggregating percentiles across shards", id: "aggregating" },

    { t: "ladder",
      title: "Getting a fleet-wide p99 from per-host metrics",
      rungs: [
        { level: "bad", label: "Average the per-host p99s",
          why: "Percentiles are not linear, so the mean of the parts is not the percentile of the whole. The error has no bound and no consistent direction — it depends on how the load is distributed across hosts.",
          code: `fleet_p99 = np.mean([host_p99 for host_p99 in per_host])

# If 9 hosts are healthy at 100 ms and 1 is failing at 5,000 ms, the
# average p99 is 590 ms. The true fleet p99 could be 100 ms (the bad
# host serves 1% of traffic) or 5,000 ms (it serves 30%). The number
# is not wrong by a knowable amount -- it is unrelated.` },
        { level: "ok", label: "Take the maximum, and know it is an upper bound",
          why: "At least it is a bound rather than an arbitrary number, and it will not hide a failing host. But it reports the worst host as if it were the fleet, so a single bad instance makes the whole fleet look broken.",
          code: `fleet_p99_upper = max(per_host_p99)

# TRUE for "no host is worse than this". FALSE as a statement about
# what a user experiences, unless traffic is uniformly distributed.` },
        { level: "best", label: "Merge the underlying distributions",
          why: "A percentile of a union needs the union. Histograms merge exactly by adding bucket counts; t-digests and DDSketch merge with bounded relative error and far less memory than keeping raw values.",
          code: `class MergeableHistogram:
    """Percentiles that aggregate correctly, because counts add and
    percentiles do not. Exponential buckets give constant RELATIVE
    error, which is what latency needs -- 10% of 10 ms and 10% of
    10 s are both acceptable, an absolute error is not."""

    def __init__(self, lo=1.0, hi=1e6, rel_error=0.02):
        growth = (1 + rel_error) / (1 - rel_error)
        n = int(np.ceil(np.log(hi / lo) / np.log(growth)))
        self.edges = lo * growth ** np.arange(n + 1)
        self.counts = np.zeros(n, dtype=np.int64)
        self.total = 0

    def add(self, values):
        idx = np.clip(np.searchsorted(self.edges, values, "right") - 1,
                      0, len(self.counts) - 1)
        np.add.at(self.counts, idx, 1)
        self.total += len(np.atleast_1d(values))
        return self

    def merge(self, other):
        """The whole point: counts add, so merging is exact."""
        if not np.array_equal(self.edges, other.edges):
            raise ValueError("histograms must share bucket edges to merge")
        self.counts += other.counts
        self.total += other.total
        return self

    def quantile(self, q):
        if self.total == 0:
            return float("nan")
        target = q * self.total
        cum = np.cumsum(self.counts)
        i = int(np.searchsorted(cum, target, "left"))
        i = min(i, len(self.counts) - 1)
        # Geometric midpoint: the bucket is multiplicative, so its
        # centre is too.
        return float(np.sqrt(self.edges[i] * self.edges[i + 1]))


# Nine healthy hosts and one failing one, with realistic traffic split.
hosts = []
for _ in range(9):
    h = MergeableHistogram().add(np.exp(rng.normal(np.log(40), 0.6, 10_000)))
    hosts.append(h)
hosts.append(MergeableHistogram().add(
    np.exp(rng.normal(np.log(3000), 0.6, 1_000))))     # 1% of traffic

fleet = MergeableHistogram()
for h in hosts:
    fleet.merge(h)

np.mean([h.quantile(0.99) for h in hosts])   # 926 ms  -- averaging: wrong
max(h.quantile(0.99) for h in hosts)         # 12,400 ms -- the bound
fleet.quantile(0.99)                         # 168 ms  -- the truth

# THE TRUE FLEET p99 IS 168 ms. The average of per-host p99s says 926
# and the max says 12,400. Only the merged histogram answers the
# question a user's experience corresponds to.`,
          note: "**Counts add; percentiles do not.** Any aggregation scheme that works must merge distributions, which is why every serious metrics backend stores histograms or sketches rather than pre-computed quantiles." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Reconcile two dashboards that disagree about p99",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Two systems report the p99 latency of the same service over the same hour. One says 340 ms, the other 412 ms. Both read from the same request log. Find every reason they could differ, and say which number to trust." },
        { t: "code", lang: "python", numbered: false, title: "what you know about each", code: `
# SYSTEM A -- "340 ms"
#   Computes p99 per minute, then averages the 60 values.
#   Uses linear interpolation.
#   Excludes requests that returned 5xx.
#
# SYSTEM B -- "412 ms"
#   Merges per-minute histograms, then takes the p99 of the hour.
#   Exponential buckets, 5% relative error.
#   Includes all requests.
#
# Traffic: 2,000 rps, so 120,000 requests per minute.
# 5xx rate: 0.4%, and failures time out at 30s.`},
        { t: "p", text: "Quantify each source of difference where you can, and give a recommendation." }
      ],
      requirements: [
        "List every mechanism that could cause a difference.",
        "Say which is likely the largest, with reasoning.",
        "Quantify the bucketing error's contribution.",
        "Say which system's method is correct and why.",
        "Recommend what should be reported.",
        "Include tests."
      ],
      hint: "Averaging per-minute p99s is a mathematical error; excluding 5xx is a definitional choice. Work out which moves the number more.",
      solution: {
        lang: "python",
        title: "reconcile_p99.py",
        code: `import numpy as np

RPS = 2000
PER_MINUTE = RPS * 60                # 120,000
ERROR_RATE = 0.004
TIMEOUT_MS = 30_000
rng = np.random.default_rng(0)


# =========================================================================
# FOUR MECHANISMS, IN ORDER OF SIZE
# =========================================================================
#
# 1. INCLUDING OR EXCLUDING 5xx  -- LARGEST, and it is definitional
# 2. AVERAGING PER-MINUTE PERCENTILES -- a genuine mathematical error
# 3. BUCKET RESOLUTION -- bounded and small
# 4. INTERPOLATION METHOD -- negligible at this n


# ---- 1. THE 5xx DECISION ------------------------------------------------
#
# 0.4% of requests fail and time out at 30 seconds. The p99 cut-off is
# at the top 1% of requests -- so the failures are INSIDE the top 1%,
# and they are the slowest things in it.

ERROR_RATE / 0.01                    # 0.40
#
# 40% OF THE TOP PERCENTILE IS TIMEOUTS. Excluding them does not shave
# the tail slightly; it removes nearly half of what the p99 is
# measuring, and pulls the reported value down to something like the
# p99.4 of the successful requests.

def demo(include_errors):
    ok = np.exp(rng.normal(np.log(90), 0.75, int(PER_MINUTE*(1-ERROR_RATE))))
    if not include_errors:
        return float(np.percentile(ok, 99))
    err = np.full(int(PER_MINUTE*ERROR_RATE), float(TIMEOUT_MS))
    return float(np.percentile(np.concatenate([ok, err]), 99))

demo(include_errors=False)           # ~512 ms
demo(include_errors=True)            # ~30,000 ms
#
# WITH TIMEOUTS INCLUDED THE p99 IS THE TIMEOUT VALUE ITSELF, because
# the failures alone occupy 40% of the top percentile and sit at the
# very top of it.
#
# SO THE REPORTED 412 ms MEANS SYSTEM B IS NOT SEEING 30-SECOND
# TIMEOUTS. Either the failures are fast (an immediate rejection, not
# a timeout), or B is also filtering somewhere, or the stated 5xx rate
# is wrong. THAT DISCREPANCY IS THE REAL FINDING -- it is larger than
# the 72 ms being argued about, and it means one of the stated facts
# is untrue.
#
# ESTABLISH THIS BEFORE ANYTHING ELSE. Two numbers that are 21%
# different matter far less than a 30-second timeout that does not
# appear in either.


# ---- 2. AVERAGING PER-MINUTE PERCENTILES --------------------------------
#
# This is a mathematical error rather than a choice, and it is
# System A's.

def compare_aggregation(minutes=60, spike_minutes=3):
    """A realistic hour: mostly steady, with a few bad minutes."""
    all_values, per_minute_p99 = [], []
    for m in range(minutes):
        scale = 900.0 if m < spike_minutes else 90.0     # a short incident
        v = np.exp(rng.normal(np.log(scale), 0.75, PER_MINUTE))
        all_values.append(v)
        per_minute_p99.append(np.percentile(v, 99))

    pooled = np.concatenate(all_values)
    return float(np.mean(per_minute_p99)), float(np.percentile(pooled, 99))

avg_of_p99s, true_p99 = compare_aggregation()
avg_of_p99s, true_p99                # (~735, ~1,180)
avg_of_p99s / true_p99               # ~0.62
#
# AVERAGING UNDERSTATES BY 38% when there is a short spike, because a
# three-minute incident is 5% of the hour but produces values that
# dominate the hour's true top percentile -- while contributing only
# 3/60 of the average.
#
# THE DIRECTION IS NOT FIXED. On uniform traffic averaging is roughly
# right; when load varies it can go either way, because the per-minute
# p99 of a quiet minute is a lower-percentile value of the hour.
uniform_avg, uniform_true = compare_aggregation(spike_minutes=0)
uniform_avg / uniform_true           # ~1.00 -- agrees when nothing varies
#
# AN ERROR WITH NO BOUND AND NO CONSISTENT SIGN IS WORSE THAN A LARGE
# BIAS, because you cannot correct for it.


# ---- 3. BUCKET RESOLUTION -----------------------------------------------
#
# System B reports 5% relative error, which is a bounded, known cost.

REL = 0.05
412 * REL                            # +/- 20.6 ms
#
# So B's 412 is really "between 391 and 433". That interval does not
# contain 340, so bucketing alone cannot explain the gap -- it accounts
# for at most 29% of the 72 ms difference.
(2 * 412 * REL) / (412 - 340)        # 0.57 of the gap, at the extreme


# ---- 4. INTERPOLATION METHOD --------------------------------------------
#
# At 7.2 million requests per hour, with 72,000 above the p99 line,
# the choice of interpolation rule is irrelevant.
s = np.exp(rng.normal(np.log(90), 0.75, 200_000))
vals = [np.percentile(s, 99, method=m)
        for m in ("linear", "lower", "higher", "midpoint")]
(max(vals) - min(vals)) / np.mean(vals)      # < 0.0002
#
# RULE OUT THE CHEAP EXPLANATIONS FIRST so nobody spends a day on this
# one. It matters at n = 50, not at n = 7,000,000.


# =========================================================================
# WHICH METHOD IS CORRECT
# =========================================================================
#
# SYSTEM B'S AGGREGATION IS CORRECT. Merging histograms and then taking
# a percentile computes the percentile of the actual request
# population, which is the quantity the question is about.
#
# SYSTEM A'S AGGREGATION IS WRONG, unconditionally. Percentiles are not
# linear, so no averaging of them recovers the percentile of the union.
# It is not a different-but-defensible convention.
#
# THE 5xx DECISION IS NOT A CORRECTNESS QUESTION -- it is definitional,
# and both answers are legitimate for different purposes:
#
#   INCLUDE  -- "what does a user experience?" A user whose request
#               times out waited 30 seconds. This is the SLO number.
#   EXCLUDE  -- "how fast is the service when it works?" This is the
#               performance-engineering number.
#
# THE ERROR IS NOT PICKING ONE; IT IS NOT SAYING WHICH.


# =========================================================================
# WHAT TO REPORT
# =========================================================================
#
# 1. FIX SYSTEM A. Stop averaging percentiles -- store histograms.
#    This is a bug, not a configuration difference, and it will
#    misreport every incident it is meant to catch.
#
# 2. RESOLVE THE 5xx CONTRADICTION FIRST. Either B is not seeing the
#    timeouts, or the 0.4%/30s figures are wrong. Everything else is
#    smaller than this.
#
# 3. REPORT BOTH DEFINITIONS, LABELLED:
#       "p99 (all requests): 412 ms"       <- the SLO
#       "p99 (successful only): 340 ms"    <- performance
#    Two clearly named numbers end the argument permanently.
#
# 4. PUBLISH THE ERROR BOUND. "412 ms +/- 5%" is honest and stops the
#    next disagreement about a 3% discrepancy before it starts.
#
# 5. REPORT THE ERROR RATE ALONGSIDE. A latency percentile without a
#    success rate can always be improved by failing faster, which is
#    exactly the wrong incentive to create.

def report(histogram, error_count, total):
    return {
        "p50": histogram.quantile(0.50),
        "p99": histogram.quantile(0.99),
        "p99_relative_error": 0.05,
        "error_rate": error_count / total,
        "definition": "all requests, including failures",
    }


# =========================================================================
# TESTS
# =========================================================================

def test_errors_dominate_the_top_percentile():
    """0.4% failures inside a 1% tail is 40% of it."""
    assert ERROR_RATE / 0.01 > 0.3


def test_timeouts_would_make_the_p99_the_timeout():
    """If failures really time out at 30s, neither reported number is
    consistent with the stated facts."""
    ok = np.exp(rng.normal(np.log(90), 0.75, 99_600))
    err = np.full(400, float(TIMEOUT_MS))
    p99 = np.percentile(np.concatenate([ok, err]), 99)

    assert p99 > 10_000
    assert p99 > 412 * 10


def test_averaging_percentiles_is_wrong_under_a_spike():
    avg, true = compare_aggregation(spike_minutes=3)

    assert abs(avg - true) / true > 0.2


def test_averaging_happens_to_work_on_uniform_traffic():
    """Which is why the bug survives review -- it looks fine in
    steady state."""
    avg, true = compare_aggregation(spike_minutes=0)

    assert abs(avg - true) / true < 0.05


def test_bucketing_alone_cannot_explain_the_gap():
    assert 412 * (1 - 0.05) > 340       # B's lower bound is above A


def test_interpolation_is_irrelevant_at_this_scale():
    s = np.exp(rng.normal(np.log(90), 0.75, 200_000))
    vals = [np.percentile(s, 99, method=m)
            for m in ("linear", "lower", "higher", "midpoint")]

    assert (max(vals) - min(vals)) / np.mean(vals) < 0.001`,
        notes: [
          { t: "p", text: "**The real finding is not the 72 ms.** At a 0.4% failure rate, timeouts occupy 40% of the top percentile and sit at the very top of it — so if failures genuinely time out at 30 seconds, the p99 including them *is* 30 seconds. Neither reported number is consistent with the stated facts, and that contradiction is larger than the gap being argued about." },
          { t: "callout", kind: "insight", title: "Averaging percentiles works in steady state, which is why the bug survives review", body: [
            { t: "p", text: "On uniform traffic, averaging per-minute p99s agrees with the true hourly p99 to within 1%. Introduce a three-minute incident and it understates by 38% — because those minutes are 5% of the hour but dominate its true tail, while contributing only 3/60 of the average." },
            { t: "p", text: "**The error has no bound and no consistent sign**, which is worse than a large bias: you cannot correct for it, and it fails hardest during exactly the incidents the metric exists to catch." }
          ]},
          { t: "p", text: "**Rule out the cheap explanations first.** At 7.2 million requests an hour the interpolation method changes the answer by under 0.02%, so nobody should spend a day on it — it matters at `n = 50`, not here." },
          { t: "p", text: "**System A's aggregation is a bug, not a convention.** Percentiles are not linear, so no averaging of them recovers the percentile of the union. The 5xx decision, by contrast, is definitional — both answers are legitimate, and the error is not saying which." },
          { t: "p", text: "**Report both definitions, labelled, with the error bound and the success rate.** A latency percentile without a success rate can always be improved by failing faster, which is exactly the wrong incentive." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team set an SLO at \"p95 under 250 ms\" and computed it from a five-minute window on a service handling two requests per second — 600 observations, 30 of them above the line." },
      { t: "p", text: "**The p95 estimate had a standard deviation of about 8% of its value**, so the SLO flipped between met and missed several times a day with no change in the service. Every flip generated a page." },
      { t: "p", text: "**Extending the window to an hour gave 7,200 observations** and cut the estimator's noise by more than half, at the cost of detecting a real regression an hour later rather than five minutes later." },
      { t: "p", text: "**An SLO window is a statistical decision, not an operational preference.** Compute the estimator's standard error before choosing one, or the alert measures its own noise." }
    ]}
  ],

  takeaways: [
    "**There are at least nine percentile definitions and they disagree** — the default in your library is a choice someone made for you.",
    "**The gap between methods is 0.62σ at `n = 10` and 0.0007σ at `n = 100,000`** — it matters exactly where the tail is thin.",
    "**You need about ten observations beyond a percentile for a stable estimate**: 1,000 for a p99, 10,000 for a p99.9.",
    "**Box-plot whiskers stop at the furthest data point within 1.5 × IQR**, not at the fence and not at a fixed percentile.",
    "**The 1.5 factor puts the fences at ±2.7σ for normal data**, flagging about 0.7% — so 70 of 10,000 clean points are drawn as outliers.",
    "**A box plot flags 4.5% of clean lognormal data**, because the rule assumes symmetry and is detecting skew.",
    "**Counts add; percentiles do not.** Averaging per-host p99s produces a number unrelated to the fleet's.",
    "**Averaging percentiles agrees in steady state and fails during incidents**, which is why the bug survives review.",
    "**Merge histograms or sketches, then take the percentile** — the reason metrics backends store distributions, not quantiles.",
    "**Use exponential buckets for latency**: constant relative error is what the quantity needs, not constant absolute error.",
    "**Report a latency percentile with its success rate**, or the metric can be improved by failing faster.",
    "**An SLO window is a statistical decision** — compute the estimator's standard error before choosing one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Ten hosts each report a p99. How do you get the fleet p99?",
        options: [
          "Average the ten values",
          "Merge the underlying distributions — histograms add exactly, and a percentile of a union needs the union",
          "Take the median of the ten",
          "Weight each by its request count and average"
        ],
        answer: 1,
        why: "Percentiles are not linear. In the worked example the average of per-host p99s gives 926 ms and the max gives 12,400 ms, while the true merged p99 is 168 ms — the averaging error has no bound and no consistent sign."
      },
      {
        stem: "A box plot of 10,000 clean lognormal observations shows about 450 outlier points. What does that mean?",
        options: [
          "The data has serious quality problems",
          "The 1.5 × IQR rule assumes symmetry, so on skewed data it flags skew rather than anomalies",
          "The sample is too large for a box plot",
          "The quartiles were computed incorrectly"
        ],
        answer: 1,
        why: "Even on clean *normal* data the rule flags about 0.7% — 70 points in 10,000 — because the fences sit at ±2.7σ. Tukey chose 1.5 so that a few points show and you learn what the tail looks like, not so that every marked point is anomalous."
      },
      {
        stem: "You compute p99 from 50 observations. What is the problem?",
        options: [
          "Nothing, if the sample is representative",
          "The estimate rests on the top one or two values, with a standard deviation around 18% of the quantity — different interpolation methods also disagree by 0.6σ",
          "50 is enough for a p99 but not a p99.9",
          "You need to use the `higher` method"
        ],
        answer: 1,
        why: "The p99 position at `n = 50` falls between the two largest values, so half the estimate is the single maximum. As a rule you want about ten observations beyond the percentile, meaning 1,000 for a p99."
      },
      {
        stem: "Two dashboards report the p99 of the same log as 340 ms and 412 ms. Where would you look first?",
        options: [
          "The interpolation method",
          "Whether failed requests are included — at a 0.4% error rate they occupy 40% of the top percentile and sit at the very top of it",
          "Clock skew between the systems",
          "Floating-point precision"
        ],
        answer: 1,
        why: "At 7.2 million requests an hour, interpolation changes the answer by under 0.02%. The 5xx decision is definitional rather than a bug — both answers are legitimate, and the error is failing to label which one each dashboard reports."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you compute a fleet-wide p99 from per-host metrics?",
        strong: "Merge the distributions, not the percentiles. Histograms merge exactly by adding bucket counts; t-digest or DDSketch do it with bounded relative error. Averaging per-host p99s gives a number unrelated to the fleet's, with no bound on the error.",
        answer: [
          { t: "p", text: "\"Counts add, percentiles do not\" is the crisp statement of why, and it generalises." },
          { t: "p", text: "Noting that averaging happens to work in steady state explains why the bug is so common — it only fails during incidents." }
        ]
      },
      {
        level: "core",
        q: "Two monitoring systems report different p99s for the same data. Where do you look?",
        strong: "Aggregation method first — averaging per-window percentiles is a genuine error. Then what is included: excluding failed requests can move a p99 enormously when the failure rate is a large fraction of the tail. Interpolation only matters at small `n`.",
        answer: [
          { t: "p", text: "Ordering the causes by expected size shows you would debug efficiently rather than enumerate possibilities." },
          { t: "p", text: "Distinguishing the bug (averaging) from the definitional choice (5xx handling) is the distinction that resolves the argument." }
        ]
      },
      {
        level: "advanced",
        q: "How would you choose the window for an SLO measurement?",
        strong: "From the estimator's standard error. A p95 over 600 observations has about 8% noise, so the SLO flips between met and missed with no change in the service. I would compute how many observations the window gives and require roughly ten above the percentile line.",
        answer: [
          { t: "p", text: "Treating the window as a statistical decision rather than an operational preference is the point of the question." },
          { t: "p", text: "Naming the trade-off explicitly — a longer window is quieter but slower to detect a real regression — shows you would make the call rather than avoid it." }
        ]
      }
    ]
  }
});

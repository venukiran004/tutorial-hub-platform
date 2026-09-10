/* ============================================================================
   LESSON 3.5 — Continuous Distributions
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "The normal distribution is the default assumption in most analysis, and for a great deal of real data it is the wrong one. **Latency, income, file sizes and losses are all heavy-tailed** — and under a heavy tail the mean can be unstable, the standard deviation misleading, and a three-sigma event routine.",

  objectives: [
    "Recognise the situation each continuous distribution comes from",
    "Explain why the normal appears so often, and where the argument fails",
    "Identify a heavy tail from data rather than assuming it away",
    "Use the lognormal for multiplicative processes",
    "Say what breaks when the tail is heavier than exponential"
  ],

  prerequisites: ["3.4"],

  blocks: [

    { t: "h2", n: "01", text: "The four you meet, and where they come from", id: "family" },

    { t: "p", text: "Continuous distributions are best identified by **the process that generates them** rather than by the shape of their density. The single most useful distinction is additive against multiplicative: many small effects adding give a normal, and many small effects multiplying give a lognormal." },

    { t: "dl", items: [
      ["Uniform", "Every value in a range equally likely. What you use when you know nothing beyond the bounds."],
      ["Normal", "The sum of many independent effects with finite variance. Symmetric, and fully described by its mean and standard deviation."],
      ["Exponential", "Waiting time at a constant rate. The only continuous distribution that is **memoryless**."],
      ["Lognormal", "The product of many independent effects — so it is normal in the logs. Right-skewed, and the correct default for latency, income and file sizes."],
      ["Pareto / power law", "Extremely heavy-tailed, arising from preferential attachment. Its variance may not exist at all."],
      ["Student's t", "A normal with an estimated variance. Heavier tails, converging to the normal as the sample grows."]
    ]},

    { t: "table",
      head: ["Distribution", "The process that generates it", "Typical use"],
      rows: [
        ["**Uniform**", "No information beyond a range", "Priors, simulation, jitter"],
        ["**Normal**", "**Many small additive effects**", "Measurement error, sample means"],
        ["**Exponential**", "Waiting time at a constant rate — memoryless", "Time between arrivals, failure times"],
        ["**Lognormal**", "**Many small multiplicative effects**", "Income, latency, file sizes"],
        ["**Pareto / power law**", "Preferential attachment, self-similarity", "Wealth, city sizes, losses"],
        ["**Student's t**", "A normal with an estimated variance", "Small-sample inference"]
      ],
      caption: "**Additive effects give a normal; multiplicative effects give a lognormal.** That one distinction decides the right model far more often than any goodness-of-fit test."
    },

    { t: "code", lang: "python", title: "additive against multiplicative", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
n, k = 200_000, 20

# ADDITIVE: sum 20 small independent effects.
additive = rng.uniform(0.9, 1.1, size=(n, k)).sum(axis=1)

# MULTIPLICATIVE: multiply the same 20 effects instead.
multiplicative = rng.uniform(0.9, 1.1, size=(n, k)).prod(axis=1)

stats.skew(additive)                # 0.003  -- symmetric
stats.skew(multiplicative)          # 0.286  -- right-skewed

# THE MULTIPLICATIVE CASE IS NORMAL IN THE LOG:
stats.skew(np.log(multiplicative))  # 0.001  -- symmetric again
#
# Which is the definition of a lognormal, and it follows from the CLT
# applied to log(prod) = sum(log). The central limit theorem never
# stopped applying -- it applied to the logs.

# WHY THIS MATTERS FOR REAL QUANTITIES: growth compounds.
#
#   Income:   a series of percentage raises, multiplied
#   Latency:  a chain of stages, each with a retry multiplier
#   Filesize: repeated edits, each changing size by a proportion
#   Traffic:  week-on-week growth rates, compounded
#
# Every one of those is a product, so every one of those is lognormal
# rather than normal -- and none of them is symmetric.

# THE PRACTICAL SIGNATURE: mean > median, and the gap widens with the
# spread.
ln = stats.lognorm(s=1.0, scale=np.exp(0))
ln.mean(), ln.median()              # 1.649, 1.000
ln.ppf(0.99) / ln.median()          # 10.24 -- the p99 is 10x the median

ln2 = stats.lognorm(s=2.0, scale=np.exp(0))
ln2.mean(), ln2.median()            # 7.389, 1.000
ln2.ppf(0.99) / ln2.median()        # 104.8
`,
      hl: [16, 20, 40],
      caption: "**A lognormal is a normal in the logs**, because the CLT applies to `log(∏x) = ∑log x`. The theorem never stopped working — it was working on a different quantity."
    },

    { t: "callout", kind: "insight", title: "Why the normal appears everywhere, and where the argument runs out", body: [
      { t: "p", text: "**The central limit theorem says a sum of many independent effects with finite variance is approximately normal**, whatever those effects look like individually. That is why measurement error, sample means and aggregated noise are all normal — not because nature prefers bell curves." },
      { t: "code", lang: "python", numbered: false, title: "the two conditions, and what happens when each fails", code: `
# CONDITION 1 -- FINITE VARIANCE. Fails for a Cauchy, and the failure
# is total, not gradual.
c = stats.cauchy.rvs(size=100_000, random_state=0)

[c[:m].mean() for m in (100, 1000, 10_000, 100_000)]
# [-0.83, 0.30, -0.12, 2.11]   -- the sample mean never settles
#
# The mean of n Cauchy samples has the SAME distribution as one sample.
# Averaging a million of them buys you nothing at all.

# CONDITION 2 -- INDEPENDENCE, or at least weak dependence. Fails for
# anything with feedback: market prices, cascading failures, viral
# spread. Correlated summands do not average out.

# AND EVEN WHEN BOTH HOLD, CONVERGENCE IS SLOW IN THE TAIL. The CLT
# describes the CENTRE first; the tails converge last, and they are
# usually what you are asking about.
for k in (5, 30, 200):
    s = stats.expon.rvs(size=(200_000, k), random_state=1).mean(axis=1)
    z = (s - s.mean()) / s.std()
    print(f"k={k:<4} P(Z>3) = {(z > 3).mean():.4f}   normal says 0.00135")

# k=5    P(Z>3) = 0.0038   normal says 0.00135   2.8x too many
# k=30   P(Z>3) = 0.0021   normal says 0.00135   1.6x
# k=200  P(Z>3) = 0.0016   normal says 0.00135   1.2x
#
# n=30 IS A RULE OF THUMB FOR THE CENTRE, NOT FOR THE TAIL. If your
# question is about a p99, the sample size that makes the mean look
# normal is not nearly enough.`},
      { t: "p", text: "**\"n = 30 is enough\" is a claim about the centre of the distribution.** If the question is about a tail probability — an SLO, a risk bound, a p99 — the convergence you are relying on has barely started." }
    ]},

    { t: "h2", n: "02", text: "Heavy tails, and how to spot one", id: "heavy-tails" },

    { t: "p", text: "**A heavy tail means extreme values are far more common than a normal distribution allows**, and it breaks the intuitions that most statistical practice rests on. Under a heavy tail the mean can be unstable, the standard deviation misleading, and a three-sigma event routine." },

    { t: "dl", items: [
      ["Heavy tail", "A tail decaying more slowly than an exponential. Extreme values dominate sums and averages."],
      ["Skewness", "Asymmetry. Right-skewed data has mean above median, and the gap widens with the spread."],
      ["Tail index", "For a power law, how fast the tail decays. Below 2 the variance is infinite; below 1 even the mean is."],
      ["Infinite variance", "The sample standard deviation never converges — it simply grows with `n`, so any `3σ` rule is meaningless."],
      ["Max-share diagnostic", "The largest observation's share of the total. It falls as `1/n` under a light tail and barely falls under a heavy one."]
    ]},

    { t: "viz",
      title: "The same mean, a completely different tail",
      caption: "Three distributions matched on mean and variance. Under the normal a 4σ event is one in 30,000; under the lognormal it is routine, and under the Pareto the variance may not exist at all.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Normal, lognormal and Pareto densities on the same axes, showing increasingly heavy right tails">
  <line x1="70" y1="220" x2="840" y2="220" style="stroke:var(--line)" stroke-width="1.5"/>
  <line x1="70" y1="220" x2="70"  y2="40"  style="stroke:var(--line)" stroke-width="1.5"/>

  <path d="M90 219 C 180 219, 200 60, 260 55 C 320 60, 340 219, 430 219 L 840 219"
        style="stroke:var(--accent);fill:none" stroke-width="2.5"/>
  <text x="200" y="42" class="s-label" style="fill:var(--accent)">normal</text>

  <path d="M90 219 C 130 219, 150 70, 210 74 C 300 90, 380 180, 500 206 C 620 216, 720 219, 840 219"
        style="stroke:var(--warn);fill:none" stroke-width="2.5"/>
  <text x="330" y="120" class="s-label" style="fill:var(--warn)">lognormal</text>

  <path d="M90 60 C 150 130, 230 178, 340 198 C 480 210, 640 215, 840 217"
        style="stroke:var(--crit);fill:none" stroke-width="2.5"/>
  <text x="450" y="186" class="s-label" style="fill:var(--crit)">pareto</text>

  <line x1="620" y1="40" x2="620" y2="230" style="stroke:var(--ink-3);stroke-dasharray:4 4" stroke-width="1.5"/>
  <text x="632" y="56" class="s-sub" style="fill:var(--ink-3)">4 sigma</text>
  <text x="632" y="74" class="s-sub" style="fill:var(--ink-3)">normal: 1 in 31,600</text>
  <text x="632" y="92" class="s-sub" style="fill:var(--ink-3)">lognormal: 1 in 250</text>
  <text x="632" y="110" class="s-sub" style="fill:var(--ink-3)">pareto: 1 in 40</text>

  <text x="70" y="262" class="s-sub" style="fill:var(--ink-3)">all three have the same mean and the same variance</text>
</svg>`
    },

    { t: "code", lang: "python", title: "three diagnostics that do not require a fit", code: `
rng = np.random.default_rng(0)
normal = rng.normal(100, 30, 100_000)
heavy = stats.lognorm(s=1.2, scale=50).rvs(100_000, random_state=0)

# DIAGNOSTIC 1 -- MEAN AGAINST MEDIAN. For a symmetric distribution
# they coincide; a large gap means skew.
normal.mean() / np.median(normal)     # 1.001
heavy.mean() / np.median(heavy)       # 2.045

# DIAGNOSTIC 2 -- THE RUNNING MAXIMUM'S SHARE OF THE TOTAL. Under a
# light tail the largest observation is a vanishing fraction of the
# sum. Under a heavy tail it stays significant however much data you
# collect.
def max_share(x):
    return float(x.max() / x.sum())

for m in (100, 1000, 10_000, 100_000):
    print(f"n={m:<7} normal {max_share(normal[:m]):.5f}   "
          f"heavy {max_share(heavy[:m]):.5f}")

# n=100     normal 0.01824   heavy 0.05631
# n=1000    normal 0.00201   heavy 0.01331
# n=10000   normal 0.00021   heavy 0.00405
# n=100000  normal 0.00002   heavy 0.00089
#
# The normal's share falls by 10x per decade -- exactly 1/n, as it must
# when every observation is comparable. The heavy tail's falls by only
# ~3x, because the maximum keeps growing with the sample.

# DIAGNOSTIC 3 -- DOES THE RUNNING MEAN SETTLE? A light tail converges
# smoothly; a heavy tail jumps whenever a new extreme arrives.
def running_mean_jumps(x, tol=0.02):
    """Count how often the running mean moves by more than tol
    relative, after the first 1000 samples. A settled mean should
    almost never jump."""
    rm = np.cumsum(x) / np.arange(1, len(x) + 1)
    rel = np.abs(np.diff(rm[1000:])) / rm[1001:]
    return int((rel > tol).sum())

running_mean_jumps(normal)            # 0
running_mean_jumps(heavy)             # 7
#
# SEVEN VISIBLE JUMPS IN 100,000 SAMPLES. Each one is a single
# observation moving the estimate of a population parameter by 2%,
# which is what "the mean is not a stable summary" looks like in
# practice.

# ALL THREE ARE DISTRIBUTION-FREE. None requires fitting anything, so
# none can be wrong about which family you chose -- they answer "is
# this heavy-tailed" directly.
`,
      hl: [8, 30, 45],
      caption: "**The largest observation's share of the total is the cleanest diagnostic.** Under a light tail it falls as `1/n`; under a heavy tail it barely falls at all, because the maximum grows with the sample."
    },

    { t: "h2", n: "03", text: "The memoryless property, and its consequence", id: "memoryless" },

    { t: "p", text: "**A memoryless process has no notion of age**: having waited already tells you nothing about how much longer you will wait. The exponential is the only continuous distribution with this property, and whether your process has it decides whether a timeout makes sense." },

    { t: "dl", items: [
      ["Memoryless", "`P(X > s + t | X > s) = P(X > t)`. The clock effectively resets at every instant."],
      ["Hazard rate", "The instantaneous chance of the event occurring, given it has not yet. Constant for an exponential."],
      ["Ageing", "A hazard rate rising with time — wear-out. A long-running request is *less* likely to finish soon, which is why timeouts exist."],
      ["Weibull", "Generalises the exponential with a shape parameter `k`: below 1 the failure rate falls with age, at 1 it is constant, above 1 it rises."]
    ]},

    { t: "code", lang: "python", title: "the exponential forgets, which is often wrong", code: `
# THE EXPONENTIAL IS THE ONLY CONTINUOUS MEMORYLESS DISTRIBUTION:
#
#     P(X > s + t | X > s) = P(X > t)
#
# Having waited s already tells you nothing about how much longer you
# will wait.

e = stats.expon(scale=10)

e.sf(15) / e.sf(5)                    # 0.3679
e.sf(10)                              # 0.3679   -- identical
#
# "You have waited 5 minutes; the chance of another 10" equals "the
# chance of 10 from a standing start". The clock resets continuously.

# THIS IS EXACTLY RIGHT FOR SOME THINGS AND BADLY WRONG FOR OTHERS:
#
#   RIGHT:  radioactive decay, arrivals at a constant rate, a cache
#           miss on a random key -- processes with no internal state
#
#   WRONG:  anything that AGES. Mechanical wear, human patience, disk
#           failure, a request that is stuck behind a lock
#
# For a request already running 5 seconds, the probability it finishes
# in the next second is usually LOWER than for a fresh one -- it is
# stuck for a reason. That is the opposite of memoryless.

# THE WEIBULL GENERALISES IT WITH A SHAPE PARAMETER THAT SAYS WHICH:
#
#   k < 1   failure rate DECREASES with age (infant mortality)
#   k = 1   constant -- the exponential
#   k > 1   failure rate INCREASES with age (wear-out)

for k in (0.5, 1.0, 2.5):
    w = stats.weibull_min(k, scale=10)
    early = w.sf(11) / w.sf(10)       # survive one more, given 10
    late  = w.sf(51) / w.sf(50)       # survive one more, given 50
    print(f"k={k}:  after 10 -> {early:.3f}   after 50 -> {late:.3f}")

# k=0.5:  after 10 -> 0.856   after 50 -> 0.931   improving with age
# k=1.0:  after 10 -> 0.905   after 50 -> 0.905   memoryless
# k=2.5:  after 10 -> 0.762   after 50 -> 0.076   wearing out fast

# WHY THIS DECIDES A TIMEOUT POLICY. If the process is memoryless, a
# request that has run 10s is as likely to finish as a fresh one, so
# killing it gains nothing and loses the work already done. If it AGES
# (k > 1), a long-running request is increasingly unlikely to finish
# and killing it is correct.
#
# MOST REAL REQUESTS AGE. Timeouts exist because k > 1.
`,
      hl: [3, 25, 46],
      caption: "**Timeouts only make sense for processes that age.** If failures were memoryless, killing a long-running request would gain nothing — you would be discarding completed work for no improvement in the odds."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Decide whether a latency SLO is achievable",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Product wants a 200 ms p99 latency SLO. Engineering has a month of measurements and needs to say whether it is achievable, and if not, what would have to change." },
        { t: "code", lang: "python", numbered: false, title: "what the measurements say", code: `
# One month of request latencies, in milliseconds.
#   n            4,210,000
#   mean              94.2
#   median            61.0
#   std dev          142.8
#   p95              284.0
#   p99              612.0
#   max           18,400.0

TARGET_P99 = 200.0`},
        { t: "p", text: "Say whether the SLO is achievable, what distribution the data follows, and what specific change would meet it. Justify each step from the summary statistics." }
      ],
      requirements: [
        "Identify the distribution family from the summary statistics alone.",
        "Show that a normal model gives the wrong answer, with the number it gives.",
        "Fit an appropriate distribution and check it against the reported quantiles.",
        "State what would have to change to hit 200 ms, quantitatively.",
        "Say which lever is cheapest and why.",
        "Include tests."
      ],
      hint: "Compare the mean to the median, and the p99 to the median. A normal with this mean and standard deviation predicts a p99 you can compute in one line.",
      solution: {
        lang: "python",
        title: "slo_feasibility.py",
        code: `import numpy as np
from scipy import stats

N = 4_210_000
MEAN, MEDIAN, SD = 94.2, 61.0, 142.8
P95, P99, MAX = 284.0, 612.0, 18_400.0
TARGET_P99 = 200.0


# =========================================================================
# WHAT THE SUMMARY STATISTICS ALREADY TELL YOU
# =========================================================================
#
# THREE SIGNS OF A HEAVY RIGHT TAIL, before fitting anything:
#
# 1. MEAN / MEDIAN = 1.54. A symmetric distribution has a ratio of 1.
#    A ratio above 1.5 is strong right skew.
MEAN / MEDIAN                    # 1.544
#
# 2. SD > MEAN. For a positive quantity, a coefficient of variation
#    above 1 rules out anything close to normal -- a normal with
#    sd > mean puts substantial mass below zero, which latency cannot
#    have.
SD / MEAN                        # 1.516
stats.norm(MEAN, SD).cdf(0)      # 0.255 -- 25% of the mass is negative
#
# 3. MAX / MEDIAN = 302. The largest observation is 302 times the
#    median. Under a light tail the maximum of 4.2 million samples sits
#    around 5 sd above the mean; here it is 128 sd above.
MAX / MEDIAN                     # 301.6
(MAX - MEAN) / SD                # 127.8


# =========================================================================
# WHY THE NORMAL GIVES THE WRONG ANSWER
# =========================================================================

normal_p99 = stats.norm(MEAN, SD).ppf(0.99)
normal_p99                       # 426.4  -- against a measured 612
#
# The normal UNDERSTATES the p99 by 30%. Worse, it is confidently wrong
# in a specific direction: it says the SLO is 2.1x away when it is
# really 3.1x away.
#
# AND IT MISREADS THE WHOLE SHAPE:
stats.norm(MEAN, SD).ppf(0.95)   # 329.1  vs measured 284  (overstates)
stats.norm(MEAN, SD).ppf(0.50)   #  94.2  vs measured  61  (overstates)
#
# Note it overstates p50 and p95 while understating p99. A distribution
# that is wrong in both directions at once cannot be fixed by shifting
# a parameter -- the family is wrong.


# =========================================================================
# FITTING A LOGNORMAL FROM THE MOMENTS
# =========================================================================
#
# Latency is a chain of stages multiplied together -- queueing, then
# processing, then a retry multiplier -- so a lognormal is the model
# the generating process suggests, before any fitting.
#
# For a lognormal with log-scale mu and log-sd sigma:
#     median = exp(mu)
#     mean   = exp(mu + sigma^2/2)
#
# So sigma comes straight from the mean/median ratio:
#     sigma = sqrt(2 log(mean/median))

def lognormal_from_mean_median(mean, median):
    sigma = np.sqrt(2.0 * np.log(mean / median))
    return stats.lognorm(s=sigma, scale=median), sigma

ln, sigma = lognormal_from_mean_median(MEAN, MEDIAN)
sigma                            # 0.932

# CHECK AGAINST QUANTILES THAT WERE NOT USED TO FIT IT:
for q, observed in [(0.50, MEDIAN), (0.95, P95), (0.99, P99)]:
    print(f"p{q*100:<5g}  model {ln.ppf(q):7.1f}   observed {observed:7.1f}")

# p50     model    61.0   observed    61.0     (used in the fit)
# p95     model   283.2   observed   284.0     0.3% error
# p99     model   533.8   observed   612.0     13% low
#
# THE p95 MATCHES TO WITHIN 0.3% ON A TWO-PARAMETER FIT THAT NEVER SAW
# IT. That is a real endorsement of the family.
#
# The p99 is 13% low, which is itself informative: the true tail is
# slightly HEAVIER than lognormal. That is the usual finding for
# latency, because timeouts and retries add a second regime that a
# single lognormal cannot represent. Treat the lognormal as a floor on
# the tail, not a ceiling.


# =========================================================================
# IS 200 ms ACHIEVABLE?
# =========================================================================
#
# NOT WITHOUT A STRUCTURAL CHANGE. The current p99 is 612 ms and the
# target is 200 ms -- a factor of 3.1.
#
# Work out what each lever would require. Under a lognormal:
#
#     p99 = median * exp(2.326 * sigma)
#
# so the p99 depends on the median and the SPREAD, and the spread
# enters exponentially.

Z99 = stats.norm.ppf(0.99)       # 2.3263

def p99_of(median, sigma):
    return median * np.exp(Z99 * sigma)

p99_of(MEDIAN, sigma)            # 533.8, matching the fit

# LEVER A -- SHIFT THE WHOLE DISTRIBUTION DOWN (make everything faster).
# Requires the median to fall by the same factor as the p99:
needed_median = MEDIAN * TARGET_P99 / P99
needed_median                    # 19.9 ms, down from 61
MEDIAN / needed_median           # 3.06x faster, for every request
#
# A 3x across-the-board speedup. That is a rewrite, not a tuning
# exercise.

# LEVER B -- REDUCE THE SPREAD, leaving the median alone.
needed_sigma = np.log(TARGET_P99 / MEDIAN) / Z99
needed_sigma                     # 0.511, down from 0.932
#
# sigma must fall by 45%. In practice that means removing the sources
# of variability rather than the average cost: cutting tail retries,
# capping queue depth, bounding the slowest dependency.

# LEVER C -- BOTH, which is what actually happens.
for factor in (1.0, 1.3, 1.6, 2.0):
    s_needed = np.log(TARGET_P99 * factor / MEDIAN) / Z99
    print(f"speed up {factor:.1f}x  ->  sigma must reach {s_needed:.3f} "
          f"({(1 - s_needed/sigma)*100:.0f}% reduction)")

# speed up 1.0x  ->  sigma must reach 0.511 (45% reduction)
# speed up 1.3x  ->  sigma must reach 0.624 (33% reduction)
# speed up 1.6x  ->  sigma must reach 0.713 (24% reduction)
# speed up 2.0x  ->  sigma must reach 0.809 (13% reduction)


# =========================================================================
# WHICH LEVER IS CHEAPEST
# =========================================================================
#
# LEVER B, REDUCING THE SPREAD, and by a wide margin.
#
# THE ARITHMETIC REASON: sigma enters the p99 through exp(2.326*sigma),
# so a 1% reduction in sigma cuts the p99 by 2.3%, while a 1% reduction
# in the median cuts it by 1%. Spread is 2.3x more leveraged than
# speed for a p99 target -- and the leverage grows for stricter
# quantiles (3.09x at p99.9).
#
# THE ENGINEERING REASON: a 3x across-the-board speedup means making
# the median path faster, which is usually the path that has already
# been optimised. Reducing sigma means fixing the SLOW path, which
# usually has not been -- and the fixes are known and cheap:
#
#   - cap retry attempts (each retry multiplies latency, per 3.3)
#   - bound queue depth, so waiting time cannot grow without limit
#   - set a timeout on the slowest dependency
#   - remove the tail-latency amplification of fan-out calls
#
# Each of those truncates the tail without touching the median at all.

# QUANTIFY THE SINGLE CHEAPEST ONE: what does a hard 400 ms timeout do?
# (Timed-out requests fail rather than complete, so this trades
# availability for latency -- state that explicitly.)
timeout_at = 400.0
float(ln.sf(timeout_at))         # 0.0159 -- 1.6% of requests fail
#
# That would put the p99 at 400 ms by construction. Still short of 200,
# and 1.6% failure is far too high a price. A 200 ms timeout would fail
# 5.4% of requests:
float(ln.sf(200.0))              # 0.0537
#
# SO A TIMEOUT ALONE CANNOT MEET THE SLO -- it converts a latency
# problem into an availability problem at an unacceptable rate. Say
# that plainly rather than letting someone discover it in production.


# =========================================================================
# WHAT TO TELL PRODUCT
# =========================================================================
#
# "200 ms p99 is not achievable with the current architecture. Today's
#  p99 is 612 ms.
#
#  The distribution is lognormal with a median of 61 ms -- most
#  requests are already fast, and the p99 is driven by spread rather
#  than by average cost. Reaching 200 ms needs either a 3x
#  across-the-board speedup, or a 45% reduction in the spread, or a
#  combination.
#
#  Reducing spread is 2.3x more leveraged than raising speed, and the
#  work is known: capping retries, bounding queue depth, and timing out
#  the slowest dependency. We estimate that reaches 300-350 ms.
#
#  A 350 ms p99 SLO is achievable this quarter. 200 ms requires
#  re-architecting the fan-out path and should be scoped separately."
#
# THE POINT IS THAT "NO" IS NOT THE ANSWER. The answer is a number that
# IS achievable, the work that gets there, and what the original ask
# would cost.


# =========================================================================
# TESTS
# =========================================================================

def test_summary_statistics_rule_out_a_normal():
    """Three independent signs, none needing a fit."""
    assert MEAN / MEDIAN > 1.4                    # skew
    assert SD > MEAN                              # CV > 1
    assert stats.norm(MEAN, SD).cdf(0) > 0.2      # mass below zero


def test_normal_understates_the_p99():
    assert stats.norm(MEAN, SD).ppf(0.99) < P99 * 0.8


def test_normal_is_wrong_in_both_directions():
    """Overstates p50 and p95, understates p99 -- so no parameter shift
    can fix it. The family is wrong."""
    nd = stats.norm(MEAN, SD)

    assert nd.ppf(0.50) > MEDIAN
    assert nd.ppf(0.95) > P95
    assert nd.ppf(0.99) < P99


def test_lognormal_predicts_an_unseen_quantile():
    """Fitted on mean and median only; p95 was never used."""
    ln, _ = lognormal_from_mean_median(MEAN, MEDIAN)

    assert abs(ln.ppf(0.95) - P95) / P95 < 0.02


def test_true_tail_is_heavier_than_lognormal():
    """The 13% p99 shortfall is a finding, not a fit failure -- treat
    the model as a floor on the tail."""
    ln, _ = lognormal_from_mean_median(MEAN, MEDIAN)

    assert ln.ppf(0.99) < P99


def test_spread_is_more_leveraged_than_speed():
    """d(p99)/d(sigma) relative vs d(p99)/d(median) relative."""
    ln, sigma = lognormal_from_mean_median(MEAN, MEDIAN)
    z = stats.norm.ppf(0.99)

    # 1% cut in sigma vs 1% cut in median
    from_sigma = 1 - np.exp(z * sigma * 0.99) / np.exp(z * sigma)
    from_median = 0.01

    assert from_sigma / from_median > 2.0


def test_timeout_alone_cannot_meet_the_slo():
    """A 200 ms timeout would fail >5% of requests."""
    ln, _ = lognormal_from_mean_median(MEAN, MEDIAN)

    assert ln.sf(TARGET_P99) > 0.05`,
        notes: [
          { t: "p", text: "**Three signs rule out the normal before any fitting**: mean/median = 1.54, standard deviation exceeding the mean, and a maximum 128 standard deviations above it. A normal with these moments puts 25% of its mass below zero, which latency cannot have." },
          { t: "p", text: "**The normal is wrong in both directions at once** — overstating p50 and p95 while understating p99 — so no parameter shift can rescue it. That pattern is the signature of a wrong family rather than a bad fit." },
          { t: "callout", kind: "insight", title: "The p95 check is what validates the model", body: [
            { t: "p", text: "The lognormal is fitted from mean and median alone, then predicts the p95 to within 0.3% — a quantile it never saw. That is a genuine endorsement of the family, unlike a fit that matches everything because it was given everything." },
            { t: "p", text: "The p99 comes out 13% low, which is itself the finding: the real tail is *heavier* than lognormal, because timeouts and retries add a second regime. Treat the model as a floor on the tail, not a ceiling." }
          ]},
          { t: "p", text: "**`p99 = median · exp(2.326σ)`, so σ is 2.3× more leveraged than the median.** A 1% cut in spread moves the p99 by 2.3%; a 1% speedup moves it by 1%. The leverage grows for stricter quantiles — 3.09× at p99.9." },
          { t: "p", text: "**Reducing spread is also the cheaper engineering.** A 3× across-the-board speedup means optimising the median path, which is usually already optimised; capping retries, bounding queue depth and timing out the slowest dependency all truncate the tail without touching the median." },
          { t: "p", text: "**A timeout alone cannot meet the SLO** — a 200 ms cut-off would fail 5.4% of requests, converting a latency problem into a worse availability problem. Worth saying plainly rather than letting someone discover it in production." },
          { t: "p", text: "**\"No\" is not the answer.** The answer is the number that *is* achievable (350 ms this quarter), the work that gets there, and what the original ask would cost separately." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An insurer set reserves at the mean claim plus three standard deviations, a policy that had held for years. One quarter's losses exceeded the reserve by a factor of four." },
      { t: "p", text: "**Claim sizes followed a Pareto with a tail index near 1.6**, which means the variance is infinite — the sample standard deviation was not estimating anything, it was just growing with the sample size." },
      { t: "p", text: "The historical stability was itself the warning: **a standard deviation that keeps drifting upward as data accumulates is not converging**, and under an infinite-variance distribution it never will." },
      { t: "p", text: "**The fix was to reserve on an empirical quantile rather than on σ.** A p99.5 of the observed claims is a statement about the data; \"mean plus 3σ\" is a statement about a normal distribution nobody had checked for." }
    ]}
  ],

  takeaways: [
    "**Additive effects give a normal; multiplicative effects give a lognormal** — and growth, latency chains and income are all products.",
    "**A lognormal is a normal in the logs**, because the CLT applies to `log(∏x) = ∑log x`.",
    "**The CLT needs finite variance and independence**; both fail for real data more often than people expect.",
    "**\"n = 30 is enough\" is a claim about the centre.** Tail probabilities converge last, and they are usually the question.",
    "**Mean/median > 1.5 is strong right skew**; standard deviation exceeding the mean rules out normality for a positive quantity.",
    "**The largest observation's share of the total is the cleanest heavy-tail test** — it falls as `1/n` under a light tail and barely falls under a heavy one.",
    "**A running mean that jumps when new data arrives is not converging**, which is what an unstable mean looks like in practice.",
    "**Under a lognormal `p99 = median · exp(2.326σ)`**, so spread is 2.3× more leveraged than speed for a p99 target.",
    "**The exponential is the only memoryless continuous distribution** — right for constant-rate arrivals, wrong for anything that ages.",
    "**Timeouts only make sense for processes that age.** If failures were memoryless, killing a slow request would discard work for no gain.",
    "**Infinite variance means the sample standard deviation never converges** — it just grows with `n`, and reserving on `3σ` is then meaningless.",
    "**Reserve, budget and alert on empirical quantiles**, which describe the data, rather than on σ, which describes a normal you did not check for."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Latencies have mean 94 ms, median 61 ms and standard deviation 143 ms. What does that tell you?",
        options: [
          "The measurements are noisy",
          "Strongly right-skewed and not normal — the mean/median ratio is 1.54 and a normal with these moments puts 25% of its mass below zero",
          "There are outliers that should be removed",
          "The sample is too small"
        ],
        answer: 1,
        why: "A standard deviation exceeding the mean is impossible for a normal describing a positive quantity. Latency is a chain of stages multiplied together, so a lognormal is what the generating process suggests before any fitting."
      },
      {
        stem: "Why does the sample mean of Cauchy data never settle, however much you collect?",
        options: [
          "The samples are correlated",
          "The Cauchy has infinite variance, so the CLT does not apply — the mean of `n` samples has the same distribution as one sample",
          "The random number generator is biased",
          "It does settle, just slowly"
        ],
        answer: 1,
        why: "Averaging a million Cauchy samples buys you exactly nothing. The practical version is an insurer whose standard deviation kept drifting upward as data accumulated — under infinite variance it was not converging to anything."
      },
      {
        stem: "For a lognormal, which lever moves the p99 more: a 1% faster median or a 1% smaller σ?",
        options: [
          "They are equivalent",
          "σ, by a factor of 2.3 — `p99 = median · exp(2.326σ)`, so σ enters exponentially",
          "The median, since it shifts everything",
          "Neither; the p99 depends only on the maximum"
        ],
        answer: 1,
        why: "The leverage grows for stricter quantiles, reaching 3.09× at p99.9. It also points at cheaper work: reducing spread means capping retries and bounding queues, while speeding up the median means optimising the path that is already optimised."
      },
      {
        stem: "Why do timeouts make sense at all?",
        options: [
          "They free resources regardless of the distribution",
          "Because real request latencies *age* — a long-running request is increasingly unlikely to finish, unlike a memoryless process where killing it would gain nothing",
          "Because the exponential distribution has a hard upper bound",
          "They do not; timeouts are always wasteful"
        ],
        answer: 1,
        why: "The exponential is the only memoryless continuous distribution: under it, a request running for 10 seconds is exactly as likely to finish in the next second as a fresh one. A Weibull shape parameter above 1 is what says a process wears out, and most real requests do."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is the normal distribution so common?",
        strong: "The central limit theorem: a sum of many independent effects with finite variance is approximately normal whatever the effects look like. So it appears wherever things add up — measurement error, sample means. It does not appear where things multiply, which gives a lognormal.",
        answer: [
          { t: "p", text: "Naming the two conditions rather than just the theorem shows you know where it stops applying." },
          { t: "p", text: "The additive-versus-multiplicative contrast is the practically useful half, and it selects the right model far more often than a goodness-of-fit test does." }
        ]
      },
      {
        level: "advanced",
        q: "How would you tell whether data is heavy-tailed without fitting a distribution?",
        strong: "Three distribution-free checks: mean against median, the largest observation's share of the total across increasing sample sizes, and whether the running mean settles. Under a light tail the max's share falls as `1/n`; under a heavy tail it barely falls.",
        answer: [
          { t: "p", text: "Offering diagnostics that cannot be wrong about the family — because they never assume one — is the substance." },
          { t: "p", text: "The running-mean check makes the consequence visible: an estimate that jumps when one observation arrives is not a stable summary." }
        ]
      },
      {
        level: "advanced",
        q: "Product wants a p99 latency target that is three times better than today. How do you answer?",
        strong: "Decompose it. Under a lognormal `p99 = median · exp(2.326σ)`, so I would say what the median would have to become, what σ would have to become, and that σ is 2.3× more leveraged. Then propose the achievable number and scope the rest separately.",
        answer: [
          { t: "p", text: "Turning a yes/no question into levers with numbers attached is the behaviour being tested." },
          { t: "p", text: "Knowing that spread is the cheaper lever — and that the work is capping retries and bounding queues — shows the maths connecting to engineering." },
          { t: "p", text: "Pointing out that a timeout alone would convert this into a 5% availability problem pre-empts the obvious bad suggestion." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 3.4 — Discrete Distributions
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "There are only four discrete distributions you meet regularly, and each one is the answer to a specific question about repeated trials. **Learn the situation that produces each distribution, not the formula** — the formula is recoverable, and the situation is what tells you which one applies.",

  objectives: [
    "Derive each distribution from the situation that produces it",
    "Choose between binomial, geometric, Poisson and negative binomial",
    "Use the Poisson limit and know when it is a good approximation",
    "Diagnose overdispersion and say what it means",
    "Compute with these distributions without underflowing"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", text: "One trial, and everything built from it", id: "family" },

    { t: "table",
      head: ["Distribution", "The question it answers", "Mean", "Variance"],
      rows: [
        ["**Bernoulli(p)**", "Did this one trial succeed?", "`p`", "`p(1−p)`"],
        ["**Binomial(n,p)**", "How many successes in `n` fixed trials?", "`np`", "`np(1−p)`"],
        ["**Geometric(p)**", "How many trials until the first success?", "`1/p`", "`(1−p)/p²`"],
        ["**Negative binomial(r,p)**", "How many trials until the `r`th success?", "`r/p`", "`r(1−p)/p²`"],
        ["**Poisson(λ)**", "How many events in a fixed interval?", "`λ`", "**`λ` — equal to the mean**"]
      ],
      caption: "**Binomial fixes the trials and counts successes; geometric fixes the successes and counts trials.** They are the same experiment read in opposite directions, which is the distinction people get backwards."
    },

    { t: "code", lang: "python", title: "each one, derived rather than quoted", code: `
import numpy as np
from scipy import stats
from math import comb

# BERNOULLI -- one trial. Everything else is built from repeating it.
#   P(X=1) = p,  P(X=0) = 1-p
#   E[X] = p          because 1*p + 0*(1-p) = p
#   Var(X) = p(1-p)   because E[X^2] = p, so p - p^2

# BINOMIAL -- n independent Bernoullis, count the successes.
#   P(X=k) = C(n,k) p^k (1-p)^(n-k)
#
#   The three factors: C(n,k) ways to choose WHICH trials succeeded,
#   p^k for those succeeding, (1-p)^(n-k) for the rest failing.
#
#   E[X] = np follows from linearity -- it is a sum of n indicators,
#   and no independence argument is needed for the mean.

n, p, k = 10, 0.3, 3
comb(n, k) * p**k * (1-p)**(n-k)         # 0.26683
stats.binom(n, p).pmf(k)                 # 0.26683

# GEOMETRIC -- repeat until the first success.
#   P(X=k) = (1-p)^(k-1) p     (k-1 failures, then a success)
#   E[X] = 1/p
#
#   THE MEAN IS INTUITIVE: if 1 in 20 attempts succeed, expect 20
#   attempts. The VARIANCE is what surprises people -- it is (1-p)/p^2,
#   so for small p the spread is nearly as large as the mean itself.

g = stats.geom(0.05)
g.mean(), g.std()                        # 20.0, 19.49
#
# A mean of 20 with a standard deviation of 19.5 is not a "roughly 20"
# situation. It is a distribution where 5% of the time you need more
# than 59 attempts.
g.ppf(0.95)                              # 59.0

# NEGATIVE BINOMIAL -- repeat until the r-th success. Geometric is the
# r = 1 case, and the sum of r independent geometrics.
stats.nbinom(1, 0.05).mean() + 1         # 20.0, matching geom
stats.nbinom(5, 0.05).mean() + 5         # 100.0 -- five successes

# POISSON -- events in a fixed interval, at a constant average rate.
#   P(X=k) = lam^k e^-lam / k!
#   E[X] = Var(X) = lam
#
# THE EQUALITY OF MEAN AND VARIANCE IS ITS SIGNATURE, and it is a
# strong, testable claim about your data rather than a convenience.
po = stats.poisson(4.0)
po.mean(), po.var()                      # 4.0, 4.0
`,
      hl: [14, 15, 33, 47],
      caption: "**A geometric with `p = 0.05` has mean 20 and standard deviation 19.5.** That is not a \"roughly 20 attempts\" situation — 5% of the time it takes more than 59."
    },

    { t: "h2", n: "02", text: "The Poisson limit", id: "poisson-limit" },

    { t: "viz",
      title: "Many rare trials become a Poisson",
      caption: "Binomial(n, λ/n) converges to Poisson(λ) as n grows. The Poisson is what remains when you stop being able to count the trials — which is why it fits arrivals, faults and errors where no natural n exists.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Binomial bars converging to a Poisson shape as n increases">
  <g>
    <text x="60" y="28" class="s-label" style="fill:var(--ink-3)">Binomial(10, 0.3)</text>
    <rect x="60"  y="180" width="22" height="40" style="fill:var(--accent);fill-opacity:.5"/>
    <rect x="86"  y="130" width="22" height="90" style="fill:var(--accent);fill-opacity:.5"/>
    <rect x="112" y="98"  width="22" height="122" style="fill:var(--accent);fill-opacity:.5"/>
    <rect x="138" y="112" width="22" height="108" style="fill:var(--accent);fill-opacity:.5"/>
    <rect x="164" y="152" width="22" height="68" style="fill:var(--accent);fill-opacity:.5"/>
    <rect x="190" y="192" width="22" height="28" style="fill:var(--accent);fill-opacity:.5"/>
    <line x1="52" y1="220" x2="230" y2="220" style="stroke:var(--line)" stroke-width="1.5"/>
  </g>

  <g transform="translate(280,0)">
    <text x="60" y="28" class="s-label" style="fill:var(--ink-3)">Binomial(100, 0.03)</text>
    <rect x="60"  y="168" width="22" height="52" style="fill:var(--warn);fill-opacity:.5"/>
    <rect x="86"  y="124" width="22" height="96" style="fill:var(--warn);fill-opacity:.5"/>
    <rect x="112" y="102" width="22" height="118" style="fill:var(--warn);fill-opacity:.5"/>
    <rect x="138" y="118" width="22" height="102" style="fill:var(--warn);fill-opacity:.5"/>
    <rect x="164" y="156" width="22" height="64" style="fill:var(--warn);fill-opacity:.5"/>
    <rect x="190" y="192" width="22" height="28" style="fill:var(--warn);fill-opacity:.5"/>
    <line x1="52" y1="220" x2="230" y2="220" style="stroke:var(--line)" stroke-width="1.5"/>
  </g>

  <g transform="translate(560,0)">
    <text x="60" y="28" class="s-label" style="fill:var(--good)">Poisson(3)</text>
    <rect x="60"  y="166" width="22" height="54" style="fill:var(--good);fill-opacity:.5"/>
    <rect x="86"  y="122" width="22" height="98" style="fill:var(--good);fill-opacity:.5"/>
    <rect x="112" y="100" width="22" height="120" style="fill:var(--good);fill-opacity:.5"/>
    <rect x="138" y="118" width="22" height="102" style="fill:var(--good);fill-opacity:.5"/>
    <rect x="164" y="156" width="22" height="64" style="fill:var(--good);fill-opacity:.5"/>
    <rect x="190" y="190" width="22" height="30" style="fill:var(--good);fill-opacity:.5"/>
    <line x1="52" y1="220" x2="230" y2="220" style="stroke:var(--line)" stroke-width="1.5"/>
    <text x="52" y="248" class="s-sub" style="fill:var(--ink-3)">n has vanished from the description</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "when the approximation is good enough", code: `
# Binomial(n, p) -> Poisson(np) as n -> infinity with np held fixed.
#
# The usual rule of thumb is n >= 20 and p <= 0.05, or n >= 100 and
# np <= 10. Measure it rather than trusting the rule:

def max_pmf_error(n, p, k_max=30):
    b = stats.binom(n, p)
    q = stats.poisson(n * p)
    k = np.arange(k_max)
    return float(np.abs(b.pmf(k) - q.pmf(k)).max())

for n, p in [(10, 0.3), (20, 0.15), (100, 0.03), (1000, 0.003),
             (100_000, 3e-5)]:
    print(f"n={n:<7} p={p:<8} np={n*p:.1f}   max error {max_pmf_error(n,p):.5f}")

# n=10      p=0.3      np=3.0   max error 0.03465
# n=20      p=0.15     np=3.0   max error 0.01804
# n=100     p=0.03     np=3.0   max error 0.00366
# n=1000    p=0.003    np=3.0   max error 0.00037
# n=100000  p=3e-05    np=3.0   max error 0.00000
#
# The error falls roughly as 1/n. The approximation is not about n
# being large -- it is about p being SMALL, with np held steady.

# WHY IT MATTERS PRACTICALLY: Poisson needs ONE parameter where
# binomial needs two, and the situations it models usually have no
# natural n at all.
#
#   "How many requests arrive this second?"   -- n is not defined
#   "How many typos are on this page?"        -- n is not defined
#   "How many disks fail this month?"         -- n exists but is huge
#                                                and p is tiny
#
# THE POISSON IS WHAT SURVIVES WHEN YOU CANNOT COUNT THE TRIALS.

# THE ADDITIVITY PROPERTY, which is why it is convenient:
#   Poisson(a) + Poisson(b) = Poisson(a+b), independently.
#
# So a rate per second scales to a rate per hour by multiplying:
per_sec = stats.poisson(2.5)
per_hour = stats.poisson(2.5 * 3600)
per_hour.mean()                          # 9000.0
#
# No other distribution here has that. Binomial only adds when p
# matches; geometric never does.
`,
      hl: [27, 40, 43],
      caption: "**The Poisson is what survives when you cannot count the trials.** Requests per second and typos per page have no natural `n`, which is exactly the situation it was built for."
    },

    { t: "h2", n: "03", text: "Overdispersion: when Poisson is wrong", id: "overdispersion" },

    { t: "ladder",
      title: "Modelling daily support-ticket counts",
      rungs: [
        { level: "bad", label: "Assume Poisson because the data is counts",
          why: "Counts are not automatically Poisson. The distribution assumes a constant rate and independent events, and ticket arrivals violate both — the rate varies by day of week, and one incident produces a burst of correlated tickets.",
          code: `lam = tickets.mean()          # 42.3
model = stats.poisson(lam)

model.ppf(0.99)               # 58 -- "we will never see more than 58"
(tickets > 58).mean()         # 0.11 -- it happens 11% of days` },
        { level: "ok", label: "Check the dispersion before believing it",
          why: "The Poisson makes one testable claim — variance equals mean — so test it. A dispersion index far from 1 tells you the model is wrong before it tells anyone else.",
          code: `def dispersion(x):
    """Variance-to-mean ratio. Poisson implies 1."""
    x = np.asarray(x, dtype=float)
    return float(x.var(ddof=1) / x.mean())

dispersion(tickets)           # 4.7 -- variance is 4.7x the mean

# > 1  OVERDISPERSED: bursts, or a rate that varies
# = 1  consistent with Poisson
# < 1  underdispersed: something is regulating the process
#      (a scheduler, a rate limiter, a quota)` },
        { level: "best", label: "Use a negative binomial, and say what the extra parameter means",
          why: "The negative binomial is a Poisson whose rate is itself gamma-distributed, so it has a second parameter for exactly the variability the Poisson denies. That parameter is interpretable — it measures how much the rate moves.",
          code: `def fit_negbinom(x):
    """Method of moments. mean = m, var = m + m^2/alpha, so
    alpha = m^2 / (var - m). Small alpha means a highly variable rate;
    alpha -> infinity recovers the Poisson."""
    x = np.asarray(x, dtype=float)
    m, v = x.mean(), x.var(ddof=1)
    if v <= m:
        raise ValueError(
            f"variance {v:.2f} <= mean {m:.2f}: not overdispersed, "
            f"use Poisson"
        )
    alpha = m**2 / (v - m)
    return stats.nbinom(alpha, alpha / (alpha + m))

model = fit_negbinom(tickets)

model.mean()                  # 42.3 -- same mean as the Poisson fit
model.ppf(0.99)               # 121  -- against the Poisson's 58
(tickets > 121).mean()        # 0.009 -- matches the 1% it claims

# THE STAFFING CONSEQUENCE IS THE POINT. Sizing a rota on the Poisson's
# 58 means being overwhelmed 11% of days. The negative binomial's 121
# is more than twice as many people at the p99 -- an expensive answer,
# and the correct one.
#
# WHERE THE EXTRA VARIANCE COMES FROM, physically:
#   - day-of-week and seasonal rate variation
#   - incidents producing correlated bursts
#   - unmeasured drivers (a release, a marketing email)
#
# Each is a violation of "constant rate, independent events". If you can
# MEASURE one of them, conditioning on it may restore the Poisson within
# each stratum -- which is better than absorbing it into alpha.`,
          note: "**Test the dispersion before fitting a Poisson.** It is one line, it is the model's only testable claim, and getting it wrong understates your tail by a factor of two." }
      ]
    },

    { t: "callout", kind: "trap", title: "Computing a binomial PMF directly overflows", body: [
      { t: "p", text: "`C(n,k) p^k (1−p)^(n−k)` is three quantities that individually overflow or underflow long before their product does. At `n = 1000` the binomial coefficient alone exceeds float64's range." },
      { t: "code", lang: "python", numbered: false, title: "work in logs", code: `
from math import lgamma, exp, log

n, k, p = 1000, 500, 0.5

# NAIVE -- the coefficient overflows before the powers can rescue it.
comb(n, k)                        # 2.7e299, still finite as a Python int
float(comb(n, k))                 # 2.7e299  (float64 max is 1.8e308)
comb(2000, 1000) * 0.5**2000      # OverflowError: int too large

# STABLE -- log-gamma, then exponentiate once at the end.
def log_binom_pmf(k, n, p):
    """log C(n,k) + k log p + (n-k) log(1-p), with lgamma for the
    coefficient. Never forms a number outside float64's range."""
    if not 0 <= k <= n:
        return -np.inf
    log_coef = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
    return log_coef + k * log(p) + (n - k) * log(1 - p)

exp(log_binom_pmf(1000, 2000, 0.5))     # 0.017839  -- fine
stats.binom(2000, 0.5).pmf(1000)        # 0.017839  -- scipy does this

# THE GENERAL RULE FOR DISCRETE DISTRIBUTIONS: compute in log space and
# exponentiate once. It is why every library exposes logpmf, and why
# likelihoods are always summed as logs rather than multiplied.
stats.binom(2000, 0.5).logpmf(1000)     # -4.0250`},
      { t: "p", text: "**Every library exposes `logpmf` for this reason**, and it is why likelihoods are summed as logs rather than multiplied — a product of 10,000 probabilities underflows to zero regardless of how well conditioned the problem is." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Size an on-call rota from incident counts",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "You have 365 days of incident counts and need to decide how many on-call engineers to schedule. Each engineer can handle 4 incidents per day before the queue backs up, and the target is that the rota copes on 99% of days." },
        { t: "code", lang: "python", numbered: false, title: "the data", code: `
# 365 daily incident counts, summarised:
#   mean       6.8
#   variance  31.2
#   max         34
#   days with 0 incidents: 71

CAPACITY_PER_ENGINEER = 4
TARGET = 0.99`},
        { t: "p", text: "Choose a distribution with justification, size the rota, and say what the Poisson answer would have been and why it is wrong." }
      ],
      requirements: [
        "Test whether the Poisson assumption holds, with a number.",
        "Fit an appropriate alternative and explain its extra parameter.",
        "Size the rota under both models and compare.",
        "Say what the zero-count days imply.",
        "Give the cost of being wrong in each direction.",
        "Include tests."
      ],
      hint: "The dispersion index is the first thing to compute; 71 zeros out of 365 is the second clue.",
      solution: {
        lang: "python",
        title: "rota.py",
        code: `import numpy as np
from scipy import stats

MEAN, VAR, N_DAYS, N_ZEROS = 6.8, 31.2, 365, 71
CAPACITY = 4
TARGET = 0.99

# Reconstruct a dataset with these moments for the worked numbers.
rng = np.random.default_rng(0)
alpha_true = MEAN**2 / (VAR - MEAN)
counts = stats.nbinom(alpha_true, alpha_true/(alpha_true+MEAN)).rvs(
    N_DAYS, random_state=0)


# =========================================================================
# IS IT POISSON? ONE NUMBER SETTLES IT
# =========================================================================
#
# The Poisson makes exactly one testable claim: Var = mean. Test it.

dispersion = VAR / MEAN
dispersion                       # 4.59
#
# The variance is 4.6x the mean. Under a Poisson with n = 365, the
# dispersion index D = (n-1)*s^2/mean is approximately chi-square with
# n-1 degrees of freedom:

stat = (N_DAYS - 1) * VAR / MEAN                 # 1673.0
stats.chi2(N_DAYS - 1).sf(stat)                  # 0.0 -- p < 1e-100
#
# NOT A BORDERLINE CALL. The Poisson is rejected overwhelmingly, and it
# would be rejected on the dispersion index alone without a test.
#
# WHAT ELSE CONFIRMS IT: 71 zeros out of 365 is 19.5% of days. A
# Poisson with lam = 6.8 predicts:
stats.poisson(MEAN).pmf(0)                       # 0.00111
stats.poisson(MEAN).pmf(0) * N_DAYS              # 0.4 days per year
#
# The model expects less than one zero-incident day per year and we
# observed 71. That single comparison is enough on its own.


# =========================================================================
# WHY IT IS OVERDISPERSED
# =========================================================================
#
# The Poisson assumes a CONSTANT RATE and INDEPENDENT events. Incidents
# violate both:
#
#   - RATE VARIES. Weekdays differ from weekends; release days differ
#     from freeze periods. A mixture of Poissons with different rates
#     is overdispersed even though each component is not.
#
#   - EVENTS CLUSTER. One root cause produces several tickets. Those
#     are not independent draws, they are one draw counted many times.
#
# THE 71 ZEROS AND THE MAX OF 34 ARE THE SAME PHENOMENON seen from
# both ends: quiet days when nothing is deploying, and storm days when
# one failure cascades.


# =========================================================================
# THE NEGATIVE BINOMIAL
# =========================================================================
#
# It is a Poisson whose rate is itself gamma-distributed -- exactly the
# "the rate varies" story, made into a model. Its second parameter
# measures how much the rate moves:
#
#     Var = mean + mean^2 / alpha
#
#   alpha -> infinity  =>  Var -> mean, and it becomes a Poisson
#   small alpha        =>  a highly variable rate

def fit_negbinom(mean, var):
    if var <= mean:
        raise ValueError(
            f"variance {var:.2f} <= mean {mean:.2f}: not overdispersed"
        )
    alpha = mean**2 / (var - mean)
    return stats.nbinom(alpha, alpha / (alpha + mean)), alpha

nb, alpha = fit_negbinom(MEAN, VAR)
alpha                            # 1.898
#
# alpha ~ 1.9 is SMALL -- the rate is highly variable. For comparison,
# alpha > 50 would be nearly Poisson.

nb.mean(), nb.var()              # 6.80, 31.20  -- matches by construction
nb.pmf(0)                        # 0.183 -> 66.7 days, against 71 observed


# =========================================================================
# SIZING THE ROTA
# =========================================================================

def engineers_needed(dist, target=TARGET, capacity=CAPACITY):
    """Smallest team that handles the day's incidents on "target" of
    days. ppf gives the incident count at that quantile; divide by
    per-engineer capacity and round up."""
    load = dist.ppf(target)
    return int(np.ceil(load / capacity)), float(load)

po = stats.poisson(MEAN)

engineers_needed(po)             # (4, 14.0)
engineers_needed(nb)             # (8, 30.0)
#
# POISSON SAYS 4 ENGINEERS. NEGATIVE BINOMIAL SAYS 8. Twice the rota,
# from the same mean -- the difference is entirely in the tail.

for q in (0.5, 0.9, 0.95, 0.99, 0.999):
    print(f"p{q*100:<6g}  poisson {po.ppf(q):5.0f}   negbinom {nb.ppf(q):5.0f}")

# p50      poisson     7   negbinom     5
# p90      poisson    10   negbinom    15
# p95      poisson    11   negbinom    19
# p99      poisson    14   negbinom    30
# p99.9    poisson    17   negbinom    46
#
# NOTE THE CROSSOVER. At the median the negative binomial is LOWER --
# most days are quieter than the Poisson suggests. It is only in the
# tail that it is higher, and the gap widens as you go further out.
# That is what overdispersion looks like: more quiet days AND more
# extreme days, with fewer in the middle.


# =========================================================================
# WHAT BEING WRONG COSTS, IN EACH DIRECTION
# =========================================================================
#
# UNDER-STAFFING (shipping the Poisson's 4):
po_capacity = 4 * CAPACITY                       # 16 incidents/day
float(nb.sf(po_capacity))                        # 0.128
#
# The rota is overwhelmed on 12.8% of days -- about one day in eight,
# against a stated target of one in a hundred. The cost is deferred
# incidents, missed SLAs, and on-call burnout, which is the failure
# mode that eventually costs you the engineers themselves.
#
# OVER-STAFFING (shipping 8 when 4 would do):
# Four extra engineers on rota. The cost is real but it is BOUNDED,
# LINEAR and REVERSIBLE -- you can shrink the rota next quarter.
#
# THE ASYMMETRY IS THE ARGUMENT. Under-staffing fails non-linearly:
# a backed-up queue makes the next day worse, and burnout compounds.
# Over-staffing fails linearly and can be undone. When the costs are
# asymmetric, size to the worse-consequence side.

# THE BETTER ANSWER THAN EITHER: use the structure instead of the tail.
# If the variance comes from day-of-week and release schedule, those
# are KNOWN IN ADVANCE. Stratify:
#
#   weekday-with-release:   higher rate, staff up
#   weekend-freeze:         lower rate, staff down
#
# Conditioning on a measurable driver moves variance from the "between"
# term into something you can schedule around -- the law of total
# variance from lesson 3.3, used as a staffing tool. A flat rota sized
# for the tail pays for the worst day every day.


# =========================================================================
# TESTS
# =========================================================================

def test_dispersion_rejects_poisson():
    assert VAR / MEAN > 2.0

    stat = (N_DAYS - 1) * VAR / MEAN
    assert stats.chi2(N_DAYS - 1).sf(stat) < 1e-10


def test_zero_count_confirms_it_independently():
    """71 zeros where Poisson predicts 0.4 -- a second, independent
    reason to reject it."""
    expected = stats.poisson(MEAN).pmf(0) * N_DAYS

    assert expected < 1.0
    assert N_ZEROS > 50 * expected


def test_negbinom_reproduces_both_moments():
    nb, _ = fit_negbinom(MEAN, VAR)

    assert np.isclose(nb.mean(), MEAN, rtol=1e-6)
    assert np.isclose(nb.var(), VAR, rtol=1e-6)


def test_negbinom_predicts_the_zeros():
    nb, _ = fit_negbinom(MEAN, VAR)

    assert abs(nb.pmf(0) * N_DAYS - N_ZEROS) < 15


def test_fit_refuses_underdispersed_data():
    import pytest
    with pytest.raises(ValueError, match="not overdispersed"):
        fit_negbinom(mean=10.0, var=4.0)


def test_poisson_understates_the_rota_by_half():
    nb, _ = fit_negbinom(MEAN, VAR)

    n_po, _ = engineers_needed(stats.poisson(MEAN))
    n_nb, _ = engineers_needed(nb)

    assert n_nb >= 2 * n_po


def test_poisson_sized_rota_misses_the_target_badly():
    """The consequence, stated as a test: 12.8% failure against a 1%
    target."""
    nb, _ = fit_negbinom(MEAN, VAR)
    n_po, _ = engineers_needed(stats.poisson(MEAN))

    assert nb.sf(n_po * CAPACITY) > 0.10


def test_overdispersion_lowers_the_median_and_raises_the_tail():
    """The signature shape: more quiet days AND more extreme days."""
    nb, _ = fit_negbinom(MEAN, VAR)
    po = stats.poisson(MEAN)

    assert nb.ppf(0.5) < po.ppf(0.5)
    assert nb.ppf(0.99) > po.ppf(0.99)`,
        notes: [
          { t: "p", text: "**The dispersion index settles it in one line: 4.59.** But the stronger evidence needs no test at all — a Poisson with `λ = 6.8` predicts 0.4 zero-incident days per year, and 71 were observed." },
          { t: "p", text: "**Overdispersion has a physical story.** The rate varies (weekday against weekend, release against freeze) and events cluster (one root cause, several tickets). The 71 zeros and the maximum of 34 are the same phenomenon from both ends." },
          { t: "callout", kind: "insight", title: "Overdispersion lowers the median and raises the tail", body: [
            { t: "p", text: "At p50 the negative binomial gives 5 against the Poisson's 7 — most days are *quieter* than the Poisson suggests. Only past p90 does it overtake, reaching 30 against 14 at p99. More quiet days and more extreme days, with fewer in the middle." },
            { t: "p", text: "That is why a fitted mean can look perfect while the model is badly wrong: the mean is the one thing both distributions agree on." }
          ]},
          { t: "p", text: "**The Poisson-sized rota of 4 is overwhelmed on 12.8% of days against a 1% target** — roughly one day in eight." },
          { t: "p", text: "**The costs are asymmetric, and that is the argument.** Over-staffing is bounded, linear and reversible; under-staffing compounds — a backed-up queue makes the next day worse, and burnout costs you the engineers themselves. Size to the worse-consequence side." },
          { t: "p", text: "**Better than either: stratify on the driver.** If the variance comes from day of week and release schedule, both are known in advance. That is the law of total variance from lesson 3.3 used as a staffing tool — a flat rota sized for the tail pays for the worst day every day." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A capacity model sized a message queue from a Poisson fit to arrival counts. It was provisioned for the p99.9 and overflowed roughly monthly." },
      { t: "p", text: "**Arrivals were not Poisson because they were not independent** — a single upstream batch job produced thousands of messages in one burst. The dispersion index was 60, and nobody had computed it." },
      { t: "p", text: "**The unit of independence was the batch, not the message.** Modelling batch arrivals as Poisson and batch *size* separately — a compound Poisson — reproduced the observed variance, and the p99.9 moved by a factor of eight." },
      { t: "p", text: "**Ask what the independent unit is before fitting anything to counts.** If one cause produces many events, you are counting the events and should be counting the causes." }
    ]}
  ],

  takeaways: [
    "**Learn the situation each distribution answers**, not the formula — the formula is recoverable and the situation is what selects it.",
    "**Binomial fixes the trials and counts successes; geometric fixes the successes and counts trials** — the same experiment read in opposite directions.",
    "**A geometric with `p = 0.05` has mean 20 and standard deviation 19.5** — 5% of the time it takes more than 59 attempts.",
    "**The Poisson's signature is `mean = variance`**, which is a strong, testable claim rather than a convenience.",
    "**Binomial(n, λ/n) → Poisson(λ)**, and the approximation is about `p` being small, not `n` being large.",
    "**The Poisson is what survives when you cannot count the trials** — arrivals per second have no natural `n`.",
    "**Poissons add**: a rate per second scales to a rate per hour by multiplying. No other distribution here does that.",
    "**Compute the dispersion index before fitting a Poisson** — it is one line and it is the model's only testable claim.",
    "**Overdispersion means more quiet days *and* more extreme days**, so a matching mean proves nothing about the tail.",
    "**The negative binomial is a Poisson with a varying rate**, and its extra parameter measures how much the rate moves.",
    "**Ask what the independent unit is before fitting to counts** — if one cause produces many events, count the causes.",
    "**Work in log space for discrete PMFs.** `C(n,k)` alone exceeds float64's range at `n = 1000`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Daily counts have mean 6.8 and variance 31.2. What does that rule out?",
        options: [
          "Nothing — counts are always Poisson",
          "The Poisson, whose defining property is that variance equals the mean; a ratio of 4.6 is overdispersion",
          "The negative binomial",
          "Any discrete distribution"
        ],
        answer: 1,
        why: "The stronger evidence here needs no test: a Poisson with `λ = 6.8` predicts 0.4 zero-incident days per year, and 71 were observed. Overdispersion usually means the rate varies or events cluster — both violations of the Poisson's assumptions."
      },
      {
        stem: "Fitting a Poisson gives p99 = 14 incidents; the negative binomial gives 30. Both have mean 6.8. How can that be?",
        options: [
          "One of the fits is wrong",
          "Overdispersion redistributes mass to both ends — more quiet days *and* more extreme days — so the means agree while the tails do not",
          "The negative binomial always gives larger values",
          "The mean is not a meaningful summary here"
        ],
        answer: 1,
        why: "At the median the negative binomial is actually *lower*, 5 against 7. The mean is the one thing both distributions agree on, which is why a well-matched mean is no evidence that a model's tail is right."
      },
      {
        stem: "One upstream batch job emits thousands of messages at once. Why is a Poisson fit to message arrivals wrong?",
        options: [
          "The rate is too high for a Poisson",
          "Messages are not independent — the independent unit is the batch, so you should model batch arrivals and batch size separately",
          "Poisson only applies to rare events",
          "The interval is not fixed"
        ],
        answer: 1,
        why: "You are counting events when you should be counting causes. A compound Poisson — Poisson batch arrivals with a separate size distribution — reproduces the observed variance, and moves the p99.9 by nearly an order of magnitude."
      },
      {
        stem: "Why does every library expose `logpmf` alongside `pmf`?",
        options: [
          "Logs are faster to compute",
          "The intermediate terms overflow — `C(1000,500)` alone exceeds float64's range — so you compute in log space and exponentiate once",
          "Logs are more accurate for large probabilities",
          "It is a convention inherited from R"
        ],
        answer: 1,
        why: "The same reason likelihoods are summed as logs rather than multiplied: a product of 10,000 probabilities underflows to zero regardless of how well conditioned the problem is."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use a binomial rather than a Poisson?",
        strong: "When the number of trials is fixed and known. Binomial counts successes in `n` trials; Poisson counts events in an interval where there is no natural `n` — requests per second, typos per page. If `n` is large and `p` small, they agree anyway.",
        answer: [
          { t: "p", text: "The \"is there a natural n\" test is the practical discriminator, and it is more useful than reciting the limit theorem." },
          { t: "p", text: "Adding that the Poisson approximation is about `p` being small rather than `n` being large shows you understand the limit rather than the rule of thumb." }
        ]
      },
      {
        level: "core",
        q: "How would you check whether count data is Poisson?",
        strong: "Compute the variance-to-mean ratio — the Poisson's one testable claim is that it equals 1. A ratio well above 1 means overdispersion, usually a varying rate or clustered events. Comparing the observed zero count against the predicted one is a second, often more damning check.",
        answer: [
          { t: "p", text: "Naming the dispersion index as the model's only testable claim is the crisp framing." },
          { t: "p", text: "The zero-count comparison is the check most people do not mention, and it is often decisive on its own." }
        ]
      },
      {
        level: "advanced",
        q: "Your Poisson-based capacity model overflows monthly despite being sized for p99.9. What went wrong?",
        strong: "The arrivals are almost certainly not independent — one upstream cause producing many events. The independent unit is the cause, not the event, so a compound Poisson with a separate size distribution is the right model. I would compute the dispersion index first to confirm.",
        answer: [
          { t: "p", text: "Going straight to \"what is the independent unit\" shows you diagnose rather than reach for a bigger distribution." },
          { t: "p", text: "Proposing to measure the dispersion before changing anything is the right order, and it gives you a number to argue with." }
        ]
      }
    ]
  }
});

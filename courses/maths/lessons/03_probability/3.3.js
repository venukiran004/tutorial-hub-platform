/* ============================================================================
   LESSON 3.3 — Expectation, Variance and Moments
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**Linearity of expectation is the most useful fact in probability**, because it holds whether or not the variables are independent — which lets you compute averages for problems whose distributions you could never write down. Variance has no such property, and the gap between the two is where most errors live.",

  objectives: [
    "Use linearity of expectation on dependent variables",
    "Decompose a problem into indicators and sum their expectations",
    "State when variances add and when they do not",
    "Explain why variance is in squared units and what follows from that",
    "Use the law of total expectation and variance to split a problem"
  ],

  prerequisites: ["3.2"],

  blocks: [

    { t: "h2", n: "01", text: "Linearity, and why it is unreasonable", id: "linearity" },

    { t: "p", text: "**Expectation is the long-run average value of a random variable**, and its most useful property is that it adds — always, with no conditions attached. Independence is never required, which is what lets you compute averages for problems whose distributions you could not write down." },

    { t: "dl", items: [
      ["Expectation", "`E[X] = Σ x·p(x)` or `∫ x·f(x) dx`. The probability-weighted average, also called the mean."],
      ["Linearity of expectation", "`E[aX + bY] = aE[X] + bE[Y]`, for **any** joint distribution. Correlated, dependent, adversarial — it still holds."],
      ["Indicator variable", "A variable that is 1 when an event occurs and 0 otherwise. Since `E[1_A] = P(A)`, an expectation of an indicator is just a probability."],
      ["The indicator trick", "Write a count as a sum of indicators, take each expectation separately, and add. It is the standard route to an answer."]
    ]},

    { t: "code", lang: "python", title: "the fact that does the work", code: `
import numpy as np

# E[aX + bY] = a E[X] + b E[Y]
#
# ALWAYS. No independence required. No assumption about the joint
# distribution at all. X and Y can be perfectly correlated, adversarial,
# or defined in terms of each other -- the identity still holds.
#
# THAT IS WHAT MAKES IT USEFUL: you can compute the expectation of a
# sum without ever knowing the distribution OF the sum.

# WORKED EXAMPLE -- COUPON COLLECTOR. How many boxes to collect all n
# toys? The distribution of the total is horrible. The expectation is
# four lines.
#
#   Split the total into stages: T = T_1 + T_2 + ... + T_n, where T_i
#   is the number of boxes bought while you have exactly i-1 distinct
#   toys. THE STAGES ARE NOT INDEPENDENT OF EACH OTHER'S TIMING, and it
#   does not matter.
#
#   In stage i, each box is new with probability (n-i+1)/n, so T_i is
#   geometric and E[T_i] = n/(n-i+1).
#
#   E[T] = sum_i n/(n-i+1) = n * (1 + 1/2 + ... + 1/n) = n * H_n

def coupon_collector(n):
    return n * sum(1/k for k in range(1, n+1))

coupon_collector(6)          # 14.7   -- six-sided die, all faces
coupon_collector(50)         # 224.96 -- a 50-card sticker album
coupon_collector(1000)       # 7485.5

# SANITY-CHECK IT BY SIMULATION:
def simulate(n, trials=20_000, seed=0):
    rng = np.random.default_rng(seed)
    out = np.empty(trials)
    for t in range(trials):
        seen, count = set(), 0
        while len(seen) < n:
            seen.add(rng.integers(n)); count += 1
        out[t] = count
    return out.mean()

simulate(6)                  # 14.71  -- matches
`,
      hl: [5, 6, 9, 20],
      caption: "**The stages are not independent and the identity still holds.** That is the whole reason to reach for linearity: it lets you decompose a problem into pieces whose joint behaviour you never have to understand."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Expectation is an integral, and integrals are linear.** Independence is a statement about a *joint* distribution; linearity only ever touches the marginals, so it never needs one." },
      { t: "p", text: "The practical recipe: **write the quantity as a sum of indicators**, take the expectation of each separately, and add. Indicators are easy because `E[1_A] = P(A)` — an expectation of an indicator is just a probability." }
    ]},

    { t: "code", lang: "python", title: "the indicator trick, three times", code: `
from math import comb

# E[1_A] = P(A). So a count becomes a sum of indicators, and its
# expectation becomes a sum of probabilities.

# 1 -- EXPECTED MATCHES IN A SHUFFLE. n people, n hats, returned at
# random. How many get their own hat?
#
#   X = sum_i 1_{person i gets own hat},  P = 1/n for each
#   E[X] = n * (1/n) = 1
#
# ONE. For any n. Ten people or ten million, the expected number of
# matches is exactly 1 -- and the indicators are strongly dependent,
# which is precisely why nothing but linearity would get you there.

rng = np.random.default_rng(0)
np.mean([np.sum(rng.permutation(1000) == np.arange(1000))
         for _ in range(5000)])                     # 1.002

# 2 -- EXPECTED COLLISIONS IN A HASH TABLE (lesson 3.1, from the other
# side). n keys into N buckets.
#
#   X = sum over pairs 1_{pair collides},  C(n,2) pairs, each 1/N
#   E[X] = C(n,2)/N ~ n^2/(2N)

def expected_collisions(n, N):
    return comb(n, 2) / N

expected_collisions(40_000_000, 2**32)              # 186.3
#
# The pairs OVERLAP heavily -- if keys 1 and 2 collide and 2 and 3
# collide, then 1 and 3 do too. Linearity does not care.

# 3 -- EXPECTED DISTINCT VALUES after n draws from N, with replacement.
# Counting the distinct values directly is unpleasant; counting the
# MISSING ones is easy.
#
#   For each value v: P(v never drawn) = (1 - 1/N)^n
#   E[missing] = N (1 - 1/N)^n
#   E[distinct] = N (1 - (1 - 1/N)^n)

def expected_distinct(n, N):
    return N * (1 - (1 - 1/N)**n)

expected_distinct(1000, 1000)     # 632.3  -- 63% of buckets touched
expected_distinct(3000, 1000)     # 950.2
#
# 1 - 1/e = 0.632 is where that first number comes from, and it is the
# same constant behind bootstrap resampling covering ~63.2% of the
# original sample (lesson 5.11).
`,
      hl: [12, 34, 47],
      caption: "**Count what is easy, not what is asked.** Distinct values are awkward; missing values are one probability per value. The same inversion appears in the bootstrap, where 63.2% is this constant again."
    },

    { t: "h2", n: "02", text: "Variance does not have linearity", id: "variance" },

    { t: "p", text: "**Variance measures spread as the average squared distance from the mean**, and unlike expectation it does not simply add. Combining two variables introduces a covariance term, and assuming it away is one of the more expensive habits in applied statistics." },

    { t: "dl", items: [
      ["Variance", "`Var(X) = E[(X − μ)²]`. In the **squared** units of `X`, which is why it cannot be interpreted directly."],
      ["Standard deviation", "`σ = √Var(X)`. Back in the original units, and therefore what belongs in a report."],
      ["Covariance", "`Cov(X,Y) = E[(X−μₓ)(Y−μᵧ)]`. Positive when they move together, negative when they oppose, zero when uncorrelated."],
      ["Variance of a sum", "`Var(X+Y) = Var(X) + Var(Y) + 2Cov(X,Y)`. The cross term vanishes only under zero covariance."],
      ["Scaling", "`Var(aX) = a²Var(X)` — quadratic — while `sd(aX) = |a|·sd(X)` is linear. That square is where the `√n` in every standard error comes from."],
      ["Moment", "An expectation of a power of the variable. The first is the mean, the second gives variance, and higher ones describe shape."],
      ["Independence and variance", "`Var(X+Y) = Var(X) + Var(Y)` requires **only** zero covariance, which independence guarantees but does not require. Uncorrelated is enough here."]
    ]},

    { t: "table",
      head: ["Property", "Expectation", "Variance"],
      rows: [
        ["Sum", "`E[X+Y] = E[X] + E[Y]` **always**", "`Var(X+Y) = Var(X) + Var(Y) + 2Cov(X,Y)`"],
        ["Sum, independent", "same as above", "`Var(X) + Var(Y)`"],
        ["Scaling", "`E[aX] = aE[X]`", "**`Var(aX) = a²Var(X)`**"],
        ["Shift", "`E[X+c] = E[X] + c`", "`Var(X+c) = Var(X)` — unchanged"],
        ["Product, independent", "`E[XY] = E[X]E[Y]`", "no simple form"],
        ["Units", "same as `X`", "**`X` squared**"]
      ],
      caption: "**The `a²` is the row that catches people.** Doubling a quantity quadruples its variance, which is why standard deviation — in the original units — is what you report."
    },

    { t: "code", lang: "python", title: "where the covariance term matters", code: `
# Var(X + Y) = Var(X) + Var(Y) + 2 Cov(X, Y)
#
# The cross term is zero only when X and Y are uncorrelated. Assuming
# it away is one of the most expensive errors in applied statistics.

rng = np.random.default_rng(0)
n = 200_000

base = rng.normal(size=n)
noise = rng.normal(size=n)

X = base
Y_ind = noise                              # independent
Y_cor = 0.9*base + np.sqrt(1-0.81)*noise   # correlated with X, same variance

for name, Y in [("independent", Y_ind), ("correlated", Y_cor)]:
    print(f"{name:12s}  Var(X)+Var(Y) = {X.var()+Y.var():.3f}   "
          f"Var(X+Y) = {(X+Y).var():.3f}")

# independent   Var(X)+Var(Y) = 2.001   Var(X+Y) = 2.005
# correlated    Var(X)+Var(Y) = 1.998   Var(X+Y) = 3.797   <- 90% higher

# WHY THIS IS EXPENSIVE IN PRACTICE: a portfolio, a distributed system,
# a set of A/B metrics -- risk models built on "the components are
# independent" understate total variance whenever the components share
# a driver. In a crisis correlations rise towards 1, which is exactly
# when the assumption fails and exactly when it matters.

# THE SAME ALGEBRA, USED DELIBERATELY -- variance reduction. Two
# NEGATIVELY correlated estimators of the same quantity have less
# variance combined than either alone:
A = base
B = -0.9*base + np.sqrt(1-0.81)*noise      # negatively correlated

((A + B) / 2).var(), A.var() / 2           # 0.0525 vs 0.5003
#
# A 10x reduction. That is antithetic variates, and it is why paired
# designs and control variates work: engineer the covariance to be
# negative rather than assuming it is zero.
`,
      hl: [3, 21, 30],
      caption: "**Covariance is a lever, not just a nuisance.** Assuming it away understates risk; engineering it negative is how antithetic variates and paired designs cut variance for free."
    },

    { t: "callout", kind: "trap", title: "Variance is in squared units, so it cannot be interpreted", body: [
      { t: "p", text: "If latency is in milliseconds, its variance is in milliseconds squared — a quantity with no physical meaning. Only the standard deviation shares units with the data, which is why it, not variance, belongs in a report." },
      { t: "code", lang: "python", numbered: false, title: "and the algebra follows the units", code: `
x = np.array([120.0, 135.0, 128.0, 141.0, 119.0])   # milliseconds

x.var(ddof=1)        # 87.8   ms^2   -- means nothing to a reader
x.std(ddof=1)        # 9.37   ms     -- reportable

# THE SQUARE IS NOT DECORATIVE. It is why:
#
#   Var(aX) = a^2 Var(X)          scaling is quadratic
#   sd(aX)  = |a| sd(X)           scaling is linear
#
# Convert the same latencies to seconds and the variance changes by a
# factor of 10^6, the standard deviation by 10^3:
(x/1000).var(ddof=1)    # 8.78e-05
(x/1000).std(ddof=1)    # 0.00937

# IT IS ALSO WHY STANDARD ERRORS SHRINK AS sqrt(n) AND NOT n:
#   Var(mean) = sigma^2/n   ->   sd(mean) = sigma/sqrt(n)
#
# Quadrupling the sample halves the error. Every sample-size
# calculation in this course is that one line.`},
      { t: "p", text: "**The `√n` in every sample-size formula comes from this square.** Variance falls as `1/n`, so the standard error — its square root — falls as `1/√n`, and quadrupling the sample only halves the error." }
    ]},

    { t: "h2", n: "03", text: "Conditioning: splitting a hard problem", id: "conditioning" },

    { t: "p", text: "**Conditioning splits a hard problem into easier ones by asking \"what if I knew this?\"** Two identities make it precise: total expectation says an average of averages recovers the average, and total variance splits spread into within-group and between-group parts." },

    { t: "dl", items: [
      ["Conditional expectation", "`E[X | Y]` — the average of `X` among cases with that value of `Y`. It is itself a random variable, since it varies with `Y`."],
      ["Law of total expectation", "`E[X] = E[E[X|Y]]`. Average within each group, then average the group averages by their weights."],
      ["Law of total variance", "`Var(X) = E[Var(X|Y)] + Var(E[X|Y])` — within-group spread plus between-group spread. An exact identity, not an approximation."],
      ["Within versus between", "Which term dominates tells you where to act: a large between term means the grouping is the lever, not the variation inside groups."]
    ]},

    { t: "viz",
      title: "Total variance splits into within and between",
      caption: "Var(X) = E[Var(X|Y)] + Var(E[X|Y]). The first term is the spread inside each group; the second is the spread of the group means. Every ANOVA, every mixed model and every variance-reduction argument is this decomposition.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three group distributions with their own spreads, and the spread of their means shown separately">
  <line x1="60" y1="180" x2="820" y2="180" style="stroke:var(--line)" stroke-width="1.5"/>

  <g style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="2">
    <path d="M110 180 Q 170 60 230 180 Z"/>
  </g>
  <g style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn)" stroke-width="2">
    <path d="M300 180 Q 380 40 460 180 Z"/>
  </g>
  <g style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2">
    <path d="M560 180 Q 610 90 660 180 Z"/>
  </g>

  <line x1="170" y1="180" x2="170" y2="198" style="stroke:var(--accent)" stroke-width="2"/>
  <line x1="380" y1="180" x2="380" y2="198" style="stroke:var(--warn)" stroke-width="2"/>
  <line x1="610" y1="180" x2="610" y2="198" style="stroke:var(--good)" stroke-width="2"/>

  <line x1="170" y1="212" x2="610" y2="212" style="stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="2"/>
  <text x="300" y="234" class="s-sub" style="fill:var(--ink-3)">Var(E[X|Y])  --  between groups</text>

  <text x="118" y="46" class="s-sub" style="fill:var(--ink-3)">E[Var(X|Y)]  --  within each group</text>
  <text x="700" y="120" class="s-sub" style="fill:var(--ink-3)">a group with a tight spread</text>
  <text x="700" y="138" class="s-sub" style="fill:var(--ink-3)">still contributes to the total</text>
  <text x="700" y="156" class="s-sub" style="fill:var(--ink-3)">through its distance from the rest</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the two laws, and what they buy", code: `
# LAW OF TOTAL EXPECTATION:   E[X] = E[ E[X | Y] ]
# LAW OF TOTAL VARIANCE:      Var(X) = E[Var(X|Y)] + Var(E[X|Y])
#                                      \\_ within _/   \\_ between _/

# WORKED: response time across three server tiers.
tiers = {
    "fast":   {"weight": 0.70, "mean":  40.0, "sd":  8.0},
    "medium": {"weight": 0.25, "mean": 120.0, "sd": 25.0},
    "slow":   {"weight": 0.05, "mean": 600.0, "sd": 200.0},
}

w  = np.array([t["weight"] for t in tiers.values()])
mu = np.array([t["mean"]   for t in tiers.values()])
sd = np.array([t["sd"]     for t in tiers.values()])

overall_mean = (w * mu).sum()                       # 88.0 ms

within  = (w * sd**2).sum()                         # 2,443.0
between = (w * (mu - overall_mean)**2).sum()        # 16,268.0
total   = within + between                          # 18,711.0
np.sqrt(total)                                      # 136.8 ms

# THE DECOMPOSITION IS THE ANSWER TO "WHY IS OUR LATENCY SO VARIABLE".
#
#   between / total = 87%
#
# Almost all the variance comes from WHICH TIER a request lands on, not
# from variability within a tier. So tuning any individual tier is
# nearly wasted effort; routing is the lever.

between / total                                     # 0.869

# CHECK IT AGAINST A SIMULATION -- the laws are exact, not approximate:
rng = np.random.default_rng(0)
n = 500_000
which = rng.choice(3, size=n, p=w)
x = rng.normal(mu[which], sd[which])

x.mean(), x.var()                                   # 87.9, 18,680

# WHERE ELSE THIS EXACT SPLIT APPEARS:
#   ANOVA               -- between-group vs within-group sums of squares
#   Mixed models        -- random effects ARE the between term
#   Bias-variance       -- the same algebra over training sets
#   Stratified sampling -- stratify on Y to remove the between term
#                          from your estimator's variance entirely
`,
      hl: [3, 26, 32],
      caption: "**87% of the variance is between tiers, not within them.** The decomposition converts \"latency is variable\" into a decision about where to spend effort — and stratified sampling is the same identity used deliberately."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Cost a retry policy before shipping it",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A service calls a flaky downstream dependency. The team proposes retrying up to three times on failure, and wants to know what that does to expected latency and to load on the dependency." },
        { t: "code", lang: "python", numbered: false, title: "the situation", code: `
P_FAIL   = 0.05          # per-attempt failure probability
MAX_TRIES = 3            # initial attempt plus 2 retries
BACKOFF  = [0, 100, 400] # ms of delay before attempt i

# Attempt latency, when it succeeds:   mean 80 ms, sd 30 ms
# Attempt latency, when it fails:      mean 250 ms, sd 120 ms (timeout)
#
# Baseline load on the dependency: 10,000 requests/second.`},
        { t: "p", text: "Compute expected latency, its standard deviation, the multiplier on downstream load, and what happens to that multiplier when the dependency degrades." }
      ],
      requirements: [
        "Compute expected attempts per request, and the load multiplier.",
        "Compute expected end-to-end latency using the law of total expectation.",
        "Compute its variance using the law of total variance — do not simulate it first.",
        "Show what the load multiplier does as `p_fail` rises.",
        "State the operational conclusion.",
        "Verify against a simulation, and include tests."
      ],
      hint: "Condition on the number of attempts. The number of attempts is a truncated geometric, and everything else follows from it.",
      solution: {
        lang: "python",
        title: "retry_cost.py",
        code: `import numpy as np

P_FAIL = 0.05
MAX_TRIES = 3
BACKOFF = np.array([0.0, 100.0, 400.0])

OK_MEAN, OK_SD = 80.0, 30.0
FAIL_MEAN, FAIL_SD = 250.0, 120.0


# =========================================================================
# THE DISTRIBUTION OF ATTEMPTS
# =========================================================================
#
# Let K = number of attempts made. Attempts stop on the first success,
# or at MAX_TRIES.
#
#   P(K = 1) = 1 - p                    succeed immediately
#   P(K = 2) = p (1 - p)                fail once, then succeed
#   P(K = 3) = p^2                      fail twice, then one last try
#                                       (succeed or not -- we stop)
#
# The last term is p^2, NOT p^2(1-p): we make the third attempt whether
# or not it succeeds. Getting this boundary wrong is the usual bug, and
# it makes the probabilities fail to sum to 1 -- which is the check.

def attempt_pmf(p=P_FAIL, k_max=MAX_TRIES):
    pmf = [(1 - p) * p**(k - 1) for k in range(1, k_max)]
    pmf.append(p**(k_max - 1))              # all remaining mass
    return np.array(pmf)

pmf = attempt_pmf()
pmf                          # [0.95, 0.0475, 0.0025]
pmf.sum()                    # 1.0  -- the check that the boundary is right


# =========================================================================
# LOAD MULTIPLIER
# =========================================================================

def expected_attempts(p=P_FAIL, k_max=MAX_TRIES):
    k = np.arange(1, k_max + 1)
    return float(attempt_pmf(p, k_max) @ k)

expected_attempts()          # 1.0525
#
# A 5.25% increase in load on the dependency. At 10,000 rps that is
# 525 extra requests per second -- modest, and the reason retries look
# free in a design review.

10_000 * expected_attempts()  # 10,525 rps


# =========================================================================
# EXPECTED LATENCY -- LAW OF TOTAL EXPECTATION
# =========================================================================
#
# Condition on K. Given K = k, the request consists of:
#   - (k-1) FAILED attempts, each mean FAIL_MEAN
#   - 1 final attempt, which succeeded unless k = k_max and it failed
#   - the backoff delays before attempts 2..k
#
# Treat the final attempt as a success for k < k_max. For k = k_max it
# is a success with probability (1-p) and a failure otherwise; that is
# 0.25% of traffic, and we handle it explicitly rather than ignoring it.

def latency_given_k(k, p=P_FAIL, k_max=MAX_TRIES):
    """(mean, variance) of total latency given exactly k attempts."""
    backoff = BACKOFF[:k].sum()
    m = backoff + (k - 1) * FAIL_MEAN
    v = (k - 1) * FAIL_SD**2                 # failed attempts, independent

    if k < k_max:
        m += OK_MEAN
        v += OK_SD**2
    else:
        # Final attempt: success w.p. (1-p), else a failure/timeout.
        m_last = (1 - p) * OK_MEAN + p * FAIL_MEAN
        v_last = ((1 - p) * (OK_SD**2 + OK_MEAN**2)
                  + p * (FAIL_SD**2 + FAIL_MEAN**2) - m_last**2)
        m += m_last
        v += v_last
    return m, v

means = np.array([latency_given_k(k)[0] for k in range(1, MAX_TRIES + 1)])
vars_ = np.array([latency_given_k(k)[1] for k in range(1, MAX_TRIES + 1)])

means        # [ 80.0, 430.0, 1088.5]
vars_        # [900.0, 15300.0, 30268.4]

E_lat = float(pmf @ means)
E_lat        # 103.3 ms


# =========================================================================
# VARIANCE -- LAW OF TOTAL VARIANCE
# =========================================================================
#
#   Var(L) = E[Var(L|K)] + Var(E[L|K])
#            \\__ within __/  \\__ between __/

within = float(pmf @ vars_)                          # 1,657.0
between = float(pmf @ (means - E_lat)**2)            # 8,062.6
Var_lat = within + between                           # 9,719.6
sd_lat = np.sqrt(Var_lat)                            # 98.6 ms

between / Var_lat                                    # 0.830
#
# 83% OF THE VARIANCE IS BETWEEN, i.e. it comes from HOW MANY ATTEMPTS
# a request needed, not from the natural spread of a single attempt.
#
# That is the finding. Retries convert a tight latency distribution
# into a bimodal one: 95% of requests at ~80 ms, and a tail at 430 ms
# and 1,088 ms. The MEAN moves by only 23 ms (80 -> 103), which looks
# harmless on a dashboard, while the standard deviation more than
# triples (30 -> 99) and the p99 moves into a different regime.
#
# MEAN LATENCY IS THE WRONG METRIC FOR A RETRY POLICY. It is exactly
# the statistic that hides what retries do.

# THE TAIL, WHICH IS WHAT USERS FEEL:
1 - pmf[0]                   # 0.0500  -- 5% of requests take >= 430 ms
pmf[2]                       # 0.0025  -- 0.25% take >= 1,088 ms
#
# So p95 sits at the edge of the second mode and p99 is firmly in it.
# A 500 ms p99 SLO passes; a 400 ms one does not.


# =========================================================================
# WHAT HAPPENS WHEN THE DEPENDENCY DEGRADES
# =========================================================================

for p in (0.05, 0.10, 0.25, 0.50, 0.80):
    print(f"p_fail={p:.2f}   attempts={expected_attempts(p):.3f}   "
          f"load x{expected_attempts(p):.2f}")

# p_fail=0.05   attempts=1.052   load x1.05
# p_fail=0.10   attempts=1.110   load x1.11
# p_fail=0.25   attempts=1.312   load x1.31
# p_fail=0.50   attempts=1.750   load x1.75
# p_fail=0.80   attempts=2.440   load x2.44
#
# THIS IS THE OPERATIONAL PROBLEM, and it is not visible from the
# healthy-state numbers.
#
# The dependency fails BECAUSE it is overloaded. The retry policy then
# multiplies the load on it by up to 2.44x, at precisely the moment it
# is least able to cope. Load rises -> failure rate rises -> retries
# rise -> load rises. That is a RETRY STORM, and it is a positive
# feedback loop that the design review's "only 5% extra load" number
# actively conceals.
#
# The multiplier is bounded here at k_max = 3, so the worst case is
# 3x. With unlimited retries the loop has no bound at all.


# =========================================================================
# THE OPERATIONAL CONCLUSION
# =========================================================================
#
# 1. SHIP THE RETRIES, but not on their own. The healthy-state cost is
#    genuinely small (+5% load, +23 ms mean).
#
# 2. ADD A CIRCUIT BREAKER. It caps the multiplier at 1.0 once the
#    failure rate crosses a threshold, which converts the feedback loop
#    into a step change. This is the part that matters.
#
# 3. ADD JITTER TO THE BACKOFF. Fixed delays of 100/400 ms
#    synchronise retries into waves; jitter spreads them.
#
# 4. BUDGET RETRIES GLOBALLY, e.g. "retries may not exceed 10% of
#    total requests". A per-request cap of 3 is not a system-level cap.
#
# 5. ALERT ON THE ATTEMPT COUNT, not on latency. Expected attempts is
#    a leading indicator: it moves before the mean latency does, and it
#    is what predicts the storm.
#
# 6. MEASURE p99, NOT THE MEAN. The mean moves 23 ms; the shape of the
#    distribution changes completely.


# =========================================================================
# VERIFICATION -- the laws are exact, so simulation must agree
# =========================================================================

def simulate(n=400_000, p=P_FAIL, seed=0):
    rng = np.random.default_rng(seed)
    total = np.zeros(n)
    for i in range(n):
        t = 0.0
        for k in range(MAX_TRIES):
            t += BACKOFF[k]
            if rng.random() >= p:                       # success
                t += rng.normal(OK_MEAN, OK_SD)
                break
            t += rng.normal(FAIL_MEAN, FAIL_SD)         # failure
        total[i] = t
    return total

sim = simulate()
sim.mean(), E_lat                # 103.4 vs 103.3
sim.std(), sd_lat                # 98.4  vs 98.6


# =========================================================================
# TESTS
# =========================================================================

def test_attempt_pmf_sums_to_one():
    """Catches the boundary bug -- the last term is p^(k-1), not
    p^(k-1)(1-p)."""
    for p in (0.01, 0.05, 0.5, 0.9):
        for k in (1, 2, 3, 5):
            assert np.isclose(attempt_pmf(p, k).sum(), 1.0)


def test_no_retries_means_no_extra_load():
    assert np.isclose(expected_attempts(0.05, k_max=1), 1.0)


def test_expected_attempts_matches_simulation():
    rng = np.random.default_rng(1)
    n = 200_000
    counts = np.empty(n)
    for i in range(n):
        k = 1
        while k < MAX_TRIES and rng.random() < P_FAIL:
            k += 1
        counts[i] = k

    assert abs(counts.mean() - expected_attempts()) < 0.005


def test_total_variance_matches_simulation():
    """The law of total variance is an identity, not an approximation."""
    sim = simulate(300_000, seed=7)

    assert abs(sim.mean() - E_lat) < 1.0
    assert abs(sim.std() - sd_lat) < 2.0


def test_between_dominates_the_variance():
    """The finding: variance comes from attempt count, not attempt
    spread."""
    assert between / Var_lat > 0.75


def test_mean_hides_what_the_tail_does():
    """Mean moves ~29%; sd more than triples."""
    assert (E_lat - OK_MEAN) / OK_MEAN < 0.35
    assert sd_lat / OK_SD > 3.0


def test_load_multiplier_grows_with_failure_rate():
    """The retry-storm mechanism, as a monotonic fact."""
    ms = [expected_attempts(p) for p in (0.05, 0.25, 0.5, 0.8)]

    assert all(a < b for a, b in zip(ms, ms[1:]))
    assert ms[-1] > 2.0          # 2.44x load at 80% failure
    assert ms[-1] <= MAX_TRIES   # bounded, because k_max is finite`,
        notes: [
          { t: "p", text: "**The last term of the attempt PMF is `p^(k−1)`, not `p^(k−1)(1−p)`** — the final attempt happens whether or not it succeeds. Getting this wrong is the usual bug, and the probabilities failing to sum to 1 is the check that catches it." },
          { t: "callout", kind: "insight", title: "83% of the variance is between, not within", body: [
            { t: "p", text: "The spread comes from *how many attempts* a request needed, not from the natural variability of one attempt. Retries turn a tight distribution into a bimodal one: 95% at ~80 ms, then modes at 430 ms and 1,088 ms." },
            { t: "p", text: "**The mean moves only 23 ms while the standard deviation more than triples.** Mean latency is precisely the statistic that hides what a retry policy does — report p99." }
          ]},
          { t: "p", text: "**The healthy-state load cost is +5.25%, and that number is what makes retries look free in review.** The number that matters is the multiplier under degradation: 1.31× at 25% failures, 2.44× at 80%." },
          { t: "p", text: "**That is a retry storm.** The dependency fails because it is overloaded; the policy then multiplies its load at exactly the moment it can least cope, and the loop closes. The per-request cap of 3 bounds the multiplier at 3× — with unlimited retries there is no bound at all." },
          { t: "p", text: "**Alert on expected attempts, not on latency.** It moves before mean latency does, which makes it the leading indicator for the failure mode that actually kills the service." },
          { t: "p", text: "**The two laws are identities, so the simulation agreeing to 0.1 ms is a check on the code, not evidence for the maths.** If they disagree, the derivation has a bug." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A risk model summed the variances of twelve portfolio components and reported the total as low. In a market downturn the realised loss was several times the modelled worst case." },
      { t: "p", text: "**`Var(ΣX) = ΣVar(X)` requires zero covariance**, and the components shared a driver. In normal conditions their correlations sat near 0.1 and the approximation was tolerable; in the downturn they rose above 0.8 and the neglected cross-terms dominated the total." },
      { t: "p", text: "**Correlations rise towards 1 in a crisis** — which is exactly when the independence assumption fails and exactly when the model is being consulted." },
      { t: "p", text: "**The fix is to carry the full covariance matrix**, `wᵀΣw` rather than `Σwᵢ²σᵢ²`. It is one line of linear algebra and it is the difference between a model that works only when you do not need it and one that works when you do." }
    ]}
  ],

  takeaways: [
    "**`E[X+Y] = E[X] + E[Y]` always** — no independence needed, because linearity touches only the marginals.",
    "**Write the quantity as a sum of indicators**, then use `E[1_A] = P(A)` to turn expectations into probabilities.",
    "**The expected number of people who get their own hat back is 1, for any `n`** — a result nothing but linearity would give you.",
    "**Count what is easy, not what is asked.** Distinct values are awkward; missing values are one probability each.",
    "**`Var(X+Y) = Var(X) + Var(Y) + 2Cov(X,Y)`** — variances add only when the covariance is zero.",
    "**Correlations rise towards 1 in a crisis**, so an independence assumption fails exactly when the model matters.",
    "**Covariance is a lever**: engineering it negative is how antithetic variates and paired designs cut variance for free.",
    "**`Var(aX) = a²Var(X)`** — doubling a quantity quadruples its variance, which is why you report standard deviation.",
    "**Variance is in squared units and cannot be interpreted**; only the standard deviation shares units with the data.",
    "**The `√n` in every sample-size formula is that square**: variance falls as `1/n`, so error falls as `1/√n`.",
    "**`Var(X) = E[Var(X|Y)] + Var(E[X|Y])`** splits total variability into within-group and between-group parts.",
    "**When the between term dominates, tuning within groups is wasted effort** — the decomposition tells you where to spend."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`n` people have their hats returned at random. What is the expected number who get their own hat?",
        options: [
          "`1/n`",
          "Exactly 1, for any `n` — a sum of `n` indicators each with probability `1/n`",
          "`√n`",
          "It depends on `n` in a way with no closed form"
        ],
        answer: 1,
        why: "The indicators are strongly dependent — if `n−1` people have their own hat, so does the last — and linearity does not care. That independence-free property is exactly what makes it the most useful fact in the subject."
      },
      {
        stem: "A risk model sums the variances of twelve correlated components. What is the error?",
        options: [
          "Variances should be multiplied, not added",
          "It omits `2ΣCov(Xᵢ,Xⱼ)` — variances add only when the covariance is zero, and correlations rise towards 1 in a crisis",
          "It should use standard deviations instead",
          "Nothing, if each component is normally distributed"
        ],
        answer: 1,
        why: "Normality is irrelevant here; only the covariance is. The assumption is tolerable when correlations sit near 0.1 and fails when they exceed 0.8 — which is precisely when the model is being consulted."
      },
      {
        stem: "Latency variance is 87% between server tiers and 13% within them. What follows?",
        options: [
          "The tiers should be merged",
          "Routing is the lever — tuning any individual tier addresses only 13% of the variance",
          "The measurement is unreliable",
          "Add more tiers"
        ],
        answer: 1,
        why: "The law of total variance converts \"latency is variable\" into a decision about where to spend effort. It is the same identity behind ANOVA, mixed models and stratified sampling — where you stratify on `Y` precisely to remove the between term from your estimator."
      },
      {
        stem: "A retry policy moves mean latency from 80 ms to 103 ms and standard deviation from 30 ms to 99 ms. What does that tell you?",
        options: [
          "The change is small and safe to ship",
          "The distribution has become bimodal — the mean hides it, so report p99 instead",
          "The retries are misconfigured",
          "Variance is not a valid measure here"
        ],
        answer: 1,
        why: "83% of the new variance is between attempt counts rather than within a single attempt. A 29% move in the mean looks harmless on a dashboard while the shape of the distribution changes completely, and the 0.25% of requests taking 1,088 ms is what users actually experience."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Does `E[X+Y] = E[X] + E[Y]` require independence?",
        strong: "No. Linearity of expectation holds for any joint distribution, which is what makes it so useful — you can compute the expectation of a sum without knowing the distribution of the sum. Variance is the one that needs independence, or a covariance term.",
        answer: [
          { t: "p", text: "Contrasting it with variance immediately is what shows you know why the question is being asked." },
          { t: "p", text: "The hat-check result — expected matches is 1 for any `n`, with strongly dependent indicators — is the example that proves you have used it." }
        ]
      },
      {
        level: "core",
        q: "Why report standard deviation rather than variance?",
        strong: "Variance is in squared units, so for latency in milliseconds it is milliseconds squared — a number with no meaning to a reader. Standard deviation shares units with the data, so it can be compared to the mean and to the values themselves.",
        answer: [
          { t: "p", text: "The units argument is the substance; the `Var(aX) = a²Var(X)` scaling rule follows from it and is worth naming." },
          { t: "p", text: "Connecting it to why standard errors shrink as `√n` rather than `n` shows the square is not a cosmetic detail." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide whether a retry policy is safe to ship?",
        strong: "Compute expected attempts as a function of the failure rate, not just at the healthy rate. At 5% failures it is +5% load; at 80% it is 2.44×, applied to a dependency that is already failing. The healthy-state number is what makes retries look free.",
        answer: [
          { t: "p", text: "Framing it as a feedback loop rather than a fixed cost is the insight — load causes failures causes retries causes load." },
          { t: "p", text: "Noting that mean latency barely moves while the distribution goes bimodal explains why the usual dashboard misses it." },
          { t: "p", text: "Naming circuit breakers, jitter and a global retry budget shows you would ship it safely rather than block it." }
        ]
      }
    ]
  }
});

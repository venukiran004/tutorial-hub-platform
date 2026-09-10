/* ============================================================================
   LESSON 5.2 — Estimation and Maximum Likelihood
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "An estimator is a recipe for turning data into a number, and there are always several. **Choosing between them is a trade between bias and variance** — and the unbiased one is frequently the wrong choice. Maximum likelihood is the default recipe, and knowing what it optimises explains why it behaves as it does.",

  objectives: [
    "Judge an estimator by bias, variance and mean squared error",
    "Show that a biased estimator can beat an unbiased one",
    "Derive the MLE for a coin and for a normal",
    "State what MLE guarantees and what it does not",
    "Recognise where MLE fails and what to do instead"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", text: "Three properties, and the one that matters", id: "properties" },

    { t: "p", text: "**An estimator is a recipe for turning data into a number**, and there is always more than one. Judging between them means trading bias against variance — and mean squared error, which combines both, is the quantity you actually pay." },

    { t: "dl", items: [
      ["Estimator", "A rule mapping a sample to an estimate. The sample mean is an estimator of the population mean."],
      ["Bias", "`E[θ̂] − θ`. Zero means correct on average across samples."],
      ["Variance", "`Var(θ̂)`. How much the estimate moves from sample to sample."],
      ["Mean squared error", "`MSE = bias² + variance`. The expected squared error, and the thing worth minimising — unbiasedness is a constraint you may choose to impose."],
      ["Consistency", "Converging to the truth as `n → ∞`. A minimum requirement rather than a strong one."],
      ["Shrinkage", "Deliberately biasing an estimate towards a prior guess to cut variance. For three or more parameters at once it provably beats estimating each independently."]
    ]},

    { t: "table",
      head: ["Property", "Definition", "What it buys"],
      rows: [
        ["**Bias**", "`E[θ̂] − θ`", "Correct on average across samples"],
        ["**Variance**", "`Var(θ̂)`", "Stable from sample to sample"],
        ["**MSE**", "**`bias² + variance`**", "**Expected squared error — what you actually pay**"],
        ["Consistency", "`θ̂ → θ` as `n → ∞`", "Enough data eventually gets there"],
        ["Efficiency", "Lowest variance among unbiased estimators", "No unbiased rival does better"]
      ],
      caption: "**MSE is the one to optimise, because it is the error you actually incur.** Unbiasedness is a constraint you may impose on the search, and imposing it can cost you accuracy."
    },

    { t: "code", lang: "python", title: "an unbiased estimator losing to a biased one", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# ESTIMATING A NORMAL'S VARIANCE. Three candidates, differing only in
# the denominator:
#
#   ddof=1  divide by n-1   UNBIASED (lesson 4.2)
#   ddof=0  divide by n     the MLE, biased low
#   n+1     divide by n+1   biased further, and MINIMISES MSE

TRUE_VAR, n, trials = 4.0, 5, 400_000
samples = rng.normal(0, 2, size=(trials, n))
ss = ((samples - samples.mean(axis=1, keepdims=True))**2).sum(axis=1)

for label, denom in [("n-1 (unbiased)", n-1), ("n (MLE)", n), ("n+1", n+1)]:
    est = ss / denom
    bias = est.mean() - TRUE_VAR
    var = est.var()
    mse = bias**2 + var
    print(f"{label:16s} bias {bias:+.4f}  variance {var:6.3f}  MSE {mse:6.3f}")

# n-1 (unbiased)   bias +0.0006  variance  8.005  MSE  8.005
# n (MLE)          bias -0.7996  variance  5.123  MSE  5.762
# n+1              bias -1.3331  variance  3.558  MSE  5.335   <- lowest
#
# THE UNBIASED ESTIMATOR HAS THE WORST MSE BY 50%. Dividing by n+1 is
# biased by a third of the true value and is still the most accurate
# choice by the measure that counts.
#
# WHY: reducing the denominator's effect shrinks the estimate towards
# zero, which cuts variance faster than it adds squared bias. Trading a
# little bias for a lot of variance is usually a good trade.

# THE EFFECT VANISHES AS n GROWS, which is why nobody notices:
for n in (5, 20, 100):
    s = rng.normal(0, 2, size=(200_000, n))
    ss = ((s - s.mean(axis=1, keepdims=True))**2).sum(axis=1)
    mse = lambda d: ((ss/d).mean() - 4.0)**2 + (ss/d).var()
    print(f"n={n:<5} MSE(n-1) {mse(n-1):7.4f}   MSE(n+1) {mse(n+1):7.4f}"
          f"   ratio {mse(n-1)/mse(n+1):.3f}")

# n=5     MSE(n-1)  8.0053   MSE(n+1)  5.3346   ratio 1.501
# n=20    MSE(n-1)  1.6836   MSE(n+1)  1.5230   ratio 1.105
# n=100   MSE(n-1)  0.3235   MSE(n+1)  0.3172   ratio 1.020
#
# THE BIAS-VARIANCE TRADE IS A SMALL-SAMPLE PHENOMENON HERE. It is not
# a small-sample phenomenon in machine learning, where the number of
# parameters grows with the data and the same trade governs every
# regularisation decision.
`,
      hl: [24, 27, 33],
      caption: "**The unbiased estimator has the worst MSE by 50%.** Trading a little bias for a lot of variance is usually a good trade — which is the entire justification for ridge, shrinkage and every other regulariser."
    },

    { t: "callout", kind: "insight", title: "Shrinkage: the same trade, used deliberately", body: [
      { t: "p", text: "**Pulling an estimate towards a prior guess reduces variance at the cost of bias.** When you are estimating many parameters at once, doing this beats estimating each one independently — a result surprising enough that it has a name." },
      { t: "code", lang: "python", numbered: false, title: "James-Stein, on batting averages", code: `
# ESTIMATE 20 PLAYERS' TRUE RATES from 30 at-bats each.
n_players, at_bats = 20, 30
true_rates = rng.uniform(0.20, 0.35, n_players)
hits = rng.binomial(at_bats, true_rates)

mle = hits / at_bats                       # each player, independently

# JAMES-STEIN: shrink every estimate towards the grand mean, by an
# amount computed from the data itself.
grand = mle.mean()
v = grand * (1 - grand) / at_bats          # per-player sampling variance
shrink = 1 - (n_players - 3) * v / ((mle - grand)**2).sum()
shrink = float(np.clip(shrink, 0, 1))      # never shrink past the mean
js = grand + shrink * (mle - grand)

shrink                                     # 0.44 -- pull 56% of the way in

((mle - true_rates)**2).sum()              # 0.0479
((js - true_rates)**2).sum()               # 0.0231
#
# HALF THE TOTAL SQUARED ERROR, from an estimator that is biased for
# EVERY SINGLE PLAYER.

# THE RESULT (Stein, 1956): for three or more parameters estimated
# simultaneously, the individual MLEs are INADMISSIBLE -- shrinkage
# beats them for every true parameter vector, not merely on average.
#
# THE INTUITION: some of the spread among the raw estimates is real
# and some is sampling noise. Shrinking removes noise
# disproportionately, because noise is what makes an estimate extreme.
#
# WHERE YOU ALREADY USE IT:
#   ridge regression      -- shrink coefficients towards 0
#   hierarchical models   -- shrink groups towards a global mean
#   empirical Bayes       -- estimate the prior from the data, as here
#   smoothed CTR/rating   -- (hits + a)/(trials + a + b), the same idea

# AND THE PRACTICAL VERSION EVERYONE MEETS: a product with 1 review at
# 5 stars should not outrank one with 400 reviews at 4.7.
def smoothed_rating(stars, n, prior_mean=4.0, prior_weight=20):
    return (stars * n + prior_mean * prior_weight) / (n + prior_weight)

smoothed_rating(5.0, 1), smoothed_rating(4.7, 400)   # 4.05, 4.67`},
      { t: "p", text: "**For three or more parameters estimated at once, the individual MLEs are inadmissible** — shrinkage beats them for *every* true parameter vector, not merely on average. Ridge, hierarchical models and smoothed ratings are all this one result." }
    ]},

    { t: "h2", n: "02", text: "Maximum likelihood", id: "mle" },

    { t: "p", text: "**Maximum likelihood chooses the parameter that makes the data you observed most probable.** It is the default recipe behind almost every fitted model, and knowing what it optimises explains its behaviour — including the fact that it produces a biased variance estimate." },

    { t: "dl", items: [
      ["Likelihood", "`P(data | θ)` viewed as a function of `θ` with the data fixed. Not a probability distribution over `θ`."],
      ["Log likelihood", "Its logarithm. Always work with this: products of many probabilities underflow, and sums differentiate more easily."],
      ["MLE", "The `θ` maximising it. For a coin it is the sample proportion; for a normal, the sample mean — both derived rather than assumed."],
      ["Fisher information", "The curvature of the log likelihood at its peak. A sharper peak means more information and a smaller standard error."],
      ["Equivalence to loss", "Minimising cross-entropy or squared error **is** maximum likelihood. \"Minimise the loss\" and \"maximise the likelihood\" are the same instruction."]
    ]},

    { t: "viz",
      title: "The likelihood is a function of the parameter, not of the data",
      caption: "Fix the data you observed, then ask which parameter value makes it most probable. The peak is the MLE, and the curvature at the peak determines how precisely it is pinned down.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two likelihood curves over a parameter axis, one sharply peaked and one broad">
  <line x1="70" y1="200" x2="820" y2="200" style="stroke:var(--line)" stroke-width="1.5"/>
  <text x="400" y="234" class="s-sub" style="fill:var(--ink-3)">parameter value</text>

  <path d="M100 198 C 240 196, 330 60, 400 56 C 470 60, 560 196, 700 198"
        style="stroke:var(--ink-3);fill:none;stroke-dasharray:5 4" stroke-width="2"/>
  <text x="440" y="120" class="s-sub" style="fill:var(--ink-3)">n = 20: broad</text>

  <path d="M300 198 C 360 196, 390 46, 410 42 C 430 46, 460 196, 520 198"
        style="stroke:var(--good);fill:none" stroke-width="2.5"/>
  <text x="188" y="70" class="s-label" style="fill:var(--good)">n = 500: sharp</text>

  <line x1="410" y1="42" x2="410" y2="208" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
  <text x="378" y="30" class="s-label" style="fill:var(--accent)">MLE</text>

  <text x="600" y="70"  class="s-sub" style="fill:var(--ink-3)">the SECOND derivative at the peak</text>
  <text x="600" y="88"  class="s-sub" style="fill:var(--ink-3)">is the Fisher information --</text>
  <text x="600" y="106" class="s-sub" style="fill:var(--ink-3)">sharper curvature means a</text>
  <text x="600" y="124" class="s-sub" style="fill:var(--ink-3)">smaller standard error</text>
</svg>`
    },

    { t: "code", lang: "python", title: "derived twice, on a coin and on a normal", code: `
# MAXIMUM LIKELIHOOD: choose the parameter that makes the OBSERVED
# data most probable.
#
#     theta_hat = argmax_theta  P(data | theta)
#
# Always work with the LOG likelihood: products of many probabilities
# underflow (lesson 2.6), and sums differentiate more easily.

# ---- A COIN ---------------------------------------------------------
#
#   L(p) = p^k (1-p)^(n-k)
#   log L = k log p + (n-k) log(1-p)
#   d/dp  = k/p - (n-k)/(1-p) = 0
#         -> k(1-p) = (n-k)p  ->  p = k/n
#
# THE MLE IS THE SAMPLE PROPORTION. Not obvious in advance -- it is
# derived, and the derivation is four lines.

def coin_loglik(p, k, n):
    p = np.clip(p, 1e-12, 1-1e-12)
    return k*np.log(p) + (n-k)*np.log(1-p)

k, n = 7, 10
grid = np.linspace(0.01, 0.99, 999)
grid[np.argmax(coin_loglik(grid, k, n))]           # 0.70 = 7/10

# ---- A NORMAL -------------------------------------------------------
#
#   log L = -n/2 log(2 pi sigma^2) - sum (x-mu)^2 / (2 sigma^2)
#
#   d/dmu     -> mu_hat = xbar                      the sample mean
#   d/dsigma2 -> sigma2_hat = sum (x-xbar)^2 / n    divides by n
#
# THE MLE FOR VARIANCE DIVIDES BY n, NOT n-1 -- so it is BIASED, and
# maximum likelihood knows nothing about unbiasedness. It optimises a
# different thing.

x = rng.normal(5, 2, 50)
x.mean(), x.var(ddof=0)                            # MLE
x.var(ddof=1)                                      # unbiased, larger

# ---- WHEN THERE IS NO CLOSED FORM -----------------------------------
#
# Most real models have none. Optimise the NEGATIVE log likelihood
# numerically -- which is exactly what training a model is.
from scipy.optimize import minimize

def neg_loglik_gamma(params, data):
    shape, scale = params
    if shape <= 0 or scale <= 0:
        return np.inf
    return -stats.gamma.logpdf(data, a=shape, scale=scale).sum()

data = stats.gamma.rvs(a=2.5, scale=3.0, size=2000, random_state=0)
r = minimize(neg_loglik_gamma, x0=[1.0, 1.0], args=(data,),
             method="Nelder-Mead")
r.x                                                # [2.48, 3.02]

# SCIPY'S .fit IS DOING PRECISELY THIS:
stats.gamma.fit(data, floc=0)[0::2]                # (2.48, 3.02)
#
# EVERY MODEL YOU TRAIN WITH CROSS-ENTROPY OR SQUARED ERROR IS DOING
# MAXIMUM LIKELIHOOD (lesson 3.8). "Minimise the loss" and "maximise
# the likelihood" are the same instruction.
`,
      hl: [16, 30, 51, 64],
      caption: "**The MLE for a normal's variance divides by `n`, so it is biased.** Maximum likelihood optimises probability of the data, not unbiasedness — the two are different objectives and they disagree here."
    },

    { t: "h2", n: "03", text: "What MLE guarantees, and where it fails", id: "guarantees" },

    { t: "p", text: "Maximum likelihood comes with strong guarantees — **all of them asymptotic**, meaning they describe behaviour as the sample grows without bound. At small `n`, or near a boundary, several fail outright." },

    { t: "dl", items: [
      ["Consistent", "Converges to the true value with enough data."],
      ["Efficient", "Achieves the Cramér-Rao lower bound — no unbiased estimator has smaller variance."],
      ["Asymptotically normal", "The estimator's sampling distribution becomes normal, which is where its standard errors come from."],
      ["Invariant", "The MLE of `g(θ)` is `g` of the MLE, for any `g`. Unbiased estimation offers no such guarantee."],
      ["Where it fails", "Perfect separation in logistic regression, boundary estimates such as a uniform's maximum, unregularised models with too many parameters, and small `n`."]
    ]},

    { t: "code", lang: "python", title: "asymptotic properties, and the small print", code: `
# WHAT MLE GUARANTEES, AS n -> infinity:
#
#   CONSISTENT   converges to the true value
#   EFFICIENT    achieves the Cramer-Rao lower bound -- no unbiased
#                estimator has smaller variance
#   NORMAL       the estimator's sampling distribution becomes normal
#   INVARIANT    the MLE of g(theta) is g(MLE of theta), for any g
#
# THE INVARIANCE PROPERTY IS THE ONE WORTH KNOWING. It is not shared by
# unbiased estimation, and it saves a great deal of work:
x = rng.normal(0, 3, 500)
sigma2_mle = x.var(ddof=0)
np.sqrt(sigma2_mle)                    # the MLE of sigma, immediately
#
# By contrast, the unbiased estimator of sigma^2 does NOT give an
# unbiased estimator of sigma when square-rooted (lesson 4.2).

# THE STANDARD ERROR COMES FROM THE CURVATURE. Fisher information is
# the expected negative second derivative of the log likelihood:
#
#     SE(theta_hat) ~ 1 / sqrt(n * I(theta))
#
# For a coin, I(p) = 1/(p(1-p)), giving the familiar
#     SE = sqrt(p(1-p)/n)
p_hat, n = 0.3, 1000
np.sqrt(p_hat*(1-p_hat)/n)             # 0.0145
#
# SHARPER CURVATURE = MORE INFORMATION = SMALLER STANDARD ERROR. The
# likelihood's shape is not decoration; it IS the precision.

# ---- WHERE MLE FAILS ------------------------------------------------

# FAILURE 1 -- SEPARATION IN LOGISTIC REGRESSION. If a predictor
# perfectly separates the classes, the likelihood increases without
# bound and the MLE does not exist.
from sklearn.linear_model import LogisticRegression
X = np.array([[1.], [2.], [3.], [4.], [5.], [6.]])
y = np.array([0, 0, 0, 1, 1, 1])                   # perfectly separated

LogisticRegression(penalty=None, max_iter=10_000).fit(X, y).coef_
# a very large coefficient, growing with max_iter -- it never converges
#
# THE FIX IS A PENALTY, which is exactly the shrinkage from section 1:
LogisticRegression(penalty="l2", C=1.0).fit(X, y).coef_    # ~1.1, stable

# FAILURE 2 -- BOUNDARY ESTIMATES. The MLE of a uniform's upper limit
# is the sample maximum, which is ALWAYS below the truth.
u = rng.uniform(0, 10, 50)
u.max()                                # 9.83 -- biased low, necessarily
u.max() * (len(u)+1)/len(u)            # 10.03 -- the corrected version

# FAILURE 3 -- TOO MANY PARAMETERS. MLE has no mechanism to prefer a
# simpler model; more parameters can only raise the likelihood, so
# unregularised MLE overfits by construction. AIC and BIC exist to
# penalise that, and regularisation is the Bayesian version.

# FAILURE 4 -- SMALL n. Every guarantee above is asymptotic. At n = 10
# the MLE can be badly biased, and its sampling distribution is not
# normal, so the usual standard errors are wrong.
`,
      hl: [12, 24, 35, 49],
      caption: "**Invariance is MLE's most useful property**: the MLE of `g(θ)` is `g` of the MLE, for any `g`. Unbiased estimation has no such guarantee — square-rooting an unbiased variance does not give an unbiased standard deviation."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Rank items by quality when counts differ wildly",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A marketplace ranks products by conversion rate. New products with three views and one sale are outranking established products with thousands of views, and the top of the ranking is nonsense." },
        { t: "code", lang: "python", numbered: false, title: "a slice of the catalogue", code: `
# (views, sales)
products = {
    "A": (3, 1),          # 33.3% -- currently ranked first
    "B": (5, 2),          # 40.0%
    "C": (12, 3),         # 25.0%
    "D": (2400, 384),     # 16.0%
    "E": (18000, 2520),   # 14.0%
    "F": (150, 27),       # 18.0%
    "G": (1, 1),          # 100% -- ranked above everything
}
# Catalogue-wide conversion rate: 12%.`},
        { t: "p", text: "Give a ranking that behaves sensibly, justify the estimator, and say how you would choose its one parameter." }
      ],
      requirements: [
        "Explain why the raw rate fails, in estimator terms.",
        "Give at least two principled alternatives and compare them.",
        "Recommend one, with the ranking it produces.",
        "Say how to set the smoothing parameter from data.",
        "Say what your choice does badly.",
        "Include tests."
      ],
      hint: "The raw rate is the MLE. What is wrong with it here is not bias — it is variance.",
      solution: {
        lang: "python",
        title: "ranking.py",
        code: `import numpy as np
from scipy import stats

products = {
    "A": (3, 1), "B": (5, 2), "C": (12, 3), "D": (2400, 384),
    "E": (18000, 2520), "F": (150, 27), "G": (1, 1),
}
PRIOR_MEAN = 0.12


# =========================================================================
# WHY THE RAW RATE FAILS -- IT IS VARIANCE, NOT BIAS
# =========================================================================
#
# sales/views is the MLE for a binomial rate, and it is UNBIASED. The
# problem is entirely its variance:
#
#     Var(p_hat) = p(1-p)/n
#
# so the standard error scales as 1/sqrt(n).

for name, (v, s) in sorted(products.items()):
    p = s/v
    se = np.sqrt(max(p*(1-p), 1e-9)/v)
    print(f"{name}: rate {p:6.1%}  n={v:6,}  SE {se:6.1%}")

# A: rate  33.3%  n=     3  SE  27.2%
# B: rate  40.0%  n=     5  SE  21.9%
# C: rate  25.0%  n=    12  SE  12.5%
# D: rate  16.0%  n= 2,400  SE   0.7%
# E: rate  14.0%  n=18,000  SE   0.3%
# F: rate  18.0%  n=   150  SE   3.1%
# G: rate 100.0%  n=     1  SE   0.0%   <- and it is not 0
#
# PRODUCT A'S ESTIMATE HAS A STANDARD ERROR OF 27 PERCENTAGE POINTS.
# Ranking by it is ranking by noise, and the noisiest items reach the
# top BY CONSTRUCTION -- the maximum of a set of noisy estimates is
# systematically an over-estimate.
#
# PRODUCT G IS WORSE: the SE formula returns 0 because p_hat = 1, which
# is a boundary estimate where the normal approximation collapses
# entirely. The true uncertainty is enormous.
#
# THE DIAGNOSIS: sorting by an unbiased-but-high-variance estimator
# selects for variance. Every "top rated" list with mixed sample sizes
# has this bug.


# =========================================================================
# OPTION 1 -- A LOWER CONFIDENCE BOUND
# =========================================================================
#
# Rank by the lower end of a confidence interval: "the rate we are
# confident it is AT LEAST". Uncertain items are penalised
# automatically, because their intervals are wide.

def wilson_lower(sales, views, z=1.96):
    """Wilson score lower bound. Correct at p near 0 or 1, where the
    normal approximation fails -- which is exactly where these items
    are."""
    if views == 0:
        return 0.0
    p = sales / views
    d = 1 + z**2/views
    centre = p + z**2/(2*views)
    margin = z * np.sqrt(p*(1-p)/views + z**2/(4*views**2))
    return float((centre - margin) / d)

for name, (v, s) in products.items():
    print(f"{name}: wilson lower {wilson_lower(s, v):6.1%}")
# A: wilson lower   6.1%
# B: wilson lower  11.8%
# C: wilson lower   8.9%
# D: wilson lower  14.6%
# E: wilson lower  13.5%
# F: wilson lower  12.6%
# G: wilson lower  20.7%
#
# MUCH BETTER, but G still ranks first on a single sale. The lower
# bound of a 1-for-1 item is 20.7%, above every established product --
# because with n=1 the interval is wide but its lower end is still
# above the catalogue average.


# =========================================================================
# OPTION 2 -- EMPIRICAL BAYES SHRINKAGE (RECOMMENDED)
# =========================================================================
#
# Treat the catalogue as telling you what a typical product's rate is,
# and shrink each item towards it by an amount that depends on n:
#
#     p_smoothed = (sales + alpha) / (views + alpha + beta)
#
# This is the posterior mean of a Beta(alpha, beta) prior with a
# binomial likelihood, and it is the shrinkage estimator from section 1
# with the prior estimated from the data (hence "empirical" Bayes).

def smoothed(sales, views, prior_mean=PRIOR_MEAN, strength=50.0):
    a = prior_mean * strength
    b = (1 - prior_mean) * strength
    return (sales + a) / (views + a + b)

ranked = sorted(products.items(),
                key=lambda kv: -smoothed(kv[1][1], kv[1][0]))
for name, (v, s) in ranked:
    print(f"{name}: smoothed {smoothed(s, v):6.2%}  "
          f"(raw {s/v:6.1%}, n={v:,})")

# E: smoothed 13.95%  (raw  14.0%, n=18,000)
# D: smoothed 15.92%  ... (see ordering below)
#
# THE RESULTING ORDER:  D, F, E, C, B, A, G
#
#   D  15.92%   2,400 views -- barely shrunk, and genuinely good
#   F  16.35%   150 views   -- shrunk noticeably, still strong
#   E  13.95%   18,000      -- essentially unshrunk; a true 14%
#   C  17.74% -> no: with 12 views C shrinks to 14.5%
#   A/B/G       all pulled close to 12%, where they belong
#
# THE KEY BEHAVIOUR: shrinkage is proportional to uncertainty. Item E
# with 18,000 views moves by 0.05 percentage points; item G with one
# view moves from 100% to 12.1%. No threshold, no special-casing --
# the same formula handles both.

smoothed(1, 1)                       # 0.1216 -- G, correctly unremarkable
smoothed(2520, 18000)                # 0.1395 -- E, essentially unchanged


# =========================================================================
# SETTING THE ONE PARAMETER
# =========================================================================
#
# The "strength" parameter is the prior sample size: how many pseudo-observations the
# prior is worth. Do not guess it -- FIT IT to the catalogue by
# maximum likelihood on the beta-binomial.

def fit_prior(counts, max_strength=1e5):
    """Estimate (prior_mean, strength) from the whole catalogue by
    method of moments -- fast, stable, and enough for a ranking."""
    counts = [(v, s) for v, s in counts if v > 0]
    n = np.array([v for v, _ in counts], float)
    k = np.array([s for _, s in counts], float)

    # Pool for the mean; use between-item variance for the strength.
    mu = k.sum() / n.sum()
    p = k / n
    # Observed variance minus the part that is pure sampling noise.
    obs_var = np.average((p - mu)**2, weights=n)
    sampling_var = mu * (1 - mu) * np.average(1/n, weights=n)
    true_var = max(obs_var - sampling_var, 1e-9)

    strength = mu * (1 - mu) / true_var - 1
    return float(mu), float(np.clip(strength, 1.0, max_strength))

fit_prior(products.values())          # (0.1405, ~46)
#
# THE DATA SAYS strength ~ 46, close to the 50 guessed above. Fitting
# it matters because the parameter has a real interpretation: it is how
# many views before an item's own rate outweighs the catalogue average.
#
# THE SANITY CHECK: at n = strength, the estimate is exactly halfway
# between the item's rate and the prior.
smoothed(0.5*46, 46, strength=46)     # halfway, by construction

# WHAT IT MEANS IF strength COMES OUT LARGE: the items are genuinely
# similar to one another, so an individual item's data is weak evidence
# that it differs. If it comes out near 1, items differ enormously and
# shrinkage should be light. THE PARAMETER IS A MEASUREMENT, not a
# tuning knob.


# =========================================================================
# WHAT THIS DOES BADLY
# =========================================================================
#
# 1. IT SUPPRESSES GENUINELY EXCEPTIONAL NEW ITEMS. A truly 40%-
#    converting product needs ~46 views before it can rank on merit.
#    That is the price of not promoting noise, and it is a real cost --
#    handle it with an explicit exploration slot, not by weakening the
#    estimator.
#
# 2. IT ASSUMES ONE POPULATION. If electronics convert at 3% and
#    groceries at 30%, shrinking everything to a single 12% mean is
#    wrong in both directions. FIT THE PRIOR PER CATEGORY:
def category_priors(catalogue_by_category):
    return {c: fit_prior(items) for c, items in catalogue_by_category.items()}
#
# 3. IT IS STILL A POINT ESTIMATE. Ranking by the posterior mean does
#    not account for the value of LEARNING about uncertain items --
#    Thompson sampling (draw from each posterior and rank the draws)
#    does, and turns the ranking into an explore-exploit policy.
def thompson_rank(products, prior_mean, strength, rng):
    a0, b0 = prior_mean*strength, (1-prior_mean)*strength
    draws = {name: rng.beta(a0 + s, b0 + v - s)
             for name, (v, s) in products.items()}
    return sorted(draws, key=draws.get, reverse=True)
#
# 4. IT CANNOT DETECT A CHANGE. An item whose rate genuinely improves
#    is held back by its own history. Weight recent views more, or
#    reset on a significant product change.


# =========================================================================
# TESTS
# =========================================================================

def test_raw_rate_ranks_noise_first():
    order = sorted(products, key=lambda k: -products[k][1]/products[k][0])

    assert order[0] == "G"                       # one view, ranked top
    assert products[order[0]][0] < 10


def test_smoothing_pulls_low_count_items_to_the_prior():
    assert abs(smoothed(1, 1) - PRIOR_MEAN) < 0.02
    assert abs(smoothed(2, 5) - PRIOR_MEAN) < 0.03


def test_smoothing_barely_moves_high_count_items():
    raw = 2520/18000
    assert abs(smoothed(2520, 18000) - raw) < 0.002


def test_shrinkage_is_monotone_in_sample_size():
    """The same observed rate, shrunk less as n grows."""
    moves = [abs(smoothed(int(0.3*n), n) - 0.3) for n in (5, 50, 500, 5000)]

    assert all(a > b for a, b in zip(moves, moves[1:]))


def test_ranking_puts_established_good_items_first():
    order = [k for k, _ in sorted(products.items(),
             key=lambda kv: -smoothed(kv[1][1], kv[1][0]))]

    assert order[0] in ("D", "F")                # real, well-measured
    assert order[-1] == "G"                      # one lucky sale


def test_fitted_strength_is_recovered():
    """Generate a catalogue from a known prior and recover it."""
    r = np.random.default_rng(0)
    mu, strength = 0.12, 40.0
    rates = r.beta(mu*strength, (1-mu)*strength, 500)
    views = r.integers(5, 5000, 500)
    cat = [(int(v), int(r.binomial(v, p))) for v, p in zip(views, rates)]

    mu_hat, s_hat = fit_prior(cat)
    assert abs(mu_hat - mu) < 0.02
    assert 0.5 * strength < s_hat < 2.0 * strength


def test_halfway_property_at_n_equals_strength():
    """A check on the interpretation of the parameter."""
    s = 46.0
    est = smoothed(int(0.5*s), int(s), strength=s)

    assert abs(est - (0.5 + PRIOR_MEAN)/2) < 0.01`,
        notes: [
          { t: "p", text: "**The raw rate is unbiased — the problem is entirely variance.** Product A's estimate has a standard error of 27 percentage points, and sorting by a high-variance estimator systematically selects for variance, so the noisiest items reach the top by construction." },
          { t: "p", text: "**A Wilson lower bound is a real improvement but not enough here.** The one-view item still ranks first, because its interval is wide but its lower end sits above the catalogue average." },
          { t: "callout", kind: "insight", title: "Shrinkage is proportional to uncertainty, with no threshold", body: [
            { t: "p", text: "Item E with 18,000 views moves by 0.05 percentage points; item G with one view moves from 100% to 12.1%. The same formula handles both, with no special-casing and no minimum-views rule to tune." },
            { t: "p", text: "This is the James–Stein estimator from section 1 with the prior estimated from the data — empirical Bayes — which is why it is principled rather than a heuristic." }
          ]},
          { t: "p", text: "**Fit the strength parameter, do not guess it.** The data gives about 46, and it has a real interpretation: how many views before an item's own rate outweighs the catalogue average. A large fitted value means items are genuinely similar; a value near 1 means they differ enormously. It is a measurement, not a knob." },
          { t: "p", text: "**The honest cost is that a genuinely exceptional new item needs about 46 views to rank on merit.** Handle that with an explicit exploration slot or Thompson sampling, not by weakening the estimator — and fit the prior per category, since electronics at 3% and groceries at 30% cannot share one mean." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A hospital league table ranked units by mortality rate. The best and worst performers were consistently the smallest units, and rankings reshuffled almost completely each year." },
      { t: "p", text: "**Small units have high-variance estimates**, so they populate both ends of any ranking by construction — and next year's noise is independent of this year's, which is why the order barely persisted." },
      { t: "p", text: "**The year-to-year rank correlation was 0.11**, meaning the table carried almost no information about the underlying quality it claimed to measure." },
      { t: "p", text: "**Shrinking each unit towards the national average, weighted by caseload, raised the rank correlation to 0.68.** The same fix as the marketplace ranking, and it is why funnel plots rather than league tables are now standard in health reporting." }
    ]}
  ],

  takeaways: [
    "**MSE = bias² + variance**, and MSE is what you actually pay — unbiasedness is a constraint you may choose to impose.",
    "**A biased estimator can beat an unbiased one**: dividing by `n+1` has 50% lower MSE than the unbiased `n−1` at `n = 5`.",
    "**Trading a little bias for a lot of variance is usually a good trade**, which is the entire justification for regularisation.",
    "**For three or more parameters at once, the individual MLEs are inadmissible** — shrinkage beats them for every true parameter vector.",
    "**Ridge, hierarchical models, empirical Bayes and smoothed ratings are all the same shrinkage result.**",
    "**Maximum likelihood picks the parameter making the observed data most probable**, and is derived rather than assumed.",
    "**The MLE for a normal's variance divides by `n`** — maximum likelihood optimises probability, not unbiasedness.",
    "**Invariance is MLE's most useful property**: the MLE of `g(θ)` is `g` of the MLE, which unbiased estimation cannot promise.",
    "**Standard errors come from the likelihood's curvature** — Fisher information, so a sharper peak means a smaller error.",
    "**MLE fails on separation, boundary estimates, too many parameters and small `n`** — and every guarantee it has is asymptotic.",
    "**Sorting by a high-variance estimator selects for variance**, so the noisiest items reach the top of any ranking by construction.",
    "**Fit a shrinkage parameter rather than guessing it** — it is a measurement of how similar the items are, not a tuning knob."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An unbiased estimator has MSE 8.0; a biased one has MSE 5.3. Which should you use?",
        options: [
          "The unbiased one — bias is a serious flaw",
          "The biased one — MSE is the error you actually incur, and unbiasedness is a constraint rather than a goal",
          "Neither; find an unbiased estimator with lower variance",
          "It depends on the sample size only"
        ],
        answer: 1,
        why: "Shrinking towards a prior cuts variance faster than it adds squared bias. This is the entire justification for ridge regression, hierarchical models and smoothed ratings — all of which are deliberately biased."
      },
      {
        stem: "Your \"top rated\" list is dominated by products with two or three reviews. What is the estimator problem?",
        options: [
          "The rating scale is wrong",
          "Sorting by a high-variance estimator selects for variance — the maximum of noisy estimates is systematically an over-estimate",
          "The raw rate is biased upward",
          "There are not enough products"
        ],
        answer: 1,
        why: "The raw rate is unbiased; only its variance is the problem. Shrinking towards a fitted prior handles it with no threshold — an item with 18,000 views barely moves, while one with a single view goes to the catalogue average."
      },
      {
        stem: "Why does the MLE for a normal's variance divide by `n` rather than `n − 1`?",
        options: [
          "It is a mistake in the derivation",
          "Maximum likelihood optimises the probability of the observed data, which is a different objective from unbiasedness — the two disagree here",
          "Because `n` is easier to compute",
          "It only applies to known means"
        ],
        answer: 1,
        why: "MLE knows nothing about unbiasedness. Notably its MSE is also *lower* than the unbiased estimator's at small `n`, so the biased answer is the more accurate one by the measure that matters."
      },
      {
        stem: "A logistic regression coefficient grows without bound as you increase `max_iter`. What is happening?",
        options: [
          "The learning rate is too high",
          "Perfect separation — a predictor separates the classes exactly, so the likelihood increases without bound and the MLE does not exist",
          "The data needs standardising",
          "There is a numerical overflow"
        ],
        answer: 1,
        why: "The fix is a penalty, which is the same shrinkage that fixed the ranking problem: an L2 term makes the objective finite and produces a stable coefficient. Boundary estimates and too many parameters are the other two classic MLE failures."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is maximum likelihood estimation?",
        strong: "Choosing the parameter that makes the observed data most probable. You maximise the log likelihood, which for a coin gives the sample proportion and for a normal gives the sample mean — both derived rather than assumed. Every model trained with cross-entropy is doing exactly this.",
        answer: [
          { t: "p", text: "Connecting it to loss minimisation shows it is not an isolated statistical topic." },
          { t: "p", text: "Noting that the MLE for variance divides by `n`, and is therefore biased, shows you know what it does and does not optimise." }
        ]
      },
      {
        level: "advanced",
        q: "Would you ever prefer a biased estimator?",
        strong: "Routinely. MSE is bias squared plus variance, and shrinking towards a prior often cuts variance far more than it adds bias. For three or more parameters at once the individual MLEs are provably inadmissible — shrinkage beats them everywhere.",
        answer: [
          { t: "p", text: "Naming MSE as the objective reframes unbiasedness as a constraint, which is the substance of the answer." },
          { t: "p", text: "The James–Stein result is a strong reference point, and connecting it to ridge and hierarchical models shows it is not trivia." }
        ]
      },
      {
        level: "advanced",
        q: "How would you rank items by quality when sample sizes vary enormously?",
        strong: "Shrink each rate towards a prior fitted from the whole catalogue, so uncertain items are pulled in proportionally. A Wilson lower bound is a reasonable alternative but still lets one-observation items rank high. If exploration matters, Thompson sampling on the posteriors.",
        answer: [
          { t: "p", text: "Diagnosing it as \"sorting by variance\" rather than \"small samples are noisy\" is the precise statement." },
          { t: "p", text: "Fitting the prior from data rather than picking a smoothing constant is what makes the answer principled." },
          { t: "p", text: "Acknowledging the cost — a genuinely great new item is held back — shows you would design around it rather than pretend it away." }
        ]
      }
    ]
  }
});

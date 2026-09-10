/* ============================================================================
   LESSON 4.4 — Skewness, Kurtosis and Shape
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**Kurtosis is not peakedness.** It is dominated almost entirely by the tails, and the textbook description has misled generations of readers. Skewness and kurtosis are the third and fourth moments, they are both extremely noisy in small samples, and knowing what they actually measure is what stops you over-reading them.",

  objectives: [
    "Define skewness and kurtosis as standardised moments",
    "Explain why kurtosis measures tails, not the peak",
    "Judge how much sample skewness and kurtosis can be trusted",
    "Choose a normality test, and know why they all fail at large `n`",
    "Use a transform to reduce skew where it helps"
  ],

  prerequisites: ["4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Moments, standardised", id: "moments" },

    { t: "code", lang: "python", title: "the first four, and what each adds", code: `
import numpy as np
from scipy import stats

# THE k-TH STANDARDISED MOMENT is E[((X - mu)/sigma)^k].
# Standardising means the value does not depend on units or scale.
#
#   k=1  0 by construction
#   k=2  1 by construction
#   k=3  SKEWNESS  -- asymmetry
#   k=4  KURTOSIS  -- tail weight

def standardised_moment(x, k):
    x = np.asarray(x, dtype=float)
    z = (x - x.mean()) / x.std(ddof=0)
    return float((z**k).mean())

rng = np.random.default_rng(0)
normal = rng.normal(0, 1, 500_000)

[round(standardised_moment(normal, k), 3) for k in (1, 2, 3, 4)]
# [0.0, 1.0, 0.001, 3.0]
#
# THE FOURTH MOMENT OF A NORMAL IS 3, which is why "excess kurtosis"
# subtracts 3 -- so that a normal reads 0 and the number means
# "compared with a normal".
stats.kurtosis(normal)                 # 0.001  (excess, the default)
stats.kurtosis(normal, fisher=False)   # 3.001  (raw)
#
# scipy DEFAULTS TO EXCESS. R's e1071 defaults to raw. Reporting "our
# kurtosis is 3" is ambiguous without saying which -- it means normal
# under one convention and heavy-tailed under the other.

# SKEWNESS, and its sign convention:
for name, sample in [
    ("normal",     normal),
    ("lognormal",  rng.lognormal(0, 1, 500_000)),
    ("reflected",  -rng.lognormal(0, 1, 500_000)),
    ("uniform",    rng.uniform(0, 1, 500_000)),
]:
    print(f"{name:11s} skew {stats.skew(sample):+7.3f}   "
          f"excess kurtosis {stats.kurtosis(sample):+8.3f}")

# normal      skew  +0.001   excess kurtosis   +0.005
# lognormal   skew  +6.146   excess kurtosis  +99.372
# reflected   skew  -6.146   excess kurtosis  +99.372
# uniform     skew  -0.001   excess kurtosis   -1.200
#
# POSITIVE SKEW = A LONG RIGHT TAIL. Kurtosis is unaffected by
# reflection, because the fourth power discards the sign.
#
# THE UNIFORM IS THE INSTRUCTIVE CASE: excess kurtosis -1.2, the
# lowest of any common distribution. It has NO tails at all -- and it
# is completely flat, with no peak whatsoever. If kurtosis measured
# peakedness, a flat distribution scoring lowest would make no sense.
`,
      hl: [21, 26, 51],
      caption: "**scipy defaults to excess kurtosis and R's `e1071` to raw.** \"Our kurtosis is 3\" means normal under one convention and heavy-tailed under the other — always say which."
    },

    { t: "h2", n: "02", text: "Kurtosis measures tails", id: "kurtosis" },

    { t: "viz",
      title: "The fourth power makes the tails everything",
      caption: "A point at 1σ contributes 1 to the fourth moment; a point at 4σ contributes 256. Values inside 1σ are the bulk of the data and contribute almost nothing at all.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Bars showing the fourth-power weight of observations at increasing distances from the mean">
  <line x1="80" y1="200" x2="820" y2="200" style="stroke:var(--line)" stroke-width="1.5"/>

  <g>
    <rect x="110" y="199" width="46" height="1"   style="fill:var(--accent)"/>
    <text x="112" y="220" class="s-sub" style="fill:var(--ink-3)">0.5 sd</text>
    <text x="112" y="190" class="s-sub" style="fill:var(--ink-3)">0.06</text>
  </g>
  <g>
    <rect x="210" y="197" width="46" height="3"   style="fill:var(--accent)"/>
    <text x="218" y="220" class="s-sub" style="fill:var(--ink-3)">1 sd</text>
    <text x="222" y="188" class="s-sub" style="fill:var(--ink-3)">1</text>
  </g>
  <g>
    <rect x="310" y="184" width="46" height="16"  style="fill:var(--accent)"/>
    <text x="318" y="220" class="s-sub" style="fill:var(--ink-3)">2 sd</text>
    <text x="318" y="175" class="s-sub" style="fill:var(--ink-3)">16</text>
  </g>
  <g>
    <rect x="410" y="119" width="46" height="81"  style="fill:var(--warn)"/>
    <text x="418" y="220" class="s-sub" style="fill:var(--ink-3)">3 sd</text>
    <text x="418" y="110" class="s-sub" style="fill:var(--warn)">81</text>
  </g>
  <g>
    <rect x="510" y="40" width="46" height="160" style="fill:var(--crit)"/>
    <text x="518" y="220" class="s-sub" style="fill:var(--ink-3)">4 sd</text>
    <text x="512" y="32" class="s-sub" style="fill:var(--crit)">256</text>
  </g>

  <text x="600" y="80"  class="s-sub" style="fill:var(--ink-3)">one observation at 4 sd outweighs</text>
  <text x="600" y="98"  class="s-sub" style="fill:var(--ink-3)">four thousand at 0.5 sd</text>
  <text x="600" y="130" class="s-sub" style="fill:var(--ink-3)">which is why kurtosis says</text>
  <text x="600" y="148" class="s-sub" style="fill:var(--ink-3)">nothing about the peak, and</text>
  <text x="600" y="166" class="s-sub" style="fill:var(--ink-3)">why it is so noisy</text>
</svg>`
    },

    { t: "code", lang: "python", title: "prove it by moving the tail and holding the peak", code: `
# CONSTRUCT TWO DISTRIBUTIONS with the SAME peak height and different
# tails, then check which way kurtosis moves.

n = 400_000
core = rng.normal(0, 1, n)

# A 1% contamination far out in the tails. The centre is untouched --
# 99% of the data is identical in distribution.
contaminated = core.copy()
idx = rng.choice(n, size=n//100, replace=False)
contaminated[idx] = rng.normal(0, 6, n//100)

stats.kurtosis(core)                    # 0.003
stats.kurtosis(contaminated)            # 4.68
#
# CHANGING 1% OF THE DATA -- AND NOTHING NEAR THE PEAK -- MOVED
# KURTOSIS FROM 0 TO 4.7.

# Confirm the peak did not change:
from scipy.stats import gaussian_kde
np.histogram(core, bins=[-0.1, 0.1])[0] / n            # 0.0797
np.histogram(contaminated, bins=[-0.1, 0.1])[0] / n    # 0.0791
#
# THE DENSITY AT THE CENTRE IS THE SAME TO THREE DECIMAL PLACES while
# kurtosis moved by 4.7. "Peakedness" cannot be what it is measuring.

# THE DECOMPOSITION MAKES IT UNARGUABLE:
z = (contaminated - contaminated.mean()) / contaminated.std()
contrib = z**4

for lo, hi in [(0, 1), (1, 2), (2, 3), (3, 10)]:
    m = (np.abs(z) >= lo) & (np.abs(z) < hi)
    print(f"|z| in [{lo},{hi}): {m.mean():6.2%} of data, "
          f"{contrib[m].sum()/contrib.sum():6.2%} of kurtosis")

# |z| in [0,1): 71.28% of data,   4.31% of kurtosis
# |z| in [1,2): 24.36% of data,  22.38% of kurtosis
# |z| in [2,3):  3.36% of data,  22.06% of kurtosis
# |z| in [3,10): 1.00% of data,  51.24% of kurtosis
#
# ONE PERCENT OF THE DATA PRODUCES HALF THE KURTOSIS, and the 71% of
# observations nearest the centre produce 4%.

# WHAT IT IS ACTUALLY USEFUL FOR: a fast, scale-free flag for tail
# weight, when you cannot plot everything.
#
#   excess ~ 0    tails like a normal
#   excess > 1    heavier -- expect more extremes than a normal model
#   excess > 10   seriously heavy; sigma-based limits will be breached
#   excess < 0    lighter, or bounded (uniform is -1.2)
#
# It is a screening statistic, not a conclusion.
`,
      hl: [15, 24, 38, 44],
      caption: "**One percent of the data produces half the kurtosis; the central 71% produces 4%.** The density at the peak was unchanged to three decimals while kurtosis moved from 0 to 4.7."
    },

    { t: "callout", kind: "trap", title: "Sample skewness and kurtosis are extremely noisy", body: [
      { t: "p", text: "Third and fourth moments need far more data than a mean or variance, because raising deviations to a high power amplifies the influence of a handful of observations." },
      { t: "code", lang: "python", numbered: false, title: "how noisy, exactly", code: `
# The standard errors under normality:
#     SE(skew) ~ sqrt(6/n)      SE(excess kurtosis) ~ sqrt(24/n)

for n in (20, 50, 100, 1000, 10_000):
    s = rng.normal(0, 1, (4000, n))
    print(f"n={n:<7} skew sd {stats.skew(s, axis=1).std():.3f} "
          f"(theory {np.sqrt(6/n):.3f})   "
          f"kurt sd {stats.kurtosis(s, axis=1).std():.3f} "
          f"(theory {np.sqrt(24/n):.3f})")

# n=20      skew sd 0.508 (theory 0.548)   kurt sd 0.877 (theory 1.095)
# n=50      skew sd 0.336 (theory 0.346)   kurt sd 0.660 (theory 0.693)
# n=100     skew sd 0.240 (theory 0.245)   kurt sd 0.508 (theory 0.490)
# n=1000    skew sd 0.077 (theory 0.077)   kurt sd 0.163 (theory 0.155)
# n=10000   skew sd 0.024 (theory 0.024)   kurt sd 0.049 (theory 0.049)

# AT n = 50, PERFECTLY NORMAL DATA ROUTINELY SHOWS A SAMPLE SKEWNESS
# OF +/- 0.7. Anyone reporting "our data is skewed, skewness = 0.6"
# from 50 observations has reported noise.

# THE ROUGH TEST: divide by the standard error.
def is_skewed(x):
    n = len(x)
    return abs(stats.skew(x)) > 2 * np.sqrt(6/n)

is_skewed(rng.normal(0, 1, 50))        # usually False
is_skewed(rng.lognormal(0, 1, 50))     # True -- a real effect survives

# AND THE BOUND NOBODY EXPECTS: sample skewness is CAPPED by n.
#     |sample skew| <= (n-2)/sqrt(n-1)
#
# n=10  -> max 2.67       n=50 -> max 6.86
#
# So a genuinely extreme distribution CANNOT show its true skewness in
# a small sample -- the statistic is bounded by the sample size, not
# by the population. A lognormal with population skew 6.2 reads about
# 2.5 at n = 30.
np.mean([stats.skew(rng.lognormal(0, 1, 30)) for _ in range(3000)])  # ~2.4`},
      { t: "p", text: "**Sample skewness is capped at `(n−2)/√(n−1)`**, so a genuinely extreme distribution cannot reveal its skewness in a small sample — a lognormal whose population skew is 6.2 reads about 2.4 at `n = 30`." }
    ]},

    { t: "h2", n: "03", text: "Normality tests, and why they stop being useful", id: "normality" },

    { t: "code", lang: "python", title: "the large-n problem every test has", code: `
# EVERY NORMALITY TEST HAS THE SAME STRUCTURE: a null hypothesis of
# "exactly normal", which is never true of real data. So the test is
# really measuring how much data you have.

def shapiro_p(n, deviation=0.0):
    """Data that is normal, or very slightly not."""
    x = rng.normal(0, 1, n)
    if deviation:
        x = x + deviation * (x**2 - 1)      # a tiny asymmetry
    return stats.shapiro(x).pvalue

# GENUINELY NORMAL DATA -- the test behaves as advertised:
np.mean([shapiro_p(1000) < 0.05 for _ in range(200)])         # ~0.05

# A DEVIATION SO SMALL IT DOES NOT MATTER TO ANY ANALYSIS:
for n in (30, 100, 1000, 5000):
    rate = np.mean([shapiro_p(n, deviation=0.05) < 0.05 for _ in range(200)])
    print(f"n={n:<6} rejects normality {rate:.0%} of the time")

# n=30     rejects normality  8% of the time
# n=100    rejects normality 17% of the time
# n=1000   rejects normality 84% of the time
# n=5000   rejects normality 100% of the time
#
# THE DEVIATION IS IDENTICAL IN ALL FOUR. Only n changed. At n=5000 the
# test detects a departure that would change no downstream conclusion,
# and at n=30 it misses departures that would.
#
# SO THE TEST ANSWERS "DO I HAVE ENOUGH DATA TO DETECT NON-NORMALITY",
# NOT "IS NON-NORMALITY A PROBLEM FOR WHAT I AM DOING".

# WHAT TO DO INSTEAD -- measure the SIZE of the departure, not its
# statistical detectability:

def normality_report(x):
    """Effect sizes rather than a p-value. Each number is comparable
    across sample sizes, which a p-value is not."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    z = np.sort((x - x.mean()) / x.std(ddof=1))
    theoretical = stats.norm.ppf((np.arange(1, n+1) - 0.5) / n)
    return {
        "n": n,
        "skew": float(stats.skew(x)),
        "skew_se": float(np.sqrt(6/n)),
        "excess_kurtosis": float(stats.kurtosis(x)),
        "kurtosis_se": float(np.sqrt(24/n)),
        # Max vertical gap on a QQ plot, in standard deviations --
        # a direct measure of how far from normal, in usable units.
        "max_qq_gap_sd": float(np.abs(z - theoretical).max()),
        "mean_over_median": float(x.mean() / np.median(x)) if np.median(x) else np.nan,
    }

normality_report(rng.normal(0, 1, 5000))["max_qq_gap_sd"]      # ~0.09
normality_report(rng.lognormal(0, 1, 5000))["max_qq_gap_sd"]   # ~7.4
#
# A MAXIMUM QQ GAP OF 0.09 SD IS IRRELEVANT TO ANY ANALYSIS. A gap of
# 7.4 sd is not. Those two numbers say something a p-value cannot,
# because they mean the same thing at every sample size.

# AND THE QUESTION THAT ACTUALLY MATTERS is never "is it normal" but
# "does the method I am using survive this departure":
#
#   a t-test on n=1000        robust to almost any skew (CLT)
#   a t-test on n=15          not robust to heavy skew
#   a prediction interval     NOT robust -- it uses the tails directly
#   sigma-based control limits NOT robust -- same reason
#
# INFERENCE ABOUT A MEAN IS PROTECTED BY THE CLT. Statements about
# INDIVIDUAL observations are not, and that is the distinction to make
# rather than running a test.
`,
      hl: [22, 28, 55, 64],
      caption: "**A normality test answers \"do I have enough data to detect non-normality\", not \"is it a problem\".** Report the maximum QQ gap in standard deviations instead — it means the same thing at every sample size."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Decide whether to transform a skewed feature",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A colleague proposes log-transforming every right-skewed feature before modelling, as a standing rule. Evaluate the proposal on a concrete dataset and give a decision rule the team can follow." },
        { t: "code", lang: "python", numbered: false, title: "the features in question", code: `
# transaction_amount   skew  +8.4   min 0.01   zeros: none
# session_duration     skew  +3.1   min 0.0    zeros: 12%
# days_since_signup    skew  +1.2   min 0       zeros: 3%
# account_balance      skew  +5.7   min -430   negatives: 4%
# num_logins           skew  +2.8   min 0      zeros: 31%, integer

# Downstream models under consideration:
#   - linear regression
#   - gradient-boosted trees`},
        { t: "p", text: "Say which features to transform, with what, for which model, and what could go wrong." }
      ],
      requirements: [
        "Say whether the blanket rule is sound, with reasoning.",
        "Handle the zeros and negatives explicitly.",
        "Distinguish the two model types.",
        "Give a concrete decision procedure as code.",
        "Say what a transform costs, not only what it buys.",
        "Include tests."
      ],
      hint: "Ask what assumption the transform is serving. Linear regression assumes things about residuals; trees assume nothing about feature distributions.",
      solution: {
        lang: "python",
        title: "transform_policy.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)


# =========================================================================
# IS THE BLANKET RULE SOUND? NO -- AND IT IS WRONG FOR TWO REASONS
# =========================================================================
#
# REASON 1 -- LINEAR REGRESSION MAKES NO ASSUMPTION ABOUT FEATURE
# DISTRIBUTIONS. Its assumptions are about the RESIDUALS: linearity,
# constant variance, and (for small-sample inference) normality of
# errors. A skewed predictor is not a violation of anything.
#
# Demonstrate it: a wildly skewed feature with a linear relationship
# needs no transform at all.
x = rng.lognormal(0, 2, 5000)                      # skew ~ 400
y = 3 * x + rng.normal(0, 1, 5000)                 # linear in x

stats.skew(x)                                      # enormous
beta = np.polyfit(x, y, 1)[0]
beta                                               # 3.000 -- recovered exactly
#
# TRANSFORMING x HERE WOULD DESTROY THE LINEAR RELATIONSHIP:
beta_log = np.polyfit(np.log(x), y, 1)[0]
r2 = lambda a, b: 1 - np.var(b - np.polyval(np.polyfit(a, b, 1), a))/np.var(b)
r2(x, y), r2(np.log(x), y)                         # 1.000, 0.61
#
# THE TRANSFORM CUT R^2 FROM 1.00 TO 0.61 on data where the untransformed
# feature was exactly right.

# REASON 2 -- TREES ARE INVARIANT TO ANY MONOTONIC TRANSFORM. A split
# at "x > 100" and a split at "log(x) > 4.6" partition the data
# identically, so the transform changes literally nothing except the
# threshold printed in the tree.
#
# For gradient-boosted trees, transforming for skew is pure noise in
# the pipeline: more code, more failure modes, no effect.


# =========================================================================
# WHEN A TRANSFORM DOES HELP
# =========================================================================
#
# 1. THE RELATIONSHIP IS MULTIPLICATIVE. If y depends on x
#    proportionally, log-log linearises it -- and this is a claim about
#    the RELATIONSHIP, not about the feature's histogram.
x2 = rng.lognormal(0, 1, 5000)
y2 = 5 * x2**0.7 * np.exp(rng.normal(0, 0.1, 5000))     # power law

r2(x2, y2), r2(np.log(x2), np.log(y2))             # 0.86, 0.98
#
# 2. RESIDUAL VARIANCE GROWS WITH THE FITTED VALUE. Log stabilises it,
#    which is what makes the standard errors valid.
#
# 3. INFERENCE ON A SMALL SAMPLE, where the CLT has not rescued you and
#    the residuals are visibly skewed.
#
# 4. THE OUTPUT IS MORE NATURAL IN LOG SPACE -- "a 10% increase in
#    spend" rather than "a $47 increase".
#
# EVERY ONE OF THOSE IS ABOUT THE RESIDUALS OR THE RELATIONSHIP.
# NONE IS ABOUT THE FEATURE'S OWN SKEWNESS.


# =========================================================================
# ZEROS AND NEGATIVES -- THE PART THE BLANKET RULE CANNOT HANDLE
# =========================================================================
#
# log(0) = -inf and log(negative) is undefined, so three of the five
# features break the rule immediately.

# THE COMMON HACK, AND WHY IT IS BAD:
def log1p_shift(x, eps=1.0):
    return np.log(x + eps)
#
# The choice of eps silently determines how far the zeros sit from the
# smallest positive value, and there is no principled way to pick it:
vals = np.array([0.0, 0.001, 0.01, 1.0, 100.0])
for eps in (1e-6, 0.01, 1.0):
    t = log1p_shift(vals, eps)
    print(f"eps={eps:<8} gap from 0 to 0.001: {t[1]-t[0]:.3f}")
# eps=1e-06    gap from 0 to 0.001: 6.908
# eps=0.01     gap from 0 to 0.001: 0.095
# eps=1.0      gap from 0 to 0.001: 0.001
#
# A FREE PARAMETER THAT CHANGES THE DATA BY A FACTOR OF 7,000 and is
# usually chosen by whichever value did not error.

# BETTER OPTIONS:
#
# a) log1p, i.e. eps = 1 exactly. Defensible when the units make 1 a
#    natural floor (counts), meaningless when they do not (currency in
#    units of $1m).
np.log1p(np.array([0.0, 1.0, 100.0]))              # [0, 0.693, 4.615]
#
# b) YEO-JOHNSON. Defined for negatives and zeros, and its parameter is
#    FITTED rather than guessed.
from sklearn.preprocessing import PowerTransformer
balance = np.concatenate([rng.lognormal(3, 1.2, 4800),
                          -rng.lognormal(2, 1, 200)])
yj = PowerTransformer(method="yeo-johnson").fit(balance.reshape(-1, 1))
stats.skew(balance), stats.skew(yj.transform(balance.reshape(-1,1)).ravel())
# (7.4, ~0.0)
#
# c) TWO FEATURES INSTEAD OF ONE, for a zero-inflated variable. This is
#    the mixture from lesson 3.2, and it is usually the best answer:
def split_zero_inflated(x):
    """A binary 'is it non-zero' plus a log of the positive part. The
    31% zeros in num_logins are a DIFFERENT KIND of user, not a small
    value -- and one column cannot say both things."""
    x = np.asarray(x, dtype=float)
    return np.column_stack([(x > 0).astype(float),
                            np.where(x > 0, np.log(np.maximum(x, 1e-12)), 0.0)])
#
# d) RANK OR QUANTILE TRANSFORM, when only the ordering matters. It
#    handles anything, but discards magnitude entirely.


# =========================================================================
# THE DECISION PROCEDURE
# =========================================================================

def should_transform(x, y=None, model="linear"):
    """Decide from the RELATIONSHIP and the residuals, not the feature's
    own histogram."""
    x = np.asarray(x, dtype=float)

    if model == "tree":
        return False, "trees are invariant to monotonic transforms"

    zero_frac = float((x == 0).mean())
    if (x < 0).any():
        return "yeo-johnson", "negatives present; log is undefined"
    if zero_frac > 0.05:
        return "split", f"{zero_frac:.0%} zeros: model presence separately"

    if y is None:
        return False, "no outcome given; skew alone is not a reason"

    # Compare fit quality directly -- the only question that matters.
    def r2(a, b):
        return 1 - np.var(b - np.polyval(np.polyfit(a, b, 1), a)) / np.var(b)

    plain = r2(x, y)
    logged = r2(np.log(x), y)
    log_log = r2(np.log(x), np.log(y)) if (y > 0).all() else -np.inf

    best = max(plain, logged, log_log)
    if best - plain < 0.02:
        return False, f"log gains {best-plain:+.3f} R2: not worth it"
    if log_log == best:
        return "log-log", f"multiplicative relationship (+{best-plain:.3f} R2)"
    return "log-x", f"log improves fit (+{best-plain:.3f} R2)"


# APPLIED TO THE FIVE FEATURES, for a linear model:
#
#   transaction_amount   test against y; skew +8.4 alone is not a reason
#   session_duration     12% zeros -> SPLIT into presence + log(positive)
#   days_since_signup    3% zeros, mild skew -> almost certainly leave it
#   account_balance      negatives -> YEO-JOHNSON, or split by sign
#   num_logins           31% zeros, integer -> SPLIT; a count, not a
#                        continuous quantity
#
# FOR THE TREE MODEL: transform none of them.


# =========================================================================
# WHAT A TRANSFORM COSTS
# =========================================================================
#
# 1. INTERPRETABILITY. A coefficient on log(x) is an elasticity, not a
#    slope. Teams routinely misreport these.
#
# 2. RETRANSFORMATION BIAS -- the one that actually causes errors.
#    exp(E[log Y]) != E[Y]. Exponentiating a prediction from a log model
#    gives the MEDIAN, not the mean, and the gap is exp(sigma^2/2).
sigma = 0.8
np.exp(sigma**2 / 2)                               # 1.377
#
# A 38% UNDERSTATEMENT of the mean, silently, in every forecast built
# this way. The correction (Duan's smearing, or the exp(s^2/2) factor)
# is one line and is almost always omitted.

def retransform_mean(log_preds, residual_var):
    """Convert log-space predictions to the MEAN, not the median."""
    return np.exp(log_preds + residual_var / 2)

# 3. A PIPELINE STEP THAT CAN FAIL IN PRODUCTION. A negative value that
#    never appeared in training raises at inference time, and the
#    fitted eps or lambda becomes state you must version alongside the
#    model.
#
# 4. IT CAN HURT. The first example lost 39 points of R^2.


# =========================================================================
# TESTS
# =========================================================================

def test_skew_alone_is_not_a_reason():
    x = rng.lognormal(0, 2, 5000)
    y = 3 * x + rng.normal(0, 1, 5000)

    assert stats.skew(x) > 5                      # extremely skewed
    decision, _ = should_transform(x, y)
    assert decision is False                      # and should be left alone


def test_transforming_a_linear_relationship_hurts():
    x = rng.lognormal(0, 2, 5000)
    y = 3 * x + rng.normal(0, 1, 5000)
    r2 = lambda a, b: 1 - np.var(b - np.polyval(np.polyfit(a,b,1), a))/np.var(b)

    assert r2(np.log(x), y) < r2(x, y) - 0.2


def test_multiplicative_relationship_is_detected():
    x = rng.lognormal(0, 1, 5000)
    y = 5 * x**0.7 * np.exp(rng.normal(0, 0.1, 5000))

    decision, _ = should_transform(x, y)
    assert decision == "log-log"


def test_trees_never_transform():
    x = rng.lognormal(0, 3, 1000)
    assert should_transform(x, model="tree")[0] is False


def test_zeros_trigger_a_split_not_a_shift():
    x = np.where(rng.random(1000) < 0.31, 0.0, rng.lognormal(1, 1, 1000))
    assert should_transform(x, model="linear")[0] == "split"

    cols = split_zero_inflated(x)
    assert cols.shape == (1000, 2)
    assert np.isfinite(cols).all()                # no -inf from log(0)


def test_negatives_trigger_yeo_johnson():
    x = np.concatenate([rng.lognormal(3, 1, 960), -rng.lognormal(2, 1, 40)])
    assert should_transform(x, model="linear")[0] == "yeo-johnson"


def test_epsilon_choice_changes_the_data_enormously():
    """Why log(x + eps) is not a real answer."""
    v = np.array([0.0, 0.001])
    gaps = [np.log(v[1] + e) - np.log(v[0] + e) for e in (1e-6, 1.0)]

    assert gaps[0] / gaps[1] > 1000


def test_retransformation_bias_is_material():
    """exp(mean of logs) is the median, not the mean."""
    y = rng.lognormal(0, 0.8, 200_000)
    naive = np.exp(np.log(y).mean())
    corrected = retransform_mean(np.log(y).mean(), np.log(y).var())

    assert naive < y.mean() * 0.8                 # ~27% low
    assert abs(corrected - y.mean()) / y.mean() < 0.02`,
        notes: [
          { t: "p", text: "**The blanket rule is wrong on both models it would be applied to.** Linear regression makes assumptions about *residuals*, not about feature distributions — a wildly skewed predictor with a linear relationship needs no transform, and applying one cut R² from 1.00 to 0.61 in the worked example." },
          { t: "p", text: "**Trees are invariant to any monotonic transform.** A split at `x > 100` and one at `log(x) > 4.6` partition the data identically, so the transform adds pipeline steps and failure modes for literally no effect." },
          { t: "callout", kind: "trap", title: "log(x + ε) is a free parameter nobody chooses deliberately", body: [
            { t: "p", text: "Moving ε from 10⁻⁶ to 1.0 changes the gap between a zero and the smallest positive value by a factor of 7,000. It is usually set to whichever value stopped the error." },
            { t: "p", text: "For a zero-inflated feature, two columns — a presence indicator plus the log of the positive part — is almost always right. The 31% zeros in `num_logins` are a different *kind* of user, not a small value, and one column cannot say both." }
          ]},
          { t: "p", text: "**Retransformation bias is the cost that actually causes errors.** `exp(E[log Y]) ≠ E[Y]` — exponentiating a log-model prediction gives the median, understating the mean by `exp(σ²/2)`, which at `σ = 0.8` is 38%. The correction is one line and is almost always omitted." },
          { t: "p", text: "**Every legitimate reason to transform is about the residuals or the relationship**, never about the feature's own histogram — which is exactly what the proposed rule keys on." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A risk report flagged a portfolio as \"high kurtosis, excess 14.2\" and triggered a review. The analysis had been run on 90 daily returns." },
      { t: "p", text: "**At `n = 90` the standard error of excess kurtosis is `√(24/90) = 0.52` under normality**, but the sampling distribution is heavily right-skewed — a single large move produces a reading in double figures on data that is otherwise unremarkable." },
      { t: "p", text: "One day in the window contained an earnings announcement. **Removing that single observation dropped the excess kurtosis to 1.1**, and the review had been triggered by one known, explained event." },
      { t: "p", text: "**Report the influence of the largest observation alongside any high-moment statistic.** Recomputing without the single most extreme point costs one line and would have prevented the whole review." }
    ]}
  ],

  takeaways: [
    "**Skewness and kurtosis are the third and fourth standardised moments**, so they are unitless and comparable across scales.",
    "**A normal has raw kurtosis 3**, which is why \"excess\" subtracts it — and why scipy and R disagree by default.",
    "**Kurtosis measures tails, not peakedness.** The uniform distribution is perfectly flat and has the lowest kurtosis of any common distribution.",
    "**One percent of the data can produce half the kurtosis**; the central 71% produces about 4%.",
    "**`SE(skew) ≈ √(6/n)` and `SE(excess kurtosis) ≈ √(24/n)`** — at `n = 50`, normal data routinely shows skewness of ±0.7.",
    "**Sample skewness is capped at `(n−2)/√(n−1)`**, so an extreme distribution cannot show its true skew in a small sample.",
    "**Normality tests answer \"do I have enough data to detect it\"** — the same tiny deviation is rejected 8% of the time at `n = 30` and 100% at `n = 5,000`.",
    "**Report the maximum QQ gap in standard deviations** instead; it means the same thing at every sample size.",
    "**Inference about a mean is protected by the CLT; statements about individual observations are not** — that is the distinction to make.",
    "**Transform for the residuals or the relationship, never for a feature's own histogram.**",
    "**Trees are invariant to monotonic transforms**, so transforming for skew before a tree model is pure pipeline noise.",
    "**`exp(E[log Y])` is the median, not the mean** — retransformation bias understates by `exp(σ²/2)`, which is 38% at `σ = 0.8`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does high kurtosis tell you about a distribution?",
        options: [
          "It has a sharp peak",
          "It has heavy tails — the fourth power means a point at 4σ contributes 256 times as much as one at 1σ",
          "It is asymmetric",
          "It has high variance"
        ],
        answer: 1,
        why: "The uniform distribution is perfectly flat with no peak at all and has the lowest kurtosis of any common distribution. In the worked example, contaminating 1% of the tail moved kurtosis from 0 to 4.7 while the density at the centre was unchanged to three decimals."
      },
      {
        stem: "A colleague reports \"skewness 0.6\" from 50 observations. What do you say?",
        options: [
          "That is meaningfully skewed",
          "The standard error is `√(6/50) = 0.35`, so 0.6 is under two standard errors — perfectly normal data produces this routinely",
          "The sign is wrong",
          "Kurtosis would be more reliable"
        ],
        answer: 1,
        why: "High moments need far more data than a mean, because raising deviations to a power amplifies a handful of observations. Sample skewness is also capped at `(n−2)/√(n−1)`, so small samples cannot reveal extreme skew even when it is real."
      },
      {
        stem: "A Shapiro-Wilk test on 5,000 observations rejects normality with p < 0.001. What should you do?",
        options: [
          "Transform the data before proceeding",
          "Measure the *size* of the departure — at `n = 5,000` the test detects deviations too small to change any conclusion",
          "Use a non-parametric method",
          "Collect more data"
        ],
        answer: 1,
        why: "The same tiny deviation is rejected 8% of the time at `n = 30` and 100% at `n = 5,000`. The useful question is whether your method survives the departure — inference about a mean is protected by the CLT; prediction intervals and σ-based limits are not."
      },
      {
        stem: "Should you log-transform a right-skewed feature before a gradient-boosted tree model?",
        options: [
          "Yes, it always helps with skew",
          "No — trees are invariant to monotonic transforms, so it partitions the data identically and only adds a pipeline step that can fail",
          "Only if skewness exceeds 2",
          "Only for the target variable"
        ],
        answer: 1,
        why: "A split at `x > 100` and one at `log(x) > 4.6` are the same split. For linear models the reasons to transform are about residuals or the relationship — in one example, log-transforming a genuinely linear relationship cut R² from 1.00 to 0.61."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does kurtosis measure?",
        strong: "Tail weight, not peakedness. It is the fourth standardised moment, so a point at 4σ contributes 256 times as much as one at 1σ — the observations near the centre barely register. The uniform distribution is flat and has the lowest kurtosis of any common distribution.",
        answer: [
          { t: "p", text: "Correcting the \"peakedness\" description, with the uniform as the counterexample, is what makes this a real answer." },
          { t: "p", text: "Noting that it is therefore extremely noisy — `SE ≈ √(24/n)` — shows you would be cautious using it." }
        ]
      },
      {
        level: "core",
        q: "Would you run a normality test before a t-test?",
        strong: "Not usually. At large `n` the test rejects deviations too small to matter and the CLT has already protected the t-test; at small `n` the test lacks power exactly when it would matter. I would look at a QQ plot and ask whether the method survives the departure I can see.",
        answer: [
          { t: "p", text: "The double bind — useless when you do not need it, powerless when you do — is the argument worth making." },
          { t: "p", text: "Separating inference about a mean (CLT-protected) from statements about individuals (not protected) is the distinction that actually decides the answer." }
        ]
      },
      {
        level: "advanced",
        q: "When would you log-transform a variable?",
        strong: "When the relationship is multiplicative, when residual variance grows with the fitted value, or when log units are the natural way to talk about the effect. Never simply because the feature is skewed — that is a property of the feature, and regression assumes nothing about it.",
        answer: [
          { t: "p", text: "Pointing out that every legitimate reason is about the residuals or the relationship reframes the question correctly." },
          { t: "p", text: "Raising retransformation bias unprompted — `exp(E[log Y])` is the median — shows you have shipped one of these." },
          { t: "p", text: "Adding that trees make it pointless entirely is a good closing note." }
        ]
      }
    ]
  }
});

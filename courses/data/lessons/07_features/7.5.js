/* ============================================================================
   LESSON 7.5 — Transforms for Skew
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "**A log transform turns a column where most values are small and a few are enormous into one where a linear model can work — and then makes every prediction you transform back too low.** The first half is why everyone uses it. The second half is retransformation bias, and it means a forecast built on a log target systematically underestimates the thing it forecasts.",

  objectives: [
    "Measure skew and kurtosis and say what each does to a mean-based model",
    "Apply log, square root, Box-Cox and Yeo-Johnson and state what each requires of the input",
    "Choose a transform from the feature's shape and the model's assumptions",
    "Explain retransformation bias and correct for it when the target is transformed",
    "Know when skew is information the model needs rather than a problem to remove"
  ],

  prerequisites: ["7.4", "6.1"],

  blocks: [

    { t: "h2", n: "01", text: "Skew, and what it does to a model", id: "skew" },

    { t: "p", text: "Income, transaction amounts, page views, file sizes — **most quantities that cannot be negative and have no natural ceiling are right-skewed**: a dense cluster of small values and a long tail of large ones. The mean is not the typical value, the standard deviation is dominated by the tail, and a model that assumes symmetric errors is wrong at both ends." },

    { t: "dl", items: [
      ["Skewness", "The third standardised moment: how asymmetric the distribution is. Zero for symmetric; positive for a right tail; above ~1 is strongly skewed."],
      ["Kurtosis", "The fourth standardised moment: how heavy the tails are relative to a normal. Excess kurtosis above ~3 means extreme values occur far more often than a normal would predict."],
      ["Log transform", "`log(x)` or `log1p(x)` for data with zeros. Compresses the tail multiplicatively: a 10× difference becomes a fixed gap. Requires `x > 0` (or `x ≥ 0` for `log1p`)."],
      ["Box-Cox", "A family `(x^λ − 1) / λ`, with λ fitted to make the result as normal as possible. λ = 0 is the log; λ = 0.5 is the square root; λ = 1 is no transform. Requires `x > 0`."],
      ["Yeo-Johnson", "Box-Cox extended to zero and negative values. The default when the sign is not guaranteed."],
      ["Retransformation bias", "When the target is modelled on a transformed scale, the inverse of the predicted mean is not the mean of the predictions. For a log target, `exp(E[log y]) < E[y]` — always."]
    ]},

    { t: "viz",
      title: "The same column, raw and logged",
      caption: "Raw: the median is 20, the mean is 33, and a linear model fitting the mean is pulled toward a tail most rows are nowhere near. Logged: symmetric, the mean and median coincide, and a 10× step is the same width everywhere.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Two histograms: a right-skewed raw amount with the median and mean marked apart, and its log transform, symmetric, with median and mean coinciding">
  <g transform="translate(40,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--crit)">raw amount — skew 3.1, kurtosis 18</text>
    <g style="fill:var(--crit);fill-opacity:.35">
      <rect x="0" y="40" width="18" height="150"/><rect x="20" y="10" width="18" height="180"/><rect x="40" y="50" width="18" height="140"/>
      <rect x="60" y="90" width="18" height="100"/><rect x="80" y="120" width="18" height="70"/><rect x="100" y="140" width="18" height="50"/>
      <rect x="120" y="155" width="18" height="35"/><rect x="140" y="165" width="18" height="25"/><rect x="160" y="172" width="18" height="18"/>
      <rect x="180" y="178" width="18" height="12"/><rect x="200" y="182" width="18" height="8"/><rect x="220" y="185" width="18" height="5"/>
      <rect x="240" y="187" width="18" height="3"/><rect x="260" y="188" width="18" height="2"/><rect x="280" y="189" width="18" height="1"/>
      <rect x="300" y="189" width="18" height="1"/><rect x="320" y="189" width="18" height="1"/>
    </g>
    <line x1="0" y1="190" x2="340" y2="190" style="stroke:var(--line)"/>
    <line x1="34" y1="0" x2="34" y2="190" style="stroke:var(--good);stroke-width:2;stroke-dasharray:4 2"/>
    <text x="38" y="10" class="s-sub" style="fill:var(--good)">median 20</text>
    <line x1="70" y1="0" x2="70" y2="190" style="stroke:var(--warn);stroke-width:2;stroke-dasharray:4 2"/>
    <text x="74" y="26" class="s-sub" style="fill:var(--warn)">mean 33</text>
    <text x="0" y="212" class="s-sub" style="fill:var(--ink-3)">0            50           100          150         200+</text>
    <text x="0" y="236" class="s-sub" style="fill:var(--crit)">the mean sits where few rows are; σ is set by the tail</text>
  </g>
  <g transform="translate(480,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--good)">log(amount) — skew 0.05, kurtosis 0.1</text>
    <g style="fill:var(--good);fill-opacity:.35">
      <rect x="0" y="185" width="18" height="5"/><rect x="20" y="175" width="18" height="15"/><rect x="40" y="155" width="18" height="35"/>
      <rect x="60" y="125" width="18" height="65"/><rect x="80" y="85" width="18" height="105"/><rect x="100" y="45" width="18" height="145"/>
      <rect x="120" y="20" width="18" height="170"/><rect x="140" y="10" width="18" height="180"/><rect x="160" y="20" width="18" height="170"/>
      <rect x="180" y="45" width="18" height="145"/><rect x="200" y="85" width="18" height="105"/><rect x="220" y="125" width="18" height="65"/>
      <rect x="240" y="155" width="18" height="35"/><rect x="260" y="175" width="18" height="15"/><rect x="280" y="185" width="18" height="5"/>
    </g>
    <line x1="0" y1="190" x2="340" y2="190" style="stroke:var(--line)"/>
    <line x1="149" y1="0" x2="149" y2="190" style="stroke:var(--good);stroke-width:2;stroke-dasharray:4 2"/>
    <text x="153" y="10" class="s-sub" style="fill:var(--good)">median ≈ mean ≈ 3.0</text>
    <text x="0" y="212" class="s-sub" style="fill:var(--ink-3)">1     2     3     4     5   (each step is ×2.7)</text>
    <text x="0" y="236" class="s-sub" style="fill:var(--good)">symmetric; a linear model's errors are honest at both ends</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "measuring skew, and what it costs a linear model", code: `
import pandas as pd
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
n = 5000
amount = rng.lognormal(3, 0.8, n)                          # median ~20, long tail

# THE MEASUREMENTS:
pd.Series(amount).skew()                                   # 3.1  -- strongly right-skewed
pd.Series(amount).kurt()                                   # 18   -- heavy tail (normal = 0)
amount.mean(), np.median(amount)                           # (27.6, 20.1) -- mean > median
#
#   skew  ~0        symmetric
#   skew  0.5-1     moderate; a linear model is a little off
#   skew  > 1       strong; the mean is not where the data is
#   skew  > 2       a log transform candidate, almost always
#
# kurtosis > 3 (excess) means extreme values are common enough that
# the standard deviation is mostly measuring them.

# WHAT SKEW DOES TO A LINEAR FIT: the errors are not symmetric.
x = rng.normal(size=n)
y = np.exp(1 + 0.5 * x + rng.normal(0, 0.6, n))           # y is log-normal given x

from sklearn.linear_model import LinearRegression
m_raw = LinearRegression().fit(x[:, None], y)
resid_raw = y - m_raw.predict(x[:, None])
pd.Series(resid_raw).skew()                                # 3.4 -- the residuals are skewed
#
# The model underpredicts a few rows by a lot and overpredicts many
# rows by a little. Its confidence interval is symmetric; the truth
# is not. And the fit is dominated by the tail: the 1% of rows with
# the largest y contribute most of the squared error.
(resid_raw ** 2)[np.argsort(-y)[:50]].sum() / (resid_raw ** 2).sum()
# 0.41  -- 1% of rows, 41% of the loss

m_log = LinearRegression().fit(x[:, None], np.log(y))
resid_log = np.log(y) - m_log.predict(x[:, None])
pd.Series(resid_log).skew()                                # 0.02 -- symmetric
#
# On the log scale the residuals are normal, every row contributes
# proportionately, and the slope 0.5 is recovered exactly. The
# model is right. The predictions, transformed back, are not -- see
# section 3.

# THE OTHER REASON: multiplicative effects become additive.
# "Each year of experience adds 5% to salary" is
#     salary = base * 1.05^years
# which is NOT linear in years -- but log(salary) = log(base) +
# years * log(1.05) IS. A log transform turns a multiplicative world
# into one a linear model can describe. That is the substantive
# reason to log a skewed target, beyond the statistics.

# SKEW IN FEATURES (not the target): matters for
#   - linear models: a skewed feature's tail has leverage (6.8)
#   - distance models: the tail dominates distance (7.4)
#   - anything assuming normality
# and does NOT matter for trees, which split on rank.
`,
      hl: [10, 24, 34, 47],
      caption: "**1% of rows contribute 41% of the loss.** A linear model on a skewed target is fitted mostly to its tail; on the log scale every row contributes proportionately and the slope is recovered exactly."
    },

    { t: "h2", n: "02", text: "The transforms", id: "transforms" },

    { t: "p", text: "**Every transform in this family is a power of x.** Log is the limit as the power goes to zero; square root is power ½; Box-Cox fits the power from the data. The differences are in what input they accept and how hard they compress the tail." },

    { t: "code", lang: "python", title: "log, sqrt, Box-Cox and Yeo-Johnson — inputs, outputs, and choosing", code: `
from sklearn.preprocessing import PowerTransformer, FunctionTransformer

# LOG: the workhorse. Compresses multiplicatively.
np.log(amount)
np.log10(amount)             # same shape, base 10 -- "how many digits"
np.log1p(amount)             # log(1 + x): handles x = 0, ~log(x) for large x
#
# log(0) = -inf. Any column with zeros needs log1p, or an offset.
# log(negative) = nan. Any column with negatives needs Yeo-Johnson
# or a different idea.

# THE OFFSET QUESTION: log(x + c). c = 1 (log1p) is the convention;
# it is a CHOICE, and it matters for small values:
np.log1p([0.01, 0.1, 1, 10, 100])          # [0.01, 0.10, 0.69, 2.40, 4.62]
np.log([0.01, 0.1, 1, 10, 100])            # [-4.6, -2.3, 0.0, 2.30, 4.61]
#
# log1p barely moves values under 1 -- the +1 dominates -- so for a
# column that lives between 0 and 1 (a rate, a proportion) it does
# almost nothing. For counts and amounts that start at 1 or more,
# log1p and log agree from about 10 upward and the choice is
# harmless.

# SQUARE ROOT: gentler than log. Power 0.5.
np.sqrt(amount)
pd.Series(np.sqrt(amount)).skew()          # 1.1 -- from 3.1; halfway to symmetric
#
# For COUNT data (Poisson-ish), sqrt is the variance-stabilising
# transform: it makes the spread constant across the range. It
# handles zero without an offset. For skew above ~2 it is not enough.

# BOX-COX: fit the power.
pt_bc = PowerTransformer(method="box-cox", standardize=False)
bc = pt_bc.fit_transform(amount.reshape(-1, 1)).ravel()
pt_bc.lambdas_                              # [0.03] -- essentially log
pd.Series(bc).skew()                        # 0.00
#
#   lambda = 1     no change (x - 1)
#   lambda = 0.5   ~sqrt
#   lambda = 0     log
#   lambda = -1    1/x (reciprocal)
#
# The fitted lambda is the answer to "how much compression does this
# column need". Near 0 means "log it"; near 0.5 means "sqrt"; near 1
# means "leave it". REQUIRES x > 0: raises on zero or negative.

# YEO-JOHNSON: Box-Cox for any sign.
signed = np.concatenate([amount - 30, -amount[:500]])     # negatives and positives
pt_yj = PowerTransformer(method="yeo-johnson", standardize=True)
yj = pt_yj.fit_transform(signed.reshape(-1, 1)).ravel()
pt_yj.lambdas_
pd.Series(yj).skew()
#
# Different power on each side of zero, fitted jointly. The default
# in PowerTransformer, and the safe default when the sign is not
# guaranteed -- a P&L, a temperature, a change.

# standardize=True (the default) standardises AFTER the power
# transform, so the output is mean 0, sd 1. Usually what you want
# for a feature; turn it OFF for a target you need to invert.

# ALL OF THESE ARE fit STEPS. PowerTransformer learns lambda from
# training data; log has no parameter but the OFFSET is a decision.
# Fit on train, transform both, inside a Pipeline (8.5).

# CHOOSING, by the shape and the sign:
def suggest(x):
    x = np.asarray(x, float)
    sk = stats.skew(x)
    if abs(sk) < 0.5:
        return "none -- roughly symmetric"
    if (x <= 0).any():
        return "yeo-johnson -- zeros or negatives present"
    if sk > 2:
        return "log -- strong right skew, positive"
    if sk > 0.5:
        lam = PowerTransformer("box-cox", standardize=False).fit(x.reshape(-1, 1)).lambdas_[0]
        return f"box-cox lambda={lam:.2f} -- " + ("~sqrt" if 0.3 < lam < 0.7 else "~log" if lam < 0.3 else "mild")
    return "reflect then log -- left skew"

suggest(amount)                             # "log -- strong right skew, positive"
suggest(rng.poisson(3, n))                  # "yeo-johnson -- zeros ... present"
suggest(rng.normal(size=n))                 # "none -- roughly symmetric"

# LEFT SKEW (a long LEFT tail: exam scores capped at 100, ages at
# retirement) -- reflect, then transform: log(max + 1 - x). Rarer,
# and Yeo-Johnson handles it directly with lambda > 1.

# THE TABLE:
#   log         x > 0        strong compression   most amounts, counts >= 1
#   log1p       x >= 0       same, handles 0      counts with zeros
#   sqrt        x >= 0       mild                 Poisson counts
#   box-cox     x > 0        fitted               when you want the data to choose
#   yeo-johnson any          fitted               zeros, negatives, P&L
#   1/x         x != 0       very strong          rates, durations (rarely)
`,
      hl: [12, 26, 32, 50],
      caption: "**`log1p` barely moves values under 1** — the +1 dominates. For a rate or proportion it does almost nothing; for amounts starting at 1 or more it agrees with `log` from about 10 upward."
    },

    { t: "table",
      head: ["Transform", "Input", "Compression", "Fitted?", "Invert", "Typical for"],
      rows: [
        ["`log(x)`", "x > 0", "Strong, multiplicative", "No (offset is a choice)", "`exp`", "Amounts, prices, sizes"],
        ["`log1p(x)`", "x ≥ 0", "Strong; weak below 1", "No", "`expm1`", "Counts with zeros"],
        ["`sqrt(x)`", "x ≥ 0", "Mild", "No", "square", "Poisson counts; variance stabilising"],
        ["Box-Cox", "x > 0", "Fitted λ", "**Yes** — λ on train", "Closed form", "When the data should choose"],
        ["Yeo-Johnson", "any", "Fitted λ per sign", "**Yes**", "Closed form", "Signed quantities; the safe default"],
        ["`1/x`", "x ≠ 0", "Very strong; reverses order", "No", "`1/x`", "Rates and durations, rarely"],
        ["Quantile → normal", "any", "Total; shape destroyed", "**Yes** — quantiles on train", "Interpolated", "When only the ranks matter"]
      ],
      caption: "**Box-Cox and Yeo-Johnson learn λ from training data and are fit steps.** Log and sqrt have no parameter — but the log offset is a decision, and it matters for values below 1."
    },

    { t: "h2", n: "03", text: "Retransformation bias", id: "bias" },

    { t: "p", text: "**A model fitted to `log(y)` predicts the mean of `log(y)`. Exponentiating that gives the geometric mean of `y`, which is always below the arithmetic mean.** Every prediction transformed back naively is too low, by a factor that depends on the residual variance — and a revenue forecast built this way underestimates revenue, every time, by a consistent and unnoticed margin." },

    { t: "code", lang: "python", title: "the bias, measured, and three corrections", code: `
from sklearn.model_selection import train_test_split

# THE SETUP: y is log-normal given x. Fit on log(y), predict, exp.
x = rng.normal(size=n)
sigma = 0.6
y = np.exp(1 + 0.5 * x + rng.normal(0, sigma, n))
xtr, xte, ytr, yte = train_test_split(x, y, test_size=0.3, random_state=0)

m = LinearRegression().fit(xtr[:, None], np.log(ytr))
pred_log = m.predict(xte[:, None])

# NAIVE: exp the log-prediction.
pred_naive = np.exp(pred_log)
pred_naive.sum() / yte.sum()                               # 0.84
#
# The forecast total is 16% BELOW the actual total. Not by chance:
# by construction. exp(E[log y]) is the geometric mean, and for a
# log-normal, mean = geometric mean * exp(sigma^2 / 2).
np.exp(sigma ** 2 / 2)                                     # 1.197
#
# The naive prediction is the MEDIAN of y given x, not the mean. For
# a symmetric error on the log scale, half the outcomes are above it
# and half below -- but the ones above are further above than the
# ones below are below (that is what skew means), so the average is
# higher. Median is the right answer to "what is a typical outcome";
# mean is the right answer to "what will the total be". A revenue
# forecast wants the total.

# CORRECTION 1 -- the log-normal (Duan-style) factor, from the
# residual variance on the log scale:
resid = np.log(ytr) - m.predict(xtr[:, None])
s2 = resid.var(ddof=2)
pred_lognormal = np.exp(pred_log + s2 / 2)
pred_lognormal.sum() / yte.sum()                           # 1.00
#
# ASSUMES the log-scale residuals are normal. When they are, this is
# exact. When they are not, it over- or under-corrects.

# CORRECTION 2 -- Duan's smearing: the mean of exp(residuals),
# no distributional assumption.
smear = np.mean(np.exp(resid))
pred_smear = np.exp(pred_log) * smear
pred_smear.sum() / yte.sum()                               # 1.00
smear, np.exp(s2 / 2)                                      # (1.20, 1.20) -- agree here
#
# Smearing uses the EMPIRICAL residual distribution. On real data
# where the log residuals are skewed or heavy-tailed, smearing is
# what you want; the log-normal factor is a special case of it.

# CORRECTION 3 -- do not transform the target; model the mean
# directly with a log LINK. A Poisson or Gamma GLM with log link
# fits E[y] = exp(X beta): the prediction IS the mean, no
# retransformation. sklearn:
from sklearn.linear_model import GammaRegressor, PoissonRegressor
g = GammaRegressor(alpha=0).fit(xtr[:, None], ytr)
pred_gamma = g.predict(xte[:, None])
pred_gamma.sum() / yte.sum()                               # 1.00
#
# The GLM keeps the multiplicative structure (log link) and predicts
# the mean directly. For a positive, skewed target it is often the
# cleanest answer -- and it needs no correction. For counts, Poisson;
# for amounts, Gamma; for heavy tails, Tweedie.

# WHICH TO USE:
#   You NEED the mean (totals, budgets, expected revenue)
#       -> smearing, or a log-link GLM
#   You NEED the median (typical case, robust central estimate)
#       -> the naive exp is CORRECT and the "bias" is not a bias
#   You NEED quantiles (a range)
#       -> exp the log-scale quantiles; they invert exactly
#
# The mistake is not exp(pred). The mistake is calling exp(pred) the
# mean when it is the median, and summing medians to get a total.

# THE SAME APPLIES TO EVERY NON-LINEAR TARGET TRANSFORM. sqrt:
# E[y] != (E[sqrt y])^2. Box-Cox: same. The correction factor is
# specific to the transform; smearing generalises:
#   pred = mean over training residuals r of  inverse(pred_t + r)
def smear_predict(pred_t, resid_t, inverse):
    return np.array([inverse(p + resid_t).mean() for p in pred_t])
#
# Slower -- one pass over the residuals per prediction -- and correct
# for any transform.

# TransformedTargetRegressor DOES NOT CORRECT. It applies
# inverse_func to the prediction and returns it. For a log target it
# returns the median. Know that, and apply the smear yourself if the
# mean is what you need.
`,
      hl: [14, 31, 42, 74],
      caption: "**The naive `exp(prediction)` is the median of y, not the mean.** Summing medians to forecast a total is 16% low here — and `TransformedTargetRegressor` does not correct it."
    },

    { t: "callout", kind: "trap", title: "Every forecast too low, and nobody notices", body: [
      { t: "p", text: "The bias is consistent, so the model looks well-calibrated in rank — high predictions are high, low are low — and the aggregate is wrong by a fixed factor that the validation metric on the log scale never sees. **A revenue model evaluated by RMSE on `log(y)` can be excellent and underforecast total revenue by 20%.**" },
      { t: "p", text: "Evaluate on the original scale, against the quantity that matters. If it is a total, compare predicted total to actual total. That one check exposes retransformation bias immediately, and it is the check most log-target pipelines omit." }
    ]},

    { t: "h2", n: "04", text: "When skew is the signal", id: "signal" },

    { t: "code", lang: "python", title: "not every skewed column should be transformed", code: `
# 1. TREES DO NOT CARE. A monotonic transform leaves every split
#    unchanged. Logging a feature for a gradient-booster is wasted
#    effort; logging its TARGET changes the loss it minimises, which
#    may or may not be what you want.

# 2. THE TAIL IS THE POINT. In fraud, the 0.1% of transactions over
#    10,000 are the ones that matter. Log compresses 10,000 and
#    100,000 to 9.2 and 11.5 -- a difference of 2.3 on a scale where
#    the bulk spans 3 to 6. The model can still see it, but the
#    feature no longer SHOUTS. If the extreme values are what you are
#    looking for, consider keeping the raw scale (or adding an
#    "is_extreme" flag alongside the log).

# 3. ZERO-INFLATION IS TWO DISTRIBUTIONS, NOT SKEW.
spend = np.where(rng.random(n) < 0.6, 0.0, rng.lognormal(3, 0.8, n))
pd.Series(spend).skew()                                    # high -- but not because of a tail
(spend == 0).mean()                                        # 0.60
#
# 60% zeros and a log-normal for the rest. log1p gives a spike at 0
# and a bump around 3 -- bimodal, not skewed. No power transform
# fixes it. The honest model is two: "did they spend" (binary) and
# "how much, given they did" (log-normal on the non-zeros). A hurdle
# model. Or, as features: spend_any = (spend > 0), log_spend_pos =
# log(spend) where positive else 0.

# 4. THE SCALE HAS MEANING. A percentage, a probability, a score
#    with a defined range -- transforming changes what the numbers
#    mean, and a coefficient on log(percentage) is hard to read.
#    For proportions, the logit is the natural transform:
p = np.clip(rng.beta(2, 5, n), 1e-4, 1 - 1e-4)
logit = np.log(p / (1 - p))
#    It maps (0, 1) to the whole line and makes the ends symmetric.

# 5. NEGATIVE AND POSITIVE WITH MEANING. A P&L of -500 and +500 are
#    equally far from zero and mean opposite things. Yeo-Johnson
#    respects the sign; a log of the absolute value plus a sign
#    feature is the alternative. Neither is obviously right; think
#    about what the model needs to distinguish.

# THE FEATURE-VS-TARGET DISTINCTION, once more:
#   TRANSFORMING A FEATURE   changes how the model sees an input.
#       Harmless for trees; helpful for linear and distance models on
#       skewed inputs; invertible only if you need to explain a
#       coefficient.
#   TRANSFORMING THE TARGET  changes what the model optimises.
#       log(y) means the model minimises RELATIVE error -- a 10%
#       miss on 10 and on 10,000 cost the same. That is often what a
#       business wants (percentage accuracy) and sometimes not (the
#       big orders are where the money is). It is a modelling
#       decision, and it needs the retransformation correction.

# A QUICK AUDIT of a frame's numeric columns:
def skew_audit(df):
    rows = []
    for c in df.select_dtypes("number").columns:
        s = df[c].dropna()
        rows.append({"column": c, "skew": round(s.skew(), 2),
                     "zeros": round((s == 0).mean(), 3),
                     "negatives": round((s < 0).mean(), 3),
                     "suggest": suggest(s.to_numpy())})
    return pd.DataFrame(rows).sort_values("skew", key=abs, ascending=False)
#
# Columns with high skew AND high zero share are zero-inflated, not
# skewed. Columns with negatives need Yeo-Johnson or a sign feature.
# The rest with skew > 1 are log candidates -- for the models that
# care.
`,
      hl: [6, 15, 31, 43],
      caption: "**60% zeros and a log-normal for the rest is two distributions, not skew.** No power transform fixes it; the honest model is a hurdle — did they spend, and how much given that they did."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The demand forecast that was always 18% short",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A weekly demand model predicts units per product. It was trained on `log1p(units)` because the raw target was skewed, and its validation RMSE on the log scale is excellent. Operations report that total forecast demand has come in about 18% below actual, every week, for six months." },
        { t: "code", lang: "python", numbered: false, title: "forecast.py", code: `
model = Ridge().fit(X_train, np.log1p(y_train))
pred = np.expm1(model.predict(X_test))
total_forecast = pred.sum()`},
        { t: "p", text: "Diagnose the 18%, fix it with two different corrections, show they agree, and add the evaluation that would have caught it in the first week." }
      ],
      requirements: [
        "Explain why the bias is consistent and why the log-scale RMSE did not reveal it.",
        "Compute the log-normal correction factor from the training residuals.",
        "Compute Duan's smearing estimate and compare.",
        "Show a log-link GLM as the no-correction alternative.",
        "Add an original-scale evaluation: predicted total vs actual total, and MAE in units.",
        "Tests: the naive forecast is biased low; both corrections remove it; the GLM is unbiased."
      ],
      hint: "The residual variance on the log scale determines the factor. Compute `exp(σ²/2)` and compare it to 1 / 0.82.",
      solution: {
        lang: "python",
        title: "forecast_fixed.py",
        code: `import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge, PoissonRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error


# =========================================================================
# WHY 18%, AND WHY EVERY WEEK
# =========================================================================
#
# The model predicts E[log1p(units) | X]. expm1 of that is (roughly)
# the MEDIAN of units given X, not the mean. For a right-skewed
# target the mean exceeds the median by a factor that depends on the
# spread of the log residuals: for log-normal errors with sd sigma,
# mean / median = exp(sigma^2 / 2).
#
# With sigma ~0.63 on the log scale, exp(0.63^2 / 2) = 1.22, and
# 1 / 1.22 = 0.82. The forecast is 18% low.
#
# It is CONSISTENT because sigma is a property of the model's fit,
# not of any particular week. It was INVISIBLE because the validation
# metric was RMSE on the log scale, where the predictions are
# unbiased -- the bias appears only after the inverse transform, and
# nobody evaluated there.


def make(n=8000, seed=0):
    rng = np.random.default_rng(seed)
    X = pd.DataFrame({"price": rng.uniform(5, 50, n),
                      "promo": rng.integers(0, 2, n),
                      "season": rng.uniform(-1, 1, n)})
    log_mu = 3.0 - 0.04 * X["price"] + 0.5 * X["promo"] + 0.6 * X["season"]
    y = np.expm1(log_mu + rng.normal(0, 0.63, n))         # log-normal-ish demand
    y = np.round(np.clip(y, 0, None))
    return X, y


X, y = make()
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)


# =========================================================================
# THE ORIGINAL
# =========================================================================

model = Ridge(alpha=1.0).fit(Xtr, np.log1p(ytr))
pred_log = model.predict(Xte)
pred_naive = np.expm1(pred_log)

log_rmse = np.sqrt(mean_squared_error(np.log1p(yte), pred_log))      # 0.63 -- "fine"
pred_naive.sum() / yte.sum()                                          # 0.82 -- the 18%


# =========================================================================
# CORRECTION 1: log-normal factor
# =========================================================================

resid = np.log1p(ytr) - model.predict(Xtr)
s2 = resid.var(ddof=Xtr.shape[1] + 1)
factor_ln = np.exp(s2 / 2)                                            # ~1.22
pred_ln = np.expm1(pred_log + s2 / 2)
#
# NOTE for log1p: the exact correction is exp(pred + s2/2) - 1, which
# is what expm1(pred_log + s2/2) computes. Applying the factor to
# expm1(pred_log) instead is off by (factor - 1) -- small for large
# counts, not for small ones.


# =========================================================================
# CORRECTION 2: Duan's smearing
# =========================================================================

smear = np.mean(np.exp(resid))                                        # ~1.22
pred_smear = np.exp(pred_log) * smear - 1
#
# Same shape of correction, no normality assumption: the mean of
# exp(resid) IS the factor, whatever the residual distribution. When
# residuals are normal on the log scale the two agree; when they are
# skewed, smearing is right and the log-normal factor is not.


# =========================================================================
# ALTERNATIVE: model the mean directly
# =========================================================================

glm = PoissonRegressor(alpha=0.0, max_iter=1000).fit(Xtr, ytr)
pred_glm = glm.predict(Xte)
#
# Log link: E[y] = exp(X beta), fitted to y itself. The prediction
# is the mean. No transform, no inverse, no correction. Poisson for
# counts; GammaRegressor for continuous positive amounts; TweedieRegressor
# for zero-inflated. The multiplicative structure -- promo adds 50%,
# not 50 units -- is preserved by the link.


# =========================================================================
# THE EVALUATION THAT WOULD HAVE CAUGHT IT
# =========================================================================

def evaluate(name, pred, actual):
    return {"model": name,
            "total_ratio": round(pred.sum() / actual.sum(), 3),        # THE check
            "mae_units": round(mean_absolute_error(actual, pred), 2),
            "bias_units": round((pred - actual).mean(), 2),
            "log_rmse": round(np.sqrt(mean_squared_error(np.log1p(actual), np.log1p(np.clip(pred, 0, None)))), 3)}

report = pd.DataFrame([
    evaluate("naive expm1", pred_naive, yte),
    evaluate("log-normal corr", pred_ln, yte),
    evaluate("smearing", pred_smear, yte),
    evaluate("poisson glm", pred_glm, yte),
])
# model            total_ratio  mae_units  bias_units  log_rmse
# naive expm1            0.82      11.4       -4.8      0.63   <- best log_rmse, worst total
# log-normal corr        1.00      12.1        0.1      0.66
# smearing               1.00      12.1        0.1      0.66
# poisson glm            1.00      12.0        0.0      0.67
#
# READ THE FIRST ROW: the naive model has the BEST log-scale RMSE and
# a total 18% low. The metric that was being watched rewarded the
# bias. total_ratio is the number operations cared about, and it is
# the one that was never computed.
#
# The corrected models have slightly WORSE log_rmse -- because on the
# log scale the naive median IS the optimal point prediction. Mean
# and median are different targets; you cannot be optimal for both.
# Pick the one the business needs, and evaluate on that.


# =========================================================================
# TESTS
# =========================================================================

def test_naive_is_biased_low():
    assert pred_naive.sum() / yte.sum() < 0.9


def test_bias_matches_the_lognormal_factor():
    assert abs(pred_naive.sum() / yte.sum() - 1 / factor_ln) < 0.04


def test_lognormal_correction_removes_bias():
    assert abs(pred_ln.sum() / yte.sum() - 1) < 0.04


def test_smearing_removes_bias():
    assert abs(pred_smear.sum() / yte.sum() - 1) < 0.04


def test_corrections_agree_when_residuals_are_normal():
    assert abs(factor_ln - smear) < 0.03


def test_glm_is_unbiased_without_correction():
    assert abs(pred_glm.sum() / yte.sum() - 1) < 0.04


def test_log_rmse_did_not_reveal_the_bias():
    """The naive model has the best log-scale score AND the worst total."""
    r = report.set_index("model")
    assert r.loc["naive expm1", "log_rmse"] <= r["log_rmse"].min() + 1e-9
    assert r.loc["naive expm1", "total_ratio"] == r["total_ratio"].min()


def test_smearing_is_correct_when_residuals_are_skewed():
    """Plant skewed log-residuals: the log-normal factor is wrong, smearing is right."""
    rng = np.random.default_rng(1)
    n = 6000
    x = rng.normal(size=n)
    eps = rng.gamma(2, 0.4, n) - 0.8                          # right-skewed, mean ~0
    yy = np.exp(1 + 0.5 * x + eps)
    m = Ridge(alpha=0).fit(x[:, None], np.log(yy))
    r = np.log(yy) - m.predict(x[:, None])
    p = m.predict(x[:, None])
    ln_total = np.exp(p + r.var() / 2).sum() / yy.sum()
    sm_total = (np.exp(p) * np.mean(np.exp(r))).sum() / yy.sum()
    assert abs(sm_total - 1) < 0.02
    assert abs(ln_total - 1) > abs(sm_total - 1)`,
        notes: [
          { t: "p", text: "**The naive model has the best log-scale RMSE and the worst total.** The metric that was being watched rewarded the bias. On the log scale the median *is* the optimal point prediction; the mean is a different target, and you cannot be optimal for both — so the choice belongs to whoever needs the number." },
          { t: "callout", kind: "insight", title: "The bias is exp(σ²/2), and σ is a property of the fit", body: [
            { t: "p", text: "That is why it was 18% every week for six months: the residual spread on the log scale does not change from week to week, so the ratio of mean to median does not either. **A consistent under-forecast is the signature of retransformation bias**, and a total-ratio check would have shown 0.82 in the first week." }
          ]},
          { t: "p", text: "**Smearing and the log-normal factor agree here because the residuals are normal on the log scale.** The last test plants skewed residuals and shows the log-normal factor over-corrects while smearing stays within 2% — smearing uses the empirical residuals and is right for any shape." },
          { t: "p", text: "**The Poisson GLM needs no correction because it never transformed the target.** A log link fits `E[y] = exp(Xβ)` directly, keeps the multiplicative structure — a promotion adds 50%, not 50 units — and predicts the mean. For a positive skewed target it is often the cleanest answer." },
          { t: "p", text: "**For `log1p`, the correction goes inside the inverse**: `expm1(pred + σ²/2)`, not `expm1(pred) × factor`. The difference is `factor − 1` per row, negligible for large counts and not for small ones." },
          { t: "p", text: "**`total_ratio` is the evaluation that was missing.** Predicted total against actual total, on the original scale, in the units the business uses. It is one line, and it is the line most log-target pipelines omit." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A model trained on `log(y)` has unbiased predictions on the log scale. What does `exp(prediction)` estimate?",
          options: [
            "The mean of y",
            "The median of y — the geometric mean, which for a skewed target is below the arithmetic mean by `exp(σ²/2)`",
            "The mode of y",
            "An unbiased estimate of y"
          ],
          answer: 1,
          why: "Half the outcomes are above the log-scale prediction and half below, but the ones above are further above — that is what skew means — so the average exceeds the exponentiated centre. For a total, correct with smearing or the log-normal factor, or model the mean directly with a log-link GLM."
        }
      ]
    }
  ],

  takeaways: [
    "**Most non-negative, uncapped quantities are right-skewed**: the mean is not the typical value and σ is set by the tail.",
    "**Skew above 1 is strong; above 2 is a log candidate** — for the models that care.",
    "**On a skewed target, a linear model is fitted mostly to its tail**: 1% of rows can carry 40% of the loss.",
    "**Log turns multiplicative effects additive** — \"5% per year\" is linear in log(salary).",
    "**`log` needs x > 0; `log1p` handles zeros but barely moves values below 1**; the offset is a decision.",
    "**Box-Cox fits the power λ from data** — near 0 is log, near 0.5 is sqrt, near 1 is leave it; **Yeo-Johnson handles any sign**.",
    "**Box-Cox and Yeo-Johnson are fit steps**; fit λ on training data inside a Pipeline.",
    "**Trees do not care** — a monotonic transform leaves every split unchanged; transforming a tree's *target* changes its loss.",
    "**`exp(E[log y])` is the median, not the mean**, and it is below the mean by `exp(σ²/2)` for log-normal errors.",
    "**Correct with the log-normal factor, or with Duan's smearing — the mean of `exp(residuals)` — which needs no normality.**",
    "**A log-link GLM predicts the mean directly** with no transform and no correction; Poisson for counts, Gamma for amounts.",
    "**`TransformedTargetRegressor` does not correct** — it returns the median for a log target.",
    "**Evaluate on the original scale against the quantity that matters** — predicted total against actual total exposes the bias in one line.",
    "**Zero-inflation is two distributions, not skew**: a hurdle model, or a presence flag plus a log of the positives."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A column of transaction counts has 60% zeros. `log1p` produces a spike at 0 and a bump around 3. What is the right treatment?",
        options: [
          "Box-Cox",
          "Recognise it as zero-inflated — two distributions — and model presence and amount separately, or add a presence flag alongside log of the positives",
          "Square root",
          "Quantile transform to normal"
        ],
        answer: 1,
        why: "No power transform reshapes a bimodal column into a normal one. The zeros are a different process from the positives — 'did they spend' against 'how much given they did' — and a hurdle model or a flag-plus-log pair represents that honestly."
      },
      {
        stem: "Why can a log-target model have excellent log-scale RMSE and a 20% under-forecast of totals?",
        options: [
          "The validation set was too small",
          "On the log scale the predictions are unbiased; the bias appears only after exponentiating, where the result is the median rather than the mean — and nobody evaluated there",
          "Ridge regularisation shrinks predictions",
          "The features were not scaled"
        ],
        answer: 1,
        why: "Median and mean are different targets on a skewed scale, and the model was optimal for one while the business needed the other. The check is a predicted-total-to-actual-total ratio on the original scale — one line that the log-scale metric can never substitute for."
      },
      {
        stem: "When is Duan's smearing preferred over the `exp(σ²/2)` correction?",
        options: [
          "Never; they are identical",
          "When the log-scale residuals are not normal — smearing uses the empirical mean of `exp(residuals)` and is correct for any residual shape; the factor assumes normality",
          "When the target has zeros",
          "When the model is a GLM"
        ],
        answer: 1,
        why: "For normal log-residuals the two agree. For skewed or heavy-tailed residuals — common on real data — the log-normal factor over- or under-corrects and smearing does not. Smearing also generalises to any transform: average the inverse over the training residuals."
      },
      {
        stem: "What does `PowerTransformer(method=\"box-cox\")` learn, and why does that make it a fit step?",
        options: [
          "Nothing; it applies a fixed formula",
          "The exponent λ that makes the training column closest to normal — λ near 0 is log, near 0.5 is sqrt; a different λ on test data would transform the two sets differently",
          "The mean and standard deviation only",
          "The number of bins"
        ],
        answer: 1,
        why: "λ is estimated from data, like a scaler's mean. Fit on train, transform both, inside a Pipeline. The fitted λ is also informative in itself: it is the answer to 'how much compression does this column need'."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you log-transform a feature, and when would you not bother?",
        strong: "When it is strongly right-skewed — skew above 1 or 2 — and the model is one that cares: linear, distance-based or gradient-descended, where the tail otherwise dominates leverage, distance or step size. I would not bother for a tree, which splits on rank and is unchanged by any monotonic transform. And I would not use it on a zero-inflated column, which is two distributions, or on the tail of a fraud feature where the extreme values are the point.",
        answer: [
          { t: "p", text: "Naming trees as the exception and zero-inflation as the false positive shows you know when the rule stops." }
        ]
      },
      {
        level: "advanced",
        q: "What is retransformation bias, and how do you fix it?",
        strong: "A model fitted to `log(y)` predicts the mean of `log(y)`; exponentiating gives the median of `y`, which for a skewed target is below the mean by `exp(σ²/2)`. A forecast built that way is consistently low — the same factor every period, because σ is a property of the fit. Fix it with the log-normal factor if the log residuals are normal, or Duan's smearing — the mean of `exp(residuals)` — if they are not, or avoid it by fitting a log-link GLM that models the mean directly. And evaluate the total on the original scale, which is the check that exposes it.",
        answer: [
          { t: "p", text: "Knowing that the median is sometimes the *right* answer — and that the mistake is calling it the mean — is the mature version of this." }
        ]
      },
      {
        level: "advanced",
        q: "Does transforming the target change what the model is optimising?",
        strong: "Yes, and that is the real decision. A model on `log(y)` minimises relative error — a 10% miss on 10 and on 10,000 cost the same — where a model on raw `y` minimises absolute error and is dominated by the big values. One is right when the business wants percentage accuracy; the other when the large orders are where the money is. The transform is a choice of loss, not a cleaning step, and it needs the retransformation correction if the mean is what gets reported.",
        answer: [
          { t: "p", text: "Framing the transform as a choice of loss function elevates it from a preprocessing trick to a modelling decision — which is what it is." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 6.7 — Outliers: Finding Them
   ========================================================================= */
EC.receiveLesson({
  id: "6.7",

  lede: "**A z-score finds values far from the mean — using a mean and a standard deviation that the outlier itself has already dragged toward it.** The IQR rule does not have that problem. Neither of them sees the transaction that is normal in amount and normal in frequency and impossible in combination. Detection is a set of tools with different blind spots, and the first decision is which blind spot you can afford.",

  objectives: [
    "Apply the IQR rule, z-score and robust z-score and say when each fails",
    "Explain masking — why an outlier can hide itself from a mean-based detector",
    "Detect multivariate outliers with Mahalanobis distance and Isolation Forest",
    "Distinguish a univariate outlier from a multivariate one and know why the second is invisible to the first",
    "Choose a detection method from the data's shape and the cost of each kind of error"
  ],

  prerequisites: ["6.1", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Univariate rules and their blind spots", id: "univariate" },

    { t: "p", text: "An outlier is a value far from where the rest of the data says it should be. **Every univariate rule is a definition of \"far\" and a choice of \"where the rest is\"** — and the mean-based choices have a defect the robust ones do not." },

    { t: "dl", items: [
      ["Outlier", "An observation that lies unusually far from the bulk of the data. Not a synonym for \"error\": an outlier can be a mistake, a rare true event, or the most important row in the set."],
      ["z-score", "Distance from the mean in standard deviations: `(x − μ) / σ`. Flag `|z| > 3`. Both μ and σ are computed from data that includes the outlier."],
      ["Masking", "A large outlier inflates σ and shifts μ toward itself, so its own z-score comes out smaller than it should — it hides. Two large outliers can hide each other completely."],
      ["IQR rule", "Flag values below `Q1 − 1.5·IQR` or above `Q3 + 1.5·IQR`, where IQR is the interquartile range. Quartiles are unmoved by extreme values, so there is no masking."],
      ["Robust z-score", "`(x − median) / (1.4826 · MAD)`, where MAD is the median absolute deviation. The 1.4826 makes it comparable to σ for normal data. Unmasked, and on the same scale as z. Also called the modified z-score, written `0.6745 · (x − median) / MAD` — the same number, since 0.6745 = 1 / 1.4826 — with 3.5 as the customary cut."],
      ["Breakdown point", "The fraction of the data that can be corrupted before an estimator becomes arbitrary. The mean's is 0 — one value can move it anywhere. The median's is 50%."]
    ]},

    { t: "viz",
      title: "Masking: the outlier that hides itself",
      caption: "Ninety-nine values near 50 and one at 500. The mean moves to 54.5 and σ inflates to 45, so the outlier's z-score is only 9.9 — and if there are two at 500, σ inflates further and each scores 7.0. The median and MAD do not move, and the robust z is over 100.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A number line with a cluster of points near 50 and one at 500, showing where the mean and median sit and the resulting z-score and robust z-score">
  <line x1="40" y1="120" x2="840" y2="120" style="stroke:var(--line);stroke-width:1.5"/>
  <text x="40" y="145" class="s-sub" style="fill:var(--ink-3)">0</text>
  <text x="200" y="145" class="s-sub" style="fill:var(--ink-3)">100</text>
  <text x="440" y="145" class="s-sub" style="fill:var(--ink-3)">250</text>
  <text x="820" y="145" class="s-sub" style="fill:var(--ink-3)">500</text>

  <g style="fill:var(--accent);fill-opacity:.6">
    <circle cx="100" cy="120" r="4"/><circle cx="108" cy="112" r="4"/><circle cx="112" cy="126" r="4"/><circle cx="116" cy="118" r="4"/>
    <circle cx="120" cy="110" r="4"/><circle cx="122" cy="128" r="4"/><circle cx="124" cy="116" r="4"/><circle cx="128" cy="122" r="4"/>
    <circle cx="130" cy="108" r="4"/><circle cx="132" cy="130" r="4"/><circle cx="134" cy="114" r="4"/><circle cx="136" cy="120" r="4"/>
    <circle cx="138" cy="126" r="4"/><circle cx="140" cy="112" r="4"/><circle cx="144" cy="118" r="4"/><circle cx="148" cy="124" r="4"/>
  </g>
  <text x="96" y="94" class="s-sub" style="fill:var(--accent)">99 values, 40–60</text>
  <circle cx="820" cy="120" r="6" style="fill:var(--crit)"/>
  <text x="760" y="94" class="s-sub" style="fill:var(--crit)">one at 500</text>

  <line x1="127" y1="160" x2="127" y2="185" style="stroke:var(--good);stroke-width:2"/>
  <text x="60" y="204" class="s-sub" style="fill:var(--good)">median 50 · MAD 5</text>
  <text x="60" y="222" class="s-sub" style="fill:var(--good)">robust z of 500 = (500−50)/(1.48·5) ≈ 61</text>

  <line x1="134" y1="160" x2="134" y2="185" style="stroke:var(--crit);stroke-width:2;stroke-dasharray:3 2"/>
  <text x="380" y="204" class="s-sub" style="fill:var(--crit)">mean 54.5 · σ 45  ← both dragged by the outlier</text>
  <text x="380" y="222" class="s-sub" style="fill:var(--crit)">z of 500 = (500−54.5)/45 ≈ 9.9 — and 7.0 with a second outlier</text>

  <text x="40" y="262" class="s-sub" style="fill:var(--ink-3)">The z-score still flags this one. Add three more at 500 and σ rises to 90; each scores 4.9. Add ten and each scores 3.1 — on the threshold. The outliers have masked each other.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "three rules, and the case where the mean-based one fails", code: `
import pandas as pd
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
clean = rng.normal(50, 5, 990)

# Z-SCORE:
def z_outliers(x, threshold=3.0):
    z = (x - x.mean()) / x.std()
    return np.abs(z) > threshold

# IQR RULE:
def iqr_outliers(x, k=1.5):
    q1, q3 = np.percentile(x, [25, 75])
    iqr = q3 - q1
    return (x < q1 - k * iqr) | (x > q3 + k * iqr)

# ROBUST Z (median / MAD):
def robust_z(x):
    med = np.median(x)
    mad = np.median(np.abs(x - med)) * 1.4826         # scale to sigma
    return (x - med) / (mad if mad > 0 else 1e-9)

def robust_outliers(x, threshold=3.5):
    return np.abs(robust_z(x)) > threshold

# ONE OUTLIER -- all three find it:
one = np.append(clean, 500)
z_outliers(one).sum(), iqr_outliers(one).sum(), robust_outliers(one).sum()
# (1, 3, 3)      <- IQR and robust also flag a couple of legitimate
#                   tail values; the z-score, being conservative here,
#                   flags only the 500

# TEN OUTLIERS -- masking begins:
ten = np.append(clean, [500] * 10)
z_outliers(ten).sum()             # 10 -- still finds them, barely:
np.abs((500 - ten.mean()) / ten.std())     # 3.1 -- on the threshold

# THIRTY OUTLIERS -- the z-score has been masked:
thirty = np.append(clean, [500] * 30)
z_outliers(thirty).sum()          # 0  -- NONE FOUND
np.abs((500 - thirty.mean()) / thirty.std())    # 2.4 -- below 3
#
# Thirty values at ten times the typical value, and the z-score finds
# nothing. sigma has grown from 5 to 76 because it INCLUDES the
# outliers. They inflated the ruler they were being measured with.

iqr_outliers(thirty).sum()        # 30 + a few tail values
robust_outliers(thirty).sum()     # 30 + a few
#
# The quartiles and the median did not move: 30 of 1,020 values is
# 3%, well under the 25% it would take to shift Q3, and the 50% it
# would take to shift the median.

# THE ROBUST Z ON THE SAME DATA:
robust_z(thirty)[-1]              # ~61 -- unambiguous
#
# THIS IS THE BREAKDOWN POINT. The mean and sigma have breakdown
# point 0: one value can move them arbitrarily. The median and MAD
# have 50%. The IQR has 25%. Use an estimator whose breakdown point
# exceeds the fraction of outliers you might have.

# THE THRESHOLDS ARE CONVENTIONS, NOT LAWS:
#   |z| > 3        0.27% of a normal distribution; ~3 in 1,000 by chance
#   IQR k = 1.5    ~0.7% of a normal; k = 3 for "extreme"
#   |robust z| > 3.5   Iglewicz-Hoaglin recommendation
#
# On 1M normal rows, |z| > 3 flags ~2,700 perfectly ordinary values.
# On a skewed column it flags the whole upper tail. The threshold is a
# knob, and the right setting depends on what you will DO with the
# flags (see 6.8).

# SKEW BREAKS ALL THREE, in different ways:
skewed = rng.lognormal(3, 0.8, 1000)
z_outliers(skewed).sum()          # ~15: the upper tail, none low
iqr_outliers(skewed).sum()        # ~50: more of the upper tail
robust_outliers(skewed).sum()     # ~40
#
# None of these are errors. A log-normal column HAS a long right
# tail, and every symmetric rule reads it as outliers. Either detect
# on the log scale, or use a rule that treats the two sides
# separately (a per-side IQR, or quantile bounds like 0.5% / 99.5%).
np.log(skewed).pipe(iqr_outliers).sum()      # ~5 -- the genuine extremes

# PERCENTILE BOUNDS -- the rule that assumes nothing about shape:
def pct_outliers(x, lo=0.5, hi=99.5):
    a, b = np.percentile(x, [lo, hi])
    return (x < a) | (x > b)
#
# Flags exactly 1% by construction. Honest about being a cutoff
# rather than a detector; useful when the question is "cap the
# extremes" rather than "find the errors".
`,
      hl: [30, 36, 46, 66],
      caption: "**Thirty values at ten times the typical value, and the z-score finds nothing.** σ has grown from 5 to 76 because it includes the outliers — they inflated the ruler they were being measured with."
    },

    { t: "callout", kind: "trap", title: "The z-score uses the outlier to measure the outlier", body: [
      { t: "p", text: "Mean and standard deviation are computed from all the data, including the values you are trying to find. **One outlier drags the mean toward itself and inflates σ; several outliers inflate σ enough that none of them exceeds three.** They hide each other — masking." },
      { t: "p", text: "The median and MAD have a breakdown point of 50%: half the data can be corrupted before they move. Quartiles have 25%. The mean has zero." },
      { t: "p", text: "**Default to the robust z or the IQR rule.** Use the plain z-score only when you know the contamination is a handful of rows — and if you knew that, you would not need a detector." }
    ]},

    { t: "h2", n: "02", text: "Multivariate outliers", id: "multivariate" },

    { t: "p", text: "**A row can be normal on every column and impossible as a combination.** Height 180 cm is normal. Weight 45 kg is normal. Together they describe someone who does not exist. No univariate rule sees this, because each column was checked on its own." },

    { t: "viz",
      title: "Normal in each dimension, impossible in both",
      caption: "The red point is inside the range of x and inside the range of y. Every univariate check passes it. Its distance from the cloud — measured along the cloud's own axes — is enormous, and that is what Mahalanobis distance computes.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A scatter of correlated points forming a diagonal ellipse, with one point inside both marginal ranges but far from the ellipse, and the marginal histograms on each axis showing nothing unusual">
  <g transform="translate(120,20)">
    <rect x="0" y="0" width="400" height="220" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <ellipse cx="200" cy="110" rx="170" ry="45" transform="rotate(-30 200 110)" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent);stroke-width:1;stroke-dasharray:4 3"/>
    <g style="fill:var(--accent);fill-opacity:.65">
      <circle cx="60" cy="180" r="4"/><circle cx="80" cy="172" r="4"/><circle cx="95" cy="160" r="4"/><circle cx="110" cy="165" r="4"/>
      <circle cx="125" cy="148" r="4"/><circle cx="140" cy="140" r="4"/><circle cx="150" cy="150" r="4"/><circle cx="165" cy="128" r="4"/>
      <circle cx="180" cy="120" r="4"/><circle cx="190" cy="132" r="4"/><circle cx="200" cy="110" r="4"/><circle cx="215" cy="100" r="4"/>
      <circle cx="225" cy="112" r="4"/><circle cx="240" cy="92" r="4"/><circle cx="255" cy="85" r="4"/><circle cx="265" cy="98" r="4"/>
      <circle cx="280" cy="72" r="4"/><circle cx="295" cy="65" r="4"/><circle cx="310" cy="75" r="4"/><circle cx="325" cy="52" r="4"/>
      <circle cx="340" cy="45" r="4"/><circle cx="130" cy="158" r="4"/><circle cx="230" cy="105" r="4"/><circle cx="300" cy="60" r="4"/>
    </g>
    <circle cx="320" cy="170" r="7" style="fill:var(--crit)"/>
    <text x="332" y="176" class="s-sub" style="fill:var(--crit)">normal x, normal y</text>
    <text x="332" y="192" class="s-sub" style="fill:var(--crit)">impossible pair</text>
    <text x="8" y="16" class="s-sub" style="fill:var(--ink-3)">y</text>
    <text x="380" y="212" class="s-sub" style="fill:var(--ink-3)">x</text>
  </g>
  <g transform="translate(120,250)">
    <g style="fill:var(--accent);fill-opacity:.3">
      <rect x="40" y="10" width="40" height="8"/><rect x="80" y="4" width="40" height="14"/><rect x="120" y="0" width="40" height="18"/>
      <rect x="160" y="0" width="40" height="18"/><rect x="200" y="0" width="40" height="18"/><rect x="240" y="2" width="40" height="16"/>
      <rect x="280" y="4" width="40" height="14"/><rect x="320" y="8" width="40" height="10"/>
    </g>
    <line x1="320" y1="-6" x2="320" y2="20" style="stroke:var(--crit);stroke-width:2"/>
    <text x="0" y="16" class="s-sub" style="fill:var(--ink-3)">x marginal: the red point is well inside</text>
  </g>
  <g transform="translate(20,20)">
    <g style="fill:var(--accent);fill-opacity:.3">
      <rect x="60" y="30" width="10" height="30"/><rect x="50" y="60" width="20" height="30"/><rect x="45" y="90" width="25" height="30"/>
      <rect x="45" y="120" width="25" height="30"/><rect x="50" y="150" width="20" height="30"/><rect x="58" y="180" width="12" height="30"/>
    </g>
    <line x1="40" y1="190" x2="75" y2="190" style="stroke:var(--crit);stroke-width:2"/>
    <text x="0" y="240" class="s-sub" style="fill:var(--ink-3)">y: inside</text>
  </g>
  <text x="560" y="70" class="s-sub" style="fill:var(--ink-3)">Mahalanobis distance measures</text>
  <text x="560" y="90" class="s-sub" style="fill:var(--ink-3)">"how many SDs from the centre"</text>
  <text x="560" y="110" class="s-sub" style="fill:var(--ink-3)">along the ellipse's own axes.</text>
  <text x="560" y="140" class="s-sub" style="fill:var(--ink-3)">Points on the ellipse: D² ≈ χ²(2).</text>
  <text x="560" y="160" class="s-sub" style="fill:var(--ink-3)">The red point: D² ≈ 40.</text>
  <text x="560" y="190" class="s-sub" style="fill:var(--ink-3)">Euclidean distance would not</text>
  <text x="560" y="210" class="s-sub" style="fill:var(--ink-3)">see it either — it ignores the</text>
  <text x="560" y="230" class="s-sub" style="fill:var(--ink-3)">correlation that makes it wrong.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "Mahalanobis distance, its robust version, and Isolation Forest", code: `
from scipy.stats import chi2
from sklearn.covariance import MinCovDet, EmpiricalCovariance
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor

# CORRELATED DATA with one combination outlier:
n = 1000
height = rng.normal(170, 8, n)
weight = 0.9 * height - 85 + rng.normal(0, 6, n)         # ~68 at 170
X = np.column_stack([height, weight])
X = np.vstack([X, [[185, 48]]])                           # tall and very light
# 185 cm is the 97th percentile of height; 48 kg is the 3rd of weight.
# Neither is an outlier alone.

# UNIVARIATE CHECKS PASS IT:
robust_outliers(X[:, 0])[-1], robust_outliers(X[:, 1])[-1]     # (False, False)

# MAHALANOBIS: distance from the centre, in units of the data's own
# spread, ACCOUNTING FOR CORRELATION.
def mahalanobis(X, mean=None, cov=None):
    mean = X.mean(axis=0) if mean is None else mean
    cov = np.cov(X, rowvar=False) if cov is None else cov
    inv = np.linalg.pinv(cov)
    d = X - mean
    return np.sqrt(np.einsum("ij,jk,ik->i", d, inv, d))     # see 2.3

d2 = mahalanobis(X) ** 2
d2[-1]                                                   # ~45
#
# D^2 is chi-squared with p degrees of freedom for normal data, so
# the threshold has a probability attached:
threshold = chi2.ppf(0.999, df=2)                        # 13.8
(d2 > threshold).sum()                                   # 2: the plant, plus one
#
# The (185, 48) row has D^2 of 45 against a 99.9% cutoff of 13.8. In
# univariate terms it was inside both ranges; in the joint
# distribution it is 6.7 "standard deviations" from the cloud.

# THE MASKING PROBLEM AGAIN: the covariance is computed from data
# that includes the outliers. Enough of them tilt the ellipse toward
# themselves. THE ROBUST VERSION uses Minimum Covariance Determinant:
# the covariance of the tightest half of the data.
mcd = MinCovDet(random_state=0).fit(X)
d2_robust = mcd.mahalanobis(X)                           # squared, already
d2_robust[-1]                                            # ~52 -- larger, because
                                                         # the outlier no longer
                                                         # inflated the covariance
(d2_robust > threshold).sum()

# WHEN MAHALANOBIS IS WRONG: the data is not one ellipse.
# Two clusters, or a curved relationship, and the covariance describes
# a shape that fits neither. Points between clusters look "central".

# ISOLATION FOREST: how few random splits does it take to isolate
# this point? Outliers are isolated quickly; dense points are not.
iso = IsolationForest(contamination=0.01, random_state=0).fit(X)
scores = -iso.score_samples(X)                           # higher = more anomalous
flags = iso.predict(X) == -1
flags[-1], flags.sum()                                   # (True, 11)
#
# ASSUMES: nothing about shape. Handles multiple clusters, curved
# structure, mixed scales (it splits on raw values, so scaling does
# not matter much).
# COSTS: contamination= is a GUESS at the outlier fraction, and it
# sets the threshold directly. Get it wrong and you flag exactly that
# fraction regardless of what the data contains. Use score_samples
# and choose the cutoff by looking, rather than trusting predict().

# LOCAL OUTLIER FACTOR: density relative to the NEIGHBOURS' density.
# A point in a sparse region of a sparse cluster is normal; the same
# density inside a dense cluster is an outlier.
lof = LocalOutlierFactor(n_neighbors=20, contamination=0.01)
lof_flags = lof.fit_predict(X) == -1
lof_flags[-1]                                            # True
#
# ASSUMES: neighbourhoods are meaningful -- so SCALE the features.
# COSTS: O(n^2) neighbour search; slow past ~100k rows. And no
# predict() on new data unless novelty=True at fit time.

# WHICH ONE:
#   one ellipse, roughly normal        Mahalanobis (robust: MCD)
#   several clusters, odd shapes       Isolation Forest
#   varying density across the space   LOF
#   very high dimension                Isolation Forest, or reduce first
#   need a probability                 Mahalanobis (chi2 gives one)
#   need it fast at scale              Isolation Forest (linear-ish)

# THE UNIVARIATE-ONLY BLIND SPOT, quantified:
uni = robust_outliers(X[:, 0]) | robust_outliers(X[:, 1])
multi = d2_robust > threshold
pd.crosstab(uni, multi, rownames=["univariate"], colnames=["multivariate"])
# multivariate  False  True
# univariate
# False           990     6     <- 6 rows only a joint check finds
# True              1     4
#
# Six rows that pass every per-column check and fail the joint one.
# On real data with more columns, that number grows: the more
# dimensions, the more ways to be normal in each and wrong overall.
`,
      hl: [19, 31, 48, 78],
      caption: "**Six rows pass every per-column check and fail the joint one.** The more dimensions, the more ways a row can be normal in each and impossible as a combination."
    },

    { t: "h2", n: "03", text: "Time series and groups", id: "context" },

    { t: "p", text: "**\"Far from the rest\" depends on which rest.** A value that is normal for the dataset can be an outlier for its sensor, its region, or its hour of the day — and a detector that pools everything will miss it while flagging the wrong things." },

    { t: "code", lang: "python", title: "outliers relative to a group, a trend, or a season", code: `
# WITHIN GROUP: the same rule, applied per group.
sales = pd.DataFrame({
    "store": rng.choice(["small", "large"], 2000),
    "amount": np.where(rng.random(2000) < 0.5,
                       rng.normal(100, 15, 2000),        # small stores
                       rng.normal(1000, 150, 2000)),     # large stores
})
sales.loc[sales["store"] == "small", "amount"] = rng.normal(100, 15, (sales["store"] == "small").sum())
sales.loc[sales["store"] == "large", "amount"] = rng.normal(1000, 150, (sales["store"] == "large").sum())
sales.loc[0, ["store", "amount"]] = ["small", 400]        # a small store selling 400

# POOLED: 400 is unremarkable -- the large stores sell 1,000.
robust_outliers(sales["amount"].to_numpy())[0]            # False

# PER GROUP: 400 is 20 MADs from a small store's typical day.
sales["rz"] = sales.groupby("store")["amount"].transform(lambda s: robust_z(s.to_numpy()))
sales.loc[0, "rz"]                                        # ~20
(sales["rz"].abs() > 3.5).sum()
#
# transform (see 4.2) applies the rule within each store and hands
# back an aligned column. The group is the "rest" the value is
# compared to.

# ON A TREND: the residual, not the value.
t = np.arange(365)
trend = 100 + 0.5 * t + rng.normal(0, 5, 365)            # rising 0.5/day
trend[200] = 100                                          # a drop to the START value
#
# 100 is a perfectly normal value for this series -- it is where it
# began. On day 200 it is 100 below where it should be.
robust_outliers(trend)[200]                               # False: 100 is in range

# Detrend, then detect:
fit = np.polyval(np.polyfit(t, trend, 1), t)
resid = trend - fit
robust_outliers(resid)[200]                               # True: residual is -100

# ON A SEASON: the residual from the seasonal expectation.
hours = np.arange(24 * 30)
daily = 50 + 30 * np.sin(2 * np.pi * hours / 24) + rng.normal(0, 3, len(hours))
daily[300] = 80                                           # 80 at 03:00 (a trough)
robust_outliers(daily)[300]                               # False: 80 is a normal PEAK value
hour_of_day = hours % 24
expected = pd.Series(daily).groupby(hour_of_day).transform("median").to_numpy()
robust_outliers(daily - expected)[300]                    # True: 60 above the 03:00 norm

# ROLLING: the residual from the recent level (see 4.3 for the full
# treatment, including why the window must exclude the current point).
s = pd.Series(daily)
level = s.rolling(24, closed="left").median()
scale = (s - level).abs().rolling(24, closed="left").median() * 1.4826
rz = (s - level) / scale
(rz.abs() > 4).sum()

# THE GENERAL PATTERN: model the expectation, detect on the residual.
#   groupby -> transform      expectation is the group's level
#   polyfit / detrend         expectation is the trend
#   seasonal median           expectation is the time-of-day norm
#   rolling                   expectation is the recent past
#   a fitted model            expectation is the model's prediction
#
# The last one is the general form: an outlier is a row the model
# gets badly wrong. Residual analysis on a good model is the most
# powerful detector there is, and the most dependent on the model
# being good.
`,
      hl: [15, 26, 34, 44],
      caption: "**Model the expectation, detect on the residual.** A value of 100 is normal for a series that started at 100 — on day 200 of a rising trend it is 100 below where it should be, and only the residual shows it."
    },

    { t: "table",
      head: ["Method", "Finds", "Blind to", "Breakdown / cost", "Reach for it when"],
      rows: [
        ["z-score", "Far from the mean, one column", "Masking; skew; joint structure", "0% — one value moves it", "Never as a default; only with known light contamination"],
        ["IQR rule", "Beyond the quartile fences, one column", "Skew (flags a tail); joint structure", "25%", "A quick, robust univariate screen"],
        ["Robust z (MAD)", "Far from the median, one column", "Skew; joint structure", "50%", "**The univariate default**"],
        ["Percentile bounds", "The top and bottom x%", "Everything — it is a cutoff, not a detector", "—", "Capping, not detecting"],
        ["Mahalanobis", "Far from the centre of one ellipse", "Multiple clusters; curvature", "0% (MCD: 50%)", "Correlated numeric columns, roughly normal"],
        ["Isolation Forest", "Easy to isolate by random splits", "Subtle local anomalies", "`contamination` guess", "Many columns, odd shapes, scale"],
        ["LOF", "Sparse relative to neighbours", "Global outliers in sparse regions", "O(n²)", "Varying density; under 100k rows"],
        ["Residual from a model", "What the model gets wrong", "What the model also gets wrong", "Depends on the model", "**The general form** — group, trend, season, or fitted"]
      ],
      caption: "**The z-score is never the default.** Its breakdown point is zero, and the situations where it is safe are the ones where you already know there are few outliers — which is when you least need a detector."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An outlier report that says which kind, and how sure",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build a detector for a transactions table with numeric columns, a group column and a timestamp. It must find univariate outliers per group with a robust rule, multivariate outliers on the numeric block with a robust Mahalanobis, and temporal outliers relative to each group's recent level — and report, per flagged row, which detector fired, the score, and the value it was compared against." },
        { t: "p", text: "Test on generated data with a planted example of each kind, and show that each is found by its own detector and missed by the others." }
      ],
      requirements: [
        "Robust univariate per group, with the score and the group median.",
        "Robust Mahalanobis on the numeric block with a chi-square threshold.",
        "Temporal residual per group with a causal rolling baseline.",
        "One report row per flag, naming the detector and the evidence.",
        "A demonstration that the z-score is masked where the robust rule is not.",
        "Tests: each planted outlier found by exactly the right detector."
      ],
      hint: "Plant three: a value 20 MADs above its group's median; a row inside every marginal range but off the correlation; and a value normal for the group but 6 SDs above the group's last 24 readings.",
      solution: {
        lang: "python",
        title: "outlier_report.py",
        code: `import pandas as pd
import numpy as np
from scipy.stats import chi2
from sklearn.covariance import MinCovDet


# =========================================================================
# ROBUST PRIMITIVES
# =========================================================================

def robust_z(x):
    x = np.asarray(x, float)
    med = np.nanmedian(x)
    mad = np.nanmedian(np.abs(x - med)) * 1.4826
    return (x - med) / (mad if mad > 1e-12 else 1e-12), med, mad


# =========================================================================
# DETECTORS -- each returns a frame of flags with evidence
# =========================================================================

def univariate_by_group(df, cols, group, threshold=3.5):
    rows = []
    for col in cols:
        for g, sub in df.groupby(group):
            z, med, mad = robust_z(sub[col])
            hit = np.abs(z) > threshold
            for idx, zi, v in zip(sub.index[hit], z[hit], sub.loc[hit, col]):
                rows.append({"row": idx, "detector": "univariate", "column": col,
                             "group": g, "value": float(v), "score": round(float(zi), 2),
                             "compared_to": f"group median {med:.1f}, MAD {mad:.1f}"})
    return pd.DataFrame(rows)


def multivariate(df, cols, alpha=0.001, seed=0):
    X = df[cols].to_numpy(float)
    ok = ~np.isnan(X).any(axis=1)
    mcd = MinCovDet(random_state=seed).fit(X[ok])
    d2 = np.full(len(df), np.nan)
    d2[ok] = mcd.mahalanobis(X[ok])
    cut = chi2.ppf(1 - alpha, df=len(cols))
    hit = d2 > cut
    rows = []
    for idx, v in zip(df.index[hit], d2[hit]):
        # WHICH COLUMN CONTRIBUTES MOST: the largest standardised
        # deviation from the robust centre. Not a full decomposition,
        # but enough to say "this row is odd mainly because of X".
        dev = np.abs((df.loc[idx, cols].to_numpy(float) - mcd.location_)
                     / np.sqrt(np.diag(mcd.covariance_)))
        rows.append({"row": idx, "detector": "multivariate", "column": cols[int(dev.argmax())],
                     "group": None, "value": None, "score": round(float(v), 1),
                     "compared_to": f"chi2({len(cols)}) cutoff {cut:.1f} at alpha={alpha}"})
    return pd.DataFrame(rows)


def temporal_by_group(df, col, group, ts, window=24, threshold=4.0):
    rows = []
    d = df.sort_values([group, ts])
    for g, sub in d.groupby(group):
        s = sub[col].astype(float)
        # CAUSAL: the baseline excludes the current row (see 4.3).
        level = s.rolling(window, min_periods=8, closed="left").median()
        spread = (s - level).abs().rolling(window, min_periods=8, closed="left").median() * 1.4826
        spread = spread.clip(lower=1e-9)
        z = (s - level) / spread
        hit = z.abs() > threshold
        for idx, zi, v, lv in zip(sub.index[hit], z[hit], s[hit], level[hit]):
            rows.append({"row": idx, "detector": "temporal", "column": col,
                         "group": g, "value": float(v), "score": round(float(zi), 2),
                         "compared_to": f"prior-{window} median {lv:.1f}"})
    return pd.DataFrame(rows)


def outlier_report(df, numeric, group, ts):
    parts = [univariate_by_group(df, numeric, group),
             multivariate(df, numeric),
             temporal_by_group(df, numeric[0], group, ts)]
    rep = pd.concat([p for p in parts if len(p)], ignore_index=True)
    if len(rep):
        rep = rep.sort_values(["row", "detector"]).reset_index(drop=True)
    return rep


# =========================================================================
# GENERATE, WITH THREE PLANTS
# =========================================================================

def generate(seed=0):
    rng = np.random.default_rng(seed)
    n_per = 400
    frames = []
    for g, (mu_a, mu_b) in {"small": (100, 20), "large": (1000, 200)}.items():
        a = rng.normal(mu_a, mu_a * 0.1, n_per)
        b = 0.2 * a + rng.normal(0, mu_b * 0.05, n_per)         # b correlates with a
        frames.append(pd.DataFrame({
            "group": g, "ts": pd.date_range("2026-01-01", periods=n_per, freq="h"),
            "a": a, "b": b}))
    df = pd.concat(frames, ignore_index=True)

    # PLANT 1 -- univariate: a small-store value 20 MADs high.
    # (Pooled, 300 sits between the groups and looks normal.)
    df.loc[50, "a"] = 300
    # PLANT 2 -- multivariate: large-store a at its 90th pct, b at its
    # 10th pct. Both inside range; the pair is off the correlation.
    lg = df["group"] == "large"
    df.loc[500, "a"] = df.loc[lg, "a"].quantile(0.9)
    df.loc[500, "b"] = df.loc[lg, "b"].quantile(0.1) - 3 * df.loc[lg, "b"].std()
    # PLANT 3 -- temporal: a large-store value at its group median,
    # placed where the prior 24 hours were running 5 SDs LOW.
    df.loc[700:723, "a"] = df.loc[lg, "a"].median() - 5 * df.loc[lg, "a"].std()
    df.loc[724, "a"] = df.loc[lg, "a"].median()
    return df


# =========================================================================
# TESTS
# =========================================================================

def test_univariate_plant_found_by_univariate_only():
    df = generate()
    rep = outlier_report(df, ["a", "b"], "group", "ts")
    hits = rep[rep["row"] == 50]
    assert "univariate" in hits["detector"].values
    assert hits[hits["detector"] == "univariate"]["score"].abs().iloc[0] > 10


def test_univariate_plant_invisible_when_pooled():
    df = generate()
    z, _, _ = robust_z(df["a"])
    assert abs(z[50]) < 3.5                        # 300 is between the groups


def test_multivariate_plant_found_by_multivariate_only():
    df = generate()
    rep = outlier_report(df, ["a", "b"], "group", "ts")
    hits = rep[rep["row"] == 500]
    assert "multivariate" in hits["detector"].values
    assert "univariate" not in hits["detector"].values
    # and it IS inside both marginal ranges within its group
    lg = df[df["group"] == "large"]
    for c in ("a", "b"):
        z, _, _ = robust_z(lg[c])
        assert abs(z[lg.index.get_loc(500)]) < 3.5


def test_temporal_plant_found_by_temporal_only():
    df = generate()
    rep = outlier_report(df, ["a", "b"], "group", "ts")
    hits = rep[rep["row"] == 724]
    assert "temporal" in hits["detector"].values
    assert "univariate" not in hits["detector"].values   # it IS the group median


def test_report_names_the_evidence():
    df = generate()
    rep = outlier_report(df, ["a", "b"], "group", "ts")
    r = rep[(rep["row"] == 50) & (rep["detector"] == "univariate")].iloc[0]
    assert "group median" in r["compared_to"]
    assert r["group"] == "small"


def test_zscore_is_masked_robust_is_not():
    rng = np.random.default_rng(1)
    x = np.append(rng.normal(50, 5, 970), [500] * 30)
    z = (x - x.mean()) / x.std()
    assert (np.abs(z) > 3).sum() == 0              # masked
    rz, _, _ = robust_z(x)
    assert (np.abs(rz) > 3.5).sum() >= 30          # found


def test_temporal_baseline_is_causal():
    """Corrupting the future must not change a flag in the past."""
    df = generate()
    a = temporal_by_group(df, "a", "group", "ts")
    df2 = df.copy(); df2.loc[750:, "a"] *= 100
    b = temporal_by_group(df2, "a", "group", "ts")
    past_a = a[a["row"] < 740].sort_values("row").reset_index(drop=True)
    past_b = b[b["row"] < 740].sort_values("row").reset_index(drop=True)
    pd.testing.assert_frame_equal(past_a, past_b)


def test_clean_data_has_few_flags():
    df = generate()
    df.loc[50, "a"] = df.loc[df["group"] == "small", "a"].median()
    df.loc[500, ["a", "b"]] = df.loc[df["group"] == "large", ["a", "b"]].median().values
    df.loc[700:724, "a"] = df.loc[df["group"] == "large", "a"].median()
    rep = outlier_report(df, ["a", "b"], "group", "ts")
    assert len(rep) < 0.02 * len(df)`,
        notes: [
          { t: "p", text: "**Each plant is found by exactly its own detector**, and the tests assert the misses as well as the hits. The multivariate plant is inside both marginal ranges within its group — the univariate check passes it — and the temporal plant *is* the group median, so nothing but the residual from the recent level sees it." },
          { t: "callout", kind: "insight", title: "Pooled, 300 is normal; per group, it is 20 MADs out", body: [
            { t: "p", text: "The univariate plant sits between the small-store and large-store distributions. **The pooled robust z is under 3.5 — the value is unremarkable for the dataset — and the per-group z is over 10.** \"Far from the rest\" depends on which rest, and the group column is what says which." }
          ]},
          { t: "p", text: "**The report names the evidence, not just the flag.** \"group median 100.3, MAD 9.8\" or \"prior-24 median 812\" is what the person deciding what to do with the row needs; a score alone is a number with no denominator." },
          { t: "p", text: "**The temporal baseline is causal, and the test proves it** by multiplying every value after row 750 by a hundred and asserting the flags before row 740 are unchanged. A rolling window that included the current row — or a centred one — would fail this." },
          { t: "p", text: "**Masking is demonstrated, not asserted.** Thirty values at ten times the typical level, and the z-score flags zero of them; the robust z flags all thirty. That is the whole argument against the mean-based rule in one test." },
          { t: "p", text: "**The multivariate detector reports which column contributed most** — the largest standardised deviation from the robust centre. It is not a full decomposition, but \"this row is odd mainly because of b\" is what makes a Mahalanobis flag actionable." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A column has 30 values at 500 among 970 near 50. The z-score with threshold 3 flags none. Why?",
          options: [
            "The threshold is too high",
            "The 30 outliers inflated the standard deviation from 5 to 76, so each one's z-score is 2.4 — they masked each other",
            "z-scores only work on normal data",
            "The mean is unaffected by outliers"
          ],
          answer: 1,
          why: "The mean and σ are computed from data that includes the outliers, and σ has breakdown point zero. The median and MAD have breakdown point 50%: they do not move for 3% contamination, and the robust z of 500 is around 60."
        }
      ]
    }
  ],

  takeaways: [
    "**An outlier is far from where the rest says it should be — not a synonym for error.** It can be a mistake, a rare true event, or the most important row.",
    "**The z-score uses the outlier to measure the outlier.** Several large values inflate σ until none of them exceeds three — masking.",
    "**Breakdown point**: the mean's is 0, the IQR's is 25%, the median's and MAD's are 50%. Use an estimator whose breakdown exceeds the contamination you might have.",
    "**Robust z — `(x − median) / (1.4826 · MAD)` — is the univariate default.** The 1.4826 puts it on the same scale as σ.",
    "**Thresholds are conventions**: `|z| > 3` flags 0.27% of a normal by chance — 2,700 ordinary rows in a million.",
    "**Skew breaks every symmetric rule**: a log-normal column has a long tail that reads as outliers. Detect on the log scale, or per side.",
    "**A row can be normal on every column and impossible as a combination** — no univariate rule sees it.",
    "**Mahalanobis distance measures distance from the centre along the data's own axes**, and D² is chi-square with p degrees of freedom for normal data.",
    "**Use the MCD covariance**, or the outliers tilt the ellipse toward themselves — masking in more dimensions.",
    "**Isolation Forest assumes nothing about shape; `contamination=` is a guess that sets the threshold directly** — use the scores and choose the cutoff by looking.",
    "**\"Far from the rest\" depends on which rest**: a value normal for the dataset can be 20 MADs out for its group, its trend, or its hour of day.",
    "**Model the expectation, detect on the residual** — group level, trend, season, recent past, or a fitted model. That is the general form.",
    "**A report row needs the detector, the score and the comparison** — a score alone is a number with no denominator."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Height 185 cm (97th percentile) and weight 48 kg (3rd percentile) in one row. What finds it?",
        options: [
          "A z-score on each column",
          "Mahalanobis distance — it measures distance from the centre along the correlated axes, and this pair is far off the height–weight relationship while inside both marginal ranges",
          "The IQR rule",
          "Nothing; both values are within range"
        ],
        answer: 1,
        why: "Every univariate check passes it because each column is examined alone. The joint distribution is an ellipse along the correlation; this point is 6–7 'standard deviations' from it in the direction the ellipse is narrow. Six such rows in the example pass every per-column check and fail the joint one."
      },
      {
        stem: "A log-normal column produces 50 IQR-rule outliers, all in the upper tail. What are they?",
        options: [
          "Data entry errors",
          "The tail of a skewed distribution — a symmetric rule reads a long right tail as outliers; detect on the log scale or per side",
          "Duplicates",
          "Masked values"
        ],
        answer: 1,
        why: "The IQR fences are symmetric around the quartiles, and a skewed column is not. Taking the log first turns a log-normal into a normal, after which the same rule flags the genuine extremes — about five in the example — rather than the whole tail."
      },
      {
        stem: "A sensor value of 100 is flagged as an outlier on day 200 but was normal on day 1. What kind of detection is this?",
        options: [
          "Univariate",
          "Residual-from-trend — the series rose 0.5 per day, so on day 200 the expectation is 200 and a reading of 100 is 100 below it",
          "Multivariate",
          "A false positive"
        ],
        answer: 1,
        why: "The value is in the column's range; it is the residual from the expected level that is extreme. Detrend, or use a causal rolling baseline, and detect on the residual. The general form is 'model the expectation, detect on what the model gets wrong'."
      },
      {
        stem: "Why is `contamination=0.01` in Isolation Forest a risk?",
        options: [
          "It is too high",
          "It sets the threshold directly — the model flags exactly 1% regardless of what the data contains; use the scores and choose the cutoff by inspection",
          "It only works with scaled data",
          "It requires a normal distribution"
        ],
        answer: 1,
        why: "The parameter is a guess at the outlier fraction, and predict() honours it literally. On clean data it flags 1% of ordinary rows; on data with 5% contamination it flags a fifth of the outliers. `score_samples` gives the anomaly score; the threshold should come from looking at its distribution."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why not use z-scores to find outliers?",
        strong: "Because the mean and standard deviation are computed from data that includes the outliers. One large value drags the mean toward itself and inflates σ; several inflate σ until none of them scores above three — they mask each other. The median and MAD have a 50% breakdown point and do not move. The robust z, `(x − median) / (1.4826 · MAD)`, is on the same scale and is the default; the plain z-score is safe only when contamination is known to be light, which is when you least need a detector.",
        answer: [
          { t: "p", text: "Naming masking and the breakdown point turns a preference into a mechanism." }
        ]
      },
      {
        level: "advanced",
        q: "How would you find a row that is normal on every column and wrong overall?",
        strong: "With a joint measure. Mahalanobis distance is distance from the centre along the data's own correlated axes — a tall, very light person is inside both marginal ranges and far from the height–weight ellipse. D² is chi-square with p degrees of freedom, so the threshold has a probability. Use the MCD covariance so the outliers do not tilt the ellipse. If the data is several clusters or a curve, Mahalanobis assumes a shape it does not have; Isolation Forest assumes nothing and handles that.",
        answer: [
          { t: "p", text: "The robust covariance point shows you know masking applies in more dimensions too; naming when Mahalanobis is wrong shows judgement." }
        ]
      },
      {
        level: "advanced",
        q: "A value is flagged as an outlier in one context and not another. How is that possible?",
        strong: "Because 'far from the rest' depends on which rest. A small store selling 400 is normal for the dataset — large stores sell 1,000 — and 20 MADs out for small stores. A reading of 100 is normal for a series that started at 100 and 100 below expectation on day 200 of a rising trend. The general form is: model the expectation — group, trend, season, recent past, a fitted model — and detect on the residual. The report should say which comparison fired and what the value was compared against.",
        answer: [
          { t: "p", text: "\"Model the expectation, detect on the residual\" is the unifying principle; the two examples make it concrete." }
        ]
      }
    ]
  }
});

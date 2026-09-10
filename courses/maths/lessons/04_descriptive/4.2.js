/* ============================================================================
   LESSON 4.2 — Dispersion and the Denominator Question
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "Everyone knows the sample variance divides by `n − 1`. Far fewer can say why, and the reason is worth having: **the sample mean sits closer to your data than the true mean does**, so squared deviations measured from it are systematically too small. The `n − 1` corrects exactly that.",

  objectives: [
    "Derive the `n − 1` denominator rather than accepting it",
    "Say when `n` is the right divisor after all",
    "Choose between standard deviation, MAD and IQR",
    "Use the coefficient of variation to compare across scales",
    "Recognise dispersion measures that break under heavy tails"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Why `n − 1`, demonstrated", id: "bessel" },

    { t: "p", text: "**The sample variance divides by `n − 1` because the sample mean sits closer to your data than the true mean does.** Squared deviations measured from it are therefore systematically too small — by exactly a factor of `(n−1)/n`, which is precisely what the correction cancels." },

    { t: "dl", items: [
      ["Variance", "The mean squared deviation from the centre. In the squared units of the data."],
      ["Bessel's correction", "Dividing by `n − 1` rather than `n`, which makes the estimator unbiased."],
      ["Degrees of freedom", "The count of independent pieces of information. Estimating the mean forces the deviations to sum to zero, so only `n − 1` are free."],
      ["Unbiased", "Correct on average across all possible samples. It is a property of the recipe, not of any single result."],
      ["`ddof`", "The NumPy parameter for the subtraction. `ddof=0` divides by `n`, `ddof=1` by `n − 1` — and the two libraries disagree by default."],
      ["Standard deviation", "`σ = √variance`. Back in the original units, which is why it and not variance belongs in a report."]
    ]},

    { t: "viz",
      title: "The sample mean is closer to your data than the truth is",
      caption: "The sample mean minimises the sum of squared deviations for this sample — no other point can do better. So deviations measured from it undershoot the deviations from the true mean, every time.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Data points with the sample mean sitting nearer to them than the population mean">
  <line x1="70" y1="130" x2="820" y2="130" style="stroke:var(--line)" stroke-width="1.5"/>

  <g style="fill:var(--ink-3)">
    <circle cx="230" cy="130" r="7"/><circle cx="310" cy="130" r="7"/>
    <circle cx="380" cy="130" r="7"/><circle cx="470" cy="130" r="7"/>
    <circle cx="540" cy="130" r="7"/>
  </g>

  <line x1="386" y1="100" x2="386" y2="160" style="stroke:var(--good)" stroke-width="3"/>
  <text x="336" y="90" class="s-label" style="fill:var(--good)">sample mean</text>

  <line x1="600" y1="100" x2="600" y2="160" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="3"/>
  <text x="560" y="90" class="s-label" style="fill:var(--crit)">true mean</text>

  <g style="stroke:var(--good);stroke-width:1.5;stroke-dasharray:3 3">
    <line x1="230" y1="142" x2="386" y2="142"/><line x1="310" y1="150" x2="386" y2="150"/>
    <line x1="386" y1="158" x2="470" y2="158"/><line x1="386" y1="166" x2="540" y2="166"/>
  </g>
  <text x="180" y="196" class="s-sub" style="fill:var(--good)">deviations from the sample mean: smaller, always</text>

  <g style="stroke:var(--crit);stroke-width:1.5;stroke-dasharray:3 3">
    <line x1="230" y1="112" x2="600" y2="112"/><line x1="310" y1="104" x2="600" y2="104"/>
  </g>
  <text x="620" y="196" class="s-sub" style="fill:var(--ink-3)">dividing by n-1 restores</text>
  <text x="620" y="214" class="s-sub" style="fill:var(--ink-3)">what the shortfall removed</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measure the bias rather than being told about it", code: `
import numpy as np
from scipy import stats

# THE CLAIM: dividing by n UNDERESTIMATES the population variance, and
# dividing by n-1 does not. Test it directly.

rng = np.random.default_rng(0)
TRUE_VAR = 4.0                              # sigma = 2
n, trials = 5, 200_000

samples = rng.normal(0, 2, size=(trials, n))

# ddof=0 divides by n; ddof=1 divides by n-1.
biased = samples.var(axis=1, ddof=0).mean()      # 3.199
unbiased = samples.var(axis=1, ddof=1).mean()    # 3.999

biased / TRUE_VAR                                # 0.800 = 4/5 = (n-1)/n
unbiased / TRUE_VAR                              # 1.000
#
# THE BIAS IS EXACTLY (n-1)/n, WHICH IS WHY THE FIX IS EXACTLY n-1.
# It is not an adjustment chosen to work; it cancels the factor
# precisely.

for n in (2, 5, 10, 30, 100):
    s = rng.normal(0, 2, size=(50_000, n))
    print(f"n={n:<5} biased/true = {s.var(axis=1, ddof=0).mean()/4:.4f}"
          f"   expected {(n-1)/n:.4f}")

# n=2     biased/true = 0.5013   expected 0.5000
# n=5     biased/true = 0.7996   expected 0.8000
# n=10    biased/true = 0.9006   expected 0.9000
# n=30    biased/true = 0.9670   expected 0.9667
# n=100   biased/true = 0.9899   expected 0.9900
#
# AT n=2 THE BIASED ESTIMATOR IS HALF THE TRUTH. At n=100 the
# difference is 1%, which is why nobody notices in large samples and
# why it matters enormously in small ones.

# WHERE THE MISSING DEGREE OF FREEDOM WENT: once the mean is estimated
# from the data, the deviations are CONSTRAINED to sum to zero.
x = rng.normal(0, 2, 5)
(x - x.mean()).sum()                             # ~0, exactly by
                                                 # construction
#
# So only 4 of the 5 deviations are free -- the fifth is determined by
# the other four. There are n-1 independent pieces of information about
# spread, not n, and the denominator counts information rather than
# observations.
#
# THAT IS THE GENERAL RULE, and it is why regression with p predictors
# divides by n-p-1: each estimated parameter consumes one degree of
# freedom.
`,
      hl: [17, 20, 41, 50],
      caption: "**The bias is exactly `(n−1)/n`, so the fix is exactly `n − 1`.** It is not a fudge that happens to help — it cancels the factor precisely, and the same counting gives regression its `n − p − 1`."
    },

    { t: "callout", kind: "trap", title: "The unbiased variance does not give an unbiased standard deviation", body: [
      { t: "p", text: "`ddof=1` makes the *variance* unbiased. Taking a square root is a non-linear operation, and by Jensen's inequality (lesson 2.4) `E[√X] < √E[X]` — so the sample standard deviation is biased low regardless of the denominator." },
      { t: "code", lang: "python", numbered: false, title: "and the bias is largest where it hurts most", code: `
TRUE_SD = 2.0

for n in (2, 3, 5, 10, 30):
    s = rng.normal(0, TRUE_SD, size=(200_000, n))
    est = s.std(axis=1, ddof=1).mean()
    print(f"n={n:<4} E[s] = {est:.4f}   bias {(est/TRUE_SD - 1)*100:+.1f}%")

# n=2    E[s] = 1.5960   bias -20.2%
# n=3    E[s] = 1.7729   bias -11.4%
# n=5    E[s] = 1.8804   bias  -6.0%
# n=10   E[s] = 1.9424   bias  -2.9%
# n=30   E[s] = 1.9829   bias  -0.9%

# THE CORRECTION FACTOR c4 makes it unbiased for NORMAL data:
from scipy.special import gamma
def c4(n):
    return np.sqrt(2/(n-1)) * gamma(n/2) / gamma((n-1)/2)

c4(5)                                # 0.9400
1.8804 / c4(5)                       # 2.0005 -- corrected

# WHEN IT MATTERS: control charts and process-capability indices built
# on small subgroups (n = 4 or 5 is standard) understate variability by
# 5-6% without this. That makes a process look more capable than it is,
# and it is why SPC software applies c4 by default while ad-hoc
# spreadsheets do not.
#
# WHEN IT DOES NOT: n above about 30, where the bias is under 1% and
# smaller than the sampling error you already have.`},
      { t: "p", text: "**Small-subgroup control charts understate variability by 5–6% without the `c₄` correction**, which makes a process look more capable than it is. SPC software applies it by default; spreadsheets rebuilt by hand do not." }
    ]},

    { t: "h2", n: "02", text: "When `n` is the right divisor", id: "when-n" },

    { t: "p", text: "`n − 1` is not universally right. **When nothing is being estimated — you have the whole population, or the true mean is known independently — dividing by `n` is correct**, because no degree of freedom was consumed." },

    { t: "dl", items: [
      ["Population variance", "Divide by `n`. You are describing a complete set, not inferring about a larger one."],
      ["Sample variance", "Divide by `n − 1`. You are estimating a population parameter from a subset."],
      ["Maximum likelihood estimate", "Divides by `n` and is biased — MLE optimises probability of the data, not unbiasedness."],
      ["Regression residuals", "Divide by `n − p − 1`, since each fitted parameter consumes a degree of freedom."],
      ["Feature scaling", "`StandardScaler` uses `ddof=0`, because it describes the training set rather than inferring about a population."]
    ]},

    { t: "table",
      head: ["Situation", "Divisor", "Why"],
      rows: [
        ["Estimating a population variance from a sample", "`n − 1`", "The mean was estimated from the same data"],
        ["**You have the whole population**", "**`n`**", "Nothing is being estimated — it is a description"],
        ["**The true mean is known independently**", "**`n`**", "No degree of freedom was consumed"],
        ["Maximum likelihood estimate for a normal", "`n`", "MLE is biased here, and knowingly so"],
        ["Regression residuals, `p` predictors", "`n − p − 1`", "Each fitted parameter costs one"],
        ["Numpy default (`np.var`)", "**`n`**", "**Differs from pandas, which defaults to `n − 1`**"]
      ],
      caption: "**`np.var` and `pandas.Series.var` disagree by default.** NumPy uses `ddof=0`, pandas uses `ddof=1` — a silent discrepancy that has produced more than one irreproducible result."
    },

    { t: "code", lang: "python", title: "the default mismatch, and how to not be caught by it", code: `
import pandas as pd

x = np.array([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])

np.var(x)                            # 4.0   -- ddof=0
pd.Series(x).var()                   # 4.571 -- ddof=1
np.var(x, ddof=1)                    # 4.571 -- now they agree
#
# A 14% DIFFERENCE AT n=8, FROM THE LIBRARY YOU HAPPENED TO USE. Move
# a calculation from pandas to numpy during a refactor and the number
# changes with no error and no warning.

# THE HABIT THAT AVOIDS IT: state ddof explicitly, always. It costs
# seven characters and it documents which question you are answering.
np.std(x, ddof=1)                    # sample -- estimating a population
np.std(x, ddof=0)                    # population -- describing this set

# WHEN ddof=0 IS GENUINELY RIGHT:
#
#   - "What was the spread of last quarter's revenue across our twelve
#      regions?" You have all twelve. Nothing is being inferred.
#
#   - Feature standardisation. StandardScaler uses ddof=0 because it
#     is describing the training set, not estimating a population --
#     and consistency between fit and transform matters more than
#     unbiasedness.
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler().fit(x.reshape(-1, 1))
scaler.scale_[0], np.std(x, ddof=0)  # 2.0, 2.0 -- ddof=0 confirmed

#   - Batch normalisation, for the same reason.
#
# THE ASYMMETRY WORTH REMEMBERING: at n >= 30 the choice changes the
# answer by under 2% and rarely matters. Below n = 10 it changes it by
# more than 10% and usually does.
for n in (5, 10, 30, 100):
    print(f"n={n:<5} ratio (n-1)/n = {(n-1)/n:.3f}  "
          f"-> sd differs by {100*(1 - np.sqrt((n-1)/n)):.1f}%")
`,
      hl: [7, 13, 30, 38],
      caption: "**State `ddof` explicitly, every time.** Seven characters that document which question you are answering and survive a refactor between libraries."
    },

    { t: "h2", n: "03", text: "Robust dispersion", id: "robust" },

    { t: "p", text: "The standard deviation has the same weakness as the mean — **one bad value can multiply it many times over**, and it is exactly the value you were trying to detect that does the damage. Robust measures of spread avoid that circularity." },

    { t: "dl", items: [
      ["IQR", "`Q3 − Q1`, the range of the middle half. Breakdown point 25%."],
      ["MAD", "Median absolute deviation: the median of `|xᵢ − median|`. Breakdown point 50%, the maximum possible."],
      ["The 1.4826 factor", "Scales the MAD so it estimates `σ` for normal data, making it a drop-in replacement on the same scale."],
      ["Robust z-score", "`(x − median)/MAD`. Uses a scale the outliers cannot inflate, unlike the classic z-score which they can."],
      ["Masking", "An outlier inflating the very scale used to judge it, so it appears less extreme than it is. The reason sd-based detection fails when there is something to detect."],
      ["Range", "Maximum minus minimum. The least robust measure of spread there is — its breakdown point is `1/n` at both ends — and it grows with sample size even when nothing changes."]
    ]},

    { t: "code", lang: "python", title: "three measures, three breakdown points", code: `
clean = rng.normal(100, 15, 1000)
dirty = np.append(clean, [10_000])          # one bad reading in 1001

def dispersions(x):
    med = np.median(x)
    return {
        "sd": float(np.std(x, ddof=1)),
        "iqr": float(np.percentile(x, 75) - np.percentile(x, 25)),
        # MAD, scaled so it estimates sigma for normal data.
        "mad": float(1.4826 * np.median(np.abs(x - med))),
    }

dispersions(clean)   # {'sd': 15.06, 'iqr': 20.13, 'mad': 14.98}
dispersions(dirty)   # {'sd': 313.5, 'iqr': 20.15, 'mad': 14.99}
#
# ONE BAD READING IN A THOUSAND MULTIPLIES THE STANDARD DEVIATION BY
# TWENTY-ONE. The IQR and MAD do not move at all.

# WHY 1.4826? For normal data the median absolute deviation is
# 0.6745 sigma, so dividing by that -- multiplying by 1.4826 --
# rescales MAD to estimate sigma directly, making it a drop-in
# replacement.
1 / stats.norm.ppf(0.75)                    # 1.4826
#
# WITHOUT THE FACTOR the MAD is on a different scale from sd and
# cannot be compared with it, which is the usual reason people find it
# confusing.

# BREAKDOWN POINTS:
#   sd    1/n     one value
#   IQR   25%     a quarter of the data
#   MAD   50%     half -- the maximum possible

# THE COST, on clean normal data: the MAD needs about 2.2x the sample
# to match the standard deviation's precision.
for n in (20, 100):
    s = rng.normal(0, 1, (20_000, n))
    sd_var = s.std(axis=1, ddof=1).var()
    mad_var = (1.4826*np.median(np.abs(s - np.median(s, axis=1, keepdims=True)),
                                axis=1)).var()
    print(f"n={n:<5} relative efficiency {sd_var/mad_var:.2f}")
# n=20    relative efficiency 0.43
# n=100   relative efficiency 0.37
#
# So MAD is roughly 37% as efficient. THAT TRADE IS USUALLY WORTH IT
# for a monitoring metric, because a single spike must not silently
# widen your alert thresholds -- which is exactly what an sd-based
# threshold does, masking the very anomaly it was meant to catch.

# THE PRACTICAL VERSION: a robust z-score for outlier detection.
def robust_z(x):
    """Median and MAD instead of mean and sd, so the outliers being
    detected do not inflate the scale used to detect them."""
    x = np.asarray(x, dtype=float)
    med = np.median(x)
    mad = 1.4826 * np.median(np.abs(x - med))
    if mad == 0:                        # >50% of values identical
        return np.zeros_like(x)
    return (x - med) / mad

np.abs((dirty - dirty.mean()) / dirty.std(ddof=1)).max()   # 31.6
np.abs(robust_z(dirty)).max()                              # 660.5
#
# THE CLASSIC z-SCORE FINDS THE OUTLIER LESS EXTREME, because the
# outlier itself inflated the standard deviation. That masking effect
# is why sd-based outlier detection fails exactly when there is
# something to detect.
`,
      hl: [16, 21, 43, 60],
      caption: "**An sd-based outlier rule is masked by its own outliers.** The bad value inflates the scale used to judge it, so the classic z-score reads 31.6 where the robust one reads 660."
    },

    { t: "h2", n: "04", text: "Comparing across scales", id: "cv" },

    { t: "p", text: "A standard deviation cannot be compared across quantities with different units or magnitudes. **The coefficient of variation divides the spread by the mean**, producing a dimensionless figure — but only where the quantity has a meaningful zero." },

    { t: "dl", items: [
      ["Coefficient of variation", "`CV = σ/μ`. Relative spread, comparable across quantities."],
      ["Ratio scale", "A scale with a true zero, where doubling the value means twice as much. Required for the CV to mean anything."],
      ["Interval scale", "A scale with an arbitrary zero, such as Celsius. The CV changes with the unit, so it is an artefact rather than a measurement."],
      ["Robust CV", "`IQR / median`. The same idea, immune to outliers and defined wherever the median is non-zero."]
    ]},

    { t: "code", lang: "python", title: "the coefficient of variation, and where it fails", code: `
# STANDARD DEVIATION CANNOT BE COMPARED ACROSS QUANTITIES with
# different units or magnitudes. The COEFFICIENT OF VARIATION divides
# it out:
#
#     CV = sigma / mu       (dimensionless)

def cv(x, ddof=1):
    x = np.asarray(x, dtype=float)
    m = x.mean()
    if m == 0:
        raise ValueError("CV is undefined for a zero mean")
    return float(np.std(x, ddof=ddof) / m)

latency = rng.normal(200, 30, 1000)          # ms
throughput = rng.normal(5000, 400, 1000)     # req/s

np.std(latency, ddof=1)                      # 29.7  ms
np.std(throughput, ddof=1)                   # 401.0 req/s
#
# 401 > 29.7, but that comparison is meaningless -- different units.

cv(latency)                                  # 0.148
cv(throughput)                               # 0.080
#
# LATENCY IS NEARLY TWICE AS VARIABLE, relative to its own level. That
# is a comparison worth making, and it is the one the raw standard
# deviations pointed the wrong way on.

# WHERE CV BREAKS, and each failure is common:
#
# 1. A MEAN NEAR ZERO. CV explodes and means nothing.
centred = rng.normal(0.01, 1.0, 1000)
cv(centred)                                  # ~86 -- garbage
#
# 2. VALUES THAT CAN BE NEGATIVE. Profit margins, temperature in
#    Celsius, returns. The ratio has no interpretation because the
#    mean's sign is arbitrary.
#
# 3. AN INTERVAL SCALE RATHER THAN A RATIO SCALE. Temperature is the
#    classic case: the CV of the same temperatures in Celsius and in
#    Kelvin differ, because Celsius has an arbitrary zero.
c = np.array([20.0, 22.0, 25.0, 21.0])
cv(c), cv(c + 273.15)                        # 0.096, 0.0074
#
# THIRTEEN TIMES DIFFERENT FOR THE SAME PHYSICAL DATA. CV requires a
# meaningful zero, and if the quantity has no true zero, the number is
# an artefact of the unit.

# THE ROBUST ALTERNATIVE, when the data is skewed or contaminated:
def robust_cv(x):
    """IQR over median. Immune to outliers, and defined wherever the
    median is non-zero."""
    x = np.asarray(x, dtype=float)
    med = np.median(x)
    if med == 0:
        raise ValueError("undefined for a zero median")
    return float((np.percentile(x, 75) - np.percentile(x, 25)) / med)

heavy = np.exp(rng.normal(3, 1, 5000))
cv(heavy), robust_cv(heavy)                  # 1.33, 1.54
cv(np.append(heavy, 1e6))                    # 14.1 -- one value ruins it
robust_cv(np.append(heavy, 1e6))             # 1.54 -- unmoved
`,
      hl: [22, 30, 41, 46],
      caption: "**The CV of the same temperatures differs 13× between Celsius and Kelvin.** It needs a meaningful zero — without one, the number is an artefact of the unit you happened to choose."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Fix an alerting threshold that stops firing",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A service alerts when error rate exceeds `mean + 3σ`, with both computed over a rolling 24-hour window. During a slow degradation the alert fired once, then went quiet for six hours while the error rate kept climbing." },
        { t: "code", lang: "python", numbered: true, title: "alerting.py", code: `import numpy as np

class Alerter:
    def __init__(self, window=1440):      # minutes in a day
        self.history = []
        self.window = window

    def check(self, error_rate):
        self.history.append(error_rate)
        self.history = self.history[-self.window:]

        if len(self.history) < 60:
            return False

        h = np.array(self.history)
        threshold = h.mean() + 3 * h.std()
        return error_rate > threshold`}
      ],
      requirements: [
        "Explain why the alert went quiet, with a simulation.",
        "Identify every defect, not only the main one.",
        "Give a corrected implementation.",
        "Say what the threshold should be based on instead.",
        "Explain the trade-off your fix introduces.",
        "Include tests, one reproducing the original failure."
      ],
      hint: "The window contains the degradation it is supposed to detect.",
      solution: {
        lang: "python",
        title: "alerting_fixed.py",
        code: `import numpy as np


# =========================================================================
# WHY IT WENT QUIET -- THE THRESHOLD CHASED THE PROBLEM
# =========================================================================
#
# The window contains the incident. As the error rate climbs, it enters
# the history and raises both the mean AND the standard deviation, so
# the threshold rises with it. Worse, the FIRST alert's own value gets
# absorbed into the baseline, which is why it fires once and then stops.
#
# This is the masking effect from the robust-dispersion section, in an
# operational costume: the outlier inflates the scale used to judge it.

def simulate_original(minutes=600, baseline=0.002, ramp=0.00002):
    """A slow linear degradation, exactly the case that should alert."""
    hist, fired = [], []
    for t in range(minutes):
        rate = baseline + ramp * t
        hist.append(rate)
        h = np.array(hist[-1440:])
        if len(h) >= 60:
            thr = h.mean() + 3 * h.std()
            if rate > thr:
                fired.append(t)
    return fired, hist

fired, hist = simulate_original()
fired[:5], len(fired)            # ([60], 1)
hist[-1] / hist[0]               # 6.99 -- the rate has grown 7x
#
# ONE ALERT, AT THE FIRST MOMENT IT WAS ELIGIBLE, THEN SILENCE while
# the error rate grew sevenfold. The threshold at the end:
h = np.array(hist)
h.mean() + 3*h.std()             # 0.01327 against a rate of 0.01398
#
# It stayed just ahead the whole time. A LINEAR RAMP IS THE WORST CASE
# for this design, because the rising mean and rising sd track it
# almost exactly.


# =========================================================================
# THE OTHER DEFECTS
# =========================================================================
#
# The window is the headline bug, but there are five more:
#
# 2. ddof NOT SPECIFIED. np.std defaults to ddof=0, which understates
#    the spread -- here that makes the alert slightly MORE sensitive,
#    so it hides how bad the main bug is rather than compounding it.
#    Still, it should be stated.
#
# 3. MEAN AND SD ARE NOT ROBUST. A single spike raises the threshold
#    for the next 24 hours, so one transient blinds the alert for a
#    day.
#
# 4. THE CURRENT VALUE IS IN ITS OWN BASELINE. Even with a clean
#    history, including the point under test biases the comparison
#    towards not firing.
#
# 5. NO MINIMUM ABSOLUTE THRESHOLD. On a very quiet service, sd can be
#    near zero and any tiny fluctuation exceeds mean + 3sd -- so the
#    same code alerts constantly when nothing is wrong.
#
# 6. NO HYSTERESIS OR DURATION. A single sample crossing the line
#    fires, which produces flapping around the boundary.
#
# 7. O(n) SLICING EVERY CALL. self.history[-window:] copies the list on
#    every minute; a deque with maxlen is O(1). Minor, but this runs
#    once a minute forever.


# =========================================================================
# THE FIX
# =========================================================================

from collections import deque

class Alerter:
    """Threshold from a LAGGED, ROBUST baseline.

    Three changes matter, in order of importance:

      1. The baseline excludes the recent past, so an ongoing incident
         cannot raise its own threshold.
      2. Median and MAD replace mean and sd, so one spike cannot widen
         the threshold for a day.
      3. An absolute floor stops the alert firing on noise when the
         service is quiet and the scale collapses towards zero.
    """

    def __init__(self, baseline_minutes=1440, lag_minutes=120,
                 k=4.0, floor=0.005, min_history=240, consecutive=3):
        self.k = k
        self.floor = floor
        self.lag = lag_minutes
        self.min_history = min_history
        self.consecutive = consecutive
        self.history = deque(maxlen=baseline_minutes + lag_minutes)
        self.breaches = 0

    def _baseline(self):
        """Everything except the most recent "lag" minutes. The gap is
        what keeps a developing incident out of its own baseline."""
        h = np.fromiter(self.history, dtype=float)
        return h[:-self.lag] if len(h) > self.lag else np.array([])

    def threshold(self):
        base = self._baseline()
        if len(base) < self.min_history:
            return None                      # not enough clean history

        med = float(np.median(base))
        mad = 1.4826 * float(np.median(np.abs(base - med)))
        if mad == 0.0:                       # a perfectly flat service
            mad = max(med * 0.1, 1e-9)
        return max(med + self.k * mad, self.floor)

    def check(self, error_rate):
        thr = self.threshold()               # computed BEFORE appending
        self.history.append(float(error_rate))

        if thr is None:
            return False

        if error_rate > thr:
            self.breaches += 1
        else:
            self.breaches = 0

        return self.breaches >= self.consecutive


def simulate_fixed(minutes=600, baseline=0.002, ramp=0.00002, warmup=1560):
    a = Alerter()
    for _ in range(warmup):                  # quiet history first
        a.check(baseline)
    for t in range(minutes):
        if a.check(baseline + ramp * t):
            return t
    return None

simulate_fixed()                             # 152
#
# IT FIRES AT MINUTE 152, when the rate has reached 0.0050 -- 2.5x the
# baseline -- and stays firing. The original fired once at minute 60
# and then never again.


# =========================================================================
# WHAT THE THRESHOLD SHOULD REALLY BE BASED ON
# =========================================================================
#
# The robust version is a large improvement, but "k MADs above the
# median" is still a STATISTICAL threshold answering "is this unusual".
# The question an alert should answer is "is this bad".
#
# BETTER, IN ORDER OF PREFERENCE:
#
# 1. AN SLO ERROR BUDGET. "Alert when we have burned 10% of the
#    monthly budget in an hour." Tied to what users are promised, not
#    to what is statistically unusual -- and it does not fire during a
#    legitimately quiet period the way a z-score does.
#
# 2. A MULTI-WINDOW BURN RATE. Google's SRE approach: a fast window to
#    catch sharp spikes and a slow one to catch exactly this slow
#    degradation, with different thresholds. The slow window is what
#    the original code was missing.
#
# 3. A FIXED ABSOLUTE THRESHOLD, where one is knowable. "Error rate
#    above 1%" needs no statistics, cannot be gamed by its own history,
#    and is trivially explainable at 3am. Where you can state one,
#    state one.
#
# STATISTICAL THRESHOLDS ARE FOR WHEN YOU GENUINELY DO NOT KNOW WHAT
# "BAD" IS. That is rarer than the number of z-score alerts in
# production suggests.


# =========================================================================
# THE TRADE-OFF THE FIX INTRODUCES
# =========================================================================
#
# 1. SLOWER. Three consecutive breaches plus a 2-hour lag means a
#    sudden total outage takes 3 minutes to alert instead of 1. That is
#    acceptable for a gradual-degradation detector and NOT acceptable
#    as the only alert -- pair it with a fast absolute threshold.
#
# 2. LESS SENSITIVE TO SLOW DRIFT ON A LONG HORIZON. A degradation
#    slower than the 24-hour baseline still walks the median up. The
#    lag buys 2 hours, not a week. Detecting week-scale drift needs a
#    week-scale baseline, or a fixed threshold.
#
# 3. NEEDS 26 HOURS OF HISTORY before it can alert at all. After a
#    deploy that resets state, the service is unmonitored by this rule
#    until it warms up -- which must be covered by the absolute
#    threshold in the meantime.
#
# NONE OF THESE ARE HIDDEN COSTS: they are the reason a real alerting
# stack runs several rules with different time constants rather than
# one clever one.


# =========================================================================
# TESTS
# =========================================================================

def test_original_goes_quiet_during_a_ramp():
    """Reproduces the reported failure."""
    fired, hist = simulate_original()

    assert len(fired) <= 1                       # fires once
    assert hist[-1] > 5 * hist[0]                # while it gets 5x worse


def test_fixed_alerter_catches_the_ramp():
    t = simulate_fixed()

    assert t is not None
    assert t < 300                               # within five hours


def test_fixed_alerter_keeps_firing():
    """The original's real failure was going quiet, not being late."""
    a = Alerter()
    for _ in range(1560):
        a.check(0.002)

    fired = [t for t in range(600) if a.check(0.002 + 0.00002 * t)]
    assert len(fired) > 300                      # sustained, not one-shot


def test_quiet_service_does_not_alert_on_noise():
    """Defect 5: near-zero spread must not make everything an anomaly."""
    rng = np.random.default_rng(0)
    a = Alerter()
    for _ in range(1560):
        a.check(abs(rng.normal(0.0001, 0.00002)))

    fired = sum(a.check(abs(rng.normal(0.0001, 0.00002))) for _ in range(500))
    assert fired == 0


def test_single_spike_does_not_blind_it():
    """Defect 3: one transient must not raise the threshold for a day."""
    a = Alerter()
    for _ in range(1560):
        a.check(0.002)

    a.check(0.5)                                 # one enormous spike
    before = a.threshold()
    for _ in range(200):
        a.check(0.002)

    assert a.threshold() < before * 1.5          # barely moved


def test_current_value_is_not_in_its_own_baseline():
    a = Alerter()
    for _ in range(1560):
        a.check(0.002)

    thr = a.threshold()
    a.check(0.9)                                 # a huge reading
    assert a.threshold() == thr                  # baseline is lagged


def test_needs_clean_history_before_alerting():
    a = Alerter()
    assert a.threshold() is None
    assert a.check(0.99) is False                # refuses to guess`,
        notes: [
          { t: "p", text: "**The window contains the incident it is meant to detect.** As the error rate climbs it raises both the mean and the standard deviation, so the threshold rises with it — and the first alert's own value gets absorbed into the baseline, which is why it fires once and then stops." },
          { t: "p", text: "**A linear ramp is the worst case for this design**, because the rising mean and sd track it almost exactly. In the simulation the threshold stayed just ahead of the rate for six hours while it grew sevenfold." },
          { t: "callout", kind: "insight", title: "Lagging the baseline is the fix that matters", body: [
            { t: "p", text: "Excluding the most recent two hours means a developing incident cannot raise its own threshold. Median and MAD then stop a single spike blinding the alert for a day, and an absolute floor stops it firing on noise when the service is quiet and the scale collapses." },
            { t: "p", text: "The fixed version alerts at minute 152 and keeps alerting. The original alerted once at minute 60 and never again — going quiet was the real failure, not being late." }
          ]},
          { t: "p", text: "**A statistical threshold answers \"is this unusual\"; an alert should answer \"is this bad\".** An SLO error-budget burn rate is tied to what users are promised, and a multi-window burn rate catches both sharp spikes and exactly this slow degradation." },
          { t: "p", text: "**Where a fixed absolute threshold is knowable, use one.** \"Error rate above 1%\" needs no statistics, cannot be gamed by its own history, and is explainable at 3am." },
          { t: "p", text: "**The fix's costs are real and are the reason alerting stacks run several rules**: three minutes instead of one for a total outage, a two-hour rather than a week-scale drift horizon, and 26 hours of warm-up during which an absolute threshold must cover." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A manufacturing team's process-capability index moved from 1.28 to 1.41 after a spreadsheet was rebuilt, with no change to the process. The new figure crossed the customer's contractual threshold of 1.33." },
      { t: "p", text: "**The original applied the `c₄` correction for subgroup size 5; the rebuild did not.** At `n = 5` the sample standard deviation is biased about 6% low, and dividing by a smaller spread inflates the index by the same proportion." },
      { t: "p", text: "**The process was never capable.** A one-line omission in a rebuilt spreadsheet had moved a contractual metric across its threshold, and nobody questioned an improvement." },
      { t: "p", text: "**An unexplained improvement deserves the same scrutiny as an unexplained regression.** Nobody investigates good news, which is what makes this class of error durable." }
    ]}
  ],

  takeaways: [
    "**`n − 1` corrects a bias of exactly `(n−1)/n`** — it cancels the factor precisely rather than being a fudge that helps.",
    "**Deviations from the sample mean are constrained to sum to zero**, so only `n − 1` of them carry independent information.",
    "**The same counting gives regression `n − p − 1`**: each estimated parameter consumes a degree of freedom.",
    "**An unbiased variance does not give an unbiased standard deviation** — the square root is non-linear, so `s` is biased low.",
    "**The `c₄` correction matters at small `n`**: 6% at `n = 5`, which is standard subgroup size for control charts.",
    "**Use `n` when you have the whole population, or when nothing was estimated** — it is a description, not an inference.",
    "**`np.var` and `pandas.var` disagree by default.** State `ddof` explicitly, every time.",
    "**One bad reading in a thousand multiplies the standard deviation by 21** and leaves the IQR and MAD untouched.",
    "**An sd-based outlier rule is masked by its own outliers** — the bad value inflates the scale used to judge it.",
    "**MAD × 1.4826 estimates σ for normal data**, making it a drop-in replacement on the same scale.",
    "**The coefficient of variation needs a meaningful zero** — the same temperatures give CVs 13× apart in Celsius and Kelvin.",
    "**An alert whose baseline includes the incident raises its own threshold**; lag the baseline so it cannot."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the sample variance divide by `n − 1`?",
        options: [
          "To make small samples look more variable",
          "The sample mean minimises squared deviations for that sample, so deviations from it are biased low by exactly `(n−1)/n`",
          "It is a convention with no derivation",
          "To match the degrees of freedom of the t-distribution"
        ],
        answer: 1,
        why: "Deviations from the sample mean sum to exactly zero, so only `n − 1` are free. The denominator counts independent information rather than observations — which is why regression with `p` predictors divides by `n − p − 1`."
      },
      {
        stem: "An alert uses `mean + 3σ` computed over a rolling window that includes the current data. What fails?",
        options: [
          "Nothing — it adapts to changing conditions",
          "A sustained degradation raises its own threshold, so the alert fires once and then goes quiet while things get worse",
          "It will fire too often",
          "The window is too long"
        ],
        answer: 1,
        why: "A linear ramp is the worst case: the rising mean and rising sd track it almost exactly. Lagging the baseline keeps the developing incident out of its own threshold, and robust statistics stop a single spike blinding it for a day."
      },
      {
        stem: "`np.var(x)` gives 4.0 and `pd.Series(x).var()` gives 4.571 on the same data. Which is wrong?",
        options: [
          "NumPy — it should use `n − 1`",
          "Neither — NumPy defaults to `ddof=0` and pandas to `ddof=1`, so state `ddof` explicitly",
          "Pandas — it should use `n`",
          "There must be a dtype difference"
        ],
        answer: 1,
        why: "A 14% difference at `n = 8`, from which library you happened to use. Moving a calculation between them during a refactor changes the number with no error and no warning."
      },
      {
        stem: "The same temperatures give a coefficient of variation of 0.096 in Celsius and 0.0074 in Kelvin. Why?",
        options: [
          "A rounding error",
          "CV needs a meaningful zero — Celsius has an arbitrary one, so the ratio is an artefact of the unit",
          "Kelvin values are larger, so more precise",
          "The standard deviation changes with the unit"
        ],
        answer: 1,
        why: "The standard deviation is identical in both; only the mean changes, and it changes by an arbitrary offset. CV is defined for ratio scales, which rules out temperature in Celsius, profit margins, and anything that can be negative."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why does the sample variance divide by `n − 1`?",
        strong: "Because the sample mean is fitted to the same data, so it sits closer to the observations than the true mean does and squared deviations from it are too small — by exactly `(n−1)/n`. Equivalently, the deviations sum to zero, so only `n − 1` are free.",
        answer: [
          { t: "p", text: "Giving both the bias argument and the degrees-of-freedom argument shows they are the same fact seen two ways." },
          { t: "p", text: "Noting that this generalises to `n − p − 1` in regression is the detail that shows understanding rather than recall." },
          { t: "p", text: "Adding that `s` is *still* biased even with `n − 1`, by Jensen, is a strong finish." }
        ]
      },
      {
        level: "core",
        q: "When would you use MAD instead of standard deviation?",
        strong: "Whenever a single bad value must not change the answer — monitoring thresholds especially. One outlier in a thousand can multiply the sd by twenty, and an sd-based outlier rule is masked by its own outliers. MAD costs about 60% efficiency on clean normal data.",
        answer: [
          { t: "p", text: "The masking argument is the strongest case, because it means the metric fails exactly when there is something to detect." },
          { t: "p", text: "Knowing the 1.4826 factor and why it exists shows you would actually deploy it rather than cite it." }
        ]
      },
      {
        level: "advanced",
        q: "How would you set an alerting threshold for an error-rate metric?",
        strong: "Preferably not statistically at all — an SLO error-budget burn rate answers \"is this bad\" rather than \"is this unusual\". If a statistical threshold is needed, lag the baseline so an incident cannot raise its own threshold, use median and MAD, and add an absolute floor.",
        answer: [
          { t: "p", text: "Preferring an SLO-based rule over a z-score shows you know what an alert is for, which is the point of the question." },
          { t: "p", text: "The lagged-baseline point is the specific failure mode most rolling-window alerts have, and naming it is convincing." },
          { t: "p", text: "Mentioning that this needs pairing with a fast absolute threshold shows you would ship a working system, not one clever rule." }
        ]
      }
    ]
  }
});

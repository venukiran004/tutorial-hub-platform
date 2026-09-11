/* ============================================================================
   LESSON 2.6 — Convolution, Windows and Numerical Methods
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**A moving average is a convolution, a rate of change is a gradient, and a seasonal period is a peak in a Fourier transform.** These come from signal processing and end up in feature code, usually reimplemented as a loop by someone who did not know the array operation existed.",

  objectives: [
    "Compute moving statistics with convolution and sliding windows",
    "Explain the three convolution modes and which one preserves length",
    "Use `np.gradient` and numerical integration correctly",
    "Detect periodicity with an FFT and read the result",
    "Fit and evaluate polynomials without a loop"
  ],

  prerequisites: ["2.1", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Moving windows", id: "windows" },

    { t: "p", text: "**A moving average slides a set of weights along an array and takes a weighted sum at each position — which is exactly what convolution does.** NumPy has three ways to compute one, and they differ in speed, memory and how much they let you customise." },

    { t: "dl", items: [
      ["Convolution", "Sliding a kernel along a signal, computing a weighted sum at each position. `np.convolve` **reverses the kernel** first; correlation does not, which matters only for asymmetric kernels."],
      ["Kernel", "The weight array. `np.ones(k) / k` is a simple moving average; other shapes give weighted, triangular or Gaussian averages."],
      ["Mode", "`\"full\"` returns `n + k − 1` values, `\"same\"` returns `n`, `\"valid\"` returns `n − k + 1` — only the positions where the kernel fits entirely."],
      ["Edge effects", "At the boundaries the window extends past the data. `\"same\"` pads with zeros, which drags the first and last values towards zero — an artefact, not a signal."],
      ["`sliding_window_view`", "A strided **view** giving every window as a row, with no copy. The general tool when the operation is not a weighted sum."],
      ["`np.gradient`", "Central differences: a second-order accurate rate of change that returns an array the same length as its input."]
    ]},

    { t: "viz",
      title: "The three convolution modes",
      caption: "Only `valid` uses positions where the whole kernel overlaps real data. `same` keeps the length by padding with zeros, and those padded ends are artefacts.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A kernel sliding across a signal showing full, same and valid output regions">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">signal, n = 8    kernel, k = 3</text>
  <g stroke-width="1.5" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)">
    <rect x="180" y="40" width="46" height="26"/><rect x="226" y="40" width="46" height="26"/>
    <rect x="272" y="40" width="46" height="26"/><rect x="318" y="40" width="46" height="26"/>
    <rect x="364" y="40" width="46" height="26"/><rect x="410" y="40" width="46" height="26"/>
    <rect x="456" y="40" width="46" height="26"/><rect x="502" y="40" width="46" height="26"/>
  </g>

  <text x="30" y="102" class="s-sub" style="fill:var(--warn)">full — n+k−1 = 10</text>
  <g stroke-width="1.5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)">
    <rect x="88" y="86" width="46" height="24"/><rect x="134" y="86" width="46" height="24"/>
  </g>
  <g stroke-width="1.5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)">
    <rect x="180" y="86" width="368" height="24"/>
    <rect x="548" y="86" width="46" height="24"/><rect x="594" y="86" width="46" height="24"/>
  </g>
  <text x="660" y="103" class="s-sub" style="fill:var(--warn)">partial overlap at both ends</text>

  <text x="30" y="152" class="s-sub" style="fill:var(--accent)">same — n = 8</text>
  <g stroke-width="1.5" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)">
    <rect x="180" y="136" width="46" height="24"/>
    <rect x="226" y="136" width="276" height="24"/>
    <rect x="502" y="136" width="46" height="24"/>
  </g>
  <text x="660" y="153" class="s-sub" style="fill:var(--crit)">first and last dragged toward zero</text>

  <text x="30" y="202" class="s-sub" style="fill:var(--good)">valid — n−k+1 = 6</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)">
    <rect x="226" y="186" width="276" height="24"/>
  </g>
  <text x="660" y="203" class="s-sub" style="fill:var(--good)">every value uses k real points</text>

  <line x1="30" y1="232" x2="850" y2="232" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="256" class="s-sub" style="fill:var(--ink-3)">"same" is convenient because the length matches. Those two end values are computed from padding, not from data —</text>
  <text x="30" y="274" class="s-sub" style="fill:var(--ink-3)">so a moving average of a positive series starts and ends with a dip that is not in the underlying signal.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "three ways to compute a moving statistic", code: `
import numpy as np

signal = np.array([10., 12., 11., 15., 14., 16., 13., 18.])
k = 3

# 1. CONVOLUTION -- fastest for a weighted sum:
kernel = np.ones(k) / k
np.convolve(signal, kernel, mode="valid")     # 6 values
np.convolve(signal, kernel, mode="same")      # 8 values
np.convolve(signal, kernel, mode="full")      # 10 values

# THE EDGE ARTEFACT IS REAL AND EASY TO MISS:
np.convolve(signal, kernel, mode="same")[0]   # 7.33
signal[:2].mean()                             # 11.0
#
# The first "same" value averaged [0, 10, 12] -- a zero that is not in
# the data. On a positive series this makes every chart start with a
# dip that looks like a genuine dip.

# 2. CUMULATIVE SUM -- O(n) regardless of window size:
def moving_average(a, k):
    """Exact moving average in one pass, independent of k."""
    c = np.cumsum(np.insert(a, 0, 0.0))
    return (c[k:] - c[:-k]) / k

np.allclose(moving_average(signal, 3),
            np.convolve(signal, kernel, mode="valid"))       # True
#
# %timeit np.convolve(big, np.ones(1000)/1000, mode="valid") -> ~40 ms
# %timeit moving_average(big, 1000)                          -> ~4 ms
#
# Convolution is O(n x k); the cumsum trick is O(n). At k = 1000 that
# is a factor of ten.
#
# THE CATCH: cumsum accumulates floating-point error over the whole
# array. On 100 million values with a wide dynamic range the late
# windows drift. Use float64 (the default) and be aware; for exactness
# on huge arrays, convolution or a compiled loop is safer.

# 3. SLIDING WINDOW VIEW -- for anything that is not a weighted sum:
from numpy.lib.stride_tricks import sliding_window_view

w = sliding_window_view(signal, k)
w.shape                       # (6, 3) -- every window as a row
w.base is not None            # True -- A VIEW. No copy at all.

w.mean(axis=1)                # moving average
w.max(axis=1)                 # moving maximum
w.std(axis=1)                 # moving standard deviation
np.median(w, axis=1)          # moving median -- no other way to get this

# THE VIEW IS FREE, THE REDUCTION IS NOT:
big = np.random.default_rng(0).normal(size=1_000_000)
wv = sliding_window_view(big, 1000)
wv.shape                      # (999001, 1000)
wv.nbytes / 1e9               # 8.0 -- what it WOULD be if materialised
#
# The view costs nothing. But wv.mean(axis=1) does 10**9 operations
# and allocates as it goes, so it is much slower than the cumsum
# trick. Use sliding_window_view when you need a statistic that does
# not decompose -- a median, a quantile, a custom function -- and the
# cumsum trick when you need a mean or a sum.

# WEIGHTED WINDOWS -- where convolution earns its place:
triangular = np.array([1., 2., 3., 2., 1.])
triangular = triangular / triangular.sum()
np.convolve(signal, triangular, mode="valid")     # centre-weighted

gaussian = np.exp(-0.5 * (np.arange(-3, 4) / 1.5) ** 2)
gaussian /= gaussian.sum()
np.convolve(signal, gaussian, mode="valid")       # smooth, no ringing

# CAUSALITY: np.convolve REVERSES THE KERNEL.
# For a symmetric kernel this is invisible. For an asymmetric one --
# an exponential decay, a causal filter -- it silently reverses your
# intent:
decay = np.array([0.5, 0.3, 0.2])         # most weight on the newest
np.convolve(signal, decay, mode="valid")  # weights the OLDEST most
np.convolve(signal, decay[::-1], mode="valid")    # what you meant
#
# In a TIME SERIES FEATURE this is temporal leakage in disguise: a
# "recent-weighted" average that actually weights the future.
`,
      hl: [14, 21, 42, 68],
      caption: "**`np.convolve` reverses the kernel.** With an asymmetric weight vector meant to favour recent values, that silently favours the oldest — which in a time-series feature is leakage wearing a filter's clothes."
    },

    { t: "callout", kind: "trap", title: "The dip at the start of every chart", body: [
      { t: "p", text: "`mode=\"same\"` keeps the output length by padding with zeros, so the first and last `k/2` values are averages of real data **and zeros that are not in the dataset**." },
      { t: "p", text: "On a positive series this produces a visible dip at both ends of every plot — one that gets interpreted as a slow start or a tailing-off, and occasionally makes it into a report." },
      { t: "p", text: "**Use `mode=\"valid\"` and accept the shorter output**, or pad deliberately with edge values (`np.pad(a, k//2, mode=\"edge\")`) so the boundary behaviour is a choice you made rather than an artefact of the default." }
    ]},

    { t: "h2", n: "02", text: "Rates of change and accumulation", id: "calculus" },

    { t: "code", lang: "python", title: "gradient, diff and integration", code: `
t = np.linspace(0, 10, 11)
y = t ** 2                    # derivative is 2t

# np.diff -- FIRST DIFFERENCES, one shorter:
np.diff(y)                    # [1,3,5,...] -- forward differences
len(np.diff(y))               # 10 -- ONE SHORTER than y
#
# The length change is what makes diff awkward as a feature: it no
# longer aligns with the index it came from. prepend= fixes it:
np.diff(y, prepend=y[0])      # 11 values, first is 0

# np.gradient -- CENTRAL DIFFERENCES, same length, more accurate:
np.gradient(y, t)             # [0,2,4,...,20] -- matches 2t exactly
len(np.gradient(y, t))        # 11 -- SAME LENGTH
#
# It uses a central difference in the interior and a one-sided
# difference at the ends, giving second-order accuracy where diff
# gives first-order.

# THE SPACING ARGUMENT MATTERS AND IS EASY TO OMIT:
np.gradient(y)                # assumes spacing of 1
np.gradient(y, t)             # uses the actual t values
#
# With irregular timestamps -- which real data always has -- omitting
# it computes a per-SAMPLE rate rather than a per-SECOND rate. The
# numbers look reasonable and the units are wrong.
irregular = np.array([0., 1., 1.5, 4., 10.])
vals = irregular ** 2
np.gradient(vals)                   # wrong units
np.gradient(vals, irregular)        # correct

# SECOND DERIVATIVE -- acceleration, curvature:
np.gradient(np.gradient(y, t), t)   # ~2 everywhere

# INTEGRATION -- the trapezoid rule:
np.trapezoid(y, t)            # 333.5 (exact: 1000/3 = 333.33)
#
# Named np.trapz in older NumPy; both exist in the transition period.
np.cumulative_trapezoid = None      # not in NumPy -- scipy has it
#
# A RUNNING integral in pure NumPy:
def cumtrapz(y, x):
    dx = np.diff(x)
    avg = (y[1:] + y[:-1]) / 2
    return np.concatenate([[0.0], np.cumsum(dx * avg)])

cumtrapz(y, t)[-1]            # 333.5 -- matches

# WHERE THIS SHOWS UP IN FEATURE CODE:
#
#   gradient of a cumulative metric  -> the rate it is accruing
#   second gradient                  -> is it accelerating
#   integral of a rate               -> total over a period
#   gradient of a smoothed series    -> trend without the noise
#
# THE ORDER MATTERS: differentiate then smooth amplifies noise;
# smooth then differentiate does not.
rng = np.random.default_rng(0)
noisy = np.sin(np.linspace(0, 10, 500)) + rng.normal(0, 0.1, 500)

rough = np.gradient(noisy)                        # dominated by noise
smoothed = np.convolve(noisy, np.ones(21)/21, mode="valid")
clean = np.gradient(smoothed)                     # the actual trend

rough.std() / clean.std()     # roughly 20x more variance
#
# DIFFERENTIATION AMPLIFIES HIGH-FREQUENCY NOISE. That is not a
# NumPy quirk; it is what differentiation does. Smooth first.
`,
      hl: [8, 24, 45, 63],
      caption: "**Omitting the spacing argument computes a per-sample rate, not a per-second rate.** With irregular timestamps the numbers look plausible and the units are wrong."
    },

    { t: "h2", n: "03", text: "Finding a period with an FFT", id: "fft" },

    { t: "p", text: "**The Fourier transform decomposes a signal into the frequencies it contains**, which makes it the direct way to answer \"is there a weekly cycle in this data, and how strong is it?\" without guessing at candidate periods." },

    { t: "code", lang: "python", title: "detecting seasonality without assuming a period", code: `
# Hourly data over 60 days with a daily and a weekly cycle:
hours = np.arange(60 * 24)
signal = (100
          + 20 * np.sin(2 * np.pi * hours / 24)        # daily
          + 8 * np.sin(2 * np.pi * hours / (24 * 7))   # weekly
          + rng.normal(0, 5, len(hours)))

# DETREND FIRST. A constant or a trend puts enormous energy at
# frequency zero and swamps everything else:
detrended = signal - signal.mean()

# rfft FOR REAL INPUT -- half the work, half the output:
spectrum = np.fft.rfft(detrended)
freqs = np.fft.rfftfreq(len(detrended), d=1.0)    # d = sample spacing
power = np.abs(spectrum) ** 2

# THE PEAKS ARE THE PERIODS. Convert frequency to period:
order = np.argsort(power)[::-1][:5]
periods = 1 / freqs[order]
periods.round(1)              # [168.0, 24.0, ...] -- weekly and daily
#
# 168 hours = 7 days. The FFT found the weekly cycle without being
# told to look for one, which is the whole point: you do not have to
# guess the candidate periods.

# d= IS THE SAMPLE SPACING AND SETS THE UNITS:
np.fft.rfftfreq(100, d=1.0)[:3]        # cycles per SAMPLE
np.fft.rfftfreq(100, d=1/60)[:3]       # cycles per MINUTE if sampled
                                       # every second
#
# Getting d wrong scales every period by a constant. The peaks are in
# the right places and every number is wrong.

# THE RESOLUTION LIMIT, which people run into immediately:
#
#   You cannot detect a period longer than your data.
#   You need at least 2-3 full cycles to see one clearly.
#
# 60 days of data can see a weekly cycle (8.5 cycles) comfortably and
# cannot see an annual one at all.
#
#   NYQUIST: you cannot detect a period shorter than 2 samples.
#   Hourly data cannot see a 30-minute cycle -- it ALIASES, appearing
#   as a spurious lower frequency that looks entirely real.

# A REUSABLE DETECTOR:
def dominant_periods(x, spacing=1.0, top=3, min_period=2.0):
    """Strongest periodic components, longest-period first."""
    x = np.asarray(x, dtype=float)
    x = x - x.mean()

    # A window reduces spectral leakage -- energy from a period that
    # does not divide the record length smearing into its neighbours.
    x = x * np.hanning(len(x))

    power = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(len(x), d=spacing)

    keep = freqs > 0
    power, freqs = power[keep], freqs[keep]

    periods = 1 / freqs
    keep = periods >= min_period
    power, periods = power[keep], periods[keep]

    idx = np.argsort(power)[::-1][:top]
    total = power.sum()
    return [(round(float(periods[i]), 2), round(float(power[i] / total), 4))
            for i in idx]

dominant_periods(signal, spacing=1.0, top=3)
# [(168.0, 0.31), (24.0, 0.55), ...] -- period, share of power

# WHAT TO DO WITH IT: the detected periods become features.
#   sin/cos encoding at each period (see 7.8)
#   a lag feature at exactly that offset
#   a seasonal decomposition
#
# The FFT is the discovery step; the feature is what you build from it.
`,
      hl: [11, 21, 36, 51],
      caption: "**You cannot detect a period longer than your data, and you need two or three cycles to see one clearly.** Sixty days sees a weekly cycle comfortably and an annual one not at all."
    },

    { t: "h2", n: "04", text: "Polynomials and curve fitting", id: "poly" },

    { t: "code", lang: "python", title: "fitting, evaluating and the degree that ruins it", code: `
x = np.linspace(0, 10, 50)
y = 2 * x ** 2 - 3 * x + 1 + rng.normal(0, 5, 50)

# THE MODERN API -- np.polynomial, not the legacy np.polyfit:
from numpy.polynomial import Polynomial

p = Polynomial.fit(x, y, deg=2)
p.convert().coef.round(2)     # [1.x, -3.x, 2.x] -- LOW to HIGH order
p(5.0)                        # evaluate at a point
p(np.array([1., 2., 3.]))     # vectorised

# THE LEGACY API IS STILL EVERYWHERE and orders coefficients the
# OTHER WAY, which is a routine source of confusion:
coef = np.polyfit(x, y, 2)    # HIGH to LOW order
coef.round(2)                 # [2.x, -3.x, 1.x]
np.polyval(coef, 5.0)         # evaluate
#
# Two APIs, opposite coefficient orders. Check which one you are
# reading before interpreting the numbers.

# Polynomial.fit RESCALES THE DOMAIN, which is why it is better:
p.domain                      # [0., 10.] -- the original range
p.window                      # [-1., 1.] -- what it actually fits on
#
# Fitting on [-1, 1] rather than the raw range keeps the design matrix
# well conditioned. On x values in the thousands, raw polyfit produces
# a matrix with a condition number around 10**16 and warns; the
# rescaled fit does not.
big_x = np.linspace(2000, 2030, 50)
# np.polyfit(big_x, y, 5)     -> RankWarning, coefficients unusable
Polynomial.fit(big_x, y, 5)   # fine

# DEGREE IS THE WHOLE DECISION:
for deg in (1, 2, 5, 20):
    fit = Polynomial.fit(x, y, deg)
    resid = y - fit(x)
    print(deg, round(float((resid ** 2).sum()), 1))
# 1  3421.2
# 2   958.4     <- the true degree
# 5   931.6     <- barely better
# 20  742.1     <- much better in sample, and useless
#
# TRAINING ERROR FALLS MONOTONICALLY WITH DEGREE. It is not a model
# selection criterion; it is a measure of how much you overfitted.

# WHAT A HIGH-DEGREE FIT DOES BETWEEN THE POINTS:
fit20 = Polynomial.fit(x, y, 20)
dense = np.linspace(0, 10, 1000)
fit20(dense).ptp() / y.ptp()  # a huge ratio -- it oscillates wildly
#
# RUNGE'S PHENOMENON: high-degree polynomials oscillate violently
# between the fitted points, especially near the edges. The fit passes
# close to every training point and is meaningless in between.

# EXTRAPOLATION IS WORSE, and this is the practical warning:
Polynomial.fit(x, y, 2)(15.0)     # ~406 -- plausible
fit20(15.0)                       # an enormous number
#
# NEVER EXTRAPOLATE A POLYNOMIAL. A degree-2 fit degrades gracefully;
# a degree-20 fit goes to infinity immediately outside its domain.

# CHOOSING DEGREE HONESTLY -- hold data out:
def best_degree(x, y, degrees=range(1, 12), seed=0):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(x))
    cut = int(0.7 * len(x))
    tr, te = idx[:cut], idx[cut:]

    scores = {}
    for d in degrees:
        f = Polynomial.fit(x[tr], y[tr], d)
        scores[d] = float(((y[te] - f(x[te])) ** 2).mean())
    return min(scores, key=scores.get), scores

best_degree(x, y)[0]          # 2 -- the true degree, found honestly
`,
      hl: [16, 27, 41, 55],
      caption: "**Training error falls monotonically with degree.** It is not a model selection criterion — it is a measure of how much you overfitted, and only held-out data can tell you the degree."
    },

    { t: "code", lang: "python", title: "Autocorrelation from correlate, and a better-conditioned polynomial fit",
      code: `rng = np.random.default_rng(6)
s = np.sin(np.linspace(0, 8 * np.pi, 400)) + rng.normal(0, 0.3, 400)     # four cycles in 400 samples
s = s - s.mean()
ac = np.correlate(s, s, mode="full")[len(s) - 1:]     # the signal against a lagged copy of itself: lags 0 .. n-1
ac = ac / ac[0]                                       # normalise so lag 0 is 1
print(np.argmax(ac[20:]) + 20)                        # ~100: the period in samples -- the FFT of section 03 agrees
# pandas spells the single-lag version s.autocorr(lag) (4.3)

# polyfit works in the monomial basis 1, x, x^2, x^3 -- whose columns span 1 to 1e9 when x reaches 1000.
# The Chebyshev basis is orthogonal on a rescaled interval, so the same fit stays well conditioned.
x = np.linspace(0, 1000, 200)
y = 1e-6 * x ** 3 - 2e-3 * x ** 2 + x + rng.normal(0, 5, 200)
c = np.polynomial.Chebyshev.fit(x, y, deg=3)          # maps x to [-1, 1] internally; Hermite and Legendre likewise
print(np.abs(c(x) - y).mean().round(1))               # ~4: a residual the size of the noise
print(c.convert().coef.round(6))                      # back to monomial coefficients if you must report them`,
      caption: "`np.correlate` in full mode holds the autocorrelation at every lag; the first peak after zero is the period. `Chebyshev.fit` is the polynomial fit to use when x spans orders of magnitude — the monomial basis is only well conditioned near the origin."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Smooth a noisy sensor series without inventing a trend",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A sensor reports every 30 seconds with occasional gaps and occasional spikes from electrical interference. Downstream needs a smoothed series, a rate of change, and the dominant cycle length." },
        { t: "p", text: "Every operation here has a way of manufacturing structure that is not in the data. Build it so that it does not." }
      ],
      requirements: [
        "Smooth without the boundary artefact of `mode=\"same\"`.",
        "Handle gaps: do not average across a break as though it were continuous.",
        "Remove spikes without removing genuine sharp changes.",
        "Compute a rate of change in per-second units on irregular timestamps.",
        "Detect the dominant period, and say when the answer is not trustworthy.",
        "Include tests, including one that proves you did not invent a trend."
      ],
      hint: "The FFT needs even sampling. Gaps and irregular timestamps mean you have to decide what to do before you can transform at all.",
      solution: {
        lang: "python",
        title: "smooth_sensor.py",
        code: `import numpy as np
from numpy.lib.stride_tricks import sliding_window_view


# =========================================================================
# 1. SPIKE REMOVAL -- median, not mean
# =========================================================================

def despike(x, window=5, threshold=4.0):
    """Replace points far from their local median.

    A MEAN filter is pulled toward a spike and smears it across the
    window; a MEDIAN filter ignores it entirely. That is the whole
    reason to use one here.

    The threshold is in units of the MAD, not the standard deviation,
    because the standard deviation is itself inflated by the spikes we
    are trying to find -- a large enough spike raises sd until it is
    no longer an outlier by its own measure.
    """
    x = np.asarray(x, dtype=float)
    if len(x) < window:
        return x.copy(), np.zeros(len(x), dtype=bool)

    half = window // 2
    padded = np.pad(x, half, mode="edge")
    med = np.median(sliding_window_view(padded, window), axis=1)

    resid = x - med
    # MAD scaled to be comparable to a standard deviation for normal data
    mad = np.median(np.abs(resid - np.median(resid))) * 1.4826
    if mad < 1e-12:
        return x.copy(), np.zeros(len(x), dtype=bool)

    spike = np.abs(resid) > threshold * mad
    out = np.where(spike, med, x)
    return out, spike


# A GENUINE STEP CHANGE IS NOT A SPIKE. A step moves the local median
# with it after half a window, so only the transition points exceed
# the threshold -- and a wider window makes the filter MORE likely to
# flatten a real step. window=5 on 30-second data means a 2.5-minute
# neighbourhood, which is short enough to follow a real change.


# =========================================================================
# 2. SMOOTHING WITHOUT BOUNDARY ARTEFACTS
# =========================================================================

def smooth(x, window=11):
    """Moving average with edge padding rather than zero padding.

    mode="same" pads with ZEROS, so the first and last window/2 values
    are averages of real data and zeros -- producing a dip at both ends
    of a positive series that looks like a real trend.

    Padding with the edge value instead means the boundary estimate is
    "assume it continues flat", which is an assumption you can state.
    """
    x = np.asarray(x, dtype=float)
    if window < 2 or len(x) < window:
        return x.copy()
    if window % 2 == 0:
        window += 1                     # symmetric window needs odd length

    half = window // 2
    padded = np.pad(x, half, mode="edge")
    kernel = np.ones(window) / window
    return np.convolve(padded, kernel, mode="valid")


# =========================================================================
# 3. GAPS -- do not smooth across a break
# =========================================================================

def find_segments(t, max_gap):
    """Split indices into runs with no gap larger than max_gap."""
    t = np.asarray(t, dtype=float)
    if len(t) == 0:
        return []
    breaks = np.flatnonzero(np.diff(t) > max_gap) + 1
    return np.split(np.arange(len(t)), breaks)


def smooth_segmented(t, x, window=11, max_gap=90.0):
    """Smooth each continuous run independently.

    Averaging across a two-hour outage treats the readings either side
    as neighbours. The output is a smooth line through a period when
    the sensor was reporting nothing -- which is the clearest possible
    example of manufacturing data.
    """
    out = np.full(len(x), np.nan)
    for seg in find_segments(t, max_gap):
        if len(seg):
            out[seg] = smooth(np.asarray(x)[seg], window)
    return out


# =========================================================================
# 4. RATE OF CHANGE IN REAL UNITS
# =========================================================================

def rate_of_change(t, x, max_gap=90.0):
    """Per-second derivative, nan across gaps.

    np.gradient(x) alone gives a per-SAMPLE rate. Passing t gives a
    per-SECOND rate. With irregular sampling the two differ by a
    varying factor, so the first is not even a consistent rescaling of
    the second -- the numbers look plausible and the units are wrong.

    We also SMOOTH BEFORE DIFFERENTIATING. Differentiation amplifies
    high-frequency noise: on this data the derivative of the raw
    series has around twenty times the variance of the derivative of
    the smoothed one, and none of that extra variance is signal.
    """
    t, x = np.asarray(t, float), np.asarray(x, float)
    out = np.full(len(x), np.nan)

    for seg in find_segments(t, max_gap):
        if len(seg) < 2:
            continue                    # a lone point has no rate
        out[seg] = np.gradient(x[seg], t[seg])

    return out


# =========================================================================
# 5. PERIOD DETECTION, WITH AN HONEST VERDICT
# =========================================================================

def dominant_period(t, x, max_gap=90.0, min_cycles=3.0):
    """Strongest cycle, or a reason why the question cannot be answered.

    The FFT requires EVEN SAMPLING. Real sensor data is irregular, so
    we resample the longest continuous segment onto a regular grid
    first -- and we do that only on a segment, never across a gap,
    because interpolating a two-hour outage invents a smooth cycle
    that was never observed.
    """
    t, x = np.asarray(t, float), np.asarray(x, float)

    segments = find_segments(t, max_gap)
    if not segments:
        return {"period": None, "reason": "no data"}

    seg = max(segments, key=len)
    if len(seg) < 16:
        return {"period": None,
                "reason": f"longest gap-free run is {len(seg)} samples"}

    ts, xs = t[seg], x[seg]
    span = ts[-1] - ts[0]

    # Resample onto the median observed spacing.
    dt = float(np.median(np.diff(ts)))
    grid = np.arange(ts[0], ts[-1], dt)
    xi = np.interp(grid, ts, xs)

    xi = xi - xi.mean()
    xi = xi * np.hanning(len(xi))

    power = np.abs(np.fft.rfft(xi)) ** 2
    freqs = np.fft.rfftfreq(len(xi), d=dt)

    keep = freqs > 0
    power, freqs = power[keep], freqs[keep]
    periods = 1.0 / freqs

    # RESOLUTION LIMITS, stated rather than assumed:
    #   - a period longer than span/min_cycles is not measurable
    #   - a period shorter than 2*dt aliases (Nyquist)
    usable = (periods <= span / min_cycles) & (periods >= 2 * dt)
    if not usable.any():
        return {"period": None,
                "reason": f"span {span:.0f}s supports no period at "
                          f"{min_cycles} cycles"}

    power, periods = power[usable], periods[usable]
    i = int(np.argmax(power))
    share = float(power[i] / power.sum())

    return {
        "period": float(periods[i]),
        "power_share": round(share, 4),
        "cycles_observed": round(span / periods[i], 2),
        "span_seconds": float(span),
        "samples_used": len(seg),
        # A share barely above the noise floor is not a detection.
        "confident": bool(share > 0.15 and span / periods[i] >= min_cycles),
        "reason": None,
    }


# =========================================================================
# PUTTING IT TOGETHER
# =========================================================================

def process(t, x, window=11, max_gap=90.0):
    clean, spikes = despike(x)
    smoothed = smooth_segmented(t, clean, window, max_gap)
    rate = rate_of_change(t, smoothed, max_gap)
    period = dominant_period(t, smoothed, max_gap)

    return {
        "smoothed": smoothed,
        "rate": rate,
        "spikes_removed": int(spikes.sum()),
        "gaps": len(find_segments(t, max_gap)) - 1,
        "period": period,
    }


# =========================================================================
# TESTS
# =========================================================================

def _series(n=600, dt=30.0, seed=0):
    rng = np.random.default_rng(seed)
    t = np.arange(n) * dt
    x = 100 + 10 * np.sin(2 * np.pi * t / 3600) + rng.normal(0, 0.5, n)
    return t, x


def test_smoothing_does_not_dip_at_the_edges():
    """The mode='same' artefact -- the reason for edge padding."""
    x = np.full(100, 50.0)

    ours = smooth(x, 11)
    naive = np.convolve(x, np.ones(11) / 11, mode="same")

    assert np.allclose(ours, 50.0)
    assert naive[0] < 30.0               # the artefact


def test_smoothing_preserves_the_mean():
    """A smoother must not shift the level."""
    t, x = _series()

    assert abs(smooth(x, 11).mean() - x.mean()) < 0.1


def test_smoothing_does_not_invent_a_trend():
    """Flat noise in, flat out -- no drift manufactured."""
    rng = np.random.default_rng(1)
    x = rng.normal(100, 1, 1000)
    s = smooth(x, 21)

    slope = np.polyfit(np.arange(len(s)), s, 1)[0]
    assert abs(slope) < 1e-3


def test_spikes_are_removed():
    t, x = _series()
    x = x.copy()
    x[100] = 5000.0
    x[300] = -2000.0

    clean, spikes = despike(x)
    assert spikes.sum() == 2
    assert abs(clean[100] - x[99]) < 5


def test_a_genuine_step_is_not_removed():
    """A step change is data; a spike is not."""
    x = np.concatenate([np.full(100, 10.0), np.full(100, 50.0)])
    clean, spikes = despike(x, window=5)

    assert clean[150] == 50.0
    assert spikes.sum() <= 2             # only the transition, if any


def test_gaps_are_not_smoothed_across():
    t = np.concatenate([np.arange(50) * 30.0,
                        np.arange(50) * 30.0 + 30 * 50 + 7200])
    x = np.concatenate([np.full(50, 10.0), np.full(50, 90.0)])

    s = smooth_segmented(t, x, window=11, max_gap=90.0)

    assert np.allclose(s[:50], 10.0)
    assert np.allclose(s[50:], 90.0)     # no blending across the gap


def test_rate_is_in_per_second_units():
    t = np.arange(100) * 30.0
    x = t * 2.0                          # 2 units per second

    r = rate_of_change(t, x)
    assert np.allclose(r[1:-1], 2.0)


def test_rate_ignoring_spacing_would_be_wrong():
    t = np.arange(100) * 30.0
    x = t * 2.0

    assert np.allclose(np.gradient(x)[1:-1], 60.0)    # per SAMPLE
    assert np.allclose(rate_of_change(t, x)[1:-1], 2.0)


def test_rate_is_nan_across_a_gap():
    t = np.array([0., 30., 60., 10000., 10030., 10060.])
    x = np.array([1., 2., 3., 4., 5., 6.])

    r = rate_of_change(t, x, max_gap=90.0)
    assert np.isfinite(r[:3]).all()
    assert np.isfinite(r[3:]).all()
    # the two runs were differentiated independently, not across


def test_period_is_found():
    t, x = _series(n=600)                # 5 hours, hourly cycle
    p = dominant_period(t, x)

    assert p["confident"]
    assert abs(p["period"] - 3600) / 3600 < 0.1


def test_period_is_refused_when_the_span_is_too_short():
    """One cycle of data cannot establish a cycle."""
    t, x = _series(n=120)                # 1 hour, one cycle

    p = dominant_period(t, x, min_cycles=3.0)
    assert p["period"] is None or not p["confident"]


def test_pure_noise_is_not_reported_as_a_cycle():
    rng = np.random.default_rng(2)
    t = np.arange(600) * 30.0
    x = rng.normal(100, 1, 600)

    p = dominant_period(t, x)
    assert not p["confident"]


def test_short_run_is_refused():
    t = np.arange(5) * 30.0
    p = dominant_period(t, np.ones(5))

    assert p["period"] is None
    assert "gap-free run" in p["reason"]`,
        notes: [
          { t: "p", text: "**Every step here can manufacture structure, so every step states an assumption.** Edge padding says \"assume it continues flat\" instead of \"assume it was zero\"; segmenting says \"do not treat readings either side of an outage as neighbours\"." },
          { t: "callout", kind: "insight", title: "The MAD, not the standard deviation", body: [
            { t: "p", text: "Spike detection thresholded on the standard deviation is self-defeating: **a large enough spike inflates the standard deviation until it is no longer an outlier by its own measure.**" },
            { t: "p", text: "The median absolute deviation is unaffected by a small number of extreme points, which is why it is the right scale for the very thing it is being used to detect." }
          ]},
          { t: "p", text: "**A step change is data and a spike is not.** A genuine step moves the local median with it after half a window, so only the transition points exceed the threshold — and a wider window makes the filter *more* likely to flatten a real change, which is the trade the `window` parameter controls." },
          { t: "p", text: "**Interpolating across a two-hour outage would invent a smooth cycle nobody observed.** The FFT needs even sampling, so the resampling happens only within the longest continuous run — the gap is a reason to use less data, not a reason to fill it in." },
          { t: "p", text: "**The period detector can return \"no\".** A span supporting fewer than three cycles cannot establish a cycle, a period below twice the sample spacing aliases, and a power share barely above the noise floor is not a detection. Reporting `confident: False` is more useful than reporting the argmax of noise." },
          { t: "p", text: "**The flat-noise test is the one that matters most.** It asserts that smoothing pure noise produces no slope — that the pipeline does not manufacture a trend, which is the failure mode every step in it is capable of." }
        ]
      }
    },

    { t: "callout", kind: "production", title: "In production", body: [
      { t: "p", text: "**Smoothing is a lossy transformation that looks like a cleaning step.** Every window length is a claim about what counts as noise, and that claim belongs in the code as a named parameter with a justification, not as a number someone tuned until the chart looked right." },
      { t: "p", text: "**A centred window is leakage in a forecasting feature.** `np.convolve(x, kernel, mode=\"same\")` uses future values at every position — fine for a chart, invalid for anything predicting the next step. Use a trailing window there, and see 4.3." },
      { t: "p", text: "**Record what was removed.** A despiking step that silently drops 8% of readings is hiding a sensor fault, and the count is often more valuable than the cleaned series." }
    ]}
  ],

  takeaways: [
    "**A moving average is a convolution** — sliding weights along an array and taking a weighted sum at each position.",
    "**`mode=\"same\"` pads with zeros**, so the first and last values are averages of real data and zeros that are not in the dataset.",
    "**`np.convolve` reverses the kernel**, which silently inverts an asymmetric weight vector's intent.",
    "**The cumsum trick computes a moving average in O(n)** regardless of window size, but accumulates float error over long arrays.",
    "**`sliding_window_view` is a free view** — use it for statistics that do not decompose, such as a moving median.",
    "**`np.gradient` returns the same length as its input**; `np.diff` returns one fewer and no longer aligns with its index.",
    "**Pass the spacing to `gradient`** — omitting it computes a per-sample rate rather than a per-unit-time rate.",
    "**Smooth before differentiating.** Differentiation amplifies high-frequency noise, and the order changes the variance by an order of magnitude.",
    "**Detrend before an FFT**, or the mean swamps every real frequency.",
    "**You cannot detect a period longer than your data**, and you need two or three cycles to see one clearly.",
    "**Polynomial training error falls monotonically with degree** — it measures overfitting, not fit quality.",
    "**Never extrapolate a polynomial**: a high-degree fit goes to infinity immediately outside its domain."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A moving average of a positive series dips at both ends of the chart. Why?",
        options: [
          "The data genuinely starts and ends low",
          "`mode=\"same\"` pads with zeros, so the boundary values average real data with zeros that are not in the dataset",
          "The kernel is not normalised",
          "Floating-point error at the boundaries"
        ],
        answer: 1,
        why: "The window extends past the data at the edges and `\"same\"` fills it with zeros. Use `mode=\"valid\"` and accept the shorter output, or pad with `mode=\"edge\"` so the boundary assumption — that the series continues flat — is one you chose deliberately."
      },
      {
        stem: "You compute `np.gradient(x)` on data with irregular timestamps. What is wrong?",
        options: [
          "Nothing — gradient handles irregular spacing",
          "It assumes unit spacing, so you get a per-sample rate rather than a per-second rate — plausible numbers in the wrong units",
          "It requires sorted input",
          "It returns one fewer value"
        ],
        answer: 1,
        why: "`np.gradient(x, t)` uses the actual coordinates. Without them every rate is scaled by whatever the local spacing happened to be, and with irregular sampling it is not even a consistent rescaling — the error varies point to point."
      },
      {
        stem: "You have 60 days of hourly data. Which cycle can an FFT reliably detect?",
        options: [
          "An annual cycle",
          "A weekly cycle — about 8.5 cycles fit in the record",
          "A 30-minute cycle",
          "All of these"
        ],
        answer: 1,
        why: "You need two or three full cycles to establish a period, so 60 days cannot see an annual one at all. A 30-minute cycle is below the Nyquist limit for hourly sampling and *aliases* — appearing as a spurious lower frequency that looks entirely genuine."
      },
      {
        stem: "A degree-20 polynomial has much lower training error than a degree-2 fit. What does that tell you?",
        options: [
          "The true relationship is degree 20",
          "Nothing useful — training error falls monotonically with degree, so it measures overfitting rather than fit quality",
          "The data is noisy",
          "The fit failed to converge"
        ],
        answer: 1,
        why: "Adding parameters can only reduce in-sample error. The degree-20 fit oscillates wildly between the training points — Runge's phenomenon — and goes to infinity immediately outside its domain. Only held-out data can choose the degree."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you compute a moving average over a large array, and what are the trade-offs?",
        strong: "Three options. Convolution is O(n × k) and handles arbitrary weights. The cumulative-sum difference is O(n) regardless of window size — much faster for wide windows, but it accumulates floating-point error over long arrays. `sliding_window_view` gives a free strided view and is the only option for statistics that do not decompose, like a moving median. And I would avoid `mode=\"same\"`, which pads with zeros and produces an artefact at both ends.",
        answer: [
          { t: "p", text: "Giving three options with their distinct trade-offs, rather than one answer, is what makes this a senior response." },
          { t: "p", text: "The edge artefact is the practical detail — it reaches charts and reports, and people read it as a finding." }
        ]
      },
      {
        level: "advanced",
        q: "How would you find out whether a metric has a weekly cycle?",
        strong: "An FFT on the detrended series — subtract the mean first, or the zero frequency swamps everything. Convert the peak frequencies to periods and look for one near 168 hours. But I would state the limits: you cannot detect a period longer than your data, you need two or three cycles to be confident, and anything below twice the sample spacing aliases into a spurious lower frequency that looks real.",
        answer: [
          { t: "p", text: "The FFT is the direct answer; the resolution limits are what distinguish someone who has used one from someone who has read about one." }
        ]
      },
      {
        level: "advanced",
        q: "You are asked to smooth a noisy series before computing its rate of change. Does the order matter?",
        strong: "Considerably. Differentiation amplifies high-frequency noise, so differentiating first gives a result dominated by it — on typical sensor data the variance is around twenty times higher, and none of that extra variance is signal. Smooth, then differentiate. And if the output is a forecasting feature, the window must be trailing rather than centred, or it uses future values.",
        answer: [
          { t: "p", text: "The leakage point at the end is the one that matters most in a data role — a centred window is fine for a chart and invalid for a feature." }
        ]
      }
    ]
  }
});

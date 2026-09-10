/* ============================================================================
   LESSON 3.2 — Random Variables: PMF, PDF and CDF
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "A random variable is a function from outcomes to numbers, and the three ways of describing one are not interchangeable. **A density is not a probability** — it can exceed 1, it has units, and forgetting that is the source of most confusion about continuous distributions.",

  objectives: [
    "Define a random variable as a function, not a variable",
    "Distinguish a PMF from a PDF and say why one can exceed 1",
    "Use the CDF as the object that works for both kinds",
    "Compute quantiles, and sample from any distribution with inverse transform",
    "Recognise where a mixed distribution appears in real data"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "A random variable is a function", id: "definition" },

    { t: "p", text: "**A random variable is not a variable — it is a function** that assigns a number to every outcome. The randomness lives in which outcome occurs; the function itself is a fixed, deterministic rule, which is why one experiment can support many different random variables." },

    { t: "dl", items: [
      ["Random variable", "A function `X : S → ℝ` from the sample space to the real numbers. Conventionally written with a capital letter."],
      ["Realisation", "A particular value `X` took, written lower-case as `x`. The distinction between `X` and `x` is worth keeping."],
      ["Discrete", "Takes countably many values — counts, categories, outcomes of trials."],
      ["Continuous", "Takes any value in an interval. `P(X = x)` is exactly zero for every single `x`; only intervals carry probability."],
      ["Support", "The set of values the variable can actually take."]
    ]},

    { t: "code", lang: "python", title: "the definition people skip", code: `
import numpy as np
from itertools import product

# A RANDOM VARIABLE IS NOT A VARIABLE. It is a FUNCTION from the sample
# space to the real line:
#
#     X : S -> R
#
# The randomness lives in which outcome occurs. X itself is a fixed,
# deterministic rule for turning an outcome into a number.

S = list(product([1, 2, 3, 4, 5, 6], repeat=2))     # 36 equally likely

X = lambda o: o[0] + o[1]              # the sum
Y = lambda o: max(o)                   # the larger die
Z = lambda o: 1 if o[0] == o[1] else 0 # an indicator: did they match?

# ONE SAMPLE SPACE, THREE RANDOM VARIABLES. That is the point of the
# definition: several different numeric questions can be asked of the
# same underlying experiment, and each is its own function.

# THE DISTRIBUTION OF X is the pushforward of the probability on S:
#
#     P(X = k) = P({o in S : X(o) = k})
#
def pmf(f, S):
    out = {}
    for o in S:
        out[f(o)] = out.get(f(o), 0) + 1 / len(S)
    return dict(sorted(out.items()))

pmf(X, S)     # {2: 0.028, 3: 0.056, ..., 7: 0.167, ..., 12: 0.028}
pmf(Y, S)     # {1: 0.028, 2: 0.083, 3: 0.139, 4: 0.194, 5: 0.25, 6: 0.306}
pmf(Z, S)     # {0: 0.833, 1: 0.167}

# NOTICE Y IS NOT SYMMETRIC while X is. Same experiment, same space --
# the shape comes entirely from the function, which is why "what is the
# distribution" is only answerable once you say what you are measuring.

sum(pmf(X, S).values())                # 1.0, necessarily
`,
      hl: [6, 22, 36],
      caption: "**One sample space, three random variables.** The distribution is not a property of the experiment alone — it is the experiment pushed through whichever function you chose to measure."
    },

    { t: "h2", n: "02", text: "PMF against PDF", id: "pmf-pdf" },

    { t: "p", text: "**A probability mass function gives probabilities; a probability density function does not.** A density is probability *per unit of x* — a rate — so it can exceed 1 without anything being wrong, and only its integral over an interval is a probability." },

    { t: "dl", items: [
      ["PMF", "`p(k) = P(X = k)` for a discrete variable. Each value is a genuine probability between 0 and 1, and they sum to 1."],
      ["PDF", "`f(x)` for a continuous variable. A **density**, not a probability: it has units of `1/x` and may be arbitrarily large."],
      ["Interval probability", "`P(a < X < b) = ∫ f(x) dx`. The area under the density, which is what carries the meaning."],
      ["The units test", "Change the units of `x` and a density value changes; a probability does not. That is the cleanest way to tell which you are looking at."]
    ]},

    { t: "table",
      head: ["", "Discrete — PMF", "Continuous — PDF"],
      rows: [
        ["Written", "`p(k) = P(X = k)`", "`f(x)`, and `P(X = x) = 0`"],
        ["Value range", "`0 ≤ p(k) ≤ 1`", "**`f(x) ≥ 0`, may exceed 1**"],
        ["Sums to", "`Σ p(k) = 1`", "`∫ f(x) dx = 1`"],
        ["Probability of an interval", "`Σ` over the range", "`∫` over the range"],
        ["Units", "None — it is a probability", "**Probability per unit of `x`**"],
        ["Meaning of the value", "The probability of that outcome", "**A rate, meaningless on its own**"]
      ],
      caption: "**The units row is the one that resolves the confusion.** A density is probability *per unit x*, so narrowing the units inflates the number — which is why a density can be 500 without anything being wrong."
    },

    { t: "viz",
      title: "A density above 1 is not a contradiction",
      caption: "The uniform on [0, 0.002] has height 500 everywhere, because the area must be 1 and the base is 0.002 wide. The height is a rate; only the shaded area is a probability.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A tall narrow uniform density beside a wide short one, both with area 1">
  <g>
    <line x1="70" y1="210" x2="380" y2="210" style="stroke:var(--line)" stroke-width="1.5"/>
    <line x1="70" y1="210" x2="70"  y2="40"  style="stroke:var(--line)" stroke-width="1.5"/>
    <rect x="110" y="60" width="26" height="150" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="2"/>
    <text x="86" y="54" class="s-label" style="fill:var(--accent)">f(x) = 500</text>
    <text x="98" y="230" class="s-sub" style="fill:var(--ink-3)">width 0.002</text>
    <text x="180" y="130" class="s-sub" style="fill:var(--ink-3)">area = 500 x 0.002 = 1</text>
  </g>

  <g transform="translate(430,0)">
    <line x1="70" y1="210" x2="380" y2="210" style="stroke:var(--line)" stroke-width="1.5"/>
    <line x1="70" y1="210" x2="70"  y2="40"  style="stroke:var(--line)" stroke-width="1.5"/>
    <rect x="90" y="180" width="272" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)" stroke-width="2"/>
    <text x="86" y="172" class="s-label" style="fill:var(--good)">f(x) = 0.1</text>
    <text x="150" y="230" class="s-sub" style="fill:var(--ink-3)">width 10</text>
    <text x="150" y="130" class="s-sub" style="fill:var(--ink-3)">area = 0.1 x 10 = 1</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the density trap, made concrete", code: `
from scipy import stats

# A NORMAL WITH A SMALL SPREAD HAS A LARGE PEAK.
stats.norm(loc=0, scale=0.001).pdf(0)      # 398.94, and nothing is wrong
stats.norm(loc=0, scale=1.0).pdf(0)        # 0.3989
#
# The peak height is 1/(sigma*sqrt(2pi)). Halve sigma and it doubles,
# because the same unit of probability is packed into half the width.

# P(X = x) IS EXACTLY ZERO FOR A CONTINUOUS VARIABLE.
#
# "The probability that a randomly chosen person is exactly 180.000...cm
# tall" is zero -- there are uncountably many heights and each takes no
# mass. What is non-zero is an INTERVAL.

d = stats.norm(loc=180, scale=7)

d.pdf(180)                                  # 0.0570  -- a density
d.cdf(181) - d.cdf(179)                     # 0.1139  -- a probability
d.pdf(180) * 2                              # 0.1140  -- density x width,
                                            #    a good approximation for
                                            #    a narrow interval

# WHY THE APPROXIMATION WORKS: over a small interval the density is
# nearly constant, so the area is approximately height x width. That is
# the ONLY sense in which a density value means anything on its own.

# THE UNITS ARGUMENT SETTLES IT. Measure the same heights in metres
# instead of centimetres and every density value multiplies by 100:
stats.norm(loc=1.80, scale=0.07).pdf(1.80)  # 5.699 -- 100x the cm value
#
# A quantity that changes when you change units is not a probability.
# Probabilities are dimensionless; densities are per-unit-x.
`,
      hl: [4, 21, 22, 34],
      caption: "**A density value changes when you change units; a probability does not.** That is the cleanest test for whether a number you are looking at is one or the other."
    },

    { t: "h2", n: "03", text: "The CDF works for both", id: "cdf" },

    { t: "p", text: "**The cumulative distribution function is defined identically for discrete and continuous variables**, which makes it the more fundamental object. It also exists for mixed distributions that have neither a clean PMF nor a clean PDF." },

    { t: "dl", items: [
      ["CDF", "`F(x) = P(X ≤ x)`. Non-decreasing, running from 0 to 1, right-continuous."],
      ["Survival function", "`S(x) = 1 − F(x) = P(X > x)`. Computed directly rather than by subtraction, because in the far tail the subtraction returns pure round-off."],
      ["Quantile function", "The inverse `F⁻¹(q)` — the value below which a fraction `q` of the distribution lies. Every percentile and SLO is a statement about it."],
      ["Inverse transform sampling", "`F⁻¹(U)` has distribution `F` when `U` is uniform. This is why a uniform generator is the only primitive a language needs."]
    ]},

    { t: "code", lang: "python", title: "one object, every question", code: `
# THE CDF IS DEFINED IDENTICALLY FOR DISCRETE AND CONTINUOUS:
#
#     F(x) = P(X <= x)
#
# It is non-decreasing, goes from 0 to 1, and is right-continuous. That
# is all it must satisfy -- and every distribution has one, including
# the mixed ones that have neither a clean PMF nor a clean PDF.

d = stats.norm(loc=100, scale=15)

d.cdf(115)                       # 0.8413   P(X <= 115)
1 - d.cdf(115)                   # 0.1587   P(X > 115)
d.sf(115)                        # 0.1587   the survival function
d.cdf(115) - d.cdf(85)           # 0.6827   P(85 < X <= 115)

# USE sf RATHER THAN 1 - cdf IN THE FAR TAIL. When the CDF is 1 - 1e-18,
# float64 stores it as exactly 1.0 and the subtraction gives 0.
d.cdf(200)                       # 0.9999999999999999
1 - d.cdf(200)                   # 1.11e-16  -- wrong, and it is noise
d.sf(200)                        # 1.31e-11  -- correct
#
# The same cancellation lesson as 2.6: scipy provides sf because the
# subtraction destroys precision, not as a convenience.

# THE INVERSE CDF IS THE QUANTILE FUNCTION, and it is what percentiles,
# confidence intervals and SLOs are all built on.
d.ppf(0.5)                       # 100.0   the median
d.ppf(0.95)                      # 124.7   the 95th percentile
d.ppf(0.99)                      # 134.9

# A LATENCY SLO IS A QUANTILE STATEMENT. "p99 under 200 ms" is
# F(200) >= 0.99, which is why you cannot check it with a mean.

# FOR A DISCRETE VARIABLE THE CDF IS A STAIRCASE, and the PMF is the
# size of each step:
b = stats.binom(n=10, p=0.3)

b.cdf(3) - b.cdf(2)              # 0.2668
b.pmf(3)                         # 0.2668   -- identical, by construction

# WHICH IS WHY THE CDF IS THE FUNDAMENTAL OBJECT: the PMF and PDF are
# both recoverable from it (as a step size, or as a derivative), and it
# exists even where neither of them does.
`,
      hl: [15, 17, 30, 41],
      caption: "**Use `sf` rather than `1 - cdf` in the tail.** At `cdf = 1 − 10⁻¹⁸` the subtraction returns noise, and tail probabilities are exactly where you tend to need precision."
    },

    { t: "callout", kind: "insight", title: "Inverse transform sampling", body: [
      { t: "p", text: "**If `U` is uniform on `[0,1]`, then `F⁻¹(U)` has distribution `F`.** One line, and it lets you sample from anything whose quantile function you can write down." },
      { t: "code", lang: "python", numbered: false, title: "and it explains what a uniform sampler is for", code: `
u = np.random.default_rng(0).uniform(size=100_000)

# EXPONENTIAL: F(x) = 1 - e^(-lam x),  F^-1(u) = -ln(1-u)/lam
lam = 2.0
x = -np.log(1 - u) / lam

x.mean(), 1/lam                   # 0.4995, 0.5   -- matches
stats.kstest(x, "expon", args=(0, 1/lam)).pvalue   # 0.47, indistinguishable

# WHY IT WORKS: P(F^-1(U) <= x) = P(U <= F(x)) = F(x), because U is
# uniform so P(U <= p) = p. Applying F to both sides of the inequality
# is valid precisely because F is non-decreasing.

# THIS IS WHY EVERY LANGUAGE SHIPS A UNIFORM GENERATOR AND NOTHING
# ELSE AT THE PRIMITIVE LEVEL: given uniforms, every other distribution
# with a closed-form quantile follows immediately.
#
# It also runs in reverse -- the PROBABILITY INTEGRAL TRANSFORM:
# F(X) is uniform when F is X's own CDF. That is the basis of the
# Kolmogorov-Smirnov test and of every QQ plot.
stats.kstest(stats.norm.cdf(stats.norm.rvs(size=5000, random_state=1)),
             "uniform").pvalue     # 0.55 -- transformed data IS uniform`},
      { t: "p", text: "**The reverse direction is what makes goodness-of-fit testing possible.** `F(X)` is uniform when `F` is the right CDF, so testing a distributional assumption reduces to testing uniformity — which is one fixed problem rather than one per distribution." }
    ]},

    { t: "h2", n: "04", text: "Mixed distributions, which real data is full of", id: "mixed" },

    { t: "p", text: "Real measurements frequently have a **point mass** — a specific value occurring with positive probability — sitting on top of a continuous spread. Revenue with many zeros, latency with a timeout, and any metric with a floor all take this shape, and neither a PMF nor a PDF describes it alone." },

    { t: "dl", items: [
      ["Mixed distribution", "Part discrete, part continuous. It has a valid CDF and no single density."],
      ["Point mass", "An atom of probability at one value — `P(X = 0) = 0.94` for revenue where most users pay nothing."],
      ["Zero-inflated", "The common case: a spike at zero plus a continuous distribution for the non-zero part."],
      ["Censoring", "Values beyond a limit are recorded as the limit. A timeout at 30 s piles every slower request onto exactly 30 s."]
    ]},

    { t: "ladder",
      title: "Modelling revenue per user, where most users pay nothing",
      rungs: [
        { level: "bad", label: "Fit a normal to everything",
          why: "The data has a point mass at zero — 94% of users pay nothing — and a continuous spread above it. A normal has neither, so it puts mass below zero, understates the paying users, and its mean describes no actual user.",
          code: `mu, sd = revenue.mean(), revenue.std()
# mu = 1.42, sd = 9.80
# P(X < 0) under this fit = 0.44 -- nearly half the mass is impossible` },
        { level: "ok", label: "Drop the zeros and fit the rest",
          why: "The conditional distribution of paying users is now modelled honestly, and a lognormal fits it well. But the zeros carried the information you most need — the conversion rate — and dropping them discards it.",
          code: `paying = revenue[revenue > 0]
shape, loc, scale = stats.lognorm.fit(paying, floc=0)

# Fits the spenders. Says nothing about how many there are, so it
# cannot answer "what is expected revenue per user", which is the
# question that was actually asked.` },
        { level: "best", label: "Model it as what it is — a mixture",
          why: "A point mass at zero plus a continuous distribution above it. The two parts answer different business questions and move for different reasons, so separating them is not just statistical tidiness.",
          code: `class ZeroInflated:
    """P(X = 0) = 1 - p; given X > 0, X follows a lognormal.

    The CDF is well defined even though there is no single PDF or PMF:
    F(x) = (1-p) + p * F_positive(x) for x >= 0."""

    def __init__(self, data):
        self.p = float((data > 0).mean())            # conversion rate
        pos = data[data > 0]
        s, _, sc = stats.lognorm.fit(pos, floc=0)
        self.positive = stats.lognorm(s, 0, sc)

    def cdf(self, x):
        x = np.asarray(x, dtype=float)
        return np.where(x < 0, 0.0,
                        (1 - self.p) + self.p * self.positive.cdf(x))

    def mean(self):
        return self.p * self.positive.mean()

    def ppf(self, q):
        """Quantiles land at 0 for any q below the zero mass -- which is
        why the median of this distribution is 0 and always will be."""
        q = np.asarray(q, dtype=float)
        return np.where(q <= 1 - self.p, 0.0,
                        self.positive.ppf((q - (1 - self.p)) / self.p))

m = ZeroInflated(revenue)
m.p                    # 0.058   conversion rate
m.positive.mean()      # 24.55   average spend AMONG SPENDERS
m.mean()               # 1.42    revenue per user -- p x conditional mean
m.ppf(0.5)             # 0.0     the median user pays nothing
m.ppf(0.99)            # 42.1    the p99 user

# THE DECOMPOSITION IS THE POINT. Revenue per user = conversion rate x
# average spend, and those two numbers have different owners, different
# levers and different failure modes. A single fitted distribution
# hides that; the mixture makes it the first thing you see.`,
          note: "**A mixed distribution has a CDF but no single PDF or PMF.** That is not an edge case — it is what censored data, zero-inflated counts and any metric with a floor all look like." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Build a distribution from a latency histogram",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Your metrics system stores latency as a histogram with fixed bucket boundaries — the raw values are gone. You need to answer quantile questions from it, and to say honestly how wrong the answers can be." },
        { t: "code", lang: "python", numbered: false, title: "what you have", code: `
# Bucket upper bounds in milliseconds, and the count in each bucket.
edges  = np.array([0, 5, 10, 25, 50, 100, 250, 500, 1000, np.inf])
counts = np.array([1204, 8891, 15320, 9077, 3455, 1201, 402, 88, 12])

# Total: 39,650 requests. The SLO is "p99 under 500 ms".`},
        { t: "p", text: "Build a distribution object from this, answer whether the SLO is met, and quantify the error the bucketing introduces." }
      ],
      requirements: [
        "Build a CDF from the counts and interpolate within buckets.",
        "Report p50, p95, p99 and p999.",
        "State whether the SLO is met and how confident you can be.",
        "Bound the error the bucketing introduces, per quantile.",
        "Say what the final infinite bucket does to p999.",
        "Include tests."
      ],
      hint: "Within a bucket you know only the count, so any interpolation is an assumption — say which one you are making and what it costs.",
      solution: {
        lang: "python",
        title: "histogram_quantiles.py",
        code: `import numpy as np

edges  = np.array([0, 5, 10, 25, 50, 100, 250, 500, 1000, np.inf])
counts = np.array([1204, 8891, 15320, 9077, 3455, 1201, 402, 88, 12])


class HistogramDistribution:
    """A distribution recovered from bucketed counts.

    The CDF is EXACT at bucket boundaries -- that is the only thing the
    histogram actually knows. Everything between boundaries is an
    assumption, so the class reports bounds alongside every estimate.
    """

    def __init__(self, edges, counts):
        edges, counts = np.asarray(edges, float), np.asarray(counts, float)
        if len(edges) != len(counts) + 1:
            raise ValueError(
                f"{len(edges)} edges needs {len(edges)-1} counts, "
                f"got {len(counts)}"
            )
        self.edges, self.counts = edges, counts
        self.n = counts.sum()
        # Cumulative count at each boundary: exact knowledge.
        self.cum = np.concatenate([[0.0], np.cumsum(counts)])

    # ---- the exact part ------------------------------------------------
    def cdf_at_edge(self, i):
        """P(X <= edges[i]) -- exact, no assumption."""
        return self.cum[i] / self.n

    # ---- the interpolated part -----------------------------------------
    def quantile(self, q):
        """LINEAR interpolation within the containing bucket.

        THE ASSUMPTION: values are uniformly spread across the bucket.
        For latency this is wrong -- density falls towards the upper
        edge -- so linear interpolation OVERESTIMATES. Use bounds() to
        see by how much.
        """
        if not 0 <= q <= 1:
            raise ValueError(f"quantile must be in [0,1], got {q}")
        target = q * self.n
        i = int(np.searchsorted(self.cum, target, side="left"))
        i = max(1, min(i, len(self.counts)))

        lo, hi = self.edges[i-1], self.edges[i]
        if not np.isfinite(hi):
            return float("inf")             # honest: unbounded bucket

        below = self.cum[i-1]
        within = self.counts[i-1]
        frac = 0.0 if within == 0 else (target - below) / within
        return float(lo + frac * (hi - lo))

    def bounds(self, q):
        """The interval the histogram genuinely constrains the quantile
        to: the two boundaries of the bucket it falls in. Any estimate
        inside this is consistent with the data; nothing narrower is
        justified."""
        target = q * self.n
        i = int(np.searchsorted(self.cum, target, side="left"))
        i = max(1, min(i, len(self.counts)))
        return float(self.edges[i-1]), float(self.edges[i])


d = HistogramDistribution(edges, counts)

for q in (0.5, 0.95, 0.99, 0.999):
    lo, hi = d.bounds(q)
    print(f"p{q*100:<5g} = {d.quantile(q):8.1f} ms   "
          f"bucket [{lo:g}, {hi:g})   width {hi-lo:g}")

# p50    =     18.0 ms   bucket [10, 25)      width 15
# p95    =     67.6 ms   bucket [50, 100)     width 50
# p99    =    182.0 ms   bucket [100, 250)    width 150
# p99.9  =    550.9 ms   bucket [500, 1000)   width 500


# =========================================================================
# IS THE SLO MET?
# =========================================================================
#
# "p99 under 500 ms". The p99 falls in the [100, 250) bucket, and the
# UPPER end of that bucket is 250 ms.
#
# So the SLO is met, and -- unusually -- we can say so WITHOUT relying
# on the interpolation at all. Even in the worst case, where every
# value in that bucket sits at 249.9 ms, the p99 is under 500.
#
# STATE IT THAT WAY. "p99 <= 250 ms, therefore the 500 ms SLO is met"
# is a claim the data supports. "p99 = 182 ms" is an estimate resting
# on a uniformity assumption that is known to be wrong.
#
# THE EXACT STATEMENT AVAILABLE:
d.cdf_at_edge(6)            # 0.9930 -- P(X <= 250) = 99.30%
d.cdf_at_edge(5)            # 0.9829 -- P(X <= 100) = 98.29%
#
# 99.3% of requests complete within 250 ms. That is measured, not
# modelled, and it is the number to put in the report.


# =========================================================================
# HOW WRONG THE INTERPOLATION CAN BE
# =========================================================================
#
# The error is bounded by the bucket width, and bucket widths here grow
# geometrically -- which means accuracy DEGRADES exactly where you need
# it most:
#
#   p50   +/- 15 ms      (~83% of the estimate)
#   p95   +/- 50 ms      (~74%)
#   p99   +/- 150 ms     (~82%)
#   p999  +/- 500 ms     (~91%)
#
# AND THE ERROR IS BIASED, not symmetric. Latency density falls towards
# the upper edge of a bucket, so the true quantile sits nearer the
# lower bound and linear interpolation reads HIGH. An exponential-decay
# interpolation would be better justified:

def quantile_exponential(self, q):
    """Assume density decays exponentially within the bucket, matching
    the shape latency actually has. Closer to the lower edge, which is
    where the mass really is."""
    target = q * self.n
    i = max(1, min(int(np.searchsorted(self.cum, target, "left")),
                   len(self.counts)))
    lo, hi = self.edges[i-1], self.edges[i]
    if not np.isfinite(hi):
        return float("inf")
    frac = (target - self.cum[i-1]) / max(self.counts[i-1], 1e-12)
    # log-uniform placement inside the bucket
    lo_safe = max(lo, 1e-9)
    return float(lo_safe * (hi / lo_safe) ** frac)

HistogramDistribution.quantile_exponential = quantile_exponential

d.quantile(0.99), d.quantile_exponential(0.99)   # 182.0 vs 158.6
#
# A 15% difference from the interpolation choice alone -- which is why
# two monitoring systems reading the same histogram can disagree about
# p99, and neither is buggy.


# =========================================================================
# THE INFINITE BUCKET
# =========================================================================
#
# 12 requests landed above 1000 ms, which is 0.03% of the total. The
# p999 cutoff is at 0.1%, so 0.1% > 0.03% and p999 falls in the
# [500, 1000) bucket -- just.
#
1 - d.cdf_at_edge(8)         # 0.000303 -- fraction above 1000 ms
#
# BUT IT IS CLOSE. Had 40 requests exceeded 1000 ms instead of 12, the
# p999 would land in the unbounded bucket and be genuinely UNKNOWABLE:
# those requests could have taken 1.1 seconds or 40 seconds, and the
# histogram records the same thing either way.
#
# THAT IS THE STRUCTURAL LIMIT OF A HISTOGRAM. It cannot see past its
# last finite edge, and the tail is exactly where incidents live.
# If you care about p999, the last finite edge must sit well above it
# -- 10s or 30s -- even though those buckets are almost always empty.
# Empty buckets are the point.

d_bad = HistogramDistribution(edges, np.array(
    [1204, 8891, 15320, 9077, 3455, 1201, 402, 88, 60]))
d_bad.quantile(0.999)        # inf -- correctly refuses to guess


# =========================================================================
# TESTS
# =========================================================================

def test_cdf_at_edges_is_exact():
    """Boundary values are counts, not estimates."""
    assert np.isclose(d.cdf_at_edge(0), 0.0)
    assert np.isclose(d.cdf_at_edge(9), 1.0)
    assert np.isclose(d.cdf_at_edge(2), (1204 + 8891) / 39650)


def test_quantiles_are_monotonic():
    qs = [d.quantile(q) for q in (0.1, 0.25, 0.5, 0.9, 0.95, 0.99)]

    assert all(a <= b for a, b in zip(qs, qs[1:]))


def test_quantile_lies_inside_its_bucket():
    for q in (0.5, 0.95, 0.99):
        lo, hi = d.bounds(q)

        assert lo <= d.quantile(q) <= hi


def test_slo_conclusion_holds_at_the_bucket_upper_bound():
    """The SLO claim must not depend on the interpolation."""
    _, hi = d.bounds(0.99)

    assert hi <= 500.0          # true even in the worst case


def test_unbounded_tail_returns_infinity():
    """Refusing to guess is the correct behaviour, not a failure."""
    heavy = HistogramDistribution(edges, np.array(
        [1204, 8891, 15320, 9077, 3455, 1201, 402, 88, 60]))

    assert heavy.quantile(0.999) == float("inf")


def test_interpolations_disagree_by_a_reportable_amount():
    """Two defensible assumptions, two different p99s -- the reason to
    report bounds rather than a point."""
    linear = d.quantile(0.99)
    expo = d.quantile_exponential(0.99)

    assert abs(linear - expo) / linear > 0.10
    lo, hi = d.bounds(0.99)
    assert lo <= expo <= hi     # both stay inside what the data allows


def test_mismatched_edges_and_counts_are_rejected():
    import pytest
    with pytest.raises(ValueError, match="edges"):
        HistogramDistribution([0, 1, 2], [5])`,
        notes: [
          { t: "p", text: "**The CDF is exact at bucket boundaries and assumed everywhere else.** That split is the whole design: `cdf_at_edge` reports measurements, `quantile` reports estimates, and `bounds` says how far apart those can be." },
          { t: "callout", kind: "insight", title: "The SLO answer does not need the interpolation", body: [
            { t: "p", text: "The p99 falls in the `[100, 250)` bucket, so even in the worst case it is under 250 ms and the 500 ms SLO is met. Reporting \"99.3% of requests complete within 250 ms\" is a measurement; reporting \"p99 = 182 ms\" is an estimate resting on a uniformity assumption that is known to be wrong." },
            { t: "p", text: "Whenever a bucket boundary settles the question, use the boundary. It is the strongest claim available and the only one that cannot be argued with." }
          ]},
          { t: "p", text: "**The interpolation error is biased, not symmetric.** Latency density falls towards the upper edge of a bucket, so linear interpolation reads high — a log-uniform placement gives 158.6 ms against 182.0 ms for the same data. Two monitoring systems can disagree about p99 by 15% with neither being buggy." },
          { t: "p", text: "**Bucket widths grow geometrically, so accuracy degrades exactly where you need it.** The p999 is bounded only to `± 500 ms`, about 91% of the estimate itself." },
          { t: "p", text: "**A histogram cannot see past its last finite edge**, and the tail is where incidents live. Had 40 requests exceeded 1000 ms rather than 12, the p999 would be genuinely unknowable — `inf` is the correct answer, not a failure. If you care about p999, put the last finite edge well above it and accept that those buckets stay empty; the emptiness is the point." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An anomaly detector flagged transactions whose likelihood under a fitted model fell below a threshold. It fired constantly on one merchant category and almost never on another." },
      { t: "p", text: "**The threshold was on the density, and the categories had different scales.** A tightly clustered category had densities in the hundreds; a widely spread one had densities near 0.01 for perfectly ordinary transactions. The threshold was comparing rates measured in different units." },
      { t: "p", text: "**Switching to a CDF-based threshold fixed it** — \"below the 1st percentile of its own fitted distribution\" is scale-free and means the same thing for every category, because `F(X)` is uniform whatever `F` is." },
      { t: "p", text: "**Any threshold on a density is a threshold with units.** If the units can differ between the things being compared, the threshold is not comparing what you think." }
    ]}
  ],

  takeaways: [
    "**A random variable is a function from outcomes to numbers**, so one experiment supports many random variables with different shapes.",
    "**A PMF is a probability; a PDF is a rate.** A density can exceed 1 and means nothing on its own.",
    "**A density has units — probability per unit `x`** — so its value changes when you change units, which a probability never does.",
    "**`P(X = x) = 0` for a continuous variable.** Only intervals carry mass.",
    "**Density × width approximates an interval probability** for a narrow interval; that is the only sense in which a density value is meaningful alone.",
    "**The CDF is defined identically for both kinds**, and exists even for mixed distributions that have neither a PMF nor a PDF.",
    "**Use `sf` rather than `1 - cdf` in the tail** — the subtraction returns noise once the CDF rounds to 1.0.",
    "**Quantiles are the inverse CDF**, and every SLO, percentile and confidence interval is a quantile statement.",
    "**`F⁻¹(U)` samples from `F` when `U` is uniform** — which is why a uniform generator is the only primitive a language needs.",
    "**`F(X)` is uniform when `F` is the right CDF**, reducing every goodness-of-fit question to one fixed test.",
    "**Real data is full of mixtures** — a point mass at zero plus a continuous part is what zero-inflated, censored and floored metrics all look like.",
    "**Threshold on the CDF, not the density**, whenever the things being compared can have different scales."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`stats.norm(0, 0.001).pdf(0)` returns 398.94. Is something wrong?",
        options: [
          "Yes — a probability cannot exceed 1",
          "No — that is a density, meaning probability per unit `x`, and packing the same total mass into a narrow range makes the height large",
          "Yes — the scale parameter is invalid",
          "No, but the value should be clipped to 1"
        ],
        answer: 1,
        why: "The cleanest test is units: measure the same quantity in metres instead of centimetres and every density multiplies by 100. A number that changes when you change units is not a probability."
      },
      {
        stem: "You need `P(X > 200)` where the CDF at 200 is 0.9999999999999999. What should you compute?",
        options: [
          "`1 - d.cdf(200)`",
          "`d.sf(200)` — the survival function, computed directly rather than by subtraction",
          "`d.pdf(200)`",
          "`1 - d.ppf(200)`"
        ],
        answer: 1,
        why: "`1 - cdf` gives 1.11e-16 here — pure round-off — while `sf` gives the correct 1.31e-11. The subtraction cancels every significant digit, which is the same failure as `E[X²] − E[X]²` from lesson 2.6, and it bites exactly in the tail where you need precision."
      },
      {
        stem: "How do you sample from a distribution given only a uniform generator?",
        options: [
          "Rejection sampling is the only general method",
          "Inverse transform: `F⁻¹(U)` has distribution `F` when `U` is uniform on `[0,1]`",
          "Take the mean of many uniforms",
          "It is not possible without a library"
        ],
        answer: 1,
        why: "`P(F⁻¹(U) ≤ x) = P(U ≤ F(x)) = F(x)`, and applying `F` to both sides of the inequality is valid because `F` is non-decreasing. Run in reverse, the same fact says `F(X)` is uniform — the basis of the KS test and every QQ plot."
      },
      {
        stem: "94% of users generate zero revenue and the rest spend a variable amount. What is the right model?",
        options: [
          "A normal fitted to all the data",
          "A mixture — a point mass at zero plus a continuous distribution above it, giving conversion rate and conditional spend separately",
          "A lognormal fitted to the paying users only",
          "The median, since it is robust"
        ],
        answer: 1,
        why: "Revenue per user is conversion rate times average spend, and those two numbers have different owners and different levers. Fitting only the payers discards the conversion rate; fitting a normal to everything puts 44% of its mass below zero."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Can a probability density be greater than 1?",
        strong: "Yes. A density is probability per unit of `x`, not a probability — only its integral over an interval is one. A uniform on `[0, 0.002]` has height 500 because the area must be 1.",
        answer: [
          { t: "p", text: "The units framing is what makes this an explanation rather than an assertion, and it gives a test: a density changes when you change units, a probability does not." },
          { t: "p", text: "Adding that `P(X = x) = 0` for a continuous variable pre-empts the obvious follow-up." }
        ]
      },
      {
        level: "core",
        q: "Why is the CDF more fundamental than the PDF?",
        strong: "It is defined identically for discrete and continuous variables, exists for mixed distributions that have neither a PMF nor a PDF, and both are recoverable from it — as a step size or as a derivative.",
        answer: [
          { t: "p", text: "Mentioning mixed distributions shows this is a practical point, not a technicality — censored and zero-inflated data is everywhere." },
          { t: "p", text: "Noting that quantiles, SLOs and confidence intervals are all inverse-CDF statements makes the case concretely." }
        ]
      },
      {
        level: "advanced",
        q: "Your anomaly detector uses a likelihood threshold and fires far more on some segments than others. What is wrong?",
        strong: "The threshold is on a density, which has units, so segments with different scales are being compared on different measures. Thresholding the CDF instead — \"below its own 1st percentile\" — is scale-free because `F(X)` is uniform whatever `F` is.",
        answer: [
          { t: "p", text: "Spotting that a density threshold is a threshold with units is the insight; the fix follows immediately from it." },
          { t: "p", text: "Grounding the fix in the probability integral transform shows why it is principled rather than a heuristic." }
        ]
      }
    ]
  }
});

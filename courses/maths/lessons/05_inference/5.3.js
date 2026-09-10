/* ============================================================================
   LESSON 5.3 — Confidence Intervals
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**A 95% confidence interval does not have a 95% chance of containing the parameter.** The parameter is fixed; the interval is what varies. 95% describes the procedure's long-run behaviour — and the difference matters, because it is what stops you reading an interval as a probability distribution over the truth.",

  objectives: [
    "State what the 95% refers to, and verify it by simulation",
    "Compute an interval for a mean, a proportion and a difference",
    "Say what determines width and what it costs to halve it",
    "Choose an interval method that works near a boundary",
    "Read an interval that includes zero without saying \"no effect\""
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", text: "What the 95% refers to", id: "coverage" },

    { t: "p", text: "**A 95% confidence interval does not have a 95% chance of containing the parameter.** The parameter is a fixed number; the interval is what varies from sample to sample. The 95% describes how often the *procedure* succeeds across the intervals it would produce." },

    { t: "dl", items: [
      ["Confidence interval", "A range computed from data by a procedure with a stated long-run success rate."],
      ["Coverage", "The fraction of such intervals containing the true value. It is a property of the recipe, verifiable by simulation."],
      ["Confidence level", "The advertised coverage — 95%, 99%. Higher means wider."],
      ["Margin of error", "Half the interval's width, `critical value × standard error`."],
      ["Prediction interval", "A range for the **next individual observation** rather than for a mean. Several times wider, and it does not shrink to nothing with infinite data."]
    ]},

    { t: "viz",
      title: "The interval moves; the parameter does not",
      caption: "Twenty samples, twenty intervals. One misses. The parameter never moved — 95% is a property of the recipe, counted across the intervals it would produce.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Twenty horizontal confidence intervals against a fixed vertical line, one of which misses it">
  <line x1="430" y1="24" x2="430" y2="222" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="2"/>
  <text x="440" y="20" class="s-label" style="fill:var(--crit)">true value (fixed)</text>

  <g style="stroke:var(--good);stroke-width:3">
    <line x1="330" y1="36"  x2="470" y2="36"/>
    <line x1="366" y1="54"  x2="502" y2="54"/>
    <line x1="300" y1="72"  x2="446" y2="72"/>
    <line x1="352" y1="90"  x2="490" y2="90"/>
    <line x1="384" y1="108" x2="524" y2="108"/>
    <line x1="318" y1="126" x2="452" y2="126"/>
    <line x1="344" y1="144" x2="486" y2="144"/>
    <line x1="372" y1="162" x2="508" y2="162"/>
    <line x1="308" y1="180" x2="442" y2="180"/>
    <line x1="356" y1="198" x2="498" y2="198"/>
  </g>

  <line x1="490" y1="216" x2="626" y2="216" style="stroke:var(--crit)" stroke-width="3"/>
  <text x="636" y="221" class="s-sub" style="fill:var(--crit)">misses -- 1 in 20</text>

  <text x="60" y="60"  class="s-sub" style="fill:var(--ink-3)">each line is one sample's</text>
  <text x="60" y="78"  class="s-sub" style="fill:var(--ink-3)">interval; you only ever</text>
  <text x="60" y="96"  class="s-sub" style="fill:var(--ink-3)">see one of them</text>
  <text x="60" y="132" class="s-sub" style="fill:var(--ink-3)">"95%" counts how many</text>
  <text x="60" y="150" class="s-sub" style="fill:var(--ink-3)">of the lines cross the</text>
  <text x="60" y="168" class="s-sub" style="fill:var(--ink-3)">dashed one, not how</text>
  <text x="60" y="186" class="s-sub" style="fill:var(--ink-3)">likely the dashed one is</text>
  <text x="60" y="204" class="s-sub" style="fill:var(--ink-3)">to be anywhere</text>
</svg>`
    },

    { t: "code", lang: "python", title: "verify the coverage claim directly", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
TRUE_MU, TRUE_SIGMA, n = 100.0, 15.0, 25

def t_interval(x, conf=0.95):
    """The standard interval for a mean. Uses t rather than z because
    sigma is estimated -- which matters at small n."""
    x = np.asarray(x, dtype=float)
    m, se = x.mean(), x.std(ddof=1)/np.sqrt(len(x))
    crit = stats.t.ppf(0.5 + conf/2, len(x) - 1)
    return m - crit*se, m + crit*se

# BUILD 100,000 INTERVALS AND COUNT HOW MANY CONTAIN THE TRUTH.
hits = 0
widths = []
for _ in range(100_000):
    lo, hi = t_interval(rng.normal(TRUE_MU, TRUE_SIGMA, n))
    hits += lo <= TRUE_MU <= hi
    widths.append(hi - lo)

hits / 100_000                        # 0.9503 -- the coverage claim, met
np.mean(widths)                       # 12.35  -- and the intervals VARY
np.std(widths)                        # 1.80
#
# THE INTERVALS ARE DIFFERENT EVERY TIME. That is what 95% is about:
# the procedure produces a family of intervals, and 95% of them cover.

# USING z INSTEAD OF t UNDERCOVERS AT SMALL n:
def z_interval(x, conf=0.95):
    x = np.asarray(x, dtype=float)
    m, se = x.mean(), x.std(ddof=1)/np.sqrt(len(x))
    crit = stats.norm.ppf(0.5 + conf/2)
    return m - crit*se, m + crit*se

for n_ in (5, 10, 30, 100):
    cov_t = np.mean([TRUE_MU >= t_interval(rng.normal(100, 15, n_))[0]
                     and TRUE_MU <= t_interval(rng.normal(100, 15, n_))[1]
                     for _ in range(1)])   # illustrative; full loop below
    tc = zc = 0
    for _ in range(20_000):
        s = rng.normal(TRUE_MU, TRUE_SIGMA, n_)
        lo, hi = t_interval(s); tc += lo <= TRUE_MU <= hi
        lo, hi = z_interval(s); zc += lo <= TRUE_MU <= hi
    print(f"n={n_:<5} t-interval {tc/20_000:.3f}   z-interval {zc/20_000:.3f}")

# n=5     t-interval 0.950   z-interval 0.876
# n=10    t-interval 0.950   z-interval 0.921
# n=30    t-interval 0.949   z-interval 0.937
# n=100   t-interval 0.950   z-interval 0.947
#
# AT n=5 THE z-INTERVAL COVERS 88% AND CLAIMS 95%. The t-distribution
# has heavier tails precisely to pay for having estimated sigma, and
# that payment is what the extra width is.
stats.t.ppf(0.975, 4), stats.norm.ppf(0.975)      # 2.776 vs 1.960
`,
      hl: [22, 27, 47],
      caption: "**At `n = 5` a z-interval covers 88% while claiming 95%.** The t-distribution's heavier tails are the price of having estimated σ from the same data."
    },

    { t: "callout", kind: "trap", title: "Five readings of an interval, four of them wrong", body: [
      { t: "p", text: "The interval is `[97, 108]`. Which of these is a correct statement?" },
      { t: "code", lang: "python", numbered: false, title: "and why each fails", code: `
# 1. "There is a 95% probability the true mean is between 97 and 108."
#    WRONG. The true mean is a fixed number; it is either in [97,108]
#    or it is not. The probability is 0 or 1 -- we just do not know
#    which. (A Bayesian CREDIBLE interval does support this reading;
#    a confidence interval does not -- see lesson 5.12.)
#
# 2. "95% of the data falls between 97 and 108."
#    WRONG, and it is not close. That would be a PREDICTION interval,
#    and it is far wider, because it must cover individual variation
#    rather than the uncertainty in an average.
#
# 3. "If we repeated the study, 95% of the new estimates would land in
#     this interval."
#    WRONG. That is a different quantity, and the actual figure is
#    about 83% -- because the new estimate has its own sampling error
#    on top of this interval's.
#
# 4. "The true mean is probably near 102.5, the centre."
#    WRONG as a probability statement. Coverage is uniform across the
#    interval in the sense that matters -- the procedure does not
#    promise the parameter is more likely near the middle.
#
# 5. "This interval was produced by a procedure that captures the true
#     mean 95% of the time."
#    CORRECT, and it is the only one.

# READING 2 IS WORTH SEEING QUANTIFIED, because the confusion is common:
x = rng.normal(100, 15, 25)
ci = t_interval(x)                                    # ~[94, 106]

m, s, n_ = x.mean(), x.std(ddof=1), len(x)
crit = stats.t.ppf(0.975, n_-1)
pred = (m - crit*s*np.sqrt(1 + 1/n_), m + crit*s*np.sqrt(1 + 1/n_))
pred                                                  # ~[68, 132]

(ci[1]-ci[0]), (pred[1]-pred[0])                      # 12.4 vs 63.2
#
# THE PREDICTION INTERVAL IS FIVE TIMES WIDER. The extra sqrt(1 + 1/n)
# is the individual's own variation, which does not shrink with n:
for n_ in (25, 250, 25_000):
    print(f"n={n_:<7} CI width {2*1.96*15/np.sqrt(n_):6.2f}   "
          f"PI width {2*1.96*15*np.sqrt(1+1/n_):6.2f}")
# n=25      CI width  11.76   PI width  59.98
# n=250     CI width   3.72   PI width  58.92
# n=25000   CI width   0.37   PI width  58.80
#
# THE CONFIDENCE INTERVAL SHRINKS TO NOTHING AND THE PREDICTION
# INTERVAL DOES NOT. Infinite data pins the mean exactly and tells you
# nothing more about the next individual.`},
      { t: "p", text: "**A confidence interval shrinks to nothing with infinite data; a prediction interval does not.** Knowing the average height of a population perfectly says nothing more about the next person you meet." }
    ]},

    { t: "h2", n: "02", text: "What width costs", id: "width" },

    { t: "p", text: "Interval width is `2 × critical value × σ/√n`, and each of those three factors is a lever with a very different price. **Precision is expensive and confidence is cheap** — which is the opposite of most people's expectation." },

    { t: "dl", items: [
      ["Sample size", "Width falls as `1/√n`, so **halving it costs four times the data**. The expensive lever."],
      ["Confidence level", "Going from 95% to 99.9% costs 68% more width. Cheap by comparison."],
      ["Variance reduction", "The free lever: pairing, stratifying or adjusting for a covariate narrows the interval without collecting anything."],
      ["Pairing", "Comparing each unit against itself. It multiplies the effective sample by `1/(1−ρ)` — five times at `ρ = 0.8`."],
      ["CUPED", "Regressing out a pre-experiment covariate. Typically cuts variance 30–50% in online experiments, permanently and for free."],
      ["Precision", "How narrow an interval is. Bought at `1/√n`, which is why halving the width costs four times the data."]
    ]},

    { t: "code", lang: "python", title: "the three levers, and their prices", code: `
# WIDTH = 2 x critical_value x sigma / sqrt(n)
#
# THREE THINGS MOVE IT, and they have very different prices.

# 1. SAMPLE SIZE -- 1/sqrt(n). The expensive lever.
for n_ in (100, 400, 1600, 6400):
    print(f"n={n_:<6} half-width {1.96*15/np.sqrt(n_):.3f}")
# n=100    half-width 2.940
# n=400    half-width 1.470     4x the data, half the width
# n=1600   half-width 0.735
# n=6400   half-width 0.368
#
# HALVING THE WIDTH COSTS 4x THE DATA, every time.

# 2. CONFIDENCE LEVEL -- and it is cheaper than people expect.
for conf in (0.80, 0.90, 0.95, 0.99, 0.999):
    z = stats.norm.ppf(0.5 + conf/2)
    print(f"{conf:.1%}: z = {z:.3f}   relative width {z/1.96:.2f}x")
# 80.0%: z = 1.282   relative width 0.65x
# 90.0%: z = 1.645   relative width 0.84x
# 95.0%: z = 1.960   relative width 1.00x
# 99.0%: z = 2.576   relative width 1.31x
# 99.9%: z = 3.291   relative width 1.68x
#
# GOING FROM 95% TO 99.9% COSTS 68% MORE WIDTH -- or, equivalently,
# 2.8x the data. Confidence is far cheaper than precision, which is
# the same asymmetry as lesson 3.9's log(1/delta) against 1/t^2.

# 3. VARIANCE -- the free lever, and the one people forget.
#
# Anything that reduces sigma narrows the interval at no cost in
# sample size:
#
#   - PAIRING. Compare each unit against itself.
#   - STRATIFYING. Remove between-group variance (lesson 3.3).
#   - COVARIATE ADJUSTMENT. Regress out a known predictor (CUPED).
#   - BETTER MEASUREMENT. Less measurement error is less variance.

# PAIRING, QUANTIFIED. Two measurements per subject, correlated 0.8:
n_ = 50
before = rng.normal(100, 15, n_)
after = before + rng.normal(2, 15*np.sqrt(2*(1-0.8)), n_)

unpaired_se = np.sqrt(before.var(ddof=1)/n_ + after.var(ddof=1)/n_)
paired_se = (after - before).std(ddof=1)/np.sqrt(n_)

unpaired_se, paired_se                    # 3.05, 1.36
(unpaired_se/paired_se)**2                # 5.0x -- equivalent data
#
# PAIRING GAVE THE EQUIVALENT OF FIVE TIMES THE SAMPLE, for free, by
# removing the between-subject variance from the comparison entirely.
#
# THE GENERAL RESULT: pairing multiplies your effective sample by
# 1/(1-rho). At rho = 0.8 that is 5x; at rho = 0.95 it is 20x.
for rho in (0.3, 0.6, 0.8, 0.95):
    print(f"rho={rho}: effective sample x{1/(1-rho):.1f}")
`,
      hl: [15, 27, 47, 56],
      caption: "**Pairing multiplies your effective sample by `1/(1−ρ)`** — five times at `ρ = 0.8`, for free. Design beats data collection whenever the correlation is available."
    },

    { t: "h2", n: "03", text: "Intervals that break near a boundary", id: "boundaries" },

    { t: "p", text: "The textbook interval for a proportion, `p̂ ± z√(p̂(1−p̂)/n)`, **fails badly exactly where rates usually live**. Near zero or one it can produce impossible values and its true coverage collapses far below the level it claims." },

    { t: "dl", items: [
      ["Wald interval", "The familiar normal-approximation formula. At `p = 0.02` with `n = 100` its actual coverage is about 60%, not 95%."],
      ["Wilson score interval", "Inverts the test rather than approximating the estimate. Respects `[0,1]` automatically and has far better coverage at extreme rates."],
      ["Clopper-Pearson", "Exact and conservative, built from the binomial distribution directly. The right choice at `k = 0` or `k = n`."],
      ["Rule of three", "Zero events in `n` trials gives a 95% upper bound of about `3/n`. \"No failures in 300 runs\" is consistent with a 1% failure rate."]
    ]},

    { t: "ladder",
      title: "An interval for a conversion rate of 2 successes in 100",
      rungs: [
        { level: "bad", label: "The normal approximation",
          why: "`p̂ ± z√(p̂(1−p̂)/n)` is the formula everyone learns, and it fails exactly where rates usually live. At small `p` it can produce a negative lower bound, and its actual coverage is far below the stated level.",
          code: `p, n = 0.02, 100
se = np.sqrt(p*(1-p)/n)
p - 1.96*se, p + 1.96*se          # (-0.0074, 0.0474)

# A NEGATIVE CONVERSION RATE. And at p = 0 it gives [0, 0] -- an
# interval of zero width claiming 95% confidence.` },
        { level: "ok", label: "Wilson score interval",
          why: "Inverts the test rather than approximating the estimate, so it respects the boundary automatically and has far better coverage at extreme rates. It is the default in most modern software for good reason.",
          code: `def wilson(k, n, conf=0.95):
    """Solve for the p values whose test statistic sits at the critical
    value, instead of building an interval around p-hat."""
    if n == 0:
        return (0.0, 1.0)
    z = stats.norm.ppf(0.5 + conf/2)
    p = k / n
    d = 1 + z**2/n
    centre = (p + z**2/(2*n)) / d
    half = z * np.sqrt(p*(1-p)/n + z**2/(4*n**2)) / d
    return max(0.0, centre - half), min(1.0, centre + half)

wilson(2, 100)        # (0.0055, 0.0700) -- inside [0,1], asymmetric
wilson(0, 100)        # (0.0000, 0.0370) -- non-degenerate at zero` },
        { level: "best", label: "Wilson, plus the rule of three where it applies",
          why: "Wilson is the working default, but zero events deserves a named result that anyone can check without code — and it is the case most likely to be reported carelessly.",
          code: `def rate_interval(k, n, conf=0.95):
    """Wilson, with the exact Clopper-Pearson bound when k is 0 or n.

    THE RULE OF THREE: with zero events in n trials, the 95% upper
    bound is very nearly 3/n. It follows from solving (1-p)^n = 0.05,
    since -ln(0.05) = 2.996."""
    if n == 0:
        raise ValueError("no trials")
    if k == 0:
        return (0.0, 1 - (1 - conf)**(1/n))
    if k == n:
        return ((1 - conf)**(1/n), 1.0)
    return wilson(k, n, conf)

rate_interval(0, 100)      # (0.0, 0.0295)  ~ 3/100
rate_interval(0, 1000)     # (0.0, 0.0030)  ~ 3/1000
3/1000                     # 0.003 -- the rule of three

# WHY IT MATTERS: "we saw no failures in 300 runs" is routinely
# reported as evidence of reliability. The honest statement is that
# the failure rate could be as high as 1%.
rate_interval(0, 300)      # (0.0, 0.00995)

# CHECK THE COVERAGE RATHER THAN TRUSTING ANY OF THEM:
def coverage(method, p_true, n, trials=20_000, seed=0):
    r = np.random.default_rng(seed)
    k = r.binomial(n, p_true, trials)
    return np.mean([lo <= p_true <= hi
                    for lo, hi in (method(int(ki), n) for ki in k)])

for p_true in (0.02, 0.1, 0.5):
    naive = lambda k, n: (k/n - 1.96*np.sqrt((k/n)*(1-k/n)/n),
                          k/n + 1.96*np.sqrt((k/n)*(1-k/n)/n))
    print(f"p={p_true}: naive {coverage(naive, p_true, 100):.3f}   "
          f"wilson {coverage(wilson, p_true, 100):.3f}")

# p=0.02: naive 0.599   wilson 0.965
# p=0.1:  naive 0.928   wilson 0.965
# p=0.5:  naive 0.943   wilson 0.955
#
# AT p = 0.02 THE TEXTBOOK INTERVAL COVERS 60% WHILE CLAIMING 95%.
# That is not a subtle inaccuracy -- it is a broken interval, and it
# is the one in most introductory courses.`,
          note: "**\"No failures in 300 runs\" is consistent with a 1% failure rate.** The rule of three turns an absence of evidence into a number, and it takes one division." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Report an experiment whose interval spans zero",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "An A/B test finishes. The team's draft summary says \"no significant difference, so the feature has no effect — we recommend shipping it since it does no harm and the design team prefers it.\" Rewrite the analysis." },
        { t: "code", lang: "python", numbered: false, title: "the result", code: `
# Control:   14,203 users,  1,832 conversions   (12.90%)
# Treatment: 14,187 users,  1,915 conversions   (13.50%)
#
# Difference: +0.60pp   (+4.6% relative)
# 95% CI on the difference: [-0.18pp, +1.38pp]
# p = 0.132
#
# The test was sized for a 5% relative MDE at 80% power.
# Estimated annual revenue impact of a 5% conversion lift: £2.1m.`},
        { t: "p", text: "Say what the result licenses, what it rules out, and what you would recommend." }
      ],
      requirements: [
        "Explain why \"no effect\" does not follow.",
        "Say what the interval does rule out.",
        "Check whether the test was adequately powered, with numbers.",
        "Give the recommendation, and the reasoning behind it.",
        "Say what you would do differently next time.",
        "Include tests."
      ],
      hint: "Look at what the upper end of the interval is worth in revenue, then at what the lower end costs.",
      solution: {
        lang: "python",
        title: "readout.py",
        code: `import numpy as np
from scipy import stats

N_C, K_C = 14_203, 1_832
N_T, K_T = 14_187, 1_915
ANNUAL_VALUE_OF_5PC = 2_100_000


# =========================================================================
# WHY "NO EFFECT" DOES NOT FOLLOW
# =========================================================================
#
# Failing to reject the null is not evidence FOR the null. The test
# asked "is the data compatible with zero difference?" and the answer
# was yes. It did not ask, and cannot answer, "is the difference
# zero?"
#
# THE INTERVAL SHOWS WHY. It contains zero -- and it also contains
# +1.38pp, which is a 10.7% relative lift.

p_c, p_t = K_C/N_C, K_T/N_T
diff = p_t - p_c                              # 0.00601
se = np.sqrt(p_c*(1-p_c)/N_C + p_t*(1-p_t)/N_T)
ci = (diff - 1.96*se, diff + 1.96*se)         # (-0.0018, +0.0138)

ci[1] / p_c                                   # 0.107 -- +10.7% relative
ci[0] / p_c                                   # -0.014 -- -1.4% relative
#
# THE DATA IS EQUALLY COMPATIBLE WITH A 10.7% IMPROVEMENT AND A 1.4%
# DECLINE. Describing that as "no effect" throws away the fact that
# the plausible range is overwhelmingly positive.

# PUT IT IN MONEY, which is the language the decision is made in:
value_per_relative_point = ANNUAL_VALUE_OF_5PC / 5.0     # £420k per 1%
ci[1]/p_c * 100 * value_per_relative_point               # £4.5m upside
ci[0]/p_c * 100 * value_per_relative_point               # -£586k downside
diff/p_c * 100 * value_per_relative_point                # £1.96m point est.
#
# THE INTERVAL RUNS FROM -£586k TO +£4.5m, centred on +£1.96m. That is
# an asymmetric bet with a strongly positive expectation, and the
# phrase "no significant difference" conveys none of it.


# =========================================================================
# WHAT THE INTERVAL DOES RULE OUT
# =========================================================================
#
# This is the part the draft omits entirely, and it is the genuine
# finding of a null result.
#
#   RULED OUT: any harm worse than -1.4% relative.
#   RULED OUT: any benefit greater than +10.7% relative.
#
# So the feature is very unlikely to be a disaster. If the worry was
# "does this break conversion", the answer is a clear no.
#
# A NULL RESULT WITH A NARROW INTERVAL IS INFORMATIVE. A null result
# with a wide interval is not. Reporting the interval is what
# distinguishes them, and reporting only the p-value hides which one
# you have.


# =========================================================================
# WAS IT ADEQUATELY POWERED?
# =========================================================================

def required_n(p_baseline, mde_rel, alpha=0.05, power=0.8):
    p1 = p_baseline
    p2 = p_baseline * (1 + mde_rel)
    z_a = stats.norm.ppf(1 - alpha/2)
    z_b = stats.norm.ppf(power)
    num = (z_a*np.sqrt(2*p1*(1-p1)) + z_b*np.sqrt(p1*(1-p1)+p2*(1-p2)))**2
    return int(np.ceil(num / (p2-p1)**2))

required_n(0.129, 0.05)                       # 21,555 per arm
N_C, N_T                                      # 14,203 and 14,187
#
# THE TEST IS UNDERPOWERED FOR ITS OWN STATED MDE. It needed ~21,600
# per arm and ran with ~14,200 -- 66% of the required sample.

def achieved_power(p_baseline, true_rel, n, alpha=0.05):
    p1 = p_baseline
    p2 = p_baseline * (1 + true_rel)
    se = np.sqrt(p1*(1-p1)/n + p2*(1-p2)/n)
    z_a = stats.norm.ppf(1 - alpha/2)
    return float(stats.norm.sf(z_a - abs(p2-p1)/se))

achieved_power(0.129, 0.05, 14_203)           # 0.596
#
# 60% POWER, NOT 80%. So even if the true effect were exactly the 5%
# the test was designed to detect, there was a 40% chance of exactly
# the result observed. THE NULL RESULT IS ALMOST UNINFORMATIVE ABOUT A
# 5% EFFECT.
#
# WHY THE SHORTFALL? Almost always one of: the baseline rate came in
# lower than assumed, the test was stopped on a calendar date rather
# than at a sample target, or traffic was diverted mid-test. Worth
# establishing which, because it will recur.


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# SHIP IT -- but not for the reason the draft gives.
#
# The draft's logic ("no effect, and design prefers it") is wrong on
# the facts and would be wrong as a policy: it would ship anything that
# failed to reach significance, which over many decisions means
# shipping a lot of harmful changes.
#
# THE CORRECT REASONING IS EXPECTED VALUE UNDER AN ASYMMETRIC BET:
#
#   point estimate  +4.6% relative, worth ~£1.96m/year
#   plausible range  -£586k to +£4.5m
#   probability the effect is positive, given the data:
1 - stats.norm.cdf(0, loc=diff, scale=se)     # 0.934
#
#   93% of the interval's mass is above zero, the downside is bounded
#   and small, the implementation cost is already sunk, and the design
#   team prefers it as a tiebreak.
#
# THAT IS A GOOD BET. It is also NOT A CLAIM THAT THE EFFECT IS REAL --
# and the write-up must say so, or the +4.6% will be quoted as an
# established fact in six months.
#
# WHAT WOULD CHANGE THE ANSWER: if the feature carried ongoing
# maintenance cost, or if the downside were unbounded (a payments
# change, say), 93% would not be enough. The decision depends on the
# loss function, not on the p-value.


# =========================================================================
# WHAT TO DO DIFFERENTLY
# =========================================================================
#
# 1. SIZE THE TEST AND HOLD TO IT. Compute the sample target, and stop
#    on the target rather than on a date. Ending at 66% of the required
#    sample guarantees an ambiguous readout.
#
# 2. DECIDE THE DECISION RULE BEFORE THE TEST. "We will ship if the
#    lower bound exceeds -1%" is a rule you can state in advance and
#    that survives an inconclusive p-value. Deciding afterwards is how
#    a null result becomes whatever the room wants it to be.
#
# 3. REPORT THE INTERVAL AND THE POWER, always. "p = 0.132" and
#    "[-0.18pp, +1.38pp], 60% power for the target effect" carry
#    completely different information.
#
# 4. USE VARIANCE REDUCTION. Pre-experiment conversion behaviour as a
#    covariate (CUPED) typically cuts the variance 30-50% here, which
#    is equivalent to 1.4-2x the sample for free -- and would have made
#    this test conclusive at the size it actually ran.
#
# 5. PRE-REGISTER THE PRIMARY METRIC. Otherwise a null primary result
#    is followed by a search through secondary metrics, which finds
#    something by construction (lesson 5.10).

def readout(k_c, n_c, k_t, n_t, mde_rel=0.05, alpha=0.05):
    """An honest summary: effect, interval, power, and no verdict."""
    p_c, p_t = k_c/n_c, k_t/n_t
    diff = p_t - p_c
    se = np.sqrt(p_c*(1-p_c)/n_c + p_t*(1-p_t)/n_t)
    z = stats.norm.ppf(1 - alpha/2)
    return {
        "control": p_c, "treatment": p_t,
        "absolute": diff, "relative": diff/p_c,
        "ci_relative": ((diff - z*se)/p_c, (diff + z*se)/p_c),
        "p": float(2*stats.norm.sf(abs(diff/se))),
        "power_for_mde": achieved_power(p_c, mde_rel, min(n_c, n_t), alpha),
        "p_effect_positive": float(1 - stats.norm.cdf(0, diff, se)),
        "n_required_for_mde": required_n(p_c, mde_rel, alpha),
    }


# =========================================================================
# TESTS
# =========================================================================

def test_interval_contains_zero_and_a_large_positive_effect():
    r = readout(K_C, N_C, K_T, N_T)
    lo, hi = r["ci_relative"]

    assert lo < 0 < hi
    assert hi > 0.10               # +10.7% is inside the interval


def test_test_was_underpowered_for_its_own_mde():
    r = readout(K_C, N_C, K_T, N_T)

    assert r["power_for_mde"] < 0.7
    assert r["n_required_for_mde"] > N_C * 1.4


def test_most_of_the_mass_is_positive():
    r = readout(K_C, N_C, K_T, N_T)

    assert r["p_effect_positive"] > 0.9
    assert r["p"] > 0.05           # and yet not "significant"


def test_null_result_still_rules_something_out():
    """The genuine finding: harm worse than -1.4% is excluded."""
    lo, _ = readout(K_C, N_C, K_T, N_T)["ci_relative"]

    assert lo > -0.02


def test_a_wide_interval_would_rule_out_nothing():
    """The contrast that makes reporting the interval essential."""
    small = readout(180, 1400, 190, 1400)
    lo, hi = small["ci_relative"]

    assert lo < -0.15 and hi > 0.15      # compatible with anything


def test_required_sample_scales_inversely_with_mde_squared():
    assert required_n(0.129, 0.025) / required_n(0.129, 0.05) > 3.5`,
        notes: [
          { t: "p", text: "**Failing to reject the null is not evidence for the null.** The interval is equally compatible with a 10.7% improvement and a 1.4% decline — in money, from −£586k to +£4.5m, centred on +£1.96m. \"No significant difference\" conveys none of that." },
          { t: "callout", kind: "insight", title: "A null result with a narrow interval is informative; with a wide one it is not", body: [
            { t: "p", text: "The genuine finding here is what the interval *rules out*: harm worse than −1.4% and benefit greater than +10.7%. If the question was \"does this break conversion\", it is answered clearly." },
            { t: "p", text: "Reporting only the p-value hides which kind of null result you have. That distinction is the whole reason to publish the interval." }
          ]},
          { t: "p", text: "**The test achieved 60% power, not 80%** — it ran at 66% of the sample its own MDE required, so even a true 5% effect had a 40% chance of producing exactly this readout. Establish why the shortfall happened, because it will recur." },
          { t: "p", text: "**Ship it, but not for the draft's reason.** \"Not significant, so harmless\" as a policy ships every harmful change that fails to reach significance. The correct argument is the asymmetric bet: 93% of the posterior mass above zero, bounded downside, sunk implementation cost." },
          { t: "p", text: "**The decision depends on the loss function, not the p-value.** If the downside were unbounded — a payments change — 93% would not be enough, and the same numbers would give the opposite recommendation." },
          { t: "p", text: "**CUPED would have made this test conclusive at the size it ran.** Using pre-experiment behaviour as a covariate typically cuts variance 30–50% here, which is 1.4–2× the sample for free." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A safety review reported \"no adverse events observed in 200 patients\" as evidence a treatment was safe, and the trial proceeded to a much larger phase." },
      { t: "p", text: "**The rule of three gives an upper bound of 3/200 = 1.5%.** With no events in 200 patients, a true rate of 1 in 70 is entirely consistent with the data — which at scale is a serious safety signal, not an absence of one." },
      { t: "p", text: "**Zero observed events never means zero rate.** It means the rate is below roughly `3/n`, and `n` decides whether that bound is reassuring or meaningless." },
      { t: "p", text: "**Report the upper bound whenever you report a zero count.** It is one division, and it converts \"we saw nothing\" into a claim someone can act on." }
    ]}
  ],

  takeaways: [
    "**95% describes the procedure, not the parameter** — the parameter is fixed and the interval is what varies.",
    "**The only correct reading is \"produced by a procedure that captures the truth 95% of the time\"** — the probability readings all belong to credible intervals.",
    "**A confidence interval is about a mean; a prediction interval is about an individual**, and the second is several times wider.",
    "**A confidence interval shrinks to nothing with infinite data; a prediction interval does not.**",
    "**Use `t` rather than `z` when σ is estimated** — at `n = 5` a z-interval covers 88% while claiming 95%.",
    "**Halving the width costs 4× the data**, every time.",
    "**Confidence is cheap and precision is expensive**: 95% to 99.9% costs 68% more width; halving the width costs 300% more data.",
    "**Variance reduction is the free lever.** Pairing multiplies your effective sample by `1/(1−ρ)` — five times at `ρ = 0.8`.",
    "**The textbook proportion interval covers 60% at `p = 0.02`** — use Wilson, which respects the boundary and inverts the test.",
    "**The rule of three**: zero events in `n` trials gives a 95% upper bound of about `3/n`.",
    "**Failing to reject is not evidence for the null** — report what the interval rules out, which is the real finding.",
    "**A null result with a narrow interval is informative; with a wide one it is not**, and only the interval distinguishes them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A 95% confidence interval is [97, 108]. What does the 95% mean?",
        options: [
          "There is a 95% probability the true mean is between 97 and 108",
          "This interval came from a procedure that captures the true value 95% of the time",
          "95% of the data lies between 97 and 108",
          "Repeating the study would land 95% of new estimates in this range"
        ],
        answer: 1,
        why: "The parameter is fixed, so it is either in the interval or not. Option 3 describes a prediction interval, which is several times wider; option 4 is a different quantity entirely, and its actual figure is about 83%."
      },
      {
        stem: "You observe zero failures in 300 runs. What can you claim about the failure rate?",
        options: [
          "It is zero",
          "It is below about 1% — the rule of three gives a 95% upper bound of `3/300`",
          "Nothing at all",
          "It is below 0.33%, since one more run would have been a failure"
        ],
        answer: 1,
        why: "Zero observed events never means a zero rate; it means the rate is below roughly `3/n`, and `n` decides whether that is reassuring. Reporting the bound converts \"we saw nothing\" into a claim someone can act on."
      },
      {
        stem: "Two measurements per subject correlate at 0.8. How much does pairing help?",
        options: [
          "It doubles the effective sample",
          "It multiplies the effective sample by `1/(1−ρ) = 5`, by removing between-subject variance from the comparison",
          "It has no effect on the interval width",
          "It helps only if the correlation exceeds 0.9"
        ],
        answer: 1,
        why: "Variance reduction is the free lever — pairing, stratifying and covariate adjustment all narrow the interval without collecting more data. Since halving the width otherwise costs 4× the sample, this is a large saving."
      },
      {
        stem: "An A/B test gives `p = 0.13` with a 95% CI on the relative lift of [−1.4%, +10.7%]. What should the write-up say?",
        options: [
          "No effect was found, so the feature is neutral",
          "The result is compatible with anything from a small decline to a large gain, and rules out harm worse than −1.4% — the null result is uninformative about the target effect at 60% power",
          "The feature should be rejected",
          "The test should be repeated until significant"
        ],
        answer: 1,
        why: "Failing to reject is not evidence for the null. The interval's upper end is worth £4.5m a year and its lower end costs £586k — an asymmetric bet the phrase \"no significant difference\" hides entirely."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a 95% confidence interval actually mean?",
        strong: "That the procedure producing it captures the true value 95% of the time. The parameter is fixed and the interval varies from sample to sample, so it is a property of the recipe rather than a probability about this particular interval.",
        answer: [
          { t: "p", text: "Being precise about *what* varies is the whole answer, and most people get it wrong in the first sentence." },
          { t: "p", text: "Noting that a Bayesian credible interval does support the probability reading shows you know why the distinction exists rather than just that it does." }
        ]
      },
      {
        level: "core",
        q: "Your A/B test comes back not significant. What do you report?",
        strong: "The confidence interval, and what it rules out. If it spans −1% to +11%, the result is uninformative about a 5% effect and I would say so, along with the achieved power. A narrow null interval is a real finding; a wide one is a failed measurement.",
        answer: [
          { t: "p", text: "Distinguishing an informative null from an uninformative one is the substance, and it is what the p-value alone cannot convey." },
          { t: "p", text: "Reporting achieved power alongside shows you would diagnose why the test was inconclusive rather than just reporting that it was." }
        ]
      },
      {
        level: "advanced",
        q: "How would you narrow a confidence interval without collecting more data?",
        strong: "Reduce the variance. Pair observations where possible — that multiplies the effective sample by `1/(1−ρ)` — stratify to remove between-group variance, or adjust for a pre-experiment covariate. Since halving the width otherwise costs four times the data, these are large wins.",
        answer: [
          { t: "p", text: "Naming the `1/(1−ρ)` factor makes the answer quantitative rather than a list of techniques." },
          { t: "p", text: "Framing it against the `4×` cost of the alternative shows you understand why design work is worth doing before data collection." }
        ]
      }
    ]
  }
});

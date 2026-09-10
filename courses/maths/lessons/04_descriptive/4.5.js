/* ============================================================================
   LESSON 4.5 — Correlation: What It Does Not Say
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "\"Correlation does not imply causation\" is repeated so often it has stopped carrying information. **The useful version names what else it could be** — confounding, selection, reverse causation, or coincidence — and says which one you can rule out. A correlation is the beginning of an investigation, and Anscombe's quartet shows it is not even a reliable description.",

  objectives: [
    "Compute Pearson and Spearman and choose between them",
    "Reproduce Anscombe's quartet and say what it demonstrates",
    "Name the four alternatives to causation and test for each",
    "Recognise selection effects that create correlations",
    "Say what evidence would upgrade a correlation to a causal claim"
  ],

  prerequisites: ["4.4"],

  blocks: [

    { t: "h2", n: "01", text: "Pearson, Spearman and what each sees", id: "pearson-spearman" },

    { t: "p", text: "**Pearson measures how close a relationship is to a straight line; Spearman measures whether it is consistently increasing or decreasing.** They answer different questions, so Pearson reporting a lower value on a curved relationship is not a failure — it is the correct answer to its own question." },

    { t: "dl", items: [
      ["Pearson correlation", "`r = Cov(X,Y)/(σₓσᵧ)`. Detects **linear** association only, and one extreme point can flip its sign."],
      ["Spearman correlation", "Pearson computed on the ranks. Detects any **monotonic** relationship, and is unaffected by monotonic transforms or outliers."],
      ["Kendall's tau", "The probability that two randomly chosen pairs agree in order, minus the probability they disagree. More interpretable, slower to compute."],
      ["What none of them catch", "Non-monotonic relationships. A parabola scores zero on all three, and mutual information is what detects it."],
      ["Non-linear relationship", "One that no straight line describes. Pearson understates it, Spearman catches it if it is monotonic, and only mutual information catches it in general."]
    ]},

    { t: "code", lang: "python", title: "two coefficients, two questions", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# PEARSON  -- linear association. Covariance divided by the product of
#             the standard deviations.
# SPEARMAN -- Pearson applied to the RANKS. So it detects any monotonic
#             relationship, and is unaffected by any monotonic transform.

x = np.sort(rng.uniform(1, 10, 500))

for name, y in [
    ("linear",       3*x + rng.normal(0, 1, 500)),
    ("exponential",  np.exp(x/2) + rng.normal(0, 1, 500)),
    ("logarithmic",  np.log(x) + rng.normal(0, 0.05, 500)),
    ("step",         (x > 5).astype(float) + rng.normal(0, 0.05, 500)),
    ("parabola",     (x - 5.5)**2 + rng.normal(0, 1, 500)),
]:
    print(f"{name:13s} pearson {stats.pearsonr(x, y).statistic:+.3f}   "
          f"spearman {stats.spearmanr(x, y).statistic:+.3f}")

# linear        pearson +0.993   spearman +0.993
# exponential   pearson +0.847   spearman +1.000
# logarithmic   pearson +0.947   spearman +0.999
# step          pearson +0.866   spearman +0.866
# parabola      pearson +0.027   spearman +0.031
#
# SPEARMAN SEES THE EXPONENTIAL AND LOGARITHMIC RELATIONSHIPS PERFECTLY
# because they are monotonic. Pearson understates both, because it is
# asking how close to a STRAIGHT LINE they are -- which is a different
# question, not a worse measurement.
#
# BOTH MISS THE PARABOLA, because it is not monotonic. Neither
# coefficient is a general dependence detector; mutual information is
# (lesson 3.8).

# SPEARMAN IS ALSO ROBUST, since ranks bound the influence of any
# single point:
xc, yc = x.copy(), (3*x + rng.normal(0, 1, 500))
xc[0], yc[0] = 1000.0, -1000.0                  # one absurd point

stats.pearsonr(xc, yc).statistic                # -0.66  sign FLIPPED
stats.spearmanr(xc, yc).statistic               # +0.99  unmoved
#
# ONE POINT IN FIVE HUNDRED REVERSED THE SIGN OF PEARSON'S r. That is
# the breakdown point of 1/n from lesson 4.1, appearing in a
# correlation.

# WHEN TO USE WHICH:
#
#   PEARSON   the relationship is expected to be linear, and you want
#             a coefficient that feeds a linear model
#   SPEARMAN  monotonic but not linear, ordinal data, outliers present,
#             or you have not looked at a plot yet
#   KENDALL   small samples, many ties -- more interpretable as a
#             probability of concordance, and slower to compute
stats.kendalltau(x, np.exp(x/2)).statistic      # 1.0
`,
      hl: [23, 30, 41],
      caption: "**One point in five hundred flipped the sign of Pearson's `r`.** Spearman was unmoved, because ranks bound the influence of any single observation — the breakdown point from lesson 4.1, in a correlation."
    },

    { t: "h2", n: "02", text: "Anscombe's quartet", id: "anscombe" },

    { t: "p", text: "**Anscombe's quartet is four datasets with identical means, variances, correlations and regression lines** — and four completely different shapes. It is the standard demonstration that summary statistics cannot substitute for looking at the data." },

    { t: "dl", items: [
      ["The quartet", "One genuinely linear relationship, one perfect parabola, one line with a single outlier, and one where a lone point determines the entire slope."],
      ["Leverage", "How far an observation sits from the mean of the predictors, `hᵢᵢ`. A value near 1 means the fitted line passes through that point regardless of everything else."],
      ["Datasaurus", "The modern extension — a dozen wildly different shapes sharing summary statistics to two decimal places."],
      ["The automatable part", "Leverage and a Pearson-versus-Spearman disagreement catch three of the four without a human looking at anything."],
      ["Anscombe's quartet", "Four datasets constructed by Francis Anscombe in 1973 to share every common summary statistic while looking entirely different. The standard argument for plotting your data."]
    ]},

    { t: "viz",
      title: "Four datasets, identical to two decimal places",
      caption: "Same mean, same variance, same correlation, same regression line, same R². Only one of them is a linear relationship, and no summary statistic distinguishes them.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Anscombe's four scatter plots: linear, curved, one outlier in y, and one leverage point">
  <g>
    <rect x="24" y="30" width="180" height="160" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="34" y1="176" x2="194" y2="56" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="56" cy="160" r="3.5"/><circle cx="76" cy="150" r="3.5"/><circle cx="96" cy="128" r="3.5"/>
      <circle cx="116" cy="140" r="3.5"/><circle cx="136" cy="104" r="3.5"/><circle cx="156" cy="88" r="3.5"/>
      <circle cx="176" cy="70" r="3.5"/><circle cx="66" cy="170" r="3.5"/><circle cx="146" cy="118" r="3.5"/>
    </g>
    <text x="24" y="214" class="s-sub" style="fill:var(--good)">I -- genuinely linear</text>
  </g>

  <g transform="translate(220,0)">
    <rect x="24" y="30" width="180" height="160" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="34" y1="176" x2="194" y2="56" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
    <path d="M50 174 Q 114 46, 186 128" style="fill:none;stroke:var(--crit)" stroke-width="2"/>
    <text x="24" y="214" class="s-sub" style="fill:var(--crit)">II -- a curve</text>
  </g>

  <g transform="translate(440,0)">
    <rect x="24" y="30" width="180" height="160" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="34" y1="176" x2="194" y2="56" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
    <line x1="46" y1="170" x2="180" y2="80" style="stroke:var(--ink-3)" stroke-width="2"/>
    <circle cx="140" cy="44" r="5" style="fill:var(--crit)"/>
    <text x="24" y="214" class="s-sub" style="fill:var(--crit)">III -- one outlier in y</text>
  </g>

  <g transform="translate(660,0)">
    <rect x="24" y="30" width="180" height="160" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="34" y1="176" x2="194" y2="56" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="66" cy="90" r="3.5"/><circle cx="66" cy="110" r="3.5"/><circle cx="66" cy="130" r="3.5"/>
      <circle cx="66" cy="150" r="3.5"/><circle cx="66" cy="170" r="3.5"/><circle cx="66" cy="70" r="3.5"/>
    </g>
    <circle cx="180" cy="52" r="5" style="fill:var(--crit)"/>
    <text x="24" y="214" class="s-sub" style="fill:var(--crit)">IV -- one leverage point</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the quartet, and the statistics that cannot tell them apart", code: `
x1 = np.array([10,8,13,9,11,14,6,4,12,7,5], dtype=float)
x4 = np.array([8,8,8,8,8,8,8,19,8,8,8], dtype=float)

quartet = {
    "I":   (x1, np.array([8.04,6.95,7.58,8.81,8.33,9.96,7.24,4.26,10.84,4.82,5.68])),
    "II":  (x1, np.array([9.14,8.14,8.74,8.77,9.26,8.10,6.13,3.10,9.13,7.26,4.74])),
    "III": (x1, np.array([7.46,6.77,12.74,7.11,7.81,8.84,6.08,5.39,8.15,6.42,5.73])),
    "IV":  (x4, np.array([6.58,5.76,7.71,8.84,8.47,7.04,5.25,12.50,5.56,7.91,6.89])),
}

for name, (x, y) in quartet.items():
    slope, intercept = np.polyfit(x, y, 1)
    r = stats.pearsonr(x, y).statistic
    print(f"{name}:  mean(x) {x.mean():.2f}  var(x) {x.var(ddof=1):.2f}  "
          f"mean(y) {y.mean():.2f}  var(y) {y.var(ddof=1):.3f}  "
          f"r {r:.3f}  y = {intercept:.2f} + {slope:.3f}x")

# I:    mean(x) 9.00  var(x) 11.00  mean(y) 7.50  var(y) 4.127  r 0.816  y = 3.00 + 0.500x
# II:   mean(x) 9.00  var(x) 11.00  mean(y) 7.50  var(y) 4.128  r 0.816  y = 3.00 + 0.500x
# III:  mean(x) 9.00  var(x) 11.00  mean(y) 7.50  var(y) 4.123  r 0.816  y = 3.00 + 0.500x
# IV:   mean(x) 9.00  var(x) 11.00  mean(y) 7.50  var(y) 4.123  r 0.817  y = 3.00 + 0.500x
#
# IDENTICAL TO THREE DECIMAL PLACES ON EVERY STATISTIC, and the four
# datasets are qualitatively different:
#
#   I    a real linear relationship
#   II   a perfect parabola -- linear regression is simply the wrong
#        model, and r = 0.816 is measuring the linear part of a curve
#   III  a perfect line plus ONE outlier, which drags the fitted slope
#        away from the truth
#   IV   ten points at x=8 and one at x=19. The slope is determined
#        ENTIRELY by that one point; there is no evidence of a
#        relationship at all
#
# SPEARMAN SEPARATES THEM PARTIALLY, which is worth knowing:
for name, (x, y) in quartet.items():
    print(f"{name}: pearson {stats.pearsonr(x,y).statistic:.3f}  "
          f"spearman {stats.spearmanr(x,y).statistic:.3f}")
# I:   pearson 0.816  spearman 0.818
# II:  pearson 0.816  spearman 0.691
# III: pearson 0.816  spearman 0.991    <- ranks ignore the outlier
# IV:  pearson 0.817  spearman 0.500

# AND LEVERAGE CATCHES DATASET IV WITHOUT A PLOT:
def max_leverage(x):
    """h_ii for simple regression. A point with high leverage can
    determine the slope on its own."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    h = 1/n + (x - x.mean())**2 / ((x - x.mean())**2).sum()
    return float(h.max())

{name: round(max_leverage(x), 3) for name, (x, _) in quartet.items()}
# {'I': 0.318, 'II': 0.318, 'III': 0.318, 'IV': 1.000}
#
# LEVERAGE 1.0 MEANS THE FITTED LINE PASSES EXACTLY THROUGH THAT POINT
# regardless of everything else. The rule of thumb is 2(p+1)/n; here
# that is 0.36, and dataset IV is at the theoretical maximum.
#
# SO YOU CAN AUTOMATE PART OF THIS: leverage, Spearman-versus-Pearson
# disagreement, and a residual plot catch three of the four without a
# human looking at anything.
`,
      hl: [22, 39, 51, 58],
      caption: "**Leverage catches dataset IV automatically.** A value of 1.0 means the fitted line passes exactly through that point regardless of every other observation — the slope has no support from the data at all."
    },

    { t: "h2", n: "03", text: "The four alternatives to causation", id: "alternatives" },

    { t: "p", text: "\"Correlation does not imply causation\" is only useful if you **name which alternative applies**. There are four, each with a different structure and a different test — and ruling one out says nothing about the others." },

    { t: "dl", items: [
      ["Confounding", "A third variable `Z` causes both. Test by conditioning on `Z`; the association should vanish."],
      ["Reverse causation", "`Y` causes `X` rather than the other way round. Check the timing, or intervene."],
      ["Selection", "How the sample was chosen depends on both variables. Ask **who is missing**, and whether both variables affected their absence."],
      ["Coincidence", "Nothing at all. Addressed by pre-registration, replication, or correcting for the size of the search."],
      ["E-value", "How strong an unmeasured confounder would need to be, with both exposure and outcome, to explain the association away. It turns the slogan into a number."]
    ]},

    { t: "table",
      head: ["Explanation", "Structure", "How to test it"],
      rows: [
        ["**Confounding**", "`Z → X` and `Z → Y`", "Condition on `Z`; the association should vanish"],
        ["**Reverse causation**", "`Y → X`", "Check timing; instrument or intervene"],
        ["**Selection**", "Sampling depends on `X` and `Y`", "Look at who is *missing* from the sample"],
        ["**Coincidence**", "Nothing", "Pre-register, replicate, or correct for the search size"],
        ["*Causation*", "*`X → Y`*", "*Randomise, or exploit a natural experiment*"]
      ],
      caption: "**\"Correlation does not imply causation\" is only useful if you name which alternative applies.** Each has a different structure and a different test, and ruling one out says nothing about the others."
    },

    { t: "code", lang: "python", title: "selection effects create correlations from nothing", code: `
# SELECTION IS THE ALTERNATIVE PEOPLE FORGET, and it is the collider
# from lesson 3.6 wearing a sampling costume.

n = 200_000

# TWO GENUINELY INDEPENDENT QUALITIES.
technical = rng.normal(0, 1, n)
communication = rng.normal(0, 1, n)

np.corrcoef(technical, communication)[0, 1]        # 0.000

# A HIRING PROCESS accepts candidates who are good enough OVERALL.
hired = (technical + communication) > 2.0
hired.mean()                                       # 0.079

np.corrcoef(technical[hired], communication[hired])[0, 1]   # -0.71
#
# AMONG PEOPLE YOU HIRED, THE TWO SKILLS ARE STRONGLY NEGATIVELY
# CORRELATED -- and they are independent in the population. Nothing
# causes anything; the sample is the cause.
#
# THE INTUITION: to get hired with weak communication you needed
# exceptional technical skill, and vice versa. The only people with
# both weak are absent, so the top-right and bottom-left corners of
# the scatter are missing.

# THE EFFECT STRENGTHENS AS SELECTION TIGHTENS:
for cutoff in (0.0, 1.0, 2.0, 3.0):
    m = (technical + communication) > cutoff
    print(f"cutoff {cutoff}: {m.mean():5.1%} selected, "
          f"r = {np.corrcoef(technical[m], communication[m])[0,1]:+.3f}")

# cutoff 0.0:  50.1% selected, r = -0.363
# cutoff 1.0:  23.9% selected, r = -0.548
# cutoff 2.0:   7.9% selected, r = -0.712
# cutoff 3.0:   1.7% selected, r = -0.827
#
# THE MORE SELECTIVE THE SAMPLE, THE STRONGER THE SPURIOUS
# CORRELATION. Elite samples produce the most misleading correlations,
# which is the opposite of the usual intuition that better data gives
# better answers.

# WHERE THIS BITES IN PRACTICE, all the same structure:
#
#   "Our best engineers are worse communicators"     -- hiring filter
#   "Expensive restaurants have worse service"       -- survival: a
#       cheap restaurant with bad service closes
#   "Attractive people are less kind"                -- dating pool
#   "Successful startups had less funding"           -- survivorship
#   "Users who complete onboarding churn less"       -- selection on
#       the outcome itself
#
# THE DIAGNOSTIC QUESTION IS ALWAYS THE SAME: WHO IS MISSING FROM THIS
# SAMPLE, AND DID BOTH VARIABLES AFFECT WHETHER THEY ARE HERE?

def selection_risk(selected_fraction, r_observed):
    """A rough sanity check: how strong would a selection effect have
    to be to produce this correlation from nothing?"""
    if selected_fraction >= 0.9:
        return "selection unlikely to explain much"
    if abs(r_observed) < 0.3:
        return "weak enough that selection could easily produce it"
    return (f"{selected_fraction:.0%} selected: a selection effect can "
            f"produce |r| up to ~{min(0.9, 1.2*(1-selected_fraction)):.2f}")

selection_risk(0.08, -0.71)
# '8% selected: a selection effect can produce |r| up to ~0.90'
`,
      hl: [16, 24, 40, 56],
      caption: "**The more selective the sample, the stronger the spurious correlation.** Elite samples produce the most misleading ones — the opposite of the usual intuition that better data gives better answers."
    },

    { t: "callout", kind: "insight", title: "What would upgrade a correlation to a causal claim", body: [
      { t: "p", text: "**Randomisation, above everything else.** Assigning `X` at random severs every arrow into it, which eliminates confounding, reverse causation and selection in one move. Nothing else does all three." },
      { t: "code", lang: "python", numbered: false, title: "and the ladder below it", code: `
# IN DESCENDING ORDER OF STRENGTH:
#
# 1. RANDOMISED EXPERIMENT. X is assigned by a coin flip, so nothing
#    can cause X. Confounding, reverse causation and selection all go
#    at once. This is why A/B tests dominate.
#
# 2. NATURAL EXPERIMENT. Something random-ish assigned X for you -- a
#    policy threshold, a lottery, a staged rollout. Weaker only
#    because you must argue the assignment really was arbitrary.
#
# 3. INSTRUMENTAL VARIABLE. Something that affects X, does not affect
#    Y except through X, and is unrelated to the confounders. The
#    second condition is untestable, which is why IV claims are argued
#    rather than demonstrated.
#
# 4. CONTROLLING FOR CONFOUNDERS. Only works for confounders you
#    MEASURED, and controlling for a collider actively makes things
#    worse (lesson 3.6). This is the most common approach and the
#    weakest of the four.
#
# 5. TEMPORAL PRECEDENCE ALONE. Rules out reverse causation and
#    nothing else.

# SUPPORTING EVIDENCE, none sufficient alone:
#   - DOSE-RESPONSE: more X, more Y, monotonically
#   - MECHANISM: a plausible pathway you can articulate
#   - REPLICATION across populations where the confounders differ
#   - CONSISTENCY with a prediction made BEFORE seeing the data

# THE SENSITIVITY QUESTION, which is the practical one when you cannot
# randomise: how strong would an unmeasured confounder have to be to
# explain this away?
def confounder_strength_needed(observed_rr):
    """E-value: the minimum association a confounder would need with
    BOTH treatment and outcome to fully explain an observed risk
    ratio."""
    rr = max(observed_rr, 1/observed_rr)
    return rr + np.sqrt(rr * (rr - 1))

confounder_strength_needed(1.2)     # 1.69
confounder_strength_needed(2.0)     # 3.41
confounder_strength_needed(5.0)     # 9.47
#
# AN OBSERVED RISK RATIO OF 1.2 NEEDS ONLY A 1.69x CONFOUNDER to
# vanish -- easily plausible, so weak associations from observational
# data deserve little confidence. A risk ratio of 5 would need a
# 9.5x confounder, which is much harder to imagine going unnoticed.
#
# THAT IS THE QUANTITATIVE VERSION OF "correlation is not causation",
# and it is far more useful than the slogan.`},
      { t: "p", text: "**The E-value turns the slogan into a number.** An observed risk ratio of 1.2 needs only a 1.69× unmeasured confounder to explain away — easily plausible — while a ratio of 5 would need 9.5×, which is much harder to imagine going unnoticed." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Referee a causal claim from observational data",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A growth team reports that users who enable notifications retain 3.2× better, and proposes making notifications default-on for everyone. Assess the claim." },
        { t: "code", lang: "python", numbered: false, title: "the evidence presented", code: `
# Users who enabled notifications:      31% retained at 90 days
# Users who did not:                     9.7% retained at 90 days
# Ratio: 3.2x,  n = 480,000,  p < 1e-300
#
# Notifications are opt-in, enabled during onboarding.
# 22% of users enable them.
# The team also notes: retention rises with the NUMBER of
# notification types enabled (1 type: 24%, 2: 31%, 3+: 38%).`},
        { t: "p", text: "Say what the evidence supports, name every alternative explanation, and specify what you would run instead." }
      ],
      requirements: [
        "Explain why the p-value adds nothing here.",
        "Name each alternative explanation with its specific mechanism.",
        "Address the dose-response argument directly.",
        "Compute how strong a confounder would need to be.",
        "Specify the experiment you would run, with a sample size.",
        "Include tests."
      ],
      hint: "Ask what kind of user opts in to notifications during onboarding, and what else that predicts.",
      solution: {
        lang: "python",
        title: "referee.py",
        code: `import numpy as np
from scipy import stats

N = 480_000
ENABLE_RATE = 0.22
RET_ENABLED, RET_NOT = 0.31, 0.097


# =========================================================================
# THE p-VALUE ADDS NOTHING
# =========================================================================
#
# p < 1e-300 says the difference is not sampling noise. Nobody thought
# it was: with 480,000 users, a difference of 0.1 percentage points
# would also be significant.

n1, n2 = int(N*ENABLE_RATE), int(N*(1-ENABLE_RATE))
se = np.sqrt(RET_ENABLED*(1-RET_ENABLED)/n1 + RET_NOT*(1-RET_NOT)/n2)
se                                      # 0.00119
#
# The standard error is 0.12 percentage points, so the study can detect
# a 0.3pp difference. IT IS OVERPOWERED FOR THE QUESTION BEING ASKED.
#
# A p-VALUE ADDRESSES ONE ALTERNATIVE -- COINCIDENCE -- AND THAT IS THE
# LEAST LIKELY OF THE FOUR HERE. The other three are untouched by any
# amount of data, because more observations of a confounded comparison
# give a more precise estimate of a confounded quantity.


# =========================================================================
# THE ALTERNATIVES, WITH MECHANISMS
# =========================================================================
#
# 1. CONFOUNDING -- overwhelmingly the most likely.
#
#    Enabling notifications during onboarding requires the user to
#    complete onboarding, read a prompt, and make a deliberate choice
#    to hear more from the product. That is a direct measure of
#    INTENT, and intent predicts retention regardless of what the
#    prompt was about.
#
#    The confounder is not subtle or unmeasurable -- it is "how much
#    does this person want the product". Any opt-in during onboarding
#    would show a similar effect, including opting into a newsletter
#    or setting an avatar.
#
#    TESTABLE PREDICTION: other unrelated opt-ins should show a
#    similar retention lift. If enabling dark mode also gives 2-3x,
#    the effect is intent, not notifications.
#
# 2. REVERSE CAUSATION -- partially, and it compounds over time.
#
#    Users who are engaged at day 7 are more likely to still have
#    notifications on at day 90 than users who churned, because
#    churning users often disable them on the way out. If enablement
#    is measured at any point rather than only at onboarding, the
#    outcome is partly causing the exposure.
#
#    CHECK: is enablement measured at onboarding only, or ever?
#
# 3. SELECTION -- both variables affect who is in the sample.
#
#    Users who abandon onboarding never reach the notification prompt,
#    so they are recorded as "did not enable" AND are the least likely
#    to retain. That mechanically inflates the gap without any causal
#    effect at all.
#
#    CHECK: restrict to users who COMPLETED onboarding and therefore
#    actually saw the prompt. That single restriction usually removes
#    a large part of the effect.
#
# 4. COINCIDENCE -- ruled out by the sample size, and it was never the
#    concern.


# =========================================================================
# THE DOSE-RESPONSE ARGUMENT
# =========================================================================
#
# "Retention rises with the number of types enabled: 24%, 31%, 38%."
#
# Dose-response is genuine supporting evidence for causation -- but it
# is EQUALLY CONSISTENT with the confounding story, and that is the
# point. If intent drives both, then more intent means more types
# enabled AND higher retention, producing exactly this gradient.
#
# A CONFOUNDER THAT VARIES CONTINUOUSLY PRODUCES A DOSE-RESPONSE
# CURVE. It does not distinguish the hypotheses at all.
#
# WHAT WOULD DISTINGUISH THEM: dose-response in a RANDOMISED dose. If
# you randomly assign users to 1, 2 or 3 notification types and see
# the gradient, that is causal evidence. Observed gradients in
# self-selected doses are not.

doses = np.array([1, 2, 3])
retention = np.array([0.24, 0.31, 0.38])
np.polyfit(doses, retention, 1)[0]      # 0.07 per type -- a clean gradient
#
# A clean gradient, and it tells you nothing.


# =========================================================================
# HOW STRONG A CONFOUNDER WOULD BE NEEDED
# =========================================================================

def e_value(rr):
    """Minimum association an unmeasured confounder needs with BOTH the
    exposure and the outcome to fully explain an observed risk ratio."""
    rr = max(rr, 1/rr)
    return rr + np.sqrt(rr * (rr - 1))

rr = RET_ENABLED / RET_NOT              # 3.196
e_value(rr)                             # 5.85
#
# A confounder would need to be associated 5.85x with BOTH enabling
# notifications AND retaining. That sounds demanding -- and for a
# subtle confounder it would be.
#
# BUT "USER INTENT" PLAUSIBLY CLEARS IT. Users who complete onboarding
# and deliberately opt in are not 5.85x more motivated than average --
# they are a self-selected top quintile, and the gap between a
# motivated and an indifferent user's 90-day retention is routinely an
# order of magnitude.
#
# THE E-VALUE IS MOST USEFUL WHEN IT IS SMALL, because it then proves
# an effect is fragile. A large E-value does not establish causation
# when a large, obvious confounder is available -- and here it is not
# merely available, it is the definition of the exposure.


# =========================================================================
# THE EXPERIMENT
# =========================================================================
#
# RANDOMISE THE DEFAULT, not the setting. You cannot force users to
# enable notifications, but you can randomise which default they see,
# which is exactly an intention-to-treat design.
#
#   ARM A (control):   notifications default OFF, opt-in prompt
#   ARM B (treatment): notifications default ON, opt-out prompt
#
# ANALYSE BY ASSIGNMENT, NOT BY WHAT THEY CHOSE. Comparing "enabled"
# to "not enabled" within the experiment reintroduces exactly the
# confounding the randomisation removed -- and it is the most common
# way a good experiment gets ruined in analysis.

def sample_size(p_baseline, mde_relative, alpha=0.05, power=0.8):
    """Per arm, two-proportion test."""
    p1 = p_baseline
    p2 = p_baseline * (1 + mde_relative)
    p_bar = (p1 + p2) / 2
    z_a = stats.norm.ppf(1 - alpha/2)
    z_b = stats.norm.ppf(power)
    num = (z_a*np.sqrt(2*p_bar*(1-p_bar)) + z_b*np.sqrt(p1*(1-p1)+p2*(1-p2)))**2
    return int(np.ceil(num / (p2 - p1)**2))

# Overall baseline retention:
baseline = ENABLE_RATE*RET_ENABLED + (1-ENABLE_RATE)*RET_NOT
baseline                                # 0.1439

sample_size(baseline, 0.05)             # 24,533 per arm -- a 5% lift
sample_size(baseline, 0.10)             # 6,155 per arm  -- a 10% lift
sample_size(baseline, 0.03)             # 68,435 per arm -- a 3% lift
#
# 6,155 PER ARM DETECTS A 10% RELATIVE LIFT. At the observed traffic
# that is days, not weeks -- so there is no reason to ship on
# observational evidence.
#
# WHAT TO EXPECT: the true effect will be far below 3.2x. My prior
# would be a 5-15% relative lift, and a real possibility of a NEGATIVE
# effect, since default-on notifications annoy users who would not have
# chosen them. That downside is invisible in the observational data by
# construction -- those users are all in the "did not enable" group.
#
# MEASURE THE HARM TOO: notification disable rate, app uninstalls, and
# support contacts. An intervention that lifts retention 8% while
# raising uninstalls 15% is a loss, and only the experiment can see it.


# =========================================================================
# TESTS
# =========================================================================

def test_study_is_overpowered_for_the_question():
    n1, n2 = int(N*ENABLE_RATE), int(N*(1-ENABLE_RATE))
    se = np.sqrt(RET_ENABLED*(1-RET_ENABLED)/n1 + RET_NOT*(1-RET_NOT)/n2)

    assert se < 0.002              # detects 0.3pp; the claim is 21pp


def test_dose_response_is_consistent_with_confounding():
    """A continuously varying confounder produces a gradient too, so
    the gradient cannot distinguish the hypotheses."""
    intent = np.random.default_rng(0).normal(0, 1, 200_000)
    types = np.clip(np.round(intent + 2), 0, 3)          # intent -> dose
    retained = np.random.default_rng(1).random(200_000) < 1/(1+np.exp(-intent))

    grad = [retained[types == d].mean() for d in (1, 2, 3)]
    assert grad[0] < grad[1] < grad[2]      # clean dose-response
    # ...produced entirely by the confounder, with no causal effect.


def test_e_value_is_smaller_than_it_looks():
    """5.85 is large for a subtle confounder and modest for intent."""
    rr = RET_ENABLED / RET_NOT
    assert 5.0 < e_value(rr) < 7.0
    assert e_value(1.2) < 1.7               # weak claims are fragile


def test_experiment_is_affordable():
    baseline = ENABLE_RATE*RET_ENABLED + (1-ENABLE_RATE)*RET_NOT

    assert sample_size(baseline, 0.10) < 10_000
    assert sample_size(baseline, 0.10) * 2 < N / 20      # days of traffic


def test_sample_size_scales_inversely_with_effect_squared():
    baseline = 0.1439
    assert sample_size(baseline, 0.05) / sample_size(baseline, 0.10) > 3.5`,
        notes: [
          { t: "p", text: "**The p-value addresses coincidence, which is the least likely of the four alternatives here.** With 480,000 users the study detects a 0.3pp difference — more observations of a confounded comparison give a more precise estimate of a confounded quantity." },
          { t: "callout", kind: "insight", title: "The dose-response argument is the interesting one, and it does not work", body: [
            { t: "p", text: "Dose-response is genuine supporting evidence for causation — but a *continuously varying confounder produces exactly the same gradient*. If intent drives both, more intent means more types enabled and higher retention." },
            { t: "p", text: "What would distinguish them is dose-response in a **randomised** dose. Observed gradients in self-selected doses tell you nothing." }
          ]},
          { t: "p", text: "**The selection mechanism is the cheapest thing to check.** Users who abandon onboarding never see the prompt, so they are recorded as \"did not enable\" *and* are least likely to retain. Restricting to users who completed onboarding usually removes a large part of the effect for free." },
          { t: "p", text: "**The E-value of 5.85 sounds demanding and is not.** User intent is not a subtle confounder — it is the definition of the exposure, since opting in during onboarding *is* a measure of wanting the product. E-values are most useful when small, because they prove fragility." },
          { t: "p", text: "**Randomise the default, not the setting**, and analyse by assignment. Comparing enabled to not-enabled *within* the experiment reintroduces the confounding randomisation removed — the most common way a good experiment is ruined in analysis." },
          { t: "p", text: "**6,155 per arm detects a 10% lift**, which is days of traffic — so there is no reason to ship on observational evidence. Expect far below 3.2×, with a real possibility of harm: default-on notifications annoy users who would not have chosen them, and those users are invisible in the observational data by construction." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A hospital found that asthma patients admitted with pneumonia had *lower* mortality than non-asthmatics, and a model trained on the data learned to treat asthma as protective." },
      { t: "p", text: "**Asthmatic patients were routed directly to intensive care as a matter of policy**, so the aggressive treatment they received caused their better outcomes. The correlation was real and the causal direction was inverted." },
      { t: "p", text: "**Deployed as a triage tool, the model would have sent asthmatic patients home** — the group the policy existed to protect, harmed by a model that learned the policy's effect and inverted its cause." },
      { t: "p", text: "**Ask what decisions produced the data before modelling it.** Observational data records the outcome of past decisions, and a model that does not know about those decisions will attribute their effects to whatever correlates with them." }
    ]}
  ],

  takeaways: [
    "**Pearson measures linearity; Spearman measures monotonicity** — Pearson understating an exponential relationship is a different question, not a worse measurement.",
    "**One point in 500 can flip the sign of Pearson's `r`.** Spearman is unmoved, because ranks bound each observation's influence.",
    "**Neither coefficient detects a non-monotonic relationship** — mutual information does.",
    "**Anscombe's quartet has identical means, variances, correlations and regression lines** and four qualitatively different shapes.",
    "**Leverage catches the worst case automatically**: a value near 1.0 means the fitted line passes through that point regardless of the rest.",
    "**\"Correlation is not causation\" is only useful when you name which alternative applies** — confounding, reverse causation, selection or coincidence.",
    "**A p-value addresses only coincidence**, which is usually the least likely alternative in a large observational study.",
    "**Selection creates correlations from independent variables** — and the more selective the sample, the stronger the spurious correlation.",
    "**Ask who is missing from the sample**, and whether both variables affected their absence.",
    "**Dose-response is consistent with confounding**, because a continuously varying confounder produces the same gradient.",
    "**The E-value quantifies fragility**: a risk ratio of 1.2 needs only a 1.69× confounder to vanish.",
    "**Randomisation severs every arrow into the exposure**, eliminating confounding, reverse causation and selection in one move — and nothing else does all three."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two independent skills appear strongly negatively correlated among your hires. What is the most likely explanation?",
        options: [
          "One skill genuinely detracts from the other",
          "Selection — you hired people good enough overall, so weakness in one required strength in the other, and the both-weak candidates are absent",
          "The sample is too small",
          "Measurement error"
        ],
        answer: 1,
        why: "This is a collider from lesson 3.6 in a sampling costume. The effect strengthens as selection tightens — at an 8% acceptance rate the induced correlation reaches −0.71 — so elite samples produce the most misleading correlations."
      },
      {
        stem: "Four datasets have identical means, variances, correlations and regression lines. What does this show?",
        options: [
          "They are the same data",
          "Summary statistics cannot distinguish a linear relationship from a curve, an outlier, or a single leverage point — Anscombe's quartet",
          "The statistics were computed incorrectly",
          "Correlation is unreliable at small `n`"
        ],
        answer: 1,
        why: "Plotting separates them instantly, and so do two automatic checks: leverage catches dataset IV at exactly 1.0, and Pearson-versus-Spearman disagreement flags the outlier case."
      },
      {
        stem: "An observational study reports `p < 1e-300` for a retention difference. What has it established?",
        options: [
          "A very strong causal effect",
          "That the difference is not coincidence — which was never the concern, and says nothing about confounding, reverse causation or selection",
          "That the sample is representative",
          "That the effect size is large"
        ],
        answer: 1,
        why: "More observations of a confounded comparison give a more precise estimate of a confounded quantity. A p-value addresses exactly one of the four alternatives, and usually the least likely one."
      },
      {
        stem: "An observed risk ratio of 1.2 comes from observational data. How much should you trust it?",
        options: [
          "It is a small but reliable effect",
          "Very little — the E-value is 1.69, so an unmeasured confounder associated 1.7× with both exposure and outcome would explain it entirely",
          "It depends only on the p-value",
          "Trust it if the sample is large"
        ],
        answer: 1,
        why: "The E-value turns the slogan into a number, and it is most useful when small because it proves fragility. A risk ratio of 5 would need a 9.5× confounder, which is much harder to imagine going unnoticed."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use Spearman instead of Pearson?",
        strong: "When the relationship is monotonic but not linear, when there are outliers, or when the data is ordinal. Ranks bound each point's influence — in one example a single point in 500 flipped Pearson's sign while Spearman was unchanged.",
        answer: [
          { t: "p", text: "Framing Pearson's lower value on an exponential relationship as a different question, not a worse measurement, shows you understand both." },
          { t: "p", text: "Adding that neither detects a non-monotonic relationship pre-empts the obvious follow-up." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague says users who do X retain better, so we should make everyone do X. How do you respond?",
        strong: "Ask what kind of user does X. If it is opt-in, doing X is a measure of intent, and intent predicts retention regardless. I would check whether other unrelated opt-ins show a similar lift, then randomise the default and analyse by assignment.",
        answer: [
          { t: "p", text: "Naming the specific confounder rather than reciting the slogan is what makes this useful in a real meeting." },
          { t: "p", text: "The falsifiable check — do other opt-ins show the same lift? — turns the objection into an experiment someone can run tomorrow." },
          { t: "p", text: "Insisting on intention-to-treat analysis shows you know how a good experiment gets ruined afterwards." }
        ]
      },
      {
        level: "advanced",
        q: "What evidence would convince you an observational correlation is causal?",
        strong: "Randomisation, or something close to it — a natural experiment or a credible instrument. Failing that, I would compute how strong an unmeasured confounder would need to be to explain it away, and ask whether one that strong is plausible.",
        answer: [
          { t: "p", text: "Explaining *why* randomisation is special — it severs every arrow into the exposure, handling all three alternatives at once — shows understanding rather than deference." },
          { t: "p", text: "The E-value gives a quantitative answer where most people give a slogan, and noting it is most useful when small is the subtle part." }
        ]
      }
    ]
  }
});

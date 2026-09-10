/* ============================================================================
   LESSON 3.7 — Joint Distributions, Covariance and Independence
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "**Uncorrelated is not independent.** Correlation measures one specific thing — linear association — and a variable can determine another completely while showing a correlation of exactly zero. Knowing which of the two you have decides whether a model, a risk estimate or a feature selection is sound.",

  objectives: [
    "Read a joint distribution and extract marginals and conditionals",
    "Compute covariance and correlation, and say what each is measuring",
    "Show that zero correlation does not imply independence",
    "Use the covariance matrix rather than per-variable variances",
    "Recognise Simpson's paradox from a marginal that reverses"
  ],

  prerequisites: ["3.6"],

  blocks: [

    { t: "h2", n: "01", text: "Joint, marginal, conditional", id: "joint" },

    { t: "code", lang: "python", title: "three views of one table", code: `
import numpy as np

# A JOINT DISTRIBUTION assigns probability to every COMBINATION. The
# marginals and conditionals are both derived from it -- and the joint
# cannot be reconstructed from the marginals, which is the point.

#             device
#            mobile  desktop  tablet
#  bounced    0.22     0.09    0.04
#  engaged    0.28     0.31    0.06

joint = np.array([[0.22, 0.09, 0.04],
                  [0.28, 0.31, 0.06]])
outcomes = ["bounced", "engaged"]
devices = ["mobile", "desktop", "tablet"]

joint.sum()                             # 1.0

# MARGINAL -- sum out the variable you do not care about.
p_device = joint.sum(axis=0)            # [0.50, 0.40, 0.10]
p_outcome = joint.sum(axis=1)           # [0.35, 0.65]

# CONDITIONAL -- divide by the marginal of what you conditioned on.
p_outcome_given_device = joint / p_device            # columns sum to 1
p_outcome_given_device[0]               # [0.44, 0.225, 0.40] bounce rates

p_device_given_outcome = joint / p_outcome[:, None]  # rows sum to 1
p_device_given_outcome[0]               # [0.629, 0.257, 0.114]

# READ BOTH ALOUD -- they are different questions:
#   P(bounce | mobile) = 44%    "mobile users bounce 44% of the time"
#   P(mobile | bounce) = 63%    "63% of bounces come from mobile"
#
# The second is larger mostly because mobile is half the traffic. A
# report that quotes it as evidence that mobile is the problem has
# confused a conditional with its reverse (lesson 3.6).

# INDEPENDENCE would mean the joint FACTORISES:
#     P(X, Y) = P(X) P(Y)
independent = np.outer(p_outcome, p_device)
independent
# [[0.175, 0.140, 0.035],
#  [0.325, 0.260, 0.065]]

np.abs(joint - independent).max()       # 0.05 -- not independent
#
# The gap between the observed joint and the independent one IS the
# association. Sum it appropriately and you get chi-square (lesson 5.6);
# take a log ratio and you get mutual information (lesson 3.8).
`,
      hl: [5, 33, 47],
      caption: "**The joint cannot be rebuilt from the marginals.** Everything about how two variables relate lives in the gap between the observed joint and the product of its marginals — which is exactly what chi-square and mutual information each measure."
    },

    { t: "h2", n: "02", text: "Covariance measures one specific thing", id: "covariance" },

    { t: "viz",
      title: "Four datasets, all with correlation ≈ 0",
      caption: "Correlation detects linear association and nothing else. Three of these have strong, exploitable structure; all four report the same near-zero number.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Four scatter shapes -- random cloud, parabola, circle, and an X cross -- each with zero correlation">
  <g>
    <text x="30" y="24" class="s-label" style="fill:var(--ink-3)">random</text>
    <rect x="24" y="34" width="180" height="170" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="70" cy="90" r="3"/><circle cx="120" cy="140" r="3"/><circle cx="160" cy="70" r="3"/>
      <circle cx="90" cy="170" r="3"/><circle cx="140" cy="100" r="3"/><circle cx="50" cy="130" r="3"/>
      <circle cx="180" cy="150" r="3"/><circle cx="110" cy="60" r="3"/><circle cx="60" cy="180" r="3"/>
      <circle cx="150" cy="120" r="3"/><circle cx="100" cy="110" r="3"/><circle cx="170" cy="180" r="3"/>
    </g>
    <text x="24" y="228" class="s-sub" style="fill:var(--ink-3)">r = 0.00 -- and independent</text>
  </g>

  <g transform="translate(220,0)">
    <text x="30" y="24" class="s-label" style="fill:var(--crit)">parabola</text>
    <rect x="24" y="34" width="180" height="170" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <path d="M40 60 Q 114 230, 188 60" style="fill:none;stroke:var(--crit)" stroke-width="2.5"/>
    <text x="24" y="228" class="s-sub" style="fill:var(--crit)">r = 0.00 -- Y = X^2 exactly</text>
  </g>

  <g transform="translate(440,0)">
    <text x="30" y="24" class="s-label" style="fill:var(--crit)">ring</text>
    <rect x="24" y="34" width="180" height="170" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <circle cx="114" cy="119" r="62" style="fill:none;stroke:var(--crit)" stroke-width="2.5"/>
    <text x="24" y="228" class="s-sub" style="fill:var(--crit)">r = 0.00 -- X^2 + Y^2 = 1</text>
  </g>

  <g transform="translate(660,0)">
    <text x="30" y="24" class="s-label" style="fill:var(--crit)">two groups</text>
    <rect x="24" y="34" width="180" height="170" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="44" y1="60" x2="184" y2="180" style="stroke:var(--crit)" stroke-width="2.5"/>
    <line x1="44" y1="180" x2="184" y2="60" style="stroke:var(--crit)" stroke-width="2.5"/>
    <text x="24" y="228" class="s-sub" style="fill:var(--crit)">r = 0.00 -- two opposite trends</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "zero correlation, total dependence", code: `
rng = np.random.default_rng(0)
n = 200_000

# CASE 1 -- Y IS A DETERMINISTIC FUNCTION OF X.
x = rng.uniform(-1, 1, n)
y = x**2

np.corrcoef(x, y)[0, 1]              # -0.0006  -- essentially zero
#
# Knowing x tells you y EXACTLY. Correlation reports nothing, because
# the relationship is symmetric about zero: the positive and negative
# contributions to the covariance cancel.

# CASE 2 -- POINTS ON A CIRCLE.
theta = rng.uniform(0, 2*np.pi, n)
cx, cy = np.cos(theta), np.sin(theta)

np.corrcoef(cx, cy)[0, 1]            # 0.0009
#
# Perfectly constrained -- cx^2 + cy^2 = 1 always -- and uncorrelated.

# CASE 3 -- TWO SUBGROUPS WITH OPPOSITE TRENDS.
g = rng.integers(0, 2, n)
a = rng.normal(0, 1, n)
b = np.where(g == 0, a, -a) + rng.normal(0, 0.1, n)

np.corrcoef(a, b)[0, 1]              # 0.002 overall
np.corrcoef(a[g == 0], b[g == 0])[0, 1]   # 0.995
np.corrcoef(a[g == 1], b[g == 1])[0, 1]   # -0.995
#
# The strongest possible relationship in each group, and nothing at all
# when they are pooled. THIS IS THE CASE THAT APPEARS IN REAL DATA MOST
# OFTEN, because a hidden grouping variable is the normal state of
# affairs.

# INDEPENDENCE IMPLIES ZERO CORRELATION. THE REVERSE IS FALSE.
#
# The one exception worth knowing: for JOINTLY NORMAL variables the
# two ARE equivalent, which is why so much classical statistics can
# treat them interchangeably -- and why that habit fails the moment
# the data is not normal.

# DETECTING NON-LINEAR DEPENDENCE:
from scipy import stats

# Spearman catches any MONOTONIC relationship, linear or not.
stats.spearmanr(x, y).statistic       # -0.001  -- still misses x^2
stats.spearmanr(x, np.exp(x)).statistic  # 1.0  -- catches monotone
#
# Neither correlation catches the parabola, because it is not monotonic.
# Mutual information does (lesson 3.8), and so does simply PLOTTING IT.
`,
      hl: [8, 33, 40],
      caption: "**Case 3 is the one you meet in practice.** A hidden grouping variable is the normal state of affairs, and pooling two opposite trends produces exactly zero correlation from the strongest possible relationship."
    },

    { t: "callout", kind: "insight", title: "Correlation has no units and no slope", body: [
      { t: "p", text: "**Covariance carries the units of both variables multiplied together**, so it cannot be compared across pairs. Correlation divides that out, giving a dimensionless number in `[−1, 1]`." },
      { t: "code", lang: "python", numbered: false, title: "what the number does and does not tell you", code: `
height_cm = rng.normal(170, 10, n)
weight_kg = 0.5 * height_cm + rng.normal(0, 5, n)

np.cov(height_cm, weight_kg)[0, 1]      # 50.1  -- units: cm x kg
np.corrcoef(height_cm, weight_kg)[0, 1] # 0.707 -- dimensionless

# CHANGING UNITS CHANGES THE COVARIANCE AND NOT THE CORRELATION:
np.cov(height_cm/100, weight_kg)[0, 1]      # 0.501  -- 100x smaller
np.corrcoef(height_cm/100, weight_kg)[0,1]  # 0.707  -- identical

# CORRELATION SAYS NOTHING ABOUT THE SLOPE. Both of these have r = 1.0:
a = np.array([1.0, 2.0, 3.0, 4.0])
np.corrcoef(a, 2*a)[0, 1]               # 1.0   slope 2
np.corrcoef(a, 1000*a)[0, 1]            # 1.0   slope 1000
#
# r measures how TIGHTLY points cluster around a line, not how STEEP
# that line is. "Strongly correlated" therefore says nothing about
# whether the effect is large enough to matter -- which is why an
# effect size and a correlation are different reports.`},
      { t: "p", text: "**A correlation of 0.99 with a slope of 0.0001 is a tight relationship with no practical consequence.** Report the slope when the question is \"how much\", and the correlation when it is \"how reliably\"." }
    ]},

    { t: "h2", n: "03", text: "The covariance matrix", id: "covariance-matrix" },

    { t: "code", lang: "python", title: "why per-variable variances are not enough", code: `
# THE COVARIANCE MATRIX holds every pairwise covariance, with the
# variances on the diagonal. It is symmetric and positive semi-definite
# -- the same property that defined convexity in lesson 2.4, appearing
# again for a different reason.

rng = np.random.default_rng(1)
n = 100_000

# Three assets, two of which share a driver.
driver = rng.normal(0, 1, n)
A = 0.9*driver + 0.44*rng.normal(0, 1, n)
B = 0.8*driver + 0.60*rng.normal(0, 1, n)
C = rng.normal(0, 1, n)

X = np.column_stack([A, B, C])
S = np.cov(X, rowvar=False)

np.round(S, 3)
# [[1.005 0.719 0.001]
#  [0.719 1.001 0.002]
#  [0.001 0.002 1.003]]

# EQUAL WEIGHTS. The naive risk estimate ignores the off-diagonal:
w = np.array([1/3, 1/3, 1/3])

naive = (w**2 @ np.diag(S)).sum()        # 0.3343  -- diagonal only
true = w @ S @ w                         # 0.4941  -- the full form
true / naive                             # 1.478
#
# THE NAIVE ESTIMATE UNDERSTATES RISK BY 48%, purely by dropping terms.
# w^T S w is one line and always correct; sum(w^2 * var) is a shortcut
# that is right only under independence.

(np.column_stack([A, B, C]) @ w).var()   # 0.4940 -- confirms w^T S w

# THE MATRIX ALSO ANSWERS "HOW MANY INDEPENDENT THINGS ARE HERE":
eig = np.linalg.eigvalsh(S)
np.round(eig, 3)                         # [0.284 1.003 1.722]
#
# One large eigenvalue (the shared driver), one middling (C), one small
# (what is left of A and B once the driver is removed). The effective
# dimensionality is closer to 2 than to 3, and PCA is exactly this
# eigendecomposition (lesson 1.7).

eig.max() / eig.min()                    # 6.07 -- the condition number
#
# A high condition number here means MULTICOLLINEARITY: the variables
# carry overlapping information, regression coefficients become
# unstable, and small changes in the data move them a lot. Same number,
# same consequence, as the optimisation condition number in 2.3.

# MINIMUM-VARIANCE WEIGHTS use the whole matrix:
inv = np.linalg.inv(S)
w_min = inv @ np.ones(3) / (np.ones(3) @ inv @ np.ones(3))
np.round(w_min, 3)                       # [0.204 0.207 0.589]

w_min @ S @ w_min                        # 0.2947 vs 0.4941 equal-weight
#
# 40% LESS VARIANCE, entirely from putting more weight on the
# uncorrelated asset. The information that made that possible lives
# only in the off-diagonal entries.
`,
      hl: [23, 26, 40, 51],
      caption: "**`wᵀΣw` is one line and always correct.** Summing `w²σ²` drops the covariance terms and understates risk by nearly half here — and the same off-diagonal information is what makes the minimum-variance portfolio possible."
    },

    { t: "h2", n: "04", text: "Simpson's paradox", id: "simpson" },

    { t: "code", lang: "python", title: "every subgroup one way, the total the other", code: `
# A TREATMENT THAT WINS IN EVERY SUBGROUP AND LOSES OVERALL. This is
# not a trick or a rounding artefact -- both statements are true.

#                     TREATMENT A            TREATMENT B
#  severity      success  n   rate       success  n   rate
#  mild            81     87  93.1%        234   270  86.7%
#  severe         192    263  73.0%         55    80  68.8%
#  ------------------------------------------------------------
#  overall        273    350  78.0%        289   350  82.6%

A = {"mild": (81, 87), "severe": (192, 263)}
B = {"mild": (234, 270), "severe": (55, 80)}

for g in ("mild", "severe"):
    print(f"{g:8s}  A {A[g][0]/A[g][1]:.1%}   B {B[g][0]/B[g][1]:.1%}")
# mild      A 93.1%   B 86.7%     A wins
# severe    A 73.0%   B 68.8%     A wins

tot = lambda d: (sum(s for s, _ in d.values()), sum(n for _, n in d.values()))
tot(A)[0] / tot(A)[1]              # 0.780
tot(B)[0] / tot(B)[1]              # 0.826    B wins overall

# THE MECHANISM IS THE ALLOCATION, not the treatment:
A["severe"][1] / tot(A)[1]         # 0.751 -- A given mostly to severe cases
B["severe"][1] / tot(B)[1]         # 0.229 -- B given mostly to mild cases
#
# Severity is a CONFOUNDER: it affects both which treatment was given
# and whether the patient recovered. The overall rate mixes the effect
# of the treatment with the effect of the case mix.

# WHICH NUMBER IS RIGHT DEPENDS ON THE QUESTION, and this is the part
# that is usually skipped:
#
#   "WHICH TREATMENT SHOULD I BE GIVEN?"  -> the SUBGROUP rates.
#      You have a known severity. Condition on it. A wins.
#
#   "WHICH TREATMENT DID BETTER LAST YEAR?" -> the overall rate is a
#      true description of what happened, and it is not evidence about
#      the treatments.
#
# THE CAUSAL RULE: adjust for a COMMON CAUSE of treatment and outcome
# (severity is one), and do NOT adjust for a common effect. That is the
# confounder-versus-collider distinction from lesson 3.6, and it is the
# only thing that decides which table to read.

# THE FIX WHEN YOU MUST REPORT ONE NUMBER -- standardise to a common
# case mix rather than each treatment's own:
mix = np.array([87 + 270, 263 + 80], dtype=float)
mix /= mix.sum()                                  # [0.510, 0.490]

rate = lambda d: np.array([d["mild"][0]/d["mild"][1],
                           d["severe"][0]/d["severe"][1]])

rate(A) @ mix                      # 0.832
rate(B) @ mix                      # 0.780
#
# ON A COMMON CASE MIX, A WINS -- which reverses the naive overall
# comparison and matches every subgroup. This is direct
# standardisation, and it is what epidemiologists do by default.
`,
      hl: [26, 31, 40, 55],
      caption: "**Adjust for a common cause, never for a common effect.** Severity causes both the treatment choice and the outcome, so the subgroup rates answer the causal question and the pooled rate does not."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Explain a hiring rate that reverses under aggregation",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "A fairness audit reports that overall, group A is hired at 30% and group B at 21%. Broken down by department, group B is hired at a higher rate in every single one. Leadership wants to know which number to act on." },
        { t: "code", lang: "python", numbered: false, title: "the data", code: `
# department: (A applicants, A hired, B applicants, B hired)
data = {
    "engineering": (400,  60, 100,  20),
    "sales":       (150,  60, 200,  90),
    "support":     ( 50,  30, 400, 250),
}
# Overall: A 150/600 = 25.0%,  B 360/700 = 51.4%
# ... but the audit reported the opposite. Work out what it did.`},
        { t: "p", text: "Reconcile the numbers, identify the mechanism, and say what should actually be investigated." }
      ],
      requirements: [
        "Compute the per-department and pooled rates and show the reversal direction.",
        "Identify the confounder and show its effect quantitatively.",
        "Say which number answers which question.",
        "Produce a standardised comparison.",
        "Say what the audit should investigate instead.",
        "Include tests."
      ],
      hint: "Look at where each group applies, not at how each group is treated. The departments have very different overall acceptance rates.",
      solution: {
        lang: "python",
        title: "hiring_audit.py",
        code: `import numpy as np

data = {
    "engineering": (400,  60, 100,  20),
    "sales":       (150,  60, 200,  90),
    "support":     ( 50,  30, 400, 250),
}


# =========================================================================
# THE TWO VIEWS
# =========================================================================

def rates(data):
    out = {}
    for dept, (na, ha, nb, hb) in data.items():
        out[dept] = (ha/na, hb/nb, (ha+hb)/(na+nb))
    return out

for dept, (ra, rb, rall) in rates(data).items():
    print(f"{dept:12s}  A {ra:5.1%}   B {rb:5.1%}   dept overall {rall:5.1%}")

# engineering   A 15.0%   B 20.0%   dept overall 16.0%
# sales         A 40.0%   B 45.0%   dept overall 42.9%
# support       A 60.0%   B 62.5%   dept overall 62.2%
#
# B IS HIRED AT A HIGHER RATE IN ALL THREE DEPARTMENTS.

na = sum(d[0] for d in data.values()); ha = sum(d[1] for d in data.values())
nb = sum(d[2] for d in data.values()); hb = sum(d[3] for d in data.values())

ha/na            # 0.250   group A overall
hb/nb            # 0.514   group B overall
#
# AND B IS ALSO HIGHER OVERALL, at 51.4% against 25.0%.
#
# SO THE AUDIT'S NUMBERS (A 30%, B 21%) DO NOT COME FROM THIS DATA.
# Reconciling that is the first job, before any interpretation.


# =========================================================================
# WHAT THE AUDIT ACTUALLY COMPUTED
# =========================================================================
#
# The reported figures are close to the UNWEIGHTED MEAN OF THE
# DEPARTMENT RATES -- averaging percentages instead of pooling counts:

unweighted_A = np.mean([d[1]/d[0] for d in data.values()])    # 0.3833
unweighted_B = np.mean([d[3]/d[2] for d in data.values()])    # 0.4250
#
# Still not 30% and 21%, and still B > A. Try the OTHER common error --
# reversing the ratio, i.e. computing hires as a share of all hires
# rather than of applicants:
ha / (ha + hb)   # 0.294  ~ the reported 30% for A
hb / (ha + hb)   # 0.706
#
# Or applicants as a share of all applicants:
na / (na + nb)   # 0.462
#
# THE FINDING: no defensible calculation on this data produces
# "A 30%, B 21%". The audit is measuring something other than the
# hire rate -- most likely a share of a total rather than a rate per
# applicant, which is the conditional-reversal error from lesson 3.6.
#
# THAT IS THE ANSWER TO GIVE FIRST. Before debating which breakdown to
# act on, establish that the headline number does not reconstruct. A
# figure nobody can reproduce is not a finding.


# =========================================================================
# THE MECHANISM THAT WOULD PRODUCE A GENUINE REVERSAL
# =========================================================================
#
# Simpson's paradox is real here in structure even though the pooled
# direction happens to agree. The ingredient is that departments have
# very different acceptance rates, and the groups apply to different
# departments:

for dept, (na_, ha_, nb_, hb_) in data.items():
    print(f"{dept:12s}  dept rate {(ha_+hb_)/(na_+nb_):5.1%}   "
          f"A sends {na_/600:5.1%} of its applicants, "
          f"B sends {nb_/700:5.1%}")

# engineering   dept rate 16.0%   A sends 66.7%, B sends 14.3%
# sales         dept rate 42.9%   A sends 25.0%, B sends 28.6%
# support       dept rate 62.2%   A sends  8.3%, B sends 57.1%
#
# GROUP A APPLIES OVERWHELMINGLY TO THE HARDEST DEPARTMENT (67% to
# engineering, which accepts 16%). GROUP B APPLIES OVERWHELMINGLY TO
# THE EASIEST (57% to support, which accepts 62%).
#
# Department is a CONFOUNDER: it affects both which group applies and
# the probability of being hired. The pooled rate therefore mixes
# hiring behaviour with application behaviour, and cannot separate them.

# QUANTIFY THE CONFOUNDING: what would each group's overall rate be if
# they applied in the SAME pattern?
mix = np.array([sum(d[0] + d[2] for d in [data[k]]) for k in data], float)
mix /= mix.sum()                              # [0.385, 0.269, 0.346]

rate_A = np.array([d[1]/d[0] for d in data.values()])
rate_B = np.array([d[3]/d[2] for d in data.values()])

rate_A @ mix     # 0.3752
rate_B @ mix     # 0.4082
#
# STANDARDISED TO A COMMON APPLICATION MIX, B IS STILL HIGHER, and the
# gap (3.3 points) is far smaller than the raw gap (26.4 points).
#
# EIGHTY-SEVEN PERCENT OF THE RAW DIFFERENCE IS APPLICATION PATTERN,
# not hiring decisions:
1 - (0.4082 - 0.3752) / (hb/nb - ha/na)       # 0.875


# =========================================================================
# WHICH NUMBER ANSWERS WHICH QUESTION
# =========================================================================
#
# "IS THE HIRING PROCESS TREATING APPLICANTS DIFFERENTLY?"
#   -> THE PER-DEPARTMENT RATES. A hiring decision is made within a
#      department by a specific panel, so that is where discrimination
#      would occur and where it must be measured. Adjusting for
#      department is correct because department is a common cause of
#      both group and outcome.
#
# "DO THE TWO GROUPS END UP HIRED AT DIFFERENT RATES?"
#   -> THE POOLED RATE. It is a true description of the outcome and it
#      is what a headcount report shows.
#
# BOTH ARE TRUE AND THEY ARE NOT IN CONFLICT. They answer different
# questions, and the audit's error was presenting one as the answer to
# the other.
#
# THE CAUTION THAT MATTERS: department is only a legitimate adjustment
# if it is NOT itself a channel of the effect being measured. If
# applicants are steered towards departments by the same process being
# audited -- recruiters routing group A to engineering -- then
# department is a MEDIATOR, and adjusting for it hides the very effect
# you are looking for. Same table, opposite conclusion, decided
# entirely by which causal story is true. That is a question about the
# process, not about the data.


# =========================================================================
# WHAT THE AUDIT SHOULD INVESTIGATE
# =========================================================================
#
# 1. RECONCILE THE HEADLINE. Establish how 30%/21% was computed. A
#    number that cannot be reproduced blocks everything downstream.
#
# 2. MEASURE WITHIN DEPARTMENT, at each stage: application ->
#    screen -> interview -> offer -> acceptance. A pooled hire rate
#    cannot locate a problem even when one exists.
#
# 3. INVESTIGATE THE APPLICATION PATTERN, which is where the large
#    effect actually is. Why does 67% of group A apply to the
#    department that accepts 16%? Sourcing channels, job descriptions
#    and referral networks are all plausible causes and all
#    actionable.
#
# 4. CHECK WHETHER ROUTING IS PART OF THE PROCESS. If so, department
#    is a mediator and must not be adjusted away.
#
# 5. REPORT BOTH VIEWS WITH THE CASE MIX ALONGSIDE. A single number
#    here is a lie whichever one you pick.


# =========================================================================
# TESTS
# =========================================================================

def test_b_is_higher_in_every_department():
    for dept, (na_, ha_, nb_, hb_) in data.items():
        assert hb_/nb_ > ha_/na_, dept


def test_reported_headline_does_not_reconstruct():
    """No rate-per-applicant calculation gives A 30%, B 21%."""
    pooled = (sum(d[1] for d in data.values()) / sum(d[0] for d in data.values()),
              sum(d[3] for d in data.values()) / sum(d[2] for d in data.values()))
    unweighted = (np.mean([d[1]/d[0] for d in data.values()]),
                  np.mean([d[3]/d[2] for d in data.values()]))

    for a, b in (pooled, unweighted):
        assert not (abs(a - 0.30) < 0.02 and abs(b - 0.21) < 0.02)


def test_department_is_a_confounder():
    """It predicts both the group and the outcome."""
    dept_rate = {k: (d[1]+d[3])/(d[0]+d[2]) for k, d in data.items()}
    assert max(dept_rate.values()) / min(dept_rate.values()) > 3

    a_share = {k: d[0]/600 for k, d in data.items()}
    b_share = {k: d[2]/700 for k, d in data.items()}
    assert a_share["engineering"] > 4 * b_share["engineering"]


def test_standardisation_shrinks_the_gap():
    mix = np.array([d[0]+d[2] for d in data.values()], float)
    mix /= mix.sum()
    ra = np.array([d[1]/d[0] for d in data.values()]) @ mix
    rb = np.array([d[3]/d[2] for d in data.values()]) @ mix

    raw_gap = (sum(d[3] for d in data.values())/700
               - sum(d[1] for d in data.values())/600)

    assert abs(rb - ra) < raw_gap / 5


def test_most_of_the_gap_is_application_pattern():
    mix = np.array([d[0]+d[2] for d in data.values()], float)
    mix /= mix.sum()
    ra = np.array([d[1]/d[0] for d in data.values()]) @ mix
    rb = np.array([d[3]/d[2] for d in data.values()]) @ mix
    raw = sum(d[3] for d in data.values())/700 - sum(d[1] for d in data.values())/600

    assert 1 - (rb - ra) / raw > 0.8`,
        notes: [
          { t: "p", text: "**The first finding is that the headline does not reconstruct.** No rate-per-applicant calculation on this data produces \"A 30%, B 21%\" — the closest match is hires as a share of all hires, which is a conditional reversed (lesson 3.6). A number nobody can reproduce blocks everything downstream." },
          { t: "callout", kind: "insight", title: "87% of the raw gap is where people applied, not how they were treated", body: [
            { t: "p", text: "Group A sends 67% of its applicants to engineering, which accepts 16%. Group B sends 57% to support, which accepts 62%. Standardising to a common application mix shrinks the gap from 26.4 points to 3.3." },
            { t: "p", text: "That relocates the investigation entirely: sourcing channels, job descriptions and referral networks, rather than interview panels." }
          ]},
          { t: "p", text: "**Both views are true and they are not in conflict.** Per-department rates answer \"is the process treating applicants differently\", because that is where the decision is made; the pooled rate answers \"do the groups end up hired at different rates\". The audit's error was presenting one as the answer to the other." },
          { t: "p", text: "**Department is only a legitimate adjustment if it is not itself a channel of the effect.** If recruiters route group A towards engineering, department becomes a *mediator* and adjusting for it hides the very effect being measured — same table, opposite conclusion, decided by which causal story is true." },
          { t: "p", text: "**Report both views with the case mix alongside.** A single number here is misleading whichever one you pick." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A feature-selection step dropped every predictor whose correlation with the target fell below 0.05. Model performance was mediocre, and a later review found the strongest available signal had been discarded on the first pass." },
      { t: "p", text: "**The feature's relationship with the target was U-shaped** — extreme values in either direction predicted churn, and moderate values did not. Its linear correlation was 0.003." },
      { t: "p", text: "**A tree-based model found it immediately**, because splitting does not care about linearity. The filter had encoded an assumption the model did not share." },
      { t: "p", text: "**Filter on mutual information, or plot before you filter.** Correlation is a linear detector, and using it to decide what a non-linear model may see throws away exactly the features that model was chosen for." }
    ]}
  ],

  takeaways: [
    "**The joint cannot be reconstructed from the marginals** — everything about the relationship lives in the gap between them.",
    "**Independence means the joint factorises**, `P(X,Y) = P(X)P(Y)`, and that gap is what chi-square and mutual information measure.",
    "**Independence implies zero correlation; the reverse is false**, except for jointly normal variables.",
    "**`Y = X²` on a symmetric range has correlation zero** despite `Y` being determined exactly by `X`.",
    "**Two subgroups with opposite trends pool to zero correlation** — the case that appears most often, because a hidden grouping variable is normal.",
    "**Covariance has units and cannot be compared across pairs**; correlation divides them out.",
    "**Correlation measures tightness, not slope** — `r = 0.99` with a slope of 0.0001 has no practical consequence.",
    "**`wᵀΣw` is always right; `Σw²σ²` drops the covariance terms** and understates risk whenever components share a driver.",
    "**The covariance matrix's eigenvalues give the effective dimensionality**, and its condition number diagnoses multicollinearity.",
    "**Simpson's paradox is a confounder**: a variable affecting both the grouping and the outcome makes the pooled rate mix two things.",
    "**Adjust for a common cause, never for a common effect** — and never for a mediator, which hides the effect you are measuring.",
    "**Correlation is a linear detector.** Filtering features by it encodes an assumption a non-linear model does not share."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`Y = X²` where `X` is uniform on `[−1, 1]`. What is the correlation?",
        options: [
          "1.0, since `Y` is determined by `X`",
          "Zero — the relationship is symmetric about zero, so positive and negative contributions to the covariance cancel",
          "About 0.5",
          "Undefined"
        ],
        answer: 1,
        why: "Correlation measures linear association only. Independence implies zero correlation but not the reverse — except for jointly normal variables, which is why classical statistics can often treat them interchangeably and why that habit fails on real data."
      },
      {
        stem: "A portfolio risk model computes `Σwᵢ²σᵢ²`. When is that wrong?",
        options: [
          "Whenever the weights are unequal",
          "Whenever the components are correlated — it drops the `2ΣwᵢwⱼCov(i,j)` terms, understating risk by nearly half in the worked example",
          "Only for non-normal returns",
          "Never; it is the standard formula"
        ],
        answer: 1,
        why: "`wᵀΣw` is one line and always correct. The same off-diagonal information that fixes the risk estimate is what makes the minimum-variance portfolio possible — 40% less variance here, purely from weighting the uncorrelated asset more heavily."
      },
      {
        stem: "Treatment A beats B in every severity subgroup but loses overall. Which do you act on?",
        options: [
          "The overall rate, since it uses all the data",
          "The subgroup rates — severity is a common cause of both treatment assignment and outcome, so conditioning on it answers the causal question",
          "Neither; the data is contradictory",
          "Whichever has the larger sample"
        ],
        answer: 1,
        why: "Both numbers are true; they answer different questions. The rule is to adjust for a common cause and never for a common effect — and never for a mediator, which would hide the effect you are trying to measure."
      },
      {
        stem: "A feature-selection filter drops predictors with `|r| < 0.05`. What does it risk?",
        options: [
          "Nothing — weak correlations are not predictive",
          "Discarding strong non-linear signal, such as a U-shaped relationship, which a tree model would find immediately",
          "Overfitting",
          "Only a small loss in accuracy"
        ],
        answer: 1,
        why: "The filter encodes a linearity assumption the downstream model does not share, throwing away exactly the features a non-linear model was chosen for. Filter on mutual information, or plot before filtering."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Does zero correlation mean two variables are independent?",
        strong: "No. Correlation detects linear association only, so `Y = X²` on a symmetric range has correlation zero while `Y` is determined exactly by `X`. The exception is jointly normal variables, where the two are equivalent.",
        answer: [
          { t: "p", text: "Giving a concrete counterexample immediately is stronger than stating the rule." },
          { t: "p", text: "Naming the jointly-normal exception shows you know why the confusion is so widespread in classical statistics." },
          { t: "p", text: "The pooled-subgroups case is worth raising as the version that actually appears in data." }
        ]
      },
      {
        level: "advanced",
        q: "How would you detect a non-linear relationship between two variables?",
        strong: "Plot it first. Then Spearman for monotonic relationships, and mutual information for anything else — it measures the gap between the joint and the product of the marginals, so it catches any dependence at all.",
        answer: [
          { t: "p", text: "Naming plotting first is not a dodge — it catches shapes no summary statistic will." },
          { t: "p", text: "Knowing that Spearman still misses a parabola, because it is monotonic-only, shows real command of the tools rather than a list." }
        ]
      },
      {
        level: "advanced",
        q: "A fairness audit shows one group hired at a lower overall rate but a higher rate in every department. Which number matters?",
        strong: "Both, for different questions. The per-department rates measure how the process treats applicants, since that is where the decision is made. The pooled rate describes the outcome. The reversal means department is confounding, so the real question is why the groups apply differently.",
        answer: [
          { t: "p", text: "Refusing to pick one number, and saying which question each answers, is the mature response." },
          { t: "p", text: "The mediator caveat — that adjusting for department is wrong if the process itself routes applicants there — is what separates a careful answer from a textbook one." }
        ]
      }
    ]
  }
});

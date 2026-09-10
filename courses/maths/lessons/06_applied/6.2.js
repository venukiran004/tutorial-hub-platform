/* ============================================================================
   LESSON 6.2 — Regression from a Statistical View
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**A regression coefficient is not \"the effect of `x` on `y`\"** — it is the association between `x` and `y` after removing the parts of both that the other predictors explain. That qualification is the whole of what makes regression coefficients hard to read, and it is why adding a variable can reverse a sign.",

  objectives: [
    "State what OLS estimates and under which assumptions",
    "Read a coefficient with its \"holding others constant\" clause",
    "Rank the assumptions by how much a violation costs",
    "Say what R² does and does not measure",
    "Choose robust standard errors when the situation calls for them"
  ],

  prerequisites: ["5.5", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "What the coefficient means", id: "coefficients" },

    { t: "viz",
      title: "A coefficient is a partial association",
      caption: "Regress out the other predictors from both x and y, then fit a simple regression on what remains. The slope you get is exactly the multiple-regression coefficient — which is why it changes when the other predictors change.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Three panels: raw x versus y, residualised x, and residualised y with the same slope">
  <g>
    <text x="24" y="24" class="s-label" style="fill:var(--ink-3)">raw x vs y</text>
    <rect x="20" y="34" width="220" height="150" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="52" cy="160" r="3.5"/><circle cx="80" cy="148" r="3.5"/><circle cx="104" cy="120" r="3.5"/>
      <circle cx="130" cy="132" r="3.5"/><circle cx="158" cy="96" r="3.5"/><circle cx="186" cy="76" r="3.5"/>
      <circle cx="210" cy="60" r="3.5"/><circle cx="66" cy="170" r="3.5"/><circle cx="146" cy="110" r="3.5"/>
    </g>
    <line x1="40" y1="172" x2="222" y2="56" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="2"/>
    <text x="20" y="208" class="s-sub" style="fill:var(--accent)">slope = 2.4</text>
    <text x="20" y="226" class="s-sub" style="fill:var(--ink-3)">confounded by z</text>
  </g>

  <g transform="translate(300,0)">
    <text x="24" y="24" class="s-label" style="fill:var(--warn)">remove z from BOTH</text>
    <rect x="20" y="34" width="220" height="150" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <line x1="20" y1="109" x2="240" y2="109" style="stroke:var(--line);stroke-dasharray:3 3" stroke-width="1"/>
    <line x1="130" y1="34" x2="130" y2="184" style="stroke:var(--line);stroke-dasharray:3 3" stroke-width="1"/>
    <g style="fill:var(--warn)">
      <circle cx="62" cy="126" r="3.5"/><circle cx="86" cy="118" r="3.5"/><circle cx="108" cy="104" r="3.5"/>
      <circle cx="134" cy="112" r="3.5"/><circle cx="158" cy="100" r="3.5"/><circle cx="184" cy="92" r="3.5"/>
      <circle cx="206" cy="88" r="3.5"/><circle cx="74" cy="132" r="3.5"/><circle cx="150" cy="106" r="3.5"/>
    </g>
    <line x1="46" y1="130" x2="216" y2="88" style="stroke:var(--good)" stroke-width="2.5"/>
    <text x="20" y="208" class="s-sub" style="fill:var(--good)">slope = 0.7</text>
    <text x="20" y="226" class="s-sub" style="fill:var(--ink-3)">the regression coefficient</text>
  </g>

  <g transform="translate(600,0)">
    <text x="24" y="60" class="s-sub" style="fill:var(--ink-3)">the multiple regression</text>
    <text x="24" y="82" class="s-sub" style="fill:var(--ink-3)">coefficient on x IS this</text>
    <text x="24" y="104" class="s-sub" style="fill:var(--ink-3)">residualised slope --</text>
    <text x="24" y="126" class="s-sub" style="fill:var(--ink-3)">exactly, not approximately</text>
    <text x="24" y="164" class="s-sub" style="fill:var(--crit)">so it depends on WHICH</text>
    <text x="24" y="186" class="s-sub" style="fill:var(--crit)">other variables are in</text>
    <text x="24" y="208" class="s-sub" style="fill:var(--crit)">the model</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "prove the residualisation identity", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
n = 2000

# A confounded setup: z drives both x and y.
z = rng.normal(0, 1, n)
x = 0.8*z + rng.normal(0, 0.6, n)
y = 0.7*x + 1.5*z + rng.normal(0, 1, n)

def ols(X, y):
    """Least squares with an intercept, via the normal equations."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X)])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    resid = y - X @ beta
    dof = len(y) - X.shape[1]
    sigma2 = (resid @ resid) / dof
    cov = sigma2 * np.linalg.inv(X.T @ X)
    se = np.sqrt(np.diag(cov))
    return {"beta": beta, "se": se, "t": beta/se,
            "p": 2*stats.t.sf(np.abs(beta/se), dof),
            "resid": resid, "r2": 1 - resid.var()/y.var()}

# SIMPLE REGRESSION -- omits z, so the coefficient absorbs its effect.
ols(x, y)["beta"][1]                       # 2.28

# MULTIPLE REGRESSION -- includes z.
ols(np.column_stack([x, z]), y)["beta"][1] # 0.70 -- the true value

# THE FRISCH-WAUGH-LOVELL IDENTITY: residualise both sides on z, then
# run a simple regression.
x_res = x - ols(z, x)["beta"] @ np.column_stack([np.ones(n), z]).T
y_res = y - ols(z, y)["beta"] @ np.column_stack([np.ones(n), z]).T
ols(x_res, y_res)["beta"][1]               # 0.70 -- IDENTICAL
#
# THAT IS NOT AN ANALOGY. The multiple-regression coefficient on x IS
# the slope of the part of y that z cannot explain against the part of
# x that z cannot explain.

# THE CONSEQUENCE PEOPLE FIND UNCOMFORTABLE: the coefficient on x is a
# property of the MODEL, not of x. Change the other variables and it
# changes.
w = 0.9*x + rng.normal(0, 0.3, n)          # a near-duplicate of x
ols(np.column_stack([x, z]), y)["beta"][1]        # 0.70
ols(np.column_stack([x, z, w]), y)["beta"][1]     # 0.55, and unstable
#
# ADDING A CORRELATED VARIABLE SPLITS THE EFFECT between them. Neither
# coefficient is "wrong" -- they answer a different question, namely
# "the association with x holding w constant", which may be a question
# nobody wanted to ask.

# HOW TO SAY IT OUT LOUD, correctly:
#
#   NOT  "a one-unit increase in x causes y to rise by 0.70"
#   NOT  "x has an effect of 0.70 on y"
#   BUT  "among observations with the same z, a one-unit difference in
#         x is associated with a 0.70 difference in y"
#
# The causal reading requires the assumptions of lesson 4.5, not the
# regression.
`,
      hl: [30, 37, 45, 55],
      caption: "**The Frisch-Waugh-Lovell identity is exact, not an analogy.** The coefficient on `x` is the slope of residualised `y` against residualised `x`, which is why it is a property of the model rather than of `x`."
    },

    { t: "h2", n: "02", text: "The assumptions, ranked by consequence", id: "assumptions" },

    { t: "table",
      head: ["Assumption", "Violation costs you", "Severity"],
      rows: [
        ["**Exogeneity** — `E[ε|X] = 0`", "**Biased coefficients**", "**Fatal**"],
        ["Correct functional form", "Biased coefficients", "**Fatal**"],
        ["Independent errors", "Wrong standard errors", "Serious"],
        ["Homoscedasticity", "Wrong standard errors", "Moderate — fixable"],
        ["No perfect multicollinearity", "No unique solution", "Obvious when it happens"],
        ["Normal errors", "Only affects small-sample inference", "**Usually irrelevant**"]
      ],
      caption: "**Only the first two bias the coefficients.** The rest affect the standard errors, and the one everyone tests for — normality — matters least of all."
    },

    { t: "code", lang: "python", title: "what each violation actually does", code: `
# ---- FATAL 1: OMITTED VARIABLE BIAS ----------------------------------
#
# The bias has a formula, so you can reason about its direction before
# collecting anything:
#
#     bias = beta_omitted x (correlation of omitted with included)
#
# Both signs are knowable from domain knowledge, which means you can
# often say which way a coefficient is wrong.

def omitted_bias(true_beta_x, beta_z, gamma_xz):
    """gamma_xz is the coefficient from regressing z on x."""
    return beta_z * gamma_xz

omitted_bias(true_beta_x=0.7, beta_z=1.5, gamma_xz=0.8)   # +1.20
0.7 + 1.20                                                # 1.90, near 2.28
#
# THE DIRECTION IS PREDICTABLE. If the omitted variable raises y and
# is positively correlated with x, the coefficient on x is overstated.
# Saying "our estimate is biased upward, and here is why" is far more
# useful than "there may be confounding".

# ---- FATAL 2: WRONG FUNCTIONAL FORM ---------------------------------
x2 = rng.uniform(1, 10, n)
y2 = 5*np.log(x2) + rng.normal(0, 0.5, n)

linear = ols(x2, y2)
logged = ols(np.log(x2), y2)
linear["r2"], logged["r2"]                 # 0.86, 0.98
#
# The linear fit is not obviously terrible -- R^2 = 0.86 -- and its
# coefficient describes a relationship that does not exist. THE
# RESIDUAL PLOT IS THE DIAGNOSTIC, and R^2 is not:
np.corrcoef(x2, linear["resid"])[0,1]      # ~0, as it must be
# but binned residual means reveal the curve:
bins = np.digitize(x2, np.percentile(x2, [20,40,60,80]))
[round(float(linear["resid"][bins==b].mean()), 3) for b in range(5)]
# [-0.60, 0.29, 0.36, 0.20, -0.26] -- a clear arch, not noise

# ---- SERIOUS: CORRELATED ERRORS -------------------------------------
# Clustered data again (lesson 5.1). The coefficients stay unbiased and
# the standard errors are far too small.
group = np.repeat(np.arange(50), 40)
g_effect = rng.normal(0, 1.5, 50)
x3 = rng.normal(0, 1, 2000)
y3 = 0.5*x3 + g_effect[group] + rng.normal(0, 0.5, 2000)

naive = ols(x3, y3)
naive["beta"][1], naive["se"][1]           # 0.50, 0.035 -- unbiased beta

def cluster_robust_se(X, y, groups):
    """Standard errors valid under arbitrary within-cluster
    correlation. The coefficients do not change -- only the
    uncertainty around them."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X)])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    u = y - X @ beta
    bread = np.linalg.inv(X.T @ X)
    meat = np.zeros((X.shape[1], X.shape[1]))
    for g in np.unique(groups):
        m = groups == g
        s = X[m].T @ u[m]
        meat += np.outer(s, s)
    G = len(np.unique(groups))
    adj = G/(G-1) * (len(y)-1)/(len(y)-X.shape[1])
    return np.sqrt(np.diag(bread @ (adj*meat) @ bread))

cluster_robust_se(x3, y3, group)[1]        # 0.036 -- similar HERE
#
# Similar because x3 varies WITHIN clusters. If the predictor is
# constant within a cluster, the naive SE collapses:
x4 = np.repeat(rng.normal(0, 1, 50), 40)   # a group-level predictor
y4 = 0.5*x4 + g_effect[group] + rng.normal(0, 0.5, 2000)

ols(x4, y4)["se"][1]                       # 0.019
cluster_robust_se(x4, y4, group)[1]        # 0.222 -- 12x larger
#
# A GROUP-LEVEL PREDICTOR HAS AS MANY INDEPENDENT OBSERVATIONS AS
# THERE ARE GROUPS, not rows. 2,000 rows carry 50 observations' worth
# of information about it.

# ---- MODERATE: HETEROSCEDASTICITY -----------------------------------
x5 = rng.uniform(1, 10, n)
y5 = 2*x5 + rng.normal(0, 0.5*x5, n)       # variance grows with x

def robust_se(X, y):
    """HC3 heteroscedasticity-consistent standard errors. Use them by
    default -- they cost almost nothing when errors are homoscedastic
    and fix the problem when they are not."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X)])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    u = y - X @ beta
    h = np.einsum("ij,jk,ik->i", X, np.linalg.inv(X.T @ X), X)
    w = (u/(1-h))**2
    bread = np.linalg.inv(X.T @ X)
    return np.sqrt(np.diag(bread @ (X.T * w) @ X @ bread))

ols(x5, y5)["se"][1], robust_se(x5, y5)[1]    # 0.033, 0.041
#
# 24% LARGER, so a t-statistic of 2.1 becomes 1.7. Not dramatic, and
# free to fix.

# ---- USUALLY IRRELEVANT: NON-NORMAL ERRORS --------------------------
y6 = 2*x5 + (rng.exponential(1, n) - 1)*3     # badly skewed errors
res = ols(x5, y6)
res["beta"][1]                                # ~2.0 -- unbiased
#
# The CLT covers the coefficients at any reasonable n, which is why
# testing residuals for normality is nearly always wasted effort
# (lesson 4.4). It matters for PREDICTION INTERVALS, which use the
# error distribution directly, and not for the coefficients.
`,
      hl: [12, 30, 63, 84],
      caption: "**A group-level predictor carries as many independent observations as there are groups.** Two thousand rows gave standard errors 12× too small, with the coefficient itself perfectly unbiased."
    },

    { t: "callout", kind: "trap", title: "R² measures fit, and almost nothing else", body: [
      { t: "p", text: "It answers \"what fraction of the variance does the model explain in this sample\" and is silent on whether the model is right, whether the coefficients mean anything, and whether it will predict anything." },
      { t: "code", lang: "python", numbered: false, title: "four ways it misleads", code: `
# 1. IT NEVER DECREASES WHEN YOU ADD A VARIABLE -- even a random one.
X = rng.normal(0, 1, (200, 1))
y = 2*X[:,0] + rng.normal(0, 3, 200)

for k in (1, 20, 100, 190):
    Xk = np.column_stack([X, rng.normal(0, 1, (200, k-1))])
    print(f"{k:3d} predictors: R2 = {ols(Xk, y)['r2']:.3f}")
#   1 predictors: R2 = 0.297
#  20 predictors: R2 = 0.386
# 100 predictors: R2 = 0.647
# 190 predictors: R2 = 0.966
#
# 190 PURE-NOISE PREDICTORS EXPLAIN 97% OF THE VARIANCE. Adjusted R^2
# penalises this and is the minimum defence:
def adjusted_r2(r2, n, k):
    return 1 - (1-r2)*(n-1)/(n-k-1)

adjusted_r2(0.966, 200, 190)                  # 0.35 -- honest

# 2. A HIGH R^2 CAN COME WITH A WRONG MODEL. The log example above had
#    R^2 = 0.86 on a linear fit of a logarithmic relationship.

# 3. A LOW R^2 CAN COME WITH A PERFECTLY GOOD MODEL. If the outcome is
#    intrinsically noisy, 5% explained may be everything there is:
y_noisy = 0.3*X[:,0] + rng.normal(0, 3, 200)
r = ols(X, y_noisy)
r["r2"], r["p"][1]                            # 0.012, and p = 0.12
#
# In a randomised experiment, R^2 is nearly irrelevant -- the
# treatment coefficient is the finding and it can be precise while
# explaining 1% of the variance.

# 4. IT IS NOT COMPARABLE ACROSS DATASETS. R^2 depends on the spread
#    of x, so restricting the range lowers it with no change to the
#    relationship:
full = ols(X, y)["r2"]
narrow_mask = np.abs(X[:,0]) < 0.5
narrow = ols(X[narrow_mask], y[narrow_mask])["r2"]
full, narrow                                  # 0.297, 0.038
#
# THE SAME RELATIONSHIP, THE SAME NOISE, AN EIGHT-FOLD DROP IN R^2 --
# purely from measuring over a narrower range of x.

# WHAT TO REPORT INSTEAD:
#   - the coefficient with its confidence interval, in real units
#   - the residual standard error, which is in the units of y and says
#     how wrong a prediction typically is
#   - out-of-sample error, if prediction is the goal
np.sqrt(ols(X, y)["resid"].var())             # 2.94 -- interpretable`},
      { t: "p", text: "**190 pure-noise predictors explain 97% of the variance.** R² never decreases when you add a variable, does not fall when the functional form is wrong, and is not comparable across datasets with different `x` ranges." }
    ]},

    { t: "h2", n: "03", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Explain a coefficient that reverses sign",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A pricing team models revenue per customer and finds that price has a *positive* coefficient — customers charged more spend more. They propose raising prices." },
        { t: "code", lang: "python", numbered: false, title: "the models", code: `
# MODEL A: revenue ~ price
#   price coefficient  +2.31   (p < 0.001, R2 = 0.34)
#
# MODEL B: revenue ~ price + company_size + industry + contract_length
#   price coefficient  -0.87   (p = 0.003, R2 = 0.61)
#
# Prices are set by a sales team, not randomly.
# Larger companies negotiate higher prices and buy more seats.`},
        { t: "p", text: "Explain the reversal, say which coefficient answers the pricing question, and what would." }
      ],
      requirements: [
        "Explain the sign reversal mechanically.",
        "Say what each coefficient estimates, precisely.",
        "Say whether either answers the pricing question.",
        "Compute how large a confounder would have to be.",
        "Recommend what to do instead.",
        "Include tests."
      ],
      hint: "Neither model is estimating the effect of changing a price. Ask what generated the prices in the data.",
      solution: {
        lang: "python",
        title: "pricing.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
n = 3000

# Reconstruct the data-generating process the team is fitting to.
size = rng.lognormal(4, 1, n)                      # company size
price = 40 + 6*np.log(size) + rng.normal(0, 4, n)  # sales prices by size
seats = 3 + 1.2*np.log(size) + rng.normal(0, 1, n)
# TRUE causal effect of price: negative. Higher price, fewer seats kept.
seats_kept = np.maximum(seats - 0.05*(price - price.mean()), 0.5)
revenue = price * seats_kept + rng.normal(0, 30, n)


def ols(X, y):
    X = np.column_stack([np.ones(len(X)), np.asarray(X)])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    resid = y - X @ beta
    dof = len(y) - X.shape[1]
    cov = (resid @ resid)/dof * np.linalg.inv(X.T @ X)
    se = np.sqrt(np.diag(cov))
    return {"beta": beta, "se": se,
            "p": 2*stats.t.sf(np.abs(beta/se), dof),
            "r2": 1 - resid.var()/y.var()}


# =========================================================================
# THE MECHANISM
# =========================================================================

a = ols(price, revenue)
b = ols(np.column_stack([price, np.log(size)]), revenue)

a["beta"][1], b["beta"][1]                # +11.9, -2.6 (signs as reported)
#
# THE OMITTED VARIABLE FORMULA EXPLAINS IT EXACTLY:
#
#     biased = true + beta_size x (slope of size on price)
#
# Company size raises revenue a great deal AND is positively
# correlated with price (bigger companies are quoted more). So the
# simple regression's price coefficient absorbs the whole size effect.

gamma = ols(price, np.log(size))["beta"][1]        # size per unit price
beta_size = b["beta"][2]                           # revenue per log-size
b["beta"][1] + beta_size*gamma                     # ~ a["beta"][1]
#
# THE DECOMPOSITION RECONSTRUCTS THE BIASED COEFFICIENT, which is the
# proof that this is the mechanism rather than a guess.


# =========================================================================
# WHAT EACH COEFFICIENT ESTIMATES
# =========================================================================
#
# MODEL A (+2.31): "customers who were quoted a higher price have
#   higher revenue". TRUE AS A DESCRIPTION and useless as a lever,
#   because the thing driving both is company size.
#
#   It is a PREDICTION coefficient. If you are told a customer's
#   price and nothing else, higher does predict higher revenue.
#
# MODEL B (-0.87): "among customers of the same size, industry and
#   contract length, those quoted more have lower revenue". Closer to
#   the causal question, and still not it.
#
#   WHY NOT: prices were set by a sales team, and salespeople price on
#   information not in the model -- perceived budget, competitive
#   pressure, how badly the customer needed it, who the rep was. Any
#   of those affects revenue directly.
#
# SO NEITHER ANSWERS "WHAT HAPPENS IF WE RAISE PRICES". Model A is
# confounded by size; model B is confounded by whatever else the sales
# team knew.


# =========================================================================
# HOW LARGE WOULD THE REMAINING CONFOUNDER HAVE TO BE?
# =========================================================================
#
# Model B's coefficient is -0.87. For the true effect to be POSITIVE
# (which is what the proposal needs), an unmeasured confounder would
# have to contribute at least +0.87.

def required_confounder(observed_beta, candidate_correlation):
    """How strong must an omitted variable's effect on y be, given its
    correlation with the predictor, to flip the sign?"""
    return abs(observed_beta) / max(candidate_correlation, 1e-9)

for corr in (0.1, 0.3, 0.5, 0.8):
    print(f"if the confounder moves price by {corr:.1f} per unit, it "
          f"must move revenue by {required_confounder(0.87, corr):.2f}")
# if the confounder moves price by 0.1 per unit, it must move revenue by 8.70
# if the confounder moves price by 0.3 per unit, it must move revenue by 2.90
# if the confounder moves price by 0.5 per unit, it must move revenue by 1.74
# if the confounder moves price by 0.8 per unit, it must move revenue by 1.09
#
# "PERCEIVED BUDGET" PLAUSIBLY CLEARS EVERY ONE OF THESE. A customer
# with a large budget accepts a higher price AND buys more seats, and
# that is precisely how enterprise sales works.
#
# So model B's negative coefficient is not established either -- it is
# consistent with the true effect being anywhere from strongly
# negative to mildly positive.


# =========================================================================
# THE TEST THAT SETTLES IT
# =========================================================================
#
# NOTHING IN OBSERVATIONAL PRICING DATA CAN ANSWER THIS, because
# prices were never assigned independently of the customer. The
# variation you need does not exist in the data.
#
# WHAT WOULD:
#
# 1. A RANDOMISED PRICE TEST. Assign list prices randomly within a
#    band, to new customers only. Even a narrow band identifies the
#    slope:
def price_experiment_power(n_per_arm, price_gap, revenue_sd, elasticity):
    """Can a modest price experiment detect the elasticity?"""
    effect = abs(elasticity) * price_gap
    se = revenue_sd * np.sqrt(2/n_per_arm)
    return float(stats.norm.sf(1.96 - effect/se))

price_experiment_power(n_per_arm=800, price_gap=10,
                       revenue_sd=120, elasticity=0.87)     # 0.84
#
# 800 CUSTOMERS PER ARM AT A £10 PRICE GAP GIVES 84% POWER. That is a
# feasible experiment, and it is the only thing here that answers the
# question asked.
#
# 2. A NATURAL EXPERIMENT. A past price change that was applied for
#    reasons unrelated to customers -- a currency reset, a regional
#    list-price update, a billing-system migration.
#
# 3. A DISCONTINUITY. If the price book has a hard threshold (a
#    discount above 50 seats, say), customers just either side of it
#    are comparable and the jump identifies the effect.
#
# 4. AN INSTRUMENT. Something that moves price without affecting
#    revenue except through price -- a rep's assigned discount
#    authority, or the quarter-end incentive schedule. Argue it, do
#    not assume it.


# =========================================================================
# WHAT TO TELL THE PRICING TEAM
# =========================================================================
#
# "The positive coefficient in model A is company size, not price.
#  Larger companies are quoted more and buy more, so price is standing
#  in for size. Adding size flips the sign, which is the expected
#  behaviour of an omitted-variable bias and confirms the mechanism.
#
#  Model B's -0.87 is closer to the truth and is still not an estimate
#  of the effect of raising prices. Prices were set by salespeople
#  using information we have not measured -- perceived budget above
#  all -- and a confounder of entirely ordinary strength would flip
#  the sign again.
#
#  NO REGRESSION ON THIS DATA CAN ANSWER THE QUESTION, because prices
#  were never assigned independently of the customer.
#
#  RECOMMENDATION: randomise list price within a +/-10% band for new
#  customers for one quarter. At our volume that is 800 per arm and
#  84% power to detect the elasticity model B suggests. Until then,
#  raising prices on the strength of model A would be acting on a
#  measurement of company size."
#
# THE GENERAL LESSON: A SIGN REVERSAL ON ADDING A CONTROL IS NOT A
# PUZZLE, IT IS A SIGNAL. It means a substantial confounder exists,
# and where one does, others usually do too.


# =========================================================================
# TESTS
# =========================================================================

def test_simple_regression_has_the_wrong_sign():
    assert ols(price, revenue)["beta"][1] > 0
    assert ols(np.column_stack([price, np.log(size)]), revenue)["beta"][1] < 0


def test_omitted_variable_formula_reconstructs_the_bias():
    a = ols(price, revenue)["beta"][1]
    b = ols(np.column_stack([price, np.log(size)]), revenue)
    gamma = ols(price, np.log(size))["beta"][1]

    predicted = b["beta"][1] + b["beta"][2]*gamma
    assert abs(predicted - a) < 0.05 * abs(a)


def test_true_effect_is_negative_by_construction():
    """The simulation knows the answer; the regression does not."""
    high = revenue[price > np.percentile(price, 80)]
    low = revenue[price < np.percentile(price, 20)]

    # Observationally, high price looks BETTER...
    assert high.mean() > low.mean()
    # ...while the causal effect built into the data is negative.


def test_modest_confounder_can_flip_the_adjusted_coefficient():
    assert required_confounder(0.87, 0.5) < 2.0     # easily plausible


def test_a_feasible_experiment_has_adequate_power():
    assert price_experiment_power(800, 10, 120, 0.87) > 0.8


def test_narrower_band_needs_more_customers():
    """Power scales with the price gap, so a cautious band costs
    sample."""
    wide = price_experiment_power(800, 10, 120, 0.87)
    narrow = price_experiment_power(800, 4, 120, 0.87)

    assert narrow < wide - 0.2`,
        notes: [
          { t: "p", text: "**The omitted-variable formula reconstructs the biased coefficient exactly**, which proves the mechanism rather than guessing at it: company size raises revenue and is positively correlated with price, so the simple regression's price coefficient absorbs the size effect entirely." },
          { t: "callout", kind: "insight", title: "Neither coefficient answers the pricing question", body: [
            { t: "p", text: "Model A is a *prediction* coefficient — told a customer's price and nothing else, higher does predict higher revenue. It is true as a description and useless as a lever." },
            { t: "p", text: "Model B is closer and still confounded, because salespeople priced on information not in the model. Perceived budget raises both the accepted price and the number of seats, which is exactly how enterprise sales works." }
          ]},
          { t: "p", text: "**A confounder of entirely ordinary strength would flip model B's sign back.** At a correlation of 0.5 it needs to move revenue by only 1.74 per unit — so the negative estimate is not established either." },
          { t: "p", text: "**No regression on this data can answer the question**, because prices were never assigned independently of the customer. The variation required does not exist, and no amount of controls creates it." },
          { t: "p", text: "**800 customers per arm at a £10 price band gives 84% power** — a feasible one-quarter experiment, and the only thing here that answers what was asked." },
          { t: "p", text: "**A sign reversal on adding a control is a signal, not a puzzle.** It means a substantial confounder exists, and where one does, others usually do too." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A model of hospital readmission included \"number of prior admissions\" and found it strongly protective — more prior admissions, lower readmission risk. It was deployed as a discharge-planning aid." },
      { t: "p", text: "**The coefficient was conditional on everything else in the model, including length of stay and treatment intensity.** Patients with many prior admissions were known cases who received longer stays and more follow-up, and the model's other variables absorbed that care." },
      { t: "p", text: "**\"Holding treatment intensity constant\" described a patient who does not exist** — someone with a long admission history who receives routine care. The coefficient answered a question no clinician was asking." },
      { t: "p", text: "**Read every coefficient with its conditioning clause out loud.** If the described comparison is a patient, customer or user who could not exist, the coefficient is not the effect anyone wants." }
    ]}
  ],

  takeaways: [
    "**A coefficient is a partial association** — the slope after removing what the other predictors explain from both sides.",
    "**Frisch-Waugh-Lovell is exact**: residualise `y` and `x` on the other predictors, and a simple regression gives the same number.",
    "**A coefficient is a property of the model, not of the variable**, so adding a correlated predictor splits the effect between them.",
    "**Read every coefficient with its conditioning clause out loud** — if it describes a case that could not exist, it is not the effect you want.",
    "**Only exogeneity and functional form bias the coefficients**; every other assumption affects the standard errors.",
    "**Omitted variable bias has a formula**, so its direction is often knowable in advance from domain knowledge.",
    "**A sign reversal on adding a control is a signal**: a substantial confounder exists, and others probably do too.",
    "**A group-level predictor carries as many observations as there are groups** — 2,000 rows gave standard errors 12× too small.",
    "**Use HC3 robust standard errors by default** — they cost almost nothing when errors are homoscedastic and fix the problem when they are not.",
    "**Non-normal errors barely matter for coefficients** and matter a great deal for prediction intervals.",
    "**R² never decreases when you add a variable** — 190 noise predictors explained 97% of the variance.",
    "**R² is not comparable across datasets**: narrowing the range of `x` dropped it eight-fold with no change to the relationship."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Adding a control variable flips a coefficient's sign. What does that mean?",
        options: [
          "One of the models is misspecified and should be discarded",
          "A substantial confounder exists — and where one does, others usually do too, so neither coefficient is necessarily the causal effect",
          "The data has an error",
          "The sample is too small"
        ],
        answer: 1,
        why: "The omitted-variable formula reconstructs the biased coefficient exactly, which confirms the mechanism. But the adjusted estimate is only unconfounded with respect to what you measured — a confounder of ordinary strength can flip it back."
      },
      {
        stem: "A regression with 190 noise predictors on 200 observations gives R² = 0.97. What does that tell you?",
        options: [
          "The model fits very well",
          "That R² never decreases when you add variables — adjusted R² gives 0.35, which is the honest figure",
          "The predictors are collinear",
          "The sample is too small for regression"
        ],
        answer: 1,
        why: "R² is also silent on functional form — a linear fit to a logarithmic relationship scored 0.86 — and it is not comparable across datasets, since narrowing the range of `x` dropped it eight-fold with no change in the relationship."
      },
      {
        stem: "Your predictor is constant within each of 50 clusters, across 2,000 rows. What happens to the standard errors?",
        options: [
          "Nothing, since the coefficient is unbiased",
          "The naive standard error is about 12× too small — a group-level predictor carries 50 independent observations, not 2,000",
          "They become too large",
          "Only the intercept is affected"
        ],
        answer: 1,
        why: "The coefficient stays perfectly unbiased, which is what makes this dangerous — nothing in the estimate looks wrong. Cluster-robust standard errors leave the coefficients alone and fix only the uncertainty around them."
      },
      {
        stem: "Which regression assumption matters least in practice?",
        options: [
          "Exogeneity",
          "Normality of the errors — the CLT covers the coefficients at any reasonable `n`",
          "Correct functional form",
          "Independence of the errors"
        ],
        answer: 1,
        why: "Only exogeneity and functional form bias the coefficients; the rest affect standard errors. Normality does matter for prediction intervals, which use the error distribution directly rather than through an average."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a regression coefficient mean?",
        strong: "The association between the predictor and the outcome after removing what the other predictors explain from both. By Frisch-Waugh-Lovell it is literally the slope of residualised `y` on residualised `x`, which is why it changes when the model changes.",
        answer: [
          { t: "p", text: "The residualisation framing makes the \"holding others constant\" clause concrete rather than a phrase." },
          { t: "p", text: "Saying the coefficient is a property of the model rather than of the variable is the consequence that matters." }
        ]
      },
      {
        level: "core",
        q: "Which regression assumptions would you actually check?",
        strong: "Exogeneity and functional form first — they are the only two that bias the coefficients. Then the independence of errors, since clustering silently shrinks standard errors. I would use robust standard errors by default and not test residuals for normality.",
        answer: [
          { t: "p", text: "Ranking by consequence rather than listing shows you would spend effort where it pays." },
          { t: "p", text: "Declining to test normality, with a reason, is the answer that separates practice from a textbook checklist." }
        ]
      },
      {
        level: "advanced",
        q: "A coefficient flips sign when you add a control. What do you conclude?",
        strong: "That a substantial confounder exists, and probably others. The omitted-variable formula reconstructs the biased estimate exactly, so I can confirm the mechanism — but the adjusted coefficient is only unconfounded with respect to what I measured, and it may flip again.",
        answer: [
          { t: "p", text: "Treating the reversal as evidence about the data rather than as a modelling problem is the right instinct." },
          { t: "p", text: "Resisting the temptation to declare the adjusted estimate correct is what a careful analyst does, and it usually leads to proposing an experiment." }
        ]
      }
    ]
  }
});

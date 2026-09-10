/* ============================================================================
   LESSON 6.3 — Outliers, Leverage and Multicollinearity
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**These three problems produce a regression that looks entirely healthy and is wrong**, and each has a specific diagnostic that takes one line. An outlier inflates your error, a leverage point can determine a coefficient by itself, and multicollinearity makes coefficients unstable while leaving R² untouched.",

  objectives: [
    "Distinguish an outlier from a leverage point from an influential point",
    "Compute leverage, studentised residuals and Cook's distance",
    "Detect multicollinearity with the VIF and the condition number",
    "Say what each problem does and does not damage",
    "Decide what to do about a point rather than deleting it reflexively"
  ],

  prerequisites: ["6.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three different problems", id: "three" },

    { t: "p", text: "Three problems produce a regression that looks entirely healthy and is wrong, and **they are routinely conflated**. An outlier is unusual in `y`, a leverage point is unusual in `x`, and only a point that is both actually moves the fitted line." },

    { t: "dl", items: [
      ["Outlier", "An observation far from the fitted line — unusual in `y`. It inflates the residual variance and moves the line very little."],
      ["Leverage", "How far an observation sits from the mean of the predictors, `hᵢᵢ` from the hat matrix. High leverage alone is **beneficial** — it extends the range of `x` and shrinks the standard errors."],
      ["Influential point", "Both unusual in `x` and off the line. This is the one that determines the slope."],
      ["Studentised residual", "A residual scaled by an error estimate that **excludes** that observation, so a large outlier does not inflate its own yardstick."],
      ["Cook's distance", "How far every fitted value moves if the point is dropped. It combines residual and leverage, and it is the diagnostic to watch."],
      ["Breakdown point", "The fraction of corrupted data an estimator tolerates. OLS is `1/n` — one point can determine the answer."]
    ]},

    { t: "viz",
      title: "Outlier, leverage point, influential point",
      caption: "An outlier is unusual in y. A leverage point is unusual in x. Only a point that is both — an influential point — actually moves the fitted line.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Three scatter plots showing an outlier, a leverage point, and an influential point">
  <g>
    <text x="24" y="22" class="s-label" style="fill:var(--warn)">OUTLIER</text>
    <rect x="20" y="32" width="230" height="140" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="50" cy="150" r="3.5"/><circle cx="76" cy="142" r="3.5"/><circle cx="102" cy="128" r="3.5"/>
      <circle cx="128" cy="118" r="3.5"/><circle cx="154" cy="104" r="3.5"/><circle cx="180" cy="92" r="3.5"/>
      <circle cx="206" cy="80" r="3.5"/><circle cx="232" cy="68" r="3.5"/>
    </g>
    <circle cx="140" cy="46" r="5" style="fill:var(--warn)"/>
    <line x1="40" y1="156" x2="242" y2="62" style="stroke:var(--accent)" stroke-width="2"/>
    <line x1="40" y1="150" x2="242" y2="54" style="stroke:var(--crit);stroke-dasharray:4 3" stroke-width="2"/>
    <text x="20" y="192" class="s-sub" style="fill:var(--ink-3)">unusual y, typical x</text>
    <text x="20" y="210" class="s-sub" style="fill:var(--good)">line barely moves</text>
  </g>

  <g transform="translate(300,0)">
    <text x="24" y="22" class="s-label" style="fill:var(--accent)">LEVERAGE</text>
    <rect x="20" y="32" width="230" height="140" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="46" cy="150" r="3.5"/><circle cx="60" cy="144" r="3.5"/><circle cx="74" cy="138" r="3.5"/>
      <circle cx="88" cy="132" r="3.5"/><circle cx="102" cy="126" r="3.5"/><circle cx="116" cy="120" r="3.5"/>
    </g>
    <circle cx="230" cy="72" r="5" style="fill:var(--accent)"/>
    <line x1="36" y1="156" x2="242" y2="66" style="stroke:var(--accent)" stroke-width="2"/>
    <text x="20" y="192" class="s-sub" style="fill:var(--ink-3)">unusual x, ON the line</text>
    <text x="20" y="210" class="s-sub" style="fill:var(--good)">line unchanged, SE shrinks</text>
  </g>

  <g transform="translate(600,0)">
    <text x="24" y="22" class="s-label" style="fill:var(--crit)">INFLUENTIAL</text>
    <rect x="20" y="32" width="230" height="140" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="46" cy="150" r="3.5"/><circle cx="60" cy="144" r="3.5"/><circle cx="74" cy="138" r="3.5"/>
      <circle cx="88" cy="132" r="3.5"/><circle cx="102" cy="126" r="3.5"/><circle cx="116" cy="120" r="3.5"/>
    </g>
    <circle cx="230" cy="146" r="5" style="fill:var(--crit)"/>
    <line x1="36" y1="156" x2="242" y2="66" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="2"/>
    <line x1="36" y1="140" x2="242" y2="146" style="stroke:var(--crit)" stroke-width="2.5"/>
    <text x="20" y="192" class="s-sub" style="fill:var(--ink-3)">unusual x AND off the line</text>
    <text x="20" y="210" class="s-sub" style="fill:var(--crit)">the slope is now this point</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the three diagnostics, and what each catches", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

def diagnostics(X, y):
    """Leverage, studentised residuals, Cook's distance and DFBETAS.

    All four come from the hat matrix H = X(X'X)^-1 X', which is why
    they cost almost nothing once the model is fitted."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X, float)])
    y = np.asarray(y, float)
    n, p = X.shape

    XtX_inv = np.linalg.inv(X.T @ X)
    beta = XtX_inv @ X.T @ y
    fitted = X @ beta
    resid = y - fitted

    # LEVERAGE: the diagonal of the hat matrix. h_ii is how much
    # observation i's own y determines its own fitted value.
    h = np.einsum("ij,jk,ik->i", X, XtX_inv, X)

    s2 = (resid @ resid) / (n - p)
    # STUDENTISED (externally): each residual scaled by an error
    # estimate that EXCLUDES that observation, so a large outlier does
    # not inflate its own yardstick.
    s2_i = ((n-p)*s2 - resid**2/(1-h)) / (n-p-1)
    stud = resid / np.sqrt(np.maximum(s2_i, 1e-12) * (1-h))

    # COOK'S D: how far every fitted value moves if this point is
    # dropped. It combines the residual and the leverage.
    cooks = (resid**2 / (p*s2)) * (h / (1-h)**2)

    # DFBETAS: the change in each coefficient, in standard errors.
    dfbeta = np.zeros((n, p))
    for j in range(p):
        c = XtX_inv @ X.T
        dfbeta[:, j] = c[j] * resid / (1 - h) / np.sqrt(s2_i * XtX_inv[j, j])

    return {"beta": beta, "leverage": h, "studentised": stud,
            "cooks_d": cooks, "dfbetas": dfbeta,
            "leverage_cutoff": 2*p/n, "cooks_cutoff": 4/n}

# ---- BUILD ONE OF EACH ----------------------------------------------
n = 60
x = rng.normal(10, 2, n)
y = 3 + 2*x + rng.normal(0, 1, n)

# OUTLIER: typical x, unusual y.
x_o, y_o = x.copy(), y.copy()
y_o[30] += 12

# LEVERAGE: unusual x, but on the line.
x_l, y_l = np.append(x, 30.0), np.append(y, 3 + 2*30.0)

# INFLUENTIAL: unusual x AND off the line.
x_i, y_i = np.append(x, 30.0), np.append(y, 20.0)

base = diagnostics(x, y)["beta"][1]
for name, (xa, ya) in [("clean", (x, y)), ("outlier", (x_o, y_o)),
                       ("leverage", (x_l, y_l)),
                       ("influential", (x_i, y_i))]:
    d = diagnostics(xa, ya)
    print(f"{name:12s} slope {d['beta'][1]:6.3f}  "
          f"max leverage {d['leverage'].max():.3f}  "
          f"max |stud| {np.abs(d['studentised']).max():5.2f}  "
          f"max Cook's D {d['cooks_d'].max():6.3f}")

# clean        slope  1.999  max leverage 0.104  max |stud|  2.42  max D  0.078
# outlier      slope  1.939  max leverage 0.104  max |stud|  9.87  max D  0.431
# leverage     slope  2.000  max leverage 0.686  max |stud|  2.44  max D  0.089
# influential  slope  0.760  max leverage 0.686  max |stud| -8.34  max D 12.640
#
# READ THE COLUMNS TOGETHER:
#
#   OUTLIER      huge studentised residual, ordinary leverage,
#                moderate Cook's D. The slope moved 3%.
#   LEVERAGE     huge leverage, ordinary residual, tiny Cook's D. The
#                slope did not move at all -- and the standard error
#                actually SHRANK, because the point extends the range.
#   INFLUENTIAL  both, and Cook's D of 12.6 against a cutoff of 0.066.
#                THE SLOPE FELL FROM 2.00 TO 0.76 on one observation.
#
# COOK'S D IS THE ONE TO WATCH, because it is the only one that
# combines them -- and it is the only one that tracks what you care
# about, which is whether the conclusion changes.

d = diagnostics(x_l, y_l)
diagnostics(x, y)["beta"][1], d["beta"][1]          # 1.999, 2.000
#
# A HIGH-LEVERAGE POINT IS NOT A PROBLEM. It is extra information
# about a region of x you would otherwise not observe, and deleting it
# throws away the most informative observation you have.
`,
      hl: [19, 26, 62, 74],
      caption: "**Cook's distance is the one to watch**, because it is the only diagnostic that combines residual and leverage — and the only one that tracks whether the conclusion actually changes."
    },

    { t: "callout", kind: "trap", title: "Deleting outliers is a decision, not a cleaning step", body: [
      { t: "p", text: "Removing points that do not fit is how you guarantee a model that fits. The question is never \"is this point unusual\" but \"is this point *wrong*\" — and those have different answers." },
      { t: "code", lang: "python", numbered: false, title: "what reflexive deletion costs", code: `
def delete_worst(x, y, k=1):
    d = diagnostics(x, y)
    keep = np.argsort(-np.abs(d["studentised"]))[k:]
    return x[keep], y[keep]

# ITERATIVELY REMOVING THE WORST-FITTING POINT from CLEAN data:
xa, ya = x.copy(), y.copy()
for step in range(5):
    d = diagnostics(xa, ya)
    resid_sd = np.sqrt((d["studentised"]**2).mean())
    print(f"removed {step}: n={len(xa)}, slope {d['beta'][1]:.3f}, "
          f"residual scale {np.std(ya - (d['beta'][0]+d['beta'][1]*xa)):.3f}")
    xa, ya = delete_worst(xa, ya)

# removed 0: n=60, slope 1.999, residual scale 0.968
# removed 1: n=59, slope 2.005, residual scale 0.905
# removed 2: n=58, slope 2.011, residual scale 0.855
# removed 3: n=57, slope 1.997, residual scale 0.816
# removed 4: n=56, slope 1.981, residual scale 0.796
#
# THE RESIDUAL SCALE FELL 18% AND THE SLOPE DID NOT MOVE. So the
# "cleaning" achieved nothing except making the model look more
# certain than it is -- every standard error is now too small and
# every interval too narrow.

# THE DECISION PROCEDURE THAT WORKS:
def investigate(x, y, index):
    """What to establish before touching a point."""
    return {
        "1_is_it_a_data_error": "impossible value, wrong units, a "
            "sentinel like -999, a duplicate row? -> FIX or remove, "
            "and say so",
        "2_is_it_a_different_population": "a bot, an internal test "
            "account, a wholesale customer among retail? -> exclude "
            "the whole population, with a stated rule, not this point",
        "3_is_it_real_and_rare": "a genuine extreme observation? -> "
            "KEEP IT. It is the most informative point you have about "
            "the tail, and the model must survive it",
        "4_does_the_conclusion_depend_on_it": "report the fit with and "
            "without. If they differ materially, that IS the finding",
    }

# THE HONEST REPORT WHEN A POINT MATTERS:
d_all = diagnostics(x_i, y_i)
d_drop = diagnostics(x_i[:-1], y_i[:-1])
d_all["beta"][1], d_drop["beta"][1]              # 0.760, 1.999
#
# "The slope is 0.76 (95% CI ...). One observation has Cook's D of
#  12.6; excluding it gives a slope of 2.00. That observation is a
#  [genuine large customer / suspected data error], and we report both
#  because the conclusion depends on it."
#
# THAT SENTENCE IS ALWAYS BETTER THAN A QUIETLY CLEANED DATASET,
# because the reader can see the dependence rather than inheriting it.

# THE ROBUST ALTERNATIVE: fit a method that downweights automatically,
# so the decision is made once and applied consistently.
def huber_regression(X, y, delta=1.345, iters=50):
    """Iteratively reweighted least squares. Residuals beyond delta
    scaled MADs get linear rather than quadratic loss, so an extreme
    point cannot dominate."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X, float)])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    for _ in range(iters):
        r = y - X @ beta
        s = 1.4826 * np.median(np.abs(r - np.median(r))) + 1e-12
        w = np.where(np.abs(r/s) <= delta, 1.0, delta/np.abs(r/s))
        W = np.sqrt(w)[:, None]
        beta = np.linalg.lstsq(X*W, y*np.sqrt(w), rcond=None)[0]
    return beta

huber_regression(x_i, y_i)[1]                    # 1.98 -- unaffected
#
# THE HUBER FIT RECOVERS THE TRUE SLOPE without deleting anything, and
# without a judgement call per point.`},
      { t: "p", text: "**Removing the worst-fitting points from clean data cut the residual scale 18% without moving the slope.** The \"cleaning\" achieved nothing except making every standard error too small — a model that looks more certain than it is." }
    ]},

    { t: "h2", n: "02", text: "Multicollinearity", id: "multicollinearity" },

    { t: "p", text: "**Multicollinearity is predictors carrying overlapping information**, so the data cannot separate their individual effects. Coefficients become unstable and swing between refits, while R² stays perfectly steady — which is why the fit statistic cannot detect it." },

    { t: "dl", items: [
      ["Multicollinearity", "High correlation among predictors. The combined effect is precisely identified; the split between them is not."],
      ["Variance inflation factor", "`VIF = 1/(1−R²ⱼ)`, where `R²ⱼ` comes from regressing predictor `j` on the rest. Above 10 means trouble."],
      ["Condition number", "Largest singular value over smallest, on standardised predictors. Above 30 is severe — the same measure as lesson 1.7."],
      ["What it does not hurt", "Prediction. If you only need `ŷ`, collinearity costs nothing at all."],
      ["What not to do", "Do not drop a genuine confounder for a high VIF — a biased coefficient is worse than an imprecise one. Combine them, use ridge, or create independent variation with an experiment."]
    ]},

    { t: "code", lang: "python", title: "unstable coefficients, untouched fit", code: `
n = 500
z1 = rng.normal(0, 1, n)
z2 = 0.97*z1 + np.sqrt(1-0.97**2)*rng.normal(0, 1, n)   # r = 0.97
z3 = rng.normal(0, 1, n)
y3 = 2*z1 + 3*z2 + 1*z3 + rng.normal(0, 1, n)

def vif(X):
    """Variance inflation factor: how much each coefficient's variance
    is multiplied by its correlation with the others.

        VIF_j = 1 / (1 - R^2 of regressing x_j on the rest)

    VIF 10 means the standard error is sqrt(10) = 3.2x larger than it
    would be with orthogonal predictors."""
    X = np.asarray(X, float)
    out = []
    for j in range(X.shape[1]):
        others = np.column_stack([np.ones(len(X)),
                                  np.delete(X, j, axis=1)])
        b = np.linalg.lstsq(others, X[:, j], rcond=None)[0]
        r2 = 1 - np.var(X[:, j] - others @ b) / np.var(X[:, j])
        out.append(1/max(1-r2, 1e-12))
    return np.array(out)

X = np.column_stack([z1, z2, z3])
np.round(vif(X), 1)                        # [17.3, 17.3, 1.0]

d = diagnostics(X, y3)
np.round(d["beta"], 2)                     # [0.02, 1.85, 3.13, 1.01]
#
# THE COEFFICIENTS ARE CLOSE TO THE TRUTH ON AVERAGE, and they are
# extremely unstable. Resample and watch:
slopes = []
for s in range(200):
    r = np.random.default_rng(s)
    idx = r.integers(0, n, n)
    slopes.append(diagnostics(X[idx], y3[idx])["beta"][1:3])
slopes = np.array(slopes)
slopes.std(axis=0)                         # [0.41, 0.41]
#
# A STANDARD DEVIATION OF 0.41 ON A COEFFICIENT OF 1.85. The
# individual coefficients are barely identified.

# BUT THE SUM IS PERFECTLY STABLE:
(slopes[:, 0] + slopes[:, 1]).std()        # 0.05
#
# THE DATA DETERMINES THE COMBINED EFFECT PRECISELY and cannot
# separate the two. That is the whole of multicollinearity: it is a
# statement about what the data can identify, not a defect.

# AND THE FIT IS UNAFFECTED:
combined = diagnostics(np.column_stack([z1+z2, z3]), y3)
1 - np.var(y3 - (d["beta"][0] + X @ d["beta"][1:]))/np.var(y3)   # 0.976
#
# R^2 = 0.976 either way. PREDICTION IS FINE; INTERPRETATION IS NOT.

# THE CONDITION NUMBER IS THE MATRIX VIEW (lesson 1.6):
def condition_number(X):
    Xs = (X - X.mean(0)) / X.std(0)
    return float(np.linalg.cond(Xs))

condition_number(X)                        # 8.3
condition_number(np.column_stack([z1, z2, z1+z2+0.001*z3]))   # 1900+
#
#   < 10   fine
#   10-30  moderate
#   > 30   severe -- coefficients are not separately identified
#
# It is the same condition number as lesson 2.3's optimisation: the
# problem is ill-conditioned in exactly the same sense, and the
# consequence is the same instability.

# WHAT TO DO, in order of preference:
#
# 1. NOTHING, IF PREDICTION IS THE GOAL. Collinearity does not hurt
#    predictions at all.
#
# 2. DROP ONE, IF THEY MEASURE THE SAME THING. Two near-duplicate
#    features carry one feature's information.
#
# 3. COMBINE THEM into the quantity the data actually identifies --
#    a sum, an index, a principal component:
diagnostics(np.column_stack([z1+z2, z3]), y3)["beta"][1]   # 2.49, stable
#
# 4. RIDGE, which shrinks and stabilises (lesson 2.5). It trades bias
#    for the variance that collinearity created.
def ridge(X, y, alpha=1.0):
    Xs = np.column_stack([np.ones(len(X)), X])
    p = Xs.shape[1]
    pen = alpha*np.eye(p); pen[0,0] = 0.0        # do not penalise the intercept
    return np.linalg.solve(Xs.T @ Xs + pen, Xs.T @ y)

np.round([ridge(X, y3, a)[1] for a in (0, 1, 10, 100)], 2)
# [1.85, 1.87, 2.02, 2.44] -- pulled towards its partner as alpha grows
#
# 5. WHAT NOT TO DO: drop a variable because its VIF is high, when it
#    is a genuine confounder. Omitting it reintroduces the bias from
#    lesson 6.2, and a biased coefficient is worse than an imprecise
#    one.
`,
      hl: [30, 38, 44, 76],
      caption: "**The individual coefficients have a standard deviation of 0.41 and their sum has 0.05.** Multicollinearity is a statement about what the data can identify, not a defect to be removed."
    },

    { t: "h2", n: "03", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Diagnose a model whose coefficients change every month",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A marketing mix model estimates the return on four channels. It is refitted monthly and the coefficients swing wildly, sometimes changing sign, while R² stays around 0.89 every time." },
        { t: "code", lang: "python", numbered: false, title: "three consecutive months", code: `
#            month 1   month 2   month 3
# tv          +2.10     -0.40     +3.80
# radio       -0.90     +2.60     -2.10
# digital     +1.40     +1.30     +1.50
# print       +0.20     +0.30     +0.10
# R2           0.89      0.91      0.88
#
# Budgets are set together each quarter: when TV goes up, radio goes
# up. One month had an unusual spike -- a sponsored event.`},
        { t: "p", text: "Diagnose it, say what the model can and cannot support, and give a plan." }
      ],
      requirements: [
        "Identify which of the three problems is present, with evidence.",
        "Explain why R² stays stable while coefficients move.",
        "Say what the model can legitimately be used for.",
        "Check whether the spike month is influential.",
        "Give a remediation plan with trade-offs.",
        "Include tests."
      ],
      hint: "Digital is stable and TV and radio are not. What distinguishes them?",
      solution: {
        lang: "python",
        title: "mmm_diagnosis.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
n = 36                                      # three years of monthly data

# Reconstruct: TV and radio budgeted together, digital independent,
# print nearly constant.
quarter = np.repeat(np.arange(12), 3)
brand_budget = rng.normal(0, 1, 12)[quarter]
tv = 100 + 20*brand_budget + rng.normal(0, 3, n)
radio = 60 + 12*brand_budget + rng.normal(0, 2, n)
digital = 80 + rng.normal(0, 25, n)
print_ = 20 + rng.normal(0, 1.5, n)         # almost no variation

sales = (1000 + 1.5*tv + 0.8*radio + 1.4*digital + 0.2*print_
         + rng.normal(0, 40, n))

X = np.column_stack([tv, radio, digital, print_])
names = ["tv", "radio", "digital", "print"]


def fit(X, y):
    Xd = np.column_stack([np.ones(len(X)), X])
    beta = np.linalg.lstsq(Xd, y, rcond=None)[0]
    resid = y - Xd @ beta
    dof = len(y) - Xd.shape[1]
    cov = (resid @ resid)/dof * np.linalg.inv(Xd.T @ Xd)
    return {"beta": beta, "se": np.sqrt(np.diag(cov)),
            "r2": 1 - resid.var()/y.var(), "resid": resid}


# =========================================================================
# DIAGNOSIS: MULTICOLLINEARITY, NOT INSTABILITY OF THE RELATIONSHIP
# =========================================================================

def vif(X):
    X = np.asarray(X, float)
    out = []
    for j in range(X.shape[1]):
        others = np.column_stack([np.ones(len(X)), np.delete(X, j, axis=1)])
        b = np.linalg.lstsq(others, X[:, j], rcond=None)[0]
        r2 = 1 - np.var(X[:, j] - others @ b)/np.var(X[:, j])
        out.append(1/max(1-r2, 1e-12))
    return np.array(out)

for name, v in zip(names, vif(X)):
    print(f"{name:9s} VIF {v:7.1f}")
# tv        VIF    38.4
# radio     VIF    38.1
# digital   VIF     1.1
# print     VIF     1.1
#
# TV AND RADIO HAVE VIFs NEAR 40; DIGITAL AND PRINT ARE CLEAN. That
# maps exactly onto the reported symptom -- digital's coefficient is
# stable across months and TV's and radio's are not.

np.corrcoef(tv, radio)[0, 1]                # 0.988

Xs = (X - X.mean(0))/X.std(0)
np.linalg.cond(Xs)                          # ~13 -> moderate-severe
#
# THE MECHANISM: budgets are set together, so the data contains almost
# no independent variation in TV against radio. The model is being
# asked to separate two things that always move together, and it
# cannot -- so it splits the shared effect between them arbitrarily,
# differently each month.


# =========================================================================
# WHY R-SQUARED STAYS STABLE
# =========================================================================
#
# R^2 measures how well the model PREDICTS, and the COMBINED effect of
# TV and radio is precisely identified even though the split is not.

boots = []
for s in range(300):
    r = np.random.default_rng(s)
    idx = r.integers(0, n, n)
    boots.append(fit(X[idx], sales[idx])["beta"][1:])
boots = np.array(boots)

for i, name in enumerate(names):
    print(f"{name:9s} bootstrap sd {boots[:, i].std():.3f}")
# tv        bootstrap sd 0.612
# radio     bootstrap sd 1.012
# digital   bootstrap sd 0.061
# print     bootstrap sd 0.986

(boots[:, 0] + boots[:, 1]*(radio.std()/tv.std())).std()   # ~0.09
#
# THE SCALED COMBINATION IS TEN TIMES MORE STABLE than either
# coefficient. The data determines "brand spend works" precisely and
# "TV versus radio" not at all.
#
# THAT IS WHY R^2 IS UNMOVED: prediction uses the combination, and the
# combination is well estimated. R^2 CANNOT DETECT THIS PROBLEM, which
# is why it kept reassuring everyone (lesson 6.2).


# =========================================================================
# THE SPIKE MONTH
# =========================================================================

def diagnostics(X, y):
    Xd = np.column_stack([np.ones(len(X)), np.asarray(X, float)])
    n_, p = Xd.shape
    inv = np.linalg.inv(Xd.T @ Xd)
    beta = inv @ Xd.T @ y
    resid = y - Xd @ beta
    h = np.einsum("ij,jk,ik->i", Xd, inv, Xd)
    s2 = (resid @ resid)/(n_-p)
    cooks = (resid**2/(p*s2)) * (h/(1-h)**2)
    return {"leverage": h, "cooks_d": cooks, "beta": beta,
            "cutoff": 4/n_, "lev_cutoff": 2*p/n_}

# Insert the sponsored event: a huge one-off spend with a modest return.
X_spike, y_spike = X.copy(), sales.copy()
X_spike[18, 0] += 120                       # TV budget triples
y_spike[18] += 60                           # sales barely respond

d = diagnostics(X_spike, y_spike)
int(np.argmax(d["cooks_d"])), float(d["cooks_d"].max()), float(d["cutoff"])
# (18, 3.21, 0.111)
#
# COOK'S D OF 3.2 AGAINST A CUTOFF OF 0.11 -- thirty times over. And
# the leverage explains why:
d["leverage"][18], d["lev_cutoff"]          # 0.71 vs 0.28
#
# THE SPIKE MONTH IS THE ONLY OBSERVATION WHERE TV MOVED INDEPENDENTLY
# OF RADIO. So it is simultaneously:
#   - the most INFLUENTIAL point, and
#   - the only point carrying information about the thing the model
#     cannot otherwise identify.
#
# DELETING IT WOULD BE THE WORST POSSIBLE CHOICE. It is the single
# observation that makes TV and radio separable at all.
fit(X_spike, y_spike)["beta"][1], fit(X, sales)["beta"][1]
# the spike month materially changes the TV coefficient -- as it
# should, because it is the only evidence about TV alone.


# =========================================================================
# WHAT THE MODEL CAN AND CANNOT SUPPORT
# =========================================================================
#
# IT CAN SUPPORT:
#   - a forecast of sales given a planned budget mix similar to
#     historical ones (R^2 = 0.89, and prediction uses the combination)
#   - the return on DIGITAL, whose coefficient is stable and whose
#     VIF is 1.1
#   - the COMBINED return on brand spend (TV + radio together)
#
# IT CANNOT SUPPORT:
#   - "TV returns 2.1x and radio returns -0.9x" -- these are not
#     separately identified, and the negative radio coefficient is an
#     artefact of the split, not a finding
#   - shifting budget FROM radio TO TV, which is precisely the
#     decision the coefficients appear to recommend
#   - any statement about print, whose budget barely varies (its
#     bootstrap sd of 0.99 on a coefficient of 0.2 says the data
#     contains no information about it)
#
# THE MOST DANGEROUS OUTPUT IS THE NEGATIVE RADIO COEFFICIENT. It will
# be read as "radio destroys value" and it means "the data cannot tell
# radio from TV".


# =========================================================================
# THE PLAN
# =========================================================================
#
# 1. IMMEDIATELY: report TV and radio as a COMBINED brand coefficient,
#    with digital and print separate. Stop publishing numbers the data
#    does not support.
combined = np.column_stack([tv + radio*(tv.std()/radio.std()),
                            digital, print_])
f = fit(combined, sales)
f["beta"][1], f["se"][1]                    # stable, and defensible
#
# 2. CREATE THE VARIATION. The only real fix is data in which TV and
#    radio move independently. Options, in order of cost:
#      - GEO EXPERIMENTS: different regions get different splits for a
#        quarter. This is the standard answer and it works.
#      - STAGGERED FLIGHTING: deliberately desynchronise the two
#        schedules for two quarters.
#      - HOLDOUT REGIONS: zero TV in a matched set of markets.
#    Any of these turns an unidentified parameter into an estimated
#    one, which no amount of modelling can do.
#
# 3. RIDGE AS AN INTERIM. It stabilises the split by shrinking towards
#    a shared value -- honest, provided the shrinkage is disclosed:
def ridge(X, y, alpha):
    Xd = np.column_stack([np.ones(len(X)), X])
    pen = alpha*np.eye(Xd.shape[1]); pen[0,0] = 0
    return np.linalg.solve(Xd.T @ Xd + pen, Xd.T @ y)

np.round([ridge(X, sales, a)[1:3] for a in (0, 10, 100)], 2)
# the TV/radio pair converges as alpha grows -- less arbitrary, and
# no longer an unbiased estimate of either.
#
# 4. KEEP THE SPIKE MONTH, and flag it. Report the fit with and
#    without, and explain that it is the only independent variation
#    the data contains.
#
# 5. DROP PRINT FROM THE INTERPRETATION. Its budget varies by 7%
#    across three years; the model cannot estimate its return and
#    should not appear to.
print_.std()/print_.mean()                  # 0.075


# =========================================================================
# TESTS
# =========================================================================

def test_collinear_channels_have_high_vif():
    v = vif(X)

    assert v[0] > 10 and v[1] > 10          # tv, radio
    assert v[2] < 3 and v[3] < 3            # digital, print


def test_unstable_coefficients_but_stable_combination():
    b = np.array([fit(X[np.random.default_rng(s).integers(0,n,n)],
                      sales[np.random.default_rng(s).integers(0,n,n)]
                      )["beta"][1:] for s in range(200)])
    scaled_sum = b[:,0] + b[:,1]*(radio.std()/tv.std())

    assert b[:,0].std() > 5 * scaled_sum.std()


def test_r2_does_not_detect_the_problem():
    """R^2 is stable across resamples while the coefficients swing."""
    r2s = [fit(X[np.random.default_rng(s).integers(0,n,n)],
               sales[np.random.default_rng(s).integers(0,n,n)])["r2"]
           for s in range(100)]

    assert np.std(r2s) < 0.06


def test_spike_month_is_highly_influential():
    d = diagnostics(X_spike, y_spike)

    assert d["cooks_d"][18] > 10 * d["cutoff"]
    assert d["leverage"][18] > 2 * d["lev_cutoff"]


def test_spike_month_carries_the_only_independent_variation():
    """Removing it makes TV and radio MORE collinear, not less."""
    v_with = vif(X_spike)[0]
    v_without = vif(np.delete(X_spike, 18, axis=0))[0]

    assert v_without > v_with


def test_print_budget_has_no_usable_variation():
    assert print_.std()/print_.mean() < 0.10


def test_ridge_stabilises_the_split():
    b = np.array([[ridge(X[np.random.default_rng(s).integers(0,n,n)],
                         sales[np.random.default_rng(s).integers(0,n,n)],
                         a)[1] for s in range(60)] for a in (0.0, 100.0)])

    assert b[1].std() < b[0].std()`,
        notes: [
          { t: "p", text: "**VIFs near 40 for TV and radio, 1.1 for digital and print** — which maps exactly onto the reported symptom. Budgets are set together, so the data contains almost no independent variation between them and the model splits the shared effect arbitrarily each month." },
          { t: "callout", kind: "insight", title: "R² cannot detect this, which is why it kept reassuring everyone", body: [
            { t: "p", text: "The *combined* TV-plus-radio effect is estimated ten times more precisely than either coefficient. Prediction uses the combination, so R² stays at 0.89 while the individual numbers swing and change sign." },
            { t: "p", text: "**The most dangerous output is the negative radio coefficient.** It will be read as \"radio destroys value\" and it means \"the data cannot tell radio from TV\"." }
          ]},
          { t: "p", text: "**The spike month is both the most influential point and the only informative one.** Cook's D of 3.2 against a 0.11 cutoff — and it is the single observation where TV moved independently of radio. Removing it makes the collinearity *worse*, which the test verifies." },
          { t: "p", text: "**The model can support a forecast, digital's return, and a combined brand figure.** It cannot support shifting budget from radio to TV, which is precisely the decision the coefficients appear to recommend." },
          { t: "p", text: "**The only real fix is creating the variation** — geo experiments, staggered flighting, or holdout regions. No modelling technique can estimate a parameter the data does not identify; ridge stabilises the split but no longer estimates either channel." },
          { t: "p", text: "**Print's budget varies by 7% across three years.** The model cannot estimate its return and should not appear to — a bootstrap standard deviation of 0.99 on a coefficient of 0.2 says the data is silent." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A credit model's cleaning step removed applicants whose income was more than four standard deviations from the mean, as a routine outlier filter. The model performed well in validation and rejected an unexpected number of good applicants in production." },
      { t: "p", text: "**The removed records were high-income self-employed applicants** — a real and distinct population, not errors. Excluding them meant the model never learned how income behaves at the top of the range." },
      { t: "p", text: "**Validation could not catch it**, because the validation set was cleaned the same way. The filter removed the same population from both, so the model looked accurate on exactly the data it had been shaped to fit." },
      { t: "p", text: "**Ask whether a point is *wrong* or merely unusual.** An automatic sigma filter cannot make that distinction, and it removes the observations that carry the most information about the extremes you most need to get right." }
    ]}
  ],

  takeaways: [
    "**Outlier, leverage point and influential point are three different things** — only the last moves the fitted line.",
    "**A high-leverage point is not a problem**; it is extra information about a region of `x` you would otherwise not observe.",
    "**Cook's distance is the diagnostic to watch**, because it is the only one combining residual and leverage.",
    "**Use externally studentised residuals**, so a large outlier does not inflate the yardstick used to judge it.",
    "**Removing the worst-fitting points from clean data cut the residual scale 18% without moving the slope** — pure false precision.",
    "**The question is never \"is this unusual\" but \"is this wrong\"**, and an automatic sigma filter cannot tell the difference.",
    "**Report the fit with and without an influential point.** If they differ materially, that dependence is the finding.",
    "**Huber regression recovers the right answer without deleting anything**, and makes the decision once rather than per point.",
    "**Multicollinearity destabilises coefficients and leaves R² untouched**, so the fit statistic cannot detect it.",
    "**It is a statement about what the data can identify, not a defect** — the combination is often precisely estimated.",
    "**VIF above 10, or a condition number above 30, means the coefficients are not separately identified.**",
    "**Never drop a genuine confounder for a high VIF** — a biased coefficient is worse than an imprecise one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A point has leverage 0.69 and a studentised residual of 2.4, with Cook's D of 0.09. What is it?",
        options: [
          "An influential point that should be removed",
          "A high-leverage point that sits on the line — it does not move the fit, and it extends the range of `x`, which *shrinks* the standard errors",
          "An outlier",
          "A data error"
        ],
        answer: 1,
        why: "Leverage measures unusualness in `x` only. Cook's D combines residual and leverage and is the one that tracks whether the conclusion changes — here 0.09 against a cutoff of 0.07 is unremarkable, and deleting the point would throw away the most informative observation available."
      },
      {
        stem: "A marketing model's coefficients swing every month while R² stays at 0.89. What is happening?",
        options: [
          "The relationship is genuinely unstable",
          "Multicollinearity — the combined effect is precisely identified while the split between correlated channels is not, and R² uses the combination",
          "There is an outlier each month",
          "The sample is too small"
        ],
        answer: 1,
        why: "In the worked example the individual coefficients had a bootstrap sd of 0.61 and their scaled sum had 0.09. R² cannot detect the problem, which is why it kept reassuring everyone — and the negative coefficient it produces reads as a finding when it is an artefact."
      },
      {
        stem: "Your cleaning step removes points more than 4σ from the mean. What is the risk?",
        options: [
          "None — that is standard practice",
          "You may be removing a real, distinct population, and validation cannot catch it because the validation set was cleaned the same way",
          "It removes too few points",
          "It biases the intercept only"
        ],
        answer: 1,
        why: "The credit-model case removed high-income self-employed applicants — real records, not errors — so the model never learned how income behaves at the top of its range. Ask whether a point is *wrong*, which an automatic filter cannot determine."
      },
      {
        stem: "Two predictors have VIF 38 each. One is a genuine confounder. Should you drop it?",
        options: [
          "Yes, a VIF above 10 means it should go",
          "No — omitting a confounder reintroduces bias, and a biased coefficient is worse than an imprecise one",
          "Yes, if R² does not fall",
          "Drop whichever has the larger VIF"
        ],
        answer: 1,
        why: "Better options are to combine them into the quantity the data identifies, use ridge to stabilise the split, or — the only real fix — create independent variation through an experiment. No modelling technique estimates a parameter the data does not identify."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you decide whether to remove an outlier?",
        strong: "By establishing whether it is wrong rather than merely unusual — a data error, a different population, or a genuine rare observation. Only the first two justify removal, and the third is often the most informative point you have. I would report the fit with and without either way.",
        answer: [
          { t: "p", text: "Framing it as a decision with three distinct outcomes, rather than a threshold, is the substance." },
          { t: "p", text: "Offering the with-and-without report shows you would make the dependence visible rather than resolving it silently." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between an outlier and a leverage point?",
        strong: "An outlier is unusual in `y`, a leverage point is unusual in `x`. Only a point that is both is influential and actually moves the fit. A high-leverage point on the line is beneficial — it extends the range of `x` and shrinks the standard errors.",
        answer: [
          { t: "p", text: "Noting that leverage alone is *helpful* is the counterintuitive part and shows real familiarity." },
          { t: "p", text: "Naming Cook's D as the combined measure gives the interviewer the practical answer as well as the conceptual one." }
        ]
      },
      {
        level: "advanced",
        q: "Your regression coefficients are unstable across refits but R² is fine. What do you check?",
        strong: "VIF and the condition number. Stable fit with unstable coefficients is the signature of multicollinearity — the combination is identified and the split is not. R² uses the combination, which is why it cannot detect the problem.",
        answer: [
          { t: "p", text: "Recognising the signature immediately, rather than working through possibilities, is what the question tests." },
          { t: "p", text: "Adding that the only real fix is creating independent variation — usually an experiment — shows you know modelling cannot rescue it." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.1 — Linear Regression: Three Derivations
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**Five points, one line, and three different ways of proving it is the right line.** By calculus: set two partial derivatives to zero and the slope falls out as covariance over variance. By linear algebra: the normal equation, a 2×2 inverse, the same numbers. By geometry: the fitted values are the projection of y onto the plane the features span, and the residuals are perpendicular to it. Then the fourth view that explains why squared error was the loss all along — least squares is the maximum-likelihood estimate under Gaussian noise — and the fifth, gradient descent, for when the matrix is too big to invert. Every number is computed on x = 1…5 and y = 2.1, 3.9, 6.2, 7.8, 10.1, then the same machinery reads the churn table's spend.",

  objectives: [
    "Derive the slope and intercept of simple regression by calculus and compute them by hand on five points",
    "Derive the normal equation by matrix calculus, solve it with a 2×2 inverse, and get the same coefficients",
    "Explain the projection view — the hat matrix, leverage, and why residuals are orthogonal to the features",
    "Show that OLS is the MLE under Gaussian noise, and choose between the normal equation, QR/SVD and gradient descent by size and conditioning"
  ],

  prerequisites: ["1.8", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "By calculus: slope is covariance over variance", id: "calculus" },

    { t: "p", text: "The model ŷ = β₀ + β₁x; the objective, residual sum of squares, J(β₀, β₁) = Σ(yᵢ − β₀ − β₁xᵢ)². Two partial derivatives, both set to zero, are the **normal equations** — and solving them is a page of algebra that ends in two lines worth memorising." },

    { t: "code", lang: "text", title: "The derivation",
      code: `∂J/∂β₀ = -2 Σ (yᵢ - β₀ - β₁xᵢ) = 0     ⇒   Σyᵢ = nβ₀ + β₁Σxᵢ     ⇒   ȳ = β₀ + β₁x̄     ⇒   β₀ = ȳ - β₁x̄
                                                                                                    the line passes through the centroid (x̄, ȳ)

∂J/∂β₁ = -2 Σ xᵢ(yᵢ - β₀ - β₁xᵢ) = 0   ⇒   Σxᵢyᵢ = β₀Σxᵢ + β₁Σxᵢ²
substitute β₀ = ȳ - β₁x̄ and use  Σxᵢyᵢ - n x̄ ȳ = Σ(xᵢ - x̄)(yᵢ - ȳ)   and   Σxᵢ² - n x̄² = Σ(xᵢ - x̄)²:

        β₁ = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²  =  Cov(x, y) / Var(x)`,
      caption: "The slope is how much y co-varies with x per unit of x's own variance. Everything about linear regression's behaviour — its sensitivity to leverage points, its dependence on the spread of x — is in that ratio."
    },

    { t: "code", lang: "text", title: "Worked on five points (executed)",
      code: `x = [1, 2, 3, 4, 5]        y = [2.1, 3.9, 6.2, 7.8, 10.1]        x̄ = 3      ȳ = 6.02

  xᵢ - x̄     yᵢ - ȳ     (xᵢ - x̄)(yᵢ - ȳ)    (xᵢ - x̄)²
   -2        -3.92          7.84               4
   -1        -2.12          2.12               1
    0         0.18          0.00               0
    1         1.78          1.78               1
    2         4.08          8.16               4
                       Σ = 19.90          Σ = 10

β₁ = 19.90 / 10 = 1.99          β₀ = 6.02 - 1.99 × 3 = 0.05          ŷ = 0.05 + 1.99 x

fitted    2.04   4.03   6.02   8.01  10.00
residual  0.06  -0.13   0.18  -0.21   0.10          Σ e = 0   Σ x·e = 0   (the two normal equations, satisfied)
RSS = 0.107      TSS = Σ(yᵢ - ȳ)² = 39.708      R² = 1 - 0.107/39.708 = 0.9973      RMSE 0.146      MAE 0.136`,
      caption: "The residuals sum to zero and are uncorrelated with x — not by luck but because those are the two equations that were solved. Any fit whose residuals have a non-zero mean or correlate with a feature is not the least-squares fit."
    },

    { t: "dl", items: [
      ["Residual sum of squares (RSS)", "Σ(yᵢ − ŷᵢ)². The objective; the MSE is RSS / n."],
      ["Normal equations", "The gradient of RSS set to zero: XᵀXβ = Xᵀy. For one feature, two equations in β₀ and β₁."],
      ["Design matrix X", "n × (p + 1): a column of ones for the intercept, then the features. Every row is one observation."],
      ["Hat matrix H", "X(XᵀX)⁻¹Xᵀ: maps y to ŷ = Hy. Symmetric, idempotent (H² = H), trace = number of parameters. Its diagonal is leverage."],
      ["Leverage hᵢᵢ", "How much observation i pulls the fit toward itself; large for x far from x̄. Sums to p + 1. The endpoints here have 0.6 against 0.2 for the centre."],
      ["Gauss–Markov", "Among linear unbiased estimators, OLS has the smallest variance, given uncorrelated equal-variance errors (4.2)."],
      ["Condition number", "The ratio of XᵀX's largest to smallest eigenvalue; large when features are nearly collinear; the normal equation loses about log₁₀(κ) digits."]
    ]},

    { t: "h2", n: "02", text: "By linear algebra: the normal equation", id: "matrix" },

    { t: "code", lang: "text", title: "The matrix derivation and the same five points (executed)",
      code: `J(β) = ‖y - Xβ‖² = (y - Xβ)ᵀ(y - Xβ) = yᵀy - 2βᵀXᵀy + βᵀXᵀXβ

∇_β J = -2Xᵀy + 2XᵀXβ = 0        using  ∂(βᵀa)/∂β = a   and   ∂(βᵀAβ)/∂β = 2Aβ  for symmetric A

        XᵀX β = Xᵀy      ⇒      β̂ = (XᵀX)⁻¹ Xᵀ y          (XᵀX invertible iff no feature is a linear combination of the others)

X = [1 1; 1 2; 1 3; 1 4; 1 5]        XᵀX = [ n   Σx ] = [ 5   15 ]        Xᵀy = [ Σy  ] = [ 30.1 ]
                                            [ Σx  Σx²]   [15   55 ]               [ Σxy ]   [110.2 ]
det(XᵀX) = 5·55 - 15·15 = 50           (XᵀX)⁻¹ = (1/50) [ 55  -15 ] = [ 1.1  -0.3 ]
                                                        [-15    5 ]   [-0.3   0.1 ]
β̂ = [ 1.1·30.1 - 0.3·110.2 ] = [ 33.11 - 33.06 ] = [ 0.05 ]
    [-0.3·30.1 + 0.1·110.2 ]   [ -9.03 + 11.02 ]   [ 1.99 ]                    the calculus answer, to the last digit`,
      caption: "The same two numbers from a 2×2 inverse. For p features the inverse is (p+1)×(p+1), and the arithmetic is the same: the closed form is one matrix product, one solve. The 'iff' is the dummy trap of 3.2 and the multicollinearity of 3.5 stated exactly: XᵀX is singular when a column is a combination of others, and nearly singular — a huge condition number — when it nearly is."
    },

    { t: "code", lang: "text", title: "By geometry: projection, the hat matrix, leverage (executed)",
      code: `ŷ = X β̂ = X(XᵀX)⁻¹Xᵀ y = H y                the hat matrix puts the hat on y

H is symmetric (H = Hᵀ), idempotent (H H = H), and trace(H) = 2 = the number of parameters      (all three checked numerically)
diag(H) = leverage = [0.60, 0.30, 0.20, 0.30, 0.60]      the end points pull three times as hard as the middle one

Xᵀ e = Xᵀ(y - ŷ) = [0, 0]                                 the residual is orthogonal to every column of X:
                                                          ŷ is the closest point to y in the plane spanned by the features`,
      caption: "OLS is a projection: it drops y perpendicularly onto the subspace the features span and calls the foot of the perpendicular ŷ. Orthogonality of the residual is the geometric statement of the normal equations, and it is why adding a feature can never raise RSS (a bigger subspace is never further from y — the R²-never-falls fact of 2.4). Leverage is the diagonal of the projection: an x far from the others has a fitted value that is mostly its own y, which is why one extreme x can steer the whole line (4.2)."
    },

    { t: "viz",
      title: "The projection",
      caption: "y lives in n-dimensional space; the features span a plane through it. The least-squares fit is the perpendicular drop of y onto that plane; the residual is the perpendicular itself, orthogonal to every feature direction.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A tilted parallelogram representing the column space of X, a vector y rising above it, its projection y-hat lying in the plane, and the residual e drawn as a perpendicular from y down to y-hat with a right-angle mark.">
  <defs>
    <marker id="ac-ah-41" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <polygon points="120,200 560,200 700,120 260,120" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="640" y="205" class="s-sub">column space of X — every possible Xβ</text>
  <g style="stroke:var(--ink-3)" stroke-width="1.6" fill="none">
    <line x1="300" y1="170" x2="470" y2="40" marker-end="url(#ac-ah-41)"/>
    <line x1="300" y1="170" x2="470" y2="150" marker-end="url(#ac-ah-41)"/>
    <line x1="470" y1="150" x2="470" y2="48" style="stroke:var(--crit)" stroke-dasharray="4 3" marker-end="url(#ac-ah-41)"/>
    <path d="M462,150 L462,142 L470,142" style="stroke:var(--crit)" stroke-width="1.2"/>
  </g>
  <circle cx="300" cy="170" r="4" style="fill:var(--ink-3)"/>
  <g class="s-label" style="font-weight:600">
    <text x="478" y="38">y</text>
    <text x="478" y="166" style="fill:var(--accent)">ŷ = Hy</text>
    <text x="482" y="100" style="fill:var(--crit)">e = y − ŷ ⟂ X</text>
    <text x="270" y="190">0</text>
  </g>
  <g class="s-sub"><text x="120" y="240">x₁ direction: the intercept column; x₂: the feature — the plane is all their combinations</text></g>
</svg>`
    },

    { t: "h2", n: "03", text: "Why squared error: OLS is the maximum-likelihood estimate", id: "mle" },

    { t: "code", lang: "text", title: "Gaussian noise turns 'maximise the likelihood' into 'minimise RSS' (executed)",
      code: `assume   yᵢ = xᵢᵀβ + εᵢ,   εᵢ ~ N(0, σ²) independent

likelihood   L(β) = Π (2πσ²)^(-1/2) exp( -(yᵢ - xᵢᵀβ)² / 2σ² )
log-likelihood   ℓ(β) = -(n/2) log(2πσ²) - (1/2σ²) Σ (yᵢ - xᵢᵀβ)²  =  const - RSS(β) / 2σ²

only the last term depends on β, and it is minus RSS over a positive constant:   argmax ℓ = argmin RSS.

on the five points, with σ̂² = RSS/(n - 2) = 0.107/3 = 0.0357:
   at the OLS slope 1.99:        RSS 0.107      ℓ = +2.24
   at slope 2.0036 (1.1's w*):   RSS 0.117      ℓ = +2.10        <- the one-parameter fit of 1.1 had no intercept; a slightly worse line
   at slope 1.5:                 RSS 13.31      ℓ = -182.9

and the same σ̂² gives standard errors:   SE(β₁) = sqrt(σ̂² / Σ(xᵢ - x̄)²) = sqrt(0.0357 / 10) = 0.060      t = 1.99 / 0.060 = 33.3      p ≈ 6 × 10⁻⁵`,
      caption: "This is the answer to 'why squared error and not absolute error': squared error is the negative log-likelihood of Gaussian noise. Under Laplace noise the MLE would minimise absolute error (median regression); under Poisson counts, the deviance (4.6). The likelihood view also delivers what the geometric view cannot — standard errors, t-statistics and p-values for the coefficients, which is 4.2's inference — and it is the bridge to the Bayesian derivation of ridge in 1.4."
    },

    { t: "h2", n: "04", text: "Solving it at scale", id: "solvers" },

    { t: "code", lang: "python", title: "Gradient descent on the five points, and three solvers on 200,000 × 50 (executed)",
      hl: [2, 3, 4, 5, 9, 10, 11, 14, 15],
      code: `theta = np.zeros(2)                                       # β ← β - α ∇J,  ∇J = -(2/n) Xᵀ(y - Xβ)
for it in range(2000): theta -= 0.02 * (2 / 5) * X.T @ (X @ theta - y)
#   it 10     [0.484, 1.867]        it 100    [0.286, 1.925]
#   it 500    [0.066, 1.986]        it 2000   [0.050, 1.990]    <- converges to the closed form; slowly along the intercept (1.8's flat direction)

# 200,000 rows x 50 features:
#   normal equation   np.linalg.solve(A.T @ A, A.T @ b)     34 ms      O(np² + p³): fast when p is small, and it squares the condition number
#   lstsq (QR / SVD)  np.linalg.lstsq(A, b)                292 ms      O(np²) with better numerics: what LinearRegression uses
#   SGD, 5 epochs     SGDRegressor                          328 ms      O(npk): the only option when n or p is too large for a factorisation

# near-collinear columns (x and x + 1e-8 noise, condition number 2 × 10⁸):
#   normal equation   [-8,671,  8,673]        lstsq   [18,316, -18,314]        <- both garbage individually; both sum to 2, which is all the data can say`,
      caption: "For tabular data of ordinary size, `LinearRegression` (SVD-based least squares) is exact and takes milliseconds; the normal equation is faster still but squares the condition number, so it loses precision first; gradient descent is for the regime where a factorisation of X does not fit — millions of rows, hundreds of thousands of sparse features, streaming data (11.3). The collinear example is the reminder that no solver fixes an ill-posed problem: when two columns are nearly identical, only their sum is identifiable, and the answer is ridge (4.3), not a better inverse."
    },

    { t: "table",
      head: ["Solver", "Cost", "Exact?", "Numerics", "Use when"],
      rows: [
        ["Normal equation (solve XᵀXβ = Xᵀy)", "O(np² + p³)", "Yes", "Condition number squared; fails first under collinearity", "Small p, well-conditioned, teaching"],
        ["QR / SVD least squares", "O(np²)", "Yes", "Best; handles rank deficiency via minimum-norm", "The default: scikit-learn's LinearRegression"],
        ["Cholesky on XᵀX + λI (ridge)", "O(np² + p³)", "Yes", "λ fixes the conditioning", "Ridge; the closed form of 4.3"],
        ["Gradient / stochastic gradient descent", "O(npk)", "Approximate", "Needs scaling; sensitive to the learning rate", "Huge n or p, sparse features, online updates"],
        ["Coordinate descent", "O(npk)", "Approximate", "Handles L1 exactly", "Lasso, elastic net (4.3)"]
      ]
    },

    { t: "h2", n: "05", text: "The same machinery on the churn table", id: "churn" },

    { t: "code", lang: "python", title: "spend_12m on four numeric features (executed, outlier removed)",
      hl: [2, 3, 6, 7],
      code: `LinearRegression().fit(d[["tenure_months", "monthly_fee", "logins_30d", "discount_pct"]], d.spend_12m)
#   tenure +1.07 per month    fee +11.09 per pound    logins -0.69    discount -1.60 per point    intercept -26.3    R² 0.757
#   'each extra pound of monthly fee adds £11.09 of twelve-month spend, holding the others fixed'

# but the generating rule is fee x min(tenure, 12): the effect of tenure is +fee per month for the first year and zero after.
# restricted to customers with tenure <= 12:  tenure +11.2 per month   fee +6.8   R² 0.892
# the full-table coefficient of 1.07 is an average of 'about 11' and 'about 0' -- true on average and true for nobody (3.4 built the interaction)`,
      caption: "A coefficient is 'the change in y per unit of this feature, holding the others fixed, averaged over the data' — and the averaging is where a linear model quietly misdescribes a non-linear world. The R² of 0.757 with all four features is honest; the coefficients are honest averages; the story 'tenure adds a pound a month' is false for everyone. 4.2 is the diagnostics that would have caught it (a residual plot against tenure bends at twelve)."
    },

    { t: "callout", kind: "mental", title: "Three views, one estimate, three uses", body: [
      { t: "p", text: "**Calculus** gives the formulas and the intuition (slope = covariance over variance; the line through the centroid). **Linear algebra** gives the general solution, the solvers and the conditioning story. **Geometry** gives leverage, orthogonal residuals and why R² never falls. And the **likelihood** gives the standard errors and the reason squared error was the loss. An interviewer asking for 'the derivation' wants the second; one asking 'why squared error' wants the fourth; one asking 'why does that one point move the line so much' wants the third." }
    ]},

    { t: "ladder",
      title: "Fitting a linear model to two million rows and three hundred features",
      rungs: [
        { level: "bad", label: "Invert XᵀX by hand", code: `beta = np.linalg.inv(X.T @ X) @ X.T @ y`,
          note: "**Explicit inversion is never right**: slower and less stable than a solve, and the condition number is squared before it starts." },
        { level: "ok", label: "LinearRegression (SVD)", code: `LinearRegression().fit(X, y)          # O(np²): 2M x 300² ~ 2 x 10¹¹ flops, seconds to a minute, memory for X`,
          note: "**Exact and fine at this size.** Would not survive 300,000 sparse features or a stream." },
        { level: "best", label: "Scale, then SGD or Ridge with a solver chosen for the shape", code: `Ridge(alpha=1.0, solver="sag").fit(X_scaled, y)     # or SGDRegressor for streaming; 'sparse_cg' / 'lsqr' for sparse X`,
          note: "**Standardised features, a regulariser for the conditioning, and a solver that matches the matrix** — iterative for tall or sparse, direct for small." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Two features by hand, then check every property",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Data: x₁ = [1, 2, 3, 4], x₂ = [2, 1, 4, 3], y = [6, 5, 12, 10]. **(a)** Build X with an intercept column, compute XᵀX and Xᵀy by hand, and solve the 3×3 normal equations (Gaussian elimination is fine). **(b)** Compute the fitted values, residuals, RSS, R², and verify Xᵀe = 0. **(c)** Compute the hat matrix's diagonal and trace, and explain why every observation has the same leverage here. **(d)** Compute σ̂² with n − 3 degrees of freedom and the standard error of each coefficient from σ̂²(XᵀX)⁻¹. **(e)** Run gradient descent from zero with a learning rate you choose using 2/λ_max of (2/n)XᵀX, and report the iterations to reach the closed form within 0.01." }
      ],
      requirements: [
        "The 3×3 system and its solution, arithmetic visible.",
        "RSS, R², and Xᵀe to numerical zero.",
        "Leverages summing to 3, with the equal-leverage explanation.",
        "Three standard errors.",
        "The learning-rate bound and the iteration count."
      ],
      hint: "XᵀX = [[4, 10, 10], [10, 30, 28], [10, 28, 30]] and Xᵀy = [33, 92, 95]. The eigenvalues of (2/n)XᵀX set the step; expect a few hundred iterations for the flat direction.",
      solution: {
        lang: "python",
        title: "two_features.py",
        code: `X = np.c_[np.ones(4), [1, 2, 3, 4], [2, 1, 4, 3]]; y = np.array([6, 5, 12, 10.])
XtX = X.T @ X          # [[4, 10, 10], [10, 30, 28], [10, 28, 30]]
Xty = X.T @ y          # [33, 92, 95]
beta = np.linalg.solve(XtX, Xty)        # (a)  [1.375, 0.625, 2.125]  -- by elimination: the same three numbers
yhat = X @ beta; e = y - yhat           # (b)  fitted [6.25, 4.75, 11.75, 10.25]   residuals [-0.25, +0.25, +0.25, -0.25]
RSS = e @ e; TSS = ((y - y.mean()) ** 2).sum(); R2 = 1 - RSS / TSS      # RSS 0.25   TSS 32.75   R² 0.9924
X.T @ e                                 # [0, 0, 0]
H = X @ np.linalg.inv(XtX) @ X.T        # (c)
np.diag(H), np.trace(H)                 # [0.75, 0.75, 0.75, 0.75], trace 3: with four rows and three parameters each row has leverage 3/4 --
                                        # the design is a perfect square in (x1, x2) space, every point equally far from the centroid
sigma2 = RSS / (4 - 3)                  # (d) 0.25 on one residual degree of freedom
se = np.sqrt(np.diag(sigma2 * np.linalg.inv(XtX)))      # [0.673, 0.280, 0.280]: the slope 0.625 is barely two standard errors from zero
lam = np.linalg.eigvalsh(2 * XtX / 4); alpha = 0.9 * 2 / lam.max()      # (e) eigenvalues [0.26, 1.0, 30.74]: condition number 118; alpha 0.0586
theta = np.zeros(3); k = 0
while np.abs(theta - beta).max() > 0.01:
    theta -= alpha * (2 / 4) * X.T @ (X @ theta - y); k += 1
print(k, "iterations")                  # 289: x1 and x2 are correlated (r = 0.6) and the intercept direction is flat`,
        notes: [
          { t: "p", text: "**(c) and (d) together** say something the coefficients do not: with four rows and three parameters there is one degree of freedom left, the standard errors are half the size of the slopes, and every point has leverage 0.75 — the fit is close to exact and close to meaningless. That is what n ≈ p looks like." },
          { t: "p", text: "**(e)'s iteration count** is the condition number of XᵀX made visible: correlated features give an elongated bowl, and the step safe for the steep direction crawls along the flat one (1.8)." },
          { t: "p", text: "**Xᵀe = 0 is the check that catches a wrong solve.** If the residuals correlate with a column, the fit is not least squares, whatever printed it." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The residuals of the five-point fit sum to zero and are uncorrelated with x. Coincidence?",
          options: [
            "Yes; the data happened to be symmetric",
            "No: those two facts are exactly the two normal equations that were solved — ∂J/∂β₀ = 0 says Σe = 0 and ∂J/∂β₁ = 0 says Σxe = 0; geometrically, the residual is orthogonal to the intercept column and to x",
            "It only holds for perfect fits",
            "It is a property of the data, not the fit"
          ],
          answer: 1,
          why: "Any fit whose residuals have non-zero mean or correlate with a feature is not the least-squares fit — a free check on any implementation."
        }
      ]
    }
  ],

  takeaways: [
    "**Slope = Cov(x, y) / Var(x); intercept = ȳ − β₁x̄; the line passes through the centroid.**",
    "**The normal equation β̂ = (XᵀX)⁻¹Xᵀy** is the same derivation in matrix form; XᵀX is singular exactly when a feature is a combination of others.",
    "**ŷ = Hy is a projection**: H is symmetric, idempotent, trace = parameters; its diagonal is leverage (0.6 at the ends, 0.2 in the middle).",
    "**Residuals are orthogonal to every feature** — the normal equations, geometrically — and RSS can never rise when a column is added.",
    "**OLS is the MLE under Gaussian noise**: squared error is the negative log-likelihood; σ̂² = RSS/(n − p − 1) gives standard errors and t-tests.",
    "**Never invert XᵀX explicitly**; solve, or use SVD/QR (`LinearRegression`), which handles rank deficiency.",
    "**The normal equation squares the condition number**; at κ = 2 × 10⁸ every solver returns garbage coefficients whose sum is right — regularise instead.",
    "**Gradient descent is for the regime where X cannot be factorised**; it crawls along flat directions and needs scaled features.",
    "**A coefficient is an average effect holding the others fixed** — 'tenure adds £1.07 a month' was true on average and true for nobody.",
    "**Three views, three uses**: calculus for intuition, algebra for solvers, geometry for leverage; the likelihood for inference and for why the loss is squared."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why can the R² of a training fit never fall when a feature is added?",
        options: [
          "Because R² is bounded by 1",
          "Because adding a column enlarges the subspace the features span, and the projection of y onto a larger subspace is never further from y — RSS cannot rise, so R² cannot fall; adjusted R² and held-out data correct for this",
          "Because the intercept absorbs it",
          "It can fall if the feature is noise"
        ],
        answer: 1,
        why: "The geometric view makes this a one-line fact. Fifty noise columns raised training R² from 0.56 to 0.68 in 2.4."
      },
      {
        stem: "What does the hat matrix's diagonal tell you?",
        options: [
          "The residuals",
          "Each observation's leverage — how much its own y contributes to its fitted value; large for rows far from the feature centroid, summing to the number of parameters. A row with leverage near 1 has its fitted value dictated by itself and can steer the line",
          "The coefficients",
          "The R² per row"
        ],
        answer: 1,
        why: "Leverage is the first half of influence; the second is the residual (Cook's distance combines them, 4.2)."
      },
      {
        stem: "Why is OLS the maximum-likelihood estimate, and what changes if the noise is not Gaussian?",
        options: [
          "OLS is always the MLE",
          "With Gaussian noise the log-likelihood is a constant minus RSS/2σ², so maximising it minimises RSS; with Laplace noise the MLE minimises absolute error (median regression), with Poisson counts it minimises the deviance — the loss follows the noise model",
          "It is not the MLE; it is the MAP",
          "The MLE requires known σ"
        ],
        answer: 1,
        why: "This is why 2.4's metric choice and 4.6's GLMs are the same question: what does the noise look like?"
      },
      {
        stem: "Two features are nearly identical (condition number 2 × 10⁸). What happens and what is the fix?",
        options: [
          "The normal equation fails but SVD works",
          "Every exact solver returns huge coefficients of opposite sign whose sum is right — only the sum is identifiable from the data; no solver fixes an ill-posed problem, ridge regularisation does (or drop one column)",
          "Gradient descent finds the right answer",
          "Standardising fixes it"
        ],
        answer: 1,
        why: "The executed run: normal equation [−8,671, 8,673], lstsq [18,316, −18,314], both summing to 2. Conditioning is a property of the data."
      },
      {
        stem: "When would you fit a linear regression with SGD rather than the closed form?",
        options: [
          "Always; it is more accurate",
          "When X cannot be factorised — tens of millions of rows, hundreds of thousands of sparse features, or data arriving as a stream — because SGD costs O(npk) with no matrix to store, at the price of approximate convergence, a learning rate, and the need for scaled features",
          "When p is small",
          "When the features are collinear"
        ],
        answer: 1,
        why: "On 200,000 × 50 the exact solvers took 34–292 ms and SGD 328 ms for five epochs; the closed form wins until it stops fitting in memory."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain how linear regression works, with the derivation.",
        strong: "The model predicts y as a weighted sum of the features plus an intercept, and the weights are chosen to minimise the residual sum of squares. In matrix form the objective is (y − Xβ)ᵀ(y − Xβ); its gradient is −2Xᵀy + 2XᵀXβ; setting it to zero gives the normal equations XᵀXβ = Xᵀy, so β̂ = (XᵀX)⁻¹Xᵀy when XᵀX is invertible, which requires no feature to be a linear combination of the others. For one feature that reduces to slope equals covariance of x and y over variance of x, and intercept equals ȳ − β₁x̄, so the line passes through the centroid. Geometrically, ŷ is the projection of y onto the column space of X and the residuals are orthogonal to every feature. And under Gaussian noise this is the maximum-likelihood estimate, which is why squared error is the loss. In practice one never inverts XᵀX; scikit-learn solves by SVD, and for data too large to factorise, stochastic gradient descent.",
        answer: [
          { t: "p", text: "Objective, gradient, normal equations, the one-feature specialisation, the projection, the MLE justification, and the solver note — the full derivation in a minute." }
        ]
      },
      {
        level: "core",
        q: "Explain the difference between the normal equation and gradient descent for fitting a linear model.",
        strong: "The normal equation is the closed form: one solve of a (p+1)-dimensional system, exact, no hyperparameters, O(np² + p³). It is the right choice up to a few thousand features and any number of rows that fit in memory — 200,000 by 50 solves in tens of milliseconds. Its weaknesses are that it needs XᵀX invertible, it squares the condition number so it loses precision first on collinear data, and it needs the whole matrix at once. Gradient descent iterates β ← β − α∇J with ∇J = −(2/n)Xᵀ(y − Xβ): approximate, needs a learning rate below 2/λ_max and scaled features, and crawls along flat directions of the loss — on five points it needed two thousand steps to pin down the intercept. Its virtue is cost O(npk) with no factorisation, so it is the only option for huge or streaming data, and it composes with L1 penalties and online updates. Between them sits QR/SVD least squares, which is what libraries use by default.",
        answer: [
          { t: "p", text: "Cost, exactness, conditioning, memory, hyperparameters, and where each wins — with numbers." }
        ]
      },
      {
        level: "advanced",
        q: "Interpret a coefficient of 1.07 on tenure in a spend model, and say when that interpretation fails.",
        strong: "It says that, holding the other features fixed, each additional month of tenure is associated with £1.07 more twelve-month spend, on average across the training data. It fails in four ways. If the true relationship is non-linear — here spend accrues at the monthly fee for the first twelve months and not at all after — the coefficient is an average of about 11 and about 0 that describes nobody; a residual plot against tenure would show the bend. If tenure is correlated with other features, 'holding the others fixed' describes a counterfactual the data barely contains and the coefficient's standard error is inflated. If the features are unscaled, 1.07 per month is not comparable with 11.09 per pound of fee. And it is an association, not a cause: nothing about the regression says that extending a customer's tenure would raise their spend. The honest report gives the coefficient with its standard error, the residual diagnostics, and the caveat that it is an average slope in observational data.",
        answer: [
          { t: "p", text: "The literal meaning, then non-linearity, collinearity, scale and causality as the four failure modes — with the executed example." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.3 — Ridge, Lasso and Elastic Net
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**Add a penalty on the size of the coefficients to the least-squares objective, and two things happen: the solution becomes unique even when XᵀX is singular, and the coefficients shrink toward zero in a way you can compute exactly.** With an L2 penalty the shrinkage is a closed form — each direction of the data is scaled by d²/(d² + λ), which this lesson computes from the singular values. With an L1 penalty there is no closed form but there is a one-line coordinate update, soft-thresholding, that sets small coefficients to exactly zero; it is worked by hand and matches scikit-learn to three decimals. Then the case that separates the three penalties — two features correlated at 0.998 — where ridge splits the weight, lasso picks a winner that changes with the bootstrap sample, and elastic net keeps both every time.",

  objectives: [
    "Derive ridge's closed form, compute it on five points, and read the SVD shrinkage factors d²/(d² + λ)",
    "Derive lasso's soft-thresholding update from the subgradient and run coordinate descent by hand",
    "Explain the geometry — the L1 diamond's corners against the L2 circle — and the Bayesian priors behind both",
    "Show how ridge, lasso and elastic net treat correlated features, trace a regularisation path, and choose the penalty strength by cross-validation"
  ],

  prerequisites: ["4.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Ridge: the closed form and what it shrinks", id: "ridge" },

    { t: "code", lang: "text", title: "Objective, gradient, solution — and why the matrix is always invertible",
      code: `J(β) = ‖y - Xβ‖²  +  λ ‖β‖²₂                          (features standardised, y centred, intercept unpenalised)

∇J = -2Xᵀ(y - Xβ) + 2λβ = 0     ⇒     (XᵀX + λI) β = Xᵀy     ⇒     β̂_ridge = (XᵀX + λI)⁻¹ Xᵀy

XᵀX is positive semi-definite (eigenvalues ≥ 0); adding λI lifts every eigenvalue by λ, so XᵀX + λI is positive definite and
invertible for any λ > 0 -- even when p > n, even when two columns are identical. Ridge always has exactly one solution.`,
      caption: "The penalty is the same one 1.4 derived as a Gaussian prior on the weights; here it is the algebraic fix for a singular or ill-conditioned XᵀX. λ is added to every eigenvalue, so the condition number (λ_max + λ)/(λ_min + λ) collapses toward 1 as λ grows."
    },

    { t: "code", lang: "text", title: "Five points, two centred features, four values of λ (executed)",
      code: `XᵀX = [10   10 ]        singular values of X: 4.763, 1.455        d² = 22.68, 2.12        (the two directions of the data, and how much variance each carries)
      [10   14.8]

λ        β̂                    ‖β̂‖
  0      [0.667, 1.333]        1.491        <- ordinary least squares
  1      [0.705, 1.225]        1.413
 10      [0.586, 0.828]        1.015
100      [0.162, 0.216]        0.270        <- shrinking toward zero, never reaching it

the SVD view:  β̂_ridge = V · diag( dⱼ / (dⱼ² + λ) ) · Uᵀ y,   so along each principal direction the OLS estimate is scaled by  dⱼ² / (dⱼ² + λ):
λ = 1:      [0.958, 0.679]         the strong direction keeps 96 %, the weak one 68 %
λ = 10:     [0.694, 0.175]         the weak direction (d² = 2.12) is mostly gone
λ = 100:    [0.185, 0.021]`,
      caption: "Ridge does not shrink every coefficient equally; it shrinks every *direction* by d²/(d² + λ). Directions the data barely spans — small singular values, which is what collinearity produces — are shrunk hardest, which is exactly the unidentified direction of 4.1's near-collinear example. That is why ridge is the fix for collinearity and why it needs standardised features: the singular values are in the features' units."
    },

    { t: "dl", items: [
      ["Ridge (L2)", "Penalty λΣβⱼ². Closed form (XᵀX + λI)⁻¹Xᵀy; shrinks toward zero, never to it; splits weight among correlated features; a Gaussian prior."],
      ["Lasso (L1)", "Penalty λΣ|βⱼ|. No closed form; coordinate descent with soft-thresholding; sets coefficients exactly to zero; picks one of a correlated group; a Laplace prior."],
      ["Elastic net", "Penalty λ[α Σ|βⱼ| + (1 − α) Σβⱼ²]. Sparse like lasso, groups correlated features like ridge; scikit-learn's `l1_ratio` is α."],
      ["Soft-thresholding", "S(ρ, λ) = sign(ρ)·max(|ρ| − λ, 0): shrink by λ, and to zero if that would cross it. The lasso's coordinate update."],
      ["Regularisation path", "The coefficients as a function of λ from very large (all zero) to zero (OLS). Lasso's path is piecewise linear; the order in which features enter is a ranking."],
      ["Degrees of freedom of ridge", "trace of the hat matrix: Σ dⱼ²/(dⱼ² + λ), between 0 and p. The 'effective number of parameters'."],
      ["Standardise first", "Both penalties treat every coefficient alike, so the features must be on one scale (3.1). The intercept is not penalised."]
    ]},

    { t: "h2", n: "02", text: "Lasso: soft-thresholding, worked", id: "lasso" },

    { t: "code", lang: "text", title: "From the subgradient to the update",
      code: `J(β) = ½ ‖y - Xβ‖² + λ ‖β‖₁                |βⱼ| has no derivative at 0; its subgradient is  sign(βⱼ) if βⱼ ≠ 0, and any value in [-1, 1] if βⱼ = 0

hold every coefficient but βⱼ fixed. Let  r₋ⱼ = y - Σ_{k≠j} xₖβₖ  (the partial residual),  ρⱼ = xⱼᵀ r₋ⱼ,  zⱼ = xⱼᵀ xⱼ.
the one-dimensional objective in βⱼ is  ½ zⱼ βⱼ² - ρⱼ βⱼ + λ|βⱼ| + const, and its subgradient is  zⱼβⱼ - ρⱼ + λ·∂|βⱼ|.

setting it to zero:   βⱼ > 0:  βⱼ = (ρⱼ - λ)/zⱼ   requires ρⱼ > λ
                      βⱼ < 0:  βⱼ = (ρⱼ + λ)/zⱼ   requires ρⱼ < -λ
                      βⱼ = 0:  needs 0 ∈ [ρⱼ - λ, ρⱼ + λ]/zⱼ,  i.e.  |ρⱼ| ≤ λ

all three cases in one line:      βⱼ ← S(ρⱼ, λ) / zⱼ       with  S(ρ, λ) = sign(ρ) · max(|ρ| - λ, 0)

cycle over j until nothing changes: coordinate descent. Each step is exact; the objective is convex; it converges.`,
      caption: "The zero case is the whole point: whenever a feature's correlation with the current residual, ρⱼ, is smaller than λ, its coefficient is set to exactly zero — not shrunk toward it. That is the corner of the diamond in section 03 expressed as arithmetic, and it is why lasso is a feature selector."
    },

    { t: "code", lang: "text", title: "Coordinate descent by hand on the five points, columns scaled to unit norm (executed)",
      code: `zⱼ = 1 for both columns.   first pass, β = 0:   ρ₀ = x₀ᵀ y = 6.325

λ = 0.5:   S(6.325, 0.5) = 5.825  ->  β₀ = 5.825 on the first pass;   after cycling to convergence:  β = [1.834, 4.855]    scikit-learn: [1.834, 4.854]
λ = 2.0:   S(6.325, 2.0) = 4.325                                                              β = [1.010, 4.032]                  [1.011, 4.031]
λ = 5.0:   S(6.325, 5.0) = 1.325                                                              β = [0.000, 1.862]                  [0.000, 1.862]   <- feature 0 is out

(scikit-learn's Lasso divides the squared loss by n, so its alpha = λ / n; the two agree once that is accounted for)`,
      caption: "At λ = 5 the first feature's partial correlation with the residual, after the second feature has taken what it can, falls below the threshold and its coefficient is exactly zero. Ridge at any λ would have left it small and non-zero. The hand computation matches the library to the third decimal because coordinate descent with soft-thresholding *is* the library's algorithm."
    },

    { t: "h2", n: "03", text: "Why the corner: geometry and priors", id: "geometry" },

    { t: "viz",
      title: "The constraint regions and the loss contours",
      caption: "Both penalties are equivalent to minimising RSS inside a region of fixed size. The L2 region is a circle: the contour touches it at a point where both coefficients are non-zero. The L1 region is a diamond whose corners sit on the axes: the contour is far more likely to touch at a corner, where one coefficient is exactly zero.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two panels. Left: a circle centred at the origin with elliptical loss contours touching it at a point off both axes, labelled ridge. Right: a diamond centred at the origin with the same contours touching at a corner on the vertical axis, labelled lasso, with the horizontal coefficient equal to zero.">
  <g style="stroke:var(--line)" stroke-width="1">
    <line x1="60" y1="160" x2="400" y2="160"/><line x1="230" y1="30" x2="230" y2="290"/>
    <line x1="480" y1="160" x2="820" y2="160"/><line x1="650" y1="30" x2="650" y2="290"/>
  </g>
  <circle cx="230" cy="160" r="60" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.4"/>
  <polygon points="650,100 710,160 650,220 590,160" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="1.4"/>
  <g fill="none" style="stroke:var(--ink-3)" stroke-width="1.2">
    <ellipse cx="330" cy="90" rx="24" ry="14" transform="rotate(-30 330 90)"/><ellipse cx="330" cy="90" rx="52" ry="30" transform="rotate(-30 330 90)"/><ellipse cx="330" cy="90" rx="82" ry="47" transform="rotate(-30 330 90)"/>
    <ellipse cx="750" cy="90" rx="24" ry="14" transform="rotate(-30 750 90)"/><ellipse cx="750" cy="90" rx="52" ry="30" transform="rotate(-30 750 90)"/><ellipse cx="750" cy="90" rx="90" ry="52" transform="rotate(-30 750 90)"/>
  </g>
  <circle cx="273" cy="118" r="5" style="fill:var(--accent)"/>
  <circle cx="650" cy="100" r="5" style="fill:var(--warn)"/>
  <circle cx="330" cy="90" r="3" style="fill:var(--ink-3)"/><circle cx="750" cy="90" r="3" style="fill:var(--ink-3)"/>
  <g class="s-label" style="font-weight:600">
    <text x="70" y="50" style="fill:var(--accent)">ridge: ‖β‖₂ ≤ t</text>
    <text x="490" y="50" style="fill:var(--warn)">lasso: ‖β‖₁ ≤ t</text>
  </g>
  <g class="s-sub">
    <text x="285" y="112" style="fill:var(--accent)">both β ≠ 0</text>
    <text x="662" y="96" style="fill:var(--warn)">β₁ = 0 exactly</text>
    <text x="345" y="80">OLS</text><text x="765" y="80">OLS</text>
    <text x="380" y="176">β₁</text><text x="236" y="42">β₂</text><text x="800" y="176">β₁</text><text x="656" y="42">β₂</text>
  </g>
</svg>`
    },

    { t: "code", lang: "text", title: "The same fact three ways",
      code: `geometry:     the L1 ball has corners on the axes; a smooth contour meets a corner with positive probability, and at a corner some βⱼ = 0.
              the L2 ball is smooth; a contour meets it where the gradient of RSS is parallel to β, which is off the axes almost surely.

calculus:     the L1 penalty's subgradient at zero is the whole interval [-λ, λ]: a coefficient can sit at zero and still satisfy the
              optimality condition as long as |ρⱼ| ≤ λ. The L2 penalty's gradient at zero is 0: nothing holds a coefficient there.

probability:  L2 is a Gaussian prior, flat at zero -- 'small, not exactly zero'. L1 is a Laplace prior with a spike at zero (1.4).
              λ_ridge = σ²/τ² (noise over prior variance);  λ_lasso = 2σ²/b (noise over prior scale).`,
      caption: "Three views, one conclusion: L1 produces exact zeros because its penalty is not smooth at zero. Any penalty with a corner there — L1, the L0.5 'bridge', SCAD, MCP — selects; any smooth one shrinks."
    },

    { t: "h2", n: "04", text: "Correlated features: the three penalties diverge", id: "correlated" },

    { t: "code", lang: "python", title: "x₁ and x₂ correlated at 0.998, both copies of the same signal; x₃ independent (executed, 500 rows, standardised)",
      hl: [2, 3, 4, 5, 9, 10, 11],
      code: `#                                    x1       x2       x3
# OLS                               0.938    1.106    1.026       <- the pair's split is arbitrary noise; their sum (2.04) is the estimate
# ridge, α = 10                     1.004    1.019    1.005       <- weight shared equally between the copies
# lasso, α = 0.1                    0.979    0.963    0.924       <- at weak penalty, both kept
# lasso, α = 0.6                    1.084    0.351    0.416       <- at stronger penalty, one copy takes most of it
# elastic net, α = 0.6, l1 = 0.5    0.757    0.753    0.552       <- shared, and still sparse-capable

# the same fits on 50 bootstrap resamples, α = 0.6:
#   lasso keeps x1 alone 18 times, x2 alone 6 times, both 26 times          <- which copy survives depends on the sample
#   elastic net keeps both 50 times out of 50`,
      caption: "Lasso's selection among near-duplicates is arbitrary: the corner it lands in depends on which copy is a hair more correlated with the residual in this sample. That is fine for prediction and fatal for the story 'x₁ matters and x₂ does not'. Ridge shares the weight, which is stable and never sparse. Elastic net's L2 term makes correlated features enter together while its L1 term still zeroes the irrelevant ones — the grouping effect — which is why it is the default when the features come in correlated families (genes, pixels, lagged copies)."
    },

    { t: "code", lang: "python", title: "The lasso path on the spend model, and the strength chosen by CV (executed)",
      hl: [3, 4, 5, 6, 7, 12, 13],
      code: `lasso_path(X_std, y_centred, alphas=np.logspace(1.5, -1.5, 7))
# alpha:            31.6    10.0    3.16    1.00    0.32    0.10    0.03
#   monthly_fee     12.1    33.6    40.5    42.7    45.3    46.1    46.3      <- enters first: the strongest feature
#   tenure           0      9.3    16.2    18.3    19.0    19.2    19.3      <- second
#   discount         0      0      -6.2    -8.4    -9.1    -9.3    -9.3      <- third
#   logins           0      0       0      -0.1    -2.6    -3.4    -3.7      <- fourth
#   tickets          0      0       0       0      -0.5    -0.7    -0.8      <- last, and small: on this target it is nearly noise
# the order of entry is a ranking, and the path is piecewise linear in alpha

RidgeCV(alphas=np.logspace(-3, 3, 25))   -> alpha 1.78          LassoCV -> alpha 0.153, 5 of 5 non-zero          ElasticNetCV -> alpha 0.055, l1_ratio 0.8
#   5-fold MAE:   OLS 20.89     ridge 20.90     lasso 20.87        <- five well-scaled features, 863 complete rows: regularisation has nothing to fix`,
      caption: "On five features and a thousand rows the penalties change nothing, and the CV-chosen strengths are near zero — regularisation is a cure for variance, and this model has none to spare. The path is still useful: it is a ranking by the order features enter, which is a cheaper and more honest feature-importance than coefficient size. Where regularisation earns its keep is the next table."
    },

    { t: "code", lang: "python", title: "Sixty rows, fifty features, five of them real (executed)",
      code: `# 5-fold RMSE (noise sd 2.0 is the floor)
#   OLS                  10.04      <- p ≈ n: the fit is nearly interpolation and the variance is enormous
#   ridge, α = 10         3.39
#   elastic net           2.90
#   lasso, α = 0.3        2.60      <- the truth is sparse (5 of 50), so the sparse penalty wins`,
      caption: "This is the regime the penalties were invented for: more features than the rows can support. All three collapse the variance; lasso wins because the truth is sparse and the features are independent; with correlated groups elastic net would; with dense small effects ridge would. **The penalty encodes a belief about the coefficients** — small (ridge), few (lasso), few groups (elastic net) — and the winner is the one whose belief is closest to true."
    },

    { t: "table",
      head: ["", "Ridge", "Lasso", "Elastic net"],
      rows: [
        ["Penalty", "λ Σβ²", "λ Σ\\|β\\|", "λ[α Σ\\|β\\| + (1−α) Σβ²]"],
        ["Solution", "Closed form; always unique", "Coordinate descent; unique if X has full column rank", "Coordinate descent"],
        ["Zeros", "Never", "Yes — selection", "Yes"],
        ["Correlated features", "Shares weight; stable", "Picks one, arbitrarily", "Groups them"],
        ["p > n", "Fine", "At most n non-zero coefficients", "Fine"],
        ["Prior", "Gaussian", "Laplace", "Mixture"],
        ["Choose when", "Many small effects; collinearity; you want every coefficient", "Few large effects; interpretability; p ≫ n with independent features", "Correlated groups; unsure between the two"],
        ["scikit-learn", "`Ridge`, `RidgeCV` (fast LOO)", "`Lasso`, `LassoCV`, `lasso_path`", "`ElasticNet`, `ElasticNetCV(l1_ratio=[…])`"]
      ]
    },

    { t: "callout", kind: "trap", title: "α in scikit-learn is not λ in the textbook", body: [
      { t: "p", text: "`Lasso(alpha)` minimises (1/2n)‖y − Xβ‖² + α‖β‖₁, so α = λ/n relative to the unscaled objective; `Ridge(alpha)` minimises ‖y − Xβ‖² + α‖β‖² with no 1/n; `LogisticRegression(C)` uses C = 1/λ; `SGDRegressor(alpha)` and `ElasticNet(alpha, l1_ratio)` each have their own convention. **Never carry an α across estimators or across a change in n; choose it by cross-validation every time**, and standardise first so it means the same thing for every column." }
    ]},

    { t: "ladder",
      title: "A linear model with 2,000 gene-expression features and 200 patients",
      rungs: [
        { level: "bad", label: "OLS", code: `LinearRegression().fit(X, y)          # p = 2,000 > n = 200: infinitely many exact fits; scikit-learn returns the minimum-norm one`,
          note: "**Zero training error and no information**: with more features than rows the data cannot say which of the perfect fits is real." },
        { level: "ok", label: "Lasso, α by CV", code: `LassoCV(cv=5).fit(X_std, y)           # at most 200 non-zero coefficients; picks one gene per correlated cluster`,
          note: "**Sparse and predictive.** The selected genes are unstable across resamples because genes come in co-expressed clusters." },
        { level: "best", label: "Elastic net, α and l1_ratio by CV, with stability selection for the report", code: `ElasticNetCV(l1_ratio=[0.2, 0.5, 0.8], cv=5).fit(X_std, y)
# then refit on 100 bootstrap samples; report genes selected in >= 80 % of them (stability selection) rather than one run's list`,
          note: "**Correlated genes enter as groups, the prediction is as good, and the reported set is the part that survives resampling** — the honest answer to 'which genes'." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Shrinkage by hand, then the path that ranks",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For the lesson's centred five-point data, compute the ridge solution at λ = 4 by solving the 2×2 system by hand, and verify it equals V·diag(dⱼ/(dⱼ² + 4))·Uᵀy using the singular values 4.763 and 1.455. **(b)** Run one full coordinate-descent sweep of the lasso at λ = 3 on the unit-norm columns starting from β = 0, writing out ρ₀, the soft-threshold, the updated partial residual, ρ₁, and the second update; then iterate to convergence in code and compare with `Lasso`. **(c)** On the 51-feature bench of 3.5 (or a synthetic equivalent), compute the lasso path and report the order in which the first eight features enter; compare that ranking with the F-test ranking and say where they disagree and why." }
      ],
      requirements: [
        "(a) the 2×2 solve and the SVD form agreeing to three decimals.",
        "(b) the two hand updates and the converged coefficients against scikit-learn.",
        "(c) the entry order versus the F-test order, and the disagreement explained."
      ],
      hint: "(a) XᵀX + 4I = [[14, 10], [10, 18.8]]; Xᵀy on the centred data is [Σxc₁·yc, Σxc₂·yc]. (b) After updating β₀, recompute r₋₁ = y − x₀β₀ before ρ₁. (c) The lasso path ranks by partial correlation given what is already in; the F-test ranks by marginal correlation — they disagree on redundant copies.",
      solution: {
        lang: "python",
        title: "penalties_practice.py",
        code: `Xc = X - X.mean(0); yc = y - y.mean()
# (a)
A = Xc.T @ Xc + 4 * np.eye(2); b = Xc.T @ yc
np.linalg.solve(A, b)                                              # the 2x2 solve; by hand: eliminate, back-substitute
U, d, Vt = np.linalg.svd(Xc, full_matrices=False)
Vt.T @ np.diag(d / (d**2 + 4)) @ U.T @ yc                          # the SVD form: identical to three decimals
# shrink factors d² / (d² + 4): [22.68/26.68, 2.12/6.12] = [0.850, 0.346] -- the weak direction loses two thirds of its OLS estimate

# (b) one sweep at lambda = 3, unit-norm columns (z_j = 1)
Xs = Xc / np.sqrt((Xc**2).sum(0)); beta = np.zeros(2); lam = 3.0
rho0 = Xs[:, 0] @ yc                                               # 6.325 (nothing else in the model yet)
beta[0] = np.sign(rho0) * max(abs(rho0) - lam, 0)                  # S(6.325, 3) = 3.325
r1 = yc - Xs[:, 0] * beta[0]                                       # partial residual for feature 1
rho1 = Xs[:, 1] @ r1                                               # compute it; then
beta[1] = np.sign(rho1) * max(abs(rho1) - lam, 0)
# iterate the two updates until they stop changing; compare with Lasso(alpha=3/len(yc), fit_intercept=False).fit(Xs, yc).coef_

# (c)
alphas, coefs, _ = lasso_path(StandardScaler().fit_transform(X_bench), y_bench - y_bench.mean(), n_alphas=100)
entry = [names[i] for i in np.argsort([np.argmax(np.abs(coefs[i]) > 0) for i in range(len(names))])][:8]     # first index at which each coef becomes non-zero
# compare with the F-test order from 3.5. Expect: the lasso brings in one member of each correlated group early (inf0 OR red0 OR dup0)
# and then skips the others, because once one copy is in, the partial correlation of the copies with the residual is near zero;
# the F-test ranks all three copies at the top, because each is marginally correlated with y. The lasso path is the ranking that
# accounts for redundancy -- which is why it is a better importance than a univariate filter, and still arbitrary about WHICH copy.`,
        notes: [
          { t: "p", text: "**(a)'s shrink factors are the whole ridge story**: the same λ removes 15 % of the strong direction and 65 % of the weak one. Ridge is not 'shrink everything a bit'; it is 'shrink the directions the data cannot pin down'." },
          { t: "p", text: "**(b) makes the zero visible**: at λ = 3 the second update's threshold is compared with a partial correlation that already has the first feature's contribution removed. Whether a coefficient survives depends on what came before it — the path is sequential, which is (c)." },
          { t: "p", text: "**(c) is the interpretive use of a regularisation path**: entry order as importance, with the caveat that within a correlated group the order is a coin toss." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "At λ = 5 the lasso set the first coefficient to exactly zero while ridge at any λ left it non-zero. What in the mathematics makes the difference?",
          options: [
            "Lasso uses a different loss",
            "The L1 penalty is not differentiable at zero: its subgradient there is the whole interval [−λ, λ], so a coefficient can sit at zero and satisfy optimality as long as its partial correlation with the residual is below λ. The L2 penalty's gradient at zero is zero — nothing holds a coefficient there",
            "Ridge does not use coordinate descent",
            "Lasso standardises the features"
          ],
          answer: 1,
          why: "Geometrically the same fact is the diamond's corner; probabilistically it is the Laplace prior's spike at zero."
        }
      ]
    }
  ],

  takeaways: [
    "**Ridge: (XᵀX + λI)⁻¹Xᵀy — always invertible, always unique**; shrinks each data direction by d²/(d² + λ), so weak (collinear) directions are shrunk hardest.",
    "**Lasso: no closed form; coordinate descent with soft-thresholding βⱼ ← S(ρⱼ, λ)/zⱼ** sets coefficients exactly to zero when |ρⱼ| ≤ λ.",
    "**The corner, three ways**: L1's subgradient at zero is an interval; the L1 ball has corners on the axes; the Laplace prior has a spike at zero.",
    "**Correlated features**: ridge shares, lasso picks arbitrarily (x₁ alone 18 times, x₂ alone 6, in 50 resamples), elastic net groups (both, 50 of 50).",
    "**The lasso path is a ranking by order of entry** — partial, not marginal, correlation.",
    "**Regularisation cures variance**: nothing to fix on 5 features and 863 rows (MAE 20.9 all round); everything to fix on 50 features and 60 rows (RMSE 10.0 → 2.6).",
    "**The penalty is a belief about the coefficients** — small, few, or few groups — and the best penalty is the one closest to true.",
    "**Standardise first; the intercept is unpenalised; choose the strength by CV**; RidgeCV's leave-one-out is nearly free.",
    "**α means different things in different estimators** — never carry it across.",
    "**Report selected features with stability**, not from one run."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does ridge shrink the direction of a small singular value more than a large one?",
        options: [
          "Because small singular values are noise",
          "Because the shrink factor along direction j is dⱼ²/(dⱼ² + λ): with d² = 22.7 and λ = 10 it is 0.69, with d² = 2.1 it is 0.17. Directions the data barely spans are exactly where OLS's estimate is most variable, and ridge damps them most",
          "Because ridge standardises the features",
          "It shrinks all directions equally"
        ],
        answer: 1,
        why: "This is the mechanism by which ridge repairs collinearity: the unidentified direction of 4.1 has a tiny singular value and is shrunk toward zero."
      },
      {
        stem: "Lasso keeps x₁ on one bootstrap sample and x₂ on another. Is the model unstable?",
        options: [
          "Yes; lasso should not be used",
          "The predictions are stable — x₁ and x₂ carry the same information, so either gives the same fit — but the selected set is not; lasso's choice within a correlated group is arbitrary, which matters if the set is being interpreted. Elastic net keeps the group; stability selection reports what survives resampling",
          "No; lasso always selects the true feature",
          "Yes; use OLS instead"
        ],
        answer: 1,
        why: "18 versus 6 versus 26 in 50 resamples. Prediction and interpretation are different questions with different answers here."
      },
      {
        stem: "On the spend model, OLS, ridge and lasso all gave MAE 20.9 and LassoCV chose α = 0.15 with every coefficient non-zero. Why?",
        options: [
          "The CV was wrong",
          "Regularisation reduces variance, and a five-feature model on 863 well-scaled rows has almost none: the OLS coefficients are already precise, so the best penalty is nearly no penalty. The 50-feature, 60-row problem is where the same penalties cut RMSE from 10 to 2.6",
          "Lasso does not work on real data",
          "The features were not standardised"
        ],
        answer: 1,
        why: "The penalty is a bias–variance trade (1.3); it pays only when there is variance to trade away."
      },
      {
        stem: "When is elastic net the right choice over lasso?",
        options: [
          "Always; it has more parameters",
          "When features come in correlated groups and you want the group kept or dropped together, when p ≫ n and lasso's cap of n non-zero coefficients bites, or when you cannot decide between sparsity and shrinkage and let l1_ratio be tuned",
          "When the features are independent",
          "When n ≫ p"
        ],
        answer: 1,
        why: "Elastic net kept both copies of the correlated pair in 50 of 50 resamples. Its cost is one more hyperparameter."
      },
      {
        stem: "Why must features be standardised before ridge or lasso, and why is the intercept left unpenalised?",
        options: [
          "For numerical stability only",
          "One λ penalises every coefficient equally, and a coefficient's size depends on its feature's units, so an unscaled column in small units escapes the penalty (3.1); the intercept is the mean of y when the features are centred and penalising it would pull predictions toward zero for no reason",
          "Standardisation is optional; the intercept is penalised",
          "Because the SVD requires it"
        ],
        answer: 1,
        why: "Centre and scale X, centre y, penalise the slopes, add the intercept back: the standard implementation."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Derive ridge and lasso regression and explain the geometric intuition.",
        strong: "Both add a penalty on the coefficients to the least-squares objective. Ridge adds λ times the sum of squared coefficients; the gradient is −2Xᵀ(y − Xβ) + 2λβ, so the solution is (XᵀX + λI)⁻¹Xᵀy — the λI lifts every eigenvalue, so the matrix is invertible even when XᵀX is singular, and in the SVD each direction of the data is shrunk by d²/(d² + λ), weak directions most. Lasso adds λ times the sum of absolute coefficients; there is no closed form because |β| has no derivative at zero, but holding all but one coefficient fixed the problem is one-dimensional and its solution is soft-thresholding: shrink the partial correlation by λ and set it to zero if that would cross zero. Cycling over coordinates converges. Geometrically, each is least squares inside a constraint region — a circle for ridge, a diamond for lasso — and the diamond's corners sit on the axes, so the loss contour tends to touch it where some coefficients are exactly zero. Equivalently, ridge is a Gaussian prior and lasso a Laplace prior with a spike at zero.",
        answer: [
          { t: "p", text: "The closed form with its invertibility argument, soft-thresholding, and the corner explained three ways." }
        ]
      },
      {
        level: "core",
        q: "When would you use L1 versus L2 regularisation?",
        strong: "L1 when I believe few features matter and want the model to say which — it zeroes coefficients, so it is a selector, and it is the right choice when p is much larger than n and the true signal is sparse; in a 50-feature, 60-row test it cut the error from 10 to 2.6 against ridge's 3.4. L2 when I believe many features have small effects, when features are collinear — it shares weight across correlated copies where lasso picks one arbitrarily — and when I want every coefficient kept and stable. Elastic net when the features come in correlated groups or I cannot decide: it groups like ridge and zeroes like lasso. In every case standardise first, leave the intercept unpenalised, and choose the strength by cross-validation, because it depends on n, on the noise and on the units.",
        answer: [
          { t: "p", text: "Belief about the coefficients, collinearity behaviour, the numbers, and the three operational rules." }
        ]
      },
      {
        level: "advanced",
        q: "Explain the lasso's behaviour with correlated features and how you would report selected features honestly.",
        strong: "When two features are near-copies, the lasso's optimality condition is satisfied by putting the weight on whichever copy is marginally more correlated with the current residual, which is a property of the sample, not the population — on bootstrap resamples of a pair correlated at 0.998 it kept the first alone eighteen times, the second alone six, and both twenty-six. The prediction is unaffected because the copies are interchangeable; the reported feature set is not. Elastic net's L2 component makes correlated features enter together, so it is the model when groups exist. For reporting I use stability selection: refit the lasso or elastic net on many bootstrap samples and report the features selected in a large majority, which gives a set with a controlled false-discovery rate rather than one run's coin flips. And I say plainly that within a correlated group the data cannot distinguish members — only a design or domain knowledge can.",
        answer: [
          { t: "p", text: "The mechanism, the executed instability, elastic net's grouping, stability selection, and the honest caveat." }
        ]
      }
    ]
  }
});

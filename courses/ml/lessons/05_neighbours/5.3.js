/* ============================================================================
   LESSON 5.3 — Support Vector Machines
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**A support vector machine draws the separating hyperplane that is as far as possible from the nearest points of each class, and it is defined entirely by those nearest points — the support vectors.** This lesson builds the method in the order it was invented: the margin 2/‖w‖ and the primal problem; slack variables and C for data that overlap; the hinge loss that makes it a cousin of logistic regression; the Lagrangian dual, in which the data appear only as dot products and only support vectors have non-zero weight; and the kernel trick, which replaces those dot products with a similarity function and buys a non-linear boundary for the price of one function evaluation. Every step is executed: the dual solved on six points (w = (2, 2), b = −3, margin 0.707), XOR from 55.5 % to 96.3 % with a degree-2 kernel, a 25-cell C × γ grid, and the failure that the churn data exposes — with 15 % positives and C = 1 the linear SVM's cheapest solution is w = 0, and it predicts nobody churns.",

  objectives: [
    "Derive the margin, the hard- and soft-margin primal problems, and the role of C and the slack variables",
    "Write the hinge loss and the dual, state the KKT sparsity, and identify support vectors on a worked example",
    "Explain the kernel trick with an explicit feature map, choose between linear, polynomial and RBF kernels, and tune C and γ on a log grid",
    "Get probabilities from an SVM, handle imbalance and scale, use SVR, and know when an SVM is the wrong tool"
  ],

  prerequisites: ["4.5", "4.3", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "The margin, and the problem that maximises it", id: "margin" },

    { t: "code", lang: "text", title: "From a decision function to an optimisation problem",
      code: `decision function    f(x) = wᵀx + b,     ŷ = sign f(x)          labels y ∈ {-1, +1}

for separable data, scale w and b so the closest points of each class satisfy  y (wᵀx + b) = 1:
   the two margin planes are  wᵀx + b = ±1,  and the distance between them is  2 / ‖w‖
   MAXIMISING the margin  =  MINIMISING ‖w‖

hard margin (separable only):     min  ½ ‖w‖²      subject to   yᵢ (wᵀxᵢ + b) ≥ 1   for every i

soft margin (real data):          min  ½ ‖w‖² + C Σᵢ ξᵢ      subject to   yᵢ (wᵀxᵢ + b) ≥ 1 - ξᵢ,   ξᵢ ≥ 0
   ξᵢ is how far point i intrudes past its margin plane (0 if it is on the right side, > 1 if it is misclassified)
   C prices the intrusions: large C -> narrow margin, few violations (variance);  small C -> wide margin, many violations (bias).  C ≈ 1/λ.

the same problem as an unconstrained loss:   min  Σᵢ max(0, 1 - yᵢ f(xᵢ))  +  (1/2C) ‖w‖²         <- L2-regularised HINGE loss`,
      caption: "Three views of one object. The geometric view — widest street between the classes — is why it generalises: a wide margin is a low-capacity classifier (1.7's VC argument) whatever the dimension. The constrained view is what the solver sees. The hinge-loss view is what connects it to 4.5: replace the hinge with the log-loss and you have regularised logistic regression; the difference is that the hinge is exactly zero for every point beyond its margin, so those points do not exist as far as the solution is concerned."
    },

    { t: "viz",
      title: "Six points, the maximum-margin hyperplane and its support vectors",
      caption: "Positives at (1, 1), (2, 2), (2, 0); negatives at (0, 0), (1, 0), (0, 1). The solution is w = (2, 2), b = −3: the boundary x + y = 1.5 with margin planes x + y = 1 and x + y = 2, width 2/‖w‖ = 0.707. Four points lie on the margin planes; (2, 2) and (0, 0) are beyond them and could be deleted without moving anything.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Six points in the plane, three positive and three negative, with a diagonal separating line and two parallel dashed margin lines through the nearest points of each class. The support vectors on the margin lines are ringed. A caption on the right lists w, b and the margin.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="140" y1="260" x2="420" y2="260"/><line x1="140" y1="60" x2="140" y2="260"/></g>
  <line x1="122" y1="107" x2="293" y2="278" style="stroke:var(--ink)" stroke-width="2"/>
  <line x1="122" y1="152" x2="248" y2="278" style="stroke:var(--ink-3)" stroke-width="1.3" stroke-dasharray="6 4"/>
  <line x1="167" y1="107" x2="338" y2="278" style="stroke:var(--ink-3)" stroke-width="1.3" stroke-dasharray="6 4"/>
  <g fill="none" style="stroke:var(--warn)" stroke-width="2"><circle cx="230" cy="170" r="11"/><circle cx="320" cy="260" r="11"/><circle cx="230" cy="260" r="11"/><circle cx="140" cy="170" r="11"/></g>
  <g style="fill:var(--accent)"><circle cx="230" cy="170" r="6"/><circle cx="320" cy="80" r="6"/><circle cx="320" cy="260" r="6"/></g>
  <g style="fill:var(--crit)"><rect x="134" y="254" width="12" height="12"/><rect x="224" y="254" width="12" height="12"/><rect x="134" y="164" width="12" height="12"/></g>
  <g class="s-sub">
    <text x="240" y="160">(1,1) +</text><text x="330" y="76">(2,2) +</text><text x="330" y="256">(2,0) +</text>
    <text x="110" y="280">(0,0) −</text><text x="212" y="282">(1,0) −</text><text x="96" y="176">(0,1) −</text>
    <text x="296" y="292" style="fill:var(--ink)">x + y = 1.5</text>
    <text x="104" y="126" style="fill:var(--ink-3)">x + y = 1</text><text x="340" y="110" style="fill:var(--ink-3)">x + y = 2</text>
  </g>
  <g class="s-mono" style="fill:var(--ink-2)">
    <text x="500" y="90">w = (2, 2)    b = −3</text>
    <text x="500" y="116">‖w‖ = 2.828   margin 2/‖w‖ = 0.707</text>
    <text x="500" y="150">y(wᵀx + b):  (1,1) 1   (2,0) 1</text>
    <text x="500" y="172">             (1,0) 1   (0,1) 1</text>
    <text x="500" y="194">             (2,2) 5   (0,0) 3</text>
  </g>
  <text x="500" y="232" class="s-label" style="fill:var(--warn);font-weight:600">ringed: the support vectors (margin exactly 1)</text>
  <text x="500" y="256" class="s-sub">delete (2,2): w, b unchanged</text>
</svg>`
    },

    { t: "code", lang: "text", title: "The dual, solved on the six points (executed)",
      code: `Lagrangian with multipliers αᵢ ≥ 0 on the constraints; set ∂/∂w = 0 and ∂/∂b = 0:
      w = Σᵢ αᵢ yᵢ xᵢ          Σᵢ αᵢ yᵢ = 0
substitute back:
      max_α   Σᵢ αᵢ  -  ½ Σᵢ Σⱼ αᵢ αⱼ yᵢ yⱼ (xᵢᵀxⱼ)        subject to   0 ≤ αᵢ ≤ C,   Σ αᵢ yᵢ = 0

two things to notice, both consequences of the KKT conditions:
   1. the data enter ONLY through dot products xᵢᵀxⱼ         -> the kernel trick (section 03)
   2. αᵢ > 0 only where the constraint is active, y f(x) = 1   -> the solution is sparse in the data: only support vectors carry weight

solved numerically (SLSQP) on the six points:
   α = [3, 0, 1, 0, 3, 1]     support vectors {(1,1), (2,0), (1,0), (0,1)}      w = Σ αᵢ yᵢ xᵢ = 3(1,1) + 1(2,0) - 3(1,0) - 1(0,1) = (2, 2)     b = -3
   scikit-learn SVC(kernel="linear", C=1e6): w = (2, 2), b = -3, dual coefficients [4, -2, -2] on {(1,1), (1,0), (0,1)}
   -- a different α (the dual is degenerate: four points on the margin lines, three suffice), the SAME w and b. The hyperplane is unique; the weights need not be.
   drop (2,2), a non-support vector, and refit: w = (2, 2), b = -3. Unchanged.`,
      caption: "Prediction is f(x) = Σᵢ αᵢ yᵢ (xᵢᵀx) + b, a sum over support vectors only. That is why an SVM is memory-light at inference (it stores the support vectors, not the data), why its cost at prediction is proportional to their number, and why a model with 595 support vectors out of 863 rows (the churn RBF fit below) is a warning sign: it is nearly a nearest-neighbour method with a kernel."
    },

    { t: "dl", items: [
      ["Support vector", "A training point with αᵢ > 0: on the margin plane (0 < αᵢ < C) or violating it (αᵢ = C). The only points the solution depends on."],
      ["Margin", "2/‖w‖, the distance between the planes wᵀx + b = ±1. Maximising it is structural risk minimisation: a wide margin is a low-capacity boundary."],
      ["Slack ξᵢ", "max(0, 1 − yᵢf(xᵢ)): how far a point intrudes past its margin. Its sum, priced by C, is the soft-margin penalty; it is also the hinge loss."],
      ["C", "Inverse regularisation, C ≈ 1/λ. Large C punishes violations (narrow margin, more support vectors on the margin, variance); small C tolerates them (wide margin, bias). Tune on a log grid."],
      ["Kernel K(x, z)", "A function equal to φ(x)ᵀφ(z) for some feature map φ. Replaces every dot product in the dual and in f(x); the map is never computed. Must be positive semi-definite (Mercer)."],
      ["γ (RBF)", "K = exp(−γ‖x − z‖²). Sets the reach of a point's influence: at γ = 0.01 a point 3 units away still has similarity 0.91; at γ = 10 a point 1 unit away has 0.00005. Large γ → islands around each point."],
      ["ε (SVR)", "Half-width of the tube inside which residuals cost nothing; only points outside it become support vectors (500 of 863 at ε = 5, 52 at ε = 20)."],
      ["Platt scaling", "A logistic regression fitted to the SVM's decision values by internal cross-validation; `probability=True`. Adds cost, and `predict()` can disagree with `predict_proba() ≥ 0.5`."]
    ]},

    { t: "h2", n: "02", text: "Soft margins, hinge loss and C", id: "soft" },

    { t: "code", lang: "python", title: "One overlapping point added at (0.4, 0.4) with label +1; C swept (executed)",
      hl: [2, 3, 4, 5],
      code: `#   C        w             margin 2/‖w‖    support vectors    Σ slack    train accuracy
#   0.1      (0.24, 0.04)     8.220               6              5.408        0.571      <- the margin is so cheap to widen that the model gives up on separating
#   1        (1.00, 0.40)     1.857               6              3.440        0.857
#   10       (2.00, 2.00)     0.707               4              2.400        0.857      <- the hard-margin solution, with the intruder simply paid for (ξ = 2.4)
#   1000     (2.00, 2.00)     0.707               4              2.400        0.857
# hinge loss at margin m = y f(x):   m = -1 -> 2    m = 0 -> 1    m = 0.5 -> 0.5    m = 1 -> 0    m = 2 -> 0        (log-loss at the same m: 1.31, 0.69, 0.47, 0.31, 0.13)`,
      caption: "C is the exchange rate between margin width and violations. At C = 10 the outlier's slack of 2.4 costs 24, less than the ‖w‖² the model would need to accommodate it, so it is ignored and the hard-margin hyperplane returns. At C = 0.1 every violation is nearly free and the widest possible margin wins even though it separates nothing. The hinge column is the loss the model is minimising: zero beyond the margin — which is why well-classified points vanish from the solution — and linear inside it, which is why one outlier moves the boundary by a bounded amount, unlike squared error."
    },

    { t: "callout", kind: "trap", title: "The cheapest solution on an imbalanced problem is to give up (executed on the churn data)", body: [
      { t: "p", text: "Linear SVM, standardised features, C = 1, no class weighting, 15.4 % positives: **w = (0, 0, 0, 0, 0), b = −1**. All 133 positives are violators with ξ = 2, 457 of 730 negatives sit inside the margin, and the model predicts 'no churn' for everyone. Its decision function is constant, so the cross-validated AUC of 0.629 is noise. The reason is arithmetic: separating 133 scattered positives would need a large ‖w‖, and at C = 1 the slack of abandoning them (133 × 2 = 266) is cheaper. With `class_weight=\"balanced\"` the minority's slack costs 5.5× more and the same model scores **AUC 0.757 — identical to logistic regression** at every C from 0.001 to 10. Logistic regression never has this failure because its log-loss keeps pulling on every point; the hinge stops pulling once a point is written off. **On imbalanced data an SVM without class weights is a majority-class predictor until proven otherwise.**" }
    ]},

    { t: "h2", n: "03", text: "The kernel trick", id: "kernel" },

    { t: "code", lang: "text", title: "A dot product in a space you never visit (executed)",
      code: `XOR: y = +1 when x₁x₂ > 0, 400 points in [-1, 1]²             linear SVM: 55.5 % (chance)

explicit map to degree 2:   φ(x) = [x₁², √2 x₁x₂, x₂²]          <- x₁x₂ is now a COORDINATE, so a plane in φ-space separates XOR
the dot product in φ-space:  φ(x)ᵀφ(z) = x₁²z₁² + 2 x₁x₂z₁z₂ + x₂²z₂² = (x₁z₁ + x₂z₂)² = (xᵀz)²
check on x = (1, 2), z = (3, 4):   (xᵀz)² = 11² = 121        φ(x)ᵀφ(z) = 1·9 + (√2·2)(√2·12) + 4·16 = 9 + 48 + 64 = 121

so K(x, z) = (xᵀz)² IS the degree-2 feature map, evaluated without building it. Substituting K for every xᵢᵀxⱼ in the dual and in f(x):
   SVC(kernel="poly", degree=2, coef0=1):  96.3 %          SVC(kernel="rbf", gamma=1):  96.5 %

kernel            K(x, z)                       implicit feature space                        use
linear            xᵀz                           the inputs                                    high-dimensional, sparse (text); n ≫ p
polynomial        (γ xᵀz + r)ᵈ                  all monomials up to degree d                  known low-order interactions
RBF (Gaussian)    exp(-γ ‖x - z‖²)              infinite-dimensional; a bump on every point    the default non-linear kernel
sigmoid           tanh(γ xᵀz + r)               not always a valid kernel                     historical

Mercer: K must be symmetric positive semi-definite for a φ to exist -- then the dual is convex and the solution is global.`,
      caption: "The polynomial map from 4.4 needed C(p + d, d) columns; the kernel needs one multiplication. For the RBF kernel the feature space is infinite-dimensional and the model is a weighted sum of Gaussian bumps centred on the support vectors: f(x) = Σᵢ αᵢyᵢ exp(−γ‖xᵢ − x‖²) + b. γ sets the width of the bumps and C how many of them the model is allowed to use."
    },

    { t: "code", lang: "python", title: "Two moons (400 points, noise 0.3): kernels, then the C × γ grid (executed, 5-fold accuracy / support vectors)",
      hl: [3, 4, 11, 12, 13, 14, 15],
      code: `# logistic 0.853   linear SVC 0.853   poly d=2 0.470   poly d=3 0.860   rbf (defaults) 0.895
# (a degree-2 kernel cannot bend twice; the moons need an odd degree or an RBF)

#                 C = 0.01       C = 0.1        C = 1          C = 10         C = 100          (accuracy / number of support vectors)
#   γ = 0.01      0.833 / 400    0.850 / 374    0.852 / 201    0.850 / 151    0.853 / 142     <- nearly linear at any C
#   γ = 0.1       0.850 / 400    0.855 / 217    0.860 / 152    0.885 / 131    0.895 / 112
#   γ = 1         0.878 / 400    0.887 / 200    0.903 / 116    0.882 / 106    0.885 / 101     <- the sweet spot
#   γ = 10        0.897 / 400    0.893 / 378    0.883 / 221    0.882 / 179    0.847 / 144
#   γ = 100       0.815 / 400    0.815 / 400    0.845 / 376    0.815 / 361    0.820 / 359     <- islands around every point: memorised
# GridSearchCV over a 9 × 9 log grid: C = 0.1, γ = 3.16, accuracy 0.903
# RBF similarity at distance 1 / 3:   γ=0.01: 0.99 / 0.91     γ=0.1: 0.90 / 0.41     γ=1: 0.37 / 0.0001     γ=10: 0.00005 / 0`,
      caption: "The grid has a ridge, not a peak: raising γ makes each bump narrower (more local, more capacity), raising C lets the model use more of that capacity, and many (C, γ) pairs along the ridge give the same accuracy. Off the ridge the support-vector count tells the story — 400 of 400 means every point is needed and nothing has been learned; at γ = 100 the model is a lookup table. Always search both on a log scale, together, and read the support-vector count alongside the score."
    },

    { t: "h2", n: "04", text: "Probabilities, scale, regression and the honest comparison", id: "practice-matters" },

    { t: "code", lang: "python", title: "An SVM has no probabilities; two ways to add them (executed, churn, 30 % holdout)",
      code: `# RBF SVC (C=1, γ=0.1), tuned-ish, 5-fold AUC of the decision function 0.698; balanced and tuned on a grid: 0.763 with 595 support vectors of 863
SVC(probability=True)          # Platt scaling: an internal 5-fold CV fits a sigmoid to the decision values -- 5× the training cost
#   Platt:     AUC 0.7024   log-loss 0.3940   Brier 0.1187        predict() and predict_proba() >= 0.5 disagree on 5 of 259 rows
CalibratedClassifierCV(SVC(), method="isotonic", cv=5)
#   isotonic:  AUC 0.7421   log-loss 0.3738   Brier 0.1115        <- better on every score, and honest about being a post-hoc mapping`,
      caption: "The decision function is a signed distance to the boundary in kernel units; it ranks, it does not estimate probability. Platt scaling fits a logistic curve to it and can disagree with the raw sign because it is fitted on different folds; isotonic calibration (2.5) is the more flexible mapping. If probabilities are the product, the SVM is the wrong starting point — a logistic model gave 0.757 AUC and 0.372 log-loss without any of this."
    },

    { t: "code", lang: "python", title: "Cost in n: fit time on 20 standardised features (executed)",
      hl: [3, 4],
      code: `#   n         SVC rbf      SVC linear     LinearSVC     SGD hinge
#   1,000        18 ms         38 ms          3 ms         10 ms
#   5,000       278 ms      1,013 ms          6 ms         35 ms
#  20,000     3,576 ms     22,282 ms         35 ms        117 ms       <- kernel SVC is O(n²) to O(n³); LinearSVC is ~linear and 600× faster
# rule: kernel SVC up to ~10⁴ rows; LinearSVC / SGDClassifier(loss="hinge") beyond; Nyström or random Fourier features to approximate an RBF at scale`,
      caption: "The dual is a quadratic programme over n variables and the kernel matrix is n × n; SMO (the solver inside libsvm) avoids storing it but not the n² work. `SVC(kernel=\"linear\")` is the worst of both worlds — a kernel solver on a problem that has a primal. For linear problems use `LinearSVC` or SGD, which solve the primal in time linear in n; for non-linear problems at scale, approximate the kernel with explicit random features and go linear."
    },

    { t: "code", lang: "python", title: "SVR on spend: the ε-tube, C and γ (executed, 863 rows, 5-fold MAE)",
      hl: [2, 4, 5, 6],
      code: `# linear regression                          MAE 20.94
# SVR defaults (C=1, ε=0.1, rbf)             MAE 21.70     <- C=1 on a target with sd ~60: the model is barely allowed to move
# SVR C=100, ε=1                             MAE  8.48
# SVR C=1000, ε=5                            MAE  7.37
# SVR C=1000, ε=5, γ=1                       MAE  7.17     <- near KNN's 8.8 and the engineered feature's 6.34
# support vectors: ε=5 -> 500 of 863 (every point outside the tube);  ε=20 -> 52
# ε-insensitive loss at ε=1:  |r| = 0.5 -> 0    1 -> 0    2 -> 1    5 -> 4`,
      caption: "SVR fits the flattest function that keeps the data inside a tube of half-width ε, paying C per unit of excursion beyond it. Points inside the tube cost nothing and are not support vectors; ε therefore controls both accuracy and sparsity, and C must be scaled to the target's units — the defaults were built for standardised targets and give a useless fit on spend in pounds. Standardise y too, or set C from the target's range."
    },

    { t: "table",
      head: ["", "SVM (hinge)", "Logistic regression (log-loss)"],
      rows: [
        ["Loss", "max(0, 1 − yf): zero beyond the margin", "ln(1 + e^{−yf}): never zero"],
        ["Solution depends on", "Support vectors only (sparse in the data)", "Every row"],
        ["Probabilities", "None; Platt or isotonic post hoc", "Native, usually calibrated"],
        ["Non-linearity", "Kernels: cheap and principled", "Explicit features or splines (4.4)"],
        ["Imbalance", "Can collapse to the majority class (w = 0 at C = 1); needs class_weight", "Degrades gracefully; threshold moves"],
        ["Scale in n", "O(n²–n³) kernel; linear primal solvers exist", "Linear; SGD for huge n"],
        ["Outliers", "Bounded influence (hinge is linear)", "Bounded influence (log-loss is linear in the tail)"],
        ["High-dimensional sparse", "Linear kernel is strong (text)", "Equally strong; faster"],
        ["When it shines", "Small-to-medium n, non-linear boundary, p ≫ n with a clear margin", "Probabilities, interpretability, large n, imbalance"]
      ]
    },

    { t: "callout", kind: "production", title: "Multi-class, one-class, and what to check before shipping an SVM", body: [
      { t: "p", text: "`SVC` is binary; for K classes it trains K(K − 1)/2 one-versus-one models and votes (`decision_function_shape=\"ovr\"` only reshapes the output); `LinearSVC` trains K one-versus-rest models. One-class SVM fits a boundary around the data with no labels at all — 9.5 uses it for anomaly detection. Before shipping: features standardised in the pipeline (RBF distances and margins are in feature units — unscaled churn scored 0.654 and the scaled default 0.635 only because both were the broken C = 1 fit); C and γ from a joint log grid; the support-vector count reported (near n means nothing was learned); class weights on imbalanced targets; probabilities calibrated if shown; and the prediction cost budgeted, because each query evaluates the kernel against every support vector." }
    ]},

    { t: "ladder",
      title: "Classifying 8,000 handwritten symbols (64 pixel features) for a form reader",
      rungs: [
        { level: "bad", label: "RBF SVC on raw pixels, defaults", code: `SVC().fit(pixels, label)`,
          note: "**Unscaled 0–255 pixels make γ = 'scale' meaningless, the defaults are untuned, and a 30-class one-versus-one model is 435 binary SVMs** — the accuracy might still be decent, which is how this ships." },
        { level: "ok", label: "Scaled, C and γ on a log grid", code: `GridSearchCV(make_pipeline(StandardScaler(), SVC()), {"svc__C": np.logspace(-1, 3, 9), "svc__gamma": np.logspace(-4, 0, 9)}, cv=5)`,
          note: "**The right model for this size and shape** (n = 8,000, p = 64, curved class boundaries): kernel SVMs were the state of the art on exactly this problem for a decade. The grid is 81 × 5 fits of a 435-model ensemble — budget an hour." },
        { level: "best", label: "PCA to 30 components first, the grid, calibration, and a support-vector budget", code: `pipe = make_pipeline(StandardScaler(), PCA(30, whiten=True), SVC(class_weight="balanced"))
# grid on C, gamma; then CalibratedClassifierCV(best, cv=5) so the reader can route low-confidence symbols to a human
# report n_support_ per class; if it approaches n, the kernel is memorising and gamma is too large`,
          note: "**Faster (kernel on 30 dims, fewer support vectors), calibrated for the human-in-the-loop threshold, and self-auditing** through the support-vector count." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A margin by hand, a kernel identity, and a collapse you must reproduce and fix",
      difficulty: "advanced",
      minutes: 36,
      body: [
        { t: "p", text: "**(a)** For the six points, verify by hand that w = (2, 2), b = −3 satisfies y(wᵀx + b) ≥ 1 for all six with equality on exactly four; compute the margin; then show that w = (1, 1), b = −1.5 gives the same boundary with a wider *apparent* margin and explain why it is not the solution. **(b)** Prove that K(x, z) = (xᵀz + 1)² corresponds to the feature map φ(x) = [1, √2x₁, √2x₂, x₁², √2x₁x₂, x₂²] by expanding both sides, and check it numerically on x = (1, 2), z = (3, 4). **(c)** Reproduce the churn collapse: fit a linear SVC at C = 1 without class weights, report w, b, the number of positives with margin < 1, and the AUC; then fix it two ways (class_weight, and a C small enough to matter) and report the AUC of each against logistic regression." }
      ],
      requirements: [
        "(a) the six margins, the width, and the scaling argument.",
        "(b) the expansion and the numerical check.",
        "(c) the collapsed fit's numbers and two repaired AUCs."
      ],
      hint: "(a) The constraint y(wᵀx + b) ≥ 1 fixes the scale of w: halving w halves every margin below 1. (b) (xᵀz + 1)² = (xᵀz)² + 2xᵀz + 1. (c) `class_weight=\"balanced\"` weights class k by n/(K·nₖ).",
      solution: {
        lang: "python",
        title: "svm_practice.py (executed where marked)",
        code: `# (a) w = (2, 2), b = -3:  f(x) = 2x₁ + 2x₂ - 3
#   (1,1): +1·(1) = 1   (2,2): +1·(5) = 5   (2,0): +1·(1) = 1   (0,0): -1·(-3) = 3   (1,0): -1·(-1) = 1   (0,1): -1·(-1) = 1
#   four at exactly 1 -> support vectors; margin 2/‖w‖ = 2/2.828 = 0.707
#   w = (1, 1), b = -1.5 is the SAME line (x₁ + x₂ = 1.5) and 2/‖w‖ = 1.414 looks wider -- but the constraints fail: (1,1) gives 0.5 < 1.
#   the margin formula 2/‖w‖ is only the geometric width when the closest points sit at y f = 1; that normalisation is what makes min ‖w‖ meaningful.

# (b) (xᵀz + 1)² = (x₁z₁ + x₂z₂)² + 2(x₁z₁ + x₂z₂) + 1 = x₁²z₁² + 2x₁x₂z₁z₂ + x₂²z₂² + 2x₁z₁ + 2x₂z₂ + 1
#   φ(x)ᵀφ(z) = 1·1 + (√2x₁)(√2z₁) + (√2x₂)(√2z₂) + x₁²z₁² + (√2x₁x₂)(√2z₁z₂) + x₂²z₂²  -- the same six terms.
#   x = (1,2), z = (3,4):  (11 + 1)² = 144;   φ(x) = [1, 1.414, 2.828, 1, 2.828, 4], φ(z) = [1, 4.243, 5.657, 9, 16.97, 16]
#   dot = 1 + 6 + 16 + 9 + 48 + 64 = 144.  The constant term is what coef0 = 1 adds: the degree-1 monomials, so the map contains the linear model.

# (c) executed (churn, standardised, 5-fold):
#   linear SVC, C=1, no weights:   w = (0, 0, 0, 0, 0), b = -1;  133 of 133 positives have margin < 1 (ξ = 2 each);  AUC 0.629 (a constant score + noise)
#   fix 1, class_weight="balanced":  AUC 0.757 at C = 1 (0.755-0.758 for every C from 0.001 to 10)     logistic regression: 0.757
#   fix 2, C alone: C = 0.01 -> 0.702, C = 10 -> 0.688 -- moving C without weights never reaches the weighted result, because the
#   problem is the RELATIVE price of minority slack, not the absolute one. Weighting fixes the ratio; C scales both sides.`,
        notes: [
          { t: "p", text: "**(a)** is the normalisation that most explanations skip: 'maximise 2/‖w‖' only means something once the nearest points are pinned to margin 1." },
          { t: "p", text: "**(b)** is the kernel trick made concrete — six explicit features, one squared dot product, identical numbers. Every kernel has such a φ; RBF's is infinite." },
          { t: "p", text: "**(c)** is the most useful thing to know about SVMs in practice: on an imbalanced target the hinge loss can price the minority class out of the solution entirely, silently, and the fix is class weighting, not C." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The linear SVM on the churn data returned w = 0, b = −1 at C = 1. What happened?",
          options: [
            "The solver failed to converge",
            "With 15 % positives, the slack from abandoning all 133 of them (ξ = 2 each, cost 266) was cheaper than the ‖w‖² a separating hyperplane would need, so the optimum is a constant classifier predicting the majority class. The hinge loss stops pulling on points it has written off; log-loss never does. class_weight='balanced' re-prices the minority slack and the same model matches logistic regression at AUC 0.757",
            "The features were not scaled",
            "γ was too large"
          ],
          answer: 1,
          why: "A decision function that is constant has an AUC of 0.5 plus noise; 0.629 was noise."
        }
      ]
    }
  ],

  takeaways: [
    "**Maximise the margin 2/‖w‖ subject to y(wᵀx + b) ≥ 1**; the solution is determined by the support vectors alone — deleting (2, 2) changed nothing.",
    "**Soft margin: ½‖w‖² + CΣξ**, equivalently L2-regularised hinge loss; C is the exchange rate between margin and violations (C = 0.1: margin 8.2, accuracy 0.571; C = 10: the hard-margin plane with the outlier paid for).",
    "**The dual has the data only as dot products, and αᵢ > 0 only for support vectors**; w and b are unique even when α is not.",
    "**Kernel trick**: K(x, z) = φ(x)ᵀφ(z) without computing φ — (xᵀz)² = 121 = φ(x)ᵀφ(z); XOR 55.5 % → 96.3 %.",
    "**RBF γ is the reach of a point** (similarity at distance 3: 0.91 at γ = 0.01, 0.0001 at γ = 1); tune C and γ jointly on a log grid and read the support-vector count (400 of 400 = nothing learned).",
    "**Imbalance can collapse the hinge loss to w = 0**: churn at C = 1 predicted nobody churns; class_weight restored AUC 0.757 = logistic regression.",
    "**No native probabilities**: Platt (log-loss 0.394) or isotonic (0.374), at extra cost; predict() can disagree with predict_proba().",
    "**Kernel SVC is O(n²–n³)**: 3.6 s at n = 20,000 against 35 ms for LinearSVC; use primal solvers or kernel approximations at scale.",
    "**SVR**: an ε-tube with C per unit outside it; C must match the target's scale (defaults gave MAE 21.7, tuned 7.2); ε controls sparsity (500 → 52 support vectors).",
    "**Scale features, always; weight classes; calibrate if shown; budget prediction by support-vector count** — and prefer logistic regression when probabilities or n are large."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is a support vector, and why does the model depend only on them?",
        options: [
          "Any misclassified point",
          "A training point with a non-zero dual weight αᵢ: one on a margin plane (y f = 1) or violating it. By the KKT conditions every point strictly beyond its margin has αᵢ = 0 and contributes nothing to w = Σαᵢyᵢxᵢ, so removing it leaves the hyperplane unchanged — on the six points, deleting (2, 2) left w = (2, 2), b = −3",
          "The points with the largest margin",
          "The class centroids"
        ],
        answer: 1,
        why: "This sparsity is why inference cost scales with support vectors, not rows, and why a support-vector count near n signals memorisation."
      },
      {
        stem: "Explain the kernel trick to someone who knows polynomial features.",
        options: [
          "It is polynomial features with a different name",
          "Polynomial features build the columns φ(x) explicitly (C(p + d, d) of them) and take dot products; the dual only ever needs those dot products, and for many maps φ(x)ᵀφ(z) is a simple closed form in x and z — (xᵀz)² for the degree-2 map — so the model works in the expanded space without constructing it. For RBF the space is infinite-dimensional and the closed form is exp(−γ‖x − z‖²)",
          "It approximates a neural network",
          "It reduces the dimension of the data"
        ],
        answer: 1,
        why: "The numerical check: (1·3 + 2·4)² = 121 and [1, 2√2, 4]·[9, 12√2, 16] = 121."
      },
      {
        stem: "How do C and γ interact in an RBF SVM, and how do you tune them?",
        options: [
          "C controls non-linearity, γ controls regularisation",
          "γ sets each support vector's reach (how local the bumps are — capacity); C sets how many violations the model pays to avoid (how much of that capacity it uses). They trade off along a ridge — many (C, γ) pairs score alike — so search both jointly on a log grid by CV and watch the support-vector count: 400 of 400 at low C or 359 at γ = 100 means memorisation",
          "Tune C first, then γ",
          "γ should always be 1/p"
        ],
        answer: 1,
        why: "The grid's best cell was C = 0.1, γ = 3.16 at 0.903; C = 1, γ = 1 scored the same with 116 support vectors."
      },
      {
        stem: "When would you choose an SVM over logistic regression, and when the reverse?",
        options: [
          "SVM always; it maximises the margin",
          "SVM for small-to-medium n with a non-linear boundary (kernels are cheap and principled), for p ≫ n with a clear margin, and where sparse inference matters; logistic regression when you need probabilities, coefficients, large n (linear time), or robustness to imbalance without extra care — on the churn data both linear models reached 0.757 once the SVM was class-weighted, and logistic got there without needing to be",
          "Logistic regression only for text",
          "SVM only for regression"
        ],
        answer: 1,
        why: "Same linear boundary, different loss: the hinge ignores well-classified points and can abandon a class; the log-loss never stops pulling."
      },
      {
        stem: "SVR with default settings gave MAE 21.7 on spend, worse than linear regression; tuned, 7.2. What was wrong with the defaults?",
        options: [
          "The kernel was wrong",
          "C = 1 and ε = 0.1 are sized for a standardised target; spend has a standard deviation near 60, so the model was allowed almost no excursion from a flat function and the tube was negligible. Scaling C to the target (100–1,000) and ε to a meaningful tolerance (5) gave a non-linear fit near KNN's; standardising y first would have made the defaults sensible",
          "The features were not scaled",
          "SVR cannot model interactions"
        ],
        answer: 1,
        why: "ε also controls sparsity — 500 support vectors at ε = 5, 52 at ε = 20 — so it is a cost dial as much as an accuracy one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Derive the SVM optimisation problem and explain what the support vectors are.",
        strong: "For a linear classifier sign(wᵀx + b), scale w and b so the closest points of each class satisfy y(wᵀx + b) = 1; the margin planes are then wᵀx + b = ±1 and the distance between them is 2/‖w‖, so maximising the margin is minimising ½‖w‖² subject to y(wᵀx + b) ≥ 1 for every point. For overlapping data add slack ξᵢ ≥ 0 to each constraint and a penalty CΣξᵢ, which is the soft margin, and is identical to minimising the hinge loss max(0, 1 − yf(x)) plus an L2 penalty. Forming the Lagrangian and eliminating w and b gives the dual: maximise Σαᵢ − ½ΣΣαᵢαⱼyᵢyⱼ xᵢᵀxⱼ with 0 ≤ αᵢ ≤ C and Σαᵢyᵢ = 0, and w = Σαᵢyᵢxᵢ. The KKT conditions make αᵢ non-zero only where the constraint is active — points on or inside the margin — and those are the support vectors: on six points I solved the dual and found four with positive α, w = (2, 2), b = −3, margin 0.707, and deleting one of the other two left the solution unchanged. Prediction is a sum over support vectors only, which is why the model is sparse in the data and why the dual matters for kernels.",
        answer: [
          { t: "p", text: "Margin normalisation, primal, soft margin and hinge, dual, KKT sparsity, and the worked six-point solution." }
        ]
      },
      {
        level: "core",
        q: "What does the kernel trick do and how do you pick a kernel?",
        strong: "In the dual and in the prediction function the data appear only through dot products xᵢᵀxⱼ. If I want a non-linear boundary I could map x to features φ(x) and take dot products there, but for many maps the dot product has a closed form in the original x — for the degree-2 map φ(x) = [x₁², √2x₁x₂, x₂²] it is simply (xᵀz)², which I can check: for (1, 2) and (3, 4) both give 121. So I replace every dot product with a kernel K(x, z) = φ(x)ᵀφ(z) and get the non-linear model at the cost of one function evaluation per pair, never constructing φ. XOR went from chance to 96 % that way. Any symmetric positive semi-definite function is a valid kernel by Mercer's theorem and keeps the problem convex. I choose linear for high-dimensional sparse data like text, where the inputs are already separable and n is large; polynomial when I know the interactions are low-order; and RBF, exp(−γ‖x − z‖²), as the default for non-linear problems, where γ sets how local each support vector's influence is and must be tuned jointly with C on a log grid — on two moons the best cell scored 0.903 with 116 support vectors, and γ = 100 memorised the data with 359.",
        answer: [
          { t: "p", text: "Why the dual permits it, the explicit identity with the check, Mercer, and a kernel choice rule with executed numbers." }
        ]
      },
      {
        level: "advanced",
        q: "An SVM trained on a 15 %-positive churn dataset reports 85 % accuracy and the product team is pleased. What do you check?",
        strong: "Whether it predicts anyone positive at all. Eighty-five per cent is the majority-class rate, and a linear SVM at C = 1 on this exact data returns w = 0 and b = −1 — every positive is written off as a violator with slack 2, because that costs less than the ‖w‖² a separating boundary would need, and the hinge loss stops pulling on points it has abandoned. I would look at the confusion matrix and the decision-function spread; if the function is constant the AUC is noise. The fix is class weighting — with class_weight='balanced' the minority's slack is priced 5.5× higher, the same model scores AUC 0.757, the same as logistic regression, and it does so at every C, while changing C alone never gets there because C scales both sides of the trade. Then I would ask what the product actually needs: if it is a ranked list or a probability, the SVM's decision function needs calibration and logistic regression gives that natively; if it is a non-linear boundary on a few thousand rows, an RBF SVM with class weights and a tuned C, γ is a reasonable choice, and I would report the support-vector count and pick the threshold from the cost of a missed churner rather than from the sign of the decision function.",
        answer: [
          { t: "p", text: "The collapse diagnosed from the accuracy alone, the mechanism, the executed fix, and the product-driven model choice." }
        ]
      }
    ]
  }
});

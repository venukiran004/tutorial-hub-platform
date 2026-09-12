/* ============================================================================
   LESSON 1.8 — Optimisation and Loss Functions
   ========================================================================= */
EC.receiveLesson({
  id: "1.8",

  lede: "**Training is a search for the parameters that minimise a loss, and almost every search is some form of gradient descent: step downhill, repeat.** Whether it converges, how fast, and to what depends on three things you control — the learning rate, how much data each step sees, and the shape of the loss — and one you do not: the curvature of the problem. This lesson runs gradient descent on five points with three learning rates and watches one converge, one crawl and one explode; compares batch, mini-batch and stochastic steps on the same problem; shows momentum and Adam finishing in 171 steps a valley that plain descent cannot finish in 400; and then works every common loss on the same five residuals, so the choice between squared error, absolute error, Huber and cross-entropy becomes a choice you can defend.",

  objectives: [
    "Run gradient descent by hand, read the learning-rate stability limit 2/λ_max off the Hessian, and diagnose divergence, crawling and oscillation",
    "Compare batch, mini-batch and stochastic gradient descent by updates per epoch, noise and cost",
    "Explain momentum, RMSProp and Adam as fixes for ill-conditioning, and know when each stalls",
    "Compute MSE, MAE, Huber, quantile, cross-entropy and hinge on concrete values, read their gradients, and separate the training loss from the reported metric"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Gradient descent on five points", id: "gd" },

    { t: "p", text: "The model y = w·x + b, the loss L = (1/n)Σ(w·xᵢ + b − tᵢ)², and the update **θ ← θ − η ∇L(θ)**. The gradient points uphill; step against it by η. For this loss the gradient is (2/n)Xᵀ(Xθ − t) and the curvature — the Hessian — is (2/n)XᵀX, a constant matrix whose eigenvalues decide everything about the step size." },

    { t: "code", lang: "python", title: "Three learning rates, one problem (executed)",
      hl: [3, 4, 8, 9, 10, 11],
      code: `x = np.array([1, 2, 3, 4, 5.]); t = np.array([2.1, 3.9, 6.2, 7.8, 10.1]); X = np.c_[x, np.ones(5)]
H = 2 * X.T @ X / 5
np.linalg.eigvalsh(H)                      # [0.338, 23.66]   -> condition number 70; the stability limit is 2 / 23.66 = 0.0845
np.linalg.lstsq(X, t)[0]                   # closed form: w = 1.99, b = 0.05

for lr in [0.02, 0.1, 0.18]:
    theta = np.zeros(2)
    for it in range(200): theta -= lr * 2 * X.T @ (X @ theta - t) / 5
# lr = 0.02   it1 w=0.88 b=0.24 mse 12.3 | it3 w=1.59 b=0.43 mse 1.00 | it10 w=1.87 b=0.48 mse 0.056 | it200 w=1.96 b=0.17 mse 0.024
#             converges -- but after 200 steps b is still 0.17 against the true 0.05: it crawls along the flat direction (eigenvalue 0.34)
# lr = 0.10   it1 mse 82 | it2 mse 154 | it3 mse 287 | it10 mse 22,640 | ... diverged        <- above 0.0845: each step overshoots further
# lr = 0.18   it1 mse 469 | it2 mse 4,978 | it3 mse 52,877 | diverged`,
      caption: "Every gradient-descent pathology is in this table. Below 2/λ_max it converges; above, it diverges — not slowly, but by a factor per step. And even a stable rate crawls along directions of small curvature: the step that is safe for the steep direction (λ = 23.7) is tiny for the flat one (λ = 0.34). That ratio, the condition number, is what feature scaling fixes and what momentum and Adam are built to survive."
    },

    { t: "dl", items: [
      ["Gradient", "The vector of partial derivatives of the loss; points in the direction of steepest increase. Its negative is the descent direction."],
      ["Learning rate η", "The step size. Too small: slow; too large: divergence. For a quadratic, stable iff η < 2/λ_max of the Hessian."],
      ["Hessian / curvature", "The matrix of second derivatives. Its largest eigenvalue caps the learning rate; the ratio of largest to smallest (condition number) sets how much the descent zigzags."],
      ["Convex", "A loss with one basin: every local minimum is global. Least squares, logistic regression, SVMs are convex; trees and networks are not."],
      ["Saddle point", "Zero gradient, but curving up in some directions and down in others. In high dimensions far more common than local minima; plain gradient descent slows near them."],
      ["Epoch", "One pass over the training data. Batch GD makes one update per epoch; SGD makes n."],
      ["Schedule", "A rule for changing η over training: step decay, cosine, warm-up then decay, reduce-on-plateau. Large steps early, small steps late."]
    ]},

    { t: "h2", n: "02", text: "Batch, mini-batch, stochastic", id: "flavours" },

    { t: "code", lang: "python", title: "The same logistic regression, three ways to compute the gradient (executed, 2,000 rows × 10 features, 5 epochs)",
      hl: [3, 4, 5],
      code: `# gradient over the full batch, over 32 rows, or over 1 row, then step
#                  updates in 5 epochs    loss after each epoch                              wall time
# batch                      5           0.625  0.573  0.533  0.500  0.474                      2 ms      <- five careful steps
# mini-batch 32            315           0.371  0.308  0.280  0.264  0.254                      6 ms      <- the working default
# SGD, one row          10,000           0.278  0.245  0.233  0.226  0.223                    164 ms      <- lowest loss, 80x the time, noisy steps`,
      caption: "Per epoch of data, more updates means more progress: SGD is furthest after five epochs. But each single-row gradient is a noisy estimate of the true one, so SGD's path jitters and cannot settle without a decaying learning rate, and per-row updates cannot use vectorised hardware. Mini-batches of 32–512 get most of the update count with most of the hardware efficiency, and their noise is a mild regulariser. Batch GD is exact and slow and, for non-convex losses, more likely to sit in a poor basin."
    },

    { t: "table",
      head: ["", "Batch", "Mini-batch", "Stochastic"],
      rows: [
        ["Gradient", "Exact", "Noisy estimate from b rows", "Noisy estimate from 1 row"],
        ["Updates per epoch", "1", "n / b", "n"],
        ["Hardware", "Fully vectorised, but memory-bound for large n", "Vectorised; the sweet spot", "No vectorisation"],
        ["Convergence", "Smooth, to the exact minimum of the batch loss", "Approaches the minimum; noise ∝ 1/b", "Oscillates near the minimum unless η decays"],
        ["Escapes saddles / poor basins", "Poorly", "Yes, through noise", "Yes"],
        ["Use", "Small data; convex problems with a closed form nearby", "Almost everything", "Online learning, streaming (11.3)"]
      ]
    },

    { t: "h2", n: "03", text: "Momentum, RMSProp, Adam", id: "adaptive" },

    { t: "code", lang: "python", title: "An ill-conditioned valley, f(w) = ½(w₁² + 100 w₂²), from (5, 1) (executed)",
      hl: [6, 7, 8, 9, 13, 14, 15, 16],
      code: `# eigenvalues 1 and 100: the largest stable step is 0.02, which crawls along w1 (curvature 1)
def gf(w): return np.array([w[0], 100 * w[1]])
def gd(w):        return w - 0.019 * gf(w)
def momentum(w):  v[:] = 0.9 * v + gf(w);            return w - 0.019 * v                      # accumulate a velocity
def rmsprop(w):   s[:] = 0.9 * s + 0.1 * gf(w)**2;   return w - 0.05 * gf(w) / (np.sqrt(s) + 1e-8)   # divide each coordinate by its recent gradient scale
def adam(w, k):   m[:] = 0.9*m + 0.1*g; v[:] = 0.999*v + 0.001*g*g                             # momentum on the gradient and on its square,
                  mh, vh = m / (1 - 0.9**k), v / (1 - 0.999**k); return w - 0.1 * mh / (np.sqrt(vh) + 1e-8)   # with bias correction for the early steps

#                      steps to f < 1e-6     f after 400 steps
# plain GD, 0.019          never                2.7e-06          <- still creeping along w1 after 400 steps
# momentum 0.9             171                  2.6e-17
# RMSProp, step 0.05       never                3.2e-02          <- oscillates at the scale of its fixed step; needs a decaying rate
# Adam, step 0.1           175                  3.0e-17`,
      caption: "Momentum builds speed along the direction that keeps pointing the same way (w₁) and cancels the zigzag along the one that flips sign (w₂); on a quadratic it turns O(κ) iterations into O(√κ). RMSProp rescales each coordinate by its own gradient magnitude, which equalises the two directions — but a fixed step then bounces, which is why RMSProp is usually run with decay. Adam combines both and corrects the bias of the running averages in the first steps; it is the default for networks because it tolerates unscaled, badly conditioned problems. For a convex problem with scaled features, plain GD or a second-order method (L-BFGS, which scikit-learn's logistic regression uses) is faster and has no knobs."
    },

    { t: "table",
      head: ["Symptom", "Cause", "Fix"],
      rows: [
        ["Loss explodes to NaN in a few steps", "η above 2/λ_max; or an unscaled feature giving a huge eigenvalue", "Lower η; scale features; gradient clipping"],
        ["Loss falls fast then creeps for thousands of steps", "Ill-conditioning: small-curvature directions", "Scale features; momentum or Adam; second-order method"],
        ["Loss oscillates without settling", "Step too large for the final approach, or SGD noise", "Decay η (step, cosine, reduce-on-plateau); larger batches late"],
        ["Loss flat from the start", "η far too small; vanishing gradients (saturated sigmoid); dead ReLUs; a bug in the gradient", "Raise η; check the gradient numerically; change activation"],
        ["Different runs reach different losses", "Non-convex loss; initialisation and data order matter", "Several seeds; report the spread; use the validation metric to choose"],
        ["Training loss fine, validation rising", "Not an optimisation problem — overfitting (1.4)", "Early stopping, regularisation"]
      ]
    },

    { t: "dl", items: [
      ["Momentum", "v ← βv + ∇L; θ ← θ − ηv. Accumulates consistent gradient directions, damps oscillating ones. Nesterov evaluates the gradient after the momentum step."],
      ["RMSProp / AdaGrad", "Per-coordinate step sizes from a running (or cumulative) average of squared gradients. AdaGrad's cumulative sum shrinks the step forever; RMSProp's decay does not."],
      ["Adam / AdamW", "Momentum on the gradient and on its square, bias-corrected. AdamW applies weight decay directly to the parameters instead of through the gradient, which is the correct L2 for adaptive methods."],
      ["Second-order (Newton, L-BFGS)", "Use curvature to choose the step: θ ← θ − H⁻¹∇L. Quadratic convergence near the minimum; Newton needs the full Hessian (d² memory), L-BFGS approximates it from recent gradients. scikit-learn's default for logistic regression."],
      ["Line search", "Choose η each step by trying values along the descent direction until the loss decreases enough (Armijo condition). Used inside L-BFGS."],
      ["Coordinate descent", "Optimise one parameter at a time with the others fixed. Exact for lasso (soft-thresholding, 4.3); scikit-learn's Lasso and ElasticNet use it."],
      ["Subgradient / proximal gradient", "For non-smooth losses (L1, hinge): a subgradient is any slope between the one-sided derivatives; proximal methods take a gradient step on the smooth part and a closed-form step on the non-smooth part (ISTA for lasso)."],
      ["Polyak averaging", "Report the average of the iterates rather than the last one; for SGD it removes much of the final oscillation."]
    ]},

    { t: "h2", n: "04", text: "Loss functions, worked on the same five residuals", id: "losses" },

    { t: "code", lang: "python", title: "Regression losses on residuals [0.5, −1.0, 2.0, −0.3, 8.0] — one outlier (executed)",
      hl: [3, 4, 5, 6, 9, 10, 11],
      code: `r = np.array([0.5, -1.0, 2.0, -0.3, 8.0])                       # prediction - target, per row; the 8.0 is an outlier
#                     per-row loss                                   mean       gradient with respect to the prediction
# squared ½r²         0.125  0.500  2.000  0.045  32.000              6.934      -r        : [-0.5  1.0  -2.0  0.3  -8.0]   the outlier pulls 16x harder than the 0.5
# absolute |r|        0.500  1.000  2.000  0.300   8.000              2.360      -sign(r)  : [-1    1    -1    1    -1  ]   every row pulls with the same force
# Huber δ=1           0.125  0.500  1.500  0.045   7.500              1.934      -clip(r)  : [-0.5  1.0  -1.0  0.3  -1.0]   squared inside |r|<=1, linear outside
# quantile τ=0.9      0.450  0.100  1.800  0.030   7.200              1.916      -0.9 / +0.1: under-prediction costs nine times over-prediction

# squared error's optimum is the mean of the targets; absolute error's is the median; the τ-quantile loss's is the τ-quantile.
# with the outlier: the squared-loss fit chases it (the mean moves); the absolute-loss fit ignores it (the median does not).`,
      caption: "The gradient column is the whole story. Squared error's pull is proportional to the residual, so one row eight units off contributes 64 % of the total gradient; absolute error caps every row's pull at one unit; Huber is squared for small residuals (smooth at zero, so gradient descent settles) and absolute for large ones (bounded pull). Log-cosh is a smooth cousin of Huber. Quantile loss tilts the pull so the fit lands at a chosen quantile — the tool for prediction intervals (10.7)."
    },

    { t: "code", lang: "python", title: "Classification losses for a positive example at three predicted probabilities (executed)",
      hl: [3, 4, 5],
      code: `# y = 1; p is the predicted probability; the margin is y·f where f = logit(p)
#   p        cross-entropy -log p     hinge max(0, 1 - margin)     0-1 loss
#   0.9          0.105                     0.000  (margin +2.20)       0        <- confident and right: cross-entropy still charges a little; hinge charges nothing past margin 1
#   0.5          0.693                     1.000  (margin  0.00)       0        <- on the boundary: cross-entropy ln 2; hinge a full unit
#   0.1          2.303                     3.197  (margin -2.20)       1        <- confident and wrong: both grow without bound; 0-1 just says 'wrong'

# cross-entropy is the negative log-likelihood of a Bernoulli model -- the loss logistic regression derives from MLE (4.5);
# hinge is the SVM's loss (5.3): zero beyond the margin, so points far from the boundary do not influence it at all;
# 0-1 loss is what accuracy measures; it has zero gradient almost everywhere and cannot be descended.`,
      caption: "Cross-entropy and hinge are both convex surrogates for the 0–1 loss you actually care about, chosen because they have gradients. Cross-entropy is never satisfied — it keeps pushing correct predictions toward more confidence, which is why logistic regression on separable data needs regularisation to stop the weights growing forever. Hinge is satisfied once the margin exceeds one, which is why an SVM's solution depends only on the points near the boundary. Focal loss down-weights easy examples further, for extreme imbalance (8.2); label smoothing softens the target so cross-entropy has a finite optimum."
    },

    { t: "code", lang: "python", title: "Loss versus metric: the loss keeps improving while the metric stands still (executed)",
      code: `# logistic regression, regularisation loosened from C = 0.001 to C = 10; held-out 500 rows
#   C        log-loss (the training objective)    accuracy at 0.5 (the reported metric)
#   0.001        0.554                                  0.892
#   0.01         0.342                                  0.896
#   0.1          0.238                                  0.900
#   1            0.222                                  0.904
#   10           0.223                                  0.904
# accuracy moved 1.2 points while log-loss halved: the metric only sees which side of 0.5 each probability is on;
# the loss sees how far. Choose hyperparameters by the metric you will report (2.3), but train on a loss with gradients.`,
      caption: "The training loss must be differentiable and should be a proper score for what you want (2.2); the reported metric is whatever the business decision needs, and it usually has no gradient — accuracy, F1, recall at a threshold, NDCG. Confusing the two produces models tuned for the wrong thing in both directions: minimising accuracy directly is impossible, and reporting log-loss to a retention team is meaningless."
    },

    { t: "viz",
      title: "Four losses against the residual",
      caption: "Squared error grows fastest and pulls hardest on outliers; absolute error is linear and cornered at zero; Huber is squared inside ±δ and linear outside; the 0.9-quantile loss is asymmetric. The slope at each point is the gradient — the force each row exerts on the fit.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Four curves of loss against residual from minus four to plus four: a steep parabola for squared error, a V for absolute error, a parabola that becomes linear for Huber, and an asymmetric V for the 0.9 quantile loss.">
  <defs>
    <marker id="ac-ah-18" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="230" x2="840" y2="230" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-18)"/>
  <line x1="460" y1="230" x2="460" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-18)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="250">−4</text><text x="290" y="250">−2</text><text x="460" y="250">0</text><text x="630" y="250">+2</text><text x="800" y="250">+4</text>
    <text x="820" y="222">residual</text><text x="490" y="40">loss</text>
  </g>
  <!-- scale: 85 px per unit residual; 25 px per unit loss (capped) -->
  <path d="M290,30 Q375,230 460,230 Q545,230 630,30" fill="none" style="stroke:var(--crit)" stroke-width="2.2"/>
  <path d="M120,145 L460,230 L800,145" fill="none" style="stroke:var(--accent)" stroke-width="2.2"/>
  <path d="M120,142 L375,217 Q460,240 545,217 L800,142" fill="none" style="stroke:var(--good)" stroke-width="2.2"/>
  <path d="M120,221 L460,230 L800,153" fill="none" style="stroke:var(--warn)" stroke-width="2.2" stroke-dasharray="6 3"/>
  <g class="s-label" style="font-weight:600">
    <text x="300" y="60" style="fill:var(--crit)">squared ½r²</text>
    <text x="700" y="135" style="fill:var(--accent)">absolute |r|</text>
    <text x="700" y="112" style="fill:var(--good)">Huber δ=1</text>
    <text x="120" y="210" style="fill:var(--warn)">quantile τ=0.9</text>
  </g>
</svg>`
    },

    { t: "callout", kind: "trap", title: "Unscaled features are an optimisation problem before they are a modelling one", body: [
      { t: "p", text: "A feature in the tens of thousands (income) beside one in units (children) gives the Hessian eigenvalues that differ by the square of the ratio — a condition number in the millions. The stable learning rate is set by the large eigenvalue and the progress along the small one is nil: **the model 'does not converge' and the cause is the units.** Standardising features (3.1) collapses the condition number, which is why scaling matters for anything trained by gradient descent and does not matter for trees, which never compute a gradient." }
    ]},

    { t: "ladder",
      title: "Training a logistic regression on the churn table by hand",
      rungs: [
        { level: "bad", label: "Raw features, fixed learning rate, one epoch of SGD", code: `for row in data: w -= 0.1 * grad(row)          # tenure in months (1-60) beside a 0/1 flag`,
          note: "**Divergence or a crawl, depending on the rate**, and no way to tell which direction has converged. The units decide the outcome." },
        { level: "ok", label: "Standardised features, mini-batches, a decaying rate", code: `X = scaler.fit_transform(X_train)
for epoch in range(30): lr = 0.5 / (1 + epoch); for batch in batches(X, 64): w -= lr * grad(batch)`,
          note: "**Converges reliably.** The condition number is now near one; the decay lets the noise settle." },
        { level: "best", label: "Standardised features and a second-order solver, because the loss is convex", code: `LogisticRegression(solver="lbfgs", max_iter=1000)      # the default: L-BFGS with line search, no learning rate`,
          note: "**For a convex loss with a few hundred parameters, curvature-aware methods have no knobs and converge in tens of iterations.** Gradient descent with schedules is for the losses and scales where second-order is impossible — networks." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Gradient descent variants from scratch",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Implement, in NumPy, gradient descent for logistic regression with four update rules — plain, momentum (β = 0.9), RMSProp (ρ = 0.9) and Adam (β₁ = 0.9, β₂ = 0.999, bias-corrected) — sharing one gradient function. Run each on the churn table's standardised numeric features for 200 full-batch steps at a learning rate you choose per method, and report the log-loss every 50 steps, plus the final coefficients against scikit-learn's L-BFGS solution. Then repeat plain GD on *unstandardised* features and report what happens." }
      ],
      requirements: [
        "One `grad(w, X, y)` used by all four rules; the update rules as separate functions with their own state.",
        "Log-loss at steps 50, 100, 150, 200 for each method, and the L2 distance of the final weights from L-BFGS's.",
        "The unstandardised run with its learning rate and outcome, and one sentence connecting it to the Hessian's eigenvalues."
      ],
      hint: "Gradient of mean cross-entropy: Xᵀ(σ(Xw) − y) / n. Add a column of ones for the intercept. For unstandardised features, compute the eigenvalues of XᵀX/n to see the condition number before choosing a rate.",
      solution: {
        lang: "python",
        title: "optimisers.py",
        code: `def sigmoid(z): return 1 / (1 + np.exp(-z))
def grad(w, X, y): return X.T @ (sigmoid(X @ w) - y) / len(y)
def logloss(w, X, y): p = np.clip(sigmoid(X @ w), 1e-9, 1 - 1e-9); return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))

def plain(lr):
    def step(w, g, k, st): return w - lr * g
    return step
def momentum(lr, beta=0.9):
    def step(w, g, k, st):
        st["v"] = beta * st.get("v", 0) + g; return w - lr * st["v"]
    return step
def rmsprop(lr, rho=0.9, eps=1e-8):
    def step(w, g, k, st):
        st["s"] = rho * st.get("s", 0) + (1 - rho) * g * g; return w - lr * g / (np.sqrt(st["s"]) + eps)
    return step
def adam(lr, b1=0.9, b2=0.999, eps=1e-8):
    def step(w, g, k, st):
        st["m"] = b1 * st.get("m", 0) + (1 - b1) * g; st["v"] = b2 * st.get("v", 0) + (1 - b2) * g * g
        mh, vh = st["m"] / (1 - b1 ** k), st["v"] / (1 - b2 ** k); return w - lr * mh / (np.sqrt(vh) + eps)
    return step

Xs = np.c_[StandardScaler().fit_transform(X_num), np.ones(len(X_num))]; y = churned.values.astype(float)
ref = LogisticRegression(penalty=None, max_iter=5000).fit(Xs[:, :-1], y); w_ref = np.r_[ref.coef_[0], ref.intercept_]
for name, rule in [("plain", plain(0.5)), ("momentum", momentum(0.1)), ("rmsprop", rmsprop(0.01)), ("adam", adam(0.05))]:
    w = np.zeros(Xs.shape[1]); st = {}; trace = []
    for k in range(1, 201):
        w = rule(w, grad(w, Xs, y), k, st)
        if k % 50 == 0: trace.append(round(logloss(w, Xs, y), 4))
    print(name, trace, "distance to L-BFGS", round(np.linalg.norm(w - w_ref), 3))
# executed (L-BFGS log-loss 0.3831):        step 50    100     150     200      distance to L-BFGS
#   plain     lr 0.5                        0.3855  0.3833  0.3831  0.3831        0.026
#   momentum  lr 0.1                        0.3856  0.3831  0.3831  0.3831        0.000
#   rmsprop   lr 0.01                       0.5100  0.4356  0.3978  0.3844        0.209      <- still approaching; its per-coordinate step is too small here
#   adam      lr 0.05                       0.3860  0.3831  0.3831  0.3831        0.000

# unstandardised: tenure_months spans 1-60, monthly_fee ~8-20, the discount 0-20, the intercept column is 1
Xu = np.c_[X_num.values, np.ones(len(X_num))]
np.linalg.eigvalsh(Xu.T @ Xu / len(Xu))     # [0.083, 0.76, 6.1, 31.7, 84.3, 1463.5]: condition number ~17,600; stability limit 2/1463 = 0.00137
# plain GD at lr = 0.5: the sigmoid saturates so the loss stays finite, but the weights thrash (log-loss 2.91 after 200 steps -- worse than
#   predicting the base rate); at lr = 0.0005: stable, log-loss 0.402, but the intercept and small-scale weights have barely moved
#   (0.003, 0.002, -0.001). The step safe for tenure's direction is useless for the others: that is the condition number.`,
        notes: [
          { t: "p", text: "**One gradient, four update rules** is the structure of every deep-learning optimiser library, and writing it once makes the differences concrete: momentum adds state v, RMSProp adds s, Adam adds both plus the bias correction that keeps the first steps from being tiny." },
          { t: "p", text: "**The unstandardised run is the point of the exercise.** Nothing about the model changed; the units made the problem ill-conditioned, and gradient descent's behaviour is a function of the Hessian's spectrum. Scaling features is the cheapest optimiser improvement there is." },
          { t: "p", text: "**L-BFGS as the reference** reminds you that for a convex problem of this size the from-scratch loop is for understanding, not for use." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Gradient descent at η = 0.02 converged and at η = 0.1 diverged on a problem whose Hessian eigenvalues were 0.34 and 23.7. Why?",
          options: [
            "0.1 is always too large",
            "For a quadratic, each step multiplies the error along an eigen-direction by (1 − ηλ); stability needs |1 − ηλ| < 1 for every λ, i.e. η < 2/λ_max = 0.0845. At 0.1 the steep direction's error grows by |1 − 2.37| = 1.37 per step",
            "The gradient was computed wrongly",
            "The data had an outlier"
          ],
          answer: 1,
          why: "The same bound explains the crawl at 0.02: along λ = 0.34 the error shrinks by only (1 − 0.0068) per step. Condition number 70 means the safe step is seventy times too small for the flat direction."
        }
      ]
    }
  ],

  takeaways: [
    "**θ ← θ − η∇L**; for a quadratic, stable iff η < 2/λ_max, and the crawl along small-curvature directions is set by the condition number.",
    "**Divergence, crawling and oscillation are diagnosable from the loss curve**; NaN in a few steps is the rate, thousands of creeping steps is conditioning, oscillation near the end is noise or a rate that never decayed.",
    "**Scale features before gradient descent** — the condition number is set by the units.",
    "**Mini-batches of 32–512 are the default**: most of SGD's update count, most of batch GD's hardware efficiency, and noise that helps escape saddles.",
    "**Momentum accelerates consistent directions and cancels zigzags (171 steps vs never); Adam adds per-coordinate scaling and bias correction**; RMSProp without decay bounces at its step size.",
    "**Convex losses with few parameters want a second-order solver** (L-BFGS): no learning rate, tens of iterations.",
    "**Squared error's optimum is the mean and its gradient is proportional to the residual — outliers pull hardest; absolute error's optimum is the median with unit pull; Huber is both; quantile loss tilts the pull.**",
    "**Cross-entropy is Bernoulli negative log-likelihood and is never satisfied; hinge is satisfied past the margin; 0–1 loss has no gradient.**",
    "**Train on a differentiable proper loss; choose and report by the business metric** — log-loss halved while accuracy moved 1.2 points.",
    "**Non-convex losses depend on initialisation and order**; run several seeds and report the spread."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does momentum converge in 171 steps on the valley where plain gradient descent needs more than 400?",
        options: [
          "It uses a larger learning rate",
          "Along the flat direction the gradient keeps the same sign, so the velocity accumulates to about 1/(1 − β) = 10× the step; along the steep direction the gradient alternates sign and the velocity cancels — accelerating where GD crawls and damping where GD zigzags",
          "It computes the Hessian",
          "It uses smaller batches"
        ],
        answer: 1,
        why: "On a quadratic this turns O(κ) iterations into O(√κ). Adam gets the same effect with per-coordinate scaling on top."
      },
      {
        stem: "When would you train with absolute error rather than squared error?",
        options: [
          "Always; it is more robust",
          "When the target has outliers or heavy tails and you want the fit to track the typical value rather than be pulled toward extremes — absolute error's optimum is the median and every row's gradient has unit magnitude; Huber if you also want a smooth gradient near zero",
          "When the target is categorical",
          "When the data is small"
        ],
        answer: 1,
        why: "On the five residuals, the outlier contributed 32 of a total 34.7 squared loss and 8 of 11.8 absolute loss. Which fit you want depends on whether the outlier is signal (2.4)."
      },
      {
        stem: "Which loss has zero gradient almost everywhere, and what follows?",
        options: [
          "Cross-entropy",
          "The 0–1 loss (accuracy): a step function of the margin, so gradient descent cannot minimise it; convex surrogates — cross-entropy, hinge — are trained instead, and the metric is used for choosing thresholds and hyperparameters",
          "Hinge loss",
          "Huber loss"
        ],
        answer: 1,
        why: "This is the loss-versus-metric distinction: train on what has a gradient and is a proper score; report what the decision needs."
      },
      {
        stem: "SGD's loss is the lowest after five epochs yet it oscillates near the minimum. Why, and what fixes it?",
        options: [
          "SGD is broken",
          "Each single-row gradient is a noisy estimate, so the iterate keeps jittering by about η × noise; a decaying learning rate, larger batches late in training, or averaging the iterates (Polyak) lets it settle",
          "A larger learning rate",
          "Fewer epochs"
        ],
        answer: 1,
        why: "Noise is a feature early (it escapes saddles and poor basins) and a bug late; schedules are how you get both."
      },
      {
        stem: "Cross-entropy for a correct prediction at p = 0.9 is 0.105, not zero. What consequence does that have for logistic regression on separable data?",
        options: [
          "None",
          "The loss keeps rewarding more confidence forever, so the weights grow without bound and never converge; regularisation (or early stopping) is what gives the problem a finite optimum",
          "The model underfits",
          "Accuracy falls"
        ],
        answer: 1,
        why: "Hinge loss, by contrast, is satisfied once the margin exceeds one — one reason SVMs and logistic regressions behave differently on clean, separable data."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why does gradient descent sometimes fail to converge?",
        strong: "Four reasons, each with a different signature. The learning rate is above the stability limit — for a quadratic, 2 over the largest Hessian eigenvalue — and the loss grows by a factor each step until it is NaN; an unscaled feature is the usual cause of that eigenvalue. The problem is ill-conditioned, so a rate that is safe for the steep direction crawls along the flat one; the loss falls quickly and then creeps for thousands of steps; scaling, momentum or Adam fix it. The gradient is stochastic and the rate never decays, so the iterate jitters near the minimum; a schedule or iterate averaging fixes it. Or the gradient itself is faulty or vanishing — a saturated activation, a dead unit, a bug — and the loss is flat from the start; a numerical gradient check finds it. On a non-convex loss there is a fifth: it converged, to a different basin than last time, which is why several seeds and validation-based selection are standard.",
        answer: [
          { t: "p", text: "Rate, conditioning, noise, gradient — each named with its symptom and fix." }
        ]
      },
      {
        level: "core",
        q: "Explain the difference between batch, mini-batch and stochastic gradient descent.",
        strong: "They differ in how many rows the gradient is averaged over before a step. Batch uses all n: an exact gradient, one update per epoch, fully vectorised but slow to make progress and prone to settling in whatever basin it starts near. Stochastic uses one row: n updates per epoch, a noisy gradient that makes fast early progress and escapes saddles but oscillates near the minimum without a decaying rate, and no vectorisation. Mini-batch, 32 to a few hundred rows, is the compromise everyone uses: most of the update count, most of the hardware efficiency, noise that acts as a mild regulariser. In a run on 2,000 rows, five epochs took batch GD to a loss of 0.47, mini-batch to 0.25, SGD to 0.22 — at 2, 6 and 164 milliseconds.",
        answer: [
          { t: "p", text: "Updates per epoch, noise, and hardware — with the numbers that show the trade." }
        ]
      },
      {
        level: "advanced",
        q: "How does Adam work, and when would you not use it?",
        strong: "Adam keeps two exponential moving averages per parameter: of the gradient, which is momentum, and of the squared gradient, which is the RMSProp scale; it divides the first by the square root of the second, and corrects both for the bias of starting the averages at zero so the first steps are not tiny. The effect is a per-parameter step that is large where gradients are consistent and small where they are large or erratic, which makes it tolerant of unscaled, badly conditioned, noisy problems — the situation in neural networks. I would not use it for a small convex problem, where L-BFGS converges in tens of iterations with no learning rate; and I would be careful with it when generalisation matters and SGD with momentum is known to find flatter minima, as in some vision benchmarks. Two practical notes: weight decay must be applied as AdamW, directly to the parameters, because L2 through the gradient interacts badly with the adaptive scaling; and a fixed Adam rate can still oscillate late in training, so a decay or warm-up-then-cosine schedule is normal.",
        answer: [
          { t: "p", text: "The two averages, the bias correction, the situations where a different optimiser is right, and the AdamW detail — that is expert level." }
        ]
      }
    ]
  }
});

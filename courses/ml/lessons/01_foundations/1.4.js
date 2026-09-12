/* ============================================================================
   LESSON 1.4 — Overfitting, Regularisation and Early Stopping
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**Overfitting is variance with a symptom: the training score keeps improving while the validation score turns and falls.** Every cure is a way of shrinking the hypothesis space or the search through it — a penalty on the weights, a stop before convergence, a smaller tree, a dropped feature, more rows. This lesson shows the symptom appear on the churn table as a booster deepens, then shows each cure move the validation number: L2 and L1 penalties on a 65-feature logistic regression, early stopping on a 600-round booster, and — the part interviews ask about — why L2 is a Gaussian prior, L1 a Laplace prior, and early stopping approximately L2.",

  objectives: [
    "Detect overfitting from the gap between training and validation scores, and distinguish it from a leak",
    "Apply L2 and L1 penalties, read what each does to the weights, and choose the strength by validation",
    "Derive ridge and lasso as MAP estimation under Gaussian and Laplace priors",
    "Implement early stopping on a validation fold and explain why stopping gradient descent early behaves like an L2 penalty"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The symptom", id: "symptom" },

    { t: "code", lang: "python", title: "Gradient boosting on the churn table as depth increases — 300 rounds each (executed)",
      hl: [2, 3, 4, 5, 6],
      code: `# 693 training rows, 297 validation rows, same preprocessing pipeline as 1.2
# max_depth   training AUC   validation AUC
#     1          0.806          0.779           <- stumps: the best validation score of the five
#     2          0.968          0.739
#     3          1.000          0.719           <- perfect on training: it has memorised the 693 rows
#     5          1.000          0.710
#     8          1.000          0.717`,
      caption: "Depth 1 is worse on training and better on validation than every deeper model. A training AUC of 1.000 says nothing about the model and everything about its capacity relative to 693 rows: 300 rounds of depth-3 trees have far more freedom than the data can constrain. The gap — 1.000 against 0.719 — is the symptom; the falling validation column is the diagnosis."
    },

    { t: "table",
      head: ["Signal", "Overfitting", "Leakage", "Underfitting"],
      rows: [
        ["Training score", "Very high", "Very high", "Low"],
        ["Validation score", "Much lower, falls as capacity rises", "Also very high — suspiciously", "Low, close to training"],
        ["Effect of more data", "Gap narrows", "Gap stays", "Nothing"],
        ["Effect of regularisation", "Validation rises", "Both fall together", "Validation falls"],
        ["First thing to check", "Capacity vs rows", "Where each feature comes from (1.6)", "Features and family"]
      ]
    },

    { t: "table",
      head: ["Cure", "Mechanism", "Where it lives", "Cost"],
      rows: [
        ["More data", "Training sets become alike; variance falls", "Everywhere", "Money and time; does not fix bias"],
        ["Fewer or better features", "Smaller hypothesis space; less noise to fit", "3.5", "Can remove signal"],
        ["Penalty on weights (L2, L1)", "Shrinks or zeroes coefficients; the family cannot bend as far", "This lesson, 4.3", "One hyperparameter to tune; L1 is non-smooth"],
        ["Smaller capacity (depth, k, degree)", "Directly limits flexibility", "1.3, module 6", "Bias if taken too far"],
        ["Early stopping", "Stops the search before it reaches the noise", "This lesson, 6.3", "Needs a validation fold; interacts with learning rate"],
        ["Averaging (bagging, dropout)", "Variance of the mean is lower than of one fit", "6.2, 11.6", "Compute; interpretability"],
        ["Cross-validated selection", "Chooses among all of the above by held-out score", "1.5, 8.1", "Compute"]
      ]
    },

    { t: "h2", n: "02", text: "Penalties: L2 shrinks, L1 selects", id: "penalties" },

    { t: "p", text: "A penalty adds the size of the weights to the loss: **minimise loss(w) + λ·‖w‖²₂ (ridge, L2) or loss(w) + λ·‖w‖₁ (lasso, L1).** Large λ means small weights, whatever the data says; λ → 0 recovers the unpenalised fit. In scikit-learn's logistic regression the knob is C = 1/λ, so small C is strong regularisation. To give the model room to overfit, the run below expands the five numeric columns into degree-3 polynomial features — 65 columns for 693 rows." },

    { t: "code", lang: "python", title: "L2 strength on a 65-feature logistic regression (executed)",
      hl: [4, 8, 9, 10, 14, 15, 16],
      code: `pre = ColumnTransformer([("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler()),
                                            ("poly", PolynomialFeatures(3, include_bias=False))]), numeric),
                         ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)])
for C in [1000, 100, 10, 1, 0.1, 0.01, 0.001]:
    Pipeline([("pre", pre), ("lr", LogisticRegression(C=C, max_iter=5000))]).fit(X_train, y_train)
#   C        training AUC   validation AUC   sum |w|
#   1000       0.823          0.661           29.20      <- effectively unpenalised: 65 weights fitted to 693 rows
#   100        0.823          0.661           26.98
#   10         0.823          0.663           19.45
#   1          0.822          0.668           12.81      <- scikit-learn's default: still overfitting here
#   0.1        0.817          0.690            7.26
#   0.01       0.787          0.780            2.65      <- validation up by 0.12 from the default
#   0.001      0.761          0.791            0.79      <- weights nearly all near zero; the model is close to 'plan and tenure only'

# L1 with the same features: the penalty sets weights to exactly zero
#   C = 1      validation 0.677   46 of 65 weights non-zero
#   C = 0.1    validation 0.786   19 of 65
#   C = 0.03   validation 0.785    7 of 65      <- seven features, same score as nineteen`,
      caption: "As C falls the weight sum falls thirtyfold, training AUC drops six points and validation rises thirteen — the trade in 1.3 made with a knob. L1 reaches the same validation score with seven non-zero weights, which is a feature-selection method disguised as a penalty (4.3 explains why the corners of the L1 ball do that). The default C = 1 was the wrong setting for this data; the right one was found by validation, which is the only way it ever is."
    },

    { t: "dl", items: [
      ["Regularisation", "Any modification of the objective or the search that prefers simpler functions: penalties, early stopping, pruning, dropout, data augmentation."],
      ["L2 / ridge / weight decay", "Penalty λ‖w‖²₂. Shrinks every weight toward zero smoothly; keeps all features; has a closed form for linear models."],
      ["L1 / lasso", "Penalty λ‖w‖₁. Shrinks and sets weights to exactly zero; a built-in feature selector; no closed form, solved by coordinate descent."],
      ["Elastic net", "Both penalties together; keeps L1's sparsity while behaving better when features are correlated (4.3)."],
      ["C", "scikit-learn's inverse regularisation strength for logistic regression and SVMs: C = 1/λ. Small C, strong penalty."],
      ["MAP estimation", "Maximum a posteriori: the parameter that maximises prior × likelihood. Penalised losses are negative log posteriors."],
      ["Early stopping", "Monitor a validation metric during iterative training and keep the parameters from the best iteration."]
    ]},

    { t: "h2", n: "03", text: "Why L2 is a Gaussian prior and L1 a Laplace prior", id: "map" },

    { t: "code", lang: "text", title: "Penalised loss = negative log posterior",
      code: `Bayes:      p(w | data)  ∝  p(data | w) · p(w)                    posterior ∝ likelihood × prior
MAP:        w_MAP = argmax_w  log p(data | w) + log p(w)             maximise the log posterior

Likelihood, Gaussian noise σ² on a linear model:     log p(data | w) = -(1/2σ²) Σᵢ (yᵢ - xᵢᵀw)²  + const

Gaussian prior on each weight, variance τ²:          log p(w) = -(1/2τ²) ‖w‖²₂ + const
  -log posterior  =  (1/2σ²) Σ (yᵢ - xᵢᵀw)²  +  (1/2τ²) ‖w‖²₂
  multiply by 2σ²:   Σ (yᵢ - xᵢᵀw)²  +  (σ²/τ²) ‖w‖²₂           =  ridge with λ = σ²/τ²
  a tight prior (small τ) is a strong penalty; a wide prior (τ → ∞) is plain least squares.

Laplace prior on each weight, scale b:   p(wⱼ) = (1/2b) exp(-|wⱼ|/b)        log p(w) = -(1/b) ‖w‖₁ + const
  -log posterior  =  (1/2σ²) Σ (yᵢ - xᵢᵀw)²  +  (1/b) ‖w‖₁
  multiply by 2σ²:   Σ (yᵢ - xᵢᵀw)²  +  (2σ²/b) ‖w‖₁            =  lasso with λ = 2σ²/b

The Laplace density has a sharp peak at zero — it puts real probability mass on 'this weight is exactly zero'.
The Gaussian is flat at zero — it says small, never exactly zero. That is the whole difference between the two penalties.`,
      caption: "This is the answer to 'derive L1 and L2 from a Bayesian perspective'. It also explains what λ means: the ratio of noise variance to prior variance. Noisy data with a confident prior that weights are small ⇒ shrink hard; clean data or an agnostic prior ⇒ trust the data."
    },

    { t: "viz",
      title: "The two priors at zero",
      caption: "A Gaussian prior is smooth through zero, so the posterior mode moves weights toward zero without reaching it. A Laplace prior has a corner at zero, so for a weakly supported weight the mode sits exactly on it — sparsity.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Two density curves over a weight axis: a smooth Gaussian bell on the left labelled L2, and a pointed Laplace peak on the right labelled L1, with the corner at zero highlighted.">
  <g style="stroke:var(--line)" stroke-width="1.2">
    <line x1="40" y1="180" x2="420" y2="180"/><line x1="460" y1="180" x2="840" y2="180"/>
  </g>
  <path d="M60,178 C120,178 170,160 200,110 C215,80 225,60 230,55 C235,60 245,80 260,110 C290,160 340,178 400,178" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <path d="M480,178 C560,176 610,150 650,55 C690,150 740,176 820,178" fill="none" style="stroke:var(--warn)" stroke-width="2.4"/>
  <line x1="230" y1="55" x2="230" y2="180" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>
  <line x1="650" y1="55" x2="650" y2="180" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>
  <circle cx="650" cy="55" r="6" fill="none" style="stroke:var(--crit)" stroke-width="1.6"/>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="230" y="36" style="fill:var(--accent)">Gaussian prior → L2 (ridge)</text>
    <text x="650" y="36" style="fill:var(--warn)">Laplace prior → L1 (lasso)</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="230" y="200">w = 0</text><text x="650" y="200">w = 0</text>
    <text x="230" y="220">smooth at zero: shrinks, never lands on it</text>
    <text x="650" y="220">a corner at zero: weakly supported weights land exactly on it</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "Early stopping", id: "early" },

    { t: "code", lang: "python", title: "A 600-round booster, with validation log-loss recorded every round (executed)",
      hl: [2, 3, 4, 8, 9, 13, 14],
      code: `gb = GradientBoostingClassifier(n_estimators=600, max_depth=3, learning_rate=0.1).fit(Z_train, y_train)
train_ll = [log_loss(y_train, p[:, 1]) for p in gb.staged_predict_proba(Z_train)]     # loss after each round
val_ll   = [log_loss(y_val,   p[:, 1]) for p in gb.staged_predict_proba(Z_val)]
#   round   training log-loss   validation log-loss
#      1        0.434               0.434
#     10        0.376               0.394
#     25        0.334               0.375
#     45        0.299               0.373        <- the minimum: keep this model
#     50        0.291               0.376
#    100        0.225               0.385
#    200        0.142               0.423
#    400        0.069               0.520
#    600        0.036               0.605        <- training loss a sixth of what it was at round 45; validation loss up 62 %
best_round = int(np.argmin(val_ll)) + 1           # 45
# in practice: GradientBoostingClassifier(n_iter_no_change=20, validation_fraction=0.15) or LightGBM/XGBoost early_stopping_rounds`,
      caption: "The training curve never turns; the validation curve turns at round 45 and never recovers. Stopping there is a regularisation whose strength is measured in rounds. The `n_iter_no_change` form does the same thing automatically, holding out a fraction of the training data — which means the validation fold used for stopping must not be the one you report on."
    },

    { t: "code", lang: "python", title: "Why stopping early is approximately L2: gradient descent on least squares against ridge (executed)",
      hl: [3, 4, 9, 10, 11, 12, 13],
      code: `# 60 rows, 8 features, two of them nearly collinear; plain gradient descent from w = 0 with step 0.01
w = np.zeros(8)
for t in range(1, 5001):
    w -= eta * (2 / n) * A.T @ (A @ w - b)                    # one step toward the least-squares solution
    # snapshot at t = 10, 50, 200, 1000, 5000; for each, find the ridge alpha whose solution is closest

#   stopped at t     ‖w‖      closest ridge α    distance between the two weight vectors
#        10          0.280        267.4               0.011
#        50          0.913         35.7               0.071
#       200          1.400          4.4               0.082
#      1000          1.460          2.4               0.072
#      5000          1.569          0.55              0.022
#   the unpenalised least-squares solution: ‖w‖ = 6.13, with the two collinear weights at +4.69 and -3.73 (cancelling noise)
#   GD at t = 200 has them at +0.49 and +0.45: it has not yet had time to chase the collinear direction`,
      caption: "Gradient descent from zero learns the strong, well-determined directions first and the weak, noisy directions last — because the gradient is largest along the big eigenvalues of AᵀA. Stopping early leaves the weak directions unlearned, which is exactly what ridge does by shrinking them. The correspondence is monotone (earlier stop ↔ larger α; roughly α ≈ n/(2ηt) for this loss scaling) and exact only for small steps in the eigenbasis, but the picture is right: iterations are a regularisation strength."
    },

    { t: "callout", kind: "trap", title: "The validation fold that stops training is spent", body: [
      { t: "p", text: "Early stopping chooses a hyperparameter — the number of rounds — on the validation fold. Its score on that fold is therefore optimistic, in the same way a grid search's best score is. **Report on a fold that stopped nothing**: either nest it (stop on an inner fold, score on the outer) or reserve a test set. The same applies to `n_iter_no_change`'s internal `validation_fraction`, which is carved from the training data and is not your reported set — but it does mean the model trained on 85 % of what you gave it." }
    ]},

    { t: "ladder",
      title: "A logistic regression with 65 polynomial features scores 0.66 on validation and 0.82 on training",
      rungs: [
        { level: "bad", label: "Use the default and hope", code: `LogisticRegression()                         # C = 1: validation 0.668`,
          note: "**The default is a default.** It was not chosen for your rows-to-features ratio." },
        { level: "ok", label: "Sweep C by validation", code: `for C in np.logspace(3, -3, 7): ...          # C = 0.001: validation 0.791`,
          note: "**Right idea, single split.** The chosen C is tuned to one validation fold's noise; 1.5 makes it five folds." },
        { level: "best", label: "Cross-validate C, consider L1, and ask whether the features earned their place", code: `LogisticRegressionCV(Cs=np.logspace(3, -3, 13), cv=StratifiedKFold(5, shuffle=True), scoring="roc_auc")
# and: L1 at C = 0.03 kept 7 of 65 features at the same score. Were the 58 others ever needed?`,
          note: "**Regularisation strength chosen on five folds, and the sparsity read as information**: the polynomial expansion added 60 columns the data could not support." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Three cures on one overfitting model",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Take the depth-3, 300-round gradient booster from section 01 (training AUC 1.000, validation 0.719). Apply three cures separately and report training and validation AUC for each: (a) early stopping with `n_iter_no_change=20, validation_fraction=0.2`; (b) stronger regularisation through `learning_rate=0.03, subsample=0.7, min_samples_leaf=15` at 300 rounds; (c) more data — simulate it by comparing the model trained on 50 %, 75 % and 100 % of the training rows. Then state which cure moved the gap most, and which the validation score most, and whether those are the same." }
      ],
      requirements: [
        "Six numbers per cure (training and validation AUC per setting), all executed.",
        "The gap (training − validation) tabulated.",
        "One sentence on why (c) cannot be pushed further on this dataset and what you would do instead."
      ],
      hint: "Expect (a) and (b) to close the gap by lowering training AUC well below 1.0. For (c), the validation score should rise with the fraction while the gap narrows — a learning curve in three points (8.3).",
      solution: {
        lang: "python",
        title: "three_cures.py",
        code: `base = dict(max_depth=3, random_state=0)
runs = {
  "original (300 rounds)":         GradientBoostingClassifier(n_estimators=300, learning_rate=0.1, **base),
  "(a) early stopping":            GradientBoostingClassifier(n_estimators=600, learning_rate=0.1, n_iter_no_change=20, validation_fraction=0.2, **base),
  "(b) slower, subsampled, leafy": GradientBoostingClassifier(n_estimators=300, learning_rate=0.03, subsample=0.7, min_samples_leaf=15, **base),
}
for name, m in runs.items():
    pipe = Pipeline([("pre", pre), ("gb", m)]).fit(X_train, y_train)
    tr = roc_auc_score(y_train, pipe.predict_proba(X_train)[:, 1]); va = roc_auc_score(y_val, pipe.predict_proba(X_val)[:, 1])
    print(f"{name:32s} train {tr:.3f}  val {va:.3f}  gap {tr - va:.3f}")
# (c) more data: the original model on stratified subsets of the training rows
for frac in [0.5, 0.75, 1.0]:
    idx, _ = train_test_split(np.arange(len(X_train)), train_size=frac, stratify=y_train, random_state=0) if frac < 1 else (np.arange(len(X_train)), None)
    pipe = Pipeline([("pre", pre), ("gb", runs["original (300 rounds)"])]).fit(X_train.iloc[idx], y_train.iloc[idx])
    ...  # same two scores and the gap

# executed:                             train    val     gap
#   original (300 rounds)               1.000   0.719   0.280
#   (a) early stopping                  0.879   0.763   0.116     <- stopped at round 41; the largest gap reduction AND the best validation
#   (b) slower, subsampled, leafy       0.943   0.752   0.191
#   (c)  50 % of rows (346)             1.000   0.636   0.364
#   (c)  75 % of rows (519)             1.000   0.709   0.291
#   (c) 100 % of rows (693)             1.000   0.719   0.280     <- validation rises with rows, but training stays at 1.000 at every size:
#                                                                    693 rows cannot constrain 300 depth-3 trees; 'more data' means thousands
# Here the cure that moved the gap most and the one that moved validation most were the same, (a). They need not be: closing the
# gap by lowering training AUC is not the goal; validation AUC is. Report both, choose by validation.`,
        notes: [
          { t: "p", text: "**The gap is a symptom, not the target.** A model with training 0.80 and validation 0.78 has a small gap and may still be worse than one at 0.95 / 0.80. Choose by the validation number; use the gap to understand why." },
          { t: "p", text: "**Cure (c) is honest about its limit**: on 693 rows, the three-point learning curve tells you whether more rows would keep helping, and it is the argument for going to get them — or, if you cannot, for the cheaper cures (a) and (b)." },
          { t: "p", text: "**Early stopping and slow learning interact**: a lower learning rate needs more rounds before the validation curve turns, so (a) and (b) combined is the usual production setting (6.3)." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Lowering C from 1 to 0.001 cut the weight sum from 12.8 to 0.8 and raised validation AUC from 0.668 to 0.791. What happened in bias–variance terms?",
          options: [
            "Bias fell and variance rose",
            "Variance fell a lot and bias rose a little: the shrunken weights cannot chase the noise in 65 features, and the small loss of flexibility cost less than the variance it removed",
            "Both fell",
            "Nothing; it is a different model"
          ],
          answer: 1,
          why: "Training AUC fell from 0.822 to 0.761 (the bias cost) while validation rose 0.12 (the variance saving). Regularisation is the bias–variance trade made with a dial."
        }
      ]
    }
  ],

  takeaways: [
    "**Overfitting is a falling validation score with a rising training score**; a training AUC of 1.000 measures capacity, not quality.",
    "**Distinguish it from leakage**: leakage keeps validation high too; regularisation makes both fall together.",
    "**L2 shrinks every weight; L1 sets weak ones to exactly zero** — a feature selector in disguise; C = 1/λ, small C is strong.",
    "**The default C is not chosen for your data**; choose the strength by validation, ideally cross-validated.",
    "**Ridge is MAP under a Gaussian prior with λ = σ²/τ²; lasso under a Laplace prior** — the corner at zero is why L1 is sparse.",
    "**Early stopping is regularisation measured in rounds**: the validation curve turned at round 45 and never came back.",
    "**Stopping early ≈ L2**: gradient descent learns strong directions first, so an early stop leaves the weak, noisy ones unlearned — exactly ridge's effect.",
    "**The fold that stops training is spent**; report on one that made no decision.",
    "**More data cures variance, not bias, and only if there is more to get**; the learning curve says whether it would help.",
    "**Choose by validation score, read the gap for understanding** — closing the gap is not the goal."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between what L1 and L2 penalties do to a weight that the data barely supports?",
        options: [
          "Both set it to zero",
          "L2 shrinks it toward zero but leaves it non-zero; L1 sets it exactly to zero, because the Laplace prior's corner at zero makes zero the posterior mode for weakly supported weights",
          "L1 shrinks it; L2 zeros it",
          "Neither affects it"
        ],
        answer: 1,
        why: "The executed L1 fit kept 7 of 65 weights at C = 0.03; the L2 fit at any C kept all 65, just smaller."
      },
      {
        stem: "In the MAP derivation, what does λ = σ²/τ² say about when to regularise hard?",
        options: [
          "When the data is clean",
          "When the noise variance σ² is large relative to the prior variance τ² — noisy data and a confident belief that weights are small; clean data or an agnostic prior means trust the data",
          "When there are many rows",
          "λ is unrelated to noise"
        ],
        answer: 1,
        why: "The penalty is the ratio of how much you distrust the data to how much you trust the prior. That is also why λ is tuned by validation: neither variance is known."
      },
      {
        stem: "Why does stopping gradient descent early act like an L2 penalty?",
        options: [
          "Because fewer iterations mean fewer parameters",
          "Gradient descent from zero moves fastest along the strongly determined directions of the loss and slowest along the weak, noisy ones; stopping early leaves the weak directions near zero, which is what ridge does by shrinking them",
          "Because the learning rate decays",
          "It does not; they are unrelated"
        ],
        answer: 1,
        why: "The executed run: GD at t = 200 had the two collinear weights at +0.49 and +0.45 where least squares had +4.69 and −3.73. The noisy direction was never learned."
      },
      {
        stem: "A booster's validation log-loss is 0.373 at round 45 and 0.605 at round 600, while training log-loss falls from 0.299 to 0.036. Which model do you keep?",
        options: [
          "Round 600; lowest training loss",
          "Round 45; the validation minimum — everything after it is the model fitting the training rows' noise, and the training loss is not evidence",
          "Round 300 as a compromise",
          "Neither; the model is broken"
        ],
        answer: 1,
        why: "This is early stopping: the number of rounds is a hyperparameter chosen at the validation minimum, and the fold that chose it must not be the reported one."
      },
      {
        stem: "Training AUC 0.99, validation AUC 0.97 on a churn model. What is the most likely explanation?",
        options: [
          "An excellent model",
          "Leakage: a human decision like churn is not predictable at 0.97 from honest features, and regularisation would lower both numbers together rather than closing a gap — check where each feature comes from before celebrating",
          "Underfitting",
          "The validation set is too small"
        ],
        answer: 1,
        why: "Overfitting shows as a gap; leakage shows as two numbers that are both too good. The table in section 01 is the diagnosis."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is overfitting and how do you prevent it?",
        strong: "Overfitting is a model with enough capacity to fit the noise in its training rows, so its training score keeps improving while its held-out score turns and falls — variance in the bias–variance sense. I detect it from the gap and the direction of the validation curve, after ruling out leakage, which looks different: both numbers too good. Prevention is every way of restricting the hypothesis space or the search: more data, fewer or better features, a penalty on weights — L2 to shrink, L1 to zero — smaller capacity such as tree depth, early stopping on a validation fold, averaging by bagging or dropout, and choosing among all of these by cross-validation rather than by training score. On a 65-feature logistic regression I have watched validation AUC rise from 0.67 to 0.79 by turning C down three orders of magnitude; the default was simply wrong for that data.",
        answer: [
          { t: "p", text: "Defining it as variance, separating it from leakage, and naming the cures with the mechanism each uses is the full answer." }
        ]
      },
      {
        level: "core",
        q: "Derive L1 and L2 regularisation from a Bayesian perspective.",
        strong: "Maximum a posteriori estimation maximises log likelihood plus log prior. With Gaussian noise the negative log likelihood is the sum of squared errors over 2σ². A Gaussian prior on the weights with variance τ² contributes ‖w‖² over 2τ²; multiplying through by 2σ² gives squared error plus (σ²/τ²)‖w‖² — ridge, with λ as the noise-to-prior variance ratio. A Laplace prior with scale b contributes ‖w‖₁ over b, giving squared error plus (2σ²/b)‖w‖₁ — lasso. The Laplace density has a corner at zero, so the posterior mode for a weakly supported weight sits exactly at zero; the Gaussian is smooth there, so ridge shrinks without zeroing. That geometric fact is the whole reason L1 does feature selection.",
        answer: [
          { t: "p", text: "The λ = σ²/τ² identification and the corner-at-zero explanation are the two things the interviewer wants to hear." }
        ]
      },
      {
        level: "advanced",
        q: "Why is early stopping a form of regularisation, and what are its pitfalls?",
        strong: "Iterative training from a small initialisation learns the well-determined directions of the loss first — the large eigenvalues of the curvature — and the weak, noise-dominated directions last. Stopping early leaves the weak directions near their starting values, which is what an L2 penalty does by shrinking them; for gradient descent on least squares the correspondence is roughly α proportional to one over the number of steps times the learning rate, and I have checked it numerically. For boosting the same holds with rounds as the dial: the validation loss turns at some round and every later round fits noise. Pitfalls: the validation fold that chose the stopping round is spent and cannot be the reported score; the built-in validation fraction shrinks the training set; the stopping round depends on the learning rate, so the two are tuned together; and with a noisy validation curve a patience parameter is needed so a single bad round does not stop training early.",
        answer: [
          { t: "p", text: "The eigen-direction mechanism, the numerical check, and the four pitfalls — that is a senior answer." }
        ]
      }
    ]
  }
});

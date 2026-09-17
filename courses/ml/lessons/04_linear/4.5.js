/* ============================================================================
   LESSON 4.5 — Logistic Regression
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**Logistic regression is a linear model for the log-odds: ln(p/(1 − p)) = xᵀβ.** That one assumption gives you the sigmoid, the odds-ratio reading of every coefficient, a loss that is exactly the Bernoulli negative log-likelihood, and a gradient — Xᵀ(p − y) — that has the same shape as linear regression's. This lesson derives all four on the whiteboard, then fits the churn target three ways (gradient descent, Newton's method, and lbfgs) to the same optimum of 314.265 nats, reads the coefficients as odds ratios against the values the data was generated with, and shows the failures that are specific to this model: perfect separation, where the unpenalised coefficient runs to 130 and only a penalty stops it, and a collinear plan/fee pair that flips a sign until you look at the VIF.",

  objectives: [
    "Derive the sigmoid from the log-odds assumption, its derivative σ(1 − σ), and cross-entropy from maximum likelihood",
    "Derive the gradient Xᵀ(p − y), explain why there is no closed form, and why the loss is nevertheless convex",
    "Fit with gradient descent and Newton's method, read coefficients as odds ratios, and tune C",
    "Recognise perfect separation, the linearity-of-the-logit assumption, and the softmax extension"
  ],

  prerequisites: ["4.1", "1.4", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "From odds to the sigmoid", id: "sigmoid" },

    { t: "code", lang: "text", title: "The assumption and everything it implies",
      code: `odds(p) = p / (1 - p)                          in (0, ∞): 0.2 -> 0.25,  0.5 -> 1,  0.8 -> 4
logit(p) = ln( p / (1 - p) )                    in (-∞, ∞): the natural scale for a linear model

ASSUME    logit(p) = β₀ + β₁x₁ + ... + βₚxₚ = xᵀβ          (linear in the log-odds -- not in p)

solve for p:   p / (1 - p) = e^{xᵀβ}   ⇒   p = e^{xᵀβ} / (1 + e^{xᵀβ}) = 1 / (1 + e^{-xᵀβ}) = σ(xᵀβ)

CONSEQUENCE 1   e^{βⱼ} is the odds ratio: one unit more of xⱼ multiplies the odds by e^{βⱼ}, whatever the other features are
CONSEQUENCE 2   σ'(z) = e^{-z} / (1 + e^{-z})²  =  [1 / (1 + e^{-z})] · [e^{-z} / (1 + e^{-z})]  =  σ(z) (1 - σ(z))
CONSEQUENCE 3   the decision boundary p = 0.5 is xᵀβ = 0: a hyperplane. Any other threshold t is xᵀβ = logit(t): the same hyperplane, shifted`,
      caption: "The model is linear — in the log-odds. The sigmoid is not a design choice bolted on to squash outputs into [0, 1]; it is what you get when you solve the linear log-odds assumption for p. Its derivative σ(1 − σ) is the reason the gradient in section 02 comes out clean."
    },

    { t: "viz",
      title: "The sigmoid, and one worked point",
      caption: "With β₀ = −4 and β₁ = 1.5 (hours studied → pass), three hours gives z = 0.5 and p = σ(0.5) = 0.6225. The slope there is σ(1 − σ) = 0.235 per unit of z; the steepest slope, 0.25, is at z = 0. Each extra hour multiplies the odds of passing by e^{1.5} = 4.48.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="The logistic sigmoid curve from z equals minus six to six, rising from near zero to near one, with the point z equals 0.5, p equals 0.62 marked and its tangent line drawn with slope 0.235.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="840" y2="250"/><line x1="80" y1="50" x2="80" y2="250"/><line x1="80" y1="150" x2="840" y2="150" stroke-dasharray="3 5"/><line x1="80" y1="50" x2="840" y2="50" stroke-dasharray="3 5"/></g>
  <g class="s-sub">
    <text x="72" y="254" text-anchor="end">0</text><text x="72" y="154" text-anchor="end">0.5</text><text x="72" y="54" text-anchor="end">1</text>
    <text x="76" y="270">−6</text><text x="203" y="270">−4</text><text x="329" y="270">−2</text><text x="457" y="270">0</text><text x="583" y="270">2</text><text x="709" y="270">4</text><text x="836" y="270">6</text>
    <text x="440" y="292">z = xᵀβ</text>
  </g>
  <line x1="365" y1="220" x2="618" y2="32" style="stroke:var(--warn)" stroke-width="1.4" stroke-dasharray="6 4"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.4" points="80,250 112,249 143,249 175,248 207,246 238,244 270,241 302,235 333,226 365,214 397,196 428,174 460,150 492,126 523,104 555,86 587,74 618,65 650,59 682,56 713,54 745,52 777,51 808,51 840,50"/>
  <circle cx="492" cy="126" r="5" style="fill:var(--warn)"/>
  <circle cx="460" cy="150" r="3.5" style="fill:var(--ink-3)"/>
  <g class="s-label" style="font-weight:600">
    <text x="505" y="118" style="fill:var(--warn)">z = 0.5, p = 0.6225</text>
    <text x="640" y="40" style="fill:var(--warn)">tangent: slope σ(1 − σ) = 0.235</text>
  </g>
  <text x="470" y="170" class="s-sub">z = 0: p = 0.5, slope 0.25 (the maximum)</text>
  <text x="110" y="44" class="s-label" style="fill:var(--accent);font-weight:600">p = σ(z) = 1 / (1 + e⁻ᶻ)</text>
</svg>`
    },

    { t: "dl", items: [
      ["Odds / log-odds (logit)", "p/(1 − p) and its logarithm. Logistic regression is linear on the logit scale; the sigmoid maps back to probability."],
      ["Odds ratio", "e^{βⱼ}: the multiplicative change in odds per unit of xⱼ, holding the others fixed. For a standardised feature, per standard deviation."],
      ["Log-loss / binary cross-entropy", "−Σ[y ln p + (1 − y) ln(1 − p)]: the Bernoulli negative log-likelihood. Minimising it *is* maximum likelihood."],
      ["Gradient Xᵀ(p − y)", "The same form as linear regression's Xᵀ(ŷ − y), with the predicted probability in place of the prediction. No closed form because p is non-linear in β."],
      ["Convex", "The Hessian XᵀSX with S = diag(pᵢ(1 − pᵢ)) is positive semi-definite, so any local optimum is global. Gradient descent, Newton and lbfgs all arrive at the same β."],
      ["Perfect separation", "A hyperplane classifies the training data perfectly; the likelihood rises without bound as the coefficient grows; the MLE does not exist. Regularisation fixes it."],
      ["C", "scikit-learn's inverse penalty strength: C = 1/λ. Small C = strong penalty. Default is L2 with C = 1 — the default model is *already* regularised."],
      ["Softmax", "The K-class generalisation: P(y = k) = e^{xᵀβₖ}/Σⱼe^{xᵀβⱼ}. `LogisticRegression` fits it directly (multinomial); one-vs-rest is the alternative."]
    ]},

    { t: "h2", n: "02", text: "The loss and its gradient, derived", id: "gradient" },

    { t: "code", lang: "text", title: "Maximum likelihood to cross-entropy to Xᵀ(p − y)",
      code: `each label is Bernoulli:   P(y | x) = p^y (1 - p)^{1 - y}          with p = σ(xᵀβ)
likelihood of n independent rows:   L(β) = Π pᵢ^{yᵢ} (1 - pᵢ)^{1 - yᵢ}
negative log-likelihood:            ℓ(β) = -Σ [ yᵢ ln pᵢ + (1 - yᵢ) ln(1 - pᵢ) ]           <- log-loss. Minimising it IS maximum likelihood.

gradient for one row, with z = xᵀβ, p = σ(z):
   ∂ℓ/∂p = -y/p + (1 - y)/(1 - p) = (p - y) / [p (1 - p)]
   ∂p/∂z = p (1 - p)                                                  <- consequence 2 of section 01
   ∂ℓ/∂z = (p - y) / [p (1 - p)] · p (1 - p) = p - y                <- the p(1 - p) cancels exactly
   ∂ℓ/∂β = (p - y) x
over all rows:   ∇ℓ = Xᵀ (p - y)                                      <- linear regression's gradient with p where ŷ was

setting ∇ℓ = 0:  Xᵀ(σ(Xβ) - y) = 0 is non-linear in β  ->  no closed form.
Hessian:  H = Xᵀ S X,  S = diag(pᵢ(1 - pᵢ))  ->  vᵀHv = Σ pᵢ(1 - pᵢ)(xᵢᵀv)² ≥ 0  ->  convex  ->  one optimum, reached by any descent method.

one step by hand (β = [-4, 1.5], x = [1, 3], y = 1):   p = 0.6225;   ∇ = (0.6225 - 1)·[1, 3] = [-0.378, -1.133]
   β ← β - α∇ moves both coefficients UP: p rises toward the label. A true positive pulls the boundary away from itself.`,
      caption: "The cancellation in the third line is why the pair (sigmoid, cross-entropy) is standard: with squared error instead, ∂ℓ/∂z would keep a factor p(1 − p) that vanishes when the model is confidently wrong — a saturated sigmoid has no gradient — and the loss would not be convex. Section 04 shows that non-convexity on six data points."
    },

    { t: "code", lang: "python", title: "Three optimisers, one optimum: the churn target on five standardised features, no penalty (executed, 863 rows, 15.4 % positive)",
      hl: [2, 5, 6, 9, 10, 13],
      code: `# gradient descent, step 0.001 on the summed gradient
# iteration      1: NLL 506.122   ||grad|| 322.2
#               10: NLL 336.852   ||grad||  66.0
#              100: NLL 314.292   ||grad||   1.16
#            1,000: NLL 314.265   ||grad||   0.000        <- converged at ~1,000 steps

# Newton's method: β ← β − H⁻¹∇ with H = XᵀSX (this is IRLS -- iteratively reweighted least squares)
# iteration 1: NLL 341.057   2: 317.280   3: 314.346   4: 314.265   5: 314.265 (||grad|| 0.09)   6: 314.265 (0.0001)     <- six steps

LogisticRegression(penalty=None).fit(Xs, y)      # lbfgs: NLL 314.265
# all three:  [intercept, tenure, fee, logins, tickets, discount] = [-2.123, -0.651, -0.224, -0.758, 0.391, 0.019]
# (standardised, so these are log-odds per standard deviation; e^{-0.758} = 0.47: one sd more logins halves the odds of churning)`,
      caption: "Convexity is what lets three unrelated algorithms land on the same six numbers to three decimals. Newton's method takes six steps because it uses the curvature; gradient descent takes a thousand because it does not; lbfgs approximates the curvature from recent gradients and is the default because it scales to many features where the p × p Hessian does not. The choice of solver changes the time, never the answer."
    },

    { t: "h2", n: "03", text: "Reading the coefficients", id: "coefficients" },

    { t: "code", lang: "python", title: "Odds ratios in raw units against the values the data was generated with (executed; no penalty; plan, region and channel as dummies; fee excluded — see below)",
      hl: [2, 3, 4, 6, 7, 10],
      code: `#                        β         odds ratio      generator's true β
# tenure_months        -0.0372        0.964            -0.035           each month of tenure cuts the odds of churn by 3.6 %
# logins_30d           -0.1581        0.854            -0.10            each login per month cuts them by 15 %
# support_tickets      +0.4626        1.588            +0.55            each ticket multiplies them by 1.59
# discount_pct         -0.0314        0.969             0
# plan_pro (vs basic)  -1.0446        0.352            -1.0             a pro customer has 35 % of a basic customer's odds
# plan_plus (vs basic) -0.0097        0.990            -0.5             <- off by half a unit: 335 plus customers, wide interval
# channel_paid         +0.7147        2.044            +0.5
# region_south         -0.3207        0.726             0 (north +0.5)   <- the north effect is spread across the three other dummies
# intercept            +0.374                                            log-odds of a basic, organic, east-region customer with all numerics at zero`,
      caption: "'Each ticket multiplies the odds of churn by 1.59, holding tenure, logins, plan and channel fixed' is the sentence a stakeholder can act on, and it is a *multiplicative* statement about odds, not an additive one about probability: from p = 0.1 (odds 0.11) a ticket moves to odds 0.18, p = 0.15; from p = 0.5 (odds 1) to odds 1.59, p = 0.61. Same odds ratio, different probability change — the model is linear in log-odds only."
    },

    { t: "callout", kind: "trap", title: "The sign that flipped: fee and plan together", body: [
      { t: "p", text: "With `monthly_fee` in the model alongside the plan dummies, `plan_plus` came out at **+0.655** (odds ratio 1.92 — plus customers churn *more* than basic?) and `plan_pro` at +0.547. Without fee, plus is −0.01 and pro is −1.04, close to the generator. The fee is 7.99, 12.99 or 19.99 by plan plus half a pound of noise, so fee and the plan dummies are almost the same information: **VIF 77 for fee, 84 for plan_pro**. The pair's *joint* effect is estimated fine; its split between them is arbitrary, exactly as in 4.1's collinear example, and a logistic coefficient is as vulnerable as a linear one. Check VIF before you read an odds ratio, and do not put a variable and its near-function in the model together." }
    ]},

    { t: "code", lang: "python", title: "Is the logit actually linear in tenure? Binned empirical log-odds (executed)",
      code: `d.groupby(pd.qcut(d.tenure_months, 8)).churned.mean()  ->  logit = ln(mean / (1 - mean))
# tenure bin        churn rate   n     empirical logit
# (1, 8.75]          0.306      108       -0.82
# (8.75, 16]         0.216      116       -1.29
# (16, 23]           0.209      110       -1.33
# (23, 30]           0.129      101       -1.91
# (30, 38]           0.123      106       -1.97
# (38, 46]           0.090      111       -2.31
# (46, 53]           0.117      103       -2.03       <- one bin against the trend: 12 events in 103 rows
# (53, 60]           0.037      108       -3.26
# roughly a straight line of slope ≈ -0.04 per month: consistent with β = -0.037. Curvature here would call for a spline or a log(tenure) term (4.4).`,
      caption: "The assumption is linearity on the logit scale, and this is the check: bin a feature, compute the empirical log-odds per bin, look for a line. The equivalent of 4.2's residual-by-bin plot. When it bends, the fixes are the same as for linear regression — a transform, a spline, an interaction — because this is a linear model."
    },

    { t: "h2", n: "04", text: "Regularisation, separation and the non-convex alternative", id: "failures" },

    { t: "code", lang: "python", title: "C from 0.001 to 1,000 on the churn target with dummies, 5-fold out-of-fold predictions (executed)",
      hl: [4, 5],
      code: `#   C        log-loss    AUC      Brier    ||coef||   max |coef|
#   0.001     0.4176    0.7487    0.1272     0.11       0.06      <- everything shrunk to nothing: the model is almost the base rate
#   0.01      0.3851    0.7536    0.1179     0.51       0.30
#   0.1       0.3726    0.7558    0.1135     0.96       0.61      <- best, by a hair
#   1         0.3742    0.7550    0.1136     1.11       0.73      <- the default
#   10        0.3753    0.7529    0.1139     1.23       0.76
#   1000      0.3757    0.7520    0.1140     1.28       0.76      <- effectively unpenalised
# 863 rows, 11 columns: the same story as 4.3 -- little variance to remove, so the penalty barely matters. Tune C anyway; it costs nothing.`,
      caption: "C is 1/λ, so the table runs from strongest penalty to none. The important row is the last: the default C = 1 is a regularised model, and a coefficient read from it is shrunk. **For odds ratios you intend to interpret, fit with `penalty=None`** (or a very large C) and report intervals from statsmodels' `Logit`; for prediction, tune C by CV as you would any hyperparameter."
    },

    { t: "code", lang: "python", title: "Perfect separation: 40 points, y = 1 exactly when x > 0.2 (executed)",
      hl: [3, 4, 6, 7],
      code: `#   C           coef      intercept    train log-loss
#   1            2.67       -0.69         0.2502
#   100         15.11       -2.69         0.0544
#   10,000      68.41      -11.52         0.0035
#   1,000,000  126.24      -20.91         0.0002        <- still growing; the loss still falling
#   penalty=None:  coef 130.4 after 17 iterations, and the solver stops only because the gradient is numerically zero on a saturated sigmoid
#   the boundary is at x = -intercept/coef = 0.166 in every row; only the STEEPNESS is unidentified`,
      caption: "When a hyperplane separates the classes perfectly, every row's p can be pushed toward its label by making β larger in the same direction, so the likelihood increases without bound and the maximum does not exist. Symptoms: coefficients in the hundreds, convergence warnings, probabilities of 0.0000 and 1.0000. It happens with small data and many features, and with a leaking feature — 1.5's `refund_issued` nearly separates the churn target. The fix is a penalty (any finite C), Firth's correction for inference, or removing the offending feature."
    },

    { t: "code", lang: "text", title: "Why not squared error through the sigmoid? A six-point counter-example (executed)",
      code: `x = [3.65, -6.16, 1.92, 0.14, 2.64, 0.77],   y = [1, 1, 1, 0, 1, 1],   model p = σ(w x), no intercept
mean squared error  (p - y)²   has TWO local minima in w:   w = 0.11 (MSE 0.2445)  and  w = 2.04 (MSE 0.2259)
log-loss                        has ONE:                     w = 0.09
gradient descent on MSE started from w > 1 finds the wrong minimum and stays; on log-loss any start finds the only one.`,
      caption: "Squared error on a sigmoid output is not convex because the sigmoid is not; the p(1 − p) factor that cancelled in the cross-entropy gradient survives and multiplies the squared-error gradient, flattening the loss wherever the model is confident. Log-loss is convex, smooth, and the likelihood — three reasons it is the objective, and the same three reasons accuracy is not (it is a step function with zero gradient everywhere)."
    },

    { t: "code", lang: "python", title: "Softmax: predict plan (basic/plus/pro) from four numerics, 5-fold (executed)",
      hl: [2, 3, 8, 9, 10],
      code: `#                  log-loss    accuracy      (majority-class accuracy 0.460)
# multinomial       0.6610      0.694        <- one softmax over three linear scores, fitted jointly: probabilities sum to 1 by construction
# one-vs-rest       0.6945      0.676        <- three independent binary models, probabilities renormalised afterwards

# softmax coefficients, 3 classes × 4 standardised features (scikit-learn's symmetric parametrisation: each column sums to 0)
#             tenure    logins   tickets  discount
#   basic     -0.002    -2.000    -0.071    -0.021        <- logins is the whole story (generator: Poisson 8 / 12 / 18 by plan)
#   plus      -0.074     0.039    -0.111     0.110
#   pro        0.076     1.961     0.182    -0.089
# row 0: logits [0.953, 0.696, -1.650]  ->  softmax  e^z / Σe^z  =  [0.541, 0.419, 0.040]  =  predict_proba`,
      caption: "For K classes, fit K linear scores and normalise their exponentials: P(y = k) = e^{zₖ}/Σⱼe^{zⱼ}. The binary sigmoid is the K = 2 case with one score fixed at zero. Multinomial is the default in scikit-learn and is better calibrated than one-vs-rest because it is one likelihood, not three; one-vs-rest is what you use when the base estimator has no multiclass form (SVM, 5.3)."
    },

    { t: "code", lang: "python", title: "class_weight='balanced' moves the intercept, not the ranking (executed)",
      code: `#                        intercept    mean p̂    base rate    AUC      log-loss    recall at 0.5
# class_weight=None        -2.164       0.154      0.154      0.7550    0.3742        0.128
# class_weight=balanced    -0.443       0.422      0.154      0.7531    0.5816        0.722
# the same ranking (AUC), a much better recall at 0.5, and probabilities that are no longer probabilities (mean 0.42 against a rate of 0.15)`,
      caption: "Re-weighting the minority class is nearly equivalent to shifting the intercept by ln(w₁/w₀) — which is what a threshold change does for free (2.3). Use it when you want the default 0.5 threshold to mean 'balanced cost', and never read the output as a calibrated probability afterwards; 8.2 treats imbalance in full."
    },

    { t: "ladder",
      title: "A churn model whose coefficients will be shown to the retention team",
      rungs: [
        { level: "bad", label: "Default fit, raw features, coefficients pasted into a slide", code: `LogisticRegression().fit(X_raw, y).coef_`,
          note: "**Shrunk (C = 1), in mixed units, with collinear fee and plan, possibly on a leaking column.** The numbers are wrong in four independent ways and each looks like a finding." },
        { level: "ok", label: "Pipeline, standardised, C tuned, odds ratios reported", code: `GridSearchCV(make_pipeline(pre, LogisticRegression(max_iter=2000)), {"logisticregression__C": np.logspace(-3, 2, 11)}, cv=5, scoring="neg_log_loss")
np.exp(best.coef_)      # odds ratios per standard deviation`,
          note: "**A sound predictive model.** The odds ratios are still from a penalised fit, with no intervals, and fee-versus-plan is still unresolved." },
        { level: "best", label: "Prediction and inference as two fits; VIF and separation checked; intervals reported", code: `# prediction: the tuned pipeline above
# inference:  drop fee (VIF 77), fit unpenalised, report exp(coef) with 95 % CIs
sm.Logit(y, sm.add_constant(X_inf)).fit()      # .conf_int() -> exp() -> odds ratios with intervals; .summary() flags separation as non-convergence
# every coefficient that will be shown: check the binned logit is linear, and that the feature is not post-outcome (1.5)`,
          note: "**The predictive model predicts; the inferential model explains, with intervals, on a design where each coefficient means one thing.** That separation is the professional habit." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Newton by hand, then a separation you must diagnose",
      difficulty: "core",
      minutes: 32,
      body: [
        { t: "p", text: "**(a)** With β = [−4, 1.5] and a student who studied 3 hours and failed (y = 0), compute p, the gradient, and the Hessian contribution xxᵀ·p(1 − p) for this one row; state which direction a step moves β and why. **(b)** Implement Newton's method (IRLS) on the churn numerics and confirm it reaches NLL 314.265 in six iterations; then run gradient descent with step 0.01 instead of 0.001 and report what happens. **(c)** Add `refund_issued` to the churn features and fit with `penalty=None`; report the coefficient, its odds ratio, the training log-loss, and any warning; then fit with C = 1 and explain, in terms of separation, what changed and why the odds ratio is not a finding." }
      ],
      requirements: [
        "(a) p, ∇, the 2×2 Hessian term, and the direction of the step.",
        "(b) the Newton trace, and the gradient-descent behaviour at the larger step.",
        "(c) the two fits and the separation diagnosis."
      ],
      hint: "(a) ∇ = (p − y)x with y = 0 is now positive. (b) IRLS: solve (XᵀSX)δ = Xᵀ(y − p) each iteration. (c) `refund_issued` is 1 for 85 % of churners and 2 % of others — not perfect separation, but quasi-separation on the subset where it is 1.",
      solution: {
        lang: "python",
        title: "logistic_practice.py (executed where marked)",
        code: `# (a) z = -4 + 1.5*3 = 0.5, p = 0.6225, y = 0
#   gradient = (p - y) x = 0.6225 * [1, 3] = [0.623, 1.868]         positive: the step β ← β − α∇ moves both DOWN, pulling p toward 0
#   Hessian term = p(1-p) x xᵀ = 0.235 * [[1, 3], [3, 9]] = [[0.235, 0.705], [0.705, 2.115]]     positive semi-definite (rank 1), as every row's is
#   with y = 1 (the lesson) the same magnitudes point the other way; the model is pulled toward each label in proportion to how wrong it is

# (b) executed: Newton reaches 341.06 -> 317.28 -> 314.35 -> 314.265 -> 314.265 -> 314.265 (||grad|| 0.0001) in six steps.
#   gradient descent at step 0.01 on the SUMMED gradient (863 rows): the first step overshoots (||∇|| = 322 -> a 3.2-unit move) and
#   the iterates oscillate or diverge; the fix is the mean gradient (divide by n) or a line search, which is what lbfgs does.
#   the summed gradient's scale grows with n; the step size that worked at n = 863 is wrong at n = 86,300. Normalise the loss by n.

# (c) sketch -- run it:
X_leak = np.c_[Xs, d.refund_issued.values]
m0 = LogisticRegression(penalty=None, max_iter=5000).fit(X_leak, y)       # expect a refund coefficient of +4 to +6 (odds ratio in the hundreds),
                                                                          # training log-loss far below 314/863 = 0.364, and possibly a convergence warning
m1 = LogisticRegression(C=1).fit(X_leak, y)                               # a smaller coefficient, similar ranking
# diagnosis: refund_issued is 1 for 85 % of churners and 2 % of others, so on the rows where it is 1 the classes are nearly separated
# (quasi-separation): the likelihood keeps improving as that coefficient grows and the unpenalised estimate is unstable and huge.
# the odds ratio is not a finding because (i) refunds are issued AFTER churn -- it is the outcome, recoded (1.5) -- and (ii) even
# if it were legitimate, a quasi-separated coefficient's magnitude is an artefact of the sample, not an effect size.`,
        notes: [
          { t: "p", text: "**(a)**: the same x and the same |∇| for y = 0 and y = 1, opposite signs — the update is 'move toward the label, proportionally to the error', for every row at once." },
          { t: "p", text: "**(b)** is a step-size lesson disguised as an optimiser lesson: the summed gradient's scale depends on n, which is why every library normalises the loss and why lbfgs's line search exists." },
          { t: "p", text: "**(c)** combines the two failures specific to this lesson — separation and a post-outcome feature — and they arrive together in practice, because a leak is the commonest cause of separation." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Gradient descent, Newton's method and lbfgs reached the same coefficients to three decimals. What guarantees that?",
          options: [
            "They use the same learning rate",
            "The log-loss is convex — its Hessian XᵀSX has vᵀHv = Σpᵢ(1 − pᵢ)(xᵢᵀv)² ≥ 0 — so it has one optimum and every descent method converges to it; the solver changes the time (1,000 steps, 6, or a few dozen), never the answer",
            "scikit-learn checks the answer",
            "The features were standardised"
          ],
          answer: 1,
          why: "Squared error through the sigmoid is not convex (two minima on six points); cross-entropy is. That is the reason for the pairing."
        }
      ]
    }
  ],

  takeaways: [
    "**One assumption — logit(p) = xᵀβ — gives the sigmoid, the odds-ratio reading, and a linear decision boundary** xᵀβ = logit(t).",
    "**σ'(z) = σ(1 − σ)**; cross-entropy is the Bernoulli negative log-likelihood; their gradient is **Xᵀ(p − y)**, the p(1 − p) cancelling exactly.",
    "**No closed form, but convex**: gradient descent (~1,000 steps), Newton/IRLS (6 steps) and lbfgs all reach NLL 314.265 and the same six coefficients.",
    "**e^{βⱼ} multiplies the odds per unit of xⱼ**: tickets 1.59, logins 0.85, pro plan 0.35 — multiplicative in odds, not additive in probability.",
    "**Check VIF before reading an odds ratio**: fee and plan (VIF 77 and 84) flipped plan_plus from −0.01 to +0.66.",
    "**Check the logit is linear** with binned empirical log-odds; fix curvature with the same tools as linear regression.",
    "**C = 1/λ, and the default is regularised**; tune C for prediction, fit `penalty=None` with intervals for inference.",
    "**Perfect separation**: coefficients run to 130 and the MLE does not exist; a penalty, Firth, or removing the feature (usually a leak) fixes it.",
    "**Softmax for K classes**, fitted jointly (log-loss 0.661 vs one-vs-rest 0.695); the sigmoid is K = 2.",
    "**class_weight shifts the intercept** (−2.16 → −0.44), keeps the ranking, and destroys calibration — a threshold change in disguise."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Derive the gradient of the log-loss with respect to β for one row.",
        options: [
          "∇ = (y − p)² x",
          "∂ℓ/∂p = (p − y)/[p(1 − p)]; ∂p/∂z = p(1 − p); the product is ∂ℓ/∂z = p − y; and ∂z/∂β = x, so ∇ = (p − y)x — over all rows Xᵀ(p − y), the same form as linear regression's gradient with p in place of ŷ",
          "∇ = Xᵀ(y − Xβ)",
          "∇ = σ(z)(1 − σ(z))"
        ],
        answer: 1,
        why: "The cancellation of p(1 − p) is the reason the sigmoid and cross-entropy are paired."
      },
      {
        stem: "Why can linear regression not simply be used for a binary target?",
        options: [
          "It can; the results are identical",
          "Its predictions are unbounded and can leave [0, 1]; a squared-error loss through a sigmoid is non-convex (two minima on six points) and its gradient vanishes when the model is confidently wrong; and it has no likelihood interpretation. Logistic regression fixes all three by modelling the log-odds",
          "Because the target is not normally distributed",
          "Because the sigmoid is faster"
        ],
        answer: 1,
        why: "The linear probability model is used in some econometrics for its interpretability, but for prediction and calibration the logit is the tool."
      },
      {
        stem: "A coefficient on `support_tickets` is +0.46. Interpret it for a stakeholder, correctly.",
        options: [
          "Each ticket increases the probability of churn by 46 %",
          "Each additional ticket multiplies the odds of churn by e^{0.46} = 1.59, holding the other features fixed; the change in probability depends on where you start (from 10 % to 15 %, from 50 % to 61 %), because the model is linear in log-odds, not in probability",
          "Each ticket adds 0.46 to the probability",
          "Tickets are the most important feature"
        ],
        answer: 1,
        why: "An odds ratio is the correct unit; a percentage-point change must be computed at a reference point."
      },
      {
        stem: "The fit warns of non-convergence and one coefficient is 130. What happened and what do you do?",
        options: [
          "Increase max_iter",
          "A feature (or combination) separates the classes perfectly or nearly so, so the likelihood rises without bound as the coefficient grows and the MLE does not exist; check for a leaking or post-outcome feature first, then regularise (any finite C), or use Firth's correction if the coefficient must be reported",
          "The learning rate is too high",
          "Remove the intercept"
        ],
        answer: 1,
        why: "Separation with 40 points: coef 2.67 at C = 1, 126 at C = 10⁶, 130 unpenalised — and a leak is the commonest cause."
      },
      {
        stem: "How does logistic regression extend to three classes, and which of the two ways is preferable?",
        options: [
          "Only one-vs-rest is possible",
          "Softmax (multinomial): fit K linear scores and set P(y = k) = e^{zₖ}/Σe^{zⱼ}, one joint likelihood, probabilities sum to 1 by construction — log-loss 0.661 on the plan target; one-vs-rest fits K binary models and renormalises — 0.695 — and is the fallback for estimators with no multiclass form",
          "Fit K − 1 pairwise models",
          "Use a decision tree instead"
        ],
        answer: 1,
        why: "The binary sigmoid is softmax with K = 2 and one score fixed at zero."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain logistic regression from first principles, including the loss and its gradient.",
        strong: "It assumes the log-odds of the positive class are linear in the features, logit(p) = xᵀβ. Solving that for p gives the sigmoid, p = 1/(1 + e^{−xᵀβ}), so the sigmoid is a consequence, not a choice, and e^{βⱼ} is the odds ratio per unit of xⱼ. Each label is Bernoulli with probability p, so the likelihood is Πp^y(1 − p)^{1−y} and its negative log is the cross-entropy, −Σ[y ln p + (1 − y) ln(1 − p)]; minimising log-loss is maximum likelihood. Differentiating: ∂ℓ/∂p is (p − y)/(p(1 − p)), ∂p/∂z is p(1 − p) because σ' = σ(1 − σ), they cancel to p − y, and the gradient in β is Xᵀ(p − y) — the same shape as linear regression's. There is no closed form because p is non-linear in β, but the Hessian XᵀSX is positive semi-definite so the loss is convex and any method finds the one optimum: on the churn data gradient descent in a thousand steps, Newton in six, lbfgs by default, all to the same coefficients.",
        answer: [
          { t: "p", text: "Assumption → sigmoid → odds ratio → likelihood → loss → gradient with the cancellation → convexity, with the executed convergence." }
        ]
      },
      {
        level: "core",
        q: "What is perfect separation and how do you deal with it?",
        strong: "When some hyperplane classifies every training row correctly, every row's probability can be pushed toward its label by scaling β up along that direction, so the likelihood keeps increasing and never reaches a maximum — the MLE does not exist. You see coefficients in the hundreds, non-convergence warnings, and predicted probabilities of exactly 0 and 1. On forty separable points the coefficient was 2.7 at C = 1, 126 at C = 10⁶ and 130 unpenalised, with the boundary in the same place throughout — only the steepness is unidentified. It happens with small data and many features, and very often because a feature leaks the outcome; so the first thing I do is ask whether the separating feature is post-outcome. If it is legitimate, any finite regularisation gives a finite estimate, Firth's penalised likelihood gives one with usable inference, and I never report the unpenalised odds ratio, because its magnitude is an artefact of the sample.",
        answer: [
          { t: "p", text: "Mechanism, symptoms, executed numbers, the leak connection, and the three fixes." }
        ]
      },
      {
        level: "advanced",
        q: "Your logistic coefficient on 'plus plan' is positive in one specification and negative in another. What is going on and what do you report?",
        strong: "Almost certainly collinearity between the plan dummies and something that is a function of plan — in the churn data, the monthly fee is 7.99, 12.99 or 19.99 by plan plus noise, so with fee in the model the VIFs were 77 for fee and 84 for plan_pro, and plan_plus came out at +0.66 with fee included and −0.01 without. The joint effect of the pair is well estimated; how it splits between them is decided by noise, exactly as in linear regression, and a logistic coefficient is no more protected than an OLS one. I would report from a specification where each coefficient has one meaning — drop fee, or drop plan, depending on which question is being asked — fitted without a penalty so the estimate is not shrunk, with confidence intervals from the Hessian, and I would say explicitly that fee and plan cannot be separated by this data. And I keep that inferential model distinct from the predictive pipeline, where I would keep both columns and tune C, because for prediction the split does not matter.",
        answer: [
          { t: "p", text: "Collinearity diagnosed with VIF, the executed flip, the fix, and the prediction-versus-inference separation." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.6 — Generalised Linear Models and Robust Losses
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**Linear regression and logistic regression are the same model with two dials turned differently: which distribution the target follows, and which function links its mean to xᵀβ.** Turn the dials to Poisson and log and you have a regression for counts whose coefficients are rate ratios and whose exposure goes in as an offset; turn them to Gamma and log and you have one for positive skewed amounts that never predicts −50.9 where OLS did. This lesson builds the generalised linear model from its three parts, fits Poisson by hand with five IRLS steps that match statsmodels to four decimals, shows the pitfall that costs the most in practice — overdispersion, which drops a 95 % interval's coverage to 79.5 % — and then changes the loss instead of the distribution: Huber, which cut a contaminated fit's error from 62.3 to 16.7, and quantile regression, whose 10th–90th band is 91 units wide for new customers and 24 for old ones.",

  objectives: [
    "State the three components of a GLM and place linear, logistic, Poisson, Gamma and Tweedie regression in one table",
    "Fit Poisson regression by IRLS, interpret rate ratios, use an offset for exposure, and read deviance",
    "Diagnose overdispersion and fix it with negative binomial or quasi-Poisson; choose Gamma or Tweedie for positive and zero-inflated amounts",
    "Replace squared error with Huber or pinball loss when the residuals are heavy-tailed or the question is a quantile"
  ],

  prerequisites: ["4.1", "4.5", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "One model, three components", id: "glm" },

    { t: "code", lang: "text", title: "The generalised linear model",
      code: `1. RANDOM component       y ~ an exponential-family distribution with mean μ         (Normal, Bernoulli, Poisson, Gamma, Tweedie, ...)
2. SYSTEMATIC component   η = xᵀβ                                                     (the linear predictor -- always linear)
3. LINK                   g(μ) = η,  so  μ = g⁻¹(xᵀβ)                                 (the scale on which the model is linear)

model                distribution     link g(μ)          mean μ             range of μ     e^{βⱼ} means
linear regression    Normal           identity  μ        xᵀβ                any            (additive: βⱼ itself)
logistic (4.5)       Bernoulli        logit  ln μ/(1-μ)  σ(xᵀβ)             (0, 1)         odds ratio
Poisson              Poisson          log  ln μ          e^{xᵀβ}            (0, ∞)         rate ratio
Gamma                Gamma            log (canonical is inverse)  e^{xᵀβ}   (0, ∞)         multiplicative change in the mean
negative binomial    NB               log                e^{xᵀβ}            (0, ∞)         rate ratio, with an extra dispersion parameter
Tweedie (1 < p < 2)  compound Poisson-Gamma   log        e^{xᵀβ}            [0, ∞)         multiplicative; allows exact zeros

fitted by maximum likelihood; no closed form except the Normal/identity case; solved by IRLS (Newton, as in 4.5), which converges in a handful of steps.
mean-variance relationship is fixed by the family:   Normal Var = σ²,   Poisson Var = μ,   Gamma Var = φμ²,   Tweedie Var = φμᵖ,   NB Var = μ + αμ²`,
      caption: "Everything in modules 4.1–4.5 is a row of this table. What the family buys you is the *right variance* — counts vary more when their mean is higher, amounts vary in proportion to their size — and what the link buys you is a mean that stays in range and coefficients that multiply. The last line is the one to remember: each family is a claim about how the variance grows with the mean, and section 03 is what happens when the claim is wrong."
    },

    { t: "dl", items: [
      ["Link function", "g(μ) = xᵀβ. Log for counts and amounts (multiplicative effects, μ > 0), logit for probabilities, identity for the Normal. The *canonical* link makes the maths cleanest; the log link is the practical choice for Gamma."],
      ["Rate ratio", "e^{βⱼ} under a log link: one unit more of xⱼ multiplies the expected count (or amount) by e^{βⱼ}. β = 0.4 → 1.49, a 49 % increase."],
      ["Offset", "A term in the linear predictor with coefficient fixed at 1. ln(exposure) as an offset turns a count model into a rate model: ln μ = ln(exposure) + xᵀβ."],
      ["Deviance", "2[ℓ(saturated) − ℓ(model)]: the GLM's residual sum of squares. Poisson: 2Σ[y ln(y/μ̂) − (y − μ̂)]. Null deviance is the intercept-only model's; 1 − D/D₀ is a pseudo-R²."],
      ["Dispersion φ", "Pearson χ²/df. Should be ≈ 1 for Poisson and Bernoulli. Larger means the data vary more than the family allows — overdispersion."],
      ["Overdispersion", "Var(y) > μ for a count. Coefficients stay roughly right; standard errors are too small; every p-value is too optimistic. Fix: negative binomial, quasi-Poisson, or robust SEs."],
      ["Huber loss", "½r² for |r| ≤ δ, δ(|r| − δ/2) beyond: squared error near zero, absolute error in the tails, differentiable everywhere. Gradient capped at ±δ."],
      ["Pinball (quantile) loss", "ρ_τ(r) = r(τ − 1[r < 0]): τ|r| for under-prediction, (1 − τ)|r| for over-prediction. Minimised by the τ-th conditional quantile; τ = 0.5 is median regression (LAD)."]
    ]},

    { t: "h2", n: "02", text: "Poisson regression: counts, rates and IRLS", id: "poisson" },

    { t: "code", lang: "python", title: "support_tickets as a count target — a model that correctly finds nothing (executed, 863 rows)",
      hl: [1, 8, 9, 10],
      code: `# tickets: mean 0.791, variance 0.775, values {0: 396, 1: 295, 2: 131, 3: 38, 4: 3}       <- mean ≈ variance: Poisson-shaped
sm.GLM(tickets, X, family=sm.families.Poisson()).fit()          # X = tenure, logins, plan dummies
#                     coef     std err       z      P>|z|      rate ratio e^coef
#   const           -0.1032     0.125     -0.82     0.411          0.902
#   tenure_months   -0.0001     0.002     -0.04     0.971          1.000
#   logins_30d      -0.0132     0.011     -1.18     0.238          0.987
#   plan_plus       -0.0944     0.098     -0.97     0.334          0.910
#   plan_pro         0.3179     0.157      2.02     0.043          1.374      <- one nominal hit among five tests (2.6)
# deviance 956.2 on 858 df; null deviance 966.5 -> pseudo-R² 0.011;  dispersion = Pearson χ²/df = 837.1/858 = 0.976
# the generator draws tickets from Poisson(0.8) independently of every feature. The model says so: nothing explains them, and φ ≈ 1.`,
      caption: "A negative result, reported honestly, because that is what the data contain. Three things are still worth reading: the dispersion of 0.976 says the Poisson variance assumption holds; the pseudo-R² of 0.011 says the features explain nothing; and the one p-value under 0.05 in five is what 2.6 said to expect from noise. Linear regression on the same count happens to be harmless here (its lowest prediction is 0.59) because the mean is 0.8 and the effects are nil; with a wider range of rates it would predict negative counts."
    },

    { t: "code", lang: "text", title: "IRLS by hand for the Poisson model (executed): Newton's method as a sequence of weighted least squares",
      code: `at each step, with η = Xβ and μ = e^η:
   working weights   W = μ                                (Var(y) under Poisson, times (dμ/dη)² / Var = μ for the log link)
   working response  z = η + (y - μ) / μ                  (a first-order move of η toward y)
   β_new = (XᵀWX)⁻¹ XᵀWz                                  (a weighted least-squares fit of z on X)

iteration   max |Δβ|      log-likelihood
    1       2.7 × 10⁻¹     -838.123
    2       4.5 × 10⁻²     -837.624
    3       1.1 × 10⁻³     -837.624
    4       1.2 × 10⁻⁶     -837.624
    5       9.4 × 10⁻¹³    -837.624      <- converged
IRLS β = [-0.1032, -0.0001, -0.0132, -0.0944, 0.3179]     statsmodels: identical to four decimals`,
      caption: "Every GLM is fitted this way, and 4.5's Newton step for logistic regression was the Bernoulli case (W = p(1 − p)). The weights are the family's variance function — the model automatically down-weights rows whose y is expected to vary more — which is why choosing the right family matters for the coefficients, not only for the standard errors."
    },

    { t: "code", lang: "python", title: "Exposure: events counted over different observation windows (executed, simulated, true β₁ = 0.6, true rate at x = 0 is e^{0.2} = 1.221)",
      hl: [3, 4, 5],
      code: `# y ~ Poisson(exposure × e^{0.2 + 0.6x}),  exposure uniform on [0.5, 5]
#   ignore exposure entirely                      β₁ = 0.601      <- fine here only because exposure was drawn independently of x
#   offset = log(exposure)                        β₁ = 0.602,  e^{intercept} = 1.210 events per unit exposure      <- the rate model
#   log(exposure) as an ordinary feature          β₁ = 0.602,  its coefficient = 1.015                             <- the data confirm the offset's fixed 1
sm.GLM(y, X, family=sm.families.Poisson(), offset=np.log(exposure)).fit()      # PoissonRegressor has no offset: divide y by exposure and pass sample_weight=exposure instead`,
      caption: "ln μ = ln(exposure) + xᵀβ is ln(μ/exposure) = xᵀβ: the model is for the *rate*, and the intercept is the rate per unit exposure. When exposure is correlated with the features — longer-tenured customers observed for longer, larger policies held for more years — leaving it out biases every coefficient; the offset is the fix, and fitting log(exposure) as a free feature is the check that it deserves a coefficient of 1."
    },

    { t: "h2", n: "03", text: "When the family is wrong: overdispersion, Gamma, Tweedie", id: "families" },

    { t: "code", lang: "python", title: "Overdispersion: counts generated negative-binomially, fitted as Poisson (executed, n = 2,000; true β₁ = 0.4)",
      hl: [2, 3, 4, 5, 9],
      code: `# sample: mean 1.837, variance 3.989  (Poisson would need them equal)
#   Poisson GLM         β₁ = 0.382    se 0.0170    dispersion φ = 1.77      <- the coefficient is fine; the se is too small by √1.77
#   negative binomial   β₁ = 0.386    se 0.0234    α = 0.425 (Var = μ + αμ²)
#   quasi-Poisson       β₁ = 0.382    se 0.0226               <- same β, se scaled by √φ
#   Poisson + HC0       β₁ = 0.382    se 0.0244               <- sandwich se, no distributional claim at all

# 200 simulations of n = 500: does the 95 % interval for β₁ contain 0.4?
#   Poisson          79.5 %       <- nominal 95: one interval in five is wrong
#   quasi-Poisson    93.0 %`,
      caption: "Real counts are almost always overdispersed — unobserved heterogeneity between rows adds variance beyond the Poisson's μ — so this is the pitfall, not an edge case. The point estimates barely move; what breaks is inference, silently: every standard error is too small by about √φ and every p-value too optimistic. Check φ = Pearson χ²/df after any Poisson fit; above about 1.2, switch to negative binomial (which models the extra variance and is a better predictor too) or scale the errors."
    },

    { t: "code", lang: "python", title: "Gamma: claim sizes with Var ∝ μ² (executed, simulated: y ~ Gamma(shape 2, mean e^{4 + 0.5x₁ − 0.3x₂}), n = 1,500)",
      hl: [2, 3, 4, 5, 12],
      code: `# y: mean 63, sd 63, skew 2.43         5-fold CV MAE    top-decile MAE    min prediction    coefficients
#   OLS                                       36.09          107.24            -50.9           [29.3, -18.4]      <- a negative claim size, and additive coefficients for a multiplicative truth
#   Gamma, log link                           34.40          103.54              8.1           [0.470, -0.301]    <- true [0.5, -0.3]
#   Tweedie, power 1.5                        34.40          103.55              8.1           [0.470, -0.301]
#   OLS on log(y), exp'd back                 33.54          125.36              6.5           [0.470, -0.288]    <- predicts the geometric mean: total predicted / total actual = 0.762

# is the variance really ∝ μ²?  bin the rows by fitted mean:
#   fitted mean     25.5    40.9    54.6    73.9   121.6
#   var / mean²     0.59    0.48    0.48    0.55    0.60       <- flat: Gamma's claim holds (≈ 1/shape = 0.5; statsmodels' dispersion estimate 0.493)
#   var / mean      15.0    19.5    26.1    40.9    72.8       <- rising: Poisson's claim would not`,
      caption: "Three models with the same log-linear mean. The GLM recovers the coefficients and never goes negative. The log-transform trick is the one to be wary of: OLS on ln y, exponentiated, estimates the conditional *median* (geometric mean), which for a right-skewed target sits well below the mean — here total predictions come to 76 % of total claims, a 24 % under-reserve. If you need E[y] in the original units, model it directly with a log link. The binned variance table is the diagnostic that picks the family: flat var/μ² says Gamma, flat var/μ says Poisson."
    },

    { t: "code", lang: "python", title: "Tweedie: 75 % exact zeros, Gamma-sized claims otherwise — the insurance pure-premium shape (executed, n = 3,000)",
      code: `#                                CV MAE    Tweedie deviance    min prediction    Σ predicted / Σ actual
#   OLS                          59.88        3,035              0.0               1.013
#   Poisson (p = 1)              59.38           25.5            4.4               1.000
#   Tweedie p = 1.5              59.28           25.5            4.1               0.998
#   Tweedie p = 1.8              59.20           25.5            3.9               0.997
#   Gamma: cannot be fitted -- 2,255 rows are exactly 0 and Gamma's support is y > 0`,
      caption: "A compound Poisson–Gamma target — a Poisson number of claims, each Gamma-sized — has a point mass at zero and a long right tail, and Tweedie with 1 < p < 2 is its distribution. On MAE the models are within a unit of each other because MAE is dominated by the zeros; on deviance, the likelihood-based score, OLS is off by two orders of magnitude and its predictions include zeros that a rate can never be. Tune p by CV on deviance; frequency × severity as two GLMs is the classical alternative and is what 8.4 compares."
    },

    { t: "callout", kind: "mental", title: "Family is about the variance; link is about the mean", body: [
      { t: "p", text: "Two independent questions. *How does the spread of y grow with its mean?* Not at all → Normal; linearly → Poisson (or NB if faster); with the square → Gamma; with a spike at zero → Tweedie. *On what scale are the effects additive?* The raw scale → identity; the log scale (effects multiply, mean stays positive) → log; the log-odds scale → logit. A Poisson family with an identity link is legal and occasionally right (a rate that is genuinely a sum of contributions) — on the simulated data it fitted a minimum mean of −0.75, which is why the log link is the default. And a choice of loss (section 04) is a choice of family in disguise: squared error is the Normal likelihood, absolute error is the Laplace." }
    ]},

    { t: "h2", n: "04", text: "Changing the loss instead: Huber and quantile regression", id: "robust" },

    { t: "code", lang: "text", title: "Three losses on one residual r = y − ŷ, and their gradients",
      code: `squared      ½ r²                       gradient  r              every residual pulls in proportion to its size: a residual of 50 pulls 50× harder than one of 1
absolute     |r|                        gradient  sign(r)        every residual pulls equally; not differentiable at 0; the solution is the conditional median
Huber (δ)    ½ r²          |r| ≤ δ      gradient  r              squared in the middle...
             δ (|r| - δ/2) |r| > δ      gradient  δ · sign(r)    ...absolute in the tails: no residual can pull harder than δ

δ = 1:   r = 0.5 -> loss 0.125 (same as ½r²)      r = 2 -> loss 1.5 (½r² would be 2)      r = 5 -> loss 4.5 (½r² would be 12.5)
δ → ∞ recovers squared error; δ → 0 recovers absolute error (scaled). Applied on the residual/σ̂ scale, so σ̂ is estimated alongside β.

pinball (τ)  τ · r            r ≥ 0    (under-prediction)       gradient  τ
             (1 - τ) · (-r)   r < 0    (over-prediction)        gradient  -(1 - τ)
τ = 0.9: under-predicting costs 9× what over-predicting does -> the minimiser sits where 90 % of the y fall below it -- the 90th conditional percentile.`,
      caption: "A loss is a statement about which errors you care about. Squared error cares about the big ones quadratically, which is right when big errors are rare and Gaussian and wrong when they are contamination. Huber's capped gradient is the mechanism: a wild point can move the fit by at most δ, however far away it is. The pinball loss's asymmetry is a different mechanism for a different question — not 'what is the typical y' but 'what value will y stay below τ of the time'."
    },

    { t: "code", lang: "python", title: "Spend on three features with 5 % of the targets multiplied by 10 (executed, 989 rows, standardised features)",
      hl: [2, 3, 4, 5, 6],
      code: `#                        coefficients [tenure, fee, discount]    intercept     MAE against the CLEAN targets
#   OLS on clean y        [18.58,  44.23,  -9.03]                   --           (the reference conditional mean)
#   OLS on contaminated   [32.35,  83.58,   4.91]                  181.7         62.28       <- every coefficient wrong, one sign flipped
#   Huber, ε = 1.35       [ 6.88,  49.30,  -7.94]                  130.3         16.74
#   Huber, ε = 3          [18.48,  46.01,  -6.69]                  127.9         19.58       <- closest to the clean OLS coefficients
#   quantile τ = 0.5      [ 4.99,  49.42,  -8.27]                  130.9         16.69       <- median regression; matches Huber 1.35 because both target the middle
# (Huber and LAD estimate the conditional median-ish, and the clean median fit is [5.7, 49.3, -8.6]: the tenure coefficient differs from the mean's because spend
#  has a kink at tenure 12 -- see 4.4 -- and the median and the mean of a skewed conditional distribution are different targets)`,
      caption: "Fifty contaminated rows out of 989 quadruple OLS's error and flip a sign, because each of those rows is a residual of hundreds pulling with the full square. Huber and the median ignore them almost entirely. The ε dial is the trade: small ε is more robust and estimates something closer to the median; large ε is closer to OLS and, under clean Gaussian noise, more efficient — in 500 simulations Huber's slope variance was 1/0.865 of OLS's, and the median's 1/0.63; with 10 % heavy-tailed contamination the mean squared error of the slope was 0.122 for OLS and 0.007 for Huber."
    },

    { t: "code", lang: "python", title: "Quantile regression on spend: three fits, one interval (executed, 989 rows)",
      hl: [2, 3, 4, 7, 9, 10],
      code: `QuantileRegressor(quantile=τ, alpha=0, solver="highs")       #  coefficients [tenure, fee, discount]   intercept   share of y below the fit   pinball loss
#   τ = 0.1                                                          [28.6, 37.9, -7.4]                    85.4           0.098                   5.42
#   τ = 0.5                                                          [ 5.7, 49.3, -8.6]                   130.0           0.499                   8.34
#   τ = 0.9                                                          [ 2.7, 50.0, -7.2]                   143.8           0.899                   2.55

# out-of-fold 10th-90th interval:  coverage 0.796 (target 0.80),  mean width 58.5
#   width by tenure quartile:   1-16 months: 91.4     16-30: 69.7     30-46: 46.8     46-60: 24.3       <- the interval knows where the target is noisy
#   width by fee tercile:       low 47.5     mid 55.9     high 72.3
# the coefficients differ across τ (tenure: 28.6 at the 10th percentile, 2.7 at the 90th): the features move the LOWER tail of spend far more than the upper --
# a distributional effect that no single mean regression can express`,
      caption: "Three linear models, one per quantile, each fitted by linear programming on its own pinball loss. The 10th and 90th together are a prediction interval whose width varies with x — 91 for a new customer whose 12-month spend is still accruing, 24 for a long-tenured one whose spend has saturated — which is the heteroscedasticity 4.2 diagnosed, now used rather than corrected. Coverage is 79.6 % against a target of 80 %, checked out of fold. The interval can cross (the 10th above the 90th) in sparse regions; 10.7 covers conformal methods that guarantee coverage, and 6.4's gradient boosting accepts the same loss for non-linear quantiles."
    },

    { t: "table",
      head: ["Situation", "Reach for", "Because"],
      rows: [
        ["Counts (0, 1, 2, …); rate per exposure", "Poisson with log link and offset; NB if φ > 1.2", "Var grows with the mean; effects multiply; rates need exposure"],
        ["Positive, right-skewed amounts (cost, duration, claim size)", "Gamma with log link", "Var ∝ μ²; never negative; coefficients multiply; unbiased for E[y] unlike log-OLS"],
        ["Amounts with many exact zeros", "Tweedie, 1 < p < 2, p by CV on deviance", "A point mass at zero plus a Gamma tail is exactly this distribution"],
        ["Continuous target, occasional wild residuals", "Huber (ε tuned) or absolute error", "Capped gradient: contamination cannot move the fit"],
        ["A percentile or a prediction interval", "Quantile regression at τ (and 1 − τ)", "Pinball loss is minimised by the conditional quantile; the width adapts to x"],
        ["Continuous, Gaussian-ish residuals", "Squared error (OLS)", "Most efficient when its assumption holds; everything else pays a variance price"]
      ]
    },

    { t: "ladder",
      title: "Modelling hospital length of stay (days, skewed, some zero-day cases) to plan bed capacity",
      rungs: [
        { level: "bad", label: "OLS on days", code: `LinearRegression().fit(X, days)`,
          note: "**Negative stays for low-risk patients, an additive model of a multiplicative process, and a mean that under-plans for the tail** — capacity is about the 90th percentile, not the mean." },
        { level: "ok", label: "Gamma/Tweedie GLM with log link, dispersion checked", code: `TweedieRegressor(power=1.5, link="log")           # zeros allowed; p tuned by CV on deviance
sm.GLM(days, X, family=sm.families.Tweedie(var_power=1.5)).fit()   # for inference, with φ and deviance`,
          note: "**A positive, multiplicative, correctly-dispersed model of the mean stay** with rate-ratio coefficients a clinician can read. Still the mean." },
        { level: "best", label: "The GLM for the mean and quantile regression at τ = 0.9 for the capacity question", code: `QuantileRegressor(quantile=0.9, alpha=0).fit(X, days)     # or HistGradientBoostingRegressor(loss="quantile", quantile=0.9) if non-linear
# report: expected stay (GLM) AND the stay 90 % of similar patients will not exceed; validate coverage out of fold; check crossing`,
          note: "**The question was a quantile, so the model is a quantile**, with the mean alongside for the finance view — and the coverage of the 90 % figure checked on held-out patients before anyone plans beds with it." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A rate ratio by hand, an overdispersion you must catch, and an interval that must hold",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** From the offset model in section 02 (intercept 0.1906, β₁ = 0.602), compute by hand the expected number of events for a row with x = 1.5 observed for 2.5 units of exposure, the rate ratio between x = 1.5 and x = 0.5, and the effect on the expected count of doubling the exposure. **(b)** Simulate 2,000 negative-binomial counts with mean e^{0.5 + 0.4x} and Var = μ + μ²/2; fit a Poisson GLM and report φ; then fit negative binomial and quasi-Poisson and compare the three standard errors of β₁; state which p-values you would sign. **(c)** On the churn spend target, fit quantile regressions at τ = 0.05 and 0.95, check out-of-fold coverage of the 90 % interval, report its width for the shortest- and longest-tenure quartiles, and count the rows where the two quantiles cross." }
      ],
      requirements: [
        "(a) the three hand computations with the formulas used.",
        "(b) φ, the three standard errors, and the decision.",
        "(c) coverage, the two widths, and the crossing count."
      ],
      hint: "(a) μ = exposure × e^{0.1906 + 0.602x}. (b) `sm.GLM(...).fit(scale=\"X2\")` is quasi-Poisson; `sm.NegativeBinomial` estimates α. (c) Crossing: `(q95 < q05).sum()` on out-of-fold predictions.",
      solution: {
        lang: "python",
        title: "glm_practice.py",
        code: `# (a)
#   μ(x = 1.5, exposure 2.5) = 2.5 × e^{0.1906 + 0.602 × 1.5} = 2.5 × e^{1.0936} = 2.5 × 2.985 = 7.46 expected events
#   rate ratio x = 1.5 vs 0.5:  e^{0.602 × (1.5 - 0.5)} = e^{0.602} = 1.826   -- the same for ANY pair of x one unit apart; exposure cancels
#   doubling exposure: the offset has coefficient 1, so μ doubles exactly (7.46 -> 14.9); on the log scale it adds ln 2 = 0.693

# (b) executed in the lesson's simulation (n = 2,000): sample mean 1.84, variance 3.99
#   Poisson φ = 1.77;   se(β₁): Poisson 0.0170, negative binomial 0.0234, quasi-Poisson 0.0226 (= 0.0170 × √1.77)
#   sign the NB or quasi-Poisson p-values; the Poisson ones are computed from a variance the data contradict, and in 200 repeats
#   the Poisson 95 % interval covered the truth 79.5 % of the time against quasi-Poisson's 93 %.

# (c) run it:
lo = cross_val_predict(QuantileRegressor(quantile=0.05, alpha=0, solver="highs"), Xz, y, cv=cv)
hi = cross_val_predict(QuantileRegressor(quantile=0.95, alpha=0, solver="highs"), Xz, y, cv=cv)
coverage = np.mean((y >= lo) & (y <= hi))                    # expect ≈ 0.90; the 10-90 band in the lesson gave 0.796 against 0.80
width_by_tenure = pd.Series(hi - lo).groupby(pd.qcut(tenure, 4)).mean()   # expect the shortest quartile several times wider than the longest, as 91 vs 24 was for 10-90
crossings = (hi < lo).sum()                                  # should be 0 or a handful; if not, the quantiles need a monotone constraint or a joint fit`,
        notes: [
          { t: "p", text: "**(a)** is the arithmetic every stakeholder will ask you to do at the whiteboard: exponentiate a coefficient, multiply by exposure. The rate ratio being independent of the baseline is the log link's whole convenience." },
          { t: "p", text: "**(b)** is the check to add to every Poisson fit you ever run. φ is one number and it decides whether the standard errors mean anything." },
          { t: "p", text: "**(c)** is the discipline of quantile intervals: coverage checked out of fold, width reported by segment because the width *is* the finding, and crossings counted because separate linear programmes do not know about each other." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Fitting negative-binomial counts as Poisson gave β₁ = 0.382 (true 0.4) with se 0.017, against NB's 0.386 with se 0.023. What is wrong with the Poisson fit?",
          options: [
            "The coefficient is biased",
            "The coefficient is essentially right; the standard error is too small, because the Poisson family assumes Var = μ and the data's variance is 1.77 times that — so every interval is too narrow (79.5 % coverage instead of 95 %) and every p-value too optimistic. Check φ = Pearson χ²/df after every Poisson fit",
            "The link should be identity",
            "Nothing; the two models agree"
          ],
          answer: 1,
          why: "Overdispersion is the Poisson pitfall: right answer, wrong confidence."
        }
      ]
    }
  ],

  takeaways: [
    "**A GLM is three choices**: an exponential-family distribution for y, a linear predictor xᵀβ, and a link g(μ) = xᵀβ. Linear, logistic, Poisson, Gamma and Tweedie regression are rows of one table.",
    "**Family = the mean–variance relationship; link = the scale on which effects add.** Log link → coefficients are multiplicative (rate ratios), and μ stays positive.",
    "**Fitted by IRLS** — Newton's method as repeated weighted least squares, weights from the family's variance; five iterations matched statsmodels to four decimals.",
    "**Exposure goes in as an offset** with coefficient 1; the model becomes a rate model; fitting log(exposure) freely (coef 1.015) is the check.",
    "**Deviance is the GLM's RSS**; dispersion φ = Pearson χ²/df should be ≈ 1 for Poisson — 0.976 on the tickets, which the model correctly found unexplained.",
    "**Overdispersion breaks inference, not estimates**: se too small by √φ, coverage 79.5 % instead of 95 %; use negative binomial, quasi-Poisson or sandwich errors.",
    "**Gamma for positive skewed amounts** (var/μ² flat at ≈ 0.5); OLS predicted −50.9; log-OLS under-predicts the mean by 24 % because it estimates the median.",
    "**Tweedie (1 < p < 2)** for amounts with exact zeros; OLS's deviance was 3,035 against 25.5.",
    "**Huber caps the gradient at ±δ**: 5 % contamination took OLS's error from the clean fit to 62.3; Huber gave 16.7. Price under clean Gaussian noise: efficiency 0.865 (median: 0.63).",
    "**Pinball loss at τ is minimised by the τ-th conditional quantile**; the 10–90 band covered 79.6 % out of fold and was 91 wide for new customers, 24 for old — the width is the finding."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What are the three components of a generalised linear model, and where do linear and logistic regression sit?",
        options: [
          "Features, weights and a bias",
          "A random component (an exponential-family distribution for y with mean μ), a systematic component (the linear predictor η = xᵀβ) and a link g(μ) = η; linear regression is Normal with identity link, logistic is Bernoulli with logit link, Poisson regression is Poisson with log link",
          "A loss, an optimiser and a regulariser",
          "Mean, variance and link"
        ],
        answer: 1,
        why: "The family fixes how the variance depends on the mean; the link fixes the scale on which effects are additive."
      },
      {
        stem: "Why not model a count with linear regression?",
        options: [
          "It always fails to converge",
          "It can predict negative counts (the identity-link Poisson fitted a minimum mean of −0.75), it assumes constant variance where counts vary more at higher means, and its coefficients are additive where count effects are naturally multiplicative — Poisson with a log link fixes all three and gives rate ratios",
          "Counts are not numeric",
          "Because R² is undefined for counts"
        ],
        answer: 1,
        why: "On the tickets target linear regression happened to be harmless (min prediction 0.59) only because the mean is 0.8 and the effects are nil."
      },
      {
        stem: "A Poisson coefficient is 0.4 and the model has ln(exposure) as an offset. Interpret both.",
        options: [
          "Each unit of x adds 0.4 events",
          "Each unit of x multiplies the expected *rate* (events per unit exposure) by e^{0.4} = 1.49, holding exposure and the other features fixed; the offset's coefficient is fixed at 1, so doubling the observation window doubles the expected count exactly",
          "Each unit of x raises the probability by 40 %",
          "The offset has coefficient 0.4"
        ],
        answer: 1,
        why: "Rate ratio e^β, exposure multiplies the count — the two pieces of Poisson arithmetic every stakeholder will ask for."
      },
      {
        stem: "You need E[claim size] for reserving. Should you fit OLS on log(claim) and exponentiate?",
        options: [
          "Yes; it is equivalent to a Gamma GLM",
          "No: exp(E[ln y]) is the geometric mean, which for a right-skewed target is below the mean — in the simulation total predictions came to 76 % of total claims. A Gamma (or Tweedie) GLM with a log link models E[y] directly, stays positive and recovers the multiplicative coefficients",
          "Yes, if you add 0.5σ² to the prediction",
          "No; use a decision tree"
        ],
        answer: 1,
        why: "The smearing correction (option 3) exists but assumes homoscedastic log-errors; the GLM needs no correction."
      },
      {
        stem: "When is Huber loss preferable to squared error, and what does it cost?",
        options: [
          "Always; it is strictly better",
          "When residuals are heavy-tailed or contaminated: its gradient is capped at ±δ, so 5 % wild targets that quadrupled OLS's error left Huber's fit near the clean one (16.7 vs 62.3). Under clean Gaussian noise it is less efficient — slope variance 1/0.865 of OLS's in simulation — and with small ε it estimates something closer to the median than the mean",
          "When the target is a count",
          "When you need a prediction interval"
        ],
        answer: 1,
        why: "A loss is a belief about the residual distribution: squared error is Gaussian, Huber is Gaussian-with-Laplace-tails."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain Poisson regression: the model, how it is fitted, how you interpret it, and its main pitfall.",
        strong: "It is a GLM for counts: y is Poisson with mean μ, and ln μ = xᵀβ, so μ = e^{xᵀβ} is always positive and the effects are multiplicative — e^{βⱼ} is the rate ratio per unit of xⱼ, and with ln(exposure) as an offset the model is for the rate per unit time or population. It is fitted by maximum likelihood, in practice IRLS: each step is a weighted least-squares fit with weights equal to the current means, which is Newton's method; on the tickets model it converged in five steps to statsmodels' coefficients. The deviance plays the role of the residual sum of squares. The pitfall is overdispersion: the Poisson family assumes the variance equals the mean, and real counts almost always vary more, so the coefficients are about right but the standard errors are too small by roughly the square root of the dispersion — in a simulation with dispersion 1.77 the 95 % interval covered the truth 79.5 % of the time. So after every Poisson fit I check Pearson χ² over its degrees of freedom, and if it is materially above 1 I use negative binomial or quasi-Poisson errors.",
        answer: [
          { t: "p", text: "Model, link, rate ratios, offset, IRLS, deviance, and the overdispersion check with numbers." }
        ]
      },
      {
        level: "core",
        q: "When would you use Huber loss, and when quantile regression?",
        strong: "Huber when I want the conditional mean but the residuals have heavy tails or contamination that squared error cannot tolerate: it is quadratic near zero and linear beyond δ, so its gradient is capped and no single point can drag the fit — with 5 % of targets multiplied by ten, OLS's error against the clean targets went to 62 and Huber's stayed at 17, and OLS flipped a sign. The cost is efficiency under genuinely Gaussian noise, about 0.87 relative to OLS in my simulation, and with a small δ it drifts toward estimating the median. Quantile regression is for a different question: not the typical value but a percentile — the delivery time 90 % of orders will beat, the stay 90 % of patients will not exceed. The pinball loss weights under- and over-prediction by τ and 1 − τ and is minimised by the τ-th conditional quantile; two of them make a prediction interval whose width adapts to x, which on the spend data was 91 for new customers and 24 for old ones with coverage checked out of fold at 79.6 % against a target of 80. And I check for crossing quantiles, because the fits are independent.",
        answer: [
          { t: "p", text: "Robustness with the mechanism and numbers; quantiles with the loss, the interval and the checks." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague fits OLS to insurance claim amounts, gets negative predictions for some policies, and proposes taking logs. Advise them.",
        strong: "Negative predictions are the symptom that the model's mean is on the wrong scale: claim sizes are positive and skewed, and their spread grows with their size, so a Gamma GLM with a log link is the natural model — it keeps μ positive, makes the effects multiplicative, and its variance assumption Var ∝ μ² can be checked by binning rows by fitted mean and looking at var/μ², which was flat at about 0.5 in my simulation. Taking logs and fitting OLS is tempting but answers a different question: exp of the predicted log is the conditional median, not the mean, and for a skewed target that sits well below it — the simulated log-OLS totals came to 76 % of actual claims, which for reserving is a 24 % shortfall. If the portfolio has many zero-claim policies, Gamma cannot even be fitted, and Tweedie with power between 1 and 2 is the distribution for a point mass at zero plus a Gamma tail; I would tune the power by cross-validated deviance, not MAE, because MAE is dominated by the zeros and cannot tell the models apart. And I would report the total predicted over total actual as the first sanity check, because that is the number the reserve depends on.",
        answer: [
          { t: "p", text: "Diagnosis, the Gamma GLM with its variance check, the retransformation bias with the number, Tweedie for zeros, and the metric choice." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.2 — Assumptions, Diagnostics and Inference
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**Least squares always returns a line; the assumptions decide whether the line, its standard errors and its p-values mean anything.** The spend regression from 4.1 has an R² of 0.757 and five coefficients with p-values below 0.01 — and its residuals average −£56 for customers under six months, its error variance is thirteen times larger at the start of tenure than the end, and its residuals have a skew of −1.7. Each of those is an assumption failing, each is caught by a specific plot or test, and each has a specific consequence: a wrong coefficient, a wrong standard error, or a wrong p-value. This lesson runs the diagnostics on the real model, plants a single point that drags the slope from 1.49 to 1.07, and shows which fixes — a feature, robust standard errors, weighted least squares — repair which failure.",

  objectives: [
    "State the assumptions — linearity, independence, normality, equal variance, no collinearity — and the diagnostic for each",
    "Read residual plots, the Breusch–Pagan and RESET tests, Durbin–Watson, VIF and a normality test, and say what each failure costs",
    "Distinguish leverage, outlier and influence with Cook's distance, and know which one moves the fit",
    "Use robust (HC3, HAC) standard errors and weighted least squares, read a coefficient's p-value and interval, and state the Gauss–Markov theorem"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The summary table, and what it assumes", id: "summary" },

    { t: "code", lang: "text", title: "spend_12m on four features, statsmodels OLS (executed, 989 rows)",
      code: `                 coef     std err        t      P>|t|     [0.025    0.975]
const         -26.307       3.030     -8.68     0.000    -32.25    -20.36
tenure_months   1.066       0.051     20.97     0.000      0.97      1.17
monthly_fee    11.085       0.303     36.55     0.000     10.49     11.68
logins_30d     -0.693       0.257     -2.70     0.007     -1.20     -0.19
discount_pct   -1.595       0.157    -10.16     0.000     -1.90     -1.29
R² 0.757    adjusted 0.756    AIC 9,392

each row: coef = the average change in spend per unit, holding the others fixed;  std err = sqrt of the diagonal of σ̂²(XᵀX)⁻¹;
t = coef / std err;  P>|t| = the two-sided probability of a t that large if the true coefficient were zero;  the interval = coef ± t₀.₉₇₅ · se`,
      caption: "Every number right of the coefficient column rests on the assumptions below: σ̂²(XᵀX)⁻¹ is the covariance of the estimates *only if* the errors are independent with equal variance, and the t-distribution applies *only if* they are normal or n is large. The coefficients themselves need less — linearity and no perfect collinearity — but the linearity failure below shows that even they can be true on average and false for everyone."
    },

    { t: "table",
      head: ["Assumption", "What it says", "Diagnostic", "If it fails", "Fix"],
      rows: [
        ["**L**inearity", "E[y | x] is a linear function of the features", "Residuals vs each feature and vs fitted; binned residual means; RESET test", "Coefficients are averages of a curve; predictions biased in regions", "Transform, interaction, spline or polynomial terms (3.4); a different model"],
        ["**I**ndependence", "Errors are uncorrelated across rows", "Durbin–Watson for ordered data; residual autocorrelation; clustering by entity", "Standard errors too small; p-values too optimistic", "HAC (Newey–West) or cluster-robust SEs; a time-series model (10.5); mixed effects"],
        ["**N**ormality of errors", "ε ~ N(0, σ²)", "Q–Q plot; Shapiro–Wilk; skew and kurtosis of residuals", "Coefficients fine; intervals and p-values off for small n; OLS still BLUE", "Larger n (CLT); transform y; robust regression (Huber, 4.6)"],
        ["**E**qual variance", "Var(ε) the same everywhere", "Residuals vs fitted (a funnel); Breusch–Pagan", "Coefficients unbiased but inefficient; standard errors wrong", "Robust (HC3) SEs; weighted least squares; transform y"],
        ["No perfect collinearity", "No feature is a combination of others", "VIF; condition number", "Coefficients unstable, huge SEs, arbitrary signs; predictions fine", "Drop or combine; ridge (4.3); PCA"],
        ["Exogeneity", "Errors uncorrelated with the features (no omitted confounder, no measurement error in x)", "Cannot be tested from the data alone", "Coefficients biased — the causal failure", "Design, instruments, domain knowledge; or stop interpreting causally"]
      ]
    },

    { t: "h2", n: "02", text: "The diagnostics on the real model", id: "diagnostics" },

    { t: "code", lang: "python", title: "Linearity, equal variance, normality, independence, collinearity — all run (executed)",
      hl: [2, 3, 4, 8, 9, 12, 15, 18, 19],
      code: `# linearity: mean residual by tenure band
#   0-6 months  -55.9      6-12  +7.6      12-18  +27.9      18-24  +21.2      24-36  +11.6      36-48  +0.3      48-60  -12.8
#   a straight line in tenure under-predicts new customers by £56 and over-predicts one-year customers by £28: the relationship bends at 12
#   RESET test (does adding ŷ² help?): p = 1 × 10⁻⁵                                    <- rejects linearity

# equal variance: residual sd by tenure band
#   0-6: 36.7    6-12: 19.5    12-18: 9.4    ...    48-60: 11.2                          <- 13x the variance at the start of tenure
#   Breusch-Pagan (do the squared residuals depend on the features?): p = 6 × 10⁻⁴⁴  <- rejects equal variance

# normality: Shapiro-Wilk p = 10⁻²⁶, skew -1.73, excess kurtosis 5.29                    <- a long left tail (the under-predicted new customers)

# independence: Durbin-Watson 2.09 on rows in id order                                 <- no serial correlation; 2 is the null, and there is no time axis here anyway

# collinearity: VIF   tenure 1.00   fee 2.08   logins 2.08   discount 1.00              <- fee and logins move together (the plan), mildly; nothing alarming`,
      caption: "Three of five assumptions fail on a model whose summary table looked immaculate. The failures are not independent: the non-linearity in tenure produces the funnel (new customers are mispredicted by a lot, old ones by a little) and the skew (the mispredictions are all in one direction). One missing feature, three failed tests. That is the usual shape of it — diagnostics point at a cause, and the cause is rarely 'the wrong standard errors'."
    },

    { t: "code", lang: "python", title: "The fix that addresses the cause, and the fix that addresses the symptom (executed)",
      hl: [2, 3, 4, 8, 9, 10],
      code: `# the cause: spend accrues at fee x months for the first twelve months. Add the interaction from 3.4:
X2 = add_constant(d[numeric + ["fee_x_tenure12"]]); m2 = OLS(y, X2).fit()
#   R² 0.981    Breusch-Pagan p 0.36    RESET p 0.37    residual sd 7.8 (was 24)    mean residual by tenure band: -0.1, 0.0, -0.2, -0.1, -0.1, 0.5, -0.1
#   every diagnostic passes once the model can represent the relationship. The assumptions were about the model, not the data.

# the symptom: keep the wrong model, correct the standard errors for the unequal variance
r = OLS(y, X).fit(cov_type="HC3")                                      # heteroscedasticity-consistent (sandwich) standard errors
#                  OLS se     HC3 se    ratio
#   tenure         0.051      0.071     1.39      <- the OLS standard error on tenure was 28 % too small
#   logins         0.257      0.282     1.10
#   fee            0.303      0.290     0.96
# HC3 makes the p-values honest for the coefficients the model has; it does not make the coefficients mean anything new`,
      caption: "Two different kinds of repair. Adding the interaction fixed the model, and every diagnostic passed as a consequence — R² from 0.757 to 0.981, residual spread from 24 to 8. Robust standard errors leave the model alone and fix the inference: they are the right tool when heteroscedasticity is a nuisance rather than a symptom (income data, counts, anything with a natural funnel) and the coefficients are what you want. Here the funnel was a symptom, and the honest standard error on a meaningless average slope is still a standard error on a meaningless average slope."
    },

    { t: "dl", items: [
      ["Residual plot", "Residuals against fitted values or against each feature. Should be a structureless band around zero. A curve is non-linearity; a funnel is heteroscedasticity; a trend in row order is dependence."],
      ["Breusch–Pagan test", "Regress squared residuals on the features; a significant fit means the variance depends on them."],
      ["RESET test", "Add powers of ŷ to the model; if they help, the functional form is wrong."],
      ["Durbin–Watson", "≈ 2(1 − ρ₁) of the residuals in order: 2 is no autocorrelation, toward 0 positive, toward 4 negative. Only meaningful when rows have an order."],
      ["Q–Q plot", "Residual quantiles against normal quantiles; a straight line is normality; curved tails are heavy tails or skew."],
      ["HC / HAC standard errors", "Sandwich estimators of the coefficient covariance that are valid under heteroscedasticity (HC0–HC3) or also autocorrelation (HAC, Newey–West). Change the SEs, not the coefficients."],
      ["Weighted least squares", "Minimise Σ wᵢ(yᵢ − xᵢᵀβ)² with wᵢ ∝ 1/Var(εᵢ). Efficient when the variance pattern is known; the coefficients change."],
      ["Gauss–Markov", "If errors have mean zero, equal variance and no correlation, OLS is the best (minimum-variance) linear unbiased estimator. Normality is not required for this; it is required for exact t and F tests."]
    ]},

    { t: "h2", n: "03", text: "Leverage, outliers, influence", id: "influence" },

    { t: "p", text: "Three words that are used interchangeably and mean different things. **Leverage** is about x: how far a row sits from the other rows' features (the hat matrix diagonal of 4.1). **An outlier** is about y: a large residual. **Influence** is what happens to the fit when the row is removed — and it takes both. Sixty points on a line, then one planted point three ways:" },

    { t: "code", lang: "python", title: "One point, three placements (executed)",
      hl: [3, 4, 7, 10],
      code: `# 60 points, y = 2 + 1.5 x + noise on x in [0, 10]; slope without any planted point: 1.493
# planted at x = 25 (far out) and 20 below the line:
#   slope 1.068     leverage 0.435 (mean 0.033; the 2p/n rule flags above 0.066)     studentised residual -14.6     Cook's D 17.9 (next largest 0.07)
#   one row moved the slope by 30 %: high leverage AND a large residual

# planted at x = 25, ON the line:
#   slope 1.505     leverage 0.435     Cook's D 0.06        <- leverage without influence: it pulls, but it pulls toward where the line already is

# planted at x = 5 (the centre), 20 below the line:
#   slope 1.495     leverage 0.016     Cook's D 0.43        <- a plain outlier: large residual, no leverage, the intercept absorbs it and the slope barely moves`,
      caption: "Cook's distance combines the two — roughly (studentised residual)² × leverage/(1 − leverage) — and it is the number to sort by. A row with Cook's D above about 4/n, or far above the next largest, is one whose removal changes the conclusions; the executed 17.9 against 0.07 is not subtle. What to do with it is 3.4's question again: an error is removed, a real extreme is kept and reported, and a fit that depends on one row is a fit that should be reported with and without it."
    },

    { t: "viz",
      title: "Leverage, outlier, influence",
      caption: "The same sixty points with one addition. Far in x and off the line: the fit rotates (influence). Far in x but on the line: nothing moves (leverage only). At the centre but off the line: the intercept shifts a little (outlier only). Only the first changes what you would conclude.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three small scatter panels each with a cloud of points along a line. First: an added point far right and below, with the fitted line tilted downward. Second: an added point far right on the line, fit unchanged. Third: an added point in the middle far below, fit barely changed.">
  <g stroke-width="1.2">
    <rect x="20" y="30" width="270" height="180" rx="8" style="fill:var(--crit);fill-opacity:.05;stroke:var(--crit)"/>
    <rect x="305" y="30" width="270" height="180" rx="8" style="fill:var(--good);fill-opacity:.06;stroke:var(--good)"/>
    <rect x="590" y="30" width="270" height="180" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="155" y="52" style="fill:var(--crit)">far out, off the line: influence</text>
    <text x="440" y="52" style="fill:var(--good)">far out, on the line: leverage only</text>
    <text x="725" y="52" style="fill:var(--warn)">centre, off the line: outlier only</text>
  </g>
  <g style="fill:var(--ink-3)">
    <circle cx="45" cy="185" r="2.5"/><circle cx="60" cy="178" r="2.5"/><circle cx="75" cy="172" r="2.5"/><circle cx="90" cy="166" r="2.5"/><circle cx="105" cy="158" r="2.5"/><circle cx="120" cy="152" r="2.5"/><circle cx="135" cy="146" r="2.5"/><circle cx="150" cy="140" r="2.5"/>
    <circle cx="330" cy="185" r="2.5"/><circle cx="345" cy="178" r="2.5"/><circle cx="360" cy="172" r="2.5"/><circle cx="375" cy="166" r="2.5"/><circle cx="390" cy="158" r="2.5"/><circle cx="405" cy="152" r="2.5"/><circle cx="420" cy="146" r="2.5"/><circle cx="435" cy="140" r="2.5"/>
    <circle cx="615" cy="185" r="2.5"/><circle cx="630" cy="178" r="2.5"/><circle cx="645" cy="172" r="2.5"/><circle cx="660" cy="166" r="2.5"/><circle cx="675" cy="158" r="2.5"/><circle cx="690" cy="152" r="2.5"/><circle cx="705" cy="146" r="2.5"/><circle cx="720" cy="140" r="2.5"/>
  </g>
  <line x1="40" y1="188" x2="160" y2="136" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>
  <line x1="40" y1="176" x2="270" y2="140" style="stroke:var(--crit)" stroke-width="2"/>
  <circle cx="262" cy="150" r="5" style="fill:var(--crit)"/>
  <line x1="325" y1="188" x2="560" y2="86" style="stroke:var(--good)" stroke-width="2"/>
  <circle cx="547" cy="92" r="5" style="fill:var(--good)"/>
  <line x1="610" y1="188" x2="730" y2="134" style="stroke:var(--warn)" stroke-width="2"/>
  <line x1="610" y1="185" x2="730" y2="137" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>
  <circle cx="667" cy="200" r="5" style="fill:var(--warn)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="155" y="228">slope 1.49 → 1.07 · Cook's D 17.9</text>
    <text x="440" y="228">slope 1.49 → 1.51 · Cook's D 0.06</text>
    <text x="725" y="228">slope 1.49 → 1.50 · Cook's D 0.43</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "When the variance is not constant, and when the errors are not independent", id: "wls" },

    { t: "code", lang: "python", title: "Heteroscedastic data: OLS, robust SEs, weighted least squares — and a coverage check (executed)",
      hl: [2, 3, 4, 8],
      code: `# y = 1 + 2x + noise with sd 0.5x: the variance grows with x, and we know how
#                       slope     se
# OLS                   1.913    0.054      <- unbiased, but not the most precise, and its se is computed under a false assumption
# OLS with HC3 se       1.913    0.057      <- same slope; an honest se
# WLS, weights 1/x²     1.968    0.037      <- a different slope (closer to 2) with a smaller honest se: the efficient estimator

# does the 95 % interval contain the truth 95 % of the time? 500 simulations of 200 rows:
#   OLS 94.4 %     HC3 95.6 %     WLS 94.4 %          <- on this mild, monotone funnel all three intervals are about right;
#                                                       OLS's se is only badly wrong when the variance pattern correlates with the leverage
# autocorrelated errors (ρ = 0.8, 300 rows in time order): Durbin-Watson 0.49;  OLS se 0.316  HAC se 0.522   <- OLS claims 65 % more precision than it has`,
      caption: "Gauss–Markov says OLS is the best *linear unbiased* estimator only under equal variance; with a known variance pattern, WLS weights each row by 1/Var and is more efficient — the smaller se is real. When the pattern is unknown, HC3 gives honest standard errors at the cost of some efficiency. Autocorrelation is the more dangerous failure: consecutive errors that move together make n effective rows into far fewer, and OLS's standard error does not know — HAC does. Any regression on rows with a time order or a group structure needs one or the other."
    },

    { t: "callout", kind: "trap", title: "A coefficient's p-value is not a feature's importance", body: [
      { t: "p", text: "p = 0.007 on logins says the estimate −0.69 is 2.7 standard errors from zero under the model's assumptions. It says nothing about how much logins matter for prediction (tiny, in pounds), nothing about causation, and it is only as honest as the equal-variance and independence assumptions behind the standard error — which failed here. **Use p-values to say 'this effect is distinguishable from zero in this sample'; use held-out metrics and permutation importance to say 'this feature matters'; use a design to say 'this causes that'.**" }
    ]},

    { t: "ladder",
      title: "A residual plot shows a funnel",
      rungs: [
        { level: "bad", label: "Ignore it; the coefficients are unbiased anyway", code: `OLS(y, X).fit().summary()          # the p-values are computed under an assumption you have just seen fail`,
          note: "**The coefficients may be fine; every number to their right is not.** And the funnel may be a symptom of a missing feature, as it was here." },
        { level: "ok", label: "Robust standard errors", code: `OLS(y, X).fit(cov_type="HC3")      # honest se; same coefficients`,
          note: "**Correct inference for the model you have.** Right when the funnel is a fact about the noise (income, counts) rather than about the model." },
        { level: "best", label: "Ask why the variance changes, fix the model if that is the cause, then robust or weighted SEs for what remains", code: `# residual sd by tenure band: 36.7 at 0-6 months, 11 after 18  ->  the model is wrong for new customers -> add the interaction
# then: Breusch-Pagan p 0.36; nothing left to correct. If a funnel remained: WLS with weights from the variance pattern, or HC3.`,
          note: "**Diagnostics point at causes.** The funnel was the model's failure to bend; the honest standard error on the unbent model was the wrong repair." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Diagnose",
      title: "Break each assumption, catch it, repair it",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Simulate 400 rows of y = 3 + 2x₁ − x₂ + ε with x₁, x₂ standard normal. Then produce four corrupted versions: **(i)** y gains a term 1.5x₁²; **(ii)** ε has sd 0.5 + 1.5|x₁|; **(iii)** ε is AR(1) with ρ = 0.7 in row order; **(iv)** x₃ = x₁ + 0.01·noise is added as a feature. For each version fit OLS, run the matching diagnostic (RESET, Breusch–Pagan, Durbin–Watson, VIF) and one non-matching one, report the coefficients and their standard errors against the truth, and apply the matching repair (a squared term; HC3 and WLS; HAC; dropping or ridge). State, for each version, whether the failure biased the coefficients or only the standard errors." }
      ],
      requirements: [
        "Four diagnostics that fire on the right version and are quiet on the others — and note which test misses the symmetric funnel.",
        "Coefficients and SEs before and after the repair for each version.",
        "One sentence per version: coefficients biased, or SEs wrong, or both."
      ],
      hint: "(i) biases coefficients (the omitted x₁² is correlated with nothing linear in x₁ if x₁ is symmetric — so the bias may be small; check the intercept). (ii) and (iii) leave coefficients unbiased but SEs wrong — (iii) far more so. (iv) leaves predictions fine and coefficients on x₁ and x₃ wild with huge SEs; their sum is stable.",
      solution: {
        lang: "python",
        title: "assumption_lab.py",
        code: `rng = np.random.default_rng(0); n = 400
x1, x2 = rng.normal(size=n), rng.normal(size=n); eps = rng.normal(0, 1, n)
base = 3 + 2 * x1 - x2
versions = {
  "clean":     (base + eps,                                    np.c_[x1, x2]),
  "nonlinear": (base + 1.5 * x1**2 + eps,                       np.c_[x1, x2]),
  "hetero":    (base + rng.normal(0, 1, n) * (0.5 + 1.5 * np.abs(x1)), np.c_[x1, x2]),
  "ar1":       (base + ar1(rng, n, 0.7),                        np.c_[x1, x2]),
  "collinear": (base + eps,                                     np.c_[x1, x2, x1 + 0.01 * rng.normal(size=n)]),
}
for name, (yy, XX) in versions.items():
    X = sm.add_constant(XX); m = sm.OLS(yy, X).fit()
    print(name, "coef", m.params.round(2), "se", m.bse.round(3),
          "RESET p", round(linear_reset(m, power=2, use_f=True).pvalue, 4), "BP p", round(het_breuschpagan(m.resid, X)[1], 4),
          "DW", round(durbin_watson(m.resid), 2), "VIF", [round(variance_inflation_factor(X, i), 1) for i in range(1, X.shape[1])])
# executed:
#   clean       coef [2.96, 2.04, -1.01]  se 0.047      RESET p 0.84   BP p 0.51   DW 1.92   VIF 1.0, 1.0
#   nonlinear   coef [4.44, 1.87, -0.87]  se 0.123      RESET p 0.0000                            <- intercept biased to 4.44 (the omitted x1² has mean 1)
#   hetero      coef [2.93, 2.12, -1.02]  se 0.092      BP p 0.07 (!)  White p 7e-14              <- Breusch-Pagan regresses e² on x1 LINEARLY and a
#                                                                                                    symmetric funnel |x1| has no linear trend; White's test sees it
#   ar1         coef [2.66, 2.01, -0.92]  se 0.070      DW 0.69                                   <- the coefficients are fine; the se is a fiction
#   collinear   coef [2.96, 1.90, -1.01, 0.14]  se on x1 and x3: 4.66      VIF 9,843 and 9,843      <- x1 + x3 = 2.04: the sum is right, the parts are noise
# repairs:
#   nonlinear: add x1**2 -> coef [2.95, 2.04, -1.01, 1.51], RESET p 0.99: every parameter back on its true value
#   hetero:    HC3 se [0.094, 0.158, 0.086] (the x1 se was 0.093 under OLS: 70 % too small); WLS with weights 1/(0.5 + 1.5|x1|)²:
#              coef [2.97, 2.09, -1.02], se [0.054, 0.108, 0.048] -- the efficient estimate, with a smaller honest se
#   ar1:       HAC se [0.133, 0.069, 0.058] against OLS 0.070: the intercept's se doubled; slopes on iid features less affected
#   collinear: drop x3 -> se back to 0.047 on everything. Predictions were fine throughout.
# biased coefficients: nonlinear (intercept, and any slope correlated with the omitted term).  SEs only: hetero, ar1.
# both, in the sense that the individual coefficients are meaningless while their sum is fine: collinear.`,
        notes: [
          { t: "p", text: "**Each diagnostic is specific**: RESET fires on the missing square and not on the funnel; Durbin–Watson fires on the AR(1) and is meaningless without a row order; VIF fires on the copy and on nothing else. And Breusch–Pagan missed the symmetric funnel (p 0.07) because it looks for a *linear* trend in the squared residuals — White's test, which adds squares and cross-products, saw it at 10⁻¹⁴. A residual plot would have shown it in one glance." },
          { t: "p", text: "**'Unbiased but wrong SEs' is the common case** — heteroscedasticity and dependence — and it is why robust standard errors are the default in applied work. 'Biased coefficients' needs a change of model." },
          { t: "p", text: "**The collinear version's sum is stable at 2** while each coefficient wanders: the data identifies the direction x₁ + x₃ and nothing along x₁ − x₃. Ridge shrinks the unidentified direction toward zero, which is why it is the fix." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Adding the fee × tenure interaction made the Breusch–Pagan p-value go from 10⁻⁴⁴ to 0.36 without any weighting or robust correction. Why?",
          options: [
            "The interaction removed the outliers",
            "The funnel was a symptom of non-linearity: new customers were mispredicted by a lot and old ones by a little, which looks like unequal variance. Once the model could represent the relationship, the residuals had equal spread everywhere — the assumption was about the model, not the data",
            "Breusch–Pagan is unreliable",
            "R² rose, so all tests pass"
          ],
          answer: 1,
          why: "Diagnostics point at causes. The honest standard error on a wrong model would have been the wrong repair."
        }
      ]
    }
  ],

  takeaways: [
    "**LINE + no collinearity + exogeneity**; each has a diagnostic, a consequence and a fix.",
    "**Coefficients need linearity and no perfect collinearity; standard errors need independence and equal variance; exact p-values need normality or large n.**",
    "**Residual plots first**: a curve is non-linearity, a funnel is heteroscedasticity, a trend in row order is dependence.",
    "**On the real model three assumptions failed from one cause** — a missing interaction; fixing the model fixed every test.",
    "**Robust (HC3) SEs fix inference without touching the model; WLS changes the estimate and is efficient when the variance pattern is known.**",
    "**Autocorrelation makes OLS overclaim precision** (se 0.32 against HAC 0.52 at ρ = 0.8); use HAC or a time-series model.",
    "**Leverage is about x, outlier about y, influence needs both** — Cook's D 17.9 for the planted point, 0.06 on the line, 0.43 at the centre.",
    "**Gauss–Markov: OLS is BLUE under mean-zero, equal-variance, uncorrelated errors** — normality is for the t-tests, not for BLUE.",
    "**A p-value is distinguishability from zero under the assumptions, not importance and not causation.**",
    "**Report a fit that depends on one row with and without it.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which assumption failures bias the coefficients, and which only the standard errors?",
        options: [
          "All of them bias the coefficients",
          "Non-linearity (omitted terms) and exogeneity failures bias the coefficients; heteroscedasticity and autocorrelation leave them unbiased but make the standard errors and p-values wrong; collinearity leaves predictions fine and makes individual coefficients unstable",
          "Only normality biases them",
          "Only collinearity biases them"
        ],
        answer: 1,
        why: "This is the triage: change the model, or change the standard errors, or stop reading the coefficients."
      },
      {
        stem: "What does the Gauss–Markov theorem say, and what does it not require?",
        options: [
          "OLS is the best estimator of all",
          "Among linear unbiased estimators, OLS has the smallest variance when errors have mean zero, equal variance and no correlation; it does not require normality, which is needed only for exact t and F tests — and it says nothing about biased or non-linear estimators, which ridge and trees are",
          "OLS is unbiased whatever the errors do",
          "OLS requires normal errors to be unbiased"
        ],
        answer: 1,
        why: "'Best linear unbiased' has three qualifiers; ridge gives up 'unbiased' and often wins on total error (4.3)."
      },
      {
        stem: "A row has leverage 0.44 and a studentised residual of −0.3. How much does removing it change the fit?",
        options: [
          "Enormously; the leverage is high",
          "Very little: influence needs both a high leverage and a large residual — a high-leverage point on the line pulls toward where the line already is (Cook's D 0.06 in the executed case)",
          "It cannot be determined",
          "It changes the intercept only"
        ],
        answer: 1,
        why: "Cook's distance is roughly residual² × leverage/(1 − leverage); with a tiny residual the product is tiny."
      },
      {
        stem: "When should you use weighted least squares rather than robust standard errors?",
        options: [
          "Always; WLS is more accurate",
          "When the variance pattern is known or well estimated — variance proportional to x, or to a group size — so that weighting by 1/Var gives a more efficient estimate with an honest se; when the pattern is unknown, HC3 gives honest SEs without changing the estimate",
          "Only for time series",
          "Never; they are equivalent"
        ],
        answer: 1,
        why: "WLS with weights 1/x² gave a slope closer to the truth with a 30 % smaller se in the executed run. Wrong weights, though, make things worse — hence HC3 as the safe default."
      },
      {
        stem: "Durbin–Watson is 2.09 on the churn spend residuals. What does it tell you?",
        options: [
          "The errors are independent",
          "Nothing useful: Durbin–Watson tests autocorrelation of residuals in row order, and the rows are customers in id order with no time or spatial structure — 2.09 is the null value and would be even if the errors were correlated by region or by cohort. Dependence must be tested along the axis on which it could exist",
          "There is positive autocorrelation",
          "The model is well specified"
        ],
        answer: 1,
        why: "For grouped data the check is cluster-robust standard errors or a mixed model; DW is a time-series tool."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What are the assumptions of linear regression and what happens if they are violated?",
        strong: "Linearity in the parameters, independent errors, normal errors, equal error variance, no perfect collinearity — plus exogeneity, that the errors are unrelated to the features. They matter unequally. Non-linearity biases the coefficients: on a spend model a straight line in tenure under-predicted new customers by fifty pounds and the slope was an average of eleven and zero; the fix was a feature, and it also cleared the heteroscedasticity and skew that were its symptoms. Heteroscedasticity and dependence leave the coefficients unbiased but make the standard errors and p-values wrong — dependence badly, OLS claimed a standard error of 0.32 where the honest one was 0.52 — and the fixes are robust or HAC standard errors, or weighted least squares if the variance pattern is known. Non-normality only matters for small-sample inference. Collinearity leaves predictions alone and makes individual coefficients meaningless. And exogeneity cannot be tested from the data; violating it is the causal failure. I check them with residual plots, Breusch–Pagan, RESET, Durbin–Watson where rows have an order, VIF, and Cook's distance for single rows that steer the fit.",
        answer: [
          { t: "p", text: "Each assumption with its consequence and its fix, the executed example, and the diagnostics — ordered by what matters." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between leverage and influence?",
        strong: "Leverage is a property of the features: how far a row sits from the other rows in x-space, measured by the diagonal of the hat matrix, and it says how strongly the fit is pulled toward that row's y. Influence is what actually happens to the fit when the row is removed, and it needs both leverage and a large residual: a far-out point sitting on the line has high leverage and no influence, a point at the centre far off the line is an outlier with little influence, and a far-out point far off the line is the one that rotates the slope — from 1.49 to 1.07 in a planted example, with Cook's distance 17.9 against 0.07 for the next row. Cook's distance is the combination to sort by; a row that dominates it gets investigated, and a conclusion that depends on it gets reported both ways.",
        answer: [
          { t: "p", text: "The three cases with the executed numbers and the operational rule." }
        ]
      },
      {
        level: "advanced",
        q: "How do you interpret p-values for regression coefficients, and what are the pitfalls?",
        strong: "A coefficient's p-value is the probability, under the model and its assumptions, of an estimate at least that far from zero if the true coefficient were zero — computed from the t-statistic, which is the estimate over a standard error derived from σ̂²(XᵀX)⁻¹. Four pitfalls. The standard error assumes independent, equal-variance errors: with a funnel or autocorrelation it is wrong, sometimes by half, so p-values need robust or HAC standard errors before they mean anything. Significance is not importance: a tiny effect is significant with enough rows, and a large one is not with few. Collinearity inflates standard errors and can make every coefficient in a group insignificant while the group matters — VIF tells you. And none of it is causal: a significant coefficient in observational data is an association holding the other features fixed, and the exogeneity assumption behind a causal reading cannot be tested. I report coefficients with intervals from honest standard errors, say which assumptions were checked, and keep 'this feature matters' and 'this causes that' as separate claims with separate evidence.",
        answer: [
          { t: "p", text: "The definition via the t-statistic, then the four pitfalls — wrong SEs, significance versus importance, collinearity, causation." }
        ]
      }
    ]
  }
});

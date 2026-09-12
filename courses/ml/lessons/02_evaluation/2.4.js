/* ============================================================================
   LESSON 2.4 — Regression Metrics
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**Five errors — +10, −10, −5, +12, −10 — and every regression metric is a different way of averaging them.** MAE averages their sizes; MSE averages their squares, so RMSE is dominated by the largest; R² compares them with the errors of predicting the mean; MAPE divides each by its target and breaks when a target is near zero. This lesson computes all of them on those five numbers, then adds a sixth error of +100 and watches MAE rise 2.6× while RMSE rises 4.3× — the RMSE-over-MAE ratio being a free outlier detector. It ends with the two questions the decision guide needs: are large errors disproportionately bad, and does the target have zeros?",

  objectives: [
    "Compute MAE, MSE, RMSE, R², adjusted R², MAPE, MSLE, median absolute error and max error by hand on five errors",
    "Read the RMSE/MAE ratio as an outlier diagnostic and explain why one outlier moves RMSE more than MAE",
    "State what R² compares against, why it can be negative, and why adjusted R² exists",
    "Know when MAPE lies (near-zero targets, asymmetry) and when MSLE is the right scale, and choose the metric to train on against the one to report"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Five errors, every metric", id: "five" },

    { t: "code", lang: "text", title: "Targets 100, 150, 200, 250, 300; predictions 110, 140, 195, 262, 290 (executed)",
      code: `errors  e = ŷ - y :       +10    -10    -5    +12    -10

MAE     mean |e|            = (10 + 10 + 5 + 12 + 10) / 5              = 9.40         average size of a miss
MSE     mean e²             = (100 + 100 + 25 + 144 + 100) / 5         = 93.80        in squared units
RMSE    sqrt(MSE)           = sqrt(93.80)                              = 9.69         back in the target's units; ≥ MAE always
RMSE / MAE                  = 9.69 / 9.40                              = 1.03         near 1: errors are all about the same size
median |e|                  =                                            10.00        the typical miss, blind to the tails
max |e|                     =                                            12           the worst case

R²      1 - SS_res / SS_tot = 1 - 469 / 25,000                         = 0.981        SS_tot: errors of predicting the mean (200)
MAPE    mean |e| / y        = (0.10 + 0.067 + 0.025 + 0.048 + 0.033)/5 = 5.46 %       each error relative to its own target
MSLE    mean (ln(1+ŷ) - ln(1+y))²                                      = 0.0035       errors on the log scale: ratios, not differences
RMSLE                                                                  = 0.059`,
      caption: "On well-behaved errors the metrics agree with each other: MAE and RMSE within 3 %, R² near 1, MAPE small. The differences only appear when the errors are not well behaved — which is the situation the metric choice is for."
    },

    { t: "dl", items: [
      ["MAE", "Mean absolute error. Robust to outliers; in target units; its optimum is the median. Every error counts by its size."],
      ["MSE / RMSE", "Mean squared error and its root. Large errors count by their square, so the tail dominates; the optimum is the mean. RMSE is in target units and is what a Gaussian-noise model's likelihood measures."],
      ["R²", "1 − SS_res/SS_tot: the fraction of the target's variance the model explains, relative to predicting the training mean. 1 perfect, 0 no better than the mean, negative worse than the mean."],
      ["Adjusted R²", "R² penalised for the number of features k: 1 − (1 − R²)(n − 1)/(n − k − 1). Rises only if a new feature earns its place."],
      ["MAPE", "Mean absolute percentage error. Scale-free and intuitive; undefined at y = 0, explodes near it, and punishes over-prediction more than under-prediction."],
      ["sMAPE", "|e| / ((|y| + |ŷ|)/2): symmetric in the sense that swapping y and ŷ gives the same number; still unstable near zero."],
      ["MSLE / RMSLE", "Squared error of log(1 + ·). Measures ratio errors: predicting 50 for 100 costs about the same as 200 for 100. For targets spanning orders of magnitude; under-prediction slightly dearer."],
      ["Median AE, max error", "The typical miss and the worst miss. Report alongside the mean-based metrics when the distribution of errors matters."],
      ["Explained variance", "1 − Var(e)/Var(y). Equals R² when the errors have zero mean; differs when the model is biased."]
    ]},

    { t: "h2", n: "02", text: "One outlier arrives", id: "outlier" },

    { t: "code", lang: "text", title: "A sixth row: target 200, prediction 300 — an error of +100 (executed)",
      code: `                    five errors      with the outlier      factor
MAE                    9.40              24.50               x 2.61
RMSE                   9.69              41.77               x 4.31          <- the square of 100 is 10,000; the other five squares sum to 469
RMSE / MAE             1.03               1.70                               <- the ratio jumped: one error is far larger than the rest
median |e|            10.00              10.00                               <- unmoved
R²                     0.981              0.581                              <- one row took 40 points off R²`,
      caption: "**The RMSE/MAE ratio is a free diagnostic.** For errors of similar size it sits near 1 (exactly 1 when all errors are equal); for Gaussian errors about 1.25; anything above 1.5 says a few rows carry most of the squared error. Look at those rows before choosing a metric: if the +100 is a data error, MAE and the median tell the truth and RMSE is punishing you for a typo; if it is a real customer whose miss costs the business a hundred times more, RMSE is the metric that knows."
    },

    { t: "code", lang: "text", title: "R² is relative to the mean, and it can go below zero (executed)",
      code: `targets 10, 12, 9, 11, 13 (mean 11)
predict the mean for every row:     R² = 1 - SS_res / SS_tot = 1 - 10 / 10  =  0.0
a model predicting 20, 5, 15, 2, 25: R² = 1 - 410 / 10                       = -40.0       <- forty times worse than saying '11'

adjusted R²  = 1 - (1 - R²)(n - 1) / (n - k - 1)
   R² 0.60, n 100, k 10:   0.555         k 50:   0.192          the same fit, penalised for the features it used

a linear model on 200 rows, 3 real features, then noise features appended (executed):
   + 0 noise:  R² 0.558   adjusted 0.552
   + 5 noise:  R² 0.563   adjusted 0.544
   +20 noise:  R² 0.586   adjusted 0.532
   +50 noise:  R² 0.677   adjusted 0.559          <- plain R² rose 12 points on pure noise; adjusted did not reward it`,
      caption: "R² is a comparison with the laziest possible model, which is why 'R² of 0.3' can be excellent (a noisy target nobody can predict well) or dreadful (a smooth target a lookup table would nail). And on the training set R² never falls when a feature is added — that is what adjusted R² corrects, and what a held-out set corrects better."
    },

    { t: "h2", n: "03", text: "Percentages and logs", id: "scale" },

    { t: "code", lang: "text", title: "The MAPE trap and the log alternative (executed)",
      code: `targets 100, 100, 100, 1;  predictions 90, 110, 105, 3;  errors -10, +10, +5, +2
MAPE over all four rows:    56.2 %          the row with target 1 and error 2 contributes 200 % on its own
MAPE over the first three:   8.3 %

asymmetry:  true 100, predict 50   -> 50 %       true 100, predict 150 -> 50 %      but  true 50, predict 100 -> 100 %
            MAPE penalises over-prediction more, because the denominator is the (smaller) truth
sMAPE:      (100, 50) and (50, 100) both give 66.7 %

MSLE measures ratios:
   true 100, predict  50:  squared log error 0.467     squared error  2,500
   true 100, predict 200:  squared log error 0.474     squared error 10,000      <- half and double cost about the same on the log scale
   true 100, predict  90:  0.011 ;  predict 110: 0.009                            <- slight preference for over-prediction`,
      caption: "MAPE is the metric stakeholders ask for and the one most likely to be dominated by rows that do not matter — the small store, the near-zero demand day. When the target has zeros or spans orders of magnitude, train on the log target and report RMSLE or MAE on the original scale (10.3 has the forecasting version, with MASE as the scale-free metric that does not break)."
    },

    { t: "h2", n: "04", text: "A real model under every metric", id: "real" },

    { t: "code", lang: "python", title: "The spend model from 1.2's exercise, two learners, test set of 198 rows (executed)",
      hl: [3, 4],
      code: `# target spend_12m: mean 122, sd 56, minimum 0 (a constant predictor's RMSE is about 56)
#            MAE     RMSE    RMSE/MAE   median AE   max error    R²      MAPE      RMSLE
# ridge     19.08   25.57     1.34       15.64       128.8      0.782    50.9 %    0.434
# hist-gbr   7.10    9.03     1.27        6.21        40.7      0.973    13.2 %    0.235

# the ratio near 1.3 for both: errors are roughly Gaussian, no single row dominates.
# MAPE 50.9 % for ridge with MAE 19 on a mean of 122: the customers with near-zero spend blow it up; RMSLE and MAE tell the story.
# max error 128.8 against a target sd of 56: the linear model misses the fee x tenure interaction badly for some rows (1.2).`,
      caption: "One model, eight numbers, and the decision does not change: the booster is better on every one. Where the metrics would disagree is when the errors are not Gaussian — a few enormous misses (RMSE and max error say 'bad', MAE and the median say 'fine') or a target near zero (MAPE says 'terrible', everything else says 'fine'). The disagreement is information about the error distribution, not a contradiction."
    },

    { t: "table",
      head: ["Question", "If yes", "If no"],
      rows: [
        ["Are large errors disproportionately costly (a 20-unit miss is more than twice as bad as a 10-unit miss)?", "RMSE / MSE — train on squared error, report RMSE", "MAE — train on absolute or Huber, report MAE and the median"],
        ["Are there outliers you do not trust?", "MAE, median AE; investigate the rows the RMSE/MAE ratio points at", "RMSE is fine"],
        ["Does the target span orders of magnitude, or have a hard zero?", "Log the target; report RMSLE and MAE on the original scale; never MAPE", "Plain units"],
        ["Does the stakeholder think in percentages?", "MAPE only if no target is near zero; otherwise WAPE (Σ\\|e\\| / Σ\\|y\\|) or sMAPE with the caveat", "MAE in units"],
        ["Do you need a scale-free comparison across targets?", "R² (with the mean-baseline caveat) or MASE for series", "Units"],
        ["Are you comparing models with different feature counts on the training set?", "Adjusted R² — or, better, a held-out set", "R²"]
      ]
    },

    { t: "callout", kind: "mental", title: "Train on one, report another — deliberately", body: [
      { t: "p", text: "The loss the model minimises and the metric the business reads need not match. A model trained on squared error (the Gaussian likelihood, smooth, well-conditioned) can be reported with MAE because MAE is what the operations team understands; a model trained on the log target because spend is right-skewed can be reported in pounds on the original scale. **What must match is the metric and the decision**: if a ten-unit miss and a hundred-unit miss are equally tolerable, do not let RMSE choose your model." }
    ]},

    { t: "ladder",
      title: "Reporting a demand forecast to a supply-chain team",
      rungs: [
        { level: "bad", label: "'MAPE is 56 %'", code: `mean_absolute_percentage_error(y, yhat)     # dominated by the SKUs that sell one unit a week`,
          note: "**The number is about the denominator, not the model.** A near-zero target makes any error a huge percentage." },
        { level: "ok", label: "'MAE is 9.4 units; RMSE 9.7'", code: `mean_absolute_error(y, yhat), root_mean_squared_error(y, yhat)`,
          note: "**Honest, in units.** The team still cannot tell whether 9.4 units is good for their volumes." },
        { level: "best", label: "MAE in units, against the naive baseline, with the ratio and the worst rows", code: `# MAE 9.4 units against 31 for 'same as last week' (a 70 % improvement); RMSE/MAE 1.03 so no SKU is being badly missed;
# WAPE 5.5 % of total volume; the three largest misses attached, with the promotion that explains two of them`,
          note: "**A baseline gives the number meaning, the ratio says the errors are well behaved, and the worst rows are where the next improvement is.** Percent of total volume (WAPE) is the honest percentage." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Metrics from scratch and a metric that disagrees",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement MAE, MSE, RMSE, R², adjusted R², MAPE, sMAPE, WAPE and RMSLE in NumPy and verify each against scikit-learn on the spend model's test predictions. **(b)** Construct a set of eight targets and predictions where model A beats model B on MAE but loses on RMSE, and explain in one sentence what the error distributions must look like. **(c)** Construct a case where R² on the training set rises when a feature is added but adjusted R² falls, using a random noise feature, and state the n and k that make the penalty bite." }
      ],
      requirements: [
        "Nine functions agreeing with scikit-learn (where scikit-learn has the metric) to 6 decimals.",
        "The (b) construction with both metrics computed for both models.",
        "The (c) construction with the four numbers."
      ],
      hint: "For (b): A has many moderate errors, B has mostly tiny errors and one large one. MAE prefers B's small errors; RMSE punishes B's one large error. For (c): with n = 30 rows and k going from 3 to 4, the (n−1)/(n−k−1) factor grows from 29/26 to 29/25.",
      solution: {
        lang: "python",
        title: "regression_metrics.py",
        code: `def mae(y, p):   return np.mean(np.abs(p - y))
def mse(y, p):   return np.mean((p - y) ** 2)
def rmse(y, p):  return np.sqrt(mse(y, p))
def r2(y, p):    return 1 - np.sum((p - y) ** 2) / np.sum((y - y.mean()) ** 2)
def adj_r2(y, p, k): n = len(y); return 1 - (1 - r2(y, p)) * (n - 1) / (n - k - 1)
def mape(y, p):  return np.mean(np.abs((p - y) / y))
def smape(y, p): return np.mean(np.abs(p - y) / ((np.abs(y) + np.abs(p)) / 2))
def wape(y, p):  return np.sum(np.abs(p - y)) / np.sum(np.abs(y))
def rmsle(y, p): return np.sqrt(np.mean((np.log1p(p) - np.log1p(y)) ** 2))
# check: mae == mean_absolute_error, rmse == root_mean_squared_error, r2 == r2_score, mape == mean_absolute_percentage_error,
#        rmsle == sqrt(mean_squared_log_error). sMAPE and WAPE have no scikit-learn function; check them against each other's definitions.

# (b) MAE and RMSE disagree
y = np.zeros(8)
A = np.array([4, -4, 4, -4, 4, -4, 4, -4.])          # eight moderate errors:   MAE 4.00   RMSE 4.00
B = np.array([1, -1, 1, -1, 1, -1, 1, 20.])          # seven tiny, one large:   MAE 3.38   RMSE 7.13
# B wins on MAE (its typical error is small) and loses on RMSE (its one 20 is squared to 400, more than all of A's squares combined).
# the error distributions: A's are uniform in size; B's are concentrated near zero with one heavy-tail row.

# (c) R² up, adjusted R² down
rng = np.random.default_rng(2); n = 30
X = rng.normal(size=(n, 3)); yy = X @ [1, 1, 1] + rng.normal(0, 2, n)
base = LinearRegression().fit(X, yy); r_base = r2(yy, base.predict(X))
Xn = np.c_[X, rng.normal(size=n)]                    # one pure-noise column
noisy = LinearRegression().fit(Xn, yy); r_noisy = r2(yy, noisy.predict(Xn))
print(r_base, adj_r2(yy, base.predict(X), 3), r_noisy, adj_r2(yy, noisy.predict(Xn), 4))
# executed: R² 0.4592 -> 0.4722 (up), adjusted 0.3969 -> 0.3878 (down)
# on the training set R² cannot fall when a column is added (least squares can always set its weight to zero or better);
# the adjustment multiplies (1 - R²) by (n-1)/(n-k-1) = 29/26 then 29/25, so unless the noise column raised R² by more than
# that factor's worth, adjusted R² falls. With n = 30 the penalty per feature is about 4 % of (1 - R²); with n = 3,000 it is 0.03 %,
# which is why adjusted R² matters for small n and is nearly cosmetic for large n.`,
        notes: [
          { t: "p", text: "**(b) is the whole MAE-versus-RMSE question in eight numbers**: they rank models differently exactly when one model's errors have a heavier tail, and which ranking is right depends on whether that tail is costly." },
          { t: "p", text: "**(c) shows adjusted R² is a small-sample correction**: the penalty is (n − 1)/(n − k − 1), which is nearly 1 when n is in the thousands. A held-out set makes the same correction without a formula, at any n." },
          { t: "p", text: "**WAPE is the percentage metric to reach for** when stakeholders want a percentage and the target has small values: it divides the total error by the total volume, so a one-unit store cannot dominate." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The RMSE/MAE ratio of a model's errors is 1.7. What does that tell you, and what do you do next?",
          options: [
            "The model is overfitting",
            "A few rows carry most of the squared error — one or more errors are far larger than the typical one; look at those rows, decide whether they are data errors (then report MAE) or genuine costly misses (then RMSE is right), and fix the model or the data accordingly",
            "Switch to MAPE",
            "Nothing; the ratio is always about 1.7"
          ],
          answer: 1,
          why: "For equal errors the ratio is 1; for Gaussian errors about 1.25. The sixth error of +100 took it from 1.03 to 1.70 in the executed example."
        }
      ]
    }
  ],

  takeaways: [
    "**MAE is the average size of a miss; RMSE weights large misses by their square** — the outlier moved MAE 2.6× and RMSE 4.3×.",
    "**RMSE/MAE near 1: uniform errors; ~1.25: Gaussian; above 1.5: a few rows dominate** — a free diagnostic.",
    "**R² compares with predicting the mean**: 0 is the mean, negative is worse than the mean (−40 is possible), and its meaning depends on how predictable the target is.",
    "**Training R² never falls when a feature is added; adjusted R² penalises by (n−1)/(n−k−1)** — noise features raised R² 12 points and adjusted R² not at all.",
    "**MAPE breaks near zero** (56 % from one row) **and is asymmetric**; WAPE or sMAPE for percentages, and never MAPE with zeros.",
    "**MSLE / RMSLE measure ratio errors** — halving and doubling cost the same — for targets spanning orders of magnitude.",
    "**Report the median and max error alongside the means** when the error distribution matters.",
    "**Train on one loss, report another, deliberately**; what must match is the reported metric and the decision.",
    "**Always report against a baseline** (the mean, last week's value): the number has no meaning alone.",
    "**Two questions decide**: are large errors disproportionately costly, and does the target have zeros?"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does one error of +100 raise RMSE more than MAE?",
        options: [
          "RMSE is always larger",
          "RMSE squares before averaging: 100² = 10,000 against the other five squares totalling 469, so the one row is 95 % of the MSE; MAE adds 100 to a total of 47, a smaller share",
          "MAE ignores outliers",
          "Because of the square root"
        ],
        answer: 1,
        why: "Squaring makes the tail dominate. Whether that is a feature or a bug depends on whether a large miss really is disproportionately costly."
      },
      {
        stem: "When is R² of 0.3 a good result?",
        options: [
          "Never; 0.3 is poor",
          "When the target is intrinsically noisy — a human outcome, a financial return — so that even the best possible model explains little of its variance; R² is relative to the mean baseline, not to an absolute standard",
          "Only on the training set",
          "When n is small"
        ],
        answer: 1,
        why: "Compare with what other models and domain knowledge achieve on the same target. The same 0.3 on a smooth physical measurement would be a failure."
      },
      {
        stem: "A stakeholder wants a percentage error and some targets are zero. What do you report?",
        options: [
          "MAPE, excluding the zeros",
          "WAPE — total absolute error over total absolute target — which is a percentage of volume and cannot be blown up by small targets; or sMAPE with its caveats; and MAE in units alongside",
          "MAPE as is",
          "R²"
        ],
        answer: 1,
        why: "Excluding the zeros silently drops the rows that are often the hardest and most consequential. WAPE keeps them and answers 'what fraction of total volume did we miss'."
      },
      {
        stem: "Why can training-set R² only rise when a feature is added?",
        options: [
          "Because features are informative",
          "Because least squares can always set the new feature's coefficient to whatever minimises SS_res, including zero, so the residual sum can only stay the same or fall — adjusted R² and held-out evaluation exist to remove this guaranteed optimism",
          "It cannot; R² can fall",
          "Because of collinearity"
        ],
        answer: 1,
        why: "Fifty noise features raised training R² from 0.558 to 0.677. The executed adjusted R² stayed at 0.55–0.56."
      },
      {
        stem: "What does MSLE treat as equally bad, and when is that right?",
        options: [
          "Errors of equal size",
          "Errors of equal ratio — predicting 50 or 200 for a true 100 cost about the same — which is right when the target spans orders of magnitude and a miss of 10 on a value of 20 matters as much as 1,000 on 2,000",
          "Over- and under-prediction exactly",
          "Errors near zero"
        ],
        answer: 1,
        why: "Log-scale metrics are the natural companion to log-transformed targets (3.4) and to right-skewed quantities like spend, counts and prices."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between MAE and RMSE, and when would you prefer each?",
        strong: "Both average the errors; MAE averages their absolute sizes, RMSE averages their squares then takes the root, so RMSE is at least MAE and is pulled up by large errors. On five errors around ten they were 9.4 and 9.7; adding one error of a hundred made them 24.5 and 41.8. Prefer RMSE when large errors are disproportionately costly — a demand miss that empties a warehouse — and when you want the metric that matches a Gaussian-noise model's likelihood. Prefer MAE when errors are roughly equally costly per unit, when the target has outliers you do not trust, or when the stakeholder needs 'typical miss in units'. The ratio between them is a diagnostic: near 1.25 for Gaussian errors, well above 1.5 when a few rows dominate — and those rows are the first thing to look at.",
        answer: [
          { t: "p", text: "The squaring mechanism, the numbers, the cost criterion, and the ratio as a diagnostic." }
        ]
      },
      {
        level: "core",
        q: "Can R² be negative? What does adjusted R² add?",
        strong: "Yes: R² is one minus the model's residual sum of squares over the residual sum of predicting the mean, so it is zero for the mean and negative for anything worse than the mean — a model predicting 20, 5, 15, 2, 25 for targets near 11 scores −40. It is relative, not absolute, which is why 0.3 can be good on a noisy target. Adjusted R² multiplies (1 − R²) by (n − 1)/(n − k − 1), penalising the number of features, because on the training set R² can only rise when a column is added — fifty noise columns took it from 0.56 to 0.68 in a run I did, while adjusted R² stayed put. The penalty matters for small n; for thousands of rows it is nearly cosmetic, and a held-out set is the better correction at any size.",
        answer: [
          { t: "p", text: "The mean-baseline definition, a negative example, the guaranteed-rise argument, and adjusted R² as a small-sample fix." }
        ]
      },
      {
        level: "advanced",
        q: "The business wants MAPE. What do you say?",
        strong: "That MAPE answers a reasonable question — how far off are we, in percent — and fails in two specific ways they should know about. It divides each error by its own target, so any row with a target near zero dominates: four rows with errors of ten, ten, five and two gave a MAPE of 56 % because one target was 1, and 8 % without it. And it is asymmetric — predicting 150 for a true 100 costs 50 %, predicting 100 for a true 50 costs 100 %, the same absolute miss at double the penalty because the denominator is the smaller truth — so a model optimised for it learns to under-forecast. I would offer WAPE, total absolute error over total volume, which is the percentage they actually mean and is robust to small targets; report MAE in units with the naive baseline beside it; and if the target spans orders of magnitude, model it on the log scale and report RMSLE too. If they still want MAPE on the dashboard, it goes there with a floor on the targets it includes and a note.",
        answer: [
          { t: "p", text: "Two named failure modes with numbers, the WAPE substitute, and a way to say yes without lying." }
        ]
      }
    ]
  }
});

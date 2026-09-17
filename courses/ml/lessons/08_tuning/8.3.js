/* ============================================================================
   LESSON 8.3 — Learning and Validation Curves
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "**Two plots answer the question every model owner eventually asks — 'what would actually help?' — and they answer it before any of the help is bought.** A learning curve puts training and validation score against the number of rows; a validation curve puts them against one hyperparameter. The *gap* between the two lines is variance, the *level* of the validation line is bias, and the *slope* of the validation line says whether more data would move it. This lesson generates the four canonical shapes on data built to produce them — a linear model on an interaction truth (both lines converge at 0.66: bias; ten times the data lifted it 0.03), an unpruned tree (train 1.000, CV 0.735: variance), a boosted model still climbing (0.775 → 0.917), and a model at its floor — then reads the churn and spend data the same way: logistic regression gains 0.02 from doubling the rows and is at its feature-limited floor, while the spend forest is still descending at 791 rows (7.37 against a floor of 6.38) and would repay more data. Validation curves finish the toolkit: the tree's depth peaks at 3, the forest's leaf size at 50, the SVM's γ at 0.01, each with the training line climbing past the point where the validation line turns.",

  objectives: [
    "Build learning and validation curves with cross-validation, and read gap, level and slope",
    "Recognise the four shapes — high bias, high variance, still learning, at the floor — and name the action each implies",
    "Distinguish 'more data' from 'more capacity' from 'more regularisation' using evidence rather than instinct",
    "Read the training line as a capacity meter and the fold spread as a data-size meter"
  ],

  prerequisites: ["1.3", "2.7", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "Four shapes, generated on purpose", id: "shapes" },

    { t: "code", lang: "python", title: "learning_curve on data built to produce each shape (executed, 5-fold AUC, six training sizes)",
      hl: [3, 4, 7, 8, 11, 12, 15, 16],
      code: `#   n_train                          240      480      840     1,200    1,680    2,400
# HIGH BIAS -- logistic regression on a truth made of interactions (x₁x₂ > 0 XOR x₃ > 0.5)
#   train AUC                       0.734    0.708    0.680    0.674    0.668    0.669
#   CV AUC                          0.617    0.637    0.645    0.649    0.655    0.659      gap at full size 0.010     <- both lines low and together: the model cannot represent the truth
# HIGH VARIANCE -- an unpruned decision tree on a learnable 20-feature problem
#   train AUC                       1.000    1.000    1.000    1.000    1.000    1.000
#   CV AUC                          0.647    0.692    0.708    0.713    0.726    0.735      gap 0.265                   <- training perfect, validation far below and still rising
# STILL LEARNING -- HistGradientBoosting with early stopping on the same problem
#   train AUC                       0.988    0.995    0.994    0.997    0.996    0.995
#   CV AUC                          0.775    0.828    0.871    0.892    0.909    0.917      gap 0.078                   <- the validation line has not flattened: more rows will pay
# AT THE FLOOR -- logistic regression on the same (mostly linear) problem
#   train AUC                       0.757    0.739    0.736    0.732    0.734    0.733
#   CV AUC                          0.686    0.707    0.710    0.721    0.723    0.725      gap 0.008                   <- converged to the model's ceiling; only a different model moves it`,
      caption: "Read every learning curve in three steps. The **gap** between training and validation at the right-hand end is variance: 0.265 for the tree, 0.01 for the linear model. The **level** of the validation line is the bias plus the noise: 0.66 for a linear model on an interaction truth is bias, 0.725 on the linear truth is the noise floor. The **slope** of the validation line at the right is what more data would do: still rising for boosting and the tree, flat for the linear models."
    },

    { t: "viz",
      title: "High bias against high variance (executed values)",
      caption: "Left: a linear model on an interaction truth — the lines meet at a low level and stay there; more rows change nothing, and only more capacity can. Right: an unpruned tree — the training line is perfect and the validation line trails far below, still rising; more rows help, and so does regularisation or averaging (6.2).",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two panels of training and cross-validated AUC against training set size. Left, labelled high bias: both lines sit near 0.66 to 0.73 and converge. Right, labelled high variance: the training line is flat at 1.0 and the validation line rises from 0.65 to 0.74 with a wide gap.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="430" y2="250"/><line x1="80" y1="40" x2="80" y2="250"/><line x1="490" y1="250" x2="840" y2="250"/><line x1="490" y1="40" x2="490" y2="250"/></g>
  <g class="s-sub">
    <text x="72" y="254" text-anchor="end">0.6</text><text x="72" y="204" text-anchor="end">0.7</text><text x="72" y="154" text-anchor="end">0.8</text><text x="72" y="104" text-anchor="end">0.9</text><text x="72" y="54" text-anchor="end">1.0</text>
    <text x="482" y="254" text-anchor="end">0.6</text><text x="482" y="204" text-anchor="end">0.7</text><text x="482" y="154" text-anchor="end">0.8</text><text x="482" y="104" text-anchor="end">0.9</text><text x="482" y="54" text-anchor="end">1.0</text>
    <text x="90" y="270" text-anchor="middle">240</text><text x="237" y="270" text-anchor="middle">1,200</text><text x="420" y="270" text-anchor="middle">2,400</text>
    <text x="500" y="270" text-anchor="middle">240</text><text x="647" y="270" text-anchor="middle">1,200</text><text x="830" y="270" text-anchor="middle">2,400</text>
    <text x="255" y="290" text-anchor="middle">training rows — high bias</text><text x="665" y="290" text-anchor="middle">training rows — high variance</text>
  </g>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" points="90,183 127,196 182,210 237,213 310,216 420,215"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.4" points="90,242 127,231 182,227 237,225 310,222 420,220"/>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" points="500,50 537,50 592,50 647,50 720,50 830,50"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.4" points="500,226 537,204 592,196 647,194 720,187 830,182"/>
  <g class="s-label" style="font-weight:600">
    <text x="300" y="205" style="fill:var(--ink-3)">train 0.669</text><text x="300" y="238" style="fill:var(--accent)">CV 0.659</text>
    <text x="700" y="66" style="fill:var(--ink-3)">train 1.000</text><text x="700" y="176" style="fill:var(--accent)">CV 0.735, rising</text>
  </g>
  <line x1="830" y1="52" x2="830" y2="180" style="stroke:var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/><text x="760" y="120" class="s-sub" style="fill:var(--warn)">gap 0.265</text>
</svg>`
    },

    { t: "table",
      head: ["Shape", "Training line", "Validation line", "Diagnosis", "What helps", "What does not"],
      rows: [
        ["Converged, low", "Low, near the validation line", "Low, flat", "High bias: the model cannot represent the truth", "More capacity: features, interactions, a non-linear model (HistGB: 0.53 → 1.00 on the interaction truth)", "More data (10× rows: +0.03); more regularisation"],
        ["Wide gap", "High (1.0 for a tree)", "Far below, rising", "High variance: fitting noise", "More data; regularisation (leaf size, depth, C); averaging (6.2)", "More capacity"],
        ["Narrowing gap, both rising", "High", "Rising, not yet flat", "Still learning", "More data, first of all (boosting: 0.775 → 0.917)", "Changing the model before the curve flattens"],
        ["Converged, high", "Near the validation line", "Flat at a good level", "At the floor for these features and this noise", "Better features, cleaner labels (1.2); or stop", "More data; more tuning (logistic C: 0.736–0.743 across five decades)"]
      ]
    },

    { t: "dl", items: [
      ["Learning curve", "Score against training-set size, for training and validation folds; `learning_curve(model, X, y, train_sizes, cv)`. Each size is a subsample of the training fold, scored on the same validation fold."],
      ["Validation curve", "Score against one hyperparameter, training and validation; `validation_curve(model, X, y, param_name, param_range, cv)`. The degree sweep of 4.4 and the staged curve of 6.3 are validation curves."],
      ["Gap", "Training minus validation score. Variance: how much the model has fitted that does not generalise."],
      ["Level", "Where the validation line sits. Bias plus irreducible noise; the noise part is what an oracle would still get wrong."],
      ["Slope", "The validation line's rise at the largest size. Positive: data would help. Flat: it would not, for this model."],
      ["Fold spread", "Standard deviation of the score across folds. ±0.129 on 100 rows, ±0.057 on 791: the reliability of the estimate itself, not of the model."]
    ]},

    { t: "h2", n: "02", text: "The course data, read by curve", id: "course-data" },

    { t: "code", lang: "python", title: "Churn: three models' learning curves (executed, 5-fold AUC)",
      hl: [3, 4, 6, 7, 9, 10],
      code: `#   n_train                     79      158      276      395      553      791
#   logistic       train      0.877    0.804    0.792    0.790    0.782    0.781
#                  CV         0.625    0.662    0.700    0.722    0.734    0.742      gap 0.04; gain from 395 -> 791 rows: +0.020
#   forest (leaf 20)   train  0.834    0.818    0.837    0.840    0.842    0.839
#                  CV         0.658    0.667    0.683    0.698    0.712    0.727      gap 0.11; still rising a little
#   HistGB (depth 2, es) train 0.849    0.858    0.855    0.842    0.823    0.809
#                  CV         0.636    0.628    0.679    0.702    0.692    0.719      gap 0.09; noisy -- early stopping on 20 % of 79 rows is a coin toss
#   fold spread of the logistic estimate:  100 rows ± 0.129     300 rows ± 0.066     791 rows ± 0.057`,
      caption: "The logistic model's curve is nearly flat and nearly closed: doubling the rows bought 0.02, and the remaining distance to a useful score is not variance to be removed by data but bias to be removed by features — which is the answer 3.4 and 4.5 already reached from the other direction, and here it is read off a single plot. The forest's and boosting's gaps are larger and their validation lines still rise, so they would gain more from a few thousand rows than the linear model would; but their level is no higher, which says the extra capacity has nothing in these features to use."
    },

    { t: "code", lang: "python", title: "More data versus more capacity: the interaction truth with ten times the rows (executed)",
      hl: [2, 3, 4],
      code: `#   n_train                        240      720     2,400    7,200    24,000
#   logistic             CV       0.509    0.523    0.524    0.536    0.535      <- 100× the data: +0.03. The linear model cannot see x₁x₂
#   logistic + degree-2  CV       0.545    0.579    0.624    0.657    0.679      <- the interaction is now a feature; slow climb (231 columns to fit)
#   HistGB               CV       0.627    0.965    1.000    1.000    1.000      <- the right capacity finds it at 720 rows and saturates at 2,400`,
      caption: "This is the experiment that settles the 'just get more data' argument for a biased model: one hundred times the rows moved logistic regression from 0.51 to 0.54, because no amount of data makes a line into a product. Capacity is the fix, and the learning curve of the right model shows it saturating at a fraction of the data the wrong model was starved of. The order of operations follows: read the curve, fix bias with capacity or features, fix variance with data or regularisation, and stop when both lines are flat and together."
    },

    { t: "h2", n: "03", text: "Validation curves: the dial", id: "validation" },

    { t: "code", lang: "python", title: "Four dials on the churn data (executed, 5-fold AUC)",
      hl: [3, 6, 9, 12],
      code: `#   logistic C          0.001    0.01     0.1      1        10       100
#     train             0.764    0.773    0.780    0.781    0.781    0.781
#     CV                0.736    0.741    0.743    0.742    0.741    0.741      <- flat across five decades: nothing to tune; the model is at its floor (4.3)
#   tree max_depth      1        2        3        4        6        8        12
#     train             0.641    0.720    0.759    0.787    0.856    0.925    0.994
#     CV                0.587    0.644    0.679    0.662    0.634    0.601    0.542      <- peak at 3; training keeps climbing: capacity beyond 3 is spent on noise
#   forest min_samples_leaf  1   3        5        10       20       50       100
#     train             1.000    0.985    0.950    0.891    0.839    0.790    0.759
#     CV                0.700    0.698    0.716    0.722    0.726    0.728    0.722      <- best at 50; the gap closes from 0.30 to 0.06 with almost no loss of CV
#   SVC gamma (C=1)     1e-4     1e-3     0.01     0.1      1        10
#     train             0.761    0.764    0.790    0.870    0.984    1.000
#     CV                0.734    0.730    0.740    0.699    0.590    0.558      <- 0.01; beyond it the RBF memorises (5.3)`,
      caption: "A validation curve is a learning curve with capacity instead of data on the x-axis, and it is read the same way: where the training line rises and the validation line falls, the added capacity is fitting noise. Three of the four dials have a clear turn; the fourth is flat, which is itself the finding — a regulariser that changes nothing across five decades means the model is not variance-limited, and the search in 8.1 should be spent elsewhere."
    },

    { t: "code", lang: "python", title: "Spend regression: a model that would repay more data (executed, 5-fold MAE)",
      code: `#   n_train                 79      158      276      395      553      791
#   linear (ridge)   train  18.33    19.10    20.27    20.00    19.82    19.85
#                    CV     20.02    20.00    20.24    20.14    19.95    19.93      <- flat from 158 rows: the linear model's bias floor is 20
#   forest (leaf 3)  train   8.86     6.41     5.68     5.16     4.92     4.84
#                    CV     13.66    10.37     8.31     7.80     7.39     7.37      <- still descending; the noise floor is 6.38
# the forest's gap (2.5) is small and its slope is not yet zero: a few thousand more rows would take it toward the floor`,
      caption: "The two curves on one target are the whole argument for looking before deciding: the linear model's problem is its form (flat at 20, no data will move it; 4.4's engineered column fixed it at once), the forest's problem is data (still descending at the last size). The same request — 'improve the spend model' — has opposite answers for the two models, and the curves say which."
    },

    { t: "callout", kind: "mental", title: "Reading a curve in ten seconds", body: [
      { t: "p", text: "**Gap wide?** Variance — regularise, average, or get data. **Both lines low and together?** Bias — capacity or features; data will not help (0.51 → 0.54 at 100× the rows). **Validation still rising at the right edge?** Data will help; get it before changing anything else. **Both flat and together at a good level?** Done; the rest is features or noise. **Fold spread wide?** The estimate itself is unreliable (±0.13 at 100 rows) — do not tune on it. And a validation curve whose two lines both flatten across the whole range says the dial does not matter: stop searching it." }
    ]},

    { t: "ladder",
      title: "A model owner asks whether to buy 50,000 more labelled rows",
      rungs: [
        { level: "bad", label: "'More data always helps' — buy them", code: `# no curve; purchase order`,
          note: "**For a linear model on an interaction truth, 100× the rows bought 0.03 AUC.** For the churn logistic model, 2× bought 0.02. The purchase may buy nothing." },
        { level: "ok", label: "Learning curve of the current model", code: `learning_curve(model, X, y, train_sizes=np.linspace(0.1, 1.0, 6), cv=5, scoring="roc_auc")     # slope at the right edge, gap, level`,
          note: "**An answer for this model**: flat slope means no; rising slope means yes, and the curve's shape extrapolates roughly how much." },
        { level: "best", label: "Learning curves for the current model and the best higher-capacity alternative, plus the fold spread", code: `for m in [current, HistGB(early_stopping=True)]: learning_curve(m, ...)      # is the ceiling the model's or the data's?
# decide: bias -> spend on features/capacity first; variance or rising slope -> buy the rows; report the expected gain from the extrapolated curve, with the fold spread as its uncertainty`,
          note: "**The question was never 'more data?' but 'what is the binding constraint?'** — and two curves answer it with an expected gain and an error bar." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "Diagnose three curves you must generate, and one you must extrapolate",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Build a learning curve for KNN (k = 5) on the 20-feature synthetic problem and classify its shape; then repeat with k = 51 and explain how k moved the gap and the level. **(b)** Build the validation curve for HistGradientBoosting's `learning_rate` over {0.01, 0.03, 0.1, 0.3, 1.0} at 200 iterations on the churn data, and locate the turn; explain why the training line keeps rising past it. **(c)** From the spend forest's curve (CV MAE 13.66, 10.37, 8.31, 7.80, 7.39, 7.37 at 79–791 rows), fit MAE ≈ a + b/√n and estimate the rows needed to reach 6.8; state what assumption the extrapolation makes and when it fails." }
      ],
      requirements: [
        "(a) two shapes with gap and level, and the explanation.",
        "(b) the two lines, the turn, and the reason.",
        "(c) the fitted a and b, the row estimate, and the caveat."
      ],
      hint: "(a) k = 5 has near-perfect training (its own row is a neighbour); k = 51 averages. (b) At 200 iterations a large rate overshoots. (c) Least squares on (1/√n, MAE); the floor a should be near 6.38.",
      solution: {
        lang: "python",
        title: "curves_practice.py",
        code: `# (a) executed (5-fold AUC, n = 240 ... 2,400):
#   k = 5:   train 0.926 -> 0.954    CV 0.808 -> 0.893    gap at full 0.061     <- the own-row vote is 1 of 5, so training is high but not perfect; a variance shape
#   k = 51:  train 0.789 -> 0.915    CV 0.761 -> 0.904    gap 0.011             <- averaging over 51 rows cannot memorise: the gap closes and the CV level ends HIGHER
#   k is a regulariser: it moved the curve from the wide-gap shape toward the converged shape, and on 2,400 rows the smoother model wins;
#   at small n (240) the sharper k = 5 was ahead (0.808 vs 0.761) -- the best k depends on the data size, which is what the curve shows.

# (b) executed: validation_curve(HistGradientBoostingClassifier(max_iter=200), ..., learning_rate = [0.01, 0.03, 0.1, 0.3, 1.0])
#   train  0.956   0.999   1.000   1.000   1.000
#   CV     0.693   0.689   0.685   0.658   0.657
#   at 200 iterations the best rate is the SMALLEST tested -- the turn lies at or below 0.01, because rate × iterations is the budget (6.3) and
#   200 × 0.03 already overspends it on 791 rows; the training line reaches 1.000 by 0.03 because residual noise is fittable and fitted.
#   a validation curve at one iteration count is a slice of a two-dimensional surface; the next slice to cut is iterations at rate 0.01.

# (c) MAE ≈ a + b/√n, least squares on the six points:  a = 3.72,  b = 85.6
#   the free fit predicts 6.76 at 791 rows where the observed value is 7.37, and puts the 6.8 target at 773 rows -- FEWER than already used.
#   the form is wrong at the right end: the curve flattened faster than 1/√n, and the fitted asymptote (3.72) is below the noise floor (6.38),
#   which is impossible. Anchor the floor instead: MAE = 6.38 + b/√n with b from the last three points ≈ 26.6  ->  6.8 needs √n = 26.6/0.42 = 63,
#   n ≈ 4,000 rows. The assumption in any such extrapolation is that the remaining error is variance that keeps averaging out at the fitted rate;
#   it fails as the curve approaches a bias or noise floor, so extrapolate only to the nearest known floor and re-fit as rows arrive.`,
        notes: [
          { t: "p", text: "**(a)** is the k dial seen through the learning curve: a hyperparameter moves the *shape*, not just the score." },
          { t: "p", text: "**(b)** is the same reading for a boosting dial — and a reminder that a validation curve at one iteration count is a slice of a two-dimensional surface." },
          { t: "p", text: "**(c)** shows why extrapolation needs a floor: the free fit gave an answer (773 rows) the data had already refuted (7.37 at 791); anchored to the noise floor it gave ~4,000, which is a forecast rather than a promise." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Logistic regression on the interaction truth scored CV 0.509 at 240 rows and 0.535 at 24,000, with the training line converging to the same level. What is the diagnosis and the fix?",
          options: [
            "High variance; regularise more",
            "High bias: both lines low and together, and one hundred times the data moved the validation line by 0.03 because a linear model cannot represent x₁x₂. The fix is capacity or features — degree-2 features climbed to 0.68, and gradient boosting reached 1.00 by 2,400 rows",
            "Too little data; collect more",
            "The labels are noisy"
          ],
          answer: 1,
          why: "A flat, low validation line is the signature that says 'do not buy rows'."
        }
      ]
    }
  ],

  takeaways: [
    "**Learning curve: score vs rows; validation curve: score vs a hyperparameter** — both with training and validation lines, both read by gap, level and slope.",
    "**Gap = variance** (tree 0.265, logistic 0.01); **level = bias + noise**; **slope at the right edge = what data would buy**.",
    "**High bias**: lines low and together; 100× rows → +0.03; fix with capacity or features (HistGB 0.53 → 1.00).",
    "**High variance**: training 1.000, validation 0.735 and rising; fix with data, regularisation or averaging.",
    "**Still learning**: validation rising (boosting 0.775 → 0.917) — get data before changing anything else.",
    "**At the floor**: flat and together (logistic 0.725; C flat from 0.001 to 100) — features or stop.",
    "**Churn**: logistic gains 0.02 from doubling rows and is feature-limited; **spend**: the forest is still descending (7.37 vs floor 6.38) and would repay rows while the linear model is flat at 20.",
    "**Validation curves locate the turn**: depth 3, leaf 50, γ 0.01 — and a flat curve says the dial does not matter.",
    "**The fold spread is the reliability of the estimate** (±0.129 at 100 rows, ±0.057 at 791): tune on wide spreads and you tune on noise.",
    "**Extrapolate only to the nearest known floor**, and re-fit the curve as rows arrive."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "How do you tell high bias from high variance on a learning curve, and what does each call for?",
        options: [
          "Bias shows as a rising validation line; variance as a falling one",
          "Variance is the gap: training far above validation (tree: 1.000 vs 0.735). Bias is the level: both lines converged low (linear model on an interaction truth: 0.669 vs 0.659). Variance calls for data, regularisation or averaging; bias calls for capacity or features, and data will not fix it (100× rows: +0.03)",
          "Both look the same; only the validation curve distinguishes them",
          "Bias is when the training score is low; variance is when it is high"
        ],
        answer: 1,
        why: "Gap, level, slope — three readings, three decisions: regularise or get data, add capacity, or stop."
      },
      {
        stem: "The validation line is still rising at the largest training size. What do you do first?",
        options: [
          "Add regularisation",
          "Get more data — the curve says this model has not finished learning (boosting: 0.775 → 0.917 and still climbing; the spend forest: 7.37 with a floor of 6.38). Changing the model before the curve flattens confounds two effects; extrapolate the curve to the nearest known floor to estimate the gain and its limit",
          "Switch to a simpler model",
          "Increase capacity"
        ],
        answer: 1,
        why: "Rising slope is the one shape where 'more data' is the right first answer."
      },
      {
        stem: "Logistic regression's validation curve over C is flat from 0.001 to 100 (CV 0.736–0.743). What does that mean?",
        options: [
          "C was set wrong",
          "The model is not variance-limited: a regulariser spanning five decades changes nothing because the twelve columns and 791 rows already give precise coefficients. The dial does not matter, the search budget should go elsewhere, and the model's limit is its features — which its learning curve confirmed (gain 0.02 from doubling rows)",
          "The model is overfitting at every C",
          "Cross-validation failed"
        ],
        answer: 1,
        why: "A flat validation curve is a result: it closes a line of enquiry."
      },
      {
        stem: "Why does the training line keep rising past the point where the validation line turns down?",
        options: [
          "Because the training score is computed on more rows",
          "Because added capacity can always fit more of the training folds, including their noise — a tree at depth 12 scores 0.994 in training and 0.542 in validation. The training line is a capacity meter, not a quality meter; the turn in the validation line is where capacity stops fitting signal and starts fitting noise",
          "Because of a leak between folds",
          "It does not; both lines turn together"
        ],
        answer: 1,
        why: "The vertical distance between the lines is the variance the extra capacity bought."
      },
      {
        stem: "Why report the standard deviation across folds alongside a learning curve?",
        options: [
          "It measures the model's variance",
          "It measures the reliability of the estimate itself: ±0.129 on 100 rows means the fold scores range over a quarter of the scale, and any decision made on differences smaller than that is made on noise. At 791 rows it was ±0.057. Tuning, comparing and extrapolating are only meaningful when the spread is small relative to the differences being read",
          "It is required by scikit-learn",
          "It measures label noise"
        ],
        answer: 1,
        why: "A learning curve without error bars invites reading the noise as a trend."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain learning curves and how you use them to decide what to do next.",
        strong: "A learning curve plots the training and cross-validated score against the number of training rows, computed by fitting on growing subsamples of each training fold and scoring on the held-out fold. I read three things. The gap between the lines at the largest size is variance — an unpruned tree at 1.000 training and 0.735 validation has a 0.27 gap, a logistic model 0.01. The level of the validation line is bias plus noise — a linear model on an interaction truth converges with its training line at 0.66, which is bias, since gradient boosting on the same data reaches 1.00. And the slope of the validation line at the right edge is what more data would buy — still rising for the boosted model, flat for the linear ones. The decisions follow: a wide gap means regularise, average, or get data; low and converged means capacity or features, and data will not help — one hundred times the rows moved the linear model by 0.03; a rising validation line means get data before changing anything else; flat and together at a good level means the remaining work is features or the problem is at its noise floor. I always plot the fold spread as well, because a ±0.13 spread on 100 rows means the curve itself cannot be trusted, and I extrapolate a rising curve only to the nearest known floor.",
        answer: [
          { t: "p", text: "Construction, the three readings with numbers, the four decisions, and the two cautions." }
        ]
      },
      {
        level: "core",
        q: "What is a validation curve and how is it different from a learning curve?",
        strong: "Same two lines — training and cross-validated score — but the x-axis is a hyperparameter rather than the number of rows: depth, C, γ, learning rate, leaf size. Where the training line rises and the validation line falls, the added capacity is being spent on noise, and the validation peak is the setting to keep: on the churn data the tree's depth peaked at 3 while its training score climbed to 0.994 at depth 12, the forest's leaf size peaked at 50 with the gap closing from 0.30 to 0.06, and the SVM's γ peaked at 0.01 before the RBF memorised the training folds. A flat validation curve is also a finding — logistic regression's C changed the score by 0.007 across five decades, which says the model is not variance-limited and the dial should not be searched. The learning curve asks whether data would help; the validation curve asks whether capacity would; and a search in 8.1 is a validation curve in several dimensions at once, which is why looking at one-dimensional slices first tells you which dimensions are worth the budget.",
        answer: [
          { t: "p", text: "Definition, the reading rule with three executed turns, the flat-curve finding, and the relation to search." }
        ]
      },
      {
        level: "advanced",
        q: "A stakeholder proposes buying 50,000 labelled rows to improve a model at AUC 0.74. How do you evaluate the proposal?",
        strong: "With two learning curves and an extrapolation. First the current model's: if its validation line is flat at the right edge and close to its training line, more rows will not move it — the churn logistic model gained 0.02 from doubling its rows and is limited by its features, not its data; on an interaction truth a linear model gained 0.03 from a hundredfold increase. Then the curve of the best higher-capacity model I can fit — gradient boosting with early stopping, say — because if its validation line is still rising the ceiling is the data's, not the model's, and the purchase pays; the spend forest was still descending at 791 rows against a floor of 6.38 and would repay a few thousand more. I fit a simple form such as a + b/√n to the validation line, extrapolate it to the proposed size, and bound the result by the nearest known floor — the noise level or the best any model has reached — because the form is optimistic near a floor; I report the expected gain as a range with the fold spread as its error bar. And I put the alternative on the same page: if the diagnosis is bias, the money buys more as features, cleaner labels or a different model than as rows. The proposal is not 'more data, yes or no'; it is 'what is the binding constraint', and the curves answer that before any money moves.",
        answer: [
          { t: "p", text: "Two curves, the extrapolation with its floor and error bar, and the reframing to the binding constraint." }
        ]
      }
    ]
  }
});

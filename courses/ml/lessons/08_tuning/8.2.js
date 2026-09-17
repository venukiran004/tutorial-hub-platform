/* ============================================================================
   LESSON 8.2 — Imbalanced Data
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "**When 2.5 % of rows are positive, a model that predicts 'no' for everyone is 97.5 % accurate, and a logistic regression trained without care is 97.5 % accurate too — with a recall of 6 %.** Imbalance is not a modelling problem so much as a *measurement* problem, and this lesson separates the two. It runs every standard treatment — class weights, random and synthetic oversampling (SMOTE worked by hand, ADASYN's allocation worked by hand), undersampling, Tomek and ENN cleaning, balanced ensembles — on identical folds, and finds what the treatments actually change: the ranking (ROC-AUC 0.834–0.843, PR-AUC 0.21–0.27) barely moves, the default threshold moves a lot (recall 0.06 → 0.75), and calibration is destroyed (mean predicted probability 0.325 against a base rate of 0.025). Then the leak — SMOTE before the split reports PR-AUC 0.987 for a model whose honest score is 0.484 — and the case where nothing helps because the classes overlap (PR-AUC 0.090 under every treatment). The conclusion is a procedure, not a technique: choose the metric, tune the threshold from costs, weight if the model needs it, resample only inside the fold, and calibrate if probabilities are shown.",

  objectives: [
    "Show why accuracy fails under imbalance and which metrics replace it",
    "Explain and hand-compute SMOTE's interpolation and ADASYN's allocation, and place the cleaning and combined methods",
    "Measure what class weights, resampling and threshold moving each change — ranking, threshold, calibration — on identical folds",
    "Resample only inside the cross-validation fold, set the threshold from costs, and recognise when imbalance is not the problem"
  ],

  prerequisites: ["2.3", "2.5", "4.5", "5.3"],

  blocks: [

    { t: "h2", n: "01", text: "The measurement problem", id: "measurement" },

    { t: "code", lang: "python", title: "A 2.5 % problem: 20,000 rows, 508 positives, logistic regression, 5-fold (executed)",
      hl: [2, 3],
      code: `#                                              accuracy   recall   precision   F1      ROC-AUC   PR-AUC   log-loss
#   predict everyone negative                    0.9746    0.000     0.000     0.000    0.500     0.025    0.118      <- 97.5 % accurate, worthless
#   logistic, no treatment, threshold 0.5        0.9748    0.061     0.525     0.109    0.834     0.269    0.091      <- 97.5 % accurate, ranks well, predicts almost nobody
#   the same model at its best-F1 threshold 0.155:   recall 0.374   precision 0.330   F1 0.351`,
      caption: "Two facts, in order. Accuracy cannot see the minority class at all: the trivial model and the real one differ by 0.0002. And the real model is not bad — its ranking is decent (AUC 0.83, PR-AUC ten times the base rate) — it is simply being read at a threshold that makes sense for a 50 % problem. Moving the threshold from 0.5 to 0.155 triples the F1 with no change to the model. Most of what follows is variations on that observation."
    },

    { t: "dl", items: [
      ["Base rate", "The positive share; 0.025 here. Accuracy's floor is 1 − base rate, and PR-AUC's floor *is* the base rate."],
      ["PR-AUC (average precision)", "Area under precision–recall; unaffected by the mass of true negatives that inflates ROC-AUC. The ranking metric for rare positives (2.3)."],
      ["Balanced accuracy / MCC", "Mean of recall per class; the Matthews correlation. Threshold-dependent summaries that do not reward the majority guess."],
      ["Class weights", "Multiply each row's loss by a class weight; 'balanced' uses n / (K·nₖ): 0.51 for negatives and 19.7 for positives here. Changes the fit's intercept and, for a hinge loss, whether the minority is fitted at all (5.3)."],
      ["Random oversampling", "Duplicate minority rows until balanced. Cheap; a tree model will memorise the duplicates."],
      ["SMOTE", "Synthetic minority oversampling: new rows on the segments between a minority row and one of its k minority neighbours, x_new = xᵢ + u(x_nn − xᵢ), u ~ U(0, 1)."],
      ["ADASYN", "SMOTE with the synthetic budget allocated in proportion to each minority row's share of majority neighbours: more synthesis where the minority is outnumbered."],
      ["Tomek links / ENN", "Cleaning: remove majority rows that form nearest-neighbour pairs with minority rows (Tomek) or that disagree with their k neighbours (ENN). Combined with SMOTE as SMOTETomek, SMOTEENN."],
      ["Threshold moving", "Choose the cut-off on the score from the cost matrix or the target recall. Free, and usually the largest single improvement."]
    ]},

    { t: "h2", n: "02", text: "The treatments, on identical folds", id: "treatments" },

    { t: "code", lang: "python", title: "Nine treatments of the same logistic regression, 5-fold, resampling inside the training folds (executed)",
      hl: [2, 3, 5, 12, 13, 14, 15],
      code: `#   treatment                    acc     recall@0.5  precision@0.5   F1@0.5   ROC-AUC   PR-AUC   log-loss   |  best-F1 threshold   best F1   recall   precision
#   none                        0.975     0.061       0.525          0.109    0.834     0.269     0.091   |      0.155             0.351     0.374     0.330
#   class_weight=balanced       0.811     0.752       0.095          0.168    0.841     0.214     0.464   |      0.832             0.327     0.411     0.272
#   random oversampling         0.813     0.750       0.095          0.169    0.841     0.213     0.462   |      0.827             0.326     0.421     0.266
#   SMOTE                       0.819     0.744       0.098          0.173    0.840     0.220     0.447   |      0.853             0.334     0.404     0.285
#   Borderline-SMOTE            0.886     0.663       0.138          0.229    0.843     0.208     0.312   |      0.905             0.327     0.425     0.265
#   ADASYN                      0.800     0.764       0.091          0.162    0.841     0.221     0.479   |      0.842             0.331     0.409     0.278
#   random undersampling        0.810     0.774       0.096          0.171    0.842     0.216     0.469   |      0.817             0.326     0.449     0.256
#   SMOTE + Tomek               0.820     0.746       0.098          0.173    0.840     0.220     0.447   |      0.853             0.334     0.404     0.285
#   SMOTE + ENN                 0.792     0.785       0.090          0.161    0.840     0.208     0.505   |      0.874             0.319     0.449     0.248
# read down the ROC-AUC column: 0.834 to 0.843. Read down the best-F1 column: 0.319 to 0.351, and the untreated model is the best of them.
# what every treatment did was move the point where 0.5 falls: recall at 0.5 went from 0.06 to 0.66-0.79 -- the same thing a threshold of 0.155 did for free.`,
      caption: "For a linear model, re-weighting and resampling are almost the same operation: both shift the intercept (and, a little, the slopes) so that the decision boundary sits where a balanced problem would put it. The ranking is essentially unchanged — every treatment's ROC-AUC is within 0.01 of the untreated model's — so any threshold chosen afterwards finds the same trade-offs. That is why the best-F1 row is flat. The treatments are not useless; they are a way of getting a threshold, and there are cheaper ways."
    },

    { t: "code", lang: "python", title: "What resampling does to the probabilities (executed)",
      hl: [3, 4, 5],
      code: `#   treatment                  mean p̂     base rate    top decile: predicted vs actual rate    Brier
#   none                        0.025       0.025            0.148  vs  0.157                  0.0211      <- calibrated
#   class_weight=balanced       0.325       0.025            0.805  vs  0.159                  0.1465      <- the model now believes a third of customers are positive
#   SMOTE                       0.309       0.025            0.815  vs  0.160                  0.1401
#   random undersampling        0.328       0.025            0.809  vs  0.159                  0.1487`,
      caption: "A model trained on balanced data has learned a balanced world; its probabilities are the probabilities of that world. The top decile it flags is genuinely the riskiest (actual rate 0.16, same as the untreated model's top decile) but it labels them 0.81. If a probability will be shown, thresholded in probability units, or used in an expected-value calculation, either do not resample or re-calibrate afterwards (2.5) — or correct analytically: for logistic regression, subtract ln(w₊/w₋) from the intercept."
    },

    { t: "h2", n: "03", text: "How the synthesis works, by hand", id: "synthesis" },

    { t: "code", lang: "text", title: "SMOTE interpolation and ADASYN allocation (executed)",
      code: `SMOTE   minority rows (1, 2), (1.5, 2.5), (3, 2), (1.2, 1)         k = 2 nearest minority neighbours of (1, 2): (1.5, 2.5) and (1.2, 1)
        choose (1.5, 2.5), draw u = 0.4:   x_new = (1, 2) + 0.4 × ((1.5, 2.5) - (1, 2)) = (1, 2) + 0.4 × (0.5, 0.5) = (1.2, 2.2)
        imblearn SMOTE(k_neighbors=2) on these four rows plus 20 majority rows: 16 synthetic minority rows, e.g. (1.555, 2.482), (1.315, 1.575), (1.417, 2.0) -- each on a segment between two minority rows
        the synthetic cloud fills the convex hull of minority neighbourhoods; it never leaves it. A minority row with no close minority neighbour gets synthetic points on long segments through majority territory.

ADASYN  three minority rows with majority shares among their k neighbours   r = 0.8, 0.2, 0.0         (0.8: four of five neighbours are majority -- a boundary point)
        budget G = 10 synthetic rows;   normalise  r̂ = 0.8, 0.2, 0.0;   allocate  g = r̂ × G = 8, 2, 0
        the interior point (r = 0) gets nothing; the boundary point gets 80 % of the synthesis. Then interpolate as SMOTE does.

CLEANING  Tomek links on 3,000 rows (10 % minority): removed 69 majority rows, 0 minority        -- pairs that are each other's nearest neighbour across classes
          Edited nearest neighbours: removed 342 majority rows, 0 minority                        -- majority rows whose 3 neighbours mostly disagree with them
          both remove majority rows near the boundary, so the boundary moves toward the majority; SMOTETomek and SMOTEENN synthesise first, then clean`,
      caption: "SMOTE's synthetic rows are convex combinations of real minority rows, so they add no new information about *where* the minority lives — they add weight to it, smoothly, which for a linear model is nearly the same as duplicating (random oversampling: 0.841 vs SMOTE 0.840) and for a tree model avoids exact duplicates being memorised. ADASYN and Borderline-SMOTE concentrate the synthesis at the boundary, which is where a classifier's decision is made and also where labels are least reliable. Cleaning removes majority rows the boundary would otherwise have to accommodate."
    },

    { t: "callout", kind: "trap", title: "Resample inside the fold, never before the split (executed)", body: [
      { t: "p", text: "SMOTE applied to all 20,000 rows and *then* 5-fold cross-validated: **ROC-AUC 0.988, PR-AUC 0.987, F1 0.948**. The same SMOTE applied inside each training fold: **0.862, 0.484, 0.380**. No resampling at all: 0.867, 0.493, 0.401. The first line is the most seductive number in applied machine learning: every synthetic row is an interpolation of real minority rows, and when the split comes afterwards the training folds contain near-copies of the test folds' positives. Use `imblearn.pipeline.Pipeline`, which resamples only in `fit`, so cross-validation and the search in 8.1 stay honest — and notice that on this problem the honest SMOTE was slightly *worse* than nothing." }
    ]},

    { t: "h2", n: "04", text: "Weights for boosting, ensembles for imbalance, thresholds from costs", id: "weights" },

    { t: "code", lang: "python", title: "Gradient boosting with class weights, and ensembles built for imbalance (executed, 5-fold)",
      hl: [2, 3, 5, 6, 7],
      code: `#   model                                   recall@0.5   precision@0.5   F1@0.5    ROC-AUC   PR-AUC   log-loss
#   HistGB, no treatment                       --            --           0.401     0.867     0.493    --        best-F1 0.506
#   HistGB, class_weight="balanced"           0.693         0.238         0.354     0.865     0.434    0.225     <- ranking slightly worse, threshold moved, calibration lost
#   HistGB + SMOTE inside the fold             --            --           0.380     0.862     0.484    --
#   BalancedRandomForest(200)                 0.732         0.183         0.293     0.857     0.333    0.316     <- each tree on a balanced bootstrap
#   EasyEnsemble(10)                          0.770         0.097         0.172     0.845     0.269    0.603     <- AdaBoost on ten balanced subsamples
#   n_neg / n_pos = 38.4 -> scale_pos_weight for XGBoost/LightGBM; class_weight for HistGB`,
      caption: "For boosting the picture is the same as for logistic regression, with one difference: the untreated model is *best* on every ranking metric (PR-AUC 0.493, best-F1 0.506), because a log-loss objective already fits the minority class — it never had the hinge loss's incentive to abandon it (5.3). Weighting and balanced ensembles buy recall at the default threshold, which a threshold buys for free, and they cost ranking quality and calibration. The balanced ensembles were the weakest models in the table."
    },

    { t: "code", lang: "python", title: "The threshold from the cost matrix (executed; a missed positive costs 20× a false alarm)",
      code: `# HistGB probabilities, no treatment.  cost = 1 × false positives + 20 × false negatives
#   threshold 0.50:  cost 7,362
#   threshold 0.04:  cost 4,037       <- the minimum over a sweep
#   theory for a calibrated model:  t* = c_FP / (c_FP + c_FN) = 1 / 21 = 0.048`,
      caption: "With costs known, the threshold is a formula, and it only works because the untreated model's probabilities are calibrated (top decile 0.148 predicted vs 0.157 actual). The re-weighted model's 0.8 would put the same customers on the wrong side of any cost-derived threshold. This is the cleanest argument for the order of operations: model on the real distribution, calibrate, then threshold from costs."
    },

    { t: "code", lang: "python", title: "When imbalance is not the problem (executed; 5 % minority, logistic regression, 5-fold)",
      hl: [2, 3, 4, 6, 7, 8],
      code: `#   data                        treatment              PR-AUC    best F1    F1@0.5
#   well-separated minority     none                    0.941     0.906      0.894      <- imbalance did not hurt at all
#                               SMOTE                   0.940     0.908      0.858
#                               class_weight balanced   0.939     0.905      0.844
#   overlapping minority        none                    0.090     0.164      0.000      <- the classes overlap: no treatment can separate what is not separable
#                               SMOTE                   0.090     0.172      0.172
#                               class_weight balanced   0.089     0.170      0.167`,
      caption: "Imbalance is a problem only when it makes a learnable boundary hard to learn or a default threshold wrong. A well-separated minority needs neither treatment; an inseparable one is not helped by any — the PR-AUC is 0.09 whatever you synthesise, because the missing ingredient is a feature, not a row. Before treating imbalance, look at the PR curve of the untreated model: if the ranking is good, the problem is the threshold; if it is at the base rate, the problem is the features."
    },

    { t: "table",
      head: ["Level", "Action", "Changes", "Cost", "When"],
      rows: [
        ["Metric", "PR-AUC, recall at fixed precision, cost; never accuracy", "How you see the problem", "None", "Always"],
        ["Threshold", "From the cost matrix or a target recall, on calibrated probabilities", "The decision, not the model", "None", "Always; usually the largest gain (F1 0.109 → 0.351)"],
        ["Algorithm", "class_weight, scale_pos_weight, cost-sensitive loss", "Intercept/boundary, sometimes the fit (SVM)", "Calibration", "Hinge-loss models; when the fit itself ignores the minority"],
        ["Data", "Oversample (random, SMOTE, ADASYN), undersample, clean, combine", "Training distribution; boundary position", "Calibration; leakage risk; synthetic artefacts", "Tree models that memorise duplicates; extreme ratios; inside the fold only"],
        ["Ensemble", "BalancedRandomForest, EasyEnsemble, cascades", "Many balanced views", "Ranking quality here (0.857, 0.845)", "Very large majority classes where undersampling is affordable"],
        ["Reframe", "Anomaly detection (9.4–9.5), one-class methods", "The question", "A different evaluation", "Below ~0.1 % positives, or no reliable positive labels"]
      ]
    },

    { t: "ladder",
      title: "A fraud model at 0.3 % positives, feeding a review queue with fixed capacity",
      rungs: [
        { level: "bad", label: "SMOTE the dataset, train, report accuracy and F1 at 0.5", code: `X_res, y_res = SMOTE().fit_resample(X, y); cross_val_score(model, X_res, y_res)      # leak; accuracy; 0.5`,
          note: "**A leaked score (PR-AUC 0.987-style), a metric that cannot see fraud, and a threshold with no relation to the queue.**" },
        { level: "ok", label: "imblearn pipeline, PR-AUC, threshold at best F1", code: `ImbPipeline([("sc", StandardScaler()), ("smote", SMOTE()), ("clf", HistGB())]); cross_val_score(pipe, X, y, scoring="average_precision")`,
          note: "**Honest and sensibly measured** — but resampling cost calibration, and 'best F1' is not the queue's constraint." },
        { level: "best", label: "No resampling; calibrated probabilities; threshold at the queue's capacity; recall at that capacity reported", code: `p = cross_val_predict(HistGB(), X, y, cv=cv, method="predict_proba")[:, 1]        # ranking: PR-AUC; calibration: reliability curve
threshold = np.quantile(p, 1 - capacity_share)                                          # the queue reviews the top k % every day
# report recall and precision AT that threshold, by week; monitor the base rate and the score distribution (11.1); revisit resampling only if the ranking is poor`,
          note: "**The model ranks, calibration makes the scores comparable over time, and the business constraint sets the cut** — imbalance handled where it lives, in the decision." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Weights, a synthetic row, a threshold, and a leak you must build",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For 20,000 rows with 508 positives, compute the 'balanced' class weights n/(K·nₖ) for both classes, the intercept shift ln(w₊/w₋) they induce in a logistic model, and the probability the re-weighted model assigns to a row the original model scored at 0.10. **(b)** Minority rows (2, 4), (3, 6), (5, 5), (2, 7): with k = 2, list the neighbours of (2, 4) and compute the SMOTE row for neighbour (3, 6) at u = 0.25; then explain what ADASYN would do if (2, 4) had four majority neighbours out of five and (5, 5) had none. **(c)** Reproduce the leak: SMOTE a 5 %-positive dataset before splitting and cross-validate a random forest; then use `imblearn.pipeline` and cross-validate again; report PR-AUC for both and for no resampling." }
      ],
      requirements: [
        "(a) two weights, the shift, and the re-weighted probability.",
        "(b) the neighbours, the synthetic row, and the ADASYN allocation argument.",
        "(c) three PR-AUCs."
      ],
      hint: "(a) Re-weighting by w₊/w₋ adds ln(w₊/w₋) to the log-odds. (b) Nearest by Euclidean distance. (c) `Pipeline([('s', SMOTE()), ('c', RandomForestClassifier())])` from imblearn.",
      solution: {
        lang: "python",
        title: "imbalance_practice.py",
        code: `# (a) n = 20,000, n₋ = 19,492, n₊ = 508, K = 2
#   w₋ = 20000 / (2 × 19492) = 0.513;   w₊ = 20000 / (2 × 508) = 19.69;   w₊/w₋ = 38.4 = n₋/n₊
#   the re-weighted logistic fit raises every log-odds by ≈ ln(38.4) = 3.65 (exactly, if the slopes were unchanged)
#   a row at p = 0.10 has log-odds ln(0.1/0.9) = -2.197; re-weighted: -2.197 + 3.65 = 1.45  ->  p = σ(1.45) = 0.81
#   (the lesson's top decile: 0.148 -> 0.805 -- the same arithmetic)
#   so the 0.5 threshold on the re-weighted model ≈ the 0.025 threshold on the original: re-weighting IS threshold moving, with the probabilities broken

# (b) distances from (2, 4):  (3, 6) -> √5 = 2.24;  (5, 5) -> √10 = 3.16;  (2, 7) -> 3.  k = 2 neighbours: (3, 6) and (2, 7)
#   SMOTE with neighbour (3, 6), u = 0.25:  (2, 4) + 0.25 × (1, 2) = (2.25, 4.5)
#   ADASYN: r(2,4) = 4/5 = 0.8 (a boundary point), r(5,5) = 0 (interior); with r̂ normalised over all minority rows, (5, 5) receives no synthetic rows
#   and (2, 4) receives the largest share of the budget -- synthesis concentrated where the minority is outnumbered, i.e. at the boundary.

# (c) executed: 4,000 rows, 5 % positive, random forest (200 trees), 5-fold PR-AUC
Xr, yr = SMOTE(random_state=0).fit_resample(X, y); cross_val_score(RandomForestClassifier(200), Xr, yr, cv=5, scoring="average_precision")   # 0.998   <- the leak
cross_val_score(ImbPipeline([("s", SMOTE(random_state=0)), ("c", RandomForestClassifier(200))]), X, y, cv=5, scoring="average_precision")     # 0.622   <- honest
cross_val_score(RandomForestClassifier(200), X, y, cv=5, scoring="average_precision")                                                         # 0.651   <- no resampling: best
# a forest memorises SMOTE's interpolated near-copies of the test positives; inside the pipeline SMOTE is merely slightly harmful`,
        notes: [
          { t: "p", text: "**(a)** is the identity that makes most of this lesson unnecessary: for a logistic model, balanced weights ≈ a threshold at the base rate, with calibration as the casualty." },
          { t: "p", text: "**(b)** makes the geometry concrete: SMOTE rows live on segments between minority rows; ADASYN puts the segments where the majority is." },
          { t: "p", text: "**(c)** is the leak everyone builds once. Build it deliberately, and never again by accident." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Every treatment moved recall at 0.5 from 0.06 to about 0.75, and none improved the best achievable F1 over the untreated model (0.351). What does that tell you?",
          options: [
            "The treatments failed to run",
            "For this model the treatments changed where the decision boundary sits, not the ranking of rows (ROC-AUC 0.834–0.843 throughout): a threshold of 0.155 on the untreated model achieves the same recall with calibrated probabilities intact. Re-weighting and resampling are ways of choosing a threshold, and threshold moving is the cheaper, cleaner one",
            "SMOTE needs a higher k",
            "F1 is the wrong metric"
          ],
          answer: 1,
          why: "The boosted model made the same point more sharply: untreated, it had the best PR-AUC and best-F1 of all its variants."
        }
      ]
    }
  ],

  takeaways: [
    "**Accuracy cannot see a 2.5 % class**: 0.9746 for 'always no', 0.9748 for a model with recall 0.06. Use PR-AUC, recall at a precision or capacity, and cost.",
    "**The untreated model usually ranks fine** (AUC 0.834, PR-AUC 0.269 = 10× the base rate) and is read at the wrong threshold: 0.155 instead of 0.5 tripled F1 for free.",
    "**Weights and resampling move the boundary, not the ranking**: ROC-AUC 0.834–0.843 across nine treatments; best-F1 0.32–0.35 with the untreated model on top.",
    "**They destroy calibration**: mean p̂ 0.325 for a 0.025 base rate; top decile predicted 0.81 vs actual 0.16. Calibrate afterwards or subtract ln(w₊/w₋) from the intercept.",
    "**SMOTE by hand**: (1, 2) + 0.4 × ((1.5, 2.5) − (1, 2)) = (1.2, 2.2); rows live on segments between minority neighbours. **ADASYN** allocates by majority-neighbour share (8, 2, 0 of 10).",
    "**Resample inside the fold**: SMOTE before the split gave PR-AUC 0.987 for a model whose honest score is 0.484 (and no resampling: 0.493).",
    "**Boosting with log-loss does not need rebalancing to rank**: untreated HistGB had the best PR-AUC (0.493) and best-F1 (0.506); balanced ensembles were the weakest.",
    "**Threshold from costs**: t* = c_FP/(c_FP + c_FN) = 0.048 for a calibrated model; the sweep found 0.04 and cut cost from 7,362 to 4,037.",
    "**Imbalance is not always the problem**: a separable minority needs nothing (PR-AUC 0.94 regardless); an overlapping one is helped by nothing (0.09 regardless) — look at the untreated PR curve first.",
    "**Order of operations**: metric → calibrated model on the real distribution → threshold from costs or capacity → weights only for models that abandon the minority (hinge loss) → resampling only inside the fold, only if the ranking is poor."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is accuracy misleading on imbalanced data, and what replaces it?",
        options: [
          "Accuracy is fine if the classes are stratified",
          "With 2.5 % positives, predicting 'no' for everyone scores 97.5 %, and a real model with recall 0.06 scores 97.5 % too — the metric is dominated by the majority class it is trivial to get right. Replace it with metrics that look at the minority: PR-AUC (floor = base rate, 0.025), recall at a fixed precision or review capacity, MCC or balanced accuracy for a thresholded summary, and above all the cost of each error type",
          "Use ROC-AUC, which is unaffected by imbalance",
          "Use log-loss only"
        ],
        answer: 1,
        why: "ROC-AUC is a fine ranking metric but is flattered by the mass of easy negatives; PR-AUC is not."
      },
      {
        stem: "What does class_weight='balanced' actually do to a logistic regression, and what does it cost?",
        options: [
          "It resamples the data internally",
          "It multiplies each row's loss by n/(K·nₖ) — 0.51 for negatives, 19.7 for positives here — which raises every log-odds by about ln(38.4) = 3.65: the decision boundary at 0.5 moves to where the untreated model's 0.025 was. The ranking is essentially unchanged (AUC 0.834 → 0.841), recall at 0.5 jumps from 0.06 to 0.75, and calibration is destroyed (mean p̂ 0.325 for a base rate of 0.025) — a threshold change with the probabilities broken",
          "It removes majority rows",
          "It changes the loss to hinge"
        ],
        answer: 1,
        why: "For hinge-loss models the weight matters more: an unweighted SVM abandoned the minority entirely (5.3)."
      },
      {
        stem: "Explain SMOTE's mechanism and one way it can go wrong.",
        options: [
          "It copies minority rows; it can only fail if k is too large",
          "For a minority row it picks one of its k minority nearest neighbours and creates a new row on the segment between them, x + u(x_nn − x) with u uniform — (1, 2) + 0.4·(0.5, 0.5) = (1.2, 2.2) — until the classes balance. It goes wrong when a minority row has no close minority neighbour (segments cross majority territory), when applied before the train–test split (interpolated near-copies of test positives leak into training: PR-AUC 0.987 vs an honest 0.484), and when its calibration cost is ignored",
          "It fits a Gaussian to the minority class and samples from it",
          "It removes majority rows near the boundary"
        ],
        answer: 1,
        why: "Synthetic rows are convex combinations of real ones: they add weight to the minority, not information about it."
      },
      {
        stem: "A stakeholder's review team can check 3 % of transactions a day. How do you set the threshold?",
        options: [
          "Use 0.5 after SMOTE",
          "Train on the real distribution, check the probabilities are calibrated, and set the threshold at the 97th percentile of the score so that exactly the queue's capacity is flagged; report recall and precision at that threshold and monitor them. If costs are known instead of capacity, t* = c_FP/(c_FP + c_FN) on calibrated probabilities (0.048 here, sweep 0.04, cost 7,362 → 4,037). Resampled models' probabilities are not usable for either rule",
          "Use the best-F1 threshold",
          "Set the threshold to the base rate"
        ],
        answer: 1,
        why: "Imbalance is handled in the decision, where the business constraint lives, not in the training set."
      },
      {
        stem: "When does treating imbalance not help, and how do you tell in advance?",
        options: [
          "It always helps at least a little",
          "When the untreated model already ranks well (a well-separated minority: PR-AUC 0.94 with or without SMOTE) — the only problem was the threshold — and when the classes overlap so that no boundary exists (PR-AUC 0.09 under every treatment) — the problem is missing features. Look at the untreated model's PR curve first: good ranking means fix the threshold; ranking at the base rate means find features or reframe as anomaly detection",
          "Only when the ratio is below 1 %",
          "When SMOTE's k is wrong"
        ],
        answer: 1,
        why: "Resampling adds weight, not information; it cannot manufacture separability."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you handle a highly imbalanced classification problem?",
        strong: "In a fixed order, because most of the standard treatments change the same thing. First the metric: accuracy is 97.5 % for the trivial model on a 2.5 % problem, so I use PR-AUC and recall at a fixed precision or capacity, plus the cost of each error type. Second, I look at the untreated model's ranking — on my 2.5 % problem a plain logistic regression had ROC-AUC 0.83 and PR-AUC ten times the base rate, and its only fault was being read at 0.5, where recall was 0.06; moving the threshold to 0.155 tripled the F1 with the probabilities intact. Third, if a threshold must come from costs or a review capacity, I keep the probabilities calibrated: class weights and resampling shifted the mean predicted probability from 0.025 to 0.32 while leaving the ranking within 0.01 of AUC, so they are threshold moves with calibration as the casualty. I use weights only where the model would otherwise abandon the minority — a hinge-loss SVM — and resampling only inside the cross-validation fold, through an imblearn pipeline, because SMOTE before the split leaked a PR-AUC of 0.987 for a model whose honest score was 0.48. And before any of it I check whether imbalance is the problem: a separable minority needs nothing, and an overlapping one is helped by nothing — there the fix is features, or reframing as anomaly detection.",
        answer: [
          { t: "p", text: "Metric, ranking check, threshold with calibration, weights and resampling in their places with the leak, and the diagnosis of whether imbalance is the issue at all." }
        ]
      },
      {
        level: "core",
        q: "Explain SMOTE and ADASYN, and compare them with class weights.",
        strong: "SMOTE creates synthetic minority rows on the line segments between a minority row and one of its k nearest minority neighbours, x plus u times the difference with u uniform in zero to one — from (1, 2) toward (1.5, 2.5) at u = 0.4 the new row is (1.2, 2.2) — until the classes are balanced. ADASYN does the same interpolation but allocates the synthetic budget in proportion to each minority row's share of majority neighbours, so a boundary row with four majority neighbours out of five gets most of the synthesis and an interior row gets none. Both add weight to the minority region rather than information about it: for a linear model the result is almost identical to duplicating rows or to class weights, which multiply the minority's loss by n over K·n₊ — on my problem random oversampling, SMOTE, ADASYN and balanced weights all landed within 0.01 of AUC and all moved recall at 0.5 from 0.06 to about 0.75. The differences are practical: weights are free and leave the data alone; SMOTE avoids the exact duplicates a tree memorises and needs an imblearn pipeline so it happens inside the fold; ADASYN and Borderline-SMOTE concentrate on the boundary where labels are noisiest. All of them destroy calibration, and none improves a ranking that was already good.",
        answer: [
          { t: "p", text: "Both mechanisms with the hand numbers, their equivalence to weighting for linear models, the practical differences, and the shared calibration cost." }
        ]
      },
      {
        level: "advanced",
        q: "A team reports F1 = 0.95 on a fraud model after applying SMOTE. What questions do you ask?",
        strong: "First, where SMOTE was applied relative to the split. If it was applied to the full dataset before cross-validation, the training folds contain interpolated near-copies of the test folds' fraud cases, and the score is a leak: I measured PR-AUC 0.987 that way against 0.484 for the same model with SMOTE inside the fold, and F1 0.948 against 0.380. Second, what F1 is being reported on — the resampled, balanced test folds, where F1 is a different quantity from F1 at 0.3 % positives — and at what threshold. Third, whether the probabilities are being used for anything, because a model trained on balanced data believes a third of transactions are fraud and any cost- or capacity-based threshold on it is wrong. Then I would ask for the honest numbers: PR-AUC and recall at the review queue's capacity, from an imblearn pipeline cross-validated on the real distribution, alongside the same model with no resampling at all — which on my problem was slightly better. And I would ask whether the ranking without treatment was already adequate, because if it was, the whole SMOTE step bought nothing but a broken calibration and a risk of exactly this leak.",
        answer: [
          { t: "p", text: "The leak with numbers, the metric and threshold questions, the calibration consequence, and the honest comparison to demand." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 8.4 — Choosing a Model, and AutoML
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "**Every model in modules 4–6 has now been run on the same two targets, and this lesson does what a working data scientist does at that point: puts them in one table, asks which differences are real, and decides.** The harness is five folds repeated three times, the same folds for every model, with AUC, log-loss and fit time. On the churn target the plain logistic regression wins (0.752) and beats the forest on 15 folds out of 15; the SVM is statistically indistinguishable from it (p = 0.19); the untuned LightGBM is the second-worst model in the room. On the spend target every non-linear model lands within 0.1 of each other (7.24–7.31) and the one-column ridge beats them all (6.31). The decision framework that follows is not a flow chart of algorithms but a list of the questions that decide — data size and shape, the metric, interpretability, latency, categoricals, missing values — and a statistical habit: compare on identical folds and count wins. AutoML closes it: a 60-second FLAML run found the right family (linear) and lost 0.012 to the hand-built pipeline, which is the honest summary of what AutoML is for.",

  objectives: [
    "Build a comparison harness that scores every candidate on identical repeated folds with the metrics and the cost",
    "Decide whether a difference between two models is real, with a paired comparison and its caveats",
    "Use the decision questions — size, shape, metric, interpretability, latency, categoricals, missingness — as a framework rather than a flow chart",
    "Know what AutoML does, what it found here, and when to reach for it"
  ],

  prerequisites: ["2.7", "6.5", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "The harness", id: "harness" },

    { t: "code", lang: "python", title: "Ten models on the churn target: 5 folds × 3 repeats, identical splits, AUC / log-loss / fit time (executed, 989 rows)",
      hl: [3, 4, 7, 9, 10, 11, 12],
      code: `cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=0)      # the SAME 15 folds for every model
#   model                               AUC              log-loss    fit time
#   dummy (base rate)                  0.5000 ± 0.000     0.4443        2 ms       <- the floor every claim is measured against
#   logistic regression                0.7520 ± 0.045     0.3916       16 ms       <- best, on both metrics
#   naive Bayes                        0.7225 ± 0.041     0.6747        7 ms       <- ranks, does not calibrate (5.2)
#   KNN k = 101                        0.7186 ± 0.046     0.4072       11 ms
#   SVC rbf (balanced, γ 0.01)         0.7481 ± 0.048     0.3907      298 ms       <- second, and 20× slower
#   tree, depth 3                      0.6791 ± 0.046     0.5982        7 ms
#   random forest, leaf 20             0.7325 ± 0.043     0.3991    1,240 ms
#   HistGB, lr .05, depth 2, es        0.7308 ± 0.046     0.4025      106 ms
#   LightGBM, 15 leaves, lr .05        0.6868 ± 0.053     0.5158      321 ms       <- untuned for 989 rows: second-worst (6.4)
#   CatBoost, 300 × depth 4            0.7140 ± 0.051     0.4206    1,013 ms`,
      caption: "Three rules make the table trustworthy. The same folds for every model, so that fold-to-fold noise (± 0.045 here, comparable to the gaps between models) cancels in comparisons. A dummy baseline, so that every number has a floor. And the cost column, because 0.752 in 16 ms and 0.748 in 298 ms is a decision with an obvious answer. Repeats matter on small data: one 5-fold run would have ranked the SVM and the forest differently from the next."
    },

    { t: "code", lang: "python", title: "Is the winner really better? Paired comparison on the 15 shared folds (executed)",
      hl: [2, 3, 4, 5],
      code: `#   logistic vs random forest    mean difference +0.0195   sd of the fold differences 0.0136   paired t: p = 0.000   wins 15 / 15
#   logistic vs CatBoost         +0.0380                                   0.0298             p = 0.000   wins 13 / 15
#   logistic vs HistGB           +0.0212                                   0.0153             p = 0.000   wins 14 / 15
#   logistic vs SVC              +0.0039                                   0.0112             p = 0.194   wins  9 / 15      <- not distinguishable
# caveat: repeated-CV folds overlap, so the paired t-test is optimistic. Nadeau & Bengio's corrected variance multiplies the fold variance by
# (1/k + n_test/n_train) instead of 1/k; read p < 0.05 as 'suggestive' and the win count as the plain-language summary.`,
      caption: "A difference of 0.02 in mean AUC means nothing on its own when each model's fold spread is 0.045; it means a great deal when the *paired* fold differences have spread 0.014 and one model wins every fold. That is the value of shared folds: the comparison is between models on the same data, not between two noisy estimates. The SVM row is the other lesson — two models can be practically tied, and then the cheaper, simpler one is the choice."
    },

    { t: "code", lang: "python", title: "The same harness on spend (executed, 5 × 3, MAE)",
      hl: [3, 5, 6, 7, 8, 9],
      code: `#   model                              MAE               fit
#   dummy (mean)                     45.64 ± 2.37        1 ms
#   ridge on three raw columns       19.98 ± 1.03        4 ms      <- the wrong form
#   KNN k=3, distance-weighted        8.74 ± 0.67        5 ms
#   SVR (C 1000, ε 5)                 7.30 ± 0.33      178 ms
#   random forest, leaf 3             7.31 ± 0.41      985 ms
#   Extra Trees, leaf 3               7.25 ± 0.43      660 ms
#   HistGB depth 3, lr .05            7.24 ± 0.31      613 ms      <- the non-linear models tie within 0.07
#   ridge on the engineered column    6.31 ± 0.27        3 ms      <- fee × min(tenure, 12) × (1 − discount): the right form, one coefficient, 200× faster`,
      caption: "The second table is the first one's mirror: here the linear model on raw columns is the worst real model and every non-linear family ties, because the truth is a kinked product and they all approximate it. The winner is not a model family at all but a feature — the recurring lesson of 3.4 and 4.4 — and the harness is what makes that visible, because the engineered column is just another row in it."
    },

    { t: "dl", items: [
      ["Repeated CV", "k folds, repeated r times with different shuffles: k·r scores per model on identical splits. Reduces the fold-assignment noise that dominates small-data comparisons."],
      ["Paired comparison", "Differences per fold between two models, tested against zero. Far more powerful than comparing two means with their own spreads."],
      ["Nadeau–Bengio correction", "Repeated-CV folds share rows, so their scores are correlated and the naive t-test is optimistic; the corrected variance uses 1/k + n_test/n_train in place of 1/k."],
      ["Win count", "Folds on which A beats B; 15/15 is a result no p-value needs. The plain-language summary of a paired comparison."],
      ["Dummy baseline", "`DummyClassifier(strategy=\"prior\")`, `DummyRegressor()`: the floor. A model that does not beat it has learned nothing; a metric that scores it well is the wrong metric."],
      ["Cost column", "Fit and predict time, memory, serving complexity. A tie in the score column is decided here."],
      ["AutoML", "A search over model families and their hyperparameters under a time budget, with cross-validation inside: FLAML (cost-aware), auto-sklearn, H2O, AutoGluon (stacking), TPOT (pipelines)."]
    ]},

    { t: "h2", n: "02", text: "The decision questions", id: "framework" },

    { t: "table",
      head: ["Question", "Answer that favours…", "…and why (from the course's own results)"],
      rows: [
        ["How many rows?", "< 1,000: linear/logistic, naive Bayes, small SVM. 1,000–100,000: forest baseline, tuned boosting. > 100,000: LightGBM/XGBoost, or a linear model on good features", "Boosting defaults were the worst models on 989 rows (6.4); the four boosters tied at 0.968 on 200,000 (6.4); naive Bayes won at 40 documents (5.2)"],
        ["What is the truth's shape?", "Additive → linear (with splines or interactions if needed); products, kinks, thresholds → trees; smooth curves → SVM/KNN/splines", "Churn logit is additive: logistic 0.752 beat everything. Spend is a kinked product: every tree tied at 7.3, and the right feature beat them at 6.31"],
        ["What is the metric, and is it a probability?", "Calibrated probability needed → logistic, boosting with log-loss, then calibration; ranking only → anything, calibrate later", "Naive Bayes ranked well (0.7225) with log-loss 0.675; the forest compressed probabilities (6.2); AdaBoost's votes needed calibration (6.3)"],
        ["Must a human read it?", "Coefficients → logistic/linear; rules → a pruned tree; otherwise a black box with 9.1–9.2's explanations", "The depth-3 tree scored 0.679 for its readability; the pruned tree's rules moved with the sample (6.1)"],
        ["Latency and footprint?", "Linear models and symmetric-tree boosting for latency; nothing that scans the training set", "KNN 382 ms per 5,000 rows (1.7); CatBoost 0.02 s for 50,000 rows (6.4); the stack 35× its best member (6.5)"],
        ["Categoricals and missing values?", "Many high-cardinality categoricals → CatBoost or cross-fitted target encoding; missing values → tree models natively", "Naive target encoding leaked (6.4); native NaN routing equalled imputation for trees (6.1)"],
        ["Imbalance?", "Log-loss models with a tuned threshold; not hinge loss without weights", "The SVM collapsed to w = 0 (5.3); every treatment on the 2.5 % problem was a threshold in disguise (8.2)"],
        ["Will it drift, and how often can you retrain?", "Models that refit in seconds (linear, HistGB) for frequent refresh; monitoring hooks for all (11.1)", "Fit times in the table above: 16 ms to 1.2 s here, and the ratio holds at scale"]
      ]
    },

    { t: "callout", kind: "mental", title: "The procedure, not the flow chart", body: [
      { t: "p", text: "Fit the dummy, then the linear model with sensible features, then a forest with a large leaf size, then early-stopped boosting — in that order, on identical repeated folds, with the cost column. Read the table: if the linear model is within the fold spread of the best, ship it. If the trees win by a margin the paired test confirms, look for the non-linearity they found and ask whether a feature would let the linear model find it too (spend: it did, and won). Tune only the family that leads. Compare the finalist against the baseline on a held-out slice the search never saw (8.1). Then the questions that no score answers — interpretability, latency, refit cadence, what happens when the data drift — and if they favour the runner-up, take the runner-up and write down what it cost." }
    ]},

    { t: "h2", n: "03", text: "AutoML", id: "automl" },

    { t: "code", lang: "python", title: "FLAML with a 60-second budget on the churn target (executed; 70/30 split)",
      hl: [3, 4, 6],
      code: `AutoML().fit(X_train, y_train, task="classification", time_budget=60, metric="roc_auc", estimator_list=["lgbm", "xgboost", "rf", "extra_tree", "lrl1", "lrl2"])
#   best estimator:  lrl1 (L1-regularised logistic regression), C = 1.0
#   internal CV loss (1 − AUC) per family:  lrl1 0.226   lrl2 0.227   extra_tree 0.234   lgbm 0.236   xgboost 0.248   rf 0.279     <- it found the right family
#   hold-out AUC of FLAML's model: 0.7082
#   hold-out AUC of the course's scaled logistic pipeline on the same split: 0.7206                                                <- and lost 0.012 to a hand-built one`,
      caption: "In one minute, with no knowledge of the data, FLAML reached the same conclusion the harness did — this is a linear problem — and produced a model slightly worse than a two-line pipeline, because it did not standardise the features the way the course's pipeline does and its search budget was spread across six families. That is the honest shape of AutoML: it finds the family and a reasonable configuration fast, and it does not replace the feature work, the metric choice, or the decision questions above."
    },

    { t: "table",
      head: ["Tool", "Approach", "Strength", "Reach for it when"],
      rows: [
        ["FLAML", "Cost-aware search over families and configurations under a time budget", "Very fast to a good answer; scikit-learn compatible", "A first pass in minutes; a baseline for a manual search"],
        ["auto-sklearn", "Meta-learning warm start + Bayesian optimisation + ensembling", "Strong on standard tabular benchmarks", "Longer budgets; a scikit-learn pipeline is wanted"],
        ["H2O AutoML", "Many families plus stacked ensembles, distributed", "Enterprise scale; a leaderboard", "Large data on a cluster; a ranked set of candidates"],
        ["AutoGluon", "Multi-layer stacking of many models", "Highest leaderboard accuracy", "Competitions; accuracy at any serving cost"],
        ["TPOT", "Genetic programming over whole pipelines", "Discovers preprocessing + model combinations", "Exploratory; small data"],
        ["Optuna (8.1)", "Hyperparameter search for a chosen model", "Full control, pruning", "After the family is chosen"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When AutoML is the right first move, and what it does not do", body: [
      { t: "p", text: "**Right first move**: a new dataset with no prior on the family; a proof of concept with a deadline; a team without a modeller; a benchmark to tell whether a hand-built model is competitive. **What it does not do**: engineer the feature that beat every model here (fee × min(tenure, 12) × (1 − discount)); pick the metric or the threshold from costs; respect a latency budget unless told; explain itself; or notice a leak (1.5's refund column would win every AutoML run). The productive pattern is *AutoML to find the family, then manual work on features and the chosen family* — and a harness of your own, on your own folds, to check its claim." }
    ]},

    { t: "ladder",
      title: "A new tabular problem lands on Monday; a recommendation is due Friday",
      rungs: [
        { level: "bad", label: "Try XGBoost with defaults, report its accuracy", code: `XGBClassifier().fit(Xtr, ytr).score(Xte, yte)      # one split, one family, accuracy`,
          note: "**On 989 rows the boosting defaults were the second-worst model in the room; on 2.5 % positives accuracy is 0.975 for everything.** Neither the family nor the metric was chosen." },
        { level: "ok", label: "Harness of five families on repeated folds, PR-AUC, best by mean", code: `for m in [dummy, logistic, forest, HistGB, SVC]: cross_validate(m, X, y, cv=RepeatedStratifiedKFold(5, 3), scoring=["average_precision", "neg_log_loss"])`,
          note: "**The right table** — but 'best by mean' with fold spreads of 0.045 is a coin toss between the top two, and no cost column." },
        { level: "best", label: "Harness + paired comparison + the decision questions + AutoML as a check", code: `# 1. dummy, logistic (scaled, with any obvious engineered features), forest (leaf 20), HistGB (early stopping) on identical repeated folds
# 2. paired fold differences and win counts between the top two; cost column
# 3. FLAML(time_budget=300) as an independent opinion on the family
# 4. the questions: metric and threshold from costs; interpretability; latency; refit cadence
# 5. tune ONLY the leader (8.1); confirm on a slice the search never saw; write down the runner-up and why it lost`,
          note: "**A recommendation with an evidence trail: which family, by how much, at what cost, and what would change the answer.**" }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "Run the harness, test the winner, and audit an AutoML claim",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Build the churn harness with 5 × 3 repeated folds for the dummy, logistic, forest (leaf 20) and HistGB models, scoring PR-AUC instead of AUC; report means, spreads and fit times, and say whether the ranking matches the AUC table. **(b)** For the top two, compute the 15 paired fold differences, the naive paired t-test, and the Nadeau–Bengio corrected statistic (variance × (1/15 + 0.25/0.75) instead of 1/15); report both p-values and the win count. **(c)** Run FLAML for 120 seconds on the churn training split with `estimator_list` including a linear model, and compare its hold-out AUC with the course's logistic pipeline; then look at `best_loss_per_estimator` and write two sentences about what the search learned and what it did not." }
      ],
      requirements: [
        "(a) the four-row table and the ranking comparison.",
        "(b) two p-values and the win count, with the correction explained.",
        "(c) the two hold-out AUCs and the two sentences."
      ],
      hint: "(a) `scoring=[\"average_precision\", \"neg_log_loss\"]`. (b) The corrected t uses the same mean difference over a larger standard error. (c) `automl.best_loss_per_estimator` maps family → 1 − AUC.",
      solution: {
        lang: "python",
        title: "selection_practice.py",
        code: `# (a) executed, PR-AUC on the same 15 folds:
#   dummy            0.1628 ± 0.002    log-loss 0.4443      2 ms      <- PR-AUC's floor is the base rate
#   logistic         0.4135 ± 0.075    log-loss 0.3916      6 ms
#   forest, leaf 20  0.3815 ± 0.069    log-loss 0.3991  1,239 ms
#   HistGB           0.3726 ± 0.072    log-loss 0.4025     99 ms
#   the ordering matches the AUC table; the relative spreads are wider (± 0.07 on 0.41) because PR-AUC rests on ~30 positives per fold.

# (b) logistic vs forest
#   PR-AUC: mean difference +0.0319, sd 0.0320, n = 15;  naive t = 3.86, p = 0.002;  corrected (variance × (1/15 + 0.25/0.75) = 0.40 instead of 0.067)
#           t = 1.58, p = 0.14;  wins 12 / 15
#   AUC (the lesson's numbers, mean 0.0195, sd 0.0136):  naive t = 5.55, p = 0.00007;  corrected t = 2.27, p = 0.040;  wins 15 / 15
#   the correction multiplies the standard error by √6: the AUC result goes from overwhelming to marginal, the PR-AUC result from strong to
#   not significant. The win counts (15/15, 12/15) and the effect size against the cost (0.02 AUC for 200× the fit time) are what decide.

# (c) the lesson's 60-second run: FLAML chose L1 logistic regression (hold-out 0.7082) against the course pipeline's 0.7206.
#   sentence 1: the search learned that the linear families beat every tree family on this data (internal losses 0.226-0.227 vs 0.234-0.279),
#   which is the same conclusion as the harness and took one minute to reach.
#   sentence 2: it did not learn to standardise the inputs, did not choose the metric or a threshold, and spread a small budget across six
#   families -- so the hand-built pipeline of the chosen family still beat it. AutoML finds the family; the feature and metric work remains.`,
        notes: [
          { t: "p", text: "**(a)** is the harness as a habit: four models, identical folds, two metrics, the cost — twenty lines that answer most model-selection arguments." },
          { t: "p", text: "**(b)** shows why the p-value from repeated folds must be discounted, and why win counts and effect sizes are the numbers to quote." },
          { t: "p", text: "**(c)** is the honest use of AutoML: an independent opinion on the family, and a benchmark your own pipeline should beat." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Logistic regression beat the random forest by 0.0195 AUC with fold spreads of ±0.045 for each. Is the difference real?",
          options: [
            "No; the spreads overlap",
            "Yes: the spreads describe each model's fold-to-fold noise, most of which is shared when both models are scored on the same folds. The paired differences have spread 0.0136 and the logistic model won 15 of 15 folds; even with the Nadeau–Bengio correction for overlapping folds the result is at the edge of significance, and the win count and the 80× fit-time ratio settle it",
            "It cannot be known without a test set",
            "Only if the difference exceeds one standard deviation"
          ],
          answer: 1,
          why: "Shared folds turn two noisy means into one precise paired comparison."
        }
      ]
    }
  ],

  takeaways: [
    "**The harness**: identical repeated folds, a dummy baseline, the metric that matters, and the cost column — ten models in one table.",
    "**Churn**: logistic 0.752 wins, SVC 0.748 is a statistical tie (p 0.19, 9/15) at 20× the cost, the forest loses 15/15 folds, untuned LightGBM is second-worst.",
    "**Spend**: every non-linear family ties (7.24–7.31); the engineered column wins (6.31) at 200× less cost — the winner is a feature.",
    "**Compare paired, on shared folds**: the differences' spread (0.014) is a third of the models' spreads (0.045); count wins.",
    "**Repeated-CV p-values are optimistic** (folds overlap): Nadeau–Bengio multiplies the variance by 1/k + n_test/n_train; quote win counts and effect sizes.",
    "**The decision questions**: rows, truth's shape, metric and calibration, interpretability, latency, categoricals and missingness, imbalance, refit cadence — each answered by a result earlier in the course.",
    "**The procedure**: dummy → linear → forest → boosting on shared folds; ship the simplest within the spread; tune only the leader; confirm on an untouched slice.",
    "**AutoML found the family in 60 s** (linear, 0.226 vs 0.234–0.279) and lost 0.012 to a two-line pipeline: it finds families, not features, metrics or leaks.",
    "**AutoML's place**: a first pass, a proof of concept, an independent opinion, a benchmark to beat.",
    "**Write down the runner-up and why it lost** — the recommendation is the evidence trail, not the model name."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What makes a model comparison trustworthy?",
        options: [
          "A large test set",
          "Identical folds for every model, repeated so that fold-assignment noise averages out; a dummy baseline as the floor; the metric the model will be used under; paired fold differences and win counts for the top candidates rather than a comparison of means; and the cost of fitting and serving alongside the score",
          "Using the default hyperparameters for fairness",
          "Reporting accuracy and F1"
        ],
        answer: 1,
        why: "Two models with ±0.045 spreads can still be separated at 15/15 when the comparison is paired."
      },
      {
        stem: "Why is a t-test on repeated cross-validation folds optimistic, and what do you do about it?",
        options: [
          "Because 15 folds is too few",
          "Because the folds share training rows, so their scores are positively correlated and the naive standard error (sd/√k) is too small; Nadeau and Bengio's correction replaces 1/k by 1/k + n_test/n_train, which multiplied the standard error by √6 here and turned p ≈ 0.0001 into ≈ 0.04. Report the corrected test if a p-value is needed, and prefer win counts and effect sizes",
          "Because AUC is not normally distributed",
          "It is not optimistic; folds are independent"
        ],
        answer: 1,
        why: "A 15/15 win count survives any correction; a p = 0.03 may not."
      },
      {
        stem: "On the spend target the non-linear models tied within 0.07 and a one-column ridge beat them by a point. What is the lesson for model selection?",
        options: [
          "Ridge regression is the best model for regression",
          "When several families tie, they are all approximating the same structure and the gain lies in representing it directly: the engineered fee × min(tenure, 12) × (1 − discount) column encodes the truth's form, so a one-coefficient model reaches the noise floor at 200× less cost. The harness makes this visible because a feature is just another row in it",
          "Tree models are unsuitable for regression",
          "The non-linear models needed more tuning"
        ],
        answer: 1,
        why: "A tie among families is a hint about the data, not a reason to stack them."
      },
      {
        stem: "What did AutoML do well and badly on the churn data?",
        options: [
          "It beat every hand-built model",
          "Well: in 60 seconds with no prior it identified the linear family as the winner (internal loss 0.226 against 0.234–0.279 for the tree families), the same conclusion the harness reached. Badly: it did not standardise the inputs, spread its budget over six families, and its model lost 0.012 hold-out AUC to a two-line scaled logistic pipeline; it also cannot choose the metric, set a threshold, engineer the winning feature, or notice a leak",
          "It failed to find any model above the dummy",
          "It chose LightGBM, which overfitted"
        ],
        answer: 1,
        why: "Use AutoML to find the family and as a benchmark; do the feature and metric work yourself."
      },
      {
        stem: "Two models are statistically tied. How do you choose?",
        options: [
          "Pick the one with the higher mean",
          "By the questions the score does not answer: fit and serving cost (logistic 16 ms vs SVC 298 ms), interpretability, calibration of the probabilities, robustness to imbalance and drift, and how often it can be refitted. A tie in the score column is a decision in the cost column, and the simpler model wins ties by default",
          "Stack them",
          "Run more folds until one wins"
        ],
        answer: 1,
        why: "Simplicity is a tie-breaker with real value: fewer things to monitor, explain and retrain."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you choose between candidate models for a tabular problem?",
        strong: "With a harness and a set of questions. The harness scores every candidate on identical folds — five folds repeated three times on small data — with a dummy baseline, the metric the model will be used under, and the fit and serving cost, in the order dummy, linear model with sensible features, forest with a large leaf size, early-stopped boosting. On the churn data that table put logistic regression first at 0.752, the SVM in a statistical tie at 0.748 for twenty times the cost, the forest 0.02 behind on every one of the fifteen folds, and the untuned boosting libraries near the bottom; on the spend data every non-linear family tied within 0.07 and a one-column model on an engineered feature beat them all. I compare the top candidates by paired fold differences and win counts rather than by means, because the shared folds remove most of the noise, and I discount the p-value for overlapping folds. Then the questions the score cannot answer: does the metric need calibrated probabilities, must a human read the model, what latency and footprint are allowed, how are categoricals and missing values handled, is the target imbalanced, how often will it be refitted. I tune only the family that leads, confirm it on a slice the search never touched, and write down the runner-up and why it lost. If the linear model is within the fold spread of the best, it ships.",
        answer: [
          { t: "p", text: "The harness with its rules and results, the paired comparison, the decision questions, and the tuning-and-confirmation procedure." }
        ]
      },
      {
        level: "core",
        q: "When would you use AutoML, and what are its limits?",
        strong: "As a first pass on a new dataset, for a proof of concept under time pressure, when the team has no modeller, and as an independent opinion or benchmark for a model I built myself. A 60-second FLAML run on the churn data, with no knowledge of the problem, ranked the linear families above every tree family — exactly what my harness found — and that is its value: it finds the family and a reasonable configuration quickly. Its limits are everything around the model. It produced a model 0.012 AUC worse than a two-line scaled logistic pipeline, because it did not standardise the inputs and spread a small budget across six families. It cannot choose the metric or set a threshold from costs, it will not engineer the feature that beat every model on the spend data, it cannot respect a latency budget unless told, it does not explain its choice, and it will happily win with a leaking column. So the productive pattern is AutoML to find the family, then manual work on features, the metric and the chosen family — and my own harness on my own folds to check its claim.",
        answer: [
          { t: "p", text: "The right uses, the executed evidence for what it found, and the concrete list of what it does not do." }
        ]
      },
      {
        level: "advanced",
        q: "Your harness says a boosted model beats logistic regression by 0.01 AUC with 11 wins in 15 folds. The boosted model is 50× slower to serve and harder to explain. Recommend.",
        strong: "I would recommend the logistic model, and say why in the evidence's own terms. A 0.01 difference with 11 of 15 wins is suggestive rather than decisive: the paired fold differences on repeated cross-validation are correlated, so the naive p-value overstates the case — on my churn comparison the Nadeau–Bengio correction multiplied the standard error by √6 — and 11 of 15 is within what a tie plus noise produces. Even if the difference is real, 0.01 AUC has to be translated into the business metric at the operating threshold before it can be weighed against a fiftyfold serving cost and the loss of a model a stakeholder can read; often it is a handful of decisions a month. Then I would ask what the boosted model found that the linear model did not, because that is usually an interaction or a kink that a feature can give the linear model — on the spend data an engineered column took a linear model from worst to best — and I would try that before accepting the trade. If the gain survived all of it and the business metric said it mattered, I would take the boosted model with calibrated probabilities, SHAP explanations for the audit, and a monitoring plan for the extra fragility; but the default in a tie or near-tie is the simpler model, and I would write down exactly what would change that verdict.",
        answer: [
          { t: "p", text: "The statistical discount, the translation to business terms, the feature alternative, and the conditions under which the verdict flips." }
        ]
      }
    ]
  }
});

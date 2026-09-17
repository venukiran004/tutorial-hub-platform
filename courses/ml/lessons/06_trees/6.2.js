/* ============================================================================
   LESSON 6.2 — Bagging and Random Forests
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**A single tree's problem is variance: resample the data and you get a different tree. The cure is to grow many trees on many resamples and average them — and the arithmetic of averaging says exactly how much that helps and what limits it.** The variance of a mean of B correlated predictors is ρσ² + (1 − ρ)σ²/B: more trees kill the second term, and only *decorrelating* the trees touches the first. Bagging supplies the bootstrap resamples; the random forest adds the decorrelation by offering each split a random subset of features. Every claim is executed: the prediction variance of a full tree (0.1005) against a forest (0.0055); one hundred per cent of bagged trees splitting on the same dominant feature against 18 % in a forest, with pairwise correlation falling from 0.36 to 0.24; a thousand trees that never overfit; the free validation estimate that comes from the 36.8 % of rows each tree never saw; and the importance that lies (a random id at 0.161) against the one that does not.",

  objectives: [
    "Derive the variance of an average of correlated predictors and read bagging and feature subsetting off it",
    "Explain bootstrap sampling, the 36.8 % out-of-bag rows, and OOB error as free validation",
    "Tune max_features and min_samples_leaf, and explain why n_estimators is not a capacity dial",
    "Contrast MDI and permutation importance, use Extra Trees and proximities, and know what a forest cannot fix"
  ],

  prerequisites: ["6.1", "1.3", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Why averaging works, and why it stops working", id: "variance" },

    { t: "code", lang: "text", title: "The variance of an average of B predictors with variance σ² and pairwise correlation ρ",
      code: `Var( (1/B) Σ Tᵦ )  =  (1/B²) [ B σ²  +  B(B - 1) ρ σ² ]  =  ρ σ²  +  (1 - ρ) σ² / B

B -> ∞:     the second term vanishes; the first, ρσ², stays.       averaging removes only the UNCORRELATED part of the variance
ρ = 1:      identical trees: averaging does nothing
ρ = 0:      independent trees: variance falls as 1/B

executed on a 20-feature problem with one dominant feature (3,000 rows, 200 trees):
                      individual tree AUC    pairwise ρ    σ² (one tree)    ρσ² + (1-ρ)σ²/B    root split = the dominant feature    ensemble AUC
   bagging              0.691                 0.361          0.159              0.0579                100 % of trees                 0.865
   max_features 0.5     0.684                 0.333          0.166              0.0558                 52 %                           0.865
   max_features √p      0.656                 0.236          0.190              0.0455                 18 %                           0.868
   max_features 2       0.625                 0.151          0.211              0.0328                  9 %                           0.868
   max_features 1       0.592                 0.081          0.229              0.0196                  6 %                           0.865

bias is untouched by averaging: E[mean of trees] = E[one tree]. Bagging is variance reduction and nothing else.`,
      caption: "Read the two middle columns against each other. Restricting the features each split may use makes every individual tree *worse* (AUC 0.691 → 0.592) and *less alike* (ρ 0.361 → 0.081), and the ensemble is as good or better because the second effect wins. With all features available, every bagged tree opens with the same dominant split and the trees are near-copies; the random subset forces the weaker features into the roots and the trees into disagreement, which is what an average needs. That is the whole difference between bagging and a random forest."
    },

    { t: "dl", items: [
      ["Bootstrap sample", "n rows drawn from n with replacement. Each row is absent with probability (1 − 1/n)ⁿ → e⁻¹ = 0.368; measured 0.3675 over 200 draws."],
      ["Bagging", "Bootstrap aggregating: fit one model per bootstrap sample, average (regression) or vote / average probabilities (classification). Works for any high-variance learner; trees are the natural one."],
      ["Random forest", "Bagging of unpruned trees, plus at every split a random subset of `max_features` candidates. The subset decorrelates the trees; √p for classification and p/3 (or all) for regression are the conventional defaults."],
      ["Out-of-bag (OOB)", "For each row, the prediction from the trees whose bootstrap omitted it (~37 % of them: 183 of 500 for row 0). Aggregated over rows it is a validation estimate that costs nothing."],
      ["MDI importance", "Mean decrease in impurity: each feature's summed impurity reduction across all trees' splits, normalised. Fast, biased toward many-valued columns, computed on the training rows."],
      ["Permutation importance", "The drop in a held-out score when one column is shuffled. Unbiased by cardinality; shares credit between correlated features."],
      ["Extra Trees", "Extremely randomised trees: no bootstrap, and at each split the threshold for each candidate feature is drawn at random rather than optimised. More randomness, less correlation, faster."],
      ["Proximity", "The fraction of trees in which two rows land in the same leaf: a similarity learned from the target, usable for neighbours, outliers and imputation."]
    ]},

    { t: "h2", n: "02", text: "On the churn data: tree, bagging, forest", id: "churn" },

    { t: "code", lang: "python", title: "Prediction variance across 30 bootstrap refits, and what it costs in AUC (executed; 989 rows, 30 % holdout)",
      hl: [2, 4, 5, 6],
      code: `#                                     variance of p̂ across refits    AUC of one fit    AUC of the 30-fit average    log-loss of one fit
#   single tree, unpruned                        0.1005                  0.5491               0.6672                  1.642
#   single tree, depth 4                         0.0232                  0.6141               0.6785                  0.591
#   bagging, 100 unpruned trees                  0.0096                  0.6474               0.6732                  0.496
#   random forest, 100 trees, √p features        0.0055                  0.6690               0.6839                  0.445
#   random forest, min_samples_leaf 10           0.0023                  0.6821               0.6974                  0.418`,
      caption: "The single tree's prediction for a customer moves by ±0.32 (√0.1005) from one resample to the next; the forest's by ±0.07; the forest with larger leaves by ±0.05. The AUC of a single fit climbs 0.13 as the variance falls, and 'AUC of the average' is what a forest of 3,000 trees would approach. Note that pruning the tree (depth 4) also cuts variance, by adding bias; the forest cuts it without adding any, which is why forests of *unpruned* trees are the default."
    },

    { t: "code", lang: "python", title: "n_estimators is not a capacity dial (executed, 5-fold)",
      hl: [2, 3, 8, 9],
      code: `#   trees       CV AUC     CV log-loss    train AUC
#       1        0.5431      1.7259         0.8150      <- one bootstrap tree
#       5        0.6112      0.7028         0.9933
#      10        0.6449      0.5653         0.9996
#      25        0.6819      0.4505         1.0000
#      50        0.6847      0.4323         1.0000
#     100        0.6909      0.4216         1.0000
#     300        0.6947      0.4197         1.0000
#   1,000        0.6970      0.4175         1.0000      <- still improving at the third decimal; never worse`,
      caption: "More trees is a better estimate of the same average, so the out-of-sample score rises monotonically to a plateau and never turns down: the forest cannot overfit through B. Set it as large as the time budget allows and stop tuning it. The training AUC of 1.000 is not a warning here — every unpruned tree reproduces its own bootstrap, so the forest reproduces the training set — and the CV column is the one that matters."
    },

    { t: "code", lang: "python", title: "The dials that do matter: max_features and leaf size (executed, 5-fold; logistic regression on the same columns: 0.7411)",
      hl: [3, 4, 6, 12, 13, 14],
      code: `# max_features (12 columns; √12 ≈ 3)      CV AUC     OOB AUC
#   1                                       0.6855     0.7023
#   2                                       0.6889     0.6962
#   3  (= sqrt, the default)                0.6936     0.7122      <- best
#   0.5 (6 columns)                         0.6845     0.6991
#   None (all 12: bagging)                  0.6675     0.6777      <- the same trees, more alike, worse

# min_samples_leaf (300 trees, sqrt)        CV AUC     log-loss
#   1  (unpruned)                           0.6947     0.4197
#   3                                       0.7028     0.4100
#   5                                       0.7143     0.4038
#   10                                      0.7195     0.4009
#   20                                      0.7244     0.4005      <- best; 989 rows, 15 % positives: leaves need ~20 rows to hold a stable rate
#   50                                      0.7232     0.4064`,
      caption: "Two dials, both worth a grid. `max_features` trades individual tree strength against correlation; the default is usually close. `min_samples_leaf` is the forest's real regulariser on noisy targets: with pure leaves each tree's probability is 0 or 1 and the average is coarse and over-confident; leaves of 20 rows emit rates, and the log-loss improves at every step to that point. Even tuned, the forest trails logistic regression by 0.017 — the churn logit is additive, and 6.1's argument about axis-aligned steps on a smooth surface still applies to an average of them."
    },

    { t: "code", lang: "python", title: "Out-of-bag: validation for free (executed)",
      code: `RandomForestClassifier(500, min_samples_leaf=5, oob_score=True).fit(X, y)
#   OOB AUC (from oob_decision_function_)         0.7245
#   5-fold cross-validated AUC, same settings     0.7120
#   trees that did not see row 0: 183 of 500       (expected 500 × 0.368 = 184)`,
      caption: "Each row is predicted by the ~184 trees that never trained on it, so the OOB score is an honest out-of-sample estimate at zero extra cost — mildly optimistic here (0.7245 vs 0.7120) because OOB trees are slightly fewer than the forest and their errors are pooled across the whole training set rather than five disjoint folds. Use it to tune the forest's dials quickly; use proper CV for the final number and for anything with a preprocessing step that must be refitted per fold (3.5)."
    },

    { t: "h2", n: "03", text: "Importance: the one that lies and the one that shares", id: "importance" },

    { t: "code", lang: "python", title: "Two noise columns added — a random integer id (989 distinct values) and a random normal (executed, forest of 300, 30 % holdout)",
      hl: [2, 3, 6, 7, 11],
      code: `# MDI (feature_importances_):     tenure 0.206   logins 0.172   random_id 0.161   fee 0.141   random_normal 0.127   tickets 0.059   channel_paid 0.029
#                                                                 ^^^^^^^^^^^^^^^^^                ^^^^^^^^^^^^^^^^^^^^
# the two noise columns rank third and fifth of fourteen -- above tickets, the strongest signal in the generator

# permutation importance on the held-out rows (AUC drop when the column is shuffled, 20 repeats):
#   logins 0.0662 ± 0.022   tenure 0.0298 ± 0.016   fee 0.0251 ± 0.008   tickets 0.0245   plan_pro 0.0132   channel_paid 0.0078   random_id 0.0051   random_normal ≈ 0
# the noise columns fall to the bottom; the ranking matches the generator (logins, tenure, tickets, plan, channel)

# add a near-copy of logins (noise sd 0.1) and refit:
#   permutation:  logins 0.0285,  logins_copy 0.0426          (logins alone was 0.0662: the credit is SPLIT, because shuffling one copy leaves the other intact)
#   MDI:          logins 0.112,   logins_copy 0.184           (also split, and still biased)`,
      caption: "MDI counts impurity reductions on the training rows, and a many-valued column always finds a threshold that reduces impurity on some tiny node — it is measuring the tree's ability to overfit the column. Permutation importance asks the only question that matters: does the model's held-out score fall when this column is scrambled? Its one weakness is correlated features: a shuffled column's information is still available through its copy, so both look less important than the pair is. Group correlated features and permute the group, or read 9.2's SHAP with the same caveat in mind."
    },

    { t: "callout", kind: "insight", title: "What a forest fixes, and what it does not", body: [
      { t: "p", text: "It fixes variance: the churn AUC went from a tree's 0.674 to 0.724, and on the XOR problem a forest of depth-2 trees scored 0.908 where a single depth-2 tree scored 0.710 — different bootstraps find different roots, and the average recovers the interaction. It does not fix the geometry: on the diagonal boundary the forest scored 0.981 against the tree's 0.974 and logistic regression's 0.993, because an average of staircases is a smoother staircase, still axis-aligned. It does not extrapolate: every tree is flat beyond its last split, so their mean is too. It does not fix bias from a smooth additive truth — the churn forest never caught the logistic model. And its probabilities are pulled toward the middle: with 15 % positives the forest's top quintile was predicted at 0.356 against an actual rate of 0.318, its maximum p̂ was 0.66, and its minimum 0.002 — an average of votes rarely reaches the extremes, so calibrate (2.5) before reading a forest's probability as one." }
    ]},

    { t: "code", lang: "python", title: "Extra Trees, regression, and proximities (executed)",
      code: `# classification, 300 trees, min_samples_leaf 5, 5-fold:    forest AUC 0.7140 (2.1 s)     Extra Trees 0.7104 (1.6 s)
# spend regression (tenure, fee, discount), 5-fold MAE:
#   single tree depth 8    7.90
#   forest 300             7.71        forest, min_samples_leaf 3    7.35
#   Extra Trees 300        7.81        Extra Trees, leaf 3           7.28        <- random thresholds smooth the kink better than optimised ones
#   (linear 20.94, KNN 8.81, the engineered column 6.34, noise floor 6.38)

# proximity: share of trees in which two rows share a leaf
#   row 0:      tenure 38, fee 13.17, logins 10, tickets 2, discount 0
#   nearest:    tenure 52, fee 12.64, logins  9, tickets 2, discount 0     proximity 0.40
#   second:     tenure 43, fee 13.10, logins 10, tickets 0, discount 0     proximity 0.35`,
      caption: "Extra Trees replace the search for the best threshold with a random draw, which makes each tree weaker, faster and less correlated — on the kinked spend surface that randomness acts as smoothing and wins by a hair. Proximity is a by-product worth knowing: two rows are similar if the forest keeps putting them in the same leaves, a similarity that is defined by what predicts the target rather than by a hand-chosen metric (5.1), and it drives forest-based imputation, clustering and outlier scores."
    },

    { t: "table",
      head: ["Dial", "Effect", "Default", "Tune?"],
      rows: [
        ["`n_estimators`", "More trees: lower variance of the average, never overfits (0.543 → 0.697 from 1 to 1,000)", "100", "No — as large as time allows"],
        ["`max_features`", "Candidates per split: fewer → weaker, less correlated trees (ρ 0.36 → 0.08)", "√p (classification), 1.0 (regression)", "Yes, a few values around the default"],
        ["`min_samples_leaf`", "Leaf size: larger → smoother probabilities, less variance (0.695 → 0.724 at 20)", "1", "Yes — the main regulariser on noisy targets"],
        ["`max_depth`", "Alternative capacity cap", "None", "Usually leave; leaf size is more natural"],
        ["`bootstrap`", "Resample or not; off for Extra Trees", "True", "Rarely"],
        ["`class_weight`", "Re-weights the minority in impurity and leaves", "None", "For imbalance (8.2)"],
        ["`oob_score`", "Free validation estimate", "False", "On, for quick tuning"],
        ["`n_jobs`", "Trees are independent: embarrassingly parallel", "None", "−1"]
      ]
    },

    { t: "ladder",
      title: "A tabular risk model on 40 mixed features and 200,000 rows, to be refreshed monthly",
      rungs: [
        { level: "bad", label: "Default forest, importances reported", code: `RandomForestClassifier().fit(X, y); rf.feature_importances_`,
          note: "**100 unpruned trees with pure leaves on 200,000 rows — memory-heavy, over-confident probabilities, and an importance list led by whichever column has the most distinct values.**" },
        { level: "ok", label: "Leaf size and max_features by OOB, permutation importance", code: `RandomForestClassifier(500, min_samples_leaf=50, max_features="sqrt", oob_score=True, n_jobs=-1)
permutation_importance(rf, X_holdout, y_holdout, scoring="roc_auc", n_repeats=10)`,
          note: "**A strong, stable, honest tabular model.** Its probabilities still cluster in the middle, and at 500 deep trees the artefact is large and slow to score." },
        { level: "best", label: "Tuned forest, calibrated, compared against boosting, with monitoring hooks", code: `rf = RandomForestClassifier(500, min_samples_leaf=50, max_features=0.3, n_jobs=-1)
cal = CalibratedClassifierCV(rf, method="isotonic", cv=5)              # probabilities that mean what they say
# benchmark against HistGradientBoosting (6.4) on the same folds; log OOB AUC, permutation importances and proximity-based outlier rate each refresh (11.1)`,
          note: "**The forest as a calibrated, benchmarked, monitored component** — usually the runner-up to boosting on tabular data, and the more forgiving of the two to tune." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "The variance formula by hand, OOB by hand, and an importance you must reconcile",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** Using the executed numbers for bagging (σ² = 0.159, ρ = 0.361) and for max_features = 1 (σ² = 0.229, ρ = 0.081), compute the ensemble variance ρσ² + (1 − ρ)σ²/B for B = 1, 10, 100 and ∞, and say at which B the decorrelated forest overtakes bagging. **(b)** For a forest of 500 trees on 989 rows, compute the expected number of trees that omit a given row, the probability that a row is omitted by *no* tree, and the expected number of rows with no OOB prediction. **(c)** In the permutation experiment, logins scored 0.0662 alone and 0.0285 + 0.0426 = 0.0711 as a pair with its near-copy. Explain why the pair's sum is not the same as the single value, and design a permutation scheme that would recover a single number for 'logins and its copy'." }
      ],
      requirements: [
        "(a) eight variances and the crossover B.",
        "(b) the three OOB quantities.",
        "(c) the mechanism and the grouped-permutation design."
      ],
      hint: "(a) At B = 1 the formula is just σ². (b) P(no tree omits the row) = (1 − 0.368)⁵⁰⁰. (c) Permute the two columns together, keeping their rows aligned.",
      solution: {
        lang: "python",
        title: "forest_practice.py",
        code: `# (a)  Var_B = ρσ² + (1 - ρ)σ²/B
#             bagging (σ² 0.159, ρ 0.361)        max_features=1 (σ² 0.229, ρ 0.081)
#   B = 1        0.159                                0.229           <- one tree: the decorrelated one is individually worse
#   B = 10       0.0574 + 0.0102 = 0.0676             0.0185 + 0.0210 = 0.0396
#   B = 100      0.0574 + 0.0010 = 0.0584             0.0185 + 0.0021 = 0.0206
#   B = ∞        0.0574                               0.0185
#   crossover: 0.0574 + 0.1016/B < 0.0185 + 0.2105/B  ->  B > 2.8: from three trees on, the decorrelated forest has the lower variance.
#   the bagging floor (0.057) is three times the forest's (0.019) and no number of trees can lower it.

# (b)  P(omit) = 0.368 per tree
#   expected omitting trees:  500 × 0.368 = 184          (measured 183 for row 0)
#   P(no tree omits the row) = 0.632^500 ≈ 10⁻¹⁰⁰: effectively zero
#   expected rows without an OOB prediction: 989 × 10⁻¹⁰⁰ ≈ 0.  With 10 trees it would be 989 × 0.632^10 = 989 × 0.0102 ≈ 10 rows.

# (c)  Permuting logins alone breaks the link between logins and y for THAT column, but the model can still read the same information
#   from logins_copy, so the score falls less (0.0285) than it did when logins was the only carrier (0.0662). The copy's shuffle likewise
#   falls less. Their sum (0.071) is close to the single value only by coincidence -- in general the sum can be anywhere from ~0 (perfect
#   copies: neither shuffle hurts) to ~2× (the model relies on both jointly). Grouped permutation: shuffle the ROWS of both columns
#   together (one permutation applied to the pair) and measure the drop once -- the score then has no route to the information and the
#   drop is the pair's joint importance. Generalise: cluster features by correlation, permute clusters.`,
        notes: [
          { t: "p", text: "**(a)** is the formula doing real work: it says the forest's advantage is a lower *floor*, not a faster descent, and the floor is set by ρ." },
          { t: "p", text: "**(b)**: OOB coverage is complete for any forest of a few dozen trees or more, which is why the estimate is trustworthy at zero cost." },
          { t: "p", text: "**(c)** is the standard caveat on every permutation-based importance, and the standard fix: importance is a property of a *set* of features when the set is correlated." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Restricting each split to √p random features made every tree worse (AUC 0.691 → 0.656) and the forest better (0.865 → 0.868). Why?",
          options: [
            "Weaker trees overfit less",
            "The ensemble variance is ρσ² + (1 − ρ)σ²/B, and with all features available every bagged tree opened with the same dominant split (100 % of roots), so ρ was 0.36 and averaging could not remove that shared part. The subset forced different roots (18 %), cut ρ to 0.24, and the drop in the floor ρσ² outweighed the rise in each tree's own σ²",
            "Because √p is the optimal number of features",
            "Because bagging does not use the bootstrap"
          ],
          answer: 1,
          why: "Bagging removes the uncorrelated variance; the random subset creates uncorrelated variance to remove."
        }
      ]
    }
  ],

  takeaways: [
    "**Var(average) = ρσ² + (1 − ρ)σ²/B**: more trees remove the second term; only decorrelation lowers the first. Bias is untouched.",
    "**Bootstrap: 36.8 % of rows are out of bag per tree** (measured 0.3675); OOB predictions are a free validation estimate (0.7245 vs CV 0.7120).",
    "**Random forest = bagging + random feature subsets per split**: ρ 0.36 → 0.24 at √p, roots on the dominant feature 100 % → 18 %, ensemble AUC held or improved while each tree got worse.",
    "**Variance measured**: a full tree's prediction varies with sd 0.32 across resamples; a forest's 0.07; a large-leaf forest's 0.05. AUC of one fit 0.549 → 0.682.",
    "**n_estimators never overfits** (0.543 → 0.697 from 1 to 1,000 trees, monotone); set it large and tune `max_features` and `min_samples_leaf` instead (0.695 → 0.724 at leaf 20).",
    "**MDI importance is biased and fitted on training rows** — a random id ranked third; permutation importance on held-out data ranks the generator's features correctly and splits credit between correlated copies (0.066 → 0.029 + 0.043).",
    "**A forest fixes variance, not geometry**: staircase 0.981 vs logistic 0.993; XOR recovered (0.710 → 0.908 at depth 2); no extrapolation; churn 0.724 vs logistic 0.741 on an additive truth.",
    "**Forest probabilities cluster in the middle** (max p̂ 0.66, top quintile 0.356 vs actual 0.318): calibrate before quoting.",
    "**Extra Trees**: random thresholds, no bootstrap — faster, less correlated, and a hair better on the kinked spend surface (7.28 vs 7.35).",
    "**Proximity** (shared-leaf frequency) is a target-aware similarity — the forest's answer to 5.1's metric problem."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between bagging and a random forest, and why does it matter?",
        options: [
          "A forest uses more trees",
          "Both average trees grown on bootstrap samples; a forest additionally restricts each split to a random subset of features. Bagged trees on a dataset with a dominant feature are near-copies (every root the same, ρ = 0.36), and averaging copies removes little; the subset decorrelates them (ρ = 0.24 at √p, 0.08 at one feature) so the average has a lower variance floor — on the churn data bagging scored 0.668 and the forest 0.694",
          "A forest prunes its trees",
          "Bagging uses boosting"
        ],
        answer: 1,
        why: "ρσ² is the part of the variance no number of trees can remove; max_features is the dial on ρ."
      },
      {
        stem: "Does adding trees to a random forest ever hurt out-of-sample performance?",
        options: [
          "Yes, past the optimal number it overfits",
          "No: each added tree is another draw from the same distribution, so the average converges to its expectation and the score rises monotonically to a plateau (0.543 → 0.697 from 1 to 1,000 trees). The cost is only time and memory. Capacity is set by leaf size and max_features, not by B",
          "Yes, if max_features is too small",
          "Only for regression"
        ],
        answer: 1,
        why: "The training AUC of 1.000 at every B is the unpruned trees reproducing their bootstraps, not a symptom."
      },
      {
        stem: "How does out-of-bag error work and when would you still cross-validate?",
        options: [
          "OOB is the training error of the forest",
          "Each tree omits ~37 % of rows; each row is scored by only the trees that omitted it (~184 of 500), giving an out-of-sample estimate with no held-out data. Still cross-validate for the final reported number, for comparisons with non-forest models on identical folds, and whenever a preprocessing step must be refitted per fold — OOB cannot see outside the forest",
          "OOB requires a separate validation set",
          "OOB only works for regression"
        ],
        answer: 1,
        why: "OOB 0.7245 against CV 0.7120 here — close, mildly optimistic, and free."
      },
      {
        stem: "Why should you not report `feature_importances_` as the drivers of a forest's predictions?",
        options: [
          "Because forests have no importances",
          "It is mean decrease in impurity on the training rows, and a many-valued column always finds impurity-reducing thresholds on small nodes: a random integer id ranked third of fourteen (0.161) above the genuine signal in tickets. Permutation importance on held-out rows — the score drop when a column is shuffled — put the noise columns at the bottom and matched the generator; its own caveat is that correlated features share credit, so permute correlated groups together",
          "Because it sums to one",
          "Because it is slow to compute"
        ],
        answer: 1,
        why: "MDI measures how much the trees used a column, including to memorise it."
      },
      {
        stem: "The forest's probabilities never exceeded 0.66 on a 15 %-positive target. What does that mean for its use?",
        options: [
          "The forest is underfitting",
          "An average of votes over trees rarely reaches the extremes, so forest probabilities are compressed toward the base rate — top quintile predicted 0.356 against an actual 0.318, minimum 0.002. The ranking is fine; the values need calibration (isotonic or Platt) before they are used as probabilities or compared with a threshold chosen in probability units",
          "The forest needs more trees",
          "The target is mislabelled"
        ],
        answer: 1,
        why: "Larger leaves helped (log-loss 0.420 → 0.400) but did not remove the compression; calibration does."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain how a random forest works and why it outperforms a single tree.",
        strong: "A single tree has low bias and high variance: on the churn data an unpruned tree's predicted probability for a customer varied with a standard deviation of 0.32 across bootstrap refits and its AUC was 0.55. A random forest grows hundreds of unpruned trees, each on a bootstrap resample of the rows, and at every split lets each tree choose from only a random subset of the features; it then averages their predictions. Averaging B predictors with variance σ² and pairwise correlation ρ gives variance ρσ² + (1 − ρ)σ²/B, so more trees remove the uncorrelated part and the feature subset lowers ρ — without it every tree opens on the same dominant split, and I measured 100 % identical roots and ρ = 0.36 for bagging against 18 % and 0.24 for the forest. Bias is unchanged by averaging, which is why the trees are left unpruned. The forest's prediction variance was 0.0055 against the tree's 0.1005 and its AUC 0.68 against 0.55; adding trees never hurts, and the dials that matter are the feature subset size and the leaf size, which took the churn forest to 0.724. It also gives an out-of-bag validation estimate for free, because each tree misses 37 % of the rows.",
        answer: [
          { t: "p", text: "Tree variance with numbers, the two randomisations, the variance formula and what each term does, and the measured result." }
        ]
      },
      {
        level: "core",
        q: "How would you get feature importance from a random forest, and what are the pitfalls?",
        strong: "Not from `feature_importances_`, or not only. That is mean decrease in impurity: the sum of impurity reductions each feature achieved across all splits in all trees, on the training rows. It is fast but biased toward columns with many distinct values, because such a column always offers a threshold that purifies some small node — when I added a random integer id and a random normal to the churn features, they ranked third and fifth of fourteen, above the genuine signal in support tickets. Permutation importance asks the right question: shuffle one column in held-out data and measure the drop in the score; the noise columns then fall to the bottom and the ranking matched the data generator. Its pitfall is correlation: if two columns carry the same information, shuffling one leaves the other, so both look less important than the pair — logins went from 0.066 alone to 0.029 with a near-copy present. The fix is to permute correlated groups together, or to use SHAP with the same caveat in mind. And whichever method, importance is what the model uses, not what causes the outcome — a leaked post-outcome column would top every list.",
        answer: [
          { t: "p", text: "MDI's mechanism and executed failure, permutation's mechanism and its correlation caveat with numbers, and the causal disclaimer." }
        ]
      },
      {
        level: "advanced",
        q: "When would a random forest be the wrong choice, even on tabular data?",
        strong: "Four cases from the experiments. When the truth is smooth and additive, because an average of axis-aligned step functions is still a step function: on the churn data, whose logit is additive, the tuned forest reached 0.724 against logistic regression's 0.741, and on a diagonal boundary it scored 0.981 against 0.993 for a three-parameter model. When extrapolation is needed, because every tree is flat beyond its last split and so is their mean. When calibrated probabilities are the product, because a vote average is compressed toward the base rate — the forest's maximum probability was 0.66 on a 15 %-positive target — so it needs calibration, whereas a logistic model or a boosted model with log-loss is closer to calibrated natively. And when the best tabular accuracy is required, because gradient boosting reduces bias as well as variance and usually wins the benchmark, at the cost of being harder to tune; the forest's place is as the robust, parallel, nearly tuning-free baseline that a boosted model has to beat, and as the source of proximities and OOB diagnostics that boosting does not provide.",
        answer: [
          { t: "p", text: "Smooth truths, extrapolation, calibration and the boosting benchmark — each with its number, and the forest's proper role." }
        ]
      }
    ]
  }
});

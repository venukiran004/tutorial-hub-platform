/* ============================================================================
   LESSON 6.4 — XGBoost, LightGBM and CatBoost
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**The three libraries that dominate tabular machine learning are all gradient boosting (6.3) with three engineering ideas layered on: a second-order, regularised split gain; histogram binning with leaf-wise growth; and leakage-free handling of categoricals.** This lesson derives the split-gain formula from a second-order Taylor expansion and checks it against XGBoost's own tree dump (leaf weights −0.5 and 0.667 to the digit), then runs all three on the course data and on 200,000 rows: LightGBM fits in 3.4 s where a forest takes 34; CatBoost predicts in 0.02 s because its trees are symmetric; and on 989 rows every library's defaults lose to logistic regression until the regularisers are turned on. It closes with the trap the categorical machinery exists to avoid — naive target encoding of a 500-level column with *no* signal reached a training AUC of 0.82 and a test AUC *below* the model without the column — and the ordered statistics that fix it, computed by hand.",

  objectives: [
    "Derive the second-order objective, the optimal leaf weight and the split gain, and read λ, γ and min_child_weight off them",
    "Explain histogram binning, leaf-wise versus depth-wise growth, GOSS and EFB, and symmetric trees",
    "Compute ordered target statistics by hand and show why naive target encoding leaks",
    "Choose and tune among XGBoost, LightGBM, CatBoost and HistGradientBoosting for a given data size and shape"
  ],

  prerequisites: ["6.3", "3.2", "3.5"],

  blocks: [

    { t: "h2", n: "01", text: "The second-order objective and the split gain", id: "gain" },

    { t: "code", lang: "text", title: "From the loss to a formula for every leaf and every split",
      code: `objective at round t:   Σᵢ l( yᵢ, ŷᵢ⁽ᵗ⁻¹⁾ + fₜ(xᵢ) )  +  Ω(fₜ),        Ω(f) = γ T + ½ λ Σⱼ wⱼ²        (T leaves, leaf weights wⱼ)

second-order Taylor expansion in fₜ, with  gᵢ = ∂l/∂ŷ  and  hᵢ = ∂²l/∂ŷ²  evaluated at the current prediction:
      ≈ Σᵢ [ gᵢ fₜ(xᵢ) + ½ hᵢ fₜ(xᵢ)² ]  +  γT + ½λ Σⱼ wⱼ²          (the constant l(yᵢ, ŷᵢ⁽ᵗ⁻¹⁾) dropped)

a tree assigns every row to a leaf j with weight wⱼ, so group the sums by leaf, Gⱼ = Σ_{i∈j} gᵢ,  Hⱼ = Σ_{i∈j} hᵢ:
      = Σⱼ [ Gⱼ wⱼ + ½ (Hⱼ + λ) wⱼ² ]  +  γT                             a quadratic in each wⱼ, separately

optimal leaf weight        wⱼ* = - Gⱼ / (Hⱼ + λ)                       (λ = 0: the Newton step of 6.3; λ > 0 shrinks it)
objective at the optimum   - ½ Σⱼ Gⱼ² / (Hⱼ + λ)  +  γT                 (the 'structure score': lower is better)

GAIN of splitting a leaf into L and R:
      Gain = ½ [ G_L²/(H_L + λ)  +  G_R²/(H_R + λ)  -  (G_L + G_R)²/(H_L + H_R + λ) ]  -  γ
      make the split only if Gain > 0, i.e. only if the improvement exceeds γ: pruning is built into the criterion

for log-loss:  g = p - y,  h = p(1 - p).   min_child_weight is a floor on Hⱼ: a leaf whose rows are all near-certain (h ≈ 0) cannot be split further.`,
      caption: "6.3's gradient boosting fitted a tree to the gradient and then chose leaf values; here the tree is chosen *by* the same objective that sets the leaf values, with the curvature included, and every regulariser has a place in the formula: λ in the denominators, γ subtracted from every gain, min_child_weight as a floor on the Hessian sum. This is why the libraries' 'regularisation' parameters behave predictably — they are terms in one equation."
    },

    { t: "code", lang: "text", title: "Six rows, one round from p = 0.5, λ = 1, γ = 0 (executed; checked against XGBoost's tree dump)",
      code: `x = 1 2 3 4 5 6        y = 0 0 1 0 1 1        p = 0.5 everywhere ->  g = p - y = [0.5, 0.5, -0.5, 0.5, -0.5, -0.5],   h = p(1-p) = 0.25 each

split       G_L     H_L      G_R     H_R      G_L²/(H_L+1)   G_R²/(H_R+1)   G²/(H+1)     Gain = ½[...]     w_L        w_R
x ≤ 1.5     0.5     0.25     -0.5    1.25       0.200          0.111          0.000        0.1556        -0.400     0.222
x ≤ 2.5     1.0     0.50     -1.0    1.00       0.667          0.500          0.000        0.5833        -0.667     0.500
x ≤ 3.5     0.5     0.75     -0.5    0.75       0.143          0.143          0.000        0.1429        -0.286     0.286
x ≤ 4.5     1.0     1.00     -1.0    0.50       0.500          0.667          0.000        0.5833        -0.500     0.667     <- tied best
x ≤ 5.5     1.5     1.25     -1.5    0.25       0.750          0.222          0.000        0.1556        -0.222     0.400

XGBoost (max_depth 1, eta 1, lambda 1, gamma 0, base_score 0.5), tree dump:
   0:[f0<4.5]  gain=1.1667  cover=1.5        1:leaf=-0.5  cover=1        2:leaf=0.6667  cover=0.5
   the leaf weights match the table exactly; the dump's 'gain' is the bracket without the ½ (1.1667 = 2 × 0.5833); 'cover' is Hⱼ`,
      caption: "Two things to notice. The row with all six points has G = 0 — the prior is exactly right on average — so the parent term vanishes and the gain is entirely the children's; and the two best splits tie because the gradient pattern is symmetric. Setting γ = 0.6 would forbid every split in this table and the round would add nothing: that is the pruning built into the gain."
    },

    { t: "dl", items: [
      ["λ (reg_lambda)", "L2 on leaf weights, in the gain's denominators: shrinks every leaf toward zero, most for leaves with small Hessian sums (few or already-confident rows). Default 1 in XGBoost."],
      ["γ (gamma / min_split_gain)", "Minimum gain to make a split; subtracted from every gain. A complexity penalty per leaf."],
      ["min_child_weight", "Minimum Hessian sum in a leaf. For log-loss h = p(1 − p), so it is roughly a minimum count of *uncertain* rows; for squared loss h = 1 and it is a minimum row count."],
      ["Histogram binning", "Bucket each feature into ≤ 255 bins once; find splits over bin boundaries instead of every distinct value. Cost per split O(bins) instead of O(n); max_bin 15 vs 255 made no measurable difference below."],
      ["Leaf-wise growth", "Split the leaf with the largest gain anywhere in the tree, rather than every leaf at the current depth. Fewer leaves for the same loss; deeper, unbalanced trees; bound it with num_leaves and min_child_samples."],
      ["GOSS", "Gradient-based one-side sampling: keep the rows with large gradients, subsample the small-gradient ones and up-weight them. Fewer rows per split without biasing the gain."],
      ["EFB", "Exclusive feature bundling: sparse features that are never non-zero together (one-hot columns) are merged into one histogram."],
      ["Symmetric (oblivious) trees", "CatBoost's default: the same split condition at every node of a level, so a tree is a lookup table indexed by d binary tests. Heavily regularised and extremely fast to evaluate (0.02 s for 50,000 rows below)."],
      ["Ordered target statistics", "Encode a category for row i using only rows *before* it in a random permutation, with a smoothing prior. No row sees its own label."]
    ]},

    { t: "h2", n: "02", text: "What each library adds", id: "libraries" },

    { t: "viz",
      title: "Depth-wise versus leaf-wise growth with a budget of four leaves (illustrative gain values)",
      caption: "The gains on the diagram are illustrative numbers. Depth-wise (XGBoost's default, HistGradientBoosting with max_depth) splits every node at each level: balanced, depth 2. Leaf-wise (LightGBM's default) always splits the leaf with the highest gain: here the right branch twice, depth 3, and the same four leaves capture more loss. On 200,000 rows a 16-leaf leaf-wise first tree reached depth 7 and scored 0.9565 against the depth-4 tree's 0.9509 after 100 rounds.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two small trees side by side. Left: a balanced depth-two tree with four leaves labelled depth-wise. Right: a tree that splits its root, then the right child, then that child's right child, giving four leaves at depth three, labelled leaf-wise. Gain values annotate each split.">
  <g style="stroke:var(--line)" stroke-width="1.4" fill="none">
    <line x1="220" y1="70" x2="130" y2="140"/><line x1="220" y1="70" x2="310" y2="140"/>
    <line x1="130" y1="170" x2="80" y2="230"/><line x1="130" y1="170" x2="180" y2="230"/>
    <line x1="310" y1="170" x2="260" y2="230"/><line x1="310" y1="170" x2="360" y2="230"/>
    <line x1="640" y1="70" x2="560" y2="130"/><line x1="640" y1="70" x2="720" y2="130"/>
    <line x1="720" y1="160" x2="660" y2="200"/><line x1="720" y1="160" x2="780" y2="200"/>
    <line x1="780" y1="230" x2="740" y2="270"/><line x1="780" y1="230" x2="820" y2="270"/>
  </g>
  <g style="fill:var(--surface-2);stroke:var(--border)">
    <rect x="180" y="50" width="80" height="24" rx="5"/><rect x="90" y="140" width="80" height="24" rx="5"/><rect x="270" y="140" width="80" height="24" rx="5"/>
    <rect x="600" y="50" width="80" height="24" rx="5"/><rect x="680" y="130" width="80" height="24" rx="5"/><rect x="740" y="200" width="80" height="24" rx="5"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="220" y="66">gain 40</text><text x="130" y="156">gain 5</text><text x="310" y="156">gain 25</text>
    <text x="640" y="66">gain 40</text><text x="720" y="146">gain 25</text><text x="780" y="216">gain 12</text>
  </g>
  <g style="fill:var(--accent)">
    <circle cx="80" cy="238" r="7"/><circle cx="180" cy="238" r="7"/><circle cx="260" cy="238" r="7"/><circle cx="360" cy="238" r="7"/>
    <circle cx="560" cy="138" r="7"/><circle cx="660" cy="208" r="7"/><circle cx="740" cy="278" r="7"/><circle cx="820" cy="278" r="7"/>
  </g>
  <g class="s-label" style="font-weight:600">
    <text x="60" y="34">depth-wise: 4 leaves, depth 2, total gain 70</text>
    <text x="500" y="34">leaf-wise: 4 leaves, depth 3, total gain 77</text>
  </g>
  <text x="60" y="284" class="s-sub">every node at a level is split, including the one worth 5</text>
</svg>`
    },

    { t: "table",
      head: ["", "XGBoost", "LightGBM", "CatBoost", "HistGradientBoosting (scikit-learn)"],
      rows: [
        ["Core idea", "Regularised second-order gain; sparsity-aware splits; a learned default direction for missing values", "Histogram + leaf-wise growth; GOSS and EFB for speed on large, sparse data", "Ordered boosting and ordered target statistics; symmetric trees; strong defaults", "Histogram, depth-wise, native NaN and categoricals; no dependency"],
        ["Tree growth", "Depth-wise (default); leaf-wise available", "Leaf-wise (num_leaves is the dial)", "Symmetric (oblivious) by default", "Depth-wise, or max_leaf_nodes"],
        ["Categoricals", "enable_categorical with pandas category (partition-based)", "Native, partition-based; ≤ a few hundred levels", "Native, any cardinality, via ordered statistics + combinations", "Native, ≤ 255 levels per feature"],
        ["Missing values", "Default direction per split", "Default direction per split", "Treated as a category / minimum", "Default direction per split"],
        ["Speed (200k × 30, 300 rounds)", "4.2 s fit / 0.11 s predict", "3.4 s / 0.28 s", "8.4 s / 0.02 s", "4.3 s / 0.38 s"],
        ["Where it shines", "The robust general default; GPU; ranking objectives", "Very large n or p; sparse; speed", "Categorical-heavy data; small data; out-of-the-box quality", "No install; sklearn pipelines and CV"],
        ["Watch out", "Defaults overfit small data (0.647 below)", "Leaf-wise overfits small data; num_leaves vs max_depth", "Slow to fit (115 s at 1,000 iterations on 989 rows)", "Fewer knobs; 255-level categorical limit"]
      ]
    },

    { t: "code", lang: "python", title: "The churn data, 989 rows with three categoricals passed natively (executed, 5-fold)",
      hl: [2, 5, 6, 8, 10, 11],
      code: `#                                                    AUC      log-loss    time
#   logistic regression (one-hot, median impute)     0.7411    0.3953      0.0 s     <- the additive truth again
#   HistGB, one-hot, ν .05, depth 3, early stop      0.7109    0.4066      0.2 s
#   HistGB, native categoricals, same                0.7069    0.4086      0.3 s
#   XGBoost defaults (100 rounds, ν 0.3, depth 6)    0.6467    0.6335      0.3 s     <- badly overfitted: the defaults are sized for thousands of rows
#   XGBoost ν .05, depth 3, 300, subsample .8        0.6776    0.4523      0.5 s
#   LightGBM defaults (31 leaves, ν 0.1)             0.6760    0.5524      1.3 s
#   LightGBM ν .05, 15 leaves, min_child 20          0.6765    0.5160      0.4 s
#   CatBoost defaults (1,000 iterations)             0.7300    0.4030    115.1 s     <- the best boosted model, untouched; and the slowest by 200×
#   CatBoost ν .05, depth 4, 300                     0.7307    0.4042     25.7 s

# XGBoost with the regularisers in the gain (ν .05, depth 3, 300):
#   none                                        0.6776 / 0.4523
#   reg_lambda 10                               0.7052 / 0.4195      <- λ alone recovers most of the gap
#   gamma 1.0                                   0.6890 / 0.4355
#   min_child_weight 10                         0.6968 / 0.4246
#   λ 10, γ 0.5, min_child_weight 5             0.7074 / 0.4164
#   booster="dart", rate_drop 0.1               0.7226 / 0.4004      <- dropout on trees: the strongest XGBoost here`,
      caption: "Small data is where the libraries' defaults are dangerous: XGBoost's 100 rounds at ν = 0.3 and depth 6 reach a log-loss of 0.63 — worse than predicting the base rate — because the gain formula finds structure in noise when every leaf can hold a handful of rows. The regularisers are the cure and they behave as the formula predicts: λ shrinks small-Hessian leaves, min_child_weight forbids them, γ prices them. CatBoost's defaults (symmetric trees, a small automatic learning rate, ordered boosting) are conservative by design, which is why it wins untouched here and pays with time. And logistic regression still wins, as it has since 4.5: boosting has no bias to remove from an additive logit."
    },

    { t: "code", lang: "python", title: "Where the engineering shows: 200,000 rows × 30 features, 300 rounds, 4 threads (executed)",
      hl: [2, 3, 4, 5, 6],
      code: `#                        fit         predict (50,000 rows)     test AUC
#   HistGB (sklearn)       4.3 s        0.38 s                   0.9673
#   XGBoost hist           4.2 s        0.11 s                   0.9685
#   LightGBM               3.4 s        0.28 s                   0.9688
#   CatBoost               8.4 s        0.02 s                   0.9682      <- symmetric trees: prediction is a table lookup
#   random forest, 100     33.9 s       0.34 s                   0.9675      <- 8-10× slower to fit, and not better

# leaf-wise vs depth-wise (LightGBM, 100 rounds):
#   max_depth 4 (16 leaves)                   first tree 16 leaves, depth 4      AUC 0.9509
#   num_leaves 16, no depth cap               first tree 16 leaves, depth 7      AUC 0.9565      <- same leaf budget, spent where the gain is
#   num_leaves 64                             first tree 64 leaves, depth 10     AUC 0.9675
#   num_leaves 255 with max_depth 4           first tree 16 leaves, depth 4      AUC 0.9509      <- the depth cap silently wins; num_leaves was decorative
# histogram bins (LightGBM, 100 rounds):  max_bin 15 -> 0.9639 in 1.3 s;  63 -> 0.9640;  255 -> 0.9639 in 1.5 s`,
      caption: "At this size the four boosters are within 0.002 AUC of each other and the interesting numbers are the times: histogram binning makes a boosting round cost O(bins × features) rather than O(n × features), which is why 300 rounds on 200,000 rows take four seconds. The leaf-wise rows show why LightGBM's `num_leaves` and not `max_depth` is its capacity dial, and the last row is the classic misconfiguration: set both and the smaller binds."
    },

    { t: "h2", n: "03", text: "Categoricals without leakage", id: "categoricals" },

    { t: "code", lang: "python", title: "A 500-level categorical with NO relationship to the target, alongside one real feature (executed; 5,000 rows)",
      hl: [2, 3, 5, 6],
      code: `# truth: logit = 0.8 x₁; 'city' is 500 random labels
#   naive target encoding (per-city mean of y, fitted on train and applied to train)    train AUC 0.8185   test AUC 0.6146
#   x₁ alone (the model with no city column at all)                                                         test AUC 0.6752
#   CatBoost, city as cat_features (ordered target statistics)                            train AUC 0.6942   test AUC 0.6864
#   scikit-learn TargetEncoder (cross-fitted, 5 folds) + LightGBM                         train AUC 0.7771   test AUC 0.6766
#   LightGBM native categorical (500 levels, partition splits)                            train AUC 0.7741   test AUC 0.6729
# the naive encoding did not just fail to help: it made the model WORSE than having no city column, because each city's encoding
# contains its own rows' labels, and a booster reads that as the strongest feature in the data`,
      caption: "With ten rows per city, a city's mean label is mostly its own rows' labels, so the encoded column is a noisy copy of the target: the booster learns to read it (training AUC 0.82), and at test time it is noise (0.61, below the no-city model). This is the leak of 3.2 in its most common modern form. Every fix works by making sure a row's encoding never contains its own label — cross-fitting in scikit-learn's `TargetEncoder`, ordered statistics in CatBoost — and native partition splits sidestep encoding entirely at the cost of a per-split search over subsets of levels."
    },

    { t: "code", lang: "text", title: "Ordered target statistics by hand (executed): category A appears at rows 1, 4, 7 with labels 1, 0, 1; prior p = 0.5, weight a = 1",
      code: `TS(row i) = ( Σ_{j < i, same category} yⱼ  +  a·p ) / ( count_{j < i, same category}  +  a )        rows taken in a random permutation

row 1:  no earlier A rows        ->  (0 + 0.5) / (0 + 1) = 0.500      (pure prior)
row 4:  earlier labels [1]       ->  (1 + 0.5) / (1 + 1) = 0.750
row 7:  earlier labels [1, 0]    ->  (1 + 0.5) / (2 + 1) = 0.500
naive full-data mean for A: (1 + 0 + 1)/3 = 0.667 for every row -- including the row's own label in its own feature

CatBoost uses several permutations and, in ordered boosting, also estimates each row's GRADIENT from a model trained on earlier rows only:
   'prediction shift' -- computing the residual of a row with a model that has already seen that row's label -- is the same leak one level up.
at prediction time every training row is 'earlier', so the encoding is the full smoothed mean.`,
      caption: "The permutation order is arbitrary and the early rows get noisy encodings, which is why CatBoost averages over several permutations; the price is variance, the reward is that no row's feature carries its own label. The same principle — a row's derived feature or gradient must come from a model that has not seen that row — is the idea behind cross-fitting throughout 3.5 and 6.5."
    },

    { t: "callout", kind: "production", title: "Choosing among them", body: [
      { t: "p", text: "**Under ~10,000 rows**: start with HistGradientBoosting or CatBoost with a small learning rate, shallow trees and early stopping, and turn the regularisers on (λ ≥ 1, min_child_weight ≥ 5) — and benchmark against a linear model, which won here. **Large numeric data**: LightGBM or XGBoost hist; tune `num_leaves` (LightGBM) or `max_depth` (XGBoost), `learning_rate` with early stopping, then `min_child_samples`, row and column subsampling, λ. **Many or high-cardinality categoricals**: CatBoost natively, or HistGB/XGBoost with cross-fitted target encoding (3.2), never naive encoding. **Prediction latency**: CatBoost's symmetric trees (0.02 s here) or a compiled model. **Missing values**: all four route them natively; drop the imputer. **Always**: the loss matched to the metric, early stopping on a slice that respects time if the data are temporal, and the found iteration count re-fitted on all rows." }
    ]},

    { t: "ladder",
      title: "A click model on 5 million rows with 200 features including 'merchant id' (40,000 levels)",
      rungs: [
        { level: "bad", label: "One-hot everything, XGBoost defaults", code: `pd.get_dummies(df).pipe(lambda X: xgb.XGBClassifier().fit(X, y))         # 40,000 merchant columns; ν 0.3, depth 6, 100 rounds`,
          note: "**A 40,000-column matrix that EFB would have bundled, defaults sized for another problem, and no validation** — it may finish, and its AUC is whatever the noise says." },
        { level: "ok", label: "LightGBM, native categoricals, early stopping", code: `lgb.LGBMClassifier(learning_rate=0.05, num_leaves=127, n_estimators=5000, min_child_samples=200, subsample=0.8, subsample_freq=1, colsample_bytree=0.7).fit(X, y, eval_set=[(Xv, yv)], callbacks=[lgb.early_stopping(100)])   # merchant as category dtype`,
          note: "**Fast, leakage-free on the merchant column, and stopped by the data.** Native partition splits on 40,000 levels are expensive per split and can overfit rare merchants; `cat_smooth` and `min_data_per_group` need setting." },
        { level: "best", label: "Cross-fitted target statistics for the huge column, native for the small ones, time-ordered validation, calibration", code: `merchant_te = TargetEncoder(cv=5, smooth="auto")      # 40,000 levels -> one column, no row sees its own label; fit inside the pipeline
# small categoricals native; merchant as its smoothed statistic (+ its frequency as a second column)
# early stopping on the LAST week; refit at the found count on all weeks; isotonic calibration on the last week's out-of-fold scores (2.5)
# log: iteration count, feature importances by gain and by permutation, and the merchant-level AUC on rare merchants`,
          note: "**The high-cardinality column handled the CatBoost way inside any library, validation that mirrors deployment, and the rare-level behaviour measured rather than assumed.**" }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A gain by hand with γ and λ, a leaf weight with min_child_weight, and a leak you must reproduce",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Using the six-row table (g = [0.5, 0.5, −0.5, 0.5, −0.5, −0.5], h = 0.25 each), recompute the gain of x ≤ 2.5 with λ = 0 and with λ = 5, and state the largest γ at which that split is still made under λ = 1. **(b)** Under λ = 1, what is the leaf weight of a leaf holding rows {1, 2} (both g = 0.5)? If min_child_weight were 1.0, could that leaf exist? What would the two rows' probabilities become after one round with eta = 1? **(c)** Reproduce the target-encoding leak with 2,000 rows, a 200-level random categorical and one real feature; report train and test AUC for naive encoding, for `TargetEncoder(cv=5)`, and for no categorical at all; then add 5 % genuine signal to the categorical (a per-level offset) and report which encoder now recovers it." }
      ],
      requirements: [
        "(a) three gains and the γ threshold.",
        "(b) the leaf weight, the min_child_weight verdict, and the two probabilities.",
        "(c) six AUCs and the signal-recovery comparison."
      ],
      hint: "(a) Gain = ½[G_L²/(H_L + λ) + G_R²/(H_R + λ) − G²/(H + λ)] − γ; G = 0 for the whole set. (b) w = −G/(H + λ); the new logit is 0 + w; H for two rows is 0.5. (c) A per-level offset of N(0, 0.5) added to the logit gives the categorical real signal.",
      solution: {
        lang: "python",
        title: "boosted_libraries_practice.py",
        code: `# (a) x <= 2.5:  G_L = 1.0, H_L = 0.5;  G_R = -1.0, H_R = 1.0;  G = 0
#   λ = 0:  ½ [ 1/0.5 + 1/1.0 - 0 ] = ½ [2 + 1] = 1.500
#   λ = 1:  ½ [ 1/1.5 + 1/2.0 ] = ½ [0.667 + 0.500] = 0.5833           (the lesson's table)
#   λ = 5:  ½ [ 1/5.5 + 1/6.0 ] = ½ [0.182 + 0.167] = 0.1742           λ shrinks the gain of every small-Hessian split
#   under λ = 1 the split is made while Gain - γ > 0, i.e. γ < 0.5833; XGBoost's dump reports 2 × that (1.1667) so compare γ with the ½-scaled value

# (b) leaf {1, 2}: G = 1.0, H = 0.5;  w = -1.0 / (0.5 + 1) = -0.667  (the lesson's w_L for x <= 2.5)
#   min_child_weight 1.0: the leaf's Hessian sum is 0.5 < 1.0, so the leaf is NOT allowed -- the split x <= 2.5 cannot be made.
#   (with h = p(1-p) ≤ 0.25 per row, min_child_weight 1.0 means 'at least four maximally uncertain rows'; for squared loss h = 1 and it means four rows)
#   probabilities after one round with eta 1: logit 0 + (-0.667) = -0.667 -> p = σ(-0.667) = 0.339 for both rows (labels 0, 0: moved the right way)

# (c) executed: 2,000 rows, 200 levels (10 rows per level), LightGBM (200 rounds, ν .05, 15 leaves) unless stated
#                              no signal in city          city carries a per-level offset N(0, 0.5)
#                              train     test             train     test
#   no categorical            0.768     0.716            0.752     0.662
#   naive target encoding     0.874     0.647            0.870     0.665      <- leak: train up, test below the no-city model
#   TargetEncoder(cv=5)       0.848     0.680            0.843     0.644      <- leak-free, but 200 noisy out-of-fold means are still a
#                                                                                200-level noise feature that a booster overfits
#   CatBoost ordered TS       0.745     0.724            0.744     0.670      <- several permutations + a prior: the only encoder that
#                                                                                did no harm without signal and recovered a little with it
#   with ten rows per level a 0.5-sd offset is too faint for any encoder to find cleanly; the ranking of the encoders is the finding.
#   cross-fitting removes the leak; it does not remove the noise -- smooth toward the prior and require a minimum count per level.`,
        notes: [
          { t: "p", text: "**(a)** is the gain formula as a regulariser dial: λ acts on the denominators, γ on the threshold, and both act hardest on splits over few or confident rows." },
          { t: "p", text: "**(b)** explains why min_child_weight is in Hessian units: for log-loss it counts *uncertainty*, so a leaf full of confidently-classified rows is closed to further splitting even if it holds many rows." },
          { t: "p", text: "**(c)** is the experiment to run before ever target-encoding a column: if the encoded noise column improves training AUC, the encoding is leaking — and even a leak-free encoding of a sparse column is a noisy feature that needs smoothing." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "XGBoost's defaults scored AUC 0.647 and log-loss 0.63 on 989 rows — worse than predicting the base rate. What happened, and which parameters fix it?",
          options: [
            "The categoricals were not one-hot encoded",
            "100 rounds at ν = 0.3 with depth-6 trees is far too much capacity for 989 rows: the gain formula finds 'structure' in noise when leaves hold a few rows, and confident wrong probabilities blow up the log-loss. The regularisers in the gain fix it — λ = 10 alone took it to 0.705, λ + γ + min_child_weight to 0.707 — together with a smaller rate, shallower trees and early stopping",
            "XGBoost cannot handle missing values",
            "The random seed"
          ],
          answer: 1,
          why: "The defaults are sized for tens of thousands of rows. CatBoost's conservative defaults scored 0.730 untouched."
        }
      ]
    }
  ],

  takeaways: [
    "**Second-order boosting**: expand the loss to second order, group by leaf, and every leaf weight is wⱼ = −Gⱼ/(Hⱼ + λ) and every split has a closed-form gain ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) − G²/(H+λ)] − γ. Checked against XGBoost's dump to the digit.",
    "**The regularisers live in the formula**: λ in the denominators, γ as a gain threshold, min_child_weight as a Hessian floor (uncertainty, not rows, for log-loss).",
    "**Histogram binning** makes a round O(bins × p): 300 rounds on 200,000 × 30 in 3.4–4.3 s; max_bin 15 vs 255 changed nothing here.",
    "**Leaf-wise growth** spends the leaf budget where the gain is (16 leaves at depth 7: 0.9565 vs depth-wise 0.9509); `num_leaves` is LightGBM's dial and a `max_depth` cap silently overrides it.",
    "**GOSS and EFB** are LightGBM's row and column economies for large sparse data; **symmetric trees** are CatBoost's regulariser and its 0.02 s predictions.",
    "**On small data the defaults overfit**: XGBoost 0.647, LightGBM 0.676; regularised 0.707; DART 0.723; CatBoost's conservative defaults 0.730; logistic regression 0.741 on the additive truth.",
    "**At 200,000 rows the four boosters tie within 0.002** and a forest is 8–10× slower to fit for no gain.",
    "**Naive target encoding leaks**: a 500-level noise column reached training AUC 0.82 and made the test AUC *worse* than no column; cross-fitted encoding and CatBoost's ordered statistics remove the row's own label.",
    "**Ordered TS by hand**: prior 0.500 → 0.750 → 0.500 as earlier same-category rows accumulate; ordered boosting applies the same idea to gradients.",
    "**Choose by data shape**: small → HistGB/CatBoost regularised (and a linear baseline); large numeric → LightGBM/XGBoost; categorical-heavy → CatBoost or cross-fitted encoding; latency → symmetric trees."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Derive the optimal leaf weight in XGBoost and say what λ does to it.",
        options: [
          "w = mean of the residuals in the leaf",
          "Second-order expansion of the loss gives, per leaf, Gⱼw + ½(Hⱼ + λ)w² where G and H are the leaf's gradient and Hessian sums; minimising in w gives w* = −Gⱼ/(Hⱼ + λ). With λ = 0 it is the Newton step; λ > 0 shrinks it, most for leaves with small Hessian sums — few rows, or rows the model is already sure about",
          "w = −G/H, independent of λ",
          "w is chosen by line search"
        ],
        answer: 1,
        why: "For the six-row example, rows {1, 2} have G = 1.0, H = 0.5 and w = −1/1.5 = −0.667, matching the dump."
      },
      {
        stem: "What is the difference between leaf-wise and depth-wise growth, and how should LightGBM's capacity be controlled?",
        options: [
          "They are the same with different names",
          "Depth-wise splits every node at each level (balanced trees, depth = the dial); leaf-wise splits whichever leaf has the highest gain anywhere (fewer leaves for the same loss, deeper unbalanced trees — 16 leaves reached depth 7). LightGBM's dial is therefore `num_leaves`, bounded with `min_child_samples`; a `max_depth` cap overrides `num_leaves` silently (255 leaves with depth 4 gave 16 leaves)",
          "Leaf-wise is always better",
          "Depth-wise trees are deeper"
        ],
        answer: 1,
        why: "Leaf-wise on small data chases a few high-loss points — regularise with num_leaves and min_child_samples."
      },
      {
        stem: "Why does naive target encoding of a high-cardinality column hurt, and what are the two standard fixes?",
        options: [
          "It creates too many columns",
          "Each level's mean label includes the row's own label, so the encoded column is a noisy copy of the target: the booster reads it as the strongest feature (training AUC 0.82 on pure noise) and at test time it is noise (0.61, worse than no column). Fixes: cross-fitting (each row encoded by other folds' rows — `TargetEncoder(cv=)`) or CatBoost's ordered statistics (encode from earlier rows in a permutation, with a smoothing prior)",
          "It ignores rare levels",
          "It only works for binary targets"
        ],
        answer: 1,
        why: "The rule: a row's derived feature must never contain its own label. Ordered boosting applies it to the gradients too."
      },
      {
        stem: "Why can CatBoost predict 50,000 rows in 0.02 s when XGBoost takes 0.11 s and HistGB 0.38 s for the same number of trees?",
        options: [
          "CatBoost uses fewer trees",
          "Its trees are symmetric: every node at a level tests the same feature and threshold, so a depth-d tree is a lookup table indexed by d binary tests, evaluated with a handful of vectorised comparisons rather than a per-row path through the tree. The same constraint acts as a strong regulariser, which is part of why its defaults are hard to overfit",
          "It compiles to C",
          "It caches predictions"
        ],
        answer: 1,
        why: "Symmetric trees are weaker individually; CatBoost compensates with more iterations and ordered boosting."
      },
      {
        stem: "You have 3,000 rows, 12 features, two of them categorical. Which booster and settings, and what do you compare against?",
        options: [
          "XGBoost defaults; nothing to compare",
          "A conservative configuration: HistGradientBoosting or CatBoost with learning rate 0.03–0.05, depth 2–3, λ ≥ 1, min_child_weight/min_samples_leaf ≥ 5–20, early stopping by CV; native categoricals. Compare against a regularised logistic regression and a random forest — on 989 rows the libraries' defaults lost to logistic regression (0.647–0.676 vs 0.741) and only the regularised or CatBoost fits came close",
          "LightGBM with num_leaves 255",
          "A random forest; boosting is only for big data"
        ],
        answer: 1,
        why: "Boosting's edge is bias reduction through interactions; on small additive data there is little to remove and much noise to fit."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What makes XGBoost different from plain gradient boosting?",
        strong: "Three things, all visible in one formula. It expands the loss to second order, so each tree is fitted with both the gradient g and the Hessian h of every row, and the optimal leaf weight is −G/(H + λ) — a Newton step, shrunk by an L2 penalty λ on leaf weights. It puts the regularisation into the split criterion: the gain of a split is ½ times the sum of the children's G²/(H + λ) minus the parent's, minus a penalty γ per leaf, so a split is only made if it beats γ, which is pruning built in; and min_child_weight floors the Hessian sum in a leaf, which for log-loss is a floor on uncertainty rather than on row count. And the engineering: sparsity-aware split finding with a learned default direction for missing values, histogram binning, column blocks for parallel split search, GPU support. On six rows I computed the gain table by hand and the leaf weights matched the tree dump to the digit — the dump's gain is twice mine because it omits the ½. The practical consequence is that its regularisers behave predictably: on a 989-row problem where the defaults badly overfit, λ = 10 alone recovered most of the loss.",
        answer: [
          { t: "p", text: "Second-order leaf weight, regularised gain with γ and min_child_weight, engineering, and the executed check." }
        ]
      },
      {
        level: "core",
        q: "XGBoost vs LightGBM vs CatBoost — how do you choose?",
        strong: "At scale on numeric data they are within a few thousandths of each other — on 200,000 rows all four boosters, scikit-learn's included, scored 0.967–0.969 — so the choice is about data shape, speed and defaults. LightGBM is the fastest to fit (3.4 s against 4.2 for XGBoost and 8.4 for CatBoost there) because of histogram binning, leaf-wise growth, and GOSS and EFB for large sparse data; its capacity dial is num_leaves, bounded by min_child_samples, and a max_depth cap overrides it silently. XGBoost is the robust general default with the widest objective and platform support; depth-wise by default, and its defaults are sized for large data — they scored 0.647 on 989 rows. CatBoost wins on categorical-heavy data through ordered target statistics that never let a row's own label into its encoding, has the most conservative defaults (0.730 untouched on the same 989 rows, the best boosted result), and predicts fastest by far because its trees are symmetric — 0.02 s — but it is the slowest to fit. HistGradientBoosting is the no-dependency option for pipelines. So: small data or many categoricals, CatBoost or a regularised HistGB, benchmarked against a linear model; large numeric data, LightGBM; when in doubt, XGBoost; and in every case a small learning rate, early stopping, and the regularisers turned on.",
        answer: [
          { t: "p", text: "Parity at scale with numbers, each library's mechanism and failure mode, and a decision rule by data shape." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague target-encodes a 40,000-level merchant id, fits LightGBM, and reports a 0.95 validation AUC where the previous model had 0.80. What do you check?",
        strong: "Whether the validation rows' encodings were computed with their own labels. Target encoding replaces each merchant with its mean click rate, and if that mean is computed on all the data — or on the training data and then the model is validated on rows that contributed to those means — every row's encoding contains a piece of its own label. With many small merchants the encoded column is nearly a copy of the target and the booster will find it: in my experiment a 500-level column with zero real signal reached a training AUC of 0.82 under naive encoding and a test AUC below the model with no such column at all. So I would ask for the split order — encoding fitted strictly on the training fold, validation rows encoded from training statistics only — and for a check on a shuffled target, where a leak-free pipeline scores 0.5. Then I would fix the encoding properly: cross-fit it so each training row is encoded by the other folds (scikit-learn's TargetEncoder with cv), or use CatBoost's ordered statistics, and smooth rare merchants toward the prior. I would expect the honest AUC to land near the old model's plus whatever real merchant effect exists, and I would report the rare-merchant slice separately, because that is where a target statistic is mostly prior.",
        answer: [
          { t: "p", text: "The leak diagnosed, the executed evidence, the two tests, and the two fixes with the rare-level caveat." }
        ]
      }
    ]
  }
});

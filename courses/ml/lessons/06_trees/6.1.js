/* ============================================================================
   LESSON 6.1 — Decision Trees
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**A decision tree asks one question about one feature at a time, and each answer narrows the data until a leaf makes a prediction.** The whole method is in how the question is chosen: the split that makes the children purest, measured by entropy, Gini or variance, computed greedily at every node. This lesson works those numbers by hand on six rows (information gain 0.459 for Wind against 0.082 for Outlook, and the same choice by gain ratio and Gini), then grows trees on the churn data and watches the one failure trees are famous for: an unpruned tree scores AUC 1.000 in training and 0.520 in cross-validation, its root split changes in six of ten bootstrap resamples, and two trees grown on two resamples disagree on 16 % of rows. Pruning fixes the first; only averaging (6.2) fixes the rest. The lesson ends with the geometry — the staircase a tree draws around a diagonal, the XOR its greedy root cannot see — and the two things trees do that nothing in modules 4 and 5 could: find a kinked, multiplicative surface with no formula (spend MAE 7.90 against linear 20.94), and ignore scale entirely.",

  objectives: [
    "Compute entropy, information gain, gain ratio and Gini impurity for a candidate split by hand, and variance reduction for a regression split",
    "Distinguish ID3, C4.5 and CART, and explain how continuous thresholds, missing values and pruning are handled",
    "Read depth, min_samples_leaf and ccp_alpha as capacity dials, and diagnose overfitting and instability from the numbers",
    "Know the geometry of axis-aligned splits — staircases, XOR, no extrapolation — and where trees beat linear and distance models"
  ],

  prerequisites: ["1.3", "2.2", "3.2"],

  blocks: [

    { t: "h2", n: "01", text: "Choosing a split: three impurities, one dataset", id: "split" },

    { t: "code", lang: "text", title: "Six rows — predict Play from Outlook and Wind (executed)",
      code: `#   Outlook   Wind     Play              parent: 3 Yes / 3 No
1   Sunny     Weak     No                entropy  H = -0.5 log₂ 0.5 - 0.5 log₂ 0.5 = 1.000 bit
2   Sunny     Strong   No                Gini     G = 1 - (0.5² + 0.5²) = 0.500
3   Sunny     Weak     Yes
4   Rain      Weak     Yes               impurity decrease of a split:  ΔI = I(parent) - Σₖ (nₖ/n) I(childₖ)
5   Rain      Strong   No
6   Rain      Weak     Yes

SPLIT ON WIND
   Weak   {1,3,4,6} = No,Yes,Yes,Yes = 3Y/1N     H = -0.75 log₂ 0.75 - 0.25 log₂ 0.25 = 0.811     G = 1 - (0.75² + 0.25²) = 0.375
   Strong {2,5}     = No,No           = 0Y/2N     H = 0                                          G = 0
   weighted child entropy = (4/6)(0.811) + (2/6)(0)   = 0.541      ->  information gain  IG = 1.000 - 0.541 = 0.459
   weighted child Gini    = (4/6)(0.375) + (2/6)(0)   = 0.250      ->  Gini decrease         = 0.500 - 0.250 = 0.250
   split information = -(4/6) log₂(4/6) - (2/6) log₂(2/6) = 0.918   ->  gain ratio = 0.459 / 0.918 = 0.500

SPLIT ON OUTLOOK
   Sunny {1,2,3} = 1Y/2N   H = 0.918   G = 0.444          Rain {4,5,6} = 2Y/1N   H = 0.918   G = 0.444
   weighted child entropy = 0.918   ->  IG = 0.082          Gini decrease = 0.500 - 0.444 = 0.056
   split information = 1.000        ->  gain ratio = 0.082

every criterion picks WIND. Then recurse into the Weak branch with rows {1,3,4,6}; Strong is pure and becomes a leaf.`,
      caption: "Entropy measures surprise in bits; Gini measures the chance that two random draws from the node disagree. They rank splits almost identically (their curves in p are both symmetric bumps peaking at p = 0.5), Gini is cheaper because it has no logarithm, and scikit-learn defaults to it. The recursion is greedy: the best split now, never the best tree — finding that is NP-hard — which is the root cause of every instability in section 03."
    },

    { t: "code", lang: "text", title: "A regression split: variance reduction (executed)",
      code: `Hours = [1, 2, 3, 10, 11, 12]        Score = [2, 3, 4, 20, 21, 22]        parent mean 12, SSE = Σ(y - 12)² = 490

candidate thresholds sit between adjacent sorted values:
   split at 1.5:    left {2} mean 2.00, right {3,4,20,21,22} mean 14.00          child SSE 370.0
   split at 2.5:    left {2,3},          right {4,20,21,22}                        child SSE 219.2
   split at 3.5:    left {2,3,4} mean 3, right {20,21,22} mean 21                child SSE 2 + 2 = 4.0       <- 490 -> 4: chosen
   split at 10.5:                                                                 child SSE 219.2
   split at 11.5:                                                                 child SSE 370.0
the leaves predict their means, 3 and 21. Any threshold between 3 and 10 gives the same split; scikit-learn uses the midpoint, 6.5.`,
      caption: "For a continuous target the impurity is the sum of squared deviations from the leaf mean, and a leaf predicts that mean — a regression tree is a piecewise-constant function. For continuous *features* the same sort-and-scan finds the threshold: O(n log n) per feature per node, testing every gap between adjacent values."
    },

    { t: "table",
      head: ["", "ID3", "C4.5", "CART (scikit-learn)"],
      rows: [
        ["Criterion", "Information gain (entropy)", "Gain ratio = IG / split information", "Gini (classification); variance / MSE, MAE, Poisson (regression)"],
        ["Split shape", "One branch per category", "One branch per category; thresholds for continuous", "Always binary: x ≤ t, or category-subset"],
        ["Features", "Categorical only", "Categorical and continuous", "Both (categoricals encoded)"],
        ["Regression", "No", "No", "Yes"],
        ["Missing values", "No", "Fractional instances", "Surrogate splits (classic); native routing to the better child (scikit-learn ≥ 1.3)"],
        ["Pruning", "None", "Pessimistic post-pruning", "Cost-complexity: R(T) + α·leaves, `ccp_alpha`"],
        ["Bias to fix", "Prefers many-valued features (purer children for free)", "Split information penalises it", "Binary splits limit it; MDI importance inherits it"]
      ]
    },

    { t: "dl", items: [
      ["Entropy H", "−Σ pₖ log₂ pₖ: bits of surprise in a node's labels. 1.0 for a 50/50 binary node, 0 for a pure one."],
      ["Gini impurity G", "1 − Σ pₖ²: probability that two random draws from the node differ. 0.5 for 50/50, 0 for pure. Gini and entropy agree on nearly every split."],
      ["Information gain", "Parent impurity minus size-weighted child impurity. The quantity every split maximises; 'gain' with entropy, 'decrease' with Gini."],
      ["Gain ratio", "IG divided by the split's own entropy (split information). C4.5's correction for the free purity that many-valued features buy."],
      ["Leaf value", "Majority class (or class proportions as probabilities) for classification; the mean for regression."],
      ["Pre-pruning", "Stop growing: `max_depth`, `min_samples_leaf`, `min_samples_split`, `min_impurity_decrease`. Cheap, blind to splits that only pay off later."],
      ["Cost-complexity pruning", "Grow fully, then minimise R(T) + α|leaves|: collapse every subtree whose impurity gain per leaf is below α. `cost_complexity_pruning_path` lists the α values at which the tree changes; choose by CV."],
      ["Greedy", "Best split at this node, given the path so far. Globally optimal trees are NP-hard; the price of greed is instability."]
    ]},

    { t: "h2", n: "02", text: "A tree on the churn data: depth, pruning and what it learned", id: "churn" },

    { t: "viz",
      title: "The depth-2 churn tree (executed; 989 rows, 15 % churn)",
      caption: "Each leaf shows its training counts [no churn, churn] and churn rate. The tree found what 4.5's coefficients said: few logins and short tenure churn. Note the eight-row leaf: five splits deeper and leaves like that become single customers.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A binary tree of depth two. Root splits on logins less than or equal to 11.5. Left child splits on tenure less than or equal to 29.5 with leaves of 293 and 313 rows; right child splits on tenure less than or equal to 1.5 with leaves of 8 and 375 rows. Each leaf shows counts and churn rate.">
  <g style="stroke:var(--line)" stroke-width="1.4" fill="none">
    <line x1="440" y1="68" x2="230" y2="132"/><line x1="440" y1="68" x2="650" y2="132"/>
    <line x1="230" y1="168" x2="120" y2="228"/><line x1="230" y1="168" x2="340" y2="228"/>
    <line x1="650" y1="168" x2="540" y2="228"/><line x1="650" y1="168" x2="760" y2="228"/>
  </g>
  <rect x="340" y="30" width="200" height="40" rx="6" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="440" y="55" text-anchor="middle" class="s-label" style="font-weight:600">logins_30d ≤ 11.5</text>
  <rect x="130" y="130" width="200" height="40" rx="6" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="230" y="155" text-anchor="middle" class="s-label" style="font-weight:600">tenure ≤ 29.5</text>
  <rect x="550" y="130" width="200" height="40" rx="6" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="650" y="155" text-anchor="middle" class="s-label" style="font-weight:600">tenure ≤ 1.5</text>
  <g class="s-sub"><text x="300" y="104" text-anchor="middle">yes</text><text x="580" y="104" text-anchor="middle">no</text><text x="150" y="204" text-anchor="middle">yes</text><text x="310" y="204" text-anchor="middle">no</text><text x="570" y="204" text-anchor="middle">yes</text><text x="730" y="204" text-anchor="middle">no</text></g>
  <g>
    <rect x="40" y="228" width="160" height="52" rx="6" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <text x="120" y="250" text-anchor="middle" class="s-mono">[197, 96]</text><text x="120" y="270" text-anchor="middle" class="s-label" style="fill:var(--crit);font-weight:600">33 % churn</text>
    <rect x="260" y="228" width="160" height="52" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <text x="340" y="250" text-anchor="middle" class="s-mono">[274, 39]</text><text x="340" y="270" text-anchor="middle" class="s-label" style="font-weight:600">12 %</text>
    <rect x="460" y="228" width="160" height="52" rx="6" style="fill:var(--warn);fill-opacity:.18;stroke:var(--warn)"/>
    <text x="540" y="250" text-anchor="middle" class="s-mono">[5, 3]</text><text x="540" y="270" text-anchor="middle" class="s-label" style="fill:var(--warn);font-weight:600">38 % — eight rows</text>
    <rect x="680" y="228" width="160" height="52" rx="6" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
    <text x="760" y="250" text-anchor="middle" class="s-mono">[352, 23]</text><text x="760" y="270" text-anchor="middle" class="s-label" style="fill:var(--good);font-weight:600">6 %</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "Depth as the capacity dial (executed, 5-fold; features: five numerics with native NaN in tickets, plan/region/channel dummies)",
      hl: [3, 4, 5, 9, 10, 11],
      code: `DecisionTreeClassifier(max_depth=d, random_state=0)
#   depth    leaves    train AUC    CV AUC     CV log-loss
#     1         2        0.635      0.5905       0.441
#     2         4        0.714      0.6489       0.434
#     3         8        0.760      0.6738       0.459      <- best ranking
#     4        15        0.787      0.6590       0.503
#     6        36        0.848      0.6420       0.646
#     8        78        0.925      0.5845       1.035
#    12       170        0.997      0.5379       1.590
#   none      198        1.000      0.5196       1.796      <- one leaf per five rows; the training set memorised; a coin flip out of sample
# logistic regression on the same columns: CV AUC 0.7411`,
      caption: "The unpruned tree is the cleanest overfitting demonstration in the course: training AUC 1.000, cross-validated 0.520, log-loss 1.80 because leaves of one or two rows emit probabilities of exactly 0 and 1. The best single tree (depth 3, eight leaves) is still 0.07 behind logistic regression, and that is not a tuning failure: the churn logit is additive and smooth, and a tree approximates a smooth additive surface with axis-aligned steps, each of which costs a split and the rows to justify it."
    },

    { t: "code", lang: "python", title: "Post-pruning by cost complexity (executed)",
      hl: [3, 6, 7],
      code: `path = DecisionTreeClassifier(random_state=0).fit(X, y).cost_complexity_pruning_path(X, y)     # 71 distinct alphas from 0.0006 to 0.012
#   ccp_alpha    leaves    depth    CV AUC     log-loss
#   0             198       19      0.5196      1.796      <- the full tree
#   0.001         111       15      0.4975      1.650
#   0.002          16        9      0.5341      0.860
#   0.004           4        3      0.6600      0.433      <- the pruned tree: essentially the depth-2 tree above plus one split
#   0.008           3        2      0.6432      0.431
#   0.016           1        0      0.4968      0.444      <- pruned to the root: predicts the base rate
# R_α(T) = R(T) + α · |leaves|:  a subtree survives only if its impurity reduction per leaf exceeds α`,
      caption: "Pre-pruning (a depth cap) and post-pruning (grow, then collapse) reach similar trees here, but post-pruning is the principled one: a split that looks useless on its own can enable a valuable one below it, and only growing first and cutting back can see that. `ccp_alpha` is one dial on a log scale; choose it by CV exactly as you would C or λ."
    },

    { t: "h2", n: "03", text: "The failure that defines trees: variance", id: "variance" },

    { t: "code", lang: "python", title: "Instability under resampling (executed)",
      code: `# the root split of a depth-3 tree on ten bootstrap resamples of the churn data:
#   logins_30d <= 7.5      4 times
#   tenure_months <= 29.5  2 times
#   logins_30d <= 11.5     2 times
#   monthly_fee <= 8.53    1 time
#   logins_30d <= 13.5     1 time
# two unpruned trees grown on two bootstrap resamples disagree on 15.9 % of the rows' predicted labels`,
      caption: "Resample the data and the tree changes from the root down, because a greedy choice near the top cascades into everything below. That sensitivity to the sample is variance in the exact sense of 1.3, and a single tree has a lot of it: the same feature ranking and the same rows produce different rules and different predictions. It is also why a tree's *explanation* — 'the model splits on logins at 7.5' — is a property of one sample, not of the problem. Averaging over resamples is the cure, and it is the entire idea of 6.2."
    },

    { t: "code", lang: "python", title: "Geometry: what axis-aligned splits can and cannot draw (executed)",
      hl: [2, 5, 6, 10, 11, 13],
      code: `# a diagonal boundary, y = 1 if x₁ > x₂, 1,000 uniform points
#   tree depth 1: 0.774    depth 3: 0.918    depth 6: 0.979 (27 leaves)    unlimited: 0.974 (32 leaves)     logistic regression: 0.993
#   the tree draws a staircase around a straight line and needs 27 leaves to get within 1.4 points of a model with 3 parameters
#   add the rotated feature x₁ - x₂ and a depth-1 tree scores 0.999: one split, because the boundary is now axis-aligned

# XOR: y = 1 if x₁x₂ > 0
#   depth 1: 0.503    depth 2: 0.613    depth 3: 0.892    depth 5: 0.990
#   the best root split has almost no gain: parent Gini 0.499, children 0.500 and 0.436. Every single-feature split of XOR is useless;
#   only the SECOND split, conditioned on the first, sees the pattern. Greedy search cannot see two moves ahead, so depth 2 finds a
#   poor root and depth 3 is needed to recover. Trees find interactions -- but not when the interaction hides every marginal effect.

# extrapolation: regression tree on spend, min_samples_leaf 10
#   prediction at tenure 60 / 80 / 120 (fee 12.99, no discount): 156.2 / 156.2 / 156.2      <- constant beyond the last split; a tree cannot extrapolate`,
      caption: "A tree partitions the feature space into axis-aligned boxes and predicts a constant in each. That is the right shape for thresholds, categories and interactions (the churn tree's 'few logins AND short tenure'), and the wrong shape for anything smooth or diagonal — where the linear model's three parameters beat 27 leaves. Feature engineering that aligns the boundary with an axis (x₁ − x₂, a ratio, a log) does for a tree what a kernel does for an SVM. And a tree never predicts a value it has not seen: beyond the training range its prediction is flat, which is safe (4.4's −6,649 cannot happen) and useless."
    },

    { t: "code", lang: "python", title: "Where a single tree wins: spend, whose truth is a kinked product (executed, 5-fold MAE)",
      hl: [5, 6, 10],
      code: `DecisionTreeRegressor(max_depth=d)                      # tenure, fee, discount
#   depth  2:  MAE 19.93   (4 leaves)             linear regression:   20.94
#   depth  4:       9.67   (16 leaves)            KNN k=3, weighted:    8.81
#   depth  6:       8.28   (58 leaves)            one engineered column: 6.34   (noise floor 6.38)
#   depth  8:       7.90   (159 leaves)           <- better than KNN, with no metric and no scaling
#   depth 12:       9.00   (463 leaves)
#   unlimited:      9.83   (973 leaves)           <- one leaf per row: back to memorising noise
#   min_samples_leaf 5 / 10 / 20 (unlimited depth):  8.33 / 8.76 / 11.02
# gini vs entropy on the churn classifier at depth 4: 0.6590 vs 0.6815 -- usually equivalent; here a different early split. Try both.
# scaling: depth-4 AUC 0.6619 raw, 0.6621 standardised -- thresholds are compared, not distances; scale is irrelevant to a tree`,
      caption: "The spend surface is fee × min(tenure, 12) × (1 − discount): a kink and a product, which a tree carves with a few dozen boxes and no knowledge of the formula, beating both the linear model and KNN. `min_samples_leaf` is the more natural regression dial than depth — it caps how noisy a leaf's mean can be — and either dial, pushed too far, returns to one row per leaf. Two things the tree never needed: feature scaling, and a distance metric."
    },

    { t: "callout", kind: "trap", title: "Impurity importance is not importance", body: [
      { t: "p", text: "Add two useless columns to the churn features — a random integer id with 989 distinct values and a random normal — and grow a full tree. The mean-decrease-in-impurity importances come out **tenure 0.178, random_normal 0.178, random_id 0.175**, fee 0.162, logins 0.159: the noise columns rank with the best real feature. A column with many distinct values offers many candidate thresholds, and among many random thresholds one always looks good on the training rows; deep in the tree, where nodes are tiny, that is all the splits are. Permutation importance on the same model puts logins 0.178, tenure 0.164, and random_normal at 0.032; and the CV AUC with and without the noise columns is 0.674 versus 0.662 — the tree used them to memorise. **Read MDI as 'how much the tree used the feature', never as 'how much the feature matters'**; 6.2 and 9.1 have the honest alternatives." }
    ]},

    { t: "code", lang: "python", title: "Missing values: native routing in scikit-learn ≥ 1.3 (executed, 126 missing tickets)",
      code: `# depth-4 CV AUC with tickets missing for 126 rows:
#   native NaN handling (each split learns which child gets the missing rows)      0.6590
#   median-imputed                                                                0.6619
#   median-imputed + a missing indicator column                                   0.6606
# the three agree to within noise here; native handling avoids a pipeline step and can exploit informative missingness (3.3: MAR by plan)`,
      caption: "Trees are the one model family that can take missing values directly: at each split the rows with NaN are sent to whichever child improves the criterion, which is learned like any other part of the split. Classic CART used surrogate splits — a backup feature that mimics the primary split — which scikit-learn does not implement. Either way, a tree needs no imputer; a pipeline that feeds a tree ensemble can drop that step."
    },

    { t: "ladder",
      title: "A rules-based eligibility model that compliance must be able to read",
      rungs: [
        { level: "bad", label: "Unlimited tree, importances in the report", code: `DecisionTreeClassifier().fit(X, y); tree.feature_importances_`,
          note: "**198 leaves nobody can read, a training AUC of 1.000 that will not survive contact with new data, and importances that rank a random id with tenure.**" },
        { level: "ok", label: "Depth capped by CV, plotted", code: `GridSearchCV(DecisionTreeClassifier(), {"max_depth": [2, 3, 4, 5], "min_samples_leaf": [10, 25, 50]}, cv=5, scoring="roc_auc"); plot_tree(best)`,
          note: "**A readable tree with honest capacity.** Its rules are still one sample's rules — the root moved in six of ten resamples — so the document should not claim they are *the* rules." },
        { level: "best", label: "Pruned tree for the rulebook, an ensemble for the score, and stability reported", code: `path = full.cost_complexity_pruning_path(X, y); best_alpha = cv_over(path.ccp_alphas)      # the rules: a ccp-pruned tree, 4-8 leaves
rf = RandomForestClassifier(500, min_samples_leaf=20).fit(X, y)                              # the score: 6.2
# report: the pruned tree's rules; bootstrap root-split frequencies; permutation importances; the gap between the tree's AUC and the forest's`,
          note: "**Compliance reads a small tree, the product uses a forest, and the report says how much the readable rules cost and how stable they are** — which is the truthful relationship between interpretability and accuracy for trees." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Split the Weak branch, prune by hand, and break a tree with a rotation",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** After the Wind split, the Weak branch holds rows {1, 3, 4, 6} = No, Yes, Yes, Yes. Compute the information gain and Gini decrease of splitting it on Outlook, state the resulting tree and its training accuracy, and say whether C4.5's gain ratio would change the choice. **(b)** For the regression example, compute the cost-complexity value R_α(T) for the one-split tree and the root-only tree at α = 100 and at α = 300 (use SSE as R), and state at which α the split is pruned. **(c)** Generate the diagonal-boundary data and fit trees of depth 1, 3 and 6 on (x₁, x₂), then on (x₁ − x₂, x₁ + x₂); report accuracies and leaf counts, and explain the difference in one sentence about geometry." }
      ],
      requirements: [
        "(a) IG and Gini decrease for the second split, the final tree, and the gain-ratio remark.",
        "(b) four values of R_α and the pruning threshold.",
        "(c) six accuracies with leaf counts and the geometric explanation."
      ],
      hint: "(a) Sunny within Weak is {1, 3} = No, Yes; Rain within Weak is {4, 6} = Yes, Yes. (b) R_α = SSE + α × leaves; the split is worth keeping while the SSE it saves exceeds α per extra leaf. (c) In the rotated coordinates the boundary is x₁ − x₂ = 0: one axis-aligned threshold.",
      solution: {
        lang: "python",
        title: "tree_practice.py",
        code: `# (a) Weak branch: 3 Yes / 1 No, H = 0.811, G = 0.375
#   split on Outlook:  Sunny {1,3} = 1Y/1N -> H = 1.000, G = 0.500     Rain {4,6} = 2Y/0N -> H = 0, G = 0
#   weighted child entropy = (2/4)(1.0) + (2/4)(0) = 0.500   ->  IG = 0.811 - 0.500 = 0.311
#   weighted child Gini    = (2/4)(0.5) + (2/4)(0) = 0.250   ->  Gini decrease = 0.375 - 0.250 = 0.125
#   the tree: Wind=Strong -> No; Wind=Weak & Outlook=Rain -> Yes; Wind=Weak & Outlook=Sunny -> {No, Yes} tie, leaf predicts either
#   training accuracy 5/6 (the Sunny-Weak leaf gets one of its two rows wrong). Gain ratio: Outlook is the only feature left, so the
#   choice is unchanged; split information = 1.0 so the ratio equals the gain (0.311).

# (b) R_α(T) = SSE + α · |leaves|
#   one-split tree: SSE 4, 2 leaves          root only: SSE 490, 1 leaf
#   α = 100:  4 + 200 = 204   vs   490 + 100 = 590   -> keep the split
#   α = 300:  4 + 600 = 604   vs   490 + 300 = 790   -> still keep it
#   the split is pruned when 4 + 2α > 490 + α, i.e. α > 486 -- the split's SSE saving per extra leaf. That 486 is this subtree's
#   'effective alpha', the number cost_complexity_pruning_path reports for it.

# (c) executed pattern (lesson section 03): on (x₁, x₂) depth 1 / 3 / 6 scored 0.774 / 0.918 / 0.979 with 2 / 8 / 27 leaves;
#   on (x₁ - x₂, x₁ + x₂) a depth-1 tree scored 0.999 with 2 leaves, and deeper trees cannot improve on it.
#   geometry: a tree can only cut perpendicular to an axis, so it approximates a diagonal with a staircase of many cuts; rotate the
#   axes so the boundary IS an axis and one cut suffices. The model did not change; the coordinates did.`,
        notes: [
          { t: "p", text: "**(a)** shows the recursion producing an impure leaf: with the features exhausted, the tree stops, and its prediction there is a tie. Real trees stop on depth, leaf size or a pure node — and every stopping rule is a capacity decision." },
          { t: "p", text: "**(b)** is cost-complexity pruning as arithmetic: each subtree has an α at which its saving no longer pays for its leaves, and the pruning path is the sorted list of those α values." },
          { t: "p", text: "**(c)** is the most practical fact about trees: they are not rotation-invariant. Ratios, differences and logs of pairs of features are worth more to a tree than to any other model." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The full churn tree has training AUC 1.000 and cross-validated 0.520. Which number is wrong, and why?",
          options: [
            "The CV number; the folds were too small",
            "Neither is wrong — they measure different things. With 198 leaves for 989 rows the tree has memorised the training labels (leaves of one or two rows), so it reproduces them perfectly and predicts nothing about new rows; the 0.52 is its real skill. Depth 3 (eight leaves) scores 0.674 out of sample",
            "The training number; AUC cannot be 1.0",
            "Both; the tree should be scaled"
          ],
          answer: 1,
          why: "A leaf with one row emits a probability of exactly 0 or 1 — the log-loss of 1.80 is the same fact seen through the probabilities."
        }
      ]
    }
  ],

  takeaways: [
    "**A split is chosen by impurity decrease** — entropy (IG 0.459 for Wind), Gini (0.250) or gain ratio (0.500) — greedily at every node; the best tree overall is NP-hard.",
    "**Regression trees split on variance reduction** (SSE 490 → 4) and predict the leaf mean: a piecewise-constant function.",
    "**ID3 → C4.5 → CART**: entropy/multiway/categorical → gain ratio/continuous/pruning → Gini/binary/regression/cost-complexity, which is what scikit-learn implements.",
    "**Depth is the capacity dial**: train AUC 1.000 vs CV 0.520 unpruned; best at depth 3 (0.674); logistic regression 0.741 on the same additive truth.",
    "**Prune post hoc with ccp_alpha** (4 leaves at α = 0.004, AUC 0.660) — grow first so later splits can justify earlier ones.",
    "**Variance is the tree's defining failure**: the root split changed in 6 of 10 resamples; two resampled trees disagree on 16 % of rows. Averaging (6.2) is the cure.",
    "**Axis-aligned geometry**: a staircase around a diagonal (27 leaves for 0.979 vs logistic 0.993; one rotated feature → 0.999); XOR invisible to the greedy root (depth 2: 0.613); no extrapolation (156.2 forever).",
    "**Where trees win**: kinks, products and interactions with no formula — spend MAE 7.90 at depth 8 against linear 20.94 and KNN 8.81 — with no scaling and native missing values.",
    "**MDI importance is 'how much the tree used it'**: a random id scored 0.175 against tenure's 0.178; use permutation importance.",
    "**A small pruned tree is an explanation of one sample; a forest is a model** — report both and the gap between them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does information gain favour a feature with many distinct values, and how does C4.5 correct it?",
        options: [
          "It does not; all features are treated equally",
          "Splitting into many small children makes each child purer for free — a customer-id column produces 989 pure leaves and maximal gain while predicting nothing. C4.5 divides the gain by the split's own entropy (split information), so a many-way split must earn its purity; CART limits the damage with binary splits but its impurity importances still inherit the bias (random id 0.175)",
          "Because entropy is undefined for continuous features",
          "Because many-valued features are usually informative"
        ],
        answer: 1,
        why: "The same bias appears as many candidate thresholds for a continuous column: among many random thresholds one always looks good on the training rows."
      },
      {
        stem: "What does cost-complexity pruning minimise, and how do you set α?",
        options: [
          "Training error alone",
          "R_α(T) = R(T) + α·|leaves|: the tree's total leaf impurity plus a price per leaf. Each subtree has an α at which its impurity saving stops paying for its leaves (486 for the regression example); the pruning path lists those thresholds, and you pick α by cross-validation — 0.004 gave a four-leaf tree with AUC 0.660 against the full tree's 0.520",
          "The number of leaves alone",
          "The depth of the tree"
        ],
        answer: 1,
        why: "Post-pruning sees splits that only pay off through their children; a depth cap cannot."
      },
      {
        stem: "A depth-2 tree scored 0.613 on XOR and depth 3 scored 0.892. Why did depth 2 fail when XOR needs only two splits?",
        options: [
          "The data were not scaled",
          "Every single-feature split of XOR has almost zero gain (parent Gini 0.499, best children 0.500 and 0.436), so the greedy root picks an arbitrary threshold that is not the one the ideal two-split tree needs; the second level then cannot repair it and a third is needed. Greedy search cannot see two moves ahead — trees find interactions unless the interaction hides every marginal effect",
          "Depth 2 has too few leaves",
          "Gini cannot detect XOR; entropy can"
        ],
        answer: 1,
        why: "The rotated-feature trick applies here too: the product x₁x₂ as a feature makes XOR a depth-1 problem."
      },
      {
        stem: "Why does a single decision tree not need feature scaling, and why can it not extrapolate?",
        options: [
          "It scales internally; it extrapolates linearly",
          "Splits are threshold comparisons on one feature at a time, and the same threshold exists in any monotone rescaling, so scale is irrelevant (0.6619 vs 0.6621). A leaf predicts a constant, so beyond the last threshold on any feature the prediction is flat: 156.2 at tenure 60, 80 and 120",
          "It needs scaling for Gini; it extrapolates with the leaf slope",
          "It ignores continuous features"
        ],
        answer: 1,
        why: "Flat extrapolation is safe compared with a polynomial's, and useless for a trend that continues."
      },
      {
        stem: "When is a single tree the right model?",
        options: [
          "Whenever accuracy matters",
          "When the rules must be read and audited (a pruned tree of 4–8 leaves), when the truth is thresholds and interactions on unscaled mixed features, or as the building block of an ensemble; not as the final scoring model when accuracy matters, because its variance (root moved in 6 of 10 resamples, AUC 0.674 vs a forest or logistic model's 0.74+) is the price of its readability",
          "When the data are small",
          "When the features are categorical"
        ],
        answer: 1,
        why: "Trees are the most interpretable model and the most unstable; ensembles trade the first for the second."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does a decision tree choose a split? Compute one.",
        strong: "At each node it evaluates every feature and every candidate threshold and keeps the one with the largest impurity decrease — parent impurity minus the size-weighted impurity of the children — where impurity is entropy, Gini or, for regression, the sum of squared deviations from the leaf mean. On six rows with three Yes and three No the parent entropy is 1 bit. Splitting on Wind gives Weak with three Yes and one No, entropy 0.811, and Strong with two No, entropy 0; the weighted child entropy is 0.541 and the gain 0.459. Splitting on Outlook gives two children each with entropy 0.918 and a gain of 0.082, so Wind wins; Gini gives the same order, 0.250 against 0.056, and C4.5's gain ratio, which divides by the split's own entropy to penalise many-valued features, gives 0.500 against 0.082. For a continuous feature the candidates are the midpoints between sorted adjacent values. The search is greedy — best split now, given the path so far — because the globally optimal tree is NP-hard, and that greed is why trees are unstable.",
        answer: [
          { t: "p", text: "The criterion, the worked numbers under three impurities, continuous thresholds, and greed." }
        ]
      },
      {
        level: "core",
        q: "Why do trees overfit, and what are the controls?",
        strong: "Grown to purity, a tree keeps splitting until each leaf holds one or two rows, at which point it has memorised the training labels: on the churn data the full tree had 198 leaves for 989 rows, a training AUC of 1.000 and a cross-validated AUC of 0.520, and a log-loss of 1.8 because one-row leaves emit probabilities of exactly 0 and 1. The controls are pre-pruning — cap the depth, require a minimum number of rows per leaf, require a minimum impurity decrease — and post-pruning, which grows the full tree and collapses every subtree whose impurity saving per leaf is below a price α, chosen by cross-validation; post-pruning is better because a weak split can enable a strong one below it, which a depth cap never sees. On the churn data depth 3 or α = 0.004 gave a four-to-eight-leaf tree at AUC 0.66–0.67. But the deeper answer is that even a well-pruned single tree carries variance a cap cannot remove — its root split changed in six of ten bootstrap resamples — and the real control is averaging many trees, which is a random forest.",
        answer: [
          { t: "p", text: "The mechanism with numbers, pre- and post-pruning and why post is better, and the limit of pruning." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague reports a tree's feature importances as 'the drivers of churn'. Critique.",
        strong: "Three objections, in order of severity. First, the importances are almost certainly mean decrease in impurity, which measures how much the tree used a feature, not how much the feature matters: it is biased toward columns with many distinct values because they offer many thresholds, and in a full tree one of those thresholds always looks good on a tiny node — when I added a random integer id and a random normal to the churn features, they scored 0.175 and 0.178 against tenure's 0.178. Permutation importance on held-out data, or SHAP, is the honest alternative and ranked the noise columns near zero. Second, a single tree's structure is a property of the sample: the root split moved in six of ten resamples, so 'the tree splits on logins first' is not a stable fact about churn. A forest's averaged importances, or a bootstrap of the tree's, would say how stable each ranking is. Third, and regardless of the method, importance is not causation — it says what the model used, and 1.5's refund column would top every importance list while being an effect of churn, not a driver. I would re-run with permutation importance on a forest, report the spread across resamples, and word the result as 'features the model relies on'.",
        answer: [
          { t: "p", text: "MDI bias with the executed evidence, single-tree instability, and the importance-versus-causation caveat, each with its remedy." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 8.1 — Feature Selection: Filter, Wrapper, Embedded
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "**Selecting features on their correlation with the target discards exactly the features a non-linear model would have used most.** A U-shaped effect has correlation zero. An interaction has correlation zero in each part. The three families of selection — filter, wrapper, embedded — differ in what they can see, and the cheapest one is blind to the most. Every one of them is also a fit step that leaks if it sees the validation fold.",

  objectives: [
    "Distinguish filter, wrapper and embedded selection and say what each can and cannot detect",
    "Apply mutual information, model-based importance and L1 regularisation as selectors",
    "Explain why selection must happen inside cross-validation and measure the leak when it does not",
    "Use permutation importance and know why impurity importance is biased",
    "Decide how many features to keep with a stability argument, not a threshold"
  ],

  prerequisites: ["6.2", "7.9"],

  blocks: [

    { t: "h2", n: "01", text: "Three families", id: "families" },

    { t: "p", text: "Feature selection asks which columns to keep. **The three families differ in whether they consult a model at all, and if so, how.** Filters score each feature alone. Wrappers train models on subsets and compare. Embedded methods let the model's own fitting decide." },

    { t: "dl", items: [
      ["Filter method", "A score per feature computed without a model: correlation, mutual information, chi-square, variance. Fast, model-agnostic, and blind to interactions."],
      ["Wrapper method", "Train the actual model on candidate subsets and keep the best. Forward selection, backward elimination, recursive feature elimination. Sees everything the model sees; costs a model fit per candidate."],
      ["Embedded method", "Selection as a by-product of fitting: L1 regularisation zeroes coefficients; tree importances rank features. One fit, model-specific."],
      ["Mutual information", "How much knowing a feature reduces uncertainty about the target. Detects any dependency, including non-monotonic ones; noisy on small samples."],
      ["Permutation importance", "Shuffle one feature, remeasure the model's score, and record the drop. Model-agnostic, computed on held-out data, and honest about correlated features in a way impurity importance is not."],
      ["Selection leak", "Choosing features using the validation fold's labels, then validating on that fold. The score is inflated by however much the selection overfit."]
    ]},

    { t: "viz",
      title: "What each family can see",
      caption: "Filters score one feature at a time against the target and miss anything that only shows up in combination. Wrappers see the model's full behaviour but pay a fit per subset. Embedded methods get the model's view for the price of one fit — for that model.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Three columns for filter, wrapper and embedded selection, each listing what it detects, what it misses, and its cost">
  <g stroke-width="1.5">
    <rect x="30" y="40" width="260" height="230" rx="8" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent)"/>
    <rect x="310" y="40" width="260" height="230" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
    <rect x="590" y="40" width="260" height="230" rx="8" style="fill:var(--good);fill-opacity:.06;stroke:var(--good)"/>
  </g>
  <text x="46" y="68" class="s-label" style="fill:var(--accent)">filter</text>
  <text x="46" y="92" class="s-sub" style="fill:var(--ink-3)">score each feature alone</text>
  <text x="46" y="122" class="s-sub" style="fill:var(--ink-2)">sees: marginal association</text>
  <text x="46" y="142" class="s-sub" style="fill:var(--ink-2)">(corr, MI, chi²)</text>
  <text x="46" y="172" class="s-sub" style="fill:var(--crit)">misses: interactions,</text>
  <text x="46" y="192" class="s-sub" style="fill:var(--crit)">redundancy among features,</text>
  <text x="46" y="212" class="s-sub" style="fill:var(--crit)">what the model can use</text>
  <text x="46" y="246" class="s-sub" style="fill:var(--ink-3)">cost: seconds, any model</text>

  <text x="326" y="68" class="s-label" style="fill:var(--warn)">wrapper</text>
  <text x="326" y="92" class="s-sub" style="fill:var(--ink-3)">fit the model on subsets</text>
  <text x="326" y="122" class="s-sub" style="fill:var(--ink-2)">sees: everything the</text>
  <text x="326" y="142" class="s-sub" style="fill:var(--ink-2)">model sees, incl. interactions</text>
  <text x="326" y="172" class="s-sub" style="fill:var(--crit)">misses: nothing in principle;</text>
  <text x="326" y="192" class="s-sub" style="fill:var(--crit)">overfits the selection if</text>
  <text x="326" y="212" class="s-sub" style="fill:var(--crit)">not nested in CV</text>
  <text x="326" y="246" class="s-sub" style="fill:var(--ink-3)">cost: one fit per candidate</text>

  <text x="606" y="68" class="s-label" style="fill:var(--good)">embedded</text>
  <text x="606" y="92" class="s-sub" style="fill:var(--ink-3)">the fit does the selecting</text>
  <text x="606" y="122" class="s-sub" style="fill:var(--ink-2)">sees: what THIS model uses</text>
  <text x="606" y="142" class="s-sub" style="fill:var(--ink-2)">(L1 zeros, tree splits)</text>
  <text x="606" y="172" class="s-sub" style="fill:var(--crit)">misses: what a different</text>
  <text x="606" y="192" class="s-sub" style="fill:var(--crit)">model would use; impurity</text>
  <text x="606" y="212" class="s-sub" style="fill:var(--crit)">importance is biased</text>
  <text x="606" y="246" class="s-sub" style="fill:var(--ink-3)">cost: one fit</text>

  <text x="30" y="300" class="s-sub" style="fill:var(--ink-3)">All three are fit steps. A filter that ranks features using every row's label, then a CV on those rows, has already leaked.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "filter methods, and the feature they cannot see", code: `
import pandas as pd
import numpy as np
from sklearn.feature_selection import (SelectKBest, f_classif, mutual_info_classif,
                                       chi2, VarianceThreshold)
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

rng = np.random.default_rng(0)
n = 4000
X = pd.DataFrame({
    "linear":   rng.normal(size=n),                  # linear effect
    "u_shape":  rng.uniform(-3, 3, n),               # U-shaped effect
    "inter_a":  rng.normal(size=n),                  # effect only via product
    "inter_b":  rng.normal(size=n),
    "dup":      None,                                # a near-copy of linear
    "noise_1":  rng.normal(size=n),
    "noise_2":  rng.normal(size=n),
    "noise_3":  rng.normal(size=n),
})
X["dup"] = X["linear"] + rng.normal(0, 0.05, n)
logit = 1.5 * X["linear"] + 1.2 * (X["u_shape"] ** 2 - 3) + 1.5 * X["inter_a"] * X["inter_b"]
y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

# FILTER 1: ANOVA F-test (f_classif) -- a linear-difference-in-means test.
f_scores = pd.Series(f_classif(X, y)[0], index=X.columns).sort_values(ascending=False)
f_scores.round(1)
# linear     612.4      <- found
# dup        598.1      <- found (it is linear again)
# noise_2      2.1
# u_shape      1.4      <- MISSED: mean of u_shape is the same in both classes
# inter_a      0.9      <- MISSED: no marginal effect
# inter_b      0.6      <- MISSED
# noise_1      0.3
# noise_3      0.2
#
# Three of the four real features score like noise. The F-test asks
# "does the mean differ between classes"; for a U-shape and for an
# interaction, it does not.

# FILTER 2: mutual information -- detects any dependency.
mi = pd.Series(mutual_info_classif(X, y, random_state=0), index=X.columns).sort_values(ascending=False)
mi.round(3)
# linear     0.108
# dup        0.105
# u_shape    0.071      <- FOUND: MI sees the U
# noise_1    0.004
# inter_a    0.002      <- still missed: alone, inter_a is independent of y
# inter_b    0.001
# ...
#
# MI finds the U-shape. It cannot find the interaction, because
# NEITHER inter_a nor inter_b has any marginal relationship with y --
# only their product does. No single-feature score can see that.

# FILTER 3: chi2 -- for non-negative features (counts, one-hot) vs a
# categorical target. Not applicable here (negative values raise).

# FILTER 4: variance threshold -- drop near-constant columns. Unsupervised,
# so it cannot leak; it only removes features that carry nothing.
VarianceThreshold(threshold=0.01).fit(X).get_support()

# WHAT A FILTER CANNOT DO: judge redundancy. linear and dup both score
# high; the filter keeps both; the model gets two copies. A filter on
# correlation between features (6.2) is the usual patch, and it is a
# second filter with its own threshold.

# THE MODEL'S VIEW, for comparison -- what the features are actually worth:
def cv(model, cols):
    return round(cross_val_score(model, X[cols], y, cv=5, scoring="roc_auc").mean(), 3)
gb = GradientBoostingClassifier(random_state=0)
cv(gb, list(X.columns))                                        # 0.87  all
cv(gb, f_scores.head(3).index.tolist())                        # 0.71  F-test top 3
cv(gb, mi.head(3).index.tolist())                              # 0.79  MI top 3
cv(gb, ["linear", "u_shape", "inter_a", "inter_b"])            # 0.87  the truth
#
# The F-test's top three lose 16 points. MI's lose 8. Neither can
# find inter_a and inter_b, which together are worth the difference.
`,
      hl: [24, 38, 44, 62],
      caption: "**Three of the four real features score like noise under the F-test, and the interaction pair scores like noise under mutual information too.** No single-feature score can see a dependency that exists only in combination."
    },

    { t: "h2", n: "02", text: "Wrappers and embedded methods", id: "model" },

    { t: "p", text: "**A wrapper asks the model directly: does the score go up with this feature or without it?** It sees interactions because the model does. The cost is a fit per question, and the risk is that a thousand questions asked of one validation set will find features that only work on that set." },

    { t: "code", lang: "python", title: "RFE, L1, and the two kinds of tree importance", code: `
from sklearn.feature_selection import RFE, RFECV, SelectFromModel
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

# WRAPPER: recursive feature elimination. Fit, drop the weakest, refit.
rfe = RFE(GradientBoostingClassifier(random_state=0), n_features_to_select=4, step=1)
rfe.fit(X, y)
pd.Series(rfe.ranking_, index=X.columns).sort_values()
# linear     1
# u_shape    1
# inter_a    1
# inter_b    1       <- the wrapper found the interaction pair
# dup        2       <- and dropped the duplicate: with linear present,
# noise_2    3          dup adds nothing to the fit
# ...
#
# RFE sees what the model sees. 8 features, 4 to keep, step 1: five
# fits. On 200 features it is 196 fits of the full model -- expensive,
# and RFECV (which picks n by cross-validation) multiplies that by
# the number of folds.

# RFECV: let CV choose how many.
rfecv = RFECV(GradientBoostingClassifier(random_state=0), step=1,
              cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc")
rfecv.fit(X, y)
rfecv.n_features_                                   # 4
#
# The CV inside RFECV scores each subset SIZE honestly -- but the
# ranking within each fold used that fold's training labels only, so
# the selection is nested correctly. This is the right tool when the
# fit is affordable.

# EMBEDDED 1: L1 regularisation. The penalty drives coefficients to
# exactly zero; the survivors are the selection.
l1 = make_pipeline(StandardScaler(), LogisticRegression(penalty="l1", C=0.1, solver="liblinear"))
l1.fit(X, y)
pd.Series(l1.named_steps["logisticregression"].coef_[0], index=X.columns).round(2)
# linear     1.07
# dup        0.35     <- L1 spread the weight across the two copies,
# u_shape    0.00        and zeroed everything else
# inter_a    0.00     <- including the features a LINEAR model cannot use
# ...
#
# L1 selects what a linear model can use. The U and the interaction
# are invisible to it, because they are invisible to logistic
# regression on raw features. Embedded selection is selection FOR
# THAT MODEL. And C is a knob: lower C, fewer survivors.

SelectFromModel(l1.named_steps["logisticregression"], prefit=True)   # the sklearn wrapper for this

# EMBEDDED 2: tree impurity importance -- the default, and biased.
gb = GradientBoostingClassifier(random_state=0).fit(X, y)
pd.Series(gb.feature_importances_, index=X.columns).sort_values(ascending=False).round(3)
# linear     0.31
# u_shape    0.24
# inter_a    0.15
# inter_b    0.14
# dup        0.09     <- shares importance with linear: it is the same signal
# noise_1    0.03
# ...
#
# Impurity importance sums the split gain a feature produced. Its
# known biases: it favours HIGH-CARDINALITY features (more candidate
# thresholds, more chances to split), it splits credit between
# correlated features arbitrarily, and it is computed on TRAINING
# data -- a feature the model overfit to looks important.

# EMBEDDED 3 (really a wrapper on a fitted model): permutation
# importance, on HELD-OUT data.
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
gb = GradientBoostingClassifier(random_state=0).fit(Xtr, ytr)
pi = permutation_importance(gb, Xte, yte, n_repeats=20, random_state=0, scoring="roc_auc")
pd.Series(pi.importances_mean, index=X.columns).sort_values(ascending=False).round(3)
# linear     0.142
# u_shape    0.118
# inter_a    0.089
# inter_b    0.087
# dup        0.002     <- NEAR ZERO: shuffling dup costs nothing, because
# noise_1    0.001        linear carries the same information
# ...
#
# Shuffle one column, rescore on the test set, take the drop. It
# measures what the model LOSES without the feature -- on data it
# has not seen. dup drops to zero: the model has linear, so
# scrambling dup changes nothing. That is the honest answer, and
# impurity importance could not give it.
#
# THE CAVEAT: on correlated features, permutation importance can
# UNDERSTATE both -- shuffle linear and the model leans on dup.
# Permute correlated groups together, or drop one first.
`,
      hl: [4, 31, 46, 66],
      caption: "**Impurity importance gives `dup` 0.09; permutation importance gives it 0.002.** The model has `linear`, so scrambling its near-copy costs nothing — and only a held-out measurement of what the model *loses* can say so."
    },

    { t: "callout", kind: "trap", title: "Impurity importance is computed on training data", body: [
      { t: "p", text: "A feature the model overfit to produces many splits with high training gain and scores as important — on the data it memorised. It also favours high-cardinality columns simply because they offer more candidate thresholds, and splits credit between correlated features by whichever the tree happened to pick first." },
      { t: "p", text: "**Permutation importance on held-out data measures what the model actually loses without a feature.** It is slower — one rescoring per feature per repeat — and it is the number to quote." }
    ]},

    { t: "h2", n: "03", text: "The selection leak", id: "leak" },

    { t: "p", text: "**Every selector uses the target. If it runs on all the data before cross-validation, the validation folds' labels helped choose the features the model is then validated on.** With enough candidate features, some noise columns will correlate with the target by chance — and a selector that sees all the labels will pick them, and the CV will confirm them." },

    { t: "code", lang: "python", title: "selecting outside the CV, measured against inside", code: `
# PURE NOISE: 200 features, no relationship to y whatsoever.
rng = np.random.default_rng(1)
n_small = 300
X_noise = pd.DataFrame(rng.normal(size=(n_small, 200)), columns=[f"f{i}" for i in range(200)])
y_noise = rng.integers(0, 2, n_small)
#
# The honest AUC is 0.5. Anything above it is the selection overfitting.

# WRONG: select on all data, then CV.
selector = SelectKBest(f_classif, k=10).fit(X_noise, y_noise)      # sees every label
X_sel = X_noise.loc[:, selector.get_support()]
cross_val_score(LogisticRegression(max_iter=1000), X_sel, y_noise, cv=5, scoring="roc_auc").mean()
# 0.72
#
# 0.72 on pure noise. The selector picked the 10 of 200 columns that
# correlate best with y BY CHANCE, using all 300 labels. The CV then
# trains and validates on those same columns and those same labels.
# The validation fold cannot disagree: its labels chose the features.

# RIGHT: selection inside the pipeline, refit per fold.
pipe = make_pipeline(SelectKBest(f_classif, k=10), LogisticRegression(max_iter=1000))
cross_val_score(pipe, X_noise, y_noise, cv=5, scoring="roc_auc").mean()
# 0.49
#
# Each fold selects on ITS training rows only; the validation rows'
# labels never touch the selector. The score is 0.49 -- the truth.

# HOW BIG THE LEAK IS depends on:
#   - how many candidates (200 here; 20,000 in genomics -> worse)
#   - how few rows (300; the fewer, the more chance correlations)
#   - how aggressive the selection (top 10 of 200 = the 5% luckiest)
# It does not depend on the selector being "simple". f_classif is as
# leaky as anything.

# THE SAME FOR EVERY FAMILY:
#   filter:   SelectKBest(...) inside the Pipeline
#   embedded: SelectFromModel(...) inside the Pipeline
#   wrapper:  RFECV does it internally; plain RFE inside the Pipeline
#
# And for hand-rolled selection -- "I looked at the correlations and
# picked these" -- the look WAS the leak, and no Pipeline can undo
# it. If you selected by eye on the full data, the honest score
# needs data you have not looked at.

# NESTED CV, when the selector has a hyperparameter (k, C, n_features):
from sklearn.model_selection import GridSearchCV
inner = GridSearchCV(pipe, {"selectkbest__k": [5, 10, 20, 50]},
                     cv=StratifiedKFold(3, shuffle=True, random_state=0), scoring="roc_auc")
cross_val_score(inner, X_noise, y_noise, cv=StratifiedKFold(5, shuffle=True, random_state=1),
                scoring="roc_auc").mean()
# ~0.50
#
# The outer CV scores; the inner CV picks k. Each outer fold's
# validation rows are seen by neither the selector nor the k-search.
# Expensive -- folds x folds x candidates fits -- and the only honest
# way to both tune the selection and report a score.

# THE DIAGNOSTIC: run your selection on shuffled labels. An honest
# pipeline scores ~0.5; a leaky one scores what it scored before.
y_shuf = rng.permutation(y_noise)
cross_val_score(pipe, X_noise, y_shuf, cv=5, scoring="roc_auc").mean()    # ~0.5: honest
`,
      hl: [11, 20, 27, 51],
      caption: "**0.72 AUC on pure noise.** The selector used all 300 labels to pick the 10 columns that correlate with `y` by chance, and the validation folds — whose labels did the choosing — cannot disagree. Inside the pipeline, the same selector scores 0.49."
    },

    { t: "h2", n: "04", text: "How many to keep", id: "howmany" },

    { t: "code", lang: "python", title: "stability across folds, and the curve that decides k", code: `
# THE QUESTION IS NOT "WHICH THRESHOLD" BUT "WHAT DOES THE MODEL LOSE".
# Score the model at each k, inside CV, and look at the curve.
X_real, y_real = X, y                                # the 8-feature set from section 1
ks = [1, 2, 3, 4, 5, 6, 8]
curve = []
for k in ks:
    p = make_pipeline(SelectKBest(mutual_info_classif, k=k), GradientBoostingClassifier(random_state=0))
    s = cross_val_score(p, X_real, y_real, cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc")
    curve.append({"k": k, "auc": round(s.mean(), 3), "sd": round(s.std(), 3)})
pd.DataFrame(curve)
#    k    auc     sd
# 0  1  0.640  0.012
# 1  2  0.720  0.010
# 2  3  0.790  0.011
# 3  4  0.812  0.014     <- MI's top 4 includes dup, not inter_b
# 4  5  0.850  0.010
# 5  6  0.868  0.009     <- the interaction pair is finally in
# 6  8  0.867  0.011     <- adding noise costs nothing here
#
# The curve plateaus at 6. Keeping 8 costs nothing; keeping 4 costs
# 5 points. The knee is the answer, and the sd says whether adjacent
# k are distinguishable.

# STABILITY: does the same set get chosen across folds?
chosen = []
for tr, te in StratifiedKFold(5, shuffle=True, random_state=0).split(X_real, y_real):
    sel = SelectKBest(mutual_info_classif, k=4).fit(X_real.iloc[tr], y_real[tr])
    chosen.append(frozenset(X_real.columns[sel.get_support()]))
pd.Series([c for s in chosen for c in s]).value_counts()
# linear     5     <- chosen in every fold
# dup        5
# u_shape    5
# inter_a    2     <- unstable: chosen in 2 of 5
# noise_1    2
# inter_b    1
#
# A feature chosen in every fold is a real selection. One chosen in
# 2 of 5 is the selector flipping a coin. Stability across folds is
# the evidence that the selection means something; a single run's
# list is one draw.

# THE PRACTICAL PROCEDURE:
#   1. Unsupervised first: drop constants, near-constants, exact
#      duplicates, and one of each perfectly correlated pair. No
#      target involved, no leak, and it removes the obvious.
#   2. A cheap filter to cut the field, INSIDE the pipeline, generous
#      (keep 50%, not 5%).
#   3. Permutation importance on held-out data from the real model to
#      rank what is left.
#   4. The score-vs-k curve, inside CV, to choose how many.
#   5. Stability across folds to confirm the survivors are not luck.
#
# WHAT SELECTION IS FOR: fewer features means a faster model, a
# cheaper feature pipeline, less to monitor, and less to drift. It
# does not usually mean a better score -- a regularised model on all
# features is often as good. The reason to select is cost, not
# accuracy; and a selection that costs 5 AUC points to save 4
# columns is the wrong trade.
`,
      hl: [9, 22, 31, 50],
      caption: "**A feature chosen in every fold is a selection; one chosen in two of five is a coin flip.** Stability across folds is the evidence that a selected set means something — a single run's list is one draw."
    },

    { t: "table",
      head: ["Method", "Family", "Sees interactions", "Handles redundancy", "Cost", "Leaks if outside CV"],
      rows: [
        ["Variance threshold", "Filter (unsupervised)", "—", "No", "Trivial", "**No** — no target"],
        ["Correlation / F-test", "Filter", "No", "No", "Trivial", "Yes"],
        ["Mutual information", "Filter", "No (marginal only)", "No", "Low", "Yes"],
        ["Chi-square", "Filter", "No", "No", "Trivial", "Yes"],
        ["RFE / RFECV", "Wrapper", "**Yes**", "**Yes**", "One fit per step", "RFE yes; RFECV nests it"],
        ["Forward / backward selection", "Wrapper", "Yes", "Yes", "Many fits", "Yes"],
        ["L1 (lasso)", "Embedded", "Only what a linear model sees", "Spreads weight", "One fit", "Yes"],
        ["Impurity importance", "Embedded", "Yes", "Splits credit arbitrarily", "One fit", "Yes, and biased anyway"],
        ["Permutation importance", "Post-hoc on a fitted model", "Yes", "**Understates correlated pairs**", "One rescoring per feature", "Compute on held-out data"]
      ],
      caption: "**Only the unsupervised filter cannot leak.** Everything else uses the target, belongs inside the pipeline, and inflates the score by exactly how much it overfit when it does not."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A selection procedure that reports its own leak",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "Build the selection stage for a 60-feature set with planted structure: 4 real features (one linear, one U-shaped, an interaction pair), 3 near-duplicates of the linear one, and 53 noise columns. Implement the five-step procedure — unsupervised pruning, generous filter inside the pipeline, permutation importance, score-vs-k curve, fold stability — and produce a report. Then run the same selection *outside* the CV and show the inflated score, and run it on shuffled labels and show it drop to chance." },
        { t: "p", text: "Assert that the final set contains all four real features and at most one of the duplicates." }
      ],
      requirements: [
        "Unsupervised pruning with no target involved.",
        "A filter selector inside a Pipeline, keeping ~50%.",
        "Permutation importance on held-out data, with correlated features noted.",
        "Score-vs-k curve with fold standard deviations, and a knee rule.",
        "Fold stability counts for the final set.",
        "The leak demonstration: outside-CV score vs inside-CV score, and the shuffled-label control."
      ],
      hint: "The interaction pair will not survive a filter alone — no marginal score can see it. The generous filter (50%) is what gives the model-based step a chance to find it.",
      solution: {
        lang: "python",
        title: "selection_procedure.py",
        code: `import pandas as pd
import numpy as np
from sklearn.feature_selection import SelectKBest, mutual_info_classif, VarianceThreshold
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold, train_test_split


# =========================================================================
# DATA WITH PLANTED STRUCTURE
# =========================================================================

def make(n=3000, n_noise=53, seed=0):
    rng = np.random.default_rng(seed)
    X = pd.DataFrame({
        "linear": rng.normal(size=n),
        "u_shape": rng.uniform(-3, 3, n),
        "inter_a": rng.normal(size=n),
        "inter_b": rng.normal(size=n),
    })
    for i in range(3):
        X[f"dup_{i}"] = X["linear"] + rng.normal(0, 0.03 * (i + 1), n)
    for i in range(n_noise):
        X[f"noise_{i}"] = rng.normal(size=n)
    X["constant"] = 1.0
    logit = 1.5 * X["linear"] + 1.2 * (X["u_shape"] ** 2 - 3) + 1.6 * X["inter_a"] * X["inter_b"]
    y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    return X, y


REAL = {"linear", "u_shape", "inter_a", "inter_b"}


# =========================================================================
# STEP 1: UNSUPERVISED PRUNING -- no target, no leak
# =========================================================================

def prune_unsupervised(X, corr_threshold=0.98):
    keep = X.columns[VarianceThreshold(1e-8).fit(X).get_support()].tolist()
    Xk = X[keep]
    corr = Xk.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape, dtype=bool), k=1))
    drop = set()
    for col in upper.columns:
        partners = upper.index[upper[col] > corr_threshold].tolist()
        if partners and col not in drop:
            drop.add(col)                    # drop the LATER of each near-identical pair
    kept = [c for c in keep if c not in drop]
    return kept, {"dropped_constant": [c for c in X.columns if c not in keep],
                  "dropped_duplicate": sorted(drop)}


# =========================================================================
# STEPS 2-5
# =========================================================================

def model():
    return GradientBoostingClassifier(n_estimators=150, max_depth=3, random_state=0)


def select(X, y, *, filter_frac=0.5, seed=0):
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    report = {}

    # 1. unsupervised
    cols, pruned = prune_unsupervised(X)
    report["pruned"] = pruned
    Xp = X[cols]

    # 2. generous filter INSIDE the pipeline (fit per fold), just to
    #    confirm the pipeline scores; the actual ranking comes from
    #    step 3, which sees interactions.
    k_filter = max(4, int(filter_frac * Xp.shape[1]))
    pipe = make_pipeline(SelectKBest(mutual_info_classif, k=k_filter), model())
    report["filter_pipeline_auc"] = round(cross_val_score(pipe, Xp, y, cv=cv, scoring="roc_auc").mean(), 3)

    # 3. permutation importance on held-out data, full model on all pruned cols
    Xtr, Xte, ytr, yte = train_test_split(Xp, y, test_size=0.3, random_state=seed, stratify=y)
    m = model().fit(Xtr, ytr)
    pi = permutation_importance(m, Xte, yte, n_repeats=15, random_state=seed, scoring="roc_auc")
    imp = pd.Series(pi.importances_mean, index=Xp.columns).sort_values(ascending=False)
    report["permutation_importance"] = imp.round(4).head(12).to_dict()
    ranked = imp.index.tolist()

    # 4. score-vs-k curve, inside CV, along the permutation ranking
    curve = []
    for k in [2, 4, 6, 8, 12, 16, len(ranked)]:
        k = min(k, len(ranked))
        s = cross_val_score(model(), Xp[ranked[:k]], y, cv=cv, scoring="roc_auc")
        curve.append({"k": k, "auc": round(s.mean(), 4), "sd": round(s.std(), 4)})
        if k == len(ranked):
            break
    curve = pd.DataFrame(curve).drop_duplicates("k")
    report["curve"] = curve.to_dict("records")
    best = curve["auc"].max()
    # KNEE: the smallest k within one fold-sd of the best
    tol = curve.loc[curve["auc"].idxmax(), "sd"]
    k_star = int(curve.loc[curve["auc"] >= best - tol, "k"].min())
    report["k_star"] = k_star
    selected = ranked[:k_star]

    # 5. stability: re-rank per fold, count how often each survivor is in the top k
    counts = pd.Series(0, index=Xp.columns)
    for tr, _ in cv.split(Xp, y):
        Xa, Xb, ya, yb = train_test_split(Xp.iloc[tr], y[tr], test_size=0.3, random_state=seed, stratify=y[tr])
        mf = model().fit(Xa, ya)
        pf = permutation_importance(mf, Xb, yb, n_repeats=5, random_state=seed, scoring="roc_auc")
        top = pd.Series(pf.importances_mean, index=Xp.columns).nlargest(k_star).index
        counts[top] += 1
    report["stability"] = counts[selected].to_dict()
    stable = [c for c in selected if counts[c] >= 4]
    report["selected"] = selected
    report["selected_stable"] = stable
    return stable, report


# =========================================================================
# THE LEAK DEMONSTRATION
# =========================================================================

def leak_demo(X, y, k=8, seed=0):
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    # OUTSIDE: select on all data, then CV on the selected columns
    sel = SelectKBest(mutual_info_classif, k=k).fit(X, y)
    outside = cross_val_score(model(), X.loc[:, sel.get_support()], y, cv=cv, scoring="roc_auc").mean()
    # INSIDE: selector in the pipeline
    inside = cross_val_score(make_pipeline(SelectKBest(mutual_info_classif, k=k), model()),
                             X, y, cv=cv, scoring="roc_auc").mean()
    # SHUFFLED-LABEL CONTROL, both ways
    rng = np.random.default_rng(seed)
    y_s = rng.permutation(y)
    sel_s = SelectKBest(mutual_info_classif, k=k).fit(X, y_s)
    outside_shuf = cross_val_score(model(), X.loc[:, sel_s.get_support()], y_s, cv=cv, scoring="roc_auc").mean()
    inside_shuf = cross_val_score(make_pipeline(SelectKBest(mutual_info_classif, k=k), model()),
                                  X, y_s, cv=cv, scoring="roc_auc").mean()
    return {"outside": round(outside, 3), "inside": round(inside, 3),
            "outside_shuffled": round(outside_shuf, 3), "inside_shuffled": round(inside_shuf, 3)}


# =========================================================================
# TESTS
# =========================================================================

def test_unsupervised_pruning_drops_constant_and_duplicates():
    X, y = make()
    cols, pruned = prune_unsupervised(X)
    assert "constant" in pruned["dropped_constant"]
    assert len(pruned["dropped_duplicate"]) >= 2          # at most one of linear/dup_* survives
    survivors = [c for c in cols if c == "linear" or c.startswith("dup_")]
    assert len(survivors) == 1


def test_selection_recovers_all_real_features():
    X, y = make()
    stable, rep = select(X, y)
    assert REAL <= set(stable) or REAL <= set(rep["selected"]), rep["selected"]


def test_interaction_pair_is_found_by_permutation_not_filter():
    X, y = make()
    cols, _ = prune_unsupervised(X)
    mi = pd.Series(mutual_info_classif(X[cols], y, random_state=0), index=cols)
    assert mi["inter_a"] < mi.quantile(0.8) or mi["inter_b"] < mi.quantile(0.8)   # filter misses at least one
    _, rep = select(X, y)
    pi = rep["permutation_importance"]
    assert "inter_a" in pi and "inter_b" in pi                                    # permutation finds both


def test_curve_has_a_knee_and_k_star_is_small():
    X, y = make()
    _, rep = select(X, y)
    assert 4 <= rep["k_star"] <= 8, rep["k_star"]
    curve = pd.DataFrame(rep["curve"])
    assert curve["auc"].iloc[-1] - curve.loc[curve["k"] == rep["k_star"], "auc"].iloc[0] < 0.02


def test_real_features_are_stable_across_folds():
    X, y = make()
    _, rep = select(X, y)
    for f in REAL:
        assert rep["stability"].get(f, 0) >= 4, (f, rep["stability"])


def test_noise_is_not_selected():
    X, y = make()
    stable, rep = select(X, y)
    assert not any(c.startswith("noise_") for c in stable), stable


def test_selection_outside_cv_is_inflated():
    """On real signal the gap is modest; on pure noise it is the whole score."""
    rng = np.random.default_rng(3)
    Xn = pd.DataFrame(rng.normal(size=(250, 150)), columns=[f"n{i}" for i in range(150)])
    yn = rng.integers(0, 2, 250)
    r = leak_demo(Xn, yn, k=8)
    assert r["outside"] > 0.6, r
    assert abs(r["inside"] - 0.5) < 0.08, r


def test_shuffled_label_control():
    X, y = make()
    r = leak_demo(X, y, k=8)
    assert abs(r["inside_shuffled"] - 0.5) < 0.08, r
    assert r["outside_shuffled"] > r["inside_shuffled"]


def test_pruning_is_target_free():
    X, y = make()
    a, _ = prune_unsupervised(X)
    b, _ = prune_unsupervised(X)                          # y not even passed
    assert a == b`,
        notes: [
          { t: "p", text: "**The interaction pair is invisible to mutual information and found by permutation importance.** No single-feature score can see a dependency that exists only in the product; the model can, and shuffling either partner on held-out data costs it measurably. That is why the filter step is generous — it exists to cut the field, not to choose." },
          { t: "callout", kind: "insight", title: "On pure noise, selection outside the CV scores 0.6+; inside, 0.5", body: [
            { t: "p", text: "The selector used every label to pick the 8 of 150 columns that correlate with `y` by chance, and the folds — whose labels did the picking — confirmed them. **The shuffled-label control is the decisive version**: an honest pipeline scores chance on shuffled labels; a leaky one scores whatever it scored before." }
          ]},
          { t: "p", text: "**Unsupervised pruning removes the constant and two of the three duplicates without touching `y`.** It is the only step that cannot leak, it removes the obvious, and the duplicate rule — drop the later of any pair above 0.98 — leaves exactly one copy of `linear` for the supervised steps to rank." },
          { t: "p", text: "**The knee rule is 'the smallest k within one fold-sd of the best'.** A threshold on importance is arbitrary; a point on the score curve where adding features stops helping, measured against the noise between folds, is a decision the curve makes." },
          { t: "p", text: "**Every real feature is in the top-k in at least four of five folds; no noise column is in the stable set.** Stability is the evidence that the selection is a property of the data rather than of one split — and the test asserts it feature by feature." },
          { t: "p", text: "**The report contains the leak demo alongside the selection**, because the two numbers — outside-CV and inside-CV — are the audit trail. A selection procedure that cannot show its own leak is one that will eventually ship a 0.72 on noise." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SelectKBest(f_classif, k=10)` is fit on all 300 rows, then `cross_val_score` runs on the selected columns. On pure-noise features the CV AUC is 0.72. Why?",
          options: [
            "f_classif found real signal",
            "The selector used every row's label to choose the 10 of 200 columns that correlate with y by chance; the validation folds' labels did the choosing, so they cannot disagree",
            "The model overfit",
            "Ten features is too many"
          ],
          answer: 1,
          why: "Selection is a fit step that uses the target. Outside the CV it sees the validation labels; inside a Pipeline it is refit per fold on training rows only, and the same pipeline scores 0.49 on the same noise. The shuffled-label control makes the leak unambiguous."
        }
      ]
    }
  ],

  takeaways: [
    "**Filters score one feature at a time and cannot see interactions** — a pair whose product drives the target scores like noise under every marginal measure.",
    "**Correlation and the F-test miss non-monotonic effects**; mutual information finds a U-shape and still misses an interaction.",
    "**Wrappers ask the model directly and see everything it sees**, at one fit per candidate; RFECV nests the CV correctly.",
    "**L1 selects what a linear model can use** — the U and the interaction are invisible to it because they are invisible to logistic regression.",
    "**Impurity importance is computed on training data, favours high-cardinality features, and splits credit between correlated ones arbitrarily.**",
    "**Permutation importance on held-out data measures what the model loses** — the honest number, with the caveat that correlated pairs shield each other.",
    "**Every supervised selector is a fit step and leaks outside the CV**; on 200 noise features and 300 rows the leak is worth 0.22 AUC.",
    "**Selection by eye on the full data is a leak no Pipeline can undo** — the look was the fit.",
    "**Nested CV** is the only honest way to both tune the selection and report a score.",
    "**The shuffled-label control**: an honest pipeline scores chance on shuffled labels; a leaky one scores what it scored before.",
    "**Unsupervised pruning first** — constants, duplicates, near-perfect correlations — because it cannot leak and removes the obvious.",
    "**Choose k from the score-vs-k curve inside CV**, at the knee measured against fold noise, not from an importance threshold.",
    "**Stability across folds is the evidence a selection means something**; a feature chosen in two of five folds is a coin flip.",
    "**Selection is for cost, not accuracy** — a regularised model on all features is often as good, and five AUC points for four fewer columns is the wrong trade."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two features `inter_a` and `inter_b` drive the target only through their product. Which selector finds them?",
        options: [
          "Correlation with the target",
          "A wrapper or a model-based method — RFE or permutation importance — because only a fitted model that sees both at once can detect a dependency that exists only in combination",
          "Mutual information",
          "Chi-square"
        ],
        answer: 1,
        why: "Every single-feature score computes a marginal relationship, and each partner is marginally independent of the target. A tree model uses both, and shuffling either on held-out data costs it — that is what permutation importance measures."
      },
      {
        stem: "Impurity importance gives a near-duplicate feature 0.09; permutation importance on held-out data gives it 0.002. Which is right?",
        options: [
          "Impurity — it is the model's own number",
          "Permutation — the model has the original feature, so scrambling the copy costs nothing; impurity importance split the training gain between the two copies arbitrarily",
          "Both; they measure the same thing",
          "Neither; correlated features cannot be ranked"
        ],
        answer: 1,
        why: "Impurity importance credits whichever copy the tree happened to split on, on the training data. Permutation importance asks what the model loses without the feature on data it has not seen — and with the original present, the answer is nothing. The caveat runs the other way too: shuffle the original and the model leans on the copy."
      },
      {
        stem: "Why should feature selection happen inside the cross-validation loop?",
        options: [
          "For speed",
          "Because the selector uses the target — outside the loop it sees the validation folds' labels, and the folds then validate features their own labels chose, inflating the score by however much the selection overfit",
          "So that sklearn can parallelise it",
          "It does not matter for filter methods"
        ],
        answer: 1,
        why: "It matters for every supervised method, filter included — `f_classif` is as leaky as anything. Inside a Pipeline the selector is refit per fold on training rows only. With a selection hyperparameter to tune as well, nested CV is required."
      },
      {
        stem: "How should the number of features to keep be decided?",
        options: [
          "Keep everything with importance above 0.01",
          "From the cross-validated score-vs-k curve — the smallest k within one fold-sd of the best — confirmed by stability of the selected set across folds",
          "Keep the top 10",
          "Keep half"
        ],
        answer: 1,
        why: "An importance threshold is arbitrary and model-specific. The curve says what the model loses at each k, the fold sd says which differences are real, and stability says whether the chosen set is a property of the data or of one split. And selection is for cost, not accuracy — losing five points to save four columns is the wrong trade."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Compare filter, wrapper and embedded feature selection.",
        strong: "Filters score each feature alone — correlation, mutual information — fast and model-agnostic, and blind to interactions and redundancy. Wrappers train the model on subsets and keep what scores; they see everything the model sees at one fit per candidate, and RFECV nests the CV so the selection does not overfit. Embedded methods select as a by-product of fitting — L1 zeroing coefficients, tree importances — for one fit, but only for that model: L1 cannot select a feature logistic regression cannot use. I would prune unsupervised first, filter generously inside the pipeline, then rank by permutation importance on held-out data.",
        answer: [
          { t: "p", text: "The 'blind to interactions' point about filters is the one that separates understanding from recital." }
        ]
      },
      {
        level: "expert",
        q: "A colleague selected 20 features from 2,000 by correlation with the target, then got 0.85 AUC in cross-validation. What do you ask?",
        strong: "Whether the selection happened before or inside the CV. If before, the 20 features were chosen using every row's label, including the validation folds' — and with 2,000 candidates, some correlate with the target by chance, the selector finds them, and the folds confirm them. I would rerun with the selector inside the pipeline, and run the shuffled-label control: an honest pipeline scores 0.5 on shuffled labels, a leaky one scores about what it scored before. On 2,000 features the gap can be the whole score.",
        answer: [
          { t: "p", text: "Naming the shuffled-label control as the decisive test is the practical close." }
        ]
      },
      {
        level: "expert",
        q: "Why is tree impurity importance unreliable, and what do you use instead?",
        strong: "It sums training-set split gain, so a feature the model overfit to looks important; it favours high-cardinality features because they offer more thresholds; and it splits credit between correlated features by whichever the tree picked first. Permutation importance on held-out data measures what the model actually loses when a feature is scrambled — a near-duplicate correctly drops to zero. Its own caveat is that correlated features shield each other, so I permute correlated groups together or drop one first, and I confirm the ranking is stable across folds.",
        answer: [
          { t: "p", text: "Knowing permutation importance's caveat as well as impurity's is what makes this a complete answer." }
        ]
      }
    ]
  }
});

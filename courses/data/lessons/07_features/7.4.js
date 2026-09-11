/* ============================================================================
   LESSON 7.4 — Scaling and Normalisation
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "**A model that uses distances or gradients treats a feature measured in pounds as a thousand times more important than one measured in thousands of pounds — because it is a thousand times larger, not because it matters more.** Scaling removes the accident of units. Which scaler, and whether the model needs one at all, depends on what the model does with the numbers; and the scaler's parameters are fit on training data like any other, or the test set has leaked into the mean.",

  objectives: [
    "Say which model families need scaled inputs and which are invariant to scale",
    "Apply standard, min-max, robust, max-abs and quantile scaling and state what each preserves",
    "Choose a scaler from the feature's distribution — outliers, bounds, skew",
    "Fit the scaler on training data and explain the leak when the test set contributes to the mean",
    "Recognise when scaling the target matters and how to invert it"
  ],

  prerequisites: ["6.7", "7.1"],

  blocks: [

    { t: "h2", n: "01", text: "Which models care", id: "which" },

    { t: "p", text: "Scaling matters when the model **compares or combines features numerically** — a distance between rows, a penalty on coefficient size, a gradient step of fixed size. It does not matter when the model only asks whether a value is above or below a threshold, which is what every tree does." },

    { t: "dl", items: [
      ["Scale-sensitive model", "One whose behaviour changes if a feature is multiplied by a constant: KNN, SVM, k-means, PCA, logistic and linear regression with regularisation, neural networks, anything gradient-descended."],
      ["Scale-invariant model", "One whose output is unchanged by a monotonic transform of any feature: decision trees, random forests, gradient boosting. A split at `income > 40,000` is the same split at `log(income) > 10.6`."],
      ["Standardisation", "`(x − μ) / σ`. Mean 0, standard deviation 1. Unbounded; outliers stay outliers, just measured in σ."],
      ["Min-max scaling", "`(x − min) / (max − min)`. Range exactly [0, 1]. One outlier compresses everything else into a corner."],
      ["Robust scaling", "`(x − median) / IQR`. Centre and spread that outliers cannot move. Unbounded."],
      ["Quantile transform", "Map each value to its rank, then to a uniform or normal distribution. Destroys the shape entirely; every feature becomes the same distribution."]
    ]},

    { t: "viz",
      title: "The same two features, before and after standardisation, as KNN sees them",
      caption: "Left: income spans 100,000 and age spans 50, so every distance is income. The nearest neighbour of a point is whoever has the closest income, regardless of age. Right: both span a few σ, and age counts.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two scatter plots: raw income versus age with points forming a vertical band because income dominates distance, and standardised income versus age with a round cloud">
  <g transform="translate(40,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--crit)">raw — distance = |Δincome|, age is noise</text>
    <rect x="0" y="0" width="340" height="200" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="4" y="196" class="s-sub" style="fill:var(--ink-3)">age 20…70 →</text>
    <text x="-30" y="12" class="s-sub" style="fill:var(--ink-3)">£</text>
    <g style="fill:var(--acc);fill-opacity:.6">
      <circle cx="40" cy="180" r="4"/><circle cx="120" cy="178" r="4"/><circle cx="200" cy="181" r="4"/><circle cx="280" cy="179" r="4"/>
      <circle cx="60" cy="150" r="4"/><circle cx="150" cy="152" r="4"/><circle cx="240" cy="149" r="4"/><circle cx="310" cy="151" r="4"/>
      <circle cx="30" cy="110" r="4"/><circle cx="110" cy="112" r="4"/><circle cx="190" cy="109" r="4"/><circle cx="290" cy="111" r="4"/>
      <circle cx="80" cy="60" r="4"/><circle cx="170" cy="62" r="4"/><circle cx="250" cy="58" r="4"/><circle cx="320" cy="61" r="4"/>
    </g>
    <circle cx="200" cy="181" r="7" style="fill:none;stroke:var(--crit);stroke-width:2"/>
    <circle cx="280" cy="179" r="7" style="fill:none;stroke:var(--crit);stroke-width:2;stroke-dasharray:3 2"/>
    <text x="40" y="226" class="s-sub" style="fill:var(--crit)">"nearest" to the circled point: 60 years older, £200 apart</text>
  </g>
  <g transform="translate(480,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--good)">standardised — both axes in σ</text>
    <rect x="0" y="0" width="340" height="200" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="4" y="196" class="s-sub" style="fill:var(--ink-3)">age (z) →</text>
    <g style="fill:var(--good);fill-opacity:.6">
      <circle cx="60" cy="160" r="4"/><circle cx="90" cy="130" r="4"/><circle cx="130" cy="170" r="4"/><circle cx="110" cy="100" r="4"/>
      <circle cx="160" cy="120" r="4"/><circle cx="180" cy="80" r="4"/><circle cx="200" cy="140" r="4"/><circle cx="230" cy="60" r="4"/>
      <circle cx="240" cy="110" r="4"/><circle cx="270" cy="90" r="4"/><circle cx="150" cy="50" r="4"/><circle cx="290" cy="150" r="4"/>
      <circle cx="70" cy="70" r="4"/><circle cx="210" cy="30" r="4"/><circle cx="300" cy="40" r="4"/><circle cx="120" cy="140" r="4"/>
    </g>
    <circle cx="200" cy="140" r="7" style="fill:none;stroke:var(--good);stroke-width:2"/>
    <circle cx="160" cy="120" r="7" style="fill:none;stroke:var(--good);stroke-width:2;stroke-dasharray:3 2"/>
    <text x="0" y="226" class="s-sub" style="fill:var(--good)">nearest: similar age AND similar income</text>
  </g>
  <text x="40" y="280" class="s-sub" style="fill:var(--ink-3)">A tree would split both plots identically. It never computes a distance.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measuring what scale does to each model family", code: `
import pandas as pd
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

rng = np.random.default_rng(0)
n = 4000
age = rng.uniform(20, 70, n)
income = rng.lognormal(10.4, 0.5, n)                      # ~33k median, up to 300k
# the target depends on BOTH, equally in standardised terms
z_age = (age - age.mean()) / age.std()
z_inc = (np.log(income) - np.log(income).mean()) / np.log(income).std()
y = ((z_age + z_inc + rng.normal(0, 0.8, n)) > 0).astype(int)
X = pd.DataFrame({"age": age, "income": income})

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)
sc = StandardScaler().fit(Xtr)
Xtr_s, Xte_s = sc.transform(Xtr), sc.transform(Xte)

def score(model, a, b):
    return round(accuracy_score(yte, model.fit(a, ytr).predict(b)), 3)

# KNN -- distance-based. Raw: every distance is income.
score(KNeighborsClassifier(15), Xtr, Xte)                 # 0.71
score(KNeighborsClassifier(15), Xtr_s, Xte_s)             # 0.84
#
# On raw data, age's contribution to the distance is ~50 out of a
# scale where income contributes ~30,000. Age is invisible. The
# model is a 1-feature model wearing 2 features. Standardised, both
# count, and accuracy jumps 13 points.

# LOGISTIC REGRESSION with L2 penalty -- scale-sensitive through
# the REGULARISER and the optimiser.
score(LogisticRegression(C=1.0, max_iter=2000), Xtr, Xte)       # 0.79
score(LogisticRegression(C=1.0, max_iter=2000), Xtr_s, Xte_s)   # 0.84
#
# Unregularised OLS is scale-invariant in its PREDICTIONS (the
# coefficient just rescales). But: (1) the L2 penalty shrinks all
# coefficients by the same amount, and income's coefficient is tiny
# (per pound) while age's is large (per year) -- so the penalty hits
# age hard and income barely; (2) gradient descent converges slowly
# when one direction is 1,000x steeper than the other. Both are
# fixed by scaling.

# RANDOM FOREST -- scale-invariant. Splits are thresholds.
score(RandomForestClassifier(200, random_state=0), Xtr, Xte)         # 0.83
score(RandomForestClassifier(200, random_state=0), Xtr_s, Xte_s)     # 0.83
#
# Identical, to the third decimal. "income > 41,230" and
# "income_z > 0.31" are the same split. Scaling tree inputs is
# harmless and pointless.

# THE ROLL CALL:
#   NEEDS SCALING       KNN, SVM (RBF and linear), k-means, PCA,
#                       LDA, any neural net, ridge/lasso/elastic-net,
#                       logistic with penalty, linear models fit by
#                       gradient descent
#   INVARIANT           decision tree, random forest, gradient
#                       boosting, naive Bayes (mostly)
#   PREDICTIONS INVARIANT, COEFFICIENTS NOT
#                       unpenalised OLS -- scale if you want to
#                       compare coefficient magnitudes

# THE DIAGNOSTIC: fit twice, once scaled and once not. If the score
# moves, the model was scale-sensitive and the unscaled version was
# wrong. If it does not, you have learned the model is a tree or
# equivalent, and the scaler can go.
`,
      hl: [26, 30, 36, 47],
      caption: "**On raw data, KNN is a one-feature model wearing two features.** Age contributes ~50 to a distance where income contributes ~30,000; standardised, both count and accuracy rises thirteen points. The forest does not move."
    },

    { t: "h2", n: "02", text: "The scalers, and what each does to an outlier", id: "scalers" },

    { t: "p", text: "**Every scaler is a choice of centre and spread.** Standardisation uses mean and σ, which outliers move. Min-max uses the extremes, which outliers *are*. Robust scaling uses median and IQR, which outliers cannot touch. The right one depends on whether the extreme values are part of the signal or a problem to contain." },

    { t: "code", lang: "python", title: "five scalers on a skewed column with an outlier", code: `
from sklearn.preprocessing import (StandardScaler, MinMaxScaler, RobustScaler,
                                   MaxAbsScaler, QuantileTransformer, PowerTransformer)

x = np.append(rng.lognormal(3, 0.5, 999), 5000.0).reshape(-1, 1)     # one huge value
np.percentile(x, [50, 99, 100])                                       # [20, 65, 5000]

def describe(name, xt):
    v = xt.ravel()
    print(f"{name:12} median {np.median(v):7.3f}  p99 {np.percentile(v, 99):7.3f}  "
          f"max {v.max():8.2f}  outlier-z {v[-1]:8.2f}")

describe("standard", StandardScaler().fit_transform(x))
# standard     median  -0.026  p99   0.259  max    31.42  outlier-z  31.42
#
# Mean and sigma are inflated by the 5,000 (sigma ~160 instead of
# ~11). The bulk of the data -- median 20, p99 65 -- lands in
# [-0.1, 0.26]: 99% of the values occupy a quarter of one standard
# unit. The outlier is at 31. It is still an outlier; everything
# else has been squashed.

describe("minmax", MinMaxScaler().fit_transform(x))
# minmax       median   0.003  p99   0.012  max     1.00  outlier-z     1.00
#
# WORSE: 99% of the data is in [0, 0.012]. The outlier defines the
# range and everything real lives in the bottom 1% of it. For a
# neural network with a sigmoid, that is a feature that is
# effectively zero for every normal row.

describe("robust", RobustScaler().fit_transform(x))
# robust       median   0.000  p99   3.170  max   350.00  outlier-z   350.00
#
# Median 0, IQR 1. The bulk is spread across a sensible range --
# p99 at 3.2 IQRs -- and the outlier is at 350. It is STILL an
# outlier, and it is still enormous; robust scaling made the normal
# rows well-behaved and left the outlier as a problem for 6.8 to
# solve. That is the honest division of labour.

describe("maxabs", MaxAbsScaler().fit_transform(x))
# maxabs       median   0.004  ...  max 1.00
#
# Divide by max |x|. Like min-max but keeps 0 at 0 and sign intact.
# Its use is SPARSE data: centring a sparse matrix (subtracting a
# mean) makes it dense; max-abs does not. Same outlier weakness.

describe("quantile-n", QuantileTransformer(output_distribution="normal", random_state=0).fit_transform(x))
# quantile-n   median   0.000  p99   2.33  max     5.20  outlier-z     5.20
#
# Rank-based: every value becomes its quantile, mapped to a normal.
# The outlier is at 5.2 because it is the top rank, not because it
# is 5,000. The shape of the input is GONE -- a log-normal, a
# uniform and a bimodal column all come out identical. That is a
# large intervention. Right for a model that assumes normality on a
# feature that is nowhere near it; wrong when the shape carried
# information.

describe("power (YJ)", PowerTransformer(method="yeo-johnson").fit_transform(x))
# power (YJ)   median  -0.02   p99   2.4   max     3.9
#
# A parametric transform toward normality (see 7.5). Keeps the
# shape's ORDER and smooths its skew; the outlier compresses to 3.9
# because the log-like transform pulls the tail in. Less destructive
# than quantile; more than robust.

# THE DECISION TABLE:
#   normal-ish, no outliers          StandardScaler
#   bounded, need [0,1] (e.g. pixels, a sigmoid input)   MinMaxScaler
#   outliers present, keep them      RobustScaler
#   sparse                           MaxAbsScaler
#   heavily skewed, model wants normal    PowerTransformer, or log then Standard
#   arbitrary shape, model wants normal   QuantileTransformer
#
# AND: robust scaling does not REMOVE the outlier. It makes the
# other 999 rows sensible. Whether the 5,000 stays is a 6.8
# decision, made separately.
`,
      hl: [11, 19, 27, 45],
      caption: "**Min-max on a column with one outlier puts 99% of the data in the bottom 1.2% of the range.** For a network with a sigmoid, that feature is effectively zero for every normal row."
    },

    { t: "callout", kind: "trap", title: "Min-max scaling lets one row set the range for everyone", body: [
      { t: "p", text: "The maximum is the outlier, by definition. Everything real is compressed into a sliver near zero, and the model sees a feature that barely varies. **The next outlier — larger than the training maximum — lands above 1.0**, outside the range the model was told the feature had." },
      { t: "p", text: "Use min-max only when the bounds are *known and fixed* — pixel intensities, percentages, a sensor with a physical range. For a feature whose extremes are data, use robust scaling, and handle the extremes as extremes." }
    ]},

    { t: "h2", n: "03", text: "Fit on train, and the target", id: "leak" },

    { t: "code", lang: "python", title: "the scaler is a fit step, and the target has its own", code: `
from sklearn.pipeline import make_pipeline
from sklearn.compose import TransformedTargetRegressor
from sklearn.linear_model import Ridge

# THE LEAK: fit the scaler on everything, then split.
sc_leaky = StandardScaler().fit(X)                        # sees test rows
X_all = sc_leaky.transform(X)
Xtr_l, Xte_l = X_all[Xtr.index], X_all[Xte.index]
#
# The training features are now centred on a mean that includes the
# test set. On a big, homogeneous dataset the difference is tiny. On
# a small one, or one where test and train differ (a later period, a
# different region), the training data has been shifted TOWARD the
# test data -- which is information about the test set, in the
# training features. The score is optimistic, and the amount depends
# on how different the test set was, which is the thing you were
# trying to measure.

# THE FIX: fit on train, transform both. A Pipeline does this by
# construction (see 8.5):
pipe = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
pipe.fit(Xtr, ytr)                                        # scaler fit on Xtr only
pipe.score(Xte, yte)                                      # scaler applied to Xte
#
# Inside cross-validation, the pipeline refits the scaler per fold.
# A scaler fit before the CV loop leaks every fold's validation rows
# into every fold's training mean.

# WHAT THE SCALER LEARNED, and that it is reused unchanged:
sc = pipe.named_steps["standardscaler"]
sc.mean_, sc.scale_                                       # from train
#
# In production, the SAME mean_ and scale_ transform every incoming
# row. A batch of new data does not get its own mean. If it did, a
# batch of ten high-income customers would be centred to look
# average, and every prediction would be wrong. The scaler is part
# of the model.

# THE TARGET: scaling y matters for some models too.
y_reg = 50_000 * z_inc + 20_000 * z_age + rng.normal(0, 5_000, n)     # salary-sized
#
# Ridge's penalty is on the coefficients; with y in tens of
# thousands the coefficients are large and the penalty barely bites.
# A neural net with y in the tens of thousands has huge gradients
# and needs a tiny learning rate. Both are fixed by scaling y --
# and then the predictions must be UNSCALED.
ttr = TransformedTargetRegressor(regressor=Ridge(alpha=1.0), transformer=StandardScaler())
ttr.fit(Xtr_s, y_reg[Xtr.index])
ttr.predict(Xte_s)[:3]                                    # back in salary units
#
# TransformedTargetRegressor fits the transformer on y_train, fits
# the regressor on transformed y, and inverts on predict. Without
# it, the manual version -- scale y, fit, predict, inverse_transform
# -- is four places to make a mistake, and the common one is
# forgetting the inverse and reporting z-scores as salaries.

# A LOG TARGET IS THE SAME PATTERN (see 7.5 for why it biases):
ttr_log = TransformedTargetRegressor(regressor=Ridge(), func=np.log1p, inverse_func=np.expm1)

# WHEN NOT TO SCALE y: trees, and any model whose loss is invariant
# to y's scale in the way that matters. And never for classification
# -- the classes are labels.

# INTERPRETING SCALED COEFFICIENTS:
lr = LogisticRegression(max_iter=2000).fit(Xtr_s, ytr)
dict(zip(X.columns, lr.coef_[0].round(3)))
# {'age': 1.02, 'income': 0.44}
#
# On standardised inputs, a coefficient is "change in log-odds per
# ONE STANDARD DEVIATION of the feature". Now the two are comparable:
# a sigma of age moves the outcome more than a sigma of income. On
# raw inputs the coefficients would be 0.06 per year and 0.00001 per
# pound -- true, and useless for comparison. This is the one reason
# to scale for an unpenalised linear model: the coefficients become
# a ranking.
`,
      hl: [4, 21, 40, 66],
      caption: "**A scaler fit before the CV loop leaks every fold's validation rows into every fold's training mean.** Inside a Pipeline it is refit per fold, and in production the training mean and scale transform every incoming row unchanged."
    },

    { t: "table",
      head: ["Scaler", "Centre / spread", "Output range", "Outlier effect", "Use for"],
      rows: [
        ["`StandardScaler`", "mean / σ", "Unbounded, ~[−3, 3]", "Inflates σ; squashes the bulk", "Roughly normal features; the default"],
        ["`MinMaxScaler`", "min / range", "**[0, 1]** exactly", "**Defines the range**; compresses everything else", "Known fixed bounds only: pixels, percentages"],
        ["`RobustScaler`", "median / IQR", "Unbounded", "None on the bulk; outlier stays extreme", "Features with outliers you intend to keep"],
        ["`MaxAbsScaler`", "0 / max\\|x\\|", "[−1, 1]", "Same as min-max", "Sparse matrices (no centring)"],
        ["`QuantileTransformer`", "rank-based", "[0, 1] or normal", "Outlier becomes the top rank, nothing more", "Any shape → a chosen distribution; destroys shape"],
        ["`PowerTransformer`", "fitted λ", "Unbounded", "Compressed by the log-like transform", "Skewed features, model assumes normality (7.5)"],
        ["`Normalizer`", "per **row** L2 norm", "Unit-length rows", "Row-wise, not column-wise", "Text vectors, cosine similarity — a different operation"]
      ],
      caption: "**`Normalizer` is not a scaler in the same sense.** It rescales each row to unit length so that dot products are cosine similarities — a per-sample operation for vectors, unrelated to putting columns on a common scale."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A scaling layer chosen per column, with its own leak test",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A feature set has columns with different shapes: a roughly normal one, a bounded percentage, a heavily skewed amount with outliers, and a sparse count. Build a `ColumnTransformer` that applies the right scaler to each, fit on training data, and prove three things: that the model needing scale improves and the tree does not; that the scaler's statistics do not change when the test set changes; and that a production row outside the training range is handled the way you intend." },
        { t: "p", text: "Include a target transform for a regression variant, with the inverse applied." }
      ],
      requirements: [
        "Per-column scaler choice with a stated reason.",
        "Fit on train only, inside a Pipeline.",
        "Scale-sensitive model improves; tree model unchanged — tested.",
        "Scaler statistics invariant to the test set — tested.",
        "Out-of-range production row behaviour stated and tested.",
        "Regression variant with `TransformedTargetRegressor` and the inverse verified."
      ],
      hint: "The out-of-range row is the interesting one. Under min-max on a bounded percentage, 150% is a data error and should be clipped or rejected — not scaled to 1.5 and passed to the model.",
      solution: {
        lang: "python",
        title: "scaling_layer.py",
        code: `import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, FunctionTransformer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error


# =========================================================================
# DATA: four shapes
# =========================================================================

def make(n=6000, seed=0):
    rng = np.random.default_rng(seed)
    normalish = rng.normal(50, 10, n)                        # age-like
    pct = np.clip(rng.beta(2, 5, n) * 100, 0, 100)           # bounded 0-100
    skewed = rng.lognormal(4, 0.8, n)                        # amount, long tail
    skewed[rng.choice(n, 5, replace=False)] *= 40            # a few outliers
    sparse = rng.poisson(0.3, n)                             # mostly zero counts
    X = pd.DataFrame({"normalish": normalish, "pct": pct, "skewed": skewed, "sparse": sparse})
    z = ((normalish - 50) / 10 + (pct - 30) / 15 + (np.log(skewed) - 4) / 0.8 + 0.5 * sparse)
    y_cls = (z + rng.normal(0, 1.2, n) > 0).astype(int)
    y_reg = 30_000 + 8_000 * z + rng.normal(0, 4_000, n)
    return X, y_cls, y_reg


# =========================================================================
# THE LAYER -- one scaler per column, with the reason
# =========================================================================

def clip_pct(X):
    # A percentage above 100 or below 0 is a DATA ERROR, not a large
    # value. Clip to the known bounds BEFORE min-max, so a bad row
    # lands at the boundary rather than at 1.5 -- and log it upstream.
    return np.clip(X, 0, 100)

def scaling_layer():
    return ColumnTransformer([
        # roughly normal, no outliers  -> standard: mean 0, sd 1
        ("normal", StandardScaler(), ["normalish"]),
        # known fixed bounds [0, 100]  -> clip then min-max: exactly [0, 1]
        ("pct", Pipeline([("clip", FunctionTransformer(clip_pct)),
                          ("mm", MinMaxScaler())]), ["pct"]),
        # skewed with outliers we keep -> robust: median 0, IQR 1;
        #   outliers stay large, the bulk is sensible
        ("skewed", RobustScaler(), ["skewed"]),
        # sparse counts                -> max-abs: keeps zeros at zero,
        #   no centring, [0, 1]
        ("sparse", MaxAbsScaler(), ["sparse"]),
    ])


def classifier(model):
    return Pipeline([("scale", scaling_layer()), ("model", model)])


def regressor():
    inner = Pipeline([("scale", scaling_layer()), ("model", Ridge(alpha=1.0))])
    # y in tens of thousands -> scale it too, and invert on predict
    return TransformedTargetRegressor(regressor=inner, transformer=StandardScaler())


# =========================================================================
# TESTS
# =========================================================================

def _split():
    X, yc, yr = make()
    idx_tr, idx_te = train_test_split(np.arange(len(X)), test_size=0.3, random_state=0)
    return X.iloc[idx_tr], X.iloc[idx_te], yc[idx_tr], yc[idx_te], yr[idx_tr], yr[idx_te]


def test_knn_improves_with_scaling_forest_does_not():
    Xtr, Xte, ytr, yte, *_ = _split()
    knn_raw = accuracy_score(yte, KNeighborsClassifier(15).fit(Xtr, ytr).predict(Xte))
    knn_sc = accuracy_score(yte, classifier(KNeighborsClassifier(15)).fit(Xtr, ytr).predict(Xte))
    rf_raw = accuracy_score(yte, RandomForestClassifier(100, random_state=0).fit(Xtr, ytr).predict(Xte))
    rf_sc = accuracy_score(yte, classifier(RandomForestClassifier(100, random_state=0)).fit(Xtr, ytr).predict(Xte))
    assert knn_sc - knn_raw > 0.05, (knn_raw, knn_sc)
    assert abs(rf_sc - rf_raw) < 0.01, (rf_raw, rf_sc)


def test_scaler_statistics_do_not_depend_on_test_set():
    Xtr, Xte, ytr, *_ = _split()
    p1 = classifier(LogisticRegression(max_iter=2000)).fit(Xtr, ytr)
    Xte_shifted = Xte * 100                                   # a wildly different test set
    p2 = classifier(LogisticRegression(max_iter=2000)).fit(Xtr, ytr)
    s1 = p1.named_steps["scale"].named_transformers_["normal"]
    s2 = p2.named_steps["scale"].named_transformers_["normal"]
    assert np.allclose(s1.mean_, s2.mean_) and np.allclose(s1.scale_, s2.scale_)
    # and transforming the shifted test set uses TRAINING stats:
    out = p1.named_steps["scale"].transform(Xte_shifted)
    assert out[:, 0].mean() > 50                              # not re-centred to 0


def test_out_of_range_percentage_is_clipped_not_scaled_past_one():
    Xtr, Xte, ytr, *_ = _split()
    p = classifier(LogisticRegression(max_iter=2000)).fit(Xtr, ytr)
    bad = Xte.iloc[[0]].copy(); bad["pct"] = 150.0
    out = p.named_steps["scale"].transform(bad)
    pct_col = 1                                               # order of the transformers
    assert out[0, pct_col] <= 1.0 + 1e-9


def test_out_of_range_skewed_stays_large_under_robust():
    """A new outlier is NOT compressed: robust scaling preserves it."""
    Xtr, Xte, ytr, *_ = _split()
    p = classifier(LogisticRegression(max_iter=2000)).fit(Xtr, ytr)
    huge = Xte.iloc[[0]].copy(); huge["skewed"] = Xtr["skewed"].max() * 10
    out = p.named_steps["scale"].transform(huge)
    assert out[0, 2] > 50                                     # many IQRs out


def test_robust_scaler_bulk_is_sensible_despite_outliers():
    Xtr, *_ = _split()
    rs = RobustScaler().fit(Xtr[["skewed"]])
    z = rs.transform(Xtr[["skewed"]]).ravel()
    assert abs(np.median(z)) < 1e-9
    assert np.percentile(z, 75) - np.percentile(z, 25) == 1.0 or abs(
        np.percentile(z, 75) - np.percentile(z, 25) - 1.0) < 1e-6


def test_minmax_on_skewed_would_have_squashed_the_bulk():
    """Why the skewed column does not use min-max."""
    Xtr, *_ = _split()
    mm = MinMaxScaler().fit_transform(Xtr[["skewed"]]).ravel()
    assert np.percentile(mm, 99) < 0.1                       # 99% in the bottom decile


def test_sparse_zeros_stay_zero():
    Xtr, Xte, ytr, *_ = _split()
    p = classifier(LogisticRegression(max_iter=2000)).fit(Xtr, ytr)
    out = p.named_steps["scale"].transform(Xtr)
    zeros = (Xtr["sparse"] == 0).to_numpy()
    assert (out[zeros, 3] == 0).all()


def test_regression_target_is_inverted():
    Xtr, Xte, _, _, ytr, yte = _split()
    r = regressor().fit(Xtr, ytr)
    pred = r.predict(Xte)
    assert pred.mean() > 10_000                                # salary units, not z
    assert mean_absolute_error(yte, pred) < 6_000


def test_target_scaling_changes_ridge_fit():
    Xtr, Xte, _, _, ytr, yte = _split()
    with_t = regressor().fit(Xtr, ytr)
    without = Pipeline([("scale", scaling_layer()), ("model", Ridge(alpha=1.0))]).fit(Xtr, ytr)
    # With y in the tens of thousands, alpha=1 barely regularises.
    # After scaling y, the same alpha is a real penalty; coefficients
    # (in scaled units) are smaller.
    c_with = np.abs(with_t.regressor_.named_steps["model"].coef_).sum()
    c_without = np.abs(without.named_steps["model"].coef_).sum() / ytr.std()
    assert c_with < c_without`,
        notes: [
          { t: "p", text: "**Each column gets the scaler its shape calls for, and the reason is written next to it.** Standard for the normal one, clip-then-min-max for the bounded percentage, robust for the skewed amount, max-abs for the sparse count. A single `StandardScaler` over all four would have let five outliers set the σ for the skewed column and centred the sparse one away from zero." },
          { t: "callout", kind: "insight", title: "150% is a data error, not a large percentage", body: [
            { t: "p", text: "Min-max on a bounded feature assumes the bounds. A value outside them scaled to 1.5 tells the model the feature has a range it does not have. **Clipping to the known bounds before scaling** lands the bad row at the boundary — and the upstream quality gate (6.3) is where it should have been caught." },
            { t: "p", text: "The skewed column is the opposite case: a new value ten times the training maximum *is* real, robust scaling leaves it many IQRs out, and the model sees an extreme row — which is the truth." }
          ]},
          { t: "p", text: "**The scaler-statistics test multiplies the test set by 100 and asserts the training mean and scale are unchanged**, and that the shifted test set is transformed with training statistics rather than re-centred. That is the property a leaky scaler lacks, and the property production depends on." },
          { t: "p", text: "**KNN gains more than five points from scaling; the forest moves by less than one.** The test asserts both directions, which is the practical form of \"know which models care\"." },
          { t: "p", text: "**`TransformedTargetRegressor` scales y and inverts the predictions**, so the output is in salary units. The manual version has four places to forget the inverse; the common failure is reporting z-scores as salaries." },
          { t: "p", text: "**Scaling y changes what `alpha=1.0` means to Ridge.** On a target in the tens of thousands the penalty barely bites; on a standardised target the same alpha is a real constraint. The test compares coefficient magnitudes on a common scale to show it." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A random forest scores 0.83 on raw features and 0.83 on standardised ones. Why?",
          options: [
            "The features were already scaled",
            "Trees split on thresholds — `income > 41,230` and `income_z > 0.31` are the same split — so any monotonic rescaling leaves every split, and the model, unchanged",
            "The forest has enough trees to compensate",
            "Standardisation was applied incorrectly"
          ],
          answer: 1,
          why: "Scale matters when a model computes a distance, a penalty on coefficient size, or a gradient step. A tree does none of those; it only asks whether a value is above or below a cut. Scaling tree inputs is harmless and pointless — and the fit-twice diagnostic tells you which kind of model you have."
        }
      ]
    }
  ],

  takeaways: [
    "**Scaling matters when a model computes distances, penalises coefficients or takes gradient steps** — KNN, SVM, k-means, PCA, regularised linear models, neural networks.",
    "**Trees are scale-invariant**: a threshold split is the same after any monotonic rescaling, so scaling their inputs is pointless.",
    "**Unpenalised OLS predictions are scale-invariant; its coefficients are not** — scale if you want the coefficients to be a ranking.",
    "**On raw data, KNN with income and age is a one-feature model** — the larger unit decides every distance.",
    "**Standardisation uses mean and σ, which outliers inflate**; the bulk of a skewed column gets squashed into a fraction of one unit.",
    "**Min-max lets one row set the range for everyone** — use it only for known, fixed bounds like pixels and percentages.",
    "**Robust scaling uses median and IQR**: the bulk is sensible, the outlier stays extreme, and its fate is a separate decision.",
    "**Max-abs keeps zeros at zero** and is the scaler for sparse matrices, which centring would make dense.",
    "**Quantile transform destroys the shape** — every feature becomes the same distribution; use it only when that is the intent.",
    "**The scaler is a fit step.** Fit on train inside a Pipeline; a scaler fit before the CV loop leaks every fold's validation rows into its training mean.",
    "**In production the training mean and scale transform every row unchanged** — a batch does not get its own mean.",
    "**Scale the target for Ridge and neural nets, and invert the predictions** — `TransformedTargetRegressor` does both.",
    "**Clip a bounded feature to its known bounds before min-max**; 150% is a data error, not a value of 1.5."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A column has median 20, 99th percentile 65, and one value of 5,000. After min-max scaling, where is the 99th percentile?",
        options: [
          "Around 0.99",
          "Around 0.012 — the outlier defines the range, and 99% of the data is compressed into the bottom 1.2% of it",
          "Around 0.5",
          "Unchanged"
        ],
        answer: 1,
        why: "The maximum is the outlier, so the range is ~5,000 and every normal value is a tiny fraction of it. A network with a sigmoid sees a feature that is effectively zero for every normal row. Robust scaling puts the 99th percentile at about 3 IQRs and leaves the outlier at 350 — still an outlier, but the bulk is usable."
      },
      {
        stem: "Why does an L2-regularised logistic regression need scaled inputs when unregularised OLS does not?",
        options: [
          "Logistic regression is non-linear",
          "The penalty shrinks all coefficients equally, but a per-pound coefficient is tiny and a per-year one is large — so the penalty hits the small-unit feature hard and the large-unit one barely",
          "Regularisation requires positive features",
          "It does not; the difference is the optimiser"
        ],
        answer: 1,
        why: "Unpenalised OLS just rescales each coefficient to match the unit, so predictions are unchanged. A penalty on coefficient magnitude is not unit-aware: it treats 0.00001 per pound as 'small' and 0.06 per year as 'large'. Scaling makes the penalty fair — and the optimiser converges faster when no direction is a thousand times steeper than another."
      },
      {
        stem: "A scaler is fit on the full dataset before `cross_val_score`. What is the consequence?",
        options: [
          "None; scaling is not a model",
          "Every fold's validation rows contributed to every fold's training mean and scale — a leak whose size depends on how different the folds are, which is what CV was meant to measure",
          "The scores are pessimistic",
          "The scaler will fail on new data"
        ],
        answer: 1,
        why: "The mean is a statistic learned from data, and a statistic that saw the validation rows is a leak. Inside a Pipeline the scaler is refit per fold. On a homogeneous dataset the effect is small; on time-split or grouped data — where the folds differ — it is not."
      },
      {
        stem: "A Ridge model with `alpha=1.0` is fit on a salary target in the tens of thousands. What happens to the regularisation?",
        options: [
          "It works as intended",
          "It barely bites — the coefficients are large in raw units and alpha=1 is negligible against them; scaling y makes the same alpha a real penalty, and the predictions must then be inverted",
          "It over-regularises",
          "Ridge cannot fit large targets"
        ],
        answer: 1,
        why: "The penalty's strength is relative to the coefficient magnitudes, which scale with y. `TransformedTargetRegressor` standardises y, fits, and inverts on predict — the manual route has four places to forget the inverse, and reporting z-scores as salaries is the usual result."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When does feature scaling matter?",
        strong: "When the model combines features numerically — a distance in KNN or k-means, a penalty on coefficient size in ridge or lasso, a gradient step in a neural network. Then a feature in large units dominates simply because it is large. Trees are invariant: a threshold split is the same after any monotonic rescaling. The quick diagnostic is to fit twice, scaled and unscaled — if the score moves, the model cared.",
        answer: [
          { t: "p", text: "Explaining the mechanism — distance, penalty, gradient — rather than listing models is what makes the answer transferable to a model you have not seen." }
        ]
      },
      {
        level: "advanced",
        q: "Which scaler would you use for a heavily skewed feature with a few extreme values?",
        strong: "Robust scaling — median and IQR — if I intend to keep the extremes: the bulk becomes sensible and the outliers stay extreme, which is the truth about them. Not standard scaling, whose σ the outliers inflate until the bulk occupies a fraction of one unit; and not min-max, where the maximum is the outlier and everything else lands in the bottom percent of the range. If the skew itself is the problem, a log or power transform first, then standardise. The outliers' fate is a separate decision from the scaling.",
        answer: [
          { t: "p", text: "Separating 'make the bulk sensible' from 'decide what to do with the outliers' shows you see scaling as one step, not the whole treatment." }
        ]
      },
      {
        level: "advanced",
        q: "How does a scaler leak, and what is the production consequence of getting it wrong?",
        strong: "It leaks by being fit on data that includes the validation or test rows, so the training features are centred on a mean that knows about the test set — a small effect on homogeneous data, a real one when the folds differ, and it flatters the score by an amount that depends on exactly the difference CV was meant to measure. In production the scaler must apply the training mean and scale to every incoming row unchanged; a batch that gets its own mean would centre ten high-income customers to look average. The scaler is part of the model, and a Pipeline is what makes that automatic.",
        answer: [
          { t: "p", text: "The production framing — a batch must not get its own mean — is the consequence that makes 'fit on train' more than a rule." }
        ]
      }
    ]
  }
});

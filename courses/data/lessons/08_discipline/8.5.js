/* ============================================================================
   LESSON 8.5 — Pipelines That Cannot Leak
   ========================================================================= */
EC.receiveLesson({
  id: "8.5",

  lede: "**'Fit on train, transform everywhere' is a rule people remember until the third refactor.** A `Pipeline` makes it structural: `fit` learns every statistic from the rows it is given and `predict` only ever applies them, so the test fold, the grid search and the serving endpoint all see the same fitted object. The work is in making every step obey the contract — including the ones you write yourself, and the ones that look stateless and are not.",

  objectives: [
    "State the fit/transform contract and why a Pipeline enforces it where discipline cannot",
    "Build a ColumnTransformer with per-type branches, named output columns and tunable nested parameters",
    "Write a custom transformer that learns state in fit, applies it in transform, and exposes feature names",
    "Recognise the stateless-looking transformer that recomputes statistics per batch, and test for it",
    "Know what a pipeline cannot do — drop rows, build as-of features, resample — and where those belong"
  ],

  prerequisites: ["7.4", "8.3"],

  blocks: [

    { t: "h2", n: "01", text: "The contract", id: "contract" },

    { t: "p", text: "A transformer has two methods with different rights. **`fit` may look at the rows it is given and remember things**: a median, a mean and standard deviation, a category list, a set of quantiles, a vocabulary. **`transform` may only apply what was remembered.** A `Pipeline` calls `fit_transform` on each step in turn during `fit`, and `transform` on each step during `predict` — so as long as every step honours the contract, the validation fold, the test set and tomorrow's request are all processed with statistics learnt from training rows alone." },

    { t: "dl", items: [
      ["Transformer", "An object with `fit(X, y=None)` returning `self` and `transform(X)` returning a new X of the same row count. `fit_transform` is the two in sequence, sometimes cheaper."],
      ["Estimator", "The final step: `fit(X, y)` and `predict(X)`. A Pipeline exposes the last step's methods and routes every earlier step through `transform`."],
      ["Learnt state", "Attributes set in `fit` and read in `transform`, named with a trailing underscore by convention: `mean_`, `categories_`, `quantiles_`. `check_is_fitted` looks for them."],
      ["Stateful versus stateless", "A log transform needs no memory; a scaler does. Anything that computes a statistic from the batch it is given is stateful, and must learn that statistic in `fit` — even if it can be written as one line."],
      ["ColumnTransformer", "Routes column subsets to different transformer branches and concatenates the results. The place where numeric, categorical, text and datetime columns each get their own treatment."],
      ["Nested parameter", "`pre__num__impute__strategy`: step names joined by double underscores address any parameter anywhere in the tree, which is what makes the whole pipeline tunable by one grid search."],
      ["`set_output(transform=\"pandas\")`", "Makes every transformer return a DataFrame with column names, so the output of the preprocessing is inspectable and `get_feature_names_out` is honoured end to end."]
    ]},

    { t: "viz",
      title: "Fit learns, transform applies",
      caption: "During fit, each step reads training rows and stores what it learnt; during predict, the same steps apply that state to whatever rows arrive. No step ever computes a statistic on the rows it is scoring.",
      svg: `<svg viewBox="0 0 880 330" role="img" aria-label="Pipeline diagram: a raw frame enters a ColumnTransformer with a numeric branch (impute, clip, scale) and a categorical branch (impute, one-hot), the branches concatenate into a model. Below, two lanes: fit, which learns medians, quantiles, means and category lists from training rows, and predict, which applies them.">
  <defs>
    <marker id="pl-ah-85" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <rect x="30" y="80" width="90" height="60" rx="6" style="fill:var(--ink-4);fill-opacity:.15;stroke:var(--line)" stroke-width="1"/>
  <text x="75" y="106" class="s-label" text-anchor="middle">raw</text>
  <text x="75" y="124" class="s-label" text-anchor="middle">frame</text>

  <rect x="150" y="30" width="470" height="160" rx="8" style="fill:none;stroke:var(--line)" stroke-width="1" stroke-dasharray="5 4"/>
  <text x="162" y="50" class="s-sub">ColumnTransformer</text>

  <g stroke-width="1">
    <rect x="170" y="62" width="120" height="40" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="310" y="62" width="120" height="40" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="450" y="62" width="120" height="40" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="170" y="126" width="120" height="40" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="310" y="126" width="120" height="40" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  </g>
  <g class="s-label" text-anchor="middle">
    <text x="230" y="80">impute</text><text x="230" y="95" class="s-sub">median_</text>
    <text x="370" y="80">clip</text><text x="370" y="95" class="s-sub">lo_, hi_</text>
    <text x="510" y="80">scale</text><text x="510" y="95" class="s-sub">mean_, scale_</text>
    <text x="230" y="144">impute</text><text x="230" y="159" class="s-sub">"missing"</text>
    <text x="370" y="144">one-hot</text><text x="370" y="159" class="s-sub">categories_</text>
  </g>
  <text x="160" y="118" class="s-sub" style="fill:var(--accent)">numeric</text>
  <text x="160" y="181" class="s-sub" style="fill:var(--accent)">categorical</text>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <path d="M120,110 L150,110 L150,82 L170,82" marker-end="url(#pl-ah-85)"/>
    <path d="M120,110 L150,110 L150,146 L170,146" marker-end="url(#pl-ah-85)"/>
    <line x1="290" y1="82" x2="310" y2="82" marker-end="url(#pl-ah-85)"/>
    <line x1="430" y1="82" x2="450" y2="82" marker-end="url(#pl-ah-85)"/>
    <line x1="290" y1="146" x2="310" y2="146" marker-end="url(#pl-ah-85)"/>
    <path d="M570,82 L600,82 L600,110 L650,110" marker-end="url(#pl-ah-85)"/>
    <path d="M430,146 L600,146 L600,110" />
  </g>
  <rect x="650" y="80" width="90" height="60" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)" stroke-width="1"/>
  <text x="695" y="106" class="s-label" text-anchor="middle">concat</text>
  <line x1="740" y1="110" x2="770" y2="110" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#pl-ah-85)"/>
  <rect x="770" y="80" width="80" height="60" rx="6" style="fill:var(--warn);fill-opacity:.15;stroke:var(--warn)" stroke-width="1"/>
  <text x="810" y="114" class="s-label" text-anchor="middle">model</text>

  <line x1="30" y1="215" x2="850" y2="215" style="stroke:var(--line)" stroke-width="1"/>
  <g class="s-label" style="font-weight:600">
    <text x="30" y="246" style="fill:var(--accent)">fit(X_train, y)</text>
    <text x="30" y="296" style="fill:var(--good)">predict(X_new)</text>
  </g>
  <g class="s-sub">
    <text x="200" y="246">each step: fit_transform on training rows → stores median_, lo_/hi_, mean_/scale_, categories_ → model.fit</text>
    <text x="200" y="296">each step: transform with the stored values — nothing is recomputed from X_new → model.predict</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "A full preprocessor, tunable end to end", id: "build" },

    { t: "p", text: "Real frames mix types, and each type needs its own chain. `ColumnTransformer` routes columns by name or by dtype selector into branches, each branch a `Pipeline`, and concatenates the outputs. **Because the branches are named, every parameter inside them has an address**, and one grid search can tune the imputation strategy, the rare-category threshold and the model's regularisation together — each candidate refit per fold, with nothing learnt from the validation rows." },

    { t: "code", lang: "python", title: "ColumnTransformer with typed branches, named outputs and a nested grid",
      hl: [24, 25, 27, 30, 40],
      code: `import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer, make_column_selector as selector
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

rng = np.random.default_rng(0)
n = 3_000
df = pd.DataFrame({
    "income": rng.lognormal(10.5, 0.5, n),
    "age":    rng.integers(18, 80, n).astype(float),
    "tenure": rng.exponential(4, n),
    "region": rng.choice(["north", "south", "east", "west", None], n, p=[.3, .3, .2, .15, .05]),
    "plan":   rng.choice(["basic", "plus", "pro"], n, p=[.6, .3, .1]),
})
df.loc[rng.random(n) < 0.08, "income"] = np.nan
logit = 0.8 * np.log(df.income.fillna(df.income.median())) - 8 + 0.02 * df.age + (df.plan == "pro") * 0.7
y = (logit + rng.logistic(0, 1, n) > 0).astype(int)

num = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
cat = Pipeline([("impute", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False, min_frequency=20))])
pre = ColumnTransformer([("num", num, selector(dtype_include="number")),
                         ("cat", cat, selector(dtype_include=object))],
                        remainder="drop", verbose_feature_names_out=False)
pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=1000))]).set_output(transform="pandas")

cv = StratifiedKFold(5, shuffle=True, random_state=0)
print(cross_val_score(pipe, df, y, cv=cv, scoring="roc_auc").mean().round(3))    # 0.78
# per fold: pre.fit_transform(train rows) -> clf.fit ; pre.transform(validation rows) -> clf.predict.
# the median, the means and standard deviations and the category lists come from training rows only.

pipe.fit(df, y)
print(list(pipe[:-1].get_feature_names_out()))
# ['income', 'age', 'tenure', 'region_east', 'region_missing', 'region_north', 'region_south', 'region_west',
#  'plan_basic', 'plan_plus', 'plan_pro']

grid = GridSearchCV(pipe, {"pre__num__impute__strategy": ["median", "mean"],
                           "pre__cat__onehot__min_frequency": [1, 20, 100],
                           "clf__C": [0.1, 1, 10]}, cv=cv, scoring="roc_auc").fit(df, y)
print(grid.best_params_)
# {'clf__C': 1, 'pre__cat__onehot__min_frequency': 20, 'pre__num__impute__strategy': 'median'}`,
      caption: "**One object, 18 candidates, five folds each — and in every one of the 90 fits the imputer, scaler and encoder learnt from training rows only.** `set_output(transform=\"pandas\")` keeps column names through the branches, so what the model saw is a frame you can open."
    },

    { t: "callout", kind: "insight", title: "Unknown categories and unseen missingness are the transform-time cases", body: [
      { t: "p", text: "The validation fold will contain a region the training fold never had, and a null in a column that had none. `handle_unknown=\"ignore\"` maps the new category to all zeros instead of raising; `min_frequency` folds rare categories into one column so the vocabulary is stable across folds; the constant imputer gives nulls a category of their own. **Every one of these is a decision about rows the transformer has not seen, and a pipeline is where those decisions are made once.**" }
    ]},

    { t: "h2", n: "03", text: "Custom transformers, and the one that looks stateless", id: "custom" },

    { t: "p", text: "Anything the library does not provide follows the same contract. Inherit `BaseEstimator` for `get_params`/`set_params` — which is what makes the grid search and `clone` work — and `TransformerMixin` for `fit_transform`. **`__init__` stores its arguments unchanged and does nothing else; `fit` computes and stores state with trailing-underscore names; `transform` checks it was fitted and applies.** Add `get_feature_names_out` so the frame keeps its names." },

    { t: "code", lang: "python", title: "A quantile clipper, a stateless log, and the FunctionTransformer that is not stateless",
      hl: [8, 12, 13, 24, 30, 33, 34],
      code: `from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import FunctionTransformer
from sklearn.utils.validation import check_is_fitted

class QuantileClipper(BaseEstimator, TransformerMixin):
    """Clip every column to quantiles learnt on the training rows."""
    def __init__(self, lower=0.01, upper=0.99):
        self.lower, self.upper = lower, upper            # store as given; no validation, no derived values

    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.lo_ = X.quantile(self.lower)                # learnt state: trailing underscore
        self.hi_ = X.quantile(self.upper)
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        return self

    def transform(self, X):
        check_is_fitted(self, "lo_")
        return pd.DataFrame(X).clip(self.lo_, self.hi_, axis=1)

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_

# stateless operations can be a FunctionTransformer: log1p has nothing to remember
log = FunctionTransformer(np.log1p, feature_names_out="one-to-one")

# the trap: a FunctionTransformer that computes a statistic recomputes it on every batch it is given
cols = ["income", "age", "tenure"]
tr, te = df[cols].fillna(0).iloc[:2400], df[cols].fillna(0).iloc[2400:]
bad_scale = FunctionTransformer(lambda X: (X - X.mean()) / X.std()).fit(tr)
good_scale = StandardScaler().fit(tr)

print(good_scale.transform(te)[:1].round(2))                       # [[ 0.31 -1.2   0.44]]
print(bad_scale.transform(te).to_numpy()[:1].round(2))             # [[ 0.27 -1.15  0.4 ]]  scaled against the test batch
print(bad_scale.transform(te.iloc[:10]).to_numpy()[:1].round(2))   # [[ 0.9  -0.7   1.1 ]]  and differently for a smaller batch
# the same row now has three values depending on who it arrived with. In production, batches are of one.`,
      caption: "**The lambda scaler gives one row three different outputs depending on its batch.** It never learnt anything, so it computes the mean and standard deviation of whatever it is handed — the validation fold during CV, and a single row in production, where the standard deviation is undefined. Any statistic goes in `fit`."
    },

    { t: "callout", kind: "trap", title: "The batch-invariance test", body: [
      { t: "p", text: "A correct transformer's output for one row depends on the fitted state and that row only. **`transform(X[:10])` must equal `transform(X)[:10]`**, exactly. A transformer that fails this is computing something from the batch — a mean, a rank, a quantile, a frequency — and it will leak in cross-validation and misbehave in serving. It is a two-line test and it belongs in the test suite for every custom transformer." }
    ]},

    { t: "h2", n: "04", text: "What a pipeline cannot do, and where that work goes", id: "limits" },

    { t: "p", text: "A pipeline is a chain of row-preserving transforms followed by a model. Three things fall outside it. **It cannot drop rows** — `transform` must return as many rows as it received — so deduplication, censoring of unclosed labels and outlier removal are upstream, before the split. **It cannot build point-in-time features** from other rows — the as-of aggregates of 7.8 and 8.3 are computed by the feature builder, per row, from that row's past, and the truncation test guards them. **It cannot resample** with scikit-learn's `Pipeline`, because resampling changes the row count; 8.6 uses `imblearn`'s pipeline, which allows it during `fit` only." },

    { t: "code", lang: "python", title: "Target transforms, caching, and shipping one object",
      hl: [6, 7, 11, 15, 16],
      code: `from sklearn.compose import TransformedTargetRegressor
from sklearn.linear_model import Ridge
import joblib

# target transforms live inside the object too: fit on log1p(y), predict through expm1 automatically
reg = TransformedTargetRegressor(regressor=Pipeline([("pre", pre), ("m", Ridge())]),
                                 func=np.log1p, inverse_func=np.expm1)
# (7.5's retransformation bias still applies -- expm1 of a mean log is a median, not a mean)

# expensive preprocessing cached across grid points: pre is fitted once per fold, reused for every clf__C
pipe_cached = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=1000))], memory="cache_dir")

# persistence: the validated object is the served object. Every learnt statistic travels inside it.
best = grid.best_estimator_
joblib.dump(best, "churn_pipeline.joblib")
served = joblib.load("churn_pipeline.joblib")
print(served.predict_proba(df.iloc[[0]])[:, 1].round(3))    # a batch of one, processed identically

# pin the version. A pickle written by scikit-learn 1.4 and loaded under 1.6 is not guaranteed to work,
# and a pipeline that loads but transforms differently is worse than one that fails.`,
      caption: "**The object that scored 0.78 in cross-validation is the object that serves.** No re-implementation of the preprocessing in another language, no hand-copied means; a training–serving skew is impossible by construction, and the version pin is what keeps that true after the next upgrade."
    },

    { t: "table",
      head: ["Task", "Inside the pipeline?", "Where it goes", "Why"],
      rows: [
        ["Impute, scale, encode, clip, select, reduce", "**Yes**", "Transformer steps", "Each learns from training rows and applies to any rows"],
        ["Target encoding (7.2)", "**Yes**, with internal OOF", "`TargetEncoder` step", "Fits on y, so it must be per-fold — the class handles the inner OOF itself"],
        ["Log / power transform of the target", "**Yes**", "`TransformedTargetRegressor`", "Inverse applied on predict, in one object"],
        ["Deduplicate, censor, drop outlier rows", "No", "Upstream, before the split", "Transform cannot change the row count"],
        ["As-of aggregates, lags, windows", "No", "Feature builder, per row from its past", "Depends on other rows and on time; guarded by the truncation test"],
        ["Oversample / undersample", "Not in sklearn's", "`imblearn.pipeline.Pipeline`", "Row count changes; allowed at fit only (8.6)"],
        ["Threshold choice", "No — after predict", "On validation predictions", "A decision about the score, not the features"]
      ]
    },

    { t: "ladder",
      title: "Preprocessing for a model with numeric and categorical columns",
      rungs: [
        { level: "bad", label: "Fit on everything, then split", code: `X_all = pd.get_dummies(df.fillna(df.median(numeric_only=True)))
X_all = (X_all - X_all.mean()) / X_all.std()
X_tr, X_te, y_tr, y_te = train_test_split(X_all, y)`,
          note: "**Medians, means, standard deviations and the dummy vocabulary all came from the test rows too.** The leak is mild for a scaler and total for a target encoder, and the serving code will have to reimplement every line." },
        { level: "ok", label: "Fit on train, apply to test by hand", code: `med = X_tr.median(); sc = StandardScaler().fit(X_tr.fillna(med))
X_te_p = sc.transform(X_te.fillna(med))
# ... and the dummies? and the unseen category in X_te? and the next step someone adds?`,
          note: "**Correct today.** It relies on every future edit remembering the order — and on serving code that mirrors it. The third change breaks it silently." },
        { level: "best", label: "One object, fitted per fold, shipped whole", code: `pipe = Pipeline([("pre", ColumnTransformer([("num", num, num_cols), ("cat", cat, cat_cols)])),
                 ("clf", LogisticRegression())]).set_output(transform="pandas")
cross_val_score(pipe, df, y, cv=cv)      # fit-on-train enforced, per fold
joblib.dump(pipe.fit(df, y), "model.joblib")`,
          note: "**The rule is in the structure, not in the reviewer's memory.** Unknown categories, unseen nulls and the batch of one are handled by the same object that produced the cross-validated number." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A preprocessor with its own leak tests",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "Build a full preprocessing pipeline — numeric branch with impute, a custom `QuantileClipper` and scaling; categorical branch with constant impute and one-hot — and a `check_pipeline()` that verifies three properties on a fitted copy: batch invariance, idempotence, and that `get_feature_names_out()` matches the output width. Then build a second pipeline whose clipper is a `FunctionTransformer` lambda computing quantiles on its input, and show which property it fails." },
        { t: "p", text: "Assert the good pipeline passes all three, the leaky one fails batch invariance, and the clipper's parameters are addressable through the nested-parameter path." }
      ],
      requirements: [
        "`QuantileClipper(BaseEstimator, TransformerMixin)` with `fit`, `transform`, `get_feature_names_out`, and `check_is_fitted`.",
        "`ColumnTransformer` with dtype selectors and `verbose_feature_names_out=False`; pipeline with `set_output(transform=\"pandas\")`.",
        "`check_pipeline(pipe, X_tr, y_tr, X_te)` returning the three booleans, on a `clone`.",
        "A leaky variant using `FunctionTransformer(lambda X: X.clip(X.quantile(.01), X.quantile(.99), axis=1))`.",
        "Assertions on both pipelines and on `\"pre__num__clip__upper\" in pipe.get_params()`."
      ],
      hint: "Batch invariance: `pre.transform(X_te.iloc[:25])` versus `pre.transform(X_te).iloc[:25]`, compared with `np.allclose(..., equal_nan=True)`. Use `clone` so the check never mutates the object you go on to fit. The leaky clipper computes its quantiles from the 25-row batch and from the full test set, and those differ.",
      solution: {
        lang: "python",
        title: "pipeline_checks.py",
        code: `import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin, clone
from sklearn.compose import ColumnTransformer, make_column_selector as selector
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler
from sklearn.utils.validation import check_is_fitted

rng = np.random.default_rng(0)
n = 3_000
df = pd.DataFrame({
    "income": rng.lognormal(10.5, 0.5, n),
    "age":    rng.integers(18, 80, n).astype(float),
    "tenure": rng.exponential(4, n),
    "region": rng.choice(["north", "south", "east", "west", None], n, p=[.3, .3, .2, .15, .05]),
    "plan":   rng.choice(["basic", "plus", "pro"], n, p=[.6, .3, .1]),
})
df.loc[rng.random(n) < 0.08, "income"] = np.nan
df.loc[rng.random(n) < 0.01, "income"] *= 40                      # a few extreme values to clip
logit = 0.8 * np.log(df.income.fillna(df.income.median()).clip(upper=2e5)) - 8 + 0.02 * df.age + (df.plan == "pro") * 0.7
y = (logit + rng.logistic(0, 1, n) > 0).astype(int)

class QuantileClipper(BaseEstimator, TransformerMixin):
    def __init__(self, lower=0.01, upper=0.99):
        self.lower, self.upper = lower, upper
    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.lo_, self.hi_ = X.quantile(self.lower), X.quantile(self.upper)
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        return self
    def transform(self, X):
        check_is_fitted(self, "lo_")
        return pd.DataFrame(X).clip(self.lo_, self.hi_, axis=1)
    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_

def build(clipper):
    num = Pipeline([("impute", SimpleImputer(strategy="median")), ("clip", clipper), ("scale", StandardScaler())])
    cat = Pipeline([("impute", SimpleImputer(strategy="constant", fill_value="missing")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False, min_frequency=20))])
    pre = ColumnTransformer([("num", num, selector(dtype_include="number")),
                             ("cat", cat, selector(dtype_include=object))], verbose_feature_names_out=False)
    return Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=1000))]).set_output(transform="pandas")

good  = build(QuantileClipper(0.01, 0.99))
leaky = build(FunctionTransformer(lambda X: X.clip(X.quantile(0.01), X.quantile(0.99), axis=1),
                                  feature_names_out="one-to-one"))

X_tr, X_te, y_tr, y_te = train_test_split(df, y, test_size=0.25, random_state=0, stratify=y)

def check_pipeline(pipe, X_tr, y_tr, X_te):
    """Three properties every leak-free preprocessor has."""
    fitted = clone(pipe).fit(X_tr, y_tr)
    pre = fitted[:-1]
    full = pre.transform(X_te)
    part = pre.transform(X_te.iloc[:25])
    again = pre.transform(X_te)
    return {
        # 1. a row's output depends on the fitted state and that row only
        "batch_invariant": np.allclose(full.iloc[:25].to_numpy(), part.to_numpy(), equal_nan=True),
        # 2. transforming twice gives the same answer: nothing learns during transform
        "idempotent":      np.allclose(full.to_numpy(), again.to_numpy(), equal_nan=True),
        # 3. the names describe the output
        "names_match":     len(pre.get_feature_names_out()) == full.shape[1],
    }

ok_good, ok_leaky = check_pipeline(good, X_tr, y_tr, X_te), check_pipeline(leaky, X_tr, y_tr, X_te)
print(ok_good)     # {'batch_invariant': True,  'idempotent': True, 'names_match': True}
print(ok_leaky)    # {'batch_invariant': False, 'idempotent': True, 'names_match': True}

cv = StratifiedKFold(5, shuffle=True, random_state=0)
print(cross_val_score(good, df, y, cv=cv, scoring="roc_auc").mean().round(3))    # 0.78

# --- assertions -------------------------------------------------------------
assert all(ok_good.values()),                       "the fitted clipper must be batch-invariant and idempotent"
assert not ok_leaky["batch_invariant"],             "the lambda clipper recomputes quantiles per batch"
assert "pre__num__clip__upper" in good.get_params(), "custom transformer params must be addressable for tuning"
assert good.fit(X_tr, y_tr).predict_proba(X_te.iloc[[0]]).shape == (1, 2), "a batch of one must work"
print("pipeline: contract verified")`,
        notes: [
          { t: "p", text: "**The good pipeline passes all three; the leaky one fails batch invariance and nothing else.** Its output for the first 25 test rows differs from the first 25 rows of the full transform, because the lambda took its quantiles from whichever rows it was handed. In cross-validation that is the validation fold; in serving it is a batch of one, where the 1st and 99th percentiles are the row itself and clipping does nothing." },
          { t: "p", text: "**Idempotence passes for both**, which is the point of having three checks: it catches a different fault — a transformer that updates state in `transform`, such as a running mean or a vocabulary that grows on new rows." },
          { t: "p", text: "**`pre__num__clip__upper` is addressable** because `__init__` stored its arguments verbatim. A transformer that derived something in `__init__` — `self.q = [lower, upper]` — would silently break `set_params` and the grid search would tune nothing." },
          { t: "p", text: "**The batch-of-one assertion is the serving contract**: what cross-validation scored is what the endpoint runs, on one row, with the same object." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`FunctionTransformer(lambda X: (X - X.mean()) / X.std())` is used as the scaling step in a Pipeline. Cross-validation runs without error. What is wrong?",
          options: [
            "Nothing — a Pipeline guarantees fit-on-train",
            "The lambda has no fitted state, so it computes the mean and standard deviation from every batch it transforms — the validation fold during CV, and a single row in production; the same row gets different values depending on its batch",
            "FunctionTransformer cannot be used inside a Pipeline",
            "The lambda should use median"
          ],
          answer: 1,
          why: "A Pipeline enforces the order of calls, not the contents of a step. A step that computes a statistic in transform is stateful by nature and stateless by implementation. The batch-invariance test — transform(X[:10]) equals transform(X)[:10] — catches it in two lines."
        }
      ]
    }
  ],

  takeaways: [
    "**`fit` may learn from its rows; `transform` may only apply.** A Pipeline calls them in the right order on the right rows, per fold, by construction.",
    "**Every statistic goes in `fit`** — a median, a mean, a quantile, a vocabulary. A one-line lambda that computes one is stateful and will leak.",
    "**Batch invariance is the test**: `transform(X[:10]) == transform(X)[:10]`. Idempotence is the second: `transform(X) == transform(X)` twice.",
    "**ColumnTransformer routes columns by type or name into branches**; `verbose_feature_names_out=False` and `set_output(transform=\"pandas\")` keep the output a readable frame.",
    "**Nested parameter names make the whole tree tunable** in one grid search, with every candidate refit per fold.",
    "**Unknown categories, unseen nulls and rare levels are transform-time decisions**: `handle_unknown=\"ignore\"`, constant imputation, `min_frequency`.",
    "**A custom transformer stores `__init__` arguments verbatim**, learns trailing-underscore state in `fit`, checks it in `transform`, and exposes `get_feature_names_out`.",
    "**A pipeline cannot drop rows, build as-of features or resample** — deduplication and censoring go upstream, point-in-time features in the feature builder, resampling in `imblearn`'s pipeline.",
    "**`TransformedTargetRegressor` keeps the target transform and its inverse in the one object**; retransformation bias still applies.",
    "**The validated object is the served object.** `joblib.dump` the fitted pipeline, pin the library version, and test the batch of one.",
    "**Threshold choice happens after `predict`**, on validation predictions — it is a decision about the score, not a transformer."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `__init__` in a custom transformer store its arguments unchanged and do nothing else?",
        options: [
          "Convention only",
          "`get_params`/`set_params` and `clone` read and write those attributes by name; deriving values in `__init__` means `set_params` changes an argument without changing the derived value, so grid search silently tunes nothing",
          "For speed",
          "Because fit will overwrite them"
        ],
        answer: 1,
        why: "BaseEstimator introspects the `__init__` signature and expects attributes of the same names. Derived state belongs in `fit`, with a trailing underscore, so it is recomputed on every clone and every fold."
      },
      {
        stem: "A validation fold contains a `region` value that never appeared in the training fold. What should the pipeline do, and where is that decided?",
        options: [
          "Raise an error — unseen data is a bug",
          "Map it to all-zero one-hot columns via `handle_unknown=\"ignore\"`; the decision lives in the encoder step so every fold and the serving path behave identically",
          "Refit the encoder on the validation fold",
          "Drop the row"
        ],
        answer: 1,
        why: "Transform-time rows will always contain things fit-time rows did not. Refitting on them is the leak the pipeline exists to prevent; dropping rows is impossible in transform. The encoder's unknown-handling makes the behaviour deterministic and shared."
      },
      {
        stem: "Which of these cannot be a step inside a scikit-learn `Pipeline`?",
        options: [
          "PCA with n_components tuned by grid search",
          "Removing duplicate rows before training",
          "A quantile clipper learnt on training rows",
          "A target encoder with internal out-of-fold fitting"
        ],
        answer: 1,
        why: "A step's transform must return one output row per input row, so row removal — deduplication, censoring, outlier deletion — is upstream, before the split. The other three learn in fit and apply in transform."
      },
      {
        stem: "A model is validated with a Python pipeline and served by a hand-written reimplementation of the preprocessing in another service. Where is the risk?",
        options: [
          "None, if the code review was careful",
          "Training–serving skew: every learnt statistic and every edge case — unknown category, null, rare level — must be reproduced exactly, and any drift between the two produces predictions the validation never measured",
          "Only latency",
          "Only in the model weights"
        ],
        answer: 1,
        why: "The pipeline's value is that the object that scored in CV is the object that serves. A reimplementation reintroduces the possibility of a silent mismatch; if it is unavoidable, the batch-of-one outputs of both paths are compared on a fixed sample in CI."
      },
      {
        stem: "What does `memory=\"cache_dir\"` on a Pipeline change?",
        options: [
          "It stores the model weights",
          "Fitted transformer steps are cached by their inputs and parameters, so a grid over the final estimator's parameters reuses the same fitted preprocessing per fold instead of refitting it for every candidate",
          "It enables out-of-core training",
          "It makes the pipeline deterministic"
        ],
        answer: 1,
        why: "Caching is a performance feature with no effect on correctness: the cached step was still fitted on that fold's training rows. It matters when preprocessing is the expensive part and the grid is over the model."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Why use a scikit-learn Pipeline rather than applying the steps in order yourself?",
        strong: "Because the rule — learn from training rows, apply to everything else — becomes structural. Pipeline.fit calls fit_transform on each step with the training rows and Pipeline.predict calls transform, so in cross-validation every fold refits the imputer, scaler, encoder and selector on that fold's training rows automatically, and a grid search can tune parameters anywhere in the tree with nested names. The same object is what I persist and serve, so there is no reimplementation and no training–serving skew, and edge cases like unknown categories are decided once, in the step. Doing it by hand is correct until someone adds a step in the wrong place, and nothing tells you.",
        answer: [
          { t: "p", text: "Structural enforcement, per-fold refitting, nested tuning, and one served object — four benefits, each of which a hand-rolled sequence lacks." }
        ]
      },
      {
        level: "expert",
        q: "What are the rules for a custom transformer, and what test would you write for it?",
        strong: "Inherit BaseEstimator and TransformerMixin; store __init__ arguments verbatim so get_params, set_params and clone work; learn state in fit with trailing-underscore attributes and return self; check_is_fitted in transform and apply only what was learnt; return the same number of rows; implement get_feature_names_out. The test I would always write is batch invariance — transform of the first ten rows equals the first ten rows of transform of everything — because it catches every transformer that computes a statistic from its input instead of from fit. Then idempotence, to catch state updated during transform, a check that set_params actually changes behaviour, and a batch-of-one call.",
        answer: [
          { t: "p", text: "The batch-invariance test is the answer that shows you have been bitten by a FunctionTransformer lambda." }
        ]
      },
      {
        level: "expert",
        q: "Where does resampling for class imbalance go, given a Pipeline cannot change the row count?",
        strong: "In imblearn's Pipeline, which allows a sampler step that runs during fit only — it resamples the training rows of each fold and is skipped at transform and predict, so the validation fold is scored at its natural balance. Putting SMOTE before the split, or in a scikit-learn pipeline via a transformer that returns extra rows, either leaks synthetic neighbours of validation rows into training or breaks the row-count contract. The same logic applies to anything that changes rows: it happens at fit time inside the fold, or upstream before any split, never in transform.",
        answer: [
          { t: "p", text: "Knowing that samplers run at fit only, and why, is the detail that separates recital from understanding — 8.6 builds on it." }
        ]
      }
    ]
  }
});

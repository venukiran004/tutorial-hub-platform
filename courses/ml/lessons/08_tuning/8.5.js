/* ============================================================================
   LESSON 8.5 — Custom Estimators, Persistence and the Production Template
   ========================================================================= */
EC.receiveLesson({
  id: "8.5",

  lede: "**Everything in this course has been a scikit-learn estimator — an object with `fit`, `transform` or `predict`, parameters in `__init__` and learned attributes ending in an underscore — and that contract is what lets a pipeline be cross-validated, searched, cloned, saved and reloaded as one thing.** This lesson writes two estimators of your own and runs them through `check_estimator` (a winsorising transformer, first time; a threshold-aware classifier, second time, after the check found a case the first version could not handle), then assembles the template every model in production should follow: preprocessing inside the pipeline, the search over preprocessing *and* model parameters together (`pre__num__clip__q_high` alongside `clf__C`), calibration on the winner, one artefact with a manifest, a golden-set check on reload, and an ONNX export whose predictions match to 6 × 10⁻⁸ and run in 0.36 ms against 14 ms. Two things the tooling reveals along the way: a custom step needs its own ONNX converter, and a pickle is executable code.",

  objectives: [
    "Write a transformer and a classifier that pass check_estimator, and explain the conventions that make clone, get_params and the search work",
    "Assemble the production template: ColumnTransformer preprocessing, a joint search, calibration, a refit on all rows",
    "Persist a pipeline with joblib and a manifest, verify it on reload, and state the version and security rules",
    "Export to ONNX, check parity and latency, and know what blocks the export"
  ],

  prerequisites: ["3.5", "3.6", "8.1", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "The estimator contract", id: "contract" },

    { t: "code", lang: "python", title: "A transformer that passes check_estimator (executed; scikit-learn 1.8)",
      hl: [3, 4, 6, 7, 9, 12],
      code: `class Winsorizer(TransformerMixin, BaseEstimator):                      # mixin first, BaseEstimator last: the MRO the checks expect
    """Clip each column to the [q_low, q_high] quantiles learned in fit."""
    def __init__(self, q_low=0.01, q_high=0.99):
        self.q_low = q_low; self.q_high = q_high                            # store EXACTLY what was passed: get_params/set_params/clone read these
    def fit(self, X, y=None):
        X = validate_data(self, X, reset=True, ensure_all_finite=True)      # sets n_features_in_ (and feature_names_in_ for DataFrames)
        self.lower_ = np.quantile(X, self.q_low, axis=0); self.upper_ = np.quantile(X, self.q_high, axis=0)     # learned state: trailing underscore
        return self                                                          # fit returns self: that is what lets fit_transform and pipelines chain
    def transform(self, X):
        check_is_fitted(self); X = validate_data(self, X, reset=False, ensure_all_finite=True)      # reset=False: reject a different column count
        return np.clip(X, self.lower_, self.upper_)
    def get_feature_names_out(self, input_features=None): ...                # so ColumnTransformer can name its outputs

check_estimator(Winsorizer())                                               # passed: ~80 checks -- cloning, pickling, NaN handling, shape errors, dtype, idempotence
clone(Winsorizer(q_low=0.05)).get_params()   ->  {'q_high': 0.99, 'q_low': 0.05}, unfitted      # a clone is a fresh copy with the same parameters and no learned state`,
      caption: "Every convention has a consumer. Parameters stored untouched in `__init__` are what `get_params` reads to clone the estimator inside cross-validation and what `set_params` writes when a search sets `clip__q_high`. Learned attributes with a trailing underscore are what `check_is_fitted` looks for and what the pickle carries. `validate_data` records the input shape so that a transform on the wrong number of columns fails loudly. `check_estimator` runs the whole contract and is worth a minute of a test suite for any estimator that will live in a pipeline."
    },

    { t: "code", lang: "python", title: "A classifier with a business threshold — and the case the first version failed (executed)",
      hl: [4, 5, 9, 10, 13],
      code: `class ThresholdedLogistic(ClassifierMixin, BaseEstimator):
    """Logistic regression whose predict() uses a chosen probability threshold instead of 0.5."""
    def __init__(self, C=1.0, threshold=0.5): self.C = C; self.threshold = threshold
    def fit(self, X, y):
        X, y = validate_data(self, X, y, reset=True); self.classes_ = unique_labels(y)        # classes_ is mandatory for a classifier
        self.model_ = LogisticRegression(C=self.C, max_iter=1000).fit(X, y) if len(self.classes_) > 1 else None
        return self
    def predict_proba(self, X):
        check_is_fitted(self); X = validate_data(self, X, reset=False)
        return self.model_.predict_proba(X) if self.model_ is not None else np.ones((len(X), 1))     # one class seen: probability 1 for it
    def predict(self, X):
        p = self.predict_proba(X)
        if p.shape[1] == 1: return np.full(len(p), self.classes_[0])
        return self.classes_[(p[:, 1] >= self.threshold).astype(int)] if p.shape[1] == 2 else self.classes_[p.argmax(1)]

# first version raised ValueError('binary only') when fit saw one class:  check_estimator failed -- "Classifier can't train when only one class is present"
# second version (above): check_estimator passed.  A fold of a tiny or heavily imbalanced dataset CAN contain one class; the contract requires surviving it.`,
      caption: "The threshold is a *parameter* — it lives in `__init__`, so a grid search can tune `threshold` alongside `C`, and 8.2's cost-derived cut-off becomes part of the model rather than a number in a notebook. The failure the check caught is the kind that appears in production at 3 a.m.: a retraining batch with no positives. `check_estimator` is cheap insurance against the cases you did not think of."
    },

    { t: "code", lang: "python", title: "Two classic mistakes, and what the check says (executed)",
      code: `class BadParams(TransformerMixin, BaseEstimator):
    def __init__(self, q=0.9): self.q_ = q * 2          # transforms the argument and stores it under another name
# check_estimator: "Cloning of BadParams failed with error: 'BadParams' object has no attribute 'q'"  -- clone reads get_params() -> q, which was never stored

class NoValidate(TransformerMixin, BaseEstimator):
    def fit(self, X, y=None): self.m_ = np.mean(X, axis=0); return self      # no validate_data
# check_estimator: "NoValidate.fit() does not set the n_features_in_ attribute. You might want to use sklearn.utils.validation.validate_data"`,
      caption: "Both mistakes work perfectly in a notebook and fail inside `GridSearchCV`, which is where they are found without the check. The rule that prevents the first: `__init__` does nothing but assign. The rule that prevents the second: every `fit` and every `transform`/`predict` calls `validate_data`."
    },

    { t: "dl", items: [
      ["BaseEstimator", "Provides get_params / set_params / clone / repr from the `__init__` signature. Nothing else: your class supplies fit and the rest."],
      ["Mixins", "TransformerMixin adds fit_transform and set_output; ClassifierMixin adds score (accuracy) and the classifier tags; RegressorMixin adds score (R²). Mixins go before BaseEstimator in the class list."],
      ["Trailing underscore", "The convention for learned attributes (coef_, lower_, classes_). check_is_fitted looks for them; clone drops them; the pickle carries them."],
      ["validate_data", "Converts input, checks finiteness and shape, records n_features_in_ and feature_names_in_ on fit (reset=True) and enforces them afterwards (reset=False)."],
      ["check_estimator", "Runs the API conformance suite: clone, pickle, dtype, NaN, wrong shapes, idempotence, one-class fits. `parametrize_with_checks` turns it into pytest cases."],
      ["__sklearn_tags__", "Declares what the estimator supports (NaN input, multi-class, sparse) so the checks and meta-estimators behave accordingly. Needed when you accept NaN (3.6)."],
      ["Manifest", "Metadata saved beside the model: library versions, feature list, training date and rows, CV score, parameters, a hash. The artefact's passport."],
      ["ONNX", "A portable graph format for inference; skl2onnx converts standard scikit-learn steps, onnxruntime runs them in any language at a fraction of the latency."]
    ]},

    { t: "h2", n: "02", text: "The template, end to end", id: "template" },

    { t: "code", lang: "python", title: "Churn, the production way (executed; 989 rows with the 999 outlier and 126 missing tickets left in)",
      hl: [1, 2, 3, 4, 6, 7, 9, 12, 13],
      code: `pre = ColumnTransformer([("num", Pipeline([("impute", SimpleImputer(strategy="median", add_indicator=True)),      # missingness becomes a column
                                          ("clip", Winsorizer(0.01, 0.99)),                                        # the 999 fee is clipped INSIDE the fit
                                          ("scale", StandardScaler())]), num),
                         ("cat", OneHotEncoder(handle_unknown="ignore", drop="first", sparse_output=False), cat)])   # unseen categories -> all zeros, not a crash
pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=2000))])
search = GridSearchCV(pipe, {"clf__C": [0.01, 0.1, 1, 10], "pre__num__clip__q_high": [0.99, 0.995, 1.0]},              # preprocessing AND model parameters, one search
                      cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="neg_log_loss", n_jobs=4).fit(Xtr, ytr)
# best {'clf__C': 0.1, 'pre__num__clip__q_high': 1.0}   CV log-loss 0.3826   (q_high = 1.0: the clipper's upper bound is not needed once the outlier's fee is standardised... but see below)
cal = CalibratedClassifierCV(clone(search.best_estimator_), method="isotonic", cv=5).fit(Xtr, ytr)                    # calibration on internal folds of the training set
# test (248 rows):   raw pipeline  AUC 0.7261  log-loss 0.3977  Brier 0.1226      calibrated  AUC 0.7177  log-loss 0.4093  Brier 0.1254
# feature names out: num__tenure_months ... num__missingindicator_support_tickets, cat__plan_plus, cat__plan_pro, ... (13 columns)
# the 999 outlier after the fitted preprocessor: 2.34 standardised units (q_high 1.0 means no clipping; the median-based scaler is what tamed it)`,
      caption: "Three things this template guarantees that a notebook does not. Every learned quantity — medians, quantiles, means and sds, category lists — is fitted on the training fold only, because it is inside the estimator that cross-validation clones. Preprocessing choices are searched with the model's, in one grid, with the double-underscore path naming each. And the artefact is one object that takes the raw DataFrame and returns a probability, so the serving code cannot drift from the training code. The calibration row is honest too: on 742 training rows isotonic calibration cost a little log-loss on the test slice — a reminder to keep the check, and to prefer Platt or none when the data are small."
    },

    { t: "callout", kind: "production", title: "The template as a checklist", body: [
      { t: "p", text: "**1.** Raw columns in, probability out: all preprocessing inside the estimator. **2.** `handle_unknown` and `add_indicator` set: new categories and missing values are handled, not fatal. **3.** One search over preprocessing and model parameters, nested if the score will be reported (8.1). **4.** Calibration on internal folds if probabilities are the product (2.5). **5.** Refit the chosen configuration on all training rows. **6.** Evaluate once on a slice nothing touched, with the metric that matters and the threshold from costs (8.2). **7.** Save one artefact with a manifest; verify on reload with a golden set. **8.** Log versions, seed, data hash, feature list, and the runner-up (8.4). **9.** Decide the serving format from the latency budget (joblib in-process, ONNX for speed and portability). **10.** Hand the monitoring plan to 11.1 with the training distribution attached." }
    ]},

    { t: "h2", n: "03", text: "Persistence: joblib, the manifest, the reload check", id: "persistence" },

    { t: "code", lang: "python", title: "Save, hash, reload, verify (executed)",
      hl: [1, 4, 6, 7],
      code: `artefact = {"model": cal, "sklearn": "1.8.0", "numpy": "2.4.4", "python": "3.11.3", "features": num + cat, "trained_at": "2026-09-17",
            "train_rows": 742, "cv_log_loss": 0.3826, "params": {"clf__C": 0.1, "pre__num__clip__q_high": 1.0}}
joblib.dump(artefact, "churn_v2.joblib", compress=3)                  # 6 KB; sha256 88fa62104ebc...
back = joblib.load("churn_v2.joblib")
np.allclose(back["model"].predict_proba(X_test)[:, 1], p_cal)          # True: the reload is bit-for-bit the model that was evaluated
np.allclose(back["model"].predict_proba(golden_rows)[:, 1], golden_predictions)     # True: five rows and their expected outputs, shipped with the artefact
# latency, joblib in-process: one row 108 ms (pandas -> ColumnTransformer -> isotonic overhead), 248 rows 40 ms`,
      caption: "A pickle reproduces the object exactly, in the same library versions; across versions it may load with silently different behaviour or not load at all, which is why the versions are *in* the artefact and why a golden set — a handful of rows with their expected outputs — is checked at every load. The one-row latency is the price of the DataFrame-and-pipeline path: fine for batch, wrong for a request path, and the reason the next block exists."
    },

    { t: "callout", kind: "warn", title: "A pickle is code", body: [
      { t: "p", text: "`joblib.load` and `pickle.load` execute whatever the file tells them to. A model file from an untrusted source is a remote-code-execution vector, and a model file from a trusted source that has been tampered with is the same. Store artefacts where only the training pipeline can write, record the hash in the manifest and check it before loading, and never load a `.joblib` that arrived by e-mail. For sharing across trust boundaries — or languages — export to ONNX or another data-only format." }
    ]},

    { t: "h2", n: "04", text: "ONNX: portable, fast, and picky", id: "onnx" },

    { t: "code", lang: "python", title: "Export the standard pipeline; check parity and latency (executed)",
      hl: [4, 7, 8, 11],
      code: `inputs = [(c, FloatTensorType([None, 1])) for c in num] + [(c, StringTensorType([None, 1])) for c in cat]
onx = convert_sklearn(pipe, initial_types=inputs, target_opset=15, options={id(pipe["clf"]): {"zipmap": False}})
sess = onnxruntime.InferenceSession("churn.onnx", providers=["CPUExecutionProvider"])
# parity with scikit-learn on 248 test rows:  max |p_onnx − p_sklearn| = 6.1 × 10⁻⁸       (21 rows with missing tickets: handled by the imputer op)
# latency:  248 rows 2.06 ms;  one row 0.36 ms  --  against 14.3 ms for the scikit-learn pipeline on one row (40×)
# file: 2 KB; runs from C++, Java, JavaScript, Rust ... with no scikit-learn installed

# what blocked the first attempt:  convert_sklearn(pipeline_with_Winsorizer)
#   -> "Unable to find a shape calculator for type Winsorizer. It usually means the pipeline being converted contains a transformer or a predictor
#       with no corresponding converter"      custom steps need a registered converter (skl2onnx.update_registered_converter) or must be replaced
#       by standard ops before export`,
      caption: "ONNX turns the fitted pipeline into a graph of standard operators — impute, scale, one-hot, matrix multiply, sigmoid — that any runtime can execute; the parity check says the graph is the model, and the latency says why you would bother. The catch is that the converter only knows standard estimators: the custom winsorizer that passed `check_estimator` has no ONNX shape calculator, and the export fails until you write one or express the step in standard operators. Decide the serving format before writing custom steps."
    },

    { t: "table",
      head: ["Format", "Carries", "Needs at serve time", "Cross-version", "Cross-language", "Security", "Use for"],
      rows: [
        ["joblib / pickle", "The Python object graph: everything, including custom code", "Same scikit-learn, numpy and your module", "Fragile: pin versions, test on load", "No", "Executes code on load", "Batch scoring in the training environment; short-lived artefacts"],
        ["ONNX", "A graph of standard ops with weights", "onnxruntime only", "Stable (opset-versioned)", "Yes", "Data only", "Request-path serving, edge, other languages; latency 40× lower here"],
        ["PMML", "An XML description of standard models", "A PMML engine", "Stable", "Yes", "Data only", "Legacy enterprise scoring engines"],
        ["Native (xgboost/lightgbm save_model)", "The trees, as JSON or binary", "The library", "Good within the library", "Yes for the library's bindings", "Data only", "Boosted models; preprocessing must be handled separately"]
      ]
    },

    { t: "ladder",
      title: "Shipping the churn model to a service that scores each login in under 5 ms",
      rungs: [
        { level: "bad", label: "Pickle the model, load it in the service, rebuild the features by hand", code: `joblib.dump(clf, "model.pkl")      # the scaler, the imputer and the one-hot columns live in the notebook; the service reimplements them`,
          note: "**Training–serving skew by construction**: the service's features drift from the training features the first time anyone edits either. And 108 ms a row." },
        { level: "ok", label: "Pickle the whole pipeline with a manifest and a golden set", code: `joblib.dump({"model": pipeline, "sklearn": ..., "features": ..., "golden": (rows, preds)}, "churn_v2.joblib")`,
          note: "**One artefact, verified on load, no skew.** Still 100 ms per row through pandas and the ColumnTransformer, and still executable code." },
        { level: "best", label: "Standard steps only, ONNX export, parity test in CI, joblib kept for batch and audit", code: `# pipeline of standard estimators (or custom steps with registered converters) -> convert_sklearn -> churn_v2.onnx
# CI: max |p_onnx − p_sklearn| < 1e-6 on the golden set; latency budget asserted (0.36 ms measured)
# manifest with sklearn/onnx/opset versions, data hash, feature list; the joblib artefact archived for retraining and 9.2's explanations`,
          note: "**A data-only graph that any runtime executes in a third of a millisecond, proven equal to the model that was evaluated** — and the Python artefact kept where Python is needed." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An estimator of your own, the template on spend, and an artefact you must break and fix",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Write `RatioFeatures(TransformerMixin, BaseEstimator)` that appends the ratio of two named columns (with a learned fill for division by zero: the training median of the ratio) and passes `check_estimator`; then write the version that fails it by computing the fill in `__init__`. **(b)** Build the spend template: ColumnTransformer with the engineered column fee × min(tenure, 12) × (1 − discount) as a `FunctionTransformer` step, a ridge regressor, a search over `alpha` and the clipping quantile, a refit, a joblib artefact with a manifest, and a golden-set check; report the test MAE. **(c)** Corrupt the artefact deliberately three ways — reorder two feature columns, drop a category from the categorical column, change one library version in the manifest — and describe what each does at load and at predict, and which check catches it." }
      ],
      requirements: [
        "(a) the passing class, the failing class, and the check's message.",
        "(b) the template's test MAE and the manifest contents.",
        "(c) three failure descriptions and the catching check."
      ],
      hint: "(a) Learned fill → trailing underscore, computed in fit. (b) `FunctionTransformer(lambda X: ...)` cannot be pickled with a lambda: use a named function. (c) A DataFrame pipeline checks `feature_names_in_`; a numpy one does not.",
      solution: {
        lang: "python",
        title: "production_practice.py",
        code: `# (a) executed: passes check_estimator
class RatioFeatures(TransformerMixin, BaseEstimator):
    def __init__(self, num_col=0, den_col=1): self.num_col = num_col; self.den_col = den_col
    def _ratio(self, X):                                                   # the checks feed 1-column inputs: guard, do not crash
        if X.shape[1] <= max(self.num_col, self.den_col): return None
        den = X[:, self.den_col]; return X[:, self.num_col] / np.where(den == 0, np.nan, den)
    def fit(self, X, y=None):
        X = validate_data(self, X, reset=True); r = self._ratio(X); m = np.nanmedian(r) if r is not None else np.nan
        self.fill_ = float(m) if np.isfinite(m) else 0.0; return self          # the learned fill: underscore, set in fit
    def transform(self, X):
        check_is_fitted(self); X = validate_data(self, X, reset=False); r = self._ratio(X)
        return X if r is None else np.c_[X, np.where(np.isfinite(r), r, self.fill_)]
# the failing version:  def __init__(self, num_col=0, den_col=1, fill=None): ...; self.fill_ = fill or 0.0
#   check_estimator: "Cloning of RatioBad failed with error: 'RatioBad' object has no attribute 'fill'"  -- a parameter renamed and pre-computed in __init__
# (the first draft of the passing version also failed, on a 1-column input: index 1 out of bounds -- hence the guard)

# (b) executed, 75/25 split, the 999-fee outlier in the TRAINING rows
def engineered(X): X = np.asarray(X, dtype=float); return (X[:, 1] * np.minimum(X[:, 0], 12) * (1 - X[:, 2]/100))[:, None]     # named, so it pickles
# first attempt: ColumnTransformer with the engineered branch on RAW columns and the clipper only on the scaled branch
#   CV MAE 29.94   test MAE 19.61       <- one leverage row (fee 999 -> engineered value ~12,000, spend ordinary) wrecked the ridge fit (4.2)
# corrected: clip FIRST, then branch
pipe = Pipeline([("clip", Winsorizer(0.01, 0.99)), ("pre", FeatureUnion([("eng", FunctionTransformer(engineered)), ("scale", StandardScaler())])), ("reg", Ridge())])
GridSearchCV(pipe, {"reg__alpha": [0.1, 1, 10], "clip__q_high": [0.99, 1.0]}, cv=KFold(5, shuffle=True, random_state=0), scoring="neg_mean_absolute_error")
#   best {clip__q_high 0.99, alpha 10}   CV MAE 6.46   test MAE 6.42       (noise floor 6.38)
#   artefact 3.2 KB; reload golden check True; manifest: versions, features, trained_at, train_rows, cv_mae, params, sha256, golden rows + predictions

# (c) executed on the artefact above
#   reordered DataFrame columns:  raises "The feature names should match those that were passed during fit. Feature names must be in the same
#                                 order" -- the Winsorizer's validate_data recorded feature_names_in_. (A ColumnTransformer selecting by NAME
#                                 would silently reorder correctly instead.)
#   the same rows as a numpy array, reordered:  predicts [168.9, 83.4] against the correct [98.2, 79.7] -- no names, no error, wrong numbers.
#                                 Only the golden set catches it.
#   dropped category (churn template):  OneHotEncoder(handle_unknown="ignore") emits all-zero columns: no error, a quiet shift for those rows;
#                                 a category-frequency monitor (11.1) is the catch.
#   version mismatch:  joblib may warn ("Trying to unpickle estimator ... from version 1.8.0"), fail, or load and behave differently; the manifest
#                                 comparison at load catches it before any prediction is made.`,
        notes: [
          { t: "p", text: "**(a)** is the contract in miniature: parameters untouched, learned state underscored, inputs validated — and the exact error the check gives when the first rule is broken." },
          { t: "p", text: "**(b)** puts the course's best spend model into the shape it would ship in — and shows the order of steps mattering: a clipper on the wrong branch let one leverage row take the MAE from 6.4 to 29.9." },
          { t: "p", text: "**(c)** is why the artefact carries a golden set and a manifest: the numpy reorder and the dropped category produce no error at all, and the version mismatch may not either." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The first ThresholdedLogistic raised an error when fit saw a single class, and check_estimator rejected it. Why is that a real requirement rather than pedantry?",
          options: [
            "Because scikit-learn does not allow errors in fit",
            "Because a fold of a small or heavily imbalanced dataset, or a retraining batch in production, can genuinely contain one class; an estimator inside a pipeline must survive that (predict the class it saw) rather than crash the whole cross-validation or the nightly job. The check enumerates the cases you did not think of, which is what makes it worth a minute of a test suite",
            "Because classifiers must support multi-class",
            "Because predict_proba must always return two columns"
          ],
          answer: 1,
          why: "The contract exists so that meta-estimators can rely on it; the check is the contract made executable."
        }
      ]
    }
  ],

  takeaways: [
    "**The estimator contract**: parameters assigned untouched in `__init__`, learned state with a trailing underscore set in `fit`, `validate_data` in fit and transform/predict, `fit` returns self, mixins before BaseEstimator.",
    "**check_estimator is executable documentation**: the winsorizer passed; the classifier failed once (one-class fit) and passed after handling it; `__init__` that transforms arguments breaks clone; no validation breaks n_features_in_.",
    "**Parameters are searchable**: a business threshold in `__init__` becomes `threshold` in a grid; preprocessing and model parameters share one search (`pre__num__clip__q_high` with `clf__C`).",
    "**The template**: raw columns in, probability out; imputation with indicators, clipping, scaling and encoding inside; handle_unknown set; calibration on internal folds; refit on all rows; one evaluation on an untouched slice.",
    "**Calibration is checked, not assumed**: isotonic on 742 rows cost log-loss on the test slice (0.3977 → 0.4093).",
    "**One artefact with a manifest**: versions, features, date, rows, CV score, parameters, hash; a golden set verified on every load (True).",
    "**A pickle is code**: load only from a trusted, hash-checked source; pin versions; expect cross-version breakage.",
    "**ONNX**: parity 6 × 10⁻⁸, one row in 0.36 ms against 14.3 ms, 2 KB, any language — and custom steps need registered converters or the export fails.",
    "**Latency decides the format**: joblib in-process for batch (40 ms per 248 rows), ONNX for the request path.",
    "**The artefact is finished when it can be reloaded, verified and served without the notebook** — and monitored (11.1)."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What are the rules a custom estimator must follow, and what consumes each rule?",
        options: [
          "Inherit from BaseEstimator and define fit",
          "`__init__` assigns its arguments unchanged (get_params/set_params/clone read them — a search sets them by name); learned state carries a trailing underscore and is set in fit (check_is_fitted, clone, pickling); fit and transform/predict call validate_data (n_features_in_ and shape enforcement); fit returns self (pipelines and fit_transform); mixins precede BaseEstimator; classifiers set classes_; tags declare NaN or multi-class support",
          "Define fit, predict and score",
          "Store all attributes with underscores"
        ],
        answer: 1,
        why: "Each rule fails somewhere specific — usually inside GridSearchCV — when broken; check_estimator finds it first."
      },
      {
        stem: "Why should preprocessing live inside the pipeline that is saved, rather than in the serving code?",
        options: [
          "Because pipelines are faster",
          "Because the learned preprocessing quantities — medians, quantiles, means, category lists — must be fitted on the training fold and applied identically at serve time; if the service reimplements them, training and serving drift apart the first time either is edited. One artefact from raw columns to probability, with handle_unknown and missing indicators inside, cannot skew, can be cross-validated honestly, and can be searched jointly with the model",
          "Because scikit-learn requires it",
          "Because joblib cannot save scalers separately"
        ],
        answer: 1,
        why: "The 999 outlier and the 126 missing tickets were handled inside the fitted pipeline, on the training fold, automatically."
      },
      {
        stem: "What goes in a model artefact besides the model, and why?",
        options: [
          "Nothing; the model is self-describing",
          "A manifest: library and Python versions (pickles are version-fragile), the feature list in order, training date and row count, the CV score and chosen parameters, a hash of the file; and a golden set of rows with their expected outputs, checked on every load (True here) so that a version drift, a column reorder or a corrupted file is caught before a prediction is served",
          "The training data",
          "The notebook"
        ],
        answer: 1,
        why: "Two of the three corruptions in the exercise produce no error at all; only the manifest and golden set catch them."
      },
      {
        stem: "When would you export to ONNX, and what can stop you?",
        options: [
          "Always; ONNX is strictly better",
          "When the serving path needs low latency (0.36 ms vs 14.3 ms per row), another language, or a data-only artefact without Python code execution; parity was 6 × 10⁻⁸. What stops you: any custom step without a registered converter (the winsorizer blocked the first export), unsupported estimators, and preprocessing that lives outside the pipeline. Decide the format before writing custom steps",
          "Only for neural networks",
          "Never for scikit-learn models"
        ],
        answer: 1,
        why: "Keep the joblib artefact for retraining and explanations; ship the ONNX graph for scoring."
      },
      {
        stem: "Why is loading a pickle a security concern, and what are the mitigations?",
        options: [
          "It is not; pickles are data",
          "Unpickling executes code embedded in the file, so a malicious or tampered artefact runs arbitrary Python at load. Mitigate by storing artefacts where only the training pipeline can write, recording and verifying a hash before load, never loading files from untrusted sources, and using data-only formats (ONNX, PMML, native tree dumps) across trust or language boundaries",
          "It can overwrite the model",
          "It leaks the training data"
        ],
        answer: 1,
        why: "The same property that lets a pickle carry your custom class lets it carry anything else."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you write a custom transformer that works inside a scikit-learn pipeline and cross-validation?",
        strong: "Inherit from TransformerMixin and BaseEstimator, in that order. In __init__ assign every argument to an attribute of the same name and do nothing else, because get_params reads those attributes to clone the estimator for each fold and set_params writes them when a search tunes them by name. In fit, call validate_data with reset=True to convert the input and record n_features_in_, compute the learned quantities and store them with a trailing underscore, and return self. In transform, call check_is_fitted and validate_data with reset=False so that a different column count fails loudly, then apply the learned quantities. Implement get_feature_names_out so a ColumnTransformer can name the outputs, and declare tags if the step accepts NaN. Then run check_estimator: my winsorising clipper passed on the first attempt; a threshold-aware classifier failed on a case I had not considered — a fold containing one class — and passed once it handled it. The two mistakes the check catches most often are an __init__ that transforms its arguments, which breaks clone, and a fit without validate_data, which leaves n_features_in_ unset. Both work in a notebook and fail inside GridSearchCV.",
        answer: [
          { t: "p", text: "The five rules with their consumers, the check, and the two failures with their messages." }
        ]
      },
      {
        level: "core",
        q: "Describe how you would package a trained model for production.",
        strong: "As one estimator from raw columns to output, saved with a manifest and verified on load. The pipeline holds every learned preprocessing quantity — imputation medians with missing indicators, clipping quantiles, scaling parameters, category lists with handle_unknown set — so that serving cannot drift from training and cross-validation is honest; preprocessing and model parameters are searched together, the winner is calibrated on internal folds if probabilities are the product, refitted on all training rows, and evaluated once on an untouched slice. The artefact is the pipeline plus a manifest: library and Python versions, the ordered feature list, training date and row count, the CV score and parameters, and a hash — and a golden set of a few rows with their expected outputs, checked at every load. On the churn model the reload reproduced the evaluated predictions exactly and the golden check passed. Then the serving format follows the latency budget: joblib in-process is fine for batch, but one row took 108 ms through pandas and the ColumnTransformer, so for a request path I export to ONNX — parity to 6 × 10⁻⁸ and 0.36 ms a row — which also removes the pickle's code-execution risk and the Python dependency. Custom steps must have ONNX converters, so I decide the format before writing them. And the artefact ships with its monitoring plan and the training distribution.",
        answer: [
          { t: "p", text: "Pipeline, search, calibration, refit, evaluation; manifest and golden set; format by latency with the numbers; the custom-step caveat." }
        ]
      },
      {
        level: "advanced",
        q: "A model that scored 0.75 AUC in evaluation scores 0.62 in production after deployment. Walk through the diagnosis.",
        strong: "In order of cheapness. First the artefact: is the served model the evaluated model? The manifest hash and the golden set answer that in seconds — if the golden predictions differ, the file, the library version or the loading code changed. Second the inputs: are the columns the same, in the same order, with the same types and category spellings? A DataFrame pipeline raises on renamed columns but a numpy one silently mis-scales, and a one-hot encoder with handle_unknown set will quietly emit zeros for a category that has been renamed upstream — I would compare the served feature distributions to the training distributions column by column. Third the evaluation: was 0.75 an honest number — nested if tuned, on a time-respecting split if the data are temporal, with resampling inside the folds — or was it the tuned maximum or a leaked score? Fourth the population: the production rows may be a different population from the evaluation slice — a new region, a new acquisition channel, a different base rate — which is drift rather than a bug, and shows up as a shift in the score distribution and the input distributions together. Fifth the label: production labels arrive later and differently; a 0.62 computed on early-arriving labels can be biased. The order matters because the first two are fixable in an hour and the last two need 11.1's monitoring to distinguish; and the artefact discipline from this lesson is what makes the first two checks possible at all.",
        answer: [
          { t: "p", text: "Artefact integrity, input schema, evaluation honesty, population drift, label timing — cheapest first, with the checks that decide each." }
        ]
      }
    ]
  }
});

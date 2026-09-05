/* ============================================================================
   LESSON 15.5 — scikit-learn as an Engineering API
   ========================================================================= */
EC.receiveLesson({
  id: "15.5",

  lede: "scikit-learn's real contribution is not its algorithms — it is a contract. **Every estimator has `fit` and `predict`, every transformer has `fit` and `transform`, and everything composes.** Once you take that seriously, the most common and most expensive modelling bug — leakage — becomes structurally difficult rather than a thing you must remember.",

  objectives: [
    "State the estimator contract and why it matters",
    "Compose preprocessing and a model into one object",
    "Recognise leakage in its three common forms",
    "Cross-validate without leaking, including in the split itself",
    "Write a custom transformer that behaves like a built-in"
  ],

  prerequisites: ["15.2"],

  blocks: [

    { t: "h2", n: "01", text: "The contract", id: "contract" },

    { t: "code", lang: "python", title: "four methods, and everything follows", code: `
# ESTIMATOR
#   fit(X, y)        learn parameters from training data. Returns self.
#   predict(X)       apply them. NEVER learns.
#
# TRANSFORMER
#   fit(X)           learn the transformation (means, categories, ...)
#   transform(X)     apply it. NEVER learns.
#   fit_transform(X) both, for convenience -- and ONLY on training data.
#
# THE RULE THE WHOLE LIBRARY ENFORCES:
#   fit sees training data. transform and predict see anything.
#   Nothing learned from test data may influence a prediction.

scaler = StandardScaler()
scaler.fit(X_train)                # learns the mean and std
X_train_s = scaler.transform(X_train)
X_test_s  = scaler.transform(X_test)      # uses TRAINING statistics

# Attributes learned during fit end with an underscore. That is a
# convention you can rely on and should follow in your own code:
scaler.mean_          # array of per-column means
scaler.scale_
model.coef_
model.classes_

# check_is_fitted uses it -- calling predict before fit raises
# NotFittedError rather than producing nonsense.
`,
      hl: [11, 18, 22],
      caption: "**`fit_transform` on test data is the single most common leakage bug**, and it looks harmless — it is one method call that happens to also learn."
    },

    { t: "h2", n: "02", text: "Leakage", id: "leakage" },

    { t: "viz",
      title: "Three ways information crosses the boundary",
      caption: "Leakage inflates your validation score and leaves production performance unchanged. The gap between the two is the only symptom, and by the time you see it the model is already deployed.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Three forms of data leakage in machine learning">
  <rect x="20" y="24" width="280" height="120" rx="10" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="40" y="50" class="s-label" style="fill:var(--crit)">1 · PREPROCESSING</text>
  <g class="s-sub">
    <text x="40" y="78">scaler.fit(X)  before  the split</text>
    <text x="40" y="100">Test means leak into training.</text>
    <text x="40" y="122">Small effect, always present.</text>
  </g>

  <rect x="310" y="24" width="280" height="120" rx="10" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="330" y="50" class="s-label" style="fill:var(--crit)">2 · TARGET</text>
  <g class="s-sub">
    <text x="330" y="78">A feature computed from y,</text>
    <text x="330" y="100">or unavailable at predict time.</text>
    <text x="330" y="122">Score near 1.0. Useless model.</text>
  </g>

  <rect x="600" y="24" width="280" height="120" rx="10" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="620" y="50" class="s-label" style="fill:var(--crit)">3 · TEMPORAL</text>
  <g class="s-sub">
    <text x="620" y="78">A random split on time-ordered</text>
    <text x="620" y="100">data: training on the future.</text>
    <text x="620" y="122">Silent, and very common.</text>
  </g>

  <text x="20" y="192" class="s-label">THE SYMPTOM IS ALWAYS THE SAME</text>
  <text x="20" y="222" class="s-sub" style="fill:var(--ink-3)">Validation AUC 0.94 · production AUC 0.71 · nothing in the code looks wrong</text>
  <text x="20" y="252" class="s-sub" style="fill:var(--ink-3)">A Pipeline makes form 1 structurally impossible. Forms 2 and 3 need a domain question and the right splitter.</text>
  <text x="20" y="282" class="s-sub" style="fill:var(--warn)">Ask of every feature: would this value exist, with this value, at the moment of prediction?</text>
</svg>`
    },

    { t: "ladder",
      title: "Scaling features before cross-validation",
      rungs: [
        { level: "bad", label: "Scale, then split",
          why: "The scaler's mean and standard deviation are computed over the whole dataset, including the rows that become the validation fold. Every fold's score is optimistic, and the model appears better than it is by a consistent, invisible margin.",
          code: `X_scaled = StandardScaler().fit_transform(X)     # sees everything
scores = cross_val_score(model, X_scaled, y, cv=5)

# The mean used to scale fold 1's validation rows was computed
# partly FROM fold 1's validation rows.` },
        { level: "ok", label: "Split, then scale each side",
          why: "Correct for a single train/test split, and it does not extend: the moment you cross-validate or grid-search, you are back to scaling once outside the loop and leaking again.",
          code: `X_train, X_test = train_test_split(X)
scaler = StandardScaler().fit(X_train)
X_train_s = scaler.transform(X_train)
X_test_s = scaler.transform(X_test)
# Fine here. Impossible to keep right inside cross-validation.` },
        { level: "best", label: "Put preprocessing in the Pipeline",
          why: "The pipeline is one estimator, so `cross_val_score` fits every step on the training fold only, for each fold. Leakage stops being something to remember and becomes something the structure prevents.",
          code: `pipe = Pipeline([
    ("scale", StandardScaler()),
    ("model", LogisticRegression()),
])

scores = cross_val_score(pipe, X, y, cv=5)
# For each fold: scaler.fit on the training rows, transform both,
# model.fit on the training rows, score the validation rows.

# And it extends to hyperparameter search for free:
search = GridSearchCV(pipe, {"model__C": [0.1, 1, 10]}, cv=5)
# The double-underscore addresses a step's parameter by name.`,
          note: "**One object goes into cross-validation, into the grid search, and into `joblib.dump`.** Preprocessing and model cannot drift apart, because they are the same artefact." }
      ]
    },

    { t: "callout", kind: "trap", title: "Target leakage is the expensive one", body: [
      { t: "code", lang: "python", title: "features that will not exist at predict time", numbered: false, code: `
# Predicting whether a customer will churn this month.
features = [
    "tenure_months",
    "monthly_spend",
    "support_tickets",
    "cancellation_reason",   # <- ONLY EXISTS IF THEY CHURNED
    "days_since_last_login", # <- measured WHEN? If after the event,
]                            #    it encodes the outcome

# AUC 0.99 in validation. In production, cancellation_reason is null
# for everyone who has not churned -- which is everyone you are
# scoring -- so the model has nothing and performs at chance.

# THE QUESTION TO ASK OF EVERY FEATURE:
#
#   "At the exact moment I need this prediction, would this column
#    exist, and would it hold this value?"
#
# Not "is it in the training table" -- training tables are built
# after the fact, and that is precisely how the leak gets in.

# THE SMELL: a suspiciously good score.
if auc > 0.95:
    # On real business data this is almost always leakage, not
    # brilliance. Investigate before celebrating.
    print(sorted(zip(model.feature_importances_, features))[-5:])`},
      { t: "p", text: "**A near-perfect score on a real business problem is a bug report.** Check the top features first — leakage is nearly always concentrated in one or two columns whose presence, on reflection, gives the answer away." }
    ]},

    { t: "h2", n: "03", text: "ColumnTransformer", id: "columntransformer" },

    { t: "code", lang: "python", title: "different treatment per column, in one object", code: `
numeric = ["age", "income", "tenure_months"]
categorical = ["country", "plan", "channel"]

preprocess = ColumnTransformer(
    transformers=[
        ("num", Pipeline([
            # Imputation inside the pipeline, so the median is learned
            # from the training fold only.
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), numeric),

        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant",
                                     fill_value="missing")),
            # handle_unknown="ignore" is essential: a category unseen
            # during training WILL appear in production, and the
            # default raises rather than encoding it as all-zeros.
            ("encode", OneHotEncoder(handle_unknown="ignore",
                                     min_frequency=10)),
        ]), categorical),
    ],
    # Columns not listed are DROPPED by default. Make it explicit --
    # "passthrough" silently forwards ids and timestamps into the
    # model, which is its own leakage route.
    remainder="drop",
    verbose_feature_names_out=False,
)

model = Pipeline([
    ("prep", preprocess),
    ("clf", HistGradientBoostingClassifier()),
])

model.fit(X_train, y_train)
model.get_feature_names_out()      # traceable back to source columns
`,
      hl: [9, 19, 25],
      caption: "**`handle_unknown=\"ignore\"` is the setting that decides whether your service survives contact with production.** A new country appears, the encoder raises, and every prediction for that row fails."
    },

    { t: "h2", n: "04", text: "Splitting honestly", id: "splitting" },

    { t: "table",
      head: ["Data has", "Use", "Because"],
      rows: [
        ["No structure", "`KFold(shuffle=True)`", "The default case"],
        ["Imbalanced classes", "**`StratifiedKFold`**", "A fold may otherwise contain no positives"],
        ["**Time order**", "**`TimeSeriesSplit`**", "A random split trains on the future"],
        ["**Groups (customers)**", "**`GroupKFold`**", "The same customer in train and test is leakage"],
        ["Both time and groups", "`StratifiedGroupKFold` + manual cutoff", "Neither alone is sufficient"]
      ],
      caption: "**Group leakage is the one that slips through review.** Ten rows per customer with a random split means the model has seen that customer, and it memorises rather than generalises."
    },

    { t: "code", lang: "python", title: "the two splits people get wrong", code: `
# TIME. A random split trains on the future and tests on the past.
# The model learns from information that will not exist when it runs.
tscv = TimeSeriesSplit(n_splits=5, gap=7)     # gap: days between
for train_idx, test_idx in tscv.split(X):     # train and test, to
    ...                                       # model deployment lag
#   fold 1: train [0..100]   test [108..200]
#   fold 2: train [0..200]   test [208..300]
# Training always precedes testing, and the gap reflects the delay
# between a prediction being made and the outcome being known.


# GROUPS. Ten rows per customer, split randomly: the same customer is
# in both sides, so the model recognises them rather than learning a
# pattern.
gkf = GroupKFold(n_splits=5)
for train_idx, test_idx in gkf.split(X, y, groups=df["customer_id"]):
    ...
# No customer appears in both a training and a test fold.


# THE HONEST FINAL EVALUATION: a held-out set touched ONCE.
X_dev, X_holdout, y_dev, y_holdout = train_test_split(
    X, y, test_size=0.15, stratify=y, random_state=42
)
# All development -- feature selection, tuning, model choice -- uses
# cross-validation on X_dev. X_holdout is scored ONCE, at the end.
#
# Every look at the holdout leaks a little through your decisions,
# which is why "we tried 40 configurations and picked the best test
# score" produces a number that does not survive deployment.
`,
      hl: [4, 16, 27],
      caption: "**Selecting a model on the test set makes the test score meaningless.** The number you report should come from data that influenced no decision — and a holdout scored forty times is no longer that."
    },

    { t: "h2", n: "05", text: "Custom transformers", id: "custom" },

    { t: "code", lang: "python", title: "behave like a built-in and everything composes", code: `
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.utils.validation import check_is_fitted


class RareCategoryGrouper(BaseEstimator, TransformerMixin):
    """Collapse categories seen fewer than min_count times in TRAINING
    into a single bucket."""

    def __init__(self, min_count: int = 10, other: str = "__other__"):
        # __init__ ONLY stores parameters, exactly as named. No
        # validation, no computation -- get_params/set_params and
        # cloning during cross-validation depend on it.
        self.min_count = min_count
        self.other = other

    def fit(self, X, y=None):
        # Everything learned from data goes in a trailing-underscore
        # attribute. That is what check_is_fitted looks for.
        self.keep_ = {
            col: set(X[col].value_counts()
                      .loc[lambda s: s >= self.min_count].index)
            for col in X.columns
        }
        self.feature_names_in_ = np.asarray(X.columns)
        return self                       # ALWAYS return self

    def transform(self, X):
        check_is_fitted(self)             # NotFittedError, not nonsense
        X = X.copy()                      # never mutate the input
        for col, keep in self.keep_.items():
            # Categories unseen in training map to "other" -- which is
            # exactly the production case.
            X[col] = X[col].where(X[col].isin(keep), self.other)
        return X

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_


# It now works everywhere a built-in does:
Pipeline([("rare", RareCategoryGrouper(min_count=20)), ...])
GridSearchCV(pipe, {"rare__min_count": [5, 10, 50]})
`,
      hl: [11, 19, 26, 29],
      caption: "**The `__init__` rule is not stylistic.** `clone()` reconstructs an estimator from `get_params()`, so a parameter transformed in `__init__` is silently lost on every cross-validation fold."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the leakage in a modelling script",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This churn model scores 0.94 AUC in validation. In production it performs at 0.68 — barely better than the rule it replaced." },
        { t: "code", lang: "python", numbered: false, title: "train.py", code: `
df = pd.read_sql("SELECT * FROM customer_features", engine)

df["income"] = df["income"].fillna(df["income"].mean())
df = pd.get_dummies(df, columns=["country", "plan"])

X = df.drop(columns=["churned", "customer_id"])
y = df["churned"]

scaler = StandardScaler()
X = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

best_score = 0
for depth in [3, 5, 10, 20]:
    for n in [50, 100, 200]:
        m = RandomForestClassifier(max_depth=depth, n_estimators=n)
        m.fit(X_train, y_train)
        score = roc_auc_score(y_test, m.predict_proba(X_test)[:, 1])
        if score > best_score:
            best_score, best_model = score, m

print(f"Best AUC: {best_score:.3f}")
joblib.dump(best_model, "model.pkl")`},
        { t: "code", lang: "sql", numbered: false, title: "the feature table", code: `
customer_features(
    customer_id, signup_date, tenure_months, monthly_spend,
    support_tickets, country, plan, income,
    last_login_date, cancellation_date, refund_total,
    churned
)`},
        { t: "p", text: "Find every source of the 0.94-to-0.68 gap. There are at least six." }
      ],
      requirements: [
        "List every leak, ranked by how much it inflates the score.",
        "Identify which columns must not be features, and why.",
        "Explain why the hyperparameter loop makes the reported number meaningless.",
        "Explain what breaks at inference time, separately from the leakage.",
        "Rewrite it correctly.",
        "Give the checks that would catch each leak."
      ],
      hint: "Read the column list against the target. And ask what happens at predict time to a customer whose country was not in the training data.",
      solution: {
        lang: "python",
        title: "train.py",
        code: `# =========================================================================
# THE LEAKS, RANKED BY IMPACT
# =========================================================================
#
# ---- 1. TARGET LEAKAGE: cancellation_date  (the big one) ----------
#
#    SELECT * pulls every column, so cancellation_date is a feature.
#    It is NULL for everyone who has not churned and populated for
#    everyone who has. The model does not need any other column.
#
#    This alone explains most of the 0.94. In production every
#    customer being scored has a NULL cancellation_date -- because
#    they have not churned yet -- so the feature is constant and the
#    model has learned nothing usable.
#
# ---- 2. TARGET LEAKAGE: refund_total ------------------------------
#
#    Refunds are overwhelmingly issued at or after cancellation. A
#    non-zero refund_total is close to a churn indicator, and it is
#    unavailable at the moment you need to predict.
#
# ---- 3. TEMPORAL LEAKAGE: last_login_date, as an absolute date ----
#
#    Two problems. It is measured at feature-build time, so for
#    churned customers it reflects a login BEFORE cancellation and
#    for active ones a recent login -- it encodes the outcome.
#
#    And as an absolute date it is meaningless as a feature: the
#    model learns "dates before 2026-02 mean churn", which is a fact
#    about the extract, not about customers. The correct feature is
#    days_since_last_login RELATIVE to a fixed prediction date.
#
# ---- 4. TEMPORAL LEAKAGE: a random split on time-ordered data -----
#
#    train_test_split shuffles. Customers who churned in January are
#    in the training set alongside customers who churned in June, so
#    the model trains on the future and tests on the past. In
#    production it only ever has the past.
#
# ---- 5. PREPROCESSING LEAKAGE: imputation and scaling before split -
#
#      df["income"].fillna(df["income"].mean())   <- ALL rows
#      scaler.fit_transform(X)                    <- ALL rows
#
#    Both learn statistics from the test rows. Individually small,
#    and they compound with everything else. They are also the
#    easiest to fix, because a Pipeline makes them impossible.
#
# ---- 6. SELECTION LEAKAGE: tuning on the test set ------------------
#
#    Twelve configurations, each scored on X_test, and the best is
#    reported. The test set has now influenced a decision, so
#    best_score is not an estimate of generalisation -- it is the
#    maximum of twelve noisy draws, which is biased upward by
#    construction. With 12 configurations, expect roughly 0.01-0.03
#    of pure optimism even with no other bug.
#
# ---- and one that is not leakage but breaks production ------------
#
# 7. get_dummies AT TRAINING TIME ONLY.
#
#    pd.get_dummies creates columns from the values PRESENT in this
#    dataframe. At inference:
#      - a new country produces a column the model has never seen
#      - a country absent from the batch produces a MISSING column
#      - the column ORDER differs
#
#    So predict() either raises on a shape mismatch or, worse,
#    silently maps features to the wrong columns and returns
#    confident nonsense. This is not a scoring problem -- it is why
#    the deployed model may be even worse than 0.68.
#
# 8. THE SCALER IS NOT SAVED. joblib.dump(best_model) persists the
#    RandomForest and nothing else. At inference there is no scaler
#    and no dummy-column list, so the serving code must reimplement
#    both -- and will get them subtly wrong.


# =========================================================================
# COLUMNS THAT MUST NOT BE FEATURES
# =========================================================================
#
#   cancellation_date  -- exists only for churned customers
#   refund_total       -- consequence of churn, not a predictor
#   churned            -- the target
#   customer_id        -- an identifier; a tree WILL split on it
#   signup_date        -- absolute date: use tenure instead
#   last_login_date    -- absolute date: use days_since, computed
#                         relative to a fixed prediction date
#
# THE TEST FOR EVERY FEATURE: at the exact moment the prediction is
# needed, does this column exist and hold this value? "It is in the
# training table" is not the same question -- training tables are
# assembled after the fact, which is exactly how leaks enter.


# =========================================================================
# THE REWRITE
# =========================================================================

FORBIDDEN = {
    "churned", "customer_id", "cancellation_date",
    "refund_total", "signup_date", "last_login_date",
}

NUMERIC = ["tenure_months", "monthly_spend", "support_tickets",
           "income", "days_since_last_login"]
CATEGORICAL = ["country", "plan"]


def load_features(cutoff: date) -> tuple[pd.DataFrame, pd.Series]:
    """Explicit columns, and every time-based feature computed
    RELATIVE to a cutoff -- so the feature means the same thing at
    training time and at inference time."""
    df = pd.read_sql(
        text("""
            SELECT customer_id, tenure_months, monthly_spend,
                   support_tickets, country, plan, income,
                   -- RELATIVE, not absolute (leak 3)
                   (:cutoff::date - last_login_date) AS days_since_last_login,
                   churned
            FROM   customer_features
            -- Only what was KNOWN at the cutoff. This is what makes
            -- the training data resemble inference data.
            WHERE  signup_date < :cutoff
        """),
        engine, params={"cutoff": cutoff},
    )

    leaked = set(df.columns) & FORBIDDEN - {"churned", "customer_id"}
    assert not leaked, f"forbidden columns present: {leaked}"

    return df.drop(columns=["churned", "customer_id"]), df["churned"]


def build_pipeline() -> Pipeline:
    """ONE object: preprocessing and model together.

    Fixes leak 5 structurally -- every step is fitted on the training
    fold only, for every fold, automatically. And fixes problems 7
    and 8, because the encoder is part of the saved artefact and
    handles unseen categories.
    """
    preprocess = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), NUMERIC),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant",
                                     fill_value="missing")),
            # handle_unknown="ignore": a new country becomes all-zeros
            # instead of raising. This is problem 7.
            ("encode", OneHotEncoder(handle_unknown="ignore",
                                     min_frequency=20)),
        ]), CATEGORICAL),
    ], remainder="drop")     # explicit: nothing else gets through

    return Pipeline([
        ("prep", preprocess),
        ("clf", HistGradientBoostingClassifier(random_state=42)),
    ])


def train(cutoff: date) -> Pipeline:
    X, y = load_features(cutoff)

    # --- the holdout, touched ONCE at the very end (leak 6) -------
    X_dev, X_holdout, y_dev, y_holdout = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )

    # --- tuning uses CROSS-VALIDATION on the dev set only ---------
    # TimeSeriesSplit because the data is time-ordered (leak 4).
    # If customers appeared multiple times, GroupKFold on customer_id
    # would be needed too.
    search = GridSearchCV(
        build_pipeline(),
        param_grid={
            "clf__max_depth": [3, 5, 10, None],
            "clf__learning_rate": [0.05, 0.1],
            "clf__max_iter": [100, 200],
        },
        cv=TimeSeriesSplit(n_splits=5, gap=30),
        scoring="roc_auc",
        n_jobs=-1,
        refit=True,
    )
    search.fit(X_dev, y_dev)

    # The CV score is the honest development estimate.
    logger.info("cv_auc", extra={
        "mean": search.best_score_,
        "std": search.cv_results_["std_test_score"][search.best_index_],
        "params": search.best_params_,
    })

    # --- the holdout, scored ONCE -------------------------------
    holdout_auc = roc_auc_score(
        y_holdout, search.predict_proba(X_holdout)[:, 1]
    )
    logger.info("holdout_auc", extra={"auc": holdout_auc})

    # A large gap between CV and holdout means the tuning overfitted
    # the folds -- worth knowing BEFORE deployment.
    if search.best_score_ - holdout_auc > 0.05:
        logger.warning("cv_holdout_gap", extra={
            "cv": search.best_score_, "holdout": holdout_auc})

    # --- save the WHOLE pipeline (problem 8) --------------------
    joblib.dump({
        "pipeline": search.best_estimator_,   # preprocessing INCLUDED
        "cutoff": cutoff,
        "features": {"numeric": NUMERIC, "categorical": CATEGORICAL},
        "cv_auc": search.best_score_,
        "holdout_auc": holdout_auc,
        "sklearn_version": sklearn.__version__,
        "trained_at": utcnow().isoformat(),
        "git_sha": git_sha(),
    }, "model.joblib")

    return search.best_estimator_


# =========================================================================
# EXPECTED HONEST PERFORMANCE
# =========================================================================
#
#   0.94  reported, with all six leaks
#   0.68  observed in production
#   ~0.72-0.78  a realistic honest range once the leaks are removed
#
# The rewrite will report a LOWER number than the original, and that
# is the point. A model reported at 0.75 that delivers 0.74 is worth
# far more than one reported at 0.94 that delivers 0.68 -- because
# decisions were made on the basis of the first number.


# =========================================================================
# THE CHECKS
# =========================================================================

def test_no_forbidden_column_reaches_the_model():
    """Leaks 1, 2 and 3. SELECT * is how they got in; this makes the
    column list a contract."""
    X, _ = load_features(date(2026, 3, 1))

    assert not set(X.columns) & FORBIDDEN


def test_a_suspiciously_high_score_fails_the_build():
    """On real churn data, 0.95+ is a leak, not a breakthrough. Fail
    loudly rather than deploying it."""
    auc = train_and_score(date(2026, 3, 1))

    assert auc < 0.92, (
        f"AUC {auc:.3f} is implausibly high -- check for leakage before "
        f"deploying"
    )


def test_preprocessing_is_fitted_inside_cross_validation():
    """Leak 5. If a scaler is fitted outside, the score with shuffled
    labels is above chance -- a permutation test detects it."""
    pipe = build_pipeline()
    X, y = load_features(date(2026, 3, 1))

    shuffled = y.sample(frac=1, random_state=0).reset_index(drop=True)
    score = cross_val_score(pipe, X, shuffled, cv=5,
                            scoring="roc_auc").mean()

    # With no real signal, a leak-free pipeline scores ~0.5.
    assert 0.45 < score < 0.55, f"leakage suspected: AUC {score:.3f} on "\\
                                f"shuffled labels"


def test_an_unseen_category_does_not_raise():
    """Problem 7. This is what actually breaks in production."""
    model = joblib.load("model.joblib")["pipeline"]

    row = valid_row()
    row["country"] = "Vatican City"        # not in training

    proba = model.predict_proba(row)       # must not raise
    assert 0 <= proba[0][1] <= 1


def test_a_missing_category_does_not_shift_columns():
    """Problem 7, the silent half. get_dummies would misalign; the
    pipeline must not."""
    model = joblib.load("model.joblib")["pipeline"]
    batch = valid_batch().query("country == 'UK'")   # one country only

    assert len(model.predict_proba(batch)) == len(batch)


def test_the_saved_artifact_contains_the_preprocessing():
    """Problem 8. Serving must not have to reimplement anything."""
    artifact = joblib.load("model.joblib")

    assert isinstance(artifact["pipeline"], Pipeline)
    assert "prep" in artifact["pipeline"].named_steps


def test_time_ordering_is_respected_in_cv():
    """Leak 4. Every training index must precede every test index."""
    splitter = TimeSeriesSplit(n_splits=5, gap=30)

    for train_idx, test_idx in splitter.split(X):
        assert train_idx.max() < test_idx.min()`,
        notes: [
          { t: "p", text: "**`cancellation_date` alone explains most of the 0.94.** It is null for every customer who has not churned and populated for every one who has, so the model needs no other column — and in production every customer being scored has it null, which is why performance collapses to near the baseline." },
          { t: "p", text: "**`SELECT *` is how the leaks got in.** Three of the six would have been impossible with an explicit column list, which is why the rewrite makes that list a tested contract rather than a query detail." },
          { t: "callout", kind: "insight", title: "Tuning on the test set biases the number upward by construction", body: [
            { t: "p", text: "Twelve configurations scored on the same test set, reporting the maximum, is taking the largest of twelve noisy draws. Even with no other bug that is worth roughly 0.01 to 0.03 of pure optimism." },
            { t: "p", text: "The fix is structural: cross-validate on a development set for every decision, and score the holdout exactly once. A number that influenced a choice is no longer an estimate of generalisation." }
          ]},
          { t: "p", text: "**`pd.get_dummies` at training time is a production failure, not a scoring one.** A new country adds a column the model has never seen, an absent one removes a column, and either way `predict` raises on a shape mismatch or silently misaligns features and returns confident nonsense." },
          { t: "p", text: "**Saving only the classifier means serving has to reimplement the preprocessing**, and it will get the imputation medians, the scaling statistics and the category order subtly wrong. The pipeline is the artefact, not the model inside it." },
          { t: "p", text: "**The permutation test is the general leakage detector.** Shuffle the labels: a leak-free pipeline scores about 0.5, and anything meaningfully above that means information is reaching the model through a route other than the features." },
          { t: "p", text: "**The rewrite reports a lower number, and that is the deliverable.** A model reported at 0.75 that delivers 0.74 is worth far more than one reported at 0.94 that delivers 0.68, because decisions were made on the strength of the first figure." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A fraud model scored 0.98 AUC. The team celebrated, shipped it, and watched it catch almost nothing." },
      { t: "p", text: "**One feature was `investigation_opened`.** Investigations are opened *because* fraud is suspected, so the feature was a downstream consequence of the label — and at scoring time it is always false, because the whole point is to decide whether to open one." },
      { t: "p", text: "**The honest model scored 0.79 and caught real fraud.** It was a harder sell internally than the 0.98 had been, which is the awkward part: a correct number is less impressive than an inflated one." },
      { t: "p", text: "**On real business data, a near-perfect score is a bug report.** Check the top features before celebrating — leakage is nearly always concentrated in one or two columns whose presence gives the answer away on reflection." }
    ]}
  ],

  takeaways: [
    "**`fit` learns, `transform` and `predict` apply.** Nothing learned from test data may influence a prediction.",
    "**`fit_transform` on test data is the most common leakage bug**, and it looks like one harmless method call.",
    "**Put every preprocessing step in a `Pipeline`**, so cross-validation fits them on the training fold only — leakage becomes structurally impossible rather than something to remember.",
    "**Ask of every feature: at the moment of prediction, would this column exist and hold this value?** \"It is in the training table\" is a different question.",
    "**A near-perfect score on real business data is a bug report.** Check the top features before celebrating.",
    "**A random split on time-ordered data trains on the future.** Use `TimeSeriesSplit`, with a gap reflecting deployment lag.",
    "**The same entity in train and test is leakage.** `GroupKFold` on the customer or account id.",
    "**Selecting a model on the test set makes the test score meaningless** — it is the maximum of N noisy draws, biased upward by construction.",
    "**Score the holdout once.** Every look leaks a little through the decisions it influences.",
    "**`handle_unknown=\"ignore\"` on the encoder** — a category unseen in training will appear in production, and the default raises.",
    "**`pd.get_dummies` at training time breaks inference**, because the columns depend on the values present in that particular frame.",
    "**Set `remainder=\"drop\"` explicitly**, or ids and timestamps pass silently into the model.",
    "**Save the whole pipeline, not the model** — otherwise serving reimplements the preprocessing and gets it subtly wrong.",
    "**In a custom transformer, `__init__` only stores parameters**, because `clone()` reconstructs from `get_params()` on every fold."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`X = StandardScaler().fit_transform(X)` before `cross_val_score`. What is wrong?",
        options: [
          "Nothing — scaling is not learned from labels",
          "The scaler's statistics are computed over all rows including each validation fold, so every fold's score is optimistic",
          "`fit_transform` cannot be used with cross-validation",
          "The scaler should be applied after the model"
        ],
        answer: 1,
        why: "The mean used to scale a fold's validation rows was computed partly from those rows. Putting the scaler inside a `Pipeline` fixes it structurally — cross-validation then fits it on each training fold only, and the same applies inside a grid search."
      },
      {
        stem: "A churn model uses `cancellation_reason` as a feature and scores 0.99 AUC. What happens in production?",
        options: [
          "It performs as validated",
          "The column is null for everyone not yet churned — which is everyone being scored — so the model performs at roughly chance",
          "Predictions become slower",
          "The encoder raises on the null values"
        ],
        answer: 1,
        why: "This is target leakage: a feature that exists only as a consequence of the outcome. The test is whether the column would exist and hold that value at the moment the prediction is needed, which is a different question from whether it is in the training table."
      },
      {
        stem: "You try twelve hyperparameter configurations, score each on the test set, and report the best. What is wrong with the number?",
        options: [
          "Nothing, provided the split was random",
          "The test set influenced a decision, so the reported score is the maximum of twelve noisy draws and is biased upward",
          "Twelve configurations is too few to be meaningful",
          "The model should be refit on all data first"
        ],
        answer: 1,
        why: "Even with no other bug that is worth a couple of points of pure optimism. Use cross-validation on a development set for every decision, and score a held-out set exactly once at the end — a number that influenced a choice is no longer an estimate of generalisation."
      },
      {
        stem: "Training used `pd.get_dummies` and inference fails with a shape mismatch. Why?",
        options: [
          "The model was saved incorrectly",
          "`get_dummies` creates columns from the values present in that frame, so a new or absent category changes the column set at inference",
          "One-hot encoding is not supported by tree models",
          "The dtypes differ between training and inference"
        ],
        answer: 1,
        why: "A `OneHotEncoder` inside the pipeline learns the categories during `fit` and applies exactly those at `transform`, with `handle_unknown=\"ignore\"` mapping unseen values to all-zeros. The silent version of this bug — a missing category shifting columns — returns confident nonsense rather than raising."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is data leakage, and how do you prevent it?",
        strong: "Information reaching the model that will not be available at prediction time. Preprocessing leakage is prevented structurally by a Pipeline; target and temporal leakage need a domain question about each feature and the right splitter.",
        answer: [
          { t: "p", text: "Distinguishing the three forms, and noting only one is fixed by tooling, shows you have hit the others in practice." },
          { t: "p", text: "The feature test — would this column exist and hold this value at prediction time — is a concrete, repeatable check worth stating." },
          { t: "p", text: "Naming a suspiciously high score as the symptom to investigate is the practical detection heuristic." }
        ]
      },
      {
        level: "advanced",
        q: "Why use a Pipeline rather than transforming the data separately?",
        strong: "Because it makes preprocessing leakage impossible during cross-validation and grid search, and because the saved artefact contains the preprocessing — so serving cannot reimplement it differently.",
        answer: [
          { t: "p", text: "The serving argument is the one people forget, and it is the source of the worst production bugs: subtly different imputation between training and inference." },
          { t: "p", text: "Noting that a manual split-then-scale is correct once and impossible to keep right inside cross-validation explains why the structure matters." },
          { t: "p", text: "The `step__param` syntax for grid search shows familiarity with actually using it." }
        ]
      },
      {
        level: "core",
        q: "How would you split data for a churn model?",
        strong: "By time, not randomly — a random split trains on the future. Group by customer if a customer appears more than once, stratify on the target if it is imbalanced, and keep a holdout scored exactly once.",
        answer: [
          { t: "p", text: "Naming time first shows you have thought about what the model will actually see in production." },
          { t: "p", text: "Group leakage is the failure that most often survives review, so raising it unprompted is a strong signal." },
          { t: "p", text: "The gap parameter in `TimeSeriesSplit`, reflecting deployment lag, is a detail that suggests you have deployed one." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 3.6 — The scikit-learn Contract: Pipelines and ColumnTransformer
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**Every scikit-learn object keeps one promise: `fit` learns state from data and stores it in attributes ending in an underscore; `transform` and `predict` use that state and never change it.** Everything else — pipelines, column transformers, grid search, cross-validation, persistence — is built on that promise, and the reason the discipline of modules 1 to 3 is enforceable rather than aspirational is that a Pipeline calls `fit` on the training fold and only `transform` on the rest, automatically, every time. This lesson takes the contract apart, wires a mixed-type preprocessing pipeline with named features, writes a custom transformer that passes scikit-learn's own conformance checks, tunes a parameter three layers deep, and ends with the artefact that serving loads and the single row it scores.",

  objectives: [
    "State the estimator contract — fit, transform, predict, fitted attributes, get_params, clone — and what each guarantees",
    "Build a ColumnTransformer + Pipeline for mixed data with feature names recovered at the end and pandas output when wanted",
    "Write a custom transformer that passes `check_estimator`, with validation, fitted-state checks and feature names",
    "Tune nested parameters, cache expensive steps, persist the fitted pipeline with its version, and score a single new row"
  ],

  prerequisites: ["3.2", "3.3"],

  blocks: [

    { t: "h2", n: "01", text: "The contract", id: "contract" },

    { t: "code", lang: "python", title: "What fit does, what it stores, and what the helpers promise (executed)",
      hl: [2, 3, 6, 9, 10, 11],
      code: `sc = StandardScaler()
[a for a in vars(sc) if a.endswith("_")]                    # []                          <- nothing learned yet
sc.fit(X_train[["tenure_months"]])
{a: getattr(sc, a) for a in vars(sc) if a.endswith("_")}   # feature_names_in_, n_features_in_ 1, n_samples_seen_ 693, mean_ 31.12, var_ 301.8, scale_ 17.37
                                                            # fitted state lives in trailing-underscore attributes; nothing else changes on fit
check_is_fitted(StandardScaler())                           # NotFittedError            <- the check every transform() runs first

LogisticRegression(C=0.5).get_params()["C"]                 # 0.5                       <- hyperparameters are constructor arguments, readable and settable
clone(sc)                                                   # a new StandardScaler with the same hyperparameters and NO fitted state
hasattr(clone(sc), "mean_")                                 # False                     <- cross-validation clones the estimator per fold, so folds never share state`,
      caption: "Four rules make everything compose. Hyperparameters are constructor arguments stored unchanged as attributes, so `get_params` / `set_params` can read and write them by name. Fitted state is only ever in trailing-underscore attributes, so `clone` can copy the recipe without the result and `check_is_fitted` can tell the two apart. `fit` returns `self`, so calls chain. And `transform` / `predict` are pure functions of the fitted state — they never learn — which is the property that makes 'fit on train, transform test' a mechanical guarantee rather than a habit."
    },

    { t: "dl", items: [
      ["Estimator", "Anything with `fit(X, y=None)`. Transformers add `transform`; predictors add `predict` (and `predict_proba`, `decision_function`); `fit_transform` and `fit_predict` are conveniences."],
      ["Fitted attribute", "A trailing-underscore attribute set by `fit`: `mean_`, `coef_`, `classes_`, `n_features_in_`, `feature_names_in_`."],
      ["`get_params` / `set_params`", "Read and write hyperparameters by name, with `__` for nesting: `pipe.set_params(clf__C=0.1)`."],
      ["`clone`", "A fresh copy with the same hyperparameters and no fitted state. What CV and search use per fold."],
      ["Pipeline", "A chain of transformers ending in an estimator. `fit` calls `fit_transform` on each step in turn on the training data; `predict` calls `transform` then the final `predict`."],
      ["ColumnTransformer", "Applies different transformers to different columns and concatenates the outputs. `remainder` decides what happens to unlisted columns."],
      ["FeatureUnion", "Applies several transformers to the same input and concatenates: original and log-scaled copies side by side."],
      ["`get_feature_names_out`", "The names of the columns a fitted transformer produces, so a coefficient or importance can be read against a name."],
      ["`set_output(transform='pandas')`", "Makes transformers return DataFrames with those names, for inspection and for downstream steps that select by name."]
    ]},

    { t: "h2", n: "02", text: "Mixed data, named features", id: "wiring" },

    { t: "code", lang: "python", title: "The course preprocessing pipeline, with its feature names recovered and its coefficients read by name (executed)",
      hl: [1, 2, 3, 6, 7, 11, 12],
      code: `pre = ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler()), numeric),
    ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=5), categorical)], remainder="drop")
pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=2000))]).fit(X_train, y_train)

pipe.named_steps["pre"].get_feature_names_out()              # 16 names, prefixed by the branch that made them:
# num__tenure_months  num__monthly_fee  num__logins_30d  num__support_tickets  num__discount_pct  num__missingindicator_support_tickets
# cat__plan_basic  cat__plan_plus  cat__plan_pro  cat__region_east ... cat__channel_referral

dict(zip(names, pipe.named_steps["clf"].coef_[0].round(2)))
# tenure -0.58   fee -0.24   logins -0.66   tickets +0.37   discount -0.13   tickets-missing +0.17
# plan: basic -0.06  plus +0.31  pro -0.28      channel: organic -0.48  paid +0.31  referral +0.15   (per standard deviation, or per level)

clone(pre).set_params(cat__sparse_output=False).set_output(transform="pandas").fit_transform(X_train)     # a (693, 16) DataFrame with those column names
ColumnTransformer([("num", StandardScaler(), make_column_selector(dtype_include=np.number)),
                   ("cat", OneHotEncoder(), make_column_selector(dtype_include=object))])              # select columns by dtype instead of by list`,
      caption: "The names are the point. A coefficient of −0.66 means nothing until it is `num__logins_30d`, per standard deviation, and the indicator's +0.17 is the missingness signal of 3.3 made visible. The branch prefixes tell you which transformer made each column; `remainder='drop'` says any column not named is discarded, which is the safe default — a leaked column that nobody listed cannot sneak in. Sparse one-hot output cannot become a DataFrame, hence `sparse_output=False` when pandas output is wanted."
    },

    { t: "code", lang: "python", title: "Parameters three layers deep, tuned through the pipeline (executed)",
      hl: [2, 5, 6],
      code: `pipe.get_params().keys()          # ... 'pre__num__simpleimputer__strategy', 'pre__cat__min_frequency', 'clf__C', ...
#   branch name  __  step name  __  parameter: every hyperparameter of every step is reachable by one string

GridSearchCV(pipe, {"clf__C": [0.01, 0.1, 1], "pre__num__simpleimputer__strategy": ["median", "mean"]},
             cv=StratifiedKFold(5, shuffle=True), scoring="roc_auc").fit(X_train, y_train)
# best: C = 0.1, strategy = mean, CV AUC 0.738      <- the imputation strategy is a hyperparameter like any other, tuned inside the fold`,
      caption: "Because the whole pipeline is one estimator, the search refits every step per fold and per candidate: the imputer's median comes from that fold's training rows, the scaler's mean too, and the encoder's levels. Any preprocessing choice — the imputer, the encoder's `min_frequency`, the number of features to select, the transform's λ — is a tunable parameter with a validated value rather than a guess."
    },

    { t: "h2", n: "03", text: "A custom transformer that keeps the contract", id: "custom" },

    { t: "code", lang: "python", title: "RatioFeatures: append num_i / num_j columns, and pass scikit-learn's conformance checks (executed)",
      hl: [1, 3, 4, 6, 7, 9, 10, 15],
      code: `class RatioFeatures(TransformerMixin, BaseEstimator):                   # mixins first, BaseEstimator last: the required order
    """Append ratio columns X[:, i] / (X[:, j] + eps) for each (i, j) pair."""
    def __init__(self, pairs=((0, 1),), eps=1e-6):
        self.pairs = pairs; self.eps = eps                                # store constructor args unchanged: no validation, no derived state here
    def fit(self, X, y=None):
        X = validate_data(self, X, reset=True)                            # sets n_features_in_ and feature_names_in_; checks the array
        return self                                                       # fit returns self
    def transform(self, X):
        check_is_fitted(self)                                             # refuse to transform before fit
        X = validate_data(self, X, reset=False)                           # the same number of features as at fit time, or an error
        extra = [X[:, i] / (X[:, j] + self.eps) for i, j in self.pairs if max(i, j) < X.shape[1]]
        return np.c_[X, np.column_stack(extra)] if extra else X
    def get_feature_names_out(self, input_features=None):
        base = list(input_features) if input_features is not None else [f"x{i}" for i in range(self.n_features_in_)]
        return np.array(base + [f"{base[i]}_over_{base[j]}" for i, j in self.pairs if max(i, j) < len(base)])

check_estimator(RatioFeatures())                                          # passed: ~100 checks -- cloning, pickling, NaN handling, output shape, names
RatioFeatures(pairs=((3, 0),)).fit(X_num).get_feature_names_out(numeric)[-1]     # 'support_tickets_over_tenure_months'`,
      caption: "The rules the checks enforce: `__init__` stores its arguments and does nothing else (so `clone` and `get_params` work); `fit` validates and records the input shape; `transform` refuses to run unfitted and refuses a different width; nothing is learned in `transform`; and `get_feature_names_out` keeps the names flowing. A transformer that passes `check_estimator` composes with every Pipeline, search and CV in the library — and one that skips the checks is the one that breaks in production when a row arrives with a column missing. (`FunctionTransformer(func)` is the shortcut for stateless transforms; a class is needed when there is state, validation or names.)"
    },

    { t: "h2", n: "04", text: "Persistence, serving, caching", id: "serving" },

    { t: "code", lang: "python", title: "Save the fitted pipeline, load it elsewhere, score one row (executed)",
      hl: [1, 2, 5, 6, 7, 10],
      code: `joblib.dump(pipe, "churn_pipe.joblib")                     # the fitted preprocessing AND the model, one file
loaded = joblib.load("churn_pipe.joblib")                   # in the serving process: the same imputer medians, scaler means, encoder levels, coefficients

row = pd.DataFrame([{"tenure_months": 3, "monthly_fee": 7.99, "logins_30d": 2, "support_tickets": np.nan,
                     "discount_pct": 10, "plan": "basic", "region": "north", "channel": "paid"}])
loaded.predict_proba(row)[0, 1]                             # 0.725      <- a new basic-plan customer, three months in, two logins, no tickets recorded
loaded.predict_proba(row.assign(plan="family"))[0, 1]       # 0.736      <- an unseen plan: handle_unknown="ignore" gives all-zero plan columns, no exception

sklearn.__version__                                         # '1.8.0'   <- pin it with the artefact; a pickle from another version may not load or may load wrongly
# the row must be a DataFrame with the training column names: feature_names_in_ is checked, and a missing or renamed column is an error`,
      caption: "The artefact is the contract's payoff: every fitted quantity from the whole chain is in one object, so serving cannot drift from training by re-implementing a step. Three operational rules follow. Pin the library versions with the artefact. Score with a DataFrame carrying the training column names, because the pipeline validates them. And decide what unseen levels and NaN become before the first request, because the pipeline will do whatever it was told — here, ignore and impute — and an exception in serving is the default for anything untold."
    },

    { t: "code", lang: "python", title: "Caching expensive steps, and FeatureUnion (executed)",
      hl: [1, 4, 5],
      code: `Pipeline([("pre", pre), ("clf", LogisticRegression())], memory="./cache_dir")      # transformer outputs are memoised on disk
# a grid over clf__C then refits only the classifier per candidate, reusing the cached preprocessing:
#   grid over three C values, 3-fold:  cached 0.31 s   uncached 0.21 s      <- slower here: this preprocessing is trivial and the cache costs I/O.
#                                                                            the cache earns its place when the transformer is the expensive part (text vectorisation, PCA on wide data)
FeatureUnion([("scaled", StandardScaler()), ("log", FunctionTransformer(np.log1p))])   # the same column, two representations, side by side: width 2`,
      caption: "Measured rather than assumed: caching cost time on a cheap pipeline. It pays when a step takes seconds and the search only varies later steps. FeatureUnion is the horizontal cousin of Pipeline — several transformers on the same input, outputs concatenated — for feeding a model a raw and a transformed view of the same column."
    },

    { t: "viz",
      title: "One object, two phases",
      caption: "During fit, data flows through fit_transform at each step and the final fit; each step stores state. During predict, the same data shape flows through transform only, and the stored state is used unchanged. Cross-validation clones the whole object per fold so the states never mix.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two rows of boxes. Top row, fit phase: training data passes through imputer, scaler, encoder (each labelled fit_transform, storing state) into the classifier (fit). Bottom row, predict phase: new rows pass through the same boxes labelled transform only, into the classifier labelled predict. Arrows from the top boxes' stored state to the bottom boxes.">
  <defs>
    <marker id="ac-ah-36" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <g class="s-label" style="font-weight:600"><text x="20" y="50">fit(X_train, y_train)</text><text x="20" y="190">predict(X_new)</text></g>
  <g stroke-width="1.2">
    <rect x="200" y="30" width="130" height="46" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="360" y="30" width="130" height="46" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="520" y="30" width="130" height="46" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="700" y="30" width="150" height="46" rx="8" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
    <rect x="200" y="170" width="130" height="46" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="360" y="170" width="130" height="46" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="520" y="170" width="130" height="46" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="700" y="170" width="150" height="46" rx="8" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="265" y="50">imputer</text><text x="425" y="50">scaler</text><text x="585" y="50">encoder</text><text x="775" y="50">classifier</text>
    <text x="265" y="190">imputer</text><text x="425" y="190">scaler</text><text x="585" y="190">encoder</text><text x="775" y="190">classifier</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="265" y="68">fit_transform → medians_</text><text x="425" y="68">fit_transform → mean_, scale_</text><text x="585" y="68">fit_transform → categories_</text><text x="775" y="68">fit → coef_</text>
    <text x="265" y="208">transform only</text><text x="425" y="208">transform only</text><text x="585" y="208">transform only</text><text x="775" y="208">predict</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="330" y1="53" x2="360" y2="53" marker-end="url(#ac-ah-36)"/><line x1="490" y1="53" x2="520" y2="53" marker-end="url(#ac-ah-36)"/><line x1="650" y1="53" x2="700" y2="53" marker-end="url(#ac-ah-36)"/>
    <line x1="330" y1="193" x2="360" y2="193" marker-end="url(#ac-ah-36)"/><line x1="490" y1="193" x2="520" y2="193" marker-end="url(#ac-ah-36)"/><line x1="650" y1="193" x2="700" y2="193" marker-end="url(#ac-ah-36)"/>
  </g>
  <g style="stroke:var(--accent)" stroke-width="1.2" stroke-dasharray="4 3">
    <line x1="265" y1="78" x2="265" y2="168" marker-end="url(#ac-ah-36)"/><line x1="425" y1="78" x2="425" y2="168" marker-end="url(#ac-ah-36)"/><line x1="585" y1="78" x2="585" y2="168" marker-end="url(#ac-ah-36)"/><line x1="775" y1="78" x2="775" y2="168" marker-end="url(#ac-ah-36)"/>
  </g>
  <text x="440" y="130" class="s-sub" text-anchor="middle" style="fill:var(--accent)">stored state, used unchanged — the same object, serialised, serves in production</text>
</svg>`
    },

    { t: "callout", kind: "production", title: "The template", body: [
      { t: "p", text: "**Columns by name, in a ColumnTransformer with `remainder='drop'`.** Numeric branch: impute with indicator, transform if needed, scale if the model needs it. Categorical branch: impute a 'missing' level, encode with unknown handling. Text branch if any: vectoriser. **Then the model, in a Pipeline**, tuned by a search whose grid reaches into the preprocessing, scored by nested cross-validation, calibrated if probabilities are used as numbers. **Refit on all data, `joblib.dump` with the versions pinned, and a scoring function that takes a DataFrame with the training column names.** One artefact, one code path, no re-implementation."
    }]},

    { t: "ladder",
      title: "Handing a model to the platform team",
      rungs: [
        { level: "bad", label: "A model file and a notebook", code: `joblib.dump(model, "model.pkl")      # plus 'run cells 3-9 first to build the features'`,
          note: "**The features are re-implemented in serving** from a notebook that has since changed. Training–serving skew, by construction." },
        { level: "ok", label: "The fitted pipeline", code: `joblib.dump(pipe, "pipe.joblib")     # preprocessing and model together`,
          note: "**One artefact.** Loads with a warning on a different scikit-learn version; crashes on the first row with an unseen category unless that was handled." },
        { level: "best", label: "The pipeline, the versions, the schema, and a scoring function with tests", code: `artefact = {"pipeline": pipe, "sklearn": sklearn.__version__, "columns": list(X_train.columns), "trained_on": today}
def score(rows: pd.DataFrame) -> np.ndarray: assert list(rows.columns) == artefact["columns"]; return artefact["pipeline"].predict_proba(rows)[:, 1]
# tests: a known row gives a known score; an unseen level gives a score, not an exception; a NaN in every column gives a score`,
          note: "**The contract, extended to the boundary**: the column schema is asserted, the version is recorded, and the three failure modes of serving have a test each." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A conformant transformer and a full template",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Write `Winsorizer(lower=0.01, upper=0.99)`: `fit` learns the per-column percentiles, `transform` clips, `get_feature_names_out` passes names through; make it pass `check_estimator`. **(b)** Assemble the full template on the churn table: ColumnTransformer with a numeric branch (impute + indicator, Winsorizer, scale) and a categorical branch ('missing' level, one-hot with unknown handling), a logistic regression, a grid over `C` and the winsoriser's `upper` percentile, nested 5-fold AUC, then a refit on all rows and a `joblib` dump with the version. **(c)** Write the three serving tests from the ladder and run them against the loaded artefact." }
      ],
      requirements: [
        "(a) passes `check_estimator`; a two-line demonstration of clipping on the 999 fee.",
        "(b) the nested CV AUC with spread and the chosen parameters.",
        "(c) three passing tests: known row, unseen level, all-NaN row."
      ],
      hint: "Mixins before BaseEstimator. Store `lower` and `upper` unchanged in `__init__`; learn `lower_`/`upper_` arrays in `fit` with `np.nanpercentile`. In `transform`, `np.clip(X, self.lower_, self.upper_)` broadcasts per column. For the all-NaN test the imputer must come before the winsoriser in the numeric branch.",
      solution: {
        lang: "python",
        title: "template.py",
        code: `class Winsorizer(TransformerMixin, BaseEstimator):
    def __init__(self, lower=0.01, upper=0.99):
        self.lower = lower; self.upper = upper
    def fit(self, X, y=None):
        X = validate_data(self, X, reset=True, ensure_all_finite="allow-nan")
        self.lower_ = np.nanpercentile(X, 100 * self.lower, axis=0); self.upper_ = np.nanpercentile(X, 100 * self.upper, axis=0)
        return self
    def transform(self, X):
        check_is_fitted(self); X = validate_data(self, X, reset=False, ensure_all_finite="allow-nan")
        return np.clip(X, self.lower_, self.upper_)
    def get_feature_names_out(self, input_features=None):
        return np.asarray(input_features if input_features is not None else [f"x{i}" for i in range(self.n_features_in_)])
    def __sklearn_tags__(self):                                     # declare that NaN is accepted, or check_estimator demands you reject it
        tags = super().__sklearn_tags__(); tags.input_tags.allow_nan = True; return tags
check_estimator(Winsorizer())                                   # passes (executed) -- without the tag it fails: 'doesn't check for NaN and inf in fit'
Winsorizer().fit(d[["monthly_fee"]]).transform([[999.0]])        # [[20.72]] -- the 99th percentile of fees

pre = ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(strategy="median", add_indicator=True), Winsorizer(), StandardScaler()), numeric),
    ("cat", make_pipeline(SimpleImputer(strategy="constant", fill_value="missing"), OneHotEncoder(handle_unknown="ignore")), categorical)])
pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=2000))])
grid = {"clf__C": [0.03, 0.1, 0.3, 1], "pre__num__winsorizer__upper": [0.95, 0.99, 1.0]}
search = GridSearchCV(pipe, grid, cv=StratifiedKFold(5, shuffle=True, random_state=1), scoring="roc_auc")
outer = cross_validate(search, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=2), scoring="roc_auc", return_estimator=True)
print(outer["test_score"].mean(), outer["test_score"].std(), [e.best_params_ for e in outer["estimator"]])
# executed: nested AUC 0.751 ± 0.049; chosen per fold: (C 0.1, upper 0.95), (0.03, 1.0), (0.1, 0.99), (1, 1.0), (0.3, 0.95)
#           -- the winsoriser's percentile is not pinned down by 990 rows; C hovers around 0.1. Final refit chose C 0.1, upper 0.95.
final = search.fit(X, y)                                         # refit on everything; final.best_estimator_ is the artefact
joblib.dump({"pipeline": final.best_estimator_, "sklearn": sklearn.__version__, "columns": list(X.columns)}, "churn_artefact.joblib")

# (c)
art = joblib.load("churn_artefact.joblib"); pl = art["pipeline"]
known = X.iloc[[0]]; assert abs(pl.predict_proba(known)[0, 1] - final.best_estimator_.predict_proba(known)[0, 1]) < 1e-9     # known row, known score
unseen = known.assign(plan="family", region="mars"); assert 0 <= pl.predict_proba(unseen)[0, 1] <= 1                            # unseen levels: a score, not an exception
allnan = pd.DataFrame([{c: np.nan for c in X.columns}]); assert 0 <= pl.predict_proba(allnan)[0, 1] <= 1                        # every column missing: imputed, scored
# executed: known row 0.152; unseen plan and region 0.127; all-NaN row 0.191 -- three scores, no exceptions`,
        notes: [
          { t: "p", text: "**The winsoriser's `upper` is now a validated hyperparameter**: whether to clip at all (1.0) or at the 95th percentile is decided by the same cross-validation as C, inside the fold, with no leak of the test rows' percentiles." },
          { t: "p", text: "**The all-NaN test is the one that finds the ordering bug**: a winsoriser before the imputer would see NaN and, without `allow-nan`, refuse; an encoder before the 'missing' imputer would raise. Serving meets rows like this." },
          { t: "p", text: "**`check_estimator` is cheap insurance**: it runs the library's own suite against your class, and the cases it exercises — clone, pickle, single row, NaN, wrong width — are exactly the cases that appear at 3 a.m. It failed the first draft here for accepting NaN without declaring it; the tag is the fix." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does `clone` drop the fitted state, and why does cross-validation depend on that?",
          options: [
            "To save memory",
            "So that each fold starts from an unfitted copy with the same hyperparameters: fold 2's imputer, scaler, encoder and model must learn only from fold 2's training rows. If state carried over, fold 1's statistics would leak into fold 2's evaluation",
            "Because fitted state cannot be copied",
            "It does not drop the state"
          ],
          answer: 1,
          why: "Fitted state in trailing-underscore attributes and hyperparameters in constructor arguments is what makes 'copy the recipe, not the result' possible."
        }
      ]
    }
  ],

  takeaways: [
    "**fit learns and stores state in trailing-underscore attributes; transform and predict use it and never learn** — the promise everything is built on.",
    "**Hyperparameters are constructor arguments**, reachable by name with `__` nesting: `pre__num__simpleimputer__strategy`.",
    "**clone copies the recipe without the result**; CV and search clone per fold so states never mix.",
    "**ColumnTransformer routes columns to branches and concatenates**; `remainder='drop'` keeps unlisted columns out by default.",
    "**Recover feature names with `get_feature_names_out`** and read coefficients against them; `set_output('pandas')` for inspection.",
    "**Preprocessing choices are hyperparameters** — tune the imputer, the encoder, the winsoriser through the pipeline.",
    "**A custom transformer stores its arguments in `__init__`, validates in `fit`, refuses to transform unfitted, keeps names, and passes `check_estimator`.**",
    "**Persist the whole fitted pipeline with the library version pinned**; score with a DataFrame carrying the training column names.",
    "**Decide what unseen levels and NaN become before the first request** — and test the known row, the unseen level, the all-NaN row.",
    "**Cache expensive transformer steps in a search; skip it for cheap ones** — it cost time on the churn pipeline."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why use a Pipeline instead of applying transforms manually?",
        options: [
          "It is faster",
          "Because it makes fit-on-train / transform-on-test automatic for every step, gives search and CV access to preprocessing hyperparameters, refits every step per fold so nothing leaks, and produces one artefact that serves the identical transforms — the manual version depends on nobody forgetting any of that",
          "It is required by scikit-learn",
          "It improves accuracy"
        ],
        answer: 1,
        why: "The scaler-outside-the-fold experiment moved the score by a thousandth; the target encoder by a third. The Pipeline removes the class of error, not one instance."
      },
      {
        stem: "What does `remainder='drop'` do in a ColumnTransformer, and why is it the safe default?",
        options: [
          "Drops rows with missing values",
          "Discards any input column not assigned to a branch; safe because a column nobody listed — a leaked id, a post-outcome flag — cannot reach the model by accident. `passthrough` sends them through unchanged, which is convenient and dangerous",
          "Drops constant columns",
          "Drops the categorical columns"
        ],
        answer: 1,
        why: "Explicit column lists are a feature audit. Passthrough is how `refund_issued` gets into a churn model without anyone deciding it should."
      },
      {
        stem: "Which of these breaks the estimator contract?",
        options: [
          "Storing `self.lower = lower` in `__init__`",
          "Computing derived state in `__init__` — for example `self.lower_ = np.percentile(...)` or validating and converting arguments there — because `clone` and `get_params` rely on the constructor storing its arguments unchanged and learning nothing until `fit`",
          "Returning `self` from `fit`",
          "Calling `check_is_fitted` in `transform`"
        ],
        answer: 1,
        why: "`__init__` stores; `fit` learns; `transform` uses. `check_estimator` fails a class that computes in the constructor."
      },
      {
        stem: "A pipeline trained under scikit-learn 1.4 is loaded under 1.8 and gives different predictions without error. What happened, and what prevents it?",
        options: [
          "Nothing; predictions are always identical",
          "Pickle restores attribute values, not behaviour: if a transformer's internals changed between versions, the old state is interpreted by new code. Pin the library versions with the artefact, and keep a known-row test whose expected score is checked on load",
          "The random seed changed",
          "joblib is not deterministic"
        ],
        answer: 1,
        why: "Persistence is a contract between two versions of the code. The version string in the artefact and the known-row test are how you enforce it."
      },
      {
        stem: "When does `memory=` caching in a Pipeline pay off?",
        options: [
          "Always",
          "When an early transformer is expensive and the search varies only later steps — text vectorisation or PCA on wide data followed by a grid over the classifier; on the churn pipeline it cost time (0.31 s vs 0.21 s) because the preprocessing is trivial and the cache is disk I/O",
          "Only with random forests",
          "Never; it is deprecated"
        ],
        answer: 1,
        why: "Measured on the course pipeline: slower. The tool is right for the expensive-preprocessing case and wrong by default."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain the scikit-learn Pipeline and why it matters for production.",
        strong: "A Pipeline is a chain of transformers ending in an estimator that behaves as one estimator: fit calls fit_transform on each step in order with the training data, predict calls transform on each step then the final predict. Three things follow that matter in production. Leakage prevention is structural: every step is fitted on the training fold and only applied to validation, test and live rows, and cross-validation clones the whole chain per fold. Tuning reaches into preprocessing: the imputer strategy, the encoder's rare-level threshold, a winsoriser's percentile are hyperparameters addressed by name and validated like C. And serving gets one artefact: the fitted imputer medians, scaler means, encoder levels and model weights in one object, so the features in production are computed by the same code as in training — training–serving skew is impossible by construction rather than avoided by discipline. With a ColumnTransformer for mixed types and get_feature_names_out for interpretability, it is the unit I ship.",
        answer: [
          { t: "p", text: "Definition, then the three production consequences — leakage, tuning, one artefact — with the mechanism of each." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between fit, transform and fit_transform?",
        strong: "fit learns from data and stores what it learned in trailing-underscore attributes — a scaler's mean and scale, an encoder's categories, a model's coefficients — and returns self. transform applies that stored state to data without changing it, which is why it can be called on new rows forever. fit_transform is fit followed by transform on the same data, sometimes with a shortcut, and it is what a Pipeline calls on each step during training. The discipline they encode: fit_transform on the training fold, transform only on everything else. predict and predict_proba are the estimator's equivalents of transform; there is no fit_predict for supervised models because predicting the rows you just fitted is not evaluation.",
        answer: [
          { t: "p", text: "Where state lives, what each call does with it, and the fold rule the names encode." }
        ]
      },
      {
        level: "advanced",
        q: "When would you write a custom transformer, and what must it satisfy?",
        strong: "When a preprocessing step has state to learn, needs validation, or must carry feature names — winsorisation at fitted percentiles, a domain ratio feature, an aggregation keyed on training statistics; a stateless function is just FunctionTransformer. The class inherits TransformerMixin then BaseEstimator, in that order. Its constructor stores every argument unchanged and computes nothing, so clone and get_params work. fit validates the input, records the width and feature names, learns its state into underscore attributes and returns self. transform checks it is fitted, validates the input against the training width, and uses the state without altering it. get_feature_names_out keeps names flowing to the end of the pipeline. Then it is run through check_estimator, which exercises cloning, pickling, single rows, NaN handling and shape mismatches — the cases that would otherwise surface in serving. I would add a test that the transformer handles the all-NaN row and the unseen value, because those are the rows production sends first.",
        answer: [
          { t: "p", text: "When, the inheritance order, the four methods with their rules, check_estimator, and the serving tests." }
        ]
      }
    ]
  }
});

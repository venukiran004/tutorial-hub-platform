/* ============================================================================
   LESSON 1.2 — The Pipeline, End to End
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**A model is one step of twelve, and the projects that fail usually fail at one of the other eleven.** The problem was never defined, the split happened after the scaler was fitted, the test set was used nine times, the feature that scored 0.91 was a consequence of the label. This lesson walks the whole sequence on the course's churn table — framing, data, exploration, cleaning, features, split, baseline, model, evaluation, tuning, deployment, monitoring — with every number produced by running it, and a planted leak found on the way. It ends with the reference case: a million rows, two hundred columns, sixty of them fifteen per cent missing.",

  objectives: [
    "Write a problem definition with a business goal, an ML task, a success metric with a threshold, a baseline and a deployment shape",
    "Run the exploration that finds the target rate, the missingness pattern, the duplicates, the outliers and the leak — before any model",
    "Split train, validation and test so that the test set is touched once, and say when the split must be by time or by group",
    "Beat a majority baseline with a pipeline that cannot leak, choose the threshold on validation, report the test set once, and name what monitoring watches"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The twelve steps", id: "steps" },

    { t: "table",
      head: ["#", "Step", "Produces", "The mistake that survives to production"],
      rows: [
        ["1", "Problem definition", "Business goal, ML task, success metric with a number, baseline, deployment shape, stakeholders", "Starting to model before 'success' has a number"],
        ["2", "Data collection", "Rows with provenance: source, freshness, permissions, PII status", "Data that cannot be reproduced or refreshed"],
        ["3", "Exploration", "Target rate, distributions, missingness pattern, correlations, suspects for leakage", "Never looking at the target rate; using accuracy on 95/5"],
        ["4", "Cleaning", "Duplicates removed, sentinels made NaN, outliers classified as error or signal", "Deleting outliers that were the signal"],
        ["5", "Feature engineering", "Encoded, scaled, derived columns — with the fitting deferred to inside the fold", "Fitting a scaler on all rows before the split"],
        ["6", "Splitting", "Train, validation, test — stratified; by time for temporal data; by group for grouped data", "A random split of a time series or of a customer's repeated rows"],
        ["7", "Model selection and training", "A baseline and two or three candidates, trained inside a Pipeline", "No baseline, so nobody knows whether the model is doing anything"],
        ["8", "Evaluation", "Cross-validated scores with their spread, on the metric from step 1", "A single number from a single split"],
        ["9", "Tuning", "Hyperparameters chosen on validation or by nested CV", "Tuning on the test set"],
        ["10", "Final evaluation", "The test set, once", "The test set, nine times"],
        ["11", "Deployment", "The fitted Pipeline serialised; batch or real-time serving", "Feature code rewritten for serving — training–serving skew"],
        ["12", "Monitoring", "Input drift, prediction drift, delayed labels, retraining trigger", "Silent decay nobody measures"]
      ]
    },

    { t: "code", lang: "text", title: "Step 1 for the course problem — every line is a decision someone else will hold you to",
      code: `BUSINESS GOAL   Cut monthly cancellations by 15 % in Q3 by offering retention deals to customers likely to leave.
ML TASK         Binary classification: will this customer cancel within 30 days of the scoring date?
SUCCESS METRIC  Recall >= 0.70 among customers scored above threshold, at precision >= 0.25
                (the retention team can call ~10 % of the base per month; a wasted call costs less than a lost customer).
BASELINE        The current rule — tenure < 12 months and fewer than 8 logins — catches 14 % of churners (1.1).
DATA            1,000 subscribers, 11 columns, as of the scoring date; label = cancelled in the following 30 days.
DEPLOYMENT      Batch score the whole base nightly; write scores to the CRM; retrain monthly.
OWNERS          Retention (consumer), data engineering (features), analytics (model), legal (PII in features).`,
      caption: "The metric has a number, the number has a reason, and the baseline is what the model must beat. Without the third line, a model with recall 0.30 might be celebrated; without the fourth, a model with recall 0.30 might be shipped when the rule already had 0.14 and the difference is inside the noise."
    },

    { t: "h2", n: "02", text: "Exploration: what the table says before a model", id: "eda" },

    { t: "code", lang: "python", title: "The exploration that must happen first (executed on the churn table)",
      hl: [3, 6, 7, 10, 13, 17, 18],
      code: `df = pd.read_csv("churn.csv")                     # (1000, 12)
df.churned.mean()                                   # 0.162  -> 162 churners, 838 not: accuracy is out, 'always 0' scores 0.838
df.isna().sum()                                     # support_tickets: 128 missing (12.8 %)
df.groupby("plan").support_tickets.apply(lambda s: s.isna().mean())
#   basic 0.198   plus 0.045   pro 0.090             <- missing depends on plan: MAR, not random (3.3). An indicator column will carry signal.

df.drop(columns="customer_id").duplicated(keep=False).sum()     # 20 rows are exact copies of another row
#   ten customers appear twice: a random split would put one copy in train and the other in test (1.6)

# outliers by the IQR rule, per column
#   monthly_fee: 2  (max 999.0)        <- one is a planted data error: no plan costs 999
#   logins_30d: 17 (max 31)            <- real heavy users; keep them
#   support_tickets: 41 (max 4)        <- 'outlier' by IQR because the median is 1; keep them, they are the signal

# correlations with the target, and the one that is too good
df.select_dtypes("number").corr()["churned"].sort_values()
#   logins_30d -0.228   spend_12m -0.212   tenure_months -0.208   support_tickets +0.142   refund_issued +0.830
df.groupby("refund_issued").churned.mean()          # refund 0: 0.029    refund 1: 0.862
#   a refund is issued AFTER a cancellation. It is not a predictor; it is the label wearing a different name.`,
      caption: "Four findings, four decisions: stratify and pick a threshold-aware metric; impute tickets with an indicator; drop the duplicates before splitting; and drop `refund_issued` and `spend_12m` (the twelve-month spend is computed from months that include the churn). The correlation of 0.83 is the tell — real predictors of a noisy human decision do not correlate at 0.83."
    },

    { t: "dl", items: [
      ["Problem definition", "Business goal, ML task, success metric with a threshold, baseline, deployment shape, owners. Written before code; revised when the data disagrees."],
      ["Baseline", "The simplest thing that could work: the majority class, the current rule, last month's value. The model is judged by its distance from this, not from zero."],
      ["Validation set", "Held-out rows used to choose between models and thresholds. Can be used many times, because nothing is reported from it."],
      ["Test set", "Held-out rows used once, at the end, to report. Every use before that spends some of its honesty."],
      ["Stratified split", "Each split keeps the class proportions of the whole; without it a 16 % class can be 11 % in one fold and 21 % in another."],
      ["Training–serving skew", "Features computed one way for training and another for serving. Prevented by serialising the fitted Pipeline and running it in both places."]
    ]},

    { t: "h2", n: "03", text: "Split, baseline, model, evaluate — inside a Pipeline", id: "model" },

    { t: "code", lang: "python", title: "Steps 5–8: preprocessing that is fitted inside the fold, a baseline, and two candidates (executed)",
      hl: [2, 3, 6, 7, 11, 12, 13, 22, 23, 24],
      code: `clean = df.drop_duplicates(subset=df.columns.drop("customer_id"))          # 990 rows
X = clean[["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct", "plan", "region", "channel"]]
y = clean.churned                                                            # refund_issued and spend_12m are not features

X_train, X_tmp, y_train, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=42)
X_val, X_test, y_val, y_test = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=42)
# 693 / 148 / 149 rows; churn rate 0.163 / 0.162 / 0.161 -- stratification kept the base rate in all three

# every transform is a step in a Pipeline, so it is fitted on the training fold and only applied to the others
pre = ColumnTransformer([
    ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]),
            ["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct"]),
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["plan", "region", "channel"])])

candidates = {"majority": DummyClassifier(strategy="prior"),
              "logistic": LogisticRegression(max_iter=2000, class_weight="balanced"),
              "hist-gbdt": HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=3)}
cv = StratifiedKFold(5, shuffle=True, random_state=0)
for name, model in candidates.items():
    pipe = Pipeline([("pre", pre), ("model", model)])
    cross_val_score(pipe, X_train, y_train, cv=cv, scoring="roc_auc")             # five numbers, not one
#             5-fold AUC          5-fold AP     validation AUC   validation AP
# majority    0.500 +/- 0.000     0.163         0.500            0.162        <- AP of a constant predictor = the base rate
# logistic    0.730 +/- 0.053     0.358         0.706            0.410
# hist-gbdt   0.697 +/- 0.055     0.344         0.670            0.326        <- 693 rows is too few for boosting to win`,
      caption: "The spread matters as much as the mean: ±0.053 over five folds means the two models' difference of 0.03 is not established (2.7). The majority row is what every score must be read against — AP of 0.163 is what 'no skill' looks like on this base rate."
    },

    { t: "code", lang: "python", title: "What the leak would have done, and the last two steps (executed)",
      hl: [2, 3, 7, 8, 12, 13, 15],
      code: `# the same logistic pipeline with refund_issued added as a feature:
#   validation AUC 0.913            <- against 0.706 without it. A number that good on a noisy human decision is the alarm, not the win.
#   in production the refund flag is 0 at scoring time for everyone who has not yet cancelled: the model would score nobody.

# step 9 (tuning, kept minimal here) and the threshold: chosen on VALIDATION against the success metric
p_val = pipe.predict_proba(X_val)[:, 1]
for t in np.linspace(0.1, 0.9, 81): precision_score(y_val, p_val >= t), recall_score(y_val, p_val >= t)
# highest threshold with recall >= 0.70:  t = 0.50   precision 0.279   recall 0.708      <- meets the definition's 0.25 / 0.70

# step 10: the test set, once
p_test = pipe.predict_proba(X_test)[:, 1]
# test AUC 0.876   AP 0.641   precision 0.328   recall 0.917   at t = 0.50
# higher than validation. 149 rows contain 24 churners; an AUC on 24 positives has a wide interval (2.7). Report it with that caveat.

joblib.dump(pipe, "churn_pipeline.joblib")          # step 11: the fitted preprocessing AND model, as one object, for serving`,
      caption: "The threshold is set where the problem definition said, on validation, and the test set answers one question: does it hold? Here it does, with a warning about small numbers that belongs in the report. The saved object is the whole pipeline, so serving runs the identical imputation, scaling and encoding — no re-implementation, no skew."
    },

    { t: "viz",
      title: "Where each honesty rule lives",
      caption: "The split comes before every fitted transform; validation is used freely, the test set once; the pipeline that was fitted is the one that is served. Each arrow that goes the wrong way is a lesson in module 1 or 2.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A flow: raw table, then explore and clean, then a split into train, validation and test. Train feeds a fitted pipeline; validation is used repeatedly for choices; test is used once for the report; the fitted pipeline is serialised to serving and monitoring.">
  <defs>
    <marker id="ac-ah-12" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.2">
    <rect x="20" y="95" width="120" height="50" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="175" y="95" width="130" height="50" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="345" y="30" width="120" height="44" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="345" y="98" width="120" height="44" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="345" y="166" width="120" height="44" rx="8" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit)"/>
    <rect x="530" y="30" width="150" height="44" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="720" y="30" width="140" height="44" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="80" y="124">raw table</text>
    <text x="240" y="118">explore, clean</text>
    <text x="405" y="57">train 70 %</text>
    <text x="405" y="125">validation 15 %</text>
    <text x="405" y="193">test 15 %</text>
    <text x="605" y="57">fitted Pipeline</text>
    <text x="790" y="57">serve + monitor</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="240" y="134">dedupe · drop leaks</text>
    <text x="605" y="95">impute, scale, encode, model</text>
    <text x="605" y="110">fitted on train only</text>
    <text x="405" y="230" style="fill:var(--crit)">used once</text>
    <text x="405" y="160" style="fill:var(--good)">used freely: model choice, threshold</text>
    <text x="790" y="95">same object, same code</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="140" y1="120" x2="175" y2="120" marker-end="url(#ac-ah-12)"/>
    <line x1="305" y1="120" x2="345" y2="52" marker-end="url(#ac-ah-12)"/>
    <line x1="305" y1="120" x2="345" y2="120" marker-end="url(#ac-ah-12)"/>
    <line x1="305" y1="120" x2="345" y2="188" marker-end="url(#ac-ah-12)"/>
    <line x1="465" y1="52" x2="530" y2="52" marker-end="url(#ac-ah-12)"/>
    <line x1="680" y1="52" x2="720" y2="52" marker-end="url(#ac-ah-12)"/>
    <path d="M465,120 C500,120 500,74 530,74" stroke-dasharray="3 3" marker-end="url(#ac-ah-12)"/>
    <path d="M465,188 C520,188 560,80 605,74" stroke-dasharray="3 3" marker-end="url(#ac-ah-12)"/>
  </g>
  <text x="440" y="252" class="s-sub" text-anchor="middle">split before fit · validation for decisions · test for the report · one artefact for training and serving</text>
</svg>`
    },

    { t: "h2", n: "04", text: "The reference case: a million rows, two hundred columns", id: "case" },

    { t: "p", text: "Telecom churn, one million customers, two hundred columns; sixty columns are about 15 % missing, seventy have about 10 % outliers by the IQR rule. **The interviewer wants the sequence and the reasons, not a library list.**" },

    { t: "table",
      head: ["Stage", "Decision", "Reason"],
      rows: [
        ["Frame and split first", "Binary, imbalanced; stratified split, by time if churn is dated; a holdout untouched until the end", "Every transform below is fitted on train only; a split after imputation has already leaked"],
        ["Exploration and leakage", "Target rate; missingness pattern per column; drop IDs, constants, duplicates; drop anything known only after churn — disconnection date, final bill, refund", "The leak is the single most expensive mistake and the cheapest to find: a correlation that is too good"],
        ["Missing values, 60 columns", "Do not blanket-drop; numeric → median or model-based (KNN, iterative); categorical → a 'missing' level; add a `was_missing` indicator where missingness is informative", "Dropping 60 columns at 15 % loses most rows; missingness in telecom is usually MAR and often predictive"],
        ["Outliers, 70 columns", "Classify first: heavy usage and high spend are real signal; cap at the 1st–99th percentile or transform; prefer tree models that do not care", "Deleting 10 % of rows per column would delete the churners who called support eleven times"],
        ["Features", "One-hot low-cardinality; target or frequency encoding for high-cardinality (region, plan, handset) fitted in-fold; scale only for linear or distance models; domain features — tenure buckets, usage deltas, complaint counts", "Trees do not need scaling; target encoding leaks unless out-of-fold (3.2)"],
        ["Imbalance", "Class weights, or SMOTE on the training fold only; evaluate with PR-AUC and recall at the business threshold", "Accuracy at 90/10 is meaningless; resampling the validation fold fakes the score (8.2)"],
        ["Model", "Gradient-boosted trees as the strong baseline — mixed types, native missing handling, outlier-robust, 200 features; cross-validated search; calibrate the probabilities", "Retention offers are prioritised by score, so the score must be a probability (2.5)"],
        ["Evaluation", "PR-AUC, ROC-AUC, lift and gain by decile, calibration, cost-based threshold (offer cost vs lost customer); confirm on the holdout", "The business question is 'who to target', which is a decile question, not a threshold question"],
        ["Explain and act", "SHAP for global drivers and per-customer reasons, fed to the retention script", "A score without a reason is a call the agent cannot make (9.2)"],
        ["Productionise", "One Pipeline/ColumnTransformer fitted on train and serialised; nightly batch or an API; monitor feature drift, churn-rate drift and delayed-label performance; retrain on a schedule", "Train and serve must run identical code; decay is silent unless measured (11.1)"]
      ]
    },

    { t: "callout", kind: "production", title: "Version the data as well as the code", body: [
      { t: "p", text: "A score that cannot be reproduced cannot be defended. The training rows, the feature code, the split seed and the fitted artefact all need a version — a snapshot, a DVC or Delta table, a hash of the extract. **'We retrained and the AUC dropped 0.04' is a question with an answer only if last month's inputs still exist.**" }
    ]},

    { t: "ladder",
      title: "A first model for the churn table",
      rungs: [
        { level: "bad", label: "Scale, then split, then fit", code: `X_scaled = StandardScaler().fit_transform(X)              # fitted on every row, including the test rows
X_train, X_test, ... = train_test_split(X_scaled, y)
model.fit(X_train, y_train); model.score(X_test, y_test)`,
          note: "**The scaler saw the test set.** Small here, ruinous with target encoding or imputation by a model. And the score is one split, one number, no baseline." },
        { level: "ok", label: "Split, then fit transforms on train", code: `X_train, X_test, ... = train_test_split(X, y, stratify=y)
sc = StandardScaler().fit(X_train)
model.fit(sc.transform(X_train), y_train)`,
          note: "**Correct, by discipline.** Every new transform needs the same care, and serving needs the same `sc` object — easy to forget when there are six of them." },
        { level: "best", label: "Split, then a Pipeline, then cross-validate against a baseline", code: `pipe = Pipeline([("pre", pre), ("model", model)])
cross_val_score(pipe, X_train, y_train, cv=StratifiedKFold(5, shuffle=True), scoring="average_precision")
# alongside DummyClassifier(strategy="prior") in the same loop; threshold chosen on X_val; X_test once`,
          note: "**Correct by construction.** The Pipeline refits every transform per fold, the baseline sits in the same table, and the serialised object is what serving runs." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "The pipeline on a second problem",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Using the churn table, build the regression version: predict `spend_12m` from the same features (excluding `refund_issued` and `churned`). Write the step-1 definition with a metric and a baseline; explore the target; decide what to do with the `monthly_fee` outlier (it will matter now); split; compare a mean-predictor baseline, a ridge regression and a gradient-boosted regressor by 5-fold cross-validated MAE; report the test set once. Then say what is wrong with `spend_12m` as a prediction target for a customer who joined last month." }
      ],
      requirements: [
        "A step-1 block with a numeric success criterion and a baseline.",
        "The outlier decision stated with a reason.",
        "A Pipeline with imputation, scaling and encoding fitted in-fold; three candidates including the baseline; CV mean and spread.",
        "One test-set report, and the framing problem identified."
      ],
      hint: "MAE is the right metric because the 999 fee will generate one enormous squared error. For the framing: spend over twelve months is not known for anyone with less than twelve months of tenure — the target itself is truncated.",
      solution: {
        lang: "python",
        title: "spend_pipeline.py",
        code: `# STEP 1
# GOAL: forecast each customer's next-12-month spend for revenue planning.   TASK: regression.
# METRIC: MAE <= 12 (about 10 % of median spend, 104).   BASELINE: predict the training mean (MAE 46 on this target).
# DEPLOY: monthly batch.   CAVEAT: the target as recorded is spend over the past 12 months (see the framing note).

clean = df.drop_duplicates(subset=df.columns.drop("customer_id"))
clean = clean[clean.monthly_fee < 100]              # the 999 is a data error (no plan costs that); it is not signal about spend. One row.
X = clean[["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct", "plan", "region", "channel"]]
y = clean.spend_12m
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pre = ColumnTransformer([("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]),
                         ["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct"]),
                        ("cat", OneHotEncoder(handle_unknown="ignore"), ["plan", "region", "channel"])])
cands = {"mean": DummyRegressor(strategy="mean"), "ridge": Ridge(alpha=1.0),
         "hist-gbr": HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, max_depth=3)}
for name, m in cands.items():
    s = -cross_val_score(Pipeline([("pre", pre), ("m", m)]), X_train, y_train, cv=KFold(5, shuffle=True, random_state=0),
                         scoring="neg_mean_absolute_error")
    print(name, s.mean().round(2), s.std().round(2))
# mean     46.18 +/- 1.74      ridge   20.45 +/- 0.87      hist-gbr   7.43 +/- 0.21   (boosting wins: spend = fee x min(tenure, 12) x discount is an interaction)
best = Pipeline([("pre", pre), ("m", cands["hist-gbr"])]).fit(X_train, y_train)
mean_absolute_error(y_test, best.predict(X_test))       # 7.10, reported once

# FRAMING: spend_12m is the last twelve months' spend. For a customer with 3 months of tenure it is three months of spend,
# and for everyone it is the past, not the future. A forecast target needs an as-of date and a window after it (1.6, 7.2 of the SQL course).`,
        notes: [
          { t: "p", text: "**The outlier decision changes with the target.** For churn the 999 barely mattered (trees ignore it, scaling squashes it); for spend it is a row whose target was computed from a wrong fee. Error, not signal: remove it and say so." },
          { t: "p", text: "**Boosting wins here and lost on churn** — the spend target is a product of three columns, which a linear model cannot express without interaction features. 'Which model' depends on the shape of the target; the CV table is how you find out." },
          { t: "p", text: "**The framing problem is the real answer.** A model that predicts past spend from present features is a description, not a forecast; the exercise's model is fine as a demonstration of the pipeline and wrong as a product." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Adding `refund_issued` raised validation AUC from 0.706 to 0.913. What should you conclude?",
          options: [
            "The feature is valuable; ship it",
            "A jump that large on a noisy human decision is the signature of leakage: refunds are issued after cancellation, so the feature is the label in disguise and will be zero for every not-yet-churned customer at scoring time",
            "The model is overfitting",
            "Validation AUC is unreliable"
          ],
          answer: 1,
          why: "The churn-by-refund table showed 0.862 against 0.029. Real predictors of churn correlate at 0.1–0.3; 0.83 is a consequence, not a cause."
        }
      ]
    }
  ],

  takeaways: [
    "**Twelve steps; the model is one of them.** Most failures are in framing, splitting, leakage and evaluation.",
    "**Step 1 needs a metric with a number, a reason for the number, a baseline and a deployment shape** — before code.",
    "**Exploration finds the target rate, the missingness pattern, the duplicates, the outliers and the leak**; a correlation that is too good is the alarm.",
    "**Deduplicate and drop leaks before splitting**; split before fitting anything; stratify; by time for temporal data; by group for repeated entities.",
    "**Validation is used freely, the test set once**; the test number carries a caveat when the positives are few.",
    "**A Pipeline makes fit-on-train automatic** and gives serving the identical transforms — no training–serving skew.",
    "**The baseline sits in the same table as the candidates**; a constant predictor's AP equals the base rate.",
    "**Report CV scores with their spread**; a 0.03 difference with ±0.05 spread is not a result.",
    "**Choose the threshold on validation against the step-1 metric**, not at 0.5 by default.",
    "**Version data, code, seed and artefact** so a changed score has a cause."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why must deduplication happen before the split?",
        options: [
          "To save memory",
          "A row present twice can land once in train and once in test; the model then scores a row it has seen, inflating the test metric — the executed table had ten such pairs",
          "Duplicates break stratification",
          "It does not matter"
        ],
        answer: 1,
        why: "Any leak across the split — duplicates, the same customer's repeated rows, overlapping time windows — makes the test set partly training data."
      },
      {
        stem: "The 5-fold AUCs are logistic 0.730 ± 0.053 and gradient boosting 0.697 ± 0.055. What can you claim?",
        options: [
          "Logistic regression is the better model",
          "The two are within each other's fold-to-fold spread; the difference is not established on 693 rows, and either could be chosen on other grounds — simplicity, calibration, latency",
          "Gradient boosting is overfitting",
          "More folds would settle it"
        ],
        answer: 1,
        why: "The spread is the point of reporting five numbers. A paired comparison on the same folds (2.7) is the formal version; the informal one is that ±0.05 swallows 0.03."
      },
      {
        stem: "Sixty of two hundred columns are 15 % missing. What is the wrong response and why?",
        options: [
          "Impute with the median",
          "Drop every row with any missing value: with sixty columns each missing 15 %, almost no row is complete, so this discards most of the data; impute by type, add missingness indicators, and prefer models that handle NaN",
          "Add an indicator column",
          "Use KNN imputation"
        ],
        answer: 1,
        why: "Row-wise deletion compounds across columns. The reference case's whole point is that the naive fix destroys the dataset."
      },
      {
        stem: "Why serialise the whole Pipeline rather than the model alone?",
        options: [
          "Smaller file",
          "So that serving applies the same fitted imputation, scaling and encoding as training; a re-implementation of the features for serving is where training–serving skew comes from",
          "The model cannot be saved alone",
          "For versioning"
        ],
        answer: 1,
        why: "The fitted transforms are parameters as much as the coefficients are. One artefact, one code path."
      },
      {
        stem: "The test AUC (0.876) came back well above validation (0.706). What is the right report?",
        options: [
          "Report 0.876 as the model's performance",
          "Report both, note that the test set holds 24 positives so its AUC has a wide interval, and treat the CV mean with its spread as the more reliable estimate",
          "Re-split until they agree",
          "Report the validation number"
        ],
        answer: 1,
        why: "Re-splitting until the numbers please you is using the test set many times. Small holdouts are noisy; say so and lean on cross-validation (2.7)."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Walk me through how you would build a churn model from scratch.",
        strong: "First the definition: the business goal, the ML task with an as-of date and a label window, a success metric with a number the retention team agreed to, and the baseline we must beat — usually an existing rule. Then the data with provenance, and exploration before modelling: target rate, missingness pattern, duplicates, outliers classified as error or signal, and a leakage sweep for anything known only after churn. Deduplicate, drop leaks, split — stratified, by time if the label is dated — and hold the test set back. Everything else lives in a Pipeline so transforms fit inside the fold: imputation with indicators, encoding, scaling if the model needs it. A majority baseline, a logistic regression and gradient boosting, compared by cross-validated PR-AUC with spread. Choose the threshold on validation against the agreed recall and precision, calibrate if scores drive prioritisation, evaluate the test set once with a caveat about small counts, serialise the pipeline, serve it in batch, and monitor drift and delayed-label performance with a retraining schedule.",
        answer: [
          { t: "p", text: "The as-of framing, the leakage sweep, the baseline in the same table, and the threshold chosen on validation are the details that show you have shipped one." }
        ]
      },
      {
        level: "core",
        q: "Why is the test set used only once?",
        strong: "Because each look at it is a decision made on it, and a decision made on data is a fit to that data. Choose a model on the test set and the test score is now a validation score with an optimistic bias; do it ten times and the reported number is the best of ten draws. The validation set exists precisely so that decisions have somewhere to happen; the test set's only job is to answer, once, whether the final choice holds on rows that influenced nothing. If the test result is surprising, the honest response is to report it with its uncertainty, not to re-split until it is not.",
        answer: [
          { t: "p", text: "'The best of ten draws' is the intuition that convinces people." }
        ]
      },
      {
        level: "advanced",
        q: "One million rows, two hundred columns, sixty of them 15 % missing and seventy with 10 % outliers. Design the pipeline.",
        strong: "Split first — stratified, and by time if churn is dated — with an untouched holdout, so every transform is fitted on train. Explore: target rate, the missingness mechanism per column, and a leakage sweep that drops disconnection dates, final bills and anything post-churn, plus IDs and constants. Missing values: never row-wise deletion at that density; median or model-based imputation for numerics, a 'missing' level for categoricals, and indicator columns because missingness is usually informative in telecom. Outliers: decide signal versus error first — heavy usage is real — then cap at percentiles or transform, and lean on tree models that are robust to them. Features: one-hot for small categoricals, out-of-fold target encoding for large ones, domain features like usage deltas and complaint counts, scaling only if a linear model is in the comparison. Imbalance by class weights or in-fold resampling, evaluated by PR-AUC and recall at the business threshold. Gradient-boosted trees as the strong baseline with cross-validated tuning and calibration, evaluated by lift and gain per decile because the business question is who to target, with a cost-based threshold. SHAP for the retention script. One Pipeline serialised for batch scoring, drift and performance monitoring, scheduled retraining.",
        answer: [
          { t: "p", text: "The sequence, the reason at each step, and the refusal to row-delete — that is the answer the case is testing for." }
        ]
      }
    ]
  }
});

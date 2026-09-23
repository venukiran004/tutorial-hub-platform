/* ============================================================================
   LESSON 11.1 — Serving, Monitoring and Drift
   ========================================================================= */
EC.receiveLesson({
  id: "11.1",

  lede: "**A model in production is a service with a contract, a monitor and a rollback, and the model file is the smallest part of it.** This lesson deploys the course's churn pipeline three ways and measures each: the scikit-learn pipeline answers one row in 8.4 ms and 9,920 rows in 19 ms, so per-request serving is 400 times more expensive per row than batch; ONNX Runtime answers one row in 0.25 ms; a FastAPI service wrapped around the pipeline answers in 20 ms in-process and rejects a malformed request with a 422. Training–serving skew is manufactured and measured: a feature counted over 28 days instead of 30 moves predictions by 0.01 on average and flips no decisions, while a skipped imputation moves them by up to 0.24 — and a golden test of twenty stored rows catches both. A shifted batch is caught by KS tests, PSI and a domain classifier at AUC 0.922, and the large-sample trap is shown with 100,000 rows where a shift of 0.02 standard deviations is 'significant' at p = 10⁻⁶ and irrelevant at PSI 0.0007. ADWIN detects a concept change 71 samples after it happens; an A/B test needs 31,217 users per arm to see half a point of conversion; and a rollback to the previous model version — same AUC, 61 % of customers flagged instead of 10 % — shows that the threshold is part of the artefact.",

  objectives: [
    "Choose between batch, real-time and streaming inference from measured latency and throughput, and build a minimal service with input validation",
    "Explain training–serving skew, manufacture it, measure it, and prevent it with shared feature code and golden tests",
    "Detect data drift with two-sample tests, PSI and a domain classifier, and avoid the large-n trap",
    "Distinguish data drift from concept drift, and detect the latter on a stream with ADWIN",
    "Roll out safely with shadow and canary deployments, size an A/B test, and roll back with a registry and model card"
  ],

  prerequisites: ["8.5", "10.9", "9.3"],

  blocks: [

    { t: "h2", n: "01", text: "Serving shapes, measured", id: "serving" },

    { t: "code", lang: "python", title: "The churn pipeline (ColumnTransformer → LogisticRegression, test AUC 0.744) served three ways (executed)",
      code: `#  shape                                  one row per call (p50 / p99)     batch
#  scikit-learn pipeline                     8.36 ms / 12.16 ms              248 rows 9.1 ms (0.037 ms/row);  9,920 rows 19 ms (1.9 µs/row)
#  ONNX Runtime (8.5's export)               0.249 ms / 0.510 ms             248 rows 36.6 ms -- string categoricals through ONNX's one-hot are slow in batch
#  FastAPI service, in-process TestClient    20.24 ms / 28.56 ms             validation + DataFrame + pipeline; no network

# capacity from these numbers: one synchronous worker ~82 req/s at p99 for the pipeline, ~1,961 for ONNX, ~35 through FastAPI;
# 500 req/s at p99 needs 7, 1 and 15 workers respectively -- and a nightly batch scores a million customers in about 2 s`,
      caption: "The pandas → ColumnTransformer → estimator path has a fixed per-call cost of several milliseconds that batch amortises over thousands of rows; that is the whole case for batch scoring wherever the decision can wait until the nightly run. ONNX removes the Python overhead for the single-row case and is the right export for a latency budget under a millisecond. The ONNX file here was exported from the tuned pipeline of 8.5, so its predictions are not compared with this pipeline's; parity is checked against the model it was exported from (6.1 × 10⁻⁸ there)." },

    { t: "table", head: ["Shape", "How", "Latency", "Use when"], rows: [
      ["Batch", "a scheduled job writes predictions to a table", "microseconds at read", "the decision can wait: churn queues, demand plans, risk scores refreshed nightly"],
      ["Real-time", "a service called per request (REST or gRPC)", "1–50 ms", "the prediction is needed inside a user interaction: fraud at checkout, ranking, pricing"],
      ["Streaming", "a consumer on an event stream scores as events arrive", "sub-second, asynchronous", "monitoring, alerting, features that must be fresh"],
      ["Edge", "the model runs on the device", "no network", "offline, privacy, latency, or scale that a central service cannot meet"]
    ] },

    { t: "code", lang: "python", title: "A minimal service with a validated contract (executed in-process)",
      code: `class Customer(BaseModel):                                   # pydantic: the request schema IS the contract
    tenure_months: float; monthly_fee: float; logins_30d: float; support_tickets: float; discount_pct: float
    plan: str; region: str; channel: str

MODEL = {"pipe": joblib.load("churn_pipe.joblib"), "version": "churn_pipe@" + sha256(file)[:8]}

@app.post("/predict")
def predict(c: Customer):
    df = pd.DataFrame([c.model_dump()])[FEATURES]                  # the SAME column list the training job used
    return {"churn_probability": float(MODEL["pipe"].predict_proba(df)[0, 1]), "model_version": MODEL["version"]}

@app.get("/health")
def health(): return {"status": "ok", "model_version": MODEL["version"], "sklearn": sklearn.__version__}

POST /predict {tenure 43, fee 20.15, ...}  ->  200 {"churn_probability": 0.1262, "model_version": "churn_pipe@8544f1a0"}
POST /predict {monthly_fee: "twelve"}       ->  422 "Input should be a valid number, unable to parse string as a number"
GET  /health                                ->  {"status": "ok", "model_version": "churn_pipe@8544f1a0", "sklearn": "1.8.0"}`,
      caption: "Three things a notebook does not have: a schema that rejects bad input before the model sees it, a version stamp on every response so a prediction can be traced to the artefact that made it, and a health endpoint the orchestrator polls. The model loads once at start-up, not per request; the container pins the Python and library versions from the model card (§06)." },

    { t: "h2", n: "02", text: "Training–serving skew", id: "skew" },

    { t: "p", text: "Skew is any difference between how a feature is computed when the model is trained and when it is served: a different code path, a different data source, a different window, a preprocessing step that lived in the training script and not in the pipeline. The model sees inputs from a distribution it was not fitted on and is silently wrong. Three cases were manufactured on the churn service and measured." },

    { t: "code", lang: "python", title: "Three skews, measured on the 248 test customers (executed)",
      code: `# 1. serving counts logins over 28 days, training counted 30:
#    AUC 0.742 (was 0.744); mean predicted churn 0.163 vs 0.153; mean |Δp| 0.010; decisions flipped at 0.35: 0 of 248    -- small, and invisible without a check
# 2. columns arrive in a different ORDER (a DataFrame with names): max |Δp| = 0.0                                         -- safe: the ColumnTransformer selects by name
# 3. support_tickets arrives as NaN, because the training SCRIPT filled the median before the pipeline and the service does not:
#    mean p 0.227 vs 0.153; max |Δp| 0.239                                                                                 -- a fifth of the customers move by more than a decision

# the golden test: 20 stored rows scored through the service match the training-time predictions to 0.0000`,
      caption: "The third case is the classic: a preprocessing step outside the pipeline object. 8.5's rule — every transformation that touches the data is a step inside the artefact — is what prevents it; the golden test is what catches it. The first case is the subtle one: a plausible feature, a plausible number, a slow bleed of accuracy that only a comparison against training-time predictions on stored rows would reveal. The structural fix is a single feature function or a feature store called by both the training job and the service." },

    { t: "h2", n: "03", text: "Data drift: two-sample tests, PSI and the domain classifier", id: "drift" },

    { t: "code", lang: "python", title: "A shifted batch (fees +10 %, logins −20 %) against the training reference (executed)",
      code: `#  feature          KS statistic   KS p        PSI       (Bonferroni α = 0.05 / 5 = 0.01;  PSI alarm 0.2)
#  tenure_months        0.051      0.68        0.051
#  monthly_fee          0.369      4.5e−23     1.559      <- shifted
#  logins_30d           0.187      3.5e−06     0.228      <- shifted
#  support_tickets      0.015      1.00        0.002
#  discount_pct         0.029      1.00        0.004

domain classifier (reference rows labelled 0, new rows 1; 5-fold): AUC 0.922         an unshifted batch: AUC 0.485
does it matter to the MODEL?  mean predicted churn 0.176 vs 0.153;  PSI of the prediction distribution 0.069

the large-n trap: two samples of 100,000 from N(0, 1) and N(0.02, 1):  KS p = 1.6e−06 (significant),  PSI 0.0007 (negligible)`,
      caption: "Per-feature tests localise the change; the domain classifier — can a model tell the batches apart? — catches shifts in combinations that no marginal test sees, and its feature importances say where. With large batches every test is significant, because p-values measure evidence against 'identical', not the size of the difference: monitor an effect size (PSI, the KS statistic, the domain AUC) with a threshold, and monitor the prediction distribution, which is the only drift the decision feels. 10.9 showed the other half: PSI needs enough rows and a like-for-like reference, or it alarms on its own noise." },

    { t: "callout", kind: "tradeoff", title: "Data drift is not concept drift", body: [{ t: "p", text: "Data drift is P(X) changing: the inputs moved. Concept drift is P(Y | X) changing: the relationship moved. A model can be perfectly right under data drift — it just sees more of some customers — and perfectly wrong under concept drift with inputs that look identical. The two need different monitors: input distributions for the first, and the model's *errors* for the second, which requires labels and therefore arrives late. The stream experiment below shows both, and shows the detector that watches errors firing in both cases — for opposite reasons." }] },

    { t: "h2", n: "04", text: "Concept drift on a stream: ADWIN", id: "concept" },

    { t: "code", lang: "python", title: "ADWIN on the error indicator of a deployed classifier (executed, river)",
      code: `# a logistic model trained on the first 1,500 of a 6,000-sample stream; at t = 3,000 the sign of feature 0's effect flips (P(y|x) changes)
adwin = river.drift.ADWIN(delta=0.002)
for t, is_error in enumerate(model.predict(x_t) != y_t): adwin.update(is_error); if adwin.drift_detected: alarm(t)
# error rate 0.224 before, 0.565 after;  alarm at t = 3,071 -- 71 samples after the change

# the control: feature 0 shifts by +2 at t = 3,000 and P(y|x) does NOT change (data drift only)
# KS on feature 0: p = 0.0;  error rate 0.231 before, 0.111 after;  ADWIN alarms at t = 3,263 -- because the error rate FELL:
# the shifted inputs are easier to classify; the model is still right, and the direction of the change says so`,
      caption: "ADWIN keeps an adaptive window over a stream of a statistic and cuts it wherever two sub-windows' means differ by more than a bound that depends on δ; it has no threshold to set beyond δ and adapts its window to the rate of change. The exercise measures δ: at 0.2 it false-alarms in a third of stationary runs and reacts in 111 samples; at 0.002 it never false-alarms and reacts in 239. Watching errors requires labels, which arrive with a delay — churn is known a month later, fraud when the chargeback lands — so the input monitors of §03 are the early warning and the error monitor is the confirmation." },

    { t: "table", head: ["Monitor", "Watches", "Needs labels", "Catches"], rows: [
      ["Input schema and freshness", "types, ranges, null rates, arrival time", "no", "broken pipelines before any model sees them"],
      ["Feature distributions (KS, PSI, domain classifier)", "P(X) against a like-for-like reference", "no", "data drift; the population moving"],
      ["Prediction distribution", "the score histogram and the flagged share", "no", "the drift the decision feels; a broken feature"],
      ["Error stream (ADWIN, DDM, rolling AUC)", "P(Y | X) through the model's mistakes", "yes, delayed", "concept drift"],
      ["Business metric against the baseline", "conversion, retained revenue, fraud caught", "yes", "whether the model is still worth serving"]
    ] },

    { t: "h2", n: "05", text: "Rolling out: shadow, canary, A/B", id: "rollout" },

    { t: "dl", items: [
      ["Shadow", "The new model scores all traffic and its predictions are logged, not served. Zero user risk; validates latency, error rate and the prediction distribution against the incumbent; cannot measure user behaviour, because nobody saw its output."],
      ["Canary", "The new model serves a small slice — 5 or 10 % — with guardrails on latency, errors and a business metric, widened on a schedule if they hold and rolled back automatically if they break."],
      ["A/B test", "Traffic split by a stable hash of the user, business metrics compared with a statistical test sized in advance. The only rollout that measures what the model does to behaviour."],
      ["Interleaving (ranking systems)", "Both models' results mixed in one list; clicks attributed to the source. Far more sensitive than an A/B test for rankers."]
    ] },

    { t: "code", lang: "python", title: "Assignment, sample size and a canary guardrail (executed)",
      code: `bucket = int(md5(f"exp42:{user_id}").hexdigest(), 16) % 100          # stable: the same user always lands in the same arm
# share in the 10 % canary over 50,000 users: 0.1010;  buckets under a different experiment salt are independent: correlation −0.003

# how many users per arm to detect a conversion lift (α 0.05, power 0.8, two arms)?
#   5.0 % -> 5.5 %:  31,217 per arm        5.0 % -> 6.0 %:  8,143        20 % -> 21 %:  25,580
# a 10 % canary whose true conversion is 4.5 % against the incumbent's 5.0 %, 10,000 users a day, a one-sided z-test at each daily check:
#   median 6 days to the guardrail, 90th percentile 18 -- and daily peeking inflates the false-alarm rate, so a sequential test is the honest version`,
      caption: "Never rely on offline metrics alone: the backtest says the model is better at its task, the A/B test says whether that changes what people do. Sizing comes first — a half-point lift on a 5 % conversion needs 31,000 users an arm, which is weeks for a small product — and the guardrails (latency, error rate, a floor on the business metric) are what make a canary safe to run before the test is powered." },

    { t: "h2", n: "06", text: "Registry, model card and rollback", id: "registry" },

    { t: "code", lang: "python", title: "The registry entry, and what a rollback actually changes (executed)",
      code: `{"name": "churn_pipe", "version": "churn_pipe@8544f1a0", "trained_at": "2026-09-17", "sklearn": "1.8.0", "python": "3.11.3",
 "features": [tenure_months, monthly_fee, logins_30d, support_tickets, discount_pct, plan, region, channel],
 "training_rows": 741, "data_sha": "2ceb66cde9c0", "metrics": {"test_auc": 0.7439, "test_log_loss": 0.3922},
 "intended_use": "rank customers for a retention call at a 0.35 threshold; not for pricing",
 "known_limits": "customers with tenure >= 1 month; support_tickets imputed at the median; no data after 2026-09", "golden_rows": 20}

# the previous registered version (a class-weighted logistic regression): AUC 0.743 -- the same
# but mean predicted probability 0.428 vs 0.153, and 61 % of customers flagged at the 0.35 threshold vs 10 %; agreement on the decision 0.488
# rollback = point the service at the previous artefact, re-run the golden test (0.0e+00 on its own stored predictions), AND restore its threshold`,
      caption: "A registry is a table of versions with their code, data hash, environment, metrics and stage (staging, production, archived) — MLflow, Weights & Biases and the cloud platforms' registries are the usual implementations, alongside experiment tracking that records every run's parameters and metrics, and an orchestrator (Airflow, Kubeflow Pipelines, Dagster) that runs the training, evaluation and registration steps as a versioned pipeline; a model card is the human-readable half — what it is for, what it was trained on, where it fails. The rollback shows why the threshold and the calibration belong in the artefact: two versions with identical AUC disagreed on half the decisions, because one was class-weighted and the other calibrated. Rolling back the model without rolling back the threshold would have sextupled the retention queue." },

    { t: "ladder",
      title: "Putting the churn model into production",
      rungs: [
        { level: "bad", label: "pickle.load in a Flask route; preprocessing copied from the notebook", code: `model = pickle.load(open("model.pkl", "rb"))
@app.route("/predict") def p(): x = preprocess(request.json); return model.predict_proba(x)`,
          note: "**No schema, no version on the response, preprocessing that will drift from the training script (the NaN case: +0.24), no monitor, no way back.**" },
        { level: "ok", label: "The pipeline artefact behind a validated endpoint, with a version stamp and a health check", code: `MODEL = load(artefact); class Customer(BaseModel): ...
@app.post("/predict") -> {"p": ..., "model_version": ...}     # 20 ms in-process; 422 on bad input`,
          note: "The contract exists and the artefact is one object. Still no drift monitor, no golden test, no rollout plan, and per-request serving for a decision that is made once a night." },
        { level: "best", label: "Batch where the decision allows it, a registry with cards and golden rows, input and prediction monitors, error monitors when labels land, shadow → canary → A/B with guardrails", code: `nightly: score all customers in 2 s; write (customer, score, model_version, run_id)
monitors: schema + freshness; PSI / domain AUC on features vs a year-ago reference; prediction PSI; ADWIN on errors as labels arrive
rollout: shadow one week -> 10 % canary with guardrails -> A/B sized at 31k/arm -> registry stage = production; rollback = previous version + its threshold`,
          note: "Each failure mode measured in this lesson has a control: skew (golden rows, one feature function), data drift (effect-size monitors), concept drift (the error stream), a bad release (canary guardrails), a wrong decision rule (the threshold in the card)." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The scikit-learn pipeline scored one row in 8.4 ms and 9,920 rows in 19 ms. What does that imply for a churn model whose output feeds a nightly retention queue?",
          options: [
            "Serve it in real time — 8 ms is fast enough",
            "Score in batch: the per-call overhead (pandas, the ColumnTransformer, Python) is amortised over the batch, a million customers take about 2 s, and a decision made once a night gains nothing from a service that costs 400 times more per row",
            "Convert it to ONNX and serve in real time",
            "Use streaming"
          ],
          answer: 1,
          why: "The serving shape follows from when the decision is made, not from how fast the model can be. Real-time serving is for predictions needed inside an interaction; ONNX's 0.25 ms is the answer when that is the case and the budget is tight. For a nightly queue, batch is simpler, cheaper, and produces the audit table for free."
        },
        {
          stem: "A serving path counted logins over 28 days where training used 30. The measured effect was a 0.01 mean change in predicted probability and no flipped decisions. Is it a problem?",
          options: [
            "No — the effect is negligible",
            "Yes: it is a silent, systematic bias in every prediction that no monitor on inputs or outputs would flag, it compounds with every other small skew, and the golden test — stored rows scored through the service against training-time predictions — exists to catch exactly this class of fault",
            "Only if the AUC drops",
            "No — the ColumnTransformer handles it"
          ],
          answer: 1,
          why: "The dangerous skews are the plausible ones. A 6 % undercount of logins moved the mean prediction by 0.01 this time; a model that leans harder on logins, or a threshold nearer the mass of the distribution, would flip decisions. The fix is structural — one feature function for both paths — and the test is the golden set, which matched to 0.0000 when the paths agreed."
        },
        {
          stem: "On a batch of 100,000 rows, a KS test on a feature gives p = 10⁻⁶ but PSI is 0.0007. What should the monitor do?",
          options: [
            "Alarm — the p-value is tiny",
            "Nothing: with 100,000 rows any difference is 'significant', including a shift of 0.02 standard deviations; monitors on large batches must threshold an effect size (PSI, the KS statistic, the domain-classifier AUC) and watch the prediction distribution, not p-values",
            "Retrain the model",
            "Reduce the batch size until p > 0.05"
          ],
          answer: 1,
          why: "A p-value measures evidence that two distributions are not identical, and with enough data that is always true. The question the monitor must answer is whether the change is large enough to matter to the decision, which is an effect size — and, most directly, the PSI of the model's own predictions (0.069 for the shifted batch that mattered, against a fee PSI of 1.56)."
        },
        {
          stem: "ADWIN on the error stream fired 71 samples after a concept change and also fired 263 samples after a pure input shift. How are the two alarms told apart?",
          options: [
            "They cannot be",
            "By the direction and the companion monitors: under the concept change the error rate rose from 0.22 to 0.57 with no input drift; under the input shift the error rate fell to 0.11 and the feature monitor had already fired — the inputs moved to an easier region and the model was still right",
            "By the value of δ",
            "By waiting for more samples"
          ],
          answer: 1,
          why: "ADWIN detects any change in the mean of what it watches, including improvements. Reading its alarm needs the sign of the change and the state of the input monitors: concept drift is a rise in error without input drift; a fall in error with input drift is a population that got easier. The retraining decision differs — the first needs new labels, the second may need nothing."
        }
      ] },

    { t: "exercise",
      kind: "Investigate",
      title: "Capacity from latency, a categorical drift, and ADWIN's δ",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** From the measured p50 and p99 latencies (pipeline 8.36 / 12.16 ms, ONNX 0.249 / 0.510 ms, FastAPI 20.24 / 28.56 ms), compute the requests per second one synchronous worker can serve at p50 and at p99, and the workers needed for 500 req/s at p99. Compare with the nightly batch of a million customers." },
        { t: "p", text: "**(b)** Build a batch in which half of the organic-channel customers now arrive as paid and nothing else changes. Compute the categorical PSI and a chi-square test on the channel mix, the KS test on monthly_fee, a domain-classifier AUC on all features, and the effect on the mean predicted churn and the share flagged at 0.35. What would a numeric-only monitor have seen?" },
        { t: "p", text: "**(c)** On 200 stationary error streams of 20,000 samples whose error rate rises from 0.20 to 0.35 at t = 10,000, run ADWIN with δ = 0.2, 0.002 and 0.00002 and report the false-alarm rate before the change and the median and 90th-percentile delay after it." }
      ],
      requirements: [
        "(a) three rows of capacity numbers and the batch comparison.",
        "(b) five numbers and the sentence.",
        "(c) a three-row table."
      ],
      hint: "(a) Requests per second is 1,000 / latency in ms. (b) PSI applies to categories as a sum over levels. (c) δ is a confidence parameter: smaller means fewer false alarms and slower detection.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) sklearn pipeline: ~120 req/s at p50, ~82 at p99 -> 7 workers for 500 req/s
#     ONNX Runtime:     ~4,016 / ~1,961          -> 1 worker
#     FastAPI in-process: ~49 / ~35              -> 15 workers  (validation and DataFrame construction dominate; batch requests would cut this)
#     the batch alternative: 9,920 rows in 19 ms -> a million customers in about 2 s

# (b) channel mix: reference organic 0.475 / paid 0.375 / referral 0.150 -> new 0.266 / 0.536 / 0.198;  PSI 0.192;  chi-square p 5.5e−08
#     monthly_fee KS p 0.02 -- the ordinary difference between two random splits (five features, Bonferroni α 0.01: not significant);
#     a numeric-only monitor sees nothing that survives correction
#     domain classifier AUC 0.581 (an unshifted batch gave 0.485)
#     model: mean predicted churn 0.176 vs 0.153; flagged at 0.35: 0.137 vs 0.097 -- paid-channel customers churn more; the population moved and the queue grew, and the model is not wrong

# (c) δ         false alarm before the change     median delay     90th percentile
#     0.2              32.5 %                         111                207
#     0.002             0.0 %                         239                335
#     0.00002           0.0 %                         335                463`,
        notes: [
          { t: "p", text: "(a) turns latency into infrastructure and shows why the serving shape is decided before the framework." },
          { t: "p", text: "(b) is a drift that lives in a categorical and shows in the prediction distribution: the monitor that matters is the one on the model's output." },
          { t: "p", text: "(c) is the false-alarm-versus-delay trade-off every detector has, here set by one parameter." }
        ]
      }
    }
  ],

  takeaways: [
    "Batch scoring amortises a per-call cost of several milliseconds over thousands of rows (8.4 ms per row versus 1.9 µs per row in a batch of 9,920); real-time serving is for predictions needed inside an interaction, ONNX Runtime brings the single-row cost to 0.25 ms, and the shape follows from when the decision is made.",
    "A service has a contract: a validated schema (422 on bad input), a version stamp on every response, a health endpoint, and the artefact loaded once with its environment pinned from the model card.",
    "Training–serving skew is any difference in how a feature is computed between the two paths; a 28-versus-30-day window moved predictions by 0.01 silently, a skipped imputation by 0.24; one shared feature function and a golden test of stored rows (matched to 0.0000) prevent and catch it.",
    "Data drift (P(X)) is detected per feature by KS and PSI and in combination by a domain classifier (AUC 0.922 for the shifted batch, 0.485 for an unshifted one); on large batches threshold an effect size, not a p-value (p = 10⁻⁶ with PSI 0.0007), and watch the prediction distribution.",
    "Concept drift (P(Y | X)) shows only in the model's errors, which need labels and arrive late; ADWIN caught a change 71 samples after it happened, also fired when the inputs got easier, and its δ trades false alarms (32.5 % at 0.2) against delay (239 samples at 0.002).",
    "Roll out through shadow (no user risk, no behaviour signal), canary (small slice with guardrails; a worse canary was caught in a median of 6 days) and an A/B test sized in advance (31,217 users per arm for half a point on 5 % conversion) with stable hash assignment.",
    "A registry holds versions with code, data hash, environment, metrics and stage; a model card holds intended use and limits; and a rollback restores the threshold with the model — the previous version had the same AUC and flagged 61 % of customers instead of 10 %."
  ],

  quiz: {
    title: "Serving, Monitoring and Drift — Knowledge Check",
    questions: [
      {
        stem: "A fraud model must score each card transaction before the payment completes, with a 50 ms budget end to end. Which serving shape and export?",
        options: [
          "A nightly batch",
          "A real-time service with the model exported to ONNX (0.25 ms per row measured) or an equivalent runtime, features from an online store, and the 20 ms Python-service overhead engineered down — because the prediction is needed inside the interaction",
          "Streaming with a one-minute window",
          "The scikit-learn pipeline behind FastAPI as measured (20 ms p50, 29 ms p99)"
        ],
        answer: 1,
        why: "The decision is made inside the request, so batch is impossible. The measured in-process FastAPI latency of 29 ms at p99 leaves 21 ms for the network, the feature lookup and everything else, which is tight; the ONNX single-row cost of 0.25 ms is where the model itself should sit, and the rest of the budget is engineering around it."
      },
      {
        stem: "Which is the structural prevention of training–serving skew, as opposed to its detection?",
        options: [
          "A golden test of stored rows",
          "One feature-computation function (or a feature store) called by both the training job and the service, with every transformation inside the pipeline artefact — the golden test is the detection",
          "Monitoring the prediction distribution",
          "Retraining weekly"
        ],
        answer: 1,
        why: "Skew arises from two code paths; the prevention is to have one. The measured cases — a different window, a skipped imputation — were both differences between the training script and the service. The golden test catches what slips through, and the prediction monitor catches the largest cases late."
      },
      {
        stem: "Shadow deployment of a new ranking model shows identical latency and a 15 % higher average predicted relevance. Can the model ship?",
        options: [
          "Yes — it is better on every measure",
          "Not on that evidence: shadow validates latency, errors and the prediction distribution but nobody saw its output, so it says nothing about user behaviour; a higher average score is not a better ranking — a canary or an A/B test (or interleaving for rankers) measures the effect on clicks or conversion",
          "Yes, after a golden test",
          "No — higher scores mean it is miscalibrated"
        ],
        answer: 1,
        why: "Each rollout stage answers a different question: shadow, 'does it run'; canary, 'does it break anything'; A/B, 'does it help'. A shift in the score distribution is a fact about the model, not about outcomes, and the only rollout that connects predictions to behaviour is one where users see them."
      },
      {
        stem: "An A/B test of a new model is 'winning' after three days of daily checks with p = 0.03. The pre-registered sample size is not yet reached. What is the right call?",
        options: [
          "Ship it — p < 0.05",
          "Keep running: checking daily and stopping at the first p < 0.05 inflates the false-positive rate far above 5 %; either wait for the planned sample size or use a sequential test designed for repeated looks",
          "Ship it if the canary guardrails held",
          "Stop and declare no difference"
        ],
        answer: 1,
        why: "Optional stopping is the same winner's curse as tuning on the reported folds (10.3): the minimum p-value over many looks is not a p-value. The executed canary simulation used daily checks and was flagged as such; a group-sequential or always-valid test spends the error budget across the looks."
      },
      {
        stem: "Why should the decision threshold live in the model card and be versioned with the artefact?",
        options: [
          "For documentation only",
          "Because the threshold is calibrated to the model's score distribution: the previous churn version had the same AUC but flagged 61 % of customers at 0.35 where the current one flags 10 %, so a rollback of the model without its threshold would change the decision for half the customers",
          "Because thresholds cannot be changed after deployment",
          "Because the registry requires it"
        ],
        answer: 1,
        why: "AUC is a property of the ranking; the decision depends on where the scores sit, which changes with class weighting, calibration and the training data. The artefact is the model plus everything between its output and the action — threshold, calibrator, business rules — and a rollback restores all of it."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Serving, Monitoring and Drift",
    sub: "The service, the skew, the two drifts, the rollout and the rollback.",
    questions: [
      {
        level: "Core",
        q: "Batch or real-time: how do you decide, and what does each cost?",
        strong: "From when the decision is made. If the prediction can be computed before it is needed — a retention queue, a demand plan, a nightly risk score — batch: I measured the churn pipeline at 8.4 ms per single-row call and 19 ms for 9,920 rows, so per-request serving costs about 400 times more per row, and the batch job writes a table that doubles as the audit log. If the prediction is needed inside an interaction — fraud at checkout, ranking, pricing — real-time, with a latency budget that decides the export: the Python pipeline behind FastAPI answered in 20 ms in-process, ONNX Runtime in 0.25 ms per row, and one synchronous worker handles about 80 requests a second at p99 for the former and 2,000 for the latter. Streaming sits between: score events as they arrive for monitoring and freshness. The service itself needs a validated schema, a version on every response and a health check; the batch needs a run id on every row.",
        answer: [
          { t: "p", text: "The timing criterion, the executed per-row costs of each shape, the latency budget and the export, and the contract each shape needs." }
        ]
      },
      {
        level: "Core",
        q: "What is training–serving skew and how do you prevent it?",
        strong: "Any difference between how a feature is computed at training time and at serving time — a different code path, source, window or preprocessing step — so the model receives inputs from a distribution it was not fitted on. I manufactured three on the churn service: logins counted over 28 days instead of 30 moved the mean prediction by 0.01 and flipped no decisions, which is the dangerous kind because nothing would flag it; reordered columns did nothing because the ColumnTransformer selects by name; and a median imputation that lived in the training script rather than the pipeline left the service receiving NaN and moved predictions by up to 0.24. Prevention is structural: every transformation inside the pipeline artefact, and one feature function or feature store called by both the training job and the service. Detection is a golden test — stored rows whose training-time predictions the service must reproduce, which matched to 0.0000 when the paths agreed — run at deploy and on a schedule.",
        answer: [
          { t: "p", text: "The definition, the three measured cases, the structural prevention, and the golden test as detection." }
        ]
      },
      {
        level: "Senior",
        q: "How do you monitor a model for drift, and what is the difference between data drift and concept drift?",
        strong: "Data drift is P(X) changing; concept drift is P(Y | X) changing; they need different monitors and have different consequences. For data drift I run per-feature two-sample tests — KS for numerics, chi-square or categorical PSI for categoricals — against a like-for-like reference, plus a domain classifier trained to tell reference from new, whose AUC catches shifts in combinations (0.922 on a shifted batch, 0.485 on an unshifted one) and whose importances localise them. Two disciplines: threshold an effect size, because on 100,000 rows a shift of 0.02 standard deviations is 'significant' at p = 10⁻⁶ with a PSI of 0.0007; and monitor the prediction distribution, which is the drift the decision actually feels. For concept drift the inputs can look identical, so the only signal is the model's errors, which need labels and arrive late; ADWIN on the error stream caught a flipped relationship 71 samples after it happened. It also fired when a pure input shift made the problem easier, so I read an alarm with its direction and the input monitors beside it. Input monitors are the early warning, error monitors the confirmation, and a business metric against the baseline the verdict.",
        answer: [
          { t: "p", text: "The two definitions, the input-side toolkit with executed numbers and the two disciplines, the error-side detector and its ambiguity, and the layering." }
        ]
      },
      {
        level: "Senior",
        q: "Walk me through a safe rollout of a new model version.",
        strong: "Four stages, each answering one question. Shadow: the new model scores all traffic, its predictions are logged and not served — does it run, at what latency, with what prediction distribution against the incumbent; zero user risk and no behaviour signal. Canary: it serves a small slice, 5 or 10 %, assigned by a stable hash of the user so each person sees one model, with guardrails on latency, error rate and a floor on the business metric, widened on a schedule and rolled back automatically if a guardrail breaks — a canary with a true conversion of 4.5 % against 5.0 % tripped the guardrail in a median of six days at 10,000 users a day. A/B test: the only stage that measures what the model does to behaviour, sized before it starts — half a point on a 5 % conversion needs 31,000 users an arm — and analysed with a test that respects repeated looks. Then the registry: the version moves to production with its card, its golden rows and its threshold, and rollback is a pointer change plus the golden test. What makes it safe is not the model's offline metric but that every stage has a rule for stopping.",
        answer: [
          { t: "p", text: "Shadow, canary, A/B and registry with what each answers, the executed guardrail and sizing numbers, and the stopping rules." }
        ]
      },
      {
        level: "Staff",
        q: "A retrained model has the same AUC as the one in production. The on-call engineer proposes a straight swap. What do you check?",
        strong: "That AUC is the wrong question. AUC is a property of the ranking; the decision depends on where the scores sit, and two models with identical AUC can disagree on most decisions. The previous churn version was a class-weighted logistic regression and the current one a calibrated one: AUC 0.743 against 0.744, score correlation 0.94 — and 61 % of customers above the 0.35 threshold in one against 10 % in the other, agreement on the decision 49 %. A straight swap would have sextupled the retention queue. So I check, in order: the golden rows through the new artefact against the old predictions, to see the size of the disagreement; calibration and the score distribution, so the threshold can be re-derived or the calibrator carried over; the model card's intended use and limits, so the decision rule is versioned with the model; a shadow run for a week to compare prediction distributions on live traffic; and a canary with a guardrail on the flagged share before any A/B on retained revenue. The artefact is the model plus the threshold plus the calibrator, and it is that whole unit that is swapped, tested and rolled back.",
        answer: [
          { t: "p", text: "Why AUC is insufficient with the executed disagreement, the ordered checks, and the artefact as model plus decision rule." }
        ]
      }
    ]
  }
});

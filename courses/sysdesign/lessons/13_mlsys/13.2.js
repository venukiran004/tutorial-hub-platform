/* ============================================================================
   LESSON 13.2 — Data Pipelines, Feature Stores and Skew
   ========================================================================= */
EC.receiveLesson({
  id: "13.2",

  lede: "Most ML systems that fail in production fail in their data, not their model. The two classic failures are invisible offline. A training set built by joining labels to the *current* value of each feature looks correct, trains without complaint, and teaches the model nothing it can use, because at prediction time the feature had a different value. And a feature reimplemented in the serving path with one small difference (a default, a unit, a time window) silently changes every prediction. A feature store exists to prevent both: one definition, computed once, stored with its history for training and its latest value for serving. This lesson measures both failures and the freshness trade-off between batch and streaming features.",

  objectives: [
    "Build training data with point-in-time joins, and show what a latest-value join does to a model",
    "Explain the two halves of a feature store, offline and online, and what keeps them consistent",
    "Detect training-serving skew by comparing feature distributions, and prevent it with shared definitions",
    "Choose batch, micro-batch or streaming computation from how quickly a feature's value matters",
    "Describe the data pipeline from sources to training and serving"
  ],

  prerequisites: ["13.1", "6.5", "4.4"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "pit",
      text: "Point-in-time correctness",
      sub: "Join each label to the feature as it was" },
    { t: "p",
      text: "A training example is a pair: the features that were known at the moment of prediction, and the outcome that followed. Building it means an as-of join: for each labelled event, the most recent feature value at or before the event's time. The tempting shortcut is joining to a table of current values. The script compares the two on a feature that changes over time." },
    { t: "code",
      lang: "python",
      title: "pit.py — as-of join against latest-value join",
      code: `import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(0)

# Each user's "orders in the last 30 days" changes over time; we predict, at each event time, whether the user returns an order.
users, days = 2_000, 120
snap = pd.DataFrame([(u, d, rng.poisson(3 + 2 * np.sin(d / 9 + u))) for u in range(users) for d in range(0, days, 3)],
                    columns=["user", "ts", "orders_30d"]).astype({"ts": float}).sort_values("ts")
events = pd.DataFrame({"user": rng.integers(0, users, 30_000), "ts": rng.uniform(10, days - 5, 30_000)}).sort_values("ts")

# The true process: the return risk depends on the feature value as it was at the event time.
asof = pd.merge_asof(events, snap, on="ts", by="user", direction="backward")
asof["label"] = (rng.random(len(asof)) < 1 / (1 + np.exp(-(asof["orders_30d"] - 5)))).astype(int)

# Naive join: attach each user's LATEST snapshot (from the end of the data), as a "current features" table would.
latest = snap.groupby("user").tail(1).set_index("user")["orders_30d"]
naive = asof.assign(orders_30d=asof["user"].map(latest))

half = len(asof) // 2
def fit_eval(train_df):
    m = LogisticRegression().fit(train_df[["orders_30d"]][:half], train_df["label"][:half])
    # evaluation uses what serving sees: the value as of the request time
    return roc_auc_score(asof["label"][half:], m.predict_proba(asof[["orders_30d"]][half:])[:, 1]), m.coef_[0, 0]

for name, df in (("point-in-time (as-of) join", asof), ("latest-value join", naive)):
    auc, coef = fit_eval(df)
    print(f"trained on {name:<28} serving AUC {auc:.3f}   learned weight {coef:+.3f}")
print(f"\\nrows whose latest value differs from the value at event time: {(naive['orders_30d'] != asof['orders_30d']).mean():.0%}")`,
      out: `trained on point-in-time (as-of) join   serving AUC 0.903   learned weight +1.026
trained on latest-value join            serving AUC 0.097   learned weight -0.020

rows whose latest value differs from the value at event time: 86%` },
    { t: "callout",
      kind: "trap",
      title: "A latest-value join trains a model on the future",
      body: [
        { t: "p",
          text: "86% of rows got a feature value different from the one that existed at their event time. The model trained on those values learned almost nothing (weight −0.02, against +1.03 from the as-of join), and its tiny weight had the wrong sign, so on what serving actually sees it ranked worse than random: AUC 0.10 against 0.90. The error never raises an exception. It shows up as a model that underperforms for reasons nobody can find, or, if the current value happens to encode the outcome, as an offline score too good to be true." }
      ] },
    { t: "h2", n: "02", id: "store", text: "The feature store", sub: "One definition, two stores" },
    { t: "viz",
      title: "Feature store architecture",
      caption: "Batch pipelines write full history to the offline store for training, and materialise the latest values into the online store. Streaming pipelines update the online store within seconds and log to the offline store, so training sees the same values serving saw. A registry holds each feature's definition, owner and freshness, so training and serving read the same thing by name.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="120.0" y1="111.9" x2="165.6" y2="92.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="120.0" y1="160.1" x2="165.6" y2="180.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="290.0" y1="66.0" x2="330.0" y2="66.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="290.0" y1="206.0" x2="330.0" y2="206.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="256.6" y1="180.0" x2="363.4" y2="92.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="256.6" y1="92.0" x2="363.4" y2="180.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="460.0" y1="66.0" x2="500.0" y2="66.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="460.0" y1="206.0" x2="500.0" y2="206.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="110" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="65.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Sources</text>
<text x="65.0" y="150" text-anchor="middle" class="s-sub">events, DB, logs</text>
<rect x="160" y="40" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="225.0" y="62" text-anchor="middle" class="s-label" style="fill:var(--warn)">Batch pipeline</text>
<text x="225.0" y="80" text-anchor="middle" class="s-sub">Spark / SQL, daily</text>
<rect x="160" y="180" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="225.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--warn)">Stream pipeline</text>
<text x="225.0" y="220" text-anchor="middle" class="s-sub">Flink, seconds</text>
<rect x="330" y="40" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="395.0" y="62" text-anchor="middle" class="s-label" style="fill:var(--accent)">Offline store</text>
<text x="395.0" y="80" text-anchor="middle" class="s-sub">full history</text>
<rect x="330" y="180" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="395.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--accent)">Online store</text>
<text x="395.0" y="220" text-anchor="middle" class="s-sub">latest values</text>
<rect x="500" y="40" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="560.0" y="62" text-anchor="middle" class="s-label" style="fill:var(--good)">Training</text>
<text x="560.0" y="80" text-anchor="middle" class="s-sub">as-of joins</text>
<rect x="500" y="180" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="560.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--good)">Model service</text>
<text x="560.0" y="220" text-anchor="middle" class="s-sub">ms lookups</text>
<rect x="640" y="110" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="695.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--violet)">Registry</text>
<text x="695.0" y="150" text-anchor="middle" class="s-sub">definitions</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Offline store",
          def: "Every value with its timestamp, in a columnar store or lakehouse. Training reads it with as-of joins, so examples reflect what was known at prediction time." },
        { term: "Online store",
          def: "The latest value per entity in a low-latency key-value store (Redis, DynamoDB, Cassandra), read in a few milliseconds per request." },
        { term: "One definition",
          def: "A feature is defined once in the registry and computed by one pipeline for both stores. Reimplementing it in the serving code is how skew starts." },
        { term: "Logging served features",
          def: "Logging the exact feature vector used for each prediction lets you train on what serving saw and detect skew directly." }
      ] },
    { t: "h2", n: "03", id: "skew", text: "Training-serving skew", sub: "Same name, different number" },
    { t: "p",
      text: "Skew is any difference between the features a model was trained on and the ones it receives in production. The script trains on a batch feature that fills missing history with the population mean, then serves it from a reimplementation that fills with zero and has a unit-conversion mistake. Nothing fails; the predictions just change." },
    { t: "code",
      lang: "python",
      title: "skew.py — a reimplemented feature, and how to catch it",
      code: `import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(2)

# Training pipeline (batch, SQL): average basket over the last 30 days, NULL -> population mean (42.0).
# Serving pipeline (re-written in the API service): same feature, but NULL -> 0 and amounts in cents, divided by 100 twice by mistake.
n = 40_000
basket = np.where(rng.random(n) < 0.15, np.nan, rng.gamma(4, 10, n))          # 15% of customers are new: no history
visits = rng.poisson(4, n)
y = (rng.random(n) < 1 / (1 + np.exp(-(0.04 * np.nan_to_num(basket, nan=42) + 0.3 * visits - 3.5)))).astype(int)

def train_feature(b): return np.where(np.isnan(b), 42.0, b)
def serve_feature(b): return np.where(np.isnan(b), 0.0, (b * 100) / 100 / 100)   # the bug: one division too many

X_tr = np.column_stack([train_feature(basket), visits])
m = GradientBoostingClassifier(random_state=0).fit(X_tr[: n // 2], y[: n // 2])
te = slice(n // 2, n)
for name, f in (("features as trained", train_feature), ("features as served", serve_feature)):
    X = np.column_stack([f(basket[te]), visits[te]])
    print(f"{name:<22} AUC {roc_auc_score(y[te], m.predict_proba(X)[:, 1]):.3f}   mean predicted rate {m.predict_proba(X)[:, 1].mean():.3f}")
print(f"actual positive rate {y[te].mean():.3f}")

# Detection: compare the logged online feature distribution with the training one (population stability index).
def psi(a, b, bins=10):
    edges = np.quantile(a, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    pa = np.histogram(a, edges)[0] / len(a) + 1e-6; pb = np.histogram(b, edges)[0] / len(b) + 1e-6
    return float(((pa - pb) * np.log(pa / pb)).sum())
print(f"\\nPSI training vs served basket feature: {psi(train_feature(basket), serve_feature(basket)):.2f}  (> 0.25 = investigate)")
print(f"PSI training vs served visits feature: {psi(visits.astype(float), visits.astype(float)):.2f}")`,
      out: `features as trained    AUC 0.733   mean predicted rate 0.359
features as served     AUC 0.598   mean predicted rate 0.077
actual positive rate 0.359

PSI training vs served basket feature: 12.52  (> 0.25 = investigate)
PSI training vs served visits feature: 0.00` },
    { t: "dl",
      items: [
        { term: "What the skew did",
          def: "AUC fell from 0.73 to 0.60 and the mean predicted rate from 0.36 to 0.08, against a true rate of 0.36. Every downstream decision using a threshold changed." },
        { term: "How it was caught",
          def: "The population stability index between the training and served distributions of the basket feature was 12.5, against an investigation threshold of about 0.25. The untouched feature scored 0.00. A daily PSI check per feature finds this class of bug within a day." },
        { term: "How to prevent it",
          def: "Serve features from the same pipeline that produced training data, through the online store, and treat any feature logic in the serving code as a defect." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Freshness is a requirement per feature",
      body: [
        { t: "p",
          text: "'User's country' can be a day old; 'transactions on this card in the last ten minutes' is useless an hour late. Decide freshness per feature from how fast its value changes the decision, then pick the cheapest pipeline that meets it. Streaming every feature is expensive and rarely needed; batch every feature and the fraud model is blind to the fastest attacks." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "How stale may a fraud feature be?",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "A stolen card is tested with a burst of purchases, one a minute. A rule blocks when 'transactions on this card in the last ten minutes' reaches 4. The feature store reflects only purchases older than its pipeline's staleness. Compute the share of an eight-purchase burst that is blocked with streaming, one-minute, three-minute and five-minute micro-batches, and an hourly batch." }
      ],
      requirements: [
        "A model of the count the feature store reports at each purchase, given its staleness",
        "The share of the burst blocked for each pipeline",
        "The first purchase that is blocked, if any",
        "A recommendation for this feature's pipeline"
      ],
      hint: "At the k-th purchase the true count of earlier purchases is k, but a store that is s minutes stale reports max(0, k − s).",
      solution: { lang: "python",
        title: "feature_freshness.py",
        code: `# Card-testing fraud: a stolen card makes a burst of purchases, one a minute. The blocking rule uses the feature
# "transactions on this card in the last 10 minutes" and blocks at 4. How stale may that feature be?
BURST, THRESHOLD = 8, 4

def blocked_share(staleness_min):
    """At the k-th purchase (minute k of the burst) the true count of earlier purchases is k, but the feature store
    only reflects purchases older than \`staleness_min\` minutes: max(0, k - staleness)."""
    blocked = sum(max(0, k - staleness_min) >= THRESHOLD for k in range(BURST))
    return blocked / BURST

for label, st in (("streaming, ~1 s", 0), ("micro-batch, 1 min", 1), ("micro-batch, 3 min", 3),
                  ("micro-batch, 5 min", 5), ("hourly batch", 60)):
    share = blocked_share(st)
    print(f"{label:<20} purchases blocked in an {BURST}-purchase burst: {share:.0%}  "
          f"(first purchase blocked: {next((f'#{k + 1}' for k in range(BURST) if max(0, k - st) >= THRESHOLD), 'none')})")`,
        out: `streaming, ~1 s      purchases blocked in an 8-purchase burst: 50%  (first purchase blocked: #5)
micro-batch, 1 min   purchases blocked in an 8-purchase burst: 38%  (first purchase blocked: #6)
micro-batch, 3 min   purchases blocked in an 8-purchase burst: 12%  (first purchase blocked: #8)
micro-batch, 5 min   purchases blocked in an 8-purchase burst: 0%  (first purchase blocked: none)
hourly batch         purchases blocked in an 8-purchase burst: 0%  (first purchase blocked: none)`,
        notes: [
          { t: "p",
            text: "Streaming blocks the burst from the fifth purchase, half of it. Each minute of staleness costs one more purchase, and from five minutes onward the rule never fires within the burst: the attacker has finished before the feature store reports the first purchases. An hourly batch makes this feature worthless for its purpose, although it would be fine for a slower signal such as monthly spend." },
          { t: "p",
            text: "So this feature needs a streaming pipeline (Flink or Kafka Streams) writing to the online store, and the rest of the fraud model's features can stay in batch. The cost of streaming is paid only where freshness changes the decision." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the recommender trained on tomorrow",
      body: [
        { t: "p",
          text: "**Symptom.** A new recommendation model beat the old one offline by a wide margin and lost to it in the A/B test. A second retrain made the gap worse." },
        { t: "p",
          text: "**Mechanism.** The training set joined each impression to a 'user interests' table that the batch pipeline overwrote nightly. Interests were recomputed from clicks, including the clicks the impressions led to. The model learned to recognise items users had already clicked, which serving could never know in advance." },
        { t: "p",
          text: "**Fix.** Training data is now built from the offline store with as-of joins on the impression timestamp, and served feature vectors are logged and used for training wherever available. A check flags any feature whose offline importance is far above its importance on logged serving data." }
      ] }
  ],

  takeaways: [
    "Build training data with **as-of joins**: each label gets the feature value known at its prediction time.",
    "A latest-value join changed **86%** of rows; the model learned nothing and scored serving AUC **0.10** against **0.90**.",
    "A feature store has an **offline store** (history, for training) and an **online store** (latest values, for serving), fed by one definition.",
    "**Log served features** so training can use exactly what serving saw.",
    "A reimplemented feature (wrong default, wrong unit) cut AUC from **0.73 to 0.60** and the mean prediction from **0.36 to 0.08**.",
    "**PSI** of **12.5** caught that skew; a daily per-feature distribution check finds it within a day.",
    "Freshness is per feature: a 10-minute card-velocity feature blocked **half** a burst when streamed and **none** at 5 minutes stale.",
    "Stream only the features whose freshness changes decisions; keep the rest in batch."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Training labels are joined to a table holding each user's current feature values. What is wrong?",
        options: [
          "Nothing, if the table is refreshed daily",
          "Features no longer match prediction time",
          "The join is too slow for large datasets",
          "Current values are always more accurate"
        ],
        answer: 1,
        why: "Each example needs the value known when the prediction was made; current values come from later and can encode the outcome. In the simulation 86% of rows changed and the model learned nothing usable. Refreshing the table makes it more current, which is the problem." },
      { stem: "Which design best prevents training-serving skew?",
        options: [
          "Reimplement each feature very carefully in the API",
          "One definition and pipeline feeding both stores",
          "Retrain the model more often on recent data",
          "Use a larger model that tolerates noisy features"
        ],
        answer: 1,
        why: "Skew comes from two implementations diverging, so the fix is one implementation shared by training and serving. Careful reimplementation still diverges, and retraining or larger models do not remove a systematic difference." },
      { stem: "A daily check compares each feature's training and served distributions. One feature's PSI jumps to 12. What does that suggest?",
        options: [
          "Normal seasonal drift that needs no action",
          "A pipeline or serving bug: investigate",
          "The model needs more training epochs to fit",
          "Every other feature is now broken as well"
        ],
        answer: 1,
        why: "A PSI above about 0.25 already deserves investigation; 12 means the distributions barely overlap, typical of a unit, default or join bug. Seasonal drift is gradual and much smaller. Training epochs and unchanged features are unrelated." },
      { stem: "Which feature most needs a streaming pipeline?",
        options: [
          "A user's country of residence on file",
          "Card transactions in the last 10 min",
          "Average order value over the last 90 days",
          "Account age, measured in whole months"
        ],
        answer: 1,
        why: "Its value changes within minutes and the decision depends on that change; five minutes of staleness made the rule useless. Country, 90-day averages and account age change slowly and are fine in daily batch." }
    ] },

  interview: { title: "In an interview",
    sub: "Data questions are where ML design interviews separate people who have run models in production.",
    questions: [
      { level: "core",
        q: "What is a feature store and why would you use one?",
        strong: "A strong answer covers the offline and online halves, point-in-time correctness and shared definitions.",
        answer: [
          { t: "p",
            text: "A system that defines each feature once and serves it two ways: history with timestamps in an offline store, for building training sets with point-in-time joins, and the latest value per entity in an online store, for millisecond lookups at prediction time. One pipeline feeds both, so training and serving see the same computation." },
          { t: "p",
            text: "I would use one when several models share features, when features are needed online with low latency, or when skew and leakage have already caused incidents. For a single batch model, a well-built table with timestamps may be enough." }
        ] },
      { level: "core",
        q: "How do you detect training-serving skew?",
        strong: "A strong answer logs served features and compares distributions and values, per feature, continuously.",
        answer: [
          { t: "p",
            text: "Log the feature vector used for each prediction. Compare served and training distributions daily per feature, with PSI or a two-sample test, and alert above a threshold. Where possible, recompute features offline for a sample of logged requests and compare value by value: any mismatch is a bug. A drop in the model's online metric with no change in input traffic is the late symptom; the distribution check catches it first." }
        ] },
      { level: "advanced",
        q: "When would you choose streaming features over batch?",
        strong: "A strong answer ties the choice to how fast a feature's value changes the decision, and accounts for cost and complexity.",
        answer: [
          { t: "p",
            text: "When the decision depends on what happened in the last seconds or minutes: card velocity for fraud, items viewed in the current session for recommendations, live inventory. I would quantify it as in the exercise, where five minutes of staleness made a fraud rule useless. Streaming costs more to build and operate, needs care with late and out-of-order events, and must log to the offline store so training sees the same values. So I stream only those features and keep the rest in batch." }
        ] }
    ] }
});

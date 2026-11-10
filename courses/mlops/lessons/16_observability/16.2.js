/* ============================================================================
   LESSON 16.2 — The Prediction Log
   ========================================================================= */
EC.receiveLesson({
  id: "16.2",

  lede: "Almost every question in this course (did the inputs drift, is there skew, which version made this decision, is the new model calibrated) is answered from one artefact: a log of predictions. If it records the right fields, everything else can be computed later; if it does not, nothing can. This lesson writes a real prediction log with a pseudonymous customer key, sampled feature vectors and version IDs, measures what it costs to store, computes drift and per-version calibration from it, and then joins late labels correctly, which is where most calibration numbers go wrong.",

  objectives: [
    "Define a prediction-log schema that supports drift, skew, quality and audit",
    "Pseudonymise identifiers with a keyed hash and keep raw personal data out",
    "Sample full feature vectors deterministically and estimate storage",
    "Join late-arriving labels with deduplication and closed label windows",
    "Compute per-version quality from the log alone"
  ],

  prerequisites: ["16.1", "15.1"],

  blocks: [
    { t: "h2", n: "01", id: "schema", text: "What the log must hold", sub: "One record per prediction" },
    { t: "viz",
      title: "One log, many uses",
      caption: "Drift, skew, per-version quality and audit are all queries over the same records, once labels are joined by prediction ID.",
      svg: `<svg viewBox="0 0 760 275" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="110.0" y1="67.0" x2="110.0" y2="110.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="189.4" y1="110.0" x2="320.6" y2="67.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="210.0" y1="136.0" x2="300.0" y2="136.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="189.4" y1="162.0" x2="320.6" y2="205.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="110.0" y1="162.0" x2="110.0" y2="205.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="110" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="110.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--accent)">Prediction log</text>
<text x="110.0" y="150" text-anchor="middle" class="s-sub">id, ts, version, inputs, output</text>
<rect x="10" y="15" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="110.0" y="37" text-anchor="middle" class="s-label" style="fill:var(--good)">Labels, later</text>
<text x="110.0" y="55" text-anchor="middle" class="s-sub">joined by prediction id</text>
<rect x="300" y="15" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="400.0" y="37" text-anchor="middle" class="s-label" style="fill:var(--violet)">Drift</text>
<text x="400.0" y="55" text-anchor="middle" class="s-sub">inputs over time (11.2)</text>
<rect x="300" y="110" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="400.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--warn)">Skew</text>
<text x="400.0" y="150" text-anchor="middle" class="s-sub">served vs recomputed (13.4)</text>
<rect x="300" y="205" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="400.0" y="227" text-anchor="middle" class="s-label" style="fill:var(--crit)">Quality by version</text>
<text x="400.0" y="245" text-anchor="middle" class="s-sub">accuracy, calibration</text>
<rect x="10" y="205" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="110.0" y="227" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Audit / replay</text>
<text x="110.0" y="245" text-anchor="middle" class="s-sub">why this decision?</text>
</svg>` },
    { t: "table",
      head: ["Field", "Why"],
      rows: [
        ["prediction_id", "Joins labels, traces and complaints to this exact decision"],
        ["timestamp", "Windows for drift, label delay and point-in-time recomputation"],
        ["model_version (immutable ID)", "Splits every metric by version (lesson 15.1)"],
        ["entity key, pseudonymised", "Joins outcomes and recomputed features without storing identity"],
        ["inputs: features as served", "Drift and skew; sampled when full vectors are too large"],
        ["output: score and decision", "Calibration, decision rates, business impact"],
        ["correlation / trace ID", "Links to the request's logs and spans (lesson 7.3)"]
      ] },
    { t: "h2", n: "02", id: "write", text: "Writing it", sub: "Pseudonyms, sampling and storage" },
    { t: "p",
      text: "The script logs 100,000 predictions. The customer ID is replaced by an HMAC with a secret key: stable, so outcomes and features can be joined, but not reversible without the key, and the email that arrives with the request is never written. Full feature vectors are kept for 10% of requests, chosen by hashing the request ID so the choice is reproducible. Then the log is used to measure drift between morning and afternoon and calibration by model version." },
    { t: "code",
      lang: "python",
      title: "predlog.py — write, store and use a prediction log",
      code: `import hashlib, hmac, io, json, uuid
import numpy as np, pandas as pd

rng = np.random.default_rng(19)
SECRET = b"rotate-me-quarterly"                                 # kept in a secret store, not in code, in practice
FEATURES = [f"f{i}" for i in range(20)]
FULL_SHARE = 0.10                                                # full feature vectors for 10% of requests

def pseudonymise(customer_id: str) -> str:                       # stable for joins, not reversible without the key
    return hmac.new(SECRET, customer_id.encode(), hashlib.sha256).hexdigest()[:16]
def keep_features(request_id: str) -> bool:                      # deterministic sample: the same request always decides the same
    return int(hashlib.sha256(request_id.encode()).hexdigest()[:8], 16) / 2 ** 32 < FULL_SHARE

def log_prediction(customer_id, email, x, score, version, ts):
    rid = str(uuid.UUID(int=int(rng.integers(0, 2 ** 63)) << 64 | int(rng.integers(0, 2 ** 63))))
    row = {"prediction_id": rid, "ts": ts, "model_version": version, "customer": pseudonymise(customer_id),
           "score": round(float(score), 5), "decision": int(score > 0.5)}
    if keep_features(rid): row["features"] = [round(float(v), 4) for v in x]
    return row                                                   # the email is never written

N = 100_000
X = rng.normal(size=(N, 20)); X[N // 2:, 3] += 0.5                # the second half of the day: feature f3 shifts
true_p = 1 / (1 + np.exp(-(X[:, 0] - 1)))
score = 1 / (1 + np.exp(-(X[:, 0] - 1.4)))                       # the model under-predicts a little
log = [log_prediction(f"cust-{i % 30_000}", f"user{i}@example.com", X[i], score[i],
                      "e2f413273581" if i % 10 else "5b1c0a9d22e7", i * 0.864) for i in range(N)]

df = pd.DataFrame(log)
def size_jsonl(rows): return len("\\n".join(json.dumps(r) for r in rows).encode()) / 2 ** 20
def size_parquet(frame): b = io.BytesIO(); frame.to_parquet(b); return len(b.getvalue()) / 2 ** 20
slim = [{k: v for k, v in r.items() if k != "features"} for r in log]
print(f"{N:,} predictions: {sum('features' in r for r in log):,} with full features ({FULL_SHARE:.0%} sampled by request id)")
print(f"storage, JSONL:   decisions only {size_jsonl(slim):.1f} MB, with sampled features {size_jsonl(log):.1f} MB")
print(f"storage, Parquet: decisions only {size_parquet(df.drop(columns='features')):.1f} MB, with sampled features {size_parquet(df):.1f} MB")
print(f"raw emails in the log: {sum(b'@example.com' in json.dumps(r).encode() for r in log)}")

# What the log makes computable.
full = df[df.features.notna()]; F = np.array(full.features.tolist()); half = full.ts < N * 0.864 / 2
def psi(a, b):
    e = np.quantile(a, np.linspace(0, 1, 11)); e[0], e[-1] = -np.inf, np.inf
    p, q = np.histogram(a, e)[0] / len(a), np.histogram(b, e)[0] / len(b)
    return float(np.sum((q - p) * np.log(np.clip(q, 1e-4, None) / np.clip(p, 1e-4, None))))
print(f"drift from the log: PSI morning vs afternoon f0 {psi(F[half, 0], F[~half, 0]):.3f}, f3 {psi(F[half, 3], F[~half, 3]):.3f}")
labels = pd.DataFrame({"prediction_id": df.prediction_id, "label": (rng.random(N) < true_p).astype(int)})   # arrive later
joined = df.merge(labels, on="prediction_id")
for v, g in joined.groupby("model_version"):
    print(f"version {v}: {len(g):>6,} predictions, mean score {g.score.mean():.3f}, observed rate {g.label.mean():.3f}")`,
      out: `100,000 predictions: 10,081 with full features (10% sampled by request id)
storage, JSONL:   decisions only 16.5 MB, with sampled features 18.3 MB
storage, Parquet: decisions only 5.3 MB, with sampled features 6.0 MB
raw emails in the log: 0
drift from the log: PSI morning vs afternoon f0 0.003, f3 0.260
version 5b1c0a9d22e7: 10,000 predictions, mean score 0.236, observed rate 0.303
version e2f413273581: 90,000 predictions, mean score 0.237, observed rate 0.304` },
    { t: "dl",
      items: [
        { term: "Storage is small",
          def: "100,000 decisions took 16.5 MB as JSONL and 5.3 MB as Parquet; adding sampled feature vectors added under 1 MB as Parquet. Columnar formats make long retention cheap." },
        { term: "Sampled features still show drift",
          def: "From 10,081 sampled vectors, PSI between morning and afternoon was 0.003 for f0 and 0.260 for f3, the feature that had shifted." },
        { term: "Calibration by version",
          def: "Both versions predicted about 0.24 against an observed 0.30: the model under-predicts, visible only because outcomes were joined to logged scores by prediction ID." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Logging personal data because it was in the request",
      body: [
        { t: "p",
          text: "Requests often carry names, emails and free text that the model never uses. Logging the whole request copies personal data into a store with long retention and broad access. Log the features the model used and a keyed pseudonym; anything else needs a reason, a retention period and an access policy." }
      ] },
    { t: "h2",
      n: "03",
      id: "labels",
      text: "Joining labels that arrive late",
      sub: "Where calibration numbers go wrong" },
    { t: "p",
      text: "Outcomes arrive after predictions, sometimes days or weeks later, sometimes twice when a source system resends them, and for many predictions never, because nothing happened. Treating 'no outcome yet' as 'no outcome' for recent predictions makes every rate look lower than it is." },
    { t: "exercise",
      kind: "Challenge",
      title: "Join late labels correctly",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Thirty days of predictions for two model versions, with purchases that can happen up to seven days after the prediction, and 5% of purchase events resent by the source. Compute each version's observed purchase rate against its mean score two ways: a naive join of everything that has arrived, and a join that deduplicates events and uses only predictions whose seven-day window has closed." }
      ],
      requirements: [
        "Deduplication of outcome events per prediction",
        "Only predictions older than the label window",
        "Per-version mean score, observed rate and their ratio",
        "Both methods side by side"
      ],
      hint: "A prediction made on day d has a complete label only after day d + 7; filter on that before treating a missing event as 0.",
      solution: { lang: "python",
        title: "late_labels.py",
        code: `import numpy as np, pandas as pd
rng = np.random.default_rng(20)

# Predictions over 30 days; the outcome (a purchase) can happen up to 7 days after the prediction.
N = 60_000
preds = pd.DataFrame({"prediction_id": np.arange(N), "day": rng.integers(0, 30, N),
                      "model_version": np.where(rng.random(N) < 0.2, "v2", "v1")})
p_true = np.where(preds.model_version == "v2", 0.12, 0.10)
preds["score"] = np.clip(p_true + rng.normal(0, 0.02, N), 0, 1)
buys = rng.random(N) < p_true
events = pd.DataFrame({"prediction_id": preds.prediction_id[buys], "event_day": preds.day[buys] + rng.integers(0, 8, buys.sum())})
dup = events.sample(frac=0.05, random_state=1).assign(event_day=lambda d: d.event_day + 1)    # resent by the source system
events = pd.concat([events, dup])
TODAY, WINDOW = 30, 7

def naive(preds, events):                       # join whatever has arrived, treat everything else as 'no purchase'
    lab = events[events.event_day < TODAY].prediction_id.unique()
    return preds.assign(label=preds.prediction_id.isin(lab).astype(int))

def correct(preds, events):
    ev = events[events.event_day < TODAY].drop_duplicates("prediction_id")                 # one outcome per prediction
    closed = preds[preds.day + WINDOW < TODAY]                                              # only predictions whose window has closed
    return closed.assign(label=closed.prediction_id.isin(ev.prediction_id).astype(int))

for name, fn in (("naive join", naive), ("deduplicated, closed windows only", correct)):
    d = fn(preds, events)
    print(f"{name}: {len(d):,} predictions labelled")
    for v, g in d.groupby("model_version"):
        print(f"  {v}: mean score {g.score.mean():.3f}, observed purchase rate {g.label.mean():.3f}, "
              f"ratio {g.label.mean() / g.score.mean():.2f}")
print(f"duplicate outcome rows in the raw feed: {events.prediction_id.duplicated().sum():,}")`,
        out: `naive join: 60,000 predictions labelled
  v1: mean score 0.100, observed purchase rate 0.089, ratio 0.89
  v2: mean score 0.120, observed purchase rate 0.107, ratio 0.89
deduplicated, closed windows only: 45,940 predictions labelled
  v1: mean score 0.100, observed purchase rate 0.101, ratio 1.01
  v2: mean score 0.120, observed purchase rate 0.122, ratio 1.01
duplicate outcome rows in the raw feed: 314`,
        notes: [
          { t: "p",
            text: "The naive join made both well-calibrated versions look 11% over-confident (ratio 0.89), because the last week's predictions had not had time to convert. Restricting to closed windows gave 1.01 for both. A team reading the naive number would have 'recalibrated' a correct model downwards." },
          { t: "p",
            text: "The 314 resent events did no harm here only because the naive join tested membership; a merge on prediction ID would have duplicated rows and inflated the rate. Deduplicate explicitly, and keep the label window as a property of the label, recorded with the metric." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the log that could not answer",
      body: [
        { t: "p",
          text: "**Symptom.** After a complaint about an automated decline, the team could not show which model version made it or what inputs it saw: the service logged 'request received' and 'score: 0.81', nothing else." },
        { t: "p",
          text: "**Mechanism.** The service had application logs, not a prediction log. Version, features and a joinable ID were never written; the feature store had since been updated, so the inputs could not be recomputed." },
        { t: "p",
          text: "**Fix.** A prediction log with the schema above, written asynchronously from every serving process to a columnar store, with pseudonymised keys, sampled full features plus the full vector for every adverse decision, and a retention period agreed with legal. The next complaint was answered with one query." }
      ] }
  ],

  takeaways: [
    "The **prediction log** is the artefact drift, skew, quality and audit are computed from.",
    "Record: **prediction ID, timestamp, immutable model version, pseudonymised key, served inputs, output, trace ID**.",
    "Pseudonymise with a **keyed hash**; never log personal data just because it was in the request.",
    "Sample full features **deterministically**; log every input for high-stakes decisions.",
    "Measured: 100,000 decisions were **5.3 MB** as Parquet, **16.5 MB** as JSONL.",
    "Ignoring open label windows made calibrated models look **11%** over-confident (0.89 against 1.01).",
    "Deduplicate outcome events and record the label window with every metric."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why log a keyed hash of the customer ID rather than the ID or nothing?",
        options: [
          "Hashes compress the log by a large factor",
          "It allows joins without storing the identity",
          "Regulations forbid any identifier in logs",
          "Hashing makes the whole log tamper-proof forever"
        ],
        answer: 1,
        why: "A stable pseudonym joins outcomes and features, and without the key it cannot be reversed. Compression and tamper-proofing are unrelated, and pseudonyms are allowed where raw identifiers are not." },
      { stem: "Why sample feature vectors by hashing the request ID rather than at random?",
        options: [
          "Hashing is the faster of the two methods",
          "The same request always gets the same decision",
          "Random sampling can never hit exactly 10% of traffic",
          "Hashing keeps every high-risk request"
        ],
        answer: 1,
        why: "Deterministic sampling is reproducible across replicas and re-runs, so the sample can be recomputed and joined. Speed and exact rates are minor; high-risk requests need an explicit rule." },
      { stem: "Recent predictions are labelled 'no purchase' because nothing has arrived yet. What happens?",
        options: [
          "Nothing, since most of them will not buy anyway",
          "Rates are biased low; models look over-confident",
          "The model looks under-confident instead of right",
          "Only the newest model version is affected by it"
        ],
        answer: 1,
        why: "Some of those predictions will convert later; counting them as zeros lowered the observed rate by 11% for both versions. It affects every version that served recently." },
      { stem: "Which field lets you split every quality metric by model?",
        options: [
          "The request's correlation ID",
          "The immutable model version ID",
          "The timestamp of the prediction",
          "The pseudonymised customer key"
        ],
        answer: 1,
        why: "Only the version ID identifies the model; correlation IDs, timestamps and customer keys identify the request, the time and the customer." }
    ] },

  interview: { title: "In an interview",
    sub: "Logging answers should end with what the log lets you compute.",
    questions: [
      { level: "core",
        q: "What would you put in a prediction log?",
        strong: "A strong answer gives fields with their purposes and handles privacy and size.",
        answer: [
          { t: "p",
            text: "Prediction ID, timestamp, immutable model version, a pseudonymised entity key, the features as served (all or a deterministic sample), the score and decision, and the trace ID. Labels are joined later by prediction ID. Raw personal data stays out; storage is columnar with partitioning by date and version, and retention is agreed with legal. That supports drift, skew, per-version quality, audits and replay." }
        ] },
      { level: "advanced",
        q: "How do you compute calibration when labels arrive over weeks?",
        strong: "A strong answer uses label windows, deduplication and maturity-aware reporting.",
        answer: [
          { t: "p",
            text: "Define the label window (for example seven days after the prediction), report metrics only on predictions whose window has closed, deduplicate outcome events per prediction, and keep the window with the metric. For earlier signals, track a partial-window metric against its historical value at the same maturity, rather than against final rates." }
        ] },
      { level: "core",
        q: "How do you keep a prediction log affordable?",
        strong: "A strong answer combines columnar storage, sampling and retention tiers.",
        answer: [
          { t: "p",
            text: "Columnar format (Parquet) partitioned by date and model version, which stored 100,000 decisions in 5.3 MB here; full feature vectors for a deterministic sample plus every high-stakes decision; aggregate statistics kept long and raw records for the retention period; and older partitions moved to cheaper storage classes." }
        ] }
    ] }
});

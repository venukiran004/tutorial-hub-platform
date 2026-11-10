/* ============================================================================
   LESSON 13.4 — Prevention and Detection
   ========================================================================= */
EC.receiveLesson({
  id: "13.4",

  lede: "The three previous lessons found skew in reimplemented transforms, in leaky training tables and in environments. Prevention is structural: one implementation of every transform, shipped with the model as one artefact, consumed unchanged by every caller. Detection is a comparison across the boundary: what production actually fed the model, against what the training pipeline computes for the same customer at the same moment. This lesson builds both: an integration test that the batch job and the request handler agree on the same rows, and a daily job that compares served features with recomputed ones and catches a stale cache on the day it starts.",

  objectives: [
    "Ship transforms and model as one artefact used by every consumer",
    "Write an integration test that offline and online scoring agree on the same rows",
    "Compare features as well as predictions, and know why",
    "Log served features and compare them daily with recomputed features",
    "Combine prevention and detection into a routine that catches skew in days"
  ],

  prerequisites: ["13.1", "13.2", "13.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "prevent",
      text: "One implementation, one artefact",
      sub: "And a test that holds it there" },
    { t: "viz",
      title: "One artefact, every consumer",
      caption: "The fitted transforms travel with the model, so the batch job and the request handler run the same code with the same constants. The only thing left to test is what each feeds into it.",
      svg: `<svg viewBox="0 0 760 235" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="170.0" y1="116.0" x2="240.0" y2="116.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="93.1" x2="517.3" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="138.9" x2="517.3" y2="160.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="90" width="160" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="90.0" y="112" text-anchor="middle" class="s-label" style="fill:var(--accent)">Training job</text>
<text x="90.0" y="130" text-anchor="middle" class="s-sub">fits transform + model</text>
<rect x="240" y="90" width="190" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="335.0" y="112" text-anchor="middle" class="s-label" style="fill:var(--good)">One artefact</text>
<text x="335.0" y="130" text-anchor="middle" class="s-sub">Pipeline(pre, model)</text>
<rect x="510" y="20" width="230" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="625.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Batch scoring</text>
<text x="625.0" y="60" text-anchor="middle" class="s-sub">loads the artefact</text>
<rect x="510" y="160" width="230" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="625.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--warn)">Request handler</text>
<text x="625.0" y="200" text-anchor="middle" class="s-sub">loads the same artefact</text>
</svg>` },
    { t: "p",
      text: "The churn service from module 12 already stores the fitted `ColumnTransformer` and model as one scikit-learn `Pipeline`. The script loads that single artefact in a batch job and in a request handler, scores the same 500 customers both ways, then adds a one-line change to the handler, rounding a request field, and runs the test again." },
    { t: "code",
      lang: "python",
      title: "prevent.py — one artefact, two consumers, one integration test",
      code: `import io, pickle, sqlite3
import numpy as np, pandas as pd
from svc_common import CAT, DB, MODEL, NUM, REQ

# One artefact: the fitted ColumnTransformer and the model in a single Pipeline (built in svc_common.py).
artefact = MODEL.read_bytes()

# Offline consumer: the nightly batch job scores a table.
def batch_scores(df: pd.DataFrame) -> np.ndarray:
    return pickle.loads(artefact).predict_proba(df[NUM + CAT + REQ])[:, 1]

# Online consumer: the request handler builds one row from the feature store plus the request, and calls the same object.
online_model = pickle.loads(artefact)
con = sqlite3.connect(DB)
def online_score(customer_id: int, request: dict) -> float:
    row = con.execute(f"SELECT {', '.join(NUM + CAT)} FROM features WHERE customer_id = ?", (customer_id,)).fetchone()
    frame = pd.DataFrame([list(row) + [request[k] for k in REQ]], columns=NUM + CAT + REQ)
    return float(online_model.predict_proba(frame)[0, 1])

# The integration test: the same rows through both consumers must agree.
rng = np.random.default_rng(4)
ids = rng.choice(100_000, 500, replace=False)
table = pd.read_sql(f"SELECT customer_id, {', '.join(NUM + CAT)} FROM features", con).set_index("customer_id").loc[ids].reset_index()
table["session_minutes"] = rng.gamma(2, 5, len(table)).round(1); table["pages"] = rng.poisson(6, len(table))
offline = batch_scores(table)
online = np.array([online_score(int(r.customer_id), {"session_minutes": r.session_minutes, "pages": r.pages}) for r in table.itertuples()])
print(f"500 rows, batch job against request handler: max |difference| {np.abs(offline - online).max():.1e}")

# The same test catches a reimplementation that drifts: the handler 'helpfully' rounds a feature before scoring.
def online_rounded(customer_id, request):
    return online_score(customer_id, {**request, "session_minutes": round(request["session_minutes"])})
rounded = np.array([online_rounded(int(r.customer_id), {"session_minutes": r.session_minutes, "pages": r.pages}) for r in table.itertuples()])
d = np.abs(offline - rounded)
print(f"with rounding added online: max |difference| {d.max():.3f}; {np.mean(d > 1e-9):.0%} of rows differ -> test fails")`,
      out: `500 rows, batch job against request handler: max |difference| 0.0e+00
with rounding added online: max |difference| 0.017; 3% of rows differ -> test fails` },
    { t: "dl",
      items: [
        { term: "Same artefact, same answers",
          def: "500 customers through the batch job and the request handler: maximum difference 0. There is nothing to drift, because there is only one copy of the transform." },
        { term: "The inputs can still differ",
          def: "Rounding one request field in the handler changed predictions for 3% of rows by up to 0.017, and the test failed. The artefact protects the transform; it cannot protect what callers pass into it." },
        { term: "Compare features too",
          def: "The rounding changed the feature on nearly every row, but a tree model's prediction moved only where a value crossed a split threshold. A prediction-only test can pass while inputs are wrong; compare the inputs as well." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Thinking the artefact makes skew impossible",
      body: [
        { t: "p",
          text: "Serialising the pipeline removes transform skew, but not differences in the raw inputs: an online feature store returning other values than the offline table, a request field parsed differently, a default filled in by the caller. Those need the comparison in section 2." }
      ] },
    { t: "h2",
      n: "02",
      id: "detect",
      text: "Detection across the boundary",
      sub: "Served features against recomputed ones" },
    { t: "p",
      text: "Log the exact feature vector each prediction used, with the entity ID and timestamp. Each day, recompute features for a sample of those rows with the offline pipeline as of the same timestamps, and compare them column by column. A mismatch rate above a small threshold names the feature and the day. Comparing distributions (PSI between served and training features, lesson 11.2) adds a cheaper check that needs no recomputation, at the cost of missing changes that preserve the distribution." },
    { t: "table",
      head: ["Check", "Catches", "Misses"],
      rows: [
        [
          "Integration test in CI",
          "Transform and parsing differences before release",
          "Data-source differences in production"
        ],
        [
          "Served vs recomputed, per row",
          "Stale caches, wrong sources, timezone and default bugs",
          "Nothing it samples, if tolerances are right"
        ],
        [
          "Served vs training distributions",
          "Large shifts, unit errors, null floods",
          "Row-level errors that keep the distribution"
        ],
        [
          "Prediction distribution by day",
          "Anything large enough to move scores",
          "Calibration-neutral and small errors"
        ]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Find the stale feature",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Fourteen days of served-feature logs, 3,000 rows a day, each paired with the features recomputed offline for the same customer and time. On some day an online cache starts serving a stale value for one feature. Compare each feature per day with a tolerance that ignores floating-point noise from serialisation, alert when more than 1% of rows differ, and find the feature and the day." }
      ],
      requirements: [
        "Per-feature, per-day mismatch rates",
        "A tolerance that ignores 10⁻⁹ serialisation noise",
        "An alert threshold of 1% of rows",
        "The first day and the feature that alerted"
      ],
      hint: "np.isclose with an absolute tolerance compares two arrays elementwise; the mismatch rate is the mean of its negation.",
      solution: { lang: "python",
        title: "served_vs_recomputed.py",
        code: `import numpy as np, pandas as pd
rng = np.random.default_rng(14)

# Production logs every served request's features. A daily job recomputes the same features for the same customer
# and timestamp from the offline pipeline and compares. On day 6 the online store starts serving tickets_90d from a
# cache that refreshes weekly.
FEATURES = ["usage_0", "tenure_days", "tickets_90d", "spend_30d"]
rows = []
for day in range(1, 15):
    n = 3_000
    truth = pd.DataFrame({"usage_0": rng.gamma(2, 10, n), "tenure_days": rng.integers(1, 2000, n).astype(float),
                          "tickets_90d": rng.poisson(1.2, n).astype(float), "spend_30d": rng.gamma(2, 30, n).round(2)})
    served = truth.copy()
    if day >= 6:                                              # stale cache: a share of customers have a ticket count a week old
        stale = rng.random(n) < 0.18
        served.loc[stale, "tickets_90d"] = np.maximum(0, truth.tickets_90d[stale] - rng.poisson(0.6, stale.sum()))
    served["spend_30d"] += rng.normal(0, 1e-9, n)              # float noise from serialisation: not a real difference
    rows.append((day, truth, served))

def compare(truth, served, tol=1e-6):
    return {f: float(np.mean(~np.isclose(truth[f], served[f], rtol=0, atol=tol))) for f in FEATURES}

print(f"{'day':>4}" + "".join(f"{f:>13}" for f in FEATURES) + "   alert")
for day, truth, served in rows:
    rates = compare(truth, served)
    alerts = [f for f, r in rates.items() if r > 0.01]
    print(f"{day:>4}" + "".join(f"{rates[f]:>13.1%}" for f in FEATURES) + f"   {', '.join(alerts) or '-'}")`,
        out: ` day      usage_0  tenure_days  tickets_90d    spend_30d   alert
   1         0.0%         0.0%         0.0%         0.0%   -
   2         0.0%         0.0%         0.0%         0.0%   -
   3         0.0%         0.0%         0.0%         0.0%   -
   4         0.0%         0.0%         0.0%         0.0%   -
   5         0.0%         0.0%         0.0%         0.0%   -
   6         0.0%         0.0%         5.3%         0.0%   tickets_90d
   7         0.0%         0.0%         5.6%         0.0%   tickets_90d
   8         0.0%         0.0%         5.8%         0.0%   tickets_90d
   9         0.0%         0.0%         5.8%         0.0%   tickets_90d
  10         0.0%         0.0%         5.1%         0.0%   tickets_90d
  11         0.0%         0.0%         5.2%         0.0%   tickets_90d
  12         0.0%         0.0%         5.9%         0.0%   tickets_90d
  13         0.0%         0.0%         5.9%         0.0%   tickets_90d
  14         0.0%         0.0%         6.4%         0.0%   tickets_90d`,
        notes: [
          { t: "p",
            text: "tickets_90d started mismatching on day 6, at 5–6% of rows, and alerted every day after; every other feature stayed at 0% despite the deliberate floating-point noise on spend_30d. Only about 5% of rows differ although 18% were served from the stale cache, because many customers' ticket counts had not changed in the week." },
          { t: "p",
            text: "That is also why distribution checks would struggle here: a stale count for a few percent of customers barely moves the feature's distribution. Row-level comparison against a recomputation is the check that sees it, on the day it starts." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the online store that lagged a week",
      body: [
        { t: "p",
          text: "**Symptom.** A churn model's retention offers performed noticeably worse for three weeks; offline evaluation on the same period looked normal." },
        { t: "p",
          text: "**Mechanism.** To cut database load, the online feature service had added a cache with a seven-day expiry in front of the support ticket counts. Offline features came straight from the warehouse. Customers who had just raised tickets, the ones most likely to leave, were scored with last week's counts." },
        { t: "p",
          text: "**Fix.** The cache expiry was tied to the feature's freshness requirement and recorded in the feature registry. Served features are logged with every prediction, a daily job compares a sample with offline recomputations and alerts per feature, and new caches in the serving path need a freshness review." }
      ] }
  ],

  takeaways: [
    "Prevent skew structurally: **one implementation**, shipped with the model as **one artefact** for every consumer.",
    "Measured: the batch job and the request handler agreed to **0** difference on 500 rows using the same artefact.",
    "The artefact cannot protect its inputs: rounding one request field moved **3%** of predictions and failed the test.",
    "Compare **features** as well as predictions: tree models hide input changes that do not cross a split.",
    "Log the served feature vector with every prediction, and compare a daily sample with offline recomputation.",
    "Row-level comparison found a stale cache on **day 6** at **5–6%** of rows, where distribution checks would barely move.",
    "Use tolerances that ignore serialisation noise but catch real changes."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does shipping the fitted transforms and model as one artefact prevent?",
        options: [
          "All differences between the offline and online inputs",
          "Differences in the transform code and its constants",
          "Drift in the distribution of incoming data",
          "Version skew in all the libraries that it depends on"
        ],
        answer: 1,
        why: "One copy of the transform means it cannot be reimplemented differently. Raw inputs can still differ, drift is about the world, and library versions need pinning (lesson 13.3)." },
      { stem: "Rounding a request field changed nearly every row's feature but only 3% of predictions. Why?",
        options: [
          "The model ignores that one feature completely",
          "Tree outputs change only when a split is crossed",
          "Rounding changes values by less than the float noise",
          "The test compared the wrong set of rows to each other"
        ],
        answer: 1,
        why: "A gradient-boosted tree's output is constant between thresholds, so most rounded values fell in the same leaf. The model does use the feature, rounding to integers is far above float noise, and the rows matched." },
      { stem: "Why compare served features with recomputed ones rather than only their distributions?",
        options: [
          "Recomputation is much cheaper than computing PSI",
          "Row-level errors can leave distributions unchanged",
          "Distributions cannot be computed on logged data",
          "PSI only works for categorical features, not numbers"
        ],
        answer: 1,
        why: "A stale value for a few percent of customers barely moves the distribution but is caught row by row. Recomputation is the more expensive check, distributions are easily computed on logs, and PSI works for numeric features." },
      { stem: "What must be logged with each prediction for the daily comparison to work?",
        options: [
          "Only the predicted probability of each request",
          "Served features, entity ID and timestamp",
          "The model's training metrics and its AUC",
          "The full HTTP headers of every request"
        ],
        answer: 1,
        why: "Recomputation needs to know which entity and moment, and the comparison needs the exact features served. The score alone, training metrics and headers do not allow it." }
    ] },

  interview: { title: "In an interview",
    sub: "Skew answers should combine prevention and detection.",
    questions: [
      { level: "core",
        q: "How do you prevent training-serving skew?",
        strong: "A strong answer removes duplicate implementations and tests the remaining boundary.",
        answer: [
          { t: "p",
            text: "One implementation of each transform, fitted in training and shipped with the model as one artefact (a pipeline object, an ONNX graph, or a feature store serving the same definitions to both sides). Point-in-time feature construction for training (lesson 13.2) and a pinned environment (13.3). An integration test in CI that scores the same real rows through the batch path and the online path and compares features and predictions." }
        ] },
      { level: "advanced",
        q: "How would you detect skew in production?",
        strong: "A strong answer logs served features and recomputes them, with distribution checks as a cheaper layer.",
        answer: [
          { t: "p",
            text: "Log the exact feature vector, entity ID and timestamp with every prediction. Daily, recompute a sample's features with the offline pipeline as of the same timestamps and compare per feature, alerting on mismatch rates above a small threshold. Add distribution comparisons between served and training features, and of the prediction distribution, as cheaper continuous checks. Route alerts to the owners of the feature named." }
        ] },
      { level: "core",
        q: "Your parity test compares only predictions. What can it miss?",
        strong: "A strong answer explains model insensitivity and calibration-neutral changes.",
        answer: [
          { t: "p",
            text: "Input errors the model happens not to react to on the test rows, as with a tree model whose splits are not crossed, which will matter on other rows or after retraining. It can also miss small consistent shifts within tolerance. Comparing the features themselves catches the error at its source and names the broken feature." }
        ] }
    ] }
});

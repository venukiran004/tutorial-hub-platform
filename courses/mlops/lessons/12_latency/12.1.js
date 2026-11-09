/* ============================================================================
   LESSON 12.1 — Where the Time Goes
   ========================================================================= */
EC.receiveLesson({
  id: "12.1",

  lede: "When a prediction endpoint is slow, the first instinct is to make the model faster: a smaller model, quantisation, a GPU. That instinct is usually wrong, because the model is usually not where the time goes. A request also spends time being parsed, fetching features, being turned into the model's input format and being written back out, and in Python the glue between those stages is often the slowest part. This lesson instruments a real FastAPI prediction service stage by stage, finds the largest term, and removes it without changing a single prediction.",

  objectives: [
    "Instrument a prediction request by stage and read the breakdown at p50 and p99",
    "Recognise per-request DataFrame construction and generic transformers as a common hot spot",
    "Remove a hot spot while proving the predictions are unchanged",
    "Use the breakdown to decide what to optimise next"
  ],

  prerequisites: ["9.1", "7.2"],

  blocks: [
    { t: "h2", n: "01", id: "measure", text: "One request, five stages", sub: "Timed inside a real service" },
    { t: "p",
      text: "The service is a typical churn endpoint. A request carries a customer ID and two request-time fields. The handler parses the JSON, reads 18 stored features from a SQLite feature table with an index on the ID, builds a one-row DataFrame, applies the fitted scikit-learn `ColumnTransformer` (scaling and one-hot encoding), runs a gradient-boosted model, and writes the response. The script times each stage with `perf_counter` inside the handler and the whole request from the client, over 1,000 requests after a warm-up." },
    { t: "code",
      lang: "python",
      title: "svc_common.py — the feature store and the model",
      code: `"""Shared set-up for the latency lessons: a feature store in SQLite and a scikit-learn pipeline trained on it."""
import pickle, sqlite3
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = Path(__file__).parent
DB, MODEL = HERE / "features.db", HERE / "churn.pkl"
NUM = [f"usage_{i}" for i in range(12)] + ["tenure_days", "tickets_90d", "spend_30d"]
CAT = ["plan", "country", "device"]
REQ = ["session_minutes", "pages"]                         # known only at request time

def build(n=100_000, seed=0):
    rng = np.random.default_rng(seed)
    df = pd.DataFrame(rng.gamma(2, 10, (n, len(NUM))), columns=NUM)
    df["plan"] = rng.choice(["free", "basic", "pro", "team"], n); df["country"] = rng.choice(["GB", "US", "DE", "IN", "BR", "FR"], n)
    df["device"] = rng.choice(["ios", "android", "web"], n); df.insert(0, "customer_id", np.arange(n))
    with sqlite3.connect(DB) as con:
        df.to_sql("features", con, if_exists="replace", index=False)
        con.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix ON features(customer_id)")
    train = df.sample(30_000, random_state=seed).copy()
    train["session_minutes"] = rng.gamma(2, 5, len(train)); train["pages"] = rng.poisson(6, len(train))
    y = (train.usage_0 / 20 - train.tickets_90d / 15 + (train.plan == "pro") * 0.8 + rng.normal(0, 1, len(train)) > 0.7).astype(int)
    pre = ColumnTransformer([("num", StandardScaler(), NUM + REQ), ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)])
    pipe = Pipeline([("pre", pre), ("model", HistGradientBoostingClassifier(max_iter=200, random_state=seed))]).fit(train[NUM + CAT + REQ], y)
    MODEL.write_bytes(pickle.dumps(pipe))

if not DB.exists() or not MODEL.exists(): build()` },
    { t: "code",
      lang: "python",
      title: "stages.py — per-stage timing inside the handler",
      code: `import pickle, sqlite3, threading, time
import httpx, numpy as np, orjson, pandas as pd, uvicorn
from fastapi import FastAPI, Request, Response
from svc_common import CAT, DB, MODEL, NUM, REQ

pipe = pickle.loads(MODEL.read_bytes())
con = sqlite3.connect(DB, check_same_thread=False)
COLS = ", ".join(NUM + CAT)
timings = {k: [] for k in ("deserialise", "fetch features", "build frame + transform", "model", "serialise")}

app = FastAPI()
@app.post("/predict")
async def predict(request: Request):
    t0 = time.perf_counter()
    body = orjson.loads(await request.body())
    t1 = time.perf_counter()
    row = con.execute(f"SELECT {COLS} FROM features WHERE customer_id = ?", (body["customer_id"],)).fetchone()
    t2 = time.perf_counter()
    frame = pd.DataFrame([list(row) + [body["session_minutes"], body["pages"]]], columns=NUM + CAT + REQ)
    Xt = pipe.named_steps["pre"].transform(frame)
    t3 = time.perf_counter()
    p = float(pipe.named_steps["model"].predict_proba(Xt)[0, 1])
    t4 = time.perf_counter()
    out = orjson.dumps({"customer_id": body["customer_id"], "churn_probability": p})
    t5 = time.perf_counter()
    for k, a, b in zip(timings, (t0, t1, t2, t3, t4), (t1, t2, t3, t4, t5)): timings[k].append((b - a) * 1000)
    return Response(out, media_type="application/json")

srv = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8761, log_level="error"))
threading.Thread(target=srv.run, daemon=True).start()
while not srv.started: time.sleep(0.05)

rng = np.random.default_rng(1); total = []
with httpx.Client(base_url="http://127.0.0.1:8761") as c:
    for i in range(1_100):
        body = orjson.dumps({"customer_id": int(rng.integers(0, 100_000)), "session_minutes": 12.5, "pages": 7})
        t = time.perf_counter(); c.post("/predict", content=body); total.append((time.perf_counter() - t) * 1000)
total = total[100:]
for k in timings: timings[k] = timings[k][100:]                     # discard warm-up
inside = sum(np.median(v) for v in timings.values())
print(f"{'stage':<26}{'p50 ms':>8}{'p99 ms':>8}{'share of p50':>14}")
for k, v in timings.items():
    print(f"{k:<26}{np.median(v):>8.3f}{np.percentile(v, 99):>8.3f}{np.median(v) / np.median(total):>14.0%}")
print(f"{'HTTP, routing, client':<26}{np.median(total) - inside:>8.3f}{'':>8}{(np.median(total) - inside) / np.median(total):>14.0%}")
print(f"{'end to end':<26}{np.median(total):>8.3f}{np.percentile(total, 99):>8.3f}")
srv.should_exit = True`,
      out: `stage                       p50 ms  p99 ms  share of p50
deserialise                  0.035   0.507            1%
fetch features               0.245   0.630            4%
build frame + transform      3.802   9.200           58%
model                        0.725   1.908           11%
serialise                    0.004   0.015            0%
HTTP, routing, client        1.742                   27%
end to end                   6.553  14.785` },
    { t: "viz",
      title: "Where 6.6 ms went, at the median",
      caption: "Turning one row into the model's input took five times as long as the model. The feature lookup, often blamed first, was 4%.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="200" y="31.0" text-anchor="end" class="s-label">build frame + transform</text>
<rect x="210" y="14" width="375.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">3.80 ms  (58%)</text>
<text x="200" y="69.0" text-anchor="end" class="s-label">HTTP, routing, client</text>
<rect x="210" y="52" width="171.8" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="389.8" y="69.0" class="s-sub">1.74 ms  (27%)</text>
<text x="200" y="107.0" text-anchor="end" class="s-label">model</text>
<rect x="210" y="90" width="71.5" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="289.5" y="107.0" class="s-sub">0.73 ms  (11%)</text>
<text x="200" y="145.0" text-anchor="end" class="s-label">fetch features</text>
<rect x="210" y="128" width="24.2" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="242.2" y="145.0" class="s-sub">0.25 ms  (4%)</text>
<text x="200" y="183.0" text-anchor="end" class="s-label">deserialise</text>
<rect x="210" y="166" width="3.5" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="221.5" y="183.0" class="s-sub">0.04 ms</text>
<text x="200" y="221.0" text-anchor="end" class="s-label">serialise</text>
<rect x="210" y="204" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="220.0" y="221.0" class="s-sub">0.004 ms</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The glue was the bottleneck",
          def: "Building a one-row DataFrame and running the generic ColumnTransformer took 3.8 ms, 58% of the request. Both are designed for many rows at a time; for one row, their fixed overhead dominates." },
        { term: "The model was 11%",
          def: "0.73 ms. A model twice as fast would have saved about 0.36 ms, 5% of the request." },
        { term: "The framework is a fixed cost",
          def: "HTTP parsing, routing and the client accounted for 1.7 ms (27%) that no change inside the handler can remove; batching or a lighter protocol can (lessons 9.3, 12.3)." },
        { term: "Look at p99 too",
          def: "The transform stage's p99 was 9.2 ms against a 3.8 ms median: its overhead also varies the most, so it drives the tail as well as the median." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Optimising the model first",
      body: [
        { t: "p",
          text: "Teams reach for quantisation, distillation or a GPU because the model is the part that feels like ML. Here every one of those would have addressed 11% of the latency, at a risk to accuracy. Measure stages before choosing what to change; the answer decides everything after it." }
      ] },
    { t: "h2",
      n: "02",
      id: "fix",
      text: "Removing the hot spot without changing a prediction",
      sub: "Compile the fitted transformer" },
    { t: "p",
      text: "The fitted transformer is just arithmetic: subtract a mean, divide by a scale, set one position per category. Extracting those arrays once at start-up and applying them to a NumPy row removes the per-request DataFrame and the generic machinery. The risk is the one module 13 is about: a reimplemented transform can drift from the original. So the change ships with a test that the new path gives identical predictions on thousands of real rows, including an unknown category." },
    { t: "callout",
      kind: "insight",
      title: "Every optimisation needs an equality test",
      body: [
        { t: "p",
          text: "A faster path that gives slightly different predictions is a new model nobody evaluated. Assert exact or near-exact equality between the old and new paths on real data in CI, and keep the test as long as both implementations exist." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Compile the transformer, and prove it",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p",
          text: "Extract the fitted StandardScaler's means and scales and the OneHotEncoder's categories into arrays, and write a function that turns one row into the model's input with NumPy alone. Check that predictions match the original pipeline on 2,000 rows from the feature store and on a row with a category the encoder has never seen. Time the old and new transform and the model on one row." }
      ],
      requirements: [
        "Arrays extracted once from the fitted transformer",
        "Unknown categories encoded as all zeros, as handle_unknown='ignore' does",
        "An equality check on 2,000 real rows",
        "Timings for the old transform, the new transform and the model"
      ],
      hint: "ColumnTransformer outputs numeric columns first, then the one-hot block in the order of encoder.categories_; offsets into that block come from a cumulative sum of category counts.",
      solution: { lang: "python",
        title: "compile_transform.py",
        code: `import pickle, sqlite3, timeit
import numpy as np, pandas as pd
from svc_common import CAT, DB, MODEL, NUM, REQ

pipe = pickle.loads(MODEL.read_bytes())
pre, model = pipe.named_steps["pre"], pipe.named_steps["model"]
scaler, onehot = pre.named_transformers_["num"], pre.named_transformers_["cat"]

# Compile the fitted transformer once into arrays: the same arithmetic, without a DataFrame per request.
mean, scale = scaler.mean_, scaler.scale_
cat_index = [{c: i for i, c in enumerate(cats)} for cats in onehot.categories_]
offsets = np.cumsum([0] + [len(c) for c in onehot.categories_])[:-1]
n_num, n_cat = len(mean), int(sum(len(c) for c in onehot.categories_))

def fast_transform(num_values, cat_values):
    x = np.zeros(n_num + n_cat)
    x[:n_num] = (np.asarray(num_values, dtype=float) - mean) / scale
    for j, v in enumerate(cat_values):
        k = cat_index[j].get(v)
        if k is not None: x[n_num + offsets[j] + k] = 1.0          # unknown category: all zeros, as handle_unknown="ignore"
    return x[None, :]

con = sqlite3.connect(DB)
rows = con.execute(f"SELECT {', '.join(NUM + CAT)} FROM features LIMIT 2000").fetchall()
req = (12.5, 7)

def slow(row):
    frame = pd.DataFrame([list(row) + list(req)], columns=NUM + CAT + REQ)
    return model.predict_proba(pre.transform(frame))[0, 1]
def fast(row):
    return model.predict_proba(fast_transform(list(row[:len(NUM)]) + list(req), row[len(NUM):]))[0, 1]

a = np.array([slow(r) for r in rows]); b = np.array([fast(r) for r in rows])
print(f"2,000 rows: identical predictions: {np.allclose(a, b, rtol=0, atol=1e-12)} (max difference {np.abs(a - b).max():.1e})")
print(f"unknown category handled the same: {np.isclose(slow(rows[0][:-1] + ('smart-tv',)), fast(rows[0][:-1] + ('smart-tv',)))}")

row = rows[0]
t_frame = min(timeit.repeat(lambda: pre.transform(pd.DataFrame([list(row) + list(req)], columns=NUM + CAT + REQ)), number=300, repeat=5)) / 300
t_fast = min(timeit.repeat(lambda: fast_transform(list(row[:len(NUM)]) + list(req), row[len(NUM):]), number=3000, repeat=5)) / 3000
X1 = fast_transform(list(row[:len(NUM)]) + list(req), row[len(NUM):])
t_model = min(timeit.repeat(lambda: model.predict_proba(X1), number=300, repeat=5)) / 300
print(f"transform: DataFrame + ColumnTransformer {t_frame * 1000:.3f} ms -> compiled {t_fast * 1000:.3f} ms ({t_frame / t_fast:.0f}x)")
print(f"model.predict_proba on one row: {t_model * 1000:.3f} ms, now the largest in-process stage")`,
        out: `2,000 rows: identical predictions: True (max difference 0.0e+00)
unknown category handled the same: True
transform: DataFrame + ColumnTransformer 2.713 ms -> compiled 0.005 ms (601x)
model.predict_proba on one row: 0.607 ms, now the largest in-process stage`,
        notes: [
          { t: "p",
            text: "The compiled transform took 0.005 ms against 2.7 ms, 600 times faster, and predictions on 2,000 rows were identical to the last bit, as was the unknown-category case. That removes about 40% of the request's median latency." },
          { t: "p",
            text: "The model at 0.6 ms is now the largest in-process stage, which changes what to do next: batching requests (lesson 12.3) or a compiled model format. The breakdown should be re-measured after every change, because the largest term moves." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the GPU that made it slower",
      body: [
        { t: "p",
          text: "**Symptom.** A team moved a fraud model's endpoint to GPU instances to cut p99 from 40 ms to under 20 ms. p99 rose to 46 ms and the bill tripled." },
        { t: "p",
          text: "**Mechanism.** A stage breakdown, done afterwards, showed 26 ms in building a DataFrame and running feature transforms, 9 ms in three feature-store calls made one after another, and 2 ms in the model. The GPU added a host-to-device copy to a model that was never the problem." },
        { t: "p",
          text: "**Fix.** The transforms were compiled to array operations with an equality test, the three feature calls were made in parallel, and the service went back to CPU instances. p99 fell to 14 ms. Stage timings became permanent metrics on the endpoint." }
      ] }
  ],

  takeaways: [
    "Instrument every stage of a request before deciding what to optimise.",
    "Measured: building a one-row DataFrame and transforming it took **58%** of the request; the model took **11%**.",
    "Generic, DataFrame-based transformers carry large fixed per-call overhead on single rows.",
    "Compiling the fitted transformer to arrays was **600×** faster with **identical** predictions.",
    "Every optimisation ships with an **equality test** against the old path.",
    "The framework's fixed cost (**27%** here) is reduced by batching or a lighter protocol, not by handler changes.",
    "Re-measure after each change: the largest term moves.",
    "Keep stage timings as permanent metrics."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "In the measured service, which stage took the most time at the median?",
        options: [
          "The model's prediction on the single row of data",
          "Building a DataFrame and transforming it",
          "The feature-store lookup in the SQLite table",
          "Parsing the JSON body of the request"
        ],
        answer: 1,
        why: "3.8 ms of 6.6, 58%. The model took 0.73 ms, the lookup 0.25 ms and parsing 0.04 ms." },
      { stem: "A model twice as fast is proposed. Roughly how much would it save here?",
        options: [
          "About half of the whole end-to-end request latency",
          "About 5%: the model was 11% of the request",
          "Nothing, because the model is on the CPU",
          "About a quarter, the share spent in HTTP"
        ],
        answer: 1,
        why: "Halving a 0.73 ms stage saves 0.36 ms of 6.6 ms. Only the model's own share can be saved by a faster model; HTTP time is a separate stage." },
      { stem: "What must ship with a reimplemented, faster transform?",
        options: [
          "A new model trained on the new transform's outputs",
          "A test that it gives the same predictions on real rows",
          "A feature flag that turns it on at random",
          "A larger instance type to absorb any extra load it brings"
        ],
        answer: 1,
        why: "The new path must be shown equivalent, or it is an unevaluated model change; the exercise matched 2,000 rows exactly. Retraining, random flags or bigger instances do not establish equivalence." },
      { stem: "After compiling the transform, what should you do before optimising further?",
        options: [
          "Quantise the model straight away",
          "Measure the stage breakdown again",
          "Move the service onto a GPU",
          "Increase the number of uvicorn workers"
        ],
        answer: 1,
        why: "The largest term changes after each fix: the model became the largest in-process stage. Measure, then decide; the other options are guesses without a new breakdown." }
    ] },

  interview: { title: "In an interview",
    sub: "Latency questions start with a measurement, not a technique.",
    questions: [
      { level: "core",
        q: "Your prediction endpoint has a p99 of 80 ms and the target is 30. What do you do?",
        strong: "A strong answer instruments stages, finds the largest term at p99, and fixes it with a correctness check.",
        answer: [
          { t: "p",
            text: "Instrument each stage (parse, feature fetch, transform, model, serialise, plus framework time) and look at both p50 and p99, because the tail may come from a different stage. Then work on the largest term: sequential feature calls become parallel or batched, per-request DataFrames become array operations, the model gets batched or compiled only if it is the largest. Each change ships with an equality test and a re-measurement." }
        ] },
      { level: "core",
        q: "Why are scikit-learn pipelines slow for single-row online inference?",
        strong: "A strong answer explains per-call overhead and how to remove it safely.",
        answer: [
          { t: "p",
            text: "They are built for batches: each call validates inputs, builds or checks DataFrames, dispatches per column and allocates intermediate arrays, a fixed overhead of milliseconds that is negligible on 100,000 rows and dominant on one. Options: batch requests, compile the fitted transforms to array code with an equality test, or export the pipeline to a runtime designed for single rows such as ONNX Runtime, again verified for equal outputs." }
        ] },
      { level: "advanced",
        q: "How would you keep latency from regressing over time?",
        strong: "A strong answer makes stage timings permanent and gates changes on them.",
        answer: [
          { t: "p",
            text: "Export per-stage timings as histograms, alert on the p99 of the end-to-end and of the largest stages, and run a load test in CI that fails the build if p99 at a fixed request rate rises beyond a budget. Track the breakdown per release, so a regression points to a stage and a commit rather than to 'the service got slower'." }
        ] }
    ] }
});

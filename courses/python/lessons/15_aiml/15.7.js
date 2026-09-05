/* ============================================================================
   LESSON 15.7 — Serving a Model with FastAPI
   ========================================================================= */
EC.receiveLesson({
  id: "15.7",

  lede: "Serving a model is an ordinary web service with three unusual properties: **the model is large and slow to load, inference is CPU-bound, and the failure modes are silent.** A broken API returns 500s and pages someone; a model served with the wrong feature order returns confident predictions that are wrong, and nothing anywhere reports a problem.",

  objectives: [
    "Load a model once at startup, not per request",
    "Validate input against the training contract, not just its types",
    "Batch requests to trade a little latency for a lot of throughput",
    "Set a latency budget and know where the time goes",
    "Detect the failure modes unique to inference"
  ],

  prerequisites: ["12.4", "14.8", "15.6"],

  blocks: [

    { t: "h2", n: "01", text: "Load once", id: "loading" },

    { t: "code", lang: "python", title: "lifespan, and why nothing else will do", code: `
from contextlib import asynccontextmanager

MODEL: Pipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL
    artifact = joblib.load("model.joblib")
    MODEL = artifact["pipeline"]
    app.state.card = artifact["card"]

    # WARM-UP. The first prediction is 10-100x slower than the rest:
    # lazy imports, BLAS thread pools, JIT compilation, page faults on
    # the model's memory. Pay it here, not on a user's request.
    MODEL.predict(sample_input())

    yield

    MODEL = None


app = FastAPI(lifespan=lifespan)

# WHY NOT LOAD PER REQUEST:
#   joblib.load on a 200MB model is 2-4 seconds and allocates 200MB.
#   At 10 requests per second that is 2GB/s of allocation and a
#   guaranteed OOM.
#
# WHY NOT LOAD LAZILY ON FIRST USE:
#   The readiness probe passes before the model exists, so traffic
#   arrives at a pod that cannot serve it. Under gunicorn, several
#   workers race to load simultaneously and the pod OOMs on startup.
#
# WHY THE WARM-UP MATTERS:
#   Without it the first request after every deploy is a timeout, and
#   in a rolling deploy that is one timeout per pod, every release.
`,
      hl: [14, 27, 31],
      caption: "**With `--preload` under gunicorn the model is loaded once in the master and shared copy-on-write across workers** — the difference between 200MB and 1.6GB for eight workers (Lesson 14.8)."
    },

    { t: "callout", kind: "trap", title: "The readiness probe must know about the model", body: [
      { t: "code", lang: "python", title: "otherwise a deploy drops traffic", numbered: false, code: `
@app.get("/health/ready")
def ready():
    # NOT just "the process is up". A pod whose model has not
    # finished loading must not receive traffic.
    if MODEL is None:
        return JSONResponse({"status": "loading"}, status_code=503)
    return {"status": "ready", "model_id": app.state.card["model_id"]}

# And the startupProbe must allow for the load time -- a 40-second
# model load fails a 10-second liveness probe, and the pod is killed
# and restarted forever (Lesson 14.3):
#
#   startupProbe:
#     httpGet: { path: /health/live, port: 8000 }
#     failureThreshold: 30
#     periodSeconds: 5          # allows 150 seconds to start`},
      { t: "p", text: "**A model-serving pod is the classic case for `startupProbe`.** Loading takes far longer than steady-state health checks allow, and without it the pod enters a restart loop that looks like a crash." }
    ]},

    { t: "h2", n: "02", text: "Input validation", id: "validation" },

    { t: "ladder",
      title: "Accepting features for a prediction",
      rungs: [
        { level: "bad", label: "A list of numbers",
          why: "Positional, so a caller sending features in a different order gets a confident, wrong prediction with no error. This is the single most common silent failure in model serving.",
          code: `@app.post("/predict")
def predict(features: list[float]):
    return {"score": MODEL.predict_proba([features])[0][1]}

# The caller sends [age, income, tenure]; the model was trained on
# [tenure, age, income]. Every prediction is nonsense. Nothing fails.` },
        { level: "ok", label: "A named schema",
          why: "Names remove the ordering bug and give type validation. It still accepts values the model has never seen — an age of 900, a negative income — and produces a confident extrapolation.",
          code: `class Features(BaseModel):
    age: int
    income: float
    tenure_months: int

@app.post("/predict")
def predict(f: Features):
    return {"score": score(f)}` },
        { level: "best", label: "Named, bounded, and checked against training",
          why: "Ranges come from the training data, so an out-of-distribution input is rejected or flagged rather than silently extrapolated. The response also carries the model id, so a wrong prediction can be traced to a version.",
          code: `class Features(BaseModel):
    model_config = ConfigDict(extra="forbid")   # a typo'd field is
                                                # an error, not silence
    age: int = Field(ge=18, le=120)
    income: float = Field(ge=0, le=10_000_000)
    tenure_months: int = Field(ge=0, le=600)
    country: str
    plan: Literal["basic", "pro", "enterprise"]

    @field_validator("country")
    @classmethod
    def known_country(cls, v: str) -> str:
        # Unknown categories encode as all-zeros, which is a valid
        # vector and a meaningless prediction. Flag it explicitly.
        if v not in TRAINING_CATEGORIES["country"]:
            raise ValueError(f"unseen country {v!r}")
        return v


class Prediction(BaseModel):
    score: float
    model_id: str          # WHICH model produced this
    model_version: str
    predicted_at: datetime`,
          note: "**`extra=\"forbid\"` catches the renamed field.** A caller sending `annual_income` where the model expects `income` otherwise gets the imputed default and a plausible wrong answer." }
      ]
    },

    { t: "callout", kind: "insight", title: "Training-serving skew", body: [
      { t: "code", lang: "python", title: "the same feature, computed twice", numbered: false, code: `
# TRAINING (a notebook, six months ago):
df["days_since_login"] = (df["snapshot_date"] - df["last_login"]).dt.days

# SERVING (a Java service, written by another team):
daysSinceLogin = ChronoUnit.DAYS.between(lastLogin, Instant.now());

# Two implementations of one feature. They differ on:
#   - timezone handling
#   - whether a partial day rounds up or down
#   - what happens when last_login is null
#
# The model was trained on one definition and serves on the other, so
# every prediction is slightly wrong -- and nothing reports it.

# THE STRUCTURAL FIX: compute features ONCE, in code both paths use.
#   - the same Python function, imported by training and serving
#   - or a feature store, which is that idea with infrastructure
#   - or push the computation into the pipeline, so the model itself
#     owns the transformation (Lesson 15.5)

# THE DETECTION: log the feature vectors your service computes, and
# compare their distribution against the training set weekly.`},
      { t: "p", text: "**Training-serving skew is the most expensive bug in production machine learning**, because it degrades quality without failing anything. Making the pipeline own the preprocessing removes most of it by construction." }
    ]},

    { t: "h2", n: "03", text: "Latency", id: "latency" },

    { t: "viz",
      title: "Where a 45ms prediction goes",
      caption: "Model inference is often the smallest part. Optimising the model when 60% of the budget is feature lookup and serialisation is effort spent in the wrong place — measure before choosing.",
      svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Breakdown of latency in a model serving request">
  <text x="24" y="30" class="s-label">p50 request: 45ms</text>

  <rect x="24" y="46" width="60" height="30" rx="4" style="fill:var(--t-blue);opacity:.35"/>
  <rect x="84" y="46" width="240" height="30" rx="4" style="fill:var(--t-amber);opacity:.4"/>
  <rect x="324" y="46" width="120" height="30" rx="4" style="fill:var(--t-violet);opacity:.4"/>
  <rect x="444" y="46" width="180" height="30" rx="4" style="fill:var(--t-green);opacity:.4"/>
  <rect x="624" y="46" width="150" height="30" rx="4" style="fill:var(--t-pink);opacity:.4"/>
  <rect x="774" y="46" width="102" height="30" rx="4" style="fill:var(--t-cyan);opacity:.4"/>

  <g class="s-sub">
    <text x="24" y="100">3ms</text>   <text x="24" y="120" style="fill:var(--ink-3)">parse</text>
    <text x="84" y="100">12ms</text>  <text x="84" y="120" style="fill:var(--ink-3)">feature lookup (DB)</text>
    <text x="324" y="100">6ms</text>  <text x="324" y="120" style="fill:var(--ink-3)">preprocess</text>
    <text x="444" y="100">9ms</text>  <text x="444" y="120" style="fill:var(--ink-3)">MODEL</text>
    <text x="624" y="100">8ms</text>  <text x="624" y="120" style="fill:var(--ink-3)">serialise</text>
    <text x="774" y="100">5ms</text>  <text x="774" y="120" style="fill:var(--ink-3)">log</text>
  </g>

  <text x="24" y="168" class="s-sub" style="fill:var(--crit)">The model is 20% of the budget. A 2x faster model buys 4.5ms.</text>
  <text x="24" y="192" class="s-sub" style="fill:var(--good)">Caching the feature lookup buys 12ms. Async logging buys 5ms.</text>
  <text x="24" y="222" class="s-sub" style="fill:var(--ink-3)">Instrument each stage as a span before optimising anything (Lesson 14.3).</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the four things that actually help", code: `
# 1. THREAD LIMITS. BLAS spawns one thread per core BY DEFAULT, so 8
#    gunicorn workers x 8 BLAS threads = 64 threads on 8 cores. They
#    fight, and latency gets WORSE under load.
#    Set these BEFORE importing numpy -- they are read at import.
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

# 2. ONNX RUNTIME. Typically 2-10x faster than sklearn for the same
#    model: a fused computation graph, no Python in the loop
#    (Lesson 15.6).
session = rt.InferenceSession("model.onnx")

# 3. def, NOT async def. Inference is CPU-bound, so an async handler
#    blocks the event loop for its whole duration and stalls every
#    other request on the worker (Lesson 12.7).
@app.post("/predict")
def predict(f: Features) -> Prediction:      # def -> threadpool
    ...

# 4. RESPOND FIRST, LOG AFTER. Prediction logging is essential for
#    monitoring and it must not sit in the latency path.
@app.post("/predict")
def predict(f: Features, background: BackgroundTasks) -> Prediction:
    result = run_model(f)
    background.add_task(log_prediction, f, result)   # after the
    return result                                    # response
`,
      hl: [5, 17, 25],
      caption: "**The BLAS thread setting is the highest-value line in this lesson.** Oversubscribed threads make a service slower as load increases, which reads as a capacity problem and is solved by adding pods that make it worse."
    },

    { t: "h2", n: "04", text: "Batching", id: "batching" },

    { t: "code", lang: "python", title: "trade a few milliseconds for several times the throughput", code: `
class BatchPredictor:
    """Collect requests for a few milliseconds, run them as one
    matrix, and return each result to its caller.

    Model inference is dominated by fixed overhead: a batch of 32 is
    often barely slower than a batch of 1, so batching multiplies
    throughput for a small, bounded latency cost.
    """

    def __init__(self, model, max_batch: int = 32, max_wait_ms: int = 10):
        self.model = model
        self.max_batch = max_batch
        self.max_wait = max_wait_ms / 1000
        self.queue: asyncio.Queue = asyncio.Queue()

    async def predict(self, features: np.ndarray) -> float:
        future: asyncio.Future = asyncio.get_running_loop().create_future()
        await self.queue.put((features, future))
        return await future

    async def _run(self) -> None:
        while True:
            items = [await self.queue.get()]
            deadline = time.monotonic() + self.max_wait

            # Fill the batch until it is full OR the deadline passes.
            # The deadline is what BOUNDS the added latency -- without
            # it, a quiet period means a request waits indefinitely.
            while len(items) < self.max_batch:
                timeout = deadline - time.monotonic()
                if timeout <= 0:
                    break
                try:
                    items.append(await asyncio.wait_for(
                        self.queue.get(), timeout))
                except TimeoutError:
                    break

            batch = np.vstack([f for f, _ in items])
            # to_thread: the inference is CPU-bound and must not run
            # on the event loop.
            scores = await asyncio.to_thread(
                self.model.predict_proba, batch)

            for (_, future), score in zip(items, scores[:, 1]):
                if not future.cancelled():
                    future.set_result(float(score))

# TYPICAL EFFECT, single-row vs batch-32:
#   throughput   110/s  ->  900/s
#   p50 latency  9ms    ->  14ms
#   p99 latency  22ms   ->  31ms
`,
      hl: [26, 32, 41],
      caption: "**Batching only helps when requests arrive concurrently.** At two requests per second every batch is size one and you have added ten milliseconds for nothing — measure the arrival rate first."
    },

    { t: "callout", kind: "tradeoff", title: "When batching is wrong", body: [
      { t: "table",
        head: ["Situation", "Batch?"],
        rows: [
          ["High concurrency, latency budget above ~50ms", "**Yes** — the clearest win"],
          ["GPU inference", "**Always** — a GPU is idle at batch size 1"],
          ["Under ~10 requests per second", "No — batches of one, plus the wait"],
          ["Hard latency budget under 20ms", "No — the wait is a large fraction"],
          ["Variable input shapes", "Only with careful padding"]
        ]
      },
      { t: "p", text: "**A GPU at batch size 1 is running at a few percent of its capacity.** If you are paying for one, batching is not an optimisation — it is the reason to have it." },
      { t: "p", text: "**Handle cancellation.** A client that disconnects leaves a future nobody awaits; setting a result on a cancelled future raises, and the check costs one line." }
    ]},

    { t: "h2", n: "05", text: "The silent failures", id: "failures" },

    { t: "code", lang: "python", title: "monitoring that catches what 500s do not", code: `
# A model service has THREE health questions, and only the first is
# answered by ordinary monitoring.
#
#   1. Is it up?            -> error rate, latency          (14.3)
#   2. Is the INPUT normal? -> feature drift
#   3. Are the OUTPUTS ok?  -> prediction drift, and later, accuracy

# --- input drift: the world moved ---------------------------------
feature_summary = Histogram(
    "feature_value", "Feature values", ["feature"],
    buckets=(0, 10, 25, 50, 100, 250, 500, 1000),
)
# Compare weekly against the training distribution. A feature whose
# mean has shifted two standard deviations is a model predicting on
# data it never saw.

# --- output drift: the cheapest early warning ---------------------
prediction_score = Histogram("prediction_score", "Scores",
                             buckets=np.linspace(0, 1, 21).tolist())
# The score distribution should be roughly stable. If the mean
# predicted probability moves from 0.12 to 0.31 overnight, something
# upstream changed -- and you know BEFORE any label arrives.

# --- accuracy: correct, and always late ---------------------------
# For churn you learn the truth in 30 days; for fraud, in 60. Log
# every prediction with its input so it can be joined to the outcome
# when it arrives.
def log_prediction(features: Features, result: Prediction) -> None:
    predictions_table.insert({
        "prediction_id": result.prediction_id,
        "model_id": result.model_id,
        "features": features.model_dump(),   # the EXACT vector used
        "score": result.score,
        "predicted_at": result.predicted_at,
        "outcome": None,          # filled in when it is known
    })
`,
      hl: [6, 19, 27],
      caption: "**Output drift is the cheapest signal you will ever add.** It needs no labels, it moves within hours of an upstream change, and it catches most of what goes wrong before anyone can measure accuracy."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a model service",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This service handles 200 requests per second at p99 of 3.4 seconds, restarts under load, and the data science team says predictions look \"a bit off\" but cannot say why." },
        { t: "code", lang: "python", numbered: false, title: "app/serve.py", code: `
app = FastAPI()

@app.post("/predict")
async def predict(features: list[float]):
    model = joblib.load("/models/model.pkl")
    score = model.predict_proba([features])[0][1]
    logging.info(f"Predicted {score} for {features}")
    return {"score": score}

@app.get("/health")
def health():
    return {"ok": True}`},
        { t: "code", lang: "bash", numbered: false, title: "the deployment", code: `
CMD gunicorn app.serve:app -w 8 -k uvicorn.workers.UvicornWorker
resources: { limits: { cpu: "4", memory: "4Gi" } }
livenessProbe:  { httpGet: { path: /health } }
readinessProbe: { httpGet: { path: /health } }
# model.pkl is 180 MB`},
        { t: "p", text: "Diagnose all three symptoms and rewrite it. Explain the \"a bit off\" complaint precisely — it has a specific cause." }
      ],
      requirements: [
        "Explain the 3.4-second p99, quantified.",
        "Explain the restarts under load.",
        "Give the specific cause of \"predictions look a bit off\".",
        "Rewrite the service and the deployment.",
        "Add the monitoring that would have surfaced the third symptom.",
        "Estimate the improvement."
      ],
      hint: "Count how many times the model is loaded per second. And look very carefully at what the endpoint accepts.",
      solution: {
        lang: "python",
        title: "app/serve.py",
        code: `# =========================================================================
# SYMPTOM 1 -- p99 OF 3.4 SECONDS
# =========================================================================
#
# joblib.load ON EVERY REQUEST.
#
#   180 MB read from disk, deserialised, and allocated -- PER REQUEST.
#   Measured: ~1.5-3 seconds cold, ~0.8s from page cache.
#
#   At 200 rps that is 200 x 180 MB = 36 GB/s of allocation demanded
#   from a container with 4 GB. It cannot keep up, so requests queue
#   and the tail explodes.
#
# COMPOUNDING IT:
#
#   a) async def WITH BLOCKING WORK. joblib.load and predict_proba are
#      both CPU/IO-bound and synchronous, but the handler is declared
#      async -- so they run ON THE EVENT LOOP. One request blocks
#      every other request on that worker for its entire duration,
#      including the health probe (Lesson 12.7).
#
#   b) NO BLAS THREAD LIMIT. Each of 8 workers spawns 4 BLAS threads
#      (one per core), so 32 threads compete for 4 cores. Context
#      switching makes each prediction slower as concurrency rises --
#      the service gets worse precisely when it is busiest.
#
#   c) NO WARM-UP. The first prediction per worker pays lazy imports,
#      BLAS pool creation and page faults -- 10-100x the steady-state
#      cost, on a user's request, after every deploy.
#
#   d) SYNCHRONOUS LOGGING IN THE PATH, formatting the full feature
#      vector into a string on every call.
#
#
# =========================================================================
# SYMPTOM 2 -- RESTARTS UNDER LOAD
# =========================================================================
#
# MEMORY. Each concurrent request holds its own 180 MB copy of the
# model while joblib.load runs:
#
#   8 workers x 180 MB resident               = 1.44 GB baseline
#   + N in-flight loads x 180 MB              = unbounded
#   + peak during deserialisation (~2x)       = worse
#
#   Limit: 4 GB. Roughly 14 concurrent loads exhausts it.
#
#   At 200 rps with ~2s loads there are ~400 in flight. The container
#   is OOM-killed, Kubernetes restarts it, the new pod is immediately
#   hit with the same load and dies again -- a crash loop that looks
#   like an infrastructure problem.
#
# AND THE HEALTH PROBES MAKE IT WORSE:
#   /health returns {"ok": True} without touching the model, so a pod
#   that cannot serve a single prediction reports itself READY and is
#   sent traffic immediately (Lesson 14.3).
#
#
# =========================================================================
# SYMPTOM 3 -- "PREDICTIONS LOOK A BIT OFF"   <- the important one
# =========================================================================
#
#   async def predict(features: list[float]):
#
# THE ENDPOINT TAKES A POSITIONAL LIST OF NUMBERS.
#
# There is nothing anywhere -- not in the schema, not in the code,
# not in the response -- that says which number is which feature. The
# caller must send them in exactly the order the model was trained
# on, and NOTHING CHECKS THAT.
#
# So if the client sends:
#
#     [age, income, tenure_months, support_tickets]
#
# and the model was trained on:
#
#     [tenure_months, age, income, support_tickets]
#
# then every prediction is computed from an income value in the age
# column and a tenure value in the income column. The model returns a
# number between 0 and 1, the API returns 200, and the score is
# meaningless.
#
# IT IS "A BIT OFF" RATHER THAN OBVIOUSLY BROKEN because the features
# are correlated: a model given plausible-looking garbage still
# produces plausible-looking output. The distribution shifts slightly
# and nobody can point at a failure.
#
# THIS IS THE MOST COMMON SILENT FAILURE IN MODEL SERVING, and the
# only defence is named fields.
#
# THREE MORE CONTRIBUTORS TO THE SAME COMPLAINT:
#
#   e) NO RANGE VALIDATION. An age of 900 or a negative income is
#      accepted and extrapolated confidently.
#
#   f) NO MODEL ID IN THE RESPONSE. When a prediction is questioned,
#      there is no way to know which model version produced it.
#
#   g) NO PREDICTION LOG. features are logged as a formatted string
#      into application logs -- unqueryable, unjoinable to outcomes,
#      and impossible to compare against the training distribution.
#      So "a bit off" cannot be investigated at all.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

# ---- MUST come before numpy is imported. These are read at import
#      time, so setting them later has no effect (symptom 1b).
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
import onnxruntime as rt


class ModelBundle(NamedTuple):
    session: rt.InferenceSession
    card: dict
    feature_order: list[str]
    categories: dict[str, set[str]]


BUNDLE: ModelBundle | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global BUNDLE

    # LOAD ONCE (symptoms 1 and 2). ONNX also removes the pickle
    # dependency on sklearn versions (Lesson 15.6).
    card = json.loads(Path("/models/card.json").read_text())
    session = rt.InferenceSession(
        "/models/model.onnx",
        sess_options=_single_threaded_options(),
        providers=["CPUExecutionProvider"],
    )
    BUNDLE = ModelBundle(
        session=session,
        card=card,
        feature_order=card["feature_columns"],   # the CONTRACT
        categories={k: set(v) for k, v in card["categories"].items()},
    )

    # WARM UP (symptom 1c). Pay the first-call cost here.
    for _ in range(3):
        _infer(BUNDLE, np.zeros((1, len(BUNDLE.feature_order)),
                                dtype=np.float32))
    logger.info("model_loaded", extra={"model_id": card["model_id"]})

    yield
    BUNDLE = None


def _single_threaded_options() -> rt.SessionOptions:
    """One thread per session. With 8 workers on 4 cores, letting each
    session spawn its own pool is the oversubscription in symptom 1b."""
    opts = rt.SessionOptions()
    opts.intra_op_num_threads = 1
    opts.inter_op_num_threads = 1
    return opts


app = FastAPI(lifespan=lifespan)


# ---- the input contract (symptom 3) -------------------------------

class Features(BaseModel):
    """NAMED fields. The ordering bug becomes impossible: the service
    assembles the vector in the model's order, from names."""

    model_config = ConfigDict(extra="forbid")   # a renamed field is
                                                # an error, not silence

    age: int = Field(ge=18, le=120)
    income: float = Field(ge=0, le=10_000_000)
    tenure_months: int = Field(ge=0, le=600)
    support_tickets: int = Field(ge=0, le=1000)
    country: str = Field(min_length=2, max_length=56)
    plan: Literal["basic", "pro", "enterprise"]

    @field_validator("country")
    @classmethod
    def seen_in_training(cls, v: str) -> str:
        # An unseen category one-hot encodes to all zeros, which is a
        # valid vector and a meaningless prediction. Reject it rather
        # than returning a confident number.
        if BUNDLE and v not in BUNDLE.categories["country"]:
            raise ValueError(f"country {v!r} was not seen during training")
        return v


class Prediction(BaseModel):
    prediction_id: UUID
    score: float = Field(ge=0, le=1)
    model_id: str            # symptom 3f -- traceability
    model_version: str
    predicted_at: datetime


# ---- the endpoint --------------------------------------------------

@app.post("/predict", response_model=Prediction)
def predict(                            # def, NOT async def (1a):
    features: Features,                 # inference is CPU-bound, so
    background: BackgroundTasks,        # FastAPI runs this in a
) -> Prediction:                        # threadpool and the loop
    if BUNDLE is None:                  # stays free
        raise HTTPException(503, "Model not loaded")

    # Assemble in the MODEL'S order, from NAMED fields. This is the
    # line that fixes symptom 3, and it cannot be got wrong.
    vector = np.array(
        [[getattr(features, name) for name in BUNDLE.feature_order]],
        dtype=np.float32,
    )

    with prediction_latency.time():
        score = _infer(BUNDLE, vector)

    result = Prediction(
        prediction_id=uuid4(),
        score=score,
        model_id=BUNDLE.card["model_id"],
        model_version=BUNDLE.card["version"],
        predicted_at=utcnow(),
    )

    # Observability, AFTER the response (symptom 1d and 3g).
    prediction_score_hist.observe(score)
    for name in MONITORED_FEATURES:
        feature_hist.labels(feature=name).observe(getattr(features, name))
    background.add_task(log_prediction, features, result)

    return result


def log_prediction(features: Features, result: Prediction) -> None:
    """A QUERYABLE table, not a log line. This is what makes 'a bit
    off' investigable: the exact input, the exact model, and a slot
    for the outcome when it arrives weeks later."""
    predictions_table.insert({
        "prediction_id": str(result.prediction_id),
        "model_id": result.model_id,
        "features": features.model_dump(),
        "score": result.score,
        "predicted_at": result.predicted_at,
        "outcome": None,
    })


# ---- health (symptom 2) --------------------------------------------

@app.get("/health/live", include_in_schema=False)
def live() -> dict:
    """Process only. A model that fails to load must not cause an
    endless restart loop -- that is what readiness is for."""
    return {"status": "ok"}


@app.get("/health/ready", include_in_schema=False)
def ready() -> JSONResponse:
    """A pod without a loaded model must NOT receive traffic. The
    original returned {"ok": true} regardless."""
    if BUNDLE is None:
        return JSONResponse({"status": "loading"}, status_code=503)
    return JSONResponse({"status": "ready",
                         "model_id": BUNDLE.card["model_id"]})


# =========================================================================
# THE DEPLOYMENT
# =========================================================================
#
# CMD ["gunicorn", "app.serve:app", \\
#      "--worker-class", "uvicorn.workers.UvicornWorker", \\
#      # 4 cores, CPU-bound inference: one worker per core, not 8.
#      "--workers", "4", \\
#      # PRELOAD: the model loads once in the master and is shared
#      # copy-on-write. 180 MB total instead of 4 x 180 MB.
#      # Safe here because the ONNX session is created in lifespan,
#      # which runs per worker (Lesson 14.8).
#      "--preload", \\
#      "--graceful-timeout", "30", "--timeout", "60", \\
#      "--bind", "0.0.0.0:8000"]
#
# resources:
#   requests: { cpu: "2", memory: "2Gi" }
#   limits:   { cpu: "4", memory: "4Gi" }
#
# # A 180 MB model takes ~15s to load. A 10s liveness probe kills the
# # pod before it is ever ready -- the classic model-serving restart
# # loop.
# startupProbe:
#   httpGet: { path: /health/live, port: 8000 }
#   failureThreshold: 30
#   periodSeconds: 5              # 150 seconds allowed
#
# livenessProbe:
#   httpGet: { path: /health/live, port: 8000 }
#   periodSeconds: 10
#
# readinessProbe:
#   httpGet: { path: /health/ready, port: 8000 }   # model-aware
#   periodSeconds: 5
#
#
# =========================================================================
# THE MONITORING THAT WOULD HAVE SURFACED SYMPTOM 3
# =========================================================================
#
# The feature-order bug produces NO errors. Only distributions reveal
# it, and two checks would have caught it within a day:
#
# 1. FEATURE DISTRIBUTIONS vs TRAINING.
#      The "age" feature receiving income values has a mean of 52,000
#      against a training mean of 41. That is not a subtle drift; it
#      is visible on the first chart anyone looks at.
#
#      @cron("0 * * * *")
#      def check_feature_drift():
#          for name in MONITORED_FEATURES:
#              observed = recent_feature_mean(name, hours=1)
#              expected = card["feature_stats"][name]["mean"]
#              sd = card["feature_stats"][name]["std"]
#              if abs(observed - expected) > 3 * sd:
#                  alert(f"{name}: mean {observed:.1f} vs training "
#                        f"{expected:.1f} +/- {sd:.1f}")
#
# 2. PREDICTION DISTRIBUTION.
#      No labels needed, and it moves within hours of any upstream
#      change. A mean predicted probability jumping from 0.12 to 0.31
#      is the cheapest early warning available.
#
# 3. ACCURACY, when outcomes arrive (30-60 days). Correct, and far
#      too late to be the primary signal -- which is why 1 and 2
#      exist.
#
#
# =========================================================================
# EXPECTED IMPROVEMENT
# =========================================================================
#
#                        before          after
#   model loads/sec      200             0 (once at startup)
#   p50 latency          ~900 ms         ~6 ms
#   p99 latency          3,400 ms        ~25 ms
#   memory               OOM at ~14      ~700 MB steady
#                        concurrent
#   restarts under load  constant        none
#   feature ordering     unchecked       impossible to get wrong
#   traceability         none            model_id on every response
#   drift detection      none            hourly
#
# The latency numbers are dominated by removing the per-request
# joblib.load. ONNX and the thread limits account for the rest.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_the_model_is_loaded_once():
    """Symptom 1. The whole latency problem in one assertion."""
    with mock.patch("onnxruntime.InferenceSession") as ctor:
        with TestClient(app):
            for _ in range(100):
                client.post("/predict", json=valid_features())

    assert ctor.call_count == 1


def test_features_are_assembled_by_name_not_position():
    """Symptom 3. Sending fields in a different JSON order must give
    an identical result -- the original would not."""
    body = valid_features()
    shuffled = dict(reversed(list(body.items())))

    a = client.post("/predict", json=body).json()["score"]
    b = client.post("/predict", json=shuffled).json()["score"]

    assert a == b


def test_a_renamed_field_is_rejected():
    """extra="forbid". Otherwise the model silently gets a default."""
    body = valid_features()
    body["annual_income"] = body.pop("income")

    assert client.post("/predict", json=body).status_code == 422


def test_out_of_range_values_are_rejected():
    for field, value in [("age", 900), ("income", -5),
                         ("tenure_months", 9999)]:
        body = valid_features() | {field: value}
        assert client.post("/predict", json=body).status_code == 422


def test_an_unseen_category_is_rejected_not_extrapolated():
    """All-zeros is a valid vector and a meaningless prediction."""
    body = valid_features() | {"country": "Atlantis"}

    r = client.post("/predict", json=body)

    assert r.status_code == 422
    assert "not seen during training" in r.text


def test_readiness_fails_while_the_model_is_loading():
    """Symptom 2. The original said ok before it could serve."""
    with model_not_loaded():
        assert client.get("/health/ready").status_code == 503
        assert client.get("/health/live").status_code == 200


def test_every_response_identifies_the_model():
    r = client.post("/predict", json=valid_features()).json()

    assert r["model_id"] == CURRENT_MODEL_ID
    assert UUID(r["prediction_id"])


def test_predictions_are_logged_to_a_queryable_table():
    """Symptom 3g. Without this, 'a bit off' cannot be investigated."""
    r = client.post("/predict", json=valid_features()).json()

    row = predictions_table.get(r["prediction_id"])
    assert row["features"] == valid_features()
    assert row["model_id"] == r["model_id"]


def test_latency_stays_bounded_under_concurrency():
    """The thread-oversubscription regression: without the BLAS
    limits, per-request latency RISES with concurrency."""
    solo = measure_p99(concurrency=1, n=100)
    loaded = measure_p99(concurrency=50, n=1000)

    assert loaded < solo * 3, f"p99 {solo:.0f}ms -> {loaded:.0f}ms"`,
        notes: [
          { t: "p", text: "**`joblib.load` per request is the entire latency and memory story.** 180MB deserialised on every call, at 200 requests per second, demands 36GB/s of allocation from a 4GB container — the queueing produces the 3.4-second tail and the memory produces the crash loop." },
          { t: "p", text: "**The \"a bit off\" complaint is `features: list[float]`.** Nothing records which number is which feature, so a caller sending a different order gets income evaluated as age — and because the features are correlated, the model returns plausible-looking output rather than obvious nonsense." },
          { t: "callout", kind: "insight", title: "Why the positional bug is so hard to notice", body: [
            { t: "p", text: "A model given plausible garbage produces plausible predictions. The score distribution shifts a little, accuracy degrades a little, and no request fails — so the only signal is a distribution comparison nobody is running." },
            { t: "p", text: "Assembling the vector from named fields in the model's own recorded order makes the failure structurally impossible, which is better than any amount of monitoring for it." }
          ]},
          { t: "p", text: "**`async def` with synchronous inference blocks the event loop**, so one request stalls every other on that worker — including the health probe, which is part of why the pod fails its checks under load." },
          { t: "p", text: "**The BLAS thread setting must be applied before numpy is imported.** Eight workers each spawning four threads on four cores means latency rises with concurrency, which reads as a capacity problem and gets \"solved\" by adding pods that make it worse." },
          { t: "p", text: "**`/health` returning `{\"ok\": true}` without checking the model** means a pod reports itself ready before it can serve anything, so traffic arrives at a pod that will immediately fail. A model-aware readiness probe plus a `startupProbe` generous enough for a 15-second load fixes both halves." },
          { t: "p", text: "**Feature-distribution monitoring would have caught symptom 3 within a day.** An age feature receiving income values has a mean of 52,000 against a training mean of 41 — not a subtle drift, and visible on the first chart anyone plots." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A recommendation service was refactored, and a feature-engineering function changed the order of two columns. Every test passed — the tests checked that predictions were returned, not what they were." },
      { t: "p", text: "**Click-through rate fell 12% over three weeks.** No errors, no alerts, no latency change. The drop was attributed to seasonality, then to a competitor, then to the new UI, and investigated by three teams." },
      { t: "p", text: "**A feature-distribution monitor would have shown it on day one.** One column's mean had moved by two orders of magnitude, which no amount of seasonality explains." },
      { t: "p", text: "**Model services fail silently by default.** Error rate and latency tell you the API is healthy; only the distribution of inputs and outputs tells you the model is." }
    ]}
  ],

  takeaways: [
    "**Load the model once in `lifespan`, and warm it up.** Per-request loading is a latency and memory catastrophe; lazy loading races across workers and passes readiness before it can serve.",
    "**With gunicorn `--preload`, the model loads once and is shared copy-on-write** — 180MB instead of eight copies.",
    "**Readiness must be model-aware**, or a pod that cannot serve reports itself ready and receives traffic.",
    "**Use a `startupProbe`.** A model that takes 15 seconds to load fails a 10-second liveness probe and enters a restart loop.",
    "**Never accept a positional list of features.** Named fields, assembled in the model's recorded order, make the ordering bug impossible.",
    "**Set `extra=\"forbid\"`**, or a renamed field silently becomes an imputed default and a plausible wrong answer.",
    "**Validate ranges and categories against training**, since an unseen category one-hot encodes to all zeros — a valid vector and a meaningless prediction.",
    "**Return the model id with every prediction**, or a questioned result cannot be traced to a version.",
    "**Set BLAS thread limits before importing numpy.** Oversubscription makes latency rise with load, which reads as a capacity problem.",
    "**Use `def`, not `async def`.** Inference is CPU-bound and blocks the event loop.",
    "**Measure where the latency goes before optimising the model** — it is often 20% of the budget.",
    "**Batch when requests arrive concurrently**, with a deadline bounding the added wait. On a GPU, batching is the reason to have one.",
    "**Compute features once, in code both training and serving use.** Training-serving skew degrades quality without failing anything.",
    "**Monitor input and output distributions.** Error rate says the API is healthy; only distributions say the model is."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An endpoint takes `features: list[float]` and the data team reports predictions are \"a bit off\". What is the likely cause?",
        options: [
          "Floating-point precision in the JSON encoding",
          "Positional features — a caller sending them in a different order gets a confident wrong prediction, and nothing checks the order",
          "The model needs retraining",
          "The list should be a numpy array"
        ],
        answer: 1,
        why: "Because features are correlated, a model given plausible garbage produces plausible output rather than obvious nonsense — so nothing fails and the degradation looks like drift. Named fields assembled in the model's recorded order make it structurally impossible."
      },
      {
        stem: "`joblib.load` runs inside the request handler for a 180MB model at 200 rps. What happens?",
        options: [
          "The OS page cache makes it cheap after the first call",
          "Each request deserialises 180MB, so the container is OOM-killed and requests queue into a multi-second tail",
          "Only the first request per worker is slow",
          "joblib caches the loaded object automatically"
        ],
        answer: 1,
        why: "Page cache helps the disk read, not the deserialisation or the allocation. Loading once in `lifespan` — with `--preload` so workers share it copy-on-write — turns 200 loads per second into one at startup."
      },
      {
        stem: "Eight gunicorn workers on four cores, each with default BLAS threading. What is the symptom?",
        options: [
          "Memory grows unbounded",
          "Latency gets worse as concurrency rises, because 32 threads contend for 4 cores",
          "Predictions become non-deterministic",
          "The model fails to load"
        ],
        answer: 1,
        why: "It reads as a capacity problem, so teams add pods — which adds workers, adds threads, and makes it worse. `OMP_NUM_THREADS=1` and its siblings must be set before numpy is imported, because the values are read at import time."
      },
      {
        stem: "Which monitoring signal detects a feature-ordering bug fastest?",
        options: [
          "Error rate and p99 latency",
          "Feature distributions compared against the training set — an age feature receiving income values has an obviously wrong mean",
          "Model accuracy against realised outcomes",
          "Request throughput"
        ],
        answer: 1,
        why: "The bug produces no errors and no latency change, so ordinary monitoring is silent. Accuracy is the correct signal and arrives 30 to 60 days later; input and output distributions move within hours and need no labels at all."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you serve a machine-learning model?",
        strong: "Load once in lifespan with a warm-up, named and range-validated input, `def` handlers so inference runs in a threadpool, BLAS threads pinned to one, and the model id on every response.",
        answer: [
          { t: "p", text: "Leading with load-once and warm-up shows you have watched a first request time out after every deploy." },
          { t: "p", text: "The named-input point is where the real risk is, and framing it as preventing a silent failure rather than as validation hygiene shows why." },
          { t: "p", text: "The BLAS thread detail is a strong specific — it is invisible in code review and it makes a service degrade under exactly the load it was scaled for." }
        ]
      },
      {
        level: "advanced",
        q: "How do you know a deployed model is working?",
        strong: "Not from error rate. Feature distributions against training, prediction-score distribution over time, and eventually accuracy when outcomes arrive — the first two need no labels and move within hours.",
        answer: [
          { t: "p", text: "Separating \"the API is healthy\" from \"the model is healthy\" is the distinction the question is testing." },
          { t: "p", text: "Output drift as the cheapest early warning is a practical detail, since it requires no labels and no training-set comparison." },
          { t: "p", text: "Acknowledging that accuracy is correct but arrives too late to be the primary signal shows you have operated one of these." }
        ]
      },
      {
        level: "advanced",
        q: "When would you batch predictions?",
        strong: "When requests arrive concurrently and the latency budget can absorb a short wait. On a GPU, always — batch size 1 uses a few percent of the hardware. Below ten requests per second, batching adds latency for nothing.",
        answer: [
          { t: "p", text: "Naming the condition — concurrent arrivals — rather than treating batching as universally good shows judgement." },
          { t: "p", text: "The deadline that bounds the added latency is the implementation detail that matters; without it a quiet period means an unbounded wait." },
          { t: "p", text: "Mentioning cancelled futures from disconnected clients is a small correctness point that suggests you have written one." }
        ]
      }
    ]
  }
});

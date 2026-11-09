/* ============================================================================
   LESSON 12.4 — The Optimisation Ladder
   ========================================================================= */
EC.receiveLesson({
  id: "12.4",

  lede: "The previous three lessons each found one cause of slowness. This one puts the fixes in order. Fix the pipeline around the model, batch, cache, scale out, and only then make the model itself smaller. That is the order of payoff per unit of risk: the early rungs change no predictions, and the last one changes the model. The lesson climbs the ladder on the churn service from lesson 12.1, measuring each rung, then turns the module's findings into a triage function from symptom to first action, and names the optimisations that reliably make things worse.",

  objectives: [
    "Apply the ladder in order and measure each rung's gain",
    "Explain why model compression comes last",
    "Map a symptom to its first action with a tested triage function",
    "Recognise the optimisations that usually make latency worse"
  ],

  prerequisites: ["12.1", "12.2", "12.3"],

  blocks: [
    { t: "h2", n: "01", id: "ladder", text: "Climbing the ladder", sub: "One service, each rung measured" },
    { t: "p",
      text: "The script takes the churn model from lesson 12.1 and measures the cost per prediction at each rung, on a Zipf-distributed stream of customer requests: the service as built; with the compiled transform; with requests batched 32 at a time; with an LRU cache of 10,000 customers in front; then the same batched work across one and four processes; and finally a compressed model." },
    { t: "code",
      lang: "python",
      title: "ladder.py — five rungs, measured in order",
      code: `import multiprocessing as mp, pickle, sqlite3, time
from collections import OrderedDict
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from svc_common import CAT, DB, MODEL, NUM, REQ

pipe = pickle.loads(MODEL.read_bytes()); pre, model = pipe.named_steps["pre"], pipe.named_steps["model"]
sc, oh = pre.named_transformers_["num"], pre.named_transformers_["cat"]
idx = [{c: i for i, c in enumerate(cs)} for cs in oh.categories_]; offs = np.cumsum([0] + [len(c) for c in oh.categories_])[:-1]
NN, NC = len(sc.mean_), int(sum(len(c) for c in oh.categories_))
rows = sqlite3.connect(DB).execute(f"SELECT {', '.join(NUM + CAT)} FROM features").fetchall()   # in memory: the lookup is not the subject here
rng = np.random.default_rng(3)
w = 1 / np.arange(1, len(rows) + 1) ** 1.0; w /= w.sum()
stream = rng.choice(len(rows), 4_000, p=w)                         # which customers are asked about, Zipf-like

def compiled(batch_rows):
    X = np.zeros((len(batch_rows), NN + NC))
    X[:, :NN] = (np.array([list(r[:len(NUM)]) + [12.5, 7] for r in batch_rows], float) - sc.mean_) / sc.scale_
    for i, r in enumerate(batch_rows):
        for j, v in enumerate(r[len(NUM):]):
            k = idx[j].get(v)
            if k is not None: X[i, NN + offs[j] + k] = 1.0
    return X

def per_item(fn, n=1_000):
    t = time.perf_counter(); fn(stream[:n]); return (time.perf_counter() - t) / n * 1000

def baseline(ids):
    for i in ids: model.predict_proba(pre.transform(pd.DataFrame([list(rows[i]) + [12.5, 7]], columns=NUM + CAT + REQ)))
def fixed(ids):
    for i in ids: model.predict_proba(compiled([rows[i]]))
def batched(ids, size=32):
    for s in range(0, len(ids), size): model.predict_proba(compiled([rows[i] for i in ids[s:s + size]]))
def cached(ids, size=32):
    cache = OrderedDict(); misses = []
    for i in ids:
        if i in cache: cache.move_to_end(i)
        else: misses.append(i); cache[i] = None
        if len(cache) > 10_000: cache.popitem(last=False)
    batched(misses, size); return len(misses)

def worker(_):
    t = time.perf_counter(); batched(stream[:2_000]); return 2_000 / (time.perf_counter() - t)
if __name__ == "__main__":
    steps = [("0. as built", baseline), ("1. fix the pipeline", fixed), ("2. + batch 32", batched), ("3. + cache", cached)]
    print(f"{'step':<24}{'ms per prediction':>18}{'speed-up':>10}")
    base = per_item(baseline)
    for name, fn in steps:
        t = per_item(fn); print(f"{name:<24}{t:>18.3f}{base / t:>9.0f}x")
    print(f"   (cache hit rate on this stream: {1 - cached(stream[:1000]) / 1000:.0%})")
    for procs in (1, 4):
        with mp.Pool(procs) as p: rates = p.map(worker, range(procs))
        print(f"4. scale out on one machine: {procs} process(es): {sum(rates):>9,.0f} predictions/s")

    # 5. Compress the model: far fewer trees. Measure what it costs as well as what it saves.
    data = pd.DataFrame(rows, columns=NUM + CAT).sample(30_000, random_state=1); data["session_minutes"] = 12.5; data["pages"] = 7
    y = (data.usage_0 / 20 - data.tickets_90d / 15 + (data.plan == "pro") * 0.8 + rng.normal(0, 1, len(data)) > 0.7).astype(int)
    Xall = pre.transform(data[NUM + CAT + REQ]); tr, te = slice(0, 20_000), slice(20_000, None)
    for label, kw in (("as trained (early stopping)", dict(max_iter=200)), ("compressed to 15 trees", dict(max_iter=15, early_stopping=False))):
        m = HistGradientBoostingClassifier(random_state=0, **kw).fit(Xall[tr], y[tr])
        X1 = Xall[te][:1]; t = time.perf_counter()
        for _ in range(300): m.predict_proba(X1)
        print(f"5. {label:<28} {m.n_iter_:>3} trees: {(time.perf_counter() - t) / 300 * 1000:.3f} ms per row, "
              f"AUC {roc_auc_score(y[te], m.predict_proba(Xall[te])[:, 1]):.4f}")`,
      out: `step                     ms per prediction  speed-up
0. as built                          3.184        1x
1. fix the pipeline                  0.475        6x
2. + batch 32                        0.019      159x
3. + cache                           0.010      316x
   (cache hit rate on this stream: 39%)
4. scale out on one machine: 1 process(es):    54,322 predictions/s
4. scale out on one machine: 4 process(es):    75,123 predictions/s
5. as trained (early stopping)   50 trees: 0.508 ms per row, AUC 0.8603
5. compressed to 15 trees        15 trees: 0.202 ms per row, AUC 0.8617` },
    { t: "viz",
      title: "Cost per prediction, rung by rung",
      caption: "The first three rungs took the cost from 3.2 ms to 0.01 ms, over 300 times cheaper, without changing a single prediction.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="180" y="31.0" text-anchor="end" class="s-label">0. as built</text>
<rect x="190" y="14" width="395.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">3.184 ms</text>
<text x="180" y="69.0" text-anchor="end" class="s-label">1. fix the pipeline</text>
<rect x="190" y="52" width="58.9" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="256.9" y="69.0" class="s-sub">0.475 ms  (6x)</text>
<text x="180" y="107.0" text-anchor="end" class="s-label">2. + batch 32</text>
<rect x="190" y="90" width="2.4" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="200.4" y="107.0" class="s-sub">0.019 ms  (159x)</text>
<text x="180" y="145.0" text-anchor="end" class="s-label">3. + cache</text>
<rect x="190" y="128" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="200.0" y="145.0" class="s-sub">0.010 ms  (316x)</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Fix the pipeline: 6×",
          def: "Replacing the per-request DataFrame and generic transformer with compiled arrays (lesson 12.1) took 3.18 ms to 0.48 ms." },
        { term: "Batch: another 25×",
          def: "Scoring 32 rows per call shared every fixed cost, reaching 0.019 ms per prediction. In a live service that needs a dynamic batcher (lesson 12.3)." },
        { term: "Cache: another 2×",
          def: "39% of this stream's requests repeated a recent customer, so the cache halved the remaining work. Its value is its hit rate, nothing more." },
        { term: "Scale out: 1.4× on one machine",
          def: "Four processes served 75,000 predictions a second against 54,000 for one, because batched prediction already used several cores. Scaling out pays most across machines, and for queueing (lesson 12.2)." },
        { term: "Compress last",
          def: "Cutting the model from 50 trees to 15 made it 2.5 times faster with no loss of AUC on this simple target, but at rung 0 that saved 0.3 ms of a 3.2 ms request. Compression is worth considering only after the other rungs make the model the dominant cost, and its accuracy must be measured every time." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Optimisations that usually make things worse",
      body: [
        { t: "p",
          text: "A longer batching wait: 20 ms was slower than 5 ms at every load in lesson 12.3. Lowering the autoscaling target while replicas load lazily: more scale-outs, more cold starts (lesson 12.2). A GPU for a model that is 11% of the request (lesson 12.1). A cache keyed on per-session values, which costs memory and hits nothing. Each looks like a performance change and is a guess." }
      ] },
    { t: "h2", n: "02", id: "triage", text: "From symptom to first action", sub: "The module as a decision" },
    { t: "table",
      head: ["Symptom", "First action", "Lesson"],
      rows: [
        ["Memory grows; latency resets on deploy", "Find the leak; bound the collection", "12.3"],
        ["Slow requests just after new replicas", "Eager load, warm-up, readiness probe", "12.2"],
        ["Tail grows with utilisation above ~70%", "Add capacity or batch", "12.2, 12.3"],
        ["One non-model stage dominates", "Fix the pipeline, with an equality test", "12.1"],
        ["Model dominates, inputs repeat", "Prediction cache keyed on inputs and version", "12.3"],
        ["Model dominates, inputs unique", "Batch; compress only if it still dominates", "12.3, 12.4"],
        ["Nothing measured", "Instrument stages first", "12.1"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A triage function, tested on the module's cases",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Encode the table above as a function from a set of symptoms (p99, stage shares, utilisation, scale-event clustering, memory growth, reset-on-deploy, cache hit rate) to a first action. Test it on the seven situations measured in lessons 12.1 to 12.4, each with the action that lesson found." }
      ],
      requirements: [
        "A Symptoms record with the fields above",
        "Rules in order of urgency: leaks and cold starts before capacity, capacity before pipeline work",
        "A cache recommendation only with a meaningful hit rate",
        "All seven cases passing"
      ],
      hint: "Order matters: a leaking service at high utilisation still needs the leak fixed first, or added capacity just leaks too.",
      solution: { lang: "python",
        title: "triage.py",
        code: `from dataclasses import dataclass, field

@dataclass
class Symptoms:
    p99_ms: float
    stage_share: dict = field(default_factory=dict)      # share of median latency by stage
    utilisation: float = 0.5                             # busiest replica
    slow_after_scale_event: bool = False                 # slow requests cluster within a minute of new replicas
    memory_growth_mb_per_hour: float = 0.0
    latency_resets_on_deploy: bool = False
    cache_hit_rate: float | None = None

def triage(s: Symptoms) -> str:
    """The first action, in order of payoff per unit of risk."""
    if s.memory_growth_mb_per_hour > 5 or s.latency_resets_on_deploy:
        return "find the leak: diff allocation snapshots, bound the collection"
    if s.slow_after_scale_event:
        return "fix cold starts: eager load, warm-up, readiness probe"
    if s.utilisation > 0.7:
        return "add capacity: scale out or batch, before touching the model"
    if s.stage_share:
        stage, share = max(s.stage_share.items(), key=lambda kv: kv[1])
        if stage != "model" and share > 0.3:
            return f"fix the pipeline: '{stage}' is {share:.0%} of the request"
        if stage == "model":
            if s.cache_hit_rate is not None and s.cache_hit_rate > 0.3:
                return "add a prediction cache keyed on model inputs and version"
            return "batch requests; compress the model only if it still dominates"
    return "measure stages first"

# The cases measured in this module, with the action each lesson found.
cases = [
    ("12.1 service as built", Symptoms(14.8, {"transform": 0.58, "http": 0.27, "model": 0.11}), "fix the pipeline"),
    ("12.2 evening peak", Symptoms(389, utilisation=0.91), "add capacity"),
    ("12.2 morning scale-out", Symptoms(1571, utilisation=0.4, slow_after_scale_event=True), "fix cold starts"),
    ("12.3 leaking handler", Symptoms(5.9, memory_growth_mb_per_hour=40, latency_resets_on_deploy=True), "find the leak"),
    ("after 12.1's fix, Zipf traffic", Symptoms(3.0, {"model": 0.55, "http": 0.35}, cache_hit_rate=0.8), "add a prediction cache"),
    ("after 12.1's fix, unique inputs", Symptoms(3.0, {"model": 0.55, "http": 0.35}, cache_hit_rate=0.12), "batch requests"),
    ("nothing instrumented yet", Symptoms(80.0), "measure stages first"),
]
ok = 0
for name, s, expected in cases:
    action = triage(s); good = action.startswith(expected); ok += good
    print(f"{'ok ' if good else 'BAD'} {name:<32} -> {action}")
print(f"\\n{ok} of {len(cases)} cases match the measured first action")`,
        out: `ok  12.1 service as built            -> fix the pipeline: 'transform' is 58% of the request
ok  12.2 evening peak                -> add capacity: scale out or batch, before touching the model
ok  12.2 morning scale-out           -> fix cold starts: eager load, warm-up, readiness probe
ok  12.3 leaking handler             -> find the leak: diff allocation snapshots, bound the collection
ok  after 12.1's fix, Zipf traffic   -> add a prediction cache keyed on model inputs and version
ok  after 12.1's fix, unique inputs  -> batch requests; compress the model only if it still dominates
ok  nothing instrumented yet         -> measure stages first

7 of 7 cases match the measured first action`,
        notes: [
          { t: "p",
            text: "All seven cases matched the action their lesson measured. The order of the rules carries most of the judgement: leaks and cold starts come first because other fixes make them worse; capacity comes before pipeline work under load, because queueing multiplies whatever the stages cost." },
          { t: "p",
            text: "The point of writing it down is the last case: with no stage timings, the only defensible first action is to measure. A team's runbook should start there too." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the quantised model that saved 4%",
      body: [
        { t: "p",
          text: "**Symptom.** A team spent three weeks quantising and distilling a text classifier to meet a 50 ms p99 target, accepted a 1.5-point accuracy drop, and p99 fell from 74 ms to 71 ms." },
        { t: "p",
          text: "**Mechanism.** The model had been 9 ms of the request. Tokenisation ran in pure Python per request, features were fetched in three sequential calls, and the endpoint ran at 85% utilisation at peak. None of that was touched." },
        { t: "p",
          text: "**Fix.** The team restored the original model, switched to a fast tokenizer, parallelised the feature calls and added a replica: p99 fell to 31 ms. Performance work now starts from a stage breakdown and a utilisation graph, and model changes need a measured case that the model is the bottleneck." }
      ] }
  ],

  takeaways: [
    "The ladder: **fix the pipeline, batch, cache, scale out, then compress**, in order of payoff per unit of risk.",
    "Measured on one service: pipeline fix **6×**, batching to **159×**, cache to **316×**, none changing a prediction.",
    "A cache was worth its hit rate: **39%** here halved the remaining work.",
    "Scaling out on one machine gave **1.4×** because batched prediction already used several cores.",
    "Compression saved **0.3 ms** of a **3.2 ms** request at the start; it belongs at the end, with accuracy measured.",
    "Longer batch waits, lower autoscaling targets with lazy loading, GPUs for small models and per-session cache keys usually make things worse.",
    "Triage in order: leaks and cold starts, then capacity, then pipeline, then the model.",
    "With nothing measured, the first action is to measure."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why does model compression come last on the ladder?",
        options: [
          "It is the hardest to implement of all the rungs",
          "It changes predictions, and usually targets a small share",
          "Platforms do not support compressed models well",
          "Compressed models can no longer be batched or cached at all"
        ],
        answer: 1,
        why: "The earlier rungs change no predictions and attack larger shares; compression risks accuracy and here saved 0.3 ms of 3.2. It is not uniquely hard, is well supported, and compressed models batch and cache normally." },
      { stem: "Four processes on one machine served only 1.4× the predictions of one. Why?",
        options: [
          "The cache was shared badly between the processes",
          "Batched prediction already used several cores",
          "Python processes cannot run truly in parallel",
          "The model was too large to load four times"
        ],
        answer: 1,
        why: "Each process's batched predict_proba already spread work over cores, so extra processes competed for the same CPUs. Processes do run in parallel, there was no shared cache in that test, and the model fits easily." },
      { stem: "A service leaks memory and runs at 90% utilisation. What comes first?",
        options: [
          "Add replicas to bring utilisation down",
          "Find and fix the leak, then add capacity",
          "Compress the model to free some memory",
          "Raise the memory limit on every single pod right away"
        ],
        answer: 1,
        why: "Added replicas leak too, and a bigger limit only delays the crash; compression does not touch the leaking structure. Fix the leak, then size capacity." },
      { stem: "Which change is most likely to make p99 worse rather than better?",
        options: [
          "Compiling a slow per-request transform step",
          "A batching wait raised from 5 ms to 20 ms",
          "Adding one replica at 85% utilisation",
          "Loading the model before readiness passes"
        ],
        answer: 1,
        why: "In lesson 12.3 a 20 ms wait was worse than 5 ms at every load. The other three each improved latency in this module's measurements." }
    ] },

  interview: { title: "In an interview",
    sub: "Order your answer by payoff and risk.",
    questions: [
      { level: "core",
        q: "You have a week to make a model endpoint faster. How do you spend it?",
        strong: "A strong answer measures first and climbs the ladder in order, with equality tests.",
        answer: [
          { t: "p",
            text: "Day one: stage timings and a utilisation graph. Then, in order: fix whatever non-model stage dominates (with a test that predictions are unchanged), add dynamic batching if traffic allows, add a cache if inputs repeat, add capacity if utilisation is high, and fix cold starts if the tail follows scale events. Only if the model is then the dominant cost would I compress it, measuring accuracy against the current model. Re-measure after each change, since the largest term moves." }
        ] },
      { level: "advanced",
        q: "When is model compression the right first move?",
        strong: "A strong answer names the conditions and the checks.",
        answer: [
          { t: "p",
            text: "When measurements show the model is most of the latency or cost, the pipeline is already lean, batching is in place or impossible, and capacity is not the constraint, for example a large model on a GPU where memory limits batch size, or on-device inference. Even then, compare accuracy and calibration against the current model on recent data, and check segments, since compression often hurts rare cases first." }
        ] },
      { level: "core",
        q: "Name an optimisation that often makes latency worse, and why.",
        strong: "A strong answer gives a mechanism, not a slogan.",
        answer: [
          { t: "p",
            text: "A long dynamic-batching wait: at light load every request waits for company that does not come, and under load batches fill anyway, so the extra wait only adds latency; 20 ms was worse than 5 ms at every load measured. Similarly, lowering the autoscaling target when replicas load lazily creates more cold starts than the queueing it removes." }
        ] }
    ] }
});

/* ============================================================================
   LESSON 13.3 — Training, Inference and Serving
   ========================================================================= */
EC.receiveLesson({
  id: "13.3",

  lede: "A model is useful only once it answers requests: in time, at a cost the product can afford, and with the version you meant to deploy. This lesson covers the three decisions that turn a trained model into a system. Train on one machine or many, and what the network does to the speed-up. Score in advance in batch, or on request online. And when serving online, how to fit the latency budget: dynamic batching, smaller models through distillation or quantisation, and caching. Each is measured, and two of the results are less flattering than the usual advice.",

  objectives: [
    "Estimate data-parallel training efficiency from model size, compute time and interconnect",
    "Choose batch, online or hybrid inference from freshness, cost and traffic shape",
    "Tune dynamic batching against a latency objective",
    "Judge distillation and model compression by measuring accuracy and latency together",
    "Lay out an online serving path within a latency budget"
  ],

  prerequisites: ["13.1", "13.2", "11.2"],

  blocks: [
    { t: "h2", n: "01", id: "training", text: "Training infrastructure", sub: "When more GPUs help" },
    { t: "p",
      text: "Data-parallel training gives each GPU a shard of the batch and averages gradients after every step with an all-reduce. Whether adding GPUs speeds training depends on how long that all-reduce takes against the compute it follows. The script computes it for a 1.3B-parameter model with bf16 gradients." },
    { t: "code",
      lang: "python",
      title: "ddp.py — all-reduce time and scaling efficiency",
      code: `# Data-parallel training: each step computes on a shard, then all-reduces the gradients.
# Ring all-reduce moves 2(N-1)/N of the gradient bytes over each GPU's link.
params, bytes_per = 1.3e9, 2                       # a 1.3B-parameter model, bf16 gradients
grad_bytes = params * bytes_per
compute_ms = 450                                   # forward + backward per step per GPU, fixed per-GPU batch

print(" GPUs   interconnect           all-reduce ms   step ms   scaling efficiency   overlap needed")
for link_gbps, label, sizes in ((600 * 8, "NVLink, in one node", (8,)), (400, "400 Gbit InfiniBand", (8, 64)), (100, "100 Gbit Ethernet", (8, 64))):
    for n in sizes:
        comm_ms = 2 * (n - 1) / n * grad_bytes * 8 / (link_gbps * 1e9) * 1000
        step = compute_ms + comm_ms
        print(f"{n:>5}   {label:<22}{comm_ms:>13.0f}{step:>10.0f}{compute_ms / step:>16.0%}"
              f"{'   yes: hide it behind backward' if comm_ms > 0.2 * compute_ms else '':>0}")`,
      out: ` GPUs   interconnect           all-reduce ms   step ms   scaling efficiency   overlap needed
    8   NVLink, in one node               8       458             98%
    8   400 Gbit InfiniBand              91       541             83%   yes: hide it behind backward
   64   400 Gbit InfiniBand             102       552             81%   yes: hide it behind backward
    8   100 Gbit Ethernet               364       814             55%   yes: hide it behind backward
   64   100 Gbit Ethernet               410       860             52%   yes: hide it behind backward` },
    { t: "dl",
      items: [
        { term: "The interconnect sets the ceiling",
          def: "Inside one NVLink node the all-reduce took 8 ms against 450 ms of compute: 98% efficiency. Over 100 Gbit Ethernet it took about 400 ms, and each GPU spent almost half its time waiting." },
        { term: "More GPUs barely change the all-reduce",
          def: "Ring all-reduce moves 2(N−1)/N of the gradient per GPU, which approaches twice the gradient size, so going from 8 to 64 GPUs added little communication. The problem is the link, not the count." },
        { term: "Overlap and shard",
          def: "Frameworks overlap the all-reduce with the backward pass, layer by layer. Beyond that, sharding optimiser state and gradients (ZeRO, FSDP) cuts memory, and model or pipeline parallelism is needed when the model does not fit on one GPU." }
      ] },
    { t: "h2",
      n: "02",
      id: "inference",
      text: "Batch, online or both",
      sub: "Decide from freshness and traffic, then check cost" },
    { t: "p",
      text: "Batch inference scores everything on a schedule and stores the results; serving is a lookup. Online inference scores each request when it arrives; serving runs the model. The choice follows from how fresh predictions must be and how much of the population is actually requested." },
    { t: "viz",
      title: "Online and batch serving paths",
      caption: "Online: features are read from the online store, candidates are retrieved cheaply, the ranker scores them in batches, and post-processing applies business rules, all within the request's budget. Batch: the same registered model scores everyone nightly into a key-value store. Both read the model from one registry, so they never run different versions by accident.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="110.0" y1="56.0" x2="140.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="270.0" y1="56.0" x2="300.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="56.0" x2="460.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="590.0" y1="56.0" x2="620.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="270.0" y1="186.0" x2="300.0" y2="186.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="397.0" y1="160.0" x2="493.0" y2="82.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="445.0" y="115.0" text-anchor="middle" class="s-sub">deploy</text>
<line x1="430.0" y1="186.0" x2="460.0" y2="186.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="590.0" y1="186.0" x2="620.0" y2="186.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="30" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="60.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Request</text>
<text x="60.0" y="70" text-anchor="middle" class="s-sub">user, context</text>
<rect x="140" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="205.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">Feature lookup</text>
<text x="205.0" y="70" text-anchor="middle" class="s-sub">online store, 5 ms</text>
<rect x="300" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="365.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Candidates</text>
<text x="365.0" y="70" text-anchor="middle" class="s-sub">ANN / rules, 20 ms</text>
<rect x="460" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="525.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Ranker</text>
<text x="525.0" y="70" text-anchor="middle" class="s-sub">batched model, 30 ms</text>
<rect x="620" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="685.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--good)">Post-process</text>
<text x="685.0" y="70" text-anchor="middle" class="s-sub">filters, diversity</text>
<rect x="140" y="160" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="205.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--violet)">Training</text>
<text x="205.0" y="200" text-anchor="middle" class="s-sub">offline store</text>
<rect x="300" y="160" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="365.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--violet)">Model registry</text>
<text x="365.0" y="200" text-anchor="middle" class="s-sub">versioned</text>
<rect x="460" y="160" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="525.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--warn)">Batch scoring</text>
<text x="525.0" y="200" text-anchor="middle" class="s-sub">nightly top-N</text>
<rect x="620" y="160" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="685.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--good)">Results store</text>
<text x="685.0" y="200" text-anchor="middle" class="s-sub">key-value</text>
</svg>` },
    { t: "table",
      head: ["", "Batch", "Online", "Hybrid"],
      rows: [
        ["Freshness", "Hours old", "Reflects this request", "Fresh where it matters"],
        ["Serving latency", "A lookup, ~1 ms", "Model inference, 10–200 ms", "Lookup plus a small re-rank"],
        ["Wasted work", "Scores users who never come", "None", "Some"],
        [
          "Fits",
          "Email, daily digests, stable tastes",
          "Search, fraud, session-driven feeds",
          "Home pages, recommendations"
        ]
      ] },
    { t: "h2",
      n: "03",
      id: "serving",
      text: "Fitting the latency budget",
      sub: "Dynamic batching and smaller models" },
    { t: "p",
      text: "A model server running one request at a time wastes most of its hardware, because a batch of 32 costs far less than 32 batches of one. Dynamic batching holds requests for a few milliseconds to form a batch. The simulation uses the batch cost measured for DistilBERT on CPU in NLP lesson 3.5." },
    { t: "code",
      lang: "python",
      title: "dynbatch.py — max batch size and max wait against tail latency",
      code: `import random

# Batch cost measured for DistilBERT on CPU in NLP lesson 3.5: about 20 ms at batch 1 and 5.5 ms/item at batch 32.
# Fit as fixed + per-item: t(n) = 15 + 5.2 n ms (one worker, one model replica).
def batch_ms(n): return 15 + 5.2 * n

def simulate(rate_per_s, max_batch, max_wait_ms, seconds=60, seed=1):
    rng = random.Random(seed); t, arrivals = 0.0, []
    while t < seconds * 1000:
        t += rng.expovariate(rate_per_s / 1000); arrivals.append(t)
    lat, free_at, i = [], 0.0, 0
    while i < len(arrivals):
        start = max(free_at, arrivals[i])
        # wait up to max_wait for more requests, but never past a full batch
        deadline = max(start, arrivals[i] + max_wait_ms)
        j = i
        while j < len(arrivals) and j - i < max_batch and arrivals[j] <= deadline: j += 1
        go = max(start, min(deadline, arrivals[j - 1] if j - i == max_batch else deadline))
        done = go + batch_ms(j - i)
        lat += [done - a for a in arrivals[i:j]]; free_at = done; i = j
    lat.sort()
    return lat[len(lat) // 2], lat[int(len(lat) * 0.99)], len(arrivals) / seconds

print(" load    max_batch  max_wait   p50 ms   p99 ms")
for rate in (40, 150):
    for mb, mw in ((1, 0), (8, 5), (32, 10), (32, 40)):
        p50, p99, _ = simulate(rate, mb, mw)
        print(f"{rate:>4}/s   {mb:>8}  {mw:>6} ms  {p50:>7.0f}  {p99:>7.0f}")
print(f"\\nwithout batching one replica saturates at {1000 / batch_ms(1):.0f} req/s; at batch 32 it can do {32 * 1000 / batch_ms(32):.0f} req/s")`,
      out: ` load    max_batch  max_wait   p50 ms   p99 ms
  40/s          1       0 ms       46      233
  40/s          8       5 ms       30       58
  40/s         32      10 ms       35       59
  40/s         32      40 ms       61       86
 150/s          1       0 ms    60647   120217
 150/s          8       5 ms     1744     3567
 150/s         32      10 ms      112      254
 150/s         32      40 ms      115      252

without batching one replica saturates at 50 req/s; at batch 32 it can do 176 req/s` },
    { t: "callout",
      kind: "trap",
      title: "No batching fails long before the hardware is busy",
      body: [
        { t: "p",
          text: "At 150 requests a second, one request at a time is beyond the replica's capacity of about 50 a second, and the queue grew without limit: a p99 of two minutes. Batches of up to 8 still could not keep up. Batches of up to 32 served the same load with a p99 of about 250 ms. At low load the cost of waiting shows: at 40 a second a 40 ms wait raised the median from 30 to 61 ms. Set the maximum wait from the latency budget and the maximum batch from the load, and measure both." }
      ] },
    { t: "p",
      text: "The other lever is a cheaper model. The script trains a large gradient-boosted teacher, then small students: one on the true labels, one distilled on the teacher's scores (including unlabelled data), and a linear model." },
    { t: "code",
      lang: "python",
      title: "distill.py — accuracy and latency of smaller models",
      code: `import time
import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=60_000, n_features=30, n_informative=12, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)
Xtr, Xun, ytr = Xtr[:20_000], Xtr[20_000:], ytr[:20_000]   # the teacher labels extra unlabelled data for the student

teacher = GradientBoostingClassifier(n_estimators=400, max_depth=4, random_state=0).fit(Xtr, ytr)
soft = teacher.predict_proba(np.vstack([Xtr, Xun]))[:, 1]

students = {
    "small model on hard labels": GradientBoostingClassifier(n_estimators=40, max_depth=3, random_state=0).fit(Xtr, ytr),
    "small model distilled on teacher scores": GradientBoostingRegressor(n_estimators=40, max_depth=3, random_state=0).fit(np.vstack([Xtr, Xun]), soft),
    "linear model on hard labels": LogisticRegression(max_iter=2000).fit(Xtr, ytr),
}

def score(m, X): return m.predict_proba(X)[:, 1] if hasattr(m, "predict_proba") else m.predict(X)
def per_request_us(m):
    x = Xte[:1]; score(m, x); t = time.perf_counter()
    for _ in range(300): score(m, x)
    return (time.perf_counter() - t) / 300 * 1e6

print(f"{'model':<42} test AUC   latency per request")
print(f"{'teacher: 400 trees, depth 4':<42} {roc_auc_score(yte, score(teacher, Xte)):.3f}   {per_request_us(teacher):8.0f} µs")
for name, m in students.items():
    print(f"{name:<42} {roc_auc_score(yte, score(m, Xte)):.3f}   {per_request_us(m):8.0f} µs")`,
      out: `model                                      test AUC   latency per request
teacher: 400 trees, depth 4                0.988        244 µs
small model on hard labels                 0.954        124 µs
small model distilled on teacher scores    0.952        139 µs
linear model on hard labels                0.796         61 µs` },
    { t: "callout",
      kind: "insight",
      title: "Distillation is a measurement, not a guarantee",
      body: [
        { t: "p",
          text: "Here the distilled student (AUC 0.952) did no better than the same small model trained on labels (0.954), at half the teacher's latency. With 20,000 clean labels, the teacher's scores added nothing the labels did not. Distillation pays most when labels are scarce or noisy and unlabelled data is plentiful, or when the teacher's soft scores carry structure the labels hide, as with large language and vision models. Compression always needs both numbers, accuracy and latency, measured on your data." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Batch or online recommendations",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "A home page shows recommendations to 10 million users, a quarter of whom visit each day, three times on average. Ranking scores 500 candidates per user at 400,000 items a second per GPU. Compare nightly batch scoring, on-request scoring with a fleet sized for a 3× peak at 40% utilisation, and a hybrid, on GPU-hours, cost and freshness." }
      ],
      requirements: [
        "GPU-hours a day for nightly scoring of every user, and the share spent on users who never visit",
        "Scorings a day and the always-on fleet for on-request scoring",
        "A hybrid that re-ranks a share of visits online",
        "Which consideration decides, and the operational difference"
      ],
      hint: "Online fleets are sized for the peak and run below full utilisation to protect latency, so their cost is the always-on fleet, not the work done.",
      solution: { lang: "python",
        title: "batch_vs_online.py",
        code: `# Home-page recommendations for 10M users. Option A: score every user nightly and store the top 50.
# Option B: score on request for the users who actually visit. Scoring = ranking 500 candidates per user.
USERS, DAILY_ACTIVE, VISITS_PER_ACTIVE = 10_000_000, 0.25, 3
CANDIDATES, ITEMS_PER_SEC_PER_GPU = 500, 400_000          # ranking throughput of one GPU, batched
GPU_HOUR = 2.50                                            # $ per GPU-hour
PEAK_FACTOR, ONLINE_UTIL = 3.0, 0.4                        # online fleets run at partial utilisation to meet latency

def gpu_hours(scored_users):
    return scored_users * CANDIDATES / ITEMS_PER_SEC_PER_GPU / 3600

batch = gpu_hours(USERS)
requests = USERS * DAILY_ACTIVE * VISITS_PER_ACTIVE
online_work = gpu_hours(requests)
online_fleet = requests / 86_400 * PEAK_FACTOR * CANDIDATES / (ITEMS_PER_SEC_PER_GPU * ONLINE_UTIL)   # GPUs at peak
online = online_fleet * 24

print(f"A · nightly batch: {batch:,.1f} GPU-hours/day (\${batch * GPU_HOUR:,.0f}); 75% of that work is for users who never visit")
print(f"    freshness: up to 24 h stale; serving is a key-value lookup")
print(f"B · on request:   {requests:,.0f} scorings/day = {online_work:,.1f} GPU-hours of work,")
print(f"    but the fleet is sized for peak at {ONLINE_UTIL:.0%} utilisation: {online_fleet:.1f} GPUs always on = {online:,.0f} GPU-hours/day (\${online * GPU_HOUR:,.0f})")
print(f"    freshness: reacts to the current session")
hybrid = batch * 1.0 + gpu_hours(requests * 0.3)
print(f"C · hybrid: nightly candidates + on-request re-rank of 30% of visits with session signals: "
      f"~{hybrid:,.1f} GPU-hours of work/day, fresh where it matters")`,
        out: `A · nightly batch: 3.5 GPU-hours/day ($9); 75% of that work is for users who never visit
    freshness: up to 24 h stale; serving is a key-value lookup
B · on request:   7,500,000 scorings/day = 2.6 GPU-hours of work,
    but the fleet is sized for peak at 40% utilisation: 0.8 GPUs always on = 20 GPU-hours/day ($49)
    freshness: reacts to the current session
C · hybrid: nightly candidates + on-request re-rank of 30% of visits with session signals: ~4.3 GPU-hours of work/day, fresh where it matters`,
        notes: [
          { t: "p",
            text: "Nightly batch costs about 3.5 GPU-hours a day, and three-quarters of it scores users who will not visit. On-request scoring does less work, 2.6 GPU-hours, but a fleet sized for peak at 40% utilisation is always on, about 20 GPU-hours a day. In practice it needs at least two GPUs for redundancy, more than the 0.8 the arithmetic gives." },
          { t: "p",
            text: "At this scale the money is small either way, so cost does not decide; freshness and operations do. Batch is simple and robust but a day stale; online reacts to the current session but adds a latency-critical service to run. The hybrid, nightly candidates plus an online re-rank with session signals for a share of visits, is the usual answer for home pages." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: two versions of the model in production",
      body: [
        { t: "p",
          text: "**Symptom.** A marketplace's search ranking quality dipped for a week after a model update, then a second update made it worse. Offline evaluation showed both new models better than the old one." },
        { t: "p",
          text: "**Mechanism.** The online ranker loaded models from a registry, but the nightly batch job that precomputed ranking features for popular queries still pinned the old model version in its configuration. Requests mixed precomputed scores from one version with online scores from another, on different scales." },
        { t: "p",
          text: "**Fix.** Every consumer resolves the model by a single deployment alias in the registry, and a startup check logs and compares the resolved version across the batch job and online fleet. Mixed versions now fail a canary check before rollout continues." }
      ] }
  ],

  takeaways: [
    "Data-parallel efficiency is compute ÷ (compute + all-reduce): **98%** inside an NVLink node, **~55%** over 100 Gbit Ethernet for a 1.3B model.",
    "Ring all-reduce cost barely grows with GPU count; the **link** sets the ceiling. Overlap it with the backward pass.",
    "Choose **batch** inference for stale-tolerant outputs, **online** for request-dependent ones, and a **hybrid** for home pages and feeds.",
    "Without batching, a replica capped at **~50 req/s** collapsed at 150 req/s; batches of up to **32** served it at p99 **~250 ms**.",
    "Dynamic batching costs latency at low load: a **40 ms** wait raised the median from **30 to 61 ms** at 40 req/s.",
    "Measured, a distilled student matched but did not beat the same model on labels (**0.952 vs 0.954**); distillation helps most when labels are scarce.",
    "Judge compression on **accuracy and latency together**, on your data.",
    "Load models through **one registry alias** so batch and online can never run different versions."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Data-parallel training of a 1.3B model over 100 Gbit Ethernet reaches about 55% efficiency. What helps most?",
        options: [
          "Adding many more GPUs to the training job",
          "A faster link, with comms overlapped",
          "Using a much smaller batch on every GPU",
          "Switching all gradients from bf16 to fp32"
        ],
        answer: 1,
        why: "The all-reduce is limited by link bandwidth, so a faster interconnect and overlapping communication with the backward pass attack the cause. More GPUs do not shorten it, smaller batches cut compute and make the ratio worse, and fp32 doubles the bytes." },
      { stem: "Which output suits nightly batch inference best?",
        options: [
          "Fraud scores for card payments",
          "A weekly 'picks for you' email",
          "Search results for a typed query",
          "The next song in a live session"
        ],
        answer: 1,
        why: "A weekly email tolerates day-old predictions and covers known users, so precomputing is cheap and simple. Fraud, search and live sessions depend on information that exists only when the request arrives." },
      { stem: "A model server handles one request at a time and its queue grows at peak. What is the cheapest first fix?",
        options: [
          "Buy new GPUs with much more memory",
          "Dynamic batching, short max wait",
          "Retrain the model on far more data",
          "Cache every prediction it ever makes"
        ],
        answer: 1,
        why: "Batching raised one replica's capacity from about 50 to 176 requests a second in the simulation, using the same hardware. More memory, retraining and permanent caching do not address per-request overhead, and stale cached predictions bring their own problems." },
      { stem: "A distilled student scores the same AUC as the same model trained on labels. What does that tell you?",
        options: [
          "Distillation is broken in this framework",
          "The labels already carried the signal",
          "The teacher model must be badly overfitting",
          "The student needs far more trees to learn it"
        ],
        answer: 1,
        why: "With plentiful clean labels, the teacher's soft scores add little; distillation shines when labels are scarce or noisy. Nothing indicates a bug or an overfit teacher, and a bigger student defeats the purpose." }
    ] },

  interview: { title: "In an interview",
    sub: "Serving questions test whether you can meet a latency budget with a real model.",
    questions: [
      { level: "core",
        q: "How would you serve a ranking model with a 100 ms p99 budget at 5,000 requests a second?",
        strong: "A strong answer splits the budget, uses candidate generation, batching and caching, and sizes the fleet from measured throughput.",
        answer: [
          { t: "p",
            text: "Split the budget: about 5 ms for features from the online store, 20 ms for candidate retrieval (an approximate nearest-neighbour index or rules) to cut millions of items to a few hundred, 40 ms for ranking those with the model, and the rest for post-processing and the network. The ranker runs behind a model server with dynamic batching, a max wait of a few milliseconds, and replicas sized from load-tested throughput at the latency objective." },
          { t: "p",
            text: "If ranking is still too slow I would measure a distilled or quantised model, cache scores for popular contexts, and degrade gracefully to a cheaper model or the candidate order under overload." }
        ] },
      { level: "core",
        q: "When would you choose batch over online inference?",
        strong: "A strong answer uses freshness, coverage of requested entities, latency and operational cost.",
        answer: [
          { t: "p",
            text: "When predictions can be hours old and the set of entities is known and mostly requested: emails, daily feeds, risk scores refreshed nightly. Batch turns serving into a lookup, which is cheap and robust. Online is necessary when the prediction depends on the request itself, such as a query, the current session or a transaction. A hybrid precomputes what is stable and re-ranks with fresh context." }
        ] },
      { level: "advanced",
        q: "How would you speed up distributed training that scales poorly beyond one node?",
        strong: "A strong answer diagnoses communication against compute and names the techniques for each.",
        answer: [
          { t: "p",
            text: "First measure the step breakdown: if all-reduce time is a large share, the interconnect is the limit. Then overlap gradient communication with the backward pass, use gradient bucketing, compress or reduce precision where safe, and increase compute per step with a larger per-GPU batch so communication is amortised. Topology matters: keep tensor parallelism inside NVLink nodes and use data parallelism across them, and use sharded optimisers (ZeRO, FSDP) to fit larger models without model parallelism across slow links." }
        ] }
    ] }
});

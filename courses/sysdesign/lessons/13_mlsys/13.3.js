/* ============================================================================
   LESSON 13.3 — Training, Inference and Serving
   ========================================================================= */
EC.receiveLesson({
  id: "13.3",

  lede: "Once the data is right, the model has to be trained at a cost you can afford and served within a latency budget at a price you can sustain. Both are arithmetic before they are engineering: a 7-billion-parameter model needs about 112 GB just for its training state, more than any single GPU holds; spreading training across processes measured here as identical results at up to almost three times the speed on four cores; and on the serving side, an accelerator called once per request saturated at 235 requests a second while the same hardware, batching dynamically, served 2,000 a second with a p99 under 20 ms. This lesson covers choosing a model, training it at scale, choosing between online, batch and nearline inference, and the optimisations — batching, quantisation, distillation, caching — that make serving affordable.",

  objectives: [
    "Choose a model family by data type, scale and latency, starting from the simplest that could work",
    "Estimate training memory and compute, and choose data, tensor or pipeline parallelism",
    "Choose online, batch or nearline inference by freshness, cost and traffic",
    "Configure dynamic batching against a latency target",
    "Apply quantisation, distillation and caching, and know what each costs in accuracy"
  ],

  prerequisites: ["13.1", "11.2", "11.4"],

  blocks: [

    { t: "h2", n: "01", id: "model", text: "Choosing the model",
      sub: "The simplest model that beats the baseline, then more only where it pays" },

    { t: "table", head: ["Step", "Wins when", "Costs"],
      rows: [
        ["Rules or a heuristic", "the pattern is known and stable; a launch is needed now", "maintenance as rules multiply"],
        ["Logistic regression", "features are well engineered; interpretability matters; very low latency", "misses interactions unless crossed by hand"],
        ["Gradient-boosted trees", "tabular data — the default for fraud, risk, many ranking problems", "weak on raw text, images and huge ID spaces"],
        ["Deep networks", "unstructured inputs, billions of sparse IDs learned as embeddings, very large data", "GPUs, tuning, less interpretable"],
        ["Multi-stage cascades", "millions of candidates: cheap retrieval, then progressively heavier ranking (13.5)", "more components to keep consistent"]
      ] },

    { t: "p", text: "Move down the table only when the metric moves enough to pay for the step, and keep the previous model as a fallback. Gradient-boosted trees remain the strongest default on tabular features; deep models win where inputs are text, images, sequences or enormous categorical spaces such as user and item IDs." },

    { t: "h2", n: "02", id: "training", text: "Training at scale",
      sub: "Memory decides how to split the model; compute decides how long it takes" },

    { t: "p", text: "Two rules of thumb size any training job. Mixed-precision training with the Adam optimiser keeps about **16 bytes per parameter** — weights and gradients in bf16, a float32 master copy, and two optimiser moments — before activations. And a forward plus backward pass costs about **6 floating-point operations per parameter per training token**. For dense transformer models trained on roughly twenty tokens per parameter:" },

    { t: "code", lang: "python", title: "train_cost.py — training memory and GPU time from two rules of thumb",
      code: `import math

BYTES_PER_PARAM = 2 + 2 + 4 + 8       # bf16 weights and gradients, fp32 master copy, Adam's two moments
GPU_MEMORY, GPU_FLOPS, UTILISATION = 80e9, 989e12, 0.40   # an 80 GB H100: dense BF16 peak, realistic share of it

def span(hours):
    return "under a minute" if hours < 1 / 60 else f"{hours * 60:.0f} min" if hours < 1 else f"{hours:.0f} hours" if hours < 48 else f"{hours / 24:.0f} days"

print(f"{'model':>7}{'training state':>16}{'GPUs to hold it':>17}{'tokens':>9}{'GPU-hours':>11}{'on 256 GPUs':>16}")
for name, params in [("110M", 110e6), ("1.3B", 1.3e9), ("7B", 7e9), ("70B", 70e9)]:
    state = params * BYTES_PER_PARAM                   # before activations, which add more
    tokens = 20 * params                               # roughly compute-optimal for the model size
    flops = 6 * params * tokens                        # forward and backward: ~6 FLOPs per parameter per token
    gpu_hours = flops / (GPU_FLOPS * UTILISATION) / 3600
    print(f"{name:>7}{state / 1e9:>13,.0f} GB{math.ceil(state / (0.8 * GPU_MEMORY)):>17}"
          f"{tokens / 1e9:>8,.0f}B{gpu_hours:>11,.0f}{span(gpu_hours / 256):>16}")`,
      hl: [3, 12, 13],
      out: `  model  training state  GPUs to hold it   tokens  GPU-hours     on 256 GPUs
   110M            2 GB                1       2B          1  under a minute
   1.3B           21 GB                1      26B        142          33 min
     7B          112 GB                2     140B      4,129        16 hours
    70B        1,120 GB               18   1,400B    412,875         67 days` },

    { t: "p", text: "Small models train on one GPU in minutes. At 7 billion parameters the training state alone exceeds an 80 GB GPU, so the state must be split across devices; at 70 billion it needs at least eighteen GPUs just to hold it, and two months on 256 of them. Those are the regimes the parallelism strategies exist for:" },

    { t: "diagram", kind: "compare", title: "Three ways to split training",
      caption: "Data parallelism is the default and composes with the others: large training runs combine all three, with fully sharded data parallelism (FSDP, ZeRO) splitting the optimiser state, gradients and weights across the data-parallel workers so each holds only a slice.",
      columns: [
        { title: "Data parallel", tone: "accent", items: [
          "every worker holds the whole model",
          "each takes a slice of the batch",
          "gradients averaged by all-reduce",
          "scales throughput, not model size"
        ] },
        { title: "Tensor parallel", tone: "violet", items: [
          "each layer split across GPUs",
          "activations swapped per layer",
          "needs very fast links (NVLink)",
          "for layers too big for one GPU"
        ] },
        { title: "Pipeline parallel", tone: "teal", items: [
          "successive layers per GPU",
          "micro-batches flow through",
          "idle bubbles at start and end",
          "for models too deep for one GPU"
        ] }
      ] },

    { t: "p", text: "Data parallelism is easy to see working. Each worker computes the gradient on its own share of a batch, the gradients are averaged — the **all-reduce** — and every worker applies the same update, so the result is identical to one machine processing the whole batch. A logistic regression on 8,000 examples a step, across one, two and four processes:" },

    { t: "code", lang: "python", title: "dp.py — synchronous data-parallel training with multiprocessing",
      code: `import math, multiprocessing as mp, random, time

FEATURES, PER_WORKER_TOTAL = 20, 8_000         # global batch of 8,000 examples a step, split across workers
TRUE_W = [random.Random(1).uniform(-1, 1) for _ in range(FEATURES)]

def make_data(n, seed):
    rng = random.Random(seed); rows = []
    for _ in range(n):
        x = [rng.gauss(0, 1) for _ in range(FEATURES)]
        rows.append((x, rng.random() < 1 / (1 + math.exp(-sum(a * b for a, b in zip(TRUE_W, x))))))
    return rows
DATA = make_data(PER_WORKER_TOTAL, seed=7)     # one global batch, reused each step to keep the timing clean

def gradient(args):                             # each worker: the loss gradient on its shard of the batch
    w, lo, hi = args
    g, loss = [0.0] * FEATURES, 0.0
    for x, y in DATA[lo:hi]:
        p = 1 / (1 + math.exp(-sum(a * b for a, b in zip(w, x))))
        loss -= math.log(p if y else 1 - p)
        for j in range(FEATURES): g[j] += (p - y) * x[j]
    return g, loss

def train(workers, steps=40, lr=0.5):
    w, shard = [0.0] * FEATURES, PER_WORKER_TOTAL // workers
    with mp.Pool(workers) as pool:
        start = time.perf_counter()
        for _ in range(steps):
            parts = pool.map(gradient, [(w, i * shard, (i + 1) * shard) for i in range(workers)])
            g = [sum(p[0][j] for p in parts) / PER_WORKER_TOTAL for j in range(FEATURES)]   # all-reduce: average
            w = [wj - lr * gj for wj, gj in zip(w, g)]                                       # same update everywhere
        loss = sum(p[1] for p in parts) / PER_WORKER_TOTAL
        return time.perf_counter() - start, loss

if __name__ == "__main__":
    base = None
    print(f"{'workers':>7}{'time, 40 steps':>16}{'speed-up':>10}{'final loss':>12}")
    for n in (1, 2, 4):
        t, loss = train(n); base = base or t
        print(f"{n:>7}{t:>14.2f} s{base / t:>9.1f}x{loss:>12.6f}")`,
      hl: [14, 28, 29, 30],
      out: `workers  time, 40 steps  speed-up  final loss
      1          1.02 s      1.0x    0.358679
      2          0.54 s      1.9x    0.358679
      4          0.38 s      2.7x    0.358679` },

    { t: "p", text: "The final loss matches to six decimal places at every worker count, because the averaged gradient is mathematically the full-batch gradient. Two workers nearly halved the time; four gave less than three times, not four, because every step pays for distributing the weights and collecting the gradients, and the slowest worker sets the pace. On real clusters the same effect is why interconnect bandwidth, overlapping communication with computation, and larger per-worker batches matter as much as GPU count." },

    { t: "callout", kind: "good", title: "Make every training run reproducible",
      body: [
        { t: "p", text: "Record, for each run, the code commit, the exact data snapshot (a versioned table or a hash), the features and their definitions, the hyperparameters and random seeds, and the resulting metrics, in an experiment tracker such as MLflow or Weights & Biases; register the model artefact with that lineage. Without it, a regression found next month cannot be traced to its cause, and a model cannot be rebuilt when an auditor or a bug report asks how it was made." }
      ] },

    { t: "h2", n: "03", id: "inference", text: "Online, batch and nearline inference",
      sub: "When to compute a prediction is a design choice" },

    { t: "diagram", kind: "compare", title: "Three times to predict",
      caption: "Nearline is the common production answer for recommendations: expensive candidate generation runs in bulk for users who are likely to return, and a light model re-ranks the stored candidates at request time with fresh context.",
      columns: [
        { title: "Batch", tone: "violet", items: [
          "score every entity on a schedule",
          "store results; serve by lookup",
          "cheapest per prediction",
          "stale; scores unused entities",
          "email campaigns, nightly lists"
        ] },
        { title: "Online", tone: "accent", items: [
          "score when the request arrives",
          "uses context known only now",
          "provisioned for peak traffic",
          "must fit the latency budget",
          "search, fraud, ads"
        ] },
        { title: "Nearline", tone: "teal", items: [
          "heavy work bulk, light work live",
          "or recompute on events (6.2)",
          "fresh where it matters",
          "two paths to keep consistent",
          "feeds, recommendations"
        ] }
      ] },

    { t: "viz", title: "A latency budget for a ranking request",
      caption: "Allocate the end-to-end p99 to stages before choosing models, and keep real headroom: tail latencies add up across stages (11.1), traffic grows, and a model upgrade will want more. The ranking model's share is what decides how large it may be and whether it needs batching, quantisation or a GPU.",
      svg: `<svg viewBox="0 0 760 150" width="100%" role="img" aria-label="A 200 millisecond latency budget split across the stages of a ranking request">
<rect x="30.0" y="34" width="70.0" height="40" style="fill:var(--line);fill-opacity:.35;stroke:var(--line)"/>
<text x="65.0" y="59" text-anchor="middle" class="s-label">20 ms</text>
<text x="65.0" y="94" text-anchor="middle" class="s-sub">network</text>
<rect x="100.0" y="34" width="87.5" height="40" style="fill:var(--teal);fill-opacity:.35;stroke:var(--teal)"/>
<text x="143.8" y="59" text-anchor="middle" class="s-label">25 ms</text>
<text x="143.8" y="94" text-anchor="middle" class="s-sub">features</text>
<rect x="187.5" y="34" width="87.5" height="40" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
<text x="231.2" y="59" text-anchor="middle" class="s-label">25 ms</text>
<text x="231.2" y="94" text-anchor="middle" class="s-sub">retrieval</text>
<rect x="275.0" y="34" width="175.0" height="40" style="fill:var(--violet);fill-opacity:.35;stroke:var(--violet)"/>
<text x="362.5" y="59" text-anchor="middle" class="s-label">50 ms</text>
<text x="362.5" y="94" text-anchor="middle" class="s-sub">ranking model</text>
<rect x="450.0" y="34" width="70.0" height="40" style="fill:var(--warn);fill-opacity:.35;stroke:var(--warn)"/>
<text x="485.0" y="59" text-anchor="middle" class="s-label">20 ms</text>
<text x="485.0" y="94" text-anchor="middle" class="s-sub">rules</text>
<rect x="520.0" y="34" width="210.0" height="40" style="fill:var(--good);fill-opacity:.12;stroke:var(--good);stroke-dasharray:4 3"/>
<text x="625.0" y="59" text-anchor="middle" class="s-label">60 ms</text>
<text x="625.0" y="94" text-anchor="middle" class="s-sub">headroom</text>
<line x1="30.0" y1="104" x2="30.0" y2="110" style="stroke:var(--ink-3)"/>
<text x="30.0" y="126" text-anchor="middle" class="s-sub">0 ms</text>
<line x1="205.0" y1="104" x2="205.0" y2="110" style="stroke:var(--ink-3)"/>
<text x="205.0" y="126" text-anchor="middle" class="s-sub">50 ms</text>
<line x1="380.0" y1="104" x2="380.0" y2="110" style="stroke:var(--ink-3)"/>
<text x="380.0" y="126" text-anchor="middle" class="s-sub">100 ms</text>
<line x1="555.0" y1="104" x2="555.0" y2="110" style="stroke:var(--ink-3)"/>
<text x="555.0" y="126" text-anchor="middle" class="s-sub">150 ms</text>
<line x1="730.0" y1="104" x2="730.0" y2="110" style="stroke:var(--ink-3)"/>
<text x="730.0" y="126" text-anchor="middle" class="s-sub">200 ms</text>
<text x="30.0" y="20" class="s-label">p99 budget for the whole request: 200 ms</text>
<text x="730.0" y="20" text-anchor="end" class="s-sub" style="fill:var(--good)">spare for the tail and growth</text>
</svg>` },

    { t: "h2", n: "04", id: "serving", text: "Serving efficiently",
      sub: "Batching, smaller numbers, smaller models, fewer calls" },

    { t: "p", text: "Accelerators have a large fixed cost per call — launching kernels, moving data — and a small cost per extra item, so serving one request per call wastes most of the device. **Dynamic batching** (Triton, TorchServe, vLLM and most model servers do it) holds arriving requests briefly and runs them together, dispatching when the batch is full or the oldest request has waited long enough. A simulated accelerator taking 4 ms per call plus 0.25 ms per request, under two loads:" },

    { t: "code", lang: "python", title: "batching.py — dynamic batching against one request per call",
      code: `import random, statistics
random.seed(1)

def accelerator(n):               # one call: a fixed cost to launch, plus a little per request in the batch
    return 4.0 + 0.25 * n         # milliseconds

def serve(arrivals, max_batch, max_wait):
    queue_start, done, clock, latencies, busy = 0, 0, 0.0, [], 0.0
    while done < len(arrivals):
        clock = max(clock, arrivals[done])                         # idle until the next request arrives
        deadline = arrivals[done] + max_wait                       # the oldest request waits at most max_wait
        full_at = arrivals[done + max_batch - 1] if done + max_batch - 1 < len(arrivals) else float("inf")
        clock = max(clock, min(deadline, full_at))                 # dispatch when full or when the wait expires
        n = sum(1 for a in arrivals[done:done + max_batch] if a <= clock)
        clock += accelerator(n); busy += accelerator(n)
        latencies += [clock - a for a in arrivals[done:done + n]]
        done += n
    return len(arrivals) / clock * 1000, statistics.quantiles(latencies, n=100), busy / clock

def poisson(rate, seconds=10):      # arrival times in ms
    arrivals, t = [], 0.0
    while t < seconds * 1000:
        t += random.expovariate(rate / 1000); arrivals.append(t)
    return arrivals
LOADS = {600: poisson(600), 2000: poisson(2000)}

print(f"{'':34}{'--- 600 requests/s ---':>24}{'--- 2,000 requests/s ---':>27}")
print(f"{'policy':<34}" + f"{'p50 ms':>9}{'p99 ms':>9}{'busy':>6}" * 2)
for label, max_batch, max_wait in [("one request per call", 1, 0), ("batches of up to 8, wait 2 ms", 8, 2),
                                   ("batches of up to 32, wait 2 ms", 32, 2), ("batches of up to 32, wait 20 ms", 32, 20)]:
    row = f"{label:<34}"
    for arrivals in LOADS.values():
        rate, q, busy = serve(arrivals, max_batch, max_wait)
        row += f"{q[49]:>9,.1f}{q[98]:>9,.1f}{busy:>6.0%}"
    print(row)`,
      hl: [4, 5, 11, 12, 13],
      out: `                                    --- 600 requests/s ---   --- 2,000 requests/s ---
policy                               p50 ms   p99 ms  busy   p50 ms   p99 ms  busy
one request per call                7,683.0 15,253.1  100% 37,491.6 74,148.5  100%
batches of up to 8, wait 2 ms           7.3     10.5   94%  2,542.4  4,944.0  100%
batches of up to 32, wait 2 ms          7.3     10.5   94%     12.2     19.1  100%
batches of up to 32, wait 20 ms        18.0     28.6   33%     19.6     30.5   75%` },

    { t: "p", text: "One request per call caps the device at about 235 a second, so at 600 the queue grows without limit and latency is measured in seconds. Batching with a 2 ms wait served 600 a second with a p99 of about 10 ms. At 2,000 a second a maximum batch of 8 saturates in turn — its ceiling is about 1,300 a second — while 32 keeps the p99 under 20 ms. The long 20 ms wait shows the other side: bigger batches and an idler device, but every request now waits longer. Set the maximum wait from the latency budget, and the maximum batch from the device's memory and the peak load." },

    { t: "p", text: "The other levers make each call cheaper. **Quantisation** stores numbers in fewer bits. Item embeddings for retrieval, quantised from float32 to int8 with one scale per vector:" },

    { t: "code", lang: "python", title: "quant.py — int8 embeddings: size against nearest-neighbour agreement",
      code: `import array, random, time
random.seed(6)
DIM, ITEMS, QUERIES = 32, 5_000, 100

# item embeddings with some structure (clusters), as a retrieval model would produce
centres = [[random.gauss(0, 1) for _ in range(DIM)] for _ in range(50)]
items = [[c + random.gauss(0, 0.6) for c in random.choice(centres)] for _ in range(ITEMS)]
queries = [[c + random.gauss(0, 0.6) for c in random.choice(centres)] for _ in range(QUERIES)]

def quantise(vec):                 # int8 per vector: a scale and 32 one-byte integers instead of 32 floats
    scale = max(abs(v) for v in vec) / 127
    return scale, array.array("b", (round(v / scale) for v in vec))

def top10(q, vectors, dot):
    return sorted(range(len(vectors)), key=lambda i: -dot(q, vectors[i]))[:10]

float_dot = lambda q, v: sum(a * b for a, b in zip(q, v))
int8_dot = lambda q, sv: sv[0] * sum(a * b for a, b in zip(q, sv[1]))
packed = [quantise(v) for v in items]

exact = [top10(q, items, float_dot) for q in queries]
approx = [top10(q, packed, int8_dot) for q in queries]
recall = sum(len(set(a) & set(b)) for a, b in zip(exact, approx)) / (10 * QUERIES)
print(f"{ITEMS:,} items x {DIM} dimensions")
print(f"float32: {ITEMS * DIM * 4 / 1024:,.0f} KB    int8 + one scale each: {ITEMS * (DIM + 4) / 1024:,.0f} KB")
print(f"top-10 neighbours shared with exact search: {recall:.1%} over {QUERIES} queries")
print(f"at 100 million items: {100e6 * DIM * 4 / 1e9:.1f} GB against {100e6 * (DIM + 4) / 1e9:.1f} GB")`,
      hl: [10, 11, 18],
      out: `5,000 items x 32 dimensions
float32: 625 KB    int8 + one scale each: 176 KB
top-10 neighbours shared with exact search: 99.4% over 100 queries
at 100 million items: 12.8 GB against 3.6 GB` },

    { t: "p", text: "A 3.6-fold reduction in memory kept 99.4% of the exact top-10 neighbours. At 100 million items that is the difference between needing a large memory-optimised fleet and fitting on a few machines, and the smaller numbers also move faster through memory, which is usually the bottleneck. Quantising model weights works the same way; the accuracy cost is usually small for int8 and must be measured for anything lower." },

    { t: "dl", items: [
      { term: "Distillation", def: "Train a small student model to reproduce a large teacher's outputs; it keeps much of the quality at a fraction of the cost. Common for ranking and language models." },
      { term: "Pruning and early exit", def: "Remove weights or whole layers that contribute little, or stop computing once a confident answer is reached." },
      { term: "Caching", def: "Cache predictions or embeddings for repeated inputs — popular queries, item embeddings that change daily — with a TTL matched to how fast they go stale (3.3)." },
      { term: "Cascades", def: "Run a cheap model on everything and an expensive one only where the cheap one is unsure or the stakes are high." },
      { term: "Approximate nearest neighbours", def: "Search embeddings with an index (HNSW, IVF, ScaNN) instead of comparing against every item (13.5)." }
    ] },

    { t: "callout", kind: "trap", title: "Measure latency under the real traffic shape",
      body: [
        { t: "p", text: "A model benchmarked one request at a time on an idle machine says nothing about its p99 at peak, where queues, batching and contention decide latency. Load-test the serving stack with recorded production traffic at peak rate and above, as in 11.4, and make p99 at peak a launch criterion alongside the offline metric." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Batch, online or both?",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A service has 50 million registered users, 20 million active in a month and 5 million on a given day, each visiting three times. Scoring a user's candidates costs 40 ms of CPU in bulk and 80 ms online; re-ranking 50 stored candidates online costs 10 ms. Online capacity must cover a peak three times the average with 50% headroom. Compare scoring everyone nightly, scoring on every visit, and a hybrid that batch-scores only the month's active users and re-ranks online — on compute cost, staleness and storage." }
      ],
      requirements: [
        "Batch cost from total CPU time; online cost from capacity provisioned for peak with headroom, paid all day",
        "Storage for 50 stored results of 8 bytes per scored user",
        "Print cost per month, staleness and storage for each strategy",
        "Show what fraction of batch work is spent on users who will not visit"
      ],
      hint: "Online cost is cores × hours × price, where cores = average requests per second × peak factor × headroom × CPU seconds per request.",
      solution: { lang: "python", title: "infer_ex.py",
        code: `USERS, ACTIVE_30D, DAILY_ACTIVE, VISITS = 50e6, 20e6, 5e6, 3     # registered, active this month, today, visits each
CPU_HOUR = 0.04                                                 # dollars per vCPU-hour
BATCH_MS, ONLINE_MS, RERANK_MS = 40, 80, 10                      # CPU per user: bulk scoring, full online, re-rank only
PEAK, HEADROOM = 3.0, 1.5                                        # peak-to-average traffic; spare capacity kept online
TOP_K, BYTES = 50, 8                                             # stored results per user, bytes per item

def cpu_cost(ms_total): return ms_total / 1000 / 3600 * CPU_HOUR

def online_capacity_cost(ms_per_request, requests_per_day):     # provisioned for peak, paid all day
    avg_rps = requests_per_day / 86_400
    cores = avg_rps * PEAK * HEADROOM * ms_per_request / 1000
    return cores * 24 * CPU_HOUR

requests = DAILY_ACTIVE * VISITS
strategies = {
    "batch: score everyone nightly": (cpu_cost(USERS * BATCH_MS), "up to 24 h", USERS * TOP_K * BYTES),
    "online: score on every visit": (online_capacity_cost(ONLINE_MS, requests), "none", 0),
    "hybrid: batch candidates for the month's actives, re-rank online":
        (cpu_cost(ACTIVE_30D * BATCH_MS) + online_capacity_cost(RERANK_MS, requests), "candidates 24 h, ranking live", ACTIVE_30D * TOP_K * BYTES),
}
for name, (cost, stale, stored) in strategies.items():
    print(f"{name}\\n    \${cost * 30:,.0f} a month of compute; staleness: {stale}; {stored / 1e9:,.0f} GB of stored results")
wasted = (USERS - DAILY_ACTIVE) / USERS
print(f"\\nbatch scores {wasted:.0%} of users who will not visit today; online pays for {PEAK * HEADROOM:.1f}x average load")`,
        out: `batch: score everyone nightly
    $667 a month of compute; staleness: up to 24 h; 20 GB of stored results
online: score on every visit
    $1,800 a month of compute; staleness: none; 0 GB of stored results
hybrid: batch candidates for the month's actives, re-rank online
    $492 a month of compute; staleness: candidates 24 h, ranking live; 8 GB of stored results

batch scores 90% of users who will not visit today; online pays for 4.5x average load`,
        notes: [
          { t: "p", text: "Pure batch is cheap per prediction but spends 90% of its work on users who will not come today, and everything it serves is up to a day old. Pure online is fresh but pays for capacity sized for the peak, around the clock. The hybrid is the cheapest of the three here and serves rankings that use live context — which is why so many recommendation systems end up with exactly this shape." },
          { t: "p", text: "The ratios matter more than the absolute numbers: with a heavier model, a GPU, or a larger share of users active each day, the balance moves, and the same few lines of arithmetic tell you which way." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the better model that made the product worse",
      body: [
        { t: "p", text: "**Symptom.** A new ranking model, four times larger, improved offline nDCG by 3% and was rolled out. Click-through fell 2% the same week, and the latency dashboard showed the ranking service's p99 at peak had risen from 60 ms to 240 ms." },
        { t: "p", text: "**Mechanism.** The page had a 150 ms timeout on the ranking call, falling back to a popularity list when it expired. At peak, a fifth of requests now timed out and were served the fallback; the better model was making most pages better and a large minority much worse. Benchmarks had been run one request at a time, off-peak." },
        { t: "p", text: "**Fix.** The large model became a teacher: a distilled student with a quarter of its size recovered most of the offline gain, served with dynamic batching on GPUs. Launch criteria now include p99 at recorded peak traffic and the fallback rate, and dashboards show the share of responses served by fallbacks next to the model's metrics." }
      ] }
  ],

  takeaways: [
    "Climb the model ladder — rules, linear, **gradient-boosted trees**, deep networks, cascades — only as far as the metric pays.",
    "Training state is about **16 bytes per parameter** with Adam; compute about **6 FLOPs per parameter per token**: a 7B model needs ~112 GB of state, more than one GPU.",
    "**Data parallelism** averages gradients by all-reduce and gives identical results — measured, to six decimal places — with speed-up limited by communication (**under 3x on 4 workers**).",
    "Tensor and pipeline parallelism split the model itself; **FSDP/ZeRO** shard optimiser state across data-parallel workers.",
    "Record code, data version, features, parameters and metrics for **every run**.",
    "Choose **batch, online or nearline** by freshness, cost and traffic; nearline (bulk candidates, live re-rank) is the common answer.",
    "Allocate a **latency budget** per stage with headroom before choosing the model.",
    "**Dynamic batching** turned a device that saturated at 235 req/s into one serving **2,000 req/s at p99 under 20 ms**; set the wait from the budget.",
    "**int8 quantisation** cut embedding memory 3.6x and kept **99.4%** of exact neighbours; also distil, cache, cascade.",
    "Load-test at **peak traffic**: p99 and fallback rate are launch criteria."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Roughly how much memory does the training state of a 7-billion-parameter model need with mixed precision and Adam, before activations?",
        options: ["About 14 GB", "About 112 GB — around 16 bytes per parameter — so it must be sharded across GPUs", "About 7 GB", "About 1 TB"],
        answer: 1,
        why: "bf16 weights and gradients (4 bytes), a float32 master copy (4) and Adam's two moments (8) make about 16 bytes per parameter. 14 GB is only the bf16 weights, which is roughly what serving needs." },

      { stem: "In synchronous data-parallel training, what is exchanged on every step?",
        options: ["Each worker's slice of the data", "Gradients, averaged across workers (all-reduce), so every worker applies the same update", "Nothing until the end", "Each layer's activations"],
        answer: 1,
        why: "Each worker computes gradients on its own data; averaging them gives the full-batch gradient, which is why dp.py's loss matched exactly at every worker count. Exchanging activations each layer is tensor parallelism." },

      { stem: "A dynamic batcher waits up to 20 ms to fill batches. Compared with 2 ms at the same load, what happens?",
        options: ["Lower latency and higher utilisation", "Bigger batches and a less busy device, but every request waits longer: p99 rose from about 10 ms to about 29 ms at 600 requests/s", "No difference", "Throughput falls"],
        answer: 1,
        why: "The wait bounds how long the oldest request is held. A longer wait builds fuller batches — useful near capacity — but adds directly to latency when the device has spare capacity." },

      { stem: "A weekly email lists ten recommended products per user. How should predictions be produced?",
        options: ["Online, per email open", "Batch: score the recipients on a schedule before sending; freshness of a few hours costs nothing and bulk scoring is cheapest", "Nearline with streaming features", "Rules only"],
        answer: 1,
        why: "The output is consumed at a known time, there is no request-time context, and bulk scoring amortises cost. Online inference would pay for latency and peak capacity that this use case does not need." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Serving questions reward a latency budget and a list of levers with their costs.",
    questions: [
      { level: "advanced",
        q: "How would you reduce the serving latency of a ranking model?",
        strong: "A strong answer starts from the budget and a measurement, then works through architecture and model levers.",
        answer: [
          { t: "p", text: "First measure where the time goes at p99 under peak traffic: feature fetches, candidate retrieval, the model, post-processing. Then architecture: a cascade so the heavy model scores only the top few hundred candidates; precompute what does not depend on the request (item embeddings, user profiles); parallelise feature fetches and cache hot ones; dynamic batching on the accelerator with a wait bounded by the budget." },
          { t: "p", text: "Then the model: distil it into a smaller student, quantise to int8, prune features that cost latency but add little, and use an approximate nearest-neighbour index for retrieval. Keep a fallback with a strict timeout, and track the fallback rate, because a slow better model that times out is a worse product." }
        ] },

      { level: "core",
        q: "When would you use batch, online and nearline inference?",
        strong: "A strong answer ties each to freshness, request context, cost and traffic shape.",
        answer: [
          { t: "p", text: "Batch when outputs are consumed later or the entity set is bounded and freshness of hours is fine — emails, nightly lists, risk scores for a portfolio; it is the cheapest per prediction but wastes work on entities never used. Online when the prediction depends on request context or must be current — search, fraud, ads — at the price of peak-provisioned capacity and a latency budget." },
          { t: "p", text: "Nearline in between: heavy work done in bulk or on events, and a light model applied at request time with fresh context — the standard shape for feeds and recommendations, provided the two paths share feature definitions." }
        ] },

      { level: "advanced",
        q: "How would you train a model too large for one GPU?",
        strong: "A strong answer sizes the problem first, then picks parallelism by the bottleneck.",
        answer: [
          { t: "p", text: "Estimate memory: about 16 bytes per parameter of training state plus activations. If the state does not fit, shard it with fully sharded data parallelism (FSDP or ZeRO), which splits weights, gradients and optimiser state across data-parallel workers and gathers each layer when needed. If single layers are too large, add tensor parallelism within a node over NVLink; if the model is very deep, pipeline parallelism across nodes with micro-batches." },
          { t: "p", text: "Reduce memory with mixed precision and activation checkpointing. Then size time with 6 × parameters × tokens divided by realistic throughput, and plan for failures: checkpoint regularly, because a multi-week run on hundreds of GPUs will lose some of them." }
        ] }
    ]
  }
});

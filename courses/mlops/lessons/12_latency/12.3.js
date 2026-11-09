/* ============================================================================
   LESSON 12.3 — Batching, Caching and the Memory Ceiling
   ========================================================================= */
EC.receiveLesson({
  id: "12.3",

  lede: "Three tools change a model server's capacity without changing the model. Batching runs several requests through the model at once, so fixed costs are shared, at the price of making each request wait for company. Caching skips the model entirely for inputs it has seen, and is worth exactly as much as its hit rate. The third is not a tool but a failure: memory that grows a little with every request, which shows up for days as a slowly rising latency before it shows up as an out-of-memory crash. This lesson measures batching on a real transformer, caching on a realistic request mix, and a leak from first symptom to fix.",

  objectives: [
    "Measure throughput and latency by batch size on a real model",
    "Configure dynamic batching: maximum batch size and maximum wait, from measurements",
    "Estimate a prediction cache's hit rate and decide whether it is worth having",
    "Recognise a memory leak from its latency signature and find it with tracemalloc",
    "Bound every per-process collection"
  ],

  prerequisites: ["12.1", "12.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "batching",
      text: "Batching, measured",
      sub: "Throughput against latency on DistilBERT" },
    { t: "p",
      text: "The script runs a DistilBERT classifier on CPU at batch sizes from 1 to 32, measuring each size in three interleaved rounds so a noisy moment on the machine affects every size equally. Then it simulates a dynamic batcher, which collects requests until the batch is full or a maximum wait has passed, using the measured batch times, at three arrival rates." },
    { t: "code",
      lang: "python",
      title: "batching.py — batch sizes, then a dynamic batcher",
      code: `import time
import numpy as np, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

torch.set_num_threads(4)
name = "distilbert-base-uncased-finetuned-sst-2-english"
tok = AutoTokenizer.from_pretrained(name); model = AutoModelForSequenceClassification.from_pretrained(name).eval()
text = "the delivery was late but support sorted it out quickly and the refund arrived the next day"

sizes = (1, 2, 4, 8, 16, 32); times = {b: [] for b in sizes}
encs = {b: tok([text] * b, return_tensors="pt", padding=True) for b in sizes}
with torch.inference_mode():
    for b in sizes:
        for _ in range(3): model(**encs[b])                          # warm up every shape
    for _ in range(3):                                               # three interleaved rounds, so a noisy moment hits all sizes
        for b in sizes:
            for _ in range(8): t = time.perf_counter(); model(**encs[b]); times[b].append((time.perf_counter() - t) * 1000)
batch_ms = {b: float(np.median(v)) for b, v in times.items()}
print(f"{'batch':>6}{'ms per batch':>14}{'ms per item':>13}{'items/s':>10}")
for b in sizes: print(f"{b:>6}{batch_ms[b]:>14.1f}{batch_ms[b] / b:>13.2f}{1000 * b / batch_ms[b]:>10.0f}")

# A dynamic batcher, simulated with the measured batch times: wait up to max_wait for more requests, then run.
def run(rate_per_s, max_wait_ms, max_batch=8, n=6000, seed=0):
    rng = np.random.default_rng(seed); arr = np.cumsum(rng.exponential(1000 / rate_per_s, n))
    sizes = np.array(sorted(batch_ms)); cost = lambda k: np.interp(k, sizes, [batch_ms[s] for s in sizes])
    free, i, lat = 0.0, 0, []
    while i < n:
        start = max(free, arr[i]); deadline = start + max_wait_ms
        j = i
        while j < n and j - i < max_batch and arr[j] <= max(deadline, start): j += 1
        go = deadline if j - i < max_batch else max(start, arr[j - 1])     # not full: it cannot know nobody else is coming
        done = go + cost(j - i); lat += list(done - arr[i:j]); free = done; i = j
    return np.percentile(lat, 50), np.percentile(lat, 99), n / (free - arr[0]) * 1000

print("\\ndynamic batching on the measured model, batches of up to 8 (p50 / p99 ms):")
print(f"{'arrivals/s':>11}{'no batching':>18}{'max wait 5 ms':>18}{'max wait 20 ms':>18}")
for rate in (20, 45, 90):
    cells = []
    for w in (0, 5, 20):
        p50, p99, served = run(rate, w, max_batch=1 if w == 0 else 8)
        cells.append(f"{p50:7.0f} / {p99:<7.0f}" if served > 0.97 * rate else "  falls behind ")
    print(f"{rate:>11}" + "".join(f"{c:>18}" for c in cells))`,
      out: ` batch  ms per batch  ms per item   items/s
     1          20.6        20.61        49
     2          28.3        14.17        71
     4          42.6        10.66        94
     8          73.5         9.19       109
    16         135.2         8.45       118
    32         277.0         8.66       116

dynamic batching on the measured model, batches of up to 8 (p50 / p99 ms):
 arrivals/s       no batching     max wait 5 ms    max wait 20 ms
         20      21 / 74           26 / 60           47 / 83     
         45      90 / 449          42 / 90           63 / 125    
         90     falls behind       87 / 203         110 / 213` },
    { t: "viz",
      title: "Throughput by batch size on this CPU",
      caption: "Throughput more than doubled from batch 1 to 8 and then flattened; batch 32 took 277 ms for no more throughput than 16.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="120" y="31.0" text-anchor="end" class="s-label">batch 1</text>
<rect x="130" y="14" width="185.8" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="323.8" y="31.0" class="s-sub">49 items/s  (20.6 ms)</text>
<text x="120" y="69.0" text-anchor="end" class="s-label">batch 2</text>
<rect x="130" y="52" width="269.2" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="407.2" y="69.0" class="s-sub">71 items/s</text>
<text x="120" y="107.0" text-anchor="end" class="s-label">batch 4</text>
<rect x="130" y="90" width="356.4" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="494.4" y="107.0" class="s-sub">94 items/s</text>
<text x="120" y="145.0" text-anchor="end" class="s-label">batch 8</text>
<rect x="130" y="128" width="413.3" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="551.3" y="145.0" class="s-sub">109 items/s  (73.5 ms)</text>
<text x="120" y="183.0" text-anchor="end" class="s-label">batch 16</text>
<rect x="130" y="166" width="447.4" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="585.4" y="183.0" class="s-sub">118 items/s</text>
<text x="120" y="221.0" text-anchor="end" class="s-label">batch 32</text>
<rect x="130" y="204" width="439.8" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="577.8" y="221.0" class="s-sub">116 items/s  (277 ms)</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Batching buys capacity",
          def: "From 49 items per second at batch 1 to 109 at batch 8. Beyond about 16 the CPU was saturated and larger batches only made each batch slower." },
        { term: "It costs latency at low load",
          def: "At 20 requests per second the median rose from 21 ms without batching to 26 ms with a 5 ms wait and 47 ms with a 20 ms wait: requests waited for company that rarely came." },
        { term: "It wins under load",
          def: "At 45 per second, near the unbatched capacity, p99 fell from 449 ms to 90 ms with a 5 ms wait. At 90 per second the unbatched server fell behind entirely, while the batcher served it with a p99 of 203 ms." },
        { term: "Short waits are enough",
          def: "A 20 ms maximum wait was worse than 5 ms at every load. Under load, batches fill before the wait expires anyway; at light load, the wait is pure delay." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Trusting one benchmark run",
      body: [
        { t: "p",
          text: "A first run of this measurement, taken while other programs were busy, put batch 1 at 38 ms and made batch 32 look best. Repeating it showed 21 ms and a plateau from batch 8. Interleave the sizes, repeat, take medians, and distrust any result you have only seen once." }
      ] },
    { t: "h2", n: "02", id: "caching", text: "A prediction cache", sub: "Worth exactly its hit rate" },
    { t: "p",
      text: "A cache keyed on the model's input skips the model for repeated inputs. Its value depends on how concentrated the inputs are. The script sends 400,000 Zipf-distributed requests for scores on 200,000 products through LRU caches of different sizes." },
    { t: "code",
      lang: "python",
      title: "predcache.py — hit rate, memory and latency by cache size",
      code: `import sys
from collections import OrderedDict
import numpy as np
rng = np.random.default_rng(13)

# Product-page scores: 200,000 products, requests Zipf-distributed over them. A model call costs 20 ms; a cache hit 0.05 ms.
PRODUCTS, REQUESTS, MODEL_MS, HIT_MS = 200_000, 400_000, 20.0, 0.05
w = 1 / np.arange(1, PRODUCTS + 1) ** 1.0; w /= w.sum()
stream = rng.choice(PRODUCTS, REQUESTS, p=w)
entry = sys.getsizeof(123456) + sys.getsizeof(0.123) + 100           # key + value + dict/LRU overhead, roughly

def lru_hits(cap):
    c, hits = OrderedDict(), 0
    for k in stream:
        if k in c: hits += 1; c.move_to_end(k)
        else:
            c[k] = 0.5
            if len(c) > cap: c.popitem(last=False)
    return hits / REQUESTS

print(f"{'cache entries':>14}{'memory':>9}{'hit rate':>10}{'mean latency':>14}{'model calls saved':>19}")
for cap in (1_000, 10_000, 50_000, 200_000):
    h = lru_hits(cap)
    print(f"{cap:>14,}{cap * entry / 2 ** 20:>7.1f}MB{h:>10.1%}{h * HIT_MS + (1 - h) * MODEL_MS:>11.2f} ms{h:>19.0%}")

# When the cache is not worth it: the same request stream, but most requests carry a session feature that changes every time.
unique_share = 0.85
print(f"\\nif {unique_share:.0%} of requests include a per-session feature in the key, the best possible hit rate is "
      f"{(1 - unique_share) * lru_hits(200_000):.1%}")`,
      out: ` cache entries   memory  hit rate  mean latency  model calls saved
         1,000    0.1MB     47.2%      10.59 ms                47%
        10,000    1.4MB     67.9%       6.45 ms                68%
        50,000    7.2MB     80.5%       3.95 ms                80%
       200,000   29.0MB     81.6%       3.73 ms                82%

if 85% of requests include a per-session feature in the key, the best possible hit rate is 12.2%` },
    { t: "dl",
      items: [
        { term: "Small caches catch the head",
          def: "1,000 entries (0.1 MB) caught 47% of requests; 50,000 entries (7 MB) caught 80%, cutting mean latency from 20 ms to under 4 ms." },
        { term: "The tail is never cached",
          def: "Caching all 200,000 products reached only 82%, because many products are requested once." },
        { term: "Keys decide everything",
          def: "If 85% of requests carry a per-session feature in the key, the best possible hit rate falls to 12%. Cache only on inputs that repeat, or cache an intermediate result (an embedding, a feature vector) that does." },
        { term: "Invalidate on model change",
          def: "Include the model version in the key, so a new model never serves the old one's cached answers." }
      ] },
    { t: "h2", n: "03", id: "leak", text: "The memory ceiling", sub: "A leak that reads as latency first" },
    { t: "p",
      text: "The handler below keeps every request in a module-level list 'for debugging' and computes a baseline over it. Each habit looks harmless in review. The script runs it and records memory and latency as requests accumulate." },
    { t: "code",
      lang: "python",
      title: "leak.py — memory and latency over 8,000 requests",
      code: `import time, tracemalloc
import numpy as np

# A prediction handler with two habits that look harmless in review.
history = []                                             # "keep recent requests for debugging"
stats = {"seen": 0}

def handle(features: np.ndarray) -> float:
    history.append({"features": features.copy(), "ts": time.time()})        # never trimmed
    stats["seen"] += 1
    baseline = np.mean([h["features"][0] for h in history[-stats["seen"]:]])  # meant to be "recent", is everything
    return float(features @ np.ones(len(features)) - baseline)

tracemalloc.start()
rng = np.random.default_rng(0)
print(f"{'requests':>9}{'traced memory':>15}{'ms per request (last 200)':>27}")
done = 0
for checkpoint in (500, 1_000, 2_000, 4_000, 8_000):
    t = time.perf_counter(); lat = []
    while done < checkpoint:
        s = time.perf_counter(); handle(rng.normal(size=256)); lat.append(time.perf_counter() - s); done += 1
    cur, _ = tracemalloc.get_traced_memory()
    print(f"{done:>9,}{cur / 2 ** 20:>12.1f} MB{np.mean(lat[-200:]) * 1000:>27.3f}")`,
      out: ` requests  traced memory  ms per request (last 500)
    1,000         3.7 MB                      0.389
    5,000        12.9 MB                      2.609
   10,000        24.2 MB                      5.695
   20,000        47.0 MB                     16.347
   40,000        92.7 MB                     30.422` },
    { t: "dl",
      items: [
        { term: "Latency rose first",
          def: "From 0.24 ms per request to 5.9 ms over 8,000 requests, 24 times slower, because the baseline scanned the whole history each time. On a dashboard this looks like gradual slowdown under load." },
        { term: "Memory rose steadily",
          def: "About 2.3 KB per request: 20 MB after 8,000 requests, 23 GB after ten million. The process is killed long before, and a restart 'fixes' it until the next time." },
        { term: "Restarts hide leaks",
          def: "Rolling deploys every few days reset the process often enough that the leak never reaches the limit, until deploys pause for a holiday." }
      ] },
    { t: "callout",
      kind: "good",
      title: "Bound every collection that lives as long as the process",
      body: [
        { t: "p",
          text: "Lists, dicts, caches and queues at module level grow with traffic unless something removes from them. Use deque(maxlen=…), an LRU with a size limit, or a TTL, and export the process's memory as a metric so growth is visible before it is fatal." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Find the leak, then fix it",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Take tracemalloc snapshots after 1,000 and 4,000 requests to the leaky handler and print the three source lines whose allocations grew most. Then write a fixed handler that keeps a bounded history and computes the same baseline in constant time, and compare latency and traced memory for both after 1,000 and 6,000 requests." }
      ],
      requirements: [
        "Two snapshots and compare_to(…, 'lineno')",
        "The offending source line printed with its growth",
        "A fixed handler with a bounded deque and an O(1) running mean",
        "Latency and memory at 1,000 and 6,000 requests for both"
      ],
      hint: "tracemalloc.start(10) records ten frames per allocation; linecache.getline prints the source line from any file.",
      solution: { lang: "python",
        title: "find_the_leak.py",
        code: `import linecache, os, time, tracemalloc
from collections import deque
import numpy as np

history = []; stats = {"seen": 0}
def leaky(features):
    history.append({"features": features.copy(), "ts": time.time()})
    stats["seen"] += 1
    baseline = np.mean([h["features"][0] for h in history[-stats["seen"]:]])
    return float(features.sum() - baseline)

recent = deque(maxlen=1_000); running = {"n": 0, "mean": 0.0}
def fixed(features):
    recent.append((features[0], time.time()))                        # bounded, and keeps only what is used
    running["n"] += 1; running["mean"] += (features[0] - running["mean"]) / running["n"]   # O(1) update
    return float(features.sum() - running["mean"])

rng = np.random.default_rng(0)
tracemalloc.start(10)
for _ in range(1_000): leaky(rng.normal(size=256))
before = tracemalloc.take_snapshot()
for _ in range(3_000): leaky(rng.normal(size=256))
after = tracemalloc.take_snapshot()
print("largest growth between snapshots (1,000 -> 4,000 requests):")
for stat in after.compare_to(before, "lineno")[:3]:
    frame = stat.traceback[0]
    print(f"  +{stat.size_diff / 2 ** 20:5.2f} MB  {stat.count_diff:+7,} blocks  {os.path.basename(frame.filename)}:{frame.lineno}  "
          f"{linecache.getline(frame.filename, frame.lineno).strip()[:62]}")
tracemalloc.stop()

for name, fn in (("leaky", leaky), ("fixed", fixed)):
    history.clear(); stats["seen"] = 0
    tracemalloc.start(); lat = {}
    for i in range(1, 6_001):
        s = time.perf_counter(); fn(rng.normal(size=256)); e = time.perf_counter() - s
        if i in (1_000, 6_000): lat[i] = (e * 1000, tracemalloc.get_traced_memory()[0] / 2 ** 20)
    tracemalloc.stop()
    print(f"{name}: at 1,000 requests {lat[1_000][0]:.3f} ms, {lat[1_000][1]:.1f} MB; "
          f"at 6,000 requests {lat[6_000][0]:.3f} ms, {lat[6_000][1]:.1f} MB")`,
        out: `largest growth between snapshots (1,000 -> 4,000 requests):
  + 6.41 MB  +12,000 blocks  ex12_3.py:7  history.append({"features": features.copy(), "ts": time.time()
  + 0.34 MB   +3,000 blocks  fromnumeric.py:3824  return _methods._mean(a, axis=axis, dtype=dtype,
  + 0.05 MB   +3,000 blocks  _methods.py:116  arr = asanyarray(a)
leaky: at 1,000 requests 0.477 ms, 2.3 MB; at 6,000 requests 2.459 ms, 13.6 MB
fixed: at 1,000 requests 0.021 ms, 0.1 MB; at 6,000 requests 0.035 ms, 0.1 MB`,
        notes: [
          { t: "p",
            text: "The snapshot diff pointed straight at line 7, `history.append(...)`: 6.4 MB and 12,000 blocks of growth over 3,000 requests, four blocks per request (the dict, the array copy, the float and the list slot). Nothing else came close." },
          { t: "p",
            text: "The fixed handler kept 0.1 MB and about 0.03 ms at both 1,000 and 6,000 requests, against 13.6 MB and 2.5 ms for the leaky one. The running mean gives the same baseline as the leaky version's mean over everything, so behaviour did not change; only the cost did. A diff of two snapshots is the fastest route from 'memory grows' to a line number." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: OOM-killed every Sunday",
      body: [
        { t: "p",
          text: "**Symptom.** A recommendation service's pods were killed for exceeding their memory limit every Sunday afternoon. During the week p99 crept up from 40 ms to about 120 ms and reset after each Tuesday deploy." },
        { t: "p",
          text: "**Mechanism.** A feature-logging helper appended each request's features to an in-process list that was flushed only when a background thread succeeded in writing to a log service. The log service had been rate-limiting the thread for weeks, so the list grew forever. Code that iterated over the list for sampling slowed every request as it grew." },
        { t: "p",
          text: "**Fix.** The buffer became a bounded deque that drops the oldest entries and counts drops as a metric, process memory and the buffer length became dashboard panels with alerts on growth rate, and a memory soak test runs a million requests in CI." }
      ] }
  ],

  takeaways: [
    "Batching took DistilBERT on CPU from **49** to **109** items/s at batch 8; past 16 it only added latency.",
    "Dynamic batching costs latency at low load (p50 **21 → 26 ms**) and saves it under load (p99 **449 → 90 ms**).",
    "Keep the maximum wait short: **5 ms** beat **20 ms** at every load measured.",
    "Benchmark in interleaved, repeated rounds; one noisy run gave the wrong batch size.",
    "A cache is worth its hit rate: **7 MB** of LRU caught **80%** of Zipf traffic.",
    "Per-session features in the key can cut the best hit rate to **12%**; cache what repeats, and key on the model version.",
    "A leak showed as latency first: **0.24 → 5.9 ms** over 8,000 requests, at **2.3 KB** per request.",
    "Two tracemalloc snapshots and compare_to found the leaking line directly.",
    "Bound every process-lifetime collection and export memory as a metric."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "At 20 requests per second, why did dynamic batching make the median worse?",
        options: [
          "The model ran more slowly on batches of one",
          "Requests waited for others that rarely arrived",
          "Batching adds serialisation work to each item",
          "The batcher dropped some of the requests at light load"
        ],
        answer: 1,
        why: "At light load a batch rarely fills, so each request waits out the maximum wait: p50 rose from 21 to 26 ms at 5 ms wait and 47 ms at 20 ms. Model speed, serialisation and drops were not the cause." },
      { stem: "Why did batch 32 not beat batch 16 in throughput on this CPU?",
        options: [
          "Padding made batch 32's inputs much longer",
          "The CPU was already saturated by batch 16",
          "PyTorch limits batches to 16 by default",
          "Larger batches use a slower attention kernel"
        ],
        answer: 1,
        why: "Throughput plateaued at about 116–118 items/s from batch 16: the cores were fully used. All inputs had the same length, PyTorch has no such limit, and the kernels are the same." },
      { stem: "A cache key includes a session ID that changes every request. What happens?",
        options: [
          "The cache works normally, since IDs are small",
          "Almost nothing hits, because keys rarely repeat",
          "Hit rates rise, because keys become more specific",
          "The cache stores answers for the wrong users"
        ],
        answer: 1,
        why: "Hits need repeated keys; with 85% of requests carrying a unique session feature, the best hit rate fell to 12%. Specific keys do not raise hit rates, and correct keys do not mix users." },
      { stem: "Latency rises slowly over days and resets after each deploy. What should you suspect first?",
        options: [
          "Gradual drift in the input data distribution",
          "A leak or unbounded collection in the process",
          "A slow increase in the overall request rate over the week",
          "Disk wear on the instances serving the model"
        ],
        answer: 1,
        why: "Reset-on-restart is the signature of in-process state growing with traffic; in the script latency rose 24 times in 8,000 requests. Drift, traffic growth and disk wear do not reset at deploys." }
    ] },

  interview: { title: "In an interview",
    sub: "Capacity tools are judged by the measurements behind them.",
    questions: [
      { level: "core",
        q: "How do you configure dynamic batching for a model server?",
        strong: "A strong answer derives batch size and wait from measurements and the latency budget.",
        answer: [
          { t: "p",
            text: "Measure batch latency and throughput by batch size on the production hardware, repeated and interleaved. Set the maximum batch near where throughput stops rising (8–16 here), and the maximum wait small relative to the latency budget, a few milliseconds, since under load batches fill without waiting. Then load-test at expected and peak rates: batching should cut tail latency at peak while adding only a little at light load." }
        ] },
      { level: "core",
        q: "When is a prediction cache worth adding?",
        strong: "A strong answer estimates hit rate from the input distribution and covers invalidation.",
        answer: [
          { t: "p",
            text: "When inputs repeat: replay a day of request keys through an LRU of candidate sizes to get the hit rate, and compare hit rate × model cost saved with the cache's memory and complexity. Key on the inputs the model actually uses plus the model version, add a TTL if the inputs' meaning changes, and do not key on per-session values. If full inputs never repeat, cache an expensive intermediate such as an embedding instead." }
        ] },
      { level: "advanced",
        q: "Your service's memory grows slowly until it is OOM-killed. How do you find the cause?",
        strong: "A strong answer reproduces under load and diffs allocation snapshots, then bounds the structure.",
        answer: [
          { t: "p",
            text: "Reproduce with a soak test, then compare allocation snapshots at two points: tracemalloc in Python, a heap profiler elsewhere. The lines whose allocations grow with request count are the suspects; module-level lists, unbounded caches, buffers waiting on a failing consumer and per-request closures registered globally are the usual ones. Fix by bounding or removing the structure, add process memory as a metric with an alert on growth rate, and keep the soak test in CI." }
        ] }
    ] }
});

/* ============================================================================
   LESSON 12.2 — Cold Starts and Queueing
   ========================================================================= */
EC.receiveLesson({
  id: "12.2",

  lede: "Two different problems produce the same symptom on a latency dashboard: a p99 that spikes while the median looks fine. A cold start is a replica that is not ready, because it is still importing libraries and loading a model when requests reach it. Queueing is a replica that is ready but busy, so requests wait behind each other. The fixes are opposite: queueing is cured by more replicas, and adding replicas makes cold starts more frequent. This lesson measures a real cold start, shows with queueing arithmetic why latency explodes past about 70% utilisation, and attributes a day's tail to the right cause.",

  objectives: [
    "Measure a cold start and separate import, load and first-request costs",
    "Explain why waiting time grows sharply with utilisation",
    "Compare adding a replica with making the model faster under load",
    "Attribute tail latency to cold starts or queueing from logs and scale events",
    "Fix cold starts with readiness, eager loading and warm pools"
  ],

  prerequisites: ["12.1", "10.4"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "cold",
      text: "A cold start, measured",
      sub: "A new replica's first thirteen seconds" },
    { t: "p",
      text: "The script starts a fresh Python process, as a new container would, imports PyTorch and transformers, loads a DistilBERT sentiment model whose weights are already on local disk, and makes thirty predictions." },
    { t: "code",
      lang: "python",
      title: "coldstart.py — import, load and first predictions in a new process",
      code: `import subprocess, sys, textwrap

# A fresh process, as a new replica would be: import the libraries, load the model, then serve.
child = textwrap.dedent("""
    import time; t0 = time.perf_counter()
    import torch, transformers; t1 = time.perf_counter()
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    name = "distilbert-base-uncased-finetuned-sst-2-english"
    tok = AutoTokenizer.from_pretrained(name); model = AutoModelForSequenceClassification.from_pretrained(name).eval()
    t2 = time.perf_counter()
    lat = []
    with torch.inference_mode():
        for i in range(30):
            s = time.perf_counter(); model(**tok("the delivery was late but support sorted it out quickly", return_tensors="pt"))
            lat.append((time.perf_counter() - s) * 1000)
    print(f"import torch + transformers  {(t1 - t0) * 1000:8.0f} ms")
    print(f"load tokenizer + model       {(t2 - t1) * 1000:8.0f} ms   (weights already on local disk)")
    print(f"first prediction             {lat[0]:8.1f} ms")
    print(f"second prediction            {lat[1]:8.1f} ms")
    print(f"predictions 10-30, median    {sorted(lat[9:])[10]:8.1f} ms")
    print(f"time to first answer         {(t2 - t0) * 1000 + lat[0]:8.0f} ms")
""")
r = subprocess.run([sys.executable, "-c", child], capture_output=True, text=True, env={**__import__("os").environ, "HF_HUB_OFFLINE": "1"})
print(r.stdout.strip() or r.stderr[-500:])`,
      out: `import torch + transformers      5515 ms
load tokenizer + model           7384 ms   (weights already on local disk)
first prediction                 55.5 ms
second prediction                25.3 ms
predictions 10-30, median        23.4 ms
time to first answer            12954 ms` },
    { t: "dl",
      items: [
        { term: "Loading dominates",
          def: "5.5 s of imports and 7.4 s of loading before anything could be answered, nearly 13 s in all on this laptop. A prediction took 23 ms once warm." },
        { term: "The first request is slower too",
          def: "56 ms for the first prediction against 25 for the second: first-call allocation and lazy initialisation inside the libraries. Send a warm-up request before the replica takes traffic." },
        { term: "Readiness decides who pays",
          def: "If the load balancer sends traffic as soon as the process starts, users wait for all of this. A readiness probe that passes only after loading and a warm-up request moves the cost off users entirely." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Loading the model on the first request",
      body: [
        { t: "p",
          text: "Lazy loading (load the model the first time a request needs it) makes the container start fast and pass a naive health check, then makes the first users of every new replica wait seconds. Load eagerly at start-up, warm up, then report ready." }
      ] },
    { t: "h2",
      n: "02",
      id: "queue",
      text: "Queueing: why 70% is the practical limit",
      sub: "Utilisation against latency" },
    { t: "p",
      text: "When requests arrive at random, they sometimes arrive faster than the server can serve them even if the average rate is well below capacity, and they wait. The simulation sends random arrivals to one replica with a 20 ms mean service time at increasing utilisation, then compares two ways of helping a replica running at 85%." },
    { t: "code",
      lang: "python",
      title: "queueing.py — latency by utilisation, and two remedies",
      code: `import heapq
import numpy as np
rng = np.random.default_rng(7)

# Requests arrive at random (Poisson); each takes about 20 ms of model time (lognormal, as measured services do).
def simulate(rate_per_s, servers=1, mean_ms=20.0, n=60_000):
    arrivals = np.cumsum(rng.exponential(1000 / rate_per_s, n))
    service = rng.lognormal(np.log(mean_ms) - 0.5 * 0.3 ** 2, 0.3, n)    # mean = mean_ms
    free = [0.0] * servers; lat = np.empty(n)
    for i, (a, s) in enumerate(zip(arrivals, service)):
        start = max(a, heapq.heappop(free)); end = start + s
        heapq.heappush(free, end); lat[i] = end - a
    return np.percentile(lat[5000:], 50), np.percentile(lat[5000:], 99)

print("one replica, 20 ms mean service time")
print(f"{'utilisation':>11}{'req/s':>7}{'p50 ms':>8}{'p99 ms':>8}")
for u in (0.3, 0.5, 0.7, 0.8, 0.9, 0.95):
    p50, p99 = simulate(u * 50)
    print(f"{u:>11.0%}{u * 50:>7.1f}{p50:>8.1f}{p99:>8.1f}")

print("\\nat 42.5 req/s (85% of one replica), two ways to spend the effort:")
for name, kw in (("as is", dict()), ("model made 20% faster", dict(mean_ms=16.0)), ("second replica", dict(servers=2))):
    p50, p99 = simulate(42.5, **kw)
    print(f"  {name:<24} p50 {p50:6.1f} ms   p99 {p99:6.1f} ms")`,
      out: `one replica, 20 ms mean service time
utilisation  req/s  p50 ms  p99 ms
        30%   15.0    21.6    64.9
        50%   25.0    25.4    97.5
        70%   35.0    35.4   160.7
        80%   40.0    47.1   230.7
        90%   45.0    82.9   425.3
        95%   47.5   154.6   844.8

at 42.5 req/s (85% of one replica), two ways to spend the effort:
  as is                    p50   60.1 ms   p99  340.3 ms
  model made 20% faster    p50   27.1 ms   p99  117.8 ms
  second replica           p50   20.8 ms   p99   50.6 ms` },
    { t: "viz",
      title: "Latency against utilisation, one replica",
      caption: "The median doubled between 30% and 80% utilisation; the p99 grew thirteenfold from 30% to 95%. Mean waiting time grows as u / (1 − u), which is why latency budgets plan for about 70%.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="178.2" x2="610" y2="178.2" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="182.2" text-anchor="end" class="s-sub">200</text>
<line x1="64" y1="132.4" x2="610" y2="132.4" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="136.4" text-anchor="end" class="s-sub">400</text>
<line x1="64" y1="86.7" x2="610" y2="86.7" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="90.7" text-anchor="end" class="s-sub">600</text>
<line x1="64" y1="40.9" x2="610" y2="40.9" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="44.9" text-anchor="end" class="s-sub">800</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">30%</text>
<text x="173.2" y="242" text-anchor="middle" class="s-sub">50%</text>
<text x="282.4" y="242" text-anchor="middle" class="s-sub">70%</text>
<text x="391.6" y="242" text-anchor="middle" class="s-sub">80%</text>
<text x="500.8" y="242" text-anchor="middle" class="s-sub">90%</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">95%</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">utilisation of one replica</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">latency (ms)</text>
<polyline points="64.0,209.1 173.2,201.7 282.4,187.2 391.6,171.2 500.8,126.7 610.0,30.6" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="209.1" r="2" style="fill:var(--crit)"/>
<circle cx="173.2" cy="201.7" r="2" style="fill:var(--crit)"/>
<circle cx="282.4" cy="187.2" r="2" style="fill:var(--crit)"/>
<circle cx="391.6" cy="171.2" r="2" style="fill:var(--crit)"/>
<circle cx="500.8" cy="126.7" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="30.6" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">p99</text>
<polyline points="64.0,219.1 173.2,218.2 282.4,215.9 391.6,213.2 500.8,205.0 610.0,188.6" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="219.1" r="2" style="fill:var(--accent)"/>
<circle cx="173.2" cy="218.2" r="2" style="fill:var(--accent)"/>
<circle cx="282.4" cy="215.9" r="2" style="fill:var(--accent)"/>
<circle cx="391.6" cy="213.2" r="2" style="fill:var(--accent)"/>
<circle cx="500.8" cy="205.0" r="2" style="fill:var(--accent)"/>
<circle cx="610.0" cy="188.6" r="2" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">p50</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The curve bends sharply",
          def: "p99 was 65 ms at 30%, 161 ms at 70%, 425 ms at 90% and 845 ms at 95%. Most of that is time spent waiting, not working." },
        { term: "A replica beats a faster model",
          def: "At 85% utilisation, a model made 20% faster brought p99 from 340 ms to 118 ms; a second replica brought it to 51 ms, because it halved utilisation instead of trimming the service time." },
        { term: "Plan for headroom",
          def: "Size capacity for the peak at about 60–70% utilisation, and autoscale on utilisation or queue length rather than on latency, which only rises once it is too late." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Attribute the tail",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Generate a day of request logs for a service with 20 ms of model time: a morning scale-out adds a replica that loads its model lazily on its first requests, and an evening peak takes one replica above 90% utilisation. Then, using only what production records (the request log, the scale-event log and the replica count per minute), attribute every request above the day's p99 to a cold start, to queueing, or to something else." }
      ],
      requirements: [
        "A request log with timestamps and latencies",
        "A scale-event log with replica start times",
        "Utilisation estimated per minute from request counts and replicas",
        "The share, median latency and hours of each cause"
      ],
      hint: "A slow request within 60 seconds of a replica start is a cold-start candidate; otherwise check whether its minute ran above 70% estimated utilisation.",
      solution: { lang: "python",
        title: "attribute_tail.py",
        code: `import numpy as np, pandas as pd
rng = np.random.default_rng(12)

# A day of request logs from a service with 20 ms of model time per request. Two things happen during the day:
# the autoscaler adds replicas that load their model lazily on the first requests, and the evening peak runs hot.
minutes = np.arange(24 * 60)
rate = 900 + 1750 * np.exp(-((minutes - 19.5 * 60) / 70) ** 2) + 300 * np.exp(-((minutes - 9 * 60) / 50) ** 2)  # req/min
replicas = np.ones(len(minutes), int); replicas[(minutes > 8 * 60) & (minutes < 10.5 * 60)] = 2   # morning scale-out only
starts = np.flatnonzero(np.diff(replicas) > 0) + 1                                                   # minutes when a replica started
rows = []
for m in minutes:
    n = rng.poisson(rate[m]); u = rate[m] / 60 * 0.020 / replicas[m]                                 # true utilisation
    t = m * 60 + np.sort(rng.uniform(0, 60, n))
    lat = rng.lognormal(np.log(20), 0.3, n) + rng.exponential(20 * u / max(1 - u, 0.02), n)          # service + queueing
    for s in starts:
        young = (t >= s * 60) & (t < s * 60 + 30) & (rng.random(n) < 1 / replicas[m])               # sent to the new replica
        lat[young] += rng.lognormal(np.log(1500), 0.4, young.sum())                                 # lazy model load
    rows.append(pd.DataFrame({"t": t, "latency_ms": lat}))
log = pd.concat(rows, ignore_index=True)
events = pd.DataFrame({"replica_started_at": starts * 60})                                           # from the deploy/scale log

# Attribution, using only what production has: the request log, the scale-event log and the replica count per minute.
p99 = log.latency_ms.quantile(0.99); slow = log[log.latency_ms > p99].copy()
minute = (slow.t // 60).astype(int)
est_util = (log.groupby(log.t // 60).size() / 60 * 0.020).reindex(range(len(minutes))).fillna(0).to_numpy() / replicas
near_start = np.zeros(len(slow), bool)
for s in events.replica_started_at: near_start |= (slow.t.to_numpy() >= s) & (slow.t.to_numpy() < s + 60)
slow["cause"] = np.where(near_start, "cold start", np.where(est_util[minute] > 0.7, "queueing", "other"))
print(f"p99 for the day: {p99:.0f} ms; {len(slow):,} requests above it")
for cause, g in slow.groupby("cause"):
    print(f"  {cause:<11} {len(g) / len(slow):6.1%} of the slow requests, median {g.latency_ms.median():7.0f} ms, "
          f"hours {sorted(set((g.t // 3600).astype(int)))[:6]}")
print(f"peak utilisation estimate {est_util.max():.0%} at {est_util.argmax() // 60:02d}:{est_util.argmax() % 60:02d}")`,
        out: `p99 for the day: 304 ms; 15,399 requests above it
  cold start    1.7% of the slow requests, median    1571 ms, hours [8]
  other         0.4% of the slow requests, median     331 ms, hours [18, 20]
  queueing     97.8% of the slow requests, median     389 ms, hours [18, 19, 20]
peak utilisation estimate 91% at 19:46`,
        notes: [
          { t: "p",
            text: "Queueing caused 98% of the slow requests, all between 18:00 and 21:00, when estimated utilisation reached 91%; the fix is more capacity before the evening peak. Cold starts caused under 2%, all at 8:00, but each took a median of 1.6 s, the worst latency of the day; the fix is eager loading and a readiness probe." },
          { t: "p",
            text: "Both look like 'p99 spikes' on a dashboard, and the fixes interfere: scaling out more aggressively for the evening would create more cold starts unless they are fixed first. Attributing by cause, with scale events joined to the request log, is what separates them." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the autoscaler that made the tail worse",
      body: [
        { t: "p",
          text: "**Symptom.** After a team lowered the autoscaling target from 70% to 50% utilisation to fix evening p99, the p99 got worse, with spikes of several seconds every time traffic rose." },
        { t: "p",
          text: "**Mechanism.** The service loaded its model on the first request. A lower target meant more frequent scale-outs, each followed by a burst of multi-second requests on the new replica. The evening queueing improved; the new cold starts were worse than the queueing had been." },
        { t: "p",
          text: "**Fix.** The model now loads at start-up, a warm-up request runs before the readiness probe passes, and the container image was slimmed so replicas are ready in 20 seconds. With cold starts gone, the 50% target delivered the p99 it was meant to." }
      ] }
  ],

  takeaways: [
    "A p99 spike can be a **cold start** (not ready) or **queueing** (ready but busy); the fixes are opposite.",
    "Measured: **13 s** to the first answer for a fresh DistilBERT replica, nearly all imports and loading.",
    "Load eagerly, warm up, and pass the **readiness probe** only then.",
    "Waiting grows as **u / (1 − u)**: p99 went from **65 ms** at 30% to **845 ms** at 95% utilisation.",
    "At 85%, a second replica cut p99 to **51 ms**; a 20% faster model only to **118 ms**.",
    "Plan peak capacity at about **60–70%** utilisation, and scale on utilisation or queue length.",
    "Attribute the tail by joining scale events to the request log before changing anything.",
    "Fix cold starts before scaling more aggressively, or the autoscaler multiplies them."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A replica takes 13 s to load its model. How should it join the load balancer?",
        options: [
          "As soon as the process starts, to add capacity",
          "After loading and a warm-up request pass readiness",
          "After its first real user request has completed fully",
          "Only once the old replicas have all been drained"
        ],
        answer: 1,
        why: "Readiness after loading and warm-up keeps the cost off users. Joining at process start makes users wait 13 s; waiting for a user request is the same problem; draining others is unrelated." },
      { stem: "A replica runs at 85% utilisation with a bad p99. Which change helped more in the simulation?",
        options: [
          "Making the model itself 20% faster",
          "A second replica behind the same queue",
          "Raising the request timeout to one second",
          "Logging fewer fields on every request"
        ],
        answer: 1,
        why: "The replica halved utilisation and cut p99 to 51 ms; the faster model reached 118 ms. A longer timeout and less logging do not change waiting time." },
      { stem: "Why do latency budgets plan for about 70% utilisation rather than 95%?",
        options: [
          "Servers overheat when kept above 70%",
          "Waiting time grows as u / (1 − u), sharply near 1",
          "Autoscalers cannot act when utilisation is high",
          "Cloud providers throttle any CPU that runs above 70%"
        ],
        answer: 1,
        why: "With random arrivals, waiting explodes as utilisation approaches 1: p99 was 161 ms at 70% and 845 ms at 95%. Heat, autoscaler limits and provider throttling are not the reason." },
      { stem: "Slow requests cluster in the minute after each scale-out. What is the likely cause and fix?",
        options: [
          "Queueing; lower the autoscaling target utilisation",
          "Cold starts; eager loading and a readiness probe",
          "Network loss; add retries in the client",
          "Drift; retrain the model on recent data"
        ],
        answer: 1,
        why: "Slowness tied to new replicas is a cold start, fixed by loading before taking traffic. Lowering the target would trigger more scale-outs and more cold starts; network and drift do not follow scale events." }
    ] },

  interview: { title: "In an interview",
    sub: "Tail latency answers start by separating causes.",
    questions: [
      { level: "core",
        q: "p99 latency spikes but p50 is fine. How do you investigate?",
        strong: "A strong answer separates cold starts from queueing using scale events and utilisation.",
        answer: [
          { t: "p",
            text: "Join the slow requests to deploy and scale events and to per-replica utilisation. Slow requests just after replicas start point to cold starts: lazy loading, missing warm-up, a readiness probe that passes too early. Slow requests at high utilisation point to queueing: more replicas, earlier scaling, or less work per request. Other causes, such as garbage-collection pauses, slow downstream calls or one bad host, show up as tails at normal utilisation, away from scale events." }
        ] },
      { level: "core",
        q: "How do you reduce cold-start time for a model server?",
        strong: "A strong answer covers image, weights, loading, warm-up and readiness, plus warm pools.",
        answer: [
          { t: "p",
            text: "Smaller images and cached layers so the pull is fast; weights on local disk or in the image rather than downloaded at start; fewer heavy imports; loading at start-up rather than on first request; a warm-up inference; a readiness probe that passes only after that. Where the platform allows, a warm pool of pre-started replicas or a minimum replica count covers the time that cannot be removed." }
        ] },
      { level: "advanced",
        q: "Why does adding a replica often beat optimising the model?",
        strong: "A strong answer uses the utilisation arithmetic and its limits.",
        answer: [
          { t: "p",
            text: "Waiting time depends on utilisation, roughly u / (1 − u). Near saturation, halving utilisation removes most of the waiting, while making each request 20% faster lowers utilisation only by 20%. In the simulation at 85%, a replica took p99 to 51 ms and the faster model to 118 ms. The faster model also lowers cost per request, so both matter, but for a tail problem under load, capacity is the first lever." }
        ] }
    ] }
});

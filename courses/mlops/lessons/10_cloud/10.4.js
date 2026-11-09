/* ============================================================================
   LESSON 10.4 — Managed Training, HPO and Endpoints
   ========================================================================= */
EC.receiveLesson({
  id: "10.4",

  lede: "A managed training job is a container, some input locations, a machine type and an output location; the platform provisions the machines, copies the data, runs the container, uploads the artefact and tears everything down. Hyperparameter tuning runs many such jobs under a search strategy and a budget. Endpoints run the resulting model as real-time, serverless, asynchronous or batch inference, each with a different cost and latency shape. This lesson measures the search strategies on a real model, prices a day of traffic on each endpoint type, and simulates the autoscaling problem that a cold start creates.",

  objectives: [
    "Describe a managed training job by its inputs, outputs and lifecycle",
    "Compare grid, random, Bayesian (TPE) and successive-halving search on the same budget",
    "Choose an endpoint type from traffic shape and latency needs, with the cost of each",
    "Explain why autoscaling with a slow cold start drops requests, and the three fixes",
    "Read HPO results honestly: when the method matters less than the budget"
  ],

  prerequisites: ["10.1", "10.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "jobs",
      text: "A training job, and many of them",
      sub: "Containers, channels, artefacts, and search" },
    { t: "viz",
      title: "A managed training job",
      caption: "The platform supplies machines, data and an upload step; your container supplies everything else. Tuning runs many such jobs and keeps the best artefact.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="180.0" y1="65.1" x2="250.0" y2="80.8" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="180.0" y1="136.9" x2="250.0" y2="121.2" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="78.5" x2="500.0" y2="61.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="123.5" x2="500.0" y2="141.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="620.0" y1="69.6" x2="650.0" y2="81.4" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="95.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Container image</text>
<text x="95.0" y="60" text-anchor="middle" class="s-sub">registry</text>
<rect x="10" y="130" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="95.0" y="152" text-anchor="middle" class="s-label" style="fill:var(--good)">Input channels</text>
<text x="95.0" y="170" text-anchor="middle" class="s-sub">object storage</text>
<rect x="250" y="75" width="180" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="340.0" y="97" text-anchor="middle" class="s-label" style="fill:var(--accent)">Training job</text>
<text x="340.0" y="115" text-anchor="middle" class="s-sub">managed instances</text>
<rect x="500" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="560.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--warn)">Model artefact</text>
<text x="560.0" y="60" text-anchor="middle" class="s-sub">model.tar.gz</text>
<rect x="500" y="130" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="560.0" y="152" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Metrics, logs</text>
<text x="560.0" y="170" text-anchor="middle" class="s-sub">per job</text>
<rect x="650" y="75" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="700.0" y="97" text-anchor="middle" class="s-label" style="fill:var(--crit)">Endpoint</text>
<text x="700.0" y="115" text-anchor="middle" class="s-sub">or batch</text>
</svg>` },
    { t: "p",
      text: "Tuning services (SageMaker automatic model tuning, Vertex AI Vizier, Azure ML sweep jobs) launch training jobs with different hyperparameters, read a metric each job reports, and choose the next configurations by a strategy. The script compares the common strategies on a gradient-boosted model with a budget of 30 full trainings, repeating the random ones over three seeds." },
    { t: "code",
      lang: "python",
      title: "hpo.py — four search strategies, one budget",
      code: `import itertools, time, warnings
import numpy as np, optuna
from sklearn.datasets import make_classification
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore"); optuna.logging.set_verbosity(optuna.logging.WARNING)
X, y = make_classification(n_samples=20_000, n_features=30, n_informative=12, flip_y=0.05, class_sep=0.8, random_state=0)
Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)
BUDGET = 30

def evaluate(lr, leaves, l2, min_leaf, max_iter=300):
    m = HistGradientBoostingClassifier(learning_rate=lr, max_leaf_nodes=leaves, l2_regularization=l2,
                                       min_samples_leaf=min_leaf, max_iter=max_iter, random_state=0)
    return m.fit(Xtr, ytr).score(Xva, yva)

def grid():                                                 # 30 points: the grid has to be coarse to fit the budget
    pts = list(itertools.product([0.03, 0.1, 0.3], [15, 63], [0.0, 1.0], [20]))[:BUDGET]
    pts += list(itertools.product([0.03, 0.1, 0.3], [31, 127], [0.0, 1.0], [5]))
    return [evaluate(*p) for p in pts[:BUDGET]]

def random_search(seed):
    r = np.random.default_rng(seed)
    return [evaluate(10 ** r.uniform(-2.5, -0.3), int(2 ** r.uniform(3, 8)), 10 ** r.uniform(-3, 1), int(r.integers(2, 60)))
            for _ in range(BUDGET)]

def tpe(seed):
    def objective(t):
        return evaluate(t.suggest_float("lr", 10 ** -2.5, 10 ** -0.3, log=True), t.suggest_int("leaves", 8, 256, log=True),
                        t.suggest_float("l2", 1e-3, 10, log=True), t.suggest_int("min_leaf", 2, 60))
    s = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=seed)); s.optimize(objective, BUDGET)
    return [t.value for t in s.trials]

def halving(seed):                                          # successive halving: many cheap trials, survivors get more trees
    r = np.random.default_rng(seed)
    cands = [(10 ** r.uniform(-2.5, -0.3), int(2 ** r.uniform(3, 8)), 10 ** r.uniform(-3, 1), int(r.integers(2, 60))) for _ in range(81)]
    scores, cost = [], 0.0
    for it in (25, 75, 300):                                 # 81 configs at 25 trees, 27 at 75, 9 at 300
        res = [(evaluate(*c, max_iter=it), c) for c in cands]; cost += len(cands) * it / 300
        res.sort(reverse=True); scores = [s for s, _ in res]; cands = [c for _, c in res[: max(1, len(res) // 3)]]
    return scores, cost

def best_at(scores, k): return max(scores[:k])
print(f"budget: {BUDGET} full trainings (300 trees each); validation accuracy of the best configuration found")
print(f"{'method':<22}{'after 10':>9}{'after 30':>9}{'seconds':>9}")
for name, fn in (("grid (coarse)", lambda s: grid()), ("random", random_search), ("TPE (Optuna)", tpe)):
    runs = []
    for seed in (0, 1, 2):
        t = time.perf_counter(); sc = fn(seed); runs.append((best_at(sc, 10), best_at(sc, 30), time.perf_counter() - t))
        if name.startswith("grid"): break
    a = np.array(runs)
    print(f"{name:<22}{a[:, 0].mean():>9.4f}{a[:, 1].mean():>9.4f}{a[:, 2].mean():>9.1f}")
runs = []
for seed in (0, 1, 2):
    t = time.perf_counter(); sc, cost = halving(seed); runs.append((sc[0], cost, time.perf_counter() - t))
a = np.array(runs)
print(f"{'successive halving':<22}{'':>9}{a[:, 0].mean():>9.4f}{a[:, 2].mean():>9.1f}   (81 configs, cost = {a[0, 1]:.0f} full trainings)")
print("random, TPE and halving are means over 3 seeds")`,
      out: `budget: 30 full trainings (300 trees each); validation accuracy of the best configuration found
method                 after 10 after 30  seconds
grid (coarse)            0.9302   0.9354     34.3
random                   0.9340   0.9349     57.6
TPE (Optuna)             0.9320   0.9351     92.1
successive halving                0.9342     63.1   (81 configs, cost = 22 full trainings)
random, TPE and halving are means over 3 seeds` },
    { t: "dl",
      items: [
        { term: "The method barely mattered",
          def: "After 30 trainings, grid, random and TPE found models within 0.0005 accuracy of each other (0.9349 to 0.9354), less than the seed-to-seed variation. Gradient boosting's response surface is flat near its optimum, so many configurations are nearly as good." },
        { term: "Early on, it matters a little",
          def: "After 10 trainings random search led (0.9340) and the coarse grid trailed (0.9302): the grid spends its first trials on one corner of the space." },
        { term: "Halving buys breadth",
          def: "Successive halving tried 81 configurations for the cost of about 22 full trainings, by training all of them briefly and only the best third longer each round, and matched the others." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Paying for clever search on a flat surface",
      body: [
        { t: "p",
          text: "Bayesian optimisation adds sequential dependence (each trial waits for the last) and its own tuning. On many tabular models a random search with a sensible budget, plus early stopping, gets within noise of the best. Spend the budget on what moves the metric: features, data, and a validation set big enough to tell 0.935 from 0.934 at all." }
      ] },
    { t: "h2", n: "02", id: "endpoints", text: "Four kinds of endpoint", sub: "Priced on one day of traffic" },
    { t: "p",
      text: "A real-time endpoint keeps instances running. A serverless endpoint starts capacity on demand and bills for compute used, with a cold start when it has scaled to zero. An asynchronous endpoint queues requests and can scale to zero, for jobs that take seconds to minutes. Batch transform scores a whole dataset and shuts down. The script prices a day of about 3,000 office-hours requests on each, with illustrative prices." },
    { t: "code",
      lang: "python",
      title: "endpoints.py — cost and latency of one day on each endpoint type",
      code: `import numpy as np
rng = np.random.default_rng(4)

# One day of traffic to an internal document classifier: about 3,000 requests, mostly in office hours.
# Illustrative prices: an instance costs $1.00/hour; serverless bills compute time at 1.6x that rate, per millisecond.
hours = np.arange(24)
rate = np.where((hours >= 9) & (hours < 18), 300, 8)            # requests per hour
arrivals = np.sort(np.concatenate([h * 3600 + rng.uniform(0, 3600, rng.poisson(r)) for h, r in zip(hours, rate)]))
SERVICE, COLD, BOOT, IDLE = 0.08, 8.0, 240.0, 600.0           # seconds: inference, serverless cold start, instance boot, idle timeout

def realtime():
    return 24 * 1.00, np.full(len(arrivals), SERVICE), 0

def serverless():
    lat, last, cold = [], -1e9, 0
    for t in arrivals:
        c = (t - last) > IDLE; cold += c
        lat.append(SERVICE + (COLD if c else 0)); last = t
    return len(arrivals) * SERVICE * 1.6 / 3600 + cold * COLD * 1.6 / 3600, np.array(lat), cold

def async_queue():                                             # scale to zero; a request on an idle queue starts an instance
    lat, segs, up_until, ready_at = [], [], -1e9, 0.0
    for t in arrivals:
        if t > up_until:                                      # no instance running: boot one, billed from now
            ready_at = t + BOOT; segs.append([t, None])
        start = max(t, ready_at); lat.append(start - t + SERVICE)
        up_until = start + SERVICE + IDLE; segs[-1][1] = up_until   # shuts down after IDLE seconds with no work
    return sum(b - a for a, b in segs) / 3600 * 1.00, np.array(lat), len(segs)

def batch():                                                  # everything answered by a 06:00 job the next morning
    lat = (24 * 3600 + 6 * 3600) - arrivals
    return (BOOT + len(arrivals) * SERVICE) / 3600 * 1.00, lat, 1

print(f"{len(arrivals):,} requests in the day; illustrative instance price $1.00/hour")
print(f"{'endpoint':<22}{'cost/day':>9}{'p50 latency':>13}{'p99 latency':>13}{'cold starts':>12}")
def fmt(s): return f"{s * 1000:.0f} ms" if s < 1 else (f"{s:.1f} s" if s < 120 else f"{s / 3600:.1f} h" if s > 3600 else f"{s / 60:.1f} min")
for name, fn in (("real-time, always on", realtime), ("serverless", serverless), ("async, scale to zero", async_queue), ("nightly batch", batch)):
    cost, lat, cold = fn()
    print(f"{name:<22}{'$' + format(cost, '.2f'):>9}{fmt(np.percentile(lat, 50)):>13}{fmt(np.percentile(lat, 99)):>13}{cold:>12}")`,
      out: `2,920 requests in the day; illustrative instance price $1.00/hour
endpoint               cost/day  p50 latency  p99 latency cold starts
real-time, always on     $24.00        80 ms        80 ms           0
serverless                $0.22        80 ms        8.1 s          33
async, scale to zero     $20.85        80 ms      3.0 min          27
nightly batch             $0.13       16.6 h       26.9 h           1` },
    { t: "dl",
      items: [
        { term: "Always-on pays for idle",
          def: "The real-time endpoint cost $24.00 for 4 minutes of actual compute: 0.3% utilisation. Its latency was a flat 80 ms." },
        { term: "Serverless traded latency for cost",
          def: "$0.22 a day, 100 times cheaper, but 33 requests hit an 8-second cold start, which set the p99. Fine for an internal tool; wrong for a checkout page." },
        { term: "Async needed steady traffic",
          def: "Scale-to-zero with a 4-minute boot cost $20.85, because overnight requests every 7 minutes kept restarting instances, and the p99 was 3 minutes. Async suits large, slow, bursty jobs, not a trickle of small ones." },
        { term: "Batch is cheapest when latency is irrelevant",
          def: "$0.13, with answers up to a day late. Most 'real-time' scoring of nightly data should be batch." }
      ] },
    { t: "h2",
      n: "03",
      id: "autoscale",
      text: "Autoscaling with a cold start",
      sub: "Capacity that arrives four minutes late" },
    { t: "p",
      text: "Target-tracking autoscaling adds instances when utilisation passes a target. For model servers, a new instance needs a machine, a container image pull and the model loaded into memory, often several minutes for a large model. During a ramp, capacity arrives after the traffic, and requests time out in between. The exercise measures it and three fixes." },
    { t: "exercise",
      kind: "Challenge",
      title: "Autoscaling through a ramp",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Simulate an hour of traffic that ramps from 60 to 400 requests per second over two minutes, starting at minute 10. Each instance serves 100 requests per second; requests waiting over 2 seconds time out. An autoscaler evaluates every minute and requests enough instances for a target utilisation. Compare: target 70% with a 4-minute start, target 40% with a 4-minute start, target 70% with a 1-minute start, and target 70% with capacity scheduled to 6 instances at minute 5." }
      ],
      requirements: [
        "A per-second fluid queue with a 2-second timeout",
        "An autoscaler with a provisioning delay; booting instances billed",
        "Requests timed out, seconds spent timing out, instance-hours",
        "The four policies side by side"
      ],
      hint: "Keep two lists, ready instances and pending ones with their ready times; move pending to ready as time passes.",
      solution: { lang: "python",
        title: "autoscale_ramp.py",
        code: `import math
import numpy as np

# Traffic ramps from 60 to 400 requests/s over two minutes at t = 10 min and stays there.
# Each instance serves 100 requests/s. A request waiting more than 2 s times out.
CAP, TIMEOUT, T = 100, 2.0, 3600
load = np.interp(np.arange(T), [0, 600, 720, T], [60, 60, 400, 400])

def simulate(target_util, ready_delay, min_instances=1, prewarm=None):
    ready = [0.0] * max(1, math.ceil(60 / (target_util * CAP)))   # instances ready at time 0
    pending, queue, served, dropped, waits, inst_seconds = [], 0.0, 0.0, 0.0, [], 0.0
    for t in range(T):
        if t % 60 == 0:                                            # the autoscaler evaluates once a minute
            floor = prewarm[1] if prewarm and t >= prewarm[0] else min_instances
            desired = max(floor, math.ceil(load[t] / (target_util * CAP)))
            have = len(ready) + len(pending)
            pending += [t + ready_delay] * max(0, desired - have)
        ready += [p for p in pending if p <= t]; pending = [p for p in pending if p > t]
        cap = len(ready) * CAP; inst_seconds += len(ready) + len(pending)       # booting instances are billed too
        queue += load[t]
        s = min(queue, cap); queue -= s; served += s
        wait = queue / cap if cap else math.inf                    # time the newest request will wait
        if wait > TIMEOUT:                                         # requests beyond what can be served in 2 s time out
            excess = queue - TIMEOUT * cap; dropped += excess; queue -= excess; wait = TIMEOUT
        waits.append(wait)
    return dropped / load.sum(), sum(w >= TIMEOUT for w in waits), inst_seconds / 3600

print(f"{'policy':<50}{'requests timed out':>19}{'seconds timing out':>19}{'instance-hours':>15}")
for name, kw in [("target 70%, new instances ready after 4 min", dict(target_util=0.7, ready_delay=240)),
                 ("target 40%, ready after 4 min", dict(target_util=0.4, ready_delay=240)),
                 ("target 70%, ready after 1 min (cached weights)", dict(target_util=0.7, ready_delay=60)),
                 ("target 70%, 4 min, scheduled 6 from t = 5 min", dict(target_util=0.7, ready_delay=240, prewarm=(300, 6)))]:
    d, w, h = simulate(**kw)
    print(f"{name:<50}{d:>19.2%}{w:>19}{h:>15.1f}")`,
        out: `policy                                             requests timed out seconds timing out instance-hours
target 70%, new instances ready after 4 min                     5.72%                274            5.0
target 40%, ready after 4 min                                   3.50%                234            8.5
target 70%, ready after 1 min (cached weights)                  1.28%                 94            5.0
target 70%, 4 min, scheduled 6 from t = 5 min                   0.00%                  0            5.6`,
        notes: [
          { t: "p",
            text: "With a 4-minute start, 5.7% of the hour's requests timed out, all during the ramp. A lower target utilisation (40%) cut that only to 3.5% while costing 70% more instance-hours, because headroom sized for normal load is still far short of a sixfold ramp. Cutting the start time to 1 minute (image cached on the node, weights on local disk) reduced timeouts to 1.3% at no extra cost." },
          { t: "p",
            text: "Scheduling capacity ahead of a known ramp removed timeouts entirely for 12% more instance-hours. The general lesson: reactive autoscaling cannot be faster than the cold start, so either make the cold start short or act before the load arrives, from a schedule or a forecast." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the 9 a.m. timeouts",
      body: [
        { t: "p",
          text: "**Symptom.** Every weekday between 9:00 and 9:10, a document-classification API returned timeouts to 5–8% of requests; the rest of the day it was healthy." },
        { t: "p",
          text: "**Mechanism.** Overnight the endpoint scaled down to its minimum of one instance. At 9:00 traffic rose sixfold within minutes as offices opened. Each new instance took five minutes to start and load a 3 GB model, so the autoscaler's added capacity arrived after the morning peak had already timed out." },
        { t: "p",
          text: "**Fix.** A scheduled scaling action raises the minimum to the morning's usual peak at 8:40 on weekdays, the model is baked into the image so startup takes under a minute, and the alert on timeout rate includes the time of day so recurring patterns are visible." }
      ] }
  ],

  takeaways: [
    "A managed training job is **image + input channels + machine type + output location**; tuning runs many of them.",
    "With 30 trainings, grid, random and TPE ended within **0.0005** accuracy: the search method mattered less than the budget.",
    "Successive halving tried **81** configurations for about **22** trainings' cost and matched the rest.",
    "A real-time endpoint cost **$24/day** at **0.3%** utilisation; serverless cost **$0.22** with **8 s** cold starts at p99.",
    "Async endpoints suit large, bursty jobs; a trickle of small requests keeps restarting them.",
    "Use **batch** when answers can wait; most nightly scoring should not be real-time.",
    "A 4-minute cold start dropped **5.7%** of an hour's requests during a ramp; 40% target utilisation still dropped **3.5%**.",
    "Fix cold starts by making them **short** (1 min: 1.3%) or acting **ahead** of known load (0%)."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Grid, random and TPE search found models within 0.0005 accuracy after 30 trainings. What does that suggest?",
        options: [
          "TPE was configured incorrectly for this run",
          "A flat response surface: budget matters more than method",
          "Grid search is simply the best method for all tabular models",
          "30 trainings were too few for any of them to work"
        ],
        answer: 1,
        why: "When many configurations score nearly the same, the strategy cannot separate itself; the differences were smaller than seed-to-seed noise. Nothing indicates a misconfiguration, a general grid advantage, or failure." },
      { stem: "An internal tool gets 3,000 requests a day in office hours. Which endpoint fits best on cost?",
        options: [
          "A real-time endpoint with one always-on instance",
          "Serverless, accepting cold starts on the first requests",
          "Two real-time instances, to give it high availability too",
          "An async endpoint with a 4-minute boot time"
        ],
        answer: 1,
        why: "Serverless cost $0.22 a day against $24 for an always-on instance at 0.3% utilisation. Two instances double the waste, and async restarts repeatedly on light traffic, costing $20.85 with minutes of latency." },
      { stem: "Why did lowering the target utilisation to 40% not prevent timeouts during the ramp?",
        options: [
          "The autoscaler silently ignores any target that is below 50%",
          "Headroom for normal load is far short of a sixfold ramp",
          "Instances at 40% utilisation run more slowly",
          "The queue timeout was set too long to matter"
        ],
        answer: 1,
        why: "40% target with 60 req/s gives 2 instances, 200 req/s of capacity, against a ramp to 400; new instances still take 4 minutes. Targets are honoured, utilisation does not slow instances, and a longer timeout would not add capacity." },
      { stem: "Which change removed timeouts entirely in the ramp simulation?",
        options: [
          "A 1-minute instance start instead of 4 minutes",
          "Scheduling capacity ahead of the known ramp",
          "A 40% target utilisation instead of 70%",
          "Evaluating the autoscaler every second"
        ],
        answer: 1,
        why: "Capacity scheduled 5 minutes before the ramp was ready when traffic arrived: 0% timed out. The 1-minute start still dropped 1.3% and the 40% target 3.5%; faster evaluation does not shorten the 4-minute start." }
    ] },

  interview: { title: "In an interview",
    sub: "Platform answers improve when they include a number.",
    questions: [
      { level: "core",
        q: "How would you run hyperparameter tuning for a production model?",
        strong: "A strong answer covers the search space, the strategy, the budget, early stopping and the validation set.",
        answer: [
          { t: "p",
            text: "Define a search space on sensible scales (log for learning rates and regularisation), start with random search or successive halving, which parallelise well, and give it a fixed budget with early stopping of poor trials. Use a validation set large enough that the differences you care about exceed its noise, and confirm the winner on a held-out set. Bayesian methods help when each trial is very expensive and the surface is not flat; on many tabular models the methods end within noise of each other." }
        ] },
      { level: "core",
        q: "Real-time, serverless, async or batch: how do you choose?",
        strong: "A strong answer starts from latency needs and traffic shape, then cost.",
        answer: [
          { t: "p",
            text: "Batch if answers can wait for a schedule. Real-time if a user is waiting and traffic is steady enough to keep instances busy. Serverless for spiky or light traffic where a few seconds of cold start is acceptable. Async for long-running requests (large documents, video) and bursts that can queue. Then price it: an always-on endpoint at 0.3% utilisation cost 100 times more than serverless for the same requests." }
        ] },
      { level: "advanced",
        q: "Your endpoint times out during daily traffic ramps. What do you do?",
        strong: "A strong answer measures the cold start, shortens it, and schedules or predicts capacity.",
        answer: [
          { t: "p",
            text: "Measure the time from scale-out decision to a ready instance: provisioning, image pull, model load. Shorten it: smaller or pre-cached images, weights on local disk or baked into the image, warm pools where the platform supports them. Then act before the load: scheduled scaling for known ramps, or predictive scaling from history. Lowering the target utilisation is the expensive, partial fix; in the simulation it still dropped 3.5% of requests." }
        ] }
    ] }
});

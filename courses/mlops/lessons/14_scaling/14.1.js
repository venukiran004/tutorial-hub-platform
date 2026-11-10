/* ============================================================================
   LESSON 14.1 — Four Infrastructure Failures
   ========================================================================= */
EC.receiveLesson({
  id: "14.1",

  lede: "Four infrastructure failures account for a large share of ML serving incidents, and each announces itself differently. A GPU runs out of memory on one unusually large batch. A container's memory limit is hit and the kernel kills it with exit code 137. A server cannot start, and Kubernetes restarts it on a lengthening back-off. A connection pool runs dry and every request waits, which looks exactly like a slow model. A disk fills with logs and checkpoints. This lesson measures pool exhaustion, which is the one that misleads, reproduces a crash loop's cause, and gives the evidence and first command for each.",

  objectives: [
    "Recognise GPU OOM, container OOM, crash loops, pool exhaustion and full disks from their evidence",
    "Separate pool exhaustion from a slow model with timing and Little's law",
    "Find a crash loop's cause in the previous container's log",
    "Predict when a disk fills and alert before it does"
  ],

  prerequisites: ["5.3", "12.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "pool",
      text: "The one that looks like a slow model",
      sub: "Connection pool exhaustion, measured" },
    { t: "p",
      text: "A handler holds a database connection for 40 ms to read features, then runs a 10 ms model. Thirty-two requests arrive at once, repeatedly. With a pool of 4 connections, at most 4 requests can be reading at a time, so the rest wait for a connection before the model has done anything." },
    { t: "code",
      lang: "python",
      title: "pool.py — the same service with a pool of 4 and of 16",
      code: `import threading, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np

# A prediction handler that needs a database connection for 40 ms (a feature lookup) and 10 ms of model time.
# The connection pool has a fixed size. Two runs: a pool of 4 and a pool of 16, both under 32 concurrent requests.
def run(pool_size, concurrency=32, n=400, db_ms=40, model_ms=10):
    pool = threading.Semaphore(pool_size); waits, totals = [], []; lock = threading.Lock()
    def handle(_):
        t0 = time.perf_counter()
        pool.acquire(); t1 = time.perf_counter()               # waiting for a connection
        time.sleep(db_ms / 1000); pool.release()               # using it
        time.sleep(model_ms / 1000)                            # the model
        t2 = time.perf_counter()
        with lock: waits.append((t1 - t0) * 1000); totals.append((t2 - t0) * 1000)
    t = time.perf_counter()
    with ThreadPoolExecutor(concurrency) as ex: list(ex.map(handle, range(n)))
    el = time.perf_counter() - t
    return n / el, np.median(totals), np.percentile(totals, 99), np.median(waits)

print(f"{'pool':>5}{'req/s':>8}{'p50 ms':>8}{'p99 ms':>8}{'waiting for a connection, p50':>32}")
for size in (4, 16):
    rps, p50, p99, w = run(size)
    print(f"{size:>5}{rps:>8.0f}{p50:>8.0f}{p99:>8.0f}{w:>29.0f} ms")
print(f"\\nceiling from the pool alone: size / hold time = 4 / 0.040 s = {4 / 0.040:.0f} req/s; 16 / 0.040 s = {16 / 0.040:.0f} req/s")`,
      out: ` pool   req/s  p50 ms  p99 ms   waiting for a connection, p50
    4      98     324     326                          273 ms
   16     388      81      86                           30 ms

ceiling from the pool alone: size / hold time = 4 / 0.040 s = 100 req/s; 16 / 0.040 s = 400 req/s` },
    { t: "viz",
      title: "Median request time, and how much of it was waiting for a connection",
      caption: "With 4 connections, 273 of the 324 ms was waiting. The model's 10 ms never changed.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="180" y="31.0" text-anchor="end" class="s-label">pool of 4: waiting</text>
<rect x="190" y="14" width="326.8" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="524.8" y="31.0" class="s-sub">273 ms waiting</text>
<text x="180" y="69.0" text-anchor="end" class="s-label">pool of 4: total p50</text>
<rect x="190" y="52" width="387.8" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="585.8" y="69.0" class="s-sub">324 ms total</text>
<text x="180" y="107.0" text-anchor="end" class="s-label">pool of 16: waiting</text>
<rect x="190" y="90" width="35.9" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="233.9" y="107.0" class="s-sub">30 ms waiting</text>
<text x="180" y="145.0" text-anchor="end" class="s-label">pool of 16: total p50</text>
<rect x="190" y="128" width="97.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="295.0" y="145.0" class="s-sub">81 ms total</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Little's law gives the ceiling",
          def: "A pool of size N whose connections are held for T seconds serves at most N / T requests a second: 4 / 0.04 = 100. The service measured 98. With 16 connections the ceiling is 400, and it measured 388." },
        { term: "Why it is misread",
          def: "End-to-end latency rose from 81 ms to 324 ms with the model unchanged and the CPU mostly idle. Without a timer around connection acquisition, it looks like 'the model got slow'." },
        { term: "The fix is arithmetic",
          def: "Size the pool for concurrency × hold time, shorten the hold time (do not keep a connection across the model call), and check the database can serve that many connections." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Adding replicas to a pool problem",
      body: [
        { t: "p",
          text: "More replicas mean more pools and more connections to the same database. If the database's own connection limit is the bottleneck, scaling out makes it worse and can start refusing connections everywhere. Time the wait for a connection before adding capacity." }
      ] },
    { t: "h2", n: "02", id: "four", text: "The others", sub: "Evidence and the first command for each" },
    { t: "code",
      lang: "python",
      title: "crashloop.py — a start-up crash and the restart back-off",
      code: `import os, subprocess, sys

# A model server whose start-up reads a required setting. Deployed without it, it exits immediately.
server = "import os; path = os.environ['MODEL_PATH']; print('loading', path)"
r = subprocess.run([sys.executable, "-c", server], capture_output=True, text=True, env={k: v for k, v in os.environ.items() if k != "MODEL_PATH"})
print(f"exit code {r.returncode}; last log line: {r.stderr.strip().splitlines()[-1]}")

# Kubernetes restarts a failing container with an exponential back-off: 10 s, doubling, capped at 5 minutes.
delays, t = [], 0
for attempt in range(1, 9):
    d = min(10 * 2 ** (attempt - 1), 300); delays.append(d); t += d
print("restart delays (s):", delays)
print(f"after 8 crashes the pod has waited {t / 60:.1f} minutes in total; each crash shows as CrashLoopBackOff while it waits")
print("the cause is in the previous container's log (kubectl logs --previous), not the current one, which has not started")`,
      out: `exit code 1; last log line: KeyError: 'MODEL_PATH'
restart delays (s): [10, 20, 40, 80, 160, 300, 300, 300]
after 8 crashes the pod has waited 20.2 minutes in total; each crash shows as CrashLoopBackOff while it waits
the cause is in the previous container's log (kubectl logs --previous), not the current one, which has not started` },
    { t: "table",
      head: ["Failure", "Evidence", "First command", "Usual fix"],
      rows: [
        [
          "GPU out of memory",
          "CUDA out of memory, on a large batch or long input",
          "nvidia-smi; log batch shapes",
          "Cap batch or sequence length; size from lesson 10.2"
        ],
        [
          "Container out of memory",
          "Reason: OOMKilled, exit code 137",
          "kubectl describe pod",
          "Limit at measured peak; find leaks (12.3)"
        ],
        [
          "Crash loop",
          "CrashLoopBackOff, restarts after 10, 20, 40 s… up to 5 min",
          "kubectl logs --previous",
          "Fix the start-up error it shows"
        ],
        [
          "Disk exhausted",
          "Errno 28: No space left on device",
          "df -h; du -sh on log and model paths",
          "Rotate logs, move checkpoints to object storage"
        ]
      ] },
    { t: "p",
      text: "The commands are what to run first on a Kubernetes node or pod; they are listed here, not executed in this lesson. The crash loop's cause is never in the current container, which has not started yet: it is in the previous one's log, which is why `--previous` matters. In the script the cause was a missing environment variable, and each restart waited longer, reaching five minutes between attempts within twenty minutes." },
    { t: "exercise",
      kind: "Challenge",
      title: "Triage from evidence",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Write a function that takes a piece of evidence (a pod status, an exception line or a metrics summary) and returns the failure and the first fix, using patterns for each of the four failures and pool exhaustion. Run it on six real-looking snippets. Then compute when a disk with 40 GB free fills, given 2.5 GB of prediction logs a day and a 10 GB checkpoint every seventh day, and when an alert at 80% of that space would fire." }
      ],
      requirements: [
        "Patterns for GPU OOM, container OOM, disk, pool and crash loop",
        "A fallback that says what evidence to collect",
        "Six snippets, including one the rules cannot classify",
        "The day the disk fills and the day the alert fires"
      ],
      hint: "Order matters only when patterns overlap; exit code 137 and the word OOMKilled both mean the kernel killed the process.",
      solution: { lang: "python",
        title: "infra_triage.py",
        code: `import re

RULES = [   # (pattern in the evidence, failure, first fix)
    (r"CUDA out of memory|torch\\.cuda\\.OutOfMemoryError", "GPU out of memory",
     "smaller batch or max sequence length; check for growing batches; then a bigger GPU (lesson 10.2)"),
    (r"OOMKilled|Exit Code:\\s*137", "container out of memory (killed by the kernel)",
     "raise the memory limit to the measured peak, or find the leak (lesson 12.3)"),
    (r"No space left on device|Errno 28", "disk exhausted",
     "free space now; rotate logs, move checkpoints to object storage, alert at 80%"),
    (r"QueuePool limit|connection timed out|pool exhausted|waiting for a connection", "connection pool exhausted",
     "size the pool for concurrency × hold time, shorten hold time, or add replicas of the database proxy"),
    (r"CrashLoopBackOff|Back-off restarting failed container", "crash loop at start-up",
     "read kubectl logs --previous; fix the configuration or start-up error it shows"),
]

def diagnose(evidence: str):
    for pattern, failure, fix in RULES:
        if re.search(pattern, evidence, re.I): return failure, fix
    return "unknown", "collect: describe pod, previous logs, node and GPU metrics"

incidents = [
    "Last State: Terminated\\n  Reason: OOMKilled\\n  Exit Code: 137",
    "torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB",
    "Warning  BackOff  kubelet  Back-off restarting failed container model-server",
    "OSError: [Errno 28] No space left on device: '/var/log/predictions/2024-06-02.jsonl'",
    "sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00",
    "p99 latency 2.1 s; model time p50 9 ms; GPU utilisation 12%",
]
for e in incidents:
    failure, fix = diagnose(e)
    print(f"{e.splitlines()[-1][:62]:<64} -> {failure}\\n{'':<64}    fix: {fix}")

# Disk: when will it fill? 40 GB free, prediction logs 2.5 GB/day, a 10 GB checkpoint written every Sunday.
free, day = 40.0, 0
while free > 0:
    day += 1; free -= 2.5 + (10 if day % 7 == 0 else 0)
print(f"\\ndisk with 40 GB free fills on day {day}; an alert when 80% of that space was used would have fired on day {next(d for d in range(1, 99) if 2.5 * d + 10 * (d // 7) >= 32)}")`,
        out: `  Exit Code: 137                                                 -> container out of memory (killed by the kernel)
                                                                    fix: raise the memory limit to the measured peak, or find the leak (lesson 12.3)
torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allo   -> GPU out of memory
                                                                    fix: smaller batch or max sequence length; check for growing batches; then a bigger GPU (lesson 10.2)
Warning  BackOff  kubelet  Back-off restarting failed containe   -> crash loop at start-up
                                                                    fix: read kubectl logs --previous; fix the configuration or start-up error it shows
OSError: [Errno 28] No space left on device: '/var/log/predict   -> disk exhausted
                                                                    fix: free space now; rotate logs, move checkpoints to object storage, alert at 80%
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflo   -> connection pool exhausted
                                                                    fix: size the pool for concurrency × hold time, shorten hold time, or add replicas of the database proxy
p99 latency 2.1 s; model time p50 9 ms; GPU utilisation 12%      -> unknown
                                                                    fix: collect: describe pod, previous logs, node and GPU metrics

disk with 40 GB free fills on day 12; an alert when 80% of that space was used would have fired on day 9`,
        notes: [
          { t: "p",
            text: "Five snippets were classified from their text alone. The sixth, 'p99 2.1 s, model 9 ms, GPU 12%', could not be: its cause is in what the summary does not say. That is the pool-exhaustion signature from section 1, and only a timer around connection acquisition confirms it, which is why stage timings (lesson 12.1) belong in every service." },
          { t: "p",
            text: "The disk filled on day 12; an alert at 80% of the free space fired on day 9, three days of warning. A rate-of-change alert, 'full within 72 hours at the current rate', gives the same warning without choosing a percentage." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the model that slowed down at 10 a.m.",
      body: [
        { t: "p",
          text: "**Symptom.** Every weekday from about 10:00, a pricing model's p99 rose from 60 ms to over 2 seconds. The on-call engineer rolled back to the previous model; nothing changed." },
        { t: "p",
          text: "**Mechanism.** At 10:00 a batch reporting job started and took most of the database's connections. The service's pool of 10 could no longer refill when connections were recycled, and requests waited up to 2 seconds to acquire one. The model's own time was 8 ms throughout." },
        { t: "p",
          text: "**Fix.** The handler was changed to release its connection before calling the model, the reporting job moved to a read replica, and connection wait time became a metric with an alert. The rollback had cost an hour; the timing metric would have pointed at the cause in a minute." }
      ] }
  ],

  takeaways: [
    "Pool exhaustion looks like a slow model: **273 of 324 ms** was waiting for a connection, with the model unchanged at 10 ms.",
    "Little's law: a pool serves at most **size / hold time**; 4 / 0.04 s = **100** req/s, measured **98**.",
    "Time connection acquisition, release connections before slow work, and do not scale out into a database limit.",
    "**Exit code 137 / OOMKilled** is the kernel killing a container; **CUDA out of memory** is the GPU.",
    "A crash loop's cause is in **kubectl logs --previous**; back-off grows from 10 s to 5 minutes.",
    "**Errno 28** means a full disk; rotate logs and keep checkpoints in object storage.",
    "Alert on time-to-full, not only on a percentage: the disk here gave **3 days** of warning at 80%."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A pool of 8 connections, each held 50 ms per request. What is the most the service can serve?",
        options: [
          "About 400 requests per second",
          "About 160 requests per second",
          "About 8 requests per second",
          "Unlimited, if the model is fast enough"
        ],
        answer: 1,
        why: "Little's law: 8 / 0.05 s = 160 per second. 400 ignores the hold time, 8 confuses size with rate, and model speed does not raise a pool ceiling." },
      { stem: "A pod shows Reason: OOMKilled with exit code 137. What happened?",
        options: [
          "The GPU ran out of memory during inference",
          "The kernel killed it for exceeding its memory limit",
          "The application exited after an uncaught error",
          "Kubernetes evicted it to free up a busy, crowded node"
        ],
        answer: 1,
        why: "137 is 128 + SIGKILL from the kernel's OOM killer when the container exceeds its limit. GPU OOM is an exception inside the process, an uncaught error exits with its own code, and eviction is reported as Evicted." },
      { stem: "A pod is in CrashLoopBackOff. Where is the cause most likely to be found?",
        options: [
          "In the current container's log output",
          "In the previous container's log, via --previous",
          "In the node's GPU utilisation metrics",
          "In the readiness probe's configuration file only"
        ],
        answer: 1,
        why: "The current container has not started yet during back-off; the failed one's log holds the error, such as the missing MODEL_PATH here. GPU metrics and probes are rarely the cause of a start-up crash." },
      { stem: "p99 rose from 80 ms to 2 s, model time is unchanged at 9 ms and CPU is idle. What should you check first?",
        options: [
          "Whether the model now needs compressing",
          "Time spent waiting on connections or locks",
          "Whether the GPU drivers are all up to date",
          "The total size of the container image"
        ],
        answer: 1,
        why: "Unchanged model time with idle CPU means requests are waiting on something: a pool, a lock, a downstream call. Compression, drivers and image size do not explain waiting." }
    ] },

  interview: { title: "In an interview",
    sub: "Infrastructure answers are judged on the evidence you would look for.",
    questions: [
      { level: "core",
        q: "Your model service's latency jumped but the model itself is no slower. What could it be?",
        strong: "A strong answer lists waiting causes and the measurement that separates them.",
        answer: [
          { t: "p",
            text: "Something the request waits on: connection pool exhaustion, a lock, a slow downstream feature service, queueing at high utilisation (lesson 12.2), or garbage-collection pauses. Stage timings separate them: time to acquire a connection, time in each downstream call, queue time before the handler. Little's law checks the pool: size divided by hold time against the request rate." }
        ] },
      { level: "core",
        q: "A model server keeps restarting in Kubernetes. How do you debug it?",
        strong: "A strong answer reads the termination reason and the previous logs before changing anything.",
        answer: [
          { t: "p",
            text: "kubectl describe pod for the last state: OOMKilled with exit 137 means memory, Error with another code means the process failed. kubectl logs --previous for the failed container's output: missing configuration, a model file that is not there, a dependency error. Check liveness probes too: a probe that fails during a slow model load restarts a healthy container, which a startup probe or a longer initial delay fixes." }
        ] },
      { level: "advanced",
        q: "How would you prevent disks filling on model servers?",
        strong: "A strong answer covers retention, location and predictive alerting.",
        answer: [
          { t: "p",
            text: "Keep large and growing data off local disks: checkpoints and prediction logs go to object storage or a log pipeline, with rotation and size caps for anything local. Set the container's ephemeral-storage limit so one pod cannot fill the node. Alert on predicted time-to-full from the growth rate as well as on a percentage, so a sudden increase in log volume is caught early." }
        ] }
    ] }
});

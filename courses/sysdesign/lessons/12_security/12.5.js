/* ============================================================================
   LESSON 12.5 — Serverless, Containers, IaC and Compliance
   ========================================================================= */
EC.receiveLesson({
  id: "12.5",

  lede: "Four decisions shape how a system lives in the cloud, and each is better made with numbers than with fashion. **Serverless functions or containers** is a cost curve with a crossover you can calculate — measured here at about ten requests a second — plus a latency tail from **cold starts**. **Multi-cloud** protects against less than it promises and costs more than it appears. **Infrastructure as code** turns every change to the network and the servers into a reviewed plan, and catches the console edit nobody wrote down. And **compliance** — GDPR, PCI DSS and their relatives — is cheapest as a design input: one architectural choice in this lesson cuts the systems in an audit's scope from eleven to four.",

  objectives: [
    "Calculate where per-request functions and per-hour containers cross over in cost",
    "Measure a cold start, and choose the mitigations that address it",
    "Weigh multi-cloud strategies by what they protect against and what they cost",
    "Run infrastructure changes through plan, policy and review, and detect drift",
    "Treat residency, erasure, audit and scope as design inputs, and shrink compliance scope with tokenisation"
  ],

  prerequisites: ["11.4", "11.6", "12.4"],

  blocks: [

    { t: "h2", n: "01", id: "compute", text: "Functions or containers, on the numbers",
      sub: "A cost curve, a latency tail, and a list of limits" },

    { t: "diagram", kind: "compare", title: "Three ways to run code",
      caption: "The lines are blurring — Cloud Run and Fargate run containers without servers to manage, and Lambda runs container images — but the billing models remain distinct: per request, per hour of capacity, or per machine. That is what the cost comparison turns on.",
      columns: [
        { title: "Functions", tone: "violet", items: [
          "pay per request; idle is free",
          "zero to thousands in seconds",
          "cold start on each new instance",
          "time limits (15 min on Lambda)",
          "no servers or capacity to manage"
        ] },
        { title: "Containers", tone: "teal", items: [
          "pay for capacity, by the hour",
          "scale in seconds to minutes",
          "long-lived processes, pools",
          "portable between clouds",
          "a platform to run or buy"
        ] },
        { title: "Virtual machines", tone: "accent", items: [
          "pay for whole instances",
          "slowest to scale, most control",
          "special hardware and licences",
          "you patch the operating system",
          "big discounts for commitments"
        ] }
      ] },

    { t: "p", text: "A function instance handles one request at a time and bills for its full duration, waiting on I/O included; a container handles many concurrent requests on the same CPU and bills by the hour whether busy or not. Which is cheaper depends on traffic. The model below uses list prices for us-east-1 — rerun it with yours — for a 512 MB function taking 100 ms behind an HTTP API, against 0.5 vCPU containers behind a load balancer, each measured at 80 requests a second, autoscaled hourly to 60% of that, with a floor of two tasks for availability and a daily traffic cycle:" },

    { t: "code", lang: "python", title: "breakeven.py — monthly cost of functions and containers across traffic levels",
      code: `import math

HOURS = 730                                     # in a month
# list prices, us-east-1, x86; plug in your own
GB_SECOND, PER_INVOKE, HTTP_API = 0.0000166667, 0.20e-6, 1.00e-6
VCPU_HOUR, GB_HOUR, ALB_HOUR = 0.04048, 0.004445, 0.0225

def functions(avg_rps, memory_gb=0.5, seconds=0.1):        # pay per request; nothing when idle
    requests = avg_rps * 3600 * HOURS
    return requests * (memory_gb * seconds * GB_SECOND + PER_INVOKE + HTTP_API)

def containers(avg_rps, per_task=80, target=0.6, minimum=2):  # pay per task-hour, autoscaled hourly
    task_hour = 0.5 * VCPU_HOUR + 1 * GB_HOUR                 # 0.5 vCPU, 1 GB
    total = HOURS * ALB_HOUR
    for h in range(HOURS):
        rps = avg_rps * (1 + 0.6 * math.sin(2 * math.pi * (h % 24) / 24))   # daily cycle: peak 1.6x, trough 0.4x
        total += max(minimum, math.ceil(rps / (per_task * target))) * task_hour
    return total

LEVELS = [0.05, 0.2, 1, 5, 20, 100, 500]
if __name__ == "__main__":
    print(f"{'avg req/s':>9}{'requests/month':>16}{'functions':>11}{'containers':>12}   cheaper")
    for rps in LEVELS:
        f, c = functions(rps), containers(rps)
        winner = f"functions, {c / f:.0f}x" if f < c else f"containers, {f / c:.0f}x"
        print(f"{rps:>9g}{rps * 3600 * HOURS / 1e6:>14.1f} M{'$' + format(f, ',.2f'):>11}{'$' + format(c, ',.2f'):>12}   {winner}")
    lo, hi = 0.05, 500
    while hi - lo > 0.01:                                   # bisect for the crossover
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if functions(mid) < containers(mid) else (lo, mid)
    print(f"\\nbreak-even near {lo:.1f} req/s on average, about {lo * 3600 * HOURS / 1e6:.0f} million requests a month")`,
      hl: [8, 10, 12, 17],
      out: `avg req/s  requests/month  functions  containers   cheaper
     0.05           0.1 M      $0.27      $52.47   functions, 196x
      0.2           0.5 M      $1.07      $52.47   functions, 49x
        1           2.6 M      $5.34      $52.47   functions, 10x
        5          13.1 M     $26.72      $52.47   functions, 2x
       20          52.6 M    $106.87      $52.47   containers, 2x
      100         262.8 M    $534.36      $66.17   containers, 8x
      500        1314.0 M  $2,671.80     $214.18   containers, 12x

break-even near 9.8 req/s on average, about 26 million requests a month` },

    { t: "viz", title: "Where per-request and per-hour billing cross",
      caption: "Both axes are logarithmic. The function line rises in proportion to traffic, because every request pays for itself; the container line is flat at the two-task floor until traffic needs a third task, then climbs in steps far more slowly. Below about ten requests a second on average, functions win — by a factor of ten at one request a second. Above it containers win and keep winning: twelve times cheaper at 500 a second.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Monthly cost of functions and containers against traffic, log scales">
<line x1="70" y1="250.0" x2="730" y2="250.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="254.0" text-anchor="end" class="s-sub">$0.10</text>
<line x1="70" y1="204.0" x2="730" y2="204.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="208.0" text-anchor="end" class="s-sub">$1</text>
<line x1="70" y1="158.0" x2="730" y2="158.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="162.0" text-anchor="end" class="s-sub">$10</text>
<line x1="70" y1="112.0" x2="730" y2="112.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="116.0" text-anchor="end" class="s-sub">$100</text>
<line x1="70" y1="66.0" x2="730" y2="66.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="70.0" text-anchor="end" class="s-sub">$1k</text>
<line x1="70" y1="20.0" x2="730" y2="20.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="62" y="24.0" text-anchor="end" class="s-sub">$10k</text>
<text x="70.0" y="268" text-anchor="middle" class="s-sub">0.05</text>
<text x="169.3" y="268" text-anchor="middle" class="s-sub">0.2</text>
<text x="284.7" y="268" text-anchor="middle" class="s-sub">1</text>
<text x="400.0" y="268" text-anchor="middle" class="s-sub">5</text>
<text x="499.3" y="268" text-anchor="middle" class="s-sub">20</text>
<text x="614.7" y="268" text-anchor="middle" class="s-sub">100</text>
<text x="730.0" y="268" text-anchor="middle" class="s-sub">500</text>
<text x="400" y="292" text-anchor="middle" class="s-sub">average requests per second (log scale)</text>
<text x="16" y="135" text-anchor="middle" class="s-sub" transform="rotate(-90 16 135)">monthly cost (log)</text>
<polyline points="70.0,230.4 73.3,229.4 76.6,228.5 79.9,227.6 83.2,226.7 86.5,225.8 89.8,224.8 93.1,223.9 96.4,223.0 99.7,222.1 103.0,221.2 106.3,220.2 109.6,219.3 112.9,218.4 116.2,217.5 119.5,216.6 122.8,215.6 126.1,214.7 129.4,213.8 132.7,212.9 136.0,212.0 139.3,211.0 142.6,210.1 145.9,209.2 149.2,208.3 152.5,207.4 155.8,206.4 159.1,205.5 162.4,204.6 165.7,203.7 169.0,202.8 172.3,201.8 175.6,200.9 178.9,200.0 182.2,199.1 185.5,198.2 188.8,197.2 192.1,196.3 195.4,195.4 198.7,194.5 202.0,193.6 205.3,192.6 208.6,191.7 211.9,190.8 215.2,189.9 218.5,189.0 221.8,188.0 225.1,187.1 228.4,186.2 231.7,185.3 235.0,184.4 238.3,183.4 241.6,182.5 244.9,181.6 248.2,180.7 251.5,179.8 254.8,178.8 258.1,177.9 261.4,177.0 264.7,176.1 268.0,175.2 271.3,174.2 274.6,173.3 277.9,172.4 281.2,171.5 284.5,170.6 287.8,169.6 291.1,168.7 294.4,167.8 297.7,166.9 301.0,166.0 304.3,165.0 307.6,164.1 310.9,163.2 314.2,162.3 317.5,161.4 320.8,160.4 324.1,159.5 327.4,158.6 330.7,157.7 334.0,156.8 337.3,155.8 340.6,154.9 343.9,154.0 347.2,153.1 350.5,152.2 353.8,151.2 357.1,150.3 360.4,149.4 363.7,148.5 367.0,147.6 370.3,146.6 373.6,145.7 376.9,144.8 380.2,143.9 383.5,143.0 386.8,142.0 390.1,141.1 393.4,140.2 396.7,139.3 400.0,138.4 403.3,137.4 406.6,136.5 409.9,135.6 413.2,134.7 416.5,133.8 419.8,132.8 423.1,131.9 426.4,131.0 429.7,130.1 433.0,129.2 436.3,128.2 439.6,127.3 442.9,126.4 446.2,125.5 449.5,124.6 452.8,123.6 456.1,122.7 459.4,121.8 462.7,120.9 466.0,120.0 469.3,119.0 472.6,118.1 475.9,117.2 479.2,116.3 482.5,115.4 485.8,114.4 489.1,113.5 492.4,112.6 495.7,111.7 499.0,110.8 502.3,109.8 505.6,108.9 508.9,108.0 512.2,107.1 515.5,106.2 518.8,105.2 522.1,104.3 525.4,103.4 528.7,102.5 532.0,101.6 535.3,100.6 538.6,99.7 541.9,98.8 545.2,97.9 548.5,97.0 551.8,96.0 555.1,95.1 558.4,94.2 561.7,93.3 565.0,92.4 568.3,91.4 571.6,90.5 574.9,89.6 578.2,88.7 581.5,87.8 584.8,86.8 588.1,85.9 591.4,85.0 594.7,84.1 598.0,83.2 601.3,82.2 604.6,81.3 607.9,80.4 611.2,79.5 614.5,78.6 617.8,77.6 621.1,76.7 624.4,75.8 627.7,74.9 631.0,74.0 634.3,73.0 637.6,72.1 640.9,71.2 644.2,70.3 647.5,69.4 650.8,68.4 654.1,67.5 657.4,66.6 660.7,65.7 664.0,64.8 667.3,63.8 670.6,62.9 673.9,62.0 677.2,61.1 680.5,60.2 683.8,59.2 687.1,58.3 690.4,57.4 693.7,56.5 697.0,55.6 700.3,54.6 703.6,53.7 706.9,52.8 710.2,51.9 713.5,51.0 716.8,50.0 720.1,49.1 723.4,48.2 726.7,47.3 730.0,46.4" style="fill:none;stroke:var(--violet)" stroke-width="2.4"/>
<polyline points="70.0,124.9 73.3,124.9 76.6,124.9 79.9,124.9 83.2,124.9 86.5,124.9 89.8,124.9 93.1,124.9 96.4,124.9 99.7,124.9 103.0,124.9 106.3,124.9 109.6,124.9 112.9,124.9 116.2,124.9 119.5,124.9 122.8,124.9 126.1,124.9 129.4,124.9 132.7,124.9 136.0,124.9 139.3,124.9 142.6,124.9 145.9,124.9 149.2,124.9 152.5,124.9 155.8,124.9 159.1,124.9 162.4,124.9 165.7,124.9 169.0,124.9 172.3,124.9 175.6,124.9 178.9,124.9 182.2,124.9 185.5,124.9 188.8,124.9 192.1,124.9 195.4,124.9 198.7,124.9 202.0,124.9 205.3,124.9 208.6,124.9 211.9,124.9 215.2,124.9 218.5,124.9 221.8,124.9 225.1,124.9 228.4,124.9 231.7,124.9 235.0,124.9 238.3,124.9 241.6,124.9 244.9,124.9 248.2,124.9 251.5,124.9 254.8,124.9 258.1,124.9 261.4,124.9 264.7,124.9 268.0,124.9 271.3,124.9 274.6,124.9 277.9,124.9 281.2,124.9 284.5,124.9 287.8,124.9 291.1,124.9 294.4,124.9 297.7,124.9 301.0,124.9 304.3,124.9 307.6,124.9 310.9,124.9 314.2,124.9 317.5,124.9 320.8,124.9 324.1,124.9 327.4,124.9 330.7,124.9 334.0,124.9 337.3,124.9 340.6,124.9 343.9,124.9 347.2,124.9 350.5,124.9 353.8,124.9 357.1,124.9 360.4,124.9 363.7,124.9 367.0,124.9 370.3,124.9 373.6,124.9 376.9,124.9 380.2,124.9 383.5,124.9 386.8,124.9 390.1,124.9 393.4,124.9 396.7,124.9 400.0,124.9 403.3,124.9 406.6,124.9 409.9,124.9 413.2,124.9 416.5,124.9 419.8,124.9 423.1,124.9 426.4,124.9 429.7,124.9 433.0,124.9 436.3,124.9 439.6,124.9 442.9,124.9 446.2,124.9 449.5,124.9 452.8,124.9 456.1,124.9 459.4,124.9 462.7,124.9 466.0,124.9 469.3,124.9 472.6,124.9 475.9,124.9 479.2,124.9 482.5,124.9 485.8,124.9 489.1,124.9 492.4,124.9 495.7,124.9 499.0,124.9 502.3,124.9 505.6,124.9 508.9,124.9 512.2,124.9 515.5,124.9 518.8,124.9 522.1,124.9 525.4,124.9 528.7,124.9 532.0,124.9 535.3,124.9 538.6,124.9 541.9,124.9 545.2,124.9 548.5,124.9 551.8,124.9 555.1,124.9 558.4,124.9 561.7,124.9 565.0,124.9 568.3,124.9 571.6,124.9 574.9,124.9 578.2,124.6 581.5,124.0 584.8,123.5 588.1,122.9 591.4,122.9 594.7,122.4 598.0,122.4 601.3,122.4 604.6,121.9 607.9,121.7 611.2,120.7 614.5,120.3 617.8,119.8 621.1,119.8 624.4,118.9 627.7,118.9 631.0,117.9 634.3,117.5 637.6,116.7 640.9,116.3 644.2,115.8 647.5,115.0 650.8,115.0 654.1,113.7 657.4,113.5 660.7,112.6 664.0,112.3 667.3,111.1 670.6,110.6 673.9,109.6 677.2,109.3 680.5,108.0 683.8,107.5 687.1,106.7 690.4,106.2 693.7,105.3 697.0,104.8 700.3,104.5 703.6,102.7 706.9,102.4 710.2,101.4 713.5,101.0 716.8,99.8 720.1,99.3 723.4,98.4 726.7,97.8 730.0,96.8" style="fill:none;stroke:var(--teal)" stroke-width="2.4"/>
<line x1="448.2" y1="20" x2="448.2" y2="250" style="stroke:var(--ink-3);stroke-dasharray:4 3"/>
<text x="454.2" y="32" class="s-sub">break-even ≈ 10 req/s</text>
<text x="83.1" y="220.2" class="s-label" style="fill:var(--violet)">functions: pay per request</text>
<text x="83.1" y="114.9" class="s-label" style="fill:var(--teal)">containers: two tasks minimum</text>
<line x1="716.0" y1="46.4" x2="716.0" y2="96.8" style="stroke:var(--ink-3)" stroke-width="1.2"/>
<text x="710.0" y="71.5" text-anchor="end" class="s-label">12x</text>
</svg>` },

    { t: "p", text: "The cloud bill is not the whole cost. Running Kubernetes well takes people, which at small scale costs more than either line, and is why small teams choose functions or managed containers even past the crossover. The opposite mistake is common too: a busy, steady API left on functions because it started there, paying ten times what it needs. The other number to know is latency. When no idle instance exists — after a quiet period, or when a burst needs more instances than are running — the platform starts one: a **cold start**. Measured here without the environment provisioning a real platform adds:" },

    { t: "code", lang: "python", title: "coldstart.py — a fresh runtime loading a function, against later calls to the same instance",
      code: `import json, os, statistics, subprocess, sys, tempfile, time

SLIM = """import json
def handler(event):
    return json.dumps({"ok": event["n"]})
"""
HEAVY = """import json, jwt, psycopg, pydantic, requests
from cryptography.hazmat.primitives.asymmetric import ec
conn = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres")   # init: once per environment
class Event(pydantic.BaseModel):
    n: int
def handler(event):
    e = Event(**event)
    return json.dumps({"ok": conn.execute("select %s::int", (e.n,)).fetchone()[0]})
"""
RUNTIME = """import json, sys, time
t0 = time.perf_counter()
g = {}; exec(compile(open(sys.argv[1]).read(), "function", "exec"), g)   # load the code: imports and init
t1 = time.perf_counter()
g["handler"]({"n": 0})                                                    # the first invocation
t2 = time.perf_counter()
print(json.dumps([t1 - t0, t2 - t1]), flush=True)
warm = []
for i in range(500):                                                      # later invocations reuse everything
    a = time.perf_counter(); g["handler"]({"n": i}); warm.append(time.perf_counter() - a)
print(json.dumps(sorted(warm)[250]), flush=True)
"""

def cold_start(source):
    path = os.path.join(tempfile.mkdtemp(), "fn.py"); open(path, "w").write(source)
    spawned = time.perf_counter()
    p = subprocess.Popen([sys.executable, "-c", RUNTIME, path], stdout=subprocess.PIPE, text=True)
    load, first = json.loads(p.stdout.readline()); total = time.perf_counter() - spawned
    warm = json.loads(p.stdout.readline()); p.wait()
    return total - load - first, load, first, total, warm

print(f"{'function':<20}{'runtime':>9}{'imports+init':>14}{'1st call':>10}{'= cold':>9}{'warm call':>11}")
for name, src in [("slim", SLIM), ("with dependencies", HEAVY)]:
    runs = [cold_start(src) for _ in range(7)]
    med = [statistics.median(r[i] for r in runs) for i in range(5)]
    print(f"{name:<20}" + "".join(f"{v * 1000:>{w}.0f} ms" for v, w in zip(med[:4], (6, 11, 7, 6)))
          + f"{med[4] * 1000:>8.3f} ms")`,
      hl: [9, 18, 20, 24],
      out: `function              runtime  imports+init  1st call   = cold  warm call
slim                    18 ms          1 ms      0 ms    19 ms   0.002 ms
with dependencies       19 ms        230 ms      1 ms   250 ms   0.076 ms` },

    { t: "p", text: "The runtime starts in under 20 ms; loading real dependencies and opening a database connection took about a quarter of a second, and the first request paid for all of it. Later calls reused the loaded modules and the open connection, and the handler's own overhead fell to well under a millisecond — thousands of times less. So cold starts live in the tail (11.1): rare under steady traffic, common after idle periods and at every burst." },

    { t: "dl", items: [
      { term: "Initialise outside the handler", def: "Create clients and connections once per instance, as the function with dependencies does, never once per request." },
      { term: "Trim the package", def: "Fewer and lighter dependencies; import lazily what only some paths need." },
      { term: "Keep instances warm", def: "Provisioned concurrency keeps a set number initialised, at a price; scheduled pings are a cruder version." },
      { term: "Snapshot the initialised state", def: "Lambda SnapStart restores a snapshot of an initialised runtime instead of building one." },
      { term: "Choose the runtime", def: "Compiled languages such as Go and Rust start fastest; a JVM without snapshots is the slowest." }
    ] },

    { t: "callout", kind: "trap", title: "Functions scale faster than what they call",
      body: [
        { t: "p", text: "A burst can start a thousand function instances in seconds, each opening its own database connection, while PostgreSQL's default limit is 100 (11.3). Put a pooler or database proxy in between, cap the function's concurrency, or use a store built for many short connections. And watch for triggers that feed themselves: a function that writes to the bucket that triggers it invokes itself in a loop, and bills for every turn." }
      ] },

    { t: "h2", n: "02", id: "multicloud", text: "Multi-cloud, honestly assessed",
      sub: "What it protects against, and what it costs" },

    { t: "diagram", kind: "matrix", title: "Multi-cloud strategies, weighed",
      cols: ["Protects against", "Costs", "Right when"],
      rows: ["One cloud, multi-region", "Best of breed", "Active-active, two clouds", "Portable by abstraction", "Hybrid with on-premises"],
      cells: [
        [{ text: "zone and region failures", tone: "good" }, { text: "regional replication (7.5)", tone: "warn" }, { text: "the default for most", tone: "good" }],
        [{ text: "nothing; adds dependencies", tone: "crit" }, { text: "egress, two skill sets", tone: "warn" }, { text: "one service clearly better" }],
        [{ text: "a whole provider failing", tone: "good" }, { text: "double cost, fewer services", tone: "crit" }, { text: "a regulator demands it" }],
        [{ text: "lock-in, in theory", tone: "warn" }, { text: "forgo managed services", tone: "crit" }, { text: "you sell into many clouds" }],
        [{ text: "data that must stay put", tone: "good" }, { text: "two operating models", tone: "warn" }, { text: "regulated data, legacy, edge" }]
      ] },

    { t: "p", text: "The honest default is one primary cloud used deeply — its managed databases, queues and identity — with multiple regions inside it for availability (7.5), and portability wherever it is cheap: containers, Terraform, OpenTelemetry, standard SQL. A whole provider failing is far rarer than a region failing, and running the same system on two clouds doubles the platform work while limiting you to what both offer. Multi-cloud is right when something outside engineering requires it: a regulator asking for an exit plan, customers who insist on their own cloud, or an acquisition that arrives on another provider." },

    { t: "callout", kind: "tradeoff", title: "Data gravity",
      body: [
        { t: "p", text: "Compute moves easily; data does not. Copying data out of a cloud is charged per gigabyte — at internet egress rates, tens of thousands of dollars per petabyte — and a petabyte takes over a week at 10 Gbit/s. Services that work on the same data belong in the same cloud and usually the same region; the multi-cloud designs that disappoint are those that keep shipping data across the boundary." }
      ] },

    { t: "h2", n: "03", id: "iac", text: "Infrastructure as code",
      sub: "Desired state in a repository, and plans reviewed like code" },

    { t: "p", text: "**Infrastructure as code** describes the infrastructure you want in files kept in a repository — Terraform or OpenTofu, Pulumi, CloudFormation, the CDK — and a tool makes reality match. It works in three steps: **refresh** what exists, **plan** the difference between the code and reality, and **apply** that plan, recording what it manages in a **state** file. Policy as code (Open Policy Agent, Sentinel) checks the plan before anything changes. A miniature of the whole loop:" },

    { t: "code", lang: "python", title: "iac.py — refresh, plan and policy, in miniature",
      code: `DESIRED = {                       # what the repository declares
    "aws_instance.web":        {"type": "m7g.large", "owner": "shop"},
    "aws_security_group.db":   {"ingress": ["5432 from sg-app"], "owner": "payments"},
    "aws_subnet.app_c":        {"cidr_block": "10.20.32.0/19", "zone": "eu-west-1c", "owner": "platform"},
    "aws_s3_bucket.invoices":  {"encrypted": False, "owner": "billing"},
}
STATE = {                         # what the tool recorded at the last apply
    "aws_instance.web":        {"type": "m7g.medium", "owner": "shop"},
    "aws_security_group.db":   {"ingress": ["5432 from sg-app"], "owner": "payments"},
    "aws_subnet.app_c":        {"cidr_block": "10.20.32.0/20", "zone": "eu-west-1c", "owner": "platform"},
    "aws_instance.bastion":    {"type": "t4g.micro", "owner": "platform"},
}
ACTUAL = {k: dict(v) for k, v in STATE.items()}                 # what the cloud API reports today...
ACTUAL["aws_security_group.db"]["ingress"] = ["5432 from sg-app", "5432 from 0.0.0.0/0"]   # ...after a console edit
FORCES_NEW = {"aws_subnet": {"cidr_block", "zone"}}            # attributes the API cannot change in place
POLICIES = [
    ("buckets must be encrypted", lambda k, r: not k.startswith("aws_s3_bucket") or r["encrypted"]),
    ("no database port open to the world", lambda k, r: "5432 from 0.0.0.0/0" not in r.get("ingress", [])),
    ("every resource has an owner", lambda k, r: bool(r.get("owner"))),
]

def diff(old, new):
    return {a: (old.get(a), new.get(a)) for a in old.keys() | new.keys() if old.get(a) != new.get(a)}

def show(was, now):                                             # lists as added/removed items, values as a -> b
    if isinstance(was, list):
        return ", ".join([f"+ {i}" for i in now if i not in was] + [f"- {i}" for i in was if i not in now])
    return f"{was} -> {now}"

for key in STATE:                                               # 1. refresh: has reality moved?
    for attr, (was, now) in diff(STATE[key], ACTUAL[key]).items():
        print(f"drift: {key} {attr} changed outside of code: {show(was, now)}")

print("\\nplan")                                                 # 2. plan: what would make reality match the code
counts = dict.fromkeys(["add", "change", "replace", "destroy"], 0)
for key in sorted(DESIRED.keys() | ACTUAL.keys()):
    if key not in ACTUAL:    print(f"  + {key}"); counts["add"] += 1
    elif key not in DESIRED: print(f"  - {key}"); counts["destroy"] += 1
    elif changes := diff(ACTUAL[key], DESIRED[key]):
        replace = changes.keys() & FORCES_NEW.get(key.split(".")[0], set())
        counts["replace" if replace else "change"] += 1
        for attr, (was, want) in changes.items():
            note = "  (forces replacement)" if attr in replace else ""
            print(f"{'-/+' if replace else '~':>3} {key:<24}{attr}: {show(was, want)}{note}")
print("Plan: " + ", ".join(f"{n} to {k}" for k, n in counts.items()) + ".")

print("\\npolicy")                                               # 3. policy as code, before anything is applied
failures = [(key, rule) for key, r in DESIRED.items() for rule, ok in POLICIES if not ok(key, r)]
for key, rule in failures: print(f"  FAIL {key}: {rule}")
print(f"apply blocked: {len(failures)} violation{'s' * (len(failures) != 1)}" if failures else "apply allowed")`,
      hl: [14, 15, 30, 40, 48],
      out: `drift: aws_security_group.db ingress changed outside of code: + 5432 from 0.0.0.0/0

plan
  - aws_instance.bastion
  ~ aws_instance.web        type: m7g.medium -> m7g.large
  + aws_s3_bucket.invoices
  ~ aws_security_group.db   ingress: - 5432 from 0.0.0.0/0
-/+ aws_subnet.app_c        cidr_block: 10.20.32.0/20 -> 10.20.32.0/19  (forces replacement)
Plan: 1 to add, 2 to change, 1 to replace, 1 to destroy.

policy
  FAIL aws_s3_bucket.invoices: buckets must be encrypted
apply blocked: 1 violation` },

    { t: "p", text: "Four lessons in one plan. Someone opened the database port to the world in the console: refresh caught the **drift**, and the plan will remove it, because the code is the source of truth and hand edits are reverted on the next apply. Changing an instance type is an update in place, but a subnet's range cannot be changed in place, so the plan says `-/+` — destroy and recreate, taking everything inside the subnet with it, and the single most important line for a reviewer to find. The bastion has gone from the code, so it will be destroyed. And the new invoice bucket failed a policy, so nothing is applied until the code is fixed." },

    { t: "diagram", kind: "steps", title: "Infrastructure changes through a pipeline",
      items: [
        { label: "Pull request", desc: "A change to the infrastructure code, small and reviewed like any other.", tone: "accent" },
        { label: "Plan in CI", desc: "The pipeline runs plan and policy checks and posts the result on the pull request.", tone: "violet" },
        { label: "Review the plan", desc: "Read the plan, not just the code: every destroy and replace must be deliberate.", tone: "warn" },
        { label: "Apply on merge", desc: "Only the pipeline can apply; people have read-only access to production.", tone: "good" },
        { label: "Detect drift", desc: "A scheduled plan alerts when reality diverges; GitOps tools like Argo CD reconcile.", tone: "teal" }
      ] },

    { t: "callout", kind: "trap", title: "State is sensitive and shared",
      body: [
        { t: "p", text: "The state file maps code to real resources and often holds secrets — generated passwords, keys — in plain text. Keep it remote, encrypted and locked, so two applies cannot run at once and no laptop holds the only copy. Split it by environment and team, so one bad plan cannot reach another's resources, and mark critical resources (databases, the VPC) so the tool refuses to destroy them." }
      ] },

    { t: "h2", n: "04", id: "compliance", text: "Compliance as an architectural input",
      sub: "Residency, erasure, audit and scope are decided early or paid for later" },

    { t: "table", head: ["Regime", "Applies to", "What it changes in the architecture"],
      rows: [
        ["GDPR", "personal data of people in the EU", "lawful bases and safeguards for transfers out of the EU; erasure on request, copies included; minimisation; breach notice within 72 hours"],
        ["PCI DSS", "payment card numbers", "a segmented, minimal cardholder environment; tokenisation; regular scans; strict logging and access review"],
        ["HIPAA", "US health information", "encryption, access control and audit logs on health data; agreements with every vendor that touches it"],
        ["SOC 2", "a service company's controls, audited", "evidence of change management, access reviews and monitoring — which IaC and CI produce as a by-product"],
        ["ISO 27001", "an information security management system", "risk assessment and controls run as a continuing process, not a project"]
      ] },

    { t: "p", text: "Most requirements map to mechanisms already in this course: residency to region-pinned data and sharding by region (4.2); erasure to crypto-shredding (12.3); audit to append-only event logs (10.4); least access to zero trust (12.3); segmentation to subnets and security groups (12.4). The biggest lever is **scope**. Every system that stores, processes or transmits card numbers — and every system connected to one — is in PCI scope, with its scans, reviews and audits. Tokenisation shrinks it:" },

    { t: "code", lang: "python", title: "scope.py — which systems an auditor will examine, before and after tokenisation",
      code: `BEFORE = {                        # who can connect to whom, and which systems see full card numbers
    "links": [("web", "checkout"), ("checkout", "payments"), ("checkout", "orders"), ("checkout", "fraud"),
              ("payments", "card vault"), ("orders", "analytics"), ("orders", "support tool"), ("orders", "email"),
              ("orders", "recommendations"), ("analytics", "warehouse"),
              *[(s, "logging") for s in ("web", "checkout", "orders", "payments", "fraud")]],
    "card_data": {"web", "checkout", "payments", "card vault", "fraud", "orders", "logging"},
}
AFTER = {                         # the browser sends the card straight to a tokeniser; everyone else sees a token
    "links": [("web", "checkout"), ("checkout", "payments"), ("checkout", "orders"), ("checkout", "fraud"),
              ("payments", "tokeniser"), ("tokeniser", "card vault"), ("orders", "analytics"),
              ("orders", "support tool"), ("orders", "email"), ("orders", "recommendations"), ("analytics", "warehouse"),
              *[(s, "logging") for s in ("web", "checkout", "orders", "payments", "fraud")],
              ("tokeniser", "card logs"), ("card vault", "card logs")],
    "card_data": {"tokeniser", "card vault"},
}

def scope(design):                # PCI DSS: systems that store, process or transmit card data, plus anything connected to them
    systems = {s for link in design["links"] for s in link}
    connected = {b if a in design["card_data"] else a for a, b in design["links"]
                 if (a in design["card_data"]) != (b in design["card_data"])}
    return systems, design["card_data"], connected

for name, design in [("before tokenisation", BEFORE), ("after tokenisation", AFTER)]:
    systems, card, connected = scope(design)
    print(f"{name}: {len(card | connected)} of {len(systems)} systems in scope")
    print(f"  see card numbers:  {', '.join(sorted(card))}")
    print(f"  connected to them: {', '.join(sorted(connected))}")`,
      hl: [6, 14, 19, 20],
      out: `before tokenisation: 11 of 12 systems in scope
  see card numbers:  card vault, checkout, fraud, logging, orders, payments, web
  connected to them: analytics, email, recommendations, support tool
after tokenisation: 4 of 14 systems in scope
  see card numbers:  card vault, tokeniser
  connected to them: card logs, payments` },

    { t: "viz", title: "One design decision, two audits",
      caption: "Before, card numbers passed through seven systems — including the logging cluster, because request bodies were logged, and orders, which kept them for refunds — and four more were in scope only because they connect to orders. After, the browser posts the card straight to a tokeniser and every other system handles only a token: four systems are in scope, two of them small and purpose-built, and orders, analytics and support can change at normal speed. A payment provider's hosted card fields go further and take the vault out of your estate altogether.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Systems in PCI scope before and after tokenisation">
<text x="184" y="18" text-anchor="middle" class="s-label" style="fill:var(--crit)">Before: 11 of 12 systems in scope</text>
<rect x="4" y="36" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="60" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">card vault</text>
<rect x="126" y="36" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="182" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">checkout</text>
<rect x="248" y="36" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="304" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">fraud</text>
<rect x="4" y="76" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="60" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink)">logging</text>
<rect x="126" y="76" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="182" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink)">orders</text>
<rect x="248" y="76" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="304" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink)">payments</text>
<rect x="4" y="116" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="60" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink)">web</text>
<rect x="126" y="116" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="182" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink)">analytics</text>
<rect x="248" y="116" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="304" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink)">email</text>
<rect x="4" y="156" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="60" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink)">recommendations</text>
<rect x="126" y="156" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="182" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink)">support tool</text>
<rect x="248" y="156" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="304" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">warehouse</text>
<text x="576" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">After tokenisation: 4 of 14 systems in scope</text>
<rect x="396" y="36" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="452" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">card vault</text>
<rect x="518" y="36" width="112" height="30" rx="7" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)" stroke-width="1.4"/>
<text x="574" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">tokeniser</text>
<rect x="640" y="36" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="696" y="55" text-anchor="middle" class="s-sub" style="fill:var(--ink)">card logs</text>
<rect x="396" y="76" width="112" height="30" rx="7" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)" stroke-width="1.4"/>
<text x="452" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink)">payments</text>
<rect x="518" y="76" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="574" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">analytics</text>
<rect x="640" y="76" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="696" y="95" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">checkout</text>
<rect x="396" y="116" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="452" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">email</text>
<rect x="518" y="116" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="574" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">fraud</text>
<rect x="640" y="116" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="696" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">logging</text>
<rect x="396" y="156" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="452" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">orders</text>
<rect x="518" y="156" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="574" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">recommendations</text>
<rect x="640" y="156" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="696" y="175" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">support tool</text>
<rect x="396" y="196" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="452" y="215" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">warehouse</text>
<rect x="518" y="196" width="112" height="30" rx="7" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)" stroke-width="1.4"/>
<text x="574" y="215" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">web</text>
<line x1="380" y1="30" x2="380" y2="236" style="stroke:var(--line);stroke-dasharray:4 4"/>
<rect x="150" y="262" width="14" height="14" rx="3" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)"/>
<text x="170" y="274" class="s-sub">sees card numbers</text>
<rect x="320" y="262" width="14" height="14" rx="3" style="fill:var(--warn);fill-opacity:.22;stroke:var(--warn)"/>
<text x="340" y="274" class="s-sub">connected to those</text>
<rect x="490" y="262" width="14" height="14" rx="3" style="fill:var(--line);fill-opacity:.0;stroke:var(--line)"/>
<text x="510" y="274" class="s-sub">out of scope</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Ask the compliance questions in the design review",
      body: [
        { t: "p", text: "What data is this, and how is it classified? Where may it live, and who may see it? How long is it kept, and how is it deleted — from backups and analytics copies too? What will an auditor ask for, and does the system produce that evidence automatically? Each answer is cheap on a whiteboard and expensive after launch." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A data-residency and retention checker",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "GDPR allows personal data to leave the EU under specific safeguards, but many companies adopt a simpler rule: EU personal data stays in EU regions unless pseudonymised. Write the checker that enforces such a policy over a data inventory — every dataset and every copy of it, because replicas, backups, analytics extracts and vendor exports are where violations hide — together with per-class retention limits." }
      ],
      requirements: [
        "Model each dataset with its class, whether it holds EU personal data, and every copy: where, region, pseudonymised or not, retention",
        "Flag EU personal data stored outside EU regions unless pseudonymised",
        "Flag any copy kept longer than its class allows, treating \"forever\" as a violation where a limit exists",
        "Print each violation with a remedy, and a summary count"
      ],
      hint: "Check copies, not datasets: the primary is usually compliant, and the problems are in the backup, the extract and the vendor.",
      solution: { lang: "python", title: "residency_ex.py",
        code: `MAX_DAYS = {"access logs": 90, "support": 730, "customer": None, "orders": 3650, "public": None}   # None = no limit

DATASETS = [   # name, class, contains EU personal data, and every copy: (where, region, pseudonymised, keep days)
    ("customers", "customer", True, [("primary", "eu-west-1", False, None), ("backup", "eu-central-1", False, None),
                                     ("analytics extract", "us-east-1", False, None),
                                     ("warehouse", "us-east-1", True, None)]),
    ("orders", "orders", True, [("primary", "eu-west-1", False, 3650), ("backup", "eu-central-1", False, 3650)]),
    ("support tickets", "support", True, [("helpdesk vendor", "us-west-2", False, 3650)]),
    ("access logs", "access logs", True, [("log store", "eu-west-1", False, 400), ("SIEM", "us-west-2", False, 90)]),
    ("product catalogue", "public", False, [("primary", "eu-west-1", False, None), ("CDN", "global", False, None)]),
]

def check(dataset):
    name, cls, eu_personal, copies = dataset
    for where, region, pseudonymised, days in copies:
        if eu_personal and not pseudonymised and not region.startswith("eu-"):
            yield f"{name} / {where}: EU personal data in {region}", "pseudonymise it, or keep it in an EU region"
        limit = MAX_DAYS[cls]
        if limit is not None and (days is None or days > limit):
            yield f"{name} / {where}: kept {days or 'forever'} days, limit {limit}", f"expire after {limit} days"

violations = [v for d in DATASETS for v in check(d)]
for problem, fix in violations:
    print(f"{problem:<64} -> {fix}")
copies = sum(len(d[3]) for d in DATASETS)
print(f"\\n{len(violations)} violations in {len(DATASETS)} datasets and {copies} copies")`,
        out: `customers / analytics extract: EU personal data in us-east-1     -> pseudonymise it, or keep it in an EU region
support tickets / helpdesk vendor: EU personal data in us-west-2 -> pseudonymise it, or keep it in an EU region
support tickets / helpdesk vendor: kept 3650 days, limit 730     -> expire after 730 days
access logs / log store: kept 400 days, limit 90                 -> expire after 90 days
access logs / SIEM: EU personal data in us-west-2                -> pseudonymise it, or keep it in an EU region

5 violations in 5 datasets and 11 copies`,
        notes: [
          { t: "p", text: "Every primary store passed; every violation was in a copy. The analytics extract and the SIEM shipped raw personal data to the US — access logs count, because IP addresses are personal data — while the warehouse copy was allowed because it was pseudonymised. The helpdesk vendor broke both rules at once, and the log store kept data more than four times longer than its limit." },
          { t: "p", text: "In a real system this inventory is generated, not typed: tags on every bucket and table (classification, owner, retention) set through infrastructure as code, and a scheduled job that walks the cloud's resource list and runs exactly these checks, so a new extract that breaks the rules is found the day it appears." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the emergency fix that the morning apply removed",
      body: [
        { t: "p", text: "**Symptom.** At 07:10 the order service in one region began failing every database call. Nothing had been deployed to it; the only change overnight was the scheduled infrastructure apply." },
        { t: "p", text: "**Mechanism.** Two nights earlier, during an incident, an engineer had added a security-group rule in the console so the service could reach a replica moved to another subnet. The fix worked and the incident closed, but the rule never reached the code. The scheduled apply did exactly what its plan said — removed a rule the code did not contain — and the plan was approved automatically because it showed only one in-place update to a security group." },
        { t: "p", text: "**Fix.** The rule went into the code and was applied within minutes. Afterwards: drift detection every hour, paging on any difference in production; a rule that an incident is not closed until its console changes are in a merged pull request; and human approval required for any plan that touches security groups, routes, or replaces or destroys anything." }
      ] }
  ],

  takeaways: [
    "Functions bill **per request**, containers **per hour of capacity**: with list prices, the crossover was near **10 requests a second**, about 26 million a month.",
    "Below it functions win — **ten times** cheaper at one request a second; above it containers win, **twelve times** at 500. Count the cost of running the platform too.",
    "Measured cold start: about **a quarter of a second** of dependencies and initialisation, against well under a millisecond once warm — it lands in the tail.",
    "Initialise outside the handler, trim packages, and keep instances warm with **provisioned concurrency** or snapshots where the tail matters.",
    "Functions scale faster than databases: **pool or proxy connections**, cap concurrency, and avoid triggers that call themselves.",
    "Default to **one cloud used deeply**, multi-region for availability; go multi-cloud when regulation, customers or an acquisition require it. **Data gravity** makes moving data the expensive part.",
    "Infrastructure as code: **refresh, plan, apply** from a pipeline; the plan is the review, so find every `-/+` and destroy.",
    "Console edits are **drift** and are reverted by the next apply: detect drift on a schedule and turn emergency fixes into code at once.",
    "**Policy as code** stops unsafe changes before apply; keep state **remote, encrypted, locked and split**.",
    "Compliance is a design input: residency, erasure, audit and **scope** — tokenisation cut PCI scope from **11 of 12** systems to **4 of 14**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A webhook handler receives about 50,000 requests a day, mostly in office hours. On cost, functions or containers?",
        options: ["Containers, which are always cheaper per request", "Functions: at well under one request a second on average, the containers' floor of two tasks around the clock costs many times more", "They cost the same", "Virtual machines"],
        answer: 1,
        why: "50,000 a day is about 0.6 requests a second on average. In breakeven.py, functions at that level cost a few dollars a month against the containers' flat floor of about fifty; the crossover is near ten requests a second." },

      { stem: "After quiet periods, the first requests to a function take 300 ms longer than the rest. What is happening, and what helps most directly?",
        options: ["The database is slower at night", "Cold starts: new instances load the runtime, dependencies and connections before serving; keep instances warm with provisioned concurrency, trim dependencies, and initialise outside the handler", "Network congestion", "Too much memory configured"],
        answer: 1,
        why: "With no idle instance available, the platform starts one, and the first request pays for loading everything — about a quarter of a second in coldstart.py. Warm instances avoid it entirely; lighter packages shorten it." },

      { stem: "A plan for a small change shows \"-/+ aws_subnet.app_c (forces replacement)\". What should the reviewer do?",
        options: ["Approve it; a replacement is just an update", "Stop: the subnet, and everything in it, would be destroyed and recreated; find a non-destructive change, such as adding a new subnet", "Apply it twice", "Approve it if the policy checks passed"],
        answer: 1,
        why: "Some attributes cannot change in place, so the tool destroys and recreates the resource — for a subnet, that means everything placed in it. Policies pass on what the code declares; only a human reading the plan notices the blast radius." },

      { stem: "Why does tokenising card numbers at the edge reduce compliance cost?",
        options: ["Tokens are encrypted card numbers", "Systems that only see tokens neither store, process nor transmit card data, so they — and systems connected only to them — leave PCI scope", "PCI DSS does not apply in the cloud", "It removes the need for any audit"],
        answer: 1,
        why: "Scope follows card data and connections to it. In scope.py, tokenisation left only the tokeniser, the vault and the systems directly connected to them in scope: four of fourteen systems instead of eleven of twelve." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Platform questions reward a decision tied to numbers and to the organisation, not a preference.",
    questions: [
      { level: "advanced",
        q: "Would you build this service on serverless functions or containers?",
        strong: "A strong answer decides on traffic shape, latency, duration, connections and team, with the cost crossover in numbers.",
        answer: [
          { t: "p", text: "It depends on five things. Traffic: functions cost nothing when idle and bill per request, so quiet or spiky services are far cheaper on them; steady traffic above roughly ten requests a second on average is cheaper on containers, increasingly so as it grows. Latency: cold starts add hundreds of milliseconds to some requests unless instances are kept warm. Duration and shape: long jobs, streaming connections and GPU work fit containers." },
          { t: "p", text: "Downstream: functions can open thousands of database connections in a burst, so they need a proxy or a store built for it. Team: functions need no platform, and Kubernetes needs people. A common answer is both — functions for event handlers, webhooks and scheduled jobs; containers for the core, high-traffic APIs — and revisiting the choice as traffic grows." }
        ] },

      { level: "core",
        q: "Should we go multi-cloud?",
        strong: "A strong answer asks what risk it addresses, compares it with multi-region, and names the costs.",
        answer: [
          { t: "p", text: "First, what is it for? For availability, multi-region in one cloud covers zone and region failures, which are much more common than a whole provider failing, at far lower cost. Running actively on two clouds roughly doubles platform work, limits you to what both offer, and adds egress charges whenever data crosses." },
          { t: "p", text: "Go multi-cloud when the business requires it — regulation demanding an exit plan, customers on a specific cloud, an acquisition — and otherwise keep the cheap portability: containers, Terraform, OpenTelemetry, standard SQL, with a documented exit plan rather than a running second estate." }
        ] },

      { level: "core",
        q: "How do you manage infrastructure changes safely?",
        strong: "A strong answer covers code, pipeline, plan review, policy, state and drift.",
        answer: [
          { t: "p", text: "All infrastructure in code, changed by pull request. CI runs the plan and policy checks and posts them; reviewers read the plan, especially replacements and destroys; only the pipeline applies, with people read-only in production. State is remote, encrypted, locked and split per environment and team, and critical resources are protected from deletion." },
          { t: "p", text: "Drift detection runs on a schedule and alerts on differences, and emergency console changes are turned into code before the incident closes — otherwise the next apply silently reverts them." }
        ] },

      { level: "advanced",
        q: "How does GDPR change your design?",
        strong: "A strong answer turns legal requirements into concrete mechanisms.",
        answer: [
          { t: "p", text: "Data inventory and classification first, with tags on every store. Residency: EU personal data in EU regions, or transfers under valid safeguards, with copies — backups, analytics extracts, vendors — included. Minimisation and pseudonymisation for analytics. Retention limits enforced automatically with expiry." },
          { t: "p", text: "Erasure on request across every copy, which is hard in backups and logs — crypto-shredding with per-user keys makes it tractable. Access control and audit logs for personal data, consent and purpose recorded with the data, and a breach process able to notify within 72 hours." }
        ] }
    ]
  }
});

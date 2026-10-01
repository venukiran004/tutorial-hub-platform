/* ============================================================================
   LESSON 2.2 — Load Balancing Algorithms and Health Checks
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "A load balancer makes two decisions on every request: **which server**, and **whether that server is alive**. The first is usually taught as a list of algorithms; the useful version is that algorithms which ignore the servers' current state — round robin, random — keep feeding a server that has slowed down until its queue grows without limit, while algorithms that look at outstanding work route around it. The second decision is a trade between **how fast you notice a dead server** and **how easily a blip convinces you every server is dead**.",

  objectives: [
    "Compare round robin, random, least connections and power-of-two-choices by measured tail latency",
    "Explain why state-blind algorithms fail badly when one server degrades",
    "Choose weights or a load-aware policy for a fleet of mixed server sizes",
    "Quantify the requests lost while a health check detects a dead server",
    "Design health checks that do not eject the whole fleet when a shared dependency blips"
  ],

  prerequisites: ["1.3", "2.1"],

  blocks: [

    { t: "h2", n: "01", id: "algorithms", text: "Which server: the algorithms",
      sub: "Blind to the servers, or watching them" },

    { t: "diagram", kind: "tree", title: "Load-balancing algorithms, grouped by what they know",
      caption: "The split that matters is the first one. Static algorithms decide without looking at the servers, so they cannot react to one being slow. Dynamic ones read outstanding connections or response times, so they route around trouble automatically.",
      root: { label: "Load balancing", tone: "accent", children: [
        { label: "Static", sub: "ignores server state", tone: "warn", children: [
          { label: "Round robin", sub: "next in turn" },
          { label: "Weighted RR", sub: "by capacity" },
          { label: "Hash", sub: "IP / key → server" }
        ] },
        { label: "Dynamic", sub: "reads server state", tone: "good", children: [
          { label: "Least conns", sub: "fewest in flight" },
          { label: "Two choices", sub: "best of 2 random" },
          { label: "Least time", sub: "fastest recent" }
        ] }
      ] } },

    { t: "p", text: "Ten single-worker servers, requests arriving at random at 80% of capacity, service times with a realistic tail. Each policy is run twice — with a healthy fleet, and with one server slowed to 40% speed, the way a noisy neighbour, a failing disk or a garbage-collection storm slows one machine in real fleets:" },

    { t: "code", lang: "python", title: "lb_sim.py — four policies, a healthy fleet and a degraded one", code: `import heapq, itertools, random

N = 10                      # servers, one worker each, FIFO
MEAN_MS = 20.0              # mean service time on a healthy server
UTIL = 0.80                 # offered load as a share of total healthy capacity
REQUESTS = 100_000

def simulate(policy, speed, seed=11):
    rng = random.Random(seed)
    free_at = [0.0] * N                    # when each server's worker is next idle
    inflight = [[] for _ in range(N)]      # completion times of requests still on each server
    rr = itertools.cycle(range(N))
    rate = UTIL * N / MEAN_MS              # arrivals per ms
    t, lat = 0.0, []
    for _ in range(REQUESTS):
        t += rng.expovariate(rate)
        for q in inflight:                 # forget requests that have finished by now
            while q and q[0] <= t: heapq.heappop(q)
        if policy == "round robin":
            s = next(rr)
        elif policy == "random":
            s = rng.randrange(N)
        elif policy == "least connections":
            s = min(range(N), key=lambda i: (len(inflight[i]), rng.random()))
        elif policy == "power of two choices":
            a, b = rng.sample(range(N), 2)
            s = a if len(inflight[a]) <= len(inflight[b]) else b
        work = rng.lognormvariate(0, 0.8) * MEAN_MS / 1.377   # heavy-ish tail, mean = MEAN_MS
        done = max(t, free_at[s]) + work / speed[s]
        free_at[s] = done
        heapq.heappush(inflight[s], done)
        lat.append(done - t)
    lat.sort()
    pct = lambda p: lat[int(p * len(lat)) - 1]
    return pct(0.50), pct(0.99), pct(0.999)

healthy = [1.0] * N
degraded = [1.0] * N
degraded[3] = 0.4           # one server at 40% speed: noisy neighbour, bad disk, GC storm

for title, speed in (("all ten healthy", healthy), ("one server at 40% speed", degraded)):
    print(title)
    print("  %-22s %9s %9s %10s" % ("policy", "p50 ms", "p99 ms", "p99.9 ms"))
    for p in ("round robin", "random", "power of two choices", "least connections"):
        p50, p99, p999 = simulate(p, speed)
        print("  %-22s %9.0f %9.0f %10.0f" % (p, p50, p99, p999))
    print()`,
      out: `all ten healthy
  policy                    p50 ms    p99 ms   p99.9 ms
  round robin                   35       300        450
  random                        65       460        663
  power of two choices          29       162        258
  least connections             19       123        215

one server at 40% speed
  policy                    p50 ms    p99 ms   p99.9 ms
  round robin                   41    226898     251657
  random                        77    219514     243125
  power of two choices          37       251        460
  least connections             23       165        308`,
      hl: [24, 26, 27],
      caption: "On a healthy fleet the dynamic policies already halve the tail. With one slow server, round robin and random keep sending it a tenth of the traffic it can no longer serve; its queue grows for the whole run and **p99 reaches minutes**. Least connections and power of two choices notice the queue and send it less — the tail barely moves." },

    { t: "callout", kind: "insight", title: "Power of two choices: almost all the benefit, almost none of the cost",
      body: [
        { t: "p", text: "Least connections needs the balancer to know every server's in-flight count and compare all of them, which is easy for one balancer and hard for twenty independent ones that each see only their own traffic. Picking **two servers at random and sending to the less loaded** needs to look at just two, and the measurement shows it captures most of the improvement." },
        { t: "p", text: "There is also a herd effect it avoids. When many balancers all pick the single least-loaded server at the same moment, they all send to it at once and overload it. Random sampling spreads those decisions out. That is why Envoy, NGINX and HAProxy all offer a \"random two\" mode and why many service meshes default to it." }
      ] },

    { t: "h3", text: "Weights for a mixed fleet" },

    { t: "p", text: "Fleets are rarely uniform: an old instance generation alongside a new one, or large and small machines from an autoscaler. Round robin sends each the same share, so the small ones saturate first. Either weight the static policy by capacity or use a load-aware one — the exercise below measures both." },

    { t: "h3", text: "Hash-based: when the same key must reach the same server" },

    { t: "p", text: "Hashing a client IP or a key to choose the server keeps related requests together — useful when a server holds a warm cache for that key, or for the stateful connection tier of 1.6. The catch is the one 2.1 measured: `hash % N` reassigns most keys when N changes. Production hash balancing uses **consistent hashing** (4.3) so a server leaving moves only its own share." },

    { t: "h2", n: "02", id: "health", text: "Whether a server is alive: health checks",
      sub: "Active probes, passive observation, and what each costs" },

    { t: "diagram", kind: "compare", title: "Two ways to find out a server has failed",
      caption: "Production balancers use both: passive detection reacts in milliseconds to failures that real traffic sees, and active probes find servers that are broken but receiving no traffic, and decide when an ejected one may come back.",
      columns: [
        { title: "Active — the balancer probes", tone: "accent", items: [
          "GET /healthz every N seconds per server",
          "unhealthy after K consecutive failures",
          "healthy again after M consecutive passes",
          "finds a dead server even with no traffic",
          "slow: detection takes seconds"
        ] },
        { title: "Passive — the balancer watches traffic", tone: "good", items: [
          "count real errors and timeouts per server",
          "eject after K consecutive 5xx (outlier detection)",
          "re-admit after a cool-down, gradually",
          "reacts in milliseconds under load",
          "blind to a server receiving no traffic"
        ] }
      ] },

    { t: "p", text: "Every request sent to a dead server before it is ejected fails. At 2,000 requests a second across ten servers, the dead one receives 200 a second until the balancer notices:" },

    { t: "code", lang: "python", title: "health.py — requests lost before ejection", code: `RPS = 2_000                 # requests per second across the fleet
N = 10                      # servers; one of them dies at a random moment
per_server = RPS / N

print("%-36s %14s %18s" % ("detection", "time to eject", "requests failed"))
for interval, threshold in ((30, 3), (10, 3), (5, 2), (2, 2)):
    # on average the death falls halfway between two checks, then \`threshold\` checks must fail
    eject_s = interval / 2 + interval * (threshold - 1)
    print("%-36s %12.0f s %18.0f" % (f"active: every {interval}s, {threshold} failures", eject_s, per_server * eject_s))
consecutive = 5             # passive: eject after 5 consecutive errors seen on real traffic
print("%-36s %12.3f s %18d" % (f"passive: {consecutive} consecutive errors", consecutive / per_server, consecutive))
print("%-36s %14s %18d" % ("passive + one retry elsewhere", "same", 0))`,
      out: `detection                             time to eject    requests failed
active: every 30s, 3 failures                  75 s              15000
active: every 10s, 3 failures                  25 s               5000
active: every 5s, 2 failures                    8 s               1500
active: every 2s, 2 failures                    3 s                600
passive: 5 consecutive errors               0.025 s                  5
passive + one retry elsewhere                  same                  0`,
      caption: "A common default — probe every 30 seconds, eject after 3 failures — loses **15,000 requests** per server death. Passive outlier detection loses five, and one retry on a different server (for idempotent requests, 1.4) hides even those from users. Tightening active checks helps, but every probe is load, and a too-sensitive check ejects healthy servers on a single slow response." },

    { t: "h3", text: "What a health check should test" },

    { t: "diagram", kind: "matrix", title: "Three depths of health check",
      caption: "Liveness and readiness answer different questions — \"restart me?\" and \"send me traffic?\" — which is why Kubernetes has a probe for each. A deep check belongs on a dashboard, not in the routing decision.",
      cols: ["Checks", "Use for", "Risk"],
      rows: ["Liveness", "Readiness", "Deep"],
      cells: [
        [{ text: "the process answers at all", tone: "good" }, { text: "restart if dead" }, { text: "misses a broken dependency", tone: "warn" }],
        [{ text: "it can do its own job now", tone: "good" }, { text: "route traffic or not", tone: "good" }, { text: "low, if no shared deps" }],
        [{ text: "every dependency: DB, cache", tone: "warn" }, { text: "dashboards, alerting", tone: "accent" }, { text: "a DB blip ejects the fleet", tone: "crit" }]
      ] },

    { t: "callout", kind: "trap", title: "The deep health check that turned a database blip into a total outage",
      body: [
        { t: "p", text: "A health endpoint that queries the database feels thorough: if the database is unreachable, the server cannot serve, so take it out of rotation. But the database is shared. When it pauses for three seconds — a failover, a lock — **every server fails its health check at the same moment**, the balancer ejects all of them, and a three-second database hiccup becomes a full outage that lasts until the probes pass again." },
        { t: "p", text: "Health checks that drive routing should test only what is **local to that server** — the process is up, its thread pool is not exhausted, it has finished warming up. A failure of a shared dependency is not a reason to route away from one server, because every other server has the same problem. Most balancers also offer a **fail-open** rule: if more than half the fleet looks unhealthy, ignore the checks and send traffic anyway, on the grounds that the check is more likely to be wrong than half the fleet." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Balance a mixed fleet",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "An autoscaling group has four large servers with four workers each and six small servers with one worker each — 22 workers. Offered load is 80% of total capacity. Measure p50 and p99 under round robin, weighted round robin (weight = worker count) and least connections normalised by worker count." }
      ],
      requirements: [
        "Simulate each server as a pool of FIFO workers taking the earliest-free worker",
        "Implement weighted round robin by repeating each server in the rotation by its weight",
        "Implement least connections as in-flight requests divided by worker count",
        "Report p50 and p99 for the three policies",
        "Explain the round-robin result from the per-server arrival rate"
      ],
      hint: "Under round robin each server receives one-tenth of the traffic. Work out what one-tenth is in workers' worth of load and compare it with a small server's single worker.",
      solution: { lang: "python", title: "lb_ex.py",
        code: `import heapq, itertools, random

# 4 large servers (4 workers each) and 6 small ones (1 worker each): 22 workers in all
WORKERS = [4] * 4 + [1] * 6
MEAN_MS, UTIL, REQUESTS = 20.0, 0.80, 100_000

def simulate(policy, seed=5):
    rng = random.Random(seed)
    n = len(WORKERS)
    free = [[0.0] * w for w in WORKERS]          # each worker's next-idle time
    inflight = [[] for _ in range(n)]
    rate = UTIL * sum(WORKERS) / MEAN_MS
    weighted = [i for i, w in enumerate(WORKERS) for _ in range(w)]   # server i appears w times
    rr, wrr = itertools.cycle(range(n)), itertools.cycle(weighted)
    t, lat = 0.0, []
    for _ in range(REQUESTS):
        t += rng.expovariate(rate)
        for q in inflight:
            while q and q[0] <= t: heapq.heappop(q)
        if policy == "round robin":            s = next(rr)
        elif policy == "weighted round robin": s = next(wrr)
        else:                                  # least connections, per worker
            s = min(range(n), key=lambda i: (len(inflight[i]) / WORKERS[i], rng.random()))
        work = rng.lognormvariate(0, 0.8) * MEAN_MS / 1.377
        k = min(range(WORKERS[s]), key=lambda j: free[s][j])          # earliest-free worker
        done = max(t, free[s][k]) + work
        free[s][k] = done
        heapq.heappush(inflight[s], done)
        lat.append(done - t)
    lat.sort()
    return lat[len(lat) // 2], lat[int(0.99 * len(lat))]

print("%-22s %8s %10s" % ("policy", "p50 ms", "p99 ms"))
for p in ("round robin", "weighted round robin", "least connections"):
    p50, p99 = simulate(p)
    print("%-22s %8.0f %10.0f" % (p, p50, p99))`,
        out: `policy                   p50 ms     p99 ms
round robin               14443      82523
weighted round robin         23        177
least connections            16        103`,
        notes: [
          { t: "p", text: "Round robin is not merely worse; it is **unstable**. Total load is 0.8 × 22 = 17.6 workers' worth, so each of the ten servers receives 1.76 workers' worth — fine for a large server with four, and 176% of a small server's one. The small servers' queues grow without bound for the whole run, which is why the median is fourteen seconds, not milliseconds." },
          { t: "p", text: "Weighted round robin fixes the stability by matching share to capacity, and least connections does better still because it also absorbs **randomness** — a burst of slow requests on one server — which no static weight can see. Weights are only correct on average; load-aware policies are correct now." },
          { t: "p", text: "The practical rule: with a mixed or changing fleet, use a load-aware policy (least outstanding requests, or power of two choices) rather than maintaining weights by hand. Hand-set weights go stale the day the autoscaler adds a different instance type." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: one slow node and a round-robin balancer",
      body: [
        { t: "p", text: "**Symptom.** An API's p99 rose from 200 ms to over 30 seconds within ten minutes, while p50 stayed normal and fleet-average CPU was 55%. Only about one request in twelve was slow, but those requests timed out, were retried by clients, and the retries made it worse." },
        { t: "p", text: "**Mechanism.** One of twelve instances had landed on a host with a failing disk and was running at roughly a third of normal speed. It still answered its health check — a liveness probe that returned 200 in a millisecond — so it stayed in rotation, and the round-robin balancer kept sending it one-twelfth of the traffic. Exactly as in the simulation, its queue grew for as long as the condition lasted. The fleet average hid it because eleven servers were fine." },
        { t: "p", text: "**Fix.** Immediate: remove the instance. Lasting: switch the balancer to least outstanding requests, so a slow server automatically receives less; add passive outlier detection on latency as well as errors; and alert on **per-instance** p99, not fleet average, because a fleet average cannot show one bad member." }
      ] }
  ],

  takeaways: [
    "A balancer decides **which server** and **whether it is alive** on every request.",
    "**Static** algorithms (round robin, random, hash) ignore server state; **dynamic** ones (least connections, two choices, least time) read it.",
    "Measured: on a healthy fleet least connections roughly **halved the p99** of round robin; with one server at 40% speed, round robin's **p99 reached minutes** while least connections barely moved.",
    "**Power of two choices** — pick two at random, use the less loaded — captures most of the benefit, needs little state, and avoids herds of balancers piling onto one server.",
    "For a mixed fleet, round robin is **unstable** (measured median of 14 seconds); weights fix the average, load-aware policies also absorb randomness.",
    "**Hash balancing** keeps a key on one server; use consistent hashing so a server leaving moves only its own keys (4.3).",
    "A 30-second, three-strike active check loses **15,000 requests** per server death at 2,000 rps; passive outlier detection loses about five, and a retry elsewhere hides them.",
    "**Liveness** answers \"restart me?\"; **readiness** answers \"send me traffic?\". Keep shared dependencies out of both.",
    "A **deep health check** that tests the shared database ejects the entire fleet on one database blip. Fail open when most of the fleet looks unhealthy.",
    "Alert on **per-instance** latency: a fleet average hides the one bad node."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "One server in a round-robin pool slows to 40% of its normal speed. What happens to its queue at 80% overall utilisation?",
        options: ["It stays short, because round robin is fair", "It grows without limit, because it still receives a tenth of the traffic but can only serve 40% of a server's worth", "The balancer automatically sends it less", "It empties, because slower servers receive fewer requests"],
        answer: 1,
        why: "Round robin sends each server the same share regardless of state, so the slow server receives 0.8 of a normal server's load and can process 0.4 — arrivals exceed service and the queue grows for as long as the condition lasts; the simulation's p99 reached minutes. \"Fair\" share is the problem, not the solution. Only a load-aware policy sends it less, and nothing about round robin reduces a slow server's share." },

      { stem: "Why might many independent load balancers each choosing \"the least-loaded server\" perform badly?",
        options: ["Least-loaded is expensive to compute", "They all pick the same server at the same moment and overload it — a herd", "Least-loaded ignores health checks", "It only works with HTTP/1.1"],
        answer: 1,
        why: "Each balancer sees the same momentarily idle server and sends to it simultaneously, so it goes from least loaded to most loaded in an instant. Power of two choices avoids this by sampling randomly, spreading the decisions. Computing a minimum over a fleet is cheap; health checking is independent of the selection policy; and protocol version is unrelated." },

      { stem: "A health endpoint returns 200 only if the app can query the shared primary database. The database fails over, taking 4 seconds. What happens?",
        options: ["Requests are routed to the database's replica", "Every app server fails its check at once and is ejected, causing a full outage until checks pass again", "Only the server that noticed first is ejected", "Nothing — health checks ignore short failures"],
        answer: 1,
        why: "All servers share the database, so all fail the check at the same moment and the balancer removes the whole fleet — a four-second blip becomes an outage lasting until enough checks pass to re-admit them. Health checks do not reroute database traffic, there is nothing server-specific about the failure to single one out, and whether a short failure is ignored depends entirely on the thresholds — a common configuration ejects after two or three failed probes." },

      { stem: "Why combine passive outlier detection with active health checks rather than using only one?",
        options: ["Passive detection reacts in milliseconds to failures traffic sees; active probes find dead servers receiving no traffic and control re-admission", "Active checks are always more accurate", "Passive detection cannot detect errors", "It is required by HTTP/2"],
        answer: 0,
        why: "Passive detection uses real traffic, so under load it ejects a failing server after a handful of errors — five requests in the example instead of thousands — but it cannot see a server that is receiving no traffic, and it needs a way to decide when to let a server back. Active probes cover both. Neither is always more accurate, passive detection is precisely error detection, and the protocol version has nothing to do with it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Algorithms are a list; the senior answer is about what happens when one server goes bad.",
    questions: [
      { level: "core",
        q: "Which load-balancing algorithm would you use?",
        strong: "A strong answer defaults to a load-aware policy and explains with the degraded-server case.",
        answer: [
          { t: "p", text: "A load-aware one — least outstanding requests, or power of two choices if there are many independent balancers. The deciding case is a degraded server. Round robin keeps sending a slow server its full share, so its queue grows without bound and the tail latency explodes even though the fleet average looks fine. A policy that watches in-flight requests sends a slow server less automatically." },
          { t: "p", text: "I would use hash-based balancing only where I need a key to land on the same server — a warm per-key cache or a stateful connection — and then with consistent hashing, so a server leaving moves only its own keys." }
        ] },

      { level: "core",
        q: "How should health checks be designed?",
        strong: "A strong answer separates liveness and readiness, combines active and passive, and keeps shared dependencies out.",
        answer: [
          { t: "p", text: "Two kinds and two mechanisms. Liveness says whether to restart the process; readiness says whether to send it traffic. Both should test only what is local to that instance — the process responds, it has warmed up, its pools are not exhausted — never a shared database, or a database blip ejects every server at once." },
          { t: "p", text: "For detection speed I would combine active probes, which catch servers with no traffic and govern re-admission, with passive outlier detection on real traffic, which ejects a failing server after a few errors instead of after tens of seconds. Then retries of idempotent requests on a different server, so the few that hit a dying server are invisible. And fail open if more than half the fleet looks unhealthy." }
        ] },

      { level: "advanced",
        q: "p99 latency rose sharply but CPU across the fleet is normal. What is your hypothesis?",
        strong: "A strong answer suspects a single degraded instance hidden by averages and knows how to confirm it.",
        answer: [
          { t: "p", text: "That one instance, or a few, is slow and still in rotation, with a state-blind balancing policy feeding it its full share. A fleet average hides one bad node among twelve, and a shallow liveness check keeps passing because the process is up." },
          { t: "p", text: "I would break latency and error rate down per instance to find it, check the host — disk, noisy neighbour, GC — and remove it. Then fix the class of problem: a load-aware balancing policy, outlier detection on latency as well as errors, and per-instance p99 alerts." }
        ] }
    ]
  }
});

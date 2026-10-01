/* ============================================================================
   LESSON 7.4 — Backpressure and Load Shedding
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "When more work arrives than a service can do, something has to give, and the only question is **what**. Left alone, the excess waits in queues — every buffer, socket and thread pool fills — so latency climbs until clients give up, and the server then spends its capacity answering requests **nobody is waiting for any more**. Measured below, an overload of just 20% cut useful output by four-fifths. The fix is to say no early and cheaply: **bound the queues**, **shed** the work that matters least, and push back on the sender — **backpressure** — so overload is contained where it starts.",

  objectives: [
    "Explain how an unbounded queue turns modest overload into a goodput collapse, and measure it",
    "Compare bounded queues, dropping expired work and adaptive LIFO under overload",
    "Shed load by priority so the most valuable requests survive",
    "Apply backpressure through every layer, from TCP to message consumers",
    "Choose where to reject: as early and as cheaply as possible"
  ],

  prerequisites: ["7.1", "7.2", "6.1"],

  blocks: [

    { t: "h2", n: "01", id: "collapse", text: "Why an unbounded queue is a latency bomb",
      sub: "Overload turns into waiting, then into wasted work" },

    { t: "p", text: "One worker completes 1,000 requests a second. For thirty seconds, 1,200 a second arrive — a 20% overload — and then 800. Clients give up after one second. Four ways to run the queue:" },

    { t: "code", lang: "python", title: "shedding.py — the same overload under four queueing policies", code: `import random
from collections import deque

SERVICE = 0.001                 # 1 ms of work per request, one worker: capacity 1,000/s
TIMEOUT = 1.0                   # clients give up after one second

def simulate(policy, seconds=60, seed=6):
    rng = random.Random(seed)
    arrivals, t = [], 0.0
    while t < seconds:          # 1,200/s for 30 s (20% over capacity), then 800/s
        t += rng.expovariate(1_200 if t < 30 else 800); arrivals.append(t)
    q, i, now = deque(), 0, 0.0
    good = wasted = rejected = 0; lat = []
    while i < len(arrivals) or q:
        if not q:
            now = max(now, arrivals[i])
        while i < len(arrivals) and arrivals[i] <= now:     # admit everything that has arrived
            a = arrivals[i]; i += 1
            if policy == "bounded queue (100)" and len(q) >= 100:
                rejected += 1; continue                         # fast 503: the client can retry elsewhere
            q.append(a)
        if not q: continue
        a = q.pop() if policy == "adaptive LIFO" and len(q) > 100 else q.popleft()
        if policy in ("drop expired", "adaptive LIFO") and now - a > TIMEOUT:
            rejected += 1; continue                             # the client has gone: skip the work
        now += SERVICE
        if now - a <= TIMEOUT: good += 1; lat.append(now - a)
        else: wasted += 1                                       # served, but nobody was waiting
    lat.sort()
    return good, wasted, rejected, lat[int(len(lat) * 0.5)] * 1000, lat[int(len(lat) * 0.99)] * 1000

print("one worker, capacity 1,000/s; 1,200/s arrive for 30 s, then 800/s; clients time out at 1 s")
print("%-22s %12s %16s %10s %10s %10s" % ("policy", "successful", "wasted (late)", "refused", "p50 ms", "p99 ms"))
for p in ("unbounded FIFO", "bounded queue (100)", "drop expired", "adaptive LIFO"):
    g, w, r, p50, p99 = simulate(p)
    print("%-22s %12s %16s %10s %10.0f %10.0f" % (p, "{:,}".format(g), "{:,}".format(w), "{:,}".format(r), p50, p99))`,
      out: `one worker, capacity 1,000/s; 1,200/s arrive for 30 s, then 800/s; clients time out at 1 s
policy                   successful    wasted (late)    refused     p50 ms     p99 ms
unbounded FIFO               11,102           48,808          0        482        994
bounded queue (100)          54,001                0      5,909         95        101
drop expired                 47,293            7,608      5,009        361       1000
adaptive LIFO                54,010                0      5,900          2         47`,
      hl: [19, 23, 24, 27, 28],
      caption: "With an **unbounded FIFO** queue, the backlog grows until every request waits about a second — so most finish after their client has left. Of 60,000 requests, only about **11,000** were useful; the server spent most of its capacity on **work nobody received**, and kept doing so after the overload ended while it drained. A **bounded** queue refused some requests instantly and served the rest within a tenth of a second — **five times the useful output**. Dropping requests only once they have expired still lets the queue sit at the timeout's edge. **Adaptive LIFO** — serve the newest first when the queue is long — gave the lowest latency of all." },

    { t: "viz", title: "Time spent waiting in the queue",
      caption: "The unbounded queue's delay climbs throughout the overload to several seconds — far past the one-second client timeout — and keeps the service serving stale requests for most of the next half-minute while it drains. The bounded queue caps the wait at what 100 queued requests cost. Adaptive LIFO serves fresh requests immediately and lets the oldest — whose clients are leaving anyway — be the ones that wait or are dropped.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0 s</text>
<line x1="64" y1="207.0" x2="610" y2="207.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="211.0" text-anchor="end" class="s-sub">1 s</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">2 s</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">4 s</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">6 s</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">8 s</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">0</text>
<text x="91.3" y="252" text-anchor="middle" class="s-sub"></text>
<text x="118.6" y="252" text-anchor="middle" class="s-sub"></text>
<text x="145.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="173.2" y="252" text-anchor="middle" class="s-sub">12</text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub"></text>
<text x="227.8" y="252" text-anchor="middle" class="s-sub"></text>
<text x="255.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="282.4" y="252" text-anchor="middle" class="s-sub">24</text>
<text x="309.7" y="252" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="364.3" y="252" text-anchor="middle" class="s-sub"></text>
<text x="391.6" y="252" text-anchor="middle" class="s-sub">36</text>
<text x="418.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="446.2" y="252" text-anchor="middle" class="s-sub"></text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub"></text>
<text x="500.8" y="252" text-anchor="middle" class="s-sub">48</text>
<text x="528.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="555.4" y="252" text-anchor="middle" class="s-sub"></text>
<text x="582.7" y="252" text-anchor="middle" class="s-sub"></text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">60</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">seconds — 20% overload until t = 30, then 80% load</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">median time in queue</text>
<polyline points="64.0,232.1 91.3,220.0 118.6,206.6 145.9,189.9 173.2,178.6 200.5,166.3 227.8,153.3 255.1,139.1 282.4,128.0 309.7,113.5 337.0,100.6 364.3,84.4 391.6,75.0 418.9,96.0 446.2,117.1 473.5,140.0 500.8,160.2 528.1,179.8 555.4,201.3 582.7,221.7 610.0,233.9" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="232.1" r="3.6" style="fill:var(--crit)"/>
<circle cx="91.3" cy="220.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="118.6" cy="206.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="145.9" cy="189.9" r="3.6" style="fill:var(--crit)"/>
<circle cx="173.2" cy="178.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="200.5" cy="166.3" r="3.6" style="fill:var(--crit)"/>
<circle cx="227.8" cy="153.3" r="3.6" style="fill:var(--crit)"/>
<circle cx="255.1" cy="139.1" r="3.6" style="fill:var(--crit)"/>
<circle cx="282.4" cy="128.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="309.7" cy="113.5" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="100.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="364.3" cy="84.4" r="3.6" style="fill:var(--crit)"/>
<circle cx="391.6" cy="75.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="418.9" cy="96.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="446.2" cy="117.1" r="3.6" style="fill:var(--crit)"/>
<circle cx="473.5" cy="140.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="500.8" cy="160.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="528.1" cy="179.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="555.4" cy="201.3" r="3.6" style="fill:var(--crit)"/>
<circle cx="582.7" cy="221.7" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="233.9" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">unbounded FIFO</text>
<polyline points="64.0,232.1 91.3,231.3 118.6,231.3 145.9,231.3 173.2,231.3 200.5,231.4 227.8,231.3 255.1,231.3 282.4,231.3 309.7,231.3 337.0,233.6 364.3,233.9 391.6,234.0 418.9,233.9 446.2,233.9 473.5,233.9 500.8,233.9 528.1,233.9 555.4,233.9 582.7,233.9 610.0,233.9" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="232.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="91.3" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="118.6" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="145.9" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="173.2" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="200.5" cy="231.4" r="3.6" style="fill:var(--warn)"/>
<circle cx="227.8" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="255.1" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="282.4" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="309.7" cy="231.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="233.6" r="3.6" style="fill:var(--warn)"/>
<circle cx="364.3" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="391.6" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="418.9" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="446.2" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="473.5" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="500.8" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="528.1" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="555.4" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="582.7" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="233.9" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">bounded (100)</text>
<polyline points="64.0,233.8 91.3,234.0 118.6,234.0 145.9,234.0 173.2,234.0 200.5,234.0 227.8,234.0 255.1,234.0 282.4,234.0 309.7,234.0 337.0,233.9 364.3,233.9 391.6,234.0 418.9,233.9 446.2,233.9 473.5,233.9 500.8,233.9 528.1,233.9 555.4,233.9 582.7,233.9 610.0,233.9" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="233.8" r="3.6" style="fill:var(--good)"/>
<circle cx="91.3" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="118.6" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="145.9" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="173.2" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="200.5" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="227.8" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="255.1" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="282.4" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="309.7" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="364.3" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="391.6" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="418.9" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="446.2" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="473.5" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="500.8" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="528.1" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="555.4" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="582.7" cy="233.9" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="233.9" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">adaptive LIFO</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Goodput, not throughput",
      body: [
        { t: "p", text: "Throughput counts requests completed; **goodput** counts requests completed in time to be useful. Under overload the two diverge sharply: the unbounded server's throughput stayed at its full 1,000 a second while its goodput fell by four-fifths. Dashboards that show only throughput and CPU make a collapsing service look busy and healthy." },
        { t: "p", text: "The cure is counter-intuitive: **reject more to serve more**. Refusing 10% of requests instantly kept the other 90% fast, which is far more useful output than accepting everything and serving most of it too late. Retries from refused clients are then shaped by backoff and budgets (7.1) rather than piling into the queue." }
      ] },

    { t: "h2", n: "02", id: "shedding", text: "Shedding by priority",
      sub: "If something must be refused, choose what" },

    { t: "diagram", kind: "steps", title: "Load-shedding tiers, shed first at the bottom",
      caption: "Each request carries a priority set at the edge — from the endpoint, the user tier or a header. As the service's own measure of overload rises (queue length, concurrency, latency), it sheds the lowest tier first. Google's SRE practice calls these criticality levels.",
      items: [
        { label: "Critical", desc: "checkout, payment, login — shed only when nothing else is left", code: "keep", tone: "crit" },
        { label: "Important", desc: "the product page, search results", code: "shed at high load", tone: "warn" },
        { label: "Deferrable", desc: "recommendations, reviews, analytics beacons — degrade to fallbacks (7.2)", code: "shed early", tone: "accent" },
        { label: "Background", desc: "prefetching, batch jobs, internal reports", code: "shed first", tone: "teal" }
      ] },

    { t: "callout", kind: "trap", title: "Rejecting expensively",
      body: [
        { t: "p", text: "A request that will be refused should cost as little as possible: refused at the load balancer or in the first lines of the handler, before authentication calls, database queries or deserialising a large body. A service that does half of a request's work before discovering it is overloaded spends its scarce capacity on refusals, and its rejections become as expensive as its successes." },
        { t: "p", text: "The cheapest rejection is the earliest one: at the edge (rate limits, 7.3), at the load balancer (concurrency limits), at the start of the handler (admission control on queue length or in-flight count). Measure the cost of a rejected request — it should be microseconds." }
      ] },

    { t: "h2", n: "03", id: "backpressure", text: "Backpressure",
      sub: "Making the sender slow down instead of the receiver drowning" },

    { t: "p", text: "Load shedding drops work; backpressure **slows the producer** so the work is not created faster than it can be done. It only works if every layer passes the signal upstream instead of absorbing it in a buffer:" },

    { t: "table",
      head: ["Layer", "Backpressure signal", "What absorbing it instead looks like"],
      rows: [
        ["TCP", "The receive window shrinks; the sender's writes block", "Unbounded application buffers in memory"],
        ["HTTP service", "429 or 503 with Retry-After; a concurrency limit at the balancer", "Accepting every request into an unbounded worker queue"],
        ["Message consumers", "Pull-based consumption: the consumer fetches only what it can handle (6.1)", "Push delivery into an in-process queue"],
        ["Streams and reactive code", "Demand signalling: request(n) in Reactive Streams, bounded channels", "Unbounded asyncio queues or channels"],
        ["Producers of a queue", "A bounded queue that blocks or rejects the producer when full", "A queue that grows until memory runs out"]
      ],
      caption: "Every unbounded buffer in a path is a place where backpressure stops and latency starts to accumulate silently. Bounding them is what lets overload be seen — and handled — where it originates." },

    { t: "exercise", kind: "Challenge", title: "Keep checkout alive under overload",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A storefront service can complete 1,000 requests a second. During a sale, about 1,430 a second arrive, of which 15% are checkout requests and the rest are browsing. Compare a bounded FIFO admission queue with priority shedding that refuses browsing early, and measure the share of each class served." }
      ],
      requirements: [
        "Simulate a bounded queue of 100 that admits whatever arrives while there is room",
        "Simulate priority shedding: refuse browsing once the queue is half full; refuse checkout only when it is full",
        "Report the share of checkout and browsing requests served under each",
        "Explain why total useful work hardly changes while checkout's survival does"
      ],
      hint: "Both policies serve the same 1,000 requests a second. The question is only which ones.",
      solution: { lang: "python", title: "priority_shed_ex.py",
        code: `import random
from collections import deque

CAPACITY = 1_000                                          # requests/s the service can complete
def simulate(policy, seconds=30, seed=9):
    rng = random.Random(seed)
    served = {"checkout": 0, "browse": 0}; offered = {"checkout": 0, "browse": 0}
    budget, q = 0.0, deque()
    for ms in range(seconds * 1000):
        for _ in range(rng.choices([0, 1, 2, 3], [0.22, 0.33, 0.25, 0.20])[0]):   # ~1.43/ms ≈ 1,430/s
            kind = "checkout" if rng.random() < 0.15 else "browse"
            offered[kind] += 1
            if policy == "bounded FIFO":
                if len(q) < 100: q.append(kind)            # whoever arrives first gets in
            else:                                          # priority shedding
                load = len(q) / 100
                if kind == "browse" and load > 0.5: continue        # shed browse early...
                if len(q) < 100: q.append(kind)                     # ...checkout only when full
        budget += CAPACITY / 1000
        while budget >= 1 and q:
            served[q.popleft()] += 1; budget -= 1
        budget = min(budget, 1)
    return {k: served[k] / offered[k] for k in served}

print("about 1,430 req/s offered to a service that completes 1,000/s; 15% are checkout")
for p in ("bounded FIFO", "priority shedding"):
    r = simulate(p)
    print("%-18s checkout served %5.1f%%   browse served %5.1f%%" % (p, 100 * r["checkout"], 100 * r["browse"]))`,
        out: `about 1,430 req/s offered to a service that completes 1,000/s; 15% are checkout
bounded FIFO       checkout served  70.1%   browse served  69.4%
priority shedding  checkout served  99.8%   browse served  64.1%`,
        notes: [
          { t: "p", text: "Bounded FIFO is fair, and fairness is the problem: checkout and browsing each lose about 30%, so roughly one sale in three fails during the busiest hour of the year. Priority shedding serves essentially every checkout and takes the whole shortfall out of browsing." },
          { t: "p", text: "Total work done is the same — capacity is 1,000 a second either way. Load shedding cannot create capacity; it decides **who gets it**. That decision belongs to the business, which is why priorities are agreed in advance and attached to requests at the edge, not improvised during an incident." },
          { t: "p", text: "Shedding at half-full rather than at full matters: it leaves headroom in the queue that only critical requests can use, so a checkout arriving during a burst still finds a slot. The same idea appears as reserved capacity in thread pools and connection pools." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the service that stayed down after the traffic left",
      body: [
        { t: "p", text: "**Symptom.** A marketing email drove a spike to about 130% of a search service's capacity for eight minutes. The spike ended — and the service stayed unusable for another twenty-five minutes, with p99 latency pinned at the clients' 10-second timeout, CPU at 100%, and almost no successful searches." },
        { t: "p", text: "**Mechanism.** Every layer queued without limit: the load balancer's request queue, the application server's accept queue, and an unbounded worker pool queue. During the spike, the backlog grew to minutes of work. Clients timed out and **retried**, adding to it. After the spike, the service was still working through requests whose clients had long gone, each one fully executed, while fresh requests queued behind them and timed out in turn — the unbounded FIFO row, sustained by retries." },
        { t: "p", text: "**Fix.** Bounded queues at each layer, sized so the worst queueing delay is a fraction of the client timeout; a concurrency limit at the load balancer; requests carrying a deadline that the service checks before starting work (7.1); search suggestions marked deferrable and shed first; and client retry budgets. A later spike of the same size produced a few minutes of fast 503s for suggestions and no outage." }
      ] }
  ],

  takeaways: [
    "Under overload, an **unbounded queue** grows until requests wait longer than clients will — then the server spends capacity on **work nobody receives**.",
    "Measured: a **20% overload** with an unbounded FIFO cut useful output to about **one-fifth**; a bounded queue served **five times more** in time.",
    "Watch **goodput** (useful, in-time completions), not just throughput: a collapsing service looks busy.",
    "**Reject more to serve more**: refusing a little work instantly keeps the rest fast.",
    "**Adaptive LIFO** serves the newest requests first when the queue is long, giving the lowest latency to clients still waiting.",
    "**Shed by priority**: measured, priority shedding served **~100% of checkout** where fair FIFO served about 70%, for the same total capacity.",
    "**Reject cheaply and early** — at the edge, the balancer or the first lines of the handler, never after the expensive work.",
    "**Backpressure** slows producers instead of drowning consumers; every unbounded buffer is where it stops working.",
    "Carry a **deadline** with each request and skip work whose deadline has passed."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service with an unbounded queue receives 20% more requests than it can handle for half a minute. Clients time out after one second. What happens to useful output?",
        options: ["It stays at full capacity", "It drops sharply, because queued requests wait past the timeout and are served after their clients have gone", "It rises, because the queue absorbs the spike", "It drops by about 20%"],
        answer: 1,
        why: "The backlog grows until waits approach the timeout, so most completed requests arrive after their clients gave up — throughput stays at capacity while goodput collapsed to about a fifth in the simulation. A 20% drop would be the bounded-queue outcome, and the queue absorbing the spike only helps if the waits stay well under the timeout." },

      { stem: "Why can a bounded queue that rejects requests produce more successful responses than an unbounded one that accepts all of them?",
        options: ["Rejection frees capacity", "It keeps waiting time short, so the requests it does accept finish while their clients are still waiting", "Rejected requests are counted as successes", "Bounded queues process requests faster"],
        answer: 1,
        why: "The worker's capacity is the same either way; what changes is whether completed work is still wanted. Capping the queue caps the wait, so accepted requests are answered in time, and refused clients get an immediate answer they can act on. Rejection costs almost nothing and is not a success, and the processing speed per request is unchanged." },

      { stem: "During overload, which requests should be shed first?",
        options: ["The oldest, always", "The lowest-priority ones — background and deferrable work — so critical requests like checkout survive", "Random requests, to be fair", "Requests from the newest clients"],
        answer: 1,
        why: "Shedding can only decide who receives limited capacity, and the business value of requests differs enormously; priority shedding served nearly every checkout while fair FIFO lost about 30% of them. Random or age-based shedding treats a recommendation the same as a payment." },

      { stem: "Which design breaks backpressure?",
        options: ["A bounded channel between two stages", "A consumer that pulls messages only when it has capacity", "An unbounded in-memory queue between a fast producer and a slow consumer", "Returning 503 with Retry-After"],
        answer: 2,
        why: "An unbounded queue absorbs the overload instead of signalling it, so the producer never slows and the backlog grows until latency or memory fails. Bounded channels, pull-based consumption and explicit 503s all propagate the signal to the sender." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"What happens at 120% load?\" is a question about queues.",
    questions: [
      { level: "advanced",
        q: "What happens to a service when traffic exceeds its capacity, and how do you design for it?",
        strong: "A strong answer explains the goodput collapse and then covers bounding, shedding, deadlines and backpressure.",
        answer: [
          { t: "p", text: "Without limits, the excess queues: latency rises until requests wait longer than clients will, and then the service spends its capacity on requests whose clients have gone, while retries add more load. Throughput stays high and goodput collapses — even a 20% overload can cut useful output by most of it." },
          { t: "p", text: "So: bound every queue so the worst wait is well under the client timeout; reject early and cheaply at the edge and the balancer; carry deadlines and skip expired work; shed by priority so checkout survives and recommendations degrade to fallbacks; and propagate backpressure — 503 with Retry-After, pull-based consumers, bounded channels — so producers slow down. Clients cooperate with jittered backoff and retry budgets." }
        ] },

      { level: "core",
        q: "What is the difference between backpressure and load shedding?",
        strong: "A strong answer distinguishes slowing the producer from dropping work and says when each applies.",
        answer: [
          { t: "p", text: "Backpressure tells the producer to slow down — a full bounded queue blocks it, TCP's window shrinks, a consumer pulls only what it can process — so work is not created faster than it can be done. Load shedding drops work that has already arrived, preferably the least important, when the producer cannot or will not slow down — typically external users." },
          { t: "p", text: "Inside a system I prefer backpressure, because nothing is lost. At the boundary with users, where I cannot make them wait indefinitely, I shed — early, cheaply, by priority — and the clients' backoff provides the backpressure from their side." }
        ] },

      { level: "advanced",
        q: "Why might serving requests last-in-first-out be better under overload?",
        strong: "A strong answer explains which clients are still waiting and the adaptive form.",
        answer: [
          { t: "p", text: "Under overload the oldest queued requests are the ones whose clients are most likely to have timed out already; serving them first spends capacity on dead requests and makes every new request wait behind them. Serving the newest first gives fresh requests a fast answer while the old ones are dropped or time out." },
          { t: "p", text: "It is unfair as a permanent policy, so the usual form is adaptive: FIFO while the queue is short, LIFO once it passes a threshold, which Facebook described for its services. Combined with deadlines, it keeps latency low for the clients that are still there." }
        ] }
    ]
  }
});

/* ============================================================================
   LESSON 7.2 — Circuit Breakers and Bulkheads
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "Timeouts limit how long one call can hurt you; they do not stop you making the same doomed call a thousand times a second. A **circuit breaker** notices that a dependency is failing and stops calling it for a while, so callers fail in microseconds — usually to a fallback — instead of waiting out a timeout each time, and the dependency gets room to recover. A **bulkhead** gives each dependency its own limited pool of threads or connections, so when one goes bad it can exhaust only its own compartment. One cuts the waiting; the other stops it spreading.",

  objectives: [
    "Draw the circuit breaker state machine and explain each transition",
    "Measure what a breaker saves callers and the failing dependency during an outage",
    "Tune a breaker's window and threshold between false trips and slow detection",
    "Show how a shared pool lets one slow dependency starve healthy endpoints, and how bulkheads prevent it",
    "Design fallbacks that turn an open breaker into degraded service rather than errors"
  ],

  prerequisites: ["7.1"],

  blocks: [

    { t: "h2", n: "01", id: "breaker", text: "The circuit breaker",
      sub: "Three states, four transitions" },

    { t: "diagram", kind: "cycle", title: "Circuit breaker states",
      caption: "Closed: calls go through and results are counted. When the failure rate over the recent window crosses a threshold, the breaker opens: calls fail immediately without touching the dependency. After a cool-down it lets a few probe calls through (half-open); if they succeed it closes, and if any fails it opens again for another cool-down.",
      centre: "per dependency",
      nodes: [
        { label: "Closed", sub: "calls pass, results counted", tone: "good", edge: "failure rate ≥ threshold" },
        { label: "Open", sub: "fail fast, no calls", tone: "crit", edge: "cool-down elapsed" },
        { label: "Half-open", sub: "a few probe calls", tone: "warn", edge: "probes succeed" }
      ] },

    { t: "p", text: "Fifty calls a second to a dependency that is completely down for twenty-five seconds; each failing call costs its caller a one-second timeout. With and without a breaker that opens at 50% failures over twenty calls and probes every five seconds:" },

    { t: "code", lang: "python", title: "breaker.py — an outage, with and without a circuit breaker", code: `import random
from collections import deque

class CircuitBreaker:
    def __init__(self, window=20, threshold=0.5, cooldown=5.0, probes=3):
        self.state, self.results = "closed", deque(maxlen=window)
        self.threshold, self.cooldown, self.probes = threshold, cooldown, probes
        self.opened_at, self.trial_ok, self.log = 0.0, 0, []
    def allow(self, now):
        if self.state == "open" and now - self.opened_at >= self.cooldown:
            self._to("half-open", now); self.trial_ok = 0
        return self.state != "open"
    def record(self, ok, now):
        if self.state == "half-open":
            if not ok: self._to("open", now); self.opened_at = now
            else:
                self.trial_ok += 1
                if self.trial_ok >= self.probes: self._to("closed", now); self.results.clear()
            return
        self.results.append(ok)
        failures = self.results.count(False)
        if len(self.results) == self.results.maxlen and failures / len(self.results) >= self.threshold:
            self._to("open", now); self.opened_at = now
    def _to(self, s, now): self.state = s; self.log.append((round(now, 1), s))

def run(use_breaker, rps=50, seconds=60, down=(10, 35), timeout=1.0, seed=2):
    rng, cb = random.Random(seed), CircuitBreaker()
    calls = waited = fast_fail = ok = 0
    for i in range(rps * seconds):
        now = i / rps
        if use_breaker and not cb.allow(now):
            fast_fail += 1; continue                       # fail in microseconds, use a fallback
        calls += 1
        healthy = not (down[0] <= now < down[1])
        success = healthy and rng.random() > 0.02
        waited += 0.02 if success else timeout             # a failing call costs the full timeout
        ok += success
        if use_breaker: cb.record(success, now)
    return calls, fast_fail, waited, ok, cb.log

for use in (False, True):
    calls, ff, waited, ok, log = run(use)
    print("%-16s calls to dependency %5d | failed fast %5d | caller time spent waiting %6.0f s | successes %d"
          % ("with breaker" if use else "no breaker", calls, ff, waited, ok))
    if use: print("   state changes:", log)`,
      out: `no breaker       calls to dependency  3000 | failed fast     0 | caller time spent waiting   1319 s | successes 1715
with breaker     calls to dependency  1755 | failed fast  1245 | caller time spent waiting     83 s | successes 1706
   state changes: [(10.2, 'open'), (15.2, 'half-open'), (15.2, 'open'), (20.2, 'half-open'), (20.2, 'open'), (25.2, 'half-open'), (25.2, 'open'), (30.2, 'half-open'), (30.2, 'open'), (35.2, 'half-open'), (35.2, 'closed')]`,
      hl: [10, 11, 12, 22, 31, 32],
      caption: "Without a breaker, every call during the outage waited out its full timeout — **over twenty minutes of caller time** spent waiting in twenty-five seconds, enough to exhaust any thread pool. The breaker opened a fifth of a second into the outage, failed over a thousand calls in microseconds, probed every five seconds, and closed as soon as the dependency answered again. Successes were essentially unchanged; the waiting fell by more than an order of magnitude, and the dead dependency received a trickle of probes instead of the full load while it restarted." },

    { t: "callout", kind: "insight", title: "An open breaker needs somewhere to go",
      body: [
        { t: "p", text: "Failing fast is only half the value; the other half is what the caller does instead. Recommendations unavailable → show best-sellers from a cache. Personalised prices unavailable → show list prices. Reviews unavailable → hide the reviews panel. Fraud scoring unavailable → apply local rules and flag for review (2.5's exercise)." },
        { t: "p", text: "Each fallback is a product decision made in advance, and it is what turns a dependency outage into a slightly worse page instead of an error page. A breaker with no fallback still protects the system; a breaker with a fallback protects the user too." }
      ] },

    { t: "h2", n: "02", id: "bulkheads", text: "Bulkheads",
      sub: "A failure fills only its own compartment" },

    { t: "p", text: "A service has 100 worker threads. Endpoint A calls a healthy dependency (20 ms) at 200 requests a second; endpoint B calls one that has degraded so badly every call hangs until its 5-second timeout, at 40 requests a second. One shared pool, or a pool per dependency:" },

    { t: "code", lang: "python", title: "bulkhead.py — one shared pool against separate pools", code: `import heapq, random

def run(pools, seconds=60, seed=4):
    """pools: {'A': size, 'B': size} or {'shared': size}. A calls a healthy dependency (20 ms);
    B calls one that is degraded (every call hangs until the 5 s timeout)."""
    rng = random.Random(seed)
    arrivals = [(rng.uniform(0, seconds), "A") for _ in range(200 * seconds)] + \\
               [(rng.uniform(0, seconds), "B") for _ in range(40 * seconds)]
    arrivals.sort()
    busy = {p: [] for p in pools}                       # per pool: heap of finish times
    stats = {"A": [0, 0], "B": [0, 0]}                   # served, rejected
    for t, ep in arrivals:
        pool = "shared" if "shared" in pools else ep
        h = busy[pool]
        while h and h[0] <= t: heapq.heappop(h)          # threads that have finished
        if len(h) >= pools[pool]:
            stats[ep][1] += 1; continue                  # no thread free: rejected (503)
        heapq.heappush(h, t + (0.02 if ep == "A" else 5.0))
        stats[ep][0] += 1
    return {ep: s[0] / (s[0] + s[1]) for ep, s in stats.items()}

print("200 req/s to endpoint A (healthy dependency), 40 req/s to B (dependency hangs for 5 s)")
for name, pools in (("one shared pool of 100", {"shared": 100}), ("bulkheads: A 70, B 30", {"A": 70, "B": 30})):
    r = run(pools)
    print("%-26s A served %5.1f%%   B served %5.1f%%" % (name, 100 * r["A"], 100 * r["B"]))`,
      out: `200 req/s to endpoint A (healthy dependency), 40 req/s to B (dependency hangs for 5 s)
one shared pool of 100     A served  49.3%   B served  49.9%
bulkheads: A 70, B 30      A served 100.0%   B served  15.0%`,
      hl: [15, 16, 18],
      caption: "B needs 40 × 5 = 200 threads to hold its hung calls (Little's Law, 11.2) and the shared pool has 100, so B's requests fill it, and **half of A's requests are rejected** although nothing is wrong with A's dependency. With bulkheads, B can only ever hold its 30 threads: B degrades — it was going to anyway — and **A serves every request**." },

    { t: "viz", title: "A shared pool and a partitioned one",
      caption: "Left: the slow dependency's hung calls occupy every thread, and requests that would have been fast find none free. Right: the same hung calls are confined to their compartment. The name comes from ships: watertight bulkheads let one flooded compartment sink nothing else.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Shared pool versus bulkheads">
  <text x="185" y="20" text-anchor="middle" class="s-label" style="fill:var(--crit)">One shared pool of 100</text>
  <text x="575" y="20" text-anchor="middle" class="s-label" style="fill:var(--good)">Bulkheads: A 70 · B 30</text>
  <rect x="30" y="34" width="310" height="120" rx="10" class="s-fill s-stroke"/>
  <g style="fill:var(--crit);fill-opacity:.55">
    <rect x="42" y="46" width="286" height="96" rx="6"/>
  </g>
  <text x="185" y="88" text-anchor="middle" class="s-label" style="fill:var(--ink)">all 100 threads held by B</text>
  <text x="185" y="106" text-anchor="middle" class="s-sub" style="fill:var(--ink)">waiting on 5 s timeouts</text>
  <text x="185" y="176" text-anchor="middle" class="s-sub">A's fast requests find no free thread → 503</text>
  <text x="185" y="194" text-anchor="middle" class="s-mono" style="fill:var(--crit)">A served ~49%</text>
  <line x1="380" y1="30" x2="380" y2="200" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <rect x="420" y="34" width="210" height="120" rx="10" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <rect x="432" y="46" width="60" height="96" rx="6" style="fill:var(--good);fill-opacity:.35"/>
  <text x="525" y="88" text-anchor="middle" class="s-label">pool A: 70</text>
  <text x="525" y="106" text-anchor="middle" class="s-sub">~4 busy, 20 ms each</text>
  <rect x="640" y="34" width="96" height="120" rx="10" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <rect x="650" y="46" width="76" height="96" rx="6" style="fill:var(--crit);fill-opacity:.55"/>
  <text x="688" y="92" text-anchor="middle" class="s-label" style="fill:var(--ink)">B: 30</text>
  <text x="688" y="110" text-anchor="middle" class="s-sub" style="fill:var(--ink)">all hung</text>
  <text x="575" y="176" text-anchor="middle" class="s-sub">B's damage stops at its compartment wall</text>
  <text x="575" y="194" text-anchor="middle" class="s-mono" style="fill:var(--good)">A served 100%</text>
</svg>` },

    { t: "table",
      head: ["Bulkhead", "What it isolates"],
      rows: [
        ["A thread or semaphore pool per dependency", "One slow dependency from the others in the same process"],
        ["A connection pool per downstream", "Database or HTTP connections from being monopolised"],
        ["Separate instances per endpoint or tenant", "A heavy endpoint or noisy customer from everyone else"],
        ["Separate queues per priority (6.1)", "Bulk work from urgent work"],
        ["Cells (10.6)", "An entire slice of users from failures in another slice"]
      ],
      caption: "The same idea at every scale: give each failure domain a bounded share of the resources, so its worst case is bounded too." },

    { t: "callout", kind: "trap", title: "A breaker that trips on noise, or never trips",
      body: [
        { t: "p", text: "A breaker judging a tiny window — open if 2 of the last 10 calls failed — trips constantly on ordinary background errors, cutting off a healthy dependency hundreds of times an hour and turning a 2% error rate into a much larger one. A breaker with a huge window and a high threshold never trips in time to matter. And a breaker that counts 4xx client errors as failures opens because one caller sends bad requests, punishing everyone." },
        { t: "p", text: "Count only failures that indicate the dependency is unhealthy — timeouts, connection errors, 5xx — require a minimum number of calls before judging, and tune the window and threshold against the dependency's real error rate. The exercise measures the trade." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Tune a breaker's window and threshold",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A dependency receives 50 calls a second and normally fails 2% of them, rising to 5% on bad days. Measure, for several breaker configurations, how often it opens on noise alone over an hour, and how quickly it opens when the dependency fails completely." }
      ],
      requirements: [
        "Simulate an hour of normal traffic at 2% and at 5% background errors for each configuration",
        "Count false opens per hour",
        "Compute the time to open when every call fails",
        "Choose a configuration and justify it"
      ],
      hint: "Opening needs threshold × window failures inside the window; noise produces that occasionally in small windows with low thresholds.",
      solution: { lang: "python", title: "breaker_tune_ex.py",
        code: `import random
from collections import deque

def opens(window, threshold, error_rate, rps=50, seconds=3600, seed=1):
    """Count how often a count-based breaker opens on background noise alone."""
    rng, results, n = random.Random(seed), deque(maxlen=window), 0
    for _ in range(rps * seconds):
        results.append(rng.random() >= error_rate)
        if len(results) == window and results.count(False) / window >= threshold:
            n += 1; results.clear()                       # trips, then (assume) recovers
    return n

def time_to_open(window, threshold, rps=50):
    """The dependency fails completely: how long until the breaker opens?"""
    calls_needed = max(1, int(window * threshold + 0.999))  # failures needed to cross the threshold
    return calls_needed / rps

print("%-22s %22s %22s %16s" % ("window, threshold", "false opens/h at 2%", "false opens/h at 5%", "time to open"))
for window, thr in ((10, 0.2), (20, 0.25), (50, 0.2), (20, 0.5), (100, 0.5)):
    print("%-22s %22d %22d %14.2f s" % (f"{window} calls, {thr:.0%}", opens(window, thr, 0.02),
          opens(window, thr, 0.05), time_to_open(window, thr)))`,
        out: `window, threshold         false opens/h at 2%    false opens/h at 5%     time to open
10 calls, 20%                             506                   2450           0.04 s
20 calls, 25%                               2                     87           0.10 s
50 calls, 20%                               0                      2           0.20 s
20 calls, 50%                               0                      0           0.20 s
100 calls, 50%                              0                      0           1.00 s`,
        notes: [
          { t: "p", text: "A ten-call window at 20% opens hundreds of times an hour on 2% noise and thousands on 5% — two failures in ten calls is common chance at these rates. Every one of those opens rejects healthy traffic. The detection speed it buys, a few hundredths of a second, is worth nothing next to that." },
          { t: "p", text: "Twenty calls at 50% never opened on noise at either rate and still opens a fifth of a second into a real outage. That is the sweet spot here: a threshold well above any plausible noise level, and a window large enough that chance cannot reach it, but small enough to react in well under a second at this traffic rate." },
          { t: "p", text: "The right numbers depend on the call rate — at 2 calls a second, a 20-call window takes 10 seconds to judge — which is why production breakers often use a **time** window with a **minimum call count**, and a failure-rate threshold well above the dependency's normal error rate." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the reviews widget that took down checkout",
      body: [
        { t: "p", text: "**Symptom.** Checkout failed for 35 minutes. The checkout service's own dependencies — payments, inventory, the database — were all healthy. The only degraded system was the product-reviews service, which checkout did not even need." },
        { t: "p", text: "**Mechanism.** The storefront service rendered both product pages and the checkout API, sharing one HTTP client pool of 200 connections and one worker pool. The reviews service slowed to 20-second responses after a bad deploy; product pages kept calling it with a 30-second timeout, and within a minute every connection and worker was held by a hung reviews call. Checkout requests, arriving at the same service, found nothing free — the shared-pool row of section 02, with a business-critical endpoint in the role of A." },
        { t: "p", text: "**Fix.** A circuit breaker and a 300 ms timeout on reviews, with \"hide the reviews panel\" as the fallback; a separate bulkhead pool for each downstream; and checkout moved to its own deployment, so no page-rendering dependency shares its resources at all. The reviews service had another bad deploy a month later; product pages showed no reviews for twenty minutes, and nothing else noticed." }
      ] }
  ],

  takeaways: [
    "A **circuit breaker** stops calling a failing dependency: closed → open on a failure-rate threshold → half-open after a cool-down → closed if probes succeed.",
    "Measured: without a breaker, callers spent **over twenty minutes waiting on timeouts** in a 25-second outage; with one, the waiting fell by more than an order of magnitude and the dependency got room to recover.",
    "An open breaker should route to a **fallback** decided in advance — cached data, a default, a hidden panel.",
    "A **bulkhead** gives each dependency its own bounded pool, so a failure fills only its own compartment.",
    "Measured: one hung dependency in a shared pool of 100 caused **half of a healthy endpoint's requests to be rejected**; with bulkheads the healthy endpoint served **100%**.",
    "Bulkheads apply at every scale: thread pools, connection pools, instances per endpoint or tenant, queues per priority, cells.",
    "Count only **unhealthy-dependency failures** (timeouts, connection errors, 5xx), require a **minimum call count**, and set the threshold well above normal noise.",
    "Measured: a 10-call / 20% breaker **opened hundreds of times an hour on 2% noise**; 20 calls / 50% never did and still opened in 0.2 s."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A breaker is open. What happens when the cool-down expires?",
        options: ["It closes and sends all traffic", "It moves to half-open and lets a few probe calls through; success closes it, failure re-opens it", "It stays open until restarted", "It resets the dependency"],
        answer: 1,
        why: "Half-open is the cautious test: a handful of calls decide whether the dependency has recovered, so a still-broken dependency is not flooded and a recovered one is reinstated quickly. Closing straight away would send full traffic to something possibly still broken; staying open forever would need a human; and a breaker cannot reset another service." },

      { stem: "Endpoint A has a healthy dependency, endpoint B a hung one, and both share a pool of 100 threads. Why does A start failing?",
        options: ["A's dependency is overloaded by B", "B's hung calls occupy the shared threads, so A's requests find none free", "The load balancer stops sending A traffic", "A and B share a database"],
        answer: 1,
        why: "Hung calls hold threads until they time out; at 40 requests a second with 5-second hangs, B wants 200 threads and takes all 100, so A's fast requests are rejected — about half in the simulation — although A's dependency is fine. Separate pools confine B's damage. Nothing about A's dependency or the balancer changed." },

      { stem: "Which errors should count towards opening a circuit breaker?",
        options: ["All errors, including 400 and 404", "Timeouts, connection failures and 5xx responses", "Only 404s", "Only successful responses that were slow"],
        answer: 1,
        why: "The breaker's question is whether the dependency is unhealthy; timeouts, refused connections and server errors say so. 4xx errors usually mean the caller sent a bad request, and counting them lets one misbehaving client open the breaker for everyone. Slow successes may feed a latency-based breaker but are not the standard failure signal." },

      { stem: "A breaker opens if 2 of the last 10 calls failed. The dependency normally fails 2% of calls. What happens?",
        options: ["It never opens in normal operation", "It opens frequently on chance alone, rejecting healthy traffic", "It opens only during real outages", "It cannot open at all"],
        answer: 1,
        why: "Two failures in ten calls occurs regularly by chance at a 2% error rate, so the breaker trips hundreds of times an hour on noise — the exercise measured it — and each trip rejects calls to a healthy dependency. A larger window and a threshold well above normal noise avoid it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Breakers and bulkheads are how one bad dependency stays one bad dependency.",
    questions: [
      { level: "core",
        q: "What is a circuit breaker and why use one?",
        strong: "A strong answer gives the state machine, the two beneficiaries, and the fallback.",
        answer: [
          { t: "p", text: "A wrapper around calls to a dependency that tracks recent failures. While the failure rate is low it is closed and calls pass through; above a threshold it opens and calls fail immediately; after a cool-down it goes half-open and lets a few probes through, closing if they succeed." },
          { t: "p", text: "It helps both sides: callers stop spending a full timeout on calls that are going to fail, so their threads are not exhausted, and the failing dependency stops receiving full load while it tries to recover. Paired with a fallback — cached data, a default, hiding a feature — the user sees a degraded page instead of an error." }
        ] },

      { level: "advanced",
        q: "How do you stop one slow dependency from taking down a whole service?",
        strong: "A strong answer combines timeouts, bulkheads, breakers and fallbacks, and explains the mechanism of spread.",
        answer: [
          { t: "p", text: "The spread happens through shared resources: a slow dependency's calls hold threads and connections, and every other request in the process competes for the same pool. So: tight timeouts on every call; a bulkhead — a separate bounded pool — per dependency, so the slow one can only exhaust its own share; and a circuit breaker per dependency so that, once it is clearly failing, calls stop waiting at all." },
          { t: "p", text: "Then a fallback per dependency so the feature degrades. And at a larger scale, critical paths like checkout get their own deployment, so no dependency of a less important feature shares their resources." }
        ] },

      { level: "core",
        q: "How would you configure a circuit breaker?",
        strong: "A strong answer covers what counts as failure, window type, minimum calls, threshold and cool-down.",
        answer: [
          { t: "p", text: "Count timeouts, connection errors and 5xx as failures, not 4xx. Use a time-based window — say the last ten seconds — with a minimum number of calls before judging, so low-traffic periods do not trip on one error. Set the threshold well above the dependency's normal error rate, often 50%." },
          { t: "p", text: "A cool-down of a few seconds to tens of seconds, a small number of half-open probes, and metrics and alerts on state changes so an open breaker is visible. Then test it — inject failures in staging — because a breaker that has never opened is a configuration nobody has verified." }
        ] }
    ]
  }
});

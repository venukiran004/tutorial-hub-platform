/* ============================================================================
   LESSON 14.2 — Scaling Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "14.2",

  lede: "There are four ways to give an ML service more room, and each removes a different bottleneck. Replicas multiply throughput when the model itself is the limit. Sharding splits a model too large for one device. A queue absorbs work that does not need an immediate answer, so bursts wait instead of failing. Routing sends a chosen share of traffic to a different model, for a comparison or a gradual rollout. None of them makes a single request faster, and none helps when the limit is a dependency they all share. This lesson measures each pattern's effect and the limits they cannot pass.",

  objectives: [
    "Match each scaling pattern to the bottleneck it removes",
    "Show the throughput gained from replicas and the latency floor they cannot lower",
    "Recognise a shared dependency that caps every pattern",
    "Use a queue to turn burst failures into delay",
    "Route traffic to model variants with sticky, adjustable, independent assignment"
  ],

  prerequisites: ["12.2", "14.1"],

  blocks: [
    { t: "h2", n: "01", id: "patterns", text: "Four patterns, one shared limit", sub: "What each one removes" },
    { t: "viz",
      title: "Scaling patterns and the limit they share",
      caption: "Each pattern adds capacity in front of the model; all of them still call the same feature database, whose limit none of them can raise.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="130.0" y1="102.5" x2="233.6" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="130.0" y1="126.0" x2="200.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="130.0" y1="149.5" x2="233.6" y2="190.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="392.4" y1="62.0" x2="527.6" y2="100.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="400.0" y1="126.0" x2="520.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="392.4" y1="190.0" x2="527.6" y2="152.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="100" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="70.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Router</text>
<text x="70.0" y="140" text-anchor="middle" class="s-sub">LB / gateway</text>
<rect x="200" y="10" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="300.0" y="32" text-anchor="middle" class="s-label" style="fill:var(--accent)">Replicas</text>
<text x="300.0" y="50" text-anchor="middle" class="s-sub">throughput</text>
<rect x="200" y="100" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="300.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--violet)">Model shards</text>
<text x="300.0" y="140" text-anchor="middle" class="s-sub">too big for one device</text>
<rect x="200" y="190" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="300.0" y="212" text-anchor="middle" class="s-label" style="fill:var(--good)">Queue + workers</text>
<text x="300.0" y="230" text-anchor="middle" class="s-sub">work that can wait</text>
<rect x="520" y="100" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="620.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--crit)">Shared dependency</text>
<text x="620.0" y="140" text-anchor="middle" class="s-sub">feature DB, one limit</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "scalepat.py — replicas, a shared limit, the latency floor and a burst",
      code: `import heapq
import numpy as np
rng = np.random.default_rng(15)

def serve(rate, replicas, model_ms=20.0, dep_capacity=None, n=40_000):
    """Poisson arrivals; each request needs a replica for model_ms. Optionally every request also needs one
    lookup in a shared feature database that serves one query at a time, dep_capacity queries a second."""
    arr = np.cumsum(rng.exponential(1000 / rate, n))
    free = [0.0] * replicas
    dep_free, dep_ms = 0.0, (1000 / dep_capacity if dep_capacity else 0)
    lat = np.empty(n)
    for i, a in enumerate(arr):
        t = a
        if dep_capacity:
            dep_free = max(t, dep_free) + dep_ms; t = dep_free
        start = max(t, heapq.heappop(free)); end = start + rng.lognormal(np.log(model_ms) - 0.045, 0.3)
        heapq.heappush(free, end); lat[i] = end - a
    return np.percentile(lat[2000:], 50), np.percentile(lat[2000:], 99), lat[2000:].max()

print("== replicas: offered load 300 req/s, 20 ms model ==")
print(f"{'replicas':>9}{'p50 ms':>14}{'p99 ms':>14}{'p99 with a shared DB limited to 250 req/s':>44}")
for r in (4, 8, 16, 32):
    p50, p99, _ = serve(300, r); _, p99d, _ = serve(300, r, dep_capacity=250)
    fb = lambda v: f"{v:.0f}" if v < 5000 else "falls behind"
    print(f"{r:>9}{fb(p50):>14}{fb(p99):>14}{fb(p99d):>44}")

print("\\n== what replicas cannot change: one request's own latency, at light load ==")
for r in (1, 8):
    p50, _, _ = serve(5, r); print(f"  {r} replica(s), 5 req/s: p50 {p50:.1f} ms")

print("\\n== a 60-second burst at 3x capacity: synchronous with a 1 s timeout, or through a queue ==")
cap, burst, base = 100, 300, 50                                  # req/s
backlog = sync_backlog = dropped_sync = 0.0; max_backlog = 0.0
for s in range(300):
    rate = burst if 60 <= s < 120 else base
    # synchronous: a request that cannot be served within 1 s times out, so at most cap x 1 s can wait
    sync_backlog = max(0.0, sync_backlog + rate - cap)
    if sync_backlog > cap * 1.0: dropped_sync += sync_backlog - cap * 1.0; sync_backlog = cap * 1.0
    backlog = max(0.0, backlog + rate - cap); max_backlog = max(max_backlog, backlog)
total = base * 240 + burst * 60
print(f"  synchronous: {dropped_sync / total:.1%} of requests time out during the burst")
print(f"  queue: none dropped; peak backlog {max_backlog:,.0f} requests, drained in {max_backlog / (cap - base):.0f} s after the burst")`,
      out: `== replicas: offered load 300 req/s, 20 ms model ==
 replicas        p50 ms        p99 ms   p99 with a shared DB limited to 250 req/s
        4  falls behind  falls behind                                falls behind
        8            21            44                                falls behind
       16            19            38                                falls behind
       32            19            38                                falls behind

== what replicas cannot change: one request's own latency, at light load ==
  1 replica(s), 5 req/s: p50 19.7 ms
  8 replica(s), 5 req/s: p50 19.1 ms

== a 60-second burst at 3x capacity: synchronous with a 1 s timeout, or through a queue ==
  synchronous: 39.7% of requests time out during the burst
  queue: none dropped; peak backlog 12,000 requests, drained in 240 s after the burst` },
    { t: "dl",
      items: [
        { term: "Replicas: throughput, not speed",
          def: "At 300 requests a second with a 20 ms model, 4 replicas (200 a second of capacity) fell behind; 8 gave p99 44 ms and 16 gave 38 ms, after which more replicas changed nothing. At light load, 1 replica and 8 gave the same 19–20 ms median: replicas do not make a request faster." },
        { term: "The shared dependency",
          def: "With every request also reading a feature database that serves 250 queries a second, the service fell behind at every replica count, 8 or 32. The database, not the model, set the limit; scale it, cache in front of it (lesson 12.3) or batch its reads." },
        { term: "A queue turns failures into delay",
          def: "A 60-second burst at three times capacity made 39.7% of synchronous requests time out. Through a queue none were lost; the backlog peaked at 12,000 and drained in 4 minutes. Only work whose caller can wait (scoring documents, enrichment, batch predictions) belongs there." }
      ] },
    { t: "table",
      head: ["Pattern", "Removes", "Cannot fix"],
      rows: [
        ["Replicas", "Model compute as the throughput limit", "Per-request latency; shared dependencies"],
        [
          "Sharding (tensor or pipeline parallel)",
          "A model too large for one device's memory",
          "Throughput beyond one sharded copy; adds communication"
        ],
        ["Queue and workers", "Bursts beyond capacity, for work that can wait", "Callers who need an answer now"],
        [
          "Routing",
          "Need to compare or roll out variants safely",
          "Capacity: it divides traffic, it does not add any"
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Scaling the model when the bottleneck is downstream",
      body: [
        { t: "p",
          text: "Adding replicas behind a saturated feature store or database adds connections to the thing that is already full (lesson 14.1). Find the resource at 100% before adding more of anything; if it is shared, it is the one to scale." }
      ] },
    { t: "h2", n: "02", id: "routing", text: "Routing for comparison", sub: "Sticky, adjustable, independent" },
    { t: "p",
      text: "Routing a share of traffic to a candidate model is how canaries and online experiments work (lesson 3.3 and module 17). Three properties matter. A user must see the same model on every request and every replica, or the comparison mixes experiences. Widening the share must only move users from control to candidate, never back. And two experiments running at once must assign users independently. Hashing the user ID with an experiment-specific salt gives all three." },
    { t: "exercise",
      kind: "Challenge",
      title: "Sticky routing by hash",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Route 10% of 50,000 users to a candidate model by hashing the user ID with an experiment salt into 10,000 buckets, and compare with routing each request at random. Measure the share, and how often a user gets the same model on a second request. Then widen the share to 20% and count users who moved in and out, and check that a second experiment's salt assigns users independently." }
      ],
      requirements: [
        "A bucket function from a cryptographic hash of salt and user ID",
        "Share and stickiness for hash and random routing",
        "Movement when the share widens",
        "Agreement between two experiments' assignments"
      ],
      hint: "Use hashlib, not Python's hash(), which changes between processes (lesson 13.3).",
      solution: { lang: "python",
        title: "sticky_routing.py",
        code: `import hashlib, random

# Route a share of users to a candidate model. Requirements: the share is right, a user always sees the same model
# on every replica and every request, and widening the share only moves users from control into the candidate.
def bucket(user_id: str, salt: str = "ranker-v7") -> int:
    return int.from_bytes(hashlib.sha256(f"{salt}:{user_id}".encode()).digest()[:8], "big") % 10_000

def route_hash(user_id, share): return "candidate" if bucket(user_id) < share * 10_000 else "control"
def route_random(user_id, share): return "candidate" if random.random() < share else "control"

users = [f"u{i}" for i in range(50_000)]
for name, route in (("hash of user id", route_hash), ("random per request", route_random)):
    first = {u: route(u, 0.10) for u in users}
    second = {u: route(u, 0.10) for u in users}                      # the same users, a second request each
    share = sum(v == "candidate" for v in first.values()) / len(users)
    sticky = sum(first[u] == second[u] for u in users) / len(users)
    print(f"{name:<20} share {share:.2%}, same model on the next request {sticky:.1%}")

widened = {u: route_hash(u, 0.20) for u in users}; before = {u: route_hash(u, 0.10) for u in users}
moved_out = sum(before[u] == "candidate" and widened[u] == "control" for u in users)
moved_in = sum(before[u] == "control" and widened[u] == "candidate" for u in users)
print(f"widen 10% -> 20%: {moved_in:,} users moved into the candidate, {moved_out} moved back out")
other = sum((bucket(u) < 1000) == (bucket(u, salt="search-v2") < 1000) for u in users) / len(users)
print(f"a different experiment's salt: {other:.1%} agreement with this one; independent 10% splits would give 0.9² + 0.1² = 82%")`,
        out: `hash of user id      share 9.99%, same model on the next request 100.0%
random per request   share 10.10%, same model on the next request 81.8%
widen 10% -> 20%: 4,998 users moved into the candidate, 0 moved back out
a different experiment's salt: 82.0% agreement with this one; independent 10% splits would give 0.9² + 0.1² = 82%`,
        notes: [
          { t: "p",
            text: "Hash routing gave 9.99% with 100% stickiness; random routing gave the right share but 18% of users changed model on their next request, so any per-user metric would blend both models. Widening to 20% moved 4,998 users into the candidate and none back, because a user's bucket never changes." },
          { t: "p",
            text: "Two experiments with different salts agreed on 82.0% of users, exactly what independent 10% splits predict (0.9² + 0.1²). Reusing one salt across experiments would have put the same users in both treatments and confounded them." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the canary that every user saw a little of",
      body: [
        { t: "p",
          text: "**Symptom.** A recommendation canary at 5% showed no difference from control on any metric, so it was promoted; after full rollout, engagement fell 2%." },
        { t: "p",
          text: "**Mechanism.** The load balancer routed 5% of requests at random. Every user saw the candidate on about one request in twenty, and both arms' metrics were computed over the same mixed population, so they could not differ." },
        { t: "p",
          text: "**Fix.** Routing moved to a hash of the user ID with a per-experiment salt, so a user sees one model consistently, and the experiment platform now checks that each user appears in only one arm before reporting any result." }
      ] }
  ],

  takeaways: [
    "**Replicas** add throughput: 8 replicas served 300 req/s at p99 **44 ms**; 4 fell behind; beyond 16 nothing changed.",
    "Replicas never make one request faster: **19–20 ms** median with 1 replica or 8 at light load.",
    "A **shared dependency** (a 250 req/s database) capped the service at every replica count.",
    "A **queue** turned a burst that timed out **39.7%** of synchronous requests into a 4-minute backlog with none lost.",
    "**Sharding** fits a model too big for one device; it adds communication, not throughput.",
    "**Routing** compares variants: hash user ID with an experiment salt for stickiness, safe widening and independence.",
    "Random per-request routing switched **18%** of users between models on their next request."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A service behind a database limited to 250 queries/s gets 300 requests/s. What do more replicas do?",
        options: [
          "Raise throughput in proportion to the replica count",
          "Nothing useful: the shared database is the limit",
          "Lower each request's latency substantially",
          "Reduce the number of queries per request"
        ],
        answer: 1,
        why: "Every replica queries the same database, so the system fell behind at 8 replicas and at 32. Replicas add model capacity, not database capacity, and do not change per-request work." },
      { stem: "Which work belongs on a queue rather than a synchronous endpoint?",
        options: [
          "Fraud checks that must block a card payment in flight",
          "Scoring uploaded documents for later review",
          "Autocomplete suggestions as a user types",
          "A login risk score needed before sign-in"
        ],
        answer: 1,
        why: "Document scoring can wait, so a burst becomes delay instead of failures. Payment, autocomplete and login decisions have a user waiting on the answer." },
      { stem: "Why route experiments by a hash of user ID rather than at random per request?",
        options: [
          "Hashing is faster than generating random numbers",
          "Each user then sees one model on every request",
          "Random routing cannot hit a 10% share accurately",
          "Hashing balances load more evenly across replicas"
        ],
        answer: 1,
        why: "Random routing hit the share (10.06%) but switched 18% of users between models on their next request. Speed and replica load balance are not the point." },
      { stem: "Two experiments use the same salt for their 10% splits. What goes wrong?",
        options: [
          "Both experiments get far fewer users than were planned",
          "The same users land in both treatments",
          "The hashing becomes slower for every request",
          "Users switch between models on each request"
        ],
        answer: 1,
        why: "Identical buckets put the same 10% in both candidates, so neither effect can be separated. Shares, speed and stickiness are unaffected; separate salts gave the 82% agreement independence predicts." }
    ] },

  interview: { title: "In an interview",
    sub: "Scaling answers should name the bottleneck before the pattern.",
    questions: [
      { level: "core",
        q: "Your model service cannot keep up with traffic. What do you do?",
        strong: "A strong answer finds the saturated resource first and matches the pattern to it.",
        answer: [
          { t: "p",
            text: "Find what is at 100%: model CPU or GPU, a dependency such as the feature store, a connection pool, or the network. If it is the model, add replicas and batch (lesson 12.3). If it is a shared dependency, scale or cache it; more replicas only add load to it. If callers can wait, move the work onto a queue so bursts become delay. If the model no longer fits one device, shard it. Then load-test at the target rate to confirm the bottleneck moved." }
        ] },
      { level: "advanced",
        q: "When would you use a queue in front of a model?",
        strong: "A strong answer separates who is waiting, and covers back-pressure and delivery semantics.",
        answer: [
          { t: "p",
            text: "When nobody is blocked on the answer: document processing, enrichment, notifications, batch scoring. The queue absorbs bursts and decouples producer and consumer rates; workers scale on queue depth. It needs idempotent processing (messages can be delivered twice), dead-letter handling for poison messages, a maximum age after which results are useless, and monitoring of backlog age rather than just depth." }
        ] },
      { level: "core",
        q: "How would you route traffic between two model versions?",
        strong: "A strong answer covers sticky assignment, adjustable shares, independence and logging.",
        answer: [
          { t: "p",
            text: "Assign by a cryptographic hash of a stable unit (user or session) with a salt per experiment, into fine-grained buckets, and send buckets below the share to the candidate. That keeps users on one model, lets the share grow without moving anyone back, and keeps concurrent experiments independent. Log the assigned variant with every prediction so metrics can be split by it." }
        ] }
    ] }
});

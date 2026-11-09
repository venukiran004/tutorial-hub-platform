/* ============================================================================
   LESSON 15.4 — Walkthrough: Rate Limiter and Distributed Cache
   ========================================================================= */
EC.receiveLesson({
  id: "15.4",

  lede: "Two problems that interviewers pair because they share a core: state that many stateless servers must agree on, and that sits on the hot path of every request. A rate limiter for a global API gateway has to decide in under a millisecond whether to admit a request, using a count that sixteen gateways update at once. A distributed cache has to spread keys over nodes so that adding one does not empty the cache, survive a node's death, and cope with a key so hot that one node cannot serve it. This lesson designs both, and measures the three things that go wrong: a race that lets clients through at eight times their limit, a resharding that moves 80% of keys, and an eviction policy that a single scan defeats.",

  objectives: [
    "Design a rate limiter for a multi-gateway API with a shared counter and atomic updates",
    "Explain why read-then-write limiting overshoots, and fix it with a server-side script",
    "Trade accuracy for store load with local counters that sync on an interval",
    "Shard a cache with a hash ring and virtual nodes, and handle hot keys with replicas",
    "Choose an eviction policy that survives scans"
  ],

  prerequisites: ["15.3", "7.3", "4.3", "3.4"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "limiter",
      text: "A rate limiter for a global gateway",
      sub: "Requirements, then the race" },
    { t: "p",
      text: "Requirements: limit each API key to, say, 1,000 requests a second across all gateways; reject over-limit requests with 429 and a Retry-After header; add no more than about a millisecond to admitted requests; and fail open (admit) if the limiter is unavailable, because the limiter must not become the outage. The algorithms themselves (token bucket, sliding window) are in lesson 7.3. The design question is where the count lives and how sixteen gateways update it without racing." },
    { t: "viz",
      title: "Gateways, the limit store and the cache cluster",
      caption: "Each gateway checks a shared limit store, sharded by API key, either on every request or by syncing local counters on an interval. Admitted requests reach the services, which read through a cache cluster sharded on a hash ring with replicas for hot keys.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="102.0" y1="136.0" x2="130.0" y2="136.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="240.0" y1="111.2" x2="282.4" y2="92.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="240.0" y1="160.8" x2="282.4" y2="180.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="405.0" y1="92.0" x2="450.0" y2="110.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="427.5" y="95.0" text-anchor="middle" class="s-sub">sync</text>
<line x1="405.0" y1="180.0" x2="450.0" y2="162.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="427.5" y="165.0" text-anchor="middle" class="s-sub">sync</text>
<line x1="405.0" y1="66.0" x2="615.0" y2="66.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="510.0" y="60.0" text-anchor="middle" class="s-sub">allowed</text>
<line x1="680.0" y1="92.0" x2="680.0" y2="180.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="110" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="56.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Clients</text>
<text x="56.0" y="150" text-anchor="middle" class="s-sub">API keys</text>
<rect x="130" y="110" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="185.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Global LB</text>
<text x="185.0" y="150" text-anchor="middle" class="s-sub">anycast</text>
<rect x="275" y="40" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="340.0" y="62" text-anchor="middle" class="s-label" style="fill:var(--accent)">Gateway</text>
<text x="340.0" y="80" text-anchor="middle" class="s-sub">local counters</text>
<rect x="275" y="180" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="340.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--accent)">Gateway</text>
<text x="340.0" y="220" text-anchor="middle" class="s-sub">local counters</text>
<rect x="450" y="110" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="515.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--crit)">Limit store</text>
<text x="515.0" y="150" text-anchor="middle" class="s-sub">Redis, sharded</text>
<rect x="615" y="40" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="680.0" y="62" text-anchor="middle" class="s-label" style="fill:var(--good)">Services</text>
<rect x="615" y="180" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="680.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--warn)">Cache cluster</text>
<text x="680.0" y="220" text-anchor="middle" class="s-sub">ring + replicas</text>
</svg>` },
    { t: "p",
      text: "The obvious implementation reads the counter, compares it with the limit and writes back the incremented value. Between the read and the write, other gateways read the same value. The simulation runs sixteen gateways, each making 60 attempts for one key with a limit of 100, against a store with a half-millisecond round trip." },
    { t: "code",
      lang: "python",
      title: "ratelimit.py — the read-then-write race and the atomic fix",
      code: `import threading, time, random

class Store:
    """A stand-in for Redis: single-key reads and writes cost a network round trip (sleep);
    \`eval_atomic\` runs a function on the server as one indivisible step, as a Lua script does."""
    def __init__(self, rtt=0.0005): self.d, self.rtt, self.lock = {}, rtt, threading.Lock()
    def get(self, k):
        time.sleep(self.rtt)
        with self.lock: return self.d.get(k)
    def set(self, k, v):
        time.sleep(self.rtt)
        with self.lock: self.d[k] = v
    def eval_atomic(self, k, fn):
        time.sleep(self.rtt)
        with self.lock:
            self.d[k], result = fn(self.d.get(k)); return result

LIMIT = 100            # requests allowed per client per window

def naive_allow(store, key):
    """Read, decide, write: two round trips with a gap in which other gateways act."""
    n = store.get(key) or 0
    if n >= LIMIT: return False
    store.set(key, n + 1); return True

def atomic_allow(store, key):
    """The whole check-and-increment runs on the server, like INCR inside a Lua script."""
    return store.eval_atomic(key, lambda n: ((n or 0) + 1, (n or 0) < LIMIT))

def run(allow, gateways=16, attempts=60):
    store, allowed, lock = Store(), [0], threading.Lock()
    def gw():
        for _ in range(attempts):
            if allow(store, "client:42"):
                with lock: allowed[0] += 1
    ts = [threading.Thread(target=gw) for _ in range(gateways)]
    for t in ts: t.start()
    for t in ts: t.join()
    return allowed[0]

for name, fn in (("read-then-write", naive_allow), ("atomic (Lua-style)", atomic_allow)):
    got = run(fn)
    print(f"{name:<20} allowed {got:4} of 960 attempts against a limit of {LIMIT}  ({got / LIMIT:.1f}x the limit)")

# A purely local limit: each of 16 gateways allows limit / 16. A client on a few keep-alive connections
# reaches only a few gateways, so it gets a fraction of its limit; a client spread across all of them gets it all.
per_gw = LIMIT / 16
for reached in (1, 2, 4, 16):
    print(f"local limit {per_gw:.2f} per gateway, client reaches {reached:2} gateways: allowed {per_gw * reached:5.1f} of {LIMIT}")`,
      out: `read-then-write      allowed  865 of 960 attempts against a limit of 100  (8.7x the limit)
atomic (Lua-style)   allowed  100 of 960 attempts against a limit of 100  (1.0x the limit)
local limit 6.25 per gateway, client reaches  1 gateways: allowed   6.2 of 100
local limit 6.25 per gateway, client reaches  2 gateways: allowed  12.5 of 100
local limit 6.25 per gateway, client reaches  4 gateways: allowed  25.0 of 100
local limit 6.25 per gateway, client reaches 16 gateways: allowed 100.0 of 100` },
    { t: "callout",
      kind: "trap",
      title: "Two round trips are a race, not a limiter",
      body: [
        { t: "p",
          text: "Read-then-write admitted about 850 requests against a limit of 100 (the exact count varies between runs, because it depends on thread timing). Every gateway read a count below the limit before any of them wrote. Moving the whole check-and-increment to the server in one step admitted exactly 100. In Redis that step is INCR, or a Lua script that Redis runs without interleaving other commands. The limit is only as correct as the atomicity of the update." }
      ] },
    { t: "code",
      lang: "lua",
      title: "rate_limit.lua — the server-side step (shown, not run here)",
      code: `-- KEYS[1] = "rl:{api_key}:{window}"   ARGV[1] = limit   ARGV[2] = window seconds
local n = redis.call("INCR", KEYS[1])
if n == 1 then redis.call("EXPIRE", KEYS[1], ARGV[2]) end
if n > tonumber(ARGV[1]) then return 0 end
return 1` },
    { t: "p",
      text: "Splitting the limit evenly into local per-gateway limits avoids the shared store entirely, and the last lines of the output show why it is rarely right. A client holding a few keep-alive connections reaches only a few gateways and receives a quarter or less of its limit, while a client spread across all of them receives the full amount. Local limits are fair only when the load balancer spreads every client evenly, which keep-alive connections prevent." },
    { t: "dl",
      items: [
        { term: "Shard the limit store by API key",
          def: "Each key's counter lives on one shard, so the update stays a single atomic operation. A hash tag in the key (`rl:{api_key}`) keeps related counters together in Redis Cluster." },
        { term: "Fail open, with a local fallback",
          def: "If the store is slow or down, admit with a generous local limit rather than reject everything. Rejecting all traffic because the limiter failed turns a degraded dependency into a full outage." },
        { term: "Say why a request was rejected",
          def: "429 with Retry-After and the remaining quota in headers lets well-behaved clients back off precisely, instead of retrying blindly." },
        { term: "Multi-region",
          def: "Count per region and either split the limit between regions or reconcile asynchronously. A cross-region round trip on every request costs more than the accuracy is worth." }
      ] },
    { t: "h2", n: "02", id: "cache", text: "A distributed cache", sub: "Sharding, hot keys and eviction" },
    { t: "p",
      text: "A cache cluster has the same shape: many clients, state on a few nodes, every request touching it. Three questions decide the design: how keys map to nodes so that adding a node moves few of them, what to do with a key too hot for one node, and which keys to evict when memory is full." },
    { t: "code",
      lang: "python",
      title: "cachecluster.py — resharding, hot keys and eviction",
      code: `import bisect, hashlib, itertools, random
from collections import Counter, OrderedDict, defaultdict

h = lambda s: int(hashlib.md5(s.encode()).hexdigest(), 16)
keys = [f"user:{i}" for i in range(100_000)]

# 1. Adding a fifth node: how many keys move under mod-N and under a hash ring with virtual nodes?
def mod_owner(k, n): return h(k) % n
class Ring:
    def __init__(self, nodes, vnodes=100):
        self.ring = sorted((h(f"{n}#{v}"), n) for n in nodes for v in range(vnodes)); self.pts = [p for p, _ in self.ring]
    def owner(self, k): return self.ring[bisect.bisect(self.pts, h(k)) % len(self.ring)][1]
moved_mod = sum(mod_owner(k, 4) != mod_owner(k, 5) for k in keys) / len(keys)
r4, r5 = Ring(["a", "b", "c", "d"]), Ring(["a", "b", "c", "d", "e"])
moved_ring = sum(r4.owner(k) != r5.owner(k) for k in keys) / len(keys)
print(f"adding a 5th node: mod-N moves {moved_mod:.0%} of keys, the ring moves {moved_ring:.0%} (ideal 20%)")
load = Counter(r5.owner(k) for k in keys)
print("ring load per node:", {n: f"{c / len(keys):.1%}" for n, c in sorted(load.items())})

# 2. A hot key lands on one shard whatever the ring does.
rng = random.Random(5)
zipf = list(itertools.accumulate(1 / (i + 1) for i in range(len(keys))))
reqs = rng.choices(keys, cum_weights=zipf, k=200_000)
per_node = Counter(r5.owner(k) for k in reqs)
top_key, top_n = Counter(reqs).most_common(1)[0]
print(f"\\nZipf traffic: busiest node {max(per_node.values()) / len(reqs):.1%} of requests; "
      f"the single hottest key {top_key} alone is {top_n / len(reqs):.1%}")
replicas = 4
print(f"spreading {top_key} over {replicas} read replicas cuts its node's share of it to {top_n / len(reqs) / replicas:.1%}")

# 3. Eviction: LRU against LFU when a one-off scan runs through a Zipf workload.
def simulate(policy, cap=2_000):
    cache, freq, hits = OrderedDict(), defaultdict(int), 0
    scan = [f"scan:{i}" for i in range(20_000)]
    stream = reqs[:100_000] + scan + reqs[100_000:]
    for i, k in enumerate(stream):
        freq[k] += 1
        if k in cache:
            hits += i >= 120_000; cache.move_to_end(k); continue
        if len(cache) >= cap:
            if policy == "LRU": cache.popitem(last=False)
            else: cache.pop(min(cache, key=freq.__getitem__))
        cache[k] = True
    return hits / (len(stream) - 120_000)
for pol in ("LRU", "LFU"): print(f"{pol}: hit rate after a 20,000-key scan {simulate(pol):.1%}")`,
      out: `adding a 5th node: mod-N moves 80% of keys, the ring moves 21% (ideal 20%)
ring load per node: {'a': '15.4%', 'b': '23.6%', 'c': '21.1%', 'd': '19.0%', 'e': '21.0%'}

Zipf traffic: busiest node 27.2% of requests; the single hottest key user:0 alone is 8.3%
spreading user:0 over 4 read replicas cuts its node's share of it to 2.1%
LRU: hit rate after a 20,000-key scan 57.0%
LFU: hit rate after a 20,000-key scan 66.9%` },
    { t: "table",
      head: ["Question", "Measured", "Design choice"],
      rows: [
        [
          "Adding a fifth node",
          "mod-N moved 80% of keys; the ring moved 21%",
          "Consistent hashing with ~100 virtual nodes each; mod-N would empty the cache on every resize"
        ],
        [
          "Even spread",
          "Ring shares 15–24% across five nodes",
          "More virtual nodes narrow the spread; rebalance by weight, not by count"
        ],
        [
          "A hot key",
          "One key was 8.3% of all requests",
          "Replicate the hot key to several nodes, or keep it in a local in-process cache at each client"
        ],
        [
          "A one-off scan",
          "LRU 57% against LFU 67% hit rate afterwards",
          "LFU or LRU with an admission filter (TinyLFU), so a scan cannot flush the working set"
        ]
      ] },
    { t: "callout",
      kind: "insight",
      title: "The ring fixes resharding, not skew",
      body: [
        { t: "p",
          text: "Consistent hashing spreads keys evenly, but traffic is not spread by key. Under Zipf traffic one key carried 8.3% of all requests, and no hashing scheme can split a single key. Hot keys need a different mechanism: replicas with reads spread across them, a client-side cache with a short TTL, or request coalescing so a thousand misses become one fetch (lesson 3.4)." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Local counters that sync",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Atomic calls on every request are exact but cost one store round trip per request. Build the alternative: each of 16 gateways counts locally and, every sync interval, adds its count to the shared counter and reads back the total. A client sends 3,000 requests a second against a limit of 1,000. Measure how far the limit overshoots, and how many store calls a second it takes, for sync intervals from 1 to 250 ms." }
      ],
      requirements: [
        "16 gateways with local counters and a shared global counter",
        "A request is admitted if the last known global count plus the gateway's unsynced count is under the limit",
        "Overshoot and store calls per second at sync intervals of 1, 10, 50, 100 and 250 ms",
        "A recommended interval, and how the cost scales with the number of API keys"
      ],
      hint: "Each gateway flushes once per interval whatever the traffic, so store calls are gateways ÷ interval. Overshoot comes from requests admitted between syncs on gateways that have not yet seen each other's counts.",
      solution: { lang: "python",
        title: "synced_limiter.py",
        code: `import random

LIMIT, WINDOW_MS, GATEWAYS = 1_000, 1_000, 16          # 1,000 requests per second per API key, 16 gateways

def simulate(sync_ms, client_rps=3_000, seconds=10, seed=2):
    """Each gateway counts locally and, every sync_ms, adds its count to the shared counter and reads the total.
    A request is allowed if (last known global + this gateway's unsynced count) is under the limit."""
    rng = random.Random(seed)
    allowed_per_window, store_calls = [], 0
    for w in range(seconds):
        global_count, local, known = 0, [0] * GATEWAYS, 0
        allowed = 0
        arrivals = sorted(rng.uniform(0, WINDOW_MS) for _ in range(client_rps))
        next_sync = sync_ms
        known_at = [0] * GATEWAYS
        for t in arrivals:
            while t >= next_sync:                      # every gateway flushes and refreshes at each sync tick
                for g in range(GATEWAYS):
                    global_count += local[g]; local[g] = 0; store_calls += 1
                known_at = [global_count] * GATEWAYS
                next_sync += sync_ms
            g = rng.randrange(GATEWAYS)
            if known_at[g] + local[g] < LIMIT:
                local[g] += 1; allowed += 1
        allowed_per_window.append(allowed)
    return sum(allowed_per_window) / seconds, store_calls / seconds

print("sync interval   allowed per second (limit 1,000)   overshoot   store calls/s")
for sync in (1, 10, 50, 100, 250):
    a, calls = simulate(sync)
    print(f"{sync:>10} ms   {a:>23,.0f}   {a / LIMIT - 1:>9.0%}   {calls:>10,.0f}")
print(f"\\nper-request atomic calls instead: 3,000 store calls/s for this client, exact limit")`,
        out: `sync interval   allowed per second (limit 1,000)   overshoot   store calls/s
         1 ms                     1,001          0%       15,984
        10 ms                     1,011          1%        1,584
        50 ms                     1,062          6%          304
       100 ms                     1,201         20%          144
       250 ms                     1,509         51%           48

per-request atomic calls instead: 3,000 store calls/s for this client, exact limit`,
        notes: [
          { t: "p",
            text: "Syncing every millisecond is accurate and absurd: 16,000 store calls a second, five times the 3,000 an atomic call per request would cost for this client. At 10–50 ms the limit overshoots by 1–6% for 300–1,600 calls a second. At 250 ms it overshoots by half, because a burst can pass every gateway before any of them learns the others' counts." },
          { t: "p",
            text: "The decisive property is that a sync flushes all of a gateway's counters in one pipelined call, so the cost depends on the number of gateways and the interval, not on the number of API keys. With a hundred thousand active keys, per-request atomic calls cost one store call per request; synced counters still cost gateways ÷ interval. For limits that tolerate a few percent of overshoot, such as fairness and abuse protection, a 10–50 ms sync is the usual choice. For hard quotas tied to billing, use atomic calls." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the limiter that took the API down",
      body: [
        { t: "p",
          text: "**Symptom.** A payments API returned 429 to every request from every customer for eleven minutes, during a period of normal traffic." },
        { t: "p",
          text: "**Mechanism.** The gateways called the rate-limit store synchronously and treated a timeout as 'over limit'. A failover in the Redis cluster made calls time out for several minutes, and each gateway rejected everything. The limiter, added to protect the API from abuse, had become its single point of failure." },
        { t: "p",
          text: "**Fix.** The limiter now fails open: on a store timeout it admits requests under a conservative local limit and emits a metric. Store calls have a 5 ms budget, and an alert fires when the fallback is active. The store's failover was tested under load in staging, where the same behaviour reproduced in minutes." }
      ] }
  ],

  takeaways: [
    "Read-then-write limiting admitted about **8.5×** the limit under 16 gateways; an atomic server-side update admitted **exactly** the limit.",
    "In Redis the atomic step is **INCR** or a **Lua script**; shard the store by API key so each update stays on one node.",
    "Even per-gateway local limits give a client on **a few keep-alive connections** a quarter of its limit or less.",
    "Synced local counters at **10–50 ms** overshot by **1–6%** for **300–1,600** store calls a second, independent of the number of keys.",
    "**Fail open** with a local fallback: a limiter that rejects everything when its store is down is a new single point of failure.",
    "Adding a node moved **80%** of keys under mod-N and **21%** on a hash ring with virtual nodes.",
    "The ring fixes resharding, not skew: one Zipf key carried **8.3%** of all requests. Replicate or locally cache hot keys.",
    "After a one-off scan, **LFU** kept a **67%** hit rate against **57%** for LRU; use LFU or an admission filter."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Sixteen gateways each read a client's counter, compare it with the limit, and write back count + 1. What happens under load?",
        options: [
          "The limit holds, since each write adds exactly one",
          "Many gateways read the same value: far more get in",
          "Requests are rejected early, below the limit",
          "The store serialises it, so the result is exact"
        ],
        answer: 1,
        why: "Between each read and write, other gateways read the same stale count, so all of them admit. The simulation admitted about 8.5 times the limit. Only a single atomic server-side operation, such as INCR or a Lua script, makes the store serialise the whole check." },
      { stem: "Why should a gateway admit requests when the rate-limit store times out?",
        options: [
          "Timeouts mean the client is well under its limit",
          "Rejecting all traffic makes the limiter the outage",
          "Redis never loses any counters during a failover",
          "Admitted requests are cheaper to serve than rejections"
        ],
        answer: 1,
        why: "The limiter protects the service; if it rejects everything when its own store is unavailable, it causes the outage it was meant to prevent. Fail open under a conservative local limit and alert. The timeout says nothing about the client's usage." },
      { stem: "A cache cluster grows from 4 to 5 nodes. Roughly what share of keys change owner on a consistent-hash ring?",
        options: ["About 80%, as with mod-N", "About 20%", "None, since the ring is consistent", "About 50%, half the keys"],
        answer: 1,
        why: "On a ring the new node takes about 1/5 of the key space; measured, 21%. Mod-N moved 80%. 'Consistent' means few keys move, not none." },
      { stem: "One key receives 8% of all cache traffic. What does consistent hashing do about it?",
        options: [
          "It spreads the key over every node in the ring",
          "Nothing: a key maps to one node; replicate it",
          "It moves the key to the least loaded node",
          "It evicts the key to protect the node"
        ],
        answer: 1,
        why: "Hashing assigns each key to exactly one node, so a hot key's traffic lands on one node however many nodes exist. Replicas with reads spread across them, or a client-side cache, are needed. The ring does not rebalance by load, and evicting a hot key makes things worse." }
    ] },

  interview: { title: "In an interview",
    sub: "Rate limiter and distributed cache are both common standalone prompts and common deep dives inside larger ones.",
    questions: [
      { level: "core",
        q: "Design a rate limiter for an API gateway that runs on many servers.",
        strong: "A strong answer picks an algorithm, places the state in a shared store with atomic updates, and handles failure and multi-region.",
        answer: [
          { t: "p",
            text: "A token bucket or sliding-window counter per API key, with the state in a sharded Redis cluster keyed by API key, so each check is one atomic INCR or Lua script on one shard, about a millisecond. Over-limit requests get 429 with Retry-After and quota headers. If the store is slow or down, the gateway fails open under a conservative local limit and raises an alert." },
          { t: "p",
            text: "If per-request store calls are too expensive, gateways keep local counters and sync every 10–50 ms, accepting a few percent of overshoot. For multiple regions I count per region and split or reconcile the limit, rather than paying a cross-region round trip per request." }
        ] },
      { level: "core",
        q: "How would you shard a distributed cache, and what happens when you add a node?",
        strong: "A strong answer uses consistent hashing with virtual nodes, quantifies the movement, and covers warm-up and replication.",
        answer: [
          { t: "p",
            text: "Consistent hashing with around a hundred virtual nodes per physical node, so keys spread evenly and adding a node moves about 1/N of them, 21% when going from four to five, against 80% for mod-N. Moved keys are cold misses, so I would add nodes gradually or warm them from their neighbours. Each shard has a replica for failover, and clients learn the topology from the cluster or a discovery service." }
        ] },
      { level: "advanced",
        q: "A single key is so hot that its shard is overloaded. What are your options?",
        strong: "A strong answer separates read-hot from write-hot keys and gives mechanisms for each.",
        answer: [
          { t: "p",
            text: "For a read-hot key: replicate it to several nodes and spread reads across them, or cache it in-process at each client with a short TTL, and coalesce concurrent misses so one fetch serves many requests. For a write-hot key, such as a counter: split it into N sub-keys written at random and summed on read, or buffer increments locally and flush periodically. In both cases, detect hot keys from per-key metrics or sampling rather than waiting for the shard to fall over." }
        ] }
    ] }
});

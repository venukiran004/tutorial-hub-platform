/* ============================================================================
   LESSON 3.4 — Stampedes, Hot Keys and Penetration
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "A cache that works on average can fail all at once. Four failures recur: a hot key expires and **thousands of requests rebuild it simultaneously** (the stampede); many keys written together **expire together** (the avalanche); one key is so popular it **overloads the single cache node** that holds it (the hot key); and requests for things that do not exist **miss every time** and go straight to the database (penetration). Each has a standard fix, and every one of them is cheap compared with the outage it prevents.",

  objectives: [
    "Explain how a single expiry turns into thousands of identical database queries, and measure it",
    "Prevent stampedes with request coalescing, stale-while-revalidate or probabilistic early refresh",
    "Spread synchronised expiry with TTL jitter",
    "Relieve a hot key with a local cache or key replication",
    "Stop cache penetration with negative caching and a Bloom filter"
  ],

  prerequisites: ["3.1", "3.3"],

  blocks: [

    { t: "h2", n: "01", id: "stampede", text: "The stampede",
      sub: "One expiry, thousands of rebuilds" },

    { t: "p", text: "A homepage widget is cached under one key, read 5,000 times a second, and takes 200 ms to rebuild. When the key expires, every request in the next 200 ms misses — and with plain cache-aside, each one starts its own rebuild:" },

    { t: "diagram", kind: "timeline", title: "The 200 ms after a hot key expires",
      caption: "Naive: every request that misses runs the expensive query — about a thousand of them, in the time it takes the first one to finish. Single-flight: one runs, the rest wait for its result. Stale-while-revalidate: one runs in the background while everyone is served the previous value at once.",
      span: 400, tick: 50, unit: "milliseconds after expiry",
      lanes: [
        { label: "Naive", bars: [[0, 200, "~1,000 identical queries", "crit"], [200, 400, "cache warm again", "good"]] },
        { label: "Single-flight", bars: [[0, 200, "1 query; others wait", "warn"], [200, 400, "cache warm again", "good"]] },
        { label: "Stale-while-reval.", bars: [[0, 200, "1 background query; stale served", "accent"], [200, 400, "fresh", "good"]] },
        { label: "Early refresh", bars: [[0, 400, "refreshed before expiry: no miss at all", "good"]] }
      ] },

    { t: "code", lang: "python", title: "stampede.py — four policies over five minutes of one hot key", code: `import math, random

RATE = 5_000            # requests per second for one hot key
RECOMPUTE_S = 0.2       # the expensive query that builds the value
TTL = 60.0
SIM_S = 300.0           # five expiries after the warm start

def simulate(policy, seed=3):
    rng = random.Random(seed)
    t, expires, pending = 0.0, TTL, []        # warm at t=0; pending: queries in flight
    db_calls = waited = stale_served = 0
    while t < SIM_S:
        t += rng.expovariate(RATE)
        for c in [c for c in pending if c <= t]:          # finished queries refresh the cache
            expires = max(expires, c + TTL); pending.remove(c)
        if t < expires:                                    # fresh hit
            if policy == "xfetch" and not pending and t - RECOMPUTE_S * math.log(rng.random()) >= expires:
                db_calls += 1; pending.append(t + RECOMPUTE_S)   # refresh early, in the background
            continue
        if policy == "naive":                              # every miss queries the database
            db_calls += 1; waited += 1; pending.append(t + RECOMPUTE_S)
        elif policy == "single-flight":                    # one query; the others wait for it
            waited += 1
            if not pending:
                db_calls += 1; pending.append(t + RECOMPUTE_S)
        elif policy == "stale-while-revalidate":           # serve the old value, refresh once
            if expires < 0:                                # nothing cached yet: must wait
                waited += 1
            else:
                stale_served += 1
            if not pending:
                db_calls += 1; pending.append(t + RECOMPUTE_S)
        elif policy == "xfetch":                           # rare: expired before an early refresh
            waited += 1
            if not pending:
                db_calls += 1; pending.append(t + RECOMPUTE_S)
    return db_calls, waited, stale_served

print("one hot key, %d req/s, %.0f ms to rebuild, TTL %d s, %d s simulated from a warm cache"
      % (RATE, RECOMPUTE_S * 1000, TTL, SIM_S))
print("%-24s %16s %20s %14s" % ("policy", "database queries", "requests that waited", "served stale"))
for p in ("naive", "single-flight", "stale-while-revalidate", "xfetch"):
    calls, waited, stale = simulate(p)
    print("%-24s %16s %20s %14s" % (p, "{:,}".format(calls), "{:,}".format(waited), "{:,}".format(stale)))`,
      out: `one hot key, 5000 req/s, 200 ms to rebuild, TTL 60 s, 300 s simulated from a warm cache
policy                   database queries requests that waited   served stale
naive                               4,016                4,016              0
single-flight                           4                3,890              0
stale-while-revalidate                  4                    0          3,890
xfetch                                  5                    0              0`,
      hl: [17, 21, 24, 30],
      caption: "Naive cache-aside sent **about a thousand queries per expiry** to the database for one key — and a homepage has dozens of such keys. Single-flight cuts that to one per expiry, but every request in the gap still waits. Stale-while-revalidate makes nobody wait, at the price of serving the old value for 200 ms. Probabilistic early refresh (XFetch) avoids the miss entirely: one lucky request refreshes slightly before expiry." },

    { t: "dl", items: [
      ["Single-flight (request coalescing)", "Per key, only the first misser loads; the others await the same result. In one process this is a dictionary of in-flight futures (the exercise). Across many servers, a short Redis lock (`SET key:lock NX PX 5000`) makes one server rebuild while others wait briefly or serve stale."],
      ["Stale-while-revalidate", "Keep the value past its soft expiry; on the first request after it, serve the old value immediately and refresh in the background. Also an HTTP `Cache-Control` directive, so CDNs (3.5) do it for you."],
      ["Probabilistic early refresh (XFetch)", "Each hit refreshes early with a probability that rises as expiry approaches, weighted by how long a rebuild takes, so on average exactly one request refreshes shortly before the deadline. No locks and no stale reads."]
    ] },

    { t: "h2", n: "02", id: "avalanche", text: "The avalanche",
      sub: "Many keys, one expiry time" },

    { t: "p", text: "A deploy warms 200,000 keys in one job, all with a one-hour TTL. An hour later they all expire within the same second, and the database receives a reload for every one of them at once — a stampede across the whole key space. The fix is to make the TTLs different:" },

    { t: "code", lang: "python", title: "avalanche.py — the same keys with and without TTL jitter", code: `import random
from collections import Counter

KEYS, TTL = 200_000, 3_600            # warmed by one job at deploy time, all with the same TTL
rng = random.Random(5)

def peak_reloads(jitter):
    expiry = Counter(int(TTL * (1 + rng.uniform(-jitter, jitter))) for _ in range(KEYS))
    worst_second, n = max(expiry.items(), key=lambda kv: kv[1])
    return n, max(expiry) - min(expiry) + 1

print("%-12s %26s %22s" % ("TTL jitter", "worst second: DB reloads", "expiries spread over"))
for j in (0.0, 0.01, 0.10):
    n, span = peak_reloads(j)
    print("%-12s %26s %20s s" % (f"±{j:.0%}", "{:,}".format(n), "{:,}".format(span)))`,
      out: `TTL jitter     worst second: DB reloads   expiries spread over
±0%                             200,000                    1 s
±1%                               2,874                   72 s
±10%                                339                  720 s`,
      caption: "±10% jitter turns a single second of 200,000 reloads into twelve minutes of a few hundred a second, which any database absorbs. It costs one line: `ttl = base * random.uniform(0.9, 1.1)`. The same synchronisation happens after a cache restart, when everything loaded in the first minute expires together an hour later." },

    { t: "h2", n: "03", id: "hot-key", text: "The hot key",
      sub: "When one key is more than one node can serve" },

    { t: "p", text: "A distributed cache spreads keys across nodes by hash (4.3), so each key lives on one node. A single Redis node serves on the order of 100,000 simple operations a second. A flash sale's product, a celebrity's profile or a global configuration key can exceed that alone — and then one node is saturated while the others idle, and every key that shares the hot node suffers." },

    { t: "diagram", kind: "flow", title: "Two ways to spread one key's load",
      caption: "Left: each app server keeps the hottest keys in process for a second or two, so the cache sees one read per server per second instead of thousands. Right: the key is written as N copies with suffixes that hash to different nodes, and readers pick one at random.",
      cols: 3,
      nodes: [
        { id: "local", label: "In-process cache", sub: "1–2 s TTL per server", tone: "good" },
        { id: "app", label: "200,000 reads/s", sub: "for product:launch", tone: "crit" },
        { id: "rep", label: "Key replicas", sub: "product:launch#0…#9", tone: "accent" },
        { id: "n1", label: "Cache sees ~50/s", sub: "one per server per second", tone: "good" },
        { id: "w", label: "Writes", sub: "update all N copies", tone: "warn" },
        { id: "n2", label: "10 nodes × 20,000/s", sub: "each within capacity", tone: "accent" }
      ],
      edges: [["app", "local", "absorb"], ["app", "rep", "or spread"], ["local", "n1"], ["rep", "n2"], ["w", "rep", "", "dashed"]] },

    { t: "h2", n: "04", id: "penetration", text: "Penetration",
      sub: "Requests for things that do not exist always miss" },

    { t: "p", text: "Cache-aside caches what the database returns. If the database returns nothing — a deleted product, a mistyped id, an attacker iterating random ids — nothing is cached, and every repeat goes to the database. Two defences, usually together:" },

    { t: "dl", items: [
      ["Negative caching", "Cache \"not found\" too, with a short TTL (30–60 s) so a newly created item becomes visible soon. Stops repeats of the same missing key; does nothing against an attacker who never repeats a key."],
      ["A Bloom filter of keys that exist", "A compact bit array that answers \"definitely not present\" or \"possibly present\". Checked before the cache, it rejects almost every request for a nonexistent key without touching the cache or the database."]
    ] },

    { t: "diagram", kind: "cells", title: "A Bloom filter, 16 bits, three hash functions",
      caption: "Adding an id sets the bits its three hashes point to. A lookup checks the same three bits: if any is 0 the id was never added (a certain no). If all are 1 it was probably added — or other ids happened to set those bits, which is the false-positive rate you size the filter for.",
      items: ["0", "1", "0", "0", "1", "0", "1", "0", "0", "1", "0", "1", "0", "0", "1", "0"],
      highlight: [1, 6, 11], negative: false,
      label: "id 4242 hashes to bits 1, 6 and 11 — all set: possibly present" },

    { t: "code", lang: "python", title: "bloom.py — a million real ids, 200,000 requests for ids that do not exist", code: `import hashlib, math, random, sys

class Bloom:
    def __init__(self, n, fp):
        self.m = math.ceil(-n * math.log(fp) / math.log(2) ** 2)     # bits
        self.k = max(1, round(self.m / n * math.log(2)))              # hash functions
        self.bits = bytearray((self.m + 7) // 8)
    def _idx(self, item):
        h = hashlib.blake2b(str(item).encode(), digest_size=16).digest()
        a, b = int.from_bytes(h[:8], "little"), int.from_bytes(h[8:], "little")
        return ((a + i * b) % self.m for i in range(self.k))         # double hashing
    def add(self, item):
        for i in self._idx(item): self.bits[i // 8] |= 1 << (i % 8)
    def __contains__(self, item):
        return all(self.bits[i // 8] >> (i % 8) & 1 for i in self._idx(item))

N = 1_000_000
real_ids = range(1, N + 1)
bf = Bloom(N, fp=0.01)
for i in real_ids: bf.add(i)

rng = random.Random(1)
attack = [rng.randint(10**8, 10**9) for _ in range(200_000)]       # ids that do not exist
passed = sum(x in bf for x in attack)
missed_real = sum(i not in bf for i in range(1, 200_001))
print("bloom filter: %s bits = %.2f MB, k = %d hash functions" % ("{:,}".format(bf.m), bf.m / 8 / 1e6, bf.k))
print("nonexistent ids reaching the database: %d of %d (%.2f%%)" % (passed, len(attack), 100 * passed / len(attack)))
print("real ids wrongly rejected: %d   (a Bloom filter never says no to a member)" % missed_real)
print("for comparison, a Python set of the same ids: %.0f MB" % (sys.getsizeof(set(real_ids)) / 1e6))`,
      out: `bloom filter: 9,585,059 bits = 1.20 MB, k = 7 hash functions
nonexistent ids reaching the database: 2075 of 200000 (1.04%)
real ids wrongly rejected: 0   (a Bloom filter never says no to a member)
for comparison, a Python set of the same ids: 34 MB`,
      caption: "1.2 MB of bits stops about 99% of requests for nonexistent ids, and never rejects a real one — a Bloom filter has false positives but **no false negatives**. The same ids as a set take tens of megabytes. The filter must be updated when items are created; deletions need a counting variant or a periodic rebuild." },

    { t: "callout", kind: "trap", title: "Fixing the stampede with a lock and no timeout",
      body: [
        { t: "p", text: "A distributed rebuild lock — `SET key:lock NX` — is the standard cross-server single-flight. Without an expiry, the server holding it can crash mid-rebuild and the lock is never released: every other server waits for a value that will never arrive, and the key is unavailable until someone deletes the lock by hand." },
        { t: "p", text: "Always set the lock with an expiry longer than a normal rebuild (`PX 5000`), make waiters time out and fall back — serve stale, or rebuild themselves — and release the lock only if you still own it (compare a random token before deleting). Locks without expiry and waits without timeouts turn one slow query into an outage; 8.4 covers why even expiring locks need care." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Request coalescing and negative caching",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Build an async cache front for a 200 ms database load so that a burst of concurrent misses for one key causes one load, and repeated requests for a product that does not exist cause one load in total." }
      ],
      requirements: [
        "A `SingleFlight` helper that lets concurrent callers for the same key share one in-flight load",
        "If the load raises, every waiter receives the same error, and the next call tries again",
        "Cache a sentinel for \"not found\" so missing keys are not reloaded",
        "Fire 1,000 concurrent requests for one key and report the database call count",
        "Fire 1,000 requests for a missing key and report the database call count"
      ],
      hint: "Keep a dictionary from key to a Future. The first caller creates it and runs the loader; later callers await the existing Future. Remove the entry when the load finishes, success or failure.",
      solution: { lang: "python", title: "singleflight_ex.py",
        code: `import asyncio, time

class SingleFlight:
    """Concurrent callers for the same key share one in-flight load."""
    def __init__(self):
        self.inflight: dict[str, asyncio.Future] = {}
    async def do(self, key, loader):
        if key in self.inflight:
            return await self.inflight[key]            # join the load already running
        fut = asyncio.get_running_loop().create_future()
        self.inflight[key] = fut
        try:
            value = await loader(key)
            fut.set_result(value)
            return value
        except Exception as e:
            fut.set_exception(e)                       # every waiter sees the same failure
            raise
        finally:
            del self.inflight[key]                     # next miss after this starts a new load

MISSING = object()                                     # a cached "this does not exist"
db_calls = 0
async def load_from_db(key):
    global db_calls
    db_calls += 1
    await asyncio.sleep(0.2)                           # the slow query
    return None if key.startswith("product:99999") else {"key": key, "price": 42}

cache: dict = {}
sf = SingleFlight()
async def get(key):
    if key in cache:
        v = cache[key]; return None if v is MISSING else v
    v = await sf.do(key, load_from_db)
    cache[key] = MISSING if v is None else v           # negative caching (short TTL in real life)
    return v

async def main():
    t = time.perf_counter()
    await asyncio.gather(*(get("product:7") for _ in range(1_000)))
    print("1,000 concurrent misses for one key  -> %d database call(s), %.0f ms" % (db_calls, (time.perf_counter() - t) * 1000))
    before = db_calls
    await asyncio.gather(*(get("product:99999") for _ in range(500)))
    await asyncio.gather(*(get("product:99999") for _ in range(500)))
    print("1,000 requests for a missing product -> %d database call(s)" % (db_calls - before))

asyncio.run(main())`,
        out: `1,000 concurrent misses for one key  -> 1 database call(s), 207 ms
1,000 requests for a missing product -> 1 database call(s)`,
        notes: [
          { t: "p", text: "One database call served a thousand concurrent requests in about the time of a single query — the whole burst waited on one 200 ms load. Removing the in-flight entry in `finally` matters as much as creating it: if a failed load stayed registered, every later caller would await a dead future forever." },
          { t: "p", text: "Propagating the exception to every waiter is deliberate. The alternative — each waiter retrying on failure — turns one failed load into a thousand simultaneous retries against a database that has just shown it is struggling, which is the stampede again. Let them fail together, and let the next request after the failure try once." },
          { t: "p", text: "The `MISSING` sentinel is negative caching: a deliberate value meaning \"known not to exist\", distinct from \"not cached\". In production it gets a short TTL so a product created a minute later becomes visible. Against an attacker who never repeats an id, add the Bloom filter in front." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the homepage that fell over every hour on the hour",
      body: [
        { t: "p", text: "**Symptom.** An e-commerce site's database CPU spiked to 100% for about thirty seconds at the top of every hour, with a burst of homepage timeouts, then recovered. Nothing was scheduled on the hour. The spikes had started the week the homepage was redesigned." },
        { t: "p", text: "**Mechanism.** The new homepage was assembled from fourteen expensive aggregate queries, each cached with a TTL of exactly 3,600 seconds, all first populated by a warm-up job at deploy time. Every hour all fourteen expired in the same second, and at 6,000 homepage requests a second every request in each rebuild window ran its own query: an avalanche of stampedes. The rebuilds slowed each other down, which widened the window, which let more requests in." },
        { t: "p", text: "**Fix.** TTL jitter of ±10% so the fourteen keys expire at different moments; stale-while-revalidate on all of them, so a rebuild never makes a request wait or multiplies; and the warm-up job changed to stagger its writes. The spikes disappeared the same day. The longer-term change was a rule in code review: **any cached value that is expensive to rebuild must declare how it is protected from a stampede.**" }
      ] }
  ],

  takeaways: [
    "**Stampede**: a hot key expires and every request in the rebuild window rebuilds it — measured, about a thousand queries per expiry at 5,000 req/s and a 200 ms rebuild.",
    "**Single-flight** makes one request rebuild and the rest wait; **stale-while-revalidate** serves the old value while one rebuilds; **early refresh** rebuilds before expiry so nobody misses.",
    "Cross-server single-flight is a **short Redis lock with an expiry**, waiters with a timeout, and release only by the owner.",
    "**Avalanche**: keys written together expire together. ±10% TTL jitter turned **200,000 reloads in one second into ~340 a second** over twelve minutes.",
    "**Hot key**: one key exceeds one cache node. Absorb it with a 1–2 s **in-process cache**, or spread it with **N suffixed copies** across nodes.",
    "**Penetration**: requests for nonexistent keys always miss. **Negative-cache** \"not found\" with a short TTL.",
    "A **Bloom filter** of existing ids — 1.2 MB for a million — stopped ~99% of requests for nonexistent ids and **never rejects a real one**.",
    "On a failed load, **fail every waiter together**; retrying each one recreates the stampede.",
    "Anything expensive to rebuild must **declare its stampede protection**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A key read 5,000 times a second takes 200 ms to rebuild. With plain cache-aside, roughly how many rebuilds happen when it expires?",
        options: ["1", "About 1,000 — every request in the 200 ms window misses and rebuilds", "5,000", "None — the cache rebuilds it automatically"],
        answer: 1,
        why: "Until the first rebuild finishes and writes the key, every arriving request misses; 5,000 per second × 0.2 s ≈ 1,000 identical queries, which the simulation confirmed. One rebuild is what single-flight achieves, 5,000 would be a full second of misses, and in cache-aside nothing rebuilds automatically — the application does, once per miss." },

      { stem: "What does stale-while-revalidate give up in exchange for nobody waiting?",
        options: ["Durability: writes may be lost", "Freshness: requests during the rebuild get the previous value", "Availability: the key is unavailable during the rebuild", "Nothing; it is strictly better than single-flight"],
        answer: 1,
        why: "It serves the old value immediately while one background rebuild runs, so for the rebuild's duration responses are slightly stale. No writes are involved, and availability is the thing it improves. It is not strictly better: for data that must be current at the moment of expiry, single-flight's brief wait is the right trade." },

      { stem: "Ten thousand keys warmed at deploy time all have a one-hour TTL. What is the cheapest protection against them expiring together?",
        options: ["A longer TTL", "Random jitter on each key's TTL", "A bigger database", "Disabling expiry"],
        answer: 1,
        why: "Jitter gives each key a slightly different expiry, so reloads spread over minutes instead of landing in one second — one line of code. A longer TTL only moves the synchronised expiry later; a bigger database pays for the problem rather than removing it; and disabling expiry removes the backstop against stale data (3.3)." },

      { stem: "An attacker requests random product ids that do not exist. Why does negative caching alone not help, and what does?",
        options: ["Negative caching is too slow; use a bigger cache", "Each id is new, so nothing repeats to hit the negative entry; a Bloom filter of existing ids rejects them before the database", "The attacker's requests are cached as hits", "Rate limiting is the only answer"],
        answer: 1,
        why: "Negative caching only stops repeats of the same missing key, and an attacker can avoid repeating forever. A Bloom filter answers \"definitely not present\" for almost all of them in memory, so they never reach the database. Cache size is irrelevant when keys never repeat, nothing is cached as a hit, and rate limiting (7.3) is a useful complement rather than the only answer." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Naming the failure modes unprompted is what makes a cache design look production-ready.",
    questions: [
      { level: "core",
        q: "What can go wrong with a cache under load?",
        strong: "A strong answer lists the four failure modes with one fix each.",
        answer: [
          { t: "p", text: "Four things. A stampede: a hot key expires and every concurrent request rebuilds it — fixed by request coalescing, stale-while-revalidate, or refreshing early. An avalanche: many keys expire at once because they were written together — fixed with TTL jitter. A hot key that exceeds one cache node — fixed with a short in-process cache or replicated copies of the key. And penetration: lookups for nonexistent keys always miss — fixed with negative caching and a Bloom filter." },
          { t: "p", text: "Plus the meta-failure behind most cache outages: the database is sized for the miss traffic, so a cold cache sends it many times its normal load. I would plan warm-up and node-by-node restarts for that." }
        ] },

      { level: "advanced",
        q: "Implement request coalescing across a fleet of fifty app servers.",
        strong: "A strong answer combines in-process coalescing with a distributed lock that is safe on failure.",
        answer: [
          { t: "p", text: "Two levels. Within each server, a map of in-flight loads per key, so concurrent requests on that server share one. Across servers, a Redis lock per key: `SET key:lock <token> NX PX 5000`. The winner rebuilds, writes the value and releases the lock only if the token still matches. Losers either wait briefly and re-read the cache, or — better — serve the stale value if one exists." },
          { t: "p", text: "The failure cases decide the design: the lock must expire, or a crashed rebuilder blocks the key forever; waiters must time out and fall back; and a failed rebuild should not make every waiter retry at once. Where staleness is acceptable I would prefer stale-while-revalidate or probabilistic early refresh, which avoid the lock entirely." }
        ] },

      { level: "core",
        q: "How would you handle a single key receiving 200,000 reads a second?",
        strong: "A strong answer quantifies against node capacity and offers both remedies with their write costs.",
        answer: [
          { t: "p", text: "A single Redis node handles roughly a hundred thousand simple operations a second, and the key lives on one node, so it will saturate that node and hurt every other key there. First fix: a small in-process cache in each app server with a TTL of a second or two — with fifty servers the cache sees about fifty reads a second for that key instead of 200,000." },
          { t: "p", text: "If it must stay in the shared cache, replicate it: write N copies with suffixes that hash to different nodes and have readers pick one at random. Both cost freshness or write work — the local copy can be a couple of seconds stale, and replicated copies must all be updated on write — which is acceptable for a launch page and not for a balance." }
        ] }
    ]
  }
});

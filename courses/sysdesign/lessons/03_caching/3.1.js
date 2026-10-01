/* ============================================================================
   LESSON 3.1 — Why Cache: Hit Ratios and Where Caches Sit
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "A cache keeps a copy of something expensive somewhere cheap, and it works for one reason: **real traffic is skewed** — a small fraction of keys receives most of the requests. Measured on a realistic workload, caching 1% of keys answers half of all reads. The number to watch is not the hit ratio but the **miss ratio**, because that is what reaches the database: going from 90% to 99% hits looks like a 10% improvement and is a **tenfold** cut in database load. And a cache improves the average long before it improves the tail.",

  objectives: [
    "Explain why skewed access makes a small cache effective, and measure it",
    "Compute mean latency, tail latency and database load from a hit ratio",
    "Name the layers where a cache can sit, from the browser to the database",
    "Size a cache for a target hit ratio and convert it to memory",
    "Recognise when a workload will not cache well, and what limits the best case"
  ],

  prerequisites: ["1.2", "2.5"],

  blocks: [

    { t: "h2", n: "01", id: "skew", text: "Why a small cache works",
      sub: "Popularity follows a power law" },

    { t: "p", text: "Requests for products, profiles, articles and videos follow a **Zipf distribution**: the k-th most popular item is requested in proportion to 1/k^s, with s near 1 for typical web traffic. A few items are enormously popular and a long tail is rarely touched. This simulates a million requests over 100,000 keys and an LRU cache of increasing size:" },

    { t: "code", lang: "python", title: "zipf_lru.py — hit ratio against cache size and skew", code: `import bisect, itertools, random
from collections import OrderedDict

KEYS, REQUESTS = 100_000, 1_000_000
rng = random.Random(8)

def zipf_sampler(n, s):
    """Key k (1 = most popular) is requested with probability proportional to 1/k^s."""
    cum = list(itertools.accumulate(1 / k ** s for k in range(1, n + 1)))
    return lambda: bisect.bisect(cum, rng.random() * cum[-1])

def lru_hit_ratio(stream, capacity):
    cache, hits = OrderedDict(), 0
    for k in stream:
        if k in cache:
            hits += 1
            cache.move_to_end(k)
        else:
            cache[k] = True
            if len(cache) > capacity:
                cache.popitem(last=False)
    return hits / len(stream)

SIZES = (0.001, 0.01, 0.05, 0.10, 0.25)
print("%-24s" % "cache size (% of keys)" + "".join("%9s" % f"{p:.1%}" for p in SIZES))
for s, label in ((0.0, "uniform (s=0)"), (0.8, "mild skew (s=0.8)"), (1.0, "typical web (s=1.0)")):
    draw = zipf_sampler(KEYS, s) if s else (lambda: rng.randrange(KEYS))
    stream = [draw() for _ in range(REQUESTS)]
    print("%-24s" % label + "".join("%8.1f%%" % (100 * lru_hit_ratio(stream, int(KEYS * p))) for p in SIZES))`,
      out: `cache size (% of keys)       0.1%     1.0%     5.0%    10.0%    25.0%
uniform (s=0)                0.1%     1.0%     5.0%    10.0%    24.7%
mild skew (s=0.8)            6.7%    20.3%    36.8%    46.7%    63.1%
typical web (s=1.0)         29.1%    50.7%    66.5%    73.5%    83.0%`,
      hl: [7, 8, 9],
      caption: "Under uniform access a cache of 1% of the keys hits 1% of the time — caching is useless. Under typical web skew the same 1% hits about **half** the time, and a tenth of the keys answers about three-quarters of all reads." },

    { t: "viz", title: "Hit ratio against cache size, three workloads",
      caption: "The green curve is why caching is the first scaling tool anyone reaches for: the first few per cent of capacity buy most of the benefit, and the curve flattens after. The red line is what a cache does for a workload with no hot set — scans, batch jobs, random lookups across a huge key space.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0%</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">25%</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">50%</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">75%</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100%</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">0.1%</text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub">1%</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">5%</text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub">10%</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">25%</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">cache size as a share of all keys (not to scale)</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">LRU hit ratio</text>
<polyline points="64.0,171.1 200.5,124.5 337.0,90.4 473.5,75.2 610.0,54.7" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="171.1" r="3.6" style="fill:var(--good)"/>
<circle cx="200.5" cy="124.5" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="90.4" r="3.6" style="fill:var(--good)"/>
<circle cx="473.5" cy="75.2" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="54.7" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">typical web, s=1.0</text>
<polyline points="64.0,219.5 200.5,190.2 337.0,154.5 473.5,133.1 610.0,97.7" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="219.5" r="3.6" style="fill:var(--accent)"/>
<circle cx="200.5" cy="190.2" r="3.6" style="fill:var(--accent)"/>
<circle cx="337.0" cy="154.5" r="3.6" style="fill:var(--accent)"/>
<circle cx="473.5" cy="133.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="610.0" cy="97.7" r="3.6" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">mild skew, s=0.8</text>
<polyline points="64.0,233.8 200.5,231.8 337.0,223.2 473.5,212.4 610.0,180.6" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="233.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="200.5" cy="231.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="223.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="473.5" cy="212.4" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="180.6" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">uniform</text>
</svg>` },

    { t: "h2", n: "02", id: "arithmetic", text: "What a hit ratio buys",
      sub: "Mean latency, tail latency and database load" },

    { t: "p", text: "A cache hit costs about 1 ms (a Redis round trip, 1.2); a miss costs the cache check plus a 10 ms database read. Here is what 20,000 reads a second look like at different hit ratios:" },

    { t: "code", lang: "python", title: "hit_math.py — mean, p99 and database load from the hit ratio", code: `import random

CACHE_MS, DB_MS = 1.0, 10.0           # a Redis hit; a database read (miss = check cache, then DB)
BASE_QPS = 20_000                     # read requests per second arriving at the service
rng = random.Random(1)

print("%8s %10s %10s %14s %14s" % ("hit %", "mean ms", "p99 ms", "DB reads/s", "DB load vs 0%"))
for h in (0.0, 0.5, 0.8, 0.9, 0.95, 0.99, 0.995):
    lat = sorted(CACHE_MS * rng.uniform(0.6, 1.4) + (0 if rng.random() < h else DB_MS * rng.uniform(0.6, 1.4))
                 for _ in range(100_000))
    mean, p99 = sum(lat) / len(lat), lat[int(0.99 * len(lat))]
    print("%7.1f%% %10.2f %10.2f %14s %13.1f%%" % (100 * h, mean, p99, "{:,.0f}".format(BASE_QPS * (1 - h)), 100 * (1 - h)))`,
      out: `   hit %    mean ms     p99 ms     DB reads/s  DB load vs 0%
    0.0%      11.00      15.04         20,000         100.0%
   50.0%       6.01      14.89         10,000          50.0%
   80.0%       3.01      14.59          4,000          20.0%
   90.0%       2.01      14.21          2,000          10.0%
   95.0%       1.51      13.45          1,000           5.0%
   99.0%       1.10       6.91            200           1.0%
   99.5%       1.05       1.40            100           0.5%`,
      caption: "Read the last two columns: **database load is the miss ratio**, so 90% → 99% hits cuts it from 2,000 reads a second to 200 — tenfold. Then read p99: it stays at database speed until the hit ratio passes 99%, because as long as more than 1% of requests miss, the 99th percentile *is* a miss." },

    { t: "dl", items: [
      ["Think in misses, not hits", "A 95% hit ratio sounds nearly perfect; it means 1 request in 20 still reaches the database. Each extra nine of hit ratio divides database load by ten, which is why the last few per cent are worth fighting for."],
      ["Caches fix the mean before the tail", "p99 latency is set by misses until misses fall below 1%. If a latency SLO is on p99 (11.1), a cache at 95% will not meet it — the misses themselves must get faster, or there must be fewer of them."],
      ["The real win is usually protection", "Cutting database load by ten is often worth more than cutting latency, because it is what lets the database survive growth. Which is also why losing the cache — a flush, a restart — can take the database down (3.4)."]
    ] },

    { t: "h2", n: "03", id: "layers", text: "Where caches sit",
      sub: "Every layer between the user and the disk can keep a copy" },

    { t: "diagram", kind: "layers", title: "Cache layers, nearest the user first",
      caption: "Each layer is faster and closer than the one below, and each serves fewer users with the same copy. A request answered by an upper layer never reaches the lower ones — which is the whole point, and also why invalidation has to reach every layer that might hold a copy (3.3).",
      items: [
        { label: "Browser and app cache", sub: "Cache-Control headers; zero network", tone: "good", side: "one user · 0 ms" },
        { label: "CDN edge", sub: "static assets, cacheable API responses (3.5)", tone: "good", side: "a city · ~10 ms" },
        { label: "Gateway / reverse proxy cache", sub: "whole responses by URL", tone: "accent", side: "everyone · < 1 ms hop" },
        { label: "In-process cache", sub: "a dict or LRU inside each app server", tone: "accent", side: "one server · ~0.0001 ms" },
        { label: "Distributed cache", sub: "Redis, Memcached: shared by every server", tone: "violet", side: "all servers · ~0.5–1 ms" },
        { label: "Database buffer pool", sub: "hot pages already in the database's RAM", tone: "warn", side: "automatic" }
      ] },

    { t: "callout", kind: "tradeoff", title: "In-process or distributed?",
      body: [
        { t: "p", text: "An in-process cache is three orders of magnitude faster than Redis (1.2) and has no network failure mode — but each of N servers keeps its own copy, so N copies to keep fresh, N times the memory, and each server warms up separately after a deploy. A distributed cache is one shared copy, survives app restarts, and can be invalidated in one place." },
        { t: "p", text: "The common answer is **both**: a small in-process cache with a short TTL for the very hottest keys (configuration, feature flags, the top 1% of products) in front of Redis for everything else. Two layers, each doing what it is good at." }
      ] },

    { t: "callout", kind: "trap", title: "Caching a workload that has no hot set",
      body: [
        { t: "p", text: "The red line in the chart is real workloads too: a nightly job that reads every customer once, a search across a huge catalogue where every query is different, an analytics scan. Putting a cache in front of those adds a network hop and memory cost to every request and saves nothing — and worse, an LRU cache shared with the interactive traffic gets **flushed by the scan**, evicting the hot keys that were doing real work." },
        { t: "p", text: "Measure the access distribution before adding a cache: log keys for an hour and check what fraction of requests the top 1% of keys receive. And keep scans away from shared caches — read them from a replica (4.1) with caching disabled, or use a scan-resistant eviction policy (3.3)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Size a product cache",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A catalogue has 50 million products averaging 2 KB each. Product reads currently put 40,000 reads a second on the database, and access is Zipf-distributed with s ≈ 1. Redis adds roughly 50% overhead per key. How much memory buys 70%, 80% and 90% hit ratios?" }
      ],
      requirements: [
        "Model the key space at 100,000 keys and find, by simulation, the smallest LRU cache reaching each target",
        "Convert the share of keys to memory for the real catalogue",
        "Report the database reads per second remaining at each target",
        "Explain any target that cannot be reached, and what limits it"
      ],
      hint: "Search over capacity — the hit ratio grows with capacity, so a binary search finds the smallest one that meets a target. Then ask what happens to a key the very first time it is requested.",
      solution: { lang: "python", title: "cache_size_ex.py",
        code: `import bisect, itertools, random
from collections import OrderedDict

KEYS, REQUESTS, S = 100_000, 600_000, 1.0     # a scaled-down model of the real key space
REAL_KEYS, VALUE_KB, OVERHEAD = 50_000_000, 2.0, 1.5   # per-key bookkeeping in Redis ~ +50%
DB_READS_NOW = 40_000                                  # reads/s reaching the DB with no cache

rng = random.Random(8)
cum = list(itertools.accumulate(1 / k ** S for k in range(1, KEYS + 1)))
stream = [bisect.bisect(cum, rng.random() * cum[-1]) for _ in range(REQUESTS)]

def hit_ratio(capacity):
    cache, hits = OrderedDict(), 0
    for k in stream:
        if k in cache: hits += 1; cache.move_to_end(k)
        else:
            cache[k] = True
            if len(cache) > capacity: cache.popitem(last=False)
    return hits / REQUESTS

print("%-10s %12s %12s %16s %12s" % ("target", "share", "hit ratio", "DB reads/s", "memory"))
for target in (0.70, 0.80, 0.90):
    lo, hi = 1, KEYS                                   # smallest cache meeting the target
    while lo < hi:
        mid = (lo + hi) // 2
        if hit_ratio(mid) >= target: hi = mid
        else: lo = mid + 1
    share = lo / KEYS
    gb = share * REAL_KEYS * VALUE_KB * OVERHEAD / 1024 / 1024
    print("%-10s %11.1f%% %11.1f%% %16s %9.0f GB" % (f"{target:.0%} hits", 100 * share,
          100 * hit_ratio(lo), "{:,.0f}".format(DB_READS_NOW * (1 - hit_ratio(lo))), gb))`,
        out: `target            share    hit ratio       DB reads/s       memory
70% hits           7.2%        70.0%           12,000        10 GB
80% hits          19.6%        80.0%            8,000        28 GB
90% hits         100.0%        88.8%            4,474       143 GB`,
        notes: [
          { t: "p", text: "70% needs about 7% of the keys and 10 GB — a single Redis node. 80% needs about 20% of the keys and three times the memory: each step up the curve costs more than the last, exactly the flattening in section 01's chart. Somewhere between them is the right answer, chosen by what database load the primary can actually take." },
          { t: "p", text: "90% was **not reachable even with every key cached**. In this stream a little over a tenth of requests are the first request for their key, and a first request is always a miss — a *compulsory* miss that no capacity removes. Real traffic has the same floor: new products, cold users, the long tail. Pre-warming the cache with keys known to be popular is the only way under it." },
          { t: "p", text: "Two caveats a production answer states. The model scales a 100,000-key simulation up to 50 million keys, and hit-ratio curves shift with key count, so the real numbers come from replaying a sample of production access logs. And 28 GB is the steady state: after a flush or restart the cache starts empty and every request misses until it refills, which is the stampede problem of 3.4." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the cache that was too good",
      body: [
        { t: "p", text: "**Symptom.** A news site's database ran comfortably at 15% CPU for a year behind a Redis cache with a 97% hit ratio. During a routine Redis upgrade the cache restarted empty. Within ninety seconds the database was at 100% CPU, page loads timed out, and the site was down for twenty minutes — for a cache upgrade." },
        { t: "p", text: "**Mechanism.** The database had been sized for the 3% of reads that missed, not for the traffic. With the cache empty, all of it arrived at once: about **thirty-three times** the load the database normally saw, as section 02's table predicts for 97% → 0%. Requests timed out before they could populate the cache, so it never warmed, and the outage sustained itself." },
        { t: "p", text: "**Fix.** Upgrades now replace Redis nodes one at a time behind a cluster, so the cache is never fully empty; a warm-up job pre-loads the top 100,000 keys before a node takes traffic; and the database gained a hard concurrency limit so overload produces fast errors instead of a death spiral (7.4). The capacity plan now records the database's load **with the cache empty**, because that is the load it will one day see." }
      ] }
  ],

  takeaways: [
    "Caching works because **access is skewed**: measured under typical web skew, 1% of keys answered about half of all reads; under uniform access, 1% answered 1%.",
    "**Database load equals the miss ratio.** 90% → 99% hits is a **tenfold** cut in database reads.",
    "**Caches fix the mean before the tail**: measured, p99 stayed at database speed until the hit ratio passed 99%.",
    "Mean latency = hit × cache time + miss × (cache time + source time); always add the cache check to a miss.",
    "Caches sit at every layer — **browser, CDN, gateway, in-process, distributed, database buffer** — each nearer the user and shared by fewer.",
    "**In-process** is ~1,000× faster than Redis but duplicated per server; the common answer is a small in-process layer in front of a distributed one.",
    "Hit ratio flattens with size: each step up the curve **costs more memory than the last**.",
    "**Compulsory misses** — first requests for a key — set a ceiling no capacity can pass; measured, 90% was unreachable even with every key cached.",
    "Do not cache workloads with **no hot set**, and keep scans out of shared caches or they evict the keys doing real work.",
    "Size the database for **the load with the cache empty**: a 97%-hit cache hides 33× the load until the day it restarts."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A cache's hit ratio improves from 90% to 99%. What happens to the read load on the database?",
        options: ["It falls by about 10%", "It falls tenfold, from 10% of reads to 1%", "It is unchanged; only latency improves", "It doubles because of more writes"],
        answer: 1,
        why: "The database sees only the misses, so its load is the miss ratio: 10% of reads becomes 1%, a tenfold reduction — 2,000 reads a second to 200 in the worked numbers. The hit ratio rose only nine points, which is why thinking in hits understates the change. Latency improves too, and reads are not converted into writes." },

      { stem: "A service's cache hit ratio is 95% and its p99 latency is still close to the database's. Why?",
        options: ["The cache is slower than the database", "5% of requests miss, so the 99th percentile is a miss", "p99 only measures writes", "The cache's TTL is too long"],
        answer: 1,
        why: "With 5% of requests missing, more than 1% of all requests pay the database's latency, so the 99th-percentile request is one of them; the simulation shows p99 dropping only once the hit ratio passes 99%. The cache is far faster than the database, p99 covers whatever requests are measured, and a longer TTL would if anything raise the hit ratio." },

      { stem: "A nightly job reads each of 10 million customer records once, through the same LRU cache as the website. What is the main risk?",
        options: ["The job will be very fast", "The job's one-off reads evict the website's hot keys, so site hit ratio collapses", "The cache will run out of keys", "Nothing — LRU handles this automatically"],
        answer: 1,
        why: "Each record the job reads becomes the most recently used entry, pushing out the genuinely hot keys the website depends on, so after the scan the site's hit ratio drops and the database takes the load. The job gains nothing, because it reads each key only once. LRU is exactly the policy that is vulnerable to this, which is why scan-resistant policies exist (3.3)." },

      { stem: "Why can a hit ratio be capped below 100% even with unlimited cache memory?",
        options: ["Redis limits hit ratios to 99%", "The first request for each key is always a miss", "Cached values expire immediately", "LRU evicts keys randomly"],
        answer: 1,
        why: "A key cannot be in the cache before it has been read once, so every first request is a compulsory miss; a workload with many new or rarely seen keys has a ceiling no capacity removes — the exercise could not reach 90%. Redis imposes no such limit, expiry depends on the TTL you choose, and LRU evicts the least recently used key, not a random one." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Say the hit ratio, then say what it means for the database.",
    questions: [
      { level: "core",
        q: "Why does caching help, and how do you know it will help here?",
        strong: "A strong answer explains skew, measures it, and states the benefit as database load.",
        answer: [
          { t: "p", text: "Because access is skewed: a small set of keys gets most of the requests, so keeping that set in memory answers most reads cheaply. Under typical web skew a cache of 1% of the keys answers about half of reads, and 10% about three-quarters." },
          { t: "p", text: "Before adding one I would check the distribution — log keys for an hour and see what share of requests the top 1% receive — because a workload without a hot set, like a scan or a random lookup over a huge space, gains nothing. And I would state the benefit as database load: at 95% hits the database sees one read in twenty, which is usually the real reason the cache is there." }
        ] },

      { level: "core",
        q: "Where would you put caches in this design?",
        strong: "A strong answer places caches by layer with a reason for each and mentions invalidation.",
        answer: [
          { t: "p", text: "Starting nearest the user. Static assets and cacheable responses at the CDN with proper Cache-Control headers. A distributed cache — Redis — shared by all app servers for hot database reads like product and profile data. Possibly a small in-process cache with a short TTL for the hottest, slowest-changing keys, such as configuration and feature flags." },
          { t: "p", text: "Then the cost: every layer is another copy to invalidate when the data changes, so I would match each layer's TTL to how stale that data may be, and keep anything that must be current — stock at checkout, balances — out of the cache or behind explicit invalidation." }
        ] },

      { level: "advanced",
        q: "Your cache has a 98% hit ratio. What is the biggest risk it creates?",
        strong: "A strong answer identifies the hidden load on the database and the cold-start failure.",
        answer: [
          { t: "p", text: "That the database is now sized for 2% of the read traffic. If the cache empties — a restart, a flush, a failover to a cold replica — the database receives fifty times its normal read load at once, requests time out before they can repopulate the cache, and the outage sustains itself." },
          { t: "p", text: "So I would plan for it explicitly: replace cache nodes one at a time so it is never fully cold, warm new nodes with known-hot keys before they take traffic, protect the database with request coalescing and a concurrency limit so overload fails fast, and record in the capacity plan what the database sees with the cache empty." }
        ] }
    ]
  }
});

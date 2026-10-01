/* ============================================================================
   LESSON 14.2 — Meta, Uber, Twitter and LinkedIn
   ========================================================================= */
EC.receiveLesson({
  id: "14.2",

  lede: "Four companies, four problems that ordinary designs could not handle at their scale. Meta serves a social graph read hundreds of times for every write, through caches so large that the subtle races between a cache and its database became production incidents. Uber matches riders to drivers who move every few seconds. Twitter delivered each post to the timelines of everyone who followed its author — sometimes tens of millions of people. LinkedIn needed every system to see every event, and built Kafka to do it. Each section reproduces the core mechanism: a cache lease that stops a stale value surviving for an hour, a grid index that answers \"who is near me\" nearly forty times faster than a scan, and the fan-out threshold that trades a quarter of the timeline writes for a heavier read.",

  objectives: [
    "Explain how Meta's TAO and memcache layers serve a read-heavy graph, and how leases prevent stale sets",
    "Index moving objects geospatially, and explain why Uber uses hexagons at several resolutions",
    "Choose a timeline fan-out strategy from follower distributions and read/write costs",
    "Explain why LinkedIn built a log, and what it changed for everyone else",
    "Relate each company's choices to the general patterns of earlier modules"
  ],

  prerequisites: ["3.2", "4.3", "6.2"],

  blocks: [

    { t: "h2", n: "01", id: "meta", text: "Meta: a graph behind a cache",
      sub: "Hundreds of reads per write, and the races that come with caching them" },

    { t: "p", text: "Almost everything on Facebook is a graph of **objects** (people, posts, photos, comments) and typed **associations** between them (friend of, liked, authored, tagged in). Meta's TAO, described in a 2013 paper, stores that graph in sharded MySQL and serves it through a large, two-level cache — follower caches near the web servers, leader caches in front of each database shard — with reads outnumbering writes by around 500 to 1. Writes go through the leader to the database in one primary region; other regions serve reads from replicas and their own caches, and receive invalidations as the database replicates." },

    { t: "diagram", kind: "flow", title: "TAO: caches in front of a sharded graph",
      caption: "Web servers query follower caches; misses go to the leader cache for that shard, and from there to MySQL. A write goes through the leader to the primary database, which invalidates the caches. In another region, the same tiers sit over a replica, kept current by replication and by invalidations carried with it.",
      cols: 3,
      nodes: [
        { id: "w", label: "Web servers", sub: "build each page", tone: "accent" },
        { id: "f", label: "Follower caches", sub: "many per region", tone: "teal" },
        { id: "l", label: "Leader cache", sub: "one per shard", tone: "violet" },
        { id: "rf", label: "Remote caches", sub: "serve local reads", tone: "teal" },
        { id: "rdb", label: "Replica shard", sub: "another region", tone: "warn" },
        { id: "db", label: "MySQL shard", sub: "primary region", tone: "warn" }
      ],
      edges: [["w", "f", "read"], ["f", "l", "miss"], ["l", "db", "miss, write"], ["db", "rdb", "replicate", "dashed"],
              ["rdb", "rf", "invalidate", "dashed"]] },

    { t: "p", text: "Caches at this scale meet a race that is rare per request and certain per day. A reader misses, reads the database, and is delayed for a moment; meanwhile a writer updates the row and deletes the cache entry; then the reader's late fill puts the old value back, where it stays until it expires. The memcache paper from the same year describes the fix: a **lease**. A miss hands out a token; a fill is accepted only with a valid token; an invalidation voids the token. The same race, against Redis, with and without leases:" },

    { t: "code", lang: "python", title: "lease.py — the stale-set race, and the lease that prevents it",
      code: `import redis, uuid
r = redis.Redis(port=6380, decode_responses=True)
db = {"profile:42": "name=Ana"}                      # the database, stood in for by a dict

# a miss hands out a lease token; a fill is accepted only with the token; invalidation voids the token
GET = r.register_script("""
local v = redis.call('GET', KEYS[1]); if v then return {'hit', v} end
local token = ARGV[1]; redis.call('SET', 'lease:' .. KEYS[1], token, 'NX', 'PX', 10000)
return {'miss', redis.call('GET', 'lease:' .. KEYS[1])}""")
SET_IF_LEASED = r.register_script("""
if redis.call('GET', 'lease:' .. KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', 3600); redis.call('DEL', 'lease:' .. KEYS[1]); return 1""")
INVALIDATE = r.register_script("redis.call('DEL', KEYS[1], 'lease:' .. KEYS[1]); return 1")

def run(use_leases):
    r.flushdb(); db["profile:42"] = "name=Ana"
    _, token = GET(keys=["profile:42"], args=[uuid.uuid4().hex])   # reader A misses...
    stale = db["profile:42"]                                         # ...and reads the database: "Ana"
    db["profile:42"] = "name=Ana Silva"                              # meanwhile a writer updates the row
    INVALIDATE(keys=["profile:42"])                                  # ...and invalidates the cache
    if use_leases: SET_IF_LEASED(keys=["profile:42"], args=[token, stale])   # A's late fill: token is void
    else: r.set("profile:42", stale, ex=3600)                                # A's late fill: plain set
    cached = r.get("profile:42")
    print(f"{'with leases' if use_leases else 'plain set':<12} database: {db['profile:42']!r:<18} "
          f"cache: {cached!r:<18} {'STALE for the next hour' if cached and cached != db['profile:42'] else 'consistent'}")

run(use_leases=False)
run(use_leases=True)`,
      hl: [6, 10, 13, 21],
      out: `plain set    database: 'name=Ana Silva'   cache: 'name=Ana'         STALE for the next hour
with leases  database: 'name=Ana Silva'   cache: None               consistent` },

    { t: "p", text: "Without a lease, a profile change was undone in the cache for the next hour. With one, the late fill was rejected and the next reader filled the cache from the updated row. Leases do a second job too: when many readers miss the same key at once, only the holder of the lease queries the database and the others briefly wait or retry — the stampede protection of 3.4, built into the cache protocol." },

    { t: "h2", n: "02", id: "uber", text: "Uber: who is near me?",
      sub: "Millions of moving points and a question that must be answered in milliseconds" },

    { t: "p", text: "Drivers' apps report their location every few seconds, so the index of where drivers are is rewritten constantly, and every ride request asks for the available drivers near a point. Scanning every driver is out of the question at city scale. The standard answer is a **grid**: divide the map into cells, keep each cell's current drivers, and search only the cells around the rider. A city of 50,000 drivers with square one-kilometre cells:" },

    { t: "code", lang: "python", title: "geo.py — a scan against a grid of cells, and the cost of keeping the grid current",
      code: `import math, random, time
from collections import defaultdict
random.seed(47)
CITY_KM, DRIVERS, CELL_KM, RADIUS_KM = 30, 50_000, 1.0, 1.0

drivers = {d: (random.uniform(0, CITY_KM), random.uniform(0, CITY_KM)) for d in range(DRIVERS)}
cell_of = lambda x, y: (int(x // CELL_KM), int(y // CELL_KM))
grid = defaultdict(set)                                  # cell -> drivers in it
for d, (x, y) in drivers.items(): grid[cell_of(x, y)].add(d)

def move(d, x, y):                                       # a location ping, every few seconds per driver
    old, new = cell_of(*drivers[d]), cell_of(x, y)
    if old != new: grid[old].discard(d); grid[new].add(d)
    drivers[d] = (x, y)

def near_brute(x, y):
    return {d for d, (dx, dy) in drivers.items() if math.hypot(dx - x, dy - y) <= RADIUS_KM}

def near_grid(x, y):                                     # only the rider's cell and the eight around it
    cx, cy = cell_of(x, y)
    return {d for i in (-1, 0, 1) for j in (-1, 0, 1) for d in grid[(cx + i, cy + j)]
            if math.hypot(drivers[d][0] - x, drivers[d][1] - y) <= RADIUS_KM}

riders = [(random.uniform(0, CITY_KM), random.uniform(0, CITY_KM)) for _ in range(300)]
start = time.perf_counter(); a = [near_brute(*r) for r in riders]; brute = time.perf_counter() - start
start = time.perf_counter(); b = [near_grid(*r) for r in riders]; indexed = time.perf_counter() - start
clamp = lambda v: min(CITY_KM - 0.01, max(0.0, v))
start = time.perf_counter()
for d in random.sample(range(DRIVERS), 20_000):          # a burst of location updates
    x, y = drivers[d]
    move(d, clamp(x + random.gauss(0, 0.05)), clamp(y + random.gauss(0, 0.05)))
updates = time.perf_counter() - start

print(f"{DRIVERS:,} drivers in a {CITY_KM} x {CITY_KM} km city; {sum(map(len, a)) / len(a):.0f} within {RADIUS_KM:g} km of a rider on average")
print(f"scan every driver: {brute / len(riders) * 1000:6.1f} ms per query")
print(f"1 km grid cells:   {indexed / len(riders) * 1000:6.2f} ms per query  (same answers: {a == b})")
print(f"location updates:  {updates / 20_000 * 1e6:6.1f} microseconds each, moving a driver between cells when needed")`,
      hl: [11, 19, 21],
      out: `50,000 drivers in a 30 x 30 km city; 169 within 1 km of a rider on average
scan every driver:    4.8 ms per query
1 km grid cells:     0.13 ms per query  (same answers: True)
location updates:     2.6 microseconds each, moving a driver between cells when needed` },

    { t: "p", text: "Looking only at nine cells gave identical answers nearly forty times faster, and keeping the index current cost a few microseconds per location update — a driver changes cell only occasionally. Uber's open-source **H3** uses hexagons rather than squares: all six neighbours of a hexagon are the same distance away, whereas a square's diagonal neighbours are 41% further than its edge neighbours, which distorts distance-based searches, surge pricing areas and demand forecasts. H3 offers sixteen resolutions, from cells larger than a country to under a square metre, so dense downtowns and sparse suburbs can each use a sensible cell size." },

    { t: "callout", kind: "note", title: "Uber's other well-known choices",
      body: [
        { t: "p", text: "Uber grew from a monolith to thousands of microservices and then, in 2020, described regrouping them into domains, each with a single gateway — Domain-Oriented Microservice Architecture — to tame the dependency tangle (10.1, 10.2). Long-running business processes such as a trip or a payout run on a durable workflow engine, Cadence, which Uber built and which its creators later forked as Temporal (5.4). And Kafka carries the event stream that feeds pricing, ETAs and analytics (6.2)." }
      ] },

    { t: "h2", n: "03", id: "twitter", text: "Twitter: fan-out on write, mostly",
      sub: "Precompute every timeline, except where one post would mean millions of writes" },

    { t: "diagram", kind: "compare", title: "Building a home timeline",
      caption: "Twitter's timeline service, as its engineers described it around 2012, pushed each new post into the in-memory timelines of the author's followers, so reading a timeline was a single fetch of a precomputed list — and merged posts from accounts with very large followings at read time instead.",
      columns: [
        { title: "Fan-out on write (push)", tone: "accent", items: [
          "post copied to every follower",
          "a read is one fetch",
          "writes scale with follower count",
          "a celebrity: millions of writes"
        ] },
        { title: "Fan-out on read (pull)", tone: "violet", items: [
          "a post is stored once",
          "a read gathers every author",
          "cheap writes, expensive reads",
          "reads far outnumber writes"
        ] },
        { title: "Hybrid", tone: "good", items: [
          "push for most authors",
          "pull for very large accounts",
          "reads merge a few big accounts",
          "the threshold is the dial"
        ] }
      ] },

    { t: "p", text: "Where to set the threshold depends on how follower counts are distributed. A synthetic network of two million accounts with heavily skewed followings, comparing push-everything with three thresholds:" },

    { t: "code", lang: "python", title: "timeline.py — timeline writes against read-time merging as the pull threshold moves",
      code: `import random
random.seed(53)
USERS = 2_000_000
# follower counts are extremely skewed: most accounts have dozens, a few are followed by much of the network
followers = sorted((min(USERS, int(random.paretovariate(1.1) * 20)) for _ in range(USERS)), reverse=True)
followers[:5] = [1_500_000, 800_000, 400_000, 200_000, 100_000]
posts = [random.choice([0, 0, 1, 1, 2, 5]) for _ in range(USERS)]             # posts per account per day

def plan(threshold):   # push each post into every follower's timeline, unless the author has >= threshold followers
    pushed = [(f, p) for f, p in zip(followers, posts) if f < threshold]
    pulled = [f for f in followers if f >= threshold]
    writes = sum(f * p for f, p in pushed)
    worst = max((f for f, p in pushed if p), default=0)                        # one post's fan-out
    extra = sum(pulled) / USERS               # big accounts the average reader follows: merged in at read time
    return writes, len(pulled), worst, extra

print(f"{'push unless the author has':<28}{'timeline writes/day':>20}{'pulled accounts':>17}{'largest fan-out':>17}{'extra reads/load':>18}")
for threshold in (float("inf"), 100_000, 10_000, 1_000):
    writes, n, worst, extra = plan(threshold)
    label = "(push everything)" if threshold == float("inf") else f">= {threshold:,} followers"
    print(f"{label:<28}{writes:>20,}{n:>17,}{worst:>17,}{extra:>18.2f}")`,
      hl: [9, 10, 14],
      out: `push unless the author has   timeline writes/day  pulled accounts  largest fan-out  extra reads/load
(push everything)                    458,569,846                0        1,500,000              0.00
>= 100,000 followers                 369,410,749              201           98,996             30.35
>= 10,000 followers                  302,225,688            2,154            9,988             54.19
>= 1,000 followers                   211,898,900           26,882              999             84.62` },

    { t: "p", text: "Pushing everything means one celebrity post triggers 1.5 million timeline writes in a burst, which is what made celebrity posts slow to appear and the write path spiky. Pulling accounts above 100,000 followers cut daily writes by a fifth and capped any single fan-out below 100,000, at the price of merging about thirty big accounts' recent posts on each read — cheap, because those posts are few and heavily cached. Lowering the threshold further keeps cutting writes, but every read grows. In practice the dial sits where the burst size the write path can absorb meets the merge cost a read can afford." },

    { t: "h2", n: "04", id: "linkedin", text: "LinkedIn: the log at the centre",
      sub: "One durable stream of events instead of a web of point-to-point pipelines" },

    { t: "p", text: "Around 2010 LinkedIn's data flowed through dozens of custom pipelines, each connecting one source to one destination — the search index, the recommendation features, the data warehouse, monitoring. Every new consumer meant new pipelines, and each broke differently. Its engineers built **Kafka**: a partitioned, replicated, append-only log that every producer writes to once and every consumer reads at its own pace, replaying from any point (6.2). Jay Kreps' 2013 essay *The Log* argued that this structure — the same one inside every database — is the natural integration point for a company's data. It became open-source infrastructure used almost everywhere, and LinkedIn has reported moving trillions of messages a day through it." },

    { t: "callout", kind: "insight", title: "What the log changed",
      body: [
        { t: "p", text: "With a durable log, N sources and M consumers need N + M connections rather than N × M; a new consumer starts by replaying history; a slow consumer only falls behind instead of blocking producers; and derived stores — search indexes, caches, feature stores (13.2), materialised views (4.4) — can be rebuilt from the log at will. Change data capture (6.4) made databases themselves producers. Much of this course's asynchronous design rests on that idea." }
      ] },

    { t: "exercise", kind: "Challenge", title: "The k nearest drivers, in rings",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A rider wants the five nearest drivers, wherever they are — downtown, where a cell holds hundreds, or on the edge of the city, where the nearest driver may be several cells away. Using a grid of half-kilometre cells, search outwards ring by ring: the rider's cell, then the eight around it, then the sixteen around those, and stop as soon as no unexamined cell could contain a driver closer than the fifth one found. Check every answer against brute force." }
      ],
      requirements: [
        "Drivers clustered around a centre and thinning towards the edges, indexed in a grid of 0.5 km cells",
        "A ring function returning the cells exactly k steps from the centre cell",
        "A correct stopping rule: the k-th distance is no more than the distance guaranteed by the rings searched",
        "Report rings searched and drivers examined for a downtown, a suburban and an edge-of-city rider"
      ],
      hint: "After searching rings 0..r, every unexamined driver is at least r × cell size away from the rider.",
      solution: { lang: "python", title: "geo_ex.py",
        code: `import heapq, math, random
from collections import defaultdict
random.seed(59)
CELL = 0.5                                                  # km

# drivers cluster downtown and thin out towards the suburbs
drivers = {}
for d in range(30_000):
    r, a = random.expovariate(1 / 4), random.uniform(0, 2 * math.pi)
    drivers[d] = (15 + r * math.cos(a), 15 + r * math.sin(a))
grid = defaultdict(list)
for d, (x, y) in drivers.items(): grid[(math.floor(x / CELL), math.floor(y / CELL))].append(d)

def ring(cx, cy, k):                                         # the cells exactly k steps from the centre cell
    if k == 0: return [(cx, cy)]
    return [(cx + i, cy + j) for i in range(-k, k + 1) for j in range(-k, k + 1) if max(abs(i), abs(j)) == k]

def k_nearest(x, y, k=5):
    cx, cy = math.floor(x / CELL), math.floor(y / CELL)
    best, rings, examined = [], 0, 0
    while True:
        for cell in ring(cx, cy, rings):
            for d in grid.get(cell, ()):
                examined += 1
                heapq.heappush(best, (math.hypot(drivers[d][0] - x, drivers[d][1] - y), d))
        # stop when k are found and no unexamined cell can hold anything closer than the k-th
        if len(best) >= k and heapq.nsmallest(k, best)[-1][0] <= rings * CELL: break
        rings += 1
    return [d for _, d in heapq.nsmallest(k, best)], rings, examined

for label, (x, y) in [("downtown", (15.2, 14.9)), ("suburb", (24.0, 6.0)), ("far edge", (29.5, 29.5))]:
    found, rings, examined = k_nearest(x, y)
    exact = sorted(drivers, key=lambda d: math.hypot(drivers[d][0] - x, drivers[d][1] - y))[:5]
    print(f"{label:<9} searched {rings + 1:>2} rings, examined {examined:>5,} of 30,000 drivers; "
          f"nearest at {math.hypot(drivers[found[0]][0] - x, drivers[found[0]][1] - y):.2f} km; matches brute force: {found == exact}")`,
        out: `downtown  searched  2 rings, examined 5,410 of 30,000 drivers; nearest at 0.00 km; matches brute force: True
suburb    searched  3 rings, examined    35 of 30,000 drivers; nearest at 0.09 km; matches brute force: True
far edge  searched  5 rings, examined     5 of 30,000 drivers; nearest at 0.27 km; matches brute force: True`,
        notes: [
          { t: "p", text: "All three matched brute force. On the city's edge, five rings were searched and only five drivers examined; in the suburb, three rings and a few dozen. Downtown, two rings were enough but held over five thousand drivers, because half-kilometre cells are far too coarse where drivers are dense." },
          { t: "p", text: "That is the argument for several resolutions: choose fine cells in dense areas and coarse ones in sparse areas, or index at several resolutions at once and search the finest that has enough drivers — exactly what a hierarchical grid such as H3 makes easy. The stopping rule is what keeps the search correct whatever the cell size." }
        ] } },

    { t: "callout", kind: "scenario", title: "Case: the celebrity post that took minutes to arrive",
      body: [
        { t: "p", text: "**Symptom.** In the years when Twitter pushed every post into every follower's timeline, a post from an account with tens of millions of followers could take minutes to reach all of them, and the timeline service's write queues spiked whenever such accounts posted." },
        { t: "p", text: "**Mechanism.** One post meant tens of millions of timeline insertions, competing with every other post's fan-out. Followers of a celebrity who also replied to them could even see a reply before the post it answered, because the reply's author had far fewer followers and fanned out instantly." },
        { t: "p", text: "**Response.** Accounts with very large followings were excluded from fan-out on write and merged into timelines at read time from a small, hot cache of their recent posts. The same pattern appears wherever popularity is skewed: Meta's feed, notification systems and chat (15.5) all treat a few huge sources differently from the long tail." }
      ] }
  ],

  takeaways: [
    "Meta's **TAO** serves a graph of objects and associations through follower and leader caches over sharded MySQL, with reads ~500x writes.",
    "Caches race their databases: a late fill can restore an old value. **Leases** — token on miss, fill only with the token, invalidation voids it — kept the cache consistent where a plain set left it **stale for an hour**.",
    "Leases also give **stampede protection**: one lease holder rebuilds, the rest wait.",
    "Uber: index moving drivers in a **grid**; nine cells answered **~40x faster** than a scan, updates cost microseconds.",
    "**H3** hexagons have equidistant neighbours and **sixteen resolutions**, for dense and sparse areas alike.",
    "Twitter: **fan-out on write** for most authors, **pull at read time** for huge accounts; a 100k threshold cut writes by a fifth and capped bursts below 100k, adding ~30 merged accounts per read.",
    "LinkedIn built **Kafka**: one durable log turns N x M pipelines into N + M connections and makes every derived store rebuildable.",
    "Each famous choice is a general pattern — caching with invalidation, spatial indexing, precomputation with exceptions, the log — applied under extreme skew."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A reader misses the cache, reads the database, and is delayed; a writer updates the row and deletes the cache entry; the reader then fills the cache. What has happened, and what prevents it?",
        options: ["Nothing; the cache is correct", "The old value is back in the cache until it expires — a stale set. Leases prevent it: the fill needs the token from the miss, and the invalidation voided it", "The database is corrupt", "A deadlock"],
        answer: 1,
        why: "Delete-on-write invalidation leaves this window open. lease.py showed the plain set leaving the old profile cached for an hour, and the leased fill being rejected." },

      { stem: "Why index drivers in grid cells rather than scanning them for each request?",
        options: ["Grids use less memory", "A request then examines only the drivers in a few nearby cells, and a location update usually changes nothing in the index or moves a driver between two cells", "Scanning gives wrong answers", "Cells are required by GPS"],
        answer: 1,
        why: "In geo.py nine cells gave identical answers nearly forty times faster than scanning 50,000 drivers, and updates cost microseconds." },

      { stem: "Why did Twitter stop pushing posts from very large accounts into followers' timelines?",
        options: ["Those posts were less important", "One such post meant millions of timeline writes in a burst; merging those few accounts' posts at read time is cheaper overall", "Celebrities asked for it", "To save storage only"],
        answer: 1,
        why: "Fan-out on write costs writes proportional to followers. timeline.py's push-everything plan had a single post fanning out to 1.5 million timelines; a threshold capped that and added a small merge to each read." },

      { stem: "What did a central log like Kafka change for LinkedIn's data integration?",
        options: ["It replaced all databases", "Producers write once and any number of consumers read at their own pace and can replay history, turning many point-to-point pipelines into one shared stream", "It made all data consistent instantly", "It removed the need for schemas"],
        answer: 1,
        why: "N sources and M consumers need N + M connections to a log rather than N × M pipelines, and new or rebuilt consumers replay from the log." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "These four are the source of several classic interview questions; know the mechanism behind each.",
    questions: [
      { level: "advanced",
        q: "How would you design Twitter's home timeline?",
        strong: "A strong answer picks a hybrid fan-out, sizes it, and handles celebrities, ranking and failures.",
        answer: [
          { t: "p", text: "Writes: store each post once; a fan-out service pushes the post ID into the in-memory timelines (capped lists of recent IDs, in Redis or similar) of the author's active followers. Authors above a follower threshold are not fanned out. Reads: fetch the precomputed list, merge in recent posts from the big accounts the reader follows (cached hot), hydrate post IDs from a post cache, and rank." },
          { t: "p", text: "Size it: posts per second times average followers gives timeline writes; set the threshold so the largest burst fits the fan-out workers' capacity. Skip inactive users' timelines and rebuild them on demand when they return. Handle deletions with tombstones checked at read time, and let fan-out lag rather than fail under bursts, since a post arriving seconds late is acceptable." }
        ] },

      { level: "core",
        q: "How would you find nearby drivers for a ride-hailing app?",
        strong: "A strong answer indexes by cell, keeps the index in memory, and searches outward.",
        answer: [
          { t: "p", text: "Drivers send locations every few seconds to a location service that keeps the latest position per driver and an index from cell to drivers, in memory, sharded by region or cell. A ride request converts the pickup point to its cell and searches that cell and the rings around it until enough candidates are found, then ranks them by estimated time of arrival from a routing service rather than by straight-line distance." },
          { t: "p", text: "Use a hierarchical grid such as H3 or geohash so cell sizes can match density. Locations are ephemeral, so the index can be rebuilt from the stream of pings after a failure; keep only the latest position durable for safety and billing." }
        ] },

      { level: "core",
        q: "What is a lease in a cache, and why use one?",
        strong: "A strong answer describes both the stale-set race and the thundering herd.",
        answer: [
          { t: "p", text: "On a miss, the cache gives the client a lease token; the client may fill the key only with that token, and an invalidation of the key voids outstanding tokens. That prevents a slow reader from writing an old value back after a writer has invalidated it." },
          { t: "p", text: "Rate-limiting lease issuance per key also stops a thundering herd: only one client per interval gets the lease and queries the database; the others wait briefly and read the filled value, or are served slightly stale data if that is acceptable." }
        ] }
    ]
  }
});

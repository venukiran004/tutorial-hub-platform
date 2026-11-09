/* ============================================================================
   LESSON 14.2 — Meta, Uber, Twitter and LinkedIn
   ========================================================================= */
EC.receiveLesson({
  id: "14.2",

  lede: "Social graphs, ride dispatch, timelines and activity streams each produced a system that the rest of the industry later copied. Meta built TAO, a graph-shaped cache in front of sharded MySQL. Uber indexed the planet with hexagons. Twitter precomputed home timelines and invented a compact time-ordered ID. LinkedIn built Kafka around a single idea, the log. This lesson reads each design for the problem that forced it and measures three of the mechanisms: cache leases, hexagonal search and Snowflake IDs.",

  objectives: [
    "Describe TAO's objects, associations and two-tier cache, and why a graph API beats raw key-value caching",
    "Explain how memcache leases stop thundering herds and stale sets, with measured effect",
    "Compare hexagonal and square grids for nearby search",
    "Relate Twitter's hybrid fan-out to the read/write ratio and design a Snowflake ID",
    "Explain why LinkedIn built Kafka as a log, and what that made possible"
  ],

  prerequisites: ["3.4", "4.2", "6.2"],

  blocks: [
    { t: "h2", n: "01", id: "meta", text: "Meta: TAO and memcache", sub: "A graph API over a cache over MySQL" },
    { t: "p",
      text: "Facebook's data is a graph: users, posts, photos and comments are **objects**, and friendships, likes and authorship are typed **associations** between them. TAO, described in a 2013 USENIX paper, serves that graph with a small API (get an object, list the associations of a type from an object, count them) and stated that it sustained a billion reads per second. MySQL remains the store of record, sharded by object id; TAO is a cache that understands the data model, so it can update an association list in place instead of invalidating it." },
    { t: "viz",
      title: "TAO's tiers within a region",
      caption: "Followers absorb reads; a miss or a write goes to the shard's leader, which talks to MySQL and keeps the followers consistent. Other regions receive changes asynchronously.",
      svg: `<svg viewBox="0 0 760 215" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="130.0" y1="56.0" x2="190.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="340.0" y1="56.0" x2="400.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="550.0" y1="56.0" x2="610.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="680.0" y1="82.0" x2="680.0" y2="150.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="30" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="70.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Web servers</text>
<text x="70.0" y="70" text-anchor="middle" class="s-sub">read, write</text>
<rect x="190" y="30" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="265.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Follower tier</text>
<text x="265.0" y="70" text-anchor="middle" class="s-sub">many per region</text>
<rect x="400" y="30" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="475.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--violet)">Leader tier</text>
<text x="475.0" y="70" text-anchor="middle" class="s-sub">one per shard</text>
<rect x="610" y="30" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="680.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--good)">MySQL shard</text>
<text x="680.0" y="70" text-anchor="middle" class="s-sub">objects + assocs</text>
<rect x="610" y="150" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="680.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--warn)">Other regions</text>
<text x="680.0" y="190" text-anchor="middle" class="s-sub">async replication</text>
</svg>` },
    { t: "p",
      text: "The companion paper, 'Scaling Memcache at Facebook' (NSDI 2013), describes the look-aside cache underneath and two failure modes that any heavily read cache meets. A **thundering herd**: a hot key is deleted and every reader misses at once. A **stale set**: a reader fetches an old value, a writer updates the row and deletes the key, and the reader's late set puts the old value back. Its answer is a **lease**: a token issued on a miss, at most one per key at a time, that a set must present and a delete invalidates." },
    { t: "code",
      lang: "python",
      title: "leases.py — the same cache with and without leases",
      code: `import heapq, itertools
import numpy as np
rng = np.random.default_rng(2)

class Cache:
    """A look-aside cache. With leases (as in 'Scaling Memcache at Facebook', 2013), a miss hands out at most one
    token per key; other readers are told to wait and retry, a set needs the current token, and a delete voids it."""
    def __init__(self, leases): self.leases, self.data, self.token, self.ids = leases, {}, {}, itertools.count(1)
    def get(self, k):
        if k in self.data: return "hit", None
        if not self.leases: return "miss", None
        if k in self.token: return "wait", None
        self.token[k] = next(self.ids); return "miss", self.token[k]
    def set(self, k, v, tok):
        if self.leases and self.token.get(k) != tok: return False
        self.data[k] = v; self.token.pop(k, None); return True
    def delete(self, k): self.data.pop(k, None); self.token.pop(k, None)

def herd(leases, rate=2_000, db_ms=40.0, window=200.0):
    """A hot key has just been deleted. Count database reads while readers arrive at \`rate\` per second."""
    c, db_reads, q, seq = Cache(leases), 0, [], itertools.count()
    for t in np.cumsum(rng.exponential(1000 / rate, int(rate * window / 1000 * 1.5))):
        if t < window: heapq.heappush(q, (t, next(seq), "get", None))
    while q:
        t, _, kind, tok = heapq.heappop(q)
        if kind == "get":
            r, tok = c.get("k")
            if r == "miss": db_reads += 1; heapq.heappush(q, (t + db_ms, next(seq), "set", tok))
            elif r == "wait": heapq.heappush(q, (t + 10, next(seq), "get", None))
        else: c.set("k", "v", tok)
    return db_reads

def stale_race(leases):
    """Reader R misses and reads the row; writer W updates the row and deletes the key. Is the cache left stale?"""
    c, db = Cache(leases), {"row": "old"}
    _, tok = c.get("k")
    r_read = rng.uniform(0, 10); r_set = r_read + rng.exponential(2)
    w_write = rng.uniform(0, 15); w_delete = w_write + rng.exponential(1)
    seen = None
    for t, ev in sorted([(r_read, "r_read"), (r_set, "r_set"), (w_write, "w_write"), (w_delete, "w_delete")]):
        if ev == "r_read": seen = db["row"]
        elif ev == "r_set": c.set("k", seen, tok)
        elif ev == "w_write": db["row"] = "new"
        else: c.delete("k")
    return c.data.get("k") == "old"            # the cache holds a value the database no longer has

print("thundering herd: database reads after one invalidation of a hot key (mean of 500)")
for leases in (False, True):
    print(f"  {'with' if leases else 'without'} leases: {np.mean([herd(leases) for _ in range(500)]):.1f}")
N = 100_000
print(f"stale sets in {N:,} racing reader/writer pairs")
for leases in (False, True):
    s = sum(stale_race(leases) for _ in range(N))
    print(f"  {'with' if leases else 'without'} leases: {s:,} ({s / N:.2%})")`,
      out: `thundering herd: database reads after one invalidation of a hot key (mean of 500)
  without leases: 81.3
  with leases: 1.0
stale sets in 100,000 racing reader/writer pairs
  without leases: 8,781 (8.78%)
  with leases: 0 (0.00%)` },
    { t: "dl",
      items: [
        { term: "Herd",
          def: "Without leases, about 81 readers went to the database after one invalidation of a key read 2,000 times a second; with leases, one did, and the rest waited 10 ms and read the refilled value." },
        { term: "Stale sets",
          def: "In 8.8% of racing reader-writer pairs, the cache was left holding a value the database no longer had, indefinitely. With leases, none: the delete voided the reader's token, so its late set was refused." },
        { term: "Read-your-writes",
          def: "TAO sends a write through the follower that the user reads from, so the user sees their own change at once, even though other regions catch up later." }
      ] },
    { t: "h2",
      n: "02",
      id: "uber",
      text: "Uber: dispatch on a hexagonal grid",
      sub: "Indexing space for nearby search" },
    { t: "p",
      text: "Matching a rider to nearby drivers is a spatial query run at very high rates over moving points. Uber open-sourced **H3** in 2018, a hierarchical index that covers the earth with hexagons at 16 resolutions. A hexagon's six neighbours are all the same distance from its centre, whereas a square has four edge neighbours and four corner neighbours further away, so rings of hexagons approximate a circle better. The simulation searches for every driver within 1 km using square and hexagonal cells of the same area." },
    { t: "code",
      lang: "python",
      title: "hexgrid.py — rings of cells covering a 1 km radius",
      code: `import numpy as np
rng = np.random.default_rng(4)

# Find every driver within 1 km of a rider by searching grid cells around the rider's cell.
# Square cells and hexagonal cells of the same area (0.1 km²); search rings until the ring covers 1 km.
AREA, R = 0.1, 1.0
drivers = rng.uniform(-3, 3, size=(60_000, 2))                    # about 1,700 drivers per km²
side = np.sqrt(AREA)                                               # square side
hex_size = np.sqrt(2 * AREA / (3 * np.sqrt(3)))                    # hexagon circumradius with the same area

def square_cell(p): return np.floor(p / side).astype(int)
def hex_cell(p):                                                   # pointy-top axial coordinates, cube rounding
    q = (np.sqrt(3) / 3 * p[:, 0] - p[:, 1] / 3) / hex_size; r = (2 / 3 * p[:, 1]) / hex_size
    x, z = q, r; y = -x - z
    rx, ry, rz = np.round(x), np.round(y), np.round(z)
    dx, dy, dz = np.abs(rx - x), np.abs(ry - y), np.abs(rz - z)
    fix_x = (dx > dy) & (dx > dz); fix_y = ~fix_x & (dy > dz)
    rx = np.where(fix_x, -ry - rz, rx); rz = np.where(~fix_x & ~fix_y, -rx - ry, rz)
    return np.stack([rx, rz], 1).astype(int)
def hex_dist(a, b): d = a - b; return (np.abs(d[:, 0]) + np.abs(d[:, 1]) + np.abs(d[:, 0] + d[:, 1])) // 2

print(f"{'grid':<8}{'rings':>6}{'cells':>7}{'searched area':>15}{'recall':>8}{'drivers checked per true match':>32}")
for name in ("square", "hex"):
    found = checked = true = 0; rings = None
    for _ in range(300):
        rider = rng.uniform(-1.5, 1.5, size=(1, 2))
        within = np.linalg.norm(drivers - rider, axis=1) <= R
        if name == "square":
            k = int(np.ceil(R / side)); d = np.abs(square_cell(drivers) - square_cell(rider)).max(1); cells = (2 * k + 1) ** 2
        else:
            k = int(np.ceil(R / (np.sqrt(3) * hex_size) + 0.5)); d = hex_dist(hex_cell(drivers), hex_cell(rider)); cells = 3 * k * (k + 1) + 1
        searched = d <= k
        found += (searched & within).sum(); true += within.sum(); checked += searched.sum(); rings = k
    print(f"{name:<8}{rings:>6}{cells:>7}{cells * AREA:>12.2f} km²{found / true:>8.1%}{checked / found:>32.2f}")
print(f"a 1 km circle is {np.pi * R ** 2:.2f} km²")`,
      out: `grid     rings  cells  searched area  recall  drivers checked per true match
square       4     81        8.10 km²  100.0%                            2.59
hex          4     61        6.10 km²  100.0%                            1.94
a 1 km circle is 3.14 km²` },
    { t: "dl",
      items: [
        { term: "Less wasted search",
          def: "Both grids found every driver within 1 km. The hexagonal rings covered 6.1 km² against 8.1 km² for squares, so they examined 1.94 drivers per real match against 2.59: about a quarter less work for the same answer." },
        { term: "Sharding by place",
          def: "Uber's Ringpop library (2015) used consistent hashing and a gossip protocol to spread work such as cities or cells across dispatch servers, so a request lands on the node that holds that area's state." },
        { term: "Storage",
          def: "Uber's 2016 post explained a move from Postgres to MySQL, citing write amplification when rows change and the difficulty of upgrading replicas, and its Schemaless layer stored data as append-only cells on sharded MySQL." }
      ] },
    { t: "h2",
      n: "03",
      id: "twitter",
      text: "Twitter: timelines and Snowflake",
      sub: "Precompute for readers, but not for celebrities" },
    { t: "p",
      text: "Home timelines are read far more often than tweets are written, so Twitter pushed each tweet into its followers' cached timelines when it was posted (fan-out on write), and a timeline read became a single cache read. Accounts with very large followings would need millions of writes per tweet, so their tweets are merged in at read time instead. Lesson 15.5 measures this hybrid; the threshold is set by the follower distribution and the read-to-write ratio." },
    { t: "p",
      text: "Sharded storage cannot use one database's auto-increment for IDs. Twitter's **Snowflake** (2010) generates 64-bit IDs that sort roughly by time without coordination: 41 bits of milliseconds since a custom epoch, 10 bits of machine number and 12 bits of sequence within the millisecond. The exercise builds one." },
    { t: "h2",
      n: "04",
      id: "linkedin",
      text: "LinkedIn: Kafka and the log",
      sub: "One ordered stream, many readers" },
    { t: "p",
      text: "LinkedIn had many point-to-point pipelines between databases, search indexes, the data warehouse and monitoring, each with its own format and failure modes. Kafka, built there and open-sourced in 2011, replaced them with a distributed, partitioned, replicated **log**: producers append, and each consumer reads at its own offset and can replay. Jay Kreps's 2013 essay 'The Log' argued that this one abstraction underlies database replication, change data capture and stream processing." },
    { t: "table",
      head: ["Company", "Forcing problem", "Decision", "Lesson to borrow"],
      rows: [
        [
          "Meta",
          "Billions of graph reads per second",
          "TAO: graph-aware cache over sharded MySQL",
          "Cache the data model, not bytes"
        ],
        ["Meta", "Herds and stale sets in memcache", "Leases on misses", "A set must prove it is current"],
        [
          "Uber",
          "Nearby search over moving points",
          "H3 hexagons; sharding by area",
          "Choose cells that fit the query"
        ],
        [
          "Twitter",
          "Reads far outnumber writes",
          "Fan-out on write, except celebrities",
          "Precompute for the common path"
        ],
        [
          "Twitter",
          "IDs across many shards",
          "Snowflake: time + machine + sequence",
          "Coordination-free, roughly sorted IDs"
        ],
        ["LinkedIn", "N×M data pipelines", "Kafka: one replayable log", "Make the log the integration point"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Build a Snowflake ID generator",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Implement a generator of 64-bit IDs from 41 bits of milliseconds since an epoch, 10 bits of machine id and 12 bits of sequence. Generate 400,000 IDs from four generators in turn and check that they are unique and increasing per generator. Measure how ordered they are across generators, what happens when a millisecond's 4,096 sequence numbers run out, how many years the timestamp lasts, and what the generator does when the clock moves backwards." }
      ],
      requirements: [
        "Bit layout: (ms − epoch) << 22 | machine << 12 | sequence",
        "Wait for the next millisecond when the sequence wraps",
        "Refuse to issue IDs if the clock moves backwards",
        "Checks for uniqueness, per-generator order and cross-generator order"
      ],
      hint: "Pass the clock in as a function, so a test can feed it a time that goes backwards.",
      solution: { lang: "python",
        title: "snowflake.py",
        code: `import time

# Snowflake-style IDs: 41 bits of milliseconds since a custom epoch, 10 bits of machine id, 12 bits of sequence.
EPOCH = 1_288_834_974_657                      # Twitter's published epoch (Nov 2010), in ms
class Snowflake:
    def __init__(self, machine, clock):
        assert 0 <= machine < 1024
        self.machine, self.clock, self.last, self.seq, self.waits = machine, clock, -1, 0, 0
    def next_id(self):
        now = self.clock()
        if now < self.last: raise RuntimeError(f"clock moved backwards by {self.last - now} ms")
        if now == self.last:
            self.seq = (self.seq + 1) & 0xFFF
            if self.seq == 0:                    # 4,096 ids used this millisecond: wait for the next one
                while now <= self.last: now = self.clock(); self.waits += 1
        else: self.seq = 0
        self.last = now
        return ((now - EPOCH) << 22) | (self.machine << 12) | self.seq

def parts(i): return (i >> 22) + EPOCH, (i >> 12) & 0x3FF, i & 0xFFF

real = lambda: time.time_ns() // 1_000_000
gens = [Snowflake(m, real) for m in range(4)]
t = time.perf_counter(); ids = [gens[k % 4].next_id() for k in range(400_000)]; el = time.perf_counter() - t
print(f"400,000 ids from 4 generators in {el:.2f} s ({400_000 / el:,.0f} per second in one Python thread)")
print(f"unique: {len(set(ids)) == len(ids)}; each generator's ids increasing: "
      f"{all(all(a < b for a, b in zip(ids[m::4], ids[m + 4::4])) for m in range(4))}")
late = sum(1 for a, b in zip(ids, ids[1:]) if b < a)
print(f"ids out of order across generators: {late:,} of {len(ids):,} adjacent pairs (k-sorted, not totally ordered)")
stamps = sorted({parts(i)[0] for i in ids}); gaps = [b - a for a, b in zip(stamps, stamps[1:])]
print(f"generators that hit the 4,096-per-ms limit and waited: {sum(g.waits > 0 for g in gens)} of 4")
print(f"the clock advanced in steps of up to {max(gaps)} ms: {len(stamps)} distinct ms values over {stamps[-1] - stamps[0]} ms")
ms, mach, seq = parts(ids[-1]); print(f"last id {ids[-1]} -> ms {ms}, machine {mach}, sequence {seq}")
print(f"capacity: {4096 * 1000:,} ids/s per machine; 2^41 ms = {2 ** 41 / 1000 / 3600 / 24 / 365.25:.1f} years from the epoch")

fake = iter([5_000, 5_001, 4_990])
g = Snowflake(7, lambda: EPOCH + next(fake))
g.next_id(); g.next_id()
try: g.next_id()
except RuntimeError as e: print(f"clock step back: refused ({e})")`,
        out: `400,000 ids from 4 generators in 0.31 s (1,293,688 per second in one Python thread)
unique: True; each generator's ids increasing: True
ids out of order across generators: 99,988 of 400,000 adjacent pairs (k-sorted, not totally ordered)
generators that hit the 4,096-per-ms limit and waited: 4 of 4
the clock advanced in steps of up to 16 ms: 62 distinct ms values over 317 ms
last id 2119780744279637284 -> ms 1794230087715, machine 3, sequence 3364
capacity: 4,096,000 ids/s per machine; 2^41 ms = 69.7 years from the epoch
clock step back: refused (clock moved backwards by 11 ms)`,
        notes: [
          { t: "p",
            text: "All 400,000 IDs were unique and increasing within each generator. Across generators a quarter of adjacent pairs were out of order, because IDs from the same millisecond sort by machine number: Snowflake IDs are k-sorted, roughly by time, never a total order. Code that needs exact ordering across machines needs a single sequencer or a log." },
          { t: "p",
            text: "All four generators exhausted a millisecond's 4,096 sequence numbers even though each produced about 300,000 IDs a second, well under the 4.1 million limit. The clock on this Windows machine advanced in steps of up to 16 ms (62 distinct values over 317 ms), so thousands of IDs shared a timestamp. Timer resolution is part of the design. The 41-bit timestamp lasts 69.7 years from the epoch, and a clock stepping back 11 ms was refused rather than risking duplicate IDs; production generators also alarm on it, because NTP corrections do happen." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the cache that kept an old profile photo",
      body: [
        { t: "p",
          text: "**Symptom.** A small share of users who changed their profile photo kept seeing the old one on some pages for days, until they changed it again." },
        { t: "p",
          text: "**Mechanism.** A reader missed, read the old row, and was delayed; meanwhile the update committed and deleted the key. The reader's set then stored the old photo with no expiry. Nothing would ever invalidate it, because the write had already happened. The rate was low and tied to load, so it looked like a rare, unreproducible bug." },
        { t: "p",
          text: "**Fix.** Sets after a miss became conditional on a lease token issued at the miss and voided by deletes, so a set that raced a delete was refused. A maximum TTL was added as a backstop, so any stale value that slips through ages out." }
      ] }
  ],

  takeaways: [
    "**TAO** serves Facebook's graph as objects and associations from a two-tier cache over sharded MySQL, read-your-writes in the local tier.",
    "Cache the **data model**, not opaque bytes, and association lists can be updated instead of invalidated.",
    "Measured: leases cut database reads after a hot-key invalidation from **81** to **1**.",
    "Without leases, **8.8%** of racing reader/writer pairs left a stale value; with leases, **0**.",
    "Hexagonal rings searched **6.1 km²** against **8.1 km²** for squares, with the same recall.",
    "Twitter fans out on write for most accounts and on read for very large ones; the threshold follows the read/write ratio (lesson 15.5).",
    "Snowflake IDs: **41** bits of ms, **10** of machine, **12** of sequence; unique and roughly time-sorted, **69.7 years** of range.",
    "Snowflake IDs are **k-sorted**, not totally ordered; coarse clocks exhaust the per-ms sequence.",
    "Kafka made a replicated, replayable **log** the integration point for LinkedIn's data."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does a memcache lease prevent when a reader's set arrives after a writer's delete?",
        options: [
          "The reader's database query from timing out",
          "The old value being written back into the cache",
          "The writer's update from ever reaching the database",
          "The key being evicted early from the cache"
        ],
        answer: 1,
        why: "The delete voids the reader's token, so the late set is refused. In the simulation, 8.8% of racing pairs left a stale value without leases and none with them." },
      { stem: "Why do hexagonal cells suit nearby-driver search better than squares of the same area?",
        options: [
          "Hexagons are cheaper to store for every single cell",
          "Rings of hexagons approximate a circle better",
          "Squares cannot be arranged in a hierarchy",
          "Hexagons let GPS coordinates be more precise"
        ],
        answer: 1,
        why: "All six neighbours are equidistant, so k-rings waste less area outside the circle: 6.1 km² against 8.1 km² to cover 1 km, and 25% fewer drivers checked per match." },
      { stem: "Two Snowflake IDs come from different machines in the same millisecond. How do they compare?",
        options: [
          "By the order the requests actually arrived",
          "By machine number, not by request order",
          "They are equal and need a tie-break field",
          "By sequence number, ignoring the machine"
        ],
        answer: 1,
        why: "The timestamp bits are equal, so the machine bits decide. IDs are roughly time-sorted (k-sorted) but carry no exact order across machines." },
      { stem: "What problem did LinkedIn build Kafka to solve?",
        options: [
          "Slow MySQL queries on the member profile pages",
          "Many point-to-point pipelines between systems",
          "Storing social-graph edges for its search",
          "Serving cached pages at the network edge"
        ],
        answer: 1,
        why: "Each source fed each destination by its own pipeline. A single replicated, replayable log let every system publish once and every consumer read at its own pace." }
    ] },

  interview: { title: "In an interview",
    sub: "Use a real system as evidence, and state the condition that made it right.",
    questions: [
      { level: "core",
        q: "Design the data layer for a social network's likes and friendships.",
        strong: "A strong answer models objects and associations, shards by id, caches the graph shape and handles hot objects.",
        answer: [
          { t: "p",
            text: "Objects (users, posts) and typed associations (likes, friend-of) with a timestamp, stored in a sharded relational store keyed by the source object, so 'everyone who liked post P, newest first' is one shard's index scan. In front, a cache that stores association lists and counts, updated on write rather than invalidated, as TAO does, with leases or versioned sets so a racing reader cannot restore an old list." },
          { t: "p",
            text: "Hot objects (a celebrity post) get replicated cache entries and approximate counts. Cross-region replication is asynchronous, with writes routed so a user always reads their own changes." }
        ] },
      { level: "core",
        q: "How would you generate unique IDs across hundreds of shards?",
        strong: "A strong answer compares UUIDs, a central sequence and Snowflake, and covers clock problems.",
        answer: [
          { t: "p",
            text: "Random UUIDs need no coordination but are 128 bits and scatter inserts across B-tree indexes. A central sequence is ordered but a bottleneck and a single point of failure. A Snowflake layout gives 64-bit, roughly time-ordered IDs with no coordination beyond assigning machine numbers: 4,096 per millisecond per machine for about 70 years." },
          { t: "p",
            text: "The risks are clocks: refuse or wait when the clock steps backwards, alarm on it, and make sure machine numbers are never reused at the same time, for example by leasing them from a coordination service." }
        ] },
      { level: "advanced",
        q: "Your look-aside cache occasionally serves values that never get corrected. Why, and what do you do?",
        strong: "A strong answer identifies the read-miss/write-delete race and fixes it with leases or versions plus a TTL backstop.",
        answer: [
          { t: "p",
            text: "A reader missed, read the old row, and set it after a writer's delete, so nothing will invalidate it. Options: leases, where a set must carry a token voided by deletes; versioned sets, where the cache keeps the higher version; or deleting again after a delay. Always add a maximum TTL so anything that slips through ages out, and monitor the rate by sampling cache values against the database." }
        ] }
    ] }
});

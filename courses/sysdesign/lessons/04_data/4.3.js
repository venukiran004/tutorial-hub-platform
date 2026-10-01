/* ============================================================================
   LESSON 4.3 — Consistent Hashing
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "Hashing a key modulo the number of servers spreads keys perfectly — until the number of servers changes. Add one cache node to ten and `hash % N` moves **about 90% of all keys**, which for a cache means a near-total miss storm and for a database means migrating almost everything. Consistent hashing puts servers and keys on the same circle so a change moves only the keys between two neighbours — **about 1/N** — and virtual nodes fix the uneven arcs that a handful of servers would otherwise get.",

  objectives: [
    "Explain why hash modulo N remaps most keys when N changes, and measure it",
    "Describe the hash ring and how a key finds its node",
    "Explain why virtual nodes are needed and choose how many",
    "Compare the ring with rendezvous hashing",
    "Say where consistent hashing appears in real systems and what it does not solve"
  ],

  prerequisites: ["2.2", "4.2"],

  blocks: [

    { t: "h2", n: "01", id: "modn", text: "Why hash modulo N breaks",
      sub: "Changing the divisor changes almost every remainder" },

    { t: "p", text: "`node = hash(key) % N` gives each node an equal share. Change N from 10 to 11 and a key stays put only if its hash leaves the same remainder under both divisors — which, for a uniformly spread hash, is about one key in eleven. Everything else moves. In 2.1 the same effect logged out 211 of 300 users when one of three servers died." },

    { t: "h2", n: "02", id: "ring", text: "The ring",
      sub: "Servers and keys on one circle; a key belongs to the next server clockwise" },

    { t: "viz", title: "Adding a node to the ring",
      caption: "Hash each node's name to a position on a circle, and each key too. A key belongs to the first node at or after its position, going clockwise. When E joins, it takes over only the arc between its predecessor B and itself — keys that used to belong to C. Every other key stays where it was.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img"><text x="190" y="20" text-anchor="middle" class="s-label">Four nodes on the ring</text>
<circle cx="190" cy="140" r="92" style="fill:none;stroke:var(--line)" stroke-width="1.4"/>
<circle cx="255.1" cy="74.9" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="255.1" y="78.9" text-anchor="middle" class="s-label">A</text>
<circle cx="255.1" cy="205.1" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="255.1" y="209.1" text-anchor="middle" class="s-label">B</text>
<circle cx="124.9" cy="205.1" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="124.9" y="209.1" text-anchor="middle" class="s-label">C</text>
<circle cx="124.9" cy="74.9" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="124.9" y="78.9" text-anchor="middle" class="s-label">D</text>
<circle cx="221.5" cy="53.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="230.4" y="33.1" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k1→A</text>
<circle cx="276.5" cy="108.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="300.9" y="103.6" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k2→B</text>
<circle cx="269.7" cy="186.0" r="4.5" style="fill:var(--ink-3)"/>
<text x="292.2" y="203.0" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k3→B</text>
<circle cx="236.0" cy="219.7" r="4.5" style="fill:var(--ink-3)"/>
<text x="249.0" y="246.2" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k4→C</text>
<circle cx="158.5" cy="226.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="149.6" y="254.9" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k5→C</text>
<circle cx="103.5" cy="171.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="79.1" y="184.4" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k6→D</text>
<circle cx="110.3" cy="94.0" r="4.5" style="fill:var(--ink-3)"/>
<text x="87.8" y="85.0" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k7→D</text>
<circle cx="158.5" cy="53.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="149.6" y="33.1" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k8→A</text><line x1="380" y1="40" x2="380" y2="250" style="stroke:var(--line);stroke-dasharray:4 4"/><text x="570" y="20" text-anchor="middle" class="s-label">Node E joins at 170°</text>
<circle cx="570" cy="140" r="92" style="fill:none;stroke:var(--line)" stroke-width="1.4"/>
<circle cx="635.1" cy="74.9" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="635.1" y="78.9" text-anchor="middle" class="s-label">A</text>
<circle cx="635.1" cy="205.1" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="635.1" y="209.1" text-anchor="middle" class="s-label">B</text>
<circle cx="504.9" cy="205.1" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="504.9" y="209.1" text-anchor="middle" class="s-label">C</text>
<circle cx="504.9" cy="74.9" r="13" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.6"/>
<text x="504.9" y="78.9" text-anchor="middle" class="s-label">D</text>
<circle cx="586.0" cy="230.6" r="13" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)" stroke-width="1.6"/>
<text x="586.0" y="234.6" text-anchor="middle" class="s-label">E</text>
<circle cx="601.5" cy="53.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="610.4" y="33.1" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k1→A</text>
<circle cx="656.5" cy="108.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="680.9" y="103.6" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k2→B</text>
<circle cx="649.7" cy="186.0" r="4.5" style="fill:var(--ink-3)"/>
<text x="672.2" y="203.0" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k3→B</text>
<circle cx="616.0" cy="219.7" r="4.5" style="fill:var(--warn)"/>
<text x="629.0" y="246.2" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">k4→E</text>
<circle cx="538.5" cy="226.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="529.6" y="254.9" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k5→C</text>
<circle cx="483.5" cy="171.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="459.1" y="184.4" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k6→D</text>
<circle cx="490.3" cy="94.0" r="4.5" style="fill:var(--ink-3)"/>
<text x="467.8" y="85.0" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k7→D</text>
<circle cx="538.5" cy="53.5" r="4.5" style="fill:var(--ink-3)"/>
<text x="529.6" y="33.1" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink-3)">k8→A</text><text x="380" y="282" text-anchor="middle" class="s-sub">each key belongs to the first node clockwise · only k4 moves: the arc from B to E, which used to belong to C</text></svg>` },

    { t: "p", text: "One hundred thousand keys, ten nodes, then an eleventh. Measured for `hash % N` and for a ring with different numbers of virtual nodes per server:" },

    { t: "code", lang: "python", title: "ring.py — keys moved and load balance when a node is added", code: `import bisect, hashlib, statistics

def h(s: str) -> int:
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

class Ring:
    def __init__(self, nodes, vnodes=1):
        self.points = sorted((h(f"{n}#{v}"), n) for n in nodes for v in range(vnodes))
        self.hashes = [p for p, _ in self.points]
    def node(self, key):
        i = bisect.bisect(self.hashes, h(key)) % len(self.points)   # first point clockwise
        return self.points[i][1]

KEYS = [f"user:{i}" for i in range(100_000)]
before = [f"cache-{i}" for i in range(10)]
after = before + ["cache-10"]                                       # add one node

def moved(f_before, f_after):
    return sum(f_before(k) != f_after(k) for k in KEYS) / len(KEYS)

def spread(f, nodes):
    counts = {n: 0 for n in nodes}
    for k in KEYS: counts[f(k)] += 1
    vals = list(counts.values()); fair = len(KEYS) / len(nodes)
    return max(vals) / fair, statistics.pstdev(vals) / fair

modn = lambda nodes: (lambda k: nodes[h(k) % len(nodes)])
print("%-26s %12s %16s %12s" % ("scheme", "keys moved", "busiest node", "spread (cv)"))
print("%-26s %11.1f%% %15.2fx %12.2f" % ("hash % N", 100 * moved(modn(before), modn(after)), *spread(modn(after), after)))
for v in (1, 10, 100, 500):
    rb, ra = Ring(before, v), Ring(after, v)
    print("%-26s %11.1f%% %15.2fx %12.2f" % (f"ring, {v} vnode(s) per node", 100 * moved(rb.node, ra.node), *spread(ra.node, after)))
print("\\nideal when going from 10 to 11 nodes: %.1f%% of keys move" % (100 / 11))`,
      out: `scheme                       keys moved     busiest node  spread (cv)
hash % N                          90.7%            1.02x         0.01
ring, 1 vnode(s) per node          7.9%            2.53x         0.76
ring, 10 vnode(s) per node         5.7%            1.53x         0.28
ring, 100 vnode(s) per node        10.6%            1.16x         0.08
ring, 500 vnode(s) per node         8.8%            1.08x         0.05

ideal when going from 10 to 11 nodes: 9.1% of keys move`,
      hl: [8, 11, 12],
      caption: "`hash % N` balances perfectly and moves **over 90% of keys**. A ring with one point per node moves close to the ideal 1/11 — but its busiest node carries **about 2.5× a fair share**, because ten random points cut the circle into very unequal arcs. Giving each node a hundred or more **virtual nodes** keeps movement near 1/N and brings the busiest node within a few per cent of fair." },

    { t: "callout", kind: "insight", title: "Virtual nodes do three jobs",
      body: [
        { t: "ul", items: [
          "**Balance.** Many points per server average out the arc lengths, so each server's share converges on 1/N — the coefficient of variation fell from 0.76 to 0.05 above.",
          "**Spread on failure.** When a server dies, its many small arcs are inherited by many different neighbours, so its load is shared across the survivors instead of doubling one neighbour's.",
          "**Weighting.** A server with twice the memory gets twice the virtual nodes and therefore twice the keys — heterogeneous fleets with no special cases."
        ] },
        { t: "p", text: "The cost is a larger ring to search — a few thousand points, binary-searched, which is microseconds — and a little more metadata to distribute to clients." }
      ] },

    { t: "h2", n: "03", id: "rendezvous", text: "Rendezvous hashing",
      sub: "No ring at all: every node bids for every key" },

    { t: "p", text: "Rendezvous, or highest-random-weight, hashing computes a score `hash(node, key)` for every node and gives the key to the highest score. Adding a node steals exactly the keys for which it now scores highest — about 1/N — and removing one hands each of its keys to that key's second-highest scorer, spreading them across all survivors. It needs no virtual nodes to balance, at the cost of computing N hashes per lookup, which is fine for tens of nodes and wasteful for thousands." },

    { t: "diagram", kind: "matrix", title: "Three ways to map keys to nodes",
      caption: "Jump consistent hash (Google, 2014) is a third option for numbered shards: no ring, no per-node state, near-perfect balance — but it can only add or remove the highest-numbered shard, so it suits storage shards that grow, not cache nodes that fail at random.",
      cols: ["Moved on change", "Balance", "Lookup cost", "Used in"],
      rows: ["hash % N", "Ring + virtual nodes", "Rendezvous (HRW)"],
      cells: [
        [{ text: "≈ all keys", tone: "crit" }, { text: "perfect", tone: "good" }, { text: "O(1)", tone: "good" }, { text: "fixed-size pools only" }],
        [{ text: "≈ 1/N", tone: "good" }, { text: "good with ~100+ vnodes", tone: "good" }, { text: "O(log points)", tone: "good" }, { text: "Cassandra, DynamoDB" }],
        [{ text: "≈ 1/N", tone: "good" }, { text: "good, no vnodes", tone: "good" }, { text: "O(N) hashes", tone: "warn" }, { text: "client routing, CDNs" }]
      ] },

    { t: "callout", kind: "trap", title: "Consistent hashing does not move the data for you",
      body: [
        { t: "p", text: "For a cache, a key that now maps to a different node is just a miss: the new owner loads it and the old copy expires. For a **database**, the 1/N of keys that change owner must actually be copied to the new node before it serves them — and while they are in flight, reads must be able to find them. Consistent hashing tells you *which* keys move; it says nothing about *how*." },
        { t: "p", text: "Stores that rebalance live (Cassandra, DynamoDB, CockroachDB) stream the affected ranges to the new owner, keep the old owner serving until the copy completes, then switch ownership atomically. Hand-rolled sharding that adds a node by just changing the ring sends reads to a node that does not have the data yet." }
      ] },

    { t: "callout", kind: "warn", title: "It also does not fix a hot key",
      body: [
        { t: "p", text: "Consistent hashing balances **keys**. A single key with enormous traffic still lives on one node however many virtual nodes there are — 3.4's hot key and 4.2's giant tenant need their own remedies, salting or local caching, on top of any hashing scheme." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Implement rendezvous hashing",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Implement highest-random-weight hashing over ten cache nodes and check its properties against the ring's." }
      ],
      requirements: [
        "A function that, given the node list, returns a key-to-node mapping by highest score",
        "Report the busiest node's load relative to a fair share",
        "Measure the keys moved when an eleventh node is added",
        "Measure the keys moved when one node fails, and confirm only that node's keys moved",
        "Report how many surviving nodes inherited the failed node's keys"
      ],
      hint: "Score each node with `hash(f'{node}|{key}')` and take the maximum. A key moves on failure only if its winner was the failed node.",
      solution: { lang: "python", title: "rendezvous_ex.py",
        code: `import hashlib

def h(s: str) -> int:
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

def rendezvous(nodes):
    """Highest random weight: every node scores the key; the top score owns it."""
    return lambda key: max(nodes, key=lambda n: h(f"{n}|{key}"))

KEYS = [f"session:{i}" for i in range(50_000)]
nodes = [f"cache-{i}" for i in range(10)]

def owners(f): return [f(k) for k in KEYS]
def moved(a, b): return sum(x != y for x, y in zip(a, b)) / len(KEYS)
def busiest(o, n): return max(o.count(x) for x in n) / (len(KEYS) / len(n))

base = owners(rendezvous(nodes))
grown = owners(rendezvous(nodes + ["cache-10"]))
failed = owners(rendezvous([n for n in nodes if n != "cache-3"]))

print("busiest node, 10 nodes      : %.2fx fair share" % busiest(base, nodes))
print("add a node: keys moved      : %.1f%%  (ideal 1/11 = 9.1%%)" % (100 * moved(base, grown)))
print("lose cache-3: keys moved    : %.1f%%  (ideal: only its own 1/10)" % (100 * moved(base, failed)))
only_its_own = all(b == f or b == "cache-3" for b, f in zip(base, failed))
print("only cache-3's keys moved?  :", only_its_own)
print("cache-3's keys spread over   :", len({f for b, f in zip(base, failed) if b == "cache-3"}), "surviving nodes")`,
        out: `busiest node, 10 nodes      : 1.01x fair share
add a node: keys moved      : 8.9%  (ideal 1/11 = 9.1%)
lose cache-3: keys moved    : 10.1%  (ideal: only its own 1/10)
only cache-3's keys moved?  : True
cache-3's keys spread over   : 9 surviving nodes`,
        notes: [
          { t: "p", text: "Balance within about 1% with no virtual nodes, movement within a fraction of a per cent of the ideal 1/11, and on failure **only the failed node's keys move** — every other key's highest scorer is unchanged, because removing a node cannot change which of the remaining nodes scores highest." },
          { t: "p", text: "The failed node's keys spread over all nine survivors, because each key's runner-up is effectively random. That is the property a ring needs many virtual nodes to approximate, and it is what keeps a single failure from doubling one neighbour's load." },
          { t: "p", text: "The price is O(N) hashes per lookup. With ten or fifty nodes that is negligible next to a network call; with thousands of nodes a ring's binary search wins, which is why large storage systems use rings and many client-side routers use rendezvous." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: adding one cache node took the database down",
      body: [
        { t: "p", text: "**Symptom.** During a traffic peak, an engineer scaled a Memcached pool from 12 nodes to 13 to relieve memory pressure. Within a minute, the cache hit ratio fell from 94% to 9%, database CPU hit 100%, and the site degraded for twenty minutes until the cache rewarmed." },
        { t: "p", text: "**Mechanism.** The client library was configured with the default modulo distribution rather than its consistent-hashing (ketama) option. Changing 12 to 13 remapped about twelve keys in thirteen, so almost every request asked a node that had never seen its key: a self-inflicted version of 3.1's cold-cache incident, triggered by the action meant to help." },
        { t: "p", text: "**Fix.** Consistent hashing with 160 points per node across every client, enforced by a shared client configuration; pool changes made off-peak and one node at a time; and a dashboard panel showing hit ratio next to the pool size, so the cost of a membership change is visible the moment it happens. With consistent hashing, the same change would have moved about 8% of keys." }
      ] }
  ],

  takeaways: [
    "`hash % N` balances perfectly and **remaps almost every key** when N changes — measured, over 90% going from 10 nodes to 11.",
    "On a **ring**, a key belongs to the first node clockwise; a joining node takes only the arc before it, so about **1/N of keys move**.",
    "One point per node gives very **uneven arcs** — measured, the busiest node carried ~2.5× a fair share.",
    "**Virtual nodes** (≈100+ per server) bring balance within a few per cent, spread a failed node's load across many survivors, and allow weighting by capacity.",
    "**Rendezvous hashing** gives each key to the highest-scoring node: ~1/N movement, good balance with no virtual nodes, O(N) work per lookup.",
    "**Jump hash** balances near-perfectly but only adds or removes the last shard — for growing storage, not failing caches.",
    "Consistent hashing says **which** keys move; a database still has to **copy them** before the new owner serves them.",
    "It balances keys, **not load**: a hot key still needs salting or local caching.",
    "Check that cache clients use the consistent-hashing option; the modulo default turns scaling up into a miss storm."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A cache pool grows from 10 to 11 nodes using hash(key) % N. Roughly what fraction of keys now map to a different node?",
        options: ["About 9% (1/11)", "About 50%", "About 90%", "None"],
        answer: 2,
        why: "A key stays put only if its hash has the same remainder modulo 10 and modulo 11, which for a uniform hash is about one key in eleven, so roughly ten in eleven move — 90.7% measured. 1/11 is what consistent hashing achieves. Fifty per cent has no basis, and \"none\" would require the divisor not to matter." },

      { stem: "Why does a consistent-hash ring with one point per node balance load poorly?",
        options: ["Hash functions are biased", "A few random points divide the circle into very unequal arcs, and each node's share is its arc", "Keys cluster near node points", "The ring is searched linearly"],
        answer: 1,
        why: "Each node owns the arc before its point, and with only ten random points those arcs vary widely — the busiest node had about 2.5 times a fair share. Many virtual nodes per server average the arcs out. Good hash functions are not biased, keys are spread uniformly regardless of where nodes are, and the search method affects speed, not balance." },

      { stem: "With rendezvous hashing, one of ten nodes fails. Which keys move?",
        options: ["All keys", "About half", "Only the failed node's keys, spread across the survivors", "Only the failed node's keys, all moved to one neighbour"],
        answer: 2,
        why: "A key's owner is the node with the highest score for it; removing a node changes nothing for keys it did not own, and each of its keys goes to that key's second-highest scorer — which varies by key, so they spread over all survivors (nine in the exercise). Moving everything is the modulo behaviour, and dumping on one neighbour is what a ring without virtual nodes does." },

      { stem: "A database adds a node to its consistent-hash ring. What else must happen before the new node serves reads for its keys?",
        options: ["Nothing; consistent hashing handles it", "The affected key ranges must be copied to it, with the old owner serving until the copy completes", "Every key must be rehashed", "The ring must be rebuilt from scratch"],
        answer: 1,
        why: "Consistent hashing identifies the roughly 1/N of keys whose owner changes, but the data still lives on the old owner; it must be streamed across and ownership switched only when the copy is complete, or reads hit a node that lacks the data. Only the affected ranges move, so nothing is rehashed wholesale, and adding a point does not require rebuilding the ring." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Draw the ring; then say what virtual nodes are for.",
    questions: [
      { level: "core",
        q: "Explain consistent hashing.",
        strong: "A strong answer starts from the modulo problem, draws the ring, and adds virtual nodes unprompted.",
        answer: [
          { t: "p", text: "With hash modulo N, changing N remaps almost every key — going from ten to eleven nodes moves about 90% — which empties a cache or forces a database to migrate nearly everything. Consistent hashing places nodes and keys on the same circle by hashing them; a key belongs to the first node clockwise. Adding a node takes over only the arc before it, so about 1/N of keys move; removing one hands its arc to the next node." },
          { t: "p", text: "With a handful of nodes the arcs are very uneven, so each physical node gets many virtual nodes — a hundred or more points — which evens the load out, spreads a failed node's keys across many survivors, and lets bigger machines take proportionally more by having more points." }
        ] },

      { level: "advanced",
        q: "Where is consistent hashing used, and what does it not solve?",
        strong: "A strong answer names real systems and the two gaps: data movement and hot keys.",
        answer: [
          { t: "p", text: "Partitioning in Dynamo-style stores — Cassandra, DynamoDB — client-side sharding of caches with ketama, ring-hash load balancing in Envoy for session affinity, and CDNs mapping objects to servers. Rendezvous hashing appears where the node count is small and per-key computation is cheap." },
          { t: "p", text: "It does not move data: for a database the affected ranges still have to be streamed to the new owner with the old one serving until the switch. And it balances keys, not load, so a single hot key stays on one node whatever the hashing, needing salting or caching on top." }
        ] },

      { level: "core",
        q: "Ring with virtual nodes or rendezvous hashing?",
        strong: "A strong answer compares lookup cost, balance and failure behaviour.",
        answer: [
          { t: "p", text: "Rendezvous is simpler — no ring, no virtual nodes, good balance, and a failed node's keys spread across all survivors automatically — but each lookup computes a hash per node, so it suits tens of nodes. A ring with virtual nodes does a binary search over its points, so it scales to thousands of nodes, at the cost of choosing a virtual-node count and distributing the ring." },
          { t: "p", text: "For a client routing to a few dozen cache or shard nodes I would use rendezvous; for a large storage cluster, a ring." }
        ] }
    ]
  }
});

/* ============================================================================
   LESSON 15.3 — Walkthrough: URL Shortener
   ========================================================================= */
EC.receiveLesson({
  id: "15.3",

  lede: "The URL shortener is the most common opening problem in design interviews, because it looks trivial and is not. Mapping a short key to a long URL is one table. The difficulty is in three places: generating keys that never collide without a single point of contention, serving a read path that outnumbers writes a hundred to one with tail latency in single-digit milliseconds, and counting clicks without slowing the redirect. This lesson walks the four steps from 15.1 with the numbers from 15.2, and measures the two decisions candidates most often get wrong: how hash-based keys collide, and how much a cache really absorbs.",

  objectives: [
    "Scope a URL shortener with functional requirements, non-functional numbers and an estimate",
    "Compare hash, counter and random key generation by collision rate, contention and guessability",
    "Design a range-leasing key allocator that never collides and survives node crashes",
    "Size the cache for a skewed read path from a measured hit-rate curve",
    "Choose between 301 and 302 redirects, and keep analytics off the redirect path"
  ],

  prerequisites: ["15.1", "15.2", "3.1", "6.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "scope",
      text: "Requirements and numbers",
      sub: "Step 1 of the four, done in five minutes" },
    { t: "p",
      text: "Functional: a user submits a long URL and gets a short one; a visitor of the short URL is redirected; the owner can see click counts. Out of scope unless asked: custom aliases, expiry, accounts and editing. Non-functional: redirects are the hot path, so p99 under about 20 ms at the service, 99.99% availability for redirects (a dead link is a broken product), links that never change once issued, and keys that are hard to guess." },
    { t: "p",
      text: "Numbers: 100 million new links a month is about 40 writes per second on average, perhaps 120 at peak. With 100 reads per link, redirects run at about 4,000 a second on average and 12,000 at peak. At roughly 500 bytes per link, five years is 6 billion links and about 3 TB before replication. So the store is small, the writes are trivial, and everything interesting is in key generation and the read path." },
    { t: "h2", n: "02", id: "design", text: "High-level design", sub: "Two paths that share almost nothing" },
    { t: "viz",
      title: "Write path and read path",
      caption: "Writes go through the API, which leases blocks of IDs from a key allocator, encodes them in base62 and inserts the mapping. Reads hit the CDN, then the redirect service and its cache, and only misses reach the sharded link store. Clicks are published to a queue for analytics, so counting never adds latency to a redirect.",
      svg: `<svg viewBox="0 0 760 310" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="94.2" y1="128.0" x2="161.8" y2="82.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="102.0" y1="177.0" x2="148.0" y2="200.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="260.0" y1="56.0" x2="300.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="280.0" y="50.0" text-anchor="middle" class="s-sub">miss</text>
<line x1="260.0" y1="226.0" x2="300.0" y2="226.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="56.0" x2="470.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="578.9" y1="82.0" x2="641.1" y2="115.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="610.0" y="92.5" text-anchor="middle" class="s-sub">miss</text>
<line x1="430.0" y1="244.9" x2="470.0" y2="256.5" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="450.0" y="244.7" text-anchor="middle" class="s-sub">lease</text>
<line x1="430.0" y1="209.0" x2="630.0" y2="156.7" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="530.0" y="176.8" text-anchor="middle" class="s-sub">insert</text>
<line x1="365.0" y1="82.0" x2="365.0" y2="115.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="128" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="56.0" y="150" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Client</text>
<text x="56.0" y="168" text-anchor="middle" class="s-sub">browser, app</text>
<rect x="140" y="30" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="200.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--good)">CDN / edge</text>
<text x="200.0" y="70" text-anchor="middle" class="s-sub">cached redirects</text>
<rect x="140" y="200" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="200.0" y="222" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Load balancer</text>
<rect x="300" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="365.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Redirect service</text>
<text x="365.0" y="70" text-anchor="middle" class="s-sub">GET /{key}</text>
<rect x="300" y="115" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="365.0" y="137" text-anchor="middle" class="s-label" style="fill:var(--crit)">Click queue</text>
<text x="365.0" y="155" text-anchor="middle" class="s-sub">analytics</text>
<rect x="300" y="200" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="365.0" y="222" text-anchor="middle" class="s-label" style="fill:var(--accent)">Write API</text>
<text x="365.0" y="240" text-anchor="middle" class="s-sub">POST /links</text>
<rect x="470" y="30" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="530.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--good)">Cache</text>
<text x="530.0" y="70" text-anchor="middle" class="s-sub">key -&gt; long URL</text>
<rect x="470" y="248" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="530.0" y="270" text-anchor="middle" class="s-label" style="fill:var(--violet)">Key allocator</text>
<text x="530.0" y="288" text-anchor="middle" class="s-sub">ID ranges</text>
<rect x="630" y="115" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="690.0" y="137" text-anchor="middle" class="s-label" style="fill:var(--warn)">Link store</text>
<text x="690.0" y="155" text-anchor="middle" class="s-sub">sharded by key</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "POST /links → 201 {short_url}",
          def: "Validates the URL, takes a key from the node's leased block, inserts (key, long_url, created_at, owner). The key is the primary key, so the store shards on it evenly." },
        { term: "GET /{key} → 301 or 302",
          def: "Looks up the key in the cache, falling back to the store. Returns a redirect and publishes a click event asynchronously." },
        { term: "Link store",
          def: "A key-value or wide-column store keyed by the short key. Links are immutable, so replicas never serve stale data and caching needs no invalidation." }
      ] },
    { t: "h2",
      n: "03",
      id: "keys",
      text: "Deep dive: generating keys",
      sub: "Collisions, contention and guessability" },
    { t: "p",
      text: "Three strategies appear in every answer: hash the long URL and keep a few characters, take a counter and encode it in base62, or draw random characters and check for a clash. Seven base62 characters give 3.5 × 10¹² keys. The script measures what each strategy does." },
    { t: "code",
      lang: "python",
      title: "keygen.py — base62, hash keys and their collisions",
      code: `import hashlib, math, random, string

ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase      # 62 symbols
def base62(n):
    s = ""
    while True:
        n, r = divmod(n, 62); s = ALPHABET[r] + s
        if n == 0: return s

print("keyspace by length:", {k: f"{62 ** k:.1e}" for k in (6, 7, 8)})
print("counter 125 ->", base62(125), "| counter 3,500,000,000,000 ->", base62(3_500_000_000_000))

# Strategy 1: hash the long URL and keep k characters. Two ways to keep them.
def hash_prefix(url, k):                       # the first k characters of the base62 string
    return base62(int(hashlib.md5(url.encode()).hexdigest(), 16))[:k]
def hash_mod(url, k):                          # the hash reduced modulo 62^k, then encoded
    return base62(int(hashlib.md5(url.encode()).hexdigest(), 16) % 62 ** k).rjust(k, "0")

for k, n in ((4, 20_000), (5, 200_000)):
    expected = n - 62 ** k * (1 - math.exp(-n / 62 ** k))
    for name, f in (("prefix", hash_prefix), ("modulo", hash_mod)):
        seen, collisions = set(), 0
        for i in range(n):
            key = f(f"https://example.com/page/{i}", k); collisions += key in seen; seen.add(key)
        print(f"{name} {k} chars, {n:>7,} URLs: {collisions:>4} collisions measured, {expected:4.0f} expected")
first = {hash_prefix(f"https://example.com/page/{i}", 1) for i in range(20_000)}
print(f"distinct first characters of the base62 hash: {len(first)} of 62")

# At production scale the same bound applies to 7 characters.
for n in (1e8, 1e9, 1e10):
    p_any = 1 - math.exp(-n * n / (2 * 62 ** 7))
    print(f"7-char hash keys after {n:.0e} URLs: expected colliding pairs {n * n / (2 * 62 ** 7):,.0f}; P(at least one) {p_any:.3f}")

# Strategy 2: a counter is collision-free but sequential, so keys are guessable.
rng = random.Random(1)
print("\\ncounter keys are enumerable:", [base62(1_000_000 + i) for i in range(3)])
print("random 7-char keys are not:  ", ["".join(rng.choice(ALPHABET) for _ in range(7)) for _ in range(3)])`,
      out: `keyspace by length: {6: '5.7e+10', 7: '3.5e+12', 8: '2.2e+14'}
counter 125 -> 21 | counter 3,500,000,000,000 -> ZCpdjxe
prefix 4 chars,  20,000 URLs:   83 collisions measured,   14 expected
modulo 4 chars,  20,000 URLs:   11 collisions measured,   14 expected
prefix 5 chars, 200,000 URLs:  178 collisions measured,   22 expected
modulo 5 chars, 200,000 URLs:   28 collisions measured,   22 expected
distinct first characters of the base62 hash: 61 of 62
7-char hash keys after 1e+08 URLs: expected colliding pairs 1,420; P(at least one) 1.000
7-char hash keys after 1e+09 URLs: expected colliding pairs 141,980; P(at least one) 1.000
7-char hash keys after 1e+10 URLs: expected colliding pairs 14,198,033; P(at least one) 1.000

counter keys are enumerable: ['4c92', '4c93', '4c94']
random 7-char keys are not:   ['8ASPM4g', '7vMsuFo', 'Od6v1VR']` },
    { t: "callout",
      kind: "trap",
      title: "Truncating a hash is worse than the birthday bound",
      body: [
        { t: "p",
          text: "Taking the first characters of a base62-encoded hash collided six to eight times more often than probability predicts: 83 against 14 expected. A large number's leading base62 digit is not uniform, so the prefix concentrates keys. Reducing the hash modulo 62⁷ restores the expected rate. Even then, by a billion links you expect about 140,000 colliding pairs, and every write must check for one. Hash keys do give the same short URL for the same long URL, which is sometimes the reason to accept that cost." }
      ] },
    { t: "p",
      text: "A counter never collides, but a single counter is a point of contention, and sequential keys let anyone enumerate every link. The standard answer combines them: a strongly consistent allocator hands out blocks of IDs, each node issues keys from its own block without coordination, and keys are optionally shuffled with a reversible permutation so they do not look sequential. The exercise builds it." },
    { t: "h2", n: "04", id: "reads", text: "Deep dive: the read path", sub: "How much a cache really absorbs" },
    { t: "p",
      text: "Redirect traffic is skewed: a small share of links gets most clicks. The simulation draws 600,000 redirects from a Zipf distribution over a million links and measures a warm LRU cache at several sizes." },
    { t: "code",
      lang: "python",
      title: "readpath.py — hit rate against cache size",
      code: `import random, itertools
from collections import OrderedDict

# Redirect traffic is heavily skewed: a few links get most clicks. Model link popularity as Zipf (s = 1).
N_LINKS, N_REQ = 1_000_000, 600_000
rng = random.Random(7)
weights = [1 / (i + 1) for i in range(N_LINKS)]
cum = list(itertools.accumulate(weights))
requests = rng.choices(range(N_LINKS), cum_weights=cum, k=N_REQ)

def lru_hit_rate(capacity):
    cache, hits = OrderedDict(), 0
    for i, key in enumerate(requests):
        if key in cache:
            hits += i >= N_REQ // 2; cache.move_to_end(key)     # count only the second half: a warm cache
        else:
            cache[key] = True
            if len(cache) > capacity: cache.popitem(last=False)
    return hits / (N_REQ - N_REQ // 2)

print("cache size (share of all links)   hit rate   reads reaching the database per 100k/s")
for share in (0.001, 0.005, 0.01, 0.05, 0.10):
    h = lru_hit_rate(int(N_LINKS * share))
    print(f"{share:>27.1%}   {h:8.1%}   {100_000 * (1 - h):>12,.0f}/s")`,
      out: `cache size (share of all links)   hit rate   reads reaching the database per 100k/s
                       0.1%      40.3%         59,719/s
                       0.5%      53.1%         46,947/s
                       1.0%      58.6%         41,431/s
                       5.0%      71.9%         28,106/s
                      10.0%      77.9%         22,097/s` },
    { t: "viz",
      title: "Hit rate against cache size",
      caption: "Caching 1% of links absorbed 59% of redirects, and 10% absorbed 78%. The curve flattens because a long tail of links is clicked once or twice and is never in cache when requested. That is less than the often-quoted 'cache 20%, hit 80%', and it is the measured number to size the database against. At 12,000 peak redirects a second, a 10% cache still sends about 2,600 a second to the store.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">25</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">50</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">75</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">0.1%</text>
<text x="200.5" y="242" text-anchor="middle" class="s-sub">0.5%</text>
<text x="337.0" y="242" text-anchor="middle" class="s-sub">1%</text>
<text x="473.5" y="242" text-anchor="middle" class="s-sub">5%</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">10%</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">cache size as a share of all links</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">warm hit rate (%)</text>
<polyline points="64.0,141.0 200.5,114.6 337.0,103.3 473.5,75.9 610.0,63.5" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="141.0" r="2" style="fill:var(--accent)"/>
<circle cx="200.5" cy="114.6" r="2" style="fill:var(--accent)"/>
<circle cx="337.0" cy="103.3" r="2" style="fill:var(--accent)"/>
<circle cx="473.5" cy="75.9" r="2" style="fill:var(--accent)"/>
<circle cx="610.0" cy="63.5" r="2" style="fill:var(--accent)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">LRU hit rate</text>
</svg>` },
    { t: "table",
      head: ["Decision", "Choice", "Because"],
      rows: [
        [
          "301 or 302",
          "302, or 301 with care",
          "301 is cached by browsers, so later clicks never reach you and analytics undercount; 302 keeps every click visible at the cost of more traffic"
        ],
        ["Cache invalidation", "None needed", "Links are immutable; a deleted link is a tombstone with a short TTL"],
        ["Analytics", "Asynchronous queue", "Counting must not add latency or a failure mode to the redirect"],
        [
          "Hot links",
          "CDN for the top links",
          "A viral link is a hot key; the edge absorbs it before the service sees it"
        ]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Immutability makes the read path easy",
      body: [
        { t: "p",
          text: "Because a key never changes its target, every layer can cache aggressively with no invalidation protocol, and replicas can never serve a stale answer. If the interviewer adds editing or expiry, say what it costs: a TTL on every cache layer, and a window in which old and new targets are both served." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A key allocator that never collides",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Build the range-leasing allocator: a shared counter hands out blocks of 1,000 IDs, eight shortener nodes issue base62 keys from their blocks, and a node can crash at any time. Show that no key is ever issued twice, count the round trips to the shared counter, and work out how long seven characters last." }
      ],
      requirements: [
        "A shared allocator that leases blocks atomically",
        "Nodes that issue keys from their block without coordination",
        "200,000 keys issued at random across nodes with no duplicates, all seven characters long",
        "A simulated crash that loses part of a block, and why that is safe",
        "The lifetime of the seven-character space at 1,000 and 10,000 links per second"
      ],
      hint: "Start the counter at 62⁶ so every encoded key has exactly seven characters. A crashed node's unused IDs are simply skipped; uniqueness never depends on them being used.",
      solution: { lang: "python",
        title: "range_allocator.py",
        code: `import random, threading

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
def base62(n):
    s = ""
    while True:
        n, r = divmod(n, 62); s = ALPHABET[r] + s
        if n == 0: return s

class RangeAllocator:
    """The only shared state: a counter handing out blocks of IDs. In production this is one row
    in a strongly consistent store (a database sequence, etcd or ZooKeeper) updated atomically."""
    def __init__(self, start, block): self.next, self.block, self.lock = start, block, threading.Lock()
    def lease(self):
        with self.lock:
            lo = self.next; self.next += self.block; return lo, lo + self.block

class ShortenerNode:
    def __init__(self, alloc): self.alloc, self.lo, self.hi = alloc, 0, 0
    def new_key(self):
        if self.lo >= self.hi: self.lo, self.hi = self.alloc.lease()   # one round trip per block, not per key
        k = self.lo; self.lo += 1
        return base62(k)

START = 62 ** 6                       # start at 62^6 so every key is exactly 7 characters
alloc = RangeAllocator(START, block=1_000)
nodes = [ShortenerNode(alloc) for _ in range(8)]
rng = random.Random(3)
keys = [rng.choice(nodes).new_key() for _ in range(200_000)]
print(f"keys issued {len(keys):,}, distinct {len(set(keys)):,}, lengths {sorted({len(k) for k in keys})}")
print(f"allocator round trips {(alloc.next - START) // 1_000} for {len(keys):,} keys")

# A node that crashes loses the unused part of its block: keys are skipped, never duplicated.
crashed = nodes[0]; wasted = crashed.hi - crashed.lo
nodes[0] = ShortenerNode(alloc)
print(f"node 0 crashed holding {wasted} unused IDs: skipped, not reused; no collision is possible")

# How long does the 7-character space last?
space = 62 ** 7 - START
for rate in (1_000, 10_000):
    print(f"at {rate:>6,} new links/s the 7-char space lasts {space / rate / 86_400 / 365:,.0f} years")`,
        out: `keys issued 200,000, distinct 200,000, lengths [7]
allocator round trips 204 for 200,000 keys
node 0 crashed holding 989 unused IDs: skipped, not reused; no collision is possible
at  1,000 new links/s the 7-char space lasts 110 years
at 10,000 new links/s the 7-char space lasts 11 years`,
        notes: [
          { t: "p",
            text: "200,000 keys, 200,000 distinct, all seven characters, from 204 round trips to the allocator: one per block of a thousand. The shared counter sees about 0.1% of the write rate, so a single strongly consistent row or a small etcd cluster is enough, and a blocked allocator only stops new links. Redirects, the critical path, never touch it." },
          { t: "p",
            text: "A crash wastes the rest of a block, here 989 IDs, and that is the whole cost: the IDs are skipped, never reissued, so collisions are impossible by construction. At 1,000 new links a second the seven-character space lasts about 110 years; at 10,000 it lasts 11, so the scale estimate decides whether to start with eight characters." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the shortener that redirected to the wrong page",
      body: [
        { t: "p",
          text: "**Symptom.** A marketing platform's short links began sending a small share of visitors to unrelated customers' pages. Support found two campaigns sharing the same short key." },
        { t: "p",
          text: "**Mechanism.** Keys were the first seven characters of a base62-encoded hash, and the insert used an upsert that overwrote an existing key instead of failing on a duplicate. Collisions were rare at launch and grew with the square of the link count. Each one silently re-pointed an older link to a newer target." },
        { t: "p",
          text: "**Fix.** Keys now come from leased ID ranges and cannot collide. The insert uses a conditional put that fails on an existing key, and an alert fires if one ever does. Existing links were audited against the write log, and the overwritten ones were restored." }
      ] }
  ],

  takeaways: [
    "The store is small (about **3 TB** for 6 billion links); the hard parts are **key generation** and the **read path**.",
    "Seven base62 characters give **3.5 × 10¹²** keys; eight give **2.2 × 10¹⁴**.",
    "Truncating a base62 hash collided **six to eight times** more than the birthday bound; reducing **modulo 62ᵏ** fixes the bias.",
    "Even unbiased, 7-character hash keys produce about **140,000** colliding pairs per billion links, so every write must check.",
    "Leased ID ranges never collide, cost one allocator round trip per **1,000** keys, and lose only unused IDs on a crash.",
    "Measured on Zipf traffic: caching **1%** of links absorbed **59%** of redirects and **10%** absorbed **78%**.",
    "Links are **immutable**, so caches need no invalidation and replicas are never stale.",
    "Use **302** to see every click, or **301** to offload repeat visits; keep analytics on an **asynchronous queue**.",
    "Never let an insert **overwrite** an existing key: use a conditional write and alert on conflicts."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Short keys are the first 7 characters of the base62-encoded MD5 of the long URL. What goes wrong as the service grows?",
        options: [
          "Nothing, because MD5 output is unique for every URL",
          "Collisions grow with the square of the link count",
          "Keys grow longer as more and more URLs are added",
          "MD5 is far too slow for the write rate we expect"
        ],
        answer: 1,
        why: "Truncation keeps only 62⁷ values, so collisions follow the birthday bound: about 140,000 pairs per billion links, more if the prefix is biased. MD5 is fast, and truncated keys stay seven characters." },
      { stem: "Why do shortener nodes lease blocks of IDs instead of asking a shared counter for every key?",
        options: [
          "Blocks make keys harder to guess",
          "One round trip per block, not per key",
          "Blocks guarantee keys are issued in order",
          "Leasing removes the need for a database"
        ],
        answer: 1,
        why: "A block of 1,000 IDs costs one allocator round trip, so the shared counter sees about 0.1% of the write rate and stops being a bottleneck. Blocks do not hide sequence, do not order keys globally, and the mapping still needs a store." },
      { stem: "Analytics must count every click. Which redirect status keeps every click visible to the service?",
        options: ["301, which is cached by the browser", "302 Found", "200 with a meta refresh", "404 followed by a retry"],
        answer: 1,
        why: "A 301 is permanent and browsers cache it, so repeat visits skip the service. A 302 is re-requested every time. A 200 with a meta refresh is slower and unreliable, and a 404 is not a redirect." },
      { stem: "In the Zipf simulation, roughly what share of redirects did a cache holding 1% of all links serve?",
        options: ["About 10%", "About 60%", "About 99%", "About 1%"],
        answer: 1,
        why: "Measured warm hit rate was 58.6%: skew makes a small cache absorb most traffic, but the long tail of rarely clicked links keeps it well below 99%. Hit rate is far above the 1% the cache size alone would suggest." }
    ] },

  interview: { title: "In an interview",
    sub: "This is the classic opener; expect the follow-ups to probe key generation and the read path.",
    questions: [
      { level: "core",
        q: "How would you generate the short keys?",
        strong: "A strong answer compares strategies by collisions, contention and guessability, and picks one with reasons.",
        answer: [
          { t: "p",
            text: "I would use a counter-based scheme without a single hot counter: a strongly consistent allocator leases blocks of IDs to each node, nodes encode their IDs in base62, and keys start at 62⁶ so they are always seven characters. That never collides, costs one coordination round trip per thousand keys, and a crash only wastes the unused part of a block." },
          { t: "p",
            text: "If keys must not be guessable, I apply a reversible permutation, for example a small Feistel network over the ID space, before encoding. Hash-based keys are the alternative when the same long URL must always give the same short one, but then every insert must check for collisions, which grow with the square of the link count." }
        ] },
      { level: "core",
        q: "How do you make redirects fast at 10× today's traffic?",
        strong: "A strong answer uses immutability, a sized cache, the CDN for hot links and an async analytics path.",
        answer: [
          { t: "p",
            text: "Links are immutable, so every layer can cache without invalidation. A CDN serves the hottest links at the edge, an in-memory cache in front of the store absorbs most of the rest (in a Zipf simulation 1% of links served about 60% of redirects), and the store shards by key so misses spread evenly. Click counting goes to a queue, so analytics can never slow a redirect or take it down. Sizing comes from the measured hit-rate curve, not from a rule of thumb." }
        ] },
      { level: "advanced",
        q: "The product now wants custom aliases and link expiry. What changes?",
        strong: "A strong answer identifies the new uniqueness check, the namespace collision with generated keys, and the cache consequences of expiry.",
        answer: [
          { t: "p",
            text: "Custom aliases need a uniqueness check on insert, so the write becomes a conditional put on the alias, and aliases must not collide with generated keys: either reserve a prefix or character class for them, or check both namespaces. Expiry ends immutability: every cache layer needs a TTL no longer than the remaining lifetime, a deleted link needs a tombstone so caches do not serve it, and 301s become dangerous because browsers keep them indefinitely. I would switch to 302 for links with an expiry." }
        ] }
    ] }
});

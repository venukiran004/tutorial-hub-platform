/* ============================================================================
   LESSON 3.3 — Invalidation, TTLs and Eviction
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "A cache holds copies, and every copy can become wrong. **Invalidation** decides how a copy learns it is wrong; **TTL** bounds how long it can stay wrong if invalidation fails; **eviction** decides what to throw out when memory is full. The part that makes invalidation one of the famous hard problems is a race: even with delete-on-write, a slow reader can put an old value back **after** the delete. The fixes are not cleverness; they are a short TTL that bounds the damage and a mechanism that lets the cache refuse a stale fill.",

  objectives: [
    "Trace the cache-aside race that leaves a stale value after delete-on-write",
    "Prevent the stale fill with leases, and bound what remains with a TTL",
    "Choose a TTL from a staleness budget and a hit-ratio cost",
    "Invalidate many derived keys at once with a generation number",
    "Compare LRU, LFU-style admission, FIFO and random eviction, including under a scan"
  ],

  prerequisites: ["3.2"],

  blocks: [

    { t: "h2", n: "01", id: "race", text: "The race that survives delete-on-write",
      sub: "A reader fills the cache with what it read before the write" },

    { t: "p", text: "Delete-on-write (3.2) fixes concurrent writers. It does not fix a reader that missed, read the database, and was then paused — by a garbage-collection pause, a slow network, a busy event loop — while a writer updated the row and deleted the key:" },

    { t: "viz", title: "The stale fill",
      caption: "Every step is correct on its own. The reader's SET arrives after the writer's DELETE, so the cache now holds a value the database no longer has — and nothing will remove it until the TTL expires. This is rare per request and certain at scale.",
      svg: `<svg viewBox="0 0 760 348.0" width="100%" role="img"><defs><marker id="q133569accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q133569good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q133569warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q133569crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q133569violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q133569teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q133569line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="24.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="80.0" y="32" text-anchor="middle" class="s-label">Reader</text>
<rect x="224.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="280.0" y="32" text-anchor="middle" class="s-label">Cache</text>
<rect x="424.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="480.0" y="32" text-anchor="middle" class="s-label">Database</text>
<rect x="624.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="680.0" y="32" text-anchor="middle" class="s-label">Writer</text>
<line x1="80.0" y1="42" x2="80.0" y2="336.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="280.0" y1="42" x2="280.0" y2="336.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="480.0" y1="42" x2="480.0" y2="336.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="680.0" y1="42" x2="680.0" y2="336.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="80.0" y1="60" x2="276.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q133569accent)"/>
<text x="180.0" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">get price:7</text>
<line x1="280.0" y1="92" x2="84.0" y2="92" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q133569accent)"/>
<text x="180.0" y="86" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(miss)</text>
<line x1="80.0" y1="124" x2="476.0" y2="124" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q133569warn)"/>
<text x="280.0" y="118" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT price</text>
<line x1="480.0" y1="156" x2="84.0" y2="156" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q133569warn)"/>
<text x="280.0" y="150" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(10.00)</text>
<rect x="-5.5" y="176" width="171.0" height="20" rx="5" style="fill:var(--violet);fill-opacity:.16;stroke:var(--violet)"/>
<text x="80.0" y="190" text-anchor="middle" class="s-sub" style="fill:var(--ink)">paused: GC / slow network</text>
<line x1="680.0" y1="220" x2="484.0" y2="220" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q133569good)"/>
<text x="580.0" y="214" text-anchor="middle" class="s-sub" style="fill:var(--good)">UPDATE price = 12.00</text>
<line x1="680.0" y1="252" x2="284.0" y2="252" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q133569good)"/>
<text x="480.0" y="246" text-anchor="middle" class="s-sub" style="fill:var(--good)">DELETE price:7</text>
<line x1="80.0" y1="284" x2="276.0" y2="284" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#q133569crit)"/>
<text x="180.0" y="278" text-anchor="middle" class="s-sub" style="fill:var(--crit)">SET price:7 = 10.00</text>
<rect x="206.89999999999998" y="304" width="146.20000000000002" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="280.0" y="318" text-anchor="middle" class="s-sub" style="fill:var(--ink)">holds 10.00 until TTL</text></svg>` },

    { t: "p", text: "Facebook's memcache paper describes the fix it deployed at scale: **leases**. A miss hands the reader a token; a delete revokes any outstanding token for that key; a set without a valid token is refused. The cache itself detects that the reader's value is older than the last invalidation:" },

    { t: "code", lang: "python", title: "race.py — the same interleaving, with and without leases", code: `import itertools

class Cache:
    """A cache with optional leases, after Facebook's memcache: a miss hands out a
    lease token; a delete revokes it; a set must present a token that is still valid."""
    def __init__(self, leases: bool):
        self.data, self.leases, self.use_leases = {}, {}, leases
        self.tokens = itertools.count(1)
    def get(self, k):
        if k in self.data: return self.data[k], None
        token = next(self.tokens); self.leases[k] = token
        return None, token
    def set(self, k, v, token):
        if self.use_leases and self.leases.get(k) != token:
            return False                       # lease revoked by a delete: refuse the stale fill
        self.data[k] = v; self.leases.pop(k, None); return True
    def delete(self, k):
        self.data.pop(k, None); self.leases.pop(k, None)   # also revokes any outstanding lease

def interleave(leases: bool):
    db, cache, log = {"price:7": 10.0}, Cache(leases), []
    _, token = cache.get("price:7");            log.append("R  get -> miss (lease %s)" % token)
    v = db["price:7"];                          log.append("R  reads DB -> %.1f, then pauses" % v)
    db["price:7"] = 12.0;                       log.append("W  UPDATE DB -> 12.0")
    cache.delete("price:7");                    log.append("W  DELETE key (revokes lease)")
    ok = cache.set("price:7", v, token);        log.append("R  SET %.1f -> %s" % (v, "stored" if ok else "REFUSED"))
    final = cache.data.get("price:7")
    return log, db["price:7"], final

for leases in (False, True):
    log, d, c = interleave(leases)
    print("with leases" if leases else "plain cache-aside")
    for line in log: print("   " + line)
    print("   result: DB = %.1f, cache = %s\\n" % (d, "%.1f  <- stale until TTL" % c if c is not None
                                                      else "empty, next read loads 12.0"))`,
      out: `plain cache-aside
   R  get -> miss (lease 1)
   R  reads DB -> 10.0, then pauses
   W  UPDATE DB -> 12.0
   W  DELETE key (revokes lease)
   R  SET 10.0 -> stored
   result: DB = 12.0, cache = 10.0  <- stale until TTL

with leases
   R  get -> miss (lease 1)
   R  reads DB -> 10.0, then pauses
   W  UPDATE DB -> 12.0
   W  DELETE key (revokes lease)
   R  SET 10.0 -> REFUSED
   result: DB = 12.0, cache = empty, next read loads 12.0`,
      hl: [11, 14, 15, 18],
      caption: "The lease costs one token per miss and no extra database read. The refused SET leaves the key empty, so the next reader loads the current value. Leases also give the cache a natural place to make concurrent missers wait for one loader, which is the stampede fix of 3.4." },

    { t: "callout", kind: "insight", title: "Every invalidation scheme still needs a TTL",
      body: [
        { t: "p", text: "Leases close this race; others remain — a delete message lost in a network partition, a code path that writes the database and forgets to invalidate, a bug in the invalidation consumer. A TTL is the backstop for all of them: whatever goes wrong, no wrong value survives longer than the TTL. **A cache entry without a TTL is a promise that your invalidation is perfect forever.**" }
      ] },

    { t: "h2", n: "02", id: "ttl", text: "Choosing a TTL",
      sub: "A staleness budget on one side, the hit ratio on the other" },

    { t: "diagram", kind: "compare", title: "What a TTL trades",
      caption: "The TTL is the worst-case staleness when invalidation fails, so it is set from the business's tolerance first and the hit ratio second. Where tolerance is near zero, the answer is explicit invalidation plus a short TTL — or no cache.",
      columns: [
        { title: "Short TTL (seconds)", tone: "good", items: [
          "bounds staleness tightly",
          "more misses: every key reloads often",
          "more load on the source",
          "for prices, availability, permissions"
        ] },
        { title: "Long TTL (hours)", tone: "warn", items: [
          "high hit ratio, low source load",
          "wrong data lingers if invalidation fails",
          "synchronised expiry risks a stampede (3.4)",
          "for catalogue text, images, config"
        ] }
      ] },

    { t: "table",
      head: ["Data", "Staleness the business tolerates", "Invalidation", "TTL"],
      rows: [
        ["Product description, images", "Hours", "On edit", "1–24 h"],
        ["Price on a product page", "Under a minute", "On edit", "30–60 s"],
        ["User permissions", "Seconds — a revoked user must lose access", "On change, mandatory", "≤ 60 s"],
        ["Stock count shown on a listing", "A minute, if checkout re-checks the source", "On change", "10–60 s"],
        ["Feature flags", "A minute", "On change", "30 s in-process"]
      ],
      caption: "Add a small random jitter — ±10% — to every TTL so keys written together do not all expire together (3.4)." },

    { t: "h2", n: "03", id: "derived", text: "Invalidating what you cannot list",
      sub: "Pages, lists and aggregates derived from many rows" },

    { t: "p", text: "Deleting one key per row is easy. A category page is harder: it depends on every product in the category, and it is cached once per sort order, page number and filter combination. When one product's price changes, which keys must go? You cannot enumerate them cheaply — Redis `KEYS` and `SCAN` across millions of keys are far too slow to run on every write." },

    { t: "diagram", kind: "flow", title: "Generation-numbered keys",
      caption: "Every derived key includes the category's current generation. A write bumps the generation with one atomic INCR; every page built under the old generation becomes unreachable at once and simply expires by TTL. No enumeration, no mass delete.",
      cols: 4,
      nodes: [
        { id: "w", label: "Price of P1 changes", sub: "P1 is in category 1", tone: "warn" },
        { id: "g", label: "INCR cat:1:gen", sub: "1 → 2", tone: "accent" },
        { id: "o", label: "cat:1:g1:price:p0 …", sub: "old pages: unreachable", tone: "crit" },
        { id: "n", label: "cat:1:g2:price:p0", sub: "built on next read", tone: "good" }
      ],
      edges: [["w", "g", "one write"], ["g", "o", "orphaned"], ["o", "n", "replaced by"]] },

    { t: "h2", n: "04", id: "eviction", text: "Eviction: what to drop when memory is full",
      sub: "Recency, frequency, or a guess" },

    { t: "p", text: "When the cache is full, a new entry must displace an old one. Four policies on a skewed workload with the cache at 2% of the keys — and the hit ratio of hot traffic immediately after a batch job reads 5,000 cold keys once each:" },

    { t: "code", lang: "python", title: "eviction.py — four policies, steady state and after a scan", code: `import bisect, itertools, random
from collections import OrderedDict, Counter

KEYS, CAP = 50_000, 1_000
rng = random.Random(12)
cum = list(itertools.accumulate(1 / k for k in range(1, KEYS + 1)))
hot = lambda: bisect.bisect(cum, rng.random() * cum[-1])

SCAN_AT, SCAN_LEN, AFTER = 150_000, 5_000, 3_000
def workload(with_scan):
    out = [hot() for _ in range(300_000)]
    if with_scan:                                  # a batch job reads 5,000 cold keys once each
        out[SCAN_AT:SCAN_AT] = [KEYS + 1 + j for j in range(SCAN_LEN)]
    return out

def lru(stream):
    c, h = OrderedDict(), []
    for k in stream:
        h.append(k in c)
        if k in c: c.move_to_end(k)
        else:
            c[k] = 1
            if len(c) > CAP: c.popitem(last=False)
    return h

def fifo(stream):
    c, order, h = set(), [], []
    for k in stream:
        h.append(k in c)
        if k not in c:
            c.add(k); order.append(k)
            if len(c) > CAP: c.discard(order.pop(0))
    return h

def rand(stream):
    c, h = [], []; idx = {}
    for k in stream:
        h.append(k in idx)
        if k not in idx:
            if len(c) >= CAP:
                j = rng.randrange(CAP); del idx[c[j]]; c[j] = k; idx[k] = j
            else:
                idx[k] = len(c); c.append(k)
    return h

def tinylfu(stream):
    """LRU guarded by a frequency filter: a newcomer evicts the LRU victim only if
    it has been seen more often (W-TinyLFU's admission idea, without the window)."""
    c, freq, h = OrderedDict(), Counter(), []
    for n, k in enumerate(stream, 1):
        freq[k] += 1
        if n % 200_000 == 0:                     # age the counts so old popularity fades
            for key in list(freq): freq[key] //= 2
        h.append(k in c)
        if k in c: c.move_to_end(k); continue
        if len(c) < CAP: c[k] = 1; continue
        victim = next(iter(c))
        if freq[k] > freq[victim]:
            c.popitem(last=False); c[k] = 1
    return h

steady, scanned = workload(False), workload(True)
start = SCAN_AT + SCAN_LEN                         # the hot requests right after the scan
print("%-27s %14s %24s" % ("policy (cache = 2% of keys)", "overall", "next 3,000 after a scan"))
for name, f in (("FIFO", fifo), ("random", rand), ("LRU", lru), ("LRU + frequency admission", tinylfu)):
    a, b = f(steady), f(scanned)
    print("%-27s %13.1f%% %23.1f%%" % (name, 100 * sum(a) / len(a), 100 * sum(b[start:start + AFTER]) / AFTER))`,
      out: `policy (cache = 2% of keys)        overall  next 3,000 after a scan
FIFO                                 50.3%                    45.5%
random                               50.4%                    42.7%
LRU                                  54.6%                    47.6%
LRU + frequency admission            64.4%                    62.7%`,
      caption: "LRU beats FIFO and random because recency predicts popularity. **Frequency-aware admission** — only let a newcomer in if it has been seen more often than the entry it would evict — does better still, and barely notices the scan, because one-off keys never earn admission. LRU admits every scanned key and evicts the hot set to make room." },

    { t: "diagram", kind: "matrix", title: "Eviction policies at a glance",
      caption: "Redis offers LRU and LFU approximations per instance (maxmemory-policy allkeys-lru / allkeys-lfu); Caffeine, the standard Java cache, uses W-TinyLFU, the production form of frequency-aware admission.",
      cols: ["Keeps", "Scan-resistant", "Cost", "Where"],
      rows: ["FIFO", "Random", "LRU", "LFU", "W-TinyLFU"],
      cells: [
        [{ text: "newest inserted" }, { text: "no", tone: "crit" }, { text: "trivial", tone: "good" }, { text: "simple buffers" }],
        [{ text: "whatever survives" }, { text: "no", tone: "crit" }, { text: "trivial", tone: "good" }, { text: "Redis allkeys-random" }],
        [{ text: "recently used" }, { text: "no", tone: "crit" }, { text: "a linked list", tone: "good" }, { text: "the usual default", tone: "accent" }],
        [{ text: "often used" }, { text: "yes", tone: "good" }, { text: "slow to adapt", tone: "warn" }, { text: "Redis allkeys-lfu" }],
        [{ text: "recent and frequent" }, { text: "yes", tone: "good" }, { text: "a sketch of counts", tone: "good" }, { text: "Caffeine, Ristretto", tone: "good" }]
      ] },

    { t: "callout", kind: "trap", title: "\"Cache with no eviction\" and the out-of-memory night",
      body: [
        { t: "p", text: "Redis's default `maxmemory-policy` is `noeviction`: when memory is full, writes fail with an error. A team that sets no `maxmemory` at all lets Redis grow until the operating system kills it — and then every key is gone at once, which is the cold-cache stampede of 3.4 triggered by a slow leak of keys without TTLs." },
        { t: "p", text: "A cache configuration states three things explicitly: `maxmemory` below the machine's RAM with headroom for fragmentation and forks, an eviction policy that matches the workload (`allkeys-lru` or `allkeys-lfu`), and a TTL on every key the application writes. Alert on evictions per second: a rising rate means the working set has outgrown the cache." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Invalidate every cached page of a category with one write",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Category listing pages are cached for each sort order and page number. When any product in a category changes, every cached page for that category must stop being served — without listing or deleting keys." }
      ],
      requirements: [
        "Build listing keys that include a per-category generation number",
        "Cache several pages and sort orders for one category",
        "On a price update, invalidate them all with a single write",
        "Show that the next read reflects the new price",
        "Explain what happens to the orphaned keys"
      ],
      hint: "Store `cat:{id}:gen` as an integer and put it in every listing key. Incrementing it changes every key the readers will look for.",
      solution: { lang: "python", title: "generation_ex.py",
        code: `cache: dict[str, object] = {}                  # stands in for Redis (with TTLs in real life)
products = {i: {"id": i, "cat": i % 3, "name": f"P{i}", "price": 10 + i} for i in range(1, 31)}
db_queries = 0

def gen(cat):                                  # the category's generation number
    return cache.setdefault(f"cat:{cat}:gen", 1)

def listing(cat, sort, page):
    """Many cached pages per category: every sort order and page number."""
    global db_queries
    key = f"cat:{cat}:g{gen(cat)}:{sort}:p{page}"
    if key in cache: return cache[key]
    db_queries += 1
    rows = sorted((p for p in products.values() if p["cat"] == cat), key=lambda p: p[sort])
    cache[key] = [p["name"] + "@" + str(p["price"]) for p in rows[page * 4:(page + 1) * 4]]
    return cache[key]

def update_price(pid, price):
    products[pid]["price"] = price
    cache[f"cat:{products[pid]['cat']}:gen"] = gen(products[pid]["cat"]) + 1   # one INCR

for sort in ("price", "name"):
    for page in (0, 1, 2):
        listing(1, sort, page)
print("cached pages for category 1 :", sum(1 for k in cache if k.startswith("cat:1:g1:")))
print("cheapest in cat 1 before    :", listing(1, "price", 0)[0])
update_price(1, 1)                          # product 1 is in category 1
print("cheapest in cat 1 after     :", listing(1, "price", 0)[0])
print("keys deleted to invalidate  : 0  (one generation bump; g1 pages are now unreachable)")
print("database queries so far     :", db_queries)`,
        out: `cached pages for category 1 : 6
cheapest in cat 1 before    : P1@11
cheapest in cat 1 after     : P1@1
keys deleted to invalidate  : 0  (one generation bump; g1 pages are now unreachable)
database queries so far     : 7`,
        notes: [
          { t: "p", text: "One `INCR` invalidated six pages here and would invalidate six thousand the same way — the cost of invalidation no longer depends on how many derived keys exist. In Redis the generation read can be pipelined with the page read, so the extra lookup costs almost nothing." },
          { t: "p", text: "The orphaned `g1` pages are never read again and are removed by their TTL or by eviction, which is why every key needs one: generation-numbering trades a little wasted memory for not having to find the keys. Choose the TTL short enough that orphans do not crowd out live data." },
          { t: "p", text: "The trade is coarseness: any change in the category invalidates every page, including pages the changed product does not appear on. For a category edited a few times an hour that is fine; for one updated every second, the generation would change faster than pages could be reused, and a finer scheme — or a shorter TTL with no invalidation — fits better." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a revoked employee kept access for a day",
      body: [
        { t: "p", text: "**Symptom.** A contractor's account was disabled on their last day, but audit logs showed them reading customer records the following afternoon. The identity system showed the account disabled; the application kept allowing them in." },
        { t: "p", text: "**Mechanism.** Each service cached a user's permission set for 24 hours to avoid calling the identity service on every request, and relied on a \"user changed\" event to invalidate it. The event consumer in one service had been failing silently for weeks after a schema change, so no invalidations arrived, and the 24-hour TTL was the only thing bounding staleness — exactly the backstop role of section 01, set to a value nobody had thought about as a security window." },
        { t: "p", text: "**Fix.** Permission TTLs cut to 60 seconds, with the identity service scaled for the extra reads; revocations made synchronous for the specific case of disabling an account (a deny-list checked on every request, 12.2); and an alert on invalidation-consumer lag. **For security-relevant data, the TTL is the access-revocation window**, and it is chosen by the security team, not by whoever wrote the cache." }
      ] }
  ],

  takeaways: [
    "**Invalidation** tells a copy it is wrong; the **TTL** bounds how long it can stay wrong; **eviction** chooses what to drop when memory is full.",
    "Delete-on-write still has a race: a paused reader **sets an old value after the delete**, and it stays until the TTL.",
    "**Leases** close it: a miss gets a token, a delete revokes it, a set without a valid token is refused — no extra database read.",
    "**Every cached entry needs a TTL**: it is the backstop for every invalidation failure you have not thought of.",
    "Set the TTL from the **staleness the business tolerates** first and the hit ratio second; add ±10% jitter.",
    "Invalidate many derived keys with a **generation number in the key**: one INCR orphans them all, and TTLs clean up.",
    "Measured at 2% capacity: LRU beat FIFO and random; **frequency-aware admission** beat LRU and held its hit ratio after a scan.",
    "Redis's default is **noeviction**: set `maxmemory`, choose `allkeys-lru` or `allkeys-lfu`, and alert on evictions.",
    "For permissions, **the TTL is the revocation window** — a security decision, not a performance one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "With cache-aside and delete-on-write, how can the cache end up holding a value older than the database?",
        options: ["It cannot; delete-on-write prevents all staleness", "A reader that missed and read the old row sets it into the cache after the writer's delete", "Redis reorders commands", "The TTL was too short"],
        answer: 1,
        why: "The reader read the row before the update, was paused, and its SET landed after the writer's DELETE, so the old value is cached until the TTL — the race traced in section 01. Delete-on-write prevents concurrent writers from leaving old values, not this. Redis executes each client's commands in order, and a shorter TTL shortens the damage rather than causing it." },

      { stem: "What does a lease token let the cache do?",
        options: ["Expire keys faster", "Refuse a fill whose read happened before the most recent invalidation", "Encrypt cached values", "Store keys without memory limits"],
        answer: 1,
        why: "A miss issues a token, a delete revokes outstanding tokens, and a set must present a valid token — so a reader whose read predates the delete is refused, and the next reader loads the current row. Leases are unrelated to expiry speed, encryption or memory limits; they are an ordering check performed by the cache itself." },

      { stem: "Category pages are cached per sort order and page number. One product changes. What is the cheapest correct invalidation?",
        options: ["SCAN for all keys matching the category and delete them", "Increment a per-category generation number that every page key includes", "Flush the whole cache", "Wait for the TTL"],
        answer: 1,
        why: "Bumping the generation changes the key every reader looks for, so all old pages become unreachable with one atomic write, and their TTLs clean them up. SCAN across a large key space on every write is slow and racy, flushing the whole cache causes a stampede, and waiting for the TTL serves stale pages for its full length." },

      { stem: "Why does an LRU cache's hit ratio drop after a large batch job reads many keys once?",
        options: ["LRU expires keys after a scan", "Each one-off key becomes most-recently-used and pushes out the genuinely hot keys", "The job holds locks on the cache", "LRU only works for writes"],
        answer: 1,
        why: "LRU admits every key it sees, so thousands of single-use keys each become the most recent and evict the hot set; afterwards hot traffic misses until it re-warms. Frequency-aware admission refuses newcomers seen fewer times than the eviction victim, which is why it barely moved in the measurement. LRU has no notion of expiry or locks." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Cache invalidation is hard\" is a cliché; showing the race is not.",
    questions: [
      { level: "advanced",
        q: "How do you keep a cache consistent with the database?",
        strong: "A strong answer gives the write ordering, shows the remaining race, and names leases and TTLs.",
        answer: [
          { t: "p", text: "On write, update the database first and then delete the key, rather than setting it, so concurrent writers cannot leave an older value. That still leaves a race: a reader that missed and read the old row can set it back after the delete. Leases close it — a miss gets a token, a delete revokes it, a set without a valid token is refused — which is what Facebook deployed in memcache." },
          { t: "p", text: "Then a TTL on every key as the backstop for anything I have not thought of, chosen from how stale the business can tolerate. And for invalidation driven from elsewhere, I would drive deletes from the database's change stream (CDC) rather than from application code, so a code path that forgets to invalidate cannot exist." }
        ] },

      { level: "core",
        q: "How would you choose a TTL?",
        strong: "A strong answer starts from tolerated staleness and mentions jitter and security-relevant data.",
        answer: [
          { t: "p", text: "From the business's tolerance for staleness first, because the TTL is the worst case when invalidation fails: hours for descriptions and images, under a minute for prices, seconds for anything security-related like permissions. Then I check the hit-ratio cost — a shorter TTL means more reloads — and whether the source can take that load." },
          { t: "p", text: "I add random jitter of around 10% so keys written together do not expire together, and I treat permission TTLs as the access-revocation window, agreed with security." }
        ] },

      { level: "core",
        q: "LRU or LFU?",
        strong: "A strong answer explains what each assumes and the scan problem.",
        answer: [
          { t: "p", text: "LRU assumes what was used recently will be used again, adapts quickly to shifting popularity, and is the sensible default. Its weakness is scans: a job that reads many keys once flushes the hot set." },
          { t: "p", text: "LFU keeps what is used often and resists scans but is slow to forget items that used to be popular. The modern answer combines them — W-TinyLFU, as in Caffeine — LRU-like recency for the entries plus a frequency sketch that decides whether a newcomer deserves to evict anything. In Redis I would use allkeys-lfu for a stable hot set and allkeys-lru when popularity shifts quickly." }
        ] }
    ]
  }
});

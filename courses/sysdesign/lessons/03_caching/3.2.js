/* ============================================================================
   LESSON 3.2 — Cache-Aside, Read-Through, Write-Through, Write-Behind
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "Every caching strategy answers two questions: **who loads the cache on a read miss**, and **what happens to the cache on a write**. The four standard answers trade the same three things — write latency, staleness and durability — and no strategy wins all three. Cache-aside with delete-on-write is the default for good reason; write-behind is the fastest and the only one that **loses data when the cache dies**; and the write strategy people forget to choose, write-around with a TTL, is the one that serves stale data most.",

  objectives: [
    "Draw the sequence of calls for cache-aside, read-through, write-through and write-behind",
    "Compare the strategies on read latency, write latency, staleness and durability, measured",
    "Explain why deleting a cached value on write is safer than updating it",
    "Choose a strategy per kind of data from its read/write ratio and its tolerance for staleness and loss",
    "Implement a cache-aside repository with versioned keys and delete-on-write"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", id: "reads", text: "Reads: who loads the cache?",
      sub: "The application, or the cache itself" },

    { t: "viz", title: "Two read strategies",
      caption: "Cache-aside: the application checks the cache, reads the database on a miss, and writes the result back — three explicit steps in your code. Read-through: the application only ever talks to the cache, and a loader inside it fetches from the database on a miss. The calls are the same; what differs is whose code owns them.",
      svg: `<svg viewBox="0 0 760 246" width="100%" role="img"><defs><marker id="q250937accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q250937good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q250937warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q250937crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q250937violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q250937teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q250937line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Cache-aside: the app does the work</text>
<rect x="0.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="56.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Cache</text>
<rect x="258.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="314.0" y="54" text-anchor="middle" class="s-label">DB</text>
<line x1="56.0" y1="64" x2="56.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="314.0" y1="64" x2="314.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="56.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q250937accent)"/>
<text x="120.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">get(k)</text>
<line x1="185.0" y1="110" x2="60.0" y2="110" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q250937crit)"/>
<text x="120.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--crit)">(miss)</text>
<line x1="56.0" y1="138" x2="310.0" y2="138" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q250937warn)"/>
<text x="185.0" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT</text>
<line x1="314.0" y1="166" x2="60.0" y2="166" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q250937warn)"/>
<text x="185.0" y="160" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(row)</text>
<line x1="56.0" y1="194" x2="181.0" y2="194" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q250937accent)"/>
<text x="120.5" y="188" text-anchor="middle" class="s-sub" style="fill:var(--accent)">set(k, ttl)</text>
<text x="185.0" y="226" text-anchor="middle" class="s-sub" style="font-style:italic">write: update DB, then delete(k)</text><line x1="380.0" y1="10" x2="380.0" y2="236" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r61129accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r61129good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r61129warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r61129crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r61129violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r61129teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r61129line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Read-through: the cache loads itself</text>
<rect x="0.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="56.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Cache</text>
<rect x="258.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="314.0" y="54" text-anchor="middle" class="s-label">DB</text>
<line x1="56.0" y1="64" x2="56.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="314.0" y1="64" x2="314.0" y2="234.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="56.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r61129accent)"/>
<text x="120.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">get(k)</text>
<line x1="185.0" y1="110" x2="310.0" y2="110" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#r61129warn)"/>
<text x="249.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT on miss</text>
<line x1="314.0" y1="138" x2="189.0" y2="138" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r61129warn)"/>
<text x="249.5" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(row)</text>
<path d="M185.0 160 h26 v14 h-24" style="fill:none;stroke:var(--good)" stroke-width="1.5" marker-end="url(#r61129good)"/>
<text x="217.0" y="170" class="s-sub" style="fill:var(--good)">store</text>
<line x1="185.0" y1="194" x2="60.0" y2="194" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r61129accent)"/>
<text x="120.5" y="188" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(value)</text>
<text x="185.0" y="226" text-anchor="middle" class="s-sub" style="font-style:italic">the cache library owns loading</text></g></svg>` },

    { t: "dl", items: [
      ["Cache-aside (lazy loading)", "The most common strategy. Only data that is actually read gets cached, the cache can fail without the application failing (it just reads the database), and any data store works. The cost: the first read of every key is a miss, and the loading logic is repeated wherever the data is read — unless it is wrapped once in a repository (the exercise)."],
      ["Read-through", "The same flow moved inside a caching library or service — Caffeine and Guava loaders in Java, DAX in front of DynamoDB, a CDN in front of an origin. Cleaner call sites and a natural place to coalesce concurrent misses (3.4); the cache becomes a dependency the application cannot bypass."]
    ] },

    { t: "h2", n: "02", id: "writes", text: "Writes: what happens to the cache?",
      sub: "Update both, update the cache now and the database later, or update neither" },

    { t: "viz", title: "Two write strategies",
      caption: "Write-through writes the database before acknowledging, so the cache is never ahead of the database and never stale — at the cost of every write paying both. Write-behind acknowledges as soon as the cache has the value and writes the database later in batches; fast, but the cache now holds the only copy of recent writes.",
      svg: `<svg viewBox="0 0 760 218" width="100%" role="img"><defs><marker id="q725866accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q725866good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q725866warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q725866crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q725866violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q725866teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q725866line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Write-through: write both, then return</text>
<rect x="0.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="56.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Cache</text>
<rect x="258.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="314.0" y="54" text-anchor="middle" class="s-label">DB</text>
<line x1="56.0" y1="64" x2="56.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="314.0" y1="64" x2="314.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="56.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q725866accent)"/>
<text x="120.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">set(k, v)</text>
<line x1="185.0" y1="110" x2="310.0" y2="110" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q725866warn)"/>
<text x="249.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--warn)">UPDATE</text>
<line x1="314.0" y1="138" x2="189.0" y2="138" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q725866warn)"/>
<text x="249.5" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(ok)</text>
<line x1="185.0" y1="166" x2="60.0" y2="166" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q725866accent)"/>
<text x="120.5" y="160" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(ok)</text>
<text x="185.0" y="198" text-anchor="middle" class="s-sub" style="font-style:italic">write waits for both: cache never stale</text><line x1="380.0" y1="10" x2="380.0" y2="208" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r724822accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r724822good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r724822warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r724822crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r724822violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r724822teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r724822line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Write-behind: return now, write later</text>
<rect x="0.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="56.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Cache</text>
<rect x="258.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="314.0" y="54" text-anchor="middle" class="s-label">DB</text>
<line x1="56.0" y1="64" x2="56.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="314.0" y1="64" x2="314.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="56.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r724822accent)"/>
<text x="120.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">set(k, v)</text>
<line x1="185.0" y1="110" x2="60.0" y2="110" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r724822good)"/>
<text x="120.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--good)">(ok) at once</text>
<text x="185.0" y="142" text-anchor="middle" class="s-sub" style="font-style:italic">…later, batched…</text>
<line x1="185.0" y1="160" x2="310.0" y2="160" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#r724822crit)"/>
<text x="249.5" y="154" text-anchor="middle" class="s-sub" style="fill:var(--crit)">UPDATE ×N</text>
<rect x="99.5" y="176" width="171.0" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="185.0" y="190" text-anchor="middle" class="s-sub" style="fill:var(--ink)">crash before flush = lost</text></g></svg>` },

    { t: "p", text: "Fifty thousand operations, 20% writes, over 2,000 Zipf-distributed keys; a cache hit costs 1 ms and a database operation 10 ms. Each write strategy is paired with cache-aside reads, and the run ends with the cache crashing:" },

    { t: "code", lang: "python", title: "strategies.py — four write strategies on one workload", code: `import bisect, itertools, random

CACHE_MS, DB_MS = 1.0, 10.0
KEYS, OPS, WRITE_SHARE, TTL_OPS, FLUSH_EVERY = 2_000, 50_000, 0.2, 5_000, 200

rng = random.Random(6)
cum = list(itertools.accumulate(1 / k for k in range(1, KEYS + 1)))
ops = [("w" if rng.random() < WRITE_SHARE else "r", bisect.bisect(cum, rng.random() * cum[-1]))
       for _ in range(OPS)]

def run(strategy):
    db, cache, dirty = {}, {}, {}             # cache: key -> (value, expires_at_op)
    rl = wl = 0.0; reads = writes = stale = db_writes = 0
    for i, (op, k) in enumerate(ops):
        if op == "w":
            writes += 1; v = i                 # the new value: unique per write
            if strategy == "cache-aside":      # write DB, then delete the cached copy
                db[k] = v; db_writes += 1; cache.pop(k, None); wl += DB_MS + CACHE_MS
            elif strategy == "write-around":   # write DB only; cached copy left to expire
                db[k] = v; db_writes += 1; wl += DB_MS
            elif strategy == "write-through":  # write cache and DB before returning
                db[k] = v; db_writes += 1; cache[k] = (v, i + TTL_OPS); wl += CACHE_MS + DB_MS
            elif strategy == "write-behind":   # write cache, queue the DB write
                cache[k] = (v, i + TTL_OPS); dirty[k] = v; wl += CACHE_MS
        else:
            reads += 1
            hit = cache.get(k)
            if hit and hit[1] > i:
                val = hit[0]; rl += CACHE_MS
            else:
                val = dirty.get(k, db.get(k)); rl += CACHE_MS + DB_MS + CACHE_MS
                cache[k] = (val, i + TTL_OPS)
            truth = dirty.get(k, db.get(k))
            stale += val != truth
        if strategy == "write-behind" and i % FLUSH_EVERY == 0 and dirty:
            db.update(dirty); db_writes += len(dirty); dirty.clear()   # coalesced batch
    return rl / reads, wl / writes, db_writes, stale, len(dirty)

print("%-14s %10s %10s %10s %12s %16s" % ("strategy", "read ms", "write ms", "DB writes", "stale reads", "lost on crash"))
for s in ("cache-aside", "write-around", "write-through", "write-behind"):
    r, w, dbw, st, lost = run(s)
    print("%-14s %10.2f %10.2f %10s %12s %16s" % (s, r, w, "{:,}".format(dbw), "{:,}".format(st), lost))`,
      out: `strategy          read ms   write ms  DB writes  stale reads    lost on crash
cache-aside          4.57      11.00      9,914            0                0
write-around         3.24      10.00      9,914       22,403                0
write-through        2.73      11.00      9,914            0                0
write-behind         2.73       1.00      7,677            0               33`,
      hl: [18, 20, 22, 24, 36],
      caption: "**Write-around** — write the database and leave the cached copy to expire — served over half its reads stale, because hot keys are written often and the old value survives until its TTL. **Write-through** has the fastest reads, since every write leaves the cache warm. **Write-behind** is ten times faster to write and coalesced repeated writes into fewer database writes — and lost the 33 writes still waiting when the cache crashed." },

    { t: "diagram", kind: "matrix", title: "The four write strategies on the axes that decide",
      caption: "No column is all green. Cache-aside with delete is the safe default; write-through suits read-after-write data; write-behind only data you can afford to lose; write-around only data whose staleness the TTL bounds acceptably.",
      cols: ["Write latency", "Staleness", "Loss if cache dies", "Cache pollution"],
      rows: ["Cache-aside + delete", "Write-around + TTL", "Write-through", "Write-behind"],
      cells: [
        [{ text: "DB + delete", tone: "warn" }, { text: "tiny race only (3.3)", tone: "good" }, { text: "none", tone: "good" }, { text: "only what is read", tone: "good" }],
        [{ text: "DB only", tone: "warn" }, { text: "up to the TTL", tone: "crit" }, { text: "none", tone: "good" }, { text: "only what is read", tone: "good" }],
        [{ text: "cache + DB", tone: "warn" }, { text: "none", tone: "good" }, { text: "none", tone: "good" }, { text: "every write cached", tone: "warn" }],
        [{ text: "cache only", tone: "good" }, { text: "none from cache", tone: "good" }, { text: "unflushed writes", tone: "crit" }, { text: "every write cached", tone: "warn" }]
      ] },

    { t: "callout", kind: "trap", title: "Updating the cache on write instead of deleting it",
      body: [
        { t: "p", text: "It seems more efficient to write the new value into the cache rather than delete the key and pay a miss. Under concurrency it is wrong. Two requests update the same product: A writes price 10 to the database, B writes price 12, then B sets the cache to 12, then A — delayed by a garbage-collection pause — sets the cache to 10. The database says 12, the cache says 10, and it stays that way **until the TTL expires**, with nothing to correct it." },
        { t: "p", text: "Deleting is idempotent and order-independent: whichever request deletes last, the key is gone and the next read loads the current database value. The cost is one extra miss after each write, which is nearly always worth it. (There is still a smaller race with delete-on-write; 3.3 shows it and how a short TTL and versioned writes bound it.)" }
      ] },

    { t: "h2", n: "03", id: "choosing", text: "Choosing per kind of data",
      sub: "Strategies are chosen per key space, not per system" },

    { t: "table",
      head: ["Data", "Pattern", "Strategy", "Why"],
      rows: [
        ["Product pages, profiles", "Read-heavy, edits rare", "Cache-aside + delete, TTL minutes", "Simple, survives cache loss, staleness only during a race"],
        ["A user's own settings", "Read straight after write", "Write-through", "The user must see their change on the next page"],
        ["View counts, likes", "Write-heavy, approximate", "Write-behind (INCR, flush)", "Coalesces thousands of writes; losing a few seconds is fine"],
        ["Stock at checkout, balances", "Must be current", "No cache, or read the source", "A stale answer here costs money (1.2)"],
        ["Sessions, rate-limit counters", "The cache is the store", "Write to Redis only", "Redis is the source of truth, with persistence if needed"]
      ],
      caption: "A real system uses several of these at once. The design question is which category each key space falls into, decided with the product owner, because \"how stale may this be\" is a product question." },

    { t: "callout", kind: "insight", title: "Write-behind is a database in disguise",
      body: [
        { t: "p", text: "Once the cache acknowledges writes before the database has them, the cache **is** the database for those writes — so it needs what databases have: persistence to disk (Redis AOF), replication so one node's death does not lose the queue, and a flush that is retried and monitored. Systems that do this well (counters, analytics, game state) treat the loss window as an explicit, measured number, not an accident." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A cache-aside repository",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Product reads are scattered across a codebase, each doing its own cache check. Wrap the pattern once: a `ProductRepo` whose `get` implements cache-aside and whose `update_price` keeps the cache correct." }
      ],
      requirements: [
        "`get(pid)` checks the cache, reads the store on a miss, and caches the result with a TTL",
        "`update_price` writes the store first and then deletes the cached key",
        "Cache keys carry a version so a change to the cached shape cannot read old entries",
        "A read immediately after an update returns the new price",
        "Report hits, misses and the hit ratio"
      ],
      hint: "Order matters on the write: if you delete first and a read slips in before the store is updated, it caches the old value again.",
      solution: { lang: "python", title: "repo_ex.py",
        code: `import time

class FakeRedis:
    """Enough of Redis for the exercise: get, set with expiry, delete."""
    def __init__(self): self.d = {}
    def get(self, k):
        v = self.d.get(k)
        if v and v[1] > time.monotonic(): return v[0]
        self.d.pop(k, None); return None
    def set(self, k, v, ex): self.d[k] = (v, time.monotonic() + ex)
    def delete(self, k): self.d.pop(k, None)

class ProductRepo:
    """Cache-aside over a slow store, with delete-on-write and per-key TTL."""
    TTL_S = 300
    def __init__(self, db: dict, cache: FakeRedis):
        self.db, self.cache = db, cache
        self.hits = self.misses = 0
    def _key(self, pid): return f"product:v1:{pid}"         # versioned: change schema -> new keys
    def get(self, pid):
        if (v := self.cache.get(self._key(pid))) is not None:
            self.hits += 1; return v
        self.misses += 1
        v = self.db.get(pid)                                   # the slow read
        if v is not None:
            self.cache.set(self._key(pid), v, ex=self.TTL_S)
        return v
    def update_price(self, pid, price):
        row = dict(self.db[pid], price=price)
        self.db[pid] = row                                     # 1. the source of truth first
        self.cache.delete(self._key(pid))                      # 2. then drop the copy

db = {p: {"id": p, "name": f"Product {p}", "price": 10.0 + p} for p in range(1, 101)}
repo = ProductRepo(db, FakeRedis())
for _ in range(20):
    for p in (1, 2, 3, 1, 1, 7):
        repo.get(p)
print("before update:", repo.get(7)["price"])
repo.update_price(7, 99.0)
print("after update :", repo.get(7)["price"], "(read straight after the write)")
print("hits %d, misses %d, hit ratio %.0f%%" % (repo.hits, repo.misses, 100 * repo.hits / (repo.hits + repo.misses)))`,
        out: `before update: 17.0
after update : 99.0 (read straight after the write)
hits 117, misses 5, hit ratio 96%`,
        notes: [
          { t: "p", text: "Write the source of truth **first**, then delete. In the other order, a concurrent read between the delete and the database write misses, reads the old row, and caches it — undoing the delete for the whole TTL. Store-then-delete narrows the race to the case 3.3 dissects, which a TTL bounds." },
          { t: "p", text: "The `v1` in the key is cheap insurance. When the cached shape changes — a new field, a renamed one — deploying code that reads `product:v2:*` means old-format entries are simply never read and expire on their own, instead of crashing the new code during a rolling deploy." },
          { t: "p", text: "Putting the pattern in one repository is the real point. Cache logic sprinkled across call sites drifts — one site forgets to delete on write, another uses a different key format — and each drift is a stale-data bug that only appears under load. One class means one place to add metrics, request coalescing (3.4) and a circuit breaker for when Redis is down (7.2)." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: write-behind counters and a Redis failover",
      body: [
        { t: "p", text: "**Symptom.** A video platform's view counts and creator earnings were computed from per-video counters incremented in Redis and flushed to PostgreSQL every 60 seconds. After a Redis primary failed over to its replica, about 40 seconds of view increments for every video vanished, and creators' daily earnings reports were short. Support received hundreds of tickets." },
        { t: "p", text: "**Mechanism.** This was write-behind with two loss windows nobody had written down: up to 60 seconds of unflushed increments in the primary, and the asynchronous replication lag between primary and replica. The failover promoted a replica that was behind, and the flush job then wrote the replica's lower counts. For approximate view counts that would have been acceptable; once earnings were derived from the same counters, it was not." },
        { t: "p", text: "**Fix.** Split the data by its tolerance for loss. Views stayed write-behind with a documented loss window. Billable events moved to an append-only log — Kafka with replicated, acknowledged writes (6.2) — from which earnings are computed exactly and idempotently. The rule: **write-behind is acceptable only for data whose loss window the business has explicitly accepted.**" }
      ] }
  ],

  takeaways: [
    "Every strategy answers **who loads on a miss** and **what a write does to the cache**.",
    "**Cache-aside**: the app reads the cache, loads the database on a miss, writes back. **Read-through**: the cache's own loader does it.",
    "**Write-through** writes both before returning: no staleness, reads stay warm, every write pays both.",
    "**Write-behind** acknowledges after the cache and flushes later: measured ~10× faster writes and fewer database writes — and it **lost every unflushed write** when the cache crashed.",
    "**Write-around with only a TTL** served over half of reads stale on a write-heavy hot set: the forgotten strategy is the stalest.",
    "**Delete on write, do not update**: concurrent updates can leave an older value in the cache until the TTL, while deletes are order-independent.",
    "On write: **update the source of truth first, then delete** the cached key.",
    "Choose per key space: cache-aside for read-heavy data, write-through for read-after-write, write-behind for approximate counters, **no cache for money and stock**.",
    "Version cache keys (`product:v1:…`) so a changed shape never reads old entries during a deploy.",
    "**Write-behind makes the cache a database** — it needs persistence, replication and a loss window the business has accepted."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is deleting a cached key on write safer than writing the new value into the cache?",
        options: ["Deleting is faster than setting", "Two concurrent writers can set the cache in the wrong order, leaving an old value; deletes are order-independent", "Redis cannot overwrite keys", "Setting the value would bypass the database"],
        answer: 1,
        why: "If A and B both update and then set the cache, a delayed A can overwrite B's newer value, and nothing corrects it until the TTL. Whichever delete runs last, the key is simply absent and the next read loads the current database row. Speed is similar, Redis overwrites keys freely, and setting the cache does not skip the database write — the problem is purely ordering." },

      { stem: "Which strategy can lose acknowledged writes if the cache node crashes?",
        options: ["Cache-aside", "Write-through", "Write-behind", "Read-through"],
        answer: 2,
        why: "Write-behind acknowledges once the cache holds the value and flushes to the database later, so anything not yet flushed exists only in the cache — 33 writes in the simulation. Write-through writes the database before acknowledging, and cache-aside and read-through write the database directly, so in all three a cache crash only loses copies, never the data." },

      { stem: "A user changes their display name and the next page still shows the old one for five minutes. Which strategy is in use?",
        options: ["Write-through", "Cache-aside with delete-on-write", "Write-around: the database is updated and the cached copy left to expire", "Write-behind"],
        answer: 2,
        why: "The database has the new name but the cached copy was neither deleted nor updated, so reads return it until its TTL expires — the behaviour of write-around. Write-through would have updated the cache, and delete-on-write would have removed the key so the next read loaded the new name. Write-behind serves reads from the cache, which already holds the new value." },

      { stem: "Which data is the best fit for write-behind?",
        options: ["Account balances", "Like counts on posts", "Inventory at checkout", "Password hashes"],
        answer: 1,
        why: "Like counts are written constantly, read approximately, and losing a few seconds of increments is harmless — exactly what write-behind trades for its speed and coalescing. Balances, inventory and credentials must never lose an acknowledged write and must be read current, so they need write-through, direct database writes, or no cache at all." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Name the strategy, then name what it gives up.",
    questions: [
      { level: "core",
        q: "Which caching strategy would you use, and why?",
        strong: "A strong answer defaults to cache-aside with delete-on-write and varies by data type with reasons.",
        answer: [
          { t: "p", text: "Cache-aside as the default: read the cache, on a miss read the database and populate the cache with a TTL; on a write, update the database first and then delete the key. It caches only what is read, the system keeps working if the cache is down, and deleting rather than updating avoids concurrent writers leaving an old value behind." },
          { t: "p", text: "Then per kind of data. Write-through where a user must see their own change immediately. Write-behind for high-volume approximate counters, with the loss window stated. And no caching on paths that must be current, like stock at checkout or balances." }
        ] },

      { level: "advanced",
        q: "What are the risks of write-behind caching?",
        strong: "A strong answer names loss, ordering, and the fact that the cache becomes the system of record.",
        answer: [
          { t: "p", text: "Loss: acknowledged writes live only in the cache until flushed, so a crash or a failover to a lagging replica loses them. Ordering and failure handling: the flush must be retried, must not apply writes out of order, and failures are now asynchronous — the user was told it succeeded long before the database said no, for example on a constraint violation." },
          { t: "p", text: "In effect the cache becomes the system of record for recent writes, so it needs persistence and replication like a database. I use it only for data whose loss window the business has accepted — counters, analytics — and never for anything billable." }
        ] },

      { level: "core",
        q: "When would you choose write-through over cache-aside?",
        strong: "A strong answer ties it to read-after-write and to cache warmth.",
        answer: [
          { t: "p", text: "When data is read immediately after it is written and that read must be fast and current — a user saving settings and reloading the page, a game state read on the next tick. Write-through leaves the cache holding the new value, so the next read hits." },
          { t: "p", text: "The costs are higher write latency, since every write waits for both stores, and cache pollution, since everything written gets cached whether or not it is read again. For read-heavy data written rarely, cache-aside's extra miss after a write is cheaper." }
        ] }
    ]
  }
});

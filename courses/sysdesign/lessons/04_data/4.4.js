/* ============================================================================
   LESSON 4.4 — Denormalisation, Materialised Views and Blob Storage
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "A normalised schema stores each fact once and computes everything else when asked. At scale, \"when asked\" becomes too often: the same count, the same join and the same aggregate are recomputed millions of times a day. **Denormalisation** stores a derived value next to the data that needs it; a **materialised view** stores a whole precomputed query. Both trade write work and the risk of drifting out of step for read speed — and both need a plan for staying correct. Files are the opposite case: large, immutable bytes that never belong in the database at all, but in **object storage**, uploaded and served without passing through your servers.",

  objectives: [
    "Measure what a denormalised column and a precomputed summary each save on reads",
    "Keep a denormalised value correct with transactions, triggers or events, and detect drift",
    "Choose between a live query, a materialised view and an incrementally maintained summary",
    "Explain why files belong in object storage and what goes in the database instead",
    "Design an upload flow with presigned URLs that keeps bytes off the application servers"
  ],

  prerequisites: ["2.3", "2.4"],

  blocks: [

    { t: "h2", n: "01", id: "denorm", text: "Storing what you would otherwise compute",
      sub: "A count, a total, a name copied in" },

    { t: "p", text: "A feed page shows thirty posts with their comment counts. A dashboard shows revenue per product for the last thirty days. Both are computed from a million rows each time, or read from a value stored in advance:" },

    { t: "code", lang: "python", title: "denorm.py — a denormalised column and a daily summary table", code: `import random, sqlite3, time

rng = random.Random(3)
db = sqlite3.connect(":memory:")
db.executescript("""
  CREATE TABLE posts    (id INTEGER PRIMARY KEY, title TEXT, comment_count INTEGER DEFAULT 0);
  CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER, body TEXT);
  CREATE INDEX comments_by_post ON comments(post_id);
  CREATE TABLE daily_sales (day INTEGER, product_id INTEGER, units INTEGER, revenue REAL,
                            PRIMARY KEY (day, product_id));
  CREATE TABLE sales (id INTEGER PRIMARY KEY, day INTEGER, product_id INTEGER, qty INTEGER, price REAL);""")
db.executemany("INSERT INTO posts (id, title) VALUES (?, ?)", ((i, f"post {i}") for i in range(1, 20_001)))
db.executemany("INSERT INTO comments (post_id, body) VALUES (?, 'x')",
               ((rng.randint(1, 20_000),) for _ in range(1_000_000)))
db.execute("UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = posts.id)")
db.executemany("INSERT INTO sales (day, product_id, qty, price) VALUES (?,?,?,?)",
               ((rng.randint(0, 364), rng.randint(1, 500), rng.randint(1, 3), 9.99) for _ in range(1_000_000)))

def ms(sql, n=20):
    t = time.perf_counter()
    for _ in range(n): db.execute(sql).fetchall()
    return (time.perf_counter() - t) / n * 1000

# 1. a feed page showing 30 posts with their comment counts
live = ms("""SELECT p.id, p.title, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
             FROM posts p ORDER BY p.id DESC LIMIT 30""")
stored = ms("SELECT id, title, comment_count FROM posts ORDER BY id DESC LIMIT 30")
print("feed page, 30 posts with comment counts")
print("  count at read time   %8.3f ms" % live)
print("  denormalised column  %8.3f ms   (%.0fx faster)" % (stored, live / stored))

# 2. a dashboard: revenue per product for the last 30 days
t = time.perf_counter()
db.execute("""INSERT INTO daily_sales SELECT day, product_id, SUM(qty), SUM(qty * price)
              FROM sales GROUP BY day, product_id""")
refresh = (time.perf_counter() - t) * 1000
raw = ms("SELECT product_id, SUM(qty * price) FROM sales WHERE day >= 335 GROUP BY product_id", 5)
mv = ms("SELECT product_id, SUM(revenue) FROM daily_sales WHERE day >= 335 GROUP BY product_id", 5)
print("dashboard, revenue per product over 30 days")
print("  from 1,000,000 sales %8.1f ms" % raw)
print("  from daily summary   %8.1f ms   (%.0fx faster; summary rebuilt in %.0f ms)" % (mv, raw / mv, refresh))`,
      out: `feed page, 30 posts with comment counts
  count at read time      0.071 ms
  denormalised column     0.016 ms   (4x faster)
dashboard, revenue per product over 30 days
  from 1,000,000 sales     67.5 ms
  from daily summary        3.6 ms   (19x faster; summary rebuilt in 875 ms)`,
      caption: "The comment count is cheap to compute here because an index exists (2.4), and the stored column is still several times faster — on a feed rendered thousands of times a second, that multiple is the difference. The dashboard gains more: a daily summary is a small fraction of the raw rows, so the query is an order of magnitude faster, at the price of rebuilding the summary and serving data only as fresh as the last rebuild." },

    { t: "diagram", kind: "compare", title: "What denormalising costs",
      caption: "Every stored derivation is a second copy of a fact, and copies drift. The design question is not whether to denormalise but how each copy is kept in step and how drift is detected.",
      columns: [
        { title: "Reads gain", tone: "good", items: [
          "no join or aggregate at read time",
          "one row answers the screen",
          "predictable latency as data grows",
          "works across shards (4.2)"
        ] },
        { title: "Writes pay", tone: "warn", items: [
          "every change updates the copy too",
          "a hot counter becomes a contended row",
          "a missed update leaves it wrong forever",
          "schema changes touch more places"
        ] }
      ] },

    { t: "h3", text: "Keeping the copy correct" },

    { t: "diagram", kind: "matrix", title: "Four ways to maintain a derived value",
      caption: "In-transaction updates are the default for counts on the same database. Triggers guarantee the update but hide logic in the database. Events and CDC suit copies in other services or stores. A scheduled rebuild suits aggregates where minutes of staleness are acceptable — and doubles as drift repair for the others.",
      cols: ["Freshness", "Can drift?", "Cost"],
      rows: ["Same transaction as the write", "Database trigger", "Event / CDC consumer (6.4)", "Scheduled rebuild"],
      cells: [
        [{ text: "immediate", tone: "good" }, { text: "only via code paths that skip it", tone: "warn" }, { text: "write contention on hot rows", tone: "warn" }],
        [{ text: "immediate", tone: "good" }, { text: "no", tone: "good" }, { text: "hidden logic, slower writes", tone: "warn" }],
        [{ text: "seconds", tone: "warn" }, { text: "if events are lost", tone: "warn" }, { text: "a pipeline to run", tone: "warn" }],
        [{ text: "as old as the schedule", tone: "crit" }, { text: "repaired each run", tone: "good" }, { text: "periodic heavy query", tone: "accent" }]
      ] },

    { t: "callout", kind: "trap", title: "The counter that drifted for a year",
      body: [
        { t: "p", text: "A `comment_count` column is incremented in the code path that creates comments. Then a moderation tool deletes spam comments directly with SQL, a bulk import inserts comments through a different service, and a failed request increments the count after the comment insert rolled back. Each is a small leak; after a year, counts are wrong on a third of posts and nobody can say by how much." },
        { t: "p", text: "Two habits prevent it. Make the update impossible to skip — the same transaction as the insert via one repository, or a trigger — and run a **reconciliation job** that recomputes a sample (or all) of the derived values from the source and reports, then repairs, any difference. A derived value without a reconciliation job is a value you merely hope is right." }
      ] },

    { t: "h2", n: "02", id: "mv", text: "Materialised views",
      sub: "A whole query, stored" },

    { t: "p", text: "A materialised view is the database's own version of the daily summary: `CREATE MATERIALIZED VIEW daily_sales AS SELECT …` stores the result, and `REFRESH MATERIALIZED VIEW` recomputes it. In PostgreSQL the refresh is a full recomputation, and `REFRESH … CONCURRENTLY` lets readers keep using the old result while it runs. Some systems maintain views incrementally — applying each change to the stored result rather than recomputing — which is what streaming databases and warehouse \"dynamic tables\" do." },

    { t: "diagram", kind: "steps", title: "Choosing how fresh the precomputed answer must be",
      caption: "The right point on this ladder is set by how stale the reader can tolerate and how expensive the query is. CQRS (10.4) is this idea applied to a whole service: a write model normalised for correctness, read models denormalised for each screen.",
      items: [
        { label: "Live query", desc: "fast enough with an index? Stop here", code: "always fresh", tone: "good" },
        { label: "Cache the result", desc: "same answer for many readers, minutes of staleness fine (Module 3)", code: "TTL-fresh", tone: "accent" },
        { label: "Materialised view, scheduled refresh", desc: "an expensive aggregate read often, refreshed every N minutes", code: "N-minutes fresh", tone: "warn" },
        { label: "Incrementally maintained summary", desc: "updated per change by trigger, events or a stream processor (6.5)", code: "seconds fresh", tone: "violet" },
        { label: "A separate read store", desc: "search index or warehouse fed by CDC, shaped for its queries", code: "seconds–minutes", tone: "teal" }
      ] },

    { t: "h2", n: "03", id: "blobs", text: "Files go in object storage",
      sub: "The database stores the key, not the bytes" },

    { t: "p", text: "Images, videos, PDFs and uploads are large, immutable, and read whole. A relational database is the most expensive possible home for them: they bloat backups and replication (every replica copies every byte, 4.1), crowd the hot pages out of the buffer cache (3.1), and make every file download occupy a database connection. **Object storage** — S3, Google Cloud Storage, Azure Blob — stores them durably across zones at a fraction of the cost per gigabyte, serves them over HTTP, and sits naturally behind a CDN (3.5)." },

    { t: "table",
      head: ["", "Files in the database", "Files in object storage"],
      rows: [
        ["Database size", "Dominated by blobs", "Rows only: keys, sizes, owners"],
        ["Backups and replica rebuilds", "Hours longer, every time", "Unaffected"],
        ["Serving a download", "Holds a DB connection and an app thread", "Straight from storage or the CDN"],
        ["Durability", "Whatever the database has", "Replicated across zones by the service"],
        ["Cost per GB", "Database storage (high)", "Object storage (low), with cheaper cold tiers"]
      ],
      caption: "The database keeps the metadata — who owns the file, its key, size, type and status — so it can be queried, joined and secured. The bytes live where bytes are cheap." },

    { t: "viz", title: "Uploading without the bytes touching your servers",
      caption: "The app authorises the upload and records it; the client sends the bytes straight to the object store using a short-lived presigned URL; the store emits an event; a worker makes thumbnails and marks the upload ready. App servers never carry the file, so a 2 GB video costs them one small request.",
      svg: `<svg viewBox="0 0 760 301.0" width="100%" role="img"><defs><marker id="q976605accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q976605good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q976605warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q976605crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q976605violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q976605teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q976605line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="14.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="70.0" y="32" text-anchor="middle" class="s-label">Client</text>
<rect x="169.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="225.0" y="32" text-anchor="middle" class="s-label">App</text>
<rect x="324.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="380.0" y="32" text-anchor="middle" class="s-label">Object store</text>
<rect x="479.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="535.0" y="32" text-anchor="middle" class="s-label">Worker</text>
<rect x="634.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="690.0" y="32" text-anchor="middle" class="s-label">Database</text>
<line x1="70.0" y1="42" x2="70.0" y2="289.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="225.0" y1="42" x2="225.0" y2="289.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="380.0" y1="42" x2="380.0" y2="289.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="535.0" y1="42" x2="535.0" y2="289.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="690.0" y1="42" x2="690.0" y2="289.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="70.0" y1="60" x2="221.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q976605accent)"/>
<text x="147.5" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">POST /uploads (photo.jpg, 812 KB)</text>
<line x1="225.0" y1="90" x2="686.0" y2="90" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q976605warn)"/>
<text x="457.5" y="84" text-anchor="middle" class="s-sub" style="fill:var(--warn)">INSERT upload (pending)</text>
<line x1="225.0" y1="120" x2="74.0" y2="120" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q976605accent)"/>
<text x="147.5" y="114" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(presigned PUT URL, 5 min)</text>
<line x1="70.0" y1="150" x2="376.0" y2="150" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q976605good)"/>
<text x="225.0" y="144" text-anchor="middle" class="s-sub" style="fill:var(--good)">PUT bytes directly</text>
<line x1="380.0" y1="180" x2="531.0" y2="180" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q976605violet)"/>
<text x="457.5" y="174" text-anchor="middle" class="s-sub" style="fill:var(--violet)">event: object created</text>
<line x1="535.0" y1="210" x2="384.0" y2="210" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q976605good)"/>
<text x="457.5" y="204" text-anchor="middle" class="s-sub" style="fill:var(--good)">GET original, PUT thumbnails</text>
<line x1="535.0" y1="240" x2="686.0" y2="240" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q976605warn)"/>
<text x="612.5" y="234" text-anchor="middle" class="s-sub" style="fill:var(--warn)">UPDATE upload (ready, keys)</text>
<line x1="70.0" y1="270" x2="376.0" y2="270" style="stroke:var(--teal)" stroke-width="1.6" marker-end="url(#q976605teal)"/>
<text x="225.0" y="264" text-anchor="middle" class="s-sub" style="fill:var(--teal)">GET via CDN (signed if private)</text></svg>` },

    { t: "exercise", kind: "Challenge", title: "Presigned upload URLs",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Implement the authorisation half of the flow above. The application server signs a URL that allows exactly one upload; the object store verifies it before accepting any bytes." }
      ],
      requirements: [
        "The server chooses the object key, never the client",
        "The signature covers the method, key, expiry, content type and maximum size",
        "The store rejects an expired URL, a different key, a different content type and an oversized upload",
        "Signature comparison is constant-time",
        "Print the outcome of a valid upload and of each attack"
      ],
      hint: "Sign a canonical string of every constraint with HMAC, put the constraints and the signature in the query string, and have the store rebuild the same string from the request it receives.",
      solution: { lang: "python", title: "presign_ex.py",
        code: `import hashlib, hmac, time, uuid
from urllib.parse import urlencode, urlparse, parse_qs

STORAGE_SECRET = b"shared-between-app-and-storage"     # in S3: derived from the IAM key

def presign(method: str, key: str, expires_in: int, content_type: str, max_bytes: int, now: int) -> str:
    """App server: authorise ONE operation on ONE object, for a short time. No data passes through it."""
    exp = now + expires_in
    msg = f"{method}\\n{key}\\n{exp}\\n{content_type}\\n{max_bytes}".encode()
    sig = hmac.new(STORAGE_SECRET, msg, hashlib.sha256).hexdigest()
    q = urlencode({"exp": exp, "ct": content_type, "max": max_bytes, "sig": sig})
    return f"https://uploads.example-storage.net/{key}?{q}"

def storage_accepts(method: str, url: str, content_type: str, size: int, now: int) -> str:
    """Object store: verify before accepting the bytes."""
    u = urlparse(url); q = {k: v[0] for k, v in parse_qs(u.query).items()}
    key = u.path.lstrip("/")
    msg = f"{method}\\n{key}\\n{q['exp']}\\n{q['ct']}\\n{q['max']}".encode()
    if not hmac.compare_digest(hmac.new(STORAGE_SECRET, msg, hashlib.sha256).hexdigest(), q["sig"]):
        return "403 signature does not match"
    if now > int(q["exp"]):                 return "403 expired"
    if content_type != q["ct"]:             return "403 wrong content type"
    if size > int(q["max"]):                return "413 too large"
    return "200 stored"

now = int(time.time())
key = f"avatars/user-7/{uuid.UUID(int=42)}.jpg"                     # server chooses the key
url = presign("PUT", key, expires_in=300, content_type="image/jpeg", max_bytes=5_000_000, now=now)
print("presigned URL path :", urlparse(url).path)
print("upload now         :", storage_accepts("PUT", url, "image/jpeg", 812_000, now + 10))
print("upload in an hour  :", storage_accepts("PUT", url, "image/jpeg", 812_000, now + 3600))
print("different key      :", storage_accepts("PUT", url.replace("user-7", "user-8"), "image/jpeg", 812_000, now + 10))
print("upload an .exe     :", storage_accepts("PUT", url, "application/x-msdownload", 812_000, now + 10))
print("upload 40 MB       :", storage_accepts("PUT", url, "image/jpeg", 40_000_000, now + 10))`,
        out: `presigned URL path : /avatars/user-7/00000000-0000-0000-0000-00000000002a.jpg
upload now         : 200 stored
upload in an hour  : 403 expired
different key      : 403 signature does not match
upload an .exe     : 403 wrong content type
upload 40 MB       : 413 too large`,
        notes: [
          { t: "p", text: "Everything the store will enforce is inside the signed string, so changing any of it — the key, the type, the size limit, the expiry — breaks the signature. The URL is a **capability**: whoever holds it can do exactly one thing for five minutes, and nothing else. That is how S3 and GCS presigned URLs work, with a more elaborate canonical request." },
          { t: "p", text: "The server choosing the key matters more than it looks. A client-chosen key lets one user overwrite another's file, or write `../` paths into places they should not. A server-generated key under the user's prefix, with a random component, makes collisions and guessing impossible." },
          { t: "p", text: "The size and type limits are enforced by the store before the bytes land, which is the only point where they protect anything: checking a 40 GB upload after it has been stored is too late. The worker that makes thumbnails should still validate the file's actual contents, because a content-type header is a claim, not a fact (12.3)." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the database that was 94% PDFs",
      body: [
        { t: "p", text: "**Symptom.** An insurance platform's PostgreSQL primary reached 6 TB. Nightly backups took eleven hours and overlapped the morning peak; building a new replica took two days, so the team had been running with one replica for a month after losing another; and the buffer cache hit ratio had fallen steadily for a year." },
        { t: "p", text: "**Mechanism.** Every policy document and claim attachment was stored as a `bytea` column. 94% of the database was immutable PDFs read a few times in their lives, and every backup, replica and failover copied them. The working set — policies, claims, customers — was a few hundred gigabytes, competing for memory with blobs it never needed." },
        { t: "p", text: "**Fix.** A background migration copied each document to object storage under a key recorded in a new column, verified the checksum, then cleared the `bytea`. The database fell to 380 GB; backups took forty minutes; a replica rebuilt in two hours; the cache hit ratio returned to 99%. Downloads now redirect to signed CDN URLs, and a schema lint rejects new binary columns over a small size limit." }
      ] }
  ],

  takeaways: [
    "**Denormalising** stores a derived value next to the data that needs it; a **materialised view** stores a whole query's result.",
    "Measured: a stored comment count read several times faster than counting; a daily summary answered a 30-day dashboard **an order of magnitude faster** than a million raw rows.",
    "Every derived value is a second copy: writes pay to update it and **it drifts when any path skips the update**.",
    "Maintain derived values in the **same transaction**, by **trigger**, by **event/CDC**, or by **scheduled rebuild** — and run a **reconciliation job** whatever you choose.",
    "Pick freshness deliberately: live query → cache → scheduled view → incremental summary → separate read store.",
    "**Files belong in object storage**: in the database they bloat backups and replicas, evict hot pages and hold connections while downloading.",
    "The database keeps **metadata and the object key**; the bytes live in the store, served through a CDN.",
    "**Presigned URLs** let clients upload and download directly: a short-lived, signed capability for one operation on one server-chosen key, with type and size limits enforced before the bytes land."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A posts table stores comment_count, incremented by the create-comment endpoint. What is the most likely way it becomes wrong?",
        options: ["Integer overflow", "Another code path adds or deletes comments without updating the count", "The index on comments is missing", "Reads are too frequent"],
        answer: 1,
        why: "A denormalised counter is correct only if every path that changes comments also changes the count; bulk imports, admin SQL and rolled-back requests are the usual leaks, which is why it should be updated in one transaction or by trigger and reconciled periodically. Overflow is implausible for a comment count, a missing index affects speed not correctness, and read frequency does not change the stored value." },

      { stem: "A dashboard aggregates a billion rows and may be up to 15 minutes old. What fits best?",
        options: ["Run the aggregate on every page load", "A materialised view or summary table refreshed every 15 minutes", "Cache each raw row in Redis", "Add an index on every column"],
        answer: 1,
        why: "The tolerance of 15 minutes is exactly what a scheduled refresh provides, and the reader then scans a small precomputed result instead of a billion rows. Running it per page load repeats the expensive work for every viewer; caching raw rows does not avoid aggregating them; and indexes help selective lookups, not full aggregates." },

      { stem: "Why are user-uploaded videos better stored in object storage than in a database column?",
        options: ["Databases cannot store binary data", "They inflate backups, replicas and memory pressure, and tie up database connections while being served", "Object storage has stronger transactions", "Object storage is faster for small rows"],
        answer: 1,
        why: "Databases can store binary data, but every replica, backup and failover then copies large immutable files, they compete with hot pages for the buffer cache, and every download occupies a connection — all costs object storage avoids at a lower price per gigabyte. Object storage has weaker, not stronger, transactional semantics, and it is not optimised for small rows." },

      { stem: "In a presigned upload, why must the server, not the client, choose the object key?",
        options: ["Clients cannot generate UUIDs", "A client-chosen key could overwrite another user's object or write outside its own prefix", "The signature cannot include the key", "Object stores require server-chosen keys"],
        answer: 1,
        why: "The URL authorises whatever key it was signed for; if the client picks it, a user can target someone else's file or path. A server-generated key under the user's own prefix, with a random component, prevents both. Clients can generate UUIDs, the key is part of the signed string, and object stores accept any key the signer authorises." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Say what you are copying, and how the copy stays right.",
    questions: [
      { level: "core",
        q: "When would you denormalise?",
        strong: "A strong answer ties denormalisation to a measured read cost and states the maintenance mechanism.",
        answer: [
          { t: "p", text: "When a read is frequent, its computation is expensive or crosses shards, and the derived value changes much less often than it is read — counts on a feed, an order total, a customer's name on an order line for display. I would first check that an index or a cache does not already solve it." },
          { t: "p", text: "Then I would say how the copy stays correct: updated in the same transaction as its source where possible, otherwise by trigger or from change events, plus a reconciliation job that compares a sample against the source and repairs drift. And I would distinguish copies that are facts — the price paid — from copies that are caches of current values." }
        ] },

      { level: "core",
        q: "Design file uploads for a photo-sharing app.",
        strong: "A strong answer keeps bytes off app servers, uses presigned URLs, processes asynchronously and serves via CDN.",
        answer: [
          { t: "p", text: "The client asks the API for an upload; the API records a pending upload, chooses a key under the user's prefix, and returns a presigned PUT URL valid for a few minutes with content type and size limits. The client uploads straight to object storage, which emits an event; a worker validates the file, strips metadata, generates thumbnails and sizes, and marks the upload ready in the database." },
          { t: "p", text: "Serving goes through a CDN with long cache lifetimes, since each processed image has a unique key; private photos get short-lived signed URLs instead. The application servers never carry the bytes, so a large upload costs them one small request." }
        ] },

      { level: "advanced",
        q: "Materialised view or cache?",
        strong: "A strong answer compares where the computation happens, freshness, and invalidation.",
        answer: [
          { t: "p", text: "A cache stores the result of a request for a while and is invalidated by TTL or events; the first reader after expiry pays to recompute it, and each distinct parameter set is a separate entry. A materialised view stores a precomputed dataset inside the database, refreshed on a schedule or incrementally, and can itself be queried flexibly with its own indexes." },
          { t: "p", text: "So a cache fits many readers asking the same few questions; a materialised view fits an expensive aggregation that many different queries filter and slice. They combine well — cache the hot slices of the view." }
        ] }
    ]
  }
});

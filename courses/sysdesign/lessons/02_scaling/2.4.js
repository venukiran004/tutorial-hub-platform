/* ============================================================================
   LESSON 2.4 — Indexing
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "An index is a second, sorted copy of some columns that lets the database jump to the rows it needs instead of reading all of them. It is the **first fix for almost every slow query**, often by a factor of a thousand. Two things make it a design decision rather than a reflex: a composite index only helps queries that match its **column order**, and every index is **paid for on every write** — so the right set is the smallest one that serves the queries you actually run.",

  objectives: [
    "Explain how a B-tree index turns a full scan into a few page reads, and compute its depth",
    "Read a query plan and tell a scan from a seek",
    "Choose the column order of a composite index from a query's filters and sort",
    "Use covering and partial indexes where they remove the remaining work",
    "Weigh an index's read benefit against its measured write cost"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", id: "btree", text: "What an index is",
      sub: "A sorted tree of keys, each pointing at a row" },

    { t: "viz", title: "Finding customer 4242 through a B-tree",
      caption: "Each node is a disk page holding hundreds of keys, so the tree is very wide and very shallow. The search reads one page per level — root, one internal page, one leaf — instead of every row. Leaves are linked in order, which is why ranges and ORDER BY come for free.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="B-tree lookup path">
  <defs><marker id="bt-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker>
  <marker id="bt-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="16" y="34" class="s-sub">root page</text>
  <rect x="270" y="16" width="220" height="32" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="37" text-anchor="middle" class="s-mono">… 3000 | 6000 | 9000 …</text>
  <text x="16" y="88" class="s-sub">internal pages</text>
  <rect x="40" y="96" width="200" height="32" rx="6" class="s-fill s-stroke"/>
  <text x="140" y="117" text-anchor="middle" class="s-mono">1000 | 2000</text>
  <rect x="280" y="96" width="200" height="32" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="117" text-anchor="middle" class="s-mono">4000 | 5000</text>
  <rect x="520" y="96" width="200" height="32" rx="6" class="s-fill s-stroke"/>
  <text x="620" y="117" text-anchor="middle" class="s-mono">7000 | 8000</text>
  <line x1="320" y1="48" x2="160" y2="94" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#bt-b)"/>
  <line x1="372" y1="48" x2="372" y2="94" style="stroke:var(--accent)" stroke-width="2" marker-end="url(#bt-a)"/>
  <line x1="440" y1="48" x2="600" y2="94" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#bt-b)"/>
  <text x="16" y="168" class="s-sub">leaf pages</text>
  <rect x="150" y="176" width="140" height="32" rx="6" class="s-fill s-stroke"/>
  <text x="220" y="197" text-anchor="middle" class="s-mono">3000…3999</text>
  <rect x="310" y="176" width="140" height="32" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="380" y="197" text-anchor="middle" class="s-mono">4000…4999</text>
  <rect x="470" y="176" width="140" height="32" rx="6" class="s-fill s-stroke"/>
  <text x="540" y="197" text-anchor="middle" class="s-mono">5000…5999</text>
  <line x1="360" y1="128" x2="240" y2="174" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#bt-b)"/>
  <line x1="380" y1="128" x2="380" y2="174" style="stroke:var(--accent)" stroke-width="2" marker-end="url(#bt-a)"/>
  <line x1="400" y1="128" x2="520" y2="174" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#bt-b)"/>
  <line x1="290" y1="192" x2="308" y2="192" style="stroke:var(--line);stroke-dasharray:3 3" stroke-width="1.2"/>
  <line x1="450" y1="192" x2="468" y2="192" style="stroke:var(--line);stroke-dasharray:3 3" stroke-width="1.2"/>
  <text x="380" y="232" text-anchor="middle" class="s-label" style="fill:var(--good)">4242 → row ids → the 11 matching orders</text>
  <text x="620" y="232" text-anchor="middle" class="s-sub">leaves linked: ranges are a walk</text>
</svg>` },

    { t: "table",
      head: ["Rows in the table", "Depth (≈500 keys per page)", "Pages read per lookup", "Without the index"],
      rows: [
        ["1,000", "2", "2", "1,000 rows"],
        ["1,000,000", "3", "3", "1,000,000 rows"],
        ["1,000,000,000", "4", "4", "1,000,000,000 rows"]
      ],
      caption: "Depth grows with log₅₀₀ of the row count, so a billion rows need one more page read than a million. The top levels are tiny and stay in memory, so a lookup usually costs one or two actual disk reads. A scan costs all of them." },

    { t: "h2", n: "02", id: "order", text: "Column order is the whole game",
      sub: "A composite index sorts by its first column, then its second" },

    { t: "p", text: "A million orders. The query is the commonest in any order system — a customer's twenty most recent orders:" },

    { t: "code", lang: "python", title: "indexing.py — one query, five indexing choices", code: `import random, sqlite3, time

rng = random.Random(9)
db = sqlite3.connect(":memory:")
db.execute("""CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER,
              status TEXT, created_at INTEGER, total REAL)""")
db.executemany("INSERT INTO orders (customer_id, status, created_at, total) VALUES (?,?,?,?)",
    ((rng.randint(1, 100_000), rng.choice(["paid", "shipped", "refunded"]),
      1_700_000_000 + i * 30, round(rng.uniform(5, 500), 2)) for i in range(1_000_000)))

Q = "SELECT id, total FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20"

def run(label):
    plan = " / ".join(r[3] for r in db.execute("EXPLAIN QUERY PLAN " + Q, (4242,)))
    t = time.perf_counter()
    for c in range(1, 51): db.execute(Q, (c * 1999,)).fetchall()
    print("%-42s %8.3f ms   %s" % (label, (time.perf_counter() - t) / 50 * 1000, plan))

run("no index")
db.execute("CREATE INDEX by_time_cust ON orders(created_at, customer_id)")
run("index (created_at, customer_id)")
db.execute("DROP INDEX by_time_cust")
db.execute("CREATE INDEX by_cust ON orders(customer_id)")
run("index (customer_id)")
db.execute("DROP INDEX by_cust")
db.execute("CREATE INDEX by_cust_time ON orders(customer_id, created_at)")
run("index (customer_id, created_at)")
db.execute("DROP INDEX by_cust_time")
db.execute("CREATE INDEX covering ON orders(customer_id, created_at, total)")
run("covering (customer_id, created_at, total)")`,
      out: `no index                                     37.364 ms   SCAN orders / USE TEMP B-TREE FOR ORDER BY
index (created_at, customer_id)              54.593 ms   SCAN orders USING INDEX by_time_cust
index (customer_id)                           0.028 ms   SEARCH orders USING INDEX by_cust (customer_id=?) / USE TEMP B-TREE FOR ORDER BY
index (customer_id, created_at)               0.027 ms   SEARCH orders USING INDEX by_cust_time (customer_id=?)
covering (customer_id, created_at, total)     0.008 ms   SEARCH orders USING COVERING INDEX covering (customer_id=?)`,
      hl: [11, 26, 29],
      caption: "With no index, SQLite scans a million rows and sorts the matches. An index on `(created_at, customer_id)` is **slower than no index**: it is sorted by time, so the database walks it in time order checking every entry for the customer. `(customer_id)` seeks straight to the customer but still sorts. `(customer_id, created_at)` seeks and reads them already in order. The covering index also holds `total`, so the table is never touched at all." },

    { t: "diagram", kind: "steps", title: "Choosing a composite index's column order",
      caption: "The rule follows from the sort: equality columns pin a contiguous slice of the index, a range or sort column orders that slice, and anything after a range column can no longer be used to seek.",
      items: [
        { label: "Equality filters first", desc: "customer_id = ?, status = ? — they narrow the index to one contiguous block", code: "(customer_id, …)", tone: "good" },
        { label: "Then the sort or range column", desc: "created_at — the block is already in this order, so no sort step", code: "(…, created_at)", tone: "accent" },
        { label: "Nothing useful after a range", desc: "a column after created_at > ? cannot narrow the seek further", code: "range ends the seek", tone: "warn" },
        { label: "Add selected columns to cover", desc: "include what the SELECT reads, so the table is never visited", code: "(…, total)", tone: "violet" },
        { label: "Leftmost prefix rule", desc: "(a, b, c) serves queries on a, a+b, a+b+c — not on b or c alone", code: "a · ab · abc", tone: "teal" }
      ] },

    { t: "h2", n: "03", id: "cost", text: "What an index costs",
      sub: "Every write updates every index" },

    { t: "p", text: "An index is a copy that must be kept in step. Every `INSERT` adds an entry to each index, every `DELETE` removes one, and every `UPDATE` of an indexed column moves one. Measured on bulk inserts:" },

    { t: "code", lang: "python", title: "index_writes.py — insert throughput against index count", code: `import random, sqlite3, time

COLS = ["customer_id", "status", "created_at", "total", "region", "sku"]
rng = random.Random(2)
rows = [(rng.randint(1, 10**5), rng.choice("PSR"), rng.randint(0, 10**9), rng.random() * 500,
         rng.choice(["eu", "us", "ap"]), rng.randint(1, 10**4)) for _ in range(200_000)]

print("%-10s %14s %14s" % ("indexes", "inserts/s", "vs none"))
base = None
for k in (0, 1, 3, 6):
    db = sqlite3.connect(":memory:")
    db.execute(f"CREATE TABLE t (id INTEGER PRIMARY KEY, {', '.join(COLS)})")
    for c in COLS[:k]:
        db.execute(f"CREATE INDEX ix_{c} ON t({c})")
    t = time.perf_counter()
    db.executemany(f"INSERT INTO t ({', '.join(COLS)}) VALUES (?,?,?,?,?,?)", rows)
    db.commit()
    rate = len(rows) / (time.perf_counter() - t)
    base = base or rate
    print("%-10d %14s %13.2fx" % (k, "{:,.0f}".format(rate), base / rate))`,
      out: `indexes         inserts/s        vs none
0               1,310,059          1.00x
1                 614,535          2.13x
3                 308,619          4.24x
6                 163,798          8.00x`,
      caption: "Roughly each extra index adds another sorted structure to maintain, so throughput falls in proportion. This is in memory; on disk, each index also means more pages to dirty and write, and more WAL (4.5). Indexes also cost **storage and memory** — an index that does not fit in RAM turns seeks back into disk reads." },

    { t: "callout", kind: "trap", title: "Indexing every column \"to be safe\"",
      body: [
        { t: "p", text: "Single-column indexes on every column look thorough and help few real queries — most queries filter on two or three columns and sort on another, which a set of single-column indexes serves badly (the first two rows of the measurement). Meanwhile every write pays for all of them, and the tables that get the most writes are usually the ones that get indexed most enthusiastically." },
        { t: "p", text: "Index **from the queries, not from the schema**: take the slow-query log or `pg_stat_statements`, find the queries that matter by total time, and build the few composite indexes that serve them. Then check for unused indexes — PostgreSQL's `pg_stat_user_indexes` shows indexes with zero scans — and drop them. Two well-chosen composite indexes usually beat ten single-column ones." }
      ] },

    { t: "callout", kind: "insight", title: "Selectivity: when the database ignores your index",
      body: [
        { t: "p", text: "An index on `status`, where 89% of rows are `shipped`, is useless for `WHERE status = 'shipped'`: following the index to 890,000 scattered rows costs more than reading the table in order, and the planner knows it. Indexes help when they select a **small fraction** of rows — a customer's orders, a day's events, the 1% that are `refunded`." },
        { t: "p", text: "That is what a **partial index** is for: `CREATE INDEX … ON orders(created_at) WHERE status = 'paid'` indexes only the rows you ask about, so it is small, cheap to maintain, and exactly as selective as the query." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Two indexes for three queries",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A million orders; about 10% are `paid`, 89% `shipped` and 1% `refunded`. Three queries matter:" },
        { t: "ol", items: [
          "A customer's 20 most recent orders",
          "A customer's refunded orders",
          "The count of paid orders created in the last hour"
        ] },
        { t: "p", text: "Serve all three with at most two indexes, and show the plans before and after." }
      ],
      requirements: [
        "Measure each query with no secondary index and show its plan",
        "Create at most two indexes",
        "Show that every query now seeks rather than scans",
        "Explain why one index serves both customer queries",
        "Explain why the third index is partial"
      ],
      hint: "Q2 filters on customer and status, but a customer has only about ten orders. Once the index has found them, how much work is left?",
      solution: { lang: "python", title: "index_ex.py",
        code: `import random, sqlite3, time

rng = random.Random(9)
db = sqlite3.connect(":memory:")
db.execute("""CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER,
              status TEXT, created_at INTEGER, total REAL)""")
db.executemany("INSERT INTO orders (customer_id, status, created_at, total) VALUES (?,?,?,?)",
    ((rng.randint(1, 100_000), rng.choices(["paid", "shipped", "refunded"], [10, 89, 1])[0],
      1_700_000_000 + i * 30, round(rng.uniform(5, 500), 2)) for i in range(1_000_000)))
LAST_HOUR = 1_700_000_000 + 1_000_000 * 30 - 3600

QUERIES = {
    "Q1 customer's latest 20": ("SELECT id, total FROM orders WHERE customer_id = ? "
                                "ORDER BY created_at DESC LIMIT 20", (4242,)),
    "Q2 customer's refunds":   ("SELECT id FROM orders WHERE customer_id = ? AND status = 'refunded'", (4242,)),
    "Q3 paid in the last hour": ("SELECT count(*) FROM orders WHERE status = 'paid' AND created_at > ?", (LAST_HOUR,)),
}
def report(title):
    print(title)
    for name, (sql, args) in QUERIES.items():
        t = time.perf_counter()
        for _ in range(20): db.execute(sql, args).fetchall()
        plan = db.execute("EXPLAIN QUERY PLAN " + sql, args).fetchall()[0][3]
        print("  %-26s %8.3f ms   %s" % (name, (time.perf_counter() - t) / 20 * 1000, plan))

report("before")
db.execute("CREATE INDEX cust_time ON orders(customer_id, created_at)")      # serves Q1 and Q2
db.execute("CREATE INDEX paid_time ON orders(created_at) WHERE status = 'paid'")  # partial: Q3
report("after two indexes")`,
        out: `before
  Q1 customer's latest 20      35.612 ms   SCAN orders
  Q2 customer's refunds        35.603 ms   SCAN orders
  Q3 paid in the last hour     43.549 ms   SCAN orders
after two indexes
  Q1 customer's latest 20       0.009 ms   SEARCH orders USING INDEX cust_time (customer_id=?)
  Q2 customer's refunds         0.004 ms   SEARCH orders USING INDEX cust_time (customer_id=?)
  Q3 paid in the last hour      0.003 ms   SEARCH orders USING COVERING INDEX paid_time (created_at>?)`,
        notes: [
          { t: "p", text: "`(customer_id, created_at)` serves Q1 exactly — equality then sort, as in section 02 — and serves Q2 well enough, because the customer filter alone narrows a million rows to about ten, and checking ten rows for `status = 'refunded'` costs nothing. Adding `status` to the index would save almost no work and cost every write." },
          { t: "p", text: "Q3 filters on a low-selectivity column (10% of a million rows are paid) plus a range. A full index on `(status, created_at)` would work, but a **partial** index on `created_at` restricted to paid orders is smaller, only maintained when a paid order is written, and — because it holds only the rows the query counts — answers it as a covering index without touching the table." },
          { t: "p", text: "The pattern generalises: **start from the queries, find the shared prefix, and let one composite index serve several queries** whose remaining filters touch only a few rows. Two indexes here do the work that a naive per-column approach would spread across four or five, at a fraction of the write cost." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the index that made a migration take the site down",
      body: [
        { t: "p", text: "**Symptom.** A developer added an index to speed up a report. On staging the migration took a few seconds. On production — 300 million rows — every write to the table blocked for 47 minutes, checkout failed, and the deploy could not be rolled back because the migration was still running." },
        { t: "p", text: "**Mechanism.** A plain `CREATE INDEX` in PostgreSQL takes a lock that blocks writes to the table for the whole build, and building over 300 million rows takes as long as reading 300 million rows. Staging had 50,000 rows, so the lock lasted milliseconds and nobody noticed it existed." },
        { t: "p", text: "**Fix.** `CREATE INDEX CONCURRENTLY`, which builds without blocking writes at the cost of taking longer and needing to be run outside a transaction, with a `lock_timeout` so any migration that cannot get its lock fails fast instead of queueing every write behind it. The migration linter now rejects non-concurrent index creation on large tables — the lesson being that **an index is a write-path change, and it is deployed like one**." }
      ] }
  ],

  takeaways: [
    "An index is a **sorted B-tree** of keys pointing at rows: a lookup reads one page per level instead of every row.",
    "With hundreds of keys per page, depth grows with log₅₀₀ — **a billion rows is about four levels**, and the top levels live in memory.",
    "Read the plan: **SCAN** reads everything; **SEARCH … USING INDEX** seeks; **COVERING INDEX** never touches the table.",
    "Measured on a million rows: the right composite index took a query from **~37 ms to ~0.02 ms**; a covering one to under 0.01 ms.",
    "**Column order is the whole game**: equality columns first, then the sort or range column. The wrong order measured **slower than no index**.",
    "**Leftmost prefix**: `(a, b, c)` serves a, a+b and a+b+c — never b or c alone. A range column ends the usable seek.",
    "**Every index is paid for on every write** — measured, six indexes cut insert throughput about eightfold.",
    "Index **from the slow-query log, not the schema**, and drop indexes that are never scanned.",
    "Indexes help when they select a **small fraction** of rows; for a low-selectivity column use a **partial index** on the rows you actually query.",
    "Building an index on a large live table needs **`CREATE INDEX CONCURRENTLY`** and a lock timeout — it is a write-path change."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which index best serves: WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20?",
        options: ["(created_at, customer_id)", "(customer_id, created_at)", "(customer_id) and a separate (created_at)", "(created_at)"],
        answer: 1,
        why: "Equality first then sort: the index seeks to one customer's block, which is already in created_at order, so the first 20 entries are the answer with no sort step. (created_at, customer_id) is sorted by time and must be walked checking every customer — measured slower than no index. Two separate indexes cannot do both jobs at once, so one still sorts, and (created_at) alone scans by time." },

      { stem: "An index exists on (region, status, created_at). Which query can use it to seek?",
        options: ["WHERE status = 'paid'", "WHERE created_at > ?", "WHERE region = 'eu' AND status = 'paid'", "WHERE status = 'paid' AND created_at > ?"],
        answer: 2,
        why: "By the leftmost-prefix rule, a composite index can seek on its first column, its first two, or all three. region + status is a prefix, so the seek goes straight to that block. Any query that does not constrain region first cannot seek — the index is sorted by region, so status values are scattered across every region's block." },

      { stem: "A table receives 20,000 inserts a second and has nine indexes, most added years ago. Writes are slow. What should you check first?",
        options: ["Whether the table needs more indexes", "Which indexes are actually used, since each one is maintained on every insert", "Whether to switch to a NoSQL store", "Whether the primary key is too long"],
        answer: 1,
        why: "Every index is updated on every insert, so nine indexes means nine structures maintained per row; unused ones are pure cost. PostgreSQL's pg_stat_user_indexes shows scan counts per index, and dropping the unused ones is the cheapest write-speed fix available. More indexes make writes slower, a store migration is a vastly bigger change, and key length is a minor factor next to index count." },

      { stem: "Why does the planner ignore an index on status for WHERE status = 'shipped', when 89% of rows are shipped?",
        options: ["The index is corrupt", "Following the index to 89% of the rows costs more than reading the table sequentially", "Indexes cannot be used on text columns", "The statistics are always wrong"],
        answer: 1,
        why: "An index pays off when it selects a small fraction of rows; jumping from index entries to 890,000 scattered rows is more random I/O than one sequential scan, and the cost-based planner correctly chooses the scan. Text columns index perfectly well, nothing suggests corruption, and statistics are usually accurate enough for this decision. A partial index on the rare values is the tool for low-selectivity columns." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Indexing questions test whether you start from the query.",
    questions: [
      { level: "core",
        q: "A query that used to take 10 ms now takes 3 seconds. How do you approach it?",
        strong: "A strong answer reads the plan, explains why it changed, and fixes from the query outward.",
        answer: [
          { t: "p", text: "Run `EXPLAIN ANALYZE` and look for a sequential scan or a sort over many rows. A query that degraded over time usually has a plan that was fine on small data — a scan that grew with the table — or the planner switched plans because statistics changed or the data distribution shifted." },
          { t: "p", text: "Then build the index from the query: equality columns first, then the sort or range column, and the selected columns if a covering index removes the table lookups. I would create it concurrently so it does not block writes, confirm the plan changed, and check the write path did not suffer — then look for any index this one makes redundant." }
        ] },

      { level: "core",
        q: "Why not index every column?",
        strong: "A strong answer covers write cost, memory, and the fact that single-column indexes serve real queries poorly.",
        answer: [
          { t: "p", text: "Every index is maintained on every write, so write throughput falls roughly in proportion to the number of indexes; each one takes disk and, more importantly, memory — an index that does not fit in RAM turns seeks into disk reads. And single-column indexes on everything still serve real queries badly, because those filter on several columns and sort on another." },
          { t: "p", text: "So I index from the workload: the queries with the most total time, a few composite indexes shaped to them, partial indexes for selective subsets, and periodic removal of indexes that are never scanned." }
        ] },

      { level: "advanced",
        q: "How does an index on (a, b) differ from separate indexes on a and on b?",
        strong: "A strong answer explains the sort order and the leftmost-prefix rule, and when separate indexes are fine.",
        answer: [
          { t: "p", text: "The composite index is sorted by a and then by b within each a, so a query constraining a — or a and b, or a with a sort on b — reads one contiguous range. Separate indexes are each sorted by one column: the database can seek on one and filter the rest, or combine two bitmaps, but it cannot read a ready-ordered range for both." },
          { t: "p", text: "Separate indexes are better when queries filter on a alone and on b alone with similar frequency, since the composite cannot seek on b. So the choice comes from the set of queries — which is why I start from the slow-query log." }
        ] }
    ]
  }
});

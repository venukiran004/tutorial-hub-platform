/* ============================================================================
   LESSON 5.7 — Databases, Chunking and Pushing Work Down
   ========================================================================= */
EC.receiveLesson({
  id: "5.7",

  lede: "**`pd.read_sql(\"SELECT * FROM orders\")` moves fifty million rows across a network to compute a sum the database would have done in a second.** The question for every database read is not \"how do I get the table into pandas\" but \"what is the smallest result the database can hand me\" — and the tools for answering it are the query, the plan, and the index.",

  objectives: [
    "Connect and query with parameters, never with string formatting",
    "Stream a result too large for memory with `chunksize` and server-side cursors",
    "Push filters, joins and aggregation to the database and know why it is faster",
    "Read a query plan well enough to see a missing index",
    "Write results back with the right batch size and transaction shape"
  ],

  prerequisites: ["5.5", "5.6"],

  blocks: [

    { t: "h2", n: "01", text: "Reading from a database", id: "read" },

    { t: "p", text: "`read_sql` runs a query and builds a frame from the result. **Everything about its cost is decided by the query** — how many rows come back, how many columns, and whether the database or pandas does the work. The connection is the boring part." },

    { t: "dl", items: [
      ["`read_sql`", "Run a query, return a frame. Takes a SQLAlchemy engine, a DBAPI connection, or a connection string."],
      ["Parameterised query", "A query with placeholders bound to values by the driver: `WHERE region = %(r)s`. The only correct way to put a value into SQL."],
      ["SQL injection", "What happens when a value is formatted into the query text. `f\"WHERE name = '{name}'\"` with `name = \"'; DROP TABLE orders; --\"` is the canonical example, and a name containing an apostrophe is the everyday one."],
      ["Server-side cursor", "The database holds the result and sends it in pieces on request. Without one, the driver fetches the **entire** result into client memory before pandas sees the first row."],
      ["Pushdown", "Doing filtering, joining and aggregation in the database, so the result crossing the network is as small as possible."],
      ["Query plan", "The database's description of how it will execute a query — which indexes it uses, which tables it scans, and its cost estimate. `EXPLAIN` shows it."]
    ]},

    { t: "code", lang: "python", title: "connecting, parameterising, and the injection that is not hypothetical", code: `
import pandas as pd
from sqlalchemy import create_engine, text

# THE ENGINE -- one per process, reused. It manages a connection pool.
engine = create_engine("postgresql+psycopg://user:pass@host:5432/db")
#
# Credentials do not belong in source. Read them from the environment
# or a secrets manager; the URL above is the shape, not the practice.
#   import os
#   engine = create_engine(os.environ["DATABASE_URL"])

# THE BASIC READ:
df = pd.read_sql("SELECT order_id, amount FROM orders WHERE status = 'paid'", engine)

# PARAMETERS -- the driver binds them; the value never touches the SQL:
region = "north"
df = pd.read_sql(
    text("SELECT * FROM orders WHERE region = :region AND amount > :min_amt"),
    engine,
    params={"region": region, "min_amt": 100},
)
#
# :name is SQLAlchemy's style, portable across drivers. Raw DBAPI
# drivers use %s (psycopg), ? (sqlite), or %(name)s.

# WHY NOT f-STRINGS -- the injection, and the everyday version:
region = "O'Brien's Region"
query = f"SELECT * FROM orders WHERE region = '{region}'"
# SELECT * FROM orders WHERE region = 'O'Brien's Region'
#                                       ^ the apostrophe ends the string
#                                         syntax error at best
#
# And the malicious version:
region = "x' OR '1'='1"
# SELECT * FROM orders WHERE region = 'x' OR '1'='1'   -- every row
#
# The parameterised form handles both: the apostrophe is data, the OR
# is data, and neither becomes SQL. There is no situation in which
# formatting a value into a query is correct.

# A LIST OF VALUES -- expanding bindparam, or a tuple for IN:
from sqlalchemy import bindparam
stmt = text("SELECT * FROM orders WHERE region IN :regions").bindparams(
    bindparam("regions", expanding=True))
df = pd.read_sql(stmt, engine, params={"regions": ["north", "south"]})

# TABLE AND COLUMN NAMES CANNOT BE PARAMETERS. They are identifiers,
# not values. If they must vary, validate against an allowlist and
# format them -- the one place formatting is acceptable, and only
# because the value came from your code, not the user:
ALLOWED = {"orders", "customers"}
table = "orders"
assert table in ALLOWED
df = pd.read_sql(f"SELECT * FROM {table} LIMIT 10", engine)

# read_sql_table AND read_sql_query -- read_sql dispatches to one:
df = pd.read_sql_table("customers", engine, columns=["id", "region"])
#   the whole table, or named columns. Convenient; no WHERE. Fine for
#   a lookup table, wrong for a fact table.

# DTYPES COME FROM THE DATABASE, mostly. A NUMERIC column arrives as
# Decimal objects (object dtype); a DATE as datetime64; a nullable
# INTEGER as float64 if any NULL is present. The same discipline as
# read_csv:
df = pd.read_sql(text("SELECT ..."), engine,
                 dtype={"amount": "float64", "count": "Int64"},
                 parse_dates=["order_date"])
#
# dtype_backend="pyarrow" keeps nullable integers as integers and
# strings as Arrow strings, which for a database read is usually
# right.
`,
      hl: [15, 28, 39, 60],
      caption: "**A region called `O'Brien's` breaks a formatted query before any attacker does.** The apostrophe ends the string. Parameters make the value data and never SQL — there is no situation in which formatting a value into a query is correct."
    },

    { t: "callout", kind: "warn", title: "Formatting a value into SQL is always wrong", body: [
      { t: "p", text: "Not \"risky\" — wrong. It breaks on an apostrophe, it breaks on a percent sign in a LIKE, it breaks on a backslash, and it is the mechanism of every SQL injection. The parameterised form is shorter and handles all of them." },
      { t: "p", text: "**Identifiers — table and column names — are the one exception**, because they cannot be bound. Validate them against an allowlist that your code controls, then format. The value must never have come from outside." },
      { t: "p", text: "A code review that finds an f-string building SQL should reject it on sight, regardless of where the value comes from today." }
    ]},

    { t: "h2", n: "02", text: "Results that do not fit", id: "stream" },

    { t: "code", lang: "python", title: "chunksize, server-side cursors, and what the driver does without them", code: `
# chunksize= RETURNS AN ITERATOR OF FRAMES:
for chunk in pd.read_sql(text("SELECT * FROM events"), engine, chunksize=100_000):
    process(chunk)
#
# THE TRAP: without a server-side cursor, most drivers fetch the
# ENTIRE result into client memory first and then hand it to pandas
# in chunks. The chunking happens AFTER the whole thing has been
# pulled across the network. Memory peaks at the full result; the
# chunks only bound what pandas holds at once.

# A SERVER-SIDE CURSOR makes the database hold the result and send it
# on request:
with engine.connect().execution_options(stream_results=True) as conn:
    for chunk in pd.read_sql(text("SELECT * FROM events"), conn, chunksize=100_000):
        process(chunk)
#
# stream_results=True (SQLAlchemy) opens a named cursor on Postgres, a
# streaming cursor on MySQL. Now each chunk is fetched when asked for,
# and memory is bounded by the chunk. This is the combination that
# actually works on a table larger than RAM.
#
# The cost: the transaction stays open for the whole iteration, and
# the database holds resources for it. Do not hold a streaming cursor
# open while doing slow work per chunk; pull, then process.

# THE ACCUMULATION PATTERN -- same as read_csv chunking (5.1):
totals = {}
with engine.connect().execution_options(stream_results=True) as conn:
    for chunk in pd.read_sql(text("SELECT region, amount FROM orders"),
                             conn, chunksize=500_000):
        for region, s in chunk.groupby("region")["amount"].sum().items():
            totals[region] = totals.get(region, 0.0) + s
#
# Correct, bounded, and STILL THE WRONG APPROACH for this query --
# because the database would compute the same thing in one statement
# without moving a single row:
totals = pd.read_sql(text(
    "SELECT region, SUM(amount) AS total FROM orders GROUP BY region"), engine)
#
# Streaming is for when the ROWS are what you need -- to train a
# model, to write to another system, to apply logic the database
# cannot. It is not for aggregation the database can do.

# KEYSET PAGINATION -- for resumable, bounded reads without a long
# transaction:
last_id = 0
while True:
    chunk = pd.read_sql(text(
        "SELECT * FROM events WHERE id > :last ORDER BY id LIMIT 100000"),
        engine, params={"last": last_id})
    if chunk.empty:
        break
    process(chunk)
    last_id = int(chunk["id"].iloc[-1])
#
# Each query is independent and short. If the job dies at chunk 40,
# it resumes from last_id. Requires an indexed, monotonic key.
#
# NOT OFFSET pagination:
#   LIMIT 100000 OFFSET 4000000
# The database has to SKIP four million rows to find the start of
# each page. Page 40 costs 40x page 1. Keyset uses the index to jump
# straight there.

# WHEN THE RESULT IS SMALL BUT THE QUERY IS SLOW, chunking does
# nothing. The time is in the database. See the next section.
`,
      hl: [5, 13, 34, 55],
      caption: "**Without a server-side cursor, `chunksize` chunks a result that has already been fetched in full.** Memory peaks at the whole result; only `stream_results=True` makes the database hold it and send pieces on request."
    },

    { t: "h2", n: "03", text: "Pushing work down, and reading the plan", id: "pushdown" },

    { t: "p", text: "**The database has the data, the indexes, the statistics and often more cores than your laptop.** Every filter, join and aggregation it does is one that pandas does not have to — and one fewer row crossing the network. The way to see whether it is doing them well is the query plan." },

    { t: "viz",
      title: "Where the work happens",
      caption: "Left: the whole table crosses the network and pandas filters and aggregates 50 million rows. Right: the database does both and sends 4 rows. The network is usually the bottleneck; the difference is the size of what crosses it.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Two flows: SELECT star pulling a whole table to pandas for processing, and a filtered aggregate query pulling a tiny result">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">SELECT * FROM orders</text>
  <rect x="30" y="40" width="130" height="60" rx="6" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line);stroke-width:1.5"/>
  <text x="48" y="66" class="s-sub" style="fill:var(--ink-2)">database</text>
  <text x="48" y="86" class="s-sub" style="fill:var(--ink-3)">scans 50M rows</text>
  <rect x="200" y="56" width="180" height="28" rx="3" style="fill:var(--crit);fill-opacity:.25;stroke:var(--crit);stroke-width:1.5"/>
  <text x="212" y="75" class="s-sub" style="fill:var(--ink-2)">50M rows × 26 cols → 12 GB</text>
  <line x1="160" y1="70" x2="200" y2="70" style="stroke:var(--crit);stroke-width:2" marker-end="url(#pd-c)"/>
  <line x1="380" y1="70" x2="420" y2="70" style="stroke:var(--crit);stroke-width:2" marker-end="url(#pd-c)"/>
  <rect x="420" y="40" width="130" height="60" rx="6" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line);stroke-width:1.5"/>
  <text x="438" y="66" class="s-sub" style="fill:var(--ink-2)">pandas</text>
  <text x="438" y="86" class="s-sub" style="fill:var(--ink-3)">filter, group, sum</text>
  <text x="580" y="60" class="s-sub" style="fill:var(--crit)">minutes on the network,</text>
  <text x="580" y="80" class="s-sub" style="fill:var(--crit)">12 GB of RAM, single core</text>

  <text x="30" y="150" class="s-label" style="fill:var(--good)">SELECT region, SUM(amount) … WHERE … GROUP BY region</text>
  <rect x="30" y="164" width="130" height="60" rx="6" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line);stroke-width:1.5"/>
  <text x="48" y="190" class="s-sub" style="fill:var(--ink-2)">database</text>
  <text x="48" y="210" class="s-sub" style="fill:var(--ink-3)">index, filter, group, sum</text>
  <rect x="200" y="180" width="70" height="28" rx="3" style="fill:var(--good);fill-opacity:.25;stroke:var(--good);stroke-width:1.5"/>
  <text x="212" y="199" class="s-sub" style="fill:var(--ink-2)">4 rows</text>
  <line x1="160" y1="194" x2="200" y2="194" style="stroke:var(--good);stroke-width:2" marker-end="url(#pd-g)"/>
  <line x1="270" y1="194" x2="420" y2="194" style="stroke:var(--good);stroke-width:2" marker-end="url(#pd-g)"/>
  <rect x="420" y="164" width="130" height="60" rx="6" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line);stroke-width:1.5"/>
  <text x="438" y="190" class="s-sub" style="fill:var(--ink-2)">pandas</text>
  <text x="438" y="210" class="s-sub" style="fill:var(--ink-3)">receives the answer</text>
  <text x="580" y="184" class="s-sub" style="fill:var(--good)">under a second, on the</text>
  <text x="580" y="204" class="s-sub" style="fill:var(--good)">database's cores and indexes</text>

  <line x1="30" y1="244" x2="850" y2="244" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="268" class="s-sub" style="fill:var(--ink-3)">Pull rows when you need rows. Pull the answer when you need the answer. The query decides which — and EXPLAIN tells you whether the database is doing it well.</text>

  <defs>
    <marker id="pd-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="pd-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "sql", title: "EXPLAIN: seeing what the database will do", code: `
-- THE PLAN for a query that filters on an unindexed column:
EXPLAIN ANALYZE
SELECT region, SUM(amount)
FROM   orders
WHERE  order_date >= '2026-03-01'
GROUP BY region;

-- HashAggregate  (cost=1250000.00..1250000.04 rows=4 width=40)
--                (actual time=8412.3..8412.3 rows=4 loops=1)
--   Group Key: region
--   ->  Seq Scan on orders  (cost=0.00..1187500.00 rows=25000000 width=12)
--                           (actual time=0.02..6211.8 rows=24998112 loops=1)
--         Filter: (order_date >= '2026-03-01')
--         Rows Removed by Filter: 25001888
-- Execution Time: 8413 ms
--
-- HOW TO READ IT, bottom up:
--   Seq Scan       every row in the table was read -- 50M
--   Filter         the WHERE was applied to each -- 25M removed
--   Rows Removed   half the table read for nothing
--   HashAggregate  the surviving 25M grouped into 4
--   8.4 seconds
--
-- "Seq Scan" with a Filter that removes most rows is the signature
-- of a MISSING INDEX.

CREATE INDEX idx_orders_date ON orders (order_date);

-- THE SAME QUERY:
-- HashAggregate  (actual time=1980.1..1980.1 rows=4)
--   ->  Index Scan using idx_orders_date on orders
--         (actual time=0.05..1420.7 rows=24998112)
--         Index Cond: (order_date >= '2026-03-01')
-- Execution Time: 1981 ms
--
-- Index Scan with an Index Cond: the database jumped to March and
-- read only the rows after it. 4x faster, and the gain grows as the
-- filtered fraction shrinks -- a one-week query on the index reads
-- 2% of the table instead of scanning it.

-- SARGABILITY, AGAIN (see 5.5): the index is used only if the
-- predicate is a direct comparison on the column.
WHERE  order_date >= '2026-03-01'             -- Index Scan
WHERE  EXTRACT(YEAR FROM order_date) = 2026   -- Seq Scan: the function
                                              -- hides the column
WHERE  order_date::text LIKE '2026-03%'       -- Seq Scan
WHERE  amount * 1.2 > 100                     -- Seq Scan; write amount > 83.33

-- A COMPOSITE INDEX for a query that filters on two columns:
CREATE INDEX idx_orders_region_date ON orders (region, order_date);
--
-- Column ORDER matters. This index serves:
--   WHERE region = 'north'                            (leading column)
--   WHERE region = 'north' AND order_date >= ...      (both)
-- and does NOT serve:
--   WHERE order_date >= ...                           (not the leading column)
--
-- Put the equality column first, the range column second. An index on
-- (order_date, region) would serve the date filter alone but not the
-- region filter alone.

-- THE JOIN PLAN:
EXPLAIN ANALYZE
SELECT c.region, SUM(o.amount)
FROM   orders o JOIN customers c ON c.id = o.customer_id
GROUP BY c.region;
--
-- Hash Join  (actual rows=50000000)
--   Hash Cond: (o.customer_id = c.id)
--   ->  Seq Scan on orders o
--   ->  Hash
--         ->  Seq Scan on customers c   (rows=500000)
--
-- Hash Join: build a hash table on the SMALLER side (customers),
-- probe it with each row of the larger. This is the right plan for
-- a big-to-small join, and it needs no index. A Nested Loop over 50M
-- rows would be the wrong plan, and an index on customers.id is what
-- makes the alternative -- Index Nested Loop -- viable when the
-- orders side is filtered down small first.

-- rows= ESTIMATE vs ACTUAL: when they differ by 100x, the statistics
-- are stale and the planner chose badly.
-- ANALYZE orders;        -- refresh statistics (Postgres)

-- THE THINGS TO LOOK FOR IN ANY PLAN:
--   Seq Scan on a large table with a selective Filter   -> missing index
--   Nested Loop with a large outer side                  -> missing index
--                                                            or bad estimate
--   estimated rows off by 100x                           -> stale stats
--   Sort with a large row count                          -> ORDER BY or
--                                                            DISTINCT on
--                                                            unindexed cols
--   Hash Join spilling to disk (Batches: > 1)            -> work_mem too low
`,
      hl: [10, 25, 44, 76],
      caption: "**`Seq Scan` with a `Filter` that removes most rows is the signature of a missing index.** After `CREATE INDEX`, the same query shows `Index Scan` with an `Index Cond` — and the gain grows as the filtered fraction shrinks."
    },

    { t: "ladder",
      title: "Daily revenue by region for the last 90 days, from a 50M-row table",
      rungs: [
        { level: "bad", label: "Pull everything, compute in pandas", code: `df = pd.read_sql("SELECT * FROM orders", engine)
df = df[df.order_date >= cutoff]
out = df.groupby(["region", df.order_date.dt.date])["amount"].sum()`,
          note: "**12 GB across the network into a 32 GB machine**, then a single-core groupby. Minutes at best; out of memory on a bad day. The database read all 50M rows to send them, so it did the scan anyway — just without the benefit." },
        { level: "ok", label: "Filter in SQL, aggregate in pandas", code: `df = pd.read_sql(text("""
    SELECT region, order_date, amount FROM orders
    WHERE order_date >= :cutoff"""), engine, params={"cutoff": cutoff})
out = df.groupby(["region", df.order_date.dt.date])["amount"].sum()`,
          note: "**Three columns and 90 days — perhaps 200 MB — cross the network.** Reasonable, and the pandas groupby is fast at this size. But the database could have done the groupby too, and with an index on `order_date` it would not have scanned the table." },
        { level: "best", label: "Filter and aggregate in SQL; verify with EXPLAIN", code: `out = pd.read_sql(text("""
    SELECT region, order_date::date AS day, SUM(amount) AS revenue
    FROM   orders
    WHERE  order_date >= :cutoff
    GROUP BY region, order_date::date
    ORDER BY region, day"""), engine, params={"cutoff": cutoff})
# EXPLAIN shows Index Scan on idx_orders_date, HashAggregate, ~360 rows out`,
          note: "**360 rows cross the network.** The database uses the index to read 90 days, aggregates on its own cores, and pandas receives the answer. Under a second, and the plan confirms it — which is the step that turns \"should be fast\" into \"is fast\"." }
      ]
    },

    { t: "h2", n: "04", text: "Writing back", id: "write" },

    { t: "code", lang: "python", title: "to_sql, batch size, and the transaction you did not know you opened", code: `
# THE BASIC WRITE:
df.to_sql("daily_revenue", engine, if_exists="append", index=False)
#
# if_exists: "fail" (default), "replace" (DROP and recreate -- loses
# indexes, constraints, permissions), "append".
# index=False, for the same reason as to_csv: the RangeIndex is not
# data.

# "replace" IS DESTRUCTIVE in a way people do not expect: it drops the
# table and creates a new one from the frame's dtypes. Every index,
# foreign key, default and grant on the old table is gone. For a
# managed table, truncate and append instead:
with engine.begin() as conn:
    conn.execute(text("TRUNCATE TABLE daily_revenue"))
    df.to_sql("daily_revenue", conn, if_exists="append", index=False)
#
# engine.begin() is a transaction: both statements commit together or
# neither does. If the to_sql fails halfway, the TRUNCATE rolls back
# and the old data is still there.

# BATCH SIZE -- the difference between minutes and seconds:
df.to_sql("events", engine, if_exists="append", index=False,
          chunksize=10_000, method="multi")
#
# Default: one INSERT per row. 1M rows = 1M round trips.
# chunksize=10_000: 100 round trips.
# method="multi": each round trip is one INSERT with 10,000 VALUES
#   tuples. Much faster on Postgres and MySQL; can exceed a parameter
#   limit on SQL Server (2,100 parameters -> chunksize x columns must
#   stay under it).

# THE FASTEST PATH IS THE DATABASE'S BULK LOADER, not INSERT:
# Postgres COPY, via psycopg:
import io
buf = io.StringIO()
df.to_csv(buf, index=False, header=False)
buf.seek(0)
with engine.raw_connection() as raw:
    with raw.cursor() as cur:
        cur.copy_expert(
            "COPY events (id, ts, amount) FROM STDIN WITH (FORMAT CSV)", buf)
    raw.commit()
#
# 10-50x faster than INSERT for large loads. Every database has an
# equivalent (LOAD DATA, BULK INSERT, bcp). For anything over a
# million rows, this is the tool.

# DTYPE MAPPING: to_sql guesses column types from the frame. object
# columns become TEXT (Postgres) or the widest VARCHAR; float64 becomes
# DOUBLE PRECISION; datetime64 becomes TIMESTAMP. Pass dtype= to
# control it, especially for a new table:
from sqlalchemy import types
df.to_sql("events", engine, if_exists="append", index=False,
          dtype={"id": types.BigInteger, "amount": types.Numeric(12, 2),
                 "region": types.String(16)})
#
# Numeric(12, 2) for money, not DOUBLE PRECISION. A float column
# written as DOUBLE stores 0.1 + 0.2 as 0.30000000000000004, and the
# database will faithfully return it.

# UPSERT -- to_sql cannot. Write to a staging table, then merge:
with engine.begin() as conn:
    df.to_sql("events_staging", conn, if_exists="replace", index=False)
    conn.execute(text("""
        INSERT INTO events (id, ts, amount)
        SELECT id, ts, amount FROM events_staging
        ON CONFLICT (id) DO UPDATE
            SET ts = EXCLUDED.ts, amount = EXCLUDED.amount
    """))
    conn.execute(text("DROP TABLE events_staging"))
#
# Staging table + INSERT ... ON CONFLICT (Postgres) / MERGE (SQL
# Server, Oracle) / ON DUPLICATE KEY UPDATE (MySQL). The staging
# table is what makes the merge one set-based statement instead of
# a row-by-row loop.

# IDEMPOTENCE: a job that appends is a job that double-writes when it
# is re-run. Either upsert on a key, or delete-then-insert the
# partition being written, inside one transaction:
with engine.begin() as conn:
    conn.execute(text("DELETE FROM daily_revenue WHERE day = :d"), {"d": day})
    day_df.to_sql("daily_revenue", conn, if_exists="append", index=False)
#
# Re-running for the same day replaces that day's rows and nothing
# else. This is the shape of every safe batch writer.
`,
      hl: [9, 20, 31, 68],
      caption: "**`if_exists=\"replace\"` drops the table** — every index, constraint, default and grant with it. For a managed table, `TRUNCATE` then append inside one transaction."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Refactor",
      title: "The feature job that pulls the whole warehouse",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A nightly feature job takes four hours and has started failing with out-of-memory errors as the tables grow. Here is the core of it." },
        { t: "code", lang: "python", numbered: false, title: "features_job.py", code: `
def build_features(engine, as_of):
    orders = pd.read_sql("SELECT * FROM orders", engine)                 # 60M rows
    customers = pd.read_sql("SELECT * FROM customers", engine)           # 2M rows
    events = pd.read_sql(f"SELECT * FROM events WHERE ts < '{as_of}'", engine)  # 400M rows

    orders = orders[orders.order_date < as_of]
    recent = orders[orders.order_date >= as_of - pd.Timedelta(days=90)]

    f = customers[["customer_id", "region", "tier"]].copy()
    f["n_orders_90d"] = f.customer_id.map(recent.groupby("customer_id").size())
    f["spend_90d"] = f.customer_id.map(recent.groupby("customer_id").amount.sum())
    f["n_events_30d"] = f.customer_id.map(
        events[events.ts >= as_of - pd.Timedelta(days=30)].groupby("customer_id").size())
    f["last_order_days"] = (as_of - f.customer_id.map(
        orders.groupby("customer_id").order_date.max())).dt.days

    f.to_sql("customer_features", engine, if_exists="replace", index=False)
    return f`},
        { t: "p", text: "Rewrite it so the database does the work, the job is safe to re-run, and the query plan can be checked. Identify every defect in the original, including the ones that are not about performance." }
      ],
      requirements: [
        "Push every filter and aggregation into SQL; pandas receives one row per customer.",
        "Parameterise `as_of`; identify the injection and the correctness problem in the f-string.",
        "Replace `if_exists=\"replace\"` with something that keeps the table's indexes and is idempotent.",
        "Preserve the output: same columns, same semantics.",
        "State which indexes the queries need and how you would confirm they are used.",
        "Include a verification against the original on a small sample."
      ],
      hint: "There are two bugs in the original that have nothing to do with speed. One is in the f-string; the other is in what `.map` does with a customer who has no recent orders.",
      solution: {
        lang: "python",
        title: "features_job_fixed.py",
        code: `import pandas as pd
from sqlalchemy import text


# =========================================================================
# THE DEFECTS
# =========================================================================
#
# PERFORMANCE
#   1. Three SELECT * pulls: 60M + 2M + 400M rows, every column, across
#      the network, into RAM. That is the four hours and the OOM. The
#      database scans the tables to send them anyway, so nothing is
#      saved by doing the filtering in pandas -- it is only moved.
#   2. The orders filter (order_date < as_of) is applied in pandas
#      AFTER the whole table arrived. The events filter is in SQL but
#      on an f-string.
#   3. Four separate groupbys over the same frames, each a full pass.
#
# CORRECTNESS
#   4. f"... WHERE ts < '{as_of}'"  --  as_of is a Timestamp; its str()
#      is "2026-03-01 00:00:00", which happens to parse. But if as_of
#      is ever a date string from a config file, or a user input, it
#      is an injection vector. And the format is implicit: a Timestamp
#      with a timezone renders with an offset that some databases
#      reject. Parameterise.
#   5. f.customer_id.map(recent.groupby(...).size())  --  a customer
#      with no recent orders is NOT in the groupby result, so .map
#      gives NaN. The feature columns are float with NaN where the
#      true value is 0. A model sees "unknown" where it should see
#      "zero orders" -- and NaN != 0 in every downstream comparison.
#   6. if_exists="replace" DROPS customer_features and recreates it
#      from the frame's dtypes. Every index on it is gone. And the
#      job is not idempotent: a re-run for the same as_of after a
#      partial failure has already dropped the previous good table.


# =========================================================================
# THE REWRITE
# =========================================================================

FEATURE_SQL = text("""
WITH recent_orders AS (
    -- 90-day order aggregates, per customer. One pass over the index
    -- range, grouped in the database.
    SELECT   customer_id,
             COUNT(*)      AS n_orders_90d,
             SUM(amount)   AS spend_90d
    FROM     orders
    WHERE    order_date >= :as_of - INTERVAL '90 days'
      AND    order_date <  :as_of
    GROUP BY customer_id
),
last_order AS (
    -- Most recent order date before as_of, per customer.
    SELECT   customer_id,
             MAX(order_date) AS last_order_date
    FROM     orders
    WHERE    order_date < :as_of
    GROUP BY customer_id
),
recent_events AS (
    SELECT   customer_id,
             COUNT(*)      AS n_events_30d
    FROM     events
    WHERE    ts >= :as_of - INTERVAL '30 days'
      AND    ts <  :as_of
    GROUP BY customer_id
)
SELECT   c.customer_id,
         c.region,
         c.tier,
         -- COALESCE: a customer with no recent orders has ZERO, not
         -- NULL. This is defect 5, fixed at the source.
         COALESCE(r.n_orders_90d, 0)              AS n_orders_90d,
         COALESCE(r.spend_90d, 0)                 AS spend_90d,
         COALESCE(e.n_events_30d, 0)              AS n_events_30d,
         -- last_order_days stays NULL for a customer who has never
         -- ordered: there is no honest number for it. The model gets
         -- an explicit missing, not a fabricated 0 or 9999.
         (:as_of::date - l.last_order_date::date) AS last_order_days,
         :as_of                                   AS as_of
FROM     customers c
LEFT JOIN recent_orders r ON r.customer_id = c.customer_id
LEFT JOIN last_order    l ON l.customer_id = c.customer_id
LEFT JOIN recent_events e ON e.customer_id = c.customer_id
ORDER BY c.customer_id
""")


def build_features(engine, as_of):
    as_of = pd.Timestamp(as_of)

    # ONE QUERY. The database does three aggregations and three
    # left joins; pandas receives 2M rows x 8 columns -- about 130 MB
    # -- instead of 460M rows.
    f = pd.read_sql(FEATURE_SQL, engine, params={"as_of": as_of},
                    dtype={"n_orders_90d": "int64", "spend_90d": "float64",
                           "n_events_30d": "int64", "last_order_days": "Int64"})

    # IDEMPOTENT WRITE: delete this as_of's rows and append, in one
    # transaction. Re-running replaces exactly this snapshot; the
    # table, its indexes and every other snapshot survive.
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM customer_features WHERE as_of = :as_of"),
                     {"as_of": as_of})
        f.to_sql("customer_features", conn, if_exists="append", index=False,
                 chunksize=20_000, method="multi")

    return f


# =========================================================================
# THE INDEXES THE QUERY NEEDS, and how to confirm
# =========================================================================
#
#   orders (order_date)                    the two order CTEs range on it
#   orders (customer_id, order_date)       alternative: serves the
#                                          GROUP BY and the range together
#   events (ts)                            the events CTE ranges on it
#   customer_features (as_of)              the DELETE ranges on it
#
# CONFIRM with EXPLAIN ANALYZE on FEATURE_SQL with a real as_of:
#   - each CTE's scan should be an Index Scan / Bitmap Index Scan with
#     an Index Cond on the date column, NOT a Seq Scan with a Filter
#   - the joins to customers should be Hash Joins (customers is the
#     build side, 2M rows) -- not Nested Loops
#   - "Rows Removed by Filter" should be near zero on the date scans
#
# If a CTE shows Seq Scan on orders, the index is missing or the
# predicate is not sargable -- check that :as_of - INTERVAL is being
# evaluated as a constant, not per row.


# =========================================================================
# VERIFICATION AGAINST THE ORIGINAL, on a sample
# =========================================================================
#
# def verify(engine, as_of, sample_customers):
#     ids = tuple(sample_customers)
#     new = build_features_query_only(engine, as_of, ids)      # the SQL, filtered
#     old = original_build_features_in_pandas(engine, as_of, ids)  # the old code,
#                                                                  # on the same ids
#     old = old.fillna({"n_orders_90d": 0, "spend_90d": 0, "n_events_30d": 0})
#     # ^ the original's NaN-for-zero defect, corrected so the comparison
#     #   is against what it SHOULD have produced
#     merged = new.merge(old, on="customer_id", suffixes=("_new", "_old"))
#     for col in ("n_orders_90d", "spend_90d", "n_events_30d", "last_order_days"):
#         assert (merged[col + "_new"].fillna(-1) == merged[col + "_old"].fillna(-1)).all(), col
#
# The fillna on the old output is deliberate and documented: the
# comparison is against corrected semantics, and the correction is
# the one line that names defect 5.


# =========================================================================
# WHAT CHANGED, IN NUMBERS
# =========================================================================
#
#   rows across the network:  460,000,000  ->  2,000,000
#   peak pandas memory:       ~40 GB       ->  ~130 MB
#   wall time:                ~4 h         ->  ~2 min (index-bound)
#   passes over orders:       3 in pandas  ->  2 index range scans in SQL
#   idempotent:               no           ->  yes
#   table indexes preserved:  no           ->  yes
#   NaN where zero was meant: yes          ->  no`,
        notes: [
          { t: "p", text: "**Two of the six defects have nothing to do with speed.** The `.map` onto a groupby result gives NaN for every customer with no recent orders — \"unknown\" where the truth is \"zero\" — and `if_exists=\"replace\"` drops the table and its indexes, and is not safe to re-run." },
          { t: "callout", kind: "insight", title: "COALESCE at the source, not fillna at the end", body: [
            { t: "p", text: "A `LEFT JOIN` to an aggregate gives NULL for customers with no rows in the aggregate. **`COALESCE(..., 0)` in the SELECT turns that into the true value — zero orders — where the original's `.map` silently produced NaN.**" },
            { t: "p", text: "`last_order_days` is deliberately left NULL for a customer who has never ordered. There is no honest number for it, and a fabricated 0 or 9999 would be a different lie." }
          ]},
          { t: "p", text: "**One query replaces three table pulls and four groupbys.** Three CTEs aggregate on the database's cores using the date indexes, three left joins attach them to customers, and pandas receives one row per customer — 130 MB instead of 40 GB." },
          { t: "p", text: "**The f-string was working by accident.** A Timestamp's `str()` happens to parse, but the same line with a date from a config file is an injection vector, and a timezone-aware Timestamp renders with an offset some databases reject. Parameters make both concerns disappear." },
          { t: "p", text: "**Delete-then-append in one transaction is the shape of every safe batch writer.** A re-run for the same `as_of` replaces exactly that snapshot; a failure mid-write rolls back the delete; the table's indexes and every other snapshot survive." },
          { t: "p", text: "**The verification compares against corrected semantics.** The original's NaN-for-zero is fixed in the old output before comparing, and the one `fillna` that does it is the line that names the defect — the test is honest about what \"the same result\" means." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`pd.read_sql(query, engine, chunksize=100_000)` on a 400M-row result still runs out of memory. Why?",
          options: [
            "chunksize is too large",
            "Without a server-side cursor the driver fetches the entire result into client memory first; chunksize only bounds what pandas holds at once",
            "read_sql does not support chunksize",
            "The query needs an index"
          ],
          answer: 1,
          why: "Most drivers pull the whole result across the network before pandas sees the first row. `execution_options(stream_results=True)` opens a server-side cursor so the database sends pieces on request — and even then, if the rows are only needed for an aggregate, the aggregate belongs in the query."
        }
      ]
    }
  ],

  takeaways: [
    "**Everything about a database read's cost is decided by the query** — rows, columns, and where the work happens.",
    "**Formatting a value into SQL is always wrong**: it breaks on an apostrophe before any attacker arrives, and parameters are shorter.",
    "**Identifiers cannot be parameters** — validate against an allowlist your code controls, then format.",
    "**`chunksize` without a server-side cursor chunks a result already fetched in full**; `stream_results=True` makes the database hold it.",
    "**Streaming is for when you need the rows** — to train, to write elsewhere, to apply logic the database cannot. Aggregation belongs in the query.",
    "**Keyset pagination resumes and stays fast; `OFFSET` pagination skips n rows to find page n.**",
    "**`Seq Scan` with a selective `Filter` is the signature of a missing index**; `Index Scan` with an `Index Cond` is what you want to see.",
    "**A predicate is sargable only as a direct comparison on the column** — a function around it forces a scan.",
    "**Composite index column order matters**: equality column first, range column second, and it serves only leading-column queries alone.",
    "**A `LEFT JOIN` to an aggregate gives NULL for absent keys** — `COALESCE` to zero when zero is the truth, and leave NULL when it is not.",
    "**`if_exists=\"replace\"` drops the table and its indexes** — `TRUNCATE` and append, or delete-then-append by partition, in one transaction.",
    "**The database's bulk loader is 10–50× faster than `INSERT`** for large writes; `method=\"multi\"` with a `chunksize` is the middle ground.",
    "**Money is `NUMERIC`, not `DOUBLE PRECISION`** — a float written as double stores `0.30000000000000004` and returns it faithfully."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why must values never be formatted into SQL text?",
        options: [
          "It is slower",
          "A value containing an apostrophe breaks the query, and a crafted value becomes SQL — parameters make the value data and never SQL",
          "SQLAlchemy forbids it",
          "It only matters for user input"
        ],
        answer: 1,
        why: "`O'Brien` ends the string literal; `x' OR '1'='1` returns every row. Both are handled by parameter binding, which is also shorter. Table and column names are the one exception, because they cannot be bound — validate them against an allowlist."
      },
      {
        stem: "A query with `WHERE EXTRACT(YEAR FROM order_date) = 2026` shows `Seq Scan` despite an index on `order_date`. Why?",
        options: [
          "The index is corrupt",
          "The function hides the column, so the index cannot be used — `order_date >= '2026-01-01' AND < '2027-01-01'` is the sargable form",
          "EXTRACT is not supported",
          "The table is too small"
        ],
        answer: 1,
        why: "An index stores `order_date` values; it cannot answer a question about a function of them without evaluating the function on every row. Rewrite the predicate as a direct range on the column and the plan becomes an `Index Scan`."
      },
      {
        stem: "`f.customer_id.map(recent.groupby(\"customer_id\").size())` for a customer with no recent orders gives what?",
        options: [
          "0",
          "NaN — the customer is absent from the groupby result, so map finds nothing; the feature says 'unknown' where the truth is 'zero'",
          "An error",
          "The customer's lifetime count"
        ],
        answer: 1,
        why: "A missing key in a map is NaN, and NaN is not zero in any downstream comparison. The SQL form makes the fix explicit: `LEFT JOIN` to the aggregate, then `COALESCE(count, 0)` — while leaving genuinely unknowable values like days-since-last-order as NULL."
      },
      {
        stem: "What does `to_sql(..., if_exists=\"replace\")` do to an existing table?",
        options: [
          "Truncates it",
          "Drops it and recreates it from the frame's dtypes — every index, constraint, default and grant is lost",
          "Upserts on the primary key",
          "Appends"
        ],
        answer: 1,
        why: "It is a `DROP TABLE` followed by `CREATE TABLE`. For a managed table, `TRUNCATE` then append inside `engine.begin()` keeps the structure and is atomic; for a snapshot table, delete the partition being written and append, so a re-run replaces exactly that partition."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you read a table larger than memory into pandas?",
        strong: "First I would ask whether I need the rows at all — if the goal is an aggregate, the database should compute it and send the answer. If I genuinely need the rows, `chunksize` with a server-side cursor, since without `stream_results=True` the driver fetches everything before pandas sees the first chunk. And I would filter and select columns in the query so what crosses the network is as small as possible.",
        answer: [
          { t: "p", text: "Questioning the premise — do you need the rows — is the senior move; the server-side cursor detail is what shows you have hit the wall." }
        ]
      },
      {
        level: "advanced",
        q: "A query is slow. What do you look at first?",
        strong: "`EXPLAIN ANALYZE`. A `Seq Scan` on a large table with a `Filter` that removes most rows means a missing index — or a predicate that hides the column inside a function so the index cannot be used. Estimated rows off from actual by a hundred-fold means stale statistics. A `Nested Loop` with a large outer side means the planner chose badly, usually for the same reasons. The plan says which; guessing does not.",
        answer: [
          { t: "p", text: "Naming the three signatures — seq scan with filter, bad estimates, nested loop — and what each implies is the concrete version of \"read the plan\"." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make a batch write job safe to re-run?",
        strong: "Make it idempotent on a key. Either upsert — stage the rows and `INSERT ... ON CONFLICT DO UPDATE` in one set-based statement — or delete the partition being written and append, inside a single transaction so a failure rolls back both. Never `if_exists=\"replace\"`, which drops the table with its indexes and leaves nothing if the write fails halfway. And parameterise the partition key; the f-string that works today is the injection tomorrow.",
        answer: [
          { t: "p", text: "The transaction wrapping the delete-and-append is the detail that makes it genuinely safe rather than merely repeatable." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 6.3 — Writing Data: Upsert, Merge and Bulk
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**Reading is most of SQL, but writing is where the data comes from — and the write that arrives twice, the write that must update-or-insert, and the write of ten million rows each have a right shape.** INSERT … SELECT populates from a query; ON CONFLICT turns a duplicate-key error into an update; UPDATE … FROM and DELETE … USING drive changes from another table; RETURNING hands back what was written; and a soft delete keeps the row while hiding it. This lesson executes each against the shop, then measures why the shape of a bulk load matters by a factor of a hundred.",

  objectives: [
    "Write INSERT … SELECT, multi-row INSERT and RETURNING, and use them to populate and inspect in one statement",
    "Upsert with ON CONFLICT DO UPDATE using EXCLUDED, only when something changed, and know what MERGE adds",
    "Drive an UPDATE or DELETE from another table with UPDATE … FROM and DELETE … USING",
    "Choose between hard delete, soft delete and an audit table, and load bulk data in the shape that takes seconds rather than minutes"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "h2", n: "01", text: "INSERT: rows, queries and what came back", id: "insert" },

    { t: "code", lang: "sql", title: "Multi-row INSERT with RETURNING, and INSERT … SELECT to build a summary table (executed)",
      hl: [1, 4, 7, 8],
      code: `INSERT INTO customers (customer_id, name, country, tier, signed_up) VALUES
  (9,  'Nadia', 'FR', 'standard', DATE '2025-05-01'),
  (10, 'Olu',   'NG', 'plus',     DATE '2025-05-02')
RETURNING customer_id, name;
-- 9 | Nadia      10 | Olu             -- the rows as stored, defaults and generated keys included

CREATE TABLE customer_stats (customer_id INTEGER PRIMARY KEY, n_orders INTEGER NOT NULL, revenue NUMERIC(10,2) NOT NULL, updated_at TIMESTAMP NOT NULL);
INSERT INTO customer_stats
SELECT c.customer_id, COUNT(DISTINCT o.order_id), COALESCE(SUM(oi.qty * oi.unit_price), 0), TIMESTAMP '2025-07-01 00:00:00'
FROM   customers c
LEFT JOIN orders o       ON o.customer_id = c.customer_id AND o.status = 'paid'
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.customer_id;                                     -- 10 rows`,
      caption: "Name the columns in every INSERT: a table whose columns are later reordered or extended will break a positional INSERT silently or loudly, and a named one keeps working. RETURNING is how you get a generated key without a second round trip."
    },

    { t: "table",
      head: ["customer_id", "n_orders", "revenue", "updated_at"],
      rows: [
        ["1", "3", "234.50", "2025-07-01 00:00:00"],
        ["2", "2", "112.50", "2025-07-01 00:00:00"],
        ["3", "1", "32.00", "2025-07-01 00:00:00"],
        ["4", "1", "139.00", "2025-07-01 00:00:00"],
        ["5", "2", "137.90", "2025-07-01 00:00:00"],
        ["6", "1", "42.00", "2025-07-01 00:00:00"],
        ["7", "0", "0.00", "2025-07-01 00:00:00"],
        ["8", "0", "0.00", "2025-07-01 00:00:00"],
        ["9", "0", "0.00", "2025-07-01 00:00:00"],
        ["10", "0", "0.00", "2025-07-01 00:00:00"]
      ]
    },

    { t: "p", text: "The LEFT JOINs with the status filter in the ON clause (2.2) are what give Iker, Mara and the two new customers a zero row instead of no row — a summary table that omits the customers with nothing to summarise is a summary table that will later be LEFT JOINed and COALESCEd by everyone who uses it." },

    { t: "h2", n: "02", text: "Upsert: ON CONFLICT and EXCLUDED", id: "upsert" },

    { t: "p", text: "An order feed re-delivers order 101 with a new status and delivers order 113 for the first time, in the same batch. A plain INSERT fails on 101's primary key and inserts nothing. **`ON CONFLICT (key) DO UPDATE` keeps the insert for new rows and turns the duplicate into an update, with `EXCLUDED` naming the row that would have been inserted.** A WHERE on the DO UPDATE skips rows where nothing changed, so `updated_at` and triggers fire only for real changes." },

    { t: "code", lang: "sql", title: "One statement, both cases; then the same delivery again (executed on SQLite; PostgreSQL syntax identical)",
      hl: [4, 5, 10, 11, 14],
      code: `INSERT INTO orders (order_id, customer_id, placed_at, status) VALUES
  (101, 2, TIMESTAMP '2025-01-06 14:03:00', 'refunded'),         -- exists: was 'paid'
  (113, 9, TIMESTAMP '2025-07-02 09:00:00', 'paid')              -- new
ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status
RETURNING order_id, status;
-- 101 | refunded        113 | paid              -- one updated, one inserted, both returned

-- the feed re-sends 113 unchanged: skip the update when nothing differs
INSERT INTO orders VALUES (113, 9, TIMESTAMP '2025-07-02 09:00:00', 'paid')
ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status
WHERE orders.status IS DISTINCT FROM EXCLUDED.status;            -- 0 rows changed
-- and when the rule is "first delivery wins":
INSERT INTO orders VALUES (113, 9, TIMESTAMP '2025-07-02 09:00:00', 'paid')
ON CONFLICT DO NOTHING;                                          -- 0 rows changed, no error

-- MySQL:   INSERT ... ON DUPLICATE KEY UPDATE status = VALUES(status)
-- SQLite:  identical to PostgreSQL, with "excluded" in lower case; both need a UNIQUE or PRIMARY KEY on the conflict columns`,
      caption: "The conflict target must be a unique index or primary key; that is what makes the upsert atomic, with no check-then-insert race (6.2). `IS DISTINCT FROM` rather than `<>` so a NULL-to-value change counts as a change."
    },

    { t: "code", lang: "sql", title: "The summary table as an upsert: the same statement every day (executed on DuckDB)",
      hl: [1, 5, 6],
      code: `INSERT INTO customer_stats
SELECT o.customer_id, COUNT(DISTINCT o.order_id), SUM(oi.qty * oi.unit_price), TIMESTAMP '2025-07-03 00:00:00'
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE  o.status = 'paid' GROUP BY o.customer_id
ON CONFLICT (customer_id) DO UPDATE SET n_orders = EXCLUDED.n_orders, revenue = EXCLUDED.revenue, updated_at = EXCLUDED.updated_at
WHERE  customer_stats.n_orders IS DISTINCT FROM EXCLUDED.n_orders OR customer_stats.revenue IS DISTINCT FROM EXCLUDED.revenue;
-- run after Chen's new order 112 (45.00): row 3 becomes 2 | 77.00, every other row untouched, updated_at moves only on row 3`,
      caption: "This is the idempotent load from 6.1 in its upsert form: the statement is the same on the first day and the hundredth, and a re-run changes nothing. The WHERE keeps `updated_at` truthful."
    },

    { t: "dl", items: [
      ["`RETURNING`", "Clause on INSERT, UPDATE and DELETE that returns the affected rows — generated keys, defaults, the state before deletion. PostgreSQL, SQLite, DuckDB, MariaDB; SQL Server uses `OUTPUT`, Oracle `RETURNING INTO`."],
      ["`ON CONFLICT`", "PostgreSQL, SQLite and DuckDB upsert. `DO NOTHING` ignores the duplicate; `DO UPDATE SET …` changes the existing row; `EXCLUDED` is the row that was proposed."],
      ["`MERGE`", "Standard SQL statement matching a target against a source with WHEN MATCHED / WHEN NOT MATCHED [BY SOURCE] branches, each of which may update, insert or delete. PostgreSQL 15+, SQL Server, Oracle, BigQuery, Snowflake, DuckDB."],
      ["`UPDATE … FROM`", "PostgreSQL / SQLite / DuckDB form of an update driven by a join. MySQL writes `UPDATE t JOIN s ON … SET …`; the standard uses a correlated subquery per column."],
      ["Soft delete", "A `deleted_at` timestamp instead of a DELETE. The row stays for audit and undo; every query must filter it out — usually through a view."],
      ["Audit table", "A separate table receiving a row per change (old values, new values, who, when), populated by a trigger or by the application. The answer to 'what was this yesterday'."]
    ]},

    { t: "h2", n: "03", text: "UPDATE … FROM, DELETE … USING, MERGE", id: "from" },

    { t: "code", lang: "sql", title: "Changes driven by another table (executed)",
      hl: [2, 3, 4, 5, 11, 15, 16, 17],
      code: `-- refresh only the summary rows that are stale: the derived table t is joined to the target
UPDATE customer_stats s SET n_orders = t.n, revenue = t.rev, updated_at = TIMESTAMP '2025-07-02 00:00:00'
FROM  (SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS n, SUM(oi.qty * oi.unit_price) AS rev
       FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY o.customer_id) t
WHERE t.customer_id = s.customer_id AND (s.n_orders <> t.n OR s.revenue <> t.rev);
-- after Chen's order 112: 1 row -> 3 | 2 | 77.00 | 2025-07-02 00:00:00

-- delete the line items of cancelled orders, then the orders: children first, because of the foreign key
DELETE FROM order_items USING orders
WHERE  order_items.order_id = orders.order_id AND orders.status = 'cancelled'
RETURNING order_items.order_id, product_id;                     -- 107 | 10
DELETE FROM orders WHERE status = 'cancelled' RETURNING order_id, customer_id;   -- 107 | 7

-- MERGE: one statement for update-or-insert from a staging table, with the branches spelled out
MERGE INTO customers c USING stg s ON c.customer_id = s.customer_id
WHEN MATCHED     THEN UPDATE SET tier = s.tier
WHEN NOT MATCHED THEN INSERT (customer_id, name, country, tier, signed_up) VALUES (s.customer_id, s.name, s.country, s.tier, s.signed_up);
-- Bruno (matched) -> plus; Priya (not matched) -> inserted.   2 rows`,
      caption: "MERGE reads as the business rule — 'if it exists do this, otherwise that' — and can add WHEN NOT MATCHED BY SOURCE THEN DELETE for a full synchronisation. ON CONFLICT is simpler and atomic against concurrent inserts; MERGE in PostgreSQL is not, and can raise a unique violation under a race, so prefer ON CONFLICT for concurrent upserts and MERGE for batch synchronisation."
    },

    { t: "h2", n: "04", text: "Delete, soft delete, audit", id: "delete" },

    { t: "table",
      head: ["Approach", "What happens", "Costs", "Use when"],
      rows: [
        ["Hard DELETE", "The row is gone; foreign keys either block it, cascade, or set null", "No undo; history lost; cascades can remove far more than intended", "Transient data — sessions, staging, expired tokens — and legal erasure requests"],
        ["Soft delete (`deleted_at`)", "A timestamp is set; the row remains", "Every query needs `WHERE deleted_at IS NULL`; unique constraints must include it or use a partial index; tables grow", "Business entities where undo and 'who deleted this' matter — customers, orders, documents"],
        ["Audit table", "Every change writes old and new values to a log table", "Write amplification; a trigger or application discipline; the log needs its own retention", "Regulated data and anything where 'what was this on Tuesday' is a real question"],
        ["Archive table", "Old rows moved to a cheaper table, then deleted (6.1 exercise)", "Two places to query; a moving job to run", "Large tables where old rows are rarely read but must be kept"]
      ]
    },

    { t: "code", lang: "sql", title: "Soft delete, and the view that keeps every query honest (executed)",
      hl: [1, 2, 5, 8],
      code: `ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP;
UPDATE customers SET deleted_at = TIMESTAMP '2025-07-03 12:00:00' WHERE customer_id = 10;
SELECT COUNT(*) AS live FROM customers WHERE deleted_at IS NULL;   -- 9 (of 10)

CREATE VIEW live_customers AS SELECT * FROM customers WHERE deleted_at IS NULL;   -- queries use the view; the table is for admin

-- uniqueness that survives soft delete: an email may be reused after the old account is deleted
CREATE UNIQUE INDEX customers_email_live ON customers (email) WHERE deleted_at IS NULL;   -- PostgreSQL / SQLite partial index

-- audit by trigger (PostgreSQL): every UPDATE writes the old and new row as JSON
CREATE TABLE customers_audit (audit_id BIGSERIAL PRIMARY KEY, customer_id INT, old_row JSONB, new_row JSONB, changed_by TEXT, changed_at TIMESTAMPTZ DEFAULT now());
CREATE OR REPLACE FUNCTION customers_audit_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO customers_audit (customer_id, old_row, new_row, changed_by) VALUES (OLD.customer_id, to_jsonb(OLD), to_jsonb(NEW), current_user); RETURN NEW; END $$;
CREATE TRIGGER customers_audit AFTER UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION customers_audit_fn();`,
      caption: "The partial unique index is the detail people miss: a plain UNIQUE (email) would refuse a new sign-up with a soft-deleted account's address. The trigger is the only way to guarantee the audit covers every path, including the DBA's console."
    },

    { t: "callout", kind: "warn", title: "ON DELETE CASCADE deletes what you did not look at", body: [
      { t: "p", text: "A foreign key declared `ON DELETE CASCADE` makes deleting a customer delete their orders, whose cascade deletes their items, whose cascade deletes whatever references those. Correct for true ownership — an order's items cannot exist without the order. **Wrong for anything that is merely related**: deleting a product should not delete the historical orders that contained it. Default to `ON DELETE RESTRICT` (the error you saw in 6.1) and cascade only along ownership edges, deliberately (6.4)." }
    ]},

    { t: "h2", n: "05", text: "Bulk: the shape of the load", id: "bulk" },

    { t: "table",
      head: ["20,000 rows into SQLite (WAL, synchronous = FULL)", "Time"],
      rows: [
        ["Autocommit, one INSERT per row — 20,000 commits", "**41,599 ms**"],
        ["One transaction, one INSERT per row", "372 ms"],
        ["One transaction, `executemany`", "263 ms"],
        ["One transaction, multi-row VALUES, 500 rows per statement", "240 ms"]
      ]
    },

    { t: "p", text: "**The transaction is the whole story: 112× between the first two rows, and everything after that is within a factor of 1.5.** Per-row autocommit pays a durable flush per row (6.1). Once the rows share a transaction, the remaining gains are from fewer round trips and fewer statement parses — real, but modest. The bulk-load facilities go further by skipping the SQL layer entirely: PostgreSQL's `COPY`, MySQL's `LOAD DATA`, DuckDB's `read_csv`, and every client library's `copy_from` / `copy_expert`." },

    { t: "code", lang: "sql", title: "The fast paths",
      hl: [2, 5, 8, 12],
      code: `-- PostgreSQL: COPY streams a file or stdin straight into the table; the fastest possible load
COPY events (event_id, customer_id, event_type, occurred_at) FROM '/data/events_2025_07_01.csv' WITH (FORMAT csv, HEADER true);

-- load into a staging table first, so a bad row fails the copy rather than the live table, then upsert in one statement
COPY events_stage FROM STDIN WITH (FORMAT csv);
INSERT INTO events SELECT * FROM events_stage ON CONFLICT (event_id) DO NOTHING;

-- DuckDB reads the file as a table; no load step at all for analysis
INSERT INTO events SELECT * FROM read_csv('events_2025_07_01.csv');
CREATE TABLE events AS SELECT * FROM read_parquet('events/*.parquet');

-- for very large loads: drop or disable secondary indexes, load, then rebuild (5.3: 4 indexes made inserts 5x slower)
DROP INDEX events_customer_idx; COPY ...; CREATE INDEX events_customer_idx ON events (customer_id);`,
      caption: "The staging-then-upsert pattern combines the speed of COPY with the idempotency of ON CONFLICT. Rebuilding an index after a load is one sorted pass; maintaining it during the load is one random write per row."
    },

    { t: "ladder",
      title: "Applying a daily order feed",
      rungs: [
        { level: "bad", label: "Row-by-row, check then act", code: `for row in feed:
    if cur.execute("SELECT 1 FROM orders WHERE order_id = %s", (row.id,)).fetchone():
        cur.execute("UPDATE orders SET status = %s WHERE order_id = %s", (row.status, row.id))
    else:
        cur.execute("INSERT INTO orders VALUES (%s, %s, %s, %s)", row)`,
          note: "**Three round trips per row, a commit per row, and a race between the SELECT and the INSERT.** Minutes for what should take a second, and occasionally a duplicate-key error." },
        { level: "ok", label: "One statement per row, one transaction", code: `with conn.transaction():
    cur.executemany("""INSERT INTO orders VALUES (%s, %s, %s, %s)
                       ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status""", feed)`,
          note: "**Atomic, race-free and a hundred times faster.** Still one statement per row over the wire." },
        { level: "best", label: "Stage with COPY, upsert with one statement, return what changed", code: `with conn.transaction():
    cur.execute("CREATE TEMP TABLE feed (LIKE orders) ON COMMIT DROP")
    with cur.copy("COPY feed FROM STDIN") as cp:
        for row in feed: cp.write_row(row)
    cur.execute("""INSERT INTO orders SELECT * FROM feed
                   ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status
                   WHERE orders.status IS DISTINCT FROM EXCLUDED.status
                   RETURNING order_id""")
    changed = cur.fetchall()`,
          note: "**One stream in, one set-based upsert, a list of what actually changed.** The temp table also lets you validate the feed with a query before touching the live table." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Product price changes with history",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "A daily file of `(product_id, name, category, unit_price)` arrives. Write the SQL to apply it so that: new products are inserted; changed prices update `products` and also append a row to `price_history (product_id, unit_price, valid_from)`; unchanged products cause no writes at all; and the statement returns the ids whose price changed. Use PostgreSQL and a staging table `stg_products` with the same columns." }
      ],
      requirements: [
        "One transaction.",
        "No write for an unchanged product.",
        "History appended only on a price change, not on a name change.",
        "The set of changed product ids returned."
      ],
      hint: "A data-modifying CTE (4.2) can chain the upsert and the history insert: upsert with RETURNING the old and new price, then insert into history from that.",
      solution: {
        lang: "sql",
        title: "apply_products.sql",
        code: `BEGIN;

WITH changed AS (
  INSERT INTO products (product_id, name, category, unit_price)
  SELECT product_id, name, category, unit_price FROM stg_products
  ON CONFLICT (product_id) DO UPDATE
    SET name = EXCLUDED.name, category = EXCLUDED.category, unit_price = EXCLUDED.unit_price
    WHERE products.name       IS DISTINCT FROM EXCLUDED.name
       OR products.category   IS DISTINCT FROM EXCLUDED.category
       OR products.unit_price IS DISTINCT FROM EXCLUDED.unit_price       -- unchanged rows: no write, no RETURNING row
  RETURNING product_id, unit_price, (xmax = 0) AS inserted                -- PostgreSQL idiom: xmax = 0 means a fresh insert
),
priced AS (
  SELECT c.product_id, c.unit_price
  FROM   changed c
  WHERE  c.inserted
     OR  c.unit_price IS DISTINCT FROM (SELECT unit_price FROM price_history h
                                        WHERE h.product_id = c.product_id ORDER BY valid_from DESC LIMIT 1)
)
INSERT INTO price_history (product_id, unit_price, valid_from)
SELECT product_id, unit_price, now() FROM priced
RETURNING product_id;

COMMIT;`,
        notes: [
          { t: "p", text: "**The WHERE on DO UPDATE is what makes unchanged rows free**: they produce no update and therefore no RETURNING row, so the CTE downstream sees only inserts and real changes." },
          { t: "p", text: "**A name-only change reaches `changed` but not `priced`**, because the second CTE compares against the latest history price. Comparing against history rather than against the pre-update products row is necessary because RETURNING sees the new values; the `xmax = 0` trick distinguishes inserts, which always get a first history row." },
          { t: "p", text: "**Everything is one statement in one transaction**, so a failure anywhere leaves products and history consistent with each other — the point of 6.1." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why is a 20,000-row load 112× slower in autocommit than in one transaction, when the SQL is identical?",
          options: [
            "Autocommit disables the query planner",
            "Each autocommit statement is a transaction that must flush the log to disk before returning; one transaction flushes once",
            "The rows are parsed twice",
            "Autocommit uses a different table format"
          ],
          answer: 1,
          why: "The measured numbers were 41,599 ms against 372 ms. Everything after that — executemany, multi-row VALUES, COPY — is a further 1.5× at most."
        }
      ]
    }
  ],

  takeaways: [
    "**Name the columns in every INSERT** and use **RETURNING** to get generated keys and stored values without a second query.",
    "**INSERT … SELECT populates from a query**; with LEFT JOINs it includes the zero rows a summary table needs.",
    "**`ON CONFLICT (key) DO UPDATE SET … = EXCLUDED.…` is the atomic upsert**; add `WHERE target.col IS DISTINCT FROM EXCLUDED.col` to skip unchanged rows; `DO NOTHING` for first-delivery-wins.",
    "**The conflict target must be unique or primary** — that uniqueness is what makes the upsert race-free.",
    "**UPDATE … FROM and DELETE … USING drive changes from another table**; children before parents on delete.",
    "**MERGE spells out matched / not matched branches** and suits batch synchronisation; ON CONFLICT is safer under concurrency.",
    "**Soft delete needs a view and a partial unique index**; an audit table needs a trigger to be complete.",
    "**Cascade only along ownership edges**; default to RESTRICT.",
    "**One transaction is the whole bulk story (112×)**; then COPY / LOAD DATA / read_csv, staging tables, and rebuilding indexes after the load."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `EXCLUDED` refer to in `ON CONFLICT DO UPDATE SET tier = EXCLUDED.tier`?",
        options: [
          "The existing row in the table",
          "The row that the INSERT proposed and that conflicted — its values are used to update the existing row",
          "Rows excluded by the WHERE clause",
          "The primary key"
        ],
        answer: 1,
        why: "EXCLUDED is the would-be-inserted row; the table name refers to the existing row. `WHERE customers.tier IS DISTINCT FROM EXCLUDED.tier` compares the two."
      },
      {
        stem: "Why must the ON CONFLICT target be a unique index or primary key?",
        options: [
          "For syntax reasons only",
          "Because the uniqueness is what lets the database detect the conflict atomically under concurrency; without it two inserts could both succeed and the upsert would be a check-then-insert race",
          "To speed up the insert",
          "It does not have to be"
        ],
        answer: 1,
        why: "The upsert's correctness rests on the index. A non-unique column cannot define 'the row this conflicts with'."
      },
      {
        stem: "A soft-deleted account's email must be reusable by a new sign-up. What does the uniqueness constraint look like?",
        options: [
          "UNIQUE (email)",
          "A partial unique index: UNIQUE (email) WHERE deleted_at IS NULL — uniqueness among live rows only",
          "UNIQUE (email, deleted_at)",
          "No constraint; check in the application"
        ],
        answer: 1,
        why: "UNIQUE (email, deleted_at) would allow two live accounts (both NULL — NULLs are distinct in most engines). The partial index is exactly 'unique among the living'."
      },
      {
        stem: "When is MERGE preferable to ON CONFLICT?",
        options: [
          "Always; it is standard SQL",
          "For batch synchronisation where several branches are needed — matched update, not-matched insert, not-matched-by-source delete — and concurrent inserts are not a concern",
          "Never",
          "For single-row upserts under high concurrency"
        ],
        answer: 1,
        why: "MERGE is the expressive tool for reconciling two tables; ON CONFLICT is the atomic tool for concurrent upserts. PostgreSQL's MERGE can raise a unique violation under a race that ON CONFLICT handles."
      },
      {
        stem: "Which makes the biggest difference when loading a million rows?",
        options: [
          "Using executemany instead of a loop",
          "Wrapping the load in one transaction (or a few large ones) rather than committing per row; after that, COPY-style bulk paths and deferring index builds",
          "Multi-row VALUES",
          "Increasing the connection pool"
        ],
        answer: 1,
        why: "The measured gap was 112× for the transaction and 1.5× for everything else combined. Fix the commits first."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you implement an upsert, and what makes it safe?",
        strong: "INSERT … ON CONFLICT (key) DO UPDATE SET col = EXCLUDED.col in PostgreSQL, SQLite and DuckDB; ON DUPLICATE KEY UPDATE in MySQL; MERGE where that is the idiom. The conflict target must be a unique index or primary key — that is what makes it atomic: the database detects the duplicate under the index's lock, so two concurrent upserts of the same key serialise correctly with no check-then-insert race. I add a WHERE on the DO UPDATE comparing with IS DISTINCT FROM so unchanged rows produce no write, and RETURNING to learn what actually changed. For batches I stage with COPY and upsert in one set-based statement.",
        answer: [
          { t: "p", text: "The uniqueness-equals-atomicity point and the IS DISTINCT FROM guard separate this from a syntax recital." }
        ]
      },
      {
        level: "core",
        q: "Hard delete or soft delete?",
        strong: "It depends on whether anyone will ask for the row back or ask who removed it. For transient data — sessions, staging, tokens — hard delete, with foreign keys set to RESTRICT so nothing cascades by accident. For business entities I prefer a deleted_at timestamp: the row survives for audit and undo, a view hides it from normal queries, and uniqueness becomes a partial unique index over live rows so an email can be reused. Where the history of every change matters, an audit table fed by a trigger, because a trigger catches every path including manual fixes. And I keep erasure requests in mind: a soft delete is not deletion under GDPR, so those need a real delete or anonymisation.",
        answer: [
          { t: "p", text: "Partial unique index, view, trigger, and the GDPR caveat — that is a considered answer." }
        ]
      },
      {
        level: "advanced",
        q: "A nightly load of ten million rows takes four hours. Where do you look?",
        strong: "First the commit pattern: if it is per-row autocommit, that alone is a hundredfold — batch into transactions of tens of thousands of rows. Second the path: replace per-row INSERTs with COPY or the engine's bulk loader into a staging table, then one set-based INSERT … SELECT or upsert into the target. Third the indexes and constraints: each secondary index is a random write per row; drop and rebuild them after the load, and consider disabling or deferring foreign key checks where the staging validation has already proved the data. Fourth, whether the load can be partitioned by day so it replaces a partition rather than upserting into a large table. I would expect four hours to become a few minutes from the first two steps alone.",
        answer: [
          { t: "p", text: "Commits, bulk path, indexes, partitioning — in that order, with the expected magnitudes." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 6.1 — Transactions and ACID
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**A transaction is a promise that a group of statements either all happen or none of them do — and that once the database says they happened, they stay happened.** Move money between two accounts, archive rows and delete them, load a day's data and update the summary: each is several statements that must not be observed half-done. ACID is the four-part contract the database makes to keep that promise, and each letter is enforced by a different mechanism you can name. The practical consequence for a pipeline is one word: idempotent.",

  objectives: [
    "Use BEGIN, COMMIT, ROLLBACK and SAVEPOINT, and say what autocommit changes",
    "State what each ACID property guarantees and which mechanism in the engine provides it",
    "Recognise the write-ahead log as the reason durability costs a disk flush per commit",
    "Design a data-loading step that can be re-run safely — idempotency as the pipeline's version of atomicity"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "BEGIN, COMMIT, ROLLBACK", id: "begin" },

    { t: "p", text: "`BEGIN` opens a transaction; every statement until `COMMIT` or `ROLLBACK` belongs to it. Inside, the transaction sees its own changes; outside, nobody sees them until COMMIT. **A ROLLBACK undoes every statement since BEGIN as if they had not run.** A SAVEPOINT is a bookmark inside the transaction: `ROLLBACK TO SAVEPOINT` undoes back to the bookmark and leaves the rest of the transaction open — the tool for 'try this step, and if it fails, skip it and carry on'." },

    { t: "code", lang: "sql", title: "A transaction with a savepoint, and a rollback that undoes a delete (SQLite, executed)",
      hl: [1, 3, 5, 6, 12, 14],
      code: `BEGIN;
UPDATE customers SET tier = 'plus' WHERE customer_id = 5;          -- Emeka
SAVEPOINT before_bruno;
UPDATE customers SET tier = 'plus' WHERE customer_id = 2;          -- Bruno
ROLLBACK TO SAVEPOINT before_bruno;                                 -- undo Bruno only; Emeka's change stays pending
COMMIT;                                                             -- Emeka's change becomes permanent
SELECT customer_id, name, tier FROM customers WHERE customer_id IN (2, 5);
-- 2 | Bruno | standard        <- rolled back to the savepoint
-- 5 | Emeka | plus            <- committed

BEGIN;
DELETE FROM order_items WHERE order_id = 107;
DELETE FROM orders WHERE status = 'cancelled';
SELECT COUNT(*) FROM orders;                                        -- 11: the transaction sees its own delete
ROLLBACK;
SELECT COUNT(*) FROM orders;                                        -- 12: nobody else ever saw 11

-- DuckDB and MySQL DDL: no SAVEPOINT in DuckDB; MySQL commits implicitly before most DDL -- a CREATE TABLE inside a
-- transaction commits everything before it. PostgreSQL DDL is transactional: a migration can be rolled back whole.`,
      caption: "The SELECT inside the second transaction returned 11 and the one after the rollback returned 12 — the transaction's own view versus everyone else's. Transactional DDL is a PostgreSQL feature worth knowing: a failed migration leaves nothing half-applied."
    },

    { t: "dl", items: [
      ["Transaction", "A sequence of statements executed as one unit: all committed, or all rolled back. Delimited by BEGIN and COMMIT / ROLLBACK."],
      ["Autocommit", "The default mode of most clients: every statement is its own transaction, committed as soon as it finishes. Two statements that must succeed together need an explicit BEGIN."],
      ["`SAVEPOINT`", "A named point inside a transaction. `ROLLBACK TO SAVEPOINT name` undoes back to it without ending the transaction; `RELEASE SAVEPOINT` discards the bookmark."],
      ["Write-ahead log (WAL)", "A sequential journal of every change, flushed to disk before a COMMIT is acknowledged. Crash recovery replays it; replicas stream it. The reason a commit costs an fsync."],
      ["Idempotent", "An operation whose repetition has the same effect as doing it once. A load step that can be re-run after a failure without duplicating rows."],
      ["Aborted transaction", "In PostgreSQL, any error inside a transaction aborts it: every further statement fails until ROLLBACK. A SAVEPOINT before the risky statement lets you recover instead."]
    ]},

    { t: "h2", n: "02", text: "The four letters, and what enforces each", id: "acid" },

    { t: "table",
      head: ["Property", "Guarantee", "Mechanism", "What breaks it"],
      rows: [
        ["**A**tomicity", "All of the transaction's changes take effect, or none do", "Undo information — old row versions under MVCC, or an undo log — applied on ROLLBACK or crash recovery", "Autocommit: two statements that were meant to be one unit and are not"],
        ["**C**onsistency", "The database moves from one valid state to another: every constraint holds at commit", "Constraints checked at statement or commit time — PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL (6.4)", "Constraints that were never declared: consistency the database cannot enforce is the application's problem"],
        ["**I**solation", "Concurrent transactions do not see each other's partial work", "MVCC snapshots and locks; the isolation level decides which anomalies are allowed (6.2)", "READ COMMITTED's non-repeatable reads and lost updates, when the code assumed SERIALIZABLE"],
        ["**D**urability", "A committed transaction survives a crash", "The write-ahead log flushed to disk before COMMIT returns; replication for surviving a disk", "`synchronous_commit = off`; a replica that has not received the WAL; a disk that lies about fsync"]
      ]
    },

    { t: "viz",
      title: "Where each guarantee lives",
      caption: "Atomicity and durability are the log: undo for rollback, redo for recovery. Consistency is the constraints checked on the way in. Isolation is the snapshot each transaction reads from and the locks it takes when it writes.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A transaction box in the centre with four labelled arrows: to a constraints gate for consistency, to a write-ahead log for atomicity and durability, to a snapshot and locks block for isolation, and a crash-recovery arrow from the log back to the data files.">
  <defs>
    <marker id="ac-ah-61" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <rect x="340" y="90" width="200" height="70" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="440" y="118" class="s-label" text-anchor="middle" style="font-weight:600">transaction</text>
  <text x="440" y="140" class="s-sub" text-anchor="middle">BEGIN … COMMIT</text>
  <g stroke-width="1.4">
    <rect x="40" y="90" width="180" height="70" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="660" y="90" width="190" height="70" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="340" y="200" width="200" height="44" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="340" y="16" width="200" height="44" rx="8" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="130" y="116" style="fill:var(--warn)">constraints</text>
    <text x="755" y="116" style="fill:var(--good)">write-ahead log</text>
    <text x="440" y="228">snapshot + locks</text>
    <text x="440" y="44" style="fill:var(--crit)">crash</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="130" y="140">Consistency · checked on write</text>
    <text x="755" y="140">Atomicity (undo) · Durability (redo)</text>
    <text x="440" y="180">Isolation · what others see</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="340" y1="125" x2="220" y2="125" marker-end="url(#ac-ah-61)"/>
    <line x1="540" y1="125" x2="660" y2="125" marker-end="url(#ac-ah-61)"/>
    <line x1="440" y1="160" x2="440" y2="200" marker-end="url(#ac-ah-61)"/>
    <path d="M755,90 C755,40 560,38 540,38" marker-end="url(#ac-ah-61)"/>
  </g>
  <text x="600" y="30" class="s-sub" text-anchor="middle">recovery replays the log</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Durability has a price", id: "durability" },

    { t: "p", text: "COMMIT does not return until the transaction's log records are on durable storage — an `fsync`, which on a spinning disk is milliseconds and on an SSD is still far slower than memory. **That is why ten thousand single-row inserts in autocommit take minutes and the same rows in one transaction take seconds**: one flush per commit against one flush in total. It is also the dial that trades safety for speed: `synchronous_commit = off` acknowledges before the flush and can lose the last few hundred milliseconds of commits in a crash — acceptable for a metrics table, not for an order." },

    { t: "code", lang: "sql", title: "One transaction versus ten thousand, and the dial",
      hl: [1, 5, 10],
      code: `-- autocommit: 10,000 INSERTs, 10,000 commits, 10,000 log flushes                  ~ 40-120 s on a network disk
INSERT INTO events VALUES (...);   -- x 10,000

-- one transaction: 10,000 INSERTs, one commit, one flush                             ~ 1-2 s
BEGIN;
INSERT INTO events VALUES (...);   -- x 10,000, or one multi-row INSERT, or COPY (7.1)
COMMIT;

-- the trade: acknowledge before the flush. A crash can lose the last ~600 ms of commits; nothing is corrupted.
SET synchronous_commit = off;      -- per session or per transaction: fine for logs and metrics, never for money
-- PostgreSQL also batches: several concurrent commits share one flush (group commit), which is why throughput
-- rises with concurrency even at full durability`,
      caption: "Batch writes into transactions of a few thousand rows: large enough to amortise the flush, small enough that a failure re-runs a bounded chunk and locks are held briefly (5.6). The dial exists for data whose last half-second is not worth a disk flush; say so in the load script, not in a config file nobody reads."
    },

    { t: "h2", n: "04", text: "Idempotent loads: the pipeline's atomicity", id: "idempotent" },

    { t: "p", text: "A pipeline step fails halfway — network, timeout, a bad row — and is re-run. If the step was 'INSERT today's rows', the re-run inserts today's rows again. **Atomicity inside one transaction does not help across two runs; what helps is making the step idempotent**: delete-then-insert the day's partition inside one transaction, or upsert on a natural key (6.3), or insert only rows not already present. Then re-running is safe by construction, and 'did it run twice' stops being a question anyone has to ask." },

    { t: "code", lang: "sql", title: "Three idempotent load steps",
      hl: [2, 3, 8, 13, 14],
      code: `-- 1. replace the period: delete then insert, in one transaction, so a failure leaves the old rows or the new rows, never neither
BEGIN;
DELETE FROM daily_summary WHERE day = :d;
INSERT INTO daily_summary SELECT ... WHERE placed_at >= :d AND placed_at < :d + INTERVAL '1 day' GROUP BY ...;
COMMIT;

-- 2. upsert on the natural key: a second delivery updates rather than duplicates (6.3)
INSERT INTO customers (customer_id, name, tier) VALUES (...)
ON CONFLICT (customer_id) DO UPDATE SET name = EXCLUDED.name, tier = EXCLUDED.tier;

-- 3. insert only what is missing: the anti-join as a load guard (2.3)
INSERT INTO events (event_id, customer_id, event_type, occurred_at)
SELECT s.event_id, s.customer_id, s.event_type, s.occurred_at
FROM   staging s WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id = s.event_id);

-- and a run record, so the second run knows the first happened:
INSERT INTO load_runs (step, period, finished_at) VALUES ('daily_summary', :d, now()) ON CONFLICT (step, period) DO UPDATE SET finished_at = EXCLUDED.finished_at;`,
      caption: "Each form answers 'what if this runs twice' with 'the same table'. The first is the simplest and holds a delete lock for the period; the second needs a unique key; the third needs the staging rows to carry their identity. Pick by what the data has, and write the run record either way."
    },

    { t: "callout", kind: "production", title: "In PostgreSQL, an error aborts the whole transaction", body: [
      { t: "p", text: "After any failed statement inside a transaction, PostgreSQL rejects every further statement with `current transaction is aborted` until you ROLLBACK. A loop that inserts a thousand rows and catches exceptions per row will find that everything after the first bad row fails too. **Wrap each risky statement in a SAVEPOINT** — `SAVEPOINT s; INSERT …; RELEASE s;` with `ROLLBACK TO s` on error — or validate the rows first, or use `ON CONFLICT DO NOTHING` so the bad row is not an error at all." }
    ]},

    { t: "ladder",
      title: "Loading a day's orders from a file",
      rungs: [
        { level: "bad", label: "Insert in autocommit, row by row", code: `for row in rows:
    cur.execute("INSERT INTO orders VALUES (%s, %s, %s, %s)", row)   # autocommit: a flush per row`,
          note: "**Ten thousand flushes, and a re-run doubles the day.** A failure at row 6,000 leaves 5,999 committed and no way to tell which." },
        { level: "ok", label: "One transaction", code: `with conn.transaction():
    cur.executemany("INSERT INTO orders VALUES (%s, %s, %s, %s)", rows)   # one flush; all or nothing`,
          note: "**Atomic and fast.** A re-run after a successful run still doubles the day, and a duplicate order id in the file aborts the whole load." },
        { level: "best", label: "One transaction, replace the period, record the run", code: `with conn.transaction():
    cur.execute("DELETE FROM orders WHERE placed_at >= %s AND placed_at < %s", (d, d + timedelta(days=1)))
    cur.executemany("INSERT INTO orders VALUES (%s, %s, %s, %s)", rows)
    cur.execute("INSERT INTO load_runs ... ON CONFLICT DO UPDATE ...")`,
          note: "**Run it once or ten times: the same rows.** The delete and the insert are one unit, so a failure leaves yesterday's version intact, and the run record says which version is there." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A safe archive step",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "Write the SQL for a nightly step that moves orders older than a year, with their items, into `orders_archive` and `order_items_archive`, then deletes them from the live tables. It must be atomic, must be safe to re-run after a failure at any point, must not hold locks on the live tables for longer than a batch of 1,000 orders, and must record what it did. Then explain what happens if the process is killed between the archive insert and the live delete under your design." },
        { t: "p", text: "Use PostgreSQL; a data-modifying CTE (4.2) is allowed but not required." }
      ],
      requirements: [
        "Batches of at most 1,000 orders, each in its own transaction.",
        "Idempotency: a re-run after a crash does not duplicate archive rows or delete unarchived ones.",
        "Items moved with their orders, foreign keys respected (items before orders on delete).",
        "A run record per batch."
      ],
      hint: "Select the batch of order ids first. Insert into the archives with ON CONFLICT DO NOTHING so a re-run of a half-done batch is harmless. Delete items, then orders, WHERE order_id IN the batch. Loop until the batch is empty.",
      solution: {
        lang: "sql",
        title: "archive_orders.sql",
        code: `-- one batch; the caller loops until it moves zero rows
BEGIN;

CREATE TEMP TABLE batch ON COMMIT DROP AS
  SELECT order_id FROM orders WHERE placed_at < now() - INTERVAL '1 year' ORDER BY order_id LIMIT 1000;

-- archive first, idempotently: a re-run of a batch whose archive succeeded but whose delete did not simply skips
INSERT INTO orders_archive SELECT o.*, now() AS archived_at FROM orders o JOIN batch b USING (order_id)
ON CONFLICT (order_id) DO NOTHING;
INSERT INTO order_items_archive SELECT oi.*, now() FROM order_items oi JOIN batch b USING (order_id)
ON CONFLICT (order_id, product_id) DO NOTHING;

-- then delete, children before parents (the foreign key from order_items to orders)
DELETE FROM order_items oi USING batch b WHERE oi.order_id = b.order_id;
DELETE FROM orders      o  USING batch b WHERE o.order_id  = b.order_id;

INSERT INTO archive_runs (started_at, finished_at, orders_moved) SELECT now(), now(), COUNT(*) FROM batch;
COMMIT;
-- repeat while orders_moved > 0

-- killed between the archive INSERT and the DELETE: the transaction never committed, so PostgreSQL rolls it back --
-- nothing is in the archive and nothing was deleted; the next run selects the same batch and does it again.
-- killed after COMMIT: everything for that batch is done; the next run selects the next thousand.
-- there is no state in which a row is in both tables or in neither, because both changes are one transaction.`,
        notes: [
          { t: "p", text: "**Atomicity answers the 'killed between' question outright**: there is no 'between' that survives, because the archive insert and the live delete commit together or roll back together. The ON CONFLICT DO NOTHING is belt and braces for the case where archive rows exist from some other path." },
          { t: "p", text: "**Batching by 1,000 bounds the lock and the WAL per transaction** (5.6), so the live tables stay usable during the run and a failure re-does at most one batch. The temp table with ON COMMIT DROP pins the batch so the two deletes act on exactly the archived ids." },
          { t: "p", text: "**The run record is written inside the same transaction**, so it can never claim a batch that did not commit. A record written after COMMIT could be lost between the two, and a record written before could exist for a batch that rolled back." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A pipeline step inserts a day's rows in one transaction. It succeeded yesterday and is accidentally re-run today. What happens, and what property was missing?",
          options: [
            "Nothing — the transaction protects it",
            "The day's rows are inserted again: atomicity makes one run all-or-nothing but says nothing about two runs; the step needed to be idempotent — replace the period, upsert, or insert only missing rows",
            "It fails on the primary key, so it is safe",
            "The second run rolls back the first"
          ],
          answer: 1,
          why: "A transaction guarantees the unit of work; idempotency guarantees the unit of work can be repeated. Both are needed for a load step that will, sooner or later, be run twice."
        }
      ]
    }
  ],

  takeaways: [
    "**BEGIN … COMMIT makes several statements one unit**; ROLLBACK undoes them all; a SAVEPOINT undoes back to a bookmark.",
    "**Autocommit is the default**: two statements that must succeed together need an explicit transaction.",
    "**Atomicity and durability live in the write-ahead log** — undo for rollback, redo for crash recovery.",
    "**Consistency is the constraints**; what is not declared is not enforced.",
    "**Isolation is the snapshot and the locks**, and the isolation level decides which anomalies are allowed (6.2).",
    "**A COMMIT costs a disk flush**; batch writes into transactions of a few thousand rows.",
    "**`synchronous_commit = off` trades the last few hundred milliseconds of commits for speed** — for metrics, never for money.",
    "**In PostgreSQL an error aborts the whole transaction** until ROLLBACK; SAVEPOINT around the risky statement.",
    "**PostgreSQL DDL is transactional; MySQL DDL commits implicitly** — a migration behaves differently on each.",
    "**A load step must be idempotent**: replace the period, upsert on the key, or insert only what is missing — and record the run inside the same transaction."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why are 10,000 single-row INSERTs in autocommit so much slower than the same rows in one transaction?",
        options: [
          "Autocommit disables indexes",
          "Each commit must flush the write-ahead log to durable storage before returning; autocommit does that 10,000 times, one transaction does it once",
          "Transactions use a faster code path",
          "Autocommit re-parses the statement each time"
        ],
        answer: 1,
        why: "Durability is paid at COMMIT with an fsync. The rows themselves cost the same; the flushes differ by a factor of ten thousand."
      },
      {
        stem: "What does `ROLLBACK TO SAVEPOINT s` do that `ROLLBACK` does not?",
        options: [
          "It commits everything before the savepoint",
          "It undoes only the work since the savepoint and leaves the transaction open, so earlier work is kept pending and can still be committed",
          "It is the same",
          "It undoes the savepoint's creation"
        ],
        answer: 1,
        why: "Savepoints give partial undo inside a transaction — the mechanism for 'try this, and on failure skip it', and the way around PostgreSQL's whole-transaction abort on error."
      },
      {
        stem: "Which ACID property is enforced by PRIMARY KEY, FOREIGN KEY and CHECK constraints?",
        options: [
          "Atomicity",
          "Consistency — the database refuses a commit that would leave an invalid state, as defined by the constraints declared",
          "Isolation",
          "Durability"
        ],
        answer: 1,
        why: "Consistency in ACID means 'every constraint holds at commit'. It is only as strong as the constraints you declare, which is the argument of 6.4."
      },
      {
        stem: "A process is killed after inserting into an archive table and before deleting from the live table, inside one transaction. What is the state afterwards?",
        options: [
          "Rows exist in both tables",
          "Neither change happened: an uncommitted transaction is rolled back on crash recovery, so the archive insert is undone with everything else",
          "The archive insert is kept and the delete is lost",
          "The database is corrupt"
        ],
        answer: 1,
        why: "Atomicity: no partial transaction survives. The next run sees the original state and does the batch again — which is why the archive insert is written to tolerate that."
      },
      {
        stem: "When is `synchronous_commit = off` an acceptable choice?",
        options: [
          "Never",
          "For data whose last few hundred milliseconds are not worth a flush per commit — metrics, logs, caches — where a crash losing recent commits is tolerable and no corruption results",
          "For financial transactions under load",
          "Whenever the disk is slow"
        ],
        answer: 1,
        why: "The setting weakens durability, not consistency: a crash loses the most recent commits cleanly. That is a business decision per table, and it belongs in the load script where it is visible."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain ACID with an example of each property.",
        strong: "Atomicity: a transfer debits one account and credits another; either both happen or neither — enforced by undo on rollback and on crash recovery. Consistency: the database moves between valid states as defined by constraints — a foreign key stops an order for a customer who does not exist, at commit. Isolation: concurrent transactions do not see each other's partial work — a report summing balances mid-transfer does not see the money in flight, through snapshots and locks at the chosen isolation level. Durability: once COMMIT returns, the change survives a crash — the write-ahead log is flushed before the acknowledgement. The one people forget in practice is that atomicity covers one run; a pipeline that may run twice needs idempotency on top.",
        answer: [
          { t: "p", text: "Naming the mechanism behind each letter, and the idempotency coda, are what lift this above the textbook definition." }
        ]
      },
      {
        level: "core",
        q: "Why does a commit cost so much, and how do you load data quickly without giving up durability?",
        strong: "A commit forces the write-ahead log to durable storage — an fsync — so the change survives a crash; that is milliseconds per commit, which dominates when each row is its own transaction. The fix is batching: thousands of rows per transaction, so one flush covers them all, ideally with a multi-row INSERT or COPY rather than per-row statements. Group commit lets concurrent transactions share a flush. Turning synchronous_commit off is a separate, deliberate trade for data that can lose its last half-second, and it should be scoped to the session that loads metrics, not set globally.",
        answer: [
          { t: "p", text: "Batching first, the durability dial second and scoped — that ordering is the mature answer." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make a data pipeline step safe to re-run?",
        strong: "Make it idempotent inside a transaction. Three shapes: replace the period — delete the day's rows and insert the new ones in one transaction, so a re-run produces the same table; upsert on the natural key, so a second delivery updates rather than duplicates; or insert only rows absent from the target with NOT EXISTS, when rows carry their identity. I batch large steps so each transaction is bounded, write a run record inside the same transaction so it can never claim work that rolled back, and in PostgreSQL I guard risky statements with savepoints because one error aborts the whole transaction. Then the question 'did it run twice' has no consequences, which is the point.",
        answer: [
          { t: "p", text: "Three idempotent shapes plus the run record in the same transaction — that is a pipeline that survives operations." }
        ]
      }
    ]
  }
});

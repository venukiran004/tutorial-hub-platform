/* ============================================================================
   LESSON 5.6 — The Slow Query Method
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "**Slow queries are diagnosed, not guessed at, and the diagnosis is a fixed sequence: find the query that matters, reproduce it as the application runs it, read the plan, find the widest node, classify the cause, apply the matching fix, measure, and guard against its return.** Nine slow queries in ten have one of a dozen causes, and each cause has a signature in the plan. This lesson is the procedure and the table of causes — the module folded into a checklist you can run on a query you have never seen.",

  objectives: [
    "Find the queries worth fixing from cumulative statistics rather than from complaints",
    "Reproduce a slow query with the application's parameters and plan",
    "Run the three-reads diagnosis and classify the cause from its plan signature",
    "Match each cause to its fix and measure the fix honestly",
    "Recognise when the query is not the problem: locks, bloat, cold cache, connection storms"
  ],

  prerequisites: ["5.2", "5.4", "5.5"],

  blocks: [

    { t: "h2", n: "01", text: "Find the query that matters", id: "find" },

    { t: "p", text: "The slowest query is rarely the one to fix. A report that takes 40 seconds once a night costs 40 seconds a day; a 30-millisecond lookup that runs 2,000 times a minute costs 60 seconds a minute. **Rank by total time — calls × mean — not by the worst single duration**, and the list is short: a handful of statements account for most of the load. `pg_stat_statements` keeps that ranking for you; MySQL's performance schema and SQL Server's Query Store do the same." },

    { t: "code", lang: "sql", title: "The ranking that finds the real cost (PostgreSQL)",
      hl: [1, 2, 3],
      code: `SELECT LEFT(query, 70) AS query, calls, ROUND(total_exec_time / 1000) AS total_s, ROUND(mean_exec_time) AS mean_ms,
       ROUND(100 * total_exec_time / SUM(total_exec_time) OVER (), 1) AS pct_of_load, rows / GREATEST(calls, 1) AS rows_per_call
FROM   pg_stat_statements
ORDER  BY total_exec_time DESC LIMIT 5;
-- query                                                    | calls   | total_s | mean_ms | pct_of_load | rows_per_call
-- SELECT o.order_id, o.placed_at, o.status FROM orders o … | 2140312 | 64209   | 30      | 61.2        | 18          <- the lookup: 30 ms, two million times
-- SELECT c.tier, DATE_TRUNC('month', o.placed_at), SUM(…   | 31      | 1240    | 40000   | 1.2         | 240         <- the report: 40 s, once a night
-- SELECT COUNT(*) FROM events WHERE customer_id = $1 AND … | 998120  | 998     | 1       | 1.0         | 1
-- ...
-- the 30 ms lookup is 61 % of the database's time; the 40 s report is 1 %. Fix the lookup.

-- also worth a column: shared_blks_read (disk) versus shared_blks_hit (cache), and temp_blks_written (spills)
-- MySQL: performance_schema.events_statements_summary_by_digest ordered by SUM_TIMER_WAIT
-- SQL Server: Query Store, sys.query_store_runtime_stats ordered by total duration`,
      caption: "Total time is the budget; percentage of load is the priority. A query at 61 % of load is worth a day of work; one at 1 % is not, however slow it feels. Reset the statistics after a deploy so the ranking reflects the current code."
    },

    { t: "dl", items: [
      ["`pg_stat_statements`", "PostgreSQL extension that aggregates calls, time, rows and block I/O per normalised statement. The starting point for every performance investigation."],
      ["`auto_explain`", "Logs the plan — with ANALYZE if configured — of any statement slower than a threshold, as the application actually ran it. How you see the prepared-statement plan rather than the console plan."],
      ["Reproduce", "Run the statement with the application's real parameter values, on data of the real size, with the cache in the state it will be in. A query that is fast on the developer laptop has been tested against nothing."],
      ["Widest node", "The plan node with the largest actual rows × loops. Where the time is."],
      ["Regression guard", "A recorded baseline — the plan shape, the total time per call — checked after each deploy, so a fix that is undone by a later change is noticed."]
    ]},

    { t: "h2", n: "02", text: "The procedure", id: "procedure" },

    { t: "viz",
      title: "Seven steps, in order",
      caption: "Find by total time; reproduce with real parameters; explain with ANALYZE and BUFFERS; read the widest node, the worst estimate and any spill; classify the cause from its signature; apply the one matching fix; measure with the same cache state and record a baseline. Skipping a step is how an index gets added to a query whose problem was a statistic.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Seven boxes in a row — find, reproduce, explain, read, classify, fix, measure and guard — connected by arrows, with a one-line note under each.">
  <defs>
    <marker id="sq-ah-56" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.4">
    <rect x="16" y="60" width="104" height="46" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="138" y="60" width="104" height="46" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="260" y="60" width="104" height="46" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="382" y="60" width="104" height="46" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="504" y="60" width="104" height="46" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="626" y="60" width="104" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="748" y="60" width="116" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="68" y="88">1 find</text><text x="190" y="88">2 reproduce</text><text x="312" y="88">3 explain</text><text x="434" y="88">4 read</text>
    <text x="556" y="88">5 classify</text><text x="678" y="88">6 fix</text><text x="806" y="88">7 measure, guard</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="120" y1="83" x2="138" y2="83" marker-end="url(#sq-ah-56)"/><line x1="242" y1="83" x2="260" y2="83" marker-end="url(#sq-ah-56)"/>
    <line x1="364" y1="83" x2="382" y2="83" marker-end="url(#sq-ah-56)"/><line x1="486" y1="83" x2="504" y2="83" marker-end="url(#sq-ah-56)"/>
    <line x1="608" y1="83" x2="626" y2="83" marker-end="url(#sq-ah-56)"/><line x1="730" y1="83" x2="748" y2="83" marker-end="url(#sq-ah-56)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="68" y="132">by total time</text><text x="68" y="148">not worst case</text>
    <text x="190" y="132">real parameters</text><text x="190" y="148">real size, app's plan</text>
    <text x="312" y="132">ANALYZE, BUFFERS</text><text x="312" y="148">in a rolled-back txn</text>
    <text x="434" y="132">widest node</text><text x="434" y="148">worst estimate, spill</text>
    <text x="556" y="132">the signature</text><text x="556" y="148">→ one cause</text>
    <text x="678" y="132">the matching fix</text><text x="678" y="148">one at a time</text>
    <text x="806" y="132">same cache state</text><text x="806" y="148">baseline recorded</text>
  </g>
  <text x="440" y="200" class="s-sub" text-anchor="middle">One cause, one fix, one measurement. Two fixes at once tell you nothing about which one worked.</text>
  <text x="440" y="224" class="s-sub" text-anchor="middle">If the plan is fine and the query is still slow, it is not the query (section 04).</text>
</svg>`
    },

    { t: "code", lang: "sql", title: "Steps 2 and 3: reproduce as the application does, explain in a transaction you roll back",
      hl: [2, 3, 7, 8],
      code: `-- reproduce with the prepared-statement plan, not the console plan (5.1)
PREPARE q (INT, TIMESTAMPTZ) AS SELECT o.order_id, o.placed_at, o.status FROM orders o WHERE o.customer_id = $1 AND o.placed_at >= $2 ORDER BY o.placed_at DESC LIMIT 20;
EXPLAIN (ANALYZE, BUFFERS) EXECUTE q(4242, now() - INTERVAL '90 days');

-- or read the plan auto_explain logged when the application ran it: log_min_duration 100ms, auto_explain.log_analyze = on

-- anything that writes: explain inside a transaction and roll it back
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE orders SET status = 'refunded' WHERE order_id = 108;
ROLLBACK;

-- measure warm and cold: run twice; the first run's shared_blks_read is the disk cost, the second's is the cached cost.
-- compare like with like -- a fix measured warm against a baseline measured cold is not a fix.`,
      caption: "The console with a literal can plan differently from the application with a parameter, and a first run pays for disk that a second run does not. Reproduce the application's plan, and compare measurements taken in the same cache state — or the 'fix' is the cache warming up."
    },

    { t: "h2", n: "03", text: "The causes and their signatures", id: "causes" },

    { t: "p", text: "Step five is a lookup. Each cause leaves a recognisable mark in the plan, and each has one fix. **Read the signature, not the symptom**: 'slow' is the symptom; 'Seq Scan with two million rows removed by filter on an equality predicate' is a signature, and its fix is an index — while 'Nested Loop with loops = 2 million on an estimate of 12' has the same symptom, a different signature, and a fix that is ANALYZE." },

    { t: "table",
      head: ["Cause", "Signature in the plan", "Fix", "Lesson"],
      rows: [
        ["Missing index", "Seq Scan, `Rows Removed by Filter` ≫ rows kept, selective equality or range predicate", "CREATE INDEX CONCURRENTLY on the predicate's column(s)", "5.3"],
        ["Unsargable predicate", "Seq Scan despite an index; `Filter: (lower(col) = …)` or `((col)::text …)` or `date_trunc(…)`", "Rewrite to a bare-column range; or an expression index", "5.4"],
        ["Stale statistics", "`rows=12` estimated, `actual rows=2000000`; a Nested Loop chosen for a large outer", "ANALYZE the table; raise the statistics target; extended statistics for correlated columns", "5.1"],
        ["Fan-out", "Rows out of a join far exceed either input; sums too high; DISTINCT in the query", "Pre-aggregate children to parent grain before joining", "2.2, 5.5"],
        ["Per-row subquery", "SubPlan with `loops=` in the thousands; or a Nested Loop with a Seq Scan inner", "Window function, derived table, or LATERAL with an index", "4.1"],
        ["OFFSET pagination", "Limit over Sort or Index Scan with `actual rows=` in the hundreds of thousands for a 20-row result", "Keyset pagination on (sort key, id)", "5.4"],
        ["Sort or hash spill", "`Sort Method: external merge Disk`, `Batches: 8`, `temp_blks_written`", "An index supplying the order; less input to the sort; work_mem for the session", "5.2"],
        ["Wide rows / SELECT *", "High `width=`, large `Buffers`, the network dominating", "Select the columns needed; an index-only scan becomes possible", "5.3"],
        ["COUNT DISTINCT at scale", "HashAggregate over a huge input, `Batches` > 1", "GROUP BY then COUNT; or a sketch", "5.5"],
        ["Wrong join order", "The largest table scanned first, a small filtered one probed per row", "Fix the estimate on the small side; sargable predicate on it; collapse_limit as a last resort", "5.5"],
        ["Materialised CTE fence", "CTE Scan with a filter applied above it, full scan inside", "NOT MATERIALIZED, or inline as a derived table", "4.2"],
        ["N+1 from the application", "A fast query with a huge `calls` count in pg_stat_statements", "One query with IN or a join instead of one per row", "7.1"]
      ]
    },

    { t: "code", lang: "sql", title: "Step 6: one fix, matched to the signature",
      hl: [3, 8, 13],
      code: `-- signature: Seq Scan on orders, Rows Removed by Filter: 3,999,982, Filter: (customer_id = 4242)   ->  missing index
CREATE INDEX CONCURRENTLY orders_customer_placed ON orders (customer_id, placed_at DESC);
-- after: Index Scan using orders_customer_placed, actual rows=18, loops=1, 0.09 ms

-- signature: Seq Scan on orders, Filter: (date_trunc('month', placed_at) = '2025-03-01')   ->  unsargable
-- before: 4,000,000 rows examined, 820 ms
WHERE placed_at >= '2025-03-01' AND placed_at < '2025-04-01'
-- after: Index Scan, 31,000 rows, 12 ms -- no new index needed

-- signature: Nested Loop, inner Index Scan loops=2,140,000, outer estimated rows=12   ->  stale statistics
ANALYZE events;
-- after: Hash Join, one build, one probe, 98 s -> 1.4 s -- no new index, no rewrite

-- three different fixes for three different signatures. Adding an index to the second or third would have changed nothing.`,
      caption: "The fix follows from the signature, and a fix applied to the wrong signature is not neutral: an index costs every write forever, a rewrite costs a review and a deploy. Classify before touching anything."
    },

    { t: "h2", n: "04", text: "When it is not the query", id: "notquery" },

    { t: "p", text: "Sometimes the plan is fine, the estimates match, nothing spilled — and the query still takes seconds. Then the time is not in execution. **Lock waits**: the statement is blocked behind a transaction holding a row or table lock; `pg_stat_activity` shows `wait_event_type = Lock`. **Bloat**: a table with millions of dead rows from updates that VACUUM has not reclaimed, so a scan reads three times the live data. **Cold cache** after a restart or a large scan evicted the working set. **Connection storms**: hundreds of connections each planning and executing, contending for CPU — the fix is a pool (7.1), not a query change." },

    { t: "code", lang: "sql", title: "The checks that separate a slow query from a slow database (PostgreSQL)",
      hl: [2, 7, 12],
      code: `-- is it waiting rather than working?
SELECT pid, wait_event_type, wait_event, state, LEFT(query, 60) FROM pg_stat_activity WHERE state <> 'idle' AND wait_event_type = 'Lock';
-- pid  | wait_event_type | wait_event    | state  | query
-- 8123 | Lock            | transactionid | active | UPDATE orders SET status = …         <- blocked by another transaction
SELECT pg_blocking_pids(8123);                                                             -- who holds it

-- is the table bloated?
SELECT relname, n_live_tup, n_dead_tup, ROUND(100.0 * n_dead_tup / GREATEST(n_live_tup, 1), 1) AS dead_pct, last_autovacuum
FROM   pg_stat_user_tables WHERE relname = 'orders';
-- orders | 4000000 | 9800000 | 245.0 | 2025-08-30       <- 2.4 dead rows per live one: VACUUM is behind; a scan reads it all

-- is it cold?
EXPLAIN (ANALYZE, BUFFERS) ... ;    -- Buffers: shared read=180000 on the first run, shared hit=180000 on the second: the disk, not the plan

-- is it everyone?
SELECT COUNT(*), state FROM pg_stat_activity GROUP BY state;    -- 480 active on a 16-core machine: a connection storm; the fix is a pooler`,
      caption: "A plan describes work; these describe waiting. A query blocked for 30 seconds behind a lock has a perfect plan and a 30-second latency, and no index will change it. Check waits and bloat before reading a plan whose numbers already look right."
    },

    { t: "callout", kind: "production", title: "Step 7: the fix that stays fixed", body: [
      { t: "p", text: "Record the plan shape and the mean time per call after the fix, and check them after every deploy — a query test that asserts `Index Scan` appears in its EXPLAIN, or a `pg_stat_statements` snapshot compared week to week. **Fixes are undone by later changes**: an ORM upgrade that adds a cast, a new column that makes the index stop covering, a data growth that crosses the selectivity where the planner flips plans. The guard costs a few lines and catches the regression the day it happens rather than the day someone complains." }
    ]},

    { t: "ladder",
      title: "A page that got slow",
      rungs: [
        { level: "bad", label: "Add indexes until it is fast", code: `CREATE INDEX ON orders (status); CREATE INDEX ON orders (placed_at); CREATE INDEX ON orders (customer_id, status);
-- one of these helped, probably`,
          note: "**Three indexes, one useful, all paid for on every write**, and no idea which one mattered or whether the problem was the query at all." },
        { level: "ok", label: "EXPLAIN it and fix what looks slow", code: `EXPLAIN ANALYZE SELECT ... ;   -- a Seq Scan: add an index on the filtered column`,
          note: "**Better: a diagnosis from the plan.** But the console plan with a literal may not be the application's plan, and 'Seq Scan' has four causes with four fixes." },
        { level: "best", label: "The seven steps", code: `-- 1 pg_stat_statements: 61 % of load, 2.1M calls, 30 ms  2 PREPARE with the app's params; EXPLAIN (ANALYZE, BUFFERS) EXECUTE
-- 3 widest: Seq Scan orders, 4M rows removed by filter   4 estimate fine; no spill   5 signature: missing index on (customer_id, placed_at)
-- 6 CREATE INDEX CONCURRENTLY                            7 mean 30 ms -> 0.1 ms warm; plan assertion added to the test suite`,
          note: "**The cause was named before the fix was chosen, the fix was one thing, and the measurement is comparable to the baseline.** The test will fail the day someone wraps `customer_id` in a cast." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Run the method on three complaints",
      difficulty: "expert",
      minutes: 32,
      body: [
        { t: "p", text: "Three tickets arrive. For each, write the steps you would take in order, the signature you expect to find, the fix that matches it, and what you would record as the guard. **T1**: 'The customer page takes 3 seconds since Tuesday's release.' The release added `WHERE LOWER(c.email) = LOWER($1)` to the lookup. **T2**: 'The nightly report timed out.' The events table grew past 100 million rows last week; the report groups by `DATE_TRUNC('day', occurred_at)` over 90 days with no partitioning. **T3**: 'Everything is slow between 09:00 and 09:15.' No query changed; a batch job now runs at 09:00 that updates every row of `orders`." },
        { t: "p", text: "For T3, say why no EXPLAIN will find the problem." }
      ],
      requirements: [
        "For each ticket: the finding step (which statistic), the reproduction, the expected signature, the fix, the measurement, the guard.",
        "T1's fix must not be an index if a better one exists.",
        "T3's diagnosis must name the waiting mechanism."
      ],
      hint: "T1: a function on the column appeared on Tuesday — sargability, and the data question of whether emails should be stored normalised. T2: a full scan of 100 million rows for 90 days' worth, and the group key wrapped in a function; partitioning plus a bare range. T3: an UPDATE of every row holds locks and creates dead tuples; pg_stat_activity shows Lock waits, and afterwards bloat.",
      solution: {
        lang: "sql",
        title: "three_tickets.sql",
        code: `-- T1  find:      pg_stat_statements shows the lookup's mean rose from 0.1 ms to 3,000 ms on Tuesday; calls unchanged.
--     reproduce: PREPARE with a real email; EXPLAIN (ANALYZE, BUFFERS) EXECUTE.
--     signature: Seq Scan on customers, Filter: (lower(email) = lower($1)), Rows Removed by Filter: 2,999,999 -- unsargable.
--     fix:       not an expression index first. Emails are already lower-cased on write by the signup path; the LOWER() was
--                added defensively. Confirm with SELECT COUNT(*) FROM customers WHERE email <> LOWER(email) -> 0, add a CHECK
--                constraint, and revert the predicate to email = LOWER($1) -- lower the PARAMETER, not the column. The existing
--                unique index on email serves it. (If mixed case existed, a unique expression index on LOWER(email) is the fallback.)
--     measure:   3,000 ms -> 0.1 ms warm, same cache state. guard: the CHECK constraint, and a plan test asserting Index Scan.

-- T2  find:      the report is 1 % of load but a failed job; found from the job log, not the ranking -- both are legitimate entry points.
--     reproduce: run the report's statement with last night's date range; EXPLAIN (ANALYZE, BUFFERS): 100M rows read, 90 days kept,
--                Sort Method: external merge Disk for the GROUP BY.
--     signature: unsargable group predicate (date_trunc on occurred_at) over an unpartitioned table -- a full scan every night.
--     fix:       rewrite the range as WHERE occurred_at >= :d0 AND occurred_at < :d1 (bare column), keep DATE_TRUNC only in the
--                SELECT/GROUP BY where it is fine; partition events by month so the range prunes to three partitions; and, since the
--                report reads 89 closed days each night, a daily summary refreshed for the trailing 2 days (5.5).
--     measure:   timeout -> 4 s (partitioned range) -> 40 ms (summary). guard: a reconciliation query summary vs base for a closed day.

-- T3  find:      pg_stat_statements shows no query changed; pg_stat_activity at 09:05 shows dozens of sessions in
--                wait_event_type = 'Lock' on transactionid, all blocked by one UPDATE orders SET ... (every row, one transaction).
--     reproduce: not with EXPLAIN -- the plans are fine; the time is waiting. Reproduce by observing pg_blocking_pids during the window.
--     signature: lock waits during the batch; afterwards n_dead_tup ~ n_live_tup on orders (every row updated = every row dead once)
--                and scans slower until autovacuum catches up.
--     fix:       batch the UPDATE in chunks of ~10,000 rows with a commit per chunk, so locks are held briefly and vacuum can keep up;
--                run it outside the peak; VACUUM (ANALYZE) orders after it. If the update sets a value most rows already have,
--                add WHERE col IS DISTINCT FROM new_value so unchanged rows are not rewritten at all (6.3).
--     measure:   lock-wait time in the window from minutes to zero; dead_pct after the job. guard: alert on pg_stat_activity lock waits > 5 s.
--     why no EXPLAIN finds it: a plan describes execution work; these sessions did no work -- they waited for a lock the plan does not show.`,
        notes: [
          { t: "p", text: "**T1's best fix removed the reason for the function rather than indexing around it.** An expression index would have made the predicate fast and left the possibility of mixed-case emails in the data; the CHECK constraint makes the bare-column predicate correct forever." },
          { t: "p", text: "**T2 had three causes stacked** — unsargable predicate, no partitioning, a nightly recompute of closed days — and three fixes applied in order, each measured. The summary is the one that made it fast; the first two are what made the summary's refresh cheap." },
          { t: "p", text: "**T3 is the ticket that teaches the most**: the plans were perfect, the queries were unchanged, and the database was slow because a batch job held locks and left dead tuples. Waiting is invisible to EXPLAIN and visible in `pg_stat_activity`; that is why the method checks for waits before reading plans whose numbers already look right." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`pg_stat_statements` shows query A at mean 40,000 ms, 31 calls, and query B at mean 30 ms, 2.1 million calls. Which do you fix first?",
          options: [
            "A — it is a thousand times slower",
            "B — total time is calls × mean: B is 63,000 seconds of load against A's 1,240; B is where the database's time goes",
            "Both equally",
            "Neither; add an index to both"
          ],
          answer: 1,
          why: "Priority is total time, which is what the server spends, not the duration a single user notices. A 30 ms query at two million calls is the load; the 40-second report is a nightly footnote."
        }
      ]
    }
  ],

  takeaways: [
    "**Rank slow queries by total time — calls × mean — not by the worst duration**; a few statements are most of the load.",
    "**Reproduce with the application's parameters and plan** — PREPARE and EXECUTE, or auto_explain — not with a literal in the console.",
    "**EXPLAIN (ANALYZE, BUFFERS) in a transaction you roll back**, twice, to separate disk from cache.",
    "**Read three things: the widest node, the worst estimate, any spill** — then classify the signature.",
    "**Each cause has a signature and one fix**: missing index, unsargable predicate, stale statistics, fan-out, per-row subquery, OFFSET, spill, wide rows, distinct at scale, join order, CTE fence, N+1.",
    "**Apply one fix and measure in the same cache state** — two fixes at once prove nothing.",
    "**If the plan is fine and it is still slow, it is not the query**: lock waits, bloat, cold cache, a connection storm.",
    "**`pg_stat_activity` shows waiting; EXPLAIN shows working** — check for waits before reading a plan whose numbers look right.",
    "**Batch large updates and vacuum after them**; a whole-table UPDATE in one transaction is a lock and a bloat event.",
    "**Guard the fix**: record the plan shape and mean time, and test that the plan still holds after every deploy."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A query's plan is an Index Scan with accurate estimates and 0.2 ms of execution, yet users see 8-second latency on it. Where do you look?",
        options: [
          "At the index definition",
          "At `pg_stat_activity` for lock waits — the statement is likely blocked behind a transaction holding a lock; the plan describes work, and this query is not working, it is waiting",
          "At work_mem",
          "At the statistics target"
        ],
        answer: 1,
        why: "Execution time and latency differ by the time spent waiting for locks, connections or I/O. When the plan and its actuals are already fast, the delay is outside the executor."
      },
      {
        stem: "Why reproduce a slow query with PREPARE and EXECUTE rather than pasting it with a literal?",
        options: [
          "PREPARE is faster",
          "The application runs a parameterised statement, which may use a cached or generic plan chosen for a different value; the console literal plans fresh each time and can show a plan the application never runs",
          "Literals are not allowed in EXPLAIN",
          "There is no difference"
        ],
        answer: 1,
        why: "Parameter sniffing and generic plans (5.1) mean the same SQL text can run two different plans. Diagnosing the console's plan can lead to a fix for a problem the application does not have."
      },
      {
        stem: "After a fix, the query runs in 5 ms where the baseline was 400 ms. What must be true for that comparison to mean anything?",
        options: [
          "The fix was an index",
          "Both measurements were taken in the same cache state — a cold baseline against a warm re-run measures the cache, not the fix; run each twice and compare second runs, or compare Buffers read as well as time",
          "The query was rewritten",
          "ANALYZE was run"
        ],
        answer: 1,
        why: "The first run of any query pays for disk reads the second run does not. Comparable measurements need comparable cache states, which BUFFERS makes visible."
      },
      {
        stem: "A batch job updates every row of a 4-million-row table in one transaction at 09:00. What are the two effects on everyone else?",
        options: [
          "None, if it commits",
          "Lock waits during the transaction for any statement touching those rows, and afterwards a table with as many dead tuples as live ones until VACUUM reclaims them — batch the update and vacuum after it",
          "The indexes are dropped",
          "The statistics are reset"
        ],
        answer: 1,
        why: "Row locks are held until commit, and MVCC leaves the old version of every updated row in place. Chunked commits bound both; a WHERE that skips already-correct rows avoids the churn entirely."
      },
      {
        stem: "Which is the right first response to 'a Seq Scan appeared in the plan'?",
        options: [
          "Create an index on the scanned table",
          "Read why: the fraction of rows kept, whether the predicate is sargable, whether the estimate matches the actual — a Seq Scan has at least four causes, and only one of them is fixed by an index",
          "Increase work_mem",
          "Rewrite as a CTE"
        ],
        answer: 1,
        why: "A scan is correct for large fractions, unavoidable for unsargable predicates, and a symptom of stale statistics when the estimate is wrong. The index is the fix only for the selective-predicate-no-index signature."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you approach a slow query?",
        strong: "In a fixed order. Find whether it is the query worth fixing — pg_stat_statements ranked by total time, calls times mean, not by the slowest single run. Reproduce it as the application runs it: real parameters, a PREPAREd statement or the auto_explain log, real data size. EXPLAIN with ANALYZE and BUFFERS inside a transaction I roll back, twice, to separate cache from disk. Read the widest node, the worst estimate, and any spill. Classify the signature — missing index, unsargable predicate, stale statistics, fan-out, per-row subquery, offset pagination, a spill — and apply the one matching fix. Measure in the same cache state as the baseline. Then guard it: a plan assertion in the tests or a statistics snapshot. And before all that, if the plan already looks fast, check pg_stat_activity for lock waits, because a perfect plan can still wait thirty seconds.",
        answer: [
          { t: "p", text: "The order, the one-fix-at-a-time rule, and the lock-wait check are what make this a method rather than a list." }
        ]
      },
      {
        level: "advanced",
        q: "A query got slow after a deploy that changed no SQL. What changed?",
        strong: "Something around the SQL. The ORM may now send a parameter of a different type, adding a cast to the column that breaks sargability — visible as a Filter with a cast in the plan. A prepared statement may have switched to a generic plan after five executions, or been sniffed on an unrepresentative value. A new column may have made a covering index stop covering. Data crossed a threshold — a table grew past the selectivity where the planner flips from index to scan, with statistics that have not caught up. Or a new batch job holds locks in the same window. I would diff the plan before and after — auto_explain logs both — and diff pg_stat_statements: a changed query fingerprint means the SQL text did change, even if the source did not appear to.",
        answer: [
          { t: "p", text: "Listing the ways SQL can change without the source changing shows the candidate has debugged the boundary between the application and the database." }
        ]
      },
      {
        level: "advanced",
        q: "How would you keep a fixed query from regressing?",
        strong: "Two guards. In the test suite, a query test that runs EXPLAIN against a representative dataset and asserts the plan shape — that an Index Scan on the expected index appears, that there is no Seq Scan on the big table, that no SubPlan loops — so a change that adds a cast or drops an index fails a test rather than a dashboard. In production, a pg_stat_statements baseline snapshotted after each deploy and compared to the previous: a statement whose mean time or buffers read rose by a multiple gets flagged, with the plan from auto_explain attached. Neither guard is expensive; both catch the regression the day it ships, and the second catches the regressions that come from data growth rather than code.",
        answer: [
          { t: "p", text: "Guarding plan shape in tests and statistics in production, and knowing which regressions each catches, is the complete answer." }
        ]
      }
    ]
  }
});

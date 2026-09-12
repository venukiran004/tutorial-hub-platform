/* ============================================================================
   LESSON 5.2 — Reading EXPLAIN
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**EXPLAIN shows what the planner decided; EXPLAIN ANALYZE shows what happened. The distance between the two columns of numbers on each line is the diagnosis.** A plan is a tree of a dozen operator types, each with an estimated row count and — with ANALYZE — an actual one, a time, and a loop count that silently multiplies both. This lesson is how to read one: the operators, the numbers, the three things to look at first, and the two traps that make a fast-looking plan slow.",

  objectives: [
    "Read a PostgreSQL plan tree: indentation, arrows, and bottom-up evaluation",
    "Name the scan, join and aggregate operators and say when the planner picks each",
    "Interpret cost, rows, width, actual time, actual rows and loops — and multiply by loops",
    "Find the widest node, the worst estimate and any disk spill, in that order",
    "Use BUFFERS to tell cached from uncached, and know the dialect equivalents"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", text: "The shape of a plan", id: "shape" },

    { t: "p", text: "PostgreSQL prints the tree with the root first and children indented beneath it, each introduced by `->`. Two children under a join are its outer (first) and inner (second) inputs. **Execution starts at the deepest leaves and rows flow up**; the top line's actual time is the whole query. Every line carries `(cost=start..total rows=N width=W)` from the planner, and with ANALYZE `(actual time=start..total rows=N loops=L)` from the run." },

    { t: "code", lang: "sql", title: "One EXPLAIN ANALYZE, annotated line by line (PostgreSQL 16 form)",
      hl: [3, 5, 8, 12, 15],
      code: `EXPLAIN (ANALYZE, BUFFERS)
SELECT c.country, COUNT(*) FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'refunded' GROUP BY c.country;
-- HashAggregate  (cost=1893.10..1893.17 rows=7 width=11) (actual time=8.412..8.415 rows=7 loops=1)   <- root: last to finish
--   Group Key: c.country
--   Buffers: shared hit=1204                                                                              <- pages read, all from cache
--   ->  Hash Join  (cost=1521.00..1843.10 rows=20000 width=3) (actual time=3.180..7.902 rows=19833 loops=1)
--         Hash Cond: (o.customer_id = c.customer_id)
--         ->  Bitmap Heap Scan on orders o  (cost=224.61..496.71 rows=20000 width=4) (actual time=0.611..2.945 rows=19833 loops=1)
--               Recheck Cond: (status = 'refunded')
--               Heap Blocks: exact=1004
--               ->  Bitmap Index Scan on orders_status  (cost=0.00..219.61 rows=20000 width=0) (actual time=0.520..0.520 rows=19833 loops=1)
--                     Index Cond: (status = 'refunded')
--         ->  Hash  (cost=671.00..671.00 rows=50000 width=7) (actual time=2.501..2.502 rows=50000 loops=1)
--               Buckets: 65536  Batches: 1  Memory Usage: 2466kB                                       <- one batch: the hash fit in memory
--               ->  Seq Scan on customers c  (cost=0.00..671.00 rows=50000 width=7) (actual time=0.010..1.301 rows=50000 loops=1)
-- Planning Time: 0.402 ms
-- Execution Time: 8.470 ms
-- read: customers scanned into a hash (50,000 rows); refunded orders found through the index (19,833, estimated 20,000);
-- each order probed against the hash; the survivors grouped by country. Estimates within 1 % of actuals: a healthy plan.`,
      caption: "Costs are the planner's units; times are milliseconds. `rows=20000` against `rows=19833` is the estimate meeting reality and nearly agreeing — the sign of good statistics. The Hash node's `Batches: 1` says the build side fitted in `work_mem`; a number above 1 means it spilled to disk."
    },

    { t: "dl", items: [
      ["`cost=a..b`", "Estimated cost to produce the first row (a) and all rows (b), in planner units. Compare within one plan, never across machines."],
      ["`rows=`, `width=`", "Estimated rows out of this node, and their average byte width. The estimate every cost above was computed from."],
      ["`actual time=a..b`", "Milliseconds to first row and to completion — per loop. Inclusive of children."],
      ["`actual rows=`, `loops=`", "Rows produced per execution, and how many times the node ran. **Total rows = rows × loops.** The inner side of a Nested Loop runs once per outer row."],
      ["`Rows Removed by Filter`", "Rows the node read and discarded. A large number here is work spent on rows the query did not want — a missing index, or a predicate that could not use one."],
      ["`Buffers: shared hit / read`", "Pages found in the buffer cache versus read from disk. `read` is the cold-cache cost; a re-run with everything `hit` is the warm one."]
    ]},

    { t: "h2", n: "02", text: "The operators", id: "operators" },

    { t: "table",
      head: ["Node", "What it does", "Chosen when", "Watch for"],
      rows: [
        ["Seq Scan", "Reads every page of the table", "Predicate keeps a large fraction, or no usable index, or the table is small", "`Rows Removed by Filter` ≫ rows kept: an index would help"],
        ["Index Scan", "Walks the index, visits the heap for each match", "Selective predicate on an indexed column, or ORDER BY the index", "Random heap access; slow when the index order is uncorrelated with table order"],
        ["Index Only Scan", "Answers from the index alone", "Every needed column is in the index (covering) and the visibility map is fresh", "`Heap Fetches` > 0: VACUUM to refresh the visibility map"],
        ["Bitmap Index + Bitmap Heap Scan", "Collects matching page ids from one or more indexes, then reads those pages in order", "Medium selectivity; OR across indexes; several conditions each with an index", "`Recheck Cond`; lossy bitmaps when work_mem is small"],
        ["Nested Loop", "For each outer row, runs the inner side", "Small outer input and an indexed inner side; LATERAL", "Inner `loops=` in the thousands with a Seq Scan inside: the quadratic case"],
        ["Hash Join", "Builds a hash of the smaller input, probes with the larger", "Equality join, no useful order, inputs of any size", "`Batches` > 1: the hash spilled to disk; the build side should be the smaller"],
        ["Merge Join", "Walks two sorted inputs together", "Both inputs already sorted (indexes, or a needed ORDER BY); large inputs", "A Sort node under each side: the sort may cost more than a hash"],
        ["HashAggregate", "Groups via a hash table", "GROUP BY with few groups relative to rows", "Spills when groups exceed work_mem; `Disk Usage`"],
        ["GroupAggregate", "Groups over sorted input", "Input is already sorted, or many groups", "The Sort beneath it"],
        ["Sort", "Sorts its input", "ORDER BY, merge join input, window functions", "`Sort Method: external merge Disk:` — the sort did not fit in memory"],
        ["Materialize", "Buffers its input for re-reading", "Inner side of a nested loop re-read per outer row", "Usually fine; large ones mean a join order problem"],
        ["SubPlan / InitPlan", "A subquery executed per row / once", "Correlated subqueries the planner could not flatten (4.1)", "`loops=` large on a SubPlan: rewrite as a join or window"],
        ["CTE Scan", "Reads a materialised CTE", "Multiply-referenced or MATERIALIZED CTEs (4.2)", "No statistics: estimates on it are guesses"],
        ["Gather / Parallel", "Combines worker results", "Large scans and aggregates with parallel workers available", "`Workers Launched` less than planned: no free workers"]
      ]
    },

    { t: "viz",
      title: "Three joins, three costs",
      caption: "Nested Loop pays the inner cost once per outer row — cheap when the outer is small and the inner is an index probe, quadratic when it is a scan. Hash Join pays one build over the smaller input and one probe per row of the larger. Merge Join pays for two sorts, or nothing if both inputs already arrive sorted.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three panels: Nested Loop showing an outer input with an arrow looping into an inner index probe per row; Hash Join showing the smaller input built into a hash table and the larger probing it; Merge Join showing two sorted streams walked together.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">Nested Loop</text><text x="330" y="36">Hash Join</text><text x="630" y="36">Merge Join</text>
  </g>
  <!-- nested loop -->
  <rect x="30" y="56" width="90" height="110" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="75" y="80" class="s-sub" text-anchor="middle">outer</text><text x="75" y="96" class="s-sub" text-anchor="middle">n rows</text>
  <rect x="170" y="86" width="100" height="50" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)" stroke-width="1.2"/>
  <text x="220" y="106" class="s-sub" text-anchor="middle">inner: index</text><text x="220" y="122" class="s-sub" text-anchor="middle">probe, per row</text>
  <path d="M120,80 C150,80 150,110 170,110" fill="none" style="stroke:var(--ink-3)" stroke-width="1.2"/>
  <path d="M120,140 C150,140 150,112 170,112" fill="none" style="stroke:var(--ink-3)" stroke-width="1.2"/>
  <text x="30" y="200" class="s-sub">cost ≈ n × (one probe)</text>
  <text x="30" y="218" class="s-sub" style="fill:var(--crit)">n × (a scan) if there is no index</text>
  <!-- hash join -->
  <rect x="330" y="56" width="90" height="50" rx="6" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)" stroke-width="1.2"/>
  <text x="375" y="78" class="s-sub" text-anchor="middle">smaller</text><text x="375" y="94" class="s-sub" text-anchor="middle">→ hash table</text>
  <rect x="330" y="116" width="90" height="50" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="375" y="138" class="s-sub" text-anchor="middle">larger</text><text x="375" y="154" class="s-sub" text-anchor="middle">→ probe</text>
  <rect x="470" y="86" width="100" height="50" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)" stroke-width="1.2"/>
  <text x="520" y="106" class="s-sub" text-anchor="middle">hash in</text><text x="520" y="122" class="s-sub" text-anchor="middle">work_mem</text>
  <line x1="420" y1="81" x2="470" y2="100" style="stroke:var(--ink-3)" stroke-width="1.2"/><line x1="420" y1="141" x2="470" y2="122" style="stroke:var(--ink-3)" stroke-width="1.2"/>
  <text x="330" y="200" class="s-sub">cost ≈ build(small) + probe(large)</text>
  <text x="330" y="218" class="s-sub" style="fill:var(--crit)">batches &gt; 1: the hash spilled to disk</text>
  <!-- merge join -->
  <rect x="630" y="56" width="90" height="50" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="630" y="116" width="90" height="50" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="675" y="78" class="s-sub" text-anchor="middle">sorted A</text><text x="675" y="94" class="s-sub" text-anchor="middle">1 3 4 7 9</text>
  <text x="675" y="138" class="s-sub" text-anchor="middle">sorted B</text><text x="675" y="154" class="s-sub" text-anchor="middle">2 3 7 8 9</text>
  <rect x="770" y="86" width="90" height="50" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)" stroke-width="1.2"/>
  <text x="815" y="106" class="s-sub" text-anchor="middle">walk both</text><text x="815" y="122" class="s-sub" text-anchor="middle">once: 3 7 9</text>
  <line x1="720" y1="81" x2="770" y2="100" style="stroke:var(--ink-3)" stroke-width="1.2"/><line x1="720" y1="141" x2="770" y2="122" style="stroke:var(--ink-3)" stroke-width="1.2"/>
  <text x="630" y="200" class="s-sub">cost ≈ sort(A) + sort(B) + one pass</text>
  <text x="630" y="218" class="s-sub" style="fill:var(--good)">free when indexes supply the order</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Three things to look at first", id: "first" },

    { t: "p", text: "A long plan has one or two lines that matter. **First, the widest node** — the largest `actual rows × loops` — because that is where the work is. **Second, the worst estimate** — the node where `rows=` and `actual rows` differ by the most, since every choice above it was made on the wrong number. **Third, anything that touched disk** — `Sort Method: external merge`, `Batches: 2` or more, `Buffers: … read=` in the thousands — because memory and disk differ by a hundred times.** Time on the top line tells you the query is slow; these three tell you why." },

    { t: "code", lang: "sql", title: "The loops trap, and a sort that spilled",
      hl: [4, 5, 6, 12, 13],
      code: `-- a Nested Loop whose inner side is a Seq Scan: the per-row time looks tiny and the loops multiply it
-- ->  Nested Loop  (cost=0.00..8912345.00 rows=400000 width=8) (actual time=0.031..41230.114 rows=399812 loops=1)
--       Join Filter: (o.customer_id = c.customer_id)
--       ->  Seq Scan on customers c  (actual time=0.008..12.102 rows=50000 loops=1)
--       ->  Seq Scan on orders o     (actual time=0.002..0.611  rows=8      loops=50000)      <- 0.6 ms x 50,000 = 30 s
--             Filter: (status = 'refunded')
--             Rows Removed by Filter: 379992                                                   <- per loop: 380k x 50k rows examined
-- the inner scan reads all of orders once per customer. An index on orders(customer_id) turns the inner side into
-- an Index Scan with loops=50000 and rows=8, or lets the planner choose a Hash Join instead.

-- a sort that did not fit in work_mem
-- ->  Sort  (cost=… rows=400000 width=24) (actual time=1850.2..2210.7 rows=400000 loops=1)
--       Sort Key: o.placed_at
--       Sort Method: external merge  Disk: 15680kB                                              <- spilled; quicksort Memory: … is the in-memory form
-- raise work_mem for the session, add an index that supplies the order, or reduce the rows reaching the sort.`,
      caption: "`actual time` and `actual rows` are per loop. A node showing 0.6 ms and 8 rows at `loops=50000` did 30 seconds of work and examined 19 billion rows. Multiply before judging any node under a Nested Loop."
    },

    { t: "h2", n: "04", text: "The same reading, on other engines", id: "dialects" },

    { t: "p", text: "The vocabulary differs; the reading does not. SQLite's `EXPLAIN QUERY PLAN` prints `SCAN table` for a full scan and `SEARCH table USING INDEX name (col=?)` for an index lookup — no costs, no actuals, but the distinction that matters. MySQL's `EXPLAIN` gives a row per table with `type` (ALL = full scan, ref = index lookup), `key`, and estimated `rows`; `EXPLAIN ANALYZE` adds actuals from 8.0.18. DuckDB's `EXPLAIN ANALYZE` draws the tree as boxes with per-operator time. **In every one of them: find the full scans, find the estimate that was wrong, find the spill.**" },

    { t: "code", lang: "sql", title: "SQLite: the plan lines that decide everything (measured on 400,000 orders)",
      hl: [2, 5, 9],
      code: `EXPLAIN QUERY PLAN SELECT order_id FROM orders WHERE customer_id = 4242;
-- SCAN orders                                                           15.1 ms   -- no index: every row examined
CREATE INDEX orders_customer ON orders (customer_id);
EXPLAIN QUERY PLAN SELECT order_id FROM orders WHERE customer_id = 4242;
-- SEARCH orders USING COVERING INDEX orders_customer (customer_id=?)     0.0 ms   -- index seek, answered from the index

EXPLAIN QUERY PLAN SELECT status FROM orders WHERE customer_id = 4242;
-- SEARCH orders USING INDEX orders_customer (customer_id=?)                        -- seek, then the row for 'status'
EXPLAIN QUERY PLAN SELECT order_id, placed_at FROM orders ORDER BY placed_at, order_id LIMIT 20 OFFSET 200000;
-- SCAN orders | USE TEMP B-TREE FOR ORDER BY                          2134.7 ms   -- a full sort to skip 200,000 rows (5.4)

-- MySQL:  EXPLAIN ... -> type: ALL (scan) | ref (index) | range | index ; key: which index ; rows: estimate
-- DuckDB: EXPLAIN ANALYZE ... -> the box tree, each box with its actual rows and time`,
      caption: "`SCAN` versus `SEARCH` is nine-tenths of what an EXPLAIN tells you on any engine. `USE TEMP B-TREE FOR ORDER BY` is SQLite's spelling of a Sort node — and the two-second line is a sort of 400,000 rows to serve a page of twenty."
    },

    { t: "callout", kind: "production", title: "EXPLAIN ANALYZE runs the query", body: [
      { t: "p", text: "With ANALYZE, the statement is executed — an `EXPLAIN ANALYZE DELETE` deletes. Wrap it in `BEGIN … ROLLBACK` for anything that writes. And a plan taken on the console with a literal can differ from the plan the application's prepared statement uses (5.1): to see the application's plan, `PREPARE` the statement and `EXPLAIN ANALYZE EXECUTE` it, or enable `auto_explain` to log slow plans as they actually ran." }
    ]},

    { t: "ladder",
      title: "Reading a slow plan",
      rungs: [
        { level: "bad", label: "Read the top line", code: `Execution Time: 41230 ms     -- "it is slow"`,
          note: "**The top line says how slow, not why.** Every plan has one; it is the least informative line in it." },
        { level: "ok", label: "Find the highest-cost node", code: `-> Nested Loop (cost=0.00..8912345.00 ...)     -- the planner's own worst estimate`,
          note: "**Closer.** Cost is what the planner *expected* to be expensive; when its estimates are wrong, its cost ranking is wrong in the same places." },
        { level: "best", label: "Widest node, worst estimate, spills — with loops multiplied", code: `-> Seq Scan on orders (actual rows=8 loops=50000)  Rows Removed by Filter: 379992   -- 19 billion rows examined
-> Hash (rows=50000) (actual rows=50000)  Batches: 1                                -- fine
-> Sort  Sort Method: external merge Disk: 15680kB                                  -- spilled`,
          note: "**The inner scan under the loop is the query.** Actual rows times loops locates the work; the estimate gap says whether the planner could have known; the spill says whether memory was the constraint. Fix in that order." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Four plans, four diagnoses",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Each fragment below is from an EXPLAIN ANALYZE. For each, name the problem, the line that reveals it, and the fix — index, ANALYZE, rewrite, memory, or nothing." },
        { t: "code", lang: "sql", code: `-- A
->  Seq Scan on events e  (cost=0.00..91234.00 rows=12 width=16) (actual time=0.02..812.4 rows=2140000 loops=1)
      Filter: (occurred_at >= '2025-12-01')
      Rows Removed by Filter: 3100000
-- B
->  Nested Loop  (actual time=0.05..98211.3 rows=2140000 loops=1)
      ->  Index Scan using events_time on events e  (actual rows=2140000 loops=1)
      ->  Index Scan using customers_pkey on customers c  (actual time=0.041..0.041 rows=1 loops=2140000)
-- C
->  HashAggregate  (cost=… rows=200 width=40) (actual time=5121.0..5410.2 rows=1980000 loops=1)
      Group Key: e.session_key
      Batches: 33  Memory Usage: 4097kB  Disk Usage: 212000kB
-- D
->  Index Scan using orders_customer on orders o  (cost=0.43..8.45 rows=1 width=40) (actual time=0.012..0.014 rows=3 loops=1)
      Index Cond: (customer_id = 1)` }
      ],
      requirements: [
        "For each of A–D: the problem, the evidence line, and the fix.",
        "For B, the total time the inner side accounts for and why the join algorithm is the issue.",
        "For D, why no action is needed."
      ],
      hint: "A: estimate 12, actual 2.1 million on a date predicate. B: a 41 µs probe times 2.14 million. C: 200 groups expected, 1.98 million produced, 33 batches. D: read the numbers.",
      solution: {
        lang: "sql",
        title: "plan_diagnoses.sql",
        code: `-- A: stale statistics. The planner estimated 12 rows for >= 2025-12-01 (the histogram ends before December) and got 2.1 million.
--    Evidence: rows=12 vs actual rows=2140000 on a scan with a date filter. Everything above it was planned for 12 rows.
--    Fix: ANALYZE events; then re-plan. The Seq Scan itself may be right for 40 % of the table -- judge after the estimate is fixed.

-- B: a Nested Loop over 2.14 million outer rows, each probing customers by primary key. 41 us x 2,140,000 = 88 seconds
--    of the 98 s total. Each probe is cheap; the count is the problem. The planner chose it because it believed the outer
--    side was 12 rows (see A): fix the estimate and it will choose a Hash Join -- one build of customers, one pass over events.
--    Evidence: loops=2140000 on the inner Index Scan. Fix: ANALYZE (upstream), then verify the join becomes a Hash Join.

-- C: the aggregate expected 200 groups and produced 1.98 million; the hash table spilled to disk in 33 batches.
--    Evidence: rows=200 vs actual 1980000, Batches: 33, Disk Usage: 212 MB. The n_distinct estimate for session_key is wrong --
--    a long-tailed key sampled badly. Fix: ALTER TABLE events ALTER COLUMN session_key SET STATISTICS 1000; ANALYZE events;
--    with a correct estimate the planner picks GroupAggregate over a sort, or sizes the hash; raising work_mem for the session
--    is the short-term relief.

-- D: nothing. Estimated 1 row, actual 3, 14 microseconds, an index seek. An estimate off by 3 on a 3-row result is noise;
--    the plan is the right plan. Not every gap is a problem -- the ones that matter are orders of magnitude on wide nodes.`,
        notes: [
          { t: "p", text: "**A and B are one problem seen at two levels.** The scan's bad estimate is the cause; the join algorithm chosen on that estimate is the symptom that costs 88 seconds. Fixing the statistic fixes both, and adding an index to 'help' the nested loop would have left a plan that should never have been a nested loop." },
          { t: "p", text: "**C is the aggregate version of the same story**: a wrong distinct-count estimate sized a hash for 200 groups and got two million, and the overflow went to disk. The remedy is a better statistic first, memory second." },
          { t: "p", text: "**D is included because reading plans means knowing when to stop.** A three-row index seek in 14 microseconds is the plan you want; an estimate of 1 against 3 is not a diagnosis." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "An inner Index Scan shows `actual time=0.041..0.041 rows=1 loops=2140000`. How much time does that node account for?",
          options: [
            "41 microseconds",
            "About 88 seconds — actual time is per loop, and the node ran 2.14 million times",
            "It cannot be determined",
            "0.041 × 1 = 0.041 ms"
          ],
          answer: 1,
          why: "Everything under a Nested Loop reports per-loop figures. Multiply by loops before judging the node; a cheap operation repeated millions of times is the most common slow query there is."
        }
      ]
    }
  ],

  takeaways: [
    "**EXPLAIN is the planner's intent; EXPLAIN ANALYZE is what happened** — and ANALYZE really executes the statement.",
    "**Read the tree from the leaves up**; the top line's time is the whole query and the least useful line.",
    "**`rows=` is the estimate, `actual rows=` the truth; the gap is the diagnosis** and the node with the biggest gap is where the plan went wrong.",
    "**Multiply by loops.** Per-loop time and rows under a Nested Loop hide the total.",
    "**Look at three things first: the widest node, the worst estimate, any spill to disk.**",
    "**Seq Scan is right for large fractions; Index Scan for selective predicates; Index Only Scan when the index covers; Bitmap for the middle and for ORs.**",
    "**Nested Loop wants a small outer and an indexed inner; Hash Join wants an equality and memory; Merge Join wants sorted inputs.**",
    "**`Batches` above 1, `external merge Disk`, and large `Buffers … read` are the memory-and-disk signals.**",
    "**`Rows Removed by Filter` in the millions is work on rows the query did not want** — a missing index or an unsargable predicate.",
    "**Every engine prints the same story in different words**: SCAN versus SEARCH, type ALL versus ref, boxes with times.",
    "**Not every gap is a problem**: an estimate of 1 against 3 on a 14-microsecond seek is the plan you want."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?",
        options: [
          "ANALYZE refreshes statistics first",
          "EXPLAIN shows the planned tree with estimates without running the query; EXPLAIN ANALYZE executes it and adds actual rows, times and loops per node — including the side effects of a write",
          "ANALYZE shows costs in milliseconds",
          "There is none in PostgreSQL"
        ],
        answer: 1,
        why: "The estimate-versus-actual comparison is the whole point of ANALYZE. The price is that the query really runs: wrap writes in a transaction you roll back."
      },
      {
        stem: "A Hash node shows `Batches: 16`. What does that mean?",
        options: [
          "Sixteen parallel workers",
          "The build side did not fit in work_mem, so it was split into 16 batches written to and read back from disk — raise work_mem, reduce the build input, or check the estimate that sized the hash",
          "The join has 16 conditions",
          "It is normal for large joins"
        ],
        answer: 1,
        why: "One batch means the hash lived in memory. Several means disk was involved on both the build and probe sides, which is often the difference between seconds and minutes."
      },
      {
        stem: "A Seq Scan reports `rows=12` estimated and `actual rows=2140000`. What should you do first?",
        options: [
          "Add an index on the filtered column",
          "Run ANALYZE on the table — the estimate is off by five orders of magnitude, which means the statistics do not describe the current data, and every decision above the scan was made on the wrong number",
          "Increase work_mem",
          "Rewrite as a CTE"
        ],
        answer: 1,
        why: "An index decides how rows are fetched; it does nothing for a planner that thinks there are 12 of them. Fix the belief, re-plan, and then judge whether the scan was the right access path."
      },
      {
        stem: "Which plan node is the sign of a correlated subquery the planner could not flatten?",
        options: [
          "Hash Join",
          "SubPlan with a large `loops=` — executed once per outer row",
          "Materialize",
          "Index Only Scan"
        ],
        answer: 1,
        why: "Decorrelated subqueries become joins. A SubPlan node that loops per row is the per-row kind from 4.1; the fix is a window function, a derived table or LATERAL with an index."
      },
      {
        stem: "`Index Only Scan … Heap Fetches: 180000` on a 200,000-row result. What is happening?",
        options: [
          "The index is corrupt",
          "The visibility map is stale, so most index entries needed a heap visit to confirm the row is visible — VACUUM the table to restore the index-only benefit",
          "The index does not cover the query",
          "Heap fetches are always required"
        ],
        answer: 1,
        why: "An index-only scan avoids the heap only for pages the visibility map marks all-visible. After heavy updates the map is stale until VACUUM runs; the scan still works, but pays the heap visits it was meant to skip."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you read an EXPLAIN ANALYZE output?",
        strong: "As a tree, from the leaves up, with two sets of numbers per node: the planner's estimate — cost, rows — and the run's actuals — time, rows, loops. I look for three things first. The widest node, meaning the largest actual rows times loops, because that is where the work is. The worst estimate, meaning the node where rows and actual rows differ by the most, because every choice above it was made on that number. And anything that touched disk — external merge sorts, hash batches above one, buffers read rather than hit. Then I ask whether the fix is a statistic, an index, a rewrite or memory, in that order.",
        answer: [
          { t: "p", text: "The three-things-first discipline, with loops multiplied, is what distinguishes reading a plan from staring at it." }
        ]
      },
      {
        level: "core",
        q: "When does the planner choose a nested loop, a hash join, or a merge join?",
        strong: "Nested loop when the outer input is small and the inner side can be probed cheaply — an index seek per outer row — and always for LATERAL; it is quadratic if the inner side is a scan. Hash join for equality joins on inputs of any size: build a hash of the smaller side in memory, probe with the larger, one pass each; it needs the build side to fit in work_mem or it batches to disk. Merge join when both inputs are already sorted on the join key — from indexes or from sorts the query needed anyway — one pass over each. A wrong choice is almost always a wrong row estimate: a nested loop planned for 12 outer rows that turned out to be two million.",
        answer: [
          { t: "p", text: "Tying the choice back to the estimate, rather than to the join types in isolation, is the mark of experience." }
        ]
      },
      {
        level: "advanced",
        q: "A query plan looks fine — index scans everywhere — but the query takes a minute. Where do you look?",
        strong: "At loops. An index scan reporting 40 microseconds is fine once and fatal two million times, and everything under a nested loop reports per-loop figures. I multiply actual rows and time by loops for each node and find the one that accounts for the wall time. Then I check the estimate on the outer side of that loop — usually it was believed to be tiny, which is why the planner chose to probe per row — and fix the statistic so a hash join is chosen. If loops are not the story, the next candidates are heap fetches on an index-only scan after heavy updates, a sort that spilled, or buffers read from cold disk on the first run that a re-run would show as cached.",
        answer: [
          { t: "p", text: "Leading with loops is the answer; the fallbacks show breadth." }
        ]
      }
    ]
  }
});

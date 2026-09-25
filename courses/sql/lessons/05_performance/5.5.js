/* ============================================================================
   LESSON 5.5 — Joins, Aggregates and Partitions at Scale
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "**Past a few million rows, the question stops being 'which index' and becomes 'how many rows reach each operator'.** A join that multiplies before it aggregates does most of its work on rows the aggregate will collapse; a COUNT DISTINCT over a billion rows is a hash of a billion keys; a report that recomputes last year's totals every morning pays for last year every morning. The techniques here — join order, pre-aggregation, summary tables, partitioning — all reduce the rows that flow, and the planner does some of them for you if you let it.",

  objectives: [
    "Explain how join order and algorithm are chosen and when to influence them by restructuring the query",
    "Pre-aggregate before joining to cut the rows a join produces, and know when the planner already does",
    "Handle COUNT DISTINCT at scale: exact via grouping, approximate via HyperLogLog",
    "Use materialised views and summary tables for expensive aggregates, with a refresh strategy",
    "Partition a large table by range, list or hash and write predicates that prune partitions"
  ],

  prerequisites: ["5.2", "5.3"],

  blocks: [

    { t: "h2", n: "01", text: "Join order: start from the smallest input", id: "order" },

    { t: "p", text: "For a three-table join the planner considers the orders and algorithms and picks the cheapest estimated plan — which almost always means **start from whichever table the predicates shrink the most, then join outward through indexes or hashes.** A filter on a customer's country should drive the join from customers, not from the far larger items table. The planner does this when its estimates are right (5.1); when they are not, it starts from the wrong side, and the plan shows a large table scanned first with a small one probed per row." },

    { t: "code", lang: "sql", title: "A filtered three-table join, driven from the filtered side (SQLite, measured)",
      hl: [3, 4],
      code: `SELECT SUM(oi.qty * oi.unit_price)
FROM   customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_items oi ON oi.order_id = o.order_id
WHERE  c.country = 'NG';
--   SCAN c | SEARCH o USING COVERING INDEX orders_customer (customer_id=?) | SEARCH oi USING INDEX items_order (order_id=?)    88 ms
--   start from customers (the predicate is there), probe orders per customer, probe items per order: every row that flows is wanted.
--   the other order -- scan 800,000 items, probe orders, probe customers, THEN filter on country -- would touch everything.

-- PostgreSQL: the planner's join search is exhaustive up to join_collapse_limit (8 tables) and genetic beyond;
-- to see what it chose: EXPLAIN, and read which table is the outer of the outermost join.
-- to force an order when the estimate is hopeless: SET join_collapse_limit = 1 (joins in written order) -- a last resort.`,
      caption: "The right join order is the one where the filter is applied earliest, so the fewest rows travel to the next join. You influence it with statistics (5.1) and with predicates that are sargable on the driving table (5.4) — and, rarely, by collapsing the join order to the one you wrote."
    },

    { t: "dl", items: [
      ["Join order", "Which table is scanned first and which are probed from it. Chosen by cost; the filtered, small side should drive."],
      ["Pre-aggregation", "Grouping a child table to one row per parent key before joining it, so the join produces parent-grain rows rather than child-grain rows that the outer GROUP BY then collapses."],
      ["Summary table / materialised view", "A stored result of an expensive aggregate, refreshed on a schedule or incrementally. Reads become a scan of the summary; writes pay for the refresh."],
      ["HyperLogLog", "A probabilistic sketch that estimates distinct counts within about 1–2 % using kilobytes, mergeable across partitions. `approx_count_distinct` in most warehouses; the `hll` extension in PostgreSQL."],
      ["Partition", "A large table split into child tables by a key's range, list or hash. Queries with a predicate on the key read only the matching children — partition pruning."],
      ["Partition pruning", "The planner's elimination of partitions whose bounds cannot match the predicate. Needs a sargable predicate on the partition key, in the query itself."]
    ]},

    { t: "h2", n: "02", text: "Aggregate before you join", id: "preagg" },

    { t: "p", text: "Revenue per customer joins orders to items — one row per item — and groups by customer. Every item row carries the customer id through the join before the GROUP BY collapses it. **Aggregate items to one row per order first, and the join carries one row per order instead**: fewer rows through the join, and the fan-out of 2.2 cannot happen because nothing is many any more. The planner sometimes does this rewrite itself (eager aggregation); writing it out guarantees it, and it makes the grain of every step visible." },

    { t: "code", lang: "sql", title: "Group after the join, and group before it (measured)",
      hl: [2, 6, 7],
      code: `SELECT o.customer_id, SUM(oi.qty * oi.unit_price)
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id GROUP BY o.customer_id;
--   800,000 item rows through the join, then grouped                                                          717 ms

SELECT o.customer_id, SUM(t.amount)
FROM   orders o JOIN (SELECT order_id, SUM(qty * unit_price) AS amount FROM order_items GROUP BY order_id) t
                ON t.order_id = o.order_id
GROUP  BY o.customer_id;
--   items grouped to 400,000 order rows first, then joined and grouped                                         376 ms
-- half the time, and the query says its grain at each step. Add a second child -- events per customer -- and only the
-- second form stays correct (2.2); the first multiplies.`,
      caption: "The saving here is the join carrying 400,000 rows instead of 800,000. On a warehouse with a thousand items per order it is a thousand-fold reduction, and it is the difference between a query that runs and one that spills."
    },

    { t: "h2", n: "03", text: "COUNT DISTINCT, exact and approximate", id: "distinct" },

    { t: "p", text: "`COUNT(DISTINCT customer_id)` has to remember every distinct key it has seen — a hash of every key, which for a billion events is memory the query does not have. **Exact answers scale with the number of distinct values**: group by the key first and count the groups, which the planner can sort or hash in batches. **Approximate answers scale with nothing**: a HyperLogLog sketch is a few kilobytes, accurate to about 1 %, and sketches from different partitions or days can be merged — which is why warehouses expose `approx_count_distinct` and why daily sketches give a monthly unique count without re-reading the month." },

    { t: "code", lang: "sql", title: "Three ways to count distinct customers",
      hl: [1, 4, 8, 11],
      code: `SELECT COUNT(DISTINCT customer_id) FROM orders;                                     -- 10 ms on 400,000 (measured)
-- a hash set of every distinct key; fine at 50,000 distinct, a problem at 500 million

SELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id) t;          -- 18 ms here; scales better
-- the GROUP BY can spill to disk in batches; COUNT(DISTINCT) on some engines cannot, and on all engines
-- cannot be combined with other DISTINCT aggregates in one pass -- each one is its own hash

-- approximate: a sketch, mergeable, constant memory
SELECT approx_count_distinct(customer_id) FROM orders;                                 -- DuckDB, Snowflake, Databricks, ClickHouse (uniq)
SELECT APPROX_COUNT_DISTINCT(customer_id) FROM orders;                                 -- BigQuery, SQL Server 2019+
-- PostgreSQL: the hll extension -- hll_add_agg(hll_hash_integer(customer_id)), stored per day, hll_union_agg across days

-- when it matters which: a billing figure is exact; a dashboard's "unique visitors this month" is a sketch`,
      caption: "A distinct count is the one aggregate that does not stream. The GROUP BY form gives the planner a spillable plan; the sketch gives a number that is wrong by a percent and costs nothing. Decide which the number is for before choosing."
    },

    { t: "h2", n: "04", text: "Summary tables and materialised views", id: "summary" },

    { t: "p", text: "A monthly revenue report reads every order and item since the beginning, every time it runs, to produce a few hundred numbers that changed only for the current month. **A summary table stores those numbers; the report reads the summary.** A materialised view is a summary table the database knows how to rebuild — `REFRESH MATERIALIZED VIEW` — and can index. The design question is freshness: rebuild nightly, refresh incrementally for the changed periods, or keep the current month live from the base tables and everything older from the summary." },

    { t: "code", lang: "sql", title: "The report from base tables and from a summary (measured), and the refresh",
      hl: [2, 5, 9, 14],
      code: `SELECT substr(o.placed_at, 1, 7) AS month, SUM(oi.qty * oi.unit_price)
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1;    -- 561 ms: 800,000 items every run

SELECT month, revenue FROM monthly_revenue WHERE status = 'paid';                                        --   0 ms: a few hundred rows

-- PostgreSQL: a materialised view with an index, refreshed without blocking readers
CREATE MATERIALIZED VIEW monthly_revenue AS
  SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month, o.status, SUM(oi.qty * oi.unit_price) AS revenue, COUNT(DISTINCT o.order_id) AS orders
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id GROUP BY 1, 2;
CREATE UNIQUE INDEX ON monthly_revenue (month, status);         -- required for CONCURRENTLY, and useful anyway
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;         -- readers keep the old version until the new one is ready

-- incremental: recompute only the months that changed, into a plain summary table
DELETE FROM monthly_summary WHERE month >= DATE_TRUNC('month', now() - INTERVAL '1 month');
INSERT INTO monthly_summary SELECT ... WHERE o.placed_at >= DATE_TRUNC('month', now() - INTERVAL '1 month') GROUP BY ...;
-- closed months never change; the last two are rebuilt each night. Data Handling 8.3: a late-arriving refund CAN change a closed month --
-- decide how far back "closed" is, and record it.`,
      caption: "Every summary is a statement about freshness: this number was true as of the last refresh. Put the refresh time in the view or beside the dashboard, and rebuild the periods that can still change. A summary that silently excludes late-arriving rows is the temporal leak of 8.3 in reporting clothes."
    },

    { t: "h2", n: "05", text: "Partitioning", id: "partitioning" },

    { t: "p", text: "A table of five years of events is, to every query about last week, 99 % irrelevant rows that an index must skip and a scan must read. **Partitioning splits the table into children by a key — a month of `occurred_at`, a region, a hash of the customer id — and a query whose predicate names the key reads only the matching children.** Old partitions are dropped in one statement instead of a delete of a billion rows; each partition has its own indexes and statistics; and a predicate that does not name the key reads them all, as before." },

    { t: "code", lang: "sql", title: "Range partitioning by month, pruning, and the predicate that defeats it (PostgreSQL)",
      hl: [1, 2, 8, 12, 15],
      code: `CREATE TABLE events (event_id BIGINT, customer_id INT, event_type TEXT, occurred_at TIMESTAMPTZ NOT NULL)
PARTITION BY RANGE (occurred_at);
CREATE TABLE events_2025_03 PARTITION OF events FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE events_2025_04 PARTITION OF events FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
-- ... one per month; pg_partman or a cron job creates them ahead of time

EXPLAIN SELECT COUNT(*) FROM events WHERE occurred_at >= '2025-04-01' AND occurred_at < '2025-04-08';
-- Aggregate
--   ->  Seq Scan on events_2025_04           <- only April's child: the others were pruned at plan time

EXPLAIN SELECT COUNT(*) FROM events WHERE DATE_TRUNC('month', occurred_at) = '2025-04-01';
-- Append -> Seq Scan on events_2025_03, events_2025_04, ... every partition   <- a function on the key: no pruning (5.4 again)

DROP TABLE events_2024_03;                     -- a month of data gone in milliseconds; DELETE would take an hour and leave bloat

-- LIST: PARTITION BY LIST (region) FOR VALUES IN ('eu', 'uk')   -- when queries are per region
-- HASH: PARTITION BY HASH (customer_id) ... MODULUS 8, REMAINDER n   -- to spread writes; prunes only on customer_id equality`,
      caption: "Pruning is sargability applied to partitions: the predicate must be on the bare key, and the planner must be able to evaluate it before choosing children — a parameter it only learns at execution time prunes at execution (run-time pruning), a function on the key never does. Partition by the column every hot query filters on, and by the column whose old values you will drop."
    },

    { t: "viz",
      title: "Pruning: read one child, not the table",
      caption: "Five monthly partitions under one parent. A range predicate on the partition key selects the one child whose bounds overlap it; the others are never opened. A function on the key hides the bounds from the planner, and every child is scanned.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A parent table box above five monthly partition boxes; a predicate on occurred_at highlights only the April partition, while a predicate with DATE_TRUNC on the key highlights all five.">
  <rect x="340" y="20" width="200" height="34" rx="6" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)" stroke-width="1.2"/>
  <text x="440" y="42" class="s-label" text-anchor="middle">events (parent)</text>
  <g style="stroke:var(--ink-3)" stroke-width="1" fill="none">
    <line x1="440" y1="54" x2="100" y2="90"/><line x1="440" y1="54" x2="270" y2="90"/><line x1="440" y1="54" x2="440" y2="90"/><line x1="440" y1="54" x2="610" y2="90"/><line x1="440" y1="54" x2="780" y2="90"/>
  </g>
  <g stroke-width="1.2">
    <rect x="40" y="90" width="120" height="40" rx="6" style="fill:var(--ink-4);fill-opacity:.15;stroke:var(--ink-3)"/>
    <rect x="210" y="90" width="120" height="40" rx="6" style="fill:var(--ink-4);fill-opacity:.15;stroke:var(--ink-3)"/>
    <rect x="380" y="90" width="120" height="40" rx="6" style="fill:var(--ink-4);fill-opacity:.15;stroke:var(--ink-3)"/>
    <rect x="550" y="90" width="120" height="40" rx="6" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
    <rect x="720" y="90" width="120" height="40" rx="6" style="fill:var(--ink-4);fill-opacity:.15;stroke:var(--ink-3)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="100" y="114">2024_12</text><text x="270" y="114">2025_01</text><text x="440" y="114">2025_02</text><text x="610" y="114" style="fill:var(--good)">2025_03</text><text x="780" y="114">2025_04</text>
  </g>
  <text x="440" y="160" class="s-sub" text-anchor="middle" style="fill:var(--good)">WHERE occurred_at &gt;= '2025-03-01' AND occurred_at &lt; '2025-03-08'  →  one partition opened</text>
  <g stroke-width="1.2">
    <rect x="40" y="180" width="120" height="8" rx="2" style="fill:var(--crit);fill-opacity:.4"/><rect x="210" y="180" width="120" height="8" rx="2" style="fill:var(--crit);fill-opacity:.4"/>
    <rect x="380" y="180" width="120" height="8" rx="2" style="fill:var(--crit);fill-opacity:.4"/><rect x="550" y="180" width="120" height="8" rx="2" style="fill:var(--crit);fill-opacity:.4"/>
    <rect x="720" y="180" width="120" height="8" rx="2" style="fill:var(--crit);fill-opacity:.4"/>
  </g>
  <text x="440" y="212" class="s-sub" text-anchor="middle" style="fill:var(--crit)">WHERE DATE_TRUNC('month', occurred_at) = '2025-03-01'  →  the key is inside a function: every partition scanned</text>
  <text x="440" y="238" class="s-sub" text-anchor="middle">Pruning is decided from the predicate's shape, exactly as index use is.</text>
</svg>`
    },

    { t: "table",
      head: ["Technique", "Reduces", "Cost", "Use when"],
      rows: [
        ["Join from the filtered side", "Rows entering each join", "None — statistics and sargable predicates let the planner do it", "Always; check the plan's outer table"],
        ["Pre-aggregate children", "Rows a join produces; removes fan-out", "A GROUP BY per child", "Any parent with several one-to-many children, or a wide child"],
        ["GROUP BY instead of COUNT DISTINCT", "Memory of the distinct set", "A sort or hash that can spill", "Many distinct values; several distinct counts in one query"],
        ["HyperLogLog sketch", "Memory to kilobytes", "About 1 % error", "Dashboards, unique visitors, anything not billed"],
        ["Materialised view / summary", "Rows read per report to the summary's size", "A refresh, and a freshness contract", "Expensive aggregates read often; closed periods"],
        ["Range / list partitioning", "Partitions opened per query; delete cost", "Predicates must name the key; more objects to manage", "Time series with retention; per-region access"],
        ["Hash partitioning", "Contention and per-partition size", "Prunes only on key equality", "Spreading writes over a hot table"]
      ]
    },

    { t: "ladder",
      title: "A nightly 'revenue by customer segment' report over five years",
      rungs: [
        { level: "bad", label: "Everything joined, then grouped", code: `SELECT c.tier, DATE_TRUNC('month', o.placed_at), SUM(oi.qty * oi.unit_price)
FROM customers c JOIN orders o ON ... JOIN order_items oi ON ... JOIN events e ON e.customer_id = c.customer_id
GROUP BY 1, 2;`,
          note: "**Every item row, times every event row of its customer, every night, for five years.** Fan-out makes the numbers wrong and the volume makes the query slow; both are the same mistake." },
        { level: "ok", label: "Pre-aggregated children, but from scratch each night", code: `WITH ot AS (SELECT order_id, customer_id, DATE_TRUNC('month', placed_at) AS m, SUM(...) FROM ... GROUP BY 1, 2, 3),
     ev AS (SELECT customer_id, COUNT(*) FROM events GROUP BY customer_id)
SELECT c.tier, ot.m, SUM(ot.amount), ... FROM customers c JOIN ot ... LEFT JOIN ev ... GROUP BY 1, 2;`,
          note: "**Correct grain, and still five years of items and events read nightly** to produce numbers of which only the current month can have changed." },
        { level: "best", label: "Summary for closed months, live for the open one, partitioned base tables", code: `-- orders and events partitioned by month; monthly_segment_revenue summary refreshed for the last two months each night
SELECT tier, month, revenue FROM monthly_segment_revenue WHERE month < DATE_TRUNC('month', now())
UNION ALL
SELECT ... FROM (the pre-aggregated query) WHERE placed_at >= DATE_TRUNC('month', now());   -- prunes to one partition`,
          note: "**Closed months are read from a few hundred summary rows; the open month is computed from one partition; the refresh rebuilds only what can still change.** The report is fast because it reads what changed, not because any single query got clever." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Design",
      title: "Making a dashboard query survive a year of growth",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A dashboard runs, every minute, `daily active customers for the last 30 days` and `revenue per category for the last 90 days`, against `events` (200 million rows, growing 15 million a month) and `orders` / `order_items` (20 million / 60 million). Both queries currently join and group from the base tables and take 40 seconds each. Design the fix: what to partition and by what, what to pre-aggregate and at what grain, which count becomes a sketch, what to materialise and how to refresh it — and write the two queries as they would read afterwards." },
        { t: "p", text: "State the freshness each dashboard number will have, and the one thing that could make a 'closed' day change." }
      ],
      requirements: [
        "A partitioning key and interval for events, with the predicate shape the dashboard must use to prune.",
        "A daily summary table for both metrics, with the refresh window and why.",
        "approx versus exact for the distinct customers, with the reason.",
        "The two rewritten queries and their expected cost.",
        "Verified on the shop that the summary and the base-table query agree for a month."
      ],
      hint: "Daily active customers is a distinct count per day: store a per-day HLL sketch or the exact per-day distinct count (which is small — one row per day). Revenue per category per day is a plain aggregate at (day, category). Both refresh for the last 2 days each night and the current day every few minutes. Late refunds are the closed-day change.",
      solution: {
        lang: "sql",
        title: "dashboard_at_scale.sql",
        code: `-- 1. partition the big tables by month on the time column the dashboard filters on
--    events PARTITION BY RANGE (occurred_at), orders PARTITION BY RANGE (placed_at); order_items stays with orders (join by order_id, or partition
--    order_items by the order's month if the join is hot). Dashboard predicates must be bare ranges on those columns to prune.

-- 2. a daily summary at the grain the dashboard reads
CREATE TABLE daily_summary (
  day            DATE NOT NULL,
  category       TEXT NOT NULL,             -- 'uncategorised' for NULL
  revenue        NUMERIC(14,2) NOT NULL,
  active_customers INT NOT NULL,            -- exact per day: COUNT(DISTINCT) over one day's events is cheap
  PRIMARY KEY (day, category)
);
-- active_customers is per (day) really; store it on a category row of '*' or in a second table. Per-day exact is fine:
-- one day's distinct customers fits in memory. A 30-day UNIQUE across days would need HLL sketches (customers active on
-- several days must not be double-counted): store hll per day and hll_union_agg over 30 days if the dashboard needs it.

-- 3. refresh: closed days rebuilt for a trailing window, the open day every few minutes
DELETE FROM daily_summary WHERE day >= CURRENT_DATE - 2;
INSERT INTO daily_summary
SELECT o.placed_at::DATE, COALESCE(p.category, 'uncategorised'), SUM(oi.qty * oi.unit_price), 0
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id
WHERE  o.status = 'paid' AND o.placed_at >= CURRENT_DATE - 2                      -- prunes to the current partition(s)
GROUP  BY 1, 2;
-- (and the same for active customers from events over the same window)
-- freshness: closed days as of the nightly run; today as of the last few-minute refresh -- printed on the dashboard.
-- the closed-day change: a refund arriving for an order placed three days ago. Either widen the window to the refund
-- horizon (Data Handling 8.3), or accept and document that days older than 2 are final as of their refresh.

-- 4. the dashboard queries afterwards
SELECT day, SUM(active_customers) FROM daily_summary WHERE day >= CURRENT_DATE - 30 GROUP BY day ORDER BY day;   -- 30 rows read
SELECT category, SUM(revenue) FROM daily_summary WHERE day >= CURRENT_DATE - 90 GROUP BY category;             -- ~360 rows read
-- from 40 s to milliseconds, because each reads a few hundred summary rows instead of 260 million base rows.

-- 5. verification on the shop: the summary for March must equal the base-table figure
-- SELECT SUM(revenue) FROM daily_summary WHERE day >= '2025-03-01' AND day < '2025-04-01'        -> 190.50
-- SELECT SUM(oi.qty * oi.unit_price) FROM orders o JOIN order_items oi ON ... WHERE o.status = 'paid' AND o.placed_at >= '2025-03-01' AND o.placed_at < '2025-04-01'   -> 190.50`,
        notes: [
          { t: "p", text: "**The dashboard did not get faster because a query got clever; it got faster because it reads what changed.** Partitioning bounds the refresh to the current month, the summary bounds the read to a few hundred rows, and the exact-per-day distinct count is cheap because one day's keys fit in memory — the sketch is only needed for a distinct count *across* days." },
          { t: "p", text: "**Freshness is part of the design, not an afterthought.** 'As of 02:00 for closed days, as of 5 minutes ago for today' is a contract the dashboard prints; the late-refund case is the one that breaks it, and the answer is a window sized to the refund horizon or an explicit statement that older days are final." },
          { t: "p", text: "**The verification is the same reconciliation as 2.2**: the summary for a closed month must equal the base-table aggregate for that month, and the check runs after every refresh." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A monthly-partitioned events table is queried with `WHERE DATE_TRUNC('month', occurred_at) = '2025-04-01'` and every partition is scanned. Why?",
          options: [
            "Partitioning does not support timestamps",
            "The partition key is inside a function, so the planner cannot compare the predicate with the partition bounds; write a half-open range on the bare column and only April's partition is opened",
            "The partitions need ANALYZE",
            "DATE_TRUNC forces a sequential scan"
          ],
          answer: 1,
          why: "Pruning is sargability at the partition level: the planner matches a bare-key predicate against each child's bounds. A transformed key hides the bounds, exactly as it hides an index."
        }
      ]
    }
  ],

  takeaways: [
    "**Past millions of rows, performance is about how many rows reach each operator**, not which index exists.",
    "**Drive a join from the filtered side**; the planner does it with good estimates, and sargable predicates on the driving table are how you help.",
    "**Pre-aggregate children to one row per parent before joining** — fewer rows through the join, and fan-out becomes impossible.",
    "**COUNT DISTINCT remembers every key**; GROUP BY then COUNT gives a spillable plan, and a HyperLogLog sketch gives a mergeable estimate in kilobytes.",
    "**A summary table or materialised view reads a few hundred rows where the base query reads millions** — at the price of a freshness contract.",
    "**Refresh only the periods that can still change**, decide how far back 'closed' is, and print the refresh time on the report.",
    "**Partition by the column hot queries filter on and by which old data is dropped**; a monthly range on the time column is the common case.",
    "**Pruning needs a bare-key predicate in the query**, like an index does; `DROP TABLE partition` replaces a billion-row DELETE.",
    "**Hash partitioning spreads writes and prunes only on equality**; list partitioning suits per-region access.",
    "**Verify a summary against the base tables for a closed period after every refresh** — the reconciliation check, again."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does aggregating order_items to one row per order before joining to orders speed up a per-customer revenue query?",
        options: [
          "Subqueries are cached",
          "The join carries one row per order instead of one per item, so far fewer rows flow through the join and the outer GROUP BY — and a second one-to-many child can no longer multiply the amounts",
          "GROUP BY is faster in a subquery",
          "It avoids reading order_items"
        ],
        answer: 1,
        why: "Rows through a join are the cost. Collapsing the child to parent grain first cuts them by the items-per-order ratio and removes the fan-out risk at the same time."
      },
      {
        stem: "When is `approx_count_distinct` the right choice over `COUNT(DISTINCT …)`?",
        options: [
          "Never — approximate is wrong",
          "For a dashboard figure such as unique visitors, where about 1 % error is acceptable and the exact set of a billion keys would not fit in memory; sketches also merge across days or partitions without re-reading the data",
          "Only for small tables",
          "When the column is indexed"
        ],
        answer: 1,
        why: "Exact distinct counts scale with the number of distinct values; sketches scale with nothing. Billing and audit figures stay exact; behavioural metrics usually need not be."
      },
      {
        stem: "What does `REFRESH MATERIALIZED VIEW CONCURRENTLY` require and provide?",
        options: [
          "Nothing special; it is always faster",
          "A unique index on the view, so the new result can be diffed into place while readers continue to see the old version rather than blocking on an exclusive lock",
          "That the view has no aggregates",
          "A partitioned base table"
        ],
        answer: 1,
        why: "The plain refresh takes an exclusive lock and readers wait. The concurrent form rebuilds beside the old data and applies the difference by unique key, which is why the unique index is mandatory."
      },
      {
        stem: "A five-year events table is partitioned monthly. What does retention become?",
        options: [
          "`DELETE FROM events WHERE occurred_at < …` on the parent",
          "`DROP TABLE events_2020_03` — detaching or dropping the oldest partition removes a month in milliseconds and leaves no bloat, where a DELETE would rewrite and vacuum a billion rows",
          "VACUUM FULL",
          "Re-creating the parent"
        ],
        answer: 1,
        why: "Partition-by-time turns retention from a data operation into a metadata operation. It is often the strongest reason to partition at all."
      },
      {
        stem: "A summary table shows a different March revenue from the base tables. What is the likeliest cause?",
        options: [
          "Floating-point drift",
          "A late-arriving change — a refund or a corrected order — landed in March after the summary's refresh window had moved past it; the refresh window must cover the horizon over which closed periods can still change",
          "The summary has an index",
          "Partition pruning skipped March"
        ],
        answer: 1,
        why: "A summary is true as of its refresh. Anything that can modify a closed period after that is a freshness gap — the same temporal issue as an unclosed label window, in reporting form."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A report query over a large fact table is slow. What are your options beyond adding an index?",
        strong: "Reduce the rows that flow. First check the join order in the plan — the filtered side should drive — and that the predicates on it are sargable so it can. Then pre-aggregate: group each child table to parent grain before joining, which cuts the join's row count by the child ratio and removes fan-out. If the report reads closed periods repeatedly, a summary table or materialised view stores the aggregate once and the report reads a few hundred rows; the design work is the refresh window and the freshness contract. If the table is time-ordered and queries filter on time, partition it monthly so queries prune to the partitions they need and retention becomes a DROP. And if a distinct count is the expensive part, GROUP BY then COUNT for an exact spillable plan, or a HyperLogLog sketch when a percent of error is fine.",
        answer: [
          { t: "p", text: "Five options, each with the condition under which it applies — that is what 'beyond an index' should sound like." }
        ]
      },
      {
        level: "core",
        q: "How does table partitioning improve performance, and when does it not?",
        strong: "A partitioned table is split into children by a key's range, list or hash. A query with a sargable predicate on the key is planned against only the children whose bounds overlap — partition pruning — so a week's query on five years of events opens one month. Each child has its own smaller indexes and statistics, and old data is removed by dropping a partition instead of deleting rows. It does not help a query that does not filter on the key, which reads every child through an Append; a predicate that wraps the key in a function prunes nothing; and hash partitioning prunes only on equality. Too many small partitions cost planning time — monthly or weekly, not daily, unless the volume demands it.",
        answer: [
          { t: "p", text: "Pruning as sargability, and the cases where it fails, show the concept is understood rather than the feature admired." }
        ]
      },
      {
        level: "advanced",
        q: "Design the refresh strategy for a materialised daily-revenue summary when refunds can arrive up to 30 days after an order.",
        strong: "The summary is keyed by day and category. Each night I rebuild a trailing window rather than just yesterday: delete and re-insert the last 31 days from the base tables, which is bounded work if orders are partitioned by month, and leave older days alone because nothing can change them once the refund horizon has passed. The current day refreshes every few minutes on the same delete-and-insert pattern over a one-day window. The dashboard prints two freshness times — closed days as of the nightly run, today as of the last refresh. After every nightly run a reconciliation query compares the summary's total for a closed month with the base tables and alerts on a difference, because the horizon is a business assumption and the day a 45-day refund appears is the day the check earns its keep. If the window rebuild is too heavy, the alternative is incremental: apply the day's refund and correction events to the affected summary rows, with the same reconciliation to catch drift.",
        answer: [
          { t: "p", text: "Sizing the refresh window to the horizon over which closed data can change, and checking it, is the whole design." }
        ]
      }
    ]
  }
});

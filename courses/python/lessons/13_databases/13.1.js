/* ============================================================================
   LESSON 13.1 — SQL Fundamentals for Python Engineers
   ========================================================================= */
EC.receiveLesson({
  id: "13.1",

  lede: "Most Python code that processes database results should not exist. **The loop that groups, filters and totals rows in memory is a query the database would have answered in one round trip** — using an index you already have, over data it never had to send you. Learning SQL properly deletes more Python than it adds.",

  objectives: [
    "Choose the right join, and predict how many rows come back",
    "Aggregate with `GROUP BY` and filter groups with `HAVING`",
    "Replace a Python loop over query results with a single query",
    "Use window functions for rankings and running totals",
    "Read a query with CTEs instead of nested subqueries"
  ],

  prerequisites: ["12.3"],

  blocks: [

    { t: "h2", n: "01", text: "The shape of a query", id: "shape" },

    {"kind": "steps", "title": "The order a query is evaluated", "caption": "Written SELECT-first, executed FROM-first. Knowing the real order explains why a column alias from SELECT cannot be used in WHERE but can in ORDER BY, and why HAVING exists.", "items": [{"label": "FROM and JOIN", "desc": "build the rows", "tone": "accent"}, {"label": "WHERE", "desc": "filter rows — no aggregates yet", "tone": "warn"}, {"label": "GROUP BY, then HAVING", "desc": "aggregate, then filter groups", "tone": "good"}, {"label": "SELECT, then ORDER BY, then LIMIT", "desc": "choose columns, sort, cut", "tone": "violet"}], "t": "diagram", "id": "dg-13_1-01-0"},

    { t: "viz",
      title: "Written in one order, executed in another",
      caption: "This is not trivia. It explains why you cannot use a SELECT alias in WHERE, why HAVING and WHERE are different, and why LIMIT does not make an expensive query cheap.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="SQL clauses in written order beside their logical execution order">
  <text x="30" y="34" class="s-label">Written</text>
  <text x="470" y="34" class="s-label">Executed</text>

  <g class="s-sub">
    <text x="30" y="70">SELECT</text>   <text x="470" y="70">FROM / JOIN</text>
    <text x="30" y="98">FROM</text>     <text x="470" y="98">WHERE</text>
    <text x="30" y="126">JOIN</text>    <text x="470" y="126">GROUP BY</text>
    <text x="30" y="154">WHERE</text>   <text x="470" y="154">HAVING</text>
    <text x="30" y="182">GROUP BY</text><text x="470" y="182">SELECT</text>
    <text x="30" y="210">HAVING</text>  <text x="470" y="210">DISTINCT</text>
    <text x="30" y="238">ORDER BY</text><text x="470" y="238">ORDER BY</text>
    <text x="30" y="266">LIMIT</text>   <text x="470" y="266">LIMIT</text>
  </g>

  <path d="M200 64 L455 176" style="stroke:var(--accent);stroke-dasharray:3 3" fill="none"/>
  <text x="215" y="112" class="s-sub" style="fill:var(--accent)">SELECT runs FIFTH —</text>
  <text x="215" y="134" class="s-sub" style="fill:var(--accent)">its aliases do not exist</text>
  <text x="215" y="156" class="s-sub" style="fill:var(--accent)">yet in WHERE</text>

  <path d="M200 246 L455 240" style="stroke:var(--ink-3);stroke-dasharray:3 3" fill="none"/>
  <text x="620" y="292" class="s-sub" style="fill:var(--ink-3)">LIMIT is last: the work already happened</text>
</svg>`
    },

    { t: "code", lang: "sql", title: "the consequences, concretely", code: `
-- FAILS. The alias does not exist when WHERE runs.
SELECT total * 1.2 AS gross
FROM   orders
WHERE  gross > 100;                       -- ERROR: column "gross" does not exist

-- Repeat the expression, or use a subquery or CTE.
SELECT total * 1.2 AS gross
FROM   orders
WHERE  total * 1.2 > 100;

-- ORDER BY runs after SELECT, so it CAN use the alias.
SELECT total * 1.2 AS gross
FROM   orders
ORDER BY gross DESC;                      -- fine

-- WHERE filters ROWS, before grouping.
-- HAVING filters GROUPS, after. They are not interchangeable.
SELECT   customer_id, count(*) AS n
FROM     orders
WHERE    created_at >= '2026-01-01'       -- discard rows first: cheaper
GROUP BY customer_id
HAVING   count(*) > 5;                    -- then discard small groups
`,
      hl: [3, 17, 19],
      caption: "**Put every condition you can in `WHERE`.** A row filtered before grouping is a row the database never aggregates, and `WHERE` can use an index where `HAVING` cannot."
    },

    { t: "h2", n: "02", text: "Joins", id: "joins" },

    {"kind": "compare", "title": "The joins", "caption": "INNER keeps matches only; LEFT keeps every left row and fills the right with NULL; FULL keeps both sides. A LEFT join followed by WHERE right.col IS NULL is the anti-join: 'customers with no orders'.", "columns": [{"title": "INNER", "tone": "accent", "items": ["rows with a match on both sides"]}, {"title": "LEFT", "tone": "good", "items": ["all left rows", "NULLs where no match", "+ IS NULL → anti-join"]}, {"title": "FULL", "tone": "warn", "items": ["all rows from both", "NULLs on either side"]}, {"title": "CROSS", "tone": "crit", "items": ["every pair", "usually a mistake"]}], "t": "diagram", "id": "dg-13_1-02-1"},

    { t: "table",
      head: ["Join", "Keeps", "Use when"],
      rows: [
        ["`INNER`", "Rows matching on both sides", "You want only orders that have a customer"],
        ["`LEFT`", "**All left rows**, NULLs where no match", "Customers and their orders, including customers with none"],
        ["`RIGHT`", "All right rows", "Rarely — write it as a `LEFT` with the tables swapped"],
        ["`FULL`", "Everything from both", "Reconciling two sources against each other"],
        ["`CROSS`", "Every combination", "Generating a date × category grid to fill gaps"],
        ["`LATERAL`", "Per-row subquery", "**The three most recent orders per customer**"]
      ],
      caption: "**A join can produce more rows than either table.** If a customer has five orders, they appear five times — which is why joining then counting in Python gives the wrong answer surprisingly often."
    },

    { t: "callout", kind: "trap", title: "The LEFT JOIN that quietly becomes an INNER JOIN", body: [
      { t: "code", lang: "sql", title: "one line, opposite meaning", numbered: false, code: `
-- INTENT: every customer, with their 2026 orders.
SELECT c.name, count(o.id)
FROM   customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE  o.created_at >= '2026-01-01'         -- <-- destroys the LEFT
GROUP BY c.name;

-- WHY: the LEFT JOIN supplies NULL for customers with no orders.
-- Then WHERE tests NULL >= '2026-01-01', which is NULL, which is not
-- true -- so those rows are discarded. Every customer without a 2026
-- order vanishes, and the query is now an INNER JOIN.

-- FIX: the condition belongs in the JOIN, where it filters what to
-- match rather than what to keep.
SELECT c.name, count(o.id)
FROM   customers c
LEFT JOIN orders o
       ON o.customer_id = c.id
      AND o.created_at >= '2026-01-01'      -- filters the match
GROUP BY c.name;`},
      { t: "p", text: "**The rule: for a `LEFT JOIN`, conditions on the right table belong in `ON`, not `WHERE`.** A `WHERE` on the right table is an assertion that the row matched, which is exactly what a `LEFT JOIN` was supposed to make optional." },
      { t: "p", text: "**`count(o.id)` not `count(*)`.** `count(*)` counts rows, and a customer with no orders still has one row full of NULLs — so they would report a count of 1 instead of 0. `count(column)` skips NULLs." }
    ]},

    { t: "h2", n: "03", text: "Deleting Python with SQL", id: "deleting-python" },

    { t: "ladder",
      title: "Total revenue per customer, for customers who spent over £1000",
      rungs: [
        { level: "bad", label: "Fetch everything, aggregate in Python",
          why: "Transfers every order over the network, builds a dictionary the size of the table, and cannot use an index for any of it. It also breaks the moment the table outgrows memory — which is a Tuesday, not a hypothetical.",
          code: `orders = db.query(Order).all()          # every row, over the wire

totals = defaultdict(Decimal)
for o in orders:
    totals[o.customer_id] += o.total

big = {cid: t for cid, t in totals.items() if t > 1000}

for cid in big:
    customer = db.query(Customer).get(cid)   # ...and now an N+1
    print(customer.name, big[cid])` },
        { level: "ok", label: "Aggregate in SQL, join in Python",
          why: "The heavy work moves to the database, which is most of the win. The customer lookup is still a query per result, so a hundred qualifying customers is a hundred round trips.",
          code: `rows = db.execute(text("""
    SELECT   customer_id, sum(total) AS revenue
    FROM     orders
    GROUP BY customer_id
    HAVING   sum(total) > 1000
""")).all()

for customer_id, revenue in rows:
    customer = db.get(Customer, customer_id)   # still N+1
    print(customer.name, revenue)` },
        { level: "best", label: "One query, one round trip",
          why: "The database does the join, the aggregation, the filtering and the ordering — all of which it is better at than any Python loop — and returns exactly the rows you display. Nothing else crosses the network.",
          code: `SELECT   c.id,
         c.name,
         count(o.id)              AS order_count,
         sum(o.total)             AS revenue,
         max(o.created_at)        AS last_order_at
FROM     customers c
JOIN     orders o ON o.customer_id = c.id
WHERE    o.created_at >= :since       -- filter rows FIRST
GROUP BY c.id, c.name
HAVING   sum(o.total) > 1000          -- then filter groups
ORDER BY revenue DESC
LIMIT    50;`,
          note: "**One round trip, index-assisted, and constant memory in Python.** The first version's cost grows with the table; this one's grows with the answer." }
      ]
    },

    { t: "callout", kind: "insight", title: "The signal that a loop should be a query", body: [
      { t: "code", lang: "python", title: "each of these has a direct SQL translation", numbered: false, code: `
for row in rows: total += row.x            ->  SUM(x)
for row in rows: counts[row.k] += 1        ->  GROUP BY k, COUNT(*)
if row.x > threshold: keep.append(row)     ->  WHERE x > :threshold
rows.sort(key=lambda r: r.x)               ->  ORDER BY x
rows[:20]                                  ->  LIMIT 20
seen = set(); if row.k not in seen: ...    ->  DISTINCT ON (k)
for r in rows: r.extra = lookup(r.fk)      ->  JOIN`},
      { t: "p", text: "**The last one is the N+1 in disguise**, and it is the most expensive of the seven — it turns one query into one per row, each with its own network round trip." },
      { t: "p", text: "**The exception that justifies a Python loop**: work the database cannot express — calling an API, applying a machine-learning model, complex branching business logic. Fetch a bounded set for that, never the whole table." }
    ]},

    { t: "h2", n: "04", text: "Window functions", id: "windows" },

    { t: "code", lang: "sql", title: "aggregate without collapsing rows", code: `
-- A GROUP BY collapses rows. A window function keeps them, and adds a
-- column computed over a related set. That difference is the whole idea.
SELECT
    o.id,
    o.customer_id,
    o.total,
    o.created_at,

    -- Per-customer aggregates, on every row.
    sum(o.total)  OVER (PARTITION BY o.customer_id)        AS customer_total,
    count(*)      OVER (PARTITION BY o.customer_id)        AS customer_orders,

    -- Ordering within the partition.
    row_number()  OVER (PARTITION BY o.customer_id
                        ORDER BY o.created_at DESC)        AS recency_rank,

    -- A running total: every row from the partition start to this one.
    sum(o.total)  OVER (PARTITION BY o.customer_id
                        ORDER BY o.created_at
                        ROWS BETWEEN UNBOUNDED PRECEDING
                                 AND CURRENT ROW)          AS running_total,

    -- The previous order's value, for a difference.
    lag(o.total)  OVER (PARTITION BY o.customer_id
                        ORDER BY o.created_at)             AS previous_total
FROM orders o;
`,
      hl: [12, 16, 19],
      caption: "**`row_number()` versus `rank()` versus `dense_rank()`**: for values 10, 10, 9 they give 1,2,3 — 1,1,3 — 1,1,2. Use `row_number()` when you need exactly one row per group and do not care which tie wins."
    },

    { t: "code", lang: "sql", title: "the top-N-per-group query", code: `
-- "The three most recent orders for each customer." This is the query
-- people write a Python loop for, and it is one statement.
WITH ranked AS (
    SELECT o.*,
           row_number() OVER (PARTITION BY o.customer_id
                              ORDER BY o.created_at DESC) AS rn
    FROM   orders o
)
SELECT * FROM ranked WHERE rn <= 3;
-- The CTE is required: a window function cannot appear in WHERE,
-- because WHERE runs before SELECT computes it.


-- The LATERAL form. Often faster, because it stops after three rows
-- per customer instead of ranking every order in the table.
SELECT c.name, o.id, o.total
FROM   customers c
CROSS JOIN LATERAL (
    SELECT id, total
    FROM   orders
    WHERE  customer_id = c.id            -- references the outer row
    ORDER BY created_at DESC
    LIMIT  3
) o;
`,
      hl: [9, 15, 19],
      caption: "**`LATERAL` lets a subquery reference the row being joined**, which an ordinary subquery cannot. With an index on `(customer_id, created_at DESC)` it reads three rows per customer rather than sorting the whole table."
    },

    { t: "h2", n: "05", text: "CTEs over nested subqueries", id: "ctes" },

    { t: "code", lang: "sql", title: "the same logic, readable", code: `
WITH recent_orders AS (
    SELECT * FROM orders WHERE created_at >= now() - interval '90 days'
),
customer_totals AS (
    SELECT   customer_id,
             sum(total)  AS revenue,
             count(*)    AS order_count
    FROM     recent_orders
    GROUP BY customer_id
),
ranked AS (
    SELECT *,
           ntile(4) OVER (ORDER BY revenue DESC) AS quartile
    FROM   customer_totals
)
SELECT   c.name, r.revenue, r.order_count, r.quartile
FROM     ranked r
JOIN     customers c ON c.id = r.customer_id
WHERE    r.quartile = 1
ORDER BY r.revenue DESC;
`,
      caption: "**Each CTE is a named step you can read, test in isolation and reason about.** The equivalent nested-subquery version is the same logic written inside-out — correct, and unreviewable."
    },

    { t: "callout", kind: "tradeoff", title: "CTEs are not always free", body: [
      { t: "p", text: "In PostgreSQL before version 12, a CTE was an **optimisation fence** — always materialised, never merged into the outer query, so a filter outside it could not be pushed inside. Since 12 they are inlined by default when referenced once." },
      { t: "code", lang: "sql", title: "you can still control it", numbered: false, code: `
WITH expensive AS MATERIALIZED (      -- force materialisation
    SELECT ... -- referenced five times; compute once
)

WITH cheap AS NOT MATERIALIZED (      -- force inlining
    SELECT ... -- let the planner push the outer WHERE inside
)`},
      { t: "p", text: "**Reach for `MATERIALIZED` when a CTE is expensive and used several times**, and for `NOT MATERIALIZED` when the planner is refusing to push a filter down. Check `EXPLAIN` rather than guessing — the default is right most of the time." },
      { t: "p", text: "**Recursive CTEs** (`WITH RECURSIVE`) handle trees and graphs — an org chart, a category hierarchy, a chain of referrals. That is a class of problem with no reasonable non-recursive SQL form and a very slow Python one." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Replace a reporting job with four queries",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This nightly job takes fifty minutes and has started running into business hours. It reads three tables in full and does everything in Python." },
        { t: "code", lang: "python", numbered: false, title: "jobs/monthly_report.py", code: `
def monthly_report(month: date) -> dict:
    orders    = db.query(Order).all()            # 8M rows
    customers = db.query(Customer).all()         # 400k rows
    items     = db.query(OrderItem).all()        # 31M rows

    in_month = [o for o in orders
                if o.created_at.month == month.month]

    revenue_by_customer = defaultdict(Decimal)
    for o in in_month:
        revenue_by_customer[o.customer_id] += o.total

    top = sorted(revenue_by_customer.items(),
                 key=lambda kv: kv[1], reverse=True)[:100]

    result = []
    for customer_id, revenue in top:
        c = next(c for c in customers if c.id == customer_id)
        their_items = [i for i in items
                       if i.order_id in {o.id for o in in_month
                                         if o.customer_id == customer_id}]
        result.append({
            "name": c.name,
            "revenue": revenue,
            "items": len(their_items),
            "top_product": Counter(
                i.product_id for i in their_items).most_common(1)[0][0],
        })
    return {"top_customers": result}`},
        { t: "p", text: "Rewrite it in SQL. Also state which indexes it needs and why the current version is quadratic." }
      ],
      requirements: [
        "Identify the quadratic operation and give its complexity.",
        "Produce the same output in at most two queries.",
        "Handle the month boundary correctly — the current filter has a bug.",
        "Compute the top product per customer in SQL.",
        "List the indexes required, with the column order and the reason for it.",
        "Explain why `LIMIT 100` does not make the original query cheap."
      ],
      hint: "Look at the nested comprehension building a set inside a loop. And read the month filter carefully — what does it match in a table spanning several years?",
      solution: {
        lang: "sql",
        title: "jobs/monthly_report.sql",
        code: `-- ========================================================================
-- WHAT IS WRONG
-- ========================================================================
--
-- 1. THE QUADRATIC PART. For each of the top 100 customers:
--
--      {o.id for o in in_month if o.customer_id == customer_id}
--
--    scans every in-month order (say 700k), and the enclosing
--    comprehension scans all 31M items for each of those 100
--    customers. That is 100 x 31M = 3.1 BILLION comparisons, plus
--    100 x 700k for the set. O(top_n x items) where both grow.
--
--    next(c for c in customers ...) adds another linear scan per
--    customer: 100 x 400k.
--
-- 2. THE MONTH BUG. o.created_at.month == month.month matches that
--    month in EVERY YEAR. Over four years of data the report is
--    four months of revenue presented as one. It has probably been
--    wrong since the second year and nobody noticed, because the
--    number only looks too large if you already suspect it.
--
-- 3. LOADING 39M ROWS INTO MEMORY. Tens of gigabytes of Python
--    objects. This is why it takes fifty minutes; most of it is
--    object construction and garbage collection, not computation.
--
-- 4. WHY LIMIT 100 DOES NOT HELP. The slice is applied in Python
--    AFTER everything has been fetched, decoded and aggregated. A
--    LIMIT only makes a query cheap when the DATABASE applies it --
--    and even then only if an index supplies the order, otherwise it
--    still sorts everything and returns the first hundred.


-- ========================================================================
-- QUERY 1 -- top customers by revenue, with their top product
-- ========================================================================

WITH month_orders AS (
    SELECT id, customer_id, total
    FROM   orders
    -- A HALF-OPEN RANGE on the raw column. Not date_trunc(created_at),
    -- which is a function on the column and cannot use a plain index.
    WHERE  created_at >= :month_start
      AND  created_at <  :month_start + interval '1 month'
),

customer_revenue AS (
    SELECT   customer_id,
             sum(total)  AS revenue,
             count(*)    AS order_count
    FROM     month_orders
    GROUP BY customer_id
    ORDER BY revenue DESC
    LIMIT    100                    -- applied by the DATABASE
),

customer_items AS (
    SELECT   o.customer_id,
             count(*)               AS item_count,
             sum(i.quantity)        AS unit_count
    FROM     month_orders o
    JOIN     order_items i ON i.order_id = o.id
    WHERE    o.customer_id IN (SELECT customer_id FROM customer_revenue)
    GROUP BY o.customer_id
),

-- The top product per customer. DISTINCT ON is the PostgreSQL
-- shorthand for "one row per group, chosen by the ORDER BY".
top_products AS (
    SELECT DISTINCT ON (o.customer_id)
           o.customer_id,
           i.product_id,
           sum(i.quantity) AS units
    FROM   month_orders o
    JOIN   order_items i ON i.order_id = o.id
    WHERE  o.customer_id IN (SELECT customer_id FROM customer_revenue)
    GROUP BY o.customer_id, i.product_id
    ORDER BY o.customer_id, sum(i.quantity) DESC, i.product_id
    --                                            ^^^^^^^^^^^^
    -- A deterministic tiebreak. Without it, two products with equal
    -- units return in whatever order the plan happens to produce, and
    -- the report changes between runs on identical data -- which
    -- someone WILL report as a bug.
)

SELECT   c.id,
         c.name,
         r.revenue,
         r.order_count,
         coalesce(ci.item_count, 0)  AS items,
         tp.product_id               AS top_product,
         p.name                      AS top_product_name
FROM     customer_revenue r
JOIN     customers c        ON c.id  = r.customer_id
LEFT JOIN customer_items ci ON ci.customer_id = r.customer_id
LEFT JOIN top_products tp   ON tp.customer_id = r.customer_id
LEFT JOIN products p        ON p.id  = tp.product_id
ORDER BY r.revenue DESC;

-- LEFT JOIN for the item aggregates: a customer whose orders have no
-- line items should still appear with zero, not disappear. The
-- original's most_common(1)[0][0] would have raised IndexError there.


-- ========================================================================
-- QUERY 2 -- the summary totals
-- ========================================================================

SELECT count(DISTINCT customer_id)             AS active_customers,
       count(*)                                AS order_count,
       sum(total)                              AS revenue,
       avg(total)                              AS average_order_value,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS median_order
FROM   orders
WHERE  created_at >= :month_start
  AND  created_at <  :month_start + interval '1 month';

-- The median is worth including precisely because the mean is
-- misleading here: a handful of enterprise orders drag it well above
-- what a typical customer spends.


-- ========================================================================
-- THE INDEXES
-- ========================================================================

-- 1. The month filter, and the join key. Column order matters:
--    created_at first because it is the range predicate and the
--    selective one -- a month out of four years is ~2% of the table.
--    customer_id second so the GROUP BY can read it from the index
--    without touching the heap.
CREATE INDEX CONCURRENTLY orders_created_at_customer_idx
    ON orders (created_at, customer_id)
    INCLUDE (total);
--  INCLUDE puts total in the index leaf without making it part of the
--  key, so query 2 is an index-only scan: it never reads the table.

-- 2. The join from orders to items. Without this, joining 700k orders
--    to 31M items is a hash join over the whole items table.
CREATE INDEX CONCURRENTLY order_items_order_id_idx
    ON order_items (order_id)
    INCLUDE (product_id, quantity);

-- CONCURRENTLY on both: a plain CREATE INDEX takes an ACCESS EXCLUSIVE
-- lock, which blocks every read and write on a 31M-row table for
-- minutes. CONCURRENTLY is slower and cannot run inside a
-- transaction, and it is the only acceptable option in production.


-- ========================================================================
-- THE PYTHON THAT REMAINS
-- ========================================================================
--
-- def monthly_report(month_start: date) -> dict:
--     with engine.connect() as conn:
--         top = conn.execute(TOP_CUSTOMERS, {"month_start": month_start})
--         summary = conn.execute(SUMMARY, {"month_start": month_start})
--     return {
--         "top_customers": [dict(r) for r in top.mappings()],
--         "summary": dict(summary.mappings().one()),
--     }
--
-- Two round trips. Constant memory -- 101 rows instead of 39 million.
-- Fifty minutes to a few seconds, and the cost now scales with the
-- ANSWER rather than with the table.


-- ========================================================================
-- THE TESTS
-- ========================================================================
--
-- def test_the_month_boundary_is_half_open(db):
--     """The original bug: .month == n matched every year."""
--     seed_order(created_at=datetime(2025, 3, 15), total=100)   # prior year
--     seed_order(created_at=datetime(2026, 2, 28, 23, 59), total=100)
--     seed_order(created_at=datetime(2026, 3, 1, 0, 0), total=50)
--     seed_order(created_at=datetime(2026, 3, 31, 23, 59, 59), total=50)
--     seed_order(created_at=datetime(2026, 4, 1, 0, 0), total=100)
--
--     assert monthly_report(date(2026, 3, 1))["summary"]["revenue"] == 100
--
--
-- def test_a_customer_with_no_line_items_still_appears(db):
--     """The LEFT JOIN. The original raised IndexError here."""
--     seed_order(customer_id="c-1", total=500, items=[])
--
--     row = top_customers(date(2026, 3, 1))[0]
--
--     assert row["items"] == 0
--     assert row["top_product"] is None
--
--
-- def test_the_top_product_is_stable_across_runs(db):
--     """The deterministic tiebreak. Two products, equal units."""
--     seed_order(customer_id="c-1",
--                items=[("p-a", 5), ("p-b", 5)])
--
--     results = {top_customers(MONTH)[0]["top_product"] for _ in range(10)}
--
--     assert len(results) == 1`,
        notes: [
          { t: "p", text: "**The month bug is worth more than the performance work.** `o.created_at.month == month.month` matches March in every year the table covers, so a four-year-old dataset reports four Marches as one. It has been wrong for years, and nobody noticed because an inflated revenue number does not look like an error." },
          { t: "p", text: "**The quadratic operation is the nested comprehension**: rebuilding a set of order ids inside a loop over customers, then scanning 31 million items for each. Roughly 3.1 billion comparisons — which is the fifty minutes." },
          { t: "callout", kind: "insight", title: "Why LIMIT 100 does not help the original", body: [
            { t: "p", text: "The slice happens in Python after every row has been fetched, decoded into an object and aggregated. All the cost is already paid; the limit only discards the results." },
            { t: "p", text: "Inside the database it is genuinely cheap — and cheapest when an index supplies the ordering, so the planner reads a hundred rows and stops rather than sorting the whole set first." }
          ]},
          { t: "p", text: "**The tiebreak in `DISTINCT ON` is not pedantry.** Without `i.product_id` in the `ORDER BY`, two products with equal units return in whatever order the plan produces — so the report changes between runs on identical data, and someone spends an afternoon investigating a non-existent data bug." },
          { t: "p", text: "**`INCLUDE` turns the summary into an index-only scan.** Putting `total` in the index leaf without making it part of the key means the query answers from the index alone and never touches the table heap, which on an 8-million-row table is most of the I/O." },
          { t: "p", text: "**`CONCURRENTLY` is not optional on a 31-million-row table.** A plain `CREATE INDEX` takes an ACCESS EXCLUSIVE lock and blocks every read and write for the duration — a self-inflicted outage during what was meant to be an optimisation." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A dashboard endpoint took eleven seconds. The team's first instinct was caching, and a five-minute Redis cache made the p50 fast and left the p99 unchanged — every cache miss still paid eleven seconds, and the misses clustered at the start of the working day." },
      { t: "p", text: "**The actual query was four lines of SQL wrapped in ninety lines of Python.** It fetched every order for the account, grouped by month in a dictionary, and looked up each product name individually — an N+1 inside an in-memory aggregation." },
      { t: "p", text: "**Rewritten as one query with a `GROUP BY` and a join, it returned in forty milliseconds** and the cache was deleted. The cache had been hiding the problem well enough that nobody had looked at the query for a year." },
      { t: "p", text: "**Caching a slow query is a decision to keep it.** It is sometimes right — but reach for it after you have read the query, not instead of." }
    ]}
  ],

  takeaways: [
    "**SQL executes `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`** — which is why a `SELECT` alias works in `ORDER BY` but not in `WHERE`.",
    "**`WHERE` filters rows before grouping; `HAVING` filters groups after.** Put every condition you can in `WHERE` — it is cheaper and it can use an index.",
    "**A `WHERE` on the right table turns a `LEFT JOIN` into an `INNER JOIN`.** Conditions on the optional side belong in `ON`.",
    "**`count(*)` counts rows including all-NULL ones from a `LEFT JOIN`; `count(column)` skips them.** That is the difference between 1 and 0 for a customer with no orders.",
    "**A loop that sums, counts, filters, sorts or looks up a related row is a query you have not written yet.**",
    "**Window functions aggregate without collapsing rows**, which is how you get running totals, rankings and per-group top-N.",
    "**Top-N-per-group needs a CTE**, because a window function cannot appear in `WHERE` — or `LATERAL`, which is usually faster.",
    "**`LATERAL` lets a subquery reference the row being joined**, so it can stop after N rows per group rather than ranking everything.",
    "**CTEs make a query readable as named steps.** Since PostgreSQL 12 they inline by default; use `MATERIALIZED` when one is expensive and reused.",
    "**A function on a column defeats a plain index.** Use a half-open range on the raw column rather than `date_trunc(created_at)`.",
    "**`LIMIT` in Python is not `LIMIT` in SQL** — a slice after fetching has already paid the full cost.",
    "**Add a deterministic tiebreak to any `DISTINCT ON` or top-N ordering**, or the result changes between runs on identical data.",
    "**Always `CREATE INDEX CONCURRENTLY` in production.** The plain form takes an exclusive lock and blocks the table for the duration."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A `LEFT JOIN orders` with `WHERE orders.created_at >= '2026-01-01'` returns fewer customers than expected. Why?",
        options: [
          "The join key is wrong",
          "The `LEFT JOIN` supplies NULL for unmatched customers, and `NULL >= date` is not true, so `WHERE` discards them — making it an INNER JOIN",
          "`LEFT JOIN` cannot be combined with `WHERE`",
          "The dates need casting"
        ],
        answer: 1,
        why: "`WHERE` runs after the join and tests the NULLs the `LEFT JOIN` just produced. The rule is that conditions on the optional side belong in `ON`, where they filter what to match rather than what to keep. The same mistake makes `count(*)` report 1 instead of 0 for a customer with no orders."
      },
      {
        stem: "Why can a window function not be used in `WHERE`?",
        options: [
          "It is a syntax restriction with no reason behind it",
          "`WHERE` runs before `SELECT`, and window functions are computed during `SELECT` — so the value does not exist yet",
          "Window functions are always slower",
          "It works in PostgreSQL but not elsewhere"
        ],
        answer: 1,
        why: "The logical execution order explains it directly, which is why top-N-per-group needs a CTE or subquery to compute the rank first and filter in an outer query. `LATERAL` is often the faster alternative because it can stop after N rows per group instead of ranking the whole table."
      },
      {
        stem: "A job fetches 8 million rows, aggregates in Python and slices the top 100. Why does adding `LIMIT 100` to the SQL not fix it on its own?",
        options: [
          "`LIMIT` does not work with aggregates",
          "The limit must be applied after the aggregation and ordering in the database — limiting the raw rows returns an arbitrary 100 rows, not the top 100",
          "`LIMIT` is only a hint",
          "The ORM ignores `LIMIT`"
        ],
        answer: 1,
        why: "Placement matters: `LIMIT` on the unaggregated rows discards data before it has been summed. The fix is to move the whole computation — group, order, then limit — into the database, so the cost scales with the answer rather than the table."
      },
      {
        stem: "`WHERE date_trunc('month', created_at) = '2026-03-01'` is slow despite an index on `created_at`. Why?",
        options: [
          "`date_trunc` is an expensive function",
          "Applying a function to the column means a plain index on it cannot be used — a half-open range on the raw column can",
          "The index is on the wrong table",
          "`date_trunc` returns a timestamp, not a date"
        ],
        answer: 1,
        why: "A B-tree index stores the column's values, not the values of functions applied to them, so the planner must compute the function for every row. `created_at >= :start AND created_at < :start + interval '1 month'` is a range predicate the index answers directly. An expression index is the alternative when the function form is unavoidable."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `WHERE` and `HAVING`?",
        strong: "`WHERE` filters rows before grouping; `HAVING` filters groups after. So `HAVING` can reference aggregates and `WHERE` cannot — and every condition that can go in `WHERE` should, because it removes rows before the aggregation and can use an index.",
        answer: [
          { t: "p", text: "The performance half is what makes this more than a definition — a row filtered in `WHERE` is never aggregated at all." },
          { t: "p", text: "Grounding it in the logical execution order shows you understand why rather than having memorised the rule." },
          { t: "p", text: "The related question — why a `SELECT` alias works in `ORDER BY` but not `WHERE` — has the same answer, and volunteering it demonstrates the model." }
        ]
      },
      {
        level: "advanced",
        q: "How would you find the three most recent orders for each customer?",
        strong: "`row_number()` partitioned by customer, ordered by date, in a CTE, then filter `rn <= 3` in the outer query. Or `CROSS JOIN LATERAL` with a `LIMIT 3` subquery, which is usually faster because it stops after three rows per customer.",
        answer: [
          { t: "p", text: "Knowing the window function needs a CTE — because `WHERE` runs before `SELECT` — is the detail that shows understanding rather than recall." },
          { t: "p", text: "Offering `LATERAL` as the faster alternative, with the index that makes it fast, is a strong second half." },
          { t: "p", text: "Mentioning a deterministic tiebreak is a small thing interviewers notice, because it means you have debugged a report that changed between runs." }
        ]
      },
      {
        level: "advanced",
        q: "A report job takes fifty minutes. How do you approach it?",
        strong: "Look at what crosses the network first. Loading whole tables to aggregate in Python is almost always the problem, and moving the grouping, filtering and ordering into SQL usually turns minutes into seconds before any indexing work.",
        answer: [
          { t: "p", text: "Starting with data volume rather than indexes shows the right instinct — an index does not help a query that fetches everything." },
          { t: "p", text: "Naming the specific loop shapes that translate to SQL makes the answer concrete rather than a slogan." },
          { t: "p", text: "Noting that caching a slow query is a decision to keep it is a good closing point, and it is the mistake teams reach for first." }
        ]
      }
    ]
  }
});

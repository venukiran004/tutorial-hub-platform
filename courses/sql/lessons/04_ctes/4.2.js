/* ============================================================================
   LESSON 4.2 — CTEs: Naming the Steps
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**A query that nests three derived tables is read from the inside out, by scrolling. The same query as three CTEs is read top to bottom, by name.** `WITH` names each step, lets later steps refer to earlier ones, and lets one step be used twice without being written twice. That is most of what a CTE is. The rest is knowing when the engine inlines it and when it materialises it, and the data-modifying form that moves rows from one table to another in a single statement.",

  objectives: [
    "Write a multi-step query as a chain of CTEs that reads top to bottom",
    "Reuse a CTE in several places and say what that costs on engines that materialise",
    "Choose between a CTE, a derived table, a view and a temporary table",
    "Use a data-modifying CTE with RETURNING to move or archive rows in one statement"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "WITH: a pipeline of named results", id: "with" },

    { t: "p", text: "`WITH name AS (query)` defines a temporary named result that the rest of the statement can use as a table. Several can be chained, each referring to the ones above it. **The query then reads as a pipeline — order totals, then customer totals, then segments, then the report — with each stage's grain visible in its name.** The 2.2 fix for fan-out, 'aggregate each child first, then join', is a CTE chain waiting to be written." },

    { t: "code", lang: "sql", title: "From line items to a segment report in four named steps",
      hl: [1, 6, 10, 18],
      code: `WITH order_totals AS (                                     -- grain: one row per paid order
  SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE  o.status = 'paid' GROUP BY 1, 2, 3
),
customer_totals AS (                                       -- grain: one row per customer who has paid
  SELECT customer_id, COUNT(*) AS orders, SUM(amount) AS revenue, MAX(placed_at) AS last_order
  FROM   order_totals GROUP BY customer_id
),
segmented AS (                                             -- grain: one row per customer, all eight
  SELECT c.customer_id, c.name, COALESCE(t.orders, 0) AS orders, COALESCE(t.revenue, 0) AS revenue,
         CASE WHEN t.revenue >= 130 THEN 'high' WHEN t.revenue >= 50 THEN 'mid'
              WHEN t.revenue > 0 THEN 'low' ELSE 'none' END AS segment
  FROM   customers c LEFT JOIN customer_totals t ON t.customer_id = c.customer_id
)
SELECT segment, COUNT(*) AS customers, SUM(revenue) AS revenue, ROUND(AVG(orders), 2) AS avg_orders
FROM   segmented
GROUP  BY segment ORDER BY revenue DESC;
-- segment | customers | revenue | avg_orders
-- high    | 3         | 511.40  | 2.00        Asha, Dalia, Emeka
-- mid     | 1         | 112.50  | 2.00        Bruno
-- low     | 2         | 74.00   | 1.00        Chen, Fatou
-- none    | 2         | 0.00    | 0.00        Iker, Mara
-- 511.40 + 112.50 + 74.00 = 697.90: the reconciliation figure survives four steps`,
      caption: "Each CTE names its grain in a comment, and each is testable on its own: `SELECT * FROM order_totals` is a query you can run by cutting the statement at that point. The nested-subquery version of this is the same plan and a quarter as readable."
    },

    { t: "dl", items: [
      ["CTE", "Common table expression: a named subquery declared with WITH, scoped to the statement that follows. Not a table, not a view — a name for a step."],
      ["Chaining", "Later CTEs may reference earlier ones in the same WITH list; the main query may reference any of them. Forward references are not allowed (except in RECURSIVE, 4.3)."],
      ["Inlining", "The planner substitutes the CTE's query wherever it is referenced, so predicates can be pushed into it and indexes used. The default in most engines for a CTE referenced once."],
      ["Materialisation", "The CTE is computed once into a temporary result and read from there. Guarantees single evaluation; blocks predicate push-down. PostgreSQL 12+ decides, and `MATERIALIZED` / `NOT MATERIALIZED` overrides."],
      ["Data-modifying CTE", "PostgreSQL: a CTE whose body is INSERT, UPDATE or DELETE with RETURNING; its rows are usable by the rest of the statement. One statement, one transaction, one round trip."],
      ["Temporary table", "A real table that lives for the session. Materialised, indexable, statistics-bearing; the tool when a step is large, reused across statements, or needs an index."]
    ]},

    { t: "h2", n: "02", text: "Reuse, and what it costs", id: "reuse" },

    { t: "p", text: "A CTE referenced three times is written once — a summary row that reads the count, the maximum and the mean of the same intermediate. **Whether it is *computed* once depends on the engine.** PostgreSQL before 12 always materialised every CTE — an 'optimisation fence' that stopped a WHERE in the outer query from reaching inside. PostgreSQL 12 inlines a CTE referenced once and materialises one referenced more than once; MySQL 8, SQL Server and DuckDB make similar choices. The keyword exists for the cases where you know better." },

    { t: "code", lang: "sql", title: "One definition, four references, and the keyword that decides",
      hl: [1, 5, 6, 7, 8, 13, 16],
      code: `WITH order_totals AS (
  SELECT o.order_id, o.customer_id, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1, 2
)
SELECT (SELECT COUNT(*)                     FROM order_totals) AS orders,
       (SELECT MAX(amount)                  FROM order_totals) AS biggest,
       (SELECT ROUND(AVG(amount), 2)        FROM order_totals) AS mean_order,
       (SELECT COUNT(DISTINCT customer_id)  FROM order_totals) AS customers;
-- 10 | 139.00 | 69.79 | 6
-- PostgreSQL 12+: referenced four times, so materialised once and scanned four times -- the join and group run once.

-- force the choice (PostgreSQL 12+):
WITH recent AS MATERIALIZED (SELECT * FROM orders WHERE placed_at > now() - INTERVAL '30 days')   -- compute once, reuse
...
WITH recent AS NOT MATERIALIZED (SELECT * FROM orders)                                             -- inline: let the outer
SELECT * FROM recent WHERE customer_id = 3;                                                        -- WHERE reach the index on customer_id

-- names are scoped to the statement, and a CTE name may not be declared twice in one WITH:
-- WITH big AS (...), big AS (...)  -> ERROR: duplicate CTE name`,
      caption: "When a CTE is referenced once, inlining is almost always right: the outer WHERE can be pushed inside and an index used. When it is referenced several times and is expensive, materialising is right. When it is referenced once but the outer query is going to filter it hard, `NOT MATERIALIZED` is the escape from an engine that guessed the other way."
    },

    { t: "viz",
      title: "Inlined or materialised",
      caption: "Inlined, the CTE dissolves into the outer query and the outer WHERE reaches the base table's index. Materialised, the CTE is computed into a temporary result first — once, however many times it is read — and the outer WHERE filters that result after the fact.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two flows. Left, inlined: outer query with WHERE customer_id = 3 merged into the CTE body, arrow to an index scan on orders. Right, materialised: CTE body computed into a temp result read by three references, with the WHERE applied afterwards to the temp result.">
  <defs>
    <marker id="cte-ah-42" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36" style="fill:var(--good)">inlined · referenced once</text>
    <text x="470" y="36" style="fill:var(--accent)">materialised · referenced several times</text>
  </g>
  <g stroke-width="1.4">
    <rect x="30" y="56" width="180" height="50" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="260" y="56" width="160" height="50" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="470" y="56" width="180" height="50" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="690" y="40" width="160" height="34" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="690" y="82" width="160" height="34" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="690" y="124" width="160" height="34" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="76">CTE body + outer WHERE</text><text x="120" y="94">merged into one query</text>
    <text x="340" y="76">Index Scan on orders</text><text x="340" y="94">(customer_id = 3)</text>
    <text x="560" y="76">CTE computed once</text><text x="560" y="94">into a temp result</text>
    <text x="770" y="62">reference 1 · scan</text><text x="770" y="104">reference 2 · scan</text><text x="770" y="146">reference 3 · scan</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="210" y1="81" x2="260" y2="81" marker-end="url(#cte-ah-42)"/>
    <path d="M650,81 L690,57" marker-end="url(#cte-ah-42)"/><path d="M650,81 L690,99" marker-end="url(#cte-ah-42)"/><path d="M650,81 L690,141" marker-end="url(#cte-ah-42)"/>
  </g>
  <g class="s-sub">
    <text x="30" y="150">predicate push-down: the filter runs inside, the index is used</text>
    <text x="30" y="170">cost: one indexed lookup</text>
    <text x="470" y="192">no push-down: the filter runs on the temp result</text>
    <text x="470" y="212">cost: one full computation, n cheap reads</text>
  </g>
  <text x="30" y="236" class="s-sub">PostgreSQL 12+ picks by reference count; MATERIALIZED / NOT MATERIALIZED overrides it. Before 12, every CTE was the right-hand picture.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "CTE, derived table, view, temp table", id: "choose" },

    { t: "p", text: "Four ways to name an intermediate result, on a spectrum from 'this statement only' to 'this schema forever'. A **derived table** and a **CTE** are the same thing with different readability. A **view** is a saved query — a name in the schema that any statement can use, re-run each time, with no storage. A **temporary table** is real: rows on disk for the session, indexable, with statistics the planner can use. **The choice is about lifetime and about whether the planner needs to know the intermediate's size.**" },

    { t: "table",
      head: ["Form", "Lifetime", "Storage", "Indexable", "Planner sees statistics", "Use when"],
      rows: [
        ["Derived table", "One statement", "None (inlined)", "No", "Estimates only", "A one-off step in a small query"],
        ["CTE", "One statement", "None, or a temp result if materialised", "No", "Estimates only", "Several steps, reuse within the statement, readability"],
        ["View", "Until dropped", "None — re-executed on each use", "No (indexes on base tables apply)", "Estimates only", "A shared definition many queries use; access control"],
        ["Materialised view (6.6)", "Until dropped; data until refreshed", "Yes", "Yes", "Yes", "An expensive aggregate read often and refreshed on a schedule"],
        ["Temporary table", "The session", "Yes", "Yes", "Yes, after ANALYZE", "A large intermediate reused across statements, or one that needs an index"]
      ]
    },

    { t: "callout", kind: "production", title: "When the CTE should have been a temp table", body: [
      { t: "p", text: "A materialised CTE has no statistics: the planner guesses its row count and can choose a nested loop for a million rows. A temporary table with `ANALYZE` run on it gives the planner real numbers and can carry an index. **If a multi-step query is slow and the plan shows a bad estimate on a CTE scan, split it: `CREATE TEMP TABLE step1 AS …; ANALYZE step1;` and continue from there.** It is uglier and it is often the fix." }
    ]},

    { t: "h2", n: "04", text: "Data-modifying CTEs", id: "modifying" },

    { t: "p", text: "PostgreSQL lets a CTE's body be an INSERT, UPDATE or DELETE with RETURNING, and the rows it returns feed the rest of the statement. **Archive-and-delete becomes one statement**: delete the old orders, returning them, and insert what was returned into the archive. It is atomic, it is one round trip, and the two halves cannot disagree about which rows moved. Every data-modifying CTE in a statement sees the same snapshot of the tables — they do not see each other's effects — which is what makes the move safe." },

    { t: "code", lang: "sql", title: "Move, then count what moved — one statement, one transaction (PostgreSQL)",
      hl: [1, 2, 3, 6, 11],
      code: `WITH moved AS (
  DELETE FROM orders WHERE status = 'cancelled' AND placed_at < DATE '2025-04-01'
  RETURNING *
),
archived AS (
  INSERT INTO orders_archive SELECT *, now() AS archived_at FROM moved RETURNING order_id
)
SELECT COUNT(*) AS archived_orders FROM archived;
-- archived_orders
-- 1                       (order 107)

-- apply a computed update and report it in the same statement
WITH repriced AS (
  UPDATE products SET unit_price = ROUND(unit_price * 1.05, 2) WHERE category = 'office'
  RETURNING product_id, name, unit_price
)
SELECT * FROM repriced ORDER BY product_id;
-- 12 | Desk lamp | 28.88
-- 13 | Notebook  | 4.41
-- all modifying CTEs run against the snapshot at statement start; the SELECT sees only what RETURNING handed it.
-- MySQL, SQLite, DuckDB: not supported -- use a transaction with two statements (6.1).`,
      caption: "RETURNING is the piece that makes this work: it turns a write into a row source. Without it, archive-then-delete is two statements that must be wrapped in a transaction and must agree on the WHERE — the same predicate typed twice, which is one edit away from archiving different rows than were deleted."
    },

    { t: "ladder",
      title: "A four-step report",
      rungs: [
        { level: "bad", label: "Nested derived tables", code: `SELECT segment, COUNT(*) FROM (SELECT c.name, CASE WHEN t.revenue >= 130 THEN 'high' ... END AS segment
  FROM customers c LEFT JOIN (SELECT customer_id, SUM(amount) AS revenue FROM (SELECT o.order_id, o.customer_id, SUM(oi.qty * oi.unit_price) AS amount
  FROM orders o JOIN order_items oi ON ... GROUP BY 1, 2) ot GROUP BY customer_id) t ON ...) s GROUP BY segment;`,
          note: "**Read from the innermost parenthesis outward.** Each grain is anonymous; testing a step means extracting it by hand." },
        { level: "ok", label: "CTEs, no grain comments", code: `WITH a AS (...), b AS (...), c AS (...) SELECT ... FROM c;`,
          note: "**Top to bottom, but the names say nothing.** `a`, `b`, `c` is the nested version with the nesting removed." },
        { level: "best", label: "CTEs named by grain, each independently runnable", code: `WITH order_totals AS (...),      -- one row per paid order
     customer_totals AS (...),   -- one row per paying customer
     segmented AS (...)          -- one row per customer
SELECT ... FROM segmented GROUP BY segment;`,
          note: "**The name is the grain, the comment is the contract, and any step can be checked with `SELECT * FROM step`.** The reconciliation total travels through every stage." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A pipeline with a reused step and an honest total",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "Build one statement with CTEs that produces, per product category (with the gift card as `'uncategorised'`): paid revenue, share of total paid revenue, number of distinct paying customers, and the category's best-selling product by units. The total revenue must come from the same CTE the per-category figures come from — reference it twice, not compute it twice. Name each CTE by its grain." },
        { t: "p", text: "Then write, as PostgreSQL, a data-modifying CTE that raises `tier` to `'plus'` for every customer in the `'high'` segment of section 01 and returns the customers it changed." }
      ],
      requirements: [
        "A line-item CTE used by both the per-category aggregation and the total.",
        "Best-seller via a ranking CTE, joined back at category grain.",
        "Shares that sum to 100.0.",
        "The UPDATE … RETURNING form with a SELECT over it."
      ],
      hint: "Line items at paid grain: `item_sales` (order, product, category, customer, amount, qty). Then `by_category` groups it, `total` sums it, `ranked` ranks products within category by units. The final SELECT joins by_category to total (a cross join to a one-row CTE) and to ranked WHERE rn = 1.",
      solution: {
        lang: "sql",
        title: "category_pipeline.sql",
        code: `WITH item_sales AS (                                                        -- grain: one row per paid line item
  SELECT oi.order_id, oi.product_id, COALESCE(p.category, 'uncategorised') AS category, o.customer_id,
         oi.qty, oi.qty * oi.unit_price AS amount
  FROM   order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
  WHERE  o.status = 'paid'
),
by_category AS (                                                            -- grain: one row per category
  SELECT category, SUM(amount) AS revenue, COUNT(DISTINCT customer_id) AS customers FROM item_sales GROUP BY category
),
total AS (SELECT SUM(amount) AS revenue FROM item_sales),                    -- grain: one row
ranked AS (                                                                 -- grain: one row per (category, product)
  SELECT category, product_id, SUM(qty) AS units,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY SUM(qty) DESC, product_id) AS rn
  FROM   item_sales GROUP BY category, product_id
)
SELECT b.category, b.revenue, ROUND(100.0 * b.revenue / t.revenue, 1) AS share_pct, b.customers, p.name AS best_seller, r.units
FROM   by_category b
CROSS  JOIN total t
JOIN   ranked r   ON r.category = b.category AND r.rn = 1
JOIN   products p ON p.product_id = r.product_id
ORDER  BY b.revenue DESC;
-- category      | revenue | share_pct | customers | best_seller | units
-- audio         | 263.00  | 37.7      | 3         | Headphones  | 3
-- office        | 220.90  | 31.7      | 4         | Notebook    | 20
-- kitchen       | 139.00  | 19.9      | 3         | Kettle      | 3
-- uncategorised | 75.00   | 10.7      | 2         | Gift card   | 3
-- shares: 37.7 + 31.7 + 19.9 + 10.7 = 100.0; revenue: 697.90

-- PostgreSQL: promote the high segment and report who changed
WITH customer_revenue AS (
  SELECT o.customer_id, SUM(oi.qty * oi.unit_price) AS revenue
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY o.customer_id
),
promoted AS (
  UPDATE customers c SET tier = 'plus'
  FROM   customer_revenue r
  WHERE  r.customer_id = c.customer_id AND r.revenue >= 130 AND c.tier <> 'plus'
  RETURNING c.customer_id, c.name
)
SELECT * FROM promoted ORDER BY customer_id;
-- 5 | Emeka             (Asha and Dalia were already plus; the WHERE tier <> 'plus' keeps the statement idempotent)`,
        notes: [
          { t: "p", text: "**`item_sales` is referenced three times** — by the category totals, the grand total and the ranking — and written once. On PostgreSQL 12+ that means it is materialised once; the three consumers read the temp result. The shares sum to 100.0 because numerator and denominator come from the same rows." },
          { t: "p", text: "**The ranking is its own CTE at a finer grain** than the report, joined back with `rn = 1`. Mixing it into `by_category` would have forced a GROUP BY over a window, which is the wrong order of operations (3.1)." },
          { t: "p", text: "**The UPDATE excludes rows already at the target value**, so running it twice changes nothing the second time and RETURNING reports only real changes — the idempotency that 6.3 makes a rule." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A CTE over a 50-million-row table is referenced once, and the outer query filters it to one customer. The query is slow and the plan shows the CTE scanned in full. What happened?",
          options: [
            "CTEs are always slow",
            "The CTE was materialised, so the outer WHERE could not be pushed into it and the index on customer_id was never used; inline it — NOT MATERIALIZED on PostgreSQL 12+, or a derived table on older versions",
            "The index is missing",
            "The filter is in the wrong clause"
          ],
          answer: 1,
          why: "Materialisation is an optimisation fence. For a single-reference CTE with a selective outer filter, inlining lets the predicate reach the base table's index. PostgreSQL 12+ inlines by default in this case; older versions did not."
        }
      ]
    }
  ],

  takeaways: [
    "**A CTE is a name for a step**, scoped to one statement; a chain of them reads top to bottom, each at a stated grain.",
    "**Every CTE should be runnable on its own** — `SELECT * FROM step` is how a pipeline is debugged.",
    "**Referenced once, a CTE is usually inlined; referenced several times, materialised** — PostgreSQL 12+ decides by reference count, and MATERIALIZED / NOT MATERIALIZED overrides.",
    "**Materialisation is an optimisation fence**: the outer WHERE cannot reach inside, and the base table's index goes unused.",
    "**A materialised CTE has no statistics**; a temporary table with ANALYZE does, and can carry an index — the fix for a bad estimate mid-pipeline.",
    "**Derived table, CTE, view, temp table** differ by lifetime and by whether the planner knows the intermediate's size.",
    "**A view is a saved query, re-run each time; a materialised view is stored and refreshed.**",
    "**Data-modifying CTEs (PostgreSQL) turn a write into a row source with RETURNING** — archive-and-delete in one atomic statement.",
    "**All modifying CTEs in a statement see the snapshot at statement start**, not each other's effects.",
    "**Name CTEs by grain, not by letter** — `order_totals`, not `t1`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `WITH x AS MATERIALIZED (…)` guarantee that the default does not?",
        options: [
          "That x is indexed",
          "That x is computed exactly once into a temporary result, however many times it is referenced — at the cost of blocking predicate push-down into it",
          "That x persists after the statement",
          "That x is faster"
        ],
        answer: 1,
        why: "MATERIALIZED forces single evaluation; NOT MATERIALIZED forces inlining. Neither is faster in general — reuse favours the first, a selective outer filter favours the second."
      },
      {
        stem: "Why might a temporary table beat a CTE for a large intermediate result?",
        options: [
          "Temporary tables are always faster",
          "A temporary table can be indexed and ANALYZEd, so the planner has real row counts for the later steps; a materialised CTE has neither",
          "CTEs cannot hold more than a million rows",
          "Temporary tables are transactional"
        ],
        answer: 1,
        why: "A bad row estimate on a CTE scan can lead the planner into a nested loop over millions of rows. Statistics and an index on a temp table remove the guess."
      },
      {
        stem: "In a PostgreSQL data-modifying CTE, the second CTE inserts rows returned by a DELETE in the first. What snapshot does each see?",
        options: [
          "The second sees the first's deletions",
          "Both see the tables as they were at statement start; the second sees the deleted rows only through RETURNING, which is what makes the move consistent",
          "The first sees the second's inserts",
          "Each sees the latest committed data"
        ],
        answer: 1,
        why: "Modifying CTEs run against one snapshot and communicate only via RETURNING. The archive receives exactly the rows the DELETE removed, with no window for the two to diverge."
      },
      {
        stem: "A CTE named `totals` is defined twice in the same WITH clause. What happens?",
        options: [
          "The second definition wins",
          "A syntax error: CTE names must be unique within a WITH list",
          "The first definition wins",
          "They are unioned"
        ],
        answer: 1,
        why: "Each name in a WITH list is declared once and is visible to later CTEs and the main query. Shadowing across nested statements is possible; duplication within one list is not."
      },
      {
        stem: "Which is the best reason to convert a derived table into a CTE?",
        options: [
          "Performance — CTEs run faster",
          "Readability and reuse: the step gets a name, can be referenced more than once, and can be tested in isolation; the plan is typically identical",
          "CTEs allow ORDER BY",
          "CTEs are transactional"
        ],
        answer: 1,
        why: "For a single reference the two forms produce the same plan on modern engines. The gain is in the reading and the maintaining, which is where most query time is actually spent."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a CTE and when do you use one instead of a subquery?",
        strong: "A common table expression is a named subquery declared with WITH and scoped to the statement. I use it whenever a query has more than one step: the steps read top to bottom by name, each can state its grain, each can be run alone for debugging, and one step can be referenced several times without being repeated. For a single reference the plan is the same as a derived table on modern engines. The thing to know is materialisation: PostgreSQL 12+ inlines a CTE referenced once and materialises one referenced more than once, and materialising blocks predicate push-down, so a selective outer filter can lose an index — MATERIALIZED and NOT MATERIALIZED override the choice.",
        answer: [
          { t: "p", text: "Mentioning the optimisation-fence behaviour and the PostgreSQL 12 change is what separates 'I use CTEs' from 'I understand them'." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between a CTE, a view and a temporary table?",
        strong: "Lifetime and storage. A CTE lives for one statement and stores nothing unless the engine materialises it for that statement. A view lives in the schema, stores nothing, and is re-executed every time it is used — it is a shared definition, and a place to put access control. A temporary table lives for the session and is real storage: it can be indexed and ANALYZEd, which is why it is the fix when a multi-step query's plan goes wrong on a bad estimate for an intermediate. A materialised view is the fourth option: stored, refreshed on a schedule, indexed, for an expensive aggregate read often.",
        answer: [
          { t: "p", text: "The 'statistics and an index' point for temp tables is the practical detail interviewers are listening for." }
        ]
      },
      {
        level: "advanced",
        q: "How would you archive and delete old rows safely in one operation?",
        strong: "In PostgreSQL, a data-modifying CTE: DELETE the rows with RETURNING *, then INSERT INTO the archive SELECT FROM that CTE, in one statement. It is atomic, one round trip, and the rows inserted are exactly the rows deleted — the predicate is written once, so the two halves cannot disagree. All modifying CTEs see the snapshot at statement start and communicate only through RETURNING. On engines without it I wrap two statements in an explicit transaction, and I make the predicate a single parameter or a temp table of ids so both statements target the same set. Either way I batch by date range for large tables so the lock and the WAL volume stay bounded.",
        answer: [
          { t: "p", text: "'The predicate is written once' is the correctness argument; batching is the operational one — both belong in the answer." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 2.4 — GROUP BY and HAVING
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**GROUP BY collapses rows, and after the collapse only two kinds of column exist: the ones you grouped by, and aggregates over everything else.** That single rule explains the error you get for selecting a bare column, why HAVING exists, why COUNT(*) in a grouped join counts the wrong thing, and why 'the latest order per customer' is not a GROUP BY question at all. Learn what a group is and the rest is bookkeeping.",

  objectives: [
    "Say exactly which columns may appear in the SELECT list of a grouped query, and why",
    "Write multi-column groups, grouped expressions, and HAVING conditions on aggregates",
    "Count the right thing in a grouped join with COUNT(DISTINCT key) and per-group MIN/MAX",
    "Recognise the 'one whole row per group' question and answer it with DISTINCT ON or a window function rather than GROUP BY"
  ],

  prerequisites: ["2.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "What a group is", id: "group" },

    { t: "p", text: "`GROUP BY country, tier` partitions the rows into one bucket per distinct `(country, tier)` pair, NULL counting as a value for the purpose. Each bucket becomes one output row. **The only things that have a single value per bucket are the grouping columns themselves and aggregates over the bucket** — so `SELECT name` in a query grouped by country is an error in PostgreSQL, because a country has many names and the engine will not guess. MySQL with `ONLY_FULL_GROUP_BY` off, and SQLite, pick one arbitrarily, which is worse." },

    { t: "code", lang: "sql", title: "Two grouping columns, then the shape every per-entity report has",
      hl: [1, 9, 11],
      code: `SELECT c.country, c.tier, COUNT(*) AS customers FROM customers c GROUP BY c.country, c.tier ORDER BY c.country NULLS LAST, c.tier;
-- DE plus 1 · DE standard 1 · ES standard 1 · FR standard 1 · GB plus 1 · GB standard 1 · NG standard 1 · NULL plus 1
-- eight buckets for eight customers: the pair is unique here. The NULL country is a bucket like any other.

-- SELECT name ... GROUP BY country
-- ERROR: column "c.name" must appear in the GROUP BY clause or be used in an aggregate function

-- per customer: grouping by the primary key lets PostgreSQL accept other columns of the same table,
-- because it knows they are functionally dependent on the key
SELECT c.customer_id, c.name, COUNT(o.order_id) AS orders, MIN(o.placed_at) AS first_order, MAX(o.placed_at) AS last_order
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP  BY c.customer_id, c.name                        -- naming both is portable; PostgreSQL would accept the key alone
ORDER  BY c.customer_id;
-- 1 | Asha  | 3 | 2025-01-05 09:12:00 | 2025-03-15 13:45:00
-- 2 | Bruno | 2 | 2025-01-06 14:03:00 | 2025-02-11 16:20:00
-- ...
-- 8 | Mara  | 0 | NULL                | NULL               <- MIN and MAX over the padded row are NULL, correctly`,
      caption: "MIN and MAX of a timestamp give the first and last order per customer in one pass — the two dates a churn or tenure feature needs. What they cannot give is the *status* of the last order, because that is a value from one particular row, not an aggregate (section 04)."
    },

    { t: "dl", items: [
      ["Group", "The set of rows sharing one combination of the GROUP BY values. NULLs group together. One output row per group."],
      ["Aggregate", "A function that reduces a group to one value: COUNT, SUM, AVG, MIN, MAX, and the ones in 2.5. Every aggregate but COUNT(*) ignores NULL."],
      ["HAVING", "A filter on groups, evaluated after aggregation. The only clause where an aggregate condition can live."],
      ["Functional dependency", "PostgreSQL's rule that grouping by a table's primary key lets you select that table's other columns bare: the key determines them. MySQL applies the same when ONLY_FULL_GROUP_BY is on."],
      ["`DISTINCT ON (k)`", "PostgreSQL and DuckDB: keep the first row per k in the ORDER BY order — one whole row per group, chosen by a sort. The answer to 'the latest order per customer'."],
      ["`GROUP BY ALL`", "DuckDB, Snowflake, BigQuery: group by every non-aggregated column in SELECT. Convenient, and the way a column silently becomes a grouping key when someone adds it to the select list."]
    ]},

    { t: "h2", n: "02", text: "HAVING: filtering after the collapse", id: "having" },

    { t: "p", text: "WHERE runs before grouping and cannot see aggregates; HAVING runs after and can. **A condition that does not involve an aggregate belongs in WHERE even though HAVING would accept it**, because WHERE removes rows before they are grouped — less work, and the planner can use an index. HAVING without GROUP BY treats the whole table as one group, which is occasionally useful for 'return the total only if …'." },

    { t: "code", lang: "sql", title: "Customers with two or more paid orders, and a HAVING with no GROUP BY",
      hl: [3, 4, 9, 13],
      code: `SELECT o.customer_id, COUNT(*) AS paid_orders
FROM   orders o
WHERE  o.status = 'paid'                                 -- row filter: before grouping, index-friendly
GROUP  BY o.customer_id
HAVING COUNT(*) >= 2                                     -- group filter: on the aggregate
ORDER  BY 1;
-- 1 3 · 2 2 · 5 2                                       (3 rows)

-- the same result with the status inside the aggregate instead of WHERE -- correct, and every order is grouped first
SELECT o.customer_id, COUNT(*) AS n FROM orders o GROUP BY o.customer_id
HAVING COUNT(*) FILTER (WHERE status = 'paid') >= 2 ORDER BY 1;

-- HAVING with no GROUP BY: one group, one row, or nothing
SELECT COUNT(*) FROM orders HAVING COUNT(*) > 10;        -- 12       (1 row)
SELECT COUNT(*) FROM orders HAVING COUNT(*) > 100;       -- (0 rows) -- not "0": the single group failed the filter`,
      caption: "The second form is right when the count in the output should include every order but the filter should count only paid ones — two different questions that look alike. Read HAVING as 'keep groups where', and put anything that is not about the group in WHERE."
    },

    { t: "h2", n: "03", text: "Counting the right thing after a join", id: "counting" },

    { t: "p", text: "Group a joined result and every aggregate runs over the joined rows — one per line item, say — not over the entities you pictured. `COUNT(*)` per category then counts item rows, not products. **`COUNT(DISTINCT p.product_id)` counts products; `COUNT(DISTINCT oi.order_id)` counts orders; `SUM(oi.qty)` sums units, which is right because units are at item grain.** Every aggregate in a grouped join needs its grain named." },

    { t: "code", lang: "sql", title: "Per category: three counts at three grains",
      hl: [1, 2, 9, 10],
      code: `SELECT p.category, COUNT(*) AS rows_, COUNT(DISTINCT p.product_id) AS products,
       COUNT(DISTINCT oi.order_id) AS orders_containing, SUM(oi.qty) AS units, ROUND(AVG(oi.unit_price), 2) AS avg_sale_price
FROM   products p LEFT JOIN order_items oi ON oi.product_id = p.product_id
GROUP  BY p.category ORDER BY units DESC NULLS LAST;
-- category | rows_ | products | orders_containing | units | avg_sale_price
-- office   | 8     | 2        | 7                 | 25    | 15.83
-- kitchen  | 6     | 2        | 5                 | 7     | 36.00
-- NULL     | 2     | 1        | 2                 | 3     | 25.00
-- audio    | 3     | 1        | 3                 | 3     | 87.67
-- rows_ is line items. products is what the column header promised. AVG is per line item, not per product,
-- which is fine for "average price at which this category sold" and wrong for "average list price".

-- the same mistake in a per-tier report, and its fix
SELECT c.tier, COUNT(*) AS customers_wrong, COUNT(DISTINCT c.customer_id) AS customers, COUNT(o.order_id) AS orders
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP  BY c.tier ORDER BY c.tier;
-- plus     | 5 | 3 | 4          <- COUNT(*) counted joined rows: 3 customers, 4 order rows... and Mara's padded row
-- standard | 8 | 5 | 8`,
      caption: "In a grouped join, `COUNT(*)` is almost never the number you want. Name the grain of each aggregate — items, products, orders, customers — and count the key of that grain, DISTINCT where the join repeats it."
    },

    { t: "viz",
      title: "Grain after a join",
      caption: "Grouped by category, the office bucket holds eight joined rows: two products across seven orders. Each aggregate reads those eight rows and answers a different question depending on what it counts.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A bucket labelled office containing eight line-item rows, each showing product and order; three aggregates beside it — COUNT(*) 8, COUNT(DISTINCT product_id) 2, COUNT(DISTINCT order_id) 7 — with the grain each measures.">
  <rect x="30" y="40" width="380" height="190" rx="8" style="fill:var(--accent);fill-opacity:.07;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="46" y="64" class="s-label" style="font-weight:600">group: category = 'office'</text>
  <g class="s-mono">
    <text x="46" y="92">Desk lamp · order 102</text><text x="46" y="110">Desk lamp · order 105</text><text x="46" y="128">Desk lamp · order 108</text><text x="46" y="146">Desk lamp · order 111</text>
    <text x="230" y="92">Notebook · order 100</text><text x="230" y="110">Notebook · order 102</text><text x="230" y="128">Notebook · order 104</text><text x="230" y="146">Notebook · order 109</text>
  </g>
  <text x="46" y="184" class="s-sub">8 joined rows · 2 products · 7 distinct orders (102 holds both) · 25 units</text>
  <text x="46" y="206" class="s-sub">every aggregate runs over these eight rows</text>
  <g stroke-width="1.4">
    <rect x="450" y="50" width="400" height="44" rx="7" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="450" y="110" width="400" height="44" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="450" y="170" width="400" height="44" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-mono">
    <text x="464" y="77">COUNT(*)                     → 8   line items</text>
    <text x="464" y="137">COUNT(DISTINCT product_id)   → 2   products</text>
    <text x="464" y="197">COUNT(DISTINCT order_id)     → 7   orders</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "One whole row per group is not a GROUP BY", id: "distincton" },

    { t: "p", text: "'The latest order for each customer, with its status' asks for a *row* chosen by an ordering, not a value computed over the group. `MAX(placed_at)` gives the timestamp; there is no aggregate that returns 'the status on the row where placed_at was max' — `MAX(status)` is the alphabetically last status, which is meaningless. **The tools for this are `DISTINCT ON` in PostgreSQL and DuckDB, and `ROW_NUMBER` in 3.2 everywhere.**" },

    { t: "code", lang: "sql", title: "The latest order per customer, as a row",
      hl: [1, 2],
      code: `SELECT DISTINCT ON (o.customer_id) o.customer_id, o.order_id, o.placed_at, o.status
FROM   orders o
ORDER  BY o.customer_id, o.placed_at DESC;              -- the ORDER BY must start with the DISTINCT ON key
-- 1 | 108 | 2025-03-15 13:45:00 | paid
-- 2 | 105 | 2025-02-11 16:20:00 | paid
-- 3 | 110 | 2025-03-27 17:25:00 | paid
-- 4 | 106 | 2025-02-25 20:05:00 | paid
-- 5 | 111 | 2025-04-04 12:10:00 | paid
-- 6 | 109 | 2025-03-18 09:00:00 | paid
-- 7 | 107 | 2025-03-03 10:30:00 | cancelled            (7 rows: Mara has no order to be latest)

-- the wrong aggregate answer, for comparison
SELECT customer_id, MAX(placed_at), MAX(status) FROM orders GROUP BY customer_id;
-- MAX(status) is 'refunded' for Chen: alphabetically last, from a different row than the MAX(placed_at)`,
      caption: "`DISTINCT ON` keeps the first row of each key in the sort order — a whole row, all columns consistent. Add `order_id DESC` as a tie-breaker if two orders can share a timestamp. On engines without it, `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC)` filtered to 1 is the same thing (3.2)."
    },

    { t: "table",
      head: ["Question", "Shape", "Tool"],
      rows: [
        ["How many / how much per X", "One value per group", "GROUP BY X with COUNT / SUM / AVG"],
        ["When first / when last per X", "One value per group", "GROUP BY X with MIN / MAX on the timestamp"],
        ["Which groups satisfy …", "Filtered groups", "HAVING on the aggregate"],
        ["Which row is latest per X", "One whole row per group", "DISTINCT ON, or ROW_NUMBER = 1 (3.2)"],
        ["Each row with its group's total", "Every row kept, plus a group value", "Window aggregate OVER (PARTITION BY X) (3.1)"],
        ["Subtotals and a grand total together", "Groups at several levels", "GROUPING SETS / ROLLUP (2.5)"]
      ]
    },

    { t: "ladder",
      title: "Orders per customer, including customers with none",
      rungs: [
        { level: "bad", label: "Group the join, count the rows", code: `SELECT c.name, COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name;`,
          note: "**Mara: 1.** COUNT(*) counts the padded row. And grouping by name rather than the key merges two customers who share a name." },
        { level: "ok", label: "Count the right key", code: `SELECT c.name, COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name;`,
          note: "**Mara: 0.** Still grouped by name; still merges homonyms; and adding a second join would multiply the count." },
        { level: "best", label: "Group by the key, count the child key", code: `SELECT c.customer_id, c.name, COUNT(o.order_id) AS orders
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP  BY c.customer_id, c.name;`,
          note: "**Correct per entity, not per name, and the aggregate names its grain.** When a second one-to-many join is needed, it goes in a subquery aggregated to one row per customer first (2.2)." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A monthly status report, at the right grain",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Write one query that returns, per calendar month and status: the number of orders, the number of distinct customers, the revenue (sum of item amounts), and the average order value — defined as revenue divided by the number of orders, not the average of item amounts. Then filter to months with revenue over 100, sorted by month then status. State the grain of every aggregate." },
        { t: "p", text: "Then answer, in one query each: the customers whose *first* order was refunded or cancelled; and the product that appears in the most distinct paid orders." }
      ],
      requirements: [
        "Orders and customers counted DISTINCT where the item join repeats them.",
        "Average order value computed at order grain, not item grain.",
        "HAVING for the revenue filter; WHERE for nothing that is not about the group.",
        "Verified output for all three."
      ],
      hint: "Revenue is at item grain, so the join to order_items is right for SUM; orders and customers are at order grain, so COUNT DISTINCT them. 'First order was refunded' is a one-row-per-group question — DISTINCT ON the customer ordered by placed_at, then filter the status.",
      solution: {
        lang: "sql",
        title: "monthly_status.sql",
        code: `SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month, o.status,
       COUNT(DISTINCT o.order_id)                                    AS orders,      -- order grain
       COUNT(DISTINCT o.customer_id)                                 AS customers,   -- customer grain
       SUM(oi.qty * oi.unit_price)                                   AS revenue,     -- item grain: the sum is right
       ROUND(SUM(oi.qty * oi.unit_price) / COUNT(DISTINCT o.order_id), 2) AS avg_order_value   -- revenue per ORDER
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
GROUP  BY 1, 2
HAVING SUM(oi.qty * oi.unit_price) > 100
ORDER  BY 1, 2;
-- month      | status | orders | customers | revenue | avg_order_value
-- 2025-01-01 | paid   | 3      | 2         | 203.00  | 67.67
-- 2025-02-01 | paid   | 3      | 3         | 251.90  | 83.97
-- 2025-03-01 | paid   | 3      | 3         | 190.50  | 63.50
-- (February refunded 45.00, March cancelled 64.00 and April paid 52.50 fail the HAVING)

-- customers whose first order was not paid: one row per customer, chosen by time, then filtered
SELECT * FROM (
  SELECT DISTINCT ON (customer_id) customer_id, order_id, status FROM orders ORDER BY customer_id, placed_at, order_id
) first_orders
WHERE status <> 'paid';
-- 3 | 103 | refunded  (Chen)      7 | 107 | cancelled  (Iker)

-- the product in the most distinct paid orders
SELECT p.name, COUNT(DISTINCT o.order_id) AS paid_orders
FROM   products p JOIN order_items oi ON oi.product_id = p.product_id JOIN orders o ON o.order_id = oi.order_id
WHERE  o.status = 'paid'
GROUP  BY p.product_id, p.name
ORDER  BY paid_orders DESC, p.name
LIMIT  1;
-- Desk lamp | 4       (Notebook also has 4; the name tie-breaker made the choice explicit -- 3.2 handles ties honestly)`,
        notes: [
          { t: "p", text: "**`AVG(oi.qty * oi.unit_price)` would have been the average line item, not the average order** — a smaller number, and a different question. Revenue over distinct orders is the definition, and stating the grain next to each aggregate is what stops the two being confused." },
          { t: "p", text: "**'First order was refunded' filtered the DISTINCT ON result in an outer query**, because the status test must apply to the chosen row, not decide which row is chosen. Putting `WHERE status <> 'paid'` inside would have found each customer's first *non-paid* order instead — Chen's and Iker's again here, but a different question." },
          { t: "p", text: "**The top product is a tie**, and LIMIT 1 with a name tie-breaker picked one deterministically. Whether a report should show both is a question for the ranking functions in 3.2, which can say 'rank 1' twice." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT department, name, MAX(salary) FROM employees GROUP BY department` — what does PostgreSQL do?",
          options: [
            "Returns the highest-paid employee's name per department",
            "Raises an error: `name` must appear in GROUP BY or in an aggregate, because a department has many names and none is 'the' name",
            "Returns the first name alphabetically",
            "Returns NULL for name"
          ],
          answer: 1,
          why: "After grouping, only grouping columns and aggregates have one value per group. The highest-paid employee per department is a one-whole-row-per-group question: DISTINCT ON, or ROW_NUMBER over the partition."
        }
      ]
    }
  ],

  takeaways: [
    "**After GROUP BY only two kinds of column exist: grouping columns and aggregates.** A bare column is an error, or an arbitrary pick on lenient engines.",
    "**NULL is a group.** All the NULLs of a grouping column land in one bucket.",
    "**Group by the key, not the name** — two entities with the same name are one group otherwise.",
    "**HAVING filters groups after aggregation; WHERE filters rows before.** A non-aggregate condition belongs in WHERE even though HAVING accepts it.",
    "**HAVING without GROUP BY treats the table as one group** and returns one row or none — not zero.",
    "**In a grouped join, COUNT(*) counts joined rows.** Name the grain of each aggregate and COUNT(DISTINCT that grain's key).",
    "**MIN and MAX of a timestamp give first and last per group**; no aggregate gives another column from that same row.",
    "**'The latest row per group' is DISTINCT ON or ROW_NUMBER = 1**, never MAX of the other columns.",
    "**Average order value is revenue over distinct orders**, not AVG over line items — the grain of an average is the grain of the question.",
    "**Filter the chosen row in an outer query**: a WHERE inside DISTINCT ON changes which row is chosen, not whether the chosen row passes."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `WHERE status = 'paid'` belong in WHERE rather than HAVING when both give the same result?",
        options: [
          "HAVING is deprecated",
          "WHERE removes rows before grouping, so fewer rows are aggregated and the planner can use an index; HAVING would group everything and then discard",
          "HAVING cannot compare strings",
          "They are not the same result"
        ],
        answer: 1,
        why: "Correctness is identical for a non-aggregate condition. Cost is not: filtering first shrinks the input to the aggregation and keeps the predicate on a bare column where an index can serve it."
      },
      {
        stem: "A per-category report shows `office: 8 products`. There are two office products. What did the query count?",
        options: [
          "Products, correctly — some are duplicated in the table",
          "Line-item rows produced by the join to order_items; the fix is COUNT(DISTINCT product_id)",
          "Orders",
          "Customers"
        ],
        answer: 1,
        why: "Grouping a joined result aggregates joined rows. Two products across eight line items give COUNT(*) = 8. Each count needs the key of the grain it claims to measure."
      },
      {
        stem: "Which expression returns the status of each customer's most recent order?",
        options: [
          "`MAX(status)` grouped by customer",
          "`DISTINCT ON (customer_id) … ORDER BY customer_id, placed_at DESC` — one whole row per customer, chosen by the sort",
          "`MAX(placed_at)` grouped by customer",
          "`LAST(status)` grouped by customer"
        ],
        answer: 1,
        why: "MAX(status) is alphabetical and unrelated to the latest row; MAX(placed_at) is the right time but not the status. Selecting a whole row by order is what DISTINCT ON and ROW_NUMBER do."
      },
      {
        stem: "`SELECT COUNT(*) FROM orders HAVING COUNT(*) > 100` returns no rows on a 12-row table. Why not a row with 0?",
        options: [
          "COUNT returned NULL",
          "The whole table is one group; the group's count is 12, which fails the HAVING, so the group is removed and nothing is returned",
          "HAVING requires GROUP BY",
          "It should return 12"
        ],
        answer: 1,
        why: "HAVING filters groups. With no GROUP BY there is exactly one, and a failed filter leaves zero groups — an empty result, not a zero."
      },
      {
        stem: "PostgreSQL accepts `SELECT c.customer_id, c.name, COUNT(*) FROM customers c JOIN orders o … GROUP BY c.customer_id` without `c.name` in the GROUP BY. Why?",
        options: [
          "It picks an arbitrary name",
          "customer_id is the primary key of customers, so name is functionally dependent on it and has exactly one value per group",
          "PostgreSQL ignores the rule",
          "Because of the JOIN"
        ],
        answer: 1,
        why: "The standard allows columns functionally dependent on the grouping key. PostgreSQL detects this for primary keys. Naming the column anyway keeps the query portable."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why can you not select a non-aggregated column that is not in the GROUP BY?",
        strong: "Because after grouping, each output row represents a set of input rows, and a column that is not a grouping key can have several values across that set — there is no single value to return. The engine either refuses, as PostgreSQL does, or picks one arbitrarily, as older MySQL and SQLite do, which is worse because it looks like an answer. The exception is functional dependency: grouping by a primary key lets its table's other columns through, since they have one value per key. If what I want is a column from one particular row of the group — the latest order's status — that is not aggregation at all; it is DISTINCT ON or ROW_NUMBER.",
        answer: [
          { t: "p", text: "Recognising the 'one particular row' case as a different question is what separates this from a recital of the rule." }
        ]
      },
      {
        level: "core",
        q: "What goes wrong when you GROUP BY after a join, and how do you keep the counts honest?",
        strong: "The join sets the grain of the rows being grouped — one per line item after joining items — so COUNT(*) counts line items whatever the column header says, and a SUM of an order-level amount is multiplied by the item count. I name the grain of each aggregate and count the key of that grain with DISTINCT where the join repeats it: COUNT(DISTINCT order_id) for orders, COUNT(DISTINCT customer_id) for customers, SUM over item amounts because items are the grain where amounts live. If two one-to-many joins are needed, I aggregate each to one row per parent first and join those, because DISTINCT can fix counts but never sums.",
        answer: [
          { t: "p", text: "The 'DISTINCT fixes counts but never sums' line is the tell that the candidate has been burnt by fan-out." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute average order value per month, and what is the common wrong answer?",
        strong: "Revenue divided by the number of distinct orders, both per month: SUM of item amounts over COUNT(DISTINCT order_id), with the item join so the sum is at the right grain. The common wrong answer is AVG(item_amount), which is the average line item — a smaller number that answers a different question — or AVG over a subquery that already summed per order, which is right but a second pass. I also make the division decimal, and I check the monthly revenues reconcile to the total in order_items for those months, because a grouped join is where fan-out hides.",
        answer: [
          { t: "p", text: "Defining the metric before writing the aggregate — 'revenue over orders' — is how the grain error is avoided rather than fixed." }
        ]
      }
    ]
  }
});

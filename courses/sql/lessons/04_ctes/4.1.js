/* ============================================================================
   LESSON 4.1 — Subqueries: Scalar, Table and Correlated
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**A subquery is a query used as a value, a table, or a test.** As a value it must return exactly one row and one column, and the day it returns two rows it raises an error in production. As a table it is a derived relation you can join to. As a test — EXISTS, IN, ANY, ALL — it answers a yes or no per outer row. The one that costs is the correlated subquery in a SELECT list, which the planner may run once per row; and the one that pays for itself is LATERAL, which runs a subquery per row on purpose, with a LIMIT, to fetch 'the last two of each'.",

  objectives: [
    "Place a subquery as a scalar, a derived table, or a predicate, and know the cardinality rule for each",
    "Use ANY and ALL against a set, and rewrite them as MIN/MAX when clearer",
    "Tell a correlated subquery the planner can flatten from one it must execute per row",
    "Use LATERAL for per-row lookups that need ORDER BY and LIMIT — the as-of join"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Three roles", id: "roles" },

    { t: "p", text: "The same parenthesised SELECT plays different roles depending on where it stands. In a comparison or the SELECT list it is a **scalar** and must produce one value. In FROM it is a **derived table** — a relation with an alias, joinable like any other. In WHERE with EXISTS, IN, ANY or ALL it is a **predicate** over a set. The rules that follow are all consequences of which role it is playing." },

    { t: "dl", items: [
      ["Scalar subquery", "Returns one row, one column. Zero rows becomes NULL; two rows is a runtime error. Usable anywhere a value is: SELECT list, WHERE comparison, SET in an UPDATE."],
      ["Derived table", "A subquery in FROM with an alias. Its columns are whatever it selected; it is joined, filtered and grouped like a base table. The step CTEs (4.2) make readable."],
      ["Correlated subquery", "A subquery that references a column of the outer query. Conceptually re-evaluated per outer row; in practice, decorrelated into a join when the planner can see how."],
      ["`ANY` / `SOME`, `ALL`", "`x > ANY (set)`: greater than at least one. `x > ALL (set)`: greater than every one. `= ANY` is `IN`. An empty set makes ALL true and ANY false; a NULL in the set makes both unknown in the ways 1.2 described."],
      ["`LATERAL`", "A derived table in FROM that may reference columns of tables to its left. Evaluated per left row — deliberately — which is how 'the latest n rows for each' is written."]
    ]},

    { t: "code", lang: "sql", title: "Scalar in WHERE, scalar in SELECT, and the error that waits",
      hl: [1, 7, 8, 14],
      code: `SELECT name, unit_price FROM products WHERE unit_price > (SELECT AVG(unit_price) FROM products) ORDER BY unit_price;
-- Toaster 45.00 · Headphones 89.00        (the average is 37.12; the subquery runs once and becomes a constant)

SELECT (SELECT AVG(unit_price) FROM products) AS avg_price;      -- a scalar subquery as a column: 37.1167

-- correlated scalars in the SELECT list: one value per outer row
SELECT c.name,
       (SELECT COUNT(*)       FROM orders o WHERE o.customer_id = c.customer_id) AS orders,
       (SELECT MAX(placed_at) FROM orders o WHERE o.customer_id = c.customer_id) AS last_order
FROM   customers c ORDER BY c.customer_id;
-- Asha 3 2025-03-15 · Bruno 2 2025-02-11 · ... · Mara 0 NULL      (8 rows; COUNT over nothing is 0, MAX over nothing is NULL)
-- two subqueries: two lookups per customer. The LEFT JOIN + GROUP BY of 2.4 does it in one pass.

SELECT name FROM customers WHERE customer_id = (SELECT customer_id FROM orders);
-- ERROR: more than one row returned by a subquery used as an expression
-- it "worked" while the subquery happened to return one row. The comparison meant IN, and should say so.`,
      caption: "A scalar subquery that can return more than one row is a bug waiting for data. If the intent is 'any of these', write IN or EXISTS; if the intent is genuinely one value, add the aggregate or LIMIT that guarantees it."
    },

    { t: "h2", n: "02", text: "ANY, ALL, and derived tables", id: "any" },

    { t: "p", text: "`salary > ALL (SELECT salary FROM sales)` reads as 'paid more than everyone in sales' and is equivalent to `salary > (SELECT MAX(salary) FROM sales)` — the MAX form is usually clearer and always safe against an empty set, which makes `> ALL` trivially true. A derived table in FROM is how an aggregate becomes joinable: **compute the department averages once as a relation, then join employees to it.** It is the pre-window way of doing 3.1's difference-from-average, and it is still the right tool when the aggregate's grain is not the row's." },

    { t: "code", lang: "sql", title: "ALL and ANY against a set; an aggregate joined as a table",
      hl: [1, 5, 9, 10],
      code: `SELECT e.name, e.salary FROM employees e WHERE e.salary > ALL (SELECT salary FROM employees WHERE department = 'sales') ORDER BY salary;
-- Quentin 125000 · Rosa 125000 · Tomas 131000 · Oscar 150000 · Nadia 190000       (> 120000, sales' maximum)
-- same as: WHERE e.salary > (SELECT MAX(salary) FROM employees WHERE department = 'sales')

SELECT e.name, e.salary FROM employees e WHERE e.department = 'engineering' AND e.salary < ANY (SELECT salary FROM employees WHERE department = 'sales') ORDER BY salary;
-- Sami 98000                                       (< 120000, sales' maximum: "cheaper than at least one salesperson")

-- a derived table: the aggregate at department grain, joined back to rows at employee grain
SELECT e.name, e.salary, e.salary - d.avg_salary AS vs_dept
FROM   employees e
JOIN   (SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department) d ON d.department = e.department
ORDER  BY vs_dept DESC LIMIT 3;
-- Priya 120000 29250 · Oscar 150000 24200 · Tomas 131000 5200        (the same numbers as AVG() OVER in 3.1)`,
      caption: "The derived table and the window give identical results here; the difference is shape. A window annotates each row with its group's value in one pass. A derived table computes the group values as their own relation, which is what you need when the group is at a different grain, filtered differently, or reused by several queries."
    },

    { t: "h2", n: "03", text: "Correlated subqueries: which ones cost", id: "correlated" },

    { t: "p", text: "A correlated subquery references the outer row, so logically it runs once per outer row. Planners decorrelate the common shapes — EXISTS and IN become semi joins (2.3), a scalar aggregate keyed on an equality becomes a join to a grouped subquery. **What stays per-row is the shape the planner cannot turn into a join**: a scalar subquery with a LIMIT, an ORDER BY, or a non-equality correlation. In EXPLAIN (5.2) it shows as a SubPlan executed n times. When you see it, the rewrite is a window function, a derived table, or LATERAL." },

    { t: "viz",
      title: "Flattened or executed per row",
      caption: "The planner rewrites correlated EXISTS, IN and equality-keyed aggregates into joins that run once. A scalar subquery with ORDER BY … LIMIT, or a correlation on a range, has no join equivalent and runs once per outer row — which LATERAL makes explicit and puts an index behind.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two columns. Left, headed decorrelated to a join: EXISTS, IN, NOT EXISTS, scalar aggregate on an equality. Right, headed executed per outer row: scalar with ORDER BY LIMIT, correlation on a range, LATERAL by design. Arrows indicate the rewrite from the right column to windows, derived tables or LATERAL.">
  <g stroke-width="1.4">
    <rect x="30" y="40" width="390" height="150" rx="8" style="fill:var(--good);fill-opacity:.08;stroke:var(--good)"/>
    <rect x="460" y="40" width="390" height="150" rx="8" style="fill:var(--warn);fill-opacity:.08;stroke:var(--warn)"/>
  </g>
  <text x="46" y="64" class="s-label" style="fill:var(--good);font-weight:600">planner flattens into a join — runs once</text>
  <text x="476" y="64" class="s-label" style="fill:var(--warn);font-weight:600">no join equivalent — runs per outer row</text>
  <g class="s-mono">
    <text x="46" y="92">WHERE EXISTS (… o.customer_id = c.customer_id)</text>
    <text x="46" y="112">WHERE key IN (SELECT key …)</text>
    <text x="46" y="132">WHERE NOT EXISTS (…)</text>
    <text x="46" y="152">(SELECT COUNT(*) FROM o WHERE o.k = c.k)</text>
    <text x="46" y="172">plan: Semi Join / Anti Join / Hash Join + Aggregate</text>
    <text x="476" y="92">(SELECT x FROM o WHERE o.k = c.k ORDER BY t DESC LIMIT 1)</text>
    <text x="476" y="112">(SELECT … WHERE o.t BETWEEN c.t - '1h' AND c.t)</text>
    <text x="476" y="132">LATERAL (… ORDER BY t DESC LIMIT n)  — by design</text>
    <text x="476" y="152">plan: SubPlan, loops = n  ·  or Nested Loop + Index Scan</text>
  </g>
  <text x="30" y="226" class="s-sub">Rewrite the right-hand shapes as a window function (latest per group: ROW_NUMBER), a derived table (aggregate then join), or LATERAL with an index on (k, t).</text>
</svg>`
    },

    { t: "h2", n: "04", text: "LATERAL: a subquery per row, on purpose", id: "lateral" },

    { t: "p", text: "`LATERAL` lets a subquery in FROM refer to the tables before it, and it is evaluated for each of their rows. That sounds like the slow case, and it is the slow case made honest: **the subquery can use ORDER BY and LIMIT, so 'the last two orders of each customer' or 'the most recent event before each order' is one LATERAL with an index on `(customer_id, occurred_at)` behind it** — a nested loop with an index seek per row, which is exactly the right plan for that question. `CROSS JOIN LATERAL` drops rows with no match; `LEFT JOIN LATERAL … ON TRUE` keeps them." },

    { t: "code", lang: "sql", title: "Last two orders per customer, and the event just before each order",
      hl: [2, 3, 10, 18, 19, 20],
      code: `SELECT c.name, o.order_id, o.placed_at
FROM   customers c
CROSS  JOIN LATERAL (SELECT order_id, placed_at FROM orders WHERE customer_id = c.customer_id
                     ORDER BY placed_at DESC LIMIT 2) o
ORDER  BY c.name, o.placed_at DESC;
-- Asha 108, Asha 102 · Bruno 105, Bruno 101 · Chen 110, Chen 103 · Dalia 106 · Emeka 111, Emeka 104 · Fatou 109 · Iker 107   (11 rows; Mara absent)

-- keep customers with nothing: LEFT JOIN LATERAL ... ON TRUE
SELECT c.name, o.order_id
FROM   customers c LEFT JOIN LATERAL (SELECT order_id FROM orders WHERE customer_id = c.customer_id ORDER BY placed_at DESC LIMIT 1) o ON TRUE
ORDER  BY c.name;
-- ... Mara | NULL                             (8 rows)

-- the as-of join: for each paid order, the customer's most recent event strictly before it
SELECT o.order_id, o.placed_at, e.event_type, e.occurred_at
FROM   orders o
LEFT   JOIN LATERAL (SELECT event_type, occurred_at FROM events ev
                     WHERE  ev.customer_id = o.customer_id AND ev.occurred_at < o.placed_at
                     ORDER  BY ev.occurred_at DESC LIMIT 1) e ON TRUE
WHERE  o.status = 'paid' ORDER BY o.order_id;
-- 108 | 2025-03-15 13:45 | cart | 2025-03-15 13:20
-- 110 | 2025-03-27 17:25 | cart | 2025-03-27 17:10
-- 111 | 2025-04-04 12:10 | view | 2025-04-04 11:52
-- the other seven: NULL -- no earlier event for that customer. SQL Server: CROSS APPLY / OUTER APPLY. MySQL 8.0.14+: LATERAL.`,
      caption: "The as-of join is `merge_asof` from Data Handling 3.6 in SQL: the latest row from another table at or before each row's time. LATERAL with ORDER BY DESC LIMIT 1 is its natural spelling, and a window function is the alternative when the 'other table' is the same table."
    },

    { t: "table",
      head: ["Shape", "Cardinality rule", "Typical use", "Watch for"],
      rows: [
        ["Scalar in WHERE / SELECT", "Exactly one row and column; zero rows → NULL", "Compare with an aggregate; a lookup value", "A second row appearing later — write IN or add an aggregate"],
        ["Derived table in FROM", "Any", "Aggregate at one grain, join at another", "Missing alias (required); readability — prefer a CTE"],
        ["EXISTS / NOT EXISTS", "Any; only existence matters", "Semi and anti joins", "None — the safe default"],
        ["IN / NOT IN", "One column", "Membership", "NULL in the list empties NOT IN"],
        ["ANY / ALL", "One column", "Compare against a set", "Empty set: ALL is true, ANY is false; prefer MIN/MAX"],
        ["Correlated scalar with ORDER BY … LIMIT", "One row", "Latest value per row", "Runs per row — rewrite as window or LATERAL"],
        ["LATERAL", "Any, often LIMIT n", "Top-n per row, as-of lookups", "Needs an index on the correlation key + sort column"]
      ]
    },

    { t: "ladder",
      title: "Each customer's most recent order status",
      rungs: [
        { level: "bad", label: "Two correlated scalars", code: `SELECT c.name,
       (SELECT MAX(placed_at) FROM orders o WHERE o.customer_id = c.customer_id) AS last_at,
       (SELECT status FROM orders o WHERE o.customer_id = c.customer_id ORDER BY placed_at DESC LIMIT 1) AS last_status
FROM customers c;`,
          note: "**Correct, and two subplans per customer** — the second has an ORDER BY LIMIT the planner cannot flatten. Both read the same rows; the query says so twice." },
        { level: "ok", label: "Window in a derived table", code: `SELECT c.name, o.placed_at, o.status
FROM   customers c LEFT JOIN (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC) AS rn FROM orders) o
       ON o.customer_id = c.customer_id AND o.rn = 1;`,
          note: "**One pass over orders, one sort.** Numbers every order to keep one per customer — fine for a table scan, wasteful when only a few customers are wanted." },
        { level: "best", label: "LATERAL with an index behind it", code: `SELECT c.name, o.placed_at, o.status
FROM   customers c
LEFT   JOIN LATERAL (SELECT placed_at, status FROM orders WHERE customer_id = c.customer_id ORDER BY placed_at DESC LIMIT 1) o ON TRUE;
-- CREATE INDEX ON orders (customer_id, placed_at DESC);`,
          note: "**One index seek per customer, reading only the row it needs**, and it scales with the number of customers asked about rather than the number of orders. The plan is a Nested Loop — the right one, for once." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Three lookups, three shapes",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(1)** Products priced above the average price of their own category — a correlated scalar, then the same with a derived table, then as a window. **(2)** For each paid order, the two most recent events of that customer before the order, with their types — LATERAL. **(3)** Customers whose every order is paid — using ALL, then rewritten with NOT EXISTS, then with a grouped derived table." },
        { t: "p", text: "For (1), say which of the three forms you would ship and why. For (3), say what happens to Mara under each spelling." }
      ],
      requirements: [
        "The three equivalent forms for (1), all producing the same rows.",
        "LATERAL with LIMIT 2 and a LEFT JOIN … ON TRUE for (2).",
        "Three spellings for (3) with the Mara case explained.",
        "Verified output for all."
      ],
      hint: "For (1) the correlation is on category, which is nullable: the gift card compares its price with the average of category IS NULL rows … which `=` never matches, so its subquery averages nothing and returns NULL. For (3), `'paid' = ALL (SELECT status …)` over an empty set is true.",
      solution: {
        lang: "sql",
        title: "subquery_shapes.sql",
        code: `-- (1a) correlated scalar
SELECT p.name, p.category, p.unit_price FROM products p
WHERE  p.unit_price > (SELECT AVG(q.unit_price) FROM products q WHERE q.category = p.category);
-- Toaster kitchen 45.00 · Desk lamp office 27.50           (Headphones is alone in audio: not above itself. Gift card: NULL category, NULL average, dropped)

-- (1b) derived table
SELECT p.name, p.category, p.unit_price FROM products p
JOIN   (SELECT category, AVG(unit_price) AS avg_price FROM products GROUP BY category) a ON a.category = p.category
WHERE  p.unit_price > a.avg_price;
-- same two rows; the join on a NULL category drops the gift card here too (2.2)

-- (1c) window
SELECT name, category, unit_price FROM (SELECT *, AVG(unit_price) OVER (PARTITION BY category) AS avg_price FROM products) t
WHERE  unit_price > avg_price;
-- same two rows -- and the NULL category IS a partition here, so the gift card compares with itself and is not above it
-- ship (1c): one pass, no correlation, and NULL categories handled as a group rather than dropped by a comparison

-- (2) two most recent events before each paid order
SELECT o.order_id, e.event_type, e.occurred_at
FROM   orders o
LEFT   JOIN LATERAL (SELECT event_type, occurred_at FROM events ev
                     WHERE ev.customer_id = o.customer_id AND ev.occurred_at < o.placed_at
                     ORDER BY ev.occurred_at DESC LIMIT 2) e ON TRUE
WHERE  o.status = 'paid' AND e.event_type IS NOT NULL ORDER BY o.order_id, e.occurred_at DESC;
-- 108 cart 13:20 · 108 view 13:09 · 110 cart 17:10 · 110 view 17:00 · 111 view 11:52 · 111 view 11:40      (6 rows)

-- (3a) ALL: true for Mara, whose set of statuses is empty
SELECT name FROM customers c WHERE 'paid' = ALL (SELECT status FROM orders o WHERE o.customer_id = c.customer_id) ORDER BY 1;
-- Asha, Bruno, Dalia, Emeka, Fatou, Mara                  (Chen has a refund, Iker a cancellation)
-- (3b) NOT EXISTS: "no order that is not paid" -- also true for Mara
SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status <> 'paid') ORDER BY 1;
-- the same six
-- (3c) grouped derived table: only customers WITH orders can appear -- Mara is excluded
SELECT c.name FROM customers c
JOIN   (SELECT customer_id FROM orders GROUP BY customer_id HAVING BOOL_AND(status = 'paid')) g ON g.customer_id = c.customer_id
ORDER  BY 1;
-- Asha, Bruno, Dalia, Emeka, Fatou                        (5 rows)`,
        notes: [
          { t: "p", text: "**(1) shows the NULL-category difference between correlation and partition.** The correlated and derived-table forms compare the gift card with `category = NULL`, which matches nothing; the window partitions NULLs together. Neither is wrong — but the window's behaviour is the one you would have to explain least." },
          { t: "p", text: "**(3) is a vacuous-truth question.** 'All of Mara's orders are paid' is true because she has none; ALL and NOT EXISTS both say so, and the grouped form says nothing because there is no group. Whether Mara belongs on the list is a business decision — 'customers with a clean record' probably means 'who have ordered'." },
          { t: "p", text: "**(2) filtered out the NULL rows from the LEFT JOIN LATERAL** with `e.event_type IS NOT NULL`, which is fine for a listing and would be the wrong move for a feature table, where 'no prior events' is a value." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`WHERE customer_id = (SELECT customer_id FROM orders WHERE status = 'refunded')` works today and fails next month. Why?",
          options: [
            "The subquery is too slow",
            "It is a scalar subquery, so it must return one row; when a second refund appears it returns two and the comparison raises an error — the intent was membership, so write IN or EXISTS",
            "status cannot be compared",
            "refunded orders cannot be selected"
          ],
          answer: 1,
          why: "A subquery in a comparison plays the scalar role and is held to one row. Data that happens to satisfy that today does not make the query correct; the shape of the question — 'any of' — asks for IN."
        }
      ]
    }
  ],

  takeaways: [
    "**A subquery is a value, a table or a test**, and the rules follow from the role: one row for a scalar, an alias for a derived table, a set for a predicate.",
    "**A scalar subquery that could return two rows is a bug waiting for data** — write IN, EXISTS, or an aggregate.",
    "**Zero rows from a scalar subquery is NULL**, and in a comparison that NULL drops the row (1.2).",
    "**`> ALL` is `> MAX` and `> ANY` is `> MIN`** — usually clearer, and safe against an empty set, which makes ALL vacuously true.",
    "**A derived table is an aggregate you can join** — the right form when the group's grain differs from the row's.",
    "**Correlated EXISTS, IN and equality-keyed aggregates are flattened into joins**; correlated ORDER BY … LIMIT and range correlations run per row.",
    "**A SubPlan with loops = n in EXPLAIN is the per-row kind** — rewrite as a window, a derived table, or LATERAL.",
    "**LATERAL runs a subquery per left row on purpose**, with ORDER BY and LIMIT, and needs an index on the correlation key plus the sort column.",
    "**LATERAL is the as-of join**: the latest row of another table before each row's time. `LEFT JOIN LATERAL … ON TRUE` keeps the rows with no match.",
    "**Correlation on a nullable column compares with `=` and drops NULLs; a window partitions them** — the two forms differ exactly there."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `salary > ALL (SELECT salary FROM employees WHERE department = 'archive')` return when that department has no employees?",
        options: [
          "No rows",
          "Every row — ALL over an empty set is vacuously true; `> (SELECT MAX(salary) …)` would compare with NULL and return nothing instead",
          "An error",
          "NULL"
        ],
        answer: 1,
        why: "Universal quantification over nothing is true; MAX over nothing is NULL. The two rewrites differ precisely on the empty set, which is why the choice should be deliberate."
      },
      {
        stem: "Which correlated subquery can the planner NOT turn into a join?",
        options: [
          "`WHERE EXISTS (SELECT 1 FROM o WHERE o.k = c.k)`",
          "`(SELECT COUNT(*) FROM o WHERE o.k = c.k)`",
          "`(SELECT status FROM o WHERE o.k = c.k ORDER BY t DESC LIMIT 1)` — the ORDER BY … LIMIT per outer row has no join equivalent, so it runs as a SubPlan per row",
          "`WHERE c.k IN (SELECT k FROM o)`"
        ],
        answer: 2,
        why: "Existence and equality-keyed aggregates decorrelate into semi joins and grouped joins. A per-row top-1 does not; the rewrite is ROW_NUMBER in a derived table, or LATERAL with an index."
      },
      {
        stem: "What is the difference between `CROSS JOIN LATERAL (…)` and `LEFT JOIN LATERAL (…) ON TRUE`?",
        options: [
          "None",
          "CROSS drops left rows for which the subquery returns nothing; LEFT … ON TRUE keeps them with NULLs — the inner/outer distinction applied to a per-row subquery",
          "LEFT is faster",
          "CROSS allows LIMIT and LEFT does not"
        ],
        answer: 1,
        why: "LATERAL is still a join. A customer with no orders produces zero subquery rows; CROSS JOIN then has nothing to pair and the customer vanishes, exactly as with an inner join."
      },
      {
        stem: "A correlated scalar compares each product's price with the average price of `WHERE q.category = p.category`. What happens to a product whose category is NULL?",
        options: [
          "It is compared with the average of all NULL-category products",
          "`q.category = NULL` matches nothing, the subquery averages no rows and returns NULL, and the comparison with NULL drops the product",
          "It raises an error",
          "It is compared with the overall average"
        ],
        answer: 1,
        why: "Correlation is a comparison and follows three-valued logic. A window partitioned by category would group the NULLs together instead; the two shapes disagree only on NULL keys."
      },
      {
        stem: "Why is LATERAL with `ORDER BY t DESC LIMIT 1` often faster than a ROW_NUMBER derived table for 'latest per entity' when only some entities are asked about?",
        options: [
          "LATERAL caches results",
          "The window numbers every row of the inner table; LATERAL does one index seek per outer row and reads only the row it needs, so cost scales with the outer rows rather than the inner table",
          "ROW_NUMBER is not indexable",
          "It is not; the window is always faster"
        ],
        answer: 1,
        why: "With an index on (entity, t DESC), each LATERAL probe is a single seek. The window must scan and sort the whole inner table regardless of how many entities the outer query has."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a correlated subquery and is it always slow?",
        strong: "A subquery that references a column of the outer query, so logically it is evaluated once per outer row. It is not always slow: planners rewrite the common shapes — EXISTS, IN, NOT EXISTS, a scalar aggregate keyed on an equality — into semi joins, anti joins or a join to a grouped subquery, which run once. What stays per-row is a shape with no join equivalent: a scalar subquery with ORDER BY and LIMIT, or a correlation on a range. Those show up in EXPLAIN as a SubPlan with loops equal to the outer row count. I rewrite them as a window function, a derived table, or LATERAL with an index on the correlation key.",
        answer: [
          { t: "p", text: "Splitting 'correlated' into decorrelatable and not, and naming the plan node, is the answer that shows understanding of the planner rather than folklore." }
        ]
      },
      {
        level: "core",
        q: "When would you use a derived table rather than a window function?",
        strong: "When the aggregate lives at a different grain from the rows, needs a different filter, or is reused. A window annotates each row with its partition's value in one pass and is the tool for shares, ranks and differences from the group. A derived table computes the group values as a relation — department averages, per-customer totals — which I can filter, join to other tables at that grain, or feed to several outer queries. The classic sign is 'aggregate first, then join back': that is a derived table or, for readability, a CTE.",
        answer: [
          { t: "p", text: "'Different grain, different filter, or reused' is the decision rule; naming it makes the choice sound deliberate." }
        ]
      },
      {
        level: "advanced",
        q: "How would you fetch, for each of a million orders, the customer's most recent event before that order?",
        strong: "LATERAL: for each order, a subquery over events filtered to the same customer and occurred_at before placed_at, ORDER BY occurred_at DESC LIMIT 1, joined with LEFT JOIN LATERAL ON TRUE so orders with no prior event survive. The plan is a nested loop with an index seek per order, which needs an index on events (customer_id, occurred_at) — with it, each probe reads one index entry; without it, each probe scans the customer's events. If the events table is far smaller than orders, the alternative is a window: union or join the two streams, order by time per customer, and carry the last event forward with LAG IGNORE NULLS — one sort instead of a million probes. I would EXPLAIN both on realistic sizes; the crossover depends on the ratio.",
        answer: [
          { t: "p", text: "Offering the window alternative with the cost model that decides between them is what makes this an advanced answer." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 2.2 — The Outer-Join Traps
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**Four ways a LEFT JOIN gives the wrong number, and none of them is a syntax error.** A condition on the right table written in WHERE deletes the rows the outer join preserved. COUNT(*) reports one for a customer with nothing. A NULL key matches nothing, so the row you were looking up is silently unmatched. And a second one-to-many join multiplies every sum by a factor that differs per row. Each has a one-line fix, and each is worth being able to recognise from the shape of the query alone.",

  objectives: [
    "Place a condition on the right-hand table in ON rather than WHERE, and say why the position changes the result",
    "Choose between COUNT(*) and COUNT(column) after an outer join",
    "Handle NULL join keys with IS NOT DISTINCT FROM or a COALESCE, deliberately",
    "Recognise fan-out from two one-to-many joins and fix it by aggregating before joining"
  ],

  prerequisites: ["2.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Trap 1: a WHERE on the right table", id: "where" },

    { t: "p", text: "Under the logical order of 1.1, the join runs first and WHERE runs on its output. A LEFT JOIN pads Mara's row with NULLs for every order column. Then `WHERE o.status = 'paid'` asks whether NULL equals `'paid'` — unknown — and drops the row. **The outer join kept her; the WHERE threw her away. The LEFT JOIN has become an INNER JOIN with extra steps.** The condition belongs in ON, where it decides which orders *pair* with a customer, rather than which customers survive." },

    { t: "code", lang: "sql", title: "Same condition, two positions, two results",
      hl: [3, 9],
      code: `SELECT c.name, COUNT(o.order_id) AS paid_orders
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE  o.status = 'paid'                                      -- filters the JOINED rows: NULL status fails
GROUP  BY c.name ORDER BY c.name;
-- Asha 3 · Bruno 2 · Chen 1 · Dalia 1 · Emeka 2 · Fatou 1                        (6 rows)
-- Iker (only a cancelled order) and Mara (no orders) are gone. This is an inner join.

SELECT c.name, COUNT(o.order_id) AS paid_orders
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'   -- decides which orders PAIR
GROUP  BY c.name ORDER BY c.name;
-- Asha 3 · Bruno 2 · Chen 1 · Dalia 1 · Emeka 2 · Fatou 1 · Iker 0 · Mara 0     (8 rows)

-- the one place WHERE on the right table is correct: testing for the absence of a match
SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE  o.order_id IS NULL;                                    -- Mara: the anti-join (2.3)`,
      caption: "Read `WHERE right_table.column = value` after a LEFT JOIN as 'delete the padded rows', because that is what it does. Only `IS NULL` on the right side belongs there, and that is the anti-join idiom, not a filter."
    },

    { t: "viz",
      title: "The padded row meets the WHERE",
      caption: "After the LEFT JOIN, Iker's row carries a cancelled order and Mara's carries NULLs. A WHERE on status removes both — NULL is not 'paid', and neither is 'cancelled'. In ON, the same test runs while pairing: the customers stay, with no order attached.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Left: rows produced by a LEFT JOIN including Iker with a cancelled order and Mara with NULLs; a WHERE status = paid gate removes both. Right: the same condition applied in ON keeps Iker and Mara with NULL orders.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36" style="fill:var(--crit)">WHERE o.status = 'paid'  — after the join</text>
    <text x="470" y="36" style="fill:var(--good)">… AND o.status = 'paid' in ON — during the join</text>
  </g>
  <g class="s-mono">
    <text x="30" y="70">Asha  | 100 | paid</text><text x="30" y="88">Asha  | 102 | paid</text><text x="30" y="106">…</text>
    <text x="30" y="124" style="fill:var(--crit)">Iker  | 107 | cancelled   ✗ false</text>
    <text x="30" y="142" style="fill:var(--crit)">Mara  | NULL| NULL        ✗ unknown</text>
    <text x="470" y="70">Asha  | 100 | paid</text><text x="470" y="88">Asha  | 102 | paid</text><text x="470" y="106">…</text>
    <text x="470" y="124" style="fill:var(--good)">Iker  | NULL| NULL        kept, no pair</text>
    <text x="470" y="142" style="fill:var(--good)">Mara  | NULL| NULL        kept, no pair</text>
  </g>
  <g stroke-width="1.4">
    <rect x="30" y="172" width="400" height="40" rx="7" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="470" y="172" width="380" height="40" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <text x="230" y="197" class="s-label" text-anchor="middle" style="fill:var(--crit)">6 customers — the outer join was undone</text>
  <text x="660" y="197" class="s-label" text-anchor="middle" style="fill:var(--good)">8 customers — two with COUNT(o.order_id) = 0</text>
  <text x="30" y="250" class="s-sub">The condition is identical. WHERE sees rows that already exist and deletes the NULL-padded ones; ON decides what to pair and pads what it could not.</text>
  <text x="30" y="272" class="s-sub">Inner joins do not care where the condition goes. Outer joins are defined by it.</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Trap 2: COUNT(*) counts the padding", id: "count" },

    { t: "p", text: "After a LEFT JOIN, a customer with no orders still has a row — the padded one. `COUNT(*)` counts rows, so it says 1. **`COUNT(o.order_id)` counts non-null values of a right-hand column, and the padding is NULL**, so it says 0. The same applies to every aggregate: `SUM` over the padded row is NULL rather than 0, which is where `COALESCE(SUM(…), 0)` comes from." },

    { t: "code", lang: "sql", title: "Three counts on the same rows",
      code: `SELECT c.name, COUNT(*) AS n_star, COUNT(o.order_id) AS n_orders, COUNT(o.status) AS n_status
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
GROUP  BY c.name ORDER BY c.name;
-- name  | n_star | n_orders | n_status
-- Asha  | 3      | 3        | 3
-- ...
-- Iker  | 1      | 0        | 0         <- one padded row; no order in it
-- Mara  | 1      | 0        | 0
-- COUNT(*) is "how many rows did the join produce for this customer" -- never less than 1 under LEFT.
-- COUNT(o.order_id) is "how many orders" -- the question the report asked.`,
      caption: "Count a column from the right-hand table — its key, ideally — never the star. A NOT NULL column from the right side is the cleanest, because then a NULL can only mean 'no match'."
    },

    { t: "h2", n: "03", text: "Trap 3: a NULL key matches nothing", id: "nullkey" },

    { t: "p", text: "The join condition `k.category = p.category` is a comparison, and 1.2 applies: when either side is NULL the comparison is unknown and the pair is not made. The gift card's category is NULL, so it matches no row of a category lookup — **even a lookup row whose category is also NULL**, because `NULL = NULL` is unknown too. Under an inner join the gift card disappears; under a left join it survives with a NULL department, which is usually the right answer, and when it is not, the null-safe comparison is the fix." },

    { t: "code", lang: "sql", title: "A lookup that has a NULL row, and the comparison that finds it",
      hl: [7, 13],
      code: `WITH categories(category, dept) AS (
  VALUES ('kitchen', 'home'), ('office', 'work'), ('audio', 'tech'), (NULL, 'unknown')
)
SELECT p.name, p.category, k.dept
FROM   products p LEFT JOIN categories k ON k.category = p.category
ORDER  BY p.product_id;
-- Gift card | NULL | NULL        <- the lookup HAS a NULL row, and it did not match: NULL = NULL is unknown

-- null-safe equality: NULL matches NULL and nothing else
SELECT p.name, p.category, k.dept
FROM   products p LEFT JOIN categories k ON k.category IS NOT DISTINCT FROM p.category
ORDER  BY p.product_id;
-- Gift card | NULL | unknown     <- PostgreSQL, DuckDB, SQLite; MySQL: ON k.category <=> p.category
-- or: ON COALESCE(k.category, '') = COALESCE(p.category, '')  -- portable, and defeats an index on the key (5.4)`,
      caption: "Deciding that NULL should match NULL is a business decision — 'uncategorised is a category' — and the null-safe operator makes it explicit. The silent alternative is worse: an inner join that drops the gift card's revenue from every category report without a trace."
    },

    { t: "h2", n: "04", text: "Trap 4: fan-out", id: "fanout" },

    { t: "p", text: "Join customers to orders, then orders to items, and one row per item is exactly right for summing revenue — until you also count orders, which are now repeated once per item. Add a third join to events and every item row is repeated once per event, **so the revenue is multiplied by the number of events, per customer, by a different factor each.** No total in the result is right, and each is wrong by an amount that looks plausible. This is the chasm trap, and it is the most expensive silent bug in reporting SQL." },

    { t: "code", lang: "sql", title: "Revenue multiplied by the event count",
      hl: [1, 9, 11, 18],
      code: `-- two joins: one row per line item. Revenue is right; COUNT(o.order_id) now counts items.
SELECT c.name, COUNT(o.order_id) AS orders, SUM(oi.qty * oi.unit_price) AS revenue
FROM   customers c
LEFT   JOIN orders o       ON o.customer_id = c.customer_id AND o.status = 'paid'
LEFT   JOIN order_items oi ON oi.order_id = o.order_id
GROUP  BY c.name ORDER BY c.name;
-- Asha 6 234.50 · Bruno 2 112.50 · Chen 1 32.00 · Dalia 2 139.00 · Emeka 5 137.90 ...   <- Asha has 3 orders, not 6

-- three joins: every item row repeated per event. Nothing is right any more.
SELECT c.name, COUNT(DISTINCT o.order_id) AS orders, COUNT(DISTINCT e.event_id) AS events, SUM(oi.qty * oi.unit_price) AS revenue_wrong
FROM   customers c
LEFT   JOIN orders o       ON o.customer_id = c.customer_id AND o.status = 'paid'
LEFT   JOIN order_items oi ON oi.order_id = o.order_id
LEFT   JOIN events e       ON e.customer_id = c.customer_id
GROUP  BY c.name ORDER BY c.name;
-- Asha  | 3 | 5 | 1172.50      <- 234.50 x 5 events
-- Bruno | 2 | 3 |  337.50      <- 112.50 x 3
-- Chen  | 1 | 3 |   96.00      <- 32.00 x 3
-- Dalia | 1 | 0 |  139.00      <- no events, so no multiplication: right by accident`,
      caption: "COUNT(DISTINCT …) rescues the counts but nothing rescues the SUM: once the rows are multiplied, the amounts are duplicated and no aggregate can tell a duplicate from a real second item. The fix is to never let the multiplication happen."
    },

    { t: "code", lang: "sql", title: "Aggregate each child to one row per parent, then join",
      hl: [3, 4, 5, 6, 7, 8],
      code: `SELECT c.name, COALESCE(r.orders, 0) AS orders, COALESCE(r.revenue, 0) AS revenue, COALESCE(ev.events, 0) AS events
FROM   customers c
LEFT   JOIN (SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS orders, SUM(oi.qty * oi.unit_price) AS revenue
             FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
             WHERE  o.status = 'paid'                       -- an inner join inside: WHERE is fine here
             GROUP  BY o.customer_id) r  ON r.customer_id = c.customer_id
LEFT   JOIN (SELECT customer_id, COUNT(*) AS events
             FROM   events GROUP BY customer_id) ev         ON ev.customer_id = c.customer_id
ORDER  BY c.name;
-- name  | orders | revenue | events
-- Asha  | 3      | 234.50  | 5
-- Bruno | 2      | 112.50  | 3
-- Chen  | 1      | 32.00   | 3
-- Dalia | 1      | 139.00  | 0
-- Emeka | 2      | 137.90  | 3
-- Fatou | 1      | 42.00   | 1
-- Iker  | 0      | 0.00    | 0
-- Mara  | 0      | 0.00    | 3
-- each subquery is one row per customer, so the joins are 1:1 and nothing multiplies`,
      caption: "Each one-to-many relationship is collapsed to one row per parent *before* the parents are joined together. The outer query joins 1:1 and cannot fan out. 4.2 writes the same thing with CTEs, which read better; the structure is what matters."
    },

    { t: "table",
      head: ["Trap", "Signature in the query", "Symptom", "Fix"],
      rows: [
        ["WHERE on the right table", "`LEFT JOIN t … WHERE t.col = …`", "Fewer rows than the left table; the childless parents vanish", "Move the condition into ON"],
        ["COUNT(*) after LEFT JOIN", "`LEFT JOIN … COUNT(*)`", "Childless parents count 1", "`COUNT(right_key)`; `COALESCE(SUM(…), 0)`"],
        ["NULL join key", "A nullable column in ON", "Rows unmatched with no error; inner join drops them", "`IS NOT DISTINCT FROM`, or decide NULL should not match and use LEFT"],
        ["Fan-out (chasm trap)", "Two `JOIN`s to different children of one parent", "Sums inflated by a per-row factor; counts fixed by DISTINCT, sums not", "Aggregate each child per parent in a subquery, then join 1:1"],
        ["Fan-out (chain)", "`parent JOIN child JOIN grandchild`", "Child-level counts multiplied by grandchildren", "`COUNT(DISTINCT child_key)`, or aggregate the grandchild first"]
      ]
    },

    { t: "callout", kind: "production", title: "The reconciliation test", body: [
      { t: "p", text: "Every report that joins should ship with one check: **the total over the joined result equals the total over the base table.** `SELECT SUM(qty * unit_price) FROM order_items WHERE order_id IN (paid orders)` is 697.90; if the per-customer report sums to anything else, a join multiplied or a WHERE deleted. It is one query, it costs nothing, and it catches all four traps." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Four broken reports",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Each query below was written for the intent in its comment and returns a wrong result. Name the trap, predict the wrong output, fix the query, and confirm the fixed output. For the fourth, also write the reconciliation check." },
        { t: "code", lang: "sql", code: `-- R1  every product with its number of paid line items (0 for unsold)
SELECT p.name, COUNT(*) AS paid_items
FROM   products p LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT   JOIN orders o ON o.order_id = oi.order_id
WHERE  o.status = 'paid'
GROUP  BY p.name;

-- R2  every customer with their event count
SELECT c.name, COUNT(*) AS events
FROM   customers c LEFT JOIN events e ON e.customer_id = c.customer_id
GROUP  BY c.name;

-- R3  every product with its department, from a lookup that includes an 'unknown' row for NULL
WITH categories(category, dept) AS (VALUES ('kitchen','home'), ('office','work'), ('audio','tech'), (NULL,'unknown'))
SELECT p.name, k.dept FROM products p JOIN categories k ON k.category = p.category;

-- R4  revenue and event count per customer
SELECT c.name, SUM(oi.qty * oi.unit_price) AS revenue, COUNT(DISTINCT e.event_id) AS events
FROM   customers c
JOIN   orders o       ON o.customer_id = c.customer_id AND o.status = 'paid'
JOIN   order_items oi ON oi.order_id = o.order_id
LEFT   JOIN events e  ON e.customer_id = c.customer_id
GROUP  BY c.name;` }
      ],
      requirements: [
        "The trap named for each of R1–R4.",
        "Fixed queries and their verified output.",
        "A reconciliation query for R4 showing the per-customer revenues sum to the paid line-item total."
      ],
      hint: "R1: the WHERE undoes both LEFT JOINs; the Toaster's refunded item and the Kettle's cancelled one should simply not count. R2: Dalia and Iker have no events. R3: the gift card. R4: events multiply items.",
      solution: {
        lang: "sql",
        title: "reports_fixed.sql",
        code: `-- R1: trap 1 (WHERE on the right) + trap 2 (COUNT(*)). Unsold products would vanish; padded rows count 1.
SELECT p.name, COUNT(o.order_id) AS paid_items
FROM   products p
LEFT   JOIN order_items oi ON oi.product_id = p.product_id
LEFT   JOIN orders o       ON o.order_id = oi.order_id AND o.status = 'paid'
GROUP  BY p.name ORDER BY p.name;
-- Desk lamp 4 · Gift card 2 · Headphones 3 · Kettle 3 · Notebook 4 · Toaster 1
-- (the Toaster's refunded item and the Kettle's cancelled one are excluded but the products stay)

-- R2: trap 2. Dalia and Iker show 1 instead of 0.
SELECT c.name, COUNT(e.event_id) AS events
FROM   customers c LEFT JOIN events e ON e.customer_id = c.customer_id
GROUP  BY c.name ORDER BY c.name;
-- Asha 5 · Bruno 3 · Chen 3 · Dalia 0 · Emeka 3 · Fatou 1 · Iker 0 · Mara 3

-- R3: trap 3. The gift card's NULL never equals the lookup's NULL, and the inner join drops it: 5 rows.
WITH categories(category, dept) AS (VALUES ('kitchen','home'), ('office','work'), ('audio','tech'), (NULL,'unknown'))
SELECT p.name, k.dept FROM products p JOIN categories k ON k.category IS NOT DISTINCT FROM p.category ORDER BY p.product_id;
-- ... Gift card | unknown      (6 rows)

-- R4: trap 4. Every item row is repeated per event; Asha's revenue is 1172.50.
SELECT c.name, COALESCE(r.revenue, 0) AS revenue, COALESCE(ev.events, 0) AS events
FROM   customers c
LEFT   JOIN (SELECT o.customer_id, SUM(oi.qty * oi.unit_price) AS revenue
             FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
             WHERE o.status = 'paid' GROUP BY o.customer_id) r ON r.customer_id = c.customer_id
LEFT   JOIN (SELECT customer_id, COUNT(*) AS events FROM events GROUP BY customer_id) ev ON ev.customer_id = c.customer_id
ORDER  BY c.name;
-- Asha 234.50 5 · Bruno 112.50 3 · Chen 32.00 3 · Dalia 139.00 0 · Emeka 137.90 3 · Fatou 42.00 1 · Iker 0 0 · Mara 0 3

-- reconciliation: the report's revenue column must sum to the base total
SELECT SUM(oi.qty * oi.unit_price) FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'paid';
-- 697.90   = 234.50 + 112.50 + 32.00 + 139.00 + 137.90 + 42.00`,
        notes: [
          { t: "p", text: "**R1 had two traps stacked**, which is typical: the WHERE turned both outer joins inner, and COUNT(*) would have counted the padding had the WHERE not deleted it first. Fixing only one of them produces a different wrong answer." },
          { t: "p", text: "**R4's wrong numbers were plausible** — 1172.50 is a number a customer could have spent — which is why the reconciliation query exists. 697.90 from the base table is the invariant; any join that changes it multiplied or deleted rows." },
          { t: "p", text: "**R3 is the only one where the fix is a decision rather than a correction**: whether NULL should match the 'unknown' row. `IS NOT DISTINCT FROM` says yes explicitly. An inner join with `=` says no silently, which is the wrong way to say either." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT c.name, COUNT(*) FROM customers c LEFT JOIN orders o ON … WHERE o.status = 'paid' GROUP BY c.name` returns six customers of eight. Which two are missing and why?",
          options: [
            "The two with the most orders — LIMIT",
            "Mara (no orders) and Iker (only a cancelled order): the WHERE runs after the join, and NULL or 'cancelled' is not 'paid', so their preserved rows are deleted — the LEFT JOIN has become inner",
            "Two rows with NULL names",
            "None are missing; COUNT(*) hides them"
          ],
          answer: 1,
          why: "A condition on the right-hand table in WHERE filters the join's output, padding included. In ON it decides which orders pair with each customer, and the customers with no qualifying orders stay, with a count of zero when you COUNT(o.order_id)."
        }
      ]
    }
  ],

  takeaways: [
    "**A WHERE on the right-hand table after a LEFT JOIN deletes the padded rows** — the outer join becomes inner. The condition belongs in ON.",
    "**The one right-table condition that belongs in WHERE is `IS NULL`**: that is the anti-join, not a filter.",
    "**COUNT(*) counts the padding.** After an outer join, count a column from the right-hand table, and COALESCE the sums.",
    "**A NULL key matches nothing, including another NULL.** `IS NOT DISTINCT FROM` matches NULL to NULL when that is what you mean.",
    "**Two one-to-many joins from the same parent multiply**; every SUM is inflated by a per-row factor and COUNT(DISTINCT) rescues only the counts.",
    "**Aggregate each child to one row per parent, then join 1:1** — fan-out cannot happen when nothing is many.",
    "**Inner joins do not care where the condition goes; outer joins are defined by it.**",
    "**Plausible wrong totals are the signature of fan-out** — nothing errors, and every number is in a believable range.",
    "**Ship a reconciliation query with every joined report**: the base-table total is the invariant a join must not change.",
    "**Stacked traps are normal**: a WHERE that hides a COUNT(*) problem, a fan-out that hides a NULL key. Fix one and re-check, rather than assuming the result is now right."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "After `customers LEFT JOIN orders`, which aggregate gives 0 for a customer with no orders?",
        options: [
          "`COUNT(*)`",
          "`COUNT(o.order_id)` — it counts non-null values, and the padded row's order_id is NULL",
          "`COUNT(c.customer_id)`",
          "`SUM(1)`"
        ],
        answer: 1,
        why: "COUNT(*) and COUNT(c.customer_id) both count the padded row, because the row exists and the left key is not null. Only a right-hand column is NULL in the padding."
      },
      {
        stem: "A join to a lookup table drops rows whose lookup key is NULL, even though the lookup contains a NULL row. Why?",
        options: [
          "The lookup is unindexed",
          "The ON clause uses `=`, and `NULL = NULL` is unknown; use `IS NOT DISTINCT FROM` (or MySQL's `<=>`) to match NULL to NULL",
          "NULL rows cannot be stored in lookups",
          "The join needs DISTINCT"
        ],
        answer: 1,
        why: "A join condition is a comparison under three-valued logic. NULL equals nothing. The null-safe operator is the explicit, and only, way to say NULL should match."
      },
      {
        stem: "A per-customer report joins orders, order_items and events and sums item amounts. The total across customers is more than three times the paid revenue. What happened?",
        options: [
          "Prices were updated",
          "Fan-out: each item row was repeated once per event of the same customer, so the sum was multiplied by each customer's event count; aggregate items and events separately, then join",
          "Some events are duplicates",
          "The SUM included refunded orders"
        ],
        answer: 1,
        why: "Two one-to-many relationships from customers joined together produce the product of their counts per customer. The inflation factor differs per customer, so no single division corrects it — the structure must change."
      },
      {
        stem: "Why does `COUNT(DISTINCT order_id)` fix the count but not the revenue in a fanned-out join?",
        options: [
          "DISTINCT is not allowed with SUM",
          "DISTINCT collapses repeated keys, but a repeated amount is indistinguishable from a genuine second item of the same amount, so SUM cannot know which rows are duplicates",
          "SUM(DISTINCT amount) would fix it",
          "Revenue is a float"
        ],
        answer: 1,
        why: "SUM(DISTINCT amount) would also drop real duplicates — two items that happen to cost the same. Once rows are multiplied, the information needed to undo it is gone; prevent the multiplication instead."
      },
      {
        stem: "Which single check catches all four outer-join traps in a joined report?",
        options: [
          "Running EXPLAIN",
          "Comparing the report's total to the same total computed on the base table alone — a join must not change a base-table invariant",
          "Adding LIMIT 10 and eyeballing",
          "Checking for NULLs in the output"
        ],
        answer: 1,
        why: "A WHERE that deleted rows lowers the total; a fan-out raises it; a NULL key drops rows; COUNT(*) changes counts. All of them move the reconciliation number away from the base-table figure."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between putting a condition in ON and in WHERE?",
        strong: "For an inner join, nothing — the planner treats them the same. For an outer join, everything. ON decides which rows pair; a preserved-side row with no qualifying pair is kept and padded with NULLs. WHERE runs on the join's output, so a condition on the non-preserved side sees NULL in the padded rows, evaluates to unknown, and deletes them — the LEFT JOIN becomes an INNER JOIN. So a filter on the right-hand table goes in ON, and the one exception is IS NULL on the right side in WHERE, which is the anti-join idiom.",
        answer: [
          { t: "p", text: "Saying 'for an inner join, nothing' first shows the candidate understands why the rule exists rather than just repeating it." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague's per-customer revenue report sums to more than total revenue. Walk me through the diagnosis.",
        strong: "A sum that exceeds the base total means rows were multiplied, which means a join fanned out. I look for two one-to-many joins from the same parent — orders and events off customers, say — or a chain where an aggregate is over a finer grain than it names. The tell is that COUNT(DISTINCT key) is right while SUM is wrong: DISTINCT can collapse keys but cannot tell a duplicated amount from a real one. The fix is structural: aggregate each child to one row per customer in its own subquery or CTE, then join the one-row-per-customer results, so nothing is many at the point of joining. And I add the reconciliation query to the report so the next fan-out is caught.",
        answer: [
          { t: "p", text: "'Sum exceeds the base total means multiplication' is the deductive step; the DISTINCT-versus-SUM tell is the confirmation." }
        ]
      },
      {
        level: "advanced",
        q: "How do you join on a column that can be NULL, and should you?",
        strong: "Under standard equality a NULL key matches nothing — not even another NULL — so rows with NULL keys are unmatched: dropped by an inner join, padded by an outer one. Whether that is right is a data question. If NULL means 'no category', an outer join leaving the department NULL is the honest answer. If the lookup has an explicit row for the unknown case, I want NULL to match it, and I say so with IS NOT DISTINCT FROM, or MySQL's spaceship operator. The COALESCE-both-sides trick is portable but puts a function on the key and loses the index; and I would rather fix the schema — a NOT NULL key with an 'unknown' value — than rely on any of them.",
        answer: [
          { t: "p", text: "Framing it as a decision with three spellings and a schema alternative, rather than a trick, is the mature answer." }
        ]
      }
    ]
  }
});

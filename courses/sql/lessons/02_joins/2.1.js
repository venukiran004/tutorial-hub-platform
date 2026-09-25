/* ============================================================================
   LESSON 2.1 — Joins as Row Multiplication
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**A join pairs every row of one table with every row of another and keeps the pairs that satisfy the condition.** That is the whole definition; INNER, LEFT, RIGHT and FULL differ only in what happens to the rows that found no pair. Once you picture a join as multiplication followed by a filter, the row count of any query becomes something you can compute before running it — and the wrong totals of the next lesson stop being mysterious.",

  objectives: [
    "Define a join as a cross product plus a filter and derive INNER, LEFT, RIGHT, FULL and CROSS from that definition",
    "Predict the row count of a join from the cardinality of the key on each side",
    "Write joins on multiple columns, with extra conditions in ON, and with non-equality predicates",
    "Choose between ON, USING and NATURAL, and know why NATURAL is a trap"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Cross product, then filter", id: "cross" },

    { t: "p", text: "`FROM customers CROSS JOIN products` produces 8 × 6 = 48 rows: every customer next to every product. Every other join is that product with a condition applied. `FROM customers c JOIN orders o ON o.customer_id = c.customer_id` conceptually forms 8 × 12 = 96 pairs and keeps the 12 where the ids agree. **The engine never builds the 96** — it uses a hash or an index (5.2) — but the result is defined as if it had, which is what lets you reason about it." },

    { t: "code", lang: "sql", title: "The product, the filter, and the old syntax that shows they are the same thing",
      hl: [1, 3, 6],
      code: `SELECT COUNT(*) FROM customers CROSS JOIN products;                                       -- 48 = 8 x 6

SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.customer_id;          -- 12: the pairs whose ids agree

-- the pre-1992 spelling makes the definition visible: a product in FROM, a filter in WHERE
SELECT COUNT(*) FROM customers c, orders o WHERE c.customer_id = o.customer_id;          -- 12, the same rows
-- write the modern form: the condition sits next to the tables it relates, and an outer join
-- cannot be expressed in the old syntax at all`,
      caption: "Twelve orders, each with exactly one customer, so twelve rows: an inner join on a foreign key returns one row per child row. That sentence is the whole art of predicting join counts — find the side that is 'many', and the answer is its row count, minus the orphans."
    },

    { t: "dl", items: [
      ["INNER JOIN", "Keeps the pairs that satisfy ON. Rows on either side with no partner disappear. The default when you write just `JOIN`."],
      ["LEFT (OUTER) JOIN", "Every row of the left table appears at least once; a left row with no partner is paired with a row of NULLs. The right table's unmatched rows disappear."],
      ["RIGHT (OUTER) JOIN", "The mirror. Rarely written — swap the tables and use LEFT, so that the preserved table is always the one you read first."],
      ["FULL (OUTER) JOIN", "Every row of both tables appears at least once; unmatched rows on either side are padded with NULLs. The join for reconciling two lists."],
      ["CROSS JOIN", "Every pair, no condition. n × m rows. Useful on purpose for generating combinations — every customer × every month — and a disaster by accident."],
      ["Semi / anti join", "Keep left rows that have (do not have) a match, without duplicating them and without the right table's columns: EXISTS and NOT EXISTS (2.3)."]
    ]},

    { t: "viz",
      title: "What each join keeps",
      caption: "Customers on the left, orders on the right. The matched region is the same for every join type; the types differ only in whether they keep the unmatched customer (Mara) and would keep an unmatched order (none exist here, because of the foreign key).",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Four small diagrams of two overlapping sets, customers and orders, with the region kept shaded for INNER, LEFT, RIGHT and FULL joins, and row counts 12, 13, 12 and 13.">
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="120" y="40">INNER · 12</text><text x="340" y="40">LEFT · 13</text><text x="560" y="40">RIGHT · 12</text><text x="780" y="40">FULL · 13</text>
  </g>
  <!-- INNER -->
  <g>
    <clipPath id="j-in-21"><circle cx="150" cy="150" r="70"/></clipPath>
    <circle cx="90" cy="150" r="70" style="fill:none;stroke:var(--ink-3)" stroke-width="1.4"/>
    <circle cx="150" cy="150" r="70" style="fill:none;stroke:var(--ink-3)" stroke-width="1.4"/>
    <circle cx="90" cy="150" r="70" clip-path="url(#j-in-21)" style="fill:var(--accent);fill-opacity:.45"/>
  </g>
  <!-- LEFT -->
  <g>
    <circle cx="310" cy="150" r="70" style="fill:var(--accent);fill-opacity:.45;stroke:var(--ink-3)" stroke-width="1.4"/>
    <circle cx="370" cy="150" r="70" style="fill:none;stroke:var(--ink-3)" stroke-width="1.4"/>
  </g>
  <!-- RIGHT -->
  <g>
    <circle cx="530" cy="150" r="70" style="fill:none;stroke:var(--ink-3)" stroke-width="1.4"/>
    <circle cx="590" cy="150" r="70" style="fill:var(--accent);fill-opacity:.45;stroke:var(--ink-3)" stroke-width="1.4"/>
  </g>
  <!-- FULL -->
  <g>
    <circle cx="750" cy="150" r="70" style="fill:var(--accent);fill-opacity:.45;stroke:var(--ink-3)" stroke-width="1.4"/>
    <circle cx="810" cy="150" r="70" style="fill:var(--accent);fill-opacity:.45;stroke:var(--ink-3)" stroke-width="1.4"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="60" y="246">customers</text><text x="180" y="246">orders</text>
    <text x="280" y="246">customers</text><text x="400" y="246">orders</text>
    <text x="500" y="246">customers</text><text x="620" y="246">orders</text>
    <text x="720" y="246">customers</text><text x="840" y="246">orders</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="276">matched pairs only</text>
    <text x="340" y="276">+ Mara with NULL order</text>
    <text x="560" y="276">+ orphan orders (none)</text>
    <text x="780" y="276">+ both unmatched sides</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "Predicting the row count", id: "count" },

    { t: "p", text: "For a join on a key, the row count is decided by how many partners each row has. **Each left row contributes as many output rows as it has matches — and, in an outer join, one row if it has none.** A parent joined to its children returns one row per child; a child joined to its parent returns one row per child; two children of the same parent joined to each other return the product of their counts per parent, which is the fan-out that 2.2 is about." },

    { t: "code", lang: "sql", title: "Three joins, three counts, all predictable from the keys",
      hl: [1, 5, 12],
      code: `SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id;      -- 13
-- 12 orders (one row each) + Mara (one row, NULL order). A LEFT JOIN never returns fewer rows than the left table.

-- reconciling two lists: who ordered, who clicked, and the difference between them
SELECT COALESCE(o.customer_id, e.customer_id) AS customer_id, o.customer_id AS ordered, e.customer_id AS clicked
FROM   (SELECT DISTINCT customer_id FROM orders) o
FULL   JOIN (SELECT DISTINCT customer_id FROM events) e ON e.customer_id = o.customer_id
ORDER  BY 1;
-- 1 1 1 · 2 2 2 · 3 3 3 · 4 4 NULL · 5 5 5 · 6 6 6 · 7 7 NULL · 8 NULL 8        (8 rows)
-- Dalia (4) and Iker (7) ordered without clicking; Mara (8) clicked without ordering. COALESCE picks whichever side exists.

SELECT c.name, COUNT(*) AS rows_after_join
FROM   customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_items oi ON oi.order_id = o.order_id
GROUP  BY c.name ORDER BY c.name;
-- Asha 6 · Bruno 2 · Chen 2 · Dalia 2 · Emeka 5 · Fatou 1 · Iker 1                 (19 rows in total: one per LINE ITEM)
-- the second join multiplied each order by its items. COUNT(*) now counts items, not orders (2.2).`,
      caption: "Each join step multiplies by the number of partners. Customer → orders → items gives one row per item; the customer's name is repeated on every one of them. The moment you write a second `JOIN`, ask which side is the many side — the answer is what every COUNT and SUM after it will actually be counting."
    },

    { t: "table",
      head: ["Relationship", "Join", "Rows returned", "Example"],
      rows: [
        ["Child → parent (FK to PK)", "INNER", "= child rows minus orphans", "orders → customers: 12"],
        ["Parent → child", "INNER", "= child rows minus orphans", "customers → orders: 12"],
        ["Parent → child", "LEFT from parent", "= child rows + parents with no child", "customers → orders: 13"],
        ["Child → grandchild", "INNER", "= grandchild rows", "orders → items: 19"],
        ["Two children of one parent", "any", "Σ over parents of (n₁ × n₂)", "orders × events per customer: fan-out (2.2)"],
        ["No condition", "CROSS", "n × m", "customers × products: 48"]
      ]
    },

    { t: "h2", n: "03", text: "The ON clause: more than equality", id: "on" },

    { t: "p", text: "The condition can be anything that evaluates per pair. Two columns, for a composite key. An equality *and* a filter, so the filter is applied while pairing rather than afterwards — the distinction that decides whether an outer join stays outer (2.2). Or no equality at all: **a range join pairs each order with the events in the hour before it**, which is a question no equality can ask." },

    { t: "code", lang: "sql", title: "Composite keys, extra conditions, and a join on a range",
      hl: [2, 8, 14],
      code: `-- composite key: the line item's identity is (order_id, product_id)
SELECT * FROM order_items a JOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id;   -- pairs of items in the same order

-- USING: the same as ON a.customer_id = b.customer_id, and the column appears once in SELECT *
SELECT c.name, o.order_id FROM customers c JOIN orders o USING (customer_id) WHERE c.customer_id = 1;     -- Asha 100, 102, 108

-- NATURAL JOIN: joins on EVERY column with the same name. Never write it: the day someone adds a
-- 'status' or 'name' column to the second table, the join silently changes.

-- a range join: events in the hour before each order, for the same customer
SELECT o.order_id, e.event_id, e.event_type, e.occurred_at
FROM   orders o
JOIN   events e ON e.customer_id = o.customer_id
               AND e.occurred_at >= o.placed_at - INTERVAL '1 hour'
               AND e.occurred_at <  o.placed_at
ORDER  BY o.order_id, e.occurred_at;
-- 108 | 1  | view | 2025-03-15 13:02:00       108 | 2  | view | 13:09       108 | 3  | cart | 13:20
-- 110 | 9  | view | 2025-03-27 17:00:00       110 | 10 | cart | 17:10
-- 111 | 12 | view | 2025-04-04 11:40:00       111 | 13 | view | 11:52                    (7 rows)`,
      caption: "The range join is the SQL form of the as-of feature from Data Handling 7.8: every event that precedes the order within a window, and nothing after it. Range joins cannot use a hash (there is no equality to hash on) — the equality on `customer_id` is what keeps this one fast, because the range is only checked within a customer's events."
    },

    { t: "callout", kind: "mental", title: "Say the many side out loud", body: [
      { t: "p", text: "Before adding a join, say which table is the many side of the relationship and what one output row will represent afterwards — 'one row per order', 'one row per line item', 'one row per (order, event) pair'. **Every aggregate you write after the join is over that unit.** If the unit is not the thing you want to count, the join belongs in a subquery that aggregates first (2.2) or in an EXISTS that does not multiply (2.3)." }
    ]},

    { t: "ladder",
      title: "Listing customers with their order count",
      rungs: [
        { level: "bad", label: "Inner join, then count", code: `SELECT c.name, COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name;`,
          note: "**Seven rows.** Mara has no orders, so she has no pair, so she is not in the result. A 'customers with their count' report that omits a customer is wrong, not incomplete." },
        { level: "ok", label: "Left join, then count", code: `SELECT c.name, COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name;`,
          note: "**Eight rows, and Mara's count is 1.** The NULL-padded row is still a row, and COUNT(*) counts rows." },
        { level: "best", label: "Left join, count the right-hand key", code: `SELECT c.name, COUNT(o.order_id) AS n_orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name;`,
          note: "**Eight rows, Mara's count is 0.** COUNT(column) skips the NULL that the outer join padded in. This pair — LEFT JOIN plus COUNT of the right key — is the pattern; 2.2 is about the ways it gets broken." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Predict",
      title: "Row counts before running",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "Predict the number of rows each query returns, from the cardinalities in the shop, and write the unit that one output row represents. Then run them." },
        { t: "code", lang: "sql", code: `-- J1
SELECT * FROM products p JOIN order_items oi ON oi.product_id = p.product_id;
-- J2
SELECT * FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id;
-- J3
SELECT * FROM customers c LEFT JOIN events e ON e.customer_id = c.customer_id;
-- J4
SELECT * FROM orders o JOIN events e ON e.customer_id = o.customer_id;
-- J5
SELECT * FROM employees e LEFT JOIN employees m ON m.employee_id = e.manager_id;
-- J6
SELECT * FROM customers c CROSS JOIN (SELECT DISTINCT status FROM orders) s;` }
      ],
      requirements: [
        "Six predicted counts with the unit of one output row.",
        "For J4, the per-customer arithmetic that produces the total.",
        "The verified counts."
      ],
      hint: "J1 and J2 differ only if some product has never been sold — check order_items. J4 is two children of customers joined to each other: multiply per customer and add. J5 is a self join on a hierarchy with one root.",
      solution: {
        lang: "sql",
        title: "join_counts.sql",
        code: `-- J1: 19 -- one row per line item; every product has been sold at least once, so no product is lost.
-- J2: 19 -- the same: LEFT only adds rows for products with no items, and there are none.
-- J3: 20 -- one row per event (18) + one row each for Dalia and Iker, who have no events.
-- J4: orders x events per customer: Asha 3x5=15, Bruno 2x3=6, Chen 2x3=6, Emeka 2x3=6, Fatou 1x1=1,
--     Dalia 1x0=0, Iker 1x0=0, Mara 0x3=0  ->  34 rows, one per (order, event) pair. Mostly meaningless pairs.
-- J5: 10 -- one row per employee; Nadia's manager side is NULL. A LEFT self-join keeps the root.
-- J6: 24 -- 8 customers x 3 statuses. Every combination, whether or not it occurred.

SELECT COUNT(*) FROM products p JOIN order_items oi ON oi.product_id = p.product_id;          -- 19
SELECT COUNT(*) FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id;     -- 19
SELECT COUNT(*) FROM customers c LEFT JOIN events e ON e.customer_id = c.customer_id;         -- 20
SELECT COUNT(*) FROM orders o JOIN events e ON e.customer_id = o.customer_id;                 -- 34
SELECT COUNT(*) FROM employees e LEFT JOIN employees m ON m.employee_id = e.manager_id;       -- 10
SELECT COUNT(*) FROM customers c CROSS JOIN (SELECT DISTINCT status FROM orders) s;           -- 24`,
        notes: [
          { t: "p", text: "**J4 is the one to remember.** Orders and events are both children of customers; joining them to each other produces every order paired with every event of the same customer — 34 rows of which almost none mean anything. Any SUM over that result is multiplied by a different factor per customer. 2.2 shows the damage and the fix." },
          { t: "p", text: "**J3 and J5 show what LEFT adds**: exactly the left rows with no partner, once each. If you know how many left rows have no match, you know the LEFT count from the INNER count." },
          { t: "p", text: "**J6 is a CROSS JOIN used on purpose** — the grid of every customer against every status is exactly what a report needs before filling in the counts, most of which will be zero (1.5's spine idea, applied to a category instead of time)." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`customers` has 8 rows, `orders` has 12, every order has exactly one customer, and one customer has no orders. How many rows does `customers LEFT JOIN orders` return?",
          options: [
            "8",
            "12",
            "13 — one per order, plus one NULL-padded row for the customer with no orders",
            "96"
          ],
          answer: 2,
          why: "Each customer contributes as many rows as they have orders, and one row if they have none. 12 order rows plus Mara's single padded row."
        }
      ]
    }
  ],

  takeaways: [
    "**A join is a cross product followed by a filter.** INNER, LEFT, RIGHT and FULL differ only in what they do with rows that found no pair.",
    "**Each left row contributes one output row per match — and one row if it has none, under an outer join.** That sentence predicts every join count.",
    "**A LEFT JOIN never returns fewer rows than its left table**; an INNER JOIN can return anything from zero to n × m.",
    "**Two children of one parent joined to each other multiply**: the count per parent is n₁ × n₂, and every SUM afterwards is inflated.",
    "**Say the unit of one output row after every join** — per order, per item, per (order, event) pair — because every aggregate is over that unit.",
    "**RIGHT JOIN is LEFT JOIN with the tables swapped**; write LEFT so the preserved table is the one you read first.",
    "**FULL JOIN reconciles two lists** — matched, left-only, right-only in one result — with COALESCE to pick the key.",
    "**ON can hold more than equality**: composite keys, extra filters, and range conditions that pair rows by time.",
    "**USING is ON for same-named columns; NATURAL joins on every same-named column and silently changes when the schema does.**",
    "**LEFT JOIN plus COUNT(right_key) is the report pattern**: every parent present, zero for the childless."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `customers CROSS JOIN products` 48 rows but `customers JOIN products ON …` impossible to write usefully?",
        options: [
          "CROSS JOIN is faster",
          "There is no column relating a customer directly to a product; the relationship goes through orders and items, so a direct join has no meaningful condition — only the unconditional product exists",
          "CROSS JOIN ignores NULLs",
          "Products cannot be joined"
        ],
        answer: 1,
        why: "A join condition expresses a relationship. Customers and products are related only via orders and order_items; joining them directly is either every pair or nothing."
      },
      {
        stem: "A report joins customers to orders and to events and sums order amounts per customer. Asha's total is five times too large. Why?",
        options: [
          "Her orders are duplicated in the table",
          "Orders and events are both one-to-many from customers; joining both multiplies each order by the number of events, so the sum is inflated by the event count — aggregate each child separately before combining",
          "The events table has NULL amounts",
          "SUM ignores the join"
        ],
        answer: 1,
        why: "Asha has 3 orders and 5 events, so the join produces 15 rows and each order's amount appears five times. Pre-aggregate orders and events in their own subqueries, then join the two one-row-per-customer results."
      },
      {
        stem: "What is the risk of `NATURAL JOIN`?",
        options: [
          "It is slower than ON",
          "It joins on every column with the same name in both tables, so adding a same-named column later — status, name, created_at — silently changes the join condition and the result",
          "It only works on primary keys",
          "It cannot be used with LEFT"
        ],
        answer: 1,
        why: "The join condition is inferred from the schema at execution time, not written in the query. USING names the columns explicitly and gets the same tidy output without the fragility."
      },
      {
        stem: "Which join returns customers who never ordered and orders whose customer row is missing, in one result?",
        options: [
          "INNER JOIN",
          "LEFT JOIN",
          "FULL OUTER JOIN — every row of both sides appears, unmatched ones padded with NULLs",
          "CROSS JOIN"
        ],
        answer: 2,
        why: "LEFT keeps only the left side's unmatched rows; FULL keeps both. It is the join for reconciling two sources — COALESCE(a.key, b.key) gives the key column, and IS NULL on either side classifies the row."
      },
      {
        stem: "A join pairs each order with events of the same customer in the hour before it. Which part of the ON clause keeps it fast?",
        options: [
          "The INTERVAL arithmetic",
          "The equality on customer_id — the engine can hash or index on it, and the range condition is then checked only within one customer's events",
          "The ORDER BY",
          "Nothing; range joins are always slow"
        ],
        answer: 1,
        why: "Hash joins need an equality. A pure range join compares every order with every event; the equality restricts the range check to matching customers, which is where the cost goes from n × m to roughly n."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain the difference between INNER and LEFT JOIN. When would you use each?",
        strong: "Both pair rows that satisfy the ON condition. INNER keeps only the pairs, so a row on either side with no partner is gone. LEFT keeps every row of the left table, pairing the unmatched ones with NULLs. I use INNER when the relationship is required — an order must have a customer — and LEFT when the left entity is the subject of the report and must appear whether or not it has children: customers with their order counts, days with their revenue. The two traps with LEFT are filtering the right table in WHERE, which turns it back into INNER, and COUNT(*) counting the NULL-padded row as one.",
        answer: [
          { t: "p", text: "Naming the two LEFT JOIN traps unprompted is what shows the candidate has written these for real." }
        ]
      },
      {
        level: "core",
        q: "How many rows does a join return, and how do you predict it?",
        strong: "Each left row contributes one row per match, and one row if it has none under an outer join. So a child joined to its parent on a foreign key returns the child count; a parent joined to its children returns the child count plus, for LEFT, the childless parents; two children of the same parent joined together return the product of their counts per parent, summed. Before adding a join I say which side is the many side and what one output row now represents, because every COUNT and SUM after the join is over that unit.",
        answer: [
          { t: "p", text: "The per-parent product rule for two children is the part most candidates miss — and the cause of most inflated totals." }
        ]
      },
      {
        level: "advanced",
        q: "When would you write a join whose condition is not an equality, and what does it cost?",
        strong: "When the relationship is a range rather than a key — events in the hour before an order, a price valid between two dates, a reading within a tolerance. The condition is a comparison or a BETWEEN in ON. The cost is that hash joins need an equality to hash on, so a pure range join has to compare every pair — nested loops, n times m. The fix is to keep an equality alongside the range, like the customer id, so the range is only evaluated within each equality group, or to use a merge join on sorted inputs, or LATERAL with a LIMIT for the as-of case where only the latest match is wanted.",
        answer: [
          { t: "p", text: "Knowing why hash joins need an equality, and how to give them one, is the practical depth here." }
        ]
      }
    ]
  }
});

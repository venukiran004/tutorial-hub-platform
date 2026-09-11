/* ============================================================================
   LESSON 5.5 — SQL: The Queries a Pipeline Is Built On
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "**SQL is executed in a different order from the one you write it in, `NULL` is not a value, and a `JOIN` produces one row per matching pair.** Every extract that feeds a pandas pipeline is shaped by those three facts, and every silent under-count or duplicated total can be traced to one of them.",

  objectives: [
    "State the logical execution order of a SELECT and use it to predict what a clause can see",
    "Choose the join type from the rows you need to keep, and predict the row count from key cardinality",
    "Reason correctly about `NULL` in comparisons, aggregates, `IN` and `NOT IN`",
    "Distinguish `WHERE` from `HAVING`, `DISTINCT` from `GROUP BY`, and `UNION` from `UNION ALL`",
    "Write the extract query so the database does the filtering and aggregation"
  ],

  prerequisites: ["3.6", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The order the engine actually runs", id: "order" },

    { t: "p", text: "You write `SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY`. **The engine evaluates `FROM` first and `SELECT` almost last.** That is why a column alias defined in `SELECT` cannot be used in `WHERE`, and why `WHERE` cannot filter on an aggregate." },

    { t: "dl", items: [
      ["Logical execution order", "`FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`. Each stage sees only what the previous stage produced."],
      ["`WHERE`", "Filters **rows** before grouping. Cannot reference aggregates, because none exist yet."],
      ["`HAVING`", "Filters **groups** after aggregation. This is where `COUNT(*) > 5` belongs."],
      ["`SELECT` alias", "A name given to an output column. Visible to `ORDER BY` (which runs after) and not to `WHERE` or `GROUP BY` (which run before) — in most engines."],
      ["`DISTINCT`", "Removes duplicate **output rows** after `SELECT`. Equivalent to grouping by every selected column with no aggregates."],
      ["`LIMIT` / `TOP`", "Runs last. Without `ORDER BY` it returns an arbitrary subset, which is different on every run."]
    ]},

    { t: "viz",
      title: "Written order against execution order",
      caption: "The query is written top to bottom; the engine runs it in the order on the right. A clause can only see what the stages before it produced — which is why WHERE cannot see an aggregate and ORDER BY can see an alias.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Six SQL clauses in written order on the left with arrows to their execution order on the right">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">as written</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="60" class="s-sub" style="fill:var(--ink-2)">SELECT region, SUM(amt) AS total</text>
    <text x="30" y="90" class="s-sub" style="fill:var(--ink-2)">FROM orders o JOIN customers c ON …</text>
    <text x="30" y="120" class="s-sub" style="fill:var(--ink-2)">WHERE o.status = 'paid'</text>
    <text x="30" y="150" class="s-sub" style="fill:var(--ink-2)">GROUP BY region</text>
    <text x="30" y="180" class="s-sub" style="fill:var(--ink-2)">HAVING SUM(amt) &gt; 1000</text>
    <text x="30" y="210" class="s-sub" style="fill:var(--ink-2)">ORDER BY total DESC</text>
    <text x="30" y="240" class="s-sub" style="fill:var(--ink-2)">LIMIT 10</text>
  </g>

  <text x="560" y="26" class="s-label" style="fill:var(--acc)">as executed</text>
  <g>
    <rect x="560" y="44" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="60" class="s-sub" style="fill:var(--ink-2)">1  FROM + JOIN  → the row set</text>
    <rect x="560" y="74" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="90" class="s-sub" style="fill:var(--ink-2)">2  WHERE  → filter rows</text>
    <rect x="560" y="104" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="120" class="s-sub" style="fill:var(--ink-2)">3  GROUP BY  → make groups</text>
    <rect x="560" y="134" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="150" class="s-sub" style="fill:var(--ink-2)">4  HAVING  → filter groups</text>
    <rect x="560" y="164" width="260" height="24" rx="4" style="fill:var(--good);fill-opacity:.15;stroke:var(--good);stroke-width:1.2"/>
    <text x="572" y="180" class="s-sub" style="fill:var(--ink-2)">5  SELECT  → compute columns, aliases</text>
    <rect x="560" y="194" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="210" class="s-sub" style="fill:var(--ink-2)">6  ORDER BY  → can use "total"</text>
    <rect x="560" y="224" width="260" height="24" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.2"/>
    <text x="572" y="240" class="s-sub" style="fill:var(--ink-2)">7  LIMIT  → take the first N</text>
  </g>

  <g style="stroke:var(--ink-3);stroke-width:1.2;stroke-dasharray:3 3">
    <line x1="330" y1="56" x2="550" y2="176"/>
    <line x1="330" y1="86" x2="550" y2="56"/>
    <line x1="330" y1="116" x2="550" y2="86"/>
    <line x1="330" y1="146" x2="550" y2="116"/>
    <line x1="330" y1="176" x2="550" y2="146"/>
    <line x1="330" y1="206" x2="550" y2="206"/>
    <line x1="330" y1="236" x2="550" y2="236"/>
  </g>

  <line x1="30" y1="270" x2="850" y2="270" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="296" class="s-sub" style="fill:var(--ink-3)">WHERE total &gt; 1000 fails: "total" does not exist at stage 2.   ORDER BY total works: it exists by stage 6.   LIMIT without ORDER BY: an arbitrary ten.</text>
</svg>`
    },

    { t: "code", lang: "sql", title: "what each stage can see", code: `
-- THE REFERENCE QUERY
SELECT   c.region,
         COUNT(*)      AS orders,
         SUM(o.amount) AS revenue
FROM     orders o
JOIN     customers c ON c.customer_id = o.customer_id
WHERE    o.status = 'paid'                -- rows, before grouping
GROUP BY c.region
HAVING   SUM(o.amount) > 1000             -- groups, after aggregation
ORDER BY revenue DESC                     -- the alias exists by now
LIMIT    10;

-- WHERE CANNOT SEE AN AGGREGATE. This does not parse:
--   WHERE SUM(o.amount) > 1000
-- because at the WHERE stage there are no groups and no sums. HAVING
-- is the same test, one stage later.

-- WHERE CANNOT SEE A SELECT ALIAS (in most engines):
--   WHERE revenue > 1000
-- because SELECT has not run yet. Repeat the expression, or use a
-- subquery / CTE so the alias becomes a real column of an inner
-- result. (MySQL and SQLite allow it as an extension; do not rely
-- on it.)

-- ORDER BY CAN SEE THE ALIAS, because it runs after SELECT.

-- HAVING WITHOUT GROUP BY treats the whole result as one group:
SELECT COUNT(*) FROM orders HAVING COUNT(*) > 100;
-- returns one row or zero rows. Occasionally useful; usually a sign
-- of a missing GROUP BY.

-- WHERE VS HAVING ON THE SAME COLUMN -- both valid, different meaning:
SELECT region, COUNT(*) FROM orders
WHERE  region <> 'test'                  -- exclude rows BEFORE counting
GROUP BY region
HAVING COUNT(*) >= 5;                    -- exclude small groups AFTER

-- Putting the region filter in HAVING would work but do the grouping
-- work for the test region first and discard it. WHERE is earlier
-- and cheaper for a row-level condition.

-- DISTINCT RUNS AFTER SELECT, on the OUTPUT rows:
SELECT DISTINCT region FROM orders;             -- distinct regions
SELECT DISTINCT region, status FROM orders;     -- distinct PAIRS
--
-- DISTINCT applies to the whole row, not the first column. The
-- second query returns every (region, status) combination that
-- occurs. And it is equivalent to:
SELECT region, status FROM orders GROUP BY region, status;

-- COUNT(DISTINCT x) IS DIFFERENT: distinct values of x, counted.
SELECT COUNT(DISTINCT customer_id) FROM orders;

-- LIMIT WITHOUT ORDER BY IS NOT "THE FIRST TEN". It is ten rows, in
-- whatever order the engine found them, which changes with the
-- plan, the indexes and the data. Reproducible only by accident.
SELECT * FROM orders ORDER BY order_id LIMIT 10;   -- deterministic

-- THE SUBQUERY / CTE FORM that lets a later stage's result become an
-- earlier stage's input:
WITH paid AS (
    SELECT customer_id, SUM(amount) AS total
    FROM   orders
    WHERE  status = 'paid'
    GROUP BY customer_id
)
SELECT customer_id, total
FROM   paid
WHERE  total > 500;                      -- now total IS a column
--
-- A CTE (WITH ...) is a named subquery. The outer query sees it as
-- a table, so WHERE can filter on what was an aggregate inside.
`,
      hl: [14, 21, 42, 63],
      caption: "**`LIMIT` without `ORDER BY` returns ten rows in whatever order the engine found them.** It changes with the plan, the indexes and the data, and is reproducible only by accident."
    },

    { t: "h2", n: "02", text: "NULL: three-valued logic", id: "null" },

    { t: "p", text: "**`NULL` means \"unknown\", and every comparison with an unknown is itself unknown** — not true, not false. `WHERE` keeps only rows whose condition is true, so an unknown condition drops the row. This is the single most common source of silent under-counts in SQL." },

    { t: "code", lang: "sql", title: "how NULL moves through comparisons, aggregates and IN", code: `
-- COMPARISONS WITH NULL ARE NEVER TRUE:
SELECT * FROM customers WHERE region = 'north';
-- rows with region NULL are NOT returned. Fine, expected.

SELECT * FROM customers WHERE region <> 'north';
-- rows with region NULL are ALSO NOT returned. NULL <> 'north' is
-- unknown, and WHERE keeps only true. The two queries together do
-- not cover the table. This is the trap.

SELECT * FROM customers WHERE region <> 'north' OR region IS NULL;
-- the complement, spelled out. IS NULL / IS NOT NULL are the ONLY
-- tests that return true or false for NULL.

-- = NULL IS ALWAYS UNKNOWN, INCLUDING NULL = NULL:
SELECT * FROM customers WHERE region = NULL;      -- zero rows, always
SELECT * FROM customers WHERE region IS NULL;     -- the rows you meant

-- AGGREGATES SKIP NULL -- except COUNT(*):
SELECT COUNT(*),            -- every row
       COUNT(region),       -- rows where region IS NOT NULL
       COUNT(DISTINCT region),
       AVG(score),          -- mean of NON-NULL scores: sum / count(score)
       SUM(score)           -- NULL if every score is NULL, else the sum
FROM   customers;
--
-- AVG(score) is NOT sum(score) / count(*). A column with half its
-- values NULL has an average over the other half, silently. If the
-- NULLs should count as zero, say so:
SELECT AVG(COALESCE(score, 0)) FROM customers;

-- SUM OF AN EMPTY OR ALL-NULL SET IS NULL, NOT ZERO:
SELECT SUM(amount) FROM orders WHERE 1 = 0;       -- NULL
SELECT COALESCE(SUM(amount), 0) FROM orders WHERE 1 = 0;   -- 0
-- (pandas does the opposite: sum() of empty is 0. Neither is wrong;
-- know which you are in.)

-- ARITHMETIC AND CONCATENATION PROPAGATE NULL:
SELECT price * quantity FROM lines;       -- NULL if either is NULL
SELECT first_name || ' ' || last_name;    -- NULL if either is NULL
--
-- A total that is NULL because ONE line had a NULL quantity looks
-- like a missing total, not a data-quality problem. COALESCE at the
-- point where you know what the default means.

-- GROUP BY TREATS ALL NULLS AS ONE GROUP:
SELECT region, COUNT(*) FROM customers GROUP BY region;
-- includes a row where region is NULL, with the count of NULL-region
-- customers. (pandas groupby DROPS it by default. Opposite again.)

-- NOT IN WITH A NULL IN THE LIST RETURNS NOTHING:
SELECT * FROM orders
WHERE  customer_id NOT IN (SELECT customer_id FROM blocked);
--
-- If ANY blocked.customer_id is NULL, the whole NOT IN is unknown for
-- every row, and the query returns ZERO rows. No error. This is the
-- most surprising NULL behaviour in SQL, and it happens on real data
-- the first time the blocked table gets a NULL.
--
-- x NOT IN (1, 2, NULL)  is  x <> 1 AND x <> 2 AND x <> NULL
--                        is  ... AND unknown  =  unknown
--
-- THE SAFE FORM is NOT EXISTS, which does not have this problem:
SELECT * FROM orders o
WHERE  NOT EXISTS (SELECT 1 FROM blocked b WHERE b.customer_id = o.customer_id);
--
-- Or filter the NULLs out of the subquery. NOT EXISTS is also usually
-- the better plan.

-- IN WITH NULL IS LESS DANGEROUS: x IN (1, NULL) is true for x = 1,
-- unknown otherwise. Rows matching a real value still come back.

-- ORDER BY: NULLS SORT FIRST OR LAST DEPENDING ON THE ENGINE.
-- PostgreSQL: NULLS LAST for ASC. MySQL: NULLS FIRST for ASC. SQL
-- Server: NULLS FIRST. Say what you mean where the engine allows it:
SELECT * FROM customers ORDER BY score DESC NULLS LAST;

-- COALESCE AND NULLIF -- the two functions for the job:
SELECT COALESCE(nickname, first_name, 'unknown')   -- first non-NULL
FROM   customers;
SELECT amount / NULLIF(quantity, 0)                -- NULL instead of
FROM   lines;                                      -- divide-by-zero error
`,
      hl: [5, 21, 46, 60],
      caption: "**`x NOT IN (SELECT ...)` returns zero rows if the subquery contains a single NULL.** No error, and it happens on real data the first time the lookup table gets a NULL — `NOT EXISTS` is the safe form."
    },

    { t: "callout", kind: "trap", title: "The complementary filters that do not cover the table", body: [
      { t: "p", text: "`WHERE region = 'north'` and `WHERE region <> 'north'` look like they partition the customers. **Together they miss every customer whose region is NULL**, because both comparisons are unknown for those rows and `WHERE` keeps only true." },
      { t: "p", text: "A report built from the two halves under-counts by exactly the number of NULLs, and the two halves each look complete. **`IS NULL` is the third case, always.**" },
      { t: "p", text: "The same logic is why `NOT IN` against a list containing NULL returns nothing, and why `AVG` silently averages over the non-missing rows only." }
    ]},

    { t: "h2", n: "03", text: "Joins, and the row count they produce", id: "joins" },

    { t: "code", lang: "sql", title: "join types, cardinality, and the totals that doubled", code: `
-- THE FIVE JOINS, on the rows they keep (same semantics as 3.6):
SELECT ... FROM orders o INNER JOIN customers c ON c.id = o.customer_id;
--   only orders with a matching customer. Unmatched orders VANISH.
SELECT ... FROM orders o LEFT  JOIN customers c ON c.id = o.customer_id;
--   every order; NULL customer columns where there was no match.
SELECT ... FROM orders o RIGHT JOIN customers c ON c.id = o.customer_id;
--   every customer; NULL order columns for customers with no orders.
--   Rewrite as a LEFT JOIN with the tables swapped -- it reads better.
SELECT ... FROM orders o FULL  JOIN customers c ON c.id = o.customer_id;
--   every row from both; NULL on whichever side is missing.
SELECT ... FROM sizes CROSS JOIN colours;
--   every pair. n x m rows. Useful for generating a grid; catastrophic
--   when it happens by omitting the ON clause.

-- JOIN WITHOUT ON (or with a condition that is always true) IS A
-- CROSS JOIN. Older syntax makes this easy to do by accident:
SELECT * FROM orders, customers;                  -- n x m rows
SELECT * FROM orders, customers WHERE orders.customer_id = customers.id;
--   the pre-ANSI form, correct only because of the WHERE. Use JOIN ON.

-- THE ROW COUNT RULE: one output row per MATCHING PAIR.
--   customers.id unique, one order per customer  -> n rows
--   customers.id unique, many orders per customer -> n orders
--   customers.id DUPLICATED (2 rows for id 7)      -> every order for 7
--                                                    appears TWICE

-- THE DOUBLED TOTAL, spelled out:
SELECT c.region, SUM(o.amount)
FROM   orders o
JOIN   customers c ON c.id = o.customer_id     -- c has id 7 twice
GROUP BY c.region;
--   Customer 7's orders are summed twice. Revenue is up by exactly
--   their total. No error, no warning.

-- FINDING THE DUPLICATE KEY BEFORE JOINING:
SELECT id, COUNT(*) FROM customers GROUP BY id HAVING COUNT(*) > 1;
--   Zero rows means the key is unique and the join is safe. This
--   query belongs in every pipeline that joins to a lookup table.

-- THE ROW-COUNT CHECK AFTER:
SELECT (SELECT COUNT(*) FROM orders)                         AS before_join,
       (SELECT COUNT(*) FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id)      AS after_join;
--   For a LEFT JOIN these must be EQUAL. If after > before, a right
--   key is duplicated.

-- FILTERING THE RIGHT SIDE OF A LEFT JOIN: ON vs WHERE.
SELECT o.id, c.tier
FROM   orders o
LEFT JOIN customers c ON c.id = o.customer_id AND c.tier = 'gold';
--   every order; tier is 'gold' or NULL. The condition is part of the
--   MATCH.

SELECT o.id, c.tier
FROM   orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE  c.tier = 'gold';
--   only orders whose customer is gold. The WHERE runs AFTER the
--   join and drops the NULL rows -- so this LEFT JOIN behaves like an
--   INNER JOIN. A very common way to lose the "left" in a left join.

-- SELF JOIN -- a table against itself, for hierarchies and pairs:
SELECT e.name AS employee, m.name AS manager
FROM   staff e
LEFT JOIN staff m ON m.id = e.manager_id;
--   The alias is what makes it two tables. LEFT so the top of the
--   tree (manager_id NULL) is kept.

-- ANTI-JOIN -- rows in the left with NO match on the right:
SELECT o.*
FROM   orders o
LEFT JOIN shipments s ON s.order_id = o.id
WHERE  s.order_id IS NULL;                        -- unmatched only
--   Or NOT EXISTS, which is clearer and immune to the NOT IN NULL
--   problem:
SELECT o.* FROM orders o
WHERE  NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.id);

-- SEMI-JOIN -- rows in the left that HAVE a match, without
-- multiplying them:
SELECT o.* FROM orders o
WHERE  EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.id);
--   An INNER JOIN would return one row per SHIPMENT; if an order has
--   three shipments it appears three times. EXISTS returns each order
--   once.

-- USING for same-named keys, and the column appears ONCE:
SELECT * FROM orders JOIN customers USING (customer_id);

-- MULTIPLE JOINS: cardinality compounds.
SELECT ...
FROM   orders o
JOIN   order_lines l ON l.order_id = o.id       -- 1 : many
JOIN   payments p    ON p.order_id = o.id;      -- 1 : many
--   An order with 3 lines and 2 payments -> 6 rows. SUM(l.amount) is
--   doubled; SUM(p.amount) is tripled. Aggregate each child in its
--   own subquery, THEN join the aggregates -- the SQL form of the
--   three-frames rule from 5.3.
`,
      hl: [23, 35, 51, 92],
      caption: "**A `WHERE` on the right side of a `LEFT JOIN` turns it into an `INNER JOIN`.** The filter runs after the join and drops the NULL rows — the most common way to lose the \"left\" without noticing."
    },

    { t: "h2", n: "04", text: "Set operations and the extract query", id: "sets" },

    { t: "code", lang: "sql", title: "UNION, and writing the extract so the database does the work", code: `
-- UNION REMOVES DUPLICATES; UNION ALL DOES NOT.
SELECT customer_id FROM orders_2025
UNION
SELECT customer_id FROM orders_2026;
--   distinct customer_ids across both. A sort-and-dedupe over the
--   combined result -- expensive on large tables.

SELECT customer_id FROM orders_2025
UNION ALL
SELECT customer_id FROM orders_2026;
--   every row from both, duplicates kept. No sort. Almost always what
--   you want when stacking partitions of the same table, and much
--   faster. Reach for UNION only when deduplication is the point.
--
-- BOTH REQUIRE the same number of columns with compatible types, in
-- order. Column NAMES come from the first query.

-- INTERSECT and EXCEPT (MINUS in Oracle):
SELECT customer_id FROM orders_2025
INTERSECT
SELECT customer_id FROM orders_2026;      -- ordered in both years
SELECT customer_id FROM orders_2025
EXCEPT
SELECT customer_id FROM orders_2026;      -- 2025 but not 2026: churn
--   Both deduplicate. Both treat NULL = NULL as a match (unlike =),
--   which is one of the few places SQL does.

-- CASE -- the conditional, and the pivot-by-hand:
SELECT customer_id,
       SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) AS refunded,
       COUNT(CASE WHEN status = 'paid' THEN 1 END)               AS n_paid
FROM   orders
GROUP BY customer_id;
--   The CASE inside an aggregate is how you get several conditional
--   sums in one pass. COUNT(CASE ... THEN 1 END) counts only the
--   matches, because the ELSE is NULL and COUNT skips NULL.

-- THE EXTRACT QUERY: PUSH THE WORK DOWN.
-- The pandas pipeline needs paid revenue per customer per month for
-- 2026, for customers in two regions. The WRONG extract:
--   SELECT * FROM orders;                  -- 50M rows into pandas
-- The RIGHT one:
SELECT   o.customer_id,
         DATE_TRUNC('month', o.order_date) AS month,
         SUM(o.amount)                     AS revenue,
         COUNT(*)                          AS n_orders
FROM     orders o
JOIN     customers c ON c.id = o.customer_id
WHERE    o.status = 'paid'
  AND    o.order_date >= '2026-01-01'
  AND    o.order_date <  '2027-01-01'
  AND    c.region IN ('north', 'south')
GROUP BY o.customer_id, DATE_TRUNC('month', o.order_date);
--   Filters, join and aggregation happen where the data lives, with
--   indexes and parallelism. pandas receives 200k rows instead of 50M.

-- DATE RANGES: HALF-OPEN, ALWAYS.
--   order_date >= '2026-01-01' AND order_date < '2027-01-01'
-- not
--   order_date BETWEEN '2026-01-01' AND '2026-12-31'
-- BETWEEN is inclusive, and a timestamp of 2026-12-31 14:00 is AFTER
-- '2026-12-31' (which is midnight). The last day's rows are lost.
-- Half-open ranges have no such edge and compose without gaps.

-- SARGABLE PREDICATES: let the index work.
WHERE  order_date >= '2026-01-01'                 -- uses an index on order_date
WHERE  YEAR(order_date) = 2026                    -- does NOT: the function
                                                  -- must run on every row
WHERE  LOWER(email) = 'a@x.com'                   -- does not, unless the index
                                                  -- is on LOWER(email)
--   A predicate is "sargable" when the engine can seek an index for
--   it. Wrapping the column in a function usually makes it not.

-- PARAMETERS, NEVER STRING FORMATTING:
--   f"WHERE region = '{region}'"      -> SQL injection, and wrong quoting
--   cursor.execute("WHERE region = %s", (region,))   -> correct
-- See 5.7 for the pandas side.
`,
      hl: [9, 30, 43, 60],
      caption: "**`BETWEEN '2026-01-01' AND '2026-12-31'` loses the last day's afternoon.** The upper bound is midnight; a timestamp at 14:00 on 31 December is after it. Half-open ranges have no edge."
    },

    { t: "table",
      head: ["Confusion", "This", "That", "The difference"],
      rows: [
        ["`WHERE` / `HAVING`", "Filters rows before grouping", "Filters groups after", "Aggregates exist only in `HAVING`"],
        ["`DISTINCT` / `GROUP BY`", "Dedupes output rows", "Makes groups for aggregates", "Equivalent when there are no aggregates"],
        ["`UNION` / `UNION ALL`", "Dedupes the combined result", "Keeps everything", "`ALL` is faster and usually right"],
        ["`COUNT(*)` / `COUNT(col)`", "Every row", "Rows where `col` is not NULL", "They differ by the NULL count"],
        ["`IN` / `EXISTS`", "Compares to a list", "Tests for a matching row", "`NOT IN` with a NULL returns nothing"],
        ["`ON` / `WHERE` (left join)", "Part of the match", "Filters after the join", "`WHERE` on the right side makes it inner"],
        ["`DELETE` / `TRUNCATE` / `DROP`", "Removes rows (logged, `WHERE` allowed)", "Removes all rows (fast, no `WHERE`)", "`DROP` removes the table itself"],
        ["`CHAR` / `VARCHAR`", "Fixed width, space-padded", "Variable width", "`'ab' = 'ab  '` can be true for `CHAR`"]
      ],
      caption: "**`COUNT(*)` and `COUNT(col)` differ by exactly the number of NULLs in `col`.** That difference is a data-quality number, and it is free."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The customer report with three silent defects",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A monthly report lists customers who have not been blocked, with their paid revenue and average order value, for customers in the north. It has been running for a year. This month the blocked table gained a row with a NULL customer_id, and the numbers changed in ways nobody can explain." },
        { t: "code", lang: "sql", numbered: false, title: "report.sql", code: `
SELECT   c.customer_id,
         c.name,
         SUM(o.amount)                 AS revenue,
         SUM(o.amount) / COUNT(*)      AS avg_order
FROM     customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE    c.region = 'north'
  AND    o.status = 'paid'
  AND    c.customer_id NOT IN (SELECT customer_id FROM blocked)
GROUP BY c.customer_id, c.name
ORDER BY revenue DESC;`},
        { t: "p", text: "Find every defect. Say what each does to the output, which one the NULL in `blocked` triggered, and rewrite the query." }
      ],
      requirements: [
        "Identify each defect and its effect on the numbers.",
        "Explain why the report returned zero rows this month.",
        "Explain what the `LEFT JOIN` actually does here and whether it matters.",
        "Explain what `avg_order` computes for a customer with no paid orders.",
        "Rewrite so every customer in the north appears, blocked ones are excluded correctly, and the average is honest.",
        "State the row count you expect and how to verify it."
      ],
      hint: "There are two defects that were always there and one that only bit this month. The `LEFT JOIN` is doing nothing, and the `NOT IN` is doing everything.",
      solution: {
        lang: "sql",
        title: "report_fixed.sql",
        code: `-- =========================================================================
-- THE DEFECTS
-- =========================================================================
--
-- 1. THE NULL IN blocked -- this month's failure.
--    c.customer_id NOT IN (SELECT customer_id FROM blocked)
--    With one NULL in the subquery, the NOT IN is unknown for EVERY
--    row, WHERE keeps only true, and the report returns ZERO ROWS.
--    No error. The report simply came back empty.
--
-- 2. THE LEFT JOIN IS AN INNER JOIN -- always was.
--    WHERE o.status = 'paid' runs after the join. A customer with no
--    orders has o.status NULL; NULL = 'paid' is unknown; the row is
--    dropped. So customers with no paid orders never appeared, even
--    though the LEFT JOIN suggests the author wanted them. The report
--    has always under-listed north customers.
--
-- 3. avg_order DIVIDES BY COUNT(*) -- always was.
--    After defect 2, every surviving row has a paid order, so COUNT(*)
--    equals the paid-order count and the average is accidentally
--    right. Fix defect 2 alone and COUNT(*) for a customer with no
--    orders is 1 (the LEFT JOIN's NULL row), SUM is NULL, and
--    avg_order is NULL / 1 = NULL. Fix it with COUNT(o.order_id),
--    which skips NULL -- and then it is 0, and the division is NULL
--    (not an error, in most engines). NULLIF makes that explicit.
--
-- Two of these produced wrong numbers for a year. The third made the
-- report vanish, which is what got it looked at.


-- =========================================================================
-- THE REWRITE
-- =========================================================================

WITH paid AS (
    -- Aggregate orders FIRST, so the join is 1:1 and cannot multiply,
    -- and so the status filter is on orders, not on the joined row.
    SELECT customer_id,
           SUM(amount)      AS revenue,
           COUNT(*)         AS n_paid
    FROM   orders
    WHERE  status = 'paid'
    GROUP BY customer_id
)
SELECT   c.customer_id,
         c.name,
         COALESCE(p.revenue, 0)                          AS revenue,
         COALESCE(p.n_paid, 0)                           AS n_paid,
         p.revenue / NULLIF(p.n_paid, 0)                 AS avg_order
FROM     customers c
LEFT JOIN paid p ON p.customer_id = c.customer_id
WHERE    c.region = 'north'
  AND    NOT EXISTS (SELECT 1
                     FROM   blocked b
                     WHERE  b.customer_id = c.customer_id)
ORDER BY revenue DESC, c.customer_id;


-- =========================================================================
-- WHAT CHANGED AND WHY
-- =========================================================================
--
-- NOT EXISTS instead of NOT IN.
--   NOT EXISTS asks "is there a blocked row for THIS customer". A NULL
--   customer_id in blocked matches nobody, so it is simply ignored.
--   The query returns rows again, and it will keep returning rows
--   however many NULLs blocked accumulates.
--
-- The status filter moved INTO the CTE.
--   It is now a filter on orders before aggregation, not a filter on
--   the joined result. Customers with no paid orders survive the LEFT
--   JOIN with p.* NULL, and COALESCE turns that into 0 revenue and 0
--   orders -- which is the truth about them.
--
-- Aggregating before joining.
--   The join is now customers (unique) to paid (one row per customer,
--   by construction of the GROUP BY). It cannot multiply. The original
--   joined customers to raw orders and then grouped, which is fine
--   here but would double revenue the day customers gains a duplicate
--   id -- and aggregating first removes that failure mode entirely.
--
-- NULLIF for the average.
--   revenue / 0 raises in some engines and returns NULL in others.
--   NULLIF(n_paid, 0) makes it NULL everywhere, deliberately: a
--   customer with no orders has no average order, and NULL says so.
--   COALESCE(..., 0) here would claim an average of zero, which is a
--   different and false statement.
--
-- ORDER BY with a tiebreak.
--   Two customers with equal revenue came back in arbitrary order.
--   Adding customer_id makes the report identical run to run.


-- =========================================================================
-- VERIFYING THE ROW COUNT
-- =========================================================================
--
-- Expected: every north customer not in blocked. Exactly:
SELECT COUNT(*)
FROM   customers c
WHERE  c.region = 'north'
  AND  NOT EXISTS (SELECT 1 FROM blocked b WHERE b.customer_id = c.customer_id);
--
-- The report must return this many rows. If it returns fewer, a
-- filter is dropping customers; if more, the join is multiplying.
--
-- And the revenue must reconcile:
SELECT SUM(amount)
FROM   orders o
JOIN   customers c ON c.customer_id = o.customer_id
WHERE  o.status = 'paid' AND c.region = 'north'
  AND  NOT EXISTS (SELECT 1 FROM blocked b WHERE b.customer_id = c.customer_id);
--
-- must equal SUM(revenue) over the report. Two numbers, two queries,
-- and the report is either right or visibly wrong.


-- =========================================================================
-- THE DEFECTS, DEMONSTRATED ON A TINY TABLE
-- =========================================================================
--
-- customers: (1, 'ada', 'north'), (2, 'bea', 'north'), (3, 'cam', 'south')
-- orders:    (1, 100, 'paid'), (1, 50, 'refunded'), (3, 200, 'paid')
--            -- bea has NO orders
-- blocked:   (3), (NULL)
--
-- ORIGINAL QUERY:
--   NOT IN (3, NULL) -> unknown for every customer -> 0 rows.
--
-- ORIGINAL WITH blocked = (3) only:
--   ada: revenue 100, avg 100 (COUNT(*) = 1 paid row). Correct by luck.
--   bea: LEFT JOIN gives one NULL order row; o.status = 'paid' is
--        unknown; row dropped. bea MISSING.
--   -> 1 row. Should be 2.
--
-- REWRITE:
--   ada: revenue 100, n_paid 1, avg 100.
--   bea: revenue 0,   n_paid 0, avg NULL.
--   cam: excluded by region (and blocked anyway).
--   -> 2 rows. Matches the count query.`,
        notes: [
          { t: "p", text: "**Two defects produced wrong numbers for a year; the third made the report vanish.** The `LEFT JOIN` was always an inner join because `WHERE o.status = 'paid'` dropped every NULL-order row, and the average was right only by the accident that the inner join left one paid row per surviving customer." },
          { t: "callout", kind: "trap", title: "NOT IN with one NULL returns nothing", body: [
            { t: "p", text: "`x NOT IN (3, NULL)` expands to `x <> 3 AND x <> NULL`, and `x <> NULL` is unknown for every `x`. **The whole predicate is unknown for every row, and `WHERE` keeps only true.** The report came back empty with no error." },
            { t: "p", text: "`NOT EXISTS` asks a different question — is there a blocked row for *this* customer — and a NULL in the blocked table matches nobody, so it is simply ignored." }
          ]},
          { t: "p", text: "**Aggregate before joining.** The CTE makes `paid` one row per customer by construction, so the join to `customers` is 1:1 and cannot multiply — which removes the failure mode where a duplicated customer id doubles revenue, before it ever happens." },
          { t: "p", text: "**`COALESCE(revenue, 0)` and `NULLIF(n_paid, 0)` say different things on purpose.** A customer with no orders has zero revenue — a true statement — and no average order — which `NULL` says and `0` would misstate." },
          { t: "p", text: "**The row-count query is the verification.** \"Every north customer not in blocked\" is a number you can compute independently, and the report must return exactly that many rows. Fewer means a filter is dropping customers; more means the join is multiplying." },
          { t: "p", text: "**`ORDER BY revenue DESC, customer_id`** makes the output identical run to run. Two customers with equal revenue came back in arbitrary order before, and a report that reorders itself is a report people stop trusting." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT * FROM t WHERE region <> 'north'` returns 900 rows and `WHERE region = 'north'` returns 80. The table has 1,000 rows. Where are the other 20?",
          options: [
            "Deleted",
            "They have region NULL — both comparisons are unknown for them, and WHERE keeps only true",
            "Duplicates removed",
            "A LIMIT was applied"
          ],
          answer: 1,
          why: "`NULL <> 'north'` and `NULL = 'north'` are both unknown, not false. The two filters that look complementary miss every NULL row. `IS NULL` is the third case, always, and `COUNT(*) - COUNT(region)` is how many there are."
        }
      ]
    }
  ],

  takeaways: [
    "**`FROM` runs first and `SELECT` runs almost last** — a `SELECT` alias is visible to `ORDER BY` and invisible to `WHERE` and `GROUP BY`.",
    "**`WHERE` filters rows before grouping; `HAVING` filters groups after** — aggregates exist only in `HAVING`.",
    "**`LIMIT` without `ORDER BY` returns an arbitrary subset** that changes with the plan and the data.",
    "**`NULL` is unknown, not false**; every comparison with it is unknown, and `WHERE` keeps only true.",
    "**`= 'x'` and `<> 'x'` together miss every NULL row** — `IS NULL` is the third case.",
    "**`NOT IN` against a list containing one NULL returns zero rows** — `NOT EXISTS` is the safe form.",
    "**Aggregates skip NULL except `COUNT(*)`**; `AVG` divides by the non-NULL count, and `SUM` of nothing is NULL, not 0.",
    "**A join produces one row per matching pair**; a duplicated key on the lookup side doubles every row that matches it.",
    "**A `WHERE` on the right side of a `LEFT JOIN` makes it an `INNER JOIN`** — put the condition in `ON` to keep the left rows.",
    "**Two one-to-many joins multiply**: aggregate each child in its own subquery, then join the aggregates.",
    "**`UNION` dedupes and sorts; `UNION ALL` does not** — `ALL` is faster and usually what you meant.",
    "**Use half-open date ranges** — `BETWEEN` is inclusive and loses the last day's afternoon on a timestamp column.",
    "**Push filters, joins and aggregation into the query** so pandas receives 200k rows instead of 50M."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why can `WHERE` not reference `SUM(amount)`?",
        options: [
          "SUM is only allowed in SELECT",
          "WHERE runs before GROUP BY, so at that stage no groups or aggregates exist — HAVING is the same test after aggregation",
          "It can, with parentheses",
          "SUM must be aliased first"
        ],
        answer: 1,
        why: "The logical execution order is FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. Each stage sees only what the previous one produced. Wrapping the aggregation in a CTE turns the aggregate into a real column that an outer WHERE can filter."
      },
      {
        stem: "A `LEFT JOIN customers c` followed by `WHERE c.tier = 'gold'` returns fewer rows than the left table. Why?",
        options: [
          "LEFT JOIN drops unmatched rows",
          "The WHERE runs after the join and drops rows where c.tier is NULL — unmatched left rows — so it behaves as an INNER JOIN",
          "tier is indexed",
          "gold customers have no orders"
        ],
        answer: 1,
        why: "Unmatched left rows have NULL in every right column, and `NULL = 'gold'` is unknown. To keep every left row and still restrict the match, the condition belongs in the `ON` clause, where it is part of the join rather than a filter on its result."
      },
      {
        stem: "An order has 3 lines and 2 payments. Joining orders to both tables and summing gives what?",
        options: [
          "Correct totals",
          "6 rows per order: line amounts doubled, payment amounts tripled",
          "An error",
          "5 rows per order"
        ],
        answer: 1,
        why: "Cardinality compounds across joins — one row per (line, payment) pair. Aggregate each child table in its own subquery to one row per order, then join the aggregates. It is the SQL form of the three-frames rule for nested JSON."
      },
      {
        stem: "`SELECT AVG(score) FROM t` where half the scores are NULL. What is computed?",
        options: [
          "The mean treating NULL as 0",
          "The mean of the non-NULL scores only — SUM(score) / COUNT(score), not / COUNT(*)",
          "NULL",
          "An error"
        ],
        answer: 1,
        why: "Aggregates skip NULL, and `COUNT(score)` excludes them. If missing should count as zero, `AVG(COALESCE(score, 0))` says so. The difference between `COUNT(*)` and `COUNT(score)` is the number of NULLs — a free data-quality figure."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between WHERE and HAVING?",
        strong: "Execution stage. WHERE filters rows before grouping, so it cannot see aggregates because none exist yet. HAVING filters groups after aggregation, so it can. A row-level condition belongs in WHERE even when HAVING would also work — it runs earlier and avoids grouping rows you are about to discard.",
        answer: [
          { t: "p", text: "Explaining it through execution order, rather than as two keywords, is what lets you answer every variant — alias visibility, LIMIT ordering, subquery necessity — from the same model." }
        ]
      },
      {
        level: "advanced",
        q: "A report that ran for a year suddenly returns zero rows. Nothing in the SQL changed. What do you suspect?",
        strong: "A NULL arrived in a table referenced by `NOT IN`. `x NOT IN (SELECT ...)` is unknown for every row the moment the subquery contains one NULL, and WHERE keeps only true — so the whole result vanishes with no error. I would confirm with `SELECT COUNT(*) FROM that_table WHERE key IS NULL`, and rewrite as `NOT EXISTS`, which asks a per-row question and ignores the NULL.",
        answer: [
          { t: "p", text: "Reasoning from \"nothing changed in the SQL\" to \"something changed in the data, and this is the construct that reacts to it\" is the diagnostic move being tested." }
        ]
      },
      {
        level: "advanced",
        q: "How do you write an extract query for a pandas pipeline?",
        strong: "Push the work down. Filter in WHERE with sargable predicates so indexes are used, join in the database where the keys are indexed, and aggregate to the grain the pipeline needs — so it receives two hundred thousand rows rather than fifty million. Use half-open date ranges, parameters rather than string formatting, and aggregate child tables before joining them so cardinality cannot multiply. Then verify the row count against an independent COUNT.",
        answer: [
          { t: "p", text: "The row-count verification at the end is the difference between an extract you trust and one you hope is right." }
        ]
      }
    ]
  }
});

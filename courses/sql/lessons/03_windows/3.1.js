/* ============================================================================
   LESSON 3.1 — OVER: An Aggregate That Keeps the Rows
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**GROUP BY answers 'what is the total per customer' by collapsing each customer to one row. A window function answers the same question and leaves every order in place, with its customer's total written next to it.** That is the whole idea: an aggregate computed over a set of related rows — the window — whose result is attached to each row rather than replacing them. Running totals, shares of total, differences from the group average: each is an OVER clause on a query you already know how to write.",

  objectives: [
    "Explain what OVER does to an aggregate and how it differs from GROUP BY in output shape",
    "Use PARTITION BY to define the group and ORDER BY inside OVER to make the aggregate cumulative",
    "Write share-of-total, running-total and difference-from-average columns in one query",
    "Know where a window function may appear and why it cannot be used in WHERE"
  ],

  prerequisites: ["2.4"],

  blocks: [

    { t: "h2", n: "01", text: "Same aggregate, every row kept", id: "over" },

    { t: "p", text: "`SUM(amount) OVER ()` is a SUM whose window is the whole result: the grand total, repeated on every row. `SUM(amount) OVER (PARTITION BY customer_id)` is the customer's total, on each of the customer's rows. `SUM(amount) OVER (ORDER BY placed_at)` is a running total: for each row, the sum of every row up to and including it in that order. **The rows are not collapsed. The aggregate is computed per window and written on each row that belongs to it.**" },

    { t: "code", lang: "sql", title: "Running total, grand total, share of total — one pass over paid orders",
      hl: [6, 7, 8],
      code: `WITH ot AS (                                                    -- one row per paid order with its amount (2.4)
  SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE  o.status = 'paid' GROUP BY 1, 2, 3
)
SELECT order_id, placed_at::DATE AS day, amount,
       SUM(amount) OVER (ORDER BY placed_at)                    AS running_total,   -- cumulative, in time order
       SUM(amount) OVER ()                                      AS grand_total,     -- the whole result, on every row
       ROUND(100.0 * amount / SUM(amount) OVER (), 1)           AS pct_of_total     -- a window inside an expression
FROM   ot ORDER BY placed_at;
-- order_id | day        | amount | running_total | grand_total | pct_of_total
-- 100      | 2025-01-05 | 42.00  | 42.00         | 697.90      | 6.0
-- 101      | 2025-01-06 | 85.00  | 127.00        | 697.90      | 12.2
-- 102      | 2025-01-20 | 76.00  | 203.00        | 697.90      | 10.9
-- 104      | 2025-02-10 | 85.40  | 288.40        | 697.90      | 12.2
-- 105      | 2025-02-11 | 27.50  | 315.90        | 697.90      | 3.9
-- 106      | 2025-02-25 | 139.00 | 454.90        | 697.90      | 19.9
-- 108      | 2025-03-15 | 116.50 | 571.40        | 697.90      | 16.7
-- 109      | 2025-03-18 | 42.00  | 613.40        | 697.90      | 6.0
-- 110      | 2025-03-27 | 32.00  | 645.40        | 697.90      | 4.6
-- 111      | 2025-04-04 | 52.50  | 697.90        | 697.90      | 7.5           (10 rows -- every order is still here)`,
      caption: "Ten orders in, ten rows out. The running total is the same SUM with an ORDER BY inside the window; the share is a window inside an ordinary expression. Nothing here needed a self-join or a subquery, which is what this would have cost before 2003."
    },

    { t: "dl", items: [
      ["Window function", "An aggregate or ranking function followed by `OVER (…)`. Computed over a set of rows related to the current row; the result is added to the row rather than replacing the set."],
      ["Window", "The set of rows the function sees for a given row: the partition, optionally limited by ordering and a frame (3.3)."],
      ["`PARTITION BY`", "Splits the rows into groups, like GROUP BY, but each group stays as its rows. Omit it and the window is the whole result."],
      ["`ORDER BY` (inside OVER)", "Orders the rows within the partition. For aggregates it makes the window cumulative — 'rows up to this one' — via the default frame (3.3). For ranking functions it defines the rank."],
      ["`OVER ()`", "The empty window: every row in the result is in one partition, unordered. The grand total."],
      ["`WINDOW w AS (…)`", "Names a window once so several functions can share it: `SUM(x) OVER w, AVG(x) OVER w`. Fewer repeated clauses, and the planner computes the partitioning once."]
    ]},

    { t: "viz",
      title: "GROUP BY collapses; OVER annotates",
      caption: "Both compute Asha's 234.50. GROUP BY returns one row per customer and loses the orders. OVER (PARTITION BY customer_id) returns every order with its customer's total beside it — the shape a per-row comparison or a share needs.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Left: three of Asha's order rows collapsing into one row with total 234.50 under GROUP BY. Right: the same three rows each retained with the total 234.50 and their share written beside them under OVER PARTITION BY.">
  <defs>
    <marker id="ov-ah-31" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">GROUP BY customer_id</text>
    <text x="470" y="36">SUM(amount) OVER (PARTITION BY customer_id)</text>
  </g>
  <g class="s-mono">
    <text x="30" y="70">Asha | 100 | 42.00</text><text x="30" y="88">Asha | 102 | 76.00</text><text x="30" y="106">Asha | 108 | 116.50</text>
  </g>
  <line x1="200" y1="90" x2="250" y2="90" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#ov-ah-31)"/>
  <rect x="260" y="74" width="170" height="30" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="272" y="94" class="s-mono">Asha | 234.50</text>
  <text x="30" y="150" class="s-sub">three rows become one; the orders are gone</text>

  <g class="s-mono">
    <text x="470" y="70">Asha | 100 | 42.00</text><text x="470" y="88">Asha | 102 | 76.00</text><text x="470" y="106">Asha | 108 | 116.50</text>
  </g>
  <line x1="640" y1="90" x2="690" y2="90" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#ov-ah-31)"/>
  <g class="s-mono" style="fill:var(--accent)">
    <text x="700" y="70">| 234.50 | 17.9 %</text><text x="700" y="88">| 234.50 | 32.4 %</text><text x="700" y="106">| 234.50 | 49.7 %</text>
  </g>
  <text x="470" y="150" class="s-sub">three rows stay three rows; the total is written beside each, and a share falls out</text>

  <line x1="30" y1="180" x2="850" y2="180" style="stroke:var(--line)" stroke-width="1"/>
  <text x="30" y="210" class="s-sub">Use GROUP BY when the output is per group. Use OVER when the output is per row and needs a group value — a share, a rank, a difference from the mean, a running sum.</text>
  <text x="30" y="232" class="s-sub">Both can appear in one query: GROUP BY first collapses to one row per order (the CTE), then OVER runs on those rows.</text>
</svg>`
    },

    { t: "h2", n: "02", text: "PARTITION BY: the group that stays as rows", id: "partition" },

    { t: "p", text: "PARTITION BY divides the rows exactly as GROUP BY would, and then the window function runs within each division. Add ORDER BY inside the same OVER and the aggregate becomes cumulative *within the partition*, restarting at each new customer. **Several windows can appear in one SELECT with different partitions and orders**, each computed independently — the per-customer total and the per-customer running total, side by side, from one scan." },

    { t: "code", lang: "sql", title: "Per-customer total, count, running total and share on every order",
      hl: [3, 4, 5, 6],
      code: `WITH ot AS ( ... one row per paid order, as above ... )
SELECT c.name, order_id, amount,
       SUM(amount)   OVER (PARTITION BY customer_id)                    AS customer_total,
       COUNT(*)      OVER (PARTITION BY customer_id)                    AS customer_orders,
       SUM(amount)   OVER (PARTITION BY customer_id ORDER BY placed_at) AS customer_running,
       ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
FROM   ot JOIN customers c USING (customer_id)
ORDER  BY customer_id, placed_at;
-- name  | order_id | amount | customer_total | customer_orders | customer_running | pct_of_customer
-- Asha  | 100      | 42.00  | 234.50         | 3               | 42.00            | 17.9
-- Asha  | 102      | 76.00  | 234.50         | 3               | 118.00           | 32.4
-- Asha  | 108      | 116.50 | 234.50         | 3               | 234.50           | 49.7
-- Bruno | 101      | 85.00  | 112.50         | 2               | 85.00            | 75.6
-- Bruno | 105      | 27.50  | 112.50         | 2               | 112.50           | 24.4
-- Chen  | 110      | 32.00  | 32.00          | 1               | 32.00            | 100.0
-- ...                                                                          (10 rows)
-- the GROUP BY version of customer_total returns 6 rows and no order_id:
-- SELECT customer_id, SUM(amount) FROM ot GROUP BY customer_id;    -- 1 234.50 · 2 112.50 · 3 32.00 · 4 139.00 · 5 137.90 · 6 42.00`,
      caption: "`customer_running` restarts at each customer because the ORDER BY lives inside a window that is partitioned. The two forms in one query — a per-order CTE from GROUP BY, then windows over it — is the standard shape: collapse to the grain you want, then annotate."
    },

    { t: "h2", n: "03", text: "Differences from the group, and the WINDOW clause", id: "difference" },

    { t: "p", text: "Because the window value sits on the row, it can be compared with the row's own value. Salary minus department average, amount as a share of the customer's total, a reading minus the sensor's running mean — the per-row-versus-its-group comparisons that a GROUP BY cannot express without a join back. **When several functions share one window, the WINDOW clause names it once**, which both shortens the query and lets the planner sort once for all of them." },

    { t: "code", lang: "sql", title: "Each salary against its department, with a named window",
      hl: [5, 8],
      code: `SELECT name, department, salary,
       ROUND(AVG(salary) OVER w)                                  AS dept_avg,
       salary - ROUND(AVG(salary) OVER w)                         AS diff_from_avg,
       ROUND(100.0 * salary / SUM(salary) OVER w, 1)              AS pct_of_dept_payroll,
       MAX(salary) OVER w                                         AS dept_max
FROM   employees
WINDOW w AS (PARTITION BY department)
ORDER  BY department, salary DESC;
-- name    | department  | salary | dept_avg | diff_from_avg | pct_of_dept_payroll | dept_max
-- Oscar   | engineering | 150000 | 125800   | 24200         | 23.8                | 150000
-- Tomas   | engineering | 131000 | 125800   | 5200          | 20.8                | 150000
-- Quentin | engineering | 125000 | 125800   | -800          | 19.9                | 150000
-- Rosa    | engineering | 125000 | 125800   | -800          | 19.9                | 150000
-- Sami    | engineering | 98000  | 125800   | -27800        | 15.6                | 150000
-- Nadia   | exec        | 190000 | 190000   | 0             | 100.0               | 190000
-- Priya   | sales       | 120000 | 90750    | 29250         | 33.1                | 120000
-- Viktor  | sales       | 91000  | 90750    | 250           | 25.1                | 120000
-- Uma     | sales       | 82000  | 90750    | -8750         | 22.6                | 120000
-- Wen     | sales       | 70000  | 90750    | -20750        | 19.3                | 120000`,
      caption: "`diff_from_avg` is a feature — the row's value relative to its group — computed without a join. In Data Handling 7.9 the same column came from a `groupby().transform()`; OVER (PARTITION BY) is the SQL of `transform`, and GROUP BY is the SQL of `agg`."
    },

    { t: "h2", n: "04", text: "Where a window function may appear", id: "where" },

    { t: "p", text: "A window function is evaluated at the SELECT step, after WHERE, GROUP BY and HAVING have finished (1.1). So it can appear in SELECT and in ORDER BY, and nowhere earlier: **`WHERE salary > AVG(salary) OVER (…)` is an error on every engine**, because the window has not been computed when WHERE runs. To filter on a window value, compute it in a subquery or CTE and filter outside — or use QUALIFY on the engines that have it. It also runs *after* GROUP BY, so a window over an aggregate — `SUM(SUM(amount)) OVER ()` — is legal and common: the outer SUM is the window, the inner one the group aggregate." },

    { t: "code", lang: "sql", title: "Filtering on a window value: wrap it",
      hl: [1, 5, 6, 7, 12],
      code: `SELECT name, salary FROM employees WHERE salary > AVG(salary) OVER (PARTITION BY department);
-- ERROR: window functions are not allowed in WHERE

-- the portable form: compute in a derived table, filter in the outer query
SELECT name, department, salary
FROM   (SELECT *, AVG(salary) OVER (PARTITION BY department) AS dept_avg FROM employees) t
WHERE  salary > dept_avg
ORDER  BY department, salary DESC;
-- Oscar 150000 · Tomas 131000 · Priya 120000 · Viktor 91000           (4 rows: above their department's mean)

-- DuckDB, Snowflake, BigQuery, Databricks: QUALIFY filters on window results without the wrapper
SELECT name, department, salary FROM employees
QUALIFY salary > AVG(salary) OVER (PARTITION BY department);

-- a window over a GROUP BY aggregate: share of total revenue per customer, from grouped rows
SELECT customer_id, SUM(amount) AS total, ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct
FROM   ot GROUP BY customer_id ORDER BY total DESC;
-- 1 234.50 33.6 · 4 139.00 19.9 · 5 137.90 19.8 · 2 112.50 16.1 · 6 42.00 6.0 · 3 32.00 4.6`,
      caption: "`SUM(SUM(amount)) OVER ()` reads oddly and is exactly right: GROUP BY runs first and produces one `SUM(amount)` per customer; the window then sums those six values. The nesting is the logical order made visible."
    },

    { t: "table",
      head: ["Clause", "Window function allowed?", "Why"],
      rows: [
        ["`SELECT`", "Yes", "Evaluated here, after grouping"],
        ["`ORDER BY`", "Yes", "Runs after SELECT; can sort by a window result"],
        ["`WHERE`", "No", "Runs before the window exists — wrap in a subquery, or QUALIFY"],
        ["`GROUP BY`, `HAVING`", "No", "Same reason; windows run over the grouped result"],
        ["`QUALIFY`", "Yes (DuckDB, Snowflake, BigQuery, Databricks)", "A clause defined to run after window evaluation"],
        ["Inside another window", "No", "`SUM(ROW_NUMBER() OVER …) OVER …` is an error; nest via a subquery"]
      ]
    },

    { t: "callout", kind: "mental", title: "agg versus transform", body: [
      { t: "p", text: "If you know pandas: **GROUP BY is `groupby().agg()` — one row per group — and OVER (PARTITION BY) is `groupby().transform()` — the group's value broadcast back to every row.** ORDER BY inside OVER is `cumsum` and friends; the frame in 3.3 is `rolling`. Every window pattern in this module has a pandas twin, and the SQL one runs where the data already is." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Every order in context",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Starting from one row per paid order with its amount, produce a result with every order and: its customer's order count and total; the order's share of the customer's total; the customer's running total in time order; the running total across *all* customers in time order; the difference between the order's amount and the average paid order amount; and the share of the grand total contributed by the customer's tier. Use a named WINDOW where several functions share a partition." },
        { t: "p", text: "Then list only the orders that were larger than their customer's average order, without QUALIFY." }
      ],
      requirements: [
        "A per-order CTE from GROUP BY, then windows over it.",
        "At least one named WINDOW reused by three functions.",
        "A window over an aggregate or a partition by a joined column (tier).",
        "The filtered list via a derived table, and verified output."
      ],
      hint: "The tier share needs the tier on the order row — join customers in the CTE — and then `SUM(amount) OVER (PARTITION BY tier) / SUM(amount) OVER ()`. For 'larger than the customer's average', the comparison column is `AVG(amount) OVER (PARTITION BY customer_id)`; filter it in an outer query.",
      solution: {
        lang: "sql",
        title: "orders_in_context.sql",
        code: `WITH ot AS (
  SELECT o.order_id, o.customer_id, c.name, c.tier, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN customers c ON c.customer_id = o.customer_id
  WHERE  o.status = 'paid' GROUP BY 1, 2, 3, 4, 5
)
SELECT name, order_id, amount,
       COUNT(*) OVER cust                                           AS cust_orders,
       SUM(amount) OVER cust                                        AS cust_total,
       ROUND(100.0 * amount / SUM(amount) OVER cust, 1)             AS pct_of_cust,
       SUM(amount) OVER (PARTITION BY customer_id ORDER BY placed_at) AS cust_running,
       SUM(amount) OVER (ORDER BY placed_at)                        AS running_all,
       ROUND(amount - AVG(amount) OVER (), 2)                       AS vs_avg_order,
       ROUND(100.0 * SUM(amount) OVER (PARTITION BY tier) / SUM(amount) OVER (), 1) AS tier_share
FROM   ot
WINDOW cust AS (PARTITION BY customer_id)
ORDER  BY placed_at;
-- name  | order_id | amount | cust_orders | cust_total | pct_of_cust | cust_running | running_all | vs_avg_order | tier_share
-- Asha  | 100      | 42.00  | 3           | 234.50     | 17.9        | 42.00        | 42.00       | -27.79       | 53.5
-- Bruno | 101      | 85.00  | 2           | 112.50     | 75.6        | 85.00        | 127.00      | 15.21        | 46.5
-- Asha  | 102      | 76.00  | 3           | 234.50     | 32.4        | 118.00       | 203.00      | 6.21         | 53.5
-- Emeka | 104      | 85.40  | 2           | 137.90     | 61.9        | 85.40        | 288.40      | 15.61        | 46.5
-- Bruno | 105      | 27.50  | 2           | 112.50     | 24.4        | 112.50       | 315.90      | -42.29       | 46.5
-- Dalia | 106      | 139.00 | 1           | 139.00     | 100.0       | 139.00       | 454.90      | 69.21        | 53.5
-- Asha  | 108      | 116.50 | 3           | 234.50     | 49.7        | 234.50       | 571.40      | 46.71        | 53.5
-- Fatou | 109      | 42.00  | 1           | 42.00      | 100.0       | 42.00        | 613.40      | -27.79       | 46.5
-- Chen  | 110      | 32.00  | 1           | 32.00      | 100.0       | 32.00        | 645.40      | -37.79       | 46.5
-- Emeka | 111      | 52.50  | 2           | 137.90     | 38.1        | 137.90       | 697.90      | -17.29       | 46.5

-- orders above their customer's average, without QUALIFY
SELECT name, order_id, amount, cust_avg
FROM   (SELECT name, order_id, amount, ROUND(AVG(amount) OVER (PARTITION BY customer_id), 2) AS cust_avg FROM ot) t
WHERE  amount > cust_avg ORDER BY order_id;
-- Bruno 101 85.00 (56.25) · Emeka 104 85.40 (68.95) · Asha 108 116.50 (78.17)`,
        notes: [
          { t: "p", text: "**Five windows, three partitionings, one scan.** The named window `cust` is reused by three functions; the two ORDER BY windows are separate because a cumulative sum needs its own ordering; `tier_share` divides one partition's sum by the empty window's sum on the same row." },
          { t: "p", text: "**`vs_avg_order` is the average of the ten order amounts** — 69.79 — not the average line item, because the CTE collapsed to order grain before the window ran. Grain first, windows second, every time." },
          { t: "p", text: "**The filtered list wraps the window in a derived table**, the portable form. Three orders exceed their customer's average; customers with one order are excluded because an amount cannot exceed its own average." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "What is the difference between `SUM(amount) OVER (PARTITION BY customer_id)` and `SUM(amount) … GROUP BY customer_id`?",
          options: [
            "None — they return the same rows",
            "Both compute the per-customer sum, but the window version keeps every input row and writes the sum on each, while GROUP BY collapses each customer to one row",
            "The window version ignores NULLs",
            "GROUP BY is a window with an empty frame"
          ],
          answer: 1,
          why: "OVER annotates; GROUP BY reduces. The window form is what you need when a per-row value must be compared with its group's value — a share, a difference, a rank."
        }
      ]
    }
  ],

  takeaways: [
    "**A window function is an aggregate whose result is written on each row instead of replacing the rows.**",
    "**`OVER ()` is the whole result; `OVER (PARTITION BY k)` is the group; adding `ORDER BY` inside makes an aggregate cumulative.**",
    "**GROUP BY is `agg`, OVER (PARTITION BY) is `transform`** — one row per group versus the group's value on every row.",
    "**Share of total is `x / SUM(x) OVER (…)`** — a window inside an ordinary expression.",
    "**Running totals restart at each partition** when the ORDER BY window is also partitioned.",
    "**`WINDOW w AS (…)` names a window once** for several functions; less repetition and one sort.",
    "**Window functions run at the SELECT step**: allowed in SELECT and ORDER BY, forbidden in WHERE, GROUP BY and HAVING.",
    "**To filter on a window value, wrap the query** in a subquery or CTE — or use QUALIFY where the engine has it.",
    "**A window over an aggregate is legal**: `SUM(SUM(x)) OVER ()` sums the grouped sums.",
    "**Collapse to the right grain first, then annotate** — the per-order CTE followed by windows is the standard shape."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `SELECT name, salary FROM employees WHERE salary > AVG(salary) OVER (PARTITION BY department)` fail?",
        options: [
          "AVG cannot be used as a window function",
          "Window functions are evaluated at the SELECT step, after WHERE; the value does not exist when WHERE runs — compute it in a subquery and filter outside, or use QUALIFY",
          "PARTITION BY needs an ORDER BY",
          "salary is an integer"
        ],
        answer: 1,
        why: "The logical order places windows after HAVING and before DISTINCT. Every engine rejects a window in WHERE; the derived-table wrapper is the portable fix."
      },
      {
        stem: "What does `SUM(amount) OVER (ORDER BY placed_at)` return for each row?",
        options: [
          "The grand total",
          "The sum of amounts for all rows up to and including the current one in placed_at order — a running total",
          "The amount of the previous row",
          "The sum for the current row's date only"
        ],
        answer: 1,
        why: "ORDER BY inside OVER makes an aggregate cumulative through the default frame (rows from the start of the partition to the current row, 3.3). Without the ORDER BY it would be the grand total on every row."
      },
      {
        stem: "`SUM(SUM(amount)) OVER ()` appears in a GROUP BY query. Is it valid?",
        options: [
          "No — aggregates cannot be nested",
          "Yes — the inner SUM is the group aggregate computed by GROUP BY; the outer SUM is a window over those grouped values, evaluated afterwards",
          "Only in DuckDB",
          "Yes, but it returns the same as the inner SUM"
        ],
        answer: 1,
        why: "Windows run after grouping, so the window's input is the grouped result. The nesting expresses share-of-total over groups in one query."
      },
      {
        stem: "Which pandas operation corresponds to `AVG(salary) OVER (PARTITION BY department)`?",
        options: [
          "`groupby('department').mean()`",
          "`groupby('department')['salary'].transform('mean')` — the group mean broadcast back onto every row",
          "`pivot_table`",
          "`rolling(3).mean()`"
        ],
        answer: 1,
        why: "agg reduces to one row per group; transform returns a value aligned to the original rows. OVER (PARTITION BY) is the SQL of transform."
      },
      {
        stem: "Two window functions in one SELECT use the same `PARTITION BY department`. What does `WINDOW w AS (PARTITION BY department)` buy you?",
        options: [
          "Different results",
          "One definition instead of two repeated clauses, and the planner can partition and sort once for both functions",
          "It makes the window cumulative",
          "It is required for two functions"
        ],
        answer: 1,
        why: "Named windows are a readability and efficiency feature. Functions with identical OVER clauses would usually be computed together anyway; the name makes the intent explicit and the query shorter."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What are window functions and how do they differ from GROUP BY?",
        strong: "A window function computes an aggregate or a ranking over a set of rows related to the current row — the window, defined by PARTITION BY and optionally ORDER BY — and writes the result on each row rather than collapsing the rows. GROUP BY reduces each group to one row; OVER keeps every row and annotates it with its group's value. So per-group totals are GROUP BY, while shares of total, running totals, ranks and differences from the group mean are windows. In pandas terms, GROUP BY is agg and OVER is transform. Windows are evaluated at the SELECT step, after WHERE and GROUP BY, which is why they cannot appear in WHERE and why a window over an aggregate is legal.",
        answer: [
          { t: "p", text: "The agg-versus-transform analogy and the evaluation-order point together cover both what they are and why they behave as they do." }
        ]
      },
      {
        level: "core",
        q: "How do you compute each employee's salary as a percentage of their department's payroll?",
        strong: "salary times 100 divided by SUM(salary) OVER (PARTITION BY department) — the window puts the department total on every row, and the division gives the share without a join or a subquery. If several functions need the same partition I name it with a WINDOW clause. The GROUP BY alternative would compute department totals as one row each and then need a join back to the employees, which is more code and a second pass.",
        answer: [
          { t: "p", text: "Reaching for the window rather than a join-back is the point; naming the WINDOW clause is a bonus." }
        ]
      },
      {
        level: "advanced",
        q: "How would you filter to rows above their group average, and what does the engine do with the window?",
        strong: "Compute AVG over the partition in a derived table or CTE, then filter on it in the outer query — or QUALIFY in DuckDB, Snowflake or BigQuery, which is defined to run after window evaluation. The engine cannot filter on the window in WHERE because WHERE precedes SELECT in the logical order, so the value does not exist yet. Execution-wise the planner sorts or hashes by the partition key, computes the aggregate per partition in one pass, attaches it to the rows, and only then applies the outer filter; the window is not recomputed per row. For large tables the sort on the partition key is the cost to watch in the plan.",
        answer: [
          { t: "p", text: "Knowing where the cost sits — the sort on the partition key — is what makes this an advanced answer." }
        ]
      }
    ]
  }
});

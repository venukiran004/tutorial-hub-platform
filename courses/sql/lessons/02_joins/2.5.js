/* ============================================================================
   LESSON 2.5 — Advanced Aggregation
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**A report that wants totals per country, per tier, and overall is three GROUP BYs — or one, with GROUPING SETS.** The aggregate toolbox beyond COUNT and SUM is small and worth knowing whole: subtotals at several levels in one pass, an aggregate that only sees some rows, a median that AVG cannot give, a list of names inside one cell, and the boolean and statistical aggregates that turn a group into a single fact. Each replaces a join, a subquery or a round trip to Python.",

  objectives: [
    "Produce subtotals and a grand total in one query with ROLLUP, CUBE and GROUPING SETS, and tell a subtotal NULL from a data NULL with GROUPING()",
    "Use FILTER to aggregate over a subset of each group",
    "Compute medians and percentiles with ordered-set aggregates and know how PERCENTILE_CONT differs from PERCENTILE_DISC",
    "Aggregate strings and arrays in a chosen order, and use the boolean and statistical aggregates"
  ],

  prerequisites: ["2.4"],

  blocks: [

    { t: "h2", n: "01", text: "Subtotals in one pass", id: "grouping" },

    { t: "p", text: "`GROUP BY country, tier` gives the finest level. A report usually also wants the per-country subtotal and the grand total, and the naive way is three queries UNIONed together, each rescanning the table. **`ROLLUP (country, tier)` computes the groupings `(country, tier)`, `(country)` and `()` in one scan; `CUBE` computes every combination; `GROUPING SETS` computes exactly the list you name.** The subtotal rows carry NULL in the column that was rolled up, and `GROUPING(col)` returns 1 on those rows so a real NULL — Dalia's country — is not mistaken for a subtotal." },

    { t: "code", lang: "sql", title: "ROLLUP with GROUPING(), and the same via GROUPING SETS",
      hl: [3, 4, 13, 22],
      code: `SELECT c.country, c.tier, COUNT(o.order_id) AS orders,
       GROUPING(c.country) AS g_country, GROUPING(c.tier) AS g_tier
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
GROUP  BY ROLLUP (c.country, c.tier)
ORDER  BY GROUPING(c.country), c.country NULLS LAST, GROUPING(c.tier), c.tier;
-- country | tier     | orders | g_country | g_tier
-- DE      | plus     | 0      | 0         | 0
-- DE      | standard | 2      | 0         | 0
-- DE      | NULL     | 2      | 0         | 1        <- subtotal for DE: tier is rolled up
-- ...
-- NULL    | plus     | 1      | 0         | 0        <- Dalia: a REAL NULL country, g_country = 0
-- NULL    | NULL     | 1      | 0         | 1        <- subtotal for the NULL country
-- NULL    | NULL     | 10     | 1         | 1        <- grand total: both rolled up            (15 rows)

-- just the per-country subtotals and the total: keep the rows where tier was rolled up
... HAVING GROUPING(c.tier) = 1
-- DE 2 · ES 0 · FR 1 · GB 4 · NG 2 · NULL 1 · [total] 10                              (7 rows)

-- name the groupings explicitly: per department, per hire year, and overall -- no (department, year) level
SELECT e.department, EXTRACT(year FROM e.hired_on) AS yr, COUNT(*) AS n, SUM(e.salary) AS payroll
FROM   employees e
GROUP  BY GROUPING SETS ((e.department), (EXTRACT(year FROM e.hired_on)), ())
ORDER  BY 1 NULLS LAST, 2 NULLS LAST;
-- engineering NULL 5 629000 · exec NULL 1 190000 · sales NULL 4 363000
-- NULL 2019 2 340000 · NULL 2020 2 245000 · ... · NULL 2024 1 70000
-- NULL NULL 10 1182000                                                                   (10 rows)`,
      caption: "Two of the 15 ROLLUP rows have `country = NULL` for different reasons: Dalia's unknown country, and the rolled-up total. `GROUPING()` is the only way to tell them apart, and `CASE WHEN GROUPING(c.country) = 1 THEN 'all' ELSE COALESCE(c.country, 'unknown') END` is how the report labels them."
    },

    { t: "dl", items: [
      ["`ROLLUP (a, b, c)`", "The groupings (a, b, c), (a, b), (a), (). A hierarchy: totals at each level of nesting. n + 1 grouping sets."],
      ["`CUBE (a, b)`", "Every subset: (a, b), (a), (b), (). 2ⁿ grouping sets — every cross-tabulation margin at once."],
      ["`GROUPING SETS (…)`", "Exactly the listed groupings. `()` is the grand total. ROLLUP and CUBE are shorthands for particular lists."],
      ["`GROUPING(col)`", "1 if `col` was rolled up on this row, 0 if it is a real group value. The only reliable way to label subtotal rows."],
      ["`FILTER (WHERE …)`", "Restricts one aggregate to the rows matching the condition, within the group. The standard's form of `SUM(CASE WHEN …)` (1.4)."],
      ["Ordered-set aggregate", "`f(x) WITHIN GROUP (ORDER BY y)`: an aggregate that needs its input sorted — percentiles, mode. PostgreSQL syntax; DuckDB has both this and `quantile_cont`."]
    ]},

    { t: "viz",
      title: "What ROLLUP and CUBE add",
      caption: "ROLLUP over (country, tier) computes the base grouping plus the per-country subtotals plus the total: a path down the hierarchy. CUBE adds the per-tier margins as well: every corner of the cross-tab.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A grid of country rows against tier columns with a row-total column and a column-total row; ROLLUP shades the cells plus the row totals and the grand total; CUBE additionally shades the column totals.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">ROLLUP (country, tier)</text>
    <text x="470" y="36">CUBE (country, tier)</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="130" y="66">plus</text><text x="200" y="66">standard</text><text x="290" y="66">Σ tier</text>
    <text x="570" y="66">plus</text><text x="640" y="66">standard</text><text x="730" y="66">Σ tier</text>
  </g>
  <g class="s-sub">
    <text x="30" y="96">DE</text><text x="30" y="126">GB</text><text x="30" y="156">…</text><text x="30" y="196">Σ country</text>
    <text x="470" y="96">DE</text><text x="470" y="126">GB</text><text x="470" y="156">…</text><text x="470" y="196">Σ country</text>
  </g>
  <!-- rollup: base cells + row totals + grand total -->
  <g style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)" stroke-width="1">
    <rect x="100" y="80" width="60" height="24" rx="3"/><rect x="170" y="80" width="60" height="24" rx="3"/>
    <rect x="100" y="110" width="60" height="24" rx="3"/><rect x="170" y="110" width="60" height="24" rx="3"/>
    <rect x="100" y="140" width="60" height="24" rx="3"/><rect x="170" y="140" width="60" height="24" rx="3"/>
  </g>
  <g style="fill:var(--warn);fill-opacity:.45;stroke:var(--warn)" stroke-width="1">
    <rect x="260" y="80" width="60" height="24" rx="3"/><rect x="260" y="110" width="60" height="24" rx="3"/><rect x="260" y="140" width="60" height="24" rx="3"/>
    <rect x="260" y="180" width="60" height="24" rx="3"/>
  </g>
  <g style="fill:none;stroke:var(--ink-4)" stroke-width="1" stroke-dasharray="3 3">
    <rect x="100" y="180" width="60" height="24" rx="3"/><rect x="170" y="180" width="60" height="24" rx="3"/>
  </g>
  <!-- cube: everything -->
  <g style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)" stroke-width="1">
    <rect x="540" y="80" width="60" height="24" rx="3"/><rect x="610" y="80" width="60" height="24" rx="3"/>
    <rect x="540" y="110" width="60" height="24" rx="3"/><rect x="610" y="110" width="60" height="24" rx="3"/>
    <rect x="540" y="140" width="60" height="24" rx="3"/><rect x="610" y="140" width="60" height="24" rx="3"/>
  </g>
  <g style="fill:var(--warn);fill-opacity:.45;stroke:var(--warn)" stroke-width="1">
    <rect x="700" y="80" width="60" height="24" rx="3"/><rect x="700" y="110" width="60" height="24" rx="3"/><rect x="700" y="140" width="60" height="24" rx="3"/>
    <rect x="700" y="180" width="60" height="24" rx="3"/>
    <rect x="540" y="180" width="60" height="24" rx="3"/><rect x="610" y="180" width="60" height="24" rx="3"/>
  </g>
  <g class="s-sub">
    <text x="30" y="240">base groups (blue) + per-country subtotals + grand total (amber). Per-tier margins are NOT computed.</text>
    <text x="470" y="240">every margin: 2ⁿ grouping sets for n columns.</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "FILTER, and aggregates that need an order", id: "filter" },

    { t: "p", text: "`FILTER (WHERE …)` after any aggregate restricts it to a subset of the group without touching the other aggregates in the same SELECT. Where a CASE inside SUM needs an `ELSE 0` and an AVG needs an `ELSE NULL`, FILTER needs nothing: the excluded rows are simply not there. **Percentiles and the mode are aggregates that need their input sorted**, which is what `WITHIN GROUP (ORDER BY …)` supplies: the median is `PERCENTILE_CONT(0.5)`, interpolated between the two middle values when the count is even, or `PERCENTILE_DISC(0.5)`, an actual value from the data." },

    { t: "code", lang: "sql", title: "Per-status figures with two filtered aggregates, then medians per department",
      hl: [2, 3, 10, 11],
      code: `SELECT o.status, COUNT(*) AS items,
       SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'kitchen') AS kitchen_rev,
       AVG(oi.unit_price)          FILTER (WHERE p.category = 'office')  AS office_avg_price
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id
GROUP  BY o.status ORDER BY 1;
-- cancelled | 1  | 64.00  | NULL          <- no office item in the cancelled order: NULL, not 0, and correctly so for an average
-- paid      | 17 | 139.00 | 15.825
-- refunded  | 1  | 45.00  | NULL

SELECT department,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median,
       PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY salary) AS median_disc,
       MIN(salary), MAX(salary), ROUND(AVG(salary)) AS mean
FROM   employees GROUP BY department ORDER BY department;
-- department  | median   | median_disc | min    | max    | mean
-- engineering | 125000   | 125000      | 98000  | 150000 | 125800
-- exec        | 190000   | 190000      | 190000 | 190000 | 190000
-- sales       | 86500    | 82000       | 70000  | 120000 | 90750     <- four salaries: CONT interpolates 82000..91000, DISC picks 82000
-- DuckDB also: quantile_cont(salary, 0.5), quantile_cont(salary, [0.25, 0.5, 0.75]). MySQL: no percentile aggregate -- window function + ROW_NUMBER (3.5).`,
      caption: "Sales' mean is 90,750 and its median 86,500, pulled apart by Priya's 120,000 — the usual reason to report the median. `PERCENTILE_CONT` gives a value that may not exist in the data; `PERCENTILE_DISC` gives one that does. Say which you mean; a reader will assume the latter."
    },

    { t: "h2", n: "03", text: "Lists, arrays, booleans and statistics", id: "others" },

    { t: "p", text: "Sometimes the group's answer is not a number. `STRING_AGG` builds a delimited list — with an ORDER BY inside the aggregate, so the list is in a chosen order — and `ARRAY_AGG` builds an array a client can unpack. `BOOL_AND` and `BOOL_OR` answer 'does every row' and 'does any row'. The statistical aggregates give a standard deviation, a correlation or a mode without leaving the query. **And `MAX_BY(x, y)` — `arg_max` in some dialects — returns the x on the row where y is greatest, which is the one 'value from a particular row' that an aggregate can do.**" },

    { t: "code", lang: "sql", title: "One cell per department holding a sorted list, a boolean fact, a spread and a chosen row",
      hl: [1, 7, 12],
      code: `SELECT department, STRING_AGG(name, ', ' ORDER BY salary DESC) AS by_pay, ARRAY_AGG(name ORDER BY hired_on) AS by_tenure
FROM   employees GROUP BY department ORDER BY department;
-- engineering | Oscar, Tomas, Quentin, Rosa, Sami | [Oscar, Quentin, Rosa, Tomas, Sami]
-- exec        | Nadia                             | [Nadia]
-- sales       | Priya, Viktor, Uma, Wen           | [Priya, Uma, Viktor, Wen]
-- MySQL: GROUP_CONCAT(name ORDER BY salary DESC SEPARATOR ', '). Snowflake, Oracle: LISTAGG(name, ', ') WITHIN GROUP (ORDER BY salary DESC).

SELECT department, BOOL_AND(salary > 80000) AS all_over_80k, BOOL_OR(salary > 140000) AS any_over_140k,
       ROUND(STDDEV_SAMP(salary)) AS sd, MODE() WITHIN GROUP (ORDER BY salary) AS modal
FROM   employees GROUP BY department ORDER BY department;
-- engineering | true  | true  | 18620 | 125000       <- 125000 twice: the mode; sd over five salaries
-- exec        | true  | true  | NULL  | 190000       <- sample sd of one value is undefined: NULL
-- sales       | false | false | 21313 | 70000        <- no repeats: MODE() returns the smallest

SELECT department, MAX_BY(name, salary) AS top_earner, MIN_BY(name, hired_on) AS longest_serving
FROM   employees GROUP BY department ORDER BY department;
-- engineering | Oscar | Oscar      MAX_BY: DuckDB, ClickHouse, Snowflake; PostgreSQL: DISTINCT ON or a window (2.4, 3.2)
-- exec        | Nadia | Nadia
-- sales       | Priya | Priya

SELECT ROUND(CORR(salary, DATE '2025-04-05' - hired_on), 3) AS corr_salary_tenure FROM employees;   -- 0.901`,
      caption: "`STRING_AGG` with an inner ORDER BY is the one place an aggregate's input order is part of the result. `MAX_BY` answers 'who earns most' in one aggregate; on engines without it, the whole-row question goes back to DISTINCT ON or ROW_NUMBER."
    },

    { t: "table",
      head: ["Aggregate", "Returns", "NULL handling", "Available"],
      rows: [
        ["`COUNT(*)`, `COUNT(x)`, `COUNT(DISTINCT x)`", "Rows / non-null / distinct non-null", "Only `COUNT(*)` counts NULL rows", "All"],
        ["`SUM`, `AVG`, `MIN`, `MAX`", "The obvious; AVG over non-null count", "Skipped; empty group → NULL", "All"],
        ["`… FILTER (WHERE c)`", "The aggregate over matching rows", "Non-matching rows simply absent", "PostgreSQL, DuckDB, SQLite; CASE elsewhere"],
        ["`PERCENTILE_CONT(p) WITHIN GROUP`", "Interpolated percentile", "Skipped", "PostgreSQL, DuckDB, SQL Server (as window), BigQuery (`PERCENTILE_CONT` window)"],
        ["`PERCENTILE_DISC(p) WITHIN GROUP`", "An actual value at or above p", "Skipped", "As above"],
        ["`STRING_AGG(x, sep ORDER BY …)`", "Delimited text", "NULLs skipped", "PostgreSQL, DuckDB, SQL Server, BigQuery; MySQL `GROUP_CONCAT`"],
        ["`ARRAY_AGG(x ORDER BY …)`", "Array", "NULLs kept unless filtered", "PostgreSQL, DuckDB, BigQuery"],
        ["`BOOL_AND`, `BOOL_OR` / `EVERY`", "Boolean", "Skipped", "PostgreSQL, DuckDB; `MIN(CASE …)` elsewhere"],
        ["`STDDEV_SAMP`, `VAR_SAMP`, `CORR`, `COVAR_*`, `REGR_*`", "Statistics", "Skipped; one row → NULL", "PostgreSQL, DuckDB, BigQuery, Snowflake"],
        ["`MODE() WITHIN GROUP`", "Most frequent value; smallest on ties", "Skipped", "PostgreSQL, DuckDB (`mode(x)`)"],
        ["`MAX_BY(x, y)` / `arg_max`", "x on the row with the greatest y", "—", "DuckDB, Snowflake, ClickHouse, BigQuery (`ANY_VALUE(x HAVING MAX y)`)"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Aggregate in SQL or in pandas?", body: [
      { t: "p", text: "Everything in this lesson exists in pandas too. The difference is where the rows are: a GROUPING SETS query moves three numbers per group across the network; a `SELECT *` followed by `groupby` moves every row. **Aggregate in SQL whenever the raw rows are not needed on the client** — which is nearly always for reporting, and rarely for feature engineering, where the row-level frame is the point. A median in SQL saves a round trip; a median of a column you were fetching anyway saves nothing." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A revenue cube, labelled honestly",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "Write one query over paid orders that reports revenue by product category and customer tier, with subtotals per category, subtotals per tier, and a grand total — every margin. Label the rolled-up dimensions `'all'` and the gift card's NULL category `'uncategorised'`, so no NULL appears in the output. Include for each row the number of distinct orders and the list of customer names in alphabetical order." },
        { t: "p", text: "Then, in a second query, give per category the median line-item amount, the share of line items over 30, and whether every item in the category cost at least 4." }
      ],
      requirements: [
        "CUBE or the equivalent GROUPING SETS, with GROUPING() used for the labels.",
        "Distinct order counts (the item join repeats orders) and an ordered STRING_AGG of distinct names.",
        "PERCENTILE_CONT, a FILTER-based share, and BOOL_AND in the second query.",
        "Verified output; the grand total must equal 697.90."
      ],
      hint: "STRING_AGG(DISTINCT name, ', ' ORDER BY name) is legal in PostgreSQL when the ORDER BY matches the DISTINCT expression. For the share, COUNT(*) FILTER (WHERE amount > 30) * 1.0 / COUNT(*). Check the grand total against 2.2's reconciliation figure.",
      solution: {
        lang: "sql",
        title: "revenue_cube.sql",
        code: `SELECT CASE WHEN GROUPING(p.category) = 1 THEN 'all' ELSE COALESCE(p.category, 'uncategorised') END AS category,
       CASE WHEN GROUPING(c.tier)     = 1 THEN 'all' ELSE c.tier END                             AS tier,
       SUM(oi.qty * oi.unit_price)                    AS revenue,
       COUNT(DISTINCT o.order_id)                     AS orders,
       STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) AS customers
FROM   orders o
JOIN   order_items oi ON oi.order_id   = o.order_id
JOIN   products    p  ON p.product_id  = oi.product_id
JOIN   customers   c  ON c.customer_id = o.customer_id
WHERE  o.status = 'paid'
GROUP  BY CUBE (p.category, c.tier)
ORDER  BY GROUPING(p.category), 1, GROUPING(c.tier), 2;
-- category      | tier     | revenue | orders | customers
-- audio         | plus     | 178.00  | 2      | Asha, Dalia
-- audio         | standard | 85.00   | 1      | Bruno
-- audio         | all      | 263.00  | 3      | Asha, Bruno, Dalia
-- kitchen       | plus     | 30.00   | 1      | Asha
-- kitchen       | standard | 109.00  | 2      | Chen, Emeka
-- kitchen       | all      | 139.00  | 3      | Asha, Chen, Emeka
-- office        | plus     | 115.50  | 3      | Asha
-- office        | standard | 105.40  | 4      | Bruno, Emeka, Fatou
-- office        | all      | 220.90  | 7      | Asha, Bruno, Emeka, Fatou
-- uncategorised | plus     | 50.00   | 1      | Dalia
-- uncategorised | standard | 25.00   | 1      | Emeka
-- uncategorised | all      | 75.00   | 2      | Dalia, Emeka
-- all           | plus     | 373.50  | 4      | Asha, Dalia
-- all           | standard | 324.40  | 6      | Bruno, Chen, Emeka, Fatou
-- all           | all      | 697.90  | 10     | Asha, Bruno, Chen, Dalia, Emeka, Fatou              (15 rows)

SELECT COALESCE(p.category, 'uncategorised') AS category,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY oi.qty * oi.unit_price)        AS median_item,
       ROUND(COUNT(*) FILTER (WHERE oi.qty * oi.unit_price > 30) * 1.0 / COUNT(*), 2) AS share_over_30,
       BOOL_AND(oi.unit_price >= 4)                                                AS all_at_least_4
FROM   order_items oi JOIN products p ON p.product_id = oi.product_id JOIN orders o ON o.order_id = oi.order_id
WHERE  o.status = 'paid'
GROUP  BY 1 ORDER BY 1;
-- audio         | 89.00 | 1.00 | true
-- kitchen       | 32.00 | 0.75 | true
-- office        | 27.50 | 0.25 | true
-- uncategorised | 37.50 | 0.50 | true`,
        notes: [
          { t: "p", text: "**The grand total is 697.90 — the reconciliation figure from 2.2** — which is the check that the cube did not fan out. Each row's `orders` is a distinct count because the item join repeats orders; a `COUNT(*)` would have reported 17 for the total." },
          { t: "p", text: "**Two kinds of NULL were labelled two ways**: `GROUPING() = 1` became `'all'`, and the gift card's data NULL became `'uncategorised'` through COALESCE. Without GROUPING() the two would have been indistinguishable, and the uncategorised subtotal would have looked like a second grand total." },
          { t: "p", text: "**`STRING_AGG(DISTINCT …)` collapsed the repeated names** that the item join produced. The sort inside the aggregate is what makes the cell deterministic — without it the list order could differ between runs." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In a `GROUP BY ROLLUP (country, tier)` result, two rows have `country = NULL`. How do you tell the subtotal from the customer with an unknown country?",
          options: [
            "By row order",
            "With `GROUPING(country)`: it is 1 on the rolled-up subtotal row and 0 on the row where NULL is the real data value",
            "The subtotal has a larger count",
            "You cannot — use separate queries"
          ],
          answer: 1,
          why: "ROLLUP writes NULL into a rolled-up column, which collides with genuine NULLs in the data. GROUPING() exists precisely to disambiguate, and drives the CASE that labels subtotal rows 'all'."
        }
      ]
    }
  ],

  takeaways: [
    "**ROLLUP, CUBE and GROUPING SETS compute several levels of aggregation in one scan** — subtotals, margins and the grand total without a UNION.",
    "**A rolled-up column is NULL on subtotal rows, and `GROUPING(col)` is how you tell that NULL from a data NULL.**",
    "**ROLLUP is a hierarchy (n + 1 sets); CUBE is every combination (2ⁿ); GROUPING SETS is exactly what you list.**",
    "**`FILTER (WHERE …)` restricts one aggregate to part of the group** with no ELSE to get wrong; excluded rows are simply absent.",
    "**PERCENTILE_CONT interpolates; PERCENTILE_DISC returns a real value** — say which you mean; the median is the 0.5 of either.",
    "**Ordered-set aggregates need `WITHIN GROUP (ORDER BY …)`** — percentiles and MODE cannot be computed without a sort.",
    "**STRING_AGG and ARRAY_AGG take an ORDER BY inside the aggregate**, which is the only thing that makes the resulting list deterministic.",
    "**BOOL_AND and BOOL_OR turn a group into a fact**: does every row, does any row.",
    "**Sample statistics of one row are NULL** — STDDEV_SAMP, CORR — not zero.",
    "**MAX_BY(x, y) is the one 'value from a chosen row' aggregate**; where it is missing, DISTINCT ON or ROW_NUMBER.",
    "**Aggregate in SQL when the client does not need the rows**; fetch the rows when it does. Both are cheap in the right place."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `GROUP BY CUBE (a, b)` compute that `ROLLUP (a, b)` does not?",
        options: [
          "The grand total",
          "The per-b margin — the grouping (b) with a rolled up; ROLLUP only walks down the hierarchy (a, b) → (a) → ()",
          "Nothing; they are equivalent",
          "The per-a subtotal"
        ],
        answer: 1,
        why: "ROLLUP gives n + 1 grouping sets along the nesting order; CUBE gives all 2ⁿ subsets. For two columns the difference is exactly the (b) margin."
      },
      {
        stem: "Why does `AVG(price) FILTER (WHERE category = 'office')` not need the `ELSE NULL` that `AVG(CASE WHEN category = 'office' THEN price ELSE NULL END)` does?",
        options: [
          "FILTER is faster",
          "FILTER removes the non-matching rows from the aggregate's input entirely, so there is no excluded row to contribute a value; the CASE form feeds every row and relies on NULL being skipped",
          "AVG ignores ELSE",
          "It does need it"
        ],
        answer: 1,
        why: "The two are equivalent only because AVG skips NULL. With the CASE form, ELSE 0 would drag the average down; FILTER has no such branch to get wrong."
      },
      {
        stem: "Four sales salaries: 70000, 82000, 91000, 120000. PERCENTILE_CONT(0.5) returns 86500 and PERCENTILE_DISC(0.5) returns 82000. Why do they differ?",
        options: [
          "One of them is wrong",
          "CONT interpolates between the two middle values (82000 and 91000); DISC returns the first actual value at or above the 50 % position",
          "DISC ignores the largest value",
          "CONT uses the mean"
        ],
        answer: 1,
        why: "With an even count there is no single middle row. CONT invents the midpoint; DISC picks a real one. Which is 'the median' is a convention you should state."
      },
      {
        stem: "`STRING_AGG(name, ', ')` gives a different order on two runs of the same query. Why, and what fixes it?",
        options: [
          "A bug in the engine",
          "Aggregate input order is undefined unless specified; add `ORDER BY name` inside the aggregate call",
          "Add ORDER BY to the outer query",
          "Use ARRAY_AGG instead"
        ],
        answer: 1,
        why: "The outer ORDER BY sorts result rows, not the rows fed to each aggregate. Only `STRING_AGG(x, sep ORDER BY …)` controls the order inside the cell."
      },
      {
        stem: "Which is the honest way to label subtotal rows 'all' when the grouped column can itself be NULL?",
        options: [
          "`COALESCE(country, 'all')`",
          "`CASE WHEN GROUPING(country) = 1 THEN 'all' ELSE COALESCE(country, 'unknown') END`",
          "`CASE WHEN country IS NULL THEN 'all' END`",
          "Filter out the NULL countries first"
        ],
        answer: 1,
        why: "Only GROUPING() distinguishes a rolled-up NULL from a data NULL; COALESCE alone would label Dalia's unknown country 'all' and merge two meanings into one word."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you produce a report with subtotals and a grand total in one query?",
        strong: "With GROUPING SETS, or its shorthands: ROLLUP for a hierarchy — country then tier then total — and CUBE for every margin. The engine computes all the groupings in one scan instead of the three UNIONed queries people write first. Rolled-up columns come back NULL on subtotal rows, which collides with real NULLs in the data, so I use GROUPING(col), which is 1 on subtotal rows, to label them 'all' in a CASE and to sort subtotals after their detail rows. And I check the grand total against a plain SUM over the base table, because the join under the report can fan out like any other.",
        answer: [
          { t: "p", text: "GROUPING() for labelling, and the reconciliation check, are the details that show it has been done in production." }
        ]
      },
      {
        level: "core",
        q: "How do you compute a median in SQL, and why is it not a plain aggregate like AVG?",
        strong: "A median depends on the order of the values, so it is an ordered-set aggregate: PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) in PostgreSQL and DuckDB, or quantile_cont in DuckDB. AVG can be computed by streaming a sum and a count; a median needs the sorted set, or at least a selection algorithm, which is why it costs more and why some engines — MySQL among them — do not offer it as an aggregate. There, the fallback is ROW_NUMBER and COUNT over a window and picking the middle row or rows. CONT interpolates between the two middle values for an even count; DISC returns an actual data value; I say which one the report uses.",
        answer: [
          { t: "p", text: "Explaining why a median cannot be streamed is what shows the concept is understood rather than the syntax memorised." }
        ]
      },
      {
        level: "advanced",
        q: "When would you aggregate in the database rather than in pandas?",
        strong: "Whenever the client does not need the rows. A GROUPING SETS query returns a few hundred numbers; the equivalent SELECT * and groupby moves every row over the network and into memory first. So reporting, monitoring, cohort and funnel numbers, and any check that reduces to a count belong in SQL. Feature engineering is the usual exception: the model needs the row-level frame anyway, so aggregating in SQL saves nothing and splits the logic across two languages. The other consideration is what the engine can do — percentiles, correlation, string aggregation are all there in PostgreSQL and DuckDB, less so in MySQL — and whether the result must be reproducible in a query someone else can run without a Python environment.",
        answer: [
          { t: "p", text: "The 'does the client need the rows' test is the whole decision, and stating the feature-engineering exception shows judgement rather than a rule." }
        ]
      }
    ]
  }
});

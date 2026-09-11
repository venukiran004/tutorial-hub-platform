/* ============================================================================
   LESSON 1.4 — CASE and Conditional Aggregation
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**CASE is an expression, not a statement.** It produces a value wherever a value is allowed — a SELECT column, a GROUP BY key, an ORDER BY key, the inside of a SUM — and that last place is the one that matters most. An aggregate over a CASE counts, sums or averages only the rows the condition picks out, which turns three queries with three WHERE clauses into one query with three columns. It is the mechanism behind every pivot, every conversion rate and every 'how many of each' you will write.",

  objectives: [
    "Write simple and searched CASE expressions and predict which branch fires when several conditions are true",
    "Use CASE as a bucketing key in GROUP BY and as a custom sort key in ORDER BY",
    "Replace several filtered queries with one conditional aggregation, in CASE form and FILTER form",
    "Avoid the three CASE mistakes: wrong branch order, a missing ELSE that returns NULL, and integer division in a rate"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "An expression with branches", id: "expression" },

    { t: "p", text: "The searched form tests conditions in order and returns the value of the **first** one that is true; if none is, it returns the ELSE value, or NULL when there is no ELSE. The simple form compares one expression against a list of values, which is shorter and cannot test ranges or NULL. Both are expressions: **the result has a type, all branches must agree on it, and it can be used anywhere a column can.**" },

    { t: "dl", items: [
      ["Searched CASE", "`CASE WHEN cond THEN v1 WHEN cond2 THEN v2 ELSE v3 END`. Conditions are evaluated top to bottom; the first true one wins; later ones are never tested."],
      ["Simple CASE", "`CASE expr WHEN a THEN v1 WHEN b THEN v2 ELSE v3 END`. Equality only. `WHEN NULL` never matches, because it compares with `=`."],
      ["ELSE", "The value when no WHEN is true. Omit it and the result is NULL — which is sometimes the point, and in a SUM is the trap in section 03."],
      ["Conditional aggregation", "An aggregate applied to a CASE, so the aggregate only sees the rows where the condition holds: `SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)`."],
      ["FILTER", "`COUNT(*) FILTER (WHERE cond)` — the standard's spelling of the same thing, supported by PostgreSQL, DuckDB and SQLite; MySQL and SQL Server use the CASE form."]
    ]},

    { t: "code", lang: "sql", title: "Bucketing, grouping by the bucket, and sorting by a rule",
      hl: [2, 10, 20],
      code: `SELECT name, unit_price,
       CASE WHEN unit_price < 10 THEN 'budget' WHEN unit_price < 40 THEN 'mid' ELSE 'premium' END AS band
FROM   products ORDER BY unit_price;
-- Notebook 4.20 budget · Gift card 25.00 mid · Desk lamp 27.50 mid · Kettle 32.00 mid
-- Toaster 45.00 premium · Headphones 89.00 premium

-- the same expression as a GROUP BY key: PostgreSQL and DuckDB accept the alias or the ordinal here
SELECT CASE WHEN unit_price < 10 THEN 'budget' WHEN unit_price < 40 THEN 'mid' ELSE 'premium' END AS band,
       COUNT(*) AS n, ROUND(AVG(unit_price), 2) AS avg_price
FROM   products
GROUP  BY 1
ORDER  BY MIN(unit_price);
-- band    | n | avg_price
-- --------+---+----------
-- budget  | 1 | 4.20
-- mid     | 3 | 28.17
-- premium | 2 | 67.00

-- a sort order that is a business rule, not alphabetical
SELECT order_id, status FROM orders
ORDER  BY CASE status WHEN 'paid' THEN 1 WHEN 'refunded' THEN 2 ELSE 3 END, order_id;
-- the ten paid orders first, then 103 refunded, then 107 cancelled`,
      caption: "The band expression appears in SELECT and in GROUP BY. Under the logical order of 1.1 the GROUP BY runs first, so on strict engines the expression must be repeated there; PostgreSQL lets you name the output column, and `GROUP BY 1` is the portable shorthand for 'the first select item'."
    },

    { t: "callout", kind: "trap", title: "The first true WHEN wins, so order the branches from narrowest to widest", body: [
      { t: "p", text: "`CASE WHEN salary > 90000 THEN 'C' WHEN salary > 120000 THEN 'B' … END` grades every engineer 'C', because 150,000 satisfies the first condition and the second is never reached. **Write overlapping ranges from the most specific downward** — `> 140000` before `> 120000` before `> 90000` — or make them non-overlapping. The engine will not warn you; it just returns the first match." }
    ]},

    { t: "h2", n: "02", text: "Conditional aggregation: one query, many filters", id: "conditional" },

    { t: "p", text: "The question 'how many orders are paid, refunded and cancelled' is three filters on one table. Three queries would scan the table three times and return three numbers you then have to line up. **One aggregate per condition, inside one query, scans once and returns one row** — and because each aggregate has its own condition, the columns can count different things from the same rows." },

    { t: "code", lang: "sql", title: "Three counts from one pass, in both spellings",
      hl: [2, 3, 4, 10],
      code: `SELECT COUNT(*)                                            AS orders,
       SUM(CASE WHEN status = 'paid'      THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'refunded'  THEN 1 ELSE 0 END) AS refunded,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM   orders;
-- orders | paid | refunded | cancelled
-- 12     | 10   | 1        | 1

-- the same, with FILTER: reads as what it is, and the aggregate can be anything, not just SUM
SELECT COUNT(*)                                       AS orders,
       COUNT(*)      FILTER (WHERE status = 'paid')   AS paid,
       COUNT(*)      FILTER (WHERE status = 'refunded') AS refunded,
       COUNT(*)      FILTER (WHERE status = 'cancelled') AS cancelled
FROM   orders;

-- per group, with a share: how senior is each department
SELECT department, COUNT(*) AS n,
       COUNT(*) FILTER (WHERE salary >= 120000) AS senior,
       ROUND(100.0 * COUNT(*) FILTER (WHERE salary >= 120000) / COUNT(*), 1) AS pct_senior
FROM   employees GROUP BY department ORDER BY department;
-- department  | n | senior | pct_senior
-- engineering | 5 | 4      | 80.0
-- exec        | 1 | 1      | 100.0
-- sales       | 4 | 1      | 25.0`,
      caption: "`FILTER` works with any aggregate — `AVG(amount) FILTER (WHERE status = 'paid')` — where the CASE form needs an ELSE NULL so the excluded rows do not drag the average down. On engines without FILTER, `SUM(CASE …)` and `AVG(CASE … ELSE NULL END)` are the equivalents."
    },

    { t: "viz",
      title: "One scan, three conditions",
      caption: "Every row passes each conditional aggregate once. A row contributes to the column whose condition it satisfies and adds nothing to the others — the table is read one time, not three.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Twelve order rows on the left flow into three counters on the right — paid, refunded, cancelled — each row lighting up exactly one counter; totals 10, 1 and 1.">
  <defs>
    <marker id="ca-ah-14" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <text x="40" y="40" class="s-label" style="font-weight:600">orders · one pass</text>
  <g class="s-mono">
    <text x="40" y="70">100 paid</text><text x="40" y="88">101 paid</text><text x="40" y="106">102 paid</text><text x="40" y="124" style="fill:var(--warn)">103 refunded</text>
    <text x="40" y="142">104 paid</text><text x="40" y="160">105 paid</text><text x="40" y="178">106 paid</text><text x="40" y="196" style="fill:var(--crit)">107 cancelled</text>
    <text x="180" y="70">108 paid</text><text x="180" y="88">109 paid</text><text x="180" y="106">110 paid</text><text x="180" y="124">111 paid</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <path d="M300,130 L400,130" marker-end="url(#ca-ah-14)"/>
  </g>
  <text x="350" y="118" class="s-sub" text-anchor="middle">each row</text>
  <g stroke-width="1.4">
    <rect x="420" y="50" width="400" height="44" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="420" y="108" width="400" height="44" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="420" y="166" width="400" height="44" rx="7" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
  </g>
  <g class="s-mono">
    <text x="434" y="77">SUM(CASE WHEN status = 'paid'      THEN 1 ELSE 0 END)</text>
    <text x="434" y="135">SUM(CASE WHEN status = 'refunded'  THEN 1 ELSE 0 END)</text>
    <text x="434" y="193">SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)</text>
  </g>
  <g class="s-label" text-anchor="end" style="font-weight:600">
    <text x="850" y="77" style="fill:var(--good)">10</text>
    <text x="850" y="135" style="fill:var(--warn)">1</text>
    <text x="850" y="193" style="fill:var(--crit)">1</text>
  </g>
  <text x="420" y="236" class="s-sub">A row adds 1 to the column whose condition it meets and 0 to the others. Three WHERE-filtered queries would read the twelve rows three times.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "The three mistakes", id: "mistakes" },

    { t: "p", text: "Conditional aggregation is short enough to write quickly and quiet enough to be wrong quietly. The three failures are worth knowing by shape. **A SUM over a CASE without ELSE returns NULL when nothing matches**, not zero — `SUM(CASE WHEN status = 'shipped' THEN 1 END)` is NULL on this table, and a downstream `+` turns the whole total NULL. **A rate computed as integer over integer is integer division** in PostgreSQL and SQL Server: `SUM(paid) / COUNT(*)` is `10 / 12`, which is 0. **A CASE with overlapping branches in the wrong order** was section 01." },

    { t: "code", lang: "sql", title: "NULL where you wanted 0, and 0 where you wanted 0.83",
      hl: [1, 5, 9, 10],
      code: `SELECT SUM(CASE WHEN status = 'shipped' THEN 1 END)        AS no_else,     -- no ELSE: every row contributes NULL
       SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS with_else
FROM   orders;
-- no_else | with_else
-- NULL    | 0                      <- SUM of all-NULL is NULL, and NULL + anything is NULL downstream

-- the rate: three spellings, one of them wrong on PostgreSQL and SQL Server
SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) / COUNT(*)          AS int_rate,   -- 0  (10 / 12 in integer arithmetic)
       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) * 1.0 / COUNT(*)    AS rate,       -- 0.8333
       AVG(CASE WHEN status = 'paid' THEN 1.0 ELSE 0 END)                   AS rate2       -- 0.8333: the mean of a 0/1 column is the share
FROM   orders;
-- MySQL, DuckDB and SQLite 3.x with REAL affinity divide as decimals here; PostgreSQL and SQL Server truncate.
-- Write the 1.0 or the CAST every time and the query means the same thing on every engine.`,
      caption: "`AVG` of a 0/1 CASE is the cleanest rate: it cannot integer-divide and it reads as 'the share of rows where'. Add `FILTER (WHERE …)` or a WHERE if the denominator should be a subset rather than every row."
    },

    { t: "h2", n: "04", text: "A pivot is a conditional aggregation per column", id: "pivot" },

    { t: "p", text: "Revenue per customer *per category* is a table with one row per customer and one column per category. There is no column per category in the data; there is a category value on each line item. **A CASE per category inside a SUM makes the columns**, and 4.4 shows the native PIVOT syntax that some engines add on top — it compiles to exactly this." },

    { t: "code", lang: "sql", title: "Rows into columns with one SUM(CASE) per column",
      code: `SELECT c.name,
       SUM(CASE WHEN p.category = 'kitchen' THEN oi.qty * oi.unit_price ELSE 0 END) AS kitchen,
       SUM(CASE WHEN p.category = 'office'  THEN oi.qty * oi.unit_price ELSE 0 END) AS office,
       SUM(CASE WHEN p.category = 'audio'   THEN oi.qty * oi.unit_price ELSE 0 END) AS audio,
       SUM(CASE WHEN p.category IS NULL     THEN oi.qty * oi.unit_price ELSE 0 END) AS uncategorised
FROM   orders o
JOIN   customers   c  ON c.customer_id = o.customer_id
JOIN   order_items oi ON oi.order_id   = o.order_id
JOIN   products    p  ON p.product_id  = oi.product_id
WHERE  o.status = 'paid'
GROUP  BY c.name
ORDER  BY c.name;
-- name  | kitchen | office | audio | uncategorised
-- ------+---------+--------+-------+--------------
-- Asha  | 30.00   | 115.50 | 89.00 | 0.00
-- Bruno | 0.00    | 27.50  | 85.00 | 0.00
-- Chen  | 32.00   | 0.00   | 0.00  | 0.00
-- Dalia | 0.00    | 0.00   | 89.00 | 50.00
-- Emeka | 77.00   | 35.90  | 0.00  | 25.00
-- Fatou | 0.00    | 42.00  | 0.00  | 0.00
-- (6 rows: Iker's order was cancelled, Mara never ordered)`,
      caption: "The gift card's NULL category needed its own `IS NULL` branch — `= NULL` would have matched nothing (1.2) and its 75.00 would have vanished from every column with no row count to warn you. Conditional aggregation over a nullable column always needs the NULL bucket written out."
    },

    { t: "ladder",
      title: "Counting orders by status",
      rungs: [
        { level: "bad", label: "One query per status", code: `SELECT COUNT(*) FROM orders WHERE status = 'paid';
SELECT COUNT(*) FROM orders WHERE status = 'refunded';
SELECT COUNT(*) FROM orders WHERE status = 'cancelled';`,
          note: "**Three scans, three round trips, three numbers to line up** — and no total unless you run a fourth." },
        { level: "ok", label: "GROUP BY status", code: `SELECT status, COUNT(*) FROM orders GROUP BY status;`,
          note: "**One scan and correct.** The result is three rows, which is right for a report and wrong for a dashboard cell that wants one row with three named columns — and a status with zero orders produces no row at all." },
        { level: "best", label: "Conditional aggregation", code: `SELECT COUNT(*) FILTER (WHERE status = 'paid')      AS paid,
       COUNT(*) FILTER (WHERE status = 'refunded')  AS refunded,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
       COUNT(*) FILTER (WHERE status = 'shipped')   AS shipped     -- 0, not a missing row
FROM   orders;`,
          note: "**One scan, one row, every column present even when its count is zero.** The shape a caller can index by name, and the form every pivot reduces to." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A one-row customer scorecard",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Write a single query over `orders` and `order_items` that returns one row per customer who has at least one order, with: total orders; paid orders; the paid share as a decimal; paid revenue; revenue from `kitchen` products; and a `segment` label — `'high'` if paid revenue is 100 or more, `'mid'` if 50 or more, otherwise `'low'`. Every column must be non-NULL for every customer, including Iker, whose only order was cancelled." },
        { t: "p", text: "Then add a `most_recent` column with the status of the customer's latest order, using ORDER BY inside a CASE-free expression of your choice — or explain why that one needs a window function (3.4)." }
      ],
      requirements: [
        "One query, one row per ordering customer, no NULLs in any column.",
        "The paid share computed so that it cannot integer-divide.",
        "A CASE for the segment with branches in an order that cannot misfire.",
        "Verified output for Asha, Emeka and Iker."
      ],
      hint: "Revenue needs order_items; join it and remember each order has several items, so COUNT(*) is no longer orders — count DISTINCT order_id, or aggregate per order first. Iker's kitchen revenue should be 0.00, not NULL: every SUM(CASE …) needs its ELSE 0.",
      solution: {
        lang: "sql",
        title: "scorecard.sql",
        code: `SELECT c.name,
       COUNT(DISTINCT o.order_id)                                              AS orders,
       COUNT(DISTINCT o.order_id) FILTER (WHERE o.status = 'paid')            AS paid_orders,
       ROUND(COUNT(DISTINCT o.order_id) FILTER (WHERE o.status = 'paid') * 1.0
             / COUNT(DISTINCT o.order_id), 2)                                 AS paid_share,
       SUM(CASE WHEN o.status = 'paid' THEN oi.qty * oi.unit_price ELSE 0 END) AS paid_revenue,
       SUM(CASE WHEN o.status = 'paid' AND p.category = 'kitchen'
                THEN oi.qty * oi.unit_price ELSE 0 END)                        AS kitchen_revenue,
       CASE WHEN SUM(CASE WHEN o.status = 'paid' THEN oi.qty * oi.unit_price ELSE 0 END) >= 100 THEN 'high'
            WHEN SUM(CASE WHEN o.status = 'paid' THEN oi.qty * oi.unit_price ELSE 0 END) >= 50  THEN 'mid'
            ELSE 'low' END                                                     AS segment
FROM   customers   c
JOIN   orders      o  ON o.customer_id = c.customer_id
JOIN   order_items oi ON oi.order_id   = o.order_id
JOIN   products    p  ON p.product_id  = oi.product_id
GROUP  BY c.name
ORDER  BY paid_revenue DESC;
-- name  | orders | paid_orders | paid_share | paid_revenue | kitchen_revenue | segment
-- ------+--------+-------------+------------+--------------+-----------------+--------
-- Asha  | 3      | 3           | 1.00       | 234.50       | 30.00           | high
-- Dalia | 1      | 1           | 1.00       | 139.00       | 0.00            | high
-- Emeka | 2      | 2           | 1.00       | 137.90       | 77.00           | high
-- Bruno | 2      | 2           | 1.00       | 112.50       | 0.00            | high
-- Fatou | 1      | 1           | 1.00       | 42.00        | 0.00            | low
-- Chen  | 2      | 1           | 0.50       | 32.00        | 32.00           | low
-- Iker  | 1      | 0           | 0.00       | 0.00         | 0.00            | low

-- most_recent: the status of the latest order is a value from ONE row, chosen by ordering --
-- an aggregate cannot pick it (MAX(status) is alphabetical, not latest). It needs a window
-- function (FIRST_VALUE over ORDER BY placed_at DESC, 3.4) or a correlated subquery (4.1).`,
        notes: [
          { t: "p", text: "**`COUNT(DISTINCT o.order_id)` instead of `COUNT(*)`** because the join to order_items multiplied orders into line items; counting rows would say Asha has 6 orders. The share uses `* 1.0` so PostgreSQL does not truncate 1 / 2 to 0." },
          { t: "p", text: "**Every SUM(CASE …) carries `ELSE 0`**, which is why Iker's row reads 0.00 rather than NULL and the segment CASE can compare it. The segment branches run from 100 down to 50 so the widest condition is tested last." },
          { t: "p", text: "**The latest status is not an aggregation question.** An aggregate combines all the rows in the group; 'the value from the most recent row' selects one of them by order, which is what window functions and correlated subqueries are for. Recognising that boundary is the skill." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT SUM(CASE WHEN status = 'paid' THEN 1 END) / COUNT(*) FROM orders` returns 0 in PostgreSQL though 10 of 12 orders are paid. Why?",
          options: [
            "The CASE has no ELSE, so the SUM is NULL",
            "Both sides are integers, so the division is integer division: 10 / 12 truncates to 0. Multiply by 1.0, cast, or use AVG of a 0/1 CASE",
            "COUNT(*) is 0",
            "SUM cannot be divided"
          ],
          answer: 1,
          why: "The missing ELSE does not matter here — SUM skips the NULLs and still gives 10. The problem is integer arithmetic on the result. `AVG(CASE WHEN status = 'paid' THEN 1.0 ELSE 0 END)` gives 0.8333 on every engine."
        }
      ]
    }
  ],

  takeaways: [
    "**CASE is an expression**: it has a type, all branches must agree, and it goes anywhere a value goes — SELECT, GROUP BY, ORDER BY, inside an aggregate.",
    "**The first true WHEN wins.** Order overlapping ranges from narrowest to widest, or the wide one swallows the rest.",
    "**No ELSE means NULL.** In a SUM that is NULL when nothing matches, and NULL poisons every total downstream — write `ELSE 0`.",
    "**Simple CASE compares with `=`**, so `WHEN NULL` never fires; use the searched form with `IS NULL`.",
    "**Conditional aggregation replaces n filtered queries with one scan and one row** — a column per condition, each seeing only its rows.",
    "**`FILTER (WHERE …)` is the standard spelling** and works with any aggregate; `SUM(CASE …)` and `AVG(CASE … ELSE NULL END)` are the portable forms.",
    "**Integer over integer truncates** in PostgreSQL and SQL Server; write `* 1.0`, a CAST, or `AVG` of a 0/1 CASE for a rate.",
    "**A pivot is one SUM(CASE) per output column** — native PIVOT syntax compiles to it.",
    "**A nullable column in a conditional aggregation needs its NULL bucket written out** — `= NULL` matches nothing and the rows vanish without a warning.",
    "**A value from one chosen row is not an aggregation** — 'the latest status' needs a window function or a correlated subquery, not MAX."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`CASE WHEN salary > 90000 THEN 'C' WHEN salary > 120000 THEN 'B' WHEN salary > 140000 THEN 'A' ELSE 'D' END` grades a 190,000 salary as 'C'. Why?",
        options: [
          "The comparisons are the wrong way round",
          "CASE returns the first true branch; 190,000 > 90,000 is true first, so 'C' is returned and the later branches are never tested — order the branches from the highest threshold down",
          "'A' needs to be first alphabetically",
          "The ELSE overrides"
        ],
        answer: 1,
        why: "Branches are evaluated top to bottom and evaluation stops at the first true condition. Overlapping ranges must be ordered from most specific to least, or made disjoint."
      },
      {
        stem: "Which expression gives the share of paid orders correctly on every engine?",
        options: [
          "`SUM(CASE WHEN status = 'paid' THEN 1 END) / COUNT(*)`",
          "`AVG(CASE WHEN status = 'paid' THEN 1.0 ELSE 0 END)`",
          "`COUNT(status = 'paid') / COUNT(*)`",
          "`SUM(status = 'paid')`"
        ],
        answer: 1,
        why: "AVG of a 0/1 column is the share, and the decimal literal keeps the arithmetic non-integer. The first truncates on PostgreSQL and SQL Server; the third counts non-null booleans (every row); the fourth only works where booleans are integers."
      },
      {
        stem: "A pivot by category loses the revenue of products whose category is NULL. What is wrong with `SUM(CASE WHEN category = NULL THEN … END)`?",
        options: [
          "NULL must be quoted",
          "`category = NULL` is unknown for every row, so that branch never fires; write `category IS NULL`",
          "SUM cannot handle NULL",
          "The pivot needs GROUP BY category"
        ],
        answer: 1,
        why: "The same three-valued rule as WHERE: a CASE branch fires only when its condition is true, and `= NULL` never is. The rows are not counted anywhere and no row count reveals it."
      },
      {
        stem: "Why does `GROUP BY status` give a less useful result than three conditional counts when a dashboard wants paid, refunded and cancelled as named cells?",
        options: [
          "GROUP BY is slower",
          "GROUP BY returns one row per status that exists, so a status with no orders produces no row and the caller has to pivot and fill zeros; conditional aggregation returns one row with every column present, zero included",
          "GROUP BY cannot count",
          "GROUP BY requires an index"
        ],
        answer: 1,
        why: "Both scan once. The difference is shape and completeness: rows-per-group versus columns-per-condition, and a missing group versus a zero."
      },
      {
        stem: "`COUNT(*) FILTER (WHERE amount > 100)` fails on MySQL. What is the equivalent?",
        options: [
          "`COUNT(amount > 100)`",
          "`SUM(CASE WHEN amount > 100 THEN 1 ELSE 0 END)` — the CASE form is portable to every engine",
          "`COUNT(*) WHERE amount > 100`",
          "There is none"
        ],
        answer: 1,
        why: "FILTER is standard SQL but MySQL and SQL Server do not implement it. The CASE inside the aggregate is the universal form; for AVG the excluded rows need ELSE NULL rather than ELSE 0."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is conditional aggregation and when do you use it?",
        strong: "An aggregate applied to a CASE — or with a FILTER clause — so that it only counts, sums or averages the rows that satisfy a condition. I use it whenever a result needs several differently-filtered numbers from the same rows: counts per status as columns, a conversion rate as AVG of a 0/1, a pivot of revenue by category. It scans the table once and returns one row with every column present, including zeros, where GROUP BY would return one row per group and omit the empty ones. The things I check: ELSE 0 so no column is NULL, decimal arithmetic for rates, and an explicit IS NULL branch for nullable categories.",
        answer: [
          { t: "p", text: "Naming the three checks — ELSE 0, decimal rates, the NULL bucket — is what shows this has been used for real." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between a simple and a searched CASE, and where can CASE be used?",
        strong: "Simple CASE compares one expression against literal values with equality — shorter, but it cannot test ranges, compound conditions or NULL, because WHEN NULL compares with = and never matches. Searched CASE tests arbitrary boolean conditions in order and returns the first true branch. Both are expressions with a type, so they can appear in SELECT, in GROUP BY as a bucketing key, in ORDER BY as a custom sort, inside aggregates, in WHERE, and in an UPDATE's SET. The only place CASE is not is a statement: there is no branching of control flow in a query.",
        answer: [
          { t: "p", text: "The 'expression, not a statement' framing is what lets a candidate place CASE correctly in every clause." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague's rate query returns 0 in production and 0.83 in their notebook. Same SQL. What happened?",
        strong: "Two engines, two arithmetic rules. The query divides an integer SUM by an integer COUNT; production is PostgreSQL or SQL Server, which do integer division and truncate 10 / 12 to 0, and the notebook is DuckDB, MySQL or SQLite, which return a decimal. The fix is to make the arithmetic explicit — multiply by 1.0, cast one side to NUMERIC, or compute the rate as AVG of a 0/1 CASE — so the query means the same thing everywhere. The general lesson is that a query tested on one engine is not tested; anything involving division, string comparison, NULL sorting or date arithmetic should be checked on the engine it will run on.",
        answer: [
          { t: "p", text: "Diagnosing it from the two numbers alone, and generalising to 'tested on one engine is not tested', is the answer of someone who has shipped SQL." }
        ]
      }
    ]
  }
});

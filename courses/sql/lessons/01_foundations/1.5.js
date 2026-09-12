/* ============================================================================
   LESSON 1.5 — Strings, Dates and Types
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**Every value in a query has a type, and most silent errors are a type doing what it was told.** `0.1 + 0.2` is not `0.3` in a FLOAT column and is in a NUMERIC one; `7 / 2` is 3 in PostgreSQL; `'Country: ' || NULL` is NULL; 31 January plus one month is 28 February. None of these is a bug in the engine. This lesson is the type system's rules — casting, arithmetic, the string toolbox, and the date functions that make time-series SQL possible — with the one rule that keeps them fast: transform the literal, not the column.",

  objectives: [
    "Cast explicitly, use the safe-cast function your engine offers, and choose NUMERIC over FLOAT for money",
    "Predict integer division, NULL propagation through `||`, and month-end clamping before running them",
    "Use the string functions that clean, split, pad and search text",
    "Truncate, extract, shift and generate dates — including a date spine that shows the months with no rows"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "Casting, and what the number types promise", id: "types" },

    { t: "p", text: "A cast converts a value from one type to another, and fails when it cannot: `CAST('4.2x' AS INTEGER)` is an error, not a NULL. **Every engine has a lenient form** — `TRY_CAST` in DuckDB and SQL Server, `SAFE_CAST` in BigQuery, a `CASE` with a regex check in PostgreSQL before 16 — that returns NULL instead, which is the one to use on data you did not produce. The numeric types promise different things: INTEGER is exact and divides as integers; NUMERIC(p, s) is exact decimal and slow; FLOAT is a binary approximation that is fast and cannot represent 0.1." },

    { t: "code", lang: "sql", title: "Casts that fail, casts that return NULL, and the float that is not 0.3",
      hl: [1, 4, 8, 12],
      code: `SELECT CAST('42' AS INTEGER) AS a, '42'::INTEGER + 1 AS b;               -- 42 | 43   (:: is PostgreSQL and DuckDB shorthand)
SELECT CAST('4.2x' AS INTEGER);                                             -- ERROR: invalid input syntax for type integer

SELECT TRY_CAST('4.2x' AS INTEGER) AS c;                                    -- NULL  (DuckDB, SQL Server; BigQuery: SAFE_CAST)
-- PostgreSQL 16+: SELECT CASE WHEN pg_input_is_valid('4.2x', 'integer') THEN '4.2x'::integer END;
-- older PostgreSQL: CASE WHEN col ~ '^-?[0-9]+$' THEN col::integer END

SELECT 0.1::DOUBLE + 0.2::DOUBLE = 0.3::DOUBLE AS float_eq,                 -- false
       0.1 + 0.2 = 0.3                          AS numeric_eq,              -- true   (decimal literals are NUMERIC)
       0.1::DOUBLE + 0.2::DOUBLE                AS float_sum;               -- 0.30000000000000004

SELECT 7 / 2 AS div, 7 % 2 AS modulo, 7.0 / 2 AS dec_div;
-- PostgreSQL, SQL Server: 3 | 1 | 3.5       integer / integer truncates
-- DuckDB, MySQL, SQLite: 3.5 | 1 | 3.5      DuckDB spells integer division as 7 // 2`,
      caption: "Money is NUMERIC, never FLOAT: a sum of ten thousand floats drifts, and an equality test on one fails. Ratios and rates are where integer division bites — write `7.0 / 2`, `x * 1.0 / y`, or a CAST, and the query means the same thing on every engine (1.4)."
    },

    { t: "dl", items: [
      ["INTEGER / BIGINT", "Exact whole numbers; 4 or 8 bytes. Integer arithmetic stays integer, including division. IDs, counts, cents."],
      ["NUMERIC(p, s) / DECIMAL", "Exact decimal with p digits, s after the point. Arbitrary precision, slower arithmetic. Money, anything summed and compared."],
      ["FLOAT / DOUBLE PRECISION", "Binary floating point. Fast, approximate, cannot hold 0.1 exactly. Measurements, scores, anything a model produces."],
      ["TEXT / VARCHAR(n)", "Strings. In PostgreSQL the two are the same underneath; `VARCHAR(n)` adds a length check. Comparison is character by character in the column's collation."],
      ["BOOLEAN", "true, false, NULL. Not 0/1 in PostgreSQL; 0/1 in MySQL and SQLite. `WHERE active` needs no `= true`."],
      ["Implicit cast", "A conversion the engine inserts to make a comparison typecheck. On a literal it is free; on a column it runs per row and defeats the index (1.3, 5.4)."]
    ]},

    { t: "h2", n: "02", text: "The string toolbox", id: "strings" },

    { t: "p", text: "Text arrives dirty — padded, mixed-case, with the real value inside a longer string. The functions are the same on every engine with small spelling differences, and all of them share the NULL rule: a NULL input gives a NULL output. **The one that surprises is concatenation: `||` propagates NULL, so a label built with it disappears for every row with a missing part. `CONCAT()` treats NULL as empty.**" },

    { t: "code", lang: "sql", title: "Clean, cut, find, pad — and the two concatenations",
      hl: [15, 16],
      code: `SELECT name, LENGTH(name) AS len, UPPER(name) AS up, LEFT(name, 2) AS l2,
       SUBSTRING(name FROM 2 FOR 3) AS sub, POSITION('a' IN name) AS pos_a, REPLACE(name, 'a', '@') AS rep
FROM   customers WHERE customer_id <= 3;
-- name  | len | up    | l2 | sub | pos_a | rep
-- Asha  | 4   | ASHA  | As | sha | 4     | Ash@         <- POSITION is 1-based; 0 means not found
-- Bruno | 5   | BRUNO | Br | run | 0     | Bruno
-- Chen  | 4   | CHEN  | Ch | hen | 0     | Chen

SELECT SPLIT_PART('2025-03-15', '-', 2)          AS month_part,   -- '03'   (PostgreSQL, DuckDB; MySQL: SUBSTRING_INDEX)
       LPAD(CAST(customer_id AS TEXT), 5, '0')   AS padded,       -- '00007'
       TRIM('  x  ')                             AS trimmed,      -- 'x'    (LTRIM, RTRIM, TRIM(BOTH '-' FROM s))
       CONCAT_WS(', ', 'a', NULL, 'c')           AS cws           -- 'a, c' (separator, skipping NULLs)
FROM   customers WHERE customer_id = 7;

SELECT name, 'Country: ' || country AS with_op, CONCAT('Country: ', country) AS with_fn
FROM   customers WHERE customer_id IN (4, 5) ORDER BY name;
-- Dalia | NULL        | Country:            <- || propagated the NULL country into the whole label
-- Emeka | Country: NG | Country: NG

-- normalising a key before comparing or grouping: lower, trim, collapse internal whitespace
SELECT LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) AS key FROM customers;`,
      caption: "`||` is the standard and NULL-propagating; `CONCAT` is a function that skips NULL; `CONCAT_WS` adds a separator. Pick by whether a missing part should blank the whole string — for a display label it should not; for a composite key it usually should, because a key with a missing part is not that key."
    },

    { t: "h2", n: "03", text: "Dates: truncate, extract, shift", id: "dates" },

    { t: "p", text: "Three operations cover almost all date work. **Truncation** rounds a timestamp down to the start of a unit and is the group key for any time series. **Extraction** pulls one component out as a number — the day of week for a seasonality feature, the epoch for a duration in seconds. **Arithmetic** shifts by an interval, subtracts two dates for a duration, and clamps: a month after the 31st of January is the 28th of February, because February has no 31st." },

    { t: "code", lang: "sql", title: "A monthly series, the components, and the arithmetic that clamps",
      hl: [1, 11, 18, 22],
      code: `SELECT DATE_TRUNC('month', o.placed_at) AS month, SUM(oi.qty * oi.unit_price) AS revenue
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE  o.status = 'paid'
GROUP  BY 1 ORDER BY 1;
-- month      | revenue
-- 2025-01-01 | 203.00
-- 2025-02-01 | 251.90
-- 2025-03-01 | 190.50
-- 2025-04-01 | 52.50          <- four rows: the months with no paid orders are simply absent (next section)

SELECT name, signed_up, DATE '2025-04-05' - signed_up AS days_since,
       EXTRACT(dow FROM signed_up) AS dow, EXTRACT(year FROM signed_up) AS yr, TO_CHAR(signed_up, 'YYYY-MM') AS ym
FROM   customers WHERE customer_id <= 3;
-- Asha  | 2024-11-03 | 153 | 0 | 2024 | 2024-11      <- DATE - DATE is an integer number of days in PostgreSQL
-- Bruno | 2024-12-19 | 107 | 4 | 2024 | 2024-12         dow: 0 = Sunday in PostgreSQL and DuckDB; MySQL DAYOFWEEK is 1 = Sunday
-- Chen  | 2025-01-08 | 87  | 3 | 2025 | 2025-01

SELECT placed_at - INTERVAL '7 days' AS week_before, placed_at + INTERVAL '1 month' AS month_later,
       EXTRACT(epoch FROM (TIMESTAMP '2025-03-15 13:45:00' - TIMESTAMP '2025-03-15 13:02:00')) AS secs
FROM   orders WHERE order_id = 108;
-- 2025-03-08 13:45:00 | 2025-04-15 13:45:00 | 2580         <- a duration in seconds: the unit every feature wants

SELECT DATE '2025-01-31' + INTERVAL '1 month' AS a, DATE '2025-03-31' - INTERVAL '1 month' AS b;
-- 2025-02-28 | 2025-02-28                                  <- month arithmetic clamps to the last valid day
-- PostgreSQL: AGE(DATE '2025-04-05', DATE '2024-11-03') = '5 mons 2 days' -- calendar-aware, not a count of days`,
      caption: "`DATE_TRUNC` gives the bucket, `EXTRACT` gives the feature, the subtraction gives the duration. Month arithmetic clamping means `d + 1 month - 1 month` is not always `d`; when the day of month matters, do the arithmetic on the truncated first-of-month and add the offset back."
    },

    { t: "code", lang: "sql", title: "Differences between dates: days, boundaries crossed, and a person's age (executed on DuckDB)",
      hl: [2, 3, 4, 10, 11, 12],
      code: `SELECT customer_id, signed_up,
       DATE '2025-04-30' - signed_up                        AS tenure_days,        -- 178 | 132 | 52     exact days
       DATE_DIFF('month', signed_up, DATE '2025-04-30')     AS month_boundaries,   -- 5 | 4 | 1          1st-of-month crossings, not "months old"
       AGE(DATE '2025-04-30', signed_up)                    AS tenure_interval     -- 177 days | 131 days | 51 days   calendar-aware, and a day less: AGE counts whole days elapsed
FROM   customers WHERE customer_id IN (1, 2, 8);

-- age in completed years from a date of birth: the classic. Boundary counting gets it wrong on the day before a birthday.
WITH p AS (SELECT * FROM (VALUES (DATE '1990-05-01'), (DATE '1990-04-30'), (DATE '2000-02-29')) t(dob))
SELECT dob,
       DATE_DIFF('year', dob, DATE '2025-04-30')                      AS year_boundaries,   -- 35 | 35 | 25   <- the first is wrong: the birthday is tomorrow
       EXTRACT(year FROM AGE(DATE '2025-04-30', dob))::INTEGER        AS age_years,         -- 34 | 35 | 25   PostgreSQL / DuckDB
       (STRFTIME(DATE '2025-04-30', '%Y%m%d')::INTEGER - STRFTIME(dob, '%Y%m%d')::INTEGER) // 10000 AS age_portable   -- 34 | 35 | 25
FROM   p;
-- dialects: MySQL TIMESTAMPDIFF(YEAR, dob, CURDATE()) and DATEDIFF(d2, d1) in days;  SQL Server DATEDIFF(day, d1, d2) counts boundaries too;
--           SQLite (JULIANDAY(d2) - JULIANDAY(d1)) for days, and the YYYYMMDD trick for years;  BigQuery DATE_DIFF(d2, d1, DAY)`,
      caption: "Three different questions hide behind 'the difference between two dates': how many days, how many unit boundaries were crossed, and how many whole units have elapsed. DATEDIFF-style functions answer the second, which is why `DATE_DIFF('year', …)` calls someone 35 the day before their 35th birthday. AGE and the YYYYMMDD subtraction answer the third; use them for anything a person would count."
    },

    { t: "h2", n: "04", text: "The date spine: months with nothing in them", id: "spine" },

    { t: "p", text: "A GROUP BY over dates produces a row for each period that has data and nothing for the periods that do not. November and December have no paid orders in the shop, so the monthly series above starts in January — and a chart, a rolling average or a forecast fed that series will silently treat the gap as absence rather than zero. **`generate_series` builds the calendar; a LEFT JOIN from it keeps every period.**" },

    { t: "code", lang: "sql", title: "Every month, including the empty ones",
      hl: [2, 3, 4],
      code: `SELECT m.month, COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
FROM   generate_series(DATE '2024-11-01', DATE '2025-04-01', INTERVAL '1 month') AS m(month)
LEFT   JOIN orders o       ON o.placed_at >= m.month AND o.placed_at < m.month + INTERVAL '1 month'
                          AND o.status = 'paid'                       -- the filter belongs in ON, not WHERE (2.2)
LEFT   JOIN order_items oi ON oi.order_id = o.order_id
GROUP  BY m.month ORDER BY m.month;
-- month      | revenue
-- 2024-11-01 | 0.00
-- 2024-12-01 | 0.00          <- present, and zero
-- 2025-01-01 | 203.00
-- 2025-02-01 | 251.90
-- 2025-03-01 | 190.50
-- 2025-04-01 | 52.50
-- generate_series: PostgreSQL, DuckDB. BigQuery: GENERATE_DATE_ARRAY + UNNEST. MySQL, SQLite: a recursive CTE (4.3).`,
      caption: "The spine is the only way a time series gets its zeros. The `status = 'paid'` condition sits in the ON clause: put it in WHERE and the two empty months disappear again, because WHERE runs after the join and a NULL status is not `'paid'` — the trap 2.2 is about."
    },

    { t: "viz",
      title: "Transform the literal, not the column",
      caption: "Both predicates select March. The left one computes a function for every row and compares the results — no index can help. The right one compares the stored value against two constants, which is a range lookup.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Two panels. Left: a column of timestamps each passing through a TO_CHAR function box before comparison with '2025-03', labelled scan every row. Right: the same timestamps compared directly against two boundary constants, labelled index range.">
  <g stroke-width="1.4">
    <rect x="30" y="40" width="390" height="150" rx="8" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit)"/>
    <rect x="460" y="40" width="390" height="150" rx="8" style="fill:var(--good);fill-opacity:.06;stroke:var(--good)"/>
  </g>
  <text x="46" y="64" class="s-label" style="fill:var(--crit);font-weight:600">TO_CHAR(placed_at, 'YYYY-MM') = '2025-03'</text>
  <text x="476" y="64" class="s-label" style="fill:var(--good);font-weight:600">placed_at &gt;= '2025-03-01' AND placed_at &lt; '2025-04-01'</text>
  <g class="s-mono">
    <text x="46" y="96">2025-01-05 09:12</text><text x="46" y="116">2025-02-10 08:55</text><text x="46" y="136">2025-03-15 13:45</text><text x="46" y="156">2025-04-04 12:10</text>
    <text x="476" y="96">2025-01-05 09:12</text><text x="476" y="116">2025-02-10 08:55</text><text x="476" y="136">2025-03-15 13:45</text><text x="476" y="156">2025-04-04 12:10</text>
  </g>
  <g stroke-width="1">
    <rect x="200" y="82" width="90" height="80" rx="6" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
  </g>
  <text x="245" y="118" class="s-sub" text-anchor="middle" style="fill:var(--crit)">TO_CHAR</text>
  <text x="245" y="134" class="s-sub" text-anchor="middle" style="fill:var(--crit)">× every row</text>
  <g class="s-mono">
    <text x="310" y="96">2025-01</text><text x="310" y="116">2025-02</text><text x="310" y="136" style="fill:var(--crit)">2025-03 ✓</text><text x="310" y="156">2025-04</text>
  </g>
  <line x1="640" y1="126" x2="640" y2="146" style="stroke:var(--good)" stroke-width="2"/>
  <line x1="640" y1="126" x2="720" y2="126" style="stroke:var(--good)" stroke-width="2"/>
  <line x1="640" y1="146" x2="720" y2="146" style="stroke:var(--good)" stroke-width="2"/>
  <text x="728" y="140" class="s-sub" style="fill:var(--good)">one range, seek</text>
  <text x="30" y="216" class="s-sub" style="fill:var(--crit)">full scan, every time</text>
  <text x="460" y="216" class="s-sub" style="fill:var(--good)">index range — and correct for every timestamp precision</text>
</svg>`
    },

    { t: "table",
      head: ["Task", "PostgreSQL", "MySQL", "SQLite", "BigQuery / DuckDB"],
      rows: [
        ["Safe cast", "`pg_input_is_valid` (16+) or regex + CASE", "`CAST` returns 0 / NULL leniently", "`CAST` returns 0 leniently", "`SAFE_CAST` / `TRY_CAST`"],
        ["Start of month", "`DATE_TRUNC('month', ts)`", "`DATE_FORMAT(ts, '%Y-%m-01')`", "`DATE(ts, 'start of month')`", "`DATE_TRUNC(ts, MONTH)` / `DATE_TRUNC('month', ts)`"],
        ["Component", "`EXTRACT(dow FROM ts)`", "`DAYOFWEEK(ts)` (1 = Sunday)", "`STRFTIME('%w', ts)`", "`EXTRACT(DAYOFWEEK FROM ts)` / `EXTRACT(dow FROM ts)`"],
        ["Shift", "`ts + INTERVAL '7 days'`", "`DATE_ADD(ts, INTERVAL 7 DAY)`", "`DATETIME(ts, '+7 days')`", "`DATE_ADD(ts, INTERVAL 7 DAY)` / `ts + INTERVAL '7 days'`"],
        ["Duration", "`ts2 - ts1` → interval; `EXTRACT(epoch …)`", "`TIMESTAMPDIFF(SECOND, ts1, ts2)`", "`(JULIANDAY(ts2) - JULIANDAY(ts1)) * 86400`", "`TIMESTAMP_DIFF(ts2, ts1, SECOND)` / `EXTRACT(epoch …)`"],
        ["Calendar", "`generate_series(d1, d2, '1 month')`", "recursive CTE", "recursive CTE", "`GENERATE_DATE_ARRAY` + `UNNEST` / `generate_series`"],
        ["Format", "`TO_CHAR(ts, 'YYYY-MM')`", "`DATE_FORMAT(ts, '%Y-%m')`", "`STRFTIME('%Y-%m', ts)`", "`FORMAT_DATE('%Y-%m', d)` / `STRFTIME(ts, '%Y-%m')`"]
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A weekly series with zeros, durations and a clean key",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Build three queries against the shop. **(1)** A weekly revenue series from the week of 30 December 2024 through the week of 31 March 2025, with a row for every week including the empty ones, week starting Monday. **(2)** For each paid order, the hours between the customer's first `view` event on that day and the order — NULL where there are no events — as a decimal. **(3)** A normalised customer key: lower-case name, trimmed, with the country appended after a hyphen and `'xx'` where the country is NULL, e.g. `'asha-gb'`, `'dalia-xx'`." },
        { t: "p", text: "Every date predicate must leave the column bare; every duration must be in a numeric unit, not an interval." }
      ],
      requirements: [
        "A generate_series spine with LEFT JOINs whose filters live in ON.",
        "Durations via EXTRACT(epoch …) divided to hours, rounded to 2 places.",
        "No `||` on a nullable column without a COALESCE.",
        "Verified output: 14 weekly rows, the hours for orders 108, 110 and 111, and the eight keys."
      ],
      hint: "DATE_TRUNC('week', …) starts on Monday in PostgreSQL and DuckDB. For (2), join events on the same customer and the same calendar day using a half-open day range on occurred_at, then MIN(occurred_at). For (3), COALESCE(country, 'xx') before LOWER.",
      solution: {
        lang: "sql",
        title: "types_dates.sql",
        code: `-- (1) weekly series, Monday-start weeks, zeros kept
SELECT w.week_start::DATE AS week_start, COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
FROM   generate_series(DATE '2024-12-30', DATE '2025-03-31', INTERVAL '7 days') AS w(week_start)
LEFT   JOIN orders o       ON o.placed_at >= w.week_start AND o.placed_at < w.week_start + INTERVAL '7 days'
                          AND o.status = 'paid'
LEFT   JOIN order_items oi ON oi.order_id = o.order_id
GROUP  BY w.week_start ORDER BY w.week_start;
-- 2024-12-30 | 42.00      (order 100, 5 Jan)      2025-02-17 | 0.00
-- 2025-01-06 | 85.00                              2025-02-24 | 139.00
-- 2025-01-13 | 0.00                               2025-03-03 | 0.00      (107 is cancelled)
-- 2025-01-20 | 76.00                              2025-03-10 | 116.50
-- 2025-01-27 | 0.00                               2025-03-17 | 42.00
-- 2025-02-03 | 0.00                               2025-03-24 | 32.00
-- 2025-02-10 | 112.90                             2025-03-31 | 52.50     (order 111, 4 Apr)   (14 rows)

-- (2) hours from the day's first view to the order
SELECT o.order_id,
       ROUND(EXTRACT(epoch FROM (o.placed_at - MIN(e.occurred_at))) / 3600.0, 2) AS hours_from_first_view
FROM   orders o
LEFT   JOIN events e ON e.customer_id = o.customer_id AND e.event_type = 'view'
                    AND e.occurred_at >= DATE_TRUNC('day', o.placed_at)
                    AND e.occurred_at <  DATE_TRUNC('day', o.placed_at) + INTERVAL '1 day'
WHERE  o.status = 'paid'
GROUP  BY o.order_id, o.placed_at ORDER BY o.order_id;
-- 100..106: NULL (no events those days)   108 | 0.72   110 | 0.42   111 | 0.50

-- (3) a normalised key
SELECT name, LOWER(TRIM(name)) || '-' || LOWER(COALESCE(country, 'xx')) AS key FROM customers ORDER BY customer_id;
-- asha-gb, bruno-de, chen-gb, dalia-xx, emeka-ng, fatou-fr, iker-es, mara-de`,
        notes: [
          { t: "p", text: "**Five of the fourteen weeks are zero, and the week of 3 March is zero because Iker's order was cancelled** — the `status = 'paid'` condition in ON keeps the week present with nothing in it. In WHERE it would have deleted the row instead." },
          { t: "p", text: "**The duration is `EXTRACT(epoch …) / 3600.0`**: an interval is not a number, and a feature column must be one. The `.0` keeps the division decimal on PostgreSQL. Orders 108, 110 and 111 have events the same day; the rest have none and stay NULL, which is honest — a missing duration is not a zero duration." },
          { t: "p", text: "**The key uses `COALESCE` before `||`**, so Dalia gets `dalia-xx` rather than NULL. A NULL key would have joined to nothing and grouped with every other NULL key — the two failure modes 1.2 described." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A monthly revenue query using `GROUP BY DATE_TRUNC('month', placed_at)` returns four rows for a six-month period. What is missing and how do you fix it?",
          options: [
            "Two months were deleted",
            "Months with no rows produce no group; build the calendar with generate_series and LEFT JOIN the orders onto it, keeping the order filters in ON",
            "DATE_TRUNC skips empty months by design and cannot be changed",
            "Use EXTRACT(month) instead"
          ],
          answer: 1,
          why: "GROUP BY can only group rows that exist. A spine supplies the periods; the LEFT JOIN keeps them; COALESCE(SUM(…), 0) turns the absence into a zero. Filters on the joined table go in ON so the empty periods survive."
        }
      ]
    }
  ],

  takeaways: [
    "**A failed CAST is an error, not a NULL.** Use `TRY_CAST` / `SAFE_CAST` or a validity check on data you did not produce.",
    "**NUMERIC for money, FLOAT for measurements**: `0.1 + 0.2 = 0.3` is false in binary floating point and true in decimal.",
    "**Integer over integer truncates on PostgreSQL and SQL Server**; make one side decimal and the query means the same thing everywhere.",
    "**`||` propagates NULL; `CONCAT` and `CONCAT_WS` skip it.** Choose by whether a missing part should blank the whole string.",
    "**String functions are the same everywhere with different spellings** — LENGTH, UPPER, TRIM, SUBSTRING, POSITION, REPLACE, SPLIT_PART, LPAD.",
    "**`DATE_TRUNC` is the bucket, `EXTRACT` is the component, subtraction is the duration** — and a duration becomes a number through `EXTRACT(epoch …)`.",
    "**Month arithmetic clamps**: 31 January + 1 month is 28 February; `d + 1 month - 1 month` is not always `d`.",
    "**GROUP BY cannot produce a row for a period with no data.** `generate_series` plus a LEFT JOIN with filters in ON is how a series gets its zeros.",
    "**Transform the literal, never the column**: `TO_CHAR(col) = 'x'` scans every row; `col >= a AND col < b` seeks.",
    "**Day-of-week numbering, month-start functions and date formatting differ by engine** — check the dialect table before porting."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should a `price` column be NUMERIC(10, 2) rather than FLOAT?",
        options: [
          "FLOAT is slower",
          "FLOAT is binary and cannot represent most decimal fractions exactly, so sums drift and equality tests fail; NUMERIC stores exact decimals",
          "NUMERIC allows NULL and FLOAT does not",
          "FLOAT cannot be indexed"
        ],
        answer: 1,
        why: "0.1 has no finite binary representation. Ten thousand such prices summed as FLOAT differ from the true total; a NUMERIC sum is exact to the cent. FLOAT is the right type for measurements and model outputs, where approximation is inherent."
      },
      {
        stem: "`SELECT 'Order ' || order_id || ' for ' || country` returns NULL for some rows. Why, and what is the fix?",
        options: [
          "order_id is an integer and cannot be concatenated",
          "`||` propagates NULL, so any row with a NULL country becomes NULL; use CONCAT, or COALESCE(country, '…')",
          "The string is too long",
          "Concatenation requires CAST on every part"
        ],
        answer: 1,
        why: "The integer is cast implicitly; the NULL is the problem. CONCAT treats NULL as an empty string; COALESCE lets you choose a placeholder. Which is right depends on whether the label should show something for unknown countries."
      },
      {
        stem: "What does `DATE '2025-01-31' + INTERVAL '1 month'` return?",
        options: [
          "2025-03-03 (31 days later)",
          "2025-02-28 — month arithmetic keeps the month step and clamps the day to the last valid day",
          "An error, because February has no 31st",
          "2025-03-01"
        ],
        answer: 1,
        why: "An interval of one month is a calendar step, not a number of days. The engine advances the month and clamps the day. Adding 31 days would give 3 March; they are different questions."
      },
      {
        stem: "Which duration expression yields a number you can feed to a model?",
        options: [
          "`ts2 - ts1`",
          "`EXTRACT(epoch FROM (ts2 - ts1)) / 3600.0` — the interval converted to seconds, then to decimal hours",
          "`AGE(ts2, ts1)`",
          "`ts2 - ts1 AS hours`"
        ],
        answer: 1,
        why: "Subtracting timestamps gives an interval — a calendar-aware quantity that is not a single number. EXTRACT(epoch …) turns it into seconds; the decimal divisor keeps the hours from truncating."
      },
      {
        stem: "A weekly series built with a spine shows zero for a week that has an order in it. What is the most likely cause?",
        options: [
          "The order was placed on a Sunday",
          "A condition on the joined orders table — such as status = 'paid' — was written in WHERE instead of ON; or the order is not paid, in which case zero is correct",
          "generate_series skipped the week",
          "COALESCE replaced the revenue with 0"
        ],
        answer: 1,
        why: "Check the status first: a cancelled order contributes nothing, and zero is right. If the order is paid, a WHERE on the right-hand table after a LEFT JOIN removes the spine row entirely rather than zeroing it — the row would be missing, not zero — so the remaining suspect is the join condition itself."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you produce a monthly count that includes months with no rows?",
        strong: "GROUP BY cannot invent a period, so I build the calendar first: generate_series from the first month to the last with a one-month step — a recursive CTE on engines without it — then LEFT JOIN the fact table onto the spine with a half-open range on the bare timestamp column, keeping any filter on the fact table in the ON clause so the empty months survive, and COALESCE the aggregate to zero. The two things that break it are a filter in WHERE, which turns the outer join inner, and a function on the timestamp column, which stops the join using an index.",
        answer: [
          { t: "p", text: "The ON-versus-WHERE point and the bare-column point are what distinguish a working answer from a memorised one." }
        ]
      },
      {
        level: "core",
        q: "What are the pitfalls of string concatenation and date arithmetic in SQL?",
        strong: "Concatenation with || propagates NULL, so one missing part blanks the whole string; CONCAT and CONCAT_WS skip NULLs, and COALESCE lets me choose a placeholder. Date arithmetic: adding a month clamps to the last valid day, so the 31st plus a month is the 28th; an interval of one day can be 23 or 25 hours across a DST change on a zoned type; subtracting timestamps gives an interval that must go through EXTRACT(epoch) to become a number; and day-of-week numbering differs by engine. For all of them I keep the column bare and put the arithmetic on the literal, so the predicate stays indexable.",
        answer: [
          { t: "p", text: "Covering NULL, clamping, DST and epoch conversion in one breath shows the candidate has met each one." }
        ]
      },
      {
        level: "advanced",
        q: "A report's totals differ from finance's by a few pence every month. The amounts are stored as DOUBLE PRECISION. Diagnose.",
        strong: "Binary floating point cannot represent most decimal amounts exactly, so each stored value is off by a tiny amount and a SUM over thousands of rows accumulates the error — and the order of summation, which the planner may change between runs, changes the result too. The fix is the column type: NUMERIC with a fixed scale, which is exact, and a migration that casts through a rounding step so the existing drift is removed rather than preserved. Until then, SUM(ROUND(amount::NUMERIC, 2)) makes the report agree, but it is hiding the problem rather than fixing it.",
        answer: [
          { t: "p", text: "Identifying non-deterministic summation order as a second symptom, and preferring the schema fix over the ROUND, is the expert answer." }
        ]
      }
    ]
  }
});

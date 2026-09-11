/* ============================================================================
   LESSON 3.3 — Frames: ROWS, RANGE and GROUPS
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**The moment you write ORDER BY inside OVER, a frame appears — and the default one is not the one you think.** It is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which includes every row that ties with the current one on the sort key, so two employees on the same salary get the same running total. Moving averages, rolling 30-day sums, 'the average of everyone else', 'the total still to come' — each is a frame, and each is one clause away from a subtly wrong number if the frame is left to default.",

  objectives: [
    "State the default frame that ORDER BY introduces and show the tie behaviour it causes",
    "Write ROWS frames for moving windows and RANGE frames for value- and time-based windows",
    "Explain the difference between ROWS, RANGE and GROUPS at a tie, and when EXCLUDE matters",
    "Recognise a frame that reaches into the future and know when that is a leak"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "The frame is the part of the partition the function sees", id: "frame" },

    { t: "p", text: "A partition is the group; a frame is the subset of the partition, relative to the current row, that the aggregate actually runs over. With no ORDER BY the frame is the whole partition — the grand total on every row. **With ORDER BY and nothing else, the frame becomes everything from the start of the partition up to the current row and its peers**, which is what turns SUM into a running total. Every other shape — the last three rows, the previous 30 days, everything except this row, everything after it — is a frame clause written out." },

    { t: "dl", items: [
      ["Frame", "The rows within the partition, positioned relative to the current row, that an aggregate window function computes over. Ranking functions ignore it."],
      ["`ROWS BETWEEN a AND b`", "Bounds counted in rows: `2 PRECEDING`, `CURRENT ROW`, `1 FOLLOWING`, `UNBOUNDED PRECEDING / FOLLOWING`. Physical, and blind to ties."],
      ["`RANGE BETWEEN a AND b`", "Bounds in the units of the ORDER BY value: `INTERVAL '30 days' PRECEDING`, `10000 PRECEDING`. Rows with the same value as the current row are peers and always share a frame. Needs a single numeric or temporal sort key for offsets."],
      ["`GROUPS BETWEEN a AND b`", "Bounds counted in peer groups: `1 PRECEDING` is the previous group of tied rows, whatever its size."],
      ["Default frame", "`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when ORDER BY is present; the whole partition when it is not."],
      ["`EXCLUDE`", "`EXCLUDE CURRENT ROW`, `EXCLUDE GROUP`, `EXCLUDE TIES` — remove the current row or its peers from the frame. The leave-one-out average."]
    ]},

    { t: "code", lang: "sql", title: "The default frame at a tie",
      hl: [2, 3, 4, 12, 13],
      code: `SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary)                                                         AS default_frame,
       SUM(salary) OVER (ORDER BY salary ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)       AS rows_frame,
       SUM(salary) OVER (ORDER BY salary RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)       AS range_frame
FROM   employees ORDER BY salary, employee_id;
-- name    | salary | default_frame | rows_frame | range_frame
-- Wen     | 70000  | 70000         | 70000      | 70000
-- Uma     | 82000  | 152000        | 152000     | 152000
-- Viktor  | 91000  | 243000        | 243000     | 243000
-- Sami    | 98000  | 341000        | 341000     | 341000
-- Priya   | 120000 | 461000        | 461000     | 461000
-- Quentin | 125000 | 711000        | 586000     | 711000      <- default = RANGE: Rosa is a peer, so she is included
-- Rosa    | 125000 | 711000        | 711000     | 711000         ROWS: Quentin's running total stops at Quentin
-- Tomas   | 131000 | 842000        | 842000     | 842000
-- Oscar   | 150000 | 992000        | 992000     | 992000
-- Nadia   | 190000 | 1182000       | 1182000    | 1182000`,
      caption: "The default frame is RANGE, so tied rows share a running total — both 125,000s read 711,000. For a running total that increases row by row, say `ROWS` explicitly, and give the ORDER BY a tie-breaker so 'row by row' is deterministic. Most people want ROWS and get RANGE."
    },

    { t: "viz",
      title: "Three ways to count 'one back' at a tie",
      caption: "Sorted by salary, the current row is Rosa (125,000), tied with Quentin. ROWS 1 PRECEDING reaches one physical row back; RANGE 1 PRECEDING reaches back one unit of salary and catches only her peer; GROUPS 1 PRECEDING reaches back one whole peer group and catches Priya as well as Quentin.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A row of salary cells from Priya 120000 through Quentin and Rosa at 125000 to Tomas 131000; three brackets beneath show which cells a frame of one preceding includes under ROWS, RANGE and GROUPS when the current row is Rosa.">
  <g class="s-mono" text-anchor="middle">
    <text x="130" y="50">Sami 98k</text><text x="290" y="50">Priya 120k</text><text x="450" y="50">Quentin 125k</text><text x="610" y="50">Rosa 125k</text><text x="770" y="50">Tomas 131k</text>
  </g>
  <g stroke-width="1.4">
    <rect x="70" y="62" width="120" height="30" rx="6" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="230" y="62" width="120" height="30" rx="6" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="390" y="62" width="120" height="30" rx="6" style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn)"/>
    <rect x="550" y="62" width="120" height="30" rx="6" style="fill:var(--accent);fill-opacity:.3;stroke:var(--accent)"/>
    <rect x="710" y="62" width="120" height="30" rx="6" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
  </g>
  <text x="610" y="82" class="s-sub" text-anchor="middle" style="fill:var(--accent)">current row</text>
  <text x="450" y="82" class="s-sub" text-anchor="middle" style="fill:var(--warn)">peer (tie)</text>
  <g style="stroke:var(--good)" stroke-width="2.5" fill="none">
    <path d="M395,120 L395,130 L665,130 L665,120"/>
  </g>
  <text x="530" y="150" class="s-sub" text-anchor="middle" style="fill:var(--good)">ROWS 1 PRECEDING → Quentin + Rosa = 250,000  (one physical row back)</text>
  <g style="stroke:var(--warn)" stroke-width="2.5" fill="none">
    <path d="M395,170 L395,180 L665,180 L665,170"/>
  </g>
  <text x="530" y="200" class="s-sub" text-anchor="middle" style="fill:var(--warn)">RANGE 1 PRECEDING → salary ≥ 124,999: Quentin + Rosa = 250,000  (peers always travel together)</text>
  <g style="stroke:var(--accent)" stroke-width="2.5" fill="none">
    <path d="M235,220 L235,230 L665,230 L665,220"/>
  </g>
  <text x="450" y="250" class="s-sub" text-anchor="middle" style="fill:var(--accent)">GROUPS 1 PRECEDING → the previous peer group too: Priya + Quentin + Rosa = 370,000</text>
</svg>`
    },

    { t: "h2", n: "02", text: "ROWS: moving windows", id: "rows" },

    { t: "p", text: "A moving average over the last three orders is `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`: the current row and the two before it in the ORDER BY. At the start of the partition the frame is shorter — one row, then two — and the average is over what exists, so the first values are not smoothed. **A frame that includes FOLLOWING rows uses the future**: a centred average is a legitimate smoother for a chart and a leak in a feature (Data Handling 8.3), because the row's value now depends on rows that come after it." },

    { t: "code", lang: "sql", title: "Trailing, centred, remaining — and the count that says how full the window was",
      hl: [3, 4, 6, 7],
      code: `WITH ot AS ( ... one row per paid order with its amount ... )
SELECT order_id, placed_at::DATE AS day, amount,
       ROUND(AVG(amount) OVER (ORDER BY placed_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)   AS ma3,        -- trailing: safe
       ROUND(AVG(amount) OVER (ORDER BY placed_at ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 2)   AS centred3,   -- uses the next row
       COUNT(*)          OVER (ORDER BY placed_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)       AS n_in_window,
       SUM(amount)       OVER (ORDER BY placed_at ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS remaining,
       ROUND(AVG(amount) OVER (ORDER BY placed_at ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING), 2)   AS prev3_avg   -- excludes the current row
FROM   ot ORDER BY placed_at;
-- order_id | day        | amount | ma3   | centred3 | n_in_window | remaining | prev3_avg
-- 100      | 2025-01-05 | 42.00  | 42.00 | 63.50    | 1           | 697.90    | NULL       <- nothing precedes it
-- 101      | 2025-01-06 | 85.00  | 63.50 | 67.67    | 2           | 655.90    | 42.00
-- 102      | 2025-01-20 | 76.00  | 67.67 | 82.13    | 3           | 570.90    | 63.50
-- 104      | 2025-02-10 | 85.40  | 82.13 | 62.97    | 3           | 494.90    | 67.67
-- 105      | 2025-02-11 | 27.50  | 62.97 | 83.97    | 3           | 409.50    | 82.13
-- 106      | 2025-02-25 | 139.00 | 83.97 | 94.33    | 3           | 382.00    | 62.97
-- 108      | 2025-03-15 | 116.50 | 94.33 | 99.17    | 3           | 243.00    | 83.97
-- 109      | 2025-03-18 | 42.00  | 99.17 | 63.50    | 3           | 126.50    | 94.33
-- 110      | 2025-03-27 | 32.00  | 63.50 | 42.17    | 3           | 84.50     | 99.17
-- 111      | 2025-04-04 | 52.50  | 42.17 | 42.25    | 3           | 52.50     | 63.50`,
      caption: "`prev3_avg` — `3 PRECEDING AND 1 PRECEDING` — is the feature form: the average of the previous three, excluding the current row, so nothing about the row leaks into its own predictor. `n_in_window` is the honest companion: the first two moving averages are over fewer than three rows, and a model should know that."
    },

    { t: "callout", kind: "trap", title: "A frame with FOLLOWING in it is a look into the future", body: [
      { t: "p", text: "`centred3` for order 100 is 63.50, which includes order 101 — placed the next day. As a plot smoother that is fine. As a feature for predicting anything about order 100 it is a temporal leak: the truncation test in Data Handling 8.3 would show it changing when later rows are removed. **Trailing frames (`… PRECEDING AND CURRENT ROW`, or `… AND 1 PRECEDING`) are the only ones a feature may use.**" }
    ]},

    { t: "h2", n: "03", text: "RANGE: windows in value or time", id: "range" },

    { t: "p", text: "ROWS counts rows; RANGE measures the sort key. `RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW` over a timestamp is 'every order in the 30 days up to this one' — the right frame when rows are unevenly spaced in time, because three rows back is not the same amount of time on two different days. Over a number it is 'every row whose value is within so much of mine'. **Peers — rows with the same sort value — are always inside a RANGE frame together**, which is why RANGE is the default and why it surprises." },

    { t: "code", lang: "sql", title: "A 30-day rolling revenue, a salary band, and one-back in three frame modes",
      hl: [2, 12, 22, 23, 24],
      code: `WITH ot AS ( ... )
SELECT order_id, placed_at::DATE AS day, amount,
       SUM(amount) OVER (ORDER BY placed_at RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW) AS rev_30d
FROM   ot ORDER BY placed_at;
-- 100 | 2025-01-05 | 42.00  | 42.00
-- 101 | 2025-01-06 | 85.00  | 127.00
-- 102 | 2025-01-20 | 76.00  | 203.00
-- 104 | 2025-02-10 | 85.40  | 161.40        <- 100 and 101 have dropped out: more than 30 days ago
-- ...
-- 111 | 2025-04-04 | 52.50  | 243.00        (108, 109, 110, 111)

SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary RANGE BETWEEN 10000 PRECEDING AND 10000 FOLLOWING) AS within_10k,
       COUNT(*)    OVER (ORDER BY salary RANGE BETWEEN 10000 PRECEDING AND 10000 FOLLOWING) AS n_within_10k
FROM   employees ORDER BY salary;
-- Wen 70000 | 70000 | 1        Uma 82000 | 173000 | 2 (72000..92000: Uma, Viktor)      Viktor 91000 | 271000 | 3
-- Quentin 125000 | 501000 | 4 (Priya, Quentin, Rosa, Tomas)      Oscar 150000 | 150000 | 1
-- a value band around each row: neighbours by proximity, not by position

SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary ROWS   BETWEEN 1 PRECEDING AND CURRENT ROW) AS rows_prev1,
       SUM(salary) OVER (ORDER BY salary RANGE  BETWEEN 1 PRECEDING AND CURRENT ROW) AS range_prev1,
       SUM(salary) OVER (ORDER BY salary GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) AS groups_prev1
FROM   employees ORDER BY salary, employee_id;
-- Quentin | 125000 | 245000 | 250000 | 370000    ROWS: Priya + Quentin. RANGE: salary >= 124999 -> Quentin + Rosa. GROUPS: Priya's group + the 125k group.
-- Rosa    | 125000 | 250000 | 250000 | 370000
-- Tomas   | 131000 | 256000 | 131000 | 381000    RANGE 1 PRECEDING over integer salaries is "within 1 pound": just himself`,
      caption: "`RANGE … PRECEDING` needs a single ORDER BY column of a type the offset can be subtracted from — a timestamp with an interval, a number with a number. With ties, RANGE and GROUPS look back by value and by peer group; only ROWS looks back by position, and only ROWS gives tied rows different frames."
    },

    { t: "h2", n: "04", text: "EXCLUDE, and the full-partition frame", id: "exclude" },

    { t: "p", text: "'Each employee's salary against the average of the *others* in their department' is a frame over the whole partition with the current row removed. Without EXCLUDE that needs a `(SUM − salary) / (COUNT − 1)`; with it, the frame says what it means. **The full-partition frame is also the fix for the LAST_VALUE trap in 3.4**: with an ORDER BY, the default frame ends at the current row, so 'the last value' is the current row's — extend the frame to UNBOUNDED FOLLOWING and it becomes the partition's last." },

    { t: "code", lang: "sql", title: "Leave-one-out average per department",
      hl: [2, 3],
      code: `SELECT name, department, salary,
       ROUND(AVG(salary) OVER (PARTITION BY department
                               ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING EXCLUDE CURRENT ROW)) AS avg_of_others
FROM   employees ORDER BY department, salary DESC;
-- Oscar   | engineering | 150000 | 119750       <- the other four engineers
-- Tomas   | engineering | 131000 | 124500
-- Quentin | engineering | 125000 | 126000
-- Rosa    | engineering | 125000 | 126000
-- Sami    | engineering | 98000  | 132750
-- Nadia   | exec        | 190000 | NULL         <- nobody else in exec: an average over no rows
-- Priya   | sales       | 120000 | 81000
-- ...
-- PostgreSQL 11+, DuckDB, SQLite 3.28+. Elsewhere: (SUM(salary) OVER w - salary) / NULLIF(COUNT(*) OVER w - 1, 0)`,
      caption: "The leave-one-out mean is the target-encoding trick from Data Handling 7.2 in SQL: a group statistic that does not include the row it is attached to. `EXCLUDE GROUP` removes the row and its peers; `EXCLUDE TIES` removes the peers but keeps the row."
    },

    { t: "table",
      head: ["Frame clause", "Meaning", "Typical use"],
      rows: [
        ["(none, no ORDER BY)", "Whole partition", "Group total on every row, share of total"],
        ["(none, with ORDER BY)", "`RANGE UNBOUNDED PRECEDING … CURRENT ROW` — up to and including peers", "Running totals where ties should agree; usually not what was meant"],
        ["`ROWS UNBOUNDED PRECEDING … CURRENT ROW`", "Up to and including this row, one row at a time", "Running totals that increase per row"],
        ["`ROWS n PRECEDING … CURRENT ROW`", "The last n + 1 rows", "Moving average, rolling sum by count"],
        ["`ROWS n PRECEDING … 1 PRECEDING`", "The previous n rows, not this one", "Features: 'the last n before this'"],
        ["`ROWS 1 PRECEDING … 1 FOLLOWING`", "Neighbours on both sides", "Chart smoothing; a leak as a feature"],
        ["`RANGE INTERVAL 'x' PRECEDING … CURRENT ROW`", "Everything within x of this row's time", "Rolling 7-day / 30-day sums on uneven timestamps"],
        ["`RANGE v PRECEDING … v FOLLOWING`", "Everything within v of this row's value", "Bands, density around a value"],
        ["`GROUPS n PRECEDING … CURRENT ROW`", "The last n peer groups and this one", "'Previous distinct date' regardless of row counts"],
        ["`ROWS … CURRENT ROW … UNBOUNDED FOLLOWING`", "This row to the end", "Remaining total, reverse cumulative"],
        ["`… UNBOUNDED PRECEDING … UNBOUNDED FOLLOWING`", "Whole partition, with ORDER BY", "LAST_VALUE that means the last (3.4)"],
        ["`… EXCLUDE CURRENT ROW`", "Frame minus this row", "Leave-one-out statistics"]
      ]
    },

    { t: "ladder",
      title: "A rolling 30-day revenue per order",
      rungs: [
        { level: "bad", label: "Rows as a proxy for days", code: `SUM(amount) OVER (ORDER BY placed_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`,
          note: "**Three orders is not thirty days.** In a busy week three rows span two days; in a quiet month they span six weeks. The number has no unit." },
        { level: "ok", label: "The default frame on a date", code: `SUM(amount) OVER (ORDER BY placed_at)`,
          note: "**A running total, not a rolling one** — it never drops old orders. And it is RANGE, so two orders at the same instant share a value, which for a running total is arguably right and for a feature is a surprise." },
        { level: "best", label: "RANGE over an interval, trailing", code: `SUM(amount) OVER (ORDER BY placed_at RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW)`,
          note: "**Measured in time, trailing, and explicit.** Orders more than 30 days old fall out of the frame on their own; nothing after the current row is included; the clause says what the number is." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Trailing features for every order, with the frames written out",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "For each paid order, in one query, compute: the customer's revenue in the 60 days before this order (excluding it); the customer's average order amount over their previous orders (excluding it, NULL if none); the number of the customer's orders in the previous 60 days; the global 3-order trailing average excluding the current order; and the share of the customer's *eventual* total that this order represents. Say which of the five could be used as a feature at prediction time and which could not, and why." },
        { t: "p", text: "Then show, with a two-column example over employees, that `SUM(salary) OVER (ORDER BY salary)` and the same with `ROWS` differ exactly at the tie, and state the default frame by name." }
      ],
      requirements: [
        "RANGE with an INTERVAL for the 60-day windows, bounded to exclude the current row.",
        "ROWS frames for the count-based windows, excluding the current row.",
        "One window that uses UNBOUNDED FOLLOWING, labelled as not usable at prediction time.",
        "Verified output for Asha's three orders."
      ],
      hint: "'Before this order, excluding it' over time is `RANGE BETWEEN INTERVAL '60 days' PRECEDING AND INTERVAL '1 second' PRECEDING` — or `… AND CURRENT ROW EXCLUDE CURRENT ROW`. The eventual total is `SUM(amount) OVER (PARTITION BY customer_id)` — the whole partition, which includes the future.",
      solution: {
        lang: "sql",
        title: "trailing_features.sql",
        code: `WITH ot AS (SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
            FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1, 2, 3)
SELECT customer_id, order_id, placed_at::DATE AS day, amount,
       COALESCE(SUM(amount) OVER (PARTITION BY customer_id ORDER BY placed_at
                                  RANGE BETWEEN INTERVAL '60 days' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW), 0) AS cust_rev_60d,   -- feature
       ROUND(AVG(amount) OVER (PARTITION BY customer_id ORDER BY placed_at
                               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 2)                                  AS cust_prev_avg,  -- feature
       COUNT(*) OVER (PARTITION BY customer_id ORDER BY placed_at
                      RANGE BETWEEN INTERVAL '60 days' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW)                 AS cust_n_60d,     -- feature
       ROUND(AVG(amount) OVER (ORDER BY placed_at ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING), 2)                      AS global_prev3,   -- feature
       ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1)                                         AS pct_of_eventual -- NOT a feature
FROM   ot ORDER BY customer_id, placed_at;
-- customer_id | order_id | day        | amount | cust_rev_60d | cust_prev_avg | cust_n_60d | global_prev3 | pct_of_eventual
-- 1           | 100      | 2025-01-05 | 42.00  | 0.00         | NULL          | 0          | NULL         | 17.9
-- 1           | 102      | 2025-01-20 | 76.00  | 42.00        | 42.00         | 1          | 63.50        | 32.4
-- 1           | 108      | 2025-03-15 | 116.50 | 76.00        | 59.00         | 1          | 83.97        | 49.7   <- 100 is 69 days back: out; 102 is 54: in
-- 2           | 101      | 2025-01-06 | 85.00  | 0.00         | NULL          | 0          | 42.00        | 75.6
-- 2           | 105      | 2025-02-11 | 27.50  | 85.00        | 85.00         | 1          | 82.13        | 24.4
-- 3           | 110      | 2025-03-27 | 32.00  | 0.00         | NULL          | 0          | 99.17        | 100.0
-- 4           | 106      | 2025-02-25 | 139.00 | 0.00         | NULL          | 0          | 62.97        | 100.0
-- 5           | 104      | 2025-02-10 | 85.40  | 0.00         | NULL          | 0          | 67.67        | 61.9
-- 5           | 111      | 2025-04-04 | 52.50  | 85.40        | 85.40         | 1          | 63.50        | 38.1
-- 6           | 109      | 2025-03-18 | 42.00  | 0.00         | NULL          | 0          | 94.33        | 100.0

-- the default frame, by name: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
SELECT name, salary, SUM(salary) OVER (ORDER BY salary) AS default_range, SUM(salary) OVER (ORDER BY salary ROWS UNBOUNDED PRECEDING) AS rows_
FROM   employees WHERE salary IN (120000, 125000, 131000) ORDER BY salary, employee_id;
-- Priya 120000 | 120000 | 120000 · Quentin 125000 | 370000 | 245000 · Rosa 125000 | 370000 | 370000 · Tomas 131000 | 501000 | 501000`,
        notes: [
          { t: "p", text: "**Four of the five are trailing and exclude the current row, so they are features**: each is a function of rows strictly before the order. `pct_of_eventual` divides by the customer's whole-partition total, which includes orders placed later — the truncation test of Data Handling 8.3 would flag it, and so should you." },
          { t: "p", text: "**Asha's third order shows RANGE doing its job**: order 100 (5 January) is 69 days before 15 March and falls out of the 60-day window; order 102 (20 January) is 54 days back and stays in. `cust_rev_60d` is 76.00 with one order counted, while `cust_prev_avg` — a ROWS frame over all previous orders — still averages both. Two frames, two different 'before'." },
          { t: "p", text: "**The tie demonstration is the whole lesson in two columns**: with the default frame Quentin and Rosa both read 370,000; with ROWS, Quentin reads 245,000 because the frame stops at him. Name the default — RANGE UNBOUNDED PRECEDING to CURRENT ROW — and write ROWS when you mean rows." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SUM(salary) OVER (ORDER BY salary)` gives two employees with the same salary the same running total. Why?",
          options: [
            "A bug in the engine",
            "The default frame with ORDER BY is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and RANGE includes all rows tied with the current one; write ROWS for a row-by-row running total",
            "SUM ignores duplicates",
            "The ORDER BY should be DESC"
          ],
          answer: 1,
          why: "RANGE frames are defined by the sort value, so peers share a frame. ROWS frames are positional and give each tied row its own frame — which then needs a tie-breaker in the ORDER BY to be deterministic."
        }
      ]
    }
  ],

  takeaways: [
    "**A frame is the part of the partition the aggregate sees, positioned relative to the current row.** Ranking functions ignore it; aggregates live by it.",
    "**ORDER BY inside OVER sets the default frame to RANGE UNBOUNDED PRECEDING … CURRENT ROW**, which includes the current row's peers.",
    "**Tied rows share a running total under the default frame**; say ROWS for row-by-row, and add a tie-breaker.",
    "**ROWS counts positions, RANGE measures the sort value, GROUPS counts peer groups** — they differ exactly at ties.",
    "**`ROWS n PRECEDING … CURRENT ROW` is a moving window by count**; the first rows have shorter frames, so report the count alongside.",
    "**`RANGE INTERVAL PRECEDING` is a rolling window by time** — the right frame when rows are unevenly spaced.",
    "**Any FOLLOWING bound uses the future**: fine for a chart, a leak for a feature.",
    "**`… n PRECEDING AND 1 PRECEDING` excludes the current row** — the shape of a trailing feature.",
    "**EXCLUDE CURRENT ROW gives the leave-one-out statistic** without SUM-minus-x arithmetic.",
    "**The full-partition frame with ORDER BY — UNBOUNDED PRECEDING to UNBOUNDED FOLLOWING — is what makes LAST_VALUE mean the last** (3.4).",
    "**Write the frame out** whenever ORDER BY is present; the default is right only by coincidence."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which frame computes a rolling 7-day sum on timestamps that are irregularly spaced?",
        options: [
          "`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`",
          "`RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW` — measured in time, so the window is seven days whether that holds two rows or two hundred",
          "`GROUPS BETWEEN 6 PRECEDING AND CURRENT ROW`",
          "The default frame"
        ],
        answer: 1,
        why: "ROWS counts rows, which is a different number of days each time; GROUPS counts distinct timestamps. Only RANGE with an interval is a window in time."
      },
      {
        stem: "A moving average `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` is used as a model feature. What is wrong?",
        options: [
          "Nothing — it is a standard smoother",
          "The frame includes the next row, so each row's feature depends on a future observation; at prediction time that row does not exist, and in training it leaks",
          "It should be 2 PRECEDING",
          "AVG cannot take a frame"
        ],
        answer: 1,
        why: "Any FOLLOWING bound reaches forward in the ORDER BY. A feature must be computable from the past alone: trailing frames ending at CURRENT ROW or earlier."
      },
      {
        stem: "How does `GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW` differ from `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW` at a tie?",
        options: [
          "They are identical",
          "GROUPS reaches back one whole peer group (all rows tied at the previous value) plus the current row's peers; ROWS reaches back exactly one row and treats tied rows separately",
          "GROUPS ignores the current row",
          "ROWS includes peers"
        ],
        answer: 1,
        why: "GROUPS is defined on peer groups, so it includes every row of the previous distinct value and every row of the current one. ROWS is positional and blind to ties."
      },
      {
        stem: "What does `AVG(x) OVER (PARTITION BY g ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING EXCLUDE CURRENT ROW)` compute?",
        options: [
          "The group average",
          "The average of every other row in the group — the leave-one-out mean, NULL when the row is alone",
          "The running average",
          "An error: EXCLUDE needs ORDER BY"
        ],
        answer: 1,
        why: "The frame is the whole partition minus the current row. For a singleton partition nothing remains and AVG over no rows is NULL. It is the SQL form of the out-of-fold statistics used in target encoding."
      },
      {
        stem: "Why does a `ROWS` running total need a tie-breaker in its ORDER BY when the default RANGE one does not?",
        options: [
          "ROWS is unstable",
          "ROWS gives tied rows different frames — one stops at the first tied row, the next includes both — so which tied row gets which total depends on their physical order; RANGE gives them the same frame, so order among peers cannot matter",
          "RANGE ignores ties",
          "It does not; both need one"
        ],
        answer: 1,
        why: "Determinism is only at stake where the result differs between tied rows. Under RANGE it cannot; under ROWS it does, so the ORDER BY must make the rows distinct."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a window frame and what is the default?",
        strong: "The frame is the subset of the partition, relative to the current row, that an aggregate window function computes over. With no ORDER BY it is the whole partition. With ORDER BY the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW — from the start of the partition through the current row and every row tied with it on the sort key. That is what makes SUM a running total, and it is also why tied rows share a value: RANGE treats peers as one unit. If I want row-by-row I write ROWS explicitly and give the ORDER BY a tie-breaker. Moving windows are ROWS n PRECEDING; time windows are RANGE with an INTERVAL; the leave-one-out mean is the full partition with EXCLUDE CURRENT ROW.",
        answer: [
          { t: "p", text: "Naming the default frame exactly, and the peer behaviour it brings, is the whole answer; the rest shows range." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute a rolling 30-day revenue per customer as a feature, and what would make it leak?",
        strong: "SUM(amount) OVER (PARTITION BY customer_id ORDER BY placed_at RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW) — or with the upper bound at one second preceding on engines without EXCLUDE. RANGE with an interval so the window is thirty days rather than thirty rows, PARTITION BY the customer, and the current row excluded so the order's own amount is not in its predictor. It would leak if the frame had any FOLLOWING bound, if the current row were included when the target is derived from it, or if the ORDER BY column were something that is itself set after the event, like an updated_at. I would verify with a truncation test: rebuild on history cut at a date and check that earlier rows' values do not change.",
        answer: [
          { t: "p", text: "The EXCLUDE CURRENT ROW detail and the truncation test connect the SQL to the leakage discipline from the data course." }
        ]
      },
      {
        level: "advanced",
        q: "Explain the difference between ROWS, RANGE and GROUPS with an example.",
        strong: "Sort employees by salary with two on 125,000. A frame of 1 PRECEDING to CURRENT ROW under ROWS is the previous physical row plus this one — for the second 125,000 that is the first 125,000, for the first it is the 120,000 below. Under RANGE it is every row whose salary is within one unit of mine — just the two 125,000s, for both of them, because peers always share a RANGE frame and 1 PRECEDING is a value offset. Under GROUPS it is the previous peer group plus mine — the 120,000 and both 125,000s, for both. ROWS is positional, RANGE is by value, GROUPS is by distinct value; they agree when there are no ties and differ exactly at them.",
        answer: [
          { t: "p", text: "A concrete tie worked three ways is the only convincing answer to this one." }
        ]
      }
    ]
  }
});

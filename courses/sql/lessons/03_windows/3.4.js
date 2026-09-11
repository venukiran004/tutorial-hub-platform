/* ============================================================================
   LESSON 3.4 — LAG, LEAD and the Value Functions
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**'How does this order compare with the customer's previous one' used to be a self-join on a row number. It is now `LAG(amount)`.** The value functions read a single value from another row in the window — the one before, the one after, the first, the last, the nth — and put it beside the current row, which is the whole of period-over-period change, time-since-last-event, and days-until-next. One of them, LAST_VALUE, returns the current row under the default frame and has misled more people than any other function in SQL.",

  objectives: [
    "Use LAG and LEAD with offsets and defaults to compute changes, gaps and next-event features",
    "Use FIRST_VALUE, LAST_VALUE and NTH_VALUE, and fix LAST_VALUE's default-frame behaviour",
    "Compute period-over-period change on a grouped series and read the NULL on the first period correctly",
    "Recognise which of these values are usable at prediction time and which look ahead"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", text: "The previous row, the next row", id: "lag" },

    { t: "p", text: "`LAG(x)` returns `x` from the row one position earlier in the window's ORDER BY; `LEAD(x)` from one position later. Both take an offset — `LAG(x, 2)` — and a default for when there is no such row, which is otherwise NULL. **The difference between the current row and its LAG is the change; the difference between the LEAD's timestamp and the current one is the time until the next event.** A partition by customer keeps the offsets inside each customer's history." },

    { t: "code", lang: "sql", title: "Previous amount, change, time since the last order and until the next",
      hl: [3, 4, 5, 6, 7],
      code: `WITH ot AS ( ... one row per paid order with its amount ... )
SELECT customer_id, order_id, placed_at::DATE AS day, amount,
       LAG(amount)        OVER w AS prev_amount,
       amount - LAG(amount) OVER w AS change,
       LAG(amount, 1, 0)  OVER w AS prev_or_zero,                -- offset 1, default 0 for the first order
       placed_at - LAG(placed_at) OVER w AS since_prev,           -- an interval; EXTRACT(epoch …) for a number (1.5)
       LEAD(placed_at) OVER w - placed_at AS until_next
FROM   ot
WINDOW w AS (PARTITION BY customer_id ORDER BY placed_at)
ORDER  BY customer_id, placed_at;
-- customer_id | order_id | day        | amount | prev_amount | change | prev_or_zero | since_prev        | until_next
-- 1           | 100      | 2025-01-05 | 42.00  | NULL        | NULL   | 0.00         | NULL              | 15 days 09:28
-- 1           | 102      | 2025-01-20 | 76.00  | 42.00       | 34.00  | 42.00        | 15 days 09:28     | 53 days 19:05
-- 1           | 108      | 2025-03-15 | 116.50 | 76.00       | 40.50  | 76.00        | 53 days 19:05     | NULL
-- 2           | 101      | 2025-01-06 | 85.00  | NULL        | NULL   | 0.00         | NULL              | 36 days 02:17
-- 2           | 105      | 2025-02-11 | 27.50  | 85.00       | -57.50 | 85.00        | 36 days 02:17     | NULL
-- 3           | 110      | 2025-03-27 | 32.00  | NULL        | NULL   | 0.00         | NULL              | NULL
-- ...                                                                                                       (10 rows)`,
      caption: "`since_prev` is a feature: it is known at the moment of the order. `until_next` is a *label*: it is only known once the next order happens, and a row's value of it is NULL until then — which is exactly how a time-to-next-purchase target is built (7.2). Same function family, opposite sides of the prediction line."
    },

    { t: "dl", items: [
      ["`LAG(x, n, default)`", "`x` from the row n positions before the current one in the window's order; `default` (NULL if omitted) when there is none. n defaults to 1."],
      ["`LEAD(x, n, default)`", "The mirror: n positions after. Anything computed from LEAD is knowledge of the future."],
      ["`FIRST_VALUE(x)`", "`x` from the first row of the frame. Under the default frame the first row of the partition — the customer's first order — on every row."],
      ["`LAST_VALUE(x)`", "`x` from the last row of the *frame*. Under the default frame that is the current row, because the frame ends at CURRENT ROW. Extend the frame to UNBOUNDED FOLLOWING to get the partition's last."],
      ["`NTH_VALUE(x, n)`", "`x` from the nth row of the frame; NULL if the frame has fewer than n rows. Same frame caveat as LAST_VALUE."],
      ["`IGNORE NULLS`", "`LAG(x IGNORE NULLS)`: skip NULL values when looking back — 'the last known reading'. PostgreSQL 16+ via `RESPECT / IGNORE NULLS` on some functions, DuckDB, Snowflake, BigQuery, Oracle; not MySQL."]
    ]},

    { t: "h2", n: "02", text: "The LAST_VALUE trap", id: "lastvalue" },

    { t: "p", text: "`FIRST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at)` returns each customer's first order amount on every row, as expected. `LAST_VALUE` with the same window returns **the current row's amount**, on every row — because the default frame runs from the start of the partition to the current row, and the last row of that frame is the current one. It is not wrong; it is the frame. The fix is to name a frame that reaches the end of the partition." },

    { t: "code", lang: "sql", title: "FIRST_VALUE works by accident; LAST_VALUE needs the frame",
      hl: [3, 4, 5],
      code: `SELECT customer_id, order_id, amount,
       FIRST_VALUE(amount) OVER w                                                        AS first_amount,
       LAST_VALUE(amount)  OVER w                                                        AS last_default,   -- the trap
       LAST_VALUE(amount)  OVER (PARTITION BY customer_id ORDER BY placed_at
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_fixed,
       NTH_VALUE(amount, 2) OVER (PARTITION BY customer_id ORDER BY placed_at
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_amount
FROM   ot WINDOW w AS (PARTITION BY customer_id ORDER BY placed_at)
ORDER  BY customer_id, placed_at;
-- customer_id | order_id | amount | first_amount | last_default | last_fixed | second_amount
-- 1           | 100      | 42.00  | 42.00        | 42.00        | 116.50     | 76.00
-- 1           | 102      | 76.00  | 42.00        | 76.00        | 116.50     | 76.00
-- 1           | 108      | 116.50 | 42.00        | 116.50       | 116.50     | 76.00
-- 2           | 101      | 85.00  | 85.00        | 85.00        | 27.50      | 27.50
-- 2           | 105      | 27.50  | 85.00        | 27.50        | 27.50      | 27.50
-- 3           | 110      | 32.00  | 32.00        | 32.00        | 32.00      | NULL          <- one order: no second
-- last_default equals amount on every row. FIRST_VALUE only "works" because the frame's first row is the partition's first.`,
      caption: "The same default frame from 3.3 explains both columns: its first row is always the partition's first, so FIRST_VALUE is right; its last row is always the current one, so LAST_VALUE is not. Write the full frame for LAST_VALUE and NTH_VALUE every time, or use `FIRST_VALUE` with the ORDER BY reversed."
    },

    { t: "viz",
      title: "Why LAST_VALUE returns the current row",
      caption: "Asha's three orders. Under the default frame each row's frame runs from the first order to itself. FIRST_VALUE reads the left edge — always 42.00. LAST_VALUE reads the right edge — the row itself. With UNBOUNDED FOLLOWING every frame spans all three orders and the right edge is 116.50.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Three rows for orders 100, 102, 108 with amounts 42, 76 and 116.50. Left: default frames drawn as brackets from the first order to each current row, with LAST_VALUE reading the current row. Right: full-partition frames spanning all three, with LAST_VALUE reading 116.50 on every row.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">default frame · ends at CURRENT ROW</text>
    <text x="470" y="36">ROWS UNBOUNDED PRECEDING … UNBOUNDED FOLLOWING</text>
  </g>
  <g class="s-mono">
    <text x="30" y="72">100 · 42.00</text><text x="30" y="122">102 · 76.00</text><text x="30" y="172">108 · 116.50</text>
    <text x="470" y="72">100 · 42.00</text><text x="470" y="122">102 · 76.00</text><text x="470" y="172">108 · 116.50</text>
  </g>
  <!-- left brackets: frame per current row -->
  <g style="stroke:var(--crit)" stroke-width="2" fill="none">
    <path d="M150,60 L150,78"/>
    <path d="M170,60 L170,128 M170,60 L180,60 M170,128 L180,128"/>
    <path d="M190,60 L190,178 M190,60 L200,60 M190,178 L200,178"/>
  </g>
  <g class="s-sub" style="fill:var(--crit)">
    <text x="215" y="72">row 100: frame = {100} → LAST = 42.00</text>
    <text x="215" y="122">row 102: frame = {100, 102} → LAST = 76.00</text>
    <text x="215" y="172">row 108: frame = {100, 102, 108} → LAST = 116.50</text>
  </g>
  <text x="30" y="215" class="s-sub" style="fill:var(--crit)">LAST_VALUE = the current row, every time</text>
  <!-- right brackets: full frame -->
  <g style="stroke:var(--good)" stroke-width="2" fill="none">
    <path d="M600,60 L600,178 M600,60 L610,60 M600,178 L610,178"/>
    <path d="M620,60 L620,178 M620,60 L630,60 M620,178 L630,178"/>
    <path d="M640,60 L640,178 M640,60 L650,60 M640,178 L650,178"/>
  </g>
  <g class="s-sub" style="fill:var(--good)">
    <text x="665" y="72">frame = all three</text>
    <text x="665" y="122">frame = all three</text>
    <text x="665" y="172">frame = all three</text>
  </g>
  <text x="470" y="215" class="s-sub" style="fill:var(--good)">LAST_VALUE = 116.50 on every row; FIRST_VALUE = 42.00 either way</text>
  <text x="30" y="256" class="s-sub">A value function reads an edge of the frame. Change the frame and you change which row it reads.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Period-over-period on a grouped series", id: "pop" },

    { t: "p", text: "Month-over-month change is LAG over a monthly aggregate: group to months first, then LAG the revenue by one month. The first month has no previous and its change is NULL, which is correct and should stay NULL rather than be coalesced to zero — 'no change' and 'no previous period' are different facts. **If the series has gaps, LAG reads the previous *row*, not the previous *month*** — a spine (1.5) with zeros is what makes 'previous row' mean 'previous month'." },

    { t: "code", lang: "sql", title: "Month-over-month, with the first month honestly NULL",
      hl: [4, 5, 6],
      code: `WITH m AS (SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month, SUM(oi.qty * oi.unit_price) AS revenue
           FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month)                                                        AS prev_month,
       revenue - LAG(revenue) OVER (ORDER BY month)                                              AS mom_change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 1) AS mom_pct,
       LAG(revenue, 2) OVER (ORDER BY month)                                                     AS two_back
FROM   m ORDER BY month;
-- month      | revenue | prev_month | mom_change | mom_pct | two_back
-- 2025-01-01 | 203.00  | NULL       | NULL       | NULL    | NULL
-- 2025-02-01 | 251.90  | 203.00     | 48.90      | 24.1    | NULL
-- 2025-03-01 | 190.50  | 251.90     | -61.40     | -24.4   | 203.00
-- 2025-04-01 | 52.50   | 190.50     | -138.00    | -72.4   | 251.90
-- January's change is NULL: there is no December row to compare with. COALESCE(…, 0) here would claim "no change".
-- If December existed with no orders, it would not be a row at all -- and LAG for January would still be NULL,
-- while February's LAG would still be January. Gaps make LAG(1) skip time; a date spine (1.5) restores the calendar.`,
      caption: "The percentage divides by the LAG, which is NULL on the first row and could be zero on a spine-filled empty month — `NULLIF(LAG(revenue) OVER (…), 0)` turns that division into a NULL rather than an error (1.2)."
    },

    { t: "h2", n: "04", text: "Gaps between events, and looking back past NULLs", id: "gaps" },

    { t: "p", text: "The minutes since a customer's previous event is `occurred_at − LAG(occurred_at)` partitioned by customer — the raw material of sessionisation (3.5), where a gap over some threshold starts a new session. `LAG … IGNORE NULLS` reads back to the most recent *non-null* value, which is the forward-fill of a sparse series: the last known price, the last recorded reading." },

    { t: "code", lang: "sql", title: "Minutes since the previous event, and a forward fill with IGNORE NULLS",
      hl: [2, 3, 11],
      code: `SELECT event_id, customer_id, event_type, occurred_at,
       EXTRACT(epoch FROM (occurred_at - LAG(occurred_at) OVER (PARTITION BY customer_id ORDER BY occurred_at))) / 60
         AS mins_since_prev
FROM   events ORDER BY customer_id, occurred_at;
-- 1  | 1 | view     | 2025-03-15 13:02 | NULL
-- 2  | 1 | view     | 2025-03-15 13:09 | 7
-- 3  | 1 | cart     | 2025-03-15 13:20 | 11
-- 4  | 1 | checkout | 2025-03-15 13:45 | 25
-- 5  | 1 | view     | 2025-03-15 19:30 | 345         <- a gap of nearly six hours: a new session (3.5)
-- 6  | 2 | view     | 2025-03-16 08:00 | NULL        <- the partition restarted: no previous event for Bruno
-- ...

SELECT i, x, LAG(x IGNORE NULLS) OVER (ORDER BY i) AS last_known
FROM   (VALUES (1, 10), (2, NULL), (3, NULL), (4, 40)) AS t(i, x) ORDER BY i;
-- 1 | 10   | NULL
-- 2 | NULL | 10
-- 3 | NULL | 10          <- plain LAG would return NULL here (the previous row's NULL)
-- 4 | 40   | 10
-- the forward fill: COALESCE(x, LAG(x IGNORE NULLS) OVER (ORDER BY i)). Without IGNORE NULLS support, MAX(x) OVER
-- (ORDER BY i ROWS UNBOUNDED PRECEDING) works when x is non-decreasing; otherwise the gaps-and-islands trick in 3.5.`,
      caption: "`mins_since_prev` restarts at NULL for each customer because the partition does. That NULL is information — a first event — and a feature pipeline should keep it as such or encode it deliberately, not fill it with zero."
    },

    { t: "table",
      head: ["Function", "Reads", "Frame-sensitive", "Known at the current row's time?"],
      rows: [
        ["`LAG(x, n)`", "n rows back", "No (positional in the partition)", "Yes — the past"],
        ["`LEAD(x, n)`", "n rows forward", "No", "**No** — a label, not a feature"],
        ["`FIRST_VALUE(x)`", "First row of the frame", "Yes; default frame makes it the partition's first", "Yes, if the frame is trailing"],
        ["`LAST_VALUE(x)`", "Last row of the frame", "**Yes**; default frame makes it the current row", "Only with a trailing frame; with UNBOUNDED FOLLOWING it is the future"],
        ["`NTH_VALUE(x, n)`", "nth row of the frame", "Yes", "Depends on the frame"],
        ["`LAG(x IGNORE NULLS)`", "Nearest earlier non-null", "No", "Yes"]
      ]
    },

    { t: "callout", kind: "warn", title: "LEAD and the full-partition LAST_VALUE are labels, not features", body: [
      { t: "p", text: "`until_next`, `next_order_amount`, `final_status_of_customer` — anything computed with LEAD or a frame that reaches forward is known only after the fact. **They are excellent targets and forbidden inputs.** The test from Data Handling 8.3 applies: truncate the history at a date and any of these that change for earlier rows were reading the future." }
    ]},

    { t: "ladder",
      title: "Each customer's most recent order amount, on every one of their orders",
      rungs: [
        { level: "bad", label: "LAST_VALUE with the default frame", code: `LAST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at)`,
          note: "**Returns the current row's own amount.** The frame ends at CURRENT ROW, so its last row is this row. Every value looks plausible and every value is wrong." },
        { level: "ok", label: "The frame written out", code: `LAST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at
                          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`,
          note: "**Correct.** The frame spans the partition and its last row is the latest order. Verbose, and the reader has to know why the clause is there." },
        { level: "best", label: "FIRST_VALUE, reversed", code: `FIRST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at DESC)`,
          note: "**Correct with the default frame**, because the first row of a descending order is the latest, and FIRST_VALUE reads the frame's start, which is always the partition's start. Shorter, and immune to the trap." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Features and a label from the same window",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "For every paid order, in one query: the amount of the customer's previous order (0 if none); the days since it (NULL if none), as a number; the customer's first-ever order amount; the ratio of this order to the previous one; and — clearly labelled — the days until the customer's next order, which is the target for a repurchase model. Then, from `events`, compute for every event the minutes since the previous event of the same customer and flag rows where the gap exceeds 30 minutes or is NULL as `new_session`." },
        { t: "p", text: "Say, for each column, whether it is available at prediction time." }
      ],
      requirements: [
        "LAG with a default, LAG on a timestamp converted to days, FIRST_VALUE, LEAD for the label.",
        "A NULL-safe ratio (previous amount can be 0 via the default).",
        "The session flag as a boolean expression on the LAG gap.",
        "Verified output for customers 1, 2 and 5, and for customer 1's events."
      ],
      hint: "Days as a number: EXTRACT(epoch FROM (placed_at − LAG(placed_at) OVER w)) / 86400, or in PostgreSQL the DATE subtraction. For the ratio, divide by NULLIF(LAG(amount, 1, 0) OVER w, 0). Session flag: `LAG(occurred_at) OVER w IS NULL OR occurred_at − LAG(…) > INTERVAL '30 minutes'`.",
      solution: {
        lang: "sql",
        title: "lag_features.sql",
        code: `WITH ot AS (SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
            FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1, 2, 3)
SELECT customer_id, order_id, amount,
       LAG(amount, 1, 0) OVER w                                                          AS prev_amount,       -- feature
       ROUND(EXTRACT(epoch FROM (placed_at - LAG(placed_at) OVER w)) / 86400, 1)         AS days_since_prev,   -- feature
       FIRST_VALUE(amount) OVER w                                                        AS first_amount,      -- feature
       ROUND(amount / NULLIF(LAG(amount, 1, 0) OVER w, 0), 2)                            AS ratio_to_prev,     -- feature (NULL when no previous)
       ROUND(EXTRACT(epoch FROM (LEAD(placed_at) OVER w - placed_at)) / 86400, 1)        AS days_until_next    -- LABEL: needs the future
FROM   ot WINDOW w AS (PARTITION BY customer_id ORDER BY placed_at)
ORDER  BY customer_id, placed_at;
-- customer_id | order_id | amount | prev_amount | days_since_prev | first_amount | ratio_to_prev | days_until_next
-- 1           | 100      | 42.00  | 0.00        | NULL            | 42.00        | NULL          | 15.4
-- 1           | 102      | 76.00  | 42.00       | 15.4            | 42.00        | 1.81          | 53.8
-- 1           | 108      | 116.50 | 76.00       | 53.8            | 42.00        | 1.53          | NULL
-- 2           | 101      | 85.00  | 0.00        | NULL            | 85.00        | NULL          | 36.1
-- 2           | 105      | 27.50  | 85.00       | 36.1            | 85.00        | 0.32          | NULL
-- 5           | 104      | 85.40  | 0.00        | NULL            | 85.40        | NULL          | 53.1
-- 5           | 111      | 52.50  | 85.40       | 53.1            | 85.40        | 0.61          | NULL

SELECT event_id, customer_id, event_type, occurred_at,
       ROUND(EXTRACT(epoch FROM (occurred_at - LAG(occurred_at) OVER w)) / 60) AS mins_since_prev,
       LAG(occurred_at) OVER w IS NULL OR occurred_at - LAG(occurred_at) OVER w > INTERVAL '30 minutes' AS new_session
FROM   events WINDOW w AS (PARTITION BY customer_id ORDER BY occurred_at)
ORDER  BY customer_id, occurred_at;
-- 1 | 1 | view     | 13:02 | NULL | true        <- first event: a session starts
-- 2 | 1 | view     | 13:09 | 7    | false
-- 3 | 1 | cart     | 13:20 | 11   | false
-- 4 | 1 | checkout | 13:45 | 25   | false
-- 5 | 1 | view     | 19:30 | 345  | true        <- 345 minutes later: a second session`,
        notes: [
          { t: "p", text: "**Four columns look back and one looks forward.** `days_until_next` is NULL on each customer's latest order — the outcome has not happened yet — which is what makes it a label: a model predicts it for exactly the rows where it is NULL." },
          { t: "p", text: "**`ratio_to_prev` divides by `NULLIF(…, 0)`** because the LAG default of 0 would otherwise raise a division error on every first order. The NULL ratio says 'no previous order', which is more honest than any number." },
          { t: "p", text: "**`new_session` is the seed of the sessionisation in 3.5**: a boolean per event, true at each session start. A running SUM of that boolean numbers the sessions." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`LAST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at)` returns each row's own amount. Why?",
          options: [
            "LAST_VALUE is broken in most engines",
            "With ORDER BY the default frame ends at CURRENT ROW, so the frame's last row is the current row; extend the frame to UNBOUNDED FOLLOWING or use FIRST_VALUE with a descending order",
            "PARTITION BY resets it",
            "It needs DISTINCT"
          ],
          answer: 1,
          why: "Value functions read an edge of the frame, and the default frame's right edge is the current row. FIRST_VALUE escapes the trap only because the default frame's left edge is always the partition's first row."
        }
      ]
    }
  ],

  takeaways: [
    "**LAG reads n rows back, LEAD n rows forward**, with an optional default for the missing row; the difference from the current row is the change.",
    "**`since_prev` is a feature; `until_next` is a label.** Same functions, opposite sides of the prediction line.",
    "**FIRST_VALUE works under the default frame; LAST_VALUE returns the current row.** Write the full frame, or use FIRST_VALUE with the order reversed.",
    "**NTH_VALUE has the same frame sensitivity** and returns NULL when the frame is shorter than n.",
    "**Period-over-period is LAG over a grouped series**; the first period's change is NULL and should stay NULL.",
    "**LAG reads the previous row, not the previous period** — a series with gaps needs a spine before LAG means 'last month'.",
    "**Divide by `NULLIF(LAG(…), 0)`** when the previous value can be zero, or the default makes it zero.",
    "**The gap since the previous event is `ts − LAG(ts)` per entity** — the input to sessionisation.",
    "**`IGNORE NULLS` forward-fills**: the last known non-null value, where the engine supports it.",
    "**A NULL from LAG on the first row is information** — 'no previous' — not a zero to fill."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY placed_at)` return on a customer's first order?",
        options: [
          "NULL",
          "0 — the third argument is the default used when no row exists one position back",
          "The first order's own amount",
          "An error"
        ],
        answer: 1,
        why: "LAG's default replaces the NULL that would otherwise mark 'no previous row'. Whether 0 is the right default depends on what the column will be used for — a ratio needs NULLIF protection afterwards."
      },
      {
        stem: "Monthly revenue has no row for December. What does `LAG(revenue) OVER (ORDER BY month)` return for January?",
        options: [
          "November's revenue — the previous row",
          "NULL if January is the first row; otherwise the previous existing row, which may not be the previous month — build a date spine so rows and months coincide",
          "0",
          "December's revenue, computed as 0"
        ],
        answer: 1,
        why: "LAG is positional in the row order. Without a row for December, 'one back from January' is whatever month precedes it in the data. A spine with COALESCE(revenue, 0) restores the calendar."
      },
      {
        stem: "Which is a valid model feature for predicting something about an order at the moment it is placed?",
        options: [
          "`LEAD(placed_at) OVER (PARTITION BY customer_id ORDER BY placed_at)`",
          "`LAST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY placed_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`",
          "`LAG(amount) OVER (PARTITION BY customer_id ORDER BY placed_at)` — the previous order's amount, known before this order exists",
          "`NTH_VALUE(amount, 3) OVER (… ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`"
        ],
        answer: 2,
        why: "LEAD and any frame reaching UNBOUNDED FOLLOWING read rows that come after the current one. Only the trailing LAG is computable from history alone."
      },
      {
        stem: "How do you forward-fill a sparse column — carry the last non-null value forward?",
        options: [
          "`LAG(x)`",
          "`LAG(x IGNORE NULLS) OVER (ORDER BY t)`, wrapped in COALESCE(x, …) — or, without IGNORE NULLS support, the gaps-and-islands technique",
          "`COALESCE(x, 0)`",
          "`FIRST_VALUE(x)`"
        ],
        answer: 1,
        why: "Plain LAG returns the immediately previous row's value, NULL included. IGNORE NULLS skips back to the nearest non-null. Engines without it need a running MAX of the row position of non-null values, then a self-lookup."
      },
      {
        stem: "Why should the first month's month-over-month change stay NULL rather than be set to 0?",
        options: [
          "NULL is faster",
          "Because 'no previous period' and 'no change from the previous period' are different facts, and a chart or model treating the first month as flat growth would be reading a claim the data never made",
          "COALESCE does not work on LAG",
          "It should be set to 0"
        ],
        answer: 1,
        why: "NULL from LAG means the comparison could not be made. Replacing it with a number invents a comparison. Downstream consumers should handle the NULL explicitly."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you compute month-over-month revenue change in SQL?",
        strong: "Aggregate to one row per month first — DATE_TRUNC on the timestamp, SUM of amounts — then LAG(revenue) OVER (ORDER BY month) gives the previous month's figure on each row, and the difference and percentage follow, with NULLIF on the divisor. The first month's change is NULL and I leave it NULL. The thing I check is gaps: LAG reads the previous row, so a month with no orders makes 'previous' skip a month; a generate_series spine with COALESCE to zero fixes that before the window runs.",
        answer: [
          { t: "p", text: "The gap point — LAG is positional, not temporal — is what shows the candidate has been bitten by a missing month." }
        ]
      },
      {
        level: "core",
        q: "Why does LAST_VALUE often return the wrong answer, and how do you fix it?",
        strong: "Because with an ORDER BY the default frame runs from the partition start to the current row, and LAST_VALUE reads the last row of the frame — which is the current row. So it returns each row's own value and looks plausible. FIRST_VALUE happens to work because the frame's first row is always the partition's first. The fix is either to write the frame out — ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING — or, more simply, to use FIRST_VALUE with the ORDER BY reversed, which is immune to the trap.",
        answer: [
          { t: "p", text: "Offering the reversed FIRST_VALUE as the preferred fix shows fluency rather than just awareness of the bug." }
        ]
      },
      {
        level: "advanced",
        q: "Using window functions, how would you build features and a target for a time-to-next-purchase model?",
        strong: "One row per order in a per-customer window ordered by time. Features look back: LAG of amount and timestamp for the previous order and the gap since it, a count and sum over a trailing frame for recent activity, FIRST_VALUE for the first order, all excluding the current row where the target could be influenced by it. The target looks forward: LEAD(placed_at) minus placed_at is the days until the next order, NULL on each customer's latest — which are exactly the rows to predict for, with censoring handled as in survival analysis if the model needs it. Then a truncation test: cut the history at a date, recompute, and confirm no feature for an earlier row changed, because that would mean it read the future.",
        answer: [
          { t: "p", text: "Separating the backward-looking features from the forward-looking label with the same window, and naming the censoring, is the complete answer." }
        ]
      }
    ]
  }
});

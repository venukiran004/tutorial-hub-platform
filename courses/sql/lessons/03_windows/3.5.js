/* ============================================================================
   LESSON 3.5 — Window Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**Five questions that used to need three self-joins or a trip to Python, each answered by one idea: a window function whose output feeds another window function.** A flag becomes a running sum becomes a session number. A row number subtracted from a date becomes a constant that groups a streak. A count over the partition and a row number together pick out the median. This lesson is the compositional patterns — sessionisation, gaps and islands, cumulative distinct counts, a portable median, percentile positions — and the shape they share.",

  objectives: [
    "Sessionise an event stream with a gap flag and a running sum",
    "Find runs of consecutive values — gaps and islands — with the row-number subtraction trick",
    "Compute cumulative distinct counts and a median without ordered-set aggregates",
    "Read PERCENT_RANK and CUME_DIST as positions in a distribution",
    "Recognise when a pattern needs two window layers and write the CTE chain"
  ],

  prerequisites: ["3.4", "3.2"],

  blocks: [

    { t: "h2", n: "01", text: "Sessionisation: flag, then running sum", id: "sessions" },

    { t: "p", text: "A session is a run of events by one customer with no gap longer than some threshold. 3.4 produced the flag — `new_session` is true on the first event and wherever the gap exceeds 30 minutes. **A running SUM of that flag, per customer in time order, is the session number**: it increments exactly at each session start and stays constant within a session. Group by customer and session number and every per-session statistic follows." },

    { t: "code", lang: "sql", title: "Events to sessions in three layers",
      hl: [3, 4, 8, 12],
      code: `WITH flagged AS (
  SELECT *,
         CASE WHEN LAG(occurred_at) OVER w IS NULL
                OR occurred_at - LAG(occurred_at) OVER w > INTERVAL '30 minutes' THEN 1 ELSE 0 END AS new_session
  FROM   events WINDOW w AS (PARTITION BY customer_id ORDER BY occurred_at)
),
numbered AS (
  SELECT *, SUM(new_session) OVER (PARTITION BY customer_id ORDER BY occurred_at ROWS UNBOUNDED PRECEDING) AS session_no
  FROM   flagged
)
SELECT customer_id, session_no, MIN(occurred_at) AS started, MAX(occurred_at) AS ended, COUNT(*) AS events,
       BOOL_OR(event_type = 'checkout') AS converted, STRING_AGG(event_type, ' > ' ORDER BY occurred_at) AS path
FROM   numbered GROUP BY 1, 2 ORDER BY 1, 2;
-- customer_id | session_no | started          | ended            | events | converted | path
-- 1           | 1          | 2025-03-15 13:02 | 2025-03-15 13:45 | 4      | true      | view > view > cart > checkout
-- 1           | 2          | 2025-03-15 19:30 | 2025-03-15 19:30 | 1      | false     | view
-- 2           | 1          | 2025-03-16 08:00 | 2025-03-16 08:04 | 2      | false     | view > cart
-- 2           | 2          | 2025-03-16 10:50 | 2025-03-16 10:50 | 1      | false     | view
-- 3           | 1          | 2025-03-27 17:00 | 2025-03-27 17:25 | 3      | true      | view > cart > checkout
-- 5           | 1          | 2025-04-04 11:40 | 2025-04-04 12:10 | 3      | true      | view > view > checkout
-- 6           | 1          | 2025-04-05 21:15 | 2025-04-05 21:15 | 1      | false     | view
-- 8           | 1          | 2025-04-06 07:30 | 2025-04-06 07:33 | 2      | false     | view > cart
-- 8           | 2          | 2025-04-06 12:00 | 2025-04-06 12:00 | 1      | false     | view              (9 sessions from 18 events)`,
      caption: "Three layers because a window cannot nest in a window: the LAG produces the flag, the SUM over the flag produces the number, the GROUP BY collapses the sessions. Each CTE is one window deep. The `path` column is the funnel of 7.3 read directly off the session."
    },

    { t: "callout", kind: "mental", title: "Flag, then cumulative sum, then group", body: [
      { t: "p", text: "Almost every 'find the runs' question is this shape. **Compute a boolean that is true where a new run starts. Running-SUM it in the same order to get a run id. Group by the run id.** Sessions, streaks, state changes, price regimes, 'consecutive months of growth' — the boundary condition changes, the three layers do not." }
    ]},

    { t: "h2", n: "02", text: "Gaps and islands", id: "islands" },

    { t: "p", text: "'Longest streak of consecutive login days' has a shorter trick than the flag-and-sum. Number each user's login days in order with ROW_NUMBER, then subtract the row number (as days) from the date. **Within a run of consecutive days, the date advances by one and the row number advances by one, so the difference is constant; at a gap, the date jumps and the difference jumps.** The difference is the island id. Group by it, and each island is a streak with a start, an end and a length." },

    { t: "code", lang: "sql", title: "Consecutive days as a constant difference",
      hl: [6, 9],
      code: `WITH logins(user_id, day) AS (VALUES
  (1, DATE '2025-03-01'), (1, DATE '2025-03-02'), (1, DATE '2025-03-03'), (1, DATE '2025-03-06'), (1, DATE '2025-03-07'),
  (2, DATE '2025-03-01'), (2, DATE '2025-03-03'), (2, DATE '2025-03-04'), (2, DATE '2025-03-05'), (2, DATE '2025-03-06')
),
islands AS (
  SELECT user_id, day, day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::INTEGER AS island
  FROM   logins
)
SELECT user_id, MIN(day) AS streak_start, MAX(day) AS streak_end, COUNT(*) AS days
FROM   islands GROUP BY user_id, island ORDER BY user_id, streak_start;
-- user_id | streak_start | streak_end | days
-- 1       | 2025-03-01   | 2025-03-03 | 3
-- 1       | 2025-03-06   | 2025-03-07 | 2
-- 2       | 2025-03-01   | 2025-03-01 | 1
-- 2       | 2025-03-03   | 2025-03-06 | 4

-- the island column, to see why it works:
-- user 1: 03-01 - 1 = 02-28 · 03-02 - 2 = 02-28 · 03-03 - 3 = 02-28 · 03-06 - 4 = 03-02 · 03-07 - 5 = 03-02
-- the value is meaningless; only its constancy within a run matters. Distinct days are assumed -- DISTINCT first if a user can log in twice a day.`,
      caption: "The island id is an arbitrary date, and that is fine: it is a group key, not a value. The trick generalises to any sequence with a fixed step — consecutive integers, consecutive months via `EXTRACT(year) * 12 + EXTRACT(month)` — and the flag-and-sum pattern covers everything else."
    },

    { t: "viz",
      title: "Why date minus row number is constant in a run",
      caption: "User 1's five login days. Within the first run both the date and the row number step by one, so their difference stays at 28 February. The gap between the 3rd and the 6th moves the date by three while the row number moves by one, and the difference jumps to 2 March — a new island.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Five login dates for one user in a row, with row numbers 1 to 5 beneath and the date-minus-row-number value beneath that; the first three share 28 Feb and the last two share 2 Mar, highlighted as two islands.">
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="40">day</text><text x="120" y="90">row_number</text><text x="120" y="140">day − rn</text>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="240" y="40">03-01</text><text x="360" y="40">03-02</text><text x="480" y="40">03-03</text><text x="640" y="40">03-06</text><text x="760" y="40">03-07</text>
    <text x="240" y="90">1</text><text x="360" y="90">2</text><text x="480" y="90">3</text><text x="640" y="90">4</text><text x="760" y="90">5</text>
  </g>
  <g stroke-width="1.4">
    <rect x="200" y="120" width="320" height="30" rx="6" style="fill:var(--accent);fill-opacity:.15;stroke:var(--accent)"/>
    <rect x="600" y="120" width="200" height="30" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="240" y="140">02-28</text><text x="360" y="140">02-28</text><text x="480" y="140">02-28</text><text x="640" y="140">03-02</text><text x="760" y="140">03-02</text>
  </g>
  <text x="360" y="178" class="s-sub" text-anchor="middle" style="fill:var(--accent)">island A · 3 days</text>
  <text x="700" y="178" class="s-sub" text-anchor="middle" style="fill:var(--good)">island B · 2 days</text>
  <text x="560" y="72" class="s-sub" text-anchor="middle" style="fill:var(--crit)">gap: +3 days, +1 row</text>
  <text x="120" y="220" class="s-sub">Both sequences step by one inside a run, so the difference is a constant that changes only at a gap.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Cumulative distinct counts, and streaks of growth", id: "cumulative" },

    { t: "p", text: "'How many customers have ever ordered, by month' cannot be a running COUNT(DISTINCT) — engines refuse DISTINCT inside a window with an ORDER BY, because the frame would have to remember every earlier value. **Assign each customer to the month they first appeared, count first appearances per month, and running-sum those.** The same flag-and-sum shape handles 'consecutive months of revenue growth': flag the months that did not grow, running-sum the flags, and each group is a growth streak." },

    { t: "code", lang: "sql", title: "Customers ever, by month; and growth streaks",
      hl: [2, 5, 12, 13],
      code: `WITH first_month AS (
  SELECT customer_id, DATE_TRUNC('month', MIN(placed_at))::DATE AS month FROM orders WHERE status = 'paid' GROUP BY customer_id
),
per_month AS (SELECT month, COUNT(*) AS new_customers FROM first_month GROUP BY month)
SELECT month, new_customers, SUM(new_customers) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS customers_ever
FROM   per_month ORDER BY month;
-- 2025-01-01 | 2 | 2        Asha, Bruno
-- 2025-02-01 | 2 | 4        Emeka, Dalia
-- 2025-03-01 | 2 | 6        Fatou, Chen           (April: no new customers, and no row -- a spine would show 0 | 6)

WITH m AS (SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month, SUM(oi.qty * oi.unit_price) AS revenue
           FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1),
d AS (SELECT month, revenue, CASE WHEN revenue > LAG(revenue) OVER (ORDER BY month) THEN 1 ELSE 0 END AS up FROM m),
g AS (SELECT *, SUM(CASE WHEN up = 0 THEN 1 ELSE 0 END) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS streak FROM d)
SELECT month, revenue, up, streak FROM g ORDER BY month;
-- 2025-01-01 | 203.00 | 0 | 1       <- the first month cannot be "up": it starts streak 1
-- 2025-02-01 | 251.90 | 1 | 1       <- grew: same streak
-- 2025-03-01 | 190.50 | 0 | 2       <- fell: a new streak begins
-- 2025-04-01 | 52.50  | 0 | 3
-- GROUP BY streak HAVING SUM(up) >= 1 gives the runs of growth and their lengths`,
      caption: "The distinct-count trick relies on a fact: a customer's first order happens once. Counting firsts is counting distinct customers without DISTINCT. It is the same reasoning that makes 'new versus returning' a per-row attribute in 7.3."
    },

    { t: "h2", n: "04", text: "Positions in a distribution: median, PERCENT_RANK, CUME_DIST", id: "positions" },

    { t: "p", text: "Where an engine lacks `PERCENTILE_CONT`, a median is the middle row — or the mean of the two middle rows — which ROW_NUMBER and COUNT over the same partition can pick out. `PERCENT_RANK` gives a row's position as a fraction of the partition, (rank − 1) / (rows − 1), and `CUME_DIST` gives the share of rows at or below it. **Both are the SQL of a percentile position: 'this salary is at the 78th percentile' is PERCENT_RANK.**" },

    { t: "code", lang: "sql", title: "A portable median, and each salary's percentile position",
      hl: [3, 4, 12, 13],
      code: `WITH r AS (
  SELECT department, salary,
         ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary) AS rn,
         COUNT(*)     OVER (PARTITION BY department)                 AS n
  FROM   employees
)
SELECT department, AVG(salary) AS median
FROM   r WHERE rn IN (FLOOR((n + 1) / 2.0), CEIL((n + 1) / 2.0))     -- the middle row, or both middle rows
GROUP  BY department ORDER BY department;
-- engineering | 125000 · exec | 190000 · sales | 86500     (matches PERCENTILE_CONT in 2.5; works on MySQL and SQLite)

SELECT name, salary, ROUND(PERCENT_RANK() OVER (ORDER BY salary), 2) AS pct_rank, ROUND(CUME_DIST() OVER (ORDER BY salary), 2) AS cume_dist
FROM   employees ORDER BY salary;
-- Wen 70000 0.00 0.10 · Uma 82000 0.11 0.20 · Viktor 91000 0.22 0.30 · Sami 98000 0.33 0.40 · Priya 120000 0.44 0.50
-- Quentin 125000 0.56 0.70 · Rosa 125000 0.56 0.70 · Tomas 131000 0.78 0.80 · Oscar 150000 0.89 0.90 · Nadia 190000 1.00 1.00
-- PERCENT_RANK: (RANK - 1) / (n - 1): 0 for the lowest, 1 for the highest; ties share. CUME_DIST: rows <= this value / n.`,
      caption: "The FLOOR/CEIL pair avoids the integer-division trap of 1.5: `(n + 1) / 2` is 2 on PostgreSQL and 2.5 on DuckDB for four rows, and only one of those finds both middle rows. With `/ 2.0` and FLOOR and CEIL, both engines pick rows 2 and 3."
    },

    { t: "table",
      head: ["Pattern", "Layers", "Key idea"],
      rows: [
        ["Sessionisation", "LAG → flag → running SUM → GROUP BY", "A session number is a running count of session starts"],
        ["Gaps and islands", "ROW_NUMBER → date − rn → GROUP BY", "A constant difference identifies a run with a fixed step"],
        ["Streaks of a condition", "LAG → flag → running SUM → GROUP BY", "Same as sessions, with the boundary being 'condition broke'"],
        ["Cumulative distinct", "MIN per entity → COUNT per period → running SUM", "Count first appearances; DISTINCT is not allowed in an ordered window"],
        ["Portable median", "ROW_NUMBER + COUNT OVER → filter to the middle → AVG", "The middle row(s) of the ordered partition"],
        ["Percentile position", "PERCENT_RANK / CUME_DIST", "Rank as a fraction of the partition"],
        ["De-duplication (2.6)", "ROW_NUMBER → filter rn = 1", "The survivor is named by the ORDER BY"],
        ["Latest per group (3.2)", "ROW_NUMBER DESC → filter rn = 1", "A whole row chosen by order"],
        ["Forward fill (3.4)", "LAG IGNORE NULLS, or running MAX of the position of non-nulls → self-lookup", "Carry the last known value"]
      ]
    },

    { t: "ladder",
      title: "Sessions from an event stream",
      rungs: [
        { level: "bad", label: "Fetch everything and loop in Python", code: `rows = cur.execute("SELECT customer_id, occurred_at, event_type FROM events ORDER BY 1, 2").fetchall()
for row in rows:  # compare with the previous row, start a new session if gap > 30 min ...`,
          note: "**Correct, and every event crosses the network.** On eighteen rows it does not matter; on eighteen million the loop runs where the data is not, and the logic lives in a language the analyst querying the warehouse cannot see." },
        { level: "ok", label: "Self-join to the previous event", code: `SELECT e.*, p.occurred_at AS prev_at
FROM   events e LEFT JOIN events p ON p.customer_id = e.customer_id AND p.occurred_at < e.occurred_at
  AND NOT EXISTS (SELECT 1 FROM events q WHERE q.customer_id = e.customer_id AND q.occurred_at > p.occurred_at AND q.occurred_at < e.occurred_at)`,
          note: "**The pre-2003 way: correct and quadratic.** Every event is compared with every earlier event of the same customer, then a NOT EXISTS makes sure it was the nearest. Three references to the table for one LAG." },
        { level: "best", label: "Flag, running sum, group", code: `WITH flagged  AS (SELECT *, CASE WHEN occurred_at - LAG(occurred_at) OVER w > INTERVAL '30 minutes' OR LAG(occurred_at) OVER w IS NULL THEN 1 ELSE 0 END AS new_session FROM events WINDOW w AS (PARTITION BY customer_id ORDER BY occurred_at)),
     numbered AS (SELECT *, SUM(new_session) OVER (PARTITION BY customer_id ORDER BY occurred_at ROWS UNBOUNDED PRECEDING) AS session_no FROM flagged)
SELECT customer_id, session_no, COUNT(*), MIN(occurred_at), MAX(occurred_at) FROM numbered GROUP BY 1, 2;`,
          note: "**One sort per customer, three readable layers, and the threshold in one place.** The same shape gives streaks, regimes and state changes by swapping the flag." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Sessions with a funnel, and islands of activity",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "**(1)** Extend the sessionisation to report, per session: the number of views, whether a cart was reached, whether a checkout happened, the session length in minutes, and the session's position in the customer's history (first, second …). Then aggregate to one row: total sessions, sessions with a cart, sessions with a checkout, and the two conversion rates. **(2)** Using the `orders` table, find for each customer the longest run of consecutive *months* with at least one paid order, with the run's start and end months." },
        { t: "p", text: "For (2), convert each month to an integer index — year × 12 + month — so consecutive months step by exactly one, then apply the islands trick." }
      ],
      requirements: [
        "Sessionisation via flag and running sum, with the per-session position from ROW_NUMBER over the grouped result.",
        "The funnel counts via conditional aggregation.",
        "Islands over a month index with DISTINCT customer-months first.",
        "Verified output: 9 sessions, 4 with a cart, 3 with checkout, and each customer's longest run."
      ],
      hint: "Position in the customer's history: after grouping to sessions, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started). Month index: EXTRACT(year FROM placed_at) * 12 + EXTRACT(month FROM placed_at). Asha ordered in January and March — that is two runs of one, not one run of two.",
      solution: {
        lang: "sql",
        title: "sessions_islands.sql",
        code: `-- (1) sessions with a funnel
WITH flagged AS (
  SELECT *, CASE WHEN LAG(occurred_at) OVER w IS NULL OR occurred_at - LAG(occurred_at) OVER w > INTERVAL '30 minutes' THEN 1 ELSE 0 END AS new_session
  FROM   events WINDOW w AS (PARTITION BY customer_id ORDER BY occurred_at)
),
numbered AS (SELECT *, SUM(new_session) OVER (PARTITION BY customer_id ORDER BY occurred_at ROWS UNBOUNDED PRECEDING) AS session_no FROM flagged),
sessions AS (
  SELECT customer_id, session_no, MIN(occurred_at) AS started,
         COUNT(*) FILTER (WHERE event_type = 'view')      AS views,
         BOOL_OR(event_type = 'cart')                      AS reached_cart,
         BOOL_OR(event_type = 'checkout')                  AS checked_out,
         ROUND(EXTRACT(epoch FROM (MAX(occurred_at) - MIN(occurred_at))) / 60) AS minutes
  FROM   numbered GROUP BY 1, 2
)
SELECT customer_id, session_no, started, views, reached_cart, checked_out, minutes,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started) AS nth_session_of_customer
FROM   sessions ORDER BY customer_id, started;
-- 1 | 1 | 2025-03-15 13:02 | 2 | true  | true  | 43 | 1
-- 1 | 2 | 2025-03-15 19:30 | 1 | false | false | 0  | 2
-- 2 | 1 | 2025-03-16 08:00 | 1 | true  | false | 4  | 1
-- ...                                                          (9 rows)

-- the funnel over sessions
SELECT COUNT(*) AS sessions, COUNT(*) FILTER (WHERE reached_cart) AS with_cart, COUNT(*) FILTER (WHERE checked_out) AS with_checkout,
       ROUND(AVG(CASE WHEN reached_cart THEN 1.0 ELSE 0 END), 2) AS cart_rate,
       ROUND(AVG(CASE WHEN checked_out  THEN 1.0 ELSE 0 END), 2) AS checkout_rate
FROM   sessions;
-- 9 | 4 | 3 | 0.44 | 0.33

-- (2) longest run of consecutive months with a paid order, per customer
WITH cm AS (SELECT DISTINCT customer_id, EXTRACT(year FROM placed_at) * 12 + EXTRACT(month FROM placed_at) AS mi FROM orders WHERE status = 'paid'),
islands AS (SELECT customer_id, mi, mi - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mi) AS island FROM cm),
runs AS (SELECT customer_id, MIN(mi) AS from_mi, MAX(mi) AS to_mi, COUNT(*) AS months FROM islands GROUP BY customer_id, island)
SELECT customer_id, months,
       MAKE_DATE(FLOOR((from_mi - 1) / 12.0)::INTEGER, (((from_mi - 1) % 12) + 1)::INTEGER, 1) AS run_start,
       MAKE_DATE(FLOOR((to_mi   - 1) / 12.0)::INTEGER, (((to_mi   - 1) % 12) + 1)::INTEGER, 1) AS run_end
FROM   (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY months DESC, from_mi) AS rn FROM runs) t
WHERE  rn = 1 ORDER BY customer_id;
-- 1 | 1 | 2025-01-01 | 2025-01-01     Asha: Jan, Mar -- two runs of one; the earlier one wins the tie
-- 2 | 2 | 2025-01-01 | 2025-02-01     Bruno: Jan, Feb
-- 3 | 1 | 2025-03-01 | 2025-03-01
-- 4 | 1 | 2025-02-01 | 2025-02-01
-- 5 | 1 | 2025-02-01 | 2025-02-01     Emeka: Feb, Apr -- two runs of one
-- 6 | 1 | 2025-03-01 | 2025-03-01
-- (FLOOR(x / 12.0) rather than x / 12: EXTRACT returns a numeric on PostgreSQL and integer division would not apply anyway)`,
        notes: [
          { t: "p", text: "**Four layers for (1)**: LAG makes the flag, SUM makes the session number, GROUP BY makes the session, and a final ROW_NUMBER over the sessions gives each its position in the customer's history — a window over a grouped result, as in 3.2. The funnel is conditional aggregation over sessions, not over events, which is the grain a conversion rate is defined at." },
          { t: "p", text: "**(2) needed DISTINCT customer-months before the islands trick**, because two orders in one month would give two rows with the same month index, and the row number would advance while the index did not — a false gap. The islands trick assumes one row per step." },
          { t: "p", text: "**Only Bruno has a run longer than one month**, which is the honest answer on twelve orders — and the ROW_NUMBER tie-break on `from_mi` is what makes Asha's and Emeka's answers deterministic when their two runs tie at one." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does `SUM(new_session) OVER (PARTITION BY customer_id ORDER BY occurred_at ROWS UNBOUNDED PRECEDING)` produce a session number?",
          options: [
            "Because SUM counts rows",
            "Because new_session is 1 exactly at each session start and 0 elsewhere, so the running total increases by one at every start and is constant within a session — the count of starts so far is the session's index",
            "Because PARTITION BY resets the count",
            "It does not; it produces the event count"
          ],
          answer: 1,
          why: "A running sum of a start flag is a run identifier. The same construction numbers streaks, regimes and any other 'find the runs' problem once the boundary flag is defined."
        }
      ]
    }
  ],

  takeaways: [
    "**Flag the boundary, running-SUM the flag, group by the sum** — sessions, streaks and regimes are all this shape.",
    "**A window cannot nest inside a window**; each layer is its own CTE, one window deep.",
    "**Gaps and islands: date minus row number is constant within a run** with a fixed step, and jumps at a gap.",
    "**The islands trick needs one row per step** — DISTINCT the (entity, step) first.",
    "**Any fixed-step sequence works for islands**: days, integers, or months via year × 12 + month.",
    "**Cumulative distinct counts count first appearances** — DISTINCT is not allowed in an ordered window, and it is not needed.",
    "**A portable median is the middle row or rows**: ROW_NUMBER and COUNT over the same partition, FLOOR and CEIL of (n + 1) / 2.0.",
    "**PERCENT_RANK is (rank − 1) / (n − 1); CUME_DIST is the share at or below** — percentile positions, ties sharing.",
    "**A window over a grouped result** — ROW_NUMBER over sessions — is how a pattern gets its second level.",
    "**Conversion rates are defined at the session grain, not the event grain**: group first, then average the booleans."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A user logged in on 1, 2, 3, 6 and 7 March. What is `day − ROW_NUMBER()` for each?",
        options: [
          "1, 2, 3, 6, 7",
          "28 Feb, 28 Feb, 28 Feb, 2 Mar, 2 Mar — constant within each consecutive run, so grouping by it yields the two streaks",
          "0, 0, 0, 3, 3",
          "It is an error to subtract an integer from a date"
        ],
        answer: 1,
        why: "Within a run both the date and the row number step by one, so their difference does not move. At the gap the date jumps three days while the row number moves one, and the difference shifts by two."
      },
      {
        stem: "Why can you not write `COUNT(DISTINCT customer_id) OVER (ORDER BY month)` for a cumulative distinct count?",
        options: [
          "COUNT does not support windows",
          "DISTINCT is not permitted in an ordered window on most engines, because the frame would have to track every earlier value; count each customer's first month and running-sum the counts instead",
          "It works but is slow",
          "You can, with ROWS UNBOUNDED PRECEDING"
        ],
        answer: 1,
        why: "PostgreSQL, DuckDB and SQL Server reject DISTINCT in a window with ORDER BY. The first-appearance trick reduces the problem to a plain running sum."
      },
      {
        stem: "How many CTE layers does sessionisation need, and why?",
        options: [
          "One — LAG and SUM can be combined",
          "Two windows in sequence plus a GROUP BY — the flag from LAG, the session number from a running SUM over that flag, then the grouping — because a window function cannot be an argument to another window function",
          "Zero — GROUP BY alone can do it",
          "Four, always"
        ],
        answer: 1,
        why: "`SUM(LAG(…) OVER …) OVER …` is invalid. Each window result must be materialised as a column before the next window reads it, which is what the CTE chain does."
      },
      {
        stem: "Two customer-months come from two orders in the same month. What does that do to the islands trick, and what is the fix?",
        options: [
          "Nothing",
          "The row number advances while the month index does not, so the difference changes and a run is falsely split; DISTINCT the (customer, month) pairs first",
          "It merges two runs",
          "It raises an error"
        ],
        answer: 1,
        why: "The trick assumes exactly one row per step of the sequence. Duplicates break the one-to-one correspondence between rows and steps; de-duplicating restores it."
      },
      {
        stem: "PERCENT_RANK for the two employees tied on 125,000 is 0.56 for both, and CUME_DIST is 0.70 for both. What do the two numbers mean?",
        options: [
          "56 % and 70 % of employees earn less",
          "PERCENT_RANK: (rank − 1)/(n − 1) — five of the nine other employees are strictly below; CUME_DIST: seven of ten employees earn at most 125,000, tied rows included",
          "They are the same statistic rounded differently",
          "CUME_DIST counts rows above"
        ],
        answer: 1,
        why: "PERCENT_RANK is based on RANK, so ties share it and the top row is exactly 1. CUME_DIST is the fraction of the partition at or below the current value, so it counts the peers too."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you sessionise clickstream events in SQL?",
        strong: "Three layers. First, per user in time order, LAG the timestamp and flag an event as a session start when there is no previous event or the gap exceeds the threshold — thirty minutes, say. Second, a running SUM of that flag over the same partition and order gives a session number that increments at each start. Third, group by user and session number for the per-session facts: start, end, length, event count, whether a checkout happened. Each layer is one CTE because a window cannot nest inside a window. The threshold lives in one place, and the whole thing is one sort per user.",
        answer: [
          { t: "p", text: "Naming the three layers and why they are separate is the answer; the threshold-in-one-place point shows engineering sense." }
        ]
      },
      {
        level: "advanced",
        q: "Find each user's longest streak of consecutive daily logins.",
        strong: "Gaps and islands. Take distinct (user, day) pairs, number each user's days with ROW_NUMBER in date order, and subtract the row number as days from the date. Inside a run of consecutive days both advance by one, so the difference is constant; at a gap the date jumps and the difference changes. Group by user and that difference to get the runs with MIN, MAX and COUNT, then take the longest per user with a ROW_NUMBER over the runs, tie-broken by start date. The DISTINCT at the start matters: two logins on one day would advance the row number without advancing the date and split a real streak.",
        answer: [
          { t: "p", text: "The DISTINCT precondition and the tie-break on the longest run are the two details that separate a working answer from a remembered trick." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute a running count of distinct users by day?",
        strong: "Not with COUNT(DISTINCT) over a window — engines reject DISTINCT in an ordered window because the frame would have to remember every value seen. Instead I find each user's first day with MIN grouped by user, count first appearances per day, and running-SUM those counts in date order. A user appears once as a first appearance, so counting firsts is counting distinct users. If the series has days with no new users I join the daily counts onto a date spine first so the running sum has a row for every day. The same idea gives 'new versus returning' as a per-row attribute: a row is new if its date equals the user's first date.",
        answer: [
          { t: "p", text: "Turning an impossible window into a trivial one by changing what is counted is the insight the question is testing." }
        ]
      }
    ]
  }
});

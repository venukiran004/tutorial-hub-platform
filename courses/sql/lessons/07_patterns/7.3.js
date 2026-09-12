/* ============================================================================
   LESSON 7.3 — Cohorts, Retention, Funnels and RFM
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "**Four analyses account for most of what a product or growth team asks of a database, and all four are the same three moves: define the entity's anchor moment, bucket time relative to it, and count.** A cohort is customers grouped by when they started; retention is how many are still active n periods later; a funnel is how many reach each step in order; RFM is three per-customer numbers turned into a segment. This lesson builds each against the shop, with the anchor, the bucketing and the counting made explicit so they can be argued about — because every one of them has a definition choice that changes the number.",

  objectives: [
    "Build an acquisition cohort table and a retention triangle, and distinguish observed zeros from not-yet-observable cells",
    "Compute a funnel that respects step order and, where needed, a time box, and explain why unordered counts overstate it",
    "Score recency, frequency and monetary value with NTILE and turn the scores into named segments",
    "State the definition choices — anchor, activity, period, inclusion — that change each metric, and make them explicit in the SQL"
  ],

  prerequisites: ["3.2", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Cohorts and retention", id: "cohorts" },

    { t: "p", text: "A cohort is a group that shares an anchor: the month of first order, the week of sign-up, the day of first login. Retention asks, for each cohort, what fraction was active in each period after the anchor. **The three definitions to fix before writing SQL**: what the anchor is (first non-cancelled order here), what counts as active (any non-cancelled order in the month), and the period (calendar month). Change any one and the triangle changes." },

    { t: "code", lang: "sql", title: "Acquisition cohorts and monthly retention (executed on DuckDB)",
      hl: [2, 3, 5, 6, 8, 9],
      code: `WITH o AS (SELECT customer_id, date_trunc('month', placed_at)::DATE AS m FROM orders WHERE status <> 'cancelled'),
c  AS (SELECT customer_id, MIN(m) AS cohort FROM o GROUP BY customer_id),                       -- anchor: first active month
sz AS (SELECT cohort, COUNT(*) AS n FROM c GROUP BY cohort),                                    -- cohort size
r  AS (SELECT c.cohort, DATE_DIFF('month', c.cohort, o.m) AS month_n, COUNT(DISTINCT o.customer_id) AS active
       FROM c JOIN o USING (customer_id) GROUP BY ALL)                                          -- active per cohort per offset
SELECT r.cohort, sz.n AS cohort_size, r.month_n, r.active, ROUND(r.active * 1.0 / sz.n, 2) AS retention
FROM   r JOIN sz USING (cohort) ORDER BY r.cohort, r.month_n;`,
      caption: "`COUNT(DISTINCT customer_id)` per (cohort, offset) — a customer with three orders in a month is active once. Iker, whose only order was cancelled, is in no cohort; whether that is right depends on whether 'cancelled' means 'never really a customer' — a definition decision, made in the first line."
    },

    { t: "table",
      head: ["cohort", "cohort_size", "month_n", "active", "retention"],
      rows: [
        ["2025-01-01", "2", "0", "2", "1.00"],
        ["2025-01-01", "2", "1", "1", "0.50"],
        ["2025-01-01", "2", "2", "1", "0.50"],
        ["2025-02-01", "3", "0", "3", "1.00"],
        ["2025-02-01", "3", "1", "1", "0.33"],
        ["2025-02-01", "3", "2", "1", "0.33"],
        ["2025-03-01", "1", "0", "1", "1.00"]
      ]
    },

    { t: "code", lang: "sql", title: "The triangle: observed zeros as 0, unobservable months as NULL (executed)",
      hl: [6, 8, 9, 10],
      code: `-- ... same o, c, sz, r ...
last AS (SELECT DATE '2025-04-01' AS last_m)                                                    -- the last complete month of data
SELECT sz.cohort, sz.n,
       ROUND(MAX(CASE WHEN month_n = 0 THEN active END) * 1.0 / sz.n, 2) AS m0,
       CASE WHEN sz.cohort + INTERVAL 1 MONTH <= last_m
            THEN ROUND(COALESCE(MAX(CASE WHEN month_n = 1 THEN active END), 0) * 1.0 / sz.n, 2) END AS m1,
       CASE WHEN sz.cohort + INTERVAL 2 MONTH <= last_m
            THEN ROUND(COALESCE(MAX(CASE WHEN month_n = 2 THEN active END), 0) * 1.0 / sz.n, 2) END AS m2,
       CASE WHEN sz.cohort + INTERVAL 3 MONTH <= last_m
            THEN ROUND(COALESCE(MAX(CASE WHEN month_n = 3 THEN active END), 0) * 1.0 / sz.n, 2) END AS m3
FROM   sz LEFT JOIN r USING (cohort) CROSS JOIN last GROUP BY sz.cohort, sz.n, last_m ORDER BY sz.cohort;`,
      caption: "The COALESCE turns 'no row' into 0.0 for months that have happened; the CASE keeps NULL for months that have not. The January cohort's m3 (April) is a real 0.0 — nobody from January ordered in April; the February cohort's m3 (May) is NULL because May has not happened. Conflating the two is the most common retention-chart error."
    },

    { t: "table",
      head: ["cohort", "n", "m0", "m1", "m2", "m3"],
      rows: [
        ["2025-01-01", "2", "1.00", "0.50", "0.50", "0.00"],
        ["2025-02-01", "3", "1.00", "0.33", "0.33", "NULL"],
        ["2025-03-01", "1", "1.00", "0.00", "NULL", "NULL"]
      ]
    },

    { t: "dl", items: [
      ["Cohort", "Entities sharing an anchor period — first purchase month, sign-up week. Compared across time to separate 'newer customers behave differently' from 'everyone behaves differently now'."],
      ["Retention (n-period)", "Share of a cohort active in period n after the anchor. Period 0 is 1.0 by construction when the anchor is an activity."],
      ["Unbounded vs bounded retention", "Unbounded: active in period n *or any later period* (still around). Bounded: active in period n exactly. The triangle above is bounded; unbounded is monotone and larger."],
      ["Funnel", "Ordered steps with the count reaching each. Conversion between steps is the ratio of consecutive counts; a time box limits how long the sequence may take."],
      ["RFM", "Recency (days since last purchase), frequency (purchases in the window), monetary (spend in the window), each scored into quantiles and combined into segments."],
      ["`NTILE(n)`", "Window function assigning each row to one of n equal-sized buckets by the ORDER BY. The scoring primitive for RFM; buckets differ in size by at most one row."]
    ]},

    { t: "h2", n: "02", text: "Funnels that respect order", id: "funnels" },

    { t: "p", text: "The naive funnel — count customers with any view, any cart, any checkout — overstates conversion because it ignores order: a customer who checked out and then browsed counts as a view→checkout. **Anchor each customer's first occurrence of each step and require the timestamps to increase.** A time box — checkout within an hour of first view — turns 'eventually' into 'in this session'." },

    { t: "code", lang: "sql", title: "Ordered funnel with per-step conversion (executed)",
      hl: [3, 4, 5, 9, 10, 12],
      code: `WITH f AS (
  SELECT customer_id,
         MIN(CASE WHEN event_type = 'view'     THEN occurred_at END) AS t_view,        -- first occurrence of each step
         MIN(CASE WHEN event_type = 'cart'     THEN occurred_at END) AS t_cart,
         MIN(CASE WHEN event_type = 'checkout' THEN occurred_at END) AS t_checkout
  FROM   events GROUP BY customer_id
)
SELECT COUNT(*)                                                                    AS viewed,
       COUNT(*) FILTER (WHERE t_cart > t_view)                                     AS carted,          -- order enforced
       COUNT(*) FILTER (WHERE t_checkout > t_cart AND t_cart > t_view)             AS checked_out,
       ROUND(COUNT(*) FILTER (WHERE t_cart > t_view) * 1.0 / COUNT(*), 2)          AS view_to_cart,
       ROUND(COUNT(*) FILTER (WHERE t_checkout > t_cart AND t_cart > t_view) * 1.0
             / NULLIF(COUNT(*) FILTER (WHERE t_cart > t_view), 0), 2)              AS cart_to_checkout
FROM   f WHERE t_view IS NOT NULL;
-- viewed 6 | carted 4 | checked_out 2 | view_to_cart 0.67 | cart_to_checkout 0.50

-- Emeka (customer 5) viewed and checked out with no cart event: he reaches 'viewed' and not 'checked_out' under this
-- definition, because the funnel is view -> cart -> checkout. Whether a skipped step counts is another decision to write down.`,
      caption: "A comparison with NULL is NULL, so a customer with no cart timestamp fails `t_cart > t_view` and drops out — the right behaviour, obtained for free from three-valued logic (1.3). The 3.5 funnel counted steps without ordering; this one is stricter and smaller."
    },

    { t: "code", lang: "sql", title: "Time-boxed: checkout within 60 minutes of first view (executed)",
      hl: [2],
      code: `SELECT customer_id, t_view, t_checkout, DATE_DIFF('minute', t_view, t_checkout) AS mins,
       (t_checkout <= t_view + INTERVAL 60 MINUTE) AS within_60
FROM   f WHERE t_checkout IS NOT NULL ORDER BY 1;
-- 1 | 2025-03-15 13:02 | 2025-03-15 13:45 | 43 | true
-- 3 | 2025-03-27 17:00 | 2025-03-27 17:25 | 25 | true
-- 5 | 2025-04-04 11:40 | 2025-04-04 12:10 | 30 | true`,
      caption: "For multi-session funnels — a customer who views on Monday and checks out on Friday — the first-occurrence anchor is wrong; sessionise first (gaps of more than 30 minutes start a new session, a LAG and a running SUM as in 3.2) and run the funnel per session."
    },

    { t: "h2", n: "03", text: "RFM scoring and segments", id: "rfm" },

    { t: "code", lang: "sql", title: "Recency, frequency, monetary — scored with NTILE and named (executed)",
      hl: [5, 6, 7, 8, 12, 13, 14, 18, 19, 20, 21],
      code: `WITH o AS (
  SELECT o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi USING (order_id) WHERE o.status = 'paid' GROUP BY ALL
),
base AS (                                                                   -- one row per customer, non-buyers included
  SELECT c.customer_id, c.name,
         DATE_DIFF('day', MAX(o.placed_at)::DATE, DATE '2025-04-30') AS recency_days,   -- as of a fixed date, not now()
         COUNT(o.placed_at) AS frequency, COALESCE(SUM(o.amount), 0) AS monetary
  FROM   customers c LEFT JOIN o USING (customer_id) GROUP BY c.customer_id, c.name
),
scored AS (
  SELECT *, NTILE(4) OVER (ORDER BY recency_days DESC NULLS FIRST) AS r_score,   -- most recent -> 4; never bought (NULL) -> 1
            NTILE(4) OVER (ORDER BY frequency, monetary)           AS f_score,   -- ties broken by spend
            NTILE(4) OVER (ORDER BY monetary)                      AS m_score
  FROM   base
)
SELECT customer_id, name, recency_days, frequency, monetary, r_score, f_score, m_score,
       CASE WHEN frequency = 0                  THEN 'never bought'
            WHEN r_score >= 3 AND f_score >= 3  THEN 'champion'
            WHEN r_score >= 3                   THEN 'recent'
            WHEN f_score >= 3                   THEN 'loyal, lapsing'
            ELSE 'at risk' END AS segment
FROM   scored ORDER BY customer_id;`,
      caption: "The recency ordering is DESC with NULLS FIRST so that the oldest (and never) land in bucket 1 and the most recent in bucket 4 — read the direction of every NTILE twice. The reference date is a literal, so the scores are reproducible; `now()` would make yesterday's champion today's at-risk without anything changing."
    },

    { t: "table",
      head: ["customer_id", "name", "recency_days", "frequency", "monetary", "r", "f", "m", "segment"],
      rows: [
        ["1", "Asha", "46", "3", "234.50", "3", "4", "4", "champion"],
        ["2", "Bruno", "78", "2", "112.50", "2", "3", "3", "loyal, lapsing"],
        ["3", "Chen", "34", "1", "32.00", "4", "2", "2", "recent"],
        ["4", "Dalia", "64", "1", "139.00", "2", "3", "4", "loyal, lapsing"],
        ["5", "Emeka", "26", "2", "137.90", "4", "4", "3", "champion"],
        ["6", "Fatou", "43", "1", "42.00", "3", "2", "2", "recent"],
        ["7", "Iker", "NULL", "0", "0.00", "1", "1", "1", "never bought"],
        ["8", "Mara", "NULL", "0", "0.00", "1", "1", "1", "never bought"]
      ]
    },

    { t: "callout", kind: "trap", title: "Quartiles of eight customers are pairs", body: [
      { t: "p", text: "Dalia has one order and an f_score of 3 because NTILE(4) over eight rows puts two customers in each bucket and the tie-break on spend placed her above Chen and Fatou. **NTILE ranks relative to the population; it does not measure anything absolute.** With a real customer base the buckets are large and the scores meaningful, but the rule stands: a score of 4 means 'top quarter of this population on this date', and comparing scores across dates or populations needs fixed thresholds (`CASE WHEN frequency >= 5 THEN 4 …`) instead." }
    ]},

    { t: "viz",
      title: "Three analyses, one skeleton",
      caption: "Each starts from an anchor per entity, buckets time relative to it, and counts distinct entities per bucket. The definition choices sit in the first step; the SQL after it is nearly identical.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Three columns for cohorts, funnels and RFM, each with three rows: anchor, bucket, count. The rows show how the same skeleton is filled for each analysis.">
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="240" y="34">cohort / retention</text>
    <text x="500" y="34">funnel</text>
    <text x="760" y="34">RFM</text>
  </g>
  <g class="s-label" text-anchor="end" style="font-weight:600">
    <text x="120" y="80">anchor</text>
    <text x="120" y="135">bucket</text>
    <text x="120" y="190">count</text>
  </g>
  <g stroke-width="1.2">
    <rect x="140" y="58" width="200" height="34" rx="6" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="400" y="58" width="200" height="34" rx="6" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="660" y="58" width="200" height="34" rx="6" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="140" y="113" width="200" height="34" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="400" y="113" width="200" height="34" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="660" y="113" width="200" height="34" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="140" y="168" width="200" height="34" rx="6" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="400" y="168" width="200" height="34" rx="6" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="660" y="168" width="200" height="34" rx="6" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="240" y="80">MIN(month) per customer</text>
    <text x="500" y="80">MIN(time) per step per customer</text>
    <text x="760" y="80">a fixed as-of date</text>
    <text x="240" y="135">months since anchor</text>
    <text x="500" y="135">step order · time box</text>
    <text x="760" y="135">NTILE over R, F, M</text>
    <text x="240" y="190">DISTINCT active / cohort size</text>
    <text x="500" y="190">FILTER per step / previous step</text>
    <text x="760" y="190">CASE over scores → segment</text>
  </g>
</svg>`
    },

    { t: "ladder",
      title: "'What is our monthly retention?'",
      rungs: [
        { level: "bad", label: "Customers active this month over customers active last month", code: `SELECT COUNT(DISTINCT customer_id) FILTER (WHERE m = '2025-03-01') * 1.0
     / COUNT(DISTINCT customer_id) FILTER (WHERE m = '2025-02-01') FROM o`,
          note: "**Not retention.** March's actives include new customers; the ratio can exceed 1 while every February customer left." },
        { level: "ok", label: "Share of February's actives who were active in March", code: `WITH feb AS (SELECT DISTINCT customer_id FROM o WHERE m = '2025-02-01')
SELECT COUNT(DISTINCT o.customer_id) * 1.0 / (SELECT COUNT(*) FROM feb)
FROM o JOIN feb USING (customer_id) WHERE o.m = '2025-03-01'`,
          note: "**A real month-over-month retention.** One number that mixes customers of every age; a drop could be a large young cohort or a real change." },
        { level: "best", label: "The cohort triangle", code: `-- cohort x month_n, bounded, with NULL for unobserved cells (section 01)`,
          note: "**Separates age from time.** Reading down a column compares cohorts at the same age; reading along a row shows a cohort's curve. This is what 'retention' should mean in a report." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Weekly sign-up cohorts with unbounded retention",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "Build a cohort table anchored on the **week of sign-up** (`customers.signed_up`), with activity defined as any non-cancelled order, and compute **unbounded** retention — the share of the cohort who ordered in week n *or any later week* — for weeks 0 to 8. Cells beyond the data's last complete week (take it as the week of 2025-04-28) must be NULL. Explain in a comment why unbounded retention is monotone non-increasing across n and why bounded is not." }
      ],
      requirements: [
        "Anchor: `date_trunc('week', signed_up)`; week_n from the order's week.",
        "Unbounded: a customer counts for week n if their latest active week offset is >= n.",
        "NULL beyond the observable horizon; 0.0 for observed weeks with nobody.",
        "One row per cohort, columns w0 … w8 (a generated pivot is acceptable)."
      ],
      hint: "Compute each customer's maximum week offset once; then a customer contributes to every n <= that maximum. A CROSS JOIN with generate_series(0, 8) turns that into rows, and the pivot is conditional aggregation.",
      solution: {
        lang: "sql",
        title: "weekly_unbounded.sql",
        code: `WITH c AS (SELECT customer_id, date_trunc('week', signed_up)::DATE AS cohort FROM customers),
o AS (SELECT DISTINCT customer_id, date_trunc('week', placed_at)::DATE AS w FROM orders WHERE status <> 'cancelled'),
last_off AS (                                                    -- each customer's latest active week offset (NULL: never active)
  SELECT c.customer_id, c.cohort, MAX(DATE_DIFF('week', c.cohort, o.w)) AS max_n
  FROM   c LEFT JOIN o USING (customer_id) GROUP BY c.customer_id, c.cohort
),
sz AS (SELECT cohort, COUNT(*) AS n FROM c GROUP BY cohort),
grid AS (SELECT cohort, k AS week_n FROM sz CROSS JOIN generate_series(0, 8) g(k)),
ret AS (
  SELECT g.cohort, g.week_n,
         COUNT(l.customer_id) FILTER (WHERE l.max_n >= g.week_n) AS retained      -- unbounded: active at n or later
  FROM   grid g LEFT JOIN last_off l USING (cohort) GROUP BY g.cohort, g.week_n
),
horizon AS (SELECT DATE '2025-04-28' AS last_w)
SELECT r.cohort, sz.n,
       MAX(CASE WHEN week_n = 0 THEN v END) AS w0, MAX(CASE WHEN week_n = 1 THEN v END) AS w1,
       MAX(CASE WHEN week_n = 2 THEN v END) AS w2, MAX(CASE WHEN week_n = 3 THEN v END) AS w3,
       MAX(CASE WHEN week_n = 4 THEN v END) AS w4, MAX(CASE WHEN week_n = 5 THEN v END) AS w5,
       MAX(CASE WHEN week_n = 6 THEN v END) AS w6, MAX(CASE WHEN week_n = 7 THEN v END) AS w7,
       MAX(CASE WHEN week_n = 8 THEN v END) AS w8
FROM  (SELECT r.cohort, r.week_n,
              CASE WHEN r.cohort + r.week_n * INTERVAL 7 DAY <= h.last_w        -- observable?
                   THEN ROUND(r.retained * 1.0 / sz.n, 2) END AS v
       FROM ret r JOIN sz USING (cohort) CROSS JOIN horizon h) r
JOIN  sz USING (cohort)
GROUP BY r.cohort, sz.n ORDER BY r.cohort;

-- unbounded retention at n counts customers whose latest activity is at n or later; the set for n+1 is a subset of the set
-- for n, so the share cannot increase with n. bounded retention counts activity in week n exactly, and a customer can be
-- inactive in week 3 and active in week 4, so bounded can rise and fall.`,
        notes: [
          { t: "p", text: "**The max-offset trick makes unbounded retention one comparison per customer per n**, instead of an EXISTS over later weeks. It also makes the monotonicity obvious: `max_n >= n` implies `max_n >= n - 1`." },
          { t: "p", text: "**Sign-up cohorts include customers who never ordered** — Mara and Iker sit in their cohorts with `max_n` NULL and count for no week, so w0 is below 1.0 for their cohorts. That is correct for a sign-up anchor and impossible for an acquisition anchor; the choice of anchor decides whether 'week 0' can be less than 100%." },
          { t: "p", text: "**The horizon check uses the cohort's own start plus n weeks**, so each cohort's NULLs begin where its observable window ends — the staircase shape of a proper triangle." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the retention triangle, why is the January cohort's m3 shown as 0.00 while the February cohort's m3 is NULL?",
          options: [
            "A rendering bug",
            "January + 3 months is April, which is in the data and had no January-cohort orders — an observed zero; February + 3 months is May, which is after the data — unobservable, so NULL",
            "February's cohort was larger",
            "NULL means 0"
          ],
          answer: 1,
          why: "Conflating 'nobody came back' with 'we cannot know yet' makes the newest cohorts look like they collapsed. The horizon check is part of the query."
        }
      ]
    }
  ],

  takeaways: [
    "**Every one of these analyses is anchor → bucket → count**, and the definition choices all live in the anchor and the activity filter.",
    "**Cohort retention separates customer age from calendar time**; a single month-over-month number cannot.",
    "**Bounded retention counts activity in period n exactly; unbounded counts n or later** and is monotone.",
    "**Distinguish observed zeros from unobservable cells**: COALESCE to 0 inside the horizon, NULL beyond it.",
    "**A funnel must respect step order** — first-occurrence timestamps that increase — or it overstates conversion; a time box turns 'eventually' into 'in this session'.",
    "**NULL comparisons drop customers who skipped a step**, which is the correct behaviour and comes free from three-valued logic.",
    "**RFM scores with NTILE are relative to the population on the date**; use fixed thresholds to compare across dates.",
    "**Read the direction of every NTILE ORDER BY**: recency is DESC NULLS FIRST so that recent scores high and never-bought scores 1.",
    "**Use a literal as-of date, not now()**, so that scores and cohorts are reproducible.",
    "**Write the definition decisions in the SQL as comments** — cancelled orders, skipped steps, the horizon — because they are what the next analyst will disagree with."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does an acquisition cohort's month-0 retention equal, and why?",
        options: [
          "It varies",
          "1.0 by construction: the anchor is the first active month, so every member is active in month 0; a sign-up anchor would allow month 0 below 1.0",
          "0.0",
          "The average of later months"
        ],
        answer: 1,
        why: "The anchor defines the cohort; when the anchor is itself an activity, period 0 is full. That is also why acquisition cohorts exclude customers who never bought."
      },
      {
        stem: "A funnel counts customers with any view, any cart and any checkout as 6, 4, 3. The ordered version gives 6, 4, 2. Which is right?",
        options: [
          "The first; it has more data",
          "The ordered one for a conversion funnel: the third customer's checkout did not follow a cart, so it is not a cart-to-checkout conversion; the unordered count answers a different question ('who has ever done each thing')",
          "Neither",
          "Average them"
        ],
        answer: 1,
        why: "The executed ordered funnel gave 6 / 4 / 2 with Emeka excluded for skipping the cart step. Whether skipped steps should count is a definition decision to document, not a bug."
      },
      {
        stem: "Why should RFM use a fixed as-of date rather than now()?",
        options: [
          "now() is slow",
          "Recency and the quantile buckets depend on the date; with now(), the same customer's score changes daily with no change in behaviour, and results cannot be reproduced",
          "now() returns UTC",
          "It does not matter"
        ],
        answer: 1,
        why: "A reproducible analysis names its date. It also makes the scores comparable across runs of the same definition."
      },
      {
        stem: "NTILE(4) OVER (ORDER BY monetary) gives a customer a 4. What does that mean?",
        options: [
          "They spent over a fixed threshold",
          "They are in the top quarter of this population by spend on this date; the score is relative, and buckets differ in size by at most one row",
          "They are the top spender",
          "They spent four times the average"
        ],
        answer: 1,
        why: "NTILE is a ranking, not a measurement. Fixed thresholds via CASE give absolute, cross-period comparable scores when those are needed."
      },
      {
        stem: "Which change makes bounded retention non-monotone while unbounded stays monotone?",
        options: [
          "Using weeks instead of months",
          "A customer inactive in period 3 and active in period 4: bounded retention rises at 4; unbounded counts them for every n up to 4, so it never rises",
          "Larger cohorts",
          "Including cancelled orders"
        ],
        answer: 1,
        why: "Unbounded retention is 'still around by period n', a set that only shrinks. Bounded is 'active in period n', which can bounce."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you compute monthly cohort retention in SQL?",
        strong: "Three CTEs. First, each customer's cohort — the month of their first qualifying order. Second, each customer's active months — distinct months with a qualifying order. Third, join them and compute the month offset with a date difference, then count distinct customers per cohort and offset, divided by the cohort size. Pivot to a triangle with conditional aggregation. The details that matter: define 'qualifying' explicitly — I would exclude cancelled orders and say so; use COUNT DISTINCT so a busy month is not double-counted; and distinguish observed zeros from cells beyond the data's horizon with a CASE on the cohort's date plus the offset, so new cohorts do not look like they collapsed.",
        answer: [
          { t: "p", text: "The three CTEs, the qualifying definition, and the horizon treatment are the whole answer." }
        ]
      },
      {
        level: "core",
        q: "What is wrong with counting funnel steps independently?",
        strong: "It ignores order and time. A customer who checked out and then viewed a product counts as a view-to-checkout conversion; someone who added to cart last month and checked out today counts as a cart-to-checkout conversion. The fix is to anchor each step on its first occurrence per customer — or per session, after sessionising with a gap rule — and require the timestamps to increase, optionally within a time box. That gives smaller, honest numbers, and it forces the definition question of whether a skipped step counts, which should be decided and written down rather than left to the query's accident.",
        answer: [
          { t: "p", text: "Order, time box, sessionising, and the skipped-step decision." }
        ]
      },
      {
        level: "advanced",
        q: "Design an RFM segmentation that a marketing team can use month after month.",
        strong: "Compute recency, frequency and monetary per customer as of a fixed date at the start of each month, over a fixed window such as the trailing twelve months, including non-buyers with NULL recency and zero counts. For scoring I would avoid pure NTILE, because a quartile is relative to that month's population and a customer's score would drift with the base rather than with their behaviour; instead fixed thresholds agreed with the team — recency under 30 days scores 4, and so on — with NTILE used once to choose sensible thresholds. Segments are a CASE over the scores with named rules. Store the result keyed on customer and as-of month so movements between segments can be tracked, and keep the definitions as comments in the one query that produces it.",
        answer: [
          { t: "p", text: "Fixed date, fixed window, fixed thresholds, stored by month — the version that survives contact with a team." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 5.6 — Window Functions and Analytical SQL
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "**A window function computes an aggregate over a set of rows and returns it on every row — without collapsing them.** It is `GROUP BY` that keeps the detail, `rank` and `shift` and `rolling` from pandas expressed in SQL, and the reason most \"latest record per customer\" and \"running total\" queries belong in the database rather than in a DataFrame.",

  objectives: [
    "Explain what `OVER` does and how it differs from `GROUP BY`",
    "Use `PARTITION BY` and `ORDER BY` inside a window to scope and order it",
    "Choose between `ROW_NUMBER`, `RANK` and `DENSE_RANK` for a given tie rule",
    "Use `LAG`, `LEAD` and frame clauses for running and offset calculations",
    "Deduplicate to the latest row per key with a window and a CTE"
  ],

  prerequisites: ["5.5", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "OVER: an aggregate that does not collapse", id: "over" },

    { t: "p", text: "`SUM(amount)` with `GROUP BY customer` returns one row per customer. **`SUM(amount) OVER (PARTITION BY customer)` returns every original row, each carrying its customer's total.** Same computation, different output shape — and the shape is the whole point." },

    { t: "dl", items: [
      ["Window function", "An aggregate or ranking function followed by `OVER (...)`. Computed over a window of rows related to the current row; the current row is returned with the result attached."],
      ["`PARTITION BY`", "Splits the rows into groups the window operates within — the `groupby` key. Without it, the window is the whole result set."],
      ["`ORDER BY` (in the window)", "Orders rows within each partition. Required for ranking functions and for `LAG`/`LEAD`; it also changes what a frame means."],
      ["Frame clause", "`ROWS BETWEEN ... AND ...` — which rows around the current one the aggregate covers. With `ORDER BY` and no frame, the default is **unbounded preceding to current row**: a running total."],
      ["`ROW_NUMBER` / `RANK` / `DENSE_RANK`", "Three ranking functions that differ only on ties: unique numbers, gaps after ties, no gaps."],
      ["`LAG` / `LEAD`", "The value from a previous or following row in the partition — `shift(1)` and `shift(-1)`."]
    ]},

    { t: "viz",
      title: "GROUP BY collapses; OVER annotates",
      caption: "Six order rows, two customers. GROUP BY returns two rows of totals. OVER (PARTITION BY customer) returns all six, each with its customer's total beside it — exactly what pandas transform does.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Six order rows grouped into two customer totals on the left, and the same six rows each annotated with their customer total on the right">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">orders</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="52" class="s-sub" style="fill:var(--ink-3)">cust  amt</text>
    <text x="30" y="74" class="s-sub" style="fill:var(--acc)">A     10</text>
    <text x="30" y="94" class="s-sub" style="fill:var(--acc)">A     20</text>
    <text x="30" y="114" class="s-sub" style="fill:var(--acc)">A     30</text>
    <text x="30" y="134" class="s-sub" style="fill:var(--good)">B     5</text>
    <text x="30" y="154" class="s-sub" style="fill:var(--good)">B     15</text>
    <text x="30" y="174" class="s-sub" style="fill:var(--good)">B     25</text>
  </g>

  <text x="250" y="26" class="s-label" style="fill:var(--ink-2)">SUM(amt) … GROUP BY cust</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="250" y="52" class="s-sub" style="fill:var(--ink-3)">cust  total</text>
    <text x="250" y="74" class="s-sub" style="fill:var(--acc)">A     60</text>
    <text x="250" y="94" class="s-sub" style="fill:var(--good)">B     45</text>
  </g>
  <text x="250" y="130" class="s-sub" style="fill:var(--ink-3)">2 rows — the detail is gone</text>

  <text x="520" y="26" class="s-label" style="fill:var(--ink-2)">SUM(amt) OVER (PARTITION BY cust)</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="520" y="52" class="s-sub" style="fill:var(--ink-3)">cust  amt  total  share</text>
    <text x="520" y="74" class="s-sub" style="fill:var(--acc)">A     10   60     0.17</text>
    <text x="520" y="94" class="s-sub" style="fill:var(--acc)">A     20   60     0.33</text>
    <text x="520" y="114" class="s-sub" style="fill:var(--acc)">A     30   60     0.50</text>
    <text x="520" y="134" class="s-sub" style="fill:var(--good)">B     5    45     0.11</text>
    <text x="520" y="154" class="s-sub" style="fill:var(--good)">B     15   45     0.33</text>
    <text x="520" y="174" class="s-sub" style="fill:var(--good)">B     25   45     0.56</text>
  </g>
  <text x="520" y="210" class="s-sub" style="fill:var(--ink-3)">6 rows — every row keeps its detail and gains</text>
  <text x="520" y="230" class="s-sub" style="fill:var(--ink-3)">its group's aggregate; amt / total needs no join</text>

  <line x1="30" y1="252" x2="850" y2="252" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="278" class="s-sub" style="fill:var(--ink-3)">Add ORDER BY amt inside the OVER and the SUM becomes a running total: 10, 30, 60 for A. Add ROWS BETWEEN 1 PRECEDING AND CURRENT ROW and it is a two-row moving sum.</text>
</svg>`
    },

    { t: "code", lang: "sql", title: "the basic window, and the three things the OVER clause controls", code: `
-- THE ANNOTATING AGGREGATE. Every row, plus its partition's total.
SELECT   customer_id,
         order_id,
         amount,
         SUM(amount)   OVER (PARTITION BY customer_id) AS cust_total,
         amount * 1.0 / SUM(amount) OVER (PARTITION BY customer_id) AS share,
         COUNT(*)      OVER (PARTITION BY customer_id) AS cust_orders,
         AVG(amount)   OVER ()                          AS overall_avg
FROM     orders;
--
-- OVER () with nothing inside: the window is the WHOLE result. Every
-- row gets the grand average. Useful for "how does this row compare
-- to everything".
--
-- This is pandas transform. The join-free "share of group" is the
-- most common reason to reach for a window.

-- ORDER BY INSIDE THE WINDOW MAKES IT CUMULATIVE:
SELECT   customer_id, order_date, amount,
         SUM(amount) OVER (PARTITION BY customer_id
                           ORDER BY order_date)        AS running_total
FROM     orders;
--
-- With ORDER BY and no explicit frame, the default frame is
--   RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- so each row's SUM covers everything from the partition's start to
-- this row. A running total, per customer, in date order.
--
-- THE RANGE/ROWS DISTINCTION BITES ON TIES: RANGE includes every row
-- with the SAME order_date as the current one -- peers -- so two
-- orders on the same day both get the total INCLUDING both. ROWS
-- includes only rows up to the current one's position. For a running
-- total by row, say ROWS explicitly:
SELECT   SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
FROM     orders;

-- THE FRAME CLAUSE -- a moving window:
SELECT   order_date, amount,
         AVG(amount) OVER (ORDER BY order_date
                           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7,
         AVG(amount) OVER (ORDER BY order_date
                           ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS ma7_lag
FROM     daily_sales;
--
-- ma7: this row and the six before -- pandas rolling(7).
-- ma7_lag: the seven rows before, EXCLUDING this one -- rolling(7)
--          .shift(1). The causal version, for a feature (see 4.3).
--
-- FRAME OPTIONS:
--   ROWS BETWEEN n PRECEDING AND CURRENT ROW      last n+1 rows
--   ROWS BETWEEN CURRENT ROW AND n FOLLOWING      next n+1 rows (future!)
--   ROWS BETWEEN n PRECEDING AND n FOLLOWING      centred (uses future)
--   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING   the whole
--                                                 partition, ordered
--   RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
--                                                 a TIME window, not a
--                                                 row count (Postgres,
--                                                 not every engine)

-- NAMING A WINDOW when several functions share it:
SELECT   customer_id, order_date, amount,
         SUM(amount)   OVER w AS running,
         COUNT(*)      OVER w AS n_so_far,
         AVG(amount)   OVER w AS avg_so_far
FROM     orders
WINDOW   w AS (PARTITION BY customer_id ORDER BY order_date);
--
-- One definition, three uses. The WINDOW clause sits between WHERE/
-- GROUP BY and ORDER BY.

-- WINDOW FUNCTIONS RUN AFTER WHERE, GROUP BY AND HAVING, and BEFORE
-- ORDER BY and LIMIT. So:
--   - a window sees only rows that survived WHERE
--   - you CANNOT filter on a window result in the same query's WHERE
--     (it does not exist yet) -- wrap in a CTE or subquery
--   - a window over a GROUP BY result operates on the grouped rows
SELECT   region, SUM(amount) AS revenue,
         RANK() OVER (ORDER BY SUM(amount) DESC) AS region_rank
FROM     orders
GROUP BY region;
--   RANK sees the grouped SUMs, one per region. Legal and common.
`,
      hl: [5, 21, 31, 41],
      caption: "**`RANGE` includes peers with the same `ORDER BY` value; `ROWS` includes only positions.** Two orders on the same day get different running totals under the two frames — say `ROWS` explicitly for a per-row running sum."
    },

    { t: "h2", n: "02", text: "Ranking, and the latest row per key", id: "ranking" },

    { t: "code", lang: "sql", title: "ROW_NUMBER, RANK, DENSE_RANK, and the deduplication they enable", code: `
-- THREE RANKING FUNCTIONS, differing only on ties.
-- scores: 90, 85, 85, 70
SELECT   name, score,
         ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,      -- 1 2 3 4
         RANK()       OVER (ORDER BY score DESC) AS rnk,     -- 1 2 2 4
         DENSE_RANK() OVER (ORDER BY score DESC) AS drnk     -- 1 2 2 3
FROM     results;
--
-- ROW_NUMBER: unique, ties broken ARBITRARILY unless the ORDER BY
--             is unique. Two rows with score 85 get 2 and 3 in an
--             order the engine chooses -- and may choose differently
--             next run.
-- RANK:       ties share; the next rank SKIPS. "Joint 2nd, then 4th."
--             pandas rank(method="min").
-- DENSE_RANK: ties share; no skip. "Joint 2nd, then 3rd."
--             pandas rank(method="dense").
--
-- FOR A DETERMINISTIC ROW_NUMBER, add a tiebreak:
ROW_NUMBER() OVER (ORDER BY score DESC, name)

-- NTILE -- buckets:
SELECT   customer_id, lifetime_value,
         NTILE(10) OVER (ORDER BY lifetime_value DESC) AS decile
FROM     customers;
--   1 = top 10%. Equal-COUNT buckets, like pd.qcut. Ties can straddle
--   a boundary, which is sometimes wrong for a decile report.

-- PERCENT_RANK and CUME_DIST -- pandas rank(pct=True), roughly:
PERCENT_RANK() OVER (ORDER BY score)     -- (rank - 1) / (n - 1): 0..1
CUME_DIST()    OVER (ORDER BY score)     -- fraction of rows <= this

-- THE PATTERN: LATEST ROW PER KEY.
-- customers has many rows per customer_id (one per update). Keep
-- the most recent.
WITH ranked AS (
    SELECT   *,
             ROW_NUMBER() OVER (PARTITION BY customer_id
                                ORDER BY updated_at DESC, version DESC) AS rn
    FROM     customer_history
)
SELECT   *
FROM     ranked
WHERE    rn = 1;
--
-- THIS IS THE DEDUPLICATION QUERY. Partition by the key, order by
-- recency, keep row 1. The CTE is required because WHERE cannot see
-- the window result in the same SELECT.
--
-- THE TIEBREAK (version DESC) MATTERS. Two updates with the same
-- updated_at and no tiebreak give ROW_NUMBER an arbitrary choice --
-- a different "latest" row on different runs. Every ROW_NUMBER used
-- for dedup needs an ORDER BY that is unique within the partition.
--
-- pandas: sort_values([...]).drop_duplicates("customer_id", keep="last")
-- The SQL runs where the data is, with an index on (customer_id,
-- updated_at), and never moves the history table.

-- TOP N PER GROUP -- the same shape:
WITH ranked AS (
    SELECT   region, product, revenue,
             DENSE_RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS r
    FROM     product_sales
)
SELECT * FROM ranked WHERE r <= 3;
--
-- Top 3 products per region. DENSE_RANK so a tie for 3rd includes
-- both; ROW_NUMBER if you want exactly three.

-- FINDING DUPLICATES (not removing them):
WITH counted AS (
    SELECT   *,
             COUNT(*) OVER (PARTITION BY email) AS n_same_email
    FROM     customers
)
SELECT * FROM counted WHERE n_same_email > 1 ORDER BY email;
--
-- Every row that shares an email with another, WITH the rows it
-- shares it with -- pandas duplicated(keep=False). GROUP BY ...
-- HAVING COUNT(*) > 1 tells you WHICH emails; this tells you which
-- ROWS.

-- FIRST_VALUE / LAST_VALUE -- the frame default catches people:
SELECT   customer_id, order_date, amount,
         FIRST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS first_amt,
         LAST_VALUE(amount)  OVER (PARTITION BY customer_id ORDER BY order_date) AS last_amt_WRONG,
         LAST_VALUE(amount)  OVER (PARTITION BY customer_id ORDER BY order_date
                                   ROWS BETWEEN UNBOUNDED PRECEDING
                                            AND UNBOUNDED FOLLOWING) AS last_amt
FROM     orders;
--
-- last_amt_WRONG returns the CURRENT row's amount, not the last in the
-- partition -- because the default frame ends at CURRENT ROW, and the
-- "last value" of a frame ending here is here. The explicit frame to
-- UNBOUNDED FOLLOWING is required. This surprises everyone once.
`,
      hl: [9, 37, 49, 94],
      caption: "**`LAST_VALUE` without an explicit frame returns the current row's value.** The default frame ends at `CURRENT ROW`, so the \"last\" row of it is this one — `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is required."
    },

    { t: "callout", kind: "trap", title: "ROW_NUMBER with a non-unique ORDER BY is non-deterministic", body: [
      { t: "p", text: "Two history rows with the same `updated_at` and no further tiebreak get row numbers 1 and 2 in whatever order the engine encountered them. **The \"latest\" record can change between runs of an identical query on identical data.**" },
      { t: "p", text: "Every `ROW_NUMBER` used for deduplication needs an `ORDER BY` that is unique within its partition — add a version, an id, or a load timestamp as the final key." },
      { t: "p", text: "`RANK` makes the tie visible (both rows get 1); `ROW_NUMBER` hides it. If ties are possible and you want to know, `RANK` first." }
    ]},

    { t: "h2", n: "03", text: "LAG, LEAD and the calculations that need the previous row", id: "lag" },

    { t: "code", lang: "sql", title: "offsets, gaps, and sessionising in SQL", code: `
-- LAG: the value from n rows BEFORE, in the window's order.
-- LEAD: from n rows AFTER.
SELECT   customer_id, order_date, amount,
         LAG(amount)        OVER w AS prev_amount,
         LAG(amount, 2)     OVER w AS prev2_amount,
         LAG(amount, 1, 0)  OVER w AS prev_or_zero,     -- default for the first row
         LEAD(order_date)   OVER w AS next_order_date
FROM     orders
WINDOW   w AS (PARTITION BY customer_id ORDER BY order_date);
--
-- The first row in each partition has no previous: LAG returns NULL
-- (or the default). pandas groupby().shift(1), with the same NaN at
-- each group's start.
--
-- LEAD IS THE FUTURE. As a feature for a model predicting this row,
-- it is leakage. As a label -- "did they order again, and when" -- it
-- is exactly right. Same function, opposite roles (see 4.3).

-- CHANGE FROM THE PREVIOUS ROW:
SELECT   order_date, amount,
         amount - LAG(amount) OVER (ORDER BY order_date) AS delta,
         (amount - LAG(amount) OVER (ORDER BY order_date))
           * 1.0 / NULLIF(LAG(amount) OVER (ORDER BY order_date), 0) AS pct_change
FROM     daily_sales;
--   pandas diff() and pct_change(). NULLIF for the zero-divide.

-- DAYS SINCE THE LAST ORDER -- the recency feature:
SELECT   customer_id, order_date,
         order_date - LAG(order_date) OVER (PARTITION BY customer_id
                                            ORDER BY order_date) AS days_since_prev
FROM     orders;

-- SESSIONISING -- the cumsum-of-flags trick from 3.7, in SQL:
WITH gaps AS (
    SELECT   user_id, ts,
             CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts)
                       > INTERVAL '30 minutes'
                    OR LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) IS NULL
                  THEN 1 ELSE 0 END AS new_session
    FROM     events
),
sessions AS (
    SELECT   user_id, ts,
             SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts
                                    ROWS BETWEEN UNBOUNDED PRECEDING
                                             AND CURRENT ROW) AS session_n
    FROM     gaps
)
SELECT   user_id, session_n,
         MIN(ts)  AS session_start,
         MAX(ts)  AS session_end,
         COUNT(*) AS n_events
FROM     sessions
GROUP BY user_id, session_n;
--
-- Two windows in two CTEs: LAG to find the gap, a running SUM to
-- number the sessions. The IS NULL clause is the same NaT trap as
-- the pandas version -- the first event has no LAG and must start a
-- session explicitly. Then an ordinary GROUP BY on the session id.

-- GAPS AND ISLANDS -- consecutive runs of a condition:
-- "For each sensor, the start and end of every run of consecutive
-- failed readings."
WITH flagged AS (
    SELECT   sensor_id, ts, status,
             ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY ts) AS rn_all,
             ROW_NUMBER() OVER (PARTITION BY sensor_id, status ORDER BY ts) AS rn_status
    FROM     readings
)
SELECT   sensor_id, status,
         MIN(ts) AS run_start, MAX(ts) AS run_end, COUNT(*) AS run_length
FROM     flagged
WHERE    status = 'fail'
GROUP BY sensor_id, status, rn_all - rn_status
ORDER BY sensor_id, run_start;
--
-- rn_all - rn_status is CONSTANT within a run of the same status and
-- changes when the status changes. Grouping by it groups by run. The
-- classic "islands" trick, and worth knowing because the pandas
-- version is the same idea with cumsum of (status != status.shift()).

-- COMPARING TO THE PARTITION'S FIRST ROW -- growth since the start:
SELECT   customer_id, order_date, amount,
         amount - FIRST_VALUE(amount) OVER (PARTITION BY customer_id
                                            ORDER BY order_date) AS vs_first
FROM     orders;

-- WHERE THE WINDOW RESULT IS NEEDED IN A FILTER -- always a CTE:
WITH with_prev AS (
    SELECT   *, LAG(status) OVER (PARTITION BY order_id ORDER BY ts) AS prev_status
    FROM     order_events
)
SELECT   order_id, ts
FROM     with_prev
WHERE    prev_status = 'shipped' AND status = 'cancelled';
--   "cancelled after shipping" -- a transition. The WHERE on the
--   window's output needs the CTE.
`,
      hl: [15, 32, 60, 87],
      caption: "**`rn_all - rn_status` is constant within a run and changes when the status changes.** Grouping by it groups by run — the gaps-and-islands trick, and the SQL twin of `cumsum(status != status.shift())`."
    },

    { t: "table",
      head: ["pandas", "SQL", "Note"],
      rows: [
        ["`groupby(k)[v].transform(\"sum\")`", "`SUM(v) OVER (PARTITION BY k)`", "Annotate, do not collapse"],
        ["`groupby(k)[v].cumsum()`", "`SUM(v) OVER (PARTITION BY k ORDER BY t ROWS UNBOUNDED PRECEDING)`", "Say `ROWS`; `RANGE` includes peers"],
        ["`groupby(k)[v].shift(1)`", "`LAG(v) OVER (PARTITION BY k ORDER BY t)`", "NULL at each partition's start"],
        ["`groupby(k)[v].rank(method=\"min\")`", "`RANK() OVER (PARTITION BY k ORDER BY v)`", "`\"dense\"` → `DENSE_RANK`, `\"first\"` → `ROW_NUMBER` with a tiebreak"],
        ["`rolling(7).mean()`", "`AVG(v) OVER (ORDER BY t ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`", "Includes the current row"],
        ["`rolling(7).mean().shift(1)`", "`... ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING`", "Causal — excludes the current row"],
        ["`sort_values(t).drop_duplicates(k, keep=\"last\")`", "`ROW_NUMBER() OVER (PARTITION BY k ORDER BY t DESC)` … `WHERE rn = 1`", "Needs a unique `ORDER BY` for determinism"],
        ["`duplicated(subset, keep=False)`", "`COUNT(*) OVER (PARTITION BY subset) > 1`", "Returns the rows, not just the keys"],
        ["`pd.qcut(v, 10)`", "`NTILE(10) OVER (ORDER BY v)`", "Equal-count buckets"],
        ["`groupby(k).cumcount()`", "`ROW_NUMBER() OVER (PARTITION BY k ORDER BY t) - 1`", "Position within the group"]
      ],
      caption: "**Every pandas group-and-broadcast operation has a window equivalent.** The SQL version runs where the data is, uses the index on the partition key, and never moves the table."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Customer features computed in the database",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A model needs, for every order, features describing the customer's history **as of that order**: number of previous orders, days since the previous order, the customer's average order value over their previous five orders, and whether this order is larger than any before it. The training table has 50 million orders and lives in Postgres." },
        { t: "p", text: "Write the query so that no feature uses the current order or anything after it, and so that the result can be verified against a pandas implementation on a sample." }
      ],
      requirements: [
        "Every feature strictly causal: computed from rows before the current order only.",
        "A deterministic ordering within each customer.",
        "Sensible values on a customer's first order.",
        "A label column — did the customer order again within 90 days — that DOES use the future, clearly separated.",
        "The pandas equivalent for verification on a sample.",
        "State how you would check the two agree."
      ],
      hint: "Every window that describes the past must end at `1 PRECEDING`. The label is the one place `LEAD` belongs.",
      solution: {
        lang: "sql",
        title: "order_features.sql",
        code: `-- =========================================================================
-- THE FEATURES -- every window ends BEFORE the current row
-- =========================================================================

WITH ordered AS (
    -- A DETERMINISTIC ORDER within each customer. order_date alone can
    -- tie (two orders on one day); order_id breaks it, and the same
    -- ORDER BY is used in every window so they agree on what "previous"
    -- means.
    SELECT   order_id, customer_id, order_date, amount
    FROM     orders
),
features AS (
    SELECT
        order_id,
        customer_id,
        order_date,
        amount,

        -- HOW MANY ORDERS BEFORE THIS ONE. ROW_NUMBER counts this row,
        -- so subtract one. On a first order: 0.
        ROW_NUMBER() OVER w - 1                                 AS n_prev_orders,

        -- DAYS SINCE THE PREVIOUS ORDER. LAG is NULL on the first
        -- order, and NULL is the honest value: there is no previous.
        order_date - LAG(order_date) OVER w                     AS days_since_prev,

        -- AVERAGE OF THE PREVIOUS FIVE. The frame ends at 1 PRECEDING,
        -- so the current order is excluded. Fewer than five previous
        -- orders averages what exists; none gives NULL.
        AVG(amount) OVER (w ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING) AS avg_prev5,

        -- LARGEST PREVIOUS ORDER, for the "is this a record" flag.
        MAX(amount) OVER (w ROWS BETWEEN UNBOUNDED PRECEDING
                                    AND 1 PRECEDING)           AS max_prev,

        -- CUMULATIVE SPEND BEFORE THIS ORDER.
        COALESCE(SUM(amount) OVER (w ROWS BETWEEN UNBOUNDED PRECEDING
                                              AND 1 PRECEDING), 0) AS spend_prev,

        -- THE LABEL -- and ONLY the label -- looks forward.
        LEAD(order_date) OVER w                                 AS next_order_date

    FROM     ordered
    WINDOW   w AS (PARTITION BY customer_id ORDER BY order_date, order_id)
)
SELECT
    order_id,
    customer_id,
    order_date,
    amount,
    n_prev_orders,
    days_since_prev,
    avg_prev5,
    -- "IS THIS THE LARGEST SO FAR": NULL max_prev means first order,
    -- which is trivially a record. Say so with COALESCE rather than
    -- letting amount > NULL be unknown.
    amount > COALESCE(max_prev, -1)                             AS is_record,
    spend_prev,
    -- THE LABEL: reordered within 90 days. NULL next_order_date means
    -- no later order in the data -- which is "no" only if the data
    -- extends 90 days past this order. See the censoring note.
    CASE WHEN next_order_date IS NULL THEN 0
         WHEN next_order_date - order_date <= 90 THEN 1
         ELSE 0 END                                             AS reordered_90d,
    next_order_date IS NULL                                     AS label_censored
FROM features
ORDER BY customer_id, order_date, order_id;


-- =========================================================================
-- WHY EACH FRAME
-- =========================================================================
--
-- Every feature window is one of:
--   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING   everything before
--   ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING           the last five before
--   LAG(...)                                           the one before
--
-- None includes CURRENT ROW. That is the causality guarantee, and it
-- is checkable by reading the frames: if any feature's frame ends at
-- CURRENT ROW or later, it leaks.
--
-- ROW_NUMBER() - 1 is the exception in form only: it counts positions,
-- and position minus one is the count of rows before.
--
-- The default frame (no ROWS clause, with ORDER BY) is RANGE ... AND
-- CURRENT ROW -- which INCLUDES the current row and its peers. It is
-- never used here for a feature. Writing ROWS explicitly everywhere
-- is the discipline.
--
-- CENSORING: an order 30 days before the end of the data has no
-- LEAD not because the customer did not reorder but because the data
-- stopped. label_censored marks those; the training set should
-- exclude orders within 90 days of the data's end, or treat them
-- separately. This is a modelling decision, and the column makes it
-- possible to make.


-- =========================================================================
-- THE pandas EQUIVALENT, for verification on a sample
-- =========================================================================
--
-- import pandas as pd
--
-- def order_features(orders):
--     df = orders.sort_values(["customer_id", "order_date", "order_id"]).copy()
--     g = df.groupby("customer_id")
--
--     df["n_prev_orders"]   = g.cumcount()
--     df["days_since_prev"] = (df["order_date"]
--                              - g["order_date"].shift(1)).dt.days
--     df["avg_prev5"]       = g["amount"].transform(
--                                lambda s: s.rolling(5, min_periods=1).mean().shift(1))
--     max_prev              = g["amount"].transform(
--                                lambda s: s.expanding().max().shift(1))
--     df["is_record"]       = df["amount"] > max_prev.fillna(-1)
--     df["spend_prev"]      = g["amount"].cumsum() - df["amount"]
--     nxt                   = g["order_date"].shift(-1)
--     df["reordered_90d"]   = ((nxt - df["order_date"]).dt.days <= 90).astype(int)
--     df["label_censored"]  = nxt.isna()
--     return df
--
-- Every .shift(1) corresponds to a "1 PRECEDING"; the .shift(-1) is
-- the LEAD. cumsum() - amount is the "before this row" running sum.
--
-- THE CHECK:
--   1. Pull 10,000 customers' orders from the database.
--   2. Run the SQL on the database; run the pandas on the extract.
--   3. Join on order_id; assert every feature column is equal (with
--      np.isclose for avg_prev5, and NaN == NULL treated as equal).
--   4. Assert the row counts match, and that n_prev_orders == 0
--      exactly once per customer.
--
-- If they disagree, the ordering is the first suspect: a tie in
-- order_date with a different tiebreak on each side puts different
-- rows "before" each other.


-- =========================================================================
-- THE CAUSALITY TEST, in SQL
-- =========================================================================
--
-- Corrupt every order after a cutoff; features before the cutoff
-- must not change.
--
-- WITH corrupted AS (
--     SELECT order_id, customer_id, order_date,
--            CASE WHEN order_date >= '2026-06-01' THEN amount * 1000
--                 ELSE amount END AS amount
--     FROM   orders
-- )
-- ... run the feature query on corrupted, join to the original's
-- features on order_id, and assert equality for every order_date <
-- '2026-06-01'. Any feature that differs read the future.`,
        notes: [
          { t: "p", text: "**Every feature frame ends at `1 PRECEDING`, and the discipline is to write `ROWS` explicitly everywhere.** The default frame with `ORDER BY` is `RANGE ... AND CURRENT ROW`, which includes the current row and its peers — never what a feature wants, and easy to inherit by omission." },
          { t: "callout", kind: "insight", title: "Causality is checkable by reading the frames", body: [
            { t: "p", text: "If any feature's window ends at `CURRENT ROW` or later, it leaks. **That is a property you can verify from the query text alone**, before running anything — and the SQL corruption test confirms it mechanically." },
            { t: "p", text: "`LEAD` appears exactly once, in the label, and the label is separated from the features in both the query and the pandas version." }
          ]},
          { t: "p", text: "**The same `ORDER BY` — date then id — in every window** is what makes the features agree on what \"previous\" means. A tie on `order_date` with different tiebreaks would put two orders before each other in different features." },
          { t: "p", text: "**`label_censored` is the column that makes a modelling decision possible.** An order thirty days before the data ends has no `LEAD` because the data stopped, not because the customer stopped — and treating that as \"did not reorder\" biases the label toward zero at the end of the period." },
          { t: "p", text: "**The pandas version is line-for-line the same computation.** Every `.shift(1)` is a `1 PRECEDING`, `cumsum() - amount` is the running sum before this row, and `.shift(-1)` is the one `LEAD`. That correspondence is what makes verification on a sample meaningful." },
          { t: "p", text: "**`amount > COALESCE(max_prev, -1)` rather than `amount > max_prev`.** On a first order `max_prev` is NULL, `amount > NULL` is unknown, and the flag would be NULL rather than true — the three-valued logic from 5.5 reaching into a feature." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`LAST_VALUE(amount) OVER (PARTITION BY c ORDER BY d)` returns the current row's amount, not the partition's last. Why?",
          options: [
            "LAST_VALUE is not supported with PARTITION BY",
            "The default frame ends at CURRENT ROW, so the last value of the frame is the current row — an explicit frame to UNBOUNDED FOLLOWING is needed",
            "ORDER BY must be DESC",
            "It needs a tiebreak"
          ],
          answer: 1,
          why: "With `ORDER BY` and no frame clause, the window runs from the partition's start to the current row. `LAST_VALUE` of that is the current row. `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` makes the frame the whole partition — a surprise everyone meets once."
        }
      ]
    }
  ],

  takeaways: [
    "**`OVER` computes an aggregate and returns it on every row** — `GROUP BY` that keeps the detail, and pandas `transform` in SQL.",
    "**`PARTITION BY` is the groupby key; `ORDER BY` inside the window makes the aggregate cumulative.**",
    "**The default frame with `ORDER BY` is `RANGE ... AND CURRENT ROW`** — it includes the current row and its peers; say `ROWS` explicitly.",
    "**`ROWS BETWEEN n PRECEDING AND 1 PRECEDING` excludes the current row** — the causal frame for a feature.",
    "**`ROW_NUMBER` breaks ties arbitrarily; `RANK` skips after ties; `DENSE_RANK` does not skip** — the pandas `first`, `min` and `dense` methods.",
    "**`ROW_NUMBER` for deduplication needs an `ORDER BY` unique within the partition**, or \"latest\" changes between runs.",
    "**Latest row per key**: `ROW_NUMBER() OVER (PARTITION BY k ORDER BY t DESC)` in a CTE, then `WHERE rn = 1`.",
    "**A window result cannot be filtered in the same query's `WHERE`** — it does not exist yet; wrap it in a CTE.",
    "**`LAG` is the past and `LEAD` is the future** — a feature and a label, or a feature and a leak.",
    "**`LAST_VALUE` needs an explicit frame to `UNBOUNDED FOLLOWING`** or it returns the current row.",
    "**Sessionising is `LAG` for the gap and a running `SUM` of the flag** — the same cumsum trick as pandas, with the same first-row trap.",
    "**Gaps and islands**: `ROW_NUMBER` over all rows minus `ROW_NUMBER` over the status is constant within a run.",
    "**Every pandas group-and-broadcast has a window equivalent** that runs where the data is and never moves the table."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between `SUM(x) ... GROUP BY k` and `SUM(x) OVER (PARTITION BY k)`?",
        options: [
          "They are identical",
          "GROUP BY returns one row per group; OVER returns every original row with its group's sum attached",
          "OVER is faster",
          "GROUP BY allows ORDER BY"
        ],
        answer: 1,
        why: "Same computation, different output shape. The window form is what lets you compute `x / SUM(x) OVER (PARTITION BY k)` — a share of group total — without a join. It is pandas `transform` against `agg`."
      },
      {
        stem: "Two history rows share `updated_at` and `ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC)` is used to pick the latest. What is the risk?",
        options: [
          "It raises",
          "The tie is broken arbitrarily, so the 'latest' row can differ between runs of the same query on the same data",
          "Both rows get rn = 1",
          "It picks the older one"
        ],
        answer: 1,
        why: "ROW_NUMBER always assigns unique numbers, and with a non-unique ORDER BY the engine chooses. Add a version, id or load timestamp as the final key. RANK would give both rows 1 and make the tie visible instead."
      },
      {
        stem: "A feature uses `AVG(amount) OVER (PARTITION BY c ORDER BY d)` with no frame clause. What does it compute?",
        options: [
          "The average of previous orders",
          "The running average including the current row and any peers with the same date — a leak if the target depends on the current row",
          "The average of the next orders",
          "The partition average"
        ],
        answer: 1,
        why: "The default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. It includes this row. `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING` is the causal version — and the discipline is to write the frame explicitly on every feature."
      },
      {
        stem: "How do you filter on a window function's result?",
        options: [
          "In WHERE, directly",
          "In a CTE or subquery — the window is computed after WHERE, so the outer query's WHERE sees it as an ordinary column",
          "In HAVING",
          "You cannot"
        ],
        answer: 1,
        why: "Window functions run after WHERE, GROUP BY and HAVING, so a WHERE in the same SELECT cannot reference them. Wrapping the query makes the window result a real column of the inner result, which the outer WHERE can filter — the shape of every `WHERE rn = 1` query."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a window function do that GROUP BY does not?",
        strong: "It keeps the rows. `GROUP BY` collapses each group to one row; `OVER (PARTITION BY ...)` computes the same aggregate and attaches it to every original row. That is what makes share-of-group, running totals, rankings within a group and previous-row comparisons possible without a self-join. It is pandas `transform` where `GROUP BY` is `agg`.",
        answer: [
          { t: "p", text: "The pandas mapping is worth stating explicitly — it shows you see the two as the same operation in two syntaxes." }
        ]
      },
      {
        level: "advanced",
        q: "How do you get the most recent row per customer from a history table?",
        strong: "`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC, version DESC)` in a CTE, then `WHERE rn = 1`. The CTE is required because WHERE cannot see the window in the same query. The tiebreak is required because two rows with the same timestamp would otherwise be ordered arbitrarily, and 'latest' would change between runs. And it runs on the database with an index on the partition and order keys, without moving the history table into pandas.",
        answer: [
          { t: "p", text: "The determinism point — the tiebreak — separates people who have been bitten from people who have read the docs." }
        ]
      },
      {
        level: "advanced",
        q: "How would you guarantee a window-computed feature is causal?",
        strong: "By the frame. Every feature window ends at `1 PRECEDING` — `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING` for history, `n PRECEDING AND 1 PRECEDING` for a recent window, `LAG` for the previous row — and never at `CURRENT ROW`, which the default frame does. That is verifiable by reading the query. Then a mechanical check: corrupt every row after a cutoff and assert the features before it are unchanged. `LEAD` appears in exactly one place, the label.",
        answer: [
          { t: "p", text: "\"Verifiable by reading the query\" plus a mechanical test is the complete answer — one is review, the other is proof." }
        ]
      }
    ]
  }
});

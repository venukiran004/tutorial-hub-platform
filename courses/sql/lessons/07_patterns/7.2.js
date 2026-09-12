/* ============================================================================
   LESSON 7.2 — Point-in-Time Features in SQL
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**A model trained on features that include the future performs brilliantly in the notebook and fails in production, and the leak is almost always a join.** Joining today's customer tier onto last year's orders, counting events that happened at the moment of the outcome, summing spend through the label date: each is one missing `<` in a join condition. This lesson builds a feature table the right way — every feature computed from data strictly before the moment it describes — using the as-of join, LATERAL, and window frames, then extends it to the daily snapshots a backfill needs.",

  objectives: [
    "Recognise temporal leakage in a feature join and state the rule that prevents it: features from strictly before the as-of time",
    "Write an as-of join three ways — LATERAL with LIMIT 1, a ranked window, and DuckDB's ASOF JOIN — and pick by engine",
    "Build an event-level feature table with counts, sums, rolling windows and recency, plus a label from strictly after",
    "Backfill a snapshot feature table on a date grid, so training rows and serving rows are computed by the same SQL"
  ],

  prerequisites: ["3.3", "6.5"],

  blocks: [

    { t: "h2", n: "01", text: "The leak, made visible", id: "leak" },

    { t: "p", text: "Asha was `standard` until 1 February and `plus` afterwards; Dalia upgraded on 20 February. The customers table holds only the current value. **Join it onto orders and every January order is labelled `plus`** — a feature that did not exist when the order was placed, and one that, for a model predicting refunds or churn, quietly encodes 'this customer stayed long enough to upgrade'." },

    { t: "code", lang: "sql", title: "Today's value on yesterday's rows, and the same join done as-of (executed on DuckDB)",
      hl: [2, 8, 9, 10, 11],
      code: `-- leaky: the current tier on every order
SELECT o.order_id, o.customer_id, o.placed_at::DATE AS d, c.tier AS tier_today
FROM   orders o JOIN customers c USING (customer_id) WHERE o.customer_id IN (1, 4) ORDER BY o.order_id;
-- 100 | 1 | 2025-01-05 | plus      102 | 1 | 2025-01-20 | plus      106 | 4 | 2025-02-25 | plus      108 | 1 | 2025-03-15 | plus

-- as-of: the tier in force when the order was placed, from a history table (customer_id, tier, valid_from)
SELECT o.order_id, o.customer_id, o.placed_at::DATE AS d, t.tier AS tier_at_order
FROM   orders o
LEFT JOIN LATERAL (SELECT tier FROM tier_history h
                   WHERE h.customer_id = o.customer_id AND h.valid_from <= o.placed_at::DATE
                   ORDER BY h.valid_from DESC LIMIT 1) t ON TRUE
WHERE  o.customer_id IN (1, 4) ORDER BY o.order_id;`,
      caption: "The as-of join answers 'what was the latest value at or before this moment' — the same shape as 3.3's LATERAL for the latest order per customer, with a time bound added. It requires a history table; if the source only stores current values, the history must be captured (an SCD in 6.5, an audit trigger in 6.6) before any point-in-time feature is possible."
    },

    { t: "table",
      head: ["order_id", "customer_id", "d", "tier_at_order"],
      rows: [
        ["100", "1", "2025-01-05", "standard"],
        ["102", "1", "2025-01-20", "standard"],
        ["106", "4", "2025-02-25", "plus"],
        ["108", "1", "2025-03-15", "plus"]
      ]
    },

    { t: "dl", items: [
      ["Temporal leakage", "A feature computed with information from at or after the moment the row describes. Inflates offline metrics; unavailable at serving time."],
      ["As-of time", "The instant a feature row describes: the order's `placed_at`, the snapshot date. Every feature uses data strictly before it; every label uses data at or after it."],
      ["As-of join", "For each left row, the single right row with the greatest timestamp not exceeding the left row's as-of time. LATERAL … LIMIT 1, a ranked window, or a native ASOF JOIN."],
      ["Feature table", "One row per entity per as-of time, with feature columns and, for training, a label. Keyed on `(entity_id, as_of)`."],
      ["Snapshot grid", "The set of `(entity, as_of)` pairs a backfill computes: every customer on every Monday, say. Built with a CROSS JOIN of entities and a date series."],
      ["Train–serve skew", "Features computed one way for training and another for serving. Prevented by one SQL definition run for both, differing only in the as-of time."]
    ]},

    { t: "h2", n: "02", text: "The as-of join, three ways", id: "asof" },

    { t: "code", lang: "sql", title: "LATERAL, ranked window, native ASOF — same result (executed)",
      hl: [2, 3, 4, 8, 9, 10, 15, 16],
      code: `-- 1. LATERAL with LIMIT 1: PostgreSQL, DuckDB; clearest, and uses an index on (customer_id, valid_from) per row
LEFT JOIN LATERAL (SELECT tier FROM tier_history h
                   WHERE h.customer_id = o.customer_id AND h.valid_from <= o.placed_at::DATE
                   ORDER BY h.valid_from DESC LIMIT 1) t ON TRUE

-- 2. ranked window: every engine; one join then a filter, better for a large batch than a per-row subquery
WITH ranked AS (
  SELECT o.order_id, o.placed_at::DATE AS d, h.tier,
         ROW_NUMBER() OVER (PARTITION BY o.order_id ORDER BY h.valid_from DESC) AS rn
  FROM   orders o JOIN tier_history h ON h.customer_id = o.customer_id AND h.valid_from <= o.placed_at::DATE
)
SELECT order_id, d, tier FROM ranked WHERE rn = 1;

-- 3. native: DuckDB (also Snowflake, ClickHouse, kdb): the engine does the "latest not exceeding" match
SELECT o.order_id, o.customer_id, o.placed_at::DATE AS d, h.tier AS tier_at_order
FROM   orders o ASOF LEFT JOIN tier_history h ON h.customer_id = o.customer_id AND h.valid_from <= o.placed_at::DATE
WHERE  o.customer_id IN (1, 4) ORDER BY o.order_id;
-- all three: 100 standard, 102 standard, 106 plus, 108 plus`,
      caption: "Use LEFT for all three so an entity with no history row yet still appears, with NULL — a customer whose first order precedes their first tier record is a real case and a feature the model may need (`has_history`). The ranked form's join fans out to every earlier history row before filtering; for very long histories the LATERAL or ASOF form is much cheaper."
    },

    { t: "h2", n: "03", text: "A feature table at order grain", id: "features" },

    { t: "p", text: "One row per order, features from the customer's history strictly before `placed_at`, and a label from the order itself. **Every join condition carries `b.placed_at < a.placed_at` or `e.occurred_at < a.placed_at`** — strictly less than, because the events at the exact moment of the order (the checkout event has the same timestamp) are part of the outcome, not the history." },

    { t: "code", lang: "sql", title: "Order-level features and label (executed)",
      hl: [6, 7, 8, 9, 10, 11, 15, 16, 19, 20, 21],
      code: `WITH ord AS (
  SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount, o.status
  FROM   orders o JOIN order_items oi USING (order_id) GROUP BY ALL
),
hist AS (                                                   -- prior orders: strictly before, cancelled excluded
  SELECT a.order_id,
         COUNT(b.order_id)                                                                       AS prior_orders,
         COALESCE(SUM(b.amount), 0)                                                              AS prior_spend,
         COALESCE(SUM(CASE WHEN b.placed_at >= a.placed_at - INTERVAL 30 DAY THEN b.amount END), 0) AS spend_30d,
         DATE_DIFF('day', MAX(b.placed_at), a.placed_at)                                         AS days_since_last
  FROM   ord a LEFT JOIN ord b ON b.customer_id = a.customer_id AND b.placed_at < a.placed_at AND b.status <> 'cancelled'
  GROUP BY a.order_id, a.placed_at
),
ev AS (                                                     -- events in the 7 days before, strictly before
  SELECT a.order_id, COUNT(e.event_id) AS events_7d
  FROM   ord a LEFT JOIN events e ON e.customer_id = a.customer_id AND e.occurred_at < a.placed_at AND e.occurred_at >= a.placed_at - INTERVAL 7 DAY
  GROUP BY a.order_id
)
SELECT a.order_id, a.customer_id, a.placed_at::DATE AS d, a.amount, h.prior_orders, h.prior_spend, h.spend_30d, h.days_since_last, ev.events_7d,
       (a.status = 'refunded')::INTEGER AS label_refunded          -- the label: known only after the as-of time
FROM   ord a JOIN hist h USING (order_id) JOIN ev USING (order_id)
WHERE  a.status <> 'cancelled' ORDER BY a.order_id;`,
      caption: "Each feature family is its own CTE joined back on `order_id`, so a fan-out in one (many prior orders) cannot multiply the counts of another (events) — the 2.6 rule. `days_since_last` is NULL for a first order, which is a feature in itself: leave it NULL and let the model or the imputer handle it, rather than inventing 9999."
    },

    { t: "table",
      head: ["order_id", "customer_id", "d", "amount", "prior_orders", "prior_spend", "spend_30d", "days_since_last", "events_7d", "label_refunded"],
      rows: [
        ["100", "1", "2025-01-05", "42.00", "0", "0.00", "0.00", "NULL", "0", "0"],
        ["101", "2", "2025-01-06", "85.00", "0", "0.00", "0.00", "NULL", "0", "0"],
        ["102", "1", "2025-01-20", "76.00", "1", "42.00", "42.00", "15", "0", "0"],
        ["103", "3", "2025-02-02", "45.00", "0", "0.00", "0.00", "NULL", "0", "1"],
        ["104", "5", "2025-02-10", "85.40", "0", "0.00", "0.00", "NULL", "0", "0"],
        ["105", "2", "2025-02-11", "27.50", "1", "85.00", "0.00", "36", "0", "0"],
        ["106", "4", "2025-02-25", "139.00", "0", "0.00", "0.00", "NULL", "0", "0"],
        ["108", "1", "2025-03-15", "116.50", "2", "118.00", "0.00", "54", "3", "0"],
        ["109", "6", "2025-03-18", "42.00", "0", "0.00", "0.00", "NULL", "0", "0"],
        ["110", "3", "2025-03-27", "32.00", "1", "45.00", "0.00", "53", "2", "0"],
        ["111", "5", "2025-04-04", "52.50", "1", "85.40", "0.00", "53", "2", "0"]
      ]
    },

    { t: "code", lang: "sql", title: "What the strict inequality excludes (executed)",
      hl: [1, 2],
      code: `SELECT o.order_id, o.placed_at, COUNT(e.event_id) FILTER (WHERE e.occurred_at <  o.placed_at) AS before_ok,
                                COUNT(e.event_id) FILTER (WHERE e.occurred_at >= o.placed_at) AS leaked
FROM   orders o LEFT JOIN events e ON e.customer_id = o.customer_id AND e.occurred_at::DATE = o.placed_at::DATE
WHERE  o.order_id IN (108, 110) GROUP BY ALL;
-- 108 | 2025-03-15 13:45:00 | 3 | 2       <- the checkout event at 13:45:00 and a view at 19:30 are at or after the order
-- 110 | 2025-03-27 17:25:00 | 2 | 1       <- the checkout event at 17:25:00 is the order`,
      caption: "A `<=` here would count the checkout event that *is* the order — a feature that equals the label. Same-day joins on dates rather than timestamps have the same problem: `e.occurred_at::DATE < o.placed_at::DATE` throws away the morning's events, and `<=` includes the afternoon's. Compare timestamps, strictly."
    },

    { t: "code", lang: "sql", title: "The same features with window frames instead of a self-join (executed)",
      hl: [6, 7, 8, 10, 11],
      code: `WITH ord AS (
  SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi USING (order_id) WHERE o.status <> 'cancelled' GROUP BY ALL
)
SELECT order_id, customer_id, placed_at::DATE AS d, amount,
       COUNT(*) OVER w_all - 1                          AS prior_orders,       -- the frame includes the current row: subtract it
       COALESCE(SUM(amount) OVER w_all, 0) - amount     AS prior_spend,
       COALESCE(SUM(amount) OVER w30, 0) - amount       AS spend_30d
FROM   ord
WINDOW w_all AS (PARTITION BY customer_id ORDER BY placed_at ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
       w30   AS (PARTITION BY customer_id ORDER BY placed_at RANGE BETWEEN INTERVAL 30 DAY PRECEDING AND CURRENT ROW)
ORDER BY order_id;
-- identical to the hist CTE: 102 -> 1 | 42.00 | 42.00,   108 -> 2 | 118.00 | 0.00,   105 -> 1 | 85.00 | 0.00`,
      caption: "One pass instead of a self-join — the 3.3 argument — and the RANGE INTERVAL frame does the 30-day window natively. PostgreSQL supports RANGE with intervals; MySQL and SQLite do not, so the self-join or a LATERAL is the portable form there. Ties at the same timestamp would put both rows in the frame; `ROWS … 1 PRECEDING` or `EXCLUDE CURRENT ROW` handles that where it matters."
    },

    { t: "h2", n: "04", text: "Snapshots: the backfill grid", id: "backfill" },

    { t: "p", text: "Order-grain features exist only when an order happens. A churn model, a next-30-day-spend model, or anything scored on a schedule needs **features for every customer on every scoring date**, whether or not they did anything. That is a grid — customers × dates — with the same strictly-before aggregates computed against each grid date, and the label looked up in the window after it." },

    { t: "code", lang: "sql", title: "Features on a fortnightly grid, and the forward-looking label (executed)",
      hl: [5, 6, 7, 12, 13, 18, 19],
      code: `WITH ord AS (
  SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
  FROM   orders o JOIN order_items oi USING (order_id) WHERE o.status <> 'cancelled' GROUP BY ALL
),
snap AS (SELECT d::DATE AS as_of FROM generate_series(DATE '2025-01-15', DATE '2025-03-26', INTERVAL 14 DAY) t(d)),
grid AS (SELECT c.customer_id, s.as_of FROM customers c CROSS JOIN snap s WHERE c.customer_id IN (1, 3))
SELECT g.customer_id, g.as_of,
       COUNT(o.order_id)                                                         AS orders_to_date,
       COALESCE(SUM(o.amount), 0)                                                AS spend_to_date,
       COALESCE(SUM(o.amount) FILTER (WHERE o.placed_at >= g.as_of - INTERVAL 30 DAY), 0) AS spend_30d,
       DATE_DIFF('day', MAX(o.placed_at)::DATE, g.as_of)                         AS days_since_last
FROM   grid g LEFT JOIN ord o ON o.customer_id = g.customer_id AND o.placed_at < g.as_of      -- strictly before the snapshot
GROUP BY g.customer_id, g.as_of ORDER BY g.customer_id, g.as_of;

-- the label for the same grid: an order in the 30 days at or after as_of
SELECT g.customer_id, g.as_of,
       EXISTS (SELECT 1 FROM ord o WHERE o.customer_id = g.customer_id
               AND o.placed_at >= g.as_of AND o.placed_at < g.as_of + INTERVAL 30 DAY)::INTEGER AS label_orders_next_30d
FROM   grid g ORDER BY 1, 2;`,
      caption: "Features look back from `as_of` exclusively; the label looks forward from `as_of` inclusively. A customer with no orders yet gets a row with zeros and a NULL recency, which is exactly what the serving path will see for a new customer. The grid is the training set's skeleton; the last date of the grid, run today, is the serving set."
    },

    { t: "table",
      head: ["customer_id", "as_of", "orders_to_date", "spend_to_date", "spend_30d", "days_since_last", "label_next_30d"],
      rows: [
        ["1", "2025-01-15", "1", "42.00", "42.00", "10", "1"],
        ["1", "2025-01-29", "2", "118.00", "118.00", "9", "0"],
        ["1", "2025-02-12", "2", "118.00", "76.00", "23", "0"],
        ["1", "2025-02-26", "2", "118.00", "0.00", "37", "1"],
        ["1", "2025-03-12", "2", "118.00", "0.00", "51", "1"],
        ["1", "2025-03-26", "3", "234.50", "116.50", "11", "0"],
        ["3", "2025-01-15", "0", "0.00", "0.00", "NULL", "1"],
        ["3", "2025-01-29", "0", "0.00", "0.00", "NULL", "1"],
        ["3", "2025-02-12", "1", "45.00", "45.00", "10", "0"],
        ["3", "2025-02-26", "1", "45.00", "45.00", "24", "1"],
        ["3", "2025-03-12", "1", "45.00", "0.00", "38", "1"],
        ["3", "2025-03-26", "1", "45.00", "0.00", "52", "1"]
      ]
    },

    { t: "viz",
      title: "Look back exclusively, look forward inclusively",
      caption: "For one grid row: the feature window ends just before as_of; the label window starts at as_of. Nothing at or after as_of reaches a feature, and nothing before as_of reaches the label. Snapshots repeat the same cut at each grid date.",
      svg: `<svg viewBox="0 0 880 200" role="img" aria-label="A timeline with an as_of marker. To the left, a shaded feature window labelled strictly before; to the right, a shaded label window labelled at or after, thirty days long. Order events are dots along the line.">
  <defs>
    <marker id="ac-ah-72" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <line x1="40" y1="110" x2="850" y2="110" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ac-ah-72)"/>
  <rect x="120" y="70" width="360" height="80" rx="6" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="484" y="70" width="240" height="80" rx="6" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)" stroke-width="1.2"/>
  <line x1="482" y1="50" x2="482" y2="165" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="482" y="40" class="s-label" text-anchor="middle" style="font-weight:600;fill:var(--crit)">as_of</text>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="300" y="60" style="fill:var(--accent)">features · placed_at &lt; as_of</text>
    <text x="604" y="60" style="fill:var(--warn)">label · as_of ≤ placed_at &lt; as_of + 30d</text>
  </g>
  <g style="fill:var(--ink-2)">
    <circle cx="170" cy="110" r="5"/><circle cx="260" cy="110" r="5"/><circle cx="420" cy="110" r="5"/>
    <circle cx="560" cy="110" r="5"/><circle cx="790" cy="110" r="5"/>
  </g>
  <circle cx="482" cy="110" r="5" style="fill:var(--warn)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="300" y="185">orders_to_date = 3 · spend_30d from the last of them · days_since_last = as_of − ●</text>
    <text x="604" y="185">label = 1 (an order inside the window)</text>
    <text x="482" y="135" style="fill:var(--warn)">an event exactly at as_of is the label's, not the feature's</text>
  </g>
</svg>`
    },

    { t: "callout", kind: "production", title: "One definition, two as-of times", body: [
      { t: "p", text: "The grid query with `as_of = today` and every customer is the serving feature set; the same query with a historical grid is the training set. **Keep it as one SQL definition — a view or a parameterised query with `:as_of`** — so the features a model was trained on and the features it is scored on are computed by identical code. Train–serve skew is almost always a second implementation of the same feature, and the cure is not having one. Materialise the historical grid into a feature table keyed on `(customer_id, as_of)` with an upsert (6.3), and append each new scoring date to it." }
    ]},

    { t: "ladder",
      title: "A 'recent activity' feature for a churn model",
      rungs: [
        { level: "bad", label: "Count events in the customer's last 30 days", code: `SELECT customer_id, COUNT(*) FROM events WHERE occurred_at >= now() - INTERVAL '30 days' GROUP BY 1`,
          note: "**Anchored to now, not to the training row's date.** Every training row, whatever its as_of, gets the customer's activity as of the day the query ran — the future for all of them." },
        { level: "ok", label: "Anchored to the row's as_of, inclusive", code: `LEFT JOIN events e ON e.customer_id = g.customer_id
  AND e.occurred_at BETWEEN g.as_of - INTERVAL '30 days' AND g.as_of`,
          note: "**Anchored correctly, but BETWEEN is inclusive at both ends.** Events at exactly as_of — the checkout that is the outcome — leak in." },
        { level: "best", label: "Anchored, strictly before, same SQL for serving", code: `LEFT JOIN events e ON e.customer_id = g.customer_id
  AND e.occurred_at >= g.as_of - INTERVAL '30 days' AND e.occurred_at < g.as_of
-- grid rows for training; g.as_of = current_date for serving`,
          note: "**Half-open window ending at as_of, one definition.** The serving run is the same query with today's date." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Product-level features with a price as-of",
      difficulty: "stretch",
      minutes: 30,
      body: [
        { t: "p", text: "Build an order-line feature table: one row per `(order_id, product_id)` with, all as of the order's `placed_at` and strictly before it: the product's list price at that time from a `price_history (product_id, unit_price, valid_from)` table (an as-of join); the discount the line received relative to that list price; how many times this customer had bought this product before; the product's total units sold to all customers in the prior 30 days; and a label `label_returned` you may assume comes from a `returns (order_id, product_id, returned_at)` table. State the leakage risk in each feature." }
      ],
      requirements: [
        "The as-of price via LATERAL or a ranked window, LEFT joined.",
        "Every history condition strictly before `placed_at`.",
        "Separate CTEs per feature family, joined back on the line key.",
        "A comment per feature naming what would leak if the inequality were wrong."
      ],
      hint: "The line key is (order_id, product_id). The product-wide 30-day units feature must exclude the current line and any other line at the same instant — strictly before covers both.",
      solution: {
        lang: "sql",
        title: "line_features.sql",
        code: `WITH line AS (
  SELECT oi.order_id, oi.product_id, o.customer_id, o.placed_at, oi.qty, oi.unit_price AS paid_price
  FROM   order_items oi JOIN orders o USING (order_id) WHERE o.status <> 'cancelled'
),
price AS (                                                   -- list price in force at the order: as-of join
  SELECT l.order_id, l.product_id, p.unit_price AS list_price
  FROM   line l
  LEFT JOIN LATERAL (SELECT unit_price FROM price_history h
                     WHERE h.product_id = l.product_id AND h.valid_from <= l.placed_at
                     ORDER BY h.valid_from DESC LIMIT 1) p ON TRUE
  -- leak if > instead of <=: a price set after the order. (<= is right here: a price valid from the order's instant applies to it)
),
cust_prod AS (                                               -- this customer's prior purchases of this product
  SELECT l.order_id, l.product_id, COUNT(b.order_id) AS prior_buys_of_product
  FROM   line l LEFT JOIN line b ON b.customer_id = l.customer_id AND b.product_id = l.product_id AND b.placed_at < l.placed_at
  GROUP BY l.order_id, l.product_id
  -- leak if <=: the line itself counts as a prior purchase, so every row has at least 1
),
prod30 AS (                                                  -- product-wide units in the prior 30 days, all customers
  SELECT l.order_id, l.product_id, COALESCE(SUM(b.qty), 0) AS product_units_30d
  FROM   line l LEFT JOIN line b ON b.product_id = l.product_id
                                AND b.placed_at >= l.placed_at - INTERVAL 30 DAY AND b.placed_at < l.placed_at
  GROUP BY l.order_id, l.product_id
  -- leak if <=: the line's own qty and any simultaneous line join in -- a popular product looks popular because of this order
),
lab AS (
  SELECT order_id, product_id, 1 AS label_returned FROM returns   -- returned_at is after placed_at by construction; never a feature
)
SELECT l.order_id, l.product_id, l.customer_id, l.placed_at, l.qty, l.paid_price,
       p.list_price,
       CASE WHEN p.list_price > 0 THEN ROUND(1 - l.paid_price / p.list_price, 3) END AS discount_frac,
       cp.prior_buys_of_product, p30.product_units_30d,
       COALESCE(lab.label_returned, 0) AS label_returned
FROM   line l
JOIN   price p    USING (order_id, product_id)
JOIN   cust_prod cp USING (order_id, product_id)
JOIN   prod30 p30 USING (order_id, product_id)
LEFT JOIN lab     USING (order_id, product_id)
ORDER BY l.order_id, l.product_id;`,
        notes: [
          { t: "p", text: "**The as-of price is the one feature where `<=` is correct**: a price that became valid at the order's instant is the price the order saw. Every history aggregate uses `<` because the row's own event must not be part of its own history." },
          { t: "p", text: "**`product_units_30d` is the subtle one**: it aggregates across all customers, so `<=` would include not just this line but every other line placed at the same timestamp — a batch import with identical timestamps would make every product look popular on import day." },
          { t: "p", text: "**The label's table has a `returned_at` that is never joined as a feature.** The obvious leak — 'days until return' — is a column that exists and must simply not be selected. Feature tables need a list of columns that are labels or label-adjacent, kept out of the feature set by name." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A feature counts a customer's events with `e.occurred_at <= o.placed_at`. What is wrong?",
          options: [
            "Nothing; the order's own events are history",
            "Events at exactly placed_at — the checkout that is the order — are included, so the feature contains the outcome; use strictly less than",
            "It should use dates, not timestamps",
            "It needs a LATERAL"
          ],
          answer: 1,
          why: "The executed check showed 2 events at or after order 108's timestamp, one of them the checkout event itself. Half-open windows, strictly before the as-of time."
        }
      ]
    }
  ],

  takeaways: [
    "**Temporal leakage is a join condition without a `<`**: features from strictly before the as-of time, labels from at or after.",
    "**Current-value tables cannot give point-in-time features**; capture history first (SCD, audit trigger).",
    "**The as-of join** — LATERAL LIMIT 1, ranked window, or native ASOF — finds the latest value not exceeding the as-of time; LEFT join it.",
    "**Compare timestamps, strictly**; date-level comparisons either drop the morning or leak the afternoon.",
    "**One CTE per feature family, joined back on the entity key**, so fan-outs cannot multiply each other.",
    "**Window frames compute the same features in one pass**; RANGE INTERVAL for time windows where the engine supports it.",
    "**Snapshot features live on a grid** of entities × dates, features looking back exclusively and labels looking forward inclusively.",
    "**A customer with no history gets a row of zeros and NULL recency** — the same row serving will produce.",
    "**One SQL definition with an as-of parameter** for training and serving; a second implementation is where skew comes from.",
    "**Label-adjacent columns are excluded by name**; the feature table needs a deny-list as well as a query."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is joining the customers table's current tier onto historical orders a leak?",
        options: [
          "Tiers are not predictive",
          "The tier on the row is the value today, which for old orders is information from after the order — it can encode the outcome (a customer who stayed and upgraded) and is unavailable at serving time",
          "Joins are slow",
          "It is not a leak if the tier never changed"
        ],
        answer: 1,
        why: "The executed contrast showed January orders labelled plus when the customer was standard. A history table and an as-of join fix it; without history, the feature cannot be built honestly."
      },
      {
        stem: "Which as-of join form is portable to every engine?",
        options: [
          "ASOF JOIN",
          "The ranked window: join history rows with valid_from <= as_of, ROW_NUMBER() ordered by valid_from DESC per left row, keep rn = 1",
          "LATERAL",
          "None"
        ],
        answer: 1,
        why: "LATERAL needs PostgreSQL or DuckDB; ASOF is native to a few engines; the ranked window is plain window syntax and runs everywhere, at the cost of a fan-out before the filter."
      },
      {
        stem: "For a snapshot feature table on a date grid, what is the label window?",
        options: [
          "Before as_of",
          "At or after as_of, for a fixed horizon — for example orders with as_of <= placed_at < as_of + 30 days — so features and labels never overlap",
          "The same window as the features",
          "The whole future"
        ],
        answer: 1,
        why: "Features and labels partition time at as_of. A fixed horizon keeps the label comparable across grid dates."
      },
      {
        stem: "How do you prevent train–serve skew in SQL feature pipelines?",
        options: [
          "Recompute features in Python at serving time",
          "Use one SQL definition parameterised by as_of: historical grid dates for training, today for serving, so both are computed by identical code",
          "Cache the training features",
          "Serve from the training table"
        ],
        answer: 1,
        why: "Skew is a second implementation. One definition, two as-of times, is the structural fix."
      },
      {
        stem: "A new customer has no orders before as_of. What should their feature row look like?",
        options: [
          "Omitted",
          "Present, with zero counts and sums and a NULL recency — the row a LEFT JOIN from the grid produces, and the same row the serving path will see for new customers",
          "Filled with averages",
          "Present with recency 9999"
        ],
        answer: 1,
        why: "New customers exist at serving time; the training set must contain them as they will appear. NULL recency is a fact; 9999 is a fiction the model will learn."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is temporal leakage and how do you prevent it in SQL?",
        strong: "Leakage is any feature computed with information from at or after the moment the row describes — today's customer attributes on last year's orders, event counts that include the outcome event, aggregates through the label date. It inflates offline metrics and is unavailable at serving time. Prevention is structural: every history join carries occurred_at strictly less than the as-of time, attributes that change come from a history table through an as-of join, labels come from at or after the as-of time, and the whole thing is one SQL definition parameterised by as-of so the training grid and the serving run are the same code. I check by looking for a join without an inequality and for a feature that equals or nearly equals the label.",
        answer: [
          { t: "p", text: "The strict inequality, the history table, and the one-definition rule are the three mechanisms." }
        ]
      },
      {
        level: "core",
        q: "How do you build a training set for a churn model from transactional tables?",
        strong: "A grid of customers crossed with scoring dates — every customer on every Monday for the training period. For each grid row, features from strictly before the date: orders and spend to date, spend in the last 30 and 90 days, days since last order, event counts in the prior week, and slowly changing attributes via an as-of join on a history table. The label looks forward: no order in the 60 days at or after the date, say. New customers get zeros and NULL recency, not imputed values. I materialise it keyed on customer and date, and the serving set is the same query with today as the only grid date.",
        answer: [
          { t: "p", text: "Grid, look-back features, look-forward label, and the serving set as the last row of the grid." }
        ]
      },
      {
        level: "advanced",
        q: "The offline AUC is 0.95 and production is 0.62. Where do you look?",
        strong: "Leakage first, because that gap is its signature. I look for features that are unavailable or different at serving time: joins to current-value tables without an as-of, inequalities that are <= instead of <, aggregates anchored to now() instead of the row's date, columns derived from the label such as return dates or cancellation flags, and any feature whose importance is suspiciously dominant. Then train–serve skew: the serving features computed by different code — a Python reimplementation, a different timezone, a different NULL treatment. I would recompute the training features with the serving code on a held-out period and compare row by row; the columns that differ are the answer. Only after those two would I consider drift.",
        answer: [
          { t: "p", text: "Leakage, then skew, then drift — with the concrete checks for each." }
        ]
      }
    ]
  }
});

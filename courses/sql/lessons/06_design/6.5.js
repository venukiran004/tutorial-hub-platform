/* ============================================================================
   LESSON 6.5 — Analytics Schemas: Star, Snowflake and Wide
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "**The schema that is right for taking orders is wrong for analysing them.** An operational database is normalised so that each write touches one place; an analytical one is shaped so that each question touches few tables and scans few columns. The star schema — one fact table of measurements surrounded by dimension tables of context — is the standard shape, and it is built from the normalised shop with a handful of statements. This lesson builds it, queries it, handles the customer who changed tier halfway through the year, and explains why a warehouse stores columns rather than rows.",

  objectives: [
    "Contrast OLTP and OLAP workloads and say why each gets its own schema",
    "Build a star schema — fact table at a chosen grain, conformed dimensions, a date dimension — from a normalised source",
    "Implement a type-2 slowly changing dimension so that history is reported as it was",
    "Explain columnar storage, and choose between star, snowflake and a single wide table for a given consumer"
  ],

  prerequisites: ["6.4"],

  blocks: [

    { t: "h2", n: "01", text: "Two workloads, two shapes", id: "workloads" },

    { t: "table",
      head: ["", "OLTP — operations", "OLAP — analytics"],
      rows: [
        ["Typical query", "Fetch or change one order by key", "Sum revenue by month and category over every order"],
        ["Rows touched", "A handful", "Millions, a few columns of each"],
        ["Writes", "Constant, small, concurrent", "Batch loads, then read-only"],
        ["Schema", "3NF: one fact, one place (6.4)", "Star: facts pre-joined to their context; copies are deliberate"],
        ["Storage", "Row-oriented: a row's columns sit together, one fetch per row", "Column-oriented: a column's values sit together, compressed; scan only the columns asked for"],
        ["Engine", "PostgreSQL, MySQL, SQL Server, SQLite", "BigQuery, Snowflake, Redshift, DuckDB, ClickHouse; PostgreSQL with care"],
        ["Optimised for", "Latency and consistency", "Throughput and simplicity of the question"]
      ]
    },

    { t: "p", text: "The two are not in conflict; they are stages. The operational schema is the source of truth, and the analytical schema is derived from it by a load — nightly, hourly, or streaming — so that analysts read a shape built for reading and never touch the tables that take orders. **The transformation between them is the job that SQL does best**, and every statement below is ordinary SQL against the shop." },

    { t: "h2", n: "02", text: "Building the star", id: "star" },

    { t: "p", text: "A star has one **fact table** — the measurements, one row per event at a chosen grain, with foreign keys to context — and **dimension tables** — the context: who, what, when, where. The grain is the first decision: here it is one row per order line, because that is the finest level at which a quantity and a price exist. Coarser grains can always be summed from it; a finer one cannot be recovered." },

    { t: "code", lang: "sql", title: "Dimensions, then the fact, from the normalised shop (executed on DuckDB)",
      hl: [2, 3, 4, 10, 11, 14, 17, 18, 19, 20],
      code: `-- the date dimension: every calendar attribute an analyst will ever GROUP BY, computed once
CREATE TABLE dim_date AS
SELECT d::DATE AS date_key, EXTRACT(year FROM d)::INTEGER AS year, EXTRACT(month FROM d)::INTEGER AS month,
       strftime(d, '%Y-%m') AS year_month, EXTRACT(isodow FROM d)::INTEGER AS dow, EXTRACT(isodow FROM d) >= 6 AS is_weekend
FROM generate_series(DATE '2025-01-01', DATE '2025-04-30', INTERVAL 1 DAY) t(d);        -- 120 rows

-- the customer dimension, with a surrogate key and the columns a type-2 history needs (section 03)
CREATE TABLE dim_customer (customer_key INTEGER, customer_id INTEGER, name TEXT, country TEXT, tier TEXT,
                           valid_from DATE, valid_to DATE, is_current BOOLEAN);
INSERT INTO dim_customer
SELECT ROW_NUMBER() OVER (ORDER BY customer_id), customer_id, name, country, tier, signed_up, NULL, TRUE FROM customers;   -- 8 rows

-- the product dimension: the NULL category becomes a real member, so it appears in every breakdown
CREATE TABLE dim_product AS SELECT product_id AS product_key, product_id, name, COALESCE(category, 'uncategorised') AS category FROM products;

-- the fact, at order-line grain: keys to every dimension, the measures, and the status as a degenerate attribute
CREATE TABLE fact_sales AS
SELECT o.order_id, oi.product_id AS product_key, dc.customer_key, o.placed_at::DATE AS date_key, o.status,
       oi.qty, oi.unit_price, oi.qty * oi.unit_price AS line_total
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
JOIN   dim_customer dc ON dc.customer_id = o.customer_id AND dc.is_current;
SELECT COUNT(*) AS rows, SUM(line_total) AS total FROM fact_sales;                       -- 19 | 806.90`,
      caption: "The fact table's 19 rows and 806.90 total match the line items of 1.1 exactly — the star adds no information, it rearranges it. Precomputing `line_total` is a legitimate copy: it is derived, and the load owns it."
    },

    { t: "viz",
      title: "The star",
      caption: "Every analytical question is 'measures from the fact, grouped by attributes of the dimensions': one join per dimension used, never a chain. The date dimension is the one people forget to build and the one every report uses.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A central fact_sales table connected by single lines to four dimension tables placed around it: dim_date, dim_customer, dim_product, and a degenerate order_id attribute.">
  <rect x="330" y="95" width="220" height="90" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="440" y="120" class="s-label" text-anchor="middle" style="font-weight:600">fact_sales</text>
  <text x="440" y="142" class="s-mono" text-anchor="middle">date_key · customer_key · product_key</text>
  <text x="440" y="162" class="s-mono" text-anchor="middle">qty · unit_price · line_total · status</text>
  <g stroke-width="1.2">
    <rect x="40" y="30" width="200" height="60" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="40" y="190" width="200" height="60" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="640" y="30" width="200" height="60" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="640" y="190" width="200" height="60" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="140" y="52">dim_date</text>
    <text x="140" y="212">dim_customer</text>
    <text x="740" y="52">dim_product</text>
    <text x="740" y="212">order_id</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="140" y="74">year · month · dow · is_weekend</text>
    <text x="140" y="234">name · country · tier · valid_from/to</text>
    <text x="740" y="74">name · category</text>
    <text x="740" y="234">degenerate: no dimension table</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="240" y1="70" x2="330" y2="110"/>
    <line x1="240" y1="210" x2="330" y2="170"/>
    <line x1="640" y1="70" x2="550" y2="110"/>
    <line x1="640" y1="210" x2="550" y2="170" stroke-dasharray="3 3"/>
  </g>
</svg>`
    },

    { t: "code", lang: "sql", title: "Star queries: one join per dimension, a GROUP BY on their attributes (executed)",
      hl: [1, 2, 3, 9, 10, 11],
      code: `SELECT d.year_month, p.category, SUM(f.line_total) AS revenue, SUM(f.qty) AS units
FROM   fact_sales f JOIN dim_date d ON d.date_key = f.date_key JOIN dim_product p ON p.product_key = f.product_key
WHERE  f.status = 'paid'
GROUP BY d.year_month, p.category ORDER BY d.year_month, p.category;
-- 12 rows: 2025-01 audio 85.00 / 1 ... 2025-02 uncategorised 50.00 / 2 ... 2025-04 uncategorised 25.00 / 1

-- an attribute that exists only because the date dimension precomputed it
SELECT c.tier, ROUND(COALESCE(SUM(CASE WHEN d.is_weekend THEN f.line_total END), 0) / SUM(f.line_total), 2) AS weekend_share,
       SUM(f.line_total) AS revenue
FROM   fact_sales f JOIN dim_date d USING (date_key) JOIN dim_customer c USING (customer_key)
WHERE  f.status = 'paid' GROUP BY c.tier ORDER BY c.tier;`,
      caption: "The gift card's NULL category appears as `uncategorised` and is counted, where in the 3NF query it would have been a NULL group someone forgot to label. Dimensions are where data-quality decisions get made once."
    },

    { t: "table",
      head: ["tier", "weekend_share", "revenue"],
      rows: [
        ["plus", "0.42", "373.50"],
        ["standard", "0.00", "324.40"]
      ]
    },

    { t: "h2", n: "03", text: "Slowly changing dimensions", id: "scd" },

    { t: "p", text: "Bruno was `standard` and becomes `plus` on 1 March. If the dimension row is simply updated (**type 1**), every past order of his is now reported under `plus`, and last quarter's tier report changes retroactively. If instead the old row is closed and a new row opened (**type 2**), past facts keep pointing at the old row, new facts point at the new one, and 'revenue by tier' is correct for any period. The surrogate `customer_key`, distinct from the business `customer_id`, is what makes two rows for one customer possible." },

    { t: "code", lang: "sql", title: "Type 2: close the old row, open the new one, and let the facts fall where they were (executed)",
      hl: [2, 3, 8, 9, 13, 14],
      code: `-- Bruno upgrades on 2025-03-01
UPDATE dim_customer SET valid_to = DATE '2025-02-28', is_current = FALSE WHERE customer_id = 2 AND is_current;
INSERT INTO dim_customer VALUES (9, 2, 'Bruno', 'DE', 'plus', DATE '2025-03-01', NULL, TRUE);
-- customer_key | customer_id | tier     | valid_from | valid_to   | is_current
-- 2            | 2           | standard | 2024-12-19 | 2025-02-28 | False
-- 9            | 2           | plus     | 2025-03-01 | NULL       | True

-- his January and February orders still point at key 2, and report as standard
SELECT f.order_id, f.date_key, c.customer_key, c.tier FROM fact_sales f JOIN dim_customer c USING (customer_key) WHERE c.customer_id = 2;
-- 101 | 2025-01-06 | 2 | standard        105 | 2025-02-11 | 2 | standard

-- a March order is loaded against the row current at load time, key 9
INSERT INTO fact_sales SELECT 114, 11, dc.customer_key, DATE '2025-03-20', 'paid', 1, 45.00, 45.00 FROM dim_customer dc WHERE dc.customer_id = 2 AND dc.is_current;
SELECT c.tier, SUM(f.line_total) AS revenue FROM fact_sales f JOIN dim_customer c USING (customer_key) WHERE c.customer_id = 2 GROUP BY c.tier;
-- plus | 45.00        standard | 112.50           -- history as it was, not as it is`,
      caption: "For a backfill — loading old facts after the dimension already has history — join on the business key and the date range instead: `dc.customer_id = o.customer_id AND o.placed_at::DATE BETWEEN dc.valid_from AND COALESCE(dc.valid_to, DATE '9999-12-31')`. That is the as-of join of 7.2, and it is how a fact finds the dimension row that was true when it happened."
    },

    { t: "dl", items: [
      ["Fact table", "One row per measurement at a fixed grain, with foreign keys to dimensions and numeric measures. Long and narrow; the big table."],
      ["Dimension table", "The context of a fact: who, what, when, where, with all their descriptive attributes. Short and wide; the tables you GROUP BY."],
      ["Grain", "What one fact row represents — an order line, a page view, a daily balance. Decided first and never mixed within a table."],
      ["Conformed dimension", "A dimension shared by several fact tables — one `dim_customer` for sales, returns and support tickets — so that reports across facts agree."],
      ["Degenerate dimension", "An identifier kept on the fact with no dimension table of its own: `order_id`, an invoice number."],
      ["SCD type 1 / type 2", "Type 1 overwrites the dimension row; history is lost. Type 2 adds a row with validity dates and a current flag; facts keep the key that was current when they happened."],
      ["Snowflake schema", "A star whose dimensions are themselves normalised — `dim_product` → `dim_category` → `dim_department`. Fewer copies, more joins."],
      ["Wide table (one big table)", "The star fully joined and flattened: every attribute on every fact row. No joins at query time; columnar compression makes the repetition cheap."]
    ]},

    { t: "h2", n: "04", text: "Columnar storage, and the wide table", id: "columnar" },

    { t: "p", text: "A row store keeps each row's columns together: fetching one order is one read, but summing `line_total` over a million rows reads a million whole rows to use one column of each. **A column store keeps each column's values together, sorted and compressed** — a `status` column of a million rows with three distinct values compresses to almost nothing — so a query reads only the columns it names and decompresses runs of identical values in bulk. That is why a warehouse can scan a billion rows in seconds, why `SELECT *` is expensive there in a way it is not in PostgreSQL, and why the wide table stops being wasteful: repeating `tier` on every fact row costs bytes in a row store and nearly none in a column store." },

    { t: "code", lang: "sql", title: "The wide table: the star joined once, at load time (executed)",
      hl: [1, 2, 3, 4, 7],
      code: `CREATE TABLE sales_wide AS
SELECT f.order_id, f.date_key, d.year_month, d.is_weekend, c.name AS customer_name, c.country, c.tier,
       p.name AS product_name, p.category, f.qty, f.unit_price, f.line_total, f.status
FROM   fact_sales f JOIN dim_date d USING (date_key) JOIN dim_customer c USING (customer_key) JOIN dim_product p USING (product_key);   -- 20 rows

-- the consumer's query has no joins at all
SELECT year_month, SUM(line_total) AS revenue FROM sales_wide WHERE status = 'paid' GROUP BY year_month ORDER BY year_month;
-- 2025-01 | 203.00     2025-02 | 251.90     2025-03 | 235.50     2025-04 | 52.50`,
      caption: "The wide table is what a dashboard tool, a notebook or a feature pipeline wants: one table, every column, no joins to get wrong. Its cost is that a dimension change means a rebuild — which is fine when the star it was built from is the source and the rebuild is one CREATE TABLE AS."
    },

    { t: "table",
      head: ["Shape", "Joins per query", "Copies", "Best for"],
      rows: [
        ["3NF (source)", "Many, in chains", "None", "Taking the orders; the source of truth"],
        ["Snowflake", "One per dimension, plus one per normalised level", "Few", "Very large dimensions with hierarchies that change independently"],
        ["Star", "One per dimension used", "Some: dimensions repeat their attributes", "**The default warehouse shape**: BI tools, ad hoc analysis, conformed reporting"],
        ["Wide table", "None", "Every attribute on every row", "Dashboards, notebooks, ML features; columnar engines where repetition is nearly free"]
      ]
    },

    { t: "callout", kind: "mental", title: "Load once, query many", body: [
      { t: "p", text: "All three analytical shapes are derived, and the derivation is where the difficult joins, the NULL-handling decisions and the SCD logic live — written once, tested once, run on a schedule. **Every query after that is a GROUP BY.** When analysts are writing five-way joins with COALESCE in every dashboard, that is a sign the derivation step is missing, not that they need to get better at joins." }
    ]},

    { t: "ladder",
      title: "Monthly revenue by customer tier for the last two years",
      rungs: [
        { level: "bad", label: "Against the operational tables, live", code: `SELECT date_trunc('month', o.placed_at), c.tier, SUM(oi.qty * oi.unit_price)
FROM orders o JOIN order_items oi ON ... JOIN customers c ON ... WHERE o.status = 'paid' GROUP BY 1, 2;`,
          note: "**Three joins across the tables that take orders, and the tier is today's tier for every month.** Slow, and wrong for anyone who changed tier." },
        { level: "ok", label: "Against a star with type-1 dimensions", code: `SELECT d.year_month, c.tier, SUM(f.line_total)
FROM fact_sales f JOIN dim_date d USING (date_key) JOIN dim_customer c USING (customer_key)
WHERE f.status = 'paid' GROUP BY 1, 2;`,
          note: "**Fast and simple; still today's tier.** Reports drift retroactively when a customer's attributes change." },
        { level: "best", label: "Against a star with a type-2 customer dimension", code: `-- same query; the facts already carry the customer_key that was current when they happened
SELECT d.year_month, c.tier, SUM(f.line_total) FROM fact_sales f JOIN dim_date d USING (date_key)
JOIN dim_customer c USING (customer_key) WHERE f.status = 'paid' GROUP BY 1, 2;`,
          note: "**The same query, and now 'revenue by tier in February' is what it was in February.** The correctness moved into the load, where it is written once." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Design",
      title: "A star for the events table",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "The shop's `events` table records views, carts and checkouts per customer with a timestamp. Design a star for funnel analysis: choose the grain, define the fact and its measures, name the dimensions (reusing `dim_date` and `dim_customer`), decide how `event_type` is represented, and write the CREATE TABLE AS for the fact. Then write the star query for 'checkouts per 100 views, by customer tier and weekday-versus-weekend'." }
      ],
      requirements: [
        "Grain stated in one sentence.",
        "A time-of-day dimension or attributes, since events happen at hours, not days.",
        "event_type as a small dimension or a conformed attribute — justify.",
        "The funnel query using only the star."
      ],
      hint: "The grain is one row per event. The measure is a count — a factless fact table, or a fact with a constant 1. Hour of day belongs in a `dim_time` or as columns on the fact.",
      solution: {
        lang: "sql",
        title: "star_events.sql",
        code: `-- grain: one row per event (a customer doing one thing at one instant). Measures: none but the count -- a factless fact.
CREATE TABLE dim_event_type AS
SELECT * FROM (VALUES ('view', 1, 'Viewed a product'), ('cart', 2, 'Added to cart'), ('checkout', 3, 'Completed checkout'))
       t(event_type_key, funnel_step, label);
-- a dimension rather than a bare string, because funnel_step is an attribute analysts sort and filter on

CREATE TABLE fact_events AS
SELECT e.event_id, dc.customer_key, e.occurred_at::DATE AS date_key, EXTRACT(hour FROM e.occurred_at)::INTEGER AS hour_of_day,
       e.event_type AS event_type_key, e.occurred_at, 1 AS event_count
FROM   events e
JOIN   dim_customer dc ON dc.customer_id = e.customer_id
                      AND e.occurred_at::DATE BETWEEN dc.valid_from AND COALESCE(dc.valid_to, DATE '9999-12-31');   -- as-of: the row true at the time

-- checkouts per 100 views by tier and weekend
SELECT c.tier, d.is_weekend,
       SUM(CASE WHEN t.event_type_key = 'view'     THEN f.event_count END) AS views,
       SUM(CASE WHEN t.event_type_key = 'checkout' THEN f.event_count END) AS checkouts,
       ROUND(100.0 * COALESCE(SUM(CASE WHEN t.event_type_key = 'checkout' THEN f.event_count END), 0)
                   / NULLIF(SUM(CASE WHEN t.event_type_key = 'view' THEN f.event_count END), 0), 1) AS checkouts_per_100_views
FROM   fact_events f
JOIN   dim_date d       USING (date_key)
JOIN   dim_customer c   USING (customer_key)
JOIN   dim_event_type t USING (event_type_key)
GROUP BY c.tier, d.is_weekend ORDER BY c.tier, d.is_weekend;`,
        notes: [
          { t: "p", text: "**The as-of join in the fact load** is the type-2 discipline from section 03 applied at build time: an event is attributed to the customer row that was valid when it happened, so a later tier change does not rewrite past funnels." },
          { t: "p", text: "**`event_type` earns a dimension because it has attributes** — the funnel step order and a label — exactly the rule from 6.4's status ladder. Hour of day stays on the fact as an integer: it has no attributes of its own worth a table." },
          { t: "p", text: "**The funnel query is conditional aggregation over the star** (1.4), with NULLIF guarding the division. Every funnel, retention and cohort query of 7.3 is this shape." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Bruno upgrades from standard to plus in March. Under a type-2 customer dimension, how does his February revenue report?",
          options: [
            "As plus, because that is his tier now",
            "As standard: his February facts carry the customer_key of the row that was current in February, which was closed on 28 February with tier standard",
            "Twice, once under each tier",
            "It is deleted"
          ],
          answer: 1,
          why: "The executed result was 45.00 under plus (the March order) and 112.50 under standard (January and February). History reports as it was."
        }
      ]
    }
  ],

  takeaways: [
    "**OLTP is normalised for writes; OLAP is shaped for reads** — the analytical schema is derived from the operational one by a load.",
    "**A star is one fact table at a fixed grain plus dimensions**; every query is measures grouped by dimension attributes, one join per dimension.",
    "**Choose the grain first, as fine as the measures exist**; coarser is always a SUM away.",
    "**Build a date dimension**; it is the one every report uses and the one people forget.",
    "**Dimensions are where data-quality decisions are made once** — a NULL category becomes `uncategorised`.",
    "**Type 2 keeps history**: close the old row, open the new one, surrogate keys on the fact; a type-1 overwrite rewrites the past.",
    "**Backfills and event loads use an as-of join** on the business key and validity range (7.2).",
    "**Columnar storage reads only the columns named** and compresses repetition — the reason `SELECT *` is costly in a warehouse and a wide table is not.",
    "**Star by default; snowflake for huge hierarchical dimensions; wide table for dashboards, notebooks and features.**",
    "**Load once, query many**: five-way joins in every dashboard mean the derivation step is missing."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the grain of a fact table, and why decide it first?",
        options: [
          "The number of rows",
          "What one row represents — an order line, a page view — decided first because every measure and key must agree with it, coarser levels can be summed from it, and a finer level cannot be recovered",
          "The primary key column",
          "The load frequency"
        ],
        answer: 1,
        why: "Mixing grains in one fact table — order lines and order totals — double-counts under every SUM. The grain is the contract."
      },
      {
        stem: "Why does a fact table use a surrogate `customer_key` rather than the business `customer_id`?",
        options: [
          "Integers join faster",
          "So the dimension can hold several rows for one customer over time (type 2), and each fact can point at the row that was true when the fact happened",
          "To hide the real id",
          "It is a warehouse convention with no reason"
        ],
        answer: 1,
        why: "One business id, many dimension rows, each with a validity range — that is only possible if the fact's key is the row, not the customer."
      },
      {
        stem: "Which statement about columnar storage is correct?",
        options: [
          "It makes single-row lookups faster",
          "It stores each column's values contiguously and compressed, so an aggregate over a few columns of many rows reads only those columns; single-row fetches and frequent small writes are worse than in a row store",
          "It removes the need for indexes on OLTP tables",
          "It only works with star schemas"
        ],
        answer: 1,
        why: "Columnar trades point access and write latency for scan throughput and compression — the OLAP profile exactly."
      },
      {
        stem: "When is a wide table the right shape?",
        options: [
          "Always, in a warehouse",
          "For consumers that want one table with no joins — dashboards, notebooks, feature pipelines — on a columnar engine where repeated attributes compress well, rebuilt from the star when dimensions change",
          "For the operational database",
          "Never; it violates 3NF"
        ],
        answer: 1,
        why: "It violates 3NF on purpose. The star remains the maintained source; the wide table is a derived convenience."
      },
      {
        stem: "A snowflake schema differs from a star in that…",
        options: [
          "It has several fact tables",
          "Its dimensions are normalised into further tables — product to category to department — trading fewer copies for more joins",
          "It has no date dimension",
          "It is stored row-wise"
        ],
        answer: 1,
        why: "Snowflaking is normalising the dimensions. Worth it for very large dimensions with independently changing hierarchies; otherwise the star's simplicity wins."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain a star schema and why analytics uses it instead of 3NF.",
        strong: "A star has one fact table — measurements at a fixed grain, such as one row per order line with quantity and amount — and dimension tables around it for the context: date, customer, product, each with all its descriptive attributes. Every analytical question becomes 'sum the measures, grouped by attributes of the dimensions', which is one join per dimension and never a chain. 3NF is right for the operational system because each fact lives in one place and writes are cheap; but reads need chains of joins and every dashboard re-implements the same NULL handling. The star copies attributes deliberately, derived from the 3NF source by a load, so the hard logic is written once. On a columnar engine the copies are nearly free.",
        answer: [
          { t: "p", text: "Grain, one-join-per-dimension, and 'the hard logic written once in the load' are the three points." }
        ]
      },
      {
        level: "core",
        q: "A customer changes segment. How do you keep last quarter's report from changing?",
        strong: "A type-2 slowly changing dimension. Instead of overwriting the customer's row, close it with a valid_to date and insert a new row with the new segment, a new surrogate key, and is_current true. Facts store the surrogate key that was current when they were loaded, so last quarter's facts still point at the old row and report the old segment. For backfills I join on the business key and the validity range — an as-of join — so each fact finds the row true at its timestamp. Type 1, overwriting, is right for corrections like a misspelt name where history should change.",
        answer: [
          { t: "p", text: "Surrogate key, validity range, as-of join for backfill, and when type 1 is correct — complete." }
        ]
      },
      {
        level: "advanced",
        q: "Star, snowflake or one big table?",
        strong: "Star by default: it is simple for BI tools and humans, conformed dimensions let several fact tables agree, and the copies are cheap on columnar storage. Snowflake when a dimension is very large with hierarchies that change independently — a product catalogue with millions of SKUs and a category tree maintained by a different team — so that normalising the dimension saves real space and update effort. One big table for specific consumers: dashboards that want no joins, notebooks, feature stores; built from the star by one CREATE TABLE AS and rebuilt when dimensions change. In practice all three coexist: 3NF source, star as the maintained model, wide tables as published views of it.",
        answer: [
          { t: "p", text: "The layered answer — source, star, wide — is how real warehouses are built." }
        ]
      }
    ]
  }
});

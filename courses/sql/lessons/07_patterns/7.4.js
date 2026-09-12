/* ============================================================================
   LESSON 7.4 — Sampling, Splits and Checks in SQL
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "**The first three things a data scientist does with a table — sample it, split it, and check it — are usually done after pulling it into memory, which is exactly where they should not be done.** A hash split in SQL is deterministic, reproducible, and holds across a customer's rows; a stratified sample is a window function; a time split is a WHERE; and a suite of data checks is a UNION ALL of counts that should be zero. This lesson does each against the shop, shows the row-level split that leaks a customer into both train and test, and ends with the reconciliation query that catches a pipeline drifting before anyone notices.",

  objectives: [
    "Split by a hash of the entity key so the split is deterministic, reproducible across runs and engines, and grouped by entity",
    "Draw random, stratified and TABLESAMPLE samples, and say which is reproducible and which is fast",
    "Show why a row-level random split leaks, and choose between grouped and time-based splits for a given model",
    "Write a data-check suite as a single query of expected-zero counts, and a reconciliation query that compares two independent paths to the same total"
  ],

  prerequisites: ["3.1", "7.2"],

  blocks: [

    { t: "h2", n: "01", text: "Hash splits: deterministic by key", id: "hash" },

    { t: "p", text: "`random()` gives a different split every run and every engine; a seed fixes the run but not the engine, and adding one row shifts everyone else's draw. **A hash of the entity key does not depend on anything but the key**: customer 3 is in the validation set today, next month, in PostgreSQL and in DuckDB, whether the table has eight rows or eight million. The bucket is the hash modulo 100; the split is a CASE over the bucket." },

    { t: "code", lang: "sql", title: "70 / 15 / 15 by hash of customer_id (executed on DuckDB)",
      hl: [1, 2, 3, 8, 9],
      code: `SELECT customer_id, name, hash(customer_id) % 100 AS bucket,
       CASE WHEN hash(customer_id) % 100 < 70 THEN 'train'
            WHEN hash(customer_id) % 100 < 85 THEN 'valid' ELSE 'test' END AS split
FROM   customers ORDER BY customer_id;
-- 1 Asha 52 train · 2 Bruno 34 train · 3 Chen 82 valid · 4 Dalia 36 train · 5 Emeka 92 test · 6 Fatou 37 train · 7 Iker 46 train · 8 Mara 69 train

-- hash() is engine-specific; for a bucket that is identical across engines, hash a string with md5 and take a slice
SELECT customer_id, ('0x' || substr(md5(customer_id::VARCHAR), 1, 8))::BIGINT % 100 AS bucket FROM customers;   -- DuckDB
-- PostgreSQL: ('x' || substr(md5(customer_id::text), 1, 8))::bit(32)::int % 100     -- 1 -> 60, 2 -> 5, 3 -> 10, 4 -> 57, 5 -> 27 ...
-- BigQuery:   MOD(ABS(FARM_FINGERPRINT(CAST(customer_id AS STRING))), 100)
-- to re-split without changing the hash function, salt the key:  md5('v2:' || customer_id)`,
      caption: "On eight customers the 70/15/15 comes out 6/1/1 — small numbers are lumpy, and the proportions hold only in expectation. The md5 form costs a string conversion per row but gives the same bucket everywhere, which matters when the training set is built in the warehouse and the serving split is checked in the application."
    },

    { t: "dl", items: [
      ["Hash split", "Assign by `hash(key) % N`. Deterministic, reproducible, grouped by key, independent of row order and table size."],
      ["Grouped split", "All rows of an entity in the same fold. Prevents the model from seeing a customer's other rows at training time and recognising them at test time."],
      ["Time split", "Train on rows before a cut-off, test after. The only honest split for a model that will predict the future; also the only one that reveals drift."],
      ["Stratified sample", "A fixed fraction within each group, so rare groups are represented. A ROW_NUMBER per group against a per-group count."],
      ["`TABLESAMPLE`", "Engine-level sampling: BERNOULLI (per row) or SYSTEM (per page, faster, clumpy). PostgreSQL, DuckDB, BigQuery, SQL Server; `REPEATABLE (seed)` for reproducibility where supported."],
      ["Reconciliation", "Two independent computations of the same total — by line and by order, source and target, yesterday's snapshot plus today's deltas — whose difference must be zero."]
    ]},

    { t: "h2", n: "02", text: "Random, stratified, TABLESAMPLE", id: "sampling" },

    { t: "code", lang: "sql", title: "Three ways to take a sample (executed)",
      hl: [2, 3, 7, 8, 9, 13, 14],
      code: `-- 1. seeded random: reproducible within one engine and one session; the draw depends on row order and count
SELECT setseed(0.42);
SELECT customer_id, ROUND(random(), 3) AS r FROM customers ORDER BY 1;   -- 1 0.747 · 2 0.674 · 3 0.604 · 4 0.890 ... identical on a second seeded run
-- a 50% sample:  WHERE random() < 0.5   (a different set each run unless seeded, and never the same set across engines)

-- 2. stratified by tier, 50% of each: ROW_NUMBER within the stratum by a deterministic order, keep the first half
WITH r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY tier ORDER BY hash(customer_id)) AS rn,
                     COUNT(*)     OVER (PARTITION BY tier) AS n FROM customers)
SELECT customer_id, name, tier, rn, n FROM r WHERE rn <= CEIL(n * 0.5) ORDER BY tier, rn;
-- plus: Asha 1/3, Dalia 2/3      standard: Bruno 1/5, Emeka 2/5, Chen 3/5      -- 2 of 3 and 3 of 5: CEIL keeps small strata represented

-- 3. TABLESAMPLE: the engine picks; fast on large tables, approximate in size
SELECT COUNT(*) FROM orders TABLESAMPLE reservoir(50%) REPEATABLE (1);     -- 6 of 12 (DuckDB; reservoir gives an exact count)
SELECT COUNT(*) FROM orders USING SAMPLE 50% (bernoulli, 1);              -- 8 of 12: bernoulli decides per row, so the size varies
-- PostgreSQL: SELECT ... FROM orders TABLESAMPLE SYSTEM (10) REPEATABLE (1);   -- per page: fastest, and clumpy by insertion order`,
      caption: "Ordering the stratified ROW_NUMBER by a hash rather than by `random()` makes the sample reproducible without a seed. TABLESAMPLE SYSTEM is the tool for 'give me a feel for a billion-row table in a second'; it is not the tool for a training set, because pages are correlated with insertion time."
    },

    { t: "h2", n: "03", text: "The split that leaks", id: "leak" },

    { t: "code", lang: "sql", title: "Row-level split versus entity-level split (executed)",
      hl: [2, 3, 5, 6, 7, 11, 12, 16, 17],
      code: `-- split each ORDER at random: the same customer lands in both sides
WITH s AS (SELECT o.order_id, o.customer_id, CASE WHEN hash(o.order_id) % 100 < 70 THEN 'train' ELSE 'test' END AS split FROM orders o)
SELECT customer_id, COUNT(DISTINCT split) AS splits, string_agg(order_id || ':' || split, ', ' ORDER BY order_id) AS orders
FROM   s GROUP BY customer_id HAVING COUNT(DISTINCT split) > 1;
-- 1 | 2 | 100:test, 102:train, 108:train
-- 3 | 2 | 103:test, 110:train
-- a model that learns "customer 1 is a big spender" from 102 and 108 is tested on 100 -- and looks better than it is

-- split each CUSTOMER: every order follows its customer
WITH s AS (SELECT o.order_id, o.customer_id, CASE WHEN hash(o.customer_id) % 100 < 70 THEN 'train' ELSE 'test' END AS split FROM orders o)
SELECT customer_id, COUNT(DISTINCT split) FROM s GROUP BY customer_id HAVING COUNT(DISTINCT split) > 1;
-- 0 rows

-- split by TIME: train before March, test from March -- the split a forecasting model must use
SELECT CASE WHEN placed_at < TIMESTAMP '2025-03-01' THEN 'train' ELSE 'test' END AS split,
       COUNT(*) AS orders, MIN(placed_at)::DATE AS first, MAX(placed_at)::DATE AS last
FROM   orders GROUP BY 1 ORDER BY 1;
-- test | 5 | 2025-03-03 | 2025-04-04       train | 7 | 2025-01-05 | 2025-02-25`,
      caption: "The row-level leak is invisible in the metrics and fatal in production: the model has memorised entities, not learned patterns. The rule is to hash the key of whatever the model must generalise across — customers, patients, devices, documents — and to split by time whenever the task is prediction."
    },

    { t: "callout", kind: "warn", title: "Check the split, not just the proportions", body: [
      { t: "p", text: "After any split, run the HAVING query above (no entity in two folds) and a distribution comparison: row counts, entity counts, and the label rate per fold. In the executed grouped split the test fold has 4 orders from 2 customers and a refund rate of 0.25 against 0.00 in train — **on eight customers a grouped split cannot be balanced**, and the check is what tells you so before the model does. On real data, a label rate that differs materially between folds means the hash landed on a skewed subset or the entity groups are very unequal in size; stratify by the label at the entity level in that case." }
    ]},

    { t: "h2", n: "04", text: "Data checks as one query", id: "checks" },

    { t: "p", text: "A check is a count of rows that should not exist. **Write each as a SELECT of a name and a count, UNION ALL them, and the suite is one query whose every row should read 0** — runnable in CI, in the pipeline after each load, and by hand when something looks wrong. The checks that catch the most: orphans in each direction, NULLs in columns that matter, duplicates on what should be unique, impossible orderings in time, and values outside their range." },

    { t: "code", lang: "sql", title: "A check suite against the shop (executed)",
      hl: [1, 2, 3, 6, 8, 9, 10],
      code: `SELECT 'orders without items' AS chk, COUNT(*) AS bad FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.order_id)
UNION ALL SELECT 'items without order',      COUNT(*) FROM order_items i WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = i.order_id)
UNION ALL SELECT 'null country',             COUNT(*) FROM customers WHERE country IS NULL
UNION ALL SELECT 'null category',            COUNT(*) FROM products WHERE category IS NULL
UNION ALL SELECT 'duplicate customer names', COUNT(*) - COUNT(DISTINCT name) FROM customers
UNION ALL SELECT 'orders before signup',     COUNT(*) FROM orders o JOIN customers c USING (customer_id) WHERE o.placed_at::DATE < c.signed_up
UNION ALL SELECT 'negative or zero qty',     COUNT(*) FROM order_items WHERE qty <= 0
UNION ALL SELECT 'price drift > 20%',        COUNT(*) FROM order_items oi JOIN products p USING (product_id) WHERE ABS(oi.unit_price - p.unit_price) / p.unit_price > 0.2
UNION ALL SELECT 'future orders',            COUNT(*) FROM orders WHERE placed_at > TIMESTAMP '2025-04-30';`,
      caption: "Two non-zero rows, and both are known: Dalia's NULL country and the gift card's NULL category are documented traps in this dataset (1.1), not defects. A real suite records expected exceptions in a table and joins them out, so that every remaining non-zero is news. Constraints (6.4) prevent half of these at write time; the suite catches the other half and anything loaded around the constraints."
    },

    { t: "table",
      head: ["chk", "bad"],
      rows: [
        ["orders without items", "0"],
        ["items without order", "0"],
        ["null country", "**1**"],
        ["null category", "**1**"],
        ["duplicate customer names", "0"],
        ["orders before signup", "0"],
        ["negative or zero qty", "0"],
        ["price drift > 20%", "0"],
        ["future orders", "0"]
      ]
    },

    { t: "code", lang: "sql", title: "Reconciliation: two paths, one number (executed)",
      hl: [1, 2, 3, 6],
      code: `WITH a AS (SELECT SUM(qty * unit_price) AS rev FROM order_items oi JOIN orders o USING (order_id) WHERE o.status = 'paid'),
b AS (SELECT SUM(t) AS rev FROM (SELECT o.order_id, SUM(qty * unit_price) AS t FROM orders o JOIN order_items USING (order_id)
                                 WHERE o.status = 'paid' GROUP BY o.order_id))
SELECT a.rev AS by_line, b.rev AS by_order, a.rev - b.rev AS diff FROM a, b;
-- 697.90 | 697.90 | 0.00

-- the same shape guards a pipeline:  source total vs target total after a load;  yesterday's summary + today's deltas vs today's summary;
-- the fact table's SUM(line_total) vs the source's, per day, with any day where diff <> 0 listed`,
      caption: "A reconciliation is stronger than a check because it does not depend on knowing what could go wrong: any bug that touches one path and not the other shows up as a non-zero difference. The 4.4 exercise's total-by-day audit and 6.3's summary-table refresh both belong in this query."
    },

    { t: "viz",
      title: "Where each guard sits in a pipeline",
      caption: "Constraints refuse bad rows on the way in; the check suite runs after each load and lists what got past them; reconciliation compares independent totals; the split checks run once per training set. Each catches what the previous one cannot express.",
      svg: `<svg viewBox="0 0 880 200" role="img" aria-label="A left-to-right pipeline: source, load, table, training set. Under each step a guard: constraints at load, check suite after the table, reconciliation between source and table, split checks at the training set.">
  <defs>
    <marker id="ac-ah-74" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.2">
    <rect x="30" y="40" width="160" height="50" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="260" y="40" width="160" height="50" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="490" y="40" width="160" height="50" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="720" y="40" width="140" height="50" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="110" y="70">source</text>
    <text x="340" y="70">load</text>
    <text x="570" y="70">table</text>
    <text x="790" y="70">training set</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="190" y1="65" x2="260" y2="65" marker-end="url(#ac-ah-74)"/>
    <line x1="420" y1="65" x2="490" y2="65" marker-end="url(#ac-ah-74)"/>
    <line x1="650" y1="65" x2="720" y2="65" marker-end="url(#ac-ah-74)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="340" y="118" style="fill:var(--crit)">constraints (6.4)</text>
    <text x="340" y="134">refuse bad rows</text>
    <text x="570" y="118" style="fill:var(--warn)">check suite</text>
    <text x="570" y="134">expected-zero counts</text>
    <text x="790" y="118" style="fill:var(--good)">split checks</text>
    <text x="790" y="134">no entity in two folds · label rate per fold</text>
  </g>
  <path d="M110,90 C110,175 570,175 570,90" fill="none" style="stroke:var(--accent)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="340" y="180" class="s-sub" text-anchor="middle" style="fill:var(--accent)">reconciliation: source total = table total</text>
</svg>`
    },

    { t: "ladder",
      title: "Building a training set for a refund model",
      rungs: [
        { level: "bad", label: "Pull everything, split in pandas", code: `df = pd.read_sql("SELECT * FROM orders JOIN ...", conn)
train, test = train_test_split(df, test_size=0.3, random_state=42)`,
          note: "**Row-level, and the same customer is on both sides.** Reproducible only with this library version and this row order; the split cannot be re-derived in SQL for the serving check." },
        { level: "ok", label: "Hash split by customer in SQL", code: `SELECT ..., CASE WHEN hash(customer_id) % 100 < 70 THEN 'train' ELSE 'test' END AS split
FROM feature_table`,
          note: "**Grouped and reproducible.** Still tests on orders from the same period as training; a model that has learned this quarter's patterns is tested on this quarter." },
        { level: "best", label: "Time split, then hash within the training period for validation", code: `SELECT ..., CASE WHEN placed_at >= DATE '2025-03-01' THEN 'test'
                 WHEN hash(customer_id) % 100 < 80 THEN 'train' ELSE 'valid' END AS split
FROM feature_table
-- plus: the HAVING check (no customer in train and valid) and the label rate per split`,
          note: "**Tests the model the way production will use it: on a later period.** Validation is grouped by customer inside the training period; the two checks run as part of the same job." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A check suite with expected exceptions and a daily reconciliation",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Extend the check suite: add a table `check_exceptions (chk, expected_bad, reason)` holding the two known non-zeros, and rewrite the suite so that it returns only checks whose count differs from the expected value, with the reason column NULL for genuinely new failures. Then write a per-day reconciliation between `fact_sales` (from 6.5) and the source tables — revenue by date — listing only days where the two disagree, with the difference. Finally, add one check that would have caught the row-level split leak of section 03 on a table `training_rows (order_id, customer_id, split)`." }
      ],
      requirements: [
        "The suite returns zero rows when everything is as expected.",
        "Known exceptions are data, not hard-coded numbers in the SQL.",
        "The reconciliation is a FULL OUTER JOIN on date so a day present in only one side is reported.",
        "The split check reports the number of straddling customers."
      ],
      hint: "Wrap the UNION ALL in a CTE, LEFT JOIN the exceptions on chk, and filter with `bad IS DISTINCT FROM COALESCE(expected_bad, 0)`. For the reconciliation, COALESCE both sides to 0 after the FULL JOIN.",
      solution: {
        lang: "sql",
        title: "checks.sql",
        code: `CREATE TABLE check_exceptions (chk TEXT PRIMARY KEY, expected_bad INTEGER NOT NULL, reason TEXT NOT NULL);
INSERT INTO check_exceptions VALUES
  ('null country',  1, 'Dalia signed up before country became mandatory; ticket DATA-118'),
  ('null category', 1, 'gift cards are deliberately uncategorised');

WITH suite AS (
  SELECT 'orders without items' AS chk, COUNT(*) AS bad FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.order_id)
  UNION ALL SELECT 'null country',  COUNT(*) FROM customers WHERE country IS NULL
  UNION ALL SELECT 'null category', COUNT(*) FROM products WHERE category IS NULL
  UNION ALL SELECT 'orders before signup', COUNT(*) FROM orders o JOIN customers c USING (customer_id) WHERE o.placed_at::DATE < c.signed_up
  UNION ALL SELECT 'split straddlers', COUNT(*) FROM (SELECT customer_id FROM training_rows GROUP BY customer_id HAVING COUNT(DISTINCT split) > 1)
  -- ... the rest of the suite
)
SELECT s.chk, s.bad, e.expected_bad, e.reason           -- reason NULL: a new failure; reason present: a known count that changed
FROM   suite s LEFT JOIN check_exceptions e USING (chk)
WHERE  s.bad IS DISTINCT FROM COALESCE(e.expected_bad, 0);
-- zero rows on the shop as shipped; 'split straddlers | 2 | NULL | NULL' if training_rows was split by order_id

-- daily reconciliation: fact table vs source, both sides present, only disagreements listed
WITH src AS (
  SELECT o.placed_at::DATE AS d, SUM(oi.qty * oi.unit_price) AS rev
  FROM   orders o JOIN order_items oi USING (order_id) WHERE o.status = 'paid' GROUP BY 1
),
fct AS (SELECT date_key AS d, SUM(line_total) AS rev FROM fact_sales WHERE status = 'paid' GROUP BY 1)
SELECT COALESCE(src.d, fct.d) AS d, COALESCE(src.rev, 0) AS source_rev, COALESCE(fct.rev, 0) AS fact_rev,
       COALESCE(fct.rev, 0) - COALESCE(src.rev, 0) AS diff
FROM   src FULL OUTER JOIN fct ON fct.d = src.d
WHERE  COALESCE(src.rev, 0) <> COALESCE(fct.rev, 0)
ORDER BY d;`,
        notes: [
          { t: "p", text: "**`IS DISTINCT FROM COALESCE(expected, 0)`** is the whole trick: a check with no exception row must be 0; a check with one must equal its expected count; and a known exception that grows — a second NULL country — surfaces with its reason attached, so the reader knows it was 1 yesterday." },
          { t: "p", text: "**The FULL OUTER JOIN** is what makes the reconciliation catch a missing day rather than only a wrong day: a partition the load skipped appears as source_rev > 0, fact_rev 0." },
          { t: "p", text: "**The split check is just the HAVING query counted**, and it belongs in the suite rather than in a notebook because the training set is rebuilt by a job, and jobs are where checks must live." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why split on `hash(customer_id)` rather than `random()`?",
          options: [
            "Hashes are more random",
            "The hash depends only on the key: the same customer lands in the same fold on every run, on every engine, and with all their rows together — reproducible and grouped, which random() is neither",
            "random() is slower",
            "Hashes give exact proportions"
          ],
          answer: 1,
          why: "A seed makes random() repeatable within one engine and row order; a hash makes the assignment a property of the entity."
        }
      ]
    }
  ],

  takeaways: [
    "**Hash the entity key for splits**: deterministic, reproducible, grouped; md5-based buckets are the same across engines; salt to re-split.",
    "**Small samples are lumpy**: proportions hold in expectation, not in eight rows.",
    "**Stratify with ROW_NUMBER per group against a per-group count**, ordered by a hash for reproducibility.",
    "**TABLESAMPLE SYSTEM for a fast look at a huge table**; not for training sets, because pages correlate with insertion time.",
    "**A row-level split leaks entities across folds**; the HAVING query that finds straddlers is a check, not a one-off.",
    "**Split by time whenever the task is prediction**; validate with a grouped hash inside the training period.",
    "**Compare label rates and entity counts across folds** — the split can be correct and still unbalanced.",
    "**A check suite is a UNION ALL of expected-zero counts**; known exceptions live in a table and are joined out.",
    "**Reconciliation compares two independent paths to one total**, per period, with a FULL OUTER JOIN so missing periods show.",
    "**Constraints refuse, checks list, reconciliation compares, split checks guard the training set** — four guards, each catching what the previous cannot."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A model's test AUC is excellent; in production it is poor. The split was `train_test_split` on order rows. What is the likely cause?",
        options: [
          "Too little data",
          "Entity leakage: customers with several orders appear in both folds, so the model memorised customers rather than learning patterns — split by a hash of customer_id, and by time if the task is prediction",
          "Wrong random seed",
          "The test set was too large"
        ],
        answer: 1,
        why: "The executed row-level split put customers 1 and 3 in both folds. A grouped split gave zero straddlers."
      },
      {
        stem: "What does `CEIL(n * 0.5)` achieve in the stratified sample?",
        options: [
          "Faster execution",
          "Every stratum keeps at least half its rows rounded up, so a stratum of 3 keeps 2 rather than 1 — small groups stay represented",
          "Exact 50%",
          "It removes duplicates"
        ],
        answer: 1,
        why: "Rounding down would drop a stratum of one entirely; rounding up over-represents small strata slightly, which is usually the intended direction."
      },
      {
        stem: "Why is a reconciliation stronger than a check?",
        options: [
          "It runs faster",
          "It does not require anticipating the failure: any defect that affects one computation path and not the other shows as a non-zero difference, whereas a check only finds what it was written to find",
          "It uses fewer tables",
          "It is not stronger"
        ],
        answer: 1,
        why: "Checks are enumerated; reconciliation is structural. Use both."
      },
      {
        stem: "Why keep known exceptions in a table rather than adjusting the check's SQL?",
        options: [
          "SQL cannot express exceptions",
          "So the expected count and its reason are data that can be reviewed and expire, and a known count that changes — one NULL country becoming two — still surfaces with its reason attached",
          "For performance",
          "To avoid UNION ALL"
        ],
        answer: 1,
        why: "An exception hard-coded into the WHERE clause silently absorbs growth; a table makes 'expected 1, found 2' a reportable event."
      },
      {
        stem: "When is TABLESAMPLE SYSTEM the wrong tool?",
        options: [
          "For very large tables",
          "For a training or evaluation sample: it picks whole storage pages, which are correlated with insertion order, so the sample is clumpy and biased toward particular periods or batches",
          "For exploration",
          "It is never wrong"
        ],
        answer: 1,
        why: "SYSTEM sampling is fast because it reads few pages; that is exactly what makes it non-random with respect to time. BERNOULLI or a hash filter for anything a model will see."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you create a reproducible train/test split in SQL?",
        strong: "Hash the entity key — the thing the model must generalise across, usually the customer or user — take it modulo 100, and assign folds by ranges of the bucket. It is deterministic: the same key gets the same fold on every run, in every engine if I use an md5-based hash rather than an engine-specific one, and regardless of table size or row order. It is grouped, so all of an entity's rows travel together, which prevents the entity leak that a row-level random split produces. Salting the key re-splits when needed. For prediction tasks I split by time first and use the hash for validation inside the training period. Then two checks in the same job: no entity in two folds, and label rate per fold.",
        answer: [
          { t: "p", text: "Deterministic, grouped, portable, salted, time-first — and the checks." }
        ]
      },
      {
        level: "core",
        q: "What data-quality checks would you run after a load?",
        strong: "A suite of expected-zero counts as one query: referential orphans in both directions, NULLs in columns that must be populated, duplicates on natural keys, impossible time orderings such as an order before its customer's sign-up, values outside their range, and rows dated in the future. Known exceptions live in a table joined against the suite so only surprises are reported. Alongside it, a reconciliation: the loaded table's totals per day against the source's, FULL OUTER JOINed so a skipped partition appears, listing only disagreements. Constraints in the schema prevent what they can; the suite and the reconciliation catch what arrived around them.",
        answer: [
          { t: "p", text: "The suite's categories, the exceptions table, and the reconciliation as the structural guard." }
        ]
      },
      {
        level: "advanced",
        q: "How do you sample a ten-billion-row event table for exploratory analysis versus for a model?",
        strong: "For exploration, TABLESAMPLE SYSTEM at a small percentage: it reads a fraction of the pages and returns in seconds, and clumpiness does not matter when I am looking for column shapes and value ranges. For a model, never SYSTEM — the pages are correlated with insertion time, so the sample is biased toward some periods. I would filter by a hash of the entity key, which gives a random-looking, reproducible, entity-complete subset — every event of the sampled users — at whatever fraction I need, and if the label is rare, stratify at the entity level so positives are represented. On a partitioned warehouse table I would also restrict the partitions scanned, because sampling does not reduce the cost of a full scan; the partition filter does.",
        answer: [
          { t: "p", text: "SYSTEM for a look, hash-by-entity for a model, stratify for rare labels, and the partition-cost point." }
        ]
      }
    ]
  }
});

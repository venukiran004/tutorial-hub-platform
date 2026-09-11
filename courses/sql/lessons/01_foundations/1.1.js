/* ============================================================================
   LESSON 1.1 — The Logical Order of a Query
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**A query is written SELECT-first and evaluated SELECT-fifth.** The engine assembles the tables, filters rows, forms groups, filters groups, and only then computes the expressions you asked for — after which it removes duplicates, sorts, and trims. Every 'why does this not work' in a beginner's SQL, and most of the wrong counts in an expert's, is that order applied to a line that was written in a different one.",

  objectives: [
    "State the logical evaluation order of a SELECT and apply it to a real query stage by stage",
    "Explain why an alias works in ORDER BY and not in WHERE, and why HAVING exists at all",
    "Use DISTINCT, ORDER BY, LIMIT and OFFSET with the guarantees they actually make",
    "Know the dataset the whole course runs on, and the traps built into it"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The shop: one dataset for the whole course", id: "dataset" },

    { t: "p", text: "Every result table in this course was produced by running the query against the same six tables. They are small enough to print and built so that the mistakes have somewhere to happen: **Mara has never ordered. Iker's only order was cancelled. Dalia has no country. The gift card has no category. Two engineers earn the same. Tomas earns more than the person he reports to.** When a query returns a surprising number, one of those is usually the reason." },

    { t: "viz",
      title: "Six tables, five relationships",
      caption: "customers place orders; orders hold order_items which reference products; events are the clicks that precede an order; employees reference themselves through manager_id. The traps are marked.",
      svg: `<svg viewBox="0 0 880 330" role="img" aria-label="Entity diagram: customers, orders, order_items, products, events and employees as boxes with their key columns, connected by lines showing foreign keys, with trap annotations.">
  <defs>
    <marker id="erd-ah-11" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.2">
    <rect x="30" y="40" width="170" height="96" rx="7" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)"/>
    <rect x="270" y="40" width="170" height="96" rx="7" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)"/>
    <rect x="510" y="40" width="170" height="96" rx="7" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)"/>
    <rect x="720" y="40" width="140" height="96" rx="7" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)"/>
    <rect x="30" y="200" width="170" height="96" rx="7" style="fill:var(--good);fill-opacity:.08;stroke:var(--good)"/>
    <rect x="510" y="200" width="200" height="96" rx="7" style="fill:var(--warn);fill-opacity:.08;stroke:var(--warn)"/>
  </g>
  <g class="s-label">
    <text x="44" y="62">customers</text><text x="284" y="62">orders</text><text x="524" y="62">order_items</text><text x="734" y="62">products</text>
    <text x="44" y="222">events</text><text x="524" y="222">employees</text>
  </g>
  <g class="s-mono">
    <text x="44" y="82">customer_id  PK</text><text x="44" y="98">name, country</text><text x="44" y="114">tier, signed_up</text>
    <text x="284" y="82">order_id  PK</text><text x="284" y="98">customer_id  FK</text><text x="284" y="114">placed_at, status</text>
    <text x="524" y="82">order_id  FK</text><text x="524" y="98">product_id  FK</text><text x="524" y="114">qty, unit_price</text>
    <text x="734" y="82">product_id  PK</text><text x="734" y="98">name, category</text><text x="734" y="114">unit_price</text>
    <text x="44" y="242">event_id  PK</text><text x="44" y="258">customer_id</text><text x="44" y="274">event_type, occurred_at</text>
    <text x="524" y="242">employee_id  PK</text><text x="524" y="258">manager_id  FK → self</text><text x="524" y="274">department, salary</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="200" y1="88" x2="270" y2="88" marker-start="url(#erd-ah-11)"/>
    <line x1="440" y1="88" x2="510" y2="88" marker-start="url(#erd-ah-11)"/>
    <line x1="680" y1="88" x2="720" y2="88" marker-end="url(#erd-ah-11)"/>
    <path d="M115,200 L115,150 L200,150 L200,136" marker-end="url(#erd-ah-11)"/>
    <path d="M710,248 C760,248 760,200 730,180 C700,160 660,180 660,200 C660,214 690,220 710,222"/>
  </g>
  <g class="s-sub">
    <text x="206" y="80">1 : n</text><text x="446" y="80">1 : n</text><text x="686" y="80">n : 1</text>
    <text x="124" y="170">customer_id, no FK</text>
  </g>
  <g class="s-sub" style="fill:var(--crit)">
    <text x="30" y="160">Mara: no orders · Dalia: country NULL</text>
    <text x="270" y="160">107 cancelled · 103 refunded</text>
    <text x="720" y="160">gift card: category NULL</text>
    <text x="510" y="318">Quentin = Rosa on salary · Tomas out-earns Quentin</text>
    <text x="30" y="318">events: clicks with gaps, for sessions</text>
  </g>
</svg>`
    },

    { t: "code", lang: "sql", title: "shop.sql — the whole dataset, runnable in PostgreSQL, DuckDB or SQLite",
      code: `CREATE TABLE customers (
    customer_id  INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    country      TEXT,
    tier         TEXT NOT NULL DEFAULT 'standard',
    signed_up    DATE NOT NULL
);
CREATE TABLE products (
    product_id   INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT,
    unit_price   NUMERIC(8,2) NOT NULL
);
CREATE TABLE orders (
    order_id     INTEGER PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
    placed_at    TIMESTAMP NOT NULL,
    status       TEXT NOT NULL                 -- paid | cancelled | refunded
);
CREATE TABLE order_items (
    order_id     INTEGER NOT NULL REFERENCES orders(order_id),
    product_id   INTEGER NOT NULL REFERENCES products(product_id),
    qty          INTEGER NOT NULL,
    unit_price   NUMERIC(8,2) NOT NULL,        -- the price at the time of sale
    PRIMARY KEY (order_id, product_id)
);
CREATE TABLE events (
    event_id     INTEGER PRIMARY KEY,
    customer_id  INTEGER NOT NULL,
    event_type   TEXT NOT NULL,                -- view | cart | checkout
    occurred_at  TIMESTAMP NOT NULL
);
CREATE TABLE employees (
    employee_id  INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    manager_id   INTEGER,
    department   TEXT NOT NULL,
    salary       INTEGER NOT NULL,
    hired_on     DATE NOT NULL
);

INSERT INTO customers VALUES
 (1, 'Asha',  'GB', 'plus',     '2024-11-03'), (2, 'Bruno', 'DE', 'standard', '2024-12-19'),
 (3, 'Chen',  'GB', 'standard', '2025-01-08'), (4, 'Dalia', NULL, 'plus',     '2025-01-21'),
 (5, 'Emeka', 'NG', 'standard', '2025-02-02'), (6, 'Fatou', 'FR', 'standard', '2025-02-14'),
 (7, 'Iker',  'ES', 'standard', '2025-03-01'), (8, 'Mara',  'DE', 'plus',     '2025-03-09');

INSERT INTO products VALUES
 (10, 'Kettle', 'kitchen', 32.00), (11, 'Toaster', 'kitchen', 45.00), (12, 'Desk lamp', 'office', 27.50),
 (13, 'Notebook', 'office', 4.20), (14, 'Headphones', 'audio', 89.00), (15, 'Gift card', NULL, 25.00);

INSERT INTO orders VALUES
 (100, 1, '2025-01-05 09:12:00', 'paid'),      (101, 2, '2025-01-06 14:03:00', 'paid'),
 (102, 1, '2025-01-20 18:40:00', 'paid'),      (103, 3, '2025-02-02 11:15:00', 'refunded'),
 (104, 5, '2025-02-10 08:55:00', 'paid'),      (105, 2, '2025-02-11 16:20:00', 'paid'),
 (106, 4, '2025-02-25 20:05:00', 'paid'),      (107, 7, '2025-03-03 10:30:00', 'cancelled'),
 (108, 1, '2025-03-15 13:45:00', 'paid'),      (109, 6, '2025-03-18 09:00:00', 'paid'),
 (110, 3, '2025-03-27 17:25:00', 'paid'),      (111, 5, '2025-04-04 12:10:00', 'paid');

INSERT INTO order_items VALUES
 (100, 10, 1, 30.00), (100, 13, 3, 4.00),  (101, 14, 1, 85.00),
 (102, 12, 2, 27.50), (102, 13, 5, 4.20),  (103, 11, 1, 45.00),
 (104, 10, 1, 32.00), (104, 11, 1, 45.00), (104, 13, 2, 4.20),
 (105, 12, 1, 27.50), (106, 14, 1, 89.00), (106, 15, 2, 25.00),
 (107, 10, 2, 32.00), (108, 14, 1, 89.00), (108, 12, 1, 27.50),
 (109, 13, 10, 4.20), (110, 10, 1, 32.00), (111, 15, 1, 25.00), (111, 12, 1, 27.50);

INSERT INTO events VALUES
 (1, 1, 'view', '2025-03-15 13:02:00'),  (2, 1, 'view', '2025-03-15 13:09:00'),
 (3, 1, 'cart', '2025-03-15 13:20:00'),  (4, 1, 'checkout', '2025-03-15 13:45:00'),
 (5, 1, 'view', '2025-03-15 19:30:00'),  (6, 2, 'view', '2025-03-16 08:00:00'),
 (7, 2, 'cart', '2025-03-16 08:04:00'),  (8, 2, 'view', '2025-03-16 10:50:00'),
 (9, 3, 'view', '2025-03-27 17:00:00'),  (10, 3, 'cart', '2025-03-27 17:10:00'),
 (11, 3, 'checkout', '2025-03-27 17:25:00'), (12, 5, 'view', '2025-04-04 11:40:00'),
 (13, 5, 'view', '2025-04-04 11:52:00'), (14, 5, 'checkout', '2025-04-04 12:10:00'),
 (15, 6, 'view', '2025-04-05 21:15:00'), (16, 8, 'view', '2025-04-06 07:30:00'),
 (17, 8, 'cart', '2025-04-06 07:33:00'), (18, 8, 'view', '2025-04-06 12:00:00');

INSERT INTO employees VALUES
 (1, 'Nadia', NULL, 'exec', 190000, '2019-04-01'),      (2, 'Oscar', 1, 'engineering', 150000, '2019-09-16'),
 (3, 'Priya', 1, 'sales', 120000, '2020-02-03'),        (4, 'Quentin', 2, 'engineering', 125000, '2020-06-22'),
 (5, 'Rosa', 2, 'engineering', 125000, '2021-01-11'),   (6, 'Sami', 4, 'engineering', 98000, '2022-03-07'),
 (7, 'Tomas', 4, 'engineering', 131000, '2021-08-30'),  (8, 'Uma', 3, 'sales', 82000, '2022-10-17'),
 (9, 'Viktor', 3, 'sales', 91000, '2023-05-02'),        (10, 'Wen', 8, 'sales', 70000, '2024-01-15');`,
      caption: "Eight customers, six products, twelve orders, nineteen line items, eighteen events, ten employees. Paste it into any engine and every table in this course will reproduce."
    },

    { t: "h2", n: "02", text: "The order the engine follows", id: "order" },

    { t: "p", text: "SQL is declarative: you describe the result and the engine decides how to build it. But the *meaning* of a query is defined by a fixed logical order, and you can only predict a result by walking it. **FROM and JOIN assemble the rows. WHERE removes rows. GROUP BY collapses them. HAVING removes groups. SELECT computes the columns. DISTINCT removes duplicate rows. ORDER BY sorts. LIMIT trims.** The physical plan (module 5) may do these in a different order for speed, but it must produce what this order says." },

    { t: "dl", items: [
      ["FROM / JOIN", "Builds the working set: every table named, combined by the join conditions. After this step there is one wide row per matched combination — the row count here is what every later step starts from."],
      ["WHERE", "Row filter. Sees the columns of the joined tables and nothing computed later — no aliases from SELECT, no aggregates, no window functions."],
      ["GROUP BY", "Collapses rows that share the grouping values into one row per group. After it, only the grouping columns and aggregates over the group exist."],
      ["HAVING", "Group filter. The only place a condition on an aggregate can go, because it is the first step at which the aggregate exists."],
      ["SELECT", "Computes the output expressions — and names them. Window functions are evaluated here, on the rows that survived everything above."],
      ["DISTINCT", "Removes rows identical across every selected column. It applies to the whole row, never to one column."],
      ["ORDER BY", "Sorts the finished rows. Runs after SELECT, so it can use aliases, and expressions that are not in the output."],
      ["LIMIT / OFFSET", "Keeps a slice of the sorted rows. Without ORDER BY the slice is whichever rows the engine reached first, which is not a guarantee of anything."]
    ]},

    { t: "code", lang: "sql", title: "One query, walked stage by stage",
      hl: [2, 3, 4, 5, 6, 7],
      code: `SELECT   c.country, COUNT(*) AS n_orders
FROM     orders o
JOIN     customers c ON c.customer_id = o.customer_id
WHERE    o.status = 'paid'
GROUP BY c.country
HAVING   COUNT(*) >= 2
ORDER BY n_orders DESC, c.country
LIMIT    2;

-- 1. FROM + JOIN   every order paired with its customer                 12 rows
-- 2. WHERE         status = 'paid' removes 103 (refunded), 107 (cancelled)  10 rows
-- 3. GROUP BY      one row per country: GB DE NG FR and NULL             5 groups
--                  country | n_orders
--                  --------+---------
--                  GB      | 4
--                  DE      | 2
--                  NG      | 2
--                  FR      | 1
--                  NULL    | 1
-- 4. HAVING        keep groups with COUNT(*) >= 2                         3 groups
-- 5. SELECT        compute the output; the alias n_orders now exists
-- 6. ORDER BY      by n_orders (the alias works here) then country
-- 7. LIMIT 2
--                  country | n_orders
--                  --------+---------
--                  GB      | 4
--                  DE      | 2
--                  (2 rows)`,
      caption: "The two counts at the top — 12 after the join, 10 after WHERE — are the numbers to check first when a total looks wrong. Dalia's NULL country forms a group of its own: GROUP BY treats all NULLs as equal, which section 04 of the next lesson returns to."
    },

    { t: "viz",
      title: "Rows through the pipeline",
      caption: "The same query as a flow of row counts. Each stage can only see what the stage before it produced — which is why WHERE cannot use an alias, HAVING cannot see a column that was not grouped, and ORDER BY can use both.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Eight boxes in a row — FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT — with the row count after each stage for the example query: 12, 10, 5, 3, 3, 3, 3, 2, and notes on what each stage can see.">
  <defs>
    <marker id="lo-ah-11" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.4">
    <rect x="20" y="60" width="92" height="46" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="128" y="60" width="92" height="46" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="236" y="60" width="92" height="46" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="344" y="60" width="92" height="46" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="452" y="60" width="92" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="560" y="60" width="92" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="668" y="60" width="92" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="776" y="60" width="84" height="46" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="66" y="80">FROM</text><text x="66" y="95">JOIN</text>
    <text x="174" y="88">WHERE</text>
    <text x="282" y="88">GROUP BY</text>
    <text x="390" y="88">HAVING</text>
    <text x="498" y="88">SELECT</text>
    <text x="606" y="88">DISTINCT</text>
    <text x="714" y="88">ORDER BY</text>
    <text x="818" y="88">LIMIT</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="112" y1="83" x2="128" y2="83" marker-end="url(#lo-ah-11)"/><line x1="220" y1="83" x2="236" y2="83" marker-end="url(#lo-ah-11)"/>
    <line x1="328" y1="83" x2="344" y2="83" marker-end="url(#lo-ah-11)"/><line x1="436" y1="83" x2="452" y2="83" marker-end="url(#lo-ah-11)"/>
    <line x1="544" y1="83" x2="560" y2="83" marker-end="url(#lo-ah-11)"/><line x1="652" y1="83" x2="668" y2="83" marker-end="url(#lo-ah-11)"/>
    <line x1="760" y1="83" x2="776" y2="83" marker-end="url(#lo-ah-11)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="fill:var(--accent);font-weight:600">
    <text x="66" y="134">12 rows</text><text x="174" y="134">10 rows</text><text x="282" y="134">5 groups</text><text x="390" y="134">3 groups</text>
    <text x="498" y="134">3 rows</text><text x="606" y="134">3 rows</text><text x="714" y="134">3 rows</text><text x="818" y="134">2 rows</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="66" y="160">sees: table</text><text x="66" y="174">columns</text>
    <text x="174" y="160">sees: columns</text><text x="174" y="174">no aliases,</text><text x="174" y="188">no aggregates</text>
    <text x="282" y="160">makes: groups</text><text x="282" y="174">+ aggregates</text>
    <text x="390" y="160">sees:</text><text x="390" y="174">aggregates</text>
    <text x="498" y="160">makes: aliases,</text><text x="498" y="174">window fns</text>
    <text x="606" y="160">whole row</text>
    <text x="714" y="160">sees: aliases</text><text x="714" y="174">+ expressions</text>
    <text x="818" y="160">needs an</text><text x="818" y="174">ORDER BY</text>
  </g>
  <text x="20" y="228" class="s-sub">Row filter on the left of GROUP BY, group filter on the right: the same condition costs less the earlier it is applied, and can only be applied where its inputs exist.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "What the order explains", id: "explains" },

    { t: "p", text: "Most SQL errors that look arbitrary are this order enforced. **An alias defined in SELECT does not exist yet when WHERE runs**, so `WHERE n_orders >= 2` fails — the condition belongs in HAVING, with the aggregate written out. **An aggregate cannot go in WHERE** because no group exists yet. **A window function cannot be filtered in the same query** because it is computed in SELECT, after WHERE and HAVING have finished; the filter goes in an outer query, or in `QUALIFY` on the engines that have it (3.2)." },

    { t: "code", lang: "sql", title: "Four errors that are all the same error",
      code: `-- 1. alias in WHERE: the alias is made in SELECT, which has not run yet
SELECT name, salary * 12 AS annual FROM employees WHERE annual > 1500000;
-- ERROR: column "annual" does not exist          (PostgreSQL, SQL Server; MySQL and DuckDB are lenient)
SELECT name, salary * 12 AS annual FROM employees WHERE salary * 12 > 1500000;   -- the fix: repeat the expression

-- 2. aggregate in WHERE: no group exists at that stage
SELECT department, COUNT(*) FROM employees WHERE COUNT(*) > 2 GROUP BY department;
-- ERROR: aggregate functions are not allowed in WHERE
SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 2;

-- 3. window function in WHERE or HAVING: computed in SELECT, after both
SELECT name, RANK() OVER (ORDER BY salary DESC) AS r FROM employees WHERE r <= 3;
-- ERROR: column "r" does not exist   -- wrap it (4.1), or QUALIFY r <= 3 in DuckDB, Snowflake, BigQuery
SELECT * FROM (SELECT name, RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t WHERE r <= 3;

-- 4. ORDER BY an expression that is not in the SELECT list, with DISTINCT
SELECT DISTINCT department FROM employees ORDER BY salary;
-- ERROR: for SELECT DISTINCT, ORDER BY expressions must appear in select list
--   (after DISTINCT collapsed the rows, there is no single salary per department to sort by)`,
      caption: "The alias in ORDER BY works and the alias in WHERE does not, for one reason: ORDER BY runs after SELECT and WHERE runs before. Learn the order once and the error messages stop being arbitrary."
    },

    { t: "callout", kind: "mental", title: "Read a query from FROM", body: [
      { t: "p", text: "To predict a result, read in evaluation order, not in text order: start at FROM, count the rows the joins make, apply WHERE, form the groups, apply HAVING, and only then look at the SELECT list. **A wrong total almost always went wrong at step one or two** — the join produced more rows than you pictured, or WHERE removed rows you wanted kept — and reading SELECT-first hides both." }
    ]},

    { t: "h2", n: "04", text: "DISTINCT, ORDER BY, LIMIT: what each guarantees", id: "tail" },

    { t: "p", text: "The last three stages are where correctness is assumed and not checked. **DISTINCT applies to the entire row**: `SELECT DISTINCT country, tier` keeps every distinct *pair*, and there is no way to make it apply to country alone — that is what GROUP BY or `DISTINCT ON` (2.4) is for. **ORDER BY is stable only for the keys you name**: rows that tie on the sort keys come back in an order the engine chose, and can come back differently next time. **LIMIT without ORDER BY is a sample of whatever the plan produced first.**" },

    { t: "code", lang: "sql", title: "DISTINCT on the whole row, NULL in the sort, and pagination that holds still",
      hl: [1, 10, 22, 27],
      code: `SELECT DISTINCT country, tier FROM customers ORDER BY country, tier;
-- country | tier
-- --------+---------
-- DE      | plus
-- DE      | standard         <- two DE rows: DISTINCT is on the pair, not on country
-- ES      | standard
-- FR      | standard
-- GB      | plus
-- GB      | standard
-- NG      | standard
-- NULL    | plus             <- DISTINCT treats NULL = NULL for this purpose; one NULL row
-- (8 rows)

SELECT name, country FROM customers ORDER BY country NULLS FIRST, name;
-- Dalia NULL, Bruno DE, Mara DE, Iker ES, Fatou FR, Asha GB, Chen GB, Emeka NG
-- Where NULL sorts by default is a dialect fact, not a standard one:
--   PostgreSQL treats NULL as larger  -> last in ASC, FIRST in DESC
--   MySQL, SQLite treat NULL as smaller -> first in ASC, last in DESC
--   DuckDB, SQL Server: NULLS LAST / NULLS FIRST by default respectively
-- Say NULLS FIRST or NULLS LAST and the query means the same thing everywhere.

SELECT order_id FROM orders LIMIT 3;               -- 100, 101, 102 today. No ORDER BY: no promise.

SELECT order_id, placed_at FROM orders
ORDER BY placed_at DESC, order_id DESC              -- the tie-breaker makes every page reproducible
LIMIT 3 OFFSET 3;
-- order_id | placed_at
-- ---------+--------------------
-- 108      | 2025-03-15 13:45:00
-- 107      | 2025-03-03 10:30:00
-- 106      | 2025-02-25 20:05:00
-- (3 rows)

-- PostgreSQL 13+: keep every row that ties with the last one on the page
SELECT name, salary FROM employees ORDER BY salary DESC FETCH FIRST 4 ROWS WITH TIES;
-- Nadia 190000, Oscar 150000, Tomas 131000, Quentin 125000, Rosa 125000   (5 rows -- the tie came along)`,
      caption: "Every page of an OFFSET pagination re-sorts the whole result and skips the first n rows, so page 40 is 40 times the work of page 1 and shifts whenever a row is inserted above it. Keyset pagination (5.4) fixes both; the tie-breaker column is the part people forget in either."
    },

    { t: "table",
      head: ["Clause", "Runs", "Can see", "Cannot see"],
      rows: [
        ["`WHERE`", "2nd", "Columns of every joined table", "SELECT aliases, aggregates, window functions"],
        ["`GROUP BY`", "3rd", "Columns and expressions on them", "Aliases (PostgreSQL allows output-column names here; the standard does not)"],
        ["`HAVING`", "4th", "Grouping columns and aggregates", "Non-grouped columns, window functions"],
        ["`SELECT`", "5th", "Grouping columns, aggregates, window functions", "—"],
        ["`ORDER BY`", "7th", "Aliases, expressions, columns not in the output (unless DISTINCT)", "—"],
        ["`LIMIT`", "8th", "The sorted rows", "Anything to sort by — it needs ORDER BY to mean something"]
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Predict",
      title: "Six queries, six row counts, before running them",
      difficulty: "foundation",
      minutes: 26,
      body: [
        { t: "p", text: "For each query below, write the row count you expect and the reasoning in evaluation order — join count, rows removed by WHERE, groups formed, groups removed — then run it against `shop.sql` and compare. Two of the six have an error in them; say which line fails and why, then fix it." },
        { t: "code", lang: "sql", code: `-- Q1
SELECT o.order_id FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid';
-- Q2
SELECT DISTINCT o.order_id FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid';
-- Q3
SELECT p.category, COUNT(*) AS n FROM products p GROUP BY p.category HAVING n > 1;
-- Q4
SELECT e.department, COUNT(*) FROM employees e WHERE COUNT(*) > 3 GROUP BY e.department;
-- Q5
SELECT c.tier, COUNT(*) AS n FROM customers c GROUP BY c.tier ORDER BY n DESC LIMIT 1;
-- Q6
SELECT DISTINCT e.department FROM employees e ORDER BY e.department DESC LIMIT 2 OFFSET 1;` }
      ],
      requirements: [
        "A predicted row count and a one-line reason per query, written before executing.",
        "The two failing queries identified with the stage at which they fail.",
        "Corrected versions of both, and their row counts."
      ],
      hint: "Q1 and Q2 differ only by DISTINCT — count the line items of the ten paid orders. Q3 uses an alias in HAVING: that works in PostgreSQL only if the alias is an output-column name, and not at all in the standard; assume PostgreSQL. Q4 puts an aggregate where no group exists yet.",
      solution: {
        lang: "sql",
        title: "predictions.sql",
        code: `-- Q1: 17 rows. 12 orders join 19 items -> 19 rows; WHERE keeps paid orders only, removing the
--     one item each of 103 and 107 -> 17. One row per LINE ITEM, not per order.
-- Q2: 10 rows. DISTINCT collapses the 17 item rows to the 10 paid order_ids.
-- Q3: PostgreSQL: ERROR column "n" does not exist -- HAVING runs before SELECT names anything.
--     Fix: HAVING COUNT(*) > 1  -> kitchen (2), office (2): 2 rows. The NULL-category gift card is
--     a group of one (NULL = NULL for grouping) and is removed by HAVING.
-- Q4: ERROR aggregate functions are not allowed in WHERE. Fix: move it to HAVING.
--     engineering has 5, sales has 4, exec has 1 -> HAVING COUNT(*) > 3 keeps 2 rows.
-- Q5: 1 row: standard (5). ORDER BY the alias works because it runs after SELECT.
-- Q6: departments DESC: sales, exec, engineering. OFFSET 1 skips sales; LIMIT 2 -> exec, engineering: 2 rows.

SELECT COUNT(*) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid';   -- 17
SELECT COUNT(DISTINCT o.order_id) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid';   -- 10
SELECT p.category, COUNT(*) AS n FROM products p GROUP BY p.category HAVING COUNT(*) > 1;
-- category | n
-- ---------+--
-- kitchen  | 2
-- office   | 2
SELECT e.department, COUNT(*) FROM employees e GROUP BY e.department HAVING COUNT(*) > 3;
-- engineering 5, sales 4
SELECT c.tier, COUNT(*) AS n FROM customers c GROUP BY c.tier ORDER BY n DESC LIMIT 1;
-- standard | 5
SELECT DISTINCT e.department FROM employees e ORDER BY e.department DESC LIMIT 2 OFFSET 1;
-- exec, engineering`,
        notes: [
          { t: "p", text: "**Q1 against Q2 is the whole lesson in one pair.** The join runs first and produces one row per line item; DISTINCT runs sixth and collapses them. Anyone who predicted 10 for Q1 read the query SELECT-first and pictured 'orders' — the FROM clause says the working set is items." },
          { t: "p", text: "**Q3 and Q4 fail for the same reason from opposite sides**: an alias used before SELECT made it, and an aggregate used before GROUP BY made it. Both fixes are 'move the condition to the stage where its inputs exist'." },
          { t: "p", text: "**Q6 is a reminder that DISTINCT and ORDER BY interact**: the sort is on the distinct output rows, and OFFSET counts sorted distinct rows — so the answer depends on the whole pipeline having run in order." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT name, salary * 12 AS annual FROM employees WHERE annual > 1500000` fails in PostgreSQL. Why?",
          options: [
            "Multiplication is not allowed in SELECT",
            "WHERE is evaluated before SELECT, so the alias `annual` does not exist yet; repeat the expression in WHERE or wrap the query",
            "The alias needs double quotes",
            "salary is an INTEGER"
          ],
          answer: 1,
          why: "The logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. Aliases are created at the SELECT step and are visible to ORDER BY, which runs later — and not to WHERE, which runs earlier."
        }
      ]
    }
  ],

  takeaways: [
    "**The logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT** — and a query means whatever that order produces, however the engine chooses to execute it.",
    "**Read a query from FROM**, counting rows: the join count and the WHERE count are where wrong totals begin.",
    "**WHERE cannot see aliases, aggregates or window functions** because none of them exists yet; HAVING exists because aggregates first exist after GROUP BY.",
    "**ORDER BY can use an alias and WHERE cannot** for one reason: one runs after SELECT, the other before.",
    "**A window function cannot be filtered in its own query** — wrap it, or use QUALIFY where the dialect has it.",
    "**DISTINCT applies to the whole row.** There is no DISTINCT on one column; that job belongs to GROUP BY or DISTINCT ON.",
    "**NULL groups with NULL and de-duplicates with NULL**, but where it sorts by default differs by engine — write NULLS FIRST or NULLS LAST.",
    "**LIMIT without ORDER BY is not a query, it is a sample**; and ORDER BY without a tie-breaker is not reproducible.",
    "**OFFSET pagination re-sorts everything and shifts when rows are inserted**; keyset pagination is the fix, and both need the tie-breaker column.",
    "**The shop dataset is built with the traps in it** — a customer without orders, a cancelled order, NULL keys, a tied salary. Reach for them when a query surprises you."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`SELECT o.order_id FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid'` returns 17 rows though there are 10 paid orders. Why?",
        options: [
          "The WHERE clause is wrong",
          "The join runs first and produces one row per line item; SELECT choosing only order_id does not collapse them — DISTINCT or GROUP BY would",
          "Some orders are duplicated",
          "The engine ignored the join condition"
        ],
        answer: 1,
        why: "FROM/JOIN builds the working set before anything else. Ten paid orders have seventeen line items between them, so the working set has seventeen rows; projecting one column from them leaves seventeen rows."
      },
      {
        stem: "Which clause is the only place a condition on an aggregate can be written?",
        options: [
          "WHERE",
          "HAVING — it is the first stage at which the aggregate exists, because GROUP BY has just computed it",
          "ORDER BY",
          "Any of them"
        ],
        answer: 1,
        why: "Aggregates are computed by GROUP BY. WHERE runs before it and cannot see them; HAVING runs immediately after and filters the groups. SELECT and ORDER BY can use aggregates but do not filter."
      },
      {
        stem: "`SELECT DISTINCT country, tier FROM customers` returns two rows for DE. Is that a bug?",
        options: [
          "Yes — DISTINCT should give one row per country",
          "No — DISTINCT removes rows that are identical across every selected column; the two DE rows differ in tier",
          "Yes — it should be GROUP BY",
          "It depends on the index"
        ],
        answer: 1,
        why: "DISTINCT is a whole-row operation. To get one row per country you either select only country, or group by country and aggregate the tier, or use DISTINCT ON (country) in PostgreSQL."
      },
      {
        stem: "A paginated report shows the same order on page 3 and page 4. The query is `ORDER BY placed_at DESC LIMIT 20 OFFSET 40`. What is the likely cause?",
        options: [
          "A duplicate order",
          "Rows that tie on placed_at have no defined order, so the engine may place them differently on each execution; add a unique tie-breaker such as order_id to ORDER BY",
          "OFFSET is not supported",
          "The index is corrupt"
        ],
        answer: 1,
        why: "ORDER BY only fixes the order of rows that differ on its keys. Two orders placed at the same second can swap between runs, and with OFFSET that swap moves one of them across a page boundary."
      },
      {
        stem: "Where does a NULL country sort with `ORDER BY country` and no NULLS clause?",
        options: [
          "Always first",
          "Always last",
          "It depends on the engine — last in PostgreSQL (NULL is treated as larger), first in MySQL and SQLite — which is why you write NULLS FIRST or NULLS LAST explicitly",
          "NULL rows are dropped by ORDER BY"
        ],
        answer: 2,
        why: "The standard leaves the default to the implementation. Naming it makes the query mean the same thing on every engine, and makes the intent visible to the next reader."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the order of execution of a SQL query, and why does it matter?",
        strong: "Logically: FROM and JOIN build the working set, WHERE filters rows, GROUP BY forms groups, HAVING filters groups, SELECT computes and names the output, DISTINCT removes duplicate rows, ORDER BY sorts, LIMIT trims. The physical plan can reorder for speed but must produce the same result. It matters because it explains the errors — an alias is unavailable in WHERE but available in ORDER BY, an aggregate cannot be in WHERE, a window function cannot be filtered in its own query — and because it is how you predict a result: count the rows after the join, then after WHERE, before you look at the SELECT list.",
        answer: [
          { t: "p", text: "Naming the physical-versus-logical distinction, and using the order to predict rather than to recite, is what makes this a strong answer." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between WHERE and HAVING?",
        strong: "WHERE filters rows before grouping and cannot reference aggregates, because no group exists yet. HAVING filters groups after GROUP BY and is the only place an aggregate condition can go. A non-aggregate condition can be written in either, but belongs in WHERE: it removes rows earlier, so fewer rows are grouped, and the planner can use an index for it. HAVING without GROUP BY treats the whole result as one group.",
        answer: [
          { t: "p", text: "The efficiency point — put non-aggregate filters in WHERE — separates people who know the rule from people who know why." }
        ]
      },
      {
        level: "advanced",
        q: "Why can you not filter on a window function in the same SELECT, and what do you do instead?",
        strong: "Window functions are evaluated at the SELECT step, after WHERE and HAVING have finished, so those clauses cannot reference the result. The portable fix is a derived table or CTE that computes the window value, with the filter in the outer query. DuckDB, Snowflake and BigQuery add QUALIFY, a clause that runs after window evaluation specifically for this. The same reasoning says a window function cannot see the effect of DISTINCT or LIMIT either — it runs over the rows that survived WHERE and grouping, before those two.",
        answer: [
          { t: "p", text: "Placing window functions precisely in the order — after HAVING, before DISTINCT — is the detail interviewers listen for." }
        ]
      }
    ]
  }
});

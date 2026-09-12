/* ============================================================================
   LESSON 4.4 — Reshaping: Pivot and Unpivot
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**A pivot turns the values of one column into column headers; an unpivot turns column headers back into values.** Long is the shape data is stored in — one row per (month, category, amount) — because it survives a new category without a schema change. Wide is the shape people read — one row per month, one column per category — and the shape a model's feature matrix takes. SQL can do both, with one limit that shapes everything: **the columns of a result must be known when the query is written**, so a pivot over an open-ended set of values is a job for the client or for generated SQL.",

  objectives: [
    "Pivot long to wide with conditional aggregation, and with native PIVOT where the engine has one",
    "Unpivot wide to long with UNION ALL, with a VALUES lateral, and with native UNPIVOT",
    "Explain why a pivot's columns must be fixed at parse time, and what to do when they are not",
    "Choose the shape — long in storage, wide for presentation and features — and know what each loses"
  ],

  prerequisites: ["1.4", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Long to wide: one aggregate per column", id: "pivot" },

    { t: "p", text: "The 1.4 pattern is the whole mechanism: **one conditional aggregate per output column, grouped by the row key.** Revenue per month by category is `GROUP BY month` with a `SUM(…) FILTER (WHERE category = 'kitchen')` for each category. It is verbose because it is explicit — every column is named, in order, with its condition — and that explicitness is why it works on every engine, is readable in a code review, and cannot surprise you with an extra column when a new category appears." },

    { t: "code", lang: "sql", title: "Monthly revenue by category, one FILTER per column",
      hl: [2, 3, 4, 5],
      code: `SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month,
       SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'kitchen')  AS kitchen,
       SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'office')   AS office,
       SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'audio')    AS audio,
       SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category IS NULL)      AS uncategorised,
       SUM(oi.qty * oi.unit_price)                                         AS total
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id
WHERE  o.status = 'paid'
GROUP  BY 1 ORDER BY 1;
-- month      | kitchen | office | audio | uncategorised | total
-- 2025-01-01 | 30.00   | 88.00  | 85.00 | NULL          | 203.00
-- 2025-02-01 | 77.00   | 35.90  | 89.00 | 50.00         | 251.90
-- 2025-03-01 | 32.00   | 69.50  | 89.00 | NULL          | 190.50
-- 2025-04-01 | NULL    | 27.50  | NULL  | 25.00         | 52.50
-- the NULLs are months with no sales in that category: COALESCE(…, 0) if the report wants zeros (1.4)
-- MySQL, SQL Server: SUM(CASE WHEN p.category = 'kitchen' THEN oi.qty * oi.unit_price END) -- the same column, spelt with CASE`,
      caption: "The `total` column is the reconciliation check built into the pivot: every row's named columns must sum to it, and every category must have a column or its revenue is silently absent from the wide view. The `IS NULL` branch is there because the gift card has no category — without it, 75.00 would vanish."
    },

    { t: "dl", items: [
      ["Long format", "One row per observation with a key column naming what was measured: `(month, category, revenue)`. Sparse-friendly, schema-stable, the storage shape."],
      ["Wide format", "One row per entity with one column per measure: `(month, kitchen, office, audio)`. The presentation shape, and the feature-matrix shape."],
      ["Pivot", "Long to wide: the distinct values of one column become columns, an aggregate fills the cells. Cells with no data are NULL."],
      ["Unpivot", "Wide to long: each named column becomes a row with the column's name in a key column and its value in a value column."],
      ["Static column list", "SQL's constraint that a query's output columns are determined at parse time. A pivot must name its columns; it cannot discover them from the data."],
      ["Crosstab", "PostgreSQL's pivot, from the `tablefunc` extension: `crosstab(sql, categories_sql)` with the output columns still declared in the call."]
    ]},

    { t: "code", lang: "sql", title: "Native pivots, where they exist — and the column list they still need",
      hl: [2, 8, 15],
      code: `-- DuckDB: PIVOT discovers the values, which is convenient in a notebook and unstable in production
PIVOT (SELECT DATE_TRUNC('month', o.placed_at)::DATE AS month, COALESCE(p.category, 'uncategorised') AS category, oi.qty * oi.unit_price AS amount
       FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'paid')
ON category USING SUM(amount) GROUP BY month ORDER BY month;
-- month      | audio | kitchen | office | uncategorised        <- columns in alphabetical order, one per value found
-- 2025-01-01 | 85.00 | 30.00   | 88.00  | NULL

-- SQL Server, Oracle: PIVOT with the values named in the query
SELECT month, [kitchen], [office], [audio]
FROM   (SELECT month, category, amount FROM monthly_items) src
PIVOT  (SUM(amount) FOR category IN ([kitchen], [office], [audio])) AS pvt;

-- Snowflake: PIVOT (SUM(amount) FOR category IN ('kitchen', 'office', 'audio'))  -- 2023+ also allows IN (ANY ORDER BY category)

-- PostgreSQL: crosstab from tablefunc -- the categories are passed as a query, but the output columns are still declared
SELECT * FROM crosstab(
  $$ SELECT month, category, SUM(amount) FROM monthly_items GROUP BY 1, 2 ORDER BY 1, 2 $$,
  $$ VALUES ('kitchen'), ('office'), ('audio') $$
) AS ct(month DATE, kitchen NUMERIC, office NUMERIC, audio NUMERIC);`,
      caption: "Every native pivot except DuckDB's still makes you name the columns — because a query's result shape is a contract the caller and the planner both rely on. DuckDB's value discovery is the exception, and the reason a dashboard built on it gains a column the day a new category is sold."
    },

    { t: "h2", n: "02", text: "Wide to long: a row per column", id: "unpivot" },

    { t: "p", text: "Unpivoting a wide table means emitting one row per named column, with the column's name as a value. **UNION ALL is the portable form** — one SELECT per column, each tagging its name — and it reads the source table once per column. **A VALUES list in a LATERAL join reads the table once**: for each wide row, a three-row VALUES referencing that row's columns produces the three long rows. Native UNPIVOT in SQL Server, Oracle, DuckDB and Snowflake compiles to the same thing." },

    { t: "code", lang: "sql", title: "Three unpivots of the same wide table",
      hl: [3, 4, 5, 10, 11],
      code: `WITH wide AS ( ... month, kitchen, office, audio -- the pivot above with COALESCE(…, 0) ... )
-- 1. UNION ALL: one branch per column, portable everywhere
SELECT month, 'kitchen' AS category, kitchen AS revenue FROM wide
UNION ALL SELECT month, 'office',  office  FROM wide
UNION ALL SELECT month, 'audio',   audio   FROM wide
ORDER  BY month, category;
-- 2025-01-01 audio 85.00 · 2025-01-01 kitchen 30.00 · 2025-01-01 office 88.00 · ... · 2025-04-01 audio 0.00 · kitchen 0.00 · office 27.50   (12 rows)

-- 2. VALUES in a LATERAL: one pass over wide, three rows out per row in
SELECT w.month, v.category, v.revenue
FROM   wide w
CROSS  JOIN LATERAL (VALUES ('kitchen', w.kitchen), ('office', w.office), ('audio', w.audio)) AS v(category, revenue)
ORDER  BY w.month, v.category;
-- the same 12 rows; PostgreSQL, DuckDB, MySQL 8.0.14+

-- 3. native: SQL Server / Oracle UNPIVOT (revenue FOR category IN (kitchen, office, audio));
--            DuckDB UNPIVOT wide ON kitchen, office, audio INTO NAME category VALUE revenue;
--            BigQuery UNPIVOT(revenue FOR category IN (kitchen, office, audio))`,
      caption: "Unpivoting a wide table that was itself a pivot restores the long form — with one difference: the zeros that COALESCE put into the wide cells are now rows, where the original long table had no row at all. A round trip through wide invents observations of zero."
    },

    { t: "viz",
      title: "Long, wide, and the cells that did not exist",
      caption: "Three long rows for January become one wide row with three named columns and a NULL where no sale occurred. Unpivoting that row back gives four rows — the NULL (or the COALESCEd zero) has become an observation. Long stores what happened; wide stores a grid.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Left: three long rows for January — kitchen 30, office 88, audio 85. Middle: one wide row with columns kitchen, office, audio, uncategorised holding 30, 88, 85 and NULL. Right: four long rows after unpivoting, including uncategorised NULL, marked as invented.">
  <defs>
    <marker id="pv-ah-44" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">long · 3 rows</text><text x="330" y="36">wide · 1 row</text><text x="640" y="36">unpivoted · 4 rows</text>
  </g>
  <g class="s-mono">
    <text x="30" y="70">Jan | kitchen | 30.00</text><text x="30" y="90">Jan | office  | 88.00</text><text x="30" y="110">Jan | audio   | 85.00</text>
  </g>
  <line x1="230" y1="90" x2="320" y2="90" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#pv-ah-44)"/>
  <text x="275" y="80" class="s-sub" text-anchor="middle">pivot</text>
  <g stroke-width="1.2">
    <rect x="330" y="56" width="280" height="60" rx="6" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
  </g>
  <g class="s-mono">
    <text x="342" y="78">kitchen | office | audio | uncat.</text>
    <text x="342" y="102">30.00   | 88.00  | 85.00 | </text>
    <text x="558" y="102" style="fill:var(--crit)">NULL</text>
  </g>
  <line x1="612" y1="90" x2="640" y2="90" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#pv-ah-44)"/>
  <text x="626" y="80" class="s-sub" text-anchor="middle">unpivot</text>
  <g class="s-mono">
    <text x="650" y="70">Jan | kitchen | 30.00</text><text x="650" y="90">Jan | office  | 88.00</text><text x="650" y="110">Jan | audio   | 85.00</text>
    <text x="650" y="130" style="fill:var(--crit)">Jan | uncat.  | NULL   ← invented</text>
  </g>
  <text x="30" y="180" class="s-sub">Long: an absent category is an absent row. Wide: every category has a cell, filled or not. Unpivot: every cell becomes a row, including the ones that were never observations.</text>
  <text x="30" y="204" class="s-sub">Filter them out on the way back (WHERE revenue IS NOT NULL) if the long table should mean 'what happened' rather than 'the grid'.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "When the columns are not known", id: "dynamic" },

    { t: "p", text: "A pivot over 'whatever categories exist' cannot be one static SQL statement, because the statement's columns would depend on the data it reads. The options are honest about that. **Generate the SQL**: query the distinct values, build the FILTER list in Python or a stored procedure, run the generated statement — the columns are fixed at the moment the text is built. **Pivot on the client**: fetch the long form and let `pandas.pivot_table` make the columns, which is what it is for. **Or keep it long and let the presentation layer pivot**, which is what most BI tools do." },

    { t: "code", lang: "sql", title: "A pivot whose column list comes from the data — built, not written",
      code: `-- PostgreSQL: build the statement from the distinct values, then execute it
DO $$
DECLARE cols TEXT; sql TEXT;
BEGIN
  SELECT STRING_AGG(FORMAT('SUM(amount) FILTER (WHERE category = %L) AS %I', category, category), ', ' ORDER BY category)
  INTO   cols FROM (SELECT DISTINCT COALESCE(category, 'uncategorised') AS category FROM products) c;
  sql := FORMAT('CREATE TEMP TABLE monthly_wide AS SELECT month, %s FROM monthly_items GROUP BY month', cols);
  EXECUTE sql;
END $$;
-- %L quotes the value as a literal, %I as an identifier: the two things that make generated SQL injection-proof (7.1)

-- or the same in Python, from the long result
--   long = pd.read_sql("SELECT month, category, revenue FROM monthly_items", con)
--   wide = long.pivot_table(index="month", columns="category", values="revenue", aggfunc="sum", fill_value=0)`,
      caption: "Generated SQL is the database-side answer and must quote identifiers with `%I` (or `quote_ident`) so a category called `office; DROP TABLE` stays a column name. The pandas answer is usually simpler: the pivot is presentation, and presentation belongs near the presenter."
    },

    { t: "table",
      head: ["Need", "Tool", "Columns fixed at", "Notes"],
      rows: [
        ["Wide report with known categories", "Conditional aggregation", "Write time", "Portable; explicit; add a total column to reconcile"],
        ["Wide report, engine has PIVOT", "SQL Server / Oracle / Snowflake PIVOT", "Write time", "Same thing, less typing; values still listed"],
        ["Exploratory wide view", "DuckDB PIVOT", "Run time", "Discovers values; not for a stable contract"],
        ["Wide from an unknown set", "Generated SQL, or pandas pivot_table", "Generation time / client", "Quote identifiers; or keep it long"],
        ["Long from wide", "UNION ALL, VALUES LATERAL, native UNPIVOT", "Write time", "Drop the NULL cells if absence should stay absent"],
        ["Feature matrix for a model", "Pivot in SQL if the feature set is fixed; else pandas", "—", "One row per entity, one column per feature (Data Handling 3.5)"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Store long, present wide", body: [
      { t: "p", text: "A wide table with a column per category needs an ALTER TABLE for every new category and stores a cell for every combination whether or not anything happened. A long table gains a category by gaining a row and stores only observations. **Long is the schema; wide is a view of it** — a pivot in the report query, a `pivot_table` in the notebook, a materialised view (6.6) if the wide form is read constantly. The one wide table worth storing is the feature matrix, and that is built, not maintained." }
    ]},

    { t: "ladder",
      title: "Event counts per customer by type",
      rungs: [
        { level: "bad", label: "A wide events table", code: `CREATE TABLE customer_events (customer_id INT, views INT, carts INT, checkouts INT);
-- every new event type: ALTER TABLE ... ADD COLUMN; every insert: an UPDATE with a CASE per column`,
          note: "**The schema encodes the category list.** A 'refund' event type is a migration; a count per month needs another table; the row is a grid, not a fact." },
        { level: "ok", label: "Long events, pivot with CASE in the report", code: `SELECT customer_id,
       SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) AS views,
       SUM(CASE WHEN event_type = 'cart' THEN 1 ELSE 0 END) AS carts,
       SUM(CASE WHEN event_type = 'checkout' THEN 1 ELSE 0 END) AS checkouts
FROM   events GROUP BY customer_id;`,
          note: "**The storage is long and the report is wide.** Works everywhere; a new event type needs one more line in the report, not a migration." },
        { level: "best", label: "Long events, FILTER pivot with the join that keeps everyone", code: `SELECT c.name,
       COUNT(*) FILTER (WHERE e.event_type = 'view')     AS views,
       COUNT(*) FILTER (WHERE e.event_type = 'cart')     AS carts,
       COUNT(*) FILTER (WHERE e.event_type = 'checkout') AS checkouts
FROM   customers c JOIN events e ON e.customer_id = c.customer_id
GROUP  BY c.name ORDER BY c.name;
-- Asha 3 1 1 · Bruno 2 1 0 · Chen 1 1 1 · Emeka 2 0 1 · Fatou 1 0 0 · Mara 2 1 0`,
          note: "**Explicit columns, zeros not NULLs from COUNT, and one row per customer who has events.** Make it a LEFT JOIN and Dalia and Iker appear with zeros — which is the choice the report should make on purpose." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "There and back",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(1)** Pivot paid revenue to one row per customer with a column per category (including `uncategorised`), zeros for empty cells, a total column, and every customer present — Iker and Mara with zeros. **(2)** Unpivot that result back to long with a VALUES lateral, dropping the zero cells, and verify that it matches the original long aggregation `(customer, category, revenue)` row for row. **(3)** Write the pandas one-liner that would produce (1) from the long result, and say which you would use for a dashboard and which for a feature table." }
      ],
      requirements: [
        "FILTER-based pivot with COALESCE and a LEFT JOIN chain that keeps all eight customers.",
        "VALUES LATERAL unpivot with a WHERE that removes zero cells.",
        "An EXCEPT (2.6) in both directions showing the round trip loses nothing but the invented zeros.",
        "Verified output."
      ],
      hint: "The LEFT JOIN chain must carry `status = 'paid'` in the ON clause (2.2). For the round-trip check, `long_original EXCEPT unpivoted` and `unpivoted EXCEPT long_original` should both be empty once zero cells are dropped.",
      solution: {
        lang: "sql",
        title: "pivot_roundtrip.sql",
        code: `-- (1) wide, every customer, zeros, total
WITH wide AS (
  SELECT c.name,
         COALESCE(SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'kitchen'), 0) AS kitchen,
         COALESCE(SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'office'),  0) AS office,
         COALESCE(SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category = 'audio'),   0) AS audio,
         COALESCE(SUM(oi.qty * oi.unit_price) FILTER (WHERE p.category IS NULL),     0) AS uncategorised,
         COALESCE(SUM(oi.qty * oi.unit_price), 0)                                       AS total
  FROM   customers c
  LEFT   JOIN orders o       ON o.customer_id = c.customer_id AND o.status = 'paid'
  LEFT   JOIN order_items oi ON oi.order_id = o.order_id
  LEFT   JOIN products p     ON p.product_id = oi.product_id
  GROUP  BY c.name
)
SELECT * FROM wide ORDER BY name;
-- name  | kitchen | office | audio | uncategorised | total
-- Asha  | 30.00   | 115.50 | 89.00 | 0.00          | 234.50
-- Bruno | 0.00    | 27.50  | 85.00 | 0.00          | 112.50
-- Chen  | 32.00   | 0.00   | 0.00  | 0.00          | 32.00
-- Dalia | 0.00    | 0.00   | 89.00 | 50.00         | 139.00
-- Emeka | 77.00   | 35.90  | 0.00  | 25.00         | 137.90
-- Fatou | 0.00    | 42.00  | 0.00  | 0.00          | 42.00
-- Iker  | 0.00    | 0.00   | 0.00  | 0.00          | 0.00
-- Mara  | 0.00    | 0.00   | 0.00  | 0.00          | 0.00

-- (2) back to long, zero cells dropped, and the round-trip check
WITH wide AS ( ... as above ... ),
unpivoted AS (
  SELECT w.name, v.category, v.revenue
  FROM   wide w CROSS JOIN LATERAL (VALUES ('kitchen', w.kitchen), ('office', w.office), ('audio', w.audio), ('uncategorised', w.uncategorised)) AS v(category, revenue)
  WHERE  v.revenue <> 0
),
long_original AS (
  SELECT c.name, COALESCE(p.category, 'uncategorised') AS category, SUM(oi.qty * oi.unit_price) AS revenue
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id JOIN customers c ON c.customer_id = o.customer_id
  WHERE  o.status = 'paid' GROUP BY 1, 2
)
SELECT 'missing after round trip' AS check_, * FROM (SELECT * FROM long_original EXCEPT SELECT * FROM unpivoted) x
UNION ALL
SELECT 'invented by round trip', * FROM (SELECT * FROM unpivoted EXCEPT SELECT * FROM long_original) y;
-- (0 rows): the round trip is exact once the zero cells are dropped. Keep them and the second branch returns 20 invented rows.

-- (3) pandas
--   wide = long.pivot_table(index="name", columns="category", values="revenue", aggfunc="sum", fill_value=0)
--   dashboard: the SQL pivot, so the number is computed where the data is and the columns are a contract.
--   feature table: pandas, because the category set will change and the frame is going into a model anyway.`,
        notes: [
          { t: "p", text: "**The LEFT JOIN chain carries `status = 'paid'` in ON** so Iker's cancelled order pairs with nothing and Mara pairs with nothing, and both survive to the GROUP BY with all-zero cells. In WHERE, both would have vanished (2.2)." },
          { t: "p", text: "**The round trip is exact only because zero cells were dropped.** Without the `WHERE v.revenue <> 0`, the unpivot returns 32 rows — 8 customers × 4 categories — of which 20 are cells the long table never had. A wide grid is not the same information as a long table; it is the long table plus a statement about every absence." },
          { t: "p", text: "**Both EXCEPTs are the test**: rows lost and rows invented. A pivot that is used for anything numerical should ship with this check, the same way a join ships with its reconciliation total." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why can a standard SQL query not pivot on 'whatever categories exist in the data'?",
          options: [
            "Because pivots require an extension",
            "Because a query's output columns are fixed when it is parsed, before any data is read; the category list must be written into the query, generated into it, or the pivot done on the client",
            "Because GROUP BY cannot use FILTER",
            "Because categories can be NULL"
          ],
          answer: 1,
          why: "Result shape is a contract the planner and the caller rely on. DuckDB's PIVOT relaxes it for exploration; everywhere else the columns are named in the statement or in the code that generates it."
        }
      ]
    }
  ],

  takeaways: [
    "**A pivot is one conditional aggregate per output column**; a native PIVOT compiles to the same thing.",
    "**Long is the storage shape** — a new category is a new row; **wide is the presentation and feature shape** — a new category is a new column.",
    "**A query's columns are fixed at parse time.** Name them, generate the SQL, or pivot in pandas.",
    "**DuckDB's PIVOT discovers values**; everywhere else the values are listed — and even DuckDB's should not back a dashboard contract.",
    "**Unpivot with UNION ALL (portable), a VALUES lateral (one pass), or native UNPIVOT.**",
    "**A wide grid has a cell for every combination; unpivoting it invents rows for the empty cells** — drop the NULL or zero cells if absence should stay absent.",
    "**Put a total column on every pivot** — the named columns must sum to it, and a category without a column is otherwise silently missing.",
    "**A nullable pivot key needs an `IS NULL` column**, or its rows fall out of the wide view without a trace.",
    "**Generated pivot SQL must quote identifiers** (`%I`, `quote_ident`) — a category name is untrusted input.",
    "**Test a pivot with a round trip**: EXCEPT in both directions between the original long rows and the unpivoted result."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A wide report's category columns sum to less than its total column for March. What does that tell you?",
        options: [
          "A rounding error",
          "Some category present in the data has no column in the pivot — a NULL category or a new value — so its revenue is in the total and in none of the named columns",
          "The total is wrong",
          "A join fanned out"
        ],
        answer: 1,
        why: "The total aggregates every row; the named columns aggregate only the listed values. The gap is exactly the unlisted categories, which is why the total column is the pivot's reconciliation check."
      },
      {
        stem: "Which unpivot reads the wide table only once?",
        options: [
          "UNION ALL with one branch per column",
          "A VALUES list in a CROSS JOIN LATERAL that references the row's columns — one pass, n rows out per row in",
          "A recursive CTE",
          "DISTINCT ON"
        ],
        answer: 1,
        why: "Each UNION ALL branch is a separate scan of the source. The lateral VALUES produces the long rows from each wide row as it streams past."
      },
      {
        stem: "What is wrong with storing customer event counts as a wide table with a column per event type?",
        options: [
          "Nothing; it is faster to read",
          "Every new event type is a schema migration, every cell exists whether or not anything happened, and the grid cannot hold a second dimension such as month without another table — long storage with a pivot in the report avoids all three",
          "Wide tables cannot be indexed",
          "COUNT cannot be used on wide tables"
        ],
        answer: 1,
        why: "Wide encodes the category list in the schema. Long encodes it in the data, where it can change. The wide view is derived on read."
      },
      {
        stem: "An unpivoted result has 32 rows where the original long table had 12. Why?",
        options: [
          "The unpivot duplicated rows",
          "The wide grid had a cell for every (customer, category) pair, filled with zero or NULL where nothing was sold, and each cell became a row; filter out the empty cells to recover the original",
          "The join fanned out",
          "COALESCE created extra rows"
        ],
        answer: 1,
        why: "Pivoting fills the grid; unpivoting turns every cell into an observation. The extra rows are the empty cells. A WHERE on the value column removes them."
      },
      {
        stem: "When generating a pivot statement from the distinct values of a column, why use `FORMAT('%I', value)` for the column alias?",
        options: [
          "For readability",
          "Because the value becomes an identifier in the generated SQL, and %I quotes it safely — a value containing a quote or a keyword would otherwise break the statement or inject into it",
          "It is required by GROUP BY",
          "To lowercase it"
        ],
        answer: 1,
        why: "Data used as SQL text is untrusted input. %L quotes literals and %I quotes identifiers; both are what make generated SQL safe (7.1)."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you pivot rows into columns in SQL?",
        strong: "One conditional aggregate per output column, grouped by the row key — SUM with FILTER, or SUM of a CASE on engines without FILTER — which is what native PIVOT syntax compiles to where it exists. I add a total column so the named columns can be reconciled, an explicit branch for NULL keys so those rows do not vanish, and COALESCE for zeros if the report wants them. The constraint is that the columns must be known when the query is written; if the set of values is open, I either generate the statement from the distinct values with properly quoted identifiers, or fetch the long form and pivot in pandas, which is usually the better home for presentation.",
        answer: [
          { t: "p", text: "The total column and the NULL branch are the two production details; the static-column constraint is the conceptual one." }
        ]
      },
      {
        level: "core",
        q: "Should a table be stored long or wide?",
        strong: "Long. One row per observation with a key column naming what was measured survives a new category without a migration, stores only what happened, and can carry extra dimensions by adding columns rather than multiplying them. Wide is a view: the pivot in the report query, a pivot_table in the notebook, or a materialised view if the wide form is read constantly. The one wide table I would build on purpose is a feature matrix for a model — one row per entity, one column per feature — and that is generated from long sources, not maintained by hand.",
        answer: [
          { t: "p", text: "'Long is the schema, wide is a view of it' is the principle; naming the feature-matrix exception shows it is applied with judgement." }
        ]
      },
      {
        level: "advanced",
        q: "You unpivot a wide table and get more rows than the original long data. Explain and decide what to do.",
        strong: "The wide grid has a cell for every combination of row key and column, whether or not an observation existed; the pivot filled the empty ones with NULL or, if COALESCEd, zero. Unpivoting turns every cell into a row, so the empty cells become rows that were never observations. Whether to keep them depends on what the long table means: if a missing row means 'no sale', dropping the empty cells with a WHERE restores the original exactly, and an EXCEPT in both directions proves it; if the consumer needs a complete grid — a time series model wants explicit zeros — keep them, but then the zeros are a modelling decision made in the reshaping step, and it should be written down there.",
        answer: [
          { t: "p", text: "Recognising that a round trip through wide changes the meaning of absence, and making that an explicit decision, is the whole answer." }
        ]
      }
    ]
  }
});

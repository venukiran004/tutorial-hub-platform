/* ============================================================================
   LESSON 6.6 — DDL, Views, Procedures and Migrations
   ========================================================================= */
EC.receiveLesson({
  id: "6.6",

  lede: "**A schema is code: it is created, versioned, changed and rolled back, and a change made by hand on a Friday is the one nobody can explain on Monday.** This lesson covers the statements that define structure rather than data — CREATE, ALTER, DROP — and the objects built on top of tables: views that name a query, materialised views that store its result, triggers that react to writes, and procedures that package logic. It ends with the discipline that makes schema change safe on a system that cannot stop: migrations, applied in order, and the expand-contract pattern for changing a column that is in use.",

  objectives: [
    "Use CREATE, ALTER and DROP for tables, columns, indexes and constraints, and know which are cheap and which rewrite the table",
    "Create views for naming, security and stability; materialised views for expensive results; and say when each is wrong",
    "Write a trigger for an audit or an invariant, and a stored procedure or function where logic belongs in the database",
    "Run schema changes as ordered, versioned migrations, and change a live column with expand-contract"
  ],

  prerequisites: ["6.4"],

  blocks: [

    { t: "h2", n: "01", text: "DDL: cheap changes and expensive ones", id: "ddl" },

    { t: "code", lang: "sql", title: "The everyday ALTERs (executed on DuckDB and SQLite)",
      hl: [1, 3, 5, 8, 11, 14],
      code: `ALTER TABLE customers ADD COLUMN email TEXT;                          -- cheap: metadata only, NULL for existing rows
ALTER TABLE customers ADD COLUMN first_name TEXT;
ALTER TABLE customers ALTER COLUMN tier SET DEFAULT 'standard';       -- cheap: a default for future rows
ALTER TABLE customers DROP COLUMN email;                              -- cheap in PostgreSQL (hidden, reclaimed later); a rewrite in MySQL < 8
ALTER TABLE orders RENAME COLUMN placed_at TO ordered_at;             -- cheap, but everything that names the column breaks (section 04)

CREATE INDEX orders_customer_idx ON orders (customer_id);             -- expensive: reads the whole table, sorts, writes the index
CREATE INDEX CONCURRENTLY orders_customer_idx ON orders (customer_id);   -- PostgreSQL: no write lock during the build; use in production
DROP INDEX orders_customer_idx;

ALTER TABLE orders ADD CONSTRAINT orders_status_chk CHECK (status IN ('paid', 'cancelled', 'refunded'));   -- scans to validate
ALTER TABLE orders ADD CONSTRAINT orders_status_chk CHECK (...) NOT VALID;   -- PostgreSQL: enforce for new rows now,
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_chk;                    -- validate existing rows later, without a long lock

ALTER TABLE orders ALTER COLUMN order_id TYPE BIGINT;                  -- expensive: rewrites every row and every index; plan it (section 04)`,
      caption: "The rule: adding a nullable column, a default, or dropping a column is metadata; adding an index, a validated constraint, or changing a type touches every row. On a table with a hundred million rows the second group holds a lock for minutes unless you use the CONCURRENTLY / NOT VALID forms."
    },

    { t: "dl", items: [
      ["DDL", "Data definition language: CREATE, ALTER, DROP, TRUNCATE. Changes structure. Transactional in PostgreSQL, SQLite and DuckDB; auto-committing in MySQL and Oracle."],
      ["View", "A named query. `SELECT … FROM view` runs the view's query each time, with the outer query's filters pushed into it where the planner can. Stores nothing."],
      ["Materialised view", "A view whose result is stored as a table and refreshed on demand. Fast to read, stale between refreshes. PostgreSQL `REFRESH MATERIALIZED VIEW [CONCURRENTLY]`; SQLite and DuckDB have none — use a table and a scheduled CREATE TABLE AS."],
      ["Trigger", "A function run automatically BEFORE or AFTER an INSERT, UPDATE or DELETE, per row or per statement, with OLD and NEW rows in scope."],
      ["Stored procedure / function", "Logic stored in the database and called by name. A function returns a value and can be used in queries; a procedure is called with CALL and can control transactions."],
      ["Migration", "A versioned script that moves the schema from version N to N+1, applied in order, recorded in a table so it runs exactly once per database."],
      ["Expand–contract", "Changing a live column in three deploys: add the new shape alongside the old, move readers and writers over, remove the old. Nothing breaks in between."]
    ]},

    { t: "h2", n: "02", text: "Views: naming, hiding, stabilising", id: "views" },

    { t: "code", lang: "sql", title: "A view that names a business concept, and the queries that use it (executed)",
      hl: [1, 2, 3, 6, 10, 11],
      code: `CREATE VIEW paid_orders AS
SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE  o.status = 'paid' GROUP BY o.order_id, o.customer_id, o.placed_at;

SELECT order_id, customer_id, amount FROM paid_orders ORDER BY amount DESC LIMIT 3;
-- 106 | 4 | 139.00      108 | 1 | 116.50      104 | 5 | 85.40

-- the same three uses every view has:
CREATE VIEW live_customers AS SELECT * FROM customers WHERE deleted_at IS NULL;                 -- hide a rule (6.3)
CREATE VIEW customers_public AS SELECT customer_id, name, country, tier FROM customers;         -- hide columns: grant SELECT on the view, not the table
CREATE VIEW orders_v1 AS SELECT order_id, customer_id, ordered_at AS placed_at, status FROM orders;   -- keep an old name alive after a rename`,
      caption: "A view is the one place to write 'paid means status = paid and amount means the sum of the lines'. When the definition changes — refunds partially paid, say — it changes once. The planner inlines a view, so it costs nothing beyond the query it names; a view of a view of a view is where that stops being true."
    },

    { t: "code", lang: "sql", title: "Materialised: stored, indexed, refreshed (PostgreSQL syntax; the DuckDB and SQLite equivalent is a table rebuilt on a schedule)",
      hl: [1, 5, 8, 9],
      code: `CREATE MATERIALIZED VIEW customer_revenue AS
SELECT c.customer_id, c.name, COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
LEFT JOIN order_items oi ON oi.order_id = o.order_id GROUP BY c.customer_id, c.name;
CREATE UNIQUE INDEX customer_revenue_pk ON customer_revenue (customer_id);   -- indexes work: it is a table

SELECT * FROM customer_revenue ORDER BY revenue DESC LIMIT 3;                -- 1 Asha 234.50 / 4 Dalia 139.00 / 5 Emeka 137.90 (executed as a table)
REFRESH MATERIALIZED VIEW customer_revenue;                                  -- recompute; locks readers for the duration
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_revenue;                     -- recompute alongside, swap in; needs the unique index

-- without native support: the summary table from 6.3, refreshed by an upsert in the load, is the same idea with finer control`,
      caption: "A materialised view is the 'summary table' of 5.5 with the definition attached: the database knows how to rebuild it. It is stale between refreshes by design, so it suits reports and dashboards, not the checkout page. The CONCURRENTLY form is the one you want in production."
    },

    { t: "callout", kind: "trap", title: "Views are not a performance feature", body: [
      { t: "p", text: "A plain view runs its query every time; nothing is saved. A common failure is a view with a GROUP BY or DISTINCT that the planner cannot push an outer WHERE through, so `SELECT * FROM big_view WHERE customer_id = 3` aggregates the whole table and then filters (5.5). **If a view is slow, either rewrite it so filters push down, or materialise it.** And a view that selects from another view that selects from a third is a query nobody can EXPLAIN." }
    ]},

    { t: "h2", n: "03", text: "Triggers and procedures", id: "triggers" },

    { t: "code", lang: "sql", title: "An audit trigger that fires only on a real change (executed on SQLite; PostgreSQL uses a trigger function)",
      hl: [2, 3, 4, 7, 8, 9, 10],
      code: `CREATE TABLE customers_audit (audit_id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, old_tier TEXT, new_tier TEXT, changed_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TRIGGER customers_tier_audit AFTER UPDATE OF tier ON customers FOR EACH ROW
WHEN OLD.tier IS NOT NEW.tier
BEGIN INSERT INTO customers_audit (customer_id, old_tier, new_tier) VALUES (OLD.customer_id, OLD.tier, NEW.tier); END;

-- four updates, two of which change a tier:
UPDATE customers SET tier = 'plus' WHERE customer_id = 2;          -- standard -> plus: logged
UPDATE customers SET tier = 'plus' WHERE customer_id = 2;          -- plus -> plus: WHEN is false, not logged
UPDATE customers SET name = 'Bruno M' WHERE customer_id = 2;       -- not a tier update: trigger does not fire
UPDATE customers SET tier = 'standard' WHERE customer_id = 1;      -- plus -> standard: logged
SELECT audit_id, customer_id, old_tier, new_tier FROM customers_audit;
-- 1 | 2 | standard | plus
-- 2 | 1 | plus     | standard

-- PostgreSQL: the body is a function returning trigger, attached with CREATE TRIGGER ... EXECUTE FUNCTION fn()  (6.3 has the full form)`,
      caption: "Triggers are right for two things: audit, because they see every path including the console; and invariants that a constraint cannot express, such as 'a closed order cannot gain items'. They are wrong for business logic — hidden, hard to test, and a surprise to the next person's UPDATE."
    },

    { t: "code", lang: "sql", title: "A function used in queries, a procedure that owns a transaction (PostgreSQL)",
      hl: [1, 2, 6, 9, 10, 15],
      code: `-- a function: reusable expression, callable in any SELECT
CREATE FUNCTION order_amount(p_order_id BIGINT) RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(qty * unit_price), 0) FROM order_items WHERE order_id = p_order_id
$$;
SELECT order_id, order_amount(order_id) FROM orders WHERE status = 'paid';
-- DuckDB's equivalent is a macro:  CREATE MACRO line_total(q, p) AS q * p;   (executed: 100 | 30.00, 100 | 12.00, 101 | 85.00)

-- a procedure: several statements, its own transaction control, called by a job
CREATE PROCEDURE archive_old_orders(p_before DATE, p_batch INT) LANGUAGE plpgsql AS $$
DECLARE moved INT;
BEGIN
  LOOP
    WITH b AS (SELECT order_id FROM orders WHERE placed_at < p_before ORDER BY order_id LIMIT p_batch)
    INSERT INTO orders_archive SELECT o.* FROM orders o JOIN b USING (order_id) ON CONFLICT DO NOTHING;
    DELETE FROM orders WHERE order_id IN (SELECT order_id FROM orders WHERE placed_at < p_before ORDER BY order_id LIMIT p_batch);
    GET DIAGNOSTICS moved = ROW_COUNT;
    COMMIT;                                   -- one transaction per batch (6.1)
    EXIT WHEN moved = 0;
  END LOOP;
END $$;
CALL archive_old_orders(DATE '2024-07-01', 1000);`,
      caption: "Keep functions small and pure — an expression that would otherwise be pasted into twenty queries. Reserve procedures for maintenance jobs that belong next to the data. Application logic in stored procedures is a choice teams regret when they need version control, tests and code review for it."
    },

    { t: "h2", n: "04", text: "Migrations and expand–contract", id: "migrations" },

    { t: "p", text: "A migration is a script that moves the schema from one version to the next, kept in version control beside the code, applied by a tool (Alembic, Flyway, Liquibase, dbmate, Django, Rails) that records which have run in a `schema_migrations` table. **Every environment reaches the same schema by the same path**, and the diff between production and a laptop is a list of unapplied files, not an archaeology project." },

    { t: "code", lang: "sql", title: "Two migrations, and what makes them safe",
      hl: [2, 3, 5, 9, 10, 11],
      code: `-- 0042_add_customer_email.sql
ALTER TABLE customers ADD COLUMN email TEXT;                                    -- nullable: no rewrite, no lock of note
CREATE UNIQUE INDEX CONCURRENTLY customers_email_uq ON customers (email);       -- outside a transaction; PostgreSQL requires it
-- down:
DROP INDEX customers_email_uq; ALTER TABLE customers DROP COLUMN email;

-- 0043_backfill_customer_email.sql          -- data migration, separate from the schema change, batched (5.6)
UPDATE customers SET email = ... WHERE email IS NULL AND customer_id BETWEEN :lo AND :hi;

-- rules: one concern per file; additive first; never rename or drop something the running code still uses;
-- every migration reversible or explicitly marked as not; long operations use CONCURRENTLY / NOT VALID / batches;
-- applied in CI against a copy of production data, so the timing surprise happens before the deploy`,
      caption: "The tool records 0042 and 0043 as applied. A new developer runs 'migrate' and gets the same schema; a rollback runs the down section. The batch backfill is its own file because it can take an hour and should not sit inside the DDL's lock."
    },

    { t: "viz",
      title: "Expand–contract: renaming a column that is in use",
      caption: "Three deploys instead of one rename. At every point, both the old code and the new code work against the schema as it is, so a deploy can be rolled back without a schema change.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three stages left to right: expand adds ordered_at beside placed_at with a trigger keeping them in sync; migrate switches code to read and write ordered_at; contract drops placed_at. A row underneath shows which code versions are compatible at each stage.">
  <defs>
    <marker id="ac-ah-66" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.4">
    <rect x="30" y="40" width="250" height="120" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="315" y="40" width="250" height="120" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="600" y="40" width="250" height="120" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="155" y="64" style="fill:var(--good)">1 · expand</text>
    <text x="440" y="64" style="fill:var(--accent)">2 · migrate</text>
    <text x="725" y="64" style="fill:var(--warn)">3 · contract</text>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="155" y="90">ADD COLUMN ordered_at</text>
    <text x="155" y="110">backfill in batches</text>
    <text x="155" y="130">trigger: keep both in sync</text>
    <text x="440" y="90">deploy code that writes both</text>
    <text x="440" y="110">then code that reads ordered_at</text>
    <text x="440" y="130">verify: no reader of placed_at</text>
    <text x="725" y="90">drop the trigger</text>
    <text x="725" y="110">DROP COLUMN placed_at</text>
    <text x="725" y="130">(or keep a view for stragglers)</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="280" y1="100" x2="315" y2="100" marker-end="url(#ac-ah-66)"/>
    <line x1="565" y1="100" x2="600" y2="100" marker-end="url(#ac-ah-66)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="155" y="190">old code: works · new code: works</text>
    <text x="440" y="190">old code: works · new code: works</text>
    <text x="725" y="190">old code: broken · new code: works</text>
  </g>
  <text x="440" y="225" class="s-sub" text-anchor="middle">each stage is its own deploy, days apart if need be; a rollback at stages 1 and 2 needs no schema change</text>
</svg>`
    },

    { t: "code", lang: "sql", title: "What the rename does without expand–contract (executed on SQLite)",
      hl: [1, 4],
      code: `ALTER TABLE orders RENAME COLUMN placed_at TO ordered_at;
-- SQLite rewrites the view definition to match; PostgreSQL does the same for views it knows about.
-- Application code, dashboards, notebooks and the nightly job are not views: they break at their next run.
SELECT order_id, amount FROM paid_orders ORDER BY order_id LIMIT 1;    -- 100 | 42.00: the view survived. Nothing else did.`,
      caption: "The database can only protect the objects it knows about. A rename is a contract change with every consumer, and expand–contract is how you change a contract with consumers you cannot deploy in the same second."
    },

    { t: "ladder",
      title: "Changing order_id from INTEGER to BIGINT on a large live table",
      rungs: [
        { level: "bad", label: "ALTER COLUMN TYPE in place", code: `ALTER TABLE orders ALTER COLUMN order_id TYPE BIGINT;`,
          note: "**Rewrites the table and every index under an exclusive lock**: an outage of minutes to hours, and every foreign key to it must change in the same statement." },
        { level: "ok", label: "Expand–contract with a new column", code: `ALTER TABLE orders ADD COLUMN order_id_new BIGINT;
-- trigger copies order_id -> order_id_new on write; batch backfill; unique index CONCURRENTLY;
-- swap: ALTER TABLE ... DROP CONSTRAINT orders_pkey, ADD PRIMARY KEY USING INDEX ...; rename columns`,
          note: "**No long lock; each step is small.** The swap is a brief exclusive lock. Foreign keys to the column need the same treatment." },
        { level: "best", label: "The same, planned before the table was large", code: `-- 0001_create_orders.sql
order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
          note: "**BIGINT from the start** costs four bytes per row and saves the migration entirely. The cheapest schema change is the one that was never needed." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Split a name column without downtime",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "`customers.name` holds full names; the product needs `first_name` and `last_name`. The application deploys several times a day and cannot take the table offline. Write the migrations, in order, with the code changes that go between them, so that no deploy breaks the running version and any single deploy can be rolled back. Assume a reasonable split rule and say what happens to names that do not split cleanly." }
      ],
      requirements: [
        "Expand, migrate, contract as separate migrations with the code change between each stated.",
        "A trigger or application dual-write during the overlap.",
        "A batched backfill separate from the DDL.",
        "A rollback path from each stage."
      ],
      hint: "Add the two columns nullable. Dual-write. Backfill in batches with a split rule and a fallback. Switch readers. Then, and only then, drop `name` — or keep it, generated from the two.",
      solution: {
        lang: "sql",
        title: "migrations/",
        code: `-- 0051_expand_customer_name.sql              (deploy 1: schema only; old code untouched)
ALTER TABLE customers ADD COLUMN first_name TEXT, ADD COLUMN last_name TEXT;      -- nullable: metadata only
CREATE FUNCTION customers_split_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.first_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.first_name := split_part(NEW.name, ' ', 1);
    NEW.last_name  := NULLIF(substr(NEW.name, length(split_part(NEW.name, ' ', 1)) + 2), '');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER customers_split_name BEFORE INSERT OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION customers_split_name();
-- down: DROP TRIGGER; DROP FUNCTION; DROP COLUMN first_name, DROP COLUMN last_name

-- 0052_backfill_customer_name.sql            (data, batched, re-runnable)
UPDATE customers SET name = name                       -- fires the trigger; only rows not yet split
WHERE first_name IS NULL AND customer_id BETWEEN :lo AND :hi;
-- single-word names: last_name stays NULL; names with three parts: everything after the first word is last_name.
-- both are recorded in the migration notes and surfaced in a report for support to correct.

-- deploy 2: application writes first_name and last_name explicitly (and still name, for the old code path);
--           reads switch to first_name / last_name with COALESCE(first_name, name) during the overlap
-- verify:   SELECT COUNT(*) FROM customers WHERE first_name IS NULL;   -- 0
--           no query in logs references customers.name for a full deploy cycle

-- 0053_contract_customer_name.sql            (deploy 3: after the verification above)
DROP TRIGGER customers_split_name ON customers; DROP FUNCTION customers_split_name();
ALTER TABLE customers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE customers DROP COLUMN name;
CREATE VIEW customers_legacy AS SELECT *, concat_ws(' ', first_name, last_name) AS name FROM customers;   -- for stragglers
-- down: ADD COLUMN name TEXT; UPDATE customers SET name = concat_ws(' ', first_name, last_name); (the reverse trigger if the overlap must reopen)`,
        notes: [
          { t: "p", text: "**Stage 1 is invisible to the running code**: two nullable columns and a trigger that fills them from `name`. Old code keeps writing `name` and the trigger keeps the new columns correct, so the backfill and the dual-write are the same mechanism." },
          { t: "p", text: "**The backfill is a separate, batched, re-runnable file** because it touches every row and may take an hour; the DDL took milliseconds. `WHERE first_name IS NULL` is what makes re-running it safe (6.1)." },
          { t: "p", text: "**Contract only after evidence** — a zero count and a quiet log — and even then a legacy view catches the notebook nobody knew about. The split rule's failure cases are recorded, not hidden: a migration that silently mangles names is worse than one that flags them." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why is renaming a column on a live table done in three deploys rather than one ALTER?",
          options: [
            "ALTER RENAME is slow",
            "Because code that names the old column is running and cannot be redeployed in the same instant; expand–contract keeps both names valid until every consumer has moved, so each deploy is compatible with the one before it",
            "Views would break",
            "It is a PostgreSQL limitation"
          ],
          answer: 1,
          why: "The rename itself is instant. The problem is the contract with every consumer, and the database only knows about the ones inside it."
        }
      ]
    }
  ],

  takeaways: [
    "**Adding a nullable column, a default, or dropping a column is metadata**; indexes, validated constraints and type changes rewrite or scan the table — use CONCURRENTLY, NOT VALID and batches.",
    "**A view names a query**: for business definitions, column hiding and stability across renames. It stores nothing and is not a performance feature.",
    "**A materialised view stores the result**; refresh CONCURRENTLY with a unique index; stale between refreshes by design.",
    "**Triggers for audit and for invariants constraints cannot express**; not for business logic.",
    "**Functions for reusable expressions; procedures for maintenance jobs**; application logic belongs in the application.",
    "**Migrations are versioned scripts applied in order and recorded**; one concern per file, additive first, reversible, tested against production-sized data.",
    "**Expand–contract for any change to something in use**: add alongside, move consumers, remove — each a separate deploy.",
    "**Data migrations are separate from schema migrations**, batched and re-runnable.",
    "**The database protects only the objects it knows**; a rename breaks every consumer outside it at their next run.",
    "**BIGINT from the start**: the cheapest migration is the one never needed."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which of these ALTERs rewrites the table in PostgreSQL?",
        options: [
          "ADD COLUMN email TEXT (nullable, no default)",
          "ALTER COLUMN order_id TYPE BIGINT — every row and every index is rewritten under an exclusive lock",
          "DROP COLUMN",
          "ALTER COLUMN SET DEFAULT"
        ],
        answer: 1,
        why: "Type changes and most volatile defaults on old versions rewrite; the others are catalogue changes. Plan the rewrite with expand–contract, or avoid it by choosing the type at creation."
      },
      {
        stem: "A view with a GROUP BY is queried with a WHERE on a column of the outer query and is slow. Why?",
        options: [
          "Views are always slow",
          "The planner could not push the filter beneath the aggregation, so the view computes the full aggregate and filters afterwards; rewrite so the filter can be pushed down or materialise the view",
          "The view has no index",
          "GROUP BY is not allowed in views"
        ],
        answer: 1,
        why: "A view is inlined; whether the outer filter reaches the base tables depends on the view's shape. This is the aggregate-then-filter trap from 5.5 wearing a view."
      },
      {
        stem: "What is `REFRESH MATERIALIZED VIEW CONCURRENTLY` for, and what does it require?",
        options: [
          "Faster refresh; nothing",
          "Refreshing without blocking readers — the new result is built alongside and swapped in by diff; it requires a unique index on the materialised view",
          "Automatic refresh on every write",
          "Refreshing several views at once"
        ],
        answer: 1,
        why: "The plain REFRESH locks the view against reads for its duration; CONCURRENTLY needs the unique index to compute which rows changed."
      },
      {
        stem: "When is a trigger the right tool?",
        options: [
          "For all business logic",
          "For an audit log that must capture every path including manual changes, and for invariants a constraint cannot express — kept small, and documented, because they are invisible to the code that fires them",
          "For sending emails",
          "Never"
        ],
        answer: 1,
        why: "Triggers see everything and are seen by nothing — ideal for audit, dangerous for logic that someone will later need to find, test and change."
      },
      {
        stem: "Why keep data backfills in a separate migration from the schema change?",
        options: [
          "Tools require it",
          "The DDL is milliseconds and the backfill may be hours; separating them keeps the schema change's lock short, lets the backfill run in batches and be re-run, and lets it fail without leaving the schema half-applied",
          "Backfills cannot be rolled back",
          "So the backfill can run in autocommit"
        ],
        answer: 1,
        why: "A backfill inside a DDL transaction holds the DDL's lock for the backfill's duration and turns a re-runnable job into an all-or-nothing one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use a view, and when a materialised view?",
        strong: "A view when I want a name for a query — a business definition like paid_orders, a column-restricted surface to grant access on, or a stable interface over a table being restructured. It costs nothing to store and is inlined into each query; the risk is a shape the planner cannot push filters through. A materialised view when the query is expensive and staleness is acceptable — a dashboard aggregate refreshed hourly — because it stores the result, can be indexed, and is refreshed concurrently without blocking readers if it has a unique index. If the engine lacks them, a summary table maintained by the load is the same thing with more control.",
        answer: [
          { t: "p", text: "The push-down caveat and the unique-index requirement are the operational details interviewers listen for." }
        ]
      },
      {
        level: "core",
        q: "Why migrations rather than running ALTER statements by hand?",
        strong: "Because the schema is part of the code and needs the same properties: versioned, reviewed, reproducible, reversible. A migration tool applies numbered scripts in order and records them, so every environment — laptop, CI, staging, production — reaches the same schema by the same path, and 'what is different about production' is answerable. The scripts are reviewed like code, tested in CI against production-sized data so lock surprises happen before the deploy, and each has a down path or an explicit note that it does not. A hand-run ALTER is a change nobody can reconstruct.",
        answer: [
          { t: "p", text: "Versioned, ordered, recorded, reversible, tested — the five words that make it code." }
        ]
      },
      {
        level: "advanced",
        q: "How do you rename a column on a table used by services you cannot deploy simultaneously?",
        strong: "Expand–contract. First, add the new column alongside the old, with a trigger or dual-write that keeps them in sync, and backfill in batches — the old code is unaffected. Second, deploy code that writes both and reads the new column; once every service is on that version and the logs show no reads of the old name, the old column is unused. Third, drop the old column, keeping a view under the old name if there might be stragglers. Each deploy is compatible with the previous schema and the previous code, so any single step can be rolled back without a schema change. The same pattern handles type changes, table splits and moving a column between tables; the only thing that changes is what 'keep them in sync' means.",
        answer: [
          { t: "p", text: "Three stages, the compatibility invariant at each, and the generalisation to other changes — complete." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 13.2 — Schema Design and Constraints
   ========================================================================= */
EC.receiveLesson({
  id: "13.2",

  lede: "Application code is rewritten every few years. **The schema outlives it, and so does the data inside it.** Every constraint you decline to add is a rule that must instead be remembered by every service, script and console session that ever touches the table — which is why bad data always arrives through the path nobody thought about.",

  objectives: [
    "Choose types that make a wrong value impossible to store",
    "Decide between a natural, surrogate and composite primary key",
    "Normalise until it helps, and denormalise deliberately after that",
    "Use constraints as the enforcement layer application code cannot bypass",
    "Index for the queries you have, not the ones you imagine"
  ],

  prerequisites: ["13.1"],

  blocks: [

    { t: "h2", n: "01", text: "Types are the first constraint", id: "types" },

    { t: "table",
      head: ["Instead of", "Use", "Because"],
      rows: [
        ["`FLOAT` for money", "`NUMERIC(12, 2)`", "**0.1 + 0.2 ≠ 0.3.** Floats lose pennies, and reconciliation finds them"],
        ["`VARCHAR(255)` everywhere", "`TEXT` with a `CHECK`", "255 is a MySQL artefact; state the real limit or none"],
        ["`TIMESTAMP`", "`TIMESTAMPTZ`", "Without a zone, a value is meaningless outside the machine that wrote it"],
        ["`VARCHAR` for a status", "An `ENUM` or a `CHECK`", "A typo becomes a row nobody queries again"],
        ["`INTEGER` id", "`BIGINT` or `UUID`", "**2.1 billion arrives**, and the migration is worse than the storage"],
        ["`VARCHAR` for JSON", "`JSONB`", "Indexable, queryable, and validated as JSON on write"],
        ["A `NULL`-able boolean", "`NOT NULL DEFAULT false`", "Three states where you meant two"]
      ],
      caption: "**`TIMESTAMPTZ` is the one people get wrong most often.** PostgreSQL stores it as UTC and converts on read; a plain `TIMESTAMP` stores whatever wall-clock string arrived, so the same value means different instants depending on who wrote it."
    },

    { t: "code", lang: "sql", title: "a table that defends itself", code: `
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NOT NULL on everything that is genuinely required. A nullable
    -- column is a promise that the application handles the NULL case,
    -- and that promise is kept about half the time.
    account_id      UUID        NOT NULL REFERENCES accounts(id),
    reference       TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending',

    subtotal        NUMERIC(12,2) NOT NULL,
    tax             NUMERIC(12,2) NOT NULL,
    total           NUMERIC(12,2) NOT NULL,
    currency        CHAR(3)     NOT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at    TIMESTAMPTZ,          -- genuinely optional

    -- The rules, in the one place nothing can route around.
    CONSTRAINT orders_status_valid
        CHECK (status IN ('pending','paid','shipped','cancelled')),
    CONSTRAINT orders_amounts_non_negative
        CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0),
    CONSTRAINT orders_total_is_consistent
        CHECK (total = subtotal + tax),
    CONSTRAINT orders_currency_is_iso
        CHECK (currency ~ '^[A-Z]{3}$'),
    -- A cancelled order has a cancellation time, and only a cancelled
    -- one does. Two states that must agree, enforced together.
    CONSTRAINT orders_cancellation_is_coherent
        CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),

    UNIQUE (account_id, reference)        -- unique PER ACCOUNT
);
`,
      hl: [21, 25, 29, 33],
      caption: "**`orders_total_is_consistent` is the interesting one.** It makes a whole class of rounding and currency bug impossible to persist — the insert fails at the moment of the mistake rather than surfacing in a finance report three weeks later."
    },

    { t: "callout", kind: "insight", title: "Constraints are the only rule that cannot be bypassed", body: [
      { t: "p", text: "Application validation runs in the application. The database is also written to by migrations, admin consoles, data-fixing scripts, the analytics team's ETL, a second service that shares the database, and a colleague at 2am with `psql` open." },
      { t: "p", text: "**Every one of those paths skips your Pydantic model.** A `CHECK` constraint is the only rule all of them obey." },
      { t: "p", text: "**Validate in both places anyway.** Pydantic gives a good error message to a user; the constraint guarantees the invariant. They are not redundant — they have different jobs, and a constraint violation reaching the user is a bug in the application layer, not a substitute for it." }
    ]},

    { t: "h2", n: "02", text: "Keys", id: "keys" },

    { t: "table",
      head: ["Key", "Example", "Trade-off"],
      rows: [
        ["Auto-increment `BIGINT`", "`1, 2, 3`", "Compact, index-friendly. **Leaks volume**, and needs a round trip to know it"],
        ["`UUID` v4", "random", "Generated anywhere, leaks nothing. **Random insert order fragments the index**"],
        ["`UUID` v7", "time-ordered", "**Usually the best default** — UUID benefits with sequential locality"],
        ["Natural key", "`email`, `isbn`", "No extra column. **Natural keys change**, and then so does every reference"],
        ["Composite", "`(order_id, line_no)`", "Models the relationship honestly. Awkward in ORMs and in URLs"]
      ],
      caption: "**`/orders/1234` tells a competitor how many orders you have.** Requesting `/orders/1233` tells them whether they can read it. Sequential public identifiers are an information leak and an enumeration surface at once."
    },

    { t: "callout", kind: "trap", title: "The natural key that changes", body: [
      { t: "code", lang: "sql", title: "why email is not a primary key", numbered: false, code: `
-- Looks reasonable. Emails are unique, after all.
CREATE TABLE users (
    email    TEXT PRIMARY KEY,
    name     TEXT NOT NULL
);
CREATE TABLE orders (
    user_email TEXT REFERENCES users(email)     -- the key propagates
);

-- Then someone changes their email address. Now you must:
--   - update every referencing row, in every table
--   - handle the fact that ON UPDATE CASCADE locks all of them
--   - explain why order history is keyed to an address they no longer
--     control, in every backup and every exported report
--
-- And re-registration: the address is freed, someone else takes it,
-- and they inherit the old user's order history.

-- The fix: a surrogate primary key, and a UNIQUE constraint on the
-- natural one. The identity is stable; the attribute can change.
CREATE TABLE users (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email  CITEXT NOT NULL UNIQUE,        -- case-insensitive
    name   TEXT NOT NULL
);`},
      { t: "p", text: "**The rule: a primary key identifies a row, it does not describe it.** Anything a user can change is a description, and descriptions change more often than anyone predicts." },
      { t: "p", text: "**`CITEXT` matters for email.** `Alice@example.com` and `alice@example.com` are the same mailbox, and a plain `UNIQUE` on `TEXT` lets both register — which becomes a support ticket about a password that will not work." }
    ]},

    { t: "h2", n: "03", text: "Normalise, then stop", id: "normalisation" },

    { t: "ladder",
      title: "Storing an order's line items",
      rungs: [
        { level: "bad", label: "Repeat everything on the order",
          why: "One row per order forces a fixed number of items, and every product name is duplicated per order. Renaming a product means updating a million rows, and asking \"how many of product X sold?\" means parsing columns.",
          code: `CREATE TABLE orders (
    id             UUID PRIMARY KEY,
    item_1_name    TEXT,
    item_1_price   NUMERIC,
    item_2_name    TEXT,
    item_2_price   NUMERIC,
    item_3_name    TEXT,       -- and what about the fourth?
    item_3_price   NUMERIC
);` },
        { level: "ok", label: "A child table, fully normalised",
          why: "Correct, flexible, and the right default. One subtlety remains: joining to `products` for the name returns today's name, not the name at the time of sale — so a reprinted invoice from last year shows a product that has since been renamed.",
          code: `CREATE TABLE order_items (
    id          UUID PRIMARY KEY,
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0)
);
-- Price and name come from products via a join.` },
        { level: "best", label: "Normalised, with deliberate historical copies",
          why: "An invoice is a record of what happened, not a live view. Copying the name and price at the time of sale is not duplication — the current product row and the historical line item are genuinely different facts that happen to have been equal once.",
          code: `CREATE TABLE order_items (
    id            UUID PRIMARY KEY,
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(id),

    -- A POINT-IN-TIME COPY, not a cache. The product's price will
    -- change; this order's price must not.
    product_name  TEXT          NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity      INTEGER       NOT NULL CHECK (quantity > 0),

    -- Generated: always correct, never stale, no application code.
    line_total    NUMERIC(12,2)
        GENERATED ALWAYS AS (unit_price * quantity) STORED,

    UNIQUE (order_id, product_id)     -- one line per product per order
);`,
          note: "**The test for acceptable duplication: would updating the source be wrong?** If yes, it is history, not a cache — and history belongs in its own column." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When to denormalise", body: [
      { t: "table",
        head: ["Situation", "Verdict"],
        rows: [
          ["Historical values — price, name, address at time of sale", "**Not denormalisation.** A different fact"],
          ["A counter you can recompute, read constantly", "Denormalise, with a trigger or a job"],
          ["A join that is slow", "**Fix the index first.** Almost always enough"],
          ["Reporting across many tables", "A materialised view, refreshed on a schedule"],
          ["\"It might be faster\"", "No. Measure, then decide"]
        ]
      },
      { t: "p", text: "**Denormalised data drifts.** A cached `order_count` on `customers` is correct until one code path inserts an order without updating it — and there will be one, because the correctness now depends on every writer remembering." },
      { t: "p", text: "**If you denormalise, make the database maintain it.** A trigger or a generated column cannot be forgotten; application code can. And keep a reconciliation job that compares the cached value with the computed one, because triggers get dropped during migrations." }
    ]},

    { t: "h2", n: "04", text: "Referential integrity", id: "fks" },

    { t: "code", lang: "sql", title: "the delete behaviour is a design decision", code: `
-- CASCADE: the child cannot exist without the parent. Deleting an
-- order deletes its lines, which is correct -- a line item alone is
-- meaningless.
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE

-- RESTRICT: refuse the delete. Correct when the reference means the
-- parent is still in use -- you must not delete a product that appears
-- on an invoice.
product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT

-- SET NULL: the child survives, having lost an optional association.
-- An order whose salesperson left is still an order.
sales_rep_id UUID REFERENCES users(id) ON DELETE SET NULL

-- No action declared -- the default, and equivalent to RESTRICT except
-- that the check is deferred to the end of the statement. Fine, but
-- state your intent explicitly.
customer_id UUID NOT NULL REFERENCES customers(id)
`,
      hl: [5, 10, 14],
      caption: "**`CASCADE` on the wrong relationship is a data-loss incident.** Deleting a customer should not silently delete their orders — those are financial records, and the correct answer is `RESTRICT` plus a soft delete on the customer."
    },

    { t: "callout", kind: "trap", title: "An unindexed foreign key", body: [
      { t: "p", text: "PostgreSQL indexes the primary key automatically. **It does not index the foreign key column on the child table**, and almost every query you write joins in that direction." },
      { t: "code", lang: "sql", title: "two costs, one missing index", numbered: false, code: `
CREATE TABLE order_items (
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
);
-- No index on order_id. Consequences:
--
--   1. SELECT * FROM order_items WHERE order_id = ? scans the table.
--      The single most common query against it.
--
--   2. DELETE FROM orders WHERE id = ? must check every child row for
--      the cascade -- a full scan of order_items PER DELETED ORDER,
--      while holding locks. This is the one that causes an incident:
--      a routine cleanup job takes the table down.

CREATE INDEX CONCURRENTLY order_items_order_id_idx
    ON order_items (order_id);`},
      { t: "p", text: "**The query that finds them all:** join `pg_constraint` for foreign keys and check each against `pg_index`. Run it once and you will usually find several — it is the most common indexing omission in a schema that otherwise looks careful." }
    ]},

    { t: "h2", n: "05", text: "Indexes, briefly", id: "indexes" },

    { t: "code", lang: "sql", title: "the four rules worth knowing now", code: `
-- 1. COLUMN ORDER IN A COMPOSITE INDEX IS NOT ARBITRARY.
CREATE INDEX ON orders (account_id, created_at);
--   serves:  WHERE account_id = ?
--            WHERE account_id = ? AND created_at > ?
--            WHERE account_id = ? ORDER BY created_at
--   does NOT serve: WHERE created_at > ?     (no leading column)
--
-- Equality columns first, then the range column. A range predicate
-- stops the index being usable for anything after it.

-- 2. A PARTIAL INDEX FOR A SKEWED QUERY.
CREATE INDEX ON orders (created_at) WHERE status = 'pending';
-- If 2% of orders are pending, this index is 2% of the size and stays
-- in memory. The dashboard that only ever looks at pending orders
-- gets a much faster index for much less write cost.

-- 3. A UNIQUE INDEX IS A CONSTRAINT.
CREATE UNIQUE INDEX ON accounts (lower(email));
-- Enforces case-insensitive uniqueness that application code cannot
-- race past -- two concurrent registrations, one wins.

-- 4. EVERY INDEX COSTS WRITES.
-- Each INSERT, UPDATE and DELETE maintains every index on the table.
-- Six indexes means six B-trees updated per write. Drop the ones
-- pg_stat_user_indexes shows as unused; they are pure cost.
`,
      hl: [2, 12, 18],
      caption: "**The leading-column rule is the one that catches people.** An index on `(account_id, created_at)` does nothing for a query filtering only on `created_at` — the index is sorted by account first, so there is no contiguous range to scan."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Repair a schema in production",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This schema has been live for two years. Support has reported: duplicate accounts for the same person, invoices that do not add up, orders showing the wrong product names after a rename, and a cleanup job that once locked the database for six minutes." },
        { t: "code", lang: "sql", numbered: false, title: "schema.sql", code: `
CREATE TABLE users (
    email       VARCHAR(255) PRIMARY KEY,
    name        VARCHAR(255),
    created     TIMESTAMP,
    is_active   VARCHAR(10)
);

CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    status      VARCHAR(50),
    total       FLOAT,
    created     TIMESTAMP
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER REFERENCES products(id),
    quantity    INTEGER
);`},
        { t: "p", text: "Find every problem, connect each reported symptom to its cause, and give a migration plan that does not require downtime." }
      ],
      requirements: [
        "Map each of the four support reports to the schema flaw causing it.",
        "Find at least six more problems the reports have not surfaced yet.",
        "Write the corrected schema.",
        "Give the migration order — some steps depend on others.",
        "Explain why fixing `total FLOAT` is harder than changing the type.",
        "Identify the missing index behind the six-minute lock."
      ],
      hint: "For the six-minute lock, ask what `ON DELETE CASCADE` has to do when it cannot find the child rows quickly. For the product names, ask where the name is stored.",
      solution: {
        lang: "sql",
        title: "migration.sql",
        code: `-- ========================================================================
-- THE FOUR REPORTS, TRACED
-- ========================================================================
--
-- "Duplicate accounts for the same person"
--   VARCHAR PRIMARY KEY on email is case-SENSITIVE. Alice@example.com
--   and alice@example.com are the same mailbox and two rows. The user
--   registers twice, cannot log in with the password they set on the
--   other one, and support creates a third.
--
-- "Invoices that do not add up"
--   total FLOAT. Binary floating point cannot represent 0.1 exactly,
--   so summing line items accumulates error. 19.99 + 0.01 is not 20.
--   Also: nothing constrains total to equal the sum of its lines, so
--   an application bug persists an inconsistent invoice permanently.
--
-- "Wrong product names after a rename"
--   order_items stores only product_id. The name comes from a join to
--   products, which returns TODAY'S name. Reprint an invoice from
--   last year and it shows a product that has since been renamed --
--   or deleted, at which point the line is nameless.
--
-- "Cleanup job locked the database for six minutes"
--   order_items.order_id has NO INDEX. ON DELETE CASCADE must find
--   the children of each deleted order, so it performs a FULL SCAN of
--   order_items PER DELETED ORDER, holding locks throughout. Deleting
--   a thousand old orders is a thousand full scans. THE MISSING INDEX
--   IS order_items(order_id).
--
--
-- ========================================================================
-- SIX MORE, NOT YET REPORTED
-- ========================================================================
--
-- 5.  is_active VARCHAR(10). Currently holds 'true', 'True', 'yes',
--     '1' and NULL. Every query filtering on it is wrong for some
--     subset of rows, silently.
--
-- 6.  TIMESTAMP, not TIMESTAMPTZ. The stored value has no zone, so
--     the same row means different instants depending on which
--     server's clock wrote it. This breaks the moment there is a
--     second region, or a daylight-saving boundary.
--
-- 7.  SERIAL primary keys, exposed in URLs. /orders/1234 tells a
--     competitor the order volume and lets anyone enumerate. SERIAL
--     is also INTEGER -- 2.1 billion, then an outage.
--
-- 8.  status VARCHAR(50) with no constraint. 'shipped', 'Shipped',
--     'SHIPPED' and 'shiped' all coexist. Every dashboard is wrong
--     and nobody can tell by how much.
--
-- 9.  ON DELETE CASCADE from users to orders. Deleting a user
--     silently deletes their financial records -- which is both a
--     data-loss bug and, in most jurisdictions, an audit failure.
--
-- 10. NULLABLE EVERYTHING. name, created, status, total, quantity and
--     user_email all accept NULL. An order with no total and no user
--     is storable, and something has stored one.
--
-- Also: no unit_price on order_items (so the line total is
-- unreconstructable), no CHECK (quantity > 0) -- negative quantities
-- are storable and produce negative invoices -- and VARCHAR(255)
-- everywhere, which is a MySQL artefact meaning nothing in Postgres.


-- ========================================================================
-- THE CORRECTED SCHEMA
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- CITEXT: case-insensitive comparison at the type level, so the
    -- UNIQUE constraint actually means one account per mailbox.
    email       CITEXT      NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,           -- soft delete, replacing CASCADE

    CONSTRAINT users_email_looks_valid CHECK (email ~ '^[^@\\s]+@[^@\\s]+$')
);

CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT, not CASCADE. Orders are financial records; deleting a
    -- user must fail rather than erase them. Use users.deleted_at.
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reference   TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending',
    subtotal    NUMERIC(12,2) NOT NULL,
    tax         NUMERIC(12,2) NOT NULL,
    total       NUMERIC(12,2) NOT NULL,
    currency    CHAR(3)     NOT NULL DEFAULT 'GBP',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT orders_status_valid
        CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
    CONSTRAINT orders_amounts_non_negative
        CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0),
    -- The constraint that makes report 2 impossible to reproduce.
    CONSTRAINT orders_total_is_consistent
        CHECK (total = subtotal + tax),
    UNIQUE (user_id, reference)
);

CREATE TABLE order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

    -- POINT-IN-TIME COPIES. This is report 3's fix, and it is not
    -- denormalisation: the name on a two-year-old invoice and the
    -- product's current name are different facts.
    product_name  TEXT          NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity      INTEGER       NOT NULL CHECK (quantity > 0),
    line_total    NUMERIC(12,2)
        GENERATED ALWAYS AS (unit_price * quantity) STORED,

    UNIQUE (order_id, product_id)
);

-- The index behind report 4. Every foreign key on the CHILD side
-- needs one; Postgres creates it only for primary keys.
CREATE INDEX CONCURRENTLY order_items_order_id_idx  ON order_items (order_id);
CREATE INDEX CONCURRENTLY order_items_product_id_idx ON order_items (product_id);
CREATE INDEX CONCURRENTLY orders_user_id_idx         ON orders (user_id);

-- Equality first, range second: serves both "this user's orders" and
-- "this user's orders since a date", and supplies the sort order.
CREATE INDEX CONCURRENTLY orders_user_created_idx
    ON orders (user_id, created_at DESC);

-- Partial: pending orders are a small fraction, and the operations
-- dashboard queries nothing else.
CREATE INDEX CONCURRENTLY orders_pending_idx
    ON orders (created_at) WHERE status = 'pending';


-- ========================================================================
-- WHY total FLOAT IS THE HARD ONE
-- ========================================================================
--
-- Changing the TYPE is one line:
--
--     ALTER TABLE orders ALTER COLUMN total TYPE NUMERIC(12,2);
--
-- The difficulty is that THE STORED DATA IS ALREADY WRONG. A float of
-- 19.989999999999998 was meant to be 19.99, and casting it rounds to
-- 19.99 -- probably correct. But a value that accumulated error over
-- many additions may be off by more than a rounding step, and there
-- is no way to distinguish "was 19.99, stored imprecisely" from "is
-- genuinely 19.98" by looking at the column.
--
-- So the type change is the easy half and the data audit is the real
-- work:
--
--   a) change the type, so no NEW error is introduced
--   b) recompute each order's total from its line items and compare
--   c) for every row that disagrees, decide -- with finance, not
--      engineering -- whether to correct it, and whether corrections
--      require re-issued invoices
--   d) only THEN add CHECK (total = subtotal + tax), because adding
--      it while bad rows exist fails the migration
--
-- This ordering generalises: a constraint cannot be added until the
-- existing data satisfies it, so every constraint on a live table is
-- a data-cleaning project first.


-- ========================================================================
-- THE MIGRATION, IN ORDER
-- ========================================================================

-- ---- PHASE 1: additive only. Nothing breaks, no locks held. --------

-- 1a. The missing indexes FIRST. They make later phases fast, and
--     they immediately fix the cleanup-job lock.
CREATE INDEX CONCURRENTLY order_items_order_id_idx ON order_items (order_id);

-- 1b. New columns, nullable for now.
ALTER TABLE users  ADD COLUMN id UUID DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN user_id UUID;
ALTER TABLE order_items
    ADD COLUMN product_name TEXT,
    ADD COLUMN unit_price   NUMERIC(12,2);

-- 1c. Backfill in BATCHES. One UPDATE over millions of rows holds
--     locks and bloats the table; a loop of 10k with a pause does not.
--     UPDATE order_items SET product_name = p.name, unit_price = p.price
--     FROM products p WHERE p.id = product_id AND id BETWEEN ? AND ?;
--
--     Note the honest limitation: for HISTORICAL rows the current
--     price is the best available approximation, and it is not the
--     price actually charged. Record that in the migration notes --
--     future analysis must know these values are reconstructed, not
--     original. This is the cost of the original omission and it
--     cannot be recovered.

-- 1d. is_active: add the boolean, map every observed string form.
ALTER TABLE users ADD COLUMN is_active_bool BOOLEAN;
UPDATE users SET is_active_bool =
    CASE lower(coalesce(is_active, 'true'))
         WHEN 'true' THEN true WHEN 'yes' THEN true WHEN '1' THEN true
         ELSE false END;
-- Check the distinct values BEFORE writing this CASE. There is always
-- one nobody remembers.

-- ---- PHASE 2: dual-write. Deploy code writing both shapes. ---------
--     Old readers still work; new readers use the new columns.

-- ---- PHASE 3: enforce. Only once the data is clean. ---------------

-- NOT VALID adds the constraint for NEW rows without scanning the
-- table -- no long lock. VALIDATE then checks existing rows while
-- holding only a SHARE UPDATE EXCLUSIVE lock, which does not block
-- reads or writes. This two-step is the whole technique for adding a
-- constraint to a live table.
ALTER TABLE orders ADD CONSTRAINT orders_status_valid
    CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))
    NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_valid;

-- Same for NOT NULL, via a CHECK: SET NOT NULL takes a full table
-- scan under an exclusive lock, but a validated CHECK (x IS NOT NULL)
-- lets Postgres 12+ set NOT NULL without rescanning.
ALTER TABLE orders ADD CONSTRAINT orders_user_id_not_null
    CHECK (user_id IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_user_id_not_null;
ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;

-- ---- PHASE 4: swap the keys, then drop the old columns. -----------
--     A separate deploy, after phase 3 has been stable long enough to
--     roll back to. Dropping a column is the one irreversible step.


-- ========================================================================
-- TESTS
-- ========================================================================
--
-- def test_case_differing_emails_are_one_account(db):
--     """Report 1."""
--     db.execute(insert_user(email="Alice@example.com"))
--     with pytest.raises(IntegrityError):
--         db.execute(insert_user(email="alice@example.com"))
--
--
-- def test_an_inconsistent_total_cannot_be_stored(db):
--     """Report 2. The constraint makes it unreachable."""
--     with pytest.raises(IntegrityError, match="total_is_consistent"):
--         db.execute(insert_order(subtotal=100, tax=20, total=115))
--
--
-- def test_renaming_a_product_does_not_change_past_invoices(db):
--     """Report 3."""
--     order = seed_order(product_name="Widget", unit_price=Decimal("9.99"))
--     rename_product(order.items[0].product_id, "Widget Pro")
--
--     assert reload(order).items[0].product_name == "Widget"
--
--
-- def test_deleting_a_user_with_orders_is_refused(db):
--     """Finding 9. RESTRICT, not CASCADE."""
--     user = seed_user_with_orders()
--     with pytest.raises(IntegrityError):
--         db.execute(delete(User).where(User.id == user.id))
--
--
-- def test_every_foreign_key_has_an_index(db):
--     """Finding 4, generalised into a permanent guard. Run this in CI
--     and the class of bug cannot come back."""
--     unindexed = db.execute(text("""
--         SELECT c.conrelid::regclass AS tbl, a.attname AS col
--         FROM   pg_constraint c
--         JOIN   unnest(c.conkey) AS k(attnum) ON true
--         JOIN   pg_attribute a
--                ON a.attrelid = c.conrelid AND a.attnum = k.attnum
--         WHERE  c.contype = 'f'
--           AND  NOT EXISTS (
--                SELECT 1 FROM pg_index i
--                WHERE i.indrelid = c.conrelid
--                  AND a.attnum = i.indkey[0])
--     """)).all()
--
--     assert unindexed == [], f"unindexed foreign keys: {unindexed}"`,
        notes: [
          { t: "p", text: "**The six-minute lock is the missing index on `order_items(order_id)`.** `ON DELETE CASCADE` must locate the children of each deleted order, and with no index that is a full scan of the child table per deleted parent — a thousand deleted orders is a thousand full scans, with locks held throughout." },
          { t: "p", text: "**PostgreSQL indexes primary keys automatically and foreign keys never.** Almost every join goes parent-to-child, so the missing index is on the side you query most. The CI test at the bottom turns this from a thing you remember into a thing you cannot ship." },
          { t: "callout", kind: "insight", title: "NOT VALID then VALIDATE is the whole technique", body: [
            { t: "p", text: "Adding a `CHECK` to a live table normally scans it under an `ACCESS EXCLUSIVE` lock — an outage on a large table. `NOT VALID` applies the constraint to new rows only and takes a brief lock; `VALIDATE CONSTRAINT` then checks the existing rows under a `SHARE UPDATE EXCLUSIVE` lock, which blocks neither reads nor writes." },
            { t: "p", text: "The same two-step gets you `NOT NULL` without a rescan on PostgreSQL 12 and later: add a validated `CHECK (x IS NOT NULL)`, then `SET NOT NULL`, and the planner uses the existing proof." }
          ]},
          { t: "p", text: "**The `FLOAT` fix is a data-cleaning project, not a type change.** Casting stops new error, but the stored values already contain accumulated drift, and no column inspection distinguishes \"was 19.99, stored badly\" from \"is genuinely 19.98\". The constraint cannot be added until finance has ruled on the discrepancies." },
          { t: "p", text: "**The backfilled `unit_price` is honestly approximate**, and saying so in the migration notes matters more than it looks. Anyone analysing historical margins later will otherwise treat reconstructed values as recorded ones — and the original omission is not recoverable, only documentable." },
          { t: "p", text: "**`ON DELETE CASCADE` from users to orders is the finding with legal weight.** Deleting a user erases financial records that most jurisdictions require retaining, so the right shape is `RESTRICT` plus `deleted_at` — the user disappears from the application and the records remain." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team stored order status as a free-text column, validated only in the application. It worked for eighteen months." },
      { t: "p", text: "**Then a data-fixing script written during an incident inserted `Shipped` instead of `shipped`.** Two hundred orders were invisible to the fulfilment query, which filtered on the lowercase value, and nobody noticed until customers began asking where their parcels were." },
      { t: "p", text: "**The application validation was never wrong.** It simply was not in the path — the script connected with `psql` and wrote directly, as data-fixing scripts do. A four-word `CHECK` constraint would have rejected the insert at the moment of the mistake." },
      { t: "p", text: "**The general shape: every rule not in the schema is a rule enforced only on the paths you remembered.** There are always more paths than you remembered, and the ones you forgot are the ones used under pressure." }
    ]}
  ],

  takeaways: [
    "**Use `NUMERIC` for money, never `FLOAT`.** Binary floating point cannot represent 0.1, and the error accumulates into reconciliation failures.",
    "**Use `TIMESTAMPTZ`, not `TIMESTAMP`.** A value without a zone means different instants depending on which machine wrote it.",
    "**A primary key identifies a row; it does not describe it.** Anything a user can change — an email, a username — is an attribute with a `UNIQUE` constraint, not a key.",
    "**Use `CITEXT` or a `UNIQUE` index on `lower(email)`**, or the same mailbox registers twice and the second login fails.",
    "**Constraints are the only rules migrations, admin consoles and 2am scripts obey.** Application validation covers the paths you remembered.",
    "**Validate in both places.** Pydantic gives a good error message; the constraint guarantees the invariant. They have different jobs.",
    "**A copied value is history, not duplication, if updating the source would be wrong** — a product name on a two-year-old invoice is a different fact from the current one.",
    "**Make the database maintain any denormalised value** with a generated column or a trigger, and reconcile it on a schedule.",
    "**`ON DELETE CASCADE` on a financial record is data loss.** Use `RESTRICT` plus a soft delete.",
    "**Index every foreign key on the child side.** PostgreSQL indexes primary keys automatically and foreign keys never — and an unindexed one makes `CASCADE` a full scan per deleted parent.",
    "**In a composite index, equality columns come before the range column**, and the index is useless for a query that does not filter on the leading column.",
    "**Add constraints with `NOT VALID`, then `VALIDATE CONSTRAINT`** — the two-step avoids the exclusive lock that a direct add takes.",
    "**A constraint cannot be added until the existing data satisfies it**, so every constraint on a live table is a data-cleaning project first."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A cleanup job deleting old orders locked the database for six minutes. `order_items.order_id` has a foreign key with `ON DELETE CASCADE`. What is the cause?",
        options: [
          "`CASCADE` always takes a table lock",
          "There is no index on `order_items(order_id)`, so the cascade full-scans the child table once per deleted parent while holding locks",
          "Too many rows were deleted in one transaction",
          "The foreign key should have been `RESTRICT`"
        ],
        answer: 1,
        why: "PostgreSQL creates an index for the primary key automatically and never for the referencing column. The cascade must find each parent's children, so with no index that is a sequential scan per delete. It is the most common indexing omission in an otherwise careful schema, and a query over `pg_constraint` finds all of them in one go."
      },
      {
        stem: "Why is `email` a poor primary key even though emails are unique?",
        options: [
          "Emails are too long to index",
          "A key identifies a row, and an email is an attribute a user can change — so every referencing row must be updated, and a re-registered address inherits the old user's history",
          "Uniqueness is not guaranteed across providers",
          "Text keys cannot be foreign keys"
        ],
        answer: 1,
        why: "Natural keys change, and the change propagates to every table referencing them. A surrogate key with a `UNIQUE` constraint on the email gives stable identity and enforced uniqueness together. Case sensitivity is the second problem — a plain `TEXT` unique index lets the same mailbox register twice."
      },
      {
        stem: "You add `CHECK (total = subtotal + tax)` to a live 50-million-row table. What happens, and what should you do instead?",
        options: [
          "It applies instantly to new rows only",
          "It scans the whole table under an exclusive lock — use `NOT VALID` to apply it to new rows, then `VALIDATE CONSTRAINT` to check existing ones without blocking",
          "It is rejected because the table is too large",
          "It applies only after a `VACUUM`"
        ],
        answer: 1,
        why: "A direct add takes `ACCESS EXCLUSIVE` for the duration of the scan, which is an outage. The two-step takes only a brief lock and then validates under `SHARE UPDATE EXCLUSIVE`, blocking neither reads nor writes. And the constraint cannot be added at all until existing rows satisfy it — so the data audit comes first."
      },
      {
        stem: "`order_items` stores only `product_id`, and invoices reprinted after a rename show the wrong name. What is the fix?",
        options: [
          "Prevent products from being renamed",
          "Store `product_name` and `unit_price` on the line item as point-in-time copies — the historical value and the current one are different facts",
          "Cache the product table in the application",
          "Add a version column to products"
        ],
        answer: 1,
        why: "This is the case where copying is not denormalisation. The test is whether updating the source would be wrong: renaming a product should not alter a past invoice, so the invoice's name is history rather than a stale cache of the current name."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why put constraints in the database when the application already validates?",
        strong: "Because the application is not the only writer. Migrations, admin tools, ETL jobs, a second service and someone with `psql` open at 2am all bypass it. A constraint is the only rule every path obeys.",
        answer: [
          { t: "p", text: "Naming the specific bypass paths is what makes this convincing — \"defence in depth\" alone sounds like a slogan." },
          { t: "p", text: "Saying that both layers are needed, with different jobs, avoids the trap of sounding like you would drop application validation." },
          { t: "p", text: "The incident shape — a data-fixing script inserting a wrong-case status that a `CHECK` would have refused — is worth having ready." }
        ]
      },
      {
        level: "advanced",
        q: "When would you denormalise?",
        strong: "Rarely, and never before fixing the index. The exception that is not really denormalisation is historical values — a price or name at the time of sale is a different fact from the current one, and copying it is correct.",
        answer: [
          { t: "p", text: "Distinguishing history from caching is the point that separates a considered answer from a repeated rule of thumb." },
          { t: "p", text: "The drift argument is the practical case against: a cached counter is correct until one writer forgets, and there is always one writer." },
          { t: "p", text: "If you do denormalise, saying the database should maintain it — generated column or trigger, plus a reconciliation job — shows you have lived with one." }
        ]
      },
      {
        level: "advanced",
        q: "How do you add a NOT NULL column to a large live table?",
        strong: "Add it nullable, backfill in batches, add a `CHECK (x IS NOT NULL) NOT VALID`, validate it, then `SET NOT NULL` — which PostgreSQL 12 and later can do without rescanning because the validated check already proves it.",
        answer: [
          { t: "p", text: "The batched backfill matters as much as the constraint dance: a single `UPDATE` over millions of rows holds locks and bloats the table." },
          { t: "p", text: "Knowing that a direct `SET NOT NULL` takes an exclusive scan is the detail that distinguishes someone who has done this on a live system." },
          { t: "p", text: "Mentioning that a default on an added column is cheap in modern PostgreSQL but was a full rewrite before version 11 shows you know which advice is dated." }
        ]
      }
    ]
  }
});

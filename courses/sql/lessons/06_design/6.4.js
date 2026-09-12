/* ============================================================================
   LESSON 6.4 — Keys, Constraints and Normal Forms
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**A schema is a set of promises about the data, and a constraint is a promise the database keeps for you.** Every rule you leave to the application — 'status is one of three values', 'an order belongs to a real customer', 'a price is not negative' — will eventually be broken by a path you did not write: a migration script, a support tool, a colleague's notebook. This lesson executes each constraint kind and watches it refuse, then covers the design rules — the normal forms — that decide which table a fact belongs in so that it is stored once and cannot disagree with itself.",

  objectives: [
    "Declare PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL and CHECK constraints and predict which insert each refuses",
    "Choose between natural and surrogate keys, and explain what a foreign key's ON DELETE action should be",
    "Recognise update, insert and delete anomalies in an unnormalised table and fix them by decomposition",
    "State 1NF, 2NF, 3NF and BCNF in one sentence each, and say when denormalising is the right decision"
  ],

  prerequisites: ["6.3"],

  blocks: [

    { t: "h2", n: "01", text: "Five constraints, five refusals", id: "constraints" },

    { t: "code", lang: "sql", title: "A properly constrained orders table, and six inserts that fail against it (executed on DuckDB)",
      hl: [2, 3, 5, 6, 7, 11, 12, 13, 14, 15],
      code: `CREATE TABLE orders2 (
  order_id     INTEGER PRIMARY KEY,                                          -- unique and not null; the row's identity
  customer_id  INTEGER NOT NULL REFERENCES customers (customer_id),          -- must exist in customers
  placed_at    TIMESTAMP NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('paid', 'cancelled', 'refunded')),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  external_ref TEXT UNIQUE                                                   -- unique when present; NULLs allowed, and several of them
);

INSERT INTO orders2 VALUES (1, 1, TIMESTAMP '2025-07-01 09:00:00', 'paid', 10.00, 'A1');       -- ok
INSERT INTO orders2 VALUES (2, 1, TIMESTAMP '2025-07-01 09:00:00', 'shipped', 10.00, 'A2');    -- CHECK failed: status IN (...)
INSERT INTO orders2 VALUES (3, 1, TIMESTAMP '2025-07-01 09:00:00', 'paid', -5.00, 'A3');       -- CHECK failed: amount >= 0
INSERT INTO orders2 VALUES (4, 99, TIMESTAMP '2025-07-01 09:00:00', 'paid', 5.00, 'A4');       -- FOREIGN KEY: customer_id 99 does not exist
INSERT INTO orders2 VALUES (5, 1, TIMESTAMP '2025-07-01 09:00:00', 'paid', 5.00, 'A1');        -- UNIQUE: duplicate external_ref A1
INSERT INTO orders2 VALUES (6, 1, NULL, 'paid', 5.00, 'A6');                                   -- NOT NULL: placed_at
INSERT INTO orders2 VALUES (7, 1, TIMESTAMP '2025-07-01 09:00:00', 'paid', 5.00, NULL);        -- ok: NULL is not a duplicate
INSERT INTO orders2 VALUES (8, 1, TIMESTAMP '2025-07-01 09:00:00', 'paid', 5.00, NULL);        -- ok: two NULLs are distinct
SELECT COUNT(*) FROM orders2;                                                                   -- 3`,
      caption: "Three rows survived of eight. Every refusal is a bug that did not enter the database; each would otherwise have been found weeks later by a report that did not add up. Note the two NULL external_refs: UNIQUE treats NULLs as distinct in PostgreSQL, SQLite, DuckDB and MySQL — SQL Server does not, and PostgreSQL 15 added `NULLS NOT DISTINCT` to opt in."
    },

    { t: "dl", items: [
      ["`PRIMARY KEY`", "The column or columns that identify a row: implies UNIQUE and NOT NULL, and creates an index. Every table should have one, even if it is a surrogate."],
      ["`FOREIGN KEY … REFERENCES`", "The value must exist in the referenced table's primary or unique key. The engine also refuses to delete or change the referenced row while references exist — unless an ON DELETE action says otherwise."],
      ["`UNIQUE`", "No two rows share the value; NULLs are usually exempt. Creates an index, which is why lookups on unique columns are fast for free. The conflict target for upserts (6.3)."],
      ["`CHECK`", "A boolean expression over the row's own columns that must be true or NULL. Enumerations, ranges, cross-column rules like `ends_at > starts_at`."],
      ["`NOT NULL`", "The cheapest and most valuable constraint: a column that can be NULL will be, and every query on it will need COALESCE and IS NULL branches (1.3)."],
      ["Surrogate key", "An identity with no business meaning — a serial or UUID — used as the primary key so that business identifiers can change without cascading updates."],
      ["Natural key", "A business identifier that is inherently unique: an ISBN, a country code, an order number from an external system. Enforce it with UNIQUE even when the primary key is a surrogate."]
    ]},

    { t: "h2", n: "02", text: "Keys: what to choose and what to cascade", id: "keys" },

    { t: "code", lang: "sql", title: "Surrogate primary, natural unique, and foreign keys with deliberate delete actions",
      hl: [2, 4, 8, 9, 13],
      code: `CREATE TABLE customers (
  customer_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    -- surrogate: PostgreSQL identity; SERIAL is the older spelling
  email        TEXT NOT NULL,
  CONSTRAINT customers_email_uq UNIQUE (email)                     -- natural key enforced alongside
);
CREATE TABLE orders (
  order_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customers ON DELETE RESTRICT,    -- a customer with orders cannot be deleted
  ...
);
CREATE TABLE order_items (
  order_id     BIGINT NOT NULL REFERENCES orders   ON DELETE CASCADE,      -- items are owned by the order: they go with it
  product_id   BIGINT NOT NULL REFERENCES products ON DELETE RESTRICT,     -- a product in any order cannot be deleted
  qty          INTEGER NOT NULL CHECK (qty > 0),
  unit_price   NUMERIC(8,2) NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, product_id)                                       -- composite natural key: one line per product per order
);
-- executed on DuckDB: INSERT INTO tickets (title) VALUES ('first'), ('second') RETURNING ticket_id, title  ->  1 | first, 2 | second`,
      caption: "The rule for ON DELETE: CASCADE along ownership (items belong to an order), RESTRICT along reference (an order refers to a product). SET NULL is for optional references that should survive the parent's removal — a ticket's `assigned_to` when the employee leaves."
    },

    { t: "table",
      head: ["Key choice", "For", "Against", "Verdict"],
      rows: [
        ["Surrogate (identity / serial)", "Small, stable, opaque; business identifiers can change; joins are cheap integer compares", "Meaningless on its own; needs a UNIQUE on the natural key or duplicates creep in", "**Default for entities.** Always pair with UNIQUE on the natural identifier"],
        ["UUID", "Generated anywhere without coordination; safe to expose; merges across systems", "16 bytes; random UUIDs scatter inserts across the index (UUIDv7 is time-ordered and fixes this)", "Distributed systems and public identifiers; prefer v7"],
        ["Natural key", "Self-describing; no extra column; no lookup to find the id", "Changes are cascading updates; composite ones are wide; external systems reuse and recycle them", "Lookup tables (country codes, currencies) and true composites (order_id, product_id)"],
        ["Composite", "Expresses 'one row per pair' exactly; the index doubles as the uniqueness rule", "Every child table must carry all columns", "Association tables and line items"]
      ]
    },

    { t: "h2", n: "03", text: "Anomalies and normal forms", id: "normal" },

    { t: "p", text: "Here is an orders table as it arrives from a spreadsheet: one row per order, with the customer's details repeated and the products packed into a comma-separated string. It stores every fact, and it is wrong in three predictable ways." },

    { t: "table",
      head: ["order_id", "customer_name", "customer_country", "products", "qtys"],
      rows: [
        ["100", "Asha", "GB", "Kettle, Notebook", "1, 3"],
        ["102", "Asha", "UK", "Desk lamp, Notebook", "2, 5"]
      ]
    },

    { t: "code", lang: "sql", title: "The anomalies made visible (executed)",
      hl: [2, 6, 7],
      code: `-- update anomaly: Asha's country is stored twice and already disagrees
SELECT customer_name, COUNT(DISTINCT customer_country) AS spellings FROM orders_flat GROUP BY customer_name;
-- Asha | 2

-- insert anomaly: a customer with no orders cannot be stored at all (there is no row to put them in)
-- delete anomaly: deleting Asha's two orders deletes the only record that Asha exists
-- and 1NF: "Kettle, Notebook" is two facts in one cell; to count kettles you must split a string
SELECT order_id, TRIM(UNNEST(string_split(products, ','))) AS product, TRIM(UNNEST(string_split(qtys, ','))) AS qty FROM orders_flat;
-- 100 | Kettle | 1     100 | Notebook | 3     102 | Desk lamp | 2     102 | Notebook | 5`,
      caption: "Normalisation is the discipline of putting each fact in exactly one place so these three anomalies cannot occur. The shop schema from 1.1 is this table normalised: customers, orders, products, order_items."
    },

    { t: "table",
      head: ["Form", "Rule, in one sentence", "Violation in the flat table", "Fix"],
      rows: [
        ["1NF", "Every cell holds one atomic value; no repeating groups or lists", "`products = 'Kettle, Notebook'`", "One row per order line: `order_items`"],
        ["2NF", "Every non-key column depends on the whole key, not part of it", "In `(order_id, product) → customer_name`, the customer depends on `order_id` alone", "Customer columns move to `orders`, then to `customers`"],
        ["3NF", "Every non-key column depends on the key, and on nothing else that is not the key", "`customer_country` depends on `customer_name`, not on the order", "`customers (customer_id, name, country)`; orders carry only `customer_id`"],
        ["BCNF", "Every determinant is a candidate key — 3NF with the edge cases closed", "Rare in practice: arises when two overlapping candidate keys exist", "Split so that each functional dependency's left side is a key"]
      ]
    },

    { t: "viz",
      title: "From one flat table to four",
      caption: "Each arrow is a fact moving to the table whose key determines it. The country is stored once; a customer with no orders is a row; deleting orders deletes only orders.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A wide flat table on the left decomposes into customers, orders, products and order_items on the right, with arrows showing which columns move where.">
  <defs>
    <marker id="ac-ah-64" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <rect x="30" y="50" width="250" height="150" rx="8" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit)" stroke-width="1.2"/>
  <text x="155" y="76" class="s-label" text-anchor="middle" style="font-weight:600">orders_flat</text>
  <g class="s-mono">
    <text x="50" y="102">order_id</text>
    <text x="50" y="122">customer_name, customer_country</text>
    <text x="50" y="142">products  "Kettle, Notebook"</text>
    <text x="50" y="162">qtys      "1, 3"</text>
  </g>
  <text x="155" y="190" class="s-sub" text-anchor="middle">one row per order · facts repeated · lists in cells</text>
  <g stroke-width="1.2">
    <rect x="560" y="20" width="290" height="44" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="560" y="78" width="290" height="44" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="560" y="136" width="290" height="44" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="560" y="194" width="290" height="44" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
  </g>
  <g class="s-mono">
    <text x="575" y="47">customers (customer_id, name, country)</text>
    <text x="575" y="105">orders (order_id, customer_id, placed_at)</text>
    <text x="575" y="163">products (product_id, name, unit_price)</text>
    <text x="575" y="221">order_items (order_id, product_id, qty)</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <path d="M280,118 C400,118 440,42 560,42" marker-end="url(#ac-ah-64)"/>
    <path d="M280,98 C400,98 440,100 560,100" marker-end="url(#ac-ah-64)"/>
    <path d="M280,138 C400,138 440,158 560,158" marker-end="url(#ac-ah-64)"/>
    <path d="M280,158 C400,158 440,216 560,216" marker-end="url(#ac-ah-64)"/>
  </g>
  <text x="420" y="240" class="s-sub" text-anchor="middle">3NF: every column depends on its table's key, the whole key, and nothing but the key</text>
</svg>`
    },

    { t: "h2", n: "04", text: "When to denormalise", id: "denorm" },

    { t: "p", text: "Normalisation optimises for writes: one fact, one place, no disagreement. Reads pay for it in joins. **Denormalising — copying a fact to where it is read — is the right call when the read is hot, the join is expensive, and the copy is maintained by the database or by a single, transactional write path.** `order_items.unit_price` in the shop schema is a deliberate copy: it is the price at the time of sale, which the product's current price is not, so it is not really a duplicate at all. `customer_stats` from 6.3 is a true denormalisation, kept honest by an upsert that runs in the same transaction as the load." },

    { t: "table",
      head: ["Copy", "Legitimate?", "Why"],
      rows: [
        ["`order_items.unit_price`", "Yes — not a copy", "The price at sale time is a different fact from the product's current price"],
        ["`orders.customer_country`", "Usually no", "The customer's country is one fact; two places will disagree, as the flat table already did"],
        ["`customer_stats.revenue`", "Yes, with a maintained refresh", "A hot aggregate over a large table; kept correct by a transactional upsert or a materialised view (6.6)"],
        ["`events.booked` counter (6.2)", "Yes", "Serialises the capacity rule through one row, and is updated in the same transaction as the booking"],
        ["A star schema's fact table (6.5)", "Yes, by design", "Analytics trades write simplicity for read speed on purpose"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Constraints cost writes and save everything else", body: [
      { t: "p", text: "Every constraint is a check per write, and a foreign key is an index lookup per insert and per delete of the parent. A table loaded at a million rows an hour feels that. **The trade is almost always worth it**, because a constraint violation caught at write time costs one error message and the same violation found at read time costs a data-quality investigation. Where the load is the bottleneck, validate in staging and load with constraints deferred or checked once at the end (`ALTER TABLE … VALIDATE CONSTRAINT`), rather than dropping them." }
    ]},

    { t: "ladder",
      title: "A status column",
      rungs: [
        { level: "bad", label: "Free text", code: `status TEXT`,
          note: "**'paid', 'Paid', 'PAID ', 'payed'.** Every query grows a LOWER(TRIM()) and still misses the typo." },
        { level: "ok", label: "Constrained text", code: `status TEXT NOT NULL CHECK (status IN ('paid', 'cancelled', 'refunded'))`,
          note: "**Only the three values can enter.** Adding a fourth is an ALTER of the check; readable in every tool." },
        { level: "best", label: "A lookup table when statuses have attributes", code: `status_code TEXT NOT NULL REFERENCES order_statuses (code)
-- order_statuses (code PRIMARY KEY, label, is_terminal, sort_order)`,
          note: "**When a status carries data of its own** — a display label, whether it is terminal, its order — it is an entity, and an entity is a table. For three bare values, the CHECK is enough." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Design",
      title: "Normalise the course roster",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A spreadsheet has one row per enrolment: `(student_email, student_name, course_code, course_title, instructor_name, instructor_email, term, grade)`. Instructors teach many courses, a course has one instructor per term, and a student may take a course in several terms. Identify the functional dependencies, name the anomalies, and write the 3NF schema with all constraints. Then say which single denormalisation you would consider and why." }
      ],
      requirements: [
        "List the functional dependencies you inferred.",
        "Four or five tables with primary keys, foreign keys with ON DELETE actions, and CHECKs where a rule is stated.",
        "The enrolment table's key must prevent a duplicate enrolment for the same student, course and term.",
        "One considered denormalisation with its maintenance rule."
      ],
      hint: "student_email → student_name. course_code → course_title. instructor_email → instructor_name. (course_code, term) → instructor. (student, course, term) → grade.",
      solution: {
        lang: "sql",
        title: "roster_3nf.sql",
        code: `-- dependencies:
--   student_email -> student_name                       (a student)
--   course_code   -> course_title                       (a course)
--   instructor_email -> instructor_name                 (an instructor)
--   (course_code, term) -> instructor_email             (an offering: who teaches this course this term)
--   (student_email, course_code, term) -> grade         (an enrolment)
-- anomalies in the flat sheet: renaming an instructor touches every enrolment row (update); a course with no
-- students this term cannot be recorded with its instructor (insert); dropping the last student loses the offering (delete)

CREATE TABLE students (
  student_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL
);
CREATE TABLE instructors (
  instructor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL
);
CREATE TABLE courses (
  course_code  TEXT PRIMARY KEY,                                   -- natural key: stable, short, business-visible
  title        TEXT NOT NULL
);
CREATE TABLE offerings (
  offering_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_code   TEXT   NOT NULL REFERENCES courses     ON DELETE RESTRICT,
  term          TEXT   NOT NULL CHECK (term ~ '^[0-9]{4}-(S1|S2)$'),
  instructor_id BIGINT NOT NULL REFERENCES instructors ON DELETE RESTRICT,
  UNIQUE (course_code, term)                                        -- one instructor per course per term
);
CREATE TABLE enrolments (
  student_id   BIGINT NOT NULL REFERENCES students  ON DELETE RESTRICT,
  offering_id  BIGINT NOT NULL REFERENCES offerings ON DELETE RESTRICT,
  grade        NUMERIC(4,1) CHECK (grade BETWEEN 0 AND 100),         -- NULL until graded
  PRIMARY KEY (student_id, offering_id)                              -- no duplicate enrolment; offering already fixes course + term
);

-- denormalisation to consider: offerings.enrolled_count, maintained by the same transaction that inserts or deletes an
-- enrolment (or by a trigger), for the enrolment page that shows every offering with its headcount. Not students.name on
-- enrolments: a name is one fact and the join is a primary-key lookup.`,
        notes: [
          { t: "p", text: "**The offering is the table people miss.** 'A course has one instructor per term' is a dependency on `(course_code, term)`, which is neither the course nor the enrolment; it needs its own table, and the UNIQUE on `(course_code, term)` is that rule made enforceable." },
          { t: "p", text: "**Enrolment keys on the offering, not on course and term separately**, so a student cannot be enrolled in a course-term that does not exist as an offering. That is the foreign key doing the 3NF work." },
          { t: "p", text: "**RESTRICT everywhere here**: deleting a student with grades, or an instructor with offerings, should be a decision, not a cascade." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A table stores `customer_country` on every order row. What kind of problem is this, and which normal form names it?",
          options: [
            "A performance problem; 1NF",
            "An update anomaly — the same fact in many rows can disagree; 3NF, because country depends on the customer, not on the order key",
            "A missing index; 2NF",
            "No problem; it is a legitimate copy"
          ],
          answer: 1,
          why: "The executed check found Asha with two spellings of one country. Third normal form moves country to the customers table, where the customer_id determines it once."
        }
      ]
    }
  ],

  takeaways: [
    "**Five constraints, each a refusal at write time**: PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL. Declare every rule the database can express.",
    "**UNIQUE treats NULLs as distinct** in most engines; soft-deleted rows need a partial unique index (6.3).",
    "**Surrogate primary key plus UNIQUE on the natural key** is the default for entities; composite natural keys for association tables.",
    "**ON DELETE: CASCADE along ownership, RESTRICT along reference, SET NULL for optional links.**",
    "**Update, insert and delete anomalies** are what an unnormalised table produces; normalisation removes them by storing each fact once.",
    "**1NF atomic cells; 2NF whole key; 3NF nothing but the key; BCNF every determinant a key.**",
    "**Denormalise for hot reads, with a maintained copy** — a transactional upsert, a trigger, or a materialised view — never by hand.",
    "**A copy that is a different fact is not a duplicate**: the price at sale time belongs on the line item.",
    "**Constraints cost per write and pay at every read**; validate in staging rather than dropping them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which insert does a FOREIGN KEY refuse?",
        options: [
          "One whose referencing value is NULL",
          "One whose referencing value does not exist in the referenced table's key — customer_id 99 when no such customer exists",
          "One that duplicates an existing row",
          "One with a negative amount"
        ],
        answer: 1,
        why: "A NULL foreign key is allowed unless the column is also NOT NULL; the constraint only checks values that are present."
      },
      {
        stem: "Why pair a surrogate primary key with a UNIQUE constraint on the natural identifier?",
        options: [
          "For faster joins",
          "Because the surrogate alone allows two rows for the same real-world entity — two customers with one email — and the UNIQUE is what prevents the duplicate",
          "It is required by SQL",
          "To allow NULLs"
        ],
        answer: 1,
        why: "The surrogate gives a stable, cheap identity; the natural unique constraint gives correctness. Either alone is half a design."
      },
      {
        stem: "Deleting a product should fail if any historical order contains it. Which ON DELETE action?",
        options: [
          "CASCADE",
          "RESTRICT (or NO ACTION): the delete is refused while references exist",
          "SET NULL",
          "SET DEFAULT"
        ],
        answer: 1,
        why: "An order item refers to a product but is not owned by it. Cascade would silently erase order history."
      },
      {
        stem: "A table has key `(order_id, product_id)` and a column `customer_name`. Which normal form does it violate?",
        options: [
          "1NF",
          "2NF — customer_name depends on order_id alone, a part of the key, not the whole key",
          "3NF only",
          "None"
        ],
        answer: 1,
        why: "Partial dependency on a composite key is the 2NF violation; the customer belongs with the order, and then, by 3NF, with the customer."
      },
      {
        stem: "When is a denormalised copy acceptable?",
        options: [
          "Whenever a join is inconvenient",
          "When the read is hot and the copy is maintained by a single transactional path — an upsert in the load, a trigger, or a materialised view — so it cannot drift from the source",
          "Never",
          "Only in NoSQL"
        ],
        answer: 1,
        why: "Denormalisation is a performance decision with a maintenance obligation. A copy updated by hand is a future disagreement."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain normalisation and the first three normal forms with an example.",
        strong: "Normalisation puts each fact in exactly one place so that the data cannot disagree with itself. Take an orders spreadsheet with the customer's country on every row and the products as a comma-separated list. First normal form: every cell atomic — split the product list into one row per line item. Second: every non-key column depends on the whole key — with key (order, product), the customer depends on the order alone, so it moves to an orders table. Third: nothing but the key — the country depends on the customer, not the order, so it moves to a customers table. The payoff is that the three anomalies vanish: updating a country touches one row, a customer can exist without orders, deleting orders does not delete the customer. The cost is joins on read, which is why analytics schemas deliberately denormalise.",
        answer: [
          { t: "p", text: "Tying each form to an anomaly it removes, and naming the read cost, shows understanding rather than recitation." }
        ]
      },
      {
        level: "core",
        q: "Natural or surrogate primary key?",
        strong: "Surrogate for entities, with a UNIQUE constraint on the natural identifier — that gets a small stable key for joins and foreign keys, lets the business identifier change without cascading, and still prevents duplicates. Natural keys for small reference tables like country codes, where the code is the identity and appears in every query, and composite natural keys for association tables like order items, where the pair is the rule. For distributed generation or public exposure, a UUID, preferably time-ordered v7 so inserts do not scatter across the index.",
        answer: [
          { t: "p", text: "The 'surrogate plus natural unique' pairing is the answer; the v7 detail is a bonus." }
        ]
      },
      {
        level: "advanced",
        q: "Where do constraints belong: the database or the application?",
        strong: "Both, but the database is the last line and the only one that covers every path. Application validation gives good error messages and catches problems before a round trip; database constraints catch the migration script, the support tool, the analyst's notebook and the race between two requests. Anything the database can express — keys, uniqueness, not-null, enumerations, ranges, cross-column checks — I declare there. Rules it cannot express, like cross-row invariants or anything needing external data, live in the application with the concurrency handled explicitly. The cost is a check per write; the alternative is finding the violation at read time, which is a data-quality investigation instead of an error message.",
        answer: [
          { t: "p", text: "'Every path' and 'the race between two requests' are the reasons; the division of labour is the answer." }
        ]
      }
    ]
  }
});

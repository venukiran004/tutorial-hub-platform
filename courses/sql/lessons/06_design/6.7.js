/* ============================================================================
   LESSON 6.7 — Dialects and the Wider Ecosystem
   ========================================================================= */
EC.receiveLesson({
  id: "6.7",

  lede: "**SQL is one language and seven accents.** The standard covers SELECT, joins, aggregates, windows and CTEs, and every engine in this course speaks that core the same way; where they differ is division, string functions, date handling, upserts, type strictness, and everything that touches storage. This lesson maps the dialects you will meet — PostgreSQL, MySQL, SQLite, DuckDB, and the cloud warehouses — executes the differences that bite, and places SQL beside the systems that are not SQL: document stores, key-value stores, and the reasons an application might choose them.",

  objectives: [
    "Name the major engines, their typical role, and the two or three dialect differences that matter in each",
    "Execute the differences that produce silent wrong answers — integer division, type coercion, case-insensitive LIKE — and write portable SQL where it matters",
    "Choose between a row-store, a column-store and an embedded engine for a given workload",
    "Explain what document and key-value stores give up and gain relative to SQL, and what the CAP trade-off actually constrains"
  ],

  prerequisites: ["6.5"],

  blocks: [

    { t: "h2", n: "01", text: "The engines", id: "engines" },

    { t: "table",
      head: ["Engine", "Role", "Storage", "Distinctive"],
      rows: [
        ["**PostgreSQL**", "The default operational database; capable analytical one up to hundreds of GB", "Row store, MVCC, WAL", "Strictest types; transactional DDL; JSONB, arrays, extensions (PostGIS, pgvector); the most standard-conforming dialect"],
        ["**MySQL / MariaDB**", "Web applications; the LAMP lineage", "Row store (InnoDB), MVCC", "REPEATABLE READ default; `ON DUPLICATE KEY UPDATE`; case-insensitive collations by default; DDL auto-commits; permissive by default about bad data unless strict mode is on"],
        ["**SQLite**", "Embedded: phones, browsers, desktop apps, test suites, files", "Single file, row store", "Dynamic typing (a column's declared type is a suggestion); one writer at a time; no user management; `PRAGMA foreign_keys` off by default"],
        ["**DuckDB**", "Embedded analytics: notebooks, pipelines, local warehouse", "Single file, column store, vectorised", "Reads Parquet/CSV/JSON directly; `//` for integer division; lists and structs; QUALIFY, PIVOT, GROUP BY ALL; PostgreSQL-flavoured"],
        ["**BigQuery / Snowflake / Redshift**", "Cloud warehouses: petabytes, pay per scan or per compute-time", "Column store, distributed, separated storage and compute", "No indexes — partitioning and clustering instead; `SELECT *` costs money; semi-structured columns; time travel; own function libraries"],
        ["**SQL Server / Oracle**", "Enterprise operational and reporting", "Row store, with column-store options", "`TOP` / `FETCH FIRST`; `OUTPUT` / `RETURNING INTO`; T-SQL and PL/SQL procedural languages; different NULL-in-UNIQUE rules"],
        ["**Spark SQL / Trino / Presto**", "Query engines over files and other databases", "None of their own", "Federated: one query across Parquet, PostgreSQL and a warehouse; ANSI-leaning dialects; Spark SQL and the DataFrame API interconvert"]
      ]
    },

    { t: "p", text: "In practice a data professional meets three of these constantly: **PostgreSQL** where the application lives, **a warehouse** where the analysis lives, and **DuckDB or SQLite** on their own machine. The habits that transfer between them are the whole of modules 1 to 5; the rest of this lesson is the list of places where the same text means different things." },

    { t: "h2", n: "02", text: "The differences that produce wrong answers", id: "silent" },

    { t: "code", lang: "sql", title: "Division, types and case — executed on DuckDB and SQLite",
      hl: [2, 3, 8, 9, 10, 14, 15],
      code: `-- integer division: the same expression, three answers
SELECT 7 / 2;          -- DuckDB 3.5    PostgreSQL 3    SQLite 3    MySQL 3.5000    BigQuery 3.5
SELECT 7 // 2;         -- DuckDB 3  (integer division operator; PostgreSQL has no //, use div(7, 2))
-- portable: cast one side.  7 / 2.0  or  7::NUMERIC / 2  or  CAST(7 AS DECIMAL) / 2   -> 3.5 everywhere
-- this is why 1.4 and 3.5 wrote 100.0 * x / y and never 100 * x / y

-- type strictness: what happens when a string lands in an integer column
CREATE TABLE loose (x INTEGER);
INSERT INTO loose VALUES ('hello');            -- SQLite: stored as text, no error (typeof(x) = 'text')
                                               -- MySQL (non-strict): stored as 0, warning        MySQL (strict) / PostgreSQL / DuckDB: error
SELECT typeof(1), typeof('1'), typeof(1.0);    -- SQLite: integer | text | real   -- and '1' = 1 is false while 1 = 1.0 is true

-- LIKE and case
SELECT 'Abc' LIKE 'a%';    -- SQLite: 1 (true) -- LIKE is case-insensitive for ASCII by default    PostgreSQL: false    MySQL: true (collation)
SELECT 'Abc' ILIKE 'a%';   -- PostgreSQL / DuckDB: true, explicitly     -- portable: LOWER(col) LIKE 'a%'
-- also: '' vs NULL (Oracle treats '' as NULL), TRUE = 1 (DuckDB true; PostgreSQL error), and boolean columns in MySQL are TINYINT`,
      caption: "Every one of these is silent: no error, a different number. The defence is the same everywhere — write the arithmetic with an explicit decimal, validate types at the boundary rather than trusting the column, and spell case-handling out. A query that passes tests on SQLite and fails on PostgreSQL is usually one of these three."
    },

    { t: "table",
      head: ["Feature", "PostgreSQL", "MySQL", "SQLite", "DuckDB", "BigQuery"],
      rows: [
        ["Upsert", "`ON CONFLICT … DO UPDATE`", "`ON DUPLICATE KEY UPDATE`", "`ON CONFLICT … DO UPDATE`", "`ON CONFLICT … DO UPDATE`", "`MERGE`"],
        ["Return written rows", "`RETURNING`", "— (MariaDB has it)", "`RETURNING`", "`RETURNING`", "—"],
        ["Limit / offset", "`LIMIT n OFFSET m`", "`LIMIT m, n` or `LIMIT n OFFSET m`", "`LIMIT n OFFSET m`", "`LIMIT n OFFSET m`", "`LIMIT n OFFSET m`"],
        ["Date truncation", "`date_trunc('month', ts)`", "`DATE_FORMAT(ts, '%Y-%m-01')`", "`strftime('%Y-%m', ts)`", "`date_trunc` / `strftime`", "`DATE_TRUNC(ts, MONTH)`"],
        ["String concat", "`||`, `concat()`", "`concat()` (`||` is OR unless PIPES_AS_CONCAT)", "`||`", "`||`, `concat()`", "`||`, `CONCAT()`"],
        ["Median", "`percentile_cont(0.5) WITHIN GROUP`", "window trick (3.4)", "window trick", "`median()` / `quantile_cont`", "`PERCENTILE_CONT(x, 0.5) OVER ()`"],
        ["Regex match", "`~`, `regexp_match`", "`REGEXP`", "`REGEXP` (needs an extension)", "`regexp_matches`, `~`", "`REGEXP_CONTAINS`"],
        ["JSON access", "`->`, `->>`, `jsonb_path_query`", "`->`, `->>`, `JSON_EXTRACT`", "`->`, `->>`, `json_extract`", "`->`, `->>`, `json_extract`", "`JSON_VALUE`, `JSON_QUERY`"],
        ["Identity column", "`GENERATED … AS IDENTITY`", "`AUTO_INCREMENT`", "`INTEGER PRIMARY KEY` (rowid)", "sequences", "—"],
        ["Transactional DDL", "yes", "no", "yes", "yes", "n/a"]
      ]
    },

    { t: "callout", kind: "production", title: "Write for the engine you run on, and isolate the dialect", body: [
      { t: "p", text: "Portable SQL is a worthwhile habit — explicit casts, standard joins, no vendor functions in shared logic — but chasing full portability forfeits the features that make each engine good: PostgreSQL's JSONB, DuckDB's `read_parquet`, BigQuery's partition pruning. **The workable compromise: keep dialect-specific SQL in a small number of named places** — a views layer, a `queries/` module, a dbt macro — so that a move is a rewrite of those files, not an archaeology of every notebook." }
    ]},

    { t: "h2", n: "03", text: "Row, column, embedded: choosing an engine", id: "choose" },

    { t: "viz",
      title: "Where each engine sits",
      caption: "Two axes: how many rows a typical query touches, and whether the engine runs as a server or inside your process. Row stores answer point queries fast; column stores scan fast; embedded engines remove the network and the operations.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A two-by-two grid. Horizontal axis: point queries to full scans. Vertical axis: embedded to server. PostgreSQL and MySQL in the server/point cell, warehouses in the server/scan cell, SQLite in embedded/point, DuckDB in embedded/scan.">
  <line x1="120" y1="250" x2="850" y2="250" style="stroke:var(--line)" stroke-width="1.2"/>
  <line x1="120" y1="250" x2="120" y2="30" style="stroke:var(--line)" stroke-width="1.2"/>
  <line x1="485" y1="250" x2="485" y2="30" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
  <line x1="120" y1="140" x2="850" y2="140" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="300" y="280" class="s-sub" text-anchor="middle">point queries · few rows · many writes</text>
  <text x="670" y="280" class="s-sub" text-anchor="middle">scans · millions of rows · batch loads</text>
  <text x="40" y="90" class="s-sub" text-anchor="middle" transform="rotate(-90 40 90)">server</text>
  <text x="40" y="200" class="s-sub" text-anchor="middle" transform="rotate(-90 40 200)">embedded</text>
  <g stroke-width="1.2">
    <rect x="160" y="50" width="280" height="70" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="530" y="50" width="280" height="70" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="160" y="160" width="280" height="70" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="530" y="160" width="280" height="70" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="300" y="76">PostgreSQL · MySQL · SQL Server</text>
    <text x="670" y="76">BigQuery · Snowflake · Redshift · ClickHouse</text>
    <text x="300" y="186">SQLite</text>
    <text x="670" y="186">DuckDB</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="300" y="100">row store · the application's database</text>
    <text x="670" y="100">column store · the warehouse</text>
    <text x="300" y="210">one file · apps, tests, devices</text>
    <text x="670" y="210">one file · notebooks, pipelines, local analysis</text>
  </g>
</svg>`
    },

    { t: "code", lang: "sql", title: "DuckDB as the local warehouse (executed)",
      hl: [2, 5, 6, 9],
      code: `-- files are tables; no load step
SELECT COUNT(*) FROM read_csv('bulk_sample.csv');                       -- 5
SELECT year_month, SUM(line_total) FROM read_parquet('sales/*.parquet') GROUP BY ALL;

-- the same engine reads PostgreSQL directly, and writes Parquet for the warehouse
ATTACH 'postgres://user@host/shop' AS pg (TYPE postgres);
COPY (SELECT * FROM pg.orders WHERE placed_at >= DATE '2025-01-01') TO 'orders_2025.parquet';

-- and the analytical syntax that the warehouses share
SELECT [1, 2, 3] AS list, {'a': 1} AS struct;                            -- nested types, as in BigQuery and Snowflake`,
      caption: "DuckDB is how this course executed every query in modules 1–4: PostgreSQL syntax, columnar speed, no server. For a data professional it replaces the pandas-then-SQL shuffle for anything that fits on a laptop, which is more than most people assume."
    },

    { t: "h2", n: "04", text: "Not SQL: documents, keys, and the CAP trade-off", id: "nosql" },

    { t: "table",
      head: ["Family", "Examples", "Model", "Gives up", "Gains", "Fits"],
      rows: [
        ["Document", "MongoDB, Couchbase, DynamoDB (partly)", "JSON documents, nested, schema per document", "Joins across collections; multi-document transactions were late and are limited; normalisation", "One read fetches a whole aggregate; flexible fields; horizontal scale by document key", "Product catalogues, user profiles, content — data read as a unit and rarely joined"],
        ["Key-value", "Redis, Memcached, DynamoDB", "Opaque value by key; Redis adds lists, sets, sorted sets, streams", "Queries by anything but the key; durability by default (Redis is memory-first)", "Microsecond access; simple scaling; data structures in the store", "Caches, sessions, rate limits, queues, leaderboards"],
        ["Wide-column", "Cassandra, HBase, Bigtable", "Rows by partition key, sorted within partition", "Ad hoc queries: the table is designed per query; joins; secondary indexes are weak", "Linear write scale; multi-region availability; time-series and event logs", "Very high write volume with known access patterns"],
        ["Search", "Elasticsearch, OpenSearch", "Inverted index over documents", "Transactions; being the source of truth", "Full-text relevance, faceting, fuzzy matching", "Search boxes and log exploration, fed from the SQL source"],
        ["Graph", "Neo4j, Neptune", "Nodes and edges with properties", "Set-based aggregation at scale", "Variable-depth traversals without recursive CTEs (4.3)", "Social graphs, fraud rings, dependency networks"]
      ]
    },

    { t: "p", text: "The honest summary: **a relational database with JSONB columns covers most of what document stores promised**, with transactions and joins intact; key-value stores are a legitimate companion for caches and ephemeral state; wide-column stores earn their complexity only at write volumes most systems never see. The pattern that works is SQL as the source of truth with specialised stores fed from it — search, cache, graph — never several sources of truth." },

    { t: "dl", items: [
      ["CAP", "In a distributed store, during a network partition you must choose: refuse some requests to stay consistent (CP), or answer with possibly stale data to stay available (AP). Outside a partition the trade-off does not apply; the real dial is latency versus consistency."],
      ["Eventual consistency", "Replicas converge after writes stop; a read may return an older value meanwhile. The default of many AP systems and of asynchronous SQL replicas — read-your-own-writes is the guarantee applications actually need."],
      ["Sharding", "Splitting a table across nodes by key. Queries that include the key are fast; queries that do not fan out to every shard; joins across shards are the application's problem."],
      ["Read replica", "A copy of a SQL database fed by the WAL, used for reads. Adds capacity for reads and reporting; lags by milliseconds to seconds; writes still go to one primary."],
      ["Distributed SQL", "CockroachDB, Spanner, YugabyteDB, TiDB: SQL with transactions across shards, paid for in write latency. The answer when the data outgrows one primary and the application still needs joins and ACID."],
      ["Lakehouse", "Parquet files in object storage with a table format (Iceberg, Delta, Hudi) giving them transactions and schema; queried by Spark, Trino, DuckDB or the warehouse. Where large analytical data increasingly lives."]
    ]},

    { t: "callout", kind: "mental", title: "The question is not 'SQL or NoSQL' but 'what is the source of truth'", body: [
      { t: "p", text: "Pick one system that holds the truth and enforces the constraints — for almost every application, a relational database — and let every other store be derived from it and rebuildable from it. **A cache that can be flushed, a search index that can be reindexed, a warehouse that can be reloaded: these are safe.** Two systems that each hold part of the truth, with the application responsible for keeping them agreed, is the design that produces the incidents." }
    ]},

    { t: "ladder",
      title: "A product catalogue with variable attributes per category",
      rungs: [
        { level: "bad", label: "A separate document store because 'the schema varies'", code: `// MongoDB: products collection, any fields per document; orders stay in PostgreSQL
db.products.insert({ sku: "K1", name: "Kettle", attrs: { colour: "red", litres: 1.7 } })`,
          note: "**Two sources of truth.** Every order line must look up a product across systems; there is no foreign key; reporting joins happen in application code." },
        { level: "ok", label: "PostgreSQL with a JSONB column for the variable part", code: `CREATE TABLE products (product_id BIGINT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, unit_price NUMERIC(8,2) NOT NULL,
                       attrs JSONB NOT NULL DEFAULT '{}');
CREATE INDEX products_attrs_gin ON products USING gin (attrs);
SELECT name FROM products WHERE attrs @> '{"colour": "red"}';`,
          note: "**One system, foreign keys intact, flexible attributes indexed.** The fixed columns are constrained; the variable ones are queryable." },
        { level: "best", label: "The same, with the attributes that matter promoted", code: `-- when reports keep asking about colour and litres, they have become schema:
ALTER TABLE products ADD COLUMN colour TEXT GENERATED ALWAYS AS (attrs ->> 'colour') STORED;
CREATE INDEX products_colour_idx ON products (colour);`,
          note: "**JSONB for the long tail, columns for what is queried.** A generated column keeps the two in sync without application code." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Diagnose",
      title: "Port a query across three engines",
      difficulty: "core",
      minutes: 22,
      body: [
        { t: "p", text: "This query was written against SQLite and returns the expected numbers there. It is being moved to PostgreSQL for production and to DuckDB for analysis. Find every construct that behaves differently on at least one of the three, say what each does on each engine, and rewrite the query so that it returns the same result on all three." },
        { t: "code", lang: "sql", title: "monthly_share.sql (SQLite)", code: `SELECT strftime('%Y-%m', o.placed_at) AS ym,
       SUM(oi.qty * oi.unit_price) / SUM(SUM(oi.qty * oi.unit_price)) OVER () * 100 AS share_pct,
       COUNT(*) / COUNT(DISTINCT o.customer_id) AS lines_per_customer,
       c.name || ' (' || c.country || ')' AS who
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status LIKE 'PAID' AND c.tier = 'plus'
GROUP BY 1, who;` }
      ],
      requirements: [
        "At least four dialect-sensitive constructs identified with per-engine behaviour.",
        "A rewritten query that is correct on all three.",
        "A note on which engine's answer the original was silently wrong on, if any."
      ],
      hint: "Look at the date function, the integer division, the LIKE, the concat with a NULL country, and the GROUP BY.",
      solution: {
        lang: "sql",
        title: "monthly_share_portable.sql",
        code: `-- 1. strftime('%Y-%m', ts): SQLite and DuckDB yes (DuckDB argument order differs: strftime(ts, fmt)); PostgreSQL: to_char(ts, 'YYYY-MM').
--    portable: date_trunc is PostgreSQL + DuckDB; for all three use  substr(CAST(o.placed_at AS TEXT), 1, 7)  or a per-engine view.
-- 2. COUNT(*) / COUNT(DISTINCT ...): integer division on SQLite and PostgreSQL (rounds down), decimal on DuckDB. Cast.
-- 3. LIKE 'PAID': SQLite case-insensitive -> matches 'paid'; PostgreSQL and DuckDB case-sensitive -> matches nothing. The original
--    returns rows on SQLite and an empty result on the other two. Use = 'paid'.
-- 4. c.country is NULL for Dalia (plus tier): || with NULL gives NULL on all three -- her label vanishes. concat_ws or COALESCE.
-- 5. GROUP BY 1, who: SQLite and DuckDB accept output aliases; PostgreSQL accepts the ordinal and, for aliases, only in simple cases.
--    Repeat the expressions or use a CTE.
-- 6. SUM(SUM(x)) OVER (): valid nesting on all three. Fine.

WITH lines AS (
  SELECT substr(CAST(o.placed_at AS TEXT), 1, 7) AS ym,
         concat_ws(' ', c.name, '(' || COALESCE(c.country, 'unknown') || ')') AS who,    -- or CASE for engines without concat_ws
         oi.qty * oi.unit_price AS line_total, o.customer_id
  FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN customers c ON c.customer_id = o.customer_id
  WHERE  o.status = 'paid' AND c.tier = 'plus'
)
SELECT ym, who,
       100.0 * SUM(line_total) / SUM(SUM(line_total)) OVER ()          AS share_pct,
       CAST(COUNT(*) AS DECIMAL) / COUNT(DISTINCT customer_id)       AS lines_per_customer
FROM   lines
GROUP BY ym, who
ORDER BY ym, who;`,
        notes: [
          { t: "p", text: "**The LIKE is the one that changes the answer from rows to no rows** — the most dangerous kind of difference, because an empty result looks like 'no data this month' rather than 'wrong query'." },
          { t: "p", text: "**The integer division is the one that changes a number quietly**: `lines_per_customer` of 1.67 becomes 1 on two of the three engines. The `100.0 *` prefix already protects `share_pct`." },
          { t: "p", text: "**The CTE removes the GROUP BY alias question** entirely by making the expressions columns first — the habit from 4.1 that happens to be the portable one." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT 7 / 2` returns 3 on PostgreSQL and 3.5 on DuckDB. What is the portable form?",
          options: [
            "Use // everywhere",
            "Make one operand a decimal — 7 / 2.0 or CAST(7 AS DECIMAL) / 2 — so every engine performs decimal division",
            "Use ROUND",
            "Use FLOOR"
          ],
          answer: 1,
          why: "Integer division is the standard's behaviour and DuckDB's departure from it; an explicit decimal operand is unambiguous everywhere and is why every ratio in this course is written 100.0 * x / y."
        }
      ]
    }
  ],

  takeaways: [
    "**The core — SELECT, joins, aggregates, windows, CTEs — is the same everywhere**; the differences are at the edges: division, strings, dates, upserts, types.",
    "**Three silent differences**: integer division (cast a side), type coercion (SQLite stores anything; MySQL non-strict coerces), and LIKE case (SQLite and MySQL insensitive; PostgreSQL and DuckDB sensitive).",
    "**PostgreSQL for the application, a warehouse for analysis, DuckDB or SQLite locally** — the three you will use constantly.",
    "**Row stores for point queries and writes; column stores for scans; embedded engines remove the server.**",
    "**Warehouses have no indexes**: partitioning and clustering replace them, and `SELECT *` costs money.",
    "**Keep dialect-specific SQL in a few named places** so a move is a rewrite of those, not of every notebook.",
    "**JSONB in PostgreSQL covers most of what document stores offered**, with joins and transactions kept; promote hot attributes to columns.",
    "**Key-value for caches and ephemeral state; wide-column for extreme write volume; search and graph fed from the SQL source.**",
    "**CAP constrains behaviour during a partition only**; the everyday dial is latency versus consistency, and read-your-own-writes is the guarantee that matters.",
    "**One source of truth, everything else derived and rebuildable.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A query tested on SQLite returns rows; on PostgreSQL it returns none. The WHERE contains `status LIKE 'PAID'`. Why?",
        options: [
          "PostgreSQL has no LIKE",
          "SQLite's LIKE is case-insensitive for ASCII and matches 'paid'; PostgreSQL's is case-sensitive and matches nothing — use = 'paid' or ILIKE / LOWER()",
          "The data differs",
          "PostgreSQL needs a wildcard"
        ],
        answer: 1,
        why: "An empty result is the most dangerous portability failure because it looks like an absence of data. Spell case handling out."
      },
      {
        stem: "Why do cloud warehouses have no indexes?",
        options: [
          "They are not mature",
          "Columnar, distributed storage answers scans by reading only the needed columns of the needed partitions; partitioning and clustering prune data, which replaces the index's role for analytical access patterns",
          "Indexes are patented",
          "They do, but hidden"
        ],
        answer: 1,
        why: "An index accelerates finding a few rows; a warehouse's job is scanning many. Partition by date and cluster by the common filter columns, and the scan reads a fraction of the table."
      },
      {
        stem: "When is PostgreSQL with a JSONB column preferable to a separate document store?",
        options: [
          "Never; JSONB is slow",
          "Almost always when the documents relate to other data: the flexible fields are indexed and queryable, foreign keys and transactions remain, and there is one source of truth",
          "Only for small data",
          "Only when the schema is fixed"
        ],
        answer: 1,
        why: "A second source of truth is the cost of a separate document store; JSONB gives the flexibility without it. Promote fields that become hot to real columns."
      },
      {
        stem: "What does the CAP theorem actually constrain?",
        options: [
          "Every database at all times",
          "Behaviour during a network partition: a distributed store must then either refuse some requests (consistent) or serve possibly stale data (available); outside a partition the trade-off is latency versus consistency",
          "Single-node databases",
          "Whether SQL can scale"
        ],
        answer: 1,
        why: "CAP is often quoted as 'pick two of three' — it is narrower than that: the choice arises only while nodes cannot talk to each other."
      },
      {
        stem: "What is the right relationship between a SQL database and a search index or cache?",
        options: [
          "Each holds part of the truth",
          "The SQL database is the source of truth; the search index and cache are derived from it and can be rebuilt from it at any time",
          "The cache is the source of truth for speed",
          "They should not coexist"
        ],
        answer: 1,
        why: "Derived stores are safe because they can be flushed and rebuilt. Divided truth is the design that produces the incidents where two systems disagree and nobody knows which is right."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What differences between SQL dialects have actually bitten you?",
        strong: "Three silent ones. Integer division: 7 / 2 is 3 in PostgreSQL and SQLite and 3.5 in DuckDB and MySQL, so I always write a decimal operand. Case in LIKE: SQLite and MySQL match case-insensitively by default, PostgreSQL does not, so a query tested locally can return nothing in production; I use equality or ILIKE or LOWER. Type strictness: SQLite stores a string in an integer column without complaint, MySQL in non-strict mode coerces it to zero, PostgreSQL errors — so I validate at the boundary rather than trusting the column type. Beyond those, the syntactic ones — ON CONFLICT versus ON DUPLICATE KEY, date functions, RETURNING — are loud, so they are found quickly.",
        answer: [
          { t: "p", text: "Distinguishing silent differences from loud ones shows which ones you actually worry about." }
        ]
      },
      {
        level: "core",
        q: "PostgreSQL, a warehouse, or DuckDB — how do you choose for an analytics task?",
        strong: "By where the data lives and how much of it there is. If it is under a few hundred gigabytes and on my machine or in files, DuckDB: columnar, reads Parquet and CSV directly, no server, PostgreSQL syntax. If it is the application's live data and the query is operational — one customer's history — PostgreSQL, with care not to run heavy scans on the primary; a read replica for reporting. If it is the organisation's history at terabyte scale queried by many people, the warehouse, designed around partitioning and clustering because there are no indexes, with an eye on scan cost. The three coexist: PostgreSQL is the source, the warehouse the shared model, DuckDB the local tool.",
        answer: [
          { t: "p", text: "Size, location, and the operational-versus-analytical split; and that they are complementary, not competing." }
        ]
      },
      {
        level: "advanced",
        q: "When would you choose a NoSQL store over a relational database?",
        strong: "When a specific access pattern justifies a specialised system and the relational database remains the source of truth. A key-value store for caches, sessions and rate limits, where microsecond reads by key are the whole requirement. A search engine for full-text relevance, reindexed from SQL. A wide-column store when write volume genuinely exceeds what one primary can absorb and the queries are known in advance. A graph database for deep variable-length traversals that recursive CTEs handle poorly at scale. What I would not do is choose a document store because the schema is flexible — JSONB in PostgreSQL gives that with joins and transactions intact — or split the truth across two systems and make the application responsible for agreement. CAP is rarely the deciding factor; it only constrains behaviour during a partition.",
        answer: [
          { t: "p", text: "Specialised stores derived from one source of truth, the JSONB point, and the CAP correction — a senior answer." }
        ]
      }
    ]
  }
});

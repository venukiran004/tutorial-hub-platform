/* ============================================================================
   LESSON 5.3 — Indexes: B-tree and Beyond
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**An index is a sorted copy of some columns with a pointer to each row, kept in a tree so that any value can be found in a few page reads.** That definition answers most questions about indexes: what they can find (anything the sort order puts together — an equality, a range, a prefix), what they cannot (a suffix, a transformed value, the second column of a composite without the first), and what they cost (every write updates every index). The rest is the special types — partial, expression, covering, GIN, BRIN — each a variation on which columns, which rows, and what order.",

  objectives: [
    "Describe a B-tree and derive from it what predicates and ORDER BYs it can serve",
    "Design composite indexes with the leftmost-prefix rule and column order in mind",
    "Use covering, partial and expression indexes for the cases each is built for",
    "Name the non-B-tree index types and the predicate each answers",
    "Quantify the write cost of an index and decide when not to build one"
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", text: "What a B-tree can answer", id: "btree" },

    { t: "p", text: "A B-tree index stores the indexed values in sorted order across pages, with a small tree of guide pages on top; finding a value is three or four page reads however large the table. Because the leaves are sorted, **everything that is contiguous in sort order is cheap: one value, a range, a prefix of a string, the minimum or maximum, and rows in that order for an ORDER BY.** Everything that is scattered in sort order is not: a suffix match, a value transformed by a function, or a condition on a column that is not the first in the index." },

    { t: "code", lang: "sql", title: "What one index on placed_at serves (SQLite, 400,000 orders, measured)",
      hl: [3, 6, 9, 12],
      code: `CREATE INDEX orders_placed ON orders (placed_at);

SELECT COUNT(*) FROM orders WHERE placed_at >= '2025-03-01' AND placed_at < '2025-04-01';
--   SEARCH orders USING COVERING INDEX orders_placed (placed_at>? AND placed_at<?)      0.9 ms   (22.1 ms without: a range is contiguous)

SELECT MAX(placed_at) FROM orders;
--   SEARCH orders USING COVERING INDEX orders_placed                                     0.0 ms   (18.4 ms without: the last leaf)

SELECT COUNT(*) FROM orders WHERE substr(placed_at, 1, 7) = '2025-03';
--   SCAN orders                                                                         22.8 ms   (a function on the column: the index order is useless)

SELECT COUNT(*) FROM orders WHERE placed_at LIKE '2025-03%';
--   SEARCH orders USING COVERING INDEX orders_placed (placed_at>? AND placed_at<?)      1.6 ms   (a prefix IS a range -- with a case-sensitive collation)
SELECT COUNT(*) FROM orders WHERE placed_at LIKE '%:30:00';
--   SCAN orders                                                                         27.6 ms   (a suffix is scattered)`,
      caption: "The prefix LIKE used the index only after `PRAGMA case_sensitive_like = ON`; by default SQLite's LIKE is case-insensitive and the sort order does not apply. PostgreSQL has the same condition in different clothes: a B-tree serves `LIKE 'abc%'` only under the C collation or with `text_pattern_ops`."
    },

    { t: "dl", items: [
      ["B-tree", "The default index: values in sorted order at the leaves, guide pages above. Equality, range, prefix, ORDER BY, MIN and MAX. O(log n) to find any key."],
      ["Composite index", "A B-tree on several columns, sorted by the first, then the second within equal firsts, and so on. Usable for predicates on a leftmost prefix of its columns."],
      ["Covering index", "An index that holds every column a query needs, so the table is never read. Any composite index covers queries that only touch its columns; `INCLUDE` adds non-key columns to the leaves without affecting the sort."],
      ["Partial index", "An index over the rows matching a WHERE clause. Small, cheap to maintain, and used only when the query's predicate implies the index's."],
      ["Expression index", "An index on a computed value — `LOWER(email)`, `(doc->>'channel')`, `date_trunc('day', ts)`. Serves predicates written with exactly that expression."],
      ["Selectivity", "The fraction of rows a value picks out. An index earns its cost on selective predicates; a column with three values is rarely worth indexing alone."]
    ]},

    { t: "viz",
      title: "Sorted leaves, and why a suffix cannot use them",
      caption: "The B-tree's leaves hold the indexed values in order. A range is a contiguous run of leaves — start at the first match, read forward, stop. A suffix or a function of the value could match any leaf, so the index offers no place to start.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A root page pointing to three interior pages pointing to a row of leaf pages holding sorted timestamps; a bracket over three consecutive leaves labelled range scan; scattered highlights across all leaves labelled suffix match.">
  <rect x="380" y="20" width="120" height="30" rx="5" style="fill:var(--accent);fill-opacity:.15;stroke:var(--accent)" stroke-width="1.2"/>
  <text x="440" y="40" class="s-sub" text-anchor="middle">root · 3 keys</text>
  <g stroke-width="1.2">
    <rect x="140" y="80" width="120" height="28" rx="5" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="380" y="80" width="120" height="28" rx="5" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="620" y="80" width="120" height="28" rx="5" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="200" y="99">≤ Jan</text><text x="440" y="99">Feb – Mar</text><text x="680" y="99">≥ Apr</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1" fill="none">
    <line x1="420" y1="50" x2="200" y2="80"/><line x1="440" y1="50" x2="440" y2="80"/><line x1="460" y1="50" x2="680" y2="80"/>
    <line x1="200" y1="108" x2="90" y2="140"/><line x1="200" y1="108" x2="200" y2="140"/><line x1="200" y1="108" x2="310" y2="140"/>
    <line x1="440" y1="108" x2="420" y2="140"/><line x1="440" y1="108" x2="530" y2="140"/>
    <line x1="680" y1="108" x2="640" y2="140"/><line x1="680" y1="108" x2="750" y2="140"/><line x1="680" y1="108" x2="850" y2="140"/>
  </g>
  <g stroke-width="1.2">
    <rect x="50" y="140" width="80" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="160" y="140" width="80" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="270" y="140" width="80" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="380" y="140" width="80" height="26" rx="4" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
    <rect x="490" y="140" width="80" height="26" rx="4" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
    <rect x="600" y="140" width="80" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="710" y="140" width="80" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="810" y="140" width="50" height="26" rx="4" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
  </g>
  <g class="s-mono" text-anchor="middle" style="font-size:9px">
    <text x="90" y="157">Jan 05 …</text><text x="200" y="157">Jan 20 …</text><text x="310" y="157">Feb 02 …</text><text x="420" y="157">Mar 03 …</text><text x="530" y="157">Mar 27 …</text><text x="640" y="157">Apr 04 …</text><text x="750" y="157">May …</text><text x="835" y="157">…</text>
  </g>
  <path d="M380,180 L380,190 L570,190 L570,180" fill="none" style="stroke:var(--good)" stroke-width="2"/>
  <text x="475" y="208" class="s-sub" text-anchor="middle" style="fill:var(--good)">placed_at &gt;= '2025-03-01' AND &lt; '2025-04-01': start here, read forward, stop</text>
  <g style="fill:var(--crit)">
    <circle cx="90" cy="130" r="4"/><circle cx="310" cy="130" r="4"/><circle cx="530" cy="130" r="4"/><circle cx="750" cy="130" r="4"/>
  </g>
  <text x="440" y="236" class="s-sub" text-anchor="middle" style="fill:var(--crit)">LIKE '%:30:00' — a match could be on any leaf: no place to start, every leaf read</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Composite indexes and the leftmost prefix", id: "composite" },

    { t: "p", text: "An index on `(customer_id, placed_at)` is sorted by customer, and within each customer by time. **A predicate on `customer_id` alone uses it; on both, uses it fully; on `placed_at` alone, cannot** — the times of one customer are contiguous but the times of all customers are scattered through the index. The order of columns is therefore a design decision: equality columns first, the range or sort column last, and the column that queries filter on alone first." },

    { t: "code", lang: "sql", title: "One composite index, four predicates (measured)",
      hl: [3, 5, 8, 11],
      code: `CREATE INDEX orders_cust_placed ON orders (customer_id, placed_at);

SELECT order_id FROM orders WHERE customer_id = 4242 AND placed_at >= '2025-06-01';
--   SEARCH orders USING COVERING INDEX orders_cust_placed (customer_id=? AND placed_at>?)   0.0 ms   both columns: equality then range
SELECT order_id FROM orders WHERE customer_id = 4242;
--   SEARCH orders USING COVERING INDEX orders_cust_placed (customer_id=?)                   0.0 ms   leading column alone: fine

SELECT order_id FROM orders WHERE placed_at >= '2025-06-01' AND placed_at < '2025-06-02';
--   SCAN orders USING COVERING INDEX orders_cust_placed                                    22.7 ms   trailing column alone: a scan (of the index, here)

SELECT order_id, placed_at FROM orders WHERE customer_id = 4242 ORDER BY placed_at DESC LIMIT 5;
--   SEARCH orders USING COVERING INDEX orders_cust_placed (customer_id=?)                   0.0 ms   the ORDER BY is the index order: no sort node

-- design rule: (equality columns…, range or ORDER BY column). (placed_at, customer_id) would serve the date range
-- and not the per-customer lookups; two single-column indexes would serve each alone but not the ORDER BY.`,
      caption: "The 'latest five for a customer' query is the composite index's best case: seek to the customer, read five entries backwards, done — no sort, no heap. It is the index the LATERAL of 4.1 and the ROW_NUMBER of 3.2 both want, and it is why 'latest per entity' queries are cheap or slow depending on one CREATE INDEX."
    },

    { t: "h2", n: "03", text: "Covering, partial and expression indexes", id: "special" },

    { t: "p", text: "Three refinements, each for a specific shape of query. **A covering index** holds every column the query touches, so the engine answers from the index and never visits the table — PostgreSQL's `INCLUDE (col)` adds payload columns to the leaves without putting them in the sort. **A partial index** covers only the rows a WHERE clause selects — the 5 % of refunded orders — and is a fraction of the size, maintained only when those rows change. **An expression index** stores a computed value so a predicate written with that expression becomes sargable (5.4)." },

    { t: "code", lang: "sql", title: "Covering, partial, expression — and the unique index that is a constraint (measured)",
      hl: [2, 4, 8, 12, 16],
      code: `SELECT placed_at FROM orders WHERE customer_id = 4242;
--   SEARCH orders USING COVERING INDEX orders_cust_placed (customer_id=?)     -- every column needed is in the index: no table visit
SELECT status FROM orders WHERE customer_id = 4242;
--   SEARCH orders USING INDEX orders_cust_placed (customer_id=?)              -- status is not: seek, then fetch each row
-- PostgreSQL: CREATE INDEX ON orders (customer_id, placed_at) INCLUDE (status);  -- covers the second query too, without sorting by status

-- partial: only refunded orders, 5 % of the table, indexed by time
CREATE INDEX orders_refunded ON orders (placed_at) WHERE status = 'refunded';
SELECT order_id FROM orders WHERE status = 'refunded' AND placed_at >= '2025-03-01' AND placed_at < '2025-04-01';
--   SEARCH orders USING INDEX orders_refunded (placed_at>? AND placed_at<?)     0.8 ms   -- the query's WHERE implies the index's

-- expression: the month as a stored value
CREATE INDEX orders_month ON orders (substr(placed_at, 1, 7));
SELECT COUNT(*) FROM orders WHERE substr(placed_at, 1, 7) = '2025-03';
--   SEARCH orders USING INDEX orders_month (<expr>=?)                          1.5 ms   -- the same predicate scanned at 22.8 ms in section 01

-- unique on an expression: a constraint the schema could not otherwise state
CREATE UNIQUE INDEX customers_email ON customers (LOWER(email));
-- INSERT 'A@x.com' then 'a@x.com'  ->  ERROR: UNIQUE constraint failed: customers_email`,
      caption: "The partial index is the one people forget: a 5 % index costs 5 % of the writes and answers the common 'find the exceptions' query in a fraction of a millisecond. The expression index is the alternative to rewriting an unsargable predicate — but a range on the bare column (5.4) is usually the better fix, because it needs no extra index."
    },

    { t: "h2", n: "04", text: "Beyond the B-tree", id: "beyond" },

    { t: "table",
      head: ["Index type", "Structure", "Answers", "Use for"],
      rows: [
        ["B-tree", "Sorted tree", "=, <, >, BETWEEN, prefix LIKE, ORDER BY, MIN/MAX, IS NULL", "Almost everything; the default"],
        ["Hash (PostgreSQL)", "Hash table", "= only", "Equality on long values where the B-tree would be wide; rarely worth it since B-trees handle equality well"],
        ["GIN", "Inverted index: value → rows", "Containment `@>`, key existence, full-text `@@`, array `&&`, trigram LIKE", "jsonb, arrays, tsvector, `pg_trgm` for `LIKE '%x%'`"],
        ["GiST", "Balanced tree over arbitrary predicates", "Overlaps, contains, nearest, distance", "Geometry, ranges, PostGIS, exclusion constraints"],
        ["BRIN", "Min/max per block range", "Ranges on columns correlated with physical order", "Append-only time series: tiny index, cheap maintenance, coarse"],
        ["Bloom (extension)", "Bloom filter per row", "Equality on any subset of many columns", "Wide tables with ad-hoc equality filters"],
        ["Clustered (SQL Server, MySQL InnoDB)", "The table itself stored in key order", "Range scans on the key are sequential", "The primary key; secondary indexes then point at the key"]
      ]
    },

    { t: "p", text: "Two of these matter routinely. **GIN with `pg_trgm`** is the only index that helps `LIKE '%search%'` and case-insensitive `ILIKE`, by indexing three-character fragments. **BRIN** on a timestamp column of an append-only table is a few kilobytes that lets a range predicate skip every block whose min and max fall outside the range — for a log table it replaces a B-tree that would be larger than the data. Both are PostgreSQL; other engines have full-text and columnar equivalents that serve the same two needs." },

    { t: "h2", n: "05", text: "What an index costs", id: "cost" },

    { t: "p", text: "Every INSERT writes into every index on the table; every UPDATE of an indexed column deletes and re-inserts an index entry; every DELETE leaves a dead entry until VACUUM. **Indexes are paid for on writes and repaid on reads**, and a table with fifteen indexes — common after years of 'add an index' fixes — spends most of its write time maintaining them, many of which no query uses." },

    { t: "code", lang: "sql", title: "Insert cost against index count (SQLite, 50,000 rows, measured)",
      hl: [1, 2, 3],
      code: `-- INSERT 50,000 orders, no secondary indexes:    54 ms
-- INSERT 50,000 orders, 1 index:                  82 ms
-- INSERT 50,000 orders, 4 indexes:               259 ms       <- five times the cost of the bare table

-- which indexes are used? PostgreSQL keeps counters:
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM   pg_stat_user_indexes WHERE relname = 'orders' ORDER BY idx_scan;
-- indexrelname        | idx_scan | size
-- orders_status       | 0        | 8616 kB       <- never used since stats were reset: a candidate to drop
-- orders_month        | 14       | 8912 kB
-- orders_cust_placed  | 1928311  | 12 MB

-- when not to index: a table of a few hundred rows (the scan is one page); a column with three values queried at 90 %;
-- a column updated on every write; a predicate the index cannot serve anyway (suffix LIKE, a function without an expression index)`,
      caption: "An index that is never scanned is pure write cost. `pg_stat_user_indexes` says which ones those are; drop them with `DROP INDEX CONCURRENTLY` so the table stays available. Build new ones with `CREATE INDEX CONCURRENTLY` for the same reason — a plain CREATE INDEX locks writes for the duration."
    },

    { t: "callout", kind: "tradeoff", title: "One composite index or two single ones?", body: [
      { t: "p", text: "`(customer_id, placed_at)` serves customer lookups, customer + date range, and per-customer ORDER BY — three query shapes for one write cost. `(customer_id)` and `(placed_at)` separately serve customer lookups and date ranges, and the planner can combine them with a bitmap for a query that uses both — but neither serves the per-customer ORDER BY without a sort. **Design from the queries: list the WHERE and ORDER BY shapes that run, and choose the smallest set of indexes whose leftmost prefixes cover them.**" }
    ]},

    { t: "ladder",
      title: "Indexing the orders table for a customer-history page",
      rungs: [
        { level: "bad", label: "An index on every column", code: `CREATE INDEX ON orders (customer_id); CREATE INDEX ON orders (placed_at);
CREATE INDEX ON orders (status);       CREATE INDEX ON orders (order_id);   -- already the primary key`,
          note: "**Four indexes, one of them redundant, one on a three-value column.** The customer page still needs a sort, and every insert pays for all four." },
        { level: "ok", label: "One composite for the page's query", code: `CREATE INDEX orders_cust_placed ON orders (customer_id, placed_at DESC);`,
          note: "**The page's query — this customer, latest first, limit 20 — is a seek and twenty leaf entries.** Date-range reports across all customers are still scans, which may be fine if they run nightly." },
        { level: "best", label: "Composite for the hot path, partial for the exceptions, BRIN for the archive", code: `CREATE INDEX CONCURRENTLY orders_cust_placed ON orders (customer_id, placed_at DESC) INCLUDE (status);
CREATE INDEX CONCURRENTLY orders_open ON orders (placed_at) WHERE status <> 'paid';   -- the 10 % ops looks at
CREATE INDEX CONCURRENTLY orders_placed_brin ON orders USING BRIN (placed_at);       -- a few kB for the nightly range scans`,
          note: "**Three indexes, each justified by a query shape**: the page is covered, the exceptions queue is tiny and fast, the reporting ranges skip blocks. Built concurrently, so the table never stops taking orders." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Design",
      title: "Indexes from the query list",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "The events table (`event_id, customer_id, event_type, occurred_at, payload jsonb`) grows by 50 million rows a month, append-only. These queries run: **Q1** the last 50 events for a customer, newest first, 10,000 times a minute; **Q2** all checkout events in a date range, hourly; **Q3** events whose payload contains `{\"source\": \"mobile\"}`, ad hoc; **Q4** a nightly count of events per day for the last 90 days; **Q5** `WHERE LOWER(event_type) = 'view'` from a legacy report." },
        { t: "p", text: "Propose the smallest set of indexes that serves Q1–Q4 well, say which index type each is and why, and say what you would do about Q5 — index it, or change it." }
      ],
      requirements: [
        "One index per distinct query shape at most, with the column order justified by the leftmost-prefix rule.",
        "A partial index where a query targets a small subset.",
        "A GIN and a BRIN where the predicate and the data shape call for them.",
        "A stated write-cost consideration for an append-only table at that rate."
      ],
      hint: "Q1 is (customer_id, occurred_at DESC). Q2 is a small subset by time: partial. Q3 is containment: GIN with jsonb_path_ops. Q4 is a range on an append-only time column: BRIN, or the B-tree from Q2 if it existed unfiltered. Q5 has a function on the column that a CHECK constraint could make unnecessary.",
      solution: {
        lang: "sql",
        title: "events_indexes.sql",
        code: `-- Q1: the hot path. Equality on customer, order by time descending, LIMIT: one composite, DESC to match the read direction.
CREATE INDEX CONCURRENTLY events_customer_time ON events (customer_id, occurred_at DESC);
--   seek to the customer, read 50 leaf entries, stop. 10,000/min is fine: each is a handful of page reads.

-- Q2: checkouts are a small fraction; hourly range scans over them want a partial B-tree on time.
CREATE INDEX CONCURRENTLY events_checkout_time ON events (occurred_at) WHERE event_type = 'checkout';
--   a few per cent of the table; maintained only when a checkout is inserted.

-- Q3: containment on jsonb -> GIN. jsonb_path_ops is smaller and serves @> only, which is the only predicate here.
CREATE INDEX CONCURRENTLY events_payload_gin ON events USING GIN (payload jsonb_path_ops);
--   the query must be written WHERE payload @> '{"source": "mobile"}' -- not payload->>'source' = 'mobile'.

-- Q4: a nightly 90-day range on an append-only table: BRIN. occurred_at is correlated with insertion order, so block
--   min/max are tight; the index is kilobytes and skips every block outside the range. A B-tree on occurred_at would
--   serve it too but cost gigabytes and a write per event.
CREATE INDEX CONCURRENTLY events_time_brin ON events USING BRIN (occurred_at);

-- Q5: LOWER(event_type) is unsargable and unnecessary. event_type has a handful of values -- fix the data, not the query:
ALTER TABLE events ADD CONSTRAINT events_type_lower CHECK (event_type = LOWER(event_type));   -- after normalising existing rows
--   then the report can say WHERE event_type = 'view' and use ... no index at all, because 'view' is most of the table (5.1).
--   An expression index on LOWER(event_type) would work and would be the wrong fix: it perpetuates the mixed case.

-- write cost: 50M rows/month = ~20 inserts/s average, far higher at peak. Four indexes: one composite (every insert),
-- one partial (checkouts only), one GIN (every insert, the expensive one -- consider fastupdate pending lists), one BRIN
-- (near-free). Review pg_stat_user_indexes after a month and drop what is not scanned.`,
        notes: [
          { t: "p", text: "**Four indexes for four query shapes, and none for Q5.** The composite serves the hot path in a handful of reads; the partial keeps the checkout index at a fraction of the table's size; GIN is the only type that serves containment; BRIN is the right answer for a range on an append-only time column precisely because the table is huge." },
          { t: "p", text: "**Q5 is the question about judgement**: an expression index would make the legacy query fast and leave the data inconsistent. A CHECK constraint after a one-time normalisation removes the reason the function was there. And once the predicate is `event_type = 'view'`, the value is most of the table and no index should be used anyway." },
          { t: "p", text: "**Every CREATE INDEX is CONCURRENTLY** because the table takes writes continuously; and the write-cost note is not decoration — a GIN on a 50-million-row-a-month table is the index most likely to need tuning." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "An index exists on `(customer_id, placed_at)`. Which query cannot use it for a seek?",
          options: [
            "`WHERE customer_id = 5`",
            "`WHERE customer_id = 5 AND placed_at > '2025-06-01'`",
            "`WHERE placed_at > '2025-06-01'` — the leading column is absent, and the dates of all customers are scattered through the index",
            "`WHERE customer_id = 5 ORDER BY placed_at DESC LIMIT 5`"
          ],
          answer: 2,
          why: "A composite B-tree is sorted by its first column, then the second within it. Without a condition on the first, the second column's values are not contiguous, so there is no range to seek — the leftmost-prefix rule."
        }
      ]
    }
  ],

  takeaways: [
    "**A B-tree is a sorted copy of the indexed columns with pointers to rows** — anything contiguous in that order is cheap: equality, range, prefix, MIN/MAX, ORDER BY.",
    "**A suffix match, a function on the column, or a trailing composite column alone cannot use the sort order.**",
    "**Composite indexes serve leftmost prefixes**; put equality columns first and the range or ORDER BY column last.",
    "**A covering index answers the query without visiting the table**; `INCLUDE` adds payload columns to the leaves.",
    "**A partial index over the exceptions is small, cheap to maintain, and used when the query's WHERE implies the index's.**",
    "**An expression index makes a transformed predicate sargable** — and a range on the bare column usually makes it unnecessary.",
    "**A unique index is a constraint** — including on an expression like `LOWER(email)`.",
    "**GIN for containment, full-text and trigram LIKE; GiST for overlaps and distance; BRIN for ranges on append-only time columns.**",
    "**Every write pays for every index**: 54 ms became 259 ms with four. Drop the unscanned ones — `pg_stat_user_indexes` says which.",
    "**Design indexes from the list of query shapes**, choosing the smallest set whose prefixes cover them, and build them CONCURRENTLY."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `LIKE 'abc%'` use a B-tree index while `LIKE '%abc'` does not?",
        options: [
          "Because % is only allowed at the end",
          "A fixed prefix bounds a contiguous range of the sorted leaves — from 'abc' to 'abd' — that the index can seek to; a suffix could match any leaf, so there is nowhere to start (a trigram GIN index is the tool for that)",
          "LIKE never uses indexes",
          "Because of collation"
        ],
        answer: 1,
        why: "Sort order is what a B-tree offers. Collation is the caveat: PostgreSQL serves the prefix only under C collation or text_pattern_ops, and SQLite only with case-sensitive LIKE."
      },
      {
        stem: "When is a partial index the right choice?",
        options: [
          "When the table is small",
          "When queries target a small, consistently defined subset — refunded orders, unprocessed jobs — so the index covers only those rows, is a fraction of the size, and is maintained only when those rows change",
          "When the column has few distinct values",
          "When the query uses OR"
        ],
        answer: 1,
        why: "The planner uses a partial index only when the query's predicate implies the index's WHERE clause, so the subset must be stable and written the same way in queries."
      },
      {
        stem: "What does `INCLUDE (status)` on a PostgreSQL index do?",
        options: [
          "Adds status to the sort key",
          "Stores status in the leaf entries without making it part of the sort, so queries that filter on the key columns and read status become index-only scans",
          "Creates a second index on status",
          "Makes the index partial on status"
        ],
        answer: 1,
        why: "Covering without widening the key: the index stays sorted by its key columns and carries the payload the query needs, so the heap is never visited."
      },
      {
        stem: "A 2-billion-row append-only events table needs range queries on `occurred_at`. Which index and why?",
        options: [
          "A B-tree — it is the default",
          "BRIN — insertion order correlates with time, so per-block min/max values let the scan skip every block outside the range, at a few kilobytes and near-zero write cost; a B-tree would be gigabytes and a write per row",
          "GIN",
          "Hash"
        ],
        answer: 1,
        why: "BRIN is coarse — it identifies blocks, not rows — and that is exactly right when the column is physically ordered and the queries are ranges. On a randomly ordered column it would be useless."
      },
      {
        stem: "Inserts into a table are slow; it has eleven indexes. What is the first thing to check?",
        options: [
          "Whether the table needs a twelfth index",
          "Which indexes are never scanned — pg_stat_user_indexes idx_scan — because every insert pays for every index and an unscanned one is pure cost; drop those CONCURRENTLY",
          "Whether the primary key is clustered",
          "The transaction isolation level"
        ],
        answer: 1,
        why: "Index count is the usual cause of slow writes on a mature table. The usage counters make the cull objective; CONCURRENTLY keeps the table available while it happens."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does a B-tree index work, and what queries can it speed up?",
        strong: "It keeps the indexed values sorted at the leaf pages with a small tree of guide pages above, so any value is found in a few page reads regardless of table size, and each leaf entry points at its row. Anything contiguous in that sort order is cheap: equality, a range, a string prefix, MIN and MAX, and ORDER BY on the indexed columns — no sort node. Anything scattered is not: a suffix match, a function applied to the column, or a predicate on a later column of a composite index without the earlier ones. The price is a write into the index on every insert and on every update of an indexed column.",
        answer: [
          { t: "p", text: "Deriving the capabilities from 'sorted leaves' rather than listing them is what shows the model is understood." }
        ]
      },
      {
        level: "core",
        q: "How do you decide the column order in a composite index?",
        strong: "From the queries. A composite index is sorted by its first column, then the next within equal values, so it serves predicates on a leftmost prefix. Columns used with equality go first, in the order that leaves the most selective prefix for the queries that use fewer columns; the column used for a range or an ORDER BY goes last, because a range on it is contiguous only within fixed values of the earlier columns. For 'this customer's latest orders' that is (customer_id, placed_at DESC): seek to the customer, read forward in time order, stop at the limit. I would then check whether a single-column index on the leading column is now redundant and drop it.",
        answer: [
          { t: "p", text: "The 'equality first, range last' rule with the reason behind it — contiguity — is the answer." }
        ]
      },
      {
        level: "advanced",
        q: "A query uses `WHERE LOWER(email) = 'a@x.com'`. How do you make it fast?",
        strong: "Three options, in order of preference. Fix the data: normalise emails to lower case on write with a CHECK constraint and query the bare column — the predicate becomes sargable and a plain unique index on email serves it and enforces uniqueness. If the data cannot be changed, an expression index on LOWER(email) serves the predicate exactly as written, and a unique version of it enforces case-insensitive uniqueness, which is usually what was wanted. Or in PostgreSQL the citext type makes the column compare case-insensitively with an ordinary index. What I would not do is leave the function on the column with a plain index on email, because that index cannot be used for that predicate at all.",
        answer: [
          { t: "p", text: "Preferring the schema fix, then the expression index, then the type, shows the priorities of someone who maintains databases rather than just queries them." }
        ]
      }
    ]
  }
});

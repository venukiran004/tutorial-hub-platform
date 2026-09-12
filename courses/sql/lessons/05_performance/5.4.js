/* ============================================================================
   LESSON 5.4 — Sargability: Predicates an Index Can Use
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "**Two predicates that select the same rows can differ by a factor of a thousand in cost, and the difference is whether the index can be seeked.** `substr(placed_at, 1, 7) = '2025-03'` and `placed_at >= '2025-03-01' AND placed_at < '2025-04-01'` are the same rows; one scans 400,000 rows and one reads a slice of an index. A predicate an index can serve is called sargable — search-argument-able — and the rules for writing one are short: the column bare on one side, a comparison the sort order understands on the other, and nothing in between.",

  objectives: [
    "State the sargability rule and apply it to functions, casts, arithmetic, wildcards, OR and NOT",
    "Rewrite the common unsargable predicates into equivalent sargable ones",
    "Replace OFFSET pagination with keyset pagination and explain the cost difference",
    "Recognise the cases where the rewrite is not enough and an expression, partial or trigram index is the answer"
  ],

  prerequisites: ["5.3", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The rule", id: "rule" },

    { t: "p", text: "An index stores the column's values in sorted order. A predicate can use that order only if it compares **the stored value itself** — not a function of it, not a cast of it, not the result of arithmetic on it — against something that can be computed before the scan begins. **Column on one side, bare; a constant, parameter or other table's column on the other; and an operator the B-tree understands: `=`, `<`, `>`, `BETWEEN`, `IN`, `IS NULL`, prefix `LIKE`.** Everything that breaks this rule forces the engine to compute the left side for every row, which is a scan." },

    { t: "code", lang: "sql", title: "The same rows, sargable and not (SQLite, 400,000 orders, index on placed_at, measured)",
      hl: [2, 5, 8, 11, 14],
      code: `SELECT COUNT(*) FROM orders WHERE substr(placed_at, 1, 7) = '2025-03';
--   SCAN orders                                                                          22.8 ms   function on the column
SELECT COUNT(*) FROM orders WHERE placed_at >= '2025-03-01' AND placed_at < '2025-04-01';
--   SEARCH orders USING COVERING INDEX orders_placed (placed_at>? AND placed_at<?)       0.9 ms   bare column, range

SELECT COUNT(*) FROM orders WHERE placed_at LIKE '%:30:00';
--   SCAN orders                                                                          27.6 ms   leading wildcard
SELECT COUNT(*) FROM orders WHERE placed_at LIKE '2025-03%';
--   SEARCH orders USING COVERING INDEX orders_placed (placed_at>? AND placed_at<?)       1.6 ms   prefix: rewritten to a range internally

-- PostgreSQL adds the implicit-cast case: a TEXT column compared with an INTEGER literal casts every row
-- WHERE zip_code = 12345        -> Seq Scan, Filter: ((zip_code)::integer = 12345)     -- and errors on 'SW1A 1AA'
-- WHERE zip_code = '12345'      -> Index Scan                                           -- text against text

-- and arithmetic: the column must be alone
-- WHERE placed_at + INTERVAL '1 day' > now()      -> scan: the engine computes placed_at + 1 day per row
-- WHERE placed_at > now() - INTERVAL '1 day'      -> seek: the arithmetic is on the constant side`,
      caption: "Move the work to the side that is not the column. `substr(placed_at, …)` becomes a range on `placed_at`; `placed_at + 1 day > x` becomes `placed_at > x − 1 day`; `zip = 12345` becomes `zip = '12345'`. The rows are identical; the engine's ability to seek is not."
    },

    { t: "dl", items: [
      ["Sargable", "A predicate the engine can turn into an index seek or range: a bare indexed column compared with a value using an operator the index supports."],
      ["Function on the column", "`LOWER(col)`, `DATE(col)`, `col::TEXT`, `COALESCE(col, 0)` — the stored value is transformed before comparison; the index order no longer applies. Fix: move the transform to the other side, or an expression index."],
      ["Implicit cast on the column", "Comparing a column with a literal of another type may cast the column, row by row. Fix: cast the literal, or match the types."],
      ["Leading wildcard", "`LIKE '%x'` or `'%x%'`: the match can begin anywhere in the sorted value. Fix: a trigram GIN index, or full-text search, or reverse the string and index that for suffix matches."],
      ["Negation", "`<>`, `NOT IN`, `NOT LIKE`: the rows wanted are everything except a slice — scattered, so a scan; and usually most of the table anyway. Fix: rarely needed; if selective, an anti-join (2.3) on an indexed key."],
      ["OR across columns", "`a = 1 OR b = 2` needs two ranges from two indexes. PostgreSQL combines them with a BitmapOr; engines without that need a UNION rewrite."]
    ]},

    { t: "h2", n: "02", text: "The rewrites", id: "rewrites" },

    { t: "table",
      head: ["Unsargable", "Why", "Sargable rewrite"],
      rows: [
        ["`WHERE DATE(ts) = '2025-03-15'`", "Function on the column", "`WHERE ts >= '2025-03-15' AND ts < '2025-03-16'`"],
        ["`WHERE EXTRACT(year FROM ts) = 2025`", "Function on the column", "`WHERE ts >= '2025-01-01' AND ts < '2026-01-01'`"],
        ["`WHERE LOWER(email) = 'a@x.com'`", "Function on the column", "Store lower-case; or an expression index on `LOWER(email)`"],
        ["`WHERE amount * 1.2 > 100`", "Arithmetic on the column", "`WHERE amount > 100 / 1.2`"],
        ["`WHERE ts + INTERVAL '7 days' > now()`", "Arithmetic on the column", "`WHERE ts > now() - INTERVAL '7 days'`"],
        ["`WHERE COALESCE(country, 'xx') = 'GB'`", "Function on the column", "`WHERE country = 'GB'` (NULL is not 'GB' either way)"],
        ["`WHERE zip = 12345` (TEXT column)", "Implicit cast of the column", "`WHERE zip = '12345'`"],
        ["`WHERE name LIKE '%son'`", "Leading wildcard", "Trigram GIN index; or index `REVERSE(name)` and query `LIKE 'nos%'`"],
        ["`WHERE status <> 'paid'`", "Negation", "If selective: `WHERE status IN ('refunded', 'cancelled')`, or a partial index `WHERE status <> 'paid'`"],
        ["`WHERE a = 1 OR b = 2`", "Two columns", "PostgreSQL: fine (BitmapOr). Elsewhere: `… WHERE a = 1 UNION … WHERE b = 2`"],
        ["`WHERE id IN (SELECT …)` with a huge list", "Not unsargable — fine", "Leave it; the planner hashes the list"],
        ["`ORDER BY ts DESC LIMIT 20` with no index on ts", "A sort of the whole table for 20 rows", "Index on `ts` (or `(filter_col, ts DESC)`): the ORDER BY is the index order"]
      ]
    },

    { t: "callout", kind: "mental", title: "Ask what the index would have to do", body: [
      { t: "p", text: "For any predicate, picture the sorted leaves and ask: **can I find the first matching entry and read forward until the last?** If the answer needs a computation per entry — a function, a cast, a suffix check — the index cannot help, and the rewrite is whatever makes the answer 'yes'. If no rewrite makes it 'yes', the predicate needs a different index: an expression index for the function, a partial index for the subset, a trigram index for the substring." }
    ]},

    { t: "h2", n: "03", text: "OR, NOT and the shapes that surprise", id: "shapes" },

    { t: "p", text: "`customer_id = 4242 OR placed_at = '2025-03-03 10:30:00'` needs rows from two different regions of two different indexes. PostgreSQL, SQLite and SQL Server union the two index results with a bitmap or a multi-index OR; MySQL's index merge does the same when it can. **Where the engine cannot, the rewrite is a UNION of two sargable queries.** Negations are different: `status <> 'paid'` is 10 % of the table here and the planner may still scan, because 'everything except' cannot be read as a range — a partial index on the exceptions, or an IN list of the wanted values, gives it something to seek." },

    { t: "code", lang: "sql", title: "OR across two indexes, and the partial index that makes a negation cheap (measured)",
      hl: [2, 7, 8],
      code: `SELECT order_id FROM orders WHERE customer_id = 4242 OR placed_at = '2025-03-03 10:30:00';
--   MULTI-INDEX OR | SEARCH orders USING INDEX orders_customer (customer_id=?) | SEARCH orders USING INDEX orders_placed (placed_at=?)   0.0 ms
--   PostgreSQL: BitmapOr over two Bitmap Index Scans, then one Bitmap Heap Scan. MySQL: index_merge union.
--   engines without it: SELECT … WHERE customer_id = 4242 UNION SELECT … WHERE placed_at = '…'

-- a negation over a small remainder: give the planner a range to seek by naming the values, or index the exceptions
SELECT order_id FROM orders WHERE status IN ('refunded', 'cancelled');                  -- two seeks on the status index
CREATE INDEX orders_not_paid ON orders (placed_at) WHERE status <> 'paid';             -- the 10 % that ops looks at
SELECT order_id FROM orders WHERE status <> 'paid' AND placed_at >= '2025-03-01';       -- the partial index serves it`,
      caption: "An OR that mixes an indexed column with an unindexed one is a scan regardless — one side of the OR has nowhere to seek, so the whole predicate is evaluated per row. Check that both sides are sargable before expecting a bitmap."
    },

    { t: "h2", n: "04", text: "Pagination: OFFSET reads everything it skips", id: "pagination" },

    { t: "p", text: "`ORDER BY placed_at LIMIT 20 OFFSET 200000` must produce the first 200,020 rows in order and discard 200,000 of them. Without an index on the sort key it sorts the whole table for every page; with one it walks 200,020 index entries. **Page 10,000 costs 10,000 times page 1, and a row inserted above the cursor shifts every later page.** Keyset pagination replaces the offset with a predicate on the last row seen — `WHERE (placed_at, order_id) > (last_ts, last_id)` — which is a seek into the index followed by twenty entries, on every page, forever." },

    { t: "code", lang: "sql", title: "Page 10,000 three ways (measured)",
      hl: [2, 5, 9, 10],
      code: `SELECT order_id, placed_at FROM orders ORDER BY placed_at, order_id LIMIT 20 OFFSET 200000;
--   SCAN orders | USE TEMP B-TREE FOR ORDER BY                                        2134.7 ms   -- no index on the sort key: sort 400,000, skip 200,000

CREATE INDEX orders_placed_id ON orders (placed_at, order_id);
--   SCAN orders USING COVERING INDEX orders_placed_id                                    2.1 ms   -- walk 200,020 index entries in order, keep 20

-- keyset: remember the last row of the previous page and seek past it
SELECT order_id, placed_at FROM orders
WHERE  (placed_at, order_id) > ('2025-07-01 00:00:00', 300000)     -- row-value comparison: PostgreSQL, SQLite, MySQL 8; SQL Server: expand it
ORDER  BY placed_at, order_id LIMIT 20;
--   SEARCH orders USING COVERING INDEX orders_placed_id (placed_at>?)                    0.0 ms   -- seek, twenty entries, done -- on every page

-- the row-value form expanded, for engines without it:
-- WHERE placed_at > :ts OR (placed_at = :ts AND order_id > :id)`,
      caption: "Keyset needs a unique, total ordering — the timestamp plus the primary key as a tie-breaker (1.1) — and the client must carry the last row's keys instead of a page number. It cannot jump to page 300 directly, which is the trade: no random access, in exchange for every page costing the same as the first."
    },

    { t: "viz",
      title: "OFFSET walks, keyset seeks",
      caption: "Both queries want the twenty rows after position 200,000 in placed_at order. OFFSET must produce and discard everything before them — from a sort, or from the index — and the cost grows with the page number. Keyset seeks straight to the last row seen and reads twenty entries, at the same cost for page 2 and page 20,000.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Two horizontal index bars. Top: OFFSET, shaded from the left edge across 200,000 entries to a small highlighted window of 20, labelled walked and discarded. Bottom: keyset, a single marker at the last seen row and the same 20-entry window, labelled seek.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="40">LIMIT 20 OFFSET 200000</text>
    <text x="30" y="140">WHERE (placed_at, order_id) &gt; (last_ts, last_id) LIMIT 20</text>
  </g>
  <rect x="30" y="56" width="820" height="26" rx="4" style="fill:none;stroke:var(--ink-3)" stroke-width="1.2"/>
  <rect x="30" y="56" width="560" height="26" rx="4" style="fill:var(--crit);fill-opacity:.25"/>
  <rect x="590" y="56" width="24" height="26" style="fill:var(--good);fill-opacity:.6"/>
  <text x="310" y="74" class="s-sub" text-anchor="middle" style="fill:var(--crit)">200,000 entries produced in order and discarded</text>
  <text x="602" y="100" class="s-sub" text-anchor="middle" style="fill:var(--good)">20 kept</text>
  <text x="740" y="74" class="s-sub" text-anchor="middle">rest of the index</text>
  <rect x="30" y="156" width="820" height="26" rx="4" style="fill:none;stroke:var(--ink-3)" stroke-width="1.2"/>
  <rect x="590" y="156" width="24" height="26" style="fill:var(--good);fill-opacity:.6"/>
  <line x1="590" y1="146" x2="590" y2="192" style="stroke:var(--accent)" stroke-width="2"/>
  <text x="590" y="206" class="s-sub" text-anchor="middle" style="fill:var(--accent)">seek to (last_ts, last_id)</text>
  <text x="310" y="174" class="s-sub" text-anchor="middle">never read</text>
  <text x="602" y="146" class="s-sub" text-anchor="middle" style="fill:var(--good)">20 kept</text>
</svg>`
    },

    { t: "ladder",
      title: "Orders placed on a given day, from a Python service",
      rungs: [
        { level: "bad", label: "Format the date and compare", code: `cur.execute("SELECT * FROM orders WHERE TO_CHAR(placed_at, 'YYYY-MM-DD') = %s", (day,))`,
          note: "**A function on the column, every row, every call.** Fast on the dev database with 12 orders; a full scan on the one with 12 million." },
        { level: "ok", label: "Cast the column to DATE", code: `cur.execute("SELECT * FROM orders WHERE placed_at::DATE = %s", (day,))`,
          note: "**Still a function on the column.** Correct rows, and an expression index on `placed_at::DATE` would serve it — an index that exists only to compensate for the predicate's shape." },
        { level: "best", label: "A half-open range on the bare column", code: `cur.execute("SELECT * FROM orders WHERE placed_at >= %s AND placed_at < %s", (day, day + timedelta(days=1)))`,
          note: "**Sargable against the plain index on placed_at**, correct for every timestamp precision, and the arithmetic happens once in Python rather than once per row in the database." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Eight predicates to make seekable",
      difficulty: "advanced",
      minutes: 26,
      body: [
        { t: "p", text: "Each WHERE below runs against a table with B-tree indexes on every column it mentions. For each, say whether it is sargable as written; if not, give the rewrite that returns the same rows and can seek — or name the index type needed when no rewrite exists." },
        { t: "code", lang: "sql", code: `-- 1  WHERE YEAR(placed_at) = 2025 AND MONTH(placed_at) = 3
-- 2  WHERE LOWER(country) = 'gb'
-- 3  WHERE amount / 100 >= 5
-- 4  WHERE customer_id IN (1, 2, 3) OR customer_id = 4
-- 5  WHERE name LIKE '%kettle%'
-- 6  WHERE order_ref = 10045                  -- order_ref is TEXT
-- 7  WHERE placed_at::DATE BETWEEN '2025-03-01' AND '2025-03-15'
-- 8  ORDER BY placed_at DESC LIMIT 20 OFFSET 40000    -- an API's page 2001` }
      ],
      requirements: [
        "A verdict and a rewrite (or index type) for each of the eight.",
        "For 8, the keyset form and what the client must carry.",
        "One sentence per rewrite on why the rows are identical."
      ],
      hint: "1 and 7 are ranges in disguise. 2 depends on whether the data can be normalised. 4 is already fine. 5 has no B-tree rewrite. 6 is the implicit cast. 8 is keyset.",
      solution: {
        lang: "sql",
        title: "sargable_rewrites.sql",
        code: `-- 1  Not sargable: functions on placed_at. Rewrite as a half-open range on the bare column:
      WHERE placed_at >= '2025-03-01' AND placed_at < '2025-04-01'
      -- identical rows: every timestamp with year 2025 and month 3 lies in exactly that interval.

-- 2  Not sargable: LOWER(country). If the data can be normalised, store lower case and WHERE country = 'gb';
      -- otherwise an expression index ON (LOWER(country)) serves it as written. With two-letter codes, the fix is a CHECK constraint.

-- 3  Not sargable: arithmetic on amount. Move it to the constant side:
      WHERE amount >= 500
      -- identical: amount / 100 >= 5 iff amount >= 500 (for positive divisors; integer division would need care).

-- 4  Sargable as written: an IN list and an OR on the SAME indexed column collapse to WHERE customer_id IN (1, 2, 3, 4) -- four seeks.

-- 5  Not sargable, and no rewrite: a substring match cannot use sort order. Index type: GIN with pg_trgm --
      CREATE INDEX products_name_trgm ON products USING GIN (name gin_trgm_ops);  -- then LIKE '%kettle%' and ILIKE use it.

-- 6  Not sargable on PostgreSQL: the TEXT column is cast to integer per row (and 'SW1A 1AA' would raise). Cast the literal:
      WHERE order_ref = '10045'
      -- identical rows for values that are numeric text; safer for the ones that are not.

-- 7  Not sargable: a cast on the column. Range on the bare column, remembering BETWEEN's inclusive end (1.3):
      WHERE placed_at >= '2025-03-01' AND placed_at < '2025-03-16'
      -- identical: every timestamp whose date is 1..15 March.

-- 8  Sargable but O(page number): OFFSET 40000 walks 40,020 entries. Keyset:
      WHERE (placed_at, order_id) < (:last_ts, :last_id) ORDER BY placed_at DESC, order_id DESC LIMIT 20
      -- the client carries the last row's (placed_at, order_id) instead of a page number; each page is a seek plus 20 entries.
      -- identical rows for a stable ordering; differs if rows are inserted between pages -- keyset does not double-show them, OFFSET can.`,
        notes: [
          { t: "p", text: "**Five of eight are functions or arithmetic on the column, and every one moves to the other side.** The rows are identical because the rewrite is algebra, not approximation — a half-open interval is exactly the set of timestamps with that year and month." },
          { t: "p", text: "**5 is the one with no rewrite**: sort order cannot find a substring. The trigram index is the tool, and knowing that there is no clever predicate for it saves an afternoon." },
          { t: "p", text: "**8 is the one that is technically sargable and still wrong**: the index is used, and 40,020 entries are walked to return 20. Keyset is the same index used properly, and the client contract — carry keys, not page numbers — is the price." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`WHERE placed_at::DATE = '2025-03-15'` scans a table that has an index on placed_at. Why, and what is the fix?",
          options: [
            "The index is on the wrong column",
            "The cast is applied to the column, so every row's value must be computed before comparison and the sorted index order cannot be used; rewrite as `placed_at >= '2025-03-15' AND placed_at < '2025-03-16'`",
            "DATE comparisons are never indexed",
            "Add DISTINCT"
          ],
          answer: 1,
          why: "Sargability is about the column being bare. The half-open range compares the stored timestamps directly against two constants, which is a contiguous slice of the index."
        }
      ]
    }
  ],

  takeaways: [
    "**A sargable predicate is a bare indexed column compared with a pre-computable value using an operator the index understands.**",
    "**Move functions, casts and arithmetic to the constant side**: `DATE(ts) = d` becomes a half-open range; `ts + 1 day > x` becomes `ts > x − 1 day`.",
    "**A prefix LIKE is a range; a leading wildcard is not** — trigram GIN or a reversed-string index for suffixes.",
    "**A TEXT column compared with a number casts every row**; cast the literal instead.",
    "**Negations cannot be read as a range**; name the wanted values with IN, or index the exceptions with a partial index.",
    "**OR across two indexed columns is fine where the engine has bitmap or index-merge**; elsewhere rewrite as UNION, and an OR with an unindexed side is a scan regardless.",
    "**OFFSET produces and discards everything it skips** — page n costs n times page 1, and inserts shift the pages.",
    "**Keyset pagination seeks past the last row seen** with a row-value comparison on (sort key, primary key); every page costs the same.",
    "**ORDER BY … LIMIT without an index on the sort key sorts the whole table for a handful of rows.**",
    "**When no rewrite exists, change the index**: expression index for the function, partial for the subset, trigram for the substring."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which of these is sargable on a column `amount` with a B-tree index?",
        options: [
          "`WHERE amount * 1.2 > 100`",
          "`WHERE ROUND(amount) = 50`",
          "`WHERE amount > 100 / 1.2` — the column is bare and the arithmetic is on the constant",
          "`WHERE COALESCE(amount, 0) > 50`"
        ],
        answer: 2,
        why: "Only the third compares the stored value directly. The others transform the column per row, which discards the index's sort order."
      },
      {
        stem: "Why is `LIMIT 20 OFFSET 200000` slow even with an index on the ORDER BY column?",
        options: [
          "OFFSET disables indexes",
          "The engine must walk 200,020 index entries in order and discard 200,000 of them; the cost grows linearly with the page number — keyset pagination seeks straight to the last row seen",
          "LIMIT forces a sort",
          "It is not slow with an index"
        ],
        answer: 1,
        why: "An index makes each entry cheap but does not change how many are visited. OFFSET's cost is the offset; keyset's cost is the page size."
      },
      {
        stem: "`WHERE name LIKE '%kettle%'` must be fast. What is the answer?",
        options: [
          "Rewrite as a range",
          "A trigram GIN index (`pg_trgm`) — no B-tree rewrite exists for a substring, because the match can start anywhere in the sorted value",
          "An expression index on LOWER(name)",
          "A partial index"
        ],
        answer: 1,
        why: "Sort order cannot locate an arbitrary substring. Trigram indexes decompose each value into three-character fragments and can find any substring of three characters or more."
      },
      {
        stem: "What does keyset pagination require that OFFSET pagination does not?",
        options: [
          "A larger index",
          "A total, unique ordering — sort key plus primary key — and a client that carries the last row's key values instead of a page number; in exchange it cannot jump to an arbitrary page",
          "A materialised view",
          "Nothing; it is a drop-in replacement"
        ],
        answer: 1,
        why: "The predicate `> (last_ts, last_id)` only works if the ordering is total and the client knows where it stopped. Random access to page 300 is the feature given up."
      },
      {
        stem: "`WHERE customer_id = 5 OR notes LIKE '%urgent%'` with an index on customer_id. What happens?",
        options: [
          "An index seek on customer_id plus a filter",
          "A full scan — one side of the OR has no index to seek, so the whole predicate must be evaluated per row; bitmap OR only helps when every branch is sargable",
          "A BitmapOr on both",
          "An error"
        ],
        answer: 1,
        why: "An OR is only as sargable as its least sargable branch. The rows that satisfy the LIKE could be anywhere, so the engine cannot restrict the scan by the customer_id branch alone."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does 'sargable' mean and how do you make a predicate sargable?",
        strong: "A sargable predicate is one an index can serve with a seek or a range: the indexed column bare on one side, a value the engine can compute before scanning on the other, and an operator the B-tree understands — equality, inequality, BETWEEN, IN, prefix LIKE, IS NULL. Anything that transforms the column per row breaks it: a function, a cast, arithmetic, a leading wildcard. The fix is to move the transformation to the constant side — a date function becomes a half-open range, arithmetic moves across the comparison, a literal gets the cast instead of the column. When no rewrite exists, the index changes instead: an expression index for the function, a partial index for the subset, a trigram index for the substring.",
        answer: [
          { t: "p", text: "The 'move it to the constant side' rule with three examples, and the fallback to changing the index, covers the ground." }
        ]
      },
      {
        level: "core",
        q: "Why is OFFSET pagination slow and what do you use instead?",
        strong: "OFFSET n must produce the first n rows in order and discard them — with an index on the sort key it walks n entries, without one it sorts the whole table — so the cost of a page is proportional to its position, and rows inserted above the cursor shift later pages so results repeat or skip. Keyset pagination replaces the offset with a predicate on the last row seen — WHERE (sort_key, id) > (last_sort_key, last_id) — which is an index seek followed by one page of entries, the same cost for every page and stable under inserts. It needs a unique total ordering, so the primary key is added as a tie-breaker, and the client carries the last keys rather than a page number, which means it cannot jump to an arbitrary page.",
        answer: [
          { t: "p", text: "Both halves — the cost model and the client contract — are what make this a complete answer." }
        ]
      },
      {
        level: "advanced",
        q: "A predicate is sargable, the index exists, and the planner still scans. What do you check?",
        strong: "Selectivity first: if the predicate keeps a large fraction of the table, the scan is the right plan and the planner is doing its job — I check the estimate against the actual in EXPLAIN ANALYZE. Then statistics: a stale histogram can make a selective range look wide. Then the shape match: an expression index must match the query's expression exactly, a partial index's WHERE must be implied by the query's, a composite index must be used from its leftmost column, and a collation can stop a prefix LIKE from being a range. Then the join context: a predicate that is sargable in isolation may be evaluated after a join rather than pushed down, if it references a column the outer join padded with NULLs. And finally whether the index is bloated or invalid — a failed CONCURRENTLY build leaves an index the planner will not use.",
        answer: [
          { t: "p", text: "Starting from 'maybe the scan is right' and working through estimate, shape and validity is the disciplined answer." }
        ]
      }
    ]
  }
});

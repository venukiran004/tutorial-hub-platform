/* ============================================================================
   LESSON 2.6 — Set Operations and Duplicates
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**UNION removes duplicates and UNION ALL does not — and the one you reach for by habit is usually the wrong one.** UNION sorts or hashes every row to find repeats, which costs time and, worse, silently deletes rows that were legitimately the same. The set operations stack results vertically where joins pair them horizontally, and the duplicate question they raise is the same one every ingestion faces: what makes two rows the same, how many copies are there, and which one survives.",

  objectives: [
    "Use UNION, UNION ALL, INTERSECT and EXCEPT and predict which rows each returns",
    "Explain why UNION ALL is the default and UNION is a de-duplication step you should be choosing on purpose",
    "Find duplicates by a business key with GROUP BY … HAVING, and count rows, ids and entities separately",
    "Remove duplicates keeping one chosen row, with DISTINCT, ROW_NUMBER, or a DELETE that names the survivor"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Stacking results", id: "stacking" },

    { t: "p", text: "A set operation combines two queries with the same number of columns, matched by position, into one result. **UNION ALL appends. UNION appends and then removes duplicate rows. INTERSECT keeps rows present in both. EXCEPT keeps rows in the first and not the second.** All of them compare whole rows, and — unlike WHERE — they treat two NULLs as the same for this purpose, so `SELECT NULL UNION SELECT NULL` is one row. The ORDER BY at the end applies to the combined result, not to the last query." },

    { t: "code", lang: "sql", title: "The four operations on customer ids from two tables",
      hl: [1, 4, 7, 10, 11],
      code: `SELECT customer_id FROM orders UNION SELECT customer_id FROM events ORDER BY 1;
-- 1, 2, 3, 4, 5, 6, 7, 8                     (8 rows: everyone who ordered or clicked, once each)

SELECT COUNT(*) FROM (SELECT customer_id FROM orders UNION ALL SELECT customer_id FROM events) u;
-- 30                                          (12 order rows + 18 event rows: nothing removed)

SELECT customer_id FROM orders INTERSECT SELECT customer_id FROM events ORDER BY 1;
-- 1, 2, 3, 5, 6                               (ordered AND clicked)

SELECT customer_id FROM events EXCEPT SELECT customer_id FROM orders;                -- 8 (Mara: clicked, never ordered)
SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM events ORDER BY 1;     -- 4, 7 (Dalia, Iker: ordered, never clicked)

-- a timeline from two tables: tag the source, align the columns by position, sort the whole thing
SELECT 'order' AS kind, order_id AS id, placed_at AS ts FROM orders WHERE customer_id = 1
UNION ALL
SELECT 'event',         event_id,       occurred_at     FROM events WHERE customer_id = 1
ORDER  BY ts;
-- order 100 · order 102 · event 1 · event 2 · event 3 · event 4 · order 108 · event 5     (8 rows, interleaved by time)`,
      caption: "INTERSECT and EXCEPT are the set-algebra spellings of the semi and anti joins in 2.3 — fine on keys, awkward when you need other columns, because they compare whole rows and a differing column makes two rows 'different'. The tagged UNION ALL is the pattern for merging event streams."
    },

    { t: "dl", items: [
      ["`UNION ALL`", "Concatenate. No comparison, no sort, no rows lost. The default: use it unless you have a reason to de-duplicate."],
      ["`UNION`", "Concatenate, then remove rows that are identical across every column. A DISTINCT over the combined result — with its cost and its silent deletions."],
      ["`INTERSECT`", "Rows that appear in both inputs, de-duplicated. `INTERSECT ALL` keeps multiplicity."],
      ["`EXCEPT` (`MINUS` in Oracle)", "Rows in the first input and not in the second, de-duplicated. Order of operands matters."],
      ["Positional matching", "Columns pair up by position, not by name; the first query's names win. A type mismatch in any position is an error; a swapped pair of same-typed columns is a silent corruption."],
      ["Duplicate", "Two rows that are 'the same' under some key: the whole row (DISTINCT's view), a business key (name + birthdate), or an id. Which key is the question."]
    ]},

    { t: "callout", kind: "trap", title: "UNION deletes rows you meant to keep", body: [
      { t: "p", text: "Two branches of a report that each produce `(product, quantity)` — from January and from February — combined with UNION lose every product that sold the same quantity in both months, because the rows are identical. **UNION is not 'combine'; it is 'combine and DISTINCT'.** The same query with UNION ALL keeps both rows, and a tag column (`'jan' AS month`) makes them distinct in a way that survives even UNION. Reach for UNION only when you can say which duplicates you expect and want gone." }
    ]},

    { t: "h2", n: "02", text: "Positional alignment", id: "alignment" },

    { t: "p", text: "The engine pairs the first column with the first, the second with the second, and checks that each pair has compatible types. It does not check names. `SELECT name, country FROM customers UNION SELECT name, department FROM employees` runs happily and puts departments into a column labelled `country` — and if the columns had been written `department, name`, the names would land in the country column with no error. **Every branch of a set operation should list its columns explicitly, in the same order, with the same names, and the second branch's names should match the first's even though the engine ignores them.**" },

    { t: "code", lang: "sql", title: "The engine matches by position and believes whatever you put there",
      code: `SELECT name, country FROM customers
UNION
SELECT name, department FROM employees;       -- runs: TEXT under TEXT. 'exec' and 'sales' are now countries.
-- Nadia | exec · Emeka | NG · Viktor | sales ...

SELECT name, signed_up FROM customers
UNION ALL
SELECT name, salary FROM employees;           -- ERROR: DATE and INTEGER cannot be unioned. The type check caught this one.

-- the habit: same columns, same order, same names, a source tag, and UNION ALL
SELECT 'customer' AS source, customer_id AS id, name FROM customers
UNION ALL
SELECT 'employee' AS source, employee_id AS id, name FROM employees;`,
      caption: "A type mismatch is caught; a semantic mismatch between same-typed columns is not. Naming the columns in every branch does nothing for the engine and everything for the reviewer."
    },

    { t: "h2", n: "03", text: "Finding duplicates", id: "finding" },

    { t: "p", text: "A staging table after a re-run of the loader holds every customer once, two of them twice, and one of them a third time under a fresh id. **Three counts describe the damage — rows, distinct ids, distinct entities by business key — and they are three different numbers.** The GROUP BY … HAVING COUNT(*) > 1 over the business key lists the offenders; the counts say how many rows will go when they are removed." },

    { t: "code", lang: "sql", title: "A staging table with three kinds of duplicate, and the three counts",
      hl: [7, 11, 12],
      code: `WITH staged AS (                                                 -- the loader ran twice for two customers,
  SELECT * FROM customers                                        -- and once more with a new surrogate id
  UNION ALL SELECT * FROM customers WHERE customer_id IN (2, 5)
  UNION ALL SELECT 9, 'Bruno', 'DE', 'standard', DATE '2024-12-19'
)
SELECT name, country, signed_up, COUNT(*) AS copies
FROM   staged GROUP BY name, country, signed_up HAVING COUNT(*) > 1 ORDER BY 1;
-- Bruno | DE | 2024-12-19 | 3        <- two exact copies (id 2) and one under id 9
-- Emeka | NG | 2025-02-02 | 2

SELECT COUNT(*) AS rows_, COUNT(DISTINCT customer_id) AS distinct_ids,
       COUNT(DISTINCT (name, country, signed_up)) AS distinct_people        -- PostgreSQL, DuckDB: a row constructor
FROM   staged;
-- 11 | 9 | 8
-- eleven rows; nine ids because id 9 is new; eight people because Bruno-9 is Bruno-2. DISTINCT * would leave 9.`,
      caption: "`DISTINCT *` removes only exact copies — it would keep Bruno under both ids, because the id column differs. Duplicates by business key are found by grouping on the key and nothing else; the id is what you are trying to reconcile, not part of the identity."
    },

    { t: "viz",
      title: "Three counts, three answers",
      caption: "Eleven staged rows. Whole-row DISTINCT collapses the exact copies and leaves nine. The business key collapses Bruno-9 into Bruno-2 as well and leaves eight. Which count is 'the number of customers' depends on which key you decide is identity.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Three horizontal bars: 11 staged rows, 9 distinct ids after whole-row DISTINCT, 8 distinct people by business key; the rows that disappear at each step are labelled.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="46">staged rows</text><text x="30" y="116">DISTINCT *  (exact copies removed)</text><text x="30" y="186">by business key (name, country, signed_up)</text>
  </g>
  <rect x="330" y="30" width="440" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.3;stroke:var(--ink-3)" stroke-width="1"/>
  <rect x="330" y="100" width="360" height="22" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)" stroke-width="1"/>
  <rect x="330" y="170" width="320" height="22" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)" stroke-width="1"/>
  <g class="s-label">
    <text x="780" y="46">11</text><text x="700" y="116">9</text><text x="660" y="186">8</text>
  </g>
  <g class="s-sub">
    <text x="330" y="76" style="fill:var(--crit)">− Bruno (id 2) copy · − Emeka (id 5) copy</text>
    <text x="330" y="146" style="fill:var(--crit)">− Bruno (id 9): same person, different id — invisible to DISTINCT *</text>
    <text x="330" y="216">what remains is one row per person; which of Bruno's ids survives is a choice (section 04)</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "Removing duplicates, keeping the right one", id: "removing" },

    { t: "p", text: "Removing duplicates needs a rule for which copy survives — the lowest id, the most recent load, the one with the fewest NULLs. `DISTINCT` has no rule; it keeps one arbitrary exact copy and cannot see business-key duplicates at all. **`ROW_NUMBER() OVER (PARTITION BY key ORDER BY preference)` numbers the copies in preference order, and keeping `rn = 1` is a de-duplication with the survivor named.** 3.2 covers ROW_NUMBER properly; here it is the tool for the job, and the DELETE form is how the same rule is applied in place." },

    { t: "code", lang: "sql", title: "One survivor per person, chosen by rule",
      hl: [7, 8, 14, 15],
      code: `WITH staged AS (
  SELECT * FROM customers
  UNION ALL SELECT * FROM customers WHERE customer_id IN (2, 5)
  UNION ALL SELECT 9, 'Bruno', 'DE', 'standard', DATE '2024-12-19'
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY name, country, signed_up ORDER BY customer_id) AS rn   -- lowest id survives
  FROM   staged
)
SELECT customer_id, name FROM ranked WHERE rn = 1 ORDER BY customer_id;
-- 1 Asha · 2 Bruno · 3 Chen · 4 Dalia · 5 Emeka · 6 Fatou · 7 Iker · 8 Mara       (8 rows; id 9 lost to id 2)

-- in place, PostgreSQL: delete every row that is not the survivor of its group
DELETE FROM staged s
USING  staged keep
WHERE  keep.name = s.name AND keep.country IS NOT DISTINCT FROM s.country AND keep.signed_up = s.signed_up
  AND  keep.customer_id < s.customer_id;                 -- a row is deleted if a lower-id twin exists
-- exact copies (same id) need a physical row identity to separate: PostgreSQL ctid, SQLite rowid,
-- or reload through the ranked CTE above into a fresh table -- the usual and safer route (6.3).`,
      caption: "The window form names the survivor in one place — `ORDER BY customer_id` — and can be changed to `ORDER BY loaded_at DESC` or `ORDER BY (country IS NULL)` without touching anything else. `IS NOT DISTINCT FROM` on `country` is there because Dalia's NULL would otherwise never match its own twin (1.2)."
    },

    { t: "table",
      head: ["Goal", "Tool", "Sees business-key duplicates", "Chooses the survivor"],
      rows: [
        ["Combine two results", "`UNION ALL`", "—", "—"],
        ["Combine and drop exact repeats", "`UNION`", "No", "Arbitrary"],
        ["Drop exact repeats in one result", "`SELECT DISTINCT`", "No", "Arbitrary"],
        ["Count the damage", "`COUNT(*)`, `COUNT(DISTINCT id)`, `COUNT(DISTINCT (key…))`", "Yes", "—"],
        ["List the offenders", "`GROUP BY key HAVING COUNT(*) > 1`", "Yes", "—"],
        ["Keep one per key, by rule", "`ROW_NUMBER() OVER (PARTITION BY key ORDER BY pref) = 1`", "Yes", "**Yes**"],
        ["Delete in place, by rule", "`DELETE … USING` self-join, or by ctid / rowid", "Yes", "Yes"],
        ["Prevent recurrence", "`UNIQUE` constraint on the business key (6.4); upsert on load (6.3)", "Yes", "At write time"]
      ]
    },

    { t: "ladder",
      title: "Loading a daily customer extract that sometimes arrives twice",
      rungs: [
        { level: "bad", label: "INSERT, then SELECT DISTINCT when reporting", code: `INSERT INTO customers SELECT * FROM extract_today;
-- later: SELECT DISTINCT name, country FROM customers ...`,
          note: "**The duplicates are in the table forever, and every consumer has to remember to de-duplicate** — by a key each of them chooses differently. DISTINCT on a subset of columns is a report-time guess about identity." },
        { level: "ok", label: "Load, then de-duplicate with ROW_NUMBER", code: `DELETE FROM customers c USING (
  SELECT customer_id, ROW_NUMBER() OVER (PARTITION BY name, country, signed_up ORDER BY customer_id) AS rn FROM customers
) d WHERE d.customer_id = c.customer_id AND d.rn > 1;`,
          note: "**Correct and explicit about the survivor.** It runs after the damage and relies on someone running it; two loaders racing can still both insert." },
        { level: "best", label: "A unique key and an upsert", code: `ALTER TABLE customers ADD CONSTRAINT customers_identity UNIQUE (name, country, signed_up);
INSERT INTO customers (...) SELECT ... FROM extract_today
ON CONFLICT (name, country, signed_up) DO UPDATE SET tier = EXCLUDED.tier;`,
          note: "**The duplicate cannot enter.** The database enforces identity at write time, a second delivery updates rather than inserts, and no report needs DISTINCT. 6.3 and 6.4 are about this." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Reconcile two lists, then clean a staging table",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(1)** Using only set operations, produce three lists: customers who both ordered and clicked; who ordered but never clicked; who clicked but never ordered — each as names, not ids. **(2)** Build a staged `events` table by unioning `events` with itself for customer 1 and adding one new row that repeats event 4's content under `event_id = 99`. Count rows, distinct event ids and distinct events by `(customer_id, event_type, occurred_at)`; list the duplicated events; and produce the cleaned table keeping the lowest event_id per duplicate group." },
        { t: "p", text: "State, for each of your UNIONs, whether it is UNION or UNION ALL and why." }
      ],
      requirements: [
        "INTERSECT and EXCEPT for the three lists, with a join or IN to turn ids into names.",
        "The three counts and the offender list on the staged events.",
        "A ROW_NUMBER de-duplication that keeps the lowest event_id.",
        "Verified output for every part."
      ],
      hint: "INTERSECT/EXCEPT give ids; wrap them in `WHERE customer_id IN (...)` to get names. The staging union must be UNION ALL — a UNION would remove the exact copies you are trying to detect. Event 99 differs only in id, so whole-row DISTINCT will not catch it.",
      solution: {
        lang: "sql",
        title: "sets_and_dupes.sql",
        code: `-- (1) three lists
SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders INTERSECT SELECT customer_id FROM events) ORDER BY 1;
-- Asha, Bruno, Chen, Emeka, Fatou
SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM events) ORDER BY 1;
-- Dalia, Iker
SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM events EXCEPT SELECT customer_id FROM orders) ORDER BY 1;
-- Mara

-- (2) staged events: UNION ALL, because the duplicates are the point
WITH staged AS (
  SELECT * FROM events
  UNION ALL SELECT * FROM events WHERE customer_id = 1                         -- five exact copies
  UNION ALL SELECT 99, 1, 'checkout', TIMESTAMP '2025-03-15 13:45:00'         -- event 4 again, new id
)
SELECT COUNT(*) AS rows_, COUNT(DISTINCT event_id) AS distinct_ids,
       COUNT(DISTINCT (customer_id, event_type, occurred_at)) AS distinct_events
FROM   staged;
-- 24 | 19 | 18          (18 + 5 + 1 rows; 19 ids because 99 is new; 18 real events)

-- the offenders
... SELECT customer_id, event_type, occurred_at, COUNT(*) AS copies FROM staged
    GROUP BY 1, 2, 3 HAVING COUNT(*) > 1 ORDER BY occurred_at;
-- 1 view     2025-03-15 13:02 | 2        1 cart     13:20 | 2
-- 1 view     2025-03-15 13:09 | 2        1 checkout 13:45 | 3      <- 4, its copy, and 99
--                                       1 view     19:30 | 2

-- the cleaned table: lowest event_id per (customer, type, time)
... SELECT event_id, customer_id, event_type, occurred_at
    FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id, event_type, occurred_at ORDER BY event_id) AS rn FROM staged) r
    WHERE rn = 1 ORDER BY event_id;
-- 18 rows: events 1..18, and 99 is gone because 4 outranked it`,
        notes: [
          { t: "p", text: "**The staging UNION had to be UNION ALL.** UNION would have removed the five exact copies before you could count them, and reported 19 rows — the ingestion problem hidden by the query meant to find it." },
          { t: "p", text: "**Event 99 is why the business key matters.** Whole-row DISTINCT keeps it (its id differs); the key `(customer_id, event_type, occurred_at)` groups it with event 4 and the ROW_NUMBER rule sends it to `rn = 2`." },
          { t: "p", text: "**INTERSECT and EXCEPT gave ids, not names**, because the operations compare whole rows and a name column would have made `(id, name)` pairs that never intersect with `orders`. Reduce to the key, operate, then look up." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A report unions January's `(product, qty_sold)` with February's and some products vanish. Why?",
          options: [
            "February had no sales for them",
            "UNION removes rows identical across every column, so a product that sold the same quantity in both months collapses to one row; use UNION ALL, and tag the month",
            "The columns are in the wrong order",
            "NULLs in qty_sold"
          ],
          answer: 1,
          why: "UNION is concatenate-then-DISTINCT. Rows that are legitimately equal are deleted with no warning. UNION ALL keeps everything; a month column makes the rows distinct even under UNION."
        }
      ]
    }
  ],

  takeaways: [
    "**UNION ALL appends; UNION appends and de-duplicates.** Default to ALL, and choose UNION only when you can name the duplicates you want gone.",
    "**UNION deletes rows that are legitimately identical** — two months with the same figures — with no warning.",
    "**INTERSECT and EXCEPT are set algebra on whole rows**: the semi and anti joins of 2.3 for the case where the key is the only column.",
    "**Set operations treat NULL as equal to NULL**, unlike WHERE — `SELECT NULL UNION SELECT NULL` is one row.",
    "**Columns match by position, not name**: a type mismatch errors, a swapped pair of same-typed columns corrupts silently.",
    "**List columns explicitly in every branch, in the same order, and tag the source.**",
    "**Three counts describe duplicates**: rows, distinct ids, distinct entities by business key — and they differ.",
    "**DISTINCT sees only exact copies**; a re-loaded row with a new surrogate id is invisible to it.",
    "**`GROUP BY key HAVING COUNT(*) > 1` lists the offenders**; the key is the business identity, not the id.",
    "**De-duplicate with a named survivor**: `ROW_NUMBER() OVER (PARTITION BY key ORDER BY preference) = 1`.",
    "**Prevent rather than clean**: a UNIQUE constraint on the business key and an upsert on load."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `UNION ALL` usually faster than `UNION`?",
        options: [
          "It uses an index",
          "It appends without comparing rows; UNION must sort or hash the whole combined result to find and remove duplicates",
          "It returns fewer rows",
          "It runs the branches in parallel"
        ],
        answer: 1,
        why: "De-duplication is a DISTINCT over everything, which costs a sort or a hash table proportional to the result. UNION ALL does no such work."
      },
      {
        stem: "`SELECT name, country FROM customers UNION SELECT department, name FROM employees` runs without error. What is wrong?",
        options: [
          "Nothing",
          "Columns are matched by position, so departments land in the name column and names in the country column; both are TEXT, so the engine cannot tell",
          "UNION cannot combine different tables",
          "The result has four columns"
        ],
        answer: 1,
        why: "Only types are checked. Semantic alignment is the writer's responsibility, which is why every branch should name its columns in the same order."
      },
      {
        stem: "A staging table has 11 rows, 9 distinct ids and 8 distinct people by (name, country, signed_up). What does `SELECT DISTINCT *` leave?",
        options: [
          "8 rows",
          "9 rows — it removes only exact copies; the person loaded again under a new id differs in the id column and survives",
          "11 rows",
          "It depends on the index"
        ],
        answer: 1,
        why: "DISTINCT compares whole rows. A duplicate by business key with a different surrogate id is a different row to it. Grouping by the business key is the only way to see that duplicate."
      },
      {
        stem: "Which de-duplication lets you say 'keep the most recently loaded copy'?",
        options: [
          "`SELECT DISTINCT`",
          "`UNION`",
          "`ROW_NUMBER() OVER (PARTITION BY key ORDER BY loaded_at DESC)` filtered to 1 — the ORDER BY names the survivor",
          "`GROUP BY key`"
        ],
        answer: 2,
        why: "DISTINCT and UNION keep an arbitrary copy; GROUP BY collapses without choosing a row. The window numbers the copies in preference order, and the preference is a single, editable ORDER BY."
      },
      {
        stem: "Why does `SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM events` give a different result from swapping the two queries?",
        options: [
          "It does not; EXCEPT is symmetric",
          "EXCEPT keeps rows of the first input that are absent from the second; orders-minus-events is people who ordered but never clicked, events-minus-orders is the reverse",
          "The second form is invalid",
          "Because of NULLs"
        ],
        answer: 1,
        why: "Set difference is directional, like subtraction. Dalia and Iker in one direction; Mara in the other."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between UNION and UNION ALL, and which do you default to?",
        strong: "Both stack results with the same column count, matched by position. UNION ALL appends everything; UNION appends and then removes rows that are identical across all columns — it is a DISTINCT over the combined result, which costs a sort or hash and, more importantly, deletes rows that are legitimately the same, like two periods with equal figures. I default to UNION ALL and add a source or period tag column so the branches stay distinguishable; I use UNION only when I can say exactly which duplicates I expect and want removed.",
        answer: [
          { t: "p", text: "The 'legitimately identical rows get deleted' point is the one that shows the cost of UNION is correctness, not just speed." }
        ]
      },
      {
        level: "core",
        q: "How would you find and remove duplicate rows in a table?",
        strong: "First decide what a duplicate is — the whole row, or a business key like name plus date of birth, because a reloaded row with a new surrogate id is a duplicate by key and not by row. Then count three things: rows, distinct ids, distinct business keys; the gaps say how many rows will go. GROUP BY the key with HAVING COUNT(*) > 1 lists the offenders. To remove them I number the copies with ROW_NUMBER over PARTITION BY the key, ORDER BY the survivor rule — lowest id, latest load — and keep rn = 1, either into a fresh table or with a DELETE against the numbered set. And I add a UNIQUE constraint on the key so it cannot recur.",
        answer: [
          { t: "p", text: "Defining identity before counting, and naming the survivor rule, are the two things that separate a fix from a DISTINCT." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use INTERSECT or EXCEPT rather than EXISTS?",
        strong: "When the comparison is on whole rows and I have no other columns to carry — reconciling two lists of keys, checking that two tables have the same rows, finding rows in an old extract missing from the new one. EXCEPT over the full column list is the cleanest 'what changed' query there is, and it treats NULL as equal to NULL, which WHERE does not. When I need other columns from the surviving side, or a condition more complex than equality, EXISTS or NOT EXISTS is the tool, because set operations compare every column and one differing value makes two rows unrelated.",
        answer: [
          { t: "p", text: "The 'what changed between two extracts' use case, and the NULL-equality difference, are what make this answer concrete." }
        ]
      }
    ]
  }
});

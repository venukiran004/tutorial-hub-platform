/* ============================================================================
   LESSON 1.2 — NULL: Three-Valued Logic
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**NULL is not a value. It is the absence of one, and every comparison with it is neither true nor false but unknown.** WHERE keeps only rows whose condition is true, so unknown rows vanish — from a `<>` filter, from a `NOT IN`, from a join. Aggregates skip it, GROUP BY collects it, DISTINCT merges it, and a unique constraint lets several of it through. None of this is a bug. It is the third truth value doing exactly what it was defined to do, in places you did not expect it to reach.",

  objectives: [
    "State the three-valued truth tables for AND, OR and NOT and predict which rows a WHERE keeps",
    "Explain why `NOT IN` with a NULL in the list returns nothing, and why a NULL on the left of `NOT IN` is dropped",
    "Say what COUNT, SUM, AVG, GROUP BY, DISTINCT and UNIQUE each do with NULL",
    "Use IS NULL, IS DISTINCT FROM, COALESCE and NULLIF to write conditions that mean what they say"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Unknown is a third answer", id: "unknown" },

    { t: "p", text: "A comparison in SQL has three possible results: true, false, and unknown. **Any comparison in which either side is NULL is unknown** — including `NULL = NULL`. The logical operators combine the three the way you would expect if you read unknown as 'could be either': false AND unknown is false, because false wins regardless; true OR unknown is true; everything else involving unknown stays unknown. Then the rule that makes it matter: **WHERE, HAVING, JOIN … ON and CASE … WHEN keep a row only when the condition is true.** Unknown is treated like false at every one of those gates, and there is no error to tell you it happened." },

    { t: "dl", items: [
      ["NULL", "The marker for a missing value. Not zero, not the empty string, not false. It has no type of its own and compares equal to nothing, itself included."],
      ["Three-valued logic", "The truth system with true, false and unknown. Comparisons involving NULL yield unknown; AND, OR and NOT propagate it by the tables below."],
      ["`IS NULL` / `IS NOT NULL`", "The only comparisons that return true or false for a NULL. `= NULL` is always unknown and never matches a row."],
      ["`IS DISTINCT FROM`", "Equality that treats two NULLs as equal and a NULL against a value as different — the null-safe `<>`. MySQL spells the null-safe `=` as `<=>`."],
      ["`COALESCE(a, b, …)`", "The first non-NULL argument. The standard way to substitute a default, and to make a sum of an empty set come back as 0."],
      ["`NULLIF(a, b)`", "NULL if a equals b, otherwise a. Turns a sentinel into a proper NULL, and turns a zero divisor into a NULL result instead of an error."]
    ]},

    { t: "code", lang: "sql", title: "The truth tables, from the engine",
      hl: [1, 5, 6],
      code: `SELECT NULL = NULL   AS eq,      NULL <> NULL  AS ne,      NULL IS NULL  AS isn,
       NULL AND FALSE AS and_f,   NULL AND TRUE AS and_t,   NULL OR TRUE  AS or_t,
       NULL OR FALSE  AS or_f,    NOT NULL      AS not_n;
-- eq   | ne   | isn  | and_f | and_t | or_t | or_f | not_n
-- -----+------+------+-------+-------+------+------+------
-- NULL | NULL | true | false | NULL  | true | NULL | NULL

-- the three-valued tables, for reference
--   AND   | true    false   unknown          OR    | true   false    unknown
--   ------+------------------------          ------+-------------------------
--   true  | true    false   unknown          true  | true   true     true
--   false | false   false   false            false | true   false    unknown
--   unk   | unknown false   unknown          unk   | true   unknown  unknown
--   NOT unknown = unknown

-- and the predicate that reads the third value directly
SELECT (NULL > 5) IS NOT TRUE AS not_true, (NULL > 5) IS FALSE AS is_false, (NULL > 5) IS UNKNOWN AS is_unknown;
-- true | false | true`,
      caption: "`NULL = NULL` is unknown, which is why `IS NULL` exists. `NULL AND FALSE` is false — the one case where unknown is resolved — and it is the reason a NULL in one predicate of an AND chain can still let a row be rejected."
    },

    { t: "h2", n: "02", text: "Where the rows go", id: "where" },

    { t: "p", text: "The filter `country <> 'GB'` reads as 'everyone outside the UK'. It is not. For Dalia, whose country is NULL, the comparison is unknown, the gate treats unknown as false, and she is gone — **from both sides**: she is not in `= 'GB'` and not in `<> 'GB'`, and the two together do not add up to everyone." },

    { t: "code", lang: "sql", title: "A filter and its complement do not cover the table",
      hl: [1, 8, 12],
      code: `SELECT name, country FROM customers WHERE country <> 'GB' ORDER BY name;
-- name  | country
-- ------+--------
-- Bruno | DE
-- Emeka | NG
-- Fatou | FR
-- Iker  | ES
-- Mara  | DE                            (5 rows -- Dalia is missing)

SELECT name FROM customers WHERE country = 'GB' OR country <> 'GB' ORDER BY name;
-- Asha, Bruno, Chen, Emeka, Fatou, Iker, Mara                       (7 rows -- still no Dalia)

SELECT name FROM customers WHERE country IS DISTINCT FROM 'GB' ORDER BY name;
-- Bruno, Dalia, Emeka, Fatou, Iker, Mara                            (6 rows -- what 'not GB' meant)

-- the honest spellings of "not GB":
WHERE country <> 'GB' OR country IS NULL          -- portable
WHERE country IS DISTINCT FROM 'GB'               -- PostgreSQL, DuckDB, SQLite 3.39+
WHERE NOT country <=> 'GB'                        -- MySQL`,
      caption: "A `<>` filter silently excludes every row where the column is NULL. When 'not X' must include 'unknown', say so — `IS DISTINCT FROM`, or `OR … IS NULL`. The five-row answer is not wrong for what was written; it is wrong for what was meant."
    },

    { t: "viz",
      title: "Three buckets, two filters",
      caption: "Every row lands in exactly one of true, false or unknown for a given predicate. `WHERE p` keeps the first bucket; `WHERE NOT p` keeps the second. The third bucket is kept by neither, and only IS NULL or IS DISTINCT FROM reaches it.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three boxes labelled true, false and unknown holding customer names for the predicate country not equal to GB; brackets show WHERE keeps the true box, WHERE NOT keeps the false box, and the unknown box with Dalia is kept by neither.">
  <g stroke-width="1.4">
    <rect x="40" y="70" width="240" height="110" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="320" y="70" width="240" height="110" rx="8" style="fill:var(--ink-4);fill-opacity:.18;stroke:var(--ink-3)"/>
    <rect x="600" y="70" width="240" height="110" rx="8" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
  </g>
  <g class="s-label" style="font-weight:600">
    <text x="56" y="94" style="fill:var(--good)">true</text>
    <text x="336" y="94">false</text>
    <text x="616" y="94" style="fill:var(--crit)">unknown</text>
  </g>
  <g class="s-sub">
    <text x="56" y="118">Bruno DE · Emeka NG · Fatou FR</text><text x="56" y="136">Iker ES · Mara DE</text>
    <text x="336" y="118">Asha GB · Chen GB</text>
    <text x="616" y="118">Dalia NULL</text>
    <text x="616" y="136">country &lt;&gt; 'GB' is unknown</text>
  </g>
  <text x="440" y="46" class="s-label" text-anchor="middle">predicate: country &lt;&gt; 'GB'</text>
  <g class="s-sub">
    <text x="40" y="212" style="fill:var(--good)">WHERE country &lt;&gt; 'GB'  →  keeps this box only</text>
    <text x="320" y="212">WHERE NOT (country &lt;&gt; 'GB')  →  keeps this box only</text>
    <text x="600" y="212" style="fill:var(--crit)">kept by neither — reachable with IS NULL</text>
    <text x="600" y="230" style="fill:var(--crit)">or IS DISTINCT FROM 'GB'</text>
  </g>
</svg>`
    },

    { t: "h2", n: "03", text: "NOT IN: the trap with two sides", id: "notin" },

    { t: "p", text: "`x NOT IN (a, b, c)` is shorthand for `x <> a AND x <> b AND x <> c`. **If any element of the list is NULL, one term is unknown, the AND is at best unknown, and no row passes — the query returns nothing.** And the trap has a second side: if `x` itself is NULL, every term is unknown and that row is dropped, whatever the list holds. A subquery in the list can contain a NULL you never wrote, which is how a query that worked for a year returns zero rows the first time a lookup table gains a null." },

    { t: "code", lang: "sql", title: "Both sides of NOT IN, and the form that means what you meant",
      hl: [1, 4, 8, 16],
      code: `SELECT name FROM customers WHERE country NOT IN ('GB');            -- Bruno, Emeka, Fatou, Iker, Mara (5 rows)
--   Dalia is dropped: NULL <> 'GB' is unknown. The NULL is on the LEFT.

SELECT name FROM customers WHERE country NOT IN ('GB', NULL);      -- (0 rows)
--   x <> 'GB' AND x <> NULL  -->  x <> 'GB' AND unknown  -->  never true. The NULL is on the RIGHT.

-- the same thing from a subquery: products in a category with no product under 30
SELECT name FROM products
WHERE  category NOT IN (SELECT category FROM products WHERE unit_price < 30);
-- (0 rows)   -- the subquery returns office, office, NULL (the gift card): one NULL empties the result

-- fix 1: keep NULL out of the list
WHERE  category NOT IN (SELECT category FROM products WHERE unit_price < 30 AND category IS NOT NULL);
-- Headphones, Kettle, Toaster (3 rows)   -- the gift card is still dropped: its own category is NULL

-- fix 2: NOT EXISTS, which asks "is there no matching row" and is immune on both sides
SELECT p.name FROM products p
WHERE  NOT EXISTS (SELECT 1 FROM products q WHERE q.unit_price < 30 AND q.category = p.category);
-- Gift card, Headphones, Kettle, Toaster (4 rows)   -- the gift card's NULL category matches nothing, so it has no match`,
      caption: "`NOT IN` returns nothing if the list contains a NULL and drops the row if the left side is NULL. `NOT EXISTS` does neither, because it never compares NULL with anything — it asks whether a matching row exists, and a NULL key simply fails to match. 2.3 makes this the default anti-join."
    },

    { t: "callout", kind: "trap", title: "Zero rows, no error, and it worked last month", body: [
      { t: "p", text: "The `NOT IN (subquery)` pattern fails silently the day the subquery first returns a NULL. It is the most common cause of an extract that suddenly comes back empty. **Grep your codebase for `NOT IN (SELECT`** and either add `IS NOT NULL` inside every one or rewrite as `NOT EXISTS`. `IN (subquery)` is safe by comparison: a NULL in the list can only fail to match, not empty the result." }
    ]},

    { t: "h2", n: "04", text: "Aggregates, groups, distinct and unique", id: "aggregates" },

    { t: "p", text: "Every aggregate except `COUNT(*)` ignores NULL. That is usually what you want — an average over the values that exist — and occasionally the opposite of what you want, because **`COUNT(column)` counts non-null values, `AVG` divides by the non-null count, and `SUM` over no rows is NULL, not zero.** GROUP BY and DISTINCT go the other way: for the purpose of forming groups and removing duplicates, NULLs are treated as equal to each other, so all the unknowns land in one bucket." },

    { t: "code", lang: "sql", title: "What each aggregate does with a missing value",
      hl: [1, 6, 10, 15],
      code: `SELECT COUNT(*) AS n_star, COUNT(x) AS n_x, SUM(x) AS s, AVG(x) AS a, MIN(x) AS mn, MAX(x) AS mx
FROM   (VALUES (10), (NULL), (20)) AS t(x);
-- n_star | n_x | s  | a    | mn | mx
-- 3      | 2   | 30 | 15.0 | 10 | 20        <- AVG is 30 / 2, not 30 / 3

SELECT COUNT(*) AS n_star, COUNT(x) AS n_x, SUM(x) AS s, AVG(x) AS a
FROM   (VALUES (10), (NULL), (20)) AS t(x) WHERE x > 100;
-- 0      | 0   | NULL | NULL                  <- COUNT of nothing is 0; SUM of nothing is NULL. COALESCE(SUM(x), 0).

SELECT COUNT(*) AS n_star, COUNT(country) AS n_country, COUNT(DISTINCT country) AS n_distinct FROM customers;
-- 8      | 7         | 5                     <- COUNT DISTINCT does not count the NULL as a value

SELECT country, COUNT(*) FROM customers GROUP BY country ORDER BY country NULLS LAST;
-- DE 2, ES 1, FR 1, GB 2, NG 1, NULL 1       <- one group holds every NULL

-- arithmetic and concatenation propagate; CONCAT() does not
SELECT 1 + NULL AS arith, 'a' || NULL AS concat_op, CONCAT('a', NULL, 'b') AS concat_fn;
-- NULL  | NULL      | ab

-- turning a sentinel into a NULL, and a zero into a safe divisor
SELECT NULLIF(0, 0) AS nif, 10 / NULLIF(0, 0) AS safe_div, COALESCE(NULL, NULL, 'x') AS co;
-- NULL | NULL     | x`,
      caption: "`AVG` skips the NULL and divides by two. Whether that is right depends on what the NULL means (Data Handling 6.5): a missing measurement, skip it; a zero recorded as blank, `COALESCE(x, 0)` first. The engine cannot know which, so it does the arithmetically defensible thing and leaves the semantics to you."
    },

    { t: "table",
      head: ["Operation", "Treatment of NULL", "Consequence"],
      rows: [
        ["`WHERE`, `HAVING`, `ON`, `CASE WHEN`", "Unknown is treated as false", "Rows with a NULL in the compared column are dropped"],
        ["`COUNT(*)`", "Counted", "Rows, whatever they contain"],
        ["`COUNT(col)`, `COUNT(DISTINCT col)`", "Skipped", "Non-null values only; NULL is not a distinct value"],
        ["`SUM`, `AVG`, `MIN`, `MAX`", "Skipped", "AVG divides by the non-null count; over no rows the result is NULL"],
        ["`GROUP BY`", "All NULLs form one group", "A NULL key is a category of its own in the output"],
        ["`DISTINCT`, `UNION`, `INTERSECT`, `EXCEPT`", "NULLs are equal to each other", "Duplicate NULL rows collapse to one"],
        ["`ORDER BY`", "Engine default; NULLS FIRST / LAST overrides", "PostgreSQL: last in ASC; MySQL, SQLite: first in ASC"],
        ["`UNIQUE` constraint", "NULLs are distinct from each other (standard, PostgreSQL, MySQL, SQLite)", "Many rows may have NULL in a unique column; PostgreSQL 15 `NULLS NOT DISTINCT` and SQL Server change this"],
        ["`JOIN … ON a = b`", "NULL never matches", "Rows with NULL keys are unmatched — dropped by INNER, kept with NULLs by OUTER (2.2)"],
        ["`||`, `+`, `-`, `*`", "Propagates", "Any NULL operand makes the result NULL; `CONCAT()` and `COALESCE` are the exceptions"]
      ]
    },

    { t: "callout", kind: "production", title: "Never store the absence as a value", body: [
      { t: "p", text: "`'N/A'`, `-1`, `0`, `1900-01-01` and `''` are all worse than NULL, because every rule in the table above stops applying: the sentinel is counted, averaged, grouped as a real category and matched in joins. **NULL is the only representation of missing that the engine's own arithmetic and logic understand.** Convert sentinels on the way in with `NULLIF(col, 'N/A')`, and fill NULLs on the way out with `COALESCE` — at the point where you know what the default should mean." }
    ]},

    { t: "ladder",
      title: "Customers who are not in the UK",
      rungs: [
        { level: "bad", label: "The obvious filter", code: `SELECT name FROM customers WHERE country <> 'GB';`,
          note: "**Five rows; Dalia is silently gone.** The query answers 'customers whose country is known and is not GB', which nobody asked." },
        { level: "ok", label: "Name the third case", code: `SELECT name FROM customers WHERE country <> 'GB' OR country IS NULL;`,
          note: "**Six rows, and portable.** The reader has to notice the OR to know that unknown countries are included; the intent is in the code but not in a single expression." },
        { level: "best", label: "The null-safe comparison", code: `SELECT name FROM customers WHERE country IS DISTINCT FROM 'GB';`,
          note: "**Six rows, one predicate, and the intent is the operator.** IS DISTINCT FROM treats NULL as a comparable value; the only reason to prefer the OR form is an engine that lacks it." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Predict",
      title: "Eight queries that touch a NULL",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "For each query, state the row count or value it returns and which rule from the table decided it. Then run them. Three of the eight give a result that a colleague would call wrong; rewrite those three so they return what was meant." },
        { t: "code", lang: "sql", code: `-- Q1  customers not on the plus tier
SELECT COUNT(*) FROM customers WHERE tier <> 'plus';
-- Q2  customers not in Germany
SELECT COUNT(*) FROM customers WHERE country <> 'DE';
-- Q3  products not in a category that has a product over 80
SELECT name FROM products WHERE category NOT IN (SELECT category FROM products WHERE unit_price > 80);
-- Q4  average unit price of products with no category
SELECT AVG(unit_price) FROM products WHERE category = NULL;
-- Q5  number of distinct countries
SELECT COUNT(DISTINCT country) FROM customers;
-- Q6  revenue of cancelled-then-paid orders (there are none)
SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = 999;
-- Q7  countries and how many customers, including the unknown ones
SELECT country, COUNT(*) FROM customers GROUP BY country;
-- Q8  a label for every customer's country
SELECT name, CASE WHEN country = NULL THEN 'unknown' ELSE country END FROM customers;` }
      ],
      requirements: [
        "A predicted result and the governing rule for each of the eight.",
        "The three queries whose result is not what was meant, identified, with the reason.",
        "Corrected versions of those three, with their verified results."
      ],
      hint: "Q1 has no NULL in tier — check the schema before assuming a trap. Q2 does. Q3's subquery has no NULL in it, but the products table has a NULL on the left. Q4 and Q8 compare with = NULL. Q6 sums nothing.",
      solution: {
        lang: "sql",
        title: "null_predictions.sql",
        code: `-- Q1: 5. tier is NOT NULL, so <> 'plus' has no unknown bucket. Correct as written.
-- Q2: 5. Dalia (NULL) is dropped from <> 'DE'. WRONG for "not in Germany" -- Dalia is not in Germany either.
SELECT COUNT(*) FROM customers WHERE country IS DISTINCT FROM 'DE';                    -- 6
-- Q3: 4 rows: Kettle, Toaster, Desk lamp, Notebook. The list is ('audio') with no NULL, but the
--     gift card's own category is NULL, so NULL NOT IN ('audio') is unknown and it is dropped.
--     WRONG if "not in a category with a product over 80" should include products with no category.
SELECT p.name FROM products p
WHERE  NOT EXISTS (SELECT 1 FROM products q WHERE q.unit_price > 80 AND q.category = p.category);   -- 5 rows, gift card included
-- Q4: NULL. category = NULL is never true; no rows; AVG of nothing is NULL. WRONG.
SELECT AVG(unit_price) FROM products WHERE category IS NULL;                            -- 25.00
-- Q5: 5. NULL is not counted as a distinct value. Correct -- and worth saying in the report.
-- Q6: NULL, not 0. SUM over no rows. Not wrong, but a caller expecting a number will break:
SELECT COALESCE(SUM(qty * unit_price), 0) FROM order_items WHERE order_id = 999;        -- 0
-- Q7: 6 rows; NULL is one group. Correct: the unknown-country customers are counted, as a group of their own.
-- Q8: every row says its country, and Dalia's says NULL: the WHEN never fires. WRONG.
SELECT name, CASE WHEN country IS NULL THEN 'unknown' ELSE country END FROM customers;  -- Dalia -> 'unknown'
-- or simply COALESCE(country, 'unknown')`,
        notes: [
          { t: "p", text: "**Three of the eight are wrong, and none of them errors.** Q2 loses a row to `<>`, Q3 loses a row to a NULL on the left of NOT IN, Q4 and Q8 compare with `= NULL` and never match. The engine did precisely what three-valued logic specifies; the queries said something other than what their comments claim." },
          { t: "p", text: "**Q1 is the control**: the same `<>` pattern is perfectly correct on a NOT NULL column. The trap is not the operator, it is the operator on a nullable column — which is why the first check is the schema." },
          { t: "p", text: "**Q6 is the one that bites in code**: `SUM` of nothing is NULL, and a Python caller doing `total + row[0]` raises on it. `COALESCE(SUM(...), 0)` is the habit." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT name FROM products WHERE category NOT IN (SELECT category FROM products WHERE unit_price < 30)` returns zero rows. Why?",
          options: [
            "No product costs less than 30",
            "The subquery returns a NULL (the gift card's category); `x NOT IN (…, NULL)` expands to `… AND x <> NULL`, which is unknown for every row, so nothing passes",
            "NOT IN is not allowed with subqueries",
            "The products table is empty"
          ],
          answer: 1,
          why: "One NULL in a NOT IN list makes the whole predicate unknown for every row. Add `AND category IS NOT NULL` inside the subquery, or rewrite as NOT EXISTS, which compares nothing with NULL."
        }
      ]
    }
  ],

  takeaways: [
    "**NULL is the absence of a value; every comparison with it is unknown**, including `NULL = NULL`. Only `IS NULL` and `IS DISTINCT FROM` return true or false for it.",
    "**WHERE, HAVING, ON and CASE keep a row only when the condition is true**; unknown is dropped without an error.",
    "**A filter and its negation do not cover the table** when the column is nullable — `<> 'GB'` and `= 'GB'` together miss every NULL.",
    "**`NOT IN` fails on both sides**: a NULL in the list empties the result; a NULL on the left drops that row. `NOT EXISTS` is immune to both.",
    "**`COUNT(*)` counts rows; every other aggregate skips NULL.** `AVG` divides by the non-null count; `SUM` over no rows is NULL, so `COALESCE(SUM(x), 0)`.",
    "**GROUP BY and DISTINCT treat NULLs as equal** — one group, one distinct row — while `COUNT(DISTINCT col)` does not count it at all.",
    "**A UNIQUE constraint allows many NULLs** on most engines; PostgreSQL 15's `NULLS NOT DISTINCT` and SQL Server are the exceptions.",
    "**`||` and arithmetic propagate NULL; `CONCAT()` and `COALESCE` do not.** `NULLIF(divisor, 0)` turns a division error into a NULL.",
    "**Never store missing as a sentinel** — `'N/A'`, `-1`, `0` are counted, averaged, grouped and joined as if real. Convert with `NULLIF` on the way in.",
    "**Check the schema before assuming a trap**: `<>` on a NOT NULL column is correct; the same operator on a nullable one needs `IS DISTINCT FROM` or `OR … IS NULL`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A table has a nullable `status` column. `WHERE status <> 'closed'` returns 900 rows; `WHERE status = 'closed'` returns 80; the table has 1,000 rows. Where are the other 20?",
        options: [
          "Deleted rows",
          "Rows with status NULL — `<> 'closed'` and `= 'closed'` are both unknown for them, so neither filter keeps them",
          "A caching problem",
          "Duplicates"
        ],
        answer: 1,
        why: "Three-valued logic: a NULL status makes both comparisons unknown, and WHERE treats unknown as false. `IS DISTINCT FROM 'closed'` or `OR status IS NULL` would return 920."
      },
      {
        stem: "Which of these is immune to a NULL appearing in the lookup, on either side?",
        options: [
          "`x NOT IN (SELECT k FROM t)`",
          "`NOT EXISTS (SELECT 1 FROM t WHERE t.k = x)`",
          "`x <> ALL (SELECT k FROM t)`",
          "`x NOT IN (SELECT k FROM t WHERE k <> 0)`"
        ],
        answer: 1,
        why: "NOT EXISTS asks whether a matching row exists; a NULL on either side fails to match, which is the right answer for 'has no match'. NOT IN and <> ALL both expand to a conjunction that a NULL turns unknown."
      },
      {
        stem: "`SELECT AVG(score) FROM results` returns 72 over a table of 100 rows, 20 of which have a NULL score. What is 72 the average of?",
        options: [
          "All 100 rows, with NULL as 0",
          "The 80 non-null scores — AVG skips NULL and divides by COUNT(score), not COUNT(*)",
          "The 20 NULL rows",
          "It is an error to average a column with NULLs"
        ],
        answer: 1,
        why: "Every aggregate except COUNT(*) ignores NULL. If the NULLs mean 'scored zero', COALESCE(score, 0) before averaging gives 57.6; if they mean 'not sat', 72 is right. The query cannot know which — you must."
      },
      {
        stem: "`CASE WHEN country = NULL THEN 'unknown' ELSE country END` never returns 'unknown'. Why?",
        options: [
          "CASE does not support NULL",
          "`country = NULL` is unknown for every row, and CASE takes a WHEN branch only when its condition is true; write `country IS NULL` or use COALESCE",
          "The ELSE overrides the WHEN",
          "NULL must be quoted"
        ],
        answer: 1,
        why: "CASE applies the same gate as WHERE: only true selects the branch. `= NULL` is never true, for any row, on any engine."
      },
      {
        stem: "A unique index on `email` exists and there are 300 rows with `email IS NULL`. Is the index broken?",
        options: [
          "Yes — a unique index allows at most one NULL",
          "No — in the SQL standard and in PostgreSQL, MySQL and SQLite, NULLs are distinct from each other for uniqueness; use NOT NULL or PostgreSQL 15's NULLS NOT DISTINCT to change that",
          "Yes — NULLs cannot be indexed",
          "Only if the index is clustered"
        ],
        answer: 1,
        why: "Uniqueness compares values with three-valued logic too: NULL equals nothing, so two NULLs do not conflict. SQL Server is the notable engine that treats NULL as a single value in a unique index."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does NULL mean in SQL and how does it behave in comparisons?",
        strong: "NULL marks a missing value — not zero, not empty string. Any comparison with it yields unknown, a third truth value, including NULL = NULL, which is why IS NULL exists. WHERE, HAVING, ON and CASE keep a row only when the condition is true, so unknown is dropped silently. The consequences I watch for: a <> filter that loses every NULL row, NOT IN returning nothing when the list contains a NULL, aggregates skipping NULL so AVG divides by fewer rows, GROUP BY and DISTINCT treating NULLs as one, and unique constraints allowing many NULLs. IS DISTINCT FROM is the null-safe comparison, COALESCE substitutes a default, NULLIF makes one.",
        answer: [
          { t: "p", text: "Listing the consequences in the clauses where they occur — not just the truth table — is what shows this has been debugged for real." }
        ]
      },
      {
        level: "core",
        q: "Why does `NOT IN (subquery)` sometimes return zero rows, and what do you write instead?",
        strong: "Because NOT IN expands to a chain of <> comparisons joined by AND, and a single NULL in the subquery's result makes one comparison unknown, which makes the AND unknown for every outer row, so nothing passes. It also drops any outer row whose own value is NULL. I rewrite it as NOT EXISTS with a correlated subquery: it asks whether a matching row exists, never compares NULL with anything, and the planner turns it into an anti-join. If I keep NOT IN, the subquery gets an IS NOT NULL — but the day someone removes that line, the extract goes empty without an error.",
        answer: [
          { t: "p", text: "The 'silently, without an error, one day' framing is the point: it is a latent failure, not a syntax quirk." }
        ]
      },
      {
        level: "advanced",
        q: "A report's average order value is higher than finance expects. The `discount` column is NULL for orders with no discount. What happened?",
        strong: "Somewhere the NULL was treated as a value it is not. If the query computes AVG(amount - discount), every no-discount order produces NULL and is skipped, so the average is over discounted orders only — usually the smaller ones, but with a skewed average either way. Or if it computes AVG(discount), it averages over discounted orders and reports a much higher typical discount than the population has. The fix is to decide what NULL means — here, 'no discount', so zero — and apply COALESCE(discount, 0) before the arithmetic, and to write that decision down, because the engine's default of skipping is arithmetically defensible and semantically wrong for this column.",
        answer: [
          { t: "p", text: "Tracing the number to the exact rows that vanished, and naming COALESCE as a semantic decision rather than a fix, is the expert answer." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 1.3 — Predicates: Ranges, Patterns and Dates
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**`BETWEEN '2025-03-01' AND '2025-03-15'` does not include the 15th of March.** The string on the right becomes midnight at the start of that day, and every order placed after breakfast is outside the range. Most predicate bugs are of this kind: the operator does exactly what it is defined to do, and the definition is one character away from what you pictured. This lesson is the definitions — inclusive ends, two wildcards, three kinds of time — and the one habit that removes the whole class: half-open ranges.",

  objectives: [
    "Use BETWEEN, IN, LIKE, ILIKE and regular-expression predicates with their exact semantics",
    "Slice time with half-open ranges and know why `CAST(ts AS DATE) =` and `EXTRACT(month) =` are both traps",
    "Tell a DATE from a TIMESTAMP from a TIMESTAMPTZ and say which comparison each one needs",
    "Recognise an implicit cast in a predicate and say what it costs"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Ranges and lists", id: "ranges" },

    { t: "p", text: "`BETWEEN a AND b` is `>= a AND <= b` — **inclusive on both ends, always**. For integers that is fine. For decimals it is fine as long as the ends are the values you mean. For timestamps it is the source of a bug that appears at every month end, because the upper bound you wrote as a date is a timestamp at midnight, and the day you wanted is the 24 hours *after* it. `IN (…)` is a chain of `= OR =`, with the NULL behaviour of 1.2; a subquery in the list is the same chain over whatever rows come back." },

    { t: "code", lang: "sql", title: "BETWEEN is inclusive — which is the problem with timestamps",
      hl: [1, 7, 11, 16],
      code: `SELECT name, unit_price FROM products WHERE unit_price BETWEEN 27.50 AND 45 ORDER BY unit_price;
-- Desk lamp 27.50, Kettle 32.00, Toaster 45.00      (3 rows -- both ends included, as intended)

-- "orders in the first half of March"
SELECT order_id, placed_at FROM orders WHERE placed_at BETWEEN '2025-03-01' AND '2025-03-15' ORDER BY 1;
-- 107 | 2025-03-03 10:30:00                          (1 row)
-- '2025-03-15' became 2025-03-15 00:00:00. Order 108 at 13:45 on the 15th is outside the range.

-- the half-open range: >= the start, < the day after the end
SELECT order_id, placed_at FROM orders WHERE placed_at >= '2025-03-01' AND placed_at < '2025-03-16' ORDER BY 1;
-- 107 | 2025-03-03 10:30:00
-- 108 | 2025-03-15 13:45:00                          (2 rows)

-- casting the column works and costs the index (5.4); the half-open range works and keeps it
SELECT order_id FROM orders WHERE CAST(placed_at AS DATE) BETWEEN '2025-03-01' AND '2025-03-15';   -- 107, 108

-- a whole month, the same way: no leap-year or 30/31 arithmetic to get wrong
SELECT order_id FROM orders WHERE placed_at >= DATE '2025-02-01' AND placed_at < DATE '2025-03-01';  -- 103, 104, 105, 106`,
      caption: "The half-open range `>= start AND < next_start` is right for every granularity — day, month, year, hour — and for every timestamp precision, and it is the form an index can serve. Write it every time and the month-end bug never appears."
    },

    { t: "callout", kind: "trap", title: "EXTRACT(month) = 2 is every February there has ever been", body: [
      { t: "p", text: "`WHERE EXTRACT(month FROM placed_at) = 2` returns four rows on this dataset and the same query on next year's data returns February of both years. `date_trunc('month', placed_at) = DATE '2025-02-01'` is correct and unindexable. **The range predicate is the only one that is both correct and fast**: `placed_at >= '2025-02-01' AND placed_at < '2025-03-01'`." }
    ]},

    { t: "h2", n: "02", text: "Patterns", id: "patterns" },

    { t: "p", text: "`LIKE` has two wildcards and nothing else: `%` matches any run of characters including none, `_` matches exactly one. It is case-sensitive in PostgreSQL and case-insensitive in MySQL and SQL Server by default — a dialect fact worth knowing before a name search 'works' on one and not the other. `ILIKE` is PostgreSQL's explicit case-insensitive form. Beyond that is the regular-expression operator, which is a different language with a different cost." },

    { t: "code", lang: "sql", title: "Two wildcards, an escape, and the regex operators by dialect",
      hl: [1, 4, 10, 14],
      code: `SELECT name FROM customers WHERE name LIKE '_a%' ORDER BY 1;    -- second character is a
-- Dalia, Fatou, Mara                                              (3 rows)

SELECT name FROM customers WHERE name LIKE '%a' ORDER BY 1;     -- ends in a
-- Asha, Dalia, Emeka, Mara                                       (4 rows)

SELECT name FROM customers WHERE name ILIKE 'A%';               -- PostgreSQL: case-insensitive
-- Asha

SELECT name FROM products WHERE name LIKE '% %' ORDER BY 1;     -- contains a space
-- Desk lamp, Gift card                                           (2 rows)
SELECT name FROM products WHERE name LIKE '%\\_%' ESCAPE '\\';    -- a literal underscore: escape the wildcard (0 rows here)

-- regular expressions: the full language, engine by engine
WHERE name ~ '^[A-C]'                       -- PostgreSQL          -> Asha, Bruno, Chen
WHERE regexp_matches(name, '^[A-C]')        -- DuckDB
WHERE name REGEXP '^[A-C]'                  -- MySQL, SQLite (with the extension)
WHERE REGEXP_CONTAINS(name, '^[A-C]')       -- BigQuery
WHERE name SIMILAR TO '(A|B|C)%'            -- the standard's hybrid: regex alternation with LIKE wildcards`,
      caption: "A LIKE with a literal prefix — `'Asha%'` — can use an ordinary index, because the index is sorted and the prefix bounds a range. `'%a'` cannot, and neither can any regular expression: those scan every row, which is fine on eight customers and not on eighty million (5.4)."
    },

    { t: "h2", n: "03", text: "Three kinds of time", id: "time" },

    { t: "p", text: "A `DATE` is a calendar day. A `TIMESTAMP` (without time zone) is a wall-clock reading — the numbers on a clock face, with no statement of where the clock was. A `TIMESTAMPTZ` is an instant: PostgreSQL stores it as UTC and renders it in the session's time zone on the way out. **Comparing a DATE to a TIMESTAMP casts the date to midnight; comparing a TIMESTAMP to a TIMESTAMPTZ interprets the wall clock in the session zone**, which means the same query can return different rows for two users in different offices." },

    { t: "dl", items: [
      ["DATE", "A day. `DATE '2025-03-15'`. Arithmetic in days: `+ 1` is tomorrow. Compared with a timestamp, it becomes 00:00:00 of that day."],
      ["TIMESTAMP", "A wall-clock reading with no zone. What most CSV exports and many application columns contain. Two readings compare as numbers; whether they were the same instant is not knowable from the type."],
      ["TIMESTAMPTZ", "An instant. Stored normalised to UTC; displayed in the session's `TimeZone`. The right type for 'when did this happen' and the only one on which 'three hours ago' means one thing."],
      ["INTERVAL", "A duration or a calendar step. `INTERVAL '1 day'` is a calendar day and can be 23 or 25 hours across a DST change; `INTERVAL '24 hours'` is exactly that."],
      ["`date_trunc(unit, ts)`", "The start of the period containing `ts`. `date_trunc('month', ts)` is the group key for a monthly rollup — and a predicate on it is unindexable (1.5)."],
      ["`EXTRACT(field FROM ts)`", "One component as a number: year, month, dow, epoch. A filter on it selects that component across all years."]
    ]},

    { t: "code", lang: "sql", title: "One day, three ways — two of them right",
      hl: [2, 5, 9],
      code: `-- everything on 15 March
SELECT order_id FROM orders WHERE placed_at::DATE = DATE '2025-03-15';                            -- 108. Correct; casts every row (5.4)
SELECT order_id FROM orders WHERE placed_at = DATE '2025-03-15';                                  -- (0 rows): the date became midnight
SELECT order_id FROM orders WHERE placed_at >= DATE '2025-03-15'
                              AND placed_at <  DATE '2025-03-15' + INTERVAL '1 day';              -- 108. Correct, and indexable

-- the zone problem, in PostgreSQL
SET TimeZone = 'Europe/London';
SELECT TIMESTAMPTZ '2025-03-30 00:30:00+00' + INTERVAL '1 day';     -- 2025-03-31 01:30:00+01: a calendar day crossed the DST change
SELECT TIMESTAMPTZ '2025-03-30 00:30:00+00' + INTERVAL '24 hours';  -- 2025-03-31 01:30:00+01: the same instant here, but not every day
-- a TIMESTAMP compared with a TIMESTAMPTZ is read in the session zone: the same SQL, run from a
-- New York session, selects a different set of rows. Store instants as TIMESTAMPTZ; compare in UTC.`,
      caption: "`placed_at = DATE '2025-03-15'` is not an error and not a match — it is a comparison with midnight. The half-open form is the one that reads as 'that day', and it is also the one the planner can turn into an index range."
    },

    { t: "viz",
      title: "Where the BETWEEN bug lives",
      caption: "A timeline of the 15th. The upper bound written as a date lands at the start of the day; everything after it is outside a BETWEEN and inside a half-open range that ends at the 16th.",
      svg: `<svg viewBox="0 0 880 220" role="img" aria-label="A horizontal timeline from 14 March to 16 March with midnight ticks. A BETWEEN range ends at midnight on the 15th; a half-open range ends at midnight on the 16th; order 108 at 13:45 on the 15th sits inside the second and outside the first.">
  <line x1="60" y1="120" x2="840" y2="120" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="120" y1="110" x2="120" y2="130"/><line x1="420" y1="110" x2="420" y2="130"/><line x1="720" y1="110" x2="720" y2="130"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="150">14 Mar 00:00</text><text x="420" y="150">15 Mar 00:00</text><text x="720" y="150">16 Mar 00:00</text>
  </g>
  <rect x="60" y="60" width="360" height="14" rx="3" style="fill:var(--crit);fill-opacity:.28;stroke:var(--crit)" stroke-width="1"/>
  <text x="66" y="52" class="s-label" style="fill:var(--crit)">BETWEEN '2025-03-01' AND '2025-03-15' — ends here, at midnight</text>
  <rect x="60" y="84" width="660" height="14" rx="3" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)" stroke-width="1"/>
  <text x="66" y="200" class="s-label" style="fill:var(--good)">&gt;= '2025-03-01' AND &lt; '2025-03-16' — the whole of the 15th is inside</text>
  <circle cx="592" cy="120" r="6" style="fill:var(--accent)"/>
  <text x="592" y="178" class="s-label" text-anchor="middle" style="fill:var(--accent)">order 108 · 15 Mar 13:45</text>
</svg>`
    },

    { t: "h2", n: "04", text: "Comparisons that cast", id: "casts" },

    { t: "p", text: "When the two sides of a comparison have different types, the engine converts one of them, and which one it picks decides whether the predicate is cheap. `customer_id = '5'` converts the literal once. **`zip_code = 12345` on a text column converts every row's `zip_code` to a number** — and fails on the first row with a letter in it, or, if it does not fail, prevents the index on `zip_code` from being used because the indexed values are text and the comparison is numeric. Text comparison is also not numeric comparison: `'9' > '10'` is true, character by character." },

    { t: "code", lang: "sql", title: "Implicit casts: the literal is cheap, the column is not",
      code: `SELECT '9' > '10' AS text_compare, 9 > 10 AS num_compare;
-- true         | false                        -- strings compare character by character: '9' > '1'

SELECT name FROM customers WHERE customer_id = '5';            -- Emeka: the literal is cast to INTEGER, once
-- WHERE zip_code = 12345    on a TEXT column: every row is cast to a number, the index is unusable,
--                           and a value like 'SW1A 1AA' raises an error instead of not matching
-- WHERE zip_code = '12345'  compares text with text: one index lookup

-- the same rule for dates: keep the column bare and cast the literal
WHERE placed_at >= TIMESTAMP '2025-03-01'             -- indexable
WHERE TO_CHAR(placed_at, 'YYYY-MM') = '2025-03'        -- a function on the column: full scan every time (5.4)`,
      caption: "The rule that covers 1.3 and 1.5 and 5.4 at once: **put the function, the cast and the arithmetic on the literal, and leave the column bare.** A bare column can be looked up; a transformed one has to be recomputed for every row."
    },

    { t: "table",
      head: ["Predicate", "Means", "Trap", "Indexable"],
      rows: [
        ["`x BETWEEN a AND b`", "`x >= a AND x <= b`", "Timestamp column with a date literal as `b`: the last day is excluded", "Yes"],
        ["`x >= a AND x < b`", "Half-open range", "None — the form to use for time", "Yes"],
        ["`x IN (a, b, c)`", "`x = a OR x = b OR x = c`", "NULL in the list can only fail to match (unlike NOT IN)", "Yes"],
        ["`x LIKE 'abc%'`", "Prefix match", "Case-sensitivity is a dialect default", "Yes — the prefix bounds a range"],
        ["`x LIKE '%abc'`, `x ~ '…'`", "Suffix / regex match", "Full scan; a trigram index (5.3) is the only help", "No"],
        ["`CAST(x AS DATE) = d`", "Rows on day d", "Correct, but casts every row", "No"],
        ["`EXTRACT(month FROM x) = m`", "Month m of every year", "Selects across years", "No"],
        ["`x = '5'` (x integer)", "Literal cast to integer", "None", "Yes"],
        ["`x = 5` (x text)", "Every row cast to integer", "Errors on non-numeric text; index unusable", "No"]
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Rewrite five predicates so they are both correct and indexable",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Each query below has a predicate that is wrong, slow, or both. Say which, rewrite it, and confirm with the shop that the rewritten query returns the intended rows. The intent is given in the comment." },
        { t: "code", lang: "sql", code: `-- P1  orders placed in March 2025
SELECT order_id FROM orders WHERE placed_at BETWEEN '2025-03-01' AND '2025-03-31';
-- P2  orders placed on 4 April 2025
SELECT order_id FROM orders WHERE TO_CHAR(placed_at, 'YYYY-MM-DD') = '2025-04-04';
-- P3  customers whose name starts with a vowel, any case
SELECT name FROM customers WHERE name LIKE 'A%' OR name LIKE 'E%' OR name LIKE 'I%';
-- P4  orders in the last 30 days before 2025-04-05 (inclusive of that day)
SELECT order_id FROM orders WHERE EXTRACT(day FROM DATE '2025-04-05' - placed_at) <= 30;
-- P5  products priced between 25 and 45 pounds -- prices are stored in pence as TEXT in a legacy table
SELECT name FROM products_legacy WHERE price_pence BETWEEN 2500 AND 4500;` }
      ],
      requirements: [
        "For each: the fault (wrong rows, unindexable, or both) in one line.",
        "A rewrite using a bare column and a half-open range where time is involved.",
        "Verified row counts for P1–P4 on the shop; P5 as a rewrite only."
      ],
      hint: "P1 misses 31 March after midnight (nothing in the data, but the bug is there). P2 and P4 put a function on the column. P3 is correct but case-sensitive in PostgreSQL. P5 compares text with numbers.",
      solution: {
        lang: "sql",
        title: "predicates_fixed.sql",
        code: `-- P1: BETWEEN with a date upper bound excludes 31 March 00:00:01 onward. Half-open:
SELECT order_id FROM orders WHERE placed_at >= DATE '2025-03-01' AND placed_at < DATE '2025-04-01';
-- 107, 108, 109, 110   (4 rows)

-- P2: TO_CHAR on the column: correct rows, full scan. Range on the bare column:
SELECT order_id FROM orders WHERE placed_at >= DATE '2025-04-04' AND placed_at < DATE '2025-04-05';
-- 111   (1 row)

-- P3: correct on this data but case-sensitive in PostgreSQL ('asha' would be missed). Either:
SELECT name FROM customers WHERE UPPER(LEFT(name, 1)) IN ('A', 'E', 'I', 'O', 'U');   -- portable; unindexable, fine for a name search
SELECT name FROM customers WHERE name ~* '^[aeiou]';                                  -- PostgreSQL case-insensitive regex
-- Asha, Emeka, Iker   (3 rows)

-- P4: arithmetic on the column. Move it to the literal, and make the range explicit:
SELECT order_id FROM orders
WHERE  placed_at >= DATE '2025-04-05' - INTERVAL '30 days'      -- 2025-03-06 00:00
  AND  placed_at <  DATE '2025-04-06';                          -- through the end of the 5th
-- 108, 109, 110, 111   (4 rows)

-- P5: text compared with numbers casts every row and breaks on the first non-numeric value.
--     Compare text with text of the same width, or fix the schema:
SELECT name FROM products_legacy WHERE price_pence BETWEEN '2500' AND '4500';    -- only if every value is zero-padded to the same length!
ALTER TABLE products_legacy ALTER COLUMN price_pence TYPE INTEGER USING price_pence::INTEGER;   -- the real fix (6.6)`,
        notes: [
          { t: "p", text: "**P1 returns the same four rows before and after the fix on this data, and that is the point** — the bug is invisible until an order lands on the 31st after midnight. Half-open ranges are a habit precisely because the failing case is not in the test data." },
          { t: "p", text: "**P2 and P4 are the same mistake**: a function or arithmetic applied to the column. Moving the work to the literal side gives a bare column the planner can look up. On twelve orders nobody notices; on twelve million the difference is a scan against a seek (5.4)." },
          { t: "p", text: "**P5's text comparison is only safe with fixed-width values**, because `'999' > '2500'` as text. The honest answer is the ALTER, and until then an explicit cast on the column with the knowledge that it will scan." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`WHERE placed_at BETWEEN '2025-03-01' AND '2025-03-15'` on a TIMESTAMP column. Which rows from 15 March are included?",
          options: [
            "All of them",
            "Only those at exactly 00:00:00 — the string becomes midnight at the start of the 15th, and BETWEEN's inclusive upper bound is that instant",
            "None from March",
            "It raises a type error"
          ],
          answer: 1,
          why: "BETWEEN is `>= a AND <= b`, and a date literal compared with a timestamp is cast to midnight. The whole of the 15th after 00:00:00 lies outside. Write `>= '2025-03-01' AND < '2025-03-16'`."
        }
      ]
    }
  ],

  takeaways: [
    "**BETWEEN is inclusive on both ends**; with a timestamp column and a date literal, the upper end is midnight and the last day is lost.",
    "**Half-open ranges — `>= start AND < next_start` — are correct at every granularity and indexable**; write them for every time slice.",
    "**`CAST(ts AS DATE) = d` and `date_trunc(…) = d` are correct and unindexable; `EXTRACT(month) = m` is wrong across years.**",
    "**LIKE has two wildcards**: `%` any run, `_` one character; a literal prefix can use an index, a leading `%` or a regex cannot.",
    "**LIKE case-sensitivity is a dialect default** — sensitive in PostgreSQL, insensitive in MySQL and SQL Server; ILIKE and `~*` say it explicitly.",
    "**`IN` is a chain of `=` OR; a NULL in its list can only fail to match**, unlike NOT IN.",
    "**DATE is a day, TIMESTAMP is a wall clock, TIMESTAMPTZ is an instant** — store instants as TIMESTAMPTZ and compare in UTC.",
    "**`INTERVAL '1 day'` is a calendar day, 23 or 25 hours across DST; `'24 hours'` is exactly that.**",
    "**Keep the column bare and put the cast, function or arithmetic on the literal** — a transformed column has to be recomputed for every row.",
    "**Text compares character by character**: `'9' > '10'`. A number compared with a text column casts every row and errors on the first non-numeric value."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `WHERE EXTRACT(month FROM placed_at) = 2` become wrong as soon as the table holds two years of data?",
        options: [
          "EXTRACT is deprecated",
          "It selects February of every year, because the year is not part of the predicate; a half-open range on the bare column selects one February and can use an index",
          "It returns January instead",
          "It only works on DATE columns"
        ],
        answer: 1,
        why: "EXTRACT returns one component. Filtering on it is filtering on that component alone. `placed_at >= '2025-02-01' AND placed_at < '2025-03-01'` says which February, and leaves the column bare for the planner."
      },
      {
        stem: "Which LIKE pattern can use an ordinary B-tree index on `name`?",
        options: [
          "`'%son'`",
          "`'And%'` — a literal prefix bounds a sorted range, which is what a B-tree answers",
          "`'%and%'`",
          "`'_ndrew'`"
        ],
        answer: 1,
        why: "A B-tree is sorted; a fixed prefix maps to a contiguous range of it. Anything with a wildcard before the first literal character could match anywhere in the sort order, so the whole index or table must be scanned."
      },
      {
        stem: "A query `WHERE order_ref = 10045` on a TEXT column ran for a year and now fails with 'invalid input syntax for type integer'. What changed?",
        options: [
          "The column type changed",
          "A row with a non-numeric order_ref was inserted; the predicate has always cast every row to integer, and the first non-numeric value made that cast fail — compare text with text instead",
          "The index was dropped",
          "10045 is too large"
        ],
        answer: 1,
        why: "Comparing a text column with a numeric literal casts the column, row by row. It silently prevented an index seek all year; the new row made the hidden cast visible. `order_ref = '10045'` fixes both problems."
      },
      {
        stem: "Two users run the same `WHERE created_at >= '2025-03-30 01:00'` against a TIMESTAMP column and get different rows. What is the likeliest cause?",
        options: [
          "Caching",
          "The column is TIMESTAMPTZ, or is being compared with one, and the literal is interpreted in each session's time zone — the same wall-clock string names different instants for the two users",
          "One user lacks permissions",
          "The literal needs quotes"
        ],
        answer: 1,
        why: "A zone-less literal compared with an instant is interpreted in the session's TimeZone. Give the literal an explicit offset, or compare in UTC, so the predicate means one instant everywhere."
      },
      {
        stem: "Which is the correct and indexable way to select everything on 15 March 2025 from a TIMESTAMP column?",
        options: [
          "`placed_at = DATE '2025-03-15'`",
          "`CAST(placed_at AS DATE) = DATE '2025-03-15'`",
          "`placed_at >= DATE '2025-03-15' AND placed_at < DATE '2025-03-16'`",
          "`TO_CHAR(placed_at, 'YYYY-MM-DD') = '2025-03-15'`"
        ],
        answer: 2,
        why: "The first matches only midnight; the second and fourth are correct but transform every row. The half-open range on the bare column is correct for every time of day and can be served by an index seek."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Is BETWEEN inclusive? When would you avoid it?",
        strong: "Inclusive on both ends — it is `>= a AND <= b`. I avoid it for timestamps whenever the upper bound is written as a date, because the date becomes midnight at the start of that day and the whole day is excluded. My habit for time is the half-open range: `>= start AND < next_start`, which is correct for any granularity, needs no end-of-month arithmetic, and leaves the column bare so an index can serve it. BETWEEN is fine on integers and on decimals where the ends are exactly the values I mean.",
        answer: [
          { t: "p", text: "Saying 'half-open' unprompted and giving the indexability reason is the difference between knowing the rule and having been bitten by it." }
        ]
      },
      {
        level: "core",
        q: "How would you select all rows from a specific day on a timestamp column, and why not `CAST(ts AS DATE) = …`?",
        strong: "A half-open range on the bare column: `ts >= DATE 'd' AND ts < DATE 'd' + INTERVAL '1 day'`. The cast form is correct but applies a function to every row, so the planner cannot use an index on `ts` and scans the table; the range form is an index seek. The same argument rules out `TO_CHAR(ts, …) =` and `EXTRACT(month) =`, and the last one is also wrong across years. The principle is: transform the literal, not the column.",
        answer: [
          { t: "p", text: "The candidate who names sargability here — even without the word — has understood what a predicate costs." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between TIMESTAMP and TIMESTAMPTZ in PostgreSQL, and which would you store?",
        strong: "TIMESTAMP is a wall-clock reading with no zone: the digits, and nothing about where they were read. TIMESTAMPTZ is an instant: stored normalised to UTC and rendered in the session's TimeZone on output. Comparing the two makes PostgreSQL interpret the zone-less value in the session zone, so the same query can return different rows for users in different offices — and adding INTERVAL '1 day' across a DST change gives a 23- or 25-hour day. For anything that records when something happened I store TIMESTAMPTZ and compare in UTC; TIMESTAMP is for values that are genuinely local wall-clock, like an opening time.",
        answer: [
          { t: "p", text: "The session-zone comparison and the DST day are the two concrete failures that show the distinction has been met in practice." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 5.1 — How a Query Runs
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**You write what you want; the planner decides how to get it, using a cost model and a set of statistics about your data that may be days out of date.** Between the text of a query and the rows that come back are four stages — parse, rewrite, plan, execute — and almost every performance question is a question about the third: which of the many possible plans was chosen, on what estimate, and why the estimate was wrong. This lesson is what the planner knows, how it guesses, and where its guesses come from.",

  objectives: [
    "Name the four stages a query passes through and what each one produces",
    "Read a physical plan as a tree of operators evaluated bottom-up",
    "Explain the cost model, selectivity, and why the same predicate gets an index scan at 5 % and a sequential scan at 90 %",
    "Say where statistics come from, how they go stale, and what ANALYZE does",
    "Describe prepared statements, plan caching and the parameter-sniffing problem"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Four stages", id: "stages" },

    { t: "p", text: "The **parser** turns the text into a tree and rejects syntax it cannot read. The **analyser** binds names to tables and columns, resolves types, and rejects what does not exist. The **rewriter** expands views, inlines single-reference CTEs and applies rules. The **planner** enumerates ways to execute the rewritten tree — scan orders, join methods, join orders — assigns each a cost from its model and its statistics, and keeps the cheapest. The **executor** runs that plan, pulling rows through the operators. **The planner never sees your data. It sees a summary of it, and it optimises for the summary.**" },

    { t: "viz",
      title: "From text to rows",
      caption: "Parsing and analysis are deterministic. Planning is a search over alternatives, scored by a cost model that reads statistics — row counts, distinct values, histograms — gathered by ANALYZE. The executor runs whichever plan scored lowest; whether that plan was actually the fastest depends on how good the statistics were.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A pipeline of five boxes: SQL text, parser and analyser, rewriter, planner, executor, rows out. A statistics store feeds the planner from below, filled by ANALYZE; a cost model sits beside the planner.">
  <defs>
    <marker id="qr-ah-51" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.4">
    <rect x="20" y="60" width="110" height="50" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="160" y="60" width="130" height="50" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="320" y="60" width="110" height="50" rx="7" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="460" y="60" width="130" height="50" rx="7" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
    <rect x="620" y="60" width="120" height="50" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="770" y="60" width="90" height="50" rx="7" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="400" y="170" width="250" height="56" rx="7" style="fill:var(--warn);fill-opacity:.08;stroke:var(--warn)" stroke-dasharray="4 3"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="75" y="90">SQL text</text><text x="225" y="84">parse +</text><text x="225" y="100">analyse</text><text x="375" y="90">rewrite</text>
    <text x="525" y="84">plan</text><text x="525" y="100" class="s-sub">cost model</text><text x="680" y="90">execute</text><text x="815" y="90">rows</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="130" y1="85" x2="160" y2="85" marker-end="url(#qr-ah-51)"/><line x1="290" y1="85" x2="320" y2="85" marker-end="url(#qr-ah-51)"/>
    <line x1="430" y1="85" x2="460" y2="85" marker-end="url(#qr-ah-51)"/><line x1="590" y1="85" x2="620" y2="85" marker-end="url(#qr-ah-51)"/>
    <line x1="740" y1="85" x2="770" y2="85" marker-end="url(#qr-ah-51)"/>
    <line x1="525" y1="170" x2="525" y2="112" marker-end="url(#qr-ah-51)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="75" y="134">syntax</text><text x="225" y="134">names, types, existence</text><text x="375" y="134">views, CTEs, rules</text>
    <text x="525" y="134">search over plans</text><text x="680" y="134">pull rows through operators</text>
    <text x="525" y="192" style="fill:var(--warn)">statistics: row counts, n_distinct,</text><text x="525" y="208" style="fill:var(--warn)">histograms, correlation — from ANALYZE</text>
  </g>
  <text x="20" y="250" class="s-sub">Syntax errors come from stage 1, 'column does not exist' from stage 2, a bad plan from stage 4 — and the bad plan is usually a bad statistic.</text>
</svg>`
    },

    { t: "dl", items: [
      ["Logical plan", "The query as relational operations — scan, filter, join, aggregate — with no decision yet about how each is done. What the rewriter produces."],
      ["Physical plan", "The logical plan with an algorithm chosen for each node: Seq Scan or Index Scan, Hash Join or Nested Loop, HashAggregate or GroupAggregate. What EXPLAIN shows (5.2)."],
      ["Cost", "A unitless estimate of work, built from parameters like the cost of reading a page sequentially versus at random and of processing a row. Plans are compared by cost; the number is not a time."],
      ["Cardinality estimate", "The planner's guess at how many rows each node will produce. Every cost depends on it; every bad plan traces back to one that was wrong."],
      ["Selectivity", "The fraction of rows a predicate keeps. Estimated from statistics: for `status = 'paid'`, the frequency of 'paid' in the most-common-values list; for a range, the histogram."],
      ["Statistics", "Per-column summaries gathered by ANALYZE from a sample: null fraction, distinct count, most common values and their frequencies, a histogram of the rest, and physical-order correlation."]
    ]},

    { t: "h2", n: "02", text: "A plan is a tree, evaluated from the leaves", id: "tree" },

    { t: "p", text: "A physical plan is a tree whose leaves read tables and whose internal nodes combine what their children produce. Rows flow upward. **The join at the bottom decides how many rows reach the aggregate above it; the estimate on each node is what the planner believed would flow through it, and the actual count — when EXPLAIN ANALYZE is used — is what did.** Reading a plan means reading from the leaves up, and comparing believed to actual at each step." },

    { t: "code", lang: "sql", title: "A real physical plan: paid orders per country (DuckDB, trimmed)",
      hl: [4, 13, 20, 21],
      code: `EXPLAIN SELECT c.country, COUNT(*) FROM orders o JOIN customers c ON c.customer_id = o.customer_id
        WHERE o.status = 'paid' GROUP BY c.country;

--   HASH_GROUP_BY            Groups: country   Aggregates: count_star()        ~2 rows   <- the top: one row per country
--        │
--   HASH_JOIN                Join Type: INNER   customer_id = customer_id       ~4 rows   <- estimated 4; actually 10 paid orders
--     ┌──┴──────────────┐
--   SEQ_SCAN customers   SEQ_SCAN orders
--   Projections:         Projections: customer_id
--     customer_id,       Filters: status = 'paid'                              ~4 rows   <- the filter was pushed INTO the scan
--     country
--   Filters:
--     customer_id <= 7                                                         ~8 rows   <- a bound the engine derived from the join's other side
--
-- read it bottom-up: two scans feed a hash join; the join feeds the aggregate; each node carries the planner's row estimate.
-- the orders estimate is ~4 and the truth is 10: no statistics on a 12-row in-memory table, so the planner guessed.

-- PostgreSQL's spelling of the same shape, with ANALYZE showing believed versus actual:
--   HashAggregate  (cost=… rows=5 width=…) (actual rows=5 loops=1)
--     ->  Hash Join  (cost=… rows=4 …) (actual rows=10 loops=1)
--           Hash Cond: (o.customer_id = c.customer_id)
--           ->  Seq Scan on orders o  (rows=4) (actual rows=10)
--                 Filter: (status = 'paid')
--                 Rows Removed by Filter: 2
--           ->  Hash  ->  Seq Scan on customers c  (rows=8) (actual rows=8)`,
      caption: "Two things in this plan are the whole of performance work. The filter `status = 'paid'` was pushed down into the scan, so fewer rows ever reach the join — that is what the rewriter and planner do for you. And the estimate of 4 rows against an actual 10 is the kind of gap that, on a large table, sends the planner to the wrong join algorithm — that is what you fix."
    },

    { t: "h2", n: "03", text: "The cost model and selectivity", id: "cost" },

    { t: "p", text: "The planner does not know how long anything takes. It knows relative costs: reading a page sequentially is cheap, reading a page at random costs several times more, processing a row costs a little, an index lookup costs some pages plus some rows. **Given an estimate of how many rows a predicate keeps, it can price a full scan against an index scan** — and the answer flips with selectivity. Five per cent of rows through an index is cheaper than reading everything; ninety per cent through an index is random reads of nearly every page, which is worse than one sequential pass." },

    { t: "code", lang: "sql", title: "The same index, two selectivities, on 400,000 orders (SQLite, measured)",
      hl: [3, 4, 7, 8],
      code: `-- an index on status exists. 'paid' is 90 % of rows; 'refunded' is 5 %.
SELECT COUNT(*) FROM orders WHERE status = 'paid';
--   plan: SEARCH orders USING COVERING INDEX orders_status (status=?)
--   time: 10.1 ms                 <- touched 360,000 index entries
SELECT COUNT(*) FROM orders WHERE status = 'refunded';
--   plan: SEARCH orders USING COVERING INDEX orders_status (status=?)
--   time: 0.6 ms                  <- touched 20,000
-- with no index at all, the full scan for either predicate: 17.5 ms
--
-- SQLite used the index for both because it is a covering index -- smaller than the table, so scanning it
-- beats scanning the table even at 90 %. PostgreSQL, which must visit the heap for each index entry unless the
-- index is covering, would choose Seq Scan for 'paid' and Index Scan for 'refunded' -- from the same statistic:
-- the frequency of each value in pg_stats.most_common_vals.`,
      caption: "Cost scales with rows touched, whatever the access path. The planner's job is to predict the rows; the most-common-values list is how it predicts an equality, the histogram is how it predicts a range, and n_distinct is how it predicts a join. An index on a column where every query wants 90 % of the rows is an index that will not be used, and should not exist."
    },

    { t: "table",
      head: ["Planner needs", "Statistic", "Where it comes from", "Goes wrong when"],
      rows: [
        ["Table size", "Row count, page count", "ANALYZE; the storage manager", "Bulk load without ANALYZE; the planner thinks the table is empty"],
        ["Equality selectivity", "Most common values and their frequencies", "ANALYZE sample", "A value outside the MCV list is assumed to have average frequency"],
        ["Range selectivity", "Histogram bounds", "ANALYZE sample", "Data skewed since the last ANALYZE; a new month's data lies beyond the last bound"],
        ["Join cardinality", "n_distinct on the join keys", "ANALYZE sample", "n_distinct estimated from a sample on a long-tailed column can be off by 10×"],
        ["Combined predicates", "Independence assumption, or extended statistics", "Assumed independent unless CREATE STATISTICS", "Correlated columns — city and postcode — multiply into an estimate far too small"],
        ["Index scan cost", "Physical correlation between index order and table order", "ANALYZE", "A table rewritten in a different order makes an index look more random than it is"]
      ]
    },

    { t: "callout", kind: "production", title: "ANALYZE is the fix more often than an index is", body: [
      { t: "p", text: "A query that was fast yesterday and slow today, with no schema change, has usually crossed a statistics boundary: the table doubled, a new value appeared, the histogram's last bucket ended a week ago. **PostgreSQL's autovacuum runs ANALYZE when a table changes by a threshold fraction — 10 % by default — which on a billion-row table is a hundred million rows of drift.** After a bulk load, `ANALYZE table` by hand. When a plan's estimate and actual differ by an order of magnitude on a scan node, statistics are the first suspect." }
    ]},

    { t: "h2", n: "04", text: "Plan caching and prepared statements", id: "caching" },

    { t: "p", text: "Planning costs time — milliseconds for a simple query, longer for a ten-table join — so engines cache plans. A **prepared statement** parses and plans once and executes many times with different parameters. The catch: **a plan chosen for one parameter value may be wrong for another.** `WHERE status = $1` wants an index scan when `$1` is 'refunded' and a sequential scan when it is 'paid'. PostgreSQL plans the first five executions with the actual values, then switches to a generic plan if it is not much worse; SQL Server caches the first plan it makes — 'parameter sniffing' — and can be stuck with a plan that suited the first caller's value." },

    { t: "code", lang: "sql", title: "Prepared statements and the generic-plan switch (PostgreSQL)",
      code: `PREPARE orders_by_status (TEXT) AS SELECT COUNT(*) FROM orders WHERE status = $1;
EXECUTE orders_by_status('refunded');      -- planned with the value: Index Scan, 5 % of rows
EXECUTE orders_by_status('paid');          -- planned with the value: Seq Scan, 90 % of rows
-- ... after five custom plans, PostgreSQL compares their average cost with a generic plan (planned for an
-- unknown value, using average selectivity) and switches to the generic one if it is not clearly worse.
SET plan_cache_mode = force_custom_plan;   -- always plan with the actual value: for skewed columns
SET plan_cache_mode = force_generic_plan;  -- always reuse: for uniform columns and planning-heavy queries

-- application drivers do this for you: psycopg's server-side cursors and SQLAlchemy's compiled cache send
-- parameterised statements, which is also what makes them injection-safe (7.1). The skew problem is the same.
-- SQL Server: OPTION (RECOMPILE) on a statement, or OPTIMIZE FOR (@p UNKNOWN), when one cached plan fits nobody.`,
      caption: "A generic plan is planned for the average value; on a column with one dominant value and many rare ones there is no average value, and the generic plan is wrong for most callers. The tell is a query that is fast in psql and slow from the application — the application is running a cached plan."
    },

    { t: "ladder",
      title: "A query that got slow overnight",
      rungs: [
        { level: "bad", label: "Add an index", code: `CREATE INDEX orders_status_idx ON orders (status);   -- there was nothing wrong with the indexes`,
          note: "**Indexes fix missing access paths, not wrong estimates.** If the planner already had an index and chose not to use it, adding another does nothing — and costs every write." },
        { level: "ok", label: "Look at the plan", code: `EXPLAIN ANALYZE SELECT ... ;   -- find the node where estimated rows and actual rows disagree by 10x`,
          note: "**The right first move**, but reading a plan without knowing what the planner expected is guesswork. The estimate is the planner's belief; the actual is the truth; the gap is the diagnosis." },
        { level: "best", label: "Fix the belief", code: `ANALYZE orders;                                     -- refresh the statistics after last night's load
-- if the gap survives: CREATE STATISTICS on correlated columns, or raise the statistics target for the column
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;   -- a bigger sample, a better MCV list`,
          note: "**The plan was chosen for data the planner no longer had.** Refreshing the summary gives it the right selectivity, and the same plan search now finds the plan that was right all along." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Predict",
      title: "What the planner believes",
      difficulty: "core",
      minutes: 22,
      body: [
        { t: "p", text: "For each scenario, say what the planner will estimate, what it will choose, and whether the choice is right — then say which statistic, if any, is to blame. **(1)** `WHERE status = 'paid'` on the 400,000-row orders table with an index on status, where 90 % of rows are paid. **(2)** The same predicate with `'refunded'` at 5 %. **(3)** `WHERE placed_at >= '2025-12-01'` the morning after December's data was loaded, with ANALYZE last run in November. **(4)** `WHERE city = 'Leeds' AND postcode LIKE 'LS%'` with independent statistics on the two columns. **(5)** A prepared `WHERE status = $1` executed 10,000 times a minute, first with 'refunded', then mostly with 'paid', on SQL Server." },
        { t: "p", text: "Then write the SQLite query that shows, on the large shop, that cost scales with rows touched even when the plan is the same." }
      ],
      requirements: [
        "Estimate, choice, verdict and culprit for each of the five.",
        "The remedy for each that is wrong: ANALYZE, extended statistics, plan-cache control, or nothing.",
        "The two-query timing demonstration on status = 'paid' versus 'refunded'."
      ],
      hint: "(3): the histogram's upper bound is the last date ANALYZE saw; anything beyond it is estimated as almost nothing. (4): 'Leeds' and 'LS%' are the same fact twice; multiplying their selectivities under-estimates by a lot. (5): the first plan is cached for the rest.",
      solution: {
        lang: "sql",
        title: "planner_beliefs.sql",
        code: `-- (1) 'paid' at 90 %: MCV list says 0.9; planner prices an index scan touching 360,000 entries plus heap visits
--     against one sequential pass and chooses Seq Scan. Correct. No culprit: the index is simply the wrong tool at 90 %.
-- (2) 'refunded' at 5 %: MCV says 0.05; Index Scan over 20,000 entries wins. Correct.
-- (3) December after a November ANALYZE: the histogram's top bound is ~30 Nov, so '>= 2025-12-01' is estimated as
--     a handful of rows -> Index Scan (or a Nested Loop if joined). Actual: a whole month. Wrong.
--     Culprit: stale histogram. Remedy: ANALYZE orders after the load; consider a lower autovacuum_analyze_scale_factor.
-- (4) city = 'Leeds' (say 2 %) AND postcode LIKE 'LS%' (say 2 %): assumed independent -> 0.04 % of rows. Actual: ~2 %,
--     because every Leeds postcode starts with LS. Estimate 50x too low -> a Nested Loop chosen for what is really a
--     hash-join-sized result. Culprit: the independence assumption.
--     Remedy: CREATE STATISTICS city_postcode (dependencies) ON city, postcode FROM addresses; ANALYZE addresses;
-- (5) SQL Server sniffs 'refunded' on the first call and caches an Index Seek plan; 'paid' callers then run that plan
--     over 90 % of the table with key lookups. Wrong for most calls. Culprit: parameter sniffing.
--     Remedy: OPTION (RECOMPILE) if planning is cheap relative to execution, OPTIMIZE FOR UNKNOWN for an average plan,
--     or split the two cases into two statements.

-- the demonstration (SQLite, 400,000 orders, index on status):
SELECT COUNT(*) FROM orders WHERE status = 'paid';        -- SEARCH ... USING COVERING INDEX  ·  10.1 ms
SELECT COUNT(*) FROM orders WHERE status = 'refunded';    -- SEARCH ... USING COVERING INDEX  ·   0.6 ms
-- same plan text, 17x the time: the plan names the access path, the rows decide the cost.`,
        notes: [
          { t: "p", text: "**Two of the five are the planner being right** — a sequential scan for 90 % of a table is the correct answer, and the reflex to 'make it use the index' would make it slower. The verdict comes from selectivity, not from whether an index was used." },
          { t: "p", text: "**(3) and (4) are the two statistics failures that account for most bad plans**: a summary that is out of date, and a summary that assumes independence between columns that are really one fact. ANALYZE fixes the first; extended statistics fix the second; neither is an index." },
          { t: "p", text: "**(5) is why 'fast in the console, slow in the app' happens**: the console plans with the literal, the app runs a cached plan planned for someone else's value." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A query's plan shows `Seq Scan on orders (rows=4) (actual rows=1200000)`. What is the most likely cause?",
          options: [
            "The index is missing",
            "Stale or missing statistics: the planner believed the table or the predicate's selectivity was tiny — run ANALYZE and re-check the estimate before touching indexes",
            "The query needs a CTE",
            "The table is corrupt"
          ],
          answer: 1,
          why: "A six-order-of-magnitude gap between estimate and actual on a scan node means the planner's summary of the table is wrong. Every decision above that node was made on the wrong number; refreshing the statistics is the first and cheapest fix."
        }
      ]
    }
  ],

  takeaways: [
    "**Parse, analyse, rewrite, plan, execute** — and performance lives in the planning stage.",
    "**The planner never sees the data; it sees statistics** — row counts, most common values, histograms, n_distinct — gathered by ANALYZE from a sample.",
    "**A physical plan is a tree read from the leaves up**; each node carries an estimated row count, and EXPLAIN ANALYZE adds the actual.",
    "**Cost is unitless and relative**: sequential pages cheap, random pages dear, rows a little each. Plans are ranked by it; it is not a time.",
    "**Selectivity decides the access path**: an index wins at 5 % of rows and loses at 90 %, from the same statistic.",
    "**Cost scales with rows touched whatever the plan says** — the same index scan is 17× slower on the common value.",
    "**Filters are pushed down into scans** so fewer rows reach the joins; that is the rewriter and planner working for you.",
    "**A bad plan is almost always a bad estimate**, and a bad estimate is usually stale statistics or a false independence assumption.",
    "**ANALYZE after a bulk load; CREATE STATISTICS for correlated columns** — before adding an index.",
    "**Prepared statements cache plans; a plan for one parameter value can be wrong for another** — parameter sniffing, and PostgreSQL's custom-versus-generic switch."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the planner choose a sequential scan for `WHERE status = 'paid'` when an index on status exists?",
        options: [
          "The index is broken",
          "The most-common-values statistic says 'paid' is 90 % of rows; reading 90 % of the table through an index means random access to almost every page, which costs more than one sequential pass",
          "Sequential scans are always preferred",
          "Text columns cannot use indexes"
        ],
        answer: 1,
        why: "The choice is a cost comparison driven by selectivity. The same index is used for 'refunded' at 5 %. An index that no query would use at the data's actual selectivity is an index to drop."
      },
      {
        stem: "What does ANALYZE do, and what does it not do?",
        options: [
          "It rebuilds indexes",
          "It samples the table and stores per-column statistics — row count, null fraction, distinct count, most common values, histogram — for the planner; it changes no data and builds no index",
          "It runs the query and reports timing",
          "It defragments the table"
        ],
        answer: 1,
        why: "ANALYZE refreshes the planner's beliefs. EXPLAIN ANALYZE, confusingly, is a different thing: it runs the query and reports actual row counts and times per node."
      },
      {
        stem: "`WHERE city = 'Leeds' AND postcode LIKE 'LS%'` is estimated at 0.04 % of rows and returns 2 %. Why?",
        options: [
          "LIKE is not estimable",
          "The planner multiplied the two selectivities as if independent, but every Leeds address has an LS postcode — extended statistics (CREATE STATISTICS … dependencies) tell it the columns are correlated",
          "The histogram is stale",
          "The index is on the wrong column"
        ],
        answer: 1,
        why: "Independence is the default assumption between columns. When two predicates express the same fact, the product of their selectivities is far too small, and the under-estimate cascades into join choices above."
      },
      {
        stem: "A query is fast in psql and slow from the application with identical SQL. What is the likely difference?",
        options: [
          "Network latency",
          "The application uses a prepared statement whose cached plan was made for a different parameter value or a generic one; the console plans with the literal each time",
          "psql uses a different index",
          "The application lacks permissions"
        ],
        answer: 1,
        why: "Plan caching trades planning time for the risk that one plan does not fit all values. PostgreSQL's plan_cache_mode and SQL Server's OPTION (RECOMPILE) are the controls."
      },
      {
        stem: "Which is the correct order of stages for a query?",
        options: [
          "Plan, parse, execute, analyse",
          "Parse, analyse (bind names and types), rewrite (views, rules, CTE inlining), plan (cost-based search), execute",
          "Execute, then plan the next run",
          "Parse, execute, cache"
        ],
        answer: 1,
        why: "Each stage's errors are recognisable: syntax from the parser, 'does not exist' from the analyser, and slowness from the planner's choices."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does a database decide how to execute a query?",
        strong: "It parses the text, binds names and types, rewrites views and CTEs into the tree, and then the planner searches over physical plans — which scan for each table, which join algorithm and order — scoring each with a cost model. The costs come from parameters like sequential versus random page cost, applied to estimated row counts, and the row counts come from statistics ANALYZE gathered: most common values for equality selectivity, histograms for ranges, n_distinct for joins. The cheapest estimated plan runs. So when a query is slow, I look for the node where the estimate and the actual disagree, because the planner optimised for a table that does not match the one it read.",
        answer: [
          { t: "p", text: "Tracing the plan back to the statistics that produced it is the core of the answer." }
        ]
      },
      {
        level: "core",
        q: "Why would the planner ignore an index that exists?",
        strong: "Because it estimated that using it would cost more. An index scan pays a random page read per matching row unless the index covers the query, so above some selectivity — often tens of per cent — one sequential pass is cheaper, and the planner is right to skip the index. It might also be wrong: stale statistics can make a rare value look common, a type mismatch or a function on the column can make the predicate unindexable, or the index might not match the predicate's shape. I check EXPLAIN for the estimate, ANALYZE if it is off, and only then look at whether the predicate is sargable or the index is the right one.",
        answer: [
          { t: "p", text: "Starting from 'the planner may be right' and listing the three ways it could be wrong shows calibrated judgement." }
        ]
      },
      {
        level: "advanced",
        q: "What is parameter sniffing and how do you handle it?",
        strong: "When a parameterised statement is planned once and the plan is cached, the plan is optimised for whichever value was present at planning time. On a skewed column — one value covering most rows, many rare ones — the plan for a rare value is an index seek and the plan for the common value is a scan, and callers with the other value get the wrong one. SQL Server caches the first plan it sees; PostgreSQL plans the first five executions with the actual values and then may switch to a generic plan. The remedies: force re-planning per execution when planning is cheap relative to running — OPTION (RECOMPILE), plan_cache_mode = force_custom_plan; plan for an unknown value to get an average plan; or split the skewed cases into separate statements so each gets its own plan.",
        answer: [
          { t: "p", text: "Knowing both engines' behaviour and matching the remedy to the planning-versus-execution cost ratio is the expert answer." }
        ]
      }
    ]
  }
});

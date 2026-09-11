/* ============================================================================
   SQL — CURRICULUM
   ----------------------------------------------------------------------------
   Seven modules, in the order a query is understood: what the engine does
   with the text, joins and grouping, windows and CTEs, then what happens
   under the hood — plans, indexes, transactions, schema — and finally the
   query patterns an ML engineer writes every week.

   Every lesson runs against the same six-table shop, built so the traps
   exist: a customer who never ordered, an order that was cancelled, a NULL
   where a key should be, two salaries that tie. Every result table in the
   course was produced by executing the query.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "sql",
    title: "SQL",
    short: "SQL",
    blurb: "Query correctness, window functions, execution plans, indexing and schema design — for engineers tired of guessing why a query is slow or why a count is wrong.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5"],

    modules: [

      /* ================================================================
         PHASE 1 · READING AND WRITING QUERIES
         ================================================================ */
      {
        id: "foundations",
        short: "M1",
        dir: "01_foundations",
        phase: "Phase 1 · Reading and writing queries",
        title: "What a Query Means",
        blurb: "The logical order the engine follows, the three-valued logic that NULL brings, and the predicates and functions that shape a result.",
        outcome: "You can predict what a query returns — including the rows NULL removes — before you run it.",
        lessons: [
          { id: "1.1", title: "The Logical Order of a Query", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT — the order the engine evaluates, and every error that order explains.",
            keywords: ["logical order", "select", "where", "alias", "distinct", "limit", "offset"] },
          { id: "1.2", title: "NULL: Three-Valued Logic", difficulty: "core", minutes: 34, tier: "must",
            summary: "Unknown is not false. Where NULL hides in comparisons, NOT IN, aggregates, GROUP BY, DISTINCT, unique constraints and sort order.",
            keywords: ["null", "three-valued logic", "is null", "coalesce", "nullif", "not in", "is distinct from"] },
          { id: "1.3", title: "Predicates: Ranges, Patterns and Dates", difficulty: "core", minutes: 32, tier: "must",
            summary: "BETWEEN is inclusive, a date is not a timestamp, LIKE has two wildcards, and half-open ranges are the only safe way to slice time.",
            keywords: ["between", "like", "ilike", "regex", "in", "date range", "half-open", "timezone"] },
          { id: "1.4", title: "CASE and Conditional Aggregation", difficulty: "core", minutes: 30, tier: "must",
            summary: "The expression that turns a category into a number, a filter into a column, and three queries into one.",
            keywords: ["case", "conditional aggregation", "filter", "pivot", "bucketing"] },
          { id: "1.5", title: "Strings, Dates and Types", difficulty: "core", minutes: 34, tier: "should",
            summary: "Casting, concatenation with NULL, date arithmetic and truncation, EXTRACT, generate_series, and the implicit conversions that silently defeat an index.",
            keywords: ["cast", "string functions", "date_trunc", "extract", "interval", "generate_series", "implicit cast"] }
        ]
      },

      {
        id: "joins",
        short: "M2",
        dir: "02_joins",
        phase: "Phase 1 · Reading and writing queries",
        title: "Joins and Grouping",
        blurb: "Every join is a row multiplication followed by a filter; every aggregate is a collapse. The surprises come from forgetting which happened first.",
        outcome: "You can say how many rows a join produces before running it, and why a LEFT JOIN turned inner.",
        lessons: [
          { id: "2.1", title: "Joins as Row Multiplication", difficulty: "core", minutes: 34, tier: "must",
            summary: "INNER, LEFT, RIGHT, FULL and CROSS as one operation with different rules for the unmatched, and the row count each one guarantees.",
            keywords: ["inner join", "left join", "full join", "cross join", "on", "row count", "cartesian"] },
          { id: "2.2", title: "The Outer-Join Traps", difficulty: "core", minutes: 36, tier: "must",
            summary: "A WHERE on the right table turns LEFT into INNER; COUNT(*) is one for a customer with no orders; a NULL key matches nothing; a second join multiplies the sums.",
            keywords: ["on vs where", "count star", "null key", "fan-out", "pre-aggregate", "join multiplication"] },
          { id: "2.3", title: "Self, Semi and Anti Joins", difficulty: "core", minutes: 34, tier: "must",
            summary: "Rows that relate to other rows of the same table; the three ways to write 'has a match' and the four ways to write 'has none' — one of which returns nothing.",
            keywords: ["self join", "exists", "not exists", "in", "not in", "anti join", "semi join"] },
          { id: "2.4", title: "GROUP BY and HAVING", difficulty: "core", minutes: 32, tier: "must",
            summary: "What a group is, why every selected column must be grouped or aggregated, what aggregates do with NULL, and DISTINCT ON for the one row per group.",
            keywords: ["group by", "having", "aggregate", "count distinct", "distinct on", "grouping"] },
          { id: "2.5", title: "Advanced Aggregation", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "GROUPING SETS, ROLLUP and CUBE for subtotals in one pass; FILTER; percentiles; string and array aggregation; the statistical aggregates.",
            keywords: ["grouping sets", "rollup", "cube", "filter", "percentile_cont", "string_agg", "array_agg"] },
          { id: "2.6", title: "Set Operations and Duplicates", difficulty: "core", minutes: 30, tier: "should",
            summary: "UNION, INTERSECT and EXCEPT as operations on whole rows, and the three honest ways to find, count and remove duplicates.",
            keywords: ["union", "union all", "intersect", "except", "duplicates", "distinct", "dedupe"] }
        ]
      },

      /* ================================================================
         PHASE 2 · WINDOWS AND CTEs
         ================================================================ */
      {
        id: "windows",
        short: "M3",
        dir: "03_windows",
        phase: "Phase 2 · Windows and CTEs",
        title: "Window Functions",
        blurb: "Aggregates that keep every row, rankings that respect ties, frames that define 'the last three', and the offsets that replace a self-join.",
        outcome: "You can write a running total, a top-n per group and a period-over-period change without a subquery, and know the default frame that gets LAST_VALUE wrong.",
        lessons: [
          { id: "3.1", title: "OVER: An Aggregate That Keeps the Rows", difficulty: "core", minutes: 32, tier: "must",
            summary: "PARTITION BY and ORDER BY inside OVER, the difference from GROUP BY, and the share-of-total and running-total patterns.",
            keywords: ["over", "partition by", "window", "running total", "share of total"] },
          { id: "3.2", title: "Ranking and Top-N per Group", difficulty: "core", minutes: 32, tier: "must",
            summary: "ROW_NUMBER, RANK, DENSE_RANK and NTILE on a tie, and the greatest-n-per-group pattern with QUALIFY where it exists.",
            keywords: ["row_number", "rank", "dense_rank", "ntile", "top-n per group", "qualify", "ties"] },
          { id: "3.3", title: "Frames: ROWS, RANGE and GROUPS", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The default frame that ORDER BY silently sets, moving averages, RANGE over intervals, and why two rows with the same date share a running total.",
            keywords: ["frame", "rows between", "range between", "groups", "unbounded", "moving average", "default frame"] },
          { id: "3.4", title: "LAG, LEAD and the Value Functions", difficulty: "core", minutes: 34, tier: "must",
            summary: "Period-over-period change, the previous event, FIRST_VALUE and the LAST_VALUE trap, and gaps between rows without a self-join.",
            keywords: ["lag", "lead", "first_value", "last_value", "nth_value", "period over period", "gap"] },
          { id: "3.5", title: "Window Patterns", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Gaps and islands, sessionisation, cumulative distinct counts, medians, percent rank and de-duplication — the patterns that used to need three self-joins.",
            keywords: ["gaps and islands", "sessionisation", "median", "percent_rank", "cumulative", "dedupe"] }
        ]
      },

      {
        id: "ctes",
        short: "M4",
        dir: "04_ctes",
        phase: "Phase 2 · Windows and CTEs",
        title: "Subqueries, CTEs and Reshaping",
        blurb: "Queries inside queries — where they are allowed, what they cost, when they recurse — and the reshaping of rows into columns and JSON into rows.",
        outcome: "You can name the steps of a query so it reads top to bottom, walk a hierarchy of unknown depth, and pull a field out of a JSON column with an index behind it.",
        lessons: [
          { id: "4.1", title: "Subqueries: Scalar, Table and Correlated", difficulty: "core", minutes: 34, tier: "must",
            summary: "Where a subquery may appear, what a correlated one costs, ANY and ALL, and LATERAL — the join that runs a subquery per row on purpose.",
            keywords: ["subquery", "scalar subquery", "correlated", "lateral", "any", "all", "derived table"] },
          { id: "4.2", title: "CTEs: Naming the Steps", difficulty: "core", minutes: 32, tier: "must",
            summary: "WITH as a readable pipeline, chained and reused CTEs, materialised versus inlined, and the data-modifying CTE with RETURNING.",
            keywords: ["cte", "with", "materialized", "inline", "returning", "temp table", "view"] },
          { id: "4.3", title: "Recursive CTEs", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Hierarchies, date spines, paths through a graph, bill-of-materials totals — and the cycle that recurses forever unless you guard it.",
            keywords: ["recursive cte", "hierarchy", "date spine", "graph", "cycle", "depth"] },
          { id: "4.4", title: "Reshaping: Pivot and Unpivot", difficulty: "core", minutes: 30, tier: "should",
            summary: "Rows to columns with conditional aggregation, columns to rows with UNION ALL and VALUES, native PIVOT where it exists, and the limit that makes pivots a presentation step.",
            keywords: ["pivot", "unpivot", "crosstab", "conditional aggregation", "values", "wide to long"] },
          { id: "4.5", title: "JSON and Arrays in SQL", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "jsonb operators and paths, arrays and UNNEST, indexing a JSON field with GIN, and the point at which a JSON column should have been a table.",
            keywords: ["jsonb", "json", "->>", "jsonb_path", "unnest", "array", "gin"] }
        ]
      },

      /* ================================================================
         PHASE 3 · UNDER THE HOOD
         ================================================================ */
      {
        id: "performance",
        short: "M5",
        dir: "05_performance",
        phase: "Phase 3 · Under the hood",
        title: "Plans, Indexes and Speed",
        blurb: "What the planner does with your text, how to read what it chose, the index structures it can use, and the predicates that stop it using them.",
        outcome: "You can read EXPLAIN ANALYZE, name the node that is slow, and say whether the fix is an index, a rewrite or a schema change.",
        lessons: [
          { id: "5.1", title: "How a Query Runs", difficulty: "core", minutes: 32, tier: "must",
            summary: "Parser, planner, executor; the cost model and the statistics it depends on; why a stale ANALYZE makes a good plan bad; prepared statements and plan caching.",
            keywords: ["planner", "optimiser", "cost", "statistics", "analyze", "cardinality", "prepared statement"] },
          { id: "5.2", title: "Reading EXPLAIN", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Seq Scan, Index Scan, Index Only Scan and Bitmap; Hash, Merge and Nested Loop joins; Sort and HashAggregate; estimated versus actual rows — and the one number to look at first.",
            keywords: ["explain", "explain analyze", "seq scan", "index scan", "hash join", "nested loop", "rows estimate"] },
          { id: "5.3", title: "Indexes: B-tree and Beyond", difficulty: "core", minutes: 36, tier: "must",
            summary: "What a B-tree can answer, composite indexes and the leftmost prefix, covering and partial and expression indexes, GIN and BRIN, and the write cost every index charges.",
            keywords: ["b-tree", "composite index", "leftmost prefix", "covering index", "partial index", "expression index", "gin", "brin"] },
          { id: "5.4", title: "Sargability: Predicates an Index Can Use", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Functions on columns, implicit casts, leading wildcards, OR, NOT and inequality — the rewrites that let the index back in, and keyset pagination instead of OFFSET.",
            keywords: ["sargable", "function on column", "implicit cast", "leading wildcard", "keyset pagination", "offset"] },
          { id: "5.5", title: "Joins, Aggregates and Partitions at Scale", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Join order and algorithm choice, pre-aggregating before a join, COUNT DISTINCT at scale, materialised views, and range, list and hash partitioning with pruning.",
            keywords: ["join order", "pre-aggregate", "count distinct", "materialized view", "partitioning", "partition pruning"] },
          { id: "5.6", title: "The Slow Query Method", difficulty: "expert", minutes: 36, tier: "must",
            summary: "Find it, reproduce it, read the plan, find the widest node, choose the fix, measure it — and the table of causes that covers nine slow queries in ten.",
            keywords: ["slow query", "pg_stat_statements", "method", "widest node", "regression", "causes"] }
        ]
      },

      {
        id: "design",
        short: "M6",
        dir: "06_design",
        phase: "Phase 3 · Under the hood",
        title: "Transactions and Schema",
        blurb: "Correctness when many writers share a table, the statements that change data, and the shapes a schema takes for transactions and for analytics.",
        outcome: "You can choose an isolation level and say which anomaly it allows, write an upsert that survives a retry, and decompose a wide table to third normal form and back.",
        lessons: [
          { id: "6.1", title: "Transactions and ACID", difficulty: "core", minutes: 32, tier: "must",
            summary: "BEGIN, COMMIT, ROLLBACK and SAVEPOINT; what each ACID letter guarantees and which mechanism provides it; autocommit and the pipeline that must be idempotent.",
            keywords: ["transaction", "acid", "commit", "rollback", "savepoint", "atomicity", "durability", "idempotent"] },
          { id: "6.2", title: "Isolation Levels and Anomalies", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Dirty reads, non-repeatable reads, phantoms, lost updates and write skew; MVCC; what READ COMMITTED lets through; SELECT FOR UPDATE, optimistic locking and deadlocks.",
            keywords: ["isolation level", "read committed", "repeatable read", "serializable", "mvcc", "lost update", "write skew", "deadlock", "for update"] },
          { id: "6.3", title: "Writing Data: Upsert, Merge and Bulk", difficulty: "core", minutes: 34, tier: "must",
            summary: "INSERT, UPDATE with a join, DELETE with USING, RETURNING, ON CONFLICT and MERGE, batch inserts, soft deletes and an audit trail — each written to survive being run twice.",
            keywords: ["insert", "update from", "delete using", "returning", "on conflict", "merge", "upsert", "soft delete", "audit"] },
          { id: "6.4", title: "Keys, Constraints and Normal Forms", difficulty: "core", minutes: 36, tier: "must",
            summary: "Primary, foreign, unique and check constraints as the database's own tests; surrogate versus natural keys; 1NF to BCNF worked on one wide table; and when to denormalise on purpose.",
            keywords: ["primary key", "foreign key", "unique", "check", "surrogate key", "normalisation", "1nf", "3nf", "bcnf", "denormalisation"] },
          { id: "6.5", title: "Analytics Schemas: Star, Snowflake and Wide", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "OLTP against OLAP, fact and dimension tables, slowly changing dimensions, feature tables, and why a columnar warehouse changes which query shapes are cheap.",
            keywords: ["oltp", "olap", "star schema", "fact table", "dimension", "scd", "columnar", "warehouse"] },
          { id: "6.6", title: "DDL, Views, Procedures and Migrations", difficulty: "core", minutes: 32, tier: "should",
            summary: "CREATE and ALTER without downtime, views against materialised views, functions, procedures and triggers, temporary tables, and expand–contract migrations.",
            keywords: ["ddl", "alter table", "view", "materialized view", "stored procedure", "trigger", "migration", "expand contract"] },
          { id: "6.7", title: "Dialects and the Wider Ecosystem", difficulty: "core", minutes: 30, tier: "should",
            summary: "Where PostgreSQL, MySQL, SQLite, SQL Server, BigQuery, Snowflake and DuckDB differ; SQL against NoSQL; CAP in one paragraph; and how to choose.",
            keywords: ["dialect", "postgresql", "mysql", "sqlite", "bigquery", "snowflake", "duckdb", "nosql", "cap"] }
        ]
      },

      /* ================================================================
         PHASE 4 · SQL FOR THE ML ENGINEER
         ================================================================ */
      {
        id: "patterns",
        short: "M7",
        dir: "07_patterns",
        phase: "Phase 4 · SQL for the ML engineer",
        title: "Patterns for Data Work",
        blurb: "The queries a data scientist writes every week — from Python, for features, for cohorts, for checks — and the classics every interview asks.",
        outcome: "You can pull a point-in-time feature set, a retention matrix and a stratified sample from SQL, safely from Python, and answer the interview classics with a verified query.",
        lessons: [
          { id: "7.1", title: "SQL from Python, Safely", difficulty: "core", minutes: 32, tier: "must",
            summary: "Parameters instead of f-strings, connection pooling, batch inserts, retries and timeouts, transactions in code, and DuckDB over Parquet when the database is a folder.",
            keywords: ["sql injection", "parameterised query", "connection pool", "executemany", "retry", "timeout", "duckdb"] },
          { id: "7.2", title: "Point-in-Time Features in SQL", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Lag and rolling features with windows, as-of joins with LATERAL, backfilling a feature table by date, and the leakage checks written as queries.",
            keywords: ["as-of join", "lateral", "feature table", "backfill", "rolling window", "leakage"] },
          { id: "7.3", title: "Cohorts, Retention, Funnels and RFM", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "The cohort matrix by signup month, retention curves, a funnel with conditional aggregation, and RFM scoring with NTILE — each a single query.",
            keywords: ["cohort", "retention", "funnel", "rfm", "ntile", "conversion"] },
          { id: "7.4", title: "Sampling, Splits and Checks in SQL", difficulty: "core", minutes: 32, tier: "must",
            summary: "Deterministic hash splits instead of RANDOM(), stratified samples, TABLESAMPLE, and the reconciliation, null, duplicate and class-balance checks that run before any extract is trusted.",
            keywords: ["hash split", "random", "stratified sample", "tablesample", "reconciliation", "data checks"] },
          { id: "7.5", title: "The Interview Classics", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Second-highest salary, top three per department, employees paid more than their manager, consecutive logins, running totals, gaps, medians — every one verified against the shop.",
            keywords: ["interview", "second highest", "top n per department", "consecutive days", "median", "running total", "classics"] }
        ]
      }

    ]
  });
})();

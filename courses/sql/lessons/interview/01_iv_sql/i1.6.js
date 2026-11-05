/* ============================================================================
   INTERVIEW I1.6 — 8. Performance & Optimization · 9. Database Design & Theory
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.6",
 "lede": "**11 questions** from the SQL Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the worked answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "8. Performance & Optimisation · 9. Database Design & Theory",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "76",
   "q": "How to identify slow queries?",
   "body": [
    {
     "t": "p",
     "text": "Enable slow query log. Use EXPLAIN AnalysE. Check: sequential scans on large tables, missing indexes, large sorts, many row estimates being wrong."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "Index best practices for ML data pipelines.",
   "body": [
    {
     "t": "p",
     "text": "Index join columns, WHERE clause columns, ORDER BY columns. Don't over-index (slow writes). Use partial indexes for filtered queries. Monitor unused indexes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "When does an index NOT help?",
   "body": [
    {
     "t": "p",
     "text": "Small tables (<1000 rows), low cardinality columns, queries reading >10-20% of table, frequent writes (index maintenance overhead), functions on indexed column (use functional index)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "Explain query optimisation techniques.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Use indexed columns in WHERE (avoid functions on them)\nWHERE date_col >= '2024-01-01'  -- good\nWHERE YEAR(date_col) = 2024     -- bad (can't use index)\n\n-- Select only needed columns\nSELECT col1, col2  -- good\nSELECT *           -- bad\n\n-- Use EXISTS instead of IN for large subqueries\n-- Use JOINs instead of correlated subqueries\n-- Filter early, aggregate late\n-- Use UNION ALL instead of UNION when possible"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is query plan caching?",
   "body": [
    {
     "t": "p",
     "text": "Database stores execution plans for reuse. Parameterised queries benefit from plan caching. Dynamic SQL may not. Plan cache bloat can be a problem."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "Explain table partitioning strategies.",
   "body": [
    {
     "t": "p",
     "text": "Range: by date ranges (most common for time-series). List: by category values. Hash: distributed by hash of column. Improves query performance through partition pruning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is normalisation? Explain 1NF through 3NF.",
   "body": [
    {
     "t": "p",
     "text": "1NF: atomic values, no repeating groups. 2NF: 1NF + no partial dependencies (each non-key column depends on entire primary key). 3NF: 2NF + no transitive dependencies (no non-key depends on another non-key)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "When is denormalisation appropriate?",
   "body": [
    {
     "t": "p",
     "text": "Read-heavy workloads, reporting/analytics, reducing complex joins. Common in data warehouses (star schema). Trade-off: faster reads vs. data redundancy and update complexity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Explain primary key, foreign key, and unique constraints.",
   "body": [
    {
     "t": "p",
     "text": "Primary key: unique + not null, identifies each row. Foreign key: references primary key in another table, enforces referential integrity. Unique: ensures no duplicates among non-NULL values (PostgreSQL, MySQL and SQLite allow many NULLs; SQL Server allows one)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is an ERD (Entity Relationship Diagram)?",
   "body": [
    {
     "t": "p",
     "text": "Visual representation of database entities (tables), their attributes (columns), and relationships (1:1, 1:N, M:N). Used for database design and communication."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "CAP theorem — explain with examples.",
   "body": [
    {
     "t": "p",
     "text": "Consistency: all nodes see same data. Availability: every request gets a response. Partition tolerance: system works despite network failures. Partitions happen, so when one does a distributed system must give up either consistency or availability: CP (MongoDB), AP (Cassandra). A single-node RDBMS is called CA only because it has no network to partition."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

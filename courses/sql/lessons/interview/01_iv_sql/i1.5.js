/* ============================================================================
   INTERVIEW I1.5 — 5. Subqueries & CTEs · 6. String, Date & Type Functions
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
 "lede": "**18 \u0001** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "5. Subqueries & CTEs · 6. String, Date & Type Functions",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is a CTE? Advantages over subqueries?",
   "body": [
    {
     "t": "p",
     "text": "Common Table Expression: named temporary result set using WITH clause. More readable, can reference itself (recursive), can be referenced multiple times, easier to debug."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "Explain recursive CTEs with an example.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH RECURSIVE org_tree AS (\n    SELECT id, name, manager_id, 1 AS level\n    FROM employees WHERE manager_id IS NULL  -- anchor\n    UNION ALL\n    SELECT e.id, e.name, e.manager_id, t.level + 1\n    FROM employees e JOIN org_tree t ON e.manager_id = t.id  -- recursive\n)\nSELECT * FROM org_tree ORDER BY level;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "Correlated vs non-correlated subquery?",
   "body": [
    {
     "t": "p",
     "text": "Non-correlated: executes once independently. Correlated: references outer query, executes once per outer row (slower). Example correlated: `WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.dept = e1.dept)`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "When to use EXISTS vs IN with subqueries?",
   "body": [
    {
     "t": "p",
     "text": "EXISTS is faster for large subqueries (stops at first match). IN materializes entire subquery result. EXISTS handles NULLs correctly. Use EXISTS for correlated checks, IN for small value lists."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "Write a CTE to generate a date series.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH RECURSIVE dates AS (\n    SELECT '2024-01-01'::date AS dt\n    UNION ALL\n    SELECT dt + INTERVAL '1 day' FROM dates WHERE dt < '2024-12-31'\n)\nSELECT dt FROM dates;"
    },
    {
     "t": "p",
     "text": "**Q91-105.** Additional patterns: multiple CTEs chained together, CTE vs temp table performance, subqueries in SELECT/FROM/WHERE clauses, scalar subqueries, and lateral subqueries for row-dependent computations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "Common string functions.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "LENGTH/LEN(str)\nUPPER(str), LOWER(str)\nTRIM/LTRIM/RTRIM(str)\nSUBSTRING(str, start, length) / SUBSTR\nCONCAT(str1, str2) / str1 || str2\nREPLACE(str, old, new)\nSPLIT_PART(str, delimiter, part_number)  -- PostgreSQL\nREGEXP_REPLACE(str, pattern, replacement)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "Common date functions.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "CURRENT_DATE, CURRENT_TIMESTAMP, NOW()\nDATE_TRUNC('month', date_col)  -- PostgreSQL\nEXTRACT(YEAR FROM date_col)\nDATEDIFF(end_date, start_date)  -- MySQL/SQL Server\nDATE_ADD(date, INTERVAL 7 DAY)\nTO_CHAR(date, 'YYYY-MM-DD')  -- PostgreSQL\nFORMAT(date, 'yyyy-MM-dd')   -- SQL Server"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "How to calculate age from date of birth?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT DATE_PART('year', AGE(CURRENT_DATE, birth_date)) AS age FROM persons;\n-- MySQL: TIMESTAMPDIFF(YEAR, birth_date, CURDATE())"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "CAST vs CONVERT?",
   "body": [
    {
     "t": "p",
     "text": "CAST is standard SQL (`CAST(col AS INT)`). CONVERT is database-specific with additional formatting options. Prefer CAST for portability."
    },
    {
     "t": "p",
     "text": "**Q110-125.** Date arithmetic, string pattern extraction with regex, type conversions, timezone handling, interval calculations, and working with JSON columns in SQL."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "126",
   "q": "Explain ACID properties.",
   "body": [
    {
     "t": "p",
     "text": "Atomicity: all-or-nothing transactions. Consistency: valid state transitions only. Isolation: concurrent transactions don't interfere. Durability: committed data survives crashes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What are isolation levels?",
   "body": [
    {
     "t": "p",
     "text": "READ UNCOMMITTED (dirty reads), READ COMMITTED (no dirty reads), REPEATABLE READ (no non-repeatable reads), SERIALIZABLE (no phantom reads). Higher isolation = more consistency but less concurrency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "Explain optimistic vs pessimistic locking.",
   "body": [
    {
     "t": "p",
     "text": "Pessimistic: lock rows when reading (SELECT FOR UPDATE). Optimistic: no locks, check for conflicts at commit time (version column). Optimistic is better for low-contention scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What are stored procedures and functions?",
   "body": [
    {
     "t": "p",
     "text": "Stored procedure: named block of SQL statements, can modify data, doesn't return a value inline. Function: returns a value, can be used in SELECT. Procedures for complex logic; functions for reusable calculations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is a view? Materialized view?",
   "body": [
    {
     "t": "p",
     "text": "View: virtual table (saved query, computed on access). Materialized view: physically stored query result (refreshed periodically). Materialized views are faster but can be stale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "Explain triggers.",
   "body": [
    {
     "t": "p",
     "text": "Automatic actions fired before/after INSERT/UPDATE/DELETE. Use for: audit logging, maintaining derived columns, enforcing complex constraints. Caution: can cause performance issues and implicit behavior."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What are indexes? Types?",
   "body": [
    {
     "t": "p",
     "text": "Data structures that speed up queries. B-tree (default, range queries), Hash (equality), GIN (full-text, arrays), GiST (geometric, range), BRIN (sorted physical data)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "Composite index vs multiple indexes?",
   "body": [
    {
     "t": "p",
     "text": "Composite: one index on multiple columns, best for queries filtering on leftmost columns together. Multiple: separate indexes, optimizer picks best one. Composite is more efficient for multi-column queries."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is query execution plan? How to read it?",
   "body": [
    {
     "t": "p",
     "text": "EXPLAIN/EXPLAIN ANALYZE shows how database executes a query. Look for: Seq Scan (full scan, slow), Index Scan (good), Sort (costly), Hash Join vs Nested Loop, estimated vs actual rows."
    },
    {
     "t": "p",
     "text": "**Q135-150.** Additional topics: partitioning (range, list, hash), MERGE/UPSERT statement, Common Table Expressions with INSERT/UPDATE, recursive hierarchy traversal, generating time series data, window function in UPDATE, database-specific features (PostgreSQL arrays, JSON operators, MySQL specifics vs PostgreSQL)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

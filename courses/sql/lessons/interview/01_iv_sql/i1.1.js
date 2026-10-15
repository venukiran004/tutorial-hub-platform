/* ============================================================================
   INTERVIEW I1.1 — 1. SQL Basics & SELECT
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
 "lede": "**20 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "1. SQL Basics & SELECT",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the difference between WHERE and HAVING?",
   "body": [
    {
     "t": "p",
     "text": "WHERE filters rows before aggregation; HAVING filters groups after aggregation. WHERE cannot use aggregate functions; HAVING can."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the order of SQL clause execution?",
   "body": [
    {
     "t": "p",
     "text": "FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT. Note: this is logical order, not written order."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Difference between DISTINCT and GROUP BY?",
   "body": [
    {
     "t": "p",
     "text": "DISTINCT removes duplicates from result set. GROUP BY groups rows for aggregation. GROUP BY without aggregation functions behaves like DISTINCT but can also include aggregate calculations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What does NULL mean in SQL?",
   "body": [
    {
     "t": "p",
     "text": "NULL represents missing/unknown data. It is not zero or empty string. NULL = NULL is FALSE (use IS NULL). Any arithmetic with NULL returns NULL. Use COALESCE() or IFNULL() to handle NULLs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain UNION vs UNION ALL.",
   "body": [
    {
     "t": "p",
     "text": "UNION combines results and removes duplicates (slower). UNION ALL combines all results including duplicates (faster). Use UNION ALL when you know there are no duplicates or duplicates are acceptable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between DELETE, TRUNCATE, and DROP?",
   "body": [
    {
     "t": "p",
     "text": "DELETE: removes specific rows (can use WHERE), logged, can rollback. TRUNCATE: removes all rows, faster, resets auto-increment. DROP: removes entire table structure and data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Explain BETWEEN — is it inclusive?",
   "body": [
    {
     "t": "p",
     "text": "Yes, BETWEEN is inclusive on both ends. `WHERE x BETWEEN 1 AND 10` is equivalent to `WHERE x >= 1 AND x <= 10`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the difference between IN and EXISTS?",
   "body": [
    {
     "t": "p",
     "text": "IN checks a value against a list (materializes subquery). EXISTS checks if subquery returns any row (stops at first match). EXISTS is generally faster for large subqueries."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How does LIKE differ from REGEXP?",
   "body": [
    {
     "t": "p",
     "text": "LIKE: simple pattern matching (% = any characters, _ = one character). REGEXP: full regular expression support (more powerful but slower)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is an alias and when would you use one?",
   "body": [
    {
     "t": "p",
     "text": "Alias renames a column or table temporarily using AS. Used for: readability, required for calculated columns, self-joins, and when column names conflict."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Explain CASE WHEN with an example.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT name,\n       CASE WHEN score >= 90 THEN 'A'\n            WHEN score >= 80 THEN 'B'\n            WHEN score >= 70 THEN 'C'\n            ELSE 'F'\n       END AS grade\nFROM students;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is COALESCE and how is it used?",
   "body": [
    {
     "t": "p",
     "text": "Returns the first non-NULL argument. `COALESCE(col1, col2, 'default')`. Useful for replacing NULLs and providing defaults."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Difference between CHAR and VARCHAR?",
   "body": [
    {
     "t": "p",
     "text": "CHAR: fixed length (padded with spaces). VARCHAR: variable length (stores only actual length). Use CHAR for fixed-format data (country codes), VARCHAR for variable text."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What are DML, DDL, DCL, and TCL?",
   "body": [
    {
     "t": "p",
     "text": "DDL: CREATE, ALTER, DROP (structure). DML: SELECT, INSERT, UPDATE, DELETE (data). DCL: GRANT, REVOKE (permissions). TCL: COMMIT, ROLLBACK, SAVEPOINT (transactions)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How to handle NULL in ORDER BY?",
   "body": [
    {
     "t": "p",
     "text": "NULLs sort first or last depending on the database. Use `ORDER BY col NULLS LAST` (PostgreSQL) or `ORDER BY COALESCE(col, 'zzz')` for control."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?",
   "body": [
    {
     "t": "p",
     "text": "COUNT(*): counts all rows including NULLs. COUNT(col): counts non-NULL values in column. COUNT(DISTINCT col): counts unique non-NULL values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Explain INSERT INTO ... SELECT.",
   "body": [
    {
     "t": "p",
     "text": "Inserts rows from a SELECT query into another table. Useful for data migration, creating derived tables, and backups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What does LIMIT/OFFSET do?",
   "body": [
    {
     "t": "p",
     "text": "LIMIT restricts number of returned rows. OFFSET skips rows before starting to return. Used for pagination: `LIMIT 10 OFFSET 20` returns rows 21-30."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is a temporary table?",
   "body": [
    {
     "t": "p",
     "text": "A table that exists only for the session/transaction. Created with `CREATE TEMPORARY TABLE`. Useful for intermediate calculations in complex queries."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Explain the difference between implicit and explicit joins.",
   "body": [
    {
     "t": "p",
     "text": "Implicit: `FROM t1, t2 WHERE t1.id = t2.id` (old style). Explicit: `FROM t1 JOIN t2 ON t1.id = t2.id` (preferred, clearer, supports OUTER joins)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

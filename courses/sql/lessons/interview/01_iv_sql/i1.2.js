/* ============================================================================
   INTERVIEW I1.2 — 2. JOINs
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
 "lede": "**15 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "2. JOINs",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Explain all types of JOINs with examples.",
   "body": [
    {
     "t": "p",
     "text": "INNER: matching rows only. LEFT: all from left + matching right (NULL if no match). RIGHT: all from right + matching left. FULL OUTER: all from both (NULLs where no match). CROSS: every row × every row (Cartesian product)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is a self-join? Give an example.",
   "body": [
    {
     "t": "p",
     "text": "Joining a table with itself. Example: find employees and their managers:"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT e.name AS employee, m.name AS manager\nFROM employees e LEFT JOIN employees m ON e.manager_id = m.id;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is a CROSS JOIN and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "Produces Cartesian product (every combination). Use for: generating date ranges, creating all possible pairings, combinatorial analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Explain NATURAL JOIN.",
   "body": [
    {
     "t": "p",
     "text": "Automatically joins on columns with same name in both tables. Risky: if column names change, join behavior changes silently. Prefer explicit JOIN ON."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How to do a LEFT JOIN excluding matching rows (anti-join)?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT a.* FROM table_a a\nLEFT JOIN table_b b ON a.id = b.id\nWHERE b.id IS NULL;"
    },
    {
     "t": "p",
     "text": "Alternative: `WHERE NOT EXISTS (SELECT 1 FROM table_b WHERE table_b.id = table_a.id)`"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What happens when you join on a column with NULLs?",
   "body": [
    {
     "t": "p",
     "text": "NULL = NULL evaluates to FALSE in joins, so rows with NULL join keys are never matched. They appear in OUTER joins with NULLs for the other table's columns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Explain the difference between ON and WHERE in a LEFT JOIN.",
   "body": [
    {
     "t": "p",
     "text": "ON: conditions for matching rows (non-matching still appear with NULLs). WHERE: filters entire result (removes non-matching rows, converting LEFT to INNER effectively)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How to join more than two tables?",
   "body": [
    {
     "t": "p",
     "text": "Chain JOINs: `FROM a JOIN b ON ... JOIN c ON ...`. Order matters for performance but not for correctness (optimizer may reorder)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is a semi-join?",
   "body": [
    {
     "t": "p",
     "text": "Returns rows from left table that have a match in right table, without duplicating. Implemented via EXISTS or IN subquery. No SQL keyword, but optimizer recognizes the pattern."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How to handle many-to-many relationships in SQL?",
   "body": [
    {
     "t": "p",
     "text": "Use a junction/bridge table with foreign keys to both related tables. Join through the bridge table."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is a lateral join/CROSS APPLY?",
   "body": [
    {
     "t": "p",
     "text": "Allows the subquery to reference columns from the outer query (correlated). Each row from outer table feeds into the subquery. PostgreSQL: LATERAL. SQL Server: CROSS APPLY."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How does join order affect performance?",
   "body": [
    {
     "t": "p",
     "text": "Query optimizer usually determines optimal join order. For manual optimization: start with smaller/filtered tables, join on indexed columns, use hash joins for large unsorted data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Write a query to find customers who ordered all products.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT customer_id\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(DISTINCT product_id) = (SELECT COUNT(*) FROM products);"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How to perform a range join?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT e.name, s.level\nFROM employees e JOIN salary_bands s\nON e.salary BETWEEN s.min_salary AND s.max_salary;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Explain hash join vs nested loop join vs merge join.",
   "body": [
    {
     "t": "p",
     "text": "Nested loop: for each row in outer, scan inner (good for small datasets, indexed). Hash join: build hash table on smaller set, probe with larger (good for unsorted, no index). Merge join: sort both, merge (good if already sorted or indexed)."
    },
    {
     "t": "p",
     "text": "**Q36-40. Additional JOIN scenarios** — pivot queries with joins, joining on expressions, multiple join conditions, non-equi joins, and join performance with composite keys all follow similar patterns of explicit conditions and careful NULL handling."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   INTERVIEW I1.3 — 3. GROUP BY, HAVING & Aggregations
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
 "lede": "**10 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "3. GROUP BY, HAVING & Aggregations",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "List all aggregate functions in SQL.",
   "body": [
    {
     "t": "p",
     "text": "COUNT, SUM, AVG, MIN, MAX, GROUP_CONCAT/STRING_AGG, VARIANCE/VAR_POP, STDDEV, PERCENTILE_CONT, PERCENTILE_DISC, ARRAY_AGG."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Can you SELECT a non-aggregated column without grouping by it?",
   "body": [
    {
     "t": "p",
     "text": "No (in standard SQL). Every column in SELECT must be in GROUP BY or inside an aggregate function. MySQL allows it with default settings but gives unpredictable results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Explain GROUPING SETS, CUBE, and ROLLUP.",
   "body": [
    {
     "t": "p",
     "text": "GROUPING SETS: specify exact grouping combinations. ROLLUP: hierarchical sub-totals (left to right). CUBE: all possible sub-total combinations."
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT region, product, SUM(sales)\nFROM sales_data\nGROUP BY ROLLUP(region, product);  -- totals by region, grand total"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Write a query to find the second highest salary.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT MAX(salary) FROM employees\nWHERE salary < (SELECT MAX(salary) FROM employees);\n-- OR using DENSE_RANK:\nSELECT salary FROM (\n    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rk\n    FROM employees\n) t WHERE rk = 2;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How to count occurrences and filter groups?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT department, COUNT(*) AS emp_count\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 5\nORDER BY emp_count DESC;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Find duplicates in a table.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT email, COUNT(*) as cnt\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the difference between SUM(CASE WHEN...) and COUNT(CASE WHEN...)?",
   "body": [
    {
     "t": "p",
     "text": "SUM(CASE WHEN condition THEN 1 ELSE 0 END) — counts matching rows. COUNT(CASE WHEN condition THEN 1 END) — same (COUNT ignores NULLs). Both create conditional aggregations (pivot-like)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How to calculate a running total without window functions?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT a.date, a.amount,\n       (SELECT SUM(b.amount) FROM sales b WHERE b.date <= a.date) AS running_total\nFROM sales a ORDER BY a.date;"
    },
    {
     "t": "p",
     "text": "Window function version: `SUM(amount) OVER (ORDER BY date)`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Compute median in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Using PERCENTILE_CONT (PostgreSQL/SQL Server):\nSELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary\nFROM employees;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How to pivot rows to columns?",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT customer_id,\n       SUM(CASE WHEN product = 'A' THEN amount ELSE 0 END) AS product_a,\n       SUM(CASE WHEN product = 'B' THEN amount ELSE 0 END) AS product_b,\n       SUM(CASE WHEN product = 'C' THEN amount ELSE 0 END) AS product_c\nFROM orders GROUP BY customer_id;"
    },
    {
     "t": "p",
     "text": "**Q51-60.** Additional aggregation patterns: conditional counting, string aggregation (GROUP_CONCAT/STRING_AGG), computing percentages within groups, top N per group, rolling averages with GROUP BY, and computing statistics (variance, standard deviation) directly in SQL."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

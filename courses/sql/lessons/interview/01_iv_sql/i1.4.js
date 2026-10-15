/* ============================================================================
   INTERVIEW I1.4 — 4. Window Functions
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
 "lede": "**12 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "4. Window Functions",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is a window function? How does it differ from GROUP BY?",
   "body": [
    {
     "t": "p",
     "text": "Window function computes across a set of rows related to current row WITHOUT collapsing them. GROUP BY aggregates and reduces rows. Window functions preserve individual rows."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "Explain the syntax: func() OVER (PARTITION BY ... ORDER BY ... ROWS/RANGE ...)",
   "body": [
    {
     "t": "p",
     "text": "OVER: defines the window. PARTITION BY: divides into groups (like GROUP BY but keeps rows). ORDER BY: sorts within partition. ROWS/RANGE: defines frame boundaries relative to current row."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "List the main window functions.",
   "body": [
    {
     "t": "p",
     "text": "Ranking: ROW_NUMBER, RANK, DENSE_RANK, NTILE. Aggregate: SUM, AVG, COUNT, MIN, MAX (over window). Value: LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Difference between ROW_NUMBER, RANK, and DENSE_RANK?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Data: 100, 100, 90, 80\nROW_NUMBER: 1, 2, 3, 4  (always unique)\nRANK:       1, 1, 3, 4  (skips after ties)\nDENSE_RANK: 1, 1, 2, 3  (no gaps)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "How do LAG and LEAD work?",
   "body": [
    {
     "t": "p",
     "text": "LAG(col, n): value n rows BEFORE current row. LEAD(col, n): value n rows AFTER current row. Used for: calculating differences between consecutive rows, detecting changes."
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT date, revenue,\n       revenue - LAG(revenue, 1) OVER (ORDER BY date) AS daily_change,\n       LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue\nFROM daily_sales;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "Calculate running average of last 7 days.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT date, amount,\n       AVG(amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7d\nFROM daily_sales;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "Explain ROWS vs RANGE in window frames.",
   "body": [
    {
     "t": "p",
     "text": "ROWS: physical offset (exact number of rows). RANGE: logical offset (rows with same ORDER BY value treated as one). ROWS is more predictable; RANGE groups ties."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "Find top 3 salaries per department.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT * FROM (\n    SELECT *, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rk\n    FROM employees\n) t WHERE rk <= 3;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "Calculate cumulative distribution.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT name, salary,\n       CUME_DIST() OVER (ORDER BY salary) AS cumulative_pct,\n       PERCENT_RANK() OVER (ORDER BY salary) AS percent_rank\nFROM employees;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Calculate month-over-month growth rate.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT month, revenue,\n       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))\n             / LAG(revenue) OVER (ORDER BY month), 2) AS mom_growth_pct\nFROM monthly_revenue;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is NTILE and how is it used?",
   "body": [
    {
     "t": "p",
     "text": "Divides rows into N approximately equal buckets. `NTILE(4) OVER (ORDER BY score)` creates quartiles. Useful for percentile calculations and bucketing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "Find consecutive days with sales above threshold.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH flagged AS (\n    SELECT date, sales,\n           date - ROW_NUMBER() OVER (ORDER BY date)::int AS grp\n    FROM daily_sales WHERE sales > 1000\n)\nSELECT MIN(date) AS start_date, MAX(date) AS end_date, COUNT(*) AS streak_days\nFROM flagged GROUP BY grp ORDER BY streak_days DESC;"
    },
    {
     "t": "p",
     "text": "**Q73-85.** Additional window patterns: first/last value per partition, moving sums, gap-and-island problems, sessionization, computing ratios within groups, year-over-year comparisons, and combining multiple window specs."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

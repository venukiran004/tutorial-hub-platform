/* ============================================================================
   LESSON 7.5 — The Interview Classics
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "**Every SQL interview draws from the same dozen questions, and each one is a test of a specific concept wearing a specific costume.** Second-highest salary is a test of ties. Top-n per group is a test of window functions and, again, ties. Consecutive days is a test of the gaps-and-islands trick. Employees earning more than their manager is a self-join. Customers who never ordered is the anti-join. This lesson executes the classics against the shop and the employees table, gives the strong answer for each, and names the follow-up question the interviewer is holding in reserve — because the classic is rarely the point; the follow-up is.",

  objectives: [
    "Answer the twelve most common SQL interview questions with executed, correct SQL",
    "State for each which concept it tests and what the expected follow-up is",
    "Handle ties, NULLs, duplicates and empty groups explicitly — the places where a plausible answer is wrong",
    "Talk through an answer: clarify the definition, write the simple version, then the robust one"
  ],

  prerequisites: ["3.1", "2.3", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Ranking: second highest, top n per group", id: "ranking" },

    { t: "code", lang: "sql", title: "Second-highest salary, three ways, and what ties do to each (executed)",
      hl: [2, 5, 8, 12, 13],
      code: `-- a. subquery: the highest below the highest. Handles ties correctly; returns NULL, not no row, if there is no second
SELECT MAX(salary) AS second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);        -- 150000

-- b. DENSE_RANK: generalises to nth, keeps ties as one rank
SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t WHERE r = 2;   -- 150000

-- c. DISTINCT + OFFSET: shortest; DISTINCT is what makes it tie-safe
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;                                       -- 150000

-- the follow-up is always "what if two people share the top salary" -- so show the three rank functions on the tie at 125000:
SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr, RANK() OVER (ORDER BY salary DESC) AS r, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
FROM employees ORDER BY salary DESC;
-- 125000 | 4 | 4 | 4      125000 | 4 | 4 | 5      120000 | 5 | 6 | 6
-- DENSE_RANK: the 5th distinct salary is 120000.  RANK: nothing is 5th.  ROW_NUMBER: Rosa is 5th by an arbitrary tiebreak.`,
      caption: "The concept under test is ties. Say which rank function you chose and why; if the interviewer says 'what about nth', DENSE_RANK with `r = n` is the answer, and if they say 'without window functions', the correlated form `WHERE (SELECT COUNT(DISTINCT salary) FROM employees WHERE salary > e.salary) = n - 1` is the classic."
    },

    { t: "code", lang: "sql", title: "Top 2 per department (executed)",
      hl: [1, 2],
      code: `SELECT department, name, salary
FROM  (SELECT *, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS r FROM employees) t
WHERE r <= 2 ORDER BY department, salary DESC, name;
-- engineering | Oscar  | 150000        sales | Priya  | 120000        exec | Nadia | 190000
-- engineering | Tomas  | 131000        sales | Viktor | 91000

-- follow-ups: "exactly two rows per department even with ties" -> ROW_NUMBER with a deterministic tiebreak (ORDER BY salary DESC, hired_on, employee_id)
--             "the department's total alongside"                 -> SUM(salary) OVER (PARTITION BY department) in the same subquery
--             "in DuckDB / Snowflake"                             -> QUALIFY DENSE_RANK() OVER (...) <= 2, no subquery (3.1)`,
      caption: "PARTITION BY is the whole answer to 'per group'. The three-way choice of rank function is the follow-up; being able to say 'DENSE_RANK if ties should both appear, ROW_NUMBER with a tiebreak if you need exactly n' ends the question."
    },

    { t: "h2", n: "02", text: "Self-joins and anti-joins", id: "joins" },

    { t: "code", lang: "sql", title: "More than their manager; never ordered; duplicates (executed)",
      hl: [2, 3, 8, 10, 15, 18],
      code: `-- employees earning more than their manager: the table joined to itself, once as employee and once as manager
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM   employees e JOIN employees m ON m.employee_id = e.manager_id
WHERE  e.salary > m.salary;
-- Tomas | 131000 | Quentin | 125000              -- Nadia (manager_id NULL) is excluded by the inner join, correctly

-- customers who never ordered: the anti-join, two spellings (2.3)
SELECT c.name FROM customers c LEFT JOIN orders o USING (customer_id) WHERE o.order_id IS NULL;          -- Mara
SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);   -- Mara
-- follow-up: "never PAID" -> the condition moves into the subquery: ... WHERE o.customer_id = c.customer_id AND o.status = 'paid'  -> Iker, Mara
-- trap:      NOT IN (SELECT customer_id FROM orders) returns nothing if any customer_id in orders is NULL (1.3)

-- duplicate emails: find them, then delete all but the lowest id
SELECT email, COUNT(*) AS n FROM emails GROUP BY email HAVING COUNT(*) > 1;              -- a@x.com 3, b@x.com 2
DELETE FROM emails WHERE id NOT IN (SELECT MIN(id) FROM emails GROUP BY email);          -- 3 deleted; 1, 2, 4 remain
-- without a unique id: DELETE FROM emails WHERE ctid NOT IN (SELECT MIN(ctid) ...) in PostgreSQL, or ROW_NUMBER() in a CTE and delete rn > 1`,
      caption: "The self-join question is testing whether you alias the same table twice and get the direction of the join right (`m.employee_id = e.manager_id`, not the reverse). The anti-join question is testing NULL awareness; mention NOT IN's trap unprompted."
    },

    { t: "dl", items: [
      ["Ties", "Rows equal under the ORDER BY. DENSE_RANK gives them one rank with no gap; RANK one rank with a gap; ROW_NUMBER distinct numbers arbitrarily unless a tiebreak is added."],
      ["Gaps and islands", "Finding runs of consecutive values. `value − ROW_NUMBER()` is constant within a run; group by it."],
      ["Anti-join", "Rows in A with no match in B: `LEFT JOIN … WHERE b.key IS NULL` or `NOT EXISTS`. Never `NOT IN` against a nullable column."],
      ["Self-join", "A table joined to itself under two aliases: employees to managers, orders to previous orders, rows to the next row."],
      ["Conditional aggregation", "`COUNT(*) FILTER (WHERE …)` or `SUM(CASE WHEN … THEN 1 ELSE 0 END)`: a pivot without PIVOT, portable everywhere."],
      ["Running total", "`SUM(x) OVER (ORDER BY t ROWS UNBOUNDED PRECEDING)`; add a unique column to the ORDER BY so ties do not produce plateaus (3.2)."]
    ]},

    { t: "h2", n: "03", text: "Sequences: consecutive days, gaps, running totals", id: "sequences" },

    { t: "code", lang: "sql", title: "Consecutive login days — the gaps-and-islands trick (executed)",
      hl: [2, 3, 5, 6, 10, 11],
      code: `-- logins (user_id, login_date), with a duplicate row for user 2 on 05-04
WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),                             -- duplicates would break the arithmetic
g AS (SELECT *, login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::INTEGER * INTERVAL 1 DAY AS grp FROM d)
--   consecutive dates and consecutive row numbers advance together, so their difference is constant inside a streak
SELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end, COUNT(*) AS days
FROM   g GROUP BY user_id, grp HAVING COUNT(*) >= 2 ORDER BY user_id, streak_start;
-- 1 | 2025-05-01 | 2025-05-03 | 3        1 | 2025-05-05 | 2025-05-06 | 2        2 | 2025-05-03 | 2025-05-04 | 2

-- follow-up: longest streak per user -> one more aggregation over the islands
-- SELECT user_id, MAX(days) FROM (SELECT user_id, grp, COUNT(*) AS days FROM g GROUP BY 1, 2) GROUP BY 1;   -- 1: 3, 2: 2, 3: 1
-- follow-up: "three consecutive days" with LAG/LEAD -> works for a fixed n; the islands form works for any n and gives the streaks themselves`,
      caption: "The DISTINCT is the part candidates forget: a duplicate date shifts ROW_NUMBER without shifting the date, and the run splits. PostgreSQL: `login_date - ROW_NUMBER() OVER (...)::INTEGER` subtracts days directly; MySQL: `DATE_SUB(login_date, INTERVAL rn DAY)`."
    },

    { t: "code", lang: "sql", title: "Gaps in a sequence, running total with share, month-over-month growth (executed)",
      hl: [2, 6, 7, 12, 13],
      code: `-- gaps in ids 1, 2, 4, 5, 8: where the next id is more than one away
SELECT id + 1 AS gap_start, next_id - 1 AS gap_end
FROM  (SELECT id, LEAD(id) OVER (ORDER BY id) AS next_id FROM seq) t WHERE next_id - id > 1;        -- 3..3, 6..7

-- running total and share of total, per paid order
SELECT order_id, placed_at::DATE AS d, amt, SUM(amt) OVER (ORDER BY placed_at, order_id) AS running,
       ROUND(100.0 * amt / SUM(amt) OVER (), 1) AS pct
FROM   (SELECT o.order_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amt FROM orders o JOIN order_items oi USING (order_id)
        WHERE o.status = 'paid' GROUP BY ALL) t ORDER BY placed_at;
-- 100 | 2025-01-05 | 42.00 | 42.00 | 6.0     101 | 2025-01-06 | 85.00 | 127.00 | 12.2     ...     111 | 2025-04-04 | 52.50 | 697.90 | 7.5

-- month-over-month growth: LAG, with NULLIF against a zero previous month
WITH m AS (SELECT date_trunc('month', o.placed_at)::DATE AS month, SUM(oi.qty * oi.unit_price) AS rev
           FROM orders o JOIN order_items oi USING (order_id) WHERE o.status = 'paid' GROUP BY 1)
SELECT month, rev, LAG(rev) OVER (ORDER BY month) AS prev,
       ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY month)) / NULLIF(LAG(rev) OVER (ORDER BY month), 0), 1) AS growth_pct FROM m;
-- 2025-01 203.00 NULL NULL      2025-02 251.90 203.00 24.1      2025-03 190.50 251.90 -24.4      2025-04 52.50 190.50 -72.4`,
      caption: "Three follow-ups live here: 'what if a month has no orders' (LAG skips it — join to a month spine first, 1.5), 'what about ties in the running total' (the `order_id` in the ORDER BY), and 'share within each month' (`SUM(amt) OVER (PARTITION BY month)`)."
    },

    { t: "h2", n: "04", text: "Aggregation shapes: median, pivot, first and last", id: "aggregates" },

    { t: "code", lang: "sql", title: "Median, conditional pivot, first-and-last in one row, group versus company (executed)",
      hl: [2, 3, 7, 8, 12, 13, 17],
      code: `-- median salary, portable (3.4): the middle one or two rows by ROW_NUMBER
WITH r AS (SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS n FROM employees)
SELECT AVG(salary) AS median FROM r WHERE rn IN (FLOOR((n + 1) / 2.0), CEIL((n + 1) / 2.0));     -- 122500.0 (10 rows: mean of 5th and 6th)
-- PostgreSQL: percentile_cont(0.5) WITHIN GROUP (ORDER BY salary);   DuckDB: median(salary)

-- orders per customer per status: a pivot by conditional aggregation
SELECT c.name, COUNT(*) FILTER (WHERE o.status = 'paid') AS paid, COUNT(*) FILTER (WHERE o.status = 'refunded') AS refunded,
       COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled
FROM   customers c JOIN orders o USING (customer_id) GROUP BY c.name ORDER BY c.name;
-- Asha 3 0 0 · Bruno 2 0 0 · Chen 1 1 0 · Dalia 1 0 0 · Emeka 2 0 0 · Fatou 1 0 0 · Iker 0 0 1        (Mara: no row -- LEFT JOIN to include her)

-- first and last order per customer, in one row
SELECT customer_id, MIN(placed_at)::DATE AS first_order, MAX(placed_at)::DATE AS last_order,
       arg_min(order_id, placed_at) AS first_id, arg_max(order_id, placed_at) AS last_id FROM orders GROUP BY customer_id;
-- 1 | 2025-01-05 | 2025-03-15 | 100 | 108        -- portable: FIRST_VALUE / LAST_VALUE over a full frame, or two ROW_NUMBERs (3.3)

-- each department against the company average: a scalar subquery, or AVG(salary) OVER () in a window
SELECT department, ROUND(AVG(salary)) AS dept_avg, ROUND(AVG(salary) - (SELECT AVG(salary) FROM employees)) AS vs_company
FROM   employees GROUP BY department ORDER BY dept_avg DESC;
-- exec 190000 +71800 · engineering 125800 +7600 · sales 90750 -27450`,
      caption: "'Median' tests whether you know there is no portable aggregate and can build one; 'pivot' tests conditional aggregation; 'first and last' tests whether you reach for a window or an ordered aggregate rather than two self-joins. The last one tests the difference between a group average and a grand average in the same query."
    },

    { t: "table",
      head: ["Question", "Concept under test", "Standard answer", "The follow-up they are holding"],
      rows: [
        ["Second highest salary", "Ties, NULL on absence", "MAX below MAX; DENSE_RANK = 2", "nth highest; without window functions; what if only one salary"],
        ["Top n per group", "PARTITION BY, rank choice", "DENSE_RANK ≤ n in a subquery / QUALIFY", "exactly n with ties; the group total alongside"],
        ["Earn more than manager", "Self-join direction", "e JOIN m ON m.id = e.manager_id", "include the CEO; the chain above (recursive CTE, 4.3)"],
        ["Customers who never ordered", "Anti-join, NULL trap", "NOT EXISTS / LEFT JOIN … IS NULL", "never paid; why not NOT IN"],
        ["Find / remove duplicates", "GROUP BY HAVING; keep-one", "HAVING COUNT(*) > 1; DELETE … NOT IN (MIN(id))", "no unique id; keep the latest instead"],
        ["Consecutive days", "Gaps and islands", "date − ROW_NUMBER() grouping", "longest streak; duplicates; n-day streak"],
        ["Running total / share", "Window frames", "SUM OVER (ORDER BY …)", "ties; per-group share; months with no rows"],
        ["Month-over-month", "LAG, division by zero", "LAG + NULLIF", "missing months; year-over-year same month"],
        ["Median", "No portable aggregate", "ROW_NUMBER middle rows; percentile_cont", "per group; even counts"],
        ["Pivot rows to columns", "Conditional aggregation", "COUNT FILTER / SUM CASE", "unknown set of columns (dynamic SQL or PIVOT)"],
        ["First and last per group", "Ordered aggregates", "arg_min/arg_max; FIRST_VALUE; ROW_NUMBER", "with the amount of each; ties on the timestamp"],
        ["Cumulative distinct users", "Two-level aggregation", "first month per user, then SUM OVER of counts", "active in month, not first month (retention, 7.3)"]
      ]
    },

    { t: "h2", n: "05", text: "How to talk through it", id: "method" },

    { t: "callout", kind: "mental", title: "Clarify, simple, robust, follow-up", body: [
      { t: "p", text: "**Clarify** the definition in one question: 'do ties share a rank?', 'is a refunded order an order?', 'can the same user log in twice a day?'. **Write the simple version** that answers the literal question. **Make it robust** by naming the edge you handled — NULLs, ties, empty groups, division by zero — and show the one-line change. **Offer the follow-up** yourself: 'if you wanted the nth, this becomes DENSE_RANK = n'. That sequence shows the interviewer what they are actually assessing: whether you know where SQL answers are wrong." }
    ]},

    { t: "ladder",
      title: "'Find the customers who placed an order every month this year'",
      rungs: [
        { level: "bad", label: "Count orders and compare with 12", code: `SELECT customer_id FROM orders WHERE placed_at >= '2025-01-01' GROUP BY customer_id HAVING COUNT(*) >= 12`,
          note: "**Twelve orders in one month passes.** Counts orders, not months." },
        { level: "ok", label: "Count distinct months", code: `SELECT customer_id FROM orders WHERE placed_at >= '2025-01-01' AND status <> 'cancelled'
GROUP BY customer_id HAVING COUNT(DISTINCT date_trunc('month', placed_at)) = 12`,
          note: "**Correct for a full year.** Fails in July — nobody has twelve months yet — and the 12 is a literal." },
        { level: "best", label: "Compare against the months that have happened", code: `SELECT customer_id FROM orders WHERE placed_at >= DATE '2025-01-01' AND status <> 'cancelled'
GROUP BY customer_id
HAVING COUNT(DISTINCT date_trunc('month', placed_at)) =
       (SELECT COUNT(DISTINCT date_trunc('month', placed_at)) FROM orders WHERE placed_at >= DATE '2025-01-01')`,
          note: "**Every month in which any order exists.** The definition question — 'every month so far, or every month of the year?' — is the one to ask before writing either." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Drill",
      title: "Twelve in forty minutes",
      difficulty: "core",
      minutes: 40,
      body: [
        { t: "p", text: "Against the shop schema (1.1) and the employees table, write each of the following without looking at the lesson, then run it. Note the edge case you handled in a comment on each." },
        { t: "p", text: "**1.** The third-highest distinct salary. **2.** The highest-paid employee in each department, one row per department even with ties. **3.** Each employee with their manager's name, including the one with no manager. **4.** Customers whose every order was paid (no refunds or cancellations) — and who have at least one order. **5.** Products never ordered. **6.** Orders whose amount is above the average order amount. **7.** For each customer, the gap in days between consecutive orders, and the largest gap. **8.** The month with the highest paid revenue and how far above the mean month it was. **9.** Employees hired in the same year as at least one other employee. **10.** Each order's rank within its customer's orders by amount, and the share of that customer's total. **11.** The number of employees under each manager, directly and at any depth. **12.** Customers with orders in at least two consecutive calendar months." }
      ],
      requirements: [
        "Every query executed and its result checked against the data by hand for at least one row.",
        "A comment per query naming the concept and the edge case.",
        "No NOT IN against a nullable column."
      ],
      hint: "3: LEFT JOIN. 4: HAVING with a conditional count equal to COUNT(*). 7: LAG then MAX. 9: a window COUNT over the hire year. 11: a recursive CTE for depth (4.3). 12: consecutive-month islands on distinct months per customer.",
      solution: {
        lang: "sql",
        title: "twelve.sql (selected)",
        code: `-- 1. ties: DENSE_RANK on distinct salaries                                     -> 131000
SELECT salary FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t WHERE r = 3;

-- 2. exactly one per department: ROW_NUMBER with a deterministic tiebreak        -> Oscar, Nadia, Priya
SELECT department, name, salary FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, hired_on, employee_id) AS rn FROM employees) t WHERE rn = 1;

-- 3. the CEO has manager_id NULL: LEFT JOIN keeps her                            -> Nadia | NULL
SELECT e.name, m.name AS manager FROM employees e LEFT JOIN employees m ON m.employee_id = e.manager_id;

-- 4. all-paid customers with at least one order: paid count equals total count    -> Asha, Bruno, Dalia, Emeka, Fatou
SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) FILTER (WHERE status = 'paid') = COUNT(*);

-- 6. average of order amounts, not of line amounts: aggregate to orders first     -> 101, 102, 104, 106, 108
WITH oa AS (SELECT o.order_id, SUM(oi.qty * oi.unit_price) AS amt FROM orders o JOIN order_items oi USING (order_id) GROUP BY 1)
SELECT order_id, amt FROM oa WHERE amt > (SELECT AVG(amt) FROM oa);

-- 7. gaps between consecutive orders: LAG per customer; first order has NULL gap; then MAX ignores NULLs
WITH g AS (SELECT customer_id, order_id, placed_at,
                  DATE_DIFF('day', LAG(placed_at) OVER (PARTITION BY customer_id ORDER BY placed_at), placed_at) AS gap_days FROM orders)
SELECT customer_id, MAX(gap_days) AS largest_gap FROM g GROUP BY customer_id HAVING MAX(gap_days) IS NOT NULL;     -- 1: 54, 2: 36, 3: 53, 5: 53

-- 9. same hire year as someone else: a window count over the year, no self-join needed
SELECT name, EXTRACT(year FROM hired_on) AS yr FROM (SELECT *, COUNT(*) OVER (PARTITION BY EXTRACT(year FROM hired_on)) AS n FROM employees) t WHERE n > 1;

-- 11. direct reports by GROUP BY; all reports by a recursive CTE (4.3)
WITH RECURSIVE tree AS (
  SELECT employee_id AS root, employee_id AS node FROM employees
  UNION ALL SELECT t.root, e.employee_id FROM tree t JOIN employees e ON e.manager_id = t.node
)
SELECT root AS manager_id, COUNT(*) - 1 AS all_reports FROM tree GROUP BY root HAVING COUNT(*) > 1 ORDER BY 1;   -- 1: 9, 2: 4, 3: 3, 4: 2, 8: 1

-- 12. consecutive months: islands over DISTINCT (customer, month), month index - ROW_NUMBER constant within a run
WITH m AS (SELECT DISTINCT customer_id, date_trunc('month', placed_at)::DATE AS mo FROM orders WHERE status <> 'cancelled'),
g AS (SELECT *, (EXTRACT(year FROM mo) * 12 + EXTRACT(month FROM mo)) - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mo) AS grp FROM m)
SELECT DISTINCT customer_id FROM (SELECT customer_id, grp, COUNT(*) AS run FROM g GROUP BY 1, 2) t WHERE run >= 2;   -- 2 (Jan, Feb) and 3 (Feb, Mar): Bruno and Chen; Emeka's Feb and Apr are not consecutive`,
        notes: [
          { t: "p", text: "**Question 4 is the one most people get wrong**: 'every order paid' is a universal condition, and SQL expresses universals as 'the count that satisfies equals the count overall' or as `NOT EXISTS` a counter-example. Chen has one paid and one refunded, so he is out; Mara has no orders, so she never enters the GROUP BY." },
          { t: "p", text: "**Question 6 hides a grain error**: averaging `qty * unit_price` over line items gives the average line, not the average order. Aggregate to the grain the question names, then compare." },
          { t: "p", text: "**Question 12 converts months to an integer index** (`year * 12 + month`) before the islands trick, because subtracting a row number from a date works in days, not months." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Two employees share the highest salary. What does `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` return?",
          options: [
            "The shared top salary",
            "The highest salary below the shared top — the second-highest distinct value — which is the usual intended meaning; a ROW_NUMBER-based answer would have returned the top salary again",
            "NULL",
            "An error"
          ],
          answer: 1,
          why: "The subquery form is tie-safe by construction. Saying so, and naming the ROW_NUMBER failure, is the point of the question."
        }
      ]
    }
  ],

  takeaways: [
    "**Second highest tests ties**: MAX below MAX, DENSE_RANK = 2, or DISTINCT … OFFSET 1; never ROW_NUMBER = 2.",
    "**Top n per group tests PARTITION BY and the rank choice**: DENSE_RANK to keep ties, ROW_NUMBER with a tiebreak for exactly n.",
    "**Self-joins test alias direction**; the CEO with a NULL manager tests whether you chose LEFT.",
    "**Never-ordered tests the anti-join and NOT IN's NULL trap**; 'never paid' moves the condition into the subquery.",
    "**Consecutive days is gaps-and-islands**: `date − ROW_NUMBER()` after a DISTINCT.",
    "**Running totals need a unique tiebreak in the ORDER BY; growth needs NULLIF; missing months need a spine.**",
    "**Median has no portable aggregate**: middle rows by ROW_NUMBER, or percentile_cont / median where available.",
    "**Pivot is conditional aggregation; first-and-last is an ordered aggregate or a window, not two self-joins.**",
    "**Universal conditions ('every order paid') are 'satisfying count = total count' or NOT EXISTS a counter-example.**",
    "**Aggregate to the grain the question names before comparing** — average order, not average line.",
    "**Clarify, simple, robust, follow-up**: the interviewer is assessing whether you know where SQL answers go wrong."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which query returns exactly one employee per department, highest paid, even when two share the top salary?",
        options: [
          "DENSE_RANK() = 1",
          "ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, hired_on, employee_id) = 1 — a deterministic tiebreak makes the single row reproducible",
          "RANK() = 1",
          "MAX(salary) GROUP BY department"
        ],
        answer: 1,
        why: "DENSE_RANK and RANK return both tied employees; MAX returns the salary but not the employee. ROW_NUMBER with a stated tiebreak is the only 'exactly one, and I can say which'."
      },
      {
        stem: "Why does the consecutive-days query need `SELECT DISTINCT user_id, login_date` first?",
        options: [
          "For performance",
          "A duplicate date advances ROW_NUMBER without advancing the date, so `date − rn` changes and one streak is split into two",
          "DISTINCT sorts the rows",
          "It does not need it"
        ],
        answer: 1,
        why: "The islands trick relies on both sequences advancing together. Duplicates break the invariant; so do gaps, which is the point."
      },
      {
        stem: "'Customers with no paid orders' — which is correct?",
        options: [
          "WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE status = 'paid')",
          "WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'paid') — the condition inside the subquery, NULL-safe",
          "LEFT JOIN orders WHERE status <> 'paid'",
          "JOIN orders WHERE status <> 'paid'"
        ],
        answer: 1,
        why: "NOT IN is empty if the subquery ever yields a NULL; the LEFT JOIN with a WHERE on status becomes an inner join and returns customers with any non-paid order, not customers with no paid order."
      },
      {
        stem: "How do you express 'every one of the customer's orders was paid'?",
        options: [
          "WHERE status = 'paid' GROUP BY customer_id",
          "GROUP BY customer_id HAVING COUNT(*) FILTER (WHERE status = 'paid') = COUNT(*) — or NOT EXISTS an order that is not paid",
          "HAVING COUNT(*) > 0",
          "WHERE status <> 'refunded'"
        ],
        answer: 1,
        why: "A WHERE filters rows, not customers; the first option returns every customer with at least one paid order. Universals need a count comparison or the absence of a counter-example."
      },
      {
        stem: "'Orders above the average order amount' — what is the grain mistake to avoid?",
        options: [
          "Using AVG at all",
          "Averaging line-item amounts (qty × price per line) instead of order amounts; aggregate lines to orders in a CTE first, then compare each order with the average of that CTE",
          "Using a subquery",
          "Including cancelled orders"
        ],
        answer: 1,
        why: "The average of lines is lower than the average of orders whenever orders have several lines. Match the grain of the comparison to the grain of the question."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Find the second-highest salary. Then: what if there are ties, what if there is only one salary, and do it without window functions.",
        strong: "MAX of salary where salary is below the overall MAX: it is tie-safe because it compares values, not rows, and if there is only one distinct salary it returns NULL rather than an error — which I would say is the right answer to 'there is no second'. With window functions, DENSE_RANK ordered by salary descending, filter rank 2, which generalises to nth. Without them and for general n: a correlated count of distinct salaries greater than each row's salary, equal to n minus 1. What I would not use is ROW_NUMBER, because with a tie at the top it returns the top salary again, and OFFSET without DISTINCT for the same reason.",
        answer: [
          { t: "p", text: "Tie-safety, the NULL case, the generalisation, and the wrong answer named — all four follow-ups pre-empted." }
        ]
      },
      {
        level: "core",
        q: "Users who logged in on three or more consecutive days.",
        strong: "Gaps and islands. First DISTINCT user and date, because a duplicate login on one day would break the arithmetic. Then ROW_NUMBER per user ordered by date, and subtract that number of days from the date: within a run of consecutive days the date and the row number advance together, so the difference is constant, and it changes at every gap. Group by user and that difference, count the rows, keep groups of three or more — which also gives the start and end of each streak. LAG twice works for exactly three but not for 'longest streak'; the islands form answers both.",
        answer: [
          { t: "p", text: "The DISTINCT, the invariant explained in one sentence, and why islands beat LAG." }
        ]
      },
      {
        level: "advanced",
        q: "You have thirty seconds: what do you check before you say a query is done?",
        strong: "Grain — is each output row what the question asked for, and did I aggregate before comparing? NULLs — any NOT IN, any comparison or arithmetic on a nullable column, any join whose filter belongs in the ON clause? Ties — does the rank function match the intended behaviour, and is the ORDER BY in every window deterministic? Duplicates — did a join fan out, and is COUNT DISTINCT needed? Edges — an empty group, a division by zero, a first row with no previous, a month with no data? And the definition — did I state what I assumed 'active', 'order' and 'this year' mean? Those six catch nearly every wrong-but-runs query I have seen.",
        answer: [
          { t: "p", text: "Grain, NULLs, ties, duplicates, edges, definitions — a checklist is the mature answer to 'are you done'." }
        ]
      }
    ]
  }
});

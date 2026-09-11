/* ============================================================================
   LESSON 3.2 — Ranking and Top-N per Group
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**Quentin and Rosa both earn 125,000. Ask for the top three engineers by salary and you will get three, four, or four — depending on which ranking function you used, and none of the three answers is wrong.** ROW_NUMBER breaks the tie arbitrarily, RANK skips a position after it, DENSE_RANK does not. The interview question 'second-highest salary per department' is really the question 'what is your policy on ties', and the ranking functions are the three policies. The top-N-per-group pattern is one of them inside a subquery, filtered on the rank.",

  objectives: [
    "State exactly how ROW_NUMBER, RANK, DENSE_RANK and NTILE number a tie",
    "Write the greatest-n-per-group pattern with a partitioned ranking in a subquery or QUALIFY",
    "Answer 'the nth highest' questions with the ranking function whose tie policy matches the intent",
    "Make a ranking deterministic with a tie-breaker, and know when not to"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Three numberings of the same order", id: "three" },

    { t: "p", text: "All three ranking functions take an ORDER BY inside OVER and assign a number to each row in that order. They differ only at ties. **ROW_NUMBER gives every row a distinct number, choosing arbitrarily among ties unless the ORDER BY has a tie-breaker. RANK gives tied rows the same number and skips the numbers they consumed. DENSE_RANK gives tied rows the same number and skips nothing.** NTILE(n) splits the ordered rows into n buckets as evenly as it can and returns the bucket." },

    { t: "code", lang: "sql", title: "Ten salaries, one tie, four numberings",
      hl: [6, 7],
      code: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense,
       NTILE(4)     OVER (ORDER BY salary DESC) AS quartile
FROM   employees ORDER BY salary DESC, name;
-- name    | salary | row_num | rnk | dense | quartile
-- Nadia   | 190000 | 1       | 1   | 1     | 1
-- Oscar   | 150000 | 2       | 2   | 2     | 1
-- Tomas   | 131000 | 3       | 3   | 3     | 1
-- Quentin | 125000 | 4       | 4   | 4     | 2
-- Rosa    | 125000 | 5       | 4   | 4     | 2        <- the tie: row_num 4 and 5 (arbitrary), rank 4 and 4, dense 4 and 4
-- Priya   | 120000 | 6       | 6   | 5     | 2        <- after it: row_num 6, rank 6 (5 was skipped), dense 5
-- Sami    | 98000  | 7       | 7   | 6     | 3
-- Viktor  | 91000  | 8       | 8   | 7     | 3
-- Uma     | 82000  | 9       | 9   | 8     | 4
-- Wen     | 70000  | 10      | 10  | 9     | 4
-- NTILE(4) over 10 rows: buckets of 3, 3, 2, 2 -- the first buckets get the extra rows`,
      caption: "RANK is 'how many rows are strictly ahead of me, plus one' — a competition ranking, where a tie for fourth means nobody is fifth. DENSE_RANK is 'how many distinct values are ahead of me, plus one'. ROW_NUMBER is a sequence number that ignores the tie, which is exactly why it needs a tie-breaker."
    },

    { t: "dl", items: [
      ["`ROW_NUMBER()`", "1, 2, 3, … in the window's order, no repeats. Ties are ordered arbitrarily unless the ORDER BY makes them distinct. Use for 'exactly n rows' and for de-duplication."],
      ["`RANK()`", "Ties share a rank; the next rank skips: 1, 2, 3, 4, 4, 6. Use when 'joint fourth' should mean there is no fifth — competition results, 'top n including ties'."],
      ["`DENSE_RANK()`", "Ties share a rank; no gaps: 1, 2, 3, 4, 4, 5. Use for 'the nth distinct value' — second-highest salary, third-best score."],
      ["`NTILE(n)`", "Bucket number 1..n with as equal a count per bucket as possible; earlier buckets get the remainder. Quartiles, deciles, RFM scores (7.3)."],
      ["`PERCENT_RANK()`, `CUME_DIST()`", "The rank as a fraction of the partition: (rank − 1) / (rows − 1), and the share of rows at or below this one. Percentile positions (3.5)."],
      ["Tie-breaker", "An extra ORDER BY key — usually the primary key — that makes ROW_NUMBER deterministic. Without it, two runs can number tied rows differently."]
    ]},

    { t: "viz",
      title: "What happens at a tie",
      caption: "Quentin and Rosa share 125,000. ROW_NUMBER hands out 4 and 5 by whatever order it finds them in; RANK gives both 4 and then jumps to 6; DENSE_RANK gives both 4 and continues with 5.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Three columns of numbered cells for six salaries with a tie at the fourth position, showing ROW_NUMBER 1-6, RANK 1 2 3 4 4 6, and DENSE_RANK 1 2 3 4 4 5, with the tied rows highlighted.">
  <g class="s-label" style="font-weight:600" text-anchor="middle">
    <text x="140" y="36">ROW_NUMBER</text><text x="440" y="36">RANK</text><text x="740" y="36">DENSE_RANK</text>
  </g>
  <g class="s-sub" text-anchor="end">
    <text x="70" y="70">Nadia 190k</text><text x="70" y="98">Oscar 150k</text><text x="70" y="126">Tomas 131k</text>
    <text x="70" y="154" style="fill:var(--warn)">Quentin 125k</text><text x="70" y="182" style="fill:var(--warn)">Rosa 125k</text><text x="70" y="210">Priya 120k</text>
  </g>
  <g>
    <rect x="90" y="54" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="140" y="70" class="s-mono" text-anchor="middle">1</text>
    <rect x="90" y="82" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="140" y="98" class="s-mono" text-anchor="middle">2</text>
    <rect x="90" y="110" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="140" y="126" class="s-mono" text-anchor="middle">3</text>
    <rect x="90" y="138" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="140" y="154" class="s-mono" text-anchor="middle">4</text>
    <rect x="90" y="166" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="140" y="182" class="s-mono" text-anchor="middle">5  (arbitrary)</text>
    <rect x="90" y="194" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="140" y="210" class="s-mono" text-anchor="middle">6</text>
  </g>
  <g>
    <rect x="390" y="54" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="440" y="70" class="s-mono" text-anchor="middle">1</text>
    <rect x="390" y="82" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="440" y="98" class="s-mono" text-anchor="middle">2</text>
    <rect x="390" y="110" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="440" y="126" class="s-mono" text-anchor="middle">3</text>
    <rect x="390" y="138" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="440" y="154" class="s-mono" text-anchor="middle">4</text>
    <rect x="390" y="166" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="440" y="182" class="s-mono" text-anchor="middle">4</text>
    <rect x="390" y="194" width="100" height="22" rx="4" style="fill:var(--crit);fill-opacity:.2;stroke:var(--crit)" stroke-width="1"/><text x="440" y="210" class="s-mono" text-anchor="middle">6  (5 skipped)</text>
  </g>
  <g>
    <rect x="690" y="54" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="740" y="70" class="s-mono" text-anchor="middle">1</text>
    <rect x="690" y="82" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="740" y="98" class="s-mono" text-anchor="middle">2</text>
    <rect x="690" y="110" width="100" height="22" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><text x="740" y="126" class="s-mono" text-anchor="middle">3</text>
    <rect x="690" y="138" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="740" y="154" class="s-mono" text-anchor="middle">4</text>
    <rect x="690" y="166" width="100" height="22" rx="4" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="740" y="182" class="s-mono" text-anchor="middle">4</text>
    <rect x="690" y="194" width="100" height="22" rx="4" style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="1"/><text x="740" y="210" class="s-mono" text-anchor="middle">5  (no gap)</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "Top-N per group", id: "topn" },

    { t: "p", text: "'The three best-paid people in each department' is a ranking partitioned by department, filtered to rank ≤ 3. Because a window cannot be filtered in its own WHERE (3.1), the ranking goes in a subquery and the filter outside — or in QUALIFY. **Which ranking function you use decides what happens in engineering, where the third and fourth salaries tie**: ROW_NUMBER returns exactly three, RANK and DENSE_RANK return four, and only the question can tell you which is right." },

    { t: "code", lang: "sql", title: "Top three per department, and what the tie does to it",
      hl: [3, 4, 5, 15],
      code: `SELECT department, name, salary, rn, rnk, dr
FROM   (SELECT *,
               ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, employee_id) AS rn,   -- tie-breaker: employee_id
               RANK()       OVER (PARTITION BY department ORDER BY salary DESC)              AS rnk,
               DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)              AS dr
        FROM   employees) t
WHERE  department = 'engineering' ORDER BY salary DESC, employee_id;
-- department  | name    | salary | rn | rnk | dr
-- engineering | Oscar   | 150000 | 1  | 1   | 1
-- engineering | Tomas   | 131000 | 2  | 2   | 2
-- engineering | Quentin | 125000 | 3  | 3   | 3
-- engineering | Rosa    | 125000 | 4  | 3   | 3        <- rn <= 3 excludes Rosa; rnk <= 3 and dr <= 3 include her
-- engineering | Sami    | 98000  | 5  | 5   | 4

-- how many rows "top 3" returns per department under each policy
--   engineering: ROW_NUMBER 3 · RANK 4 · DENSE_RANK 4        sales: 3 · 3 · 3        exec: 1 · 1 · 1

-- the compact spelling where QUALIFY exists (DuckDB, Snowflake, BigQuery)
SELECT department, name, salary FROM employees
QUALIFY ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, employee_id) <= 3
ORDER  BY department, salary DESC;`,
      caption: "'Top 3' means three things: three rows (ROW_NUMBER), everyone not beaten by three others (RANK), or the three highest distinct salaries (DENSE_RANK). A report that shows exactly three names needs ROW_NUMBER and a tie-breaker; a fairness rule that says Rosa cannot be excluded for a coin flip needs RANK."
    },

    { t: "callout", kind: "trap", title: "ROW_NUMBER without a tie-breaker is a different answer each run", body: [
      { t: "p", text: "`ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)` gives Quentin 3 and Rosa 4 today and may give the opposite tomorrow, because nothing in the ORDER BY distinguishes them and the engine takes whichever it meets first. **Add the primary key as the last ORDER BY column** — `ORDER BY salary DESC, employee_id` — and the numbering is fixed. Or use RANK, and accept four rows." }
    ]},

    { t: "h2", n: "03", text: "The nth highest", id: "nth" },

    { t: "p", text: "'Second-highest salary in each department' is DENSE_RANK = 2 — the second *distinct* value, so a tie at the top still leaves a second value below it. RANK = 2 would return nothing for a department whose top two tie (they both rank 1, the next is 3); ROW_NUMBER = 2 would return one of the two tied top earners, which is not the second-highest anything. **For 'the nth largest value', DENSE_RANK; for 'the nth row', ROW_NUMBER; for a competition placing, RANK.**" },

    { t: "code", lang: "sql", title: "Second-highest per department, the old way and the window way",
      hl: [1, 2, 8],
      code: `SELECT department, salary AS second_highest
FROM   (SELECT department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dr FROM employees) t
WHERE  dr = 2
GROUP  BY department, salary                            -- collapse the tied rows that share the value
ORDER  BY department;
-- engineering | 131000
-- sales       | 91000                                  (exec has one salary: no second-highest, correctly absent)

-- without a window, for one group: the max of everything below the max
SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);       -- 150000
-- correct for "second distinct value" and does not generalise to per-department or to nth without nesting n deep`,
      caption: "The correlated-MAX form is the classic interview answer; DENSE_RANK is the one that scales to any n and any partition. Both agree that a tie at the top does not create a second-highest value — which is the definition, and the reason DENSE_RANK is the right function here."
    },

    { t: "h2", n: "04", text: "Latest row per group, and ranking over aggregates", id: "latest" },

    { t: "p", text: "'The most recent order per customer' is top-1 per customer ordered by time descending — ROW_NUMBER with a tie-breaker, filtered to 1. It is the portable form of the `DISTINCT ON` in 2.4 and returns whole rows, so the status comes with the timestamp. **A ranking can also run over a GROUP BY result**: rank products by units sold, where the units are a SUM computed first and the RANK runs over the grouped rows." },

    { t: "code", lang: "sql", title: "Latest order per customer; products ranked by units sold",
      hl: [3, 10],
      code: `SELECT c.name, o.order_id, o.placed_at, o.status
FROM   (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC, order_id DESC) AS rn FROM orders) o
JOIN   customers c ON c.customer_id = o.customer_id
WHERE  rn = 1 ORDER BY c.name;
-- Asha 108 paid · Bruno 105 paid · Chen 110 paid · Dalia 106 paid · Emeka 111 paid · Fatou 109 paid · Iker 107 cancelled   (7 rows)
-- same rows as DISTINCT ON (2.4); this form works on every engine

SELECT p.name, SUM(oi.qty) AS units, RANK() OVER (ORDER BY SUM(oi.qty) DESC) AS rnk
FROM   products p JOIN order_items oi ON oi.product_id = p.product_id JOIN orders o ON o.order_id = oi.order_id
WHERE  o.status = 'paid'
GROUP  BY p.name ORDER BY rnk, p.name;
-- Notebook 20 (1) · Desk lamp 5 (2) · Gift card 3 (3) · Headphones 3 (3) · Kettle 3 (3) · Toaster 1 (6)
-- RANK over a grouped SUM: three products tie for third, and nobody is fourth or fifth`,
      caption: "The window ranks the grouped result: the SUM is computed by GROUP BY first, then RANK orders those six sums. The three-way tie for third is reported as three rows at rank 3 and a jump to 6 — the competition semantics, which is usually what a leaderboard means."
    },

    { t: "table",
      head: ["Question", "Function", "Filter", "Ties"],
      rows: [
        ["Exactly n rows per group", "`ROW_NUMBER()` with a tie-breaker", "`<= n`", "Broken by the tie-breaker; deterministic"],
        ["Top n including anyone tied with the nth", "`RANK()`", "`<= n`", "More than n rows possible; ranks skip"],
        ["The n highest distinct values", "`DENSE_RANK()`", "`<= n`", "More than n rows possible; ranks do not skip"],
        ["The nth highest value", "`DENSE_RANK()`", "`= n`", "Returns every row at that value"],
        ["Latest / earliest row per group", "`ROW_NUMBER()` ordered by time, tie-breaker on key", "`= 1`", "One row, chosen deterministically"],
        ["Quartile / decile bucket", "`NTILE(n)`", "—", "Bucket sizes differ by at most one; ties may straddle buckets"],
        ["De-duplicate by business key (2.6)", "`ROW_NUMBER()` ordered by survivor rule", "`= 1`", "The rule decides the survivor"]
      ]
    },

    { t: "ladder",
      title: "The three highest-paid people in each department",
      rungs: [
        { level: "bad", label: "Correlated subquery per row", code: `SELECT * FROM employees e
WHERE  (SELECT COUNT(*) FROM employees x WHERE x.department = e.department AND x.salary > e.salary) < 3;`,
          note: "**Correct with RANK semantics, and quadratic**: one count per employee over the department. It also cannot be told to return exactly three, and it hides the tie policy inside a `<` that a reviewer will misread." },
        { level: "ok", label: "Ranking without a tie-breaker", code: `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) t WHERE rn <= 3;`,
          note: "**One sort, three rows per department — and Quentin or Rosa, depending on the run.** The result changes without the data changing, which is a test that fails intermittently." },
        { level: "best", label: "Named policy, deterministic order", code: `SELECT department, name, salary
FROM   (SELECT *, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) t
WHERE  rnk <= 3 ORDER BY department, rnk, employee_id;
-- or ROW_NUMBER() OVER (... ORDER BY salary DESC, employee_id) <= 3 when exactly three is the requirement`,
          note: "**The tie policy is the choice of function, written down; the order is fixed by the key.** RANK returns four engineers and says why; ROW_NUMBER with the tie-breaker returns three and always the same three." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Leaderboards with a stated tie policy",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Write four queries. **(1)** Each customer's second paid order by time, with its amount — customers with fewer than two paid orders omitted. **(2)** The top two products by paid revenue in each category, returning *everyone* tied with second place. **(3)** Each employee's salary quartile within the company and their rank within their department, both in one query, with the department rank deterministic. **(4)** The customers whose most recent order was not paid." },
        { t: "p", text: "For each, name the ranking function and say in one line why that tie policy is the right one." }
      ],
      requirements: [
        "Ranking in a subquery or QUALIFY; no correlated counts.",
        "A tie-breaker on every ROW_NUMBER.",
        "RANK where 'everyone tied' is required.",
        "Verified output for all four."
      ],
      hint: "For (1), the per-order amount comes from the 3.1 CTE; ROW_NUMBER over customer ordered by placed_at, filtered to 2. For (2), revenue per product per category is a GROUP BY, then RANK over the grouped rows partitioned by category. For (4), the latest-row pattern, then a status test outside.",
      solution: {
        lang: "sql",
        title: "leaderboards.sql",
        code: `-- (1) second paid order per customer: ROW_NUMBER -- "the second one in time" is a sequence position, not a value
WITH ot AS (SELECT o.order_id, o.customer_id, o.placed_at, SUM(oi.qty * oi.unit_price) AS amount
            FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY 1, 2, 3)
SELECT c.name, t.order_id, t.amount
FROM   (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at, order_id) AS rn FROM ot) t
JOIN   customers c ON c.customer_id = t.customer_id
WHERE  rn = 2 ORDER BY c.name;
-- Asha 102 76.00 · Bruno 105 27.50 · Emeka 111 52.50

-- (2) top two products per category by paid revenue, ties included: RANK -- a tie for second must not be cut
SELECT category, name, revenue, rnk
FROM   (SELECT p.category, p.name, SUM(oi.qty * oi.unit_price) AS revenue,
               RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.qty * oi.unit_price) DESC) AS rnk
        FROM   products p JOIN order_items oi ON oi.product_id = p.product_id JOIN orders o ON o.order_id = oi.order_id
        WHERE  o.status = 'paid' GROUP BY p.category, p.name) t
WHERE  rnk <= 2 ORDER BY category NULLS LAST, rnk, name;
-- audio Headphones 263.00 (1) · kitchen Kettle 94.00 (1) · kitchen Toaster 45.00 (2)
-- office Desk lamp 137.50 (1) · office Notebook 83.40 (2) · NULL Gift card 75.00 (1)

-- (3) company quartile and department rank: NTILE for the bucket, ROW_NUMBER with a tie-breaker for a fixed rank
SELECT name, department, salary,
       NTILE(4) OVER (ORDER BY salary DESC) AS company_quartile,
       ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, employee_id) AS dept_rank
FROM   employees ORDER BY department, dept_rank;
-- engineering: Oscar 1 (q1), Tomas 2 (q1), Quentin 3 (q2), Rosa 4 (q2), Sami 5 (q3) · exec: Nadia 1 (q1) · sales: Priya 1 (q2), Viktor 2 (q3), Uma 3 (q4), Wen 4 (q4)

-- (4) customers whose latest order is not paid: ROW_NUMBER = 1 by time, then test the chosen row
SELECT c.name, t.order_id, t.status
FROM   (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC, order_id DESC) AS rn FROM orders) t
JOIN   customers c ON c.customer_id = t.customer_id
WHERE  rn = 1 AND status <> 'paid';
-- Iker | 107 | cancelled        (Chen's refund was his FIRST order; his latest, 110, is paid)`,
        notes: [
          { t: "p", text: "**(1) and (4) are positions in a sequence, so ROW_NUMBER**, with `order_id` as the tie-breaker in case two orders share a timestamp. (4) tests the status *after* choosing the row: a `WHERE status <> 'paid'` inside the subquery would have found each customer's latest non-paid order — Chen's refunded 103 — which is a different question." },
          { t: "p", text: "**(2) is a leaderboard, so RANK**: if two products had tied for second, both would appear, and the report would say so with the repeated rank rather than silently dropping one. No tie occurred here, which is exactly when a ROW_NUMBER version would have looked identical and been wrong in principle." },
          { t: "p", text: "**(3) mixes an unpartitioned NTILE with a partitioned ROW_NUMBER** in one SELECT — two independent windows over the same rows. NTILE(4) over ten rows puts three in each of the first two quartiles and two in the last two." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Salaries in a department are 150, 131, 125, 125, 98. What does 'top 3 by salary' return under ROW_NUMBER, RANK and DENSE_RANK?",
          options: [
            "3, 3 and 3 rows",
            "3 rows, 4 rows and 4 rows — ROW_NUMBER cuts one of the tied 125s arbitrarily; RANK and DENSE_RANK both rank them 3 and keep both",
            "3, 4 and 5 rows",
            "4, 4 and 4 rows"
          ],
          answer: 1,
          why: "The tie sits exactly at the cut. ROW_NUMBER numbers the tied rows 3 and 4 and keeps only one; both rank functions give them 3 and keep both. The functions differ from each other only in what comes after: RANK 5, DENSE_RANK 4."
        }
      ]
    }
  ],

  takeaways: [
    "**ROW_NUMBER: unique sequence, ties broken arbitrarily. RANK: ties share, next rank skips. DENSE_RANK: ties share, no gaps.**",
    "**The choice of function is a tie policy** — exactly n rows, everyone tied with the nth, or the n highest distinct values.",
    "**ROW_NUMBER needs a tie-breaker** — the primary key as the last ORDER BY column — or its output changes between runs.",
    "**Top-N per group is a partitioned ranking in a subquery, filtered outside** — or QUALIFY where it exists.",
    "**'The nth highest value' is DENSE_RANK = n**; RANK = n can return nothing after a tie above, and ROW_NUMBER = n returns a row, not a value.",
    "**Latest row per group is ROW_NUMBER ordered by time descending, = 1** — the portable DISTINCT ON, and it returns whole rows.",
    "**Test the chosen row outside the ranking subquery**; a filter inside changes which row is chosen.",
    "**NTILE(n) buckets rows as evenly as possible**, earlier buckets taking the remainder; ties can straddle a boundary.",
    "**A ranking can run over a GROUP BY result** — rank the grouped sums.",
    "**The correlated-COUNT top-N is quadratic and hides its tie policy**; the window form is one sort and says which policy it uses."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is DENSE_RANK the right function for 'the second-highest salary'?",
        options: [
          "It is the fastest",
          "It numbers distinct values without gaps, so `= 2` is the second distinct salary even when the top salary is tied; RANK would skip 2 after a tie at 1, and ROW_NUMBER = 2 would return one of the tied top rows",
          "It ignores NULLs",
          "It is the only one that supports PARTITION BY"
        ],
        answer: 1,
        why: "'Second-highest' is about values, not rows. DENSE_RANK counts distinct values ahead of a row; the other two count rows, which is a different question."
      },
      {
        stem: "A top-3 query using `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` returns different names on two runs. Why?",
        options: [
          "The data changed",
          "Two employees tie on salary and nothing in the ORDER BY distinguishes them, so ROW_NUMBER assigns 3 and 4 in whatever order the engine encountered them; add a tie-breaker such as employee_id",
          "ROW_NUMBER is random by design",
          "PARTITION BY is unstable"
        ],
        answer: 1,
        why: "ROW_NUMBER always produces distinct numbers, so tied rows must be ordered somehow; without a deterministic key that order is implementation-dependent and can change with the plan."
      },
      {
        stem: "`NTILE(4)` over 10 rows produces buckets of what sizes?",
        options: [
          "2, 2, 3, 3",
          "3, 3, 2, 2 — the remainder goes to the earliest buckets",
          "2.5 each",
          "It fails; 10 is not divisible by 4"
        ],
        answer: 1,
        why: "NTILE divides as evenly as possible and gives the extra rows to the lower-numbered buckets. Two rows with equal values can land in different buckets."
      },
      {
        stem: "What does `RANK() OVER (ORDER BY SUM(qty) DESC)` in a GROUP BY query rank?",
        options: [
          "Individual line items",
          "The grouped rows — one per product — by their summed quantity, because windows run after GROUP BY",
          "It is an error to nest an aggregate in a window",
          "The products alphabetically"
        ],
        answer: 1,
        why: "Grouping happens first and produces one SUM per product; the window then ranks those sums. A three-way tie for third gives three rows at 3 and the next at 6."
      },
      {
        stem: "Which query finds customers whose latest order was cancelled?",
        options: [
          "`… WHERE status = 'cancelled'` inside the ranking subquery, then rn = 1",
          "Rank all orders per customer by time descending, keep rn = 1, then test `status = 'cancelled'` in the outer query",
          "`MAX(status) = 'cancelled'` grouped by customer",
          "`DISTINCT customer_id WHERE status = 'cancelled'`"
        ],
        answer: 1,
        why: "The status must be tested on the row chosen as latest. Filtering before ranking finds each customer's latest cancelled order — a different set. MAX(status) is alphabetical."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain the difference between ROW_NUMBER, RANK and DENSE_RANK.",
        strong: "All three number rows in the window's ORDER BY; they differ at ties. ROW_NUMBER gives every row a distinct number and orders tied rows arbitrarily, so it needs a tie-breaker column to be deterministic. RANK gives tied rows the same number and skips the numbers they used — 1, 2, 3, 4, 4, 6 — the competition convention. DENSE_RANK gives tied rows the same number with no gap — 1, 2, 3, 4, 4, 5 — which counts distinct values. So 'exactly n rows' is ROW_NUMBER, 'top n including ties' is RANK, and 'the nth highest value' is DENSE_RANK. Choosing the function is choosing the tie policy, and I say which one the report uses.",
        answer: [
          { t: "p", text: "Mapping each function to a question — rows, competition placing, distinct values — is what turns the definition into judgement." }
        ]
      },
      {
        level: "core",
        q: "Write a query for the second-highest salary in each department.",
        strong: "Rank salaries within each department with DENSE_RANK ordered descending, in a subquery, and keep rank 2 — grouping by department and salary in the outer query so a tie at second place returns one row per department. DENSE_RANK because 'second-highest' means the second distinct value: if two people share the top salary, RANK would give them both 1 and skip to 3, returning nothing, and ROW_NUMBER = 2 would return one of the tied top earners. Departments with a single distinct salary drop out, which is correct. The classic non-window answer, MAX of salaries below the MAX, only works for a single group and one level.",
        answer: [
          { t: "p", text: "Explaining why RANK fails on a top tie is the check that the candidate is choosing rather than reciting." }
        ]
      },
      {
        level: "advanced",
        q: "How do you get the most recent row per entity, and what do you check?",
        strong: "ROW_NUMBER over PARTITION BY the entity ORDER BY the timestamp descending with the primary key as a tie-breaker, in a subquery or CTE, filtered to rn = 1 — it returns the whole row, so every column is from the same record, unlike MAX(timestamp) grouped with other aggregates. PostgreSQL's DISTINCT ON is the same thing with less typing. Two checks: any condition on the chosen row goes in the outer query, because a WHERE inside the subquery changes which row wins; and the tie-breaker is there, because two rows with the same timestamp otherwise make the result non-deterministic. On a large table I make sure an index on (entity, timestamp DESC) exists so the partition sort is cheap.",
        answer: [
          { t: "p", text: "The 'filter outside' rule and the index on the partition key are the two production details." }
        ]
      }
    ]
  }
});

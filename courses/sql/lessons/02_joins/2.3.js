/* ============================================================================
   LESSON 2.3 — Self, Semi and Anti Joins
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**'Which customers have ordered' is not a join — it is a question with a yes-or-no answer per customer.** Writing it as a JOIN returns one row per order and needs a DISTINCT to undo the multiplication; writing it as EXISTS returns each customer once and stops looking after the first match. The same is true of its negation, where the choice of spelling decides whether a NULL empties the result. And when the other table is the same table — employees and their managers — the join is a self join, which is only a join between two aliases that happen to point at one relation.",

  objectives: [
    "Write a self join for hierarchies and for pairs, and control the pair duplication with an inequality",
    "Write a semi join three ways — EXISTS, IN, JOIN + DISTINCT — and say which the planner turns into what",
    "Write an anti join four ways and know which one returns nothing when a NULL appears",
    "Choose EXISTS as the default for 'has a match' and NOT EXISTS for 'has none', and say why"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Self joins: a table against itself", id: "self" },

    { t: "p", text: "A self join is an ordinary join in which both sides are the same table under different aliases. The engine sees two relations; only you know they are one. The two uses are **hierarchies** — a row that refers to another row of the same table, like `manager_id` — and **pairs** — rows that share a value, where the join condition compares each row with the others and an inequality on the key stops each pair appearing twice and each row pairing with itself." },

    { t: "code", lang: "sql", title: "Managers, the employee who out-earns theirs, and customers in the same country",
      hl: [2, 8, 14],
      code: `-- hierarchy: each employee with their manager; LEFT keeps the root, whose manager_id is NULL
SELECT e.name AS employee, m.name AS manager
FROM   employees e LEFT JOIN employees m ON m.employee_id = e.manager_id
ORDER  BY e.employee_id;
-- Nadia NULL · Oscar Nadia · Priya Nadia · Quentin Oscar · Rosa Oscar · Sami Quentin · Tomas Quentin · Uma Priya · Viktor Priya · Wen Uma

-- the classic: employees paid more than their manager
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM   employees e JOIN employees m ON m.employee_id = e.manager_id
WHERE  e.salary > m.salary;
-- Tomas | 131000 | Quentin | 125000                 (1 row)

-- pairs: customers in the same country, each pair once, no row paired with itself
SELECT a.name AS a, b.name AS b, a.country
FROM   customers a JOIN customers b ON a.country = b.country AND a.customer_id < b.customer_id
ORDER  BY a.country;
-- Bruno | Mara | DE
-- Asha  | Chen | GB                                  (2 rows)
-- with <> instead of <: 4 rows, every pair twice. With no key condition: also every row with itself.
-- Dalia's NULL country pairs with nothing (1.2), which is correct: an unknown country is not "the same".`,
      caption: "`a.customer_id < b.customer_id` does three jobs: it removes the row-with-itself pairs, keeps each unordered pair once, and gives the pair a stable orientation. `<>` does only the first."
    },

    { t: "h2", n: "02", text: "Semi joins: does a match exist?", id: "semi" },

    { t: "p", text: "A semi join keeps the rows of the left table that have at least one match on the right, **once each, and without the right table's columns**. It is not a join in the row-multiplication sense: a customer with three orders appears once, not three times. SQL has no SEMI JOIN keyword in most dialects; it has three spellings that mean the same thing and one that is a different thing wearing the same clothes." },

    { t: "code", lang: "sql", title: "Customers who have ordered, four ways — three of them right",
      hl: [2, 5, 8, 11],
      code: `-- 1. EXISTS: "is there at least one order for this customer" -- stops at the first one
SELECT c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

-- 2. IN: "is this customer's id in the set of ordering ids"
SELECT c.name FROM customers c WHERE c.customer_id IN (SELECT customer_id FROM orders);

-- 3. JOIN + DISTINCT: multiply, then collapse
SELECT DISTINCT c.name FROM customers c JOIN orders o ON o.customer_id = c.customer_id;

-- all three: Asha, Bruno, Chen, Dalia, Emeka, Fatou, Iker             (7 rows)

-- 4. JOIN without DISTINCT: not a semi join
SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.customer_id;
-- Asha, Asha, Asha, Bruno, Bruno, Chen, Chen, Dalia, Emeka, Emeka, Fatou, Iker     (12 rows: one per order)`,
      caption: "PostgreSQL turns forms 1 and 2 into the same Semi Join node in the plan (5.2). Form 3 does the full join and then de-duplicates — correct, and pointless work. Form 4 is the one that appears in reports as 'customers' with a count that is actually orders."
    },

    { t: "callout", kind: "mental", title: "EXISTS is a question about the other table; a JOIN is a request for its rows", body: [
      { t: "p", text: "If the SELECT list uses no column from the second table, you do not need its rows — you need a yes or a no per row of the first. That is EXISTS. **A JOIN that is immediately followed by DISTINCT to undo its own multiplication is a semi join written as a join**, and the planner will usually recognise it, but the reader will not." }
    ]},

    { t: "h2", n: "03", text: "Anti joins: does no match exist?", id: "anti" },

    { t: "p", text: "The negation — customers with no paid order — has four spellings too, and this time they are not all equal. **`NOT EXISTS` and the `LEFT JOIN … IS NULL` idiom are correct regardless of NULLs. `NOT IN` returns nothing the day the subquery produces a NULL** (1.2), and `EXCEPT` works on whole rows, which is elegant when the key is the only column and awkward otherwise." },

    { t: "code", lang: "sql", title: "Customers with no paid order, four ways",
      hl: [2, 6, 9, 13],
      code: `-- 1. NOT EXISTS: immune to NULL on both sides. The default.
SELECT c.name FROM customers c
WHERE  NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'paid');

-- 2. LEFT JOIN, then keep the padded rows. Correct; reads as a trick; the join's columns are all NULL and useless.
SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
WHERE  o.order_id IS NULL;

-- 3. NOT IN: correct today, because orders.customer_id is NOT NULL. One nullable column away from zero rows.
SELECT c.name FROM customers c WHERE c.customer_id NOT IN (SELECT customer_id FROM orders WHERE status = 'paid');

-- 4. EXCEPT: set difference on the key, then look the names up
SELECT name FROM customers
WHERE  customer_id IN (SELECT customer_id FROM customers EXCEPT SELECT customer_id FROM orders WHERE status = 'paid');

-- all four, today: Iker, Mara                                                        (2 rows)

-- the same shape on a nullable key: products with no paid sale. NOT IN would work here too; NOT EXISTS
-- would keep working if product_id ever became nullable. There are none: every product has a paid sale.
SELECT p.name FROM products p
WHERE  NOT EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
                   WHERE  oi.product_id = p.product_id AND o.status = 'paid');       -- (0 rows)`,
      caption: "Forms 1 and 2 compile to the same Anti Join node. Form 3 is the one that breaks silently: a single NULL in the subquery's column and every customer 'has a paid order'. Form 4 is fine for keys and cannot carry other columns through."
    },

    { t: "viz",
      title: "Semi and anti: a yes or a no per left row",
      caption: "Neither operation multiplies. Each customer is checked once against the orders and kept or dropped. The right table contributes a decision, not rows — which is why the SELECT list can only name the left table.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Eight customer rows on the left; arrows to a decision box asking whether a paid order exists; semi join keeps the seven with yes, anti join keeps Iker and Mara with no.">
  <defs>
    <marker id="sa-ah-23" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <text x="30" y="40" class="s-label" style="font-weight:600">customers</text>
  <g class="s-mono">
    <text x="30" y="66">Asha</text><text x="30" y="84">Bruno</text><text x="30" y="102">Chen</text><text x="30" y="120">Dalia</text>
    <text x="30" y="138">Emeka</text><text x="30" y="156">Fatou</text><text x="30" y="174" style="fill:var(--crit)">Iker</text><text x="30" y="192" style="fill:var(--crit)">Mara</text>
  </g>
  <line x1="120" y1="130" x2="230" y2="130" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#sa-ah-23)"/>
  <rect x="240" y="90" width="260" height="80" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)" stroke-width="1.4"/>
  <text x="370" y="120" class="s-label" text-anchor="middle">EXISTS (paid order for this customer)?</text>
  <text x="370" y="146" class="s-sub" text-anchor="middle">stop at the first match · no columns come back</text>
  <line x1="500" y1="110" x2="600" y2="70" style="stroke:var(--good)" stroke-width="1.4" marker-end="url(#sa-ah-23)"/>
  <line x1="500" y1="150" x2="600" y2="190" style="stroke:var(--crit)" stroke-width="1.4" marker-end="url(#sa-ah-23)"/>
  <g stroke-width="1.4">
    <rect x="610" y="40" width="240" height="60" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="610" y="170" width="240" height="60" rx="8" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
  </g>
  <text x="626" y="64" class="s-label" style="fill:var(--good);font-weight:600">yes → semi join · 6 rows</text>
  <text x="626" y="86" class="s-sub">Asha Bruno Chen Dalia Emeka Fatou</text>
  <text x="626" y="194" class="s-label" style="fill:var(--crit);font-weight:600">no → anti join · 2 rows</text>
  <text x="626" y="216" class="s-sub">Iker (cancelled only) · Mara (none)</text>
</svg>`
    },

    { t: "table",
      head: ["Question", "Spelling", "NULL-safe", "Notes"],
      rows: [
        ["Has a match", "`WHERE EXISTS (SELECT 1 …)`", "Yes", "The default. Stops at the first match; planner: Semi Join"],
        ["Has a match", "`WHERE key IN (SELECT key …)`", "Yes (can only fail to match)", "Same plan as EXISTS on modern engines; less flexible for multi-column conditions"],
        ["Has a match", "`JOIN … SELECT DISTINCT`", "Yes", "Multiplies then collapses; wrong the moment DISTINCT is forgotten"],
        ["Has no match", "`WHERE NOT EXISTS (…)`", "**Yes**", "The default. Planner: Anti Join"],
        ["Has no match", "`LEFT JOIN … WHERE right.key IS NULL`", "Yes", "Correct and idiomatic in older code; the joined columns are all NULL"],
        ["Has no match", "`WHERE key NOT IN (SELECT key …)`", "**No**", "One NULL in the subquery returns zero rows; a NULL on the left drops that row"],
        ["Has no match", "`EXCEPT`", "Yes (NULL = NULL for sets)", "Whole-row set difference; fine on keys, awkward with extra columns"]
      ]
    },

    { t: "h2", n: "04", text: "Correlated, and why that is fine", id: "correlated" },

    { t: "p", text: "The subquery in `EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)` refers to `c`, the outer row. It is *correlated*: conceptually it runs once per customer. That sounds expensive and is not — **the planner rewrites a correlated EXISTS into a semi join and executes it with a hash or an index, once**, not once per row. What stays expensive is a correlated subquery in the SELECT list that returns a value rather than a yes/no (4.1), and one whose condition the planner cannot turn into a join key." },

    { t: "code", lang: "sql", title: "The hierarchy, asked as semi and anti joins",
      code: `-- who manages someone?
SELECT e.name FROM employees e WHERE EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.employee_id) ORDER BY 1;
-- Nadia, Oscar, Priya, Quentin, Uma                     (5 rows)

-- who manages no one?
SELECT e.name FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.employee_id) ORDER BY 1;
-- Rosa, Sami, Tomas, Viktor, Wen                        (5 rows)

-- the same table on both sides is a self join in EXISTS form: aliases e and r, one relation.
-- SELECT 1 inside EXISTS is conventional: the value is never read, only whether a row came back.`,
      caption: "Whether a person manages anyone is a yes/no per employee — a semi join against the same table. `SELECT 1` inside EXISTS is a convention that says so out loud; `SELECT *` there is equally fast and slightly misleading."
    },

    { t: "ladder",
      title: "Customers who have never placed a paid order",
      rungs: [
        { level: "bad", label: "NOT IN on a subquery", code: `SELECT name FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE status = 'paid');`,
          note: "**Correct today; empty the day `customer_id` is NULL on one row.** No error, no warning, a report of zero churn-risk customers." },
        { level: "ok", label: "LEFT JOIN and IS NULL", code: `SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
WHERE  o.order_id IS NULL;`,
          note: "**Correct and NULL-safe.** The reader has to know the idiom, and the filter in ON versus WHERE is one refactor away from breaking (2.2)." },
        { level: "best", label: "NOT EXISTS", code: `SELECT c.name FROM customers c
WHERE  NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'paid');`,
          note: "**Correct, NULL-safe, and reads as the question.** The planner produces the same anti-join plan as the LEFT JOIN form; the condition lives inside the subquery where it cannot be misplaced." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Six questions that are not joins",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Answer each with a single query, using EXISTS or NOT EXISTS where the question is a yes/no per row and a self join where rows relate to rows of the same table. No DISTINCT anywhere." },
        { t: "code", lang: "sql", code: `-- S1  products that have been sold in at least two different paid orders
-- S2  customers who have viewed but never checked out (events only)
-- S3  employees whose manager is in a different department
-- S4  pairs of employees with the same salary (each pair once)
-- S5  customers who have events on a day with no order of theirs
-- S6  the managers who manage only people hired after them` }
      ],
      requirements: [
        "No DISTINCT; every semi/anti join written with EXISTS / NOT EXISTS.",
        "Self joins with an inequality that yields each pair once.",
        "Verified results for all six."
      ],
      hint: "S1 needs a count, so it is a GROUP BY … HAVING inside the EXISTS, or a subquery in IN — decide which reads better. S5 is an anti join nested inside a semi join. S6 is 'no report hired before them': NOT EXISTS with a date comparison, restricted to people who have reports at all.",
      solution: {
        lang: "sql",
        title: "semi_anti.sql",
        code: `-- S1: products in >= 2 distinct paid orders
SELECT p.name FROM products p
WHERE  (SELECT COUNT(DISTINCT o.order_id) FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
        WHERE  oi.product_id = p.product_id AND o.status = 'paid') >= 2
ORDER  BY 1;
-- Desk lamp, Gift card, Headphones, Kettle, Notebook            (5 rows -- the Toaster's only paid sale is order 104)

-- S2: viewed, never checked out
SELECT c.name FROM customers c
WHERE  EXISTS     (SELECT 1 FROM events e WHERE e.customer_id = c.customer_id AND e.event_type = 'view')
  AND  NOT EXISTS (SELECT 1 FROM events e WHERE e.customer_id = c.customer_id AND e.event_type = 'checkout')
ORDER  BY 1;
-- Bruno, Fatou, Mara

-- S3: manager in a different department
SELECT e.name, e.department, m.name AS manager, m.department AS manager_dept
FROM   employees e JOIN employees m ON m.employee_id = e.manager_id
WHERE  e.department <> m.department;
-- Oscar engineering Nadia exec · Priya sales Nadia exec

-- S4: salary ties, each pair once
SELECT a.name, b.name, a.salary FROM employees a JOIN employees b ON a.salary = b.salary AND a.employee_id < b.employee_id;
-- Quentin | Rosa | 125000

-- S5: an event on a day with none of the customer's orders
SELECT c.name FROM customers c
WHERE  EXISTS (SELECT 1 FROM events e WHERE e.customer_id = c.customer_id
               AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
                               AND o.placed_at >= DATE_TRUNC('day', e.occurred_at)
                               AND o.placed_at <  DATE_TRUNC('day', e.occurred_at) + INTERVAL '1 day'))
ORDER  BY 1;
-- Bruno, Fatou, Mara

-- S6: managers all of whose reports were hired after them
SELECT m.name FROM employees m
WHERE  EXISTS     (SELECT 1 FROM employees r WHERE r.manager_id = m.employee_id)
  AND  NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = m.employee_id AND r.hired_on <= m.hired_on)
ORDER  BY 1;
-- Nadia, Oscar, Priya, Quentin, Uma      (every manager, as it happens: the data has no report hired before their manager)`,
        notes: [
          { t: "p", text: "**S2 and S6 are a semi join AND an anti join on the same table** — 'has an X and has no Y'. Two EXISTS clauses, one negated, is the direct transcription; a join-based version would need two joins, a DISTINCT and a GROUP BY with HAVING." },
          { t: "p", text: "**S5 nests an anti join inside a semi join**: 'there is an event such that there is no same-day order'. The inner NOT EXISTS is correlated to both the customer and the event, which reads naturally and which the planner still handles as joins." },
          { t: "p", text: "**S1 is the one that is a count, not a yes/no**, so EXISTS alone cannot express 'at least two'; a scalar subquery with COUNT(DISTINCT) compared to 2 is the honest form, and 4.1 covers where scalar subqueries are and are not cheap." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.customer_id` is meant to list customers who have ordered. What is wrong?",
          options: [
            "Nothing — it lists exactly those customers",
            "It returns one row per order, so Asha appears three times; the question is a yes/no per customer and should be EXISTS, or at least DISTINCT",
            "It needs a LEFT JOIN",
            "It should use IN"
          ],
          answer: 1,
          why: "A join multiplies. The SELECT list uses no column from orders, which is the sign that orders' rows are not wanted — only whether any exist. EXISTS answers that once per customer and stops at the first match."
        }
      ]
    }
  ],

  takeaways: [
    "**A self join is a join between two aliases of one table**; the engine sees two relations.",
    "**For pairs, join on the shared value with `a.id < b.id`** — it removes self-pairs, keeps each pair once, and orients it.",
    "**A semi join asks 'is there a match' once per left row and returns no right-hand columns**; EXISTS, IN and JOIN + DISTINCT all express it.",
    "**If the SELECT list uses nothing from the second table, you want EXISTS, not a JOIN.**",
    "**An anti join asks 'is there no match'**: NOT EXISTS and LEFT JOIN … IS NULL are NULL-safe; NOT IN is not; EXCEPT works on whole rows.",
    "**NOT IN returns zero rows the day the subquery yields a NULL** — the silent failure to grep for.",
    "**A correlated EXISTS is not run once per row**; the planner rewrites it into a semi or anti join executed with a hash or an index.",
    "**`SELECT 1` inside EXISTS is convention**: the value is never read, only whether a row came back.",
    "**'Has an X and has no Y' is one EXISTS and one NOT EXISTS**, not two joins and a DISTINCT.",
    "**'At least two matches' is a count, not a yes/no** — a scalar subquery or GROUP BY … HAVING, not EXISTS alone."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `a.customer_id < b.customer_id` used in a self join for pairs, rather than `<>`?",
        options: [
          "It is faster",
          "`<>` still returns each pair twice (A,B and B,A); `<` returns each unordered pair once and also excludes self-pairs",
          "`<>` does not work on integers",
          "There is no difference"
        ],
        answer: 1,
        why: "Both exclude a row pairing with itself. Only the strict inequality picks one orientation of each pair, halving the result to the set of unordered pairs."
      },
      {
        stem: "Which anti-join spelling returns zero rows if the subquery's column contains a NULL?",
        options: [
          "`NOT EXISTS (SELECT 1 …)`",
          "`LEFT JOIN … WHERE right.key IS NULL`",
          "`key NOT IN (SELECT key …)`",
          "`EXCEPT`"
        ],
        answer: 2,
        why: "NOT IN expands to a conjunction of `<>` comparisons; one NULL makes the conjunction unknown for every outer row. NOT EXISTS and the LEFT JOIN idiom never compare NULL with anything."
      },
      {
        stem: "How does PostgreSQL execute `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)`?",
        options: [
          "It runs the subquery once per customer row",
          "It rewrites the correlated subquery into a Semi Join and executes it with a hash or index lookup, once",
          "It materialises all orders into memory",
          "It converts it to a CROSS JOIN"
        ],
        answer: 1,
        why: "Correlation in EXISTS is a join condition in disguise. The planner recognises the shape and produces the same plan as an IN over the same key — a single pass with early termination per outer row."
      },
      {
        stem: "A query needs customers who have at least two distinct paid orders. Why is EXISTS alone insufficient?",
        options: [
          "EXISTS cannot be used with orders",
          "EXISTS answers whether at least one match exists; 'at least two' is a count, which needs COUNT in a scalar subquery or a GROUP BY … HAVING",
          "EXISTS only works with IN",
          "It needs DISTINCT"
        ],
        answer: 1,
        why: "EXISTS is a boolean over the existence of any row. Quantities beyond 'any' need an aggregate; the EXISTS form can still be used with a subquery that groups and filters with HAVING COUNT(DISTINCT …) >= 2."
      },
      {
        stem: "When is `LEFT JOIN … WHERE right.key IS NULL` preferable to `NOT EXISTS`?",
        options: [
          "Always — it is faster",
          "Rarely; both produce the same anti-join plan and NOT EXISTS reads as the question and keeps its condition inside the subquery — the LEFT JOIN form is mainly seen in older code and in engines whose planner handles it better",
          "When the right table has NULLs",
          "When you need the right table's columns"
        ],
        answer: 1,
        why: "The joined columns in the anti-join idiom are all NULL by construction, so they are never useful. The two forms are equivalent in correctness; NOT EXISTS is harder to break during a refactor because the filter cannot slide from ON into WHERE."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you find customers who have never placed an order, and what is wrong with the obvious NOT IN?",
        strong: "NOT EXISTS with a correlated subquery on the customer id: it reads as the question, the planner turns it into an anti join, and it is immune to NULLs on either side. The LEFT JOIN with IS NULL on the right key is equivalent and common in older code. NOT IN is the trap: it expands to a chain of not-equals joined by AND, so if the subquery ever returns a single NULL the whole predicate is unknown for every row and the result is empty — with no error. It works until the column becomes nullable, then fails silently.",
        answer: [
          { t: "p", text: "Explaining the NOT IN expansion — rather than just saying 'avoid it' — is what earns the credit." }
        ]
      },
      {
        level: "core",
        q: "What is a self join and when would you use one?",
        strong: "A join where both sides are the same table under different aliases — the engine treats them as two relations. Two uses: hierarchies, where a row references another row of the same table, like employee to manager, with a LEFT JOIN to keep the root whose manager is NULL; and pairs, where rows are compared with each other on a shared value, with an inequality on the key so each pair appears once and no row pairs with itself. In EXISTS form the same idea answers 'does anyone report to this person' without producing the rows.",
        answer: [
          { t: "p", text: "The `a.id < b.id` detail and the LEFT JOIN for the root are the two things that show the candidate has written one." }
        ]
      },
      {
        level: "advanced",
        q: "Is a correlated subquery always slow?",
        strong: "No. A correlated EXISTS or NOT EXISTS is a join condition in disguise, and every modern planner rewrites it into a semi or anti join executed with a hash or an index — once, not once per outer row. What is slow is a correlated subquery the planner cannot decorrelate: one in the SELECT list returning a value per row with a non-equality condition, or one with a LIMIT or an aggregate that ties it to the outer row in a way that has no join equivalent. Those run per row, and LATERAL or a window function is usually the rewrite. The way to know is EXPLAIN: a SubPlan node executed n times is the slow kind; a Semi Join or Hash Anti Join is not.",
        answer: [
          { t: "p", text: "Distinguishing decorrelatable from not, and naming the plan node that reveals which is which, is the expert answer." }
        ]
      }
    ]
  }
});

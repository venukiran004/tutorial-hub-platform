/* ============================================================================
   LESSON 4.3 — Recursive CTEs
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**A join walks one level of a hierarchy. Everyone who reports to Oscar, directly or through three managers, needs a query that keeps walking until there is no one left — which is what a recursive CTE does.** An anchor query produces the starting rows; a recursive member joins the previous iteration's rows to the table to find the next; the engine repeats until an iteration returns nothing. Org charts, category trees, bills of materials, paths through a graph, and a calendar built from nothing all fit this shape. So does an infinite loop, if the data has a cycle and the query has no guard.",

  objectives: [
    "Write a recursive CTE with an anchor and a recursive member, and trace how the engine evaluates it",
    "Walk a hierarchy down (subtree, depth, path) and up (chain of command), and aggregate over a subtree",
    "Generate a series of dates or numbers on engines without generate_series",
    "Guard against cycles with a depth limit, a path check, or UNION instead of UNION ALL"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Anchor, then repeat until empty", id: "anchor" },

    { t: "p", text: "`WITH RECURSIVE t AS (anchor UNION ALL recursive_member)` is evaluated in rounds. The anchor runs once and its rows form the working set. Then the recursive member runs with `t` bound to the working set — only the rows from the previous round, not everything so far — and its output becomes the next working set. **When a round produces no rows, evaluation stops, and the CTE's result is the union of every round.** A hierarchy walk therefore descends one level per round." },

    { t: "code", lang: "sql", title: "The org chart from the root, with depth and path",
      hl: [2, 4, 5],
      code: `WITH RECURSIVE tree AS (
  SELECT employee_id, name, manager_id, 0 AS depth, name AS path                         -- anchor: the root
  FROM   employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.employee_id, e.name, e.manager_id, t.depth + 1, t.path || ' > ' || e.name     -- recursive member: the next level
  FROM   employees e JOIN tree t ON e.manager_id = t.employee_id
)
SELECT depth, name, path FROM tree ORDER BY path;
-- depth | name    | path
-- 0     | Nadia   | Nadia
-- 1     | Oscar   | Nadia > Oscar
-- 2     | Quentin | Nadia > Oscar > Quentin
-- 3     | Sami    | Nadia > Oscar > Quentin > Sami
-- 3     | Tomas   | Nadia > Oscar > Quentin > Tomas
-- 2     | Rosa    | Nadia > Oscar > Rosa
-- 1     | Priya   | Nadia > Priya
-- 2     | Uma     | Nadia > Priya > Uma
-- 3     | Wen     | Nadia > Priya > Uma > Wen
-- 2     | Viktor  | Nadia > Priya > Viktor
-- round 0: Nadia · round 1: Oscar, Priya · round 2: Quentin, Rosa, Uma, Viktor · round 3: Sami, Tomas, Wen · round 4: nothing -> stop`,
      caption: "`depth` and `path` are carried along by the recursion: each round adds one to the depth and appends a name to the path. Sorting by path prints the tree in outline order — a trick that works because the path is a string with the ancestry built in."
    },

    { t: "dl", items: [
      ["Anchor member", "The non-recursive query that seeds the working set: the root of a tree, the start node of a path, the first date of a series. Runs once."],
      ["Recursive member", "The query that references the CTE itself. Runs once per round against the previous round's rows only, and must produce columns matching the anchor."],
      ["Working set", "The rows produced by the most recent round — what the CTE's name refers to inside the recursive member. Not the accumulated result."],
      ["Termination", "A round that returns zero rows. Guaranteed by a tree (leaves have no children); not guaranteed by a graph with a cycle."],
      ["`UNION` vs `UNION ALL`", "UNION ALL appends every round. UNION discards rows already produced in earlier rounds, which on many engines also stops a cycle from re-adding a visited row."],
      ["Depth guard", "A counter carried in the rows and a `WHERE depth < n` in the recursive member — the simplest way to bound an unbounded recursion."]
    ]},

    { t: "viz",
      title: "One round per level",
      caption: "The anchor yields Nadia. Round 1 joins her id to manager_id and finds Oscar and Priya. Round 2 finds their reports, round 3 the leaves' reports, and round 4 finds nobody — which is the stop condition. The result is every round appended.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Four columns of boxes: round 0 with Nadia; round 1 with Oscar and Priya; round 2 with Quentin, Rosa, Uma, Viktor; round 3 with Sami, Tomas, Wen; a fifth column labelled round 4 empty, stop. Arrows connect each round to the next.">
  <defs>
    <marker id="rc-ah-43" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="100" y="36">round 0 · anchor</text><text x="290" y="36">round 1</text><text x="480" y="36">round 2</text><text x="670" y="36">round 3</text><text x="820" y="36">round 4</text>
  </g>
  <g stroke-width="1.2">
    <rect x="50" y="110" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)"/>
    <rect x="240" y="80" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/><rect x="240" y="140" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="430" y="56" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/><rect x="430" y="92" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="430" y="128" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/><rect x="430" y="164" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="620" y="74" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/><rect x="620" y="110" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/><rect x="620" y="146" width="100" height="26" rx="5" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="780" y="110" width="80" height="26" rx="5" style="fill:none;stroke:var(--crit)" stroke-dasharray="4 3"/>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="100" y="128">Nadia</text>
    <text x="290" y="98">Oscar</text><text x="290" y="158">Priya</text>
    <text x="480" y="74">Quentin</text><text x="480" y="110">Rosa</text><text x="480" y="146">Uma</text><text x="480" y="182">Viktor</text>
    <text x="670" y="92">Sami</text><text x="670" y="128">Tomas</text><text x="670" y="164">Wen</text>
    <text x="820" y="128" style="fill:var(--crit)">∅ stop</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.1" fill="none">
    <path d="M150,123 L240,93" marker-end="url(#rc-ah-43)"/><path d="M150,123 L240,153" marker-end="url(#rc-ah-43)"/>
    <path d="M340,93 L430,69" marker-end="url(#rc-ah-43)"/><path d="M340,93 L430,105" marker-end="url(#rc-ah-43)"/>
    <path d="M340,153 L430,141" marker-end="url(#rc-ah-43)"/><path d="M340,153 L430,177" marker-end="url(#rc-ah-43)"/>
    <path d="M530,69 L620,87" marker-end="url(#rc-ah-43)"/><path d="M530,69 L620,123" marker-end="url(#rc-ah-43)"/><path d="M530,141 L620,159" marker-end="url(#rc-ah-43)"/>
    <path d="M720,123 L780,123" marker-end="url(#rc-ah-43)"/>
  </g>
  <text x="50" y="236" class="s-sub">Each round joins the previous round's employee_ids to manager_id. Rosa, Viktor and the round-3 rows have no reports, so round 4 is empty and the recursion ends. Result: all four rounds, 10 rows.</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Subtrees, chains of command, and aggregating over a subtree", id: "subtree" },

    { t: "p", text: "Start the anchor at any node and the recursion produces that node's subtree. Start at a leaf and join the other way — `e.employee_id = u.manager_id` — and it climbs to the root: the chain of command. **To aggregate over every subtree at once, anchor on every row and carry the root's id along**; each employee then appears once per ancestor, and grouping by the root gives each manager their total reports and subtree payroll, which is the bill-of-materials rollup in an org-chart costume." },

    { t: "code", lang: "sql", title: "Oscar's organisation, Wen's chain of command, and every manager's subtree total",
      hl: [2, 10, 16, 17],
      code: `WITH RECURSIVE sub AS (
  SELECT employee_id, name, salary FROM employees WHERE name = 'Oscar'                  -- anchor at any node
  UNION ALL
  SELECT e.employee_id, e.name, e.salary FROM employees e JOIN sub s ON e.manager_id = s.employee_id
)
SELECT COUNT(*) - 1 AS reports, SUM(salary) - 150000 AS reports_payroll, STRING_AGG(name, ', ' ORDER BY name) AS everyone FROM sub;
-- 4 | 479000 | Oscar, Quentin, Rosa, Sami, Tomas

WITH RECURSIVE up AS (
  SELECT employee_id, name, manager_id, 0 AS steps FROM employees WHERE name = 'Wen'    -- anchor at a leaf
  UNION ALL
  SELECT e.employee_id, e.name, e.manager_id, u.steps + 1 FROM employees e JOIN up u ON e.employee_id = u.manager_id   -- join upward
)
SELECT steps, name FROM up ORDER BY steps;
-- 0 Wen · 1 Uma · 2 Priya · 3 Nadia

WITH RECURSIVE sub AS (
  SELECT employee_id AS root, employee_id, salary FROM employees                        -- anchor on EVERY row, remembering the root
  UNION ALL
  SELECT s.root, e.employee_id, e.salary FROM employees e JOIN sub s ON e.manager_id = s.employee_id
)
SELECT m.name, COUNT(*) - 1 AS total_reports, SUM(s.salary) AS subtree_payroll
FROM   sub s JOIN employees m ON m.employee_id = s.root
GROUP  BY m.name HAVING COUNT(*) > 1 ORDER BY subtree_payroll DESC;
-- Nadia 9 1182000 · Oscar 4 629000 · Priya 3 363000 · Quentin 2 354000 · Uma 1 152000`,
      caption: "The all-roots form produces one row per (ancestor, descendant) pair — 10 self-pairs plus every ancestry link — and the GROUP BY collapses each root's subtree. It is the query behind 'total cost of this assembly including sub-assemblies' and 'revenue of this category including its children'."
    },

    { t: "h2", n: "03", text: "Generating rows from nothing", id: "series" },

    { t: "p", text: "A recursive CTE can produce rows that exist in no table: start with one date, add a day each round, stop at the end date. It is the date spine of 1.5 on engines without `generate_series` — MySQL, SQLite, SQL Server — and it generates integers, months or any arithmetic sequence the same way. **The termination condition lives in the recursive member's WHERE; forget it and the series never ends.**" },

    { t: "code", lang: "sql", title: "A week of dates from a single literal",
      hl: [2, 4],
      code: `WITH RECURSIVE days AS (
  SELECT DATE '2025-03-01' AS d
  UNION ALL
  SELECT d + INTERVAL '1 day' FROM days WHERE d < DATE '2025-03-07'          -- the guard: stop at the end date
)
SELECT d::DATE AS d, EXTRACT(dow FROM d) AS dow FROM days;
-- 2025-03-01 6 · 2025-03-02 0 · 2025-03-03 1 · ... · 2025-03-07 5      (7 rows)

-- PostgreSQL: generate_series(DATE '2025-03-01', DATE '2025-03-07', INTERVAL '1 day') -- the same, without recursion
-- MySQL 8, SQLite 3.8.3+, SQL Server: the recursive form is the only form (SQL Server caps at 100 rounds unless OPTION (MAXRECURSION n))
-- a numbers table: SELECT 1 AS n UNION ALL SELECT n + 1 FROM nums WHERE n < 1000`,
      caption: "One round per row makes the recursive series slower than generate_series for long ranges, and fine for a calendar. SQL Server's default recursion limit of 100 is the one that bites first: a daily spine over four months needs the option raised."
    },

    { t: "h2", n: "04", text: "Cycles, and three ways to survive them", id: "cycles" },

    { t: "p", text: "A tree terminates because leaves have no children. A graph with a cycle — A manages B manages A, a part that contains itself through two levels, a follows-graph — does not: the recursive member keeps finding the same rows and the query runs until it exhausts memory or a limit. **Three guards, in increasing strength: a depth counter with a WHERE; a path string checked with LIKE so a node is not revisited; and UNION instead of UNION ALL, which drops rows already seen and on most engines stops the recursion by itself.**" },

    { t: "code", lang: "sql", title: "A graph with a cycle: unguarded, depth-guarded, path-guarded, and UNION",
      hl: [1, 5, 12, 20],
      code: `WITH RECURSIVE edges(a, b) AS (VALUES (1, 2), (2, 3), (3, 1), (3, 4)),          -- 1 -> 2 -> 3 -> 1 is a cycle; 3 -> 4 hangs off it
walk AS (
  SELECT a, b, 1 AS depth FROM edges WHERE a = 1
  UNION ALL
  SELECT w.a, e.b, w.depth + 1 FROM walk w JOIN edges e ON e.a = w.b WHERE w.depth < 6   -- depth guard only
)
SELECT COUNT(*) AS rows_ FROM walk;
-- 8: the cycle was walked round and round until depth 6 stopped it. Without the guard: forever.

-- path guard: carry the visited nodes and refuse to revisit
WITH RECURSIVE edges(a, b) AS (VALUES (1, 2), (2, 3), (3, 1), (3, 4)),
walk AS (
  SELECT a, b, 1 AS depth, '/' || a || '/' || b || '/' AS path FROM edges WHERE a = 1
  UNION ALL
  SELECT w.a, e.b, w.depth + 1, w.path || e.b || '/'
  FROM   walk w JOIN edges e ON e.a = w.b
  WHERE  w.path NOT LIKE '%/' || e.b || '/%' AND w.depth < 10                  -- not already on this path
)
SELECT b AS reachable, depth, path FROM walk ORDER BY depth;
-- 2 1 /1/2/ · 3 2 /1/2/3/ · 4 3 /1/2/3/4/         (3 rows: the edge back to 1 is refused)

-- UNION: rows already in the result are not re-added, so the cycle produces nothing new and the recursion ends
WITH RECURSIVE edges(a, b) AS (VALUES (1, 2), (2, 3), (3, 1), (3, 4)),
walk AS (SELECT b FROM edges WHERE a = 1 UNION SELECT e.b FROM walk w JOIN edges e ON e.a = w.b)
SELECT b AS reachable FROM walk ORDER BY b;
-- 1, 2, 3, 4                                       (1 is reachable from itself round the cycle; no path or depth needed)
-- PostgreSQL 14+ also has CYCLE col SET is_cycle USING path -- the path guard, built in.`,
      caption: "UNION is the cheapest guard when you only need the set of reachable nodes. The path guard is the one for shortest paths and for 'show me the route'. The depth guard is a safety net to add to every recursive CTE regardless — a wrong join condition can create a cycle in data that has none."
    },

    { t: "table",
      head: ["Question", "Anchor", "Recursive join", "Carry along", "Guard"],
      rows: [
        ["Subtree of a node", "The node", "`child.parent_id = t.id`", "depth, path", "Depth (safety)"],
        ["Chain of command", "The leaf", "`parent.id = t.parent_id`", "steps", "Depth (safety)"],
        ["Every subtree's total", "Every row, with `root = id`", "`child.parent_id = t.id`", "root", "Depth (safety)"],
        ["Series of dates / numbers", "The first value", "`value + step` from t", "—", "`WHERE value < end` — required"],
        ["Reachable nodes in a graph", "Edges from the start", "`edge.from = t.to`", "—", "UNION, or a path check"],
        ["Paths in a graph", "Edges from the start", "`edge.from = t.to`", "path", "`path NOT LIKE '%/node/%'` + depth"],
        ["Bill of materials cost", "Every assembly, `root = id`", "`part.assembly_id = t.part_id`", "root, quantity multiplied", "Depth"]
      ]
    },

    { t: "ladder",
      title: "Everyone under a manager, any depth",
      rungs: [
        { level: "bad", label: "A join per level", code: `SELECT e3.name FROM employees e1 JOIN employees e2 ON e2.manager_id = e1.employee_id
                                 JOIN employees e3 ON e3.manager_id = e2.employee_id
WHERE e1.name = 'Oscar';   -- and e4, e5 ... for deeper trees`,
          note: "**Fixed depth.** Three joins find two levels down and miss the third; the query has to be rewritten when the organisation grows a layer." },
        { level: "ok", label: "Recursive, no guard", code: `WITH RECURSIVE sub AS (SELECT employee_id FROM employees WHERE name = 'Oscar'
  UNION ALL SELECT e.employee_id FROM employees e JOIN sub s ON e.manager_id = s.employee_id)
SELECT COUNT(*) - 1 FROM sub;`,
          note: "**Any depth, and correct on a tree.** The day a data-entry error makes two employees each other's manager, this query never returns." },
        { level: "best", label: "Recursive, depth-guarded, path carried", code: `WITH RECURSIVE sub AS (SELECT employee_id, 0 AS depth, '/' || employee_id || '/' AS path FROM employees WHERE name = 'Oscar'
  UNION ALL SELECT e.employee_id, s.depth + 1, s.path || e.employee_id || '/'
  FROM employees e JOIN sub s ON e.manager_id = s.employee_id
  WHERE s.depth < 20 AND s.path NOT LIKE '%/' || e.employee_id || '/%')
SELECT COUNT(*) - 1 FROM sub;`,
          note: "**Terminates on any data.** The depth cap bounds the cost; the path check makes a cycle produce no row rather than infinitely many, and can be reported as a data-quality finding instead of an outage." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A category tree, a bill of materials, and a cycle report",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Define, in a VALUES CTE, a category tree: `home` → `kitchen`, `office`; `kitchen` → `appliances`; `tech` → `audio`. **(1)** List every category with its depth and full path. **(2)** Map each product to its top-level category — the root of its category's chain — and total paid revenue per root, with the gift card's NULL category reported as `'uncategorised'`. **(3)** Add an edge `appliances → home` to create a cycle, and write the walk so it terminates and returns the cycle's path as a finding." },
        { t: "p", text: "Every recursive member must carry a depth and stop at 10." }
      ],
      requirements: [
        "A recursive walk down with depth and path for (1).",
        "A walk up from each product's category to its root for (2), then a join to paid line items and a GROUP BY root.",
        "A path-guarded walk for (3) that returns the rows where the next node is already on the path.",
        "Verified output."
      ],
      hint: "For (2), anchor on every category with `root = category` and walk up (`parent = t.child`); the row where the parent is NULL gives the root for that starting category. For (3), instead of refusing the revisit, select the rows where `e.child` is already in the path — those are the cycle detections.",
      solution: {
        lang: "sql",
        title: "category_tree.sql",
        code: `-- (1) the tree, top down
WITH RECURSIVE cat(child, parent) AS (VALUES ('home', NULL), ('kitchen', 'home'), ('office', 'home'), ('appliances', 'kitchen'), ('tech', NULL), ('audio', 'tech')),
tree AS (
  SELECT child AS category, 0 AS depth, child AS path FROM cat WHERE parent IS NULL
  UNION ALL
  SELECT c.child, t.depth + 1, t.path || ' > ' || c.child FROM cat c JOIN tree t ON c.parent = t.category WHERE t.depth < 10
)
SELECT depth, category, path FROM tree ORDER BY path;
-- 0 home · 1 kitchen (home > kitchen) · 2 appliances (home > kitchen > appliances) · 1 office (home > office) · 0 tech · 1 audio (tech > audio)

-- (2) each category's root, then revenue per root
WITH RECURSIVE cat(child, parent) AS (VALUES ('home', NULL), ('kitchen', 'home'), ('office', 'home'), ('appliances', 'kitchen'), ('tech', NULL), ('audio', 'tech')),
up AS (
  SELECT child AS start, child AS node, parent, 0 AS depth FROM cat
  UNION ALL
  SELECT u.start, c.child, c.parent, u.depth + 1 FROM cat c JOIN up u ON c.child = u.parent WHERE u.depth < 10
),
roots AS (SELECT start AS category, node AS root FROM up WHERE parent IS NULL)
SELECT COALESCE(r.root, 'uncategorised') AS root, SUM(oi.qty * oi.unit_price) AS revenue
FROM   order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
LEFT   JOIN roots r ON r.category = p.category
WHERE  o.status = 'paid'
GROUP  BY 1 ORDER BY revenue DESC;
-- home 359.90 (kitchen 139.00 + office 220.90) · tech 263.00 · uncategorised 75.00

-- (3) a cycle, detected and reported
WITH RECURSIVE cat(child, parent) AS (VALUES ('home', NULL), ('kitchen', 'home'), ('office', 'home'), ('appliances', 'kitchen'), ('tech', NULL), ('audio', 'tech'), ('home', 'appliances')),
walk AS (
  SELECT child AS node, '/' || child || '/' AS path, 0 AS depth, FALSE AS is_cycle FROM cat WHERE parent IS NULL
  UNION ALL
  SELECT c.child, w.path || c.child || '/', w.depth + 1, w.path LIKE '%/' || c.child || '/%'
  FROM   cat c JOIN walk w ON c.parent = w.node
  WHERE  NOT w.is_cycle AND w.depth < 10
)
SELECT path FROM walk WHERE is_cycle;
-- /home/kitchen/appliances/home/        <- the finding: home is reached again through appliances
-- the walk stops at the detection because the WHERE refuses to extend a row flagged as a cycle`,
        notes: [
          { t: "p", text: "**(2) walks up from every category at once**, carrying the starting category, and reads the root off the row whose parent is NULL. Kitchen and office both resolve to home, so home's revenue is their sum, and the LEFT JOIN keeps the gift card's NULL category as a root of its own." },
          { t: "p", text: "**(3) inverts the usual guard**: rather than refusing to revisit, it computes `is_cycle` as a column and stops extending once it is true. The one row that survives with `is_cycle = TRUE` is the report — a data-quality finding rather than a hung query, which is what PostgreSQL 14's `CYCLE … SET is_cycle` clause produces natively." },
          { t: "p", text: "**Every recursive member carries `depth < 10`** even in (1) and (2), where the data is a tree. The guard costs nothing on clean data and turns a future cycle into a bounded result." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the recursive member, what does the CTE's own name refer to?",
          options: [
            "All rows produced so far",
            "Only the rows produced by the previous round — which is why each round descends exactly one level and why the recursion ends when a round produces nothing",
            "The anchor's rows",
            "The base table"
          ],
          answer: 1,
          why: "The working set is the last round's output. If the name referred to the accumulated result, every round would re-derive every earlier level and the recursion would never produce an empty round."
        }
      ]
    }
  ],

  takeaways: [
    "**Anchor once, then repeat the recursive member on the previous round's rows until a round is empty.** The result is every round appended.",
    "**The CTE's name inside the recursive member is the previous round only**, not the accumulated result.",
    "**A tree terminates on its own; a graph with a cycle does not** — add a depth guard to every recursive CTE regardless.",
    "**Carry depth and path along**: depth bounds the walk, path prints the outline order and detects revisits.",
    "**Walk down with `child.parent = t.id`, up with `parent.id = t.parent`** — the same structure, joined the other way.",
    "**Anchor on every row with `root = id` to aggregate every subtree at once** — the bill-of-materials rollup.",
    "**A series of dates or numbers is a recursion from one literal**, with the end condition in the recursive WHERE — the spine on engines without generate_series.",
    "**UNION instead of UNION ALL drops already-seen rows and ends a cycle by itself**, when only the set of reachable nodes matters.",
    "**A path check — `path NOT LIKE '%/node/%'` — refuses revisits and is the guard for shortest paths and route listings.**",
    "**Report a cycle rather than refusing it**: compute `is_cycle`, stop extending flagged rows, and return them as a finding.",
    "**SQL Server caps recursion at 100 rounds by default**; a long daily spine needs `OPTION (MAXRECURSION n)`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A recursive CTE over an org chart runs forever after a data fix. What most likely happened, and what should the query have had?",
        options: [
          "The table grew too large",
          "The fix introduced a cycle — two employees who are each other's manager — and the recursive member kept finding the same rows; a depth guard or a path check in the recursive WHERE would have bounded it",
          "The anchor returned too many rows",
          "UNION ALL is not allowed in recursion"
        ],
        answer: 1,
        why: "Termination relies on a round producing nothing. A cycle guarantees that never happens. Guards belong in every recursive CTE because the data can change under the query."
      },
      {
        stem: "How do you get each manager's total number of reports at every level, for all managers, in one query?",
        options: [
          "One recursive CTE per manager",
          "Anchor on every employee carrying `root = employee_id`, recurse downward, and GROUP BY root; each employee appears once per ancestor, so the count per root is the subtree size",
          "A self-join three deep",
          "COUNT(*) OVER (PARTITION BY manager_id)"
        ],
        answer: 1,
        why: "The all-roots anchor produces one row per (ancestor, descendant) pair. Grouping by the ancestor collapses each subtree. The same shape sums a bill of materials."
      },
      {
        stem: "What does replacing UNION ALL with UNION do in a recursive graph walk?",
        options: [
          "Nothing",
          "Rows already in the result are not added again, so a cycle stops producing new rows and the recursion terminates — at the cost of losing multiplicity and the ability to distinguish paths",
          "It makes the walk faster on trees",
          "It sorts the output"
        ],
        answer: 1,
        why: "UNION de-duplicates across rounds. For 'which nodes are reachable' that is exactly right; for 'show every path' it is wrong, because two different paths to one node collapse."
      },
      {
        stem: "On SQL Server, a recursive date spine for a full year fails after 100 rows. Why?",
        options: [
          "Dates cannot be recursed",
          "SQL Server limits recursion to 100 rounds by default; the spine needs one round per day, so it needs `OPTION (MAXRECURSION 366)` or 0 for unlimited",
          "The anchor is wrong",
          "UNION ALL is required"
        ],
        answer: 1,
        why: "Each round adds one row, so a 365-day spine is 365 rounds. The limit is a safety net against runaway recursion, and the option raises it deliberately."
      },
      {
        stem: "Which join direction climbs from an employee to the CEO?",
        options: [
          "`employees e JOIN t ON e.manager_id = t.employee_id`",
          "`employees e JOIN t ON e.employee_id = t.manager_id` — the next row is the one whose id is the current row's manager",
          "Either; recursion is symmetric",
          "A LEFT JOIN"
        ],
        answer: 1,
        why: "Walking down finds rows whose manager is the current node; walking up finds the row that is the current node's manager. Same CTE structure, join condition reversed."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you find everyone in an employee's reporting line, at any depth?",
        strong: "A recursive CTE: the anchor selects the manager, the recursive member joins employees whose manager_id is in the previous round, and the engine repeats until a round returns nothing. I carry a depth counter and a path string — depth to cap the walk at, say, twenty in case a data error creates a cycle, path to print the tree in order and to detect a revisit. For everyone's subtree at once I anchor on every employee with a root column and group by root. A fixed number of self-joins answers only a fixed depth and breaks when the organisation adds a layer.",
        answer: [
          { t: "p", text: "The depth guard 'in case of a cycle' is the sign of someone who has run one of these against real data." }
        ]
      },
      {
        level: "core",
        q: "Explain how a recursive CTE is evaluated.",
        strong: "In rounds. The anchor query runs once and its rows become the working set. The recursive member then runs with the CTE's name bound to that working set — only the previous round's rows, not everything accumulated — and its output becomes the next working set. This repeats until a round produces zero rows; the CTE's result is every round appended, or de-duplicated if UNION was used instead of UNION ALL. That is why a hierarchy descends one level per round, why the recursion ends naturally on a tree, and why it never ends on a graph with a cycle unless the query guards against it.",
        answer: [
          { t: "p", text: "The 'previous round only' detail is what most explanations get wrong, and it explains everything else." }
        ]
      },
      {
        level: "advanced",
        q: "Your recursive query hangs in production. Diagnose and fix.",
        strong: "A hang means no round is coming back empty, and on real data that means a cycle — a self-referential row, or a loop through several rows — that a tree-shaped query never expected. First I confirm it with a bounded run: add a depth guard of, say, 50 and inspect the rows at the maximum depth; the repeating ids show the loop. The fix has two parts. The query gets a permanent depth guard and, if paths matter, a path check that refuses revisits — or PostgreSQL 14's CYCLE clause, or UNION if only reachability matters. And the data gets a report: select the rows where the next node is already on the path and hand them to whoever owns the table, plus a constraint or a check job so the cycle cannot come back silently.",
        answer: [
          { t: "p", text: "Turning the hang into a bounded diagnostic query, then fixing both the query and the data, is the complete answer." }
        ]
      }
    ]
  }
});

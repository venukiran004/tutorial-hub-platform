/* ============================================================================
   LESSON 2.5 — Topological Order and DAG Dynamic Programming
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "A directed acyclic graph can be laid out so every edge points forward. **That order, a topological order, is what turns a graph problem into a loop**: process vertices left to right and everything a vertex depends on is already done. Build systems, course prerequisites, spreadsheet recalculation and task schedulers all rest on it. This lesson computes the order two ways, detects the cycles that make it impossible, and then uses it for dynamic programming: counting paths and finding the critical path of a build.",

  objectives: [
    "Compute a topological order with Kahn's algorithm and with DFS",
    "Detect a cycle from either method, and report where it is",
    "Use graphlib.TopologicalSorter from the standard library",
    "Run DP in topological order: count paths and find longest paths",
    "Find a critical path and explain what it means for a schedule"
  ],

  prerequisites: ["2.1", "2.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "order",
      text: "Two ways to order a DAG",
      sub: "Remove sources, or reverse finishing order" },
    { t: "p",
      text: "Kahn's algorithm repeatedly removes a vertex with no remaining incoming edges and decrements the in-degree of its successors. If it removes fewer than n vertices, the rest lie on or behind a cycle. The DFS method records each vertex when its recursion finishes; the reverse of that finishing order is topological. Both are O(V + E). Python 3.9 added graphlib.TopologicalSorter, which does this for you and raises CycleError with the cycle." },
    { t: "code",
      lang: "python",
      title: "topo.py — three orders checked on random DAGs, cycles, and counting paths by enumeration, memoisation and DP",
      code: `import random, sys, time
from collections import deque
from functools import lru_cache
from graphlib import TopologicalSorter, CycleError

def kahn(n, edges):                               # repeatedly take a vertex with no remaining incoming edges
    adj, indeg = [[] for _ in range(n)], [0] * n
    for u, v in edges: adj[u].append(v); indeg[v] += 1
    q = deque(u for u in range(n) if indeg[u] == 0); order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else None     # fewer than n: the rest sit on a cycle

def dfs_order_recursive(n, edges):                # reverse post-order
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    seen, out = [False] * n, []
    def visit(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]: visit(v)
        out.append(u)
    for u in range(n):
        if not seen[u]: visit(u)
    return out[::-1]

def is_topological(order, n, edges):
    pos = {u: i for i, u in enumerate(order)}
    return len(order) == n and all(pos[u] < pos[v] for u, v in edges)

def random_dag(n, m, rnd):                        # edges only from lower to higher index of a random permutation
    perm = list(range(n)); rnd.shuffle(perm)
    return [(perm[a], perm[b]) for a, b in (sorted(rnd.sample(range(n), 2)) for _ in range(m))]

def count_paths_enumerate(n, edges, s, t):        # walk every path explicitly
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    count, stack = 0, [s]
    while stack:
        u = stack.pop()
        if u == t: count += 1; continue
        stack.extend(adj[u])
    return count

def count_paths_memo(n, edges, s, t):             # paths from u to t, cached: each vertex computed once, but recursive
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    @lru_cache(maxsize=None)
    def ways(u): return 1 if u == t else sum(ways(v) for v in adj[u])
    return ways(s)

def count_paths_dp(n, edges, s, t):               # ways[v] = sum of ways[u] over edges u -> v, in topological order
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    ways = [0] * n; ways[s] = 1
    for u in kahn(n, edges):
        for v in adj[u]: ways[v] += ways[u]
    return ways[t]

rnd = random.Random(25)
for _ in range(300):
    n = rnd.randint(2, 30); edges = random_dag(n, rnd.randint(0, 60), rnd)
    assert is_topological(kahn(n, edges), n, edges) and is_topological(dfs_order_recursive(n, edges), n, edges)
    assert is_topological(list(TopologicalSorter({v: [u for u, w in edges if w == v] for v in range(n)}).static_order()), n, edges)
    assert count_paths_enumerate(n, edges, 0, n - 1) == count_paths_dp(n, edges, 0, n - 1) == count_paths_memo(n, edges, 0, n - 1)
print("300 random DAGs: Kahn, DFS and graphlib orders are all valid; path counts by DP and memoisation match enumeration")
print("cycle 0->1->2->0 plus 2->3: Kahn returns", kahn(4, [(0, 1), (1, 2), (2, 0), (2, 3)]), end="; ")
try: list(TopologicalSorter({1: [0], 2: [1], 0: [2]}).static_order())
except CycleError as e: print("graphlib raises CycleError with the cycle", e.args[1])

chain = [(i, i + 1) for i in range(4_999)]
try: dfs_order_recursive(5_000, chain); print("recursive DFS on a 5,000-vertex chain: ok")
except RecursionError: print(f"recursive DFS on a 5,000-vertex chain: RecursionError (limit {sys.getrecursionlimit()}); Kahn:", is_topological(kahn(5_000, chain), 5_000, chain))

# A layered DAG: k layers of 3 vertices, every vertex linked to all 3 in the next layer. Paths from top to bottom: 3^(k-1).
print(f"\\n{'layers':>7}{'paths':>12}{'enumerate ms':>14}{'DP ms':>8}")
for k in (8, 10, 12, 200):
    n = 3 * k + 2; s, t = n - 2, n - 1
    edges = [(s, j) for j in range(3)] + [(3 * (L - 1) + a, 3 * L + b) for L in range(1, k) for a in range(3) for b in range(3)] + [(3 * (k - 1) + j, t) for j in range(3)]
    t0 = time.perf_counter(); d = count_paths_dp(n, edges, s, t); tdp = time.perf_counter() - t0
    if k <= 12:
        t0 = time.perf_counter(); e = count_paths_enumerate(n, edges, s, t); ten = time.perf_counter() - t0; assert d == e
        print(f"{k:>7}{d:>12,}{ten * 1000:>14.0f}{tdp * 1000:>8.2f}")
    else:
        print(f"{k:>7}{'3^' + str(k):>12}{'skipped':>14}{tdp * 1000:>8.2f}   ({len(str(d))} digits, exact)")
for k in (200, 2_000):                            # the memoised version is as fast, until the recursion depth reaches the limit
    n = 3 * k + 2; s, t = n - 2, n - 1
    edges = [(s, j) for j in range(3)] + [(3 * (L - 1) + a, 3 * L + b) for L in range(1, k) for a in range(3) for b in range(3)] + [(3 * (k - 1) + j, t) for j in range(3)]
    try: ok = count_paths_memo(n, edges, s, t) == count_paths_dp(n, edges, s, t); print(f"memoised recursion, {k:,} layers: matches DP: {ok}")
    except RecursionError: print(f"memoised recursion, {k:,} layers: RecursionError; the DP over Kahn's order has no depth")`,
      out: `300 random DAGs: Kahn, DFS and graphlib orders are all valid; path counts by DP and memoisation match enumeration
cycle 0->1->2->0 plus 2->3: Kahn returns None; graphlib raises CycleError with the cycle [1, 2, 0, 1]
recursive DFS on a 5,000-vertex chain: RecursionError (limit 1000); Kahn: True

 layers       paths  enumerate ms   DP ms
      8       6,561             1    0.02
     10      59,049             8    0.02
     12     531,441            72    0.03
    200       3^200       skipped    0.48   (96 digits, exact)
memoised recursion, 200 layers: matches DP: True
memoised recursion, 2,000 layers: RecursionError; the DP over Kahn's order has no depth` },
    { t: "callout",
      kind: "trap",
      title: "Recursive DFS fails on long dependency chains",
      body: [
        { t: "p",
          text: "The DFS ordering raised RecursionError on a 5,000-vertex chain, and the memoised path count did the same on 2,000 layers. Real dependency graphs, such as package or migration chains, can be that deep. Kahn's algorithm is iterative and has no depth limit; prefer it, or graphlib, in Python." }
      ] },
    { t: "dl",
      items: [
        [
          "Enumeration grows with the number of paths",
          "A layered DAG with 3 vertices per layer has 3^(k−1) paths: enumeration took 1, 8 and 72 ms for 8, 10 and 12 layers, multiplying by 9 every two layers."
        ],
        [
          "DP grows with the number of edges",
          "Counting the same paths in topological order took 0.02–0.03 ms, and 0.48 ms for 200 layers, where the answer has 96 digits and could never be enumerated."
        ],
        [
          "A cycle is reported, not looped on",
          "Kahn returned None for a graph with a cycle; graphlib raised CycleError naming it, [1, 2, 0, 1]."
        ]
      ] },
    { t: "ladder",
      title: "Count the paths from s to t in a DAG",
      rungs: [
        { level: "bad",
          label: "Enumerate every path",
          why: "Time proportional to the number of paths, which can be exponential in the size of the graph.",
          code: `def count_paths_enumerate(n, edges, s, t):        # walk every path explicitly
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    count, stack = 0, [s]
    while stack:
        u = stack.pop()
        if u == t: count += 1; continue
        stack.extend(adj[u])
    return count`,
          note: "Fine as a test oracle on small graphs, which is how it is used here." },
        { level: "ok",
          label: "Memoised recursion",
          why: "O(V + E): each vertex's count is computed once. But the recursion depth equals the longest path.",
          code: `def count_paths_memo(n, edges, s, t):             # paths from u to t, cached: each vertex computed once, but recursive
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    @lru_cache(maxsize=None)
    def ways(u): return 1 if u == t else sum(ways(v) for v in adj[u])
    return ways(s)`,
          note: "Raised RecursionError at 2,000 layers." },
        { level: "best",
          label: "DP in topological order",
          why: "O(V + E) and iterative: push each vertex's count forward along its edges, in Kahn's order.",
          code: `def count_paths_dp(n, edges, s, t):               # ways[v] = sum of ways[u] over edges u -> v, in topological order
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v)
    ways = [0] * n; ways[s] = 1
    for u in kahn(n, edges):
        for v in adj[u]: ways[v] += ways[u]
    return ways[t]`,
          note: "Python integers do not overflow, so the 96-digit count is exact; in other languages take it modulo a prime." }
      ] },
    { t: "h2",
      n: "02",
      id: "dag-dp",
      text: "Dynamic programming on a DAG",
      sub: "The order is the recurrence's evaluation order" },
    { t: "p",
      text: "Any recurrence of the form \"the value at v depends on the values at v's predecessors\" can be evaluated in topological order, because the predecessors are always finished first. Sum over predecessors and you count paths; take the maximum of predecessor plus duration and you get the earliest finish time of a task; take the minimum and you get shortest paths, in O(V + E) even with negative weights, which neither Dijkstra nor Bellman-Ford can match." },
    { t: "table",
      head: ["Combine predecessors with", "Computes"],
      rows: [
        ["sum", "Number of paths"],
        ["max(value + weight)", "Longest path; earliest finish time; critical path"],
        ["min(value + weight)", "Shortest path, negative weights allowed"],
        ["OR", "Reachability"],
        ["any associative operation", "The same loop; only the combine step changes"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Longest path is easy only because there is no cycle",
      body: [
        { t: "p",
          text: "On a general graph, the longest simple path is NP-hard. On a DAG it is one pass in topological order. When a problem asks for a longest path, check whether its graph is acyclic: time-ordered events, dependencies and prerequisites usually are." }
      ] },
    { t: "h2",
      n: "03",
      id: "critical",
      text: "The critical path",
      sub: "Why a faster machine does not help some builds" },
    { t: "p",
      text: "With unlimited parallel workers, a build takes as long as its longest dependency chain, weighted by task duration. That chain is the critical path, and speeding up any task off it does not shorten the build at all. The figure is computed by the exercise's solution on a nine-task build: 76 minutes of work, 55 minutes of wall-clock time, and only five tasks that matter for the total." },
    { t: "viz",
      title: "A build and its critical path",
      caption: "Each column holds tasks whose longest chain of dependencies has the same length. The red tasks form the critical path, fetch → deps → compile → package → integ, 55 minutes. Shortening lint, codegen, unit or docs does not change the total.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="122.7" y1="88.0" x2="173.3" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="136.0" y1="114.0" x2="160.0" y2="114.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="288.0" y1="52.4" x2="312.0" y2="58.6" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="288.0" y1="97.6" x2="312.0" y2="91.4" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="440.0" y1="75.0" x2="464.0" y2="75.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="122.7" y1="140.0" x2="173.3" y2="166.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="426.7" y1="101.0" x2="477.3" y2="127.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="288.0" y1="183.8" x2="464.0" y2="161.2" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="592.0" y1="136.6" x2="616.0" y2="130.4" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="288.0" y1="130.4" x2="312.0" y2="136.6" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="8" y="88" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="72.0" y="110" text-anchor="middle" class="s-label" style="fill:var(--crit)">fetch</text>
<text x="72.0" y="128" text-anchor="middle" class="s-sub">3 min</text>
<rect x="160" y="10" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="224.0" y="32" text-anchor="middle" class="s-label" style="fill:var(--crit)">deps</text>
<text x="224.0" y="50" text-anchor="middle" class="s-sub">12 min</text>
<rect x="160" y="88" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="224.0" y="110" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">codegen</text>
<text x="224.0" y="128" text-anchor="middle" class="s-sub">4 min</text>
<rect x="160" y="166" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="224.0" y="188" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">lint</text>
<text x="224.0" y="206" text-anchor="middle" class="s-sub">2 min</text>
<rect x="312" y="49" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="376.0" y="71" text-anchor="middle" class="s-label" style="fill:var(--crit)">compile</text>
<text x="376.0" y="89" text-anchor="middle" class="s-sub">20 min</text>
<rect x="312" y="127" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="376.0" y="149" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">docs</text>
<text x="376.0" y="167" text-anchor="middle" class="s-sub">6 min</text>
<rect x="464" y="49" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="528.0" y="71" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">unit</text>
<text x="528.0" y="89" text-anchor="middle" class="s-sub">9 min</text>
<rect x="464" y="127" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="528.0" y="149" text-anchor="middle" class="s-label" style="fill:var(--crit)">package</text>
<text x="528.0" y="167" text-anchor="middle" class="s-sub">5 min</text>
<rect x="616" y="88" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="680.0" y="110" text-anchor="middle" class="s-label" style="fill:var(--crit)">integ</text>
<text x="680.0" y="128" text-anchor="middle" class="s-sub">15 min</text>
</svg>` },
    { t: "exercise",
      kind: "Challenge",
      title: "Critical path of a build",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Tasks have durations and dependencies. Assuming unlimited parallel workers, compute the minimum total time, return one critical path, and raise a clear error naming the tasks involved if the dependencies contain a cycle. Check against a brute force on random task graphs, and check that the returned path is a real chain of the reported length." }
      ],
      requirements: [
        "Kahn's algorithm over the tasks",
        "Earliest finish = duration + the maximum finish among dependencies",
        "A predecessor pointer per task to recover the path",
        "A cycle error naming the tasks that could not be scheduled"
      ],
      hint: "Record which predecessor set each task's finish time; following those pointers back from the latest-finishing task gives the path.",
      solution: { lang: "python",
        title: "critical_path.py",
        code: `import random
from collections import deque

def critical_path(duration, deps):
    """duration: {task: minutes}; deps: {task: [tasks it waits for]}. With unlimited parallel workers, return
    (minimum total time, one critical path), or raise ValueError on a cycle. O(V + E)."""
    tasks = list(duration); after = {t: [] for t in tasks}; indeg = {t: 0 for t in tasks}
    for t, pre in deps.items():
        for p in pre: after[p].append(t); indeg[t] += 1
    finish, via = {}, {}                                   # earliest finish time, and the predecessor that set it
    q = deque(t for t in tasks if indeg[t] == 0)
    for t in q: finish[t] = duration[t]; via[t] = None
    done = 0
    while q:
        u = q.popleft(); done += 1
        for v in after[u]:
            if finish[u] + duration[v] > finish.get(v, -1): finish[v] = finish[u] + duration[v]; via[v] = u
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    if done < len(tasks): raise ValueError("dependency cycle among: " + ", ".join(sorted(t for t in tasks if indeg[t] > 0)))
    end = max(finish, key=finish.get); path = []
    while end is not None: path.append(end); end = via[end]
    return finish[path[0]], path[::-1]

def longest_brute(duration, deps):                         # try every path from every task
    after = {t: [] for t in duration}
    for t, pre in deps.items():
        for p in pre: after[p].append(t)
    def best(u): return duration[u] + max((best(v) for v in after[u]), default=0)
    return max(best(t) for t in duration)

build = {"fetch": 3, "deps": 12, "codegen": 4, "compile": 20, "unit": 9, "lint": 2, "package": 5, "integ": 15, "docs": 6}
needs = {"deps": ["fetch"], "codegen": ["fetch"], "compile": ["deps", "codegen"], "unit": ["compile"], "lint": ["fetch"],
         "package": ["compile", "lint"], "integ": ["package"], "docs": ["codegen"]}
total, path = critical_path(build, needs)
print(f"build: {total} minutes with unlimited workers; critical path: {' -> '.join(path)}")
print("sum of all task durations (one worker):", sum(build.values()))
try: critical_path({"a": 1, "b": 1, "c": 1}, {"a": ["c"], "b": ["a"], "c": ["b"]})
except ValueError as e: print("cycle:", e)

rnd = random.Random(26)
for _ in range(400):
    n = rnd.randint(1, 12); names = [f"t{i}" for i in range(n)]
    dur = {t: rnd.randint(1, 20) for t in names}
    deps = {names[j]: sorted({names[i] for i in rnd.sample(range(j), rnd.randint(0, min(j, 3)))}) for j in range(n)}
    tot, p = critical_path(dur, deps)
    assert tot == longest_brute(dur, deps) == sum(dur[t] for t in p)
    assert all(a in deps[b] for a, b in zip(p, p[1:]))     # the reported path is a real dependency chain
print("400 random task graphs: total matches brute force, and the reported path is a real chain with that length")`,
        out: `build: 55 minutes with unlimited workers; critical path: fetch -> deps -> compile -> package -> integ
sum of all task durations (one worker): 76
cycle: dependency cycle among: a, b, c
400 random task graphs: total matches brute force, and the reported path is a real chain with that length`,
        notes: [
          { t: "p",
            text: "On 400 random task graphs the total matched a brute force over all paths, and each returned path was a genuine dependency chain whose durations summed to the total; checking the path, not only the number, caught nothing here but is what would catch a predecessor pointer updated at the wrong moment." },
          { t: "p",
            text: "The build needs 55 minutes with unlimited workers against 76 with one. Speeding up compile, on the critical path, shortens the build minute for minute; speeding up unit tests does nothing until another chain becomes critical." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the migration runner that hung on deploy",
      body: [
        { t: "p",
          text: "**Symptom.** A deploy stalled at \"running migrations\" with no error until the pipeline timed out an hour later." },
        { t: "p",
          text: "**Mechanism.** Two new migrations each declared the other as a dependency. The runner picked the next migration with no unmet dependencies in a loop, found none, and waited for one to appear." },
        { t: "p",
          text: "**Fix.** The runner now orders migrations with graphlib.TopologicalSorter up front and fails immediately with CycleError naming the migrations involved. The same check runs in CI on every pull request that adds a migration." }
      ] }
  ],

  takeaways: [
    "A **topological order** makes every edge point forward; only DAGs have one.",
    "**Kahn's algorithm** removes sources; fewer than n removed means a **cycle**.",
    "DFS reverse post-order works too, but recursion failed at **5,000** vertices; prefer Kahn or **graphlib**.",
    "Any recurrence over predecessors runs in **topological order** in O(V + E).",
    "Counting 3^199 paths took **0.48 ms** by DP; enumeration was already 72 ms at 3^11.",
    "**Longest path** is easy on a DAG and NP-hard in general.",
    "Shortest paths on a DAG handle **negative weights** in O(V + E).",
    "The **critical path** sets a parallel build's time: 55 of 76 minutes in the example.",
    "Speeding up a task **off the critical path** does not shorten the build."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Kahn's algorithm outputs fewer than n vertices. What does this mean?",
        options: [
          "The graph is disconnected",
          "The graph contains a cycle",
          "Some edges are duplicated",
          "The graph has several sources"
        ],
        answer: 1,
        why: "Vertices on a cycle never reach in-degree zero, so they are never removed. Disconnected graphs, duplicate edges and multiple sources are all handled normally." },
      { stem: "Why can DP count paths in a DAG in O(V + E)?",
        options: [
          "It samples a subset of paths",
          "Predecessors are finished first",
          "Python integers are unbounded",
          "It caches paths in a dictionary"
        ],
        answer: 1,
        why: "In topological order each vertex's count is final before it is pushed forward, so each edge is used once. Big integers keep it exact but do not make it fast, and no paths are stored or sampled." },
      { stem: "Longest simple path: on a DAG it is…",
        options: [
          "NP-hard, as on any graph",
          "One pass in topological order",
          "Dijkstra with negated weights",
          "Only solvable by enumeration"
        ],
        answer: 1,
        why: "Without cycles, longest path is the max-plus recurrence in topological order. Negating weights for Dijkstra fails because of the negative edges; the NP-hardness applies to graphs with cycles." },
      { stem: "A task off the critical path gets twice as fast. The build time…",
        options: ["Halves", "Is unchanged", "Drops by that task's saving", "Rises a little"],
        answer: 1,
        why: "The total is the longest chain; a task on a shorter chain does not affect it, until enough changes make another chain critical." }
    ] },

  interview: { title: "In an interview",
    sub: "Say how you detect the cycle, not only how you order.",
    questions: [
      { level: "core",
        q: "Can all courses be finished, given their prerequisites?",
        strong: "A strong answer uses Kahn's algorithm and the count check.",
        answer: [
          { t: "p",
            text: "Build the graph from prerequisite to course and the in-degree of each course. Queue the courses with in-degree zero, pop one, take it, and decrement its successors, queueing those that reach zero. If the number taken equals the number of courses, the order is valid; otherwise there is a cycle. O(V + E), iterative, so deep chains are no problem." }
        ] },
      { level: "advanced",
        q: "Find the minimum time to complete a project of dependent tasks with unlimited workers.",
        strong: "A strong answer identifies longest path on a DAG and the critical path.",
        answer: [
          { t: "p",
            text: "It is the longest path in the DAG weighted by task durations. In topological order, each task's earliest finish is its duration plus the latest finish among its dependencies; the maximum over tasks is the answer, and following the predecessor that set each maximum recovers the critical path. With a limited number of workers it becomes a scheduling problem that is NP-hard in general, and list-scheduling heuristics are used." }
        ] },
      { level: "core",
        q: "When would you use DFS instead of Kahn's algorithm?",
        strong: "A strong answer compares them honestly and mentions recursion depth in Python.",
        answer: [
          { t: "p",
            text: "Both are O(V + E). DFS is natural when you are already doing a DFS, for example to find strongly connected components, and three-colour DFS reports the actual cycle. Kahn is iterative, gives the cycle check for free by counting, and can produce the lexicographically smallest order with a heap. In Python I default to Kahn or graphlib because recursive DFS fails on chains deeper than about a thousand." }
        ] }
    ] }
});

/* ============================================================================
   LESSON 2.3 — Shortest Paths
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "Shortest paths are one idea with four implementations, chosen by the edge weights. **Unit weights: BFS. Weights of 0 or 1: a deque. Non-negative weights: Dijkstra with a heap. Negative weights: Bellman-Ford**, which also detects negative cycles. Picking the wrong one either costs an order of magnitude or gives a wrong answer silently. This lesson checks all four against each other on random graphs, times them, and runs the four-vertex graph that breaks Dijkstra.",

  objectives: [
    "Choose the shortest-path algorithm from the edge weights",
    "Write Dijkstra with heapq and lazy deletion, and explain the stale-entry check",
    "Use 0-1 BFS with a deque when weights are only 0 or 1",
    "Detect a negative cycle with Bellman-Ford, and know its worst case",
    "Reconstruct the path with parent pointers, not only the distance"
  ],

  prerequisites: ["2.1", "1.3"],

  blocks: [
    { t: "h2", n: "01", id: "choose", text: "The weights choose the algorithm", sub: "Four cases, one table" },
    { t: "table",
      head: ["Edge weights", "Algorithm", "Cost"],
      rows: [
        ["All equal (unweighted)", "BFS with a deque", "O(V + E)"],
        ["0 or 1", "0-1 BFS: 0-edges to the front of the deque", "O(V + E)"],
        ["Non-negative", "Dijkstra with a binary heap", "O(E log V)"],
        ["Some negative, no negative cycle", "Bellman-Ford (or SPFA)", "O(V·E)"],
        ["All pairs, small V", "Floyd-Warshall", "O(V³)"],
        ["Directed acyclic, any weights", "Relax in topological order (2.5)", "O(V + E)"]
      ] },
    { t: "p",
      text: "BFS works for unit weights because it visits vertices in order of distance: the first time it reaches a vertex is along a shortest path. Dijkstra generalises this with a heap, always expanding the closest unsettled vertex. That greedy step is only valid when no later edge can make a settled vertex closer, which is exactly the assumption negative edges break." },
    { t: "h2",
      n: "02",
      id: "dijkstra",
      text: "Dijkstra with heapq",
      sub: "Lazy deletion instead of decrease-key" },
    { t: "p",
      text: "heapq has no decrease-key operation. The standard workaround is to push a new (distance, vertex) entry whenever a distance improves, and to skip entries on pop whose distance is larger than the best known: they are stale. The heap may hold more than V entries, up to E, which keeps the bound at O(E log V)." },
    { t: "code",
      lang: "python",
      title: "paths.py — four algorithms cross-checked on 200 random graphs, the negative edge, and timings",
      code: `import heapq, random, time
from collections import deque

INF = float("inf")

def bfs(adj, src):                                # unit weights: the first visit is the shortest
    dist = {src: 0}; q = deque([src])
    while q:
        u = q.popleft()
        for v, _ in adj[u]:
            if v not in dist: dist[v] = dist[u] + 1; q.append(v)
    return dist

def dijkstra(adj, src):                           # non-negative weights; lazy deletion instead of decrease-key
    dist = {src: 0}; pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue                  # a stale entry: u was already settled with a shorter distance
        for v, w in adj[u]:
            nd = d + w
            if nd < dist.get(v, INF): dist[v] = nd; heapq.heappush(pq, (nd, v))
    return dist

def dijkstra_scan(adj, src):                      # no heap: pick the closest unsettled vertex by scanning, O(V^2)
    dist = {u: INF for u in adj}; dist[src] = 0; done = set()
    for _ in range(len(adj)):
        u = min((x for x in adj if x not in done), key=dist.__getitem__)
        if dist[u] == INF: break
        done.add(u)
        for v, w in adj[u]:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
    return {u: d for u, d in dist.items() if d < INF}

def zero_one_bfs(adj, src):                       # weights 0 or 1: a deque, 0-edges to the front
    dist = {src: 0}; dq = deque([src])
    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            nd = dist[u] + w
            if nd < dist.get(v, INF):
                dist[v] = nd
                (dq.appendleft if w == 0 else dq.append)(v)
    return dist

def bellman_ford(n, edges, src):                  # any weights; detects a negative cycle reachable from src
    dist = [INF] * n; dist[src] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w; changed = True
        if not changed: break                     # early exit: nothing improved in a full pass
    for u, v, w in edges:
        if dist[u] + w < dist[v]: return None     # still improving after n - 1 passes: a negative cycle
    return dist

def random_graph(n, m, wmax, seed):
    rnd = random.Random(seed); adj = {u: [] for u in range(n)}
    for u in range(n - 1): adj[u].append((u + 1, rnd.randint(1, wmax)))     # a path, so everything is reachable
    for _ in range(m - (n - 1)):
        u, v = rnd.randrange(n), rnd.randrange(n); adj[u].append((v, rnd.randint(1, wmax)))
    return adj

# 1. Correctness: Dijkstra against Bellman-Ford on random graphs; BFS and 0-1 BFS against Dijkstra in their special cases.
for seed in range(200):
    g = random_graph(30, 90, 20, seed)
    edges = [(u, v, w) for u in g for v, w in g[u]]
    bf = bellman_ford(30, edges, 0)
    assert dijkstra(g, 0) == {u: d for u, d in enumerate(bf) if d < INF} == dijkstra_scan(g, 0)
    unit = {u: [(v, 1) for v, _ in g[u]] for u in g}; assert bfs(unit, 0) == dijkstra(unit, 0)
    zo = {u: [(v, w % 2) for v, w in g[u]] for u in g}; assert zero_one_bfs(zo, 0) == dijkstra(zo, 0)
print("200 random graphs: Dijkstra = Bellman-Ford = O(V^2) Dijkstra; BFS and 0-1 BFS = Dijkstra on their weights")

# 2. The case that breaks Dijkstra: one negative edge.
g = {"A": [("B", 1), ("C", 4)], "B": [("D", 2)], "C": [("B", -4)], "D": []}
ix = {k: i for i, k in enumerate(g)}
bf = bellman_ford(4, [(ix[u], ix[v], w) for u in g for v, w in g[u]], 0)
print("negative edge C->B = -4, true distance to D is", bf[ix["D"]])
print("  settle-once Dijkstra:", dijkstra_scan(g, "A")["D"], "(wrong: B was settled at 1 before C revealed the path at 0)")
print("  lazy heap Dijkstra:  ", dijkstra(g, "A")["D"], "(right here, only because it re-processes B; its O(E log V) bound no longer holds)")
cyc = [(0, 1, 1), (1, 2, -2), (2, 1, 1)]
print("graph with a negative cycle: Bellman-Ford returns", bellman_ford(3, cyc, 0))

# 3. Timing.
print(f"\\n{'V':>7}{'E':>9}{'heap Dijkstra':>15}{'scan Dijkstra':>15}{'Bellman-Ford':>14}{'BF, edges reversed':>20}   (ms)")
for n in (1_000, 2_000, 100_000):
    g = random_graph(n, 5 * n, 100, 1)
    edges = [(u, v, w) for u in g for v, w in g[u]]
    t = time.perf_counter(); a = dijkstra(g, 0); th = time.perf_counter() - t
    if n <= 2_000:
        t = time.perf_counter(); b = dijkstra_scan(g, 0); ts = time.perf_counter() - t
        t = time.perf_counter(); c = bellman_ford(n, edges, 0); tb = time.perf_counter() - t
        t = time.perf_counter(); c2 = bellman_ford(n, edges[::-1], 0); tr = time.perf_counter() - t
        assert a == b == {u: d for u, d in enumerate(c) if d < INF} and c == c2
        print(f"{n:>7,}{len(edges):>9,}{th * 1000:>15.1f}{ts * 1000:>15.0f}{tb * 1000:>14.0f}{tr * 1000:>20.0f}")
    else:
        print(f"{n:>7,}{len(edges):>9,}{th * 1000:>15.0f}{'skipped':>15}{'skipped':>14}{'skipped':>20}")

# Bellman-Ford's early exit makes random graphs look cheap: their shortest paths have few hops. A long chain is its worst case.
for n in (1_000, 2_000):
    chain = [(u, u + 1, 1) for u in range(n - 1)][::-1]                 # edges listed against the direction of the path
    t = time.perf_counter(); d = bellman_ford(n, chain, 0); tb = time.perf_counter() - t
    t = time.perf_counter(); dj = dijkstra({u: [(u + 1, 1)] if u < n - 1 else [] for u in range(n)}, 0); tj = time.perf_counter() - t
    assert d[-1] == dj[n - 1] == n - 1
    print(f"chain of {n:,} vertices, edges in reverse order: Bellman-Ford {tb * 1000:.0f} ms, Dijkstra {tj * 1000:.1f} ms")`,
      out: `200 random graphs: Dijkstra = Bellman-Ford = O(V^2) Dijkstra; BFS and 0-1 BFS = Dijkstra on their weights
negative edge C->B = -4, true distance to D is 2
  settle-once Dijkstra: 3 (wrong: B was settled at 1 before C revealed the path at 0)
  lazy heap Dijkstra:   2 (right here, only because it re-processes B; its O(E log V) bound no longer holds)
graph with a negative cycle: Bellman-Ford returns None

      V        E  heap Dijkstra  scan Dijkstra  Bellman-Ford  BF, edges reversed   (ms)
  1,000    5,000            1.1             46             2                   3
  2,000   10,000            2.4            176             4                   6
100,000  500,000            488        skipped       skipped             skipped
chain of 1,000 vertices, edges in reverse order: Bellman-Ford 44 ms, Dijkstra 0.6 ms
chain of 2,000 vertices, edges in reverse order: Bellman-Ford 181 ms, Dijkstra 1.6 ms` },
    { t: "viz",
      title: "The graph that breaks Dijkstra",
      caption: "The textbook version settles B at distance 1, because B is closer than C. Only after settling C does it see the edge C→B of −4, which makes B's true distance 0 and D's 2. A settle-once Dijkstra reports 3.",
      svg: `<svg viewBox="0 0 760 245" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="140.0" y1="101.0" x2="250.0" y2="64.3" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="195.0" y="76.7" text-anchor="middle" class="s-sub">1</text>
<line x1="140.0" y1="132.2" x2="440.0" y2="188.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="290.0" y="154.1" text-anchor="middle" class="s-sub">4</text>
<line x1="479.1" y1="175.0" x2="350.9" y2="67.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="415.0" y="115.0" text-anchor="middle" class="s-sub">−4</text>
<line x1="390.0" y1="56.8" x2="610.0" y2="106.4" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="500.0" y="75.6" text-anchor="middle" class="s-sub">2</text>
<rect x="20" y="95" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--accent)">A</text>
<text x="80.0" y="135" text-anchor="middle" class="s-sub">source, 0</text>
<rect x="250" y="15" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="320.0" y="37" text-anchor="middle" class="s-label" style="fill:var(--crit)">B</text>
<text x="320.0" y="55" text-anchor="middle" class="s-sub">settled at 1; true 0</text>
<rect x="440" y="175" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="510.0" y="197" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">C</text>
<text x="510.0" y="215" text-anchor="middle" class="s-sub">4</text>
<rect x="610" y="95" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="675.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--crit)">D</text>
<text x="675.0" y="135" text-anchor="middle" class="s-sub">reported 3; true 2</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "Negative edges fail silently",
      body: [
        { t: "p",
          text: "Dijkstra does not raise an error on a negative edge; it returns a wrong distance, 3 instead of 2 above. The lazy heap version happened to return 2 here because it re-processes a vertex whose distance improves, but then it is no longer Dijkstra: its running time on graphs with negative edges can be exponential. If any weight can be negative, validate the input or use Bellman-Ford." }
      ] },
    { t: "dl",
      items: [
        [
          "Heap against scan",
          "Dijkstra with a heap took 2.4 ms on 2,000 vertices and 10,000 edges; scanning for the closest vertex took 176 ms, O(V²). On 100,000 vertices the heap version took 488 ms."
        ],
        [
          "Bellman-Ford's early exit",
          "On random graphs Bellman-Ford took only 4–6 ms, because random shortcuts keep shortest paths a few hops long and the early exit stops after a few passes."
        ],
        [
          "Bellman-Ford's worst case",
          "On a 2,000-vertex chain with edges listed backwards it needed all V − 1 passes: 181 ms, against 1.6 ms for Dijkstra. Doubling V quadrupled the time."
        ]
      ] },
    { t: "ladder",
      title: "Single-source shortest paths, non-negative weights",
      rungs: [
        { level: "bad",
          label: "Bellman-Ford everywhere",
          why: "O(V·E) in the worst case; correct for any weights, and 110× slower than Dijkstra on a 2,000-vertex chain.",
          code: `def bellman_ford(n, edges, src):                  # any weights; detects a negative cycle reachable from src
    dist = [INF] * n; dist[src] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w; changed = True
        if not changed: break                     # early exit: nothing improved in a full pass
    for u, v, w in edges:
        if dist[u] + w < dist[v]: return None     # still improving after n - 1 passes: a negative cycle
    return dist`,
          note: "The right tool when weights can be negative, or to detect a negative cycle." },
        { level: "ok",
          label: "Dijkstra, scanning for the closest vertex",
          why: "O(V²): fine for dense graphs where E is close to V², slow for sparse ones.",
          code: `def dijkstra_scan(adj, src):                      # no heap: pick the closest unsettled vertex by scanning, O(V^2)
    dist = {u: INF for u in adj}; dist[src] = 0; done = set()
    for _ in range(len(adj)):
        u = min((x for x in adj if x not in done), key=dist.__getitem__)
        if dist[u] == INF: break
        done.add(u)
        for v, w in adj[u]:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
    return {u: d for u, d in dist.items() if d < INF}`,
          note: "Settles each vertex once, which is why it gets the negative-edge example wrong." },
        { level: "best",
          label: "Dijkstra with heapq and lazy deletion",
          why: "O(E log V), and the stale-entry check keeps work proportional to the pushes.",
          code: `def dijkstra(adj, src):                           # non-negative weights; lazy deletion instead of decrease-key
    dist = {src: 0}; pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue                  # a stale entry: u was already settled with a shorter distance
        for v, w in adj[u]:
            nd = d + w
            if nd < dist.get(v, INF): dist[v] = nd; heapq.heappush(pq, (nd, v))
    return dist`,
          note: "Stop early when the target is popped if you need only one destination." }
      ] },
    { t: "h2",
      n: "03",
      id: "zero-one",
      text: "0-1 BFS and recovering the path",
      sub: "A deque, and a parent per vertex" },
    { t: "p",
      text: "When every edge costs 0 or 1, a deque replaces the heap: push a vertex reached by a 0-edge to the front and one reached by a 1-edge to the back, and the deque stays sorted by distance. Problems that look like grids with obstacles, \"fewest walls to break\" or \"fewest direction changes\", are usually this. Whatever the algorithm, store each vertex's parent when its distance improves; the path is the parents read back from the target." },
    { t: "callout",
      kind: "insight",
      title: "Model the state, then pick the algorithm",
      body: [
        { t: "p",
          text: "Many path problems are shortest paths on a graph you construct: (cell, keys held), (city, stops used), (position, direction). Once the state and the cost of each transition are written down, the weights tell you which of the four algorithms applies." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Fewest walls to break",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "In a grid of open cells (.) and walls (#), find the fewest walls you must break to walk from the top-left to the bottom-right, moving in four directions, and return a path that achieves it. Check the cost against Dijkstra and check the path itself, then time both on a 600 × 600 grid." }
      ],
      requirements: [
        "Model entering a wall as cost 1 and an open cell as cost 0",
        "A 0-1 BFS with a deque, O(cells)",
        "Parent pointers and a reconstructed path",
        "Checks that the path is made of adjacent steps and breaks exactly the reported number of walls"
      ],
      hint: "appendleft for a 0-cost move, append for a 1-cost move, and only when the new distance is strictly smaller.",
      solution: { lang: "python",
        title: "fewest_walls.py",
        code: `import heapq, random, time
from collections import deque

def fewest_walls(grid):
    """Fewest walls ('#') to break to walk from top-left to bottom-right, 4-directional.
    Entering a wall costs 1, an open cell 0: a 0-1 BFS, O(cells). Returns (cost, path)."""
    R, C = len(grid), len(grid[0]); INF = float("inf")
    dist = [[INF] * C for _ in range(R)]; parent = {}
    dist[0][0] = 0; dq = deque([(0, 0)])
    while dq:
        r, c = dq.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C:
                w = grid[nr][nc] == "#"
                if dist[r][c] + w < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + w; parent[nr, nc] = (r, c)
                    (dq.append if w else dq.appendleft)((nr, nc))
    path, cell = [], (R - 1, C - 1)                     # walk parents back from the target
    while cell != (0, 0): path.append(cell); cell = parent[cell]
    return dist[R - 1][C - 1], [(0, 0)] + path[::-1]

def fewest_walls_dijkstra(grid):
    R, C = len(grid), len(grid[0]); dist = {(0, 0): 0}; pq = [(0, 0, 0)]
    while pq:
        d, r, c = heapq.heappop(pq)
        if d > dist[r, c]: continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C:
                nd = d + (grid[nr][nc] == "#")
                if nd < dist.get((nr, nc), float("inf")): dist[nr, nc] = nd; heapq.heappush(pq, (nd, nr, nc))
    return dist[R - 1, C - 1]

def make(R, C, p, rnd):
    g = [["#" if rnd.random() < p else "." for _ in range(C)] for _ in range(R)]
    g[0][0] = g[-1][-1] = "."; return ["".join(row) for row in g]

rnd = random.Random(23)
for _ in range(300):
    g = make(rnd.randint(1, 9), rnd.randint(1, 9), 0.4, rnd)
    cost, path = fewest_walls(g)
    assert cost == fewest_walls_dijkstra(g)
    assert sum(g[r][c] == "#" for r, c in path) == cost                      # the path really breaks that many walls
    assert all(abs(r1 - r2) + abs(c1 - c2) == 1 for (r1, c1), (r2, c2) in zip(path, path[1:]))
print("300 random grids: 0-1 BFS cost = Dijkstra cost, and each reconstructed path is adjacent steps breaking exactly that many walls")
demo = ["..#....", "#.#.##.", "..#..#.", ".###.#.", "....#.."]
cost, path = fewest_walls(demo)
print(f"demo: break {cost} wall(s); path {path}")

g = make(600, 600, 0.55, rnd)
t = time.perf_counter(); a = fewest_walls(g)[0]; t01 = time.perf_counter() - t
t = time.perf_counter(); b = fewest_walls_dijkstra(g); tdj = time.perf_counter() - t
assert a == b
print(f"600 x 600 grid: 0-1 BFS {t01 * 1000:.0f} ms, Dijkstra {tdj * 1000:.0f} ms, walls broken {a}")`,
        out: `300 random grids: 0-1 BFS cost = Dijkstra cost, and each reconstructed path is adjacent steps breaking exactly that many walls
demo: break 1 wall(s); path [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (1, 6), (2, 6), (3, 6), (4, 6)]
600 x 600 grid: 0-1 BFS 441 ms, Dijkstra 818 ms, walls broken 126`,
        notes: [
          { t: "p",
            text: "On 300 random grids the 0-1 BFS matched Dijkstra, and every reconstructed path was valid and broke exactly the reported number of walls; checking the path, not only the number, is what catches a wrong parent update." },
          { t: "p",
            text: "On a 600 × 600 grid the 0-1 BFS took 441 ms and Dijkstra 818 ms. Both are fine at this size; the deque wins by avoiding the heap's log factor and tuple comparisons. A first run used 35% walls and needed to break none, since the open cells already connected the corners, so the timing grid uses 55%." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the route planner that preferred the toll road",
      body: [
        { t: "p",
          text: "**Symptom.** After rebates were added, a delivery planner kept choosing routes that the finance team could show were not the cheapest, by a few percent, on about one route in fifty." },
        { t: "p",
          text: "**Mechanism.** Rebates were modelled as negative edge costs, and the planner used Dijkstra, which settled some junctions before discovering the rebate edges that made them cheaper. No error was raised." },
        { t: "p",
          text: "**Fix.** Costs were re-based so every edge is non-negative (rebates applied per route afterwards), and an input check now rejects negative weights before Dijkstra runs. A nightly job compares a sample of routes with Bellman-Ford." }
      ] }
  ],

  takeaways: [
    "The weights choose the algorithm: **BFS, 0-1 BFS, Dijkstra, Bellman-Ford**.",
    "heapq has no decrease-key: **push duplicates and skip stale entries** on pop.",
    "Measured: heap Dijkstra **2.4 ms** against **176 ms** for the O(V²) scan on 2,000 vertices.",
    "Negative edges make Dijkstra **wrong without an error**: 3 instead of 2 in the example.",
    "Bellman-Ford looks cheap on random graphs; its **worst case** on a 2,000-vertex chain was 110× slower than Dijkstra.",
    "A further improvement after V − 1 passes means a **negative cycle**.",
    "0 or 1 weights: a **deque** replaces the heap, O(V + E).",
    "Store **parents** when distances improve, and verify the path, not only the cost.",
    "Most hard path problems are **shortest paths over a constructed state**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why does Dijkstra with heapq skip entries where d > dist[u]?",
        options: [
          "They are stale duplicates",
          "They mark negative edges",
          "They are unreachable vertices",
          "They break ties between equal paths"
        ],
        answer: 0,
        why: "Without decrease-key, improved distances are pushed again, leaving older, larger entries in the heap; skipping them avoids redundant work. They say nothing about negative edges, reachability or ties." },
      { stem: "All edge weights are 0 or 1. The best choice is…",
        options: [
          "Bellman-Ford over all of the edges",
          "0-1 BFS with a deque",
          "Plain BFS, ignoring the weights",
          "Floyd-Warshall on the graph"
        ],
        answer: 1,
        why: "A deque with 0-edges at the front keeps vertices in distance order in O(V + E). Plain BFS ignores the zero costs and is wrong; Bellman-Ford and Floyd-Warshall are correct but far slower." },
      { stem: "Bellman-Ford still finds an improvement after V − 1 passes. This means…",
        options: [
          "It needs a few more passes",
          "A reachable negative cycle",
          "The graph is disconnected",
          "There is a zero-weight edge"
        ],
        answer: 1,
        why: "A shortest simple path has at most V − 1 edges, so any further improvement can only come from a cycle with negative total weight. More passes would never stop improving." },
      { stem: "Why did Bellman-Ford finish in 4 ms on a random graph but 181 ms on a chain?",
        options: [
          "The chain had many more edges",
          "Random graphs have short-hop paths",
          "Python had cached the random graph",
          "The chain had negative weights"
        ],
        answer: 1,
        why: "With the early exit, the number of passes equals the hops in the longest shortest path. Random shortcuts keep that small; a chain needs V − 1 passes. The chain had fewer edges, all positive." }
    ] },

  interview: { title: "In an interview",
    sub: "Ask about the weights before you write a line.",
    questions: [
      { level: "core",
        q: "Find the shortest path in a weighted graph.",
        strong: "A strong answer asks about the weights, writes Dijkstra with lazy deletion, and reconstructs the path.",
        answer: [
          { t: "p",
            text: "I would first ask whether weights can be negative. If not, Dijkstra with a min-heap of (distance, vertex): pop, skip if stale, relax neighbours, record parents. O(E log V). If weights are all equal, BFS; if 0 or 1, a deque. If negative weights are possible, Bellman-Ford in O(V·E), which also detects negative cycles." }
        ] },
      { level: "advanced",
        q: "Why does Dijkstra fail with negative edges?",
        strong: "A strong answer names the greedy invariant and gives a small counterexample.",
        answer: [
          { t: "p",
            text: "Dijkstra assumes that when it settles the closest vertex, no other path can make it closer later, because any detour only adds non-negative cost. A negative edge breaks that: A→B costs 1, A→C costs 4, C→B costs −4. B is settled at 1, then C reveals a path to B of cost 0, and anything computed from B is wrong." }
        ] },
      { level: "advanced",
        q: "Find the cheapest flight with at most k stops.",
        strong: "A strong answer adds stops to the state and picks an algorithm accordingly.",
        answer: [
          { t: "p",
            text: "The stop limit makes plain Dijkstra on cities wrong, since a cheaper path with too many stops can block a valid one. Either run Bellman-Ford for k + 1 rounds, relaxing from a copy of the previous round's distances so each round adds one edge, in O(k·E); or run Dijkstra on states (city, stops used). Both are standard; the first is simpler to get right." }
        ] }
    ] }
});

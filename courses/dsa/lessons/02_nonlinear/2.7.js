/* ============================================================================
   LESSON 2.7 — Minimum Spanning Trees
   ========================================================================= */
EC.receiveLesson({
  id: "2.7",

  lede: "A minimum spanning tree connects every vertex of a weighted graph with the least total edge weight. Two greedy algorithms find it, and **both are correct for the same reason, the cut property: the cheapest edge crossing any division of the vertices belongs to some MST.** Kruskal takes edges cheapest first and skips those that close a cycle, using union-find. Prim grows one tree from a vertex with a heap. This lesson checks both against every spanning tree of small graphs, times them on sparse and dense graphs, and uses an MST that stops early to cluster points.",

  objectives: [
    "Implement Kruskal with union-find and Prim with heapq",
    "State the cut property and use it to argue the greedy choice is safe",
    "Distinguish a minimum spanning tree from a shortest-path tree",
    "Choose between Kruskal and Prim by graph density, measured",
    "Use Kruskal stopped at k components for max-spacing clustering"
  ],

  prerequisites: ["2.3", "2.4"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "greedy",
      text: "Two greedy algorithms",
      sub: "Cheapest edge first, or grow one tree" },
    { t: "p",
      text: "Kruskal sorts the edges by weight and adds each one unless both ends are already connected, which union-find answers in effectively constant time; it stops after n − 1 edges. Prim starts from any vertex and repeatedly adds the cheapest edge leaving the tree, keeping candidate edges in a heap with the same lazy-deletion trick as Dijkstra (2.3). The figure is Kruskal's output on a seven-vertex graph, weights proportional to distance: total 105." },
    { t: "viz",
      title: "A minimum spanning tree",
      caption: "Solid green edges are the 6 edges Kruskal kept, total weight 105; dashed edges were skipped because their ends were already connected by cheaper edges.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="60" y1="150" x2="200" y2="50" style="stroke:var(--good);stroke-width:3.2"/>
<text x="138" y="115" text-anchor="middle" class="s-sub" style="fill:var(--good)">17</text>
<line x1="60" y1="150" x2="220" y2="230" style="stroke:var(--good);stroke-width:3.2"/>
<text x="134" y="206" text-anchor="middle" class="s-sub" style="fill:var(--good)">18</text>
<line x1="200" y1="50" x2="220" y2="230" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="197" y="145" text-anchor="middle" class="s-sub">18</text>
<line x1="200" y1="50" x2="370" y2="130" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="279" y="106" text-anchor="middle" class="s-sub">19</text>
<line x1="220" y1="230" x2="370" y2="130" style="stroke:var(--good);stroke-width:3.2"/>
<text x="302" y="195" text-anchor="middle" class="s-sub" style="fill:var(--good)">18</text>
<line x1="370" y1="130" x2="520" y2="40" style="stroke:var(--good);stroke-width:3.2"/>
<text x="452" y="100" text-anchor="middle" class="s-sub" style="fill:var(--good)">17</text>
<line x1="370" y1="130" x2="540" y2="220" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="449" y="190" text-anchor="middle" class="s-sub">19</text>
<line x1="520" y1="40" x2="540" y2="220" style="stroke:var(--good);stroke-width:3.2"/>
<text x="517" y="135" text-anchor="middle" class="s-sub" style="fill:var(--good)">18</text>
<line x1="520" y1="40" x2="690" y2="130" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="599" y="100" text-anchor="middle" class="s-sub">19</text>
<line x1="540" y1="220" x2="690" y2="130" style="stroke:var(--good);stroke-width:3.2"/>
<text x="622" y="190" text-anchor="middle" class="s-sub" style="fill:var(--good)">17</text>
<line x1="220" y1="230" x2="540" y2="220" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="380" y="242" text-anchor="middle" class="s-sub">32</text>
<line x1="200" y1="50" x2="520" y2="40" style="stroke:var(--line);stroke-width:1.4;stroke-dasharray:5 4"/>
<text x="360" y="62" text-anchor="middle" class="s-sub">32</text>
<circle cx="60" cy="150" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="60" y="155" text-anchor="middle" class="s-label">0</text>
<circle cx="200" cy="50" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="200" y="55" text-anchor="middle" class="s-label">1</text>
<circle cx="220" cy="230" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="220" y="235" text-anchor="middle" class="s-label">2</text>
<circle cx="370" cy="130" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="370" y="135" text-anchor="middle" class="s-label">3</text>
<circle cx="520" cy="40" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="520" y="45" text-anchor="middle" class="s-label">4</text>
<circle cx="540" cy="220" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="540" y="225" text-anchor="middle" class="s-label">5</text>
<circle cx="690" cy="130" r="17" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.6"/>
<text x="690" y="135" text-anchor="middle" class="s-label">6</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "mst.py — Kruskal and Prim against brute force, a counterexample, and timings by density",
      code: `import heapq, itertools, math, random, time

class DSU:
    def __init__(self, n): self.p = list(range(n)); self.s = [1] * n
    def find(self, x):
        while self.p[x] != x: self.p[x] = self.p[self.p[x]]; x = self.p[x]
        return x
    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b: return False
        if self.s[a] < self.s[b]: a, b = b, a
        self.p[b] = a; self.s[a] += self.s[b]; return True

def kruskal(n, edges):                            # cheapest edges first, skipping any that would close a cycle
    d, total, used = DSU(n), 0, []
    for w, u, v in sorted(edges):
        if d.union(u, v):
            total += w; used.append((u, v, w))
            if len(used) == n - 1: break
    return total if len(used) == n - 1 else None, used

def prim(n, adj):                                 # grow one tree from vertex 0, always taking the cheapest edge leaving it
    seen, total, pq, count = [False] * n, 0, [(0, 0)], 0
    while pq and count < n:
        w, u = heapq.heappop(pq)
        if seen[u]: continue                      # a stale entry for a vertex already in the tree
        seen[u] = True; total += w; count += 1
        for v, wv in adj[u]:
            if not seen[v]: heapq.heappush(pq, (wv, v))
    return total if count == n else None

def mst_brute(n, edges):                          # try every set of n - 1 edges
    best = None
    for combo in itertools.combinations(edges, n - 1):
        d = DSU(n)
        if all(d.union(u, v) for _, u, v in combo):
            w = sum(e[0] for e in combo); best = w if best is None else min(best, w)
    return best

def random_connected(n, m, rnd):
    edges = [(rnd.randint(1, 100), i, rnd.randrange(i)) for i in range(1, n)]          # a random tree, so it is connected
    edges += [(rnd.randint(1, 100), *rnd.sample(range(n), 2)) for _ in range(m - (n - 1))]
    adj = [[] for _ in range(n)]
    for w, u, v in edges: adj[u].append((v, w)); adj[v].append((u, w))
    return edges, adj

rnd = random.Random(28)
for _ in range(200):
    n = rnd.randint(2, 7); edges, adj = random_connected(n, rnd.randint(n - 1, 12), rnd)
    assert kruskal(n, edges)[0] == prim(n, adj) == mst_brute(n, edges)
print("200 small graphs: Kruskal = Prim = brute force over every spanning tree")
print("disconnected graph: Kruskal returns", kruskal(4, [(1, 0, 1), (2, 2, 3)])[0], "(no spanning tree exists)")

# The shortest-path tree from one vertex is not the MST.
def shortest_path_tree(n, adj, src):             # Dijkstra, keeping the edge that last improved each vertex
    dist, parent, pq = {src: 0}, {}, [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        for v, w in adj[u]:
            if d + w < dist.get(v, math.inf): dist[v] = d + w; parent[v] = (u, v, w); heapq.heappush(pq, (d + w, v))
    return sum(e[2] for e in parent.values()), sorted(parent.values())
tri = [(2, 0, 1), (2, 0, 2), (1, 1, 2)]
tadj = [[] for _ in range(3)]
for w, u, v in tri: tadj[u].append((v, w)); tadj[v].append((u, w))
print("triangle 0-1:2, 0-2:2, 1-2:1 -> MST", kruskal(3, tri), " shortest-path tree from 0", shortest_path_tree(3, tadj, 0))

print(f"\\n{'V':>7}{'E':>10}{'Kruskal ms':>12}{'Prim ms':>10}")
for n, m in ((20_000, 60_000), (20_000, 600_000), (2_000, 1_999_000)):
    if m == n * (n - 1) // 2:                     # complete graph
        edges = [(rnd.randint(1, 10**6), u, v) for u in range(n) for v in range(u)]
        adj = [[] for _ in range(n)]
        for w, u, v in edges: adj[u].append((v, w)); adj[v].append((u, w))
    else:
        edges, adj = random_connected(n, m, rnd)
    t = time.perf_counter(); a = kruskal(n, edges)[0]; tk = time.perf_counter() - t
    t = time.perf_counter(); b = prim(n, adj); tp = time.perf_counter() - t
    assert a == b
    print(f"{n:>7,}{m:>10,}{tk * 1000:>12.0f}{tp * 1000:>10.0f}")`,
      out: `200 small graphs: Kruskal = Prim = brute force over every spanning tree
disconnected graph: Kruskal returns None (no spanning tree exists)
triangle 0-1:2, 0-2:2, 1-2:1 -> MST (3, [(1, 2, 1), (0, 1, 2)])  shortest-path tree from 0 (4, [(0, 1, 2), (0, 2, 2)])

      V         E  Kruskal ms   Prim ms
 20,000    60,000          61        69
 20,000   600,000         642       636
  2,000 1,999,000        1772      1107` },
    { t: "callout",
      kind: "insight",
      title: "Why greedy is safe here: the cut property",
      body: [
        { t: "p",
          text: "Split the vertices into any two groups. The cheapest edge crossing between them is in some minimum spanning tree: if a tree used a more expensive crossing edge instead, swapping it for the cheapest one keeps the tree connected and does not increase its weight. Each Kruskal or Prim step adds exactly such an edge, for the cut between the current component and the rest. This exchange argument is the template for proving greedy algorithms (3.7)." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "The MST is not the tree of shortest paths",
      body: [
        { t: "p",
          text: "On the triangle with 0–1 and 0–2 of weight 2 and 1–2 of weight 1, the MST weighs 3 and routes 0 to 2 through 1 at cost 3. The shortest-path tree from 0 weighs 4 but reaches 2 at cost 2. A network built as an MST minimises cabling, not latency from the root; pick the objective before the algorithm." }
      ] },
    { t: "ladder",
      title: "Minimum spanning tree",
      rungs: [
        { level: "bad",
          label: "Try every set of n − 1 edges",
          why: "Exponential: the number of spanning trees grows explosively with n. Used here only as the oracle for 7 vertices.",
          code: `def mst_brute(n, edges):                          # try every set of n - 1 edges
    best = None
    for combo in itertools.combinations(edges, n - 1):
        d = DSU(n)
        if all(d.union(u, v) for _, u, v in combo):
            w = sum(e[0] for e in combo); best = w if best is None else min(best, w)
    return best`,
          note: "Agreement with this on 200 graphs is what justifies trusting the fast versions." },
        { level: "ok",
          label: "Prim with a heap",
          why: "O(E log V). Faster on the complete graph, 1,107 ms against 1,772, because it never sorts all two million edges.",
          code: `def prim(n, adj):                                 # grow one tree from vertex 0, always taking the cheapest edge leaving it
    seen, total, pq, count = [False] * n, 0, [(0, 0)], 0
    while pq and count < n:
        w, u = heapq.heappop(pq)
        if seen[u]: continue                      # a stale entry for a vertex already in the tree
        seen[u] = True; total += w; count += 1
        for v, wv in adj[u]:
            if not seen[v]: heapq.heappush(pq, (wv, v))
    return total if count == n else None`,
          note: "Needs an adjacency list; for a dense graph given as a matrix, the O(V²) array version avoids the heap." },
        { level: "best",
          label: "Kruskal with union-find",
          why: "O(E log E) for the sort, then near-linear. Equal to Prim on sparse graphs, and it works directly on an edge list.",
          code: `def kruskal(n, edges):                            # cheapest edges first, skipping any that would close a cycle
    d, total, used = DSU(n), 0, []
    for w, u, v in sorted(edges):
        if d.union(u, v):
            total += w; used.append((u, v, w))
            if len(used) == n - 1: break
    return total if len(used) == n - 1 else None, used`,
          note: "Stopping early gives clustering (section 3) and detects disconnection: fewer than n − 1 edges." }
      ] },
    { t: "h2",
      n: "02",
      id: "density",
      text: "Which one, measured",
      sub: "Sorting edges against heap operations" },
    { t: "dl",
      items: [
        [
          "Sparse graphs: a draw",
          "20,000 vertices and 60,000 edges: Kruskal 61 ms, Prim 69 ms. With 600,000 edges: 642 ms and 636 ms."
        ],
        [
          "Complete graphs: Prim",
          "2,000 vertices and 1,999,000 edges: Kruskal 1,772 ms, Prim 1,107 ms. Kruskal sorts every edge; Prim's heap holds only edges leaving the current tree."
        ],
        [
          "Disconnected graphs",
          "Kruskal returned None for a graph with two components; it found fewer than n − 1 edges. A minimum spanning forest is the same loop without the check."
        ]
      ] },
    { t: "table",
      head: ["Situation", "Use"],
      rows: [
        ["Edge list, sparse graph", "Kruskal"],
        ["Adjacency list, dense graph", "Prim with a heap"],
        ["Complete graph given implicitly (points)", "Prim with an O(V²) array, no edge list at all"],
        ["k clusters with maximum spacing", "Kruskal, stopped at k components"],
        ["Edges arrive over time", "Union-find connectivity; MST needs more (dynamic trees)"]
      ] },
    { t: "h2",
      n: "03",
      id: "cluster",
      text: "Stopping early: clustering",
      sub: "The k − 1 most expensive tree edges are the gaps" },
    { t: "p",
      text: "Kruskal merges the closest pair of groups at every step, which is single-linkage clustering. Stop when k components remain and the groups have the largest possible spacing, the smallest distance between points in different groups, and the spacing equals the next edge Kruskal would have taken. The proof is the cut property again." },
    { t: "exercise",
      kind: "Challenge",
      title: "Max-spacing clustering",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Split a set of points into k groups so that the minimum distance between two points in different groups is as large as possible. Use Kruskal over all pairwise distances, stopped at k components, and check the result against trying every assignment of points to k groups on small inputs." }
      ],
      requirements: [
        "Kruskal over the complete graph of pairwise distances",
        "Stop when k components remain, and report the spacing",
        "The reported spacing equals the actual minimum distance across groups",
        "Agreement with brute force over every k-way split, up to 7 points"
      ],
      hint: "The spacing is the weight of the first edge, after you stop, whose ends are in different components.",
      solution: { lang: "python",
        title: "cluster.py",
        code: `import itertools, math, random

class DSU:
    def __init__(self, n): self.p = list(range(n))
    def find(self, x):
        while self.p[x] != x: self.p[x] = self.p[self.p[x]]; x = self.p[x]
        return x
    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b: return False
        self.p[b] = a; return True

def cluster(points, k):
    """Split points into k groups maximising the spacing: the smallest distance between two points in different groups.
    Kruskal stopped at k components; the spacing is the next edge that would join two of them."""
    n = len(points)
    edges = sorted((math.dist(points[i], points[j]), i, j) for i in range(n) for j in range(i))
    d, comps = DSU(n), n
    for w, i, j in edges:
        if d.find(i) == d.find(j): continue
        if comps == k: return w, [d.find(i) for i in range(n)]
        d.union(i, j); comps -= 1
    return math.inf, [d.find(i) for i in range(n)]

def spacing(points, labels):
    return min((math.dist(points[i], points[j]) for i in range(len(points)) for j in range(i) if labels[i] != labels[j]), default=math.inf)

def cluster_brute(points, k):                       # every assignment of points to k labels, each label used
    best = -1
    for labels in itertools.product(range(k), repeat=len(points)):
        if len(set(labels)) == k: best = max(best, spacing(points, labels))
    return best

rnd = random.Random(29)
for _ in range(150):
    n = rnd.randint(2, 7); k = rnd.randint(1, n)
    pts = [(rnd.randint(0, 50), rnd.randint(0, 50)) for _ in range(n)]
    w, labels = cluster(pts, k)
    assert len(set(labels)) == k
    if k > 1: assert math.isclose(spacing(pts, labels), w) and math.isclose(w, cluster_brute(pts, k))
print("150 random point sets: Kruskal-stopped-early spacing equals the best over every k-way split")

blobs = [(cx + rnd.gauss(0, 1.5), cy + rnd.gauss(0, 1.5)) for cx, cy in ((10, 10), (40, 12), (25, 40)) for _ in range(30)]
w, labels = cluster(blobs, 3)
sizes = sorted(sum(l == r for l in labels) for r in set(labels))
print(f"three blobs of 30 points: groups of {sizes}, spacing {w:.1f}")`,
        out: `150 random point sets: Kruskal-stopped-early spacing equals the best over every k-way split
three blobs of 30 points: groups of [30, 30, 30], spacing 23.4`,
        notes: [
          { t: "p",
            text: "On 150 random point sets the stopped Kruskal matched the best spacing over every split. On three blobs of 30 points it recovered the blobs exactly, with a spacing of 23.4." },
          { t: "p",
            text: "Single linkage is sensitive to chains: one line of points bridging two blobs merges them. That is a property of the objective, not of the algorithm, and is why k-means or density-based methods are often preferred for real data." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the fibre plan that was cheap and slow",
      body: [
        { t: "p",
          text: "**Symptom.** A planned fibre network connecting 40 sites came in under budget, but simulated latency from the data centre to the farthest sites was three times the requirement." },
        { t: "p",
          text: "**Mechanism.** The planning script built a minimum spanning tree of trench costs, which minimises total cable. Some sites were reached through long chains of other sites." },
        { t: "p",
          text: "**Fix.** The requirement was restated as a latency bound per site, and the plan became the MST plus the cheapest extra links that brought each site's shortest-path distance under it, checked with Dijkstra from the data centre." }
      ] }
  ],

  takeaways: [
    "A minimum spanning tree connects all vertices at **least total weight**.",
    "**Kruskal**: sort edges, add unless union-find says they are connected.",
    "**Prim**: grow one tree with a heap of edges leaving it.",
    "Both are correct by the **cut property**, an exchange argument.",
    "Checked against **every spanning tree** on 200 small graphs.",
    "Sparse graphs were a draw; on a complete graph **Prim was faster**, 1,107 ms against 1,772.",
    "An MST is **not a shortest-path tree**: 3 against 4 in total weight, but a longer route to vertex 2.",
    "Kruskal stopped at **k components** gives max-spacing clustering."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why is it safe for Kruskal to take the cheapest remaining edge?",
        options: [
          "The edges are sorted, so it must be",
          "The cut property puts it in an MST",
          "Union-find guarantees that it is",
          "The input graph has no cycles"
        ],
        answer: 1,
        why: "The cheapest edge crossing a cut is in some minimum spanning tree, by the exchange argument. Sorting and union-find implement the choice; neither proves it, and the input graph usually has cycles." },
      { stem: "Kruskal finishes with fewer than n − 1 edges. Why?",
        options: [
          "Some weights are negative",
          "The graph is disconnected",
          "Two edges have equal weight",
          "The sort is not stable"
        ],
        answer: 1,
        why: "A spanning tree needs n − 1 edges, which exist only if the graph is connected. Negative or equal weights and sort stability do not stop it." },
      { stem: "On the complete graph, why was Prim faster than Kruskal?",
        options: [
          "It is asymptotically far better",
          "Kruskal sorts every edge first",
          "Prim uses less recursion",
          "Union-find is slow in Python"
        ],
        answer: 1,
        why: "Kruskal's cost is dominated by sorting all 2 million edges; Prim pushes only edges leaving the tree. Both are O(E log V) here, neither recurses, and union-find was cheap." },
      { stem: "You need the lowest latency from one hub to every site. Use…",
        options: [
          "A minimum spanning tree of the sites",
          "Dijkstra's shortest-path tree",
          "Kruskal, stopped early",
          "A topological order of sites"
        ],
        answer: 1,
        why: "Latency from a source is a shortest-path question; an MST minimises total weight and can route sites through long chains. Topological order does not apply to an undirected network." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the cut property when you claim greedy works.",
    questions: [
      { level: "core",
        q: "Connect all cities with the least total road cost.",
        strong: "A strong answer picks Kruskal or Prim, gives the cost, and handles disconnection.",
        answer: [
          { t: "p",
            text: "A minimum spanning tree. With an edge list, Kruskal: sort by cost, union-find to skip edges that close a cycle, stop at n − 1 edges, O(E log E). With an adjacency list and a dense graph, Prim with a heap. If fewer than n − 1 edges are taken, the cities cannot all be connected and I would report that." }
        ] },
      { level: "advanced",
        q: "Prove that Kruskal's algorithm is correct.",
        strong: "A strong answer gives the cut property and the exchange argument.",
        answer: [
          { t: "p",
            text: "When Kruskal adds edge e = (u, v), u and v are in different components; take the cut between u's component and the rest. Every cheaper edge was already considered and either added or skipped as internal, so e is the cheapest edge crossing that cut. If an optimal tree T did not contain e, adding e to T creates a cycle that crosses the cut again at some edge f with weight at least w(e); T + e − f is a spanning tree no heavier than T. Repeating the argument shows Kruskal's tree is optimal." }
        ] },
      { level: "core",
        q: "When is an MST the wrong tool?",
        strong: "A strong answer separates total cost from per-path cost and fault tolerance.",
        answer: [
          { t: "p",
            text: "When the objective is not total weight: latency or distance from a root needs a shortest-path tree; fault tolerance needs redundancy, which a tree by definition has none of; and directed graphs need a minimum arborescence, a different algorithm. An MST is right for one-off total-cost connection problems and as a building block, as in clustering and approximation algorithms." }
        ] }
    ] }
});

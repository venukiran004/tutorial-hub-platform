/* ============================================================================
   LESSON 2.4 — Union-Find
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "Union-find answers one question, \"are these two in the same group?\", while groups keep merging. Each element points at a parent, and the root of its tree names its group. **Two small rules, hang the smaller tree under the larger and flatten paths as you walk them, make both operations effectively constant time.** Without them, the same structure degrades into a linked list. This lesson measures exactly that, then uses union-find for the problem it is best at: connectivity that changes online.",

  objectives: [
    "Implement find and union with parent pointers",
    "Add union by size and path compression, and measure what each prevents",
    "Count components and detect cycles in an undirected graph",
    "Choose between union-find and BFS for static and changing graphs",
    "Maintain a component count as elements are added online"
  ],

  prerequisites: ["2.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "structure",
      text: "Parent pointers and roots",
      sub: "find walks up, union links roots" },
    { t: "p",
      text: "Each element starts as its own root. find(x) follows parent pointers to the root. union(a, b) finds both roots and, if they differ, points one at the other. Two elements are connected exactly when their roots are equal. That is the entire structure; everything else is about keeping the trees shallow." },
    { t: "viz",
      title: "Same unions, different trees",
      caption: "Four unions in sequence, (0, 1), (1, 2), (2, 3), (3, 4), drawn from the parent arrays each structure produced. Left: without balancing, a chain of depth 4, so find(0) walks every node. Right: with union by size, each new element hangs under the larger tree's root, so every element is one step from the root.",
      svg: `<svg viewBox="0 0 760 380" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="85.0" y1="328.0" x2="85.0" y2="300.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="85.0" y1="248.0" x2="85.0" y2="220.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="85.0" y1="168.0" x2="85.0" y2="140.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="85.0" y1="88.0" x2="85.0" y2="60.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="402.3" y1="250.0" x2="527.7" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="496.0" y1="250.0" x2="539.0" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="589.6" y1="250.0" x2="550.4" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="683.2" y1="250.0" x2="561.8" y2="62.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="40" y="328" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="350" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">0</text>
<rect x="40" y="248" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="270" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">1</text>
<rect x="40" y="168" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="190" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">2</text>
<rect x="40" y="88" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="110" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">3</text>
<rect x="40" y="8" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="85.0" y="30" text-anchor="middle" class="s-label" style="fill:var(--crit)">4</text>
<text x="85.0" y="48" text-anchor="middle" class="s-sub">root</text>
<rect x="500" y="10" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="545.0" y="32" text-anchor="middle" class="s-label" style="fill:var(--good)">0</text>
<text x="545.0" y="50" text-anchor="middle" class="s-sub">root</text>
<rect x="340" y="250" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="385.0" y="272" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">1</text>
<rect x="445" y="250" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="490.0" y="272" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">2</text>
<rect x="550" y="250" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="595.0" y="272" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">3</text>
<rect x="655" y="250" width="90" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="700.0" y="272" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">4</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "uf.py — relabelling, plain quick-union and the balanced DSU, on random and adversarial inputs",
      code: `import random, time
from collections import defaultdict

class Relabel:                                    # every element stores its component label; union rewrites one whole component
    def __init__(self, n): self.label = list(range(n))
    def find(self, x): return self.label[x]
    def union(self, a, b):
        la, lb = self.label[a], self.label[b]
        if la == lb: return False
        self.label = [la if l == lb else l for l in self.label]   # O(n) per union
        return True

class QuickUnion:                                 # parent pointers, no balancing, no compression
    def __init__(self, n): self.parent = list(range(n)); self.steps = 0
    def find(self, x):
        while self.parent[x] != x: x = self.parent[x]; self.steps += 1
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False
        self.parent[ra] = rb; return True

class DSU:                                        # union by size + path compression (halving)
    def __init__(self, n): self.parent = list(range(n)); self.size = [1] * n; self.steps = 0
    def find(self, x):
        p = self.parent
        while p[x] != x:
            p[x] = p[p[x]]                        # point at the grandparent: halves the path as we walk it
            x = p[x]; self.steps += 1
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False
        if self.size[ra] < self.size[rb]: ra, rb = rb, ra
        self.parent[rb] = ra; self.size[ra] += self.size[rb]   # hang the smaller tree under the larger
        return True

def components_bfs(n, edges):                     # the alternative when the graph is static
    adj = defaultdict(list)
    for a, b in edges: adj[a].append(b); adj[b].append(a)
    seen, count = [False] * n, 0
    for s in range(n):
        if seen[s]: continue
        count += 1; stack = [s]; seen[s] = True
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]: seen[v] = True; stack.append(v)
    return count

# Correctness on random edge lists: the three structures and BFS agree on the component count.
rnd = random.Random(24)
for _ in range(300):
    n = rnd.randint(1, 40); edges = [(rnd.randrange(n), rnd.randrange(n)) for _ in range(rnd.randint(0, 50))]
    counts = []
    for cls in (Relabel, QuickUnion, DSU):
        s = cls(n); counts.append(n - sum(s.union(a, b) for a, b in edges))
    assert len(set(counts)) == 1 and counts[0] == components_bfs(n, edges)
print("300 random graphs: relabel, quick-union, DSU and BFS give the same component counts")

# Adversarial order: union(i, i+1) in sequence builds a chain for quick-union. Then query every element.
print(f"\\n{'n':>7}{'relabel ms':>12}{'quick-union ms':>16}{'DSU ms':>9}{'QU steps/find':>15}{'DSU steps/find':>16}")
for n in (2_000, 4_000, 8_000, 200_000):
    ops = [(i, i + 1) for i in range(n - 1)]
    row = []
    for cls in (Relabel, QuickUnion, DSU):
        if (cls is not DSU) and n > 8_000: row.append(None); continue
        s = cls(n); t = time.perf_counter()
        for a, b in ops: s.union(a, b)
        if hasattr(s, "steps"): s.steps = 0
        for x in range(n): s.find(x)
        row.append(((time.perf_counter() - t) * 1000, getattr(s, "steps", 0) / n))
    f = lambda r, k: "skipped" if r is None else (f"{r[0]:.0f}" if k == 0 else f"{r[1]:.1f}")
    print(f"{n:>7,}{f(row[0], 0):>12}{f(row[1], 0):>16}{f(row[2], 0):>9}{f(row[1], 1):>15}{f(row[2], 1):>16}")

n = 200_000; edges = [(rnd.randrange(n), rnd.randrange(n)) for _ in range(150_000)]
t = time.perf_counter(); d = DSU(n); c1 = n - sum(d.union(a, b) for a, b in edges); tu = time.perf_counter() - t
t = time.perf_counter(); c2 = components_bfs(n, edges); tb = time.perf_counter() - t
assert c1 == c2
print(f"\\nstatic graph, 200,000 vertices and 150,000 random edges: DSU {tu * 1000:.0f} ms, BFS {tb * 1000:.0f} ms, {c1:,} components")`,
      out: `300 random graphs: relabel, quick-union, DSU and BFS give the same component counts

      n  relabel ms  quick-union ms   DSU ms  QU steps/find  DSU steps/find
  2,000          91             121        1          999.5             1.0
  4,000         395             502        2         1999.5             1.0
  8,000        1462            2044        8         3999.5             1.0
200,000     skipped         skipped      140        skipped             1.0

static graph, 200,000 vertices and 150,000 random edges: DSU 143 ms, BFS 274 ms, 57,405 components` },
    { t: "dl",
      items: [
        [
          "Quick-union degrades into a list",
          "Chained unions made the tree a path: an average find walked 3,999.5 steps at 8,000 elements, and the run took 2,044 ms, growing 4× per doubling."
        ],
        [
          "The balanced version stays flat",
          "With union by size and path halving, finds averaged 1.0 step at every size; 200,000 elements took 140 ms."
        ],
        [
          "Relabelling is quadratic too",
          "Rewriting a whole component's labels on each union took 1,462 ms at 8,000 elements. Its finds are O(1), but unions are O(n)."
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Path compression alone, or union by size alone, is not the textbook bound",
      body: [
        { t: "p",
          text: "Each rule on its own gives O(log n) amortised. Together they give O(α(n)), the inverse Ackermann function, which is at most 4 for any input that fits in memory. Implementations that skip union by size because \"compression flattens it anyway\" still pay for the first walk down every long chain." }
      ] },
    { t: "ladder",
      title: "Disjoint sets",
      rungs: [
        { level: "bad",
          label: "Relabel the whole component on union",
          why: "find is O(1) but union is O(n), so n unions cost O(n²).",
          code: `def union(self, a, b):
    la, lb = self.label[a], self.label[b]
    if la == lb: return False
    self.label = [la if l == lb else l for l in self.label]   # O(n) per union
    return True`,
          note: "Simple, and fine when unions are rare and queries frequent." },
        { level: "ok",
          label: "Parent pointers, no balancing",
          why: "union is cheap, but trees can become chains, so find is O(n) in the worst case: 3,999.5 steps at 8,000 elements.",
          code: `def find(self, x):
    while self.parent[x] != x: x = self.parent[x]; self.steps += 1
    return x

def union(self, a, b):
    ra, rb = self.find(a), self.find(b)
    if ra == rb: return False
    self.parent[ra] = rb; return True`,
          note: "Random inputs often look fine; sorted or sequential inputs do not." },
        { level: "best",
          label: "Union by size and path halving",
          why: "Amortised O(α(n)), effectively constant: 1.0 step per find at 200,000 elements.",
          code: `def find(self, x):
    p = self.parent
    while p[x] != x:
        p[x] = p[p[x]]                        # point at the grandparent: halves the path as we walk it
        x = p[x]; self.steps += 1
    return x

def union(self, a, b):
    ra, rb = self.find(a), self.find(b)
    if ra == rb: return False
    if self.size[ra] < self.size[rb]: ra, rb = rb, ra
    self.parent[rb] = ra; self.size[ra] += self.size[rb]   # hang the smaller tree under the larger
    return True`,
          note: "Iterative halving avoids the recursion limit that a recursive compressing find would hit on a long chain." }
      ] },
    { t: "h2",
      n: "02",
      id: "uses",
      text: "What it is for",
      sub: "Components, cycles, and connectivity over time" },
    { t: "table",
      head: ["Problem", "How union-find answers it"],
      rows: [
        ["Number of connected components", "n minus the number of successful unions"],
        ["Does this undirected edge close a cycle?", "union returns False: both ends already connected"],
        ["Minimum spanning tree (Kruskal, 2.7)", "Take edges by weight, skip those that close a cycle"],
        ["Groups that merge over time", "One union per event, a find per query"],
        ["Accounts or records sharing any identifier", "Union records through each shared key"],
        ["Directed reachability", "Not this: union-find has no direction; use BFS or DFS"]
      ] },
    { t: "p",
      text: "On a static graph, BFS and union-find both count components in near-linear time; here, on 200,000 vertices and 150,000 edges, union-find took 143 ms and an iterative BFS 274 ms. The difference that matters is not speed but that union-find accepts edges one at a time and answers queries in between, without recomputing anything." },
    { t: "callout",
      kind: "insight",
      title: "Union returns whether it merged",
      body: [
        { t: "p",
          text: "Having union return True or False costs nothing and answers two questions directly: the component count is n minus the number of True results, and a False result on an undirected edge is a cycle." }
      ] },
    { t: "h2",
      n: "03",
      id: "online",
      text: "Connectivity that changes",
      sub: "Additions only, answered as they happen" },
    { t: "exercise",
      kind: "Challenge",
      title: "Islands, added one cell at a time",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "An empty R × C grid receives land one cell at a time, possibly at a cell that is already land. After each addition, report the number of islands (four-directional). Make each step close to O(1), and check against recounting with a flood fill after every step." }
      ],
      requirements: [
        "Union-find keyed by cell, created lazily when a cell becomes land",
        "Count +1 for new land, −1 for each successful union with a neighbour",
        "Repeated additions handled without changing the count",
        "Agreement with a full recount on 300 random sequences"
      ],
      hint: "Only successful unions reduce the count: two neighbours can already be in the same island through another path.",
      solution: { lang: "python",
        title: "islands_online.py",
        code: `import random, time

def islands_online(R, C, additions):
    """Land is added one cell at a time; report the number of islands after each addition. Union-find, near O(1) per step."""
    parent, size, out, count = {}, {}, [], 0
    def find(x):
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for r, c in additions:
        if (r, c) in parent: out.append(count); continue           # already land: nothing changes
        parent[r, c] = (r, c); size[r, c] = 1; count += 1
        for nb in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if nb in parent:
                a, b = find((r, c)), find(nb)
                if a != b:
                    if size[a] < size[b]: a, b = b, a
                    parent[b] = a; size[a] += size[b]; count -= 1    # two islands joined
        out.append(count)
    return out

def islands_recount(R, C, additions):                                 # recount with a flood fill after every addition
    land, out = set(), []
    for cell in additions:
        land.add(cell); seen, count = set(), 0
        for s in land:
            if s in seen: continue
            count += 1; stack = [s]; seen.add(s)
            while stack:
                r, c = stack.pop()
                for nb in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if nb in land and nb not in seen: seen.add(nb); stack.append(nb)
        out.append(count)
    return out

rnd = random.Random(42)
for _ in range(300):
    R, C = rnd.randint(1, 7), rnd.randint(1, 7)
    adds = [(rnd.randrange(R), rnd.randrange(C)) for _ in range(rnd.randint(1, 30))]   # repeats included on purpose
    assert islands_online(R, C, adds) == islands_recount(R, C, adds)
print("300 random sequences (with repeated cells) agree with recounting after every step")
print("3x3 example:", islands_online(3, 3, [(0, 0), (0, 2), (2, 1), (1, 1), (0, 1), (2, 2)]))

for R in (40, 80):
    adds = [(rnd.randrange(R), rnd.randrange(R)) for _ in range(R * R // 2)]
    t = time.perf_counter(); a = islands_online(R, R, adds); to = time.perf_counter() - t
    t = time.perf_counter(); b = islands_recount(R, R, adds); tr = time.perf_counter() - t
    assert a == b
    print(f"{R}x{R} grid, {len(adds):,} additions: union-find {to * 1000:.1f} ms, recount {tr * 1000:.0f} ms")`,
        out: `300 random sequences (with repeated cells) agree with recounting after every step
3x3 example: [1, 2, 3, 3, 1, 1]
40x40 grid, 800 additions: union-find 0.9 ms, recount 180 ms
80x80 grid, 3,200 additions: union-find 6.5 ms, recount 2811 ms`,
        notes: [
          { t: "p",
            text: "Union-find matched the recount on every sequence, including repeated cells. On an 80 × 80 grid with 3,200 additions it took 6.5 ms against 2,811 ms for recounting, and the gap grows with the grid, because each recount is O(land) and there is one per step." },
          { t: "p",
            text: "Union-find handles additions only. If land can also be removed, the usual approach is to process the events backwards, so removals become additions, when all events are known in advance." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the fraud-ring job that stopped finishing",
      body: [
        { t: "p",
          text: "**Symptom.** A nightly job grouping accounts that share a card, device or address went from 20 minutes to not finishing before the next run, after a new data source added several million device links." },
        { t: "p",
          text: "**Mechanism.** The grouping used a hand-written union-find without union by size, and the new links arrived sorted by device. Sorted unions built long chains, and every find walked them." },
        { t: "p",
          text: "**Fix.** Union by size and path halving. The job dropped to 9 minutes on the larger data, and a test now runs it on sorted input, the adversarial order for an unbalanced implementation." }
      ] }
  ],

  takeaways: [
    "Each element points at a **parent**; the root names the group.",
    "Without balancing, sequential unions build a **chain**: 3,999.5 steps per find at 8,000 elements.",
    "**Union by size plus path compression** gives effectively O(1): 1.0 step per find at 200,000.",
    "Use **iterative path halving** to avoid Python's recursion limit.",
    "Components = **n minus successful unions**; a failed union on an undirected edge is a **cycle**.",
    "On a static graph BFS works as well; union-find wins when **edges arrive over time**.",
    "Union-find has **no direction** and no deletion; for removals, process events backwards.",
    "Test with **sorted input**, the worst case for an unbalanced implementation."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did plain quick-union take 2,044 ms on 8,000 chained unions?",
        options: [
          "Each of its unions copies the whole array",
          "Its tree became a chain",
          "Python dictionaries are slow to index",
          "It recursed past the recursion limit"
        ],
        answer: 1,
        why: "Linking roots without balancing in sequential order produced a path, so each find walked thousands of steps. It uses a list, copies nothing, and is iterative." },
      { stem: "What does union by size do?",
        options: [
          "Puts the smaller root under the larger",
          "Sorts all of the elements before merging",
          "Merges only trees that have equal size",
          "Rebuilds the whole tree after each union"
        ],
        answer: 0,
        why: "Attaching the smaller root to the larger keeps depth O(log n), because an element's depth only grows when its tree at least doubles in size." },
      { stem: "union(a, b) returns False for an undirected edge (a, b). This means…",
        options: ["a or b does not exist", "The edge closes a cycle", "The graph is disconnected", "The union needs a retry"],
        answer: 1,
        why: "a and b were already connected, so adding the edge creates a second path between them: a cycle. It says nothing about the rest of the graph." },
      { stem: "Which problem is not a good fit for union-find?",
        options: [
          "Count connected components",
          "Detect cycles in an undirected graph",
          "Reachability in a directed graph",
          "Kruskal's spanning tree"
        ],
        answer: 2,
        why: "Union-find treats connections as symmetric, so it cannot represent one-way reachability. The other three are its standard uses." }
    ] },

  interview: { title: "In an interview",
    sub: "Write it in ten lines and name both optimisations.",
    questions: [
      { level: "core",
        q: "Implement union-find and give its complexity.",
        strong: "A strong answer includes both optimisations and the amortised bound.",
        answer: [
          { t: "p",
            text: "A parent array and a size array. find follows parents to the root, halving the path as it goes; union finds both roots and hangs the smaller under the larger, returning whether it merged. With both optimisations, a sequence of m operations costs O(m α(n)), effectively constant per operation. With neither, a find can be O(n)." }
        ] },
      { level: "core",
        q: "Count the connected components in an undirected graph. BFS or union-find?",
        strong: "A strong answer says both work and explains when each is better.",
        answer: [
          { t: "p",
            text: "Both are near-linear. BFS or DFS is natural with an adjacency list already built. Union-find is natural with an edge list, needs no adjacency structure, and keeps working if edges arrive over time: the count is n minus the successful unions, updated per edge. If edges can be deleted, neither is simple, and offline reversal or a dynamic connectivity structure is needed." }
        ] },
      { level: "advanced",
        q: "Merge user accounts that share any email address.",
        strong: "A strong answer maps the problem onto union-find over identifiers.",
        answer: [
          { t: "p",
            text: "Give each account an index; keep a dict from email to the first account seen with it; for each further account with that email, union the two. Then group accounts by root and collect their emails. That is O(total emails · α), and it handles chains where A shares with B and B with C but A and C share nothing." }
        ] }
    ] }
});

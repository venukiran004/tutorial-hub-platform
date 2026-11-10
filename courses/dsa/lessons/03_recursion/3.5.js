/* ============================================================================
   LESSON 3.5 — DP on Grids and Trees
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "Grids and trees are where DP state becomes a place: a cell, or a node with its subtree. **On a grid, each cell's answer comes from its neighbours above and to the left. On a tree, each node's answer comes from its children, computed in post-order.** Both are linear in the size of the structure once the state is right, and both have Python-specific failure modes: exponential recursion without a table, and recursion depth on deep trees. This lesson checks each against brute force and measures both failures.",

  objectives: [
    "Count paths and minimum costs on a grid with one row of state",
    "Find the largest square of 1s with a corner-based state",
    "Write tree DP as a pair of values per node: taken and not taken",
    "Run tree DP iteratively in post-order to avoid the recursion limit",
    "Combine the two best children for path problems that bend at a node"
  ],

  prerequisites: ["3.1", "2.1"],

  blocks: [
    { t: "h2", n: "01", id: "grid", text: "DP on grids", sub: "Above plus left, one row at a time" },
    { t: "p",
      text: "The number of right-and-down paths to a cell is the number to the cell above plus the number to the cell to its left, and zero on an obstacle. Filling row by row needs only one list, because ways[c] still holds the row above when it is read and ways[c − 1] already holds the current row. The figure is that list after each row of a small grid with three obstacles." },
    { t: "viz",
      title: "Counting paths around obstacles",
      caption: "Each row shows the ways list after processing that row; # marks an obstacle, where the count is reset to 0. The bottom-right cell holds the answer, 10 paths.",
      svg: `<svg viewBox="0 0 456 192" width="100%" role="img">
<text x="50" y="34.0" text-anchor="end" class="s-sub">row 0</text>
<rect x="60" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="81.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<rect x="106" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="127.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<rect x="152" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="173.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<rect x="198" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="219.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<rect x="244" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="265.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<rect x="290" y="12" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="311.0" y="34.0" text-anchor="middle" class="s-label">1</text>
<text x="50" y="78.0" text-anchor="end" class="s-sub">row 1</text>
<rect x="60" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="81.0" y="78.0" text-anchor="middle" class="s-label">1</text>
<rect x="106" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="127.0" y="78.0" text-anchor="middle" class="s-label">2</text>
<rect x="152" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="173.0" y="78.0" text-anchor="middle" class="s-label">#</text>
<rect x="198" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="219.0" y="78.0" text-anchor="middle" class="s-label">1</text>
<rect x="244" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="265.0" y="78.0" text-anchor="middle" class="s-label">2</text>
<rect x="290" y="56" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="311.0" y="78.0" text-anchor="middle" class="s-label">3</text>
<text x="50" y="122.0" text-anchor="end" class="s-sub">row 2</text>
<rect x="60" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="81.0" y="122.0" text-anchor="middle" class="s-label">1</text>
<rect x="106" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="127.0" y="122.0" text-anchor="middle" class="s-label">3</text>
<rect x="152" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="173.0" y="122.0" text-anchor="middle" class="s-label">3</text>
<rect x="198" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="219.0" y="122.0" text-anchor="middle" class="s-label">4</text>
<rect x="244" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="265.0" y="122.0" text-anchor="middle" class="s-label">#</text>
<rect x="290" y="100" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="311.0" y="122.0" text-anchor="middle" class="s-label">3</text>
<text x="50" y="166.0" text-anchor="end" class="s-sub">row 3</text>
<rect x="60" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="81.0" y="166.0" text-anchor="middle" class="s-label">1</text>
<rect x="106" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="127.0" y="166.0" text-anchor="middle" class="s-label">#</text>
<rect x="152" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="173.0" y="166.0" text-anchor="middle" class="s-label">3</text>
<rect x="198" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="219.0" y="166.0" text-anchor="middle" class="s-label">7</text>
<rect x="244" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="265.0" y="166.0" text-anchor="middle" class="s-label">7</text>
<rect x="290" y="144" width="42" height="34" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="311.0" y="166.0" text-anchor="middle" class="s-label" style="fill:var(--good)">10</text>
<text x="346" y="166.0" class="s-sub">10 paths</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "gridtree.py — grid paths, largest square and tree DP against brute force, with the recursion failure",
      code: `import itertools, random, sys, time

def paths_brute(g, r=0, c=0):                     # walk every right/down path
    R, C = len(g), len(g[0])
    if r >= R or c >= C or g[r][c] == "#": return 0
    if (r, c) == (R - 1, C - 1): return 1
    return paths_brute(g, r + 1, c) + paths_brute(g, r, c + 1)

def paths_dp(g):                                  # ways[c] for the current row: from above (same c) plus from the left
    C = len(g[0]); ways = [0] * C; ways[0] = 1
    for row in g:
        for c in range(C):
            if row[c] == "#": ways[c] = 0
            elif c: ways[c] += ways[c - 1]
    return ways[-1]

def largest_square_brute(g):
    R, C, best = len(g), len(g[0]), 0
    for r in range(R):
        for c in range(C):
            k = best + 1                          # only test sizes that would beat the best so far
            while r + k <= R and c + k <= C and all(g[i][j] == "1" for i in range(r, r + k) for j in range(c, c + k)):
                best = k; k += 1
    return best

def largest_square(g):                            # side[r][c] = largest all-1 square with bottom-right corner here
    R, C = len(g), len(g[0]); prev = [0] * (C + 1); best = 0
    for r in range(R):
        cur = [0] * (C + 1)
        for c in range(C):
            if g[r][c] == "1":
                cur[c + 1] = 1 + min(prev[c + 1], cur[c], prev[c]); best = max(best, cur[c + 1])
        prev = cur
    return best

def rob_brute(n, edges, val):                     # best total over sets with no two adjacent vertices
    best = 0
    for mask in range(1 << n):
        if all(not (mask >> u & 1 and mask >> v & 1) for u, v in edges):
            best = max(best, sum(val[i] for i in range(n) if mask >> i & 1))
    return best

def rob_recursive(n, edges, val):                 # (best with u taken, best with u skipped), post-order by recursion
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    def go(u, parent):
        take, skip = val[u], 0
        for v in adj[u]:
            if v != parent:
                t, s = go(v, u); take += s; skip += max(t, s)
        return take, skip
    return max(go(0, -1))

def rob_iterative(n, edges, val):                 # the same DP over an explicit post-order: no recursion depth
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    parent, order, stack = [-1] * n, [], [0]
    seen = [False] * n; seen[0] = True
    while stack:                                  # preorder; reversed, every child comes before its parent
        u = stack.pop(); order.append(u)
        for v in adj[u]:
            if not seen[v]: seen[v] = True; parent[v] = u; stack.append(v)
    take, skip = val[:], [0] * n
    for u in reversed(order):
        p = parent[u]
        if p >= 0: take[p] += skip[u]; skip[p] += max(take[u], skip[u])
    return max(take[0], skip[0])

def random_tree(n, rnd): return [(i, rnd.randrange(i)) for i in range(1, n)]

rnd = random.Random(35)
for _ in range(300):
    R, C = rnd.randint(1, 7), rnd.randint(1, 7)
    g = ["".join("#" if rnd.random() < 0.2 else "." for _ in range(C)) for _ in range(R)]
    assert paths_brute(g) == paths_dp(g)
    b = ["".join(rnd.choice("011") for _ in range(C)) for _ in range(R)]
    assert largest_square_brute(b) == largest_square(b)
    n = rnd.randint(1, 14); e = random_tree(n, rnd); v = [rnd.randint(1, 20) for _ in range(n)]
    assert rob_brute(n, e, v) == rob_recursive(n, e, v) == rob_iterative(n, e, v)
print("300 random cases each: grid paths, largest square and tree robbery all match brute force")

print(f"\\n{'grid':>7}{'brute paths ms':>16}{'DP ms':>8}   empty grid, right/down paths")
for k in (10, 12, 14, 1_000):
    g = ["." * k] * k
    t = time.perf_counter(); d = paths_dp(g); td = time.perf_counter() - t
    if k <= 14:
        t = time.perf_counter(); bp = paths_brute(g); tb = time.perf_counter() - t; assert bp == d
        print(f"{k:>4}x{k:<3}{tb * 1000:>15.0f}{td * 1000:>8.2f}   {d:,} paths")
    else: print(f"{k:>4}x{k:<3}{'skipped':>15}{td * 1000:>8.0f}   a {len(str(d))}-digit count, exact")

b = ["".join(rnd.choice("1111110") for _ in range(300)) for _ in range(300)]
t = time.perf_counter(); s1 = largest_square_brute(b); tb = time.perf_counter() - t
t = time.perf_counter(); s2 = largest_square(b); td = time.perf_counter() - t
assert s1 == s2
print(f"\\nlargest square of 1s in a 300x300 grid: brute {tb * 1000:.0f} ms, DP {td * 1000:.0f} ms, side {s1}")

n = 100_000; chain = [(i, i - 1) for i in range(1, n)]; vals = [rnd.randint(1, 100) for _ in range(n)]
try: rob_recursive(n, chain, vals); print("recursive tree DP on a 100,000-node path: ok")
except RecursionError: print(f"\\nrecursive tree DP on a 100,000-node path: RecursionError")
t = time.perf_counter(); r = rob_iterative(n, chain, vals); ti = time.perf_counter() - t
print(f"iterative post-order on the same tree: {ti * 1000:.0f} ms, best total {r:,}")`,
      out: `300 random cases each: grid paths, largest square and tree robbery all match brute force

   grid  brute paths ms   DP ms   empty grid, right/down paths
  10x10              41    0.01   48,620 paths
  12x12             593    0.02   705,432 paths
  14x14            8932    0.02   10,400,600 paths
1000x1000        skipped     107   a 600-digit count, exact

largest square of 1s in a 300x300 grid: brute 97 ms, DP 22 ms, side 7

recursive tree DP on a 100,000-node path: RecursionError
iterative post-order on the same tree: 61 ms, best total 2,959,740` },
    { t: "dl",
      items: [
        [
          "Brute force grows with the answer",
          "Enumerating paths took 41 ms, 593 ms and 8.9 s on empty 10×10, 12×12 and 14×14 grids; the DP took 0.02 ms, and 107 ms for 1000×1000, where the count has 600 digits."
        ],
        [
          "A pruned brute force can be competitive",
          "Largest square: the brute force that only tests sizes beating the best so far took 97 ms on 300×300, against 22 ms for the DP. Dense 1s or large squares would widen the gap."
        ],
        [
          "Tree recursion hits the limit",
          "The recursive tree DP raised RecursionError on a 100,000-node path; the same DP over an explicit post-order took 61 ms."
        ]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Choose the corner the state is anchored to",
      body: [
        { t: "p",
          text: "For the largest square, \"largest all-1 square whose bottom-right corner is here\" has a three-neighbour recurrence: one plus the minimum of above, left and diagonal. \"Largest square anywhere in the top-left region\" has no clean recurrence. Anchoring a state to a position is the usual trick that makes grid DP work." }
      ] },
    { t: "h2", n: "02", id: "tree", text: "DP on trees", sub: "Two values per node, children first" },
    { t: "p",
      text: "For \"pick nodes with the largest total, never two adjacent\", each node needs two numbers: the best for its subtree if it is taken (its value plus its children's not-taken values) and if it is not (the sum of each child's better option). Children must be finished before their parent, which is post-order. Recursion expresses that naturally and fails on deep trees; an explicit stack that records a preorder, then processes it reversed, gives the same order with no depth limit." },
    { t: "ladder",
      title: "Maximum-weight set with no two adjacent nodes in a tree",
      rungs: [
        { level: "bad",
          label: "Every subset of nodes",
          why: "O(2ⁿ · n): checked against the others on trees of up to 14 nodes.",
          code: `def rob_brute(n, edges, val):                     # best total over sets with no two adjacent vertices
    best = 0
    for mask in range(1 << n):
        if all(not (mask >> u & 1 and mask >> v & 1) for u, v in edges):
            best = max(best, sum(val[i] for i in range(n) if mask >> i & 1))
    return best`,
          note: "Exponential, and a useful oracle." },
        { level: "ok",
          label: "Recursive post-order with (take, skip)",
          why: "O(n), and the clearest statement of the recurrence.",
          code: `def rob_recursive(n, edges, val):                 # (best with u taken, best with u skipped), post-order by recursion
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    def go(u, parent):
        take, skip = val[u], 0
        for v in adj[u]:
            if v != parent:
                t, s = go(v, u); take += s; skip += max(t, s)
        return take, skip
    return max(go(0, -1))`,
          note: "RecursionError on a 100,000-node path." },
        { level: "best",
          label: "Iterative post-order",
          why: "O(n) with no recursion: 61 ms on the 100,000-node path.",
          code: `def rob_iterative(n, edges, val):                 # the same DP over an explicit post-order: no recursion depth
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    parent, order, stack = [-1] * n, [], [0]
    seen = [False] * n; seen[0] = True
    while stack:                                  # preorder; reversed, every child comes before its parent
        u = stack.pop(); order.append(u)
        for v in adj[u]:
            if not seen[v]: seen[v] = True; parent[v] = u; stack.append(v)
    take, skip = val[:], [0] * n
    for u in reversed(order):
        p = parent[u]
        if p >= 0: take[p] += skip[u]; skip[p] += max(take[u], skip[u])
    return max(take[0], skip[0])`,
          note: "Reversed preorder visits every child before its parent, which is all post-order DP needs." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "sys.setrecursionlimit is not a fix",
      body: [
        { t: "p",
          text: "Raising the limit lets deeper recursion start, but each Python frame also uses C stack, and a deep enough tree crashes the interpreter with a segmentation fault instead of raising an exception. On trees that can be deep, such as parsed data, organisational charts or linked comments, write the traversal iteratively." }
      ] },
    { t: "table",
      head: ["Problem", "State", "Combine"],
      rows: [
        ["Paths on a grid", "ways at a cell", "above + left"],
        ["Minimum path cost", "cost at a cell", "cell + min(above, left)"],
        ["Largest square of 1s", "side with corner here", "1 + min(above, left, diagonal)"],
        ["Max independent set on a tree", "(take, skip) per node", "take = val + Σ skip; skip = Σ max"],
        [
          "Tree diameter or max path sum",
          "best downward path per node",
          "best path bends at a node: two best children"
        ],
        ["Subtree sizes, sums, heights", "one value per node", "children combined in post-order"]
      ] },
    { t: "h2", n: "03", id: "bend", text: "Paths that bend at a node", sub: "Two best children" },
    { t: "p",
      text: "A path in a tree goes up to some highest node and down again. So for each node, compute the best path that starts at it and goes down (its value plus its best child's, if positive), and the best path that bends at it (its value plus its two best children's). The answer is the best bend over all nodes. This one pattern gives the diameter, the maximum path sum and the longest path with equal labels." },
    { t: "exercise",
      kind: "Challenge",
      title: "Maximum path sum in a tree",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Node values can be negative. Return the largest sum along any path of at least one node. Write it iteratively, check it against an all-pairs brute force on random trees, and run it on a 200,000-node tree that is long and thin." }
      ],
      requirements: [
        "Iterative post-order from a preorder stack",
        "Downward gains clipped at zero, so a bad subtree is simply not used",
        "The two best gains per node for the bend",
        "A single node as the answer when every value is negative"
      ],
      hint: "Initialise the answer to max(values), not 0, or an all-negative tree returns 0, the sum of an empty path.",
      solution: { lang: "python",
        title: "max_path_sum.py",
        code: `import random, time

def max_path_sum(n, edges, val):
    """Largest sum of node values along any path (at least one node) in a tree; values may be negative.
    down[u] = best path starting at u and going down into its subtree. Iterative post-order, O(n)."""
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    parent, order, stack, seen = [-1] * n, [], [0], [False] * n
    seen[0] = True
    while stack:
        u = stack.pop(); order.append(u)
        for v in adj[u]:
            if not seen[v]: seen[v] = True; parent[v] = u; stack.append(v)
    down, best = [0] * n, max(val)
    top2 = [[0, 0] for _ in range(n)]                        # the two best non-negative downward gains among u's children
    for u in reversed(order):
        a, b = top2[u]
        down[u] = val[u] + a                                   # extend downward with the best child, or with nothing
        best = max(best, val[u] + a + b)                       # a path that bends at u uses the two best children
        p = parent[u]
        if p >= 0:
            g = max(down[u], 0)
            if g > top2[p][0]: top2[p] = [g, top2[p][0]]
            elif g > top2[p][1]: top2[p][1] = g
    return best

def max_path_sum_brute(n, edges, val):                         # sum along the path between every pair of nodes
    adj = [[] for _ in range(n)]
    for u, v in edges: adj[u].append(v); adj[v].append(u)
    best = max(val)
    for s in range(n):
        acc, stack = {s: val[s]}, [s]                          # path sums from s to every node
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in acc: acc[v] = acc[u] + val[v]; stack.append(v)
        best = max(best, max(acc.values()))
    return best

rnd = random.Random(36)
for _ in range(500):
    n = rnd.randint(1, 30); edges = [(i, rnd.randrange(i)) for i in range(1, n)]
    val = [rnd.randint(-20, 20) for _ in range(n)]
    assert max_path_sum(n, edges, val) == max_path_sum_brute(n, edges, val)
print("500 random trees with negative values: matches the all-pairs brute force")
print("all negative [-3, -1, -2]:", max_path_sum(3, [(1, 0), (2, 0)], [-3, -1, -2]), "(a single node; never 0)")

for n in (1_000, 2_000, 200_000):
    edges = [(i, rnd.randrange(max(0, i - 3), i)) for i in range(1, n)]   # long, thin trees: deep recursion would fail
    val = [rnd.randint(-50, 50) for _ in range(n)]
    t = time.perf_counter(); a = max_path_sum(n, edges, val); ta = time.perf_counter() - t
    if n <= 2_000:
        t = time.perf_counter(); b = max_path_sum_brute(n, edges, val); tb = time.perf_counter() - t; assert a == b
        print(f"{n:>7,} nodes: tree DP {ta * 1000:.1f} ms, all pairs {tb * 1000:.0f} ms")
    else: print(f"{n:>7,} nodes: tree DP {ta * 1000:.0f} ms, best path sum {a:,}")`,
        out: `500 random trees with negative values: matches the all-pairs brute force
all negative [-3, -1, -2]: -1 (a single node; never 0)
  1,000 nodes: tree DP 1.0 ms, all pairs 230 ms
  2,000 nodes: tree DP 1.5 ms, all pairs 944 ms
200,000 nodes: tree DP 243 ms, best path sum 12,160`,
        notes: [
          { t: "p",
            text: "All 500 random trees matched the brute force, including all-negative ones, where the answer is the largest single value. At 2,000 nodes the DP took 1.5 ms against 944 ms for all pairs, and 200,000 nodes took 243 ms." },
          { t: "p",
            text: "The test trees for timing attach each node to one of the three previous ones, so they are thousands of levels deep; a recursive version would have failed on them, which is why they were generated that way." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the comment thread that crashed the worker",
      body: [
        { t: "p",
          text: "**Symptom.** A worker computing \"most upvoted reply chain\" for discussion threads crashed with a segmentation fault on one thread, taking down the process and every other job in it." },
        { t: "p",
          text: "**Mechanism.** A spam bot had produced a reply chain 60,000 levels deep. The recursive tree DP had run with sys.setrecursionlimit(100_000), so it did not raise RecursionError; it exhausted the C stack instead." },
        { t: "p",
          text: "**Fix.** An iterative post-order with an explicit stack, the default recursion limit restored so any remaining recursion fails safely, and a cap on reply depth at ingestion." }
      ] }
  ],

  takeaways: [
    "Grid DP: each cell from **above and left**; one row of memory is enough.",
    "Enumerating paths took **8.9 s** on a 14×14 grid; the DP **0.02 ms**.",
    "Anchor grid states to a **corner**: largest square is 1 + min of three neighbours.",
    "Tree DP: **two values per node** (taken, not taken), children first.",
    "Recursion failed on a **100,000-node path**; the iterative post-order took 61 ms.",
    "Reversed **preorder** gives children before parents with no recursion.",
    "Raising the recursion limit can turn an exception into a **crash**.",
    "Paths in trees **bend at one node**: use the two best children."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "With one list for grid paths, why does ways[c] += ways[c − 1] work?",
        options: [
          "Python updates lists atomically",
          "ways[c] is above, ways[c − 1] left",
          "The grid has no obstacles in it",
          "The columns are processed right to left"
        ],
        answer: 1,
        why: "Before the update, ways[c] still holds the row above; ways[c − 1] has already been updated for this row. Obstacles reset to 0, and the loop goes left to right." },
      { stem: "Why does tree DP process children before parents?",
        options: [
          "It is required to avoid any cycles",
          "A parent sums its children",
          "It uses less memory done that way",
          "Preorder is far too slow in Python"
        ],
        answer: 1,
        why: "take and skip at a node are sums over its children's values, so those must be final first. Trees have no cycles, and memory and speed are the same in either order." },
      { stem: "The recursive version fails on a 100,000-node path. The best fix is…",
        options: [
          "Raise the recursion limit to a million",
          "An explicit post-order",
          "functools.lru_cache",
          "Running it in a thread"
        ],
        answer: 1,
        why: "An explicit stack removes the depth problem. Raising the limit risks a segfault, caching does not reduce depth, and a thread's stack size is a workaround, not a fix." },
      { stem: "Every value in the tree is negative. Maximum path sum is…",
        options: [
          "Zero: take the empty path",
          "The largest single value",
          "The sum of all the values",
          "Undefined for such a tree"
        ],
        answer: 1,
        why: "A path has at least one node, so the best is the least negative node. Initialising the answer to 0 is the bug that returns the empty path." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the state at a cell or a node, then the order.",
    questions: [
      { level: "core",
        q: "Count the paths from the top-left to the bottom-right of a grid with obstacles.",
        strong: "A strong answer gives the recurrence, the base case and the one-row version.",
        answer: [
          { t: "p",
            text: "ways[r][c] = 0 on an obstacle, else ways[r−1][c] + ways[r][c−1], with ways[0][0] = 1 if it is open. One row of length C suffices: for each row, left to right, set obstacles to 0 and add the left neighbour. O(R·C) time, O(C) space; in Python the count is exact however large it gets." }
        ] },
      { level: "core",
        q: "House robber on a binary tree.",
        strong: "A strong answer returns a pair per node and gives the combination rule.",
        answer: [
          { t: "p",
            text: "For each node return (rob, skip): rob = value + skip(left) + skip(right); skip = max(left) + max(right). The answer is the max at the root. O(n). In Python I would write it with an explicit post-order, because a degenerate tree can be as deep as it is large." }
        ] },
      { level: "advanced",
        q: "Find the diameter of a tree.",
        strong: "A strong answer gives the two-best-children DP or the two-BFS method, and says when each applies.",
        answer: [
          { t: "p",
            text: "Post-order: for each node, the height of its two tallest children; the diameter is the maximum over nodes of the sum of those two plus the edges to them. Alternatively, for unweighted trees or non-negative weights, BFS from any node to the farthest node, then BFS again from there; the second distance is the diameter. With negative weights only the DP works." }
        ] }
    ] }
});

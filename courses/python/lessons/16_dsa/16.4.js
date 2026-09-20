/* ============================================================================
   LESSON 16.4 — Trees, Graphs and Traversal
   ========================================================================= */
EC.receiveLesson({
  id: "16.4",

  lede: "Trees and graphs look like many problems and are two: **BFS explores by distance, DFS explores by depth.** Everything else — level order, shortest path, cycle detection, topological sort, connected components — is one of those two templates with a different thing recorded along the way.",

  objectives: [
    "Write BFS and DFS from one template each, without recalling a specific problem",
    "Choose between them on what the question asks, not by habit",
    "Handle cycles, which is the only structural difference from a tree",
    "Convert a recursion to an explicit stack when depth is a risk",
    "Detect a cycle and produce a topological order"
  ],

  prerequisites: ["8.1", "16.3"],

  blocks: [

    { t: "h2", n: "01", text: "Two templates", id: "templates" },

    {"kind": "compare", "title": "BFS versus DFS", "caption": "Breadth-first uses a queue and finds the shortest path in an unweighted graph; depth-first uses a stack (or recursion) and is the natural shape for exhaustive search and cycle detection. Both mark visited nodes to avoid loops.", "columns": [{"title": "BFS · deque", "tone": "accent", "items": ["level by level", "shortest path (unweighted)", "O(V + E)", "memory: the frontier"]}, {"title": "DFS · stack / recursion", "tone": "good", "items": ["as deep as possible first", "topological sort, cycles", "O(V + E)", "recursion depth = path length"]}], "t": "diagram", "id": "dg-16_4-01-0"},

    { t: "viz",
      title: "The same graph, two orders",
      caption: "The only difference in code is a queue versus a stack. That single substitution changes the traversal order, what the algorithm can guarantee, and which problems it solves.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="BFS and DFS visiting the same tree in different orders">
  <g style="stroke:var(--border-strong);fill:none">
    <path d="M180 62 L110 122"/><path d="M180 62 L250 122"/>
    <path d="M110 122 L70 192"/><path d="M110 122 L150 192"/>
    <path d="M250 122 L290 192"/>
  </g>
  <g>
    <circle cx="180" cy="52" r="20" style="fill:var(--t-blue);opacity:.35"/>
    <circle cx="110" cy="122" r="20" style="fill:var(--t-blue);opacity:.28"/>
    <circle cx="250" cy="122" r="20" style="fill:var(--t-blue);opacity:.28"/>
    <circle cx="70" cy="192" r="20" style="fill:var(--t-blue);opacity:.2"/>
    <circle cx="150" cy="192" r="20" style="fill:var(--t-blue);opacity:.2"/>
    <circle cx="290" cy="192" r="20" style="fill:var(--t-blue);opacity:.2"/>
  </g>
  <g class="s-sub" style="text-anchor:middle">
    <text x="180" y="58">A</text><text x="110" y="128">B</text>
    <text x="250" y="128">C</text><text x="70" y="198">D</text>
    <text x="150" y="198">E</text><text x="290" y="198">F</text>
  </g>

  <text x="400" y="60" class="s-label" style="fill:var(--t-green)">BFS — a QUEUE</text>
  <text x="400" y="88" class="s-sub">A · B C · D E F</text>
  <text x="400" y="112" class="s-sub" style="fill:var(--ink-3)">level by level, nearest first</text>
  <text x="400" y="136" class="s-sub" style="fill:var(--ink-3)">memory: the widest level</text>
  <text x="400" y="160" class="s-sub" style="fill:var(--good)">shortest path in an unweighted graph</text>

  <text x="400" y="204" class="s-label" style="fill:var(--t-violet)">DFS — a STACK (or recursion)</text>
  <text x="400" y="232" class="s-sub">A · B · D · E · C · F</text>
  <text x="400" y="256" class="s-sub" style="fill:var(--ink-3)">memory: the deepest path · needed for cycles, topological order, backtracking</text>
</svg>`
    },

    { t: "code", lang: "python", title: "both, in full", code: `
from collections import deque

def bfs(graph: dict[T, list[T]], start: T) -> dict[T, int]:
    """Distance from start to every reachable node.

    O(V + E) time, O(V) space.
    """
    visited = {start}                 # marked when ENQUEUED
    queue = deque([(start, 0)])
    distances = {}

    while queue:
        node, dist = queue.popleft()
        distances[node] = dist

        for neighbour in graph[node]:
            if neighbour not in visited:
                visited.add(neighbour)        # <-- HERE, not on pop
                queue.append((neighbour, dist + 1))

    return distances


def dfs(graph: dict[T, list[T]], start: T) -> set[T]:
    """Every reachable node. O(V + E) time, O(V) space."""
    visited: set[T] = set()
    stack = [start]

    while stack:
        node = stack.pop()
        if node in visited:           # <-- checked on POP, because a
            continue                  #     node can be pushed twice
        visited.add(node)

        for neighbour in graph[node]:
            if neighbour not in visited:
                stack.append(neighbour)

    return visited


# THE ONE DIFFERENCE: popleft() versus pop(). Everything else is
# bookkeeping.
`,
      hl: [9, 18, 29],
      caption: "**Mark visited on enqueue in BFS, on pop in DFS.** Marking on dequeue in BFS lets a node be queued many times before it is processed, and the queue grows exponentially on a dense graph."
    },

    { t: "callout", kind: "trap", title: "The three ways BFS goes wrong", body: [
      { t: "code", lang: "python", title: "each looks correct", numbered: false, code: `
# 1. MARKING VISITED ON DEQUEUE.
while queue:
    node = queue.popleft()
    if node in visited: continue
    visited.add(node)                 # too late
    for n in graph[node]:
        queue.append(n)               # the same node, many times
# On a dense graph the queue holds O(E) entries instead of O(V), and
# on a complete graph that is quadratic memory.

# 2. USING A LIST AS THE QUEUE.
queue.pop(0)                          # O(n) -> O(V^2) overall
                                      # (Lesson 16.3)

# 3. LOSING THE LEVEL BOUNDARY.
# When the problem asks for "levels", capture the size BEFORE the
# inner loop -- the queue grows while you drain it.
while queue:
    for _ in range(len(queue)):       # <-- fixed at the level's size
        node = queue.popleft()
        ...
    depth += 1
# Writing "while queue: node = queue.popleft()" and incrementing
# depth per node counts nodes, not levels.`},
      { t: "p", text: "**The level-size capture is the one that appears in most BFS interview questions.** `len(queue)` must be read before the loop begins, because appending during the loop would otherwise extend it." }
    ]},

    { t: "h2", n: "02", text: "Choosing", id: "choosing" },

    { t: "table",
      head: ["The question asks for", "Use", "Why"],
      rows: [
        ["**Shortest path, unweighted**", "**BFS**", "The first arrival is the nearest"],
        ["Level order, or depth by level", "BFS", "Levels are natural"],
        ["Nearest node satisfying a property", "BFS", "Stops as soon as it finds one"],
        ["**Does a path exist**", "Either", "DFS is usually less code"],
        ["**All paths, or a specific path**", "**DFS**", "The recursion stack *is* the path"],
        ["Cycle detection", "**DFS**", "Needs the recursion state"],
        ["Topological order", "**Either**", "DFS post-order, or Kahn's with BFS"],
        ["Weighted shortest path", "Neither", "Dijkstra — a heap, not a queue"]
      ],
      caption: "**BFS on a weighted graph gives the fewest edges, not the shortest distance.** Swapping the queue for a min-heap keyed on distance turns it into Dijkstra, which is the same template again."
    },

    { t: "code", lang: "python", title: "the shortest-path variants", code: `
def shortest_path(graph, start, goal) -> list[T] | None:
    """BFS, recording the predecessor so the path can be rebuilt.
    Storing the whole path per queue entry is O(V) memory per entry;
    a parent map is O(V) total."""
    if start == goal:
        return [start]

    visited = {start}
    parent: dict[T, T] = {}
    queue = deque([start])

    while queue:
        node = queue.popleft()
        for neighbour in graph[node]:
            if neighbour in visited:
                continue
            visited.add(neighbour)
            parent[neighbour] = node
            if neighbour == goal:            # STOP on discovery, not
                return _rebuild(parent, start, goal)   # on dequeue
            queue.append(neighbour)

    return None


import heapq

def dijkstra(graph: dict[T, list[tuple[T, int]]], start: T) -> dict[T, int]:
    """The same shape with a HEAP instead of a queue, so the nearest
    unvisited node is processed next rather than the oldest.

    O((V + E) log V).
    """
    dist = {start: 0}
    heap = [(0, start)]
    done: set[T] = set()

    while heap:
        d, node = heapq.heappop(heap)
        if node in done:          # a stale entry from a lazy update
            continue
        done.add(node)

        for neighbour, weight in graph[node]:
            nd = d + weight
            if nd < dist.get(neighbour, float("inf")):
                dist[neighbour] = nd
                heapq.heappush(heap, (nd, neighbour))   # lazy: push a
                                                        # better entry
    return dist                                         # rather than
                                                        # updating
`,
      hl: [18, 27, 38],
      caption: "**Dijkstra is BFS with a priority queue.** `heapq` cannot update a key, so the standard approach pushes a better entry and skips stale ones on pop (Lesson 16.3)."
    },

    { t: "h2", n: "03", text: "Cycles", id: "cycles" },

    { t: "ladder",
      title: "Detecting a cycle in a directed graph",
      rungs: [
        { level: "bad", label: "A visited set alone",
          why: "A visited set records that a node was reached, not that it is on the current path. A diamond — A→B, A→C, B→D, C→D — revisits D without any cycle existing, so this reports one that is not there.",
          code: `def has_cycle(graph, node, visited):
    if node in visited:
        return True              # WRONG: a revisit is not a cycle
    visited.add(node)
    return any(has_cycle(graph, n, visited) for n in graph[node])` },
        { level: "ok", label: "Two sets",
          why: "Correct: `visiting` is the current path, `visited` is finished work. The distinction is the whole idea — a back edge into the current path is a cycle, an edge into finished work is not.",
          code: `def has_cycle(graph) -> bool:
    visiting: set[T] = set()      # on the current DFS path
    visited: set[T] = set()       # fully explored

    def dfs(node) -> bool:
        if node in visiting:
            return True           # a BACK EDGE -- a real cycle
        if node in visited:
            return False          # already explored, no cycle there
        visiting.add(node)
        for n in graph[node]:
            if dfs(n):
                return True
        visiting.discard(node)
        visited.add(node)         # done: never revisit
        return False

    return any(dfs(n) for n in graph if n not in visited)` },
        { level: "best", label: "Colours, and return the cycle",
          why: "The same algorithm with a clearer name for the state, and it produces the offending cycle — which is what an operator debugging a dependency graph actually needs.",
          code: `WHITE, GREY, BLACK = 0, 1, 2      # unseen, on the path, finished

def find_cycle(graph: dict[T, list[T]]) -> list[T] | None:
    colour: dict[T, int] = defaultdict(int)
    path: list[T] = []

    def dfs(node: T) -> list[T] | None:
        colour[node] = GREY
        path.append(node)

        for n in graph[node]:
            if colour[n] == GREY:                  # back edge
                return path[path.index(n):] + [n]  # the cycle itself
            if colour[n] == WHITE:
                if cycle := dfs(n):
                    return cycle

        path.pop()
        colour[node] = BLACK
        return None

    for node in list(graph):
        if colour[node] == WHITE:
            if cycle := dfs(node):
                return cycle
    return None`,
          note: "**In an UNDIRECTED graph the rule differs**: every edge looks like a back edge to the node you came from, so you must skip the immediate parent — and detect a cycle only when reaching an already-visited node that is not it." }
      ]
    },

    { t: "code", lang: "python", title: "topological sort, both ways", code: `
def topological_sort(graph: dict[T, list[T]]) -> list[T] | None:
    """Kahn's algorithm -- BFS over nodes with no remaining
    dependencies. Returns None if a cycle exists.

    O(V + E). This is what a build system, a migration runner or a
    task scheduler does.
    """
    indegree = {node: 0 for node in graph}
    for node in graph:
        for n in graph[node]:
            indegree[n] += 1

    # Everything with no dependencies can go first.
    queue = deque([n for n, d in indegree.items() if d == 0])
    order: list[T] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for n in graph[node]:
            indegree[n] -= 1
            if indegree[n] == 0:      # its last dependency is done
                queue.append(n)

    # A SHORT RESULT MEANS A CYCLE: nodes in a cycle never reach
    # indegree 0, so they are never enqueued. Free cycle detection.
    return order if len(order) == len(graph) else None


# The DFS form: reverse post-order. A node is appended only after
# every node it depends on has been appended.
def topological_sort_dfs(graph) -> list[T]:
    visited, order = set(), []

    def dfs(node):
        visited.add(node)
        for n in graph[node]:
            if n not in visited:
                dfs(n)
        order.append(node)        # AFTER the children -- post-order
    for node in graph:
        if node not in visited:
            dfs(node)
    return order[::-1]            # reversed
`,
      hl: [14, 22, 26, 39],
      caption: "**Kahn's algorithm detects cycles for free.** Nodes in a cycle never reach indegree zero, so a result shorter than the graph is exactly the cycle case — no separate check needed."
    },

    { t: "h2", n: "04", text: "Recursion depth", id: "depth" },

    { t: "code", lang: "python", title: "when to convert to a stack", code: `
# Python's default recursion limit is 1000 frames. A DFS on a graph
# with a path longer than that raises RecursionError -- and on a
# linked-list-shaped graph of 10,000 nodes, it will.
sys.getrecursionlimit()          # 1000

# RAISING THE LIMIT IS NOT THE FIX. The C stack has its own limit,
# and exceeding it segfaults the interpreter rather than raising.
sys.setrecursionlimit(100_000)   # a segfault waiting to happen

# THE CONVERSION. Recursion is a stack you did not have to write;
# writing it explicitly removes the limit entirely.
def dfs_iterative(graph, start):
    stack = [(start, iter(graph[start]))]     # node, its neighbours
    visited = {start}

    while stack:
        node, children = stack[-1]
        for child in children:                # resume where we left
            if child not in visited:
                visited.add(child)
                stack.append((child, iter(graph[child])))
                break                         # descend
        else:
            stack.pop()                       # exhausted: ascend
            post_order.append(node)           # post-order work HERE

    return visited

# Keeping the ITERATOR on the stack is what preserves post-order
# work. A simple "stack of nodes" loses the point at which a node's
# children are finished, which is exactly what topological sort and
# cycle detection need.
`,
      hl: [7, 13, 22],
      caption: "**Raising the recursion limit trades a clean exception for a segfault.** Convert to an explicit stack when depth can exceed a few thousand — the graph shape decides, not the node count."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Course scheduling with a reason",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "Given `n` courses and a list of prerequisite pairs `[a, b]` meaning \"b must be taken before a\", return a valid order. If none exists, return the cycle that prevents it." },
        { t: "code", lang: "python", numbered: false, title: "examples", code: `
n = 4, prereqs = [[1,0], [2,0], [3,1], [3,2]]
  ->  [0, 1, 2, 3]        (or [0, 2, 1, 3])

n = 2, prereqs = [[1,0], [0,1]]
  ->  cycle: [0, 1, 0]

n = 3, prereqs = []
  ->  [0, 1, 2]           (no constraints)`},
        { t: "p", text: "Solve it in O(V + E). Returning the cycle is the part most solutions skip — an operator needs to know *which* dependencies are circular, not merely that some are." }
      ],
      requirements: [
        "Build the graph correctly from the pair convention.",
        "Give an O(V + E) solution.",
        "Return the actual cycle, not just a failure.",
        "Explain why Kahn's algorithm detects cycles but cannot name them.",
        "Handle isolated nodes, duplicate edges and self-loops.",
        "State the complexity of both approaches."
      ],
      hint: "Kahn's tells you which nodes are in a cycle — everything left with a non-zero indegree. Finding the cycle itself needs DFS on that subgraph.",
      solution: {
        lang: "python",
        title: "course_schedule.py",
        code: `# =========================================================================
# BUILDING THE GRAPH -- get the direction right first
# =========================================================================
#
#   [a, b] means "b must be taken before a", i.e. a depends on b.
#
# For a topological sort we want edges pointing from a prerequisite
# to the course that needs it, so that "no incoming edges" means
# "nothing left to wait for":
#
#   b -> a
#
# GETTING THIS BACKWARDS produces a reversed but otherwise valid
# order, which passes small hand-made tests and fails the real ones.
# State the direction out loud before writing the loop.

from collections import defaultdict, deque


def build(n: int, prereqs: list[list[int]]) -> tuple[dict, dict]:
    graph: dict[int, list[int]] = defaultdict(list)
    indegree = {i: 0 for i in range(n)}     # ALL nodes, including
                                            # isolated ones
    seen_edges: set[tuple[int, int]] = set()

    for course, prereq in prereqs:
        # DUPLICATE EDGES: the same pair listed twice would increment
        # indegree twice, so that node's count never reaches zero and
        # a valid graph is reported as cyclic.
        if (prereq, course) in seen_edges:
            continue
        seen_edges.add((prereq, course))

        graph[prereq].append(course)        # prereq -> course
        indegree[course] += 1

    return graph, indegree


# =========================================================================
# KAHN'S ALGORITHM -- the order, or the set of blocked nodes
# =========================================================================

def find_order(n: int, prereqs: list[list[int]]) -> list[int] | None:
    """O(V + E) time, O(V + E) space."""
    graph, indegree = build(n, prereqs)

    # Everything with no prerequisites can be taken immediately.
    queue = deque(sorted(c for c, d in indegree.items() if d == 0))
    order: list[int] = []

    while queue:
        course = queue.popleft()
        order.append(course)

        for dependent in graph[course]:
            indegree[dependent] -= 1
            if indegree[dependent] == 0:    # its last prerequisite
                queue.append(dependent)     # is now satisfied

    return order if len(order) == n else None


# =========================================================================
# WHY KAHN'S DETECTS A CYCLE BUT CANNOT NAME IT
# =========================================================================
#
# DETECTION IS FREE: a node in a cycle always has at least one
# unsatisfied prerequisite -- another node in the same cycle -- so
# its indegree never reaches zero and it is never enqueued. If the
# output is shorter than n, the missing nodes are exactly those that
# are in, or downstream of, a cycle.
#
# NAMING IT IS NOT POSSIBLE from Kahn's alone, because the algorithm
# never traverses those nodes. It only ever visits nodes it can
# resolve; the cyclic remainder is what is left over, and no path
# information about it was ever collected.
#
# WHAT IT DOES GIVE YOU: the candidate set. Every node with a
# non-zero indegree at the end is in or downstream of a cycle, which
# is a much smaller subgraph to then search with DFS.
#
#
# =========================================================================
# RETURNING THE ACTUAL CYCLE
# =========================================================================

WHITE, GREY, BLACK = 0, 1, 2


def find_cycle(graph: dict[int, list[int]], nodes) -> list[int]:
    """Three-colour DFS. GREY means 'on the current path', so an edge
    into a GREY node is a back edge -- a real cycle.

    A plain visited set is NOT sufficient: in a diamond
    (a->b, a->c, b->d, c->d) node d is revisited with no cycle
    present. The distinction between 'on the current path' and
    'finished' is the whole algorithm.
    """
    colour: dict[int, int] = defaultdict(int)
    path: list[int] = []

    def dfs(node: int) -> list[int] | None:
        colour[node] = GREY
        path.append(node)

        for nxt in graph[node]:
            if colour[nxt] == GREY:
                # Slice the path from where the cycle began, and
                # close it so the output reads as a loop.
                return path[path.index(nxt):] + [nxt]
            if colour[nxt] == WHITE:
                if cycle := dfs(nxt):
                    return cycle

        path.pop()
        colour[node] = BLACK        # finished: safe to revisit
        return None

    for node in nodes:
        if colour[node] == WHITE:
            if cycle := dfs(node):
                return cycle
    return []


def schedule(n: int, prereqs: list[list[int]]) -> Result:
    """The complete answer: an order, or the cycle preventing one."""
    graph, indegree = build(n, prereqs)

    # SELF-LOOP: [a, a] means "a must be taken before a". Detect it
    # first -- it is a cycle of length one, and the generic code
    # handles it but the message is clearer this way.
    for course, prereq in prereqs:
        if course == prereq:
            return Result(order=None, cycle=[course, course])

    order = find_order(n, prereqs)
    if order is not None:
        return Result(order=order, cycle=None)

    # Only the unresolved nodes can be in a cycle -- usually a small
    # fraction of the graph.
    blocked = [c for c, d in indegree.items() if d > 0]
    return Result(order=None, cycle=find_cycle(graph, blocked))


# =========================================================================
# EDGE CASES
# =========================================================================
#
#   ISOLATED NODES -- courses with no prerequisites and no dependents.
#     indegree is initialised for range(n), not from the edge list,
#     so they start at 0 and are enqueued immediately. Building
#     indegree only from edges would OMIT them, and len(order) would
#     never equal n -- reporting a cycle in an acyclic graph.
#     THIS IS THE MOST COMMON BUG IN THIS PROBLEM.
#
#   DUPLICATE EDGES -- [1,0] listed twice.
#     Without deduplication, indegree[1] is 2 but only one decrement
#     ever occurs, so course 1 is never enqueued and a valid graph
#     is reported as cyclic. Handled in build().
#
#   SELF-LOOP -- [a, a].
#     A cycle of length one. The generic algorithm handles it
#     (indegree never reaches 0), but naming it explicitly gives a
#     far better message.
#
#   DISCONNECTED COMPONENTS.
#     Kahn's handles them naturally -- the queue is seeded with every
#     zero-indegree node across all components. The DFS cycle search
#     loops over all candidate nodes for the same reason.
#
#   n = 0.
#     Empty order, no cycle. The loop never runs.
#
#   prereqs referencing a course >= n.
#     Invalid input. Validate rather than producing a KeyError deep
#     inside the traversal.
#
#
# =========================================================================
# COMPLEXITY
# =========================================================================
#
#   BUILD           O(V + E)   -- V to initialise indegree, E to scan
#   KAHN'S          O(V + E)   -- each node enqueued once, each edge
#                                 relaxed once
#   CYCLE SEARCH    O(V' + E') -- only over the blocked subgraph,
#                                 which is at most V + E and usually
#                                 much smaller
#   ------------------------------------------------------------
#   TOTAL           O(V + E) time, O(V + E) space
#
# THE DFS-ONLY ALTERNATIVE: reverse post-order gives the topological
# order and the three-colour state gives the cycle, in ONE pass:
#
#   + one traversal instead of two
#   - recursion depth is O(V), so a chain of 10,000 courses raises
#     RecursionError (Lesson 16.4, section 4)
#   - the iterative form needs an explicit iterator stack to preserve
#     post-order, which is materially harder to write correctly
#
# Kahn's is iterative by construction and gives detection for free,
# which is why it is the better default here.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_valid_order_respects_prerequisites():
    order = find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]])

    pos = {c: i for i, c in enumerate(order)}
    for course, prereq in [[1, 0], [2, 0], [3, 1], [3, 2]]:
        assert pos[prereq] < pos[course]


def test_isolated_courses_are_included():
    """THE most common bug: building indegree from edges alone omits
    course 2, so len(order) != n and a cycle is falsely reported."""
    order = find_order(3, [[1, 0]])

    assert sorted(order) == [0, 1, 2]


def test_a_cycle_is_returned_not_just_detected():
    result = schedule(2, [[1, 0], [0, 1]])

    assert result.order is None
    assert result.cycle in ([0, 1, 0], [1, 0, 1])


def test_a_self_loop_is_reported_clearly():
    result = schedule(2, [[0, 0]])

    assert result.cycle == [0, 0]


def test_duplicate_edges_do_not_create_a_false_cycle():
    """Without deduplication indegree[1] is 2 and never reaches 0."""
    assert find_order(2, [[1, 0], [1, 0]]) is not None


def test_a_diamond_is_not_a_cycle():
    """The bug a plain visited set has: d is reached twice."""
    result = schedule(4, [[1, 0], [2, 0], [3, 1], [3, 2]])

    assert result.cycle is None


def test_disconnected_components():
    order = find_order(4, [[1, 0], [3, 2]])

    pos = {c: i for i, c in enumerate(order)}
    assert pos[0] < pos[1] and pos[2] < pos[3]


def test_no_prerequisites():
    assert sorted(find_order(3, [])) == [0, 1, 2]


def test_linear_in_edges():
    n, edges = 100_000, chain_of(100_000)

    with timed() as t:
        find_order(n, edges)

    assert t.elapsed < 1.0      # and it does not RecursionError,
                                # which a DFS solution would`,
        notes: [
          { t: "p", text: "**Initialising `indegree` from `range(n)` rather than from the edge list is the most common bug here.** A course with no prerequisites and no dependents never appears in any pair, so building from edges omits it — `len(order)` then never equals `n` and an acyclic graph is reported as cyclic." },
          { t: "p", text: "**Kahn's detects cycles for free but cannot name them**, because it only ever traverses nodes it can resolve. What it does give you is the candidate set — every node with a non-zero indegree at the end — which is a much smaller subgraph for the DFS to search." },
          { t: "callout", kind: "insight", title: "A visited set is not enough for cycle detection", body: [
            { t: "p", text: "In a diamond — a→b, a→c, b→d, c→d — node d is reached twice with no cycle present. A revisit means \"seen before\", not \"on the current path\", and only the second is a cycle." },
            { t: "p", text: "The three colours make the distinction explicit: GREY is on the current DFS path, BLACK is finished and safe to revisit. An edge into GREY is a back edge; an edge into BLACK is not." }
          ]},
          { t: "p", text: "**Duplicate edges break Kahn's silently.** The same pair listed twice increments the indegree twice but is decremented once, so that node is never enqueued and a valid graph reports as cyclic — deduplicating at build time is one set." },
          { t: "p", text: "**Get the edge direction right before writing the loop.** Reversing it produces a reversed but structurally valid order, which passes hand-made tests and fails on real input — saying the direction out loud is the cheapest guard." },
          { t: "p", text: "**Kahn's is the better default despite needing two passes**, because it is iterative by construction: the DFS form is one pass but recurses to depth O(V), and a chain of ten thousand courses raises `RecursionError`." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A build system reported \"circular dependency detected\" and nothing else. Fourteen hundred modules, and the message named none of them." },
      { t: "p", text: "**Engineers spent two days bisecting the dependency graph by hand**, commenting out imports until the error stopped, then narrowing down which of the removals had mattered." },
      { t: "p", text: "**Returning the cycle is thirty lines of three-colour DFS.** With it, the message becomes `auth → billing → notifications → auth` and the fix takes ten minutes." },
      { t: "p", text: "**A detector that cannot name what it detected has done half the job.** The same applies to validation errors, failed assertions and dependency resolvers — the diagnosis is the deliverable, not the detection." }
    ]}
  ],

  takeaways: [
    "**BFS explores by distance, DFS by depth**, and the only difference in code is `popleft()` versus `pop()`.",
    "**Mark visited on enqueue in BFS, on pop in DFS.** Marking on dequeue lets a node be queued many times and the queue grows to O(E).",
    "**Capture `len(queue)` before the inner loop** when the problem asks for levels — the queue grows while you drain it.",
    "**BFS gives the shortest path in an unweighted graph**, because the first arrival at a node is by the fewest edges.",
    "**Dijkstra is BFS with a heap instead of a queue.** Since `heapq` cannot update a key, push a better entry and skip stale ones on pop.",
    "**Store a parent map, not a full path per queue entry** — O(V) total rather than O(V) per entry.",
    "**A visited set alone cannot detect a cycle.** A diamond revisits a node with no cycle present; you need \"on the current path\" versus \"finished\".",
    "**Three colours make the distinction explicit**: an edge into GREY is a back edge, an edge into BLACK is not.",
    "**In an undirected graph, skip the immediate parent** — every edge otherwise looks like a back edge.",
    "**Kahn's algorithm detects cycles for free**: nodes in a cycle never reach indegree zero, so a short result is exactly the cycle case.",
    "**Initialise indegree for every node, not just those appearing in edges**, or isolated nodes are omitted and an acyclic graph reports as cyclic.",
    "**Deduplicate edges before counting indegree**, or a repeated pair prevents a node ever being enqueued.",
    "**Raising the recursion limit trades an exception for a segfault.** Convert to an explicit stack when depth can exceed a few thousand.",
    "**Return the cycle, not just the fact of one.** A detector that cannot name what it found has done half the job."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "In BFS, why must a node be marked visited when it is enqueued rather than when it is dequeued?",
        options: [
          "To preserve the level ordering",
          "Otherwise the same node is enqueued once per incoming edge, so the queue grows to O(E) instead of O(V)",
          "Because `deque` does not support membership tests",
          "It makes no difference to correctness or performance"
        ],
        answer: 1,
        why: "Marking on dequeue still produces a correct answer, but on a dense graph the queue holds an entry per edge — quadratic memory on a complete graph. Marking on enqueue means each node is queued exactly once."
      },
      {
        stem: "Why is a `visited` set alone insufficient for detecting a cycle in a directed graph?",
        options: [
          "It cannot handle disconnected components",
          "A revisit means \"seen before\", not \"on the current path\" — a diamond reaches the same node twice with no cycle present",
          "Sets do not preserve order",
          "It works, but is O(V²)"
        ],
        answer: 1,
        why: "With a→b, a→c, b→d, c→d, node d is reached from two directions and no cycle exists. The three-colour scheme separates GREY (on the current DFS path, so a back edge is a real cycle) from BLACK (finished, so revisiting is fine)."
      },
      {
        stem: "Kahn's algorithm returns an order shorter than the node count. What does that mean, and what can you conclude?",
        options: [
          "The graph is disconnected",
          "A cycle exists — nodes in one never reach indegree zero — and every node with a non-zero indegree is in or downstream of it",
          "Some nodes had no edges",
          "The queue was seeded incorrectly"
        ],
        answer: 1,
        why: "Detection is free, but Kahn's never traverses the cyclic nodes so it cannot name the cycle. It does narrow the search: a three-colour DFS over just the blocked subgraph finds the actual loop, which is what an operator needs."
      },
      {
        stem: "A topological sort reports a cycle in a graph you know is acyclic. What is the most likely cause?",
        options: [
          "The recursion limit was exceeded",
          "`indegree` was built only from the edge list, so nodes with no edges were omitted and the output can never reach the full node count",
          "The queue should have been a stack",
          "Edges were added in the wrong order"
        ],
        answer: 1,
        why: "Isolated nodes never appear in any prerequisite pair. The related bug is duplicate edges: listing the same pair twice increments indegree twice but decrements once, so that node is never enqueued and a valid graph reports as cyclic."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "BFS or DFS?",
        strong: "BFS when the answer depends on distance — shortest path, level order, the nearest node with a property. DFS when it depends on a path — all paths, cycle detection, topological order. The code differs by one line.",
        answer: [
          { t: "p", text: "Framing it by what the question asks for, rather than by the structure, is what makes it a decision rather than a habit." },
          { t: "p", text: "Noting that the recursion stack *is* the current path explains why DFS suits path and cycle problems specifically." },
          { t: "p", text: "Mentioning that BFS on a weighted graph gives fewest edges rather than shortest distance pre-empts a common follow-up." }
        ]
      },
      {
        level: "advanced",
        q: "How do you detect a cycle in a directed graph?",
        strong: "Three-colour DFS. GREY means on the current path, BLACK means finished — an edge into a GREY node is a back edge and a real cycle. A plain visited set falsely reports a diamond.",
        answer: [
          { t: "p", text: "Giving the diamond counterexample is what proves you understand why the naive version fails rather than having memorised the fix." },
          { t: "p", text: "Volunteering that Kahn's detects cycles for free, but cannot name them, shows you know both approaches and their trade-off." },
          { t: "p", text: "The undirected variation — skip the immediate parent — is a good detail to add, since the rule genuinely differs." }
        ]
      },
      {
        level: "advanced",
        q: "Your DFS raises RecursionError on a large graph. What do you do?",
        strong: "Convert to an explicit stack. Raising the limit trades a clean exception for a segfault, because the C stack has its own bound that Python cannot see.",
        answer: [
          { t: "p", text: "Knowing that `setrecursionlimit` does not raise the real limit is the substance of the answer." },
          { t: "p", text: "Keeping an iterator on the stack, rather than just nodes, is the detail that preserves post-order work — which topological sort and cycle detection both need." },
          { t: "p", text: "Noting that graph shape rather than node count determines the depth shows you know when the risk applies." }
        ]
      }
    ]
  }
});

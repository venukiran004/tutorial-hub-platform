/* ============================================================================
   LESSON 5.2 — The Ladder: Graphs, Search and DP
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "Twelve graded problems on traversal, shortest paths, binary search on the answer and dynamic programming. **Each has a statement, the pattern it uses, a hint, and a solution that was run: checked against a brute force on thousands of random cases and timed against it.** The brute forces for the DP problems are exponential, which is exactly why those problems need DP.",

  objectives: [
    "Recognise BFS, binary search on the answer and DP from a problem's shape",
    "Choose an invariant for binary search and test the two-element cases",
    "Turn a recursive brute force into a table, and say why it is faster",
    "Test graph and DP solutions against brute force on random inputs"
  ],

  prerequisites: ["2.1", "2.2", "2.3", "2.5", "3.1", "3.3"],

  blocks: [
    { t: "h2", n: "01", id: "how", text: "How to use the ladder", sub: "Graphs, search, then DP" },
    { t: "p",
      text: "Twelve problems in three groups: graph traversal (Q01, Q07, Q08, Q09), binary search (Q02 to Q04), and dynamic programming (Q05, Q06, Q10 to Q12). Each names the lesson whose pattern solves it. As in 5.1, every solution is tested against a brute force on thousands of random cases and timed against it at a size where the difference is visible." },
    { t: "viz",
      title: "Speedup over the brute force, per problem",
      caption: "Bar length is the logarithm of the speedup at each problem's own input size. The four DP problems whose brute forces are exponential (Q05, Q06, Q10, Q12) show the largest factors.",
      svg: `<svg viewBox="0 0 760 356" width="100%" role="img">
<text x="230" y="28.0" text-anchor="end" class="s-label">Q01 Number of islands</text>
<rect x="240" y="14" width="305.1" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="553.1" y="28.0" class="s-sub">3,148×</text>
<text x="230" y="56.0" text-anchor="end" class="s-label">Q02 Lower bound</text>
<rect x="240" y="42" width="319.8" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="567.8" y="56.0" class="s-sub">4,662×</text>
<text x="230" y="84.0" text-anchor="end" class="s-label">Q03 Search a rotated sorted …</text>
<rect x="240" y="70" width="276.3" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="524.3" y="84.0" class="s-sub">1,456×</text>
<text x="230" y="112.0" text-anchor="end" class="s-label">Q04 Minimum eating speed</text>
<rect x="240" y="98" width="243.3" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="491.3" y="112.0" class="s-sub">602×</text>
<text x="230" y="140.0" text-anchor="end" class="s-label">Q05 Climbing stairs, steps o…</text>
<rect x="240" y="126" width="406.2" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="654.2" y="140.0" class="s-sub">47,091×</text>
<text x="230" y="168.0" text-anchor="end" class="s-label">Q06 House robber</text>
<rect x="240" y="154" width="346.3" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="594.3" y="168.0" class="s-sub">9,485×</text>
<text x="230" y="196.0" text-anchor="end" class="s-label">Q07 Course schedule</text>
<rect x="240" y="182" width="250.5" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="498.5" y="196.0" class="s-sub">730×</text>
<text x="230" y="224.0" text-anchor="end" class="s-label">Q08 Rotting oranges</text>
<rect x="240" y="210" width="194.1" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="442.1" y="224.0" class="s-sub">161×</text>
<text x="230" y="252.0" text-anchor="end" class="s-label">Q09 Network delay</text>
<rect x="240" y="238" width="191.9" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="439.9" y="252.0" class="s-sub">152×</text>
<text x="230" y="280.0" text-anchor="end" class="s-label">Q10 Decode ways</text>
<rect x="240" y="266" width="331.4" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="579.4" y="280.0" class="s-sub">6,358×</text>
<text x="230" y="308.0" text-anchor="end" class="s-label">Q11 Longest palindromic subs…</text>
<rect x="240" y="294" width="258.4" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="506.4" y="308.0" class="s-sub">901×</text>
<text x="230" y="336.0" text-anchor="end" class="s-label">Q12 Word break</text>
<rect x="240" y="322" width="413.0" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="661.0" y="336.0" class="s-sub">56,605×</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "Off-by-one in binary search is the most common bug here",
      body: [
        { t: "p",
          text: "Q02 and Q03 differ from a correct answer by one comparison: < against <=, or hi = mid against hi = mid − 1. Choose an invariant first, \"the answer is always in [lo, hi)\", then derive each update from it, and test on lists of length 0, 1 and 2, which is where these bugs show." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Recognise the shape before the topic",
      body: [
        { t: "p",
          text: "Fewest steps on an unweighted grid is BFS; a yes-or-no question about a threshold that only gets easier is binary search on the answer; \"count the ways\" or \"best total\" over a sequence of choices is DP. The problems here are deliberately phrased in terms of oranges, bananas and houses so that the shape has to be found." }
      ] },
    { t: "h2", n: "02", id: "problems", text: "Twelve problems", sub: "Foundation to advanced" },
    { t: "exercise",
      kind: "Problem",
      title: "01. Number of islands",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Count the groups of horizontally or vertically connected 1s in a grid of 0s and 1s. Pattern: lesson 2.1." }
      ],
      requirements: ["One flood fill per unvisited land cell", "Iterative BFS or an explicit stack, not recursion"],
      hint: "Each fill marks one whole island; the number of fills is the answer.",
      solution: { lang: "python",
        title: "q01.py",
        code: `import random, time
from collections import deque

def count_islands(grid):                          # flood-fill each unvisited land cell with BFS; count the fills
    R, C = len(grid), len(grid[0]) if grid else 0; seen = set(); islands = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and (r, c) not in seen:
                islands += 1; seen.add((r, c)); q = deque([(r, c)])
                while q:
                    y, x = q.popleft()
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < R and 0 <= nx < C and grid[ny][nx] == "1" and (ny, nx) not in seen:
                            seen.add((ny, nx)); q.append((ny, nx))
    return islands

def count_islands_relabel(grid):                  # label every cell, then repeatedly spread the smallest label until stable
    R, C = len(grid), len(grid[0]) if grid else 0
    lab = {(r, c): r * C + c for r in range(R) for c in range(C) if grid[r][c] == "1"}
    changed = True
    while changed:
        changed = False
        for (r, c), v in lab.items():
            m = min([v] + [lab[n] for n in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)) if n in lab])
            if m < v: lab[(r, c)] = m; changed = True
    return len(set(lab.values()))

rnd = random.Random(21)
def grid(R, C, p): return ["".join("1" if rnd.random() < p else "0" for _ in range(C)) for _ in range(R)]
for _ in range(500):
    g = grid(rnd.randint(1, 8), rnd.randint(1, 8), 0.5)
    assert count_islands(g) == count_islands_relabel(g)
g = ["1" * 120 if r % 2 == 0 else ("1" + "0" * 119 if r % 4 == 1 else "0" * 119 + "1") for r in range(120)]   # one long snake
t0 = time.perf_counter(); a = count_islands_relabel(g); tr = time.perf_counter() - t0
t0 = time.perf_counter(); b = count_islands(g); tb = time.perf_counter() - t0
assert a == b == 1
print(f"Q01 number of islands: 500 random grids agree; a 120x120 snake: label spreading {tr * 1000:.0f} ms, BFS {tb * 1000:.1f} ms ({tr / tb:,.0f}x)")`,
        out: `Q01 number of islands: 500 random grids agree; a 120x120 snake: label spreading 21849 ms, BFS 6.9 ms (3,148x)`,
        notes: [
          { t: "p",
            text: "The comparison method, spreading the smallest label until nothing changes, needed one sweep per step along the longest path: 21.8 s on a 120 × 120 snake, against 6.9 ms for BFS. A recursive DFS would also have hit the recursion limit on that snake." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "02. Lower bound",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "In a sorted list, return the first index whose value is at least x, or len(list) if there is none. Pattern: lesson 2.2." }
      ],
      requirements: ["Half-open bounds lo, hi = 0, len(a)", "Keep mid when it could be the answer"],
      hint: "If a[mid] < x the answer is right of mid; otherwise mid itself is still a candidate, so hi = mid, not mid − 1.",
      solution: { lang: "python",
        title: "q02.py",
        code: `import bisect, random, time

def lower_bound(a, x):                            # first index with a[i] >= x, in a sorted list; len(a) if none
    lo, hi = 0, len(a)                            # the answer is always in [lo, hi]
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x: lo = mid + 1               # mid is too small: the answer is to its right
        else: hi = mid                            # mid could be the answer: keep it
    return lo

def lower_bound_scan(a, x): return next((i for i, v in enumerate(a) if v >= x), len(a))

rnd = random.Random(22)
for _ in range(5_000):
    a = sorted(rnd.randint(0, 10) for _ in range(rnd.randint(0, 12))); x = rnd.randint(-1, 11)
    assert lower_bound(a, x) == lower_bound_scan(a, x) == bisect.bisect_left(a, x)
a = list(range(0, 2_000_000, 2)); qs = [rnd.randint(0, 2_000_000) for _ in range(200)]
t0 = time.perf_counter(); r1 = [lower_bound_scan(a, x) for x in qs]; ts = time.perf_counter() - t0
t0 = time.perf_counter(); r2 = [lower_bound(a, x) for x in qs]; tb = time.perf_counter() - t0
assert r1 == r2
print(f"Q02 lower bound: 5,000 random cases match bisect_left; 200 queries on 1,000,000 values: scan {ts * 1000:.0f} ms, binary search {tb * 1000:.2f} ms ({ts / tb:,.0f}x)")`,
        out: `Q02 lower bound: 5,000 random cases match bisect_left; 200 queries on 1,000,000 values: scan 3579 ms, binary search 0.77 ms (4,662x)`,
        notes: [
          { t: "p",
            text: "Tested against bisect.bisect_left on 5,000 cases with duplicates and out-of-range targets. In real code, use bisect_left." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "03. Search a rotated sorted array",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "A sorted list of distinct values was rotated at an unknown point. Find the index of x in O(log n), or −1. Pattern: lesson 2.2." }
      ],
      requirements: ["Decide which half of [lo, hi] is sorted", "Check whether x lies in the sorted half's range"],
      hint: "At least one half around mid is in order; if x is within its bounds go there, otherwise go to the other half.",
      solution: { lang: "python",
        title: "q03.py",
        code: `import random, time

def search_rotated(a, x):                         # distinct values, sorted then rotated; one half of any range is sorted
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x: return mid
        if a[lo] <= a[mid]:                       # left half sorted
            if a[lo] <= x < a[mid]: hi = mid - 1
            else: lo = mid + 1
        else:                                     # right half sorted
            if a[mid] < x <= a[hi]: lo = mid + 1
            else: hi = mid - 1
    return -1

def search_scan(a, x): return a.index(x) if x in a else -1

rnd = random.Random(23)
for _ in range(5_000):
    base = sorted(rnd.sample(range(30), rnd.randint(0, 12))); k = rnd.randint(0, max(0, len(base) - 1))
    a = base[k:] + base[:k]; x = rnd.randint(-1, 30)
    assert search_rotated(a, x) == search_scan(a, x)
base = list(range(1_000_000)); a = base[700_000:] + base[:700_000]; qs = [rnd.randrange(1_000_000) for _ in range(200)]
t0 = time.perf_counter(); r1 = [search_scan(a, x) for x in qs]; ts = time.perf_counter() - t0
t0 = time.perf_counter(); r2 = [search_rotated(a, x) for x in qs]; tb = time.perf_counter() - t0
assert r1 == r2
print(f"Q03 search a rotated array: 5,000 random cases agree; 200 queries on 1,000,000 values: list.index {ts * 1000:.0f} ms, binary search {tb * 1000:.2f} ms ({ts / tb:,.0f}x)")`,
        out: `Q03 search a rotated array: 5,000 random cases agree; 200 queries on 1,000,000 values: list.index 1431 ms, binary search 0.98 ms (1,456x)`,
        notes: [
          { t: "p",
            text: "a[lo] <= a[mid] (with <=) matters when lo == mid; with < the two-element case goes the wrong way. The random tests include lists of length 0 to 12 at every rotation." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "04. Minimum eating speed",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Piles of bananas must be eaten within h hours, one pile at a time, at most k bananas an hour. Find the smallest k that works. Pattern: lesson 2.2." }
      ],
      requirements: ["Binary search over k, not over the piles", "A feasibility check: total hours at speed k"],
      hint: "If speed k finishes in time, so does every faster speed: the predicate is monotone, which is what binary search needs.",
      solution: { lang: "python",
        title: "q04.py",
        code: `import random, time

def hours_needed(piles, speed): return sum(-(-p // speed) for p in piles)   # ceiling division

def min_speed(piles, h):                          # binary search on the answer: feasibility is monotone in speed
    lo, hi = 1, max(piles)                        # max(piles) always finishes in len(piles) <= h hours
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(piles, mid) <= h: hi = mid
        else: lo = mid + 1
    return lo

def min_speed_scan(piles, h):
    return next(s for s in range(1, max(piles) + 1) if hours_needed(piles, s) <= h)

rnd = random.Random(24)
for _ in range(2_000):
    piles = [rnd.randint(1, 40) for _ in range(rnd.randint(1, 8))]; h = rnd.randint(len(piles), 3 * len(piles) + 10)
    assert min_speed(piles, h) == min_speed_scan(piles, h)
piles = [rnd.randint(1, 10**6) for _ in range(200)]; h = 10_000
t0 = time.perf_counter(); a = min_speed_scan(piles, h); ts = time.perf_counter() - t0
t0 = time.perf_counter(); b = min_speed(piles, h); tb = time.perf_counter() - t0
assert a == b
print(f"Q04 minimum eating speed: 2,000 random cases agree; 200 piles up to 1e6: try every speed {ts * 1000:.0f} ms, binary search on the answer {tb * 1000:.2f} ms ({ts / tb:,.0f}x)")`,
        out: `Q04 minimum eating speed: 2,000 random cases agree; 200 piles up to 1e6: try every speed 174 ms, binary search on the answer 0.29 ms (602x)`,
        notes: [
          { t: "p",
            text: "Ceiling division as −(−p // k) avoids floating point. Trying every speed was 600× slower with piles up to a million." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "05. Climbing stairs, steps of 1 to 3",
      difficulty: "foundation",
      minutes: 10,
      body: [{ t: "p", text: "Count the ways to climb n stairs taking 1, 2 or 3 at a time. Pattern: lesson 3.1." }],
      requirements: ["A table where ways[i] sums the ways to the previous three stairs", "ways[0] = 1"],
      hint: "The last step was 1, 2 or 3; add the ways to reach each of those starting points.",
      solution: { lang: "python",
        title: "q05.py",
        code: `import time

def ways(n, steps=(1, 2, 3)):                     # ways[i] = sum of ways[i - s]: the last step taken was s
    w = [1] + [0] * n
    for i in range(1, n + 1): w[i] = sum(w[i - s] for s in steps if s <= i)
    return w[n]

def ways_recursive(n, steps=(1, 2, 3)):           # the same recurrence with no memory: exponential
    if n == 0: return 1
    return sum(ways_recursive(n - s, steps) for s in steps if s <= n)

for n in range(0, 18):
    assert ways(n) == ways_recursive(n) and ways(n, (1, 2)) == ways_recursive(n, (1, 2))
assert [ways(n, (1, 2)) for n in range(1, 9)] == [1, 2, 3, 5, 8, 13, 21, 34]          # Fibonacci, as expected
t0 = time.perf_counter(); r = ways_recursive(24); tr = time.perf_counter() - t0
t0 = time.perf_counter(); d = ways(24); td = time.perf_counter() - t0
assert r == d
print(f"Q05 climbing stairs with steps 1-3: n=0..17 agree; n=24: plain recursion {tr * 1000:.0f} ms, table {td * 1000:.3f} ms ({tr / td:,.0f}x); n=1,000 has {len(str(ways(1000)))} digits")`,
        out: `Q05 climbing stairs with steps 1-3: n=0..17 agree; n=24: plain recursion 947 ms, table 0.020 ms (47,091x); n=1,000 has 265 digits`,
        notes: [
          { t: "p",
            text: "With steps 1 and 2 the counts are the Fibonacci numbers, which the test checks. Plain recursion took 947 ms at n = 24; the table takes microseconds, and at n = 1,000 returns an exact 265-digit count." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "06. House robber",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Houses in a row hold amounts of money; you cannot take two adjacent houses. Return the largest total. Pattern: lesson 3.1." }
      ],
      requirements: ["Two running values: best with this house taken, and without", "O(1) memory"],
      hint: "Taking house i means skipping i − 1; skipping i means the best of either option at i − 1.",
      solution: { lang: "python",
        title: "q06.py",
        code: `import random, time

def rob(houses):                                  # best so far taking or skipping the current house, two numbers
    take, skip = 0, 0
    for v in houses: take, skip = skip + v, max(take, skip)
    return max(take, skip)

def rob_brute(houses):                            # every subset with no two adjacent
    n, best = len(houses), 0
    for mask in range(1 << n):
        if mask & (mask >> 1) == 0: best = max(best, sum(houses[i] for i in range(n) if mask >> i & 1))
    return best

rnd = random.Random(26)
for _ in range(2_000):
    h = [rnd.randint(0, 20) for _ in range(rnd.randint(0, 12))]
    assert rob(h) == rob_brute(h)
h = [rnd.randint(0, 100) for _ in range(20)]
t0 = time.perf_counter(); b = rob_brute(h); tb = time.perf_counter() - t0
t0 = time.perf_counter(); r = rob(h); tr = time.perf_counter() - t0
assert b == r
print(f"Q06 house robber: 2,000 random streets agree; 20 houses: every subset {tb * 1000:.0f} ms, two-variable DP {tr * 1000:.3f} ms ({tb / tr:,.0f}x)")`,
        out: `Q06 house robber: 2,000 random streets agree; 20 houses: every subset 96 ms, two-variable DP 0.010 ms (9,485x)`,
        notes: [
          { t: "p",
            text: "Checked against every non-adjacent subset of up to 12 houses, found with the bit test mask & (mask >> 1) == 0 from 3.6." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "07. Course schedule",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Given n courses and prerequisite pairs, decide whether all courses can be finished. Pattern: lesson 2.5." }
      ],
      requirements: ["Kahn's algorithm with in-degrees", "Compare the number taken with n"],
      hint: "Courses on a cycle never reach in-degree zero, so they are never taken.",
      solution: { lang: "python",
        title: "q07.py",
        code: `import random, time
from collections import deque

def can_finish(n, prereqs):                       # Kahn: take courses with no remaining prerequisites
    after, indeg = [[] for _ in range(n)], [0] * n
    for course, pre in prereqs: after[pre].append(course); indeg[course] += 1
    q = deque(i for i in range(n) if indeg[i] == 0); taken = 0
    while q:
        u = q.popleft(); taken += 1
        for v in after[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return taken == n

def can_finish_brute(n, prereqs):                 # from each course, search whether it can reach itself
    after = [[] for _ in range(n)]
    for course, pre in prereqs: after[pre].append(course)
    for s in range(n):
        seen, stack = set(), list(after[s])
        while stack:
            u = stack.pop()
            if u == s: return False
            if u not in seen: seen.add(u); stack.extend(after[u])
    return True

rnd = random.Random(27)
for _ in range(2_000):
    n = rnd.randint(1, 8); pr = [(rnd.randrange(n), rnd.randrange(n)) for _ in range(rnd.randint(0, 10))]
    assert can_finish(n, pr) == can_finish_brute(n, pr)
n = 3_000; pr = [(i + 1, i) for i in range(n - 1)] + [(rnd.randrange(1, n), rnd.randrange(0, n - 1)) for _ in range(3_000)]
pr = [(c, p) for c, p in pr if c > p]             # every prerequisite has a smaller number: acyclic, so both must search fully
t0 = time.perf_counter(); a = can_finish_brute(n, pr); tb = time.perf_counter() - t0
t0 = time.perf_counter(); b = can_finish(n, pr); tk = time.perf_counter() - t0
assert a == b == True
print(f"Q07 course schedule: 2,000 random cases agree (self-loops included); 3,000 courses: search from every course {tb * 1000:.0f} ms, Kahn {tk * 1000:.1f} ms ({tb / tk:,.0f}x)")`,
        out: `Q07 course schedule: 2,000 random cases agree (self-loops included); 3,000 courses: search from every course 904 ms, Kahn 1.2 ms (730x)`,
        notes: [
          { t: "p",
            text: "The random tests include courses that are their own prerequisite, a one-node cycle that both methods must reject." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "08. Rotting oranges",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Each minute, rotten oranges rot their fresh neighbours. Return the minutes until none are fresh, or −1 if some never rot. Pattern: lesson 2.1." }
      ],
      requirements: ["Multi-source BFS: every rotten orange starts in the queue", "Count fresh oranges to detect the −1 case"],
      hint: "Starting from all sources at once makes BFS layers equal to minutes.",
      solution: { lang: "python",
        title: "q08.py",
        code: `import random, time
from collections import deque

def minutes_to_rot(grid):                         # multi-source BFS: every rotten orange starts in the queue at minute 0
    R, C = len(grid), len(grid[0]); g = [list(row) for row in grid]
    q = deque((r, c, 0) for r in range(R) for c in range(C) if g[r][c] == 2)
    fresh = sum(row.count(1) for row in g); last = 0
    while q:
        r, c, t = q.popleft(); last = max(last, t)
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and g[nr][nc] == 1:
                g[nr][nc] = 2; fresh -= 1; q.append((nr, nc, t + 1))
    return last if fresh == 0 else -1

def minutes_simulate(grid):                       # rescan the whole grid each minute
    g = [list(row) for row in grid]; R, C = len(g), len(g[0]); minute = 0
    while True:
        rot = [(r, c) for r in range(R) for c in range(C) if g[r][c] == 1 and any(
            0 <= nr < R and 0 <= nc < C and g[nr][nc] == 2 for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)))]
        if not rot: return minute if not any(1 in row for row in g) else -1
        for r, c in rot: g[r][c] = 2
        minute += 1

rnd = random.Random(28)
for _ in range(2_000):
    R, C = rnd.randint(1, 6), rnd.randint(1, 6)
    g = [[rnd.choice([0, 1, 1, 2]) for _ in range(C)] for _ in range(R)]
    assert minutes_to_rot(g) == minutes_simulate(g)
g = [[1] * 120 for _ in range(120)]; g[0][0] = 2
t0 = time.perf_counter(); a = minutes_simulate(g); ts = time.perf_counter() - t0
t0 = time.perf_counter(); b = minutes_to_rot(g); tb = time.perf_counter() - t0
assert a == b == 238
print(f"Q08 rotting oranges: 2,000 random grids agree; 120x120 from one corner: rescan per minute {ts * 1000:.0f} ms, multi-source BFS {tb * 1000:.1f} ms ({ts / tb:,.0f}x)")`,
        out: `Q08 rotting oranges: 2,000 random grids agree; 120x120 from one corner: rescan per minute 1886 ms, multi-source BFS 11.7 ms (161x)`,
        notes: [
          { t: "p",
            text: "Rescanning the grid every minute is O(cells × minutes): 1.9 s on a 120 × 120 grid rotting from one corner over 238 minutes, against 11.7 ms." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "09. Network delay",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Signals travel along weighted directed edges from node k. Return the time until every node has received the signal, or −1. Pattern: lesson 2.3." }
      ],
      requirements: ["Dijkstra with heapq and lazy deletion", "The answer is the largest shortest distance"],
      hint: "Every node receives the signal at its shortest-path distance; the last one to receive it sets the time.",
      solution: { lang: "python",
        title: "q09.py",
        code: `import heapq, random, time

def network_delay(times, n, k):                   # time for a signal from k to reach every node: the largest shortest path
    adj = [[] for _ in range(n + 1)]
    for u, v, w in times: adj[u].append((v, w))
    dist = {k: 0}; pq = [(0, k)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        for v, w in adj[u]:
            if d + w < dist.get(v, float("inf")): dist[v] = d + w; heapq.heappush(pq, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1

def network_delay_bf(times, n, k):                # Bellman-Ford: relax every edge n - 1 times
    dist = [float("inf")] * (n + 1); dist[k] = 0
    for _ in range(n - 1):
        for u, v, w in times:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
    m = max(dist[1:]); return m if m < float("inf") else -1

rnd = random.Random(29)
for _ in range(2_000):
    n = rnd.randint(1, 8); times = [(rnd.randint(1, n), rnd.randint(1, n), rnd.randint(0, 9)) for _ in range(rnd.randint(0, 20))]
    k = rnd.randint(1, n)
    assert network_delay(times, n, k) == network_delay_bf(times, n, k)
n = 2_000; times = [(i + 1, i, rnd.randint(1, 9)) for i in range(1, n)] + [(rnd.randint(1, n), rnd.randint(1, n), rnd.randint(1, 99)) for _ in range(4_000)]
t0 = time.perf_counter(); a = network_delay_bf(times, n, n); tb = time.perf_counter() - t0
t0 = time.perf_counter(); b = network_delay(times, n, n); td = time.perf_counter() - t0
assert a == b
print(f"Q09 network delay: 2,000 random graphs agree; 2,000 nodes: Bellman-Ford without early exit {tb * 1000:.0f} ms, Dijkstra {td * 1000:.1f} ms ({tb / td:,.0f}x)")`,
        out: `Q09 network delay: 2,000 random graphs agree; 2,000 nodes: Bellman-Ford without early exit 636 ms, Dijkstra 4.2 ms (152x)`,
        notes: [
          { t: "p",
            text: "Weights here are non-negative, so Dijkstra applies; zero-weight edges are included in the random tests. Bellman-Ford without its early exit, as written here, was 152× slower." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "10. Decode ways",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Digits map to letters, 1 to A through 26 to Z. Count the ways to decode a digit string. Pattern: lesson 3.3." }
      ],
      requirements: [
        "Two running values, like Fibonacci",
        "Zeros handled: '0' alone decodes to nothing, '10' and '20' only as pairs"
      ],
      hint: "The last letter used one digit (if it is not 0) or two digits (if they form 10 to 26).",
      solution: { lang: "python",
        title: "q10.py",
        code: `import random, time

def decode_ways(s):                               # "1" -> A ... "26" -> Z; ways[i] for the prefix s[:i]
    prev2, prev1 = 1, 1 if s and s[0] != "0" else 0
    if not s: return 0
    for i in range(1, len(s)):
        cur = prev1 if s[i] != "0" else 0                       # decode s[i] alone
        if 10 <= int(s[i - 1:i + 1]) <= 26: cur += prev2        # decode s[i-1:i+1] as one letter
        prev2, prev1 = prev1, cur
    return prev1

def decode_brute(s):                              # try every split into pieces of length 1 or 2
    if s == "": return 1
    total = 0
    if s[0] != "0": total += decode_brute(s[1:])
    if len(s) >= 2 and 10 <= int(s[:2]) <= 26: total += decode_brute(s[2:])
    return total

rnd = random.Random(30)
for _ in range(5_000):
    s = "".join(rnd.choices("0123456789" if rnd.random() < 0.5 else "0126", k=rnd.randint(1, 12)))
    assert decode_ways(s) == decode_brute(s)
s = "12" * 13
t0 = time.perf_counter(); a = decode_brute(s); tb = time.perf_counter() - t0
t0 = time.perf_counter(); b = decode_ways(s); td = time.perf_counter() - t0
assert a == b
print(f"Q10 decode ways: 5,000 random strings agree (zeros included); '12' x 13: recursion {tb * 1000:.0f} ms, two-variable DP {td * 1000:.3f} ms ({tb / td:,.0f}x), {a:,} decodings")`,
        out: `Q10 decode ways: 5,000 random strings agree (zeros included); '12' x 13: recursion 106 ms, two-variable DP 0.017 ms (6,358x), 196,418 decodings`,
        notes: [
          { t: "p",
            text: "Half the random strings use only 0, 1, 2 and 6, so leading zeros, '30' and '27' come up constantly; most wrong answers to this problem are zero-handling bugs." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "11. Longest palindromic substring",
      difficulty: "advanced",
      minutes: 20,
      body: [
        { t: "p",
          text: "Return a longest substring that reads the same forwards and backwards. Pattern: lesson 3.3." }
      ],
      requirements: ["Expand around all 2n − 1 centres, odd and even", "O(n²) time, O(1) extra space"],
      hint: "Every palindrome has a centre, either a character or a gap between two; grow outward while the ends match.",
      solution: { lang: "python",
        title: "q11.py",
        code: `import random, time

def longest_palindrome(s):                        # expand around each of the 2n - 1 centres
    best = ""
    for centre in range(2 * len(s) - 1):
        lo, hi = centre // 2, centre // 2 + centre % 2
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]: lo -= 1; hi += 1
        if hi - lo - 1 > len(best): best = s[lo + 1:hi]
    return best

def longest_palindrome_brute(s):                  # every substring, longest first
    for L in range(len(s), 0, -1):
        for i in range(len(s) - L + 1):
            if s[i:i + L] == s[i:i + L][::-1]: return s[i:i + L]
    return ""

rnd = random.Random(31)
for _ in range(3_000):
    s = "".join(rnd.choices("ab", k=rnd.randint(0, 14)))
    a, b = longest_palindrome(s), longest_palindrome_brute(s)
    assert len(a) == len(b) and a == a[::-1] and a in s
s = "".join(rnd.choices("abcd", k=1_500))
t0 = time.perf_counter(); b = longest_palindrome_brute(s); tb = time.perf_counter() - t0
t0 = time.perf_counter(); a = longest_palindrome(s); te = time.perf_counter() - t0
assert len(a) == len(b)
print(f"Q11 longest palindromic substring: 3,000 random strings agree on length; n=1,500: every substring {tb * 1000:.0f} ms, expand around centres {te * 1000:.1f} ms ({tb / te:,.0f}x)")`,
        out: `Q11 longest palindromic substring: 3,000 random strings agree on length; n=1,500: every substring 749 ms, expand around centres 0.8 ms (901x)`,
        notes: [
          { t: "p",
            text: "Several answers can tie, so the test compares lengths and checks the result is a palindrome inside the string, rather than requiring a particular one. Manacher's algorithm does it in O(n), rarely needed in practice." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "12. Word break",
      difficulty: "advanced",
      minutes: 20,
      body: [
        { t: "p",
          text: "Decide whether a string can be split into a sequence of words from a dictionary. Pattern: lesson 3.1." }
      ],
      requirements: ["ok[i] for each prefix", "Try only the word lengths that exist in the dictionary"],
      hint: "s[:i] can be split if some word w ends at i and s[:i − len(w)] can be split.",
      solution: { lang: "python",
        title: "q12.py",
        code: `import random, time

def word_break(s, words):                         # ok[i]: can s[:i] be split into dictionary words?
    words = set(words); lengths = {len(w) for w in words}
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        ok[i] = any(L <= i and ok[i - L] and s[i - L:i] in words for L in lengths)
    return ok[-1]

def word_break_recursive(s, words):               # try every first word, recurse on the rest, no memory
    if s == "": return True
    return any(s.startswith(w) and word_break_recursive(s[len(w):], words) for w in words)

rnd = random.Random(32)
for _ in range(3_000):
    words = list({"".join(rnd.choices("ab", k=rnd.randint(1, 3))) for _ in range(rnd.randint(1, 5))})
    s = "".join(rnd.choices("ab", k=rnd.randint(0, 12)))
    assert word_break(s, words) == word_break_recursive(s, words)
s = "a" * 22 + "b"; words = ["a", "aa", "aaa", "aaaa"]          # no split exists, and the recursion tries them all
t0 = time.perf_counter(); r = word_break_recursive(s, words); tr = time.perf_counter() - t0
t0 = time.perf_counter(); d = word_break(s, words); td = time.perf_counter() - t0
assert r == d == False
print(f"Q12 word break: 3,000 random cases agree; 'a' x 22 + 'b': recursion {tr * 1000:.0f} ms, table {td * 1000:.3f} ms ({tr / td:,.0f}x)")`,
        out: `Q12 word break: 3,000 random cases agree; 'a' x 22 + 'b': recursion 2043 ms, table 0.036 ms (56,605x)`,
        notes: [
          { t: "p",
            text: "'a' × 22 + 'b' with words a, aa, aaa, aaaa makes the plain recursion try every split before failing: 2 seconds, against 0.04 ms for the table." }
        ] } },
    { t: "h2", n: "03", id: "after", text: "After the ladder", sub: "Where to go next" },
    { t: "table",
      head: ["If you struggled with", "Revisit", "Then try"],
      rows: [
        ["Q01, Q08", "2.1 Traversal", "Walls and gates; shortest path in a binary matrix"],
        ["Q02, Q03, Q04", "2.2 Binary search", "Split array largest sum; median of two sorted arrays"],
        ["Q07", "2.5 Topological order", "Course schedule II (return the order); alien dictionary"],
        ["Q09", "2.3 Shortest paths", "Cheapest flights within k stops; path with minimum effort"],
        ["Q05, Q06, Q12", "3.1 DP method", "Coin change; house robber II (circular)"],
        ["Q10, Q11", "3.3 Sequence DP", "Palindromic substrings count; edit distance"]
      ] },
    { t: "callout",
      kind: "scenario",
      title: "Interview: the binary search that looped forever",
      body: [
        { t: "p",
          text: "**Situation.** A candidate solved the minimum eating speed problem with lo = mid instead of lo = mid + 1 in the infeasible branch." },
        { t: "p",
          text: "**What happened.** With lo and hi adjacent, mid equalled lo forever and the loop never ended. The interviewer's two-pile example happened to avoid the case; the candidate's own test on piles [1] with h = 1 found it." },
        { t: "p",
          text: "**Takeaway.** For every binary search, check that each branch strictly shrinks the range when hi − lo is 1. That one check catches most infinite loops." }
      ] }
  ],

  takeaways: [
    "Fewest steps on an **unweighted** grid or graph is **BFS**; start all sources together for simultaneous spread.",
    "Binary search needs a **monotone predicate**; it can search over answers, not only arrays.",
    "Fix the **invariant** first and test lengths 0, 1 and 2; that is where off-by-one bugs live.",
    "DP brute forces are **exponential**: 2 s for word break at 23 characters, against 0.04 ms.",
    "Many DPs need only **two running values**: house robber, decode ways, stairs.",
    "**Kahn's algorithm** answers cycle questions on prerequisites in O(V + E).",
    "Use **Dijkstra** for non-negative weights; the answer to network delay is the largest distance.",
    "Measured speedups ranged from about **150×** to over **50,000×**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why does rotting oranges start BFS from all rotten oranges at once?",
        options: [
          "It uses less memory overall",
          "So BFS layers equal minutes",
          "To avoid revisiting cells",
          "Because DFS would be wrong"
        ],
        answer: 1,
        why: "All rotten oranges spread at the same time, so starting them together makes each BFS layer one minute. Visited marking avoids revisits either way." },
      { stem: "What makes binary search valid for the minimum eating speed?",
        options: [
          "The piles are sorted",
          "Feasibility is monotone in speed",
          "The speeds are integers",
          "h is at least the number of piles"
        ],
        answer: 1,
        why: "If speed k works, every faster speed works, so the feasible speeds form a suffix and the boundary can be found by halving. The piles need not be sorted." },
      { stem: "Why was plain recursion so slow for word break on 'aaa…ab'?",
        options: [
          "String slicing is very slow",
          "It re-solves each suffix",
          "The dictionary is held in a list",
          "Python limits the recursion depth"
        ],
        answer: 1,
        why: "Every way of splitting the a's leads to the same suffixes, each re-solved from scratch, and none succeed because of the final b. A table solves each prefix once." },
      { stem: "In lower bound, why is it hi = mid and not hi = mid − 1?",
        options: ["To make the loop run faster", "mid may be the answer", "To avoid an index error", "Because lo starts at 0"],
        answer: 1,
        why: "When a[mid] >= x, mid itself could be the first such index, so it must stay in the range [lo, hi). mid − 1 would drop it." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the shape, state the invariant, test the edges.",
    questions: [
      { level: "core",
        q: "How do you recognise binary search on the answer?",
        strong: "A strong answer names the monotone predicate and the bounds.",
        answer: [
          { t: "p",
            text: "The question asks for the smallest or largest value of a parameter, such as a speed, capacity or time, and checking whether a given value works is easy and monotone: if it works, every larger (or smaller) value works too. Then binary search the parameter between a bound that surely fails and one that surely works, running the check each time: O(log range × check)." }
        ] },
      { level: "core",
        q: "Turn a recursive solution into dynamic programming.",
        strong: "A strong answer describes the steps, not only 'add a cache'.",
        answer: [
          { t: "p",
            text: "Identify the arguments that change between calls; they are the state. Check that the result depends only on them. Cache by state (memoisation), then, to remove recursion depth and overhead, fill a table in an order where each state's dependencies come first. Finally, if each state reads only the last few, keep only those, as with two running values for house robber." }
        ] },
      { level: "advanced",
        q: "Course schedule: return a valid order, or report a cycle.",
        strong: "A strong answer uses Kahn and says how the cycle is detected and reported.",
        answer: [
          { t: "p",
            text: "Kahn's algorithm: in-degrees, a queue of courses with none, append each popped course to the order and decrement its successors. If the order has fewer than n courses, the rest are on or behind a cycle; to report one, run a DFS with three colours on the remaining courses, or use graphlib.TopologicalSorter, which raises CycleError with the cycle." }
        ] }
    ] }
});

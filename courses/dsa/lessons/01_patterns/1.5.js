/* ============================================================================
   LESSON 1.5 — Prefix Sums and Difference Arrays
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "Precompute the running total once and every range sum becomes one subtraction. **P[j] − P[i] is the sum of nums[i:j]**, and that identity does three jobs: answering range queries in O(1), counting subarrays with a given sum in one pass even when values are negative, and, run backwards as a difference array, applying range updates in O(1) each. This lesson measures all three against the loops they replace, and extends the idea to two dimensions.",

  objectives: [
    "Build a prefix array with a leading zero and use half-open ranges",
    "Count subarrays summing to k with prefix sums and a hash map, negatives included",
    "Apply many range updates with a difference array and one pass",
    "Extend prefix sums to rectangles with inclusion and exclusion",
    "Know when prefix sums stop helping: values that change between queries"
  ],

  prerequisites: ["1.2", "1.4"],

  blocks: [
    { t: "h2", n: "01", id: "prefix", text: "One subtraction per range", sub: "P has n + 1 entries" },
    { t: "p",
      text: "P[k] is the sum of the first k values, with P[0] = 0. The sum of nums[i:j] is then P[j] − P[i], with the same half-open convention as Python slices, and with no special case for ranges that start at index 0. Building P is one pass, so any number of queries after that costs O(1) each. The bottom row of the figure is the same idea in reverse: a difference array, used in section 3." },
    { t: "viz",
      title: "Range sum from two prefix values",
      caption: "The sum of nums[2:6] is P[6] − P[2]. The leading zero in P is what makes a range starting at index 0 work without a special case. The last row is a difference array: one write where a range starts and one just after it ends.",
      svg: `<svg viewBox="0 0 662 232" width="100%" role="img">
<text x="68" y="34.0" text-anchor="end" class="s-sub">nums</text>
<rect x="78" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="34.0" text-anchor="middle" class="s-label">3</text>
<rect x="116" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="34.0" text-anchor="middle" class="s-label">-1</text>
<rect x="154" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="171.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">4</text>
<rect x="192" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="209.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">1</text>
<rect x="230" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="247.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-5</text>
<rect x="268" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="285.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">9</text>
<rect x="306" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="34.0" text-anchor="middle" class="s-label">2</text>
<text x="354" y="34.0" class="s-sub">nums[2:6] sums to 9</text>
<text x="68" y="88.0" text-anchor="end" class="s-sub">P</text>
<rect x="78" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="88.0" text-anchor="middle" class="s-label">0</text>
<rect x="116" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="88.0" text-anchor="middle" class="s-label">3</text>
<rect x="154" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="171.0" y="88.0" text-anchor="middle" class="s-label">2</text>
<rect x="192" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="209.0" y="88.0" text-anchor="middle" class="s-label">6</text>
<rect x="230" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="88.0" text-anchor="middle" class="s-label">7</text>
<rect x="268" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="285.0" y="88.0" text-anchor="middle" class="s-label">2</text>
<rect x="306" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="323.0" y="88.0" text-anchor="middle" class="s-label" style="fill:var(--good)">11</text>
<rect x="344" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="88.0" text-anchor="middle" class="s-label">13</text>
<text x="392" y="88.0" class="s-sub">P[6] = 11, everything before index 6</text>
<text x="68" y="142.0" text-anchor="end" class="s-sub">P</text>
<rect x="78" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="142.0" text-anchor="middle" class="s-label">0</text>
<rect x="116" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="142.0" text-anchor="middle" class="s-label">3</text>
<rect x="154" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="171.0" y="142.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">2</text>
<rect x="192" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="209.0" y="142.0" text-anchor="middle" class="s-label">6</text>
<rect x="230" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="142.0" text-anchor="middle" class="s-label">7</text>
<rect x="268" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="285.0" y="142.0" text-anchor="middle" class="s-label">2</text>
<rect x="306" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="142.0" text-anchor="middle" class="s-label">11</text>
<rect x="344" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="142.0" text-anchor="middle" class="s-label">13</text>
<text x="392" y="142.0" class="s-sub">P[2] = 2, so 11 − 2 = 9</text>
<text x="68" y="196.0" text-anchor="end" class="s-sub">diff</text>
<rect x="78" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="196.0" text-anchor="middle" class="s-label">0</text>
<rect x="116" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="196.0" text-anchor="middle" class="s-label">0</text>
<rect x="154" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="171.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--warn)">5</text>
<rect x="192" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="209.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--warn)">0</text>
<rect x="230" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="247.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--warn)">0</text>
<rect x="268" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="285.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--warn)">-5</text>
<rect x="306" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="196.0" text-anchor="middle" class="s-label">0</text>
<rect x="344" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="196.0" text-anchor="middle" class="s-label">0</text>
<text x="392" y="196.0" class="s-sub">+5 on [2, 4]: write +5 at 2 and −5 at 5</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "Off by one at both ends",
      body: [
        { t: "p",
          text: "Without the leading zero, the sum of nums[0:j] needs a special case and the sum of nums[i:j] becomes P[j−1] − P[i−1], which is where most prefix-sum bugs come from. Pad with a zero and keep ranges half-open, exactly like slices, and both problems disappear." }
      ] },
    { t: "h2",
      n: "02",
      id: "count",
      text: "Counting subarrays with a given sum",
      sub: "A hash map of earlier prefixes" },
    { t: "p",
      text: "A subarray nums[i:j] sums to k exactly when P[j] − P[i] = k, that is, when an earlier prefix equals P[j] − k. Walking left to right with a dictionary counting how often each prefix has occurred answers \"how many subarrays ending here sum to k\" in O(1). This works with negative values, which is exactly where the sliding window from 1.4 fails." },
    { t: "code",
      lang: "python",
      title: "prefix.py — range queries, subarray sums and range updates, each against the loop it replaces",
      code: `import random, time
from itertools import accumulate
from collections import defaultdict

def build_prefix(nums):                       # P[i] = sum of nums[:i], so P has n + 1 entries and P[0] = 0
    return [0, *accumulate(nums)]

def range_sum(P, i, j):                       # sum of nums[i:j], half-open, O(1)
    return P[j] - P[i]

def count_k_cubic(nums, k):                   # re-sum every subarray
    n = len(nums)
    return sum(sum(nums[i:j + 1]) == k for i in range(n) for j in range(i, n))

def count_k_quadratic(nums, k):               # extend a running sum from each start
    count = 0
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):
            total += nums[j]; count += total == k
    return count

def count_k(nums, k):                         # prefix sums + a hash map of how often each prefix has occurred
    seen = defaultdict(int); seen[0] = 1      # the empty prefix, so subarrays starting at index 0 count
    total = count = 0
    for x in nums:
        total += x
        count += seen[total - k]              # earlier prefixes p with total - p == k
        seen[total] += 1
    return count

def apply_ranges_naive(n, updates):
    arr = [0] * n
    for lo, hi, v in updates:
        for i in range(lo, hi + 1): arr[i] += v
    return arr

def apply_ranges_diff(n, updates):            # difference array: O(1) per update, one pass at the end
    d = [0] * (n + 1)
    for lo, hi, v in updates:
        d[lo] += v; d[hi + 1] -= v
    return list(accumulate(d[:n]))

random.seed(1)
nums = [random.randint(-50, 50) for _ in range(100_000)]
queries = [sorted(random.sample(range(100_001), 2)) for _ in range(10_000)]
t = time.perf_counter(); a = [sum(nums[i:j]) for i, j in queries]; ts = time.perf_counter() - t
t = time.perf_counter(); P = build_prefix(nums); b = [range_sum(P, i, j) for i, j in queries]; tp = time.perf_counter() - t
print(f"10,000 range sums over 100,000 values: slicing {ts * 1000:.0f} ms, prefix array {tp * 1000:.1f} ms (including the build), same: {a == b}")

for _ in range(300):                          # the three counters agree, negatives included
    xs = [random.randint(-5, 5) for _ in range(random.randint(0, 25))]; k = random.randint(-6, 6)
    assert count_k_cubic(xs, k) == count_k_quadratic(xs, k) == count_k(xs, k)
print("subarray-sum-equals-k: cubic, quadratic and prefix-hash agree on 300 random arrays with negatives\\n")
print(f"{'n':>6}{'O(n^3) ms':>11}{'O(n^2) ms':>11}{'O(n) ms':>9}")
def best_of(f, *args, runs=3):               # the minimum of a few runs, to keep scheduler noise out of the table
    times = []
    for _ in range(runs):
        t = time.perf_counter(); r = f(*args); times.append(time.perf_counter() - t)
    return r, min(times)
for n in (200, 400, 800):
    xs = [random.randint(-10, 10) for _ in range(n)]
    (c1, t1), (c2, t2), (c3, t3) = best_of(count_k_cubic, xs, 7), best_of(count_k_quadratic, xs, 7), best_of(count_k, xs, 7)
    assert c1 == c2 == c3
    print(f"{n:>6}{t1 * 1000:>11.0f}{t2 * 1000:>11.1f}{t3 * 1000:>9.2f}")

n = 100_000
updates = [(lo, lo + random.randint(0, 20_000), random.randint(1, 9)) for lo in (random.randrange(n - 20_001) for _ in range(2_000))]
t = time.perf_counter(); x = apply_ranges_naive(n, updates); tn = time.perf_counter() - t
t = time.perf_counter(); y = apply_ranges_diff(n, updates); td = time.perf_counter() - t
print(f"\\n2,000 range additions on 100,000 slots: loop over each range {tn * 1000:.0f} ms, difference array {td * 1000:.1f} ms, same: {x == y}")`,
      out: `10,000 range sums over 100,000 values: slicing 3758 ms, prefix array 5.9 ms (including the build), same: True
subarray-sum-equals-k: cubic, quadratic and prefix-hash agree on 300 random arrays with negatives

     n  O(n^3) ms  O(n^2) ms  O(n) ms
   200         12        1.1     0.04
   400         79        4.9     0.07
   800        551       19.6     0.13

2,000 range additions on 100,000 slots: loop over each range 1071 ms, difference array 3.9 ms, same: True` },
    { t: "dl",
      items: [
        [
          "Range queries: 3,758 ms against 5.9 ms",
          "Ten thousand slices summed an average of a third of the array each; the prefix array, built once, answered all of them in one subtraction each."
        ],
        [
          "Subarray sums: the curves differ in shape",
          "Doubling n from 400 to 800 multiplied the cubic time by 7, the quadratic by 4 and the prefix-hash by about 2. At 800 items: 551 ms, 19.6 ms and 0.13 ms."
        ],
        [
          "Range updates: 1,071 ms against 3.9 ms",
          "Two thousand additions over ranges of up to 20,000 slots: two writes per update and one accumulate pass, against touching every slot of every range."
        ]
      ] },
    { t: "ladder",
      title: "Count subarrays that sum to k",
      rungs: [
        { level: "bad",
          label: "Sum every subarray from scratch",
          why: "O(n³): n² subarrays, each summed in O(n). The sum runs in C, which hides the cost until n is a few hundred.",
          code: `def count_k_cubic(nums, k):                   # re-sum every subarray
    n = len(nums)
    return sum(sum(nums[i:j + 1]) == k for i in range(n) for j in range(i, n))`,
          note: "Useful as the reference the faster versions are tested against." },
        { level: "ok",
          label: "Extend a running sum from each start",
          why: "O(n²): each subarray's sum comes from the previous one in O(1), but there are still n² of them.",
          code: `def count_k_quadratic(nums, k):               # extend a running sum from each start
    count = 0
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):
            total += nums[j]; count += total == k
    return count`,
          note: "Fine up to a few thousand elements." },
        { level: "best",
          label: "Prefix sums with a hash map",
          why: "O(n): one pass, one dictionary lookup per element. seen[0] = 1 counts subarrays that start at index 0.",
          code: `def count_k(nums, k):                         # prefix sums + a hash map of how often each prefix has occurred
    seen = defaultdict(int); seen[0] = 1      # the empty prefix, so subarrays starting at index 0 count
    total = count = 0
    for x in nums:
        total += x
        count += seen[total - k]              # earlier prefixes p with total - p == k
        seen[total] += 1
    return count`,
          note: "Look up before inserting, or a zero k counts the empty subarray." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "The same shape solves a family of problems",
      body: [
        { t: "p",
          text: "Replace \"sum equals k\" with \"sum divisible by k\" and key the dictionary on the prefix modulo k. Replace it with \"equal numbers of 0s and 1s\" and map 0 to −1 first, then look for a repeated prefix. Store the first index of each prefix instead of a count and you get the longest such subarray. Each is P[j] − P[i] plus a dictionary." }
      ] },
    { t: "h2",
      n: "03",
      id: "difference",
      text: "Difference arrays and two dimensions",
      sub: "Updates in O(1), rectangles in O(1)" },
    { t: "p",
      text: "A difference array stores where values change: to add v to every slot in [lo, hi], add v at lo and subtract it at hi + 1. One accumulate pass at the end turns the differences back into values. Bookings, calendar overlaps and \"how many intervals cover each point\" are all this. In two dimensions, the prefix of a grid holds the sum of every rectangle anchored at the top-left, and any rectangle is four lookups." },
    { t: "table",
      head: ["Situation", "Use"],
      rows: [
        ["Many range-sum queries, array fixed", "Prefix array, O(1) per query"],
        ["Count or find subarrays with a sum property", "Prefix sums with a hash map"],
        ["Many range updates, read once at the end", "Difference array, then accumulate"],
        ["Rectangle sums in a fixed grid", "2D prefix with inclusion and exclusion"],
        ["Updates and queries interleaved", "Fenwick or segment tree (4.1), O(log n) each"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Rectangle sums in O(1)",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Build a class that takes a grid of integers and answers the sum of any rectangle, given by inclusive corners, in O(1). Test it against a brute force on random grids, including one-row and one-column grids, and time it on a 500 × 500 grid with 2,000 queries." }
      ],
      requirements: [
        "A padded prefix grid with one extra row and column of zeros",
        "An O(rows × cols) build",
        "A four-term query with inclusion and exclusion",
        "Agreement with brute force on 500 random grids"
      ],
      hint: "The query is the whole prefix, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice.",
      solution: { lang: "python",
        title: "grid2d.py",
        code: `import random, time

class Grid2D:
    """Sum of any rectangle in O(1) after an O(rows * cols) build."""
    def __init__(self, grid):
        R, C = len(grid), len(grid[0]) if grid else 0
        self.P = [[0] * (C + 1) for _ in range(R + 1)]          # P[r][c] = sum of grid[:r][:c], padded with a zero row and column
        for r in range(R):
            row_total = 0
            for c in range(C):
                row_total += grid[r][c]
                self.P[r + 1][c + 1] = self.P[r][c + 1] + row_total
    def rect(self, r1, c1, r2, c2):                              # inclusive corners
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]   # whole, minus above, minus left, plus the corner removed twice

def rect_brute(grid, r1, c1, r2, c2):
    return sum(grid[r][c] for r in range(r1, r2 + 1) for c in range(c1, c2 + 1))

random.seed(5)
for _ in range(500):
    R, C = random.randint(1, 8), random.randint(1, 8)
    g = [[random.randint(-9, 9) for _ in range(C)] for _ in range(R)]
    G = Grid2D(g)
    r1, r2 = sorted(random.choices(range(R), k=2)); c1, c2 = sorted(random.choices(range(C), k=2))
    assert G.rect(r1, c1, r2, c2) == rect_brute(g, r1, c1, r2, c2)
print("500 random grids and rectangles agree with brute force")

g = [[random.randint(0, 9) for _ in range(500)] for _ in range(500)]
qs = []
for _ in range(2_000):
    r1, r2 = sorted(random.choices(range(500), k=2)); c1, c2 = sorted(random.choices(range(500), k=2)); qs.append((r1, c1, r2, c2))
t = time.perf_counter(); a = [rect_brute(g, *q) for q in qs]; tb = time.perf_counter() - t
t = time.perf_counter(); G = Grid2D(g); tbuild = time.perf_counter() - t
t = time.perf_counter(); b = [G.rect(*q) for q in qs]; tq = time.perf_counter() - t
print(f"500x500 grid, 2,000 rectangles: brute {tb:.1f} s; prefix build {tbuild * 1000:.0f} ms + queries {tq * 1000:.1f} ms; same: {a == b}")`,
        out: `500 random grids and rectangles agree with brute force
500x500 grid, 2,000 rectangles: brute 3.0 s; prefix build 30 ms + queries 2.2 ms; same: True`,
        notes: [
          { t: "p",
            text: "The build is O(rows × cols) once, 30 ms here; after that each rectangle took about a microsecond, against 3.0 seconds for 2,000 brute-force rectangle sums. The padding row and column remove every special case for rectangles touching the top or left edge." },
          { t: "p",
            text: "If the grid changes between queries the prefix grid would need rebuilding, which is O(rows × cols) per update. A 2D Fenwick tree gives O(log rows × log cols) for both instead." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the analytics endpoint that summed the same days every time",
      body: [
        { t: "p",
          text: "**Symptom.** A dashboard endpoint returning revenue for an arbitrary date range took up to two seconds for ranges of a few years, and the database showed the same daily rows being read thousands of times an hour." },
        { t: "p",
          text: "**Mechanism.** Each request summed the daily totals in the range from scratch: O(range length) per request, repeated for every viewer and every chart." },
        { t: "p",
          text: "**Fix.** A cumulative-revenue column, updated once per day when the day closes. A range is now the difference of two rows. Late corrections to past days update the cumulative values after them, which is acceptable because they are rare; frequent corrections would have called for a Fenwick tree." }
      ] }
  ],

  takeaways: [
    "**P[j] − P[i]** is the sum of nums[i:j]; pad P with a leading zero and keep ranges half-open.",
    "Measured: 10,000 range sums took **3,758 ms** by slicing and **5.9 ms** with a prefix array.",
    "Count subarrays summing to k with **a hash map of earlier prefixes**; it works with negative values.",
    "Initialise the map with **seen[0] = 1**, and look up before inserting.",
    "The same shape handles **divisible by k**, equal 0s and 1s, and longest-such subarray.",
    "A **difference array** makes each range update two writes; accumulate once at the end.",
    "Two dimensions: a padded prefix grid and **four lookups** per rectangle.",
    "Prefix sums assume a **fixed array**; with interleaved updates use a Fenwick or segment tree."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "With P padded by a leading zero, the sum of nums[i:j] is…",
        options: ["P[j] − P[i]", "P[j − 1] − P[i − 1]", "P[j + 1] − P[i]", "P[j] − P[i + 1]"],
        answer: 0,
        why: "P[j] holds the first j values and P[i] the first i, so their difference is exactly indices i to j − 1. The other forms shift one end and are the classic off-by-one bugs." },
      { stem: "Why does counting subarrays with sum k start with seen[0] = 1?",
        options: [
          "To count subarrays starting at 0",
          "To avoid dividing by zero later on",
          "So that negative values are handled",
          "To make k = 0 give no matches"
        ],
        answer: 0,
        why: "A subarray from index 0 to j sums to k when P[j] = k, which needs the empty prefix 0 to be in the map. It has nothing to do with division or negatives, and k = 0 does have matches." },
      { stem: "Why does this method work with negatives when the window from 1.4 does not?",
        options: [
          "It sorts all of the values first",
          "It needs no monotone condition",
          "It skips over the negative values",
          "It works on absolute values instead"
        ],
        answer: 1,
        why: "The window relies on shrinking always lowering the sum. The prefix method only uses the identity P[j] − P[i] = k, which holds for any values. It neither sorts, skips nor takes absolute values." },
      { stem: "Updates and range queries arrive interleaved. Use…",
        options: [
          "A prefix array, rebuilt each time",
          "A difference array, then accumulate",
          "A Fenwick or segment tree",
          "A sliding window over the updates"
        ],
        answer: 2,
        why: "Rebuilding a prefix array is O(n) per update; a difference array is only cheap if you read once at the end; a window answers a different question. A Fenwick tree does both in O(log n)." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the identity, then the dictionary.",
    questions: [
      { level: "core",
        q: "Count the subarrays whose sum is k, with negative numbers allowed.",
        strong: "A strong answer rejects the window, states the identity, and handles the empty prefix.",
        answer: [
          { t: "p",
            text: "A sliding window does not work because the sum is not monotone in the window. A subarray ending at j sums to k when some earlier prefix equals P[j] − k, so I walk once, keep a dictionary from prefix value to how often it has occurred, starting with {0: 1}, and add seen[P − k] before recording P. O(n) time and space." }
        ] },
      { level: "core",
        q: "You have many range-add operations and then need the final array. How?",
        strong: "A strong answer uses a difference array and gives the cost.",
        answer: [
          { t: "p",
            text: "A difference array: for each update add v at lo and subtract v at hi + 1, then take the running sum once. Each update is O(1) and the final pass O(n), so O(n + m) in total instead of O(n·m). On 2,000 updates over 100,000 slots that was 3.9 ms against a second." }
        ] },
      { level: "advanced",
        q: "When would you not use a prefix array for range sums?",
        strong: "A strong answer names interleaved updates and the alternatives.",
        answer: [
          { t: "p",
            text: "When values change between queries: each change shifts every later prefix, so an update is O(n). With updates and queries interleaved, a Fenwick tree or segment tree gives O(log n) for both. Also when the data is too large to precompute and queries are rare; then scanning on demand can be cheaper overall." }
        ] }
    ] }
});

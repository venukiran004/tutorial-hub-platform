/* ============================================================================
   LESSON 4.3 — Monotonic Queues and Sparse Tables
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "Two structures answer \"what is the minimum or maximum of this range?\" faster than scanning it. **A monotonic deque does it for a window that slides, in O(1) amortised per step, by discarding values that can never be the answer again. A sparse table does it for arbitrary ranges of a fixed array, in O(1) per query, by precomputing every power-of-two block.** This lesson measures both, finds the window size below which plain slicing still wins, and uses the deque to fix the problem the sliding window could not solve in 1.4: shortest subarray with a sum of at least K when values can be negative.",

  objectives: [
    "Maintain a monotonic deque for sliding-window maximum or minimum",
    "Explain why each index is pushed and popped at most once",
    "Build a sparse table and answer range-minimum queries in O(1)",
    "Choose among slicing, a heap, a deque and a sparse table",
    "Combine prefix sums with a monotonic deque for sums with negative values"
  ],

  prerequisites: ["1.3", "1.4", "1.5"],

  blocks: [
    { t: "h2", n: "01", id: "deque", text: "The monotonic deque", sub: "Keep only values that could still win" },
    { t: "p",
      text: "For the maximum of each window of size k, keep a deque of indices whose values decrease from front to back. When a new value arrives, pop every smaller value from the back: they are older and smaller, so they can never be a window's maximum again. Then drop the front if it has slid out of the window. The front is the current maximum. Each index is pushed once and popped at most once, so the whole pass is O(n). The figure is the deque after each step on a standard example, from the code's own logic." },
    { t: "viz",
      title: "Sliding window maximum with k = 3",
      caption: "Outlined cells are the window; the note shows the values held in the deque, front first. The deque never holds a value smaller than one behind it, and its front is always the window's maximum.",
      svg: `<svg viewBox="0 0 610 256" width="100%" role="img">
<text x="50" y="32.0" text-anchor="end" class="s-sub">i = 2</text>
<rect x="60" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="78.0" y="32.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">1</text>
<rect x="100" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="118.0" y="32.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<rect x="140" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="158.0" y="32.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-1</text>
<rect x="180" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="198.0" y="32.0" text-anchor="middle" class="s-label">-3</text>
<rect x="220" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="238.0" y="32.0" text-anchor="middle" class="s-label">5</text>
<rect x="260" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="278.0" y="32.0" text-anchor="middle" class="s-label">3</text>
<rect x="300" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="318.0" y="32.0" text-anchor="middle" class="s-label">6</text>
<rect x="340" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="358.0" y="32.0" text-anchor="middle" class="s-label">7</text>
<text x="390" y="32.0" class="s-sub">deque [3, -1], max 3</text>
<text x="50" y="72.0" text-anchor="end" class="s-sub">i = 3</text>
<rect x="60" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="78.0" y="72.0" text-anchor="middle" class="s-label">1</text>
<rect x="100" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="118.0" y="72.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<rect x="140" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="158.0" y="72.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-1</text>
<rect x="180" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="198.0" y="72.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-3</text>
<rect x="220" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="238.0" y="72.0" text-anchor="middle" class="s-label">5</text>
<rect x="260" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="278.0" y="72.0" text-anchor="middle" class="s-label">3</text>
<rect x="300" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="318.0" y="72.0" text-anchor="middle" class="s-label">6</text>
<rect x="340" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="358.0" y="72.0" text-anchor="middle" class="s-label">7</text>
<text x="390" y="72.0" class="s-sub">deque [3, -1, -3], max 3</text>
<text x="50" y="112.0" text-anchor="end" class="s-sub">i = 4</text>
<rect x="60" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="78.0" y="112.0" text-anchor="middle" class="s-label">1</text>
<rect x="100" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="118.0" y="112.0" text-anchor="middle" class="s-label">3</text>
<rect x="140" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="158.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-1</text>
<rect x="180" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="198.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-3</text>
<rect x="220" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="238.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="260" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="278.0" y="112.0" text-anchor="middle" class="s-label">3</text>
<rect x="300" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="318.0" y="112.0" text-anchor="middle" class="s-label">6</text>
<rect x="340" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="358.0" y="112.0" text-anchor="middle" class="s-label">7</text>
<text x="390" y="112.0" class="s-sub">deque [5], max 5</text>
<text x="50" y="152.0" text-anchor="end" class="s-sub">i = 5</text>
<rect x="60" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="78.0" y="152.0" text-anchor="middle" class="s-label">1</text>
<rect x="100" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="118.0" y="152.0" text-anchor="middle" class="s-label">3</text>
<rect x="140" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="158.0" y="152.0" text-anchor="middle" class="s-label">-1</text>
<rect x="180" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="198.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">-3</text>
<rect x="220" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="238.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="260" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="278.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<rect x="300" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="318.0" y="152.0" text-anchor="middle" class="s-label">6</text>
<rect x="340" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="358.0" y="152.0" text-anchor="middle" class="s-label">7</text>
<text x="390" y="152.0" class="s-sub">deque [5, 3], max 5</text>
<text x="50" y="192.0" text-anchor="end" class="s-sub">i = 6</text>
<rect x="60" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="78.0" y="192.0" text-anchor="middle" class="s-label">1</text>
<rect x="100" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="118.0" y="192.0" text-anchor="middle" class="s-label">3</text>
<rect x="140" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="158.0" y="192.0" text-anchor="middle" class="s-label">-1</text>
<rect x="180" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="198.0" y="192.0" text-anchor="middle" class="s-label">-3</text>
<rect x="220" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="238.0" y="192.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="260" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="278.0" y="192.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<rect x="300" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="318.0" y="192.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">6</text>
<rect x="340" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="358.0" y="192.0" text-anchor="middle" class="s-label">7</text>
<text x="390" y="192.0" class="s-sub">deque [6], max 6</text>
<text x="50" y="232.0" text-anchor="end" class="s-sub">i = 7</text>
<rect x="60" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="78.0" y="232.0" text-anchor="middle" class="s-label">1</text>
<rect x="100" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="118.0" y="232.0" text-anchor="middle" class="s-label">3</text>
<rect x="140" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="158.0" y="232.0" text-anchor="middle" class="s-label">-1</text>
<rect x="180" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="198.0" y="232.0" text-anchor="middle" class="s-label">-3</text>
<rect x="220" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="238.0" y="232.0" text-anchor="middle" class="s-label">5</text>
<rect x="260" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="278.0" y="232.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<rect x="300" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="318.0" y="232.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">6</text>
<rect x="340" y="212" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="358.0" y="232.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">7</text>
<text x="390" y="232.0" class="s-sub">deque [7], max 7</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "mono.py — window maximum three ways, a sparse table, and timings",
      code: `import heapq, random, time
from collections import deque

def window_max_brute(a, k): return [max(a[i:i + k]) for i in range(len(a) - k + 1)]

def window_max_heap(a, k):                        # max-heap of (-value, index); discard tops that have left the window
    h, out = [], []
    for i, x in enumerate(a):
        heapq.heappush(h, (-x, i))
        while h[0][1] <= i - k: heapq.heappop(h)
        if i >= k - 1: out.append(-h[0][0])
    return out

def window_max_deque(a, k):                       # indices whose values decrease from front to back
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x: dq.pop()     # a smaller, older value can never be a maximum again
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()           # the front has slid out of the window
        if i >= k - 1: out.append(a[dq[0]])
    return out

class SparseTable:                                # range minimum on a static array: O(n log n) build, O(1) query
    def __init__(self, a):
        self.t = [list(a)]; j = 1
        while (1 << j) <= len(a):
            prev, half = self.t[-1], 1 << (j - 1)
            self.t.append([min(prev[i], prev[i + half]) for i in range(len(a) - (1 << j) + 1)])   # blocks of length 2^j
            j += 1
    def min(self, lo, hi):                        # min of a[lo:hi], hi > lo: two overlapping power-of-two blocks
        j = (hi - lo).bit_length() - 1
        return min(self.t[j][lo], self.t[j][hi - (1 << j)])

rnd = random.Random(44)
for _ in range(300):
    n = rnd.randint(1, 40); a = [rnd.randint(-9, 9) for _ in range(n)]; k = rnd.randint(1, n)
    assert window_max_brute(a, k) == window_max_heap(a, k) == window_max_deque(a, k)
    st = SparseTable(a)
    for _ in range(20):
        lo, hi = sorted(rnd.sample(range(n + 1), 2)); assert st.min(lo, hi) == min(a[lo:hi])
print("300 random arrays: window maximum by slicing, heap and deque agree; sparse-table minimums match min(slice)")

print(f"\\n{'n':>9}{'k':>7}{'slice ms':>10}{'heap ms':>9}{'deque ms':>10}   sliding window maximum")
for n, k in ((100_000, 10), (100_000, 1_000), (100_000, 10_000), (1_000_000, 10_000)):
    a = [rnd.randint(0, 10**6) for _ in range(n)]; row = []
    for f in (window_max_brute, window_max_heap, window_max_deque):
        if f is window_max_brute and n * k > 10**8: row.append(None); continue
        t = time.perf_counter(); r = f(a, k); row.append(((time.perf_counter() - t) * 1000, r))
    assert row[1][1] == row[2][1] and (row[0] is None or row[0][1] == row[1][1])
    sl = "skipped" if row[0] is None else f"{row[0][0]:.0f}"
    print(f"{n:>9,}{k:>7,}{sl:>10}{row[1][0]:>9.0f}{row[2][0]:>10.0f}")

n = 1_000_000; a = [rnd.randint(0, 10**9) for _ in range(n)]
qs = [sorted(rnd.sample(range(n + 1), 2)) for _ in range(100_000)]
t = time.perf_counter(); st = SparseTable(a); tb = time.perf_counter() - t
t = time.perf_counter(); r1 = [st.min(lo, hi) for lo, hi in qs]; tq = time.perf_counter() - t
t = time.perf_counter(); r2 = [min(a[lo:hi]) for lo, hi in qs[:200]]; ts = time.perf_counter() - t
assert r1[:200] == r2
print(f"\\nrange minimum over 1,000,000 values: sparse table build {tb * 1000:.0f} ms ({len(st.t)} levels), "
      f"100,000 queries {tq * 1000:.0f} ms; min(slice) took {ts * 1000:.0f} ms for just 200 queries")`,
      out: `300 random arrays: window maximum by slicing, heap and deque agree; sparse-table minimums match min(slice)

        n      k  slice ms  heap ms  deque ms   sliding window maximum
  100,000     10        31       81        24
  100,000  1,000      1056       48        28
  100,000 10,000   skipped       43        27
1,000,000 10,000   skipped      453       322

range minimum over 1,000,000 values: sparse table build 3218 ms (20 levels), 100,000 queries 62 ms; min(slice) took 1825 ms for just 200 queries` },
    { t: "dl",
      items: [
        [
          "Small windows: slicing wins",
          "With k = 10, max(a[i:i+k]) took 31 ms against 24 ms for the deque and 81 ms for the heap: ten elements are scanned in C faster than Python manages a structure."
        ],
        [
          "Large windows: slicing collapses",
          "With k = 1,000 slicing took 1,056 ms; the deque stayed at 28 ms whatever k was, because its cost does not depend on k."
        ],
        [
          "The heap is in between",
          "A heap with lazy deletion is O(n log n): 453 ms for a million elements against 322 ms for the deque. It is the right tool when the window is not contiguous, such as the k most recent events by time."
        ]
      ] },
    { t: "ladder",
      title: "Sliding window maximum",
      rungs: [
        { level: "bad",
          label: "max of each slice",
          why: "O(n·k): fine for tiny k, 1,056 ms at k = 1,000 on 100,000 elements.",
          code: `def window_max_brute(a, k): return [max(a[i:i + k]) for i in range(len(a) - k + 1)]`,
          note: "Fastest of the three at k = 10, because the scan runs in C." },
        { level: "ok",
          label: "Max-heap with lazy deletion",
          why: "O(n log n): pop stale tops only when they reach the top.",
          code: `def window_max_heap(a, k):                        # max-heap of (-value, index); discard tops that have left the window
    h, out = [], []
    for i, x in enumerate(a):
        heapq.heappush(h, (-x, i))
        while h[0][1] <= i - k: heapq.heappop(h)
        if i >= k - 1: out.append(-h[0][0])
    return out`,
          note: "Generalises to windows defined by time rather than position." },
        { level: "best",
          label: "Monotonic deque",
          why: "O(n): each index enters and leaves once, independent of k.",
          code: `def window_max_deque(a, k):                       # indices whose values decrease from front to back
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x: dq.pop()     # a smaller, older value can never be a maximum again
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()           # the front has slid out of the window
        if i >= k - 1: out.append(a[dq[0]])
    return out`,
          note: "Use <= when popping, so equal values keep only the newest index." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Store indices, not values",
      body: [
        { t: "p",
          text: "A deque of values cannot tell whether its front has left the window, and with duplicates there is no way to know which copy expired. Store indices and look up a[i]; the expiry test is then a comparison of positions." }
      ] },
    { t: "h2", n: "02", id: "sparse", text: "Sparse tables", sub: "Every power-of-two block, precomputed" },
    { t: "p",
      text: "For a fixed array, store the minimum of every block of length 1, 2, 4, … starting at every position: log n levels of n values. Any range [lo, hi) is covered by two blocks of the largest power of two that fits, one starting at lo and one ending at hi. They overlap, which is harmless for min and max because taking an element twice does not change the answer. So a query is two lookups." },
    { t: "table",
      head: ["Range minimum, with", "Build", "Query", "Updates"],
      rows: [
        ["min(slice)", "none", "O(length)", "O(1)"],
        ["Sparse table", "O(n log n)", "O(1)", "rebuild"],
        ["Segment tree (4.1)", "O(n)", "O(log n)", "O(log n)"],
        ["Monotonic deque", "none", "O(1) amortised, sliding windows only", "append only"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Overlap is allowed only for idempotent operations",
      body: [
        { t: "p",
          text: "min(x, x) = x, so counting an element twice is harmless, and two overlapping blocks answer any range. For sums it is not: x + x ≠ x. That is why sparse tables give O(1) queries for min, max and gcd but not for sum, where prefix sums (1.5) or a Fenwick tree (4.1) are used instead." }
      ] },
    { t: "p",
      text: "Measured on a million values: building the table took 3.2 s in pure Python, 20 levels, and then 100,000 queries took 62 ms; min(slice) needed 1.8 s for only 200 queries. The build is the cost; it pays off once there are enough queries to amortise it." },
    { t: "h2",
      n: "03",
      id: "negatives",
      text: "Back to the window that failed",
      sub: "Prefix sums plus a monotonic deque" },
    { t: "p",
      text: "In 1.4 the sliding window could not find the shortest subarray with sum at least K when values are negative, because shrinking no longer reduces the sum. With prefix sums P, the question becomes: for each j, the largest i < j with P[j] − P[i] ≥ K. Keep candidate left ends in a deque with increasing P: a later index with a smaller prefix is always a better left end, so larger ones behind it are discarded. That is the same monotonic idea, applied to prefix sums." },
    { t: "exercise",
      kind: "Challenge",
      title: "Shortest subarray with sum at least K",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Values may be negative. Return the length of the shortest non-empty subarray whose sum is at least K, or −1. Make it O(n) with prefix sums and a monotonic deque, check it against an O(n²) brute force, and find an input on which the positive-only sliding window from 1.4 gives a wrong answer." }
      ],
      requirements: [
        "Prefix sums with a leading zero",
        "Pop from the front while the window sum is at least K, recording lengths",
        "Pop from the back while the back's prefix is at least the current one",
        "A counterexample, found by random search, for the positive-only window"
      ],
      hint: "Once a front index has been used with j, it can be discarded: any later j would give a longer subarray with it.",
      solution: { lang: "python",
        title: "shortest_at_least.py",
        code: `import random, time
from collections import deque
from itertools import accumulate

def shortest_at_least(nums, K):
    """Length of the shortest non-empty subarray with sum >= K, negatives allowed; -1 if none. O(n).
    P = prefix sums. Keep a deque of indices with increasing P. For each j: pop from the front while P[j] - P[front] >= K
    (each front's best partner is j, since later j only make the subarray longer); pop from the back while P[back] >= P[j]
    (a later, smaller prefix is a strictly better left end)."""
    P = [0, *accumulate(nums)]; dq = deque(); best = len(nums) + 1
    for j, pj in enumerate(P):
        while dq and pj - P[dq[0]] >= K: best = min(best, j - dq.popleft())
        while dq and P[dq[-1]] >= pj: dq.pop()
        dq.append(j)
    return best if best <= len(nums) else -1

def shortest_window_positive_only(nums, K):       # the sliding window from 1.4: correct only for positive values
    left = total = 0; best = len(nums) + 1
    for right, x in enumerate(nums):
        total += x
        while left <= right and total >= K: best = min(best, right - left + 1); total -= nums[left]; left += 1
    return best if best <= len(nums) else -1

def shortest_brute(nums, K):
    best = len(nums) + 1
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)):
            s += nums[j]
            if s >= K: best = min(best, j - i + 1); break
    return best if best <= len(nums) else -1

rnd = random.Random(45)
window_wrong = None
for _ in range(3_000):
    nums = [rnd.randint(-10, 10) for _ in range(rnd.randint(1, 15))]; K = rnd.randint(1, 25)
    truth = shortest_brute(nums, K)
    assert shortest_at_least(nums, K) == truth
    if window_wrong is None and shortest_window_positive_only(nums, K) != truth: window_wrong = (nums, K, shortest_window_positive_only(nums, K), truth)
print("3,000 random arrays with negatives: the deque method matches brute force")
print(f"the positive-only window is wrong on, e.g., {window_wrong[0]}, K={window_wrong[1]}: it says {window_wrong[2]}, the answer is {window_wrong[3]}")
print(shortest_at_least([2, -1, 2], 3), shortest_at_least([1, 2], 4), shortest_at_least([84, -37, 32, 40, 95], 167))

for n in (2_000, 4_000, 1_000_000):
    nums = [rnd.randint(-100, 100) for _ in range(n)]; K = 3_000
    t = time.perf_counter(); a = shortest_at_least(nums, K); td = time.perf_counter() - t
    if n <= 4_000:
        t = time.perf_counter(); b = shortest_brute(nums, K); tb = time.perf_counter() - t; assert a == b
        print(f"n={n:>9,}: deque {td * 1000:.1f} ms, brute force {tb * 1000:.0f} ms, answer {a}")
    else: print(f"n={n:>9,}: deque {td * 1000:.0f} ms, answer {a}")`,
        out: `3,000 random arrays with negatives: the deque method matches brute force
the positive-only window is wrong on, e.g., [-6, 10, -10, -3, 5, 9], K=14: it says -1, the answer is 2
3 -1 3
n=    2,000: deque 0.5 ms, brute force 83 ms, answer 489
n=    4,000: deque 1.0 ms, brute force 367 ms, answer 676
n=1,000,000: deque 255 ms, answer 153`,
        notes: [
          { t: "p",
            text: "The deque matched brute force on 3,000 random arrays with negatives. Random search found the window failing on [−6, 10, −10, −3, 5, 9] with K = 14, where it answered −1 although [5, 9] has sum 14: the leading −6 kept the running total below K and the window never shrank to the right place." },
          { t: "p",
            text: "At 4,000 elements the deque took 1.0 ms and brute force 367 ms; a million elements took 255 ms." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the alert that fired an hour late",
      body: [
        { t: "p",
          text: "**Symptom.** A monitoring rule meant to alert when the maximum latency over any 5-minute window exceeded a threshold fired late and used more CPU as traffic grew." },
        { t: "p",
          text: "**Mechanism.** Every minute it recomputed max over the last 5 minutes of per-second samples by scanning them, and at peak it fell behind its own schedule, so evaluation lagged by tens of minutes." },
        { t: "p",
          text: "**Fix.** A monotonic deque per series, updated as each sample arrives: O(1) amortised per sample, and the current window maximum is always at the front. Evaluation lag dropped to zero." }
      ] }
  ],

  takeaways: [
    "A **monotonic deque** keeps only values that could still be a window's answer.",
    "Each index is pushed and popped **at most once**: O(n) for any k.",
    "Measured: slicing won at **k = 10** and lost **38×** at k = 1,000; the deque stayed near 28 ms.",
    "A heap with lazy deletion is **O(n log n)** and handles windows defined by time.",
    "Store **indices**, not values, so expiry and duplicates are unambiguous.",
    "A **sparse table** answers range min in O(1) with two overlapping power-of-two blocks.",
    "Overlap works only for **idempotent** operations: min, max, gcd, not sum.",
    "Prefix sums plus a monotonic deque solve **shortest subarray with sum ≥ K** with negatives."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why can the deque discard smaller values when a larger one arrives?",
        options: [
          "They are duplicates of the new value",
          "They can never be a max again",
          "The deque has a fixed maximum size",
          "The smaller values were already output"
        ],
        answer: 1,
        why: "Any future window containing them also contains the newer, larger value, so they can never be the maximum. Size and duplicates are not the reason." },
      { stem: "Why was max(slice) faster than the deque at k = 10?",
        options: [
          "It has a better complexity class",
          "A ten-item scan in C is cheap",
          "The deque is wrong for a small k",
          "Slices are cached by the interpreter"
        ],
        answer: 1,
        why: "O(n·k) with k = 10 is a small constant times n, executed in C, while the deque does Python-level work per element. At k = 1,000 the deque was 38× faster." },
      { stem: "Why can a sparse table answer range minimum but not range sum in O(1)?",
        options: [
          "Sums need more memory",
          "Its two blocks overlap",
          "Sums overflow in Python",
          "Minimum is cheaper to compute"
        ],
        answer: 1,
        why: "The two blocks overlap, and counting an element twice is harmless for min but wrong for sum. Python integers do not overflow." },
      { stem: "Why does the positive-only window fail with negative values?",
        options: [
          "Shrinking may raise the sum",
          "Negative numbers cannot be summed",
          "The window must be of a fixed size",
          "It needs all the values to be sorted"
        ],
        answer: 0,
        why: "The window relies on sums being monotone in its size; with negatives, removing an element can raise the sum, so the greedy shrink misses answers, as the counterexample showed." }
    ] },

  interview: { title: "In an interview",
    sub: "Say what the deque's invariant is.",
    questions: [
      { level: "core",
        q: "Sliding window maximum in O(n).",
        strong: "A strong answer states the invariant and the amortised argument.",
        answer: [
          { t: "p",
            text: "Keep a deque of indices with strictly decreasing values. For each new index, pop from the back while the back's value is ≤ the new one, append it, and pop the front if it is outside the window. The front is the maximum. Each index is appended and removed at most once, so the total is O(n) regardless of k." }
        ] },
      { level: "advanced",
        q: "Answer many range-minimum queries on a static array.",
        strong: "A strong answer compares sparse table and segment tree and explains the overlap trick.",
        answer: [
          { t: "p",
            text: "A sparse table: st[j][i] is the minimum of the 2^j elements from i, built level by level in O(n log n). A query on [lo, hi) takes j = floor(log2(hi − lo)) and returns min(st[j][lo], st[j][hi − 2^j]): O(1). If the array changes, a segment tree with O(log n) updates and queries instead." }
        ] },
      { level: "advanced",
        q: "Shortest subarray with sum at least K, values may be negative.",
        strong: "A strong answer explains why the window fails and gives the prefix-sum deque.",
        answer: [
          { t: "p",
            text: "The window fails because the sum is not monotone in the window. Use prefix sums and a deque of indices with increasing prefix values: for each j, pop the front while P[j] − P[front] ≥ K, recording j − front; pop the back while P[back] ≥ P[j]; append j. Each index enters and leaves once: O(n)." }
        ] }
    ] }
});

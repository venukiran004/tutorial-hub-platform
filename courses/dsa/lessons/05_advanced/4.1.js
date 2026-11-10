/* ============================================================================
   LESSON 4.1 — Segment Trees and Fenwick Trees
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "A prefix array answers range sums in O(1) but cannot be updated cheaply; a plain array updates in O(1) but sums in O(n). **Fenwick and segment trees meet in the middle: O(log n) for both**, which is what matters when updates and queries are interleaved. A Fenwick tree does sums in about a dozen lines, using the lowest-set-bit trick from 3.6; a segment tree handles anything associative, such as minimum. This lesson measures both against the alternatives, and finds the input size where a simpler Python shortcut stops working.",

  objectives: [
    "Implement a Fenwick tree for prefix sums with point updates",
    "Explain which range each Fenwick node covers, using i & −i",
    "Implement an iterative segment tree for range minimum",
    "Choose among slicing, prefix rebuild and a tree from the update/query mix",
    "Use coordinate compression to apply a Fenwick tree to large values"
  ],

  prerequisites: ["1.5", "3.6"],

  blocks: [
    { t: "h2", n: "01", id: "fenwick", text: "The Fenwick tree", sub: "Each node covers a power-of-two block" },
    { t: "p",
      text: "Node i of a Fenwick tree, counting from 1, stores the sum of the block of length i & −i ending at i. A prefix sum up to i reads node i, strips the lowest set bit, and repeats, so it reads one node per set bit of i: at most log₂ n. An update at i walks the other way, adding the lowest set bit, through every node whose block contains i. The figure shows the blocks for 16 elements and the three nodes a prefix sum of 13 reads." },
    { t: "viz",
      title: "What each Fenwick node covers",
      caption: "Rows are grouped by block length: 1, 2, 4, 8 and 16. prefix(13) reads t[13] (element 13), t[12] (elements 9–12) and t[8] (elements 1–8), highlighted: one node per set bit of 13 = 1101 in binary.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<text x="80" y="240" text-anchor="middle" class="s-sub">1</text>
<text x="120" y="240" text-anchor="middle" class="s-sub">2</text>
<text x="160" y="240" text-anchor="middle" class="s-sub">3</text>
<text x="200" y="240" text-anchor="middle" class="s-sub">4</text>
<text x="240" y="240" text-anchor="middle" class="s-sub">5</text>
<text x="280" y="240" text-anchor="middle" class="s-sub">6</text>
<text x="320" y="240" text-anchor="middle" class="s-sub">7</text>
<text x="360" y="240" text-anchor="middle" class="s-sub">8</text>
<text x="400" y="240" text-anchor="middle" class="s-sub">9</text>
<text x="440" y="240" text-anchor="middle" class="s-sub">10</text>
<text x="480" y="240" text-anchor="middle" class="s-sub">11</text>
<text x="520" y="240" text-anchor="middle" class="s-sub">12</text>
<text x="560" y="240" text-anchor="middle" class="s-sub">13</text>
<text x="600" y="240" text-anchor="middle" class="s-sub">14</text>
<text x="640" y="240" text-anchor="middle" class="s-sub">15</text>
<text x="680" y="240" text-anchor="middle" class="s-sub">16</text>
<rect x="62" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="80" y="207" text-anchor="middle" class="s-label">t[1]</text>
<rect x="62" y="150" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="100" y="167" text-anchor="middle" class="s-label">t[2]</text>
<rect x="142" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="160" y="207" text-anchor="middle" class="s-label">t[3]</text>
<rect x="62" y="110" width="156" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="140" y="127" text-anchor="middle" class="s-label">t[4]</text>
<rect x="222" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="240" y="207" text-anchor="middle" class="s-label">t[5]</text>
<rect x="222" y="150" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="260" y="167" text-anchor="middle" class="s-label">t[6]</text>
<rect x="302" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="320" y="207" text-anchor="middle" class="s-label">t[7]</text>
<rect x="62" y="70" width="316" height="26" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2.2"/>
<text x="220" y="87" text-anchor="middle" class="s-label" style="fill:var(--good)">t[8]</text>
<rect x="382" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="400" y="207" text-anchor="middle" class="s-label">t[9]</text>
<rect x="382" y="150" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="420" y="167" text-anchor="middle" class="s-label">t[10]</text>
<rect x="462" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="480" y="207" text-anchor="middle" class="s-label">t[11]</text>
<rect x="382" y="110" width="156" height="26" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2.2"/>
<text x="460" y="127" text-anchor="middle" class="s-label" style="fill:var(--good)">t[12]</text>
<rect x="542" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2.2"/>
<text x="560" y="207" text-anchor="middle" class="s-label" style="fill:var(--good)">t[13]</text>
<rect x="542" y="150" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="580" y="167" text-anchor="middle" class="s-label">t[14]</text>
<rect x="622" y="190" width="36" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="640" y="207" text-anchor="middle" class="s-label">t[15]</text>
<rect x="62" y="30" width="636" height="26" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<text x="380" y="47" text-anchor="middle" class="s-label">t[16]</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "rangeq.py — Fenwick sums and segment-tree minimums checked, then three structures timed",
      code: `import random, time
from itertools import accumulate

class Fenwick:                                    # prefix sums with point updates, both O(log n). 1-indexed inside.
    def __init__(self, n): self.n = n; self.t = [0] * (n + 1)
    def add(self, i, delta):                      # a[i] += delta
        i += 1
        while i <= self.n: self.t[i] += delta; i += i & -i       # climb to every node whose range covers i
    def prefix(self, i):                          # sum of a[0:i]
        s = 0
        while i > 0: s += self.t[i]; i -= i & -i                 # strip the lowest set bit: one node per bit
        return s
    def range_sum(self, lo, hi): return self.prefix(hi) - self.prefix(lo)   # a[lo:hi]

class MinSegTree:                                 # range minimum with point assignment, iterative, size 2n
    def __init__(self, a):
        self.n = n = len(a); self.t = [0] * n + list(a)
        for i in range(n - 1, 0, -1): self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])
    def set(self, i, v):
        i += self.n; self.t[i] = v
        while i > 1: i //= 2; self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])
    def min(self, lo, hi):                        # min of a[lo:hi]
        res = float("inf"); lo += self.n; hi += self.n
        while lo < hi:
            if lo & 1: res = min(res, self.t[lo]); lo += 1
            if hi & 1: hi -= 1; res = min(res, self.t[hi])
            lo //= 2; hi //= 2
        return res

class NaiveSlice:                                 # store the array; sum the slice on every query
    def __init__(self, a): self.a = list(a)
    def add(self, i, d): self.a[i] += d
    def range_sum(self, lo, hi): return sum(self.a[lo:hi])

class PrefixRebuild:                              # prefix array: O(1) queries, but every update rebuilds it
    def __init__(self, a): self.a = list(a); self.P = [0, *accumulate(self.a)]
    def add(self, i, d): self.a[i] += d; self.P = [0, *accumulate(self.a)]
    def range_sum(self, lo, hi): return self.P[hi] - self.P[lo]

def fenwick_from(a):
    f = Fenwick(len(a))
    for i, x in enumerate(a): f.add(i, x)
    return f

rnd = random.Random(41)
for _ in range(200):                              # random interleaved operations against a plain list
    n = rnd.randint(1, 40); a = [rnd.randint(-9, 9) for _ in range(n)]
    f, st, ref = fenwick_from(a), MinSegTree(a), list(a)
    for _ in range(60):
        i = rnd.randrange(n); lo, hi = sorted(rnd.sample(range(n + 1), 2))
        if rnd.random() < 0.5: d = rnd.randint(-5, 5); f.add(i, d); ref[i] += d; st.set(i, ref[i])
        else: assert f.range_sum(lo, hi) == sum(ref[lo:hi]) and st.min(lo, hi) == min(ref[lo:hi])
print("200 random sequences of updates and queries: Fenwick sums and segment-tree minimums match a plain list")

print(f"\\n{'n':>10}{'ops':>8}{'slice ms':>10}{'rebuild ms':>12}{'Fenwick ms':>12}   half updates, half range sums")
for n, q in ((10_000, 10_000), (100_000, 10_000), (1_000_000, 10_000)):
    a = [rnd.randint(0, 100) for _ in range(n)]
    ops = [(rnd.random() < 0.5, rnd.randrange(n), *sorted(rnd.sample(range(n + 1), 2))) for _ in range(q)]
    times, answers = [], []
    for make in (NaiveSlice, PrefixRebuild, fenwick_from):
        if make is PrefixRebuild and n > 100_000: times.append(None); answers.append(None); continue
        s = make(a); out = []; t = time.perf_counter()
        for is_update, i, lo, hi in ops:
            if is_update: s.add(i, 1)
            else: out.append(s.range_sum(lo, hi))
        times.append((time.perf_counter() - t) * 1000); answers.append(out)
    assert answers[0] == answers[2] and answers[1] in (None, answers[0])
    rb = "skipped" if times[1] is None else f"{times[1]:.0f}"
    print(f"{n:>10,}{q:>8,}{times[0]:>10.0f}{rb:>12}{times[2]:>12.0f}")`,
      out: `200 random sequences of updates and queries: Fenwick sums and segment-tree minimums match a plain list

         n     ops  slice ms  rebuild ms  Fenwick ms   half updates, half range sums
    10,000  10,000        82         865          11
   100,000  10,000       929       10212          15
 1,000,000  10,000     11514     skipped          25` },
    { t: "dl",
      items: [
        [
          "Slicing grows with n",
          "Summing a slice per query took 82 ms at 10,000 elements and 11.5 s at a million, for the same 10,000 operations."
        ],
        [
          "Rebuilding the prefix array is worse",
          "With half the operations being updates, rebuilding after each one took 865 ms at 10,000 and 10.2 s at 100,000."
        ],
        [
          "The Fenwick tree barely notices n",
          "11, 15 and 25 ms at 10,000, 100,000 and a million elements: the log factor and nothing else. Its O(n log n) build was outside the timer."
        ]
      ] },
    { t: "ladder",
      title: "Range sums with point updates",
      rungs: [
        { level: "bad",
          label: "Sum the slice on every query",
          why: "O(1) update, O(n) query: 11.5 s for 10,000 operations on a million elements.",
          code: `class NaiveSlice:                                 # store the array; sum the slice on every query
    def __init__(self, a): self.a = list(a)
    def add(self, i, d): self.a[i] += d
    def range_sum(self, lo, hi): return sum(self.a[lo:hi])`,
          note: "Fine when queries are rare or ranges short." },
        { level: "ok",
          label: "Prefix array, rebuilt on update",
          why: "O(1) query, O(n) update: the best choice if updates are rare, the worst if they are not.",
          code: `class PrefixRebuild:                              # prefix array: O(1) queries, but every update rebuilds it
    def __init__(self, a): self.a = list(a); self.P = [0, *accumulate(self.a)]
    def add(self, i, d): self.a[i] += d; self.P = [0, *accumulate(self.a)]
    def range_sum(self, lo, hi): return self.P[hi] - self.P[lo]`,
          note: "10.2 s at 100,000 elements with half the operations updates." },
        { level: "best",
          label: "Fenwick tree",
          why: "O(log n) for both: 25 ms for the same operations on a million elements.",
          code: `class Fenwick:                                    # prefix sums with point updates, both O(log n). 1-indexed inside.
    def __init__(self, n): self.n = n; self.t = [0] * (n + 1)
    def add(self, i, delta):                      # a[i] += delta
        i += 1
        while i <= self.n: self.t[i] += delta; i += i & -i       # climb to every node whose range covers i
    def prefix(self, i):                          # sum of a[0:i]
        s = 0
        while i > 0: s += self.t[i]; i -= i & -i                 # strip the lowest set bit: one node per bit
        return s
    def range_sum(self, lo, hi): return self.prefix(hi) - self.prefix(lo)`,
          note: "Sums, counts and XOR: anything invertible. For min or max, use a segment tree." }
      ] },
    { t: "h2", n: "02", id: "segment", text: "Segment trees", sub: "Any associative operation" },
    { t: "p",
      text: "A Fenwick tree needs an inverse to turn two prefix sums into a range sum, so it cannot do minimum. A segment tree stores the combined value of each node's two children, so any associative operation works: min, max, gcd, or a custom merge. The iterative version keeps the leaves at positions n to 2n − 1 and parents at i // 2, and a query walks both ends of the range upward." },
    { t: "callout",
      kind: "trap",
      title: "Off-by-one between 0- and 1-indexed",
      body: [
        { t: "p",
          text: "Fenwick trees are naturally 1-indexed, because i & −i is 0 at index 0 and the loops would never move. Mixing a 0-indexed API with the 1-indexed tree is the usual bug; the code above converts once, in add, and documents prefix(i) as the sum of a[0:i]. The 200 random interleaved sequences checked against a plain list are what make such a convention safe to rely on." }
      ] },
    { t: "table",
      head: ["Workload", "Use"],
      rows: [
        ["Static array, many range sums", "Prefix array (1.5)"],
        ["Static array, many range minimums", "Sparse table, O(1) query (4.3)"],
        ["Updates and range sums interleaved", "Fenwick tree"],
        ["Updates and range min, max or custom", "Segment tree"],
        ["Range updates and range queries", "Segment tree with lazy propagation"],
        ["Counting by value as you scan", "Fenwick over compressed values"]
      ] },
    { t: "h2", n: "03", id: "counting", text: "Counting with a tree over values", sub: "Compress first" },
    { t: "p",
      text: "A Fenwick tree indexed by value, not position, counts how many values seen so far fall below a threshold: add 1 at a value's slot, and a prefix sum counts everything smaller. Values up to 10⁹ would need a huge tree, so first replace each value by its rank among the distinct values: the order is all that matters." },
    { t: "callout",
      kind: "insight",
      title: "Measure the shortcut before dismissing it",
      body: [
        { t: "p",
          text: "bisect.insort on a sorted list is O(n) per insert, because it shifts elements, but the shift is a memmove in C. Below a few thousand elements it beat the Fenwick tree; at a million it took 100 seconds against 3.6. The exercise output shows the crossover." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Count smaller elements to the right",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "For each position, count how many later elements are smaller. Use a Fenwick tree over compressed values, scanning from the right. Check against brute force and against a sorted-list-with-insort version, including arrays with duplicates and values up to 10⁹, and time all three." }
      ],
      requirements: [
        "Coordinate compression to ranks 1..k",
        "A right-to-left scan: query ranks below, then record the value",
        "Duplicates counted as not smaller",
        "Timings that show where the sorted-list shortcut stops scaling"
      ],
      hint: "Query before you insert, and query rank − 1, not rank, so equal values are not counted.",
      solution: { lang: "python",
        title: "count_smaller.py",
        code: `import bisect, random, time

def count_smaller_after(nums):
    """out[i] = how many j > i have nums[j] < nums[i]. Walk from the right, keeping a Fenwick tree of counts per value rank.
    Values are compressed to ranks 1..k first, so the tree has k slots however large the values are. O(n log n)."""
    ranks = {v: r + 1 for r, v in enumerate(sorted(set(nums)))}
    k = len(ranks); tree = [0] * (k + 1); out = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        r = ranks[nums[i]]
        s, j = 0, r - 1                            # count of seen values with rank < r
        while j > 0: s += tree[j]; j -= j & -j
        out[i] = s
        j = r                                      # record this value
        while j <= k: tree[j] += 1; j += j & -j
    return out

def count_smaller_brute(nums):
    return [sum(nums[j] < nums[i] for j in range(i + 1, len(nums))) for i in range(len(nums))]

def count_smaller_insort(nums):                   # the common shortcut: a sorted list and bisect.insort
    seen, out = [], []
    for x in reversed(nums):
        out.append(bisect.bisect_left(seen, x)); bisect.insort(seen, x)
    return out[::-1]

rnd = random.Random(42)
for _ in range(500):
    nums = [rnd.randint(-10**9, 10**9) if rnd.random() < 0.3 else rnd.randint(-5, 5) for _ in range(rnd.randint(0, 40))]
    assert count_smaller_after(nums) == count_smaller_brute(nums) == count_smaller_insort(nums)
print("500 random arrays (duplicates and values up to 1e9): Fenwick = brute force = sorted list with insort")
print(count_smaller_after([5, 2, 6, 1]), "inversions in [5, 2, 6, 1]:", sum(count_smaller_after([5, 2, 6, 1])))

for n in (5_000, 100_000, 1_000_000):
    nums = [rnd.randint(0, 10**9) for _ in range(n)]
    t = time.perf_counter(); a = count_smaller_after(nums); tf = time.perf_counter() - t
    t = time.perf_counter(); b = count_smaller_insort(nums); ti = time.perf_counter() - t
    assert a == b
    extra = ""
    if n <= 5_000:
        t = time.perf_counter(); c = count_smaller_brute(nums); tb = time.perf_counter() - t; assert c == a; extra = f", brute force {tb * 1000:.0f} ms"
    print(f"n={n:>9,}: Fenwick {tf * 1000:.0f} ms, sorted list + insort {ti * 1000:.0f} ms{extra}")`,
        out: `500 random arrays (duplicates and values up to 1e9): Fenwick = brute force = sorted list with insort
[2, 1, 1, 0] inversions in [5, 2, 6, 1]: 4
n=    5,000: Fenwick 7 ms, sorted list + insort 4 ms, brute force 819 ms
n=  100,000: Fenwick 237 ms, sorted list + insort 841 ms
n=1,000,000: Fenwick 3580 ms, sorted list + insort 99846 ms`,
        notes: [
          { t: "p",
            text: "All three matched on 500 random arrays. At 5,000 elements the insort shortcut was fastest (4 ms against 7); at 100,000 the Fenwick tree was 3.5× faster; at a million it took 3.6 s against 100 s, because insort is quadratic in the end." },
          { t: "p",
            text: "Summing the output gives the number of inversions, a measure of how far a list is from sorted; merge sort can count it too, in the same O(n log n)." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the leaderboard that slowed down every season",
      body: [
        { t: "p",
          text: "**Symptom.** A game's \"what rank am I?\" endpoint got steadily slower over each season and was fast again after every reset." },
        { t: "p",
          text: "**Mechanism.** Ranks were computed by keeping all scores in a sorted list and calling insort on each new score, then bisect for the rank. Inserts were O(n) memory shifts; at a few million players each score update moved megabytes." },
        { t: "p",
          text: "**Fix.** A Fenwick tree over score buckets: an update adds one to a bucket, a rank is a prefix sum, both O(log range). Endpoint latency became flat across the season." }
      ] }
  ],

  takeaways: [
    "Fenwick and segment trees give **O(log n) updates and queries**.",
    "Fenwick node i covers the **block of length i & −i** ending at i; queries strip one bit per step.",
    "Measured at a million elements: slicing **11.5 s**, Fenwick **25 ms** for 10,000 operations.",
    "A prefix array is best when updates are rare; **rebuilding** it per update took 10.2 s at 100,000.",
    "Fenwick needs an **inverse** (sums, counts); use a **segment tree** for min, max or custom merges.",
    "Fenwick trees are **1-indexed** inside; convert once at the boundary.",
    "**Compress values to ranks** before indexing a tree by value.",
    "insort was faster at 5,000 elements and **28× slower** at a million: measure the crossover."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Which elements does Fenwick node 12 (1-indexed) cover?",
        options: ["Elements 1 to 12", "Elements 9 to 12", "Element 12 alone", "Elements 12 to 16"],
        answer: 1,
        why: "12 & −12 = 4, so node 12 covers the block of length 4 ending at 12: elements 9 to 12. Node 8 covers 1 to 8, which is why prefix(12) reads nodes 12 and 8." },
      { stem: "Why can't a Fenwick tree answer range minimum directly?",
        options: [
          "Minimum is not an associative operation",
          "It needs an inverse",
          "Its nodes overlap each other too much",
          "It can only store counts, not values"
        ],
        answer: 1,
        why: "A range sum is prefix(hi) − prefix(lo), which needs subtraction; there is no way to 'subtract' a minimum. Minimum is associative, which is why a segment tree handles it." },
      { stem: "Half of 10,000 operations are updates. Why was the prefix array slowest?",
        options: [
          "Its queries cost O(log n) each",
          "Each update is an O(n) rebuild",
          "It uses far too much memory",
          "accumulate is slow in Python"
        ],
        answer: 1,
        why: "Each of 5,000 updates rebuilt n prefix values. Its queries are O(1); the problem is the update rate. accumulate runs in C, which is why it was not even slower." },
      { stem: "Why compress values to ranks before a Fenwick tree over values?",
        options: [
          "To remove all of the duplicate values",
          "So the tree has k slots",
          "To sort the input array in place",
          "To make every one of the values positive"
        ],
        answer: 1,
        why: "A tree indexed by raw values up to 10⁹ would need 10⁹ slots; ranks keep it at the number of distinct values while preserving order. Duplicates share a rank and remain counted." }
    ] },

  interview: { title: "In an interview",
    sub: "Pick the structure from the mix of updates and queries.",
    questions: [
      { level: "core",
        q: "Support point updates and range-sum queries on an array.",
        strong: "A strong answer compares the options and implements a Fenwick tree.",
        answer: [
          { t: "p",
            text: "If updates are rare, a prefix array; if queries are rare, the plain array. With both frequent, a Fenwick tree: add(i, d) climbs with i += i & −i, prefix(i) descends with i −= i & −i, range sum is the difference of two prefixes. O(log n) each, O(n) memory, and about twelve lines." }
        ] },
      { level: "advanced",
        q: "Range minimum with updates.",
        strong: "A strong answer says why Fenwick does not fit and describes a segment tree.",
        answer: [
          { t: "p",
            text: "Minimum has no inverse, so Fenwick's prefix-difference trick does not apply. A segment tree stores the minimum of each node's range; an update rewrites a leaf and its O(log n) ancestors; a query combines O(log n) nodes that exactly cover the range. If the array is static, a sparse table gives O(1) queries after O(n log n) preprocessing." }
        ] },
      { level: "advanced",
        q: "Count the inversions in an array.",
        strong: "A strong answer gives two O(n log n) methods.",
        answer: [
          { t: "p",
            text: "Either modify merge sort to count, when merging, how many elements of the right half jump ahead of remaining left elements; or scan from the right with a Fenwick tree over compressed values, adding prefix(rank − 1) at each step. Both are O(n log n). The Fenwick version extends to 'count smaller after each position' directly." }
        ] }
    ] }
});

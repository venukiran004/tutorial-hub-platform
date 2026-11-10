/* ============================================================================
   LESSON 3.3 — DP on Sequences: LIS, LCS and Edit Distance
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "Three problems cover most dynamic programming on sequences: the longest increasing subsequence, the longest common subsequence, and edit distance. **Each is a table indexed by prefixes, filled from smaller prefixes to larger**, and each shows a different lesson about DP in practice: LIS has an O(n log n) version that is not a table at all, LCS shows how to recover the answer rather than only its length, and edit distance shows the row-by-row space reduction. All three are checked against brute force and timed.",

  objectives: [
    "Define a DP state over prefixes and write its recurrence",
    "Solve LIS in O(n²) and in O(n log n) with bisect, and know why the second works",
    "Recover an actual LCS or LIS by walking back through the table or parent links",
    "Reduce edit distance to two rows of memory",
    "Choose bisect_left or bisect_right for strict or non-strict increase"
  ],

  prerequisites: ["3.1", "2.2"],

  blocks: [
    { t: "h2", n: "01", id: "lis", text: "Longest increasing subsequence", sub: "From O(n²) to O(n log n)" },
    { t: "p",
      text: "The direct state is best[i], the length of the longest increasing subsequence ending at index i: one plus the best over earlier, smaller elements. That is O(n²). The faster version keeps a different state: tails[k], the smallest value that can end an increasing subsequence of length k + 1. tails is always sorted, so each new element finds its place with a binary search and either extends the longest run or lowers one tail. The length of tails is the answer." },
    { t: "code",
      lang: "python",
      title: "seqdp.py — LIS, LCS and edit distance against brute force, then timed",
      code: `import bisect, itertools, random, time

def lis_brute(a):                                 # every subsequence, longest strictly increasing one
    for k in range(len(a), 0, -1):
        for idx in itertools.combinations(range(len(a)), k):
            if all(a[idx[i]] < a[idx[i + 1]] for i in range(k - 1)): return k
    return 0

def lis_quadratic(a):                             # best[i] = longest increasing subsequence ending at i
    best = [1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i]: best[i] = max(best[i], best[j] + 1)
    return max(best, default=0)

def lis_bisect(a):                                # tails[k] = smallest tail of any increasing subsequence of length k + 1
    tails = []
    for x in a:
        k = bisect.bisect_left(tails, x)          # bisect_left: strictly increasing; bisect_right would allow equal values
        if k == len(tails): tails.append(x)
        else: tails[k] = x
    return len(tails)

def lcs(a, b):                                    # dp[i][j] = LCS of a[:i] and b[:j]
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    out, i, j = [], len(a), len(b)                # walk back through the table to recover one LCS
    while i and j:
        if a[i - 1] == b[j - 1]: out.append(a[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]: i -= 1
        else: j -= 1
    return dp[-1][-1], "".join(reversed(out))

def edit_distance(a, b):                          # two rows: dp over prefixes, O(len(a) * len(b)) time, O(len(b)) space
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1,                             # delete a[i-1]
                         cur[j - 1] + 1,                          # insert b[j-1]
                         prev[j - 1] + (a[i - 1] != b[j - 1]))    # replace, or keep if equal
        prev = cur
    return prev[-1]

def edit_distance_recursive(a, b):                # the recurrence written directly, no memo
    if not a: return len(b)
    if not b: return len(a)
    return min(edit_distance_recursive(a[1:], b) + 1, edit_distance_recursive(a, b[1:]) + 1,
               edit_distance_recursive(a[1:], b[1:]) + (a[0] != b[0]))

rnd = random.Random(33)
for _ in range(300):
    a = [rnd.randint(0, 9) for _ in range(rnd.randint(0, 12))]
    assert lis_brute(a) == lis_quadratic(a) == lis_bisect(a)
for _ in range(300):
    s, t = "".join(rnd.choices("abc", k=rnd.randint(0, 7))), "".join(rnd.choices("abc", k=rnd.randint(0, 7)))
    n, sub = lcs(s, t)
    def is_subseq(x, y): it = iter(y); return all(c in it for c in x)
    brute = max((k for k in range(len(s) + 1) for c in itertools.combinations(s, k) if is_subseq(c, t)), default=0)
    assert len(sub) == n == brute and is_subseq(sub, s) and is_subseq(sub, t)
    assert edit_distance(s, t) == edit_distance_recursive(s, t)
print("300 arrays: LIS brute force = O(n^2) = O(n log n); 300 string pairs: LCS = brute force and is a real common subsequence, edit distance table = plain recursion")
print("LIS of [10, 9, 2, 5, 3, 7, 101, 18]:", lis_bisect([10, 9, 2, 5, 3, 7, 101, 18]),
      "| LCS('ABCBDAB', 'BDCABA'):", lcs("ABCBDAB", "BDCABA"), "| edit('kitten', 'sitting'):", edit_distance("kitten", "sitting"))

print(f"\\n{'n':>7}{'LIS O(n^2) ms':>15}{'LIS bisect ms':>15}")
for n in (1_000, 2_000, 4_000, 1_000_000):
    a = [rnd.randint(0, 10**9) for _ in range(n)]
    t = time.perf_counter(); y = lis_bisect(a); tb = time.perf_counter() - t
    if n <= 4_000:
        t = time.perf_counter(); x = lis_quadratic(a); tq = time.perf_counter() - t; assert x == y
        print(f"{n:>7,}{tq * 1000:>15.0f}{tb * 1000:>15.2f}")
    else: print(f"{n:>7,}{'skipped':>15}{tb * 1000:>15.0f}   (LIS length {y:,})")

print(f"\\n{'len':>5}{'recursion ms':>14}{'table ms':>10}   edit distance of two random strings")
for L in (8, 10, 12):
    s, t = "".join(rnd.choices("acgt", k=L)), "".join(rnd.choices("acgt", k=L))
    t0 = time.perf_counter(); r = edit_distance_recursive(s, t); tr = time.perf_counter() - t0
    t0 = time.perf_counter(); d = edit_distance(s, t); td = time.perf_counter() - t0
    assert r == d
    print(f"{L:>5}{tr * 1000:>14.0f}{td * 1000:>10.3f}")`,
      out: `300 arrays: LIS brute force = O(n^2) = O(n log n); 300 string pairs: LCS = brute force and is a real common subsequence, edit distance table = plain recursion
LIS of [10, 9, 2, 5, 3, 7, 101, 18]: 4 | LCS('ABCBDAB', 'BDCABA'): (4, 'BCBA') | edit('kitten', 'sitting'): 3

      n  LIS O(n^2) ms  LIS bisect ms
  1,000             45           0.28
  2,000            167           0.27
  4,000            671           0.61
1,000,000        skipped            219   (LIS length 1,976)

  len  recursion ms  table ms   edit distance of two random strings
    8            59     0.044
   10          1750     0.039
   12         64437     0.053` },
    { t: "dl",
      items: [
        ["The quadratic LIS quadruples", "39–45 ms at 1,000 elements, 671 ms at 4,000: four times per doubling."],
        [
          "The bisect LIS barely moves",
          "Under 1 ms at 4,000 elements, and 219 ms for a million, where the quadratic version would take roughly 40 minutes by extrapolation."
        ],
        [
          "Recursion without a memo is exponential",
          "Edit distance by the bare recurrence took 59 ms, 1.75 s and 64 s for strings of 8, 10 and 12 characters; the table took 0.05 ms for all three."
        ]
      ] },
    { t: "ladder",
      title: "Longest strictly increasing subsequence",
      rungs: [
        { level: "bad",
          label: "Try every subsequence",
          why: "O(2ⁿ · n): only usable up to about 20 elements, and here only as a test oracle.",
          code: `def lis_brute(a):                                 # every subsequence, longest strictly increasing one
    for k in range(len(a), 0, -1):
        for idx in itertools.combinations(range(len(a)), k):
            if all(a[idx[i]] < a[idx[i + 1]] for i in range(k - 1)): return k
    return 0`,
          note: "Starting from the longest length and returning the first hit saves time, but not the exponent." },
        { level: "ok",
          label: "best[i] over earlier elements",
          why: "O(n²): the textbook DP, easy to extend to weighted or counted variants.",
          code: `def lis_quadratic(a):                             # best[i] = longest increasing subsequence ending at i
    best = [1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i]: best[i] = max(best[i], best[j] + 1)
    return max(best, default=0)`,
          note: "671 ms at 4,000 elements." },
        { level: "best",
          label: "Smallest tails with bisect",
          why: "O(n log n): 219 ms for a million elements.",
          code: `def lis_bisect(a):                                # tails[k] = smallest tail of any increasing subsequence of length k + 1
    tails = []
    for x in a:
        k = bisect.bisect_left(tails, x)          # bisect_left: strictly increasing; bisect_right would allow equal values
        if k == len(tails): tails.append(x)
        else: tails[k] = x
    return len(tails)`,
          note: "tails is not itself an increasing subsequence of the input; recovering one needs parent links (the exercise)." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "bisect_left or bisect_right decides strictness",
      body: [
        { t: "p",
          text: "With bisect_left, an equal value replaces an existing tail, so [2, 2, 2] has LIS 1: strictly increasing. With bisect_right it extends, giving 3: non-decreasing. Both are correct for their problem, and swapping them is a common, silent bug. The random tests here use values from 0 to 9, so duplicates are frequent and the choice is actually exercised." }
      ] },
    { t: "h2", n: "02", id: "lcs", text: "Common subsequences and edit distance", sub: "Two strings, one table" },
    { t: "p",
      text: "For two strings the state is a pair of prefix lengths. LCS: if the last characters match, one plus the LCS of both shorter prefixes, otherwise the better of dropping a character from either. Edit distance: the cheapest of deleting, inserting, or replacing (free if equal). The figure is the full edit-distance table for kitten → sitting, with one optimal path outlined; the bottom-right cell is the answer, 3." },
    { t: "viz",
      title: "Edit distance, kitten to sitting",
      caption: "Row r is the prefix of kitten of length r; column c the prefix of sitting of length c. Outlined cells trace one optimal alignment back from the corner: replace k with s, replace e with i, insert g.",
      svg: `<svg viewBox="0 0 438 304" width="100%" role="img">
<text x="30" y="31.0" text-anchor="end" class="s-sub"></text>
<rect x="40" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="31.0" text-anchor="middle" class="s-label">·</text>
<rect x="76" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="31.0" text-anchor="middle" class="s-label">s</text>
<rect x="112" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="31.0" text-anchor="middle" class="s-label">i</text>
<rect x="148" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="31.0" text-anchor="middle" class="s-label">t</text>
<rect x="184" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="31.0" text-anchor="middle" class="s-label">t</text>
<rect x="220" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="31.0" text-anchor="middle" class="s-label">i</text>
<rect x="256" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="31.0" text-anchor="middle" class="s-label">n</text>
<rect x="292" y="12" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="31.0" text-anchor="middle" class="s-label">g</text>
<text x="30" y="67.0" text-anchor="end" class="s-sub">·</text>
<rect x="40" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="56.0" y="67.0" text-anchor="middle" class="s-label" style="fill:var(--good)">0</text>
<rect x="76" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="67.0" text-anchor="middle" class="s-label">1</text>
<rect x="112" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="67.0" text-anchor="middle" class="s-label">2</text>
<rect x="148" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="67.0" text-anchor="middle" class="s-label">3</text>
<rect x="184" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="67.0" text-anchor="middle" class="s-label">4</text>
<rect x="220" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="67.0" text-anchor="middle" class="s-label">5</text>
<rect x="256" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="67.0" text-anchor="middle" class="s-label">6</text>
<rect x="292" y="48" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="67.0" text-anchor="middle" class="s-label">7</text>
<text x="30" y="103.0" text-anchor="end" class="s-sub">k</text>
<rect x="40" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="103.0" text-anchor="middle" class="s-label">1</text>
<rect x="76" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="92.0" y="103.0" text-anchor="middle" class="s-label" style="fill:var(--good)">1</text>
<rect x="112" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="103.0" text-anchor="middle" class="s-label">2</text>
<rect x="148" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="103.0" text-anchor="middle" class="s-label">3</text>
<rect x="184" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="103.0" text-anchor="middle" class="s-label">4</text>
<rect x="220" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="103.0" text-anchor="middle" class="s-label">5</text>
<rect x="256" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="103.0" text-anchor="middle" class="s-label">6</text>
<rect x="292" y="84" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="103.0" text-anchor="middle" class="s-label">7</text>
<text x="30" y="139.0" text-anchor="end" class="s-sub">i</text>
<rect x="40" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="139.0" text-anchor="middle" class="s-label">2</text>
<rect x="76" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="139.0" text-anchor="middle" class="s-label">2</text>
<rect x="112" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="128.0" y="139.0" text-anchor="middle" class="s-label" style="fill:var(--good)">1</text>
<rect x="148" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="139.0" text-anchor="middle" class="s-label">2</text>
<rect x="184" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="139.0" text-anchor="middle" class="s-label">3</text>
<rect x="220" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="139.0" text-anchor="middle" class="s-label">4</text>
<rect x="256" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="139.0" text-anchor="middle" class="s-label">5</text>
<rect x="292" y="120" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="139.0" text-anchor="middle" class="s-label">6</text>
<text x="30" y="175.0" text-anchor="end" class="s-sub">t</text>
<rect x="40" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="175.0" text-anchor="middle" class="s-label">3</text>
<rect x="76" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="175.0" text-anchor="middle" class="s-label">3</text>
<rect x="112" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="175.0" text-anchor="middle" class="s-label">2</text>
<rect x="148" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="164.0" y="175.0" text-anchor="middle" class="s-label" style="fill:var(--good)">1</text>
<rect x="184" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="175.0" text-anchor="middle" class="s-label">2</text>
<rect x="220" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="175.0" text-anchor="middle" class="s-label">3</text>
<rect x="256" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="175.0" text-anchor="middle" class="s-label">4</text>
<rect x="292" y="156" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="175.0" text-anchor="middle" class="s-label">5</text>
<text x="30" y="211.0" text-anchor="end" class="s-sub">t</text>
<rect x="40" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="211.0" text-anchor="middle" class="s-label">4</text>
<rect x="76" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="211.0" text-anchor="middle" class="s-label">4</text>
<rect x="112" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="211.0" text-anchor="middle" class="s-label">3</text>
<rect x="148" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="211.0" text-anchor="middle" class="s-label">2</text>
<rect x="184" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="200.0" y="211.0" text-anchor="middle" class="s-label" style="fill:var(--good)">1</text>
<rect x="220" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="211.0" text-anchor="middle" class="s-label">2</text>
<rect x="256" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="211.0" text-anchor="middle" class="s-label">3</text>
<rect x="292" y="192" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="211.0" text-anchor="middle" class="s-label">4</text>
<text x="30" y="247.0" text-anchor="end" class="s-sub">e</text>
<rect x="40" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="247.0" text-anchor="middle" class="s-label">5</text>
<rect x="76" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="247.0" text-anchor="middle" class="s-label">5</text>
<rect x="112" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="247.0" text-anchor="middle" class="s-label">4</text>
<rect x="148" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="247.0" text-anchor="middle" class="s-label">3</text>
<rect x="184" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="247.0" text-anchor="middle" class="s-label">2</text>
<rect x="220" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="236.0" y="247.0" text-anchor="middle" class="s-label" style="fill:var(--good)">2</text>
<rect x="256" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="272.0" y="247.0" text-anchor="middle" class="s-label">3</text>
<rect x="292" y="228" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="308.0" y="247.0" text-anchor="middle" class="s-label">4</text>
<text x="30" y="283.0" text-anchor="end" class="s-sub">n</text>
<rect x="40" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="56.0" y="283.0" text-anchor="middle" class="s-label">6</text>
<rect x="76" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="92.0" y="283.0" text-anchor="middle" class="s-label">6</text>
<rect x="112" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="128.0" y="283.0" text-anchor="middle" class="s-label">5</text>
<rect x="148" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="164.0" y="283.0" text-anchor="middle" class="s-label">4</text>
<rect x="184" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="200.0" y="283.0" text-anchor="middle" class="s-label">3</text>
<rect x="220" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="236.0" y="283.0" text-anchor="middle" class="s-label">3</text>
<rect x="256" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="272.0" y="283.0" text-anchor="middle" class="s-label" style="fill:var(--good)">2</text>
<rect x="292" y="264" width="32" height="28" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="308.0" y="283.0" text-anchor="middle" class="s-label" style="fill:var(--good)">3</text>
<text x="338" y="283.0" class="s-sub">distance 3</text>
</svg>` },
    { t: "callout",
      kind: "insight",
      title: "Each row needs only the row above",
      body: [
        { t: "p",
          text: "Edit distance reads only the previous row and the current one, so it can keep two lists of length len(b) + 1 instead of the full table: O(len(b)) memory. The cost is that the table needed to recover the alignment is gone; Hirschberg's algorithm recovers it in linear space with divide and conquer when both are needed." }
      ] },
    { t: "table",
      head: ["Problem", "State", "Recurrence", "Cost"],
      rows: [
        [
          "LIS",
          "best[i]: LIS ending at i",
          "1 + max best[j] for j < i, a[j] < a[i]",
          "O(n²), or O(n log n) with tails"
        ],
        ["LCS", "dp[i][j] over prefixes", "match: dp[i−1][j−1] + 1; else max of dropping one", "O(n·m)"],
        [
          "Edit distance",
          "dp[i][j] over prefixes",
          "min(delete, insert, replace or keep)",
          "O(n·m) time, O(m) space"
        ],
        ["Longest palindromic subsequence", "dp[i][j] over substrings", "LCS of the string and its reverse", "O(n²)"],
        ["Diff of two files", "LCS of lines", "Myers' algorithm in practice", "O((n + m)·D)"]
      ] },
    { t: "h2", n: "03", id: "recover", text: "Recovering the answer", sub: "Lengths are not enough" },
    { t: "p",
      text: "Interviewers and real systems usually want the subsequence or the alignment itself, not just its length. With a full table, walk back from the final cell choosing a move consistent with the recurrence, as the LCS code does. With the O(n log n) LIS there is no table, so record for each element the index that preceded it when it was placed." },
    { t: "exercise",
      kind: "Challenge",
      title: "Recover a longest increasing subsequence in O(n log n)",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Extend the tails algorithm to return one longest strictly increasing subsequence, not only its length. Verify on random arrays with many duplicates that the result is strictly increasing, is a subsequence of the input, and has the maximum length; then run it on a million values." }
      ],
      requirements: [
        "Track the index that ends each tail, alongside the tail values",
        "A predecessor link per element, set when it is placed",
        "Three checks: increasing, a subsequence, and maximum length",
        "Still O(n log n): a million values in well under a second"
      ],
      hint: "When x goes into position k, its predecessor is whichever element currently ends a subsequence of length k, at tail_idx[k − 1].",
      solution: { lang: "python",
        title: "lis_sequence.py",
        code: `import bisect, random, time

def lis_sequence(a):
    """One longest strictly increasing subsequence, O(n log n). tails holds values for bisect,
    tail_idx the index that ends each length, and prev links each element to the one before it."""
    tails, tail_idx, prev = [], [], [-1] * len(a)
    for i, x in enumerate(a):
        k = bisect.bisect_left(tails, x)
        if k == len(tails): tails.append(x); tail_idx.append(i)
        else: tails[k] = x; tail_idx[k] = i
        prev[i] = tail_idx[k - 1] if k else -1      # the best length-k subsequence so far ends at tail_idx[k-1]
    out, i = [], tail_idx[-1] if tail_idx else -1
    while i != -1: out.append(a[i]); i = prev[i]
    return out[::-1]

def lis_len_quadratic(a):
    best = [1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i]: best[i] = max(best[i], best[j] + 1)
    return max(best, default=0)

def is_subsequence(sub, a):
    it = iter(a); return all(x in it for x in sub)

rnd = random.Random(34)
for _ in range(1_000):
    a = [rnd.randint(0, 15) for _ in range(rnd.randint(0, 30))]
    s = lis_sequence(a)
    assert len(s) == lis_len_quadratic(a)                      # longest
    assert all(x < y for x, y in zip(s, s[1:]))                # strictly increasing
    assert is_subsequence(s, a)                                # really taken from a, in order
print("1,000 random arrays (with duplicates): the sequence is strictly increasing, a subsequence, and of maximum length")
print(lis_sequence([3, 10, 2, 1, 20, 4, 6, 7, 5, 8]))

a = [rnd.randint(0, 10**9) for _ in range(1_000_000)]
t = time.perf_counter(); s = lis_sequence(a); dt = time.perf_counter() - t
print(f"1,000,000 values: LIS of length {len(s):,} recovered in {dt * 1000:.0f} ms; valid: {is_subsequence(s, a) and all(x < y for x, y in zip(s, s[1:]))}")`,
        out: `1,000 random arrays (with duplicates): the sequence is strictly increasing, a subsequence, and of maximum length
[1, 4, 6, 7, 8]
1,000,000 values: LIS of length 1,982 recovered in 324 ms; valid: True`,
        notes: [
          { t: "p",
            text: "All three checks passed on 1,000 arrays with values from 0 to 15, so duplicates were common. A version that stored the predecessor's value rather than its index would fail exactly there, by linking to the wrong copy of a repeated value." },
          { t: "p",
            text: "A million values took 324 ms, against 219 ms for the length alone: the predecessor links cost about half again, and the walk back is O(length)." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the diff that took minutes",
      body: [
        { t: "p",
          text: "**Symptom.** A document-comparison feature timed out on contracts over a few thousand lines, though small documents were instant." },
        { t: "p",
          text: "**Mechanism.** It computed an LCS over characters with the full O(n·m) table, so two 200,000-character documents needed a 40-billion-cell table, and it kept the whole table to recover the alignment." },
        { t: "p",
          text: "**Fix.** Diff by lines first, using the standard library's difflib (which also anchors on unique lines), and compare characters only inside changed blocks. Large documents dropped to under a second." }
      ] }
  ],

  takeaways: [
    "Sequence DP states are **prefixes**: one index for one sequence, two for two.",
    "LIS: the O(n²) table, or **smallest tails with bisect** in O(n log n).",
    "Measured: **671 ms** at 4,000 elements for O(n²); **219 ms** at a million with bisect.",
    "**bisect_left** gives strictly increasing; bisect_right non-decreasing.",
    "Without memoisation, edit distance took **64 s** at 12 characters; the table **0.05 ms**.",
    "Edit distance needs only **two rows** of memory, unless you want the alignment.",
    "Recover answers by **walking back** through the table, or with **predecessor links**.",
    "Check recovered answers for **validity and optimality**, not only length."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "In the O(n log n) LIS, what does tails[k] hold?",
        options: [
          "An actual LIS, element by element",
          "The least tail of a length k+1 run",
          "The index of the k-th smallest value",
          "How many of the runs have length k"
        ],
        answer: 1,
        why: "tails[k] is the smallest value that can end an increasing subsequence of length k + 1. It is sorted, which allows binary search, but it is generally not itself a subsequence of the input." },
      { stem: "Using bisect_right instead of bisect_left computes…",
        options: [
          "The same strictly increasing answer",
          "The longest non-decreasing run",
          "The longest decreasing run",
          "An answer one too short"
        ],
        answer: 1,
        why: "bisect_right places an equal value after existing equal tails, so equal values can extend a run: non-decreasing. [2, 2, 2] gives 3 instead of 1." },
      { stem: "Why did the bare edit-distance recursion take 64 seconds at length 12?",
        options: [
          "Its strings are copied by slicing",
          "It repeats the same subproblems",
          "Python's recursion limit kicks in",
          "It has to compare every character"
        ],
        answer: 1,
        why: "Each call branches three ways and the same pairs of suffixes recur exponentially often; there are only 13 × 13 distinct subproblems. Slicing adds a factor, but not the exponent." },
      { stem: "Edit distance kept in two rows loses what?",
        options: [
          "Correctness on very long inputs",
          "The table to recover the edits",
          "The ability to count the insertions",
          "Nothing at all, it is lossless"
        ],
        answer: 1,
        why: "The distance is still exact, but walking back to recover which edits were made needs the full table, or Hirschberg's divide-and-conquer method." }
    ] },

  interview: { title: "In an interview",
    sub: "State the state, then the recurrence, then the order.",
    questions: [
      { level: "core",
        q: "Find the length of the longest increasing subsequence.",
        strong: "A strong answer gives the O(n²) DP, then the bisect version, and explains tails.",
        answer: [
          { t: "p",
            text: "best[i] = 1 + max(best[j]) over j < i with a[j] < a[i]: O(n²). Faster: keep tails, where tails[k] is the smallest possible last value of an increasing subsequence of length k + 1. For each x, bisect_left in tails: append if at the end, otherwise replace. tails stays sorted, its length is the answer, and the whole thing is O(n log n)." }
        ] },
      { level: "core",
        q: "Compute the edit distance between two words.",
        strong: "A strong answer gives the recurrence, base cases, and the space reduction.",
        answer: [
          { t: "p",
            text: "dp[i][j] is the distance between the first i characters of a and the first j of b. dp[i][0] = i and dp[0][j] = j. Otherwise the minimum of dp[i−1][j] + 1 (delete), dp[i][j−1] + 1 (insert) and dp[i−1][j−1] + (a[i−1] ≠ b[j−1]). O(n·m) time; keeping two rows makes it O(m) space if the alignment itself is not needed." }
        ] },
      { level: "advanced",
        q: "How would you diff two large files?",
        strong: "A strong answer moves from LCS to practical tools and their tricks.",
        answer: [
          { t: "p",
            text: "Conceptually it is an LCS over lines, but the full table is O(n·m) memory. Myers' algorithm runs in O((n + m)·D), where D is the number of differences, so near-identical files are fast; Hirschberg recovers the alignment in linear space. In Python, difflib does a heuristic version anchored on matching lines. Diff lines first, then characters inside changed regions." }
        ] }
    ] }
});

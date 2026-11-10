/* ============================================================================
   LESSON 5.1 — The Ladder: Linear Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "Twelve graded problems on the linear patterns of Phase 1: hashing, stacks, two pointers, windows, prefix sums and intervals. **Each has a statement, the pattern it uses, a hint, and a solution that was run: checked against a brute force on thousands of random cases and timed against it.** Work through them in order; the later ones combine ideas from the earlier ones.",

  objectives: [
    "Recognise which linear pattern a problem calls for",
    "Write a brute force first and use it to test the faster solution",
    "Handle the edge cases that random tests expose: zeros, negatives, duplicates, empty input",
    "Explain each solution's complexity and why it is correct"
  ],

  prerequisites: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.7"],

  blocks: [
    { t: "h2", n: "01", id: "how", text: "How to use the ladder", sub: "Easy to hard, each tested" },
    { t: "p",
      text: "The twelve problems below run from foundation to advanced, and each names the lesson whose pattern solves it. Try each one before opening the hint, and open the solution only after your version passes your own test. Every solution comes with a brute force, a random test of a few thousand cases against it, and a timing at a size where the difference shows. The figure collects those timings." },
    { t: "viz",
      title: "Speedup over the brute force, per problem",
      caption: "Bar length is the logarithm of how many times faster the pattern solution was than the obvious one, at the input size in each problem's output. Sizes differ between problems, so compare shapes, not bars.",
      svg: `<svg viewBox="0 0 760 356" width="100%" role="img">
<text x="230" y="28.0" text-anchor="end" class="s-label">P01 Two sum</text>
<rect x="240" y="14" width="401.7" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="649.7" y="28.0" class="s-sub">7,476×</text>
<text x="230" y="56.0" text-anchor="end" class="s-label">P02 Balanced brackets</text>
<rect x="240" y="42" width="247.3" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="495.3" y="56.0" class="s-sub">232×</text>
<text x="230" y="84.0" text-anchor="end" class="s-label">P03 Buy and sell once</text>
<rect x="240" y="70" width="291.2" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="539.2" y="84.0" class="s-sub">623×</text>
<text x="230" y="112.0" text-anchor="end" class="s-label">P04 Move zeroes in place</text>
<rect x="240" y="98" width="395.9" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="643.9" y="112.0" class="s-sub">6,554×</text>
<text x="230" y="140.0" text-anchor="end" class="s-label">P05 Group anagrams</text>
<rect x="240" y="126" width="395.0" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="643.0" y="140.0" class="s-sub">6,436×</text>
<text x="230" y="168.0" text-anchor="end" class="s-label">P06 Longest substring with a…</text>
<rect x="240" y="154" width="285.0" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="533.0" y="168.0" class="s-sub">542×</text>
<text x="230" y="196.0" text-anchor="end" class="s-label">P07 Product of all others</text>
<rect x="240" y="182" width="259.9" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="507.9" y="196.0" class="s-sub">308×</text>
<text x="230" y="224.0" text-anchor="end" class="s-label">P08 Days until a warmer day</text>
<rect x="240" y="210" width="269.4" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="517.4" y="224.0" class="s-sub">381×</text>
<text x="230" y="252.0" text-anchor="end" class="s-label">P09 Insert an interval</text>
<rect x="240" y="238" width="84.8" height="20" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="332.8" y="252.0" class="s-sub">6×</text>
<text x="230" y="280.0" text-anchor="end" class="s-label">P10 Subarrays divisible by k</text>
<rect x="240" y="266" width="407.6" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="655.6" y="280.0" class="s-sub">8,529×</text>
<text x="230" y="308.0" text-anchor="end" class="s-label">P11 Trapping rain water</text>
<rect x="240" y="294" width="227.9" height="20" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="475.9" y="308.0" class="s-sub">150×</text>
<text x="230" y="336.0" text-anchor="end" class="s-label">P12 Largest rectangle in a h…</text>
<rect x="240" y="322" width="352.1" height="20" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="600.1" y="336.0" class="s-sub">2,450×</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "Passing the examples is not passing",
      body: [
        { t: "p",
          text: "Several first attempts at these problems pass the given examples and fail on duplicates, zeros, negatives or empty input. That is why each solution here is checked on thousands of random small cases against a brute force, and why the random generators deliberately include zeros (P07), negatives (P10), repeated values (P08) and empty lists (most of them)." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Write the brute force first",
      body: [
        { t: "p",
          text: "In an interview, a correct brute force stated in a minute shows you understand the problem and gives you a way to test the better version. Then ask which repeated work it does: a rescan (hash it), a recomputed range (prefix or window), a search for the next larger item (stack)." }
      ] },
    { t: "h2", n: "02", id: "problems", text: "Twelve problems", sub: "Foundation to advanced" },
    { t: "exercise",
      kind: "Problem",
      title: "01. Two sum",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Given a list of integers and a target, return the indices of two different elements that sum to the target, or None. Pattern: lesson 1.2." }
      ],
      requirements: ["One pass with a dict from value to index", "Check for the complement before inserting the current value"],
      hint: "Ask \"have I already seen target − x?\" rather than \"is there a later y?\".",
      solution: { lang: "python",
        title: "p01.py",
        code: `import random, time

def two_sum(nums, target):                        # one pass: has the complement already been seen?
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen: return [seen[target - x], i]
        seen[x] = i
    return None

def two_sum_brute(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target: return [i, j]
    return None

rnd = random.Random(1)
for _ in range(1_000):
    nums = [rnd.randint(-20, 20) for _ in range(rnd.randint(0, 15))]; t = rnd.randint(-30, 30)
    r, b = two_sum(nums, t), two_sum_brute(nums, t)
    assert (r is None) == (b is None) and (r is None or (r[0] < r[1] and nums[r[0]] + nums[r[1]] == t))
nums = rnd.sample(range(10**7), 5_000); t = -1                       # no pair: both must scan everything
t0 = time.perf_counter(); two_sum_brute(nums, t); tb = time.perf_counter() - t0
t0 = time.perf_counter(); two_sum(nums, t); th = time.perf_counter() - t0
print(f"P01 two sum: 1,000 random cases valid; n=5,000 with no answer: brute {tb * 1000:.0f} ms, hash {th * 1000:.2f} ms ({tb / th:,.0f}x)")`,
        out: `P01 two sum: 1,000 random cases valid; n=5,000 with no answer: brute 4696 ms, hash 0.63 ms (7,476x)`,
        notes: [
          { t: "p",
            text: "Checking before inserting is what stops an element pairing with itself when x = target / 2." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "02. Balanced brackets",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Decide whether every bracket in a string is closed by the matching type in the right order; other characters are ignored. Pattern: lesson 1.3." }
      ],
      requirements: [
        "A stack of open brackets",
        "Fail on a closer with an empty stack or the wrong opener",
        "Succeed only if the stack ends empty"
      ],
      hint: "The most recent unmatched opener is the only one a closer may match: that is a stack.",
      solution: { lang: "python",
        title: "p02.py",
        code: `import random, time

def balanced(s):                                  # every closer must match the most recent unmatched opener
    pairs, stack = {")": "(", "]": "[", "}": "{"}, []
    for ch in s:
        if ch in "([{": stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]: return False
    return not stack

def balanced_brute(s):                            # repeatedly delete adjacent matched pairs until nothing changes
    s = "".join(ch for ch in s if ch in "()[]{}")
    while True:
        t = s.replace("()", "").replace("[]", "").replace("{}", "")
        if t == s: return s == ""
        s = t

rnd = random.Random(2)
for _ in range(3_000):
    s = "".join(rnd.choices("()[]{}x", k=rnd.randint(0, 12)))
    assert balanced(s) == balanced_brute(s)
s = "(" * 20_000 + ")" * 20_000
t0 = time.perf_counter(); balanced_brute(s); tb = time.perf_counter() - t0
t0 = time.perf_counter(); balanced(s); ts = time.perf_counter() - t0
print(f"P02 balanced brackets: 3,000 random strings agree; 40,000 nested brackets: repeated deletion {tb * 1000:.0f} ms, stack {ts * 1000:.1f} ms ({tb / ts:,.0f}x)")`,
        out: `P02 balanced brackets: 3,000 random strings agree; 40,000 nested brackets: repeated deletion 557 ms, stack 2.4 ms (232x)`,
        notes: [
          { t: "p",
            text: "The brute force, deleting matched pairs until nothing changes, is correct and quadratic; it took 557 ms on 40,000 nested brackets." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "03. Buy and sell once",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Given daily prices, return the largest profit from buying on one day and selling on a later day, or 0 if no profit is possible. Pattern: lesson 1.1." }
      ],
      requirements: ["One pass", "Track the lowest price so far and the best profit so far"],
      hint: "The best sale today uses the cheapest day before today.",
      solution: { lang: "python",
        title: "p03.py",
        code: `import random, time

def best_profit(prices):                          # sell today at the best price after the cheapest day so far
    lowest, best = float("inf"), 0
    for p in prices:
        lowest = min(lowest, p); best = max(best, p - lowest)
    return best

def best_profit_brute(prices):
    return max((prices[j] - prices[i] for i in range(len(prices)) for j in range(i + 1, len(prices))), default=0) if prices else 0

rnd = random.Random(3)
for _ in range(2_000):
    p = [rnd.randint(1, 50) for _ in range(rnd.randint(0, 15))]
    assert best_profit(p) == max(0, best_profit_brute(p))
p = [rnd.randint(1, 10**6) for _ in range(3_000)]
t0 = time.perf_counter(); b = best_profit_brute(p); tb = time.perf_counter() - t0
t0 = time.perf_counter(); f = best_profit(p); tf = time.perf_counter() - t0
assert max(0, b) == f
print(f"P03 buy and sell once: 2,000 random cases agree; n=3,000: all pairs {tb * 1000:.0f} ms, running minimum {tf * 1000:.2f} ms ({tb / tf:,.0f}x)")`,
        out: `P03 buy and sell once: 2,000 random cases agree; n=3,000: all pairs 353 ms, running minimum 0.57 ms (623x)`,
        notes: [
          { t: "p",
            text: "Returning max(0, …) matters: with falling prices every pair loses, and the answer is not to trade." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "04. Move zeroes in place",
      difficulty: "foundation",
      minutes: 10,
      body: [
        { t: "p",
          text: "Move every zero to the end of a list in place, keeping the order of the non-zero elements. Pattern: lesson 1.1." }
      ],
      requirements: ["O(n) time and O(1) extra space", "Order of non-zero elements preserved"],
      hint: "A write pointer marks where the next non-zero value goes; fill the rest with zeros afterwards.",
      solution: { lang: "python",
        title: "p04.py",
        code: `import random, time

def move_zeroes(nums):                            # in place, keeping order: a write pointer for the next non-zero
    w = 0
    for x in nums:
        if x != 0: nums[w] = x; w += 1
    for i in range(w, len(nums)): nums[i] = 0
    return nums

def move_zeroes_naive(nums):                      # remove each zero and append it: list.remove is O(n) per zero
    for _ in range(nums.count(0)): nums.remove(0); nums.append(0)
    return nums

rnd = random.Random(4)
for _ in range(2_000):
    a = [rnd.choice([0, 0, 1, 2, 3, -1]) for _ in range(rnd.randint(0, 15))]
    expected = [x for x in a if x != 0] + [0] * a.count(0)
    assert move_zeroes(a[:]) == move_zeroes_naive(a[:]) == expected
a = [rnd.choice([0, 1, 2]) for _ in range(100_000)]
t0 = time.perf_counter(); move_zeroes_naive(a[:]); tn = time.perf_counter() - t0
t0 = time.perf_counter(); move_zeroes(a[:]); tw = time.perf_counter() - t0
print(f"P04 move zeroes in place: 2,000 random cases correct; n=100,000: remove/append {tn * 1000:.0f} ms, write pointer {tw * 1000:.1f} ms ({tn / tw:,.0f}x)")`,
        out: `P04 move zeroes in place: 2,000 random cases correct; n=100,000: remove/append 30221 ms, write pointer 4.6 ms (6,554x)`,
        notes: [
          { t: "p",
            text: "The remove-and-append version took 30 seconds on 100,000 elements, because each list.remove shifts the list: an O(n²) algorithm hiding in two innocent calls." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "05. Group anagrams",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Group a list of words so that words made of the same letters are together. Pattern: lesson 1.2." }
      ],
      requirements: ["A canonical key per word", "One dict of lists, one pass"],
      hint: "Two words are anagrams exactly when their sorted letters are equal.",
      solution: { lang: "python",
        title: "p05.py",
        code: `import random, time
from collections import Counter, defaultdict

def group_anagrams(words):                        # the sorted letters are a key shared by exactly the anagrams
    groups = defaultdict(list)
    for w in words: groups["".join(sorted(w))].append(w)
    return list(groups.values())

def group_anagrams_pairwise(words):               # compare each word with one member of every existing group
    groups = []
    for w in words:
        for g in groups:
            if Counter(g[0]) == Counter(w): g.append(w); break
        else: groups.append([w])
    return groups

def canon(gs): return sorted(sorted(g) for g in gs)
rnd = random.Random(5)
for _ in range(1_000):
    ws = ["".join(rnd.choices("abc", k=rnd.randint(0, 4))) for _ in range(rnd.randint(0, 12))]
    assert canon(group_anagrams(ws)) == canon(group_anagrams_pairwise(ws))
ws = ["".join(rnd.choices("abcdefgh", k=6)) for _ in range(3_000)]
t0 = time.perf_counter(); a = group_anagrams_pairwise(ws); tp = time.perf_counter() - t0
t0 = time.perf_counter(); b = group_anagrams(ws); th = time.perf_counter() - t0
assert canon(a) == canon(b)
print(f"P05 group anagrams: 1,000 random cases agree; 3,000 words: pairwise {tp * 1000:.0f} ms, sorted-letter keys {th * 1000:.1f} ms ({tp / th:,.0f}x)")`,
        out: `P05 group anagrams: 1,000 random cases agree; 3,000 words: pairwise 10289 ms, sorted-letter keys 1.6 ms (6,436x)`,
        notes: [
          { t: "p",
            text: "Comparing each word against every group was 6,400× slower at 3,000 words. A tuple of 26 letter counts is an O(L) key instead of O(L log L), useful for long words." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "06. Longest substring with at most k distinct characters",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Return the length of the longest substring containing at most k distinct characters. Pattern: lesson 1.4." }
      ],
      requirements: ["A variable window with a Counter", "Delete a key when its count reaches zero"],
      hint: "Shrink while len(counter) > k; record after shrinking.",
      solution: { lang: "python",
        title: "p06.py",
        code: `import random, time
from collections import Counter

def longest_k_distinct(s, k):                     # variable window: shrink while more than k distinct characters
    count, left, best = Counter(), 0, 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while len(count) > k:
            count[s[left]] -= 1
            if count[s[left]] == 0: del count[s[left]]   # remove the key, or len(count) never shrinks
            left += 1
        best = max(best, right - left + 1)
    return best

def longest_k_distinct_brute(s, k):
    return max((j - i for i in range(len(s)) for j in range(i + 1, len(s) + 1) if len(set(s[i:j])) <= k), default=0)

rnd = random.Random(6)
for _ in range(1_000):
    s = "".join(rnd.choices("abcd", k=rnd.randint(0, 14))); k = rnd.randint(0, 4)
    assert longest_k_distinct(s, k) == longest_k_distinct_brute(s, k)
s = "".join(rnd.choices("abcdefghij", k=600))
t0 = time.perf_counter(); b = longest_k_distinct_brute(s, 3); tb = time.perf_counter() - t0
t0 = time.perf_counter(); w = longest_k_distinct(s, 3); tw = time.perf_counter() - t0
assert b == w
print(f"P06 longest substring with at most k distinct: 1,000 random cases agree; n=600: all substrings {tb * 1000:.0f} ms, window {tw * 1000:.2f} ms ({tb / tw:,.0f}x)")`,
        out: `P06 longest substring with at most k distinct: 1,000 random cases agree; n=600: all substrings 266 ms, window 0.49 ms (542x)`,
        notes: [
          { t: "p",
            text: "Forgetting to delete zero-count keys leaves len(counter) too large, and the window shrinks for no reason." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "07. Product of all others",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Return a list where each element is the product of all the other elements, without using division. Pattern: lesson 1.5." }
      ],
      requirements: ["Two passes: a running product from the left, then from the right", "Correct when the input contains zeros"],
      hint: "out[i] = (product of everything before i) × (product of everything after i).",
      solution: { lang: "python",
        title: "p07.py",
        code: `import math, random, time

def product_except_self(nums):                    # no division: product of everything left, times everything right
    n = len(nums); out = [1] * n
    left = 1
    for i in range(n): out[i] = left; left *= nums[i]
    right = 1
    for i in range(n - 1, -1, -1): out[i] *= right; right *= nums[i]
    return out

def product_except_self_brute(nums):
    return [math.prod(nums[:i] + nums[i + 1:]) for i in range(len(nums))]

rnd = random.Random(7)
for _ in range(2_000):
    a = [rnd.randint(-3, 3) for _ in range(rnd.randint(0, 10))]      # zeros included: division would fail on them
    assert product_except_self(a) == product_except_self_brute(a)
a = [rnd.choice([-1, 1, 2]) for _ in range(3_000)]
t0 = time.perf_counter(); b = product_except_self_brute(a); tb = time.perf_counter() - t0
t0 = time.perf_counter(); p = product_except_self(a); tp = time.perf_counter() - t0
assert b == p
print(f"P07 product of all others: 2,000 random cases agree (zeros included); n=3,000: recompute {tb * 1000:.0f} ms, prefix and suffix {tp * 1000:.1f} ms ({tb / tp:,.0f}x)")`,
        out: `P07 product of all others: 2,000 random cases agree (zeros included); n=3,000: recompute 463 ms, prefix and suffix 1.5 ms (308x)`,
        notes: [
          { t: "p",
            text: "Division fails on zeros; the random tests include them deliberately, with values from −3 to 3." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "08. Days until a warmer day",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "For each day, return how many days until a warmer temperature, or 0 if none. Pattern: lesson 1.3." }
      ],
      requirements: ["A stack of indices still waiting for a warmer day", "Each index pushed and popped once"],
      hint: "When a warmer day arrives, it answers every cooler day on top of the stack.",
      solution: { lang: "python",
        title: "p08.py",
        code: `import random, time

def days_until_warmer(temps):                     # a stack of days still waiting, temperatures decreasing upward
    out, stack = [0] * len(temps), []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop(); out[j] = i - j       # day i is the first warmer day for j
        stack.append(i)
    return out

def days_until_warmer_brute(temps):
    out = []
    for i, t in enumerate(temps):
        out.append(next((j - i for j in range(i + 1, len(temps)) if temps[j] > t), 0))
    return out

rnd = random.Random(8)
for _ in range(2_000):
    t = [rnd.randint(30, 40) for _ in range(rnd.randint(0, 15))]
    assert days_until_warmer(t) == days_until_warmer_brute(t)
t = list(range(5_000, 0, -1))                     # strictly cooling: the brute force scans to the end every time
t0 = time.perf_counter(); days_until_warmer_brute(t); tb = time.perf_counter() - t0
t0 = time.perf_counter(); days_until_warmer(t); ts = time.perf_counter() - t0
print(f"P08 days until warmer: 2,000 random cases agree; 5,000 cooling days: scan ahead {tb * 1000:.0f} ms, monotonic stack {ts * 1000:.1f} ms ({tb / ts:,.0f}x)")`,
        out: `P08 days until warmer: 2,000 random cases agree; 5,000 cooling days: scan ahead 331 ms, monotonic stack 0.9 ms (381x)`,
        notes: [
          { t: "p",
            text: "A strictly cooling sequence is the brute force's worst case, since every scan runs to the end; the stack is O(n) on any input." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "09. Insert an interval",
      difficulty: "core",
      minutes: 15,
      body: [
        { t: "p",
          text: "Insert a new interval into a sorted list of disjoint closed intervals, merging where needed. Pattern: lesson 1.7." }
      ],
      requirements: ["One pass in three phases: before, overlapping, after", "No re-sort"],
      hint: "Intervals ending before the new start are untouched; then absorb everything that starts at or before the new end.",
      solution: { lang: "python",
        title: "p09.py",
        code: `import random, time

def insert_interval(intervals, new):              # intervals sorted and disjoint; one pass: before, overlapping, after
    out, (s, e), i, n = [], new, 0, len(intervals)
    while i < n and intervals[i][1] < s: out.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:          # overlapping or touching: absorb
        s, e = min(s, intervals[i][0]), max(e, intervals[i][1]); i += 1
    out.append([s, e])
    return out + intervals[i:]

def insert_brute(intervals, new):                 # mark every covered half-point, then read the blocks back
    pts = {p for a, b in intervals + [new] for p in range(2 * a, 2 * b + 1)}   # doubled, so [1,3] and [4,6] stay apart
    out = []
    for p in sorted(pts):
        if out and p == out[-1][1] + 1: out[-1][1] = p
        else: out.append([p, p])
    return [[a // 2, b // 2] for a, b in out]

def random_disjoint(rnd, n, span):
    cuts = sorted(rnd.sample(range(span), 2 * n)); return [[cuts[2 * i], cuts[2 * i + 1]] for i in range(n)]

rnd = random.Random(9)
for _ in range(2_000):
    iv = random_disjoint(rnd, rnd.randint(0, 5), 40)
    s = rnd.randint(0, 60); new = [s, s + rnd.randint(0, 10)]
    assert insert_interval(iv, new) == insert_brute(iv, new)
iv = random_disjoint(rnd, 50_000, 10**7)
t0 = time.perf_counter(); r1 = sorted(iv + [[5_000_000, 5_100_000]]); m = []
for s, e in r1:
    if m and s <= m[-1][1]: m[-1][1] = max(m[-1][1], e)
    else: m.append([s, e])
tm = time.perf_counter() - t0
t0 = time.perf_counter(); r2 = insert_interval(iv, [5_000_000, 5_100_000]); ti = time.perf_counter() - t0
assert m == r2
print(f"P09 insert an interval: 2,000 random cases agree; 50,000 intervals: re-sort and merge {tm * 1000:.0f} ms, one pass {ti * 1000:.1f} ms ({tm / ti:,.0f}x)")`,
        out: `P09 insert an interval: 2,000 random cases agree; 50,000 intervals: re-sort and merge 31 ms, one pass 5.3 ms (6x)`,
        notes: [
          { t: "p",
            text: "A first brute-force oracle marked integer points and merged [1, 3] with [4, 6], which do not overlap; doubling the coordinates fixed the oracle. Re-sorting and merging was only 6× slower here, since sorting already-sorted data is fast in Timsort." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "10. Subarrays divisible by k",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Count the contiguous subarrays whose sum is divisible by k, with negative values allowed. Pattern: lesson 1.5." }
      ],
      requirements: ["Prefix sums modulo k with a counting dict", "Start with remainder 0 counted once"],
      hint: "Two prefixes with the same remainder bound a subarray divisible by k.",
      solution: { lang: "python",
        title: "p10.py",
        code: `import random, time
from collections import defaultdict

def count_divisible(nums, k):                     # equal prefix remainders mean the subarray between them is divisible by k
    seen = defaultdict(int); seen[0] = 1; total = count = 0
    for x in nums:
        total = (total + x) % k                   # Python's % is never negative for k > 0, so -1 % 5 == 4
        count += seen[total]; seen[total] += 1
    return count

def count_divisible_brute(nums, k):
    count = 0
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)): s += nums[j]; count += s % k == 0
    return count

rnd = random.Random(10)
for _ in range(2_000):
    a = [rnd.randint(-10, 10) for _ in range(rnd.randint(0, 15))]; k = rnd.randint(1, 7)
    assert count_divisible(a, k) == count_divisible_brute(a, k)
a = [rnd.randint(-100, 100) for _ in range(3_000)]
t0 = time.perf_counter(); b = count_divisible_brute(a, 7); tb = time.perf_counter() - t0
t0 = time.perf_counter(); c = count_divisible(a, 7); tc = time.perf_counter() - t0
assert b == c
print(f"P10 subarrays divisible by k: 2,000 random cases agree (negatives included); n=3,000: all subarrays {tb * 1000:.0f} ms, prefix remainders {tc * 1000:.2f} ms ({tb / tc:,.0f}x)")`,
        out: `P10 subarrays divisible by k: 2,000 random cases agree (negatives included); n=3,000: all subarrays 3649 ms, prefix remainders 0.43 ms (8,529x)`,
        notes: [
          { t: "p",
            text: "Python's % already returns a non-negative remainder for positive k; in languages where it does not, add k and take % again." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "11. Trapping rain water",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given bar heights, compute how much water is trapped between them after rain. Pattern: lesson 1.1." }
      ],
      requirements: ["O(n) time and O(1) extra space", "Two pointers moving inward"],
      hint: "Water above a bar is min(highest to the left, highest to the right) minus its height; the lower side's maximum is already final.",
      solution: { lang: "python",
        title: "p11.py",
        code: `import random, time

def trapped_water(h):                             # two pointers: the lower side's wall decides how much it holds
    left, right, lmax, rmax, water = 0, len(h) - 1, 0, 0, 0
    while left < right:
        if h[left] < h[right]:
            lmax = max(lmax, h[left]); water += lmax - h[left]; left += 1
        else:
            rmax = max(rmax, h[right]); water += rmax - h[right]; right -= 1
    return water

def trapped_water_brute(h):                       # each bar holds min(tallest to its left, tallest to its right) minus itself
    return sum(max(0, min(max(h[:i + 1]), max(h[i:])) - h[i]) for i in range(len(h)))

rnd = random.Random(11)
for _ in range(2_000):
    h = [rnd.randint(0, 6) for _ in range(rnd.randint(0, 15))]
    assert trapped_water(h) == trapped_water_brute(h)
print("example [0,1,0,2,1,0,1,3,2,1,2,1] holds", trapped_water([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))
h = [rnd.randint(0, 1_000) for _ in range(5_000)]
t0 = time.perf_counter(); b = trapped_water_brute(h); tb = time.perf_counter() - t0
t0 = time.perf_counter(); t = trapped_water(h); tt = time.perf_counter() - t0
assert b == t
print(f"P11 trapping rain water: 2,000 random cases agree; n=5,000: max per bar {tb * 1000:.0f} ms, two pointers {tt * 1000:.1f} ms ({tb / tt:,.0f}x)")`,
        out: `example [0,1,0,2,1,0,1,3,2,1,2,1] holds 6
P11 trapping rain water: 2,000 random cases agree; n=5,000: max per bar 225 ms, two pointers 1.5 ms (150x)`,
        notes: [
          { t: "p",
            text: "Prefix and suffix maximum arrays give O(n) with O(n) memory and are easier to prove; the two-pointer version removes the arrays." }
        ] } },
    { t: "exercise",
      kind: "Problem",
      title: "12. Largest rectangle in a histogram",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Find the area of the largest rectangle that fits under a histogram of bar heights. Pattern: lesson 1.3." }
      ],
      requirements: ["A monotonic stack of (start, height)", "A sentinel to flush the stack at the end"],
      hint: "A bar's rectangle extends until a lower bar arrives; when you pop it, you know both ends.",
      solution: { lang: "python",
        title: "p12.py",
        code: `import random, time

def largest_rectangle(h):                         # increasing stack of bars; a bar's rectangle ends when a lower bar arrives
    stack, best = [], 0
    for i, x in enumerate(h + [0]):               # the sentinel 0 flushes everything at the end
        start = i
        while stack and stack[-1][1] >= x:
            j, height = stack.pop()
            best = max(best, height * (i - j)); start = j    # the new bar can extend back to where the popped one began
        stack.append((start, x))
    return best

def largest_rectangle_brute(h):
    best = 0
    for i in range(len(h)):
        low = float("inf")
        for j in range(i, len(h)): low = min(low, h[j]); best = max(best, low * (j - i + 1))
    return best

rnd = random.Random(12)
for _ in range(2_000):
    h = [rnd.randint(0, 6) for _ in range(rnd.randint(0, 15))]
    assert largest_rectangle(h) == largest_rectangle_brute(h)
print("example [2,1,5,6,2,3] ->", largest_rectangle([2, 1, 5, 6, 2, 3]))
h = [rnd.randint(1, 10**4) for _ in range(4_000)]
t0 = time.perf_counter(); b = largest_rectangle_brute(h); tb = time.perf_counter() - t0
t0 = time.perf_counter(); s = largest_rectangle(h); ts = time.perf_counter() - t0
assert b == s
print(f"P12 largest rectangle in a histogram: 2,000 random cases agree; n=4,000: every pair {tb * 1000:.0f} ms, monotonic stack {ts * 1000:.1f} ms ({tb / ts:,.0f}x)")`,
        out: `example [2,1,5,6,2,3] -> 10
P12 largest rectangle in a histogram: 2,000 random cases agree; n=4,000: every pair 5744 ms, monotonic stack 2.3 ms (2,450x)`,
        notes: [
          { t: "p",
            text: "The popped bar's start becomes the new bar's start, because the new, lower bar extends left across it." }
        ] } },
    { t: "h2", n: "03", id: "after", text: "After the ladder", sub: "What to practise next" },
    { t: "table",
      head: ["If you struggled with", "Revisit", "Then try"],
      rows: [
        ["P01, P05", "1.2 Hash maps", "Longest consecutive sequence; four sum"],
        ["P02, P08, P12", "1.3 Stacks, 4.3 Monotonic queues", "Next greater element II; sum of subarray minimums"],
        ["P03, P04, P11", "1.1 Two pointers", "Container with most water; three sum"],
        ["P06", "1.4 Sliding window", "Minimum window substring; permutation in string"],
        ["P07, P10", "1.5 Prefix sums", "Subarray sum equals k; range sum query 2D"],
        ["P09", "1.7 Intervals", "Meeting rooms II; non-overlapping intervals"]
      ] },
    { t: "callout",
      kind: "scenario",
      title: "Interview: the candidate who tested out loud",
      body: [
        { t: "p",
          text: "**Situation.** Asked for trapping rain water, a candidate wrote the per-bar brute force in two minutes, then the two-pointer version, and ran both on three small inputs they made up, including an empty list and a single bar." },
        { t: "p",
          text: "**What happened.** The two-pointer version failed on [3, 0, 3] because of a < where ≤ was needed in their first draft; comparing with the brute force found it before the interviewer did." },
        { t: "p",
          text: "**Takeaway.** The brute force is not wasted time. It is the specification and the test, and stating that is part of a strong answer." }
      ] }
  ],

  takeaways: [
    "Name the **pattern** first: hash, stack, two pointers, window, prefix sum or interval.",
    "Write the **brute force** first; it is the specification and the test.",
    "Test on **thousands of random small cases**, with zeros, negatives, duplicates and empty input.",
    "Hidden O(n) calls such as **list.remove** turn loops quadratic: 30 s in P04.",
    "Monotonic stacks answer **next greater** and **span** questions in O(n): P08, P12.",
    "Prefix sums with a dict answer **subarray-sum** questions, negatives included: P10.",
    "Measured speedups ranged from **6×** (P09, already near-optimal) to over **8,000×** (P10).",
    "Revisit the named lesson for any problem that took more than its suggested time."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why does two sum check for the complement before inserting x?",
        options: [
          "It is faster to look up first",
          "So x cannot pair with itself",
          "Dicts must be read before written",
          "To keep the indices sorted"
        ],
        answer: 1,
        why: "If x were inserted first, target = 2x would match x with its own index. Order of operations is about correctness here, not speed." },
      { stem: "Which pattern solves 'days until a warmer day' in O(n)?",
        options: [
          "A sliding window of size k",
          "A monotonic stack of indices",
          "Sorting the temperatures first",
          "A prefix sum of temperatures"
        ],
        answer: 1,
        why: "Each warmer day pops and answers all cooler days still waiting, so every index is pushed and popped once. Sorting loses the order the question depends on." },
      { stem: "Product of all others without division. Why avoid division?",
        options: [
          "It is far too slow in Python",
          "It fails on a zero",
          "It loses integer precision",
          "It is not allowed in O(n) time"
        ],
        answer: 1,
        why: "Dividing the total product by nums[i] is undefined when nums[i] is 0, and wrong for the others when there are zeros. Python's integers keep full precision." },
      { stem: "P09 was only 6× faster than re-sorting. Why so little?",
        options: [
          "The one-pass version is incorrect",
          "Timsort is fast on sorted data",
          "There were too few intervals to tell",
          "Python lists are very slow to copy"
        ],
        answer: 1,
        why: "The input was already sorted, and Timsort detects runs, so the 'brute force' was nearly linear too. Both are correct; the one pass also avoids the copy." }
    ] },

  interview: { title: "In an interview",
    sub: "Brute force, pattern, test, complexity.",
    questions: [
      { level: "core",
        q: "How do you approach a problem you have not seen before?",
        strong: "A strong answer describes a repeatable process, not a memorised list.",
        answer: [
          { t: "p",
            text: "Restate it and pin down edge cases: empty input, duplicates, negatives, ties. Write the brute force and its complexity. Ask what work it repeats and which structure removes the repetition: a hash map for lookups, prefix sums for ranges, a window or two pointers for contiguous runs, a stack for nearest-greater. Implement, then test against the brute force on small cases before stating the final complexity." }
        ] },
      { level: "core",
        q: "Trapping rain water: explain the two-pointer solution.",
        strong: "A strong answer explains why the lower side's maximum is final.",
        answer: [
          { t: "p",
            text: "Water above a bar is bounded by the smaller of the highest bars on its two sides. With pointers at both ends, the side with the lower current bar is limited by its own running maximum, because the other side already has something at least as tall. So process that side, add its running maximum minus its height, and move inward. O(n) time, O(1) space." }
        ] },
      { level: "advanced",
        q: "Largest rectangle in a histogram.",
        strong: "A strong answer explains when a bar's rectangle is determined.",
        answer: [
          { t: "p",
            text: "Keep a stack of bars with increasing heights, each with the index where its rectangle can start. When a lower bar arrives, every taller bar on the stack can no longer extend right, so pop it and compute height × width; the new bar inherits the start of the last popped bar. A sentinel 0 at the end flushes the stack. O(n), since each bar is pushed and popped once." }
        ] }
    ] }
});

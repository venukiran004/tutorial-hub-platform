/* ============================================================================
   LESSON 1.4 — Sliding Window, Fixed and Variable
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "A sliding window turns \"look at every subarray\" into one pass. Two indices mark a range; the right one only moves forward, and the left one only moves forward, so each element enters the window once and leaves it once. **That is the whole argument for O(n)**, and it holds whether the window has a fixed width or grows and shrinks to keep a condition true. This lesson builds both forms, measures them against re-scanning, and finishes with the counting version that solves minimum window substring.",

  objectives: [
    "Slide a fixed-width window by adding the new element and removing the old one",
    "Write the variable window as expand-right, shrink-left-while-invalid",
    "Argue the O(n) bound from each index moving at most n times, and measure it",
    "Recognise when a window does not apply, such as sums with negative numbers",
    "Track a multiset condition with a counter and a single missing count"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [
    { t: "h2", n: "01", id: "fixed", text: "The fixed window", sub: "Add one, drop one" },
    { t: "p",
      text: "For a window of width k, the sum of the next window is the previous sum plus the element entering on the right minus the element leaving on the left. Re-summing each window costs O(k) per step and O(nk) overall; the running window costs O(1) per step. The same update works for any quantity that can be added and removed: a sum, a count of vowels, a frequency table." },
    { t: "callout",
      kind: "insight",
      title: "Ask what changes between neighbouring windows",
      body: [
        { t: "p",
          text: "Two adjacent windows share k − 1 elements. Any time a brute-force solution recomputes something over a range that has only moved by one, the question is whether the change can be applied as one addition and one removal. If it can, the window is O(n)." }
      ] },
    { t: "h2",
      n: "02",
      id: "variable",
      text: "The variable window",
      sub: "Expand right, shrink left while invalid" },
    { t: "p",
      text: "When the width is not fixed, the window is defined by a condition: no repeated character, a sum at least a target, at most k distinct values. The right index advances one step at a time; after each step, the left index advances for as long as the condition is broken (or, for a shortest-window problem, for as long as it still holds). Below, the window for \"longest substring with no repeated character\" on abcabcbb, recorded from a real run. When a repeat arrives, the left edge jumps past the earlier copy." },
    { t: "viz",
      title: "The window on abcabcbb",
      caption: "Outlined cells are the window after the right index reaches each position. Red rows are the steps where the incoming character was already inside, so the left edge jumped past its previous position.",
      svg: `<svg viewBox="0 0 572 286" width="100%" role="img">
<text x="68" y="34.0" text-anchor="end" class="s-sub">right = 2</text>
<rect x="78" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="95.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">a</text>
<rect x="116" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="133.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">b</text>
<rect x="154" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="171.0" y="34.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">c</text>
<rect x="192" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="209.0" y="34.0" text-anchor="middle" class="s-label">a</text>
<rect x="230" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="34.0" text-anchor="middle" class="s-label">b</text>
<rect x="268" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="285.0" y="34.0" text-anchor="middle" class="s-label">c</text>
<rect x="306" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="34.0" text-anchor="middle" class="s-label">b</text>
<rect x="344" y="12" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="34.0" text-anchor="middle" class="s-label">b</text>
<text x="392" y="34.0" class="s-sub">len 3</text>
<text x="68" y="88.0" text-anchor="end" class="s-sub">right = 3</text>
<rect x="78" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="88.0" text-anchor="middle" class="s-label">a</text>
<rect x="116" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="133.0" y="88.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">b</text>
<rect x="154" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="171.0" y="88.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">c</text>
<rect x="192" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="209.0" y="88.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">a</text>
<rect x="230" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="88.0" text-anchor="middle" class="s-label">b</text>
<rect x="268" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="285.0" y="88.0" text-anchor="middle" class="s-label">c</text>
<rect x="306" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="88.0" text-anchor="middle" class="s-label">b</text>
<rect x="344" y="66" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="88.0" text-anchor="middle" class="s-label">b</text>
<text x="392" y="88.0" class="s-sub">len 3, left jumped to 1</text>
<text x="68" y="142.0" text-anchor="end" class="s-sub">right = 5</text>
<rect x="78" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="142.0" text-anchor="middle" class="s-label">a</text>
<rect x="116" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="142.0" text-anchor="middle" class="s-label">b</text>
<rect x="154" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="171.0" y="142.0" text-anchor="middle" class="s-label">c</text>
<rect x="192" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="209.0" y="142.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">a</text>
<rect x="230" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="247.0" y="142.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">b</text>
<rect x="268" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="285.0" y="142.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">c</text>
<rect x="306" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="142.0" text-anchor="middle" class="s-label">b</text>
<rect x="344" y="120" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="142.0" text-anchor="middle" class="s-label">b</text>
<text x="392" y="142.0" class="s-sub">len 3, left jumped to 3</text>
<text x="68" y="196.0" text-anchor="end" class="s-sub">right = 6</text>
<rect x="78" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="196.0" text-anchor="middle" class="s-label">a</text>
<rect x="116" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="196.0" text-anchor="middle" class="s-label">b</text>
<rect x="154" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="171.0" y="196.0" text-anchor="middle" class="s-label">c</text>
<rect x="192" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="209.0" y="196.0" text-anchor="middle" class="s-label">a</text>
<rect x="230" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="196.0" text-anchor="middle" class="s-label">b</text>
<rect x="268" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="285.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">c</text>
<rect x="306" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="323.0" y="196.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">b</text>
<rect x="344" y="174" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="361.0" y="196.0" text-anchor="middle" class="s-label">b</text>
<text x="392" y="196.0" class="s-sub">len 2, left jumped to 5</text>
<text x="68" y="250.0" text-anchor="end" class="s-sub">right = 7</text>
<rect x="78" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="95.0" y="250.0" text-anchor="middle" class="s-label">a</text>
<rect x="116" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="133.0" y="250.0" text-anchor="middle" class="s-label">b</text>
<rect x="154" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="171.0" y="250.0" text-anchor="middle" class="s-label">c</text>
<rect x="192" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="209.0" y="250.0" text-anchor="middle" class="s-label">a</text>
<rect x="230" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="247.0" y="250.0" text-anchor="middle" class="s-label">b</text>
<rect x="268" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="285.0" y="250.0" text-anchor="middle" class="s-label">c</text>
<rect x="306" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="323.0" y="250.0" text-anchor="middle" class="s-label">b</text>
<rect x="344" y="228" width="34" height="34" rx="5" class="s-fill" style="stroke:var(--crit);stroke-width:2"/>
<text x="361.0" y="250.0" text-anchor="middle" class="s-label" style="fill:var(--crit)">b</text>
<text x="392" y="250.0" class="s-sub">len 1, left jumped to 7</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "window.py — brute force against the window, fixed and variable, with the inner loop counted",
      code: `import random, time

def longest_unique_brute(s):
    best = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):
            if s[j] in seen: break
            seen.add(s[j]); best = max(best, j - i + 1)
    return best

def longest_unique_set(s):
    seen, left, best = set(), 0, 0
    for right, ch in enumerate(s):
        while ch in seen:                                       # shrink one step at a time until ch is unique
            seen.remove(s[left]); left += 1
        seen.add(ch); best = max(best, right - left + 1)
    return best

def longest_unique_window(s):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left: left = last[ch] + 1        # jump past the previous copy
        last[ch] = right; best = max(best, right - left + 1)
    return best

def max_sum_fixed(nums, k):                                    # fixed window: add the new element, drop the old one
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]; best = max(best, window)
    return best

def shortest_at_least(nums, target):                           # variable window, positive numbers
    left, total, best, moves = 0, 0, float("inf"), 0
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1); total -= nums[left]; left += 1; moves += 1
    return (0 if best == float("inf") else best), moves

random.seed(0)
print(f"{'n':>6}{'brute ms':>10}{'window ms':>11}   longest substring with no repeated character")
for n in (2_000, 4_000, 8_000):
    s = "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(n))
    t = time.perf_counter(); a = longest_unique_brute(s); tb = time.perf_counter() - t
    t = time.perf_counter(); b = longest_unique_window(s); tw = time.perf_counter() - t
    assert a == b == longest_unique_set(s)
    print(f"{n:>6}{tb * 1000:>10.1f}{tw * 1000:>11.2f}   answer {a}")

nums = [random.randint(1, 100) for _ in range(200_000)]
t = time.perf_counter(); r = max_sum_fixed(nums, 1_000); tf = time.perf_counter() - t
t = time.perf_counter(); r2 = max(sum(nums[i:i + 1_000]) for i in range(0, len(nums) - 999, 1)); tn = time.perf_counter() - t
print(f"\\nmax sum of 1,000 consecutive values in 200,000: running window {tf * 1000:.0f} ms, re-summing each window {tn * 1000:.0f} ms, same: {r == r2}")
for n in (10_000, 100_000):
    _, moves = shortest_at_least([random.randint(1, 100) for _ in range(n)], 2_000)
    print(f"variable window over {n:,} items: the inner while loop ran {moves:,} times in total (never more than n)")`,
      out: `     n  brute ms  window ms   longest substring with no repeated character
  2000       3.2       0.36   answer 19
  4000       6.6       0.72   answer 22
  8000      12.8       2.55   answer 21

max sum of 1,000 consecutive values in 200,000: running window 28 ms, re-summing each window 837 ms, same: True
variable window over 10,000 items: the inner while loop ran 9,967 times in total (never more than n)
variable window over 100,000 items: the inner while loop ran 99,961 times in total (never more than n)` },
    { t: "dl",
      items: [
        [
          "The fixed window is 30× faster here",
          "Width 1,000 over 200,000 values: 28 ms for the running sum, 837 ms for re-summing every window. The gap grows with k."
        ],
        [
          "The brute force was only 5–10× slower",
          "Because a random string over 36 characters cannot have a repeat-free run longer than 36, the brute force's inner loop stops after at most 37 steps: it is O(n·min(n, alphabet)), not O(n²), on this input. On a long string with a large alphabet the gap becomes quadratic."
        ],
        [
          "The inner loop is not a nested O(n²)",
          "Over 100,000 items the shrinking while loop ran 99,961 times in total, fewer than n, because the left index only moves forward and cannot pass the end."
        ]
      ] },
    { t: "ladder",
      title: "Longest substring with no repeated character",
      rungs: [
        { level: "bad",
          label: "Every start, scan until a repeat",
          why: "Restarts from each index, so up to O(n·k) work for an alphabet of k, and O(n²) when k is large.",
          code: `def longest_unique_brute(s):
    best = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):
            if s[j] in seen: break
            seen.add(s[j]); best = max(best, j - i + 1)
    return best`,
          note: "Correct and easy to check against, which is what it is used for below." },
        { level: "ok",
          label: "Window with a set, shrink one step at a time",
          why: "O(n): each character is added once and removed at most once. The while loop looks nested but is amortised.",
          code: `def longest_unique_set(s):
    seen, left, best = set(), 0, 0
    for right, ch in enumerate(s):
        while ch in seen:                                       # shrink one step at a time until ch is unique
            seen.remove(s[left]); left += 1
        seen.add(ch); best = max(best, right - left + 1)
    return best`,
          note: "The standard template, and the one that generalises to other conditions." },
        { level: "best",
          label: "Window with last-seen positions",
          why: "Still O(n), but the left edge jumps straight past the previous copy, so there is no inner loop at all.",
          code: `def longest_unique_window(s):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left: left = last[ch] + 1        # jump past the previous copy
        last[ch] = right; best = max(best, right - left + 1)
    return best`,
          note: "The check last[ch] >= left matters: a copy that is already outside the window must not pull the left edge backwards." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Negative numbers break the shrink rule",
      body: [
        { t: "p",
          text: "\"Shortest subarray with sum at least target\" works with a window only when every value is positive, because then shrinking always lowers the sum and growing always raises it. With negative values, removing an element can raise the sum, so the left edge cannot be moved greedily and the window gives wrong answers. That version needs prefix sums (1.5) and a monotonic deque (4.3)." }
      ] },
    { t: "table",
      head: ["Signal in the problem", "Window form"],
      rows: [
        ["\"every subarray of length k\"", "Fixed: add the new element, drop the old one"],
        ["\"longest subarray such that…\"", "Variable: shrink while the condition is broken, record after"],
        ["\"shortest subarray such that…\"", "Variable: shrink while the condition holds, record inside the loop"],
        ["\"at most k distinct\" or \"contains all of\"", "Variable with a counter of what is inside"],
        ["\"exactly k\"", "atMost(k) − atMost(k − 1), two windows"],
        ["Sums with negative values", "Not a window: prefix sums and a hash map or deque"]
      ] },
    { t: "h2", n: "03", id: "counting", text: "Windows over a multiset", sub: "One counter and one number" },
    { t: "p",
      text: "Conditions such as \"contains every character of t, with repeats\" need to know what is inside the window. Keeping a full frequency table and comparing it to the target on every step costs O(alphabet) per step. Keeping one number, how many required characters are still missing, makes each step O(1): it goes down when an incoming character was still needed, and up when an outgoing character takes the window below what was needed." },
    { t: "exercise",
      kind: "Challenge",
      title: "Minimum window substring",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given strings s and t, return the shortest substring of s that contains every character of t, counting repeats, or the empty string if there is none. Make it O(len(s) + len(t)), and test it against a brute force on random small inputs." }
      ],
      requirements: [
        "A Counter of what is still needed, allowed to go negative for surplus",
        "A single missing count, so the validity check is O(1)",
        "Shrink from the left while the window is valid, recording the best inside the loop",
        "Agreement with a brute force on 2,000 random cases, including no-answer cases"
      ],
      hint: "need[ch] > 0 before decrementing means the character was still owed; need[s[left]] > 0 after incrementing means you just gave one back.",
      solution: { lang: "python",
        title: "min_window.py",
        code: `import random, time
from collections import Counter

def min_window(s, t):
    """Shortest substring of s containing every character of t (with multiplicity). O(len(s) + len(t))."""
    need = Counter(t); missing = len(t)          # characters still owed, counting repeats
    left, best = 0, (float("inf"), 0, 0)
    for right, ch in enumerate(s):
        if need[ch] > 0: missing -= 1            # this character paid off part of the debt
        need[ch] -= 1                            # negative means a surplus inside the window
        while missing == 0:                      # valid: shrink from the left while it stays valid
            if right - left + 1 < best[0]: best = (right - left + 1, left, right + 1)
            need[s[left]] += 1
            if need[s[left]] > 0: missing += 1   # dropped a character we needed
            left += 1
    return s[best[1]:best[2]] if best[0] != float("inf") else ""

def min_window_brute(s, t):
    need, best = Counter(t), ""
    for i in range(len(s)):
        for j in range(i + 1, len(s) + 1):
            if not need - Counter(s[i:j]):
                if not best or j - i < len(best): best = s[i:j]
                break
    return best

random.seed(4)
for _ in range(2_000):
    s = "".join(random.choice("abcd") for _ in range(random.randint(0, 14)))
    t = "".join(random.choice("abcd") for _ in range(random.randint(1, 4)))
    a, b = min_window(s, t), min_window_brute(s, t)
    assert len(a) == len(b) and (a == "" or not Counter(t) - Counter(a)), (s, t, a, b)
print("2,000 random cases agree with brute force (length and coverage)")
print(min_window("ADOBECODEBANC", "ABC"), min_window("aa", "aa"), repr(min_window("a", "aa")))

for n in (1_000, 2_000, 4_000):
    s = "".join(random.choice("abcdefghij") for _ in range(n)); t = "abcdefghij" * 2
    t0 = time.perf_counter(); min_window_brute(s, t); tb = time.perf_counter() - t0
    t0 = time.perf_counter(); min_window(s, t); tw = time.perf_counter() - t0
    print(f"n={n:>5}: brute {tb * 1000:7.0f} ms   window {tw * 1000:5.1f} ms")`,
        out: `2,000 random cases agree with brute force (length and coverage)
BANC aa ''
n= 1000: brute     156 ms   window   0.4 ms
n= 2000: brute     301 ms   window   0.8 ms
n= 4000: brute     655 ms   window   1.5 ms`,
        notes: [
          { t: "p",
            text: "The window solution agreed with the brute force on 2,000 random cases over a four-letter alphabet. A first version of the test compared coverage even when both returned the empty string, and failed on a case with no answer; the test was wrong, not the function, and now checks coverage only when an answer exists." },
          { t: "p",
            text: "On 4,000 characters the brute force took 655 ms and the window 1.5 ms. The brute force is far slower here than in section 2 because building a Counter for each candidate substring is itself O(length)." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the rate limiter that slowed down with traffic",
      body: [
        { t: "p",
          text: "**Symptom.** A per-user limiter allowing 100 requests in any 60-second window added 40 ms to each request for the heaviest users and almost nothing for everyone else." },
        { t: "p",
          text: "**Mechanism.** It kept a list of timestamps and, on each request, counted how many were within the last 60 seconds by scanning the whole list: a window recomputed from scratch, O(n) per request in the number of stored timestamps." },
        { t: "p",
          text: "**Fix.** A deque of timestamps used as a sliding window: pop from the left while the oldest is older than 60 seconds, then compare the length to the limit. Each timestamp is appended once and popped once, so the cost per request is amortised O(1)." }
      ] }
  ],

  takeaways: [
    "A window is O(n) because **each index enters once and leaves once**; neither edge moves backwards.",
    "Fixed width: add the new element, **drop the old one**. Measured 28 ms against 837 ms for re-summing.",
    "Variable width: **expand right, shrink left** while the condition requires it.",
    "Longest-window problems record after shrinking; **shortest-window** problems record inside the shrink loop.",
    "A nested while loop can still be linear: over 100,000 items it ran **99,961** times in total.",
    "Jump the left edge with last-seen positions, but **never backwards**: check the copy is inside the window.",
    "Negative numbers break greedy shrinking; use **prefix sums** instead.",
    "\"Exactly k\" is **atMost(k) − atMost(k − 1)**.",
    "For multiset conditions keep a counter and **one missing count**, so validity is O(1)."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why is the variable window O(n) despite a while loop inside the for loop?",
        options: [
          "The while loop runs once per outer step",
          "The left index never moves backwards",
          "Python optimises the nested loops away for you",
          "The window never exceeds a fixed size"
        ],
        answer: 1,
        why: "The left index only moves forward, so across the whole run it moves at most n times. The while loop can run many times on one step; Python does no such optimisation; and a variable window has no fixed size." },
      { stem: "Shortest subarray with sum ≥ target fails as a window when the input has…",
        options: ["Repeated values", "Negative values", "An even length", "A target of zero"],
        answer: 1,
        why: "With negatives, removing an element can raise the sum, so shrinking is no longer safe. Repeats, length parity and the target's value do not affect the window's correctness." },
      { stem: "Why does the last-seen version check last[ch] >= left before jumping?",
        options: [
          "To skip characters that are not letters",
          "So an old copy cannot pull left back",
          "To avoid a KeyError on the first visit",
          "To keep the dictionary small"
        ],
        answer: 1,
        why: "A previous copy outside the window must be ignored; jumping to it would move the left edge backwards and count a repeat. The get default handles missing keys, and the dictionary size is not the concern." },
      { stem: "How do you count subarrays with exactly k distinct values?",
        options: [
          "One window that shrinks above k",
          "atMost(k) minus atMost(k − 1)",
          "Sort first, then use two pointers",
          "A fixed window of width k"
        ],
        answer: 1,
        why: "Windows count \"at most\" naturally; exactly k is the difference of two such counts. A single window misses subarrays, sorting destroys contiguity, and the width is not k." }
    ] },

  interview: { title: "In an interview",
    sub: "Say the invariant and the amortised argument, not only the code.",
    questions: [
      { level: "core",
        q: "How do you know a problem wants a sliding window?",
        strong: "A strong answer names contiguity, a monotone condition, and the cases where it fails.",
        answer: [
          { t: "p",
            text: "The answer is a contiguous subarray or substring, and the condition is monotone in the window: if a window is valid, shrinking it (for at-most conditions) or growing it (for at-least conditions) keeps it valid. Then each edge can move greedily, forward only, and the work is O(n). If the condition is not monotone, as with sums over negative numbers, use prefix sums instead." }
        ] },
      { level: "core",
        q: "Your solution has a while loop inside a for loop. Why is it not O(n²)?",
        strong: "A strong answer gives the amortised argument in one sentence.",
        answer: [
          { t: "p",
            text: "The while loop only advances the left index, which never moves backwards and never passes the right index, so across the whole run it advances at most n times. Total work is the n steps of the right index plus at most n of the left: O(n). When I instrumented it, the inner loop ran 99,961 times over 100,000 items." }
        ] },
      { level: "advanced",
        q: "Design a rate limiter for 100 requests per user per minute.",
        strong: "A strong answer connects the sliding window to memory and accuracy trade-offs.",
        answer: [
          { t: "p",
            text: "A sliding log keeps each user's timestamps in a deque, evicts from the left those older than 60 seconds and compares the length to 100: exact, amortised O(1), but O(limit) memory per user. A sliding-window counter keeps two fixed-window counts and weights the previous one by its overlap, which is O(1) memory and approximate. A token bucket allows bursts. At scale the state lives in a shared store with atomic updates." }
        ] }
    ] }
});

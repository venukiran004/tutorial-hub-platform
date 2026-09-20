/* ============================================================================
   LESSON 16.1 — Arrays, Strings and Two Pointers
   ========================================================================= */
EC.receiveLesson({
  id: "16.1",

  lede: "Two pointers is one idea: **when a nested loop is doing redundant work, replace it with two indices that only ever move forwards.** It turns O(n²) into O(n) for a large family of problems, and recognising when it applies is worth more than memorising any individual solution.",

  objectives: [
    "Recognise the three two-pointer shapes and when each applies",
    "Write a sliding window that handles the shrink condition correctly",
    "Avoid Python's hidden O(n) operations inside a loop",
    "Handle in-place modification without corrupting the array",
    "Analyse and state the complexity out loud"
  ],

  prerequisites: ["3.4", "10.2"],

  blocks: [

    { t: "h2", n: "01", text: "The three shapes", id: "shapes" },

    { t: "viz",
      title: "Opposite ends, same direction, and fast/slow",
      caption: "Almost every two-pointer problem is one of these. Identifying which one applies is most of the solution, and each has a characteristic precondition.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Three two-pointer patterns illustrated on arrays">
  <text x="24" y="30" class="s-label" style="fill:var(--t-blue)">1 · OPPOSITE ENDS — needs a SORTED array</text>
  <g>
    <rect x="24" y="42" width="52" height="30" rx="4" style="fill:var(--t-blue);opacity:.3"/>
    <rect x="80" y="42" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="136" y="42" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="192" y="42" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="248" y="42" width="52" height="30" rx="4" style="fill:var(--t-blue);opacity:.3"/>
  </g>
  <text x="50" y="88" text-anchor="middle" class="s-sub" style="fill:var(--t-blue)">l →</text>
  <text x="274" y="88" text-anchor="middle" class="s-sub" style="fill:var(--t-blue)">← r</text>
  <text x="330" y="62" class="s-sub" style="fill:var(--ink-3)">two-sum · palindrome · container with most water</text>

  <text x="24" y="130" class="s-label" style="fill:var(--t-green)">2 · SLIDING WINDOW — a contiguous range</text>
  <g>
    <rect x="24" y="142" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="80" y="142" width="52" height="30" rx="4" style="fill:var(--t-green);opacity:.3"/>
    <rect x="136" y="142" width="52" height="30" rx="4" style="fill:var(--t-green);opacity:.3"/>
    <rect x="192" y="142" width="52" height="30" rx="4" style="fill:var(--t-green);opacity:.3"/>
    <rect x="248" y="142" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
  </g>
  <text x="106" y="188" text-anchor="middle" class="s-sub" style="fill:var(--t-green)">left →</text>
  <text x="218" y="188" text-anchor="middle" class="s-sub" style="fill:var(--t-green)">right →</text>
  <text x="330" y="162" class="s-sub" style="fill:var(--ink-3)">longest substring · min window · max sum of k</text>

  <text x="24" y="230" class="s-label" style="fill:var(--t-violet)">3 · FAST AND SLOW — different speeds</text>
  <g>
    <rect x="24" y="242" width="52" height="30" rx="4" style="fill:var(--t-violet);opacity:.3"/>
    <rect x="80" y="242" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="136" y="242" width="52" height="30" rx="4" style="fill:var(--t-violet);opacity:.3"/>
    <rect x="192" y="242" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <rect x="248" y="242" width="52" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
  </g>
  <text x="50" y="288" text-anchor="middle" class="s-sub" style="fill:var(--t-violet)">slow</text>
  <text x="162" y="288" text-anchor="middle" class="s-sub" style="fill:var(--t-violet)">fast</text>
  <text x="330" y="262" class="s-sub" style="fill:var(--ink-3)">cycle detection · middle of a list · in-place removal</text>
</svg>`
    },

    { t: "code", lang: "python", title: "shape 1 — opposite ends", code: `
def two_sum_sorted(nums: list[int], target: int) -> tuple[int, int] | None:
    """The precondition is SORTING. That is what makes the decision
    unambiguous: if the sum is too small, only moving left can help.

    O(n) time, O(1) space. The brute force is O(n^2).
    """
    left, right = 0, len(nums) - 1

    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return left, right
        if total < target:
            left += 1        # need MORE: the only way is a larger left
        else:
            right -= 1       # need LESS: the only way is a smaller right

    return None


def is_palindrome(s: str) -> bool:
    """Compare inwards. O(n) time, O(1) space -- note that
    s == s[::-1] is also O(n) time but allocates a full reversed copy,
    which matters on a large string."""
    left, right = 0, len(s) - 1
    while left < right:
        # Skip non-alphanumerics in place, rather than building a
        # cleaned copy first.
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left, right = left + 1, right - 1
    return True
`,
      hl: [8, 14, 27],
      caption: "**Say the invariant out loud in an interview**: \"if the sum is too small, the only way to increase it is to move `left` right, because everything to the left of `right` is smaller.\" That reasoning is what is being assessed."
    },

    { t: "h2", n: "02", text: "The sliding window", id: "window" },

    {"kind": "cells", "title": "The sliding window", "caption": "Two indices bound a window that only moves forward. Extending the right edge adds an element; shrinking the left edge removes one; each element enters and leaves once, so the whole pass is O(n) instead of O(n²).", "items": ["3", "1", "4", "1", "5", "9", "2", "6"], "highlight": [2, 3, 4], "negative": false, "label": "window [2, 5) sums to 10; slide right: add 9, drop 4", "t": "diagram", "id": "dg-16_1-02-0"},

    { t: "code", lang: "python", title: "one template, two variants", code: `
def longest_unique_substring(s: str) -> int:
    """VARIABLE window: grow right always, shrink left while the
    window is invalid.

    O(n): each index is added once and removed at most once, so the
    inner while loop is amortised O(1) despite being nested.
    """
    seen: dict[str, int] = {}      # char -> its last index
    left = best = 0

    for right, char in enumerate(s):
        # The shrink condition. "left <= seen[char]" is essential:
        # without it a repeat from BEFORE the window moves left
        # backwards, and the window becomes invalid.
        if char in seen and seen[char] >= left:
            left = seen[char] + 1
        seen[char] = right
        best = max(best, right - left + 1)

    return best


def max_sum_subarray(nums: list[int], k: int) -> int:
    """FIXED window: add the entering element, remove the leaving one.

    The point is not recomputing the sum -- that is what makes it O(n)
    rather than O(n*k).
    """
    window = sum(nums[:k])
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]
        best = max(best, window)
    return best
`,
      hl: [12, 15, 30],
      caption: "**The amortised argument is the part interviewers probe.** A `while` inside a `for` looks like O(n²) — explain that `left` only ever increases, so across the whole run it moves at most n times in total."
    },

    { t: "callout", kind: "trap", title: "Python operations that are secretly O(n)", body: [
      { t: "code", lang: "python", title: "each turns a linear solution quadratic", numbered: false, code: `
# 1. SLICING COPIES. s[i:j] allocates a new string of length j-i.
for i in range(n):
    if s[i:i+k] == pattern:      # O(k) copy per iteration -> O(n*k)
        ...
# Compare in place, or use a rolling hash.

# 2. list.pop(0) AND list.insert(0, x) SHIFT EVERY ELEMENT.
while queue:
    item = queue.pop(0)          # O(n) each -> O(n^2) overall
from collections import deque
queue = deque(); queue.popleft() # O(1)

# 3. STRING CONCATENATION IN A LOOP builds a new string each time.
result = ""
for c in chars:
    result += c                  # O(n^2) total
result = "".join(chars)          # O(n)

# 4. "in" ON A LIST IS A LINEAR SCAN.
for x in items:
    if x in seen_list:           # O(n) -> O(n^2)
        ...
seen = set()                     # O(1) membership

# 5. del arr[i] SHIFTS THE TAIL. Removing while iterating is both
#    O(n) per removal AND skips elements.`},
      { t: "p", text: "**These are the difference between a correct answer and a correct answer that passes.** An interviewer who sees `pop(0)` in a loop will ask about it, and the expected response is `deque`." }
    ]},

    { t: "h2", n: "03", text: "In-place modification", id: "in-place" },

    { t: "ladder",
      title: "Removing every occurrence of a value, in place",
      rungs: [
        { level: "bad", label: "Delete while iterating",
          why: "Deleting shifts every later element down one, and the loop's index has already moved on — so the element that slid into the vacated slot is never examined. It also costs O(n) per deletion.",
          code: `for i, x in enumerate(nums):
    if x == val:
        del nums[i]        # skips the next element, and O(n) each

# [3, 3, 2] with val=3 -> [3, 2]. One 3 survives.` },
        { level: "ok", label: "Build a new list",
          why: "Correct and clear, and the usual right answer in real code. It is rejected here only because the problem says in place — an interviewer asking for O(1) space wants the pointer technique.",
          code: `nums[:] = [x for x in nums if x != val]
# O(n) time, O(n) auxiliary space. Note nums[:] = mutates in place
# even though a new list is built.` },
        { level: "best", label: "Fast and slow pointers",
          why: "`slow` marks where the next kept element goes; `fast` scans. One pass, no allocation, and every element is examined exactly once.",
          code: `def remove_all(nums: list[int], val: int) -> int:
    """Returns the new logical length. Everything before it is kept.

    O(n) time, O(1) space.
    """
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1
    return slow

# The same shape solves: remove duplicates from a sorted array, move
# zeroes to the end, partition by a predicate. Whenever the task is
# "compact the array according to a rule", it is this.`,
          note: "**Say what `slow` means before you write the loop.** \"`slow` is the index where the next kept element goes\" makes the code obvious and is what the interviewer wants to hear." }
      ]
    },

    { t: "h2", n: "04", text: "Choosing the pattern", id: "choosing" },

    { t: "table",
      head: ["The problem says", "Reach for", "Typical complexity"],
      rows: [
        ["Sorted array, find a pair", "**Opposite ends**", "O(n) after O(n log n) sort"],
        ["Longest/shortest contiguous …", "**Sliding window**", "O(n)"],
        ["Exactly k elements", "Fixed window", "O(n)"],
        ["In-place, O(1) space", "**Fast and slow**", "O(n)"],
        ["Subarray sum equals k", "**Prefix sums + hash map**", "O(n) — not a window"],
        ["All pairs/triples", "Sort, then fix one and two-point the rest", "O(n²)"]
      ],
      caption: "**\"Subarray sum equals k\" is the trap.** A sliding window needs a monotonic validity condition — with negative numbers, growing the window can decrease the sum, so shrinking is not a valid response and the window breaks."
    },

    { t: "code", lang: "python", title: "when the window does not apply", code: `
def subarray_sum_equals_k(nums: list[int], k: int) -> int:
    """Counts subarrays summing to k, WITH negative numbers allowed.

    A sliding window fails here: growing the window can decrease the
    sum, so "too big -> shrink" is not sound. Prefix sums are the
    right tool.

    If prefix[j] - prefix[i] == k, then prefix[i] == prefix[j] - k.
    So at each j, ask how many earlier prefixes had that value.
    """
    counts = {0: 1}          # the empty prefix, so a subarray from
    total = running = 0      # index 0 is counted

    for x in nums:
        running += x
        total += counts.get(running - k, 0)
        counts[running] = counts.get(running, 0) + 1

    return total

# O(n) time, O(n) space. The pattern -- "store what you have seen, so
# the answer at each step is a lookup" -- is Lesson 16.2.
`,
      hl: [11, 15],
      caption: "**Knowing why the window fails matters more than knowing the alternative.** An interviewer will often supply the negative-number twist specifically to see whether you notice."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Minimum window substring",
      difficulty: "advanced",
      minutes: 38,
      body: [
        { t: "p", text: "Given strings `s` and `t`, return the shortest substring of `s` containing every character of `t` including duplicates. Return `\"\"` if there is none." },
        { t: "code", lang: "python", numbered: false, title: "examples", code: `
s = "ADOBECODEBANC", t = "ABC"   ->  "BANC"
s = "a",            t = "a"      ->  "a"
s = "a",            t = "aa"     ->  ""      # two a's needed, one available
s = "ab",           t = "b"      ->  "b"`},
        { t: "p", text: "Solve it in O(n). Then explain the amortised argument, and what changes if `t` may contain characters not present in `s`." }
      ],
      requirements: [
        "Give an O(|s| + |t|) solution.",
        "Explain why the nested while loop is still linear.",
        "Handle duplicate characters in `t` correctly.",
        "Track validity in O(1) per step, not by comparing dictionaries.",
        "Give the edge cases and why each matters.",
        "State the space complexity precisely."
      ],
      hint: "You need to know when the window is valid without rescanning it. Track a single count of how many required characters are currently satisfied.",
      solution: {
        lang: "python",
        title: "min_window.py",
        code: `# =========================================================================
# THE APPROACH
# =========================================================================
#
# A VARIABLE SLIDING WINDOW, with the usual two phases:
#
#   EXPAND  move right until the window contains all of t
#   CONTRACT move left while it still does, recording the best
#
# The whole difficulty is answering "does the window contain all of
# t?" in O(1), because doing it by comparing two dictionaries is
# O(alphabet) per step and turns the solution into O(n * 128).
#
# THE TRICK: maintain a single integer, "formed" -- the number of
# DISTINCT characters whose required count is currently met. The
# window is valid exactly when formed == len(need).
#
#   - increment formed only when a character's count REACHES its
#     requirement (not when it exceeds it)
#   - decrement only when it FALLS BELOW
#
# That "reaches exactly" condition is what makes duplicates correct:
# t = "AABC" needs two A's, and the third A must not increment
# formed again.


from collections import Counter


def min_window(s: str, t: str) -> str:
    """O(|s| + |t|) time, O(|s| + |t|) space."""
    if not s or not t or len(t) > len(s):
        return ""

    need = Counter(t)              # char -> how many we need
    window: dict[str, int] = {}    # char -> how many we have
    required = len(need)           # distinct chars to satisfy
    formed = 0                     # how many are currently satisfied

    left = 0
    best_len = float("inf")
    best_start = 0

    for right, char in enumerate(s):
        # --- EXPAND -------------------------------------------------
        if char in need:
            window[char] = window.get(char, 0) + 1
            # EXACTLY equal, not >=. A fourth 'A' when we need three
            # must not count again -- that is the duplicate case.
            if window[char] == need[char]:
                formed += 1

        # --- CONTRACT while still valid -----------------------------
        while formed == required:
            if right - left + 1 < best_len:
                best_len = right - left + 1
                best_start = left

            leaving = s[left]
            if leaving in need:
                window[leaving] -= 1
                # Only now is the window invalid. If we had 4 A's and
                # need 3, removing one leaves 3 -- still valid, so
                # formed must not decrease.
                if window[leaving] < need[leaving]:
                    formed -= 1
            left += 1

    return "" if best_len == float("inf") else s[best_start:best_start + best_len]


# =========================================================================
# WHY THE NESTED WHILE IS STILL LINEAR
# =========================================================================
#
# The structure looks like O(n^2):
#
#   for right in range(n):        # n iterations
#       while ...:                # ...times how many?
#
# THE AMORTISED ARGUMENT:
#
#   - "left" only ever INCREASES, and never exceeds n
#   - so across the ENTIRE run, the inner while body executes at most
#     n times in total, not n times per outer iteration
#   - each execution is O(1)
#
#   total inner work = O(n), not O(n^2)
#
# Equivalently: each index enters the window exactly once and leaves
# at most once. 2n pointer movements, O(1) work each.
#
# This is THE argument to state out loud. An interviewer who sees a
# while inside a for will ask, and "left is monotonic, so the total
# work is bounded by n" is the answer they want.
#
#
# =========================================================================
# EDGE CASES, AND WHY EACH MATTERS
# =========================================================================
#
#   s="", t="A"        -> ""     the guard clause; without it,
#                                enumerate does nothing and best_len
#                                stays inf, which happens to be
#                                correct -- but the explicit guard is
#                                clearer
#
#   s="a", t="aa"      -> ""     THE DUPLICATE CASE. need={"a":2},
#                                window reaches 1, formed never
#                                reaches required. A solution using a
#                                set instead of a Counter returns "a"
#                                here, which is wrong.
#
#   len(t) > len(s)    -> ""     cheap early exit
#
#   t has chars not in s         formed never reaches required, so
#                                the loop completes and "" is
#                                returned. NOTHING SPECIAL IS NEEDED
#                                -- the invariant handles it. Worth
#                                saying explicitly, because the
#                                interviewer is checking whether you
#                                reach for a special case that is not
#                                required.
#
#   s == t             -> s      the window is the whole string
#
#   t="AABC", s="ABAC" -> "ABAC" duplicates spanning the window
#
#
# =========================================================================
# COMPLEXITY
# =========================================================================
#
#   TIME:   O(|s| + |t|)
#             |t| to build the Counter
#             |s| for the scan -- each index enters and leaves once
#
#   SPACE:  O(|s| + |t|)
#             need   holds at most |t| distinct chars
#             window holds at most |s| distinct chars
#
#           If the alphabet is fixed -- ASCII, say -- both are O(1)
#           in the alphabet size, so it is often quoted as O(1)
#           auxiliary space. STATE THE ASSUMPTION rather than just
#           the number; that distinction is frequently the follow-up
#           question.
#
#           Note the returned slice is O(|result|) additional, which
#           is unavoidable given the required return type.


# =========================================================================
# THE VARIANTS THEY WILL ASK NEXT
# =========================================================================
#
# 1. "Return all minimum windows, not one."
#      Collect starts when best_len is EQUALLED, reset the list when
#      it is beaten.
#
# 2. "What if the string is a stream?"
#      This already works: it is one forward pass, and only the
#      window plus the best-so-far is retained. It never looks
#      backwards.
#
# 3. "Optimise for a t much shorter than s."
#      Filter s to the indices of characters that appear in t, and
#      slide over that reduced list. Same complexity, far fewer
#      iterations when s is mostly irrelevant characters.
#
# 4. "Longest substring with at most k distinct characters."
#      The same template; only the validity condition changes to
#      len(window) <= k. Recognising that these are one problem is
#      the point of learning the template rather than the solution.


# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("s,t,expected", [
    ("ADOBECODEBANC", "ABC",  "BANC"),
    ("a",             "a",    "a"),
    ("a",             "aa",   ""),        # the duplicate case
    ("ab",            "b",    "b"),
    ("",              "a",    ""),
    ("a",             "",     ""),
    ("aa",            "aa",   "aa"),
    ("ABAC",          "AABC", "ABAC"),    # duplicates spanning
    ("abc",           "xyz",  ""),        # no chars in common
])
def test_min_window(s, t, expected):
    assert min_window(s, t) == expected


def test_duplicates_are_counted_not_just_present():
    """The bug a set-based solution has."""
    assert min_window("aa", "aaa") == ""
    assert min_window("aaa", "aa") == "aa"


def test_linear_time():
    """The amortised claim, measured. Doubling the input must roughly
    double the time, not quadruple it."""
    small = timeit(lambda: min_window("AB" * 5_000, "AAB"), number=10)
    large = timeit(lambda: min_window("AB" * 10_000, "AAB"), number=10)

    assert large < small * 3, "looks quadratic"`,
        notes: [
          { t: "p", text: "**The `formed` counter is the whole technique.** Comparing two dictionaries at every step to test validity is O(alphabet) per index; a single integer tracking how many characters are currently satisfied makes the check O(1)." },
          { t: "p", text: "**Incrementing on `==` rather than `>=` is what makes duplicates correct.** With `t = \"AAB\"`, a fourth `A` must not increment `formed` again — and symmetrically, removing one when four are present must not decrement it." },
          { t: "callout", kind: "insight", title: "State the amortised argument before being asked", body: [
            { t: "p", text: "A `while` inside a `for` looks quadratic, and an interviewer will probe it. The answer is that `left` is monotonic and bounded by n, so the inner body executes at most n times across the entire run rather than n times per outer iteration." },
            { t: "p", text: "The equivalent phrasing is often clearer: each index enters the window exactly once and leaves at most once, so there are at most 2n pointer movements doing O(1) work each." }
          ]},
          { t: "p", text: "**Characters of `t` absent from `s` need no special case.** `formed` simply never reaches `required` and the function returns `\"\"` — saying so explicitly shows you have reasoned about the invariant rather than reaching for a guard clause." },
          { t: "p", text: "**State the space assumption rather than just the number.** O(|s| + |t|) in general, or O(1) if the alphabet is fixed — which of those you say is frequently the follow-up question, and giving both pre-empts it." },
          { t: "p", text: "**\"Longest substring with at most k distinct characters\" is the same code** with one line changed in the validity condition. Learning the template rather than the solution is what makes the next problem five minutes instead of thirty." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A log-processing service was rewritten from a nested loop to a sliding window and got faster in testing — then slower in production on real files." },
      { t: "p", text: "**The window was implemented with `list.pop(0)`.** Each removal shifted every remaining element, so the linear algorithm carried an O(n) operation inside its loop and was quadratic overall — worse than the nested loop it replaced." },
      { t: "p", text: "**Changing `list` to `collections.deque` fixed it entirely**, one import and one line. The algorithm had always been right; the data structure was not." },
      { t: "p", text: "**Complexity analysis assumes your primitives are O(1).** In Python `pop(0)`, `insert(0, x)`, `in` on a list, and slicing are not, and each one silently adds a factor of n." }
    ]}
  ],

  takeaways: [
    "**Two pointers replaces a nested loop when the redundant work has a direction** — the pointers only ever move forwards.",
    "**Opposite ends needs a sorted array**, because sorting is what makes \"too small, move left\" the only valid response.",
    "**A sliding window needs a monotonic validity condition.** With negative numbers, growing can decrease the sum, so the window breaks — use prefix sums.",
    "**Track validity with a single counter, not by comparing dictionaries** — that is the difference between O(n) and O(n × alphabet).",
    "**Increment on equality, not on `>=`.** It is what makes duplicate requirements correct in both directions.",
    "**State the amortised argument out loud**: `left` is monotonic and bounded by n, so a `while` inside a `for` is still linear.",
    "**Fast and slow pointers is the shape for in-place compaction** — `slow` marks where the next kept element goes.",
    "**Never delete while iterating.** It shifts the tail, skips the element that slid into place, and costs O(n) per removal.",
    "**Slicing copies.** `s[i:i+k]` inside a loop turns O(n) into O(n × k).",
    "**`list.pop(0)` and `insert(0, x)` are O(n).** Use `collections.deque` for a queue.",
    "**`in` on a list is a linear scan**; on a set it is O(1).",
    "**String concatenation in a loop is quadratic.** Collect and `\"\".join(...)`.",
    "**Complexity analysis assumes O(1) primitives** — in Python several common operations are not, and each adds a factor of n.",
    "**Say the invariant before writing the loop.** \"`slow` is where the next kept element goes\" is what makes the code obvious to a reader and to an interviewer."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A sliding window solution has a `while` loop inside a `for` loop. Is it O(n²)?",
        options: [
          "Yes — nested loops are always quadratic",
          "No — `left` only increases and is bounded by n, so the inner body runs at most n times across the whole scan",
          "Only if the window can shrink to zero",
          "It depends on the alphabet size"
        ],
        answer: 1,
        why: "This is the amortised argument, and it is the question interviewers ask when they see the structure. Equivalently: each index enters the window once and leaves at most once, so there are at most 2n pointer movements doing constant work each."
      },
      {
        stem: "Why does a sliding window fail for \"count subarrays summing to k\" when negatives are allowed?",
        options: [
          "The sum can exceed integer limits",
          "Growing the window can decrease the sum, so \"too large, shrink\" is not a valid response — the validity condition is not monotonic",
          "Negative numbers break the pointer ordering",
          "It works, but requires sorting first"
        ],
        answer: 1,
        why: "The window technique depends on knowing which direction helps. With negatives that inference is invalid, so the right tool is prefix sums with a hash map: if `prefix[j] - prefix[i] == k` then `prefix[i] == prefix[j] - k`, which is a lookup."
      },
      {
        stem: "`for i, x in enumerate(nums): if x == val: del nums[i]` — what goes wrong?",
        options: [
          "Nothing, though it is slow",
          "Deleting shifts the tail down while the index moves on, so the element that slid into the vacated slot is never examined",
          "It raises a RuntimeError",
          "It only removes the last occurrence"
        ],
        answer: 1,
        why: "`[3, 3, 2]` with `val=3` leaves `[3, 2]`. It is also O(n) per deletion. The fast/slow pointer version examines every element exactly once, allocates nothing, and is the standard answer when the problem requires O(1) space."
      },
      {
        stem: "A minimum-window solution checks validity by comparing two `Counter` objects each step. What is the cost?",
        options: [
          "It is still O(n) — dictionary comparison is constant time",
          "O(n × distinct characters), because each comparison scans every key; a single `formed` counter makes it O(1) per step",
          "It is incorrect for duplicates",
          "It doubles the space complexity"
        ],
        answer: 1,
        why: "Tracking how many distinct characters currently meet their required count reduces the check to one integer comparison. Incrementing only when a count reaches its requirement exactly — and decrementing only when it falls below — is what keeps duplicates correct."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use two pointers?",
        strong: "When a nested loop is doing redundant work with a direction to it. Opposite ends on a sorted array, a sliding window for contiguous ranges, and fast/slow for in-place compaction or cycle detection.",
        answer: [
          { t: "p", text: "Naming the precondition for each shape — sorted, contiguous, in-place — is what makes this a recognition skill rather than a list." },
          { t: "p", text: "Explaining why sorting enables opposite-ends reasoning shows you understand the invariant instead of the pattern." },
          { t: "p", text: "Knowing when it does *not* apply, such as subarray sums with negatives, is the stronger half of the answer." }
        ]
      },
      {
        level: "advanced",
        q: "Walk me through the sliding window template.",
        strong: "Expand the right pointer always; shrink from the left while the window is invalid; record the answer at the right moment. Track validity in O(1) with a counter rather than by re-examining the window.",
        answer: [
          { t: "p", text: "Distinguishing where the answer is recorded — inside the shrink loop for a minimum, after it for a maximum — shows you have written both variants." },
          { t: "p", text: "The O(1) validity check is the implementation detail that separates a working solution from an efficient one." },
          { t: "p", text: "Offering the amortised argument unprompted saves the interviewer asking, and it is the thing they were going to ask." }
        ]
      },
      {
        level: "core",
        q: "What Python operations would you avoid inside a tight loop?",
        strong: "`list.pop(0)` and `insert(0, x)`, slicing, `in` on a list, and string concatenation — all O(n), so each turns a linear algorithm quadratic.",
        answer: [
          { t: "p", text: "Framing it as \"complexity analysis assumes O(1) primitives\" explains why these matter rather than just listing them." },
          { t: "p", text: "Naming `deque` and `set` as the replacements makes the answer actionable." },
          { t: "p", text: "The production example — a linear algorithm made quadratic by `pop(0)` — shows this is not only an interview concern." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 16.3 — Stacks, Queues and Heaps
   ========================================================================= */
EC.receiveLesson({
  id: "16.3",

  lede: "Three structures, three questions. **A stack answers \"what was most recent?\", a queue \"what was first?\", a heap \"what is smallest?\"** — and choosing the right one usually collapses a nested loop, because each answers its question in constant or logarithmic time where a scan would take linear.",

  objectives: [
    "Use a list as a stack and `deque` as a queue, and know why not the reverse",
    "Recognise a monotonic stack, and what it computes",
    "Use `heapq` for top-k, merging and scheduling",
    "Work around `heapq` being a min-heap with no key parameter",
    "Choose between sorting, a heap, and `nlargest` on the size of k"
  ],

  prerequisites: ["4.2", "16.2"],

  blocks: [

    { t: "h2", n: "01", text: "Stacks and queues", id: "stacks-queues" },

    { t: "code", lang: "python", title: "the right structure for each end", code: `
# STACK -- a plain list is exactly right. Both operations act on the
# END, which is where a list is O(1).
stack: list[int] = []
stack.append(x)          # push, O(1) amortised
stack.pop()              # pop,  O(1)
stack[-1]                # peek, O(1)

# QUEUE -- a list is exactly WRONG. pop(0) shifts every remaining
# element down one.
queue = []
queue.pop(0)             # O(n) -- and O(n^2) across a full drain

from collections import deque
queue: deque[int] = deque()
queue.append(x)          # O(1)
queue.popleft()          # O(1)
queue.appendleft(x)      # O(1) -- a list cannot do this cheaply

# deque is a doubly-linked list of fixed-size blocks, so both ends
# are O(1) and INDEXING THE MIDDLE IS O(n). Use a list when you need
# random access, a deque when you need both ends.

# A BOUNDED deque discards from the far end automatically -- the
# whole of "keep the last N" in one construction.
recent = deque(maxlen=100)
for event in stream:
    recent.append(event)     # never grows beyond 100
`,
      hl: [11, 19, 26],
      caption: "**`deque` is O(1) at both ends and O(n) in the middle; a list is the reverse.** That single sentence decides which to use."
    },

    { t: "h2", n: "02", text: "The monotonic stack", id: "monotonic" },

    { t: "viz",
      title: "What a monotonic stack computes",
      caption: "The stack holds indices whose answer is still unknown, in decreasing order of value. When a larger value arrives, it is the answer for everything smaller still waiting — so each index is pushed once and popped once.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="A monotonic stack processing an array to find the next greater element">
  <text x="24" y="30" class="s-label">temperatures = [73, 74, 75, 71, 69, 72, 76, 73]</text>

  <g class="s-sub">
    <text x="24" y="70" style="fill:var(--ink-3)">i=0  73 arrives</text>
    <rect x="220" y="52" width="54" height="26" rx="4" style="fill:var(--t-blue);opacity:.3"/>
    <text x="247" y="70" text-anchor="middle">73</text>
    <text x="300" y="70" style="fill:var(--ink-3)">stack: [73]</text>

    <text x="24" y="112" style="fill:var(--ink-3)">i=1  74 arrives</text>
    <rect x="220" y="94" width="54" height="26" rx="4" style="fill:var(--good);opacity:.35"/>
    <text x="247" y="112" text-anchor="middle">74</text>
    <text x="300" y="112" style="fill:var(--good)">74 &gt; 73  →  pops 73, answer[0] = 1</text>

    <text x="24" y="154" style="fill:var(--ink-3)">i=3,4  71, 69</text>
    <rect x="220" y="136" width="54" height="26" rx="4" style="fill:var(--t-blue);opacity:.3"/>
    <rect x="278" y="136" width="54" height="26" rx="4" style="fill:var(--t-blue);opacity:.3"/>
    <rect x="336" y="136" width="54" height="26" rx="4" style="fill:var(--t-blue);opacity:.3"/>
    <text x="247" y="154" text-anchor="middle">75</text>
    <text x="305" y="154" text-anchor="middle">71</text>
    <text x="363" y="154" text-anchor="middle">69</text>
    <text x="420" y="154" style="fill:var(--ink-3)">decreasing — all still waiting</text>

    <text x="24" y="196" style="fill:var(--ink-3)">i=6  76 arrives</text>
    <rect x="220" y="178" width="54" height="26" rx="4" style="fill:var(--crit);opacity:.35"/>
    <text x="247" y="196" text-anchor="middle">76</text>
    <text x="300" y="196" style="fill:var(--crit)">pops 72, 71, 75 — one arrival resolves three</text>
  </g>

  <text x="24" y="244" class="s-sub" style="fill:var(--ink-3)">Each index is pushed once and popped once → O(n) total, despite the inner while loop.</text>
  <text x="24" y="268" class="s-sub" style="fill:var(--ink-3)">The stack holds only unresolved indices, so it is decreasing by construction.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the template, and its variants", code: `
def next_greater(nums: list[int]) -> list[int]:
    """For each element, the index of the next strictly greater one,
    or -1. O(n) time, O(n) space.

    THE INVARIANT: the stack holds indices whose answer is not yet
    known, and their values are non-increasing from bottom to top.
    """
    result = [-1] * len(nums)
    stack: list[int] = []          # indices, not values

    for i, x in enumerate(nums):
        # x is the answer for everything smaller still waiting.
        while stack and nums[stack[-1]] < x:
            result[stack.pop()] = i
        stack.append(i)

    return result          # anything left has no greater element


# THE FOUR VARIANTS, all the same code with one comparison changed:
#
#   next GREATER   iterate forwards,  pop while stack top <  x
#   next SMALLER   iterate forwards,  pop while stack top >  x
#   prev GREATER   iterate backwards, pop while stack top <  x
#   prev SMALLER   iterate backwards, pop while stack top >  x
#
# STRICT vs NON-STRICT matters when there are duplicates: "<" leaves
# equal values on the stack (so equals are not answers), "<=" pops
# them. Ask which the problem wants.

# WHY IT IS O(n) DESPITE THE NESTED WHILE: each index is pushed
# exactly once and popped at most once, so the total number of inner
# iterations across the whole run is at most n. The same amortised
# argument as the sliding window (Lesson 16.1).
`,
      hl: [13, 21, 31],
      caption: "**Push indices, not values.** You almost always need the distance or the position, and the value is one lookup away — the reverse is not."
    },

    { t: "callout", kind: "insight", title: "Recognising a monotonic stack problem", body: [
      { t: "code", lang: "python", title: "the phrasings that mean this", numbered: false, code: `
# "the next warmer day"
# "the next greater element"
# "how many days until..."
# "the largest rectangle in a histogram"
# "trapping rain water"
# "the span of a stock price"
# "remove k digits to make the smallest number"
#
# THE COMMON SHAPE: for each element, find the nearest element in
# some direction satisfying a comparison.
#
# The brute force is O(n^2) -- scan forward from each position. The
# monotonic stack is O(n) because it never rescans: an element that
# has been passed without resolving is remembered, and one arrival
# can resolve many.`},
      { t: "p", text: "**\"Nearest element satisfying a comparison\" is the trigger.** If the brute force is \"for each i, scan forward until…\", a monotonic stack removes the rescan." }
    ]},

    { t: "h2", n: "03", text: "Heaps", id: "heaps" },

    { t: "code", lang: "python", title: "heapq, and its three sharp edges", code: `
import heapq

h: list[int] = []
heapq.heappush(h, 5)         # O(log n)
heapq.heappop(h)             # O(log n) -- the SMALLEST
h[0]                         # O(1) peek at the smallest
heapq.heapify(existing)      # O(n) -- faster than n pushes

# Push and pop as one operation, cheaper than doing both:
heapq.heappushpop(h, x)      # push then pop -- pops the smaller
heapq.heapreplace(h, x)      # pop then push -- pops unconditionally


# EDGE 1 -- IT IS A MIN-HEAP, AND THERE IS NO max VARIANT.
# For a max-heap, negate:
heapq.heappush(h, -value)
largest = -heapq.heappop(h)
# ...which is fine for numbers and awkward for anything else.

# EDGE 2 -- THERE IS NO key PARAMETER. Push tuples, sorted by their
# first element:
heapq.heappush(h, (task.priority, task))
# ...but if two priorities tie, Python compares the SECOND element,
# and Task may not define __lt__:
#   TypeError: '<' not supported between instances of 'Task'
#
# THE FIX: a unique tiebreaker in the middle, so the third element is
# never reached.
counter = itertools.count()
heapq.heappush(h, (priority, next(counter), task))

# EDGE 3 -- NO update-priority OPERATION. To change a priority:
#   push the new entry, and mark the old one as stale:
entry_finder: dict[str, list] = {}

def add_task(task_id: str, priority: int) -> None:
    if task_id in entry_finder:
        entry_finder[task_id][-1] = REMOVED      # tombstone
    entry = [priority, next(counter), task_id]
    entry_finder[task_id] = entry
    heapq.heappush(h, entry)

def pop_task() -> str:
    while h:
        _, _, task_id = heapq.heappop(h)
        if task_id is not REMOVED:
            del entry_finder[task_id]
            return task_id
    raise KeyError("empty")
`,
      hl: [16, 23, 30, 36],
      caption: "**The tiebreaker counter is the fix people learn the hard way.** Equal priorities make Python compare the next tuple element, and an arbitrary object usually has no ordering."
    },

    { t: "ladder",
      title: "The k largest elements of n",
      rungs: [
        { level: "bad", label: "Sort and slice",
          why: "O(n log n) and it allocates a full sorted copy. For k = 10 out of ten million, almost all of that work is discarded — though for small n it is perfectly reasonable and the clearest to read.",
          code: `top = sorted(nums, reverse=True)[:k]
# O(n log n) time, O(n) space.` },
        { level: "ok", label: "A max-heap of everything",
          why: "`heapify` is O(n), then k pops at O(log n). Better asymptotically, and it still holds all n elements in memory — which is the constraint that matters when the input is a stream.",
          code: `h = [-x for x in nums]
heapq.heapify(h)                   # O(n)
top = [-heapq.heappop(h) for _ in range(k)]    # O(k log n)` },
        { level: "best", label: "A min-heap of size k",
          why: "The heap never exceeds k elements, so memory is O(k) regardless of n — and it works on a stream that does not fit in memory at all. The smallest of the current best k sits at the root, so the comparison is O(1).",
          code: `def top_k(stream: Iterable[int], k: int) -> list[int]:
    """O(n log k) time, O(k) space. Works on an infinite stream."""
    h: list[int] = []
    for x in stream:
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:                 # h[0] is the SMALLEST kept
            heapq.heapreplace(h, x)    # one operation, not two
    return sorted(h, reverse=True)

# A MIN-heap for the LARGEST k is the part that reads backwards: the
# root is the weakest of the current best, so it is exactly what a
# new candidate must beat.

# And the standard library already does this:
heapq.nlargest(k, nums)              # same algorithm
heapq.nlargest(k, tasks, key=lambda t: t.priority)   # WITH a key`,
          note: "**`heapq.nlargest` and `nsmallest` accept a `key`**, which the raw heap functions do not — often the shortest correct answer." }
      ]
    },

    { t: "table",
      head: ["k relative to n", "Use", "Cost"],
      rows: [
        ["k = 1", "`max()` / `min()`", "O(n), and clearest"],
        ["**k ≪ n**", "**A size-k heap, or `nlargest`**", "**O(n log k), O(k) space**"],
        ["k ≈ n", "`sorted()`", "O(n log n) — the heap loses"],
        ["n is a stream", "**A size-k heap**", "The only option that works"],
        ["Repeated queries", "Sort once, then index", "Amortises the sort"]
      ],
      caption: "**At k close to n, `nlargest` is slower than sorting** — the heap operations cost more than Timsort's optimised pass. CPython's implementation switches to sorting when k is large for exactly this reason."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Sliding window maximum",
      difficulty: "advanced",
      minutes: 36,
      body: [
        { t: "p", text: "Given an array and a window size `k`, return the maximum of each window as it slides one position at a time." },
        { t: "code", lang: "python", numbered: false, title: "example", code: `
nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

window            max
[1  3 -1]          3
   [3 -1 -3]       3
      [-1 -3  5]   5
         [-3 5  3] 5
            [5 3 6] 6
               [3 6 7] 7

-> [3, 3, 5, 5, 6, 7]`},
        { t: "p", text: "Solve it in O(n). Give the heap solution first, explain why it is O(n log n) rather than O(n), then give the deque solution." }
      ],
      requirements: [
        "Explain why recomputing `max()` per window is too slow.",
        "Give a heap solution and state why it is not O(n).",
        "Give the O(n) monotonic deque solution.",
        "Explain the invariant the deque maintains.",
        "Explain why elements are removed from both ends, and on what condition.",
        "Handle k = 1 and k = len(nums)."
      ],
      hint: "For the deque: if a new element is larger than something already waiting, can that smaller element ever be a maximum again?",
      solution: {
        lang: "python",
        title: "sliding_window_maximum.py",
        code: `# =========================================================================
# THE BRUTE FORCE, AND WHY IT IS TOO SLOW
# =========================================================================
#
#   [max(nums[i:i+k]) for i in range(len(nums) - k + 1)]
#
# O(n * k). Two costs, both linear per window:
#   - the slice ALLOCATES a copy of k elements (Lesson 16.1)
#   - max() scans all k of them
#
# At n = 100,000 and k = 50,000 that is 2.5 billion operations. And
# the work is almost entirely redundant: consecutive windows share
# k - 1 elements, so nearly every comparison is repeated.
#
# THE INSIGHT: only ONE element enters and ONE leaves per step. An
# O(1) update should be possible.


# =========================================================================
# THE HEAP SOLUTION, AND WHY IT IS NOT O(n)
# =========================================================================

import heapq

def max_sliding_window_heap(nums: list[int], k: int) -> list[int]:
    """O(n log n) time, O(n) space."""
    heap: list[tuple[int, int]] = []       # (-value, index)
    result: list[int] = []

    for i, x in enumerate(nums):
        heapq.heappush(heap, (-x, i))

        # LAZY DELETION. heapq has no "remove this element", so an
        # element that has fallen out of the window cannot be taken
        # out directly -- it is discarded when it reaches the top.
        while heap[0][1] <= i - k:
            heapq.heappop(heap)

        if i >= k - 1:
            result.append(-heap[0][0])

    return result

# WHY NOT O(n):
#
#   The heap can grow to hold every element. Consider a strictly
#   DECREASING array: nothing is ever popped by the lazy-deletion
#   loop until it reaches the top, and the maximum is always the
#   oldest element -- so the heap ends up holding all n entries.
#
#   Each push is O(log n) against a heap of size up to n.
#
#   TIME:  O(n log n)
#   SPACE: O(n)          -- not O(k), which is the disappointment
#
# It is correct, it is easy to write, and it is a perfectly
# acceptable first answer in an interview. Say the complexity
# honestly and then say you can do better -- that sequence is what
# is being assessed.


# =========================================================================
# THE O(n) SOLUTION -- A MONOTONIC DEQUE
# =========================================================================

from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    """O(n) time, O(k) space.

    THE INVARIANT: the deque holds INDICES of elements that could
    still be the maximum of some future window, in DECREASING order
    of value. So nums[dq[0]] is always the current window's maximum.
    """
    dq: deque[int] = deque()
    result: list[int] = []

    for i, x in enumerate(nums):
        # --- REMOVE FROM THE FRONT: out of the window -------------
        # The front is the oldest index. Once it falls outside the
        # window it can never return.
        if dq and dq[0] <= i - k:
            dq.popleft()

        # --- REMOVE FROM THE BACK: dominated ----------------------
        # THE KEY INSIGHT: if x is >= something already waiting, that
        # smaller element can NEVER be a maximum again. Any window
        # containing it also contains x (x is newer, so it leaves the
        # window later), and x is at least as large.
        #
        # So it is not merely unhelpful -- it is permanently useless,
        # and discarding it is what keeps the deque small.
        while dq and nums[dq[-1]] <= x:
            dq.pop()

        dq.append(i)

        # --- record, once the first full window exists -------------
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result


# =========================================================================
# WHY BOTH ENDS, AND ON WHAT CONDITION
# =========================================================================
#
# FRONT (popleft) -- removes by AGE.
#   Condition: dq[0] <= i - k, i.e. the index has slid out of the
#   window. At most ONE element leaves per step, so an "if" suffices
#   rather than a "while".
#
# BACK (pop) -- removes by VALUE.
#   Condition: nums[dq[-1]] <= x. These elements are still inside the
#   window but can never win again, because x dominates them on both
#   axes: it is larger AND it survives longer.
#
# The two conditions are independent, which is why both ends are
# needed -- and why a plain stack or a plain queue cannot do it.
#
# "<=" vs "<" IN THE BACK CONDITION:
#   With "<=", equal values are discarded, so the deque holds only
#   the newest of any run of equal maxima. Correct, and smaller.
#   With "<", duplicates are kept -- also correct, slightly more
#   memory. Either works; be able to say why.
#
#
# =========================================================================
# WHY IT IS O(n)
# =========================================================================
#
# The inner while loop makes it LOOK quadratic. It is not:
#
#   - each index is appended EXACTLY ONCE
#   - each index is removed AT MOST ONCE, from either end
#   - so across the entire run there are at most 2n deque operations
#
#   TIME:  O(n)
#   SPACE: O(k) -- the deque never holds more than k indices, since
#          anything older is removed from the front
#
# The same amortised argument as the sliding window and the monotonic
# stack: a nested loop whose total work is bounded by the number of
# insertions.
#
#
# =========================================================================
# EDGE CASES
# =========================================================================
#
#   k = 1
#     Every element is its own window maximum. The back condition
#     empties the deque on every step (each x dominates the previous
#     one, or the front check removes it), so result == nums.
#     No special case needed.
#
#   k = len(nums)
#     One window. The deque accumulates the decreasing prefix and the
#     answer is max(nums), emitted at i = k - 1. Again no special
#     case.
#
#   k > len(nums)
#     The "i >= k - 1" condition is never true, so an empty list is
#     returned. Whether that is correct is a QUESTION FOR THE
#     INTERVIEWER -- raising, returning [], and returning
#     [max(nums)] are all defensible. Ask.
#
#   empty nums
#     Returns []. Handled by the loop not executing.
#
#   all equal, e.g. [5, 5, 5, 5]
#     With "<=" the deque holds one index at a time. Correct.
#
#   strictly decreasing, e.g. [5, 4, 3, 2, 1]
#     THE WORST CASE FOR SPACE: nothing is ever dominated, so the
#     deque grows to k before the front check starts removing. This
#     is exactly the case where the heap solution degrades to O(n)
#     space and this one stays at O(k).
#
#
# =========================================================================
# COMPARISON
# =========================================================================
#
#                       time          space     notes
#   brute force         O(n * k)      O(1)      allocates per window
#   heap, lazy delete   O(n log n)    O(n)      easy to write
#   monotonic deque     O(n)          O(k)      the intended answer
#
# On n = 100,000, k = 50,000:
#   brute force  ~2.5e9 ops   (minutes)
#   heap         ~1.7e6 ops   (~0.3 s)
#   deque        ~2e5 ops     (~0.02 s)
#
#
# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("nums,k,expected", [
    ([1, 3, -1, -3, 5, 3, 6, 7], 3, [3, 3, 5, 5, 6, 7]),
    ([1],                        1, [1]),
    ([1, -1],                    1, [1, -1]),
    ([9, 11],                    2, [11]),
    ([4, -2],                    2, [4]),
    ([5, 5, 5, 5],               2, [5, 5, 5]),      # all equal
    ([5, 4, 3, 2, 1],            2, [5, 4, 3, 2]),   # decreasing
    ([1, 2, 3, 4, 5],            2, [2, 3, 4, 5]),   # increasing
    ([],                         1, []),
])
def test_max_sliding_window(nums, k, expected):
    assert max_sliding_window(nums, k) == expected


def test_k_equals_length():
    assert max_sliding_window([1, 3, 2], 3) == [3]


def test_matches_the_brute_force_on_random_input():
    """A property test. The brute force is obviously correct and
    obviously slow, which makes it the ideal oracle."""
    for _ in range(500):
        nums = [random.randint(-100, 100)
                for _ in range(random.randint(1, 50))]
        k = random.randint(1, len(nums))

        assert max_sliding_window(nums, k) == [
            max(nums[i:i + k]) for i in range(len(nums) - k + 1)
        ]


def test_space_is_bounded_by_k():
    """The property the heap version does not have."""
    nums = list(range(100_000, 0, -1))     # strictly decreasing

    peak = measure_peak_deque_size(nums, k=10)

    assert peak <= 10


def test_linear_time():
    small = timeit(lambda: max_sliding_window(list(range(50_000)), 100),
                   number=3)
    large = timeit(lambda: max_sliding_window(list(range(100_000)), 100),
                   number=3)

    assert large < small * 3, "looks superlinear"`,
        notes: [
          { t: "p", text: "**The dominance argument is the whole solution.** If a new element is at least as large as one already waiting, that older element can never be a maximum again — any window containing it also contains the newer, larger one, because the newer element leaves the window later." },
          { t: "p", text: "**Both ends are needed because the two removal conditions are independent.** The front removes by age, the back by value, and neither a stack nor a queue can do both — which is precisely what `deque` is for." },
          { t: "callout", kind: "insight", title: "Give the heap answer first, honestly", body: [
            { t: "p", text: "The heap solution is correct, quick to write, and O(n log n) with O(n) space. Presenting it, stating its complexity accurately, and then saying you can do better is the sequence interviewers are assessing — not the ability to produce the optimal answer immediately." },
            { t: "p", text: "The reason it is not O(n) is worth being precise about: on a decreasing array nothing is ever lazily deleted until it reaches the top, so the heap holds all n elements." }
          ]},
          { t: "p", text: "**The front check needs `if`, not `while`.** At most one index falls out of the window per step, so a loop there is harmless but signals that the invariant is not clear to you." },
          { t: "p", text: "**A strictly decreasing array is the case that separates the two solutions.** Nothing is ever dominated, so the heap grows to n while the deque stays bounded at k — which is why the space complexities differ." },
          { t: "p", text: "**`k > len(nums)` is a question for the interviewer.** Raising, returning `[]`, and returning `[max(nums)]` are all defensible, and asking is better than choosing silently." },
          { t: "p", text: "**The brute force makes an ideal property-test oracle** — obviously correct, obviously slow, and comparing against it on random inputs catches the off-by-one errors that hand-picked examples miss." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A metrics service computed a rolling maximum over a 60-second window, recalculating from the buffer on every data point. At 10,000 points per second it consumed an entire core." },
      { t: "p", text: "**The buffer held 600,000 points and `max()` scanned all of them, 10,000 times a second** — six billion comparisons per second, for a value that changes by one element at a time." },
      { t: "p", text: "**A monotonic deque reduced it to a fraction of a percent of one core.** The same code that answers an interview question, doing the same job." },
      { t: "p", text: "**\"Recompute an aggregate over a sliding window\" is the production form of this problem**, and it appears in metrics, rate limiting and streaming analytics far more often than the interview framing suggests." }
    ]}
  ],

  takeaways: [
    "**A stack answers \"most recent\", a queue \"first\", a heap \"smallest\"** — pick the structure whose question matches yours.",
    "**A list is a perfect stack and a terrible queue.** `pop(0)` shifts every element; `deque.popleft()` is O(1).",
    "**`deque` is O(1) at both ends and O(n) in the middle**; a list is the reverse.",
    "**`deque(maxlen=n)` discards from the far end automatically** — the whole of \"keep the last N\" in one construction.",
    "**A monotonic stack answers \"the nearest element satisfying a comparison\"** in O(n), replacing a rescan from every position.",
    "**Push indices, not values.** You usually need the position, and the value is one lookup away.",
    "**Each index pushed once and popped once is why a nested loop is still linear** — the same amortised argument as the sliding window.",
    "**`heapq` is a min-heap with no `key` parameter.** Negate for a max-heap; push tuples to sort by something else.",
    "**Add a unique counter as a tiebreaker**, or equal priorities make Python compare objects that have no ordering.",
    "**`heapq` has no update-priority** — push a new entry and tombstone the old one.",
    "**A size-k min-heap gives the k largest in O(n log k) and O(k) space**, and it works on a stream that does not fit in memory.",
    "**`heapq.nlargest` accepts a `key`** where the raw heap functions do not — often the shortest correct answer.",
    "**At k close to n, sorting beats a heap.** CPython's `nlargest` switches to sorting for exactly that reason.",
    "**When a new element dominates an older one on every axis, the older one is permanently useless.** That argument is what makes the monotonic deque work."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `list.pop(0)` the wrong way to implement a queue?",
        options: [
          "It raises on an empty list",
          "It shifts every remaining element down one, so it is O(n) — and O(n²) across a full drain",
          "It returns elements in the wrong order",
          "Lists cannot be used as queues at all"
        ],
        answer: 1,
        why: "A list is contiguous, so removing from the front moves everything after it. `collections.deque` is a doubly-linked list of blocks, giving O(1) at both ends — at the cost of O(n) indexing in the middle, which a queue never needs."
      },
      {
        stem: "A monotonic stack solution has a `while` inside a `for`. What is its complexity?",
        options: [
          "O(n²), because of the nesting",
          "O(n) — each index is pushed exactly once and popped at most once, so total inner work is bounded by n",
          "O(n log n)",
          "It depends on whether the input is sorted"
        ],
        answer: 1,
        why: "This is the same amortised argument as the sliding window. One arrival can pop several waiting elements, but every element it pops was pushed by an earlier iteration — so the work is charged to the pushes, of which there are exactly n."
      },
      {
        stem: "`heapq.heappush(h, (priority, task))` raises `TypeError: '<' not supported between instances of 'Task'`. Why?",
        options: [
          "Tasks must be hashable",
          "Two entries have equal priorities, so Python compares the second tuple elements — and `Task` defines no ordering",
          "heapq only accepts numbers",
          "The tuple must be a list"
        ],
        answer: 1,
        why: "Tuples compare element by element, so a tie on the first pushes the comparison to the second. Inserting a unique counter in the middle — `(priority, next(counter), task)` — means the third element is never reached."
      },
      {
        stem: "To find the 10 largest of a stream of ten million numbers, what do you use?",
        options: [
          "Sort the stream and take the first 10",
          "A min-heap of size 10 — the root is the weakest of the current best, so it is exactly what a new candidate must beat",
          "A max-heap of all ten million",
          "Two passes with `max()`"
        ],
        answer: 1,
        why: "O(n log k) time and O(k) space, and it works on a stream that never fits in memory. The min-heap-for-largest inversion reads backwards until you see that the root is the element a new candidate must displace — `heapq.nlargest` implements exactly this."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use a heap rather than sorting?",
        strong: "When k is much smaller than n, or when the input is a stream. A size-k heap is O(n log k) with O(k) space and never holds the whole input; sorting is O(n log n) and requires all of it.",
        answer: [
          { t: "p", text: "The streaming case is the one that settles it — sorting is not an option when the data does not fit." },
          { t: "p", text: "Knowing that sorting wins when k approaches n shows you understand the constants, not just the exponents." },
          { t: "p", text: "Mentioning `heapq.nlargest` with a `key` demonstrates familiarity with the practical API rather than only the algorithm." }
        ]
      },
      {
        level: "advanced",
        q: "What is a monotonic stack and when does it apply?",
        strong: "A stack whose values are ordered, holding elements whose answer is still unknown. It applies when the brute force is \"for each element, scan in some direction for the nearest one satisfying a comparison\" — it removes the rescan and makes it O(n).",
        answer: [
          { t: "p", text: "Describing the invariant — unresolved elements, in order — explains why the structure is monotonic rather than making it a rule to memorise." },
          { t: "p", text: "The amortised argument is what an interviewer will ask about next, so giving it unprompted saves a round trip." },
          { t: "p", text: "Naming the four variants as one template with a changed comparison shows you learned the shape rather than four solutions." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute a maximum over a sliding window?",
        strong: "A monotonic deque. Remove from the front what has fallen out of the window, remove from the back anything the new element dominates, and the front is always the maximum. O(n) time, O(k) space.",
        answer: [
          { t: "p", text: "The dominance argument is the insight: a newer, larger element makes an older, smaller one permanently useless." },
          { t: "p", text: "Explaining why both ends are needed — one condition is age, the other is value — justifies the deque over a stack or a queue." },
          { t: "p", text: "Offering the heap solution first with an honest complexity, then improving it, is the sequence being assessed." }
        ]
      }
    ]
  }
});

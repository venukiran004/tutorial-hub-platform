/* ============================================================================
   LESSON 16.5 — Sorting, Searching and Binary Search
   ========================================================================= */
EC.receiveLesson({
  id: "16.5",

  lede: "You will not implement quicksort in an interview. **What you will do is sort by a non-obvious key, and recognise that a problem with a monotonic answer can be binary searched** — including problems with no array in them at all, which is where most of the difficulty lives.",

  objectives: [
    "Sort by a composite or reversed key without writing a comparator",
    "Explain what stability buys you, and use it deliberately",
    "Write a binary search whose boundaries you can defend",
    "Use `bisect` instead of hand-rolling one",
    "Binary search on the answer, not on an array"
  ],

  prerequisites: ["4.4", "16.1"],

  blocks: [

    { t: "h2", n: "01", text: "Sorting in Python", id: "sorting" },

    { t: "code", lang: "python", title: "keys, not comparators", code: `
# Python removed cmp in 3.0. Everything is a KEY FUNCTION: it is
# called once per element (n calls, not n log n comparisons), and the
# results are compared.

people.sort(key=lambda p: p.age)
people.sort(key=attrgetter("age"))        # faster: no Python frame
                                          # per call

# COMPOSITE KEYS -- a tuple, compared left to right.
people.sort(key=lambda p: (p.department, p.age, p.name))

# MIXED DIRECTIONS -- negate a number to reverse just that field.
people.sort(key=lambda p: (p.department, -p.salary))

# ...but you cannot negate a string. TWO STABLE PASSES, least
# significant FIRST:
people.sort(key=attrgetter("name"))                    # secondary
people.sort(key=attrgetter("department"), reverse=True)  # primary
# Stability is what makes this work -- the first sort's order
# survives within each group of the second.

# When a genuine comparator is unavoidable:
from functools import cmp_to_key
items.sort(key=cmp_to_key(my_compare))     # slower, and a last resort

# sorted() returns a new list; .sort() mutates and returns None.
result = my_list.sort()          # None -- a classic slip
`,
      hl: [6, 17, 19],
      caption: "**Timsort is stable**, which is what makes the two-pass technique valid: equal elements keep their relative order, so an earlier sort's result survives inside each group of a later one."
    },

    { t: "callout", kind: "insight", title: "What Timsort actually does", body: [
      { t: "p", text: "Python's sort is Timsort — a merge sort that first finds existing runs of ordered data and merges them. **On nearly-sorted input it is O(n)**, not O(n log n), and real data is very often nearly sorted." },
      { t: "code", lang: "python", title: "consequences worth knowing", numbered: false, code: `
# 1. NEARLY SORTED IS NEARLY FREE.
sorted(already_sorted)          # O(n): one run found, nothing merged
# So "sort then scan" is often cheaper than it looks on real input.

# 2. STABLE, GUARANTEED. Not an implementation detail -- the language
#    reference promises it, so relying on it is legitimate.

# 3. O(n) EXTRA SPACE in the worst case. On a very large list this
#    matters; list.sort() still allocates a merge buffer.

# 4. IT SORTS BY < ONLY. A class needs __lt__ and nothing else --
#    total_ordering is unnecessary just for sorting.

# 5. KEY FUNCTIONS RUN ONCE PER ELEMENT. So an expensive key is
#    n calls, not n log n. Precomputing into a tuple is rarely worth
#    it.`},
      { t: "p", text: "**\"Sort it first\" is a stronger opening move than it appears.** O(n log n) with a small constant on nearly-ordered data frequently beats a cleverer O(n) algorithm you might get wrong." }
    ]},

    { t: "h2", n: "02", text: "Binary search, correctly", id: "binary-search" },

    { t: "ladder",
      title: "Finding an insertion point in a sorted list",
      rungs: [
        { level: "bad", label: "Hand-rolled, with the classic bugs",
          why: "Three separate errors: an inclusive/exclusive mismatch, a loop that can fail to terminate, and an overflow that is harmless in Python and fatal in most other languages — which is what an interviewer is probing for.",
          code: `def search(arr, target):
    lo, hi = 0, len(arr)         # hi is EXCLUSIVE...
    while lo <= hi:              # ...but this treats it as inclusive
        mid = (lo + hi) / 2      # float, and overflows in C/Java
        if arr[mid] < target:
            lo = mid             # not mid + 1 -> infinite loop
        else:
            hi = mid
    return lo` },
        { level: "ok", label: "Careful, and correct",
          why: "Correct, and it requires you to hold three conventions in your head at once. Every hand-written binary search does, which is why they are a reliable source of off-by-one errors under interview pressure.",
          code: `def search(arr, target):
    lo, hi = 0, len(arr)          # [lo, hi) -- hi EXCLUSIVE
    while lo < hi:                # matches the exclusive bound
        mid = (lo + hi) // 2      # floor division
        if arr[mid] < target:
            lo = mid + 1          # mid is excluded: it was too small
        else:
            hi = mid              # mid may be the answer: keep it
    return lo                     # the insertion point` },
        { level: "best", label: "Use bisect",
          why: "It is C, it is correct, and it has a `key` parameter since 3.10. Writing your own is worth doing once to understand it and is the wrong choice in any code that will be read again.",
          code: `import bisect

bisect.bisect_left(arr, x)      # first index where arr[i] >= x
bisect.bisect_right(arr, x)     # first index where arr[i]  > x
bisect.insort(arr, x)           # insert, keeping it sorted

# The two answer different questions about duplicates:
arr = [1, 2, 2, 2, 3]
bisect.bisect_left(arr, 2)      # 1  -- the FIRST 2
bisect.bisect_right(arr, 2)     # 4  -- just past the LAST 2
bisect.bisect_right(arr, 2) - bisect.bisect_left(arr, 2)   # 3 -- how
                                                           # many 2s

# Since 3.10, a key -- so no decorate-sort-undecorate:
bisect.bisect_left(people, 30, key=attrgetter("age"))

# NOTE insort is O(n): the search is O(log n) and the insert shifts
# the tail. For many insertions, collect and sort once instead.`,
          note: "**Say which convention you are using before you write the loop.** \"`hi` is exclusive, so the loop is `lo < hi` and the true branch sets `lo = mid + 1`\" makes every subsequent line obvious." }
      ]
    },

    { t: "h2", n: "03", text: "Binary search on the answer", id: "answer" },

    { t: "viz",
      title: "The search space is not always an array",
      caption: "Whenever a candidate answer can be checked as feasible or not, and feasibility is monotonic, the range of candidates is a sorted array you can binary search — even though no such array exists in memory.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="A monotonic feasibility predicate over a range of candidate answers">
  <text x="24" y="30" class="s-label">"What is the smallest capacity that finishes in D days?"</text>

  <rect x="24" y="52" width="852" height="34" rx="6" style="fill:var(--surface-2);stroke:var(--border)"/>
  <rect x="24" y="52" width="420" height="34" rx="6" style="fill:var(--crit);opacity:.28"/>
  <rect x="444" y="52" width="432" height="34" rx="6" style="fill:var(--good);opacity:.28"/>
  <text x="220" y="74" text-anchor="middle" class="s-sub" style="fill:var(--crit)">too slow — infeasible</text>
  <text x="660" y="74" text-anchor="middle" class="s-sub" style="fill:var(--good)">finishes in time — feasible</text>

  <path d="M444 96 L444 118" style="stroke:var(--accent)" fill="none"/>
  <text x="444" y="138" text-anchor="middle" class="s-sub" style="fill:var(--accent)">the answer: the FIRST feasible value</text>

  <text x="24" y="182" class="s-sub" style="fill:var(--ink-3)">MONOTONIC: if capacity c works, every capacity above c also works. That is the precondition.</text>
  <text x="24" y="208" class="s-sub" style="fill:var(--ink-3)">So the candidate range behaves exactly like a sorted array of False … False True … True.</text>
  <text x="24" y="234" class="s-sub" style="fill:var(--warn)">Cost: O(log(range) × cost of one feasibility check) — instead of trying every candidate.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the template, and a worked instance", code: `
def binary_search_answer(lo: int, hi: int, feasible) -> int:
    """The smallest value in [lo, hi] for which feasible() is true.

    PRECONDITION: feasible is MONOTONIC -- once true, it stays true.
    Verify that before using this; if it does not hold, the search
    lands somewhere arbitrary and silently returns a wrong answer.
    """
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid              # mid might be the answer -- keep it
        else:
            lo = mid + 1          # mid is ruled out
    return lo


def min_ship_capacity(weights: list[int], days: int) -> int:
    """Packages must ship in order within the given days. What is the
    smallest daily capacity that suffices?

    O(n log(sum - max)) -- the check is O(n), the search is
    logarithmic in the RANGE OF ANSWERS, not in the input size.
    """
    def can_ship(capacity: int) -> bool:
        needed, load = 1, 0
        for w in weights:
            if load + w > capacity:
                needed += 1       # start a new day
                load = 0
            load += w
        return needed <= days

    # THE BOUNDS ARE PART OF THE PROBLEM:
    #   lo = max(weights) -- a capacity below the heaviest package can
    #                        never ship it at all, so it is infeasible
    #                        by definition
    #   hi = sum(weights) -- everything in one day always works
    return binary_search_answer(max(weights), sum(weights), can_ship)
`,
      hl: [5, 11, 34],
      caption: "**Choosing `lo` and `hi` is where these problems are won or lost.** A lower bound that is not genuinely infeasible, or an upper bound that is not genuinely feasible, breaks the invariant and the answer is silently wrong."
    },

    { t: "callout", kind: "insight", title: "Recognising the shape", body: [
      { t: "code", lang: "python", title: "the phrasings that mean this", numbered: false, code: `
# "the MINIMUM x such that ..."
# "the MAXIMUM x such that ..."
# "the smallest capacity / speed / size that works"
# "split into k parts, minimising the largest part"
# "the kth smallest element in a sorted matrix"
#
# THE TEST, in two questions:
#   1. Can I CHECK a candidate answer more easily than I can FIND it?
#   2. Is that check monotonic -- if x works, does x + 1 also work?
#
# Two yeses and it is a binary search on the answer.

# THE COMPLEXITY SHIFT is the point:
#   trying every candidate  O(range x check)
#   binary searching        O(log(range) x check)
# For a range of a billion, that is 30 checks instead of a billion.`},
      { t: "p", text: "**Verify monotonicity explicitly.** It is the one precondition, it is easy to assume, and when it does not hold the search returns a plausible wrong answer rather than failing." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Median of two sorted arrays",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "Given two sorted arrays, return the median of their combined elements. The arrays are not necessarily the same length." },
        { t: "code", lang: "python", numbered: false, title: "examples", code: `
[1, 3],    [2]        ->  2.0      merged: [1, 2, 3]
[1, 2],    [3, 4]     ->  2.5      merged: [1, 2, 3, 4]
[],        [1]        ->  1.0
[0, 0],    [0, 0]     ->  0.0
[1, 2, 3], []         ->  2.0`},
        { t: "p", text: "Give the O(m + n) merge solution first, then the O(log(min(m, n))) partition solution. The second is what makes this an expert question — explain what is being binary searched, because it is not an element." }
      ],
      requirements: [
        "Give the simple O(m + n) solution and state when it is the right answer.",
        "Give the O(log(min(m,n))) solution.",
        "Explain what the binary search is searching over.",
        "Explain the partition invariant.",
        "Handle empty arrays and the odd/even cases.",
        "Explain why you search the shorter array."
      ],
      hint: "The median splits the combined array into two halves of known size. If you choose how many elements come from the first array, the number from the second is forced.",
      solution: {
        lang: "python",
        title: "median_two_sorted.py",
        code: `# =========================================================================
# THE SIMPLE SOLUTION, AND WHEN IT IS RIGHT
# =========================================================================

def find_median_merge(a: list[int], b: list[int]) -> float:
    """O(m + n) time, O(m + n) space -- or O(m + n) time and O(1)
    space if you merge with two pointers and stop at the middle."""
    merged = sorted(a + b)        # Timsort finds the two existing
    n = len(merged)               # runs, so this is closer to O(m+n)
    if n == 0:                    # than to O(n log n) in practice
        raise ValueError("both arrays are empty")
    mid = n // 2
    return float(merged[mid]) if n % 2 else (merged[mid - 1] + merged[mid]) / 2

# THIS IS OFTEN THE RIGHT ANSWER. It is four lines, obviously
# correct, and O(m + n) is fine for anything that fits in memory.
# Write it first, state its complexity, and then offer the
# logarithmic version -- that sequence is what is being assessed.
#
# The logarithmic version earns its complexity only when the arrays
# are very large or are backed by something where random access is
# cheap and scanning is not (a database index, a memory-mapped file).


# =========================================================================
# WHAT THE BINARY SEARCH IS SEARCHING OVER
# =========================================================================
#
# NOT an element. There is no single sorted array to search.
#
# THE INSIGHT: the median splits the combined array into two halves
# of KNOWN SIZE. Let total = m + n and half = (total + 1) // 2.
#
#   left half:  the smallest "half" elements
#   right half: the rest
#
# Some number i of those left-half elements come from A, and the rest
# necessarily come from B:
#
#     j = half - i
#
# So choosing i FIXES j. There is exactly one degree of freedom, and
# it ranges over [0, len(A)].
#
# WE ARE BINARY SEARCHING i -- the size of the prefix taken from A.
#
# THE FEASIBILITY TEST: the partition is correct when everything on
# the left is <= everything on the right, which reduces to two
# comparisons at the boundary:
#
#     A[i-1] <= B[j]     and     B[j-1] <= A[i]
#
# And it is MONOTONIC: if A[i-1] > B[j], then i is too large, and
# every larger i is also too large. That is the precondition binary
# search needs.


def find_median(a: list[int], b: list[int]) -> float:
    """O(log(min(m, n))) time, O(1) space."""
    # SEARCH THE SHORTER ARRAY -- see the section below.
    if len(a) > len(b):
        a, b = b, a

    m, n = len(a), len(b)
    if m + n == 0:
        raise ValueError("both arrays are empty")

    total = m + n
    half = (total + 1) // 2        # +1 puts the extra element on the
                                   # LEFT when the total is odd, so
                                   # the median is max(left)

    lo, hi = 0, m                  # i can be 0 (take nothing from a)
                                   # up to m (take all of it)
    while lo <= hi:
        i = (lo + hi) // 2         # from a
        j = half - i               # forced: from b

        # SENTINELS remove every boundary special case. If i == 0
        # there is no A[i-1], and -inf is correct: nothing on the
        # left from A, so it cannot violate the ordering.
        a_left  = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i]     if i < m else float("inf")
        b_left  = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j]     if j < n else float("inf")

        if a_left <= b_right and b_left <= a_right:
            # CORRECT PARTITION.
            if total % 2:
                return float(max(a_left, b_left))       # odd: the
                                                        # left half is
                                                        # one larger
            return (max(a_left, b_left) + min(a_right, b_right)) / 2

        if a_left > b_right:
            hi = i - 1             # took too many from a
        else:
            lo = i + 1             # took too few from a

    raise ValueError("inputs are not sorted")


# =========================================================================
# THE PARTITION INVARIANT
# =========================================================================
#
#           a:  [ a0 a1 ... a(i-1) | ai ... a(m-1) ]
#           b:  [ b0 b1 ... b(j-1) | bj ... b(n-1) ]
#                 ^^^^ left ^^^^^^   ^^^^ right ^^^
#
# TWO CONDITIONS MUST HOLD:
#
#   1. SIZE.  i + j == half.  Enforced by construction: j = half - i,
#             so it is never checked.
#
#   2. ORDER. Everything left <= everything right.
#             Within each array this is free -- they are sorted. So
#             only the CROSS comparisons can fail:
#
#                 a[i-1] <= b[j]     and     b[j-1] <= a[i]
#
#             Two comparisons, whatever the array sizes. That is why
#             the check is O(1) and the whole thing is logarithmic.
#
# WHEN IT HOLDS:
#   odd total  -> the left half has one extra element, and the median
#                 is the largest of it: max(a_left, b_left)
#   even total -> the median straddles the boundary:
#                 (max(left) + min(right)) / 2
#
# THE +1 IN half = (total + 1) // 2 is what guarantees the extra
# element lands on the LEFT for odd totals. Without it the odd case
# needs min(a_right, b_right) instead, which is a second thing to get
# right -- the +1 makes both cases share the same left-half logic.
#
#
# =========================================================================
# WHY SEARCH THE SHORTER ARRAY
# =========================================================================
#
# TWO REASONS, and both matter:
#
# 1. COMPLEXITY. The search range is [0, len(a)], so searching the
#    shorter gives O(log(min(m, n))) instead of O(log(max(m, n))).
#    With m = 10 and n = 1,000,000 that is 4 iterations instead of
#    20 -- a real difference when the check is not free.
#
# 2. CORRECTNESS. If a is the longer array, j = half - i can go
#    NEGATIVE. With m = 100, n = 2, half = 51: choosing i = 60 gives
#    j = -9, and b[j-1] indexes from the end of the list rather than
#    raising -- so the algorithm silently computes a wrong answer.
#
#    Swapping first makes i <= m <= half, so j >= 0 always. The swap
#    is not an optimisation; it is what keeps the indices valid.
#
#
# =========================================================================
# EDGE CASES
# =========================================================================
#
#   ONE ARRAY EMPTY -- a = [], b = [1, 2, 3]
#     After the swap a is the empty one. m = 0, so lo = hi = 0 and
#     i = 0 on the only iteration. a_left = -inf, a_right = +inf, so
#     both conditions hold trivially and the answer comes entirely
#     from b. NO SPECIAL CASE NEEDED -- the sentinels handle it.
#
#   BOTH EMPTY
#     Undefined. Raise rather than returning 0 or nan; silently
#     inventing a median is worse than failing.
#
#   ALL ELEMENTS EQUAL -- [0,0] and [0,0]
#     Every partition satisfies both conditions, so the first i tried
#     is accepted. Correct: the median is 0 regardless.
#
#   ONE ELEMENT EACH -- [1] and [2]
#     total = 2, half = 1. i = 0 or 1; both give 1.5.
#
#   NO OVERLAP -- [1,2,3] and [10,20,30]
#     The search moves i to one extreme. Sentinels keep it valid.
#
#   UNSORTED INPUT
#     The loop exits without finding a valid partition and raises.
#     Worth having, because it turns a silently wrong answer into a
#     failure -- an unsorted input is a precondition violation.
#
#
# =========================================================================
# COMPLEXITY
# =========================================================================
#
#                       time                    space
#   merge (sorted)      O(m + n) -- and Timsort exploits the two
#                       existing runs, so close to linear
#   two-pointer merge   O(m + n)                O(1)
#   partition search    O(log(min(m, n)))       O(1)
#
# At m = n = 1,000,000:
#   merge      ~2,000,000 operations
#   partition  ~20 iterations, each O(1)
#
# The gap is enormous, and it only matters when the arrays are truly
# large or when random access is far cheaper than scanning. SAY THIS
# -- the judgement about when the complexity is worth the risk of
# getting a fiddly algorithm wrong is part of the answer.
#
#
# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("a,b,expected", [
    ([1, 3],       [2],        2.0),
    ([1, 2],       [3, 4],     2.5),
    ([],           [1],        1.0),
    ([1],          [],         1.0),
    ([0, 0],       [0, 0],     0.0),
    ([1, 2, 3],    [],         2.0),
    ([1, 2, 3, 4], [5, 6],     3.5),
    ([5, 6],       [1, 2, 3, 4], 3.5),   # order swapped
    ([1],          [2, 3, 4, 5, 6], 3.5),  # very different sizes
    ([-5, -3, -1], [-2, 0],    -2.0),    # negatives
])
def test_find_median(a, b, expected):
    assert find_median(a, b) == pytest.approx(expected)


def test_matches_the_merge_solution_on_random_input():
    """A property test against the obviously-correct version. This is
    the right way to gain confidence in a fiddly index-heavy
    algorithm -- hand-picked cases will not find the off-by-ones."""
    for _ in range(2_000):
        a = sorted(random.randint(-50, 50)
                   for _ in range(random.randint(0, 20)))
        b = sorted(random.randint(-50, 50)
                   for _ in range(random.randint(0, 20)))
        if not a and not b:
            continue

        assert find_median(a, b) == pytest.approx(find_median_merge(a, b))


def test_very_unequal_sizes_do_not_produce_a_negative_index():
    """The reason for the swap. Without it, j goes negative and
    indexes from the end of the list rather than raising."""
    a = list(range(100))
    b = [0, 1]

    assert find_median(a, b) == pytest.approx(find_median_merge(a, b))


def test_both_empty_raises():
    with pytest.raises(ValueError):
        find_median([], [])


def test_logarithmic_iterations():
    """The complexity claim, measured by counting iterations."""
    a, b = list(range(1_000_000)), list(range(1_000_000))

    with count_iterations() as c:
        find_median(a, b)

    assert c.total < 25`,
        notes: [
          { t: "p", text: "**The binary search is over `i`, the size of the prefix taken from the first array — not over an element.** Once `i` is chosen, `j = half - i` is forced, so there is exactly one degree of freedom and it ranges over `[0, len(a)]`." },
          { t: "p", text: "**The feasibility check is two comparisons regardless of array size.** Within each array the ordering is free, so only the two cross-boundary comparisons can fail — which is what makes the check O(1) and the whole algorithm logarithmic." },
          { t: "callout", kind: "insight", title: "Swapping is a correctness fix, not an optimisation", body: [
            { t: "p", text: "If the longer array is searched, `j = half - i` can go negative — and in Python a negative index reads from the end of the list rather than raising, so the algorithm silently returns a wrong answer." },
            { t: "p", text: "Swapping first guarantees `i ≤ m ≤ half`, so `j ≥ 0` always. The complexity improvement from O(log max) to O(log min) is a bonus." }
          ]},
          { t: "p", text: "**The `±inf` sentinels remove every boundary special case.** An empty array, a partition taking nothing from one side, and a partition taking everything all fall out of the same code — which is why no explicit empty-array branch is needed." },
          { t: "p", text: "**The `+1` in `half = (total + 1) // 2` puts the extra element on the left for odd totals**, so both the odd and even cases share the same left-half logic instead of needing separate boundary reasoning." },
          { t: "p", text: "**Give the merge solution first and say when it is the right answer.** Four obviously-correct lines at O(m + n) beats a fiddly logarithmic version you might get wrong — and stating that judgement is part of what is being assessed." },
          { t: "p", text: "**Property-test against the simple version.** Hand-picked cases do not find off-by-one errors in index-heavy code; two thousand random pairs compared against an obviously-correct oracle do." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team needed the minimum number of servers to keep p99 latency under a target. They ran a load test at every count from 1 to 200, forty minutes each — a fortnight of machine time." },
      { t: "p", text: "**Latency is monotonic in server count**: if 40 servers meet the target, 41 certainly do. That makes it a binary search on the answer — eight load tests instead of two hundred." },
      { t: "p", text: "**Five hours instead of two weeks**, for the same result, from noticing that checking a candidate was easy and the property was monotonic." },
      { t: "p", text: "**\"Find the smallest configuration that satisfies a requirement\" is a binary search whenever the requirement is monotonic** — capacity planning, timeout tuning, batch sizing, threshold selection. It rarely looks like an algorithms problem." }
    ]}
  ],

  takeaways: [
    "**Python sorts with a key function, not a comparator.** The key is called once per element, so an expensive key costs n calls rather than n log n.",
    "**Composite keys are tuples**, compared left to right; negate a number to reverse one field.",
    "**For mixed directions on non-numeric fields, sort twice — least significant first.** Stability is what makes that valid.",
    "**Timsort is O(n) on nearly-sorted input**, so \"sort it first\" is a stronger opening move than the complexity suggests.",
    "**`sorted()` returns a list; `.sort()` returns `None`.** Assigning the result of `.sort()` is a classic slip.",
    "**State your binary search convention before writing the loop** — half-open bounds, `lo < hi`, `lo = mid + 1`.",
    "**Use `bisect` rather than hand-rolling.** It is C, it is correct, and since 3.10 it takes a `key`.",
    "**`bisect_left` finds the first equal element, `bisect_right` finds just past the last** — their difference is the count of duplicates.",
    "**`insort` is O(n)**, because the insert shifts the tail. For many insertions, collect and sort once.",
    "**Binary search the answer when checking a candidate is easier than finding it**, and feasibility is monotonic.",
    "**Verify monotonicity explicitly.** Without it the search returns a plausible wrong answer rather than failing.",
    "**Choosing `lo` and `hi` is where these problems are won** — the lower bound must be genuinely infeasible and the upper genuinely feasible.",
    "**Sentinels of `±inf` remove boundary special cases** in partition problems, including the empty-input case.",
    "**Property-test index-heavy algorithms against an obviously-correct version.** Hand-picked cases do not find off-by-one errors."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You need to sort by department ascending and name descending. Why does `key=lambda p: (p.department, -p.name)` not work?",
        options: [
          "Tuples cannot mix types",
          "Strings cannot be negated — sort twice instead, least significant field first, relying on Timsort's stability",
          "The key must return a single value",
          "It works, but is slower than a comparator"
        ],
        answer: 1,
        why: "Negation only works for numbers. Two stable passes — sort by name, then by department — leaves the name order intact within each department, which is exactly what stability guarantees and why the language reference promises it."
      },
      {
        stem: "What is the difference between `bisect_left` and `bisect_right` on `[1, 2, 2, 2, 3]` searching for 2?",
        options: [
          "They return the same index",
          "`bisect_left` returns 1 (the first 2) and `bisect_right` returns 4 (just past the last) — their difference is the count of 2s",
          "`bisect_right` searches from the end of the list",
          "`bisect_left` is for ascending order, `bisect_right` for descending"
        ],
        answer: 1,
        why: "They answer different questions about duplicates: the first index where the element is at least the target, versus the first where it is strictly greater. Subtracting one from the other counts occurrences in O(log n)."
      },
      {
        stem: "When can you binary search on the answer rather than on an array?",
        options: [
          "Whenever the input is sorted",
          "When checking a candidate answer is easier than finding it, and feasibility is monotonic — if x works, every larger x works",
          "Only for numeric answers within a known range",
          "When the answer space is smaller than the input"
        ],
        answer: 1,
        why: "Monotonicity is the precondition and the one that is easy to assume. Without it the search converges on an arbitrary point and returns a plausible wrong answer rather than failing — so verify it explicitly before relying on it."
      },
      {
        stem: "In the median-of-two-sorted-arrays partition solution, why must you search the shorter array?",
        options: [
          "Purely for the better complexity",
          "Because `j = half - i` can go negative otherwise — and a negative index reads from the end of the list rather than raising, producing a silently wrong answer",
          "The algorithm requires equal-length arrays",
          "To avoid integer overflow in the midpoint"
        ],
        answer: 1,
        why: "The complexity improvement from O(log max) to O(log min) is real but secondary. The swap guarantees `i ≤ m ≤ half`, so `j ≥ 0` always — without it the failure is silent, which is far worse than an exception."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you sort by several fields with different directions?",
        strong: "A tuple key, negating numeric fields to reverse them. Where a field cannot be negated, sort twice — least significant first — because Timsort is stable so the earlier order survives.",
        answer: [
          { t: "p", text: "Knowing that stability is guaranteed by the language reference, not an implementation detail, is what makes the two-pass technique defensible." },
          { t: "p", text: "Mentioning that the key is called once per element shows you understand why Python dropped comparators." },
          { t: "p", text: "`attrgetter` over a lambda is a small performance detail that suggests you have profiled a sort." }
        ]
      },
      {
        level: "advanced",
        q: "When would you binary search something that is not an array?",
        strong: "When I can check a candidate answer more cheaply than I can find it, and the check is monotonic. Minimum capacity, minimum speed, smallest threshold — the candidate range behaves like a sorted array of false then true.",
        answer: [
          { t: "p", text: "Stating monotonicity as the precondition, and saying you would verify it, is the difference between applying a pattern and understanding it." },
          { t: "p", text: "The bounds are where these go wrong — the low bound must be genuinely infeasible and the high genuinely feasible." },
          { t: "p", text: "A non-algorithmic example, like capacity planning with load tests, shows you recognise the shape outside interview problems." }
        ]
      },
      {
        level: "core",
        q: "Would you write your own binary search?",
        strong: "Not in real code — `bisect` is C, correct, and takes a `key` since 3.10. In an interview I would write it, and state the convention first: half-open bounds, `lo < hi`, `lo = mid + 1` on the excluded side.",
        answer: [
          { t: "p", text: "Naming the convention before writing is the practical technique that prevents off-by-one errors under pressure." },
          { t: "p", text: "Knowing `insort` is O(n) despite the O(log n) search is the detail that shows you have read the module rather than only used it." },
          { t: "p", text: "The `(lo + hi) // 2` overflow being a non-issue in Python but real in C or Java is worth mentioning, since interviewers often ask." }
        ]
      }
    ]
  }
});

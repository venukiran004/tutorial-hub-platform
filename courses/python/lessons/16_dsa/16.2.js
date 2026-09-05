/* ============================================================================
   LESSON 16.2 — Hash Maps, Sets and Counting
   ========================================================================= */
EC.receiveLesson({
  id: "16.2",

  lede: "The hash map is the single most useful data structure in interviews, and the reason is one trade: **spend O(n) memory to turn a repeated O(n) search into an O(1) lookup.** A large family of quadratic solutions collapses to one linear pass the moment you ask \"what would I need to have already seen to answer this now?\"",

  objectives: [
    "Recognise the shapes that reduce to one dictionary pass",
    "Choose between `dict`, `set`, `Counter` and `defaultdict` deliberately",
    "Design a key that groups exactly what you intend",
    "Know when hashing degrades, and what is hashable at all",
    "State the space cost as confidently as the time saving"
  ],

  prerequisites: ["4.3", "16.1"],

  blocks: [

    { t: "h2", n: "01", text: "The trade", id: "trade" },

    { t: "code", lang: "python", title: "the same problem, both ways", code: `
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    """BRUTE FORCE -- O(n^2) time, O(1) space.
    For each element, scan the rest looking for its complement."""
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return i, j
    return None


def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    """HASH MAP -- O(n) time, O(n) space.

    THE QUESTION THAT PRODUCES IT: at index j, what would I need to
    have already seen to answer immediately?
        -> a value equal to target - nums[j]
    So store every value as you pass it, keyed by value.
    """
    seen: dict[int, int] = {}                # value -> index

    for j, x in enumerate(nums):
        if (complement := target - x) in seen:
            return seen[complement], j       # earlier index first
        seen[x] = j                          # AFTER the check, so a
                                             # single element cannot
    return None                              # pair with itself
`,
      hl: [15, 22, 24],
      caption: "**Store after checking, not before.** With `target = 6` and `nums = [3, 1]`, storing first lets index 0 match itself and returns `(0, 0)`."
    },

    { t: "callout", kind: "insight", title: "The question that finds the solution", body: [
      { t: "p", text: "Almost every hash-map problem yields to the same prompt: **\"standing at position j, what fact about the earlier elements would let me answer right now?\"** Whatever that fact is becomes the dictionary's key." },
      { t: "code", lang: "python", title: "four problems, one question", numbered: false, code: `
# "Two numbers summing to target"
#   -> I need to know whether target - x was seen.   key: the value

# "Longest subarray summing to k"
#   -> I need the earliest index where the running sum was
#      current - k.                                  key: prefix sum

# "Are these two strings anagrams?"
#   -> I need the letter counts.                     key: the letter

# "Group the anagrams together"
#   -> I need a form that is identical for anagrams.
#                                          key: the sorted letters

# The problem changes; the method does not. Name the fact, make it
# the key, and the loop writes itself.`},
      { t: "p", text: "**Say this out loud in an interview.** Arriving at a hash map by reasoning is worth more than producing it from memory, because the interviewer is assessing how you approach the next problem." }
    ]},

    { t: "h2", n: "02", text: "Which structure", id: "which" },

    { t: "table",
      head: ["Structure", "For", "Note"],
      rows: [
        ["`set`", "Membership and deduplication", "**No values — half the memory of a dict**"],
        ["`dict`", "Key to value", "Insertion-ordered since 3.7"],
        ["`Counter`", "Frequencies", "**`most_common`, and it does arithmetic**"],
        ["`defaultdict(list)`", "Grouping", "Removes the `setdefault` boilerplate"],
        ["`dict.setdefault`", "Grouping, occasionally", "Evaluates the default **every call**"],
        ["`frozenset`", "A set used as a key", "Hashable, so it can be a dict key"]
      ],
      caption: "**`Counter` is a `dict` subclass with arithmetic.** `c1 - c2`, `c1 & c2` and `c1 | c2` are multiset difference, intersection and union — which solves several problems in one line."
    },

    { t: "code", lang: "python", title: "Counter, used properly", code: `
from collections import Counter

c = Counter("mississippi")
c.most_common(2)            # [('i', 4), ('s', 4)]
c["z"]                      # 0 -- NO KeyError, unlike a plain dict

# Multiset arithmetic. Each of these replaces a loop.
Counter("aab") - Counter("ab")      # Counter({'a': 1}) -- and it
                                    # DROPS non-positive counts
Counter("aab") & Counter("abc")     # min of each: {'a':1, 'b':1}
Counter("aab") | Counter("abc")     # max of each: {'a':2,'b':1,'c':1}

# THE SUBTRACTION TRAP: "-" drops zero and negative counts, which is
# usually what you want and occasionally hides a difference.
Counter("ab") - Counter("abc")      # Counter() -- the missing 'c'
                                    # vanishes rather than appearing
                                    # as -1
c1 = Counter("ab"); c1.subtract("abc")
c1                                  # Counter({'a':0,'b':0,'c':-1})
                                    # subtract() KEEPS negatives

# Anagram check, three ways:
Counter(a) == Counter(b)            # O(n), clearest
sorted(a) == sorted(b)              # O(n log n), also fine
# ...and for many short strings, sorted() is often FASTER in practice
# despite the worse complexity -- Counter allocates a dict per call.
`,
      hl: [5, 13, 20],
      caption: "**`Counter[key]` returns 0 for a missing key rather than raising.** That is convenient and it means a typo in a key name silently yields zero rather than an error."
    },

    { t: "h2", n: "03", text: "Designing the key", id: "keys" },

    { t: "ladder",
      title: "Grouping anagrams",
      rungs: [
        { level: "bad", label: "Compare every pair",
          why: "O(n² · k log k): every string compared against every other, with a sort inside each comparison. It is also awkward to write correctly, because a string can belong to a group formed earlier.",
          code: `groups = []
for word in words:
    for group in groups:
        if sorted(word) == sorted(group[0]):
            group.append(word)
            break
    else:
        groups.append([word])` },
        { level: "ok", label: "Sorted string as the key",
          why: "One pass, and the key is exactly \"the property anagrams share\". The sort costs O(k log k) per word, which is usually irrelevant and is the thing an interviewer will offer to optimise.",
          code: `from collections import defaultdict

groups = defaultdict(list)
for word in words:
    groups["".join(sorted(word))].append(word)
return list(groups.values())
# O(n * k log k) time, O(n * k) space.` },
        { level: "best", label: "A character-count key",
          why: "Counting is O(k) rather than O(k log k), so for long strings it is strictly better. The key must be a tuple — a list is unhashable — and fixing the alphabet makes the tuple a constant size.",
          code: `def group_anagrams(words: list[str]) -> list[list[str]]:
    """O(n * k) time, where k is the average word length."""
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)

    for word in words:
        counts = [0] * 26
        for ch in word:
            counts[ord(ch) - ord("a")] += 1
        # A TUPLE, not a list: lists are unhashable because they are
        # mutable, and a key must not be able to change.
        groups[tuple(counts)].append(word)

    return list(groups.values())

# WORTH SAYING: for short words the sorted-string version is often
# faster in practice -- 26 integers is more work than sorting five
# characters. The complexity is better; the constant is worse.`,
          note: "**The key is the whole design.** \"What form is identical for exactly the things I want grouped?\" — answer that and the rest is one loop." }
      ]
    },

    { t: "callout", kind: "trap", title: "What can be a key, and what cannot", body: [
      { t: "code", lang: "python", title: "hashability, and two surprises", numbered: false, code: `
# HASHABLE: int, float, str, bytes, tuple (of hashables), frozenset,
#           None, and any object with __hash__ that is not mutated.
# NOT:      list, dict, set, and anything whose contents can change.

d[[1, 2]] = "x"          # TypeError: unhashable type: 'list'
d[(1, 2)] = "x"          # fine
d[frozenset({1, 2})]     # fine -- and order-independent, unlike a
                         # tuple, which is what makes it right for
                         # "the same set of items"

# SURPRISE 1 -- True == 1 == 1.0, and equal keys collide.
d = {}
d[1] = "int"; d[True] = "bool"; d[1.0] = "float"
d                        # {1: 'float'} -- ONE entry
# Because hash(1) == hash(True) == hash(1.0) and they compare equal.

# SURPRISE 2 -- a mutable object used as a key breaks silently.
class Point:
    def __init__(self, x): self.x = x
    def __hash__(self): return hash(self.x)
    def __eq__(self, o): return self.x == o.x

p = Point(1)
d = {p: "a"}
p.x = 2                  # the hash changed AFTER insertion
d[p]                     # KeyError -- it is in the wrong bucket
# The object is still in the dict; it can no longer be found.
# Make anything used as a key immutable: frozen dataclass, or a
# NamedTuple.`},
      { t: "p", text: "**A mutated key is unreachable, not absent.** The entry still occupies memory and still appears when iterating — it simply cannot be looked up, which makes the bug read as data loss." }
    ]},

    { t: "h2", n: "04", text: "The costs", id: "costs" },

    { t: "code", lang: "python", title: "what O(1) actually assumes", code: `
# AVERAGE case O(1). WORST case O(n), when every key hashes to the
# same bucket. In CPython, str hashing is randomised per process
# (PYTHONHASHSEED) specifically to prevent an attacker constructing
# colliding keys -- a real denial-of-service vector for a web service
# that puts user input in a dict.

# MEMORY IS NOT SMALL. A dict holds a hash, a key pointer and a value
# pointer per entry, plus empty slots so the load factor stays low.
import sys
sys.getsizeof({})                    # 64 bytes, empty
sys.getsizeof({i: i for i in range(1000)})   # ~36 KB for 1000 ints
sys.getsizeof(set(range(1000)))              # ~32 KB
sys.getsizeof(list(range(1000)))             # ~8 KB
# So the trade is real: roughly 4x a list, for O(1) lookup.

# WHEN A DICT IS THE WRONG ANSWER:
#   - a small, fixed set of keys        -> a tuple or a list index
#   - keys are dense small integers     -> a LIST, indexed directly
#   - you need order by value           -> sort, or a heap (16.3)
#   - you need range queries            -> a sorted list + bisect
#   - the data does not fit in memory   -> a database

# The dense-integer case is worth remembering: counts of ASCII
# characters belong in a list of 128 ints, not a dict -- it is
# faster and a fraction of the memory.
counts = [0] * 128
for ch in text:
    counts[ord(ch)] += 1
`,
      hl: [3, 13, 25],
      caption: "**Hash randomisation is a security feature.** Without it, an attacker who knows your hash function can send keys that all collide, turning every dictionary operation into a linear scan."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Longest subarray with equal counts",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "Given a binary array, return the length of the longest contiguous subarray containing an equal number of 0s and 1s." },
        { t: "code", lang: "python", numbered: false, title: "examples", code: `
[0, 1]              ->  2     the whole array
[0, 1, 0]           ->  2     "[0,1]" or "[1,0]"
[0, 0, 1, 0, 1, 1]  ->  6     the whole array
[0, 0, 0]           ->  0     no valid subarray
[1, 1, 1, 0]        ->  2     "[1,0]"`},
        { t: "p", text: "Solve it in O(n). A sliding window does not work here — explain why, then give the solution and generalise it to k distinct values." }
      ],
      requirements: [
        "Explain why a sliding window fails.",
        "Give an O(n) solution with the reasoning that produces it.",
        "Explain the sentinel entry in the map and what breaks without it.",
        "Handle the case where no valid subarray exists.",
        "Generalise to \"equal counts of k distinct values\".",
        "State time and space precisely."
      ],
      hint: "Map 0 to -1 and ask what a running sum tells you. Then ask what it means when the same running sum appears twice.",
      solution: {
        lang: "python",
        title: "equal_counts.py",
        code: `# =========================================================================
# WHY A SLIDING WINDOW FAILS
# =========================================================================
#
# A window needs a MONOTONIC validity condition: if the window is
# invalid, one direction of movement must reliably help.
#
# Here, "equal counts" is not monotonic. Consider [0, 0, 1, 1]:
#
#   window [0,0]      invalid (2 zeros, 0 ones)
#   window [0,0,1]    invalid (2 zeros, 1 one)   -- growing helped
#   window [0,0,1,1]  VALID                      -- growing helped
#   window [0,1,1]    invalid                    -- shrinking HURT
#
# Growing sometimes helps and sometimes does not; shrinking likewise.
# There is no rule that says which pointer to move, which is exactly
# the precondition the window technique requires (Lesson 16.1).
#
# The same reason "subarray sum equals k with negatives" is not a
# window problem -- and the same tool solves both.
#
#
# =========================================================================
# THE REASONING THAT PRODUCES THE SOLUTION
# =========================================================================
#
# STEP 1 -- turn "equal counts" into a single number.
#
#   Map 0 -> -1, 1 -> +1. Now:
#     equal counts of 0 and 1  <=>  the mapped values SUM TO ZERO
#
#   One quantity to track instead of two, which is the whole trick.
#
# STEP 2 -- ask the standard question. Standing at index j with a
#   running sum S, what would let me answer immediately?
#
#     A subarray (i, j] sums to zero exactly when
#         prefix[j] == prefix[i]
#
#   So: "have I seen this running sum before?" -- and if so, at the
#   EARLIEST index, because that gives the longest subarray.
#
# STEP 3 -- the key is the running sum; the value is the FIRST index
#   at which it occurred. Never overwrite, because a later index
#   would give a shorter subarray.


def find_max_length(nums: list[int]) -> int:
    """O(n) time, O(n) space."""
    # THE SENTINEL: prefix sum 0 occurs "before" index 0.
    first_index: dict[int, int] = {0: -1}

    running = 0
    best = 0

    for j, x in enumerate(nums):
        running += 1 if x == 1 else -1

        if running in first_index:
            # Everything between the first occurrence and here sums
            # to zero.
            best = max(best, j - first_index[running])
        else:
            # FIRST occurrence only. Overwriting would shorten every
            # later answer.
            first_index[running] = j

    return best


# =========================================================================
# THE SENTINEL, AND WHAT BREAKS WITHOUT IT
# =========================================================================
#
#   first_index = {0: -1}
#
# It says: "a running sum of 0 existed at index -1, before anything
# was consumed."
#
# WITHOUT IT, consider [0, 1]:
#
#   j=0, x=0: running = -1, not seen, store {-1: 0}
#   j=1, x=1: running =  0, NOT IN THE MAP -> store {0: 1}
#             best stays 0
#
#   Returns 0. The correct answer is 2.
#
# The bug is that a subarray starting at index 0 is never found,
# because its prefix condition requires a "sum of zero before the
# array began". The sentinel supplies exactly that.
#
# The -1 rather than 0 is also load-bearing: the length is
# j - first_index[running], so index 1 minus -1 gives 2, the full
# length. A sentinel of {0: 0} would give 1.
#
# THIS IS THE MOST COMMON BUG IN PREFIX-SUM PROBLEMS, and the same
# sentinel appears in "subarray sum equals k" as counts = {0: 1}.
#
#
# =========================================================================
# NO VALID SUBARRAY
# =========================================================================
#
# [0, 0, 0] -> running goes -1, -2, -3, each seen for the first time,
# so best is never updated and 0 is returned.
#
# No special case is needed: best starts at 0 and only ever increases
# when a genuine match is found. Worth saying explicitly, because the
# interviewer is checking whether you add an unnecessary guard.
#
#
# =========================================================================
# GENERALISING TO k DISTINCT VALUES
# =========================================================================
#
# "Longest subarray with equal counts of k distinct values."
#
# The +1/-1 encoding does not extend -- one number cannot represent
# the balance of three or more values. But the INSIGHT does:
#
#   equal counts  <=>  the DIFFERENCES between counts are unchanged
#                      between two positions
#
# So track the count vector, normalise it so only differences matter,
# and use that as the key.

def find_max_length_k(nums: list[int], values: list[int]) -> int:
    """Equal counts of every value in the values list.

    O(n * k) time, O(n * k) space.
    """
    index = {v: i for i, v in enumerate(values)}
    counts = [0] * len(values)

    # NORMALISE by subtracting the first count, so that (2,2,2) and
    # (5,5,5) produce the SAME key -- both mean "all equal so far".
    # Without normalising, only literally identical vectors match and
    # almost nothing is found.
    def key() -> tuple[int, ...]:
        base = counts[0]
        return tuple(c - base for c in counts)

    first_index = {key(): -1}      # the same sentinel idea
    best = 0

    for j, x in enumerate(nums):
        if x in index:
            counts[index[x]] += 1

        k = key()
        if k in first_index:
            best = max(best, j - first_index[k])
        else:
            first_index[k] = j

    return best

# The tuple key must be built each step, which is the O(k) factor.
# For k = 2 this reduces to exactly the original: the normalised key
# (0, c1 - c0) carries the same information as the +1/-1 running sum.
#
#
# =========================================================================
# COMPLEXITY
# =========================================================================
#
#   TIME:  O(n)      one pass, O(1) dictionary work per element
#   SPACE: O(n)      the running sum ranges over [-n, n], so the map
#                    holds at most 2n + 1 entries
#
#   The k-value version is O(n * k) for both, since each step builds
#   and hashes a k-tuple.
#
#   NOTE the space is genuinely O(n) and not O(1) -- this is the
#   trade being made, and stating it unprompted is what shows you
#   understand it as a trade rather than a trick.
#
#
# =========================================================================
# THE FAMILY THIS BELONGS TO
# =========================================================================
#
# Every one of these is "prefix + hash map", differing only in what
# is stored and what is looked up:
#
#   equal 0s and 1s            key: running sum, value: first index
#   subarray sum == k          key: prefix sum,  value: COUNT
#   subarray sum divisible by k  key: prefix % k, value: first index
#   longest subarray sum == k  key: prefix sum,  value: first index
#   count subarrays with k odds  key: prefix odd-count, value: count
#
# FIRST INDEX for a longest/shortest question; a COUNT for a
# how-many question. Recognising which the question asks for is the
# only decision.
#
#
# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("nums,expected", [
    ([0, 1],                 2),
    ([0, 1, 0],              2),
    ([0, 0, 1, 0, 1, 1],     6),
    ([0, 0, 0],              0),    # none exists
    ([1, 1, 1, 0],           2),
    ([],                     0),
    ([0],                    0),
    ([1, 0, 1, 0, 1, 0],     6),
])
def test_find_max_length(nums, expected):
    assert find_max_length(nums) == expected


def test_the_sentinel_allows_a_match_from_index_zero():
    """Without {0: -1} this returns 0."""
    assert find_max_length([0, 1]) == 2
    assert find_max_length([1, 0, 0, 1]) == 4


def test_only_the_first_index_is_stored():
    """Overwriting shortens every later answer."""
    # The sum returns to 0 at index 1 and again at index 5. The
    # longest span uses the EARLIEST occurrence.
    assert find_max_length([0, 1, 0, 0, 1, 1]) == 6


def test_linear_time():
    small = timeit(lambda: find_max_length([0, 1] * 50_000), number=5)
    large = timeit(lambda: find_max_length([0, 1] * 100_000), number=5)

    assert large < small * 3, "looks quadratic"


def test_generalises_to_three_values():
    assert find_max_length_k([1, 2, 3, 1, 2, 3], [1, 2, 3]) == 6
    assert find_max_length_k([1, 1, 2, 3], [1, 2, 3]) == 3`,
        notes: [
          { t: "p", text: "**Mapping 0 to -1 turns two quantities into one.** \"Equal counts\" becomes \"sums to zero\", and a subarray sums to zero exactly when its two prefix sums are equal — which is a dictionary lookup." },
          { t: "p", text: "**The sliding window fails because validity is not monotonic here.** Growing the window sometimes helps and sometimes does not, so there is no rule saying which pointer to move — the same reason it fails for subarray sums with negatives." },
          { t: "callout", kind: "insight", title: "The sentinel is the most common bug in prefix-sum problems", body: [
            { t: "p", text: "`{0: -1}` asserts that a running sum of zero existed before the array began. Without it, no subarray starting at index 0 is ever found — `[0, 1]` returns 0 instead of 2." },
            { t: "p", text: "The value `-1` rather than `0` is also load-bearing: the length is `j - first_index[running]`, so the sentinel must sit one position before the start for a full-array match to give the full length." }
          ]},
          { t: "p", text: "**Store the first index and never overwrite it.** A later occurrence of the same prefix sum yields a shorter subarray, so overwriting silently shortens every subsequent answer." },
          { t: "p", text: "**Normalising the count vector is what makes the k-value generalisation work.** Subtracting the first count means `(2,2,2)` and `(5,5,5)` produce the same key — both mean \"all equal so far\" — where raw vectors would almost never match." },
          { t: "p", text: "**Store a first index for longest/shortest, a count for how-many.** That single distinction covers the whole prefix-plus-hash-map family, and recognising which the question asks for is the only decision to make." },
          { t: "p", text: "**State the O(n) space unprompted.** It is the trade being made, and treating it as a deliberate choice rather than an incidental cost is what distinguishes understanding from recall." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A deduplication job over ten million records took four hours. The code checked `if record_id in seen_ids` where `seen_ids` was a list." },
      { t: "p", text: "**Each membership test was a linear scan**, so the job was O(n²) — roughly fifty trillion comparisons by the end. Changing `list` to `set` brought it to ninety seconds." },
      { t: "p", text: "**The memory cost was 400MB instead of 80MB**, which nobody noticed and nobody would have minded. The trade was overwhelmingly worth it and had simply never been made deliberately." },
      { t: "p", text: "**`in` on a list is O(n); on a set it is O(1).** It is one word of difference, it reads identically, and it is the most common accidental quadratic in Python." }
    ]}
  ],

  takeaways: [
    "**The hash map trade is O(n) memory for O(1) lookup**, turning a large family of quadratic solutions into one linear pass.",
    "**Ask: standing at position j, what fact about earlier elements would let me answer now?** That fact is the key.",
    "**Store after checking, not before**, or an element can pair with itself.",
    "**`set` for membership, `dict` for mapping, `Counter` for frequencies, `defaultdict` for grouping.** Choosing deliberately is half the readability.",
    "**`Counter` does multiset arithmetic** — `-`, `&` and `|` replace loops, and `-` silently drops non-positive counts where `subtract()` keeps them.",
    "**`Counter[missing]` returns 0 rather than raising**, which is convenient and hides typos.",
    "**The key is the design.** \"What form is identical for exactly the things I want grouped?\" — answer that and the loop writes itself.",
    "**Keys must be hashable and immutable.** A mutated key is unreachable, not absent, which reads as data loss.",
    "**`True == 1 == 1.0`, so they are one dictionary key**, not three.",
    "**O(1) is average, not worst case.** Hash randomisation exists because colliding keys are a denial-of-service vector.",
    "**A dict costs roughly four times a list in memory.** State the space when you state the time.",
    "**Dense small-integer keys belong in a list**, indexed directly — faster and far smaller than a dict.",
    "**Prefix sums plus a hash map is the tool when a sliding window fails** — store a first index for longest, a count for how-many.",
    "**The sentinel entry is the classic prefix-sum bug.** `{0: -1}` is what allows a match starting at index 0."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "In `two_sum`, why must you store the current value *after* checking for its complement?",
        options: [
          "For better cache locality",
          "Otherwise an element can match itself — with target 6 and value 3, storing first returns index 0 paired with index 0",
          "To preserve insertion order",
          "Because dict writes are slower than reads"
        ],
        answer: 1,
        why: "The ordering encodes the constraint that the two indices must differ. It is the kind of one-line detail an interviewer probes with a single adversarial input, so stating why the order matters is worth doing unprompted."
      },
      {
        stem: "`d[1] = \"int\"; d[True] = \"bool\"; d[1.0] = \"float\"`. What does `d` contain?",
        options: [
          "Three entries",
          "One entry, `{1: 'float'}` — the three keys hash equally and compare equal, so each assignment overwrites the value",
          "Two entries, since bool is a distinct type",
          "A TypeError on the second assignment"
        ],
        answer: 1,
        why: "`hash(1) == hash(True) == hash(1.0)` and all three compare equal, so they are one key. The original key object is kept and only the value is replaced — which is why the key prints as `1` rather than `True`."
      },
      {
        stem: "A prefix-sum solution returns 0 for `[0, 1]` where the answer is 2. What is missing?",
        options: [
          "The running sum should start at 1",
          "The sentinel entry `{0: -1}` — without it, no subarray starting at index 0 can be matched",
          "The map should store the last index, not the first",
          "The values should be mapped to 1 and 2 rather than 1 and -1"
        ],
        answer: 1,
        why: "A subarray from index 0 requires a prefix sum of zero \"before the array began\", and the sentinel supplies exactly that. The value `-1` matters too: the length is `j - first_index[sum]`, so the sentinel must sit one position before the start."
      },
      {
        stem: "A deduplication job uses `if record_id in seen` where `seen` is a list. What is the effect at ten million records?",
        options: [
          "Correct but uses more memory than a set",
          "Each check is a linear scan, so the job is O(n²) — around fifty trillion comparisons",
          "It fails with a recursion limit",
          "Nothing — CPython optimises list membership"
        ],
        answer: 1,
        why: "This is the most common accidental quadratic in Python, because the two versions read identically. A set costs roughly four times the memory and turns hours into seconds — a trade worth making deliberately rather than discovering."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you recognise a hash-map problem?",
        strong: "Ask what fact about the earlier elements would let you answer immediately at the current position. If there is one, it is the key — and the nested loop that was searching for it disappears.",
        answer: [
          { t: "p", text: "Framing it as a question you ask rather than a pattern you recall is what shows you can approach an unfamiliar problem." },
          { t: "p", text: "Stating the trade — O(n) space for O(1) lookup — as a deliberate decision rather than a free win is the mark of a considered answer." },
          { t: "p", text: "Giving two or three problems that reduce to the same question makes the method concrete." }
        ]
      },
      {
        level: "advanced",
        q: "When does a sliding window not work, and what do you use instead?",
        strong: "When validity is not monotonic — with negative numbers or a balance condition, growing the window can help or hurt, so there is no rule for which pointer to move. Prefix sums with a hash map is the tool.",
        answer: [
          { t: "p", text: "Naming monotonic validity as the precondition explains both when the window works and when it does not, from one principle." },
          { t: "p", text: "The mapping trick — 0 to -1 so \"equal counts\" becomes \"sums to zero\" — is a good concrete illustration." },
          { t: "p", text: "Mentioning the sentinel entry pre-empts the follow-up, since it is the bug this family of problems is known for." }
        ]
      },
      {
        level: "core",
        q: "What can be a dictionary key?",
        strong: "Anything hashable and effectively immutable — ints, strings, tuples of hashables, frozensets. Not lists or dicts, and not a mutable object, because mutating it after insertion makes the entry unreachable.",
        answer: [
          { t: "p", text: "\"Unreachable, not absent\" is the precise way to describe the mutation failure, and it explains why the bug reads as data loss." },
          { t: "p", text: "`frozenset` as an order-independent key is a useful specific — it is right for \"the same set of items\" where a tuple is not." },
          { t: "p", text: "The `True == 1 == 1.0` collision is a small piece of trivia that shows you know how equality and hashing interact." }
        ]
      }
    ]
  }
});
